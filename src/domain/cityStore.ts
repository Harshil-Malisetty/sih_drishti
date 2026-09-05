import type { AdminReview, CitizenReportInput, CityState, CityTrafficObservation, DispatchStage, EmergencyStage, EventRef, MunicipalProject, ResolutionEvidence } from '../types/city';
import { calculateScenario } from './planning';
import { selectAssignment } from './selectors';
import { emergencyEligible, selectEmergency } from './operations';
import { reportCategories, reportRecipient, type ReportRecipient } from './citizenReports';

export type CityCommand =
  | { type: 'submitCitizenReport'; input: CitizenReportInput }
  | { type: 'resolveCitizenIncident'; incidentId: string; actor: string; note: string }
  | { type: 'reviewCitizenReport'; reportId: string; decision: 'Accepted' | 'Dismissed'; note: string; reviewerRole?: ReportRecipient }
  | { type: 'qualifyIssue'; issueId: string; actor: string }
  | { type: 'closeIssue'; issueId: string; actor: string }
  | { type: 'closeDispatch'; dispatchId: string; actor: string }
  | { type: 'observeRecovery'; anomalyId: string; actor: string }
  | { type: 'requestEmergency'; event: EventRef; reason: string; actor: string }
  | { type: 'assignEmergency'; dispatchId: string; teamId: string; actor: string }
  | { type: 'advanceEmergency'; dispatchId: string; stage: Exclude<EmergencyStage, 'Requested' | 'Assigned'>; actor: string; outcome?: string }
  | { type: 'resolveEmergencyIncident'; dispatchId: string; actor: string }
  | { type: 'assign'; event: EventRef; teamId: string; assignee: string }
  | { type: 'acknowledge'; issueId: string }
  | { type: 'startFieldWork'; issueId: string }
  | { type: 'submitResolution'; event: EventRef; submittedBy: string; summary: string; resultingCondition: string; evidence: ResolutionEvidence[] }
  | { type: 'reviewResolution'; reviewId: string; decision: Exclude<AdminReview['decision'], 'Pending'>; reviewer: string; note: string }
  | { type: 'decideMatch'; matchId: string; decision: 'Verified' | 'Dismissed' }
  | { type: 'qualifyAnomaly'; anomalyId: string; actor: string }
  | { type: 'requestDispatch'; anomalyId: string; actor: string }
  | { type: 'advanceDispatch'; dispatchId: string; stage: 'En route' | 'On scene'; actor: string }
  | { type: 'recordTraffic'; observation: CityTrafficObservation }
  | { type: 'createScenario'; roadSegmentId: string; duration: string; startsAt?: string }
  | { type: 'approveProject'; projectId: string; actor: string; title?: string; projectType?: MunicipalProject['projectType'] }
  | { type: 'cancelProject'; projectId: string }
  | { type: 'setTime'; now: string };

const sameEvent = (a: EventRef, b: EventRef) => a.kind === b.kind && a.id === b.id;
function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
function text(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required`);
}
function validTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error('An explicit ISO timestamp is required');
}
function activeDispatch(state: CityState, anomalyId: string) {
  return Object.values(state.dispatches).find(dispatch => dispatch.anomalyId === anomalyId);
}
function eventDepartment(state: CityState, event: EventRef): string {
  if (event.kind === 'municipal') return required(state.issues[event.id], 'Unknown municipal issue').departmentId;
  if (event.kind === 'incident') required(state.incidents[event.id], 'Unknown incident');
  else required(state.anomalies[event.id], 'Unknown anomaly');
  return 'traffic-police';
}
function pendingReview(state: CityState, event: EventRef) {
  return Object.values(state.reviews).find(review => review.decision === 'Pending' && sameEvent(state.resolutions[review.resolutionId].event, event));
}

/** Pure, atomic commands. Rejected commands never alter the previous snapshot. */
export function reduceCity(state: CityState, command: CityCommand): CityState {
  const next = structuredClone(state);
  const sequence = state.revision + 1;
  // Logical time advances only on explicit commands, never wall-clock timers or screen mounts.
  next.now = new Date(Date.parse(state.now) + 60_000).toISOString();
  const id = (prefix: string) => `${prefix}-${String(sequence).padStart(4, '0')}`;
  switch (command.type) {
    case 'submitCitizenReport': {
      const input = command.input;
      const segment = required(next.roadSegments[input.roadSegmentId], 'Choose a supported road location');
      if (!segment.points.length || segment.points.some(point => point.length !== 2 || !point.every(Number.isFinite))) throw new Error('Road location has no valid geometry');
      if (!Object.hasOwn(reportCategories, input.category)) throw new Error('Choose a report category');
      if (input.description.trim().length < 10 || input.description.length > 1000) throw new Error('Describe the issue in 10–1000 characters');
      const image = input.image ?? '';
      if (image && (image.length > 2_800_000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image))) throw new Error('Use a JPEG, PNG or WebP photo up to 2 MB, or submit without a photo');
      if (Object.values(next.citizenReports).filter(report => report.status === 'Pending').length >= 20) throw new Error('The demo report queue is full. Review pending reports first.');
      next.citizenReports[id('CIT')] = { roadSegmentId: input.roadSegmentId, category: input.category, image, description: input.description.trim(), id: id('CIT'), submittedAt: next.now, status: 'Pending' };
      break;
    }
    case 'reviewCitizenReport': {
      const report = required(next.citizenReports[command.reportId], 'Unknown citizen report');
      if ((command.reviewerRole ?? 'municipal') !== reportRecipient(report.category)) throw new Error('Review this report in its responsible workspace');
      text(command.note, 'Triage note');
      if (report.status !== 'Pending') throw new Error('This report has already been reviewed');
      if (!['Accepted', 'Dismissed'].includes(command.decision)) throw new Error('Invalid triage decision');
      report.status = command.decision; report.reviewNote = command.note.trim();
      if (command.decision === 'Accepted') {
        const segment = next.roadSegments[report.roadSegmentId];
        const [latitude, longitude] = segment.points[Math.floor(segment.points.length / 2)];
        if (report.category === 'traffic-obstruction') {
          const incidentId = id('INC'); report.incidentId = incidentId;
          next.incidents[incidentId] = { id: incidentId, citizenReportId: report.id, citizenDescription: report.description,
            type: 'Reported traffic obstruction', severity: 'Medium', status: 'Open', roadSegmentId: segment.id,
            location: segment.name, latitude, longitude, observedAt: report.submittedAt, timestamp: report.submittedAt,
            busId: '', route: '', vehicleType: 'Unknown', registrationNumber: '', registrationConfidence: 0,
            detectionSource: 'Citizen report', image: report.image,
            track: { frameCount: 0, currentFrame: 0, stages: [
              { timestamp: report.submittedAt, label: 'Citizen report received', detail: report.description },
              { timestamp: next.now, label: 'Accepted for police review', detail: report.reviewNote },
            ] } };
          break;
        }
        const water = report.category === 'waterlogging';
        const title = water ? 'Waterlogging' : report.category === 'pothole' ? 'Pothole' : 'Road obstruction';
        const issueId = id('ISS'); report.issueId = issueId;
        next.issues[issueId] = { id: issueId, citizenReportId: report.id, kind: report.category,
          roadSegmentId: segment.id, departmentId: water ? 'stormwater' : 'roads-engineering', workflowStage: 'Detected',
          defectType: title, category: water ? 'Water' : 'Roads', severity: 'Medium', status: 'Open',
          location: segment.name, latitude, longitude, firstSeen: report.submittedAt, lastSeen: report.submittedAt,
          growthPercentage: 0, detectionCount: 0, busIds: [], route: '', image: report.image,
          currentCondition: report.description, recommendedAction: 'Assess citizen evidence and qualify for field action',
          history: [{ at: next.now, action: `Citizen report accepted for assessment: ${report.reviewNote}`, actor: 'Municipal triage' }] };
      }
      break;
    }
    case 'resolveCitizenIncident': {
      const incident = required(next.incidents[command.incidentId], 'Unknown incident');
      if (!incident.citizenReportId) throw new Error('Use the existing incident response workflow');
      if (incident.status !== 'Investigating') throw new Error('Assess and assign this report before recording clearance');
      text(command.actor, 'Reviewing officer'); text(command.note, 'Clearance note');
      required(selectAssignment(next, { kind: 'incident', id: incident.id }), 'Assign an officer first');
      incident.status = 'Resolved'; incident.resolvedAt = next.now; incident.resolutionSummary = command.note.trim();
      incident.track?.stages.push({ timestamp: next.now, label: 'Officer recorded clearance', detail: `${command.actor}: ${command.note.trim()}` });
      break;
    }
    case 'qualifyIssue': {
      text(command.actor, 'Reviewing official');
      const issue = required(next.issues[command.issueId], 'Unknown municipal issue');
      if (issue.workflowStage === 'Qualified') return state;
      if (issue.workflowStage !== 'Detected') throw new Error('Only detected issues can be qualified');
      issue.workflowStage = 'Qualified'; issue.status = 'Open';
      issue.history.push({ at: next.now, action: 'Issue qualified for departmental action', actor: command.actor });
      break;
    }
    case 'closeIssue': {
      text(command.actor, 'Closing admin');
      const issue = required(next.issues[command.issueId], 'Unknown municipal issue');
      if (issue.workflowStage === 'Closed') return state;
      if (issue.workflowStage !== 'Verified') throw new Error('Admin verification is required before closure');
      issue.workflowStage = 'Closed'; issue.status = 'Closed';
      issue.history.push({ at: next.now, action: 'Issue closed; verified condition published to Citizens', actor: command.actor });
      break;
    }
    case 'assign': {
      text(command.assignee, 'Assignee');
      const departmentId = eventDepartment(next, command.event);
      const team = required(next.teams[command.teamId], 'Unknown team');
      if (team.departmentId !== departmentId) throw new Error('Team does not belong to the responsible department');
      if (pendingReview(next, command.event)) throw new Error('Review the pending resolution before reassigning');
      const issue = command.event.kind === 'municipal' ? next.issues[command.event.id] : undefined;
      if (issue?.citizenReportId && issue.workflowStage === 'Detected') throw new Error('Qualify the citizen report before assignment');
      const incident = command.event.kind === 'incident' ? next.incidents[command.event.id] : undefined;
      const dispatch = command.event.kind === 'anomaly' ? activeDispatch(next, command.event.id) : undefined;
      if (issue && ['Verified','Closed'].includes(issue.workflowStage) || incident?.status === 'Resolved' || incident?.status === 'Closed') throw new Error('Closed events cannot be assigned');
      if (command.event.kind === 'anomaly' && (!dispatch || !['Requested','Assigned'].includes(dispatch.stage))) throw new Error('Request dispatch before assigning a traffic team');
      const previous = selectAssignment(next, command.event);
      if (previous?.teamId === command.teamId && previous.assignee === command.assignee) return state;
      if (previous) next.assignments[previous.id].supersededAt = next.now;
      next.assignments[id('ASN')] = { id: id('ASN'), event: { ...command.event }, departmentId, teamId: team.id, assignee: command.assignee, assignedAt: next.now };
      if (issue) {
        // Preserve the foundation API's assign-from-detected shortcut, recording qualification explicitly.
        if (issue.workflowStage === 'Detected') issue.history.push({ at: next.now, action: 'Issue qualified during departmental assignment', actor: command.assignee });
        issue.workflowStage = 'Assigned'; issue.status = 'Open';
        issue.history.push({ at: next.now, action: `Assigned to ${team.name}`, actor: command.assignee });
      }
      if (incident) incident.status = 'Investigating';
      if (dispatch) { dispatch.stage = 'Assigned'; dispatch.history.push({ at: next.now, action: `Assigned to ${team.name}`, actor: command.assignee }); }
      break;
    }
    case 'acknowledge':
    case 'startFieldWork': {
      const issue = required(next.issues[command.issueId], 'Unknown municipal issue');
      const assignment = required(selectAssignment(next, { kind: 'municipal', id: issue.id }), 'Issue has no assignment');
      const stage = command.type === 'acknowledge' ? 'Acknowledged' : 'In progress';
      if (issue.workflowStage === stage) return state;
      if (issue.workflowStage !== (command.type === 'acknowledge' ? 'Assigned' : 'Acknowledged')) throw new Error('Invalid municipal workflow transition');
      issue.workflowStage = stage;
      if (stage === 'Acknowledged') next.assignments[assignment.id].acknowledgedAt = next.now;
      issue.history.push({ at: next.now, action: stage, actor: assignment.assignee });
      break;
    }
    case 'submitResolution': {
      eventDepartment(next, command.event);
      text(command.summary, 'Resolution summary'); text(command.resultingCondition, 'Resulting condition'); text(command.submittedBy, 'Submitter');
      if (!command.evidence.length) throw new Error('Resolution evidence is required');
      if (new Set(command.evidence.map(item => item.id)).size !== command.evidence.length) throw new Error('Evidence IDs must be unique');
      for (const evidence of command.evidence) {
        text(evidence.id, 'Evidence ID'); text(evidence.image, 'Evidence image'); text(evidence.description, 'Evidence description'); validTime(evidence.capturedAt);
        if (Date.parse(evidence.capturedAt) > Date.parse(next.now)) throw new Error('Evidence cannot be captured in the future');
      }
      if (pendingReview(next, command.event)) throw new Error('A resolution is already awaiting admin review');
      const emergency = selectEmergency(next, command.event);
      if (emergency && emergency.stage !== 'Discharged') throw new Error('Complete the emergency response and discharge the team before resolving the event');
      const assignment = required(selectAssignment(next, command.event), 'An active assignment is required');
      const issue = command.event.kind === 'municipal' ? next.issues[command.event.id] : undefined;
      const dispatch = command.event.kind === 'anomaly' ? activeDispatch(next, command.event.id) : undefined;
      if (issue ? issue.workflowStage !== 'In progress' : !dispatch || dispatch.stage !== 'On scene') throw new Error('Field work must be in progress before resolution');
      const resolutionId = id('RES');
      next.resolutions[resolutionId] = { id: resolutionId, event: { ...command.event }, assignmentId: assignment.id, submittedAt: next.now, submittedBy: command.submittedBy, summary: command.summary, resultingCondition: command.resultingCondition, evidence: structuredClone(command.evidence) };
      next.reviews[id('REV')] = { id: id('REV'), resolutionId, decision: 'Pending', notifiedAt: next.now };
      if (issue) { issue.workflowStage = 'Admin review'; issue.status = 'Pending Verification'; issue.history.push({ at: next.now, action: 'Field team marked issue resolved', actor: command.submittedBy }, { at: next.now, action: 'Admin review requested; admin notified', actor: command.submittedBy }); }
      if (dispatch) { dispatch.stage = 'Admin review'; dispatch.history.push({ at: next.now, action: 'Team marked response resolved', actor: command.submittedBy }, { at: next.now, action: 'Response resolution submitted; admin notified', actor: command.submittedBy }); }
      break;
    }
    case 'reviewResolution': {
      text(command.reviewer, 'Reviewer'); text(command.note, 'Review note');
      const review = required(next.reviews[command.reviewId], 'Unknown admin review');
      if (review.decision === command.decision) return state;
      if (review.decision !== 'Pending') throw new Error('This resolution has already been reviewed');
      const resolution = next.resolutions[review.resolutionId];
      const issue = resolution.event.kind === 'municipal' ? next.issues[resolution.event.id] : undefined;
      const dispatch = resolution.event.kind === 'anomaly' ? activeDispatch(next, resolution.event.id) : undefined;
      if (dispatch && command.decision === 'Verified') {
        const anomaly = next.anomalies[dispatch.anomalyId];
        const trigger = next.trafficObservations[anomaly.observationId];
        const later = Object.values(next.trafficObservations).filter(observation => observation.roadSegmentId === anomaly.roadSegmentId && Date.parse(observation.observedAt) > Date.parse(trigger.observedAt) && Date.parse(observation.observedAt) <= Date.parse(next.now)).sort((a,b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
        if (!later || later.baselineVehicleCount <= 0 || later.vehicleCount / later.baselineVehicleCount >= 2) throw new Error('A subsequent normalizing traffic observation is required');
      }
      review.decision = command.decision; review.reviewedAt = next.now; review.reviewer = command.reviewer; review.note = command.note;
      if (issue) {
        issue.workflowStage = command.decision === 'Verified' ? 'Verified' : 'In progress';
        issue.status = command.decision === 'Verified' ? 'Verified' : 'Disputed';
        if (command.decision === 'Verified') issue.currentCondition = resolution.resultingCondition;
        issue.history.push({ at: next.now, action: `Admin review: ${command.decision}`, actor: command.reviewer });
      }
      if (dispatch) {
        dispatch.stage = command.decision === 'Verified' ? 'Verified' : 'On scene';
        dispatch.history.push({ at: next.now, action: `Admin review: ${command.decision}`, actor: command.reviewer });
      }
      break;
    }
    case 'decideMatch': {
      const match = required(next.watchlist[command.matchId], 'Unknown watchlist match');
      if (match.status === command.decision) return state;
      if (match.status === 'Verified' || match.status === 'Dismissed') throw new Error('Match already reviewed');
      match.status = command.decision;
      break;
    }
    case 'qualifyAnomaly': {
      text(command.actor, 'Reviewing officer');
      const anomaly = required(next.anomalies[command.anomalyId], 'Unknown traffic anomaly');
      if (anomaly.status === 'Qualified') return state;
      if (anomaly.status !== 'Candidate') throw new Error('Only a candidate can be qualified');
      anomaly.status = 'Qualified'; anomaly.history.push({ at: next.now, action: 'Candidate qualified by officer', actor: command.actor });
      break;
    }
    case 'requestDispatch': {
      text(command.actor, 'Requesting officer');
      const anomaly = required(next.anomalies[command.anomalyId], 'Unknown traffic anomaly');
      if (activeDispatch(next, anomaly.id)) return state;
      if (anomaly.status !== 'Qualified') throw new Error('Officer qualification is required before dispatch');
      next.dispatches[id('DSP')] = { id: id('DSP'), anomalyId: anomaly.id, requestedAt: next.now, stage: 'Requested', history: [{ at: next.now, action: 'Traffic dispatch requested', actor: command.actor }] };
      anomaly.status = 'Dispatched';
      break;
    }
    case 'advanceDispatch': {
      text(command.actor, 'Response officer');
      const dispatch = required(next.dispatches[command.dispatchId], 'Unknown dispatch');
      if (dispatch.stage === command.stage) return state;
      const previous: Partial<Record<DispatchStage, DispatchStage>> = { 'En route': 'Assigned', 'On scene': 'En route' };
      if (dispatch.stage !== previous[command.stage]) throw new Error('Invalid dispatch transition');
      dispatch.stage = command.stage; dispatch.history.push({ at: next.now, action: command.stage, actor: command.actor });
      break;
    }
    case 'observeRecovery': {
      text(command.actor, 'Observing operator');
      const anomaly = required(next.anomalies[command.anomalyId], 'Unknown anomaly');
      const dispatch = activeDispatch(next, anomaly.id);
      if (dispatch?.stage !== 'On scene') throw new Error('Traffic team must be on scene before recording the follow-up pass');
      const source = next.trafficObservations[anomaly.observationId];
      // Explicit deterministic demo pass, not an inferred consequence of pressing Resolve.
      next.trafficObservations[id('TR-RECOVERY')] = { ...structuredClone(source), id: id('TR-RECOVERY'), observedAt: next.now,
        timestamp: next.now, vehicleCount: source.baselineVehicleCount, averageSpeed: 42, densityLevel: 'Free', trend: 'Decreasing',
        recommendedAction: 'Traffic has returned to the demo baseline; check active municipal work before travelling' };
      dispatch.history.push({ at: next.now, action: 'Demo fleet follow-up: traffic returned to 1.0× baseline', actor: command.actor });
      break;
    }
    case 'closeDispatch': {
      text(command.actor, 'Closing operator');
      const dispatch = required(next.dispatches[command.dispatchId], 'Unknown dispatch');
      if (dispatch.stage === 'Closed') return state;
      if (dispatch.stage !== 'Verified') throw new Error('Response verification is required before closure');
      dispatch.stage = 'Closed'; next.anomalies[dispatch.anomalyId].status = 'Closed';
      dispatch.history.push({ at: next.now, action: 'Traffic-control event closed', actor: command.actor });
      break;
    }
    case 'requestEmergency': {
      text(command.actor, 'Requesting operator'); text(command.reason, 'Response reason');
      if (selectEmergency(next, command.event)) return state;
      if (!emergencyEligible(next, command.event)) throw new Error('This event does not qualify for the demo coordinated-response workflow');
      next.emergencyDispatches[id('EMG')] = { id: id('EMG'), event: { ...command.event }, reason: command.reason,
        requestedAt: next.now, stage: 'Requested', history: [{ at: next.now, action: 'Emergency team dispatch requested by operator', actor: command.actor }] };
      break;
    }
    case 'assignEmergency': {
      text(command.actor, 'Assigning operator');
      const dispatch = required(next.emergencyDispatches[command.dispatchId], 'Unknown emergency dispatch');
      const team = required(next.teams[command.teamId], 'Unknown response team');
      if (dispatch.stage === 'Assigned' && dispatch.teamId === team.id) return state;
      if (dispatch.stage !== 'Requested' || next.departments[team.departmentId]?.role !== 'response') throw new Error('Choose an available City Response team for a requested dispatch');
      if (Object.values(next.emergencyDispatches).some(item => item.teamId === team.id && item.stage !== 'Discharged')) throw new Error('Response team is already assigned; discharge it before reassignment');
      dispatch.stage = 'Assigned'; dispatch.teamId = team.id;
      dispatch.history.push({ at: next.now, action: `Team assigned: ${team.name}`, actor: command.actor });
      break;
    }
    case 'advanceEmergency': {
      text(command.actor, 'Response operator');
      const dispatch = required(next.emergencyDispatches[command.dispatchId], 'Unknown emergency dispatch');
      if (dispatch.stage === command.stage) return state;
      const previous: Partial<Record<EmergencyStage, EmergencyStage>> = { 'En route': 'Assigned', 'On scene': 'En route', 'Response complete': 'On scene', Discharged: 'Response complete' };
      if (dispatch.stage !== previous[command.stage]) throw new Error('Invalid emergency team transition');
      if (command.stage === 'Response complete') { text(command.outcome || '', 'Response outcome'); dispatch.outcome = command.outcome; dispatch.completedAt = next.now; }
      if (command.stage === 'Discharged') dispatch.dischargedAt = next.now;
      dispatch.stage = command.stage;
      dispatch.history.push({ at: next.now, action: command.stage === 'Discharged' ? 'Team discharged / released from event' : command.stage, actor: command.actor });
      break;
    }
    case 'resolveEmergencyIncident': {
      text(command.actor, 'Resolving operator');
      const dispatch = required(next.emergencyDispatches[command.dispatchId], 'Unknown emergency dispatch');
      if (dispatch.resolvedAt) return state;
      if (dispatch.stage !== 'Discharged' || dispatch.event.kind !== 'incident') throw new Error('Release the team first; Municipal events use field resolution and admin review');
      const incident = next.incidents[dispatch.event.id];
      incident.status = 'Resolved'; incident.resolvedAt = next.now; incident.emergencyDispatchId = dispatch.id; incident.resolutionSummary = dispatch.outcome;
      dispatch.resolvedAt = next.now;
      dispatch.history.push({ at: next.now, action: 'Event resolved after team release', actor: command.actor });
      break;
    }
    case 'recordTraffic': {
      const observation = command.observation;
      required(next.roadSegments[observation.roadSegmentId], 'Unknown traffic road segment'); validTime(observation.observedAt);
      if (next.trafficObservations[observation.id]) throw new Error('Traffic observation IDs are immutable');
      if (!observation.id.trim() || !Number.isFinite(observation.vehicleCount) || observation.vehicleCount < 0 || !Number.isFinite(observation.averageSpeed) || observation.averageSpeed < 0 || !Number.isFinite(observation.windowMinutes) || observation.windowMinutes <= 0 || !Number.isFinite(observation.baselineVehicleCount) || observation.baselineVehicleCount <= 0) throw new Error('Invalid traffic measurement or baseline');
      text(observation.baselineSource, 'Baseline provenance');
      if (!observation.sourceBusIds.length || observation.sourceBusIds.some(bus => !next.buses[bus])) throw new Error('Unknown traffic source bus');
      if (Date.parse(observation.observedAt) > Date.parse(next.now)) throw new Error('Advance the demo clock before recording future traffic');
      next.trafficObservations[observation.id] = structuredClone(observation);
      const existing = Object.values(next.anomalies).some(anomaly => anomaly.roadSegmentId === observation.roadSegmentId && !['Closed','Dismissed'].includes(anomaly.status));
      if (!existing && observation.vehicleCount / observation.baselineVehicleCount >= 2) {
        next.anomalies[id('ANOM')] = { id: id('ANOM'), roadSegmentId: observation.roadSegmentId, observationId: observation.id,
          detectedAt: observation.observedAt, status: 'Candidate', history: [{ at: next.now, action: 'Fleet traffic candidate detected; officer review required', actor: 'Demo fleet observations' }] };
      }
      break;
    }
    case 'createScenario': {
      // A closure explicitly starting at the pre-command clock is valid ("start now").
      const scenario = calculateScenario(state, command, id('SIM'));
      scenario.createdAt = next.now;
      next.scenarios[scenario.id] = scenario;
      next.projects[id('PRJ')] = { id: id('PRJ'), scenarioId: scenario.id, title: `${next.roads[next.roadSegments[scenario.roadSegmentId].roadId].name} — municipal work`, projectType: 'Road works', status: 'Draft', createdAt: next.now };
      break;
    }
    case 'approveProject': {
      text(command.actor, 'Approving admin');
      const project = required(next.projects[command.projectId], 'Unknown municipal project');
      if (project.status === 'Approved') return state;
      if (project.status !== 'Draft') throw new Error('Only draft projects can be approved');
      const scenario = next.scenarios[project.scenarioId];
      if (Date.parse(scenario.endsAt) <= Date.parse(next.now)) throw new Error('Cannot approve an expired project');
      if (command.title !== undefined) { text(command.title, 'Project title'); project.title = command.title.trim(); }
      if (command.projectType) project.projectType = command.projectType;
      project.status = 'Approved'; project.approvedAt = next.now; project.publishedAt = next.now; project.approvedBy = command.actor;
      break;
    }
    case 'cancelProject': {
      const project = required(next.projects[command.projectId], 'Unknown municipal project');
      if (project.status === 'Cancelled') return state;
      project.status = 'Cancelled';
      break;
    }
    case 'setTime':
      validTime(command.now);
      if (Date.parse(command.now) < Date.parse(state.now)) throw new Error('Demo clock cannot move backwards; reset the store instead');
      if (Date.parse(command.now) === Date.parse(state.now)) return state;
      next.now = command.now;
      break;
  }
  next.revision = sequence;
  return next;
}

function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** One instance owns domain state. UI selection/cameras remain in their existing role components. */
export function createCityStore(seed: CityState) {
  const initial = freeze(structuredClone(seed));
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => current,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispatch: (command: CityCommand) => {
      const next = reduceCity(current, command);
      if (next !== current) { current = freeze(next); listeners.forEach(listener => listener()); }
      return current;
    },
    reset: () => { current = initial; listeners.forEach(listener => listener()); },
  };
}