import { useId, useState } from 'react';
import { selectEventResolution } from '../domain/operations';
import { selectAssignment, selectTrafficAnomalies } from '../domain/selectors';
import { formatDemoDate } from '../domain/time';
import { policeTrafficService, workflowService } from '../services';
import { useCityData } from '../services/useCityData';
import { AppHeader } from './ui';
import { ResolutionReview, useOperation, WorkflowHistory } from './operations';

export function PoliceTrafficControl({ id, onBack }: { id: string; onBack: () => void }) {
  return <TrafficControlDetail key={id} id={id} onBack={onBack}/>;
}

function TrafficControlDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { state } = useCityData();
  const anomaly = selectTrafficAnomalies(state).find(item => item.id === id);
  const event = { kind: 'anomaly' as const, id };
  const assignment = selectAssignment(state, event);
  const { resolution, review } = selectEventResolution(state, event);
  const teams = Object.values(state.teams).filter(team => state.departments[team.departmentId]?.role === 'police' && ['traffic-investigation', 'central-response'].includes(team.id));
  const [teamId, setTeamId] = useState(assignment?.teamId || teams[0]?.id || '');
  const [assignee, setAssignee] = useState(assignment?.assignee || 'Traffic control lead');
  const [summary, setSummary] = useState('Traffic control intervention completed; follow-up pass reviewed.');
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
  const resultingCondition = result ?? (latest && recovered ? `${latest.densityLevel} traffic; ${latest.averageSpeed} km/h average speed; ${followUpRatio.toFixed(1)}× baseline at ${formatDemoDate(latest.observedAt)}.` : '');
  const history = [...anomaly.history, ...(dispatch?.history || [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const closedAt = dispatch?.stage === 'Closed' ? dispatch.history.at(-1)?.at : undefined;

  return <div className="police-workflow"><AppHeader title="Traffic control" subtitle={id} onBack={onBack}/><main className="page detail">
    <section className="operation-panel" aria-label="Police traffic workflow">
      <div className="operation-heading"><h2>{observation?.location || state.roadSegments[anomaly.roadSegmentId]?.name || 'Location unavailable'}</h2><span className="operation-state">{stage}</span></div>
      <p role="status" aria-live="polite">{busy ? 'Saving traffic control action…' : `Traffic control status: ${stage}.`}</p>
      <p>Observed traffic anomaly · officer verification required.</p>
      <div className="traffic-ratio"><div><span>Trigger / baseline</span><strong>{ratio === null ? 'Unavailable' : `${ratio.toFixed(1)}×`}</strong></div><div><span>Normal baseline</span><strong>{observation && observation.baselineVehicleCount > 0 ? '1.0×' : 'Unavailable'}</strong></div></div>
      <p><strong>{team?.name || 'No team assigned'}</strong><br/><span className="operation-meta">{history.at(-1)?.action} · {formatDemoDate(history.at(-1)?.at || anomaly.detectedAt)}</span></p>
      <details className="operation-history"><summary>Observation evidence and timestamps</summary><dl className="operation-facts">
        <div><dt>Trigger observation</dt><dd>{observation ? `${observation.id} · ${observation.vehicleCount} vehicles / ${observation.baselineVehicleCount} baseline` : 'Observation unavailable'}</dd></div>
        <div><dt>Observed at</dt><dd>{observation ? formatDemoDate(observation.observedAt) : 'Unavailable'}</dd></div>
        <div><dt>Observation source</dt><dd>{observation?.sourceBusIds.length ? `Fleet buses: ${observation.sourceBusIds.join(', ')}` : 'Source unavailable'}</dd></div>
        <div><dt>Baseline source / window</dt><dd>{observation ? `${observation.baselineSource} · ${observation.windowMinutes} minutes` : 'Unavailable'}</dd></div>
        <div><dt>Trigger traffic</dt><dd>{observation ? `${observation.densityLevel} · ${observation.averageSpeed} km/h` : 'Unavailable'}</dd></div>
        <div><dt>Responding team</dt><dd>{team?.name || 'Not assigned'}{assignment && <><br/>{assignment.assignee}</>}</dd></div>
        {dispatch && <div><dt>Dispatch requested</dt><dd>{formatDemoDate(dispatch.requestedAt)}</dd></div>}
        {assignment && <div><dt>Assigned at</dt><dd>{formatDemoDate(assignment.assignedAt)}</dd></div>}
        {resolution && <div><dt>Field resolution submitted</dt><dd>{formatDemoDate(resolution.submittedAt)}</dd></div>}
        {review?.decision === 'Verified' && review.reviewedAt && <div><dt>Verified at</dt><dd>{formatDemoDate(review.reviewedAt)}</dd></div>}
        {closedAt && <div><dt>Closed at</dt><dd>{formatDemoDate(closedAt)}</dd></div>}
      </dl></details>
      {!observation && <p role="alert">The triggering observation is unavailable. Traffic actions cannot proceed without its evidence.</p>}
      {!dispatch && anomaly.status === 'Candidate' && <div className="operation-actions"><button className="primary" disabled={busy || !observation} onClick={() => run(() => policeTrafficService.qualify(id, 'Traffic operator'), { message: 'Traffic anomaly qualified for dispatch.', tone: 'info' })}>Flag for dispatch</button></div>}
      {!dispatch && anomaly.status === 'Qualified' && <div className="operation-actions"><button className="primary" disabled={busy || !observation} onClick={() => run(() => policeTrafficService.requestDispatch(id, 'Traffic operator'), { message: 'Dispatch requested. Assign a traffic team.', tone: 'info' })}>Request dispatch</button></div>}
      {dispatch?.stage === 'Requested' && <div className="operation-form">
        <label>Police traffic team<select value={teamId} onChange={e => setTeamId(e.target.value)} disabled={busy || !teams.length}>
          <option value="" disabled>Select a traffic team</option>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Assignee (required)<input value={assignee} onChange={e => setAssignee(e.target.value)} disabled={busy} required/></label>
        {!teams.length && <p role="status">No eligible police traffic teams are available. A traffic investigation or central response team is required.</p>}
        <div className="operation-actions"><button className="primary" disabled={busy || !teams.some(item => item.id === teamId) || !assignee.trim()} onClick={() => run(() => policeTrafficService.assign(id, teamId, assignee.trim()), { message: 'Traffic team assigned.', tone: 'info' })}>Assign traffic team</button></div>
      </div>}
      {dispatch?.stage === 'Assigned' && <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => policeTrafficService.advanceDispatch(dispatch.id, 'En route', 'Traffic operator'), { message: 'Traffic team is en route.', tone: 'info' })}>Mark en route</button></div>}
      {dispatch?.stage === 'En route' && <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => policeTrafficService.advanceDispatch(dispatch.id, 'On scene', 'Traffic operator'), { message: 'Traffic team is on scene.', tone: 'info' })}>Mark on scene</button></div>}
      {latest && <section aria-label="Latest shared follow-up observation">
        <h3>Latest shared follow-up observation</h3>
        <dl className="operation-facts">
          <div><dt>Resulting density / speed</dt><dd>{latest.densityLevel} · {latest.averageSpeed} km/h</dd></div>
          <div><dt>Observed at</dt><dd>{formatDemoDate(latest.observedAt)}</dd></div>
          <div><dt>Traffic / baseline</dt><dd>{followUpRatio === null ? 'Ratio unavailable' : `${followUpRatio.toFixed(1)}×`} · {latest.vehicleCount} / {latest.baselineVehicleCount} vehicles</dd></div>
          <div><dt>Shared observation / source</dt><dd>{latest.id} · {latest.sourceBusIds.join(', ') || 'Source unavailable'}</dd></div>
        </dl>
      </section>}
      {dispatch?.stage === 'On scene' && <>
        <p>Record demo follow-up pass adds one fixed observation at the trigger’s baseline vehicle count, Free density and 42 km/h. It is explicit demo data, not a random measurement or an automatic consequence of resolving the event.</p>
        <div className="operation-actions"><button className="secondary" disabled={busy || !observation || observation.baselineVehicleCount <= 0 || recovered} onClick={() => run(() => policeTrafficService.recordFollowUp(id, 'Traffic operator'), 'Follow-up observation recorded.')}>{recovered ? 'Normalizing follow-up recorded' : 'Record demo follow-up pass'}</button></div>
        <p id={followUpHintId}>{recovered ? 'A newer shared observation is below 2.0× baseline. Submit the field resolution for admin review; it will not close the event.' : 'Before marking resolved, record a follow-up pass. The latest shared observation must be newer than the trigger and below 2.0× baseline.'}</p>
        <div className="operation-form">
          <label>Resolution summary (required)<textarea value={summary} onChange={e => setSummary(e.target.value)} disabled={busy} required/></label>
          <label>Resulting condition (required)<textarea value={resultingCondition} onChange={e => setResult(e.target.value)} disabled={busy} required/></label>
          <div className="operation-actions"><button className="primary" aria-describedby={followUpHintId} disabled={busy || !recovered || !summary.trim() || !resultingCondition.trim()} onClick={() => run(() => workflowService.submitDemoResolution(event, summary.trim(), resultingCondition.trim()), 'Resolution submitted. Supervisor review requested.')}>Mark resolved</button></div>
        </div>
      </>}
      {resolution && <ResolutionReview event={event} actor="Police supervisor"/>}
      {dispatch?.stage === 'Verified' && <>
        <p>Resolution verified. Close the traffic event separately to retain the responding team, evidence and timestamps in its record.</p>
        <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => policeTrafficService.close(dispatch.id, 'Traffic operator'), 'Traffic event closed.')}>Close event</button></div>
      </>}
      {dispatch?.stage === 'Closed' && <p><strong>Closed traffic-control event.</strong> {resolution?.summary} The responding team and action history remain available above and below.</p>}
      {error && <p role="alert">{error}</p>}
      <WorkflowHistory items={history}/>
    </section>
  </main></div>;
}