'use client';

import { FishIcon, MonitorIcon } from 'lucide-react';
import type { ParticipantView } from '@/contracts/views';

export function PancingParticipantView({ view }: { view: ParticipantView }) {
  const hasStarted = !!view.lastPick;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
      {hasStarted ? (
        <>
          <div className="flex items-center justify-center rounded-base border-2 border-border shadow-[4px_4px_0_0_var(--border)] p-8 bg-secondary-background">
            <MonitorIcon className="size-16 text-foreground/60" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-black">Lihat layar proyektor!</p>
            <p className="text-base text-foreground/60">Presenter sedang memancing peserta…</p>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center rounded-base border-2 border-border shadow-[4px_4px_0_0_var(--border)] p-8 bg-secondary-background">
            <FishIcon className="size-16 text-foreground/40" strokeWidth={2} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-black">Siap dipancing?</p>
            <p className="text-base text-foreground/60">Tunggu presenter melempar kailnya…</p>
          </div>
        </>
      )}
    </div>
  );
}
