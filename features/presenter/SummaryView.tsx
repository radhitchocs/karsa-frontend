'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppHeader, HeaderTitle } from '@/components/AppHeader';
import {
  RESULT_TYPES,
  ResultCard,
  SessionSummary,
  cardClass,
  type SessionResult,
} from '@/features/shared/SessionResults';
import type { PresenterView } from './types';

/**
 * Map the live presenter view onto the saved-results shape so the end-of-session
 * screen reuses exactly the same cards as the editor's Hasil tab.
 */
function toSessionResult(view: PresenterView): SessionResult {
  const nameOf = (ownerId: string) => {
    const group = view.groups.find((g) => g.id === ownerId);
    if (group) return `Kelompok ${group.number}`;
    return view.participants.find((p) => p.id === ownerId)?.name ?? null;
  };
  const quizSlide = view.slides.find((s) => s.type === 'kuis');
  const questionIds = quizSlide?.quizQuestions?.map((q) => q.id) ?? [];

  return {
    id: view.sessionId,
    code: view.code,
    status: 'ENDED',
    // The live view carries no timestamps; the session has just ended.
    createdAt: new Date().toISOString(),
    endedAt: null,
    participantCount: view.participants.length,
    slides: view.slides.map((s) => {
      const responses = view.responses.filter((r) => r.slideId === s.id);
      const questions = view.questions.filter((q) => q.slideId === s.id);
      return {
        id: s.id,
        type: s.type,
        title: s.title,
        responseCount: s.type === 'tanya' ? questions.length : responses.length,
        responses: responses.map((r) => ({ value: r.value, ownerLabel: nameOf(r.ownerId) })),
        questions: questions.map((q) => ({ text: q.text, visible: q.visible, answered: q.answered })),
      };
    }),
    quizScores: (view.quiz?.runs ?? []).flatMap((run) =>
      run.answers.map((a) => ({
        questionRunId: run.questionId,
        questionIndex: Math.max(0, questionIds.indexOf(run.questionId)),
        ownerLabel: nameOf(a.ownerId),
        optionIndex: a.option,
        isCorrect: a.correct,
        score: a.score,
      })),
    ),
  };
}

export function SummaryView({ view }: { view: PresenterView }) {
  const router = useRouter();
  const session = useMemo(() => toSessionResult(view), [view]);
  const results = session.slides.filter((s) => RESULT_TYPES.has(s.type));

  return (
    <main className="flex min-h-full flex-col">
      <AppHeader
        onHome={() => router.push('/')}
        center={
          <HeaderTitle
            title={view.title}
            aside={
              <span className="rounded-full border-2 border-border bg-secondary-background px-2.5 py-0.5 text-xs font-bold">
                Selesai
              </span>
            }
          />
        }
        right={
          <Button variant="neutral" size="sm" onClick={() => router.push('/')}>
            <HomeIcon />
            Kembali ke Beranda
          </Button>
        }
      />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-6">
        {view.hasSimulatedData && (
          <div
            className="rounded-base border-2 border-border bg-[#FFD93D]/50 px-4 py-2 text-sm font-medium"
            data-testid="simulated-data-label"
          >
            Berisi data simulasi — bukan hasil sesi nyata
          </div>
        )}

        <SessionSummary session={session} />

        {results.length === 0 ? (
          <p className={`${cardClass} p-6 text-center text-sm text-foreground/70`}>
            Tidak ada slide interaktif di sesi ini.
          </p>
        ) : (
          results.map((s, i) => (
            <ResultCard
              key={s.id}
              result={s}
              slide={view.slides.find((x) => x.id === s.id)}
              number={i + 1}
              session={session}
            />
          ))
        )}

        <p className="text-center text-xs text-foreground/60">
          Hasil sesi ini juga tersimpan di tab <strong>Hasil</strong> pada editor presentasi.
        </p>
      </div>
    </main>
  );
}
