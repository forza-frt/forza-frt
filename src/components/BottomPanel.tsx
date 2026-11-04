import type { CameraWithDistance, CurrentLimit } from '../services/speedService';
import type { GeoStatus, SpeedReading } from '../types/speed';
import { formatDistance } from '../utils/format';
import SpeedSign from './SpeedSign';

interface Props {
  geoStatus: GeoStatus;
  geoMessage: string | null;
  speed: SpeedReading;
  limit: CurrentLimit | null;
  next: CameraWithDistance | null;
  nextIsAhead: boolean;
  onEnableGeo: () => void;
  onCameraTap: (c: CameraWithDistance) => void;
}

export default function BottomPanel({ geoStatus, geoMessage, speed, limit, next, nextIsAhead, onEnableGeo, onCameraTap }: Props) {
  const geoOn = geoStatus === 'active';
  const limitKmh = limit?.kmh ?? null;
  const over = geoOn && speed.kmh !== null && limitKmh !== null && speed.kmh > limitKmh;
  const statusText =
    !geoOn || speed.kmh === null
      ? null
      : limitKmh === null
        ? 'Ограничение неизвестно'
        : over
          ? 'Превышение скорости'
          : 'В пределах ограничения';

  return (
      <div
        className={`pointer-events-auto rounded-3xl border bg-[#121821]/92 p-3 shadow-2xl backdrop-blur-md transition-colors duration-500 ${over ? 'border-red-500/80 shadow-red-900/40' : 'border-white/10'}`}
        data-testid="bottom-panel"
        data-over={over ? 'true' : 'false'}
      >
        {!geoOn && (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2">
            <span className="text-sm text-white/70">
              {geoStatus === 'requesting' ? 'Определяем местоположение…' : geoMessage ?? 'Геолокация выключена'}
            </span>
            {geoStatus !== 'requesting' && geoStatus !== 'unsupported' && (
              <button onClick={onEnableGeo} className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white active:bg-blue-700">
                Включить
              </button>
            )}
          </div>
        )}
        <div className="flex items-stretch gap-3">
          {/* Current speed */}
          <div className="flex min-w-[92px] flex-col justify-center" data-testid="speed-block">
            <span className="text-[11px] uppercase tracking-wider text-white/40">Скорость</span>
            {geoOn && speed.kmh !== null ? (
              <span className={`text-4xl font-bold leading-none tabular-nums ${over ? 'text-red-400' : 'text-white'}`} data-testid="speed-value">
                {speed.kmh}
                <span className="ml-1 text-sm font-medium text-white/50">км/ч</span>
              </span>
            ) : (
              <span className="text-sm leading-tight text-white/50" data-testid="speed-value">
                Скорость
                <br />
                недоступна
              </span>
            )}
            {geoOn && speed.kmh !== null && !speed.reliable && <span className="text-[11px] text-amber-300/80">слабый сигнал GPS</span>}
          </div>

          {/* Current limit */}
          <div className="flex flex-col items-center justify-center" data-testid="limit-block">
            {geoOn ? (
              <SpeedSign kmh={limitKmh} size={56} />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-white/10 text-white/30">—</div>
            )}
          </div>

          {/* Next camera */}
          <button
            className="flex min-w-0 flex-1 flex-col justify-center rounded-2xl bg-white/5 px-3 py-2 text-left active:bg-white/10 disabled:active:bg-white/5"
            disabled={!next}
            onClick={() => next && onCameraTap(next)}
            data-testid="next-camera"
          >
            <span className="text-[11px] uppercase tracking-wider text-white/40">{nextIsAhead ? 'Следующая камера' : 'Ближайшая камера'}</span>
            {next ? (
              <>
                <span className="truncate text-[15px] font-medium text-white">{next.camera.road ?? 'Дорога не указана'}</span>
                <span className="text-sm text-white/70">
                  <span className="font-semibold text-white">{formatDistance(next.distanceM)}</span>
                  {next.camera.maxspeed !== null && ` · ${next.camera.maxspeed} км/ч`}
                  {next.camera.kind === 'mobile_zone' && ' · возможна'}
                </span>
              </>
            ) : (
              <span className="text-sm text-white/50">{geoOn ? 'Нет камер в радиусе 3 км' : '—'}</span>
            )}
          </button>
        </div>
        {statusText && (
          <div className={`mt-2 text-center text-xs ${over ? 'font-semibold text-red-300' : 'text-white/45'}`} data-testid="speed-status">
            {statusText}
            {limit?.road.name ? ` · ${limit.road.name}` : ''}
            <span className="text-white/30"> · скорость по GPS приблизительная</span>
          </div>
        )}
      </div>
  );
}
