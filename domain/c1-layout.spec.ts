/**
 * C1 — Two-image Materi layout round-trip tests.
 *
 * Verifies:
 *   - Old "dua-gambar" parses without error (backward-compat)
 *   - "dua-gambar-lr" round-trips through Zod schema
 *   - "dua-gambar-tb" round-trips through Zod schema
 *   - Normalisation: "dua-gambar" treated as "dua-gambar-lr" in presentation (schema accepts it)
 */

import { describe, it, expect } from 'vitest';
import { slideSchema } from './model';

function makeSlide(layout?: string) {
  return {
    id: 'test-1',
    type: 'materi',
    title: 'Test',
    body: '',
    options: [],
    correct: [],
    explanation: '',
    image: '',
    groups: 0,
    ...(layout ? { layout } : {}),
  };
}

describe('C1 — Materi layout field', () => {
  it('parses slide with no layout (defaults to teks)', () => {
    const result = slideSchema.safeParse(makeSlide());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.layout).toBeUndefined();
  });

  it('parses old "dua-gambar" (backward-compat)', () => {
    const result = slideSchema.safeParse(makeSlide('dua-gambar'));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.layout).toBe('dua-gambar');
  });

  it('parses new "dua-gambar-lr"', () => {
    const result = slideSchema.safeParse(makeSlide('dua-gambar-lr'));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.layout).toBe('dua-gambar-lr');
  });

  it('parses new "dua-gambar-tb"', () => {
    const result = slideSchema.safeParse(makeSlide('dua-gambar-tb'));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.layout).toBe('dua-gambar-tb');
  });

  it('parses "teks" and "teks-gambar"', () => {
    for (const l of ['teks', 'teks-gambar']) {
      const result = slideSchema.safeParse(makeSlide(l));
      expect(result.success).toBe(true);
    }
  });

  it('rejects unknown layout value', () => {
    const result = slideSchema.safeParse(makeSlide('dua-gambar-diagonal'));
    expect(result.success).toBe(false);
  });
});
