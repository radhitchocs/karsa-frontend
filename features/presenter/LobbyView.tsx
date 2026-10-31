'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ExternalLinkIcon, UsersIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { KarsaWordmark } from '@/components/KarsaWordmark';
import { apiFetch } from '@/lib/api';
import type { SendFn, PresenterView } from './types';

export function LobbyView({ view, send }: { view: PresenterView; send: SendFn }) {
  const router = useRouter();
  const [joinUrl, setJoinUrl] = useState('');
  const [displayBase, setDisplayBase] = useState(process.env.NEXT_PUBLIC_JOIN_DISPLAY_URL ?? '');
  const [projectorToken, setProjectorToken] = useState<string | null>(null);

  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join?code=${view.code}`);
    if (!process.env.NEXT_PUBLIC_JOIN_DISPLAY_URL) setDisplayBase(window.location.host);
  }, [view.code]);

  useEffect(() => {
    apiFetch<{ token: string }>(`/api/sessions/${view.sessionId}/projector-token`)
      .then((r) => setProjectorToken(r.token))
      .catch(console.error);
  }, [view.sessionId]);

  function openProjector() {
    if (!projectorToken) return;
    window.open(
      `${window.location.origin}/session/${view.sessionId}/projector?token=${projectorToken}`,
      '_blank',
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 p-6">
      {/* B2: Back button */}
      <div className="w-full max-w-xl">
        <Button variant="neutral" size="sm" className="px-2" onClick={() => router.push('/')}>
          <ArrowLeftIcon className="size-4 mr-1" />
          Kembali
        </Button>
      </div>

      <KarsaWordmark size="md" />
      <h1 className="text-2xl font-bold text-center">{view.title}</h1>

      <div className="flex flex-col md:flex-row gap-4 w-full max-w-xl">
        <Card className="flex-1 text-center">
          <CardHeader>
            <CardTitle className="text-sm text-foreground/60 font-normal">Kode Sesi</CardTitle>
            <p className="text-5xl font-black tracking-widest mt-1">{view.code}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 text-foreground/70">
              <UsersIcon className="size-4" />
              <span>
                {view.participants.filter((p) => p.online).length} peserta terhubung
              </span>
            </div>
            {/* Live participant list */}
            {view.participants.filter((p) => p.online).length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
                {view.participants
                  .filter((p) => p.online)
                  .map((p) => (
                    <span
                      key={p.id}
                      className="text-sm px-3 py-1.5 rounded-base border-2 border-black bg-secondary-background font-semibold shadow-[2px_2px_0_0_#000]"
                    >
                      {p.name}
                    </span>
                  ))}
              </div>
            )}
            {joinUrl && (
              <div className="flex justify-center">
                <div className="border-2 border-black p-3 bg-white rounded-base shadow-[4px_4px_0_0_#000]">
                  <QRCodeSVG value={joinUrl} size={128} />
                </div>
              </div>
            )}
            {displayBase && (
              <p className="text-xs text-foreground/70">
                Scan QR atau buka <strong>{displayBase}/join</strong>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col justify-between">
          <CardContent className="pt-6 flex flex-col gap-3">
            <Button className="w-full" onClick={() => send({ type: 'session.start' })}>
              Mulai Sesi
            </Button>
            <Button
              variant="neutral"
              className="w-full"
              onClick={openProjector}
              disabled={!projectorToken}
            >
              <ExternalLinkIcon className="size-4 mr-2" />
              Buka Proyektor
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
