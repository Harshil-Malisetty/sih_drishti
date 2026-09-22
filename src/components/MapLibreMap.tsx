import { useEffect, useRef, useState, type RefObject } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeoJSONSource, LayerSpecification, Map as GLMap, PaddingOptions } from 'maplibre-gl';
import type { RoadCoordinate } from '../types';
import { validFix } from './mapVisualization';
import './styles-maplibre.css';

export const CITY_MAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';
// Preserve the application's latitude-first contracts and previous 256px zoom scale.
export type CityMapCamera = { center: RoadCoordinate; zoom: number; pitch?: number; bearing?: number };
/** Geographic rendering mode. It owns pitch and building extrusion only: never data layers, selection or camera position. */
export type CityMapMode = '2d' | '3d';
export const MAP_MODE_PITCH = 55, MAP_MODE_BEARING = -18;
export const cameraForMode = (camera: CityMapCamera, mode: CityMapMode): CityMapCamera =>
  ({ ...camera, pitch: mode === '3d' ? MAP_MODE_PITCH : 0, bearing: mode === '3d' ? MAP_MODE_BEARING : 0 });
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

export function useCityMap(host: RefObject<HTMLDivElement | null>, options: { initialView: CityMapCamera; onViewChange?: (camera: CityMapCamera) => void; scrollWheelZoom?: boolean; mode?: CityMapMode; onModeChange?: (mode: CityMapMode) => void }) {
  const latest = useRef(options); latest.current = options;
  const mode = options.mode;
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
      const modeButton = document.createElement('button'); modeButton.type = 'button'; modeButton.textContent = '3D'; modeButton.title = 'Tilt map and show 3D buildings'; modeButton.setAttribute('aria-label', 'Toggle 3D map'); modeButton.setAttribute('aria-pressed', String(map.getPitch() > 5));
      const group = document.createElement('div'); group.className = 'maplibregl-ctrl maplibregl-ctrl-group city-map-mode'; group.append(modeButton);
      // Switching the base rendering must never move, refit or reload the map: the
      // camera position, every data layer and the whole selection survive untouched.
      modeButton.onclick = () => {
        const next: CityMapMode = map.getPitch() < 5 ? '3d' : '2d';
        if (latest.current.onModeChange) latest.current.onModeChange(next); else applyMapMode(map, next);
      };
      map.addControl({ onAdd: () => group, onRemove: () => { modeButton.onclick = null; group.remove(); } }, 'top-right');
      const save = () => {
        const center = map.getCenter(), camera: CityMapCamera = { center: [center.lat, center.lng], zoom: map.getZoom() + 1, pitch: map.getPitch(), bearing: map.getBearing() };
        element.dataset.mapCamera = JSON.stringify(camera); modeButton.textContent = camera.pitch! > 5 ? '2D' : '3D'; modeButton.setAttribute('aria-pressed', String(camera.pitch! > 5)); latest.current.onViewChange?.(camera);
      };
      map.on('moveend', save); map.on('movestart', () => { element.dataset.mapIdle = 'false'; }); map.on('dataloading', () => { element.dataset.mapIdle = 'false'; });
      map.on('load', () => {
        if (disposed) return;
        window.clearTimeout(slow); setLoading(false); setError(''); element.dataset.mapLoaded = 'true';
        const label = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
        map.addLayer({ id: 'city-buildings-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
          filter: ['!=', ['get', 'hide_3d'], true], paint: { 'fill-extrusion-color': '#d8d3c7', 'fill-extrusion-opacity': .9,
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0] } }, label);
        if (latest.current.mode) applyMapMode(map, latest.current.mode);
        save();
      });
      map.on('error', () => { if (!disposed) setError('Some map resources are unavailable. Record details remain available.'); });
      map.on('idle', () => { if (!disposed && map.areTilesLoaded()) { element.dataset.mapIdle = 'true'; window.clearTimeout(slow); setError(''); setLoading(false); } });
      observer = new ResizeObserver(() => { if (!disposed) map.resize(); }); observer.observe(element);
    }).catch(() => { if (!disposed) { window.clearTimeout(slow); setLoading(false); setError('The 3D map could not start. Enable WebGL/hardware acceleration. Record details remain available.'); } });
    return () => { disposed = true; window.clearTimeout(slow); observer?.disconnect(); handles.delete(element); instance?.remove(); };
  }, [host]);
  useEffect(() => { if (handle && mode) applyMapMode(handle.map, mode); }, [handle, mode]);
  return { handle, loading, error };
}

/** Replaces only the MAP BASE rendering. Sources, markers and overlays are left alone. */
export function applyMapMode(map: GLMap, mode: CityMapMode) {
  const threeD = mode === '3d';
  if (map.getLayer('city-buildings-3d')) map.setLayoutProperty('city-buildings-3d', 'visibility', threeD ? 'visible' : 'none');
  if ((map.getPitch() > 5) === threeD) return;
  map.easeTo({ pitch: threeD ? MAP_MODE_PITCH : 0, bearing: threeD ? MAP_MODE_BEARING : 0,
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 550 });
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
/** Presentation only: how crowded markers collapse and when their labels are readable. */
export type CityMapMarkerOptions = { cluster?: boolean; labels?: boolean; labelZoom?: number };
export type MarkerGroup = { key: string; latitude: number; longitude: number; members: CityMapPoint[] };

/** Screen-independent grid buckets. One cell is roughly 40 device pixels at the live zoom. */
export function groupMarkers(points: CityMapPoint[], zoom: number, keep?: string): MarkerGroup[] {
  const cell = 360 / (2 ** (zoom + 1) * 256 / 40);
  const cells = new Map<string, MarkerGroup>();
  const groups: MarkerGroup[] = [];
  for (const point of points) {
    if (point.id === keep) { groups.push({ key: point.id, latitude: point.latitude, longitude: point.longitude, members: [point] }); continue; }
    const key = `${Math.floor(point.latitude / cell)}:${Math.floor(point.longitude / cell)}`;
    const cluster = cells.get(key);
    if (cluster) { cluster.members.push(point); continue; }
    const created: MarkerGroup = { key, latitude: point.latitude, longitude: point.longitude, members: [point] };
    cells.set(key, created); groups.push(created);
  }
  for (const group of groups) if (group.members.length > 1) {
    group.latitude = group.members.reduce((sum, point) => sum + point.latitude, 0) / group.members.length;
    group.longitude = group.members.reduce((sum, point) => sum + point.longitude, 0) / group.members.length;
    group.key = `cluster:${group.members.map(point => point.id).sort().join(',')}`;
  }
  return groups;
}

/** Live map zoom, so presentation can respond to it without re-creating the map. */
function useMapZoom(handle: CityMapHandle | null) {
  const [zoom, setZoom] = useState(12);
  useEffect(() => {
    if (!handle) return;
    const { map } = handle, read = () => setZoom(Math.round(map.getZoom() * 2) / 2);
    read(); map.on('zoomend', read); map.on('zoom', read);
    return () => { map.off('zoomend', read); map.off('zoom', read); };
  }, [handle]);
  return zoom;
}

export function useMapMarkers(handle: CityMapHandle | null, id: string, points: CityMapPoint[], selected?: string, onSelect?: (id: string) => void, disabled = false, options: CityMapMarkerOptions = {}) {
  const latest = useRef({ points, selected, onSelect, disabled }); latest.current = { points, selected, onSelect, disabled };
  const nodes = useRef(new Map<string, import('maplibre-gl').Marker>());
  const zoom = useMapZoom(handle);
  const { cluster = false, labels = false, labelZoom = 15 } = options;
  const data: FeatureCollection = { type: 'FeatureCollection', features: points.filter(validFix).map(point => ({ type: 'Feature', id: point.id,
    geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] }, properties: { id: point.id, color: point.color || '#315c51', selected: point.id === selected, native: points.length > 80 } })) };
  useGeoJSON(handle, id, data, [{ id: `${id}-points`, type: 'circle', source: id, filter: ['==', ['get', 'native'], true], paint: {
    'circle-color': ['get', 'color'], 'circle-radius': ['case', ['get', 'selected'], 11, 8], 'circle-stroke-width': 3, 'circle-stroke-color': '#fff' } }]);
  useEffect(() => {
    if (!handle) return;
    const valid = points.length <= 80 ? points.filter(validFix) : [];
    const groups = cluster ? groupMarkers(valid, zoom, selected) : valid.map(point => ({ key: point.id, latitude: point.latitude, longitude: point.longitude, members: [point] }));
    const keys = new Set(groups.map(group => group.key));
    nodes.current.forEach((node, key) => { if (!keys.has(key)) { node.remove(); nodes.current.delete(key); } });
    for (const group of groups) {
      const collapsed = group.members.length > 1, point = group.members[0];
      let marker = nodes.current.get(group.key);
      if (!marker) {
        const element = document.createElement('button'); element.type = 'button';
        element.append(Object.assign(document.createElement('span'), { className: 'city-map-point-text' }), Object.assign(document.createElement('span'), { className: 'city-map-tag' }));
        element.onclick = event => {
          event.stopPropagation();
          if (latest.current.disabled) return;
          const members = group.members.filter(item => latest.current.points.some(known => known.id === item.id));
          if (members.length > 1) { handle.map.easeTo({ center: [group.longitude, group.latitude], zoom: Math.min(handle.map.getZoom() + 2.5, 17) }); return; }
          if (latest.current.points.find(item => item.id === point.id)?.interactive !== false) latest.current.onSelect?.(point.id);
        };
        marker = new handle.runtime.Marker({ element, anchor: 'center' }).setLngLat([group.longitude, group.latitude]).addTo(handle.map); nodes.current.set(group.key, marker);
      }
      marker.setLngLat([group.longitude, group.latitude]);
      const element = marker.getElement(), interactive = Boolean(onSelect) && (collapsed || point.interactive !== false);
      const label = collapsed ? `${group.members.length} records here. Opens a closer view.` : point.label;
      const showLabel = labels && !collapsed && (selected === point.id || zoom >= labelZoom);
      element.className = `city-map-point ${collapsed ? 'is-cluster' : point.text ? 'is-numbered' : ''} ${collapsed ? '' : point.className || ''}${!collapsed && selected === point.id ? ' is-selected selected' : ''}${showLabel ? ' is-labelled' : ''}`;
      element.firstElementChild!.textContent = collapsed ? String(group.members.length) : point.text || '';
      element.lastElementChild!.textContent = showLabel ? point.label : '';
      element.title = label; element.style.setProperty('--point-color', collapsed ? '#315c51' : point.color || '#315c51');
      element.setAttribute('aria-label', label); element.setAttribute('role', interactive ? 'button' : 'img');
      if (interactive && !collapsed) element.setAttribute('aria-pressed', String(selected === point.id)); else element.removeAttribute('aria-pressed');
      element.setAttribute('aria-disabled', String(disabled)); element.tabIndex = !disabled && interactive ? 0 : -1; element.style.zIndex = selected === point.id ? '3' : collapsed ? '2' : '1';
    }
  }, [handle, points, selected, onSelect, disabled, cluster, labels, labelZoom, zoom]);
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