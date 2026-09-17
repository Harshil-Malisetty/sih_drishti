import type { CityBus } from '../types/city';
import type { RoadCoordinate } from '../types';
import { distanceKm, savedJourneyRoutes } from './citizenJourney';

export interface BusTrack { bus: CityBus; points: RoadCoordinate[]; lengths: number[]; start: number; length: number }
export interface BusPosition extends CityBus { playback: boolean; sourceLatitude: number; sourceLongitude: number; heading: number }

/** Illustrative playback on saved road geometry, NOT an MTC route or a GPS sample.
 * Only match within 350m. Uncovered vehicles retain their canonical snapshot.
 * Never change cityStore coordinates, observation timestamps or reporting counts.
 */
export function createBusTrack(bus: CityBus): BusTrack {
  const origin: RoadCoordinate = [bus.latitude, bus.longitude];
  let nearest = .35;
  let match: BusTrack = { bus, points: [], lengths: [], start: 0, length: 0 };
  for (const route of savedJourneyRoutes) {
    const lengths = [0];
    for (let i = 1; i < route.points.length; i++) lengths.push(lengths[i - 1] + distanceKm(route.points[i - 1], route.points[i]));
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i];
      const cos = Math.cos(origin[0] * Math.PI / 180);
      const dx = (b[1] - a[1]) * cos, dy = b[0] - a[0];
      const denominator = dx * dx + dy * dy;
      const t = denominator ? Math.max(0, Math.min(1, (((origin[1] - a[1]) * cos) * dx + (origin[0] - a[0]) * dy) / denominator)) : 0;
      const projected: RoadCoordinate = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const distance = distanceKm(origin, projected);
      if (distance < nearest) {
        nearest = distance;
        match = { bus, points: route.points, lengths, start: lengths[i - 1] + (lengths[i] - lengths[i - 1]) * t, length: lengths.at(-1)! };
      }
    }
  }
  return match;
}

export function busPosition(track: BusTrack, seconds: number): BusPosition {
  const result: BusPosition = { ...track.bus, playback: track.points.length > 1, sourceLatitude: track.bus.latitude, sourceLongitude: track.bus.longitude, heading: -25 };
  if (!result.playback) return result;
  // Travel back and forth over a local 1.2km window without teleporting at a loop edge.
  const lower = Math.max(0, track.start - .6), upper = Math.min(track.length, track.start + .6);
  const span = upper - lower;
  if (span <= 0) return { ...result, playback: false };
  const phase = ((track.start - lower + Math.max(0, seconds) * .008) % (span * 2));
  const distance = lower + (phase > span ? 2 * span - phase : phase);
  let index = track.lengths.findIndex(value => value >= distance);
  index = Math.max(1, index);
  const a = track.points[index - 1], b = track.points[index];
  const t = (distance - track.lengths[index - 1]) / (track.lengths[index] - track.lengths[index - 1] || 1);
  result.latitude = a[0] + (b[0] - a[0]) * t;
  result.longitude = a[1] + (b[1] - a[1]) * t;
  result.heading = Math.atan2((b[1] - a[1]) * Math.cos(result.latitude * Math.PI / 180), b[0] - a[0]) * 180 / Math.PI + (phase > span ? 180 : 0);
  return result;
}