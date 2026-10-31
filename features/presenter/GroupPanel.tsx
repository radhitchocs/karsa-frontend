'use client';

import { useState } from 'react';
import { AlertCircleIcon, Mic2Icon, RefreshCwIcon, ShuffleIcon, UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumberStepper } from '@/components/ui/number-stepper';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import type { SendFn, PresenterView } from './types';

// Border colour left out so the error state can swap it without class conflicts.
const cardBase = 'rounded-base border-2 bg-secondary-background shadow-[4px_4px_0_0_var(--border)]';
const cardClass = `${cardBase} border-border`;

/**
 * Presenter control for the Pembagian Kelompok slide.
 * Before dividing: count stepper validated against connected participants (red + shake when it
 * blocks the next step). After: one card per group with members and responder swap.
 */
export function GroupPanel({
  view,
  slide,
  send,
  attention = 0,
}: {
  view: PresenterView;
  slide: PresenterView['slides'][number];
  send: SendFn;
  /** Bumped by the parent when the presenter tries to move on before dividing; triggers the shake. */
  attention?: number;
}) {
  // Same pool the backend divides: connected (or simulated) participants.
  const connected = view.participants.filter((p) => p.online || p.simulated).length;
  const [groupCount, setGroupCount] = useState(slide.groups ?? 3);
  const [shakeKey, setShakeKey] = useState(0);

  const error =
    connected < 2
      ? `Butuh minimal 2 peserta terhubung untuk membagi kelompok (sekarang ${connected}).`
      : groupCount > connected
        ? `Hanya ${connected} peserta terhubung — maksimal ${connected} kelompok.`
        : null;

  function assign() {
    if (error) {
      setShakeKey((k) => k + 1);
      return;
    }
    send({ type: 'groups.assign', groupCount });
  }

  if (view.groups.length === 0) {
    const perGroup = connected && groupCount ? connected / groupCount : 0;
    // Re-keying the card restarts the shake for each new nudge (local Bagikan click or parent's Berikutnya).
    const nudges = attention + shakeKey;
    return (
      <section
        key={nudges}
        className={`${cardBase} flex flex-col gap-4 p-5 ${nudges > 0 ? 'animate-shake' : ''} ${error || attention > 0 ? 'border-[var(--error)]' : 'border-border'}`}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Bagikan kelompok</h3>
          <span className="flex items-center gap-1.5 text-xs text-foreground/70">
            <UsersIcon className="size-3.5" />
            {connected} peserta terhubung
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" htmlFor="group-count">Jumlah kelompok</label>
            <div className={error ? 'rounded-base ring-2 ring-[var(--error)] ring-offset-2' : ''}>
              <NumberStepper
                id="group-count"
                value={groupCount}
                min={1}
                max={20}
                onChange={setGroupCount}
                decrementLabel="Kurangi kelompok"
                incrementLabel="Tambah kelompok"
              />
            </div>
          </div>
          <Button onClick={assign} className="ml-auto">
            <ShuffleIcon />
            Bagikan Kelompok
          </Button>
        </div>

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-sm font-semibold text-[var(--error-fg)]">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : (
          <p className="text-sm text-foreground/70">
            ≈ {perGroup >= 10 ? Math.round(perGroup) : perGroup.toFixed(1).replace('.0', '')} peserta per kelompok,
            diacak otomatis. Satu peserta di tiap kelompok dipilih sebagai penjawab.
          </p>
        )}
        {attention > 0 && !error && (
          <p className="flex items-start gap-2 text-sm font-semibold text-[var(--error-fg)]">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
            Bagikan kelompok dulu sebelum lanjut ke slide berikutnya.
          </p>
        )}
      </section>
    );
  }

  const memberTotal = view.groups.reduce((n, g) => n + g.members.length, 0);
  return (
    <section className="flex flex-col gap-3">
      <p className="text-sm text-foreground/70">
        <strong className="text-foreground">{view.groups.length} kelompok</strong> · {memberTotal} peserta.
        Penjawab mengirim jawaban untuk kelompoknya.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {view.groups.map((g) => {
          const members = g.members
            .map((mid) => view.participants.find((p) => p.id === mid))
            .filter((m): m is NonNullable<typeof m> => !!m)
            // Responder first, then by name
            .sort((a, b) => Number(b.id === g.responder) - Number(a.id === g.responder) || a.name.localeCompare(b.name));
          return (
            <article key={g.id} className={`${cardClass} flex flex-col overflow-hidden`}>
              <header
                className="flex items-center justify-between gap-2 border-b-2 border-border px-4 py-2"
                style={{ backgroundColor: SLIDE_COLOR.kelompok }}
              >
                <h3 className="font-black">Kelompok {g.number}</h3>
                <span className="text-xs font-semibold">{members.length} anggota</span>
              </header>
              <ul className="flex flex-col gap-1.5 p-3">
                {members.map((m) => {
                  const isResponder = m.id === g.responder;
                  return (
                    <li
                      key={m.id}
                      className={`flex items-center gap-2 rounded-base px-2 py-1 text-sm ${isResponder ? 'border-2 border-border bg-main font-bold' : ''} ${m.online ? '' : 'text-foreground/50'}`}
                    >
                      {isResponder ? <Mic2Icon className="size-4 shrink-0" /> : <span className="size-4 shrink-0" />}
                      <span className="min-w-0 flex-1 truncate">{m.name}</span>
                      {isResponder && <span className="text-[10px] font-bold">Penjawab</span>}
                      {!m.online && <span className="text-[10px]">offline</span>}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-auto flex items-center justify-between gap-2 border-t-2 border-border/15 px-3 py-2">
                <span className="min-w-0 truncate text-xs text-foreground/70">
                  Penjawab: <strong className="text-foreground">{members.find((m) => m.id === g.responder)?.name ?? '—'}</strong>
                </span>
                <Tooltip disableHoverablePopup>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="neutral"
                        size="sm"
                        className="shrink-0"
                        onClick={() => send({ type: 'group.replaceResponder', groupId: g.id })}
                      />
                    }
                  >
                    <RefreshCwIcon />
                    Ganti Penjawab
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="pointer-events-none">
                    Pilih penjawab lain secara acak di kelompok ini
                  </TooltipContent>
                </Tooltip>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
