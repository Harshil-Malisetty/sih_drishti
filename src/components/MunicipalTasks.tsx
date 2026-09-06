import { useState } from 'react';
import { selectMunicipalTasks } from '../domain/operations';
import { selectAssignment } from '../domain/selectors';
import { formatDemoDate } from '../domain/time';
import { useCityData } from '../services/useCityData';
import type { MunicipalTask } from '../types/city';
import { EventThumbnail, eventPhaseLabel } from './EventThumbnail';
import '../styles-operations.css';

const filters = ['All', 'Needs action', 'Awaiting verification', 'Projects'] as const;
type TaskFilter = typeof filters[number];

export function MunicipalTasks({ onOpen }: { onOpen: (target: MunicipalTask['target']) => void }) {
  const { state } = useCityData();
  const [filter, setFilter] = useState<TaskFilter>('Needs action');
  const [showAll, setShowAll] = useState(false);
  const tasks = selectMunicipalTasks(state);
  const matches = (task: MunicipalTask, selected: TaskFilter) => selected === 'All'
    || (selected === 'Needs action' && task.actionRequired)
    || (selected === 'Awaiting verification' && task.kind === 'Verification')
    || (selected === 'Projects' && task.kind === 'Project');
  const filtered = tasks.filter(task => matches(task, filter));
  const visible = showAll ? filtered : filtered.slice(0, 3);

  return <section className="admin-tasks" aria-label="Needs your attention">
    <header><h2>Needs your attention</h2><span className="operation-meta" role="status">{tasks.filter(task => task.actionRequired).length} need action · {tasks.length} total</span></header>
    <div className="admin-task-filter" aria-label="Task filters">{filters.map(item => <button key={item} aria-pressed={filter === item} onClick={() => { setFilter(item); setShowAll(false); }}>{item} ({tasks.filter(task => matches(task, item)).length})</button>)}</div>
    {visible.map(task => {
      const assignment = task.target.kind === 'issue' ? selectAssignment(state, { kind: 'municipal', id: task.target.id }) : undefined;
      const issue = task.target.kind === 'issue' ? state.issues[task.target.id] : undefined;
      const title = issue && task.kind === 'Field action' && !task.actionRequired
        ? `${issue.defectType} — ${eventPhaseLabel(issue.workflowStage)}` : task.title;
      return <button className="admin-task event-scene-row" key={task.id} onClick={() => onOpen(task.target)}>
        <EventThumbnail category={issue?.kind || (task.target.kind === 'scenario' ? 'project' : 'obstruction')}/>
        <div className="event-copy"><strong>{title}</strong><span>{task.detail}</span>
        {assignment && <span>Assigned to {assignment.assignee} · {state.teams[assignment.teamId]?.name || assignment.teamId}</span>}
        <span>{task.kind} · {formatDemoDate(task.at)} · {task.target.kind === 'issue' ? 'Open issue' : 'Open scenario'}</span></div>
      </button>;
    })}
    {!filtered.length && <p className="operation-meta" role="status">No tasks in this filter.</p>}
    {filtered.length > 3 && <div className="operation-actions"><button className="secondary" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : `Show all (${filtered.length})`}</button></div>}
  </section>;
}