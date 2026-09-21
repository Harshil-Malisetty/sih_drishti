import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Camera, Satellite, RadioTower, ShieldCheck, LockKeyhole, Layers,
  Fingerprint, Combine, RefreshCw, ClipboardCheck, UserRoundCheck,
  Wrench, BadgeCheck, CircleCheck, MapPin, HardDrive, Cpu, Activity,
  ScanText, ChartNoAxesCombined, Router, KeyRound,
} from 'lucide-react';

export const dimensions = { width: 2560, height: 1760 };
const colors = {
  ink: '#203332', muted: '#60716D', line: '#425F58', edge: '#267B57',
  blue: '#316F9C', capture: '#AB603F', gold: '#956821',
};
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (left, top, value, size = 20, color = colors.ink, weight = 400, anchor = 'start') =>
  `<text x="${left}" y="${top}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${escape(value)}</text>`;
const icon = (Icon, left, top, size = 40, color = colors.ink) =>
  `<g transform="translate(${left} ${top})">${renderToStaticMarkup(React.createElement(Icon, { size, color, strokeWidth: 1.6 }))}</g>`;
const arrow = (route, dashed = false) =>
  `<path data-flow="true" d="${route}" fill="none" stroke="${colors.line}" stroke-width="${dashed ? 2.5 : 4}" stroke-linejoin="round" stroke-linecap="round" ${dashed ? 'stroke-dasharray="8 8"' : ''} marker-end="url(#${dashed ? 'arrow-soft' : 'arrow'})"/>`;
const line = route => `<path d="${route}" fill="none" stroke="${colors.line}" stroke-width="3" stroke-linejoin="round"/>`;

function segment(left, top, width, height, number, title, color, fill) {
  return `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}"/>
    <path d="M${left} ${top} H${left + width}" stroke="${color}" stroke-width="5"/>
    <circle cx="${left + 34}" cy="${top + 44}" r="19" fill="${color}"/>
    ${text(left + 34, top + 51, number, 20, '#FFFFFF', 700, 'middle')}
    ${text(left + 67, top + 53, title, 28, colors.ink, 700)}`;
}

function road(left, top, scale = 1, detection = false) {
  return `<g transform="translate(${left} ${top}) scale(${scale})">
    <rect width="336" height="174" rx="4" fill="#DBE9E7"/>
    <path d="M0 66 H336 V174 H0Z" fill="#C4D3C6"/>
    <path d="M89 53 H247 L336 174 H0Z" fill="#7B8986"/>
    <path d="M105 56 L30 174 M231 56 L306 174" stroke="#E7EEE6" stroke-width="3"/>
    <path d="M168 59 V78 M168 94 V117 M168 138 V174" stroke="#F7F4D9" stroke-width="4"/>
    <path d="M0 26 H50 V61 H0 M267 16 H311 V61 H267 M58 37 H84 V60 H58" fill="#ADC1BC"/>
    <rect x="18" y="37" width="12" height="10" fill="#EAF1EC"/>
    <rect x="283" y="30" width="14" height="11" fill="#EAF1EC"/>
    <path d="M195 83 L203 70 H239 L247 83 V112 H195Z" fill="#F3E7CC" stroke="#5B6D67" stroke-width="2"/>
    <path d="M207 74 H234 L239 86 H202Z" fill="#819F9C"/>
    <rect x="201" y="106" width="11" height="9" rx="2" fill="#42564F"/>
    <rect x="231" y="106" width="11" height="9" rx="2" fill="#42564F"/>
    <rect x="211" y="99" width="20" height="5" fill="#FFFFFF"/>
    <path d="M91 124 Q118 116 132 129 L146 140 Q115 154 82 140Z" fill="#4C5A55"/>
    <path d="M95 131 Q113 124 132 137" fill="none" stroke="#AAB5AA" stroke-width="3"/>
    ${detection ? '<rect x="73" y="114" width="83" height="44" rx="2" fill="none" stroke="#CEEF71" stroke-width="3"/><rect x="189" y="64" width="64" height="57" rx="2" fill="none" stroke="#A2E5FA" stroke-width="3"/><path d="M74 108 H120 M190 58 H221" stroke="#267B57" stroke-width="6"/>' : ''}
  </g>`;
}

function bus() {
  return `<g transform="translate(78 365)">
    <path d="M14 53 Q14 35 34 35 H251 Q276 35 281 56 L288 123 H10Z" fill="#FFFFFF" stroke="#415E57" stroke-width="3"/>
    <path d="M18 91 H282 V120 H18Z" fill="#389172"/>
    <rect x="28" y="46" width="34" height="36" rx="3" fill="#B5D9D5"/>
    <rect x="70" y="46" width="34" height="36" rx="3" fill="#B5D9D5"/>
    <rect x="112" y="46" width="34" height="36" rx="3" fill="#B5D9D5"/>
    <rect x="154" y="46" width="34" height="36" rx="3" fill="#B5D9D5"/>
    <rect x="196" y="46" width="30" height="66" rx="2" fill="#B5D9D5" stroke="#415E57" stroke-width="2"/>
    <path d="M237 46 H255 Q267 46 269 59 L272 83 H237Z" fill="#A2C4C2"/>
    <circle cx="66" cy="123" r="20" fill="#354B43"/><circle cx="66" cy="123" r="9" fill="#DCE7DD"/>
    <circle cx="244" cy="123" r="20" fill="#354B43"/><circle cx="244" cy="123" r="9" fill="#DCE7DD"/>
    <path d="M0 150 H300" stroke="#C6C5B9" stroke-width="2"/>
    <circle cx="29" cy="33" r="7" fill="#AB603F"/><circle cx="259" cy="33" r="7" fill="#AB603F"/>
    <path d="M30 20 L9 -2 H51Z M259 20 L238 -2 H280Z" fill="#E5C8B7"/>
    <rect x="139" y="22" width="18" height="10" rx="3" fill="#415E57"/>
  </g>`;
}

function board() {
  return `<g transform="translate(448 292)">
    <rect width="168" height="86" rx="5" fill="#2D7959" stroke="#1F5943" stroke-width="2"/>
    <path d="M15 20 H52 V35 M15 68 H50 V52 M118 17 V31 H147 M118 66 V54 H147" fill="none" stroke="#9DC594" stroke-width="3"/>
    <rect x="62" y="18" width="47" height="48" rx="3" fill="#283C33"/>
    ${icon(Cpu, 70, 25, 32, '#DAEBC4')}
    <rect x="-5" y="28" width="19" height="30" fill="#D3DACD"/><rect x="146" y="31" width="26" height="27" fill="#D3DACD"/>
    <path d="M60 73 H112" stroke="#D8C683" stroke-width="9"/>
    <circle cx="10" cy="10" r="3" fill="#D8C683"/><circle cx="157" cy="76" r="3" fill="#D8C683"/>
  </g>`;
}

function tile(left, top, number, title, caption, visual) {
  return `${visual}<circle cx="${left + 15}" cy="${top + 207}" r="14" fill="#D8E9D6"/>
    ${text(left + 15, top + 213, number, 17, colors.edge, 700, 'middle')}
    ${text(left + 39, top + 215, title, 24, colors.ink, 700)}
    ${text(left, top + 249, caption, 18, colors.muted)}`;
}

function tracking() {
  return `<g transform="translate(1248 406)">
    <rect width="336" height="174" rx="4" fill="#F8FBF5" stroke="#CCDCCD"/>
    ${road(13, 19, 0.29, true)}${road(119, 19, 0.29, true)}${road(225, 19, 0.29, true)}
    <path d="M46 71 L150 85 L257 99" fill="none" stroke="#27744E" stroke-width="2.5" stroke-dasharray="5 5"/>
    <circle cx="46" cy="71" r="6" fill="#27744E"/><circle cx="150" cy="85" r="6" fill="#27744E"/><circle cx="257" cy="99" r="6" fill="#27744E"/>
    <path d="M46 100 V126 H168 M257 116 V126 H168 V137" fill="none" stroke="#8EAF8D" stroke-width="2"/>
    ${icon(BadgeCheck, 154, 139, 24, colors.edge)}
    ${text(18, 158, 'Same object', 15, colors.muted)}
    ${text(316, 158, 'One candidate', 15, colors.edge, 700, 'end')}
  </g>`;
}

function location() {
  return `<svg x="448" y="810" width="336" height="174" viewBox="0 0 336 174" overflow="hidden">
    <rect width="336" height="174" rx="4" fill="#DCE9D7"/>
    <path d="M-8 119 L344 53 M94 -8 L161 182 M239 -8 L293 180" stroke="#FFFFFF" stroke-width="23"/>
    <path d="M-8 119 L344 53 M94 -8 L161 182" stroke="#C3CFC0" stroke-width="1.5" stroke-dasharray="7 7"/>
    <path d="M81 112 L232 58 L247 104Z" fill="#90BCC0" fill-opacity="0.55"/>
    <ellipse cx="229" cy="82" rx="35" ry="23" fill="none" stroke="#A86739" stroke-width="2" stroke-dasharray="5 4"/>
    <path d="M81 112 L229 82" stroke="#3D7884" stroke-width="2"/>
    <rect x="65" y="99" width="29" height="16" rx="3" fill="#267B57" transform="rotate(-12 80 108)"/>
    ${icon(MapPin, 216, 57, 27, '#A86739')}
    ${text(16, 155, 'Sensor fusion', 16, colors.muted)}
    ${text(320, 155, 'Location + uncertainty', 16, colors.capture, 700, 'end')}
  </svg>`;
}

function privacy() {
  const pixels = Array.from({ length: 24 }, (_, index) => {
    const palette = ['#B9C7C1', '#778E84', '#D8DCD0', '#96A99B'];
    return `<rect x="${19 + index % 6 * 7}" y="${24 + Math.floor(index / 6) * 7}" width="7" height="7" fill="${palette[index % 4]}"/>`;
  }).join('');
  return `<g transform="translate(848 810)">
    ${road(0, 0)}
    <rect x="15" y="20" width="52" height="65" rx="4" fill="#EAF0E7"/>
    <path d="M20 78 Q24 51 41 51 Q59 51 64 78" fill="#8CABA0"/>
    ${pixels}
    <rect x="208" y="97" width="27" height="9" fill="#273A32"/>
    <path d="M213 98 V105 M222 98 V105 M231 98 V105" stroke="#9CADA2" stroke-width="3"/>
    <circle cx="291" cy="39" r="25" fill="#F4F9F0"/>
    ${icon(ShieldCheck, 274, 22, 34, colors.edge)}
  </g>`;
}

function buffer() {
  return `<g transform="translate(1248 810)">
    <rect width="336" height="174" rx="4" fill="#F8FBF5" stroke="#CCDCCD"/>
    <rect x="25" y="31" width="74" height="94" rx="3" fill="#D9E5D4" stroke="#87A481"/>
    <rect x="38" y="41" width="74" height="94" rx="3" fill="#E8F0DF" stroke="#87A481"/>
    <rect x="51" y="51" width="74" height="94" rx="3" fill="#FFFFFF" stroke="#87A481"/>
    <path d="M65 72 H110 M65 85 H103 M65 98 H110" stroke="#8AA283" stroke-width="3"/>
    <circle cx="69" cy="121" r="5" fill="#5D9670"/>
    ${arrow('M136 96 H191')}
    ${icon(HardDrive, 206, 57, 82, colors.edge)}
    ${icon(LockKeyhole, 269, 43, 27, colors.edge)}
    ${text(30, 163, 'ID / time / provenance', 15, colors.muted)}
    ${text(314, 163, 'Encrypted SSD', 15, colors.edge, 700, 'end')}
  </g>`;
}

function cloudNode(top, title, caption, Icon) {
  return `<g data-node="${escape(title)}"><rect x="2064" y="${top}" width="416" height="104" rx="5" fill="#FFFFFF" stroke="#C6D7E3" stroke-width="1.5"/>
    ${icon(Icon, 2084, top + 24, 32, colors.blue)}
    ${text(2130, top + 43, title, 24, colors.ink, 700)}
    ${text(2084, top + 80, caption, 19, colors.muted)}</g>`;
}

function storage() {
  return `<g transform="translate(2080 822)">
    <path d="M24 21 V97 C24 124 160 124 160 97 V21" fill="#D8E8F2" stroke="#507F9D" stroke-width="2.5"/>
    <ellipse cx="92" cy="21" rx="68" ry="19" fill="#F6FAFC" stroke="#507F9D" stroke-width="2.5"/>
    <path d="M24 53 C24 80 160 80 160 53 M24 78 C24 105 160 105 160 78" fill="none" stroke="#507F9D" stroke-width="2"/>
    <rect x="241" y="17" width="102" height="88" rx="4" fill="#DBE9F3" stroke="#507F9D" stroke-width="2"/>
    <rect x="255" y="30" width="102" height="88" rx="4" fill="#FFFFFF" stroke="#507F9D" stroke-width="2"/>
    <circle cx="278" cy="52" r="8" fill="#D5B971"/>
    <path d="M266 101 L292 73 L310 88 L327 68 L347 101Z" fill="#88AE9B"/>
    ${icon(LockKeyhole, 340, 8, 24, colors.blue)}
    ${text(92, 153, 'Postgres + PostGIS', 21, colors.ink, 700, 'middle')}
    ${text(300, 153, 'Evidence objects', 22, colors.ink, 700, 'middle')}
  </g>`;
}

function phone() {
  return `<g transform="translate(2188 1289)">
    <rect width="91" height="151" rx="11" fill="#FFFFFF" stroke="#47766A" stroke-width="3"/>
    <rect x="8" y="18" width="75" height="111" rx="3" fill="#DDEBCC"/>
    <path d="M8 65 H83 M8 104 L83 48 M37 18 V129" stroke="#FFFFFF" stroke-width="9"/>
    <path d="M22 109 L65 76 V48" fill="none" stroke="#347C64" stroke-width="4"/>
    <circle cx="22" cy="109" r="5" fill="#347C64"/>
    ${icon(MapPin, 53, 27, 25, '#AB603F')}
    <path d="M32 9 H59 M36 140 H55" stroke="#9CAFA5" stroke-width="3" stroke-linecap="round"/>
    <circle cx="95" cy="108" r="21" fill="#F3F8EE"/>
    ${icon(ShieldCheck, 79, 92, 32, colors.edge)}
  </g>`;
}

export function makeArtwork(regularFont, boldFont) {
  const pieces = [`<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1760" viewBox="0 0 2560 1760" role="img" aria-labelledby="title description">
    <title id="title">Drishti: target end-to-end workflow</title>
    <desc id="description">Five segmented stages: bus sensors, detailed Jetson edge AI, reliable cellular delivery, authenticated cloud processing and human operations. Six edge steps: synchronization, detection, tracking and consensus, geolocation, privacy masking, and encrypted persistent buffering. Human review gates assignment and public conditions. Failed resolution verification returns to field work. OCR, LoRa alerts and historical analytics are conditional extensions.</desc>
    <defs><style>
      @font-face{font-family:Diagram;font-weight:400;src:url(data:font/woff2;base64,${regularFont}) format('woff2')}
      @font-face{font-family:Diagram;font-weight:700;src:url(data:font/woff2;base64,${boldFont}) format('woff2')}
      text{font-family:Diagram,sans-serif;letter-spacing:0}
    </style>
    <marker id="arrow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L11 6 L1 11Z" fill="${colors.line}"/></marker>
    <marker id="arrow-soft" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="10" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L11 6 L1 11" fill="none" stroke="${colors.line}" stroke-width="2"/></marker>
    </defs><rect width="2560" height="1760" fill="#FFFFFF"/>
    ${text(48, 99, 'DRISHTI', 64, colors.ink, 700)}
    ${text(365, 96, 'Mobile Urban Intelligence', 32, colors.ink)}
    ${text(48, 149, 'Sense the street. Review the evidence. Verify the outcome.', 24, colors.muted)}
    ${text(2512, 87, 'TARGET SYSTEM WORKFLOW', 21, colors.edge, 700, 'end')}
    ${text(2512, 128, 'Privacy-first  /  Offline-resilient  /  Human-led', 20, colors.muted, 400, 'end')}
    ${segment(48, 196, 344, 970, '1', 'Capture', colors.capture, '#FAF0E9')}
    ${segment(416, 196, 1216, 970, '2', 'Edge AI', colors.edge, '#EEF5E9')}
    ${segment(1656, 196, 352, 970, '3', 'Connectivity', colors.blue, '#EEF5F9')}
    ${segment(2032, 196, 480, 970, '4', 'Cloud', colors.blue, '#F2F6F9')}
    ${segment(48, 1194, 2464, 440, '5', 'Human review & city response', colors.gold, '#FBF8F1')}
  `];
  pieces.push(
    arrow('M345 398 H404 V493 H448'),
    arrow('M360 838 H408 V551 H448'),
    arrow('M784 493 H848'), arrow('M1184 493 H1248'),
    arrow('M1584 493 H1608 V717 H432 V897 H448'),
    arrow('M784 897 H848'), arrow('M1184 897 H1248'),
    arrow('M1584 897 H1644 V460 H1776'),
    arrow('M1832 637 V672'),
    arrow('M1976 727 H2020 V392 H2064'),
    arrow('M2272 444 V496'), arrow('M2272 600 V652'),
    line('M2272 756 V786 H2172 V820'),
    arrow('M2272 786 H2380 V830'),
    '<path d="M2172 813 V820" stroke="#425F58" stroke-width="4" marker-end="url(#arrow)"/>',
    line('M2172 986 V1008 H2380 V986'), arrow('M2272 1008 V1036'),
    arrow('M2480 1080 H2528 V1280 H228 V1320'),
    arrow('M327 1370 H575'), arrow('M734 1370 H947'),
    arrow('M1106 1370 H1319'), arrow('M1478 1370 H1688'),
    arrow('M228 1485 V1510', true),
    arrow('M1400 1485 V1532 H1028 V1485', true),
    arrow('M656 1485 V1590 H2234 V1518'),
    line('M1400 1532 V1590'),
    '<circle cx="1400" cy="1590" r="5" fill="#425F58"/>',
    text(80, 310, 'PERIMETER VISION', 18, colors.capture, 700), bus(),
    icon(Camera, 96, 562, 45, colors.capture),
    text(155, 589, 'Direct to Jetson', 23, colors.ink, 700),
    text(155, 619, 'CSI / USB cameras', 18, colors.muted),
    '<path d="M80 665 H360" stroke="#DCCFC3" stroke-width="1.5"/>',
    icon(Satellite, 105, 714, 65, colors.capture), icon(Activity, 259, 714, 65, colors.capture),
    text(137, 813, 'GNSS', 24, colors.ink, 700, 'middle'), text(289, 813, 'IMU', 24, colors.ink, 700, 'middle'),
    line('M137 836 V852 H289 V836'), line('M213 852 H360 V838'),
    text(80, 911, 'Position + motion + time', 22, colors.ink, 700),
    text(80, 949, 'Optional ESP32 sensor bridge', 18, colors.muted),
    icon(ShieldCheck, 80, 1050, 30, colors.capture), text(124, 1073, 'Vehicle-local raw video', 20, colors.muted),
    board(), text(647, 326, 'JETSON', 27, colors.edge, 700),
    text(647, 363, 'GPU inference / TensorRT + event preparation', 22, colors.muted),
    tile(448, 406, '1', 'Synchronize', 'Timestamp, calibrate, sample frames', road(448, 406)),
    tile(848, 406, '2', 'Detect', 'Evaluated YOLO / task-specific models', road(848, 406, 1, true)),
    tile(1248, 406, '3', 'Track + consensus', 'Multi-frame consensus; still a candidate', tracking()),
    text(1050, 705, 'CANDIDATE EVENT', 16, colors.edge, 700, 'middle'),
    tile(448, 810, '4', 'Geolocate', 'GNSS + IMU + camera geometry', location()),
    tile(848, 810, '5', 'Redact', 'Mask faces + plates before upload', privacy()),
    tile(1248, 810, '6', 'Package + buffer', 'Persist locally; replay until accepted', buffer()),
    text(448, 1123, 'Output: event metadata + redacted keyframe / short clip', 22, colors.edge, 700),
    icon(RadioTower, 1776, 392, 112, colors.blue),
    '<path d="M1734 419 Q1709 450 1734 481 M1930 419 Q1955 450 1930 481" fill="none" stroke="#A8C7DC" stroke-width="3"/>',
    text(1832, 585, '4G / 5G', 30, colors.ink, 700, 'middle'), text(1832, 622, 'Primary uplink', 21, colors.muted, 400, 'middle'),
    '<g data-node="Secure transport"><rect x="1688" y="672" width="288" height="110" rx="5" fill="#FFFFFF" stroke="#C6D7E3"/>',
    icon(LockKeyhole, 1707, 696, 32, colors.blue), text(1751, 716, 'HTTPS / MQTT', 23, colors.ink, 700),
    text(1751, 752, 'TLS encryption', 19, colors.muted), '</g>',
    icon(RefreshCw, 1802, 876, 60, colors.blue),
    text(1832, 984, 'Offline? Keep buffering.', 23, colors.ink, 700, 'middle'),
    text(1832, 1020, 'Retry until durable ACK', 21, colors.muted, 400, 'middle'),
    text(1832, 1123, 'Events, not a video stream', 19, colors.blue, 700, 'middle'),
    cloudNode(340, 'Authenticate', 'Device identity + payload validation', Fingerprint),
    cloudNode(496, 'Durable queue', 'Accept durably; retry failed processing', Layers),
    cloudNode(652, 'Validate + deduplicate', 'Idempotency + cross-bus space / time', Combine), storage(),
    '<g data-node="FastAPI"><rect x="2064" y="1036" width="416" height="88" rx="5" fill="#E4EEF5" stroke="#B9CDDC"/>',
    icon(KeyRound, 2084, 1058, 32, colors.blue), text(2130, 1069, 'FastAPI', 24, colors.ink, 700),
    text(2130, 1104, 'RBAC + jurisdiction + evidence policy', 18, colors.muted), '</g>',
  );
  const operations = [
    [228, ClipboardCheck, 'Human review', 'Police / Municipal', colors.gold],
    [656, UserRoundCheck, 'Qualify + assign', 'Approved issue / case', colors.edge],
    [1028, Wrench, 'Field response', 'Submit completion evidence', colors.edge],
    [1400, BadgeCheck, 'Verify', 'Evidence + follow-up observation', colors.edge],
    [1772, CircleCheck, 'Close', 'Explicit closure', colors.edge],
  ];
  for (const [center, Icon, title, caption, color] of operations) {
    pieces.push(icon(Icon, center - 37, 1330, 74, color));
    pieces.push(text(center, 1437, title, 27, colors.ink, 700, 'middle'));
    pieces.push(text(center, 1471, caption, 18, colors.muted, 400, 'middle'));
  }
  pieces.push(
    text(2480, 1246, 'AI confidence is not an enforcement decision.', 22, colors.gold, 700, 'end'),
    text(228, 1537, 'Reject / hold', 19, colors.gold, 700, 'middle'),
    text(228, 1570, 'No public incident', 18, colors.muted, 400, 'middle'),
    text(1214, 1520, 'Return for action', 17, colors.muted, 400, 'middle'),
    text(1752, 1576, 'Only qualified conditions + verified updates', 19, colors.edge, 700, 'middle'),
    phone(), text(2234, 1472, 'Citizen map', 27, colors.ink, 700, 'middle'),
    text(2234, 1503, 'Approved, redacted conditions', 18, colors.muted, 400, 'middle'),
    '<path d="M48 1662 H2512" stroke="#D3DDD6" stroke-width="1.5"/>',
    icon(ShieldCheck, 48, 1694, 28, colors.edge),
    text(91, 1716, 'Encryption, retention, audit + health monitoring throughout', 20, colors.muted),
    text(1160, 1716, 'CONDITIONAL', 17, colors.ink, 700),
    icon(ScanText, 1330, 1694, 27, colors.capture), text(1370, 1716, 'Authorized OCR', 19, colors.muted),
    icon(Router, 1583, 1694, 27, colors.blue), text(1623, 1716, 'LoRa alerts + gateway', 19, colors.muted),
    icon(ChartNoAxesCombined, 1914, 1694, 27, colors.blue), text(1955, 1716, 'Historical analytics', 19, colors.muted),
    text(2512, 1716, 'REFERENCE DESIGN', 16, colors.muted, 700, 'end'), '</svg>',
  );
  return pieces.join('\n');
}