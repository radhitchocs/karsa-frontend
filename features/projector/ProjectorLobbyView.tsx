'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UsersIcon, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { KarsaWordmark } from '@/components/KarsaWordmark';
import type { ProjectorView } from '@/contracts/views';

// NEXT_PUBLIC_JOIN_DISPLAY_URL — LAN-reachable address shown on screen.
// Falls back to window.location.host (never "localhost" in production).
function useDisplayBase(): string {
  const [base, setBase] = useState(process.env.NEXT_PUBLIC_JOIN_DISPLAY_URL ?? '');
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_JOIN_DISPLAY_URL) {
      setBase(window.location.host);
    }
  }, []);
  return base;
}

export function ProjectorLobbyView({ view }: { view: ProjectorView }) {
  const displayBase = useDisplayBase();

  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join?code=${view.code}`
      : `/join?code=${view.code}`;

  // B1: join notification
  const prevCount = useRef(view.participantCount);
  const [joinAlert, setJoinAlert] = useState(0);
  useEffect(() => {
    if (view.participantCount > prevCount.current) {
      setJoinAlert(view.participantCount);
      const t = setTimeout(() => setJoinAlert(0), 3000);
      prevCount.current = view.participantCount;
      return () => clearTimeout(t);
    }
    prevCount.current = view.participantCount;
  }, [view.participantCount]);

  return (
    <div className="relative flex flex-col h-full p-6 sm:p-10 overflow-hidden">
      {/* Karsa wordmark — top-left corner */}
      <div className="absolute top-5 left-6 sm:left-8">
        <KarsaWordmark size="sm" />
      </div>

      {/* Participant count — top-right */}
      <div className="absolute top-5 right-6 sm:right-8 flex items-center gap-2 text-sm sm:text-base font-semibold text-foreground/70">
        <UsersIcon className="size-4 sm:size-5" />
        <span>{view.participantCount} bergabung</span>
      </div>

      {/* Main content — vertically centered */}
      <div className="flex flex-col items-center justify-center flex-1 gap-6 mt-8">
        {/* Headline */}
        <h1
          className="font-black text-center"
          style={{ fontSize: 'clamp(1.8rem, 3.5vw, 3rem)' }}
        >
          Cara Bergabung
        </h1>

        {/* Two-column card */}
        <div className="flex gap-5 w-full max-w-4xl">
          {/* Left: URL + code */}
          <Card className="flex-1 justify-center gap-5 px-6 sm:px-8 py-6 sm:py-8 shadow-[6px_6px_0_0_#000]">
            {/* URL */}
            <div className="flex flex-col gap-1">
              <p className="text-sm sm:text-base font-bold text-foreground/60 uppercase tracking-wide">
                Buka
              </p>
              <p
                className="font-black text-foreground leading-none"
                style={{ fontSize: 'clamp(1.4rem, 2.8vw, 2.4rem)' }}
              >
                {displayBase}/join
              </p>
            </div>

            <div className="border-t-2 border-border/30" />

            {/* Code */}
            <div className="flex flex-col gap-2">
              <p className="text-sm sm:text-base font-bold text-foreground/60 uppercase tracking-wide">
                Masukkan kode
              </p>
              <p
                className="font-black tracking-[0.25em] leading-none"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 5rem)' }}
              >
                {view.code}
              </p>
            </div>
          </Card>

          {/* Right: QR code */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="bg-white border-4 border-black rounded shadow-[6px_6px_0_0_#000] p-3 sm:p-4">
              <QRCodeSVG value={joinUrl} size={220} />
            </div>
            <p className="text-sm sm:text-base font-semibold text-foreground/70 text-center">
              Atau pindai kode QR
            </p>
          </div>
        </div>
      </div>

      {/* Join alert */}
      {joinAlert > 0 && (
        <div className="flex gap-2 absolute bottom-6 left-1/2 -translate-x-1/2 bg-main text-main-foreground border-2 border-black shadow-[4px_4px_0_0_#000] rounded-full px-6 py-3 text-xl font-bold animate-bounce whitespace-nowrap">
          <UserPlus className="size-6 shrink-0" strokeWidth={2.5} /> {joinAlert} peserta bergabung!
        </div>
      )}
    </div>
  );
}
