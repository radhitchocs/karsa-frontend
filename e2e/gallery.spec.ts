/**
 * Gallery screenshot spec — PRD §17.
 *
 * Captures key screens of the real app in both light and dark OS emulation.
 * Because Karsa forces color-scheme: light, both emulations render the light
 * theme (verifying the fix is effective).
 *
 * Screenshots saved to e2e/screenshots/gallery/
 *
 * Requires: playwright.gallery.config.ts (port 3103, DEMO_MODE=true).
 * Run: pnpm test:e2e:gallery
 *
 * Note: editor screenshot requires the full e2e suite (backend).
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const GALLERY_DIR = path.join(__dirname, 'screenshots', 'gallery');

test.beforeAll(() => {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });
});

async function ss(page: Page, name: string) {
  return page.screenshot({
    path: path.join(GALLERY_DIR, `${name}.png`),
    fullPage: false,
  });
}

/** Navigate demo to presenter lobby with 6 participants. */
async function gotoPresenterLobby(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
  await page.waitForURL('**/presenter');
  await expect(page.getByText('6 peserta terhubung')).toBeVisible({ timeout: 10_000 });
}

/** Navigate demo to the first materi slide (presenter active). */
async function gotoPresenterActive(page: Page) {
  await gotoPresenterLobby(page);
  await page.getByRole('button', { name: 'Mulai Sesi' }).click();
  await expect(page.getByText('Ide hebat dimulai dari percakapan.').first()).toBeVisible({ timeout: 8_000 });
}

// ---------------------------------------------------------------------------
// 1. Projector join screen
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`01-projector-join-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoPresenterLobby(page);
    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Proyektor' }).click();
    await expect(page.getByText('Cara Bergabung')).toBeVisible({ timeout: 5_000 });
    await ss(page, `01-projector-join-${scheme}`);
  });
}

// ---------------------------------------------------------------------------
// 2. Projector bar chart — pilihan ganda with 4 options
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`02-projector-bar-chart-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoPresenterActive(page);
    await page.getByRole('button', { name: 'Berikutnya' }).click();
    await expect(page.getByText('Apa langkah pertama').first()).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
    await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
    await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();

    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Proyektor' }).click();
    // Wait for bar chart to render (animation uses 450ms transition)
    await page.locator('.w-full.select-none').waitFor({ state: 'visible', timeout: 5_000 });
    await ss(page, `02-projector-bar-chart-${scheme}`);
  });
}

// ---------------------------------------------------------------------------
// 3. Projector word cloud — awan kata
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`03-projector-word-cloud-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoPresenterActive(page);

    // Advance through slides: pilihan → polling → kelompok → materi → pilihan → awan
    await page.getByRole('button', { name: 'Berikutnya' }).click(); // slide 1 pilihan
    await expect(page.getByText('Apa langkah pertama').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
    await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();

    await page.getByRole('button', { name: 'Berikutnya' }).click(); // slide 2 polling
    await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
    await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();

    await page.getByRole('button', { name: 'Berikutnya' }).click(); // slide 3 kelompok
    await expect(page.getByText('Saatnya bertukar sudut pandang.').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Bagikan Kelompok' }).click();

    await page.getByRole('button', { name: 'Berikutnya' }).click(); // slide 4 materi
    await page.getByRole('button', { name: 'Berikutnya' }).click(); // slide 5 pilihan
    await expect(page.getByText('Apa yang membuat kolaborasi digital').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
    await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();

    await page.getByRole('button', { name: 'Berikutnya' }).click(); // slide 6 awan
    await expect(page.getByText('Tiga kata untuk ruang digital').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
    // Wait for words to appear in presenter word list
    await page.locator('[data-testid^="word-"]').first().waitFor({ timeout: 8_000 });
    await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
    await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();

    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Proyektor' }).click();
    // Wait for word cloud to render in projector (visible=true after reveal)
    await page.locator('[aria-label="Awan kata"] [role="listitem"]').first().waitFor({ timeout: 8_000 });
    await ss(page, `03-projector-word-cloud-${scheme}`);
  });
}

// ---------------------------------------------------------------------------
// 4. Presenter dashboard — active slide
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`04-presenter-dashboard-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoPresenterActive(page);
    await page.getByRole('button', { name: 'Berikutnya' }).click();
    await expect(page.getByText('Apa langkah pertama').first()).toBeVisible({ timeout: 5_000 });
    await ss(page, `04-presenter-dashboard-${scheme}`);
  });
}

// ---------------------------------------------------------------------------
// 5. Participant phone view (360 px)
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`05-participant-phone-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    // Navigate at desktop viewport first, then shrink for screenshot
    await gotoPresenterActive(page);
    await page.getByRole('button', { name: 'Berikutnya' }).click();
    await expect(page.getByText('Apa langkah pertama').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Alya' }).click();
    await expect(page.getByText('Apa langkah pertama').first()).toBeVisible({ timeout: 5_000 });
    // Resize to phone for the screenshot
    await page.setViewportSize({ width: 360, height: 800 });
    await ss(page, `05-participant-phone-${scheme}`);
  });
}

// ---------------------------------------------------------------------------
// 6. Presenter pilihan — activity open with responses
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`06-presenter-pilihan-open-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoPresenterActive(page);
    await page.getByRole('button', { name: 'Berikutnya' }).click();
    await expect(page.getByText('Apa langkah pertama').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
    await expect(page.getByText('Tutup Aktivitas')).toBeVisible({ timeout: 3_000 });
    await ss(page, `06-presenter-pilihan-open-${scheme}`);
  });
}

// ---------------------------------------------------------------------------
// 7. Participant pilihan correct & wrong — 360 px after reveal
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`07-participant-pilihan-correct-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoPresenterActive(page);
    await page.getByRole('button', { name: 'Berikutnya' }).click();
    await expect(page.getByText('Apa langkah pertama').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
    await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
    await page.locator('button:not([disabled]):has-text("Tampilkan Hasil")').waitFor({ timeout: 5_000 });
    // Toggle hideContent OFF so participants see correct answer
    await page.getByRole('button', { name: 'Konten peserta: Disembunyikan' }).click();
    await page.waitForSelector('button:has-text("Konten peserta: Ditampilkan")', { timeout: 5_000 });
    await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();
    // Switch to Alya — who answered correctly (A. "Memeriksa sumber informasi")
    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Alya' }).click();
    await page.waitForSelector('[aria-label="jawaban benar"]', { timeout: 8_000 });
    await page.setViewportSize({ width: 360, height: 800 });
    await ss(page, `07-participant-pilihan-correct-${scheme}`);
  });
}

/** Unlock kuis/tanya navigation: kelompok (index 3) blocks all slides past it until groups are assigned. */
async function bagikanKelompok(page: Page) {
  await page.locator('aside button').nth(3).click(); // slide 4 kelompok (index 3, not past division)
  await expect(page.getByRole('button', { name: 'Bagikan Kelompok' }).first()).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Bagikan Kelompok' }).click();
  await expect(page.getByText('Kelompok 1').first()).toBeVisible({ timeout: 5_000 });
}

// ---------------------------------------------------------------------------
// 8. Presenter quiz stats — after first question closes
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`08-presenter-quiz-stats-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoPresenterActive(page);
    await bagikanKelompok(page);

    // Navigate to kuis slide (last slide — engine allows after groups assigned)
    await page.locator('aside button').last().click();
    await expect(page.getByText('Buka Pertanyaan Pertama').first()).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: 'Buka Pertanyaan Pertama' }).click();
    await expect(page.getByText('Soal 1 /').first()).toBeVisible({ timeout: 10_000 });
    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Lewati' }).click();
    await expect(page.getByRole('button', { name: 'Soal Berikutnya' }).first()).toBeVisible({ timeout: 10_000 });
    await ss(page, `08-presenter-quiz-stats-${scheme}`);
  });
}

// ---------------------------------------------------------------------------
// 9. Participant quiz — 360 px phone view while question is open
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`09-participant-quiz-phone-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoPresenterActive(page);
    await bagikanKelompok(page);

    await page.locator('aside button').last().click();
    await expect(page.getByText('Buka Pertanyaan Pertama').first()).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: 'Buka Pertanyaan Pertama' }).click();
    await expect(page.getByText('Soal 1 /').first()).toBeVisible({ timeout: 10_000 });

    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Alya' }).click();
    await expect(page.getByText('Soal 1').first()).toBeVisible({ timeout: 5_000 });
    await page.setViewportSize({ width: 360, height: 800 });
    await ss(page, `09-participant-quiz-phone-${scheme}`);
  });
}

// ---------------------------------------------------------------------------
// 10. Projector leaderboard — after quiz finishes
// ---------------------------------------------------------------------------

for (const scheme of ['light', 'dark'] as const) {
  test(`10-projector-leaderboard-${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await gotoPresenterActive(page);
    await bagikanKelompok(page);

    await page.locator('aside button').last().click();
    await expect(page.getByText('Buka Pertanyaan Pertama').first()).toBeVisible({ timeout: 8_000 });

    await page.getByRole('button', { name: 'Buka Pertanyaan Pertama' }).click();

    const totalQuestions = 3;
    for (let i = 0; i < totalQuestions; i++) {
      await expect(page.getByText(`Soal ${i + 1} /`).first()).toBeVisible({ timeout: 10_000 });
      await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Lewati' }).click();
      if (i < totalQuestions - 1) {
        await expect(page.getByRole('button', { name: 'Soal Berikutnya →' }).first()).toBeVisible({ timeout: 10_000 });
        await page.getByRole('button', { name: 'Soal Berikutnya →' }).first().click();
      }
    }
    // After last question: "Selesaikan Kuis" → click → "Tampilkan Leaderboard"
    await expect(page.getByRole('button', { name: 'Selesaikan Kuis' }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Selesaikan Kuis' }).first().click();
    await expect(page.getByRole('button', { name: 'Tampilkan Leaderboard' }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Tampilkan Leaderboard' }).first().click();

    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Proyektor' }).click();
    await expect(page.getByText('Papan Peringkat').first()).toBeVisible({ timeout: 5_000 });
    await ss(page, `10-projector-leaderboard-${scheme}`);
  });
}
