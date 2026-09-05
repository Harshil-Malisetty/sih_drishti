import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { persistRole, savedRole } from '../src/lib/demoSession';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

describe('optional demo role persistence', () => {
  it('keeps role access working when browser storage is denied', () => {
    const denied = () => { throw new DOMException('Storage denied', 'SecurityError'); };
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied, removeItem: denied });
    expect(savedRole()).toBeNull();
    expect(() => persistRole('police')).not.toThrow();
    expect(() => persistRole(null)).not.toThrow();
  });
  it('persists valid roles and rejects stale or invalid values', () => {
    let value: string | null = null;
    vi.stubGlobal('localStorage', { getItem: () => value, setItem: (_: string, next: string) => { value = next; }, removeItem: () => { value = null; } });
    for (const role of ['police', 'municipal', 'citizen'] as const) { persistRole(role); expect(savedRole()).toBe(role); }
    value = 'administrator'; expect(savedRole()).toBeNull();
    persistRole(null); expect(savedRole()).toBeNull();
  });
});

describe('static deployment contract', () => {
  it('keeps the optional future API base public, normalized and disabled by default', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect((await import('../src/services/config')).apiBaseUrl).toBe('');
    vi.resetModules(); vi.stubEnv('VITE_API_BASE_URL', ' https://api.example.com/v1/// ');
    expect((await import('../src/services/config')).apiBaseUrl).toBe('https://api.example.com/v1');
  });
  it('provides SPA document fallback without returning HTML for missing assets', () => {
    const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
    const route = new RegExp(`^${config.rewrites[0].source}$`);
    for (const path of ['/', '/police/watchlist', '/municipal/planning', '/citizen/routes']) expect(route.test(path)).toBe(true);
    for (const path of ['/assets/missing.js', '/icons/missing.png', '/manifest.webmanifest', '/missing.css']) expect(route.test(path)).toBe(false);
    expect(config.rewrites[0].destination).toBe('/index.html');
  });
  it('ships real square launcher icons and a scoped standalone manifest', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
    expect(manifest).toMatchObject({ name: 'Drishti', id: '/', start_url: '/', scope: '/', display: 'standalone' });
    for (const icon of [...manifest.icons, { src: '/icons/apple-touch-icon.png', sizes: '180x180' }]) {
      const png = readFileSync(new URL(`../public${icon.src}`, import.meta.url));
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });
});