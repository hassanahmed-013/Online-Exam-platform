// Domain types for the MDCAT prep platform.
// These mirror the Supabase schema in supabase/schema.sql.

export type Role = "student" | "admin";
export type Difficulty = "easy" | "medium" | "hard";
export type RunnerMode = "practice" | "timed" | "mock";
export type AttemptStatus = "in_progress" | "completed" | "abandoned";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: Role;
  current_plan: string;
  plan_expires_at?: string;
}

export interface Exam {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover_image_url?: string;
  is_published: boolean;
}

export interface Category {
  id: string;
  exam_id: string;
  parent_id?: string | null;
  name: string;
  sort_order: number;
  /** derived counts for UI */
  total: number;
  attempted: number;
}

export interface QuestionOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface Question {
  id: string;
  exam_id: string;
  category_id: string;
  category_name: string;
  stem: string;
  explanation: string;
  difficulty: Difficulty;
  is_demo: boolean;
  options: QuestionOption[];
}

export interface MockExam {
  id: string;
  exam_id: string;
  name: string;
  question_count: number;
  duration_minutes: number;
  group: string; // e.g. "Mock Exam A"
}

export interface RecentSession {
  id: string;
  mode: RunnerMode;
  categoryName: string;
  answered: number;
  total: number;
  updatedAt: string; // ISO
}

export interface ReviewItem {
  id: string;
  questionId: string;
  title: string;
  snippet: string;
  categoryName: string;
  answeredAt: string; // ISO
  vote?: "up" | "down";
  isCorrect: boolean;
}

export interface CategoryPerformance {
  category: string;
  accuracy: number; // 0-100
  answered: number;
}

export interface ScorePoint {
  date: string; // label
  score: number; // 0-100
}
