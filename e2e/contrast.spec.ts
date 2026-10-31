/**
 * Color-contrast accessibility audit — PRD §17.2.
 *
 * Checks each key screen with axe color-contrast rules in both light-mode
 * and dark-mode OS emulation. Because Karsa forces color-scheme: light, both
 * emulations must render the same light palette and produce zero violations.
 *
 * Requires: playwright.gallery.config.ts (port 3103, DEMO_MODE=true).
 * Run: pnpm test:e2e:gallery
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const COLOR_SCHEMES = ['light', 'dark'] as const;

async function runAxeContrast(page: Page) {
  const results = await new AxeBuilder({ page })
    .withRules(['color-contrast'])
    .analyze();
  return results.violations;
}

// ---------------------------------------------------------------------------
// Projector lobby (join screen)
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`projector join screen — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
    await page.waitForURL('**/presenter');
    await expect(page.getByText('6 peserta terhubung')).toBeVisible({ timeout: 10_000 });

    // Switch to Proyektor POV
    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Proyektor' }).click();
    await expect(page.getByText('Cara Bergabung')).toBeVisible({ timeout: 5_000 });

    const violations = await runAxeContrast(page);
    expect(violations, `contrast violations (${scheme}): ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Presenter active — materi slide
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`presenter active (materi) — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
    await page.waitForURL('**/presenter');
    await expect(page.getByText('6 peserta terhubung')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Mulai Sesi' }).click();
    await expect(page.getByText('Ide hebat dimulai dari percakapan.').first()).toBeVisible({ timeout: 8_000 });

    const violations = await runAxeContrast(page);
    expect(violations, `contrast violations (${scheme}): ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Projector bar chart — pilihan ganda
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`projector bar chart — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
    await page.waitForURL('**/presenter');
    await expect(page.getByText('6 peserta terhubung')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Mulai Sesi' }).click();
    await expect(page.getByText('Ide hebat dimulai dari percakapan.').first()).toBeVisible({ timeout: 8_000 });
    await page.getByRole('button', { name: 'Berikutnya' }).click();
    await expect(page.getByText('Apa langkah pertama').first()).toBeVisible({ timeout: 5_000 });

    // Open activity, add responses, close, reveal
    await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
    await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
    await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();

    // Switch to projector to see bar chart
    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Proyektor' }).click();
    await expect(page.locator('canvas, [role="img"], .w-full.select-none').first()).toBeVisible({ timeout: 5_000 });

    const violations = await runAxeContrast(page);
    expect(violations, `contrast violations (${scheme}): ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Participant phone view (360 px viewport)
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`participant phone view — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    // Navigate at desktop viewport, then shrink for the axe check
    await page.goto('/');
    await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
    await page.waitForURL('**/presenter');
    await expect(page.getByText('6 peserta terhubung')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Mulai Sesi' }).click();
    await expect(page.getByText('Ide hebat dimulai dari percakapan.').first()).toBeVisible({ timeout: 8_000 });

    // Switch to Alya participant
    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Alya' }).click();
    await expect(page.getByText('Ide hebat dimulai dari percakapan.').first()).toBeVisible({ timeout: 5_000 });

    await page.setViewportSize({ width: 360, height: 800 });

    const violations = await runAxeContrast(page);
    expect(violations, `contrast violations (${scheme}): ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Participant Q&A panel — "Pertanyaan terkirim!" badge
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`participant Q&A panel — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
    await page.waitForURL('**/presenter');
    await expect(page.getByText('6 peserta terhubung')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Mulai Sesi' }).click();
    await expect(page.getByText('Ide hebat dimulai dari percakapan.').first()).toBeVisible({ timeout: 8_000 });

    // Must assign groups first — engine blocks navigation past kelompok (index 3) without groups
    await page.locator('aside button').nth(3).click(); // slide 4 kelompok
    await expect(page.getByRole('button', { name: 'Bagikan Kelompok' }).first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Bagikan Kelompok' }).click();
    await expect(page.getByText('Kelompok 1').first()).toBeVisible({ timeout: 5_000 });

    // Navigate to Q&A slide (slide 9, 0-indexed=8: "Apa yang masih ingin kamu tanyakan?")
    await page.locator('aside button').nth(8).click();
    await expect(page.getByText('Apa yang masih ingin kamu tanyakan').first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Buka Q&A' }).click();
    await expect(page.getByText('Tutup Q&A')).toBeVisible({ timeout: 5_000 });

    // Toggle hideContent OFF (default is ON) so "Pertanyaan terkirim!" badge shows instead of "Jawabanmu sudah masuk!"
    await page.getByRole('button', { name: /Konten peserta: Disembunyikan/ }).click();
    await expect(page.getByRole('button', { name: /Konten peserta: Ditampilkan/ }).first()).toBeVisible({ timeout: 3_000 });

    // Switch to Bima participant
    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Bima' }).click();
    await expect(page.getByText('Apa yang masih ingin kamu tanyakan').first()).toBeVisible({ timeout: 5_000 });
    // Submit a question
    await page.fill('textarea', 'Apa yang perlu disiapkan?');
    await page.getByRole('button', { name: 'Kirim Pertanyaan' }).click();
    await expect(page.getByText('Pertanyaan terkirim!').first()).toBeVisible({ timeout: 5_000 });

    await page.setViewportSize({ width: 360, height: 800 });

    const violations = await runAxeContrast(page);
    expect(violations, `contrast violations (${scheme}): ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });
}

// ---------------------------------------------------------------------------
// Presenter quiz stats panel — "N benar" / "N salah" after question closes
// ---------------------------------------------------------------------------

for (const scheme of COLOR_SCHEMES) {
  test(`presenter quiz stats panel — ${scheme} mode — zero contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
    await page.waitForURL('**/presenter');
    await expect(page.getByText('6 peserta terhubung')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Mulai Sesi' }).click();
    await expect(page.getByText('Ide hebat dimulai dari percakapan.').first()).toBeVisible({ timeout: 8_000 });

    // Must assign groups first — engine blocks navigation past kelompok (index 3) without groups
    await page.locator('aside button').nth(3).click(); // slide 4 kelompok
    await expect(page.getByRole('button', { name: 'Bagikan Kelompok' }).first()).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Bagikan Kelompok' }).click();
    await expect(page.getByText('Kelompok 1').first()).toBeVisible({ timeout: 5_000 });

    // Navigate to Kuis slide (last slide)
    await page.locator('aside button').last().click();
    await expect(page.getByText('Buka Pertanyaan Pertama').first()).toBeVisible({ timeout: 5_000 });

    // Start quiz and add simulated responses
    await page.getByRole('button', { name: 'Buka Pertanyaan Pertama' }).click();
    await expect(page.getByText('Soal 1 /').first()).toBeVisible({ timeout: 10_000 });
    // Force-close first question via Lewati so stats appear without 30s wait
    await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Lewati' }).click();
    await expect(page.getByRole('button', { name: 'Soal Berikutnya' }).first()).toBeVisible({ timeout: 10_000 });

    // At this point the first question auto-closed; "N benar" stat is visible
    const violations = await runAxeContrast(page);
    expect(violations, `contrast violations (${scheme}): ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });
}
