export interface Fix {
  lat: number;
  lon: number;
  /** metres, 68% confidence as reported by the device */
  accuracy: number;
  /** m/s as reported by the device, null if not provided */
  speed: number | null;
  /** degrees, null if not provided */
  heading: number | null;
  timestamp: number;
}

export interface SpeedReading {
  /** km/h, null = unavailable */
  kmh: number | null;
  /** 'gps' = from the device, 'derived' = computed from consecutive positions */
  origin: 'gps' | 'derived' | null;
  /** degrees, direction of travel; null if unknown (e.g. standing still) */
  heading: number | null;
  /** false when the GPS accuracy is too poor to trust */
  reliable: boolean;
}

export type GeoStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable' | 'unsupported';
