import L from 'leaflet';
import { memo, useMemo } from 'react';
import { Marker } from 'react-leaflet';
import type { Camera } from '../types/camera';

const iconCache = new Map<string, L.DivIcon>();

function cameraIcon(cam: Camera, highlighted: boolean): L.DivIcon {
  const key = `${cam.kind}|${cam.maxspeed ?? '-'}|${highlighted}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const badge = cam.maxspeed !== null ? `<span class="rm-cam-badge">${cam.maxspeed}</span>` : '';
    icon = L.divIcon({
      className: '',
      html: `<div class="rm-cam rm-cam--${cam.kind}${highlighted ? ' rm-cam--hl' : ''}">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="2" y="7" width="13" height="10" rx="2.5" fill="currentColor"/><path d="M16 10.5l6-3.5v10l-6-3.5z" fill="currentColor"/></svg>
        ${badge}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    iconCache.set(key, icon);
  }
  return icon;
}

interface Props {
  camera: Camera;
  highlighted: boolean;
  onSelect: (c: Camera) => void;
}

function CameraMarker({ camera, highlighted, onSelect }: Props) {
  const icon = useMemo(() => cameraIcon(camera, highlighted), [camera, highlighted]);
  const handlers = useMemo(() => ({ click: () => onSelect(camera) }), [camera, onSelect]);
  return (
    <Marker
      position={[camera.lat, camera.lon]}
      icon={icon}
      eventHandlers={handlers}
      keyboard={false}
      zIndexOffset={highlighted ? 1000 : camera.kind === 'mobile_zone' ? -100 : 0}
      title={camera.road ?? 'Камера'}
    />
  );
}

export default memo(CameraMarker);
