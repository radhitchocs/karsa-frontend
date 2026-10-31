'use client';

import { useState } from 'react';
import { FishIcon, RefreshCwIcon, UserMinusIcon, UserCheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { SendFn, PresenterView } from './types';

export function PancingPanel({
  view,
  send,
}: {
  view: PresenterView;
  slide: PresenterView['slides'][number];
  send: SendFn;
}) {
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [modalDismissedAt, setModalDismissedAt] = useState<number | null>(null);

  const lastPick = view.lastPick ?? null;
  const modalVisible = lastPick !== null && lastPick.timestamp !== modalDismissedAt;

  const onlineCount = view.participants.filter((p) => p.online).length;
  const availableCount = view.participants.filter(
    (p) => p.online && !excludedIds.has(p.id),
  ).length;

  const hasPicked = lastPick !== null;
  const canPick = availableCount > 0;

  function dismissModal() {
    if (lastPick) setModalDismissedAt(lastPick.timestamp);
  }

  function handleRemove() {
    if (!lastPick) return;
    setExcludedIds((prev) => new Set([...prev, lastPick.participantId]));
    dismissModal();
  }

  function handleKeep() {
    dismissModal();
  }

  function handlePick() {
    send({ type: 'pancing.pick', excludeIds: [...excludedIds] });
  }

  return (
    <div className="flex flex-col gap-4">
      {modalVisible && lastPick && (
        <Card className="border-2 border-border bg-main/10">
          <CardContent className="pt-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-center">
              Hapus{' '}
              <span className="font-black">{lastPick.participantName}</span>{' '}
              dari putaran berikutnya?
            </p>
            <div className="flex gap-2">
              <Button
                variant="neutral"
                className="flex-1 h-10"
                onClick={handleRemove}
              >
                <UserMinusIcon className="size-4 mr-2 shrink-0" />
                Hapus Peserta
              </Button>
              <Button
                variant="default"
                className="flex-1 h-10"
                onClick={handleKeep}
              >
                <UserCheckIcon className="size-4 mr-2 shrink-0" />
                Pertahankan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FishIcon className="size-4" />
            Pancing Peserta
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-foreground/70">
            Pilih peserta secara acak. Animasi muncul di layar proyektor.
          </p>

          {excludedIds.size > 0 && (
            <p className="text-xs text-foreground/60">
              {excludedIds.size} peserta dihapus &bull;{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setExcludedIds(new Set())}
              >
                Reset
              </button>
            </p>
          )}

          <Button
            className="w-full"
            onClick={handlePick}
            disabled={!canPick || modalVisible}
          >
            {hasPicked ? (
              <>
                <RefreshCwIcon className="size-4 mr-2" />
                Pancing Lagi
              </>
            ) : (
              <>
                <FishIcon className="size-4 mr-2" />
                Pancing!
              </>
            )}
          </Button>

          {!canPick && (
            <p className="text-xs text-center text-foreground/60">
              {onlineCount === 0
                ? 'Tidak ada peserta yang terhubung.'
                : 'Semua peserta sudah dihapus dari daftar.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
