/**
 * Participant token storage — one token per session per tab.
 * Key: karsa_participant_{sessionId}
 */

const key = (sid: string) => `karsa_participant_${sid}`;
const pidKey = (sid: string) => `karsa_participant_id_${sid}`;

export function setParticipantAuth(sessionId: string, token: string, participantId: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(key(sessionId), token);
  sessionStorage.setItem(pidKey(sessionId), participantId);
}

export function getParticipantToken(sessionId: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(key(sessionId));
}

export function getParticipantId(sessionId: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(pidKey(sessionId));
}
