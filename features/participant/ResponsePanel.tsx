'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Note, TypePill, WaitingPill } from './ParticipantBits';
import type { ParticipantView } from '@/contracts/views';
import type { ResponseSubmit } from '@/contracts/commands';

type SendFn = (payload: ResponseSubmit) => Promise<boolean>;

const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * Participant view for Pilihan ganda and Polling. Stages:
 *  belum  → question + greyed options so people can read ahead
 *  buka   → pick, send, change until closed (clear sent / changed state)
 *  tutup  → locked; after reveal the options turn into result rows with shares
 */
export function ResponsePanel({
  view,
  send,
}: {
  view: ParticipantView;
  send: SendFn;
}) {
  const slide = view.activeSlide;
  const activity = view.activity;
  const myResponse = view.myResponse ?? view.groupResponse;
  const isResponder = view.subRole === 'penjawab' || view.subRole === 'individu';
  const isGroup = view.subRole === 'penjawab';
  const isPilihan = slide.type === 'pilihan';

  // Local, not-yet-sent pick. null = nothing changed since the last send.
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const status = activity?.status ?? 'belum';
  const visible = activity?.visible ?? false;
  const submittedIndex = myResponse && myResponse.value.length > 0 ? Number(myResponse.value[0]) : null;
  const choice = status === 'buka' ? (selected ?? submittedIndex) : submittedIndex;
  const changed = selected !== null && selected !== submittedIndex;
  const counts = view.revealedCounts; // only present when revealed and participant content is shown
  const showResults = status === 'tutup' && counts !== null;
  const correct = slide.correct ?? [];

  async function handleSubmit() {
    if (choice === null || !isResponder) return;
    setSubmitting(true);
    try {
      const ok = await send({ type: 'response.submit', slideId: slide.id, value: [String(choice)] });
      if (ok) setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }

  const optionText = (i: number) => `${letter(i)}. ${slide.options[i] ?? ''}`;

  return (
    <div className="flex flex-col gap-4">
      <TypePill type={slide.type} />
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black leading-snug">{slide.title}</h2>
        {slide.body && <p className="text-base text-foreground/70">{slide.body}</p>}
      </div>

      {/* Verdict banner once results are shown */}
      {showResults && (
        isPilihan ? (
          submittedIndex === null ? (
            <Note>Kamu tidak menjawab. Jawaban benar: <strong>{correct.map(optionText).join(', ')}</strong></Note>
          ) : correct.includes(submittedIndex) ? (
            <Note tone="ok"><strong>Jawabanmu benar!</strong></Note>
          ) : (
            <Note tone="warn">
              <strong>Belum tepat.</strong> Jawaban benar: <strong>{correct.map(optionText).join(', ')}</strong>
            </Note>
          )
        ) : (
          <Note>Hasil polling · {counts!.totalResponses} respons</Note>
        )
      )}

      {/* Options — become result rows after reveal */}
      <div className="flex flex-col gap-2.5">
        {slide.options.map((opt, i) => {
          if (showResults) {
            const n = counts!.counts[i] ?? 0;
            const pct = counts!.totalResponses ? Math.round((n / counts!.totalResponses) * 100) : 0;
            const isCorrect = isPilihan && correct.includes(i);
            const isMine = submittedIndex === i;
            return (
              <div
                key={i}
                className={`relative flex min-h-[52px] items-center gap-3 overflow-hidden rounded-base border-2 border-border bg-secondary-background px-3 py-2.5 ${isMine ? 'shadow-[3px_3px_0_0_var(--border)]' : ''}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 ${isCorrect ? 'bg-[#34D399]/45' : 'bg-main/25'}`}
                  style={{ width: `${pct}%` }}
                />
                <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border text-xs font-black ${isCorrect ? 'bg-[#34D399]' : 'bg-secondary-background'}`}>
                  {isCorrect ? <Check className="size-4" strokeWidth={3} aria-label="jawaban benar" /> : letter(i)}
                </span>
                <span className="relative min-w-0 flex-1 text-sm font-semibold">
                  {opt}
                  {isMine && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border-2 border-border bg-secondary-background px-2 align-middle text-[10px] font-bold">
                      {isPilihan && !isCorrect && <X className="size-3" strokeWidth={3} />}
                      Jawabanmu
                    </span>
                  )}
                </span>
                <span className="relative shrink-0 text-right text-sm tabular-nums">
                  <span className="font-black">{pct}%</span>
                  <span className="block text-[11px] text-foreground/70">{n} suara</span>
                </span>
              </div>
            );
          }

          const isChosen = choice === i;
          const interactive = isResponder && status === 'buka' && !submitting;
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => setSelected(i)}
              aria-pressed={isChosen}
              className={`flex min-h-[52px] w-full items-center gap-3 rounded-base border-2 border-border px-3 py-2.5 text-left transition-all ${isChosen
                ? 'bg-main text-main-foreground shadow-[3px_3px_0_0_var(--border)]'
                : 'bg-secondary-background'
                } ${interactive ? 'cursor-pointer' : 'cursor-default'} ${interactive && !isChosen ? 'hover:bg-gray-100' : ''} ${status === 'belum' ? 'opacity-60' : ''}`}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-secondary-background text-xs font-black text-foreground">
                {letter(i)}
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold">{opt}</span>
              {isChosen && <Check className="size-5 shrink-0" strokeWidth={3} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Not opened yet: read ahead, wait for the presenter */}
      {status === 'belum' && (
        <WaitingPill>Menunggu presenter membuka jawaban</WaitingPill>
      )}

      {/* Open: send / update */}
      {status === 'buka' && (
        isResponder ? (
          <div className="flex flex-col gap-2.5">
            <Button
              onClick={handleSubmit}
              disabled={choice === null || submitting || (submittedIndex !== null && !changed)}
              className="min-h-[48px] w-full"
            >
              {submittedIndex === null
                ? isGroup ? 'Kirim Jawaban Kelompok' : 'Kirim Jawaban'
                : changed
                  ? isGroup ? 'Perbarui Jawaban Kelompok' : 'Perbarui Jawaban'
                  : 'Jawaban terkirim'}
            </Button>
            {submittedIndex !== null && !changed && (
              <Note tone="ok">
                Terkirim: <strong>{optionText(submittedIndex)}</strong>. Kamu masih bisa mengubahnya sampai ditutup.
              </Note>
            )}
            {changed && submittedIndex !== null && (
              <Note tone="warn">
                Pilihanmu berubah. Tekan <strong>Perbarui Jawaban</strong> untuk mengirim. Yang tersimpan sekarang: {optionText(submittedIndex)}.
              </Note>
            )}
          </div>
        ) : (
          <Note>
            Diskusikan bersama. <strong>{view.myGroup?.responderName}</strong> akan mengirim jawaban kelompok.
          </Note>
        )
      )}

      {/* Closed, results not (yet) on this device */}
      {status === 'tutup' && !showResults && (
        submittedIndex === null ? (
          <Note>Aktivitas ditutup. Kamu tidak menjawab.</Note>
        ) : (
          visible ? (
            <Note tone="ok">
              Jawabanmu sudah masuk! Hasilnya ditampilkan di layar depan. Jawabanmu: <strong>{optionText(submittedIndex)}</strong>.
            </Note>
          ) : (
            <Note>
              Aktivitas ditutup. Jawabanmu: <strong>{optionText(submittedIndex)}</strong>. Menunggu hasil ditampilkan…
            </Note>
          )
        )
      )}

      {/* Explanation after reveal */}
      {showResults && isPilihan && slide.explanation && (
        <div className="rounded-base border-2 border-border bg-secondary-background p-3">
          <p className="mb-1 text-xs font-bold text-foreground/70">Penjelasan</p>
          <p className="text-sm">{slide.explanation}</p>
        </div>
      )}
    </div>
  );
}
