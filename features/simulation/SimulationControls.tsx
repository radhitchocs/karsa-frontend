'use client';

/**
 * SimulationControls — demo-mode overlay.
 *
 * Visible only when NEXT_PUBLIC_DEMO_MODE=true.
 * Renders a fixed bottom bar with:
 *   - Role switch (Presenter / Participant [name] / Projector)
 *   - "Tambah Respons" (simulate all responses on current slide)
 *   - "Tutup Soal" (force-close current quiz question)
 *
 * Must be rendered inside a PresenterClient that uses MockSessionService.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PresenterView } from '@/contracts/views';
import type { MockSessionService } from '@/services/mock-session-service';

type DemoRole =
  | { kind: 'presenter' }
  | { kind: 'participant'; pid: string; name: string }
  | { kind: 'projector' };

export type SimRole = DemoRole;

interface SimulationControlsProps {
  sessionId: string;
  presenterView: PresenterView;
  svc: MockSessionService;
  activeRole: SimRole;
  onRoleChange: (role: SimRole) => void;
}

export function SimulationControls({
  sessionId,
  presenterView,
  svc,
  activeRole,
  onRoleChange,
}: SimulationControlsProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2_000);
  };

  const handleSimulate = () => {
    const ack = svc.simulateResponses(sessionId);
    showFeedback(ack.ok ? 'Respons ditambahkan.' : ack.message);
  };

  const handleQuizSimulate = (scenario: 'cepat' | 'lambat' | 'salah' | 'kosong') => {
    const ack = svc.quizSimulate(sessionId, scenario);
    showFeedback(ack.ok ? `Quiz sim: ${scenario}` : ack.message);
  };

  const slide = presenterView.slides[presenterView.activeSlideIndex];
  const isInteractive =
    slide && ['pilihan', 'polling', 'awan', 'tanya'].includes(slide.type);
  const isQuizSlide = slide?.type === 'kuis';
  const quizRun = presenterView.quiz?.runs?.at(-1);
  const quizOpen = quizRun && !quizRun.closed;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border bg-secondary-background px-3 py-2 flex flex-wrap items-center gap-2"
      aria-label="SimulationControls"
    >
      {/* Demo badge */}
      <Badge variant="neutral" className="shrink-0 text-xs">
        DEMO
      </Badge>

      {/* Feedback */}
      {feedback && (
        <span className="text-xs font-medium text-foreground/70 shrink-0">{feedback}</span>
      )}

      <div className="flex-1" />

      {/* Sim actions */}
      {isInteractive && (
        <Button
          size="sm"
          variant="neutral"
          onClick={handleSimulate}
          title="Simulasikan respons semua peserta"
        >
          + Respons
        </Button>
      )}
      {isQuizSlide && quizOpen && (
        <>
          <Button size="sm" variant="neutral" onClick={() => handleQuizSimulate('cepat')}>
            Jawab Cepat
          </Button>
          <Button size="sm" variant="neutral" onClick={() => handleQuizSimulate('lambat')}>
            Jawab Lambat
          </Button>
          <Button size="sm" variant="neutral" onClick={() => handleQuizSimulate('salah')}>
            Jawab Salah
          </Button>
          <Button size="sm" variant="neutral" onClick={() => handleQuizSimulate('kosong')}>
            Lewati
          </Button>
        </>
      )}

      {/* Separator */}
      <div className="h-6 w-px bg-border shrink-0" />

      {/* Role switch */}
      <span className="text-xs text-foreground/70 shrink-0">POV:</span>
      <Button
        size="sm"
        variant={activeRole.kind === 'presenter' ? 'default' : 'neutral'}
        onClick={() => onRoleChange({ kind: 'presenter' })}
      >
        Presenter
      </Button>
      <Button
        size="sm"
        variant={activeRole.kind === 'projector' ? 'default' : 'neutral'}
        onClick={() => onRoleChange({ kind: 'projector' })}
      >
        Proyektor
      </Button>
      {presenterView.participants.map((p) => (
        <Button
          key={p.id}
          size="sm"
          variant={
            activeRole.kind === 'participant' && activeRole.pid === p.id ? 'default' : 'neutral'
          }
          onClick={() => {
            svc.setActivePid(sessionId, p.id);
            onRoleChange({ kind: 'participant', pid: p.id, name: p.name });
          }}
        >
          {p.name}
        </Button>
      ))}
    </div>
  );
}
