'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  AlertCircleIcon,
  Trash2Icon,
  PlayIcon,
  CheckIcon,
  MoreVerticalIcon,
  CopyIcon,
  FileTextIcon,
  ListChecksIcon,
  BarChart2Icon,
  CloudIcon,
  MessageSquareIcon,
  UsersIcon,
  TrophyIcon,
  ImageIcon,
  BarChart3Icon,
  HomeIcon,
  FishIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dropzone } from '@/components/ui/dropzone';
import { NumberStepper } from '@/components/ui/number-stepper';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { apiFetch, API_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import {
  type Slide,
  type Kind,
  type QuizQuestion,
  kinds,
  labels,
  uid,
  newSlide,
  quizOrderErrors,
} from '@/domain/model';
import { QUIZ_DEFAULT_DURATION } from '@/domain/quiz-config';
import { SlidePreview } from '@/features/shared/SlidePreview';
import type { Editor } from '@tiptap/react';
import { RichTextField, RichTextToolbar, UnavailableHint, pillBase, pillButton, pillGroup } from './RichTextEditor';
import { PanelNote, SettingsPanel, SlideCanvas, canvasFrameClass } from './SlideCanvas';

type PresentationDetail = {
  id: string;
  title: string;
  slidesJson: Slide[];
  updatedAt: string;
  version: number;
};

type SessionResult = {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  endedAt: string | null;
  participantCount: number;
  slides: Array<{
    id: string;
    type: string;
    title: string;
    responseCount: number;
    responses: Array<{ value: unknown; ownerLabel: string | null }>;
    questions: Array<{ text: string; visible: boolean; answered: boolean }>;
  }>;
  quizScores: Array<{
    questionRunId: string;
    questionIndex: number;
    ownerLabel: string | null;
    optionIndex: number;
    isCorrect: boolean;
    score: number;
  }>;
};

type SaveStatus = 'idle' | 'saving' | 'saved' | 'conflict' | 'error';

/** Solid fill bg class for slide type indicators (left bar, badge). PRD §17.1 type colors. */
const kindColors: Record<Kind, string> = {
  materi: 'bg-[#60A5FA]',
  pilihan: 'bg-[#A78BFA]',
  polling: 'bg-[#FB923C]',
  awan: 'bg-[#FFD93D]',
  tanya: 'bg-[#FF8FCB]',
  kelompok: 'bg-[#2DD4BF]',
  kuis: 'bg-[#B8F25B]',
  pancing: 'bg-[#FF6B6B]',
};

const kindIcons: Record<Kind, React.ReactNode> = {
  materi: <FileTextIcon className="size-4" />,
  pilihan: <ListChecksIcon className="size-4" />,
  polling: <BarChart2Icon className="size-4" />,
  awan: <CloudIcon className="size-4" />,
  tanya: <MessageSquareIcon className="size-4" />,
  kelompok: <UsersIcon className="size-4" />,
  kuis: <TrophyIcon className="size-4" />,
  pancing: <FishIcon className="size-4" />,
};

/** Hover-expanding "+" slot between slides in the filmstrip. */
function SlideInsertGap({
  index,
  open,
  onOpenChange,
  onPick,
}: {
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (kind: Kind) => void;
}) {
  return (
    <div className="group/gap flex w-4 shrink-0 items-center justify-center overflow-hidden transition-[width] duration-200 ease-out delay-0 hover:delay-200 hover:w-12 has-[[data-popup-open]]:w-12 has-[[data-popup-open]]:delay-0">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          className="inline-flex shrink-0 items-center justify-center rounded-base border-2 border-opacity-100 border-foreground/30 hover:border-foreground/60 bg-secondary-background p-1 text-foreground/60 opacity-0 transition-opacity delay-0 hover:text-foreground group-hover/gap:opacity-100 group-hover/gap:delay-200 data-[popup-open]:opacity-100 cursor-pointer"
          aria-label="Tambah slide di sini"
          data-testid={`insert-slide-gap-${index}`}
        >
          <PlusIcon className="size-3" />
        </PopoverTrigger>
        <PopoverContent className="w-52 p-1" side="top" align="center" sideOffset={6}>
          <div className="flex flex-col gap-0.5">
            {kinds.map((k) => (
              <button
                key={k}
                onClick={() => onPick(k)}
                className="flex items-center gap-2 px-3 py-2 rounded-base text-sm font-medium hover:bg-main hover:text-main-foreground text-left w-full transition-colors cursor-pointer"
                data-testid={`insert-slide-${index}-${k}`}
              >
                {kindIcons[k]}
                {labels[k]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
/** Duplikat / Hapus actions, shared by the slide's ⋯ dropdown and right-click context menu. */
function SlideMenuItems({
  testIdPrefix,
  index,
  onDuplicate,
  onDelete,
}: {
  testIdPrefix: 'slide' | 'slide-ctx';
  index: number;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <DropdownMenuItem
        onClick={onDuplicate}
        className="gap-1.5 px-1.5 py-1 text-xs [&_svg]:size-3 cursor-pointer"
        data-testid={`${testIdPrefix}-duplicate-${index}`}
      >
        <CopyIcon /> Duplikat
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onDelete}
        className="gap-1.5 px-1.5 py-1 text-xs [&_svg]:size-3 text-[var(--error-fg)] hover:bg-[var(--error)] cursor-pointer hover:text-white hover:border-border focus:bg-[var(--error)] focus:text-white focus:border-border data-highlighted:bg-[var(--error)] data-highlighted:text-black data-highlighted:border-border"
        data-testid={`${testIdPrefix}-delete-${index}`}
      >
        <Trash2Icon /> Hapus
      </DropdownMenuItem>
    </>
  );
}


const AUTOSAVE_DELAY_MS = 1500;

export function EditClient() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deleteConfirmSlideId, setDeleteConfirmSlideId] = useState<string | null>(null);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragStep, setDragStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [activeTab, setActiveTab] = useState<'edit' | 'results'>('edit');

  // Track last saved version for optimistic locking
  const lastSavedVersionRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideListRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef(title);
  const slidesRef = useRef(slides);
  titleRef.current = title;
  slidesRef.current = slides;

  useEffect(() => {
    setMounted(true);
    if (!getToken()) router.push('/login');
  }, [router]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const { data, isLoading } = useQuery<PresentationDetail>({
    queryKey: ['presentation', id],
    queryFn: () => apiFetch<PresentationDetail>(`/api/presentations/${id}`),
    enabled: mounted && !!id && !!getToken(),
  });

  useEffect(() => {
    if (data) {
      setTitle(data.title ?? '');
      setSlides(data.slidesJson ?? []);
      setDirty(false);
      lastSavedVersionRef.current = data.version;
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (opts: { currentTitle: string; currentSlides: Slide[] }) =>
      Promise.all([
        apiFetch(`/api/presentations/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title: opts.currentTitle }),
        }),
        apiFetch<PresentationDetail>(`/api/presentations/${id}/slides`, {
          method: 'PUT',
          body: JSON.stringify({
            slides: opts.currentSlides,
            ...(lastSavedVersionRef.current !== null
              ? { expectedVersion: lastSavedVersionRef.current }
              : {}),
          }),
        }),
      ]),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: ([, slidesResult]) => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      setDirty(false);
      setSaveStatus('saved');
      lastSavedVersionRef.current = (slidesResult as PresentationDetail).version ?? null;
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 3000);
    },
    onError: (err: Error) => {
      const is409 = err.message?.includes('409') || err.message?.includes('tab lain');
      if (is409) {
        setSaveStatus('conflict');
        toast.add({
          title: 'Konflik penyimpanan',
          description: 'Presentasi telah diubah di tab lain. Muat ulang untuk melihat versi terbaru.',
          type: 'error',
        });
      } else {
        setSaveStatus('error');
        toast.add({ title: 'Gagal menyimpan', description: err.message, type: 'error' });
      }
    },
  });

  // Debounced autosave
  function scheduleSave() {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (saveStatus !== 'conflict') {
        saveMutation.mutate({
          currentTitle: titleRef.current,
          currentSlides: slidesRef.current,
        });
      }
    }, AUTOSAVE_DELAY_MS);
  }

  const startMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ sessionId: string }>(`/api/presentations/${id}/sessions`, { method: 'POST' }),
    onSuccess: (s) => router.push(`/session/${s.sessionId}/presenter`),
    onError: (err: Error) => {
      toast.add({ title: 'Gagal memulai sesi', description: err.message, type: 'error' });
    },
  });

  function mark() {
    setDirty(true);
    setSaveStatus('idle');
    scheduleSave();
  }

  function updateSlide(index: number, patch: Partial<Slide>) {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    mark();
  }

  function addSlide(kind: Kind, at?: number) {
    const slide = newSlide(kind);
    setSlides((prev) => {
      if (kind === 'kuis') {
        if (prev.some((s) => s.type === 'kuis')) {
          toast.add({ title: 'Maksimal satu slide Kuis.', type: 'error' });
          return prev;
        }
        return [...prev, slide];
      }
      const quizIdx = prev.findIndex((s) => s.type === 'kuis');
      const next = [...prev];
      const limit = quizIdx === -1 ? next.length : quizIdx;
      const index = at === undefined ? limit : Math.min(at, limit);
      next.splice(index, 0, slide);
      setSelectedIndex(index);
      return next;
    });
    mark();
  }

  function removeSlide(index: number) {
    setSlides((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setSelectedIndex((si) => Math.min(si, Math.max(0, next.length - 1)));
      return next;
    });
    mark();
  }

  function duplicateSlide(index: number) {
    setSlides((prev) => {
      const s = prev[index];
      const copy: Slide = { ...s, id: uid(), title: s.title + ' (salinan)' };
      const next = [...prev];
      const insertAt = s.type === 'kuis' ? next.length : index + 1;
      next.splice(insertAt, 0, copy);
      setSelectedIndex(insertAt);
      return next;
    });
    mark();
  }

  function dropSlide(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setSlides((prev) => {
      const next = [...prev];
      const moving = next[fromIndex];
      if (moving.type === 'kuis') return prev;
      if (next[toIndex]?.type === 'kuis') return prev;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moving);
      setSelectedIndex(toIndex);
      return next;
    });
    mark();
  }

  const selected = slides[selectedIndex];
  const durationErrors = slides
    .filter((s) => s.type === 'kuis')
    .filter((s) => {
      const d = s.duration ?? 0;
      return !Number.isFinite(d) || d < 10 || d > 120;
    })
    .map(() => 'Durasi kuis harus antara 10–120 detik.');
  const orderErrors = slides.length > 0 ? quizOrderErrors(slides) : [];
  const validationErrors = [...orderErrors, ...durationErrors];

  const saveStatusLabel: Record<SaveStatus, string | null> = {
    idle: dirty ? 'Belum disimpan' : null,
    saving: 'Menyimpan...',
    saved: 'Tersimpan',
    conflict: 'Konflik — muat ulang',
    error: 'Gagal menyimpan',
  };

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p>Memuat…</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen">
      {/* Top bar */}
      <header className="border-b-2 border-border bg-secondary-background px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 w-[12.25rem] shrink-0">
          <Image src="/faveicon.svg" alt="" aria-hidden="true" width={40} height={40} />
          <span className="font-black text-3xl tracking-tight">Karsa</span>
          <Button variant="neutral" size="icon" className="ml-auto" onClick={() => router.push('/')}>
            <HomeIcon className="size-4" />
          </Button>
        </div>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); mark(); }}
          className="flex-1 max-w-xs font-semibold"
          placeholder="Judul presentasi"
        />
        {/* Save status indicator */}
        {saveStatusLabel[saveStatus] && (
          <span
            className={`text-xs ${saveStatus === 'saved' ? 'text-foreground/70' :
              saveStatus === 'conflict' || saveStatus === 'error' ? 'text-[var(--error)]' :
                'text-foreground/70'
              }`}
          >
            {saveStatusLabel[saveStatus]}
          </span>
        )}
        {saveStatus === 'conflict' && (
          <Button variant="neutral" size="sm" onClick={() => window.location.reload()}>
            Muat Ulang
          </Button>
        )}
        {/* Results tab toggle */}
        <Button
          variant={activeTab === 'results' ? 'default' : 'neutral'}
          size="sm"
          onClick={() => setActiveTab(activeTab === 'results' ? 'edit' : 'results')}
        >
          <BarChart3Icon className="size-4 mr-1" />
          Hasil
        </Button>
        <Button
          size="sm"
          data-testid="mulai-sesi-btn"
          disabled={startMutation.isPending || slides.length === 0}
          onClick={() => {
            if (validationErrors.length > 0) {
              toast.add({ title: 'Tidak dapat memulai sesi', description: validationErrors[0], type: 'error' });
              return;
            }
            startMutation.mutate();
          }}
        >
          <PlayIcon className="size-4 mr-1" />
          Mulai Sesi
        </Button>
      </header>

      {activeTab === 'results' ? (
        <ResultsArea presentationId={id} />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col">
          {/* Slide editor (canvas + form) */}
          <div className="flex flex-1 flex-col overflow-y-auto p-6">
            {!selected ? (
              <div className="flex items-center justify-center h-full text-foreground/60">
                Pilih atau tambahkan slide untuk mulai mengedit.
              </div>
            ) : (
              <SlideEditor
                key={selected.id}
                slide={selected}
                index={selectedIndex}
                total={slides.length}
                onChange={(patch) => updateSlide(selectedIndex, patch)}
                onDelete={() => setDeleteConfirmSlideId(selected.id)}
              />
            )}
          </div>

          {/* Slide filmstrip */}
          <section className="shrink-0 border-t-2 border-border bg-secondary-background flex flex-col">
            <div className="flex items-stretch">
              <div className="flex items-center p-2 border-r-2 border-border">
                <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
                  <PopoverTrigger
                    openOnHover
                    delay={100}
                    className="inline-flex items-center justify-center h-9 px-3 text-sm font-semibold bg-main text-main-foreground border-2 border-border rounded-base shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all whitespace-nowrap cursor-pointer"
                    data-testid="add-slide-btn"
                  >
                    <PlusIcon className="size-4 mr-1" />
                    Slide Baru
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-1" side="top" align="start" sideOffset={6}>
                    <div className="flex flex-col gap-0.5" data-testid="add-slide-popover">
                      {kinds.map((k) => (
                        <button
                          key={k}
                          onClick={() => { addSlide(k); setAddPopoverOpen(false); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-base text-sm font-medium hover:bg-main hover:text-main-foreground text-left w-full transition-colors cursor-pointer"
                          data-testid={`add-slide-${k}`}
                        >
                          {kindIcons[k]}
                          {labels[k]}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div ref={slideListRef} className="relative flex-1 overflow-x-auto p-2 flex flex-row min-h-[104px]">
                {slides.length === 0 && (
                  <p className="text-xs text-foreground/60 self-center px-2">
                    Belum ada slide. Tambahkan di atas.
                  </p>
                )}
                {slides.map((s, i) => {
                  const dragging = dragIndex !== null && dragOverIndex !== null;
                  let shift = 0;
                  let isDragged = false;
                  if (dragIndex !== null && dragOverIndex !== null) {
                    const dropAt = dragOverIndex > dragIndex ? dragOverIndex - 1 : dragOverIndex;
                    isDragged = i === dragIndex;
                    if (isDragged) shift = dropAt - dragIndex;
                    else if (dragIndex < i && i <= dropAt) shift = -1;
                    else if (dropAt <= i && i < dragIndex) shift = 1;
                  }

                  return (
                    <Fragment key={s.id}>
                      <SlideInsertGap
                        index={i}
                        open={insertOpen === i}
                        onOpenChange={(open) => setInsertOpen(open ? i : null)}
                        onPick={(kind) => { addSlide(kind, i); setInsertOpen(null); }}
                      />
                      <ContextMenu onOpenChange={(open) => { if (open) setSelectedIndex(i); }}>
                        <Tooltip disableHoverablePopup>
                          <TooltipTrigger
                            render={<ContextMenuTrigger
                              data-testid={`slide-item-${i}`}
                              draggable={s.type !== 'kuis'}
                              onDragStart={(e) => {
                                setDragIndex(i);
                                setDragOverIndex(i);
                                setDragStep(e.currentTarget.offsetWidth + 16);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                const list = slideListRef.current;
                                const item = e.currentTarget;
                                const x = list
                                  ? e.clientX - list.getBoundingClientRect().left + list.scrollLeft
                                  : e.clientX;
                                setDragOverIndex(x > item.offsetLeft + item.offsetWidth / 2 ? i + 1 : i);
                              }}
                              onDragEnd={() => {
                                if (dragIndex !== null && dragOverIndex !== null) {
                                  const to = dragOverIndex > dragIndex ? dragOverIndex - 1 : dragOverIndex;
                                  dropSlide(dragIndex, to);
                                }
                                setDragIndex(null);
                                setDragOverIndex(null);
                              }}
                              onClick={() => setSelectedIndex(i)}
                              style={dragging ? { transform: `translateX(${shift * dragStep}px)` } : undefined}
                              className={`group relative w-40 aspect-video shrink-0 overflow-hidden rounded-base border-2 bg-white cursor-pointer select-none ${dragging ? 'transition-[transform,border-color] duration-150 ease-out' : 'transition-colors'} ${dragging && isDragged
                                ? 'border-foreground opacity-60 z-10 pointer-events-none'
                                : i === selectedIndex
                                  ? 'border-foreground shadow-[2px_2px_0_0_#000]'
                                  : 'border-foreground/20 hover:border-foreground/50'
                                }`}
                            >
                              <SlidePreview slide={s} />
                              <div className="absolute inset-x-1 top-1 flex items-start">
                                <span
                                  className={`min-w-0 flex-1 text-xs font-bold px-1.5 py-0.5 rounded-base border border-black leading-tight ${kindColors[s.type]}`}
                                >
                                  <span className="block truncate">
                                    {labels[s.type]}
                                  </span>
                                </span>
                                {i === selectedIndex && (
                                  <div className="flex w-0 shrink-0 justify-end overflow-hidden opacity-0 transition-[width,opacity] duration-150 ease-out group-hover:w-6 group-hover:opacity-100 has-[:focus-visible]:w-6 has-[:focus-visible]:opacity-100 has-[[data-popup-open]]:w-6 has-[[data-popup-open]]:opacity-100">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger
                                        onClick={(e) => e.stopPropagation()}
                                        className="size-5 inline-flex items-center justify-center rounded-base border border-black bg-white text-foreground cursor-pointer hover:bg-gray-200"
                                        data-testid={`slide-menu-${i}`}
                                        aria-label="Menu slide"
                                      >
                                        <MoreVerticalIcon className="size-4 rotate-90" />
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent side="top" className="min-w-24 p-0.5">
                                        <SlideMenuItems
                                          testIdPrefix="slide"
                                          index={i}
                                          onDuplicate={() => duplicateSlide(i)}
                                          onDelete={() => setDeleteConfirmSlideId(s.id)}
                                        />
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </div>
                              <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 border-t border-black/20 bg-black/10 px-1.5 py-0.5">
                                <span className="shrink-0 text-xs text-end font-bold text-foreground/70">
                                  {i + 1}
                                </span>
                                <span className="flex-1 truncate text-xs text-foreground/70" data-testid={`slide-title-${i}`}>
                                  {"- "}{s.title || '(tanpa judul)'}
                                </span>
                              </div>
                            </ContextMenuTrigger>
                            }
                          />
                          <TooltipContent side="top" className="pointer-events-none max-w-64">
                            <p className="font-bold">Slide {i + 1} - {labels[s.type]}</p>
                            <p className="truncate text-foreground/70">
                              {s.title || '(tanpa judul)'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <ContextMenuContent side="top" className="min-w-24 p-0.5">
                          <SlideMenuItems
                            testIdPrefix="slide-ctx"
                            index={i}
                            onDuplicate={() => duplicateSlide(i)}
                            onDelete={() => setDeleteConfirmSlideId(s.id)}
                          />
                        </ContextMenuContent>
                      </ContextMenu>
                    </Fragment>
                  );
                })}
                {slides.length > 0 && (
                  <SlideInsertGap
                    index={slides.length}
                    open={insertOpen === slides.length}
                    onOpenChange={(open) => setInsertOpen(open ? slides.length : null)}
                    onPick={(kind) => { addSlide(kind, slides.length); setInsertOpen(null); }}
                  />
                )}
              </div>
            </div>
            {validationErrors.length > 0 && (
              <div className="p-2 border-t-2 border-[var(--error)] bg-secondary-background">
                {validationErrors.map((e) => (
                  <p key={e} className="text-xs text-foreground font-medium">{e}</p>
                ))}
              </div>
            )}
          </section>

          {/* Delete confirmation dialog */}
          <Dialog
            open={deleteConfirmSlideId !== null}
            onOpenChange={(open) => { if (!open) setDeleteConfirmSlideId(null); }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Hapus slide?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-foreground/70">
                Tindakan ini tidak dapat dibatalkan.
              </p>
              <DialogFooter>
                <DialogClose className="inline-flex items-center justify-center h-9 px-3 text-sm font-semibold border-2 border-border rounded-base bg-white shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                  Batal
                </DialogClose>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-[var(--error)] hover:bg-[var(--error)]/90 border-2 border-border"
                  data-testid="slide-delete-confirm"
                  onClick={() => {
                    const idx = slides.findIndex((s) => s.id === deleteConfirmSlideId);
                    if (idx !== -1) removeSlide(idx);
                    setDeleteConfirmSlideId(null);
                  }}
                >
                  Hapus
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// ResultsArea — C8: past sessions of a presentation
// ---------------------------------------------------------------------------

function ResultsArea({ presentationId }: { presentationId: string }) {
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const { data: results, isLoading } = useQuery<SessionResult[]>({
    queryKey: ['presentation-results', presentationId],
    queryFn: () => apiFetch<SessionResult[]>(`/api/presentations/${presentationId}/results`),
    enabled: !!getToken(),
  });

  useEffect(() => {
    if (results && results.length > 0 && !activeSession) {
      setActiveSession(results[0].id);
    }
  }, [results, activeSession]);

  if (isLoading) return <div className="flex flex-1 items-center justify-center p-8">Memuat hasil…</div>;
  if (!results || results.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-foreground/60">
        Belum ada sesi yang tersimpan.
      </div>
    );
  }

  const session = results.find((s) => s.id === activeSession) ?? results[0];

  return (
    <div className="flex flex-1 min-h-0">
      {/* Session tabs */}
      <aside className="w-48 border-r-2 border-border bg-secondary-background flex flex-col overflow-y-auto p-2 gap-1 shrink-0">
        <p className="text-xs font-semibold text-foreground/70 px-2 py-1">Sesi Lampau</p>
        {results.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSession(s.id)}
            className={`text-left px-2 py-2 rounded-base border-2 text-xs transition-colors ${s.id === activeSession ? 'border-foreground shadow-[2px_2px_0_0_#000]' : 'border-transparent hover:border-foreground/20'
              }`}
          >
            <div className="font-semibold">#{s.code}</div>
            <div className="text-foreground/70">{new Date(s.createdAt).toLocaleDateString('id-ID')}</div>
            <div className="text-foreground/70">{s.participantCount} peserta</div>
          </button>
        ))}
      </aside>

      {/* Session detail */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Sesi #{session.code}</h2>
            <Badge className={session.status === 'ENDED' ? 'bg-secondary-background border-border' : 'bg-[#34D399] border-black'}>
              {session.status === 'ENDED' ? 'Selesai' : session.status}
            </Badge>
            <span className="text-sm text-foreground/70">
              {new Date(session.createdAt).toLocaleString('id-ID')}
            </span>
          </div>

          {session.slides.map((slide) => (
            <Card key={slide.id} className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{slide.title} <span className="text-foreground/60 font-normal">({slide.type})</span></CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-xs text-foreground/60">{slide.responseCount} respons</p>

                {/* Polling/Pilihan: show response breakdown (value is string[] e.g. ["0"]) */}
                {(slide.type === 'pilihan' || slide.type === 'polling') && slide.responses.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {Object.entries(
                      slide.responses.reduce<Record<number, number>>((acc, r) => {
                        const v = r.value as string[];
                        const optIdx = Number(Array.isArray(v) ? v[0] : undefined);
                        if (!isNaN(optIdx)) acc[optIdx] = (acc[optIdx] ?? 0) + 1;
                        return acc;
                      }, {}),
                    ).map(([optIdx, count]) => (
                      <div key={optIdx} className="flex items-center gap-2 text-xs">
                        <span className="font-bold w-6">{String.fromCharCode(65 + Number(optIdx))}</span>
                        <div className="flex-1 bg-foreground/10 rounded h-3 overflow-hidden">
                          <div
                            className="h-full bg-main"
                            style={{ width: `${(count / slide.responseCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Awan kata: value is string[] of words */}
                {slide.type === 'awan' && slide.responses.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {slide.responses.flatMap((r) => {
                      const v = r.value as string[];
                      return Array.isArray(v) ? v : [];
                    }).map((w, i) => (
                      <span key={i} className="px-2 py-0.5 bg-cyan-100 border border-cyan-400 rounded text-xs">{w}</span>
                    ))}
                  </div>
                )}

                {/* Q&A: show questions */}
                {slide.type === 'tanya' && slide.questions.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {slide.questions.map((q, i) => (
                      <div key={i} className="text-xs border border-border rounded p-2">
                        <p>{q.text}</p>
                        {q.visible && <span className="text-orange-600 font-medium">Ditampilkan</span>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Quiz scores */}
          {session.quizScores.length > 0 && (
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Skor Kuis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-foreground/60">{session.quizScores.length} jawaban tercatat</p>
                <div className="mt-2 text-xs">
                  {Array.from(new Set(session.quizScores.map((s) => s.ownerLabel))).slice(0, 10).map((ownerLabel) => {
                    const scores = session.quizScores.filter((s) => s.ownerLabel === ownerLabel);
                    const total = scores.reduce((s, a) => s + a.score, 0);
                    const correct = scores.filter((s) => s.isCorrect).length;
                    return (
                      <div key={ownerLabel} className="flex justify-between py-0.5 border-b border-border/30">
                        <span className="truncate max-w-[60%]">{ownerLabel ?? '—'}</span>
                        <span>{correct}/{scores.length} benar · {total} poin</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlideEditor — canvas (C2) + form per slide type
// ---------------------------------------------------------------------------

function SlideEditor({
  slide,
  index,
  total,
  onChange,
  onDelete,
}: {
  slide: Slide;
  index: number;
  total: number;
  onChange: (patch: Partial<Slide>) => void;
  onDelete: () => void;
}) {
  // Last-focused materi text field; drives the formatting toolbar in the header row.
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
      {/* Header: 704px, just wide enough for the longest type label + "Slide NN / NN" on one row; centered above the wider canvas + panel. */}
      <div className="mx-auto w-full max-w-[44rem]">
        <SlideEditorHeader
          slide={slide}
          index={index}
          total={total}
          activeEditor={activeEditor}
          onChange={onChange}
          onDelete={onDelete}
        />
      </div>

      {/* Same structure for every type: 16:9 canvas (content) left, settings panel right. */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] gap-6 pt-6 pb-1">
        {/* Canvas column scrolls on its own if the canvas outgrows the space; pr/pb leave room for the shadow. */}
        <div className="flex min-h-0 flex-col overflow-y-auto pr-1 pb-1">
          <div className="my-auto">
            {slide.type === 'materi' ? (
              <MateriCanvas
                slide={slide}
                onChange={onChange}
                onEditorFocus={setActiveEditor}
                onEditorBlur={(e) => setActiveEditor((cur) => (cur === e ? null : cur))}
              />
            ) : (
              <SlideCanvas slide={slide} onChange={onChange} />
            )}
          </div>
        </div>

        <SettingsPanel>
          <SlideSettings slide={slide} onChange={onChange} />
        </SettingsPanel>
      </div>
    </div>
  );
}

/** Type-specific settings shown in the right-hand panel. */
function SlideSettings({
  slide,
  onChange,
}: {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
}) {
  switch (slide.type) {
    case 'materi':
      return <MateriImageSettings slide={slide} onChange={onChange} />;
    case 'pilihan':
    case 'polling':
      return <OptionsEditor slide={slide} onChange={onChange} />;
    case 'awan':
      return (
        <PanelNote>
          Peserta mengirim maksimal tiga frasa, masing-masing maksimal 40 karakter. Frasa yang sama
          digabung; ukurannya mengikuti frekuensi.
        </PanelNote>
      );
    case 'tanya':
      return (
        <PanelNote>
          Peserta mengirim pertanyaan (maksimal 300 karakter). Anda memilih pertanyaan yang ditampilkan
          di proyektor saat sesi.
        </PanelNote>
      );
    case 'kelompok':
      return (
        <div className="flex flex-col gap-2">
          <Label htmlFor="slide-groups">Jumlah kelompok default</Label>
          <NumberStepper
            id="slide-groups"
            value={slide.groups}
            min={2}
            max={20}
            onChange={(groups) => onChange({ groups })}
            decrementLabel="Kurangi kelompok"
            incrementLabel="Tambah kelompok"
          />
          <PanelNote icon={<AlertCircleIcon className="mt-0.5 size-4 shrink-0" />}>
            Atur 2–20 kelompok. Bisa diubah lagi saat sesi sebelum dibagikan.
          </PanelNote>
        </div>
      );
    case 'pancing':
      return (
        <div className="flex flex-col gap-4">
          <PanelNote>Ubah judul langsung di kanvas, misalnya pertanyaan yang akan dijawab peserta terpilih.</PanelNote>
          <section className="flex flex-col gap-2">
            <Label>Cara kerja saat sesi</Label>
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-foreground/80">
              <li>Tekan <strong>Pancing!</strong> untuk memilih satu peserta yang terhubung secara acak.</li>
              <li>Proyektor menampilkan animasi kolam ikan, lalu nama peserta yang tertangkap.</li>
              <li>Pilih <strong>Pancing Lagi</strong> untuk memilih ulang, atau <strong>Hapus Peserta</strong> agar ia tidak terpilih lagi di slide ini.</li>
            </ol>
          </section>
        </div>
      );
    case 'kuis':
      return <QuizEditor slide={slide} onChange={onChange} />;
  }
}

/** Materi panel: image slots for the current layout, with remove. Upload/replace happens on the canvas. */
function MateriImageSettings({
  slide,
  onChange,
}: {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
}) {
  const layout = slide.layout ?? 'teks';
  const slots =
    layout === 'teks'
      ? []
      : layout === 'teks-gambar'
        ? [{ key: 'image' as const, label: 'Gambar 1', url: slide.image }]
        : [
          { key: 'image' as const, label: 'Gambar 1', url: slide.image },
          { key: 'image2' as const, label: 'Gambar 2', url: slide.image2 ?? '' },
        ];

  if (slots.length === 0) {
    return <PanelNote>Pilih layout bergambar di bilah atas untuk menambahkan gambar.</PanelNote>;
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-foreground/60">
        Seret gambar ke slot atau klik untuk memilih (maks 5 MB). Semua gambar tampil 4:3 dan dipotong agar
        penuh, apa pun ukuran aslinya.
      </p>
      {slots.map(({ key, label, url }, i) => (
        <div key={key} className="flex flex-col gap-1.5">
          <Label>{label}</Label>
          <ImageSlot
            url={url}
            label={label}
            testId={`panel-image-${i}`}
            onUpload={(u) => onChange({ [key]: u })}
            onRemove={() => onChange({ [key]: '' })}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlideEditorHeader — row of separate pills: type, slide number, text format,
// layout (materi only) and delete
// ---------------------------------------------------------------------------

function SlideEditorHeader({
  slide,
  index,
  total,
  activeEditor,
  onChange,
  onDelete,
}: {
  slide: Slide;
  index: number;
  total: number;
  activeEditor: Editor | null;
  onChange: (patch: Partial<Slide>) => void;
  onDelete: () => void;
}) {
  const isMateri = slide.type === 'materi';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`${pillBase} bg-secondary-background px-4 text-sm font-semibold tabular-nums`}
        aria-label={`Slide ${index + 1} dari ${total}`}
      >
        {/* Invisible widest value sizes the pill; the real one sits centered on top, so 9 → 10 doesn't resize it. */}
        <span className="grid justify-items-center [&>*]:col-start-1 [&>*]:row-start-1">
          <span className="invisible" aria-hidden="true">Slide {total} / {total}</span>
          <span>Slide {index + 1} / {total}</span>
        </span>
      </span>
      <span className={`${pillBase} px-4 text-sm font-bold ${kindColors[slide.type]}`}>
        {labels[slide.type]}
      </span>
      {/* Fixed-width controls pinned right so they sit in the same spot on every slide type. */}
      <div className="ml-auto flex items-center gap-2">
        <RichTextToolbar
          editor={isMateri ? activeEditor : null}
          unavailableHint={isMateri ? undefined : 'Format teks hanya tersedia untuk slide Materi'}
        />
        <UnavailableHint hint={isMateri ? undefined : 'Layout hanya tersedia untuk slide Materi'}>
          <LayoutPicker
            value={slide.layout}
            disabled={!isMateri}
            onChange={(layout) => onChange({ layout })}
          />
        </UnavailableHint>
        <Tooltip disableHoverablePopup>
          <TooltipTrigger
            render={
              <Button
                variant="neutral"
                size="icon"
                aria-label="Hapus slide"
                onClick={onDelete}
                className={`rounded-full ${dangerButtonClass}`}
                data-testid="slide-editor-delete"
              />
            }
          >
            <Trash2Icon className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="pointer-events-none">Hapus slide</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LayoutPicker — materi layout toggle, compact icons for the editor header row
// ---------------------------------------------------------------------------

type MateriLayout = 'teks' | 'teks-gambar' | 'dua-gambar-lr' | 'dua-gambar-tb';

const layoutOptions: { value: MateriLayout; label: string }[] = [
  { value: 'teks', label: 'Teks' },
  { value: 'teks-gambar', label: 'Teks + Gambar' },
  { value: 'dua-gambar-lr', label: 'Dua Gambar (Sejajar)' },
  { value: 'dua-gambar-tb', label: 'Dua Gambar (Bertumpuk)' },
];

/** Mini diagram of a layout: lines are text, filled blocks are images. */
function LayoutGlyph({ layout }: { layout: MateriLayout }) {
  const line = (x1: number, x2: number, y: number) => (
    <line x1={x1} x2={x2} y1={y} y2={y} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
  );
  const img = (x: number, y: number, w: number, h: number) => (
    <rect x={x} y={y} width={w} height={h} rx={1} fill="currentColor" />
  );
  return (
    <svg viewBox="0 0 20 14" className="w-5 h-3.5" aria-hidden="true">
      {layout === 'teks' && <>{line(2, 18, 3)}{line(2, 15, 7)}{line(2, 12, 11)}</>}
      {layout === 'teks-gambar' && <>{line(2, 10, 4)}{line(2, 9, 7.5)}{line(2, 8, 11)}{img(12, 2, 6, 10)}</>}
      {layout === 'dua-gambar-lr' && <>{line(2, 18, 2.5)}{img(2, 5.5, 7.5, 7)}{img(10.5, 5.5, 7.5, 7)}</>}
      {layout === 'dua-gambar-tb' && <>{line(2, 9, 4)}{line(2, 8, 7.5)}{line(2, 7, 11)}{img(11, 1, 7, 5.5)}{img(11, 7.5, 7, 5.5)}</>}
    </svg>
  );
}

function LayoutPicker({
  value,
  disabled = false,
  onChange,
}: {
  value: Slide['layout'];
  disabled?: boolean;
  onChange: (layout: MateriLayout) => void;
}) {
  // Legacy 'dua-gambar' is the side-by-side layout.
  const current = !value ? 'teks' : value === 'dua-gambar' ? 'dua-gambar-lr' : value;
  return (
    <div role="group" aria-label="Layout" className={pillGroup}>
      {layoutOptions.map(({ value: l, label }) => {
        const active = !disabled && current === l;
        return (
          <Tooltip key={l} disableHoverablePopup>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={label}
                  aria-pressed={active}
                  disabled={disabled}
                  onClick={() => onChange(l)}
                  className={pillButton(active)}
                  data-testid={`layout-${l}`}
                />
              }
            >
              <LayoutGlyph layout={l} />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="pointer-events-none">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MateriCanvas — C2: WYSIWYG for materi slides
// ---------------------------------------------------------------------------

function MateriCanvas({
  slide,
  onChange,
  onEditorFocus,
  onEditorBlur,
}: {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
  onEditorFocus: (editor: Editor) => void;
  onEditorBlur: (editor: Editor) => void;
}) {
  const layout = slide.layout ?? 'teks';

  return (
    <div className={`${canvasFrameClass} flex`}>
      <div
        className={`p-8 flex-1 flex gap-4 ${layout === 'teks' ? 'flex-col' : 'flex-row items-start'
          }`}
      >
        {/* Text column */}
        <div className={`flex flex-col gap-3 ${layout !== 'teks' ? 'flex-1' : 'w-full'}`}>
          <RichTextField
            kind="title"
            doc={slide.titleDoc}
            text={slide.title}
            placeholder="Judul slide…"
            testId="canvas-title"
            className="text-2xl font-bold text-foreground outline-none border-b-2 border-transparent focus:border-main pb-1 min-h-[2.5rem]"
            onChange={(titleDoc, title) => onChange({ titleDoc, title })}
            onFocus={onEditorFocus}
            onBlur={onEditorBlur}
          />
          <RichTextField
            kind="body"
            doc={slide.bodyDoc}
            text={slide.body ?? ''}
            placeholder="Deskripsi…"
            testId="canvas-body"
            className="text-base text-foreground/70 outline-none min-h-[5rem]"
            onChange={(bodyDoc, body) => onChange({ bodyDoc, body })}
            onFocus={onEditorFocus}
            onBlur={onEditorBlur}
          />
        </div>

        {/* Image slots */}
        {(layout === 'teks-gambar' ||
          layout === 'dua-gambar' ||
          layout === 'dua-gambar-lr' ||
          layout === 'dua-gambar-tb') && (
            <div
              className={`flex gap-3 ${layout === 'dua-gambar' || layout === 'dua-gambar-lr'
                ? 'flex-row flex-1'
                : layout === 'dua-gambar-tb'
                  ? 'flex-col w-40 shrink-0'
                  : 'w-40 shrink-0'
                }`}
            >
              <ImageSlot
                url={slide.image}
                label="Gambar 1"
                testId="image-slot-0"
                className="min-w-0 flex-1"
                onUpload={(url) => onChange({ image: url })}
              />
              {(layout === 'dua-gambar' ||
                layout === 'dua-gambar-lr' ||
                layout === 'dua-gambar-tb') && (
                  <ImageSlot
                    url={slide.image2 ?? ''}
                    label="Gambar 2"
                    testId="image-slot-1"
                    className="min-w-0 flex-1"
                    onUpload={(url) => onChange({ image2: url })}
                  />
                )}
            </div>
          )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImageSlot — C1: drop or pick an image (canvas slot and Pengaturan panel)
// ---------------------------------------------------------------------------

/** Matches the backend limit on POST /api/assets. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Hover hint (our Tooltip) for an icon button; the child element becomes the trigger. */
function HintTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip disableHoverablePopup>
      <TooltipTrigger render={children} />
      <TooltipContent side="bottom" className="pointer-events-none">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Red text, fills red on hover — destructive icon buttons (delete slide, option, image). */
const dangerButtonClass = 'text-[var(--error-fg)] hover:bg-[var(--error)] hover:text-black';

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/assets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? `Upload gagal (${res.status})`);
  }
  return ((await res.json()) as { url: string }).url;
}

/**
 * Drop an image onto the slot or click to pick one. Always shown at 4:3 and
 * cropped to fill, so every image keeps the same shape whatever its original size.
 */
function ImageSlot({
  url,
  label,
  onUpload,
  onRemove,
  testId,
  className = '',
}: {
  url: string;
  label: string;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  testId?: string;
  className?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.add({ title: 'Bukan file gambar', description: 'Pilih file JPG, PNG, GIF, atau WebP.', type: 'error' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.add({ title: 'Gambar terlalu besar', description: 'Ukuran maksimal 5 MB.', type: 'error' });
      return;
    }
    setUploading(true);
    try {
      onUpload(await uploadImage(file));
    } catch (err) {
      toast.add({ title: 'Upload gagal', description: String(err), type: 'error' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`relative ${className}`}>
      <Dropzone
        onFile={handleFile}
        accept="image/*"
        disabled={uploading}
        aria-label={url ? `Ganti ${label}` : `Upload ${label}`}
        data-testid={testId}
        className={`group/slot relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-base border-2 border-dashed border-border bg-secondary-background transition-colors hover:border-main data-[dragging]:border-solid data-[dragging]:border-main data-[dragging]:bg-main/10 ${uploading ? 'opacity-60' : ''}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 px-2 text-center text-foreground/60">
            <ImageIcon className="size-6" />
            <span className="text-xs font-semibold">{uploading ? 'Mengunggah…' : label}</span>
            {!uploading && <span className="text-[11px] leading-tight">Seret ke sini atau klik</span>}
          </div>
        )}
        {url && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover/slot:bg-black/30 group-hover/slot:opacity-100 group-data-[dragging]/slot:bg-black/30 group-data-[dragging]/slot:opacity-100">
            <span className="rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
              {uploading ? 'Mengunggah…' : 'Seret atau klik untuk ganti'}
            </span>
          </div>
        )}
      </Dropzone>
      {/* Sibling of the dropzone so clicking it doesn't open the file picker. */}
      {url && onRemove && (
        <HintTooltip label="Hapus gambar">
          <Button
            variant="neutral"
            size="icon"
            aria-label={`Hapus ${label}`}
            onClick={onRemove}
            className={`absolute right-2 top-2 rounded-full ${dangerButtonClass}`}
          >
            <Trash2Icon />
          </Button>
        </HintTooltip>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OptionsEditor — pilihan / polling options
// ---------------------------------------------------------------------------

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

type OptionsPatch = { options: string[]; correct: number[] };

/**
 * Option rows + full-width "Tambah Opsi", shared by Pilihan ganda, Polling and quiz questions.
 * Pass `correct` to show the correct-answer checkboxes; omit it (polling) to hide them.
 */
function OptionList({
  options,
  correct,
  onChange,
}: {
  options: string[];
  correct?: number[];
  onChange: (patch: OptionsPatch) => void;
}) {
  const marks = correct ?? [];

  function update(i: number, value: string) {
    onChange({ options: options.map((o, idx) => (idx === i ? value : o)), correct: marks });
  }

  function add() {
    if (options.length >= MAX_OPTIONS) return;
    onChange({ options: [...options, ''], correct: marks });
  }

  function remove(i: number) {
    if (options.length <= MIN_OPTIONS) return;
    const next = options.filter((_, idx) => idx !== i);
    onChange({
      options: next,
      // Drop the removed option's mark, then shift later marks down by one.
      correct: marks.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)),
    });
  }

  function toggle(i: number) {
    onChange({
      options,
      correct: marks.includes(i) ? marks.filter((c) => c !== i) : [...marks, i].sort((a, b) => a - b),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => {
        const letter = String.fromCharCode(65 + i);
        const isCorrect = marks.includes(i);
        return (
          <div key={i} className="flex items-center gap-2">
            {correct && (
              <button
                type="button"
                aria-label={`Tandai opsi ${letter} sebagai jawaban benar`}
                aria-pressed={isCorrect}
                onClick={() => toggle(i)}
                className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded border-2 ${isCorrect ? 'border-black bg-[#34D399]' : 'border-border'}`}
              >
                {isCorrect && <CheckIcon className="size-3" />}
              </button>
            )}
            <span className="w-4 shrink-0 text-center text-sm font-bold">{letter}</span>
            <Input
              value={opt}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Opsi ${letter}`}
              aria-label={`Opsi ${letter}`}
            />
            <HintTooltip label="Hapus opsi ini">
              <Button
                variant="neutral"
                size="icon"
                aria-label={`Hapus opsi ${letter}`}
                onClick={() => remove(i)}
                disabled={options.length <= MIN_OPTIONS}
                className={`shrink-0 ${dangerButtonClass}`}
              >
                <Trash2Icon />
              </Button>
            </HintTooltip>
          </div>
        );
      })}
      <Button variant="neutral" onClick={add} disabled={options.length >= MAX_OPTIONS} className="mt-1 w-full">
        <PlusIcon />
        {options.length >= MAX_OPTIONS ? 'Maksimal 6 opsi' : 'Tambah Opsi'}
      </Button>
    </div>
  );
}

function OptionsEditor({
  slide,
  onChange,
}: {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
}) {
  const isPilihan = slide.type === 'pilihan';

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <Label>Opsi jawaban</Label>
          <span className="text-xs tabular-nums text-foreground/60">
            {slide.options.length} / {MAX_OPTIONS}
          </span>
        </div>
        {isPilihan && (
          <p className="-mt-1 text-xs text-foreground/60">Centang opsi yang benar (boleh lebih dari satu).</p>
        )}
        <OptionList
          options={slide.options}
          correct={isPilihan ? slide.correct : undefined}
          onChange={(patch) => onChange(isPilihan ? patch : { options: patch.options })}
        />
      </section>

      {isPilihan && (
        <section className="flex flex-col gap-2 border-t-2 border-border/15 pt-4">
          <Label htmlFor="explanation">
            Penjelasan jawaban benar <span className="font-normal text-foreground/60">(opsional)</span>
          </Label>
          <Textarea
            id="explanation"
            value={slide.explanation}
            onChange={(e) => onChange({ explanation: e.target.value })}
            rows={3}
            placeholder="Mengapa opsi ini benar? Ditampilkan setelah jawaban dibuka."
          />
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuizEditor — S13
// ---------------------------------------------------------------------------

const QUIZ_MIN_DURATION = 10;
const QUIZ_MAX_DURATION = 120;

function QuizEditor({
  slide,
  onChange,
}: {
  slide: Slide;
  onChange: (patch: Partial<Slide>) => void;
}) {
  const questions = slide.quizQuestions ?? [];

  function addQuestion() {
    const q: QuizQuestion = { id: uid(), title: '', options: ['', ''], correct: [] };
    onChange({ quizQuestions: [...questions, q] });
  }

  function updateQuestion(qi: number, patch: Partial<QuizQuestion>) {
    onChange({ quizQuestions: questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)) });
  }

  function removeQuestion(qi: number) {
    onChange({ quizQuestions: questions.filter((_, i) => i !== qi) });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <Label htmlFor="quiz-duration">Durasi per soal</Label>
        <div className="flex items-center gap-2">
          <NumberStepper
            id="quiz-duration"
            value={slide.duration ?? QUIZ_DEFAULT_DURATION}
            min={QUIZ_MIN_DURATION}
            max={QUIZ_MAX_DURATION}
            step={5}
            onChange={(duration) => onChange({ duration })}
            decrementLabel="Kurangi 5 detik"
            incrementLabel="Tambah 5 detik"
          />
          <span className="text-sm text-foreground/70">detik</span>
        </div>
        <PanelNote icon={<AlertCircleIcon className="mt-0.5 size-4 shrink-0" />}>
          10–120 detik, sama untuk setiap soal. Poin dihitung dari ketepatan dan kecepatan.
        </PanelNote>
      </section>

      <section className="flex flex-col gap-3 border-t-2 border-border/15 pt-4">
        <div className="flex items-baseline justify-between">
          <Label>Soal</Label>
          <span className="text-xs tabular-nums text-foreground/60">{questions.length} soal</span>
        </div>

        {questions.length === 0 && (
          <PanelNote icon={<AlertCircleIcon className="mt-0.5 size-4 shrink-0" />}>
            Tambahkan minimal satu soal sebelum memulai sesi.
          </PanelNote>
        )}

        {questions.map((q, qi) => (
          <div key={q.id} className="flex flex-col gap-3 rounded-base border-2 border-border bg-white p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Soal {qi + 1}</span>
              <HintTooltip label="Hapus soal ini">
                <Button
                  variant="neutral"
                  size="icon"
                  aria-label={`Hapus soal ${qi + 1}`}
                  onClick={() => removeQuestion(qi)}
                  className={dangerButtonClass}
                >
                  <Trash2Icon />
                </Button>
              </HintTooltip>
            </div>
            <Textarea
              value={q.title}
              onChange={(e) => updateQuestion(qi, { title: e.target.value })}
              placeholder="Teks pertanyaan…"
              aria-label={`Pertanyaan soal ${qi + 1}`}
              rows={2}
            />
            <p className="-mb-1 text-xs text-foreground/60">Centang jawaban benar.</p>
            <OptionList
              options={q.options}
              correct={q.correct}
              onChange={(patch) => updateQuestion(qi, patch)}
            />
          </div>
        ))}

        <Button onClick={addQuestion} className="w-full">
          <PlusIcon />
          Tambah Soal
        </Button>
      </section>
    </div>
  );
}
