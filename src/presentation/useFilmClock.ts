import { useCallback, useEffect, useRef, useState } from 'react';
import { FRAME_RATE, normalizeFrame, TOTAL_FRAMES } from './timeline';

export function useFilmClock() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const current = useRef(0);
  const origin = useRef<{ frame: number; time: number } | null>(null);
  const seek = useCallback((value: number) => {
    current.current = normalizeFrame(value);
    origin.current = null;
    setFrame(current.current);
  }, []);
  useEffect(() => {
    if (!playing) { origin.current = null; return; }
    let request = 0;
    const tick = (now: number) => {
      origin.current ??= { frame: current.current, time: now };
      const next = normalizeFrame(origin.current.frame + Math.floor((now - origin.current.time) * FRAME_RATE / 1000));
      current.current = next;
      setFrame(next);
      if (next >= TOTAL_FRAMES - 1) setPlaying(false);
      else request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(request); origin.current = null; };
  }, [playing]);
  return { frame, playing, seek, setPlaying };
}