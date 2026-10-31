'use client';

import { useEffect, useState } from 'react';
import { Trophy, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { BarChart } from './BarChart';
import { WordCloud } from './WordCloud';
import { PancingView } from './PancingView';
import { QnaView } from './QnaView';
import { MateriSlide } from '@/features/shared/MateriSlide';
import { labels } from '@/domain/model';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import type { ProjectorView } from '@/contracts/views';

export function ProjectorActiveView({ view }: { view: ProjectorView }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);
  const slide = view.activeSlide;
  const prog = view.responseProgress;
  const results = view.revealedResults;
  const quiz = view.quiz;
  const lb = view.leaderboard;

  // ── Leaderboard ──────────────────────────────────────────────────────
  if (lb) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 h-full p-8">
        <h2 className="text-5xl font-black flex items-center gap-3"><Trophy className="size-12" strokeWidth={2.5} /> Papan Peringkat</h2>
        <div className="flex flex-col gap-3 w-full max-w-2xl">
          {lb.entries.map((e) => (
            <div
              key={e.ownerId}
              className="flex items-center gap-4 px-6 py-3 rounded border-2 border-black bg-white shadow-[4px_4px_0_0_#000]"
            >
              <span className="text-3xl font-black w-12 text-center">#{e.rank}</span>
              <span className="flex-1 text-2xl font-bold">{e.ownerLabel}</span>
              <span className="text-2xl font-black">{e.totalScore}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Quiz active question ──────────────────────────────────────────────
  if (quiz?.activeQuestion) {
    const aq = quiz.activeQuestion;
    const totalSec = Math.ceil((aq.deadlineAt - aq.openedAt) / 1000);
    const remaining = Math.max(0, Math.ceil((aq.deadlineAt - Date.now()) / 1000));
    const pct = aq.closed ? 0 : (remaining / totalSec) * 100;

    return (
      <div className="flex flex-col gap-6 h-full p-8 justify-center">
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center rounded-base border-2 border-black px-4 py-1 text-lg font-bold shadow-[2px_2px_0_0_#000]"
            style={{ backgroundColor: SLIDE_COLOR['kuis'] }}
          >
            Soal {aq.index + 1} / {aq.total}
          </span>
          <span className={`text-5xl font-black tabular-nums ${!aq.closed && remaining <= 5 ? 'text-[var(--error)]' : ''}`}>
            {aq.closed ? '—' : `${remaining}s`}
          </span>
        </div>
        {!aq.closed && <Progress value={pct} className="h-3" />}
        <h2 className="font-bold leading-tight" style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)' }}>{aq.title}</h2>
        <div className="grid grid-cols-2 gap-4">
          {aq.options.map((opt, i) => {
            const isCorrect = aq.closed && (aq.correctOption?.includes(i) ?? false);
            return (
              <div
                key={i}
                className={`px-5 py-4 rounded border-2 text-xl font-semibold shadow-[2px_2px_0_0_#000] ${
                  isCorrect ? 'bg-[#34D399] border-black' : 'bg-white border-black'
                }`}
              >
                <span className="font-black mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
                {isCorrect && <Check className="ml-2 inline size-6" strokeWidth={2.5} aria-label="jawaban benar" />}
              </div>
            );
          })}
        </div>
        <p className="text-xl text-foreground/60 text-right">
          {aq.submittedCount} / {aq.totalOwners} menjawab
        </p>

        {/* B9: Per-question results bar chart — shown when presenter clicks Tampilkan Hasil */}
        {aq.resultsVisible && aq.answerCounts && (
          <BarChart
            bars={aq.options.map((opt, i) => ({
              label: opt,
              count: aq.answerCounts![i],
              isCorrect: aq.correctOption?.includes(i) ?? false,
            }))}
            total={aq.submittedCount}
            size="lg"
          />
        )}
      </div>
    );
  }

  // ── Quiz finished waiting for leaderboard ──────────────────────────────
  if (quiz?.finished) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <p className="text-4xl font-bold">Kuis selesai!</p>
        <p className="text-2xl text-foreground/60 animate-pulse">Menunggu papan peringkat…</p>
      </div>
    );
  }

  // ── Pancing slide ────────────────────────────────────────────────────────
  if (slide.type === 'pancing') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-8 py-3 shrink-0">
          <span
            className="inline-flex items-center rounded-base border-2 border-black px-3 py-1 text-sm font-bold shadow-[2px_2px_0_0_#000]"
            style={{ backgroundColor: SLIDE_COLOR['pancing'] }}
          >
            {labels['pancing']}
          </span>
          <h2 className="text-xl font-bold">{slide.title}</h2>
        </div>
        <div className="flex-1 px-4 pb-4">
          <PancingView
            participants={view.pancingParticipants ?? []}
            lastPick={view.lastPick}
          />
        </div>
      </div>
    );
  }

  // ── Group slide ─────────────────────────────────────────────────────────
  if (slide.type === 'kelompok') {
    return (
      <div className="flex flex-col gap-6 h-full p-8 justify-center items-center">
        <h2 className="text-4xl font-bold">{slide.title}</h2>
        {view.groups.length === 0 ? (
          <p className="text-2xl text-foreground/70">Menunggu pembagian kelompok…</p>
        ) : (
          <div className="flex flex-wrap gap-4 justify-center">
            {view.groups.map((g) => (
              <div
                key={g.number}
                className="bg-white border-2 border-black rounded shadow-[4px_4px_0_0_#000] px-8 py-6 text-center"
              >
                <p className="text-3xl font-black">Kelompok {g.number}</p>
                <p className="text-xl text-foreground/60 mt-1">{g.memberCount} anggota</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (slide.type === 'tanya') {
    return (
      <QnaView
        title={slide.title}
        body={slide.body || undefined}
        label={labels['tanya']}
        color={SLIDE_COLOR['tanya']}
        questions={results?.type === 'tanya' ? results.questions : []}
        totalReceived={results?.type === 'tanya' ? results.totalReceived : 0}
      />
    );
  }

  // ── Regular slide ────────────────────────────────────────────────────────
  const showBarChart =
    results && (results.type === 'pilihan' || results.type === 'polling');

  // Materi slide: delegate to MateriSlide component
  if (slide.type === 'materi') {
    return (
      <div className="relative flex flex-col h-full p-8">
        <MateriSlide
          title={slide.title}
          body={slide.body || undefined}
          titleDoc={slide.titleDoc}
          bodyDoc={slide.bodyDoc}
          image={slide.image || undefined}
          image2={slide.image2 || undefined}
          layout={slide.layout}
          variant="projector"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col gap-4 h-full p-8 ${showBarChart ? 'pt-14' : 'justify-center'}`}
    >

      <div className={`flex items-center justify-between shrink-0 ${showBarChart ? 'gap-4' : ''}`}>
        <span
          className={`inline-flex items-center rounded-base border-2 border-black px-4 py-1 text-lg font-bold shadow-[2px_2px_0_0_#000] ${showBarChart ? 'shrink-0' : ''}`}
          style={{ backgroundColor: SLIDE_COLOR[slide.type] }}
        >
          {labels[slide.type]}
        </span>
        {showBarChart && (
          <h2
            className="flex-1 min-w-0 font-bold leading-tight line-clamp-2"
            style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2.25rem)' }}
          >
            {slide.title}
          </h2>
        )}
        {prog && (
          <span className={`text-xl font-semibold text-foreground/60 ${showBarChart ? 'shrink-0' : ''}`}>
            {prog.wordsReceived !== undefined
              ? `${prog.wordsReceived} kata`
              : `${prog.received} / ${prog.total} respon`}
          </span>
        )}
      </div>

      {!showBarChart && (
        <h2
          className="font-bold leading-tight shrink-0"
          style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)' }}
        >
          {slide.title}
        </h2>
      )}

      {slide.body && !showBarChart && (
        <p className="text-2xl text-foreground/70 shrink-0">{slide.body}</p>
      )}

      {prog && !showBarChart && slide.type !== 'awan' && (
        <Progress
          value={prog.total > 0 ? (prog.received / prog.total) * 100 : 0}
          className="h-3 shrink-0"
        />
      )}

      {results && results.type === 'awan' && (
        <WordCloud words={results.words} />
      )}

      {showBarChart && (
        <BarChart
          bars={(results as { options: string[]; counts: number[]; totalResponses: number; type: string }).options.map(
            (opt, i) => ({
              label: opt,
              count: (results as { counts: number[] }).counts[i],
              isCorrect:
                results!.type === 'pilihan' && (slide.correct?.includes(i) ?? false),
            }),
          )}
          total={(results as { totalResponses: number }).totalResponses}
          size="lg"
        />
      )}
    </div>
  );
}
