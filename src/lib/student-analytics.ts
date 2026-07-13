import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { getSections, sectionAsCategory } from "@/lib/sections";
import type {
  Category,
  CategoryPerformance,
  ReviewItem,
  ScorePoint,
} from "@/lib/types";

export interface StudentPerformance {
  averageScore: number;
  answered: number;
  streakDays: number;
  improvement: number;
  scoreHistory: ScorePoint[];
  bySection: CategoryPerformance[];
}

const emptyPerf: StudentPerformance = {
  averageScore: 0,
  answered: 0,
  streakDays: 0,
  improvement: 0,
  scoreHistory: [],
  bySection: [],
};

/** Live performance for the signed-in student from completed attempts. */
export async function getStudentPerformance(): Promise<StudentPerformance> {
  const user = await getCurrentUser();
  if (!user || user.id === "demo" || !hasServiceRole) return emptyPerf;

  try {
    const sb = createAdminClient();
    const { data: attempts } = await sb
      .from("attempts")
      .select("id,score_percent,completed_at,started_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: true });

    const attemptRows = (attempts ?? []) as {
      id: string;
      score_percent: number | null;
      completed_at: string | null;
      started_at: string;
    }[];
    const attemptIds = attemptRows.map((a) => a.id);

    let answered = 0;
    const sectionBuckets = new Map<string, { correct: number; total: number }>();

    if (attemptIds.length) {
      const { data: answers } = await sb
        .from("attempt_answers")
        .select("is_correct,question_id")
        .in("attempt_id", attemptIds);
      answered = (answers ?? []).length;

      const qIds = [
        ...new Set(
          ((answers ?? []) as { question_id: string }[]).map((a) => a.question_id)
        ),
      ];
      const sectionByQ = new Map<string, string>();
      if (qIds.length) {
        const { data: qs } = await sb
          .from("questions")
          .select("id,sections(name)")
          .in("id", qIds);
        for (const q of (qs ?? []) as unknown as {
          id: string;
          sections: { name: string } | null;
        }[]) {
          sectionByQ.set(q.id, q.sections?.name ?? "Unassigned");
        }
      }
      for (const a of (answers ?? []) as {
        is_correct: boolean;
        question_id: string;
      }[]) {
        const name = sectionByQ.get(a.question_id) ?? "Unassigned";
        const cur = sectionBuckets.get(name) ?? { correct: 0, total: 0 };
        cur.total += 1;
        if (a.is_correct) cur.correct += 1;
        sectionBuckets.set(name, cur);
      }
    }

    const scores = attemptRows
      .map((a) => (a.score_percent != null ? Number(a.score_percent) : null))
      .filter((n): n is number => n != null);
    const averageScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const improvement =
      scores.length >= 2
        ? Math.round(scores[scores.length - 1]! - scores[0]!)
        : 0;

    const buckets = new Map<string, { sum: number; n: number; label: string }>();
    for (const a of attemptRows) {
      if (a.score_percent == null || !a.completed_at) continue;
      const d = new Date(a.completed_at);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", { month: "short" });
      const cur = buckets.get(key) ?? { sum: 0, n: 0, label };
      cur.sum += Number(a.score_percent);
      cur.n += 1;
      buckets.set(key, cur);
    }
    const scoreHistory: ScorePoint[] = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        date: v.label,
        score: Math.round(v.sum / v.n),
      }));

    const days = new Set(
      attemptRows.map((a) => (a.completed_at || a.started_at).slice(0, 10))
    );
    let streakDays = 0;
    const cursor = new Date();
    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streakDays += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    const bySection: CategoryPerformance[] = [...sectionBuckets.entries()]
      .map(([category, { correct, total }]) => ({
        category,
        answered: total,
        accuracy: total ? Math.round((correct / total) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    return {
      averageScore,
      answered,
      streakDays,
      improvement,
      scoreHistory,
      bySection,
    };
  } catch (e) {
    console.error("[student performance]", e);
    return emptyPerf;
  }
}

/** Questions the student got wrong (or all answered) for Review. */
export async function getStudentReviewItems(): Promise<{
  items: ReviewItem[];
  categories: Category[];
}> {
  const sections = await getSections();
  const categories = sections.map(sectionAsCategory);
  const user = await getCurrentUser();
  if (!user || user.id === "demo" || !hasServiceRole) {
    return { items: [], categories };
  }

  try {
    const sb = createAdminClient();
    const { data: attempts } = await sb
      .from("attempts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed");
    const attemptIds = ((attempts ?? []) as { id: string }[]).map((a) => a.id);
    if (!attemptIds.length) return { items: [], categories };

    const { data, error } = await sb
      .from("attempt_answers")
      .select("id,is_correct,answered_at,question_id")
      .in("attempt_id", attemptIds)
      .order("answered_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[student review]", error.message);
      return { items: [], categories };
    }

    type Row = {
      id: string;
      is_correct: boolean;
      answered_at: string | null;
      question_id: string;
    };
    const rows = (data ?? []) as Row[];
    const wrong = rows.filter((r) => !r.is_correct);
    const source = wrong.length ? wrong : rows;

    const qIds = [...new Set(source.map((r) => r.question_id))];
    const meta = new Map<string, { stem: string; section: string }>();
    if (qIds.length) {
      const { data: qs } = await sb
        .from("questions")
        .select("id,stem,sections(name)")
        .in("id", qIds);
      for (const q of (qs ?? []) as unknown as {
        id: string;
        stem: string;
        sections: { name: string } | null;
      }[]) {
        meta.set(q.id, {
          stem: q.stem,
          section: q.sections?.name ?? "Unassigned",
        });
      }
    }

    const seen = new Set<string>();
    const items: ReviewItem[] = [];
    for (const r of source) {
      if (seen.has(r.question_id)) continue;
      seen.add(r.question_id);
      const m = meta.get(r.question_id);
      const stem = m?.stem ?? "";
      items.push({
        id: r.id,
        questionId: r.question_id,
        title: stem.slice(0, 80) || "Question",
        snippet: stem.slice(0, 160),
        categoryName: m?.section ?? "Unassigned",
        answeredAt: r.answered_at ?? new Date().toISOString(),
        isCorrect: r.is_correct,
      });
      if (items.length >= 50) break;
    }

    return { items, categories };
  } catch (e) {
    console.error("[student review]", e);
    return { items: [], categories };
  }
}
