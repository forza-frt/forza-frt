import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAMERA_CACHE_TTL_MS,
  fetchAllSources,
  loadCachedCameras,
  mergeCameras,
  saveCachedCameras,
} from '../services/cameraService';
import type { CameraDataset, DataSourceId, SourceStatus } from '../types/camera';
import type { City } from '../types/city';

const idle: Record<DataSourceId, SourceStatus> = { osm: { state: 'idle' }, kartes: { state: 'idle' } };

export function useCameras(city: City): CameraDataset & { refresh: () => void } {
  const [data, setData] = useState<CameraDataset>(() => fromCache(city));
  const ctrl = useRef<AbortController | null>(null);

  const load = useCallback(
    async (force: boolean) => {
      ctrl.current?.abort();
      const cached = loadCachedCameras(city.id);
      const base = fromCache(city);
      if (!force && cached && Date.now() - cached.fetchedAt < CAMERA_CACHE_TTL_MS) {
        setData({ ...base, sources: cachedStatus(city, cached.bySource) });
        return;
      }
      if (city.sources.length === 0) {
        setData({ ...base, loading: false });
        return;
      }
      const c = new AbortController();
      ctrl.current = c;
      setData({ ...base, loading: true, sources: loadingStatus(city) });
      try {
        const { bySource, status } = await fetchAllSources(city, c.signal);
        if (c.signal.aborted) return;
        const anyOk = Object.values(status).some((s) => s.state === 'ok');
        if (anyOk) {
          // A source that failed this time keeps its previously cached cameras, but the set is marked stale.
          const failedWithCache = (Object.keys(status) as DataSourceId[]).filter(
            (id) => status[id].state === 'error' && cached?.bySource[id],
          );
          const merged = { ...bySource };
          failedWithCache.forEach((id) => (merged[id] = cached!.bySource[id]));
          const fetchedAt = Date.now();
          saveCachedCameras({ version: 1, cityId: city.id, fetchedAt, bySource });
          setData({
            cityId: city.id,
            cameras: mergeCameras(merged),
            fetchedAt,
            stale: failedWithCache.length > 0,
            loading: false,
            sources: status,
          });
        } else {
          // Nothing could be loaded: keep what we had and flag it as outdated.
          setData({ ...base, stale: base.fetchedAt !== null, loading: false, sources: status });
        }
      } catch {
        /* aborted */
      }
    },
    [city],
  );

  useEffect(() => {
    setData(fromCache(city));
    load(false);
    return () => ctrl.current?.abort();
  }, [city, load]);

  const refresh = useCallback(() => load(true), [load]);
  return { ...data, refresh };
}

function fromCache(city: City): CameraDataset {
  const cached = loadCachedCameras(city.id);
  return {
    cityId: city.id,
    cameras: cached ? mergeCameras(cached.bySource) : [],
    fetchedAt: cached?.fetchedAt ?? null,
    stale: false,
    loading: false,
    sources: idle,
  };
}

function loadingStatus(city: City): Record<DataSourceId, SourceStatus> {
  const s = { ...idle };
  city.sources.forEach((id) => (s[id] = { state: 'loading' }));
  return s;
}

function cachedStatus(city: City, bySource: Partial<Record<DataSourceId, unknown[]>>): Record<DataSourceId, SourceStatus> {
  const s: Record<DataSourceId, SourceStatus> = {
    osm: { state: 'not_configured', message: 'Источник не используется для этого города' },
    kartes: { state: 'not_configured', message: 'Источник не используется для этого города' },
  };
  city.sources.forEach((id) => {
    const list = bySource[id];
    s[id] = list ? { state: 'ok', count: list.length } : { state: 'not_configured', message: 'Нет данных в кеше — нажмите «Обновить»' };
  });
  return s;
}
