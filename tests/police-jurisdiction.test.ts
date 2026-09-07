import { describe, expect, it } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore } from '../src/domain/cityStore';
import { eventInJurisdiction, isPoliceJurisdictionId, jurisdictionForSegment, matchInJurisdiction, policeJurisdictions, segmentInJurisdiction } from '../src/domain/policeJurisdictions';
import { selectPoliceSummary, selectWatchlist } from '../src/domain/selectors';
import { selectPoliceScope } from '../src/services/PoliceJurisdiction';

describe('police jurisdiction ownership', () => {
  it('assigns every seeded corridor exactly once and explicitly locates historical sightings', () => {
    const state = createCitySeed();
    const ids = policeJurisdictions.flatMap(area => [...area.segments]);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(state.roadSegments).sort());
    for (const match of Object.values(state.watchlist)) for (const observation of match.observations || []) {
      expect(state.roadSegments[observation.roadSegmentId!]).toBeDefined();
      expect(jurisdictionForSegment(observation.roadSegmentId)).toBeDefined();
    }
  });

  it('validates stored choices and never guesses ownership for an unmapped sighting', () => {
    expect(isPoliceJurisdictionId('all')).toBe(true);
    expect(isPoliceJurisdictionId('guindy')).toBe(true);
    for (const value of [null, '', 'north', '__proto__']) expect(isPoliceJurisdictionId(value)).toBe(false);
    expect(segmentInJurisdiction(undefined, 'guindy')).toBe(false);
    expect(segmentInJurisdiction('missing', 'all')).toBe(true);
    const match = createCitySeed().watchlist['MAT-1028'];
    delete match.observations!.at(-1)!.roadSegmentId;
    expect(matchInJurisdiction(match, 'guindy')).toBe(false);
    expect(matchInJurisdiction(match, 'all')).toBe(true);
  });

  it.each([
    ['central', ['INC-24091'], 2, 1, 0, 428],
    ['guindy', ['INC-24088', 'INC-24071'], 2, 1, 1, 507],
    ['velachery', [], 3, 0, 1, 162],
    ['adyar', [], 2, 0, 0, 420],
    ['omr', [], 1, 0, 0, 0],
  ] as const)('scopes %s records and metrics consistently', (id, incidents, buses, active, matches, vehicles) => {
    const state = createCitySeed();
    const scope = selectPoliceScope(state, id);
    expect(scope.incidents.map(item => item.id)).toEqual(incidents);
    expect(scope.buses.filter(item => item.status === 'Sensing')).toHaveLength(buses);
    expect(scope.policeSummary).toMatchObject({ activeIncidents: active, reportingBuses: buses, possibleMatches: matches, vehiclesObserved: vehicles });
    expect(scope.anomalies).toHaveLength(id === 'central' ? 1 : 0);
    expect(scope.citizenReports).toEqual([]);
  });

  it('retains citywide compatibility and never mutates records or the store clock', () => {
    const store = createCityStore(createCitySeed());
    const before = store.getSnapshot(), clone = structuredClone(before);
    const all = selectPoliceScope(before, 'all');
    expect(all.incidents).toEqual(Object.values(before.incidents));
    expect(all.buses).toEqual(Object.values(before.buses));
    expect(all.policeSummary).toEqual(selectPoliceSummary(before));
    for (const area of policeJurisdictions) selectPoliceScope(before, area.id);
    expect(store.getSnapshot()).toBe(before);
    expect(before).toEqual(clone);
  });

  it('uses the latest sighting, not the current source bus location, and preserves the complete trail', () => {
    const state = createCitySeed();
    state.buses['MTC-2014'].roadSegmentId = 'anna';
    const matches = selectWatchlist(state);
    expect(matches.filter(item => matchInJurisdiction(item, 'central'))).toHaveLength(0);
    const guindy = matches.filter(item => matchInJurisdiction(item, 'guindy'));
    expect(guindy.map(item => item.id)).toEqual(['MAT-1028']);
    expect(guindy[0].observations).toHaveLength(3);
    expect(jurisdictionForSegment(guindy[0].observations![0].roadSegmentId)?.id).toBe('central');
    expect(selectPoliceSummary(state, 'guindy').activity.some(item => item.detail.includes('T. Nagar'))).toBe(false);
  });

  it('keeps response activity attached to the event corridor, not the team name', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch({ type: 'assign', event: { kind: 'incident', id: 'INC-24088' }, teamId: 'central-response', assignee: 'Officer Guindy' });
    const state = store.getSnapshot();
    expect(selectPoliceSummary(state, 'guindy').activity.some(item => item.detail.includes('Officer Guindy'))).toBe(true);
    expect(selectPoliceSummary(state, 'central').activity.some(item => item.detail.includes('Officer Guindy'))).toBe(false);
    expect(eventInJurisdiction(state, { kind: 'incident', id: 'missing' }, 'guindy')).toBe(false);
    expect(Object.values(state.teams)).toHaveLength(Object.values(createCitySeed().teams).length);
  });

  it('inherits scope for new citizen reports and their linked incidents without mixing recipients', () => {
    const store = createCityStore(createCitySeed());
    for (const [roadSegmentId, category] of [['velachery', 'traffic-obstruction'], ['anna', 'traffic-obstruction'], ['velachery', 'pothole']] as const) {
      store.dispatch({ type: 'submitCitizenReport', input: { roadSegmentId, category, description: 'Assess the obstruction beside the bus stop.' } });
    }
    const report = selectPoliceScope(store.getSnapshot(), 'velachery').citizenReports[0];
    expect(selectPoliceScope(store.getSnapshot(), 'velachery').citizenReports).toHaveLength(1);
    expect(selectPoliceScope(store.getSnapshot(), 'central').citizenReports).toHaveLength(1);
    expect(selectPoliceScope(store.getSnapshot(), 'guindy').citizenReports).toHaveLength(0);
    store.dispatch({ type: 'reviewCitizenReport', reportId: report.id, decision: 'Accepted', note: 'Field assessment required', reviewerRole: 'police' });
    const local = selectPoliceScope(store.getSnapshot(), 'velachery');
    expect(local.incidents).toHaveLength(1);
    expect(local.incidents[0].citizenReportId).toBe(report.id);
    expect(local.policeSummary.activeIncidents).toBe(1);
    expect(selectPoliceScope(store.getSnapshot(), 'central').incidents.some(item => item.citizenReportId === report.id)).toBe(false);
  });

  it('scopes new anomalies and uses only the newest traffic window in that corridor', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch({ type: 'setTime', now: new Date(Date.parse(store.getSnapshot().now) + 1000).toISOString() });
    const before = selectPoliceSummary(store.getSnapshot(), 'central');
    const observation = { ...store.getSnapshot().trafficObservations['TR-velachery'], id: 'LOCAL-TRAFFIC', vehicleCount: 500, observedAt: store.getSnapshot().now };
    store.dispatch({ type: 'recordTraffic', observation });
    const state = store.getSnapshot();
    expect(selectPoliceScope(state, 'velachery').anomalies).toHaveLength(1);
    expect(selectPoliceScope(state, 'velachery').policeSummary.vehiclesObserved).toBe(500);
    expect(selectPoliceSummary(state, 'central')).toEqual(before);
  });

  it('updates local possible-match counts after an officer decision without dropping history', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch({ type: 'decideMatch', matchId: 'MAT-1028', decision: 'Verified' });
    const state = store.getSnapshot();
    expect(selectPoliceSummary(state, 'guindy').possibleMatches).toBe(0);
    expect(selectPoliceSummary(state, 'velachery').possibleMatches).toBe(1);
    expect(selectWatchlist(state).find(item => item.id === 'MAT-1028')?.observations).toHaveLength(3);
  });
});