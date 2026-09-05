import { cityStore } from './city';
import type { CityCommand } from '../domain/cityStore';
import type { CitizenReportInput, EmergencyStage, EventRef, MunicipalProject, ResolutionEvidence } from '../types/city';
import { completionEvidence } from '../data/demo/operations';
import { selectMunicipalTasks } from '../domain/operations';
import { selectAssignment, selectCitizenAlerts, selectCitizenContext, selectCitizenRoute, selectIssues, selectPlannerRoads, selectPoliceSummary, selectTraffic, selectTrafficAnomalies, selectWatchlist } from '../domain/selectors';

// Promise-shaped boundaries remain replaceable by HTTP implementations. No independent caches.
const query = <T,>(read: () => T): Promise<T> => Promise.resolve().then(() => structuredClone(read()));
const command = (action: CityCommand) => Promise.resolve().then(() => cityStore.dispatch(action));
export const incidentsService = {
	getIncidents: () => query(() => Object.values(cityStore.getSnapshot().incidents)),
	getIncident: (id: string) => query(() => cityStore.getSnapshot().incidents[id]),
	assign: (id: string, teamId: string, assignee: string) => command({ type: 'assign', event: { kind: 'incident', id }, teamId, assignee }).then(state => selectAssignment(state, { kind: 'incident', id })),
};
export const watchlistService = {
	getWatchlist: () => query(() => selectWatchlist(cityStore.getSnapshot())),
	getWatchlistMatches: () => query(() => selectWatchlist(cityStore.getSnapshot())),
	getWatchlistMatch: (id: string) => query(() => selectWatchlist(cityStore.getSnapshot()).find(item => item.id === id)),
	decide: (matchId: string, decision: 'Verified' | 'Dismissed') => command({ type: 'decideMatch', matchId, decision }).then(state => structuredClone(state.watchlist[matchId])),
};
export const municipalService = {
 getCitizenReports: () => query(() => Object.values(cityStore.getSnapshot().citizenReports)),
 reviewCitizenReport: (reportId: string, decision: 'Accepted' | 'Dismissed', note: string) => command({ type: 'reviewCitizenReport', reportId, decision, note }).then(state => structuredClone(state.citizenReports[reportId])),
	qualify: (issueId: string, actor: string) => command({ type: 'qualifyIssue', issueId, actor }).then(() => municipalService.getRoadDefect(issueId)),
	close: (issueId: string, actor: string) => command({ type: 'closeIssue', issueId, actor }).then(() => municipalService.getRoadDefect(issueId)),
	getTasks: () => query(() => selectMunicipalTasks(cityStore.getSnapshot())),
	getRoadDefects: () => query(() => selectIssues(cityStore.getSnapshot())),
	getRoadDefect: (id: string) => query(() => selectIssues(cityStore.getSnapshot()).find(item => item.id === id)),
	getMunicipalMapData: () => query(() => selectIssues(cityStore.getSnapshot())),
	getRoadRisk: () => query(() => selectIssues(cityStore.getSnapshot()).filter(item => item.workflowStage !== 'Closed').map(item => ({
		id: item.id, segment: item.location, condition: item.currentCondition || item.defectType,
		risk: item.severity, roadSegmentId: item.roadSegmentId, trend: item.growthPercentage > 0 ? 'Increasing' : 'Stable',
		projectedIntervention: 'Field assessment required', reason: item.recommendedAction || 'Review repeated fleet observations',
		currentStage: Math.max(0, (item.observations?.length || 1) - 1), stages: item.observations?.map(observation => observation.label) || ['Detected'], busIds: item.busIds,
	}))),
	getRoads: () => query(() => selectPlannerRoads(cityStore.getSnapshot())),
	getDepartments: () => query(() => Object.values(cityStore.getSnapshot().departments).filter(item => item.role === 'municipal')),
	assign: (issueId: string, teamId: string, assignee: string) => command({ type: 'assign', event: { kind: 'municipal', id: issueId }, teamId, assignee }).then(state => selectAssignment(state, { kind: 'municipal', id: issueId })),
	acknowledge: (issueId: string) => command({ type: 'acknowledge', issueId }).then(() => municipalService.getRoadDefect(issueId)),
	startFieldWork: (issueId: string) => command({ type: 'startFieldWork', issueId }).then(() => municipalService.getRoadDefect(issueId)),
	runConstructionSimulation: (input: { roadSegmentId: string; duration: string; startsAt?: string } = { roadSegmentId: 'anna', duration: '4 months' }) => command({ type: 'createScenario', ...input }).then(state => structuredClone(Object.values(state.scenarios).at(-1)!)),
	getScenario: (id: string) => query(() => cityStore.getSnapshot().scenarios[id]),
	getProjects: () => query(() => Object.values(cityStore.getSnapshot().projects)),
	approveProject: (projectId: string, actor: string, details?: { title: string; projectType: MunicipalProject['projectType'] }) => command({ type: 'approveProject', projectId, actor, ...details }).then(state => structuredClone(state.projects[projectId])),
	cancelProject: (projectId: string) => command({ type: 'cancelProject', projectId }).then(state => structuredClone(state.projects[projectId])),
};
export const workflowService = {
	submitDemoResolution: (event: EventRef, summary: string, resultingCondition: string) => Promise.resolve().then(() => {
		const state = cityStore.getSnapshot();
		const assignment = selectAssignment(state, event);
		return workflowService.submitResolution({ event, summary, resultingCondition, submittedBy: assignment?.assignee || 'Demo field team', evidence: [{
			id: `FIELD-${event.id}-${state.revision + 1}`, image: completionEvidence, capturedAt: state.now,
			description: 'Local illustrative field-completion fixture — not an actual post-repair photograph',
		}] });
	}),
	getAssignment: (event: EventRef) => query(() => selectAssignment(cityStore.getSnapshot(), event)),
	getTeams: (departmentId?: string) => query(() => Object.values(cityStore.getSnapshot().teams).filter(team => !departmentId || team.departmentId === departmentId)),
	submitResolution: (input: { event: EventRef; submittedBy: string; summary: string; resultingCondition: string; evidence: ResolutionEvidence[] }) => command({ type: 'submitResolution', ...input }).then(state => structuredClone(Object.values(state.resolutions).at(-1)!)),
	getPendingReviews: () => query(() => Object.values(cityStore.getSnapshot().reviews).filter(review => review.decision === 'Pending').map(review => ({ ...review, resolution: cityStore.getSnapshot().resolutions[review.resolutionId] }))),
	reviewResolution: (reviewId: string, decision: 'Verified' | 'Returned', reviewer: string, note: string) => command({ type: 'reviewResolution', reviewId, decision, reviewer, note }).then(state => structuredClone(state.reviews[reviewId])),
};
export const policeTrafficService = {
	recordFollowUp: (anomalyId: string, actor: string) => command({ type: 'observeRecovery', anomalyId, actor }).then(() => undefined),
	close: (dispatchId: string, actor: string) => command({ type: 'closeDispatch', dispatchId, actor }).then(state => structuredClone(state.dispatches[dispatchId])),
	getAnomalies: () => query(() => selectTrafficAnomalies(cityStore.getSnapshot())),
	qualify: (anomalyId: string, actor: string) => command({ type: 'qualifyAnomaly', anomalyId, actor }).then(state => structuredClone(state.anomalies[anomalyId])),
	requestDispatch: (anomalyId: string, actor: string) => command({ type: 'requestDispatch', anomalyId, actor }).then(state => structuredClone(Object.values(state.dispatches).find(item => item.anomalyId === anomalyId)!)),
	assign: (anomalyId: string, teamId: string, assignee: string) => command({ type: 'assign', event: { kind: 'anomaly', id: anomalyId }, teamId, assignee }).then(state => selectAssignment(state, { kind: 'anomaly', id: anomalyId })),
	advanceDispatch: (dispatchId: string, stage: 'En route' | 'On scene', actor: string) => command({ type: 'advanceDispatch', dispatchId, stage, actor }).then(state => structuredClone(state.dispatches[dispatchId])),
};
export const emergencyService = {
	request: (event: EventRef, reason: string, actor: string) => command({ type: 'requestEmergency', event, reason, actor }).then(() => undefined),
	assign: (dispatchId: string, teamId: string, actor: string) => command({ type: 'assignEmergency', dispatchId, teamId, actor }).then(() => undefined),
	advance: (dispatchId: string, stage: Exclude<EmergencyStage, 'Requested' | 'Assigned'>, actor: string, outcome?: string) => command({ type: 'advanceEmergency', dispatchId, stage, actor, outcome }).then(() => undefined),
	resolveIncident: (dispatchId: string, actor: string) => command({ type: 'resolveEmergencyIncident', dispatchId, actor }).then(() => undefined),
};
export const trafficService = {
	getTrafficData: () => query(() => selectTraffic(cityStore.getSnapshot())),
	getSegment: (id: string) => query(() => selectTraffic(cityStore.getSnapshot()).find(item => item.id === id)),
	getObservations: () => query(() => Object.values(cityStore.getSnapshot().trafficObservations)),
};
export const citizenService = {
 submitReport: (input: CitizenReportInput) => command({ type: 'submitCitizenReport', input }).then(state => structuredClone(Object.values(state.citizenReports).at(-1)!)),
	getMapData: () => query(() => ({ traffic: selectTraffic(cityStore.getSnapshot()), alerts: selectCitizenAlerts(cityStore.getSnapshot()) })),
	getAlerts: () => query(() => selectCitizenAlerts(cityStore.getSnapshot())),
	getMobilityContext: () => query(() => selectCitizenContext(cityStore.getSnapshot())),
	recommendRoute: () => query(() => selectCitizenRoute(cityStore.getSnapshot())),
};
export const mapService = { getBuses: () => query(() => Object.values(cityStore.getSnapshot().buses)) };
export const analyticsService = { getFleetSummary: () => query(() => {
	const state = cityStore.getSnapshot();
	const summary = selectPoliceSummary(state);
	return { ...summary, activeBuses: summary.reportingBuses, eventsToday: summary.alertsToday, coverage: `${selectPlannerRoads(state).length} sampled corridors` };
}) };
export const roadsService = {
	getRoads: () => query(() => Object.values(cityStore.getSnapshot().roads)),
	getSegments: () => query(() => Object.values(cityStore.getSnapshot().roadSegments)),
	getSegment: (id: string) => query(() => cityStore.getSnapshot().roadSegments[id]),
};
export const demoService = {
	getClock: () => cityStore.getSnapshot().now,
	setTime: (now: string) => command({ type: 'setTime', now }).then(state => state.now),
	recordTraffic: (observation: Extract<CityCommand, { type: 'recordTraffic' }>['observation']) => command({ type: 'recordTraffic', observation }).then(() => undefined),
	reset: () => { cityStore.reset(); },
};
