'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLinkIcon, PlayIcon, UsersIcon } from 'lucide-react';
import { AppHeader, HeaderTitle } from '@/components/AppHeader';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
    <main className="flex flex-1 flex-col">
      <AppHeader
        onHome={() => router.push('/')}
        center={<HeaderTitle title={view.title} />}
        right={
          <>
            <Button variant="neutral" size="sm" onClick={openProjector} disabled={!projectorToken}>
              <ExternalLinkIcon />
              Buka Proyektor
            </Button>
            <Button size="sm" onClick={() => send({ type: 'session.start' })}>
              <PlayIcon />
              Mulai Sesi
            </Button>
          </>
        }
      />

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col gap-4">
          <Card className="text-center">
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
        </div>
      </div>
    </main>
  );
}
