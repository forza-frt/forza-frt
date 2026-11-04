/**
 * Parsing of OpenStreetMap maxspeed values.
 * https://wiki.openstreetmap.org/wiki/Key:maxspeed
 *
 * Only values that are explicitly tagged are interpreted. Country zone codes
 * (e.g. "LV:urban") are the mapper's explicit statement that the statutory limit
 * of that zone applies; their values follow the national traffic rules
 * (Latvian Road Traffic Regulations, Russian ПДД) as documented on the OSM wiki.
 */
const ZONE_LIMITS: Record<string, number> = {
  'LV:urban': 50,
  'LV:rural': 90,
  'LV:living_street': 20,
  'LV:motorway': 110,
  'RU:urban': 60,
  'RU:rural': 90,
  'RU:living_street': 20,
  'RU:motorway': 110,
};

/** km/h, or null if the value cannot be interpreted as a number (e.g. "none", "signals", "walk"). */
export function parseMaxspeed(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const v = raw.trim();
  if (v === '') return null;
  if (v in ZONE_LIMITS) return ZONE_LIMITS[v];
  // "50;70" (multiple values) is ambiguous → no data
  if (v.includes(';')) return null;
  const mph = /^(\d+(?:\.\d+)?)\s*mph$/i.exec(v);
  if (mph) return Math.round(parseFloat(mph[1]) * 1.609344);
  const kmh = /^(\d+(?:\.\d+)?)(?:\s*km\/h)?$/i.exec(v);
  if (kmh) {
    const n = Math.round(parseFloat(kmh[1]));
    return n > 0 && n <= 200 ? n : null;
  }
  return null;
}

export interface WayLimits {
  maxspeed: number | null;
  maxspeedForward: number | null;
  maxspeedBackward: number | null;
  maxspeedRaw: string | null;
}

export function wayLimits(tags: Record<string, string>): WayLimits {
  const both = parseMaxspeed(tags.maxspeed);
  const fwd = parseMaxspeed(tags['maxspeed:forward']) ?? both;
  const bwd = parseMaxspeed(tags['maxspeed:backward']) ?? both;
  let raw: string | null = tags.maxspeed ?? null;
  if (tags['maxspeed:forward'] || tags['maxspeed:backward']) {
    raw = [
      tags.maxspeed && `maxspeed=${tags.maxspeed}`,
      tags['maxspeed:forward'] && `forward=${tags['maxspeed:forward']}`,
      tags['maxspeed:backward'] && `backward=${tags['maxspeed:backward']}`,
    ]
      .filter(Boolean)
      .join(', ');
  }
  return {
    maxspeed: fwd !== null && fwd === bwd ? fwd : null,
    maxspeedForward: fwd,
    maxspeedBackward: bwd,
    maxspeedRaw: raw,
  };
}

const CARDINALS: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

/** OSM `direction` tag → degrees, or null if not an absolute direction (e.g. "forward", "both"). */
export function parseDirection(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  if (v in CARDINALS) return CARDINALS[v];
  if (/^\d+(\.\d+)?$/.test(v)) {
    const n = parseFloat(v);
    return n >= 0 && n <= 360 ? n % 360 : null;
  }
  return null;
}
