export interface RoadSegment {
  /** OSM way id */
  id: number;
  name: string | null;
  ref: string | null;
  highway: string;
  /** km/h for both directions; null when unknown or direction-dependent */
  maxspeed: number | null;
  /** km/h in the direction the way is drawn in OSM */
  maxspeedForward: number | null;
  /** km/h against the direction the way is drawn in OSM */
  maxspeedBackward: number | null;
  /** The raw OSM tag text, shown to the user for transparency */
  maxspeedRaw: string | null;
  oneway: boolean;
  /** [lat, lon][] */
  coords: [number, number][];
  lengthM: number;
  /** [south, west, north, east], for quick rejection in proximity searches */
  bbox: [number, number, number, number];
}
