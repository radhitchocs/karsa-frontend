'use client';

import { DemoHomePage } from './DemoHomePage';
import { ProductionHomePage } from './ProductionHomePage';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export default function HomePage() {
  return isDemoMode ? <DemoHomePage /> : <ProductionHomePage />;
}
