/**
 * localStorage helpers with schemaVersion guard.
 * Used for presentation drafts in demo mode.
 */

import type { Data, Slide, QuizQuestion } from "@/domain/model";

const STORAGE_KEY = "karsa-data";
const SCHEMA_VERSION = 2 as const;

function normCorrect(v: unknown): number[] {
  if (typeof v === "number") return [v];
  if (Array.isArray(v)) return v.filter((x) => typeof x === "number");
  return [];
}

function migrateSlide(s: Slide & { correct: unknown }): Slide {
  const qs = s.quizQuestions?.map(
    (q: QuizQuestion & { correct: unknown }) => ({ ...q, correct: normCorrect(q.correct) }),
  );
  return { ...s, correct: normCorrect(s.correct), quizQuestions: qs };
}

export function loadData(): Data | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Data;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return {
      ...parsed,
      presentations: parsed.presentations.map((p) => ({
        ...p,
        slides: p.slides.map((s) => migrateSlide(s as Slide & { correct: unknown })),
      })),
    };
  } catch {
    return null;
  }
}

export function saveData(data: Data): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }));
}

export function clearData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function defaultData(): Data {
  return { schemaVersion: SCHEMA_VERSION, presentations: [], sessions: [] };
}
