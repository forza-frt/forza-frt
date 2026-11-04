/**
 * Minimal Overpass API client (OpenStreetMap read-only query service).
 * Public instances allow CORS, so the app can query them directly from the phone.
 * Fair-use policy: https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances
 */
const DEFAULT_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const ENDPOINTS: string[] = (import.meta.env.VITE_OVERPASS_URLS as string | undefined)
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean) ?? DEFAULT_ENDPOINTS;

export interface OsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
  members?: { type: string; ref: number; role: string }[];
}

export interface OverpassResult {
  elements: OsmElement[];
  osm3s?: { timestamp_osm_base?: string };
}

export class OverpassError extends Error {}

export async function overpassQuery(query: string, signal?: AbortSignal, timeoutMs = 45000): Promise<OverpassResult> {
  let lastError: unknown = null;
  for (const url of ENDPOINTS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: new URLSearchParams({ data: query }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new OverpassError(`Overpass ${res.status}`);
      const json = (await res.json()) as OverpassResult;
      if (!Array.isArray(json.elements)) throw new OverpassError('Неверный ответ Overpass');
      return json;
    } catch (e) {
      if (signal?.aborted) throw e;
      lastError = e;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw new OverpassError(
    `Сервер OpenStreetMap (Overpass) недоступен${lastError instanceof Error ? `: ${lastError.message}` : ''}`,
  );
}

/** Car-relevant highway classes. Footways, cycleways, service/parking roads are excluded. */
export const CAR_HIGHWAYS =
  '^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$';

export function bboxStr(b: [number, number, number, number]): string {
  return b.map((n) => n.toFixed(5)).join(',');
}

export function camerasQuery(bbox: [number, number, number, number]): string {
  const b = bboxStr(bbox);
  return `[out:json][timeout:90];
node["highway"="speed_camera"](${b})->.cams;
rel["type"="enforcement"]["enforcement"~"^(maxspeed|average_speed|mindistance)$"](${b})->.enf;
node(r.enf:"device")->.dev;
(.cams; .dev;)->.all;
.all out body;
.enf out body;
way(around.all:30)["highway"~"${CAR_HIGHWAYS}"];
out tags geom;`;
}

export function roadsQuery(bbox: [number, number, number, number]): string {
  return `[out:json][timeout:60];
way["highway"~"${CAR_HIGHWAYS}"](${bboxStr(bbox)});
out tags geom;`;
}
