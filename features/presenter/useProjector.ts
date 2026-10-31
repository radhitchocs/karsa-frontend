'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Projector link for a session, shared by the presenter lobby and live view.
 * react-query dedupes concurrent fetches: the backend creates the token record on
 * first call, so two parallel first calls (e.g. StrictMode double effects) would
 * collide on its unique sessionId and 500.
 */
export function useProjector(sessionId: string) {
  const { data } = useQuery({
    queryKey: ['projector-token', sessionId],
    queryFn: () => apiFetch<{ token: string }>(`/api/sessions/${sessionId}/projector-token`),
    staleTime: Infinity,
  });
  const token = data?.token ?? null;

  function open() {
    if (!token) return;
    window.open(`${window.location.origin}/session/${sessionId}/projector?token=${token}`, '_blank');
  }

  return { ready: token !== null, open };
}
