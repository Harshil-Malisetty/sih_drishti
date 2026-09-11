import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const FILM_ROOT = resolve(ROOT, 'public/canvas-film');
export const chromePath = () => {
  const browser = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && existsSync(p));
  if (!browser) throw new Error('Chrome not found. Set CHROME_PATH to a Chrome/Chromium executable.');
  return browser;
};
export const launchOptions = () => ({ executablePath: chromePath(), headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--force-color-profile=srgb'] });
export async function startFilmServer(port = 0) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain' };
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/' || pathname === '/presentation' || pathname === '/canvas-film/') { res.writeHead(302, { Location: '/canvas-film/index.html' }); res.end(); return; }
      if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      if (!pathname.startsWith('/canvas-film/')) { res.writeHead(404); res.end(); return; }
      const file = resolve(FILM_ROOT, pathname.slice('/canvas-film/'.length));
      if (!file.startsWith(`${FILM_ROOT}${sep}`) || !(await stat(file)).isFile()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(await readFile(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise((yes, no) => { server.once('error', no); server.listen(port, '127.0.0.1', yes); });
  return { url: `http://127.0.0.1:${server.address().port}/canvas-film/index.html`, close: () => new Promise((yes, no) => { server.close(error => error ? no(error) : yes()); server.closeAllConnections(); }) };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await startFilmServer(Number(process.env.PORT || 4191));
  console.log(`Canvas-only film preview: ${server.url}`);
  for (const sig of ['SIGINT','SIGTERM']) process.once(sig, async () => { await server.close(); process.exit(0); });
}