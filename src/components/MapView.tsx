import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap } from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Pane, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { Camera } from '../types/camera';
import type { City } from '../types/city';
import type { RoadSegment } from '../types/road';
import type { Fix } from '../types/speed';
import CameraLayer from './CameraLayer';
import SpeedLimitLayer from './SpeedLimitLayer';
import UserLocationMarker from './UserLocationMarker';

const ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

interface Props {
  city: City;
  cameras: Camera[];
  fix: Fix | null;
  heading: number | null;
  follow: boolean;
  showFixed: boolean;
  showMobile: boolean;
  showSpeedLimits: boolean;
  showRoadNames: boolean;
  highlightCameraId: string | null;
  onCameraSelect: (c: Camera) => void;
  onRoadSelect: (r: RoadSegment) => void;
  onUserPan: () => void;
  onMapClick: () => void;
  onReady: (map: LeafletMap) => void;
}

function MapEvents({ onUserPan, onMapClick, onReady }: Pick<Props, 'onUserPan' | 'onMapClick' | 'onReady'>) {
  const map = useMapEvents({
    dragstart: onUserPan,
    click: onMapClick,
  });
  useEffect(() => onReady(map), [map, onReady]);
  return null;
}

function CityFlyTo({ city }: { city: City }) {
  const map = useMap();
  useEffect(() => {
    map.setView(city.center, city.zoom, { animate: false });
  }, [city, map]);
  return null;
}

function Follow({ fix, follow }: { fix: Fix | null; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (follow && fix) map.panTo([fix.lat, fix.lon], { animate: true, duration: 0.5 });
  }, [fix, follow, map]);
  return null;
}

export default function MapView(p: Props) {
  return (
    <MapContainer
      center={p.city.center}
      zoom={p.city.zoom}
      zoomControl={false}
      attributionControl
      className="h-full w-full"
      worldCopyJump={false}
      minZoom={5}
      maxZoom={19}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
        attribution={ATTR}
        detectRetina={false}
      />
      <Pane name="labels" style={{ zIndex: 450, pointerEvents: 'none' }}>
        {p.showRoadNames && (
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={19} />
        )}
      </Pane>
      <SpeedLimitLayer visible={p.showSpeedLimits} onSelect={p.onRoadSelect} />
      <CameraLayer
        cameras={p.cameras}
        showFixed={p.showFixed}
        showMobile={p.showMobile}
        highlightId={p.highlightCameraId}
        onSelect={p.onCameraSelect}
      />
      {p.fix && <UserLocationMarker fix={p.fix} heading={p.heading} />}
      <CityFlyTo city={p.city} />
      <Follow fix={p.fix} follow={p.follow} />
      <MapEvents onUserPan={p.onUserPan} onMapClick={p.onMapClick} onReady={p.onReady} />
    </MapContainer>
  );
}
