'use client';

import { CheckIcon, EyeIcon, EyeOffIcon, LockIcon, PlayIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart } from '@/features/projector/BarChart';
import { normalize } from '@/domain/model';
import type { SendFn, PresenterView } from './types';

type Activity = { status: string; visible: boolean; hiddenWords: string[] } | null;

const STEPS = ['Buka', 'Tutup', 'Tampilkan hasil'];

/** 0 = not opened, 1 = open, 2 = closed, 3 = results shown */
function stageOf(activity: Activity): number {
  const status = activity?.status ?? 'belum';
  if (status === 'buka') return 1;
  if (status === 'tutup') return activity?.visible ? 3 : 2;
  return 0;
}

/** Buka → Tutup → Tampilkan hasil, with the current step highlighted. */
function StepIndicator({ stage }: { stage: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Tahap aktivitas">
      {STEPS.map((label, i) => {
        const done = stage > i + 1 || stage === 3;
        const current = stage === i + 1 && stage !== 3;
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true" className={`h-0.5 w-6 ${stage > i ? 'bg-foreground' : 'bg-foreground/20'}`} />}
            <span className={`flex items-center gap-1.5 ${done || current ? 'text-foreground' : 'text-foreground/50'}`}>
              <span
                className={`flex size-5 items-center justify-center rounded-full border-2 border-border text-[10px] font-black ${done ? 'bg-foreground text-background' : current ? 'bg-main' : 'bg-secondary-background'}`}
              >
                {done ? <CheckIcon className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const STATUS_PILL: Record<number, { text: string; dot: string; pulse?: boolean }> = {
  0: { text: 'Belum dibuka', dot: 'bg-foreground/30' },
  1: { text: 'Menerima jawaban', dot: 'bg-[#34D399]', pulse: true },
  2: { text: 'Ditutup', dot: 'bg-[#FFD93D]' },
  3: { text: 'Hasil ditampilkan', dot: 'bg-main' },
};

export function InteractivePanel({
  view,
  slide,
  activity,
  send,
}: {
  view: PresenterView;
  slide: PresenterView['slides'][number];
  activity: Activity;
  send: SendFn;
}) {
  const responses = view.responses.filter((r) => r.slideId === slide.id);
  const status = activity?.status ?? 'belum';
  const stage = stageOf(activity);
  const pill = STATUS_PILL[stage];
  const isChoice = slide.type === 'pilihan' || slide.type === 'polling';
  // Responses are per group once groups exist, otherwise per participant.
  const totalOwners = view.groups.length > 0 ? view.groups.length : view.participants.length;
  const answeredPct = totalOwners ? Math.min(100, Math.round((responses.length / totalOwners) * 100)) : 0;

  // All submitted words including hidden — presenter sees everything for moderation
  const awanWords = (() => {
    if (slide.type !== 'awan') return [];
    const hiddenWords = activity?.hiddenWords ?? [];
    const wordMap: Record<string, number> = {};
    responses.forEach((r) =>
      r.value.forEach((v) => {
        const n = normalize(v);
        wordMap[n] = (wordMap[n] ?? 0) + 1;
      }),
    );
    return Object.entries(wordMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([word, count]) => ({ word, count, hidden: hiddenWords.includes(word) }));
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle className="flex-1 text-sm">Aktivitas Peserta</CardTitle>
          <span className="flex items-center gap-1.5 rounded-full border-2 border-border px-2.5 py-0.5 text-xs font-bold">
            <span className="relative flex size-2" aria-hidden="true">
              {pill.pulse && <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${pill.dot}`} />}
              <span className={`relative inline-flex size-2 rounded-full ${pill.dot}`} />
            </span>
            {pill.text}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Where we are + the one next action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StepIndicator stage={stage} />
          <div className="flex items-center gap-2">
            {stage >= 2 && (
              <Button variant="neutral" size="sm" onClick={() => send({ type: 'activity.reopen', slideId: slide.id })}>
                <RefreshCwIcon />
                Buka Kembali
              </Button>
            )}
            {stage === 0 && (
              <Button size="sm" onClick={() => send({ type: 'activity.open', slideId: slide.id })}>
                <PlayIcon />
                Buka Aktivitas
              </Button>
            )}
            {stage === 1 && (
              <Button size="sm" onClick={() => send({ type: 'activity.close', slideId: slide.id })}>
                <LockIcon />
                Tutup Aktivitas
              </Button>
            )}
            {stage === 2 && (
              <Button size="sm" onClick={() => send({ type: 'results.reveal', slideId: slide.id })}>
                <EyeIcon />
                Tampilkan Hasil
              </Button>
            )}
            {/* Simulate — demo mode, only while open */}
            {status === 'buka' && view.hasSimulatedData && (
              <Button
                variant="neutral"
                size="sm"
                data-testid="simulate-responses-btn"
                onClick={() => send({ type: 'session.simulate' })}
              >
                Simulasikan respons
              </Button>
            )}
          </div>
        </div>

        {/* Answered so far */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">{view.groups.length > 0 ? 'Kelompok menjawab' : 'Peserta menjawab'}</span>
            <span className="tabular-nums">
              <span className="font-black">{responses.length}</span>
              <span className="text-foreground/70"> / {totalOwners}</span>
            </span>
          </div>
          <span className="h-3 overflow-hidden rounded-full border-2 border-border bg-background">
            <span className="block h-full bg-main transition-[width] duration-300" style={{ width: `${answeredPct}%` }} />
          </span>
        </div>

        {/* Live distribution — presenter-only until revealed */}
        {isChoice && slide.options.length > 0 && (
          <div className="flex flex-col gap-2 border-t-2 border-border pt-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
              {activity?.visible ? <EyeIcon className="size-3.5" /> : <EyeOffIcon className="size-3.5" />}
              {activity?.visible ? 'Hasil ditampilkan di proyektor' : 'Pratinjau langsung — hanya terlihat oleh Anda'}
            </p>
            <BarChart
              bars={slide.options.map((opt, i) => ({
                label: opt,
                count: responses.filter((r) => r.value[0] === String(i)).length,
                isCorrect: slide.type === 'pilihan' && slide.correct.includes(i),
              }))}
              total={responses.length}
            />
          </div>
        )}

        {/* Awan kata — word list with hide/show toggle per word */}
        {slide.type === 'awan' && (
          <div className="pt-2 border-t-2 border-border flex flex-col gap-2">
            {/* Same "X peserta · Y kata" count the projector shows */}
            <p className="flex items-baseline justify-between text-xs font-semibold">
              Kata yang dikirim
              <span className="font-normal tabular-nums text-foreground/70">
                {responses.length} peserta · {awanWords.reduce((n, w) => n + w.count, 0)} kata · {awanWords.length} unik
              </span>
            </p>
            {awanWords.length === 0 ? (
              <p className="text-xs text-foreground/70">Belum ada kata.</p>
            ) : (
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto p-0.5">
                {awanWords.map(({ word, count, hidden }) => (
                  <span
                    key={word}
                    data-testid={hidden ? `word-${word}-hidden` : `word-${word}`}
                    className={`inline-flex items-center gap-1.5 rounded-full border-2 py-0.5 pl-3 pr-1 text-sm font-semibold ${hidden
                      ? 'border-[var(--error)] bg-secondary-background text-foreground/50 line-through'
                      : 'border-border bg-[#FFD93D]'
                      }`}
                  >
                    {word}
                    <span className="rounded-full bg-foreground px-1.5 text-[10px] font-bold tabular-nums text-background no-underline">{count}</span>
                    {/* Plain button: the 40px Button min-height would bloat each chip */}
                    <Tooltip disableHoverablePopup>
                      <TooltipTrigger
                        render={
                          <button
                            type="button"
                            aria-label={hidden ? `Tampilkan kata ${word}` : `Sembunyikan kata ${word}`}
                            onClick={() => send({ type: 'activity.hideWord', slideId: slide.id, word })}
                            className="flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-black/10"
                          />
                        }
                      >
                        {hidden ? <EyeIcon className="size-3.5" /> : <EyeOffIcon className="size-3.5" />}
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="pointer-events-none">
                        {hidden ? 'Tampilkan lagi di awan kata' : 'Sembunyikan dari awan kata'}
                      </TooltipContent>
                    </Tooltip>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
