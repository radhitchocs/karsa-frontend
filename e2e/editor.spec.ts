/**
 * Editor E2E tests: C3 (Slide Baru popover), C5 (three-dot menu), C4 (drag-and-drop).
 *
 * Requires:
 *   - backend on http://localhost:3101
 *   - frontend on http://localhost:3102 (production build)
 *
 * Screenshots saved to e2e/screenshots/.
 */

import { test as base, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { installHydrationGuard } from './test-utils';

const test = base.extend<Record<never, never>>({
  page: async ({ page }, use) => {
    const checkHydration = installHydrationGuard(page);
    await use(page);
    checkHydration();
  },
});

const API = 'http://localhost:3101';
const SCREENSHOTS = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

const RUN_ID = Date.now();
const EMAIL = `editor-${RUN_ID}@test.karsa`;
const PASS = 'Test1234!';

let presenterToken = '';

async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiPut<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function screenshot(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`), fullPage: false });
}

test.beforeAll(async () => {
  await apiPost('/api/auth/register', { email: EMAIL, password: PASS });
  const login = await apiPost<{ accessToken: string }>('/api/auth/login', { email: EMAIL, password: PASS });
  presenterToken = login.accessToken;
});

async function createEditorPresentation(): Promise<string> {
  const p = await apiPost<{ id: string }>('/api/presentations', { title: 'Editor E2E Test' }, presenterToken);
  await apiPut(`/api/presentations/${p.id}/slides`, {
    slides: [
      {
        id: 'ed-materi-1', type: 'materi', title: 'Slide Materi',
        body: '', options: [], correct: [], explanation: '', image: '', groups: 2,
      },
      {
        id: 'ed-pilihan-1', type: 'pilihan', title: 'Slide Pilihan',
        body: '', options: ['A', 'B'], correct: [0], explanation: '', image: '', groups: 2,
      },
      {
        id: 'ed-kuis-1', type: 'kuis', title: 'Slide Kuis',
        body: '', options: [], correct: [], explanation: '', image: '', groups: 2,
        duration: 30,
        quizQuestions: [{ id: 'ed-qq-1', title: 'Q1?', options: ['X', 'Y'], correct: [0] }],
      },
    ],
  }, presenterToken);
  return p.id;
}

async function loginAndGotoEditor(page: import('@playwright/test').Page, presId: string) {
  await page.goto(`/presentations/${presId}/edit`);
  await page.evaluate((tok: string) => { sessionStorage.setItem('karsa_token', tok); }, presenterToken);
  await page.reload();
  await page.waitForSelector('[data-testid="add-slide-btn"]', { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// C3: "Slide Baru" popover
// ---------------------------------------------------------------------------

test('C3 — Slide Baru popover opens and choosing a type adds the slide', async ({ page }) => {
  test.setTimeout(60_000);
  const presId = await createEditorPresentation();
  await loginAndGotoEditor(page, presId);

  // Count initial slides
  const initialCount = await page.locator('[data-testid^="slide-title-"]').count();
  expect(initialCount).toBe(3);

  // Click "Slide Baru" → popover opens
  await page.click('[data-testid="add-slide-btn"]');
  await page.waitForSelector('[data-testid="add-slide-popover"]', { timeout: 5_000 });
  await screenshot(page, 'c3-01-add-slide-popover-open');

  // Popover shows slide type buttons
  await expect(page.locator('[data-testid="add-slide-materi"]')).toBeVisible();
  await expect(page.locator('[data-testid="add-slide-polling"]')).toBeVisible();
  await expect(page.locator('[data-testid="add-slide-kuis"]')).toBeVisible();

  // Choose "Polling" type — popover closes automatically (controlled open state)
  await page.click('[data-testid="add-slide-polling"]');

  // Slide count should increase by 1 (polling inserted before kuis)
  await expect(page.locator('[data-testid^="slide-title-"]')).toHaveCount(4);

  // The new slide title should contain default label
  const titles = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  expect(titles.some((t) => t.includes('Polling') || t.includes('polling'))).toBe(true);

  // Kuis is still last
  expect(titles[titles.length - 1]).toContain('Kuis');
  await screenshot(page, 'c3-02-after-add-polling');
});

// ---------------------------------------------------------------------------
// C5: three-dot menu (Duplikat + Hapus with confirm)
// ---------------------------------------------------------------------------

test('C5 — three-dot menu: Duplikat inserts copy; Hapus asks confirmation then removes', async ({ page }) => {
  test.setTimeout(60_000);
  const presId = await createEditorPresentation();
  await loginAndGotoEditor(page, presId);

  const initialCount = await page.locator('[data-testid^="slide-title-"]').count();

  // Open menu for slide 0 (Materi)
  await page.click('[data-testid="slide-menu-0"]');
  await screenshot(page, 'c5-01-dropdown-menu-open');

  // Duplikat is visible
  await expect(page.locator('[data-testid="slide-duplicate-0"]')).toBeVisible();
  await expect(page.locator('[data-testid="slide-delete-0"]')).toBeVisible();

  // Click Duplikat
  await page.click('[data-testid="slide-duplicate-0"]');

  // Count should be +1
  await expect(page.locator('[data-testid^="slide-title-"]')).toHaveCount(initialCount + 1);

  // The duplicate has "(salinan)" in the title
  const titlesAfterDup = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  expect(titlesAfterDup.some((t) => t.includes('salinan'))).toBe(true);

  // Kuis still last
  expect(titlesAfterDup[titlesAfterDup.length - 1]).toContain('Kuis');
  await screenshot(page, 'c5-02-after-duplicate');

  const countAfterDup = await page.locator('[data-testid^="slide-title-"]').count();

  // Open menu for the duplicate (index 1 — inserted after slide 0) and delete it
  await page.click('[data-testid="slide-menu-1"]');
  await screenshot(page, 'c5-03-menu-before-delete');
  await page.click('[data-testid="slide-delete-1"]');

  // Confirm dialog appears
  await page.waitForSelector('text=Hapus slide?', { timeout: 5_000 });
  await screenshot(page, 'c5-04-delete-confirm-dialog');

  await expect(page.getByText('Tindakan ini tidak dapat dibatalkan.')).toBeVisible();

  // Confirm deletion
  await page.click('[data-testid="slide-delete-confirm"]');

  // Count returns to before duplication
  await expect(page.locator('[data-testid^="slide-title-"]')).toHaveCount(countAfterDup - 1);
  await screenshot(page, 'c5-05-after-delete');
});

// ---------------------------------------------------------------------------
// C4: drag-and-drop reorder
// ---------------------------------------------------------------------------

test('C4 — drag slide reorders; kuis stays last; order persists after save+reload', async ({ page }) => {
  test.setTimeout(90_000);
  const presId = await createEditorPresentation();
  await loginAndGotoEditor(page, presId);

  // Confirm initial order regardless of how many slides exist from previous test runs
  // Seed guaranteed: Materi at 0, Pilihan at 1, Kuis at last
  let titles = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  const initialMateriIdx = titles.findIndex((t) => t.includes('Slide Materi') && !t.includes('salinan'));
  const initialPilihanIdx = titles.findIndex((t) => t.includes('Slide Pilihan'));
  const initialKuisIdx = titles.findIndex((t) => t.includes('Slide Kuis'));
  expect(initialMateriIdx).toBe(0);
  expect(initialPilihanIdx).toBe(1);
  expect(initialKuisIdx).toBe(titles.length - 1);

  // Drag slide-item-1 (Pilihan) over slide-item-0 (Materi) → should swap
  await page.locator('[data-testid="slide-item-1"]').dragTo(
    page.locator('[data-testid="slide-item-0"]'),
  );

  // Assert exact new order: Pilihan at 0, Materi at 1, Kuis still last
  await expect(page.locator('[data-testid="slide-title-0"]')).toContainText('Pilihan');
  await expect(page.locator('[data-testid="slide-title-1"]')).toContainText('Materi');
  titles = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  expect(titles[titles.length - 1]).toContain('Kuis');
  await screenshot(page, 'c4-01-after-drag-reorder');

  // Kuis slide has draggable=false
  const kuisIdx = titles.length - 1;
  await expect(page.locator(`[data-testid="slide-item-${kuisIdx}"]`)).not.toHaveAttribute('draggable', 'true');
  await screenshot(page, 'c4-02-kuis-not-draggable');

  // Wait for autosave to complete (debounce 1.5s → saves → dirty=false → status='saved')
  await expect(page.locator('text=Tersimpan')).toBeVisible({ timeout: 10_000 });
  await screenshot(page, 'c4-03-saved');

  await loginAndGotoEditor(page, presId);
  await expect(page.locator('[data-testid="slide-title-0"]')).toContainText('Pilihan');
  await expect(page.locator('[data-testid="slide-title-1"]')).toContainText('Materi');
  const titlesAfterReload = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  expect(titlesAfterReload[titlesAfterReload.length - 1]).toContain('Kuis');
  await screenshot(page, 'c4-04-after-reload');
});

// ---------------------------------------------------------------------------
// Persistence: save and reload asserts order and duplicates persisted
// ---------------------------------------------------------------------------

test('C3+C5 — save then reload persists added and duplicated slides', async ({ page }) => {
  test.setTimeout(90_000);
  const presId = await createEditorPresentation();
  await loginAndGotoEditor(page, presId);

  const initialCount = await page.locator('[data-testid^="slide-title-"]').count();

  // Duplicate slide 0 (Slide Materi — valid title, no options required)
  await page.click('[data-testid="slide-menu-0"]');
  await page.click('[data-testid="slide-duplicate-0"]');
  await expect(page.locator('[data-testid^="slide-title-"]')).toHaveCount(initialCount + 1);

  const titlesBeforeSave = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  expect(titlesBeforeSave.some((t) => t.includes('salinan'))).toBe(true);
  // Kuis still last
  expect(titlesBeforeSave[titlesBeforeSave.length - 1]).toContain('Kuis');

  // Wait for autosave to complete
  await expect(page.locator('text=Tersimpan')).toBeVisible({ timeout: 10_000 });
  await screenshot(page, 'persist-01-saved');

  // Reload the editor — verifies server-side persistence
  await loginAndGotoEditor(page, presId);

  const titlesAfterReload = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  expect(titlesAfterReload).toHaveLength(initialCount + 1);
  expect(titlesAfterReload.some((t) => t.includes('salinan'))).toBe(true);
  expect(titlesAfterReload[titlesAfterReload.length - 1]).toContain('Kuis');
  await screenshot(page, 'persist-02-after-reload');
});

// ---------------------------------------------------------------------------
// Fix 4: C2 — canvas title/body edit persists after autosave+reload
// ---------------------------------------------------------------------------

test('C2 — canvas title/body plain-text edit persists after autosave+reload', async ({ page }) => {
  test.setTimeout(90_000);
  const presId = await createEditorPresentation();
  await loginAndGotoEditor(page, presId);

  // Find and select the Materi slide (may not be at index 0 after C4 reorder)
  const allTitles = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  const materiIdx = allTitles.findIndex((t) => t.includes('Materi') && !t.includes('salinan'));
  expect(materiIdx).toBeGreaterThanOrEqual(0);
  await page.click(`[data-testid="slide-item-${materiIdx}"]`);
  await screenshot(page, 'c2-01-materi-selected');

  // Edit title on canvas
  const titleEl = page.locator('[data-testid="canvas-title"]');
  await titleEl.click();
  // Select all and replace
  await page.keyboard.press('Control+a');
  await page.keyboard.type('Judul Canvas Test');

  // Trigger onChange (blur)
  await page.locator('[data-testid="canvas-body"]').click();
  await page.keyboard.type('Body Canvas Test');

  // Blur to commit
  await titleEl.click();

  await screenshot(page, 'c2-02-after-edit');

  // Wait for autosave
  await expect(page.locator('text=Tersimpan')).toBeVisible({ timeout: 10_000 });
  await screenshot(page, 'c2-03-saved');

  // Reload and check persistence — find slide by saved title
  await loginAndGotoEditor(page, presId);
  const titlesAfterReload = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  const savedIdx = titlesAfterReload.findIndex((t) => t.includes('Judul Canvas Test'));
  expect(savedIdx).toBeGreaterThanOrEqual(0);
  await page.click(`[data-testid="slide-item-${savedIdx}"]`);

  const titleContent = await page.locator('[data-testid="canvas-title"]').textContent({ timeout: 5_000 });
  const bodyContent = await page.locator('[data-testid="canvas-body"]').textContent({ timeout: 5_000 });
  expect(titleContent).toContain('Judul Canvas Test');
  expect(bodyContent).toContain('Body Canvas Test');
  await screenshot(page, 'c2-04-persisted');
});

// ---------------------------------------------------------------------------
// Fix 5: C1 — image upload scenarios
// ---------------------------------------------------------------------------

test('C1 — valid image upload shows on canvas; non-image → 422; >5 MB → 422', async ({ page }) => {
  test.setTimeout(90_000);
  const presId = await createEditorPresentation();
  await loginAndGotoEditor(page, presId);

  // Find and select the Materi slide
  const allTitles = await page.locator('[data-testid^="slide-title-"]').allTextContents();
  const materiIdx = allTitles.findIndex((t) => t.includes('Materi') && !t.includes('salinan'));
  expect(materiIdx).toBeGreaterThanOrEqual(0);
  await page.click(`[data-testid="slide-item-${materiIdx}"]`);

  // Click "Teks + Gambar" layout button
  await page.click('button:has-text("Teks + Gambar")');
  await page.waitForSelector('[data-testid="image-slot-0"]', { timeout: 5_000 });

  // --- valid image: 1x1 PNG ---
  // Minimal 1×1 transparent PNG (67 bytes)
  const validPng = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
    'hex',
  );
  await page.locator('[data-testid="image-slot-0"] input[type="file"]').setInputFiles({
    name: 'test.png',
    mimeType: 'image/png',
    buffer: validPng,
  });

  // Image renders on canvas
  await expect(page.locator('[data-testid="image-slot-0"] img')).toBeVisible({ timeout: 10_000 });
  await screenshot(page, 'c1-01-image-uploaded');

  // --- non-image file → upload error toast ---
  await page.locator('[data-testid="image-slot-0"] input[type="file"]').setInputFiles({
    name: 'virus.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('MZ'),
  });
  await expect(page.locator('text=Upload gagal')).toBeVisible({ timeout: 5_000 });
  await screenshot(page, 'c1-02-non-image-rejected');

  // --- >5 MB file → upload error toast ---
  const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 0); // 6 MB zeros
  await page.locator('[data-testid="image-slot-0"] input[type="file"]').setInputFiles({
    name: 'huge.png',
    mimeType: 'image/png',
    buffer: bigBuffer,
  });
  await expect(page.locator('text=Upload gagal')).toBeVisible({ timeout: 8_000 });
  await screenshot(page, 'c1-03-oversized-rejected');
});

// ---------------------------------------------------------------------------
// Fix 6: C6 — stale version triggers conflict message and Muat Ulang button
// ---------------------------------------------------------------------------

test('C6 — stale save shows "Konflik — muat ulang" and Muat Ulang button', async ({ page }) => {
  test.setTimeout(90_000);

  // Use a dedicated presentation so this test does not mutate the shared one
  const cp = await apiPost<{ id: string }>('/api/presentations', { title: 'Conflict Test' }, presenterToken);
  const conflictPresId = cp.id;
  await apiPut(`/api/presentations/${conflictPresId}/slides`, {
    slides: [
      {
        id: 'cf-materi-1', type: 'materi', title: 'Conflict Slide',
        body: '', options: [], correct: [], explanation: '', image: '', groups: 2,
      },
    ],
  }, presenterToken);

  // Navigate to this presentation's editor
  await page.goto(`/presentations/${conflictPresId}/edit`);
  await page.evaluate((tok: string) => { sessionStorage.setItem('karsa_token', tok); }, presenterToken);
  await page.reload();
  await page.waitForSelector('[data-testid="add-slide-btn"]', { timeout: 15_000 });

  // Make a small edit to ensure dirty state and establish lastSavedVersion
  await page.locator('input[placeholder="Judul presentasi"]').fill(`Conflict Test ${Date.now()}`);
  await expect(page.locator('text=Tersimpan')).toBeVisible({ timeout: 10_000 });

  // Bump server version from outside with the same slides (harmless content, increments version)
  await page.evaluate(async ({ api, token, pid }: { api: string; token: string; pid: string }) => {
    await fetch(`${api}/api/presentations/${pid}/slides`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        slides: [
          {
            id: 'cf-materi-1', type: 'materi', title: 'Conflict Slide',
            body: '', options: [], correct: [], explanation: '', image: '', groups: 2,
          },
        ],
      }),
    });
  }, { api: API, token: presenterToken, pid: conflictPresId });

  // Trigger another autosave — page's expectedVersion is now stale
  await page.locator('input[placeholder="Judul presentasi"]').fill(`Conflict Test 2 ${Date.now()}`);
  await expect(page.locator('text=Konflik — muat ulang')).toBeVisible({ timeout: 10_000 });

  await expect(page.locator('button:has-text("Muat Ulang")')).toBeVisible();
  await screenshot(page, 'c6-01-conflict-message');
});

// ---------------------------------------------------------------------------
// C6(b) — invalid quiz duration: sidebar shows error, Mulai Sesi shows toast
// ---------------------------------------------------------------------------

test('C6(b) — invalid quiz duration shows error in sidebar and Mulai Sesi shows toast', async ({ page }) => {
  test.setTimeout(60_000);

  // Create a presentation with an invalid quiz duration (130 > 120)
  const vp = await apiPost<{ id: string }>('/api/presentations', { title: 'Validation Test' }, presenterToken);
  const validPresId = vp.id;
  await apiPut(`/api/presentations/${validPresId}/slides`, {
    slides: [
      {
        id: 'v-kuis-1', type: 'kuis', title: 'Kuis Invalid',
        body: '', options: [], correct: [], explanation: '', image: '', groups: 2,
        duration: 130,
        quizQuestions: [{ id: 'v-qq-1', title: 'Q?', options: ['X', 'Y'], correct: [0] }],
      },
    ],
  }, presenterToken);

  // Open editor
  await page.goto(`/presentations/${validPresId}/edit`);
  await page.evaluate((tok: string) => { sessionStorage.setItem('karsa_token', tok); }, presenterToken);
  await page.reload();
  await page.waitForSelector('[data-testid="add-slide-btn"]', { timeout: 15_000 });

  // Validation error visible in sidebar
  await expect(page.locator('text=Durasi kuis harus antara 10–120 detik.')).toBeVisible({ timeout: 5_000 });
  await screenshot(page, 'c6b-01-validation-error-sidebar');

  // Mulai Sesi button is present and clickable (not disabled by validation errors)
  await expect(page.locator('[data-testid="mulai-sesi-btn"]')).toBeEnabled();

  // Click Mulai Sesi — should show toast with error reason, not navigate
  await page.click('[data-testid="mulai-sesi-btn"]');
  await expect(page.locator('text=Tidak dapat memulai sesi')).toBeVisible({ timeout: 5_000 });
  await screenshot(page, 'c6b-02-mulai-sesi-toast');

  // Still on editor page
  expect(page.url()).toContain(`/presentations/${validPresId}/edit`);
});
