'use client';

import type { LeaderboardEntry } from '@/contracts/views';

/** Medal fills for ranks 1–3 (PRD §17: reserved for the leaderboard only). */
const MEDALS: Record<number, string> = { 1: '#FBBF24', 2: '#CBD5E1', 3: '#D97706' };

/**
 * Ranked quiz leaderboard shared by presenter, projector ('lg') and participant.
 * Top 3 get medal-coloured rank circles; the viewer's own row is highlighted.
 */
export function LeaderboardList({
  entries,
  highlightOwnerId,
  size = 'md',
}: {
  entries: LeaderboardEntry[];
  highlightOwnerId?: string | null;
  size?: 'md' | 'lg';
}) {
  const lg = size === 'lg';
  return (
    <ol className={`flex flex-col ${lg ? 'gap-3' : 'gap-2'}`}>
      {entries.map((e) => {
        const medal = MEDALS[e.rank];
        const isMe = !!highlightOwnerId && e.ownerId === highlightOwnerId;
        return (
          <li
            key={e.ownerId}
            className={`grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center rounded-base border-2 border-border ${lg ? 'gap-5 px-6 py-3' : 'gap-3 px-3 py-2'} ${isMe ? 'bg-main text-main-foreground shadow-[3px_3px_0_0_var(--border)]' : 'bg-secondary-background'} ${medal && !isMe ? 'shadow-[3px_3px_0_0_var(--border)]' : ''}`}
          >
            <span
              className={`flex items-center justify-center rounded-full border-2 border-border font-black tabular-nums text-foreground ${lg ? 'size-12 text-2xl' : 'size-8 text-sm'}`}
              style={{ backgroundColor: medal ?? 'var(--secondary-background)' }}
            >
              {e.rank}
            </span>
            <span className={`truncate font-bold ${lg ? 'text-3xl' : 'text-sm'}`}>
              {e.ownerLabel}
              {isMe && <span className={`ml-2 font-semibold opacity-80 ${lg ? 'text-xl' : 'text-xs'}`}>(Kamu)</span>}
            </span>
            <span className={`tabular-nums ${lg ? 'text-xl' : 'text-xs'} ${isMe ? '' : 'text-foreground/70'}`}>
              {e.correctCount} benar
            </span>
            <span className={`text-right font-black tabular-nums ${lg ? 'text-3xl' : 'text-sm'}`}>
              {e.totalScore} poin
            </span>
          </li>
        );
      })}
    </ol>
  );
}
