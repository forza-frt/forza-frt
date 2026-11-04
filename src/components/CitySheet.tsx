import { CITIES } from '../config/cities';
import Sheet from './Sheet';

export default function CitySheet({ currentId, onPick, onClose }: { currentId: string; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <Sheet title="Город" onClose={onClose} testId="city-sheet">
      <ul>
        {CITIES.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => onPick(c.id)}
              className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-[15px] active:bg-white/10 ${c.id === currentId ? 'bg-white/10 text-white' : 'text-white/80'}`}
            >
              <span>{c.name}</span>
              <span className="text-xs text-white/40">{c.sources.length ? c.country : 'камеры пока недоступны'}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
