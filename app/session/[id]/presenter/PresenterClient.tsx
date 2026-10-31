'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApiSessionService } from '@/services/api-session-service';
import { getToken } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { LobbyView } from '@/features/presenter/LobbyView';
import { ActiveView } from '@/features/presenter/ActiveView';
import { SummaryView } from '@/features/presenter/SummaryView';
import type { PresenterView } from '@/contracts/views';
import type { SessionCommandPayload } from '@/contracts/commands';

export function PresenterClient() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<PresenterView | null>(null);
  const [connErr, setConnErr] = useState<string | null>(null);
  const svcRef = useRef<ApiSessionService | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    const svc = new ApiSessionService(token);
    svcRef.current = svc;
    svc.getPresenterView(sessionId).then(setView).catch((e: Error) => setConnErr(e.message));
    const unsub = svc.subscribePresenter(sessionId, setView);
    return () => {
      unsub();
      svc.disconnect();
    };
  }, [sessionId, router]);

  async function send(payload: SessionCommandPayload) {
    const svc = svcRef.current;
    if (!svc) return;
    try {
      const ack = await svc.command(sessionId, payload);
      if (!ack.ok) {
        toast.add({ title: 'Gagal', description: ack.message, type: 'error' });
      }
    } catch (e) {
      toast.add({ title: 'Gagal', description: (e as Error).message, type: 'error' });
    }
  }

  if (connErr) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 flex flex-col gap-4 items-center text-center">
            <p className="text-[var(--error)] font-medium">{connErr}</p>
            <Button onClick={() => router.push('/login')}>Masuk Kembali</Button>
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

  if (view.status === 'selesai') return <SummaryView view={view} />;
  if (view.status === 'lobi') return <LobbyView view={view} send={send} />;
  return <ActiveView view={view} send={send} />;
}
