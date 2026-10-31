/**
 * Secure-context-safe UUIDv4 generator.
 *
 * `crypto.randomUUID()` is a secure-context-only API (HTTPS or localhost).
 * When the app is accessed over plain HTTP from a LAN IP, it is unavailable.
 * `crypto.getRandomValues()` works in ALL browser contexts (HTTP included).
 */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as Crypto).randomUUID === 'function') {
    return (crypto as Crypto).randomUUID();
  }
  // Fallback: UUIDv4 via getRandomValues (HTTP / non-secure context)
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
