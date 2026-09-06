import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCitySeed, DEMO_START } from '../src/data/demo/citySeed';
import { createCityStore, reduceCity } from '../src/domain/cityStore';
import { anchorCityHistory, demoDate, formatDemoDate, formatDemoTimestamp, timestampMillis } from '../src/domain/time';
import { selectCitizenAlerts, selectCitizenContext, selectIssues, selectPoliceSummary, selectPublicProjects, selectWatchlist } from '../src/domain/selectors';
import { selectMunicipalTasks } from '../src/domain/operations';
import type { CityState } from '../src/types/city';
import { beginMunicipalWork, expectIntegrity, expectRejected, resolutionCommand } from './helpers';

const entry = '2031-01-01T00:00:00.123+05:30';
const assign = { type: 'assign', event: { kind: 'incident', id: 'INC-24088' }, teamId: 'central-response', assignee: 'Demo officer' } as const;

// Include legacy text-only timestamps as well as canonical history, but NOT planned windows.
function historyTimes(state: CityState): Record<string, number> {
  const result: Record<string, number> = {};
  const visit = (value: unknown, path = '') => {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      const name = `${path}.${key}`;
      if (typeof item === 'string' && /^(now|at|.*At|firstSeen|lastSeen|markedRepaired|nextObservation|timestamp)$/.test(key)
        && !['startsAt', 'endsAt'].includes(key)) result[name] = timestampMillis(demoDate(item));
      else visit(item, name);
    }
  };
  // Traffic.timestamp is intentionally time-only display; observedAt is its authority.
  const copy = structuredClone(state);
  for (const item of Object.values(copy.trafficObservations)) item.timestamp = item.observedAt;
  visit(copy);
  return result;
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('session-anchored historical fixtures', () => {
  it.each(['2032-09-01T18:42:17.123+05:30', '2024-02-29T00:00:00Z'])('round-trips text-only timestamps without losing year or milliseconds: %s', iso => {
    expect(timestampMillis(demoDate(formatDemoTimestamp(iso)))).toBe(timestampMillis(iso));
  });

  it.each([entry, '2024-03-01T00:02:00.987Z', '2020-01-01T00:00:00Z', '2033-12-31T23:59:59.999-08:00'])('translates every historical field with one duration-preserving offset at %s', anchor => {
    const original = createCitySeed();
    const seed = createCitySeed(anchor);
    const before = historyTimes(original);
    const after = historyTimes(seed);
    const delta = timestampMillis(anchor) - timestampMillis(DEMO_START);
    expect(Object.keys(after)).toEqual(Object.keys(before));
    for (const [path, time] of Object.entries(after)) {
      expect(time, path).toBe(before[path] + delta);
      expect(time, path).toBeLessThanOrEqual(timestampMillis(anchor));
    }
    expect(createCitySeed()).toEqual(original);
    expectIntegrity(seed);
    expect(seed.now).toBe(anchor);
    // Parent-day parsing, not the fixture's default September 5 for an incident on September 1.
    const incident = seed.incidents['INC-24091'];
    const stages = incident.track!.stages;
    expect(timestampMillis(demoDate(stages.at(-1)!.timestamp))).toBe(timestampMillis(incident.observedAt));
    expect(timestampMillis(demoDate(stages.at(-1)!.timestamp)) - timestampMillis(demoDate(stages[0].timestamp))).toBe(8000);
  });

  it('keeps canonical times and legacy projections consistent for all roles across a year boundary', () => {
    const state = createCitySeed(entry);
    for (const projected of selectIssues(state)) {
      const source = state.issues[projected.id];
      expect(projected.firstSeen).toBe(formatDemoDate(source.firstSeen));
      expect(projected.lastSeen).toBe(formatDemoDate(source.lastSeen));
      for (const observation of projected.observations || []) expect(observation.date).toBe(formatDemoDate(observation.observedAt!));
      if (source.repair) {
        expect(projected.repair!.markedRepaired).toBe(formatDemoDate(source.repair.markedRepaired));
        expect(projected.repair!.nextObservation).toBe(formatDemoDate(source.repair.nextObservation));
      }
    }
    for (const projected of selectWatchlist(state)) {
      const source = state.watchlist[projected.id];
      expect(projected.timestamp).toBe(formatDemoTimestamp(source.observations!.at(-1)!.timestamp));
      projected.observations!.forEach((observation, index) => {
        expect(observation.timestamp).toBe(formatDemoTimestamp(source.observations![index].timestamp));
      });
    }
    const context = selectCitizenContext(state);
    for (const condition of context.conditions) expect(timestampMillis(condition.updatedAt)).toBeLessThanOrEqual(timestampMillis(entry));
    expect(context.conditions.find(item => item.id === 'DEF-8292')!.updatedAt).toBe(state.issues['DEF-8292'].lastSeen);
    expect(selectPoliceSummary(state).activity.length).toBe(selectPoliceSummary(createCitySeed()).activity.length);
    expect(selectCitizenAlerts(state).map(item => item.timeAgo)).toEqual(selectCitizenAlerts(createCitySeed()).map(item => item.timeAgo));
    for (const task of selectMunicipalTasks(state)) expect(timestampMillis(task.at)).toBeLessThanOrEqual(timestampMillis(entry));
  });

  it('leaves planned future start/end instants and durations untouched', () => {
    const store = createCityStore(createCitySeed(entry));
    store.dispatch({ type: 'createScenario', roadSegmentId: 'anna', duration: '3 days', startsAt: '2031-02-01T00:00:00Z' });
    const project = Object.values(store.getSnapshot().projects)[0];
    store.dispatch({ type: 'approveProject', projectId: project.id, actor: 'Demo admin' });
    const before = store.getSnapshot();
    const shifted = anchorCityHistory(before, '2031-01-02T00:00:00Z');
    const scenario = Object.values(shifted.scenarios)[0];
    expect(scenario.startsAt).toBe(before.scenarios[scenario.id].startsAt);
    expect(scenario.endsAt).toBe(before.scenarios[scenario.id].endsAt);
    expect(timestampMillis(scenario.endsAt) - timestampMillis(scenario.startsAt)).toBe(3 * 86_400_000);
    expect(selectPublicProjects(shifted)[0].status).toBe('Planned');
    expect(selectCitizenContext(shifted).impacts).toEqual([]);
  });
});

describe('browser entry and command clocks', () => {
  it('waits for explicit login, then shares one anchored snapshot across role switches and repeated entry', () => {
    let now = entry;
    const store = createCityStore(createCitySeed(), { clock: () => now });
    const landing = store.getSnapshot();
    expect(landing.now).toBe(DEMO_START);
    const listener = vi.fn();
    store.subscribe(listener);
    const entered = store.startBrowserSession();
    expect(entered).toEqual(createCitySeed(entry));
    expect(listener).toHaveBeenCalledTimes(1);
    store.dispatch(assign);
    const changed = store.getSnapshot();
    now = '2031-01-02T09:00:00Z';
    expect(store.startBrowserSession()).toBe(changed);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(changed.incidents[assign.event.id].status).toBe('Investigating');
    expect(landing.now).toBe(DEMO_START);
    // Explicit reset remains available for the demo lab, but role entry never calls it.
    store.reset();
    expect(store.getSnapshot()).toBe(entered);
    expect(store.startBrowserSession()).toBe(entered);
  });

  it('anchors a fresh restored-role startup at entry, not service import or the previous login', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-12-30T00:00:00Z'));
    vi.resetModules();
    const { cityStore } = await import('../src/services/city');
    expect(cityStore.getSnapshot().now).toBe(DEMO_START);
    vi.setSystemTime(new Date(entry));
    // The restored-role initializer must call this before rendering workspace children.
    expect(cityStore.startBrowserSession()).toEqual(createCitySeed(new Date(entry).toISOString()));
    vi.setSystemTime(new Date('2031-01-01T12:00:00Z'));
    cityStore.dispatch(assign);
    expect(Object.values(cityStore.getSnapshot().assignments).at(-1)!.assignedAt).toBe('2031-01-01T12:00:00.000Z');
  });

  it('never resets or re-dates existing operations if an entry hook is called late', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch(assign);
    const before = store.getSnapshot();
    const after = store.startBrowserSession(entry);
    expect(after.revision).toBe(before.revision);
    expect(after.assignments).toEqual(before.assignments);
    expect(after.incidents).toEqual(before.incidents);
    expect(after.now).toBe(new Date(entry).toISOString());
  });

  it('uses elapsed wall time, a minimal monotonic tie-break, and does not commit failed/no-op timestamps', () => {
    let now = entry;
    const store = createCityStore(createCitySeed(entry), { clock: () => now });
    now = '2031-01-01T09:12:34.456Z';
    const first = store.dispatch(assign);
    expect(first.now).toBe(now);
    expect(first.assignments['ASN-0001'].assignedAt).toBe(now);
    now = '2031-01-01T10:00:00Z';
    expect(store.dispatch(assign)).toBe(first);
    expectRejected(store, { ...assign, teamId: 'missing' });
    now = first.now;
    const second = store.dispatch({ ...assign, assignee: 'Another officer' });
    expect(timestampMillis(second.now) - timestampMillis(first.now)).toBe(1);
    now = entry; // A backwards browser clock must not reverse domain chronology.
    const third = store.dispatch({ ...assign, assignee: 'Third officer' });
    expect(timestampMillis(third.now) - timestampMillis(second.now)).toBe(1);
    expectIntegrity(third);
  });

  it('supports frozen-clock traffic triggers and repeated strictly newer follow-ups through verification', () => {
    const store = createCityStore(createCitySeed(entry), { clock: () => entry });
    const trigger = { ...store.getSnapshot().trafficObservations['TR-2'], id: 'TR-QUICK', observedAt: entry, vehicleCount: 600 };
    store.dispatch({ type: 'recordTraffic', observation: trigger });
    const anomalyId = Object.values(store.getSnapshot().anomalies).at(-1)!.id;
    const event = { kind: 'anomaly', id: anomalyId } as const;
    store.dispatch({ type: 'qualifyAnomaly', anomalyId, actor: 'Demo officer' });
    store.dispatch({ type: 'requestDispatch', anomalyId, actor: 'Demo officer' });
    const dispatchId = Object.values(store.getSnapshot().dispatches).at(-1)!.id;
    store.dispatch({ type: 'assign', event, teamId: 'central-response', assignee: 'Demo officer' });
    store.dispatch({ type: 'advanceDispatch', dispatchId, stage: 'En route', actor: 'Demo officer' });
    store.dispatch({ type: 'advanceDispatch', dispatchId, stage: 'On scene', actor: 'Demo officer' });
    let previous = timestampMillis(trigger.observedAt);
    for (let index = 0; index < 20; index++) {
      store.dispatch({ type: 'observeRecovery', anomalyId, actor: 'Demo officer' });
      const followUp = Object.values(store.getSnapshot().trafficObservations).at(-1)!;
      expect(timestampMillis(followUp.observedAt)).toBeGreaterThan(previous);
      expect(followUp.observedAt).toBe(store.getSnapshot().now);
      previous = timestampMillis(followUp.observedAt);
    }
    store.dispatch(resolutionCommand(store, event));
    const reviewId = Object.values(store.getSnapshot().reviews).at(-1)!.id;
    store.dispatch({ type: 'reviewResolution', reviewId, decision: 'Verified', reviewer: 'Demo admin', note: 'Follow-up confirmed' });
    expect(store.getSnapshot().reviews[reviewId].decision).toBe('Verified');
    expect(timestampMillis(store.getSnapshot().now) - timestampMillis(entry)).toBeLessThan(100);
    expectIntegrity(store.getSnapshot());
  });

  it('keeps pure/default clocks deterministic and explicit start-now schedules valid', () => {
    const seed = createCitySeed();
    expect(reduceCity(seed, assign)).toEqual(reduceCity(seed, assign));
    let now = entry;
    const store = createCityStore(createCitySeed(entry), { clock: () => now });
    now = '2031-01-02T10:00:00Z';
    store.dispatch({ type: 'createScenario', roadSegmentId: 'anna', duration: '3 days' });
    const first = Object.values(store.getSnapshot().scenarios)[0];
    expect(first.startsAt).toBe(store.getSnapshot().now);
    expect(first.createdAt).toBe(store.getSnapshot().now);
    const startsAt = store.getSnapshot().now;
    store.dispatch({ type: 'createScenario', roadSegmentId: 'anna', duration: '3 days', startsAt });
    expect(Object.values(store.getSnapshot().scenarios).at(-1)!.startsAt).toBe(startsAt);
  });

  it.each(['not a date', '2031-01-01T00:00:00', '2031-02-30T00:00:00Z', '2031-01-01T24:00:00Z'])('rejects invalid anchor/clock/evidence timestamps atomically: %s', invalid => {
    expect(() => createCitySeed(invalid)).toThrow(/ISO timestamp/);
    const store = createCityStore(createCitySeed());
    const before = store.getSnapshot();
    expect(() => store.startBrowserSession(invalid)).toThrow(/ISO timestamp/);
    expect(store.getSnapshot()).toBe(before);
    expectRejected(store, { type: 'setTime', now: invalid }, /ISO timestamp/);
    const invalidClock = createCityStore(createCitySeed(), { clock: () => invalid });
    expectRejected(invalidClock, assign, /ISO timestamp/);
    beginMunicipalWork(store);
    const resolution = resolutionCommand(store, { kind: 'municipal', id: 'DEF-8292' });
    resolution.evidence[0].capturedAt = invalid;
    expectRejected(store, resolution, /ISO timestamp/);
  });

  it('still rejects future traffic and resolution evidence, with no one-minute acceptance window', () => {
    const store = createCityStore(createCitySeed(entry), { clock: () => entry });
    const future = new Date(timestampMillis(entry) + 30_000).toISOString();
    expectRejected(store, { type: 'recordTraffic', observation: { ...store.getSnapshot().trafficObservations['TR-1'], id: 'FUTURE', observedAt: future } }, /future/);
    beginMunicipalWork(store);
    const resolution = resolutionCommand(store, { kind: 'municipal', id: 'DEF-8292' });
    resolution.evidence[0].capturedAt = future;
    expectRejected(store, resolution, /future/);
  });
});