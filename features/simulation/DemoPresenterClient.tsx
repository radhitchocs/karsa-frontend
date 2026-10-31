'use client';

/**
 * DemoPresenterClient — demo-mode replacement for PresenterClient.
 *
 * Uses MockSessionService (no backend, no Socket.IO).
 * Renders all three POVs via SimulationControls role switch.
 * Enabled when NEXT_PUBLIC_DEMO_MODE=true.
 */

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { mockSessionService } from '@/services/mock-session-service';
import { toast } from '@/components/ui/toast';
import { LobbyView } from '@/features/presenter/LobbyView';
import { ActiveView } from '@/features/presenter/ActiveView';
import { SummaryView } from '@/features/presenter/SummaryView';
import { ProjectorLobbyView } from '@/features/projector/ProjectorLobbyView';
import { ProjectorActiveView } from '@/features/projector/ProjectorActiveView';
import { ParticipantLobbyView } from '@/features/participant/ParticipantLobbyView';
import { ParticipantActiveView } from '@/features/participant/ParticipantActiveView';
import { SimulationControls } from './SimulationControls';
import type { SimRole } from './SimulationControls';
import type { PresenterView, ParticipantView, ProjectorView } from '@/contracts/views';
import type { SessionCommandPayload } from '@/contracts/commands';

export function DemoPresenterClient() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [presenterView, setPresenterView] = useState<PresenterView | null>(null);
  const [participantView, setParticipantView] = useState<ParticipantView | null>(null);
  const [projectorView, setProjectorView] = useState<ProjectorView | null>(null);
  const [activeRole, setActiveRole] = useState<SimRole>({ kind: 'presenter' });
  const unsubRef = useRef<(() => void)[]>([]);

  // Subscribe to presenter view (always needed for SimulationControls)
  useEffect(() => {
    mockSessionService.getPresenterView(sessionId).then(setPresenterView).catch(console.error);
    const unsub = mockSessionService.subscribePresenter(sessionId, setPresenterView);
    unsubRef.current.push(unsub);
    return () => {
      unsubRef.current.forEach((u) => u());
      unsubRef.current = [];
    };
  }, [sessionId]);

  // Subscribe to projector view when role switches to projector
  useEffect(() => {
    if (activeRole.kind !== 'projector') {
      setProjectorView(null);
      return;
    }
    mockSessionService.getProjectorView(sessionId).then(setProjectorView).catch(console.error);
    const unsub = mockSessionService.subscribeProjector(sessionId, setProjectorView);
    return () => unsub();
  }, [sessionId, activeRole.kind]);

  // Subscribe to participant view when role switches to participant
  useEffect(() => {
    if (activeRole.kind !== 'participant') {
      setParticipantView(null);
      return;
    }
    const { pid } = activeRole;
    mockSessionService.getParticipantView(sessionId, pid).then(setParticipantView).catch(console.error);
    const unsub = mockSessionService.subscribeParticipant(sessionId, pid, setParticipantView);
    return () => unsub();
  }, [sessionId, activeRole]);

  async function sendPresenter(payload: SessionCommandPayload) {
    const ack = await mockSessionService.command(sessionId, payload);
    if (!ack.ok) {
      toast.add({ title: 'Gagal', description: ack.message, type: 'error' });
    }
  }

  async function sendParticipant(payload: SessionCommandPayload): Promise<boolean> {
    const ack = await mockSessionService.command(sessionId, payload);
    if (!ack.ok) {
      toast.add({ title: 'Gagal', description: ack.message, type: 'error' });
      return false;
    }
    return true;
  }

  function handleRoleChange(role: SimRole) {
    if (role.kind === 'participant') {
      mockSessionService.setActivePid(sessionId, role.pid);
    }
    setActiveRole(role);
  }

  if (!presenterView) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-foreground/70 animate-pulse">Memuat sesi demo…</p>
      </main>
    );
  }

  const mainContent = (() => {
    if (activeRole.kind === 'projector') {
      if (!projectorView) return <p className="p-8 text-center text-foreground/70 animate-pulse">Memuat proyektor…</p>;
      if (projectorView.status === 'lobi') return <ProjectorLobbyView view={projectorView} />;
      return <ProjectorActiveView view={projectorView} />;
    }

    if (activeRole.kind === 'participant') {
      if (!participantView) return <p className="p-8 text-center text-foreground/70 animate-pulse">Memuat peserta…</p>;
      if (participantView.status === 'lobi') return <ParticipantLobbyView view={participantView} />;
      return <ParticipantActiveView view={participantView} send={sendParticipant} />;
    }

    // Presenter (default)
    if (presenterView.status === 'selesai') return <SummaryView view={presenterView} />;
    if (presenterView.status === 'lobi') return <LobbyView view={presenterView} send={sendPresenter} />;
    return <ActiveView view={presenterView} send={sendPresenter} />;
  })();

  return (
    <div className="flex flex-col min-h-screen pb-14">
      {mainContent}
      <SimulationControls
        sessionId={sessionId}
        presenterView={presenterView}
        svc={mockSessionService}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
      />
    </div>
  );
}
