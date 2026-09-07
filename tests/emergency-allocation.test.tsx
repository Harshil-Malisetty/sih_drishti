import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore } from '../src/domain/cityStore';
import { allocateEmergencyStation, nearestPoliceStation } from '../src/domain/emergencyAllocation';
import { anchorCityHistory } from '../src/domain/time';
import { EmergencyDispatchPanel } from '../src/components/EmergencyDispatchPanel';
import { cityStore } from '../src/services/city';
import { emergencyService, municipalService } from '../src/services';
import { PoliceJurisdictionProvider } from '../src/services/PoliceJurisdiction';
import type { PoliceStation } from '../src/types/city';
import { expectIntegrity, expectRejected } from './helpers';

const incident = { kind: 'incident', id: 'INC-24091' } as const;
const municipal = { kind: 'municipal', id: 'DEF-8292' } as const;
const actor = 'Test operator';
const request = { type: 'requestEmergency', event: incident, reason: 'Emergency response activated', actor } as const;
const station = (id: string, latitude: number, longitude: number): PoliceStation => ({ id, name: `${id} Police Station`, latitude, longitude });

afterEach(() => cityStore.reset());

describe('nearest police station selection', () => {
  it('uses geographical distance, including longitude scaling, instead of directory order', () => {
    const north = station('north', 61, 0);
    const east = station('east', 60, 1);
    const allocation = nearestPoliceStation([north, east], { latitude: 60, longitude: 0 });
    expect(allocation.station.id).toBe('east');
    expect(allocation.distanceKm).toBeCloseTo(55.60, 1);
    expect(nearestPoliceStation([north, east], north)).toEqual({ station: north, distanceKm: 0 });
  });

  it('resolves equal-distance ties by stable station ID', () => {
    const a = station('a', 0, 1), b = station('b', 0, -1);
    const location = { latitude: 0, longitude: 0 };
    expect(nearestPoliceStation([b, a], location).station.id).toBe('a');
    expect(nearestPoliceStation([a, b], location).station.id).toBe('a');
  });

  it('rejects invalid event coordinates and skips invalid stations', () => {
    const valid = station('valid', 13, 80), invalid = station('invalid', NaN, 80);
    for (const point of [station('bad', 91, 80), station('bad', 13, 181), invalid, station('bad', 13, Infinity)]) {
      expect(() => nearestPoliceStation([valid], point)).toThrow(/valid emergency location/);
    }
    expect(nearestPoliceStation([invalid, valid], valid).station.id).toBe('valid');
    expect(() => nearestPoliceStation([invalid], valid)).toThrow(/not allocated/);
    expect(() => nearestPoliceStation([], valid)).toThrow(/not allocated/);
  });

  it.each([incident, municipal])('uses the $kind event position, not its source bus or corridor center', event => {
    const seed = createCitySeed();
    const record = event.kind === 'incident' ? seed.incidents[event.id] : seed.issues[event.id];
    record.latitude = 12.899; record.longitude = 80.2275;
    for (const bus of Object.values(seed.buses)) { bus.latitude = 13.0445; bus.longitude = 80.25; }
    expect(allocateEmergencyStation(seed, event)).toMatchObject({ station: { id: 'station-sholinganallur' }, distanceKm: 0 });
  });
});

describe('atomic automatic emergency allocation', () => {
  it('publishes only the allocated state and deduplicates repeated requests', () => {
    const store = createCityStore(createCitySeed());
    const before = store.getSnapshot();
    const notify = vi.fn(() => Object.values(store.getSnapshot().emergencyDispatches)[0].stage);
    store.subscribe(notify);
    const state = store.dispatch(request);
    const dispatch = Object.values(state.emergencyDispatches)[0];
    expect(dispatch).toMatchObject({ stage: 'Assigned', assignedAt: state.now, requestedAt: state.now });
    expect(dispatch.history).toHaveLength(2);
    expect(dispatch.history.every(item => item.at === state.now)).toBe(true);
    expect(state.revision).toBe(before.revision + 1);
    expect(state.assignments).toEqual(before.assignments);
    expect(state.incidents).toEqual(before.incidents);
    expect(notify.mock.results.map(result => result.value)).toEqual(['Assigned']);
    expect(store.dispatch(request)).toBe(state);
    expect(notify).toHaveBeenCalledTimes(1);
    expectIntegrity(state);
  });

  it('rolls back if no station or valid event location is available', () => {
    const seed = createCitySeed();
    seed.policeStations = {};
    expectRejected(createCityStore(seed), request, /not allocated/);
    const invalid = createCitySeed();
    invalid.incidents[incident.id].latitude = NaN;
    expectRejected(createCityStore(invalid), request, /valid emergency location/);
  });

  it('retains eligibility gates for unqualified, non-emergency and missing events', () => {
    const store = createCityStore(createCitySeed());
    for (const event of [municipal, { kind: 'incident', id: 'missing' }, { kind: 'incident', id: 'INC-24088' }, { kind: 'anomaly', id: 'ANOM-ANNA-1' }] as const) {
      expectRejected(store, { ...request, event }, /does not qualify/);
    }
  });

  it('returns detached station receipts for concurrent requests across operators', async () => {
    const listener = vi.fn();
    const unsubscribe = cityStore.subscribe(listener);
    try {
      const [first, second] = await Promise.all([
        emergencyService.request(incident, request.reason, 'Police operator'),
        emergencyService.request(incident, request.reason, 'Municipal admin'),
      ]);
      expect(first).toEqual(second);
      expect(first.station.id).toBe(first.dispatch.stationId);
      expect(listener).toHaveBeenCalledTimes(1);
      first.station.name = 'Changed receipt'; first.dispatch.reason = 'Changed receipt';
      expect(cityStore.getSnapshot().policeStations[second.station.id].name).toBe(second.station.name);
      expect(cityStore.getSnapshot().emergencyDispatches[second.dispatch.id].reason).toBe(second.dispatch.reason);
    } finally { unsubscribe(); }
  });

  it('reanchors allocation timestamps together with request and audit timestamps', () => {
    const store = createCityStore(createCitySeed());
    const original = store.dispatch(request);
    const anchored = anchorCityHistory(original, '2026-10-01T10:00:00Z');
    const dispatch = Object.values(anchored.emergencyDispatches)[0];
    expect(Date.parse(dispatch.assignedAt)).toBe(Date.parse(anchored.now));
    expect(dispatch.assignedAt).toBe(dispatch.requestedAt);
    expect(dispatch.history.every(item => item.at === dispatch.assignedAt)).toBe(true);
    expectIntegrity(anchored);
  });
});

describe('shared emergency response presentation', () => {
  it.each([incident, municipal])('replaces manual $kind dispatch with one action and a persistent station receipt', async event => {
    if (event.kind === 'municipal') await municipalService.qualify(event.id, actor);
    const render = () => renderToStaticMarkup(<PoliceJurisdictionProvider initialJurisdiction="omr"><EmergencyDispatchPanel event={event} actor={actor}/></PoliceJurisdictionProvider>);
    const before = render();
    expect(before).toContain('Activate emergency response');
    expect(before).not.toMatch(/<select|<textarea|Assign emergency team|Dispatch emergency team/);
    const allocation = await emergencyService.request(event, request.reason, actor);
    const after = render();
    expect(after).toContain(`Emergency team automatically allocated from ${allocation.station.name}`);
    expect(after).toContain('approximate straight-line distance');
    expect(after).toContain('No real emergency services are contacted');
    expect(after).not.toMatch(/<select|Activate emergency response|Assign emergency team/);
    expect(after).toContain('Mark emergency team en route');
    expect(after).not.toContain('Mark emergency team on scene');
  });

  it('does not show an emergency button for ineligible events', () => {
    expect(renderToStaticMarkup(<EmergencyDispatchPanel event={municipal} actor={actor}/>)).toBe('');
  });
});