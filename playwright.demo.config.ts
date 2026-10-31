import { defineConfig, devices } from '@playwright/test';

/**
 * Demo-mode playwright config.
 *
 * Runs only e2e/demo.spec.ts against a demo-mode frontend (no backend needed).
 * Usage: pnpm test:e2e:demo
 *
 * Frontend on port 3102 with NEXT_PUBLIC_DEMO_MODE=true.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/demo.spec.ts',
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3102',
    headless: true,
    screenshot: 'on',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'demo-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      // Builds its own production bundle into .next-demo (DEMO_MODE=true) so
      // running this suite after test:e2e never requires a manual rebuild.
      command: 'pnpm build && pnpm start',
      url: 'http://localhost:3102',
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_DIST_DIR: '.next-demo',
        NEXT_PUBLIC_DEMO_MODE: 'true',
        PORT: '3102',
      },
    },
  ],
});
