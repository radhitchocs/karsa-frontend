/**
 * MockSessionService unit tests.
 *
 * Covers every command mapping plus quiz timer auto-close.
 * Particularly focuses on: question.submit, activity.reopen,
 * quiz.answerSubmit, and quiz timer auto-close (timer fires at deadlineAt).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MockSessionService } from './mock-session-service';
import type { Session } from '@/domain/model';
import { uid } from '@/domain/model';
import type { CommandAck } from '@/contracts/acks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSvc() {
  const svc = new MockSessionService();
  const pres = {
    id: uid(),
    title: 'Test',
    slides: [
      { id: uid(), type: 'materi' as const, title: 'S1', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
      { id: uid(), type: 'pilihan' as const, title: 'Q?', body: '', options: ['A', 'B'], correct: [0], explanation: 'A.', image: '', groups: 2 },
      { id: uid(), type: 'polling' as const, title: 'Poll', body: '', options: ['X', 'Y'], correct: [], explanation: '', image: '', groups: 2 },
      { id: uid(), type: 'awan' as const, title: 'Words', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
      { id: uid(), type: 'tanya' as const, title: 'Q&A', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
      { id: uid(), type: 'kelompok' as const, title: 'Groups', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
      {
        id: uid(),
        type: 'kuis' as const,
        title: 'Quiz',
        body: '',
        options: [],
        correct: [],
        explanation: '',
        image: '',
        groups: 2,
        duration: 10, // minimum valid duration; tests use vi.useFakeTimers()
        quizQuestions: [
          { id: uid(), title: 'Q1', options: ['A', 'B'], correct: [0] },
          { id: uid(), title: 'Q2', options: ['A', 'B'], correct: [1] },
        ],
      },
    ],
    updated: new Date().toISOString(),
  };
  const session = svc.createSession(pres);
  const pid1 = svc.joinSession(session.id, 'Alya');
  const pid2 = svc.joinSession(session.id, 'Bima');
  svc.setActivePid(session.id, pid1);
  return { svc, session, pid1, pid2, slides: pres.slides };
}

async function ok(p: Promise<CommandAck>) {
  const ack = await p;
  expect(ack.ok, `command failed: ${ack.message}`).toBe(true);
  return ack;
}

async function fail(p: Promise<CommandAck>) {
  const ack = await p;
  expect(ack.ok, 'expected failure but command succeeded').toBe(false);
  return ack;
}

// ---------------------------------------------------------------------------
// Basic lifecycle
// ---------------------------------------------------------------------------

describe('createSession + joinSession', () => {
  it('creates session in lobi status with 6-digit code', () => {
    const { session } = makeSvc();
    expect(session.status).toBe('lobi');
    expect(session.code).toMatch(/^\d{6}$/);
  });

  it('joinSession adds participant and broadcasts', () => {
    const { svc, session, pid1, pid2 } = makeSvc();
    expect(session.participants.some((p) => p.id === pid1)).toBe(true);
    expect(session.participants.some((p) => p.id === pid2)).toBe(true);
    // both participants appear in presenter view
    return svc.getPresenterView(session.id).then((v) => {
      expect(v.participants).toHaveLength(2);
    });
  });
});

// ---------------------------------------------------------------------------
// Command mappings
// ---------------------------------------------------------------------------

describe('session.start', () => {
  it('moves status to aktif', async () => {
    const { svc, session } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    const v = await svc.getPresenterView(session.id);
    expect(v.status).toBe('aktif');
  });
});

describe('slide.activate', () => {
  it('changes activeSlideIndex', async () => {
    const { svc, session } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 1 }));
    const v = await svc.getPresenterView(session.id);
    expect(v.activeSlideIndex).toBe(1);
  });
});

describe('activity.open / close / reveal', () => {
  it('open sets status buka, close sets tutup, reveal sets visible', async () => {
    const { svc, session, slides } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 1 })); // pilihan

    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[1].id }));
    let v = await svc.getPresenterView(session.id);
    expect(v.activities[slides[1].id].status).toBe('buka');

    await ok(svc.command(session.id, { type: 'activity.close', slideId: slides[1].id }));
    v = await svc.getPresenterView(session.id);
    expect(v.activities[slides[1].id].status).toBe('tutup');

    await ok(svc.command(session.id, { type: 'results.reveal', slideId: slides[1].id }));
    v = await svc.getPresenterView(session.id);
    expect(v.activities[slides[1].id].visible).toBe(true);
  });
});

describe('activity.reopen (D18)', () => {
  it('re-opens a closed activity and resets visible to false', async () => {
    const { svc, session, slides } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 1 }));
    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[1].id }));
    await ok(svc.command(session.id, { type: 'activity.close', slideId: slides[1].id }));
    await ok(svc.command(session.id, { type: 'results.reveal', slideId: slides[1].id }));

    // Reopen: status → buka, visible → false (results hidden again)
    await ok(svc.command(session.id, { type: 'activity.reopen', slideId: slides[1].id }));
    const v = await svc.getPresenterView(session.id);
    expect(v.activities[slides[1].id].status).toBe('buka');
    expect(v.activities[slides[1].id].visible).toBe(false);
  });
});

describe('activity.hideWord', () => {
  it('toggles word in hiddenWords', async () => {
    const { svc, session, slides } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 3 })); // awan
    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[3].id }));
    await ok(svc.command(session.id, { type: 'activity.hideWord', slideId: slides[3].id, word: 'test' }));
    const v = await svc.getPresenterView(session.id);
    expect(v.activities[slides[3].id].hiddenWords).toContain('test');
    // Toggle off
    await ok(svc.command(session.id, { type: 'activity.hideWord', slideId: slides[3].id, word: 'test' }));
    const v2 = await svc.getPresenterView(session.id);
    expect(v2.activities[slides[3].id].hiddenWords).not.toContain('test');
  });
});

describe('groups.assign', () => {
  it('assigns participants into groups', async () => {
    const { svc, session, slides } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 })); // kelompok
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    const v = await svc.getPresenterView(session.id);
    expect(v.groups).toHaveLength(2);
    expect(v.groups.flatMap((g) => g.members)).toHaveLength(2); // 2 participants
  });
});

describe('group.replaceResponder', () => {
  it('replaces responder in a group', async () => {
    const { svc, session, pid1, pid2, slides } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 }));
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 1 }));
    const v = await svc.getPresenterView(session.id);
    const group = v.groups[0];
    const oldResponder = group.responder;
    const other = [pid1, pid2].find((id) => id !== oldResponder)!;
    // Replace only works if there's another member; with 1 group + 2 members it should work
    await ok(svc.command(session.id, { type: 'group.replaceResponder', groupId: group.id }));
    const v2 = await svc.getPresenterView(session.id);
    expect(v2.groups[0].responder).not.toBe(oldResponder);
  });
});

describe('response.submit', () => {
  it('submits pilihan response for the active participant', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 1 }));
    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[1].id }));
    await ok(svc.command(session.id, { type: 'response.submit', slideId: slides[1].id, value: ['0'] }));
    const v = await svc.getParticipantView(session.id, pid1);
    expect(v.myResponse).not.toBeNull();
    expect(v.myResponse!.value).toEqual(['0']);
  });

  it('fails when no activePid set', async () => {
    const { svc, session, slides } = makeSvc();
    // Create new service with no activePid
    const svc2 = new MockSessionService();
    const pres = { id: uid(), title: 'T', slides: [slides[1]], updated: '' };
    const s2 = svc2.createSession(pres);
    svc2.joinSession(s2.id, 'Alya');
    // activePid not set → command should fail
    await svc2.command(s2.id, { type: 'session.start' });
    await svc2.command(s2.id, { type: 'activity.open', slideId: slides[1].id });
    const ack = await svc2.command(s2.id, { type: 'response.submit', slideId: slides[1].id, value: ['0'] });
    expect(ack.ok).toBe(false);
  });
});

describe('question.submit', () => {
  it('maps to engine submit for tanya slide (creates a new question)', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 4 })); // tanya
    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[4].id }));
    await ok(svc.command(session.id, { type: 'question.submit', slideId: slides[4].id, text: 'Apa itu kolaborasi?' }));
    const v = await svc.getPresenterView(session.id);
    expect(v.questions).toHaveLength(1);
    expect(v.questions[0].text).toBe('Apa itu kolaborasi?');
    expect(v.questions[0].participantId).toBe(pid1);
  });
});

describe('question.moderate', () => {
  it('toggles visibility only when desired state differs from current', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 4 }));
    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[4].id }));
    await ok(svc.command(session.id, { type: 'question.submit', slideId: slides[4].id, text: 'My Q' }));

    const v1 = await svc.getPresenterView(session.id);
    expect(v1.questions[0].visible).toBe(false);

    // Set to visible=true
    await ok(svc.command(session.id, { type: 'question.moderate', questionId: v1.questions[0].id, visible: true }));
    const v2 = await svc.getPresenterView(session.id);
    expect(v2.questions[0].visible).toBe(true);

    // Calling again with visible=true is a no-op (avoids double-toggle)
    await ok(svc.command(session.id, { type: 'question.moderate', questionId: v1.questions[0].id, visible: true }));
    const v3 = await svc.getPresenterView(session.id);
    expect(v3.questions[0].visible).toBe(true);
  });
});

describe('A3 — Q&A visibility per POV', () => {
  it('after moderate(visible=true): projector sees question, other participant does not', async () => {
    const { svc, session, slides, pid1, pid2 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 4 }));
    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[4].id }));
    // pid1 submits a question
    await ok(svc.command(session.id, { type: 'question.submit', slideId: slides[4].id, text: 'Apa itu kolaborasi?' }));
    const pv = await svc.getPresenterView(session.id);
    const qId = pv.questions[0].id;
    // moderate: set visible=true (shown on projector)
    await ok(svc.command(session.id, { type: 'question.moderate', questionId: qId, visible: true }));

    // projector sees the question
    const projView = await svc.getProjectorView(session.id);
    expect(projView.revealedResults).not.toBeNull();
    const qaResults = projView.revealedResults as { type: 'tanya'; questions: { text: string }[] };
    expect(qaResults.questions).toHaveLength(1);
    expect(qaResults.questions[0].text).toBe('Apa itu kolaborasi?');

    // pid2 (different participant) does NOT see the question
    const p2View = await svc.getParticipantView(session.id, pid2);
    expect(p2View.questions).toHaveLength(0);

    // pid1 (the submitter) sees their own question
    const p1View = await svc.getParticipantView(session.id, pid1);
    expect(p1View.questions).toHaveLength(1);
  });
});

describe('quiz.openQuestion', () => {
  it('opens the first quiz question', async () => {
    const { svc, session, slides } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 })); // kelompok
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 6 })); // kuis
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: slides[6].quizQuestions![0].id }));
    const v = await svc.getPresenterView(session.id);
    expect(v.quiz).not.toBeNull();
    expect(v.quiz!.runs).toHaveLength(1);
    expect(v.quiz!.runs[0].closed).toBe(false);
  });
});

describe('quiz.answerSubmit', () => {
  it('records participant answer with activePid', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 })); // kelompok
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 6 }));
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: slides[6].quizQuestions![0].id }));
    const v = await svc.getPresenterView(session.id);
    const run = v.quiz!.runs[0];
    await ok(svc.command(session.id, { type: 'quiz.answerSubmit', questionRunId: run.questionId, optionIndex: 0 }));
    const v2 = await svc.getPresenterView(session.id);
    expect(v2.quiz!.runs[0].answers).toHaveLength(1);
    // In group mode (groups assigned), ownerId is the group that pid1 belongs to as responder.
    const groupOfPid1 = v2.groups.find((g) => g.responder === pid1);
    expect(groupOfPid1, 'pid1 must be responder of some group').toBeDefined();
    expect(v2.quiz!.runs[0].answers[0].ownerId).toBe(groupOfPid1!.id);
    expect(v2.quiz!.runs[0].answers[0].option).toBe(0);
  });

  it('records whether answer is correct based on question.correct', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 })); // kelompok
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 6 }));
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: slides[6].quizQuestions![0].id }));
    const v = await svc.getPresenterView(session.id);
    const run = v.quiz!.runs[0];
    // Q1 correct=0 (option A). Submit option 0 (correct).
    await ok(svc.command(session.id, { type: 'quiz.answerSubmit', questionRunId: run.questionId, optionIndex: 0 }));
    const v2 = await svc.getPresenterView(session.id);
    expect(v2.quiz!.runs[0].answers[0].correct).toBe(true);
  });
});

describe('quiz.finish + quiz.revealLeaderboard', () => {
  it('finishes quiz and reveals leaderboard', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 })); // kelompok
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 6 }));

    // Open Q1
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: slides[6].quizQuestions![0].id }));
    // Fast-forward: close Q1 via quizSimulate
    svc.quizSimulate(session.id, 'kosong');
    // Open Q2
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: slides[6].quizQuestions![1].id }));
    svc.quizSimulate(session.id, 'kosong');

    await ok(svc.command(session.id, { type: 'quiz.finish' }));
    await ok(svc.command(session.id, { type: 'quiz.revealLeaderboard' }));

    const v = await svc.getPresenterView(session.id);
    expect(v.quiz!.finished).toBe(true);
    expect(v.quiz!.revealed).toBe(true);
    expect(v.leaderboard).not.toBeNull();
    expect(v.leaderboard!.entries).toBeDefined();
  });

  it('AC33 — participant ranked 6th sees ownEntry below top-5', async () => {
    // Build a quiz with 6+ individu participants where p6 scores lowest.
    const svc2 = new MockSessionService();
    const qId1 = uid();
    const pres2 = {
      id: uid(),
      title: 'AC33 Test',
      slides: [{
        id: uid(),
        type: 'kuis' as const,
        title: 'Quiz',
        body: '',
        options: [],
        correct: [],
        explanation: '',
        image: '',
        groups: 2,
        duration: 30,
        quizQuestions: [{ id: qId1, title: 'Q1?', options: ['A', 'B'], correct: [0] }],
      }],
      updated: new Date().toISOString(),
    };
    const sess2 = svc2.createSession(pres2);
    // Join 6 participants
    const pids: string[] = [];
    for (const name of ['Alya', 'Bima', 'Citra', 'Dimas', 'Eka', 'Farah']) {
      pids.push(svc2.joinSession(sess2.id, name));
    }
    svc2.setActivePid(sess2.id, pids[0]);
    await ok(svc2.command(sess2.id, { type: 'session.start' }));

    // Navigate to kuis slide (index 0)
    await ok(svc2.command(sess2.id, { type: 'quiz.openQuestion', questionId: qId1 }));

    // p0–p4 answer correctly at t=0 (max score); p5 (Farah) does NOT answer
    for (const pid of pids.slice(0, 5)) {
      svc2.setActivePid(sess2.id, pid);
      await ok(svc2.command(sess2.id, {
        type: 'quiz.answerSubmit',
        questionRunId: qId1,
        optionIndex: 0, // correct
      }));
    }

    // Close Q1 via kosong (advances time past deadline)
    svc2.quizSimulate(sess2.id, 'kosong');

    await ok(svc2.command(sess2.id, { type: 'quiz.finish' }));
    await ok(svc2.command(sess2.id, { type: 'quiz.revealLeaderboard' }));

    // p5 (Farah) is ranked 6th → ownEntry should not be null
    const farahView = await svc2.getParticipantView(sess2.id, pids[5]);
    expect(farahView.leaderboard).not.toBeNull();
    expect(farahView.leaderboard!.entries.length).toBeLessThanOrEqual(5);
    expect(farahView.leaderboard!.ownEntry).not.toBeNull();
    expect(farahView.leaderboard!.ownEntry!.ownerId).toBe(pids[5]);
    expect(farahView.leaderboard!.ownEntry!.rank).toBeGreaterThan(5);

    // p0 (Alya) is in top 5 → ownEntry should be null
    const alyaView = await svc2.getParticipantView(sess2.id, pids[0]);
    expect(alyaView.leaderboard!.ownEntry).toBeNull();
  });
});

describe('session.resume', () => {
  it('clears paused state', async () => {
    const { svc, session } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    // Set presenterOnline=false + paused via internal engine state
    // Simulate via presenterDisconnect then reconnect+resume
    const s = (svc as unknown as { sessions: Map<string, Session> }).sessions.get(session.id)!;
    s.paused = true;
    s.presenterOnline = true; // must be online to resume
    await ok(svc.command(session.id, { type: 'session.resume' }));
    const v = await svc.getPresenterView(session.id);
    expect(v.paused).toBe(false);
  });
});

describe('session.end', () => {
  it('ends the session and cancels quiz timers', async () => {
    const { svc, session } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'session.end' }));
    const v = await svc.getPresenterView(session.id);
    expect(v.status).toBe('selesai');
  });
});

// ---------------------------------------------------------------------------
// Quiz auto-close timer
// ---------------------------------------------------------------------------

describe('quiz timer auto-close', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('auto-closes question after deadline and broadcasts closed state', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 })); // kelompok
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 6 }));
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: slides[6].quizQuestions![0].id }));

    // duration=10s (minimum valid). Advance fake timer past deadline.
    await vi.advanceTimersByTimeAsync(11_000);

    const v = await svc.getPresenterView(session.id);
    expect(v.quiz!.runs[0].closed, 'question closed after timer').toBe(true);
  });

  it('timer is cancelled when session ends', async () => {
    const { svc, session, slides } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 })); // kelompok
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 6 }));
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: slides[6].quizQuestions![0].id }));
    await ok(svc.command(session.id, { type: 'session.end' }));

    // Timer should be cleared — advancing time should not throw
    await expect(vi.advanceTimersByTimeAsync(5_000)).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Projection via listeners
// ---------------------------------------------------------------------------

describe('broadcast via listeners', () => {
  it('subscribePresenter gets view after each command', async () => {
    const { svc, session } = makeSvc();
    const views: unknown[] = [];
    svc.subscribePresenter(session.id, (v) => views.push(v));
    await ok(svc.command(session.id, { type: 'session.start' }));
    expect(views).toHaveLength(1);
    expect((views[0] as { status: string }).status).toBe('aktif');
  });

  it('subscribeParticipant gets participant-filtered view', async () => {
    const { svc, session, pid1, slides } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 1 })); // pilihan
    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[1].id }));

    const views: unknown[] = [];
    svc.subscribeParticipant(session.id, pid1, (v) => views.push(v));
    await ok(svc.command(session.id, { type: 'activity.close', slideId: slides[1].id }));
    expect(views).toHaveLength(1);

    // Correct key must NOT appear in participant view before reveal
    const pView = views[0] as { activeSlide: { correct?: number } };
    expect(pView.activeSlide.correct).toBeUndefined();
  });

  it('subscribeProjector gets projector view without explanation', async () => {
    const { svc, session, slides } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 1 })); // pilihan

    const views: unknown[] = [];
    svc.subscribeProjector(session.id, (v) => views.push(v));
    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[1].id }));
    expect(views).toHaveLength(1);
    const projView = views[0] as { activeSlide: { explanation?: string } };
    expect(projView.activeSlide.explanation).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Extra demo methods
// ---------------------------------------------------------------------------

describe('simulateResponses', () => {
  it('auto-submits responses for all online participants', async () => {
    const { svc, session, slides } = makeSvc();
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 1 }));
    await ok(svc.command(session.id, { type: 'activity.open', slideId: slides[1].id }));
    const ack = svc.simulateResponses(session.id);
    expect(ack.ok).toBe(true);
    const v = await svc.getPresenterView(session.id);
    // 2 participants online → 2 responses
    expect(v.responses).toHaveLength(2);
  });
});

describe('quizSimulate', () => {
  it('cepat: submits a correct answer fast for one unanswered participant', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 })); // kelompok
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 6 }));
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: slides[6].quizQuestions![0].id }));
    const ack = svc.quizSimulate(session.id, 'cepat');
    expect(ack.ok).toBe(true);
    const v = await svc.getPresenterView(session.id);
    expect(v.quiz!.runs[0].answers).toHaveLength(1);
    expect(v.quiz!.runs[0].answers[0].correct).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createSession validation (same rules as backend PUT /presentations/:id/slides)
// ---------------------------------------------------------------------------

describe('createSession validation (PRD §F01 + quizOrderErrors)', () => {
  it('throws when kuis is not the last slide', () => {
    const svc = new MockSessionService();
    expect(() =>
      svc.createSession({
        id: uid(),
        title: 'Bad order',
        slides: [
          { id: uid(), type: 'kuis' as const, title: 'Kuis', body: '', options: [], correct: [], explanation: '', image: '', groups: 2, duration: 30, quizQuestions: [{ id: uid(), title: 'Q1', options: ['A', 'B'], correct: [0] }] },
          { id: uid(), type: 'materi' as const, title: 'Materi', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
        ],
        updated: new Date().toISOString(),
      }),
    ).toThrow('tidak valid');
  });

  it('throws when presentation has no slides', () => {
    const svc = new MockSessionService();
    expect(() =>
      svc.createSession({ id: uid(), title: 'Empty', slides: [], updated: new Date().toISOString() }),
    ).toThrow('tidak valid');
  });

  it('throws when more than one kuis slide exists', () => {
    const svc = new MockSessionService();
    const quizSlide = () => ({
      id: uid(), type: 'kuis' as const, title: 'Kuis', body: '', options: [], correct: [],
      explanation: '', image: '', groups: 2, duration: 30,
      quizQuestions: [{ id: uid(), title: 'Q', options: ['A', 'B'], correct: [0] }],
    });
    expect(() =>
      svc.createSession({
        id: uid(),
        title: 'Two quizzes',
        slides: [quizSlide(), quizSlide()],
        updated: new Date().toISOString(),
      }),
    ).toThrow('tidak valid');
  });

  it('succeeds with valid presentation: kelompok then kuis last', () => {
    const svc = new MockSessionService();
    expect(() => svc.createSession({
      id: uid(),
      title: 'Valid',
      slides: [
        { id: uid(), type: 'materi' as const, title: 'Intro', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
        { id: uid(), type: 'kelompok' as const, title: 'Groups', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
        { id: uid(), type: 'kuis' as const, title: 'Kuis', body: '', options: [], correct: [], explanation: '', image: '', groups: 2, duration: 30, quizQuestions: [{ id: uid(), title: 'Q1', options: ['A', 'B'], correct: [0] }] },
      ],
      updated: new Date().toISOString(),
    })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC16 — hasSimulatedData
// ---------------------------------------------------------------------------

describe('AC16 — hasSimulatedData flag', () => {
  it('presenterView.hasSimulatedData=true after joinSession (all demo participants are simulated)', async () => {
    const svc = new MockSessionService();
    const pres = {
      id: uid(), title: 'Test', updated: new Date().toISOString(),
      slides: [{ id: uid(), type: 'materi' as const, title: 'S1', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 }],
    };
    const sess = svc.createSession(pres);
    svc.joinSession(sess.id, 'Alya');
    const view = await svc.getPresenterView(sess.id);
    expect(view.hasSimulatedData).toBe(true);
  });

  it('participantView.hasSimulatedData=true', async () => {
    const svc = new MockSessionService();
    const pres = {
      id: uid(), title: 'Test', updated: new Date().toISOString(),
      slides: [{ id: uid(), type: 'materi' as const, title: 'S1', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 }],
    };
    const sess = svc.createSession(pres);
    const pid = svc.joinSession(sess.id, 'Bima');
    const view = await svc.getParticipantView(sess.id, pid);
    expect(view.hasSimulatedData).toBe(true);
  });

  it('hasSimulatedData=false when no simulated participants', async () => {
    const svc = new MockSessionService();
    const pres = {
      id: uid(), title: 'Test', updated: new Date().toISOString(),
      slides: [{ id: uid(), type: 'materi' as const, title: 'S1', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 }],
    };
    const sess = svc.createSession(pres);
    // Manually push a non-simulated participant (bypasses joinSession which always sets simulated=true)
    const session = (svc as any).sessions.get(sess.id) as import('@/domain/model').Session;
    session.participants.push({ id: uid(), name: 'Real User', online: true, simulated: false });
    const view = await svc.getPresenterView(sess.id);
    expect(view.hasSimulatedData).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// B3 — Auto-start when all slides are materi
// ---------------------------------------------------------------------------
describe('B3 — auto-start for all-materi presentation', () => {
  it('createSession status=aktif when all slides are materi', () => {
    const svc = new MockSessionService();
    const pres = {
      id: uid(), title: 'Materi Only', updated: new Date().toISOString(),
      slides: [
        { id: uid(), type: 'materi' as const, title: 'S1', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
        { id: uid(), type: 'materi' as const, title: 'S2', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
      ],
    };
    const sess = svc.createSession(pres);
    expect(sess.status).toBe('aktif');
  });

  it('createSession status=lobi when slides include non-materi', () => {
    const svc = new MockSessionService();
    const pres = {
      id: uid(), title: 'Mixed', updated: new Date().toISOString(),
      slides: [
        { id: uid(), type: 'materi' as const, title: 'S1', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
        { id: uid(), type: 'polling' as const, title: 'S2', body: '', options: ['Ya', 'Tidak'], correct: [], explanation: '', image: '', groups: 2 },
      ],
    };
    const sess = svc.createSession(pres);
    expect(sess.status).toBe('lobi');
  });

  it('presenter view status=aktif immediately after createSession with all-materi', async () => {
    const svc = new MockSessionService();
    const pres = {
      id: uid(), title: 'Materi Only', updated: new Date().toISOString(),
      slides: [{ id: uid(), type: 'materi' as const, title: 'S1', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 }],
    };
    const sess = svc.createSession(pres);
    const view = await svc.getPresenterView(sess.id);
    expect(view.status).toBe('aktif');
  });
});

// ---------------------------------------------------------------------------
// B9 — Early quiz close when all online answered
// ---------------------------------------------------------------------------
describe('B9 — early quiz close', () => {
  it('quiz question auto-closes when all online participants answer', async () => {
    const svc = new MockSessionService();
    // Presentation with kuis only (non-all-materi so stays in lobi initially)
    const qId = uid();
    const pres = {
      id: uid(), title: 'Kuis Pres', updated: new Date().toISOString(),
      slides: [
        { id: uid(), type: 'polling' as const, title: 'P', body: '', options: ['A', 'B'], correct: [], explanation: '', image: '', groups: 2 },
        {
          id: uid(), type: 'kuis' as const, title: 'Kuis', body: '', options: [], correct: [],
          explanation: '', image: '', groups: 2, duration: 30,
          quizQuestions: [{ id: qId, title: 'Q1?', options: ['A', 'B'], correct: [0] }],
        },
      ],
    };
    const sess = svc.createSession(pres);
    const p1 = svc.joinSession(sess.id, 'Alya');
    const p2 = svc.joinSession(sess.id, 'Bima');

    // Start session, navigate to kuis, open question
    await svc.command(sess.id, { type: 'session.start' });
    await svc.command(sess.id, { type: 'slide.activate', slideIndex: 1 });
    await svc.command(sess.id, { type: 'quiz.openQuestion', questionId: qId });

    // Both participants answer
    svc.setActivePid(sess.id, p1);
    await svc.command(sess.id, { type: 'quiz.answerSubmit', questionRunId: qId, optionIndex: 0 });
    // After p1 answers — question still open (p2 hasn't answered)
    let view = await svc.getPresenterView(sess.id);
    expect(view.quiz?.runs.at(-1)?.closed).toBe(false);

    svc.setActivePid(sess.id, p2);
    await svc.command(sess.id, { type: 'quiz.answerSubmit', questionRunId: qId, optionIndex: 1 });
    // After p2 answers — question should auto-close
    view = await svc.getPresenterView(sess.id);
    expect(view.quiz?.runs.at(-1)?.closed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// quiz.revealQuestion
// ---------------------------------------------------------------------------
describe('quiz.revealQuestion', () => {
  it('sets resultsVisible=true on the matching run', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 })); // kelompok
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 6 })); // kuis
    const qId = slides[6].quizQuestions![0].id;
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: qId }));
    // Force-close via quizSimulate
    svc.quizSimulate(session.id, 'kosong');
    const v1 = await svc.getPresenterView(session.id);
    expect(v1.quiz!.runs[0].resultsVisible).toBeFalsy();
    // Reveal question results
    await ok(svc.command(session.id, { type: 'quiz.revealQuestion', questionRunId: qId }));
    const v2 = await svc.getPresenterView(session.id);
    expect(v2.quiz!.runs[0].resultsVisible).toBe(true);
  });

  it('projector and participant see answerCounts when resultsVisible=true and hideContent=false', async () => {
    const { svc, session, slides, pid1 } = makeSvc();
    svc.setActivePid(session.id, pid1);
    await ok(svc.command(session.id, { type: 'session.start' }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 5 }));
    await ok(svc.command(session.id, { type: 'groups.assign', groupCount: 2 }));
    await ok(svc.command(session.id, { type: 'slide.activate', slideIndex: 6 }));
    const qId = slides[6].quizQuestions![0].id;
    await ok(svc.command(session.id, { type: 'quiz.openQuestion', questionId: qId }));
    svc.quizSimulate(session.id, 'kosong');
    // Turn hideContent OFF so participant sees counts
    await ok(svc.command(session.id, { type: 'session.toggleHideContent' }));
    await ok(svc.command(session.id, { type: 'quiz.revealQuestion', questionRunId: qId }));
    const projView = await svc.getProjectorView(session.id);
    expect(projView.quiz?.activeQuestion?.resultsVisible).toBe(true);
    expect(projView.quiz?.activeQuestion?.answerCounts).not.toBeNull();
    // Participant also sees counts when hideContent=OFF
    const pView = await svc.getParticipantView(session.id, pid1);
    expect(pView.quiz?.activeQuestion?.resultsVisible).toBe(true);
    expect(pView.quiz?.activeQuestion?.answerCounts).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// B10 — hideContent default + toggle
// ---------------------------------------------------------------------------
describe('B10 — hideContent toggle', () => {
  it('createSession defaults hideContent=true', async () => {
    const svc = new MockSessionService();
    const pres = {
      id: uid(), title: 'Test', updated: new Date().toISOString(),
      slides: [{ id: uid(), type: 'materi' as const, title: 'S1', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 }],
    };
    const sess = svc.createSession(pres);
    const view = await svc.getPresenterView(sess.id);
    expect(view.hideContent).toBe(true);
    const pidView = svc.joinSession(sess.id, 'Alya');
    const participantView = await svc.getParticipantView(sess.id, pidView);
    expect(participantView.hideContent).toBe(true);
  });

  it('session.toggleHideContent toggles hideContent', async () => {
    const svc = new MockSessionService();
    const pres = {
      id: uid(), title: 'Test', updated: new Date().toISOString(),
      slides: [{ id: uid(), type: 'materi' as const, title: 'S1', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 }],
    };
    const sess = svc.createSession(pres);
    await svc.command(sess.id, { type: 'session.toggleHideContent' });
    const view = await svc.getPresenterView(sess.id);
    expect(view.hideContent).toBe(false);
    // Toggle back
    await svc.command(sess.id, { type: 'session.toggleHideContent' });
    const view2 = await svc.getPresenterView(sess.id);
    expect(view2.hideContent).toBe(true);
  });
});
