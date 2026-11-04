import type { Settings } from '../hooks/useSettings';
import type { CameraDataset, DataSourceId, SourceStatus } from '../types/camera';
import { SPEED_LEGEND, formatDateTime, speedColor } from '../utils/format';
import Sheet from './Sheet';

interface Props {
  settings: Settings;
  update: (p: Partial<Settings>) => void;
  data: CameraDataset;
  roadsError: string | null;
  onRefresh: () => void;
  onClose: () => void;
}

function Toggle({ label, hint, on, onChange, testId }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 py-1.5">
      <span>
        <span className="block text-[15px] text-white">{label}</span>
        {hint && <span className="block text-xs text-white/40">{hint}</span>}
      </span>
      <input type="checkbox" className="rm-switch" checked={on} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
    </label>
  );
}

const SOURCE_NAMES: Record<DataSourceId, string> = { osm: 'OpenStreetMap', kartes: 'kartes.lv' };

function statusText(s: SourceStatus): { text: string; cls: string } {
  switch (s.state) {
    case 'ok':
      return { text: `камер: ${s.count}`, cls: 'text-emerald-400' };
    case 'loading':
      return { text: 'загрузка…', cls: 'text-white/50' };
    case 'not_configured':
      return { text: s.message, cls: 'text-white/40' };
    case 'error':
      return { text: s.message, cls: 'text-red-400' };
    default:
      return { text: '—', cls: 'text-white/40' };
  }
}

export default function LayersSheet({ settings, update, data, roadsError, onRefresh, onClose }: Props) {
  return (
    <Sheet title="Слои и данные" onClose={onClose} testId="layers-sheet">
      <Toggle label="Стационарные камеры" on={settings.showFixed} onChange={(v) => update({ showFixed: v })} testId="toggle-fixed" />
      <Toggle
        label="Возможные мобильные камеры"
        hint="Только если источник их публикует"
        on={settings.showMobile}
        onChange={(v) => update({ showMobile: v })}
        testId="toggle-mobile"
      />
      <Toggle label="Ограничения скорости" hint="Видны при приближении" on={settings.showSpeedLimits} onChange={(v) => update({ showSpeedLimits: v })} testId="toggle-limits" />
      <Toggle label="Названия дорог" on={settings.showRoadNames} onChange={(v) => update({ showRoadNames: v })} testId="toggle-names" />

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {SPEED_LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5 text-xs text-white/60">
            <span className="inline-block h-1.5 w-5 rounded-full" style={{ background: speedColor(l.kmh), opacity: l.kmh === null ? 0.6 : 1 }} />
            {l.label}
          </span>
        ))}
      </div>

      <h3 className="mt-5 mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Источники камер</h3>
      {(Object.keys(SOURCE_NAMES) as DataSourceId[]).map((id) => {
        const st = statusText(data.sources[id]);
        return (
          <div key={id} className="flex items-baseline justify-between gap-3 border-b border-white/5 py-2 text-sm">
            <span className="text-white">{SOURCE_NAMES[id]}</span>
            <span className={`text-right ${st.cls}`} data-testid={`source-${id}`}>{st.text}</span>
          </div>
        );
      })}
      {roadsError && <p className="mt-2 text-sm text-red-400">Ограничения скорости: {roadsError}</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-white/40">
          {data.fetchedAt ? `Обновлено: ${formatDateTime(data.fetchedAt)}` : 'Данные ещё не загружались'}
          {data.stale && <span className="block text-amber-300">Последнее обновление не удалось</span>}
        </span>
        <button
          onClick={onRefresh}
          disabled={data.loading}
          className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium text-white active:bg-white/20 disabled:opacity-50"
        >
          {data.loading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>
      <p className="mt-4 text-xs text-white/30">
        Карта: © OpenStreetMap, © CARTO. Данные о камерах и ограничениях могут быть неполными — ориентируйтесь на дорожные знаки.
      </p>
    </Sheet>
  );
}
