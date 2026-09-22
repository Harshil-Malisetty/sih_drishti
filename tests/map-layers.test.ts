import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createCitySeed } from '../src/data/demo/citySeed';
import { defaultHeatFilters, selectHeatSignals } from '../src/domain/mapSignals';
import { selectCityEventField, simulatedEventField } from '../src/domain/cityEventField';
import { distanceKm } from '../src/domain/citizenJourney';
import { cameraForMode, groupMarkers, type CityMapPoint } from '../src/components/MapLibreMap';

const read = (name: string) => readFileSync(new URL(`../src/components/${name}`, import.meta.url), 'utf8');

describe('city-wide event field', () => {
  it('spreads detections across the whole mapped road network, not around the fleet', () => {
    const state = createCitySeed();
    const field = simulatedEventField(state, 'police', defaultHeatFilters);
    expect(field.length).toBeGreaterThan(120);
    expect(new Set(field.map(point => point.segmentId)).size).toBeGreaterThan(10);
    const buses = Object.values(state.buses);
    const away = field.filter(point => buses.every(bus => distanceKm([point.latitude, point.longitude], [bus.latitude, bus.longitude]) > 1));
    expect(away.length).toBeGreaterThan(field.length / 4);
    expect(field.every(point => point.simulated)).toBe(true);
  });

  it('does not move, grow or vanish when the sensing vehicles move', () => {
    const state = createCitySeed();
    const before = simulatedEventField(state, 'police', defaultHeatFilters);
    for (const bus of Object.values(state.buses)) { bus.latitude += .04; bus.longitude -= .03; }
    expect(simulatedEventField(state, 'police', defaultHeatFilters)).toEqual(before);
    state.buses = {};
    expect(simulatedEventField(state, 'police', defaultHeatFilters)).toEqual(before);
  });

  it('is reproducible and honours the same scope, category and history filters as the records', () => {
    const state = createCitySeed();
    expect(simulatedEventField(state, 'police', defaultHeatFilters)).toEqual(simulatedEventField(state, 'police', defaultHeatFilters));
    const central = simulatedEventField(state, 'police', defaultHeatFilters, 'central');
    expect(central.length).toBeGreaterThan(0);
    expect(central.length).toBeLessThan(simulatedEventField(state, 'police', defaultHeatFilters).length);
    const collisions = simulatedEventField(state, 'police', { ...defaultHeatFilters, category: 'collision' });
    expect(collisions.every(point => point.category === 'collision')).toBe(true);
    expect(simulatedEventField(state, 'police', { ...defaultHeatFilters, history: true }).length)
      .toBeGreaterThan(simulatedEventField(state, 'police', defaultHeatFilters).length);
    expect(simulatedEventField(state, 'police', { ...defaultHeatFilters, period: '7' }).length)
      .toBeLessThan(simulatedEventField(state, 'police', defaultHeatFilters).length);
  });

  it('layers canonical cases on top at their own recorded locations, weighted above the field', () => {
    const state = createCitySeed();
    const cases = selectHeatSignals(state, 'police', defaultHeatFilters);
    const combined = selectCityEventField(state, 'police', defaultHeatFilters);
    for (const item of cases) {
      const rendered = combined.find(point => point.id === item.id);
      expect(rendered).toMatchObject({ latitude: item.latitude, longitude: item.longitude });
      expect(rendered!.weight).toBeGreaterThan(item.weight);
      expect(rendered!.simulated).toBeUndefined();
    }
    expect(combined).toHaveLength(simulatedEventField(state, 'police', defaultHeatFilters).length + cases.length);
  });

  it('never mutates the store and keeps every sample on real coordinates', () => {
    const state = createCitySeed(), before = structuredClone(state);
    for (const role of ['police', 'municipal'] as const) {
      for (const point of selectCityEventField(state, role, defaultHeatFilters)) {
        expect(Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90).toBe(true);
        expect(Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180).toBe(true);
        expect(point.weight).toBeGreaterThan(0);
      }
    }
    expect(state).toEqual(before);
  });

  it('keeps the heat radius near the sample spacing so it cannot read as a halo on a marker', () => {
    const source = read('MapLibreLayers.tsx');
    expect(source).toContain("'heatmap-radius': ['interpolate', ['exponential', 2], ['zoom'], 9, 16, 12, 30, 14, 48, 17, 110]");
    expect(source).toContain("'circle-opacity': 0");
  });
});

const marker = (id: string, latitude: number, longitude: number): CityMapPoint => ({ id, latitude, longitude, label: id });

describe('compact marker presentation', () => {
  it('collapses neighbours into one counted group and separates them again as the view closes in', () => {
    const points = [marker('a', 13.05, 80.25), marker('b', 13.0501, 80.2501), marker('c', 12.98, 80.22)];
    const far = groupMarkers(points, 11);
    expect(far).toHaveLength(2);
    expect(far.find(group => group.members.length === 2)!.members.map(point => point.id)).toEqual(['a', 'b']);
    expect(groupMarkers(points, 18)).toHaveLength(3);
  });

  it('never hides the selected record inside a cluster', () => {
    const points = [marker('a', 13.05, 80.25), marker('b', 13.0501, 80.2501)];
    const groups = groupMarkers(points, 11, 'a');
    expect(groups).toHaveLength(2);
    expect(groups.every(group => group.members.length === 1)).toBe(true);
  });

  it('labels only the selection until the view is close enough, and clusters only when compact', () => {
    const source = read('MapLibreMap.tsx');
    expect(source).toContain('const showLabel = labels && !collapsed && (selected === point.id || zoom >= labelZoom)');
    expect(read('PoliceMapView.tsx')).toContain('{cluster:compact,labels:true}');
  });
});

describe('2D / 3D as a base-layer swap', () => {
  it('changes pitch and building extrusion only, leaving the camera position alone', () => {
    const source = read('MapLibreMap.tsx');
    expect(source).toContain("map.setLayoutProperty('city-buildings-3d', 'visibility'");
    expect(source).toMatch(/map\.easeTo\(\{ pitch: threeD \? MAP_MODE_PITCH : 0, bearing: threeD \? MAP_MODE_BEARING : 0,/);
    expect(source).not.toContain('Math.max(map.getZoom(), 16)');
    expect(source).not.toContain('latest.current.focus');
    expect(cameraForMode({ center: [13, 80], zoom: 14 }, '3d')).toEqual({ center: [13, 80], zoom: 14, pitch: 55, bearing: -18 });
    expect(cameraForMode({ center: [13, 80], zoom: 14, pitch: 55, bearing: -18 }, '2d')).toEqual({ center: [13, 80], zoom: 14, pitch: 0, bearing: 0 });
  });

  it('is held as page state above the renderer, so overlays and filters are untouched by it', () => {
    const police = readFileSync(new URL('../src/pages/PolicePages.tsx', import.meta.url), 'utf8');
    expect(police).toContain("useState<CityMapMode>('2d')");
    expect(police).toContain('mode={mapMode} onModeChange={setMapMode}');
    expect(read('PoliceMapView.tsx')).toContain("cameraForMode(initialView||{center:[13.035,80.235],zoom:12},mode||'2d')");
  });
});
