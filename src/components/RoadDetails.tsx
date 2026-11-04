import type { Camera } from '../types/camera';
import type { RoadSegment } from '../types/road';
import { CAMERA_KIND_LABEL, formatDistance } from '../utils/format';
import { nearestOnPolyline } from '../utils/geo';
import Sheet, { Row } from './Sheet';
import SpeedSign from './SpeedSign';

interface Props {
  road: RoadSegment;
  cameras: Camera[];
  onClose: () => void;
  onCameraSelect: (c: Camera) => void;
}

export default function RoadDetails({ road, cameras, onClose, onCameraSelect }: Props) {
  const onRoad = cameras.filter((c) => {
    const n = nearestOnPolyline(c.lat, c.lon, road.coords);
    return n !== null && n.distanceM < 25;
  });
  const directional = road.maxspeed === null && (road.maxspeedForward !== null || road.maxspeedBackward !== null);
  return (
    <Sheet title={road.name ?? road.ref ?? 'Участок дороги'} onClose={onClose} testId="road-details">
      <div className="mb-2 flex items-center gap-3">
        <SpeedSign kmh={directional ? null : road.maxspeed} />
        <div className="text-sm text-white/60">
          {directional ? 'Ограничение зависит от направления движения' : road.maxspeed !== null ? 'Ограничение скорости на участке' : 'Ограничение для участка не указано'}
        </div>
      </div>
      <Row label="Ограничение">
        {directional
          ? `${road.maxspeedForward ?? 'нет данных'} / ${road.maxspeedBackward ?? 'нет данных'} км/ч (по / против линии OSM)`
          : road.maxspeed !== null
            ? `${road.maxspeed} км/ч`
            : 'Нет данных'}
      </Row>
      {road.maxspeedRaw && road.maxspeedRaw !== String(road.maxspeed) && <Row label="Значение в OSM">{road.maxspeedRaw}</Row>}
      {road.ref && road.name && <Row label="Номер дороги">{road.ref}</Row>}
      <Row label="Длина участка">{formatDistance(road.lengthM)}</Row>
      <Row label="Камеры на участке">
        {onRoad.length === 0 ? (
          'Нет'
        ) : (
          <span className="flex flex-col items-end gap-1">
            {onRoad.map((c) => (
              <button key={c.id} className="text-sky-400 underline" onClick={() => onCameraSelect(c)}>
                {CAMERA_KIND_LABEL[c.kind]}
                {c.maxspeed !== null ? `, ${c.maxspeed} км/ч` : ''}
              </button>
            ))}
          </span>
        )}
      </Row>
      <Row label="Источник">
        <a href={`https://www.openstreetmap.org/way/${road.id}`} target="_blank" rel="noreferrer" className="text-sky-400 underline">
          OpenStreetMap
        </a>
      </Row>
      <p className="pt-2 text-xs text-white/40">Участок — это отрезок дороги, как он нарисован в OpenStreetMap. Знаки на месте имеют приоритет.</p>
    </Sheet>
  );
}
