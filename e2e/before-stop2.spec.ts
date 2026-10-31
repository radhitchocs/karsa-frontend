/**
 * Before-Stop-2 screenshot capture.
 * Documents current state of login, lobby, projector, editor materi, presenter pilihan,
 * projector bar chart, and /styleguide — these are the "before" screenshots for Stop 2 comparison.
 *
 * Run against demo server on port 3103 (pnpm test:e2e:gallery config → port 3103 DEMO_MODE=true).
 * Also captures /styleguide from standard server on port 3100.
 */
import { test, expect } from '@playwright/test';
import { join } from 'path';
import { mkdirSync } from 'fs';

const OUT = join(__dirname, 'screenshots', 'before-stop2');
mkdirSync(OUT, { recursive: true });

const snap = async (page: import('@playwright/test').Page, name: string) => {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
};

test.use({ viewport: { width: 1280, height: 800 } });

test('before-stop2: styleguide desktop', async ({ page }) => {
  await page.goto('http://localhost:3100/styleguide');
  await page.waitForTimeout(800);
  await snap(page, '00-styleguide-desktop');
});

test('before-stop2: styleguide phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3100/styleguide');
  await page.waitForTimeout(800);
  await snap(page, '01-styleguide-phone');
  await ctx.close();
});

test('before-stop2: login desktop', async ({ page }) => {
  await page.goto('/login');
  await page.waitForTimeout(500);
  await snap(page, '02-login-desktop');
});

test('before-stop2: presenter lobby + projector join', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const presenter = await ctx.newPage();
  await presenter.goto('/');
  await presenter.waitForTimeout(500);
  await snap(presenter, '03-home-desktop');

  // Start demo session
  await presenter.click('button:has-text("Mulai Demo")');
  await presenter.waitForTimeout(1500);
  await snap(presenter, '04-presenter-lobby-desktop');

  const url = presenter.url();
  const sessionId = url.match(/\/session\/([^/]+)/)?.[1];
  if (!sessionId) { await ctx.close(); return; }

  // Projector join
  const projector = await ctx.newPage();
  await projector.goto(`/session/${sessionId}/projector`);
  await projector.waitForTimeout(800);
  await snap(projector, '05-projector-join-desktop');

  // Advance to active slide (click Mulai Sesi)
  await presenter.locator('button:has-text("Mulai Sesi")').first().click();
  await presenter.waitForTimeout(1000);
  await snap(presenter, '06-presenter-active-first-slide');

  // Projector after session started
  await projector.reload();
  await projector.waitForTimeout(800);
  await snap(projector, '07-projector-active-desktop');

  // Try to navigate to a pilihan slide
  try {
    const slideItems = presenter.locator('.rounded-base.border-2.text-xs');
    const count = await slideItems.count();
    for (let i = 0; i < count; i++) {
      const item = slideItems.nth(i);
      const style = await item.getAttribute('style') ?? '';
      if (style.includes('A78BFA') || style.includes('60A5FA')) {
        await item.click();
        await presenter.waitForTimeout(500);
        break;
      }
    }
  } catch { /* slide nav optional */ }
  await snap(presenter, '08-presenter-pilihan-desktop');

  // Projector bar chart — open polling slide and trigger results
  await projector.reload();
  await projector.waitForTimeout(600);
  await snap(projector, '09-projector-bar-chart-desktop');

  await ctx.close();
});

test('before-stop2: participant lobby phone', async ({ browser }) => {
  // Start a new demo session
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const presenter = await desktopCtx.newPage();
  await presenter.goto('/');
  await presenter.click('button:has-text("Mulai Demo")');
  await presenter.waitForTimeout(1500);
  const sessionId = presenter.url().match(/\/session\/([^/]+)/)?.[1];
  await desktopCtx.close();

  if (!sessionId) return;

  const phoneCtx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const phone = await phoneCtx.newPage();
  await phone.goto(`/session/${sessionId}/participant`);
  await phone.waitForTimeout(1000);
  await snap(phone, '10-participant-lobby-phone');
  await phoneCtx.close();
});
