import L from 'leaflet';
import { useMemo } from 'react';
import { Circle, Marker } from 'react-leaflet';
import type { Fix } from '../types/speed';

export default function UserLocationMarker({ fix, heading }: { fix: Fix; heading: number | null }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: '',
        html:
          heading === null
            ? '<div class="rm-me"></div>'
            : `<div class="rm-me rm-me--dir" style="transform: rotate(${Math.round(heading)}deg)"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill="#3b82f6" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    [heading === null ? null : Math.round(heading / 5) * 5],
  );
  return (
    <>
      {fix.accuracy > 15 && (
        <Circle
          center={[fix.lat, fix.lon]}
          radius={fix.accuracy}
          pathOptions={{ color: '#3b82f6', weight: 1, opacity: 0.4, fillOpacity: 0.08 }}
          interactive={false}
        />
      )}
      <Marker position={[fix.lat, fix.lon]} icon={icon} interactive={false} zIndexOffset={2000} />
    </>
  );
}
