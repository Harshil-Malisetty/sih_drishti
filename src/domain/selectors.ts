import type { CitizenAlert, PlannerRoadSegment, Status, TrafficLevel, TrafficObservation, WatchlistMatch } from '../types';
import type {
  CitizenJourney, CitizenMobilityContext, CityState, CityTrafficObservation, DepartmentAssignment,
  EventRef, MunicipalIssue, PublicMunicipalProject, PublicRoadCondition, PublicRoadImpact, RouteLeg,
} from '../types/city';
import { demoDate, formatDemoDate, formatDemoTime, relativeDemoTime } from './time';

const inactiveStatuses: readonly Status[] = ['Resolved', 'Closed', 'Verified', 'Dismissed'];
const isActive = (status: Status) => !inactiveStatuses.includes(status);
const sameEvent = (left: EventRef, right: EventRef) => left.kind === right.kind && left.id === right.id;
const byTime = (left: string, right: string) => Date.parse(left) - Date.parse(right);
const byId = (left: { id: string }, right: { id: string }) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0;

// Legacy display timestamps occur only on seed watchlist/issue records.
function observedTime(value: string): string {
  return /^\d{4}-\d{2}-\d{2}T/.test(value) ? value : demoDate(value);
}

function latestObservation(state: CityState, roadSegmentId: string): CityTrafficObservation | undefined {
  return Object.values(state.trafficObservations)
    .filter(item => item.roadSegmentId === roadSegmentId && byTime(item.observedAt, state.now) <= 0)
    .sort((a, b) => byTime(b.observedAt, a.observedAt) || byId(b, a))[0];
}

function latestTraffic(state: CityState): CityTrafficObservation[] {
  return [...new Set(Object.values(state.trafficObservations).map(item => item.roadSegmentId))]
    .map(id => latestObservation(state, id))
    .filter((item): item is CityTrafficObservation => Boolean(item));
}

function roadName(state: CityState, segmentId: string): string {
  const segment = state.roadSegments[segmentId];
  return (segment && (state.roads[segment.roadId]?.name || segment.name)) || 'Unmapped road';
}

function publicTraffic(state: CityState, observation: CityTrafficObservation, marker = observation): TrafficObservation {
  return {
    id: marker.id, location: observation.location, road: roadName(state, observation.roadSegmentId),
    observationId: observation.id, roadSegmentId: observation.roadSegmentId,
    observedAt: observation.observedAt, windowMinutes: observation.windowMinutes,
    vehicleCount: observation.vehicleCount, densityLevel: observation.densityLevel,
    averageSpeed: observation.averageSpeed, timestamp: formatDemoTime(observation.observedAt),
    trend: observation.trend, mapX: marker.mapX, mapY: marker.mapY,
    recommendedAction: observation.recommendedAction,
  };
}

/** Only these three fixtures have meaningful coordinates on the legacy schematic. */
export function selectTraffic(state: CityState): TrafficObservation[] {
  return ['TR-1', 'TR-2', 'TR-3'].flatMap(id => {
    const marker = state.trafficObservations[id];
    const observation = marker && latestObservation(state, marker.roadSegmentId);
    return observation ? [publicTraffic(state, observation, marker)] : [];
  });
}

export function selectPlannerRoads(state: CityState): PlannerRoadSegment[] {
  return Object.values(state.roadSegments).filter(segment => segment.planningEnabled).map(segment => {
    const observation = latestObservation(state, segment.id);
    return {
      id: segment.id, name: segment.name, points: segment.points.map(point => [...point]),
      baselineLevel: segment.baselineLevel, baselineMinutes: segment.baselineMinutes,
      observedPasses: segment.observedPasses,
      hourlyVehicles: observation && observation.windowMinutes > 0
        ? observation.vehicleCount * 60 / observation.windowMinutes : segment.baselineHourlyVehicles,
      capacity: segment.capacity, busRoutes: [...segment.busRoutes], connectsTo: [...segment.connectsTo],
    };
  });
}

function resolutionFor(state: CityState, event: EventRef) {
  const resolution = Object.values(state.resolutions)
    .filter(item => sameEvent(item.event, event) && byTime(item.submittedAt, state.now) <= 0)
    .sort((a, b) => byTime(b.submittedAt, a.submittedAt) || byId(b, a))[0];
  const review = resolution && Object.values(state.reviews)
    .filter(item => item.resolutionId === resolution.id && byTime(item.notifiedAt, state.now) <= 0)
    .sort((a, b) => byTime(b.reviewedAt || b.notifiedAt, a.reviewedAt || a.notifiedAt) || byId(b, a))[0];
  const decision = review?.reviewedAt && byTime(review.reviewedAt, state.now) <= 0 ? review.decision : 'Pending';
  return { resolution, review, decision };
}

/** Field submissions are evidence, not a new confirmed condition until admin verification. */
export function selectIssues(state: CityState): MunicipalIssue[] {
  return Object.values(state.issues).map(original => {
    const issue = structuredClone(original);
    const { resolution, review, decision } = resolutionFor(state, { kind: 'municipal', id: issue.id });
    if (!resolution) return issue;
    const verified = decision === 'Verified';
    const returned = decision === 'Returned';
    // Workflow commands own the stage. An old returned review must not overwrite a later reassignment.
    if (verified) issue.currentCondition = resolution.resultingCondition;
    issue.maintenanceState = verified ? 'Repair verified' : returned ? 'Field resolution returned for follow-up' : 'Field resolution awaiting admin review';
    issue.repairStatus = issue.maintenanceState;
    const existingFleetRepair = issue.repair;
    issue.repair = verified && existingFleetRepair ? { ...existingFleetRepair, detail: resolution.resultingCondition } : {
      markedRepaired: formatDemoDate(resolution.submittedAt),
      nextObservation: formatDemoDate(verified && review?.reviewedAt ? review.reviewedAt : resolution.submittedAt),
      busId: '', result: verified ? 'Verified' : returned ? 'Disputed' : 'Pending',
      detail: verified ? resolution.resultingCondition : returned ? 'Admin review returned the field submission; the recorded condition remains unverified.' : 'Field completion reported; awaiting admin review. The recorded road condition is unchanged.',
    };
    // Field photos are resolution evidence, not new fleet severity measurements.
    // Keep them on FieldResolution rather than fabricating chart points/bus provenance.
    const latest = issue.observations?.at(-1);
    if (latest?.image) issue.image = latest.image;
    if (latest) issue.lastSeen = formatDemoDate(latest.observedAt || observedTime(latest.date));
    if (verified && review?.reviewedAt) issue.recommendedAction = 'Continue routine fleet monitoring';
    return issue;
  });
}

export function selectWatchlist(state: CityState): WatchlistMatch[] {
  return Object.values(state.watchlist).map(item => {
    const match = structuredClone(item);
    const latest = match.observations?.at(-1);
    return latest ? {
      ...match, location: latest.location, timestamp: latest.timestamp,
      busId: latest.busId, route: latest.route, confidence: latest.confidence ?? match.confidence,
    } : match;
  });
}

export function selectAssignment(state: CityState, event: EventRef): DepartmentAssignment | undefined {
  const assignment = Object.values(state.assignments)
    .filter(item => sameEvent(item.event, event) && !item.supersededAt && byTime(item.assignedAt, state.now) <= 0)
    .sort((a, b) => byTime(b.assignedAt, a.assignedAt) || byId(b, a))[0];
  return assignment && structuredClone(assignment);
}

export function selectPoliceAssignments(state: CityState): Record<string, { officer: string; team: string }> {
  const result: Record<string, { officer: string; team: string }> = {};
  for (const item of Object.values(state.assignments)) {
    const assignment = selectAssignment(state, item.event);
    if (!assignment || assignment.id !== item.id) continue;
    const team = state.teams[assignment.teamId];
    if (!team || state.departments[team.departmentId]?.role !== 'police') continue;
    result[item.event.id] = { officer: assignment.assignee, team: team.name };
  }
  return result;
}

function activeImpacts(state: CityState): PublicRoadImpact[] {
  return Object.values(state.projects).flatMap(project => {
    const scenario = state.scenarios[project.scenarioId];
    if (project.status !== 'Approved' || !project.publishedAt || !scenario
      || !(byTime(project.publishedAt, state.now) <= 0)
      || !(byTime(scenario.startsAt, state.now) <= 0 && byTime(state.now, scenario.endsAt) < 0)) return [];
    return scenario.affected.map(impact => ({
      roadSegmentId: impact.roadSegmentId, restriction: impact.restriction,
      additionalVehicles: impact.additionalVehicles, saturation: impact.saturation,
      delayMinutes: impact.delayMinutes, severity: impact.severity,
      projectId: project.id, title: project.title,
      roadName: roadName(state, impact.roadSegmentId), startsAt: scenario.startsAt, endsAt: scenario.endsAt,
    }));
  });
}

/** Public project records are projections of approval + the reviewed snapshot, never a second store. */
export function selectPublicProjects(state: CityState): PublicMunicipalProject[] {
  const active = activeImpacts(state);
  return Object.values(state.projects).filter(project => project.status === 'Approved' && project.publishedAt && Date.parse(project.publishedAt) <= Date.parse(state.now)).map(project => {
    const scenario = state.scenarios[project.scenarioId];
    const status = Date.parse(state.now) < Date.parse(scenario.startsAt) ? 'Planned' : Date.parse(state.now) >= Date.parse(scenario.endsAt) ? 'Completed' : 'Active';
    return {
      id: `mobility-${project.id}`, projectId: project.id, title: project.title, projectType: project.projectType,
      roadSegmentId: scenario.roadSegmentId, roadName: roadName(state, scenario.roadSegmentId), status,
      startsAt: scenario.startsAt, endsAt: scenario.endsAt, source: 'Municipal planning system',
      affectedCorridors: scenario.affected.map(impact => ({ roadSegmentId: impact.roadSegmentId, name: roadName(state, impact.roadSegmentId), restriction: impact.restriction, delayMinutes: impact.delayMinutes })),
      alternativeCorridors: scenario.affected.filter(impact => impact.restriction !== 'Closed' && !active.some(other => other.roadSegmentId === impact.roadSegmentId && other.restriction === 'Closed')).map(impact => roadName(state, impact.roadSegmentId)),
      peakDelayMinutes: scenario.delay,
    };
  });
}

// Public evidence deliberately omits resolution/review IDs, operators, bus IDs and police details.
type PublicCondition = PublicRoadCondition & { verifiedAt?: string; evidence: { capturedAt: string }[] };

function publicIssue(state: CityState, issue: MunicipalIssue): PublicCondition {
  const { resolution, review, decision } = resolutionFor(state, { kind: 'municipal', id: issue.id });
  const verified = resolution ? decision === 'Verified' : issue.status === 'Verified';
  const evidence = verified && resolution ? resolution.evidence
    .filter(item => byTime(item.capturedAt, state.now) <= 0).map(item => ({ capturedAt: item.capturedAt })) : [];
  const times = [observedTime(issue.lastSeen), ...evidence.map(item => item.capturedAt),
    ...(verified && review?.reviewedAt ? [review.reviewedAt] : []),
    ...(issue.observations || []).map(item => item.observedAt || observedTime(item.date))]
    .filter(at => byTime(at, state.now) <= 0).sort(byTime);
  return {
    id: issue.id, roadSegmentId: issue.roadSegmentId, title: issue.defectType, location: issue.location,
    condition: verified && resolution ? resolution.resultingCondition : issue.currentCondition || issue.defectType,
    severity: verified ? 'Low' : issue.severity, verified, updatedAt: times.at(-1) || observedTime(issue.firstSeen),
    ...(verified && review?.reviewedAt ? { verifiedAt: review.reviewedAt } : {}), evidence,
  };
}

export function selectCitizenContext(state: CityState): CitizenMobilityContext & { conditions: PublicCondition[] } {
  const conditions = Object.values(state.issues).filter(issue => !issue.citizenReportId || issue.workflowStage !== 'Detected').map(issue => publicIssue(state, issue));
  for (const incident of Object.values(state.incidents)) {
    if (!isActive(incident.status) || !/obstruction/i.test(incident.type) || byTime(incident.observedAt, state.now) > 0) continue;
    if (resolutionFor(state, { kind: 'incident', id: incident.id }).decision === 'Verified') continue;
    conditions.push({
      id: `obstruction-${incident.roadSegmentId}-${incident.observedAt}`,
      roadSegmentId: incident.roadSegmentId, title: 'Road obstruction',
      location: roadName(state, incident.roadSegmentId), condition: 'Unresolved road obstruction reported; use caution.',
      severity: incident.severity, verified: false, updatedAt: incident.observedAt, evidence: [],
    });
  }
  return { asOf: state.now, traffic: selectTraffic(state), conditions, impacts: activeImpacts(state), projects: selectPublicProjects(state) };
}

export function selectCitizenAlerts(state: CityState): CitizenAlert[] {
  const context = selectCitizenContext(state);
  const alerts: CitizenAlert[] = latestTraffic(state)
    .filter(item => item.densityLevel === 'Heavy' || item.densityLevel === 'Severe')
    .map(item => {
      const marker = ['TR-1', 'TR-2', 'TR-3'].find(id => state.trafficObservations[id]?.roadSegmentId === item.roadSegmentId);
      return {
        id: `traffic-${item.roadSegmentId}`, type: 'Traffic', title: `${item.densityLevel} traffic detected`,
        location: state.roadSegments[item.roadSegmentId].name, distance: 'City network',
        timeAgo: relativeDemoTime(item.observedAt, state.now), ...(marker ? { trafficId: marker } : {}),
        roadSegmentId: item.roadSegmentId, severity: item.densityLevel === 'Severe' ? 'Critical' : 'High',
      };
    });
  for (const condition of context.conditions) {
    const issue = state.issues[condition.id];
    if (condition.verified || (issue && (!isActive(issue.status) || !['Water', 'Infrastructure', 'Pedestrians', 'Roads'].includes(issue.category)))) continue;
    alerts.push({
      id: `condition-${condition.id}`, type: issue?.kind === 'waterlogging' ? 'Waterlogging' : 'Obstruction',
      title: condition.title, location: condition.location, distance: 'City network',
      timeAgo: relativeDemoTime(condition.updatedAt, state.now), roadSegmentId: condition.roadSegmentId,
      ...(issue ? { sourceId: issue.id } : {}), severity: condition.severity,
    });
  }
  for (const impact of context.impacts) {
    alerts.push({
      id: `project-${impact.projectId}-${impact.roadSegmentId}`, type: 'Obstruction',
      title: `${impact.title} · ${impact.restriction === 'Closed' ? 'Road closed' : 'Traffic delays'}`,
      location: impact.roadName, distance: 'City network',
      timeAgo: relativeDemoTime(state.projects[impact.projectId].publishedAt!, state.now),
      roadSegmentId: impact.roadSegmentId, severity: impact.severity === 'Severe' ? 'Critical' : impact.severity,
    });
  }
  return alerts;
}

export function selectCitizenRoute(state: CityState): CitizenJourney {
  const { journey } = state;
  const impacts = activeImpacts(state);
  const segmentIds = (legs: RouteLeg[]) => [...new Set(legs.filter(leg => leg.fraction > 0).map(leg => leg.roadSegmentId))];
  const currentSegmentIds = segmentIds(journey.current);
  const alternativeSegmentIds = segmentIds(journey.alternative);
  const relevant = impacts.filter(impact => [...currentSegmentIds, ...alternativeSegmentIds].includes(impact.roadSegmentId));
  const minutes = (legs: RouteLeg[]): number | null => {
    if (!legs.length || !legs.some(leg => leg.fraction > 0)) return null;
    let total = 0;
    for (const leg of legs) {
      if (!Number.isFinite(leg.fraction) || leg.fraction < 0 || leg.fraction > 1) return null;
      if (leg.fraction === 0) continue;
      const segment = state.roadSegments[leg.roadSegmentId];
      const affected = impacts.filter(impact => impact.roadSegmentId === leg.roadSegmentId);
      if (!segment || !Number.isFinite(segment.baselineMinutes) || affected.some(impact => impact.restriction === 'Closed')) return null;
      total += (segment.baselineMinutes + affected.reduce((sum, impact) => sum + impact.delayMinutes, 0)) * leg.fraction;
    }
    return Number.isFinite(total) ? Math.round(total) : null;
  };
  const currentMinutes = minutes(journey.current);
  const alternativeMinutes = minutes(journey.alternative);
  const currentId = currentSegmentIds[0];
  const traffic = (id: string): TrafficLevel => latestObservation(state, id)?.densityLevel || state.roadSegments[id]?.baselineLevel || 'Moderate';
  const closedNames = [...new Set(relevant.filter(impact => impact.restriction === 'Closed').map(impact => impact.roadName))];
  const currentVia = roadName(state, currentId);
  const unavailable = currentMinutes === null || alternativeMinutes === null;
  const reason = (currentMinutes === null && alternativeMinutes !== null && closedNames.length ? `Route B avoids active municipal road work on ${closedNames.join(', ')}. ` : '') + (unavailable
    ? `${currentMinutes === null ? 'Current route unavailable. ' : ''}${alternativeMinutes === null ? 'Alternative route unavailable. ' : ''}${closedNames.length ? `Active approved closure: ${closedNames.join(', ')}. ` : 'Route segment data is unavailable. '}Use an open route and follow local traffic advisories; no external routing has been performed.`
    : `${alternativeMinutes < currentMinutes ? 'Alternative has a lower estimated travel time' : 'Alternative is not currently faster'}. Estimates use recorded corridor baselines and active approved project delays; demo advisory only, not turn-by-turn routing.`);
  return {
    id: journey.id, origin: journey.origin, destination: journey.destination,
    currentMinutes, alternativeMinutes, currentVia, currentTraffic: traffic(currentId),
    via: roadName(state, journey.viaSegmentId), traffic: traffic(journey.viaSegmentId), reason,
    avoiding: closedNames.length ? `${closedNames.join(', ')} closures` : `${currentVia} ${traffic(currentId).toLowerCase()} traffic`,
    stops: [...journey.stops], currentSegmentIds, alternativeSegmentIds,
    projectIds: [...new Set(relevant.map(impact => impact.projectId))],
  };
}

export function selectPoliceSummary(state: CityState) {
  const incidents = Object.values(state.incidents);
  const matches = selectWatchlist(state);
  const observations = latestTraffic(state);
  const events: { id: string; at: string; title: string; detail: string }[] = [
    ...incidents.map(item => ({ id: `incident-${item.id}`, at: item.observedAt, title: item.type, detail: `${item.id} · ${item.location} · ${item.status}` })),
    ...matches.flatMap(item => item.observations?.length
      ? item.observations.map(observation => ({ id: `match-${item.id}-${observation.id}`, at: observedTime(observation.timestamp), title: `${item.subjectType} possible match`, detail: `${item.id} · ${observation.location} · ${observation.busId} · ${item.status}` }))
      : [{ id: `match-${item.id}`, at: observedTime(item.timestamp), title: `${item.subjectType} possible match`, detail: `${item.id} · ${item.location} · ${item.status}` }]),
    ...Object.values(state.anomalies).map(item => ({ id: `anomaly-${item.id}`, at: item.detectedAt, title: 'Traffic anomaly detected', detail: `${item.id} · ${roadName(state, item.roadSegmentId)} · ${item.status}` })),
  ];
  const detectionEvents = [...events];
  for (const assignment of Object.values(state.assignments)) {
    const team = state.teams[assignment.teamId];
    if (state.departments[team?.departmentId]?.role !== 'police') continue;
    const incident = assignment.event.kind === 'incident' && state.incidents[assignment.event.id];
    const match = state.watchlist[assignment.event.id];
    const anomaly = assignment.event.kind === 'anomaly' && state.anomalies[assignment.event.id];
    const linked = incident ? incident.type : match ? `${match.subjectType} match` : anomaly ? 'Traffic anomaly' : 'Event';
    events.push({ id: `assignment-${assignment.id}`, at: assignment.assignedAt, title: 'Response assigned', detail: `${assignment.event.id} · ${linked} · ${assignment.assignee} · ${team.name}` });
    if (assignment.acknowledgedAt) events.push({ id: `acknowledgement-${assignment.id}`, at: assignment.acknowledgedAt, title: 'Assignment acknowledged', detail: `${assignment.event.id} · ${linked} · ${team.name}` });
  }
  const day = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  return {
    activeIncidents: incidents.filter(item => isActive(item.status) && byTime(item.observedAt, state.now) <= 0 && resolutionFor(state, { kind: 'incident', id: item.id }).decision !== 'Verified').length,
    possibleMatches: matches.filter(item => isActive(item.status)).length,
    vehiclesObserved: observations.reduce((sum, item) => sum + item.vehicleCount, 0),
    alertsToday: detectionEvents.filter(item => byTime(item.at, state.now) <= 0 && day(item.at) === day(state.now)).length,
    reportingBuses: Object.values(state.buses).filter(bus => bus.status === 'Sensing').length,
    activity: events.filter(item => byTime(item.at, state.now) <= 0)
      .sort((a, b) => byTime(b.at, a.at) || byId(a, b))
      .map(item => ({ id: item.id, time: formatDemoDate(item.at), title: item.title, detail: item.detail })),
  };
}

export function selectTrafficAnomalies(state: CityState) {
  return Object.values(state.anomalies).map(anomaly => {
    const observation = state.trafficObservations[anomaly.observationId];
    const dispatch = Object.values(state.dispatches).filter(item => item.anomalyId === anomaly.id && byTime(item.requestedAt, state.now) <= 0)
      .sort((a, b) => byTime(b.requestedAt, a.requestedAt) || byId(b, a))[0];
    return {
      ...structuredClone(anomaly),
      // A missing/zero baseline is not evidence of an infinite traffic increase.
      ratio: observation && observation.baselineVehicleCount > 0 ? observation.vehicleCount / observation.baselineVehicleCount : null,
      observation: observation && structuredClone(observation),
      ...(dispatch ? { dispatch: structuredClone(dispatch) } : {}),
    };
  });
}