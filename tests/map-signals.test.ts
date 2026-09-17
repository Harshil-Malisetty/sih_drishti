import { describe, expect, it } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore } from '../src/domain/cityStore';
import { defaultHeatFilters, policeHeatCategory, rankHotspots, selectHeatSignals } from '../src/domain/mapSignals';
import { busPosition, createBusTrack } from '../src/domain/busPlayback';
import { distanceKm, distanceToRoute } from '../src/domain/citizenJourney';
import { beginMunicipalWork, resolutionCommand } from './helpers';

describe('store-derived map signals', () => {
  it('uses distinct incident records, respects area ownership and does not invent hit-and-run events', () => {
    const state = createCitySeed();
    expect(selectHeatSignals(state, 'police', defaultHeatFilters)).toHaveLength(2);
    expect(selectHeatSignals(state, 'police', defaultHeatFilters, 'central').map(point => point.id)).toEqual(['INC-24091']);
    expect(selectHeatSignals(state, 'police', defaultHeatFilters, 'guindy').map(point => point.id)).toEqual(['INC-24088']);
    expect(selectHeatSignals(state, 'police', defaultHeatFilters, 'omr')).toEqual([]);
    expect(selectHeatSignals(state, 'police', { ...defaultHeatFilters, category: 'hit-and-run' })).toEqual([]);
  });

  it.each([
    ['Suspected hit-and-run', 'hit-and-run'], ['Hit & run report', 'hit-and-run'],
    ['Potential collision observation', 'collision'], ['Potential rash-driving event', 'rash-driving'],
    ['Reported traffic obstruction', 'obstruction'], ['Other observation', 'other'],
  ])('classifies %s as %s without interpreting watchlist sightings as incidents', (title, category) => {
    expect(policeHeatCategory(title)).toBe(category);
  });

  it('excludes repaired potholes by default but keeps them in historical heat', () => {
    const state = createCitySeed();
    expect(selectHeatSignals(state, 'municipal', defaultHeatFilters)).toHaveLength(6);
    expect(selectHeatSignals(state, 'municipal', { ...defaultHeatFilters, category: 'pothole' })).toEqual([]);
    const history = selectHeatSignals(state, 'municipal', { ...defaultHeatFilters, category: 'pothole', history: true });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ id: 'DEF-8301', active: false, detections: 14, weight: 1 });
  });

  it('distinguishes repeated observations from unique issues and caps weights', () => {
    const state = createCitySeed();
    const filters = { ...defaultHeatFilters, category: 'waterlogging', metric: 'observations' as const };
    const points = selectHeatSignals(state, 'municipal', filters);
    expect(points).toHaveLength(1);
    expect(points[0].weight).toBeCloseTo(1 + Math.log2(9));
    expect(rankHotspots(points)[0]).toMatchObject({ detections: 9, points: [points[0]] });
    state.issues['DEF-8292'].detectionCount = 1_000_000;
    expect(selectHeatSignals(state, 'municipal', filters)[0].weight).toBe(8);
  });

  it('filters canonical timestamps, ignores future observations and rejects invalid coordinates', () => {
    const state = createCitySeed();
    const incident = state.incidents['INC-24091'];
    incident.observedAt = new Date(Date.parse(state.now) - 10 * 86_400_000).toISOString();
    expect(selectHeatSignals(state, 'police', { ...defaultHeatFilters, period: '7' }, 'central')).toEqual([]);
    expect(selectHeatSignals(state, 'police', { ...defaultHeatFilters, period: '30' }, 'central')).toHaveLength(1);
    incident.observedAt = new Date(Date.parse(state.now) + 1000).toISOString();
    expect(selectHeatSignals(state, 'police', defaultHeatFilters, 'central')).toEqual([]);
    incident.observedAt = state.now; incident.latitude = NaN;
    expect(selectHeatSignals(state, 'police', defaultHeatFilters, 'central')).toEqual([]);
  });

  it('uses case locations rather than source-bus positions and never mutates the store', () => {
    const store = createCityStore(createCitySeed());
    const before = structuredClone(store.getSnapshot());
    const points = selectHeatSignals(store.getSnapshot(), 'police', defaultHeatFilters);
    expect(store.getSnapshot()).toEqual(before);
    before.buses['MTC-2147'].latitude = 10;
    expect(selectHeatSignals(before, 'police', defaultHeatFilters)).toEqual(points);
  });

  it('updates synchronously on accepted reports, never double counts intake or invents detections', () => {
    const store = createCityStore(createCitySeed());
    const read = () => selectHeatSignals(store.getSnapshot(), 'municipal', { ...defaultHeatFilters, category: 'pothole', metric: 'observations' });
    store.dispatch({ type: 'submitCitizenReport', input: { roadSegmentId: 'anna', category: 'pothole', description: 'Pothole at the bus stop' } });
    expect(read()).toEqual([]);
    const report = Object.values(store.getSnapshot().citizenReports).at(-1)!;
    store.dispatch({ type: 'reviewCitizenReport', reportId: report.id, decision: 'Accepted', note: 'Inspect the reported defect', reviewerRole: 'municipal' });
    expect(read()).toHaveLength(1);
    expect(read()[0]).toMatchObject({ detections: 0, weight: 1, category: 'pothole' });
    store.reset();
    expect(read()).toEqual([]);
  });

  it('keeps pending field repairs in active heat, removes verified repairs and retains history', () => {
    const store = createCityStore(createCitySeed());
    const event = { kind: 'municipal', id: 'DEF-8292' } as const;
    const read = (history = false) => selectHeatSignals(store.getSnapshot(), 'municipal', { ...defaultHeatFilters, category: 'waterlogging', history });
    beginMunicipalWork(store);
    store.dispatch(resolutionCommand(store, event));
    expect(read()).toHaveLength(1);
    const reviewId = Object.values(store.getSnapshot().reviews).at(-1)!.id;
    store.dispatch({ type: 'reviewResolution', reviewId, decision: 'Verified', reviewer: 'Admin', note: 'Dry road confirmed' });
    expect(read()).toEqual([]);
    expect(read(true)).toHaveLength(1);
    store.dispatch({ type: 'closeIssue', issueId: event.id, actor: 'Admin' });
    expect(read()).toEqual([]);
    expect(read(true)).toHaveLength(1);
  });
});

describe('truthful bus playback', () => {
  it('moves along local saved road geometry without changing canonical observations', () => {
    const state = createCitySeed(), bus = state.buses['MTC-2014'];
    const before = structuredClone(bus), track = createBusTrack(bus);
    const first = busPosition(track, 0), later = busPosition(track, 20);
    expect(later.playback).toBe(true);
    expect(distanceKm([first.latitude, first.longitude], [later.latitude, later.longitude])).toBeGreaterThan(.01);
    expect(distanceToRoute([later.latitude, later.longitude], track.points)).toBeLessThan(.0001);
    expect(later.observedAt).toBe(bus.observedAt);
    expect(Number.isFinite(later.heading)).toBe(true);
    expect(bus).toEqual(before);
  });

  it('retains uncovered buses as static snapshots instead of inventing routes', () => {
    const bus = createCitySeed().buses['MTC-1830'];
    expect(busPosition(createBusTrack(bus), 300)).toMatchObject({ ...bus, playback: false });
  });

  it('preserves every bus identity, including colocated buses', () => {
    const buses = Object.values(createCitySeed().buses);
    const positions = buses.map(bus => busPosition(createBusTrack(bus), 120));
    expect(new Set(positions.map(bus => bus.id)).size).toBe(13);
    expect(positions.filter(bus => bus.status === 'Sensing')).toHaveLength(10);
  });

  it('has bounded continuous movement at playback reversals, not loop teleports', () => {
    const track = createBusTrack(createCitySeed().buses['MTC-2014']);
    let last = busPosition(track, 0);
    for (let seconds = 1; seconds <= 400; seconds++) {
      const next = busPosition(track, seconds);
      expect(distanceKm([last.latitude, last.longitude], [next.latitude, next.longitude])).toBeLessThan(.009);
      last = next;
    }
  });
});