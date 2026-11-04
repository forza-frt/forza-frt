import { describe, expect, it } from 'vitest';
import { mergeCameras } from '../src/services/cameraService';
import { SpeedEstimator, camerasNearby, currentLimit } from '../src/services/speedService';
import { parseRoad } from '../src/services/osmParse';
import type { Camera } from '../src/types/camera';
import type { RoadSegment } from '../src/types/road';

const cam = (id: string, lat: number, lon: number, extra: Partial<Camera> = {}): Camera => ({
  id, lat, lon, kind: 'fixed', maxspeed: 50, maxspeedOrigin: 'camera', road: 'Test', direction: null,
  directionLabel: null, source: 'osm', ...extra,
});

const mkRoad = (id: number, tags: Record<string, string>, coords: [number, number][]): RoadSegment =>
  parseRoad({ type: 'way', id, tags: { highway: 'primary', ...tags }, geometry: coords.map(([lat, lon]) => ({ lat, lon })) })!;

describe('SpeedEstimator', () => {
  it('uses device speed, converts to km/h and smooths', () => {
    const e = new SpeedEstimator();
    const r = e.update({ lat: 56.95, lon: 24.1, accuracy: 5, speed: 13.9, heading: 90, timestamp: 0 });
    expect(r).toMatchObject({ kmh: 50, origin: 'gps', heading: 90, reliable: true });
  });
  it('derives speed from positions when device speed is missing', () => {
    const e = new SpeedEstimator();
    e.update({ lat: 56.95, lon: 24.1, accuracy: 5, speed: null, heading: null, timestamp: 0 });
    // ~ 13.9 m north in 1 s ≈ 50 km/h
    const r = e.update({ lat: 56.95 + 13.9 / 110540, lon: 24.1, accuracy: 5, speed: null, heading: null, timestamp: 1000 });
    expect(r.origin).toBe('derived');
    expect(r.kmh).toBeGreaterThan(45);
    expect(r.kmh).toBeLessThan(55);
    expect(r.heading).toBeCloseTo(0, 0);
  });
  it('shows 0 at standstill and no heading; flags poor accuracy', () => {
    const e = new SpeedEstimator();
    const r = e.update({ lat: 56.95, lon: 24.1, accuracy: 80, speed: 0.5, heading: 120, timestamp: 0 });
    expect(r).toMatchObject({ kmh: 0, heading: null, reliable: false });
  });
  it('returns unavailable when nothing can be computed', () => {
    const r = new SpeedEstimator().update({ lat: 56.95, lon: 24.1, accuracy: 5, speed: null, heading: null, timestamp: 0 });
    expect(r.kmh).toBeNull();
  });
});

describe('camerasNearby', () => {
  const me = { lat: 56.95, lon: 24.1 };
  const ahead = cam('ahead', 56.955, 24.1); // ~550 m north
  const behind = cam('behind', 56.945, 24.1); // ~550 m south
  const side = cam('side', 56.95, 24.11); // ~600 m east
  const far = cam('far', 57.0, 24.1); // ~5.5 km

  it('with heading: only cameras ahead, never behind', () => {
    const r = camerasNearby(me.lat, me.lon, 0, [behind, side, ahead, far]);
    expect(r.map((x) => x.camera.id)).toEqual(['ahead']);
    expect(r[0].distanceM).toBeGreaterThan(500);
    expect(r[0].distanceM).toBeLessThan(600);
  });
  it('without heading: nearest by distance', () => {
    const r = camerasNearby(me.lat, me.lon, null, [far, side, behind, ahead]);
    expect(r.map((x) => x.camera.id)).toEqual(['ahead', 'behind', 'side']);
  });
});

describe('currentLimit', () => {
  const ew = mkRoad(1, { maxspeed: '50', name: 'East-West' }, [[56.95, 24.09], [56.95, 24.11]]);
  const ns = mkRoad(2, { maxspeed: '30', name: 'North-South' }, [[56.94, 24.1003], [56.96, 24.1003]]);
  const dir = mkRoad(3, { 'maxspeed:forward': '70', 'maxspeed:backward': '50' }, [[57.0, 24.0], [57.0, 24.02]]);

  it('prefers the road aligned with heading at an intersection', () => {
    expect(currentLimit(56.95, 24.1, 5, 90, [ew, ns])?.kmh).toBe(50);
    expect(currentLimit(56.95, 24.1, 5, 0, [ew, ns])?.kmh).toBe(30);
  });
  it('uses the direction-specific limit', () => {
    expect(currentLimit(57.0, 24.01, 5, 90, [dir])?.kmh).toBe(70);
    expect(currentLimit(57.0, 24.01, 5, 270, [dir])?.kmh).toBe(50);
    expect(currentLimit(57.0, 24.01, 5, null, [dir])?.kmh).toBeNull();
  });
  it('returns null when no road is near', () => {
    expect(currentLimit(56.5, 24.5, 5, null, [ew, ns])).toBeNull();
  });
  it('road without limit → found, but kmh null ("Нет данных")', () => {
    const r = mkRoad(4, { name: 'X' }, [[56.9, 24.0], [56.9, 24.02]]);
    expect(currentLimit(56.9, 24.01, 5, null, [r])).toMatchObject({ kmh: null });
  });
});

describe('mergeCameras', () => {
  it('kartes.lv wins over an OSM duplicate; mobile zones never merge', () => {
    const k = cam('k1', 56.95, 24.1, { source: 'kartes' });
    const m = cam('k2', 56.96, 24.1, { source: 'kartes', kind: 'mobile_zone' });
    const o1 = cam('o1', 56.95005, 24.1, { source: 'osm' }); // 5 m from k1
    const o2 = cam('o2', 56.96005, 24.1, { source: 'osm' }); // 5 m from a mobile zone → kept
    expect(mergeCameras({ kartes: [k, m], osm: [o1, o2] }).map((c) => c.id)).toEqual(['k1', 'k2', 'o2']);
  });
});
