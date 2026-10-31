'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MateriSlide } from '@/features/shared/MateriSlide';
import type { PresenterView } from './types';

export function MateriPanel({
  slide,
}: {
  slide: PresenterView['slides'][number];
}) {
  return (
    <Card>
      <CardContent className="pt-4 min-h-[180px]">
        <MateriSlide
          title={slide.title}
          body={slide.body || undefined}
          titleDoc={slide.titleDoc}
          bodyDoc={slide.bodyDoc}
          image={slide.image || undefined}
          image2={slide.image2 || undefined}
          layout={slide.layout}
          variant="presenter"
        />
      </CardContent>
    </Card>
  );
}
