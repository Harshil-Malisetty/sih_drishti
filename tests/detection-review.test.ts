import { describe, expect, it } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore } from '../src/domain/cityStore';
import { detectionScore, detectionStatus, latestDetectionReview, selectDetectionQueue } from '../src/domain/detectionReview';
import { selectCitizenContext } from '../src/domain/selectors';
import { policeJurisdictions, segmentInJurisdiction } from '../src/domain/policeJurisdictions';
import type { CityState } from '../src/types/city';
import type { DetectionReviewInput } from '../src/types/detectionReview';
import sources from '../public/evidence/image-sources.json';

function input(state: CityState, id = 'EDGE-M01', overrides: Partial<DetectionReviewInput> = {}): DetectionReviewInput {
  const detection = state.edgeDetections[id];
  return { detectionId: id, expectedRevision: detection.revision, expectedReviewId: latestDetectionReview(state, id)?.id || null,
    role: detection.role, jurisdictionId: 'all', reviewer: 'Test official', note: 'Reviewed all supplied evidence.', decision: 'Confirmed',
    category: detection.category, severity: detection.severity, frames: detection.frames.map(frame => ({ frameId: frame.id, verdict: 'Supports' })), ...overrides };
}

describe('edge candidate intake and review', () => {
  it('keeps pending candidates out of operational records and public conditions', () => {
    const state = createCitySeed();
    expect(Object.keys(state.edgeDetections)).toHaveLength(5);
    expect(Object.values(state.issues).some(issue => issue.edgeDetectionId)).toBe(false);
    expect(Object.values(state.incidents).some(incident => incident.edgeDetectionId)).toBe(false);
    expect(selectCitizenContext(state).conditions.every(condition => !condition.id.startsWith('ISS-AI'))).toBe(true);
    expect(selectDetectionQueue(state, 'municipal', 'all', { status: 'Pending' })).toHaveLength(3);
  });

  it('confirms atomically, publishes the reviewed condition, and keeps the original payload', () => {
    const store = createCityStore(createCitySeed());
    const original = structuredClone(store.getSnapshot().edgeDetections['EDGE-M01']);
    const result = store.dispatch({ type: 'reviewDetection', input: input(store.getSnapshot()) });
    const review = latestDetectionReview(result, 'EDGE-M01')!;
    expect(review.event?.kind).toBe('municipal');
    const issue = result.issues[review.event!.id];
    expect(issue.workflowStage).toBe('Qualified');
    expect(issue.edgeDetectionId).toBe(original.id);
    expect(issue.departmentId).toBe('roads-engineering');
    expect(selectCitizenContext(result).conditions.some(condition => condition.id === issue.id)).toBe(true);
    expect(result.edgeDetections[original.id]).toEqual(original);
    expect(Object.values(result.assignments).some(assignment => assignment.event.id === issue.id)).toBe(false);
    expect(Object.keys(result.emergencyDispatches)).toHaveLength(0);
    expect(review.frames).toHaveLength(original.frames.length);
    expect(Object.isFrozen(result.detectionReviews[review.id])).toBe(true);
  });

  it('corrects category and severity with correct departmental routing', () => {
    const store = createCityStore(createCitySeed());
    const result = store.dispatch({ type: 'reviewDetection', input: input(store.getSnapshot(), 'EDGE-M01', { decision: 'Corrected', category: 'waterlogging', severity: 'Low' }) });
    const review = latestDetectionReview(result, 'EDGE-M01')!;
    expect(result.issues[review.event!.id]).toMatchObject({ kind: 'waterlogging', severity: 'Low', departmentId: 'stormwater' });
    expect(result.edgeDetections['EDGE-M01']).toMatchObject({ category: 'pothole', severity: 'High' });
  });

  it.each(['Rejected', 'Needs verification'] as const)('%s retains feedback without public or operational side effects', decision => {
    const store = createCityStore(createCitySeed());
    const before = store.getSnapshot();
    const result = store.dispatch({ type: 'reviewDetection', input: input(before, 'EDGE-M01', { decision, frames: [] }) });
    expect(result.issues).toEqual(before.issues);
    expect(result.incidents).toEqual(before.incidents);
    expect(selectCitizenContext(result).conditions).toEqual(selectCitizenContext(before).conditions);
    expect(latestDetectionReview(result, 'EDGE-M01')?.event).toBeUndefined();
    expect(detectionStatus(result, 'EDGE-M01')).toBe(decision);
  });

  it('reopens a held candidate with append-only history and prevents stale decisions', () => {
    const store = createCityStore(createCitySeed());
    const stale = input(store.getSnapshot());
    store.dispatch({ type: 'reviewDetection', input: { ...stale, decision: 'Needs verification', note: 'Need a better view.' } });
    expect(() => store.dispatch({ type: 'reviewDetection', input: stale })).toThrow(/changed/);
    const result = store.dispatch({ type: 'reviewDetection', input: input(store.getSnapshot()) });
    expect(Object.values(result.detectionReviews).map(review => review.decision)).toEqual(['Needs verification', 'Confirmed']);
    expect(selectDetectionQueue(result, 'municipal', 'all', { status: 'Needs verification' })).toHaveLength(0);
  });

  it('creates a police case, not an identity finding or dispatch', () => {
    const store = createCityStore(createCitySeed());
    const result = store.dispatch({ type: 'reviewDetection', input: input(store.getSnapshot(), 'EDGE-P01') });
    const review = latestDetectionReview(result, 'EDGE-P01')!;
    expect(result.incidents[review.event!.id]).toMatchObject({ edgeDetectionId: 'EDGE-P01', status: 'Open', registrationConfidence: 0, registrationNumber: '' });
    expect(Object.keys(result.dispatches)).toHaveLength(0);
    expect(Object.keys(result.emergencyDispatches)).toHaveLength(0);
  });

  it('rejects duplicate final reviews even with the latest review token', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch({ type: 'reviewDetection', input: input(store.getSnapshot()) });
    const before = store.getSnapshot();
    expect(() => store.dispatch({ type: 'reviewDetection', input: input(before) })).toThrow(/final decision/);
    expect(store.getSnapshot()).toBe(before);
  });

  it.each([
    { note: '' }, { reviewer: ' ' }, { frames: [] }, { expectedRevision: 2 },
    { role: 'police' }, { category: 'potential-collision' }, { severity: 'Extreme' },
    { decision: 'Corrected' }, { decision: 'Confirmed', severity: 'Low' },
    { frames: [{ frameId: 'unknown', verdict: 'Supports' }] },
  ])('rejects invalid review inputs without changing any state: %j', overrides => {
    const store = createCityStore(createCitySeed());
    const before = store.getSnapshot();
    expect(() => store.dispatch({ type: 'reviewDetection', input: input(before, 'EDGE-M01', overrides as Partial<DetectionReviewInput>) })).toThrow();
    expect(store.getSnapshot()).toBe(before);
  });

  it('does not let unclear or duplicate assessments satisfy confirmation', () => {
    const store = createCityStore(createCitySeed());
    const review = input(store.getSnapshot());
    expect(() => store.dispatch({ type: 'reviewDetection', input: { ...review, frames: review.frames.map(frame => ({ ...frame, verdict: 'Unclear' })) } })).toThrow(/support/);
    expect(() => store.dispatch({ type: 'reviewDetection', input: { ...review, frames: review.frames.map(() => review.frames[0]) } })).toThrow(/Invalid frame/);
  });

  it('enforces department and police scope in queries and commands', () => {
    const state = createCitySeed();
    for (const scope of policeJurisdictions) {
      expect(selectDetectionQueue(state, 'police', scope.id).every(item => segmentInJurisdiction(item.roadSegmentId, scope.id))).toBe(true);
    }
    const excluded = policeJurisdictions.find(scope => !segmentInJurisdiction(state.edgeDetections['EDGE-P01'].roadSegmentId, scope.id))!;
    const store = createCityStore(state);
    expect(() => store.dispatch({ type: 'reviewDetection', input: input(state, 'EDGE-P01', { jurisdictionId: excluded.id }) })).toThrow(/jurisdiction/);
  });

  it('filters and deterministically sorts without mutating state', () => {
    const state = createCitySeed();
    const original = structuredClone(state);
    const queue = selectDetectionQueue(state, 'municipal', 'all', { sort: 'Priority' });
    expect(queue[0].id).toBe('EDGE-M02');
    expect(selectDetectionQueue(state, 'municipal', 'all', { sort: 'Lowest confidence' })[0].id).toBe('EDGE-M03');
    expect(selectDetectionQueue(state, 'municipal', 'all', { confidence: 'low' }).every(item => detectionScore(item)! < .8)).toBe(true);
    expect(selectDetectionQueue(state, 'municipal', 'all', { search: 'edge-m01' })).toHaveLength(1);
    expect(selectDetectionQueue(state, 'municipal', 'all', { category: 'waterlogging' })).toHaveLength(1);
    expect(selectDetectionQueue(state, 'police', 'all', { search: 'not a location' })).toHaveLength(0);
    expect(state).toEqual(original);
  });

  it('anchors demo intake times but never changes source photographs or predictions', () => {
    const seed = createCitySeed();
    const next = createCitySeed('2026-10-10T08:00:00Z');
    for (const detection of Object.values(seed.edgeDetections)) {
      expect(next.edgeDetections[detection.id].frames).toEqual(detection.frames);
      expect(Date.parse(next.now) - Date.parse(next.edgeDetections[detection.id].receivedAt)).toBe(Date.parse(seed.now) - Date.parse(detection.receivedAt));
    }
  });

  it('uses unique source photos and bounded illustrative boxes with valid scores', () => {
    for (const detection of Object.values(createCitySeed().edgeDetections)) {
      const originals = detection.frames.map(frame => sources.find(source => source.filename === frame.image)!.originalUrl);
      expect(new Set(originals).size).toBe(originals.length);
      for (const frame of detection.frames) for (const box of frame.boxes) {
        expect(box.confidence).toBeGreaterThanOrEqual(0); expect(box.confidence).toBeLessThanOrEqual(1);
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(1); expect(box.y + box.height).toBeLessThanOrEqual(1);
      }
    }
  });
});