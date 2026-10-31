'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MateriView } from './MateriView';
import { ResponsePanel } from './ResponsePanel';
import { AwanPanel } from './AwanPanel';
import { QAParticipantPanel } from './QAParticipantPanel';
import { KelompokRevealPanel } from './KelompokRevealPanel';
import { QuizParticipantPanel } from './QuizParticipantPanel';
import { PancingParticipantView } from './PancingParticipantView';
import type { ParticipantView } from '@/contracts/views';
import type { SessionCommandPayload } from '@/contracts/commands';

type SendFn = (payload: SessionCommandPayload) => Promise<boolean>;

export function ParticipantActiveView({
  view,
  send,
}: {
  view: ParticipantView;
  send: SendFn;
}) {
  const router = useRouter();
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const slide = view.activeSlide;

  return (
    <main className="flex flex-col min-h-screen pb-[env(safe-area-inset-bottom,16px)]">
      {/* B2: Back confirmation dialog */}
      {showBackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-secondary-background border-2 border-border rounded-base p-6 max-w-sm w-full mx-4 shadow-[4px_4px_0_0_var(--border)]">
            <p className="font-semibold mb-2">Keluar dari sesi?</p>
            <p className="text-sm text-foreground/60 mb-4">Kamu akan diarahkan ke halaman bergabung. Gunakan kode yang sama untuk bergabung kembali.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="neutral" size="sm" onClick={() => setShowBackConfirm(false)}>Batal</Button>
              <Button size="sm" onClick={() => router.push('/join')}>Keluar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b-2 border-border bg-secondary-background px-4 py-3 shrink-0 flex items-center gap-2">
        {/* B2: Back button */}
        <Button variant="neutral" size="sm" className="shrink-0 px-2" onClick={() => setShowBackConfirm(true)}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <span className="font-semibold text-sm truncate flex-1 min-w-0">{view.title}</span>
        <Badge variant="neutral" className="text-xs shrink-0">
          {view.subRole === 'individu' ? 'Individu' : view.subRole === 'penjawab' ? 'Penjawab' : 'Anggota'}
        </Badge>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto">
          {slide.type === 'kuis' ? (
            <QuizParticipantPanel
              view={view}
              send={(p) => send(p)}
            />
          ) : slide.type === 'materi' ? (
            <MateriView view={view} />
          ) : slide.type === 'kelompok' ? (
            <KelompokRevealPanel view={view} />
          ) : slide.type === 'pancing' ? (
            <PancingParticipantView view={view} />
          ) : slide.type === 'tanya' ? (
            <QAParticipantPanel
              view={view}
              send={(p) => send(p)}
            />
          ) : slide.type === 'awan' ? (
            <AwanPanel
              view={view}
              send={(p) => send(p)}
            />
          ) : (
            // pilihan + polling
            <ResponsePanel
              view={view}
              send={(p) => send(p)}
            />
          )}
        </div>
      </div>
    </main>
  );
}
