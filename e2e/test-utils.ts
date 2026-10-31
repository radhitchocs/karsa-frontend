/**
 * Shared test utilities for e2e specs.
 *
 * - hydrationGuard: installs a pageerror listener that fails the test if a
 *   React hydration error is logged from any page.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export function installHydrationGuard(page: Page): () => void {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    if (err.message.includes('Hydration failed') || err.message.includes('hydration')) {
      errors.push(err.message);
    }
  });
  return () => {
    expect(errors, `hydration errors on page: ${errors.join(' | ')}`).toHaveLength(0);
  };
}
