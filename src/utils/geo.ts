const R = 6371008.8; // mean Earth radius, metres
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in metres. */
export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing from point 1 to point 2, degrees 0..360 (0 = north, 90 = east). */
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest absolute difference between two angles, 0..180. */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
}

export function polylineLengthM(coords: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    len += distanceM(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
  }
  return len;
}

export interface NearestOnLine {
  distanceM: number;
  /** bearing of the segment the nearest point lies on, in the drawing direction of the line */
  segmentBearing: number;
}

/**
 * Distance from a point to a polyline. Uses a local equirectangular projection,
 * which is accurate to well under 1 % at city scale.
 */
export function nearestOnPolyline(lat: number, lon: number, coords: [number, number][]): NearestOnLine | null {
  if (coords.length === 0) return null;
  const kx = Math.cos(toRad(lat)) * 111320;
  const ky = 110540;
  let best: NearestOnLine | null = null;
  if (coords.length === 1) {
    return { distanceM: distanceM(lat, lon, coords[0][0], coords[0][1]), segmentBearing: 0 };
  }
  for (let i = 1; i < coords.length; i++) {
    const ax = (coords[i - 1][1] - lon) * kx;
    const ay = (coords[i - 1][0] - lat) * ky;
    const bx = (coords[i][1] - lon) * kx;
    const by = (coords[i][0] - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : -(ax * dx + ay * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d = Math.sqrt(px * px + py * py);
    if (!best || d < best.distanceM) {
      best = {
        distanceM: d,
        segmentBearing: bearingDeg(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]),
      };
    }
  }
  return best;
}

/** [south, west, north, east] */
export type BBox = [number, number, number, number];

export function bboxContains(b: BBox, lat: number, lon: number): boolean {
  return lat >= b[0] && lat <= b[2] && lon >= b[1] && lon <= b[3];
}

/** Rough bbox around a point, radius in metres. */
export function bboxAround(lat: number, lon: number, radiusM: number): BBox {
  const dLat = radiusM / 110540;
  const dLon = radiusM / (111320 * Math.cos(toRad(lat)));
  return [lat - dLat, lon - dLon, lat + dLat, lon + dLon];
}

/** True if (lat, lon) is within ~marginM of the bbox (cheap pre-filter). */
export function nearBBox(b: BBox, lat: number, lon: number, marginM: number): boolean {
  const dLat = marginM / 110540;
  const dLon = marginM / (111320 * Math.cos(toRad(lat)));
  return lat >= b[0] - dLat && lat <= b[2] + dLat && lon >= b[1] - dLon && lon <= b[3] + dLon;
}
