// End-to-end smoke test of the production build in mobile Chromium (iPhone viewport).
// Overpass and map tiles are intercepted with a test fixture so the test runs offline.
// Usage: npm run build && npm run test:e2e
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium, devices } from 'playwright';

const fixture = JSON.parse(readFileSync('tests/fixtures/overpass-test.json', 'utf8'));
const PORT = 8799;
const BASE = `http://localhost:${PORT}/`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOQUtACAAC8AGVLJkuNAAAAAElFTkSuQmCC', 'base64');
const CLEAR_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=', 'base64');
mkdirSync('test-results', { recursive: true });

const server = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], { env: { ...process.env, PORT: String(PORT), KARTES_API_KEY: '', KARTES_SPEEDCAMERAS_URL: '' }, stdio: 'pipe' });
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => d.toString().includes('Radar Map:') && res());
  server.on('exit', (c) => rej(new Error('server exited ' + c)));
  setTimeout(() => rej(new Error('server start timeout')), 20000);
});

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
};

const browser = await chromium.launch();
async function newPage({ overpass = 'ok', geo = true } = {}) {
  const ctx = await browser.newContext({
    ...devices['iPhone 13'],
    deviceScaleFactor: 1,
    permissions: geo ? ['geolocation'] : [],
    geolocation: geo ? { latitude: 56.94, longitude: 24.12, accuracy: 8 } : undefined,
    serviceWorkers: 'block',
  });
  // Label tiles are transparent in reality; the base tile is an opaque dark pixel.
  await ctx.route(/basemaps\.cartocdn\.com/, (r) =>
    r.fulfill({ body: r.request().url().includes('only_labels') ? CLEAR_PNG : PNG, contentType: 'image/png' }));
  await ctx.route(/overpass|maps\.mail\.ru/, async (r) => {
    if (overpass === 'fail') return r.fulfill({ status: 504, body: 'Gateway timeout' });
    const q = decodeURIComponent((r.request().postData() ?? '').replace(/\+/g, ' '));
    const body = q.includes('speed_camera') ? fixture.cameras : fixture.roads;
    return r.fulfill({ body: JSON.stringify(body), contentType: 'application/json', headers: { 'access-control-allow-origin': '*' } });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { ctx, page, errors };
}

try {
  // ---- 1. Normal flow with geolocation ----
  {
    const { ctx, page, errors } = await newPage();
    await page.goto(BASE);
    await page.waitForSelector('.leaflet-container');
    check('map renders', true);
    await page.waitForSelector('.rm-cam', { timeout: 15000 });
    check('cameras shown', (await page.locator('.rm-cam').count()) === 2, `${await page.locator('.rm-cam').count()} markers`);

    // Drive north along "Testa iela" at ~45 km/h (12.5 m per second), then ~79 km/h.
    let lat = 56.94;
    for (let i = 0; i < 4; i++) {
      lat += 12.5 / 110540;
      await ctx.setGeolocation({ latitude: lat, longitude: 24.12, accuracy: 8 });
      await page.waitForTimeout(1000);
    }
    const speedTxt = await page.getByTestId('speed-value').innerText();
    const kmh = parseInt(speedTxt, 10);
    check('speed from GPS shown in km/h', kmh >= 40 && kmh <= 60, speedTxt.replace(/\n/g, ' '));
    await page.waitForFunction(() => document.querySelector('[data-testid=limit-block]')?.textContent?.includes('50'), null, { timeout: 15000 });
    check('current speed limit 50', true);
    const next = await page.getByTestId('next-camera').innerText();
    check('next camera is the one ahead (not the one behind)', next.toLowerCase().includes('следующая') && next.includes('Testa iela') && /\d+ м|км/.test(next), next.replace(/\n/g, ' | '));
    check('within limit status', (await page.getByTestId('speed-status').innerText()).includes('В пределах'));
    await page.screenshot({ path: 'test-results/driving.png' });

    for (let i = 0; i < 4; i++) {
      lat += 22 / 110540;
      await ctx.setGeolocation({ latitude: lat, longitude: 24.12, accuracy: 8 });
      await page.waitForTimeout(1000);
    }
    check('overspeed warning', (await page.getByTestId('bottom-panel').getAttribute('data-over')) === 'true', await page.getByTestId('speed-value').innerText());
    check('overspeed status text', (await page.getByTestId('speed-status').innerText()).includes('Превышение'));
    const px = await page.evaluate(() => { const c = document.querySelector('.leaflet-overlay-pane canvas'); if (!c) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k]) n++; return n; });
    check('speed-limit line visible while following the user', px > 1000, `${px} px`);
    await page.screenshot({ path: 'test-results/overspeed.png' });

    // Camera details
    await page.getByTestId('next-camera').click();
    const card = await page.getByTestId('camera-details').innerText();
    check('camera card: road', card.includes('Testa iela'));
    check('camera card: limit from road segment', card.includes('50 км/ч') && card.includes('по данным участка'));
    check('camera card: type', card.includes('Стационарная'));
    check('camera card: unknown direction not invented', card.includes('Не указано источником'));
    check('camera card: updated time', /\d{2}\.\d{2}\.\d{4}/.test(card));
    await page.screenshot({ path: 'test-results/camera-card.png' });
    await page.getByLabel('Закрыть').click();

    // Layers
    await page.getByTestId('layers-button').click();
    const layers = await page.getByTestId('layers-sheet').innerText();
    check('OSM source status', (await page.getByTestId('source-osm').innerText()).includes('камер: 2'));
    check('kartes.lv reported as not configured', (await page.getByTestId('source-kartes').innerText()).includes('не подключён'), await page.getByTestId('source-kartes').innerText());
    await page.screenshot({ path: 'test-results/layers.png' });
    await page.getByTestId('toggle-fixed').click({ force: true });
    await page.getByLabel('Закрыть').click();
    check('toggle hides stationary cameras', (await page.locator('.rm-cam').count()) === 0);
    check('layers sheet had legend', layers.includes('нет данных'));
    await page.getByTestId('layers-button').click();
    await page.getByTestId('toggle-fixed').click({ force: true });
    await page.getByLabel('Закрыть').click();

    // Road tap → details (road without data shows "Нет данных")
    await page.getByTestId('locate-button').click();
    await page.waitForTimeout(800);
    const roadsDrawn = await page.evaluate(() => document.querySelectorAll('.leaflet-overlay-pane canvas').length);
    check('speed-limit layer drawn on canvas', roadsDrawn > 0);
    check('no runtime errors', errors.length === 0, errors.join('; '));
    await ctx.close();
  }

  // ---- 2. Geolocation denied: map still works ----
  {
    const { ctx, page } = await newPage({ geo: false });
    await page.goto(BASE);
    await page.waitForSelector('.rm-cam', { timeout: 15000 });
    await page.waitForTimeout(500);
    const sp = await page.getByTestId('speed-value').innerText();
    check('no geolocation → "Скорость недоступна", cameras still shown', sp.includes('недоступна'));
    await page.screenshot({ path: 'test-results/no-geo.png' });
    await ctx.close();
  }

  // ---- 3. API failure without cache ----
  {
    const { ctx, page } = await newPage({ overpass: 'fail' });
    await page.goto(BASE);
    await page.waitForSelector('[data-testid=data-status]');
    await page.waitForFunction(() => document.querySelector('[data-testid=data-status]')?.textContent?.includes('Не удалось'), null, { timeout: 15000 });
    check('API error shown, no fake cameras', (await page.locator('.rm-cam').count()) === 0);
    await page.screenshot({ path: 'test-results/api-error.png' });
    await ctx.close();
  }

  // ---- 4. API failure WITH cache: old data kept, marked stale ----
  {
    const { ctx, page } = await newPage({ geo: false });
    await page.goto(BASE);
    await page.waitForSelector('.rm-cam', { timeout: 15000 });
    await ctx.unroute(/overpass|maps\.mail\.ru/);
    await ctx.route(/overpass|maps\.mail\.ru/, (r) => r.fulfill({ status: 504, body: 'x' }));
    await page.getByTestId('layers-button').click();
    await page.getByRole('button', { name: 'Обновить' }).click();
    await page.getByLabel('Закрыть').click();
    await page.waitForFunction(() => document.querySelector('[data-testid=data-status]')?.textContent?.includes('Не удалось обновить'), null, { timeout: 20000 });
    check('refresh failure keeps cached cameras and warns', (await page.locator('.rm-cam').count()) === 2, await page.getByTestId('data-status').innerText());
    await ctx.close();
  }

  // ---- 5. PWA ----
  {
    const { ctx, page } = await newPage();
    const res = await page.goto(BASE + 'manifest.webmanifest');
    const m = await res.json();
    check('manifest: standalone + icons', m.display === 'standalone' && m.icons.length >= 3);
    const sw = await page.goto(BASE + 'sw.js');
    check('service worker served', sw.status() === 200);
    const icon = await page.goto(BASE + 'icons/apple-touch-icon.png');
    check('apple-touch-icon served', icon.status() === 200);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
