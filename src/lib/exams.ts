// Public read access for admin-defined exams (configurable-length).
import { createReadClient, isSupabaseConfigured } from "./supabase/read";
import type { ExamConfig } from "./types";

type ExamRow = Omit<ExamConfig, "section_name"> & { sections: { name: string } | null };

function mapExam(e: ExamRow): ExamConfig {
  return {
    id: e.id,
    name: e.name,
    slug: e.slug,
    section_id: e.section_id,
    section_name: e.sections?.name ?? null,
    available_question_counts: e.available_question_counts ?? [],
    time_limit_minutes: e.time_limit_minutes,
    is_active: e.is_active,
  };
}

const SELECT =
  "id,name,slug,section_id,available_question_counts,time_limit_minutes,is_active,created_at,sections(name)";

export async function getActiveExams(): Promise<ExamConfig[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sb = createReadClient();
    const { data, error } = await sb
      .from("exams")
      .select(SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[exams]", error.message);
      const { data: fallback, error: fbErr } = await sb
        .from("exams")
        .select(
          "id,name,slug,section_id,available_question_counts,time_limit_minutes,is_active,sections(name)"
        )
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (fbErr || !fallback) return [];
      return (fallback as unknown as ExamRow[]).map(mapExam);
    }
    return ((data ?? []) as unknown as ExamRow[]).map(mapExam);
  } catch {
    return [];
  }
}

export async function getExamById(id: string): Promise<ExamConfig | undefined> {
  if (!isSupabaseConfigured) return undefined;
  try {
    const sb = createReadClient();
    const { data, error } = await sb.from("exams").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapExam(data as unknown as ExamRow);
  } catch {
    return undefined;
  }
}
