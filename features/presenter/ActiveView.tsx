'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeOffIcon, MessageSquareIcon, UsersIcon } from 'lucide-react';
import { SLIDE_COLOR } from '@/lib/slide-colors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { labels } from '@/domain/model';
import { MateriPanel } from './MateriPanel';
import { InteractivePanel } from './InteractivePanel';
import { QAPanel } from './QAPanel';
import { GroupPanel } from './GroupPanel';
import { QuizPanel } from './QuizPanel';
import { PancingPanel } from './PancingPanel';
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
  const [qaOpen, setQaOpen] = useState(false);
  const activeSlide = view.slides[view.activeSlideIndex];
  const activity = activeSlide
    ? (view.activities[activeSlide.id] ?? { status: 'belum', visible: false, hiddenWords: [] })
    : null;
  const activityOpen = activity?.status === 'buka';
  const nextSlide = view.slides[view.activeSlideIndex + 1];
  const onlineCount = view.participants.filter((p) => p.online).length;

  // B8: find tanya slides for persistent Q&A panel
  const tanyaSlides = view.slides.filter((s) => s.type === 'tanya');

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
      <header className="border-b-2 border-border bg-secondary-background px-4 py-3 flex items-center gap-3 shrink-0">
        {/* B2: Back button */}
        <Button variant="neutral" size="sm" className="shrink-0 px-2" onClick={() => setShowBackConfirm(true)}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="font-bold flex-1 truncate min-w-0">{view.title}</h1>
      </header>

      {/* Paused banner */}
      {view.paused && (
        <div className="bg-yellow-50 border-b-2 border-yellow-300 px-4 py-2 text-sm text-yellow-800 font-medium shrink-0">
          Sesi dijeda — presenter terputus. Klik &ldquo;Lanjutkan Sesi&rdquo; untuk melanjutkan.
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* Slide navigator */}
        <aside className="w-48 border-r-2 border-border bg-secondary-background overflow-y-auto p-2 flex flex-col gap-1 shrink-0">
          {view.slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => !activityOpen && send({ type: 'slide.activate', slideIndex: i })}
              disabled={activityOpen && i !== view.activeSlideIndex}
              className={`relative text-left p-2 pl-[10px] overflow-hidden rounded-base border-2 text-xs transition-colors w-full ${
                i === view.activeSlideIndex
                  ? 'border-foreground shadow-[2px_2px_0_0_#000] font-semibold'
                  : activityOpen
                    ? 'border-transparent opacity-40 cursor-not-allowed'
                    : 'border-transparent hover:border-foreground/30'
              }`}
            >
              {/* Slide type color bar */}
              <span
                className="absolute left-0 inset-y-0 w-[4px]"
                style={{ backgroundColor: SLIDE_COLOR[s.type] }}
                aria-hidden="true"
              />
              <span className="text-foreground/60 mr-1">{i + 1}.</span>
              <span className="truncate">{s.title || labels[s.type]}</span>
            </button>
          ))}
        </aside>

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
            <p className="text-foreground/60">Pilih slide di kiri.</p>
          ) : activeSlide.type === 'kuis' ? (
            <QuizPanel view={view} send={send} />
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
              <GroupPanel view={view} slide={activeSlide} send={send} />
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
        <aside className="w-72 border-l-2 border-border bg-secondary-background overflow-y-auto p-4 flex flex-col gap-5 shrink-0">
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Sesi</h2>
            <div className="flex items-center justify-between">
              <Badge variant="default">{view.paused ? 'Dijeda' : 'Aktif'}</Badge>
              <span className="flex items-center gap-1 text-sm text-foreground/70">
                <UsersIcon className="size-4" />
                {onlineCount}/{view.participants.length} online
              </span>
            </div>
            {view.paused && (
              <Button size="sm" className="w-full" onClick={() => send({ type: 'session.resume' })}>
                Lanjutkan Sesi
              </Button>
            )}
            {/* B10: hideContent toggle — label shows current state */}
            <Button
              variant="neutral"
              size="sm"
              className="w-full justify-start"
              onClick={() => send({ type: 'session.toggleHideContent' })}
            >
              {view.hideContent ? (
                <><EyeOffIcon className="size-4 mr-1" />Konten peserta: Sembunyikan</>
              ) : (
                <><EyeIcon className="size-4 mr-1" />Konten peserta: Tampilkan</>
              )}
            </Button>
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
                onClick={() =>
                  send({ type: 'slide.activate', slideIndex: view.activeSlideIndex + 1 })
                }
              >
                Berikutnya
                <ChevronRightIcon className="size-4 ml-1" />
              </Button>
            </div>
            {activityOpen && (
              <p className="text-xs text-foreground/60">Tutup aktivitas dulu untuk pindah slide.</p>
            )}
          </section>

          <Button variant="neutral" size="sm" className="w-full mt-auto" onClick={() => send({ type: 'session.end' })}>
            Tutup Sesi
          </Button>
        </aside>
      </div>
    </main>
  );
}
