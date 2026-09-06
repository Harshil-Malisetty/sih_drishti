import { useState } from 'react';
import { completionEvidence, issueResolutionDefaults } from '../data/demo/operations';
import { selectEmergency, selectEventResolution } from '../domain/operations';
import { selectAssignment } from '../domain/selectors';
import { formatDemoDate } from '../domain/time';
import { municipalService, workflowService } from '../services';
import { useCityData } from '../services/useCityData';
import type { MunicipalIssue } from '../types/city';
import { ResolutionReview, useOperation, WorkflowHistory, WorkflowProgress } from './operations';
import { EvidenceCredit, EvidenceImage } from './EvidenceMedia';

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
  const { resolution } = selectEventResolution(state, event);
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
  const labels = { Detected: 'Needs a team', Qualified: 'Ready to assign', Assigned: 'Ready to start', Acknowledged: 'Team accepted', 'In progress': 'Work underway', 'Admin review': 'Waiting for admin', Verified: 'Approved', Closed: 'Closed' };
  const current = ['Detected', 'Qualified'].includes(stage) ? 0 : ['Assigned', 'Acknowledged', 'In progress'].includes(stage) ? 1 : stage === 'Closed' ? 3 : 2;
  const owner = current === 1 ? assignment?.assignee || 'Field team' : 'Municipal admin';
  const next = current === 0 ? 'Check the issue and choose the team that will fix it.'
    : stage === 'Assigned' || stage === 'Acknowledged' ? 'Accept this job when the team is ready to begin.'
    : stage === 'In progress' ? 'Complete the work, then send the outcome to the admin.'
    : stage === 'Admin review' ? 'Check the completed work. Approve it or send it back to the team.'
    : stage === 'Verified' ? 'The work is approved. Close the record when ready.' : 'Work approved and case closed. The updated road condition is visible to citizens.';

  return <section className="operation-panel" aria-label="Municipal issue workflow" aria-busy={busy}>
    <div className="operation-heading"><h2>Get this fixed</h2><span className="operation-state" role="status">{labels[stage]}</span></div>
    <p className="operation-meta">{department?.name || issue.departmentId}{latest && <> · Updated {formatDemoDate(latest.at)}</>}</p>
    <WorkflowProgress steps={['Assign team', 'Fix issue', 'Admin check', 'Done']} current={current} owner={owner} next={next} complete={stage === 'Closed'}/>
    {(stage === 'Detected' || stage === 'Qualified') && <form className="operation-form" onSubmit={e => { e.preventDefault(); void run(() => municipalService.confirmAndAssign(issue.id, teamId, assignee.trim(), 'Municipal admin'), { message: 'Issue confirmed and assigned to the team.', tone: 'info' }); }}>
      <label>Team<select value={teamId} disabled={busy || !teams.length} onChange={e => {
        setTeamId(e.target.value);
        setAssignee(teams.find(team => team.id === e.target.value)?.name || '');
      }}>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Team lead<input value={assignee} onChange={e => setAssignee(e.target.value)} disabled={busy} required /></label>
      {!teams.length && <p role="status">No teams are available for the responsible department.</p>}
      <div className="operation-actions"><button className="primary" disabled={busy || !teams.some(team => team.id === teamId) || !assignee.trim()}>Confirm issue & assign team</button></div>
    </form>}
    {(stage === 'Assigned' || stage === 'Acknowledged') && <div className="operation-actions"><button className="primary" disabled={busy || !assignment} onClick={() => run(() => municipalService.acceptAndStart(issue.id), { message: 'Job accepted. Work started.', tone: 'info' })}>Accept & start work</button></div>}
    {stage === 'In progress' && <form className="operation-form" onSubmit={e => {
      e.preventDefault();
      if (!emergencyActive) void run(() => workflowService.submitDemoResolution(event, summary.trim(), condition.trim()), 'Work sent to the admin for checking.');
    }}>
      <h3>Tell the admin what was done</h3>
      <p className="operation-meta">Edit these sample notes for the walkthrough. The admin still needs to check the work.</p>
      <label>Work completed<textarea value={summary} onChange={e => setSummary(e.target.value)} disabled={busy} required /></label>
      <label>Road condition now<textarea value={condition} onChange={e => setCondition(e.target.value)} disabled={busy} required /></label>
      <details className="submission-details"><summary>Sample completion photo</summary><figure className="resolution-evidence"><EvidenceImage src={completionEvidence(issue.kind)} alt={`${issue.defectType} — illustrative completed condition`}/><figcaption>Illustration only · not proof of work at this site.</figcaption><EvidenceCredit src={completionEvidence(issue.kind)}/></figure></details>
      {emergencyActive && <p id={`emergency-block-${issue.id}`} role="status">Emergency team: {emergency.stage}. Finish their response and release the team before sending this work for approval.</p>}
      <div className="operation-actions"><button className="primary" disabled={busy || !assignment || !summary.trim() || !condition.trim() || emergencyActive} aria-describedby={emergencyActive ? `emergency-block-${issue.id}` : undefined}>Send for admin check</button></div>
    </form>}
    <ResolutionReview event={event} actor="Municipal admin" />
    {stage === 'Verified' && <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => municipalService.close(issue.id, 'Municipal admin'), 'Issue closed.')}>Close issue</button></div>}
    {assignment && <details className="operation-history"><summary>Team and assignment details</summary><p>{state.teams[assignment.teamId]?.name} · {assignment.assignee}</p><p className="operation-meta">Assigned {formatDemoDate(assignment.assignedAt)}{assignment.acknowledgedAt && <> · Accepted {formatDemoDate(assignment.acknowledgedAt)}</>}</p></details>}
    {error && <p role="alert">{error}</p>}
    <WorkflowHistory items={issue.history} />
  </section>;
}