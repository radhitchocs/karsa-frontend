'use client';

import { MessageSquareIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { SendFn, PresenterView } from './types';

type Activity = { status: string; visible: boolean; hiddenWords: string[] } | null;

export function QAPanel({
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
  const questions = view.questions.filter((q) => q.slideId === slide.id);
  const status = activity?.status ?? 'belum';

  const handleToggle = (targetId: string, currentlyVisible: boolean) => {
    if (!currentlyVisible) {
      // Hide any other visible question first (single selection)
      const prev = questions.find((x) => x.visible && x.id !== targetId);
      if (prev) send({ type: 'question.moderate', questionId: prev.id, visible: false });
      send({ type: 'question.moderate', questionId: targetId, visible: true });
    } else {
      send({ type: 'question.moderate', questionId: targetId, visible: false });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquareIcon className="size-4" />
            Sesi Tanya Jawab
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {status === 'belum' && (
            <Button onClick={() => send({ type: 'activity.open', slideId: slide.id })}>
              Buka Q&A
            </Button>
          )}
          {status === 'buka' && (
            <Button
              variant="neutral"
              onClick={() => send({ type: 'activity.close', slideId: slide.id })}
            >
              Tutup Q&A
            </Button>
          )}
          {status === 'tutup' && (
            <Button
              variant="neutral"
              onClick={() => send({ type: 'activity.reopen', slideId: slide.id })}
            >
              Buka Kembali
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2" role="list" aria-label="Daftar pertanyaan peserta">
        {questions.length === 0 && (
          <p className="text-sm text-foreground/70 italic">Belum ada pertanyaan dari peserta.</p>
        )}
        {questions.map((q) => (
          <Card key={q.id} className={q.answered ? 'opacity-60' : ''} role="listitem">
            <CardContent className="pt-4 flex items-start gap-3">
              <p className="flex-1 text-sm">{q.text}</p>
              <Button
                variant={q.visible ? 'default' : 'neutral'}
                size="sm"
                aria-pressed={q.visible}
                aria-label={q.visible ? `Sembunyikan: ${q.text}` : `Tampilkan: ${q.text}`}
                onClick={() => handleToggle(q.id, q.visible)}
              >
                {q.visible ? (
                  <>
                    <EyeOffIcon className="size-3 mr-1" aria-hidden="true" />
                    Sembunyikan
                  </>
                ) : (
                  <>
                    <EyeIcon className="size-3 mr-1" aria-hidden="true" />
                    Tampilkan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
