import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import type { PlannerRoadSegment, RoadCoordinate } from '../types';

export type PlannerCamera = { center: RoadCoordinate; zoom: number };
export type PlannerLocation = {
  road: PlannerRoadSegment;
  number: number;
  status?: string;
};

// Approximate corridor locators, NOT surveyed closure limits or routable geometry.
// Keep these separate from the capacity model's schematic connectivity points.
const corridorLocations: Record<string, RoadCoordinate> = {
  anna: [13.0441, 80.2476],
  cathedral: [13.0507, 80.2564],
  cpr: [13.0333, 80.2573],
  'inner-ring': [13.0162, 80.211],
  velachery: [12.9898, 80.2197],
  gst: [12.9947, 80.2088],
  'lb-road': [12.998, 80.2567],
  omr: [12.9879, 80.2499],
};
export const plannerLocation = (road: PlannerRoadSegment): RoadCoordinate =>
  corridorLocations[road.id] || road.points[Math.floor(road.points.length / 2)];

/** Point selection deliberately never connects the model's schematic coordinates. */
export function PlannerMap({ locations, selected, onSelect, disabled = false, camera, onCameraChange, result = false }: {
  locations: PlannerLocation[];
  selected: string;
  onSelect?: (id: string) => void;
  disabled?: boolean;
  camera?: PlannerCamera;
  onCameraChange?: (camera: PlannerCamera) => void;
  result?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const latest = useRef({ locations, onSelect, disabled, onCameraChange });
  latest.current = { locations, onSelect, disabled, onCameraChange };
  const initialCamera = useRef(camera);
  const previousSelection = useRef(selected);
  const [tileError, setTileError] = useState(false);
  const geometryKey = JSON.stringify(locations.map(({ road, number }) => [road.id, number, road.name, plannerLocation(road)]));
  const fit = () => {
    if (!latest.current.locations.length) return;
    map.current?.fitBounds(L.latLngBounds(latest.current.locations.map(({ road }) => plannerLocation(road))), {
      paddingTopLeft: [32, 36], paddingBottomRight: [58, 36], maxZoom: 14, animate: false,
    });
  };

  useEffect(() => {
    if (!host.current) return;
    const instance = L.map(host.current, { zoomControl: false, zoomAnimation: false, scrollWheelZoom: false });
    map.current = instance;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19,
    }).on('tileerror', () => setTileError(true)).addTo(instance);
    L.control.zoom({ position: 'topright' }).addTo(instance);
    if (initialCamera.current) instance.setView(initialCamera.current.center, initialCamera.current.zoom);
    else fit();
    instance.on('moveend', () => {
      const center = instance.getCenter();
      latest.current.onCameraChange?.({ center: [center.lat, center.lng], zoom: instance.getZoom() });
    });
    const observer = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
    observer.observe(host.current);
    return () => {
      observer.disconnect();
      markers.current.clear();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach(marker => marker.remove());
    markers.current.clear();
    latest.current.locations.forEach(({ road, number }) => {
      const label = document.createElement('span');
      label.className = 'planner-pin-face';
      label.textContent = String(number).padStart(2, '0');
      const tooltip = document.createElement('span');
      tooltip.textContent = road.name;
      const marker = L.marker(plannerLocation(road), {
        icon: L.divIcon({ className: 'planner-pin', html: label, iconSize: [44, 44], iconAnchor: [22, 22] }),
        keyboard: true, title: road.name, alt: road.name,
      }).addTo(map.current!).bindTooltip(tooltip, { direction: 'top', offset: [0, -18], className: 'planner-tooltip' });
      marker.on('click', () => {
        if (!latest.current.disabled) latest.current.onSelect?.(road.id);
      });
      // Leaflet handles Enter. Add Space to match the exposed button semantics.
      marker.getElement()?.addEventListener('keydown', event => {
        if (event.key === ' ') {
          event.preventDefault();
          if (!latest.current.disabled) latest.current.onSelect?.(road.id);
        }
      });
      markers.current.set(road.id, marker);
    });
  }, [geometryKey]);

  useEffect(() => {
    locations.forEach(({ road, number, status }) => {
      const marker = markers.current.get(road.id);
      const element = marker?.getElement();
      if (!element || !marker) return;
      const active = selected === road.id;
      element.classList.toggle('is-selected', active);
      element.classList.toggle('is-closure', result && active);
      element.classList.toggle('is-affected', result && !active);
      element.setAttribute('role', onSelect ? 'button' : 'img');
      element.setAttribute('aria-label', `${String(number).padStart(2, '0')} · ${road.name}${status ? ` · ${status}` : ''}`);
      if (onSelect) {
        element.setAttribute('aria-pressed', String(active));
        element.setAttribute('aria-disabled', String(disabled));
      } else element.removeAttribute('aria-pressed');
      element.tabIndex = disabled ? -1 : 0;
      marker.setZIndexOffset(active ? 500 : 0);
    });
  }, [geometryKey, locations, selected, disabled, onSelect, result]);

  useEffect(() => {
    if (previousSelection.current === selected) return;
    previousSelection.current = selected;
    const active = latest.current.locations.find(({ road }) => road.id === selected);
    if (active) map.current?.panInside(plannerLocation(active.road), { padding: [52, 52], animate: false });
  }, [selected]);

  return <section className="planner-map-panel" aria-label={result ? 'Scenario corridor locations' : 'Choose a road on the map'}>
    <div className="planner-map-toolbar">
      <span>{result ? 'Scenario locations' : 'Chennai corridors'}</span>
      <button type="button" onClick={fit}><LocateFixed aria-hidden="true"/> Show all</button>
    </div>
    <div className="scenario-map" ref={host} aria-label="Approximate corridor locations"/>
    <div className="planner-map-caption">
      <span className={`planner-map-key ${result ? 'closure-key' : ''}`} aria-hidden="true"/>
      <span>{result ? 'Closure' : 'Selected'}{result && <><i className="planner-map-key affected-key" aria-hidden="true"/> Affected</>}</span>
      <small>Location pins, not closure boundaries</small>
    </div>
    {tileError && <p className="planner-map-error" role="status">Map tiles unavailable. You can still choose a corridor from the road list.</p>}
  </section>;
}