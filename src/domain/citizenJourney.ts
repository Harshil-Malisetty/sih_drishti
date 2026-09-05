import type { RoadCoordinate } from '../types';
import type { CityState, PublicMunicipalProject } from '../types/city';
import { selectCitizenContext } from './selectors';

export interface JourneyPlace { id: string; name: string; point: RoadCoordinate }
export const journeyPlaces: JourneyPlace[] = [
  { id: 'teynampet', name: 'Teynampet', point: [13.048, 80.249] },
  { id: 'guindy', name: 'Guindy · Race Course', point: [13.0067, 80.2206] },
  { id: 'adyar', name: 'Adyar · Sardar Patel Road', point: [13.0067, 80.246] },
  { id: 'central', name: 'Chennai Central', point: [13.0827, 80.2707] },
];
export interface JourneyRoute {
  id: string; label: string; points: RoadCoordinate[]; distanceKm: number; baselineMinutes: number;
  segmentIds: string[]; source: 'Saved road-network route' | 'OSRM road-network route';
}

// Saved OSRM / OpenStreetMap route geometries, fetched 5 September 2026.
// The eastern candidate was calculated through Alwarpet and Sardar Patel Road.
// No runtime network request is required for this demonstration. These are
// car-profile estimates, not live traffic, street-level closure coverage, or navigation.
const coordinates = (points: number[][]): RoadCoordinate[] => points.map(([lon, lat]) => [lat, lon]);
export const savedJourneyRoutes: JourneyRoute[] = [
  { id: 'direct', label: 'Via Anna Salai corridor', distanceKm: 7.458, baselineMinutes: 570.9 / 60, segmentIds: ['anna', 'gst-saidapet'], source: 'Saved road-network route', points: coordinates([[80.249081,13.047926],[80.249709,13.049412],[80.247671,13.049536],[80.245873,13.048159],[80.240477,13.045115],[80.240984,13.043953],[80.240502,13.040344],[80.23995,13.040429],[80.239323,13.035362],[80.236964,13.034156],[80.237221,13.031214],[80.236877,13.031257],[80.234005,13.028667],[80.233704,13.027582],[80.232939,13.027064],[80.233073,13.026496],[80.230389,13.02554],[80.227829,13.02368],[80.224556,13.019499],[80.224523,13.018845],[80.22791,13.009676],[80.227578,13.009569],[80.223282,13.01139],[80.220601,13.006697]]) },
  { id: 'east', label: 'Via Alwarpet & Adyar', distanceKm: 14.048, baselineMinutes: 1125.6 / 60, segmentIds: [], source: 'Saved road-network route', points: coordinates([[80.249081,13.047926],[80.249709,13.049412],[80.247566,13.049574],[80.251088,13.052587],[80.25488,13.046801],[80.257353,13.045896],[80.259887,13.045528],[80.259452,13.042591],[80.256732,13.038089],[80.257058,13.034865],[80.256651,13.0309],[80.256991,13.030876],[80.260185,13.030792],[80.260278,13.029386],[80.261174,13.029145],[80.261488,13.029703],[80.2619,13.029756],[80.266484,13.02926],[80.265929,13.026157],[80.263127,13.021432],[80.262939,13.018997],[80.261349,13.018689],[80.259528,13.015845],[80.258922,13.007916],[80.258388,13.007147],[80.257236,13.006594],[80.247662,13.00666],[80.24738,13.005422],[80.24615,13.006644],[80.240616,13.006717],[80.246014,13.006756],[80.246646,13.006646],[80.241352,13.006599],[80.228676,13.009065],[80.223282,13.01139],[80.220601,13.006697]]) },
];

export function distanceKm(a: RoadCoordinate, b: RoadCoordinate) {
  const dy = (a[0] - b[0]) * 111.32, dx = (a[1] - b[1]) * 111.32 * Math.cos((a[0] + b[0]) * Math.PI / 360);
  return Math.hypot(dx, dy);
}

/** Distance to the entire polyline, not just sparse route vertices. */
export function distanceToRoute(point: RoadCoordinate, route: RoadCoordinate[]): number {
  let nearest = Infinity;
  const cos = Math.cos(point[0] * Math.PI / 180);
  for (let i = 1; i < route.length; i++) {
    const a = [(route[i - 1][1] - point[1]) * cos, route[i - 1][0] - point[0]];
    const b = [(route[i][1] - point[1]) * cos, route[i][0] - point[0]];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = dx * dx + dy * dy;
    const t = length ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / length)) : 0;
    nearest = Math.min(nearest, Math.hypot(a[0] + t * dx, a[1] + t * dy) * 111.32);
  }
  return nearest;
}

export function evaluateJourney(state: CityState, routes: JourneyRoute[]) {
  const context = selectCitizenContext(state);
  return routes.map(route => {
    const near = (id: string) => state.roadSegments[id]?.points.some(point => distanceToRoute(point, route.points) <= .12) ?? false;
    const relevant = (id: string) => route.segmentIds.includes(id) || near(id);
    const impacts = context.impacts.filter(impact => relevant(impact.roadSegmentId));
    const blocked = impacts.some(impact => impact.restriction === 'Closed');
    const delay = impacts.filter(impact => impact.restriction === 'Delay').reduce((sum, impact) => sum + impact.delayMinutes, 0);
    const projects: PublicMunicipalProject[] = context.projects.filter(project => impacts.some(impact => impact.projectId === project.projectId));
    const conditions = context.conditions.filter(condition => !condition.verified && relevant(condition.roadSegmentId));
    const traffic = context.traffic.filter(item => item.roadSegmentId && relevant(item.roadSegmentId));
    return { ...route, minutes: blocked ? null : Math.round(route.baselineMinutes + delay), delay, blocked, projects, conditions, traffic };
  });
}