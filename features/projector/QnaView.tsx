'use client';

import { useLayoutEffect, useRef } from 'react';
import { Check } from 'lucide-react';

type Props = {
  title: string;
  body?: string;
  label: string;
  color: string;
  questions: Array<{ text: string; answered: boolean }>;
  totalReceived: number;
};

/**
 * Q&A projector slide. When the presenter shows a question it takes the title's
 * place at full size, and the slide title slides up next to the Q&A label.
 */
export function QnaView({ title, body, label, color, questions, totalReceived }: Props) {
  // Presenter can show only one question at a time
  const active = questions[0] ?? null;
  const hasActive = active !== null;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const last = useRef<{ left: number; top: number; fontSize: number } | null>(null);

  // FLIP: animate the title from its previous position/size to the new one
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = { left: rect.left, top: rect.top, fontSize: parseFloat(getComputedStyle(el).fontSize) };
    const prev = last.current;
    last.current = next;
    if (!prev) return;
    const dx = prev.left - next.left;
    const dy = prev.top - next.top;
    const scale = prev.fontSize / next.fontSize;
    el.animate(
      [
        { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transformOrigin: 'top left', transform: 'none' },
      ],
      { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  }, [hasActive]);

  return (
    // Same frame as the other slides: centered vertically, badge far left, count far right.
    <div className="flex h-full flex-col justify-center gap-4 p-8">
      <div className="flex shrink-0 items-center gap-4">
        <span
          className="inline-flex items-center rounded-base border-2 border-black px-4 py-1 text-lg font-bold shadow-[2px_2px_0_0_#000] shrink-0"
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
        {active && (
          <h2 ref={titleRef} className="min-w-0 truncate text-lg font-medium">
            {title}
          </h2>
        )}
        <span className="ml-auto shrink-0 text-xl font-semibold text-foreground/60">
          {totalReceived} pertanyaan
        </span>
      </div>

      {/* Title and question share one grid cell, so the big text always starts
          at the same spot and the header never shifts */}
      <div className="grid shrink-0">
        <div
          className={`[grid-area:1/1] flex flex-col gap-4 ${active ? 'invisible' : ''}`}
          aria-hidden={active ? true : undefined}
        >
          <h2
            ref={active ? undefined : titleRef}
            className="font-bold leading-tight"
            style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)' }}
          >
            {title}
          </h2>
          {body && <p className="text-2xl text-foreground/70">{body}</p>}
        </div>
        {active && (
          <h2
            key={active.text}
            className="[grid-area:1/1] font-bold leading-tight animate-in fade-in slide-in-from-bottom-6 duration-500"
            style={{ fontSize: 'clamp(2.5rem, 4vw, 4rem)' }}
          >
            {active.text}
            {active.answered && (
              <Check className="ml-3 inline size-10" strokeWidth={2.5} aria-label="terjawab" />
            )}
          </h2>
        )}
      </div>
    </div>
  );
}
