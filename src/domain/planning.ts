import type { PlannerRoadSegment } from '../types';
import type { CityState, ImpactSeverity, PlanningScenario } from '../types/city';
import { selectPlannerRoads } from './selectors';

const durations = {
  '3 days': { multiplier: 0.5, days: 3, label: 'Brief works window' },
  '2 weeks': { multiplier: 0.75, days: 14, label: 'Short works window' },
  '8 weeks': { multiplier: 1, days: 56, label: 'Staged construction' },
  '4 months': { multiplier: 1.35, days: 120, label: 'Extended closure' },
} as const;

function isoTime(value: string): number {
  // Require an explicit zone and reject normalized invalid calendar dates (e.g. February 30).
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  const time = Date.parse(value);
  if (!match || !Number.isFinite(time)) throw new Error(`Invalid ISO timestamp: ${value}`);
  const [, year, month, day, hour, minute, second, zone] = match;
  const leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > days[Number(month) - 1]
    || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59
    || (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))) {
    throw new Error(`Invalid ISO timestamp: ${value}`);
  }
  return time;
}

const severity = (saturation: number): ImpactSeverity => saturation >= 1.08 ? 'Severe' : saturation >= 0.9 ? 'High' : saturation >= 0.76 ? 'Medium' : 'Low';

function snapshot(road: PlannerRoadSegment): PlannerRoadSegment {
  const copy = structuredClone(road);
  copy.points.forEach(point => Object.freeze(point));
  Object.freeze(copy.points);
  Object.freeze(copy.busRoutes);
  Object.freeze(copy.connectsTo);
  return Object.freeze(copy);
}

export function calculateScenario(
  state: CityState,
  input: { roadSegmentId: string; duration: string; startsAt?: string },
  id: string,
): PlanningScenario {
  const roads = selectPlannerRoads(state);
  const selected = roads.find(road => road.id === input.roadSegmentId);
  if (!selected) throw new Error(`Unknown or non-planning road: ${input.roadSegmentId}`);
  if (!Object.prototype.hasOwnProperty.call(durations, input.duration)) throw new Error(`Unknown duration: ${input.duration}`);
  const duration = durations[input.duration as keyof typeof durations];
  const startsAt = input.startsAt ?? state.now;
  const start = isoTime(startsAt);
  if (start < isoTime(state.now)) throw new Error('Scenario start cannot precede the city clock');
  const road = snapshot(selected);
  const connected = [...new Set(road.connectsTo)].filter(segmentId => segmentId !== road.id)
    .map(segmentId => roads.find(segment => segment.id === segmentId))
    .filter((segment): segment is PlannerRoadSegment => Boolean(segment)).map(snapshot);
  const spare = connected.map(segment => Math.max(segment.capacity - segment.hourlyVehicles, 20));
  const totalSpare = spare.reduce((sum, value) => sum + value, 0);
  const displaced = Math.round(road.hourlyVehicles * (0.58 + duration.multiplier * 0.12));
  const affected = connected.map((segment, index) => {
    const additionalVehicles = Math.round(displaced * spare[index] / totalSpare);
    const saturation = (segment.hourlyVehicles + additionalVehicles) / segment.capacity;
    const delayMinutes = Math.max(2, Math.round(segment.baselineMinutes * Math.max(0.1, saturation - 0.55) * duration.multiplier * 0.48));
    return { roadSegmentId: segment.id, restriction: 'Delay' as const, additionalVehicles, saturation, delayMinutes, severity: severity(saturation) };
  }).sort((a, b) => b.saturation - a.saturation);
  const pressure = affected.reduce((sum, impact) => sum + impact.saturation, 0) / Math.max(affected.length, 1);
  const delay = Math.max(3, Math.round(road.baselineMinutes * (0.18 + pressure * 0.2) * duration.multiplier));
  const observationIds = [road, ...connected].flatMap(segment => {
    const observation = Object.values(state.trafficObservations)
      .filter(item => item.roadSegmentId === segment.id && Date.parse(item.observedAt) <= Date.parse(state.now))
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))[0];
    return observation ? [observation.id] : [];
  });
  Object.freeze(connected);
  Object.freeze(observationIds);
  return {
    id, roadSegmentId: road.id, duration: input.duration, days: duration.days,
    startsAt, endsAt: new Date(start + duration.days * 86_400_000).toISOString(), createdAt: state.now,
    modelVersion: 'demo-capacity-v1', inputs: Object.freeze({ road, connected, observationIds }),
    scenarioLabel: duration.label, delay, simulatedMinutes: road.baselineMinutes + delay,
    affected: [
      // A closure is unavailable, not a finite journey delay; consumers must honor restriction.
      { roadSegmentId: road.id, restriction: 'Closed', additionalVehicles: 0, saturation: 0, delayMinutes: 0, severity: 'Severe' },
      ...affected,
    ],
    busRoutes: [...new Set([...road.busRoutes, ...affected.flatMap(impact => connected.find(segment => segment.id === impact.roadSegmentId)!.busRoutes)])],
    timeline: [
      { label: 'Baseline', day: 0, delay: 0 },
      { label: 'Initial disruption', day: duration.days === 3 ? duration.days * 0.1 : 1, delay: Math.round(delay * 0.62) },
      { label: 'Peak impact', day: duration.days === 3 ? duration.days * 0.3 : Math.max(3, Math.round(duration.days * 0.16)), delay },
      { label: 'Adaptation', day: duration.days === 3 ? duration.days * 0.58 : Math.round(duration.days * 0.58), delay: Math.max(2, Math.round(delay * 0.68)) },
      { label: 'Closure end', day: duration.days, delay: Math.max(1, Math.round(delay * 0.22)) },
    ],
    confidence: road.observedPasses >= 700 ? 'Observed' : 'Limited',
  };
}

/** Adapter uses only the reviewed snapshot, never today's mutable road/traffic records. */
export function selectPlannerSimulation(scenario: PlanningScenario) {
  return {
    road: structuredClone(scenario.inputs.road), duration: scenario.duration, days: scenario.days,
    scenarioLabel: scenario.scenarioLabel, delay: scenario.delay, simulatedMinutes: scenario.simulatedMinutes,
    affected: scenario.affected.filter(impact => impact.restriction !== 'Closed').map(impact => {
      const segment = scenario.inputs.connected.find(road => road.id === impact.roadSegmentId);
      if (!segment) throw new Error(`Scenario snapshot missing affected road: ${impact.roadSegmentId}`);
      return { segment: structuredClone(segment), additionalVehicles: impact.additionalVehicles,
        saturation: impact.saturation, delay: impact.delayMinutes, severity: impact.severity };
    }),
    busRoutes: [...scenario.busRoutes], timeline: scenario.timeline.map(point => ({ ...point })), confidence: scenario.confidence,
  };
}