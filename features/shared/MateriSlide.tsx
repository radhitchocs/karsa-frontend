'use client';

import type { RichNode } from '@/domain/model';
import { RichText, richTextClass } from './rich-text';

type Layout =
  | 'teks'
  | 'teks-gambar'
  | 'dua-gambar'
  | 'dua-gambar-lr'
  | 'dua-gambar-tb';

type Props = {
  title: string;
  body?: string;
  titleDoc?: RichNode;
  bodyDoc?: RichNode;
  image?: string;
  image2?: string;
  layout?: Layout;
  variant?: 'projector' | 'presenter' | 'participant';
};

function normalizeLayout(
  layout?: Layout,
): 'teks' | 'teks-gambar' | 'dua-gambar-lr' | 'dua-gambar-tb' {
  if (!layout || layout === 'teks') return 'teks';
  if (layout === 'teks-gambar') return 'teks-gambar';
  if (layout === 'dua-gambar' || layout === 'dua-gambar-lr') return 'dua-gambar-lr';
  return 'dua-gambar-tb';
}

const imgBorderClass =
  'relative border-2 border-black rounded-base overflow-hidden shadow-[3px_3px_0_0_#000]';

export function MateriSlide({
  title,
  body,
  titleDoc,
  bodyDoc,
  image,
  image2,
  layout,
  variant = 'presenter',
}: Props) {
  const norm = normalizeLayout(layout);
  const isProjector = variant === 'projector';

  const titleClass = isProjector ? 'font-bold leading-tight' : 'text-xl font-bold leading-tight';
  const titleStyle = isProjector ? { fontSize: 'clamp(2rem, 3.5vw, 3.5rem)' } : {};
  const bodyClass = isProjector
    ? 'text-2xl text-foreground/70 leading-snug'
    : 'text-base text-foreground/70 leading-relaxed';

  const heading = (
    <h2 className={titleClass} style={titleStyle}>
      <RichText doc={titleDoc} fallback={title} kind="title" />
    </h2>
  );
  const text = (extra = '') =>
    body ? (
      <div className={`${bodyClass} ${richTextClass} ${extra}`}>
        <RichText doc={bodyDoc} fallback={body} kind="body" />
      </div>
    ) : null;

  if (norm === 'teks') {
    return (
      <div className="flex flex-col gap-4 h-full justify-center">
        {heading}
        {text()}
      </div>
    );
  }

  if (norm === 'teks-gambar') {
    return (
      <div className="flex gap-4 h-full items-center">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {heading}
          {text()}
        </div>
        {image && (
          <div className="w-2/5 shrink-0">
            <div className={`${imgBorderClass} aspect-[4/3]`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (norm === 'dua-gambar-lr') {
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="shrink-0">
          {heading}
          {text('mt-2')}
        </div>
        <div className="flex gap-4 flex-1 min-h-0">
          {image && (
            <div className={`${imgBorderClass} flex-1 min-h-0`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {image2 && (
            <div className={`${imgBorderClass} flex-1 min-h-0`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image2} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // dua-gambar-tb: text 50% / stacked images 50% — same proportions on all variants
  return (
    <div className="flex gap-4 h-full items-stretch">
      <div className="flex flex-col gap-3 flex-1 min-w-0 justify-center">
        {heading}
        {text()}
      </div>
      <div className="w-1/2 shrink-0 flex flex-col gap-3 min-h-0">
        {image && (
          <div className={`${imgBorderClass} flex-1 min-h-0`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {image2 && (
          <div className={`${imgBorderClass} flex-1 min-h-0`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image2} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
