import { useCallback, useState } from 'react';
import { DEFAULT_CITY_ID } from '../config/cities';
import { loadJSON, saveJSON } from '../services/storage';

export interface Settings {
  cityId: string;
  showFixed: boolean;
  showMobile: boolean;
  showSpeedLimits: boolean;
  showRoadNames: boolean;
}

const DEFAULTS: Settings = {
  cityId: DEFAULT_CITY_ID,
  showFixed: true,
  showMobile: true,
  showSpeedLimits: true,
  showRoadNames: true,
};

const KEY = 'radarmap:settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULTS, ...(loadJSON<Partial<Settings>>(KEY) ?? {}) }));
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      saveJSON(KEY, next);
      return next;
    });
  }, []);
  return [settings, update] as const;
}
