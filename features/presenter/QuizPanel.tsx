'use client';

import { useEffect, useState } from 'react';
import { ArrowRightIcon, BarChart2Icon, CheckIcon, EyeIcon, FlagIcon, PlayIcon, PowerIcon, TrophyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LeaderboardList } from '@/features/shared/LeaderboardList';
import { labels } from '@/domain/model';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import type { SendFn, PresenterView } from './types';

const cardClass =
  'rounded-base border-2 border-border bg-secondary-background shadow-[4px_4px_0_0_var(--border)]';
const letter = (i: number) => String.fromCharCode(65 + i);

/** Seconds left until `deadlineAt`, ticking 4×/s. */
function useRemaining(deadlineAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadlineAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadlineAt]);
  return deadlineAt === null ? 0 : Math.max(0, Math.ceil((deadlineAt - now) / 1000));
}

function StatusPill({ text, dot, pulse }: { text: string; dot: string; pulse?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border-2 border-border px-2.5 py-0.5 text-xs font-bold">
      <span className="relative flex size-2" aria-hidden="true">
        {pulse && <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${dot}`} />}
        <span className={`relative inline-flex size-2 rounded-full ${dot}`} />
      </span>
      {text}
    </span>
  );
}

/** Thin labelled bar used for "answered" and per-question correct rates. */
function Meter({ label, value, total, color = 'bg-main' }: { label: string; value: number; total: number; color?: string }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums"><span className="font-black">{value}</span><span className="text-foreground/70"> / {total}</span></span>
      </div>
      <span className="h-3 overflow-hidden rounded-full border-2 border-border bg-background">
        <span className={`block h-full transition-[width] duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

/**
 * Presenter quiz control. Stages: not started → question open (countdown) → question closed
 * (optionally show per-question results) → next / finish → summary → leaderboard.
 */
export function QuizPanel({
  view,
  send,
  onRequestEnd,
}: {
  view: PresenterView;
  send: SendFn;
  /** Opens the shared "Tutup sesi?" confirmation (owned by the parent). */
  onRequestEnd: () => void;
}) {
  const quiz = view.quiz;
  const quizSlide = view.slides.find((s) => s.type === 'kuis');
  const lastRun = quiz?.runs.at(-1);
  const remaining = useRemaining(lastRun && !lastRun.closed ? lastRun.deadlineAt : null);

  if (!quizSlide) return <p className="text-foreground/70">Slide kuis tidak ditemukan.</p>;

  const questions = quizSlide.quizQuestions ?? [];
  const duration = quizSlide.duration ?? 30;
  const currentQuestion = lastRun ? questions.find((q) => q.id === lastRun.questionId) : null;
  const currentIdx = lastRun ? questions.findIndex((q) => q.id === lastRun.questionId) : -1;
  const hasNext = currentIdx >= 0 && currentIdx < questions.length - 1;
  const totalOwners = quiz?.ownerType === 'kelompok' ? view.groups.length : view.participants.length;

  const heading = (
    <div>
      <span
        className="mb-2 inline-flex items-center rounded-base border-2 border-border px-2.5 py-0.5 text-xs font-bold"
        style={{ backgroundColor: SLIDE_COLOR.kuis }}
      >
        {labels.kuis}
      </span>
      <h2 className="text-xl font-bold">{quizSlide.title}</h2>
    </div>
  );

  let body: React.ReactNode = null;

  if (!quiz || quiz.runs.length === 0) {
    // ── Not started ───────────────────────────────────────────────────────
    body = (
      <section className={`${cardClass} flex flex-col gap-4 p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Siap memulai kuis</h3>
          <StatusPill text="Belum dimulai" dot="bg-foreground/30" />
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border-2 border-border px-3 py-0.5" style={{ backgroundColor: SLIDE_COLOR.kuis }}>{questions.length} soal</span>
          <span className="rounded-full border-2 border-border px-3 py-0.5">{duration} dtk / soal</span>
          <span className="rounded-full border-2 border-border px-3 py-0.5">{view.groups.length > 0 ? 'Mode kelompok' : 'Mode individu'}</span>
        </div>
        <ol className="flex flex-col gap-1.5 text-sm">
          {questions.map((q, i) => (
            <li key={q.id} className="flex gap-2">
              <span className="w-5 shrink-0 text-right font-bold tabular-nums text-foreground/60">{i + 1}.</span>
              <span className="min-w-0 truncate">{q.title || <span className="text-foreground/50">(tanpa teks)</span>}</span>
            </li>
          ))}
        </ol>
        <Button
          className="self-end"
          disabled={questions.length === 0}
          onClick={() => send({ type: 'quiz.openQuestion', questionId: questions[0]?.id ?? '' })}
        >
          <PlayIcon />
          Buka Pertanyaan Pertama
        </Button>
      </section>
    );
  } else if (quiz.revealed && view.leaderboard) {
    // ── Leaderboard ───────────────────────────────────────────────────────
    body = (
      <section className={`${cardClass} flex flex-col gap-4 p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold"><TrophyIcon className="size-4" /> Papan Peringkat</h3>
          <StatusPill text="Ditampilkan di proyektor" dot="bg-main" />
        </div>
        <LeaderboardList entries={view.leaderboard.entries} />
        <Button variant="neutral" className="self-end text-[var(--error-fg)] hover:bg-[var(--error)] hover:text-black" onClick={onRequestEnd}>
          <PowerIcon />
          Tutup Sesi
        </Button>
      </section>
    );
  } else if (quiz.finished) {
    // ── Finished, before leaderboard ──────────────────────────────────────
    body = (
      <section className={`${cardClass} flex flex-col gap-4 p-5`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold"><FlagIcon className="size-4" /> Kuis selesai</h3>
          <StatusPill text="Menunggu papan peringkat" dot="bg-[#FFD93D]" />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-foreground/70">Jawaban benar per soal</p>
          {questions.map((q, i) => {
            const run = quiz.runs.find((r) => r.questionId === q.id);
            const correct = run?.answers.filter((a) => a.correct).length ?? 0;
            return (
              <Meter
                key={q.id}
                label={`${i + 1}. ${q.title}`}
                value={correct}
                total={totalOwners}
                color="bg-[#34D399]"
              />
            );
          })}
        </div>
        <Button className="self-end" onClick={() => send({ type: 'quiz.revealLeaderboard' })}>
          <TrophyIcon />
          Tampilkan Papan Peringkat
        </Button>
      </section>
    );
  } else if (lastRun && currentQuestion) {
    // ── Question open / closed ────────────────────────────────────────────
    const visible = lastRun.resultsVisible ?? false;
    const counts = currentQuestion.options.map((_, i) => lastRun.answers.filter((a) => a.option === i).length);
    const timePct = duration ? (remaining / duration) * 100 : 0;
    body = (
      <section className={`${cardClass} flex flex-col gap-4 p-5`}>
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border-2 border-border px-3 py-0.5 text-xs font-bold" style={{ backgroundColor: SLIDE_COLOR.kuis }}>
            Soal {currentIdx + 1} / {questions.length}
          </span>
          {!lastRun.closed ? (
            <StatusPill text={`Menjawab · ${remaining} dtk`} dot="bg-[#34D399]" pulse />
          ) : visible ? (
            <StatusPill text="Hasil ditampilkan" dot="bg-main" />
          ) : (
            <StatusPill text="Waktu habis" dot="bg-[#FFD93D]" />
          )}
        </div>

        <h3 className="text-lg font-bold leading-snug">{currentQuestion.title}</h3>

        {!lastRun.closed && (
          <span className="h-2 overflow-hidden rounded-full border-2 border-border bg-background">
            <span
              className={`block h-full transition-[width] duration-300 ${remaining <= 5 ? 'bg-[var(--error)]' : 'bg-main'}`}
              style={{ width: `${timePct}%` }}
            />
          </span>
        )}

        {/* Options with the answer key + live counts (presenter only) */}
        <div className="grid grid-cols-2 gap-2">
          {currentQuestion.options.map((opt, i) => {
            const isCorrect = currentQuestion.correct.includes(i);
            return (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-base border-2 border-border px-3 py-2.5 text-sm ${isCorrect ? 'bg-[#34D399]/30' : 'bg-secondary-background'}`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-secondary-background text-[11px] font-black">
                  {isCorrect ? <CheckIcon className="size-3.5" strokeWidth={3} aria-label="benar" /> : letter(i)}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{opt}</span>
                <span className="rounded-full bg-foreground px-2 text-[11px] font-bold tabular-nums text-background">{counts[i]}</span>
              </div>
            );
          })}
        </div>
        <p className="-mt-2 flex items-center gap-1.5 text-xs text-foreground/70">
          <EyeIcon className="size-3.5" /> Kunci jawaban dan jumlah per opsi hanya terlihat oleh Anda.
        </p>

        <Meter label={quiz.ownerType === 'kelompok' ? 'Kelompok menjawab' : 'Peserta menjawab'} value={lastRun.answers.length} total={totalOwners} />

        <div className="flex flex-wrap items-center justify-end gap-2 border-t-2 border-border/15 pt-3">
          {!lastRun.closed && view.hasSimulatedData && (
            <Button variant="neutral" size="sm" data-testid="simulate-quiz-btn" onClick={() => send({ type: 'session.simulateQuiz' })}>
              Simulasikan respons
            </Button>
          )}
          {!lastRun.closed && (
            <span className="mr-auto text-xs text-foreground/70">Soal ditutup otomatis saat waktu habis.</span>
          )}
          {lastRun.closed && !visible && (
            <Button
              variant="neutral"
              size="sm"
              onClick={() => send({ type: 'quiz.revealQuestion', questionRunId: lastRun.questionId })}
            >
              <BarChart2Icon />
              Tampilkan Hasil Soal
            </Button>
          )}
          {lastRun.closed && (
            hasNext ? (
              <Button size="sm" onClick={() => send({ type: 'quiz.openQuestion', questionId: questions[currentIdx + 1].id })}>
                Soal Berikutnya
                <ArrowRightIcon />
              </Button>
            ) : (
              <Button size="sm" onClick={() => send({ type: 'quiz.finish' })}>
                <FlagIcon />
                Selesaikan Kuis
              </Button>
            )
          )}
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {heading}
      {body}
    </div>
  );
}
