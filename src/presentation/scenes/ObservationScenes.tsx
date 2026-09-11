import { useId, type ReactNode } from 'react';
import { AMBER, INK, TEAL, Person, Vehicle } from '../art/Actors';
import { Camera, Check, CityMap, Label, Packet, Phone, ScanBox, Street } from '../art/ChennaiWorld';
import { Rain, RoadDefect } from '../art/Atmosphere';
import { clamp, ease, mix, progress } from '../timeline';

type SceneProps = { frame: number; time: number };
type Point = { x: number; y: number };
const RUST = '#ad5848';
const PAPER = '#f4ebd4';

// Stage owns the header and dialogue. Even camera moves cannot spill into them.
function SceneWindow({ children, color = '#dce9de' }: { children: ReactNode; color?: string }) {
  const clip = useId();
  return <g>
    <defs><clipPath id={clip}><rect x="0" y="150" width="1920" height="735" /></clipPath></defs>
    <rect width="1920" height="1080" fill={color} />
    <g clipPath={`url(#${clip})`}>{children}</g>
  </g>;
}

function cameraTransform(zoom: number, x = 960, y = 510) {
  return `translate(960 510) scale(${zoom}) translate(${-x} ${-y})`;
}

function arc(a: Point, control: Point, b: Point, p: number): Point {
  const u = clamp(p); const v = 1 - u;
  return { x: v * v * a.x + 2 * v * u * control.x + u * u * b.x, y: v * v * a.y + 2 * v * u * control.y + u * u * b.y };
}

function IncidentPulse({ x, y, amount }: { x: number; y: number; amount: number }) {
  const p = clamp(amount);
  return <g transform={`translate(${x} ${y})`} opacity={Math.sin(p * Math.PI)} fill="none" stroke={AMBER}>
    <ellipse rx={mix(18, 135, p)} ry={mix(9, 58, p)} strokeWidth="5" />
    {[0, 1, 2, 3, 4, 5].map(i => <path key={i} transform={`rotate(${i * 60})`} d={`M${38 + p * 28} 0h22`} strokeWidth="6" strokeLinecap="round" />)}
  </g>;
}

function RoadSign({ x, y, text }: { x: number; y: number; text: string }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M0 0V106" stroke={INK} strokeWidth="6" />
    <rect x="-14" y="-35" width="230" height="42" rx="4" fill={TEAL} stroke={PAPER} strokeWidth="2" />
    <text x="101" y="-7" textAnchor="middle" fill={PAPER} fontSize="19" fontWeight="700">{text}</text>
  </g>;
}

function SidewalkLife({ frame, time }: SceneProps) {
  return <g>
    <Person x={190 + time * 12} y={587} scale={.57} walking frame={frame} />
    <Person x={1140 - time * 8} y={586} scale={.51} role="child" walking flip frame={frame + 11} />
    <Person x={1200 - time * 8} y={589} scale={.65} walking flip frame={frame + 17} />
    <g transform="translate(65 548)" stroke={INK} strokeWidth="3">
      <path d="M0 25V-34H112V25" fill="#cb9470" />
      <path d="M-10-34l14-38h104l17 38Z" fill="#e3b65e" />
      <path d="M23-70l-5 33m41-33v33m32-33l6 33" stroke={PAPER} strokeWidth="9" />
      <circle cx="20" cy="30" r="10" fill={INK} /><circle cx="96" cy="30" r="10" fill={INK} />
      <circle cx="30" cy="-20" r="10" fill="#749975" /><circle cx="57" cy="-20" r="10" fill="#749975" />
    </g>
  </g>;
}

// These are diegetic monitor images, not full-frame information cards.
function FeedImage({ x, y, width = 112, offline = false, selected = false, car = false, frame = 0, color = RUST }: {
  x: number; y: number; width?: number; offline?: boolean; selected?: boolean; car?: boolean; frame?: number; color?: string;
}) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width={width} height="74" rx="4" fill={offline ? '#30464b' : '#bed0ba'} stroke={selected ? AMBER : '#73918c'} strokeWidth={selected ? 4 : 2} />
    {offline ? <g stroke="#b67a6a" strokeWidth="2">
      {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M8 ${12 + i * 12}h${width - 16}`} opacity=".4" />)}
      <path d={`M${width / 2 - 12} 23l24 28m0-28l-24 28`} strokeWidth="4" />
    </g> : <>
      <path d={`M0 41H${width}v26H0Z`} fill="#6d837d" />
      <path d={`M0 55H${width}`} stroke={PAPER} strokeDasharray="9 8" />
      <path d={`M10 39V14h25v25m14 0V8h28v31`} stroke="#809f8e" strokeWidth="12" fill="none" />
      {car ? <Vehicle x={width * .55} y={58} scale={.27} frame={frame} color={color} /> : <Vehicle x={mix(20, width - 20, (frame % 90) / 90)} y={56} top scale={.13} kind="bus" />}
      {selected && car && <rect x={width * .55 - 26} y="29" width="52" height="35" rx="2" fill="none" stroke={AMBER} strokeWidth="2" />}
    </>}
  </g>;
}

function PoliceDesk({ frame, time, mode = 'search', branch = false }: SceneProps & { mode?: 'search' | 'observation' | 'candidates'; branch?: boolean }) {
  const selected = Math.floor(time * 1.6) % 3;
  return <g transform="translate(1400 305)">
    <path d="M-18 278V-20H420v298" fill="#e2d8bd" fillOpacity=".91" stroke="#8d9d8b" strokeWidth="5" />
    <path d="M-35-22H438l-18-23H-16Z" fill="#49706c" stroke={INK} strokeWidth="3" />
    <rect x="8" y="33" width="386" height="155" rx="9" fill={INK} />
    {mode === 'search' ? <>
      {[0, 1, 2].map(i => <FeedImage key={i} x={22 + i * 120} y={53} selected={selected === i} offline={i === 1} frame={frame + i * 29} />)}
      <path d={`M${35 + selected * 120} 146h85`} stroke={AMBER} strokeWidth="5" />
      <path d="M26 164h210m18 0h105" stroke="#73918c" strokeWidth="4" />
    </> : branch ? <>
      <g transform="translate(63 64) scale(.48)"><Person x={40} y={208} role="citizen" /><Person x={250} y={208} role="citizen" flip />
        <path d="M88 105h73" stroke={AMBER} strokeWidth="5" strokeDasharray="10 10" />
        <text x="125" y="81" textAnchor="middle" fill={PAPER} fontSize="48">?</text>
      </g>
      <path d="M273 68h93m-93 21h77m-77 21h83m-83 21h54" stroke="#a1b9ac" strokeWidth="5" />
      <circle cx="318" cy="159" r="15" stroke={AMBER} fill="none" strokeWidth="3" />
    </> : <>
      <FeedImage x={24} y={53} width={mode === 'candidates' ? 162 : 220} selected car frame={0} />
      {mode === 'candidates' ? time >= 7.1 ? <FeedImage x={208} y={53} width={162} car selected frame={0} color="#af6350" /> : <>
        <rect x="208" y="53" width="162" height="74" rx="4" fill="#34534f" />
        <path d="M236 91h105" stroke="#73918c" strokeWidth="3" strokeDasharray="6 9" />
      </> : <>
        <path d="M265 64h105m-105 23h75m-75 23h95" stroke="#a1b9ac" strokeWidth="5" />
        <path d="M305 132v30m-15-15h30" stroke={AMBER} strokeWidth="3" />
      </>}
      <path d="M26 151h134m25 0h62m22 0h82M26 167h195" stroke="#90aaa0" strokeWidth="4" />
      {mode === 'candidates' && time >= 7.1 && <path d="M186 89h22" stroke={AMBER} strokeWidth="3" strokeDasharray="4 5" />}
    </>}
    <path d="M195 191v25m-43 0h87" stroke={INK} strokeWidth="9" />
    <path d="M0 225H410M25 226v53m354-53v53" stroke="#8d7151" strokeWidth="12" />
    <path d="M85 209h94l14 13H76Z" fill="#70918a" stroke={INK} strokeWidth="2" />
    <Person x={340 - (mode === 'candidates' ? progress(time, 10, 11) * 27 : 0)} y={285} scale={.94} role="police" pose={mode === 'search' ? 'phone' : mode === 'candidates' && time < 10 ? 'idle' : 'point'} flip frame={frame} />
    {mode === 'candidates' && time >= 10 && <g transform={`translate(${mix(83, 242, (Math.sin((time - 10) * 2.5) + 1) / 2)} 97)`}>
      <circle r="23" fill="#d5e9d5" fillOpacity=".2" stroke={PAPER} strokeWidth="4" />
      <path d="M16 17l20 22" stroke={PAPER} strokeWidth="7" />
    </g>}
  </g>;
}

function ObservationSlip({ x, y, scale, defect = false }: Point & { scale: number; defect?: boolean }) {
  return <g transform={`translate(${x} ${y}) rotate(-7) scale(${scale})`}>
    <path d="M-69-48H57l12 12v84H-69Z" fill={PAPER} stroke={TEAL} strokeWidth="4" />
    <rect x="-57" y="-36" width="114" height="61" fill="#718982" />
    {defect ? <g transform="translate(0 0) scale(.35)"><RoadDefect x={0} y={0} /></g> : <Vehicle x={0} y={17} scale={.48} frame={0} color={RUST} />}
    <rect x="-46" y="-29" width="92" height="48" fill="none" stroke={AMBER} strokeWidth="2" />
    <path d="M-54 35h49m13 0h33" stroke={TEAL} strokeWidth="4" />
  </g>;
}

export function OpeningScene({ frame, time }: SceneProps) {
  const t = clamp(time, 0, 4);
  const zoom = progress(t, 2.3, 4);
  const blocked = progress(t, .4, 1.8);
  return <SceneWindow color="#e3e9d7">
    <g transform={cameraTransform(mix(1, 1.7, zoom), mix(960, 1020, zoom), 510)}>
      <CityMap frame={frame} connected={false}>
        <g opacity={1 - progress(t, 2.5, 3.6)}>
          <path d="M470 324Q740 198 995 326M745 623Q1090 555 1438 485" fill="none" stroke="#b97360" strokeWidth="4" strokeDasharray="11 14" opacity=".65" />
          {[{ x: 752, y: 258 }, { x: 1125, y: 553 }].map(p => <g key={p.x} transform={`translate(${p.x} ${p.y})`}>
            <circle r="21" fill="#e3e9d7" /><path d="M-10-10l20 20m0-20l-20 20" stroke="#ac6556" strokeWidth="5" />
          </g>)}
          <Packet x={mix(490, 721, blocked)} y={mix(312, 261, blocked)} color="#ad6654" />
          <Packet x={mix(768, 1090, progress(t, .7, 2))} y={mix(619, 559, progress(t, .7, 2))} color="#ad6654" />
        </g>
        <Camera x={435} y={300} />
        <Camera x={980} y={308} offline />
        <Camera x={690} y={630} />
        <g transform="translate(685 715) scale(.6)"><RoadDefect x={0} y={0} severity={1} /></g>
        <ellipse cx="1100" cy="510" rx="42" ry="20" fill="#9abeb5" />
        <path d="M1068 510h62m-48 7h39" stroke="#c7dfcc" strokeWidth="3" />
        <Vehicle top kind="bus" x={mix(120, 1260, t / 4)} y={286} scale={.46} frame={frame} />
        <Vehicle top kind="bus" x={1039} y={mix(850, 358, t / 4)} angle={-90} scale={.42} frame={frame} />
        <Vehicle top kind="truck" x={mix(1500, 950, t / 4)} y={694} angle={180} scale={.37} frame={frame} />
        {[0, 1, 2, 3, 4, 5].map(i => <Person key={i} x={390 + i * 149 + t * 6} y={i % 2 ? 650 : 445} scale={.23} walking frame={frame + i * 7} />)}
        <g opacity={1 - progress(t, 2.2, 3.1)}>
          <Person x={1450} y={680} scale={.78} pose="phone" frame={frame} />
          <Phone x={1475} y={271} scale={.57}>
            <path d="M32 97H259V416H32Z" fill="#dce1c8" />
            <path d="M40 173H252M40 289H252M101 109V408M212 109V408" stroke="#9caf99" strokeWidth="21" />
            <path d="M101 376V173H230" stroke={TEAL} strokeWidth="9" fill="none" />
            <circle cx="101" cy="376" r="13" fill={TEAL} stroke={PAPER} strokeWidth="5" />
            <circle cx="229" cy="173" r="11" fill={AMBER} />
            <circle cx="65" cy="64" r="15" fill="none" stroke="#aa7960" strokeWidth="4" />
            <path d="M65 52v13l9 5M96 62h127" stroke="#aa7960" strokeWidth="4" fill="none" />
          </Phone>
          <Label x={1455} y={246} size={23}>Map not updated</Label>
        </g>
        <g opacity={1 - progress(t, 2.4, 3.3)}>
          <Label x={370} y={182} size={24}>Isolated CCTV</Label>
          <Label x={550} y={810} size={24}>Road trouble</Label>
        </g>
        <g opacity={progress(t, 2.7, 3.4)}>
          <circle cx="1020" cy="510" r={mix(114, 86, zoom)} fill="none" stroke={AMBER} strokeWidth="3" strokeDasharray="9 12" />
          <path d="M1020 400v24m0 172v24m-110-110h24m172 0h24" stroke={AMBER} strokeWidth="4" />
          <text x="1065" y="424" fontSize="22" fontWeight="700" fill={INK}>ANNA SALAI</text>
        </g>
      </CityMap>
    </g>
  </SceneWindow>;
}

export function CoverageScene({ frame, time }: SceneProps) {
  const t = clamp(time, 0, 10);
  const fleet = t >= 4;
  const busX = mix(-220, 2250, progress(t, 4, 9.5));
  const capture = t >= 5.25 && t < 6.65;
  const delivery = progress(t, 6.45, 7.8);
  const packet = arc({ x: 1010, y: 651 }, { x: 1195, y: 236 }, { x: 1536, y: 401 }, delivery);
  return <SceneWindow>
    <g transform={cameraTransform(mix(1.035, 1, progress(t, 3.5, 6)), mix(970, 960, progress(t, 3.5, 6)))}>
      <Street frame={frame} pan={mix(0, 38, progress(t, 4, 10))} location="Anna Salai">
        <SidewalkLife frame={frame} time={t} />
        <RoadSign x={775} y={476} text="ANNA SALAI JUNCTION" />
        <path d="M271 434L656 697L430 718Z" fill={AMBER} opacity=".12" />
        <path d="M271 434L656 697M271 434L430 718" fill="none" stroke={AMBER} strokeWidth="2" strokeDasharray="8 10" opacity=".55" />
        <Camera x={242} y={534} cone={false} />
        <Camera x={1190} y={517} cone={false} offline={t >= 1.15} />
        {t < 1.15 && <path d="M1219 419L1340 627L1280 657Z" fill={AMBER} opacity=".16" />}
        <PoliceDesk frame={frame} time={t} mode={t >= 7.8 ? 'observation' : 'search'} />
        <Vehicle x={mix(650, 954, progress(t, 0, 1.45))} y={716} scale={.86} color={RUST} frame={t < 1.45 ? frame : 0} />
        <Vehicle kind="auto" x={mix(1170, 1104, progress(t, 0, 1.45))} y={719} scale={.78} angle={-3} frame={t < 1.45 ? frame : 0} />
        <IncidentPulse x={1033} y={687} amount={(t - 1.1) / 1.25} />
        <Person x={1250} y={701} scale={.69} pose="phone" frame={frame} />
        {!fleet && <Vehicle kind="bus" x={mix(170, 490, t / 4)} y={842} scale={.96} frame={frame} />}
        {fleet && <>
          {capture && <>
            <path d={`M${busX + 111} 714L913 612L1165 731Z`} fill={TEAL} opacity=".1" />
            <path d={`M${busX + 111} 714L1038 666`} stroke={TEAL} strokeWidth="3" strokeDasharray="7 10" />
            <ScanBox x={880} y={611} width={291} height={126} frame={frame} />
            <circle cx={busX + 111} cy={714} r={8 + 5 * Math.sin(t * 15) ** 2} fill={PAPER} stroke={TEAL} strokeWidth="3" />
          </>}
          <Vehicle kind="bus" x={busX} y={842} scale={1.08} frame={frame} />
          {t >= 6.45 && t < 7.8 && <>
            <path d="M1010 651Q1195 236 1536 401" fill="none" stroke={TEAL} strokeWidth="3" strokeDasharray="7 11" opacity=".5" />
            <ObservationSlip {...packet} scale={mix(.65, .48, delivery)} />
          </>}
          {t >= 7.8 && <g>
            <path d="M954 749v21m-8-6l8 8l8-8" fill="none" stroke={AMBER} strokeWidth="3" />
            <circle cx="954" cy="747" r="6" fill={AMBER} />
          </g>}
        </>}
      </Street>
    </g>
    <Label x={76} y={192} size={29}>{!fleet ? 'An incident beyond the lens' : t < 6.45 ? 'A passing fleet camera observes' : 'A capture—not permanent coverage'}</Label>
    <Label x={76} y={231} size={23}>{!fleet ? 'Fixed views leave gaps' : t < 5.25 ? 'Entering an uncovered road' : '13.061°N · 80.254°E · 08:42 (illustrative)'}</Label>
    {t >= 1.15 && <Label x={1398} y={260} size={24}>{t < 4 ? 'Offline · manual feed search' : t < 7.8 ? 'Capture → review' : 'Reviewable observation'}</Label>}
  </SceneWindow>;
}

function SightingPin({ x, y, letter }: Point & { letter: 'A' | 'B' }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M0 4v44m-9 0h18" stroke={AMBER} strokeWidth="3" strokeDasharray="5 5" />
    <circle r="19" fill={PAPER} stroke={AMBER} strokeWidth="3" />
    <text y="7" textAnchor="middle" fontSize="22" fontWeight="700" fill={INK}>{letter}</text>
  </g>;
}

export function InvestigationScene({ frame, time }: SceneProps) {
  const t = clamp(time, 0, 13);
  const candidates = t >= 4;
  const second = t >= 7.1;
  const branch = t >= 8.65 && t < 10;
  const reviewing = t >= 10;
  const leavingX = mix(960, 2190, progress(t, .6, 3.7));
  const candidateX = second ? mix(400, 2040, progress(t, 7.1, 10.4)) : mix(325, 1470, progress(t, 4, 7.1));
  const candidateVisible = candidates && t < 10.4;
  const capture = (t >= 4.65 && t < 5.65) || (t >= 7.7 && t < 8.6);
  return <SceneWindow color="#cadad2">
    <g transform={cameraTransform(mix(1, 1.025, progress(t, 10, 13)), mix(960, 978, progress(t, 10, 13)))}>
      <Street frame={frame} pan={mix(0, 66, progress(t, 1, 9))} location="Anna Salai" dusk>
        <SidewalkLife frame={frame} time={t} />
        <RoadSign x={755} y={474} text="ANNA SALAI" />
        <Camera x={330} y={527} cone={false} />
        <Camera x={1230} y={521} cone={false} offline />
        <PoliceDesk frame={frame} time={t} mode={candidates ? 'candidates' : 'search'} branch={branch} />
        <Vehicle x={1157} y={708} color="#ddd3b7" scale={.74} frame={0} />
        <Person x={1260} y={700} scale={.66} pose="phone" frame={frame} />
        {!candidates && <>
          {/* The exact same fictional rust sedan is present at impact and departure. */}
          <Vehicle x={leavingX} y={718} color={RUST} scale={.91} frame={frame} />
          <IncidentPulse x={1052} y={675} amount={t / 1.2} />
          <path d={`M${leavingX - 135} 686h-55m42 17h-73`} stroke={PAPER} strokeWidth="3" opacity={progress(t, .8, 1.4) * (1 - progress(t, 3, 3.6))} />
        </>}
        <Vehicle kind="bus" x={mix(-260, 2220, progress(t, 3.7, 8.7))} y={846} scale={1.06} frame={frame} />
        {candidateVisible && <Vehicle x={candidateX} y={716} color={second ? '#af6350' : RUST} scale={.91} frame={frame} />}
        {capture && <ScanBox x={candidateX - 87} y={609} width={174} height={118} frame={frame} />}
        {candidates && <>
          {/* Dashed hypotheses are deliberately never promoted to a solid route. */}
          <path d="M1014 676Q810 446 595 598" pathLength={1} fill="none" stroke={AMBER} strokeWidth="4" strokeDasharray=".025 .024" strokeDashoffset={-t * .045} opacity={progress(t, 4.4, 5.4)} />
          <SightingPin x={595} y={598} letter="A" />
          <g opacity={progress(t, 5.65, 6.15)}>
            <Vehicle x={595} y={681} top color={RUST} scale={.34} frame={0} />
            <path d="M559 653h-9v49h9m72-49h9v49h-9" fill="none" stroke={AMBER} strokeWidth="3" />
          </g>
          {second && <>
            <path d="M616 598Q889 404 1067 582" fill="none" stroke={AMBER} strokeWidth="4" strokeDasharray="10 12" strokeDashoffset={-t * 14} opacity={progress(t, 7.1, 8.3)} />
            <SightingPin x={1067} y={582} letter="B" />
            <g opacity={progress(t, 8.6, 9.1)}>
              <Vehicle x={1067} y={663} top color="#af6350" scale={.34} frame={0} />
              <path d="M1031 635h-9v49h9m72-49h9v49h-9" fill="none" stroke={AMBER} strokeWidth="3" />
            </g>
          </>}
          {t >= 5.45 && t < 6.25 && <Packet {...arc({ x: 595, y: 598 }, { x: 1020, y: 230 }, { x: 1514, y: 398 }, progress(t, 5.45, 6.25))} color={AMBER} />}
          {t >= 8.3 && t < 9 && <Packet {...arc({ x: 1067, y: 582 }, { x: 1330, y: 230 }, { x: 1686, y: 398 }, progress(t, 8.3, 9))} color={AMBER} />}
        </>}
        {t >= 9.4 && <Vehicle kind="auto" x={mix(-130, 1130, progress(t, 9.4, 13))} y={845} scale={.89} frame={frame} />}
      </Street>
    </g>
    <Label x={76} y={192} size={29}>{candidates ? 'Possible match—not confirmed' : 'A fictional collision. The car leaves.'}</Label>
    <Label x={76} y={232} size={23}>{!candidates ? 'Anna Salai · manual feed search' : second ? 'B · similar rust sedan · Nandanam · 08:47 (illustrative)' : 'A · rust sedan · Teynampet · 08:44 (illustrative)'}</Label>
    <Label x={reviewing || branch ? 1280 : 76} y={reviewing || branch ? 260 : 272} size={branch ? 21 : 23}>
      {!candidates ? 'No connected trail' : branch ? 'Missing-person candidate · review only' : reviewing ? 'Officer reviewing · identity unconfirmed' : 'Human review required'}
    </Label>
  </SceneWindow>;
}

function Cone({ x, y, opacity = 1 }: Point & { opacity?: number }) {
  return <g transform={`translate(${x} ${y})`} opacity={opacity} stroke={INK} strokeWidth="2">
    <ellipse cy="4" rx="24" ry="6" fill={INK} opacity=".16" stroke="none" />
    <path d="M-21 0L-7-48H7L21 0Z" fill="#d68a49" />
    <path d="M-15-16H15M-11-32H11" stroke={PAPER} strokeWidth="8" />
    <path d="M-28 1H28" stroke={INK} strokeWidth="6" />
  </g>;
}

function RepairCrew({ frame, time }: SceneProps) {
  const arrived = progress(time, 6.25, 7.2);
  const leaving = progress(time, 9, 9.75);
  const x = mix(1350, 1012, arrived) + leaving * 348;
  const working = time >= 7.2 && time < 9;
  const stroke = Math.sin(frame / 4);
  const rollerX = mix(908, 1044, progress(time, 7.55, 8.85));
  const otherX = working ? rollerX - 75 : time >= 9 ? mix(969, 1378, leaving) : mix(1430, 833, arrived);
  return <g opacity={1 - progress(time, 9.65, 9.9)}>
    <Person x={x} y={795} scale={.83} role="worker" walking={!working} pose={working ? 'work' : 'idle'} flip frame={frame} />
    <Person x={otherX} y={844} scale={.91} role="worker" walking={!working} pose={working ? 'work' : 'idle'} frame={frame + 13} />
    {working && <>
      <g transform={`translate(${x - 38} ${760 + stroke * 6}) rotate(${stroke * 9})`}>
        <path d="M0-48L-37 38" stroke="#bd9d67" strokeWidth="7" />
        <path d="M-47 30l26 10l-13 21q-20 0-27-14Z" fill="#526c66" stroke={INK} strokeWidth="3" />
        {time < 8.25 && [0, 1, 2, 3, 4].map(i => <circle key={i} cx={-40 - i * 8} cy={48 + ((frame + i * 7) % 21)} r={3 + i % 2} fill="#354f4c" />)}
      </g>
      <g transform={`translate(${rollerX} 817)`} stroke={INK} strokeWidth="3">
        <path d="M-16-13L-47-70h-20" fill="none" strokeWidth="7" />
        <rect x="-28" y="-32" width="62" height="25" rx="5" fill={AMBER} />
        <ellipse cy="-6" rx="35" ry="17" fill="#385650" />
        <ellipse cx="28" cy="-6" rx="10" ry="17" fill="#8ba095" />
        <path d={`M28-17v22`} transform={`rotate(${frame * 12} 28 -6)`} stroke="#d5dac0" />
        <path d="M-38 15h88" stroke="#cad1b5" opacity=".5" />
      </g>
    </>}
  </g>;
}

function ComparisonStand({ frame, time }: SceneProps) {
  const checking = time >= 10.95;
  const verified = time >= 11.5;
  return <g transform="translate(1430 309)">
    <path d="M25 25V266m325-241v241" stroke="#647e72" strokeWidth="7" />
    <rect x="-15" y="6" width="395" height="197" rx="7" fill={PAPER} stroke={INK} strokeWidth="4" />
    {checking ? <>
      <rect x="0" y="23" width="171" height="126" fill="#6e8580" />
      <rect x="191" y="23" width="171" height="126" fill="#6e8580" />
      <g transform="translate(84 94) scale(.57)"><RoadDefect x={0} y={0} /></g>
      <g transform="translate(276 94) scale(.57)"><RoadDefect x={0} y={0} repaired={1} /><path d="M-120-26L90-30L122 29L-106 28Z" fill="#506b65" /></g>
      <path d="M178 60l8 8l-8 8" fill="none" stroke={TEAL} strokeWidth="3" />
      <path d={`M${199 + ((frame * 2) % 150)} 31v109`} stroke={TEAL} strokeWidth="3" opacity={verified ? 0 : .65} />
      <path d="M12 169h125m62 0h125" stroke="#74958a" strokeWidth="4" />
      {verified && <Check x={341} y={170} scale={.63} />}
    </> : <>
      <path d="M10 37h342v146H10Z" fill="#d8deca" />
      <path d="M15 105H345" stroke="#80978a" strokeWidth="48" />
      <path d="M15 105H345" stroke={PAPER} strokeWidth="3" strokeDasharray="15 15" />
      {time >= 5.6 && <>
        <circle cx="171" cy="105" r="14" fill={AMBER} stroke={INK} strokeWidth="2" />
        <path d="M171 91V64m-8 6l8-9l8 9" stroke={INK} strokeWidth="3" fill="none" />
        <Vehicle kind="truck" x={mix(310, 225, progress(time, 5.8, 6.6))} y={115} top scale={.3} frame={frame} />
      </>}
    </>}
    <Person x={295} y={282} scale={.95} role="municipal" pose={verified ? 'point' : 'phone'} flip frame={frame} />
  </g>;
}

export function MaintenanceScene({ frame, time }: SceneProps) {
  const repairClip = useId();
  const t = clamp(time, 0, 13);
  const damage = progress(t, .05, 2.3);
  const repair = progress(t, 7.2, 8.9);
  const repaired = t >= 9;
  const verified = t >= 11.5;
  const water = progress(t, 1.1, 2.8) * (1 - progress(t, 6.25, 7.2));
  const rain = progress(t, .6, 1.5) * (1 - progress(t, 3.5, 5.8));
  const busX = mix(-200, 2290, progress(t, 4, 6.7));
  const returnBusX = mix(-270, 2220, progress(t, 9.65, 11.7));
  const carX = mix(100, 665, progress(t, 0, 2.8)) + mix(0, 1550, progress(t, 3.9, 4.8));
  const truckX = mix(2220, 1320, progress(t, 5.8, 6.7)) + mix(0, 940, progress(t, 10, 11.5));
  const coneOpacity = progress(t, 6.1, 6.6) * (1 - progress(t, 9.3, 9.65));
  const capture = t >= 4.75 && t < 5.65;
  const marking = progress(t, 11.75, 12.8);
  return <SceneWindow>
    <defs><clipPath id={repairClip}><rect x="838" y="762" width={253 * repair} height="73" /></clipPath></defs>
    <g transform={cameraTransform(mix(1.02, 1, progress(t, 4, 7)))}>
      <Street frame={frame} pan={mix(0, 30, progress(t, 4, 8))} location="Anna Salai" dusk={t < 5.8}>
        <SidewalkLife frame={frame} time={t} />
        <RoadSign x={752} y={475} text="ANNA SALAI · SCHOOL" />
        <ComparisonStand frame={frame} time={t} />
        <Person x={1288} y={584} scale={.8} pose={t >= 2.7 ? 'phone' : 'idle'} frame={frame} />
        {t >= 2.7 && t < 4.5 && <g opacity={progress(t, 2.7, 3.2) * (1 - progress(t, 4, 4.5))}>
          <Phone x={1140} y={282} scale={.43}>
            <rect x="29" y="76" width="235" height="206" rx="5" fill="#7d9488" />
            <g transform="translate(146 204) scale(.78)"><RoadDefect x={0} y={0} /></g>
            <path d="M43 312h179m-179 25h136" stroke="#90a38e" strokeWidth="9" />
            <circle cx="146" cy="408" r="32" fill={TEAL} />
            <path d="M126 417l40-19l-14 36l-7-18Z" fill={PAPER} />
          </Phone>
        </g>}
        <g opacity={water}>
          <path d="M796 791Q830 744 958 760Q1030 737 1135 781Q1193 823 1080 850Q970 865 854 840Q780 828 796 791Z" fill="#8db6b1" opacity=".75" />
          {[0, 1, 2, 3, 4].map(i => <ellipse key={i} cx={830 + i * 60} cy={779 + i % 2 * 45} rx={10 + ((frame + i * 9) % 25)} ry={3 + ((frame + i * 9) % 25) / 5} fill="none" stroke="#c5ded0" strokeWidth="2" opacity={1 - ((frame + i * 9) % 25) / 25} />)}
        </g>
        <g opacity={progress(t, 0, .8)}>
          <RoadDefect x={962} y={797} severity={mix(.15, 1.12, damage)} repaired={repair} />
          <path d="M843 771L1061 768L1086 825L850 827Z" fill="#506b65" clipPath={`url(#${repairClip})`} />
          {[0, 1, 2, 3].map(i => <path key={i} d={`M${855 + i * 53} 774l10 46`} stroke="#6f8578" strokeWidth="3" opacity={repair * .5} />)}
        </g>
        {t >= 11.75 && <g fill={PAPER}>
          {Array.from({ length: 8 }, (_, i) => <rect key={i} x="936" y={626 + i * 31} width={104 * ease(clamp(marking * 1.8 - i * .1))} height="15" rx="1" />)}
        </g>}
        {t < 4.8 && <>
          <Vehicle x={carX} y={850} scale={.95} color="#d8be83" frame={t < 2.8 || t > 3.9 ? frame : 0} />
          <g opacity={progress(t, 1.7, 2.3) * (1 - progress(t, 3.6, 4.1))} stroke={PAPER} strokeWidth="3" fill="none">
            <path d={`M${carX - 72} 839h-85m85 7h-95M${carX + 76} 753l18-12m-14 23h24`} />
            <circle cx={carX - 73} cy="805" r="5" fill="#c67254" stroke="none" />
          </g>
        </>}
        {t >= 4 && t < 6.7 && <>
          {capture && <>
            <path d={`M${busX + 100} 582L852 761L1088 829Z`} fill={TEAL} opacity=".12" />
            <ScanBox x={829} y={748} width={282} height={99} frame={frame} />
          </>}
          <Vehicle kind="bus" x={busX} y={708} scale={1.05} frame={frame} />
        </>}
        {t >= 5.55 && t < 6.3 && <ObservationSlip {...arc({ x: 966, y: 773 }, { x: 1150, y: 223 }, { x: 1588, y: 407 }, progress(t, 5.55, 6.3))} scale={.66} defect />}
        {t >= 5.8 && <Vehicle kind="truck" x={truckX} y={845} scale={1.04} frame={t < 6.7 || t >= 10 ? frame : 0} />}
        {t >= 6.1 && t < 9.65 && <>
          <Cone x={762} y={855} opacity={coneOpacity} /><Cone x={1159} y={855} opacity={coneOpacity} />
          <Cone x={797} y={757} opacity={coneOpacity} /><Cone x={1133} y={753} opacity={coneOpacity} />
        </>}
        {t >= 6.25 && t < 9.9 && <RepairCrew frame={frame} time={t} />}
        {t >= 9.65 && <Vehicle kind="bus" x={returnBusX} y={853} scale={1.05} frame={frame} />}
        {t >= 10.25 && t < 10.75 && <>
          <path d={`M${returnBusX + 114} 725L861 770L1083 825Z`} fill={TEAL} opacity=".09" />
          <ScanBox x={837} y={755} width={271} height={92} frame={frame} color={TEAL} />
        </>}
        {t >= 10.45 && t < 10.95 && <Packet {...arc({ x: 966, y: 785 }, { x: 1220, y: 242 }, { x: 1692, y: 403 }, progress(t, 10.45, 10.95))} />}
        {verified && <Person x={mix(1233, 1157, progress(t, 11.5, 12.65))} y={592} scale={.72} walking={t < 12.65} role="citizen" frame={frame} />}
        <Rain frame={frame} opacity={rain * .55} />
      </Street>
    </g>
    <Label x={76} y={192} size={29}>{t < 4 ? 'Damage grows before the complaint' : t < 5.8 ? 'Fleet records the defect' : t < 7.2 ? 'High severity · crew assigned' : !repaired ? 'Repair in progress' : t < 10.95 ? 'Fleet returns after repair' : !verified ? 'AI before / after check' : 'Official verification'}</Label>
    <Label x={76} y={232} size={23}>{t < 2.7 ? 'Cracks → pothole → standing water' : t < 4 ? 'Braking. Waterlogging. A citizen reports.' : t < 5.8 ? 'Anna Salai · 08:51 (illustrative)' : !repaired ? 'Detection-driven maintenance' : !verified ? 'Repair complete · verification pending' : 'Verified after repair'}</Label>
    {t >= 10.95 && <Label x={1430} y={271} size={23}>{verified ? 'Official confirms closure' : 'Before / after comparison'}</Label>}
  </SceneWindow>;
}