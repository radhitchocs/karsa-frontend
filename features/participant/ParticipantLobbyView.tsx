'use client';

import { InfoIcon } from 'lucide-react';
import type { ParticipantView } from '@/contracts/views';
import { useRouter } from 'next/navigation';
import { ParticipantHeader, initials } from './ParticipantHeader';

export function ParticipantLobbyView({ view }: { view: ParticipantView }) {
  const router = useRouter();
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <ParticipantHeader name={view.name} title={view.title} onExit={() => router.push('/join')} />

      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-4">
        <section className="w-full max-w-sm rounded-base border-2 border-border bg-secondary-background shadow-[4px_4px_0_0_var(--border)]">
          <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-7 text-center">
            <span
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-full border-2 border-border bg-main text-xl font-black text-main-foreground shadow-[3px_3px_0_0_var(--border)]"
            >
              {initials(view.name)}
            </span>
            <p className="text-lg font-black" style={{ textWrap: 'balance' }}>
              Halo, {view.name}!
            </p>
            <p className="text-sm text-foreground/70">Kamu bergabung di</p>
            <h1
              title={view.title}
              className="w-full truncate rounded-base border-2 border-border bg-background px-3 py-2 text-base font-bold"
            >
              {view.title}
            </h1>
          </div>

          <div className="flex flex-col items-center gap-3 border-t-2 border-border px-6 py-5 text-center" role="status" aria-live="polite">
            <span className="flex gap-1" aria-hidden="true">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-2.5 animate-bounce rounded-full bg-foreground"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            <p className="font-semibold">Menunggu presenter memulai sesi</p>
          </div>
        </section>

        <p className="flex max-w-sm items-start gap-2 px-2 text-sm text-foreground/70">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          Biarkan halaman ini terbuka. Slide akan muncul otomatis saat sesi dimulai.
        </p>
      </div>
    </main>
  );
}
