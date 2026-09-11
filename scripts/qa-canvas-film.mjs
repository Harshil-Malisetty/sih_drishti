import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startFilmServer, launchOptions } from './film-server.mjs';
import { SCENES, TOTAL_FRAMES } from '../public/canvas-film/timeline.js';

const out=resolve(process.env.FILM_QA_OUT||'/tmp/drishti-canvas-qa');
await mkdir(out,{recursive:true});
const server=await startFilmServer();let browser;
const errors=[],external=[],modules=[];const checks=[];
try{
  browser=await puppeteer.launch(launchOptions());const page=await browser.newPage();
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).origin!==new URL(server.url).origin)external.push(request.url());modules.push(request.url());});
  await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
  await page.goto(`${server.url}?capture=1`,{waitUntil:'networkidle0'});await page.evaluate(()=>window.filmReady);
  assert.equal(await page.$eval('.controls',e=>getComputedStyle(e).display),'none');
  const stage=await page.$eval('#film',e=>({width:e.width,height:e.height,display:e.getBoundingClientRect().toJSON()}));assert.equal(stage.width,1920);assert.equal(stage.display.width,1920);assert.equal(stage.display.height,1080);
  checks.push('Capture is exactly 1920×1080 at DPR 1; no player chrome.');
  const snapshots=[];
  for(const scene of SCENES){for(const frame of [scene.start+20,Math.floor((scene.start+scene.end)/2),scene.end-1]){
    await page.evaluate(f=>window.renderFrame(f),frame);
    const png=await page.screenshot({type:'png',clip:{x:0,y:0,width:1920,height:1080}});
    const name=`${String(frame).padStart(4,'0')}-${scene.id}.png`;await writeFile(resolve(out,name),png);
    snapshots.push(await sharp(png).resize(480,270).png().toBuffer());
  }}
  await sharp({create:{width:1440,height:8*270,channels:3,background:'#f5efdf'}}).composite(snapshots.map((input,i)=>({input,left:(i%3)*480,top:Math.floor(i/3)*270}))).png().toFile(resolve(out,'contact-sheet.png'));
  checks.push('24 story stills: problem, process and outcome across all eight scenes.');
  const hash=async(frame,subtitles=true)=>{await page.evaluate((f,s)=>window.renderFrame(f,{subtitles:s}),frame,subtitles);return createHash('sha256').update(await page.screenshot({type:'png',clip:{x:0,y:0,width:1920,height:1080}})).digest('hex');};
  for(const frame of [0,120,437,690,1140,1350,1710,2110,2699]){const before=await hash(frame);await hash(2333);await hash(19,false);assert.equal(await hash(frame),before,`Nondeterministic frame ${frame}`);assert.notEqual(await hash(frame,false),before,`Caption toggle ignored at ${frame}`);}
  assert.equal(await hash(2677),await hash(2699),'Final end card must hold');
  checks.push('Nine shuffled/repeated seeks are byte-identical; clean/caption variants differ; final hold is stable.');
  const timing=await page.evaluate(()=>{
    const times=[];for(let f=0;f<window.film.totalFrames;f++){const start=performance.now();const result=window.renderFrame(f);if(result.frame!==f)throw new Error(`Frame mismatch ${f}`);times.push(performance.now()-start);}
    for(const c of window.film.captions){if(window.film.wrapCaption(c.text).length>2)throw new Error('Caption overflow');for(const f of [c.start,c.end-1])if(window.renderFrame(f).frame!==f)throw new Error('Caption boundary failed');}
    const sorted=times.toSorted((a,b)=>a-b);return{frames:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:sorted[Math.floor(times.length*.95)]};
  });
  assert.equal(timing.frames,TOTAL_FRAMES);checks.push('All 2,700 frames draw without exceptions; every caption boundary and two-line limit checked.');
  await page.goto(server.url,{waitUntil:'networkidle0'});await page.evaluate(()=>window.filmReady);
  assert.equal(await page.$eval('#film',e=>e.dataset.frame),'0');assert.equal(await page.$eval('#play',e=>e.getAttribute('aria-label')),'Play');
  await page.click('#play');await page.waitForFunction(()=>Number(document.querySelector('#film').dataset.frame)>5);await page.click('#play');
  const paused=await page.$eval('#film',e=>e.dataset.frame);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.$eval('#film',e=>e.dataset.frame),paused);
  await page.click('#play');await page.waitForFunction(f=>Number(document.querySelector('#film').dataset.frame)>Number(f),{},paused);await page.click('#play');
  await page.focus('#seek');await page.keyboard.press('End');assert.equal(await page.$eval('#film',e=>e.dataset.frame),'2699');await page.keyboard.press('Home');assert.equal(await page.$eval('#film',e=>e.dataset.frame),'0');
  await page.click('#chapters button:nth-child(5)');assert.equal(await page.$eval('#film',e=>e.dataset.scene),'crossings');await page.click('#restart');assert.equal(await page.$eval('#film',e=>e.dataset.frame),'0');
  await page.click('#captions');assert.equal(await page.$eval('#film',e=>e.dataset.subtitles),'false');await page.click('#captions');
  await page.click('#fullscreen');await page.waitForFunction(()=>Boolean(document.fullscreenElement));await page.evaluate(()=>document.exitFullscreen());
  checks.push('Play/pause/resume, restart, keyboard scrubbing, chapters, subtitles and fullscreen work.');
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.reload({waitUntil:'networkidle0'});await page.evaluate(()=>window.filmReady);
  assert.equal(await page.$eval('#play',e=>e.getAttribute('aria-label')),'Play');assert.equal(await page.$eval('#film',e=>e.dataset.frame),'0');
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:resolve(out,'mobile-player.png'),fullPage:true});
  checks.push('Reduced-motion starts paused; 390px mobile player has no horizontal overflow.');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.ok(!modules.some(url=>/react|cityStore|OperationalApp|\.tsx/.test(url)));
  checks.push('No page errors, external requests, React modules or operational store loads.');
  const report={browser:await browser.version(),checks,timing,errors,external,contactSheet:resolve(out,'contact-sheet.png')};await writeFile(resolve(out,'qa-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();await server.close();}