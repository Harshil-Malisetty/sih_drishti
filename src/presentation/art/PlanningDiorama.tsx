import { useId, type ReactNode } from 'react';
import { clamp, mix, progress } from '../timeline';

/** An orthographic 2.5D camera, sampled from film time rather than a CSS clock. */
export function planningCamera(time: number) {
  const t = clamp(time, 0, 10);
  const orbit = progress(t, 0, 10);
  const approval = progress(t, 8.1, 9.8);
  const a = mix(.80, .84, orbit);
  const b = mix(-.025, .025, orbit);
  const c = mix(-.22, -.12, orbit);
  const d = mix(.40, .42, orbit);
  const x = 960 - approval * 12;
  const y = 540 - approval * 4;
  return `matrix(${a} ${b} ${c} ${d} ${x - a * 960 - c * 540} ${y - b * 960 - d * 540})`;
}

/** Keep the slab, roads and vehicles in one projection so traffic stays grounded. */
export function PlanningDiorama({ time, children }: { time: number; children: ReactNode }) {
  const id = `diorama-${useId().replace(/:/g, '')}`;
  const camera = planningCamera(time);
  return <g data-layer="planning-diorama">
    <defs>
      <clipPath id={`${id}-map`}><rect width="1920" height="1080" rx="18" /></clipPath>
      <radialGradient id={`${id}-backdrop`}>
        <stop stopColor="#faf8ec" /><stop offset="1" stopColor="#dce5d8" />
      </radialGradient>
      <linearGradient id={`${id}-edge`} x2="0" y2="1">
        <stop stopColor="#8ca69a" /><stop offset="1" stopColor="#486e68" />
      </linearGradient>
      <filter id={`${id}-shadow`} x="-20%" y="-100%" width="140%" height="300%">
        <feGaussianBlur stdDeviation="18" />
      </filter>
    </defs>
    <rect y="160" width="1920" height="715" fill={`url(#${id}-backdrop)`} />
    <g transform="translate(10 42)" opacity=".22" filter={`url(#${id}-shadow)`}>
      <rect transform={camera} width="1920" height="1080" rx="24" fill="#284e48" />
    </g>
    <g data-layer="map-plinth" transform="translate(0 24)">
      <rect transform={camera} width="1920" height="1080" rx="18" fill="#486e68" />
    </g>
    {/* Stacked edges give the board real screen-space thickness without WebGL. */}
    {[20, 16, 12, 8, 4].map(offset => <g key={offset} transform={`translate(0 ${offset})`}>
      <rect transform={camera} width="1920" height="1080" rx="18" fill={`url(#${id}-edge)`} />
    </g>)}
    <g data-layer="diorama-camera" transform={camera}>
      <g clipPath={`url(#${id}-map)`}>{children}</g>
      <rect width="1920" height="1080" rx="18" fill="none" stroke="#f7f5df" strokeWidth="5" />
    </g>
  </g>;
}