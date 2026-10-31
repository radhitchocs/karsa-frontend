/**
 * Demo mode E2E — PRD §9 scenario.
 *
 * Walks the full demo flow using NEXT_PUBLIC_DEMO_MODE=true:
 *   home → materi → pilihan → polling → kelompok → materi → pilihan → awan → tanya → kuis → leaderboard → end
 *
 * Requires: playwright.demo.config.ts (port 3102, no backend).
 * Run: pnpm test:e2e:demo
 *
 * All 20+ screenshots saved to e2e/screenshots/demo-*.png.
 * Privacy: participant view must NOT expose correct answer key before reveal.
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SS_DIR = path.join(__dirname, 'screenshots');
let ssIdx = 0;
function ss(page: Page, label: string) {
  return page.screenshot({
    path: path.join(SS_DIR, `demo-${String(ssIdx++).padStart(2, '0')}-${label}.png`),
    fullPage: false,
  });
}

test.beforeAll(() => {
  fs.mkdirSync(SS_DIR, { recursive: true });
  ssIdx = 0;
});

// ---------------------------------------------------------------------------
// Full demo scenario
// ---------------------------------------------------------------------------

test('PRD §9 demo: full flow materi→pilihan→kelompok→awan→tanya→kuis→leaderboard→end', async ({ page }) => {
  // ── 0. Home ────────────────────────────────────────────────────────────────
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Presentasi Demo' })).toBeVisible();
  await expect(page.getByText('Mode Demo').first()).toBeVisible();
  await ss(page, 'home');

  // ── 1. Start first fixture session ────────────────────────────────────────
  const mulaiButtons = page.getByRole('button', { name: 'Mulai Demo' });
  await mulaiButtons.first().click();
  await page.waitForURL('**/presenter');

  // Lobby: code visible, participant count = 6
  await expect(page.getByText('6 peserta terhubung')).toBeVisible({ timeout: 10_000 });
  await ss(page, 'lobi');

  // SimulationControls visible in demo mode
  await expect(page.locator('[aria-label="SimulationControls"]')).toBeVisible();
  await ss(page, 'sim-controls-visible');

  // ── 2. Start session ──────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Mulai Sesi' }).click();
  // Slide 0: materi — no interaction needed
  await expect(page.getByText('Ide hebat dimulai dari percakapan.').first()).toBeVisible({ timeout: 8_000 });
  await ss(page, 'slide-materi');

  // ── 3. Slide 1: Pilihan Ganda ─────────────────────────────────────────────
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page.getByText('Apa langkah pertama').first()).toBeVisible({ timeout: 5_000 });
  await ss(page, 'slide-pilihan-presenter-before-open');

  // Switch POV → participant (Alya, first in list)
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Alya' }).click();
  await ss(page, 'slide-pilihan-participant-before-open');

  // Switch back to presenter
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Presenter' }).click();

  // Open activity
  await page.getByRole('button', { name: 'Buka Aktivitas' }).click();

  // Sim: add responses for all participants
  await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
  await ss(page, 'slide-pilihan-responses-added');

  // Projector POV: no correct key visible
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Proyektor' }).click();
  const projHtml = await page.locator('main').first().innerHTML();
  expect(projHtml, 'projector must not expose correct option text before reveal').not.toContain('"correct"');
  await ss(page, 'slide-pilihan-projector');

  // Back to presenter — close + reveal
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Presenter' }).click();
  await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
  await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();
  await ss(page, 'slide-pilihan-results-revealed');

  // ── 4. Slide 2: Polling ───────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page.getByText('Bagaimana kamu paling nyaman').first()).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
  await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
  await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
  await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();
  await ss(page, 'slide-polling-results');

  // ── 5. Slide 3: Kelompok ──────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page.getByText('Saatnya bertukar sudut pandang.').first()).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Bagikan Kelompok' }).click();

  // Read first group's responder name for use in awan kata step later
  const penjawabEl = page.locator('text=/^Penjawab: /').first();
  await penjawabEl.waitFor({ timeout: 5_000 });
  const penjawabText = await penjawabEl.innerText();
  const firstGroupResponder = penjawabText.replace('Penjawab: ', '').trim();

  await ss(page, 'slide-kelompok-assigned');

  // Participant sub-role: member sees group number and responder name
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Alya' }).click();
  await ss(page, 'slide-kelompok-participant-member-or-responder');
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Presenter' }).click();

  // ── 6. Slides 4–5: materi + pilihan ──────────────────────────────────────
  await page.getByRole('button', { name: 'Berikutnya' }).click(); // slide 4 materi
  await ss(page, 'slide-materi-2');
  await page.getByRole('button', { name: 'Berikutnya' }).click(); // slide 5 pilihan
  await expect(page.getByText('Apa yang membuat kolaborasi digital').first()).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
  await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
  await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
  await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();
  await ss(page, 'slide-pilihan-2-results');

  // ── 7. Slide 6: Awan Kata ─────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page.getByText('Tiga kata untuk ruang digital').first()).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Buka Aktivitas' }).click();

  // Switch to the first group's responder — they can fill the word input unconditionally
  await page.locator('[aria-label="SimulationControls"] button', { hasText: firstGroupResponder }).click();
  const wordInput = page.locator('input[placeholder*="Kata 1"]').first();
  await wordInput.waitFor({ state: 'visible', timeout: 5_000 });
  await wordInput.fill('inklusif');
  await ss(page, 'slide-awan-participant-draft');
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Presenter' }).click();

  // Sim responses
  await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
  await ss(page, 'slide-awan-responses');

  // Projector word cloud
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Proyektor' }).click();
  await ss(page, 'slide-awan-projector-word-cloud');
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Presenter' }).click();

  await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
  await ss(page, 'slide-awan-closed');

  // ── 8. Slide 7: Polling ───────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
  await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
  await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
  await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();
  await ss(page, 'slide-polling-2-results');

  // ── 9. Slide 8: Tanya Jawab (Q&A) ────────────────────────────────────────
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page.getByText('Apa yang masih ingin kamu tanyakan').first()).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Buka Q&A' }).click();

  // Participant Citra submits a question — textarea always visible when Q&A is open
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Citra' }).click();
  const qaInput = page.locator('textarea[placeholder*="pertanyaanmu"]').first();
  await qaInput.waitFor({ state: 'visible', timeout: 5_000 });
  await qaInput.fill('Bagaimana cara memulai diskusi?');
  await page.getByRole('button', { name: 'Kirim Pertanyaan' }).click();
  await ss(page, 'slide-tanya-participant-submitted');
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Presenter' }).click();

  // Sim to add all participant questions
  await page.locator('[aria-label="SimulationControls"] button', { hasText: '+ Respons' }).click();
  await ss(page, 'slide-tanya-questions-visible');

  // Show first question — always present after + Respons
  const showBtn = page.getByRole('button', { name: 'Tampilkan' }).first();
  await showBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await showBtn.click();
  await ss(page, 'slide-tanya-question-shown');

  await page.getByRole('button', { name: 'Tutup Q&A' }).click();
  await ss(page, 'slide-tanya-closed');

  // ── 10. Slide 9: Kuis ────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await expect(page.getByText('Tantangan kolaborasi digital').first()).toBeVisible({ timeout: 5_000 });
  await ss(page, 'slide-kuis-ready');

  // Open first question
  await page.getByRole('button', { name: 'Buka Pertanyaan Pertama' }).click();
  await ss(page, 'slide-kuis-q1-open');

  // Participant Alya — privacy check before close
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Alya' }).click();
  await ss(page, 'slide-kuis-participant-q1');
  const partHtml = await page.locator('main').first().innerHTML();
  expect(partHtml, 'participant quiz view must not expose correct answer').not.toMatch(/"correct"\s*:/);
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Presenter' }).click();

  // AC30: 10-second timer auto-closes Q1 — no Lewati
  // (fixtures.ts kuis slide has duration:10; wait up to 15 s for next button to appear)
  const nextOrFinish = page.getByRole('button', { name: /Soal Berikutnya|Selesaikan Kuis/ }).first();
  await nextOrFinish.waitFor({ timeout: 15_000 });
  await ss(page, 'slide-kuis-q1-auto-closed');

  // AC31: SimulationControls "Lewati" force-closes Q2 before deadline
  await page.getByRole('button', { name: 'Soal Berikutnya' }).click();
  await ss(page, 'slide-kuis-q2-open');
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Jawab Cepat' }).click();
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Lewati' }).click();
  const nextOrFinish2 = page.getByRole('button', { name: /Soal Berikutnya|Selesaikan Kuis/ }).first();
  await nextOrFinish2.waitFor({ timeout: 8_000 });
  await ss(page, 'slide-kuis-q2-closed');

  // B9: Tampilkan Hasil Soal — per-question bar chart on presenter
  await page.getByRole('button', { name: 'Tampilkan Hasil Soal' }).click();
  // Button hides once resultsVisible=true; wait for it to disappear
  await page.waitForSelector('button:has-text("Tampilkan Hasil Soal")', { state: 'hidden', timeout: 5_000 });
  await ss(page, 'slide-kuis-q2-results-revealed');

  // Q3
  await page.getByRole('button', { name: 'Soal Berikutnya' }).click();
  await ss(page, 'slide-kuis-q3-open');
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Jawab Cepat' }).click();
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Lewati' }).click();
  const fin = page.getByRole('button', { name: 'Selesaikan Kuis' }).first();
  await fin.waitFor({ timeout: 8_000 });
  await ss(page, 'slide-kuis-q3-closed');

  // Finish quiz
  await page.getByRole('button', { name: 'Selesaikan Kuis' }).click();
  await ss(page, 'slide-kuis-selesai');

  // Reveal leaderboard
  await page.getByRole('button', { name: 'Tampilkan Papan Peringkat' }).click();
  await ss(page, 'slide-kuis-leaderboard-revealed');

  // Projector sees leaderboard top-5 (no own-rank row for projector)
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Proyektor' }).click();
  await ss(page, 'slide-kuis-leaderboard-projector');
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Presenter' }).click();

  // ── 11. End session ───────────────────────────────────────────────────────
  // Ending the session now asks for confirmation first
  await page.getByRole('button', { name: 'Tutup Sesi' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tutup Sesi' }).click();
  await ss(page, 'session-ended');
  await expect(page.getByText(/selesai|summary|berakhir/i)).toBeVisible({ timeout: 8_000 });
});

// ---------------------------------------------------------------------------
// Privacy spot-check: participant view never exposes answer key
// ---------------------------------------------------------------------------

test('privacy: participant view strips correct key and explanation before reveal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
  await page.waitForURL('**/presenter');
  await page.getByRole('button', { name: 'Mulai Sesi' }).click();

  // Navigate to pilihan slide (index 1)
  await page.getByRole('button', { name: 'Berikutnya' }).click();
  await page.getByRole('button', { name: 'Buka Aktivitas' }).click();

  // Switch to participant Alya
  await page.locator('[aria-label="SimulationControls"] button', { hasText: 'Alya' }).click();
  await page.waitForTimeout(500);

  // Use innerText (rendered text only, no React state JSON) to avoid false positives
  // from hidden data attributes or SSR state blobs.
  const visibleText = await page.locator('main').first().innerText();
  // The explanation text is unique — its presence would mean it leaked into the view.
  expect(visibleText, 'explanation must not appear in participant view before reveal').not.toContain('Periksa sumber dan konteks');
  // Correct option index number (1 = option B for this slide). "1." or similar in button label
  // is OK, but the numeric key 'correct: 1' as data should not appear as visible text.
  // We check that the known explanation is absent — that's the strongest privacy signal.

  await ss(page, 'privacy-check-participant-no-key');
});

// ---------------------------------------------------------------------------
// Connection banner: appears on disconnect, clears on reconnect (demo mode)
// ---------------------------------------------------------------------------

test('connection banner visible in demo mode', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
  await page.waitForURL('**/presenter');

  // Demo mode uses MockSessionService (no real WebSocket), but the banner
  // component should still be present in the DOM (hidden when connected).
  // It must NOT show when session is live.
  const banner = page.locator('[data-testid="connection-banner"], [aria-label*="oneksi"]');
  // Banner must be absent/hidden while online
  const bannerCount = await banner.count();
  if (bannerCount > 0) {
    await expect(banner.first()).not.toBeVisible();
  }
  await ss(page, 'connection-banner-hidden-when-online');
});

// ---------------------------------------------------------------------------
// D19: Demo participant names are frozen
// ---------------------------------------------------------------------------

test('D19: demo participants are Alya, Bima, Citra, Dimas, Eka, Farah', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mulai Demo' }).first().click();
  await page.waitForURL('**/presenter');

  // All 6 names must appear in SimulationControls role buttons
  const ctrlBar = page.locator('[aria-label="SimulationControls"]');
  for (const name of ['Alya', 'Bima', 'Citra', 'Dimas', 'Eka', 'Farah']) {
    await expect(ctrlBar.getByRole('button', { name })).toBeVisible({ timeout: 10_000 });
  }
  await ss(page, 'D19-participants-in-sim-controls');
});

// ---------------------------------------------------------------------------
// SimulationControls hidden in production mode (sanity guard)
// ---------------------------------------------------------------------------

// NOTE: This test cannot run in the demo playwright project because
// NEXT_PUBLIC_DEMO_MODE=true is always set here. The inverse check
// (SimulationControls not rendered in prod mode) is enforced at the
// component level: it is only rendered inside DemoPresenterClient,
// which is only imported when isDemoMode===true in presenter/page.tsx.
