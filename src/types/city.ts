import type { Bus, CitizenRoute, Incident, PlannerRoadSegment, RoadDefect, Severity, TrafficObservation, WatchlistMatch } from './index';

// IDs are stable fixture/API identifiers. Display names must never be used as foreign keys.
export interface Road { id: string; name: string }
export interface RoadSegment extends Omit<PlannerRoadSegment, 'hourlyVehicles'> {
  roadId: string; planningEnabled: boolean;
  // Historical planning input only. Current flow always comes from linked observations.
  baselineHourlyVehicles: number;
}
export interface CityTrafficObservation extends TrafficObservation {
  roadSegmentId: string;
  observedAt: string;
  windowMinutes: number;
  sourceBusIds: string[];
  baselineVehicleCount: number;
  baselineSource: string;
}
export interface CityBus extends Bus { roadSegmentId: string; observedAt: string }
export interface CityIncident extends Incident { roadSegmentId: string; observedAt: string; resolvedAt?: string; emergencyDispatchId?: string; resolutionSummary?: string; citizenReportId?: string; citizenDescription?: string }
export type IssueKind = 'pothole' | 'waterlogging' | 'obstruction' | 'zebra-crossing' | 'divider' | 'signboard' | 'guardrail' | 'school-crossing';
export interface Department { id: string; name: string; role: 'municipal' | 'police' | 'response' }
export interface Team { id: string; departmentId: string; name: string }
export type EventRef = { kind: 'municipal'; id: string } | { kind: 'incident'; id: string } | { kind: 'anomaly'; id: string };
export type WorkflowStage = 'Detected' | 'Qualified' | 'Assigned' | 'Acknowledged' | 'In progress' | 'Admin review' | 'Verified' | 'Closed';
export interface WorkflowEntry { at: string; action: string; actor: string }
export interface MunicipalIssue extends RoadDefect {
  citizenReportId?: string;
  kind: IssueKind;
  roadSegmentId: string;
  departmentId: string;
  workflowStage: WorkflowStage;
  history: WorkflowEntry[];
}
export interface DepartmentAssignment {
  id: string; event: EventRef; departmentId: string; teamId: string;
  assignee: string; assignedAt: string; acknowledgedAt?: string; supersededAt?: string;
}
export interface ResolutionEvidence { id: string; image: string; capturedAt: string; description: string }
export interface FieldResolution {
  id: string; event: EventRef; assignmentId: string; submittedAt: string;
  submittedBy: string; summary: string; resultingCondition: string; evidence: ResolutionEvidence[];
}
export interface AdminReview {
  id: string; resolutionId: string; notifiedAt: string;
  decision: 'Pending' | 'Verified' | 'Returned'; reviewedAt?: string; reviewer?: string; note?: string;
}
export interface TrafficAnomaly {
  id: string; roadSegmentId: string; observationId: string; detectedAt: string;
  status: 'Candidate' | 'Qualified' | 'Dismissed' | 'Dispatched' | 'Closed';
  history: WorkflowEntry[];
}
export type DispatchStage = 'Requested' | 'Assigned' | 'En route' | 'On scene' | 'Admin review' | 'Verified' | 'Closed';
export interface PoliceDispatch { id: string; anomalyId: string; requestedAt: string; stage: DispatchStage; history: WorkflowEntry[] }
export type EmergencyStage = 'Requested' | 'Assigned' | 'En route' | 'On scene' | 'Response complete' | 'Discharged';
export interface EmergencyDispatch {
  id: string; event: EventRef; reason: string; requestedAt: string; stage: EmergencyStage;
  teamId?: string; completedAt?: string; dischargedAt?: string; outcome?: string; resolvedAt?: string;
  history: WorkflowEntry[];
}
export type ImpactSeverity = Extract<Severity, 'High' | 'Medium' | 'Low'> | 'Severe';
export interface AffectedRoadSegment {
  roadSegmentId: string; restriction: 'Closed' | 'Delay'; additionalVehicles: number;
  saturation: number; delayMinutes: number; severity: ImpactSeverity;
}
export interface PlanningScenario {
  id: string; roadSegmentId: string; duration: string; days: number;
  startsAt: string; endsAt: string; createdAt: string; modelVersion: 'demo-capacity-v1';
  // Intentional immutable input snapshot: approval must publish the result that was reviewed.
  inputs: { road: PlannerRoadSegment; connected: PlannerRoadSegment[]; observationIds: string[] };
  scenarioLabel: string; delay: number; simulatedMinutes: number;
  affected: AffectedRoadSegment[]; busRoutes: string[];
  timeline: { label: string; day: number; delay: number }[];
  confidence: 'Observed' | 'Limited';
}
export interface MunicipalProject {
  id: string; scenarioId: string; title: string; status: 'Draft' | 'Approved' | 'Cancelled';
  projectType: 'Road works' | 'Resurfacing';
  createdAt: string; approvedAt?: string; approvedBy?: string; publishedAt?: string;
}
export interface PublicRoadCondition {
  id: string; roadSegmentId: string; title: string; location: string; condition: string;
  severity: Severity; verified: boolean; updatedAt: string;
}
export interface PublicRoadImpact extends AffectedRoadSegment {
  projectId: string; title: string; roadName: string; startsAt: string; endsAt: string;
}
export interface CitizenMobilityContext {
  asOf: string; traffic: TrafficObservation[]; conditions: PublicRoadCondition[]; impacts: PublicRoadImpact[]; projects: PublicMunicipalProject[];
}
export interface PublicMunicipalProject {
  id: string; projectId: string; title: string; projectType: MunicipalProject['projectType'];
  roadSegmentId: string; roadName: string; status: 'Planned' | 'Active' | 'Completed';
  startsAt: string; endsAt: string; source: 'Municipal planning system';
  affectedCorridors: { roadSegmentId: string; name: string; restriction: 'Closed' | 'Delay'; delayMinutes: number }[];
  alternativeCorridors: string[]; peakDelayMinutes: number;
}
export interface MunicipalTask {
  id: string; kind: 'Assignment' | 'Field action' | 'Verification' | 'Closure' | 'Project' | 'Citizen update';
  title: string; detail: string; at: string; actionRequired: boolean;
  target: { kind: 'issue'; id: string } | { kind: 'scenario'; id: string };
}
export interface RouteLeg { roadSegmentId: string; fraction: number }
export interface CitizenReportInput {
  roadSegmentId: string; category: 'pothole' | 'waterlogging' | 'obstruction' | 'traffic-obstruction'; description: string; image?: string;
}
export interface CitizenReport extends CitizenReportInput {
  id: string; image: string; submittedAt: string; status: 'Pending' | 'Accepted' | 'Dismissed'; reviewNote?: string; issueId?: string; incidentId?: string;
}
export interface DemoJourney {
  id: string; origin: string; destination: string;
  current: RouteLeg[]; alternative: RouteLeg[]; viaSegmentId: string;
  stops: string[];
}
export interface CityState {
  version: 1; revision: number; now: string;
  roads: Record<string, Road>; roadSegments: Record<string, RoadSegment>;
  trafficObservations: Record<string, CityTrafficObservation>;
  buses: Record<string, CityBus>; incidents: Record<string, CityIncident>;
  watchlist: Record<string, WatchlistMatch>; issues: Record<string, MunicipalIssue>;
  departments: Record<string, Department>; teams: Record<string, Team>;
  assignments: Record<string, DepartmentAssignment>; resolutions: Record<string, FieldResolution>;
  reviews: Record<string, AdminReview>; anomalies: Record<string, TrafficAnomaly>;
  dispatches: Record<string, PoliceDispatch>; scenarios: Record<string, PlanningScenario>;
  emergencyDispatches: Record<string, EmergencyDispatch>;
  projects: Record<string, MunicipalProject>; journey: DemoJourney;
  citizenReports: Record<string, CitizenReport>;
}
export interface CitizenJourney extends Omit<CitizenRoute, 'currentMinutes' | 'alternativeMinutes'> {
  currentMinutes: number | null; alternativeMinutes: number | null;
  currentVia: string; currentTraffic: TrafficObservation['densityLevel'];
  currentSegmentIds: string[]; alternativeSegmentIds: string[]; projectIds: string[];
}