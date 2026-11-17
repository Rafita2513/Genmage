// Prueba de humo en escritorio: servidor estático + Chromium de Playwright.
// Genera un vídeo de ~15 s grabando una página animada con recordVideo
// (el Chromium de Playwright no decodifica H.264, pero sí WebM).
// Uso: npm run e2e   (opcional: CHROMIUM_PATH=ruta\a\chrome.exe)
import http from 'node:http';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};

const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(ROOT, path === '/' ? 'index.html' : path));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const tmp = await mkdtemp(join(tmpdir(), 'genmage-e2e-'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

try {
  // 1. Grabar el vídeo de prueba (~15 s).
  const recCtx = await browser.newContext({
    viewport: { width: 640, height: 360 },
    recordVideo: { dir: tmp, size: { width: 640, height: 360 } },
  });
  const recPage = await recCtx.newPage();
  await recPage.setContent(`<body style="margin:0;background:#000"><canvas id=c width=640 height=360></canvas>
    <script>
      const ctx = document.getElementById('c').getContext('2d');
      const t0 = performance.now();
      (function frame() {
        const t = (performance.now() - t0) / 1000;
        ctx.fillStyle = 'hsl(' + ((t * 24) % 360) + ',60%,40%)';
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 12; i++) ctx.fillRect(40 + i * 45, 150 + 80 * Math.sin(t * 2 + i), 30, 30);
        ctx.font = '48px sans-serif';
        ctx.fillText(t.toFixed(1) + ' s', 40, 80);
        requestAnimationFrame(frame);
      })();
    </script></body>`);
  await recPage.waitForTimeout(15500);
  const videoPath = await recPage.video().path();
  await recCtx.close();

  // 2. Probar la app.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
  // Forzar el respaldo: sin Web Share con archivos.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  await page.goto(base);
  await page.waitForSelector('#home:not([hidden])');

  async function loadVideoAndWait() {
    await page.setInputFiles('#video-input', videoPath);
    await page.waitForSelector('#results:not([hidden])', { timeout: 120_000 });
  }

  await loadVideoAndWait();
  assert.equal(await page.locator('.slide').count(), 10, '15 s → 10 fotos');
  assert.equal(await page.locator('.thumb').count(), 10);
  assert.equal(await page.locator('#save').textContent(), 'Guardar 0 fotos');
  assert.equal(await page.locator('#save').isDisabled(), true);

  await page.locator('.slide').nth(0).click();
  await page.locator('.slide').nth(3).click();
  assert.equal(await page.locator('#save').textContent(), 'Guardar 2 fotos');
  assert.equal(await page.locator('#save').isDisabled(), false);

  // Las fotos salen a la resolución del vídeo, no reducidas.
  const dims = await page.locator('.slide img').first().evaluate((i) => [i.naturalWidth, i.naturalHeight]);
  assert.deepEqual(dims, [640, 360], 'resolución original del vídeo');

  if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, 'results.png') });

  await page.locator('#save').click();
  await page.waitForSelector('#fallback:not([hidden])');
  assert.equal(await page.locator('#fallback-grid img').count(), 2, 'rejilla de respaldo con 2 fotos');

  await page.locator('#fallback-back').click();
  await page.waitForSelector('#results:not([hidden])');
  assert.equal(await page.locator('#save').textContent(), 'Guardar 2 fotos', 'el carrusel se conserva');

  // Cambiar de vídeo: nada del anterior queda.
  await page.locator('#back').click();
  await page.waitForSelector('#home:not([hidden])');
  await loadVideoAndWait();
  assert.equal(await page.locator('.slide').count(), 10, 'sin fotos acumuladas del vídeo anterior');
  assert.equal(await page.locator('#save').textContent(), 'Guardar 0 fotos');
  assert.equal(await page.locator('#save').isDisabled(), true);

  // Un archivo que no es vídeo lleva a la pantalla de error.
  await page.locator('#back').click();
  await page.setInputFiles('#video-input', {
    name: 'roto.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('esto no es un vídeo'),
  });
  await page.waitForSelector('#error:not([hidden])', { timeout: 30_000 });

  assert.deepEqual(problems, [], `errores en la página:\n${problems.join('\n')}`);
  console.log('OK: prueba de humo superada');
} finally {
  await browser.close();
  server.close();
  await rm(tmp, { recursive: true, force: true });
}
