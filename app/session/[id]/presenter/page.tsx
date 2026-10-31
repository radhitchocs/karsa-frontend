import { Suspense } from 'react';
import { PresenterClient } from './PresenterClient';
import { DemoPresenterClient } from '@/features/simulation/DemoPresenterClient';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function PresenterPage() {
  return (
    <Suspense>
      {isDemoMode ? <DemoPresenterClient /> : <PresenterClient />}
    </Suspense>
  );
}
