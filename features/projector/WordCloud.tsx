'use client';

import { useEffect, useRef, useState } from 'react';
import cloud from 'd3-cloud';

type Word = { text: string; count: number };
type Placed = { text: string; size: number; x: number; y: number };

/**
 * B6: Word cloud laid out with d3-cloud (spiral placement, no overlap).
 * All words horizontal. Words sized by frequency, colored from accessible WCAG-AA palette.
 * Fills its parent (flex-1) with a min height so it also works outside a sized flex column.
 */

// WCAG AA contrast (≥4.5:1) on white background
const PALETTE = [
  '#00698c', // dark cyan
  '#c04d00', // dark orange
  '#1d7a38', // dark green
  '#7a1d4a', // dark pink/magenta
  '#5c4400', // dark amber
  '#1a5296', // dark blue
  '#6b0000', // dark red
  '#005c4f', // dark teal
];

const MAX_WORDS = 80;
const MAX_ATTEMPTS = 5;

// djb2 hash — maps word text to a stable palette index regardless of insertion order
function wordColorIndex(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h) % PALETTE.length;
}

function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function runLayout(
  words: Word[],
  width: number,
  height: number,
  fontFamily: string,
  scale: number,
): Promise<Placed[]> {
  const max = Math.max(...words.map((w) => w.count), 1);
  const maxFont = Math.min(height * 0.25, width * 0.14) * scale;
  const minFont = Math.max(14, maxFont * 0.22);
  const data = words.map((w) => ({
    text: w.text,
    size: minFont + (w.count / max) * (maxFont - minFont),
  }));

  return new Promise((resolve) => {
    cloud<{ text: string; size: number; x?: number; y?: number }>()
      .size([width, height])
      .words(data)
      .padding(4)
      .rotate(0)
      .font(fontFamily)
      .fontWeight('bold')
      .fontSize((d) => d.size)
      .spiral('archimedean')
      .random(seededRandom(42))
      .on('end', (tags) =>
        resolve(tags.map((t) => ({ text: t.text, size: t.size, x: t.x ?? 0, y: t.y ?? 0 }))),
      )
      .start();
  });
}

export function WordCloud({ words }: { words: Word[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [placed, setPlaced] = useState<Placed[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((prev) =>
        prev.w === Math.round(width) && prev.h === Math.round(height)
          ? prev
          : { w: Math.round(width), h: Math.round(height) },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || box.w === 0 || box.h === 0 || words.length === 0) return;
    let cancelled = false;

    // Biggest first, ties by text, so the layout input order is stable
    const top = [...words]
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
      .slice(0, MAX_WORDS);
    const fontFamily = getComputedStyle(el).fontFamily;

    (async () => {
      // Measure with the real web font, not the fallback
      await document.fonts.ready;
      let scale = 1;
      let result: Placed[] = [];
      // d3-cloud silently drops words that don't fit — shrink until all are placed
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        result = await runLayout(top, box.w, box.h, fontFamily, scale);
        if (cancelled || result.length === top.length) break;
        scale *= 0.85;
      }
      if (!cancelled) setPlaced(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [words, box]);

  return (
    <div ref={ref} className="relative w-full flex-1 min-h-[240px]">
      {words.length === 0 ? (
        <p className="absolute inset-0 flex items-center justify-center text-foreground/60 text-lg">
          Belum ada kata.
        </p>
      ) : (
        <svg
          role="list"
          aria-label="Awan kata"
          className="absolute inset-0 size-full select-none"
          viewBox={`${-box.w / 2} ${-box.h / 2} ${box.w} ${box.h}`}
        >
          {placed.map((w) => (
            <text
              key={w.text}
              role="listitem"
              textAnchor="middle"
              className="font-bold motion-safe:transition-transform motion-safe:duration-500"
              style={{
                fontSize: `${w.size}px`,
                fill: PALETTE[wordColorIndex(w.text)],
                transform: `translate(${w.x}px, ${w.y}px)`,
              }}
            >
              {w.text}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
