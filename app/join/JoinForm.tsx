'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/Loading';
import { apiFetch } from '@/lib/api';
import { setParticipantAuth } from '@/lib/participant-auth';

export function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimCode = code.trim();
    const trimName = name.trim();
    if (!/^\d{6}$/.test(trimCode)) {
      setError('Kode sesi harus 6 digit angka.');
      return;
    }
    if (!trimName) {
      setError('Nama wajib diisi.');
      return;
    }
    if (trimName.length > 40) {
      setError('Nama maksimal 40 karakter.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ participantId: string; token: string; sessionId: string }>(
        '/api/sessions/join',
        { method: 'POST', body: JSON.stringify({ code: trimCode, name: trimName }) },
      );
      setParticipantAuth(res.sessionId, res.token, res.participantId);
      router.push(`/session/${res.sessionId}/participant`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Gabung Sesi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="code">Kode sesi</Label>
              <Input
                id="code"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="name">Nama tampilan</Label>
              <Input
                id="name"
                maxLength={40}
                placeholder="Nama kamu"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {error && (
              <p data-testid="join-error" role="alert" className="text-sm text-foreground border-2 border-[var(--error)] rounded px-3 py-2 bg-secondary-background animate-shake">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="min-h-[48px]">
              {loading ? <Spinner className="mr-2" /> : null}
              {loading ? 'Menghubungkan…' : 'Gabung'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
