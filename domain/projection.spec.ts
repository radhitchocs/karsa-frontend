/**
 * Unit tests for projection functions (projectForProjector, projectForParticipant).
 * Covers Q&A question scoping and B10 (hideContent enforcement).
 */

import { describe, it, expect } from 'vitest';
import { projectForProjector, projectForParticipant } from './projection';
import type { Session } from './model';
import { uid } from './model';
import { quizExecute } from './quiz';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(overrides: Partial<Session> = {}): Session {
  const slideId = uid();
  const tanyaSlideId = uid();
  const materSlideId = uid();
  const pid = uid();
  const qId = uid();
  return {
    id: uid(),
    code: 'ABCD',
    title: 'Test',
    status: 'aktif',
    active: 0,
    division: -1,
    slides: [
      { id: tanyaSlideId, type: 'tanya', title: 'Q&A', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
      { id: materSlideId, type: 'materi', title: 'Materi', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 },
      { id: slideId, type: 'pilihan', title: 'Q?', body: '', options: ['A', 'B'], correct: [0], explanation: 'Exp', image: '', groups: 2 },
    ],
    participants: [{ id: pid, name: 'Alya', online: true, simulated: false }],
    groups: [],
    responses: [],
    questions: [{ id: qId, slideId: tanyaSlideId, participantId: pid, text: 'How does this work?', visible: false, answered: false }],
    activities: {
      [tanyaSlideId]: { status: 'tutup', visible: false, hiddenWords: [] },
      [materSlideId]: { status: 'belum', visible: false, hiddenWords: [] },
      [slideId]: { status: 'belum', visible: false, hiddenWords: [] },
    },
    paused: false,
    presenterOnline: true,
    hideContent: true,
    quiz: null,
    ...overrides,
  } as Session;
}

// ---------------------------------------------------------------------------
// Q&A questions stay on the Q&A slide
// ---------------------------------------------------------------------------

describe('Q&A questions on projector', () => {
  it('visible question is shown on the tanya slide', () => {
    const session = makeSession({ active: 0 });
    session.questions[0].visible = true;
    const view = projectForProjector(session, 1);
    expect(view.revealedResults).toEqual({
      type: 'tanya',
      questions: [{ text: 'How does this work?', answered: false }],
      totalReceived: 1,
    });
  });

  it('visible question does not leak onto other slides', () => {
    const session = makeSession({ active: 1 }); // materi slide
    session.questions[0].visible = true;
    const view = projectForProjector(session, 1);
    expect(view.revealedResults).toBeNull();
    expect(JSON.stringify(view)).not.toContain('How does this work?');
  });
});

// ---------------------------------------------------------------------------
// Awan kata: projector progress counts words, not respondents
// ---------------------------------------------------------------------------
describe('awan responseProgress', () => {
  it('wordsReceived sums every word sent, received still counts responses', () => {
    const awanId = uid();
    const session = makeSession({ active: 3 });
    session.slides.push({ id: awanId, type: 'awan', title: 'Kata?', body: '', options: [], correct: [], explanation: '', image: '', groups: 2 } as Session['slides'][number]);
    session.activities[awanId] = { status: 'buka', visible: false, hiddenWords: ['maju'] };
    session.responses.push(
      { id: uid(), slideId: awanId, ownerType: 'individu', ownerId: 'p1', submittedBy: 'p1', value: ['semangat', 'maju'], updated: '' },
      { id: uid(), slideId: awanId, ownerType: 'individu', ownerId: 'p2', submittedBy: 'p2', value: ['semangat', 'kreatif', 'hebat'], updated: '' },
    );
    const view = projectForProjector(session, 1);
    expect(view.responseProgress).toEqual({ received: 2, total: 1, wordsReceived: 5 });
  });

  it('non-awan slides have no wordsReceived', () => {
    const session = makeSession({ active: 2 }); // pilihan
    const view = projectForProjector(session, 1);
    expect(view.responseProgress).not.toHaveProperty('wordsReceived');
  });
});

// ---------------------------------------------------------------------------
// B10: hideContent enforcement in participant projection
// ---------------------------------------------------------------------------

describe('B10 — hideContent strips results from participant view', () => {
  it('correct key absent from activeSlide when hideContent=true and activity not visible', () => {
    const session = makeSession({ active: 2, hideContent: true }); // pilihan slide
    const pid = session.participants[0].id;
    const view = projectForParticipant(session, pid, 1);
    expect((view.activeSlide as { correct?: number }).correct).toBeUndefined();
  });

  it('correct key absent from activeSlide when hideContent=true even after activity.visible=true', () => {
    const session = makeSession({ active: 2, hideContent: true }); // pilihan slide
    const pilSlideId = session.slides[2].id;
    session.activities[pilSlideId] = { status: 'tutup', visible: true, hiddenWords: [] };
    const pid = session.participants[0].id;
    const view = projectForParticipant(session, pid, 1);
    // effectiveVisible = visible && !hideContent = false
    expect((view.activeSlide as { correct?: number }).correct).toBeUndefined();
    expect(view.activity?.visible).toBe(false);
    expect(view.revealedCounts).toBeNull();
  });

  it('correct key present when hideContent=false and activity visible', () => {
    const session = makeSession({ active: 2, hideContent: false }); // pilihan slide
    const pilSlideId = session.slides[2].id;
    session.activities[pilSlideId] = { status: 'tutup', visible: true, hiddenWords: [] };
    const pid = session.participants[0].id;
    const view = projectForParticipant(session, pid, 1);
    expect((view.activeSlide as { correct?: number[] }).correct).toEqual([0]);
    expect(view.activity?.visible).toBe(true);
    expect(view.revealedCounts).not.toBeNull();
  });

  it('projector sees results regardless of hideContent', () => {
    const session = makeSession({ active: 2, hideContent: true }); // pilihan slide
    const pilSlideId = session.slides[2].id;
    session.activities[pilSlideId] = { status: 'tutup', visible: true, hiddenWords: [] };
    const view = projectForProjector(session, 1);
    // Projector always shows results if activity is visible
    expect(view.revealedResults).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// C7: Multiple correct options — projection highlights all after reveal
// ---------------------------------------------------------------------------

describe('C7 — multiple correct options in projection', () => {
  function makeMultiCorrectSession(correctOpts: number[], hideContent: boolean): Session {
    const pid = uid();
    const slideId = uid();
    const kuisSlideId = uid();
    const qId = uid();
    const session: Session = {
      id: uid(), presentationId: uid(), code: 'ABCD', title: 'Test', created: '', status: 'aktif',
      active: 0, division: -1,
      slides: [{
        id: slideId, type: 'pilihan', title: 'Q?', body: '',
        options: ['A', 'B', 'C'], correct: correctOpts,
        explanation: 'Exp', image: '', groups: 2,
      }],
      participants: [{ id: pid, name: 'Alya', online: true, simulated: false }],
      groups: [], responses: [],
      questions: [],
      activities: {
        [slideId]: { status: 'tutup', visible: true, hiddenWords: [] },
      },
      picks: [],
      paused: false, presenterOnline: true, hideContent,
      quiz: undefined,
    };
    void kuisSlideId; void qId;
    return session;
  }

  it('participant (hideContent=OFF) sees all correct options after reveal', () => {
    const session = makeMultiCorrectSession([0, 2], false);
    const pid = session.participants[0].id;
    const view = projectForParticipant(session, pid, 1);
    expect((view.activeSlide as { correct?: number[] }).correct).toEqual([0, 2]);
  });

  it('participant (hideContent=ON) does not see correct options even after reveal', () => {
    const session = makeMultiCorrectSession([0, 2], true);
    const pid = session.participants[0].id;
    const view = projectForParticipant(session, pid, 1);
    expect((view.activeSlide as { correct?: number[] }).correct).toBeUndefined();
  });

  it('projector sees correct array after reveal', () => {
    const session = makeMultiCorrectSession([0, 2], true); // hideContent irrelevant for projector
    const view = projectForProjector(session, 1);
    expect((view.activeSlide as { correct?: number[] }).correct).toEqual([0, 2]);
  });

  it('projector does NOT see correct before reveal (activity not visible)', () => {
    const session = makeMultiCorrectSession([0, 2], false);
    const slideId = session.slides[0].id;
    session.activities[slideId] = { status: 'buka', visible: false, hiddenWords: [] };
    const view = projectForProjector(session, 1);
    expect((view.activeSlide as { correct?: number[] }).correct).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// C7: Quiz multiple correct — scoring with second correct option
// ---------------------------------------------------------------------------

describe('C7 — quiz multiple correct: scoring', () => {
  function makeQuizSession(correctOpts: number[]): Session {
    const pid1 = uid(); const pid2 = uid(); const pid3 = uid();
    const kuisId = uid(); const qId = uid();
    return {
      id: uid(), presentationId: uid(), title: 'Q', code: 'ABCD', created: '',
      status: 'aktif', active: 0, division: -1,
      slides: [{
        id: kuisId, type: 'kuis', title: 'Kuis', body: '',
        options: [], correct: [], explanation: '', image: '', groups: 2,
        duration: 30,
        quizQuestions: [{
          id: qId, title: 'Q?', options: ['A', 'B', 'C'], correct: correctOpts,
        }],
      }],
      participants: [
        { id: pid1, name: 'Alya', online: true, simulated: false },
        { id: pid2, name: 'Bima', online: true, simulated: false },
        { id: pid3, name: 'Citra', online: true, simulated: false },
      ],
      groups: [], responses: [], questions: [],
      activities: {}, picks: [], paused: false, presenterOnline: true, hideContent: false,
      quiz: {
        slideId: kuisId, ownerType: 'individu', finished: false, revealed: false,
        config: { version: 'v1', base: 500, bonus: 500 },
        runs: [{
          questionId: qId, openedAt: 1000, deadlineAt: 31000,
          closed: false, answers: [],
        }],
      },
    };
  }

  it('participant picks second correct option → correct=true, score=500+bonus', () => {
    const session = makeQuizSession([0, 2]); // options A and C are correct
    const pid = session.participants[0].id;
    quizExecute(session, {
      type: 'quizSubmit', participantId: pid, questionId: session.quiz!.runs[0].questionId,
      option: 2, // C — second correct option
      requestId: uid(),
    }, 1000); // instant → max bonus
    const ans = session.quiz!.runs[0].answers[0];
    expect(ans.correct).toBe(true);
    expect(ans.score).toBe(1000);
  });

  it('participant picks wrong option → correct=false, score=0', () => {
    const session = makeQuizSession([0, 2]); // A and C correct; B is wrong
    const pid = session.participants[0].id;
    quizExecute(session, {
      type: 'quizSubmit', participantId: pid, questionId: session.quiz!.runs[0].questionId,
      option: 1, // B — wrong
      requestId: uid(),
    }, 1000);
    const ans = session.quiz!.runs[0].answers[0];
    expect(ans.correct).toBe(false);
    expect(ans.score).toBe(0);
  });

  it('all-correct question: any choice is correct', () => {
    const session = makeQuizSession([0, 1, 2]); // all options correct
    const pids = session.participants.map((p) => p.id);
    const qId = session.quiz!.runs[0].questionId;
    // Three participants each pick a different option
    [0, 1, 2].forEach((opt, i) => {
      quizExecute(session, {
        type: 'quizSubmit', participantId: pids[i], questionId: qId,
        option: opt, requestId: uid(),
      }, 1000 + i);
    });
    session.quiz!.runs[0].answers.forEach((a) => {
      expect(a.correct).toBe(true);
    });
  });

  it('correctOption in participant view after close shows all correct options', () => {
    const session = makeQuizSession([0, 2]);
    session.quiz!.runs[0].closed = true; // simulate closed
    const pid = session.participants[0].id;
    const view = projectForParticipant(session, pid, 1);
    // correctOption is visible after close with hideContent=false
    expect(view.quiz?.activeQuestion?.correctOption).toEqual([0, 2]);
  });

  it('correctOption in projector after close shows all correct options', () => {
    const session = makeQuizSession([0, 2]);
    session.quiz!.runs[0].closed = true;
    const view = projectForProjector(session, 1);
    expect(view.quiz?.activeQuestion?.correctOption).toEqual([0, 2]);
  });
});
