'use client';

import { useRouter } from 'next/navigation';
import { UsersIcon } from 'lucide-react';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import { ParticipantHeader } from './ParticipantHeader';
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
  const slide = view.activeSlide;

  return (
    <main className="flex flex-col min-h-screen pb-[env(safe-area-inset-bottom,16px)]">
      <ParticipantHeader name={view.name} title={view.title} onExit={() => router.push('/join')} />

      {/* Group role strip: only once groups exist, since it changes what this person can do */}
      {view.myGroup && (
        <div
          className="flex shrink-0 items-center gap-2 border-b-2 border-border px-4 py-2 text-sm"
          style={{ backgroundColor: SLIDE_COLOR.kelompok }}
        >
          <UsersIcon className="size-4 shrink-0" />
          <span className="min-w-0">
            <strong>Kelompok {view.myGroup.number}</strong>
            {view.myGroup.isResponder
              ? <> · Kamu penjawab — jawabanmu mewakili kelompok</>
              : <> · Anggota — penjawab: <strong>{view.myGroup.responderName}</strong></>}
          </span>
        </div>
      )}

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
              key={slide.id}
              view={view}
              send={(p) => send(p)}
            />
          ) : (
            // pilihan + polling — keyed per slide so a pick on one slide never carries over to the next
            <ResponsePanel
              key={slide.id}
              view={view}
              send={(p) => send(p)}
            />
          )}
        </div>
      </div>
    </main>
  );
}
