import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Camera, Satellite, ScanLine, MapPin, ShieldCheck, HardDrive,
  RadioTower, Fingerprint, Layers, Combine, Database, Images,
  LockKeyhole, PanelsTopLeft, Map, ClipboardCheck, UserCheck,
  Wrench, BadgeCheck, Archive, BusFront, ArrowUpRight,
} from 'lucide-react';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs', 'architecture');
const width = 2560;
const height = 1780;
const ink = '#172C2A';
const muted = '#546864';
const line = '#617A74';
const green = '#237451';
const teal = '#187D80';
const blue = '#356B9B';
const amber = '#936327';
const columns = [80, 568, 1056, 1544, 2032];
const parts = [];
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (left, top, content, size = 20, color = ink, weight = 400, extra = '') =>
  `<text x="${left}" y="${top}" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${escape(content)}</text>`;
const multiline = (left, top, lines, size = 20, color = muted, leading = 29) =>
  lines.map((content, index) => text(left, top + index * leading, content, size, color)).join('');
const icon = (Icon, left, top, color, size = 28) =>
  `<g transform="translate(${left} ${top})">${renderToStaticMarkup(React.createElement(Icon, { size, color, strokeWidth: 1.7 }))}</g>`;
const arrow = (route, { dashed = false, color = line, both = false } = {}) =>
  `<path d="${route}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" ${dashed ? 'stroke-dasharray="7 7"' : ''} marker-end="url(#arrow)" ${both ? 'marker-start="url(#arrow-start)"' : ''}/>`;
const node = (left, top, title, lines, Icon, color, options = {}) => {
  const nodeHeight = options.height ?? 122;
  const fill = options.fill ?? '#FFFFFF';
  return `<g data-node="${escape(title)}">
    <rect x="${left}" y="${top}" width="448" height="${nodeHeight}" rx="6" fill="${fill}" stroke="#C7D3CF" stroke-width="1.5"/>
    <path d="M ${left + 1} ${top + 19} V ${top + nodeHeight - 19}" stroke="${color}" stroke-width="3"/>
    ${icon(Icon, left + 22, top + 21, color)}
    ${text(left + 64, top + 43, title, 24, ink, 700)}
    ${multiline(left + 24, top + 75, lines, 19, muted, 25)}
  </g>`;
};

const regularFont = (await readFile(path.join(root, 'node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2'))).toString('base64');
const boldFont = (await readFile(path.join(root, 'node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2'))).toString('base64');
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">DRISHTI: from street observation to verified action</title>
  <desc id="description">Proposed target architecture. Cameras connect directly to a Jetson with synchronized GNSS and IMU. Edge processing includes detection, tracking, location estimation, privacy masking and persistent buffering. Cellular delivery uses authenticated ingestion, a durable queue and cross-bus deduplication. PostgreSQL with PostGIS stores operational state; object storage holds evidence. FastAPI enforces authorization for staff and public projections. Human review precedes qualification, assignment, field response, verification and explicit closure. The existing project is a frontend prototype, not a deployed backend or edge system.</desc>
  <defs>
    <style>
      @font-face { font-family: 'Diagram Sans'; font-style: normal; font-weight: 400; src: url(data:font/woff2;base64,${regularFont}) format('woff2'); }
      @font-face { font-family: 'Diagram Sans'; font-style: normal; font-weight: 700; src: url(data:font/woff2;base64,${boldFont}) format('woff2'); }
      text { font-family: 'Diagram Sans', sans-serif; letter-spacing: 0; }
    </style>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="${line}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker>
    <marker id="arrow-start" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto" markerUnits="userSpaceOnUse"><path d="M9 1 L1 5 L9 9" fill="none" stroke="${line}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker>
  </defs>
  <rect width="2560" height="1780" fill="#FAFCFA"/>
  <rect x="80" y="58" width="7" height="80" fill="${green}"/>
  ${text(108, 112, 'DRISHTI', 66, ink, 700)}
  ${text(431, 109, 'Mobile Urban Intelligence Platform', 32, ink)}
  ${text(108, 161, 'From street observation to verified action', 24, muted)}
  <rect x="1976" y="67" width="504" height="43" rx="3" fill="#E9F1EC"/>
  ${text(2228, 95, 'PROPOSED TARGET ARCHITECTURE', 19, green, 700, 'text-anchor="middle"')}
  ${text(2480, 147, 'Human decisions. Private evidence. Reliable delivery.', 20, muted, 400, 'text-anchor="end"')}
  <path d="M80 186 H2480" stroke="#CAD6D0" stroke-width="1.5"/>
`);

const stages = [
  ['01', 'Capture', 'ON THE BUS', green],
  ['02', 'Process at the edge', 'JETSON', teal],
  ['03', 'Deliver & reconcile', 'NETWORK + INGESTION', blue],
  ['04', 'Persist', 'DURABLE CLOUD STATE', blue],
  ['05', 'Serve by role', 'API + USER INTERFACES', amber],
];
stages.forEach(([number, title, subtitle, color], index) => {
  const left = columns[index];
  parts.push(`<path d="M${left} 222 H${left + 448}" stroke="${color}" stroke-width="4"/>`);
  parts.push(text(left, 265, number, 24, color, 700));
  parts.push(text(left + 48, 265, title, 29, ink, 700));
  parts.push(text(left, 305, subtitle, 17, muted, 700));
});

parts.push(
  arrow('M528 413 H568'),
  arrow('M528 555 H548 V450 H568'),
  arrow('M792 474 V510'),
  arrow('M792 632 V668'),
  arrow('M792 790 V826'),
  arrow('M1016 887 H1036 V413 H1056'),
  arrow('M1280 474 V510'),
  arrow('M1280 632 V668'),
  arrow('M1280 790 V826'),
  arrow('M1504 887 H1524 V427 H1544'),
  arrow('M1524 631 H1544'),
  arrow('M1992 427 H2032'),
  arrow('M1992 631 H2012 V465 H2032'),
  arrow('M2256 502 V556', { both: true }),
  arrow('M2480 427 H2500 V864 H2480'),
  arrow('M2256 706 V740 H2520 V1132 H304 V1236'),
);

parts.push(
  node(80, 352, 'Cameras', ['Direct CSI / USB connection to Jetson', 'One-camera pilot; expand after testing'], Camera, green),
  node(80, 494, 'GNSS + IMU', ['ESP32 for timestamped IMU, if needed', 'Synchronize sensor and camera clocks'], Satellite, green),
  icon(BusFront, 80, 660, green, 48),
  text(146, 681, 'Mobile observation platform', 22, ink, 700),
  text(146, 711, 'Cameras do not route through ESP32.', 18, muted),
  '<path d="M80 756 H528" stroke="#D6DFDA"/>',
  text(80, 795, 'EVENT ENVELOPE', 17, green, 700),
  multiline(80, 833, [
    'Stable event ID + source device / bus',
    'Capture time + model version / provenance',
    'Estimated location + spatial uncertainty',
    'Evidence reference + integrity checksum',
  ], 19, muted, 31),
  text(80, 997, 'Send events, not continuous video.', 20, ink, 700),
  node(568, 352, 'Detection + tracking', ['Evaluate YOLO on relevant road data', 'Track objects; use multi-frame consensus'], ScanLine, teal),
  node(568, 510, 'Location estimation', ['GNSS / IMU + calibrated camera geometry', 'Defect location is not simply bus GPS'], MapPin, teal),
  node(568, 668, 'Privacy gate', ['Mask faces and plates before upload', 'OCR only for authorized plate use cases'], ShieldCheck, teal),
  node(568, 826, 'Persistent event buffer', ['Encrypted, bounded local disk storage', 'Replay unacknowledged events on reconnect'], HardDrive, teal),
  multiline(568, 981, ['Bounded retry, backoff and retention policy.', 'Monitor disk capacity; never silently drop.'], 18, muted, 27),
  node(1056, 352, 'Cellular uplink', ['HTTPS / MQTT over TLS', 'Event metadata + redacted frame / short clip'], RadioTower, blue),
  node(1056, 510, 'Authenticated ingestion', ['Device identity + schema / payload checks', 'Reject unauthorized or malformed uploads'], Fingerprint, blue),
  node(1056, 668, 'Durable queue', ['Acknowledge only after durable acceptance', 'Worker retries + dead-letter handling'], Layers, blue),
  node(1056, 826, 'Validate + deduplicate', ['Idempotent processing by event ID', 'Cross-bus spatial / temporal correlation'], Combine, blue),
  multiline(1056, 981, ['Repeated sightings update one candidate.', 'Retain observations and uncertain matches.'], 18, muted, 27),
  node(1544, 352, 'PostgreSQL + PostGIS', ['Candidates, observations + geospatial state', 'Issues, assignments, reviews + audit records', 'Durable workflow transactions'], Database, blue, { height: 150 }),
  node(1544, 556, 'Object storage', ['Redacted images / clips; evidence references', 'Restricted originals only when authorized', 'Separate access, encryption + retention'], Images, blue, { height: 150 }),
  text(1544, 780, 'SECURITY & OPERATIONS', 17, blue, 700),
  multiline(1544, 819, [
    'Audit evidence access and every decision.',
    'Apply deletion / retention across stores.',
    'Monitor queue lag, failures and device health.',
    'Back up state; test recovery and replay.',
  ], 19, muted, 31),
  multiline(1544, 981, ['FastAPI can use managed containers.', 'Serverless depends on the hosting platform.'], 18, muted, 27),
  node(2032, 352, 'FastAPI service boundary', ['Authenticate users; authorize every request', 'Backend RBAC + department / jurisdiction', 'Evidence access enforced server-side'], LockKeyhole, amber, { height: 150 }),
  node(2032, 556, 'Police / Municipal UI', ['React + Leaflet operational workspaces', 'Scoped review, assignment and field updates', 'UI visibility is not an authorization control'], PanelsTopLeft, amber, { height: 150 }),
  node(2032, 780, 'Citizen API + public map', ['Publish approved road conditions only', 'No plates, faces, watchlists or bus identifiers', 'No internal confidence scores or raw reports'], Map, green, { height: 168, fill: '#F0F7F1' }),
  multiline(2032, 981, ['A filtered public projection, not raw events.', 'Publication follows the review rules below.'], 18, muted, 27),
);

parts.push(
  text(80, 1091, 'HUMAN REVIEW TO VERIFIED RESOLUTION', 22, ink, 700),
  text(2480, 1091, 'No automatic confirmation, dispatch or enforcement from AI confidence.', 20, muted, 400, 'text-anchor="end"'),
  text(80, 1200, 'Candidate evidence enters review before it can create an operational case or public warning.', 21, muted),
  arrow('M528 1306 H568'),
  arrow('M1016 1306 H1056'),
  arrow('M1504 1306 H1544'),
  arrow('M1992 1306 H2032'),
  arrow('M304 1376 V1420'),
  arrow('M1768 1376 V1440 H1280 V1376', { dashed: true }),
  arrow('M792 1376 V1568 H2510 V910 H2480'),
  '<path d="M1768 1440 V1568" fill="none" stroke="#617A74" stroke-width="2.5"/>',
  '<circle cx="1768" cy="1568" r="5" fill="#617A74"/>',
  node(80, 1236, 'Review candidate', ['Confirm / correct with supporting evidence', 'Reject or hold when evidence is insufficient'], ClipboardCheck, amber, { height: 140, fill: '#FFFCF6' }),
  node(568, 1236, 'Qualify + assign', ['Create a qualified issue / case after review', 'Explicitly assign the responsible team'], UserCheck, green, { height: 140 }),
  node(1056, 1236, 'Field response', ['Acknowledge, attend and perform work', 'Submit resolution evidence for review'], Wrench, green, { height: 140 }),
  node(1544, 1236, 'Verify resolution', ['Reviewer checks completion evidence', 'Verify the update or return for action'], BadgeCheck, green, { height: 140 }),
  node(2032, 1236, 'Explicit closure', ['Close only after required verification', 'Police traffic: later normalizing observation'], Archive, green, { height: 140 }),
  text(80, 1454, 'REJECT / NEEDS VERIFICATION', 17, amber, 700),
  multiline(80, 1487, ['Retain review history; no operational or public', 'side effects. Held candidates can be reviewed again.'], 18, muted, 26),
  text(1524, 1424, 'Return for action', 18, muted, 400, 'text-anchor="middle"'),
  text(2032, 1424, 'Verification and closure are separate steps.', 18, muted),
  text(838, 1548, 'Publish qualified conditions; change public status only after verified resolution.', 20, green, 700),
  '<path d="M80 1626 H2480" stroke="#CAD6D0" stroke-width="1.5"/>',
  icon(ArrowUpRight, 80, 1660, muted, 24),
  text(118, 1681, 'CONDITIONAL, NOT CORE', 17, ink, 700),
  text(402, 1681, 'OCR: authorized use only', 19, muted),
  text(758, 1681, 'LoRa: small alerts + reachable gateway / backhaul; not video or inherent mesh', 19, muted),
  text(1800, 1681, 'BigQuery / extra databases: after measured need', 19, muted),
  text(80, 1735, 'IMPLEMENTED TODAY', 17, green, 700),
  text(308, 1735, 'React / Leaflet prototype + simulated, tested domain workflows. Backend, hardware, ML and radio performance are not implemented or benchmarked.', 19, muted),
  '</svg>',
);

await mkdir(output, { recursive: true });
const svgPath = path.join(output, 'drishti-workflow.svg');
const pngPath = path.join(output, 'drishti-workflow.png');
await writeFile(svgPath, parts.join('\n'));

const channel = process.env.DRISHTI_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined);
const browser = await chromium.launch({ headless: true, channel });
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}svg{display:block}</style></head><body>${parts.join('\n')}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const issues = await page.evaluate(() => {
    const failures = [];
    if (document.querySelector('parsererror')) failures.push('Invalid SVG XML');
    const labels = [...document.querySelectorAll('text')];
    for (const label of labels) {
      const bounds = label.getBBox();
      if (bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > 2560 || bounds.y + bounds.height > 1780) failures.push(`Outside canvas: ${label.textContent}`);
      const owner = label.closest('[data-node]');
      if (owner) {
        const box = owner.querySelector('rect').getBBox();
        if (bounds.x < box.x + 14 || bounds.x + bounds.width > box.x + box.width - 14 || bounds.y < box.y || bounds.y + bounds.height > box.y + box.height - 12) failures.push(`Outside node: ${label.textContent}`);
      }
    }
    for (let first = 0; first < labels.length; first++) {
      const firstBox = labels[first].getBBox();
      for (let second = first + 1; second < labels.length; second++) {
        const secondBox = labels[second].getBBox();
        const horizontalOverlap = Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width) - Math.max(firstBox.x, secondBox.x);
        const verticalOverlap = Math.min(firstBox.y + firstBox.height, secondBox.y + secondBox.height) - Math.max(firstBox.y, secondBox.y);
        if (horizontalOverlap > 1 && verticalOverlap > 1) failures.push(`Overlapping text: ${labels[first].textContent} / ${labels[second].textContent}`);
      }
    }
    return failures;
  });
  assert.deepEqual(issues, [], 'Diagram layout must have no clipped or overlapping text');
  const screenshot = await page.screenshot({ fullPage: true });
  await sharp(screenshot).withMetadata({ density: 300 }).png().toFile(pngPath);
  const metadata = await sharp(pngPath).metadata();
  assert.equal(metadata.width, width * 2);
  assert.equal(metadata.height, height * 2);
  console.log(`Validated ${metadata.width} x ${metadata.height} PNG; no text clipping or overlaps.`);
  console.log(pngPath);
  console.log(svgPath);
} finally {
  await browser.close();
}