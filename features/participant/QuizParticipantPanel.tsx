'use client';

import { useEffect, useState } from 'react';
import { Check, X, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import { Progress } from '@/components/ui/progress';
import { BarChart } from '@/features/projector/BarChart';
import type { ParticipantView } from '@/contracts/views';
import type { QuizAnswerSubmit } from '@/contracts/commands';

type SendFn = (payload: QuizAnswerSubmit) => Promise<boolean>;

export function QuizParticipantPanel({ view, send }: { view: ParticipantView; send: SendFn }) {
  const quiz = view.quiz;
  const leaderboard = view.leaderboard;
  const isResponder = view.subRole === 'penjawab' || view.subRole === 'individu';
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(0);

  // Tick every 200ms for countdown
  useEffect(() => {
    setNow(Date.now()); const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, []);

  if (!quiz) {
    return (
      <div className="flex flex-col gap-3">
        <span
          className="inline-flex items-center self-start rounded-base border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0_0_#000]"
          style={{ backgroundColor: SLIDE_COLOR['kuis'] }}
        >
          Kuis
        </span>
        <p className="text-sm text-foreground/70 text-center py-6">
          Menunggu presenter memulai kuis…
        </p>
      </div>
    );
  }

  // Leaderboard reveal
  if (leaderboard) {
    const own = leaderboard.ownEntry;
    return (
      <div className="flex flex-col gap-4">
        <span
          className="inline-flex items-center self-start rounded-base border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0_0_#000]"
          style={{ backgroundColor: SLIDE_COLOR['kuis'] }}
        >
          Papan Peringkat
        </span>
        <h2 className="text-xl font-bold text-center flex items-center justify-center gap-2"><Trophy className="size-6" strokeWidth={2.5} /> Kuis Selesai!</h2>
        <div className="flex flex-col gap-2">
          {leaderboard.entries.map((e) => (
            <div
              key={e.ownerId}
              className={`flex items-center gap-3 px-3 py-2 rounded border-2 ${
                e.ownerId === view.pid ? 'bg-main text-main-foreground border-main shadow-[2px_2px_0_0_#000]' : 'bg-secondary-background border-border'
              }`}
            >
              <span className="text-lg font-black w-8 text-center">#{e.rank}</span>
              <span className="flex-1 font-medium text-sm">{e.ownerLabel}</span>
              <span className="font-bold text-sm">{e.totalScore} poin</span>
            </div>
          ))}
          {own && (
            <>
              <div className="border-t-2 border-dashed border-border my-1" />
              <div className="flex items-center gap-3 px-3 py-2 rounded border-2 bg-main border-black shadow-[2px_2px_0_0_#000]">
                <span className="text-lg font-black w-8 text-center">#{own.rank}</span>
                <span className="flex-1 font-medium text-sm">{own.ownerLabel} (kamu)</span>
                <span className="font-bold text-sm">{own.totalScore} poin</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Quiz finished but leaderboard not yet revealed
  if (quiz.finished) {
    return (
      <div className="flex flex-col gap-3 items-center text-center py-4">
        <span
          className="inline-flex items-center self-start rounded-base border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0_0_#000]"
          style={{ backgroundColor: SLIDE_COLOR['kuis'] }}
        >
          Kuis
        </span>
        <p className="text-lg font-bold">Kuis selesai!</p>
        <p className="text-sm text-foreground/60 animate-pulse">
          Menunggu presenter membuka papan peringkat…
        </p>
      </div>
    );
  }

  const aq = quiz.activeQuestion;
  if (!aq) {
    return (
      <div className="flex flex-col gap-3 items-center text-center py-4">
        <span
          className="inline-flex items-center self-start rounded-base border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0_0_#000]"
          style={{ backgroundColor: SLIDE_COLOR['kuis'] }}
        >
          Kuis
        </span>
        <p className="text-sm text-foreground/70 animate-pulse">
          Menunggu soal berikutnya…
        </p>
      </div>
    );
  }

  const timeLeft = Math.max(0, Math.ceil((aq.deadlineAt - now) / 1000));
  const totalSec = Math.ceil((aq.deadlineAt - aq.openedAt) / 1000);
  const pct = aq.closed ? 0 : (timeLeft / totalSec) * 100;

  const myAnswer = aq.myAnswer;
  const canAnswer = isResponder && !aq.closed && !myAnswer;

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
        <span
          className="inline-flex items-center rounded-base border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0_0_#000]"
          style={{ backgroundColor: SLIDE_COLOR['kuis'] }}
        >
          Soal {aq.index + 1} / {aq.total}
        </span>
        {!aq.closed && (
          <span
            className={`font-black text-xl tabular-nums ${timeLeft <= 5 ? 'text-[var(--error)]' : ''}`}
            aria-live="polite"
            aria-label={`${timeLeft} detik tersisa`}
          >
            {timeLeft}s
          </span>
        )}
      </div>

      {!aq.closed && (
        <Progress value={pct} className="h-2" />
      )}

      <h2 className="text-lg font-bold">{aq.title}</h2>

      <div className="flex flex-col gap-2">
        {aq.options.map((opt, i) => {
          const isMyPick = myAnswer?.option === i;
          const isCorrect = aq.correctOption !== null && aq.correctOption.includes(i);
          const isWrong = aq.closed && isMyPick && aq.correctOption !== null && !aq.correctOption.includes(i);

          let cls = 'w-full text-left px-4 py-3 rounded border-2 text-sm font-medium min-h-[48px] transition-colors ';
          if (isCorrect) {
            cls += 'bg-[#34D399] border-black text-foreground';
          } else if (isWrong) {
            cls += 'bg-secondary-background border-black border-4';
          } else if (isMyPick) {
            cls += 'bg-main text-main-foreground border-black shadow-[2px_2px_0_0_#000]';
          } else {
            cls += 'bg-secondary-background border-border';
          }
          if (!canAnswer && !aq.closed) cls += ' opacity-60';

          return (
            <button
              key={i}
              className={cls}
              disabled={!canAnswer || submitting}
              onClick={() => submitAnswer(i)}
              aria-pressed={isMyPick}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
              {opt}
              {isCorrect && aq.closed && (
                <Check className="ml-2 inline size-5" strokeWidth={2.5} aria-label="benar" />
              )}
              {isWrong && (
                <>
                  <X className="ml-2 inline size-5" strokeWidth={2.5} aria-label="salah" />
                  <span className="ml-1 text-sm font-semibold">Jawabanmu</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Post-submit state */}
      {myAnswer && !aq.closed && !view.hideContent && (
        <p className="text-sm text-foreground/60 text-center py-1 animate-pulse">
          Jawaban terkirim — menunggu soal ditutup…
        </p>
      )}
      {/* B10: hideContent confirmation after submitting */}
      {myAnswer && view.hideContent && (
        <div className="rounded border-2 border-black bg-main shadow-[2px_2px_0_0_#000] p-4 text-center text-sm font-semibold">
          Jawabanmu sudah masuk! Lihat hasilnya di layar depan.
        </div>
      )}
      {aq.closed && myAnswer && !view.hideContent && (
        <div className={`text-center py-2 rounded border-2 text-sm font-semibold shadow-[2px_2px_0_0_#000] ${myAnswer.correct ? 'bg-[#34D399] border-black text-foreground' : 'bg-secondary-background border-black text-foreground'}`}>
          {myAnswer.correct
            ? <span className="inline-flex items-center gap-1"><Check className="size-4" strokeWidth={2.5} /> Benar! +{myAnswer.score ?? 0} poin</span>
            : <span className="inline-flex items-center gap-1"><X className="size-4" strokeWidth={2.5} /> Salah · 0 poin</span>}
        </div>
      )}
      {aq.closed && !myAnswer && (
        <p className="text-sm text-foreground/60 text-center py-1">Tidak menjawab · 0 poin</p>
      )}
      {!isResponder && !aq.closed && (
        <p className="text-sm text-foreground/60 text-center italic">
          {view.myGroup?.responderName} menjawab untuk kelompok.
          {aq.groupAnswered && <span className="inline-flex items-center gap-1 ml-1"><Check className="size-3" strokeWidth={2.5} /> Sudah menjawab.</span>}
        </p>
      )}

      {/* B9: Per-question results bar chart — shown when presenter reveals (hideContent=OFF enforced in projection) */}
      {aq.closed && aq.resultsVisible && aq.answerCounts && (
        <div className="pt-2 border-t-2 border-border">
          <p className="text-xs font-semibold text-foreground/60 mb-2">Hasil soal ini:</p>
          <BarChart
            bars={aq.options.map((opt, i) => ({
              label: opt,
              count: aq.answerCounts![i],
              isCorrect: aq.correctOption?.includes(i) ?? false,
            }))}
            total={aq.answerCounts.reduce((s, c) => s + c, 0)}
          />
        </div>
      )}
    </div>
  );
}
