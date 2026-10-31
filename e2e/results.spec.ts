/**
 * C8 Results E2E — runs a full session with pilihan / awan / tanya / kuis slides,
 * ends it via Socket.IO, then opens the editor Hasil tab and verifies exact
 * response counts and values.
 *
 * Requires:
 *   - backend on http://localhost:3101
 *   - frontend on http://localhost:3100 (production build)
 */

import { test as base, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { io as ioClient, type Socket } from 'socket.io-client';
import { installHydrationGuard } from './test-utils';
import type { CommandEnvelope, SessionCommandPayload } from '../contracts/commands';

const test = base.extend<Record<never, never>>({
  page: async ({ page }, use) => {
    const checkHydration = installHydrationGuard(page);
    await use(page);
    checkHydration();
  },
});

const API = 'http://localhost:3101';
const WS = 'http://localhost:3101';
const SCREENSHOTS = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

const PILIHAN_ID = 'c8-pilihan-1';
const AWAN_ID = 'c8-awan-1';
const TANYA_ID = 'c8-tanya-1';
const KUIS_ID = 'c8-kuis-1';
const QUIZ_Q1_ID = 'c8-qq-1';
const P1_NAME = 'Hasil-P1';
const P2_NAME = 'Hasil-P2';

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

function connectSocket(token: string, sessionId?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(WS, {
      auth: { token, ...(sessionId ? { sessionId } : {}) },
      timeout: 10000,
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

async function sendCmd(
  socket: Socket,
  sessionId: string,
  payload: SessionCommandPayload,
): Promise<{ ok: boolean }> {
  const envelope: CommandEnvelope = {
    requestId: `req-${Date.now()}-${Math.random()}`,
    sessionId,
    payload,
  };
  return socket.timeout(8000).emitWithAck('command', envelope) as Promise<{ ok: boolean }>;
}

function waitForMatching<T>(
  socket: Socket,
  event: string,
  match: (data: T) => boolean,
  timeoutMs = 30_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for matching "${event}"`));
    }, timeoutMs);
    function handler(data: T) {
      if (match(data)) {
        clearTimeout(t);
        socket.off(event, handler);
        resolve(data);
      }
    }
    socket.on(event, handler);
  });
}

test('C8 — results tab shows exact slide responses and quiz scores', async ({ page }) => {
  test.setTimeout(120_000);

  const suffix = Date.now();
  const EMAIL = `results-${suffix}@test.karsa`;
  const PASS = 'Test1234!';

  // 1. Setup: register, create presentation with 4 slides
  await apiPost('/api/auth/register', { email: EMAIL, password: PASS });
  const { accessToken: token } = await apiPost<{ accessToken: string }>('/api/auth/login', { email: EMAIL, password: PASS });

  const { id: presId } = await apiPost<{ id: string }>('/api/presentations', { title: 'Hasil E2E' }, token);
  await apiPut(`/api/presentations/${presId}/slides`, {
    slides: [
      {
        id: PILIHAN_ID, type: 'pilihan', title: 'Pertanyaan Hasil',
        body: '', options: ['A', 'B', 'C'], correct: [0], explanation: '', image: '', groups: 2,
      },
      {
        id: AWAN_ID, type: 'awan', title: 'Kata-Kata',
        body: '', options: [], correct: [], explanation: '', image: '', groups: 2,
      },
      {
        id: TANYA_ID, type: 'tanya', title: 'Pertanyaan Peserta',
        body: '', options: [], correct: [], explanation: '', image: '', groups: 2,
      },
      {
        id: KUIS_ID, type: 'kuis', title: 'Kuis Akhir',
        body: '', options: [], correct: [], explanation: '', image: '', groups: 2,
        duration: 10,
        quizQuestions: [{ id: QUIZ_Q1_ID, title: 'Q?', options: ['X', 'Y'], correct: [0] }],
      },
    ],
  }, token);

  // 2. Start session
  const { sessionId, code } = await apiPost<{ sessionId: string; code: string }>(
    `/api/presentations/${presId}/sessions`, {}, token,
  );

  // 3. Connect presenter socket
  const presSocket = await connectSocket(token, sessionId);
  await new Promise<void>((resolve) => presSocket.once('session.snapshot', () => resolve()));
  await sendCmd(presSocket, sessionId, { type: 'session.start' });

  // 4. Two participants join
  const { token: p1Token } = await apiPost<{ token: string }>('/api/sessions/join', { code, name: P1_NAME });
  const { token: p2Token } = await apiPost<{ token: string }>('/api/sessions/join', { code, name: P2_NAME });

  const p1Socket = await connectSocket(p1Token);
  const p2Socket = await connectSocket(p2Token);
  await Promise.all([
    new Promise<void>((r) => p1Socket.once('session.snapshot', () => r())),
    new Promise<void>((r) => p2Socket.once('session.snapshot', () => r())),
  ]);

  // 5. Pilihan: open, submit, close
  await sendCmd(presSocket, sessionId, { type: 'activity.open', slideId: PILIHAN_ID });
  await sendCmd(p1Socket, sessionId, { type: 'response.submit', slideId: PILIHAN_ID, value: ['0'] });
  await sendCmd(p2Socket, sessionId, { type: 'response.submit', slideId: PILIHAN_ID, value: ['1'] });
  await sendCmd(presSocket, sessionId, { type: 'activity.close', slideId: PILIHAN_ID });

  // 6. Awan: navigate, open, P1 submits two words, close
  await sendCmd(presSocket, sessionId, { type: 'slide.activate', slideIndex: 1 });
  await sendCmd(presSocket, sessionId, { type: 'activity.open', slideId: AWAN_ID });
  await sendCmd(p1Socket, sessionId, {
    type: 'response.submit', slideId: AWAN_ID, value: ['kata-satu', 'kata-dua'],
  });
  await sendCmd(presSocket, sessionId, { type: 'activity.close', slideId: AWAN_ID });

  // 7. Tanya: navigate, open, P1 submits a Q&A question, close
  await sendCmd(presSocket, sessionId, { type: 'slide.activate', slideIndex: 2 });
  await sendCmd(presSocket, sessionId, { type: 'activity.open', slideId: TANYA_ID });
  await sendCmd(p1Socket, sessionId, {
    type: 'question.submit', slideId: TANYA_ID, text: 'Pertanyaan Q&A?',
  });
  await sendCmd(presSocket, sessionId, { type: 'activity.close', slideId: TANYA_ID });

  // 8. Kuis: navigate, open question, P1 answers, wait for 10s auto-close
  await sendCmd(presSocket, sessionId, { type: 'slide.activate', slideIndex: 3 });

  // Set up listener BEFORE opening question so the event is never missed
  const closedSnapP = waitForMatching<{ pov: string; view: Record<string, unknown> }>(
    presSocket,
    'session.snapshot',
    (s) => {
      const q = (s.view as Record<string, unknown>)['quiz'] as Record<string, unknown> | null;
      const runs = q?.['runs'] as Array<Record<string, unknown>> | undefined;
      const last = runs?.at(-1);
      return last?.['closed'] === true;
    },
  );

  await sendCmd(presSocket, sessionId, { type: 'quiz.openQuestion', questionId: QUIZ_Q1_ID });
  await sendCmd(p1Socket, sessionId, {
    type: 'quiz.answerSubmit', questionRunId: QUIZ_Q1_ID, optionIndex: 0,
  });

  // Wait for server-side auto-close broadcast (10s quiz duration)
  await closedSnapP;

  await sendCmd(presSocket, sessionId, { type: 'quiz.finish' });
  await sendCmd(presSocket, sessionId, { type: 'session.end' });

  presSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();

  // 9. Open editor Hasil tab
  await page.goto(`/presentations/${presId}/edit`);
  await page.evaluate((tok: string) => { sessionStorage.setItem('karsa_token', tok); }, token);
  await page.reload();
  await page.waitForSelector('[data-testid="add-slide-btn"]', { timeout: 15_000 });

  await page.click('button:has-text("Hasil")');

  // Session list shows one entry
  await expect(page.locator(`button:has-text("#${code}")`).first()).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SCREENSHOTS, 'c8-01-results-tab.png'), fullPage: false });

  // --- Pilihan: 2 responses, A and B bars visible ---
  await expect(page.locator('text=2 respons').first()).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('text=A').first()).toBeVisible();
  await expect(page.locator('text=B').first()).toBeVisible();

  // --- Awan: word tags visible ---
  await expect(page.locator('text=kata-satu')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('text=kata-dua')).toBeVisible();

  // --- Q&A: question text visible ---
  await expect(page.locator('text=Pertanyaan Q&A?')).toBeVisible({ timeout: 5_000 });

  // --- Quiz scores: P1 score row visible ---
  await expect(page.locator(`text=${P1_NAME}`).first()).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('text=1/1 benar')).toBeVisible({ timeout: 5_000 });

  await page.screenshot({ path: path.join(SCREENSHOTS, 'c8-02-results-detail.png'), fullPage: false });
});
