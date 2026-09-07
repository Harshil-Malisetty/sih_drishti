// Downloads genuine photographs and publishes their provenance together.
// No drawing, compositing, damage simulation, AI generation, or synthetic fallback.
// Default: stage under /tmp for visual review. --publish writes reviewed assets.
import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { realPhotoSelections, watchlistPhotoSelections } from './real-photo-selections.mjs';

const root = new URL('../public/evidence/', import.meta.url);
const staging = '/tmp/drishti-indian-photos/';
const publish = process.argv.includes('--publish');
const selections = process.argv.includes('--only-watchlist') ? watchlistPhotoSelections : realPhotoSelections;
const strip = value => (value || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const escape = value => String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
await mkdir(staging, { recursive: true });
const old = JSON.parse(await readFile(new URL('photo-sources.json', root), 'utf8'));
const replacements = new Set(realPhotoSelections.map(item => item.id));
if (replacements.size !== realPhotoSelections.length) throw new Error('Duplicate photo IDs');
if (realPhotoSelections.some(item => item.country !== 'India' || !item.location || !item.locationEvidence)) throw new Error('Every photo requires verified Indian location evidence');
// This catalogue is complete. Never silently carry forward an unselected foreign photo.
const selectedIds = new Set(selections.map(item => item.id));
const records = old.filter(item => !selectedIds.has(item.id) && replacements.has(item.id));
const titles = [...new Set(selections.map(item => `File:${item.title}`))];
const pages = [];
for (let start = 0; start < titles.length; start += 40) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'query', format: 'json', titles: titles.slice(start, start + 40).join('|'), prop: 'imageinfo|categories', cllimit: 'max', iiprop: 'url|extmetadata|metadata', iiurlwidth: '960' });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Commons source lookup: ${response.status}`);
  const json = await response.json();
  if (json.error || !json.query?.pages) throw new Error(JSON.stringify(json.error || json));
  pages.push(...Object.values(json.query.pages));
}
for (const selection of selections) {
  const page = pages.find(page => page.title === `File:${selection.title}`);
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error(`Missing verified source: ${selection.title}`);
  const meta = info.extmetadata;
  const license = strip(meta.LicenseShortName?.value);
  if (!/^(CC BY(?:-SA)? [\d.]|CC0|Public domain)/.test(license)) throw new Error(`Manual licence review required: ${selection.title}: ${license}`);
  const downloadUrl = selection.seriesId ? info.url : info.thumburl || info.url;
  const cache = `${staging}${hash(Buffer.from(JSON.stringify([downloadUrl, selection.crop || null, 'crop-v1']))).slice(0, 16)}.webp`;
  let buffer;
  try { buffer = await readFile(cache); } catch {
    const originalCache = `${staging}${hash(Buffer.from(downloadUrl)).slice(0, 16)}.source`;
    let original;
    try { original = await readFile(originalCache); } catch {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`Photo download ${selection.title}: ${response.status}`);
      original = Buffer.from(await response.arrayBuffer());
      await writeFile(originalCache, original);
    }
    let image = sharp(await sharp(original).rotate().toBuffer());
    if (selection.crop) {
      const { width, height } = await image.metadata();
      const crop = selection.crop;
      if (crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 || crop.x + crop.width > 1 || crop.y + crop.height > 1) throw new Error(`Invalid crop: ${selection.id}`);
      image = image.extract({ left: Math.round(crop.x * width), top: Math.round(crop.y * height), width: Math.round(crop.width * width), height: Math.round(crop.height * height) });
    }
    buffer = await image.resize({ width: 960, height: 720, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    if (buffer.length > 350_000) buffer = await sharp(buffer).webp({ quality: 65 }).toBuffer();
    await writeFile(cache, buffer);
  }
  await writeFile(`${staging}${selection.id}.webp`, buffer);
  const exifDate = info.metadata?.find(field => field.name === 'DateTimeOriginal')?.value;
  const record = { id: selection.id, filename: `/evidence/${selection.id}.webp`, source: 'Wikimedia Commons', sourceUrl: info.descriptionurl, originalUrl: info.url, downloadUrl: info.thumburl || info.url, license, licenseUrl: meta.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Public_domain', attribution: strip(meta.Artist?.value), title: selection.title, usedFor: selection.usedFor, kind: 'photo', country: selection.country, location: selection.location, locationEvidence: selection.locationEvidence, note: selection.note, modifications: 'Orientation corrected, resized within 960 × 720 and WebP encoded. Composition retained; no scene elements added or removed.', captureDate: strip(exifDate || meta.DateTimeOriginal?.value) || 'Not supplied by source', sourceDescription: strip(meta.ImageDescription?.value), relationship: 'independent-reference', seriesId: '', seriesOrder: 0, sha256: hash(buffer) };
  record.downloadUrl = downloadUrl;
  if (selection.seriesId) {
    record.relationship = selection.relationship;
    record.seriesId = selection.seriesId;
    record.sourceCrop = selection.crop || { x: 0, y: 0, width: 1, height: 1 };
    record.modifications = 'Cropped from the original photograph before resizing and WebP encoding. No subjects, faces or registration characters generated or replaced. Scene highlight is a separate interface overlay.';
    const crop = record.sourceCrop;
    record.subjectRegion = selection.subject ? { x: (selection.subject.x - crop.x) / crop.width, y: (selection.subject.y - crop.y) / crop.height, width: selection.subject.width / crop.width, height: selection.subject.height / crop.height } : null;
    if (record.subjectRegion && Object.values(record.subjectRegion).some(value => value < 0 || value > 1)) throw new Error(`Subject outside scene: ${selection.id}`);
  }
  record.sourceCategories = page.categories?.map(category => category.title) || [];
  if (!record.attribution) throw new Error(`Missing attribution: ${selection.title}`);
  records.push(record);
  console.log(`${selection.id} | ${license} | ${record.captureDate} | ${buffer.length} bytes`);
}
records.sort((a, b) => a.id.localeCompare(b.id));
const json = JSON.stringify(records, null, 2) + '\n';
await writeFile(`${staging}image-sources.json`, json);
// A review sheet only arranges the actual, unaltered photographs; it is never application evidence.
for (let start = 0; start < records.length; start += 12) {
  const subset = records.slice(start, start + 12);
  const cells = [];
  for (const [index, record] of subset.entries()) {
    const path = selectedIds.has(record.id) ? `${staging}${record.id}.webp` : new URL(`${record.id}.webp`, root);
    cells.push({ input: await sharp(await readFile(path)).resize(320, 220, { fit: 'contain', background: '#f1f1ee' }).toBuffer(), left: (index % 3) * 320, top: Math.floor(index / 3) * 250 });
    const caption = Buffer.from(`<svg width="320" height="30"><rect width="320" height="30" fill="white"/><text x="8" y="21" font-size="14" font-family="sans-serif">${escape(record.id)}</text></svg>`);
    cells.push({ input: caption, left: (index % 3) * 320, top: Math.floor(index / 3) * 250 + 220 });
  }
  await sharp({ create: { width: 960, height: Math.ceil(subset.length / 3) * 250, channels: 3, background: 'white' } }).composite(cells).jpeg({ quality: 90 }).toFile(`${staging}review-${start / 12 + 1}.jpg`);
}
if (publish) {
  for (const record of records) if (selectedIds.has(record.id)) await copyFile(`${staging}${record.id}.webp`, new URL(`${record.id}.webp`, root));
  // Remove retired documentary-only files as well as their registry entries.
  for (const record of old) if (!replacements.has(record.id) && /^[a-z0-9-]+$/.test(record.id)) await rm(new URL(`${record.id}.webp`, root), { force: true });
  await writeFile(new URL('photo-sources.json', root), json);
  await writeFile(new URL('image-sources.json', root), json);
  const entries = records.map(record => `<article id="${escape(record.id)}"><h2>${escape(record.id)}</h2><img src="${escape(record.id)}.webp" alt="${escape(record.usedFor)}" loading="lazy"><p>${escape(record.usedFor)} · ${escape(record.location)}, India</p><p>${escape(record.note)}</p><p>Source date: ${escape(record.captureDate)}. ${escape(record.attribution)} · <a href="${escape(record.sourceUrl)}">Source</a> · <a href="${escape(record.licenseUrl)}">${escape(record.license)}</a></p><p>${escape(record.locationEvidence)}</p><p>${escape(record.sourceDescription)}</p><p>${escape(record.modifications)}</p></article>`).join('\n');
  await writeFile(new URL('credits.html', root), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drishti — photo credits</title><style>body{max-width:1000px;margin:40px auto;padding:0 20px;font:16px/1.6 system-ui;color:#21372b}article{border-top:1px solid #ddd;padding:24px 0}img{max-width:100%;max-height:340px;object-fit:contain}a{color:#086652}h2{font-size:20px;overflow-wrap:anywhere}</style></head><body><h1>Photo credits</h1><p>Photographs taken in India, used as references for the demo. No generated scenes. Photos do not identify a real person or vehicle as a match or establish the demo case history.</p><p><a href="/">Back to Drishti</a> · <a href="image-sources.json">Source register</a></p>${entries}</body></html>\n`);
  console.log(`Published ${records.length} Indian photo assets with synchronized credits.`);
} else console.log(`Staged ${records.length} photographs in ${staging}. Review contact sheets before --publish.`);