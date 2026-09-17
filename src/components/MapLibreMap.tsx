import { useEffect, useRef, useState, type RefObject } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeoJSONSource, LayerSpecification, Map as GLMap, PaddingOptions } from 'maplibre-gl';
import type { RoadCoordinate } from '../types';
import { validFix } from './mapVisualization';
import './styles-maplibre.css';

export const CITY_MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';
// Preserve the application's latitude-first contracts and previous 256px zoom scale.
export type CityMapCamera = { center: RoadCoordinate; zoom: number; pitch?: number; bearing?: number };
export const toMapPosition = ([latitude, longitude]: RoadCoordinate): [number, number] => [longitude, latitude];
export const toMapZoom = (zoom: number) => zoom - 1;
export type CityMapHandle = { map: GLMap; runtime: typeof import('./maplibreRuntime') };
const handles = new WeakMap<HTMLElement, CityMapHandle>();
export const getCityMapHandle = (element: HTMLElement) => handles.get(element);
export const emptyGeoJSON = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] });
export function jumpCamera(handle: CityMapHandle | null, camera: CityMapCamera) {
  handle?.map.jumpTo({ center: toMapPosition(camera.center), zoom: toMapZoom(camera.zoom), pitch: camera.pitch ?? 0, bearing: camera.bearing ?? 0 });
}
export function fitMapPoints(handle: CityMapHandle | null, points: RoadCoordinate[], padding: PaddingOptions = { top: 36, right: 36, bottom: 36, left: 36 }, maxZoom = 14) {
  if (!handle) return;
  let south = Infinity, north = -Infinity, west = Infinity, east = -Infinity;
  for (const [latitude, longitude] of points) if (validFix({ latitude, longitude })) {
    south = Math.min(south, latitude); north = Math.max(north, latitude); west = Math.min(west, longitude); east = Math.max(east, longitude);
  }
  if (south !== Infinity) handle.map.fitBounds([[west, south], [east, north]], { padding, maxZoom: toMapZoom(maxZoom), duration: 0 });
}
export function fitOperationalPoints(handle: CityMapHandle | null, points: RoadCoordinate[], top = 72) {
  if (!handle) return;
  const host = handle.map.getContainer(), bounds = host.closest('.map-page')?.querySelector('.bottom-sheet')?.getBoundingClientRect();
  const desktop = window.matchMedia('(min-width: 800px)').matches;
  fitMapPoints(handle, points, { top: Math.min(top, host.clientHeight * .25), left: 28,
    right: desktop && bounds ? Math.min(bounds.width + 24, host.clientWidth * .5) : 28,
    bottom: !desktop && bounds ? Math.min(bounds.height + 24, host.clientHeight * .48) : 28 });
}
export function panPointInside(handle: CityMapHandle | null, point: RoadCoordinate, padding = 52) {
  if (!handle) return;
  const xy = handle.map.project(toMapPosition(point)), host = handle.map.getContainer();
  if (xy.x < padding || xy.y < padding || xy.x > host.clientWidth - padding || xy.y > host.clientHeight - padding) handle.map.jumpTo({ center: toMapPosition(point) });
}

export function useCityMap(host: RefObject<HTMLDivElement | null>, options: { initialView: CityMapCamera; onViewChange?: (camera: CityMapCamera) => void; scrollWheelZoom?: boolean; focus?: RoadCoordinate }) {
  const latest = useRef(options); latest.current = options;
  const [handle, setHandle] = useState<CityMapHandle | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    const element = host.current; if (!element) return;
    let disposed = false, instance: GLMap | undefined, observer: ResizeObserver | undefined;
    const slow = window.setTimeout(() => { if (!disposed) setError('Map tiles are taking longer to load. Record details remain available.'); }, 12000);
    import('./maplibreRuntime').then(runtime => {
      if (disposed) return;
      const initial = latest.current.initialView;
      instance = new runtime.Map({ container: element, style: CITY_MAP_STYLE, center: toMapPosition(initial.center), zoom: toMapZoom(initial.zoom), pitch: initial.pitch ?? 0, bearing: initial.bearing ?? 0,
        maxZoom: 18, minZoom: 2, maxPitch: 60, attributionControl: false, renderWorldCopies: false, fadeDuration: 0,
        scrollZoom: latest.current.scrollWheelZoom !== false, canvasContextAttributes: { antialias: true } });
      const map = instance, next = { map, runtime }; handles.set(element, next); setHandle(next);
      map.addControl(new runtime.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new runtime.AttributionControl({ compact: true }), 'bottom-right');
      const mode = document.createElement('button'); mode.type = 'button'; mode.textContent = '3D'; mode.title = 'Tilt map and show 3D buildings'; mode.setAttribute('aria-label', 'Toggle 3D map'); mode.setAttribute('aria-pressed', String(map.getPitch() > 5));
      const group = document.createElement('div'); group.className = 'maplibregl-ctrl maplibregl-ctrl-group city-map-mode'; group.append(mode);
      mode.onclick = () => {
        const threeD = map.getPitch() < 5;
        map.easeTo({ pitch: threeD ? 55 : 0, bearing: threeD ? -18 : 0, zoom: threeD ? Math.max(map.getZoom(), 16) : map.getZoom(),
          ...(threeD && latest.current.focus ? { center: toMapPosition(latest.current.focus) } : {}), duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550 });
      };
      map.addControl({ onAdd: () => group, onRemove: () => { mode.onclick = null; group.remove(); } }, 'top-right');
      const save = () => {
        const center = map.getCenter(), camera: CityMapCamera = { center: [center.lat, center.lng], zoom: map.getZoom() + 1, pitch: map.getPitch(), bearing: map.getBearing() };
        element.dataset.mapCamera = JSON.stringify(camera); mode.textContent = camera.pitch! > 5 ? '2D' : '3D'; mode.setAttribute('aria-pressed', String(camera.pitch! > 5)); latest.current.onViewChange?.(camera);
      };
      map.on('moveend', save); map.on('movestart', () => { element.dataset.mapIdle = 'false'; }); map.on('dataloading', () => { element.dataset.mapIdle = 'false'; });
      map.on('load', () => {
        if (disposed) return;
        window.clearTimeout(slow); setLoading(false); setError(''); element.dataset.mapLoaded = 'true';
        const label = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
        map.addLayer({ id: 'city-buildings-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
          filter: ['!=', ['get', 'hide_3d'], true], paint: { 'fill-extrusion-color': '#d8d3c7', 'fill-extrusion-opacity': .9,
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0] } }, label);
        save();
      });
      map.on('error', () => { if (!disposed) setError('Some map resources are unavailable. Record details remain available.'); });
      map.on('idle', () => { if (!disposed && map.areTilesLoaded()) { element.dataset.mapIdle = 'true'; window.clearTimeout(slow); setError(''); setLoading(false); } });
      observer = new ResizeObserver(() => { if (!disposed) map.resize(); }); observer.observe(element);
    }).catch(() => { if (!disposed) { window.clearTimeout(slow); setLoading(false); setError('The 3D map could not start. Enable WebGL/hardware acceleration. Record details remain available.'); } });
    return () => { disposed = true; window.clearTimeout(slow); observer?.disconnect(); handles.delete(element); instance?.remove(); };
  }, [host]);
  return { handle, loading, error };
}

export function useGeoJSON(handle: CityMapHandle | null, id: string, data: FeatureCollection<Geometry>, layers: LayerSpecification[], before?: string) {
  useEffect(() => {
    if (!handle) return;
    const map = handle.map;
    const apply = () => {
      const source = map.getSource<GeoJSONSource>(id);
      if (source) source.setData(data);
      else { map.addSource(id, { type: 'geojson', data }); for (const layer of layers) map.addLayer(layer, before && map.getLayer(before) ? before : undefined); }
      for (const layer of layers) for (const [property, value] of Object.entries(layer.paint || {})) map.setPaintProperty(layer.id, property as Parameters<GLMap['setPaintProperty']>[1], value);
      map.getContainer().setAttribute(`data-${id}-count`, String(data.features.length));
    };
    if (map.getSource(id) || map.isStyleLoaded()) apply(); else map.on('load', apply);
    return () => { map.off('load', apply); };
  }, [handle, id, data, layers, before]);
}
export type CityMapPoint = { id: string; latitude: number; longitude: number; label: string; color?: string; text?: string; className?: string; interactive?: boolean };
export function useMapMarkers(handle: CityMapHandle | null, id: string, points: CityMapPoint[], selected?: string, onSelect?: (id: string) => void, disabled = false) {
  const latest = useRef({ points, selected, onSelect, disabled }); latest.current = { points, selected, onSelect, disabled };
  const nodes = useRef(new Map<string, import('maplibre-gl').Marker>());
  const data: FeatureCollection = { type: 'FeatureCollection', features: points.filter(validFix).map(point => ({ type: 'Feature', id: point.id,
    geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] }, properties: { id: point.id, color: point.color || '#315c51', selected: point.id === selected, native: points.length > 80 } })) };
  useGeoJSON(handle, id, data, [{ id: `${id}-points`, type: 'circle', source: id, filter: ['==', ['get', 'native'], true], paint: {
    'circle-color': ['get', 'color'], 'circle-radius': ['case', ['get', 'selected'], 11, 8], 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } }]);
  useEffect(() => {
    if (!handle) return;
    const visible = points.length <= 80 ? points.filter(validFix) : [], ids = new Set(visible.map(point => point.id));
    nodes.current.forEach((node, key) => { if (!ids.has(key)) { node.remove(); nodes.current.delete(key); } });
    for (const point of visible) {
      let marker = nodes.current.get(point.id);
      if (!marker) {
        const element = document.createElement('button'); element.type = 'button'; element.onclick = event => { event.stopPropagation(); if (!latest.current.disabled && latest.current.points.find(item => item.id === point.id)?.interactive !== false) latest.current.onSelect?.(point.id); };
        marker = new handle.runtime.Marker({ element, anchor: 'center' }).setLngLat([point.longitude, point.latitude]).addTo(handle.map); nodes.current.set(point.id, marker);
      }
      marker.setLngLat([point.longitude, point.latitude]); const element = marker.getElement(), interactive = Boolean(onSelect) && point.interactive !== false;
      element.className = `city-map-point ${point.text ? 'is-numbered' : ''} ${point.className || ''}${selected === point.id ? ' is-selected selected' : ''}`;
      element.textContent = point.text || ''; element.title = point.label; element.style.setProperty('--point-color', point.color || '#315c51'); element.setAttribute('aria-label', point.label); element.setAttribute('role', interactive ? 'button' : 'img');
      if (interactive) element.setAttribute('aria-pressed', String(selected === point.id)); else element.removeAttribute('aria-pressed');
      element.setAttribute('aria-disabled', String(disabled)); element.tabIndex = !disabled && interactive ? 0 : -1; element.style.zIndex = selected === point.id ? '3' : '1';
    }
  }, [handle, points, selected, onSelect, disabled]);
  useEffect(() => {
    if (!handle) return;
    const { map } = handle;
    const click = (event: import('maplibre-gl').MapMouseEvent) => {
      if (latest.current.disabled || !map.getLayer(`${id}-points`)) return;
      const feature = map.queryRenderedFeatures(event.point, { layers: [`${id}-points`] })[0]; if (feature) latest.current.onSelect?.(String(feature.properties.id));
    };
    const keyboard = (event: KeyboardEvent) => {
      const list = latest.current.points;
      if (list.length <= 80 || !['[', ']', 'Enter'].includes(event.key) || latest.current.disabled) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const index = list.findIndex(point => point.id === latest.current.selected), point = list[(index + (event.key === '[' ? -1 : event.key === ']' ? 1 : 0) + list.length) % list.length];
      if (point) { latest.current.onSelect?.(point.id); panPointInside(handle, [point.latitude, point.longitude]); }
    };
    map.on('click', click); map.getCanvas().addEventListener('keydown', keyboard, true);
    return () => { map.off('click', click); map.getCanvas().removeEventListener('keydown', keyboard, true); nodes.current.forEach(node => node.remove()); nodes.current.clear(); };
  }, [handle, id]);
}
export type CityMapLine = { id: string; points: RoadCoordinate[]; color: string; width: number; selected?: boolean; dashed?: boolean };
export function useMapLines(handle: CityMapHandle | null, id: string, lines: CityMapLine[], onSelect?: (id: string) => void) {
  const latest = useRef(onSelect); latest.current = onSelect;
  const data: FeatureCollection = { type: 'FeatureCollection', features: lines.filter(line => line.points.length > 1).map(line => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: line.points.map(toMapPosition) },
    properties: { id: line.id, color: line.color, width: line.width, selected: Boolean(line.selected), dashed: Boolean(line.dashed) } })) };
  const layers: LayerSpecification[] = [false, true].flatMap(active => [false, true].map(dashed => ({ id: `${id}-${active}-${dashed}`, type: 'line' as const, source: id,
    filter: ['all', ['==', ['get', 'selected'], active], ['==', ['get', 'dashed'], dashed]], layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'width'], 'line-opacity': .95, ...(dashed ? { 'line-dasharray': [2, 2] } : {}) } })));
  useGeoJSON(handle, id, data, layers);
  useEffect(() => {
    if (!handle) return;
    const click = (event: import('maplibre-gl').MapMouseEvent) => {
      if (!latest.current) return;
      const ids = [false, true].flatMap(active => [false, true].map(dashed => `${id}-${active}-${dashed}`)).filter(layer => handle.map.getLayer(layer));
      if (ids.length) { const feature = handle.map.queryRenderedFeatures(event.point, { layers: ids })[0]; if (feature) latest.current(String(feature.properties.id)); }
    };
    handle.map.on('click', click); return () => { handle.map.off('click', click); };
  }, [handle, id]);
}
export function CityMapStatus({ loading, error }: { loading: boolean; error: string }) {
  return error ? <p className="city-map-status is-error" role="status">{error}</p> : loading ? <p className="city-map-status" role="status">Loading vector map…</p> : null;
}