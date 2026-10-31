/**
 * SessionService interface — shared contract between MockSessionService and ApiSessionService.
 *
 * Components import this interface only; never import a concrete implementation directly.
 * Swap demo ↔ live by changing which implementation is injected into the Zustand store.
 */

import type { PresenterView, ParticipantView, ProjectorView } from "@/contracts/views";
import type { SessionCommandPayload } from "@/contracts/commands";
import type { CommandAck } from "@/contracts/acks";

export interface SessionService {
  /** Get current snapshot for this POV (called on mount / reconnect) */
  getPresenterView(sessionId: string): Promise<PresenterView>;
  getParticipantView(sessionId: string, pid: string): Promise<ParticipantView>;
  getProjectorView(sessionId: string): Promise<ProjectorView>;

  /** Subscribe to state updates pushed after each command */
  subscribePresenter(sessionId: string, cb: (view: PresenterView) => void): () => void;
  subscribeParticipant(sessionId: string, pid: string, cb: (view: ParticipantView) => void): () => void;
  subscribeProjector(sessionId: string, cb: (view: ProjectorView) => void): () => void;

  /** Send a command; returns ack with ok/error */
  command(sessionId: string, payload: SessionCommandPayload): Promise<CommandAck>;

  /** Demo utilities (only used by MockSessionService; no-op in ApiSessionService) */
  reset?(): void;
}
