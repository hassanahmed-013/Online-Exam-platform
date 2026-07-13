// Central data-access layer.
//
// Today every function returns the mock data in mock-data.ts, so the entire
// UI is usable with zero backend. When you add Supabase credentials, replace
// the bodies here with real queries — the rest of the app calls only these
// functions, so no page/component has to change.

import {
  ALL_CATEGORIES,
  CATEGORIES,
  CATEGORY_PERFORMANCE,
  DASHBOARD_STATS,
  EXAM,
  EXAMS,
  MOCK_EXAMS,
  QUESTIONS,
  QUESTION_STATS,
  RECENT_SESSIONS,
  REVIEW_ITEMS,
  SCORE_HISTORY,
  SUBCATEGORIES,
  SUBJECTS,
} from "./mock-data";
import type { Category, Question } from "./types";
import { classifyDifficulty, type DifficultyResult } from "./difficulty";

export function getExams() {
  return EXAMS;
}

export function getExam(slug: string) {
  return EXAMS.find((e) => e.slug === slug) ?? EXAM;
}

export function getCategories() {
  return CATEGORIES;
}

// -------------------- Category hierarchy --------------------

/** Leaf sub-categories nested under a subject. */
export function getSubcategories(parentId: string): Category[] {
  return SUBCATEGORIES.filter((c) => c.parent_id === parentId);
}

/** Roll a subject's totals/attempted up from its children. */
function aggregateSubject(subject: Category): Category {
  const children = getSubcategories(subject.id);
  const total = children.reduce((s, c) => s + c.total, 0);
  const attempted = children.reduce((s, c) => s + c.attempted, 0);
  return { ...subject, total, attempted };
}

/** Top-level subject cards (with aggregated counts) for the landing/grid. */
export function getSubjects(): Category[] {
  return SUBJECTS.map(aggregateSubject);
}

/** Resolve any category (subject or leaf) by slug, with counts filled in. */
export function getCategoryBySlug(slug: string): Category | undefined {
  const found = ALL_CATEGORIES.find((c) => c.slug === slug);
  if (!found) return undefined;
  return found.parent_id ? found : aggregateSubject(found);
}

/** All leaf category ids covered by a category (a subject expands to children). */
export function getLeafCategoryIds(category: Category): string[] {
  const children = getSubcategories(category.id);
  return children.length ? children.map((c) => c.id) : [category.id];
}

/** Average correct-rate (0-100) across answered questions in a category. */
export function getCategoryAverageScore(category: Category): number | undefined {
  const leafIds = new Set(getLeafCategoryIds(category));
  const rates = QUESTIONS.filter((q) => leafIds.has(q.category_id))
    .map((q) => QUESTION_STATS[q.id])
    .filter((s): s is { total: number; correct: number } => !!s && s.total > 0)
    .map((s) => s.correct / s.total);
  if (!rates.length) return undefined;
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  return Math.round(mean * 100);
}

export function getMockExams() {
  return MOCK_EXAMS;
}

export function getMockExam(id: string) {
  return MOCK_EXAMS.find((m) => m.id === id);
}

// -------------------- Difficulty (auto-classification) --------------------

/** Classify one question from its cached attempt stats + admin override. */
export function classifyQuestion(q: Question): DifficultyResult {
  const stats = QUESTION_STATS[q.id];
  return classifyDifficulty({
    correctRate: stats ? stats.correct / stats.total : q.correct_rate,
    sampleSize: stats ? stats.total : q.attempts_sample_size,
    adminDifficulty: q.difficulty,
    override: q.difficulty_override,
  });
}

/**
 * Return a question with its *effective* difficulty and cached rate applied,
 * so the runner and review screens reflect real performance.
 */
function withEffectiveDifficulty(q: Question): Question {
  const stats = QUESTION_STATS[q.id];
  const { difficulty } = classifyQuestion(q);
  return {
    ...q,
    difficulty,
    correct_rate: stats ? stats.correct / stats.total : q.correct_rate,
    attempts_sample_size: stats ? stats.total : q.attempts_sample_size,
  };
}

/**
 * Questions for a mock paper. In this demo we only ship a handful of seed
 * questions, so we return the full pool; with Supabase this would read the
 * `mock_exam_questions` join in the paper's defined order.
 */
export function getQuestionsForMock(_mockExamId: string): Question[] {
  return QUESTIONS.map(withEffectiveDifficulty);
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
  return QUESTIONS.filter((q) => q.is_demo).map(withEffectiveDifficulty);
}

/** Demo questions scoped to a subject/leaf category (by slug). */
export function getDemoQuestionsForCategory(slug: string): Question[] {
  const category = getCategoryBySlug(slug);
  if (!category) return getDemoQuestions();
  const leafIds = new Set(getLeafCategoryIds(category));
  const scoped = QUESTIONS.filter(
    (q) => q.is_demo && leafIds.has(q.category_id)
  );
  return (scoped.length ? scoped : QUESTIONS.filter((q) => q.is_demo)).map(
    withEffectiveDifficulty
  );
}

export function getQuestionById(id: string) {
  const q = QUESTIONS.find((q) => q.id === id);
  return q ? withEffectiveDifficulty(q) : undefined;
}

/**
 * Build a question set for a practice/timed session from the selected
 * categories. Subject ids expand to their leaves. Falls back to all questions
 * when nothing is selected.
 */
export function getQuestionsForCategories(categoryIds: string[]): Question[] {
  if (!categoryIds.length) return QUESTIONS.map(withEffectiveDifficulty);
  const leafIds = new Set<string>();
  for (const id of categoryIds) {
    const cat = ALL_CATEGORIES.find((c) => c.id === id);
    if (cat) getLeafCategoryIds(cat).forEach((l) => leafIds.add(l));
    else leafIds.add(id);
  }
  const set = QUESTIONS.filter((q) => leafIds.has(q.category_id));
  // Repeat the pool so a session always has a few questions in the demo.
  return (set.length ? set : QUESTIONS).map(withEffectiveDifficulty);
}

// -------------------- Admin --------------------

export interface AdminQuestionRow {
  question: Question;
  stats?: { total: number; correct: number };
  classification: DifficultyResult;
}

/** Raw questions plus their computed difficulty breakdown, for the admin table. */
export function getAdminQuestions(): AdminQuestionRow[] {
  return QUESTIONS.map((question) => ({
    question,
    stats: QUESTION_STATS[question.id],
    classification: classifyQuestion(question),
  }));
}

/** Full category tree (subjects with their children) for the admin manager. */
export function getCategoryTree(): { subject: Category; children: Category[] }[] {
  return getSubjects().map((subject) => ({
    subject,
    children: getSubcategories(subject.id),
  }));
}
