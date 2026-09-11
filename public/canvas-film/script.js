import { FPS, TOTAL_FRAMES, WIDTH, HEIGHT, SCENES, normalizeFrame, sampleFrame, makeCaptions, captionAt, formatTime } from './timeline.js';
import { createScenes } from './scenes.js';
import { C } from './art.js';

const canvas = document.querySelector('#film');
const ctx = canvas.getContext('2d', { alpha: false });
const { draw, art } = createScenes(ctx);
const params = new URLSearchParams(location.search);
const capture = params.get('capture') === '1';
document.body.classList.toggle('capture', capture);
const controls = {
  play: document.querySelector('#play'), restart: document.querySelector('#restart'), seek: document.querySelector('#seek'),
  captions: document.querySelector('#captions'), time: document.querySelector('#time'), fullscreen: document.querySelector('#fullscreen'),
};
let frame = normalizeFrame(Number(params.get('frame') ?? Number(params.get('t') ?? 0) * FPS));
let captionsEnabled = params.get('subtitles') !== '0';
let playing = false, raf = 0, epoch = 0, epochFrame = 0;
let captions = [], dialogue = [];

export function wrapCaption(text, maxWidth = 1630) {
  ctx.font = '500 36px "Film Sans"';
  const lines = []; let line = '';
  for (const word of text.split(/\s+/)) { const next = line ? `${line} ${word}` : word; if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next; }
  if (line) lines.push(line);
  if (lines.length > 2) throw new Error(`Caption needs more than two lines: ${text}`);
  return lines;
}
function paintCaption(cue) {
  if (!cue) return;
  const lines = wrapCaption(cue.text);
  art.rect(100, 938, 1720, 114, '#102d3cf2', 14);
  art.text(cue.speaker.toUpperCase(),960,966,17,C.mint,800,'center');
  lines.forEach((line,i)=>art.text(line,960,(lines.length===1?1017:998)+i*40,36,C.white,500,'center'));
}
// Synchronous drawing contract: no effects, springs, timers, randomness or React.
// The return acknowledgement is issued only after every Canvas command has run.
export function renderFrame(requestedFrame, options = {}) {
  frame = normalizeFrame(requestedFrame);
  const { scene, time } = sampleFrame(frame);
  ctx.resetTransform();ctx.globalAlpha=1;ctx.setLineDash([]);
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  const local = frame - scene.start;
  art.rect(0,0,WIDTH,HEIGHT,C.sky);
  if(scene.index > 0 && local < 16){
    const previous=SCENES[scene.index-1];
    draw(previous.id,(previous.end-previous.start-1)/FPS,previous.end-1);
    // Short lens-like reveal: the city observation motivates the next shot.
    ctx.save();ctx.beginPath();ctx.arc(960,590,Math.hypot(960,590)*((local+1)/16),0,Math.PI*2);ctx.clip();draw(scene.id,time,frame);ctx.restore();
  }else draw(scene.id,time,frame);
  const show=options.subtitles ?? captionsEnabled;
  if(show)paintCaption(captionAt(captions,frame));
  canvas.dataset.frame=String(frame);
  canvas.dataset.scene=scene.id;
  canvas.dataset.subtitles=String(show);
  window.__renderedFrame=frame;
  return { frame, scene:scene.id, subtitles:show, width:WIDTH, height:HEIGHT };
}
function updateControls(){
  controls.seek.value=String(frame);controls.seek.setAttribute('aria-valuetext',`${formatTime(frame)} of 01:30`);
  controls.time.textContent=`${formatTime(frame)} / 01:30`;
  controls.play.innerHTML=playing?'Ⅱ <span>Pause</span>':'▶ <span>Play</span>';
  controls.play.setAttribute('aria-label',playing?'Pause':'Play');
  controls.captions.checked=captionsEnabled;
  document.querySelectorAll('#chapters button').forEach((button,i)=>button.setAttribute('aria-current',String(sampleFrame(frame).scene.index===i)));
}
function pause(){playing=false;cancelAnimationFrame(raf);updateControls();}
function tick(now){
  if(!playing)return;
  renderFrame(epochFrame+Math.floor((now-epoch)*FPS/1000));updateControls();
  if(frame>=TOTAL_FRAMES-1){pause();return;}raf=requestAnimationFrame(tick);
}
function play(){if(capture)return;if(frame===TOTAL_FRAMES-1)renderFrame(0);playing=true;epoch=performance.now();epochFrame=frame;updateControls();raf=requestAnimationFrame(tick);}
function seek(value){pause();renderFrame(value);updateControls();}
async function init(){
  await Promise.all([document.fonts.load('500 36px "Film Sans"'),document.fonts.load('800 55px "Film Sans"')]);
  if(!document.fonts.check('500 36px "Film Sans"')||!document.fonts.check('800 55px "Film Sans"'))throw new Error('Local fonts failed to load');
  const response=await fetch('./narration.json');if(!response.ok)throw new Error('Narration JSON failed to load');
  dialogue=await response.json();captions=makeCaptions(dialogue);captions.forEach(c=>wrapCaption(c.text));
  SCENES.forEach(scene=>{const button=document.createElement('button');button.type='button';button.textContent=`${formatTime(scene.start)} · ${scene.title}`;button.addEventListener('click',()=>seek(scene.start));document.querySelector('#chapters').append(button);});
  dialogue.forEach(c=>{const p=document.createElement('p'),label=document.createElement('strong');label.textContent=`${formatTime(c.start*FPS)} · ${c.speaker} — `;p.append(label,document.createTextNode(c.phrases.map(p=>typeof p==='string'?p:p.text).join(' ')));document.querySelector('#cue-sheet').append(p);});
  controls.play.addEventListener('click',()=>playing?pause():play());
  controls.restart.addEventListener('click',()=>seek(0));
  controls.seek.addEventListener('input',event=>seek(Number(event.target.value)));
  controls.captions.addEventListener('change',()=>{captionsEnabled=controls.captions.checked;renderFrame(frame);});
  controls.fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.player').requestFullscreen();}catch{document.querySelector('#status').textContent='Fullscreen is unavailable in this browser.';}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)pause();});
  window.addEventListener('pagehide',pause);
  // Even without reduced-motion preference, the film starts paused intentionally.
  renderFrame(frame);updateControls();
  window.renderFrame=renderFrame;
  window.film={fps:FPS,totalFrames:TOTAL_FRAMES,width:WIDTH,height:HEIGHT,captions,dialogue,seek,pause,play,wrapCaption};
  document.querySelector('#status').textContent='Ready · silent rehearsal · subtitles on by default';
  window.__filmReady=true;
}
window.filmReady=init().catch(error=>{document.querySelector('#status').textContent=error.message;throw error;});