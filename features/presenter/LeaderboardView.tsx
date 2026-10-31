'use client';

import { TrophyIcon, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Leaderboard } from '@/contracts/views';
import type { SendFn } from './types';

export function LeaderboardView({
  leaderboard,
  send,
}: {
  leaderboard: Leaderboard;
  send: SendFn;
}) {
  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="size-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {leaderboard.entries.map((e) => {
              // Medal colors: distinct from slide type palette (#FBBF24 gold, #CBD5E1 silver, #D97706 bronze)
              const accentBg =
                e.rank === 1 ? 'bg-[#FBBF24] border-black shadow-[2px_2px_0_0_#000]' :
                e.rank === 2 ? 'bg-[#CBD5E1] border-black shadow-[2px_2px_0_0_#000]' :
                e.rank === 3 ? 'bg-[#D97706] border-black shadow-[2px_2px_0_0_#000]' :
                'bg-secondary-background border-border';
              return (
              <div
                key={e.ownerId}
                className={`flex items-center gap-3 p-3 border-2 rounded-base ${accentBg}`}
              >
                <span className="text-xl font-black w-8 text-center flex items-center justify-center">
                  {e.rank <= 3 ? <Medal className="size-5" strokeWidth={2.5} /> : `#${e.rank}`}
                </span>
                <span className="flex-1 font-semibold">{e.ownerLabel}</span>
                <span className="font-black">{e.totalScore} pts</span>
                <span className="text-xs text-foreground/70">{e.correctCount} benar</span>
              </div>
            );
            })}
          </div>
          <div className="mt-4">
            <Button onClick={() => send({ type: 'session.end' })}>Akhiri Sesi</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
