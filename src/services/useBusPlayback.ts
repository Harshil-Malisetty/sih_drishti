import { useEffect, useMemo, useState } from 'react';
import { busPosition, createBusTrack } from '../domain/busPlayback';
import type { CityBus } from '../types/city';

export function useBusPlayback(buses: CityBus[], speed = 1) {
  const [paused, setPaused] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [seconds, setSeconds] = useState(0);
  const [visible, setVisible] = useState(true);
  const tracks = useMemo(() => buses.map(createBusTrack), [buses]);
  useEffect(() => {
    if (paused || !visible) return;
    const timer = window.setInterval(() => { if (!document.hidden) setSeconds(value => value + speed); }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, visible, speed]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { if (media.matches) setPaused(true); };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const positions = useMemo(() => tracks.map(track => busPosition(track, seconds)), [tracks, seconds]);
  return { positions, paused, setPaused, visible, setVisible, seconds };
}