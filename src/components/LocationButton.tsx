interface Props {
  active: boolean;
  following: boolean;
  onClick: () => void;
}

export default function LocationButton({ active, following, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Моё местоположение"
      title="Моё местоположение"
      data-testid="locate-button"
      className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/10 shadow-xl backdrop-blur-md active:scale-95 ${following ? 'bg-blue-600 text-white' : 'bg-[#121821]/90 text-white'}`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        {active ? (
          <path d="M3 11l18-8-8 18-2-8-8-2z" fill="currentColor" />
        ) : (
          <path d="M3 11l18-8-8 18-2-8-8-2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}
