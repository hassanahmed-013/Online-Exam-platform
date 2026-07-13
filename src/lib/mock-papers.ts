// Public read access for curated mock papers (fixed question sets).
import { createReadClient, isSupabaseConfigured } from "./supabase/read";
import type { AdminMockPaper } from "./types";

export async function getActiveMockPapers(): Promise<AdminMockPaper[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sb = createReadClient();
    const [{ data: papers, error }, { data: links }] = await Promise.all([
      sb
        .from("mock_exams")
        .select("id, name, series, duration_minutes, is_active")
        .eq("is_active", true)
        .order("name"),
      sb.from("mock_exam_questions").select("mock_exam_id"),
    ]);
    if (error) {
      // Pre-migration fallback
      const { data: fallback } = await sb
        .from("mock_exams")
        .select("id, name, duration_minutes, question_count");
      return ((fallback ?? []) as {
        id: string;
        name: string;
        duration_minutes: number | null;
        question_count: number | null;
      }[])
        .filter((p) => (p.question_count ?? 0) > 0)
        .map((p) => ({
          id: p.id,
          name: p.name,
          series: "",
          duration_minutes: p.duration_minutes ?? 0,
          question_count: p.question_count ?? 0,
          is_active: true,
        }));
    }

    const counts: Record<string, number> = {};
    for (const r of (links ?? []) as { mock_exam_id: string }[]) {
      counts[r.mock_exam_id] = (counts[r.mock_exam_id] ?? 0) + 1;
    }

    return ((papers ?? []) as {
      id: string;
      name: string;
      series: string | null;
      duration_minutes: number | null;
      is_active: boolean | null;
    }[])
      .map((p) => ({
        id: p.id,
        name: p.name,
        series: p.series ?? "",
        duration_minutes: p.duration_minutes ?? 0,
        question_count: counts[p.id] ?? 0,
        is_active: p.is_active ?? true,
      }))
      .filter((p) => p.question_count > 0);
  } catch {
    return [];
  }
}
