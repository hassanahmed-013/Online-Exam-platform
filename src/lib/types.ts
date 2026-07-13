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
  slug: string;
  name: string;
  short_description?: string;
  /** Cover picture for cards. May be a hosted URL or a data: URI. */
  cover_image_url?: string;
  sort_order: number;
  /** derived counts for UI */
  total: number;
  attempted: number;
}

export type ImageSource = "manual_upload" | "bulk_import";

/**
 * Flat, admin-managed section (the live entity backing the section cards).
 * Rows live in the `sections` table; when Supabase isn't configured the app
 * falls back to mock subjects mapped into this shape.
 */
export interface Section {
  id: string;
  name: string;
  short_description: string;
  cover_image_url: string;
  is_active: boolean;
  created_at?: string;
  /** Derived active-question count (admin list / detail). */
  question_count?: number;
}

/** Admin-defined exam with configurable lengths (rows in `exams`). */
export interface ExamConfig {
  id: string;
  name: string;
  slug: string;
  /** null = spans all sections (mixed exam). */
  section_id: string | null;
  section_name?: string | null;
  available_question_counts: number[];
  time_limit_minutes: number | null;
  is_active: boolean;
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
  /** Effective difficulty: admin override, else computed from attempts, else 'medium'. */
  difficulty: Difficulty;
  is_demo: boolean;
  options: QuestionOption[];
  /** Optional reference image (clinical photo, diagram, ECG …). */
  image_url?: string;
  image_source?: ImageSource;
  original_source_url?: string;
  /** Auto-classification: admin override wins when set. */
  difficulty_override?: Difficulty | null;
  /** Cached correct-answer rate (0-1) from attempt_answers. */
  correct_rate?: number;
  /** How many attempts correct_rate is based on. */
  attempts_sample_size?: number;
}

export interface MockExam {
  id: string;
  /** Optional parent configurable exam (legacy / unused for curated papers). */
  exam_id?: string | null;
  name: string;
  /** Derived: count of rows in mock_exam_questions. */
  question_count: number;
  duration_minutes: number;
  /** Series / group label, e.g. "Mock Exam A". */
  series?: string;
  /** @deprecated Use `series` — kept for older mock-data callers. */
  group?: string;
  is_active?: boolean;
}

/** Curated mock paper (admin + student lists). */
export interface AdminMockPaper {
  id: string;
  name: string;
  series: string;
  duration_minutes: number;
  question_count: number;
  is_active: boolean;
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

/** Admin-uploaded study document shown on the student Textbooks page. */
export interface Textbook {
  id: string;
  title: string;
  description: string;
  tag: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}
