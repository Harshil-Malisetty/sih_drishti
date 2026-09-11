import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CityMap } from '../src/presentation/art/ChennaiWorld';
import { planningCamera } from '../src/presentation/art/PlanningDiorama';
import { PlanningScene } from '../src/presentation/scenes/ActionScenes';

const scene = (time: number) => renderToStaticMarkup(<svg><PlanningScene time={time} frame={1470 + Math.round(time * 30)} /></svg>);

describe('planning diorama', () => {
  it('keeps the 3D treatment opt-in for other city maps', () => {
    expect(renderToStaticMarkup(<svg><CityMap /></svg>)).not.toContain('data-elevation');
    expect(scene(2).match(/data-elevation=/g)).toHaveLength(60);
  });

  it('samples reproducible motion through the comparison and approval phases', () => {
    for (const time of [0, 1, 3.5, 4.5, 6, 8.4, 8.8, 9.7, 10]) {
      expect(scene(time)).toBe(scene(time));
      expect(scene(time)).not.toMatch(/NaN|Infinity/);
    }
    expect(planningCamera(5)).not.toBe(planningCamera(7));
    expect(planningCamera(8.5)).not.toBe(planningCamera(9.7));
    expect(planningCamera(-1)).toBe(planningCamera(0));
    expect(planningCamera(11)).toBe(planningCamera(10));
  });

  it('keeps the entire board and its thick edge inside the artwork area', () => {
    for (let frame = 0; frame <= 300; frame++) {
      const [a, b, c, d, e, f] = planningCamera(frame / 30).slice(7, -1).split(' ').map(Number);
      for (const [x, y] of [[0, 0], [1920, 0], [0, 1080], [1920, 1080]]) {
        expect(a * x + c * y + e).toBeGreaterThan(0);
        expect(a * x + c * y + e).toBeLessThan(1920);
        expect(b * x + d * y + f).toBeGreaterThan(250);
        expect(b * x + d * y + f + 24).toBeLessThan(825);
      }
    }
  });

  it('preserves approval timing and the simulation qualifier', () => {
    expect(scene(8.49)).not.toContain('data-state="planner-approved"');
    expect(scene(8.5)).toContain('data-state="planner-approved"');
    expect(scene(8.8)).toContain('Demo scenario estimate · not validated forecast');
    expect(scene(8.8)).toContain('data-layer="historical-observation"');
    expect(scene(8.8)).toContain('data-layer="latest-observation"');
    expect(scene(8.8)).toContain('data-layer="map-plinth"');
  });
});