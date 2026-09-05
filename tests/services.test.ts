import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { selectCitizenAlerts, selectCitizenContext, selectCitizenRoute, selectIssues, selectPoliceAssignments, selectWatchlist } from '../src/domain/selectors';
import { cityStore } from '../src/services/city';
import { analyticsService, citizenService, demoService, incidentsService, mapService, municipalService, policeTrafficService, trafficService, watchlistService, workflowService } from '../src/services';
import { expectIntegrity, resolutionCommand } from './helpers';

beforeEach(() => demoService.reset());
afterEach(() => demoService.reset());

const municipalEvent = { kind: 'municipal', id: 'DEF-8292' } as const;
async function pendingMunicipalReview() {
  await municipalService.assign(municipalEvent.id, 'stormwater-team', 'Drainage lead');
  await municipalService.acknowledge(municipalEvent.id);
  await municipalService.startFieldWork(municipalEvent.id);
  return workflowService.submitResolution(resolutionCommand(cityStore, municipalEvent));
}

describe('services share the one city store', () => {
  it('assigns the same incident consumed by list, detail and map state', async () => {
    const id = 'INC-24088';
    const before = await incidentsService.getIncident(id);
    const assignment = await incidentsService.assign(id, 'central-response', 'Officer Lee');
    expect(assignment).toEqual(await workflowService.getAssignment({ kind: 'incident', id }));
    expect(assignment).toMatchObject({ event: { kind: 'incident', id }, assignee: 'Officer Lee' });
    const detail = await incidentsService.getIncident(id);
    expect(detail).toEqual({ ...before, status: 'Investigating' });
    expect((await incidentsService.getIncidents()).find(item => item.id === id)).toEqual(detail);
    // PoliceMapView reads this same normalized incident collection.
    expect(cityStore.getSnapshot().incidents[id]).toEqual(detail);
    expect(selectPoliceAssignments(cityStore.getSnapshot())[id]).toEqual({ officer: 'Officer Lee', team: 'Central Response Team' });
    expect((await analyticsService.getFleetSummary()).activity.some(item => item.detail.includes('Officer Lee'))).toBe(true);
  });

  it.each(['Verified', 'Dismissed'] as const)('shows %s matches consistently in detail, list, map selector and summary', async decision => {
    const id = 'MAT-1028';
    const before = (await analyticsService.getFleetSummary()).possibleMatches;
    await watchlistService.decide(id, decision);
    const detail = await watchlistService.getWatchlistMatch(id);
    expect(detail).toMatchObject({ status: decision, location: 'Guindy', busId: 'MTC-2014', confidence: 89 });
    expect((await watchlistService.getWatchlist()).find(item => item.id === id)).toEqual(detail);
    expect((await watchlistService.getWatchlistMatches()).find(item => item.id === id)).toEqual(detail);
    expect(selectWatchlist(cityStore.getSnapshot()).find(item => item.id === id)).toEqual(detail);
    expect((await analyticsService.getFleetSummary()).possibleMatches).toBe(before - 1);
    expect(cityStore.getSnapshot().watchlist[id].status).toBe(decision);
  });

  it('runs municipal operations and updates map, detail, risk, review and citizen views together', async () => {
    const before = await municipalService.getRoadDefect(municipalEvent.id);
    const assignment = await municipalService.assign(municipalEvent.id, 'stormwater-team', 'Drainage lead');
    const assigned = await municipalService.getRoadDefect(municipalEvent.id);
    expect(assigned?.workflowStage).toBe('Assigned');
    expect((await municipalService.getMunicipalMapData()).find(item => item.id === municipalEvent.id)).toEqual(assigned);
    expect(selectIssues(cityStore.getSnapshot()).find(item => item.id === municipalEvent.id)).toEqual(assigned);
    expect(await workflowService.getAssignment(municipalEvent)).toEqual(assignment);
    expect((await municipalService.acknowledge(municipalEvent.id))?.workflowStage).toBe('Acknowledged');
    expect((await municipalService.startFieldWork(municipalEvent.id))?.workflowStage).toBe('In progress');
    const resolution = await workflowService.submitResolution(resolutionCommand(cityStore, municipalEvent));
    const [review] = await workflowService.getPendingReviews();
    expect(review.resolution).toEqual(resolution);
    expect((await citizenService.getMobilityContext()).conditions.find(item => item.id === municipalEvent.id)).toMatchObject({ verified: false, condition: before!.currentCondition });
    await workflowService.reviewResolution(review.id, 'Verified', 'Municipal admin', 'Checked evidence');
    expect(await workflowService.getPendingReviews()).toEqual([]);
    const detail = await municipalService.getRoadDefect(municipalEvent.id);
    expect(detail).toMatchObject({ status: 'Verified', workflowStage: 'Closed', currentCondition: resolution.resultingCondition });
    expect((await municipalService.getRoadDefects()).find(item => item.id === municipalEvent.id)).toEqual(detail);
    expect((await municipalService.getMunicipalMapData()).find(item => item.id === municipalEvent.id)).toEqual(detail);
    expect((await municipalService.getRoadRisk()).some(item => item.id === municipalEvent.id)).toBe(false);
    expect((await citizenService.getMobilityContext()).conditions.find(item => item.id === municipalEvent.id)).toMatchObject({ verified: true, condition: resolution.resultingCondition });
    expect((await citizenService.getAlerts()).some(item => item.sourceId === municipalEvent.id)).toBe(false);
    expectIntegrity(cityStore.getSnapshot());
  });

  it('runs traffic response operations and makes normalized observations visible everywhere', async () => {
    const anomalyId = 'ANOM-ANNA-1';
    const event = { kind: 'anomaly', id: anomalyId } as const;
    expect((await policeTrafficService.qualify(anomalyId, 'Officer')).status).toBe('Qualified');
    const dispatch = await policeTrafficService.requestDispatch(anomalyId, 'Officer');
    const revision = cityStore.getSnapshot().revision;
    expect(await policeTrafficService.requestDispatch(anomalyId, 'Officer')).toEqual(dispatch);
    expect(cityStore.getSnapshot().revision).toBe(revision);
    await policeTrafficService.assign(anomalyId, 'central-response', 'Officer');
    expect((await policeTrafficService.advanceDispatch(dispatch.id, 'En route', 'Officer')).stage).toBe('En route');
    expect((await policeTrafficService.advanceDispatch(dispatch.id, 'On scene', 'Officer')).stage).toBe('On scene');
    await workflowService.submitResolution(resolutionCommand(cityStore, event));
    const [review] = await workflowService.getPendingReviews();
    await expect(workflowService.reviewResolution(review.id, 'Verified', 'Admin', 'Checked')).rejects.toThrow(/normalizing/);
    const observation = { ...cityStore.getSnapshot().trafficObservations['TR-1'], id: 'TR-SERVICE-NORMAL', observedAt: cityStore.getSnapshot().now, vehicleCount: 60, densityLevel: 'Free' as const, averageSpeed: 44 };
    await demoService.recordTraffic(observation);
    expect((await trafficService.getSegment('TR-1'))?.vehicleCount).toBe(60);
    expect((await trafficService.getTrafficData()).find(item => item.id === 'TR-1')?.densityLevel).toBe('Free');
    expect((await citizenService.getMapData()).traffic.find(item => item.id === 'TR-1')?.vehicleCount).toBe(60);
    expect((await trafficService.getObservations()).find(item => item.id === observation.id)).toEqual(observation);
    await workflowService.reviewResolution(review.id, 'Verified', 'Admin', 'Flow restored');
    expect((await policeTrafficService.getAnomalies())[0]).toMatchObject({ status: 'Closed', dispatch: { stage: 'Closed' } });
    expectIntegrity(cityStore.getSnapshot());
  });

  it('publishes and cancels the stored scenario rather than creating a separate service cache', async () => {
    const initialRoute = await citizenService.recommendRoute();
    const scenario = await municipalService.runConstructionSimulation({ roadSegmentId: 'anna', duration: '8 weeks' });
    expect(scenario).toEqual(await municipalService.getScenario(scenario.id));
    expect(scenario).toMatchObject({ delay: 9, simulatedMinutes: 33 });
    const [project] = await municipalService.getProjects();
    expect(project.scenarioId).toBe(scenario.id);
    expect((await citizenService.getMobilityContext()).impacts).toEqual([]);
    await municipalService.approveProject(project.id, 'Planning admin');
    expect(cityStore.getSnapshot().projects[project.id].status).toBe('Approved');
    expect((await citizenService.recommendRoute()).currentMinutes).toBeNull();
    expect((await citizenService.getMapData()).alerts.some(item => item.id.startsWith(`project-${project.id}`))).toBe(true);
    await municipalService.cancelProject(project.id);
    expect(await citizenService.recommendRoute()).toEqual(initialRoute);
    expect((await citizenService.getMobilityContext()).impacts).toEqual([]);
    await demoService.setTime('2026-09-07T00:00:00Z');
    expect(demoService.getClock()).toBe(cityStore.getSnapshot().now);
    demoService.reset();
    expect(cityStore.getSnapshot()).toEqual(createCitySeed());
    expect(await municipalService.getProjects()).toEqual([]);
  });
});

describe('asynchronous rejection and detached service reads', () => {
  it('rejects invalid operations through promises without synchronous throws, mutations or notifications', async () => {
    const listener = vi.fn();
    const unsubscribe = cityStore.subscribe(listener);
    const operations = [
      () => incidentsService.assign('missing', 'central-response', 'Officer'),
      () => watchlistService.decide('missing', 'Verified'),
      () => municipalService.assign('DEF-8292', 'central-response', 'Officer'),
      () => municipalService.acknowledge('DEF-8292'),
      () => municipalService.startFieldWork('DEF-8292'),
      () => workflowService.submitResolution(resolutionCommand(cityStore, municipalEvent)),
      () => workflowService.reviewResolution('missing', 'Verified', 'Admin', 'Checked'),
      () => policeTrafficService.qualify('missing', 'Officer'),
      () => policeTrafficService.requestDispatch('ANOM-ANNA-1', 'Officer'),
      () => policeTrafficService.assign('ANOM-ANNA-1', 'central-response', 'Officer'),
      () => policeTrafficService.advanceDispatch('missing', 'On scene', 'Officer'),
      () => municipalService.runConstructionSimulation({ roadSegmentId: 'anna', duration: 'invalid' }),
      () => municipalService.approveProject('missing', 'Admin'),
      () => municipalService.cancelProject('missing'),
      () => demoService.setTime('2020-01-01T00:00:00Z'),
      () => demoService.recordTraffic({ ...cityStore.getSnapshot().trafficObservations['TR-1'], id: 'BAD-SOURCE', sourceBusIds: ['missing'] }),
    ];
    try {
      for (const operation of operations) {
        const before = cityStore.getSnapshot();
        let result: Promise<unknown> | undefined;
        expect(() => { result = operation(); }).not.toThrow();
        expect(result).toBeInstanceOf(Promise);
        await expect(result).rejects.toThrow();
        expect(cityStore.getSnapshot()).toBe(before);
      }
      expect(listener).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('returns independent mutable copies from every populated query, including nested evidence and geometry', async () => {
    await pendingMunicipalReview();
    const scenario = await municipalService.runConstructionSimulation({ roadSegmentId: 'anna', duration: '3 days' });
    const queries: [string, () => Promise<unknown>][] = [
      ['incidents', incidentsService.getIncidents], ['incident', () => incidentsService.getIncident('INC-24091')],
      ['watchlist', watchlistService.getWatchlist], ['matches', watchlistService.getWatchlistMatches], ['match', () => watchlistService.getWatchlistMatch('MAT-1028')],
      ['defects', municipalService.getRoadDefects], ['defect', () => municipalService.getRoadDefect('DEF-8292')], ['municipal map', municipalService.getMunicipalMapData],
      ['risk', municipalService.getRoadRisk], ['roads', municipalService.getRoads], ['departments', municipalService.getDepartments],
      ['assignment', () => workflowService.getAssignment(municipalEvent)], ['teams', () => workflowService.getTeams()], ['reviews', workflowService.getPendingReviews],
      ['scenario', () => municipalService.getScenario(scenario.id)], ['projects', municipalService.getProjects], ['anomalies', policeTrafficService.getAnomalies],
      ['traffic', trafficService.getTrafficData], ['segment', () => trafficService.getSegment('TR-1')], ['observations', trafficService.getObservations],
      ['citizen map', citizenService.getMapData], ['alerts', citizenService.getAlerts], ['context', citizenService.getMobilityContext], ['route', citizenService.recommendRoute],
      ['buses', mapService.getBuses], ['summary', analyticsService.getFleetSummary],
    ];
    const snapshot = cityStore.getSnapshot();
    const original = structuredClone(snapshot);
    function mutate(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      expect(Object.isFrozen(value)).toBe(false);
      for (const [key, item] of Object.entries(value)) {
        if (item && typeof item === 'object') mutate(item);
        else if (typeof item === 'string') (value as Record<string, unknown>)[key] = 'external mutation';
        else if (typeof item === 'number') (value as Record<string, unknown>)[key] = -999;
      }
    }
    for (const [name, query] of queries) {
      const first = await query();
      const copy = structuredClone(first);
      expect(first, name).toBeDefined();
      const second = await query();
      expect(first, name).not.toBe(second);
      mutate(first);
      expect(await query(), name).toEqual(copy);
      expect(cityStore.getSnapshot(), name).toBe(snapshot);
      expect(cityStore.getSnapshot(), name).toEqual(original);
    }
    expect((await workflowService.getTeams('stormwater')).map(team => team.departmentId)).toEqual(['stormwater']);
    expect((await municipalService.getDepartments()).every(item => item.role === 'municipal')).toBe(true);
  });
});

describe('citizen privacy boundary', () => {
  it('exposes only public road information, never watchlist subjects, source buses or response personnel', async () => {
    await incidentsService.assign('INC-24088', 'central-response', 'PRIVATE-OFFICER');
    const resolution = await pendingMunicipalReview();
    const [review] = await workflowService.getPendingReviews();
    await workflowService.reviewResolution(review.id, 'Verified', 'PRIVATE-REVIEWER', 'Checked');
    const scenario = await municipalService.runConstructionSimulation({ roadSegmentId: 'anna', duration: '3 days' });
    const [project] = await municipalService.getProjects();
    await municipalService.approveProject(project.id, 'PRIVATE-PLANNER');
    const seed = createCitySeed();
    seed.incidents['INC-24071'].status = 'Open';
    const obstruction = selectCitizenContext(seed).conditions.find(item => item.title === 'Road obstruction');
    expect(obstruction).toBeDefined();
    const publicViews = [await citizenService.getMapData(), await citizenService.getAlerts(), await citizenService.getMobilityContext(), await citizenService.recommendRoute(), selectCitizenContext(seed), selectCitizenAlerts(seed), selectCitizenRoute(seed)];
    const forbiddenKeys = new Set(['watchlist', 'subjectName', 'subjectType', 'referenceImage', 'registrationNumber', 'registrationConfidence', 'busId', 'busIds', 'sourceBusIds', 'buses', 'officer', 'assignee', 'submittedBy', 'reviewer', 'approvedBy', 'teamId', 'departmentId', 'assignmentId', 'resolutionId']);
    function checkKeys(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      for (const [key, item] of Object.entries(value)) {
        expect(forbiddenKeys.has(key), `Private field leaked: ${key}`).toBe(false);
        checkKeys(item);
      }
    }
    for (const view of publicViews) {
      checkKeys(view);
      const serialized = JSON.stringify(view);
      for (const secret of [
        ...Object.keys(seed.buses), ...Object.keys(seed.watchlist), ...Object.values(seed.watchlist).map(item => item.subjectName),
        'PRIVATE-OFFICER', 'PRIVATE-REVIEWER', 'PRIVATE-PLANNER', resolution.id, review.id,
      ]) expect(serialized).not.toContain(secret);
    }
    const context = await citizenService.getMobilityContext();
    expect(context.impacts.some(item => item.projectId === project.id && item.startsAt === scenario.startsAt)).toBe(true);
    const verified = context.conditions.find(item => item.id === municipalEvent.id)!;
    expect(verified).toMatchObject({ verified: true, condition: resolution.resultingCondition });
    for (const evidence of verified.evidence) expect(Object.keys(evidence)).toEqual(['capturedAt']);
  });
});