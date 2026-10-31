import type { Kind } from '@/domain/model';

/**
 * Solid hex fill color for each slide type.
 * Each color has EXACTLY ONE meaning — never used for anything else.
 * Black text (#000) over all of these passes WCAG AA (all verified ≥7.5:1).
 * These are ONLY for type chips, list markers, and slide header strips.
 * Bar chart bars use chart-1..6 from globals.css (a separate sequence).
 */
export const SLIDE_COLOR: Record<Kind, string> = {
  materi:   '#60A5FA', // blue
  pilihan:  '#A78BFA', // lavender
  polling:  '#FB923C', // orange
  awan:     '#FFD93D', // yellow
  tanya:    '#FF8FCB', // pink
  kelompok: '#2DD4BF', // teal
  kuis:     '#B8F25B', // lime
  pancing:  '#FF6B6B', // coral
};
