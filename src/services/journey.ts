import { distanceKm, journeyPlaces, savedJourneyRoutes, type JourneyPlace, type JourneyRoute } from '../domain/citizenJourney';

/** Explicitly requested public routing; never called merely by receiving a GPS fix. */
export async function findJourney(origin: JourneyPlace, destination: JourneyPlace, signal?: AbortSignal): Promise<JourneyRoute[]> {
  if (distanceKm(origin.point, destination.point) < .1) throw new Error('Choose different start and destination locations.');
  if ([origin, destination].some(place => place.point[0] < 12.8 || place.point[0] > 13.3 || place.point[1] < 80 || place.point[1] > 80.35)) throw new Error('Routing coverage is limited to Chennai. Choose a supported starting point.');
  if (origin.id === journeyPlaces[0].id && destination.id === journeyPlaces[1].id) return structuredClone(savedJourneyRoutes);
  const coordinates = [origin, destination].map(place => `${place.point[1]},${place.point[0]}`).join(';');
  const response = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=full&geometries=geojson&alternatives=true&steps=false`, { signal });
  if (!response.ok) throw new Error('Routing is unavailable. Try the saved Teynampet to Guindy journey.');
  const data = await response.json();
  if (data.code !== 'Ok' || !Array.isArray(data.routes) || !data.routes.length) throw new Error('No road route found for these locations.');
  return data.routes.slice(0, 3).map((route: { distance: number; duration: number; geometry: { coordinates: number[][] } }, index: number) => {
    if (!Number.isFinite(route.duration) || route.duration <= 0 || !Number.isFinite(route.distance) || !Array.isArray(route.geometry?.coordinates) || route.geometry.coordinates.length < 2 || route.geometry.coordinates.some(point => point.length < 2 || !point.every(Number.isFinite))) throw new Error('The routing service returned an incomplete route.');
    return { id: `route-${index}`, label: index ? `Alternative ${index}` : 'Direct route', distanceKm: route.distance / 1000, baselineMinutes: route.duration / 60,
      points: route.geometry.coordinates.map(([lon, lat]): [number, number] => [lat, lon]), segmentIds: [], source: 'OSRM road-network route' };
  });
}