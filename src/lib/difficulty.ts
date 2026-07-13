// Automatic difficulty classification.
//
// Difficulty is computed from real student performance (the correct-answer
// rate across all attempts) rather than trusting a static admin tag. An admin
// override always wins, and questions below a minimum sample size keep their
// manually-set difficulty so a brand-new question isn't mislabelled from a
// handful of answers.
//
// This mirrors the nightly Supabase recalculation job in supabase/schema.sql —
// keep the thresholds here in sync with that SQL.

import type { Difficulty } from "./types";

/** Minimum attempts before auto-classification kicks in. */
export const MIN_SAMPLE_SIZE = 20;
/** correct_rate ≥ this ⇒ easy. */
export const EASY_THRESHOLD = 0.75;
/** correct_rate ≥ this (and < EASY) ⇒ medium; below ⇒ hard. */
export const MEDIUM_THRESHOLD = 0.4;

export interface DifficultyInput {
  correctRate?: number;
  sampleSize?: number;
  /** Difficulty the admin set manually (fallback below the sample threshold). */
  adminDifficulty?: Difficulty;
  /** Admin-forced value; when set it overrides the computed value. */
  override?: Difficulty | null;
}

export interface DifficultyResult {
  difficulty: Difficulty;
  /** How the value was decided — drives the admin UI badge. */
  source: "override" | "computed" | "insufficient-data";
}

/** Bucket a raw correct-rate into a difficulty band. */
export function bucketFromRate(rate: number): Difficulty {
  if (rate >= EASY_THRESHOLD) return "easy";
  if (rate >= MEDIUM_THRESHOLD) return "medium";
  return "hard";
}

/**
 * Resolve the effective difficulty for a question, matching the precedence in
 * the nightly recalc: override → computed (if enough samples) → admin/default.
 */
export function classifyDifficulty({
  correctRate,
  sampleSize = 0,
  adminDifficulty = "medium",
  override,
}: DifficultyInput): DifficultyResult {
  if (override) {
    return { difficulty: override, source: "override" };
  }
  if (correctRate === undefined || sampleSize < MIN_SAMPLE_SIZE) {
    return { difficulty: adminDifficulty, source: "insufficient-data" };
  }
  return { difficulty: bucketFromRate(correctRate), source: "computed" };
}
