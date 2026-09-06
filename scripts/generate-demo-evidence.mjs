// Original, deliberately non-photographic reconstructions. No real identity or plate.
// Used only where a photo would imply a real target, incident, or unsupported same-site state.
import sharp from 'sharp';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir = new URL('../public/evidence/', import.meta.url);
await mkdir(dir, { recursive: true });
const records = [];
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
function road(variant = 0) {
  return `<rect width="960" height="540" fill="#cbd0cc"/>
    <path d="M0 90h210v128H0zm720-28h240v158H720" fill="#a5aaa4"/>
    <path d="M35 105h40v75H35zm85 0h40v75h-40zm655-22h48v108h-48zm84 0h48v108h-48z" fill="#6c7877"/>
    <path d="M0 231 325 186h325l310 57v297H0" fill="#727574"/>
    <path d="m326 186-95 354H0V269zM646 186l151 354h163V278z" fill="#aaaca4"/>
    <path d="M325 187 230 540M648 190l151 350" stroke="#ddd9c7" stroke-width="7"/>
    <path d="m487 205 3 42m4 30 6 63m5 38 10 132" stroke="#d9d6bd" stroke-width="6"/>
    <path d="m280 290-100 248m550-241 112 241" stroke="#4f5654" stroke-width="4"/>
    <g fill="#727e70"><path d="m20 238 55-117 52 117zM168 229l31-90 35 90zM865 230l38-122 47 122z"/></g>
    <path d="M0 521q460-24 960 0v19H0Z" fill="#303938"/>
    ${variant % 2 ? '<path d="M5 248h160v34H5" fill="#ded7ba"/><rect x="49" y="222" width="4" height="56" fill="#646d69"/>' : ''}`;
}
function vehicle(x, y, scale, plate = 'TN XX XX 4821', color = '#c7cdca') {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <ellipse cx="110" cy="147" rx="128" ry="21" fill="#4e5451"/>
    <rect x="3" y="79" width="28" height="70" rx="9" fill="#252c2c"/><rect x="186" y="79" width="28" height="70" rx="9" fill="#252c2c"/>
    <path d="m13 75 20-60Q106-4 188 15l20 60 3 66H7Z" fill="${color}" stroke="#586463" stroke-width="3"/>
    <path d="m40 22-14 49h168l-15-49Q110 8 40 22" fill="#52676d"/>
    <path d="m46 25-10 40h57V18" fill="#8e9b9a" opacity=".5"/>
    <path d="M20 83h178m-188 45h198" stroke="#737e7a" stroke-width="4"/>
    <rect x="17" y="91" width="32" height="15" rx="3" fill="#a35748"/><rect x="167" y="91" width="30" height="15" rx="3" fill="#a35748"/>
    <rect x="54" y="107" width="112" height="23" rx="2" fill="#f4f0db" stroke="#6a716a"/>
    <text x="110" y="123" text-anchor="middle" font-family="monospace" font-size="13" fill="#283332">${plate}</text>
    <path d="M68 136h85" stroke="#8c9590" stroke-width="4"/></g>`;
}
function person(x, y, scale, guard = false) {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cx="24" cy="150" rx="39" ry="9" fill="#6a716c"/>
    <circle cx="23" cy="13" r="16" fill="#777d77"/><path d="M5 35q18-13 36 0l7 54-10 6H7L-2 84Z" fill="${guard ? '#d2b95b' : '#426864'}"/>
    <path d="M10 94 5 142m30-48 10 48" stroke="#353f43" stroke-width="13"/>
    <path d="M3 40-15 91m55-50 18 44" stroke="#777d77" stroke-width="9"/>
    ${guard ? '<path d="M4 59h38" stroke="#e4e3cf" stroke-width="9"/><path d="M57 84v-59" stroke="#747c70" stroke-width="4"/><circle cx="57" cy="14" r="20" fill="#ad6651"/>' : '<rect x="-3" y="46" width="17" height="40" rx="6" fill="#343e43"/>'}</g>`;
}
function divider(stage) {
  return [0, 1, 2, 3].map((n) => {
    const displaced = stage > n ? 20 + stage * 9 : 0;
    return `<g transform="translate(${510 + n * 49 + displaced} ${205 + n * 59}) rotate(${stage > n ? stage * 5 : 0})"><path d="m0 0 37-3 25 70-75 8Z" fill="#bdbbb1" stroke="#6e756e" stroke-width="3"/><path d="m-6 23 55-3 9 22-70 4" stroke="#676c63" stroke-width="13"/></g>`;
  }).join('');
}
function guardrail(stage) {
  const bend = stage * 26;
  return `<path d="m730 254-10 155m90-118 15 177m65-132 29 187" stroke="#636c66" stroke-width="11"/>
    <path d="M666 225 735 272 ${806 - bend} ${325 + bend / 2} 953 428" fill="none" stroke="#c5c8c1" stroke-width="29"/>
    <path d="M666 225 735 272 ${806 - bend} ${325 + bend / 2} 953 428" fill="none" stroke="#737e77" stroke-width="4"/>`;
}
function sign(stage) {
  return `<path d="M180 415V120m150 250V120" stroke="#616e68" stroke-width="9"/>
    ${stage < 3 ? `<g transform="rotate(${stage === 2 ? 16 : 0} 250 175)"><rect x="157" y="107" width="196" height="111" rx="3" fill="${stage === 1 ? '#82948a' : '#486c60'}" stroke="#c5cfc2" stroke-width="5"/><path d="M188 141h132m-34-16 35 16-35 16M184 185h115" stroke="#e2e4d2" stroke-width="9" opacity="${stage === 1 ? .3 : 1}"/></g>` : '<path d="M182 130h145m-145 69h145" stroke="#8a958b" stroke-width="5"/>'}`;
}
function crossing(stage) {
  return Array.from({ length: 7 }, (_, n) => stage === 3 || stage === 2 && n % 3 ? '' : `<path d="m${240 + n * 62} 359h28l18 73h-41Z" fill="#e0dfcd" opacity="${stage === 1 ? .4 : stage === 2 ? .2 : 1}"/>`).join('');
}
async function save(id, subject, drawing, note) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">${drawing}
    <rect width="960" height="36" fill="#253735"/><text x="18" y="24" fill="#f4f3e9" font-family="sans-serif" font-size="16">SYNTHETIC SCENE · ${escape(subject)}</text>
    <rect x="15" y="485" width="345" height="27" fill="#253735"/><text x="24" y="505" fill="#f4f3e9" font-family="sans-serif" font-size="14">DEMO RECONSTRUCTION · NOT A CAPTURE</text></svg>`;
  const buffer = await sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer();
  await writeFile(new URL(`${id}.webp`, dir), buffer);
  records.push({ id, filename: `/evidence/${id}.webp`, source: 'Drishti original procedural illustration', sourceUrl: '/evidence/credits.html', license: 'CC0-1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', attribution: 'Drishti demo project — original synthetic scene', title: subject, usedFor: subject, kind: 'synthetic', note: note || 'No real person, registration or event. Explicitly illustrative, not camera evidence or model output.', modifications: 'Original SVG scene rendered as WebP. Generator retained in scripts/generate-demo-evidence.mjs.', sha256: createHash('sha256').update(buffer).digest('hex') });
}
for (let n = 0; n < 3; n++) {
  await save(`vehicle-pass-${n + 1}`, `VEHICLE OBSERVATION ${n + 1}`, road(n) + vehicle(340 + n * 75, 238 + n * 16, 1 - n * .08));
  await save(`person-pass-${n + 1}`, `FICTIONAL PERSON · OBSERVATION ${n + 1}`, road(n) + person(195 + n * 18, 231 - n * 13, 1 - n * .1));
}
await save('vehicle-reference', 'FICTIONAL VEHICLE REFERENCE', road() + vehicle(370, 242, 1.45));
await save('person-reference', 'FICTIONAL PERSON REFERENCE', '<rect width="960" height="540" fill="#bac3ba"/>' + person(430, 98, 2.45));
for (let n = 0; n < 5; n++) await save(`incident-frame-${n + 1}`, `INCIDENT REVIEW · FRAME ${n + 1}`, road(n) + vehicle(365 + n * 24, 242 + n * 7, 1, 'TN XX XX 1234') + vehicle(625 - n * 23, 200 + n * 18, .65, 'DEMO', '#8c9d9d'));
await save('incident-plate', 'FICTIONAL OCR REGION · TN XX XX 1234', '<rect width="960" height="540" fill="#737f79"/><rect x="110" y="164" width="740" height="175" rx="10" fill="#eee9d2" stroke="#4d5953" stroke-width="8"/><text x="480" y="278" text-anchor="middle" font-family="monospace" font-size="78" fill="#25322b">TN XX XX 1234</text>');
await save('motorcycle-candidate', 'TWO-WHEELER · REVIEW CANDIDATE', road() + '<ellipse cx="526" cy="435" rx="66" ry="18" fill="#4e5650"/><path d="M525 350v82" stroke="#252c2b" stroke-width="25"/><path d="m496 316 11 77h40l12-77Z" fill="#949f96"/><rect x="495" y="361" width="62" height="20" fill="#e9e4cc"/><text x="526" y="375" text-anchor="middle" font-family="monospace" font-size="10">XX 7082</text>' + person(504, 218, .83));
for (let stage = 0; stage < 4; stage++) {
  await save(`divider-stage-${stage + 1}`, ['DIVIDER · SHIFTED PANEL', 'DIVIDER · OPEN JOINT', 'DIVIDER · TWO DISPLACED PANELS', 'DIVIDER · CARRIAGEWAY INTRUSION'][stage], road() + divider(stage + 1));
  if (stage < 3) await save(`guardrail-stage-${stage + 1}`, ['GUARDRAIL · LOCAL DEFORMATION', 'GUARDRAIL · BENT SECTION', 'GUARDRAIL · DISPLACED POST'][stage], road() + guardrail(stage + 1));
  await save(`school-stage-${stage + 1}`, ['SCHOOL CROSSING · CONTROL PRESENT', 'SCHOOL CROSSING · CONTROL NOT VISIBLE', 'SCHOOL CROSSING · UNMANAGED MOVEMENT', 'SCHOOL CROSSING · REPEAT OBSERVATION'][stage], road(stage) + crossing(0) + person(220 + stage * 67, 274, .6) + (stage === 0 ? person(650, 215, 1, true) : ''));
}
await save('crossing-absent', 'CROSSING · PAINT EFFECTIVELY ABSENT', road() + crossing(3));
await save('crossing-worn', 'CROSSING · FRAGMENTED MARKINGS', road() + crossing(2));
await save('sign-absent', 'DIRECTION SIGN · EMPTY MOUNTING FRAME', road() + sign(3));
await save('divider-completed', 'DIVIDER · PANELS REALIGNED', road() + divider(0));
await save('guardrail-completed', 'GUARDRAIL · RESTRAINT RESTORED', road() + guardrail(0));
await save('sign-completed', 'DIRECTION SIGN · FACE REPLACED', road() + sign(0));
await save('crossing-completed', 'CROSSING · MARKINGS RENEWED', road() + crossing(0));
await save('school-completed', 'SCHOOL CROSSING · CONTROL RESTORED', road(1) + crossing(0) + person(660, 221, 1, true));
await save('water-completed', 'DRAINAGE · WATER CLEARED', road(1) + '<rect x="262" y="350" width="35" height="60" fill="#4b5650"/><path d="M265 360h28m-31 12h28m-31 12h28m-31 12h28" stroke="#adb4a8" stroke-width="3"/>');
await save('obstruction-completed', 'ROAD · DEBRIS REMOVED', road());
// These review-only candidates are no longer part of the published library.
for (const obsolete of ['guardrail-stage-4.webp', 'sign-faded.webp']) await rm(new URL(obsolete, dir), { force: true });
await writeFile(new URL('synthetic-sources.json', dir), JSON.stringify(records, null, 2) + '\n');
const photos = JSON.parse(await readFile(new URL('photo-sources.json', dir), 'utf8'));
const sources = [...photos, ...records];
await writeFile(new URL('image-sources.json', dir), JSON.stringify(sources, null, 2) + '\n');
await writeFile(new URL('credits.html', dir), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drishti — evidence sources</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:32px auto;padding:0 20px;color:#243b36;background:#f6f8f6}article{border-top:1px solid #cad4cf;padding:18px 0}a{color:#17685a}h1{font-size:28px}small{display:block}</style><h1>Drishti evidence sources</h1><p>Demo records use representative photographs and original synthetic reconstructions. Photos are not Drishti captures, proof of a real incident, or a genuine same-location time series. Simulated locations, timestamps and severity are not photographic metadata. No endorsement is implied.</p><p>Each photograph and any adapted version remains available under its stated license; these licenses do not apply to unrelated application code. Synthetic scenes contain no real identity or registration.</p>${sources.map(s => `<article><h2>${escape(s.title)}</h2><a href="${s.filename}">Local image</a> · ${s.kind === 'photo' ? `<a href="${s.sourceUrl}">Original source</a> · ` : ''}<a href="${s.licenseUrl}">${s.license}</a><small>${escape(s.attribution)}</small><small>${escape(s.modifications)}</small><p>${escape(s.note)}</p></article>`).join('')}</html>`);
console.log(`Generated ${records.length} synthetic fixtures and ${sources.length} source records.`);