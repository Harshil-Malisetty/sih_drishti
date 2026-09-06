import { describe, expect, it, vi } from 'vitest';
import { createCitySeed, DEMO_START } from '../src/data/demo/citySeed';
import { createCityStore, reduceCity } from '../src/domain/cityStore';
import { selectAssignment, selectCitizenContext, selectIssues } from '../src/domain/selectors';
import { expectIntegrity, expectRejected, municipalCases } from './helpers';

describe('deterministic normalized seed', () => {
  it('creates independent identical snapshots and keeps all references intact', () => {
    const first = createCitySeed();
    const second = createCitySeed();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.now).toBe(DEMO_START);
    expect(first.revision).toBe(0);
    expect(Object.values(first.issues).map(issue => issue.kind).sort()).toEqual(municipalCases.map(([kind]) => kind).sort());
    expectIntegrity(first);
    first.roadSegments.anna.points[0][0] = 0;
    first.issues['DEF-8292'].observations![0].detail = 'changed';
    first.watchlist['MAT-1028'].observations![0].location = 'changed';
    first.departments.stormwater.name = 'changed';
    first.teams['stormwater-team'].name = 'changed';
    expect(createCitySeed()).toEqual(second);
  });

  it('backs the already-closed pothole with a real assignment, resolution and verified review', () => {
    const state = createCitySeed();
    const issue = selectIssues(state).find(item => item.kind === 'pothole')!;
    expect(issue).toMatchObject({ status: 'Verified', workflowStage: 'Closed', currentCondition: 'Surface sealed and level' });
    const assignment = selectAssignment(state, { kind: 'municipal', id: issue.id })!;
    const resolution = Object.values(state.resolutions).find(item => item.assignmentId === assignment.id)!;
    expect(Object.values(state.reviews).find(item => item.resolutionId === resolution.id)?.decision).toBe('Verified');
    expect(selectCitizenContext(state).conditions.find(item => item.id === issue.id)).toMatchObject({ verified: true, condition: resolution.resultingCondition });
    expect(issue.observations!.at(-1)?.image).toBe(issue.image);
    expectRejected(createCityStore(state), { type: 'assign', event: assignment.event, teamId: assignment.teamId, assignee: 'Another supervisor' }, /Closed events/);
  });
});

describe('atomic immutable city store', () => {
  it('detaches the seed, deeply freezes snapshots and preserves every previous snapshot', () => {
    const seed = createCitySeed();
    const store = createCityStore(seed);
    const initial = store.getSnapshot();
    seed.issues['DEF-8292'].history[0].action = 'external mutation';
    seed.roadSegments.anna.points[0][0] = 0;
    expect(initial).toEqual(createCitySeed());
    expect(Object.isFrozen(initial)).toBe(true);
    expect(Object.isFrozen(initial.issues['DEF-8292'].history[0])).toBe(true);
    expect(Object.isFrozen(initial.roadSegments.anna.points[0])).toBe(true);
    expect(() => { initial.roadSegments.anna.points[0][0] = 0; }).toThrow(TypeError);
    const next = store.dispatch({ type: 'assign', event: { kind: 'municipal', id: 'DEF-8292' }, teamId: 'stormwater-team', assignee: 'Drainage lead' });
    expect(next).not.toBe(initial);
    expect(next.revision).toBe(1);
    expect(Date.parse(next.now) - Date.parse(initial.now)).toBe(1);
    expect(initial).toEqual(createCitySeed());
    expect(Object.isFrozen(next.assignments['ASN-0001'])).toBe(true);
  });

  it('notifies once after committing, skips failures/no-ops, unsubscribes and resets deterministically', () => {
    const store = createCityStore(createCitySeed());
    const initial = store.getSnapshot();
    const seen: number[] = [];
    const listener = vi.fn(() => seen.push(store.getSnapshot().revision));
    const unsubscribe = store.subscribe(listener);
    const assign = { type: 'assign', event: { kind: 'incident', id: 'INC-24088' }, teamId: 'central-response', assignee: 'Response lead' } as const;
    const changed = store.dispatch(assign);
    expect(seen).toEqual([1]);
    expect(store.dispatch(assign)).toBe(changed);
    expectRejected(store, { ...assign, teamId: 'stormwater-team' }, /responsible department/);
    expect(store.dispatch({ type: 'setTime', now: changed.now })).toBe(changed);
    expect(listener).toHaveBeenCalledTimes(1);
    store.reset();
    expect(store.getSnapshot()).toBe(initial);
    expect(seen).toEqual([1, 0]);
    unsubscribe();
    store.dispatch(assign);
    store.reset();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toEqual(createCitySeed());
  });

  it('keeps the pure reducer input unchanged on success and rejection', () => {
    const initial = createCitySeed();
    const copy = structuredClone(initial);
    const next = reduceCity(initial, { type: 'decideMatch', matchId: 'MAT-1028', decision: 'Verified' });
    expect(initial).toEqual(copy);
    expect(next.watchlist['MAT-1028'].status).toBe('Verified');
    next.watchlist['MAT-1028'].observations![0].location = 'changed';
    expect(initial).toEqual(copy);
    expect(() => reduceCity(initial, { type: 'assign', event: { kind: 'incident', id: 'missing' }, teamId: 'central-response', assignee: 'Lead' })).toThrow(/Unknown incident/);
    expect(initial).toEqual(copy);
  });

  it('rejects backwards/ambiguous clocks without changing state', () => {
    const store = createCityStore(createCitySeed());
    expectRejected(store, { type: 'setTime', now: '2026-09-04T00:00:00Z' }, /backwards/);
    expectRejected(store, { type: 'setTime', now: '2026-09-06T00:00:00' }, /ISO timestamp/);
  });
});