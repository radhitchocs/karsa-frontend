import { defineConfig, devices } from '@playwright/test';

/**
 * Gallery + contrast config.
 *
 * Runs gallery.spec.ts (screenshots) and contrast.spec.ts (axe color-contrast)
 * against a demo-mode frontend — no backend required.
 *
 * Usage: pnpm test:e2e:gallery
 *
 * Frontend on port 3103 with NEXT_PUBLIC_DEMO_MODE=true.
 * Screenshots → e2e/screenshots/gallery/
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/gallery.spec.ts', '**/contrast.spec.ts'],
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3103',
    headless: true,
    screenshot: 'on',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'gallery-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm build && pnpm start',
      url: 'http://localhost:3103',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_DIST_DIR: '.next-gallery',
        NEXT_PUBLIC_DEMO_MODE: 'true',
        PORT: '3103',
      },
    },
  ],
});
