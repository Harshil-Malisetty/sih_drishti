import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/700.css';
import { PlanningScene } from './scenes/ActionScenes';
import { clamp, FRAME_RATE } from './timeline';
import { useFilmClock } from './useFilmClock';

/** Isolated preview: does not depend on the unfinished full-film page. */
function PlanningPreview() {
  const { frame, playing, seek, setPlaying } = useFilmClock();
  const localFrame = clamp(frame - 1470, 0, 299);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const seconds = Number(params.get('t') ?? 0);
    seek(1470 + Math.round(clamp(Number.isFinite(seconds) ? seconds : 0, 0, 299 / FRAME_RATE) * FRAME_RATE));
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!params.has('t') && !reducedMotion.matches);
    const stopForMotionPreference = () => { if (reducedMotion.matches) setPlaying(false); };
    const stopWhenHidden = () => { if (document.hidden) setPlaying(false); };
    reducedMotion.addEventListener('change', stopForMotionPreference);
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      reducedMotion.removeEventListener('change', stopForMotionPreference);
      document.removeEventListener('visibilitychange', stopWhenHidden);
    };
  }, [seek, setPlaying]);

  useEffect(() => { if (frame >= 1770) seek(1470); }, [frame, seek]);

  return <main>
    <header><h1>Drishti / Planning in perspective</h1><p>2.5D animation study · 10-second loop</p></header>
    <div className="stage">
      <svg viewBox="0 0 1920 1080" role="img" aria-label="Animated miniature city comparing traffic diversions before planner approval">
        <rect width="1920" height="1080" fill="#f5efd9" />
        <PlanningScene frame={1470 + localFrame} time={localFrame / FRAME_RATE} />
        <g fill="#183f49" fontFamily="'DM Sans', sans-serif">
          <text x="64" y="92" fontSize="36" fontWeight="700">Plan before the barrier.</text>
          <text x="1856" y="92" textAnchor="end" fontSize="20">Product vision / simulated AI</text>
          <text x="64" y="994" fontSize="24">Compare the observations. Explore the alternatives. Approve the change.</text>
        </g>
      </svg>
    </div>
    <footer>
      <button type="button" onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Play'}</button>
      <label><span>Timeline</span><input aria-label="Scene timeline" type="range" min="0" max="299" value={localFrame} onChange={event => { setPlaying(false); seek(1470 + Number(event.target.value)); }} /></label>
      <output>{(localFrame / FRAME_RATE).toFixed(1)} / 10.0 s</output>
    </footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<PlanningPreview />);