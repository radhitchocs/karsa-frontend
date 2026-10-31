/**
 * Presenter E2E test.
 *
 * Requires:
 *   - backend on http://localhost:3001 with DEMO_MODE=true and PRESENTER_GRACE_MS=1500
 *   - frontend on http://localhost:3000 (pnpm dev)
 *
 * Screenshots saved to e2e/screenshots/.
 */

import { test as base, expect, request as playwrightRequest } from '@playwright/test';
import { io as socketIo, Socket } from 'socket.io-client';
import path from 'path';
import fs from 'fs';
import { installHydrationGuard } from './test-utils';

// Extend page fixture to fail the test on any React hydration error.
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
const PRESENTER_EMAIL = `presenter-${RUN_ID}@test.karsa`;
const PRESENTER_PASS = 'Test1234!';

let presenterToken = '';
let presentationId = '';
let sessionId = '';
let sessionCode = '';
let participantToken = '';
let participantId = '';
let awanSlideId = '';
const participantSockets: Socket[] = [];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

async function apiPut<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`PUT ${path} → ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// beforeAll: register, create presentation, start session, connect 3 participants
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  // Register + login
  await apiPost('/api/auth/register', { email: PRESENTER_EMAIL, password: PRESENTER_PASS });
  const login = await apiPost<{ accessToken: string }>('/api/auth/login', {
    email: PRESENTER_EMAIL,
    password: PRESENTER_PASS,
  });
  presenterToken = login.accessToken;

  // Create presentation with all 7 slide types
  const p = await apiPost<{ id: string }>('/api/presentations', { title: 'Demo E2E' }, presenterToken);
  presentationId = p.id;

  const slides = [
    {
      id: crypto.randomUUID(), type: 'materi', title: 'Selamat Datang',
      body: 'Ini slide materi.', options: [], correct: 0, explanation: '', image: '', groups: 3, layout: 'teks',
    },
    {
      id: crypto.randomUUID(), type: 'pilihan', title: 'Pilihan Ganda Test',
      body: 'Mana ibu kota Indonesia?', options: ['Jakarta', 'Surabaya', 'Bandung', 'Medan'],
      correct: 0, explanation: 'Jakarta adalah ibu kota.', image: '', groups: 3,
    },
    {
      id: crypto.randomUUID(), type: 'polling', title: 'Polling Test',
      body: 'Bahasa favorit?', options: ['TypeScript', 'Python', 'Rust'],
      correct: 0, explanation: '', image: '', groups: 3,
    },
    {
      id: crypto.randomUUID(), type: 'awan', title: 'Awan Kata Test',
      body: 'Kata yang muncul di pikiran:', options: [], correct: 0,
      explanation: '', image: '', groups: 3,
    },
    {
      id: crypto.randomUUID(), type: 'tanya', title: 'Q&A Test',
      body: 'Ada pertanyaan?', options: [], correct: 0,
      explanation: '', image: '', groups: 3,
    },
    {
      id: crypto.randomUUID(), type: 'kelompok', title: 'Pembagian Kelompok',
      body: '', options: [], correct: 0, explanation: '', image: '', groups: 3,
    },
    {
      id: crypto.randomUUID(), type: 'kuis', title: 'Kuis Akhir',
      body: '', options: [], correct: 0, explanation: '', image: '', groups: 3,
      duration: 10,
      quizQuestions: [
        { id: crypto.randomUUID(), title: 'Berapa 2 + 2?', options: ['3', '4', '5', '6'], correct: 1 },
        { id: crypto.randomUUID(), title: 'Ibu kota Jepang?', options: ['Osaka', 'Tokyo', 'Kyoto'], correct: 1 },
      ],
    },
  ];

  awanSlideId = slides[3].id; // index 3 = awan kata slide

  await apiPut(`/api/presentations/${presentationId}/slides`, { slides }, presenterToken);

  // Create session
  const sess = await apiPost<{ sessionId: string; code: string }>(
    `/api/presentations/${presentationId}/sessions`, {}, presenterToken,
  );
  sessionId = sess.sessionId;
  sessionCode = sess.code;

  // Join 3 participants and connect via Socket.IO so they are online
  // (groups.assign requires ≥2 online participants)
  const names = ['Alya', 'Bima', 'Citra'];
  for (const name of names) {
    const join = await apiPost<{ participantId: string; token: string }>('/api/sessions/join', {
      code: sessionCode, name,
    });
    if (name === 'Alya') {
      participantId = join.participantId;
      participantToken = join.token;
    }
    const sock = socketIo(API, {
      auth: { token: join.token },
      query: { sessionId, role: 'participant', actorId: join.participantId },
      transports: ['websocket'],
    });
    await new Promise<void>((resolve, reject) => {
      sock.once('connect', resolve);
      sock.once('connect_error', reject);
      setTimeout(() => reject(new Error('socket connect timeout')), 5000);
    });
    participantSockets.push(sock);
  }
});

test.afterAll(async () => {
  for (const sock of participantSockets) sock.disconnect();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function setTokenInBrowser(page: import('@playwright/test').Page, token: string) {
  await page.evaluate((tok: string) => {
    sessionStorage.setItem('karsa_token', tok);
  }, token);
}

async function screenshot(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`), fullPage: false });
}

// ---------------------------------------------------------------------------
// Test 1: full presenter + participant flow
// ---------------------------------------------------------------------------

test('full presenter + participant flow', async ({ page }) => {
  test.setTimeout(120_000);
  // ── Login ──────────────────────────────────────────────────────────────────
  await page.goto('/login');
  await screenshot(page, '01-login-page');

  await page.fill('input[type="email"]', PRESENTER_EMAIL);
  await page.fill('input[type="password"]', PRESENTER_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  await screenshot(page, '02-presentations-list');

  await expect(page.getByText('Presentasi Saya')).toBeVisible();
  await expect(page.getByText('Demo E2E')).toBeVisible();

  // ── Editor ─────────────────────────────────────────────────────────────────
  await page.goto(`/presentations/${presentationId}/edit`);
  await page.waitForSelector('input[value="Demo E2E"]', { timeout: 15_000 });
  await screenshot(page, '03-editor-all-slides');

  await page.getByText('Kuis Akhir').first().click();
  await screenshot(page, '04-editor-quiz-slide');

  // Screenshot: duration validation error (enter invalid value 5 → error appears)
  const durationInput = page.locator('input[type="number"]').first();
  await durationInput.fill('5');
  await durationInput.blur();
  await page.waitForSelector('text=Durasi harus', { timeout: 3_000 });
  await screenshot(page, '04b-editor-duration-error');
  await durationInput.fill('10');
  await durationInput.blur();

  // ── Lobby (S04) ────────────────────────────────────────────────────────────
  await page.goto(`/session/${sessionId}/presenter`);
  await setTokenInBrowser(page, presenterToken);
  await page.reload();
  await page.waitForSelector(`text=${sessionCode}`);
  await screenshot(page, '05-lobby');
  await expect(page.getByText(sessionCode)).toBeVisible();

  // ── Start session ──────────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Mulai Sesi' }).click();
  await page.waitForSelector('text=Selamat Datang', { timeout: 10_000 });
  await screenshot(page, '06-active-slide-materi');

  // ── Pilihan Ganda (S05) ────────────────────────────────────────────────────
  await page.getByText('Pilihan Ganda Test').click();
  await page.waitForSelector('text=Buka Aktivitas');
  await screenshot(page, '07-slide-pilihan-belum');

  await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
  await page.waitForSelector('text=Tutup Aktivitas');
  await screenshot(page, '08-slide-pilihan-buka');

  await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
  await page.waitForSelector('button:not([disabled]):has-text("Tampilkan Hasil")', { timeout: 5_000 });
  await screenshot(page, '09-slide-pilihan-tutup');

  await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();
  await screenshot(page, '10-slide-pilihan-revealed');

  // ── Polling ────────────────────────────────────────────────────────────────
  await page.getByText('Polling Test').click();
  await page.waitForSelector('text=Buka Aktivitas');
  await screenshot(page, '11-slide-polling-belum');

  // ── Awan Kata ──────────────────────────────────────────────────────────────
  await page.getByText('Awan Kata Test').click();
  await page.waitForSelector('text=Buka Aktivitas');
  await screenshot(page, '12-slide-awan-belum');

  await page.getByRole('button', { name: 'Buka Aktivitas' }).click();
  await page.waitForSelector('text=Tutup Aktivitas');
  await screenshot(page, '13-slide-awan-buka');

  // Participants submit words via socket while activity is open
  await participantSockets[0].emitWithAck('command', {
    requestId: crypto.randomUUID(),
    sessionId,
    payload: { type: 'response.submit', slideId: awanSlideId, value: ['semangat', 'maju'] },
  });
  await participantSockets[1].emitWithAck('command', {
    requestId: crypto.randomUUID(),
    sessionId,
    payload: { type: 'response.submit', slideId: awanSlideId, value: ['semangat', 'kreatif'] },
  });

  // Wait for presenter view to receive the word list (semangat × 2 is most frequent)
  await page.waitForSelector('[data-testid="word-semangat"]', { timeout: 5_000 });

  // Close then reveal results so projector snapshot is populated
  // (results.reveal requires status=tutup; activity is still buka here)
  await page.getByRole('button', { name: 'Tutup Aktivitas' }).click();
  await page.waitForSelector('button:not([disabled]):has-text("Tampilkan Hasil")', { timeout: 5_000 });
  await page.getByRole('button', { name: 'Tampilkan Hasil' }).click();
  await page.waitForSelector('button[disabled]:has-text("Tampilkan Hasil")', { timeout: 5_000 });

  // Hide 'semangat' via toggle button on its row
  await page.locator('[data-testid="word-semangat"] button').click();
  await page.waitForSelector('[data-testid="word-semangat-hidden"]', { timeout: 5_000 });
  await screenshot(page, '13b-awan-hide-word');

  // Projector REST snapshot must not contain the hidden word
  const projTok = await apiGet<{ token: string }>(
    `/api/sessions/${sessionId}/projector-token`,
    presenterToken,
  );
  const projState = await apiGet<{
    revealedResults: { type: string; words?: Array<{ text: string; count: number }> } | null;
  }>(`/api/sessions/${sessionId}/state?projectorToken=${projTok.token}`);
  expect(projState.revealedResults?.words?.some((w) => w.text === 'semangat')).toBeFalsy();

  // ── Q&A (S11) ──────────────────────────────────────────────────────────────
  await page.getByText('Q&A Test').click();
  await page.waitForSelector('text=Buka Q&A');
  await screenshot(page, '14-slide-qa-belum');

  await page.getByRole('button', { name: 'Buka Q&A' }).click();
  await page.waitForSelector('text=Tutup Q&A');
  await screenshot(page, '15-slide-qa-buka');

  // ── Session paused (presenter disconnect + reconnect) ──────────────────────
  // Navigate away → socket disconnects → after PRESENTER_GRACE_MS (1500 ms) session pauses
  await page.goto('/');
  await page.waitForTimeout(2500); // wait for grace timer to fire

  // Navigate back — presenter reconnects but session remains paused until resumed
  await page.goto(`/session/${sessionId}/presenter`);
  await setTokenInBrowser(page, presenterToken);
  await page.reload();
  await page.waitForSelector('text=Dijeda', { timeout: 8_000 });
  await screenshot(page, '15b-session-paused');

  await page.getByRole('button', { name: 'Lanjutkan Sesi' }).click();
  await page.waitForSelector('text=Aktif', { timeout: 5_000 });
  await screenshot(page, '15c-session-resumed');

  // Close Q&A before navigating — sidebar nav is disabled while activity is open
  await page.getByRole('button', { name: 'Tutup Q&A' }).click();
  await page.waitForSelector('text=Buka Kembali', { timeout: 5_000 });

  // ── Group Assignment (S08) — use count=2 for replace responder test ────────
  await page.locator('aside button').filter({ hasText: 'Pembagian Kelompok' }).click();
  await page.waitForSelector('text=Bagikan Kelompok');
  await screenshot(page, '16-slide-kelompok-before');

  // Set group count to 2 → groups of 2+1 → group-1 has 2 members → replaceable
  await page.fill('input[type="number"]', '2');
  await page.getByRole('button', { name: 'Bagikan Kelompok' }).click();
  await page.waitForSelector('text=Kelompok 1', { timeout: 5_000 });
  await screenshot(page, '17-slide-kelompok-after');

  // Replace responder — assert name actually changes
  const responderSpan = page.locator('span').filter({ hasText: /^Penjawab:/ }).first();
  const responderBefore = await responderSpan.textContent();
  await page.getByRole('button', { name: 'Ganti Penjawab' }).first().click();
  await expect(responderSpan).not.toHaveText(responderBefore!, { timeout: 5_000 });
  await screenshot(page, '17b-kelompok-replace-responder');

  // ── Quiz (S14) — not_started state shows "Buka Pertanyaan Pertama" ─────────
  await page.locator('aside button').filter({ hasText: 'Kuis Akhir' }).click();
  await page.waitForSelector('text=Buka Pertanyaan Pertama', { timeout: 5_000 });
  await screenshot(page, '18-quiz-not-started');

  // Single button opens Q1 directly
  await page.getByRole('button', { name: 'Buka Pertanyaan Pertama' }).click();
  await page.waitForSelector('text=Soal 1 / 2', { timeout: 5_000 });
  await screenshot(page, '19-quiz-question-1-open');

  // Wait for auto-close (duration=10s)
  await page.waitForSelector('text=Soal Berikutnya', { timeout: 18_000 });
  await screenshot(page, '21-quiz-question-1-closed');

  await page.getByRole('button', { name: 'Soal Berikutnya' }).click();
  await page.waitForSelector('text=Soal 2 / 2', { timeout: 5_000 });
  await screenshot(page, '22-quiz-question-2-open');

  await page.waitForSelector('text=Selesaikan Kuis', { timeout: 25_000 });
  await screenshot(page, '23-quiz-question-2-closed');

  await page.getByRole('button', { name: 'Selesaikan Kuis' }).click();
  await page.waitForSelector('text=Kuis Selesai', { timeout: 5_000 });
  await screenshot(page, '24-quiz-finished');

  // ── Leaderboard (S16) ──────────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Tampilkan Leaderboard' }).click();
  await page.waitForSelector('text=Leaderboard', { timeout: 5_000 });
  await screenshot(page, '25-leaderboard');

  // ── End session + Summary (S12) ────────────────────────────────────────────
  await page.getByRole('button', { name: 'Akhiri Sesi' }).click();
  await page.waitForSelector('text=Sesi Selesai', { timeout: 10_000 });
  await screenshot(page, '26-summary');
  await expect(page.getByText('Sesi Selesai')).toBeVisible();

  const apiCtx = await playwrightRequest.newContext();
  await apiCtx.dispose();
});

// ---------------------------------------------------------------------------
// Test 2: command rejection shows error toast
// ---------------------------------------------------------------------------

test('command rejection shows error toast', async ({ page }) => {
  // Create a minimal presentation with materi + kelompok (0 participants will join)
  const shortP = await apiPost<{ id: string }>(
    '/api/presentations',
    { title: 'Toast Test' },
    presenterToken,
  );
  const shortSlides = [
    {
      id: crypto.randomUUID(), type: 'materi', title: 'Materi',
      body: '', options: [], correct: 0, explanation: '', image: '', groups: 2, layout: 'teks',
    },
    {
      id: crypto.randomUUID(), type: 'kelompok', title: 'Kelompok',
      body: '', options: [], correct: 0, explanation: '', image: '', groups: 2,
    },
  ];
  await apiPut(`/api/presentations/${shortP.id}/slides`, { slides: shortSlides }, presenterToken);

  const shortSess = await apiPost<{ sessionId: string; code: string }>(
    `/api/presentations/${shortP.id}/sessions`, {}, presenterToken,
  );

  // Navigate to presenter, inject token, start session
  await page.goto(`/session/${shortSess.sessionId}/presenter`);
  await setTokenInBrowser(page, presenterToken);
  await page.reload();
  await page.waitForSelector('text=Mulai Sesi');

  await page.getByRole('button', { name: 'Mulai Sesi' }).click();
  await page.waitForSelector('text=Materi', { timeout: 8_000 });

  // Navigate to kelompok — 0 online participants (DEMO_MODE=false, no bots)
  await page.locator('aside button').filter({ hasText: 'Kelompok' }).click();
  await page.waitForSelector('text=Bagikan Kelompok');

  // Click — should fail: "Gunakan minimal 2 peserta…"
  await page.getByRole('button', { name: 'Bagikan Kelompok' }).click();

  // Toast must show exact server error message in description slot
  await expect(
    page.locator('[data-slot="toast-description"]'),
  ).toContainText('Gunakan minimal 2 peserta', { timeout: 5_000 });
  await screenshot(page, '27-toast-command-rejection');
});

// ---------------------------------------------------------------------------
// Test 2b: session.simulate rejected when DEMO_MODE is off
// ---------------------------------------------------------------------------

test('session.simulate rejected when DEMO_MODE=false', async () => {
  // Connect presenter socket directly and attempt simulate command
  const sock = socketIo(API, {
    auth: { token: presenterToken, sessionId },
    transports: ['websocket'],
    reconnection: false,
  });
  await new Promise<void>((resolve, reject) => {
    sock.once('connect', resolve);
    sock.once('connect_error', reject);
    setTimeout(() => reject(new Error('socket connect timeout')), 5000);
  });
  // Drain initial snapshot
  await new Promise<void>((r) => setTimeout(r, 300));

  const ack = await sock.timeout(5000).emitWithAck('command', {
    requestId: `simtest-${Date.now()}`,
    sessionId,
    payload: { type: 'session.simulate' },
  });
  expect(ack.ok).toBe(false);
  expect(ack.code).toBe('UNAUTHORIZED');
  sock.disconnect();
});

// ---------------------------------------------------------------------------
// Test 3: login shows error on wrong password
// ---------------------------------------------------------------------------

test('login shows error on wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', PRESENTER_EMAIL);
  await page.fill('input[type="password"]', 'wrong-password');
  await page.click('button[type="submit"]');
  await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 5_000 });
  await screenshot(page, '00-login-error');
});

// ---------------------------------------------------------------------------
// Test 4: editor shows all slide types
// ---------------------------------------------------------------------------

test('editor shows presentation with all slide types', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', PRESENTER_EMAIL);
  await page.fill('input[type="password"]', PRESENTER_PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');

  await page.goto(`/presentations/${presentationId}/edit`);
  await page.waitForSelector('input[value="Demo E2E"]', { timeout: 15_000 });

  for (const label of ['Materi', 'Pilihan ganda', 'Polling', 'Awan kata', 'Q&A', 'Pembagian Kelompok', 'Kuis']) {
    await expect(page.getByText(label).first()).toBeVisible();
  }
  await screenshot(page, '03b-editor-all-slide-types-verified');

  // ── AC26: three materi layout variants + two independent image slots ──────
  // Select the Materi slide (first slide in the list) — editor uses div, not button
  await page.locator('aside').getByText('Selamat Datang').click();
  await page.waitForSelector('[role="group"][aria-label="Layout"]', { timeout: 5_000 });

  // Verify three layout buttons exist (exact: true avoids 'Teks' matching 'Teks + Gambar')
  await expect(page.getByRole('button', { name: 'Teks', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Teks + Gambar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dua Gambar (Sejajar)', exact: true })).toBeVisible();

  // Switch to Teks + Gambar → one image slot appears (C2: canvas upload slot)
  await page.getByRole('button', { name: 'Teks + Gambar', exact: true }).click();
  await expect(page.locator('[data-testid="image-slot-0"]')).toBeVisible();
  await expect(page.locator('[data-testid="image-slot-1"]')).not.toBeVisible();
  await screenshot(page, '03c-editor-materi-teks-gambar');

  // Switch to Dua Gambar → two image slots appear
  await page.getByRole('button', { name: 'Dua Gambar (Sejajar)', exact: true }).click();
  await expect(page.locator('[data-testid="image-slot-0"]')).toBeVisible();
  await expect(page.locator('[data-testid="image-slot-1"]')).toBeVisible();
  await screenshot(page, '03d-editor-materi-dua-gambar');

  // Switch back to Teks → image slots hidden
  await page.getByRole('button', { name: 'Teks', exact: true }).click();
  await expect(page.locator('[data-testid="image-slot-0"]')).not.toBeVisible();
  await expect(page.locator('[data-testid="image-slot-1"]')).not.toBeVisible();
  await screenshot(page, '03e-editor-materi-teks');
});
