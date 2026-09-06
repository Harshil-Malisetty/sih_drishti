import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import MunicipalOperations from '../src/pages/MunicipalOperations';
import { PlannerMap, plannerLocation } from '../src/components/PlannerMap';
import { plannerRoadSegments } from '../src/data/demo';
import { selectPlannerRoads } from '../src/domain/selectors';
import { cityStore } from '../src/services/city';

vi.mock('leaflet', () => ({ default: {} }));
const noop = () => {};

describe('corridor planner presentation', () => {
  it('provides eight named, numbered choices and exactly one selected corridor without a duplicate selector', () => {
    const html = renderToStaticMarkup(<MunicipalOperations page="planning" navigate={noop} exit={noop}/>);
    expect(html.match(/class="planner-road-option"/g)).toHaveLength(8);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/<select/g)).toHaveLength(1);
    selectPlannerRoads(cityStore.getSnapshot()).forEach(road => expect(html).toContain(road.name));
    expect(html).toContain('aria-label="Find a road or bus route"');
    expect(html).toContain('Location pins, not closure boundaries');
    expect(html).toContain('Nothing is published until you review and approve it.');
    for (const duration of ['3 days', '2 weeks', '8 weeks', '4 months']) expect(html).toContain(duration);
  });

  it('uses distinct approximate point locations without altering schematic model geometry', () => {
    const before = structuredClone(plannerRoadSegments);
    const points = plannerRoadSegments.map(plannerLocation);
    expect(new Set(points.map(point => point.join(','))).size).toBe(8);
    for (const [lat, lng] of points) {
      expect(lat).toBeGreaterThan(12.95);
      expect(lat).toBeLessThan(13.1);
      expect(lng).toBeGreaterThan(80.18);
      expect(lng).toBeLessThan(80.28);
    }
    expect(plannerRoadSegments).toEqual(before);
    const source = readFileSync(new URL('../src/components/PlannerMap.tsx', import.meta.url), 'utf8');
    expect(source).not.toMatch(/L\.(polyline|polygon)|innerHTML/);
    expect(source).toContain('zoomAnimation: false');
    expect(source).toContain("element.setAttribute('aria-pressed'");
    expect(source).toContain('observer.disconnect()');
  });

  it('describes result pins as locations rather than an actual closure geometry', () => {
    const html = renderToStaticMarkup(<PlannerMap locations={plannerRoadSegments.slice(0, 3).map((road, index) => ({ road, number: index + 1 }))} selected="anna" result/>);
    expect(html).toContain('Scenario corridor locations');
    expect(html).toContain('Location pins, not closure boundaries');
    expect(html).toContain('Closure');
    expect(html).toContain('Affected');
    expect(html).not.toContain('Choose a road on the map');
  });
});