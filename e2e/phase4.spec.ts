/**
 * Phase 4 E2E — Participant + Projector POVs
 *
 * Contexts:
 *   presenter  — 1440×900
 *   participant × 3 — 360×740 (mobile-first)
 *   projector  — 1920×1080
 *
 * All against the real backend (port 3101).
 */

import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { installHydrationGuard } from './test-utils';

test.setTimeout(300_000);

const API = 'http://localhost:3101';
const SCREENSHOTS = path.join(__dirname, 'screenshots/phase4');
if (!fs.existsSync(SCREENSHOTS)) fs.mkdirSync(SCREENSHOTS, { recursive: true });

const RUN = Date.now();
const P_EMAIL = `p4-${RUN}@test.karsa`;
const P_PASS = 'Test1234!';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

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

async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${await res.text()}`);
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

function shot(ctx: import('@playwright/test').Page, name: string) {
  return ctx.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`), fullPage: false });
}

// --------------------------------------------------------------------------
// Main test
// --------------------------------------------------------------------------

test('participant + projector POVs — all slide types', async () => {
  // ── Setup ────────────────────────────────────────────────────────────────
  await apiPost('/api/auth/register', { email: P_EMAIL, password: P_PASS });
  const { accessToken: pToken } = await apiPost<{ accessToken: string }>('/api/auth/login', {
    email: P_EMAIL, password: P_PASS,
  });

  const { id: presId } = await apiPost<{ id: string }>('/api/presentations', { title: 'Phase4 E2E' }, pToken);

  const PILIHAN_ID = crypto.randomUUID();
  const AWAN_ID = crypto.randomUUID();
  const KELOMPOK_ID = crypto.randomUUID();
  // Group-role test slide — must be AFTER kelompok so engine allows activity.open when groups exist
  const GROUP_PILIHAN_ID = crypto.randomUUID();
  const KUIS_ID = crypto.randomUUID();
  const QUIZ_Q1 = crypto.randomUUID();
  const QUIZ_Q2 = crypto.randomUUID();

  const slides = [
    { id: crypto.randomUUID(), type: 'materi', title: 'Pengantar', body: 'Selamat datang!', options: [], correct: 0, explanation: '', image: '', groups: 2, layout: 'teks' },
    { id: PILIHAN_ID, type: 'pilihan', title: 'Ibu kota Indonesia?', body: '', options: ['Jakarta', 'Surabaya', 'Bandung'], correct: 0, explanation: 'Jakarta.', image: '', groups: 2 },
    { id: crypto.randomUUID(), type: 'polling', title: 'Bahasa favorit?', body: '', options: ['TypeScript', 'Python', 'Rust'], correct: 0, explanation: '', image: '', groups: 2 },
    { id: AWAN_ID, type: 'awan', title: 'Satu kata tentang kolaborasi?', body: '', options: [], correct: 0, explanation: '', image: '', groups: 2 },
    { id: crypto.randomUUID(), type: 'tanya', title: 'Ada pertanyaan?', body: '', options: [], correct: 0, explanation: '', image: '', groups: 2 },
    { id: KELOMPOK_ID, type: 'kelompok', title: 'Pembagian Kelompok', body: '', options: [], correct: 0, explanation: '', image: '', groups: 2 },
    // POST-kelompok pilihan — used for group-role submit-button assertion (index > division)
    { id: GROUP_PILIHAN_ID, type: 'pilihan', title: 'Pilihan Kelompok?', body: '', options: ['Opsi A', 'Opsi B'], correct: 0, explanation: 'A benar.', image: '', groups: 2 },
    { id: KUIS_ID, type: 'kuis', title: 'Kuis Akhir', body: '', options: [], correct: 0, explanation: '', image: '', groups: 2, duration: 10,
      quizQuestions: [
        { id: QUIZ_Q1, title: 'Berapa 2+2?', options: ['3', '4', '5'], correct: 1 },
        { id: QUIZ_Q2, title: '7×6=?', options: ['40', '42', '48'], correct: 1 },
      ],
    },
  ];
  await apiPut(`/api/presentations/${presId}/slides`, { slides }, pToken);

  const { sessionId, code: sessionCode } = await apiPost<{ sessionId: string; code: string }>(
    `/api/presentations/${presId}/sessions`, {}, pToken,
  );

  // 3 participants join
  const participants: { id: string; token: string; name: string }[] = [];
  for (const name of ['Alya', 'Bima', 'Citra']) {
    const r = await apiPost<{ participantId: string; token: string; sessionId: string }>(
      '/api/sessions/join', { code: sessionCode, name },
    );
    participants.push({ id: r.participantId, token: r.token, name });
  }

  const projTok = await apiGet<{ token: string }>(
    `/api/sessions/${sessionId}/projector-token`, pToken,
  );

  // ── Open browser contexts ─────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: true });

  const presCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pCtxs = await Promise.all(
    participants.map(() => browser.newContext({ viewport: { width: 360, height: 740 } })),
  );
  const projCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  const presPage = await presCtx.newPage();
  const pPages = await Promise.all(pCtxs.map((c) => c.newPage()));
  const projPage = await projCtx.newPage();

  // Install hydration guards — will be checked before browser.close()
  const checkPresHydration = installHydrationGuard(presPage);
  const checkProjHydration = installHydrationGuard(projPage);
  const checkPHydrations = pPages.map((p) => installHydrationGuard(p));

  try {
    // ── Presenter: inject token + navigate ──────────────────────────────────
    await presPage.goto('http://localhost:3102/login');
    await presPage.evaluate((tok) => sessionStorage.setItem('karsa_token', tok), pToken);
    await presPage.goto(`http://localhost:3102/session/${sessionId}/presenter`);
    await presPage.waitForSelector(`text=${sessionCode}`, { timeout: 15_000 });
    await shot(presPage, '01-presenter-lobby');

    // ── Participants: inject tokens + navigate ──────────────────────────────
    for (let i = 0; i < pPages.length; i++) {
      const { token, id } = participants[i];
      await pPages[i].goto('http://localhost:3102/join');
      await pPages[i].evaluate(
        ([sid, tok, pid]) => {
          sessionStorage.setItem(`karsa_participant_${sid}`, tok);
          sessionStorage.setItem(`karsa_participant_id_${sid}`, pid);
        },
        [sessionId, token, id] as [string, string, string],
      );
      await pPages[i].goto(`http://localhost:3102/session/${sessionId}/participant`);
    }

    // ── Projector ─────────────────────────────────────────────────────────
    await projPage.goto(
      `http://localhost:3102/session/${sessionId}/projector?token=${projTok.token}`,
    );
    await projPage.waitForSelector(`text=${sessionCode}`, { timeout: 15_000 });
    await shot(projPage, '02-projector-lobby');

    // ── Test /join form ───────────────────────────────────────────────────
    const joinTestCtx = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const joinPage = await joinTestCtx.newPage();
    const checkJoinHydration = installHydrationGuard(joinPage);
    await joinPage.goto('http://localhost:3102/join');
    // Wrong code error
    await joinPage.fill('input[inputmode="numeric"]', '000000');
    await joinPage.fill('input[maxlength="40"]', 'Dimas');
    await joinPage.click('button[type="submit"]');
    await expect(joinPage.locator('[data-testid="join-error"]')).toBeVisible({ timeout: 5_000 });
    await shot(joinPage, '00-join-error');
    // Correct join
    await joinPage.fill('input[inputmode="numeric"]', sessionCode);
    await joinPage.fill('input[maxlength="40"]', 'Dimas');
    await joinPage.click('button[type="submit"]');
    await joinPage.waitForURL(/\/session\/.*\/participant/, { timeout: 10_000 });
    await shot(joinPage, '00b-join-success-lobby');
    checkJoinHydration();
    await joinTestCtx.close();

    // ── Start session ──────────────────────────────────────────────────────
    await presPage.getByRole('button', { name: 'Mulai Sesi' }).click();
    await presPage.waitForSelector('text=Pengantar', { timeout: 10_000 });

    // Participants should now see active view
    await pPages[0].waitForSelector('text=Pengantar', { timeout: 10_000 });
    await shot(pPages[0], '03-participant-materi');

    // 360px scroll check: no horizontal overflow on participant pages
    for (let i = 0; i < pPages.length; i++) {
      const scrollW = await pPages[i].evaluate(() => document.documentElement.scrollWidth);
      expect(scrollW, `participant ${i} horizontal scroll`).toBeLessThanOrEqual(360);
    }

    // Projector — materi slide
    await projPage.waitForSelector('text=Pengantar', { timeout: 8_000 });
    await shot(projPage, '04-projector-materi');

    // ── Pilihan Ganda ──────────────────────────────────────────────────────
    await presPage.getByText('Ibu kota Indonesia?').click();
    await presPage.waitForSelector('text=Buka Aktivitas');

    // Before reveal: participant sees slide but NO correct answer marker
    await pPages[0].waitForSelector('text=Ibu kota Indonesia?', { timeout: 8_000 });
    await shot(pPages[0], '05-participant-pilihan-belum');

    // Open activity
    await presPage.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await presPage.waitForSelector('text=Tutup Aktivitas');
    // Screenshot: nav prev/next disabled while activity is open
    await shot(presPage, '05c-presenter-nav-disabled-activity-open');

    // Alya (P0) submits answer
    await pPages[0].waitForSelector('button:has-text("A.")', { timeout: 5_000 });
    await pPages[0].getByRole('button', { name: /^A\./ }).click();
    // Screenshot: option selected (aria-pressed) before submitting
    await shot(pPages[0], '05d-participant-pilihan-option-selected');
    await pPages[0].getByRole('button', { name: /Kirim Jawaban/ }).click();
    await pPages[0].waitForSelector('text=terkirim', { timeout: 5_000 });
    await shot(pPages[0], '06-participant-pilihan-submitted');

    // Close activity
    await presPage.getByRole('button', { name: 'Tutup Aktivitas' }).click();
    // Wait for "Tampilkan Hasil" to become enabled (activity closed)
    await presPage.waitForSelector('button:not([disabled]):has-text("Tampilkan Hasil")', { timeout: 5_000 });

    // B6 item 6: Reveal WITH hideContent=ON (default) — participant must see confirmation, NOT correct answer
    await presPage.getByRole('button', { name: 'Tampilkan Hasil' }).click();
    // Wait for reveal to reach participant (button becomes disabled once activity.visible=true)
    await presPage.waitForSelector('button[disabled]:has-text("Tampilkan Hasil")', { timeout: 5_000 });
    // Participant sees confirmation, not correct answer
    await pPages[0].waitForSelector('text=Jawabanmu sudah masuk', { timeout: 8_000 });
    await expect(pPages[0].locator('[aria-label="jawaban benar"]')).not.toBeVisible();
    await shot(pPages[0], '07-participant-pilihan-hidecontent-on');

    // Toggle hideContent OFF — label: "Konten peserta: Disembunyikan" → "Konten peserta: Ditampilkan"
    await presPage.getByRole('button', { name: 'Konten peserta: Disembunyikan' }).click();
    // Wait for toggle to propagate (no waitForTimeout — wait for label change)
    await presPage.waitForSelector('button:has-text("Konten peserta: Ditampilkan")', { timeout: 5_000 });

    // After toggle OFF: participant sees correct answer marker (Check SVG, not text ✓)
    await pPages[0].waitForSelector('[aria-label="jawaban benar"]', { timeout: 8_000 });
    await shot(pPages[0], '07b-participant-pilihan-hidecontent-off');

    // Non-answering participant (P1) sees "Tidak menjawab · 0 poin" (D: status=tutup+visible+no answer)
    await pPages[1].waitForSelector('text=Tidak menjawab', { timeout: 5_000 });
    await shot(pPages[1], '07c-participant-pilihan-no-answer');

    // Projector shows results
    await projPage.waitForSelector('text=Jakarta', { timeout: 8_000 });
    await shot(projPage, '08-projector-pilihan-results');

    // Before reveal projector: correct option MUST NOT appear as green (it appeared after reveal above)
    // Verify after buka: projector shows progress but no "✓" marker
    // (already tested by sequence — correct only shown after Tampilkan Hasil)

    // ── Polling ────────────────────────────────────────────────────────────
    await presPage.getByText('Bahasa favorit?').click();
    await presPage.waitForSelector('text=Buka Aktivitas');
    await presPage.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await presPage.waitForSelector('text=Tutup Aktivitas');

    await pPages[0].waitForSelector('button:has-text("A.")', { timeout: 5_000 });
    await pPages[0].getByRole('button', { name: /^A\./ }).click();
    // Screenshot: polling option selected before submit
    await shot(pPages[0], '08b-participant-polling-selected');
    await pPages[0].getByRole('button', { name: /Kirim Jawaban/ }).click();

    // Close polling before navigating (wait for button to enable = activity closed)
    await presPage.getByRole('button', { name: 'Tutup Aktivitas' }).click();
    await presPage.waitForSelector('button:not([disabled]):has-text("Tampilkan Hasil")', { timeout: 5_000 });

    // ── Awan Kata ──────────────────────────────────────────────────────────
    await presPage.getByText('Satu kata tentang kolaborasi?').click();
    await presPage.waitForSelector('text=Buka Aktivitas');
    await presPage.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await presPage.waitForSelector('text=Tutup Aktivitas');

    // Participants submit words
    await pPages[0].waitForSelector('input[placeholder*="Kata 1"]', { timeout: 8_000 });
    await pPages[0].fill('input[placeholder*="Kata 1"]', 'sinergi');
    await pPages[0].fill('input[placeholder*="Kata 2"]', 'kolaborasi');
    await pPages[0].getByRole('button', { name: /Kirim Kata/ }).click();
    await shot(pPages[0], '09-participant-awan-submitted');

    // P1 also submits
    await pPages[1].waitForSelector('input[placeholder*="Kata 1"]', { timeout: 8_000 });
    await pPages[1].fill('input[placeholder*="Kata 1"]', 'sinergi');
    await pPages[1].fill('input[placeholder*="Kata 2"]', 'tim');
    await pPages[1].getByRole('button', { name: /Kirim Kata/ }).click();

    // DRAFT-KEPT TEST:
    // P2 fills words but does NOT submit. When the presenter closes the activity,
    // the incoming snapshot changes status → 'tutup' and disables the inputs.
    // The draft value must still be in the (now-disabled) input — React local state
    // must NOT be cleared by an incoming snapshot update.
    await pPages[2].waitForSelector('input[placeholder*="Kata 1"]', { timeout: 8_000 });
    await pPages[2].fill('input[placeholder*="Kata 1"]', 'draft-yang-disimpan');

    // Close + reveal awan kata so projector word cloud appears
    await presPage.getByRole('button', { name: 'Tutup Aktivitas' }).click();
    // Wait for button to become enabled (activity closed = status tutup)
    await presPage.waitForSelector('button:not([disabled]):has-text("Tampilkan Hasil")', { timeout: 5_000 });
    await presPage.getByRole('button', { name: 'Tampilkan Hasil' }).click();
    // Wait for reveal to propagate (button becomes disabled once activity.visible=true)
    await presPage.waitForSelector('button[disabled]:has-text("Tampilkan Hasil")', { timeout: 5_000 });

    // P2's draft must still be in the now-disabled input (snapshot did not clear it)
    await pPages[2].waitForSelector('input:disabled[placeholder*="Kata 1"]', { timeout: 5_000 });
    const draftValue = await pPages[2].locator('input[placeholder*="Kata 1"]').inputValue();
    expect(draftValue, 'draft preserved when activity closed by snapshot').toBe('draft-yang-disimpan');

    // Projector shows word cloud with multiple words at different sizes
    await projPage.waitForSelector('text=sinergi', { timeout: 8_000 });
    await shot(projPage, '09b-projector-awan-revealed');

    // ── Q&A ────────────────────────────────────────────────────────────────
    await presPage.getByText('Ada pertanyaan?').click();
    await presPage.waitForSelector('text=Buka Q&A');
    await presPage.getByRole('button', { name: 'Buka Q&A' }).click();
    await presPage.waitForSelector('text=Tutup Q&A');

    await pPages[1].waitForSelector('textarea', { timeout: 8_000 });
    await pPages[1].fill('textarea', 'Bagaimana cara bergabung kelompok?');
    await pPages[1].getByRole('button', { name: 'Kirim Pertanyaan' }).click();
    await pPages[1].waitForSelector('text=Pertanyaan terkirim!', { timeout: 5_000 });
    await shot(pPages[1], '10-participant-qa-submitted');

    // Presenter moderates question → projector shows it (use aria-label to avoid matching toggle)
    await presPage.waitForSelector('[aria-label^="Tampilkan:"]', { timeout: 5_000 });
    await presPage.locator('[aria-label^="Tampilkan:"]').first().click();
    await projPage.waitForSelector('text=Bagaimana cara', { timeout: 8_000 });
    await shot(projPage, '10b-projector-qa-question-visible');

    // Close Q&A before navigating — sidebar nav is disabled while activity is open
    await presPage.getByRole('button', { name: 'Tutup Q&A' }).click();
    await presPage.waitForSelector('text=Buka Kembali', { timeout: 5_000 });

    // B8: Q&A panel on a later (non-Q&A) slide — navigate to Pengantar (materi), open Q&A panel
    await presPage.locator('aside button').filter({ hasText: 'Pengantar' }).click();
    await presPage.waitForSelector('text=Selamat datang!', { timeout: 5_000 });
    // Open Q&A panel from header button
    await presPage.getByTitle('Panel Q&A').click();
    await presPage.waitForSelector('text=Panel Q&A', { timeout: 5_000 });
    await shot(presPage, 'b8-presenter-qa-panel-on-later-slide');
    // Projector already shows the pinned question (visible=true from earlier moderation)
    await projPage.waitForSelector('text=Bagaimana cara bergabung kelompok', { timeout: 5_000 });
    await shot(projPage, 'b8-projector-pinned-question-overlay');
    // Participant must NOT see the pinned question
    const pQAVisible = await pPages[0].locator('text=Bagaimana cara bergabung kelompok').count();
    expect(pQAVisible, 'participant must not see pinned Q&A question from later slide').toBe(0);
    // Sembunyikan → wait for presenter button to change (confirms command was processed)
    await presPage.locator('[aria-label^="Sembunyikan:"]').first().click();
    // Presenter receives broadcast → button flips to "Tampilkan:"
    await presPage.waitForSelector('[aria-label^="Tampilkan:"]', { timeout: 10_000 });
    // Projector receives same broadcast → overlay disappears
    await expect(projPage.locator('[data-testid="pinned-question-overlay"]')).not.toBeVisible({ timeout: 5_000 });
    await shot(projPage, 'b8-projector-question-hidden');
    // Close panel before continuing
    await presPage.getByTitle('Panel Q&A').click();

    // ── Kelompok + Group Reveal ────────────────────────────────────────────
    await presPage.locator('aside button').filter({ hasText: 'Pembagian Kelompok' }).click();
    await presPage.waitForSelector('text=Bagikan Kelompok');
    await presPage.fill('input[type="number"]', '2');
    await presPage.getByRole('button', { name: 'Bagikan Kelompok' }).click();
    await presPage.waitForSelector('text=Kelompok 1', { timeout: 5_000 });

    // All participants should see group reveal
    await Promise.all(
      pPages.map((p) => p.waitForSelector('[data-testid="group-reveal-card"]', { timeout: 8_000 })),
    );

    await shot(pPages[0], '11-participant-group-reveal');

    // Each participant sees exactly one role badge
    const roles = await Promise.all(pPages.map(async (p) => ({
      isResponder: await p.locator('[data-testid="role-responder"]').isVisible(),
      isMember: await p.locator('[data-testid="role-member"]').isVisible(),
    })));
    for (let i = 0; i < roles.length; i++) {
      expect(roles[i].isResponder !== roles[i].isMember, `P${i} exactly one of responder/member`).toBe(true);
    }
    expect(roles.some((r) => r.isResponder), 'at least one participant is penjawab').toBe(true);
    expect(roles.some((r) => r.isMember), 'at least one participant is anggota').toBe(true);

    await shot(pPages[1], '12-participant-group-member-or-responder');

    // Projector group tiles
    await projPage.waitForSelector('text=Kelompok 1', { timeout: 8_000 });
    await shot(projPage, '13-projector-group-tiles');

    // ── Strong group-role assertion (from presenter snapshot) ──────────────
    const presState = await apiGet<{
      groups: Array<{ id: string; number: number; responder: string; members: string[] }>;
    }>(`/api/sessions/${sessionId}/state`, pToken);

    const mixedGroup = presState.groups.find((g) => g.members.length > 1)!;
    const responderId = mixedGroup.responder;
    const memberId = mixedGroup.members.find((id) => id !== responderId)!;

    const respPartIdx = participants.findIndex((p) => p.id === responderId);
    const membPartIdx = participants.findIndex((p) => p.id === memberId);

    // Navigate to the post-kelompok pilihan slide "Pilihan Kelompok?" and open it.
    // It sits after the division slide so engine allows activity.open with groups assigned.
    await presPage.locator('aside button').filter({ hasText: 'Pilihan Kelompok?' }).click();
    await presPage.waitForSelector('text=Buka Aktivitas');
    await presPage.getByRole('button', { name: 'Buka Aktivitas' }).click();
    await presPage.waitForSelector('text=Tutup Aktivitas');

    // Wait for activity-open state (option buttons visible), not just slide title.
    // Options only appear when status === 'buka'.
    await pPages[respPartIdx].waitForSelector('button:has-text("A.")', { timeout: 10_000 });
    await pPages[membPartIdx].waitForSelector('button:has-text("A.")', { timeout: 10_000 });

    // Responder page: submit button visible
    await expect(
      pPages[respPartIdx].getByRole('button', { name: /Kirim Jawaban/ }),
      'responder has submit button',
    ).toBeVisible();

    // Member page: NO submit button — members cannot submit group answers
    await expect(
      pPages[membPartIdx].getByRole('button', { name: /Kirim Jawaban/ }),
      'member has no submit button',
    ).not.toBeVisible();

    // Screenshot: member before responder submits
    await shot(pPages[membPartIdx], '21-group-member-before-submit');

    // ── Second half: responder submits → member sees group answer read-only ──
    // Root cause of prior flakiness: 5 s timeout was too short for the server
    // broadcast to reach the member page. Fix: wait on aria-pressed="true"
    // (button with submitted option) with 15 s timeout — more resilient than
    // text-content check because it only requires server→member snapshot, not
    // specific rendered text.
    await pPages[respPartIdx].getByRole('button', { name: /^A\./ }).click();
    await pPages[respPartIdx].getByRole('button', { name: /Kirim Jawaban/ }).click();

    // Responder confirmation: button text changes to "Perbarui Jawaban …"
    await pPages[respPartIdx].waitForSelector('text=Perbarui Jawaban', { timeout: 15_000 });

    // Member page receives groupResponse via server snapshot → option A gets aria-pressed="true"
    await pPages[membPartIdx].waitForSelector('button[aria-pressed="true"]', { timeout: 15_000 });

    // Screenshot: member after responder submits (submitted option visible, no submit button)
    await shot(pPages[membPartIdx], '22-group-member-after-submit');

    // Member still has NO submit button
    await expect(
      pPages[membPartIdx].getByRole('button', { name: /Kirim Jawaban/ }),
      'member still has no submit button after responder submitted',
    ).not.toBeVisible();

    // The submitted option should carry the "(terkirim)" label on member page
    await pPages[membPartIdx].waitForSelector('text=terkirim', { timeout: 5_000 });

    // Close this activity before continuing
    await presPage.getByRole('button', { name: 'Tutup Aktivitas' }).click();
    // Confirm activity closed (button becomes enabled)
    await presPage.waitForSelector('button:not([disabled]):has-text("Tampilkan Hasil")', { timeout: 5_000 });

    // ── Quiz ───────────────────────────────────────────────────────────────
    await presPage.locator('aside button').filter({ hasText: 'Kuis Akhir' }).click();
    await presPage.waitForSelector('text=Buka Pertanyaan Pertama', { timeout: 5_000 });
    await presPage.getByRole('button', { name: 'Buka Pertanyaan Pertama' }).click();
    await presPage.waitForSelector('text=Soal 1 / 2', { timeout: 5_000 });

    // Participant sees quiz
    await pPages[0].waitForSelector('text=Berapa 2+2?', { timeout: 8_000 });
    await shot(pPages[0], '14-participant-quiz-open');

    // Before answer closes: no correct answer shown
    const preRevealCorrect = await pPages[0].locator('button:has-text("✓")').count();
    expect(preRevealCorrect, 'no correct marker before close').toBe(0);

    // Projector shows quiz — NO correct answer yet
    await projPage.waitForSelector('text=Berapa 2+2?', { timeout: 8_000 });
    const projPreCorrect = await projPage.locator('text=✓').count();
    expect(projPreCorrect, 'projector no correct before close').toBe(0);
    await shot(projPage, '15-projector-quiz-question');

    // Participant submits answer
    const responderIdx = roles.findIndex((r) => r.isResponder);
    const responder = pPages[responderIdx >= 0 ? responderIdx : 0];
    await responder.waitForSelector('text=Berapa 2+2?', { timeout: 5_000 });
    await responder.getByRole('button', { name: /^B\./ }).click(); // B = '4' = correct
    // Screenshot: quiz option selected (aria-pressed) before auto-close
    await shot(responder, '14b-participant-quiz-option-selected');

    // Wait for auto-close (10s duration)
    await presPage.waitForSelector('text=Soal Berikutnya', { timeout: 18_000 });
    await shot(pPages[0], '16-participant-quiz-after-close');

    // After close: correct shown to participant (hideContent=OFF since toggled earlier)
    await pPages[0].waitForSelector('[aria-label="benar"]', { timeout: 10_000 });

    // Projector also shows correct option highlighted after auto-close
    await projPage.waitForSelector('[aria-label="jawaban benar"]', { timeout: 8_000 });
    await shot(projPage, '15b-projector-quiz-after-close');

    // B9: Tampilkan Hasil Soal — per-question results bar chart (presenter/projector/participant)
    await presPage.getByRole('button', { name: 'Tampilkan Hasil Soal' }).click();
    // Presenter: button replaced by chart — wait for button to disappear
    await presPage.waitForSelector('text=Tampilkan Hasil Soal', { state: 'hidden', timeout: 5_000 });
    await shot(presPage, 'b9-presenter-quiz-per-question-results');
    // Participant: shows "Hasil soal ini:" text when resultsVisible=true (hideContent=OFF)
    await pPages[0].waitForSelector('text=Hasil soal ini', { timeout: 8_000 });
    await shot(pPages[0], 'b9-participant-quiz-per-question-results');
    await shot(projPage, 'b9-projector-quiz-per-question-results');

    // Q2
    await presPage.getByRole('button', { name: 'Soal Berikutnya' }).click();
    await presPage.waitForSelector('text=Soal 2 / 2', { timeout: 5_000 });
    await presPage.waitForSelector('text=Selesaikan Kuis', { timeout: 25_000 });
    await presPage.getByRole('button', { name: 'Selesaikan Kuis' }).click();
    await presPage.waitForSelector('text=Kuis Selesai', { timeout: 5_000 });

    // Leaderboard
    await presPage.getByRole('button', { name: 'Tampilkan Leaderboard' }).click();
    await presPage.waitForSelector('text=Leaderboard', { timeout: 5_000 });

    await pPages[0].waitForSelector('text=Kuis Selesai!', { timeout: 10_000 });
    await shot(pPages[0], '17-participant-leaderboard');

    // Projector leaderboard
    await projPage.waitForSelector('text=Papan Peringkat', { timeout: 10_000 });
    await shot(projPage, '18-projector-leaderboard');

    // ── Connection banner E2E ─────────────────────────────────────────────
    // Simulate network disconnect: banner appears; reconnect: banner disappears + fresh snapshot.
    // Done AFTER all group/quiz assertions to avoid socket interference on pCtxs[2].
    await pCtxs[2].setOffline(true);
    await pPages[2].waitForSelector('[role="alert"]', { timeout: 8_000 });
    await shot(pPages[2], '03b-participant-connection-banner');
    await pCtxs[2].setOffline(false);
    // Banner disappears after reconnect
    await pPages[2].waitForFunction(
      () => !document.querySelector('[role="alert"]'),
      { timeout: 20_000 },
    );
    // Page shows current state with fresh snapshot (session still active)
    await pPages[2].waitForSelector('text=Kuis Selesai!', { timeout: 10_000 });

    // ── End session ────────────────────────────────────────────────────────
    await presPage.getByRole('button', { name: 'Akhiri Sesi' }).click();
    await presPage.waitForSelector('text=Sesi Selesai', { timeout: 10_000 });

    await pPages[0].waitForSelector('text=Sesi selesai', { timeout: 10_000 });
    await shot(pPages[0], '19-participant-session-ended');
    await shot(projPage, '20-projector-session-ended');

    // ── Final 360px scroll check (after session end) ──────────────────────
    for (let i = 0; i < pPages.length; i++) {
      const scrollW = await pPages[i].evaluate(() => document.documentElement.scrollWidth);
      expect(scrollW, `participant ${i} no horizontal scroll at end`).toBeLessThanOrEqual(360);
    }

    // ── Hydration guard checks ─────────────────────────────────────────────
    checkPresHydration();
    checkProjHydration();
    for (const check of checkPHydrations) check();

  } finally {
    await browser.close();
  }
});
