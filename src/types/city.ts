import type { DataSourceId } from './camera';

export interface City {
  id: string;
  name: string;
  country: string;
  center: [number, number];
  zoom: number;
  /** [south, west, north, east] — area within which cameras are loaded */
  bbox: [number, number, number, number];
  /** Camera data sources available for this city. Empty = no cameras for this city yet. */
  sources: DataSourceId[];
}
