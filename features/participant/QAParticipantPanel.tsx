'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TypePill } from './ParticipantBits';
import type { ParticipantView } from '@/contracts/views';
import type { QuestionSubmit } from '@/contracts/commands';

type SendFn = (payload: QuestionSubmit) => Promise<boolean>;

export function QAParticipantPanel({ view, send }: { view: ParticipantView; send: SendFn }) {
  const slide = view.activeSlide;
  const activity = view.activity;
  const status = activity?.status ?? 'belum';
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const ok = await send({ type: 'question.submit', slideId: slide.id, text: text.trim() });
      if (ok) {
        setSent(true);
        setText('');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const visibleQuestions = view.questions.filter((q) => q.visible);

  return (
    <div className="flex flex-col gap-4">
      <TypePill type={slide.type} />
      <h2 className="text-xl font-black">{slide.title}</h2>
      {slide.body && <p className="text-base text-foreground/70">{slide.body}</p>}

      {/* B1: Waiting spinner */}
      {status === 'belum' && (
        <div className="flex flex-col items-center gap-3 py-6 text-foreground/70">
          <div className="size-8 rounded-full border-4 border-current border-t-transparent animate-spin" aria-hidden="true" />
          <p className="text-base">Menunggu presenter membuka Q&amp;A…</p>
        </div>
      )}

      {(status === 'buka' || status === 'tutup') && (
        <>
          {/* Submit form */}
          {status === 'buka' && (
            <div className="flex flex-col gap-2">
              <Textarea
                placeholder="Tuliskan pertanyaanmu… (maks 300 karakter)"
                maxLength={300}
                rows={3}
                value={text}
                onChange={(e) => { setText(e.target.value); setSent(false); }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/60">{text.length}/300</span>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !text.trim()}
                  size="sm"
                  className="min-h-[44px]"
                >
                  {submitting ? 'Mengirim…' : 'Kirim Pertanyaan'}
                </Button>
              </div>
              {/* B10: confirmation after submit when hideContent=ON */}
              {sent && view.hideContent && (
                <div className="rounded border-2 border-black bg-main shadow-[2px_2px_0_0_#000] p-3 text-center text-sm font-semibold">
                  Jawabanmu sudah masuk! Lihat hasilnya di layar depan.
                </div>
              )}
              {sent && !view.hideContent && (
                <span className="inline-flex items-center gap-1 rounded-base border-2 border-black bg-[#34D399] px-2 py-0.5 text-xs font-bold text-foreground shadow-[2px_2px_0_0_#000]">
                  <Check className="size-3" strokeWidth={2.5} />Pertanyaan terkirim!
                </span>
              )}
            </div>
          )}

          {/* Visible questions — only shown when hideContent=OFF (A3: projector-only per default) */}
          {!view.hideContent && visibleQuestions.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t-2 border-border">
              <p className="text-xs font-semibold text-foreground/60">Pertanyaan ditampilkan:</p>
              {visibleQuestions.map((q) => (
                <div
                  key={q.id}
                  className="bg-secondary-background border-2 border-border rounded px-3 py-2 text-sm"
                >
                  {q.text}
                  {q.answered && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded border border-black bg-[#34D399] px-1.5 py-0.5 text-xs font-bold text-foreground"><Check className="size-3" strokeWidth={2.5} />Terjawab</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
