/**
 * Emoji / glyph guard — fails if any emoji (\p{Extended_Pictographic}) or
 * ✓/✗ check-mark glyphs appear in app/, features/, or components/ source files.
 *
 * Rationale: emojis render inconsistently across OS/browser, violate the design
 * rule of using lucide-react icons with consistent stroke width everywhere.
 */

import { describe, test, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const SEARCH_DIRS = ['app', 'features', 'components'];
const EXTS = ['.tsx', '.ts'];

// Characters explicitly banned from UI source
const BANNED_CHARS = [
  '✓', // ✓ CHECK MARK
  '✗', // ✗ BALLOT X
  '✔', // ✔ HEAVY CHECK MARK
  '❌', // ❌ CROSS MARK
  '⭐', // ⭐ STAR
];

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (EXTS.some((e) => entry.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

// Build pictographic regex once — requires Node 16+ (v8 9.6+) with Unicode property escapes
const EMOJI_RE = /\p{Extended_Pictographic}/u;

describe('emoji-check', () => {
  const files = SEARCH_DIRS.flatMap((d) => {
    const full = join(ROOT, d);
    try { statSync(full); } catch { return []; }
    return collectFiles(full);
  });

  test('no emoji or banned glyphs in UI source files', () => {
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const lineNo = idx + 1;
        // Skip comment lines
        if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) return;

        if (EMOJI_RE.test(line)) {
          violations.push(`${file.replace(ROOT + '/', '')}:${lineNo}: emoji found`);
        }
        for (const ch of BANNED_CHARS) {
          if (line.includes(ch)) {
            violations.push(`${file.replace(ROOT + '/', '')}:${lineNo}: banned glyph U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`);
          }
        }
      });
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} emoji/glyph violation(s):\n${violations.join('\n')}\n\nUse lucide-react icons (strokeWidth={2.5}) instead.`,
      );
    }
  });

  test('scanned at least one file', () => {
    expect(files.length).toBeGreaterThan(0);
  });
});
