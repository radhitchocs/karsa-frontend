'use client';

import { useRouter } from 'next/navigation';
import { TrophyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { labels } from '@/domain/model';
import type { PresenterView } from './types';

export function SummaryView({ view }: { view: PresenterView }) {
  const router = useRouter();

  return (
    <main className="flex flex-col min-h-full">
      <header className="border-b-2 border-border bg-secondary-background px-4 py-3">
        <h1 className="font-bold">Sesi Selesai — {view.title}</h1>
      </header>
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Ringkasan</h2>
          <Button variant="neutral" onClick={() => router.push('/')}>
            Kembali ke Beranda
          </Button>
        </div>

        {view.hasSimulatedData && (
          <div
            className="rounded border-2 border-border bg-secondary-background px-4 py-2 text-sm font-medium"
            data-testid="simulated-data-label"
          >
            Berisi data simulasi — bukan hasil sesi nyata
          </div>
        )}

        {view.slides.map((s) => {
          if (s.type === 'materi' || s.type === 'kuis') return null;
          const rs = view.responses.filter((r) => r.slideId === s.id);
          return (
            <Card key={s.id}>
              <CardHeader>
                <Badge className="self-start mb-1">{labels[s.type]}</Badge>
                <CardTitle className="text-base">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/60">{rs.length} respon diterima.</p>
                {(s.type === 'pilihan' || s.type === 'polling') && rs.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2">
                    {s.options.map((opt, i) => {
                      const count = rs.filter((r) => r.value[0] === String(i)).length;
                      const pct = Math.round((count / rs.length) * 100);
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="w-6 font-bold">{String.fromCharCode(65 + i)}</span>
                          <Progress value={pct} className="flex-1" />
                          <span className="w-20 text-right">
                            {count} ({pct}%)
                          </span>
                          {s.type === 'pilihan' && s.correct?.includes(i) && (
                            <Badge className="border-[#34D399] bg-secondary-background text-xs">Benar</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {view.leaderboard && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrophyIcon className="size-5" />
                Hasil Kuis
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {view.leaderboard.entries.map((e) => (
                <div key={e.ownerId} className="flex items-center gap-3 text-sm">
                  <span className="w-8 font-bold text-center">#{e.rank}</span>
                  <span className="flex-1">{e.ownerLabel}</span>
                  <span className="font-bold">{e.totalScore} pts</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
