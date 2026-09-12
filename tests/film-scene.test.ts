import { describe, expect, it } from 'vitest';
import { SCENE_DURATION, SCENE_NARRATION, sampleScene } from '../src/film/sceneTiming';

describe('government film timing', () => {
  it('is an eight-second scene with the approved shortened narration', () => {
    expect(SCENE_DURATION).toBe(8);
    expect(SCENE_NARRATION).toContain('We invest heavily in CCTV.');
    expect(SCENE_NARRATION).toContain('a city that keeps moving.');
  });
  it('holds the introduction before revealing the uncovered street', () => {
    expect(sampleScene(2).cameraX).toBe(0);
    expect(sampleScene(5).cameraX).toBeGreaterThan(400);
    expect(sampleScene(7).cameraX).toBe(1000);
  });
  it('changes from an open-handed presentation to concern and a gaze turn', () => {
    expect(sampleScene(1.5).gesture).toBe(1);
    expect(sampleScene(4.5).gesture).toBe(0);
    expect(sampleScene(4.5).concern).toBe(1);
    expect(sampleScene(4.5).turn).toBe(1);
  });
  it('reserves the bus wipe for the closing beat without starting another scene', () => {
    expect(sampleScene(7).bus).toBe(0);
    expect(sampleScene(8).bus).toBe(1);
    expect(sampleScene(8).caption).toBe('');
  });
  it('can seek deterministically and clamps invalid or out-of-range time', () => {
    expect(sampleScene(4.5)).toEqual(sampleScene(4.5));
    expect(sampleScene(-20).seconds).toBe(0);
    expect(sampleScene(100).seconds).toBe(8);
    expect(sampleScene(Number.NaN).seconds).toBe(0);
  });
});