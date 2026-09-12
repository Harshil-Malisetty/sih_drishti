import { Node, makeScene2D, type NodeProps } from '@motion-canvas/2d';
import { BBox, MetaFile, ValueDispatcher, bootstrap, createSignal, linear, makeProject, tween, type FullSceneDescription } from '@motion-canvas/core';
import { filmArtwork } from './sceneOneArt';
import { sampleScene } from './sceneTiming';

export const FILM_DURATION = 34;
export const FILM_FPS = 30;

export class Illustration extends Node {
  constructor(private readonly paint: (context: CanvasRenderingContext2D) => void, props: NodeProps = {}) {
    super(props);
  }

  protected override draw(context: CanvasRenderingContext2D) {
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    this.paint(context);
    context.restore();
    this.drawChildren(context);
  }

  protected override getCacheBBox() {
    return new BBox(-2400, -1600, 4800, 3200);
  }
}

const opening = makeScene2D(function* (view) {
  const clock = createSignal(0);
  view.add(new Illustration(context => {
    context.translate(-710, -640);
    filmArtwork.official(context, { ...sampleScene(clock()), mouth: 0 }, Math.sin(clock() * 7));
  }, { x: () => -400 + Math.min(clock(), 3) * 100 }));
  yield* tween(FILM_DURATION, value => clock(linear(value) * FILM_DURATION));
});

export function createFilmProject() {
  const scene = { ...opening, name: 'The moving eye' } as FullSceneDescription;
  scene.onReplaced = new ValueDispatcher(scene);
  return bootstrap('Drishti - Scene 1', { core: '3.17.2', two: '3.17.2', ui: null, vitePlugin: null }, [],
    makeProject({ scenes: [scene] }), new MetaFile('film', false), new MetaFile('film-settings', false));
}