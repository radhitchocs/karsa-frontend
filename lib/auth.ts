/**
 * JWT token storage in sessionStorage.
 * sessionStorage is cleared when the browser tab is closed — appropriate for a
 * presenter session that should not persist across browser restarts.
 */

const TOKEN_KEY = 'karsa_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
}
