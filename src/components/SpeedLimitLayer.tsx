import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { useRoadStoreVersion } from '../hooks/useRoads';
import { roadStore } from '../services/roadService';
import type { RoadSegment } from '../types/road';
import { speedColor } from '../utils/format';

const LOAD_MIN_ZOOM = 14;
const SHOW_MIN_ZOOM = 13;

function displayLimit(r: RoadSegment): number | null {
  return r.maxspeed ?? (r.maxspeedForward !== null && r.maxspeedBackward !== null ? Math.min(r.maxspeedForward, r.maxspeedBackward) : r.maxspeedForward ?? r.maxspeedBackward);
}

function styleFor(r: RoadSegment, zoom: number): L.PathOptions {
  const has = displayLimit(r) !== null;
  const w = zoom >= 17 ? 7 : zoom >= 16 ? 5 : zoom >= 15 ? 4 : 3;
  return has
    ? { color: speedColor(displayLimit(r)), weight: w, opacity: 0.85, lineCap: 'round', dashArray: undefined }
    : { color: '#64748b', weight: Math.max(2, w - 2), opacity: 0.45, dashArray: '4 6' };
}

interface Props {
  visible: boolean;
  onSelect: (road: RoadSegment) => void;
}

/**
 * Draws road segments coloured by their OSM speed limit. Imperative Leaflet + a single
 * canvas renderer: thousands of polylines would be far too slow as React components.
 */
export default function SpeedLimitLayer({ visible, onSelect }: Props) {
  const map = useMap();
  const version = useRoadStoreVersion();
  const renderer = useMemo(() => L.canvas({ padding: 0.4, tolerance: 10 }), []);
  const group = useMemo(() => L.layerGroup(), []);
  const lines = useRef(new Map<number, L.Polyline>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Load roads for the viewport (debounced) while the layer is visible.
  useEffect(() => {
    if (!visible) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (map.getZoom() < LOAD_MIN_ZOOM) return;
        const b = map.getBounds().pad(0.15);
        roadStore.ensure([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
      }, 400);
    };
    load();
    map.on('moveend', load);
    return () => {
      clearTimeout(t);
      map.off('moveend', load);
    };
  }, [map, visible]);

  // Sync polylines with the store.
  useEffect(() => {
    const zoom = map.getZoom();
    for (const [id, line] of lines.current) {
      if (!roadStore.roads.has(id)) {
        group.removeLayer(line);
        lines.current.delete(id);
      }
    }
    for (const road of roadStore.roads.values()) {
      if (lines.current.has(road.id)) continue;
      const line = L.polyline(road.coords, { ...styleFor(road, zoom), renderer, interactive: true, bubblingMouseEvents: false });
      line.on('click', () => onSelectRef.current(road));
      line.addTo(group);
      lines.current.set(road.id, line);
    }
  }, [version, map, group, renderer]);

  // Show/hide by toggle and zoom; restyle on zoom.
  useEffect(() => {
    const sync = () => {
      const show = visible && map.getZoom() >= SHOW_MIN_ZOOM;
      if (show && !map.hasLayer(group)) group.addTo(map);
      if (!show && map.hasLayer(group)) map.removeLayer(group);
    };
    const restyle = () => {
      const z = map.getZoom();
      for (const [id, line] of lines.current) {
        const r = roadStore.roads.get(id);
        if (r) line.setStyle(styleFor(r, z));
      }
      sync();
    };
    sync();
    map.on('zoomend', restyle);
    return () => {
      map.off('zoomend', restyle);
      map.removeLayer(group);
    };
  }, [map, group, visible]);

  return null;
}
