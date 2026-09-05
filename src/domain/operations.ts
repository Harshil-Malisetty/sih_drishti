import type { CityState, EventRef, MunicipalTask } from '../types/city';

export const sameEvent = (a: EventRef, b: EventRef) => a.kind === b.kind && a.id === b.id;
export function selectEmergency(state: CityState, event: EventRef) {
  return Object.values(state.emergencyDispatches).find(dispatch => sameEvent(dispatch.event, event));
}
export function emergencyEligible(state: CityState, event: EventRef): boolean {
  if (event.kind === 'municipal') {
    const issue = state.issues[event.id];
    return !!issue && issue.severity === 'Critical' && ['Qualified','Assigned','Acknowledged','In progress'].includes(issue.workflowStage);
  }
  if (event.kind === 'incident') {
    const incident = state.incidents[event.id];
    return !!incident && ['High','Critical'].includes(incident.severity) && ['Open','Investigating'].includes(incident.status);
  }
  // An elevated traffic ratio alone does not warrant emergency response.
  return false;
}
export function selectEventResolution(state: CityState, event: EventRef) {
  const resolution = Object.values(state.resolutions).filter(item => sameEvent(item.event, event)).at(-1);
  const review = resolution && Object.values(state.reviews).find(item => item.resolutionId === resolution.id);
  return { resolution, review };
}
export function selectMunicipalTasks(state: CityState): MunicipalTask[] {
  const tasks: MunicipalTask[] = [];
  for (const issue of Object.values(state.issues)) {
    const { resolution, review } = selectEventResolution(state, { kind: 'municipal', id: issue.id });
    const at = issue.history.at(-1)?.at || state.now;
    const target = { kind: 'issue' as const, id: issue.id };
    if (issue.workflowStage === 'Admin review') {
      tasks.push({ id: `review-${review?.id || issue.id}`, kind: 'Verification', title: `${issue.defectType} — resolution awaiting verification`, detail: `${issue.location} · ${state.departments[issue.departmentId].name} · ${resolution?.summary || 'Field completion submitted'}`, at: review?.notifiedAt || at, actionRequired: true, target });
    } else if (issue.workflowStage === 'Verified') {
      tasks.push({ id: `close-${issue.id}`, kind: 'Closure', title: `${issue.defectType} — verified, ready to close`, detail: `${issue.location} · Citizen condition updated`, at, actionRequired: true, target });
    } else if (issue.workflowStage === 'Closed') {
      tasks.push({ id: `public-${issue.id}`, kind: 'Citizen update', title: `${issue.defectType} — closed`, detail: `${issue.location} · Verified condition available to Citizens`, at, actionRequired: false, target });
    } else {
      const unassigned = ['Detected','Qualified'].includes(issue.workflowStage);
      tasks.push({ id: `issue-${issue.id}`, kind: unassigned ? 'Assignment' : 'Field action', title: `${issue.defectType} — ${unassigned ? 'assignment required' : issue.workflowStage}`, detail: `${issue.location} · ${state.departments[issue.departmentId].name}`, at, actionRequired: unassigned, target });
    }
  }
  for (const project of Object.values(state.projects)) {
    const scenario = state.scenarios[project.scenarioId];
    const active = project.status === 'Approved' && Date.parse(scenario.startsAt) <= Date.parse(state.now) && Date.parse(state.now) < Date.parse(scenario.endsAt);
    const ended = Date.parse(state.now) >= Date.parse(scenario.endsAt);
    const detail = project.status === 'Cancelled' ? 'Cancelled · Citizen restriction removed' : ended ? 'Window ended · no active Citizen restriction' : active ? 'Approved · active Citizen road restriction' : project.status === 'Approved' ? 'Approved · scheduled Citizen restriction' : 'Scenario ready for admin approval';
    tasks.push({ id: `project-${project.id}`, kind: 'Project', title: project.title, detail, at: project.approvedAt || project.createdAt, actionRequired: project.status === 'Draft' && !ended, target: { kind: 'scenario', id: scenario.id } });
  }
  return tasks.sort((a,b) => Number(b.actionRequired) - Number(a.actionRequired) || Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
}