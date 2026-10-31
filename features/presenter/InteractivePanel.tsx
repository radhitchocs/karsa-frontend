'use client';

import { EyeIcon, EyeOffIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart } from '@/features/projector/BarChart';
import { normalize } from '@/domain/model';
import type { SendFn, PresenterView } from './types';

type Activity = { status: string; visible: boolean; hiddenWords: string[] } | null;

export function InteractivePanel({
  view,
  slide,
  activity,
  send,
}: {
  view: PresenterView;
  slide: PresenterView['slides'][number];
  activity: Activity;
  send: SendFn;
}) {
  const responses = view.responses.filter((r) => r.slideId === slide.id);
  const status = activity?.status ?? 'belum';

  // All submitted words including hidden — presenter sees everything for moderation
  const awanWords = (() => {
    if (slide.type !== 'awan') return [];
    const hiddenWords = activity?.hiddenWords ?? [];
    const wordMap: Record<string, number> = {};
    responses.forEach((r) =>
      r.value.forEach((v) => {
        const n = normalize(v);
        wordMap[n] = (wordMap[n] ?? 0) + 1;
      }),
    );
    return Object.entries(wordMap)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([word, count]) => ({ word, count, hidden: hiddenWords.includes(word) }));
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm flex-1">Respon Peserta</CardTitle>
          <span className="text-sm font-medium whitespace-nowrap">
            {responses.length} respon
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* B4: Controls always visible, disabled by activity status */}
        <div className="flex gap-2 flex-wrap">
          {/* Open / Reopen — label depends on status */}
          <Button
            disabled={status === 'buka'}
            onClick={() =>
              status === 'tutup'
                ? send({ type: 'activity.reopen', slideId: slide.id })
                : send({ type: 'activity.open', slideId: slide.id })
            }
          >
            {status === 'tutup' ? (
              <><RefreshCwIcon className="size-4 mr-1" />Buka Kembali</>
            ) : (
              'Buka Aktivitas'
            )}
          </Button>

          {/* Close — enabled only when buka */}
          <Button
            variant="neutral"
            disabled={status !== 'buka'}
            onClick={() => send({ type: 'activity.close', slideId: slide.id })}
          >
            Tutup Aktivitas
          </Button>

          {/* Reveal results — always visible, disabled unless activity is closed and not yet revealed */}
          <Button
            disabled={status !== 'tutup' || (activity?.visible ?? false)}
            onClick={() => send({ type: 'results.reveal', slideId: slide.id })}
          >
            <EyeIcon className="size-4 mr-1" />
            Tampilkan Hasil
          </Button>

          {/* Simulate — demo mode, only while open */}
          {status === 'buka' && view.hasSimulatedData && (
            <Button
              variant="neutral"
              data-testid="simulate-responses-btn"
              onClick={() => send({ type: 'session.simulate' })}
            >
              Simulasikan respons
            </Button>
          )}
        </div>

        {/* B4: Bar chart for pilihan / polling */}
        {activity?.visible && (slide.type === 'pilihan' || slide.type === 'polling') && slide.options.length > 0 && (
          <div className="pt-2 border-t-2 border-border">
            <BarChart
              bars={slide.options.map((opt, i) => ({
                label: opt,
                count: responses.filter((r) => r.value[0] === String(i)).length,
                isCorrect: slide.type === 'pilihan' && slide.correct.includes(i),
              }))}
              total={responses.length}
            />
          </div>
        )}

        {/* Awan kata — word list with hide/show toggle per word */}
        {slide.type === 'awan' && (
          <div className="pt-2 border-t-2 border-border flex flex-col gap-2">
            <p className="text-xs font-medium">Kata yang dikirim:</p>
            {awanWords.length === 0 ? (
              <p className="text-xs text-foreground/70">Belum ada kata.</p>
            ) : (
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {awanWords.map(({ word, count, hidden }) => (
                  <div
                    key={word}
                    data-testid={hidden ? `word-${word}-hidden` : `word-${word}`}
                    className={`flex items-center gap-2 px-2 py-1 rounded border-2 ${
                      hidden
                        ? 'bg-secondary-background border-[var(--error)] line-through opacity-60'
                        : 'bg-secondary-background border-border'
                    }`}
                  >
                    <span className="flex-1 text-sm font-medium">
                      {word}
                    </span>
                    <span className="text-xs text-foreground/70">×{count}</span>
                    <Button
                      variant="neutral"
                      size="sm"
                      onClick={() =>
                        send({ type: 'activity.hideWord', slideId: slide.id, word })
                      }
                      className="h-6 px-2"
                    >
                      {hidden ? (
                        <EyeIcon className="size-3" />
                      ) : (
                        <EyeOffIcon className="size-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
