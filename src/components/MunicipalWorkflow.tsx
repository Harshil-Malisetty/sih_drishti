import { useState } from 'react';
import { completionEvidence, issueResolutionDefaults } from '../data/demo/operations';
import { selectEmergency, selectEventResolution } from '../domain/operations';
import { selectAssignment } from '../domain/selectors';
import { formatDemoDate } from '../domain/time';
import { municipalService, workflowService } from '../services';
import { useCityData } from '../services/useCityData';
import type { MunicipalIssue } from '../types/city';
import { ResolutionReview, useOperation, WorkflowHistory } from './operations';

export function MunicipalWorkflow({ issueId }: { issueId: string }) {
  const { state } = useCityData();
  const issue = state.issues[issueId];
  if (!issue) return <p role="status">Municipal record unavailable.</p>;
  return <IssueWorkflow key={`${issue.id}-${issue.departmentId}`} issue={issue} />;
}

function IssueWorkflow({ issue }: { issue: MunicipalIssue }) {
  const { state } = useCityData();
  const event = { kind: 'municipal' as const, id: issue.id };
  const assignment = selectAssignment(state, event);
  const { resolution, review } = selectEventResolution(state, event);
  const emergency = selectEmergency(state, event);
  const emergencyActive = !!emergency && emergency.stage !== 'Discharged';
  const department = state.departments[issue.departmentId];
  const teams = Object.values(state.teams).filter(team => team.departmentId === issue.departmentId);
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [assignee, setAssignee] = useState(teams[0]?.name || '');
  const defaults = issueResolutionDefaults[issue.kind];
  const [summary, setSummary] = useState(resolution?.summary || defaults.summary);
  const [condition, setCondition] = useState(resolution?.resultingCondition || defaults.condition);
  const { busy, error, run } = useOperation();
  const latest = issue.history.at(-1);
  const stage = issue.workflowStage;
  const resolutionState = review?.decision === 'Pending' ? 'Awaiting admin verification'
    : review?.decision === 'Returned' ? 'Returned for field action'
    : review?.decision === 'Verified' ? 'Verified by admin'
    : resolution ? 'Field resolution submitted' : 'Not submitted';

  return <section className="operation-panel" aria-label="Municipal issue workflow" aria-busy={busy}>
    <div className="operation-heading"><h2>Municipal workflow</h2><span className="operation-state" role="status">{stage}</span></div>
    <dl className="operation-facts">
      <div><dt>Responsible department</dt><dd>{department?.name || issue.departmentId}</dd></div>
      <div><dt>Status</dt><dd>{stage} · {issue.status}</dd></div>
      <div><dt>Assigned team</dt><dd>{assignment ? state.teams[assignment.teamId]?.name || assignment.teamId : 'Not assigned'}</dd></div>
      <div><dt>Assignee</dt><dd>{assignment?.assignee || 'Not assigned'}</dd></div>
      <div><dt>Latest action</dt><dd>{latest ? <>{latest.action}<br/><span className="operation-meta">{latest.actor} · {formatDemoDate(latest.at)}</span></> : 'No recorded action'}</dd></div>
      <div><dt>Resolution state</dt><dd>{resolutionState}</dd></div>
    </dl>
    {assignment && <p className="operation-meta">Assigned {formatDemoDate(assignment.assignedAt)} · {assignment.acknowledgedAt ? `Acknowledged ${formatDemoDate(assignment.acknowledgedAt)}` : 'Acknowledgement pending'}</p>}
    {stage === 'Detected' && <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => municipalService.qualify(issue.id, 'Municipal admin'), { message: 'Issue qualified for departmental action.', tone: 'info' })}>Qualify issue</button></div>}
    {stage === 'Qualified' && <form className="operation-form" onSubmit={e => { e.preventDefault(); void run(() => municipalService.assign(issue.id, teamId, assignee.trim()), { message: 'Department assigned. Awaiting acknowledgement.', tone: 'info' }); }}>
      <label>Department team<select value={teamId} disabled={busy || !teams.length} onChange={e => {
        setTeamId(e.target.value);
        setAssignee(teams.find(team => team.id === e.target.value)?.name || '');
      }}>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Assignee<input value={assignee} onChange={e => setAssignee(e.target.value)} disabled={busy} required /></label>
      {!teams.length && <p role="status">No teams are available for the responsible department.</p>}
      <div className="operation-actions"><button className="primary" disabled={busy || !teams.some(team => team.id === teamId) || !assignee.trim()}>Assign department</button></div>
    </form>}
    {stage === 'Assigned' && <div className="operation-actions"><button className="primary" disabled={busy || !assignment} onClick={() => run(() => municipalService.acknowledge(issue.id), { message: 'Department acknowledged the assignment.', tone: 'info' })}>Acknowledge assignment</button></div>}
    {stage === 'Acknowledged' && <div className="operation-actions"><button className="primary" disabled={busy || !assignment} onClick={() => run(() => municipalService.startFieldWork(issue.id), { message: 'Field action started.', tone: 'info' })}>Start field action</button></div>}
    {stage === 'In progress' && <form className="operation-form" onSubmit={e => {
      e.preventDefault();
      if (!emergencyActive) void run(() => workflowService.submitDemoResolution(event, summary.trim(), condition.trim()), 'Resolution submitted. Admin review requested.');
    }}>
      <h3>Field completion</h3>
      <p className="operation-meta">Editable demo defaults. Marking resolved submits evidence for admin review; it does not verify or close the issue.</p>
      <label>Resolution summary<textarea value={summary} onChange={e => setSummary(e.target.value)} disabled={busy} required /></label>
      <label>Resulting condition<textarea value={condition} onChange={e => setCondition(e.target.value)} disabled={busy} required /></label>
      <figure className="resolution-evidence"><img src={completionEvidence} alt="Illustrative field-completion fixture, not an actual post-repair photograph"/><figcaption>Demo evidence preview · local illustrative fixture — not an actual post-repair photograph.</figcaption></figure>
      {emergencyActive && <p id={`emergency-block-${issue.id}`} role="status">Emergency response is {emergency.stage}. Complete the response and discharge the emergency team before marking resolved.</p>}
      <div className="operation-actions"><button className="primary" disabled={busy || !assignment || !summary.trim() || !condition.trim() || emergencyActive} aria-describedby={emergencyActive ? `emergency-block-${issue.id}` : undefined}>Mark resolved</button></div>
    </form>}
    <ResolutionReview event={event} actor="Municipal admin" />
    {stage === 'Verified' && <><p role="status">Resolution verified. The issue remains open until explicitly closed.</p><div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => municipalService.close(issue.id, 'Municipal admin'), 'Issue closed. Verified road condition published.')}>Close issue</button></div></>}
    {stage === 'Closed' && <p role="status">Issue closed · verified condition available to Citizens.</p>}
    {error && <p role="alert">{error}</p>}
    <WorkflowHistory items={issue.history} />
  </section>;
}