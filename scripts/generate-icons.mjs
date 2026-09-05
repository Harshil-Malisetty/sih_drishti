// Optional maintainer utility, not a build step. Requires Linux gdk-pixbuf-thumbnailer.
// Crop the existing brand symbol (not the wordmark), keeping its original pixels.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const image = readFileSync(join(root, 'src/assets/drishti_logo.png')).toString('base64');
const temp = mkdtempSync(join(tmpdir(), 'drishti-icons-'));
mkdirSync(join(root, 'public/icons'), { recursive: true });
try {
  // The mark stays inside the central 80% safe circle, including maskable crops.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="white"/><svg x="128" y="88" width="256" height="336" viewBox="108 36 170 220"><image width="396" height="431" xlink:href="data:image/png;base64,${image}"/></svg></svg>`;
  const source = join(temp, 'brand.svg');
  writeFileSync(source, svg);
  for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['icon-maskable-512', 512], ['apple-touch-icon', 180]]) {
    execFileSync('gdk-pixbuf-thumbnailer', ['-s', String(size), source, join(root, `public/icons/${name}.png`)]);
  }
} finally {
  rmSync(temp, { recursive: true, force: true });
}