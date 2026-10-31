'use client';

import { AlertCircleIcon, CheckCircle2Icon, InfoIcon } from 'lucide-react';
import { labels, type Kind } from '@/domain/model';
import { SLIDE_COLOR } from '@/lib/slide-colors';

/** Small building blocks shared by the participant slide panels so they look the same. */

export function TypePill({ type }: { type: Kind }) {
  return (
    <span
      className="inline-flex items-center self-start rounded-full border-2 border-border px-3 py-0.5 text-sm font-bold"
      style={{ backgroundColor: SLIDE_COLOR[type] }}
    >
      {labels[type]}
    </span>
  );
}

/** Status line: info (white), ok (green), warn (yellow). */
export function Note({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'warn'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-secondary-background',
    ok: 'bg-[#34D399]/25',
    warn: 'bg-[#FFD93D]/50',
  }[tone];
  const Icon = tone === 'ok' ? CheckCircle2Icon : tone === 'warn' ? AlertCircleIcon : InfoIcon;
  return (
    <p className={`flex items-start gap-2 rounded-base border-2 border-border px-3 py-2.5 text-sm ${styles}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Pulsing "waiting for the presenter" pill. */
export function WaitingPill({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 rounded-full border-2 border-border bg-secondary-background px-4 py-2 text-sm font-semibold">
      <span className="relative flex size-2.5" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-main opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-main" />
      </span>
      {children}
    </p>
  );
}
