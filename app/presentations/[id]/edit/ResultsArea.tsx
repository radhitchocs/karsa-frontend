'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3Icon, CalendarIcon, CheckIcon, UsersIcon } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { type Kind, type Slide, labels } from '@/domain/model';
import { SLIDE_COLOR } from '@/lib/slide-colors';

type SessionResult = {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  endedAt: string | null;
  participantCount: number;
  slides: Array<{
    id: string;
    type: string;
    title: string;
    responseCount: number;
    responses: Array<{ value: unknown; ownerLabel: string | null }>;
    questions: Array<{ text: string; visible: boolean; answered: boolean }>;
  }>;
  quizScores: Array<{
    questionRunId: string;
    questionIndex: number;
    ownerLabel: string | null;
    optionIndex: number;
    isCorrect: boolean;
    score: number;
  }>;
};

type SlideResult = SessionResult['slides'][number];

/** Slide types that produce results; content-only types (materi, kelompok, pancing) are skipped. */
const RESULT_TYPES = new Set(['pilihan', 'polling', 'awan', 'tanya', 'kuis']);

/** Leaderboard medal fills (PRD §17: never reused for other meanings). */
const MEDALS = ['#FBBF24', '#CBD5E1', '#D97706'];

const cardClass =
  'rounded-base border-2 border-border bg-secondary-background shadow-[4px_4px_0_0_var(--border)]';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

function duration(s: SessionResult): string {
  if (!s.endedAt) return '—';
  const min = Math.round((new Date(s.endedAt).getTime() - new Date(s.createdAt).getTime()) / 60_000);
  if (min < 1) return '< 1 mnt';
  return min < 60 ? `${min} mnt` : `${Math.floor(min / 60)} j ${min % 60} mnt`;
}

// ---------------------------------------------------------------------------
// ResultsArea — C8: past sessions of a presentation
// ---------------------------------------------------------------------------

export function ResultsArea({ presentationId, slides }: { presentationId: string; slides: Slide[] }) {
  // null = newest session (results arrive newest first)
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const { data: results, isLoading } = useQuery<SessionResult[]>({
    queryKey: ['presentation-results', presentationId],
    queryFn: () => apiFetch<SessionResult[]>(`/api/presentations/${presentationId}/results`),
    enabled: !!getToken(),
  });

  if (isLoading) {
    return <div className="flex flex-1 items-center justify-center p-8 text-foreground/70">Memuat hasil…</div>;
  }
  if (!results || results.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className={`${cardClass} flex max-w-sm flex-col items-center gap-3 px-8 py-10 text-center`}>
          <BarChart3Icon className="size-10 text-foreground/40" />
          <p className="font-bold">Belum ada sesi yang tersimpan.</p>
          <p className="text-sm text-foreground/70">Mulai sesi dari tombol di kanan atas; hasilnya muncul di sini setelah sesi berakhir.</p>
        </div>
      </div>
    );
  }

  const session = results.find((s) => s.id === activeSession) ?? results[0];

  return (
    <div className="flex min-h-0 flex-1">
      {/* Session list */}
      <aside className="flex w-64 shrink-0 flex-col border-r-2 border-border bg-secondary-background">
        <div className="flex items-baseline justify-between border-b-2 border-border px-4 py-3">
          <h2 className="text-sm font-bold">Sesi Lampau</h2>
          <span className="text-xs tabular-nums text-foreground/70">{results.length} sesi</span>
        </div>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {results.map((s, i) => {
            const selected = s.id === session.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSession(s.id)}
                aria-current={selected || undefined}
                className={`flex cursor-pointer flex-col gap-1 rounded-base border-2 px-3 py-2.5 text-left transition-colors ${selected
                  ? 'border-border bg-background shadow-[3px_3px_0_0_var(--border)]'
                  : 'border-transparent hover:border-border/40'
                  }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold tabular-nums">#{s.code}</span>
                  {i === 0 && (
                    <span className="rounded-full border-2 border-border bg-main px-2 text-[10px] font-bold text-main-foreground">
                      Terbaru
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-foreground/70">
                  <CalendarIcon className="size-3.5" />
                  {fmtDate(s.createdAt)} · {fmtTime(s.createdAt)}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-foreground/70">
                  <UsersIcon className="size-3.5" />
                  {s.participantCount} peserta
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Session detail */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 p-6">
          <SessionSummary session={session} />
          {session.slides
            .filter((s) => RESULT_TYPES.has(s.type))
            // Numbered by position in this list (content slides are hidden), so it always starts at 1.
            .map((s, i) => (
              <ResultCard
                key={s.id}
                result={s}
                slide={slides.find((x) => x.id === s.id)}
                number={i + 1}
                session={session}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function SessionSummary({ session }: { session: SessionResult }) {
  const interactive = session.slides.filter((s) => RESULT_TYPES.has(s.type));
  const totalResponses = interactive.reduce(
    (sum, s) => sum + (s.type === 'tanya' ? s.questions.length : s.type === 'kuis' ? 0 : s.responseCount),
    0,
  ) + session.quizScores.length;
  const ended = session.status === 'ENDED';
  const stats: [string, string | number][] = [
    ['Peserta', session.participantCount],
    ['Respons', totalResponses],
    ['Slide interaktif', interactive.length],
    ['Durasi', duration(session)],
  ];

  return (
    <section className={`${cardClass} p-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-black tabular-nums">Sesi #{session.code}</h2>
        <span
          className={`rounded-full border-2 border-border px-2.5 py-0.5 text-xs font-bold ${ended ? 'bg-secondary-background' : 'bg-[#34D399]'}`}
        >
          {ended ? 'Selesai' : session.status}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-sm text-foreground/70">
          <CalendarIcon className="size-4" />
          {fmtDate(session.createdAt)} · {fmtTime(session.createdAt)}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-base border-2 border-border bg-background px-3 py-2">
            <dt className="text-xs text-foreground/70">{label}</dt>
            <dd className="text-2xl font-black tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ResultCard({
  result,
  slide,
  number,
  session,
}: {
  result: SlideResult;
  slide?: Slide;
  number: number;
  session: SessionResult;
}) {
  const kind = result.type as Kind;
  const owners = new Set(session.quizScores.map((q) => q.ownerLabel)).size;
  const count =
    kind === 'tanya'
      ? `${result.questions.length} pertanyaan`
      : kind === 'kuis'
        ? `${owners} peserta`
        : `${result.responseCount} respons`;

  return (
    <section className={cardClass}>
      <header className="flex items-center gap-2 border-b-2 border-border px-5 py-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border text-xs font-bold tabular-nums">
          {number}
        </span>
        <span
          className="shrink-0 rounded-full border-2 border-border px-2.5 py-0.5 text-xs font-bold"
          style={{ backgroundColor: SLIDE_COLOR[kind] }}
        >
          {labels[kind] ?? result.type}
        </span>
        <h3 className="min-w-0 flex-1 truncate font-bold" title={result.title}>{result.title}</h3>
        <span className="shrink-0 text-xs tabular-nums text-foreground/70">{count}</span>
      </header>
      <div className="p-5">
        {(kind === 'pilihan' || kind === 'polling') && (
          <OptionBars result={result} options={slide?.options ?? []} correct={kind === 'pilihan' ? slide?.correct ?? [] : []} />
        )}
        {kind === 'awan' && <WordCounts result={result} />}
        {kind === 'tanya' && <QuestionList result={result} />}
        {kind === 'kuis' && <QuizResults session={session} questionCount={slide?.quizQuestions?.length} />}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-foreground/70">{children}</p>;
}

/** Pilihan / polling: one row per option with text, bar, count and share. */
function OptionBars({ result, options, correct }: { result: SlideResult; options: string[]; correct: number[] }) {
  const counts: number[] = [];
  for (const r of result.responses) {
    const v = r.value as string[];
    const idx = Number(Array.isArray(v) ? v[0] : NaN);
    if (Number.isInteger(idx) && idx >= 0) counts[idx] = (counts[idx] ?? 0) + 1;
  }
  const rows = Math.max(options.length, counts.length);
  if (result.responseCount === 0 || rows === 0) return <Empty>Belum ada respons.</Empty>;

  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => {
        const n = counts[i] ?? 0;
        const pct = Math.round((n / result.responseCount) * 100);
        const isCorrect = correct.includes(i);
        return (
          <li key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)_4.5rem] items-center gap-x-3 gap-y-1.5">
            <span
              className={`row-span-2 flex size-7 items-center justify-center rounded-base border-2 border-border text-xs font-black ${isCorrect ? 'bg-[#34D399]' : 'bg-secondary-background'}`}
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
              <span className="truncate">{options[i] || `Opsi ${String.fromCharCode(65 + i)}`}</span>
              {isCorrect && <CheckIcon className="size-4 shrink-0" strokeWidth={2.5} aria-label="jawaban benar" />}
            </span>
            <span className="row-span-2 text-right text-sm tabular-nums">
              <span className="font-bold">{n}</span>
              <span className="text-foreground/70"> · {pct}%</span>
            </span>
            <span className="h-3 overflow-hidden rounded-full border-2 border-border bg-background">
              <span
                className={`block h-full ${isCorrect ? 'bg-[#34D399]' : 'bg-main'}`}
                style={{ width: `${pct}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Awan kata: identical words merged, sized by how often they were sent. */
function WordCounts({ result }: { result: SlideResult }) {
  const tally = new Map<string, { text: string; n: number }>();
  for (const r of result.responses) {
    for (const w of Array.isArray(r.value) ? (r.value as string[]) : []) {
      const key = w.trim().toLowerCase();
      if (!key) continue;
      const cur = tally.get(key);
      tally.set(key, { text: cur?.text ?? w.trim(), n: (cur?.n ?? 0) + 1 });
    }
  }
  const words = [...tally.values()].sort((a, b) => b.n - a.n || a.text.localeCompare(b.text));
  if (words.length === 0) return <Empty>Belum ada kata.</Empty>;
  const max = words[0].n;
  const total = words.reduce((s, w) => s + w.n, 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-foreground/70">{total} kata · {words.length} unik</p>
      <div className="flex flex-wrap items-center gap-2">
        {words.map((w) => {
          const size = max === 1 ? 'text-sm' : w.n === max ? 'text-xl' : w.n / max >= 0.5 ? 'text-base' : 'text-sm';
          return (
            <span
              key={w.text}
              className={`inline-flex items-center gap-2 rounded-full border-2 border-border px-3 py-1 font-bold ${size} ${w.n === max ? 'bg-[#FFD93D]' : 'bg-secondary-background'}`}
            >
              {w.text}
              <span className="rounded-full bg-foreground px-1.5 text-[10px] tabular-nums text-background">{w.n}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function QuestionList({ result }: { result: SlideResult }) {
  if (result.questions.length === 0) return <Empty>Belum ada pertanyaan.</Empty>;
  return (
    <ol className="flex flex-col gap-2">
      {result.questions.map((q, i) => (
        <li key={i} className="flex items-start gap-3 rounded-base border-2 border-border bg-background px-3 py-2.5">
          <span className="w-5 shrink-0 text-sm font-bold tabular-nums text-foreground/70">{i + 1}.</span>
          <span className="min-w-0 flex-1 text-sm">{q.text}</span>
          {q.visible && (
            <span className="shrink-0 rounded-full border-2 border-border bg-[#FF8FCB] px-2 text-[10px] font-bold">Ditampilkan</span>
          )}
          {q.answered && (
            <span className="shrink-0 rounded-full border-2 border-border bg-[#34D399] px-2 text-[10px] font-bold">Terjawab</span>
          )}
        </li>
      ))}
    </ol>
  );
}

/** Kuis: ranked leaderboard plus the share of correct answers per question. */
function QuizResults({ session, questionCount }: { session: SessionResult; questionCount?: number }) {
  const scores = session.quizScores;
  if (scores.length === 0) return <Empty>Belum ada jawaban kuis.</Empty>;

  const byOwner = new Map<string, { name: string; correct: number; answered: number; points: number }>();
  for (const s of scores) {
    const key = s.ownerLabel ?? '—';
    const row = byOwner.get(key) ?? { name: key, correct: 0, answered: 0, points: 0 };
    row.answered += 1;
    row.correct += s.isCorrect ? 1 : 0;
    row.points += s.score;
    byOwner.set(key, row);
  }
  const board = [...byOwner.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  const qCount = Math.max(questionCount ?? 0, ...scores.map((s) => s.questionIndex + 1));
  const perQuestion = Array.from({ length: qCount }, (_, qi) => {
    const qs = scores.filter((s) => s.questionIndex === qi);
    return { answered: qs.length, correct: qs.filter((s) => s.isCorrect).length };
  });

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-2">
        {board.map((row, i) => (
          <li key={row.name} className="grid grid-cols-[2rem_minmax(0,1fr)_auto_5.5rem] items-center gap-3 rounded-base border-2 border-border bg-background px-3 py-2">
            <span
              className="flex size-7 items-center justify-center rounded-full border-2 border-border text-xs font-black tabular-nums"
              style={{ backgroundColor: MEDALS[i] ?? 'var(--secondary-background)' }}
            >
              {i + 1}
            </span>
            <span className="truncate text-sm font-semibold">{row.name}</span>
            <span className="text-xs tabular-nums text-foreground/70">{row.correct}/{row.answered} benar</span>
            <span className="text-right text-sm font-black tabular-nums">{row.points} poin</span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2 border-t-2 border-border/15 pt-4">
        <h4 className="text-xs font-bold text-foreground/70">Jawaban benar per soal</h4>
        {perQuestion.map((q, qi) => {
          const pct = q.answered ? Math.round((q.correct / q.answered) * 100) : 0;
          return (
            <div key={qi} className="grid grid-cols-[3.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-sm">
              <span className="font-semibold">Soal {qi + 1}</span>
              <span className="h-3 overflow-hidden rounded-full border-2 border-border bg-background">
                <span className="block h-full bg-[#34D399]" style={{ width: `${pct}%` }} />
              </span>
              <span className="text-right tabular-nums text-foreground/70">{q.correct}/{q.answered} · {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
