import path from 'path';
import { defineConfig, devices } from '@playwright/test';

/**
 * UI screenshot capture config.
 *
 * Starts dedicated servers (ports 3104/3105) so it never conflicts with other
 * suites and is independent of .env.local (NEXT_PUBLIC_API_URL is overridden here).
 *
 * Usage: pnpm test:e2e:screenshots
 *
 * Output: e2e/screenshots/after-stop1-fix/*.png
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/ui-screenshots.spec.ts',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3104',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm start:prod',
      cwd: path.join(__dirname, '..', 'mockup-karsa-backend'),
      url: 'http://localhost:3105/health',
      reuseExistingServer: true,
      timeout: 30_000,
      env: {
        DATABASE_URL:
          process.env['DATABASE_URL'] ??
          'postgresql://postgres:postgres@localhost:5432/karsa?schema=public',
        JWT_SECRET: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
        PORT: '3105',
      },
    },
    {
      command: 'pnpm build && pnpm start',
      url: 'http://localhost:3104',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_DIST_DIR: '.next-screenshots',
        NEXT_PUBLIC_API_URL: 'http://localhost:3105',
        PORT: '3104',
      },
    },
  ],
});
