import path from 'path';
import { defineConfig, devices } from '@playwright/test';

/**
 * E2E setup notes (fresh clone):
 *   1. cd mockup-karsa-backend && pnpm install && pnpm db:push && pnpm db:seed && pnpm build
 *   2. cd mockup-karsa-frontend && pnpm install
 *   3. pnpm test:e2e
 *
 * Playwright starts both servers automatically on dedicated ports:
 *   Backend E2E:  http://localhost:3101  (PRESENTER_GRACE_MS=1500, reuseExistingServer: false)
 *   Frontend E2E: http://localhost:3102  (NEXT_PUBLIC_API_URL=http://localhost:3101)
 *
 * Dev servers (3000/3001) are never touched by E2E.
 */
export default defineConfig({
  testDir: './e2e',
  // demo.spec.ts → playwright.demo.config.ts; bots.spec.ts → playwright.bots.config.ts
  // gallery.spec.ts + contrast.spec.ts → playwright.gallery.config.ts (demo mode, no backend)
  testIgnore: ['**/demo.spec.ts', '**/bots.spec.ts', '**/gallery.spec.ts', '**/contrast.spec.ts', '**/ui-screenshots.spec.ts', '**/before-stop2.spec.ts'],
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3102',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Backend — dedicated E2E port 3101; always fresh; PRESENTER_GRACE_MS=1500 for pause test
      command: 'pnpm start:prod',
      cwd: path.join(__dirname, '..', 'mockup-karsa-backend'),
      url: 'http://localhost:3101/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        PRESENTER_GRACE_MS: '1500',
        DATABASE_URL:
          process.env['DATABASE_URL'] ??
          'postgresql://postgres:postgres@localhost:5432/karsa?schema=public',
        JWT_SECRET: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
        PORT: '3101',
      },
    },
    {
      // Frontend — dedicated E2E port 3102; points at E2E backend 3101.
      // Builds its own production bundle into .next-e2e-main so this suite is
      // self-contained and never conflicts with demo/bots/screenshots builds.
      command: 'pnpm build && pnpm start',
      url: 'http://localhost:3102',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_DIST_DIR: '.next-e2e-main',
        NEXT_PUBLIC_API_URL: 'http://localhost:3101',
        PORT: '3102',
      },
    },
  ],
});
