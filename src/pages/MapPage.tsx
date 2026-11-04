import type { Map as LeafletMap } from 'leaflet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BottomPanel from '../components/BottomPanel';
import CameraDetails from '../components/CameraDetails';
import CitySheet from '../components/CitySheet';
import DataStatus from '../components/DataStatus';
import LayersSheet from '../components/LayersSheet';
import LocationButton from '../components/LocationButton';
import MapView from '../components/MapView';
import RoadDetails from '../components/RoadDetails';
import TopBar from '../components/TopBar';
import { getCity } from '../config/cities';
import { useCameras } from '../hooks/useCameras';
import { useGeolocation } from '../hooks/useGeolocation';
import { useRoadStoreVersion, useRoadsAroundUser } from '../hooks/useRoads';
import { useSettings } from '../hooks/useSettings';
import { useWakeLock } from '../hooks/useWakeLock';
import { roadStore } from '../services/roadService';
import { camerasNearby, currentLimit } from '../services/speedService';
import type { Camera } from '../types/camera';
import type { RoadSegment } from '../types/road';
import { bboxContains } from '../utils/geo';

type Selection = { type: 'camera'; camera: Camera } | { type: 'road'; road: RoadSegment } | { type: 'layers' } | { type: 'city' } | null;

export default function MapPage() {
  const [settings, update] = useSettings();
  const city = useMemo(() => getCity(settings.cityId), [settings.cityId]);
  const cams = useCameras(city);
  const geo = useGeolocation(true);
  const roadsVersion = useRoadStoreVersion();
  const [selection, setSelection] = useState<Selection>(null);
  const [follow, setFollow] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  useRoadsAroundUser(geo.fix?.lat ?? null, geo.fix?.lon ?? null);

  // On the first position fix, centre on the user if they are in the selected city.
  const centredOnce = useRef(false);
  useEffect(() => {
    if (centredOnce.current || !geo.fix || !mapRef.current) return;
    centredOnce.current = true;
    if (bboxContains(city.bbox, geo.fix.lat, geo.fix.lon)) {
      mapRef.current.setView([geo.fix.lat, geo.fix.lon], 16);
      setFollow(true);
    }
  }, [geo.fix, city.bbox]);
  useWakeLock(geo.status === 'active');

  const visibleCameras = useMemo(
    () => cams.cameras.filter((c) => (c.kind === 'mobile_zone' ? settings.showMobile : settings.showFixed)),
    [cams.cameras, settings.showFixed, settings.showMobile],
  );

  const heading = geo.speed.heading;
  const limit = useMemo(
    () => (geo.fix ? currentLimit(geo.fix.lat, geo.fix.lon, geo.fix.accuracy, heading, roadStore.roads.values()) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geo.fix, heading, roadsVersion],
  );
  const next = useMemo(() => {
    if (!geo.fix) return null;
    return camerasNearby(geo.fix.lat, geo.fix.lon, heading, visibleCameras, heading === null ? 1500 : 3000)[0] ?? null;
  }, [geo.fix, heading, visibleCameras]);

  const onLocate = useCallback(() => {
    if (geo.status !== 'active') geo.start();
    if (geo.fix && mapRef.current) {
      mapRef.current.setView([geo.fix.lat, geo.fix.lon], Math.max(mapRef.current.getZoom(), 16));
    }
    setFollow(true);
  }, [geo]);

  const onCameraSelect = useCallback((camera: Camera) => setSelection({ type: 'camera', camera }), []);
  const onRoadSelect = useCallback((road: RoadSegment) => setSelection({ type: 'road', road }), []);
  const onUserPan = useCallback(() => setFollow(false), []);
  const onMapClick = useCallback(() => setSelection((s) => (s?.type === 'camera' || s?.type === 'road' ? null : s)), []);
  const onReady = useCallback((m: LeafletMap) => {
    mapRef.current = m;
  }, []);
  const close = useCallback(() => setSelection(null), []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0f14]">
      <MapView
        city={city}
        cameras={cams.cameras}
        fix={geo.fix}
        heading={heading}
        follow={follow}
        showFixed={settings.showFixed}
        showMobile={settings.showMobile}
        showSpeedLimits={settings.showSpeedLimits}
        showRoadNames={settings.showRoadNames}
        highlightCameraId={selection?.type === 'camera' ? selection.camera.id : null}
        onCameraSelect={onCameraSelect}
        onRoadSelect={onRoadSelect}
        onUserPan={onUserPan}
        onMapClick={onMapClick}
        onReady={onReady}
      />

      <TopBar cityName={city.name} onCity={() => setSelection({ type: 'city' })} onLayers={() => setSelection({ type: 'layers' })} />
      <DataStatus city={city} data={cams} roadsLoading={roadStore.loading && settings.showSpeedLimits} />

      {!selection && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex flex-col px-3 pb-safe">
          <div className="mb-3 flex justify-end">
            <div className="pointer-events-auto">
              <LocationButton active={geo.status === 'active'} following={follow} onClick={onLocate} />
            </div>
          </div>
          <div className="mb-3">
            <BottomPanel
              geoStatus={geo.status}
              geoMessage={geo.message}
              speed={geo.speed}
              limit={limit}
              next={next}
              nextIsAhead={heading !== null}
              onEnableGeo={geo.start}
              onCameraTap={(n) => onCameraSelect(n.camera)}
            />
          </div>
        </div>
      )}

      {selection?.type === 'camera' && (
        <CameraDetails camera={selection.camera} fix={geo.fix} fetchedAt={cams.fetchedAt} stale={cams.stale} onClose={close} />
      )}
      {selection?.type === 'road' && (
        <RoadDetails road={selection.road} cameras={visibleCameras} onClose={close} onCameraSelect={onCameraSelect} />
      )}
      {selection?.type === 'layers' && (
        <LayersSheet settings={settings} update={update} data={cams} roadsError={roadStore.lastError} onRefresh={cams.refresh} onClose={close} />
      )}
      {selection?.type === 'city' && (
        <CitySheet
          currentId={city.id}
          onPick={(id) => {
            update({ cityId: id });
            setFollow(false);
            close();
          }}
          onClose={close}
        />
      )}
    </div>
  );
}
