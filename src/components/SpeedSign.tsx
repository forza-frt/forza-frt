/** Round speed-limit sign. `null` renders a muted "no data" sign. */
export default function SpeedSign({ kmh, size = 52 }: { kmh: number | null; size?: number }) {
  if (kmh === null) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full border-[3px] border-white/20 text-[11px] font-medium leading-tight text-white/40"
        style={{ width: size, height: size }}
        aria-label="Ограничение: нет данных"
      >
        нет
        <br />
        данных
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-white font-bold text-black"
      style={{ width: size, height: size, border: `${Math.round(size / 9)}px solid #dc2626`, fontSize: size * (kmh >= 100 ? 0.34 : 0.4) }}
      aria-label={`Ограничение ${kmh} км/ч`}
    >
      {kmh}
    </div>
  );
}
