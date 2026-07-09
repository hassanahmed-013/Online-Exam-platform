// Central data-access layer.
//
// Today every function returns the mock data in mock-data.ts, so the entire
// UI is usable with zero backend. When you add Supabase credentials, replace
// the bodies here with real queries — the rest of the app calls only these
// functions, so no page/component has to change.

import {
  CATEGORIES,
  CATEGORY_PERFORMANCE,
  DASHBOARD_STATS,
  EXAM,
  EXAMS,
  MOCK_EXAMS,
  QUESTIONS,
  RECENT_SESSIONS,
  REVIEW_ITEMS,
  SCORE_HISTORY,
} from "./mock-data";
import type { Question } from "./types";

export function getExams() {
  return EXAMS;
}

export function getExam(slug: string) {
  return EXAMS.find((e) => e.slug === slug) ?? EXAM;
}

export function getCategories() {
  return CATEGORIES;
}

export function getMockExams() {
  return MOCK_EXAMS;
}

export function getDashboardStats() {
  return DASHBOARD_STATS;
}

export function getRecentSessions() {
  return RECENT_SESSIONS;
}

export function getReviewItems() {
  return REVIEW_ITEMS;
}

export function getCategoryPerformance() {
  return CATEGORY_PERFORMANCE;
}

export function getScoreHistory() {
  return SCORE_HISTORY;
}

export function getDemoQuestions(): Question[] {
  return QUESTIONS.filter((q) => q.is_demo);
}

export function getQuestionById(id: string) {
  return QUESTIONS.find((q) => q.id === id);
}

/**
 * Build a question set for a practice/timed session from the selected
 * categories. Falls back to all questions when nothing is selected.
 */
export function getQuestionsForCategories(categoryIds: string[]): Question[] {
  if (!categoryIds.length) return QUESTIONS;
  const set = QUESTIONS.filter((q) => categoryIds.includes(q.category_id));
  // Repeat the pool so a session always has a few questions in the demo.
  return set.length ? set : QUESTIONS;
}
