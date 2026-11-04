import { describe, expect, it } from 'vitest';
import { parseCameras } from '../src/services/osmParse';
import type { OsmElement } from '../src/services/overpass';

const road = (id: number, tags: Record<string, string>, coords: [number, number][]): OsmElement => ({
  type: 'way', id, tags: { highway: 'primary', ...tags }, geometry: coords.map(([lat, lon]) => ({ lat, lon })),
});

describe('parseCameras', () => {
  it('takes limit from the camera, else from the road, else null — never invented', () => {
    const els: OsmElement[] = [
      { type: 'node', id: 1, lat: 56.95, lon: 24.11, tags: { highway: 'speed_camera', maxspeed: '50' } },
      { type: 'node', id: 2, lat: 56.96, lon: 24.11, tags: { highway: 'speed_camera' } },
      { type: 'node', id: 3, lat: 56.98, lon: 24.11, tags: { highway: 'speed_camera', direction: 'forward' } },
      road(10, { name: 'Brīvības gatve', maxspeed: '70' }, [[56.96, 24.10], [56.96, 24.12]]),
      road(11, { name: 'Bez ierobežojuma' }, [[56.98, 24.10], [56.98, 24.12]]),
    ];
    const cams = parseCameras(els);
    expect(cams).toHaveLength(3);
    const byId = Object.fromEntries(cams.map((c) => [c.id, c]));
    expect(byId['osm-1']).toMatchObject({ maxspeed: 50, maxspeedOrigin: 'camera', kind: 'fixed' });
    expect(byId['osm-2']).toMatchObject({ maxspeed: 70, maxspeedOrigin: 'road', road: 'Brīvības gatve' });
    expect(byId['osm-3']).toMatchObject({ maxspeed: null, maxspeedOrigin: null, direction: null, directionLabel: 'forward' });
  });

  it('enforcement relations: average speed devices are typed separately', () => {
    const els: OsmElement[] = [
      { type: 'node', id: 5, lat: 56.9, lon: 24.2, tags: {} },
      { type: 'relation', id: 99, tags: { type: 'enforcement', enforcement: 'average_speed', maxspeed: '90' }, members: [{ type: 'node', ref: 5, role: 'device' }] },
      { type: 'node', id: 6, lat: 56.9, lon: 24.3, tags: { amenity: 'bench' } },
    ];
    const cams = parseCameras(els);
    expect(cams).toHaveLength(1);
    expect(cams[0]).toMatchObject({ id: 'osm-5', kind: 'average_speed', maxspeed: 90 });
  });
});
