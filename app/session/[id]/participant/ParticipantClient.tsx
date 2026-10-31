'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import { API_BASE, apiFetch } from '@/lib/api';
import { uid } from '@/lib/uid';
import { getParticipantToken, getParticipantId } from '@/lib/participant-auth';
import { toast } from '@/components/ui/toast';
import { ParticipantLobbyView } from '@/features/participant/ParticipantLobbyView';
import { ParticipantActiveView } from '@/features/participant/ParticipantActiveView';
import { ConnectionBanner } from '@/features/participant/ConnectionBanner';
import { ParticipantHeader } from '@/features/participant/ParticipantHeader';
import { CheckIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ParticipantView } from '@/contracts/views';
import type { SessionCommandPayload } from '@/contracts/commands';
import type { CommandAck } from '@/contracts/acks';

export function ParticipantClient() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<ParticipantView | null>(null);
  const [connErr, setConnErr] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getParticipantToken(sessionId);
    const pid = getParticipantId(sessionId);
    if (!token || !pid) {
      router.push('/join');
      return;
    }

    // Initial REST fetch
    apiFetch<ParticipantView>(`/api/sessions/${sessionId}/state`, undefined, token)
      .then(setView)
      .catch((e: Error) => setConnErr(e.message));

    // Socket.IO
    const socket = io(API_BASE, {
      auth: { token, sessionId },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('session.snapshot', (snap: { pov: string; view: ParticipantView }) => {
      if (snap.pov === 'participant') setView(snap.view);
    });

    socket.on('connect', () => {
      setDisconnected(false);
      // Re-fetch on reconnect
      apiFetch<ParticipantView>(`/api/sessions/${sessionId}/state`, undefined, token)
        .then(setView)
        .catch(console.error);
    });

    socket.on('disconnect', () => setDisconnected(true));

    return () => {
      socket.disconnect();
    };
  }, [sessionId, router]);

  async function send(payload: SessionCommandPayload): Promise<boolean> {
    const socket = socketRef.current;
    if (!socket) return false;
    const requestId = uid();
    const envelope = { requestId, sessionId, payload };
    try {
      const ack = await new Promise<CommandAck>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), 10_000);
        socket.emit('command', envelope, (a: CommandAck) => {
          clearTimeout(timer);
          resolve(a);
        });
      });
      if (!ack.ok) {
        toast.add({ title: 'Gagal', description: ack.message, type: 'error' });
        return false;
      }
      return true;
    } catch (e) {
      toast.add({ title: 'Gagal', description: (e as Error).message, type: 'error' });
      return false;
    }
  }

  if (connErr) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 flex flex-col gap-4 items-center text-center">
            <p className="text-[var(--error)] font-medium">{connErr}</p>
            <Button onClick={() => router.push('/join')}>Gabung Ulang</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-foreground/70 animate-pulse">Memuat sesi…</p>
      </main>
    );
  }

  if (view.status === 'selesai') {
    return (
      <main className="flex min-h-0 flex-1 flex-col">
        <ConnectionBanner disconnected={disconnected} />
        <ParticipantHeader name={view.name} title={view.title} onExit={() => router.push('/join')} />
        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <section className="flex w-full max-w-sm flex-col items-center gap-3 rounded-base border-2 border-border bg-secondary-background px-6 py-8 text-center shadow-[4px_4px_0_0_var(--border)]">
            <span className="flex size-14 items-center justify-center rounded-full border-2 border-border bg-[#34D399]">
              <CheckIcon className="size-7" strokeWidth={3} />
            </span>
            <p className="text-xl font-black">Sesi selesai</p>
            <p className="text-sm text-foreground/70">
              Terima kasih sudah berpartisipasi di <strong className="text-foreground">{view.title}</strong>, {view.name}!
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      <ConnectionBanner disconnected={disconnected} />
      {view.status === 'lobi' ? (
        <ParticipantLobbyView view={view} />
      ) : (
        <ParticipantActiveView view={view} send={send} />
      )}
    </>
  );
}
