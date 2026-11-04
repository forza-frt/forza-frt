import type { Camera } from '../types/camera';
import type { RoadSegment } from '../types/road';
import type { Fix, SpeedReading } from '../types/speed';
import { angleDiff, bearingDeg, distanceM, nearBBox, nearestOnPolyline } from '../utils/geo';

/** Above this horizontal accuracy (m) speed/heading are flagged as unreliable. */
const MAX_RELIABLE_ACCURACY = 35;
/** Below this speed (km/h) we show 0 — GPS jitter at standstill is typically 1–4 km/h. */
const STANDSTILL_KMH = 4;
/** Below this speed heading is meaningless. */
const MIN_HEADING_KMH = 8;

/**
 * Turns raw geolocation fixes into a smoothed speed and heading.
 * Prefers the speed the device reports (Doppler-based on most phones);
 * falls back to distance/time between consecutive fixes.
 */
export class SpeedEstimator {
  private prev: Fix | null = null;
  private smoothed: number | null = null;
  private lastHeading: number | null = null;

  update(fix: Fix): SpeedReading {
    let ms: number | null = null;
    let origin: SpeedReading['origin'] = null;
    if (fix.speed != null && Number.isFinite(fix.speed) && fix.speed >= 0) {
      ms = fix.speed;
      origin = 'gps';
    } else if (this.prev) {
      const dt = (fix.timestamp - this.prev.timestamp) / 1000;
      if (dt >= 0.8 && dt <= 10 && fix.accuracy < 50 && this.prev.accuracy < 50) {
        ms = distanceM(this.prev.lat, this.prev.lon, fix.lat, fix.lon) / dt;
        origin = 'derived';
      }
    }

    let heading: number | null = null;
    if (fix.heading != null && Number.isFinite(fix.heading) && fix.heading >= 0) heading = fix.heading;
    else if (this.prev) {
      const moved = distanceM(this.prev.lat, this.prev.lon, fix.lat, fix.lon);
      if (moved > Math.max(8, fix.accuracy)) heading = bearingDeg(this.prev.lat, this.prev.lon, fix.lat, fix.lon);
    }
    this.prev = fix;

    if (ms === null || ms > 90 /* 324 km/h: certainly a glitch */) {
      this.smoothed = null;
      return { kmh: null, origin: null, heading: this.lastHeading, reliable: false };
    }

    const kmh = ms * 3.6;
    this.smoothed = this.smoothed === null ? kmh : this.smoothed * 0.4 + kmh * 0.6;
    const shown = this.smoothed < STANDSTILL_KMH ? 0 : Math.round(this.smoothed);
    if (shown >= MIN_HEADING_KMH && heading !== null) this.lastHeading = heading;
    else if (shown < MIN_HEADING_KMH) this.lastHeading = null;

    return { kmh: shown, origin, heading: this.lastHeading, reliable: fix.accuracy <= MAX_RELIABLE_ACCURACY };
  }

  reset() {
    this.prev = null;
    this.smoothed = null;
    this.lastHeading = null;
  }
}

export interface CurrentLimit {
  road: RoadSegment;
  /** km/h, null = road found but no limit in the data */
  kmh: number | null;
  distanceM: number;
}

/**
 * Speed limit of the road the user is most likely on.
 * Picks the nearest road within max(20 m, accuracy) whose direction matches the heading
 * (when heading is known), then applies the direction-specific limit if the road has one.
 */
export function currentLimit(
  lat: number,
  lon: number,
  accuracy: number,
  heading: number | null,
  roads: Iterable<RoadSegment>,
): CurrentLimit | null {
  const maxDist = Math.min(40, Math.max(20, accuracy));
  let best: { road: RoadSegment; d: number; score: number; bearing: number } | null = null;
  for (const road of roads) {
    if (!nearBBox(road.bbox, lat, lon, maxDist)) continue;
    const n = nearestOnPolyline(lat, lon, road.coords);
    if (!n || n.distanceM > maxDist) continue;
    let score = n.distanceM;
    if (heading !== null) {
      const diff = angleDiff(heading, n.segmentBearing);
      const along = Math.min(diff, 180 - diff); // road is a line: either direction counts
      if (along > 45) score += 1000; // crossing road, not the one we drive on
      if (road.oneway && diff > 90) score += 500; // wrong way on a one-way road — unlikely
    }
    if (!best || score < best.score) best = { road, d: n.distanceM, score, bearing: n.segmentBearing };
  }
  if (!best || best.score >= 1000) return null;

  const r = best.road;
  let kmh = r.maxspeed;
  if (kmh === null && heading !== null && (r.maxspeedForward !== null || r.maxspeedBackward !== null)) {
    kmh = angleDiff(heading, best.bearing) <= 90 ? r.maxspeedForward : r.maxspeedBackward;
  }
  return { road: r, kmh, distanceM: best.d };
}

export interface CameraWithDistance {
  camera: Camera;
  distanceM: number;
  bearing: number;
}

/**
 * Cameras relevant to the driver.
 * - With a known heading: only cameras within ±35° ahead, up to maxDistM, sorted by distance.
 *   Cameras behind are never returned.
 * - Without heading (standing still / no fix of direction): nearest cameras by plain distance,
 *   and the UI labels them "ближайшая", not "впереди".
 * A camera's own direction is NOT used for filtering, because sources rarely provide it
 * and many cameras enforce both directions.
 */
export function camerasNearby(
  lat: number,
  lon: number,
  heading: number | null,
  cameras: Camera[],
  maxDistM = 3000,
  coneDeg = 35,
): CameraWithDistance[] {
  const dLat = maxDistM / 110540;
  const dLon = maxDistM / (111320 * Math.cos((lat * Math.PI) / 180));
  const out: CameraWithDistance[] = [];
  for (const camera of cameras) {
    if (Math.abs(camera.lat - lat) > dLat || Math.abs(camera.lon - lon) > dLon) continue;
    const d = distanceM(lat, lon, camera.lat, camera.lon);
    if (d > maxDistM) continue;
    const b = bearingDeg(lat, lon, camera.lat, camera.lon);
    // Within 30 m the bearing is dominated by GPS noise; only keep it if heading is unknown.
    if (heading !== null && (d < 30 || angleDiff(heading, b) > coneDeg)) continue;
    out.push({ camera, distanceM: d, bearing: b });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}
