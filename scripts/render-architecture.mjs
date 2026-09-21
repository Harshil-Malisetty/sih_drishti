import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { dimensions, makeArtwork } from './architecture-art.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs', 'architecture');
const fonts = await Promise.all([400, 700].map(async weight =>
  (await readFile(path.join(root, `node_modules/@fontsource/dm-sans/files/dm-sans-latin-${weight}-normal.woff2`))).toString('base64')));
const svg = makeArtwork(...fonts);
const channel = process.env.DRISHTI_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined);
const browser = await chromium.launch({ headless: true, channel });

try {
  const page = await browser.newPage({ viewport: dimensions, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const issues = await page.evaluate(({ width, height }) => {
    const failures = [];
    const labels = [...document.querySelectorAll('text')];
    for (const label of labels) {
      const bounds = label.getBoundingClientRect();
      if (bounds.x < 0 || bounds.y < 0 || bounds.right > width || bounds.bottom > height) failures.push(`Outside canvas: ${label.textContent}`);
      const owner = label.closest('[data-node]');
      if (owner) {
        const box = owner.querySelector('rect').getBoundingClientRect();
        if (bounds.x < box.x + 12 || bounds.right > box.right - 12 || bounds.y < box.y || bounds.bottom > box.bottom - 10) failures.push(`Outside node: ${label.textContent}`);
      }
    }
    for (let first = 0; first < labels.length; first++) {
      const firstBox = labels[first].getBoundingClientRect();
      for (let second = first + 1; second < labels.length; second++) {
        const secondBox = labels[second].getBoundingClientRect();
        const horizontalOverlap = Math.min(firstBox.right, secondBox.right) - Math.max(firstBox.x, secondBox.x);
        const verticalOverlap = Math.min(firstBox.bottom, secondBox.bottom) - Math.max(firstBox.y, secondBox.y);
        if (horizontalOverlap > 1 && verticalOverlap > 1) failures.push(`Overlapping text: ${labels[first].textContent} / ${labels[second].textContent}`);
      }
    }
    if (document.querySelectorAll('[data-flow]').length < 20) failures.push('Missing workflow connectors');
    return failures;
  }, dimensions);
  assert.deepEqual(issues, [], 'Diagram labels must be readable and unclipped');
  const screenshot = await page.screenshot({ fullPage: true });
  await mkdir(output, { recursive: true });
  const pngPath = path.join(output, 'drishti-workflow.png');
  const svgPath = path.join(output, 'drishti-workflow.svg');
  await sharp(screenshot).withMetadata({ density: 300 }).png().toFile(pngPath);
  await writeFile(svgPath, svg);
  const metadata = await sharp(pngPath).metadata();
  assert.equal(metadata.width, dimensions.width * 2);
  assert.equal(metadata.height, dimensions.height * 2);
  const pixelStats = await sharp(pngPath).stats();
  assert.ok(pixelStats.channels.some(channelStats => channelStats.stdev > 20), 'Diagram must not be blank');
  console.log(`Validated ${metadata.width} x ${metadata.height} PNG; no text clipping or overlaps.`);
  console.log(pngPath);
  console.log(svgPath);
} finally {
  await browser.close();
}