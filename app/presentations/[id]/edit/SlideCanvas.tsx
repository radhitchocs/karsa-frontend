'use client';

import { CheckIcon, FishIcon, InfoIcon, MessageSquareIcon } from 'lucide-react';
import type { Slide } from '@/domain/model';

/** 16:9 slide card shared by every type; grows if content outgrows the ratio. */
export const canvasFrameClass =
  'aspect-video w-full rounded-base border-2 border-border bg-white shadow-[4px_4px_0px_0px_var(--border)]';

/** Types whose canvas has a description/question line under the title. */
const typesWithBody = new Set<Slide['type']>(['pilihan', 'polling', 'awan', 'tanya']);

const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * Canvas for non-materi slides: title (and description where the type has one)
 * edited inline, then a static preview of what the projector will show.
 */
export function SlideCanvas({
  slide,
  onChange,
}: {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
}) {
  return (
    <div className={`${canvasFrameClass} flex flex-col gap-3 p-8`}>
      <input
        id="slide-title"
        aria-label="Judul slide"
        value={slide.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder={slide.type === 'kuis' ? 'Judul kuis…' : 'Judul slide…'}
        className="w-full shrink-0 border-b-2 border-transparent bg-transparent pb-1 text-2xl font-bold outline-none placeholder:text-foreground/50 focus:border-main"
        data-testid="canvas-title-input"
      />
      {typesWithBody.has(slide.type) && (
        <textarea
          id="slide-body"
          aria-label="Deskripsi / pertanyaan"
          value={slide.body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="Deskripsi / pertanyaan…"
          rows={1}
          className="field-sizing-content w-full shrink-0 resize-none bg-transparent text-base text-foreground/70 outline-none placeholder:text-foreground/50"
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col justify-center pt-2">
        <CanvasPreview slide={slide} />
      </div>
    </div>
  );
}

function CanvasPreview({ slide }: { slide: Slide }) {
  switch (slide.type) {
    case 'pilihan':
    case 'polling':
      return (
        <OptionTiles
          options={slide.options}
          correct={slide.type === 'pilihan' ? slide.correct : []}
        />
      );
    case 'awan':
      return <WordCloudPlaceholder />;
    case 'tanya':
      return <QnaPlaceholder />;
    case 'kelompok':
      return <GroupTiles count={slide.groups} />;
    case 'pancing':
      return <PreviewHint icon={<FishIcon className="size-10" />} text="Peserta dipilih acak saat sesi berlangsung" />;
    case 'kuis':
      return <QuizPreview slide={slide} />;
    default:
      return null;
  }
}

function OptionTiles({ options, correct }: { options: string[]; correct: number[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt, i) => {
        const isCorrect = correct.includes(i);
        return (
          <div
            key={i}
            className={`flex min-w-0 items-center gap-2 rounded-base border-2 border-black px-4 py-3 font-semibold shadow-[2px_2px_0_0_#000] ${isCorrect ? 'bg-[#34D399]' : 'bg-white'}`}
          >
            <span className="font-black">{letter(i)}.</span>
            <span className={`truncate ${opt ? '' : 'text-foreground/40'}`}>{opt || `Opsi ${letter(i)}`}</span>
            {isCorrect && <CheckIcon className="ml-auto size-4 shrink-0" strokeWidth={2.5} aria-label="jawaban benar" />}
          </div>
        );
      })}
    </div>
  );
}

const sampleWords: [string, string][] = [
  ['semangat', 'text-3xl'],
  ['ide', 'text-xl'],
  ['kolaborasi', 'text-2xl'],
  ['belajar', 'text-lg'],
  ['seru', 'text-4xl'],
  ['fokus', 'text-xl'],
];

function WordCloudPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 font-bold text-foreground/20">
        {sampleWords.map(([w, size]) => (
          <span key={w} className={size}>{w}</span>
        ))}
      </div>
      <p className="text-xs text-foreground/60">Kata dari peserta akan muncul di sini</p>
    </div>
  );
}

function QnaPlaceholder() {
  return (
    <div className="flex flex-col gap-2">
      {[0.75, 0.5].map((w) => (
        <div key={w} className="flex items-center gap-3 rounded-base border-2 border-dashed border-foreground/20 px-4 py-3">
          <MessageSquareIcon className="size-4 shrink-0 text-foreground/30" />
          <div className="h-2.5 rounded-full bg-foreground/10" style={{ width: `${w * 100}%` }} />
        </div>
      ))}
      <p className="text-center text-xs text-foreground/60">Pertanyaan peserta yang Anda pilih akan tampil di sini</p>
    </div>
  );
}

function GroupTiles({ count }: { count: number }) {
  const n = Number.isFinite(count) && count > 0 ? count : 0;
  const shown = Math.min(n, 8);
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {Array.from({ length: shown }, (_, i) => (
        <div key={i} className="rounded-base border-2 border-black bg-white px-5 py-3 text-center shadow-[2px_2px_0_0_#000]">
          <p className="font-black">Kelompok {i + 1}</p>
          <p className="text-xs text-foreground/60">— anggota</p>
        </div>
      ))}
      {n > shown && (
        <div className="flex items-center px-2 text-sm font-semibold text-foreground/60">+{n - shown} lagi</div>
      )}
      {n === 0 && <PreviewHint text="Atur jumlah kelompok di panel Pengaturan" />}
    </div>
  );
}

function QuizPreview({ slide }: { slide: Slide }) {
  const questions = slide.quizQuestions ?? [];
  const first = questions[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 text-xs font-semibold">
        <span className="rounded-full border-2 border-black bg-[#B8F25B] px-3 py-0.5">{questions.length} soal</span>
        <span className="rounded-full border-2 border-black bg-white px-3 py-0.5">{slide.duration ?? '—'} dtk / soal</span>
      </div>
      {first ? (
        <>
          <p className="text-lg font-bold">
            <span className="text-foreground/50">1. </span>
            {first.title || <span className="text-foreground/40">Teks pertanyaan…</span>}
          </p>
          <OptionTiles options={first.options} correct={first.correct} />
        </>
      ) : (
        <PreviewHint text="Belum ada soal. Tambahkan di panel Pengaturan." />
      )}
    </div>
  );
}

function PreviewHint({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center text-foreground/40">
      {icon}
      <p className="text-sm text-foreground/60">{text}</p>
    </div>
  );
}

/** Right-hand settings card; scrolls internally so long settings never stretch the page. */
export function SettingsPanel({ children }: { children: React.ReactNode }) {
  return (
    <aside
      aria-label="Pengaturan slide"
      className="flex min-h-0 flex-col rounded-base border-2 border-border bg-secondary-background shadow-[4px_4px_0px_0px_var(--border)]"
    >
      <h2 className="shrink-0 border-b-2 border-border px-4 py-3 text-sm font-bold">Pengaturan</h2>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}

/** Explanatory note for types without configurable settings. */
export function PanelNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 text-sm text-foreground/70">
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
