'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLinkIcon, PowerIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeOffIcon, MessageSquareIcon, UsersIcon } from 'lucide-react';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import { AppHeader, HeaderTitle } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { labels } from '@/domain/model';
import { SlidePreview } from '@/features/shared/SlidePreview';
import { MateriPanel } from './MateriPanel';
import { InteractivePanel } from './InteractivePanel';
import { QAPanel } from './QAPanel';
import { GroupPanel } from './GroupPanel';
import { QuizPanel } from './QuizPanel';
import { PancingPanel } from './PancingPanel';
import { useProjector } from './useProjector';
import type { SendFn, PresenterView } from './types';

export function ActiveView({
  view,
  send,
}: {
  view: PresenterView;
  send: SendFn;
}) {
  const router = useRouter();
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const activeSlide = view.slides[view.activeSlideIndex];
  const activity = activeSlide
    ? (view.activities[activeSlide.id] ?? { status: 'belum', visible: false, hiddenWords: [] })
    : null;
  const activityOpen = activity?.status === 'buka';
  const nextSlide = view.slides[view.activeSlideIndex + 1];
  const onlineCount = view.participants.filter((p) => p.online).length;
  const projector = useProjector(view.sessionId);
  // "Konten peserta" only changes slides whose results/answers appear on participants' devices.
  const hideContentApplies = ['pilihan', 'polling', 'awan', 'tanya', 'kuis'].includes(activeSlide?.type ?? '');
  // Group slide not divided yet: the next slide is blocked until groups exist.
  const needsDivision = activeSlide?.type === 'kelompok' && view.groups.length === 0;
  const [groupAttention, setGroupAttention] = useState(0);

  // B8: find tanya slides for persistent Q&A panel
  const tanyaSlides = view.slides.filter((s) => s.type === 'tanya');

  // Keep the active slide visible in the filmstrip when navigating via Kembali/Berikutnya
  useEffect(() => {
    filmstripRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [view.activeSlideIndex]);

  return (
    <main className="flex flex-col h-screen">
      {/* B2: Back confirmation dialog */}
      {showBackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-secondary-background border-2 border-border rounded-base p-6 max-w-sm w-full mx-4 shadow-[4px_4px_0_0_var(--border)]">
            <p className="font-semibold mb-2">Kembali ke daftar presentasi?</p>
            <p className="text-sm text-foreground/60 mb-4">Sesi masih aktif dan peserta masih terhubung. Tutup sesi sebelum keluar.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="neutral" size="sm" onClick={() => setShowBackConfirm(false)}>Batal</Button>
              <Button size="sm" onClick={() => router.push('/')}>Keluar tetap</Button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <AppHeader
        onHome={() => setShowBackConfirm(true)}
        center={
          <HeaderTitle
            title={view.title}
            aside={<SessionStatusBadge paused={view.paused} />}
          />
        }
        right={
          <>
            <span className="flex items-center gap-1 whitespace-nowrap text-sm text-foreground/70">
              <UsersIcon className="size-4" />
              {onlineCount}/{view.participants.length} terhubung
            </span>
            <Tooltip disableHoverablePopup>
              <TooltipTrigger
                render={<Button variant="neutral" size="sm" onClick={projector.open} disabled={!projector.ready} />}
              >
                <ExternalLinkIcon />
                Buka Proyektor
              </TooltipTrigger>
              <TooltipContent side="bottom" className="pointer-events-none">Buka layar proyektor di tab baru</TooltipContent>
            </Tooltip>
          </>
        }
      />

      {/* Paused banner */}
      {view.paused && (
        <div className="bg-yellow-50 border-b-2 border-yellow-300 px-4 py-2 text-sm text-yellow-800 font-medium shrink-0">
          Sesi dijeda — presenter terputus. Klik &ldquo;Lanjutkan Sesi&rdquo; untuk melanjutkan.
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* B8: Persistent Q&A panel — shown when qaOpen and not on the tanya slide */}
        {qaOpen && tanyaSlides.length > 0 && (
          <div className="w-72 border-l-2 border-border bg-secondary-background overflow-y-auto p-4 shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-1">
                <MessageSquareIcon className="size-4" />
                Panel Q&A
              </h2>
              <button
                className="text-xs text-foreground/70 hover:text-foreground"
                onClick={() => setQaOpen(false)}
              >
                ✕
              </button>
            </div>
            {tanyaSlides.map((tanyaSlide) => {
              const tanyaActivity = view.activities[tanyaSlide.id] ?? {
                status: 'belum',
                visible: false,
                hiddenWords: [],
              };
              return (
                <QAPanel
                  key={tanyaSlide.id}
                  view={view}
                  slide={tanyaSlide}
                  activity={tanyaActivity}
                  send={send}
                />
              );
            })}
          </div>
        )}

        {/* Slide content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!activeSlide ? (
            <p className="text-foreground/60">Pilih slide di bawah.</p>
          ) : activeSlide.type === 'kuis' ? (
            <QuizPanel view={view} send={send} onRequestEnd={() => setShowEndConfirm(true)} />
          ) : activeSlide.type === 'materi' ? (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <div>
                <Badge className="mb-2">{labels[activeSlide.type]}</Badge>
                <h2 className="text-xl font-bold">{activeSlide.title}</h2>
              </div>
              <MateriPanel slide={activeSlide} />
            </div>
          ) : activeSlide.type === 'tanya' ? (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <div>
                <Badge className="mb-2">{labels[activeSlide.type]}</Badge>
                <h2 className="text-xl font-bold">{activeSlide.title}</h2>
                {activeSlide.body && (
                  <p className="text-foreground/70 mt-1">{activeSlide.body}</p>
                )}
              </div>
              <QAPanel view={view} slide={activeSlide} activity={activity} send={send} />
            </div>
          ) : activeSlide.type === 'kelompok' ? (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <div>
                <Badge className="mb-2">{labels[activeSlide.type]}</Badge>
                <h2 className="text-xl font-bold">{activeSlide.title}</h2>
              </div>
              <GroupPanel view={view} slide={activeSlide} send={send} attention={groupAttention} />
            </div>
          ) : activeSlide.type === 'pancing' ? (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <div>
                <Badge className="mb-2">{labels[activeSlide.type]}</Badge>
                <h2 className="text-xl font-bold">{activeSlide.title}</h2>
              </div>
              <PancingPanel view={view} slide={activeSlide} send={send} />
            </div>
          ) : (
            /* pilihan, polling, awan */
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <div>
                <Badge className="mb-2">{labels[activeSlide.type]}</Badge>
                <h2 className="text-xl font-bold">{activeSlide.title}</h2>
                {activeSlide.body && (
                  <p className="text-foreground/70 mt-1">{activeSlide.body}</p>
                )}
              </div>
              <InteractivePanel
                view={view}
                slide={activeSlide}
                activity={activity}
                send={send}
              />
            </div>
          )}
        </div>

        {/* Control sidebar: session state, slide position, navigation */}
        <section
          aria-label="Kontrol sesi"
          className="w-72 border-l-2 border-border bg-secondary-background overflow-y-auto p-4 flex flex-col gap-5 shrink-0"
        >
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Sesi</h2>
            {view.paused && (
              <Button size="sm" className="w-full" onClick={() => send({ type: 'session.resume' })}>
                Lanjutkan Sesi
              </Button>
            )}
            {/* B10: hideContent toggle — label shows current state. Only affects slides that show
                participant-side results, so it's disabled (with an explanation) everywhere else. */}
            {(() => {
              const toggle = (
                <Button
                  variant="neutral"
                  size="sm"
                  className="w-full justify-start"
                  disabled={!hideContentApplies}
                  onClick={() => send({ type: 'session.toggleHideContent' })}
                >
                  {view.hideContent ? (
                    <><EyeOffIcon className="size-4 mr-1" />Konten peserta: Sembunyikan</>
                  ) : (
                    <><EyeIcon className="size-4 mr-1" />Konten peserta: Tampilkan</>
                  )}
                </Button>
              );
              if (hideContentApplies) return toggle;
              return (
                <Tooltip disableHoverablePopup>
                  <TooltipTrigger render={<div className="cursor-default [&_button]:pointer-events-none" />}>
                    {toggle}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="pointer-events-none max-w-60">
                    Tidak tersedia untuk slide {labels[activeSlide.type]} — slide ini tidak menampilkan konten peserta.
                  </TooltipContent>
                </Tooltip>
              );
            })()}
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Tipe</h2>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Slide</h2>
            </div>
            <div className="flex items-center justify-between">
              <span
                className="self-end rounded-base border-2 border-border px-2 py-0.5 text-xs font-bold"
                style={{ backgroundColor: SLIDE_COLOR[activeSlide.type] }}
              >
                {labels[activeSlide.type]}
              </span>
              <p className="text-2xl font-black items-end tabular-nums">
                {view.activeSlideIndex + 1} / {view.slides.length}
              </p>
            </div>
            {activeSlide && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold line-clamp-2">{activeSlide.title || labels[activeSlide.type]}</p>
              </div>
            )}
            <p className="text-xs text-foreground/60 line-clamp-2">
              {nextSlide ? <>Selanjutnya: {nextSlide.title || labels[nextSlide.type]}</> : 'Slide terakhir'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="neutral"
                size="sm"
                disabled={view.activeSlideIndex === 0 || activityOpen}
                onClick={() =>
                  send({ type: 'slide.activate', slideIndex: view.activeSlideIndex - 1 })
                }
              >
                <ChevronLeftIcon className="size-4 mr-1" />
                Kembali
              </Button>
              <Button
                size="sm"
                disabled={view.activeSlideIndex >= view.slides.length - 1 || activityOpen}
                onClick={() => {
                  // Moving past an undivided group slide is blocked server-side; point at the fix instead.
                  if (needsDivision) return setGroupAttention((n) => n + 1);
                  send({ type: 'slide.activate', slideIndex: view.activeSlideIndex + 1 });
                }}
              >
                Berikutnya
                <ChevronRightIcon className="size-4 ml-1" />
              </Button>
            </div>
            {activityOpen && (
              <p className="text-xs text-foreground/60">Tutup aktivitas dulu untuk pindah slide.</p>
            )}
            {needsDivision && (
              <p className={`text-xs ${groupAttention > 0 ? 'font-semibold text-[var(--error-fg)]' : 'text-foreground/60'}`}>
                Bagikan kelompok dulu untuk lanjut ke slide berikutnya.
              </p>
            )}
          </section>

          {/* End session lives at the bottom of the panel (not the navbar) and asks first: it can't be undone. */}
          <Button
            variant="neutral"
            className="mt-auto w-full text-[var(--error-fg)] hover:bg-[var(--error)] hover:text-black"
            onClick={() => setShowEndConfirm(true)}
          >
            <PowerIcon />
            Tutup Sesi
          </Button>
        </section>
      </div>

      {/* Slide filmstrip — mirrors the editor filmstrip (EditClient), minus editing actions */}
      <aside aria-label="Daftar slide" className="shrink-0 border-t-2 border-border bg-secondary-background flex flex-col">
        <div className="flex items-stretch">
          <div ref={filmstripRef} className="relative flex-1 overflow-x-auto p-2 flex flex-row min-h-[104px]">
            {view.slides.map((s, i) => {
              const isActive = i === view.activeSlideIndex;
              const locked = activityOpen && !isActive;
              return (
                <Fragment key={s.id}>
                  <div className="w-4 shrink-0" aria-hidden="true" />
                  <Tooltip disableHoverablePopup>
                    <TooltipTrigger
                      render={<button
                        data-active={isActive}
                        onClick={() => !activityOpen && send({ type: 'slide.activate', slideIndex: i })}
                        disabled={locked}
                        className={`group relative w-40 aspect-video shrink-0 overflow-hidden rounded-base border-2 bg-white text-left select-none transition-colors ${isActive
                          ? 'border-foreground shadow-[2px_2px_0_0_#000] cursor-pointer'
                          : locked
                            ? 'border-foreground/20 opacity-40 cursor-not-allowed'
                            : 'border-foreground/20 hover:border-foreground/50 cursor-pointer'
                          }`}
                      >
                        <SlidePreview slide={s} />
                        <div className="absolute inset-x-1 top-1 flex items-start">
                          <span
                            className="min-w-0 flex-1 text-xs font-bold px-1.5 py-0.5 rounded-base border border-black leading-tight"
                            style={{ backgroundColor: SLIDE_COLOR[s.type] }}
                          >
                            <span className="block truncate">
                              {labels[s.type]}
                            </span>
                          </span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 border-t border-black/20 bg-black/10 px-1.5 py-0.5">
                          <span className="shrink-0 text-xs text-end font-bold text-foreground/70">
                            {i + 1}
                          </span>
                          <span className="flex-1 truncate text-xs text-foreground/70">
                            {'- '}{s.title || '(tanpa judul)'}
                          </span>
                        </div>
                      </button>
                      }
                    />
                    <TooltipContent side="top" className="pointer-events-none max-w-64">
                      <p className="font-bold">Slide {i + 1} - {labels[s.type]}</p>
                      <p className="truncate text-foreground/70">
                        {s.title || '(tanpa judul)'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Fragment>
              );
            })}
            {view.slides.length > 0 && <div className="w-4 shrink-0" aria-hidden="true" />}
          </div>
        </div>
      </aside>

      <Dialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup sesi?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/70">
            Sesi berakhir untuk semua peserta dan tidak bisa dilanjutkan. Hasilnya tetap tersimpan di tab Hasil.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="neutral" size="sm" />}>Batal</DialogClose>
            <Button
              size="sm"
              className="border-2 border-border bg-[var(--error)] text-black hover:bg-[var(--error)]/90"
              onClick={() => {
                setShowEndConfirm(false);
                send({ type: 'session.end' });
              }}
            >
              Tutup Sesi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

/** Live status next to the title: green "Aktif" with a pulsing dot, or yellow "Dijeda" when paused. */
function SessionStatusBadge({ paused }: { paused: boolean }) {
  const color = paused ? 'bg-[#FFD93D]' : 'bg-[#34D399]';
  return (
    <span
      className={`relative inline-flex items-center rounded-full border-2 border-border px-2.5 py-0.5 text-xs font-bold ${color}`}
    >
      {paused ? 'Dijeda' : 'Aktif'}
      <span className="absolute -right-1 -top-1 flex size-2.5" aria-hidden="true">
        {!paused && <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#34D399] opacity-75" />}
        <span className={`relative inline-flex size-2.5 rounded-full border border-border ${color}`} />
      </span>
    </span>
  );
}
