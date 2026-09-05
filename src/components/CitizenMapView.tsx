import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import type { RoadCoordinate } from '../types';
import type { JourneyPlace, evaluateJourney } from '../domain/citizenJourney';

type EvaluatedRoute = ReturnType<typeof evaluateJourney>[number];
export function CitizenMapView({ routes, selected, select, origin, destination, projects }: {
  routes: EvaluatedRoute[]; selected?: string; select: (id: string) => void; origin: JourneyPlace; destination: JourneyPlace;
  projects: { id: string; title: string; point: RoadCoordinate; select: () => void }[];
}) {
  const host = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null), layer = useRef<L.LayerGroup | null>(null);
  const [tileError, setTileError] = useState(false);
  const cameraKey = `${origin.point.join(',')}/${destination.point.join(',')}/${routes.map(route => route.id).join(',')}`;
  const fitted = useRef('');
  useEffect(() => {
    if (!host.current) return;
    const instance = L.map(host.current, { zoomControl: false, scrollWheelZoom: false, zoomAnimation: false }).setView([13.03, 80.24], 13);
    map.current = instance;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).on('tileerror', () => setTileError(true)).addTo(instance);
    L.control.zoom({ position: 'topright' }).addTo(instance);
    layer.current = L.layerGroup().addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize({ pan: false })); observer.observe(host.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; layer.current = null; fitted.current = ''; };
  }, []);
  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const ordered = [...routes].sort((a, b) => Number(a.id === selected) - Number(b.id === selected));
    ordered.forEach(route => {
      L.polyline(route.points, { color: route.blocked ? '#a4413b' : route.id === selected ? '#245b78' : '#84979e', weight: route.id === selected ? 6 : 4, dashArray: route.blocked ? '6 6' : undefined, opacity: .9 }).on('click', () => select(route.id)).addTo(layer.current!);
    });
    [origin, destination].forEach((place, index) => L.marker(place.point, { title: `${index ? 'Destination' : 'Start'}: ${place.name}`, keyboard: false, interactive: false,
      icon: L.divIcon({ className: 'journey-pin', html: `<span>${index ? 'B' : 'A'}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(layer.current!));
    projects.forEach(project => L.marker(project.point, { title: project.title, keyboard: true,
      icon: L.divIcon({ className: 'journey-work-pin', html: '<span aria-hidden="true">!</span>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).on('click', project.select).addTo(layer.current!));
    if (fitted.current !== cameraKey) {
      map.current.fitBounds(L.latLngBounds(routes.length ? routes.flatMap(route => route.points) : [origin.point, destination.point]), { padding: [36, 36], maxZoom: 14, animate: false });
      fitted.current = cameraKey;
    }
  }, [routes, selected, origin, destination, projects, select, cameraKey]);
  return <div className="journey-map-wrap"><div ref={host} className="journey-map" aria-label="Journey map, road routes and municipal work"/>
    <button className="journey-recenter" aria-label="Fit journey to map" onClick={() => map.current?.fitBounds(L.latLngBounds(routes.length ? routes.flatMap(route => route.points) : [origin.point, destination.point]), { padding: [36, 36], maxZoom: 14, animate: false })}><LocateFixed/></button>
    <div className="journey-legend"><span>A Start · B Destination</span><span>— Selected · - - Closed</span></div>
    {tileError && <p className="map-offline" role="status">Basemap unavailable. Route details remain below.</p>}
  </div>;
}