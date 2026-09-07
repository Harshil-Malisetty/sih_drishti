import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, statSync } from 'node:fs';
import sharp from 'sharp';
import App from '../src/App';
import photos from '../public/landing/photo-sources.json';

vi.mock('../src/lib/demoSession', () => ({ savedRole: () => null, persistRole: vi.fn() }));

describe('photographic landing page', () => {
  it('keeps the brand, headline, navigation and three accessible role choices', () => {
    const html = renderToStaticMarkup(<App/>);
    expect(html).toContain('DRISHTI');
    expect(html).toContain('Better City<br/>starting from<br/><span>a Better View</span>');
    expect(html).toContain('aria-label="Main navigation"');
    expect(html).toContain('href="#workspaces"');
    expect(html).toContain('id="workspaces"');
    expect(html.match(/class="workspace-banner workspace-banner--/g)).toHaveLength(3);
    for (const role of ['police', 'municipal', 'citizen']) {
      expect(html).toContain(`aria-labelledby="${role}-banner-title"`);
      expect(html).toContain(`aria-describedby="${role}-banner-description"`);
      expect(html).toContain(`src="/landing/${role}.webp"`);
    }
    expect(html).toContain('Simulated data · No account needed');
    expect(html).not.toMatch(/intelligence-flow|Bus cameras|Edge AI|<video|<canvas/);
  });

  it('uses decorative local photos and exposes both sets of source credits', () => {
    const html = renderToStaticMarkup(<App/>);
    const tags = html.match(/<img\b[^>]*src="\/landing\/[^>]+>/g) || [];
    expect(tags).toHaveLength(4);
    for (const tag of tags) expect(tag).toContain('alt=""');
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('href="/landing/credits.html"');
    expect(html).toContain('href="/evidence/credits.html"');
  });

  it('ships small real-photo assets with Indian locations and complete attribution', async () => {
    const credits = readFileSync(new URL('../public/landing/credits.html', import.meta.url), 'utf8');
    expect(photos).toHaveLength(4);
    for (const photo of photos) {
      const file = new URL(`../public${photo.filename}`, import.meta.url);
      const metadata = await sharp(file.pathname).metadata();
      expect(metadata.format).toBe('webp');
      expect(metadata.pages || 1).toBe(1);
      expect(metadata.exif).toBeUndefined();
      expect(statSync(file).size).toBeLessThan(220_000);
      expect(photo.location).toContain('India');
      expect(photo.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(photo.license).toMatch(/^CC BY-SA /);
      expect(photo.capturedAt).toBeTruthy();
      expect(photo.modifications).toContain('WebP');
      expect(credits).toContain(photo.author);
      expect(credits).toContain(photo.sourceUrl);
      expect(credits).toContain(photo.licenseUrl);
    }
  });
});