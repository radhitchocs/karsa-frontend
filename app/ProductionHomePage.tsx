'use client';

import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3Icon, MoreVerticalIcon, PlusIcon, PencilIcon, PlayIcon, Trash2Icon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  // Presentation awaiting delete confirmation (from the card's ⋯ menu)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

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
      <AppHeader
        right={
          <Button variant="neutral" size="sm" onClick={handleLogout}>
            Keluar
          </Button>
        }
      />

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
                  <Tooltip disableHoverablePopup>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="neutral"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/presentations/${p.id}/edit`)}
                        />
                      }
                    >
                      <PencilIcon className="size-3" />
                      Ubah
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="pointer-events-none">Ubah slide presentasi</TooltipContent>
                  </Tooltip>
                  <Tooltip disableHoverablePopup>
                    <TooltipTrigger
                      render={
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={startMutation.isPending}
                          onClick={() => startMutation.mutate(p.id)}
                        />
                      }
                    >
                      <PlayIcon className="size-3" />
                      Mulai
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="pointer-events-none">Mulai sesi presentasi</TooltipContent>
                  </Tooltip>
                  <DropdownMenu>
                    <Tooltip disableHoverablePopup>
                      <TooltipTrigger
                        render={
                          <DropdownMenuTrigger
                            render={
                              <Button variant="neutral" size="icon" className="shrink-0" aria-label={`Menu ${p.title}`} />
                            }
                          />
                        }
                      >
                        <MoreVerticalIcon />
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="pointer-events-none">Lainnya</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="bottom" align="end" className="min-w-36 p-0.5">
                      <DropdownMenuItem
                        onClick={() => router.push(`/presentations/${p.id}/edit?tab=hasil`)}
                        className="cursor-pointer gap-1.5 px-1.5 py-1 text-xs [&_svg]:size-3"
                      >
                        <BarChart3Icon /> Lihat Hasil
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTarget({ id: p.id, title: p.title })}
                        className="cursor-pointer gap-1.5 px-1.5 py-1 text-xs [&_svg]:size-3 text-[var(--error-fg)] hover:bg-[var(--error)] hover:text-white hover:border-border focus:bg-[var(--error)] focus:text-white focus:border-border data-highlighted:bg-[var(--error)] data-highlighted:text-black data-highlighted:border-border"
                      >
                        <Trash2Icon /> Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus presentasi?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/70">
            &ldquo;{deleteTarget?.title}&rdquo; akan dihapus. Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="neutral" size="sm" />}>Batal</DialogClose>
            <Button
              size="sm"
              className="border-2 border-border bg-[var(--error)] text-black hover:bg-[var(--error)]/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
