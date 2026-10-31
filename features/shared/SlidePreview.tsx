'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ProjectorActiveView } from '@/features/projector/ProjectorActiveView';
import type { Slide } from '@/domain/model';
import type { ProjectorView } from '@/contracts/views';

/** Design size the projector view is laid out at before scaling. */
const CANVAS_W = 1280;
const CANVAS_H = 720;

/** Projector view of a slide as it looks before any responses arrive. */
function previewView(slide: Slide): ProjectorView {
  return {
    sessionId: 'preview',
    sessionVersion: 0,
    status: 'aktif',
    participantCount: 0,
    code: '',
    title: '',
    activeSlide: slide,
    activeSlideIndex: 0,
    groups: [],
    responseProgress: null,
    revealedResults: null,
    quiz: null,
    leaderboard: null,
    paused: false,
    lastPick: null,
    pancingParticipants: [],
    hasSimulatedData: false,
  };
}

/**
 * Static, non-interactive projector preview of a slide. Fills its container's
 * width at 16:9 and scales the 1280×720 projector canvas down to fit.
 */
export function SlidePreview({ slide, className = '' }: { slide: Slide; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      inert
      className={`pointer-events-none relative aspect-video w-full overflow-hidden bg-background ${className}`}
    >
      {width > 0 && (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${width / CANVAS_W})` }}
        >
          <ProjectorActiveView view={previewView(slide)} />
        </div>
      )}
    </div>
  );
}
