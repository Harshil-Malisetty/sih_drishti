import type { GeoPoint } from '../types';
import type { CityState, EventRef, PoliceStation } from '../types/city';

function validLocation(point: GeoPoint) {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

// Great-circle distance ranks stations geographically; it is not a road ETA.
function distanceKm(a: GeoPoint, b: GeoPoint) {
  const radians = Math.PI / 180;
  const haversine = Math.sin((b.latitude - a.latitude) * radians / 2) ** 2
    + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians)
    * Math.sin((b.longitude - a.longitude) * radians / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}

export function nearestPoliceStation(stations: readonly PoliceStation[], location: GeoPoint) {
  if (!validLocation(location)) throw new Error('A valid emergency location is required for automatic allocation');
  const nearest = stations.filter(station => validLocation(station)).map(station => ({
    station, distanceKm: distanceKm(location, station),
  })).sort((a, b) => a.distanceKm - b.distanceKm || a.station.id.localeCompare(b.station.id))[0];
  if (!nearest) throw new Error('No police station with a valid location is configured. Emergency team was not allocated.');
  return nearest;
}

export function allocateEmergencyStation(state: CityState, event: EventRef) {
  const location = event.kind === 'incident' ? state.incidents[event.id]
    : event.kind === 'municipal' ? state.issues[event.id] : undefined;
  if (!location) throw new Error('A located incident or municipal issue is required for emergency allocation');
  // Always use the global directory and event coordinates, never the selected map scope or source bus.
  return nearestPoliceStation(Object.values(state.policeStations), location);
}