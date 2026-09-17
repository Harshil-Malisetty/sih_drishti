import { useEffect, useRef } from 'react';
import { LocateFixed } from 'lucide-react';
import type { RoadCoordinate } from '../types';
import type { JourneyPlace, evaluateJourney } from '../domain/citizenJourney';
import { CityMapStatus, fitMapPoints, useCityMap, useMapLines, useMapMarkers } from './MapLibreMap';

type EvaluatedRoute = ReturnType<typeof evaluateJourney>[number];
export function CitizenMapView({ routes, selected, select, origin, destination, projects }: {
  routes: EvaluatedRoute[]; selected?: string; select: (id: string) => void; origin: JourneyPlace; destination: JourneyPlace;
  projects: { id: string; title: string; point: RoadCoordinate; select: () => void }[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const { handle, loading, error } = useCityMap(host, { initialView: { center: [13.03, 80.24], zoom: 13 }, scrollWheelZoom: false });
  const cameraKey = `${origin.point.join(',')}/${destination.point.join(',')}/${routes.map(route => route.id).join(',')}`;
  const fitted = useRef({ handle, cameraKey: '' });
  const points = routes.length ? routes.flatMap(route => route.points) : [origin.point, destination.point];
  useMapLines(handle, 'journey-routes', routes.map(route => ({
    id: route.id, points: route.points, selected: route.id === selected, dashed: route.blocked,
    color: route.blocked ? '#a4413b' : route.id === selected ? '#245b78' : '#84979e', width: route.id === selected ? 6 : 4,
  })), select);
  useMapMarkers(handle, 'journey-endpoints', [origin, destination].map((place, index) => ({
    id: index ? 'destination' : 'origin', latitude: place.point[0], longitude: place.point[1],
    label: `${index ? 'Destination' : 'Start'}: ${place.name}`, text: index ? 'B' : 'A',
    className: 'journey-pin', color: '#245b78', interactive: false,
  })));
  useMapMarkers(handle, 'journey-projects', projects.map(project => ({
    id: project.id, latitude: project.point[0], longitude: project.point[1], label: project.title,
    text: '!', className: 'journey-work-pin', color: '#9f482c',
  })), undefined, id => projects.find(project => project.id === id)?.select());
  useEffect(() => {
    if (!handle) return;
    if (fitted.current.handle !== handle || fitted.current.cameraKey !== cameraKey) {
      fitMapPoints(handle, points);
      fitted.current = { handle, cameraKey };
    }
  }, [handle, cameraKey, points]);
  return <div className="journey-map-wrap"><div ref={host} className="journey-map" aria-label="Journey map, road routes and municipal work"/>
    <button className="journey-recenter" aria-label="Fit journey to map" onClick={() => fitMapPoints(handle, points)}><LocateFixed/></button>
    <div className="journey-legend"><span>A Start · B Destination</span><span>— Selected · - - Closed</span></div>
    <CityMapStatus loading={loading} error={error}/>
  </div>;
}