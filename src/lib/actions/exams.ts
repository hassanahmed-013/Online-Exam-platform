"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { PAYWALL_ERROR, requireAdmin, userHasActiveAccess } from "@/lib/admin-auth";

export interface ExamActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface StartExamResult {
  ok: boolean;
  attemptId?: string;
  available?: number;
  error?: string;
}

const NO_KEY = {
  ok: false as const,
  error: "Admin writes are disabled — add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
};

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") + "-" + Math.random().toString(36).slice(2, 7)
  );
}

function parseCounts(raw: string): number[] {
  return [...new Set(
    raw
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
  )].sort((a, b) => a - b);
}

export async function saveExam(
  id: string | null,
  formData: FormData
): Promise<ExamActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  const name = String(formData.get("name") ?? "").trim();
  const sectionRaw = String(formData.get("section_id") ?? "").trim();
  const section_id = sectionRaw && sectionRaw !== "__all__" ? sectionRaw : null;
  const counts = parseCounts(String(formData.get("counts") ?? ""));
  const timeRaw = String(formData.get("time_limit_minutes") ?? "").trim();
  const time_limit_minutes = timeRaw ? parseInt(timeRaw, 10) : null;

  if (!name) return { ok: false, error: "Exam name is required." };
  if (!counts.length) return { ok: false, error: "Add at least one question-count option (e.g. 20, 40, 100, 200)." };

  try {
    const sb = createAdminClient();
    if (id) {
      const { error } = await sb
        .from("exams")
        .update({ name, section_id, available_question_counts: counts, time_limit_minutes })
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await sb.from("exams").insert({
        name,
        slug: slugify(name),
        section_id,
        available_question_counts: counts,
        time_limit_minutes,
        is_active: true,
        is_published: true,
      });
      if (error) return { ok: false, error: error.message };
    }
    revalidatePath("/admin/exams");
    revalidatePath("/dashboard/exams");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteExam(id: string): Promise<ExamActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const sb = createAdminClient();
    const { error } = await sb.from("exams").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/exams");
    revalidatePath("/dashboard/exams");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Randomly sample `count` active questions from the exam's section pool (or all
 * sections for a mixed exam), create an attempt row, and return its id. Refuses
 * (with the real available count) when the pool is smaller than requested.
 */
export async function startExam(
  examId: string,
  count: number
): Promise<StartExamResult> {
  if (!hasServiceRole) return NO_KEY;
  const user = await getCurrentUser();
  if (!(await userHasActiveAccess(user))) {
    return { ok: false, error: PAYWALL_ERROR };
  }
  try {
    const sb = createAdminClient();
    const userId = user?.id && user.id !== "demo" ? user.id : null;

    const { data: exam } = await sb
      .from("exams")
      .select("id,section_id,available_question_counts,time_limit_minutes")
      .eq("id", examId)
      .maybeSingle();
    if (!exam) return { ok: false, error: "Exam not found." };
    if (!exam.available_question_counts?.includes(count)) {
      return { ok: false, error: "That length isn't offered for this exam." };
    }

    // Pool of active question ids for this exam's scope.
    let poolQuery = sb.from("questions").select("id").eq("is_active", true);
    if (exam.section_id) poolQuery = poolQuery.eq("section_id", exam.section_id);
    const { data: pool, error: poolErr } = await poolQuery;
    if (poolErr) return { ok: false, error: poolErr.message };

    const available = pool?.length ?? 0;
    if (available < count) {
      return {
        ok: false,
        available,
        error: `This exam currently has ${available} question(s) available — choose a smaller length or contact your admin.`,
      };
    }

    // Random sample without replacement.
    const ids = (pool ?? []).map((q: { id: string }) => q.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    const selected = ids.slice(0, count);

    const { data: attempt, error: aErr } = await sb
      .from("attempts")
      .insert({
        user_id: userId,
        exam_id: examId,
        mode: exam.time_limit_minutes ? "timed" : "mock",
        status: "in_progress",
        question_ids: selected,
        selected_count: count,
        category_ids: exam.section_id ? [exam.section_id] : null,
      })
      .select("id")
      .single();
    if (aErr) return { ok: false, error: aErr.message };

    return { ok: true, attemptId: attempt.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
