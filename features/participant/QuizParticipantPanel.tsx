'use client';

import { useEffect, useState } from 'react';
import { Check, TrophyIcon, X } from 'lucide-react';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import { LeaderboardList } from '@/features/shared/LeaderboardList';
import type { ParticipantView } from '@/contracts/views';
import type { QuizAnswerSubmit } from '@/contracts/commands';
import { Note, TypePill, WaitingPill } from './ParticipantBits';

type SendFn = (payload: QuizAnswerSubmit) => Promise<boolean>;

const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * Participant quiz: waiting → timed question (one final answer) → verdict + per-option
 * results → leaderboard with the participant's own standing.
 */
export function QuizParticipantPanel({ view, send }: { view: ParticipantView; send: SendFn }) {
  const quiz = view.quiz;
  const leaderboard = view.leaderboard;
  const isResponder = view.subRole === 'penjawab' || view.subRole === 'individu';
  const myOwnerId = view.myGroup ? view.myGroup.id : view.pid;
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(0);

  // Tick for the countdown
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 200);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  const title = <h2 className="text-xl font-black leading-snug">{view.activeSlide.title}</h2>;

  if (!quiz) {
    return (
      <div className="flex flex-col gap-4">
        <TypePill type="kuis" />
        {title}
        <WaitingPill>Menunggu presenter memulai kuis</WaitingPill>
        <Note>Jawab secepat dan setepat mungkin — poin dihitung dari ketepatan dan kecepatan. Jawaban tidak bisa diubah setelah dikirim.</Note>
      </div>
    );
  }

  // ── Leaderboard ─────────────────────────────────────────────────────────
  if (leaderboard) {
    const mine = leaderboard.entries.find((e) => e.ownerId === myOwnerId) ?? leaderboard.ownEntry;
    return (
      <div className="flex flex-col gap-4">
        <TypePill type="kuis" />
        <h2 className="flex items-center gap-2 text-xl font-black"><TrophyIcon className="size-6" /> Kuis selesai!</h2>
        {mine && (
          <section className="flex items-center gap-4 rounded-base border-2 border-border bg-main p-4 text-main-foreground shadow-[4px_4px_0_0_var(--border)]">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-border bg-secondary-background text-2xl font-black text-foreground">
              #{mine.rank}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wide">{view.myGroup ? 'Peringkat kelompokmu' : 'Peringkatmu'}</span>
              <span className="text-2xl font-black tabular-nums">{mine.totalScore} poin</span>
              <span className="text-sm">{mine.correctCount} jawaban benar</span>
            </div>
          </section>
        )}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-foreground/70">Papan peringkat</p>
          <LeaderboardList entries={leaderboard.entries} highlightOwnerId={myOwnerId} />
          {leaderboard.ownEntry && (
            <>
              <div className="my-1 border-t-2 border-dashed border-border/40" />
              <LeaderboardList entries={[leaderboard.ownEntry]} highlightOwnerId={leaderboard.ownEntry.ownerId} />
            </>
          )}
        </div>
      </div>
    );
  }

  if (quiz.finished) {
    return (
      <div className="flex flex-col gap-4">
        <TypePill type="kuis" />
        {title}
        <WaitingPill>Kuis selesai — menunggu papan peringkat</WaitingPill>
      </div>
    );
  }

  const aq = quiz.activeQuestion;
  if (!aq) {
    return (
      <div className="flex flex-col gap-4">
        <TypePill type="kuis" />
        {title}
        <WaitingPill>Menunggu soal berikutnya</WaitingPill>
      </div>
    );
  }

  const timeLeft = Math.max(0, Math.ceil((aq.deadlineAt - (now || aq.openedAt)) / 1000));
  const totalSec = Math.max(1, Math.ceil((aq.deadlineAt - aq.openedAt) / 1000));
  const myAnswer = aq.myAnswer;
  const canAnswer = isResponder && !aq.closed && !myAnswer;
  const keyKnown = aq.closed && aq.correctOption !== null;
  const showCounts = aq.closed && aq.resultsVisible && aq.answerCounts;
  const totalAnswers = aq.answerCounts?.reduce((s, c) => s + c, 0) ?? 0;

  async function submitAnswer(optionIndex: number) {
    if (!canAnswer || submitting) return;
    setSubmitting(true);
    try {
      await send({ type: 'quiz.answerSubmit', questionRunId: aq!.questionId, optionIndex });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full border-2 border-border px-3 py-0.5 text-sm font-bold" style={{ backgroundColor: SLIDE_COLOR.kuis }}>
          Soal {aq.index + 1} / {aq.total}
        </span>
        {!aq.closed ? (
          <span
            className={`rounded-full border-2 border-border px-3 py-0.5 text-lg font-black tabular-nums ${timeLeft <= 5 ? 'bg-[var(--error)] text-black' : 'bg-secondary-background'}`}
            aria-live="polite"
            aria-label={`${timeLeft} detik tersisa`}
          >
            {timeLeft} dtk
          </span>
        ) : (
          <span className="rounded-full border-2 border-border bg-[#FFD93D] px-3 py-0.5 text-sm font-bold">Waktu habis</span>
        )}
      </div>

      {!aq.closed && (
        <span className="h-2 overflow-hidden rounded-full border-2 border-border bg-background">
          <span
            className={`block h-full transition-[width] duration-200 ${timeLeft <= 5 ? 'bg-[var(--error)]' : 'bg-main'}`}
            style={{ width: `${(timeLeft / totalSec) * 100}%` }}
          />
        </span>
      )}

      <h2 className="text-xl font-black leading-snug">{aq.title}</h2>

      {/* Verdict once the key is known on this device */}
      {keyKnown && (
        myAnswer ? (
          myAnswer.correct ? (
            <Note tone="ok"><strong>Benar! +{myAnswer.score ?? 0} poin</strong></Note>
          ) : (
            <Note tone="warn"><strong>Belum tepat · 0 poin.</strong> Jawaban benar: {aq.correctOption!.map((i) => `${letter(i)}. ${aq.options[i]}`).join(', ')}</Note>
          )
        ) : (
          <Note>Kamu tidak menjawab · 0 poin.</Note>
        )
      )}

      {showCounts && <p className="-mb-2 text-xs font-bold text-foreground/70">Hasil soal ini</p>}
      <div className="flex flex-col gap-2.5">
        {aq.options.map((opt, i) => {
          const isMine = myAnswer?.option === i;
          const isCorrect = keyKnown && aq.correctOption!.includes(i);
          const isWrongMine = keyKnown && isMine && !isCorrect;
          const n = aq.answerCounts?.[i] ?? 0;
          const pct = showCounts && totalAnswers ? Math.round((n / totalAnswers) * 100) : 0;

          return (
            <button
              key={i}
              type="button"
              disabled={!canAnswer || submitting}
              onClick={() => submitAnswer(i)}
              aria-pressed={isMine}
              className={`relative flex min-h-[52px] w-full items-center gap-3 overflow-hidden rounded-base border-2 border-border px-3 py-2.5 text-left transition-all ${isMine && !keyKnown
                ? 'bg-main text-main-foreground shadow-[3px_3px_0_0_var(--border)]'
                : 'bg-secondary-background'
                } ${canAnswer ? 'cursor-pointer hover:bg-gray-100' : 'cursor-default'} ${isMine && keyKnown ? 'shadow-[3px_3px_0_0_var(--border)]' : ''} ${!canAnswer && !aq.closed && !isMine ? 'opacity-60' : ''}`}
            >
              {showCounts && (
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 ${isCorrect ? 'bg-[#34D399]/45' : 'bg-main/25'}`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border text-xs font-black text-foreground ${isCorrect ? 'bg-[#34D399]' : 'bg-secondary-background'}`}>
                {isCorrect ? <Check className="size-4" strokeWidth={3} aria-label="benar" /> : isWrongMine ? <X className="size-4" strokeWidth={3} aria-label="salah" /> : letter(i)}
              </span>
              <span className="relative min-w-0 flex-1 text-sm font-semibold">
                {opt}
                {isMine && keyKnown && (
                  <span className="ml-2 inline-flex rounded-full border-2 border-border bg-secondary-background px-2 align-middle text-[10px] font-bold">Jawabanmu</span>
                )}
              </span>
              {showCounts && <span className="relative shrink-0 text-sm font-black tabular-nums">{pct}%</span>}
              {isMine && !keyKnown && <Check className="relative size-5 shrink-0" strokeWidth={3} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/* Status under the options */}
      {!aq.closed && isResponder && myAnswer && <Note tone="ok">Jawaban terkirim — tunggu waktu habis.</Note>}
      {!aq.closed && isResponder && !myAnswer && <Note>Pilih satu jawaban. Jawaban langsung terkirim dan tidak bisa diubah.</Note>}
      {!aq.closed && !isResponder && (
        <Note>
          <strong>{view.myGroup?.responderName}</strong> menjawab untuk kelompok.{aq.groupAnswered ? ' Sudah menjawab.' : ''}
        </Note>
      )}
      {aq.closed && !keyKnown && (
        myAnswer ? <Note tone="ok">Jawabanmu sudah masuk! Lihat hasilnya di layar depan.</Note> : <Note>Waktu habis. Kamu tidak menjawab.</Note>
      )}
    </div>
  );
}
