import { describe, expect, it, vi, afterEach } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore } from '../src/domain/cityStore';
import { selectCitizenContext } from '../src/domain/selectors';
import { selectMunicipalTasks } from '../src/domain/operations';
import { distanceToRoute, evaluateJourney, journeyPlaces, savedJourneyRoutes } from '../src/domain/citizenJourney';
import { findJourney } from '../src/services/journey';
import type { CitizenReportInput } from '../src/types/city';

const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ9kAAAAASUVORK5CYII=';
const report: CitizenReportInput = { roadSegmentId: 'anna', category: 'obstruction', description: 'Debris obstructing the road near the junction.', image: photo };
afterEach(() => vi.unstubAllGlobals());

describe('Citizen report intake and cross-role lifecycle', () => {
  it('keeps submitted reports private until triage and qualification; preserves citizen provenance', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch({ type: 'submitCitizenReport', input: report });
    const receipt = Object.values(store.getSnapshot().citizenReports)[0];
    expect(receipt.status).toBe('Pending');
    expect(Object.keys(store.getSnapshot().issues)).toHaveLength(7);
    store.dispatch({ type: 'reviewCitizenReport', reportId: receipt.id, decision: 'Accepted', note: 'Assess at the junction' });
    const issueId = store.getSnapshot().citizenReports[receipt.id].issueId!;
    const issue = store.getSnapshot().issues[issueId];
    expect(issue).toMatchObject({ citizenReportId: receipt.id, kind: 'obstruction', workflowStage: 'Detected', detectionCount: 0, busIds: [] });
    expect(selectCitizenContext(store.getSnapshot()).conditions.some(item => item.id === issueId)).toBe(false);
    store.dispatch({ type: 'qualifyIssue', issueId, actor: 'Municipal admin' });
    expect(selectCitizenContext(store.getSnapshot()).conditions.some(item => item.id === issueId)).toBe(true);
    store.dispatch({ type: 'assign', event: { kind: 'municipal', id: issueId }, teamId: 'roads-engineering-team', assignee: 'Roads supervisor' });
    store.dispatch({ type: 'acknowledge', issueId }); store.dispatch({ type: 'startFieldWork', issueId });
    store.dispatch({ type: 'submitResolution', event: { kind: 'municipal', id: issueId }, submittedBy: 'Roads supervisor', summary: 'Debris removed', resultingCondition: 'Road clear', evidence: [{ id: 'photo', image: photo, capturedAt: store.getSnapshot().now, description: 'Completion evidence' }] });
    expect(selectMunicipalTasks(store.getSnapshot()).find(task => task.target.id === issueId)?.kind).toBe('Verification');
    const review = Object.values(store.getSnapshot().reviews).find(item => item.decision === 'Pending')!;
    store.dispatch({ type: 'reviewResolution', reviewId: review.id, decision: 'Returned', reviewer: 'Admin', note: 'Check the adjoining lane' });
    expect(selectMunicipalTasks(store.getSnapshot()).find(task => task.target.id === issueId)).toMatchObject({ actionRequired: true, kind: 'Field action' });
    store.dispatch({ type: 'submitResolution', event: { kind: 'municipal', id: issueId }, submittedBy: 'Roads supervisor', summary: 'All debris removed', resultingCondition: 'Road clear', evidence: [{ id: 'photo2', image: photo, capturedAt: store.getSnapshot().now, description: 'Reviewed completion evidence' }] });
    const nextReview = Object.values(store.getSnapshot().reviews).find(item => item.decision === 'Pending')!;
    store.dispatch({ type: 'reviewResolution', reviewId: nextReview.id, decision: 'Verified', reviewer: 'Admin', note: 'Evidence checked' });
    store.dispatch({ type: 'closeIssue', issueId, actor: 'Admin' });
    expect(selectCitizenContext(store.getSnapshot()).conditions.find(item => item.id === issueId)).toMatchObject({ verified: true, condition: 'Road clear' });
    expect(evaluateJourney(store.getSnapshot(), savedJourneyRoutes).flatMap(route => route.conditions).some(item => item.id === issueId)).toBe(false);
  });
  it.each([
    { ...report, description: 'Short' }, { ...report, roadSegmentId: 'unknown' },
    { ...report, image: 'https://example.org/photo.jpg' }, { ...report, image: 'data:image/svg+xml;base64,PHN2Zz4=' },
    { ...report, image: 'data:image/png;base64,' + 'A'.repeat(2_800_000) },
  ])('rejects invalid reports atomically', input => {
    const store = createCityStore(createCitySeed()), before = store.getSnapshot();
    expect(() => store.dispatch({ type: 'submitCitizenReport', input })).toThrow();
    expect(store.getSnapshot()).toBe(before);
  });
  it('dismisses without an issue and rejects a second triage decision', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch({ type: 'submitCitizenReport', input: report });
    const receipt = Object.values(store.getSnapshot().citizenReports)[0];
    store.dispatch({ type: 'reviewCitizenReport', reportId: receipt.id, decision: 'Dismissed', note: 'Duplicate photo' });
    expect(Object.keys(store.getSnapshot().issues)).toHaveLength(7);
    expect(() => store.dispatch({ type: 'reviewCitizenReport', reportId: receipt.id, decision: 'Accepted', note: 'Changed' })).toThrow(/already/);
  });
});

describe('Geographic journey credibility', () => {
  it('keeps the saved demonstration deterministic and independent of network', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(await findJourney(journeyPlaces[0], journeyPlaces[1])).toEqual(savedJourneyRoutes);
    expect(fetch).not.toHaveBeenCalled();
    expect(evaluateJourney(createCitySeed(), savedJourneyRoutes).map(route => route.minutes)).toEqual([10, 19]);
  });
  it('publishes approved Anna Salai closure to the matching route and preserves an alternative', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch({ type: 'createScenario', roadSegmentId: 'anna', duration: '3 days' });
    const project = Object.values(store.getSnapshot().projects)[0];
    expect(evaluateJourney(store.getSnapshot(), savedJourneyRoutes)[0].blocked).toBe(false);
    store.dispatch({ type: 'approveProject', projectId: project.id, actor: 'Admin' });
    const result = evaluateJourney(store.getSnapshot(), savedJourneyRoutes);
    expect(result[0].minutes).toBeNull(); expect(result[1].minutes).not.toBeNull();
    expect(result[0].projects[0].projectId).toBe(project.id);
    store.dispatch({ type: 'cancelProject', projectId: project.id });
    expect(evaluateJourney(store.getSnapshot(), savedJourneyRoutes)[0].minutes).toBe(10);
  });
  it('matches points along route edges and excludes unrelated citywide warnings', () => {
    expect(distanceToRoute([13, 80.05], [[13, 80], [13, 80.1]])).toBeLessThan(.001);
    expect(distanceToRoute([13.1, 80.05], [[13, 80], [13, 80.1]])).toBeGreaterThan(10);
    const result = evaluateJourney(createCitySeed(), savedJourneyRoutes);
    expect(result.flatMap(route => route.conditions).some(condition => condition.roadSegmentId === 'omr-thoraipakkam')).toBe(false);
  });
  it('rejects equal endpoints and out-of-coverage location without a network call', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(findJourney(journeyPlaces[0], journeyPlaces[0])).rejects.toThrow(/different/);
    await expect(findJourney({ id: 'current', name: 'Current', point: [51, 0] }, journeyPlaces[1])).rejects.toThrow(/Chennai/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not invent a route after online failure or an invalid response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(findJourney(journeyPlaces[1], journeyPlaces[0])).rejects.toThrow(/unavailable/);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 'Ok', routes: [{ duration: 0, distance: 2, geometry: { coordinates: [] } }] }) }));
    await expect(findJourney(journeyPlaces[1], journeyPlaces[0])).rejects.toThrow(/incomplete/);
  });
});