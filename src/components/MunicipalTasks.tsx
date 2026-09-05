import { useState } from 'react';
import { selectMunicipalTasks } from '../domain/operations';
import { selectAssignment } from '../domain/selectors';
import { formatDemoDate } from '../domain/time';
import { useCityData } from '../services/useCityData';
import type { MunicipalTask } from '../types/city';
import '../styles-operations.css';

const filters = ['All', 'Needs action', 'Awaiting verification', 'Projects'] as const;
type TaskFilter = typeof filters[number];

export function MunicipalTasks({ onOpen }: { onOpen: (target: MunicipalTask['target']) => void }) {
  const { state } = useCityData();
  const [filter, setFilter] = useState<TaskFilter>('All');
  const [showAll, setShowAll] = useState(false);
  const tasks = selectMunicipalTasks(state);
  const matches = (task: MunicipalTask, selected: TaskFilter) => selected === 'All'
    || (selected === 'Needs action' && task.actionRequired)
    || (selected === 'Awaiting verification' && task.kind === 'Verification')
    || (selected === 'Projects' && task.kind === 'Project');
  const filtered = tasks.filter(task => matches(task, filter));
  const visible = showAll ? filtered : filtered.slice(0, 3);

  return <section className="admin-tasks" aria-label="Municipal tasks">
    <header><h2>Municipal tasks</h2><span className="operation-meta" role="status">{tasks.filter(task => task.actionRequired).length} need action · {tasks.length} total</span></header>
    <div className="admin-task-filter" aria-label="Task filters">{filters.map(item => <button key={item} aria-pressed={filter === item} onClick={() => { setFilter(item); setShowAll(false); }}>{item} ({tasks.filter(task => matches(task, item)).length})</button>)}</div>
    {visible.map(task => {
      const assignment = task.target.kind === 'issue' ? selectAssignment(state, { kind: 'municipal', id: task.target.id }) : undefined;
      return <button className="admin-task" key={task.id} onClick={() => onOpen(task.target)}>
        <strong>{task.title}</strong><span>{task.detail}</span>
        {assignment && <span>Assigned to {assignment.assignee} · {state.teams[assignment.teamId]?.name || assignment.teamId}</span>}
        <span>{task.kind} · {formatDemoDate(task.at)} · {task.target.kind === 'issue' ? 'Open issue' : 'Open scenario'}</span>
      </button>;
    })}
    {!filtered.length && <p className="operation-meta" role="status">No tasks in this filter.</p>}
    {filtered.length > 3 && <div className="operation-actions"><button className="secondary" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Show less' : `Show all (${filtered.length})`}</button></div>}
  </section>;
}