import { useEffect, useId, useState } from 'react';
import { selectEventResolution } from '../domain/operations';
import { selectAssignment } from '../domain/selectors';
import { formatDemoDate } from '../domain/time';
import { policeTrafficService, workflowService } from '../services';
import { usePoliceData } from '../services/PoliceJurisdiction';
import { PoliceHeader as AppHeader } from './PoliceHeader';
import { ResolutionReview, useOperation, WorkflowHistory, WorkflowProgress } from './operations';

export function PoliceTrafficControl({ id, onBack }: { id: string; onBack: () => void }) {
  return <TrafficControlDetail key={id} id={id} onBack={onBack}/>;
}

function TrafficControlDetail({ id, onBack }: { id: string; onBack: () => void }) {
  useEffect(() => { window.scrollTo(0, 0); }, [id]);
  const { state, anomalies } = usePoliceData();
  const anomaly = anomalies.find(item => item.id === id);
  const event = { kind: 'anomaly' as const, id };
  const assignment = selectAssignment(state, event);
  const { resolution, review } = selectEventResolution(state, event);
  const teams = Object.values(state.teams).filter(team => state.departments[team.departmentId]?.role === 'police' && ['traffic-investigation', 'central-response'].includes(team.id));
  const [teamId, setTeamId] = useState(assignment?.teamId || teams[0]?.id || '');
  const [assignee, setAssignee] = useState(assignment?.assignee || 'Traffic control lead');
  const [summary, setSummary] = useState('Traffic cleared. A follow-up bus check shows traffic moving normally.');
  const [result, setResult] = useState<string>();
  const { busy, error, run } = useOperation();
  const followUpHintId = useId();
  if (!anomaly) return <div className="police-workflow"><AppHeader title="Traffic control" subtitle={id} onBack={onBack}/><main className="page detail"><p>This traffic record is no longer available.</p></main></div>;

  const { observation, dispatch, ratio } = anomaly;
  const stage = dispatch?.stage || anomaly.status;
  const team = assignment && state.teams[assignment.teamId];
  // Inspect the latest shared pass, not an older good pass hidden by newer congestion.
  const latest = observation && Object.values(state.trafficObservations)
    .filter(item => item.roadSegmentId === anomaly.roadSegmentId && Date.parse(item.observedAt) > Date.parse(observation.observedAt) && Date.parse(item.observedAt) <= Date.parse(state.now))
    .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || b.id.localeCompare(a.id))[0];
  const followUpRatio = latest && latest.baselineVehicleCount > 0 ? latest.vehicleCount / latest.baselineVehicleCount : null;
  const recovered = followUpRatio !== null && followUpRatio < 2;
  const resultingCondition = result ?? (latest && recovered ? `Traffic moving at ${latest.averageSpeed} km/h, close to its usual level. Checked ${formatDemoDate(latest.observedAt)}.` : '');
  const history = [...anomaly.history, ...(dispatch?.history || [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const closedAt = dispatch?.stage === 'Closed' ? dispatch.history.at(-1)?.at : undefined;
  const needsTeam = !dispatch && ['Candidate', 'Qualified'].includes(anomaly.status) || dispatch?.stage === 'Requested';
  const current = needsTeam ? 0 : ['Assigned', 'En route', 'On scene'].includes(stage) ? 1 : stage === 'Closed' ? 3 : 2;
  const statusLabel = ({ Candidate: 'Needs officer check', Qualified: 'Ready for a team', Requested: 'Choose a team', Assigned: 'Team assigned', 'En route': 'Team on the way', 'On scene': 'Team at the location', 'Admin review': 'Waiting for supervisor', Verified: 'Approved', Closed: 'Closed', Dismissed: 'Dismissed', Dispatched: 'Response requested' })[stage];
  const owner = needsTeam ? 'Traffic control officer' : current === 1 ? assignment?.assignee || 'Response team' : 'Police supervisor';
  const next = needsTeam ? 'Check the traffic report, then send a team.' : stage === 'Assigned' ? 'Let control know when the team leaves.' : stage === 'En route' ? 'Confirm when the team reaches the location.' : stage === 'On scene' ? 'Clear the traffic and record a fresh check before sending the outcome.' : stage === 'Admin review' ? 'Check the team’s outcome, then approve or send it back.' : stage === 'Verified' ? 'The response is approved. Close the case when ready.' : 'Response approved and case closed. All team updates are saved below.';

  return <div className="police-workflow"><AppHeader title="Traffic control" subtitle={id} onBack={onBack}/><main className="page detail">
    <section className="operation-panel" aria-label="Police traffic workflow" aria-busy={busy}>
      <div className="operation-heading"><h2>{observation?.location || state.roadSegments[anomaly.roadSegmentId]?.name || 'Location unavailable'}</h2><span className="operation-state" role="status">{statusLabel}</span></div>
      <p className="operation-meta">Demo traffic report · Updated {formatDemoDate(history.at(-1)?.at || anomaly.detectedAt)}</p>
      <div className="traffic-explainer"><strong>{stage === 'Closed' ? 'Traffic response completed' : recovered ? 'Traffic is back near its usual level' : ratio === null ? 'Traffic needs an officer check' : `About ${ratio.toFixed(1)} times the usual traffic`}</strong><p>{recovered && latest ? `Latest bus check: ${latest.averageSpeed} km/h · ${formatDemoDate(latest.observedAt)}` : observation ? `Buses counted ${observation.vehicleCount} vehicles here. The usual count for this hour-long window is ${observation.baselineVehicleCount}.` : 'The original bus report is unavailable.'}</p></div>
      <WorkflowProgress steps={['Send team', 'Respond', 'Supervisor', 'Done']} current={current} owner={owner} next={next} complete={stage === 'Closed'}/>
      {!observation && <p role="alert">The original traffic report is missing. It is needed before a team can be sent.</p>}
      {needsTeam && <form className="operation-form" onSubmit={e => { e.preventDefault(); void run(() => policeTrafficService.confirmAndAssign(id, teamId, assignee.trim(), 'Traffic control officer'), { message: 'Traffic report confirmed. Team assigned.', tone: 'info' }); }}>
        <label>Response team<select value={teamId} onChange={e => setTeamId(e.target.value)} disabled={busy || !teams.length}><option value="" disabled>Choose a team</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Team lead<input value={assignee} onChange={e => setAssignee(e.target.value)} disabled={busy} required/></label>
        {!teams.length && <p role="status">No traffic teams are available.</p>}
        <div className="operation-actions"><button className="primary" disabled={busy || !observation || !teams.some(item => item.id === teamId) || !assignee.trim()}>Confirm & assign team</button></div>
      </form>}
      {dispatch?.stage === 'Assigned' && <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => policeTrafficService.advanceDispatch(dispatch.id, 'En route', assignment?.assignee || 'Response team'), { message: 'Team is on the way.', tone: 'info' })}>Team has left</button></div>}
      {dispatch?.stage === 'En route' && <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => policeTrafficService.advanceDispatch(dispatch.id, 'On scene', assignment?.assignee || 'Response team'), { message: 'Team has reached the location.', tone: 'info' })}>Team has arrived</button></div>}
      {dispatch?.stage === 'On scene' && <>
        {!recovered && <div className="follow-up-card"><h3>Check traffic after the response</h3><p>This demo adds a sample bus check showing normal traffic. It is not a live measurement.</p><div className="operation-actions"><button className="primary" disabled={busy || !observation || observation.baselineVehicleCount <= 0} onClick={() => run(() => policeTrafficService.recordFollowUp(id, assignment?.assignee || 'Response team'), 'Sample traffic check added.')}>Add demo traffic check</button></div></div>}
        <p id={followUpHintId} className="operation-meta">{recovered ? 'The follow-up check shows improvement. Send the outcome to the supervisor.' : 'A newer bus check must show traffic below twice the usual level before you can submit.'}</p>
        {recovered && <form className="operation-form" onSubmit={e => { e.preventDefault(); void run(() => workflowService.submitDemoResolution(event, summary.trim(), resultingCondition.trim()), 'Outcome sent to the supervisor.'); }}>
          <label>What the team did<textarea value={summary} onChange={e => setSummary(e.target.value)} disabled={busy} required/></label>
          <label>Traffic condition now<textarea value={resultingCondition} onChange={e => setResult(e.target.value)} disabled={busy} required/></label>
          <div className="operation-actions"><button className="primary" aria-describedby={followUpHintId} disabled={busy || !summary.trim() || !resultingCondition.trim()}>Send for supervisor check</button></div>
        </form>}
      </>}
      {resolution && <ResolutionReview event={event} actor="Police supervisor"/>}
      {dispatch?.stage === 'Verified' && <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => policeTrafficService.close(dispatch.id, 'Police supervisor'), 'Traffic case closed.')}>Close case</button></div>}
      {error && <p role="alert">{error}</p>}
      <details className="operation-history"><summary>Bus evidence & team details</summary><dl className="operation-facts">
        <div><dt>Original count</dt><dd>{observation ? `${observation.vehicleCount} vehicles · usual count ${observation.baselineVehicleCount}` : 'Unavailable'}</dd></div>
        <div><dt>Reported at</dt><dd>{observation ? formatDemoDate(observation.observedAt) : 'Unavailable'}</dd></div>
        <div><dt>Reporting buses</dt><dd>{observation?.sourceBusIds.join(', ') || 'Unavailable'}</dd></div>
        <div><dt>How the comparison works</dt><dd>Same road, {observation?.windowMinutes || 60}-minute window. Fixed demo figures, not a live city forecast.</dd></div>
        <div><dt>Response team</dt><dd>{team?.name || 'Not assigned'}{assignment && <> · {assignment.assignee}</>}</dd></div>
        {latest && <div><dt>Latest traffic check</dt><dd>{latest.vehicleCount} vehicles · {latest.averageSpeed} km/h · {formatDemoDate(latest.observedAt)}<br/>{latest.sourceBusIds.join(', ')}</dd></div>}
        {dispatch && <div><dt>Response requested</dt><dd>{formatDemoDate(dispatch.requestedAt)}</dd></div>}
        {assignment && <div><dt>Team assigned</dt><dd>{formatDemoDate(assignment.assignedAt)}</dd></div>}
        {resolution && <div><dt>Outcome submitted</dt><dd>{formatDemoDate(resolution.submittedAt)}</dd></div>}
        {review?.reviewedAt && <div><dt>Supervisor checked</dt><dd>{formatDemoDate(review.reviewedAt)}</dd></div>}
        {closedAt && <div><dt>Closed</dt><dd>{formatDemoDate(closedAt)}</dd></div>}
      </dl></details>
      <WorkflowHistory items={history}/>
    </section>
  </main></div>;
}