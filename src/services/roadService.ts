import type { RoadSegment } from '../types/road';
import type { BBox } from '../utils/geo';
import { parseRoad } from './osmParse';
import { overpassQuery, roadsQuery } from './overpass';

const CELL_LAT = 0.015; // ≈ 1.7 km
const CELL_LON = 0.025; // ≈ 1.5 km at 57°N
const MAX_CELLS_PER_REQUEST = 12;
const MAX_ROADS = 25000;
const RETRY_AFTER_MS = 30000;

type Listener = () => void;

/**
 * Loads road segments (with their speed limits) from OpenStreetMap in grid cells,
 * so panning the map does not re-download what is already loaded.
 */
export class RoadStore {
  readonly roads = new Map<number, RoadSegment>();
  private loaded = new Set<string>();
  private inflight = new Set<string>();
  private failedAt = 0;
  private listeners = new Set<Listener>();
  version = 0;
  loading = false;
  lastError: string | null = null;

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  static cellsFor(b: BBox): string[] {
    const keys: string[] = [];
    for (let y = Math.floor(b[0] / CELL_LAT); y <= Math.floor(b[2] / CELL_LAT); y++) {
      for (let x = Math.floor(b[1] / CELL_LON); x <= Math.floor(b[3] / CELL_LON); x++) keys.push(`${y}:${x}`);
    }
    return keys;
  }

  private static cellBBox(keys: string[]): BBox {
    let s = Infinity, w = Infinity, n = -Infinity, e = -Infinity;
    for (const k of keys) {
      const [y, x] = k.split(':').map(Number);
      s = Math.min(s, y * CELL_LAT);
      n = Math.max(n, (y + 1) * CELL_LAT);
      w = Math.min(w, x * CELL_LON);
      e = Math.max(e, (x + 1) * CELL_LON);
    }
    return [s, w, n, e];
  }

  /** Make sure roads covering bbox are loaded. Returns false if the area is too large to load. */
  async ensure(b: BBox): Promise<boolean> {
    const all = RoadStore.cellsFor(b);
    if (all.length > MAX_CELLS_PER_REQUEST * 2) return false;
    const missing = all.filter((k) => !this.loaded.has(k) && !this.inflight.has(k)).slice(0, MAX_CELLS_PER_REQUEST);
    if (missing.length === 0) return true;
    if (Date.now() - this.failedAt < RETRY_AFTER_MS) return true;

    missing.forEach((k) => this.inflight.add(k));
    this.loading = true;
    this.emit();
    try {
      const res = await overpassQuery(roadsQuery(RoadStore.cellBBox(missing)));
      if (this.roads.size > MAX_ROADS) {
        this.roads.clear();
        this.loaded.clear();
      }
      for (const el of res.elements) {
        const r = parseRoad(el);
        if (r) this.roads.set(r.id, r);
      }
      missing.forEach((k) => this.loaded.add(k));
      this.lastError = null;
    } catch (e) {
      this.failedAt = Date.now();
      this.lastError = e instanceof Error ? e.message : String(e);
    } finally {
      missing.forEach((k) => this.inflight.delete(k));
      this.loading = this.inflight.size > 0;
      this.emit();
    }
    return true;
  }
}

export const roadStore = new RoadStore();
