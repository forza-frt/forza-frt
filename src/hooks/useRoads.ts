import { useEffect, useSyncExternalStore } from 'react';
import { roadStore } from '../services/roadService';
import { bboxAround } from '../utils/geo';

/** Re-renders when the road store changes; returns the store's version counter. */
export function useRoadStoreVersion(): number {
  return useSyncExternalStore(
    (fn) => roadStore.subscribe(fn),
    () => roadStore.version,
  );
}

/** Keeps roads loaded around the user's position (needed for the current speed limit). */
export function useRoadsAroundUser(lat: number | null, lon: number | null): void {
  // Round to ~500 m so we only re-check when the user has actually moved.
  const kLat = lat === null ? null : Math.round(lat * 200) / 200;
  const kLon = lon === null ? null : Math.round(lon * 100) / 100;
  useEffect(() => {
    if (kLat === null || kLon === null || lat === null || lon === null) return;
    roadStore.ensure(bboxAround(lat, lon, 1500));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kLat, kLon]);
}
