'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart } from '@/features/projector/BarChart';
import { labels } from '@/domain/model';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import type { ParticipantView } from '@/contracts/views';
import type { ResponseSubmit } from '@/contracts/commands';

type SendFn = (payload: ResponseSubmit) => Promise<boolean>;

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
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const status = activity?.status ?? 'belum';
  const visible = activity?.visible ?? false;

  // Submitted value (from server)
  const submittedIndex =
    myResponse && myResponse.value.length > 0 ? Number(myResponse.value[0]) : null;

  async function handleSubmit() {
    if (selected === null || !isResponder) return;
    setSubmitting(true);
    try {
      await send({ type: 'response.submit', slideId: slide.id, value: [String(selected)] });
    } finally {
      setSubmitting(false);
    }
  }

  const currentSel = submittedIndex !== null ? submittedIndex : selected;

  return (
    <div className="flex flex-col gap-4">
      <span
        className="inline-flex items-center self-start rounded-base border-2 border-black px-3 py-1 text-base font-bold shadow-[4px_4px_0_0_#000]"
        style={{ backgroundColor: SLIDE_COLOR[slide.type] }}
      >
        {labels[slide.type]}
      </span>
      <h2 className="text-xl font-black">{slide.title}</h2>
      {slide.body && <p className="text-base text-foreground/70">{slide.body}</p>}

      {/* B1: Waiting state */}
      {status === 'belum' && (
        <div className="flex flex-col items-center gap-3 py-6 text-foreground/70">
          <div className="size-8 rounded-full border-4 border-current border-t-transparent animate-spin" aria-hidden="true" />
          <p className="text-base">Menunggu presenter membuka aktivitas…</p>
        </div>
      )}

      {/* Options — shown when open or closed */}
      {(status === 'buka' || status === 'tutup') && (
        <div className="flex flex-col gap-2">
          {slide.options.map((opt, i) => {
            const isSelected = currentSel === i;
            const isCorrect = visible && slide.type === 'pilihan' && (slide.correct?.includes(i) ?? false);
            const isWrong = visible && slide.type === 'pilihan' && isSelected && !(slide.correct?.includes(i) ?? false);
            const isSubmitted = submittedIndex === i;

            let btnClass =
              'w-full text-left px-4 py-3 rounded border-2 text-sm font-medium transition-all min-h-[48px]';
            if (isCorrect) {
              btnClass += ' bg-secondary-background border-[#34D399] border-4';
            } else if (isWrong) {
              btnClass += ' bg-secondary-background border-black border-4';
            } else if (isSelected) {
              btnClass += ' bg-main text-main-foreground border-main';
            } else {
              btnClass += ' bg-secondary-background border-border hover:border-foreground/50';
            }

            return (
              <button
                key={i}
                className={btnClass}
                disabled={!isResponder || status !== 'buka' || submitting}
                onClick={() => isResponder && status === 'buka' && setSelected(i)}
                aria-pressed={isSelected}
              >
                <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
                {isCorrect && <Check className="ml-2 inline size-5" strokeWidth={2.5} aria-label="jawaban benar" />}
                {isWrong && (
                  <>
                    <X className="ml-2 inline size-5" strokeWidth={2.5} aria-label="jawaban salah" />
                    <span className="ml-1 text-sm font-semibold">Jawabanmu</span>
                  </>
                )}
                {isSubmitted && !isCorrect && !isWrong && <span className="ml-2 text-foreground/70 text-xs">(terkirim)</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Submit / member hint */}
      {status === 'buka' && (
        <>
          {isResponder ? (
            <Button
              onClick={handleSubmit}
              disabled={selected === null && submittedIndex === null || submitting}
              className="min-h-[48px]"
            >
              {view.subRole === 'penjawab'
                ? submittedIndex !== null ? 'Perbarui Jawaban Kelompok' : 'Kirim Jawaban Kelompok'
                : submittedIndex !== null ? 'Perbarui Jawaban' : 'Kirim Jawaban'}
            </Button>
          ) : (
            <div className="text-sm text-foreground/60 text-center py-2 italic">
              Diskusikan bersama.{' '}
              <span className="not-italic font-medium text-foreground">
                {view.myGroup?.responderName}
              </span>{' '}
              akan mengirim jawaban.
            </div>
          )}
        </>
      )}

      {/* B10: hideContent confirmation — shown after submitting when hideContent=ON */}
      {(status === 'buka' || status === 'tutup') && view.hideContent && submittedIndex !== null && !visible && (
        <div className="rounded border-2 border-black bg-main shadow-[2px_2px_0_0_#000] p-4 text-center text-sm font-semibold">
          Jawabanmu sudah masuk! Lihat hasilnya di layar depan.
        </div>
      )}

      {/* B5: Bar chart — shown when results revealed (visible=true, which only happens when hideContent=OFF) */}
      {status === 'tutup' && view.revealedCounts && (
        <div className="pt-2">
          <BarChart
            bars={view.revealedCounts.options.map((opt, i) => ({
              label: opt,
              count: view.revealedCounts!.counts[i],
              isCorrect: slide.type === 'pilihan' && (slide.correct?.includes(i) ?? false),
            }))}
            total={view.revealedCounts.totalResponses}
          />
        </div>
      )}

      {/* Closed + not visible: fallback messages */}
      {status === 'tutup' && !visible && submittedIndex === null && !view.hideContent && (
        <p className="text-sm text-foreground/70 text-center py-2">Tidak menjawab.</p>
      )}
      {status === 'tutup' && !visible && submittedIndex !== null && !view.hideContent && (
        <p className="text-sm text-foreground/70 text-center py-2">Jawaban terkirim. Menunggu hasil ditampilkan…</p>
      )}
      {status === 'tutup' && visible && submittedIndex === null && (
        <p className="text-sm text-foreground/60 text-center py-2">Tidak menjawab · 0 poin</p>
      )}
    </div>
  );
}
