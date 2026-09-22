import type { CityState, IssueKind } from '../types/city';
import { segmentInJurisdiction, type PoliceJurisdictionId } from './policeJurisdictions';
import { demoDate } from './time';

export type HeatPeriod = 'all' | '7' | '30';
export type HeatMetric = 'cases' | 'observations';
export interface HeatFilters { category: string; period: HeatPeriod; history: boolean; metric: HeatMetric }
export interface HeatPoint {
  id: string; latitude: number; longitude: number; segmentId: string;
  title: string; location: string; category: string; weight: number;
  detections: number; active: boolean; observedAt: string;
  /** Set on generated city-wide distribution samples; canonical store cases leave it unset. */
  simulated?: boolean;
}
export const defaultHeatFilters: HeatFilters = { category: 'all', period: 'all', history: false, metric: 'cases' };
export const policeHeatCategories = [
  ['all', 'All incidents'], ['hit-and-run', 'Hit and run'], ['collision', 'Collisions'],
  ['rash-driving', 'Rash driving'], ['obstruction', 'Obstructions'], ['other', 'Other incidents'],
] as const;
export const municipalHeatCategories: readonly (readonly [string, string])[] = [
  ['all', 'All conditions'], ['pothole', 'Potholes'], ['waterlogging', 'Waterlogging'],
  ['obstruction', 'Road debris'], ['infrastructure', 'Infrastructure'], ['school-crossing', 'School crossings'],
];
export function policeHeatCategory(type: string): string {
  if (/hit[\s-]*(?:and|&|n)[\s-]*run/i.test(type)) return 'hit-and-run';
  if (/collision|crash|accident/i.test(type)) return 'collision';
  if (/rash|speed|dangerous.driving/i.test(type)) return 'rash-driving';
  if (/obstruct|parking|debris/i.test(type)) return 'obstruction';
  return 'other';
}
const infrastructure: IssueKind[] = ['zebra-crossing', 'divider', 'signboard', 'guardrail'];
const validPoint = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
function inWindow(at: string, now: string, period: HeatPeriod) {
  const age = Date.parse(now) - Date.parse(at);
  return Number.isFinite(age) && age >= 0 && (period === 'all' || age <= Number(period) * 86_400_000);
}

/** One point per canonical case, never raw reports, AI candidates or watchlist sightings. */
export function selectHeatSignals(state: CityState, role: 'police' | 'municipal', filters: HeatFilters, scope: PoliceJurisdictionId = 'all'): HeatPoint[] {
  const points: HeatPoint[] = role === 'police'
    ? Object.values(state.incidents).filter(item => segmentInJurisdiction(item.roadSegmentId, scope) && item.status !== 'Dismissed').map(item => ({
      id: item.id, latitude: item.latitude, longitude: item.longitude, segmentId: item.roadSegmentId,
      title: item.type, location: item.location, category: policeHeatCategory(item.type),
      weight: 1, detections: 0, observedAt: item.observedAt,
      active: !['Resolved', 'Closed', 'Verified', 'Dismissed'].includes(item.status),
    }))
    : Object.values(state.issues).filter(item => item.status !== 'Dismissed').map(item => ({
      id: item.id, latitude: item.latitude, longitude: item.longitude, segmentId: item.roadSegmentId,
      title: item.defectType, location: item.location,
      category: infrastructure.includes(item.kind) ? 'infrastructure' : item.kind,
      // Aggregate repeat observations are NOT independent defects. A logarithmic cap
      // prevents a heavily sampled single condition from dominating the whole map.
      weight: filters.metric === 'observations' ? Math.min(8, 1 + Math.log2(Math.max(1, item.detectionCount))) : 1,
      detections: Math.max(0, item.detectionCount), active: !['Verified', 'Closed'].includes(item.workflowStage),
      observedAt: demoDate(item.lastSeen),
    }));
  return points.filter(point => validPoint(point.latitude, point.longitude)
    && (filters.history || point.active)
    && (filters.category === 'all' || filters.category === point.category)
    && inWindow(point.observedAt, state.now, filters.period));
}

/** Summaries use exactly the same filtered points as the visual layer. */
export function rankHotspots(points: HeatPoint[]) {
  const groups = new Map<string, { segmentId: string; location: string; points: HeatPoint[]; weight: number; detections: number }>();
  for (const point of points) {
    const group = groups.get(point.segmentId) || { segmentId: point.segmentId, location: point.location, points: [], weight: 0, detections: 0 };
    group.points.push(point); group.weight += point.weight; group.detections += point.detections;
    groups.set(point.segmentId, group);
  }
  return [...groups.values()].sort((a, b) => b.weight - a.weight || a.segmentId.localeCompare(b.segmentId));
}