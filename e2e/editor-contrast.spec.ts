/**
 * Editor + results axe color-contrast audit — PRD §17.6.
 *
 * Runs in the main e2e config (real backend, port 3100/3101).
 * Checks: editor materi canvas, quiz editor, slide-type popover,
 *         three-dot menu, results tab — both OS color-scheme emulations.
 * Saves gallery screenshots to e2e/screenshots/gallery/.
 *
 * Run as part of: pnpm test:e2e
 */

import { test as base, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';
import fs from 'fs';
import { installHydrationGuard } from './test-utils';

const GALLERY_DIR = path.join(__dirname, 'screenshots', 'gallery');
const API = 'http://localhost:3101';
const COLOR_SCHEMES = ['light', 'dark'] as const;

const test = base.extend<Record<never, never>>({
  page: async ({ page }, use) => {
    const checkHydration = installHydrationGuard(page);
    await use(page);
    checkHydration();
  },
});

let presenterToken = '';
let presId = '';
const RUN_ID = Date.now();
const EMAIL = `contrast-${RUN_ID}@test.karsa`;
const PASS = 'Test1234!';

async function apiPost<T>(urlPath: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API}${urlPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${urlPath} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiPut<T>(urlPath: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API}${urlPath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${urlPath} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

test.beforeAll(async () => {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });
  await apiPost('/api/auth/register', { email: EMAIL, password: PASS });
  const login = await apiPost<{ accessToken: string }>('/api/auth/login', { email: EMAIL, password: PASS });
  presenterToken = login.accessToken;
  const p = await apiPost<{ id: string }>('/api/presentations', { title: 'Contrast E2E' }, presenterToken);
  await apiPut(`/api/presentations/${p.id}/slides`, {
    slides: [
      {
        id: 'cx-materi-1', type: 'materi', title: 'Slide Materi',
        body: 'Ini adalah deskripsi slide materi untuk pengecekan kontras.',
        options: [], correct: [], explanation: '', image: '', groups: 2,
      },
      {
        id: 'cx-pilihan-1', type: 'pilihan', title: 'Slide Pilihan',
        body: '', options: ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'], correct: [1],
        explanation: '', image: '', groups: 2,
      },
      {
        id: 'cx-kuis-1', type: 'kuis', title: 'Slide Kuis',
        body: '', options: [], correct: [], explanation: '', image: '', groups: 2,
        duration: 30,
        quizQuestions: [{ id: 'cx-qq-1', title: 'Soal kontras 1?', options: ['Jawaban A', 'Jawaban B', 'Jawaban C'], correct: [0] }],
      },
    ],
  }, presenterToken);
  presId = p.id;
});

async function gotoEditor(page: Page) {
  await page.goto(`/presentations/${presId}/edit`);
  await page.evaluate((tok: string) => { sessionStorage.setItem('karsa_token', tok); }, presenterToken);
  await page.reload();
  await page.waitForSelector('[data-testid="add-slide-btn"]', { timeout: 15_000 });
}

async function axeContrast(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();
  return violations;
}

async function ss(page: Page, name: string) {
  return page.screenshot({ path: path.join(GALLERY_DIR, `${name}.png`), fullPage: false });
}

// ---------------------------------------------------------------------------
// Editor — materi canvas (default state, index 0 selected)
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`editor materi canvas — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoEditor(page);
    await expect(page.locator('[data-testid="slide-title-0"]')).toBeVisible();
    await ss(page, `06-editor-materi-${scheme}`);
    const v = await axeContrast(page);
    expect(v, `violations (${scheme}): ${JSON.stringify(v, null, 2)}`).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Editor — quiz slide editor (index 2)
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`editor quiz slide — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoEditor(page);
    await page.click('[data-testid="slide-item-2"]');
    await expect(page.getByRole('button', { name: 'Tambah Soal' })).toBeVisible({ timeout: 5_000 });
    await ss(page, `07-editor-quiz-${scheme}`);
    const v = await axeContrast(page);
    expect(v, `violations (${scheme}): ${JSON.stringify(v, null, 2)}`).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Editor — "Slide Baru" popover open
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`editor slide-type popover — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoEditor(page);
    await page.click('[data-testid="add-slide-btn"]');
    await page.waitForSelector('[data-testid="add-slide-popover"]', { timeout: 5_000 });
    await ss(page, `08-editor-popover-${scheme}`);
    const v = await axeContrast(page);
    expect(v, `violations (${scheme}): ${JSON.stringify(v, null, 2)}`).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Editor — three-dot (slide context menu) open
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`editor three-dot menu — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoEditor(page);
    await page.click('[data-testid="slide-menu-0"]');
    await expect(page.locator('[data-testid="slide-duplicate-0"]')).toBeVisible({ timeout: 5_000 });
    await ss(page, `09-editor-three-dot-${scheme}`);
    const v = await axeContrast(page);
    expect(v, `violations (${scheme}): ${JSON.stringify(v, null, 2)}`).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Editor — results tab (Hasil)
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`editor results tab — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoEditor(page);
    await page.click('button:has-text("Hasil")');
    // Wait for results tab content — empty state or session list
    await expect(
      page.locator('text=Belum ada sesi yang tersimpan.').or(page.locator('text=Sesi Lampau'))
    ).toBeVisible({ timeout: 8_000 });
    await ss(page, `10-results-tab-${scheme}`);
    const v = await axeContrast(page);
    expect(v, `violations (${scheme}): ${JSON.stringify(v, null, 2)}`).toHaveLength(0);
  });
}
