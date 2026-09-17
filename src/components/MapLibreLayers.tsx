import { useEffect, useMemo, useRef } from 'react';
import type { FeatureCollection } from 'geojson';
import type { GeoJSONSource, LayerSpecification, MapMouseEvent } from 'maplibre-gl';
import type { HeatPoint } from '../domain/mapSignals';
import { FleetMotion, relativeHeatWeights, type VehicleFix, type VehicleFrame } from './mapVisualization';
import { emptyGeoJSON, fitOperationalPoints, panPointInside, useGeoJSON, type CityMapHandle } from './MapLibreMap';

export function useGLHeat(handle: CityMapHandle | null, points: HeatPoint[], opacity: number, fitRequest = 0) {
  const latest = useRef(points); latest.current = points;
  const data: FeatureCollection = useMemo(() => {
    const weights = relativeHeatWeights(points);
    return { type: 'FeatureCollection', features: points.map((point, index) => ({ type: 'Feature', id: point.id,
      geometry: { type: 'Point', coordinates: [point.longitude, point.latitude] }, properties: { weight: weights[index], category: point.category } })) };
  }, [points]);
  const layers: LayerSpecification[] = useMemo(() => [{ id: 'city-heat-density', type: 'heatmap', source: 'city-heat', paint: {
    // Relative display intensity, NOT severity. Overlap accumulates in one GPU field.
    'heatmap-weight': ['get', 'weight'], 'heatmap-intensity': 2.5,
    'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 9, 40, 13, 160, 17, 210],
    'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(39,177,96,0)', .06, 'rgba(39,177,96,0.16)', .18, 'rgba(68,186,78,0.44)',
      .38, 'rgba(246,215,57,0.56)', .65, 'rgba(246,143,42,0.64)', 1, 'rgba(218,52,43,0.68)'],
    'heatmap-opacity': opacity, 'heatmap-opacity-transition': { duration: 300 },
  } }], [opacity]);
  useGeoJSON(handle, 'city-heat', data, layers, 'city-buildings-3d');
  useEffect(() => { if (handle) handle.map.getContainer().dataset.heatOpacity = String(opacity); }, [handle, opacity]);
  useEffect(() => { if (handle && fitRequest) fitOperationalPoints(handle, latest.current.map(point => [point.latitude, point.longitude]), 130); }, [handle, fitRequest]);
}

/** Shared blue-and-white bus texture: distinct from green parks and warm heat. */
function vehicleImage() {
  const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 128;
  const c = canvas.getContext('2d')!; c.scale(2, 2);
  c.fillStyle = '#18374c30'; c.beginPath(); c.ellipse(26, 37, 14, 24, -.15, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#263b47'; for (const y of [17, 44]) { c.fillRect(10, y, 5, 8); c.fillRect(33, y, 5, 8); }
  c.fillStyle = '#196bbe'; c.beginPath(); c.moveTo(13, 9); c.lineTo(35, 9); c.lineTo(39, 17); c.lineTo(39, 55); c.lineTo(34, 59); c.lineTo(13, 56); c.closePath(); c.fill();
  c.fillStyle = '#9ac5e3'; c.fillRect(35, 20, 3, 9); c.fillRect(35, 32, 3, 9); c.fillRect(35, 44, 3, 7);
  const roof = c.createLinearGradient(12, 0, 34, 0); roof.addColorStop(0, '#c5dceb'); roof.addColorStop(.5, '#ffffff'); roof.addColorStop(1, '#e0ebf5');
  c.fillStyle = roof; c.strokeStyle = '#3a657d'; c.lineWidth = 1; c.beginPath(); c.roundRect(11, 5, 24, 49, 5); c.fill(); c.stroke();
  c.fillStyle = '#174560'; c.beginPath(); c.roundRect(14, 8, 18, 9, 2); c.fill(); c.fillStyle = '#7fb6d8'; c.fillRect(15, 9, 15, 2);
  c.fillStyle = '#d6e4ee'; c.strokeStyle = '#9eb8c8'; c.beginPath(); c.roundRect(17, 24, 12, 15, 2); c.fill(); c.stroke();
  c.strokeStyle = '#a3b8c4'; for (let y = 27; y < 37; y += 3) { c.beginPath(); c.moveTo(19, y); c.lineTo(27, y); c.stroke(); }
  c.fillStyle = '#227ac1'; c.fillRect(13, 43, 20, 5); c.fillStyle = '#fff2bb'; c.fillRect(13, 5, 4, 2); c.fillRect(29, 5, 4, 2);
  c.fillStyle = '#d85d42'; c.fillRect(13, 51, 3, 2); c.fillRect(30, 51, 3, 2);
  return c.getImageData(0, 0, canvas.width, canvas.height);
}
function fleetData(frames: VehicleFrame[], selected?: string): FeatureCollection {
  return { type: 'FeatureCollection', features: frames.sort((a, b) => Number(a.id === selected) - Number(b.id === selected)).map(bus => ({ type: 'Feature', id: bus.id,
    geometry: { type: 'Point', coordinates: [bus.longitude, bus.latitude] }, properties: { id: bus.id, label: bus.label, heading: bus.heading, selected: bus.id === selected } })) };
}
export function useGLFleet(handle: CityMapHandle | null, fixes: VehicleFix[], selected: string | undefined, onSelect: (id: string) => void) {
  const latest = useRef({ fixes, selected, onSelect }); latest.current = { fixes, selected, onSelect };
  const motion = useRef(new FleetMotion()), redraw = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!handle) return;
    const { map, runtime } = handle, preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false, pending = 0, focused = '', lastFrame = 0;
    const popup = new runtime.Popup({ closeButton: false, closeOnClick: false, offset: 28, className: 'city-map-tooltip' });
    const render = (now = performance.now()) => {
      pending = 0; if (disposed) return;
      const source = map.getSource<GeoJSONSource>('city-fleet'); if (!source) return;
      if (now - lastFrame >= 30 || !motion.current.moving(now)) {
        const frames = motion.current.frames(now); source.setData(fleetData(frames, latest.current.selected)); map.getContainer().dataset.cityFleetCount = String(frames.length); lastFrame = now;
      }
      if (motion.current.moving(now) && !document.hidden) pending = requestAnimationFrame(render);
    };
    const schedule = () => { if (!pending && !disposed) { lastFrame = 0; pending = requestAnimationFrame(render); } };
    const ready = () => {
      if (disposed) return;
      if (!map.hasImage('city-bus-model')) map.addImage('city-bus-model', vehicleImage(), { pixelRatio: 2 });
      map.addSource('city-fleet', { type: 'geojson', data: emptyGeoJSON() });
      map.addLayer({ id: 'city-fleet-selection', type: 'circle', source: 'city-fleet', filter: ['==', ['get', 'selected'], true], paint: { 'circle-radius': 25, 'circle-color': '#ffffff', 'circle-opacity': .4, 'circle-stroke-width': 2, 'circle-stroke-color': '#2474ae' } });
      map.addLayer({ id: 'city-fleet-vehicles', type: 'symbol', source: 'city-fleet', layout: { 'icon-image': 'city-bus-model', 'icon-size': .85, 'icon-rotate': ['get', 'heading'], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-pitch-alignment': 'viewport', 'icon-rotation-alignment': 'map' } }); schedule();
    };
    motion.current.update(latest.current.fixes, performance.now(), preference.matches || document.hidden); redraw.current = schedule;
    if (map.isStyleLoaded()) ready(); else map.on('load', ready);
    const hits = (event: MapMouseEvent) => {
      if (!map.getLayer('city-fleet-vehicles')) return [];
      const ids = new Set(map.queryRenderedFeatures(event.point, { layers: ['city-fleet-vehicles'] }).map(feature => String(feature.properties.id)));
      return motion.current.frames(performance.now()).filter(bus => ids.has(bus.id));
    };
    const click = (event: MapMouseEvent) => { const buses = hits(event); if (buses.length) { const index = buses.findIndex(bus => bus.id === latest.current.selected); latest.current.onSelect(buses[(index + 1) % buses.length].id); } };
    const hover = (event: MapMouseEvent) => {
      const buses = hits(event), bus = buses.find(item => item.id === latest.current.selected) || buses[0]; map.getCanvas().style.cursor = bus ? 'pointer' : '';
      if (!bus) { popup.remove(); return; }
      popup.setLngLat([bus.longitude, bus.latitude]).setText(`${bus.label}${buses.length > 1 ? ` · ${buses.length} buses here; click to cycle` : ''}`).addTo(map);
    };
    const leave = () => { popup.remove(); };
    const keyboard = (event: KeyboardEvent) => {
      const frames = motion.current.frames(performance.now()); if (!frames.length) return;
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation(); const index = frames.findIndex(bus => bus.id === (focused || latest.current.selected));
        const bus = frames[(index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + frames.length) % frames.length];
        focused = bus.id; map.getCanvas().setAttribute('aria-label', `${bus.label}. Enter opens details; arrow keys choose a bus.`); panPointInside(handle, [bus.latitude, bus.longitude]);
      } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopImmediatePropagation(); latest.current.onSelect(focused || latest.current.selected || frames[0].id); }
    };
    const reset = () => { motion.current.finish(); schedule(); }, reduced = () => { if (preference.matches) reset(); }, remove = () => { disposed = true; cancelAnimationFrame(pending); };
    map.on('click', click); map.on('mousemove', hover); map.on('remove', remove); map.getCanvas().addEventListener('keydown', keyboard, true); map.getCanvas().addEventListener('mouseleave', leave);
    document.addEventListener('visibilitychange', reset); preference.addEventListener('change', reduced);
    return () => { remove(); redraw.current = null; map.off('load', ready); map.off('click', click); map.off('mousemove', hover); map.off('remove', remove); map.getCanvas().removeEventListener('keydown', keyboard, true); map.getCanvas().removeEventListener('mouseleave', leave); document.removeEventListener('visibilitychange', reset); preference.removeEventListener('change', reduced); popup.remove(); motion.current = new FleetMotion(); };
  }, [handle]);
  useEffect(() => { motion.current.update(fixes, performance.now(), window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden); redraw.current?.(); }, [fixes]);
  useEffect(() => { redraw.current?.(); }, [selected]);
}