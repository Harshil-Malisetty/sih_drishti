// Maintainer-only image sourcing. Application/build never needs network access.
// Run without --publish to review a contact sheet in /tmp/drishti-evidence.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

export const selections = [
  ['pothole-detected', 'Pothole in an asphalt pavement.jpg', 'Localized road defect'],
  ['pothole-observed', 'Roads deformed T munnekollala Bengaluru.jpg', 'Repeated road deformation'],
  ['pothole-degrading', 'Potholes on asphalt road 20171023.jpg', 'Worsening asphalt damage'],
  ['pothole-high-risk', 'Large pothole along Drumhirk Road - geograph.org.uk - 6917827.jpg', 'Severe road deterioration'],
  ['pothole-repair', 'Pothole semi-permanent repair vibratory compactor.png', 'Compaction during pothole repair'],
  ['water-pooling', 'Street flood 2.jpg', 'Initial standing water'],
  ['water-recurring', 'Minor Flood.jpg', 'Recurring urban road flooding'],
  ['water-spreading', 'Hill Road Flood 20080607.JPG', 'Flooded carriageway'],
  ['water-persistent', 'Hill Road Flood 20080607-2.JPG', 'Another observation of flooded carriageway'],
  ['guardrail-damaged', 'Frankfurt-Bockenheim - Beschädigte Leitplanke an der Rosa-Luxemburg-Straße.jpg', 'Impact-deformed roadside restraint'],
  ['sign-missing', 'Missing road sign along Tirquin Road - geograph.org.uk - 7726561.jpg', 'Missing sign face'],
  ['sign-damaged', 'Damaged road sign, Killadroy Road - geograph.org.uk - 4455164.jpg', 'Damaged direction sign'],
  ['sign-degraded', 'Partly missing direction sign, Omagh - geograph.org.uk - 6490107.jpg', 'Partly missing direction sign'],
  ['crossing-fading', 'Fading road crossing in Park View Road N17.jpg', 'Faded crossing paint'],
  ['crossing-degraded', 'Now you see it - Endymion Road zebra crossing.jpg', 'Low-visibility crossing'],
  ['road-debris', 'Debris on Beach Road (6094145952).jpg', 'Debris obstructing the road edge'],
];
// Normalized crops remove unrelated surroundings and people/plates, not the observed defect.
const crops = {
  'pothole-high-risk': [0, .48, .8, .52],
  'water-pooling': [0, .7, .65, .3],
  'water-recurring': [0, .46, 1, .54],
  'water-spreading': [0, .43, 1, .57],
  'water-persistent': [.31, .25, .69, .75],
  'crossing-degraded': [.34, .48, .66, .52],
  'guardrail-damaged': [.3, .31, .27, .29],
  'sign-missing': [.42, .35, .55, .65],
  'sign-degraded': [0, .5, .53, .5],
};
const publish = process.argv.includes('--publish');
const directory = publish ? new URL('../public/evidence/', import.meta.url).pathname : '/tmp/drishti-evidence/';
await mkdir(directory, { recursive: true });
const url = new URL('https://commons.wikimedia.org/w/api.php');
url.search = new URLSearchParams({ action: 'query', format: 'json', titles: selections.map(([, title]) => `File:${title}`).join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '960' });
const response = await fetch(url);
if (!response.ok) throw new Error(`Source lookup failed: ${response.status}`);
const pages = Object.values((await response.json()).query.pages);
const strip = value => (value || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
const records = [];
for (const [id, title, usedFor] of selections) {
  const info = pages.find(page => page.title === `File:${title}`)?.imageinfo?.[0];
  if (!info) throw new Error(`Missing source: ${title}`);
  const meta = info.extmetadata;
  const license = strip(meta.LicenseShortName?.value);
  if (!/^(CC BY|CC0|Public domain)/.test(license)) throw new Error(`Review license for ${title}: ${license}`);
  const highResolution = id === 'guardrail-damaged';
  const downloadUrl = (highResolution ? info.url : info.thumburl || info.url).split('?')[0];
  const cached = `/tmp/drishti-evidence/${createHash('sha256').update(title + (highResolution ? '-hi' : '')).digest('hex').slice(0,12)}.webp`;
  let buffer;
  try { buffer = await readFile(cached); } catch {
    const image = await fetch(downloadUrl);
    if (!image.ok) throw new Error(`Download ${title}: ${image.status}`);
    buffer = await sharp(Buffer.from(await image.arrayBuffer())).rotate().resize({ width: highResolution ? 1920 : 960, height: highResolution ? 1440 : 720, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    await writeFile(cached, buffer);
  }
  if (crops[id]) {
    const { width, height } = await sharp(buffer).metadata();
    const [x, y, w, h] = crops[id];
    buffer = await sharp(buffer).extract({ left: Math.floor(x * width), top: Math.floor(y * height), width: Math.floor(w * width), height: Math.floor(h * height) }).webp({ quality: 82 }).toBuffer();
  }
  await writeFile(`${directory}${id}.webp`, buffer);
  records.push({ id, filename: `/evidence/${id}.webp`, source: 'Wikimedia Commons', sourceUrl: info.descriptionurl, originalUrl: info.url, downloadUrl, license, licenseUrl: meta.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Public_domain', attribution: id === 'crossing-fading' ? 'Martin Ball / Alan Stanton' : strip(meta.Artist?.value), title, usedFor, kind: 'photo', note: 'Illustrative photograph from another location; not a Drishti capture or a same-site time series.', modifications: crops[id] ? `Resized, WebP encoded and cropped to the road evidence. Normalized crop: ${crops[id].join(', ')}.` : 'Resized and WebP encoded; original composition retained.', sha256: createHash('sha256').update(buffer).digest('hex') });
  console.log(id, license, buffer.length);
}
// Pexels free photograph, not a paid asset. Source page and license reviewed separately.
const patchUrl = 'https://images.pexels.com/photos/6018646/pexels-photo-6018646.jpeg?auto=compress&cs=tinysrgb&w=960';
const patchResponse = await fetch(patchUrl);
if (!patchResponse.ok) throw new Error(`Pexels download: ${patchResponse.status}`);
const patch = await sharp(Buffer.from(await patchResponse.arrayBuffer())).rotate().resize({ width: 960, height: 720, fit: 'inside' }).webp({ quality: 82 }).toBuffer();
await writeFile(`${directory}pothole-verified.webp`, patch);
records.push({ id: 'pothole-verified', filename: '/evidence/pothole-verified.webp', source: 'Pexels', sourceUrl: 'https://www.pexels.com/photo/patched-hole-in-the-road-6018646/', originalUrl: patchUrl, downloadUrl: patchUrl, license: 'Pexels License', licenseUrl: 'https://www.pexels.com/license/', attribution: 'Nicolette Villavicencio', title: 'Patched Hole in the Road', usedFor: 'Sealed asphalt patch; illustrative completed repair', kind: 'photo', note: 'Illustrative photograph from another location; not a Drishti verification capture.', modifications: 'Resized and WebP encoded; original composition retained.', sha256: createHash('sha256').update(patch).digest('hex') });
await writeFile(`${directory}photo-sources.json`, JSON.stringify(records, null, 2) + '\n');
const cells = await Promise.all(records.map(async (record, index) => {
  const image = await sharp(`${directory}${record.id}.webp`).resize(280, 180, { fit: 'contain', background: '#e7ebe8' }).toBuffer();
  const caption = Buffer.from(`<svg width="280" height="30"><rect width="280" height="30" fill="white"/><text x="8" y="21" font-family="sans-serif" font-size="14">${record.id}</text></svg>`);
  return [{ input: image, left: index % 3 * 280, top: Math.floor(index / 3) * 210 }, { input: caption, left: index % 3 * 280, top: Math.floor(index / 3) * 210 + 180 }];
}));
await sharp({ create: { width: 840, height: Math.ceil(records.length / 3) * 210, channels: 3, background: 'white' } }).composite(cells.flat()).jpeg().toFile('/tmp/drishti-evidence/contact.jpg');