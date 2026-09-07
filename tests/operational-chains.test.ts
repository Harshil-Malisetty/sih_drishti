import { describe, expect, it } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore } from '../src/domain/cityStore';
import { emergencyEligible, selectMunicipalTasks } from '../src/domain/operations';
import { selectCitizenContext, selectCitizenRoute, selectPublicProjects, selectTraffic } from '../src/domain/selectors';
import { beginMunicipalWork, expectRejected, resolutionCommand } from './helpers';

const municipal = { kind: 'municipal', id: 'DEF-8292' } as const;
const incident = { kind: 'incident', id: 'INC-24091' } as const;
const actor = 'Demo operator';
type Store = ReturnType<typeof createCityStore>;

function requestEmergency(store: Store, event = incident as typeof incident | typeof municipal) {
  store.dispatch({ type: 'requestEmergency', event, reason: 'Coordinated on-site safety assistance', actor });
  return Object.values(store.getSnapshot().emergencyDispatches).find(item => item.event.kind === event.kind && item.event.id === event.id)!;
}
function dispatchToScene(store: Store, id: string) {
  store.dispatch({ type: 'advanceEmergency', dispatchId: id, stage: 'En route', actor });
  store.dispatch({ type: 'advanceEmergency', dispatchId: id, stage: 'On scene', actor });
}

describe('state-derived Municipal admin tasks', () => {
  it('changes assignment into verification, then closure and Citizen-update tasks on real state transitions', () => {
    const store = createCityStore(createCitySeed());
    const task = () => selectMunicipalTasks(store.getSnapshot()).find(item => item.target.id === municipal.id)!;
    expect(task()).toMatchObject({ kind: 'Assignment', actionRequired: true });
    expectRejected(store, { type: 'closeIssue', issueId: municipal.id, actor }, /verification/);
    store.dispatch({ type: 'qualifyIssue', issueId: municipal.id, actor });
    expect(store.getSnapshot().issues[municipal.id].workflowStage).toBe('Qualified');
    beginMunicipalWork(store);
    expect(task()).toMatchObject({ kind: 'Field action', actionRequired: false });
    store.dispatch(resolutionCommand(store, municipal));
    const resolution = Object.values(store.getSnapshot().resolutions).at(-1)!;
    const review = Object.values(store.getSnapshot().reviews).at(-1)!;
    expect(task()).toMatchObject({ id: `review-${review.id}`, kind: 'Verification', at: resolution.submittedAt, actionRequired: true });
    expect(selectCitizenContext(store.getSnapshot()).conditions.find(item => item.id === municipal.id)?.verified).toBe(false);
    expectRejected(store, { type: 'closeIssue', issueId: municipal.id, actor }, /verification/);
    store.dispatch({ type: 'reviewResolution', reviewId: review.id, decision: 'Verified', reviewer: actor, note: 'Evidence checked' });
    expect(task().kind).toBe('Closure');
    expect(selectCitizenContext(store.getSnapshot()).conditions.find(item => item.id === municipal.id)?.verified).toBe(true);
    const closed = store.dispatch({ type: 'closeIssue', issueId: municipal.id, actor });
    expect(store.dispatch({ type: 'closeIssue', issueId: municipal.id, actor })).toBe(closed);
    expect(task()).toMatchObject({ kind: 'Citizen update', actionRequired: false });
    expect(new Set(selectMunicipalTasks(closed).map(item => item.id)).size).toBe(selectMunicipalTasks(closed).length);
  });
});

describe('automatic emergency allocation and response release', () => {
  it('requires ordered response, discharge, and a separate event-resolution action', () => {
    const store = createCityStore(createCitySeed());
    const response = requestEmergency(store);
    expect(store.dispatch({ type: 'requestEmergency', event: incident, reason: 'Same request', actor })).toBe(store.getSnapshot());
    expect(Object.values(store.getSnapshot().emergencyDispatches)).toHaveLength(1);
    expectRejected(store, { type: 'advanceEmergency', dispatchId: response.id, stage: 'Discharged', actor }, /Invalid emergency/);
    expect(response.stage).toBe('Assigned');
    expect(response.stationId).toBeTruthy();
    expectRejected(store, { type: 'advanceEmergency', dispatchId: response.id, stage: 'On scene', actor }, /Invalid emergency/);
    dispatchToScene(store, response.id);
    expectRejected(store, { type: 'resolveEmergencyIncident', dispatchId: response.id, actor }, /Release the team/);
    expectRejected(store, { type: 'advanceEmergency', dispatchId: response.id, stage: 'Response complete', actor }, /outcome/);
    store.dispatch({ type: 'advanceEmergency', dispatchId: response.id, stage: 'Response complete', actor, outcome: 'Scene assistance completed; corridor clear' });
    expect(store.getSnapshot().incidents[incident.id].status).toBe('Investigating');
    expectRejected(store, { type: 'resolveEmergencyIncident', dispatchId: response.id, actor }, /Release the team/);
    const released = store.dispatch({ type: 'advanceEmergency', dispatchId: response.id, stage: 'Discharged', actor });
    expect(released.emergencyDispatches[response.id].dischargedAt).toBe(released.now);
    expect(released.incidents[incident.id].status).toBe('Investigating');
    store.dispatch({ type: 'resolveEmergencyIncident', dispatchId: response.id, actor });
    expect(store.getSnapshot().incidents[incident.id]).toMatchObject({ status: 'Resolved', emergencyDispatchId: response.id, resolutionSummary: 'Scene assistance completed; corridor clear' });
    expect(store.getSnapshot().emergencyDispatches[response.id].resolvedAt).toBe(store.getSnapshot().now);
  });

  it('does not automatically label an anomaly an emergency or bypass a Municipal field review', () => {
    const store = createCityStore(createCitySeed());
    expect(emergencyEligible(store.getSnapshot(), { kind: 'anomaly', id: 'ANOM-ANNA-1' })).toBe(false);
    expectRejected(store, { type: 'requestEmergency', event: { kind: 'anomaly', id: 'ANOM-ANNA-1' }, reason: 'High ratio only', actor }, /does not qualify/);
    expectRejected(store, { type: 'requestEmergency', event: incident, reason: '', actor }, /reason/);
    store.dispatch({ type: 'qualifyIssue', issueId: municipal.id, actor });
    beginMunicipalWork(store);
    const response = requestEmergency(store, municipal);
    dispatchToScene(store, response.id);
    expectRejected(store, resolutionCommand(store, municipal), /discharge/);
    store.dispatch({ type: 'advanceEmergency', dispatchId: response.id, stage: 'Response complete', actor, outcome: 'Drainage crew access secured' });
    expectRejected(store, resolutionCommand(store, municipal), /discharge/);
    store.dispatch({ type: 'advanceEmergency', dispatchId: response.id, stage: 'Discharged', actor });
    expectRejected(store, { type: 'resolveEmergencyIncident', dispatchId: response.id, actor }, /Municipal events/);
    store.dispatch(resolutionCommand(store, municipal));
    expect(store.getSnapshot().issues[municipal.id].workflowStage).toBe('Admin review');
    expect(selectCitizenContext(store.getSnapshot()).conditions.find(item => item.id === municipal.id)?.verified).toBe(false);
  });

  it('allocates concurrent events to the nearest station without waiting for another response to finish', () => {
    const seed = createCitySeed();
    const station = seed.policeStations['station-teynampet'];
    seed.policeStations = { [station.id]: station };
    const store = createCityStore(seed);
    const first = requestEmergency(store);
    dispatchToScene(store, first.id);
    store.dispatch({ type: 'qualifyIssue', issueId: municipal.id, actor });
    const second = requestEmergency(store, municipal);
    expect(second).toMatchObject({ stage: 'Assigned', stationId: first.stationId });
    store.dispatch({ type: 'advanceEmergency', dispatchId: first.id, stage: 'Response complete', actor, outcome: 'Assistance complete' });
    store.dispatch({ type: 'advanceEmergency', dispatchId: first.id, stage: 'Discharged', actor });
    expect(store.getSnapshot().emergencyDispatches[second.id]).toEqual(second);
  });
});

describe('explicit fleet recovery and Police closure', () => {
  it('records one canonical follow-up through the demo action and retains the trigger', () => {
    const store = createCityStore(createCitySeed());
    const anomalyId = 'ANOM-ANNA-1';
    expectRejected(store, { type: 'observeRecovery', anomalyId, actor }, /on scene/);
    store.dispatch({ type: 'qualifyAnomaly', anomalyId, actor });
    store.dispatch({ type: 'requestDispatch', anomalyId, actor });
    const dispatchId = Object.values(store.getSnapshot().dispatches)[0].id;
    store.dispatch({ type: 'assign', event: { kind: 'anomaly', id: anomalyId }, teamId: 'traffic-investigation', assignee: actor });
    store.dispatch({ type: 'advanceDispatch', dispatchId, stage: 'En route', actor });
    store.dispatch({ type: 'advanceDispatch', dispatchId, stage: 'On scene', actor });
    expectRejected(store, { type: 'closeDispatch', dispatchId, actor }, /verification/);
    store.dispatch({ type: 'observeRecovery', anomalyId, actor });
    expect(selectTraffic(store.getSnapshot()).find(item => item.id === 'TR-1')).toMatchObject({ vehicleCount: 60, densityLevel: 'Free', averageSpeed: 42 });
    expect(store.getSnapshot().trafficObservations['TR-1'].vehicleCount).toBe(184);
    store.dispatch(resolutionCommand(store, { kind: 'anomaly', id: anomalyId }));
    const reviewId = Object.values(store.getSnapshot().reviews).at(-1)!.id;
    store.dispatch({ type: 'reviewResolution', reviewId, decision: 'Verified', reviewer: actor, note: 'Follow-up reviewed' });
    expect(store.getSnapshot().dispatches[dispatchId].stage).toBe('Verified');
    store.dispatch({ type: 'closeDispatch', dispatchId, actor });
    expect(store.getSnapshot().anomalies[anomalyId].status).toBe('Closed');
  });
});

describe('Municipal publication records consumed by Citizen', () => {
  it('creates public work context only after approval and removes it on cancellation', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch({ type: 'createScenario', roadSegmentId: 'anna', duration: '3 days' });
    const project = Object.values(store.getSnapshot().projects)[0];
    expect(selectPublicProjects(store.getSnapshot())).toEqual([]);
    expect(selectMunicipalTasks(store.getSnapshot()).find(task => task.kind === 'Project')?.actionRequired).toBe(true);
    store.dispatch({ type: 'approveProject', projectId: project.id, actor: 'PRIVATE-ADMIN', title: 'Anna Salai resurfacing', projectType: 'Resurfacing' });
    const publicProject = selectCitizenContext(store.getSnapshot()).projects[0];
    expect(publicProject).toMatchObject({ title: 'Anna Salai resurfacing', projectType: 'Resurfacing', status: 'Active', source: 'Municipal planning system', roadSegmentId: 'anna' });
    expect(publicProject.affectedCorridors[0].restriction).toBe('Closed');
    expect(publicProject.alternativeCorridors).toContain('C.P. Ramaswamy Road');
    const route = selectCitizenRoute(store.getSnapshot());
    expect(route.currentMinutes).toBeNull();
    expect(route.alternativeMinutes).toBeGreaterThan(24);
    expect(route.reason).toContain('avoids active municipal road work');
    expect(JSON.stringify(selectCitizenContext(store.getSnapshot()))).not.toMatch(/PRIVATE-ADMIN|MTC-|registration|subjectName|confidence|teamId/);
    store.dispatch({ type: 'cancelProject', projectId: project.id });
    expect(selectPublicProjects(store.getSnapshot())).toEqual([]);
    expect(selectCitizenRoute(store.getSnapshot()).currentMinutes).toBe(38);
  });
});