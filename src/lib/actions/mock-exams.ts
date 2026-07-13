"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { PAYWALL_ERROR, requireAdmin, userHasActiveAccess } from "@/lib/admin-auth";

export interface MockPaperActionResult {
  ok: boolean;
  error?: string;
  id?: string;
  results?: { line: number; status: "assigned" | "error"; messages?: string[] }[];
}

export interface StartMockResult {
  ok: boolean;
  attemptId?: string;
  error?: string;
}

const NO_KEY = {
  ok: false as const,
  error: "Admin writes are disabled — add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
};

export async function saveMockPaper(
  id: string | null,
  formData: FormData
): Promise<MockPaperActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  const name = String(formData.get("name") ?? "").trim();
  const series = String(formData.get("series") ?? "").trim();
  const durationRaw = String(formData.get("duration_minutes") ?? "").trim();
  const duration_minutes = parseInt(durationRaw, 10);

  if (!name) return { ok: false, error: "Paper name is required." };
  if (!Number.isFinite(duration_minutes) || duration_minutes <= 0) {
    return { ok: false, error: "Duration must be a positive number of minutes." };
  }

  try {
    const sb = createAdminClient();
    if (id) {
      const { error } = await sb
        .from("mock_exams")
        .update({ name, series: series || null, duration_minutes })
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
      revalidatePath("/admin/mock-exams");
      revalidatePath(`/admin/mock-exams/${id}`);
      revalidatePath("/dashboard/mock-exams");
      return { ok: true, id };
    }

    const { data, error } = await sb
      .from("mock_exams")
      .insert({
        name,
        series: series || null,
        duration_minutes,
        question_count: 0,
        is_active: true,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/mock-exams");
    revalidatePath("/dashboard/mock-exams");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteMockPaper(id: string): Promise<MockPaperActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const sb = createAdminClient();
    await sb.from("mock_exam_questions").delete().eq("mock_exam_id", id);
    const { error } = await sb.from("mock_exams").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/mock-exams");
    revalidatePath("/dashboard/mock-exams");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Append existing questions to a paper (skips already-assigned ids). */
export async function addQuestionsToMockPaper(
  mockExamId: string,
  questionIds: string[]
): Promise<MockPaperActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  if (!mockExamId) return { ok: false, error: "Missing paper id." };
  const unique = [...new Set(questionIds.filter(Boolean))];
  if (!unique.length) return { ok: false, error: "No questions selected." };

  try {
    const sb = createAdminClient();
    const { data: existing } = await sb
      .from("mock_exam_questions")
      .select("question_id, sort_order")
      .eq("mock_exam_id", mockExamId);

    const have = new Set(
      ((existing ?? []) as { question_id: string }[]).map((r) => r.question_id)
    );
    const maxSort = ((existing ?? []) as { sort_order: number | null }[]).reduce(
      (m, r) => Math.max(m, r.sort_order ?? 0),
      0
    );

    const toAdd = unique.filter((id) => !have.has(id));
    if (!toAdd.length) {
      return { ok: true, id: mockExamId };
    }

    // Verify questions exist.
    const { data: found } = await sb
      .from("questions")
      .select("id")
      .in("id", toAdd)
      .eq("is_active", true);
    const foundIds = new Set(((found ?? []) as { id: string }[]).map((r) => r.id));
    const missing = toAdd.filter((id) => !foundIds.has(id));
    if (missing.length) {
      return {
        ok: false,
        error: `${missing.length} question id(s) not found or inactive.`,
      };
    }

    const rows = toAdd.map((question_id, i) => ({
      mock_exam_id: mockExamId,
      question_id,
      sort_order: maxSort + i + 1,
    }));
    const { error } = await sb.from("mock_exam_questions").insert(rows);
    if (error) return { ok: false, error: error.message };

    // Keep legacy question_count column in sync as a cache (UI uses derived count).
    const total = have.size + toAdd.length;
    await sb.from("mock_exams").update({ question_count: total }).eq("id", mockExamId);

    revalidatePath(`/admin/mock-exams/${mockExamId}`);
    revalidatePath("/admin/mock-exams");
    revalidatePath("/dashboard/mock-exams");
    return { ok: true, id: mockExamId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removeQuestionFromMockPaper(
  mockExamId: string,
  questionId: string
): Promise<MockPaperActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const sb = createAdminClient();
    const { error } = await sb
      .from("mock_exam_questions")
      .delete()
      .eq("mock_exam_id", mockExamId)
      .eq("question_id", questionId);
    if (error) return { ok: false, error: error.message };

    const { count } = await sb
      .from("mock_exam_questions")
      .select("*", { count: "exact", head: true })
      .eq("mock_exam_id", mockExamId);
    await sb
      .from("mock_exams")
      .update({ question_count: count ?? 0 })
      .eq("id", mockExamId);

    revalidatePath(`/admin/mock-exams/${mockExamId}`);
    revalidatePath("/admin/mock-exams");
    revalidatePath("/dashboard/mock-exams");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Bulk-assign existing questions to a paper by question_id and/or exact
 * question_text. question_id accepts a bank UUID or an import external_id
 * (e.g. MRCP-Q-001). Unmatched rows are reported as errors (never silently
 * dropped). Optional sort_order controls paper order.
 *
 * When resolving by external_id and the same key exists in multiple sections,
 * pass sectionId (the admin section filter) to disambiguate.
 */
export async function bulkAssignMockQuestions(
  mockExamId: string,
  rows: {
    line: number;
    question_id?: string;
    question_text?: string;
    sort_order?: number;
  }[],
  sectionId?: string | null
): Promise<MockPaperActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  if (!mockExamId) return { ok: false, error: "Missing paper id." };
  if (!rows.length) return { ok: false, error: "No rows to assign." };

  try {
    const sb = createAdminClient();

    const idLookups = [
      ...new Set(
        rows
          .map((r) => (r.question_id ?? "").trim())
          .filter(Boolean)
      ),
    ];
    const textLookups = [
      ...new Set(
        rows
          .map((r) => (r.question_text ?? "").trim())
          .filter(Boolean)
      ),
    ];

    // key → resolved uuid, or null when external_id is ambiguous across sections
    const idToQuestion = new Map<string, string | null>();
    if (idLookups.length) {
      const uuidLookups = idLookups.filter((k) => UUID_RE.test(k));
      const externalLookups = idLookups.filter((k) => !UUID_RE.test(k));

      if (uuidLookups.length) {
        const { data } = await sb
          .from("questions")
          .select("id")
          .in("id", uuidLookups)
          .eq("is_active", true);
        for (const q of (data ?? []) as { id: string }[]) {
          idToQuestion.set(q.id, q.id);
        }
      }

      // Also try remaining UUID-shaped keys as external_id (rare but harmless).
      const stillMissing = idLookups.filter((k) => !idToQuestion.has(k));
      const extKeys = [
        ...new Set([...externalLookups, ...stillMissing]),
      ];

      if (extKeys.length) {
        let q = sb
          .from("questions")
          .select("id, external_id, section_id")
          .in("external_id", extKeys)
          .eq("is_active", true);
        if (sectionId) q = q.eq("section_id", sectionId);
        const { data } = await q;

        const byExt = new Map<string, { id: string; section_id: string | null }[]>();
        for (const row of (data ?? []) as {
          id: string;
          external_id: string | null;
          section_id: string | null;
        }[]) {
          if (!row.external_id) continue;
          const list = byExt.get(row.external_id) ?? [];
          list.push({ id: row.id, section_id: row.section_id });
          byExt.set(row.external_id, list);
        }

        for (const key of extKeys) {
          if (idToQuestion.has(key)) continue;
          const matches = byExt.get(key) ?? [];
          if (matches.length === 1) {
            idToQuestion.set(key, matches[0].id);
          } else if (matches.length > 1) {
            idToQuestion.set(key, null); // ambiguous
          }
        }
      }
    }

    const textToQuestion = new Map<string, string>();
    if (textLookups.length) {
      const { data } = await sb
        .from("questions")
        .select("id, stem")
        .in("stem", textLookups)
        .eq("is_active", true);
      for (const q of (data ?? []) as { id: string; stem: string }[]) {
        // Exact stem match (already trimmed on both sides via normalize).
        if (!textToQuestion.has(q.stem)) textToQuestion.set(q.stem, q.id);
      }
    }

    const { data: existing } = await sb
      .from("mock_exam_questions")
      .select("question_id")
      .eq("mock_exam_id", mockExamId);
    const have = new Set(
      ((existing ?? []) as { question_id: string }[]).map((r) => r.question_id)
    );

    const results: MockPaperActionResult["results"] = [];
    const toInsert: { question_id: string; sort_order: number }[] = [];
    let autoSort = have.size;

    for (const r of rows) {
      const qid = (r.question_id ?? "").trim();
      const qtext = (r.question_text ?? "").trim();

      if (!qid && !qtext) {
        results.push({
          line: r.line,
          status: "error",
          messages: ['Provide "question_id" or "question_text"'],
        });
        continue;
      }

      let resolved: string | undefined;
      if (qid) {
        if (!idToQuestion.has(qid)) {
          results.push({
            line: r.line,
            status: "error",
            messages: [
              `No question found with id "${qid}" — use a bank UUID or import external_id (e.g. MRCP-Q-001); check typos, section filter, and that it is still active`,
            ],
          });
          continue;
        }
        const mapped = idToQuestion.get(qid);
        if (mapped == null) {
          results.push({
            line: r.line,
            status: "error",
            messages: [
              `Ambiguous external_id "${qid}" in multiple sections — pick a section filter on this page, or use the question UUID`,
            ],
          });
          continue;
        }
        resolved = mapped;
      } else {
        resolved = textToQuestion.get(qtext);
        if (!resolved) {
          results.push({
            line: r.line,
            status: "error",
            messages: [
              `No question found matching this text — check for typos or extra whitespace: "${qtext.slice(0, 80)}${qtext.length > 80 ? "…" : ""}"`,
            ],
          });
          continue;
        }
      }

      if (have.has(resolved) || toInsert.some((t) => t.question_id === resolved)) {
        results.push({
          line: r.line,
          status: "error",
          messages: ["Already assigned to this paper"],
        });
        continue;
      }

      const sort =
        r.sort_order != null && Number.isFinite(r.sort_order) && r.sort_order > 0
          ? Math.floor(r.sort_order)
          : ++autoSort;

      toInsert.push({ question_id: resolved, sort_order: sort });
      have.add(resolved);
      results.push({ line: r.line, status: "assigned" });
    }

    if (toInsert.length) {
      const { error } = await sb.from("mock_exam_questions").insert(
        toInsert.map((t) => ({
          mock_exam_id: mockExamId,
          question_id: t.question_id,
          sort_order: t.sort_order,
        }))
      );
      if (error) return { ok: false, error: error.message, results };

      await sb
        .from("mock_exams")
        .update({ question_count: have.size })
        .eq("id", mockExamId);
    }

    revalidatePath(`/admin/mock-exams/${mockExamId}`);
    revalidatePath("/admin/mock-exams");
    revalidatePath("/dashboard/mock-exams");
    return { ok: true, results };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Start a curated mock paper: fixed question set in sort_order for every student.
 */
export async function startMockPaper(mockExamId: string): Promise<StartMockResult> {
  if (!hasServiceRole) return NO_KEY;
  const user = await getCurrentUser();
  if (!(await userHasActiveAccess(user))) {
    return { ok: false, error: PAYWALL_ERROR };
  }
  try {
    const sb = createAdminClient();
    const { data: paper } = await sb
      .from("mock_exams")
      .select("id, name, duration_minutes, is_active")
      .eq("id", mockExamId)
      .maybeSingle();
    if (!paper) return { ok: false, error: "Mock paper not found." };
    if ((paper as { is_active?: boolean }).is_active === false) {
      return { ok: false, error: "This mock paper is not active." };
    }

    const { data: links, error: lErr } = await sb
      .from("mock_exam_questions")
      .select("question_id, sort_order")
      .eq("mock_exam_id", mockExamId)
      .order("sort_order", { ascending: true });
    if (lErr) return { ok: false, error: lErr.message };

    const question_ids = ((links ?? []) as { question_id: string }[]).map(
      (r) => r.question_id
    );
    if (!question_ids.length) {
      return { ok: false, error: "This paper has no questions assigned yet." };
    }

    const userId = user?.id && user.id !== "demo" ? user.id : null;

    const { data: attempt, error: aErr } = await sb
      .from("attempts")
      .insert({
        user_id: userId,
        mock_exam_id: mockExamId,
        mode: "mock",
        status: "in_progress",
        question_ids,
        selected_count: question_ids.length,
      })
      .select("id")
      .single();
    if (aErr) return { ok: false, error: aErr.message };

    return { ok: true, attemptId: attempt.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
