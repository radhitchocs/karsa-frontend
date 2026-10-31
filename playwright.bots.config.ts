import path from 'path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Bots E2E config — runs bots.spec.ts with DEMO_MODE=true backend.
 * Usage: pnpm test:e2e:bots
 *
 * Backend on port 3103, frontend on port 3104.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/bots.spec.ts',
  timeout: 180_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3104',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'bots-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm start:prod',
      cwd: path.join(__dirname, '..', 'mockup-karsa-backend'),
      url: 'http://localhost:3103/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: {
        PRESENTER_GRACE_MS: '1500',
        DATABASE_URL:
          process.env['DATABASE_URL'] ??
          'postgresql://postgres:postgres@localhost:5432/karsa?schema=public',
        JWT_SECRET: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
        PORT: '3103',
        DEMO_MODE: 'true',
      },
    },
    {
      // Builds its own production bundle into .next-bots (API on port 3103) so
      // running this suite after test:e2e never requires a manual rebuild.
      command: 'pnpm build && pnpm start',
      url: 'http://localhost:3104',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_DIST_DIR: '.next-bots',
        NEXT_PUBLIC_API_URL: 'http://localhost:3103',
        PORT: '3104',
      },
    },
  ],
});
