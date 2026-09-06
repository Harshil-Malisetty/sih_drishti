import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCitySeed } from '../src/data/demo/citySeed';
import { createCityStore, reduceCity, type CityCommand } from '../src/domain/cityStore';
import { selectAssignment, selectCitizenContext } from '../src/domain/selectors';
import { cityStore } from '../src/services/city';
import { citizenService, demoService, emergencyService, municipalService, policeTrafficService, workflowService } from '../src/services';
import type { EventRef } from '../src/types/city';
import { expectIntegrity, municipalCases, openMunicipalSeed, resolutionCommand } from './helpers';

const municipal = { kind: 'municipal', id: 'DEF-8292' } as const;
const police = { kind: 'anomaly', id: 'ANOM-ANNA-1' } as const;
const actor = 'Reviewing admin';
const assignee = 'Field lead';
const municipalCommands: CityCommand[] = [
  { type: 'qualifyIssue', issueId: municipal.id, actor },
  { type: 'assign', event: municipal, teamId: 'stormwater-team', assignee },
  { type: 'acknowledge', issueId: municipal.id },
  { type: 'startFieldWork', issueId: municipal.id },
];

beforeEach(() => demoService.reset());
afterEach(() => { vi.restoreAllMocks(); demoService.reset(); });

async function committed<T>(operation: () => Promise<T>, steps: number): Promise<T> {
  const before = cityStore.getSnapshot();
  const listener = vi.fn(() => cityStore.getSnapshot());
  const unsubscribe = cityStore.subscribe(listener);
  try {
    const result = await operation();
    expect(cityStore.getSnapshot().revision).toBe(before.revision + steps);
    expect(listener).toHaveBeenCalledTimes(steps ? 1 : 0);
    if (steps) expect(listener.mock.results[0].value).toBe(cityStore.getSnapshot());
    else expect(cityStore.getSnapshot()).toBe(before);
    return result;
  } finally { unsubscribe(); }
}

async function rejected(operation: () => Promise<unknown>, message: RegExp) {
  const before = cityStore.getSnapshot();
  const contents = structuredClone(before);
  const listener = vi.fn();
  const unsubscribe = cityStore.subscribe(listener);
  try {
    let result: Promise<unknown> | undefined;
    expect(() => { result = operation(); }).not.toThrow();
    expect(result).toBeInstanceOf(Promise);
    await expect(result).rejects.toThrow(message);
    expect(cityStore.getSnapshot()).toBe(before);
    expect(cityStore.getSnapshot()).toEqual(contents);
    expect(listener).not.toHaveBeenCalled();
  } finally { unsubscribe(); }
}

const dispatchFor = () => Object.values(cityStore.getSnapshot().dispatches).find(item => item.anomalyId === police.id)!;
const lastReview = () => Object.values(cityStore.getSnapshot().reviews).at(-1)!;
async function startMunicipal() {
  await municipalService.confirmAndAssign(municipal.id, 'stormwater-team', assignee, actor);
  await municipalService.acceptAndStart(municipal.id);
}
async function policeOnScene() {
  await policeTrafficService.confirmAndAssign(police.id, 'central-response', assignee, actor);
  await policeTrafficService.advanceDispatch(dispatchFor().id, 'En route', assignee);
  await policeTrafficService.advanceDispatch(dispatchFor().id, 'On scene', assignee);
}

describe('atomic store batches', () => {
  it.each(['default', 'frozen', 'elapsed', 'backwards'] as const)('matches successive pure reducers with the %s clock, committing only the final frozen snapshot', mode => {
    const seed = createCitySeed();
    const now = mode === 'elapsed' ? '2031-01-01T00:00:00.123Z' : mode === 'backwards' ? '2020-01-01T00:00:00Z' : seed.now;
    const clock = vi.fn(() => now);
    const store = createCityStore(seed, mode === 'default' ? {} : { clock });
    const before = store.getSnapshot();
    const listener = vi.fn(() => store.getSnapshot());
    store.subscribe(listener);
    const expected = municipalCommands.reduce((state, command) => reduceCity(state, command, mode === 'default' ? state.now : now), seed);
    const result = store.dispatchBatch(municipalCommands);
    expect(result).toEqual(expected);
    expect(before).toEqual(seed);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.results[0].value).toBe(result);
    expect(result.revision).toBe(seed.revision + 4);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.issues[municipal.id].history)).toBe(true);
    expect(Object.isFrozen(result.assignments['ASN-0002'])).toBe(true);
    const history = result.issues[municipal.id].history.slice(-4);
    expect(history.map(item => item.actor)).toEqual([actor, assignee, assignee, assignee]);
    expect(history.map(item => Date.parse(item.at) - Date.parse(history[0].at))).toEqual([0, 1, 2, 3]);
    if (mode !== 'default') expect(clock).toHaveBeenCalledTimes(4);
    expectIntegrity(result);
  });

  it('does not notify, change identity or advance time for empty or all-no-op batches', () => {
    const store = createCityStore(createCitySeed());
    store.dispatch(municipalCommands[0]);
    const before = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(store.dispatchBatch([])).toBe(before);
    expect(store.dispatchBatch([municipalCommands[0], municipalCommands[0], { type: 'setTime', now: before.now }])).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    store.dispatchBatch([municipalCommands[0], municipalCommands[1]]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().revision).toBe(before.revision + 1);
    expect(Date.parse(store.getSnapshot().now) - Date.parse(before.now)).toBe(1);
  });

  it.each(['wrong team', 'missing evidence', 'future evidence'] as const)('rolls back all earlier steps, IDs and timestamps on %s', failure => {
    const store = createCityStore(createCitySeed());
    const before = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);
    const submission = resolutionCommand(store, municipal);
    const commands: CityCommand[] = failure === 'wrong team'
      ? [municipalCommands[0], { type: 'assign', event: municipal, teamId: 'central-response', assignee }]
      : [...municipalCommands, { ...submission, evidence: failure === 'missing evidence' ? [] : [{ ...submission.evidence[0], capturedAt: new Date(Date.parse(before.now) + 30_000).toISOString() }] }];
    expect(() => store.dispatchBatch(commands)).toThrow(failure === 'wrong team' ? /responsible department/ : failure === 'missing evidence' ? /evidence is required/ : /future/);
    expect(store.getSnapshot()).toBe(before);
    expect(store.getSnapshot()).toEqual(createCitySeed());
    expect(listener).not.toHaveBeenCalled();
    expect(store.dispatchBatch(municipalCommands)).toEqual(municipalCommands.reduce((state, command) => reduceCity(state, command), before));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('rolls back a successful review when a later closure command fails', () => {
    const store = createCityStore(openMunicipalSeed());
    store.dispatchBatch(municipalCommands);
    store.dispatch(resolutionCommand(store, municipal));
    const before = store.getSnapshot();
    const reviewId = Object.values(before.reviews).at(-1)!.id;
    const listener = vi.fn();
    store.subscribe(listener);
    expect(() => store.dispatchBatch([
      { type: 'reviewResolution', reviewId, decision: 'Verified', reviewer: actor, note: 'Checked' },
      { type: 'closeIssue', issueId: 'DEF-8301', actor },
    ])).toThrow(/verification/);
    expect(store.getSnapshot()).toBe(before);
    expect(before.reviews[reviewId].decision).toBe('Pending');
    expect(listener).not.toHaveBeenCalled();
  });

  it('rolls back clock failures and respects explicit time inside a batch', () => {
    const seed = createCitySeed();
    const clock = vi.fn().mockReturnValueOnce(seed.now).mockReturnValueOnce('invalid').mockReturnValue(seed.now);
    const store = createCityStore(seed, { clock });
    const before = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(() => store.dispatchBatch(municipalCommands)).toThrow(/ISO timestamp/);
    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    const future = '2031-01-01T00:00:00.123Z';
    const result = store.dispatchBatch([{ type: 'setTime', now: future }, ...municipalCommands]);
    expect(result.now).toBe('2031-01-01T00:00:00.127Z');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(clock).toHaveBeenCalledTimes(6); // Explicit setTime does not sample the clock.
  });
});

describe('simplified Municipal service workflow', () => {
  it.each(municipalCases.filter(([, issueId]) => issueId !== 'DEF-8301'))('completes the %s cycle, retaining approval and every original evidence record', async (_kind, issueId, departmentId) => {
    const event = { kind: 'municipal', id: issueId } as const;
    const seed = cityStore.getSnapshot();
    const original = structuredClone(seed.issues[issueId]);
    const assignment = await committed(() => municipalService.confirmAndAssign(issueId, `${departmentId}-team`, assignee, actor), 2);
    expect(assignment).toMatchObject({ event, teamId: `${departmentId}-team`, assignee });
    expect(cityStore.getSnapshot().issues[issueId].workflowStage).toBe('Assigned');
    expect(await committed(() => municipalService.acceptAndStart(issueId), 2)).toMatchObject({ workflowStage: 'In progress' });
    expect(selectAssignment(cityStore.getSnapshot(), event)?.acknowledgedAt).toBeDefined();
    expect(cityStore.getSnapshot().resolutions).toEqual(seed.resolutions);
    expect(cityStore.getSnapshot().reviews).toEqual(seed.reviews);
    const submission = resolutionCommand(cityStore, event);
    const resolution = await committed(() => workflowService.submitResolution(submission), 1);
    const review = lastReview();
    expect(review).toMatchObject({ decision: 'Pending', resolutionId: resolution.id, notifiedAt: resolution.submittedAt });
    expect(cityStore.getSnapshot().issues[issueId]).toMatchObject({ workflowStage: 'Admin review', currentCondition: original.currentCondition });
    expect(selectCitizenContext(cityStore.getSnapshot()).conditions.find(item => item.id === issueId)?.verified).toBe(false);
    const approved = await committed(() => workflowService.approveAndClose(review.id, actor, 'Evidence checked'), 2);
    expect(approved).toMatchObject({ decision: 'Verified', reviewer: actor, note: 'Evidence checked' });
    const state = cityStore.getSnapshot();
    const issue = state.issues[issueId];
    expect(issue).toMatchObject({ workflowStage: 'Closed', status: 'Closed', currentCondition: submission.resultingCondition });
    expect(issue.history.slice(original.history.length).map(item => item.action)).toEqual([
      'Issue qualified for departmental action', `Assigned to ${state.teams[`${departmentId}-team`].name}`,
      'Acknowledged', 'In progress', 'Field team marked issue resolved', 'Admin review requested; admin notified',
      'Admin review: Verified', 'Issue closed; verified condition published to Citizens',
    ]);
    expect(issue.history.slice(0, original.history.length)).toEqual(original.history);
    expect(issue.observations).toEqual(original.observations);
    expect(issue.image).toBe(original.image);
    expect(state.resolutions[resolution.id]).toEqual(resolution);
    expect(state.resolutions[resolution.id].evidence).toEqual(submission.evidence);
    expect(state.resolutions[resolution.id].assignmentId).toBe(assignment!.id);
    for (const [id, record] of Object.entries(seed.resolutions)) expect(state.resolutions[id]).toEqual(record);
    for (const [id, record] of Object.entries(seed.reviews)) expect(state.reviews[id]).toEqual(record);
    expect(selectCitizenContext(state).conditions.find(item => item.id === issueId)).toMatchObject({ verified: true, condition: submission.resultingCondition });
    expectIntegrity(state);
  });

  it('resumes Qualified and Acknowledged without duplicating steps, and returns detached results', async () => {
    await municipalService.qualify(municipal.id, actor);
    const assignment = await committed(() => municipalService.confirmAndAssign(municipal.id, 'stormwater-team', assignee, actor), 1);
    assignment!.assignee = 'External mutation';
    expect(selectAssignment(cityStore.getSnapshot(), municipal)?.assignee).toBe(assignee);
    await municipalService.acknowledge(municipal.id);
    const acknowledgedAt = selectAssignment(cityStore.getSnapshot(), municipal)!.acknowledgedAt;
    const issue = await committed(() => municipalService.acceptAndStart(municipal.id), 1);
    issue!.history.length = 0;
    expect(cityStore.getSnapshot().issues[municipal.id].history.slice(-4).map(item => item.action)).toEqual([
      'Issue qualified for departmental action', `Assigned to ${cityStore.getSnapshot().teams['stormwater-team'].name}`, 'Acknowledged', 'In progress',
    ]);
    expect(selectAssignment(cityStore.getSnapshot(), municipal)!.acknowledgedAt).toBe(acknowledgedAt);
  });

  it('qualifies an accepted citizen report explicitly before assigning without replacing its evidence', async () => {
    const input = { roadSegmentId: 'anna', category: 'pothole' as const, description: 'Large pothole near the junction', image: 'data:image/png;base64,YQ==' };
    const report = await citizenService.submitReport(input);
    const accepted = await municipalService.reviewCitizenReport(report.id, 'Accepted', 'Inspection required');
    const issueId = accepted.issueId!;
    await committed(() => municipalService.confirmAndAssign(issueId, 'roads-engineering-team', assignee, actor), 2);
    expect(cityStore.getSnapshot().issues[issueId]).toMatchObject({ workflowStage: 'Assigned', citizenReportId: report.id, image: input.image, currentCondition: input.description });
    expect(cityStore.getSnapshot().citizenReports[report.id]).toEqual(accepted);
    expect(cityStore.getSnapshot().issues[issueId].history.slice(-2).map(item => item.actor)).toEqual([actor, assignee]);
  });

  it('rejects wrong teams, invalid people, missing evidence, skipped stages and shortcut reassignment atomically', async () => {
    await rejected(() => municipalService.confirmAndAssign('missing', 'stormwater-team', assignee, actor), /Unknown municipal/);
    await rejected(() => municipalService.acceptAndStart('missing'), /Unknown municipal/);
    await rejected(() => municipalService.confirmAndAssign(municipal.id, 'central-response', assignee, actor), /responsible department/);
    await rejected(() => municipalService.confirmAndAssign(municipal.id, 'missing', assignee, actor), /Unknown team/);
    await rejected(() => municipalService.confirmAndAssign(municipal.id, 'stormwater-team', '', actor), /Assignee/);
    await rejected(() => municipalService.confirmAndAssign(municipal.id, 'stormwater-team', assignee, ''), /official/);
    await rejected(() => municipalService.acceptAndStart(municipal.id), /assigned or acknowledged/);
    await municipalService.qualify(municipal.id, actor);
    await rejected(() => municipalService.acceptAndStart(municipal.id), /assigned or acknowledged/);
    await municipalService.confirmAndAssign(municipal.id, 'stormwater-team', assignee, actor);
    await rejected(() => municipalService.confirmAndAssign(municipal.id, 'stormwater-team', 'Replacement', actor), /detected or qualified/);
    await municipalService.acceptAndStart(municipal.id);
    await rejected(() => municipalService.acceptAndStart(municipal.id), /assigned or acknowledged/);
    await rejected(() => workflowService.submitResolution({ ...resolutionCommand(cityStore, municipal), evidence: [] }), /evidence is required/);
    await rejected(() => workflowService.approveAndClose('missing', actor, 'Checked'), /Unknown admin review/);
    await workflowService.submitResolution(resolutionCommand(cityStore, municipal));
    await rejected(() => municipalService.confirmAndAssign(municipal.id, 'stormwater-team', assignee, actor), /detected or qualified/);
    await rejected(() => municipalService.acceptAndStart(municipal.id), /assigned or acknowledged/);
    await rejected(() => workflowService.approveAndClose(lastReview().id, '', 'Checked'), /Reviewer/);
    await rejected(() => workflowService.approveAndClose(lastReview().id, actor, ''), /note/);
  });
});

describe('simplified Police service workflow', () => {
  it.each(['Candidate', 'Qualified', 'Requested'] as const)('confirms and assigns from %s with one notification and all original command records', async entry => {
    if (entry !== 'Candidate') await policeTrafficService.qualify(police.id, actor);
    if (entry === 'Requested') await policeTrafficService.requestDispatch(police.id, actor);
    const before = cityStore.getSnapshot();
    const steps = entry === 'Candidate' ? 3 : entry === 'Qualified' ? 2 : 1;
    const originalDispatch = entry === 'Requested' ? dispatchFor() : undefined;
    const assignment = await committed(() => policeTrafficService.confirmAndAssign(police.id, 'central-response', assignee, actor), steps);
    expect(assignment).toMatchObject({ event: police, teamId: 'central-response', assignee });
    const state = cityStore.getSnapshot();
    expect(state.anomalies[police.id].history.filter(item => item.action === 'Candidate qualified by officer')).toHaveLength(1);
    expect(dispatchFor().history.map(item => item.action)).toEqual(['Traffic dispatch requested', 'Assigned to Central Response Team']);
    expect(dispatchFor().history.map(item => item.actor)).toEqual([actor, assignee]);
    expect(dispatchFor().stage).toBe('Assigned');
    expect(Object.values(state.dispatches)).toHaveLength(1);
    if (originalDispatch) expect(dispatchFor()).toMatchObject({ id: originalDispatch.id, requestedAt: originalDispatch.requestedAt });
    expect(state.trafficObservations).toEqual(before.trafficObservations);
    expect(state.resolutions).toEqual(before.resolutions);
    expect(state.reviews).toEqual(before.reviews);
    assignment!.assignee = 'External mutation';
    expect(selectAssignment(cityStore.getSnapshot(), police)?.assignee).toBe(assignee);
    expectIntegrity(state);
  });

  it.each(['Candidate', 'Qualified', 'Requested'] as const)('rolls back invalid assignments from %s without orphan dispatch or qualification', async entry => {
    if (entry !== 'Candidate') await policeTrafficService.qualify(police.id, actor);
    if (entry === 'Requested') await policeTrafficService.requestDispatch(police.id, actor);
    await rejected(() => policeTrafficService.confirmAndAssign(police.id, 'stormwater-team', assignee, actor), /responsible department/);
    await rejected(() => policeTrafficService.confirmAndAssign(police.id, 'missing', assignee, actor), /Unknown team/);
    await rejected(() => policeTrafficService.confirmAndAssign(police.id, 'central-response', '', actor), /Assignee/);
    await rejected(() => policeTrafficService.confirmAndAssign(police.id, 'central-response', assignee, ''), /officer/);
  });

  it('requires real follow-up, preserves trigger/evidence, closes atomically and rejects reassignment at every later stage', async () => {
    const seed = cityStore.getSnapshot();
    const original = structuredClone(seed.anomalies[police.id]);
    const cannotReassign = () => rejected(() => policeTrafficService.confirmAndAssign(police.id, 'traffic-investigation', 'Replacement', actor), /candidate, qualified or dispatch-requested/);
    await rejected(() => policeTrafficService.confirmAndAssign('missing', 'central-response', assignee, actor), /Unknown traffic anomaly/);
    await policeTrafficService.confirmAndAssign(police.id, 'central-response', assignee, actor);
    await cannotReassign();
    await rejected(() => policeTrafficService.confirmAndAssign(police.id, 'central-response', assignee, actor), /candidate, qualified or dispatch-requested/);
    await policeTrafficService.advanceDispatch(dispatchFor().id, 'En route', assignee);
    await cannotReassign();
    await policeTrafficService.advanceDispatch(dispatchFor().id, 'On scene', assignee);
    await cannotReassign();
    const submission = resolutionCommand(cityStore, police);
    const resolution = await workflowService.submitResolution(submission);
    const review = lastReview();
    await cannotReassign();
    await rejected(() => workflowService.approveAndClose(review.id, actor, 'Checked'), /subsequent normalizing/);
    const trigger = seed.trafficObservations[original.observationId];
    for (const observation of [
      { ...trigger, id: 'SAME-TIME', vehicleCount: 60 },
      { ...trigger, id: 'EARLIER', observedAt: new Date(Date.parse(trigger.observedAt) - 1000).toISOString(), vehicleCount: 60 },
      { ...trigger, id: 'OTHER-CORRIDOR', roadSegmentId: 'omr', observedAt: cityStore.getSnapshot().now, vehicleCount: 60 },
    ]) {
      await demoService.recordTraffic(observation);
      await rejected(() => workflowService.approveAndClose(review.id, actor, 'Checked'), /subsequent normalizing/);
    }
    await demoService.recordTraffic({ ...trigger, id: 'NORMAL-THEN-WORSE', observedAt: cityStore.getSnapshot().now, vehicleCount: 60 });
    await demoService.recordTraffic({ ...trigger, id: 'LATEST-HIGH', observedAt: cityStore.getSnapshot().now, vehicleCount: 120 });
    await rejected(() => workflowService.approveAndClose(review.id, actor, 'Checked'), /subsequent normalizing/);
    await demoService.recordTraffic({ ...trigger, id: 'NORMAL-FOLLOW-UP', observedAt: cityStore.getSnapshot().now, vehicleCount: 60 });
    const trafficBeforeApproval = cityStore.getSnapshot().trafficObservations;
    const approved = await committed(() => workflowService.approveAndClose(review.id, actor, 'Follow-up and field evidence checked'), 2);
    expect(approved.decision).toBe('Verified');
    approved.note = 'External mutation';
    expect(cityStore.getSnapshot().reviews[review.id].note).toBe('Follow-up and field evidence checked');
    expect(dispatchFor().stage).toBe('Closed');
    expect(dispatchFor().history.map(item => item.action)).toEqual([
      'Traffic dispatch requested', 'Assigned to Central Response Team', 'En route', 'On scene',
      'Team marked response resolved', 'Response resolution submitted; admin notified', 'Admin review: Verified', 'Traffic-control event closed',
    ]);
    expect(cityStore.getSnapshot().anomalies[police.id]).toMatchObject({ status: 'Closed', observationId: original.observationId });
    expect(cityStore.getSnapshot().anomalies[police.id].history.slice(0, original.history.length)).toEqual(original.history);
    expect(cityStore.getSnapshot().trafficObservations).toEqual(trafficBeforeApproval);
    expect(cityStore.getSnapshot().trafficObservations[trigger.id]).toEqual(trigger);
    expect(cityStore.getSnapshot().resolutions[resolution.id]).toEqual(resolution);
    expect(cityStore.getSnapshot().resolutions[resolution.id].evidence).toEqual(submission.evidence);
    await cannotReassign();
    expectIntegrity(cityStore.getSnapshot());
  });
});

describe('approval, rework and emergency boundaries', () => {
  it.each([municipal, police])('keeps Returned reviews and evidence immutable through $kind rework and a new approval', async (event: EventRef) => {
    if (event.kind === 'municipal') await startMunicipal();
    else await policeOnScene();
    const first = await workflowService.submitResolution(resolutionCommand(cityStore, event));
    const firstReview = lastReview();
    await workflowService.reviewResolution(firstReview.id, 'Returned', actor, 'Further field work required');
    const returned = cityStore.getSnapshot().reviews[firstReview.id];
    expect(event.kind === 'municipal' ? cityStore.getSnapshot().issues[event.id].workflowStage : dispatchFor().stage).toBe(event.kind === 'municipal' ? 'In progress' : 'On scene');
    await rejected(() => workflowService.approveAndClose(firstReview.id, actor, 'Cannot reuse old review'), /already been reviewed/);
    if (event.kind === 'anomaly') await policeTrafficService.recordFollowUp(event.id, actor);
    const second = await workflowService.submitResolution({ ...resolutionCommand(cityStore, event), resultingCondition: 'Rework checked; road clear' });
    const secondReview = lastReview();
    expect(secondReview.id).not.toBe(firstReview.id);
    await rejected(() => workflowService.approveAndClose(firstReview.id, actor, 'Cannot approve stale review'), /already been reviewed/);
    await committed(() => workflowService.approveAndClose(secondReview.id, actor, 'Rework verified'), 2);
    expect(cityStore.getSnapshot().reviews[firstReview.id]).toEqual(returned);
    expect(cityStore.getSnapshot().resolutions[first.id]).toEqual(first);
    expect(cityStore.getSnapshot().resolutions[second.id]).toEqual(second);
    expect(cityStore.getSnapshot().reviews[secondReview.id].decision).toBe('Verified');
    expect(event.kind === 'municipal' ? cityStore.getSnapshot().issues[event.id].workflowStage : dispatchFor().stage).toBe('Closed');
    expectIntegrity(cityStore.getSnapshot());
  });

  it.each([municipal, police])('supports existing Verified $kind reviews and repeated closure without duplicate history', async (event: EventRef) => {
    if (event.kind === 'municipal') await startMunicipal();
    else { await policeOnScene(); await policeTrafficService.recordFollowUp(event.id, actor); }
    await workflowService.submitResolution(resolutionCommand(cityStore, event));
    const reviewId = lastReview().id;
    await workflowService.reviewResolution(reviewId, 'Verified', actor, 'Original approval');
    const approved = cityStore.getSnapshot().reviews[reviewId];
    if (event.kind === 'anomaly') await rejected(() => policeTrafficService.confirmAndAssign(event.id, 'central-response', assignee, actor), /candidate, qualified or dispatch-requested/);
    else await rejected(() => municipalService.confirmAndAssign(event.id, 'stormwater-team', assignee, actor), /detected or qualified/);
    await committed(() => workflowService.approveAndClose(reviewId, actor, 'Close verified work'), 1);
    await committed(() => workflowService.approveAndClose(reviewId, actor, 'Repeated click'), 0);
    expect(cityStore.getSnapshot().reviews[reviewId]).toEqual(approved);
  });

  it('does not submit or approve Municipal field work before an emergency team is discharged', async () => {
    await startMunicipal();
    await emergencyService.request(municipal, 'Secure drainage crew access', actor);
    const emergencyId = Object.values(cityStore.getSnapshot().emergencyDispatches).at(-1)!.id;
    const submit = () => workflowService.submitResolution(resolutionCommand(cityStore, municipal));
    await rejected(submit, /discharge/);
    await emergencyService.assign(emergencyId, 'city-response-team', actor);
    await rejected(submit, /discharge/);
    for (const stage of ['En route', 'On scene', 'Response complete'] as const) {
      await emergencyService.advance(emergencyId, stage, actor, 'Crew access secured');
      await rejected(submit, /discharge/);
    }
    await rejected(() => workflowService.approveAndClose('missing', actor, 'Cannot invent submission'), /Unknown admin review/);
    await emergencyService.advance(emergencyId, 'Discharged', actor);
    const discharged = cityStore.getSnapshot().emergencyDispatches[emergencyId];
    expect(cityStore.getSnapshot().issues[municipal.id].workflowStage).toBe('In progress');
    await committed(submit, 1);
    expect(cityStore.getSnapshot().issues[municipal.id].workflowStage).toBe('Admin review');
    await committed(() => workflowService.approveAndClose(lastReview().id, actor, 'Field evidence verified after discharge'), 2);
    expect(cityStore.getSnapshot().emergencyDispatches[emergencyId]).toEqual(discharged);
    expect(discharged.history.map(item => item.action)).toEqual([
      'Emergency team dispatch requested by operator', `Team assigned: ${cityStore.getSnapshot().teams['city-response-team'].name}`,
      'En route', 'On scene', 'Response complete', 'Team discharged / released from event',
    ]);
    expectIntegrity(cityStore.getSnapshot());
  });

  it('builds queued shortcuts from the execution-time snapshot without interleaving partial batches', async () => {
    const listener = vi.fn(() => cityStore.getSnapshot().issues[municipal.id].workflowStage);
    const unsubscribe = cityStore.subscribe(listener);
    try {
      const first = municipalService.confirmAndAssign(municipal.id, 'stormwater-team', assignee, actor);
      const duplicate = municipalService.confirmAndAssign(municipal.id, 'stormwater-team', 'Second lead', actor);
      const start = municipalService.acceptAndStart(municipal.id);
      const results = await Promise.allSettled([first, duplicate, start]);
      expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
      expect(listener.mock.results.map(result => result.value)).toEqual(['Assigned', 'In progress']);
      expect(selectAssignment(cityStore.getSnapshot(), municipal)?.assignee).toBe(assignee);
      expect(cityStore.getSnapshot().revision).toBe(4);
    } finally { unsubscribe(); }
  });
});