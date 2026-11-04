import type { ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
}

/** Bottom sheet used for camera/road details and settings. */
export default function Sheet({ title, onClose, children, testId }: Props) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[1100]" data-testid={testId}>
      <div className="mx-auto max-w-xl rounded-t-3xl border border-white/10 bg-[#121821]/95 px-5 pt-3 shadow-2xl backdrop-blur-md pb-safe">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold leading-tight text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-2xl text-white/60 active:bg-white/10"
          >
            ×
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto pb-4">{children}</div>
      </div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/5 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-white/50">{label}</span>
      <span className="text-right text-[15px] text-white">{children}</span>
    </div>
  );
}
