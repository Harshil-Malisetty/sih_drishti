/** Entirely frame-derived; no random or CSS animation clocks. */
export function Rain({ frame, opacity = 1 }: { frame: number; opacity?: number }) {
  return <g opacity={opacity} stroke="#d4e9df" strokeWidth="2.5" strokeLinecap="round">
    {Array.from({ length: 66 }, (_, i) => {
      const x = (i * 137 + frame * 3) % 2000 - 40; const y = (i * 211 + frame * 19) % 1100 - 30;
      return <path key={i} d={`M${x} ${y}l-9 24`}/>;
    })}
  </g>;
}
export function RoadDefect({ x, y, severity = 1, repaired = 0 }: { x: number; y: number; severity?: number; repaired?: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <g opacity={1 - repaired}><ellipse rx={95 * severity} ry={25 * severity} fill="#ad9a79"/><ellipse rx={76 * severity} ry={18 * severity} fill="#354f4c"/>
      <path d="M-25-3l-64-14l-30-20m38 24l-10 22m105-6l65 13l24-10M10-11l28-24l37-6" stroke="#3d554f" strokeWidth={2 + severity * 3} fill="none" opacity={Math.min(1, severity * 3)}/>
      {[0,1,2,3,4].map(i => <ellipse key={i} cx={-60 + i * 31} cy={-9 + i % 2 * 24} rx="8" ry="3" fill="#d2b895"/>)}</g>
    <g opacity={repaired}><path d="M-120-26L90-30L122 29L-106 28Z" fill="#7f9287"/><path d="M-91-21L71-23M-60 23L97 20" stroke="#a0aa94" strokeWidth="2"/></g>
  </g>;
}