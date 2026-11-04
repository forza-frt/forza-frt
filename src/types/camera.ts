/**
 * Camera kinds are kept strictly separate:
 *  - fixed:          stationary speed camera (OSM highway=speed_camera or a source that says "stationary")
 *  - average_speed:  section / average-speed control (OSM enforcement=average_speed)
 *  - mobile_zone:    a POSSIBLE location of a mobile camera. Never means "a camera is there now".
 *  - unknown:        the source did not say which type it is.
 */
export type CameraKind = 'fixed' | 'average_speed' | 'mobile_zone' | 'unknown';

export type DataSourceId = 'osm' | 'kartes';

export interface Camera {
  id: string;
  lat: number;
  lon: number;
  kind: CameraKind;
  /** km/h; null = no data */
  maxspeed: number | null;
  /** where the limit came from: tagged on the camera itself, or on the road segment it sits on */
  maxspeedOrigin: 'camera' | 'road' | null;
  road: string | null;
  /** Direction in degrees (0 = north) if the source states it numerically */
  direction: number | null;
  /** Human-readable direction as given by the source (e.g. "NE", "forward"); null if unknown */
  directionLabel: string | null;
  source: DataSourceId;
  /** Link to the original object (e.g. the OSM node) */
  sourceUrl?: string;
}

export type SourceStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ok'; count: number }
  | { state: 'not_configured'; message: string }
  | { state: 'error'; message: string };

export interface CameraDataset {
  cityId: string;
  cameras: Camera[];
  /** When this data was actually fetched from the source(s) (ms epoch). null = never */
  fetchedAt: number | null;
  /** true if a refresh failed and we are showing older data */
  stale: boolean;
  loading: boolean;
  sources: Record<DataSourceId, SourceStatus>;
}
