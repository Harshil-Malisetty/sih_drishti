import type { ReactNode } from 'react';
import { AMBER, INK, TEAL, Vehicle } from './Actors';

export function Palm({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} strokeLinejoin="round">
    <path d="M0 0Q-10-65 10-147" fill="none" stroke="#a58963" strokeWidth="13"/>
    <path d="M10-147Q-39-197-75-151Q-28-167 10-147Q-5-209 41-214Q21-185 10-147Q69-196 97-147Q62-166 10-147Q63-149 66-101Q42-134 10-147Q-37-151-47-101Q-44-130 10-147" fill="#598d79"/>
  </g>;
}
export function Building({ x, y = 560, width = 230, height = 290, color = '#e4d7ba', sign }: { x: number; y?: number; width?: number; height?: number; color?: string; sign?: string }) {
  return <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth="2">
    <rect x="8" y={-height + 8} width={width} height={height} fill="#416b6a" opacity=".1" stroke="none"/>
    <rect y={-height} width={width} height={height} rx="3" fill={color}/>
    <path d={`M-8 ${-height}H${width + 8}v14H-8Z`} fill="#f4e9d2"/>
    {Array.from({ length: Math.max(1, Math.floor((height - 85) / 65)) }, (_, row) => <g key={row}>
      {[0, 1, 2].map(col => <g key={col} transform={`translate(${20 + col * (width - 30) / 3} ${-height + 30 + row * 65})`}>
        <rect width={(width - 65) / 3} height="35" fill="#779c99"/><path d={`M0 39H${(width - 65) / 3 + 5}`} stroke="#f6e8d0" strokeWidth="5"/>
        <path d="M8 5v25" stroke="#a8c0b0"/>
      </g>)}
    </g>)}
    <rect x="20" y="-68" width={width - 40} height="68" fill="#6c827c"/>
    <path d={`M20-24H${width - 20}M20-46H${width - 20}`} stroke="#a2b3a1"/>
    {sign && <><rect x="10" y="-105" width={width - 20} height="36" fill={TEAL}/><text x={width / 2} y="-81" textAnchor="middle" fill="#fff1d5" stroke="none" fontSize={sign.length > 15 ? 13 : 19} fontWeight="700">{sign}</text></>}
  </g>;
}

/** Side-view world spans 2400 px, with camera-dependent parallax and street action in children. */
export function Street({ frame = 0, pan = 0, location = 'Anna Salai', children, dusk = false }: { frame?: number; pan?: number; location?: string; children?: ReactNode; dusk?: boolean }) {
  return <g>
    <rect width="1920" height="1080" fill={dusk ? '#cadad2' : '#dce9de'}/>
    <circle cx="1500" cy="230" r="92" fill="#f5d499" opacity=".8"/>
    <g fill="#f6f3e5" opacity=".75" transform={`translate(${-pan * .12} 0)`}>
      {[180, 640, 1100, 1760, 2140].map((x, i) => <path key={x} d={`M${x} ${190 + i % 2 * 70}q20-35 55-10q40-50 80 5q40-15 58 16H${x - 18}Z`}/>)}
    </g>
    <g fill="#abc5bd" transform={`translate(${-pan * .23} 0)`}>
      {Array.from({ length: 18 }, (_, i) => <g key={i}><rect x={i * 150 - 80} y={310 - i % 4 * 38} width="120" height={280 + i % 4 * 38}/><path d={`M${i * 150 - 50} ${290 - i % 4 * 38}v-35h45v35`}/></g>)}
      <path d="M1280 340v-90h25v-30h30v-25h20v25h30v30h25v90" fill="#92b2aa"/>
    </g>
    <g transform={`translate(${-pan * .55} 0)`} opacity=".7">
      {[180, 620, 1070, 1530, 1990].map(x => <path key={x} d={`M${x} 555V389h-42v-23h160v23h-42v166Z`} fill="#9fb7ad"/>)}
      <path d="M-100 358H2600" stroke="#c7cbb8" strokeWidth="35"/>
      <g transform={`translate(${(frame * 1.2 % 3600) - 650} 303)`}><rect width="580" height="37" rx="13" fill="#eae9d8"/>{[0,1,2,3,4,5,6,7,8].map(i => <rect key={i} x={25 + i * 61} y="9" width="43" height="15" rx="4" fill="#719994"/>)}</g>
    </g>
    <g transform={`translate(${-pan} 0)`}>
      <Building x={-100} width={260} height={280} sign="CHENNAI"/>
      <Building x={180} width={250} height={235} color="#c1d0b6" sign="TEA & TIFFIN"/>
      <Building x={460} width={280} height={325} color="#d2c4ab" sign={location === 'Phoenix Mall' ? 'PHOENIX MALL' : 'ANNA SALAI'}/>
      <Building x={790} width={290} height={260} color="#eddcbc" sign="PUBLIC SCHOOL"/>
      <Building x={1120} width={180} height={310} color="#afc7bb"/>
      <Building x={1330} width={280} height={220} color="#dac5a9" sign="PHOENIX MALL"/>
      <Building x={1650} width={230} height={280} color="#becfbc" sign="NEIGHBOURHOOD"/>
      <Building x={1940} width={270} height={310} color="#ddd1b9" sign="CITY WORKS"/>
      <Building x={2250} width={240} height={240}/>
      {[155, 755, 1300, 1910, 2240].map(x => <Palm key={x} x={x} y={574} scale={.85}/>)}
      <path d="M-300 577H2800" stroke="#b7bda9" strokeWidth="35"/>
      <path d="M-300 597H2800" stroke="#f4ebd3" strokeWidth="12"/>
      {Array.from({ length: 32 }, (_, i) => <rect key={i} x={i * 100 - 300} y="594" width="46" height="13" fill="#657d75"/>)}
      <g transform="translate(1100 475)"><path d="M0 110V0H110v110" fill="none" stroke={TEAL} strokeWidth="7"/><path d="M-12 0h134" stroke={TEAL} strokeWidth="15"/><path d="M15 75H95v25" stroke="#a88760" strokeWidth="8" fill="none"/><text x="55" y="-15" textAnchor="middle" fill={INK} fontSize="14" fontWeight="700">21G</text></g>
    </g>
    <rect y="609" width="1920" height="300" fill="#6e8580"/>
    <path d="M0 755H1920" stroke="#d7d5b9" strokeWidth="5" strokeDasharray="65 44" strokeDashoffset={pan}/>
    <path d="M0 887H1920" stroke="#f0e3c8" strokeWidth="7"/>
    {children}
    <g transform={`translate(${-pan * 1.2} 0)`}>
      {[45, 620, 1550, 2220].map(x => <g key={x}><rect x={x} y="925" width="80" height="45" rx="5" fill="#ae9d7f"/><ellipse cx={x + 40} cy="923" rx="60" ry="29" fill="#73917a"/></g>)}
    </g>
  </g>;
}

export function CityMap({ children, frame = 0, connected = false, elevation = 0, traffic = true }: { children?: ReactNode; frame?: number; connected?: boolean; elevation?: number; traffic?: boolean }) {
  const blocks = <g stroke="#b5bda9" strokeWidth="2">
      {[0, 1, 2, 3].flatMap(row => [0, 1, 2, 3, 4].map(col => <g key={`${row}-${col}`} transform={`translate(${80 + col * 335} ${140 + row * 205})`}>
        <rect width="215" height="118" rx="16" fill={(row + col) % 3 === 0 ? '#bdd0ac' : '#d7dbc2'}/>
        {[0, 1, 2].map(i => {
          const x = 15 + i * 65;
          const h = elevation * (48 + (row * 3 + col + i) % 4 * 15);
          const shift = h * .22;
          return <g key={i} data-elevation={h || undefined}>
            {h > 0 && <g stroke="none">
              <path d={`M${x} 16h49l${h * .65} ${h * .36}v80h-49L${x} 96Z`} fill="#42675c" opacity=".16" />
              <path d={`M${x} 96h49l${shift} ${-h}h-49Z`} fill="#9eac98" />
              <path d={`M${x + 49} 16v80l${shift} ${-h}v-80Z`} fill="#718e80" />
              {[.28, .62].map(level => <path key={level} d={`M${x + shift * level + 6} ${96 - h * level}h36`} stroke="#dce2ca" strokeWidth="3" strokeDasharray="7 5" />)}
            </g>}
            <g transform={h ? `translate(${shift} ${-h})` : undefined}>
              <rect x={x} y="16" width="49" height="80" rx="3" fill={['#d8c6a2','#c5ceba','#e8d9b8'][(row + col + i) % 3]}/>
              <path d={`M${x + 7} 28h35v55h-35Z`} fill="none" stroke="#a8b8a6"/>
              <rect x={x + 16} y="39" width="16" height="23" fill="#b0bdaa"/>
              {h > 0 && <path d={`M${x + 2} 93V19h44`} fill="none" stroke="#f8edcf" strokeWidth="3" />}
            </g>
          </g>;
        })}
        <circle cx="204" cy="105" r="14" fill="#7fa286"/><circle cx="3" cy="10" r="12" fill="#7fa286"/>
      </g>))}
    </g>;
  return <g>
    <rect width="1920" height="1080" fill="#e3e9d7"/>
    <path d="M1730-50Q1560 180 1770 390T1740 850L1900 1130H2050V-50Z" fill="#a7d0c7"/>
    <path d="M1730-50Q1560 180 1770 390T1740 850" fill="none" stroke="#f4ebcc" strokeWidth="35"/>
    {elevation <= 0 && blocks}
    <g stroke="#788d83" fill="none" strokeWidth="74" strokeLinejoin="round">
      <path d="M0 305H1730M0 510H1920M0 715H1750M350 0V1080M685 0V1080M1020 0V1080M1355 0V1080"/>
    </g>
    <g stroke="#e1dfc3" fill="none" strokeWidth="3" strokeDasharray="23 23">
      <path d="M0 305H1730M0 510H1920M0 715H1750M350 0V1080M685 0V1080M1020 0V1080M1355 0V1080"/>
    </g>
    {[350,685,1020,1355].map(x => <g key={x}>{[305,510,715].map(y => <g key={y} fill="#f0ead0">{[0,1,2,3,4].map(i => <rect key={i} x={x - 29 + i * 12} y={y - 63} width="6" height="21"/>)}</g>)}</g>)}
    <path d="M60 822Q420 755 620 875T1335 866Q1530 830 1770 907" fill="none" stroke="#afd0c3" strokeWidth="33"/>
    <path d="M60 822Q420 755 620 875T1335 866Q1530 830 1770 907" fill="none" stroke="#d8e3ce" strokeWidth="3" strokeDasharray="10 20"/>
    {/* Raised roofs occlude the ground, never the reverse. */}
    {elevation > 0 && blocks}
    <g fontSize="16" letterSpacing="3" fill="#426a64" fontWeight="700"><text x="90" y="85">CHENNAI / ILLUSTRATIVE CITY</text><text x="1420" y="995">BAY OF BENGAL</text></g>
    {traffic && Array.from({ length: 13 }, (_, i) => <Vehicle key={i} top kind={i % 5 === 0 ? 'bus' : i % 4 === 0 ? 'auto' : 'car'} color={i % 3 === 0 ? '#e5dbbd' : undefined} x={(i * 271 + frame * (i % 2 ? 1 : -1) + 9000) % 1800} y={i % 2 ? 490 : 735} scale={.29} angle={i % 2 ? 0 : 180} frame={frame}/>)}
    {connected && <path d="M350 305H1355V715H350Z" fill="none" stroke={TEAL} strokeWidth="7" strokeDasharray="14 17" strokeDashoffset={-frame * 1.4}/>}
    {children}
  </g>;
}

export function Camera({ x, y, offline = false, cone = true }: { x: number; y: number; offline?: boolean; cone?: boolean }) {
  return <g transform={`translate(${x} ${y})`}>
    {cone && !offline && <path d="M28-98L285 50L135 105Z" fill="#ebc27c" opacity=".22"/>}
    <path d="M0 60V-90H30" stroke={INK} strokeWidth="8" fill="none"/>
    <g transform="translate(30 -98) rotate(20)"><rect x="-16" y="-14" width="58" height="28" rx="5" fill="#ecdfbf" stroke={INK} strokeWidth="3"/><rect x="40" y="-8" width="10" height="16" fill={INK}/></g>
    <circle cx="35" cy="-100" r="4" fill={offline ? '#bc6056' : '#64ad82'}/>
    {offline && <path d="M72-130l22 22m0-22l-22 22" stroke="#b96353" strokeWidth="5"/>}
  </g>;
}
export function Label({ x, y, children, tone = 'dark', size = 22 }: { x: number; y: number; children: ReactNode; tone?: 'dark' | 'amber' | 'green'; size?: number }) {
  return <text x={x} y={y} fill={tone === 'amber' ? '#80501f' : tone === 'green' ? '#27694c' : INK} fontSize={size} fontWeight="700" paintOrder="stroke" stroke="#eef0dc" strokeWidth="7" strokeLinejoin="round">{children}</text>;
}
export function ScanBox({ x, y, width, height, frame, color = AMBER }: { x: number; y: number; width: number; height: number; frame: number; color?: string }) {
  return <g transform={`translate(${x} ${y})`}><rect width={width} height={height} fill={color} fillOpacity=".07" stroke={color} strokeWidth="3" strokeDasharray="12 6"/><path d={`M0 ${frame * 3 % height}H${width}`} stroke={color} strokeWidth="3" opacity=".7"/>{[[0,0],[width,0],[0,height],[width,height]].map(([a,b],i) => <circle key={i} cx={a} cy={b} r="5" fill={color}/>)}</g>;
}
export function Packet({ x, y, color = TEAL }: { x: number; y: number; color?: string }) {
  return <g transform={`translate(${x} ${y})`}><circle r="14" fill={color} opacity=".18"/><rect x="-6" y="-6" width="12" height="12" rx="3" fill={color}/></g>;
}
export function Check({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><circle r="28" fill="#378566"/><path d="M-13 0l9 10l18-22" stroke="#faf2da" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></g>;
}
export function Phone({ x = 0, y = 0, scale = 1, children }: { x?: number; y?: number; scale?: number; children?: ReactNode }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><rect x="9" y="12" width="292" height="520" rx="37" fill={INK} opacity=".16"/><rect width="292" height="520" rx="37" fill={INK}/><rect x="12" y="13" width="268" height="490" rx="28" fill="#f2eddc"/><path d="M104 26h84" stroke={INK} strokeWidth="10" strokeLinecap="round"/>{children}<path d="M114 485h64" stroke={INK} strokeWidth="5" strokeLinecap="round"/></g>;
}