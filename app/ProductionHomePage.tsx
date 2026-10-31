'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, PlayIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { getToken, clearToken } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import { labels } from '@/domain/model';
import type { Kind } from '@/domain/model';

type PresentationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  version: number;
  slideCount: number;
  slideKinds: string[];
};

type NewSessionResponse = {
  sessionId: string;
  code: string;
};

export function ProductionHomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  const { data: presentations = [], isLoading, error } = useQuery<PresentationSummary[]>({
    queryKey: ['presentations'],
    queryFn: () => apiFetch<PresentationSummary[]>('/api/presentations'),
    enabled: mounted && !!getToken(),
  });

  const createMutation = useMutation({
    mutationFn: (title: string) =>
      apiFetch<{ id: string }>('/api/presentations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      setNewTitle('');
      setCreating(false);
      router.push(`/presentations/${data.id}/edit`);
    },
    onError: (err: Error) => {
      toast.add({ title: 'Gagal membuat presentasi', description: err.message, type: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/presentations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
    },
    onError: (err: Error) => {
      toast.add({ title: 'Gagal menghapus', description: err.message, type: 'error' });
    },
  });

  const startMutation = useMutation({
    mutationFn: (presentationId: string) =>
      apiFetch<NewSessionResponse>(`/api/presentations/${presentationId}/sessions`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      router.push(`/session/${data.sessionId}/presenter`);
    },
    onError: (err: Error) => {
      toast.add({ title: 'Gagal memulai sesi', description: err.message, type: 'error' });
    },
  });

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  if (error) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-[var(--error)]">Gagal memuat: {(error as Error).message}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-full">
      <header className="border-b-2 border-border bg-secondary-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/faveicon.svg" alt="" aria-hidden="true" width={40} height={40} />
          <span className="font-black text-3xl tracking-tight">Karsa</span>
        </div>
        <Button variant="neutral" size="sm" onClick={handleLogout}>
          Keluar
        </Button>
      </header>

      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Presentasi Saya</h2>
          {!creating ? (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon className="size-4 mr-2" />
              Buat Baru
            </Button>
          ) : (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (newTitle.trim()) createMutation.mutate(newTitle.trim());
              }}
            >
              <Input
                autoFocus
                placeholder="Judul presentasi…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-56"
              />
              <Button type="submit" disabled={createMutation.isPending || !newTitle.trim()}>
                Buat
              </Button>
              <Button type="button" variant="neutral" onClick={() => setCreating(false)}>
                Batal
              </Button>
            </form>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-secondary-background border-2 border-border rounded-base animate-pulse" />
            ))}
          </div>
        ) : presentations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg text-foreground/60 mb-4">Belum ada presentasi.</p>
            <Button onClick={() => setCreating(true)}>
              <PlusIcon className="size-4 mr-2" />
              Buat Presentasi Pertama
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {presentations.map((p) => (
              <Card key={p.id} className="flex flex-col">
                <CardHeader className="flex-1">
                  <CardTitle className="text-base leading-tight">{p.title || 'Tanpa Judul'}</CardTitle>
                  <p className="text-xs text-foreground/60 mt-1">
                    {p.slideCount} slide
                    {p.updatedAt ? ` · ${new Date(p.updatedAt).toLocaleDateString('id')}` : ''}
                  </p>
                  {p.slideKinds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.slideKinds.map((k) => (
                        <span
                          key={k}
                          className="text-[10px] px-1.5 py-0.5 border border-black rounded-base font-semibold leading-tight"
                          style={{ backgroundColor: SLIDE_COLOR[k as Kind] ?? '#ddd' }}
                        >
                          {labels[k as Kind] ?? k}
                        </span>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex gap-2 pt-0">
                  <Button
                    variant="neutral"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/presentations/${p.id}/edit`)}
                  >
                    <PencilIcon className="size-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={startMutation.isPending}
                    onClick={() => startMutation.mutate(p.id)}
                  >
                    <PlayIcon className="size-3 mr-1" />
                    Mulai
                  </Button>
                  <Button
                    variant="neutral"
                    size="icon"
                    className="shrink-0"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm(`Hapus "${p.title}"?`)) deleteMutation.mutate(p.id);
                    }}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
