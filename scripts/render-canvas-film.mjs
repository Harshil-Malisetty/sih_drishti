import puppeteer from 'puppeteer-core';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, FILM_ROOT, startFilmServer, launchOptions } from './film-server.mjs';
import { FPS, TOTAL_FRAMES, WIDTH, HEIGHT, makeCaptions, makeSrt, makeCueSheet } from '../public/canvas-film/timeline.js';

const options = Object.fromEntries(process.argv.slice(2).map(arg => { const [key,...rest]=arg.replace(/^--/,'').split('=');return [key,rest.join('=')||true]; }));
const out = resolve(options.out || resolve(ROOT,'exports/drishti-canvas'));
const frameCount = Number(options.frames || TOTAL_FRAMES);
if(!Number.isInteger(frameCount)||frameCount<1||frameCount>TOTAL_FRAMES)throw new Error('--frames must be an integer from 1 to 2700');
const variants=options.variant ? [options.variant] : ['clean','subtitled'];
if(!variants.every(v=>['clean','subtitled'].includes(v)))throw new Error('--variant must be clean or subtitled');
const encoder=process.env.FFMPEG_PATH||ffmpeg;
const probe=process.env.FFPROBE_PATH||ffprobe.path;
if(!execFileSync(encoder,['-hide_banner','-encoders'],{encoding:'utf8'}).includes('libx264'))throw new Error('ffmpeg must support libx264');
execFileSync(probe,['-version'],{stdio:'ignore'});
await mkdir(out,{recursive:true});
for(const variant of variants){for(const suffix of ['mp4','partial.mp4']){const file=resolve(out,`drishti-${variant}.${suffix}`);try{await stat(file);throw new Error(`Refusing to overwrite ${file}; choose --out=another-directory`);}catch(error){if(error.code!=='ENOENT')throw error;}}}
const dialogue=JSON.parse(await readFile(resolve(FILM_ROOT,'narration.json'),'utf8'));
const captions=makeCaptions(dialogue);
await writeFile(resolve(out,'drishti.srt'),makeSrt(captions));
await writeFile(resolve(out,'voiceover-cues.md'),makeCueSheet(dialogue));
await writeFile(resolve(out,'narration.json'),JSON.stringify(dialogue,null,2)+'\n');

function startEncoder(variant){
  const temp=resolve(out,`drishti-${variant}.partial.mp4`);
  const child=spawn(encoder,['-hide_banner','-loglevel','error','-n','-f','image2pipe','-framerate',String(FPS),'-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-r',String(FPS),'-threads','2','-movflags','+faststart',temp],{stdio:['pipe','ignore','pipe']});
  let stderr='',failure;
  child.stderr.on('data',data=>{stderr=(stderr+data.toString()).slice(-12000);});
  child.stdin.on('error',error=>{failure=error;});
  const completion=new Promise((yes,no)=>{child.once('error',no);child.once('close',code=>code===0?yes():no(new Error(`Encoder ${variant} exited ${code}: ${stderr}`)));});
  completion.catch(error=>{failure=error;});
  return {variant,child,temp,completion,async write(png){if(failure)throw failure;await new Promise((yes,no)=>child.stdin.write(png,error=>error?no(error):yes()));if(failure)throw failure;}};
}
let browser,server;const encoders=[];const start=Date.now();
try{
  server=await startFilmServer();browser=await puppeteer.launch(launchOptions());
  const page=await browser.newPage();await page.setViewport({width:WIDTH,height:HEIGHT,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setRequestInterception(true);page.on('request',request=>{if(new URL(request.url()).origin!==new URL(server.url).origin){errors.push(`External request: ${request.url()}`);request.abort();}else request.continue();});
  await page.goto(`${server.url}?capture=1&subtitles=0`,{waitUntil:'networkidle0'});
  await page.evaluate(()=>window.filmReady);
  for(const v of variants)encoders.push(startEncoder(v));
  // Each PNG is a browser screenshot of an explicitly acknowledged frame. Frames
  // are streamed to ffmpeg with backpressure, never held as a full sequence.
  // Subtitles are painted by the same Canvas renderer, never double-burned.
  for(let frame=0;frame<frameCount;frame++){
    for(const encoder of encoders){
      const result=await page.evaluate((f,subtitles)=>window.renderFrame(f,{subtitles}),frame,encoder.variant==='subtitled');
      if(result.frame!==frame)throw new Error(`Frame acknowledgement mismatch at ${frame}`);
      const png=await page.screenshot({type:'png',clip:{x:0,y:0,width:WIDTH,height:HEIGHT},captureBeyondViewport:false,optimizeForSpeed:true});
      await encoder.write(png);
      if(options['keep-frames']){const dir=resolve(out,`frames-${encoder.variant}`);if(frame===0)await mkdir(dir,{recursive:true});await writeFile(resolve(dir,`frame${String(frame).padStart(4,'0')}.png`),png);}
    }
    if(errors.length)throw new Error(errors.join('\n'));
    if(frame%150===0||frame===frameCount-1)console.log(`Captured ${frame+1}/${frameCount} frames × ${variants.length} variants · ${((Date.now()-start)/1000).toFixed(1)}s`);
  }
  encoders.forEach(e=>e.child.stdin.end());
  await Promise.all(encoders.map(e=>e.completion));
  const outputs=[];
  for(const e of encoders){
    const metadata=JSON.parse(execFileSync(probe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',e.temp],{encoding:'utf8',maxBuffer:2**20}));
    const video=metadata.streams.find(s=>s.codec_type==='video');
    if(metadata.streams.length!==1||!video||video.codec_name!=='h264'||video.width!==WIDTH||video.height!==HEIGHT||video.pix_fmt!=='yuv420p'||video.r_frame_rate!=='30/1'||video.avg_frame_rate!=='30/1'||Number(video.nb_read_frames)!==frameCount||Math.abs(Number(metadata.format.duration)-frameCount/FPS)>.035)throw new Error(`Output verification failed: ${e.variant}`);
    const final=resolve(out,`drishti-${e.variant}.mp4`);await rename(e.temp,final);
    await writeFile(resolve(out,`ffprobe-${e.variant}.json`),JSON.stringify(metadata,null,2)+'\n');
    outputs.push({variant:e.variant,path:final,bytes:(await stat(final)).size,frames:frameCount,duration:frameCount/FPS});
  }
  const sources={};for(const file of ['index.html','script.js','scenes.js','art.js','timeline.js','narration.json','styles.css','assets/dm-sans-500.woff2','assets/dm-sans-800.woff2'])sources[file]=createHash('sha256').update(await readFile(resolve(FILM_ROOT,file))).digest('hex');
  await writeFile(resolve(out,'render-manifest.json'),JSON.stringify({renderer:'Plain HTML5 Canvas 2D + JavaScript',capture:'Puppeteer per-frame PNG screenshot → ffmpeg image2pipe',browser:await browser.version(),node:process.version,viewport:{width:WIDTH,height:HEIGHT,deviceScaleFactor:1},fps:FPS,frameCount,audio:false,partial:frameCount!==TOTAL_FRAMES,elapsedSeconds:(Date.now()-start)/1000,outputs,sources},null,2)+'\n');
  console.log(JSON.stringify(outputs,null,2));
}finally{
  for(const e of encoders)if(e.child.exitCode===null)e.child.kill('SIGTERM');
  if(browser)await browser.close();if(server)await server.close();
}