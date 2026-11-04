import { describe, expect, it } from 'vitest';
import { angleDiff, bearingDeg, distanceM, nearestOnPolyline } from '../src/utils/geo';
import { parseDirection, parseMaxspeed, wayLimits } from '../src/utils/maxspeed';
import { formatDistance } from '../src/utils/format';

describe('geo', () => {
  it('distance Riga Freedom Monument → Riga Castle ≈ 1.0 km', () => {
    const d = distanceM(56.95146, 24.11319, 56.95, 24.0997);
    expect(d).toBeGreaterThan(780);
    expect(d).toBeLessThan(880);
  });
  it('bearing north/east', () => {
    expect(bearingDeg(56, 24, 57, 24)).toBeCloseTo(0, 1);
    expect(bearingDeg(56, 24, 56, 24.01)).toBeCloseTo(90, 0);
  });
  it('angleDiff wraps', () => {
    expect(angleDiff(350, 10)).toBe(20);
    expect(angleDiff(10, 190)).toBe(180);
  });
  it('point to polyline distance', () => {
    const line: [number, number][] = [[56.95, 24.1], [56.95, 24.12]];
    const n = nearestOnPolyline(56.9501, 24.11, line)!;
    expect(n.distanceM).toBeGreaterThan(9);
    expect(n.distanceM).toBeLessThan(13);
    expect(n.segmentBearing).toBeCloseTo(90, 0);
  });
});

describe('maxspeed parsing', () => {
  it.each([
    ['50', 50], ['30 km/h', 30], ['LV:urban', 50], ['LV:rural', 90], ['RU:urban', 60],
    ['30 mph', 48], ['none', null], ['signals', null], ['50;70', null], ['', null], [undefined, null],
  ])('%s → %s', (raw, exp) => expect(parseMaxspeed(raw as string)).toBe(exp));

  it('direction-specific limits', () => {
    expect(wayLimits({ 'maxspeed:forward': '50', 'maxspeed:backward': '70' })).toMatchObject({
      maxspeed: null, maxspeedForward: 50, maxspeedBackward: 70,
    });
    expect(wayLimits({ maxspeed: '50' })).toMatchObject({ maxspeed: 50, maxspeedForward: 50, maxspeedBackward: 50 });
    expect(wayLimits({})).toMatchObject({ maxspeed: null, maxspeedRaw: null });
  });

  it('direction tag', () => {
    expect(parseDirection('NE')).toBe(45);
    expect(parseDirection('270')).toBe(270);
    expect(parseDirection('forward')).toBeNull();
    expect(parseDirection(undefined)).toBeNull();
  });
});

describe('format', () => {
  it('distance', () => {
    expect(formatDistance(347)).toBe('350 м');
    expect(formatDistance(1530)).toBe('1,5 км');
  });
});
