import { useEffect, useRef, type RefObject } from 'react';
import L from 'leaflet';
import simpleheat from 'simpleheat';
import type { HeatPoint } from '../domain/mapSignals';
import type { BusPosition } from '../domain/busPlayback';
import { createBusModel } from './BusModel';

let preferredBasemap = 'Light · Esri';

/** Public raster services: no account, token or application key required.
 * Esri's legacy canvases are context only, not current surveyed street data.
 * Keep the community fallback available when a provider is unavailable.
 */
export function addCityBasemap(map: L.Map, error: (failed: boolean) => void) {
  const osmCredit = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const esriCredit = '<a href="https://www.esri.com/en-us/legal/terms/data-attributions">Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, GIS User Community</a>';
  const make = (service: string, maxNativeZoom: number, attribution = `${esriCredit}, ${osmCredit}`) => L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`, { attribution, maxZoom: 19, maxNativeZoom });
  const light = make('Canvas/World_Light_Gray_Base', 16);
  const streets = make('World_Street_Map', 18);
  const satellite = make('World_Imagery', 18, '<a href="https://www.esri.com/en-us/legal/terms/data-attributions">Esri, Maxar, Earthstar Geographics, GIS User Community</a>');
  const community = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: osmCredit, maxZoom: 19 });
  const layers: Record<string, L.TileLayer> = { 'Light · Esri': light, 'Streets · Esri': streets, 'Satellite · Esri': satellite, 'Community · OSM': community };
  Object.values(layers).forEach(layer => {
    const failed = new Set<string>();
    const key = (coords: L.Coords) => `${coords.z}/${coords.x}/${coords.y}`;
    layer.on('tileerror', (event: L.TileErrorEvent) => { failed.add(key(event.coords)); if (map.hasLayer(layer)) error(true); });
    layer.on('tileload', (event: L.TileEvent) => { failed.delete(key(event.coords)); if (map.hasLayer(layer)) error(failed.size > 0); });
    layer.on('tileunload', (event: L.TileEvent) => { failed.delete(key(event.coords)); });
  });
  (layers[preferredBasemap] || light).addTo(map);
  L.control.layers(layers, {}, { position: 'topright' }).addTo(map);
  map.on('baselayerchange', (event: L.LayersControlEvent) => { preferredBasemap = event.name; error(false); });
}

export function useHeatLayer(map: RefObject<L.Map | null>, points: HeatPoint[]) {
  useEffect(() => {
    const instance = map.current;
    if (!instance || !points.length) return;
    // Construct inside the effect: maps can be server-rendered without a Leaflet DOM.
    const layer = new L.Layer();
    const canvas = L.DomUtil.create('canvas', 'gis-heat-canvas');
    const pane = instance.getPane('heatSignals') || instance.createPane('heatSignals');
    pane.style.zIndex = '350'; pane.style.pointerEvents = 'none';
    const draw = () => {
      const size = instance.getSize();
      canvas.width = size.x; canvas.height = size.y;
      L.DomUtil.setPosition(canvas, instance.containerPointToLayerPoint([0, 0]));
      const heat = simpleheat(canvas).radius(30, 24).max(8).gradient({ .2: '#21b9b0', .45: '#f4d15a', .7: '#f39242', 1: '#d93d57' });
      heat.data(points.map(point => {
        const xy = instance.latLngToContainerPoint([point.latitude, point.longitude]);
        return [xy.x, xy.y, point.weight] as [number, number, number];
      })).draw(.16);
    };
    layer.onAdd = () => { pane.append(canvas); instance.on('moveend zoomend resize', draw); draw(); return layer; };
    layer.onRemove = () => { instance.off('moveend zoomend resize', draw); canvas.remove(); return layer; };
    layer.addTo(instance);
    return () => { layer.remove(); };
  }, [map, points]);
}

export function useFitMapControl(map: RefObject<L.Map | null>, points: { latitude: number; longitude: number }[]) {
  const latest = useRef(points); latest.current = points;
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const control = new L.Control({ position: 'topleft' });
    control.onAdd = () => {
      const button = L.DomUtil.create('button', 'gis-fit-control');
      button.type = 'button'; button.textContent = 'Fit view'; button.setAttribute('aria-label', 'Fit visible map records');
      L.DomEvent.disableClickPropagation(button);
      button.onclick = () => {
        if (!latest.current.length) return;
        const sheet = instance.getContainer().closest('.gis-stage')?.querySelector('.bottom-sheet');
        instance.fitBounds(L.latLngBounds(latest.current.map(point => [point.latitude, point.longitude] as L.LatLngTuple)), { paddingTopLeft: [48, 90], paddingBottomRight: [48, sheet ? Math.round(instance.getSize().y * .44) : 48], maxZoom: 15, animate: false });
      };
      return button;
    };
    control.addTo(instance);
    return () => { control.remove(); };
  }, [map]);
}

/** Keyed markers preserve keyboard focus and the camera as positions update. */
export function useBusLayer(map: RefObject<L.Map | null>, buses: BusPosition[], selected: string | undefined, select: (id: string) => void, focus?: { id: string; request: number }) {
  const registry = useRef(new Map<string, L.Marker>());
  const latestSelect = useRef(select); latestSelect.current = select;
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const ids = new Set(buses.map(bus => bus.id));
    registry.current.forEach((marker, id) => { if (!ids.has(id)) { marker.remove(); registry.current.delete(id); } });
    buses.forEach(bus => {
      let marker = registry.current.get(bus.id);
      const label = `${bus.id} · Route ${bus.route} · ${bus.playback ? 'Demo playback' : 'Last recorded position'}`;
      if (!marker) {
        const face = createBusModel();
        marker = L.marker([bus.latitude, bus.longitude], { icon: L.divIcon({ className: 'gis-bus-pin', html: face, iconSize: [42, 42], iconAnchor: [21, 21] }), keyboard: true, title: label, riseOnHover: true });
        const tooltip = document.createElement('span'); tooltip.textContent = label;
        marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -20] }).on('click', () => latestSelect.current(bus.id)).addTo(instance);
        marker.getElement()?.addEventListener('keydown', event => { if (event.key === ' ') { event.preventDefault(); latestSelect.current(bus.id); } });
        registry.current.set(bus.id, marker);
      }
      marker.setLatLng([bus.latitude, bus.longitude]);
      marker.setZIndexOffset(bus.id === selected ? 800 : 0);
      const element = marker.getElement();
      element?.setAttribute('role', 'button'); element?.setAttribute('aria-label', label);
      element?.setAttribute('aria-pressed', String(bus.id === selected));
      element?.classList.toggle('is-selected', bus.id === selected);
      element?.classList.toggle('is-snapshot', !bus.playback);
      element?.style.setProperty('--bus-heading', `${bus.heading}deg`);
    });
  }, [map, buses, selected]);
  useEffect(() => {
    const marker = focus && registry.current.get(focus.id);
    if (marker) { map.current?.setView(marker.getLatLng(), Math.max(14, map.current.getZoom()), { animate: false }); marker.openTooltip(); }
  }, [map, focus]);
  useEffect(() => () => { registry.current.forEach(marker => marker.remove()); registry.current.clear(); }, []);
}