/**
 * Card background contrast check — real backend.
 *
 * Every visible [data-slot="card"] must differ from the page body background.
 * Runs inside the main Playwright config: frontend port 3102, backend port 3101.
 *
 * This spec MUST FAIL when Card uses bg-background (same cream as page body).
 * This spec MUST PASS after the Stop 1 fix (bg-secondary-background = white).
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:3101';
const RUN_ID = Date.now();
const EMAIL = `contrast-${RUN_ID}@test.karsa`;
const PASS = 'Test1234!';

let presenterToken = '';
let sessionId = '';
let sessionCode = '';
let participantToken = '';
let participantId = '';
let presentationId = '';
let projectorToken = '';

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

async function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
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
    { title: 'Contrast E2E' },
    presenterToken,
  );
  presentationId = pres.id;

  await apiPut(
    `/api/presentations/${presentationId}/slides`,
    {
      slides: [
        { id: 'slide-1', type: 'materi', title: 'Pengantar', body: 'Selamat datang!', options: [], correct: [], explanation: '', image: '', groups: 0 },
        { id: 'slide-2', type: 'pilihan', title: 'Pertanyaan', body: '', options: ['Opsi A', 'Opsi B'], correct: [0], explanation: '', image: '', groups: 0 },
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
  sessionCode = sess.code;

  const join = await apiPost<{ participantId: string; token: string }>('/api/sessions/join', {
    code: sessionCode,
    name: 'TestAlya',
  });
  participantToken = join.token;
  participantId = join.participantId;

  const proj = await apiGet<{ token: string }>(
    `/api/sessions/${sessionId}/projector-token`,
    presenterToken,
  );
  projectorToken = proj.token;
});

async function setPresenterToken(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate((t) => sessionStorage.setItem('karsa_token', t), presenterToken);
}

async function setParticipantToken(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(
    ([sid, t, pid]) => {
      sessionStorage.setItem(`karsa_participant_${sid}`, t);
      sessionStorage.setItem(`karsa_participant_id_${sid}`, pid);
    },
    [sessionId, participantToken, participantId],
  );
}

async function checkCards(page: import('@playwright/test').Page, label: string) {
  const bodyBg = await page.evaluate(
    () => window.getComputedStyle(document.body).backgroundColor,
  );
  const cardBgs = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="card"]'));
    return cards
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .map((el) => window.getComputedStyle(el).backgroundColor);
  });

  expect(cardBgs.length, `${label}: no [data-slot="card"] found`).toBeGreaterThan(0);
  for (const bg of cardBgs) {
    expect(
      bg,
      `${label}: card bg "${bg}" must differ from body bg "${bodyBg}"`,
    ).not.toBe(bodyBg);
  }
}

// ── Static pages (no auth) ─────────────────────────────────────────────────

test('card-contrast: login', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await checkCards(page, 'login');
});

test('card-contrast: join', async ({ page }) => {
  await page.goto('/join');
  await page.waitForLoadState('networkidle');
  await checkCards(page, 'join');
});

// ── Authenticated pages ────────────────────────────────────────────────────

test('card-contrast: presenter lobby', async ({ page }) => {
  await setPresenterToken(page);
  await page.goto(`/session/${sessionId}/presenter`);
  await page.waitForSelector('text=' + sessionCode, { timeout: 15_000 });
  await checkCards(page, 'presenter lobby');
});

test('card-contrast: participant lobby (phone)', async ({ browser }) => {
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
  await page.waitForSelector('text=Menunggu', { timeout: 15_000 });
  await checkCards(page, 'participant lobby (360px)');
  await ctx.close();
});

// Editor uses a custom aside/canvas layout (no Card components); bg-secondary-background
// is applied directly to the aside element — contrast is correct but not via Card.

test('card-contrast: projector', async ({ page }) => {
  await page.goto(`/session/${sessionId}/projector?token=${projectorToken}`);
  await page.waitForSelector('text=Cara Bergabung', { timeout: 15_000 });
  await checkCards(page, 'projector');
});
