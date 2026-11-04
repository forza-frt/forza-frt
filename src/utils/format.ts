export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} м`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} км`;
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatAge(ts: number, now = Date.now()): string {
  const min = Math.round((now - ts) / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  return formatDateTime(ts);
}

const ROSE = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'];
export function compassLabel(deg: number): string {
  return `${ROSE[Math.round(deg / 45) % 8]} (${Math.round(deg)}°)`;
}

/** Colour scale for speed limits. Lower limit = "warmer" pink/violet, higher = yellow/orange. */
export function speedColor(kmh: number | null): string {
  if (kmh === null) return '#64748b';
  if (kmh <= 20) return '#f472b6';
  if (kmh <= 30) return '#e879f9';
  if (kmh <= 40) return '#a78bfa';
  if (kmh <= 50) return '#38bdf8';
  if (kmh <= 60) return '#2dd4bf';
  if (kmh <= 70) return '#4ade80';
  if (kmh <= 80) return '#a3e635';
  if (kmh <= 90) return '#facc15';
  return '#fb923c';
}

export const SPEED_LEGEND: { label: string; kmh: number | null }[] = [
  { label: '≤20', kmh: 20 }, { label: '30', kmh: 30 }, { label: '40', kmh: 40 }, { label: '50', kmh: 50 },
  { label: '60', kmh: 60 }, { label: '70', kmh: 70 }, { label: '80', kmh: 80 }, { label: '90', kmh: 90 },
  { label: '100+', kmh: 100 }, { label: 'нет данных', kmh: null },
];

export const CAMERA_KIND_LABEL: Record<string, string> = {
  fixed: 'Стационарная',
  average_speed: 'Контроль средней скорости',
  mobile_zone: 'Возможная зона мобильной камеры',
  unknown: 'Тип не указан источником',
};
