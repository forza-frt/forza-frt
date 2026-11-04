import type { CameraDataset } from '../types/camera';
import type { City } from '../types/city';
import { formatAge } from '../utils/format';

/** Small pill under the top bar for important data states only. Hidden when everything is fine. */
export default function DataStatus({ city, data, roadsLoading }: { city: City; data: CameraDataset; roadsLoading: boolean }) {
  let text: string | null = null;
  let tone = 'text-white/80';
  const sources = Object.values(data.sources);
  const allFailed = city.sources.length > 0 && city.sources.every((id) => data.sources[id].state === 'error' || data.sources[id].state === 'not_configured');
  const anyError = sources.some((s) => s.state === 'error');

  if (data.loading) text = 'Загрузка камер…';
  else if (city.sources.length === 0) text = 'Камеры для этого города пока недоступны';
  else if (data.stale && data.fetchedAt) {
    text = `Не удалось обновить. Показаны данные от ${formatAge(data.fetchedAt)}`;
    tone = 'text-amber-200';
  } else if (allFailed && anyError && data.cameras.length === 0) {
    text = 'Не удалось загрузить камеры. Проверьте интернет';
    tone = 'text-red-300';
  } else if (!data.loading && data.fetchedAt && data.cameras.length === 0) {
    text = 'Камеры для этого города пока недоступны';
  } else if (roadsLoading) text = 'Загрузка ограничений скорости…';

  if (!text) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[999] flex justify-center" style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}>
      <div className={`rounded-full border border-white/10 bg-[#121821]/90 px-4 py-1.5 text-xs shadow backdrop-blur ${tone}`} data-testid="data-status">
        {text}
      </div>
    </div>
  );
}
