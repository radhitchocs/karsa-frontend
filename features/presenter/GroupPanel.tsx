'use client';

import { useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SendFn, PresenterView } from './types';

export function GroupPanel({
  view,
  slide,
  send,
}: {
  view: PresenterView;
  slide: PresenterView['slides'][number];
  send: SendFn;
}) {
  const [groupCount, setGroupCount] = useState(slide.groups ?? 3);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pembagian Kelompok</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {view.groups.length === 0 ? (
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" htmlFor="group-count">
                  Jumlah kelompok
                </label>
                <Input
                  id="group-count"
                  type="number"
                  min={2}
                  max={20}
                  value={groupCount}
                  onChange={(e) => setGroupCount(Number(e.target.value))}
                  className="w-24"
                />
              </div>
              <Button onClick={() => send({ type: 'groups.assign', groupCount })}>
                Bagikan Kelompok
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {view.groups.map((g) => {
                const members = g.members.map((mid) =>
                  view.participants.find((p) => p.id === mid),
                );
                const responder = view.participants.find((p) => p.id === g.responder);
                return (
                  <Card key={g.id} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Kelompok {g.number}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1">
                        {members.map(
                          (m) =>
                            m && (
                              <Badge
                                key={m.id}
                                variant={m.id === g.responder ? 'default' : 'neutral'}
                                className="text-xs"
                              >
                                {m.name}
                                {m.id === g.responder && ' (penjawab)'}
                              </Badge>
                            ),
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground/60">
                          Penjawab: {responder?.name ?? '—'}
                        </span>
                        <Button
                          variant="neutral"
                          size="sm"
                          onClick={() =>
                            send({ type: 'group.replaceResponder', groupId: g.id })
                          }
                        >
                          <RefreshCwIcon className="size-3 mr-1" />
                          Ganti Penjawab
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
