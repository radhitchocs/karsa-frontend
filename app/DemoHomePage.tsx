'use client';

/**
 * DemoHomePage — shown when NEXT_PUBLIC_DEMO_MODE=true.
 * Lists fixture presentations; "Mulai" creates an in-memory session with 6 demo participants.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlayIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fixtures } from '@/domain/fixtures';
import { mockSessionService } from '@/services/mock-session-service';

const DEMO_PARTICIPANTS = ['Alya', 'Bima', 'Citra', 'Dimas', 'Eka', 'Farah'];
const data = fixtures();

export function DemoHomePage() {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);

  function handleStart(presentationId: string) {
    const presentation = data.presentations.find((p) => p.id === presentationId);
    if (!presentation) return;
    setStarting(presentationId);
    const session = mockSessionService.createSession(presentation);
    DEMO_PARTICIPANTS.forEach((name) => mockSessionService.joinSession(session.id, name));
    router.push(`/session/${session.id}/presenter`);
  }

  return (
    <main className="flex flex-col min-h-full">
      <header className="border-b-2 border-border bg-secondary-background px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Karsa</h1>
        <Badge variant="neutral">Mode Demo</Badge>
      </header>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Presentasi Demo</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {data.presentations.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="text-base leading-tight">{p.title}</CardTitle>
                <p className="text-xs text-foreground/60 mt-1">
                  {p.slides.length} slide{p.slides.length !== 1 ? 's' : ''}
                  {' · '}
                  {DEMO_PARTICIPANTS.length} peserta demo
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  size="sm"
                  className="w-full"
                  disabled={starting === p.id}
                  onClick={() => handleStart(p.id)}
                >
                  <PlayIcon className="size-3 mr-1" />
                  Mulai Demo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
