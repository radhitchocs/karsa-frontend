/**
 * UI screenshot capture — real backend.
 *
 * Run: pnpm test:e2e:screenshots
 *
 * Config: playwright.screenshots.config.ts
 *   Backend port 3105, frontend port 3104.
 *   NEXT_PUBLIC_API_URL is overridden in the config, so .env.local is ignored.
 *
 * Output: e2e/screenshots/after-stop1-fix/*.png  (overwrite-safe, one-command regeneration)
 */
import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const OUT = path.join(__dirname, 'screenshots', 'after-stop2');
fs.mkdirSync(OUT, { recursive: true });

const API = 'http://localhost:3105';
const RUN_ID = Date.now();
const EMAIL = `screenshots-${RUN_ID}@test.karsa`;
const PASS = 'Test1234!';

let presenterToken = '';
let sessionId = '';
let participantToken = '';
let participantId = '';
let presentationId = '';
let projectorToken = '';

async function apiPost<T>(url: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
async function apiPut<T>(url: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${url} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}
async function apiGet<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

test.beforeAll(async () => {
  await apiPost('/api/auth/register', { email: EMAIL, password: PASS });
  const login = await apiPost<{ accessToken: string }>('/api/auth/login', {
    email: EMAIL,
    password: PASS,
  });
  presenterToken = login.accessToken;

  const pres = await apiPost<{ id: string }>(
    '/api/presentations',
    { title: 'Demo Karsa' },
    presenterToken,
  );
  presentationId = pres.id;

  // Add slides before starting session (backend requires at least one slide)
  await apiPut(
    `/api/presentations/${presentationId}/slides`,
    {
      slides: [
        { id: 'slide-1', type: 'materi', title: 'Pengantar', body: 'Selamat datang di Karsa!', options: [], correct: [], explanation: '', image: '', groups: 0 },
        { id: 'slide-2', type: 'pilihan', title: 'Pertanyaan 1', body: '', options: ['Opsi A', 'Opsi B', 'Opsi C'], correct: [0], explanation: '', image: '', groups: 0 },
        { id: 'slide-3', type: 'polling', title: 'Polling 1', body: '', options: ['Ya', 'Tidak'], correct: [], explanation: '', image: '', groups: 0 },
      ],
    },
    presenterToken,
  );

  const sess = await apiPost<{ sessionId: string; code: string }>(
    `/api/presentations/${presentationId}/sessions`,
    {},
    presenterToken,
  );
  sessionId = sess.sessionId;

  const join = await apiPost<{ participantId: string; token: string }>('/api/sessions/join', {
    code: sess.code,
    name: 'Alya',
  });
  participantToken = join.token;
  participantId = join.participantId;

  const proj = await apiGet<{ token: string }>(
    `/api/sessions/${sessionId}/projector-token`,
    presenterToken,
  );
  projectorToken = proj.token;
});

const snap = async (page: import('@playwright/test').Page, name: string) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
};

// ── Desktop 1280×800 ─────────────────────────────────────────────────────────

test.use({ viewport: { width: 1280, height: 800 } });

test('shot: login desktop', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input[type="email"]', { timeout: 5_000 });
  await snap(page, '01-login-desktop');
});

test('shot: join desktop', async ({ page }) => {
  await page.goto('/join');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input', { timeout: 5_000 });
  await snap(page, '02-join-desktop');
});

test('shot: register desktop', async ({ page }) => {
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input[type="email"]', { timeout: 5_000 });
  await snap(page, '11-register-desktop');
});

test('shot: presentations list desktop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((t) => sessionStorage.setItem('karsa_token', t), presenterToken);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('main', { timeout: 10_000 });
  await snap(page, '12-presentations-list-desktop');
});

test('shot: styleguide desktop', async ({ page }) => {
  await page.goto('/styleguide');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('h1', { timeout: 5_000 });
  await snap(page, '03-styleguide-desktop');
});

test('shot: presenter lobby desktop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((t) => sessionStorage.setItem('karsa_token', t), presenterToken);
  await page.goto(`/session/${sessionId}/presenter`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=peserta', { timeout: 15_000 });
  await snap(page, '04-presenter-lobby-desktop');
});

test('shot: projector desktop', async ({ page }) => {
  await page.goto(`/session/${sessionId}/projector?token=${projectorToken}`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('main', { timeout: 10_000 });
  await snap(page, '06-projector-desktop');
});

test('shot: editor desktop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((t) => sessionStorage.setItem('karsa_token', t), presenterToken);
  await page.goto(`/presentations/${presentationId}/edit`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('aside', { timeout: 10_000 });
  await snap(page, '07-editor-desktop');
});

test('shot: editor materi layouts', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((t) => sessionStorage.setItem('karsa_token', t), presenterToken);
  await page.goto(`/presentations/${presentationId}/edit`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('aside', { timeout: 10_000 });

  // Select the first slide (Pengantar — materi)
  await page.locator('aside').getByText('Pengantar').click();
  await page.waitForSelector('text=Layout', { timeout: 5_000 });

  // Teks layout (default)
  await page.getByRole('button', { name: 'Teks', exact: true }).click();
  await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await snap(page, '13-editor-materi-teks');

  // Teks + Gambar layout
  await page.getByRole('button', { name: 'Teks + Gambar', exact: true }).click();
  await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await snap(page, '14-editor-materi-teks-gambar');

  // Dua Gambar (Sejajar) layout
  await page.getByRole('button', { name: 'Dua Gambar (Sejajar)', exact: true }).click();
  await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await snap(page, '15-editor-materi-dua-gambar-lr');

  // Dua Gambar (Bertumpuk) layout
  await page.getByRole('button', { name: 'Dua Gambar (Bertumpuk)', exact: true }).click();
  await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await snap(page, '16-editor-materi-dua-gambar-tb');
});

// ── Phone 360×780 ─────────────────────────────────────────────────────────────

test('shot: login phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input[type="email"]', { timeout: 5_000 });
  await snap(page, '08-login-phone');
  await ctx.close();
});

test('shot: participant lobby phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.evaluate(
    ([sid, t, pid]) => {
      sessionStorage.setItem(`karsa_participant_${sid}`, t);
      sessionStorage.setItem(`karsa_participant_id_${sid}`, pid);
    },
    [sessionId, participantToken, participantId],
  );
  await page.goto(`/session/${sessionId}/participant`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('main', { timeout: 15_000 });
  await snap(page, '09-participant-lobby-phone');
  await ctx.close();
});

test('shot: styleguide phone', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.goto('/styleguide');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('h1', { timeout: 5_000 });
  await snap(page, '10-styleguide-phone');
  await ctx.close();
});
