import { useEffect, useRef } from 'react';
import { ArrowRight, TrafficCone, X } from 'lucide-react';
import type { PublicMunicipalProject } from '../types/city';
import { formatDemoDate } from '../domain/time';
import '../styles-operations.css';

function ProjectSchedule({ project }: { project: PublicMunicipalProject }) {
  return <dl className="operation-facts">
    <div><dt>Starts (IST)</dt><dd><time dateTime={project.startsAt}>{formatDemoDate(project.startsAt)}</time></dd></div>
    <div><dt>Ends (IST)</dt><dd><time dateTime={project.endsAt}>{formatDemoDate(project.endsAt)}</time></dd></div>
  </dl>;
}

export function CitizenWorkCard({ projects, openProject }: {
  projects: PublicMunicipalProject[];
  openProject: (projectId: string) => void;
}) {
  const upcoming = projects.filter(project => project.status !== 'Completed');
  const featured = upcoming.find(project => project.status === 'Active') ?? upcoming[0];
  if (!featured) return null;
  return <section className="citizen-work-card" aria-label="Approved municipal work">
    <div className="operation-heading"><h2><TrafficCone size={16} aria-hidden="true"/> Approved road work</h2><span className="operation-state">{featured.status}</span></div>
    <strong>{featured.title}</strong>
    <p>{featured.roadName} · {featured.projectType}</p>
    <ProjectSchedule project={featured}/>
    <p>{featured.status === 'Planned' ? 'Scheduled work; not an active road restriction.' : 'Active approved work; check corridor restrictions before travelling.'}</p>
    <p className="operation-meta">Source: {featured.source}</p>
    <div className="operation-actions"><button className="primary" onClick={() => openProject(featured.projectId)} aria-label={`View ${featured.title} and all approved work on the map`}>View work on map <ArrowRight size={16} aria-hidden="true"/></button></div>
    <p className="operation-meta">{upcoming.length} active or planned {upcoming.length === 1 ? 'project' : 'projects'} · All approved work available in the map list.</p>
  </section>;
}

export function CitizenProjectPicker({ projects, selectedProjectId, onSelect }: {
  projects: PublicMunicipalProject[];
  selectedProjectId?: string;
  onSelect: (projectId: string) => void;
}) {
  const visible = projects.filter(project => project.status !== 'Completed');
  if (!visible.length) return null;
  return <section className="citizen-project-picker" aria-label="Approved municipal projects">
    <p className="operation-meta" style={{ margin: 0, padding: 8, background: '#fff' }}>Municipal work · schematic corridor positions</p>
    {visible.length === 0 ? null :
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
        {visible.map(project => <li key={project.projectId}><button
          id={`citizen-project-${project.projectId}`}
          style={{ width: '100%' }}
          aria-pressed={selectedProjectId === project.projectId}
          aria-label={`${project.title}, ${project.roadName}, ${project.projectType}, ${project.status}. Show project details`}
          onClick={() => onSelect(project.projectId)}
        >{project.title} · {project.roadName} · {project.status}</button></li>)}
      </ul>}
  </section>;
}

export function CitizenProjectSheet({ project, hasMarker, onDismiss, findRoute }: {
  project: PublicMunicipalProject;
  hasMarker: boolean;
  onDismiss: () => void;
  findRoute: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [project.projectId]);
  const active = project.status === 'Active';
  const completed = project.status === 'Completed';
  return <section className="bottom-sheet citizen-project-sheet" aria-live="polite" aria-labelledby="citizen-project-title">
    <i className="handle" aria-hidden="true"/>
    <div className="operation-heading">
      <div><span className="sheet-eyebrow">APPROVED MUNICIPAL WORK · {project.status.toUpperCase()}</span><h3 id="citizen-project-title" ref={heading} tabIndex={-1}>{project.title}</h3></div>
      <button onClick={onDismiss} aria-label="Close project details and return to traffic details" style={{ minWidth: 44, minHeight: 44 }}><X size={18} aria-hidden="true"/></button>
    </div>
    <p><strong>{project.roadName}</strong> · {project.projectType}</p>
    <ProjectSchedule project={project}/>
    <p>{active ? `Road work underway. Expected through ${formatDemoDate(project.endsAt)}. Expect delays on affected corridors.` : completed ? 'Completed work. These restrictions no longer contribute to current route estimates.' : 'Scheduled work. The restrictions below are planned, not active; they do not affect current route estimates.'}</p>
    <strong>{completed ? 'Previously affected corridors' : active ? 'Affected corridors' : 'Scheduled corridor impacts'}</strong>
    {project.affectedCorridors.length ? <ul>{project.affectedCorridors.map(corridor => <li key={corridor.roadSegmentId}>
      <strong>{corridor.name}</strong> · {corridor.restriction === 'Closed'
        ? active ? 'Road closed during work' : completed ? 'Closure ended' : 'Closure scheduled during work'
        : `${completed ? 'Previously estimated' : 'Estimated'} additional delay: ${corridor.delayMinutes} min${active ? '' : ' during work'}`}
    </li>)}</ul> : <p>No corridor impact details published.</p>}
    {!completed && (project.alternativeCorridors.length ? <p><strong>Alternative corridors:</strong> {project.alternativeCorridors.join(', ')}. Advisory corridors only; check current conditions.</p> : <p>No supported alternative corridors published for this project.</p>)}
    <p className="operation-meta">Source: {project.source}. Schematic/advisory context only.{!hasMarker && ' This project has no active marker at a supported schematic road position; details remain available here.'}</p>
    {!completed && <><div className="operation-actions"><button className="primary" onClick={findRoute}>Find alternative route <ArrowRight size={16} aria-hidden="true"/></button></div><p className="operation-meta">Checks the existing demo journey, not a new route from this worksite.{!active && ' Only currently active restrictions are included.'}</p></>}
  </section>;
}

export function CitizenRouteProjects({ projects, projectIds, openProject }: {
  projects: PublicMunicipalProject[];
  projectIds: string[];
  openProject: (projectId: string) => void;
}) {
  const sources = projects.filter(project => projectIds.includes(project.projectId) && project.status === 'Active');
  if (!sources.length) return null;
  return <div>
    <p className="operation-meta">Approved work considered · Source: Municipal planning system</p>
    <div className="operation-actions">{sources.map(project => <button className="secondary" key={project.projectId} onClick={() => openProject(project.projectId)} aria-label={`View approved project ${project.title} on the map`}>{project.title}</button>)}</div>
  </div>;
}