export const FRAME_RATE = 30;
export const TOTAL_FRAMES = 2700;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const SCENES = [
  { id: 'opening', title: 'A city in fragments', start: 0, end: 120 },
  { id: 'coverage', title: 'Beyond the fixed camera', start: 120, end: 420 },
  { id: 'investigation', title: 'Connect the observations', start: 420, end: 810 },
  { id: 'maintenance', title: 'Before a complaint', start: 810, end: 1200 },
  { id: 'crossings', title: 'Every crossing matters', start: 1200, end: 1470 },
  { id: 'planning', title: 'Plan before the barrier', start: 1470, end: 1770 },
  { id: 'citizen', title: 'A map that keeps up', start: 1770, end: 2190 },
  { id: 'connected', title: 'One connected view', start: 2190, end: 2700 },
] as const;
export type SceneId = typeof SCENES[number]['id'];
export type Speaker = 'Representative' | 'Police' | 'Municipality' | 'Citizen';
export type Dialogue = { start: number; end: number; speaker: Speaker; text: string; phrases: string[] };
// Seconds are converted once to integer frames; wording is the approved script.
const dialogue = (start: number, end: number, speaker: Speaker, phrases: string[]): Dialogue => ({
  start: Math.round(start * FRAME_RATE), end: Math.round(end * FRAME_RATE), speaker, text: phrases.join(' '), phrases,
});
export const DIALOGUE: Dialogue[] = [
  dialogue(0, 4, 'Representative', ['One city. Thousands of changes.', 'No shared, real-time picture.']),
  dialogue(4, 8, 'Police', ['Our cameras are fixed. Incidents aren’t.', 'One goes offline.']),
  dialogue(8, 14, 'Representative', ['Fleet cameras extend observation:', 'capture, detect, geotag—then send usable information to Drishti.']),
  dialogue(14, 18, 'Police', ['Hit-and-run on Anna Salai.', 'Which way did that vehicle go?']),
  dialogue(18, 27, 'Representative', ['AI links possible sightings for police review.', 'More cameras aren’t enough;', 'observations must be interpreted and connected.']),
  dialogue(27, 31, 'Municipality', ['By the time complaints arrive,', 'cracks have become potholes.']),
  dialogue(31, 40, 'Representative', ['Detect, prioritize, assign, repair—then observe again.', 'AI checks the repair;', 'an official confirms closure.']),
  dialogue(40, 44, 'Citizen', ['Faded crossings endanger pedestrians—', 'at Phoenix Mall and outside schools.']),
  dialogue(44, 49, 'Representative', ['Vision assesses road markings;', 'repairs follow the same verified lifecycle.']),
  dialogue(49, 53, 'Municipality', ['Close one road for metro work;', 'surrounding roads choke.']),
  dialogue(53, 59, 'Representative', ['Compare historical and current traffic,', 'simulate diversions, then approve.']),
  dialogue(59, 68, 'Citizen', ['Metro work beside my house may not reach Google Maps immediately.', 'If the city has already changed,', 'why shouldn’t the map change with it?']),
  dialogue(68, 73, 'Representative', ['Government-approved changes update Drishti’s map—', 'and your journey.']),
  dialogue(73, 77, 'Police', ['We spend less time searching', 'and more time responding.']),
  dialogue(77, 80.5, 'Municipality', ['We stop waiting for problems', 'to become complaints.']),
  dialogue(80.5, 85, 'Citizen', ['We see a city that actually reflects', 'what is happening around us.']),
  dialogue(85, 90, 'Representative', ['That’s the difference between a reactive city', 'and a proactive one.']),
];
export type Caption = { start: number; end: number; speaker: Speaker; text: string };
export const CAPTIONS: Caption[] = DIALOGUE.flatMap(cue => {
  const weights = cue.phrases.map(phrase => phrase.split(/\s+/).length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let consumed = 0;
  return cue.phrases.map((text, index) => {
    const start = cue.start + Math.round((cue.end - cue.start) * consumed / total);
    consumed += weights[index];
    const end = cue.start + Math.round((cue.end - cue.start) * consumed / total);
    return { start, end, speaker: cue.speaker, text };
  });
});
export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const ease = (n: number) => { const x = clamp(n); return x * x * (3 - 2 * x); };
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const progress = (time: number, start: number, end: number) => ease((time - start) / (end - start));
export const normalizeFrame = (frame: number) => Number.isFinite(frame) ? clamp(Math.floor(frame), 0, TOTAL_FRAMES - 1) : 0;
export function getSceneAtFrame(frame: number) {
  const f = normalizeFrame(frame);
  return SCENES.find(scene => f >= scene.start && f < scene.end)!;
}
export const getCaptionAtFrame = (frame: number) => CAPTIONS.find(cue => frame >= cue.start && frame < cue.end);
export function sampleScene(frame: number) {
  const f = normalizeFrame(frame); const scene = getSceneAtFrame(f);
  const local = f - scene.start;
  return { frame: f, scene, localFrame: local, time: local / FRAME_RATE, progress: local / (scene.end - scene.start - 1) };
}
export function sampleWorkflow(frame: number) {
  const s = sampleScene(frame); const t = s.time;
  return {
    candidate: s.scene.id === 'investigation' && t >= 4,
    reviewed: s.scene.id === 'investigation' && t >= 10,
    repaired: s.scene.id === 'maintenance' && t >= 9 || s.scene.id === 'crossings' && t >= 7,
    verified: s.scene.id === 'maintenance' && t >= 11.5 || s.scene.id === 'crossings' && t >= 8.2,
    approved: s.scene.id === 'planning' && t >= 8.5 || s.scene.id === 'citizen' && t >= 10,
    published: s.scene.id === 'citizen' && t >= 11,
  };
}
export const formatTime = (frame: number) => `${Math.floor(frame / 1800).toString().padStart(2, '0')}:${Math.floor(frame / 30 % 60).toString().padStart(2, '0')}`;
export function srtTime(frame: number) {
  const ms = Math.round(frame * 1000 / FRAME_RATE);
  return `00:${Math.floor(ms / 60000).toString().padStart(2, '0')}:${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')},${(ms % 1000).toString().padStart(3, '0')}`;
}
export const makeSrt = () => CAPTIONS.map((cue, i) => `${i + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.speaker}: ${cue.text}\n`).join('\n');
export const makeCueSheet = () => '# Drishti — 90-second voiceover cue sheet\n\nSilent masters. Record four speakers separately. All times are 30 fps.\n\n' + DIALOGUE.map(c => `## ${srtTime(c.start)} → ${srtTime(c.end)} · ${c.speaker}\n\n${c.text}\n`).join('\n');