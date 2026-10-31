'use client';

import { TrophyIcon, BarChart2Icon, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart } from '@/features/projector/BarChart';
import { LeaderboardView } from './LeaderboardView';
import { QuizCountdown } from './QuizCountdown';
import type { SendFn, PresenterView } from './types';

/**
 * Quiz panel — four states per POV matrix §4.7:
 *   not_started  → quiz info + single "Buka Pertanyaan Pertama" button
 *   active       → current question: countdown, submission count, next/finish
 *   finished     → "Kuis Selesai" + "Tampilkan Leaderboard"
 *   revealed     → LeaderboardView
 */
export function QuizPanel({ view, send }: { view: PresenterView; send: SendFn }) {
  const quiz = view.quiz;
  const quizSlide = view.slides.find((s) => s.type === 'kuis');

  if (!quizSlide) {
    return <p className="text-foreground/70">Slide kuis tidak ditemukan.</p>;
  }

  const questions = quizSlide.quizQuestions ?? [];
  const lastRun = quiz?.runs.at(-1);
  const currentQuestion = lastRun ? questions.find((q) => q.id === lastRun.questionId) : null;
  const currentIdx = lastRun ? questions.findIndex((q) => q.id === lastRun.questionId) : -1;
  const hasNext = currentIdx >= 0 && currentIdx < questions.length - 1;

  // ── not_started ────────────────────────────────────────────────────────────
  if (!quiz || quiz.runs.length === 0) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{quizSlide.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-foreground/70">
              {questions.length} soal · {quizSlide.duration ?? 30} detik per soal
            </p>
            <Button
              onClick={() =>
                send({ type: 'quiz.openQuestion', questionId: questions[0]?.id ?? '' })
              }
              disabled={questions.length === 0}
            >
              Buka Pertanyaan Pertama
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── revealed ───────────────────────────────────────────────────────────────
  if (quiz.revealed && view.leaderboard) {
    return <LeaderboardView leaderboard={view.leaderboard} send={send} />;
  }

  // ── finished ───────────────────────────────────────────────────────────────
  if (quiz.finished) {
    const totalOwners =
      quiz.ownerType === 'kelompok' ? view.groups.length : view.participants.length;

    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrophyIcon className="size-5" />
              Kuis Selesai
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={() => send({ type: 'quiz.revealLeaderboard' })}>
              Tampilkan Leaderboard
            </Button>

            {/* B8: Per-question results */}
            <div className="flex flex-col gap-2 pt-2 border-t-2 border-border">
              <p className="text-xs font-semibold text-foreground/60">Hasil per soal:</p>
              {questions.map((q, i) => {
                const run = quiz.runs.find((r) => r.questionId === q.id);
                const correct = run?.answers.filter((a) => a.correct).length ?? 0;
                const wrong = run?.answers.filter((a) => !a.correct).length ?? 0;
                const unanswered = totalOwners - (run?.answers.length ?? 0);
                return (
                  <div
                    key={q.id}
                    className="p-3 border-2 border-border rounded-base bg-secondary-background"
                  >
                    <p className="text-sm font-medium mb-2">
                      {i + 1}. {q.title}
                    </p>
                    <div className="flex gap-4 text-xs">
                      <span className="font-bold flex items-center gap-1 text-foreground"><Check className="size-3.5 text-foreground" strokeWidth={2.5} /> {correct} benar</span>
                      <span className="text-[var(--error)] font-bold flex items-center gap-1"><X className="size-3.5" strokeWidth={2.5} /> {wrong} salah</span>
                      <span className="text-foreground/70">— {unanswered} tidak menjawab</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── active question ────────────────────────────────────────────────────────
  if (lastRun && currentQuestion) {
    const totalOwners =
      quiz.ownerType === 'kelompok' ? view.groups.length : view.participants.length;

    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="default">
                Soal {currentIdx + 1} / {questions.length}
              </Badge>
              {lastRun.closed && (
                <Badge variant="neutral">Soal Ditutup</Badge>
              )}
            </div>
            <CardTitle className="mt-2">{currentQuestion.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Options with correct key */}
            <div className="grid grid-cols-2 gap-2">
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={i}
                  className={`p-3 border-2 rounded-base text-sm flex items-center gap-1 ${
                    currentQuestion.correct.includes(i)
                      ? 'border-[#34D399] bg-secondary-background'
                      : 'border-border'
                  }`}
                >
                  <span className="font-bold mr-1">{String.fromCharCode(65 + i)}.</span>
                  <span className="flex-1">{opt}</span>
                  {currentQuestion.correct.includes(i) && (
                    <Check className="size-4 shrink-0 text-foreground" strokeWidth={2.5} aria-label="benar" />
                  )}
                </div>
              ))}
            </div>

            {/* Countdown — only while open */}
            {!lastRun.closed && (
              <QuizCountdown
                deadlineAt={lastRun.deadlineAt}
                duration={quizSlide.duration ?? 30}
              />
            )}

            {/* Simulate quiz responses — DEMO_MODE only, while question open */}
            {!lastRun.closed && view.hasSimulatedData && (
              <Button
                variant="neutral"
                data-testid="simulate-quiz-btn"
                onClick={() => send({ type: 'session.simulateQuiz' })}
              >
                Simulasikan respons
              </Button>
            )}

            {/* Submission progress */}
            <div className="flex items-center gap-3 text-sm">
              <Progress
                value={totalOwners > 0 ? (lastRun.answers.length / totalOwners) * 100 : 0}
                className="flex-1"
              />
              <span className="whitespace-nowrap font-medium">
                {lastRun.answers.length} / {totalOwners} jawaban
              </span>
            </div>

            {/* B9: Controls — shown after question auto-closes */}
            {lastRun.closed && (
              <div className="flex flex-col gap-2 pt-2">
                {/* Tampilkan Hasil per question → broadcasts bar chart to projector */}
                {!(lastRun.resultsVisible ?? false) && (
                  <Button
                    variant="neutral"
                    onClick={() =>
                      send({ type: 'quiz.revealQuestion', questionRunId: lastRun.questionId })
                    }
                  >
                    <BarChart2Icon className="size-4 mr-1" />
                    Tampilkan Hasil Soal
                  </Button>
                )}
                {/* Per-question bar chart on presenter when results visible */}
                {(lastRun.resultsVisible ?? false) && currentQuestion && (
                  <div className="p-3 border-2 border-border rounded-base">
                    <BarChart
                      bars={currentQuestion.options.map((opt, i) => ({
                        label: opt,
                        count: lastRun.answers.filter((a) => a.option === i).length,
                        isCorrect: currentQuestion.correct.includes(i),
                      }))}
                      total={lastRun.answers.length}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  {hasNext ? (
                    <Button
                      onClick={() =>
                        send({
                          type: 'quiz.openQuestion',
                          questionId: questions[currentIdx + 1].id,
                        })
                      }
                    >
                      Soal Berikutnya →
                    </Button>
                  ) : (
                    <Button onClick={() => send({ type: 'quiz.finish' })}>Selesaikan Kuis</Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Defensive fallback (should not be reached in normal flow)
  return null;
}
