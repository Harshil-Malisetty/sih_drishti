import { mix } from '../timeline';

export const INK = '#183f49';
export const TEAL = '#087f82';
export const AMBER = '#eaa64e';
export const GREEN = '#398663';
export type VehicleKind = 'bus' | 'car' | 'police' | 'truck' | 'auto';
/** A shared design language: wheels at y=0; all vehicles face right. */
export function Vehicle({ x = 0, y = 0, scale = 1, kind = 'car', frame = 0, color, top = false, angle = 0 }: {
  x?: number; y?: number; scale?: number; kind?: VehicleKind; frame?: number; color?: string; top?: boolean; angle?: number;
}) {
  const bus = kind === 'bus'; const truck = kind === 'truck'; const police = kind === 'police';
  const width = bus ? 270 : truck ? 215 : kind === 'auto' ? 110 : 160;
  const paint = color || (bus ? '#e5aa5e' : police ? '#f5f2e7' : truck ? '#edbd61' : kind === 'auto' ? '#dba446' : '#bb6658');
  return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} stroke={INK} strokeWidth="3" strokeLinejoin="round">
    {top ? <>
      <ellipse cx="0" cy="8" rx={width / 2 + 8} ry="44" fill={INK} opacity=".15" stroke="none" />
      <rect x={-width / 2} y="-38" width={width} height="76" rx="17" fill={paint} />
      <rect x={-width / 2 + 30} y="-27" width={width - 68} height="54" rx="8" fill={bus ? '#efd3a0' : paint} />
      <path d={`M${width / 2 - 39} -29 L${width / 2 - 23} -24 V24 L${width / 2 - 39} 29Z`} fill="#42666a" />
      <path d={`M${-width / 2 + 23} -26 V26 L${-width / 2 + 40} 21 V-21Z`} fill="#42666a" />
      {bus && <><rect x="-60" y="-18" width="32" height="36" rx="5" fill="#f9e8c6"/><rect x="0" y="-18" width="32" height="36" rx="5" fill="#f9e8c6"/></>}
      {police && <><rect x="-5" y="-32" width="14" height="32" fill="#d47163"/><rect x="-5" y="0" width="14" height="32" fill="#679dab"/></>}
      <path d={`M${width / 2 - 5} -25v10m0 30v10`} stroke="#fff3ba" strokeWidth="7" />
    </> : <>
      <ellipse cx="0" cy="7" rx={width / 2 + 14} ry="13" fill={INK} opacity=".17" stroke="none" />
      {bus ? <>
        <path d="M-135-26V-112Q-135-129-115-129H100Q124-129 132-107L137-28Z" fill={paint}/>
        <path d="M-128-102H104L123-71H-128Z" fill="#325962"/>
        {[0, 1, 2, 3, 4].map(i => <g key={i}><rect x={-118 + i * 42} y="-106" width="33" height="38" rx="4" fill="#79a9ac"/><path d={`M${-114 + i * 42}-102l15 28`} stroke="#c8e6da" opacity=".55"/></g>)}
        <path d="M-135-55H133V-36H-135" fill="#a74d43" stroke="none"/>
        <path d="M86-64V-19H116V-65" fill="#416a6e"/>
        <text x="-58" y="-39" fontSize="15" fill="#fff4d8" stroke="none" fontWeight="700">MTC · 21G</text>
        <rect x="115" y="-118" width="12" height="9" rx="3" fill={TEAL}/><circle cx="122" cy="-113" r="2" fill="#e4faf0"/>
      </> : truck ? <>
        <path d="M-107-27V-95H13V-28" fill={paint}/><path d="M13-28V-111H62L102-65V-26Z" fill="#edcf91"/>
        <path d="M28-99H57L82-70H28Z" fill="#79a9ac"/><path d="M-97-62H4" stroke="#b18d54"/>
        <text x="-91" y="-73" fontSize="12" fill={INK} stroke="none" fontWeight="700">CITY WORKS</text>
      </> : <>
        <path d="M-78-24V-55L-45-65L-27-96H35L61-63L80-54V-24Z" fill={paint}/>
        <path d="M-35-67L-20-87H28L47-67Z" fill="#78a5a7"/><path d="M6-86V-67"/>
        <path d="M-72-41H74" stroke={police ? '#42798b' : '#ffffff'} opacity=".55" strokeWidth="6"/>
        {police && <><rect x="-17" y="-105" width="20" height="9" fill="#ca655d"/><rect x="3" y="-105" width="20" height="9" fill="#588fb1"/><text x="-28" y="-47" fontSize="12" fill={INK} stroke="none" fontWeight="700">POLICE</text></>}
        <rect x="65" y="-58" width="12" height="7" fill="#fff0b0" stroke="none"/>
      </>}
      {[-width * .31, width * .31].map((wheel, i) => <g key={i} transform={`translate(${wheel} -17) rotate(${frame * 8})`}>
        <circle r="21" fill={INK}/><circle r="11" fill="#c5d3cc" stroke="none"/><path d="M-8 0H8M0-8V8" stroke="#72918e" strokeWidth="3"/>
      </g>)}
    </>}
  </g>;
}

export type Role = 'police' | 'municipal' | 'citizen' | 'representative' | 'worker' | 'child';
export function Person({ x = 0, y = 0, scale = 1, role = 'citizen', frame = 0, walking = false, pose = 'idle', flip = false }: {
  x?: number; y?: number; scale?: number; role?: Role; frame?: number; walking?: boolean; pose?: 'idle' | 'point' | 'phone' | 'work'; flip?: boolean;
}) {
  const phase = frame / 5; const swing = walking ? Math.sin(phase) * 15 : 0;
  const shirt = role === 'police' ? '#bfa173' : role === 'municipal' ? '#658f86' : role === 'representative' ? '#284d65' : role === 'worker' ? '#e9ae47' : role === 'child' ? '#f1d5b2' : '#bf6f60';
  return <g transform={`translate(${x} ${y - (walking ? Math.abs(Math.sin(phase)) * 3 : 0)}) scale(${flip ? -scale : scale} ${scale})`} stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cy="3" rx="25" ry="6" fill={INK} opacity=".12" stroke="none"/>
    <path d={`M-9-44L${-10 + swing}-6h-10M9-44L${10 - swing}-6h12`} fill="none" stroke={role === 'police' ? '#716751' : '#284a54'} strokeWidth="12"/>
    <path d="M-23-90Q0-102 23-90L18-44H-18Z" fill={shirt}/>
    {role === 'worker' && <path d="M-11-91V-48M11-91V-48" stroke="#fff0bc" strokeWidth="6"/>}
    <path d={`M-21-85L${-26 - swing / 2}-61L-22-49`} fill="none" stroke={shirt} strokeWidth="12"/>
    <path d={pose === 'point' ? 'M21-85L41-79L63-98' : pose === 'phone' ? 'M21-85L37-66L41-98' : pose === 'work' ? `M21-85L43-60L${mix(30, 70, (Math.sin(phase) + 1) / 2)}-38` : `M21-85L${26 + swing / 2}-61L23-49`} fill="none" stroke={shirt} strokeWidth="12"/>
    {pose === 'phone' && <rect x="32" y="-115" width="19" height="29" rx="3" fill={INK}/ >}
    <rect x="-6" y="-110" width="12" height="16" fill="#b87d56" stroke="none"/>
    <ellipse cy="-124" rx="18" ry="23" fill="#c99165"/>
    <path d="M-18-124Q-25-152 2-152Q23-152 19-129L11-140L-13-135Z" fill={INK}/>
    <path d="M10-122h1m-7 11h7" strokeWidth="2.5"/>
    {(role === 'police' || role === 'worker') && <><path d="M-21-137Q-18-158 0-158Q21-158 22-137Z" fill={role === 'worker' ? '#f7cb65' : '#bfa173'}/><path d="M-23-137H28"/></>}
    {role === 'police' && <><path d="M-19-58H18" stroke="#74593c" strokeWidth="7"/><circle cx="10" cy="-83" r="4" fill="#ecc562" stroke="none"/></>}
  </g>;
}