import type { City } from '../types/city';

/**
 * Each city lists its own data sources. To add a city (e.g. Moscow) add an entry here:
 *
 *   { id: 'moscow', name: 'Москва', country: 'RU', center: [55.7558, 37.6173], zoom: 12,
 *     bbox: [55.49, 37.29, 56.01, 37.97], sources: ['osm'] },
 *
 * 'osm' works anywhere OpenStreetMap has data; 'kartes' is Latvia only.
 */
export const CITIES: City[] = [
  { id: 'riga', name: 'Rīga', country: 'LV', center: [56.9496, 24.1052], zoom: 13, bbox: [56.85, 23.93, 57.09, 24.33], sources: ['osm', 'kartes'] },
  { id: 'jurmala', name: 'Jūrmala', country: 'LV', center: [56.968, 23.77], zoom: 13, bbox: [56.92, 23.45, 57.02, 23.95], sources: ['osm', 'kartes'] },
  { id: 'jelgava', name: 'Jelgava', country: 'LV', center: [56.6511, 23.7214], zoom: 13, bbox: [56.6, 23.63, 56.7, 23.82], sources: ['osm', 'kartes'] },
  { id: 'daugavpils', name: 'Daugavpils', country: 'LV', center: [55.8747, 26.5362], zoom: 13, bbox: [55.82, 26.42, 55.93, 26.65], sources: ['osm', 'kartes'] },
  { id: 'liepaja', name: 'Liepāja', country: 'LV', center: [56.5047, 21.0108], zoom: 13, bbox: [56.45, 20.95, 56.58, 21.1], sources: ['osm', 'kartes'] },
  { id: 'ventspils', name: 'Ventspils', country: 'LV', center: [57.3894, 21.5606], zoom: 13, bbox: [57.35, 21.5, 57.43, 21.65], sources: ['osm', 'kartes'] },
  { id: 'valmiera', name: 'Valmiera', country: 'LV', center: [57.5385, 25.4264], zoom: 13, bbox: [57.5, 25.35, 57.58, 25.5], sources: ['osm', 'kartes'] },
];

export const DEFAULT_CITY_ID = 'riga';

export function getCity(id: string): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}
