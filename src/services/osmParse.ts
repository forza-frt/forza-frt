import type { Camera } from '../types/camera';
import type { RoadSegment } from '../types/road';
import { nearBBox, nearestOnPolyline, polylineLengthM } from '../utils/geo';
import { parseDirection, parseMaxspeed, wayLimits } from '../utils/maxspeed';
import type { OsmElement } from './overpass';

export function parseRoad(el: OsmElement): RoadSegment | null {
  if (el.type !== 'way' || !el.geometry || el.geometry.length < 2) return null;
  const tags = el.tags ?? {};
  const coords = el.geometry.map((g) => [g.lat, g.lon] as [number, number]);
  return {
    id: el.id,
    name: tags.name ?? null,
    ref: tags.ref ?? null,
    highway: tags.highway ?? 'road',
    ...wayLimits(tags),
    oneway: tags.oneway === 'yes' || tags.oneway === '1' || tags.highway === 'motorway' || tags.junction === 'roundabout',
    coords,
    lengthM: polylineLengthM(coords),
    bbox: [
      Math.min(...coords.map((c) => c[0])),
      Math.min(...coords.map((c) => c[1])),
      Math.max(...coords.map((c) => c[0])),
      Math.max(...coords.map((c) => c[1])),
    ],
  };
}

/** Nearest road to a point, within maxDistM. */
export function nearestRoad(lat: number, lon: number, roads: Iterable<RoadSegment>, maxDistM: number) {
  let best: { road: RoadSegment; distanceM: number; segmentBearing: number } | null = null;
  for (const road of roads) {
    if (!nearBBox(road.bbox, lat, lon, maxDistM)) continue;
    const n = nearestOnPolyline(lat, lon, road.coords);
    if (n && n.distanceM <= maxDistM && (!best || n.distanceM < best.distanceM)) {
      best = { road, distanceM: n.distanceM, segmentBearing: n.segmentBearing };
    }
  }
  return best;
}

/**
 * Convert an Overpass camera query result into cameras.
 * Nothing is guessed: a speed limit is taken from the camera node, then from its
 * enforcement relation, then from the road it is mapped on (within 30 m); otherwise null.
 */
export function parseCameras(elements: OsmElement[]): Camera[] {
  const nodes = new Map<number, OsmElement>();
  const relations: OsmElement[] = [];
  const roads: RoadSegment[] = [];
  for (const el of elements) {
    if (el.type === 'node' && el.lat != null && el.lon != null) nodes.set(el.id, el);
    else if (el.type === 'relation') relations.push(el);
    else if (el.type === 'way') {
      const r = parseRoad(el);
      if (r) roads.push(r);
    }
  }

  // device node id → its enforcement relation
  const relOfDevice = new Map<number, OsmElement>();
  for (const rel of relations) {
    for (const m of rel.members ?? []) {
      if (m.type === 'node' && m.role === 'device') relOfDevice.set(m.ref, rel);
    }
  }

  const cameras: Camera[] = [];
  for (const node of nodes.values()) {
    const tags = node.tags ?? {};
    const rel = relOfDevice.get(node.id);
    const relTags = rel?.tags ?? {};
    const isCamera = tags.highway === 'speed_camera' || relTags.enforcement === 'maxspeed' || relTags.enforcement === 'average_speed';
    if (!isCamera) continue;

    const near = nearestRoad(node.lat!, node.lon!, roads, 30);
    let maxspeed = parseMaxspeed(tags.maxspeed) ?? parseMaxspeed(relTags.maxspeed);
    let maxspeedOrigin: Camera['maxspeedOrigin'] = maxspeed !== null ? 'camera' : null;
    if (maxspeed === null && near) {
      // Only use the road value when it is the same in both directions — otherwise we'd have to guess.
      if (near.road.maxspeed !== null) {
        maxspeed = near.road.maxspeed;
        maxspeedOrigin = 'road';
      }
    }

    const dirRaw = tags.direction ?? tags['camera:direction'] ?? relTags.direction ?? null;
    cameras.push({
      id: `osm-${node.id}`,
      lat: node.lat!,
      lon: node.lon!,
      kind: relTags.enforcement === 'average_speed' ? 'average_speed' : 'fixed',
      maxspeed,
      maxspeedOrigin,
      road: tags['addr:street'] ?? near?.road.name ?? near?.road.ref ?? tags.name ?? null,
      direction: parseDirection(dirRaw),
      directionLabel: dirRaw,
      source: 'osm',
      sourceUrl: `https://www.openstreetmap.org/node/${node.id}`,
    });
  }
  return cameras;
}
