"use server";

import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { PAYWALL_ERROR, userHasActiveAccess } from "@/lib/admin-auth";
import { DEFAULT_QUESTION_COUNTS } from "@/lib/session-utils";
import type { RunnerMode } from "@/lib/types";
import type { StartExamResult } from "@/lib/actions/exams";

function sampleIds(ids: string[], count: number): string[] {
  const pool = [...ids];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/**
 * Start a practice or timed bank session scoped to one or more sections.
 * Samples randomly; refuses when the pool is smaller than `count`.
 * Length must be one of the admin-enabled counts (or the platform default).
 */
export async function startBankSession(input: {
  sectionIds: string[];
  mode: Extract<RunnerMode, "practice" | "timed">;
  count: number;
  /** Allowed lengths for this scope (from the matching exam config). */
  allowedCounts: number[];
}): Promise<StartExamResult> {
  if (!hasServiceRole) {
    return {
      ok: false,
      error:
        "Sessions need SUPABASE_SERVICE_ROLE_KEY — add it to .env.local.",
    };
  }

  const user = await getCurrentUser();
  if (!(await userHasActiveAccess(user))) {
    return { ok: false, error: PAYWALL_ERROR };
  }

  const sectionIds = [...new Set(input.sectionIds.filter(Boolean))];
  if (!sectionIds.length) {
    return { ok: false, error: "Select at least one section." };
  }

  const allowed =
    input.allowedCounts.length > 0
      ? input.allowedCounts
      : [...DEFAULT_QUESTION_COUNTS];
  if (!allowed.includes(input.count)) {
    return { ok: false, error: "That length isn't offered for this session." };
  }

  try {
    const sb = createAdminClient();
    const userId = user?.id && user.id !== "demo" ? user.id : null;

    const { data: pool, error: poolErr } = await sb
      .from("questions")
      .select("id")
      .in("section_id", sectionIds)
      .eq("is_active", true);
    if (poolErr) return { ok: false, error: poolErr.message };

    const available = pool?.length ?? 0;
    if (available < input.count) {
      return {
        ok: false,
        available,
        error: `This selection currently has ${available} question(s) available — choose a smaller length or import more questions.`,
      };
    }

    const selected = sampleIds(
      (pool ?? []).map((q: { id: string }) => q.id),
      input.count
    );

    const { data: attempt, error: aErr } = await sb
      .from("attempts")
      .insert({
        user_id: userId,
        mode: input.mode,
        status: "in_progress",
        question_ids: selected,
        selected_count: input.count,
        category_ids: sectionIds,
      })
      .select("id")
      .single();
    if (aErr) return { ok: false, error: aErr.message };

    return { ok: true, attemptId: attempt.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
