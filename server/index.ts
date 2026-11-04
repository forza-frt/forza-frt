/**
 * Radar Map server.
 *  - Serves the built PWA from ./dist
 *  - /api/kartes/speedcameras: proxies the kartes.lv API so the API key never reaches the browser,
 *    with an in-memory cache to avoid unnecessary requests.
 * No user location or personal data is received or stored here.
 */
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUrl, normalize, type NormalizedCamera } from './kartes';

try {
  process.loadEnvFile?.('.env');
} catch {
  /* no .env — fine */
}

const PORT = Number(process.env.PORT ?? 8787);
const KEY = process.env.KARTES_API_KEY ?? '';
const URL_TEMPLATE = process.env.KARTES_SPEEDCAMERAS_URL ?? '';
const CACHE_MS = Number(process.env.KARTES_CACHE_MINUTES ?? 60) * 60_000;

const app = express();
app.disable('x-powered-by');

// Optional CORS for a frontend hosted on another origin (e.g. GitHub Pages). Comma-separated list.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  next();
});

const cache = new Map<string, { at: number; cameras: NormalizedCamera[] }>();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, kartesConfigured: Boolean(KEY && URL_TEMPLATE) });
});

app.get('/api/kartes/speedcameras', async (req, res) => {
  if (!KEY || !URL_TEMPLATE) {
    res.status(501).json({
      configured: false,
      error: 'kartes.lv не подключён: задайте KARTES_API_KEY и KARTES_SPEEDCAMERAS_URL в .env',
    });
    return;
  }
  const parts = String(req.query.bbox ?? '').split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    res.status(400).json({ error: 'bbox=south,west,north,east обязателен' });
    return;
  }
  const bbox = parts as [number, number, number, number];
  const cacheKey = bbox.join(',');
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    res.json({ configured: true, cameras: hit.cameras, fetchedAt: hit.at, cached: true });
    return;
  }
  try {
    const upstream = await fetch(buildUrl(URL_TEMPLATE, KEY, bbox), { signal: AbortSignal.timeout(20000) });
    if (!upstream.ok) throw new Error(`kartes.lv ответил ${upstream.status}`);
    const all = normalize(await upstream.json());
    const cameras = all.filter((c) => c.lat >= bbox[0] && c.lat <= bbox[2] && c.lon >= bbox[1] && c.lon <= bbox[3]);
    const at = Date.now();
    cache.set(cacheKey, { at, cameras });
    res.json({ configured: true, cameras, fetchedAt: at, cached: false });
  } catch (e) {
    // Keep serving the last good copy, clearly marked as stale.
    if (hit) {
      res.json({ configured: true, cameras: hit.cameras, fetchedAt: hit.at, cached: true, stale: true });
      return;
    }
    res.status(502).json({ configured: true, error: e instanceof Error ? e.message : 'Ошибка kartes.lv' });
  }
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not found' });
});

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(dist)) {
  app.use(
    express.static(dist, {
      setHeaders(res, file) {
        if (file.endsWith('sw.js') || file.endsWith('index.html') || file.endsWith('.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Radar Map: http://localhost:${PORT}`);
  console.log(`kartes.lv: ${KEY && URL_TEMPLATE ? 'подключён' : 'не подключён (см. .env.example)'}`);
  if (!existsSync(dist)) console.log('dist/ не найден — выполните npm run build');
});
