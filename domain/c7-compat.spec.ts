/**
 * C7 backward-compatibility tests:
 * Old stored data has correct: number; new schema must normalize to correct: number[].
 */
import { describe, it, expect } from 'vitest';
import { slideSchema, slidesSchema } from './model';

describe('C7 backward-compat — slideSchema.correct transform', () => {
  it('correct: 0 (old number) → [0]', () => {
    const raw = {
      id: 's1', type: 'pilihan', title: 'Q?', body: '', options: ['A', 'B'],
      correct: 0, explanation: '', image: '', groups: 2,
    };
    const slide = slideSchema.parse(raw);
    expect(slide.correct).toEqual([0]);
  });

  it('correct: 1 (old number) → [1]', () => {
    const raw = {
      id: 's1', type: 'pilihan', title: 'Q?', body: '', options: ['A', 'B'],
      correct: 1, explanation: '', image: '', groups: 2,
    };
    const slide = slideSchema.parse(raw);
    expect(slide.correct).toEqual([1]);
  });

  it('correct: [1] (new array) passes through unchanged', () => {
    const raw = {
      id: 's1', type: 'pilihan', title: 'Q?', body: '', options: ['A', 'B'],
      correct: [1], explanation: '', image: '', groups: 2,
    };
    const slide = slideSchema.parse(raw);
    expect(slide.correct).toEqual([1]);
  });

  it('kuis slide: quizQuestion correct: 0 → [0]', () => {
    const raw = {
      id: 's1', type: 'kuis', title: 'K', body: '', options: [],
      correct: 0, explanation: '', image: '', groups: 2, duration: 30,
      quizQuestions: [{ id: 'q1', title: 'Q?', options: ['A', 'B'], correct: 0 }],
    };
    const slide = slideSchema.parse(raw);
    expect(slide.correct).toEqual([0]);
    expect(slide.quizQuestions![0].correct).toEqual([0]);
  });

  it('kuis slide: quizQuestion correct: 1 (old number) → [1]', () => {
    const raw = {
      id: 's1', type: 'kuis', title: 'K', body: '', options: [],
      correct: 0, explanation: '', image: '', groups: 2, duration: 30,
      quizQuestions: [{ id: 'q1', title: 'Q?', options: ['A', 'B'], correct: 1 }],
    };
    const slide = slideSchema.parse(raw);
    expect(slide.quizQuestions![0].correct).toEqual([1]);
  });

  it('slidesSchema normalizes array of old-format slides', () => {
    const raw = [
      { id: 's1', type: 'materi', title: 'M', body: '', options: [], correct: 0, explanation: '', image: '', groups: 2 },
      { id: 's2', type: 'pilihan', title: 'P', body: '', options: ['A', 'B'], correct: 1, explanation: '', image: '', groups: 2 },
    ];
    const slides = slidesSchema.parse(raw);
    // materi correct: 0 → [0] (Zod transform does not distinguish by type)
    expect(slides[0].correct).toEqual([0]);
    expect(slides[1].correct).toEqual([1]);
  });

  it('correct: [] (already array, empty) stays []', () => {
    const raw = {
      id: 's1', type: 'kuis', title: 'K', body: '', options: [],
      correct: [], explanation: '', image: '', groups: 2, duration: 30,
      quizQuestions: [],
    };
    const slide = slideSchema.parse(raw);
    expect(slide.correct).toEqual([]);
  });
});
