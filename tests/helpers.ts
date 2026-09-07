import { expect } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore, type CityCommand } from '../src/domain/cityStore';
import type { CityState, EventRef, IssueKind } from '../src/types/city';

export type Store = ReturnType<typeof createCityStore>;
export const municipalCases: [IssueKind, string, string][] = [
  ['pothole', 'DEF-8301', 'roads-engineering'],
  ['waterlogging', 'DEF-8292', 'stormwater'],
  ['zebra-crossing', 'INF-8168', 'road-safety'],
  ['divider', 'INF-8159', 'roads-infrastructure'],
  ['signboard', 'INF-8152', 'signage'],
  ['guardrail', 'INF-8148', 'roads-infrastructure'],
  ['school-crossing', 'DEF-8141', 'road-safety'],
];

// The canonical pothole is already closed. Reopen only an isolated test fixture,
// removing its verified workflow rather than expecting production to reopen it.
export function openMunicipalSeed(): CityState {
  const seed = createCitySeed();
  const issue = seed.issues['DEF-8301'];
  delete seed.reviews['REV-SEED-1'];
  delete seed.resolutions['RES-SEED-1'];
  delete seed.assignments['ASN-SEED-1'];
  delete issue.repair;
  delete issue.repairStatus;
  issue.workflowStage = 'Detected';
  issue.status = 'Open';
  issue.currentCondition = 'Open pothole requiring repair';
  issue.maintenanceState = 'Repair required';
  issue.recommendedAction = 'Inspect and repair road surface';
  issue.history = issue.history.slice(0, 1);
  issue.observations = issue.observations!.filter(item => item.label !== 'Repair verified');
  issue.image = issue.observations.at(-1)!.image!;
  issue.lastSeen = issue.observations.at(-1)!.date;
  return seed;
}

export function beginMunicipalWork(store: Store, issueId = 'DEF-8292') {
  const issue = store.getSnapshot().issues[issueId];
  store.dispatch({ type: 'assign', event: { kind: 'municipal', id: issueId }, teamId: `${issue.departmentId}-team`, assignee: 'Test field supervisor' });
  store.dispatch({ type: 'acknowledge', issueId });
  store.dispatch({ type: 'startFieldWork', issueId });
}

export function resolutionCommand(store: Store, event: EventRef): Extract<CityCommand, { type: 'submitResolution' }> {
  return {
    type: 'submitResolution', event, submittedBy: 'Test field supervisor',
    summary: 'Field work complete', resultingCondition: 'Verified safe road condition',
    evidence: [{ id: 'TEST-EVIDENCE', image: '/test-field-evidence.svg', capturedAt: store.getSnapshot().now, description: 'Post-work field inspection' }],
  };
}

export function expectRejected(store: Store, command: CityCommand, message?: RegExp) {
  const before = store.getSnapshot();
  const contents = structuredClone(before);
  if (message) expect(() => store.dispatch(command)).toThrow(message);
  else expect(() => store.dispatch(command)).toThrow();
  expect(store.getSnapshot()).toBe(before);
  expect(store.getSnapshot()).toEqual(contents);
}

export function expectIntegrity(state: CityState) {
  const ref = (table: Record<string, { id: string }>, id: string) => {
    expect(table[id], `Dangling reference: ${id}`).toBeDefined();
    expect(table[id].id).toBe(id);
  };
  const event = (value: EventRef) => ref(value.kind === 'municipal' ? state.issues : value.kind === 'incident' ? state.incidents : state.anomalies, value.id);
  for (const key of ['roads', 'roadSegments', 'trafficObservations', 'buses', 'incidents', 'watchlist', 'issues', 'departments', 'teams', 'assignments', 'resolutions', 'reviews', 'anomalies', 'dispatches', 'scenarios', 'projects'] as const) {
    for (const [id, item] of Object.entries(state[key])) expect(item.id).toBe(id);
  }
  for (const segment of Object.values(state.roadSegments)) {
    ref(state.roads, segment.roadId);
    segment.connectsTo.forEach(id => ref(state.roadSegments, id));
  }
  for (const bus of Object.values(state.buses)) ref(state.roadSegments, bus.roadSegmentId);
  for (const observation of Object.values(state.trafficObservations)) {
    ref(state.roadSegments, observation.roadSegmentId);
    expect(observation.sourceBusIds.length).toBeGreaterThan(0);
    observation.sourceBusIds.forEach(id => ref(state.buses, id));
  }
  for (const incident of Object.values(state.incidents)) {
    ref(state.roadSegments, incident.roadSegmentId);
    if (incident.citizenReportId) {
      ref(state.citizenReports, incident.citizenReportId);
      expect(state.citizenReports[incident.citizenReportId].incidentId).toBe(incident.id);
      expect(incident.detectionSource).toBe('Citizen report');
      expect(incident.busId).toBe('');
    } else ref(state.buses, incident.busId);
  }
  for (const match of Object.values(state.watchlist)) {
    ref(state.buses, match.busId);
    match.observations?.forEach(item => ref(state.buses, item.busId));
  }
  for (const issue of Object.values(state.issues)) {
    if (issue.citizenReportId) {
      ref(state.citizenReports, issue.citizenReportId);
      expect(state.citizenReports[issue.citizenReportId].issueId).toBe(issue.id);
    }
    ref(state.roadSegments, issue.roadSegmentId);
    ref(state.departments, issue.departmentId);
    expect(state.departments[issue.departmentId].role).toBe('municipal');
    issue.busIds.forEach(id => ref(state.buses, id));
    issue.observations?.filter(item => item.busId).forEach(item => ref(state.buses, item.busId));
    if (issue.repair?.busId) ref(state.buses, issue.repair.busId);
  }
  for (const report of Object.values(state.citizenReports)) {
    ref(state.roadSegments, report.roadSegmentId);
    if (report.status !== 'Accepted') {
      expect(report.issueId).toBeUndefined(); expect(report.incidentId).toBeUndefined();
    } else if (report.category === 'traffic-obstruction') {
      ref(state.incidents, report.incidentId!); expect(report.issueId).toBeUndefined();
    } else { ref(state.issues, report.issueId!); expect(report.incidentId).toBeUndefined(); }
  }
  for (const team of Object.values(state.teams)) ref(state.departments, team.departmentId);
  for (const assignment of Object.values(state.assignments)) {
    event(assignment.event);
    ref(state.departments, assignment.departmentId);
    ref(state.teams, assignment.teamId);
    expect(state.teams[assignment.teamId].departmentId).toBe(assignment.departmentId);
    expect(assignment.departmentId).toBe(assignment.event.kind === 'municipal' ? state.issues[assignment.event.id].departmentId : 'traffic-police');
  }
  for (const resolution of Object.values(state.resolutions)) {
    event(resolution.event);
    ref(state.assignments, resolution.assignmentId);
    expect(state.assignments[resolution.assignmentId].event).toEqual(resolution.event);
    expect(resolution.evidence.length).toBeGreaterThan(0);
    for (const evidence of resolution.evidence) expect(Date.parse(evidence.capturedAt)).toBeLessThanOrEqual(Date.parse(resolution.submittedAt));
  }
  for (const review of Object.values(state.reviews)) {
    ref(state.resolutions, review.resolutionId);
    expect(Date.parse(review.notifiedAt)).toBeGreaterThanOrEqual(Date.parse(state.resolutions[review.resolutionId].submittedAt));
    if (review.reviewedAt) expect(Date.parse(review.reviewedAt)).toBeGreaterThanOrEqual(Date.parse(review.notifiedAt));
  }
  for (const anomaly of Object.values(state.anomalies)) {
    ref(state.roadSegments, anomaly.roadSegmentId);
    ref(state.trafficObservations, anomaly.observationId);
    expect(state.trafficObservations[anomaly.observationId].roadSegmentId).toBe(anomaly.roadSegmentId);
  }
  for (const dispatch of Object.values(state.dispatches)) ref(state.anomalies, dispatch.anomalyId);
  for (const [id, dispatch] of Object.entries(state.emergencyDispatches)) {
    expect(dispatch.id).toBe(id);
    event(dispatch.event);
    ref(state.policeStations, dispatch.stationId);
    expect(dispatch.assignedAt).toBe(dispatch.requestedAt);
    expect(Number.isFinite(dispatch.distanceKm)).toBe(true);
    expect(dispatch.distanceKm).toBeGreaterThanOrEqual(0);
    expect(Date.parse(dispatch.assignedAt)).toBeLessThanOrEqual(Date.parse(state.now));
  }
  for (const scenario of Object.values(state.scenarios)) {
    ref(state.roadSegments, scenario.roadSegmentId);
    expect(scenario.inputs.road.id).toBe(scenario.roadSegmentId);
    scenario.inputs.connected.forEach(item => ref(state.roadSegments, item.id));
    scenario.inputs.observationIds.forEach(id => ref(state.trafficObservations, id));
    scenario.affected.forEach(item => ref(state.roadSegments, item.roadSegmentId));
  }
  for (const project of Object.values(state.projects)) ref(state.scenarios, project.scenarioId);
  [...state.journey.current, ...state.journey.alternative].forEach(leg => ref(state.roadSegments, leg.roadSegmentId));
  ref(state.roadSegments, state.journey.viaSegmentId);
}