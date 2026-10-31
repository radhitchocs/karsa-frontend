'use client';

import { useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalize } from '@/domain/model';
import type { ParticipantView } from '@/contracts/views';
import type { ResponseSubmit } from '@/contracts/commands';
import { Note, TypePill, WaitingPill } from './ParticipantBits';

type SendFn = (payload: ResponseSubmit) => Promise<boolean>;

const MAX_WORDS = 3;
const MAX_LEN = 40;
const TOP_N = 8;

/**
 * Participant view for Awan kata: up to 3 short phrases as chips, sent/changed state,
 * and after reveal a compact "most sent" list (the full cloud lives on the projector).
 */
export function AwanPanel({ view, send }: { view: ParticipantView; send: SendFn }) {
  const slide = view.activeSlide;
  const status = view.activity?.status ?? 'belum';
  const myResponse = view.myResponse ?? view.groupResponse;
  const isResponder = view.subRole === 'penjawab' || view.subRole === 'individu';
  const isGroup = view.subRole === 'penjawab';

  const submitted: string[] = myResponse?.value ?? [];
  // null = no local edits since the last send
  const [draftWords, setDraftWords] = useState<string[] | null>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const words = draftWords ?? submitted;
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((w, i) => normalize(w) === normalize(b[i]));
  const changed = draftWords !== null && !same(draftWords, submitted);
  const canAdd = isResponder && status === 'buka' && words.length < MAX_WORDS;

  function addWord() {
    const w = input.trim();
    if (!w || words.length >= MAX_WORDS) return;
    if (words.some((x) => normalize(x) === normalize(w))) {
      setInput('');
      return;
    }
    setDraftWords([...words, w]);
    setInput('');
  }

  function removeWord(i: number) {
    setDraftWords(words.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!words.length || !isResponder) return;
    setSubmitting(true);
    try {
      const ok = await send({ type: 'response.submit', slideId: slide.id, value: words });
      if (ok) setDraftWords(null);
    } finally {
      setSubmitting(false);
    }
  }

  const revealed = status === 'tutup' && view.revealedWords;
  const mine = new Set(submitted.map(normalize));

  return (
    <div className="flex flex-col gap-4">
      <TypePill type={slide.type} />
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-black leading-snug">{slide.title}</h2>
        {slide.body && <p className="text-base text-foreground/70">{slide.body}</p>}
      </div>

      {status === 'belum' && <WaitingPill>Menunggu presenter membuka aktivitas</WaitingPill>}

      {/* Word chips (own words), editable while open */}
      {status !== 'belum' && (words.length > 0 || status === 'buka') && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-foreground/70">
            {isResponder ? (isGroup ? 'Kata kelompok' : 'Kata kamu') : 'Kata kelompok'} ({words.length}/{MAX_WORDS})
          </p>
          <div className="flex min-h-11 flex-wrap items-center gap-2">
            {words.length === 0 && <span className="text-sm text-foreground/60">Belum ada kata.</span>}
            {words.map((w, i) => (
              <span
                key={`${w}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-[#FFD93D] py-1 pl-3 pr-1.5 text-sm font-bold"
              >
                {w}
                {isResponder && status === 'buka' && (
                  <button
                    type="button"
                    aria-label={`Hapus kata ${w}`}
                    onClick={() => removeWord(i)}
                    className="flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-black/10"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>

          {canAdd && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addWord();
              }}
            >
              <Input
                value={input}
                maxLength={MAX_LEN}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Tulis kata/frasa (maks ${MAX_LEN} karakter)`}
                aria-label="Kata baru"
                className="min-h-11"
              />
              <Button type="submit" variant="neutral" size="icon" aria-label="Tambah kata" disabled={!input.trim()} className="size-11 shrink-0">
                <PlusIcon />
              </Button>
            </form>
          )}
        </div>
      )}

      {status === 'buka' && (
        isResponder ? (
          <div className="flex flex-col gap-2.5">
            <Button
              onClick={handleSubmit}
              disabled={!words.length || submitting || (submitted.length > 0 && !changed)}
              className="min-h-[48px] w-full"
            >
              {submitted.length === 0
                ? isGroup ? 'Kirim Kata Kelompok' : 'Kirim Kata'
                : changed
                  ? isGroup ? 'Perbarui Kata Kelompok' : 'Perbarui Kata'
                  : 'Kata terkirim'}
            </Button>
            {submitted.length > 0 && !changed && (
              <Note tone="ok">Terkirim. Kamu masih bisa mengubah katamu sampai aktivitas ditutup.</Note>
            )}
            {changed && submitted.length > 0 && (
              <Note tone="warn">
                Katamu berubah. Tekan <strong>Perbarui Kata</strong> untuk mengirim. Yang tersimpan sekarang: {submitted.join(', ')}.
              </Note>
            )}
          </div>
        ) : (
          <Note>
            Diskusikan bersama. <strong>{view.myGroup?.responderName}</strong> akan mengirim kata kelompok.
          </Note>
        )
      )}

      {status === 'tutup' && !revealed && (
        submitted.length === 0 ? (
          <Note>Aktivitas ditutup. Kamu tidak mengirim kata.</Note>
        ) : view.activity?.visible ? (
          <Note tone="ok">Jawabanmu sudah masuk! Awan kata ditampilkan di layar depan.</Note>
        ) : (
          <Note>Aktivitas ditutup. Menunggu awan kata ditampilkan…</Note>
        )
      )}

      {/* After reveal: compact top list; your words highlighted. The cloud itself is on the projector. */}
      {revealed && view.revealedWords && (
        <section className="flex flex-col gap-2 rounded-base border-2 border-border bg-secondary-background p-4 shadow-[3px_3px_0_0_var(--border)]">
          <p className="flex items-baseline justify-between text-sm font-bold">
            Kata terpopuler
            <span className="text-xs font-normal text-foreground/70">Awan lengkap di layar depan</span>
          </p>
          <ol className="flex flex-col gap-1.5">
            {[...view.revealedWords]
              .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
              .slice(0, TOP_N)
              .map((w, i) => {
                const isMine = mine.has(normalize(w.text));
                return (
                  <li key={w.text} className={`flex items-center gap-2.5 rounded-base px-2 py-1 text-sm ${isMine ? 'border-2 border-border bg-[#FFD93D]' : ''}`}>
                    <span className="w-5 text-right text-xs font-bold tabular-nums text-foreground/60">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{w.text}</span>
                    {isMine && <span className="text-[10px] font-bold">Katamu</span>}
                    <span className="rounded-full bg-foreground px-2 text-[11px] font-bold tabular-nums text-background">{w.count}</span>
                  </li>
                );
              })}
          </ol>
        </section>
      )}
    </div>
  );
}
