export const FPS = 30;
export const TOTAL_FRAMES = 2700;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const SCENES = [
  ['opening', 'A city in fragments', 0, 4],
  ['coverage', 'Beyond the fixed camera', 4, 14],
  ['investigation', 'Connect the observations', 14, 27],
  ['maintenance', 'Before a complaint', 27, 40],
  ['crossings', 'Every crossing matters', 40, 49],
  ['planning', 'Plan before the barrier', 49, 59],
  ['citizen', 'A map that keeps up', 59, 73],
  ['connected', 'One connected view', 73, 90],
].map(([id, title, start, end], index) => ({ id, title, start: start * FPS, end: end * FPS, index }));
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
export const mix = (a, b, x) => a + (b - a) * x;
export const progress = (t, a, b) => ease((t - a) / (b - a));
export const normalizeFrame = f => Number.isFinite(f) ? clamp(Math.floor(f), 0, TOTAL_FRAMES - 1) : 0;
export function sampleFrame(frame) {
  const f = normalizeFrame(frame);
  const scene = SCENES.find(s => f >= s.start && f < s.end);
  return { frame: f, scene, time: (f - scene.start) / FPS, globalTime: f / FPS };
}
export function sampleWorkflow(frame) {
  const { scene: { id }, time: t } = sampleFrame(frame);
  return {
    candidate: id === 'investigation' && t >= 4,
    reviewed: id === 'investigation' && t >= 10,
    repaired: id === 'maintenance' && t >= 9 || id === 'crossings' && t >= 7,
    verified: id === 'maintenance' && t >= 11.5 || id === 'crossings' && t >= 8.2,
    approved: id === 'planning' && t >= 8.5 || id === 'citizen' && t >= 10,
    published: id === 'citizen' && t >= 11,
  };
}
// JSON accepts phrase strings (distributed by word count) or explicit {text,start,end}
// phrase timestamps in absolute seconds from a later recorded narration alignment.
export function makeCaptions(dialogue) {
  let previousEnd = 0;
  return dialogue.flatMap(cue => {
    if (!Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < previousEnd || cue.end <= cue.start || cue.end > 90 || !cue.speaker || !cue.phrases?.length) throw new Error('Invalid or overlapping narration cue');
    previousEnd = cue.end;
    const explicit = typeof cue.phrases[0] === 'object';
    if (!cue.phrases.every(p => typeof p === (explicit ? 'object' : 'string'))) throw new Error('Mixed phrase formats');
    const weights = cue.phrases.map(p => (explicit ? p.text : p).trim().split(/\s+/).length + 2);
    const total = weights.reduce((a, b) => a + b, 0);
    let used = 0;
    let last = Math.round(cue.start * FPS);
    return cue.phrases.map((phrase, i) => {
      const start = explicit ? Math.round(phrase.start * FPS) : last;
      used += weights[i];
      const end = explicit ? Math.round(phrase.end * FPS) : Math.round(cue.start * FPS) + Math.round((Math.round(cue.end * FPS) - Math.round(cue.start * FPS)) * used / total);
      const text = explicit ? phrase.text : phrase;
      if (!text.trim() || !Number.isFinite(start) || !Number.isFinite(end) || start < last || end <= start || end > Math.round(cue.end * FPS)) throw new Error('Invalid phrase timestamp');
      last = end;
      return { start, end, speaker: cue.speaker, text };
    });
  });
}
export const captionAt = (captions, frame) => captions.find(c => frame >= c.start && frame < c.end);
export const formatTime = frame => `${String(Math.floor(frame / FPS / 60)).padStart(2, '0')}:${String(Math.floor(frame / FPS) % 60).padStart(2, '0')}`;
export function srtTime(frame) {
  const ms = Math.round(frame * 1000 / FPS);
  return `00:${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}
export const makeSrt = captions => captions.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.speaker}: ${c.text}\n`).join('\n');
export const makeCueSheet = dialogue => '# Drishti — four-speaker recording cues\n\n90 seconds · 30 fps · Silent masters; no voiceover or music. Timings are rehearsal timings, not alignment to a recorded voice.\n\n' + dialogue.map(c => `## ${srtTime(Math.round(c.start * FPS))} → ${srtTime(Math.round(c.end * FPS))} · ${c.speaker}\n\n${c.phrases.map(p => typeof p === 'string' ? p : p.text).join(' ')}\n`).join('\n');