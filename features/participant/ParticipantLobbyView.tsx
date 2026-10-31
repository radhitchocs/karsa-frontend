'use client';

import { Card, CardContent } from '@/components/ui/card';
import { KarsaWordmark } from '@/components/KarsaWordmark';
import type { ParticipantView } from '@/contracts/views';

export function ParticipantLobbyView({ view }: { view: ParticipantView }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4 min-h-0">
      <KarsaWordmark size="md" />
      <h1 className="text-3xl font-black text-center" style={{ textWrap: 'balance' }}>{view.title}</h1>
      <Card className="w-full max-w-xs text-center shadow-[4px_4px_0_0_#000]">
        <CardContent className="pt-6 pb-6 flex flex-col gap-4">
          <p className="text-base font-semibold">
            Halo, <span className="font-black">{view.name}</span>!
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="size-3 rounded-full border-[3px] border-current border-t-transparent animate-spin text-foreground/60" aria-hidden="true" />
            <p className="text-base text-foreground/60">
              Menunggu presenter memulai sesi…
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
