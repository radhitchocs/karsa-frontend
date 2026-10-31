'use client';

import { MateriSlide } from '@/features/shared/MateriSlide';
import type { ParticipantView } from '@/contracts/views';

export function MateriView({ view }: { view: ParticipantView }) {
  const slide = view.activeSlide;
  return (
    <div className="min-h-[160px]">
      <MateriSlide
        title={slide.title}
        body={slide.body || undefined}
        titleDoc={slide.titleDoc}
        bodyDoc={slide.bodyDoc}
        image={slide.image || undefined}
        image2={slide.image2 || undefined}
        layout={slide.layout}
        variant="participant"
      />
    </div>
  );
}
