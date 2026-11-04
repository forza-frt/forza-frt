interface Props {
  cityName: string;
  onCity: () => void;
  onLayers: () => void;
}

export default function TopBar({ cityName, onCity, onLayers }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] pt-safe">
      <div className="pointer-events-auto mx-3 mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#121821]/85 py-1.5 pl-4 pr-1.5 shadow-lg backdrop-blur-md">
        <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          Radar Map
        </span>
        <button
          onClick={onCity}
          className="ml-auto flex h-10 items-center gap-1 rounded-xl px-3 text-[15px] text-white/90 active:bg-white/10"
          data-testid="city-button"
        >
          {cityName}
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>
        </button>
        <button
          onClick={onLayers}
          aria-label="Слои"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/90 active:bg-white/10"
          data-testid="layers-button"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>
        </button>
      </div>
    </div>
  );
}
