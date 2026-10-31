'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

type BarDef = { label: string; count: number; isCorrect?: boolean };

const CHART_VARS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}

export function BarChart({
  bars,
  total,
  size = 'md',
}: {
  bars: BarDef[];
  total: number;
  /** 'lg' = projector full-stage (flex-1, large text); 'md' = presenter/participant; 'sm' = compact */
  size?: 'sm' | 'md' | 'lg';
}) {
  const [animated, setAnimated] = useState(false);
  const noMotion = useReducedMotion();

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setAnimated(true));
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const maxCount = Math.max(...bars.map((b) => b.count), 1);

  const wrapperClass =
    size === 'lg'
      ? 'w-full select-none flex flex-col flex-1 min-h-0 overflow-hidden'
      : 'w-full select-none';

  const barAreaClass =
    size === 'lg'
      ? 'flex items-stretch gap-3 px-1 flex-1 min-h-[110px] pt-2'
      : size === 'sm'
      ? 'flex items-end gap-2 px-1 h-32'
      : 'flex items-end gap-2 sm:gap-3 px-1 h-56';

  const countClass =
    size === 'lg'
      ? 'text-3xl font-black tabular-nums leading-none'
      : size === 'sm'
      ? 'text-xs font-black tabular-nums leading-none'
      : 'text-xl font-black tabular-nums leading-none';

  const pctClass =
    size === 'lg'
      ? 'text-xl text-foreground/60 font-semibold leading-none'
      : size === 'sm'
      ? 'text-[10px] text-foreground/60 font-semibold leading-none'
      : 'text-base text-foreground/60 font-semibold leading-none';

  const labelClass =
    size === 'lg'
      ? 'text-lg font-bold leading-tight break-words hyphens-auto line-clamp-2'
      : size === 'sm'
      ? 'text-[10px] font-bold leading-tight break-words hyphens-auto'
      : 'text-sm font-bold leading-tight break-words hyphens-auto';

  const checkSize = size === 'lg' ? 'size-5' : size === 'sm' ? 'size-3.5' : 'size-5';

  // lg: columns stretch to bar area; bar sits in its own track below the labels
  // so it can't grow over them (h-full % has no definite parent height here).
  const columnClass =
    size === 'lg'
      ? 'flex-1 flex flex-col items-center justify-end gap-0.5 min-w-0'
      : 'flex-1 flex flex-col items-center justify-end gap-0.5 h-full min-w-0';

  return (
    <div className={wrapperClass}>
      <div className={barAreaClass}>
        {bars.map((b, i) => {
          const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
          // lg: share of total responses (50% = half the track); md/sm: relative to tallest bar
          const heightFrac =
            size === 'lg' ? (total > 0 ? b.count / total : 0) : b.count / maxCount;
          const animH = animated || noMotion ? heightFrac : 0;
          const color = CHART_VARS[i % CHART_VARS.length];

          const bar = (
            <div
              style={{
                ...(size === 'lg' ? { position: 'absolute' as const, left: 0, bottom: 0, maxHeight: '100%' } : {}),
                width: '100%',
                height:
                  animH > 0
                    ? `${Math.round(animH * 100)}%`
                    : b.count > 0
                    ? '3px'
                    : '0px',
                backgroundColor: color,
                border: b.count > 0 ? '2px solid #000' : '2px dashed rgba(0,0,0,0.2)',
                boxShadow: b.count > 0 ? '3px 3px 0 0 #000' : 'none',
                transition: noMotion ? 'none' : 'height 0.45s ease-out',
                borderRadius: '2px 2px 0 0',
              }}
            />
          );

          return (
            <div
              key={i}
              className={columnClass}
            >
              {size === 'lg' ? (
                <div className="flex flex-row items-baseline justify-center gap-2 shrink-0">
                  <span className={countClass}>{b.count}</span>
                  <span className={pctClass}>{pct}%</span>
                  {b.isCorrect && (
                    <span className="leading-none self-center" aria-label="jawaban benar">
                      <Check className={checkSize} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <span className={countClass}>{b.count}</span>
                  <span className={pctClass}>{pct}%</span>
                  <span
                    className="leading-none"
                    style={{ visibility: b.isCorrect ? 'visible' : 'hidden' }}
                    aria-hidden={!b.isCorrect}
                    aria-label={b.isCorrect ? 'jawaban benar' : undefined}
                  >
                    <Check className={checkSize} strokeWidth={2.5} />
                  </span>
                </>
              )}
              {size === 'lg' ? (
                <div className="relative w-full flex-1 min-h-6">{bar}</div>
              ) : (
                bar
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 sm:gap-3 mt-2 px-1 border-t-2 border-border/30 pt-2 shrink-0">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 min-w-0 text-center">
            <p className={labelClass}>
              {String.fromCharCode(65 + i)}. {b.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
