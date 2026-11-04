import type { Camera, DataSourceId, SourceStatus } from '../types/camera';
import type { City } from '../types/city';
import { distanceM } from '../utils/geo';
import { camerasQuery, overpassQuery } from './overpass';
import { parseCameras } from './osmParse';
import { loadJSON, saveJSON } from './storage';

/** Base URL of the optional Radar Map server (holds the kartes.lv key). Empty = same origin. */
const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

export class NotConfiguredError extends Error {}

export interface ProviderResult {
  cameras: Camera[];
}

export interface CameraProvider {
  id: DataSourceId;
  label: string;
  fetch(city: City, signal: AbortSignal): Promise<ProviderResult>;
}

export const osmProvider: CameraProvider = {
  id: 'osm',
  label: 'OpenStreetMap',
  async fetch(city, signal) {
    const res = await overpassQuery(camerasQuery(city.bbox), signal, 90000);
    return { cameras: parseCameras(res.elements) };
  },
};

/**
 * kartes.lv speed cameras, via the Radar Map server (/api/kartes/speedcameras).
 * The API key lives only on the server. If the server is not running or not configured,
 * this provider reports "not configured" — it never invents data.
 */
export const kartesProvider: CameraProvider = {
  id: 'kartes',
  label: 'kartes.lv',
  async fetch(city, signal) {
    const url = `${API_BASE}/api/kartes/speedcameras?bbox=${city.bbox.join(',')}`;
    let res: Response;
    try {
      res = await fetch(url, { signal });
    } catch (e) {
      if (signal.aborted) throw e;
      throw new NotConfiguredError('Сервер Radar Map недоступен — источник kartes.lv не подключён');
    }
    const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
    if (!isJson || res.status === 404) {
      throw new NotConfiguredError('Сервер Radar Map не запущен — источник kartes.lv не подключён');
    }
    const body = (await res.json()) as { configured?: boolean; cameras?: Camera[]; error?: string };
    if (res.status === 501 || body.configured === false) {
      throw new NotConfiguredError(body.error ?? 'API-ключ kartes.lv не задан на сервере');
    }
    if (!res.ok || !Array.isArray(body.cameras)) {
      throw new Error(body.error ?? `kartes.lv: ошибка ${res.status}`);
    }
    return { cameras: body.cameras };
  },
};

export const PROVIDERS: Record<DataSourceId, CameraProvider> = { osm: osmProvider, kartes: kartesProvider };

/**
 * Merge cameras from several sources. kartes.lv (official/curated) wins over OSM when
 * the same physical camera is present in both (within 25 m). Mobile zones are never merged
 * with stationary cameras.
 */
export function mergeCameras(bySource: Partial<Record<DataSourceId, Camera[]>>): Camera[] {
  const primary = bySource.kartes ?? [];
  const out = [...primary];
  for (const cam of bySource.osm ?? []) {
    const dup = primary.some(
      (p) => p.kind !== 'mobile_zone' && distanceM(p.lat, p.lon, cam.lat, cam.lon) < 25,
    );
    if (!dup) out.push(cam);
  }
  return out;
}

// ---- cache -----------------------------------------------------------------

export interface CachedCameras {
  version: 1;
  cityId: string;
  fetchedAt: number;
  bySource: Partial<Record<DataSourceId, Camera[]>>;
}

/** How long cached camera data is used without asking the sources again. */
export const CAMERA_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const cacheKey = (cityId: string) => `radarmap:cameras:${cityId}`;

export function loadCachedCameras(cityId: string): CachedCameras | null {
  const c = loadJSON<CachedCameras>(cacheKey(cityId));
  return c && c.version === 1 && c.cityId === cityId ? c : null;
}

export function saveCachedCameras(c: CachedCameras): void {
  saveJSON(cacheKey(c.cityId), c);
}

export async function fetchAllSources(
  city: City,
  signal: AbortSignal,
): Promise<{ bySource: Partial<Record<DataSourceId, Camera[]>>; status: Record<DataSourceId, SourceStatus> }> {
  const status: Record<DataSourceId, SourceStatus> = {
    osm: { state: 'not_configured', message: 'Источник не используется для этого города' },
    kartes: { state: 'not_configured', message: 'Источник не используется для этого города' },
  };
  const bySource: Partial<Record<DataSourceId, Camera[]>> = {};
  await Promise.all(
    city.sources.map(async (id) => {
      try {
        const r = await PROVIDERS[id].fetch(city, signal);
        bySource[id] = r.cameras;
        status[id] = { state: 'ok', count: r.cameras.length };
      } catch (e) {
        if (signal.aborted) throw e;
        status[id] =
          e instanceof NotConfiguredError
            ? { state: 'not_configured', message: e.message }
            : { state: 'error', message: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  return { bySource, status };
}
