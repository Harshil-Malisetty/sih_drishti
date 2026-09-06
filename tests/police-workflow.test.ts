import { describe, expect, it } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore } from '../src/domain/cityStore';
import { formatDemoTimestamp } from '../src/domain/time';
import { selectAssignment, selectCitizenContext, selectPlannerRoads, selectPoliceAssignments, selectPoliceSummary, selectTraffic, selectTrafficAnomalies, selectWatchlist } from '../src/domain/selectors';
import { expectIntegrity, expectRejected, resolutionCommand } from './helpers';

describe('incident assignment and watchlist projections', () => {
  it('updates the original incident, replaces the active assignment, and keeps assignment history', () => {
    const store = createCityStore(createCitySeed());
    const event = { kind: 'incident', id: 'INC-24088' } as const;
    const original = structuredClone(store.getSnapshot().incidents[event.id]);
    store.dispatch({ type: 'assign', event, teamId: 'central-response', assignee: 'Officer A' });
    const first = selectAssignment(store.getSnapshot(), event)!;
    expect(store.getSnapshot().incidents[event.id]).toEqual({ ...original, status: 'Investigating' });
    expect(Object.keys(store.getSnapshot().incidents)).toEqual(Object.keys(createCitySeed().incidents));
    expect(selectPoliceAssignments(store.getSnapshot())[event.id]).toEqual({ officer: 'Officer A', team: 'Central Response Team' });
    store.dispatch({ type: 'assign', event, teamId: 'traffic-investigation', assignee: 'Officer B' });
    const state = store.getSnapshot();
    const second = selectAssignment(state, event)!;
    expect(second.id).not.toBe(first.id);
    expect(state.assignments[first.id].supersededAt).toBe(second.assignedAt);
    expect(selectPoliceAssignments(state)[event.id]).toEqual({ officer: 'Officer B', team: 'Traffic Investigation Unit' });
    expect(selectPoliceSummary(state).activity.filter(item => item.title === 'Response assigned' && item.detail.includes(event.id))).toHaveLength(2);
    expectRejected(store, { type: 'assign', event: { kind: 'incident', id: 'INC-24071' }, teamId: 'central-response', assignee: 'Officer' }, /Closed events/);
    expectIntegrity(state);
  });

  it.each(['Verified', 'Dismissed'] as const)('propagates %s decisions to matches and summary, retaining the latest location', decision => {
    const store = createCityStore(createCitySeed());
    const matchId = 'MAT-1028';
    const before = selectPoliceSummary(store.getSnapshot()).possibleMatches;
    const command = { type: 'decideMatch', matchId, decision } as const;
    const decided = store.dispatch(command);
    const match = selectWatchlist(decided).find(item => item.id === matchId)!;
    expect(match).toMatchObject({ status: decision, location: 'Guindy', timestamp: formatDemoTimestamp('2026-09-05T12:06:00+05:30'), busId: 'MTC-2014', route: '21G', confidence: 89 });
    expect(match.observations).toHaveLength(3);
    expect(selectPoliceSummary(decided).possibleMatches).toBe(before - 1);
    const events = selectPoliceSummary(decided).activity.filter(item => item.id.startsWith(`match-${matchId}-`));
    expect(events).toHaveLength(3);
    expect(events.every(item => item.detail.includes(decision))).toBe(true);
    expect(events[0].detail).toContain('Guindy');
    expect(store.dispatch(command)).toBe(decided);
    expectRejected(store, { ...command, decision: decision === 'Verified' ? 'Dismissed' : 'Verified' }, /already reviewed/);
    expectRejected(store, { ...command, matchId: 'missing' }, /Unknown watchlist/);
  });
});

describe('traffic anomaly qualification and dispatch', () => {
  const anomalyId = 'ANOM-ANNA-1';
  const event = { kind: 'anomaly', id: anomalyId } as const;

  it('requires officer qualification, ordered dispatch and a later normalizing measurement before verification', () => {
    const store = createCityStore(createCitySeed());
    expect(selectTrafficAnomalies(store.getSnapshot())[0]).toMatchObject({ status: 'Candidate', ratio: 184 / 60 });
    expectRejected(store, { type: 'requestDispatch', anomalyId, actor: 'Officer' }, /qualification/);
    expectRejected(store, { type: 'assign', event, teamId: 'central-response', assignee: 'Officer' }, /Request dispatch/);
    const qualified = store.dispatch({ type: 'qualifyAnomaly', anomalyId, actor: 'Reviewing officer' });
    expect(qualified.anomalies[anomalyId].status).toBe('Qualified');
    expect(store.dispatch({ type: 'qualifyAnomaly', anomalyId, actor: 'Reviewing officer' })).toBe(qualified);
    const request = { type: 'requestDispatch', anomalyId, actor: 'Reviewing officer' } as const;
    const requested = store.dispatch(request);
    const dispatchId = Object.values(requested.dispatches)[0].id;
    expect(store.dispatch(request)).toBe(requested);
    expect(Object.values(requested.dispatches)).toHaveLength(1);
    expect(requested.anomalies[anomalyId].status).toBe('Dispatched');
    expect(selectTrafficAnomalies(requested)[0].dispatch?.stage).toBe('Requested');
    expectRejected(store, { type: 'advanceDispatch', dispatchId, stage: 'En route', actor: 'Officer' }, /Invalid dispatch/);
    expectRejected(store, { type: 'assign', event, teamId: 'stormwater-team', assignee: 'Officer' }, /responsible department/);
    store.dispatch({ type: 'assign', event, teamId: 'central-response', assignee: 'Officer' });
    expect(selectPoliceAssignments(store.getSnapshot())[anomalyId]).toEqual({ officer: 'Officer', team: 'Central Response Team' });
    expectRejected(store, { type: 'advanceDispatch', dispatchId, stage: 'On scene', actor: 'Officer' }, /Invalid dispatch/);
    expectRejected(store, resolutionCommand(store, event), /Field work/);
    const enRoute = store.dispatch({ type: 'advanceDispatch', dispatchId, stage: 'En route', actor: 'Officer' });
    expect(store.dispatch({ type: 'advanceDispatch', dispatchId, stage: 'En route', actor: 'Officer' })).toBe(enRoute);
    expectRejected(store, resolutionCommand(store, event), /Field work/);
    store.dispatch({ type: 'advanceDispatch', dispatchId, stage: 'On scene', actor: 'Officer' });
    expectRejected(store, { type: 'advanceDispatch', dispatchId, stage: 'En route', actor: 'Officer' }, /Invalid dispatch/);
    store.dispatch(resolutionCommand(store, event));
    expect(selectTrafficAnomalies(store.getSnapshot())[0].dispatch?.stage).toBe('Admin review');
    const reviewId = Object.values(store.getSnapshot().reviews).at(-1)!.id;
    const verify = { type: 'reviewResolution', reviewId, decision: 'Verified', reviewer: 'Police admin', note: 'Flow restored' } as const;
    expectRejected(store, verify, /subsequent normalizing/);
    const trigger = store.getSnapshot().trafficObservations['TR-1'];
    // Earlier, same-time, and other-corridor measurements cannot confirm this anomaly.
    for (const observation of [
      { ...trigger, id: 'TR-EARLIER', observedAt: '2026-09-05T18:43:00+05:30', vehicleCount: 60 },
      { ...trigger, id: 'TR-SAME-TIME', vehicleCount: 60 },
      { ...trigger, id: 'TR-OTHER-ROAD', roadSegmentId: 'omr', observedAt: store.getSnapshot().now, vehicleCount: 60 },
    ]) {
      store.dispatch({ type: 'recordTraffic', observation });
      expectRejected(store, verify, /subsequent normalizing/);
    }
    store.dispatch({ type: 'recordTraffic', observation: { ...trigger, id: 'TR-STILL-HIGH', observedAt: store.getSnapshot().now, vehicleCount: 120 } });
    expectRejected(store, verify, /subsequent normalizing/);
    store.dispatch({ type: 'recordTraffic', observation: { ...trigger, id: 'TR-NORMALIZED', observedAt: store.getSnapshot().now, vehicleCount: 60, averageSpeed: 44, densityLevel: 'Free', trend: 'Decreasing' } });
    expect(selectTraffic(store.getSnapshot()).find(item => item.id === 'TR-1')).toMatchObject({ vehicleCount: 60, densityLevel: 'Free', averageSpeed: 44 });
    expect(selectCitizenContext(store.getSnapshot()).traffic.find(item => item.id === 'TR-1')?.vehicleCount).toBe(60);
    expect(selectPlannerRoads(store.getSnapshot()).find(item => item.id === 'anna')?.hourlyVehicles).toBe(60);
    store.dispatch(verify);
    expect(store.getSnapshot().reviews[reviewId].decision).toBe('Verified');
    expect(store.getSnapshot().dispatches[dispatchId].stage).toBe('Verified');
    store.dispatch({ type: 'closeDispatch', dispatchId, actor: 'Police admin' });
    expect(selectTrafficAnomalies(store.getSnapshot())[0]).toMatchObject({ status: 'Closed', ratio: 184 / 60, dispatch: { stage: 'Closed' } });
    expect(store.getSnapshot().trafficObservations['TR-1']).toEqual(trigger);
    const closed = store.getSnapshot();
    expect(store.dispatch(request)).toBe(closed);
    expectRejected(store, { type: 'assign', event, teamId: 'central-response', assignee: 'Officer' }, /Request dispatch/);
    expectIntegrity(store.getSnapshot());
  });

  it('returns a response to on-scene follow-up and creates a separate pending review on resubmission', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch({ type: 'qualifyAnomaly', anomalyId, actor: 'Officer' });
    store.dispatch({ type: 'requestDispatch', anomalyId, actor: 'Officer' });
    const dispatchId = Object.values(store.getSnapshot().dispatches)[0].id;
    store.dispatch({ type: 'assign', event, teamId: 'central-response', assignee: 'Officer' });
    store.dispatch({ type: 'advanceDispatch', dispatchId, stage: 'En route', actor: 'Officer' });
    store.dispatch({ type: 'advanceDispatch', dispatchId, stage: 'On scene', actor: 'Officer' });
    store.dispatch(resolutionCommand(store, event));
    const first = Object.values(store.getSnapshot().reviews).at(-1)!;
    store.dispatch({ type: 'reviewResolution', reviewId: first.id, decision: 'Returned', reviewer: 'Admin', note: 'Continue response' });
    expect(store.getSnapshot().dispatches[dispatchId].stage).toBe('On scene');
    expect(store.getSnapshot().anomalies[anomalyId].status).toBe('Dispatched');
    store.dispatch(resolutionCommand(store, event));
    const next = Object.values(store.getSnapshot().reviews).at(-1)!;
    expect(next.id).not.toBe(first.id);
    expect(next.decision).toBe('Pending');
    expect(store.getSnapshot().reviews[first.id].decision).toBe('Returned');
    expectIntegrity(store.getSnapshot());
  });

  it('rejects invalid traffic measurements and dangling source buses without changing the store', () => {
    const store = createCityStore(createCitySeed());
    const observation = { ...store.getSnapshot().trafficObservations['TR-1'], id: 'TR-NEW', observedAt: store.getSnapshot().now, sourceBusIds: ['MTC-2147', 'MTC-1423'] };
    for (const change of [
      { id: 'TR-1' }, { roadSegmentId: 'missing' }, { sourceBusIds: ['MTC-MISSING'] }, { sourceBusIds: [] },
      { baselineVehicleCount: 0 }, { vehicleCount: -1 }, { averageSpeed: Number.NaN }, { windowMinutes: 0 },
      { observedAt: '2027-01-01T00:00:00Z' },
    ]) expectRejected(store, { type: 'recordTraffic', observation: { ...observation, ...change } });
    store.dispatch({ type: 'recordTraffic', observation });
    observation.sourceBusIds.push('MTC-MISSING');
    expect(store.getSnapshot().trafficObservations['TR-NEW'].sourceBusIds).toEqual(['MTC-2147', 'MTC-1423']);
    const malformed = createCitySeed();
    malformed.trafficObservations['TR-1'].baselineVehicleCount = 0;
    expect(selectTrafficAnomalies(malformed)[0].ratio).toBeNull();
  });
});