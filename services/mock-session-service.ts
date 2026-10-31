/**
 * MockSessionService — full in-memory session service for DEMO_MODE.
 *
 * Uses the same domain engine (execute, quizExecute) and projection functions
 * (projectForPresenter, projectForParticipant, projectForProjector) as the
 * production backend. No answer-key leaks in ParticipantView or ProjectorView.
 *
 * Enabled by NEXT_PUBLIC_DEMO_MODE=true. No backend or Socket.IO required.
 *
 * Extra methods (not in SessionService interface):
 *   createSession(presentation)  → Session
 *   joinSession(sessionId, name) → pid
 *   setActivePid(sessionId, pid) → void   (used by SimulationControls for role switch)
 *   simulateResponses(sessionId) → CommandAck
 *   quizSimulate(sessionId, scenario) → CommandAck
 */

import type { SessionService } from './session-service';
import type { PresenterView, ParticipantView, ProjectorView } from '@/contracts/views';
import type { SessionCommandPayload } from '@/contracts/commands';
import type { CommandAck, AckCode } from '@/contracts/acks';
import type { Presentation, Session } from '@/domain/model';
import { uid, validate } from '@/domain/model';
import { execute } from '@/domain/engine';
import type { QuizCommand } from '@/domain/quiz';
import {
  projectForPresenter,
  projectForParticipant,
  projectForProjector,
} from '@/domain/projection';

type Listener<T> = (view: T) => void;

export class MockSessionService implements SessionService {
  private sessions = new Map<string, Session>();
  private versions = new Map<string, number>();
  /** sessionId → pid currently acting as participant (for participant commands) */
  private activePids = new Map<string, string>();
  /** sessionId → quiz auto-close timer */
  private quizTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private presenterListeners = new Map<string, Set<Listener<PresenterView>>>();
  /** key = `${sessionId}:${pid}` */
  private participantListeners = new Map<string, Set<Listener<ParticipantView>>>();
  private projectorListeners = new Map<string, Set<Listener<ProjectorView>>>();

  // ---------------------------------------------------------------------------
  // SessionService interface
  // ---------------------------------------------------------------------------

  async getPresenterView(sessionId: string): Promise<PresenterView> {
    const session = this.requireSession(sessionId);
    return projectForPresenter(session, this.version(sessionId));
  }

  async getParticipantView(sessionId: string, pid: string): Promise<ParticipantView> {
    const session = this.requireSession(sessionId);
    return projectForParticipant(session, pid, this.version(sessionId));
  }

  async getProjectorView(sessionId: string): Promise<ProjectorView> {
    const session = this.requireSession(sessionId);
    return projectForProjector(session, this.version(sessionId));
  }

  subscribePresenter(sessionId: string, cb: Listener<PresenterView>): () => void {
    return this.addListener(this.presenterListeners, sessionId, cb);
  }

  subscribeParticipant(
    sessionId: string,
    pid: string,
    cb: Listener<ParticipantView>,
  ): () => void {
    return this.addListener(this.participantListeners, `${sessionId}:${pid}`, cb);
  }

  subscribeProjector(sessionId: string, cb: Listener<ProjectorView>): () => void {
    return this.addListener(this.projectorListeners, sessionId, cb);
  }

  async command(sessionId: string, payload: SessionCommandPayload): Promise<CommandAck> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return this.ack(false, 'NOT_FOUND', 'Sesi tidak ditemukan.', 0);
    }
    try {
      this.applyCommand(session, payload);
    } catch (e) {
      return this.ack(false, 'INVALID_STATE', (e as Error).message, this.version(sessionId));
    }
    this.versions.set(sessionId, this.version(sessionId) + 1);
    // Schedule quiz timer if a question was just opened
    if (payload.type === 'quiz.openQuestion') {
      this.scheduleQuizTimer(sessionId);
    }
    this.broadcast(sessionId);
    return this.ack(true, '', '', this.version(sessionId));
  }

  reset(): void {
    this.quizTimers.forEach(clearTimeout);
    this.quizTimers.clear();
    this.sessions.clear();
    this.versions.clear();
    this.activePids.clear();
    this.presenterListeners.clear();
    this.participantListeners.clear();
    this.projectorListeners.clear();
  }

  // ---------------------------------------------------------------------------
  // Extra demo methods
  // ---------------------------------------------------------------------------

  /**
   * Create a new in-memory session from a presentation.
   * Returns the session (caller navigates to /session/[id]/presenter).
   */
  createSession(presentation: Presentation): Session {
    const errors = validate(presentation);
    if (errors.length) {
      throw new Error(`Presentasi tidak valid: ${errors.join(' ')}`);
    }
    // B3: auto-start when all slides are materi
    const allMateri =
      presentation.slides.length > 0 &&
      presentation.slides.every((s) => s.type === 'materi');
    const session: Session = {
      id: uid(),
      presentationId: presentation.id,
      title: presentation.title,
      slides: structuredClone(presentation.slides),
      code: String(Math.floor(100_000 + Math.random() * 900_000)),
      status: allMateri ? 'aktif' : 'lobi',
      active: 0,
      division: -1,
      participants: [],
      groups: [],
      responses: [],
      questions: [],
      activities: {},
      picks: [],
      paused: false,
      presenterOnline: true,
      hideContent: true,
      created: new Date().toISOString(),
    };
    this.sessions.set(session.id, session);
    this.versions.set(session.id, 1);
    return session;
  }

  /**
   * Add a participant to a session (simulates POST /api/sessions/join).
   * Returns the new participant's id.
   */
  joinSession(sessionId: string, name: string): string {
    const session = this.requireSession(sessionId);
    const pid = uid();
    session.participants.push({ id: pid, name, online: true, simulated: true });
    this.versions.set(sessionId, this.version(sessionId) + 1);
    this.broadcast(sessionId);
    return pid;
  }

  /**
   * Set which participant is the "active actor" for participant commands.
   * Called by SimulationControls when switching the participant POV.
   */
  setActivePid(sessionId: string, pid: string): void {
    this.activePids.set(sessionId, pid);
  }

  getActivePid(sessionId: string): string | undefined {
    return this.activePids.get(sessionId);
  }

  /** Simulate all-participant responses on the current slide (engine `simulate` command). */
  simulateResponses(sessionId: string): CommandAck {
    const session = this.sessions.get(sessionId);
    if (!session) return this.ack(false, 'NOT_FOUND', 'Sesi tidak ditemukan.', 0);
    try {
      execute(session, { type: 'simulate' });
    } catch (e) {
      return this.ack(false, 'INVALID_STATE', (e as Error).message, this.version(sessionId));
    }
    this.versions.set(sessionId, this.version(sessionId) + 1);
    this.broadcast(sessionId);
    return this.ack(true, '', '', this.version(sessionId));
  }

  /** Simulate a quiz answer scenario for the current question. */
  quizSimulate(
    sessionId: string,
    scenario: 'cepat' | 'lambat' | 'salah' | 'kosong' | 'retry',
  ): CommandAck {
    const session = this.sessions.get(sessionId);
    if (!session) return this.ack(false, 'NOT_FOUND', 'Sesi tidak ditemukan.', 0);
    try {
      execute(session, { type: 'quizSimulate', scenario } as QuizCommand);
    } catch (e) {
      return this.ack(false, 'INVALID_STATE', (e as Error).message, this.version(sessionId));
    }
    this.versions.set(sessionId, this.version(sessionId) + 1);
    if (scenario === 'kosong') {
      // Question was fast-forwarded to deadline → reschedule (timer fires immediately)
      this.scheduleQuizTimer(sessionId);
    }
    this.broadcast(sessionId);
    return this.ack(true, '', '', this.version(sessionId));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private requireSession(sessionId: string): Session {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error(`Session ${sessionId} not found`);
    return s;
  }

  private version(sessionId: string): number {
    return this.versions.get(sessionId) ?? 1;
  }

  private addListener<T>(
    map: Map<string, Set<Listener<T>>>,
    key: string,
    cb: Listener<T>,
  ): () => void {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(cb);
    return () => map.get(key)?.delete(cb);
  }

  private broadcast(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const ver = this.version(sessionId);

    // Presenter
    const pListeners = this.presenterListeners.get(sessionId);
    if (pListeners?.size) {
      const view = projectForPresenter(session, ver);
      pListeners.forEach((cb) => cb(view));
    }

    // Projector
    const projListeners = this.projectorListeners.get(sessionId);
    if (projListeners?.size) {
      const view = projectForProjector(session, ver);
      projListeners.forEach((cb) => cb(view));
    }

    // Participants — iterate all participant listener keys for this session
    for (const [key, cbs] of this.participantListeners) {
      if (!key.startsWith(`${sessionId}:`)) continue;
      const pid = key.slice(sessionId.length + 1);
      if (!cbs.size) continue;
      try {
        const view = projectForParticipant(session, pid, ver);
        cbs.forEach((cb) => cb(view));
      } catch {
        // Participant may have left; skip
      }
    }
  }

  private applyCommand(session: Session, payload: SessionCommandPayload): void {
    const now = Date.now();
    switch (payload.type) {
      case 'session.start':
        execute(session, { type: 'start' }, now);
        break;

      case 'session.toggleHideContent':
        execute(session, { type: 'toggleHideContent' }, now);
        break;

      case 'slide.activate':
        execute(session, { type: 'navigate', index: payload.slideIndex }, now);
        break;

      case 'activity.open':
        execute(session, { type: 'open' }, now);
        break;

      case 'activity.close':
        execute(session, { type: 'close' }, now);
        break;

      case 'activity.reopen':
        // D18: re-open = open again (resets visible=false)
        execute(session, { type: 'open' }, now);
        break;

      case 'activity.hideWord':
        execute(session, { type: 'hideWord', word: payload.word }, now);
        break;

      case 'results.reveal':
        execute(session, { type: 'reveal' }, now);
        break;

      case 'groups.assign':
        execute(session, { type: 'assign', count: payload.groupCount }, now);
        break;

      case 'group.replaceResponder':
        execute(session, { type: 'replace', groupId: payload.groupId }, now);
        break;

      case 'response.submit': {
        const pid = this.activePids.get(session.id);
        if (!pid) throw new Error('Pilih peserta aktif di SimulationControls.');
        execute(
          session,
          { type: 'submit', participantId: pid, slideId: payload.slideId, value: payload.value },
          now,
        );
        break;
      }

      case 'question.submit': {
        const pid = this.activePids.get(session.id);
        if (!pid) throw new Error('Pilih peserta aktif di SimulationControls.');
        execute(
          session,
          {
            type: 'submit',
            participantId: pid,
            slideId: payload.slideId,
            value: [payload.text],
          },
          now,
        );
        break;
      }

      case 'question.moderate': {
        const q = session.questions.find((x) => x.id === payload.questionId);
        if (q && q.visible !== payload.visible) {
          execute(session, { type: 'moderate', questionId: payload.questionId, action: 'visible' }, now);
        }
        break;
      }

      case 'quiz.openQuestion':
        execute(session, { type: 'quizOpen' }, now);
        break;

      case 'quiz.answerSubmit': {
        const pid = this.activePids.get(session.id);
        if (!pid) throw new Error('Pilih peserta aktif di SimulationControls.');
        execute(
          session,
          {
            type: 'quizSubmit',
            participantId: pid,
            questionId: payload.questionRunId,
            option: payload.optionIndex,
            requestId: uid(),
          },
          now,
        );
        break;
      }

      case 'quiz.revealQuestion':
        execute(session, { type: 'quizRevealQuestion', questionRunId: payload.questionRunId }, now);
        break;

      case 'quiz.finish':
        execute(session, { type: 'quizFinish' }, now);
        break;

      case 'quiz.revealLeaderboard':
        execute(session, { type: 'quizReveal' }, now);
        break;

      case 'session.resume':
        execute(session, { type: 'resume' }, now);
        break;

      case 'session.end':
        execute(session, { type: 'end' }, now);
        this.cancelQuizTimer(session.id);
        break;

      case 'pancing.pick': {
        const slide = session.slides[session.active];
        if (slide?.type !== 'pancing') throw new Error('Aktifkan slide Pancing Peserta.');
        const excludeIds = new Set((payload as { excludeIds?: string[] }).excludeIds ?? []);
        const pool = session.participants.filter(
          (p) => (p.online || p.simulated === true) && !excludeIds.has(p.id),
        );
        if (!pool.length) throw new Error('Semua peserta sudah terpilih.');
        const picked = pool[Math.floor(Math.random() * pool.length)];
        execute(session, { type: 'pick', participantId: picked.id }, now);
        break;
      }
    }
  }

  private scheduleQuizTimer(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session?.quiz) return;
    const run = session.quiz.runs.at(-1);
    if (!run || run.closed) return;

    this.cancelQuizTimer(sessionId);

    const delay = run.deadlineAt - Date.now();
    const timer = setTimeout(() => {
      this.quizTimers.delete(sessionId);
      const s = this.sessions.get(sessionId);
      if (!s) return;
      // reconcileQuiz closes the run; quizTick is the no-op trigger
      execute(s, { type: 'quizTick' }, run.deadlineAt);
      this.versions.set(sessionId, this.version(sessionId) + 1);
      this.broadcast(sessionId);
    }, Math.max(0, delay));

    this.quizTimers.set(sessionId, timer);
  }

  private cancelQuizTimer(sessionId: string): void {
    const t = this.quizTimers.get(sessionId);
    if (t !== undefined) {
      clearTimeout(t);
      this.quizTimers.delete(sessionId);
    }
  }

  private ack(
    ok: boolean,
    code: AckCode,
    message: string,
    entityVersion: number,
  ): CommandAck {
    return { requestId: uid(), ok, code, message, entityVersion };
  }
}

/** Module-level singleton — shared across all demo-mode components. */
export const mockSessionService = new MockSessionService();
