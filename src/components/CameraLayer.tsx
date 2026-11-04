import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import type { Camera } from '../types/camera';
import CameraMarker from './CameraMarker';

interface Props {
  cameras: Camera[];
  showFixed: boolean;
  showMobile: boolean;
  highlightId: string | null;
  onSelect: (c: Camera) => void;
}

/** Renders only markers inside the (padded) viewport to keep the DOM small on phones. */
export default function CameraLayer({ cameras, showFixed, showMobile, highlightId, onSelect }: Props) {
  const map = useMap();
  const [bounds, setBounds] = useState(() => map.getBounds().pad(0.3));
  const [zoom, setZoom] = useState(() => map.getZoom());

  useEffect(() => {
    const update = () => {
      setBounds(map.getBounds().pad(0.3));
      setZoom(map.getZoom());
    };
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [map]);

  if (zoom < 10) return null;
  return (
    <>
      {cameras
        .filter((c) => (c.kind === 'mobile_zone' ? showMobile : showFixed))
        .filter((c) => c.id === highlightId || bounds.contains([c.lat, c.lon]))
        .map((c) => (
          <CameraMarker key={c.id} camera={c} highlighted={c.id === highlightId} onSelect={onSelect} />
        ))}
    </>
  );
}
