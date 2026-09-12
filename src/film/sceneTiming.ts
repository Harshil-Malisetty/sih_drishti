import { cubicBezier } from 'motion';

export const SCENE_DURATION = 8;
export const SCENE_NARRATION = 'We invest heavily in CCTV. But fixed cameras cannot follow everything happening across a city that keeps moving.';
export const SCENE_CAPTIONS = [
  { start: 0, end: 2.45, text: 'We invest heavily in CCTV.' },
  { start: 2.45, end: 5.1, text: 'But fixed cameras cannot follow everything' },
  { start: 5.1, end: 8, text: 'happening across a city that keeps moving.' },
];

const ease = cubicBezier(0.42, 0, 0.22, 1);
const settle = cubicBezier(0.2, 0.75, 0.3, 1);

export function progress(time: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (time - start) / (end - start)));
}

export function sampleScene(time: number) {
  const seconds = Math.min(SCENE_DURATION, Math.max(0, Number.isFinite(time) ? time : 0));
  const reveal = ease(progress(seconds, 3.3, 6.75));
  const concern = settle(progress(seconds, 2.6, 4.1));
  const gesture = settle(progress(seconds, 0.15, 1.15)) * (1 - ease(progress(seconds, 2.55, 3.7)));
  const turn = ease(progress(seconds, 3, 4.2));
  const blink = [1.85, 3.15, 6.1].reduce((amount, center) => Math.max(amount, Math.max(0, 1 - Math.abs(seconds - center) / 0.095)), 0);
  const talking = seconds > 0.12 && seconds < 7.6 && !(seconds > 2.1 && seconds < 2.5);
  const mouth = talking ? Math.max(0, Math.sin(seconds * 24) * 0.55 + Math.sin(seconds * 39) * 0.25) : 0;
  return {
    seconds,
    reveal,
    cameraX: reveal * 1000,
    zoom: 1.11 - reveal * 0.11,
    gesture,
    concern,
    turn,
    blink,
    mouth,
    breath: Math.sin(seconds * 2.1) * 1.5,
    bus: ease(progress(seconds, 7.15, 8)),
    caption: SCENE_CAPTIONS.find(caption => seconds >= caption.start && seconds < caption.end)?.text ?? '',
  };
}

export type ScenePose = ReturnType<typeof sampleScene>;