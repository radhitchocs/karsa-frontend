/**
 * ApiSessionService — live backend implementation of SessionService.
 *
 * - Initial state: GET /api/sessions/:id/state (called once on subscribe)
 * - Live updates: Socket.IO `session.snapshot` events replace Zustand state
 * - Commands: emitted via socket.emit('command', envelope, callback)
 * - Reconnect: `connect` event triggers re-fetch of state
 * - Token: Bearer JWT passed in socket handshake.auth.token
 */

import { io, type Socket } from 'socket.io-client';
import { apiFetch, API_BASE } from '@/lib/api';
import { uid } from '@/lib/uid';
import type { SessionService } from './session-service';
import type { PresenterView, ParticipantView, ProjectorView } from '@/contracts/views';
import type { SessionCommandPayload } from '@/contracts/commands';
import type { CommandAck } from '@/contracts/acks';

type SnapshotEvent =
  | { type: 'session.snapshot'; pov: 'presenter'; view: PresenterView }
  | { type: 'session.snapshot'; pov: 'participant'; view: ParticipantView }
  | { type: 'session.snapshot'; pov: 'projector'; view: ProjectorView };

export class ApiSessionService implements SessionService {
  private socket: Socket | null = null;
  private currentSessionId: string | null = null;

  constructor(private readonly token: string) {}

  // ---------------------------------------------------------------------------
  // Socket lifecycle
  // ---------------------------------------------------------------------------

  private ensureSocket(sessionId: string): Socket {
    if (this.socket && this.currentSessionId === sessionId) return this.socket;

    this.socket?.disconnect();
    this.socket = io(API_BASE, {
      auth: { token: this.token, sessionId },
      transports: ['websocket'],
      autoConnect: true,
    });
    this.currentSessionId = sessionId;
    return this.socket;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.currentSessionId = null;
  }

  // SessionService.reset — alias for disconnect
  reset(): void {
    this.disconnect();
  }

  // ---------------------------------------------------------------------------
  // State fetches (REST)
  // ---------------------------------------------------------------------------

  async getPresenterView(sessionId: string): Promise<PresenterView> {
    return apiFetch<PresenterView>(`/api/sessions/${sessionId}/state`, undefined, this.token);
  }

  async getParticipantView(sessionId: string, _pid: string): Promise<ParticipantView> {
    return apiFetch<ParticipantView>(`/api/sessions/${sessionId}/state`, undefined, this.token);
  }

  async getProjectorView(sessionId: string): Promise<ProjectorView> {
    return apiFetch<ProjectorView>(`/api/sessions/${sessionId}/state`, undefined, this.token);
  }

  // ---------------------------------------------------------------------------
  // Subscriptions (Socket.IO)
  // ---------------------------------------------------------------------------

  subscribePresenter(sessionId: string, cb: (view: PresenterView) => void): () => void {
    const socket = this.ensureSocket(sessionId);

    const onSnapshot = (snap: SnapshotEvent) => {
      if (snap.pov === 'presenter') cb(snap.view as PresenterView);
    };

    const onConnect = () => {
      this.getPresenterView(sessionId).then(cb).catch(console.error);
    };

    socket.on('session.snapshot', onSnapshot);
    socket.on('connect', onConnect);

    return () => {
      socket.off('session.snapshot', onSnapshot);
      socket.off('connect', onConnect);
    };
  }

  subscribeParticipant(
    sessionId: string,
    pid: string,
    cb: (view: ParticipantView) => void,
  ): () => void {
    const socket = this.ensureSocket(sessionId);

    const onSnapshot = (snap: SnapshotEvent) => {
      if (snap.pov === 'participant') cb(snap.view as ParticipantView);
    };

    const onConnect = () => {
      this.getParticipantView(sessionId, pid).then(cb).catch(console.error);
    };

    socket.on('session.snapshot', onSnapshot);
    socket.on('connect', onConnect);

    return () => {
      socket.off('session.snapshot', onSnapshot);
      socket.off('connect', onConnect);
    };
  }

  subscribeProjector(sessionId: string, cb: (view: ProjectorView) => void): () => void {
    const socket = this.ensureSocket(sessionId);

    const onSnapshot = (snap: SnapshotEvent) => {
      if (snap.pov === 'projector') cb(snap.view as ProjectorView);
    };

    socket.on('session.snapshot', onSnapshot);

    return () => {
      socket.off('session.snapshot', onSnapshot);
    };
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  async command(sessionId: string, payload: SessionCommandPayload): Promise<CommandAck> {
    const socket = this.ensureSocket(sessionId);
    const requestId = uid();
    const envelope = { requestId, sessionId, payload };

    return new Promise<CommandAck>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Perintah tidak mendapat respons (timeout 10 detik).'));
      }, 10_000);

      socket.emit('command', envelope, (ack: CommandAck) => {
        clearTimeout(timer);
        resolve(ack);
      });
    });
  }
}
