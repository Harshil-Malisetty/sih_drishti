import { useState } from 'react';
import { emergencyEligible, selectEmergency } from '../domain/operations';
import { formatDemoDate } from '../domain/time';
import { emergencyService } from '../services';
import { useCityData } from '../services/useCityData';
import type { EventRef } from '../types/city';
import { useOperation, WorkflowHistory } from './operations';

export function EmergencyDispatchPanel({ event, actor }: { event: EventRef; actor: string }) {
  return <EmergencyDispatchWorkflow key={`${event.kind}-${event.id}`} event={event} actor={actor}/>;
}

function EmergencyDispatchWorkflow({ event, actor }: { event: EventRef; actor: string }) {
  const { state } = useCityData();
  const dispatch = selectEmergency(state, event);
  const [reason, setReason] = useState('');
  const [teamId, setTeamId] = useState('');
  const [outcome, setOutcome] = useState('');
  const { busy, error, run } = useOperation({ message: 'Emergency response state updated.', tone: 'info' });
  if (!dispatch && !emergencyEligible(state, event)) return null;

  const teams = Object.values(state.teams).filter(team => state.departments[team.departmentId]?.role === 'response');
  const unavailable = (id: string) => Object.values(state.emergencyDispatches).some(item => item.teamId === id && item.stage !== 'Discharged');
  const availableTeams = teams.filter(team => !unavailable(team.id));
  const selectedTeamId = teamId || availableTeams[0]?.id || '';
  const selectedTeamAvailable = availableTeams.some(team => team.id === selectedTeamId);
  const team = dispatch?.teamId ? state.teams[dispatch.teamId] : undefined;
  const incident = event.kind === 'incident' ? state.incidents[event.id] : undefined;
  const resolvedAt = dispatch?.resolvedAt || incident?.resolvedAt;

  return <section className="operation-panel emergency-panel" aria-label="Emergency response">
    <div className="operation-heading"><h2>Emergency response</h2><span className="operation-state">{dispatch?.stage || 'Manual request'}</span></div>
    <p role="status" aria-live="polite">{busy ? 'Saving emergency response action…' : resolvedAt ? 'Event resolved after team release.' : dispatch ? `Emergency response: ${dispatch.stage}.` : 'No emergency team dispatched.'}</p>
    {!dispatch ? <>
      <p>This event is eligible for a manual, coordinated response request. Fleet observations do not automatically declare an emergency or dispatch a team. This demo does not contact real emergency services.</p>
      <div className="operation-form">
        <label>Reason for emergency response (required)<textarea value={reason} onChange={e => setReason(e.target.value)} disabled={busy} required/></label>
        <div className="operation-actions"><button className="primary" disabled={busy || !reason.trim()} onClick={() => run(() => emergencyService.request(event, reason.trim(), actor), { message: 'Emergency response requested. No real service is contacted.', tone: 'info' })}>Dispatch emergency team</button></div>
      </div>
    </> : <>
      <p><strong>Request reason:</strong> {dispatch.reason}</p>
      <dl className="operation-facts">
        <div><dt>Response team</dt><dd>{team?.name || (dispatch.teamId ? 'Team unavailable' : 'Not assigned')}</dd></div>
        <div><dt>Requested</dt><dd>{formatDemoDate(dispatch.requestedAt)}</dd></div>
        {dispatch.completedAt && <div><dt>Response completed</dt><dd>{formatDemoDate(dispatch.completedAt)}</dd></div>}
        {dispatch.dischargedAt && <div><dt>Team released</dt><dd>{formatDemoDate(dispatch.dischargedAt)}</dd></div>}
        {resolvedAt && <div><dt>Event resolved</dt><dd>{formatDemoDate(resolvedAt)}</dd></div>}
      </dl>
      {dispatch.outcome && <p><strong>Response outcome:</strong> {dispatch.outcome}</p>}
      {dispatch.stage === 'Requested' && <div className="operation-form">
        <label>Emergency response team<select value={selectedTeamId} onChange={e => setTeamId(e.target.value)} disabled={busy || !availableTeams.length}>
          <option value="" disabled>Select an available response team</option>
          {teams.map(item => <option key={item.id} value={item.id} disabled={unavailable(item.id)}>{item.name}{unavailable(item.id) ? ' — busy until discharged' : ''}</option>)}
        </select></label>
        {!availableTeams.length && <p role="status">{teams.length ? 'All emergency response teams are busy. Complete their response and discharge a team before assigning it here.' : 'No emergency response teams are configured. This request remains pending until a response team is available.'}</p>}
        {availableTeams.length > 0 && !selectedTeamAvailable && <p role="status">The selected team is unavailable. Choose another available response team.</p>}
        <div className="operation-actions"><button className="primary" disabled={busy || !selectedTeamAvailable} onClick={() => run(() => emergencyService.assign(dispatch.id, selectedTeamId, actor), { message: 'Emergency response team assigned.', tone: 'info' })}>Assign emergency team</button></div>
      </div>}
      {dispatch.stage === 'Assigned' && <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => emergencyService.advance(dispatch.id, 'En route', actor))}>Mark emergency team en route</button></div>}
      {dispatch.stage === 'En route' && <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => emergencyService.advance(dispatch.id, 'On scene', actor))}>Mark emergency team on scene</button></div>}
      {dispatch.stage === 'On scene' && <div className="operation-form">
        <label>Response outcome (required)<textarea value={outcome} onChange={e => setOutcome(e.target.value)} disabled={busy} required/></label>
        <div className="operation-actions"><button className="primary" disabled={busy || !outcome.trim()} onClick={() => run(() => emergencyService.advance(dispatch.id, 'Response complete', actor, outcome.trim()))}>Complete response</button></div>
      </div>}
      {dispatch.stage === 'Response complete' && <>
        <p>The response is complete, but the team remains assigned until discharged. The event is not yet resolved.</p>
        <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => emergencyService.advance(dispatch.id, 'Discharged', actor))}>Discharge team</button></div>
      </>}
      {dispatch.stage === 'Discharged' && <>
        <p>{team?.name || 'Response team'} released{dispatch.dischargedAt ? ` · ${formatDemoDate(dispatch.dischargedAt)}` : ''}.</p>
        {event.kind === 'municipal' && <p>Emergency team discharge does not resolve the municipal issue. Departmental field resolution and admin review remain required before closure.</p>}
        {event.kind === 'incident' && !resolvedAt && <>
          <p>The team is released. Resolve the incident separately to remove it from the active queue.</p>
          <div className="operation-actions"><button className="primary" disabled={busy} onClick={() => run(() => emergencyService.resolveIncident(dispatch.id, actor), 'Incident resolved after team release.')}>Resolve event</button></div>
        </>}
      </>}
      <WorkflowHistory items={dispatch.history}/>
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}