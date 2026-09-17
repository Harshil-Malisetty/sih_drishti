import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { FleetMotion, relativeHeatWeights, travelBearing, type VehicleFix } from '../src/components/mapVisualization';
import { CITY_MAP_STYLE, toMapPosition, toMapZoom } from '../src/components/MapLibreMap';
import { OperationalHeatControls, useHeatDisplay } from '../src/components/OperationalHeatControls';
import { createCitySeed } from '../src/data/demo/citySeed';
import { defaultHeatFilters, selectHeatSignals } from '../src/domain/mapSignals';
import { createBusTrack, busPosition } from '../src/domain/busPlayback';

const fix: VehicleFix = { id: 'bus', latitude: 13, longitude: 80, label: 'Test fix' };
describe('map renderer boundary', () => {
	it('uses a free colorful map without changing domain coordinate order or view scale', () => {
		expect(CITY_MAP_STYLE).toBe('https://tiles.openfreemap.org/styles/bright');
		const coordinate: [number, number] = [13.04, 80.24];
		expect(toMapPosition(coordinate)).toEqual([80.24, 13.04]); expect(coordinate).toEqual([13.04, 80.24]); expect(toMapZoom(12)).toBe(11);
	});
	it('migrates all maps while retaining the location and journey interfaces', () => {
		for (const name of ['PoliceMapView', 'MunicipalMapView', 'CitizenMapView', 'PlannerMap']) {
			const source = readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), 'utf8');
			expect(source).toContain('useCityMap'); expect(source).not.toContain("from 'leaflet'");
		}
	});
});
describe('fleet interpolation', () => {
	it('never invents updates for stationary recorded positions', () => {
		const motion = new FleetMotion(); motion.update([fix], 0);
		expect(motion.frames(600000)[0]).toEqual({ ...fix, heading: 0 }); expect(motion.moving(10)).toBe(false);
	});
	it('smoothly interpolates actual incoming props and finishes at the exact destination', () => {
		const motion = new FleetMotion(), next = { ...fix, longitude: 80.001 };
		motion.update([fix], 0); motion.update([next], 1000);
		expect(motion.frames(1500)[0].longitude).toBeCloseTo(80.0005);
		expect(motion.frames(2000)[0]).toMatchObject(next); expect(motion.frames(2000)[0].heading).toBeCloseTo(90, 2);
		expect(motion.frames(9000)).toEqual(motion.frames(2000)); expect(fix.longitude).toBe(80);
	});
	it('retargets from displayed positions and does not restart on selection rerenders', () => {
		const motion = new FleetMotion(); motion.update([fix], 0); motion.update([{ ...fix, latitude: 13.01 }], 1000);
		const halfway = motion.frames(1300)[0], next = { ...fix, latitude: 13.02 };
		motion.update([next], 1300); expect(motion.frames(1300)[0].latitude).toBe(halfway.latitude);
		motion.update([next], 1400); expect(motion.frames(1600)[0].latitude).toBe(13.02);
	});
	it('uses the shortest heading rotation and immediately honors reduced motion', () => {
		const motion = new FleetMotion(); motion.update([{ ...fix, heading: 350 }], 0); motion.update([{ ...fix, heading: 10 }], 1000);
		expect(motion.frames(1500)[0].heading).toBe(360);
		motion.update([{ ...fix, longitude: 81, heading: 25 }], 1600, true); expect(motion.frames(1600)[0]).toMatchObject({ longitude: 81, heading: 25 });
	});
	it('preserves colocated identities, filters invalid fixes and calculates bearings', () => {
		const motion = new FleetMotion(); motion.update([fix, { ...fix, id: 'second' }, { ...fix, id: 'invalid', latitude: NaN }], 0);
		expect(motion.frames(0)).toHaveLength(2); motion.update([], 1000); expect(motion.frames(1000)).toEqual([]);
		expect(travelBearing(fix, { ...fix, latitude: 14 })).toBe(0); expect(travelBearing(fix, { ...fix, latitude: 12 })).toBe(180);
	});
	it('keeps explicitly permitted demo playback separate from canonical observations', () => {
		const state = createCitySeed(), before = structuredClone(state), bus = state.buses['MTC-2014'];
		const track = createBusTrack(bus), early = busPosition(track, 0), later = busPosition(track, 40);
		expect(later.playback).toBe(true); expect([later.latitude, later.longitude]).not.toEqual([early.latitude, early.longitude]);
		expect(state).toEqual(before); expect(later.observedAt).toBe(bus.observedAt);
		expect(busPosition(createBusTrack(state.buses['MTC-1830']), 400)).toMatchObject({ ...state.buses['MTC-1830'], playback: false });
	});
});
describe('relative multi-colour heat', () => {
	it('uses the full ramp for sparse data rather than mapping every case to green', () => {
		expect(relativeHeatWeights([{ weight: 1 }, { weight: 1 }])).toEqual([1, 1]);
		expect(relativeHeatWeights([{ weight: 2 }, { weight: 4 }, { weight: 8 }])).toEqual([.25, .5, 1]);
		expect(relativeHeatWeights([])).toEqual([]);
	});
	it('does not mutate the underlying case weights or create data for empty categories', () => {
		const state = createCitySeed(), before = structuredClone(state), points = selectHeatSignals(state, 'police', defaultHeatFilters);
		relativeHeatWeights(points); expect(points.every(point => point.weight === 1)).toBe(true); expect(state).toEqual(before);
		expect(selectHeatSignals(state, 'police', { ...defaultHeatFilters, category: 'hit-and-run' })).toEqual([]);
	});
	it('clearly describes rescaled relative concentration rather than severity', () => {
		const points = selectHeatSignals(createCitySeed(), 'police', defaultHeatFilters);
		function Controls() { const display = useHeatDisplay(points); return <OperationalHeatControls role="police" display={display} points={points} history={false} setHistory={() => {}} onFit={() => {}}/>; }
		const html = renderToStaticMarkup(<Controls/>);
		for (const label of ['All categories', 'Collisions', 'Rash driving', 'Heatmap opacity', 'not severity', 'Colours rescale']) expect(html).toContain(label === 'not severity' ? 'not severity' : label);
	});
});
