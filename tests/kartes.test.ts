import { describe, expect, it } from 'vitest';
import { buildUrl, classifyKind, normalize } from '../server/kartes';

describe('kartes.lv adapter normaliser', () => {
  it('reads GeoJSON points', () => {
    const r = normalize({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [24.1, 56.95] }, properties: { id: 7, type: 'Stacionārais', speed: 50, street: 'Brīvības iela' } }],
    });
    expect(r).toEqual([expect.objectContaining({ id: 'kartes-7', lat: 56.95, lon: 24.1, kind: 'fixed', maxspeed: 50, road: 'Brīvības iela' })]);
  });
  it('reads plain arrays and rejects coordinates outside Latvia', () => {
    const r = normalize({ data: [{ lat: '56.9', lng: '24.2' }, { x: 506000, y: 312000 }] });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kind: 'unknown', maxspeed: null, direction: null });
  });
  it('classifies kinds without guessing', () => {
    expect(classifyKind('Mobilais radars')).toBe('mobile_zone');
    expect(classifyKind('average speed')).toBe('average_speed');
    expect(classifyKind('fixed')).toBe('fixed');
    expect(classifyKind('xyz')).toBe('unknown');
    expect(classifyKind(null)).toBe('unknown');
  });
  it('builds URL from template', () => {
    expect(buildUrl('https://h/p?k={key}&b={west},{south},{east},{north}', 'a b', [1, 2, 3, 4])).toBe('https://h/p?k=a%20b&b=2,1,4,3');
  });
});
