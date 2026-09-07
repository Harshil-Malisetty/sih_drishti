import { buses, defects, incidents, municipalEvidenceImages, plannerRoadSegments, traffic, watchlist } from './index';
import type { CityState, CityTrafficObservation, Department, IssueKind, MunicipalIssue, RoadSegment, Team } from '../../types/city';
import { anchorCityHistory, demoDate } from '../../domain/time';

export const DEMO_START = '2026-09-05T18:55:00+05:30';
const byId = <T extends { id: string }>(items: T[]): Record<string, T> => Object.fromEntries(items.map(item => [item.id, item]));
export const issueDepartments: Record<IssueKind, string> = {
  obstruction: 'roads-engineering',
  pothole: 'roads-engineering', waterlogging: 'stormwater', 'zebra-crossing': 'road-safety',
  divider: 'roads-infrastructure', signboard: 'signage', guardrail: 'roads-infrastructure', 'school-crossing': 'road-safety',
};
const issueLinks: Record<string, { kind: IssueKind; segment: string; road: string }> = {
  'DEF-8301': { kind: 'pothole', segment: 'omr-sholinganallur', road: 'omr' },
  'DEF-8292': { kind: 'waterlogging', segment: 'velachery', road: 'velachery' },
  'INF-8168': { kind: 'zebra-crossing', segment: 'velachery-phoenix', road: 'velachery' },
  'INF-8159': { kind: 'divider', segment: 'anna-nandanam', road: 'anna' },
  'INF-8152': { kind: 'signboard', segment: 'guindy-kathipara', road: 'inner-ring' },
  'INF-8148': { kind: 'guardrail', segment: 'omr-thoraipakkam', road: 'omr' },
  'DEF-8141': { kind: 'school-crossing', segment: 'adyar-school', road: 'adyar-school' },
};
const departments: Department[] = [
  { id: 'roads-engineering', name: 'Roads / Engineering', role: 'municipal' },
  { id: 'stormwater', name: 'Drainage / Stormwater', role: 'municipal' },
  { id: 'roads-infrastructure', name: 'Roads / Infrastructure', role: 'municipal' },
  { id: 'signage', name: 'Traffic Infrastructure / Signage', role: 'municipal' },
  { id: 'road-safety', name: 'Road Safety / Traffic Engineering', role: 'municipal' },
  { id: 'traffic-police', name: 'Traffic Police', role: 'police' },
  { id: 'city-response', name: 'City Response', role: 'response' },
];
const teams: Team[] = [
  ...departments.filter(department => department.role === 'municipal').map(department => ({ id: `${department.id}-team`, departmentId: department.id, name: `${department.name} field team` })),
  { id: 'traffic-investigation', departmentId: 'traffic-police', name: 'Traffic Investigation Unit' },
  { id: 'vehicle-crime', departmentId: 'traffic-police', name: 'Vehicle Crime Unit' },
  { id: 'central-response', departmentId: 'traffic-police', name: 'Central Response Team' },
  { id: 'city-response-team', departmentId: 'city-response', name: 'City Response Team' },
];

// Explicit anchor keeps tests deterministic; the browser supplies its first workspace-entry time.
// Legacy display fixtures are seed inputs only. All application reads go through the city store.
export function createCitySeed(anchor = DEMO_START): CityState {
  const roadSegments = byId<RoadSegment>(plannerRoadSegments.map(segment => {
    const { hourlyVehicles, ...definition } = structuredClone(segment);
    return { ...definition, roadId: segment.id, planningEnabled: true, baselineHourlyVehicles: hourlyVehicles };
  }));
  const roads = byId(plannerRoadSegments.map(segment => ({ id: segment.id, name: segment.name.split(' · ')[0] })));
  roads['adyar-school'] = { id: 'adyar-school', name: 'Adyar School Zone' };
  // A point-located issue is not fabricated into a routable line. Non-planning segments remain point geometries.
  for (const defect of defects) {
    const link = issueLinks[defect.id];
    if (!roadSegments[link.segment]) roadSegments[link.segment] = {
      id: link.segment, roadId: link.road, name: defect.location, points: [[defect.latitude, defect.longitude]],
      baselineLevel: 'Moderate', baselineMinutes: 0, observedPasses: defect.detectionCount,
      baselineHourlyVehicles: 0, capacity: 1, busRoutes: [defect.route], connectsTo: [], planningEnabled: false,
    };
  }
  roadSegments['gst-saidapet'] = { ...structuredClone(roadSegments.gst), id: 'gst-saidapet', name: 'GST Road · Guindy to Saidapet', points: [[13.0067,80.2206],[13.0213,80.2231]], planningEnabled: false };
  roadSegments.gst.name = 'GST Road · South of Guindy';

  const trafficLinks = { 'TR-1': 'anna', 'TR-2': 'omr', 'TR-3': 'gst-saidapet' } as const;
  const trafficObservations = byId<CityTrafficObservation>(traffic.map(item => ({
    ...item, roadSegmentId: trafficLinks[item.id as keyof typeof trafficLinks], observedAt: demoDate(item.timestamp),
    windowMinutes: 60, sourceBusIds: item.id === 'TR-2' ? ['MTC-1830','MTC-0992'] : ['MTC-2147','MTC-1423'],
    baselineVehicleCount: item.id === 'TR-1' ? 60 : item.vehicleCount,
    baselineSource: 'Fixed demo comparison window: same corridor, 60 minutes; not a measured city forecast',
  })));
  for (const road of plannerRoadSegments) {
    if (Object.values(trafficObservations).some(observation => observation.roadSegmentId === road.id)) continue;
    const id = `TR-${road.id}`;
    trafficObservations[id] = {
      id, roadSegmentId: road.id, road: roads[road.id].name, location: road.name,
      vehicleCount: road.hourlyVehicles, densityLevel: road.baselineLevel,
      averageSpeed: { Free: 44, Moderate: 34, Heavy: 18, Severe: 11 }[road.baselineLevel],
      timestamp: '18:44', observedAt: DEMO_START, windowMinutes: 60,
      baselineVehicleCount: road.hourlyVehicles, baselineSource: 'Fixed demo corridor baseline, 60-minute window',
      sourceBusIds: ['MTC-2147'], trend: 'Stable', mapX: 50, mapY: 50, recommendedAction: 'Review local road conditions',
    };
  }
  const issues = byId<MunicipalIssue>(defects.map(defect => {
    const link = issueLinks[defect.id];
    const observations = defect.observations?.map((observation, index) => ({ ...observation,
      observedAt: index === (defect.observations?.length || 0) - 1 && demoDate(observation.date).slice(0,10) === demoDate(defect.lastSeen).slice(0,10)
        ? demoDate(defect.lastSeen) : demoDate(observation.date),
    }));
    return { ...structuredClone(defect), observations, kind: link.kind, roadSegmentId: link.segment,
      departmentId: issueDepartments[link.kind], workflowStage: defect.status === 'Verified' ? 'Closed' : 'Detected',
      history: [{ at: demoDate(defect.firstSeen), action: 'Fleet issue detected', actor: defect.busIds[0] }],
    };
  }));
  // Reconcile the already-verified seed with actual post-repair history; do not relabel the old pothole photo.
  const repaired = issues['DEF-8301'];
  repaired.observations!.push({ day: 23, date: '03 Sep · 15:55', observedAt: demoDate('03 Sep · 15:55'), label: 'Repair in progress', detail: 'Field team compacts the patch; admin verification is still required.', relativeSize: 42, busId: '', image: municipalEvidenceImages.pothole.repair, source: 'Illustrative field-work stage — not a bus observation' });
  repaired.observations!.push({ day: 25, date: '05 Sep · 16:12', observedAt: demoDate('05 Sep · 16:12'), label: 'Repair verified', detail: 'Demo verification records a sealed, level surface. The photograph illustrates a completed patch, not this site.', relativeSize: 8, busId: 'MTC-2147', image: municipalEvidenceImages.pothole.verified, source: 'Post-repair demo verification pass' });
  repaired.image = municipalEvidenceImages.pothole.verified;
  repaired.recommendedAction = 'Continue routine fleet monitoring';
  const busSegments: Record<string, string> = {
    'MTC-2147': 'anna', 'MTC-1423': 'anna', 'MTC-1831': 'gst-saidapet', 'MTC-2014': 'guindy-kathipara',
    'MTC-1830': 'omr-sholinganallur', 'MTC-0992': 'omr-sholinganallur', 'MTC-1038': 'guindy-kathipara',
    'MTC-0817': 'adyar-school', 'MTC-2201': 'velachery', 'MTC-1872': 'gst-saidapet',
    'MTC-1102': 'velachery', 'MTC-1450': 'velachery', 'MTC-0991': 'adyar-school',
  };
  const incidentSegments: Record<string, string> = { 'INC-24091': 'anna', 'INC-24088': 'guindy-kathipara', 'INC-24071': 'gst-saidapet' };
  const sightingSegments: Record<string, string> = { 'OBS-1': 'anna', 'OBS-2': 'gst-saidapet', 'OBS-3': 'guindy-kathipara', 'VEH-1': 'anna-nandanam', 'VEH-2': 'guindy-kathipara', 'VEH-3': 'velachery' };
  const state: CityState = {
    version: 1, revision: 0, now: DEMO_START, roads, roadSegments, trafficObservations,
    buses: byId(buses.map(bus => ({ ...bus, roadSegmentId: busSegments[bus.id], observedAt: DEMO_START }))),
    incidents: byId(incidents.map(incident => ({ ...structuredClone(incident), roadSegmentId: incidentSegments[incident.id], observedAt: demoDate(incident.timestamp) }))),
    watchlist: byId(watchlist.map(match => ({ ...structuredClone(match), observations: match.observations?.map(observation => ({ ...observation, roadSegmentId: sightingSegments[observation.id] })) }))), issues, departments: byId(departments), teams: byId(teams),
    assignments: {}, resolutions: {}, reviews: {}, anomalies: {}, dispatches: {}, emergencyDispatches: {}, scenarios: {}, projects: {}, citizenReports: {},
    journey: { id: 'ROUTE-B', origin: 'Teynampet', destination: 'Guindy', current: [{ roadSegmentId: 'anna', fraction: 1 },{ roadSegmentId: 'inner-ring', fraction: 14/27 }], alternative: [{ roadSegmentId: 'cpr', fraction: 1 },{ roadSegmentId: 'inner-ring', fraction: 4/27 }], viaSegmentId: 'cpr', stops: ['Start · Teynampet','C.P. Ramaswamy Road','Guindy','Destination'] },
  };
  const event = { kind: 'municipal' as const, id: repaired.id };
  state.assignments['ASN-SEED-1'] = { id: 'ASN-SEED-1', event, departmentId: repaired.departmentId, teamId: 'roads-engineering-team', assignee: 'Roads field supervisor', assignedAt: demoDate('01 Sep · 18:00'), acknowledgedAt: demoDate('02 Sep · 09:00') };
  state.resolutions['RES-SEED-1'] = { id: 'RES-SEED-1', event, assignmentId: 'ASN-SEED-1', submittedAt: demoDate('03 Sep · 16:00'), submittedBy: 'Roads field supervisor', summary: 'Pothole sealed and levelled', resultingCondition: 'Surface sealed and level', evidence: [{ id: 'EVD-SEED-1', image: repaired.image, capturedAt: demoDate('05 Sep · 16:12'), description: 'Illustrative verification frame' }] };
  // Resolution evidence must exist at submission; the later fleet verification is in observations.
  state.resolutions['RES-SEED-1'].evidence[0].capturedAt = demoDate('03 Sep · 15:55');
  state.reviews['REV-SEED-1'] = { id: 'REV-SEED-1', resolutionId: 'RES-SEED-1', notifiedAt: demoDate('03 Sep · 16:00'), decision: 'Verified', reviewedAt: demoDate('05 Sep · 16:12'), reviewer: 'Municipal admin', note: repaired.repair!.detail };
  repaired.history.push({ at: demoDate('03 Sep · 16:00'), action: 'Field resolution submitted for admin review', actor: 'Roads field supervisor' },{ at: demoDate('05 Sep · 16:12'), action: 'Resolution verified and issue closed', actor: 'Municipal admin' });
  state.assignments['ASN-SEED-2'] = { id: 'ASN-SEED-2', event: { kind: 'incident', id: 'INC-24091' }, departmentId: 'traffic-police', teamId: 'traffic-investigation', assignee: 'Inspector R. Kumar', assignedAt: demoDate('01 Sep · 18:43') };
  state.anomalies['ANOM-ANNA-1'] = { id: 'ANOM-ANNA-1', roadSegmentId: 'anna', observationId: 'TR-1', detectedAt: trafficObservations['TR-1'].observedAt, status: 'Candidate', history: [{ at: DEMO_START, action: 'Fleet traffic candidate detected; officer review required', actor: 'Demo fleet observations' }] };
  for (const issue of Object.values(issues)) issue.lastSeen = issue.observations?.at(-1)?.observedAt || demoDate(issue.lastSeen);
  return anchorCityHistory(state, anchor);
}