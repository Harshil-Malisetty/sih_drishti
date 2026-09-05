import { useState } from 'react';
import { formatDemoDate } from '../domain/time';
import { municipalService } from '../services';
import { useCityData } from '../services/useCityData';
import type { MunicipalProject, PlanningScenario } from '../types/city';
import { useOperation } from './operations';

export function ProjectApproval({ scenarioId }: { scenarioId: string }) {
  const { state } = useCityData();
  const scenario = state.scenarios[scenarioId];
  const project = Object.values(state.projects).find(item => item.scenarioId === scenarioId);
  if (!scenario || !project) return <p role="status">Project approval unavailable for this saved scenario.</p>;
  return <ApprovalForm key={project.id} project={project} scenario={scenario} />;
}

function ApprovalForm({ project, scenario }: { project: MunicipalProject; scenario: PlanningScenario }) {
  const { state, mobility } = useCityData();
  const [title, setTitle] = useState(project.title);
  const [projectType, setProjectType] = useState(project.projectType);
  const { busy, error, run } = useOperation();
  const draft = project.status === 'Draft';
  const expired = Date.parse(scenario.endsAt) <= Date.parse(state.now);
  const publicProject = mobility.projects.find(item => item.projectId === project.id);
  const sourceRoads = [scenario.inputs.road, ...scenario.inputs.connected];

  return <section className="project-approval" aria-label="Project approval" aria-busy={busy}>
    <div className="operation-heading"><h2>Project approval</h2><span className="operation-state" role="status">{project.status}</span></div>
    {draft ? <form className="operation-form" onSubmit={e => {
      e.preventDefault();
      void run(() => municipalService.approveProject(project.id, 'Municipal admin', { title: title.trim(), projectType }));
    }}>
      <label>Project title<input value={title} onChange={e => setTitle(e.target.value)} disabled={busy} required /></label>
      <label>Project type<select value={projectType} disabled={busy} onChange={e => setProjectType(e.target.value as MunicipalProject['projectType'])}><option>Road works</option><option>Resurfacing</option></select></label>
      <p>Draft only — not published to Citizens. Approval publishes this saved scenario, not a new calculation.</p>
      {expired && <p role="status">This project window has ended. Run a new scenario before approval.</p>}
      <div className="operation-actions"><button className="primary" disabled={busy || !title.trim() || expired}>Approve project</button></div>
    </form> : <p><strong>{project.title}</strong><br/>{project.projectType}</p>}
    <dl className="operation-facts">
      <div><dt>Start · IST</dt><dd>{formatDemoDate(scenario.startsAt)}</dd></div>
      <div><dt>End · IST</dt><dd>{formatDemoDate(scenario.endsAt)}</dd></div>
      <div><dt>Saved closure</dt><dd>{scenario.inputs.road.name} · {scenario.duration}</dd></div>
      <div><dt>Peak impact</dt><dd>+{scenario.delay} min · {scenario.affected.length} affected corridors</dd></div>
    </dl>
    <details className="operation-history"><summary>Saved impacts and source summary</summary>
      <p>{scenario.scenarioLabel} · {scenario.modelVersion} · {scenario.confidence} confidence</p>
      <p className="operation-meta">Snapshot saved {formatDemoDate(scenario.createdAt)} · {scenario.inputs.observationIds.length} traffic observations · {scenario.inputs.road.observedPasses.toLocaleString()} fleet passes on the selected corridor. Uses recorded traffic, capacity and connected roads; an illustrative planning estimate, not a citywide prediction.</p>
      <ul>{scenario.affected.map(impact => <li key={impact.roadSegmentId}><p><strong>{sourceRoads.find(road => road.id === impact.roadSegmentId)?.name || impact.roadSegmentId}</strong><br/>{impact.restriction} · +{impact.delayMinutes} min · +{impact.additionalVehicles} vehicles/hr · {impact.severity}</p></li>)}</ul>
      <p className="operation-meta">Source observations: {scenario.inputs.observationIds.join(', ') || 'No linked observation; recorded baseline used'}. Bus routes: {scenario.busRoutes.join(', ') || 'None recorded'}.</p>
    </details>
    {project.approvedAt && <p className="operation-meta">Approved by {project.approvedBy} · {formatDemoDate(project.approvedAt)}</p>}
    {project.publishedAt && <p className="operation-meta">Published to Citizens · {formatDemoDate(project.publishedAt)} IST</p>}
    {project.status === 'Approved' && <p role="status"><strong>Citizen impact notice</strong><br/>{publicProject?.status === 'Active' ? 'Active: approved road restrictions and delays are now available in Citizen mobility.' : publicProject?.status === 'Completed' || expired ? 'Window ended: no active Citizen restriction remains.' : 'Scheduled: the approved project is published; restrictions apply during its saved start and end window.'}</p>}
    {project.status === 'Cancelled' && <p role="status">Project withdrawn · Citizen project notice and restrictions removed.</p>}
    {project.status !== 'Cancelled' && <div className="operation-actions"><button className="secondary" disabled={busy} onClick={() => run(() => municipalService.cancelProject(project.id))}>Cancel project</button></div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}