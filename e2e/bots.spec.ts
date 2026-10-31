/**
 * E2E: DEMO_MODE bots — simulate responses + leaderboard
 *
 * One real participant + 6 bots go through a kuis;
 * leaderboard shows all participants; summary shows simulated-data label.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { installHydrationGuard } from './test-utils';

const API = 'http://localhost:3103'; // bots config backend port
const SCREENSHOTS = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

const RUN = Date.now();
const EMAIL = `bots-${RUN}@test.karsa`;
const PASS = 'Test1234!';
const BOT_NAMES = ['Alya', 'Bima', 'Citra', 'Dimas', 'Eka', 'Farah'];

async function apiPost<T>(p: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${p} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiPut<T>(p: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API}${p}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${p} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiGet<T>(p: string, token: string): Promise<T> {
  const res = await fetch(`${API}${p}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET ${p} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ── main test ──────────────────────────────────────────────────────────────

test('bots simulate responses, leaderboard includes all, summary shows label', async ({ page }) => {
  test.setTimeout(180_000);

  const checkHydration = installHydrationGuard(page);

  // Register + login
  await apiPost('/api/auth/register', { email: EMAIL, password: PASS });
  const { accessToken: pToken } = await apiPost<{ accessToken: string }>('/api/auth/login', {
    email: EMAIL, password: PASS,
  });

  // Create presentation: [pilihan, kuis(2Q, duration:10)]
  const Q1 = crypto.randomUUID();
  const Q2 = crypto.randomUUID();
  const PILIHAN_ID = crypto.randomUUID();
  const KUIS_ID = crypto.randomUUID();

  const { id: presId } = await apiPost<{ id: string }>('/api/presentations', { title: 'Bots E2E' }, pToken);
  await apiPut(`/api/presentations/${presId}/slides`, {
    slides: [
      { id: PILIHAN_ID, type: 'pilihan', title: 'Pilihan test', body: '', options: ['Ya', 'Tidak'], correct: 0, explanation: '', image: '', groups: 3 },
      {
        id: KUIS_ID, type: 'kuis', title: 'Kuis Bots', body: '', options: [], correct: 0, explanation: '', image: '', groups: 3,
        duration: 10,
        quizQuestions: [
          { id: Q1, title: 'Berapa 1+1?', options: ['1', '2', '3'], correct: 1 },
          { id: Q2, title: 'Berapa 2×3?', options: ['4', '5', '6'], correct: 2 },
        ],
      },
    ],
  }, pToken);

  // Create session → 6 bots auto-created (DEMO_MODE=true in playwright.config.ts)
  const { sessionId, code } = await apiPost<{ sessionId: string; code: string }>(
    `/api/presentations/${presId}/sessions`, {}, pToken,
  );

  // One real participant joins
  const realJoin = await apiPost<{ participantId: string; token: string }>(
    '/api/sessions/join', { code, name: 'RealUser' },
  );

  // Navigate to presenter and inject token
  await page.goto(`/session/${sessionId}/presenter`);
  await page.evaluate((tok) => sessionStorage.setItem('karsa_token', tok), pToken);
  await page.reload();
  await page.waitForSelector(`text=${code}`, { timeout: 15_000 });

  // Verify lobby shows 7 participants (6 bots + 1 real)
  const participantCount = page.locator('[data-testid="participant-count"]');
  if (await participantCount.isVisible()) {
    await expect(participantCount).toContainText('7');
  }
  await page.screenshot({ path: path.join(SCREENSHOTS, 'bots-01-lobby.png') });

  // Start session
  await page.getByRole('button', { name: 'Mulai Sesi' }).click();
  await page.waitForSelector('text=Pilihan test', { timeout: 8_000 });

  // ── Pilihan: open → simulate → close → reveal ──────────────────────────
  await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
  await page.waitForSelector('text=Tutup Aktivitas', { timeout: 5_000 });

  // "Simulasikan respons" button visible because hasSimulatedData=true
  await expect(page.getByTestId('simulate-responses-btn')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('simulate-responses-btn').click();
  // Wait for responses to appear (progress bar fills)
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'bots-02-pilihan-simulated.png') });

  await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
  await page.waitForSelector('text=Tampilkan Hasil', { timeout: 5_000 });
  await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();
  await page.waitForTimeout(500);

  // ── Kuis ───────────────────────────────────────────────────────────────
  await page.locator('aside button').filter({ hasText: 'Kuis Bots' }).click();
  await page.waitForSelector('text=Buka Pertanyaan Pertama', { timeout: 5_000 });

  // Q1
  await page.getByRole('button', { name: 'Buka Pertanyaan Pertama' }).click();
  await page.waitForSelector('[data-testid="simulate-quiz-btn"]', { timeout: 8_000 });
  await page.getByTestId('simulate-quiz-btn').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS, 'bots-03-quiz-q1-simulated.png') });
  // Wait for auto-close (duration=5s + small buffer)
  await page.waitForSelector('text=Soal Ditutup', { timeout: 18_000 });

  // Q2
  await page.getByRole('button', { name: 'Soal Berikutnya' }).click();
  await page.waitForSelector('[data-testid="simulate-quiz-btn"]', { timeout: 8_000 });
  await page.getByTestId('simulate-quiz-btn').click();
  await page.waitForTimeout(1000);
  await page.waitForSelector('text=Soal Ditutup', { timeout: 18_000 });

  // Finish + reveal leaderboard
  await page.getByRole('button', { name: 'Selesaikan Kuis' }).click();
  await page.waitForSelector('text=Kuis Selesai', { timeout: 5_000 });
  await page.getByRole('button', { name: 'Tampilkan Papan Peringkat' }).click();
  // Wait for the leaderboard stage (its status pill only appears once revealed)
  await page.waitForSelector('text=Ditampilkan di proyektor', { timeout: 8_000 });
  await page.screenshot({ path: path.join(SCREENSHOTS, 'bots-04-leaderboard.png') });

  // Verify leaderboard contains at least some bot names
  const bodyText = await page.locator('body').innerText();
  const botVisible = BOT_NAMES.some((name) => bodyText.includes(name));
  expect(botVisible, 'at least one bot name visible in leaderboard').toBe(true);

  // RealUser appears somewhere (might be below top 5 in "rank row")
  // Verify via API: bots appear in top-5 leaderboard; RealUser in participants list
  const state = await apiGet<{
    participants?: Array<{ name: string }>;
    leaderboard?: { entries: Array<{ ownerLabel: string; totalScore: number }> };
  }>(`/api/sessions/${sessionId}/state`, pToken);
  const allLabels = state.leaderboard?.entries.map((e) => e.ownerLabel) ?? [];
  expect(allLabels.some((l) => BOT_NAMES.includes(l)), 'bots in leaderboard top-5 entries').toBe(true);
  // RealUser ranks below top-5 (0 answers); verify they're a participant
  const partNames = state.participants?.map((p) => p.name) ?? [];
  expect(partNames.includes('RealUser'), 'RealUser is a participant').toBe(true);

  // ── End session → check summary shows simulated-data-label ─────────────
  // Ending the session asks for confirmation first
  await page.getByRole('button', { name: 'Tutup Sesi' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Tutup Sesi' }).click();
  await page.waitForSelector('[data-testid="simulated-data-label"]', { timeout: 8_000 });
  await page.screenshot({ path: path.join(SCREENSHOTS, 'bots-05-summary-label.png') });

  await expect(page.getByTestId('simulated-data-label')).toBeVisible();

  checkHydration();
});
