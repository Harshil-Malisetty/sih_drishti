import { useId, type ReactNode } from 'react';
import { AMBER, GREEN, INK, Person, TEAL, Vehicle, type VehicleKind } from '../art/Actors';
import { RoadDefect } from '../art/Atmosphere';
import { Building, Camera, Check, CityMap, Label, Packet, Palm, Phone, Street } from '../art/ChennaiWorld';
import { PlanningDiorama } from '../art/PlanningDiorama';
import { clamp, ease, mix, progress } from '../timeline';

type SceneProps = { frame: number; time: number };
type Point = readonly [number, number];
type Route = { points: Point[]; distances: number[]; length: number; d: string };
const PAPER = '#f5efd9';
const RED = '#b96050';

// The parent owns the 1920×1080 SVG, title, qualifier and subtitles. Even the
// shared full-stage artwork is clipped away from those reserved areas.
function SceneWindow({ name, children }: { name: string; children: ReactNode }) {
  const id = `action-${useId().replace(/:/g, '')}`;
  return <g data-scene={name} role="img" aria-label={name} fontFamily="'DM Sans', sans-serif">
    <defs><clipPath id={id}><rect x="0" y="160" width="1920" height="715" /></clipPath></defs>
    <g clipPath={`url(#${id})`}>{children}</g>
  </g>;
}

// Rounded, sampled road geometry: cars and packets use the SAME geometry as
// their painted route. No DOM path measurements, clocks, randomness or effects.
function road(points: readonly Point[], radius = 30): Route {
  const sampled: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]; const b = points[i]; const c = points[i + 1];
    const before = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const after = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r = Math.min(radius, before / 2, after / 2);
    const entry: Point = [mix(b[0], a[0], r / before), mix(b[1], a[1], r / before)];
    const exit: Point = [mix(b[0], c[0], r / after), mix(b[1], c[1], r / after)];
    sampled.push(entry);
    for (let step = 1; step <= 16; step++) {
      const p = step / 16; const q = 1 - p;
      sampled.push([q * q * entry[0] + 2 * q * p * b[0] + p * p * exit[0], q * q * entry[1] + 2 * q * p * b[1] + p * p * exit[1]]);
    }
  }
  sampled.push(points[points.length - 1]);
  const distances = [0];
  for (let i = 1; i < sampled.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(sampled[i][0] - sampled[i - 1][0], sampled[i][1] - sampled[i - 1][1]));
  }
  return { points: sampled, distances, length: distances[distances.length - 1], d: sampled.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') };
}

function onRoad(route: Route, fraction: number) {
  const distance = clamp(fraction) * route.length;
  let i = 1;
  while (i < route.distances.length - 1 && route.distances[i] < distance) i++;
  const a = route.points[i - 1]; const b = route.points[i];
  const p = clamp((distance - route.distances[i - 1]) / Math.max(.001, route.distances[i] - route.distances[i - 1]));
  return { x: mix(a[0], b[0], p), y: mix(a[1], b[1], p), angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}

const wrap = (n: number) => ((n % 1) + 1) % 1;
const during = (t: number, start: number, end: number, feather = .2) => progress(t, start, start + feather) * (1 - progress(t, end - feather, end));

function RoadVehicle({ route, fraction, frame, kind = 'car', color, scale = .36 }: {
  route: Route; fraction: number; frame: number; kind?: VehicleKind; color?: string; scale?: number;
}) {
  return <Vehicle {...onRoad(route, fraction)} frame={frame} top kind={kind} color={color} scale={scale} />;
}

function MovingPacket({ route, t, start, end, color = TEAL }: { route: Route; t: number; start: number; end: number; color?: string }) {
  const p = onRoad(route, progress(t, start, end));
  return <g opacity={during(t, start, end, .12)}><Packet x={p.x} y={p.y} color={color} /></g>;
}

function RouteInk({ route, color = TEAL, opacity = 1, dashed = false, width = 8, reveal = 1 }: {
  route: Route; color?: string; opacity?: number; dashed?: boolean; width?: number; reveal?: number;
}) {
  return <path d={route.d} fill="none" stroke={color} strokeWidth={width} opacity={opacity} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={dashed ? '12 15' : `${route.length} ${route.length}`} strokeDashoffset={dashed ? 0 : route.length * (1 - clamp(reveal))} />;
}

function House({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={INK} strokeWidth="3" strokeLinejoin="round">
    <path d="M-95 0V-132H95V0Z" fill="#e8d2ab" />
    <path d="M-115-127L-4-207L116-127Z" fill="#af6c58" />
    <path d="M-85-140L-4-197L86-140M-56-140l54-40l55 40" fill="none" stroke="#d79670" />
    <rect x="-16" y="-89" width="49" height="89" fill="#547a75" /><circle cx="23" cy="-43" r="3" fill={PAPER} />
    <rect x="-74" y="-95" width="39" height="48" fill="#84aba2" /><path d="M-54-94v46m-20-24h39" />
    <rect x="53" y="-95" width="29" height="48" fill="#84aba2" />
    <path d="M-112 0H112" stroke="#f5e9cf" strokeWidth="10" />
    <path d="M-95-119H95" stroke="#f5e9cf" strokeWidth="8" />
    <rect x="60" y="-174" width="30" height="31" fill="#b4c6b3" />
  </g>;
}

function Cone({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={INK} strokeWidth="2">
    <path d="M-22 0L-7-51H7L22 0Z" fill={AMBER} /><path d="M-16-17H16M-12-32H12" stroke={PAPER} strokeWidth="8" />
    <path d="M-28 2H28" strokeWidth="7" />
  </g>;
}

function Barrier({ x, y, scale = 1, top = false }: { x: number; y: number; scale?: number; top?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={INK} strokeWidth="3">
    {top ? <><rect x="-12" y="-44" width="24" height="88" rx="4" fill={AMBER} />{[-30, -6, 18].map(v => <path key={v} d={`M-10 ${v}l20 12`} stroke={PAPER} strokeWidth="9" />)}</>
      : <><path d="M-123 0v-83M123 0v-83" strokeWidth="9" /><rect x="-150" y="-78" width="300" height="43" rx="4" fill={AMBER} />
        {[-130, -65, 0, 65, 130].map(v => <path key={v} d={`M${v}-75l-26 37`} stroke={PAPER} strokeWidth="22" />)}<path d="M-145 0h43m-43-4h43M102 0h43" /></>}
  </g>;
}

// Cover CityMap's decorative through-traffic with the same street geometry.
// All visible traffic is choreographed below, so nothing drives through a closure.
function MapRoads() {
  const grid = 'M0 305H1920M0 510H1920M0 715H1920M350 0V1080M685 0V1080M1020 0V1080M1355 0V1080';
  return <g>
    <path d={grid} fill="none" stroke="#788d83" strokeWidth="74" strokeLinejoin="round" />
    <path d={grid} fill="none" stroke="#e1dfc3" strokeWidth="3" strokeDasharray="23 23" />
    {[350, 685, 1020, 1355].flatMap(x => [305, 510, 715].map(y => <g key={`${x}-${y}`} fill={PAPER} opacity=".7">
      {[0, 1, 2, 3, 4].map(i => <rect key={i} x={x - 29 + i * 12} y={y - 63} width="6" height="21" />)}
    </g>))}
  </g>;
}

function MapWorld({ frame, children, elevation = 0 }: { frame: number; children?: ReactNode; elevation?: number }) {
  return <CityMap frame={frame} elevation={elevation} traffic={elevation === 0}>
    {elevation === 0 && <MapRoads />}{children}
  </CityMap>;
}

const CROSS_ASSIGN = road([[820, 500], [1190, 500], [1400, 548]]);

/** 9 s: physical repair and later official verification are separate events. */
export function CrossingsScene({ frame, time }: SceneProps) {
  const t = clamp(time, 0, 9);
  const pan = mix(-160, 240, progress(t, .35, 3.8));
  const repaint = progress(t, 5.65, 7);
  const verified = t >= 8.2;
  const crossing = progress(t, 7.35, 8.95);
  const scan = during(t, 4, 5.45) + during(t, 7.72, 8.2, .12);
  const workerWalk = progress(t, 5.25, 5.95);
  const status = t < 4 ? 'Faded crossing · illustrative Chennai' : t < 5.1 ? 'Vision isolates worn markings' : t < 5.65 ? 'Municipal crew assigned' : t < 7 ? 'Repainting the crossing' : t < 7.72 ? 'Repair complete · awaiting re-observation' : t < 8.2 ? 'Later observation · official review' : 'Officially verified · safe crossing';
  return <SceneWindow name="crossings">
    <Street frame={frame} pan={pan} location="Phoenix Mall">
      <g transform={`translate(${-pan} 0)`}>
        <House x={1220} y={563} scale={.92} />
        <g fill={PAPER}>
          {[0, 1, 2, 3, 4, 5, 6].map(i => <g key={i}>
            <path d={`M${976 - i * 3} ${622 + i * 35}h${194 + i * 6}v19H${976 - i * 3}Z`} opacity={.12 + (i % 3) * .05} />
            <path d={`M${976 - i * 3} ${622 + i * 35}h${(194 + i * 6) * progress(t, 5.65 + i * .09, 6.4 + i * .1)}v19H${976 - i * 3}Z`} opacity={repaint} />
            <path d={`M${1000 + i * 17 % 100} ${627 + i * 35}h37m23 8h22`} stroke="#6e8580" strokeWidth="6" opacity={1 - repaint} />
          </g>)}
        </g>
        <g opacity={scan}>
          <path d="M844 500L951 616L1211 865L953 865L1180 616Z" fill={AMBER} opacity=".1" />
          {[0, 1, 2, 3, 4, 5, 6].map(i => <path key={i} d={`M${976 - i * 3} ${622 + i * 35}h${194 + i * 6}v19H${976 - i * 3}Z`} fill={AMBER} fillOpacity=".35" stroke={AMBER} strokeWidth="3" />)}
          <path d={`M944 ${mix(617, 865, wrap((t - 4) * .9))}H1220`} stroke={PAPER} strokeWidth="3" />
        </g>
        <Camera x={810} y={600} cone={false} />
        <g opacity={during(t, 7.72, 8.2, .08)}><path d="M844 500L953 865H1211Z" fill="#c8e9c2" opacity=".22" /></g>
        {/* Vehicles approach along the road and stop BEFORE the occupied zebra. */}
        <Vehicle x={mix(-420, 2580, progress(t, 0, 3.8))} y={704} scale={.82} kind="bus" frame={frame} />
        <g transform={`translate(${mix(40, 790, progress(t, 2, 4.4))} 0)`}><Vehicle y={835} scale={.75} color="#b96a58" frame={t < 4.4 ? frame : 1332} /></g>
        <g transform={`translate(${mix(2480, 1470, progress(t, 4.8, 5.6))} 720) scale(-1 1)`}><Vehicle scale={.7} kind="truck" frame={t < 5.6 ? frame : 1368} /></g>
        <g opacity={progress(t, 5.15, 5.45) * (1 - progress(t, 7.05, 7.35))}>
          <Cone x={935} y={700} scale={.7} /><Cone x={1240} y={820} scale={.7} />
          <Person x={mix(1430, 1100, workerWalk)} y={mix(661, 739, workerWalk)} scale={.75} role="worker" frame={frame} walking={t < 5.95} pose={t >= 5.95 ? 'work' : 'idle'} />
          <g transform={`translate(${mix(1010, 1170, repaint)} ${mix(643, 847, repaint)})`}>
            <path d="M0-43L-14-5" stroke={INK} strokeWidth="5" /><rect x="-44" y="-9" width="60" height="12" rx="5" fill={PAPER} stroke={INK} strokeWidth="2" />
          </g>
        </g>
        <Person x={1410} y={598} scale={.76} role="municipal" frame={frame} pose={t >= 8.2 ? 'point' : 'phone'} />
        <MovingPacket route={CROSS_ASSIGN} t={t} start={5.05} end={5.6} color={AMBER} />
        <g opacity={progress(t, 5.55, 5.75)}><path d="M1360 598h-36v-45h36Z" fill={PAPER} stroke={TEAL} strokeWidth="3" /><path d="M1332 565h19m-19 10h19m-19 10h10" stroke={TEAL} strokeWidth="3" /></g>
        {verified && <g data-state="official-verified" opacity={progress(t, 8.2, 8.38)}><Check x={1410} y={447} scale={.75} /><Check x={1204} y={620} scale={.5} /></g>}
        <Person x={mix(1051, 1090, crossing)} y={mix(600, 864, crossing)} scale={.86} role="citizen" frame={frame} walking={t > 7.35 && t < 8.95} pose={t < 4 ? 'point' : 'idle'} />
        <Person x={mix(1113, 1154, crossing)} y={mix(597, 854, crossing)} scale={.59} role="child" frame={frame + 12} walking={t > 7.35 && t < 8.95} />
        <g opacity={during(t, .3, 3.9)} stroke={RED} fill="none" strokeWidth="4"><path d="M1064 615l12 16m18-18l-4 19" /><ellipse cx="1082" cy="637" rx={mix(22, 42, ease(wrap(t)))} ry="8" opacity=".6" /></g>
        {/* Secondary categories remain small street details, not separate panels. */}
        <g transform="translate(1725 596)"><path d="M0 0L-10-106" stroke={INK} strokeWidth="6" /><path d="M-44-122l52-12l17 41l-48 17Z" fill="#d9be7a" stroke={INK} strokeWidth="3" /><path d="M-26-123l18 22l-12 14" fill="none" stroke={RED} strokeWidth="4" /></g>
        <g transform="translate(1660 755)"><path d="M-70 0h48m115 0h48" stroke="#dfd4b4" strokeWidth="17" /><path d="M-9 0H83" stroke={AMBER} strokeWidth="3" strokeDasharray="8 10" /></g>
        <Label x={1580} y={810} size={17}>Missing divider</Label><Label x={1635} y={622} size={17}>Damaged sign</Label>
      </g>
    </Street>
    <Label x={64} y={206} size={27}>{status}</Label>
  </SceneWindow>;
}

const DIRECT = road([[100, 510], [1620, 510]]);
const DIVERSION_NORTH = road([[120, 510], [685, 510], [685, 305], [1355, 305], [1355, 510], [1700, 510]]);
const DIVERSION_SOUTH = road([[120, 510], [350, 510], [350, 715], [1355, 715], [1355, 510], [1710, 510]]);
const PLANNER_PACKET = road([[1550, 420], [1355, 420], [1355, 305], [1060, 305]]);

/** 10 s: rewind an illustrative closure, compare observations, then approve. */
export function PlanningScene({ frame, time }: SceneProps) {
  const t = clamp(time, 0, 10);
  const replay = t < 3 ? t : t < 4 ? mix(3, 0, progress(t, 3, 4)) : Math.min(t - 4, 2.8);
  const compare = progress(t, 4, 4.5);
  const approved = t >= 8.5;
  const elevation = mix(.25, 1, progress(t, 0, 1.8));
  return <SceneWindow name="planning">
    <PlanningDiorama time={t}>
      <MapWorld frame={frame} elevation={elevation}>
        <g opacity={progress(replay, .2, 1)}>
          <path d="M873 473H1090V548H873Z" fill={AMBER} opacity=".15" />
          <Barrier x={953} y={510} top /><Barrier x={1018} y={510} top />
          <g transform="translate(960 418)"><path d="M-32 20V-21H32v41" stroke={INK} strokeWidth="5" fill="#c7d5c0" /><path d="M-16 9v-18L0 6L16-9V9" stroke={TEAL} strokeWidth="6" fill="none" /></g>
          <Label x={855} y={391} size={18}>METRO WORKS</Label>
          {[880, 920, 1048, 1088].map(x => <Cone key={x} x={x} y={463} scale={.35} />)}
        </g>
        <g opacity={compare * .3} data-layer="historical-observation">
          <RouteInk route={DIRECT} color={PAPER} dashed width={5} />
          {[0, 1, 2, 3, 4].map(i => <RoadVehicle key={i} route={DIRECT} fraction={wrap(i / 5 + (t - 4) * .08)} frame={frame} color={PAPER} scale={.3} />)}
        </g>
        {/* Current observations are the amber queue, not the simulation traces. */}
        <g data-layer="latest-observation">
          {[0, 1, 2, 3, 4, 5].map(i => <Vehicle key={i} top x={mix(380 - i * 110, 881 - i * 86, progress(replay, .15 + i * .1, 2.3 + i * .1))} y={491} kind={i === 3 ? 'bus' : 'car'} scale={i === 3 ? .29 : .34} color={AMBER} frame={frame} />)}
          {[0, 1, 2].map(i => <Vehicle key={i} top x={mix(1570 + i * 130, 1110 + i * 102, progress(replay, .4, 2.8))} y={530} angle={180} scale={.32} frame={frame} />)}
        </g>
        <RouteInk route={DIVERSION_NORTH} color={t < 4 ? AMBER : TEAL} opacity={t < 4 ? progress(replay, .65, 1.5) : compare * .85} reveal={t < 4 ? progress(replay, .65, 2) : progress(t, 4.4, 5.4)} />
        {t < 4 && <RoadVehicle route={DIVERSION_NORTH} fraction={mix(.16, .83, clamp(replay / 3))} kind="bus" scale={.35} frame={Math.round(replay * 30) + 1470} />}
        <g opacity={progress(t, 5.3, 6)} data-layer="demo-scenario-estimates">
          <RouteInk route={DIVERSION_SOUTH} color="#e5c781" dashed width={7} />
          {[0, 1, 2, 3].map(i => <RoadVehicle key={i} route={DIVERSION_NORTH} fraction={wrap(i / 4 + (t - 5.3) * .085)} color="#a9d6ba" frame={frame} scale={.29} />)}
          {[0, 1, 2].map(i => <RoadVehicle key={i} route={DIVERSION_SOUTH} fraction={wrap(i / 3 + (t - 5.3) * .07)} color="#e5c781" frame={frame} scale={.29} />)}
          <path d="M1090 292l23 13l-23 13M866 702l23 13l-23 13" fill="none" stroke={PAPER} strokeWidth="6" />
        </g>
        <path d="M1430 443h240l65 32h-240Z" fill={INK} opacity=".16" />
        <path d="M1670 443l36-42V239l-36 42Z" fill="#7b9888" stroke={INK} strokeWidth="2" />
        <path d="M1430 281l36-42h240l-36 42Z" fill="#edf0d5" stroke={INK} strokeWidth="2" />
        <Building x={1430} y={443} width={240} height={162} sign="CITY PLANNING" color="#c4cbb1" />
        <Person x={1555} y={458} scale={.77} role="representative" frame={frame} pose={approved ? 'point' : 'phone'} />
        <Person x={1460} y={458} scale={.69} role="municipal" frame={frame + 7} pose="point" />
        <g opacity={progress(t, 4.3, 5)}><Camera x={615} y={422} cone={false} /></g>
        {approved && <g data-state="planner-approved" opacity={progress(t, 8.5, 8.7)} transform={`translate(0 ${mix(30, -24, progress(t, 8.5, 9))})`}>
          <path d="M1617 360v-34" stroke={GREEN} strokeWidth="3" strokeDasharray="4 5" />
          <Check x={1617} y={300} scale={1.1} />
        </g>}
        <MovingPacket route={PLANNER_PACKET} t={t} start={8.65} end={9.7} color={GREEN} />
      </MapWorld>
    </PlanningDiorama>
    {t < 4 ? <>
      <Label x={64} y={206} size={28}>Metro closure · diversion &amp; backlog</Label>
      <g opacity={during(t, 3, 4, .14)}><Label x={64} y={246} size={23}>Rewind the closure scenario</Label><path d="M840 208l-24 16l24 16Zm34 0l-24 16l24 16Z" fill={TEAL} /></g>
    </> : <>
      <Label x={64} y={206} size={26}>Historical (ghost) → latest observation (amber)</Label>
      <Label x={64} y={245} size={25} tone="amber">Demo scenario estimate · not validated forecast</Label>
      <Label x={64} y={837} size={25} tone={approved ? 'green' : 'dark'}>{approved ? 'Planner approved · alternative paths' : 'Compare alternative paths before approval'}</Label>
    </>}
  </SceneWindow>;
}

const PHONE_DIRECT = road([[350, 760], [350, 510], [1020, 510]]);
const PHONE_ALTERNATIVE = road([[350, 760], [350, 305], [1020, 305], [1020, 510]]);
const GOV_OBSERVATION = road([[680, 500], [900, 466], [1270, 466], [1390, 515]]);
const PHONE_PUBLICATION = road([[1160, 502], [1320, 502], [1440, 554], [1540, 554]]);

function Excavation({ t }: { t: number }) {
  const arm = mix(-12, 13, (Math.sin(t * 1.4) + 1) / 2);
  return <g transform="translate(1100 699)" stroke={INK} strokeWidth="4" strokeLinejoin="round">
    <ellipse cx="-17" cy="12" rx="130" ry="30" fill="#af9573" stroke="none" /><path d="M-120 8Q-44-26 83 4L116 23Q-18 47-120 8Z" fill="#52645b" />
    <g transform="translate(60 -21)"><rect x="-49" y="-12" width="112" height="26" rx="13" fill={INK} /><path d="M-39 0h90" stroke="#b6b49a" strokeDasharray="9 7" strokeWidth="10" />
      <path d="M-30-14V-53H18L45-15Z" fill={AMBER} /><path d="M-28-53V-91H9L21-53Z" fill="#efd59c" /><path d="M-21-85H3L12-60H-21Z" fill="#719b99" />
      <g transform={`rotate(${arm} -23 -48)`}><path d="M-23-48L-82-109L-156-34" fill="none" stroke={INK} strokeWidth="19" /><path d="M-23-48L-82-109L-156-34" fill="none" stroke={AMBER} strokeWidth="12" /><path d="M-162-40l-25 19l34 12l20-12Z" fill="#997f50" /><circle cx="-82" cy="-109" r="6" fill={PAPER} /></g>
    </g>
  </g>;
}

function CitizenPhone({ frame, t }: { frame: number; t: number }) {
  const published = t >= 11;
  const oldRoute = 1 - progress(t, 9, 9.35);
  const notice = t < 3 ? 'Road shown open' : t < 6 ? 'Old hazard notice' : t < 9 ? 'Old transit notice' : t < 10 ? 'Awaiting government approval' : t < 11 ? 'Approved · pending publication' : 'Closure · 11 Sep, 09:41';
  return <Phone x={1475} y={228} scale={1.15}>
    <text x="146" y="73" fontSize="20" textAnchor="middle" fill={INK} fontWeight="800">{published ? 'DRISHTI' : 'Saved consumer map'}</text>
    <svg x="18" y="94" width="256" height="304" viewBox="200 0 960 1080" preserveAspectRatio="xMidYMid slice" overflow="hidden">
      <MapWorld frame={frame}>
        <g opacity={oldRoute} data-state="obsolete-map-context">
          <RouteInk route={PHONE_DIRECT} color="#738eaf" width={21} />
          <path d="M676 510l-39-22m39 22l-39 22" fill="none" stroke={PAPER} strokeWidth="9" />
          {t >= 3 && t < 6 && <g transform="translate(685 510)"><path d="M0-53L52 35H-52Z" fill="#f3d89c" stroke={INK} strokeWidth="8" /><path d="M0-20v25m0 10v8" stroke={INK} strokeWidth="8" /></g>}
          {t >= 6 && t < 9 && <g transform="translate(685 490)"><rect x="-33" y="-38" width="66" height="77" rx="8" fill={PAPER} stroke={INK} strokeWidth="7" /><rect x="-20" y="-25" width="40" height="31" fill="#789caa" /><path d="M-22 45v12m44-12v12" stroke={INK} strokeWidth="10" /></g>}
        </g>
        <House x={1020} y={442} scale={.9} />
        <circle cx="350" cy="760" r="27" fill={TEAL} stroke={PAPER} strokeWidth="12" />
        {published && <g data-state="approved-map-published">
          <path d="M604 510H791" stroke={RED} strokeWidth="22" strokeDasharray="25 13" /><Barrier x={685} y={510} top scale={1.5} />
          <RouteInk route={PHONE_ALTERNATIVE} color={TEAL} width={20} reveal={progress(t, 11, 11.8)} />
          <path d="M790 283l33 22l-33 22" fill="none" stroke={PAPER} strokeWidth="10" />
          <Check x={1087} y={427} scale={1.1} />
          <RoadVehicle route={PHONE_ALTERNATIVE} fraction={mix(0, .94, progress(t, 11.7, 14))} frame={frame} color="#ecd7a6" scale={.65} />
        </g>}
      </MapWorld>
    </svg>
    <g fill={published ? GREEN : t >= 9 ? TEAL : RED}>
      <circle cx="34" cy="433" r="7" />
      <text x="49" y="438" fontSize={t >= 9 && t < 11 ? 12 : 15} fontWeight="700">{notice}</text>
      {!published && t < 9 && <path d="M31 422l6 22" stroke={PAPER} strokeWidth="2" />}
    </g>
  </Phone>;
}

/** 14 s: no public restriction packet exists until the government approves it. */
export function CitizenScene({ frame, time }: SceneProps) {
  const t = clamp(time, 0, 14);
  const pan = mix(115, 230, progress(t, 0, 3));
  const arrival = progress(t, .2, 2.7);
  const government = progress(t, 8.85, 9.3);
  const approved = t >= 10;
  const published = t >= 11;
  const status = t < 9 ? 'Maps can lag local changes' : t < 10 ? 'Government validates the observation' : t < 11 ? 'Government approved · ready to publish' : 'Approved restriction → Drishti map';
  return <SceneWindow name="citizen">
    <Street frame={frame} pan={pan}>
      <g transform={`translate(${-pan} 0)`}>
        <House x={1200} y={563} scale={1.13} />
        <g transform="translate(957 456)"><path d="M-52 103V0H53v103" stroke={INK} strokeWidth="6" fill="#c7cdb7" /><path d="M-19 44V15L0 34L19 15V44" stroke={TEAL} strokeWidth="7" fill="none" /><text x="0" y="73" textAnchor="middle" fontSize="13" fill={INK} fontWeight="800">METRO</text></g>
        <Excavation t={t} />
        <Barrier x={1080} y={792} scale={1.1} />
        <Cone x={870} y={723} /><Cone x={1290} y={814} /><Cone x={1330} y={707} scale={.7} />
        <g transform="translate(1020 734)"><rect width="133" height="27" rx="3" fill={INK} /><text x="66" y="19" fontSize="15" textAnchor="middle" fill={PAPER} fontWeight="800">ROAD CLOSED</text></g>
        <Vehicle x={mix(-320, 610, progress(t, .2, 4.5))} y={747} kind="bus" frame={t < 4.5 ? frame : 1905} scale={.85} />
        <Vehicle x={mix(-530, 337, progress(t, .5, 5.1))} y={758} kind="auto" frame={t < 5.1 ? frame : 1923} scale={.75} />
        <Person x={mix(665, 851, arrival)} y={mix(585, 589, arrival)} role="citizen" scale={.94} frame={frame} walking={t > .2 && t < 2.7} pose={t >= 2.7 ? 'phone' : 'idle'} />
        <Person x={mix(608, 788, arrival)} y={592} role="child" scale={.64} frame={frame + 11} walking={t > .2 && t < 2.7} />
        <Person x={1275} y={650} role="worker" scale={.77} pose="work" frame={frame} />
        <Palm x={700} y={579} scale={.62} />
        <g opacity={government}>
          <Camera x={650} y={600} cone={false} />
          <path d="M683 500L968 674L1223 729Z" fill={AMBER} opacity={during(t, 9, 9.75) * .2} />
          <Person x={1390} y={620} role="municipal" scale={.92} frame={frame} pose={approved ? 'point' : 'phone'} />
          <MovingPacket route={GOV_OBSERVATION} t={t} start={9.05} end={9.8} color={AMBER} />
          {approved && <g data-state="government-approved" opacity={progress(t, 10, 10.2)}><Check x={1387} y={445} scale={.85} /></g>}
        </g>
      </g>
    </Street>
    <CitizenPhone frame={frame} t={t} />
    {/* A validated packet crosses INTO the phone; the map cannot change early. */}
    {approved && <MovingPacket route={PHONE_PUBLICATION} t={t} start={10.15} end={11} color={GREEN} />}
    {published && <g opacity={during(t, 11, 11.8)}><circle cx="1552" cy="553" r={mix(16, 65, progress(t, 11, 11.8))} fill="none" stroke={GREEN} strokeWidth="4" /></g>}
    <Label x={64} y={206} size={28}>{status}</Label>
  </SceneWindow>;
}

const CITY_LOOP = road([[350, 305], [1355, 305], [1355, 715], [350, 715], [350, 305]], 34);
const CITY_RETURN = road([[1355, 735], [330, 735], [330, 285], [1375, 285], [1375, 735], [1355, 735]], 30);
const TO_POLICE = road([[1020, 510], [685, 510], [685, 305], [550, 305]]);
const FROM_POLICE = road([[550, 305], [685, 305], [685, 510], [1020, 510]]);
const RESPONSE = road([[685, 305], [350, 305], [350, 510], [560, 510]]);
const TO_WORKS = road([[1020, 510], [1355, 510], [1355, 305], [1200, 305]]);
const FROM_WORKS = road([[1200, 305], [1355, 305], [1355, 510], [1020, 510]]);
const TO_PLANNER = road([[1020, 510], [1355, 510], [1355, 715], [1190, 715]]);
const FROM_PLANNER = road([[1190, 715], [1355, 715], [1355, 510], [1020, 510]]);
const TO_CITIZEN = road([[1020, 510], [685, 510], [685, 715], [510, 715]]);
const CITIZEN_REPORT = road([[510, 715], [350, 715], [350, 510], [1020, 510]]);
const NETWORK_ROUTES = [TO_POLICE, TO_WORKS, TO_PLANNER, TO_CITIZEN];

function SharedPath({ route, closed }: { route: Route; closed: number }) {
  const gap = mix(.16, 0, closed);
  return <path d={route.d} fill="none" stroke={TEAL} strokeWidth="7" strokeLinecap="round" opacity={mix(.3, .85, closed)}
    strokeDasharray={`${route.length * (.5 - gap)} ${route.length * gap * 2} ${route.length}`} />;
}

/** 17 s: four feedback loops, then the remaining shared-path gaps close. */
export function ConnectedScene({ frame, time }: SceneProps) {
  const t = clamp(time, 0, 17);
  const closing = progress(t, 12, 15.8);
  const repaired = progress(t, 4.65, 5.65);
  const finish = progress(t, 15.15, 16);
  const status = t < 1.4 ? 'Police review shared observation packets' : t < 4 ? 'Reviewed lead → response → feedback' : t < 6.4 ? 'Municipal repair → re-observe → verify' : t < 7.5 ? 'Planning approval feeds the shared view' : t < 10.3 ? 'Approved map → citizen · report → review' : 'Reports reviewed · public changes need approval';
  return <SceneWindow name="connected">
    <g transform={`translate(${mix(-28, 0, progress(t, 0, 12))} ${mix(-8, 0, progress(t, 0, 12))}) scale(${mix(1.025, 1, progress(t, 0, 12))})`}>
      <MapWorld frame={frame}>
        <RouteInk route={CITY_LOOP} color="#d3e3bc" opacity={.35 + closing * .4} width={13} />
        {NETWORK_ROUTES.map((route, i) => <SharedPath key={i} route={route} closed={progress(t, 12 + i * .45, 14.45 + i * .45)} />)}
        <RouteInk route={CITY_LOOP} color={TEAL} width={5} opacity={closing} reveal={closing} />
        {[0, 1, 2, 3, 4, 5].map(i => <RoadVehicle key={i} route={CITY_LOOP} fraction={wrap(i / 6 + t * .036)} frame={frame} kind={i === 1 ? 'bus' : i === 4 ? 'auto' : 'car'} scale={i === 1 ? .32 : .3} />)}
        {[0, 1, 2, 3].map(i => <RoadVehicle key={i} route={CITY_RETURN} fraction={wrap(i / 4 + t * .032)} frame={frame} color={i % 2 ? '#d6c89d' : '#acc2b1'} scale={.28} />)}
        <Building x={423} y={454} width={202} height={133} color="#d6caae" sign="POLICE" />
        <Building x={1093} y={454} width={210} height={133} color="#bed0b6" sign="CITY WORKS" />
        <Building x={1100} y={658} width={207} height={116} color="#d2cbb0" sign="PLANNING" />
        <House x={495} y={661} scale={.68} />
        <Palm x={782} y={452} scale={.62} /><Palm x={1452} y={658} scale={.7} />
        <Person x={mix(569, 646, progress(t, 0, 1.15))} y={459} role="police" scale={.75} frame={frame} walking={t < 1.15} pose={t >= 1.15 ? 'phone' : 'idle'} />
        <Person x={1284} y={463} role="municipal" scale={.75} frame={frame} pose={t >= 6 ? 'point' : 'phone'} />
        <Person x={1282} y={674} role="representative" scale={.74} frame={frame} pose={t >= 7 ? 'point' : 'phone'} />
        <Person x={mix(551, 615, progress(t, 7.5, 8.8))} y={674} role="citizen" scale={.77} frame={frame} walking={t > 7.5 && t < 8.8} pose={t >= 8.8 ? 'phone' : 'idle'} />
        <Person x={mix(553, 601, progress(t, 12.2, 15.7))} y={mix(670, 750, progress(t, 12.2, 15.7))} role="child" scale={.48} frame={frame + 13} walking={t > 12.2 && t < 15.7} />
        <g transform="translate(1235 510) scale(.48)"><RoadDefect x={0} y={0} severity={.78} repaired={repaired} /></g>
        <g opacity={during(t, 4, 6.4)}><Cone x={1194} y={536} scale={.4} /><Person x={1220} y={570} role="worker" scale={.55} frame={frame} pose="work" /></g>
        <g transform="translate(1445 468) scale(.48)"><Camera x={0} y={0} cone={false} /></g>
        <g transform="translate(271 417) scale(.45)"><Camera x={0} y={0} cone={false} /></g>
        {/* Shared observation junction; approved public data is not a raw feed. */}
        <g transform="translate(1020 510)">
          <circle r="38" fill={PAPER} stroke={TEAL} strokeWidth="4" />
          <ellipse rx="27" ry="11" fill="none" stroke={TEAL} strokeWidth="3" /><ellipse rx="11" ry="27" fill="none" stroke={TEAL} strokeWidth="3" />
          <circle r="27" fill="none" stroke={TEAL} strokeWidth="3" /><circle r="5" fill={TEAL} />
        </g>
        <MovingPacket route={TO_POLICE} t={t} start={.15} end={1.35} color={AMBER} />
        <MovingPacket route={TO_POLICE} t={t} start={.65} end={1.65} color={AMBER} />
        {t >= 1.4 && <g opacity={progress(t, 1.4, 1.6)}><Check x={642} y={318} scale={.52} /></g>}
        <RoadVehicle route={RESPONSE} fraction={progress(t, 1.65, 3.2)} frame={frame} kind="police" scale={.37} />
        <MovingPacket route={FROM_POLICE} t={t} start={2.8} end={3.95} color={GREEN} />
        <MovingPacket route={TO_WORKS} t={t} start={4} end={4.65} color={AMBER} />
        <g opacity={during(t, 5.7, 6.15, .1)}><path d="M1460 420L1191 499L1280 526Z" fill={GREEN} opacity=".25" /><ellipse cx="1235" cy="510" rx="64" ry="22" fill="none" stroke={GREEN} strokeWidth="3" /></g>
        {t >= 6.15 && <g opacity={progress(t, 6.15, 6.3)}><Check x={1284} y={316} scale={.53} /><Check x={1235} y={510} scale={.38} /></g>}
        <MovingPacket route={FROM_WORKS} t={t} start={6.2} end={7.2} color={GREEN} />
        <MovingPacket route={TO_PLANNER} t={t} start={6.4} end={6.95} color={AMBER} />
        {t >= 7 && <g opacity={progress(t, 7, 7.2)}><Check x={1285} y={538} scale={.53} /></g>}
        <MovingPacket route={FROM_PLANNER} t={t} start={7.05} end={7.7} color={GREEN} />
        <MovingPacket route={TO_CITIZEN} t={t} start={7.8} end={9.05} color={GREEN} />
        <g opacity={progress(t, 8.8, 9.2)}><RouteInk route={TO_CITIZEN} color={GREEN} width={4} dashed /><Check x={589} y={553} scale={.5} /></g>
        <MovingPacket route={CITIZEN_REPORT} t={t} start={9.15} end={10.55} color={AMBER} />
        <MovingPacket route={TO_WORKS} t={t} start={10.6} end={11.25} color={AMBER} />
        <MovingPacket route={FROM_WORKS} t={t} start={11.3} end={12.1} color={TEAL} />
        <g opacity={closing}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const p = onRoad(CITY_LOOP, wrap(i / 8 + (t - 12) * .1)); return <Packet key={i} x={p.x} y={p.y} color={i % 2 ? GREEN : TEAL} />; })}
          {NETWORK_ROUTES.map((route, i) => { const p = onRoad(route, wrap((t - 12) * .3 + i / 4)); return <Packet key={i} x={p.x} y={p.y} color={TEAL} />; })}
        </g>
      </MapWorld>
    </g>
    {t < 12 && <g opacity={1 - progress(t, 11.65, 12)}><Label x={64} y={206} size={27}>{status}</Label></g>}
    {/* One sequential line, not five panels; the city keeps circulating below. */}
    <g opacity={progress(t, 12, 12.2)}>
      <path d="M420 822H1500" stroke={TEAL} strokeWidth="2" opacity=".4" />
      <text x="960" y="854" textAnchor="middle" fontSize="26" fontWeight="800" letterSpacing="3" fill={INK} paintOrder="stroke" stroke={PAPER} strokeWidth="7" strokeLinejoin="round">
        {['DETECT', 'UNDERSTAND', 'ACT', 'VERIFY', 'INFORM'].map((word, i) => <tspan key={word} opacity={progress(t, 12 + i * .75, 12.5 + i * .75)}>{i ? '   ·   ' : ''}{word}</tspan>)}
      </text>
    </g>
    <g opacity={finish} data-state={t >= 16 ? 'complete' : 'resolving'} transform={`translate(0 ${mix(12, 0, finish)})`}>
      <text x="960" y="217" textAnchor="middle" fontSize="58" letterSpacing="12" fontWeight="900" fill={INK} paintOrder="stroke" stroke={PAPER} strokeWidth="9">DRISHTI</text>
      <text x="960" y="260" textAnchor="middle" fontSize="28" fontWeight="700" fill={TEAL} paintOrder="stroke" stroke={PAPER} strokeWidth="8">One city. One connected view.</text>
    </g>
  </SceneWindow>;
}