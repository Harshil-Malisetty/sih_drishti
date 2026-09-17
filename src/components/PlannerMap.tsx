import { useEffect, useRef } from 'react';
import { LocateFixed } from 'lucide-react';
import type { PlannerRoadSegment, RoadCoordinate } from '../types';
import { CityMapStatus, fitMapPoints, panPointInside, useCityMap, useMapMarkers, type CityMapCamera } from './MapLibreMap';

export type PlannerCamera = CityMapCamera;
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
  const latest = useRef(locations);
  latest.current = locations;
  const initialCamera = useRef(camera);
  const previousSelection = useRef(selected);
  const { handle, loading, error } = useCityMap(host, {
    initialView: initialCamera.current ?? { center: [13.03, 80.24], zoom: 13 },
    onViewChange: onCameraChange, scrollWheelZoom: false,
  });
  const fit = () => {
    fitMapPoints(handle, latest.current.map(({ road }) => plannerLocation(road)), { top: 36, right: 58, bottom: 36, left: 32 });
  };

  useEffect(() => {
    if (handle && !initialCamera.current) {
      fitMapPoints(handle, latest.current.map(({ road }) => plannerLocation(road)), { top: 36, right: 58, bottom: 36, left: 32 });
    }
  }, [handle]);

  useMapMarkers(handle, 'planner-locations', locations.map(({ road, number, status }) => {
    const [latitude, longitude] = plannerLocation(road), active = selected === road.id;
    return {
      id: road.id, latitude, longitude, text: String(number).padStart(2, '0'),
      label: `${String(number).padStart(2, '0')} · ${road.name}${status ? ` · ${status}` : ''}`,
      className: `planner-pin${result ? active ? ' is-closure' : ' is-affected' : ''}`,
      color: active ? result ? '#a43f38' : '#315c51' : result ? '#fff8eb' : '#fff',
    };
  }), selected, onSelect, disabled);

  useEffect(() => {
    if (!handle || previousSelection.current === selected) return;
    previousSelection.current = selected;
    const active = latest.current.find(({ road }) => road.id === selected);
    if (active) panPointInside(handle, plannerLocation(active.road));
  }, [handle, selected]);

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
    <CityMapStatus loading={loading} error={error}/>
  </section>;
}