import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Player, Stage, Vector2, type LogPayload } from '@motion-canvas/core';
import { ArrowLeft, Camera, Maximize, Minimize, Pause, Play, RotateCcw } from 'lucide-react';
import { createFilmProject, FILM_DURATION, FILM_FPS } from './motionProject';
import './film.css';

export default function MotionFilmPlayer() {
  const pictureRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const engineRef = useRef<Player | null>(null);
  const stageRef = useRef<Stage | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const host = pictureRef.current;
    if (!host) return;
    const title = document.title;
    document.title = 'The moving eye | Drishti Film';
    let disposed = false;
    const project = createFilmProject();
    const stage = new Stage();
    stage.configure({ size: new Vector2(1920, 1080), resolutionScale: 1, background: '#f4f5f0' });
    stage.finalBuffer.setAttribute('role', 'img');
    stage.finalBuffer.setAttribute('aria-label', 'A government official shows a fixed CCTV camera. A public bus carries a camera and an onboard processor. Multiple buses gather observations into shared Drishti intelligence.');
    host.append(stage.finalBuffer);
    const engine = new Player(project, { fps: FILM_FPS, size: new Vector2(1920, 1080) }, { paused: true, muted: true, loop: false });
    engineRef.current = engine;
    stageRef.current = stage;
    const render = async () => {
      if (disposed) return;
      try {
        await stage.render(engine.playback.currentScene, engine.playback.previousScene);
        if (!disposed) setReady(true);
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : 'The scene could not be rendered.');
        engine.togglePlayback(false);
      }
    };
    const frame = (value: number) => { if (!disposed) setTime(value / FILM_FPS); };
    const state = (value: { paused: boolean }) => { if (!disposed) setPlaying(!value.paused); };
    const visibility = () => { if (document.hidden) engine.togglePlayback(false); };
    const full = () => setFullscreen(document.fullscreenElement === containerRef.current);
    const log = (entry: LogPayload) => {
      if (entry.level === 'error' && !disposed) setError(entry.message);
    };
    engine.onRender.subscribe(render);
    engine.onFrameChanged.subscribe(frame);
    engine.onStateChanged.subscribe(state);
    project.logger.onLogged.subscribe(log);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('fullscreenchange', full);
    return () => {
      disposed = true;
      engine.deactivate();
      engine.onRender.unsubscribe(render);
      engine.onFrameChanged.unsubscribe(frame);
      engine.onStateChanged.unsubscribe(state);
      project.logger.onLogged.unsubscribe(log);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('fullscreenchange', full);
      stage.finalBuffer.remove();
      engineRef.current = null;
      stageRef.current = null;
      document.title = title;
    };
  }, []);

  function seek(seconds: number) {
    engineRef.current?.requestSeek(Math.round(Math.min(FILM_DURATION, Math.max(0, seconds)) * FILM_FPS));
  }

  function play(restart = false) {
    if (restart || time >= FILM_DURATION - 0.05) engineRef.current?.requestReset();
    engineRef.current?.togglePlayback(restart || !playing);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await containerRef.current?.requestFullscreen();
    } catch { setError('Fullscreen is unavailable in this browser.'); }
  }

  function capture() {
    stageRef.current?.finalBuffer.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `drishti-scene-01-${time.toFixed(2)}s.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }

  function keys(event: KeyboardEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('button,input,select,a')) return;
    if (event.code === 'Space') { event.preventDefault(); play(); }
    if (event.code === 'ArrowRight') { event.preventDefault(); seek(time + 1); }
    if (event.code === 'ArrowLeft') { event.preventDefault(); seek(time - 1); }
    if (event.code === 'Home') { event.preventDefault(); seek(0); }
    if (event.code === 'End') { event.preventDefault(); seek(FILM_DURATION); }
  }

  return <main className="film-page">
    <header className="film-masthead">
      <a className="film-brand" href="/" aria-label="Back to Drishti"><ArrowLeft size={16}/><strong>DRISHTI<span>FILM</span></strong></a>
      <span className="film-edition">A city in motion</span>
      <span className="film-chapter">01 <span>/ GOVERNMENT</span></span>
    </header>
    <section ref={containerRef} className="film-player" aria-label="Scene 1 film player" tabIndex={0} onKeyDown={keys} aria-busy={!ready}>
      <div ref={pictureRef} className="film-picture" data-engine="motion-canvas"/>
      <div className="film-transport">
        <input className="film-seek" aria-label="Scene time" aria-valuetext={`${time.toFixed(2)} of ${FILM_DURATION} seconds`} type="range" min={0} max={FILM_DURATION} step={1 / FILM_FPS} value={time} disabled={!ready} onChange={event => seek(Number(event.target.value))} style={{ '--film-progress': `${time / FILM_DURATION * 100}%` } as React.CSSProperties}/>
        <div className="film-control-row">
          <div className="film-controls">
            <button className="film-play" type="button" onClick={() => play()} aria-label={playing ? 'Pause scene' : 'Play scene'} title={playing ? 'Pause' : 'Play'} disabled={!ready}>{playing ? <Pause/> : <Play/>}</button>
            <button type="button" onClick={() => play(true)} aria-label="Restart scene" title="Restart" disabled={!ready}><RotateCcw/></button>
            <output className="film-time" aria-label="Playback time">00:{Math.floor(time).toString().padStart(2, '0')} <span>/ 00:34</span></output>
          </div>
          <div className="film-controls film-options">
            <select aria-label="Playback speed" value={speed} onChange={event => { const next = Number(event.target.value); setSpeed(next); engineRef.current?.setSpeed(next); }}><option value={0.5}>0.5x</option><option value={1}>1x</option><option value={1.5}>1.5x</option></select>
            <button type="button" onClick={capture} aria-label="Download current frame" title="Download frame" disabled={!ready}><Camera/></button>
            <button type="button" onClick={() => void toggleFullscreen()} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen">{fullscreen ? <Minimize/> : <Maximize/>}</button>
          </div>
        </div>
      </div>
    </section>
    <footer className="film-colophon"><div><span className="film-scene-number">SCENE 01</span><h1>The moving eye</h1></div></footer>
    {error && <p className="film-error" role="alert">{error}</p>}
  </main>;
}