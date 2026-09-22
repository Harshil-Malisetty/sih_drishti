import type { RoadCoordinate } from '../types';
import type { CityState, RoadSegment } from '../types/city';
import { municipalHeatCategories, policeHeatCategories, selectHeatSignals, type HeatFilters, type HeatPoint, type HeatPeriod } from './mapSignals';
import { distanceKm } from './citizenJourney';
import { segmentInJurisdiction, type PoliceJurisdictionId } from './policeJurisdictions';

/**
 * Simulated city-wide road-event distribution. These are detection samples spread
 * along the mapped road network, NOT vehicle positions: a sensing bus never creates,
 * moves or removes a sample, and the field exists on corridors no bus is currently on.
 * Canonical cases from the store are layered on top at their own recorded locations.
 */
export const FIELD_WINDOW_DAYS = 30;
const SAMPLE_SPACING_KM = .05;
const CORE_RADIUS_KM = .34;

const hash = (seed: string) => {
  let value = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) { value ^= seed.charCodeAt(index); value = Math.imul(value, 0x01000193); }
  return value >>> 0;
};
/** Deterministic per-sample noise: the same seed always yields the same field. */
function random(seed: string) {
  let state = hash(seed) || 1;
  return () => { state |= 0; state = state + 0x6d2b79f5 | 0; let t = Math.imul(state ^ state >>> 15, 1 | state); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const pick = <T,>(items: readonly T[], value: number) => items[Math.min(items.length - 1, Math.floor(value * items.length))];

const levelPressure = { Free: .34, Moderate: .55, Heavy: .82, Severe: 1 } as const;
const fieldCategories = (role: 'police' | 'municipal') =>
  (role === 'police' ? policeHeatCategories : municipalHeatCategories).filter(([id]) => id !== 'all').map(([id]) => id);
const fieldTitle: Record<string, string> = {
  'hit-and-run': 'Simulated hit-and-run signal', collision: 'Simulated collision signal', 'rash-driving': 'Simulated rash-driving signal',
  obstruction: 'Simulated obstruction signal', other: 'Simulated road event signal', pothole: 'Simulated road surface signal',
  waterlogging: 'Simulated waterlogging signal', infrastructure: 'Simulated infrastructure signal', 'school-crossing': 'Simulated crossing signal',
};

interface Walk { points: RoadCoordinate[]; lengths: number[]; length: number }
function walk(segment: RoadSegment): Walk | null {
  const points = segment.points.filter(point => Number.isFinite(point?.[0]) && Number.isFinite(point?.[1]));
  if (points.length < 2) return null;
  const lengths = [0];
  for (let index = 1; index < points.length; index++) lengths.push(lengths[index - 1] + distanceKm(points[index - 1], points[index]));
  return { points, lengths, length: lengths[lengths.length - 1] };
}
function along(walk: Walk, distance: number): { point: RoadCoordinate; normal: RoadCoordinate } {
  const clamped = Math.max(0, Math.min(walk.length, distance));
  let index = walk.lengths.findIndex(value => value >= clamped);
  index = Math.max(1, index);
  const a = walk.points[index - 1], b = walk.points[index];
  const span = walk.lengths[index] - walk.lengths[index - 1] || 1;
  const t = (clamped - walk.lengths[index - 1]) / span;
  const cos = Math.cos(a[0] * Math.PI / 180) || 1;
  const dy = b[0] - a[0], dx = (b[1] - a[1]) * cos;
  const size = Math.hypot(dx, dy) || 1;
  return { point: [a[0] + dy * t, a[1] + (b[1] - a[1]) * t], normal: [-dx / size, dy / size / cos] };
}

/** Cores give the field visible concentration instead of an even ribbon along every road. */
function segmentCores(segment: RoadSegment, walk: Walk) {
  const next = random(`core:${segment.id}`);
  const count = 1 + Math.floor(next() * Math.min(3, Math.max(1, Math.round(walk.length / 1.6))));
  return Array.from({ length: count }, () => ({ at: next() * walk.length, strength: .55 + next() * .45 }));
}

function segmentSamples(state: CityState, segment: RoadSegment, role: 'police' | 'municipal'): HeatPoint[] {
  const categories = fieldCategories(role);
  const geometry = walk(segment);
  const observation = Object.values(state.trafficObservations).find(item => item.roadSegmentId === segment.id);
  const pressure = levelPressure[(observation?.densityLevel || segment.baselineLevel || 'Moderate') as keyof typeof levelPressure] ?? .55;
  const exposure = Math.min(1, (segment.observedPasses || 200) / 1400);
  const now = Date.parse(state.now);
  const samples: HeatPoint[] = [];

  // A point-geometry segment (a single located condition) still contributes a small
  // neighbourhood of detections rather than one isolated dot.
  if (!geometry) {
    const anchor = segment.points[0];
    if (!anchor || !Number.isFinite(anchor[0]) || !Number.isFinite(anchor[1])) return samples;
    const next = random(`point:${segment.id}:${role}`);
    const count = 4 + Math.floor(next() * 5);
    for (let index = 0; index < count; index++) {
      const angle = next() * Math.PI * 2, spread = next() * .22;
      samples.push(sample(`FLD-${segment.id}-${index}`, segment,
        [anchor[0] + Math.cos(angle) * spread / 111.32, anchor[1] + Math.sin(angle) * spread / (111.32 * Math.cos(anchor[0] * Math.PI / 180) || 1)],
        pick(categories, next()), .5 + next() * 1.6, next, now));
    }
    return samples;
  }

  const cores = segmentCores(segment, geometry);
  const next = random(`line:${segment.id}:${role}`);
  const steps = Math.max(2, Math.round(geometry.length / SAMPLE_SPACING_KM));
  for (let index = 0; index <= steps; index++) {
    const at = index / steps * geometry.length;
    const core = cores.reduce((peak, item) => Math.max(peak, item.strength * Math.max(0, 1 - Math.abs(at - item.at) / CORE_RADIUS_KM)), 0);
    const density = .1 + .34 * pressure * exposure + .62 * core;
    if (next() > density) { next(); next(); next(); continue; }
    const { point, normal } = along(geometry, at + (next() - .5) * SAMPLE_SPACING_KM);
    const offset = (next() - .5) * .05;
    samples.push(sample(`FLD-${segment.id}-${index}`, segment,
      [point[0] + normal[0] * offset, point[1] + normal[1] * offset],
      pick(categories, next()), .45 + core * 2.1 + pressure * .9, next, now));
  }
  return samples;
}

function sample(id: string, segment: RoadSegment, point: RoadCoordinate, category: string, weight: number, next: () => number, now: number): HeatPoint {
  const detections = 1 + Math.floor(next() * 11);
  return {
    id, latitude: point[0], longitude: point[1], segmentId: segment.id,
    title: fieldTitle[category] || 'Simulated road event signal', location: segment.name,
    category, weight, detections, active: next() > .28,
    observedAt: new Date(now - next() * FIELD_WINDOW_DAYS * 86_400_000).toISOString(),
    simulated: true,
  };
}

const inWindow = (at: string, now: string, period: HeatPeriod) => {
  const age = Date.parse(now) - Date.parse(at);
  return Number.isFinite(age) && age >= 0 && (period === 'all' || age <= Number(period) * 86_400_000);
};

/**
 * The simulated distribution on its own. Depends only on the mapped road network and
 * the store clock, so it never follows, orbits or vanishes with a sensing vehicle.
 */
export function simulatedEventField(state: CityState, role: 'police' | 'municipal', filters: HeatFilters, scope: PoliceJurisdictionId = 'all'): HeatPoint[] {
  const points = Object.values(state.roadSegments).flatMap(segment => segmentSamples(state, segment, role));
  return points.filter(point =>
    (role !== 'police' || segmentInJurisdiction(point.segmentId, scope))
    && (filters.history || point.active)
    && (filters.category === 'all' || filters.category === point.category)
    && inWindow(point.observedAt, state.now, filters.period))
    .map(point => filters.metric === 'observations'
      ? { ...point, weight: point.weight * Math.min(8, 1 + Math.log2(Math.max(1, point.detections))) / 2 }
      : point);
}

/**
 * What the heat layer renders: the city-wide distribution plus the canonical cases,
 * which carry extra weight so confirmed records still read as the strongest areas.
 */
export function selectCityEventField(state: CityState, role: 'police' | 'municipal', filters: HeatFilters, scope: PoliceJurisdictionId = 'all'): HeatPoint[] {
  const cases = selectHeatSignals(state, role, filters, scope).map(point => ({ ...point, weight: point.weight * 3.4 }));
  return [...simulatedEventField(state, role, filters, scope), ...cases];
}
