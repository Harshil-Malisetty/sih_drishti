import { describe, expect, it } from 'vitest';
import { createCityStore } from '../src/domain/cityStore';
import { selectAssignment, selectCitizenAlerts, selectCitizenContext, selectIssues } from '../src/domain/selectors';
import { beginMunicipalWork, expectIntegrity, expectRejected, municipalCases, openMunicipalSeed, resolutionCommand } from './helpers';

describe.each(municipalCases)('%s municipal workflow', (_kind, issueId, departmentId) => {
  it('accepts only the responsible department and publishes a fix only after admin verification', () => {
    const store = createCityStore(openMunicipalSeed());
    const event = { kind: 'municipal', id: issueId } as const;
    const original = store.getSnapshot().issues[issueId];
    const read = () => selectIssues(store.getSnapshot()).find(item => item.id === issueId)!;
    const publicCondition = () => selectCitizenContext(store.getSnapshot()).conditions.find(item => item.id === issueId)!;
    for (const team of Object.values(store.getSnapshot().teams).filter(item => item.departmentId !== departmentId)) {
      expectRejected(store, { type: 'assign', event, teamId: team.id, assignee: 'Field lead' }, /responsible department/);
    }
    store.dispatch({ type: 'assign', event, teamId: `${departmentId}-team`, assignee: 'Field lead' });
    const assignment = selectAssignment(store.getSnapshot(), event)!;
    expect(assignment).toMatchObject({ event, departmentId, teamId: `${departmentId}-team`, assignee: 'Field lead' });
    expect(read()).toMatchObject({ id: issueId, roadSegmentId: original.roadSegmentId, workflowStage: 'Assigned', status: 'Open' });
    store.dispatch({ type: 'acknowledge', issueId });
    expect(read().workflowStage).toBe('Acknowledged');
    expect(selectAssignment(store.getSnapshot(), event)?.acknowledgedAt).toBe(store.getSnapshot().now);
    store.dispatch({ type: 'startFieldWork', issueId });
    expect(read().workflowStage).toBe('In progress');
    const submission = resolutionCommand(store, event);
    store.dispatch(submission);
    const pending = store.getSnapshot();
    const resolution = Object.values(pending.resolutions).at(-1)!;
    const review = Object.values(pending.reviews).at(-1)!;
    expect(resolution).toMatchObject({ event, assignmentId: assignment.id, resultingCondition: submission.resultingCondition });
    expect(review).toMatchObject({ resolutionId: resolution.id, decision: 'Pending', notifiedAt: resolution.submittedAt });
    expect(read()).toMatchObject({ workflowStage: 'Admin review', status: 'Pending Verification', currentCondition: original.currentCondition });
    expect(read().repair?.result).toBe('Pending');
    expect(publicCondition()).toMatchObject({ verified: false, condition: original.currentCondition, evidence: [] });
    expect(selectCitizenAlerts(pending).some(item => item.sourceId === issueId)).toBe(true);
    expectRejected(store, submission, /awaiting admin review/);
    expectRejected(store, { type: 'assign', event, teamId: `${departmentId}-team`, assignee: 'Replacement lead' }, /pending resolution/);
    // A submitted evidence array must not remain a mutable alias into the store.
    submission.evidence[0].description = 'changed outside the store';
    expect(resolution.evidence[0].description).toBe('Post-work field inspection');
    store.dispatch({ type: 'reviewResolution', reviewId: review.id, decision: 'Verified', reviewer: 'Municipal admin', note: 'Evidence checked' });
    expect(read()).toMatchObject({ workflowStage: 'Closed', status: 'Verified', currentCondition: submission.resultingCondition });
    expect(read().repair?.result).toBe('Verified');
    expect(publicCondition()).toMatchObject({ verified: true, condition: submission.resultingCondition, verifiedAt: store.getSnapshot().now, evidence: [{ capturedAt: submission.evidence[0].capturedAt }] });
    expect(selectCitizenAlerts(store.getSnapshot()).some(item => item.sourceId === issueId)).toBe(false);
    expect(pending.reviews[review.id].decision).toBe('Pending');
    expectIntegrity(store.getSnapshot());
  });
});

describe('municipal transition guards and review follow-up', () => {
  it('does not let an old returned review overwrite reassignment', () => {
    const store = createCityStore(openMunicipalSeed());
    const event = { kind: 'municipal', id: 'DEF-8292' } as const;
    beginMunicipalWork(store);
    store.dispatch(resolutionCommand(store, event));
    const reviewId = Object.values(store.getSnapshot().reviews).at(-1)!.id;
    store.dispatch({ type: 'reviewResolution', reviewId, decision: 'Returned', reviewer: 'Admin', note: 'Further work needed' });
    store.dispatch({ type: 'assign', event, teamId: 'stormwater-team', assignee: 'Replacement lead' });
    expect(selectIssues(store.getSnapshot()).find(issue => issue.id === event.id)).toMatchObject({ workflowStage: 'Assigned', status: 'Open' });
  });

  it('returns for action, preserves the confirmed condition and accepts a new resolution/review', () => {
    const store = createCityStore(openMunicipalSeed());
    const event = { kind: 'municipal', id: 'DEF-8292' } as const;
    const original = store.getSnapshot().issues[event.id].currentCondition;
    beginMunicipalWork(store);
    store.dispatch(resolutionCommand(store, event));
    const firstReview = Object.values(store.getSnapshot().reviews).at(-1)!;
    const returned = { type: 'reviewResolution', reviewId: firstReview.id, decision: 'Returned', reviewer: 'Admin', note: 'Clear remaining water' } as const;
    const returnedState = store.dispatch(returned);
    expect(store.dispatch(returned)).toBe(returnedState);
    expect(selectIssues(store.getSnapshot()).find(item => item.id === event.id)).toMatchObject({ status: 'Disputed', workflowStage: 'In progress', currentCondition: original });
    expect(selectCitizenContext(store.getSnapshot()).conditions.find(item => item.id === event.id)).toMatchObject({ verified: false, condition: original });
    expectRejected(store, { ...returned, decision: 'Verified' }, /already been reviewed/);
    store.dispatch({ ...resolutionCommand(store, event), resultingCondition: 'Drains clear; carriageway dry' });
    const secondReview = Object.values(store.getSnapshot().reviews).at(-1)!;
    expect(secondReview.id).not.toBe(firstReview.id);
    expect(store.getSnapshot().reviews[firstReview.id].decision).toBe('Returned');
    expect(secondReview.decision).toBe('Pending');
    const verify = { ...returned, reviewId: secondReview.id, decision: 'Verified' } as const;
    const verifiedState = store.dispatch(verify);
    expect(store.dispatch(verify)).toBe(verifiedState);
    expect(selectCitizenContext(store.getSnapshot()).conditions.find(item => item.id === event.id)).toMatchObject({ verified: true, condition: 'Drains clear; carriageway dry' });
    expectIntegrity(store.getSnapshot());
  });

  it('rejects skipped or backwards stages and invalid evidence atomically', () => {
    const store = createCityStore(openMunicipalSeed());
    const issueId = 'DEF-8292';
    const event = { kind: 'municipal', id: issueId } as const;
    expectRejected(store, { type: 'acknowledge', issueId }, /no assignment/);
    expectRejected(store, { type: 'startFieldWork', issueId }, /no assignment/);
    expectRejected(store, resolutionCommand(store, event), /active assignment/);
    expectRejected(store, { type: 'assign', event, teamId: 'stormwater-team', assignee: '  ' }, /Assignee/);
    expectRejected(store, { type: 'assign', event, teamId: 'unknown', assignee: 'Lead' }, /Unknown team/);
    store.dispatch({ type: 'assign', event, teamId: 'stormwater-team', assignee: 'Lead' });
    expectRejected(store, { type: 'startFieldWork', issueId }, /Invalid municipal/);
    expectRejected(store, resolutionCommand(store, event), /Field work/);
    const acknowledged = store.dispatch({ type: 'acknowledge', issueId });
    expect(store.dispatch({ type: 'acknowledge', issueId })).toBe(acknowledged);
    expectRejected(store, resolutionCommand(store, event), /Field work/);
    const inProgress = store.dispatch({ type: 'startFieldWork', issueId });
    expect(store.dispatch({ type: 'startFieldWork', issueId })).toBe(inProgress);
    expectRejected(store, { type: 'acknowledge', issueId }, /Invalid municipal/);
    const valid = resolutionCommand(store, event);
    expectRejected(store, { ...valid, evidence: [] }, /evidence is required/);
    expectRejected(store, { ...valid, summary: ' ' }, /summary/);
    expectRejected(store, { ...valid, resultingCondition: ' ' }, /condition/);
    expectRejected(store, { ...valid, evidence: [valid.evidence[0], valid.evidence[0]] }, /unique/);
    expectRejected(store, { ...valid, evidence: [{ ...valid.evidence[0], image: '' }] }, /image/);
    expectRejected(store, { ...valid, evidence: [{ ...valid.evidence[0], capturedAt: '2027-01-01T00:00:00Z' }] }, /future/);
    expectRejected(store, { ...valid, evidence: [{ ...valid.evidence[0], capturedAt: 'Today' }] }, /ISO timestamp/);
    store.dispatch(valid);
    const reviewId = Object.values(store.getSnapshot().reviews).at(-1)!.id;
    expectRejected(store, { type: 'reviewResolution', reviewId, decision: 'Verified', reviewer: '', note: 'Checked' }, /Reviewer/);
    expectRejected(store, { type: 'reviewResolution', reviewId, decision: 'Verified', reviewer: 'Admin', note: '' }, /note/);
    store.dispatch({ type: 'reviewResolution', reviewId, decision: 'Verified', reviewer: 'Admin', note: 'Checked' });
    expectRejected(store, { type: 'startFieldWork', issueId }, /Invalid municipal/);
    expectRejected(store, { type: 'assign', event, teamId: 'stormwater-team', assignee: 'Lead' }, /Closed events/);
  });
});