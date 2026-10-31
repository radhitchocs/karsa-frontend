/**
 * Zustand session store.
 *
 * Holds the current POV snapshot and the active service instance.
 * Components subscribe here; they never call the service directly.
 *
 * - ApiSessionService is used when NEXT_PUBLIC_DEMO_MODE !== 'true'
 * - setService() is called by page components after reading the token from sessionStorage
 */

import { create } from 'zustand';
import type { PresenterView, ParticipantView, ProjectorView } from '@/contracts/views';
import type { SessionService } from '@/services/session-service';
import { MockSessionService } from '@/services/mock-session-service';

export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

type SessionStore = {
  service: SessionService;
  presenterView: PresenterView | null;
  participantView: ParticipantView | null;
  projectorView: ProjectorView | null;
  setService: (s: SessionService) => void;
  setPresenterView: (v: PresenterView) => void;
  setParticipantView: (v: ParticipantView) => void;
  setProjectorView: (v: ProjectorView) => void;
};

export const useSessionStore = create<SessionStore>()((set) => ({
  service: new MockSessionService(),
  presenterView: null,
  participantView: null,
  projectorView: null,
  setService: (s) => set({ service: s }),
  setPresenterView: (v) => set({ presenterView: v }),
  setParticipantView: (v) => set({ participantView: v }),
  setProjectorView: (v) => set({ projectorView: v }),
}));
