import type { Camera } from '../types/camera';
import type { Fix } from '../types/speed';
import { CAMERA_KIND_LABEL, compassLabel, formatDateTime, formatDistance } from '../utils/format';
import { distanceM } from '../utils/geo';
import Sheet, { Row } from './Sheet';

interface Props {
  camera: Camera;
  fix: Fix | null;
  fetchedAt: number | null;
  stale: boolean;
  onClose: () => void;
}

const SOURCE_LABEL = { osm: 'OpenStreetMap', kartes: 'kartes.lv' };

export default function CameraDetails({ camera, fix, fetchedAt, stale, onClose }: Props) {
  const title = camera.kind === 'mobile_zone' ? 'Возможная зона мобильной камеры' : 'Камера контроля скорости';
  return (
    <Sheet title={title} onClose={onClose} testId="camera-details">
      {camera.kind === 'mobile_zone' && (
        <p className="mb-2 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          Место, где может работать мобильная камера. Это не значит, что камера находится здесь сейчас.
        </p>
      )}
      <Row label="Дорога">{camera.road ?? 'Нет данных'}</Row>
      <Row label="Ограничение">
        {camera.maxspeed !== null ? (
          <>
            {camera.maxspeed} км/ч
            {camera.maxspeedOrigin === 'road' && <span className="block text-xs text-white/40">по данным участка дороги</span>}
          </>
        ) : (
          'Нет данных'
        )}
      </Row>
      <Row label="Расстояние">
        {fix ? formatDistance(distanceM(fix.lat, fix.lon, camera.lat, camera.lon)) : 'Геолокация выключена'}
      </Row>
      <Row label="Тип">{CAMERA_KIND_LABEL[camera.kind]}</Row>
      <Row label="Направление контроля">
        {camera.direction !== null
          ? compassLabel(camera.direction)
          : camera.directionLabel
            ? `${camera.directionLabel} (как указано в источнике)`
            : 'Не указано источником'}
      </Row>
      <Row label="Источник">
        {camera.sourceUrl ? (
          <a href={camera.sourceUrl} target="_blank" rel="noreferrer" className="text-sky-400 underline">
            {SOURCE_LABEL[camera.source]}
          </a>
        ) : (
          SOURCE_LABEL[camera.source]
        )}
      </Row>
      <Row label="Данные обновлены">
        {fetchedAt ? formatDateTime(fetchedAt) : 'Нет данных'}
        {stale && <span className="block text-xs text-amber-300">Обновить не удалось — данные могут быть устаревшими</span>}
      </Row>
    </Sheet>
  );
}
