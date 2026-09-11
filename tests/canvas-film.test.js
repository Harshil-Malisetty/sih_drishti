import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FPS, TOTAL_FRAMES, SCENES, normalizeFrame, sampleFrame, makeCaptions, captionAt, makeSrt, makeCueSheet } from '../public/canvas-film/timeline.js';
import { DIALOGUE } from '../src/presentation/timeline';
const dialogue=JSON.parse(readFileSync(new URL('../public/canvas-film/narration.json',import.meta.url),'utf8'));
const captions=makeCaptions(dialogue);
describe('framework-free Canvas film timeline',()=>{
  it('covers the approved expanded 180 seconds with eleven half-open chapters',()=>{
    expect(FPS).toBe(30);expect(TOTAL_FRAMES).toBe(5400);expect(SCENES).toHaveLength(11);
    for(let f=0;f<TOTAL_FRAMES;f++){const matches=SCENES.filter(s=>f>=s.start&&f<s.end);expect(matches).toHaveLength(1);expect(sampleFrame(f).scene.id).toBe(matches[0].id);}
  });
  it('clamps invalid/out-of-range seeks',()=>{expect(normalizeFrame(-10)).toBe(0);expect(normalizeFrame(Infinity)).toBe(0);expect(normalizeFrame(NaN)).toBe(0);expect(normalizeFrame(5400)).toBe(5399);expect(normalizeFrame(123.9)).toBe(123);});
  it('resolves both sides of every scene cut',()=>{SCENES.forEach((s,i)=>{expect(sampleFrame(s.start).scene.id).toBe(s.id);expect(sampleFrame(s.end-1).scene.id).toBe(s.id);if(i)expect(sampleFrame(s.start-1).scene.id).toBe(SCENES[i-1].id);});});
  it('rewrites narration for graph-led explanation, retaining four speakers and the closing',()=>{
    expect(dialogue.at(-1).phrases.join(' ')).toBe(DIALOGUE.at(-1).text);
    expect(new Set(dialogue.map(c=>c.speaker)).size).toBe(4);
    expect(dialogue.some(c=>c.phrases.some(p=>(typeof p==='string'?p:p.text).includes('condition index')))).toBe(true);
  });
  it('has continuous, bounded phrase captions at every boundary',()=>{
    expect(captions[0].start).toBe(0);expect(captions.at(-1).end).toBe(5400);
    captions.forEach((c,i)=>{expect(c.end).toBeGreaterThan(c.start);expect(captionAt(captions,c.start)).toEqual(c);expect(captionAt(captions,c.end-1)).toEqual(c);if(i)expect(c.start).toBe(captions[i-1].end);});
    expect(captionAt(captions,5400)).toBeUndefined();
  });
  it('supports later word/phrase JSON alignment without changing rendering',()=>{const aligned=[{start:0,end:4,speaker:'Police',phrases:[{text:'One phrase.',start:.1,end:1.5},{text:'Another phrase.',start:2,end:3.9}]}];expect(makeCaptions(aligned)).toEqual([{start:3,end:45,speaker:'Police',text:'One phrase.'},{start:60,end:117,speaker:'Police',text:'Another phrase.'}]);});
  it('rejects overlapping, mixed and invalid narration timestamps',()=>{
    expect(()=>makeCaptions([{start:0,end:3,speaker:'Police',phrases:['OK']},{start:2,end:4,speaker:'Police',phrases:['Overlap']}])).toThrow();
    expect(()=>makeCaptions([{start:0,end:3,speaker:'Police',phrases:['OK',{text:'No',start:2,end:3}]}])).toThrow();
    expect(()=>makeCaptions([{start:0,end:3,speaker:'Police',phrases:[{text:'No',start:1,end:4}]}])).toThrow();
    expect(()=>makeCaptions([{start:0,end:3,speaker:'Police',phrases:[]}])).toThrow();
  });
  it('is deterministic under repeated and reversed sampling',()=>{for(const f of [0,120,790,1170,1740,2190,2699]){const expected=sampleFrame(f);sampleFrame(2000);sampleFrame(2);expect(sampleFrame(f)).toEqual(expected);}});
  it('does not present a crowded city or an administrative checklist',()=>{
    const src=readFileSync(new URL('../public/canvas-film/explainer.js',import.meta.url),'utf8');
    expect(src).not.toMatch(/\bcity\(|\btraffic\(t.*density|assign →|prioritize →|statusTag\(/);
    expect(src).toContain('historyGraph(POTHOLE');expect(src).toContain('calculatePlanning()');
  });
  it('generates separate exact captions and voiceover cue sheet',()=>{expect(makeSrt(captions)).toContain('00:03:00,000');expect(makeSrt(captions)).toContain('Representative: and a proactive one.');expect(makeCueSheet(dialogue)).toContain('That’s the difference between a reactive city and a proactive one.');});
  it('ships standalone Canvas without a React, SVG, p5 or network dependency',()=>{
    const html=readFileSync(new URL('../public/canvas-film/index.html',import.meta.url),'utf8');expect(html).toContain('width="1920" height="1080"');expect(html).not.toMatch(/(?:src|href)=["'][^"']*(?:react|\.tsx)|<svg/i);
    for(const file of ['script.js','illustration.js','explainer.js','model.js']){const src=readFileSync(new URL(`../public/canvas-film/${file}`,import.meta.url),'utf8');expect(src).not.toMatch(/from ['"](?:react|motion|p5)|Math\.random\(|setInterval\(|setTimeout\(/);}
  });
});