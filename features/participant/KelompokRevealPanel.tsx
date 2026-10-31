'use client';

import { useEffect, useState } from 'react';
import { Mic2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import type { ParticipantView } from '@/contracts/views';

export function KelompokRevealPanel({ view }: { view: ParticipantView }) {
  const slide = view.activeSlide;
  const group = view.myGroup;
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (group) {
      // Trigger reveal animation on mount or when group data arrives
      const t = setTimeout(() => setRevealed(true), 50);
      return () => clearTimeout(t);
    }
  }, [group?.id]);

  if (!group) {
    return (
      <div className="flex flex-col gap-3">
        <span
          className="inline-flex items-center self-start rounded-base border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0_0_#000]"
          style={{ backgroundColor: SLIDE_COLOR['kelompok'] }}
        >
          Pembagian Kelompok
        </span>
        <h2 className="text-lg font-bold">{slide.title}</h2>
        <p className="text-sm text-foreground/70 text-center py-6 animate-pulse">
          Menunggu pembagian kelompok…
        </p>
      </div>
    );
  }

  const isResponder = view.subRole === 'penjawab';

  return (
    <div className="flex flex-col gap-4">
      <span
        className="inline-flex items-center self-start rounded-base border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0_0_#000]"
        style={{ backgroundColor: SLIDE_COLOR['kelompok'] }}
      >
        Pembagian Kelompok
      </span>
      <h2 className="text-lg font-bold">{slide.title}</h2>

      {/* Reveal card with animation */}
      <div
        className={`transition-all duration-500 motion-reduce:transition-none ${
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        data-testid="group-reveal-card"
      >
        <Card className="border-2 border-foreground shadow-[4px_4px_0_0_var(--border)] bg-main">
          <CardContent className="pt-6 flex flex-col gap-4 items-center text-center">
            <div className="text-5xl font-black">
              Kelompok {group.number}
            </div>

            {/* Role badge */}
            {isResponder ? (
              <div
                className="flex items-center gap-2 bg-main border-2 border-foreground rounded px-3 py-1 font-semibold text-sm"
                data-testid="role-responder"
              >
                <Mic2 className="size-4 shrink-0" strokeWidth={2.5} /> Kamu penjawab kelompok
              </div>
            ) : (
              <div
                className="flex items-center gap-2 bg-secondary-background border-2 border-border rounded px-3 py-1 text-sm"
                data-testid="role-member"
              >
                <Users className="size-4 shrink-0" strokeWidth={2.5} /> Kamu anggota kelompok
              </div>
            )}

            {/* Members list */}
            <div className="flex flex-wrap gap-2 justify-center">
              {group.members.map((m) => (
                <span
                  key={m.id}
                  className={`px-2 py-1 rounded border text-xs font-medium ${
                    m.id === view.pid ? 'bg-main border-foreground font-bold shadow-[1px_1px_0_0_#000]' : 'bg-secondary-background border-border'
                  }`}
                >
                  {m.name}
                </span>
              ))}
            </div>

            {/* Instruction */}
            {isResponder ? (
              <p className="text-sm text-foreground/70">
                Kamu yang akan mengirim jawaban untuk kelompok ini.
              </p>
            ) : (
              <p className="text-sm text-foreground/70">
                Diskusikan bersama.{' '}
                <span className="font-semibold text-foreground">{group.responderName}</span>{' '}
                akan mengirim jawaban.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
