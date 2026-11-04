/**
 * Adapter for the kartes.lv speed-camera API (https://developers.kartes.lv/en/speedcameras/).
 *
 * IMPORTANT: the exact request URL and response format of this API could not be verified while
 * this project was built (the documentation host was unreachable from the build environment).
 * Therefore:
 *   - the request URL is NOT hard-coded: set KARTES_SPEEDCAMERAS_URL from the API documentation;
 *     `{key}`, `{south}`, `{west}`, `{north}`, `{east}` placeholders are substituted;
 *   - the response normaliser below accepts the common shapes (GeoJSON FeatureCollection, or a JSON
 *     array of objects with lat/lon) and maps fields by name. Anything it cannot read is dropped,
 *     and a camera whose type it cannot recognise is marked `unknown` — never guessed.
 * After reading the real documentation, adjust `normalize()` if field names differ.
 */

export type CameraKind = 'fixed' | 'average_speed' | 'mobile_zone' | 'unknown';

export interface NormalizedCamera {
  id: string;
  lat: number;
  lon: number;
  kind: CameraKind;
  maxspeed: number | null;
  maxspeedOrigin: 'camera' | null;
  road: string | null;
  direction: number | null;
  directionLabel: string | null;
  source: 'kartes';
}

type Obj = Record<string, unknown>;

const pick = (o: Obj, keys: string[]): unknown => {
  for (const k of keys) {
    for (const actual of Object.keys(o)) if (actual.toLowerCase() === k) return o[actual];
  }
  return undefined;
};

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

export function classifyKind(raw: string | null): CameraKind {
  if (!raw) return 'unknown';
  const v = raw.toLowerCase();
  // Latvian: mobilais/pārvietojamais = mobile; stacionārais = stationary; vidējā ātruma = average speed
  if (/mobil|pārvietojam|parvietojam|portable/.test(v)) return 'mobile_zone';
  if (/vidēj|videj|average|section|posm/.test(v)) return 'average_speed';
  if (/stacion|stationary|fixed|static/.test(v)) return 'fixed';
  return 'unknown';
}

function findList(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    const o = body as Obj;
    if (o.type === 'FeatureCollection' && Array.isArray(o.features)) return o.features;
    for (const k of ['data', 'items', 'cameras', 'speedcameras', 'results', 'result', 'features']) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return [];
}

export function normalize(body: unknown): NormalizedCamera[] {
  const out: NormalizedCamera[] = [];
  findList(body).forEach((item, i) => {
    if (!item || typeof item !== 'object') return;
    let props = item as Obj;
    let lat: number | null = null;
    let lon: number | null = null;
    const geom = (item as Obj).geometry as Obj | undefined;
    if (geom && geom.type === 'Point' && Array.isArray(geom.coordinates)) {
      lon = num(geom.coordinates[0]);
      lat = num(geom.coordinates[1]);
      props = ((item as Obj).properties as Obj) ?? {};
    } else {
      lat = num(pick(props, ['lat', 'latitude', 'y']));
      lon = num(pick(props, ['lon', 'lng', 'long', 'longitude', 'x']));
    }
    // Latvia sanity check — rejects swapped or projected (LKS-92) coordinates instead of misplacing them.
    if (lat === null || lon === null || lat < 55 || lat > 58.5 || lon < 20 || lon > 29) return;

    const kindRaw = str(pick(props, ['type', 'camera_type', 'cameratype', 'kind', 'category', 'tips', 'veids']));
    const speed = num(pick(props, ['maxspeed', 'speed_limit', 'speedlimit', 'limit', 'speed', 'atrums']));
    const dir = num(pick(props, ['direction', 'bearing', 'azimuth', 'heading', 'virziens']));
    out.push({
      id: `kartes-${str(pick(props, ['id', 'uid', 'objectid'])) ?? num(pick(props, ['id', 'uid', 'objectid'])) ?? i}`,
      lat,
      lon,
      kind: classifyKind(kindRaw),
      maxspeed: speed !== null && speed > 0 && speed <= 200 ? Math.round(speed) : null,
      maxspeedOrigin: speed !== null ? 'camera' : null,
      road: str(pick(props, ['road', 'street', 'iela', 'address', 'adrese', 'name', 'title', 'description'])),
      direction: dir !== null && dir >= 0 && dir <= 360 ? dir : null,
      directionLabel: dir !== null ? String(dir) : null,
      source: 'kartes',
    });
  });
  return out;
}

export function buildUrl(template: string, key: string, bbox: [number, number, number, number]): string {
  return template
    .replaceAll('{key}', encodeURIComponent(key))
    .replaceAll('{south}', String(bbox[0]))
    .replaceAll('{west}', String(bbox[1]))
    .replaceAll('{north}', String(bbox[2]))
    .replaceAll('{east}', String(bbox[3]));
}
