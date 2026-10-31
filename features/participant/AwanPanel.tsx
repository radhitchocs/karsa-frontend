'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WordCloud } from '@/features/projector/WordCloud';
import { labels } from '@/domain/model';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import type { ParticipantView } from '@/contracts/views';
import type { ResponseSubmit } from '@/contracts/commands';

type SendFn = (payload: ResponseSubmit) => Promise<boolean>;

export function AwanPanel({ view, send }: { view: ParticipantView; send: SendFn }) {
  const slide = view.activeSlide;
  const activity = view.activity;
  const myResponse = view.myResponse ?? view.groupResponse;
  const isResponder = view.subRole === 'penjawab' || view.subRole === 'individu';
  const status = activity?.status ?? 'belum';

  const submitted: string[] = myResponse?.value ?? [];
  const [words, setWords] = useState<[string, string, string]>(
    submitted.length > 0
      ? [submitted[0] ?? '', submitted[1] ?? '', submitted[2] ?? '']
      : ['', '', ''],
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const vals = words.map((w) => w.trim()).filter(Boolean);
    if (!vals.length || !isResponder) return;
    setSubmitting(true);
    try {
      await send({ type: 'response.submit', slideId: slide.id, value: vals });
    } finally {
      setSubmitting(false);
    }
  }

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

      {/* B1: Waiting spinner */}
      {status === 'belum' && (
        <div className="flex flex-col items-center gap-3 py-6 text-foreground/70">
          <div className="size-8 rounded-full border-4 border-current border-t-transparent animate-spin" aria-hidden="true" />
          <p className="text-base">Menunggu presenter membuka aktivitas…</p>
        </div>
      )}

      {(status === 'buka' || status === 'tutup') && (
        <div className="flex flex-col gap-2">
          {([0, 1, 2] as const).map((i) => (
            <Input
              key={i}
              placeholder={`Kata ${i + 1} (opsional, maks 40 karakter)`}
              maxLength={40}
              value={words[i]}
              disabled={!isResponder || status !== 'buka'}
              onChange={(e) => {
                const next = [...words] as [string, string, string];
                next[i] = e.target.value;
                setWords(next);
              }}
              className="min-h-[48px]"
            />
          ))}
        </div>
      )}

      {status === 'buka' && (
        <>
          {isResponder ? (
            <Button onClick={handleSubmit} disabled={submitting} className="min-h-[48px]">
              {view.subRole === 'penjawab'
                ? submitted.length > 0 ? 'Perbarui Kata Kelompok' : 'Kirim Kata Kelompok'
                : submitted.length > 0 ? 'Perbarui Kata' : 'Kirim Kata'}
            </Button>
          ) : (
            <p className="text-sm text-foreground/60 text-center italic">
              Diskusikan bersama.{' '}
              <span className="not-italic font-medium text-foreground">
                {view.myGroup?.responderName}
              </span>{' '}
              akan mengirim kata.
            </p>
          )}
        </>
      )}

      {/* B10: hideContent confirmation */}
      {(status === 'buka' || status === 'tutup') && view.hideContent && submitted.length > 0 && !view.revealedWords && (
        <div className="rounded border-2 border-black bg-main shadow-[2px_2px_0_0_#000] p-4 text-center text-sm font-semibold">
          Jawabanmu sudah masuk! Lihat hasilnya di layar depan.
        </div>
      )}

      {/* B5: Word cloud when visible (hideContent=OFF) */}
      {status === 'tutup' && view.revealedWords && (
        <WordCloud words={view.revealedWords} />
      )}

      {status === 'tutup' && !view.hideContent && (
        <p className="text-sm text-foreground/70 text-center py-2">
          {submitted.length > 0 ? `Kamu mengirim: ${submitted.join(', ')}` : 'Tidak mengirim kata.'}
        </p>
      )}
    </div>
  );
}
