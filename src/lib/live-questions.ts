"use server";
// Loads live questions for the runner from Supabase. Prefer the service-role
// client when available; fall back to the anon read client (RLS allows public
// question reads). Never returns mock/seed questions.
import { createAdminClient, hasServiceRole } from "./supabase/admin";
import { createReadClient, isSupabaseConfigured } from "./supabase/read";
import type { Difficulty, Question, QuestionOption } from "./types";

interface DbOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number | null;
}
interface DbQuestion {
  id: string;
  section_id: string | null;
  stem: string;
  explanation: string | null;
  difficulty: string | null;
  image_url: string | null;
  question_options: DbOption[];
  sections: { name: string } | null;
}

const QUESTION_SELECT =
  "id,section_id,stem,explanation,difficulty,image_url,question_options(id,option_text,is_correct,sort_order),sections(name)";

function mapQuestion(q: DbQuestion): Question {
  const options: QuestionOption[] = [...(q.question_options ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((o) => ({
      id: o.id,
      option_text: o.option_text,
      is_correct: o.is_correct,
      sort_order: o.sort_order ?? 0,
    }));
  return {
    id: q.id,
    exam_id: "",
    category_id: q.section_id ?? "",
    category_name: q.sections?.name ?? "Section",
    stem: q.stem,
    explanation: q.explanation ?? "",
    difficulty: (q.difficulty as Difficulty) ?? "medium",
    is_demo: false,
    image_url: q.image_url ?? undefined,
    options,
  };
}

function dbClient() {
  if (hasServiceRole) return createAdminClient();
  if (isSupabaseConfigured) return createReadClient();
  return null;
}

export interface ExamAttempt {
  questions: Question[];
  name: string;
  timeLimitMinutes: number | null;
  mode: "practice" | "timed" | "mock";
  sectionName?: string;
}

export async function getExamAttempt(attemptId: string): Promise<ExamAttempt | null> {
  const sb = dbClient();
  if (!sb) return null;

  const { data: attempt } = await sb
    .from("attempts")
    .select(
      "id,question_ids,exam_id,mock_exam_id,mode,selected_count,category_ids,exams(name,time_limit_minutes),mock_exams(name,duration_minutes)"
    )
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt || !attempt.question_ids?.length) return null;

  const ids: string[] = attempt.question_ids;
  const { data: rows } = await sb.from("questions").select(QUESTION_SELECT).in("id", ids);

  const byId = new Map((rows as unknown as DbQuestion[] | null ?? []).map((q) => [q.id, q]));
  const questions = ids
    .map((id) => byId.get(id))
    .filter((q): q is DbQuestion => !!q)
    .map(mapQuestion);

  const row = attempt as unknown as {
    mode: string | null;
    selected_count: number | null;
    category_ids: string[] | null;
    exams: { name: string; time_limit_minutes: number | null } | null;
    mock_exams: { name: string; duration_minutes: number | null } | null;
  };

  const sectionName =
    questions[0]?.category_name &&
    questions.every((q) => q.category_name === questions[0].category_name)
      ? questions[0].category_name
      : questions.length
        ? "Mixed sections"
        : undefined;

  if (row.mock_exams) {
    return {
      questions,
      name: row.mock_exams.name ?? "Mock paper",
      timeLimitMinutes: row.mock_exams.duration_minutes ?? null,
      mode: "mock",
      sectionName,
    };
  }

  if (row.exams) {
    const timed = row.exams.time_limit_minutes != null;
    return {
      questions,
      name: row.exams.name ?? "Exam",
      timeLimitMinutes: row.exams.time_limit_minutes ?? null,
      mode: timed ? "timed" : "mock",
      sectionName,
    };
  }

  // Bank practice / timed session (no exam or mock paper attached).
  const mode: "practice" | "timed" =
    row.mode === "timed" ? "timed" : "practice";
  const count = row.selected_count ?? questions.length;
  return {
    questions,
    name: mode === "practice" ? "Practice" : "Timed test",
    timeLimitMinutes: mode === "timed" ? Math.max(5, count) : null,
    mode,
    sectionName,
  };
}

/**
 * Active questions for one or more sections (practice / timed bank sessions).
 * Requires at least one section id — never returns the full bank unscoped.
 */
export async function getQuestionsBySectionIds(
  sectionIds: string[]
): Promise<Question[]> {
  const ids = sectionIds.filter(Boolean);
  if (!ids.length) return [];

  const sb = dbClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from("questions")
    .select(QUESTION_SELECT)
    .in("section_id", ids)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as DbQuestion[]).map(mapQuestion);
}
