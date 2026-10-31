'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { API_BASE } from '@/lib/api';
import { ProjectorLobbyView } from '@/features/projector/ProjectorLobbyView';
import { ProjectorActiveView } from '@/features/projector/ProjectorActiveView';
import type { ProjectorView } from '@/contracts/views';

function useDisplayBase(): string {
  const [base, setBase] = useState(process.env.NEXT_PUBLIC_JOIN_DISPLAY_URL ?? '');
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_JOIN_DISPLAY_URL) setBase(window.location.host);
  }, []);
  return base;
}

export function ProjectorClient() {
  const { id: sessionId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectorToken = searchParams.get('token') ?? '';
  const [view, setView] = useState<ProjectorView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const displayBase = useDisplayBase();

  useEffect(() => {
    if (!projectorToken) {
      setErr('Token proyektor diperlukan (?token=...)');
      return;
    }

    // Initial REST fetch using projectorToken query param
    fetch(`${API_BASE}/api/sessions/${sessionId}/state?projectorToken=${projectorToken}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ProjectorView>;
      })
      .then(setView)
      .catch((e: Error) => setErr(e.message));

    // Socket.IO with projector auth
    const socket = io(API_BASE, {
      auth: { projectorToken, sessionId },
      transports: ['websocket'],
    });

    socket.on('session.snapshot', (snap: { pov: string; view: ProjectorView }) => {
      if (snap.pov === 'projector') setView(snap.view);
    });

    socket.on('connect', () => {
      // Re-fetch on reconnect
      fetch(`${API_BASE}/api/sessions/${sessionId}/state?projectorToken=${projectorToken}`)
        .then((r) => r.json() as Promise<ProjectorView>)
        .then(setView)
        .catch(console.error);
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, projectorToken]);

  if (err) {
    return (
      <main className="flex items-center justify-center h-screen bg-black text-white p-8">
        <p className="text-xl font-bold text-[var(--error)]">{err}</p>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="flex items-center justify-center h-screen bg-black">
        <p className="text-white animate-pulse text-xl">Memuat proyektor…</p>
      </main>
    );
  }

  const isActive = view.status !== 'lobi' && view.status !== 'selesai';

  return (
    // 16:9 letterbox canvas
    <main className="flex items-center justify-center h-screen w-screen bg-black overflow-hidden">
      <div
        className="relative bg-background border-4 border-black overflow-hidden"
        style={{
          aspectRatio: '16/9',
          maxWidth: '100vw',
          maxHeight: '100vh',
          width: 'min(100vw, 177.78vh)',
          height: 'min(56.25vw, 100vh)',
        }}
      >
        {/* Persistent join pill during active session */}
        {isActive && displayBase && (
          <div className="absolute top-2 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <div className="bg-black/65 text-white text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-sm whitespace-nowrap">
              Gabung di <span className="font-black">{displayBase}/join</span>
              {' · '}kode <span className="font-black tracking-widest">{view.code}</span>
            </div>
          </div>
        )}

        {view.status === 'lobi' ? (
          <ProjectorLobbyView view={view} />
        ) : view.status === 'selesai' ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-4xl font-black">Sesi Selesai</p>
          </div>
        ) : (
          <ProjectorActiveView view={view} />
        )}
      </div>
    </main>
  );
}
