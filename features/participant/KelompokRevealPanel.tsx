'use client';

import { Mic2Icon } from 'lucide-react';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import type { ParticipantView } from '@/contracts/views';
import { initials } from './ParticipantHeader';
import { TypePill, WaitingPill } from './ParticipantBits';

/** Participant view of the Pembagian Kelompok slide: waiting, then "your group" card. */
export function KelompokRevealPanel({ view }: { view: ParticipantView }) {
  const slide = view.activeSlide;
  const group = view.myGroup;
  const isResponder = view.subRole === 'penjawab';

  return (
    <div className="flex flex-col gap-4">
      <TypePill type="kelompok" />
      <h2 className="text-xl font-black leading-snug">{slide.title}</h2>

      {!group ? (
        <WaitingPill>Menunggu presenter membagi kelompok</WaitingPill>
      ) : (
        <section
          data-testid="group-reveal-card"
          className="animate-in fade-in slide-in-from-bottom-4 overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-[4px_4px_0_0_var(--border)] duration-500 motion-reduce:animate-none"
        >
          <header className="border-b-2 border-border px-5 py-4 text-center" style={{ backgroundColor: SLIDE_COLOR.kelompok }}>
            <p className="text-xs font-bold uppercase tracking-wide">Kelompokmu</p>
            <p className="text-4xl font-black">Kelompok {group.number}</p>
          </header>

          <div className="flex flex-col gap-4 p-5">
            {isResponder ? (
              <p
                data-testid="role-responder"
                className="flex items-start gap-2 rounded-base border-2 border-border bg-main px-3 py-2.5 text-sm font-semibold text-main-foreground"
              >
                <Mic2Icon className="mt-0.5 size-4 shrink-0" />
                Kamu penjawab. Kamu yang mengirim jawaban untuk kelompok ini.
              </p>
            ) : (
              <p data-testid="role-member" className="rounded-base border-2 border-border px-3 py-2.5 text-sm">
                Kamu anggota. Diskusikan bersama — <strong>{group.responderName}</strong> akan mengirim jawaban.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-foreground/70">Anggota ({group.members.length})</p>
              <ul className="flex flex-col gap-1.5">
                {group.members.map((m) => {
                  const isMe = m.id === view.pid;
                  const isResp = m.name === group.responderName;
                  return (
                    <li key={m.id} className={`flex items-center gap-2.5 text-sm ${m.online ? '' : 'text-foreground/50'}`}>
                      <span
                        aria-hidden="true"
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border text-[10px] font-black ${isMe ? 'bg-main text-main-foreground' : 'bg-background'}`}
                      >
                        {initials(m.name)}
                      </span>
                      <span className={`min-w-0 flex-1 truncate ${isMe ? 'font-bold' : ''}`}>
                        {m.name}
                        {isMe && <span className="ml-1.5 text-xs font-semibold text-foreground/70">(Kamu)</span>}
                      </span>
                      {isResp && (
                        <span className="flex items-center gap-1 text-[11px] font-bold">
                          <Mic2Icon className="size-3.5" /> Penjawab
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
