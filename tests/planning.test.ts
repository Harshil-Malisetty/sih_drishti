import { describe, expect, it } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore } from '../src/domain/cityStore';
import { calculateScenario, selectPlannerSimulation } from '../src/domain/planning';
import { selectCitizenAlerts, selectCitizenContext, selectCitizenRoute } from '../src/domain/selectors';
import { expectIntegrity, expectRejected, type Store } from './helpers';

function createProject(store: Store, roadSegmentId = 'anna', startsAt?: string) {
  store.dispatch({ type: 'createScenario', roadSegmentId, duration: '3 days', ...(startsAt ? { startsAt } : {}) });
  return Object.values(store.getSnapshot().projects).at(-1)!;
}

describe('reviewable planning calculations', () => {
  it.each([
    ['2 weeks', 14, 7, 31, [0, 1, 3, 8, 14]],
    ['8 weeks', 56, 9, 33, [0, 1, 9, 32, 56]],
    ['4 months', 120, 12, 36, [0, 1, 19, 70, 120]],
  ] as const)('preserves the %s Anna Salai model', (duration, days, delay, simulatedMinutes, timelineDays) => {
    const state = createCitySeed();
    const before = structuredClone(state);
    const scenario = calculateScenario(state, { roadSegmentId: 'anna', duration }, 'SIM-TEST');
    expect(scenario).toMatchObject({ days, delay, simulatedMinutes, modelVersion: 'demo-capacity-v1', confidence: 'Observed', inputs: { road: { baselineMinutes: 24, hourlyVehicles: 184 } } });
    expect(scenario.timeline.map(item => item.day)).toEqual(timelineDays);
    expect(scenario.timeline.find(item => item.label === 'Baseline')?.delay).toBe(0);
    expect(scenario.timeline.find(item => item.label === 'Peak impact')?.delay).toBe(delay);
    expect(scenario.inputs.road.baselineMinutes + scenario.timeline.find(item => item.label === 'Peak impact')!.delay).toBe(simulatedMinutes);
    expect(Date.parse(scenario.endsAt) - Date.parse(scenario.startsAt)).toBe(days * 86_400_000);
    expect(scenario.affected[0]).toMatchObject({ roadSegmentId: 'anna', restriction: 'Closed', delayMinutes: 0 });
    expect(scenario.affected.slice(1).map(item => item.roadSegmentId).sort()).toEqual(['cathedral', 'cpr', 'inner-ring']);
    expect(scenario.inputs.observationIds).toEqual(['TR-1', 'TR-cathedral', 'TR-cpr', 'TR-inner-ring']);
    expect(new Set(scenario.busRoutes).size).toBe(scenario.busRoutes.length);
    expect(calculateScenario(state, { roadSegmentId: 'anna', duration }, 'SIM-TEST')).toEqual(scenario);
    expect(state).toEqual(before);
  });

  it('fits every phase strictly within the new three-day window', () => {
    const scenario = calculateScenario(createCitySeed(), { roadSegmentId: 'anna', duration: '3 days' }, 'SIM-3D');
    expect(scenario).toMatchObject({ days: 3, delay: 4, simulatedMinutes: 28, scenarioLabel: 'Brief works window' });
    expect(Date.parse(scenario.endsAt) - Date.parse(scenario.startsAt)).toBe(3 * 86_400_000);
    const days = scenario.timeline.map(item => item.day);
    expect(days[0]).toBe(0);
    expect(days.at(-1)).toBe(3);
    expect(days.every((day, index) => day >= 0 && day <= 3 && (index === 0 || day > days[index - 1]))).toBe(true);
    expect(scenario.timeline.find(item => item.label === 'Peak impact')!.day).toBeLessThan(3);
  });

  it('freezes input snapshots and uses them even if live road/traffic data later change', () => {
    const state = createCitySeed();
    const scenario = calculateScenario(state, { roadSegmentId: 'anna', duration: '8 weeks' }, 'SIM-FROZEN');
    const original = structuredClone(scenario);
    const preview = selectPlannerSimulation(scenario);
    expect(Object.isFrozen(scenario.inputs)).toBe(true);
    expect(Object.isFrozen(scenario.inputs.road.points[0])).toBe(true);
    expect(Object.isFrozen(scenario.inputs.connected[0].busRoutes)).toBe(true);
    expect(Object.isFrozen(scenario.inputs.observationIds)).toBe(true);
    expect(() => { scenario.inputs.road.baselineMinutes = 999; }).toThrow(TypeError);
    state.roadSegments.anna.baselineMinutes = 999;
    state.roadSegments.cathedral.points[0][0] = 0;
    state.trafficObservations['TR-1'].vehicleCount = 999;
    expect(scenario).toEqual(original);
    expect(selectPlannerSimulation(scenario)).toEqual(preview);
    preview.road.points[0][0] = 0;
    preview.affected[0].segment.busRoutes.push('external');
    preview.timeline[0].delay = 999;
    expect(scenario).toEqual(original);
  });

  it('preserves a stored scenario through subsequent measurements and approval', () => {
    const store = createCityStore(createCitySeed());
    const project = createProject(store);
    const scenario = structuredClone(store.getSnapshot().scenarios[project.scenarioId]);
    store.dispatch({ type: 'recordTraffic', observation: { ...store.getSnapshot().trafficObservations['TR-1'], id: 'TR-AFTER-SIMULATION', vehicleCount: 300, observedAt: store.getSnapshot().now } });
    store.dispatch({ type: 'approveProject', projectId: project.id, actor: 'Admin' });
    expect(store.getSnapshot().scenarios[project.scenarioId]).toEqual(scenario);
    expect(Object.isFrozen(store.getSnapshot().scenarios[project.scenarioId].affected[0])).toBe(true);
    expect(selectCitizenContext(store.getSnapshot()).impacts.map(({ roadSegmentId, delayMinutes }) => ({ roadSegmentId, delayMinutes }))).toEqual(scenario.affected.map(({ roadSegmentId, delayMinutes }) => ({ roadSegmentId, delayMinutes })));
    expectIntegrity(store.getSnapshot());
  });

  it.each([
    { roadSegmentId: 'missing', duration: '8 weeks' },
    { roadSegmentId: 'adyar-school', duration: '8 weeks' },
    { roadSegmentId: 'anna', duration: 'forever' },
    { roadSegmentId: 'anna', duration: 'toString' },
    { roadSegmentId: 'anna', duration: '3 days', startsAt: '2026-02-30T09:00:00Z' },
    { roadSegmentId: 'anna', duration: '3 days', startsAt: '2026-09-06T09:00:00' },
    { roadSegmentId: 'anna', duration: '3 days', startsAt: '2026-09-04T09:00:00Z' },
  ])('rejects invalid planning input $roadSegmentId / $duration / $startsAt atomically', input => {
    expectRejected(createCityStore(createCitySeed()), { type: 'createScenario', ...input });
  });
});

describe('project publication and citizen route availability', () => {
  it('accepts an explicit start-now window without shifting the requested start', () => {
    const store = createCityStore(createCitySeed());
    const startsAt = store.getSnapshot().now;
    const project = createProject(store, 'anna', startsAt);
    expect(store.getSnapshot().scenarios[project.scenarioId].startsAt).toBe(startsAt);
  });

  it('starts with a 38-minute current journey and a 24-minute alternative', () => {
    expect(selectCitizenRoute(createCitySeed())).toMatchObject({ currentMinutes: 38, alternativeMinutes: 24, currentSegmentIds: ['anna', 'inner-ring'], alternativeSegmentIds: ['cpr', 'inner-ring'], projectIds: [] });
    expect(selectCitizenContext(createCitySeed()).impacts).toEqual([]);
  });

  it('keeps drafts private and publishes approved closure context with a null current-route time', () => {
    const store = createCityStore(createCitySeed());
    const baseline = selectCitizenRoute(store.getSnapshot());
    const project = createProject(store);
    expect(project.status).toBe('Draft');
    expect(selectCitizenContext(store.getSnapshot()).impacts).toEqual([]);
    expect(selectCitizenRoute(store.getSnapshot())).toEqual(baseline);
    expect(selectCitizenAlerts(store.getSnapshot()).some(item => item.id.startsWith('project-'))).toBe(false);
    const approved = store.dispatch({ type: 'approveProject', projectId: project.id, actor: 'Admin' });
    expect(store.dispatch({ type: 'approveProject', projectId: project.id, actor: 'Admin' })).toBe(approved);
    const scenario = approved.scenarios[project.scenarioId];
    const impacts = selectCitizenContext(approved).impacts;
    expect(impacts).toHaveLength(scenario.affected.length);
    expect(impacts[0]).toMatchObject({ projectId: project.id, title: project.title, roadName: 'Anna Salai', restriction: 'Closed', startsAt: scenario.startsAt, endsAt: scenario.endsAt });
    expect(selectCitizenAlerts(approved).filter(item => item.id.startsWith(`project-${project.id}-`))).toHaveLength(impacts.length);
    const route = selectCitizenRoute(approved);
    expect(route.currentMinutes).toBeNull();
    const cprDelay = scenario.affected.find(item => item.roadSegmentId === 'cpr')!.delayMinutes;
    const ringDelay = scenario.affected.find(item => item.roadSegmentId === 'inner-ring')!.delayMinutes;
    expect(route.alternativeMinutes).toBe(Math.round(20 + cprDelay + (27 + ringDelay) * 4 / 27));
    expect(route.projectIds).toEqual([project.id]);
    expect(route.reason).toContain('Current route unavailable');
    expect(route.reason).toContain('Anna Salai');
    const cancelled = store.dispatch({ type: 'cancelProject', projectId: project.id });
    expect(store.dispatch({ type: 'cancelProject', projectId: project.id })).toBe(cancelled);
    expect(selectCitizenContext(store.getSnapshot()).impacts).toEqual([]);
    expect(selectCitizenRoute(store.getSnapshot())).toEqual(baseline);
    expect(selectCitizenAlerts(store.getSnapshot()).some(item => item.id.startsWith('project-'))).toBe(false);
    expectRejected(store, { type: 'approveProject', projectId: project.id, actor: 'Admin' }, /Only draft/);
  });

  it('hides approved future work, publishes at the start and expires exactly at the end', () => {
    const store = createCityStore(createCitySeed());
    const startsAt = '2026-09-06T18:55:00+05:30';
    const project = createProject(store, 'anna', startsAt);
    store.dispatch({ type: 'approveProject', projectId: project.id, actor: 'Admin' });
    const endsAt = store.getSnapshot().scenarios[project.scenarioId].endsAt;
    expect(selectCitizenContext(store.getSnapshot()).impacts).toEqual([]);
    expect(selectCitizenAlerts(store.getSnapshot()).some(item => item.id.startsWith('project-'))).toBe(false);
    expect(selectCitizenRoute(store.getSnapshot()).currentMinutes).toBe(38);
    store.dispatch({ type: 'setTime', now: startsAt });
    expect(selectCitizenContext(store.getSnapshot()).impacts.length).toBeGreaterThan(0);
    expect(selectCitizenRoute(store.getSnapshot()).currentMinutes).toBeNull();
    store.dispatch({ type: 'setTime', now: new Date(Date.parse(endsAt) - 1).toISOString() });
    expect(selectCitizenRoute(store.getSnapshot()).currentMinutes).toBeNull();
    store.dispatch({ type: 'setTime', now: endsAt });
    expect(selectCitizenContext(store.getSnapshot()).impacts).toEqual([]);
    expect(selectCitizenAlerts(store.getSnapshot()).some(item => item.id.startsWith('project-'))).toBe(false);
    expect(selectCitizenRoute(store.getSnapshot())).toMatchObject({ currentMinutes: 38, alternativeMinutes: 24, projectIds: [] });
  });

  it('does not approve expired drafts', () => {
    const store = createCityStore(createCitySeed());
    const project = createProject(store);
    store.dispatch({ type: 'setTime', now: store.getSnapshot().scenarios[project.scenarioId].endsAt });
    expectRejected(store, { type: 'approveProject', projectId: project.id, actor: 'Admin' }, /expired/);
    expect(selectCitizenContext(store.getSnapshot()).impacts).toEqual([]);
  });

  it('returns null for both journeys when approved works close their shared corridor', () => {
    const store = createCityStore(createCitySeed());
    const project = createProject(store, 'inner-ring');
    store.dispatch({ type: 'approveProject', projectId: project.id, actor: 'Admin' });
    const route = selectCitizenRoute(store.getSnapshot());
    expect(route).toMatchObject({ currentMinutes: null, alternativeMinutes: null, projectIds: [project.id] });
    expect(route.reason).toContain('Alternative route unavailable');
    expect(route.reason).not.toContain('lower estimated travel time');
  });

  it.each(['empty', 'missing', 'invalid fraction'] as const)('does not invent an alternative for %s route data during a closure', kind => {
    const state = createCitySeed();
    state.journey.alternative = kind === 'empty' ? [] : [{ roadSegmentId: kind === 'missing' ? 'unknown' : 'cpr', fraction: kind === 'invalid fraction' ? 1.5 : 1 }];
    const store = createCityStore(state);
    const project = createProject(store);
    store.dispatch({ type: 'approveProject', projectId: project.id, actor: 'Admin' });
    expect(selectCitizenRoute(store.getSnapshot())).toMatchObject({ currentMinutes: null, alternativeMinutes: null });
  });
});