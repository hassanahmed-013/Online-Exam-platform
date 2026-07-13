"use server";

import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import type { Difficulty, RunnerMode } from "@/lib/types";
import type { ResultsSummary } from "@/lib/session-store";
import { formatDurationLabel } from "@/lib/session-utils";

export interface CompleteAttemptInput {
  attemptId: string;
  answers: Record<string, string>; // questionId → optionId
  flags: string[];
  startedAt: number; // ms epoch from client session
  mode: RunnerMode;
  mockName?: string;
  sectionName?: string;
}

export interface CompleteAttemptResult {
  ok: boolean;
  error?: string;
  summary?: ResultsSummary;
}

/**
 * Persist attempt_answers + mark the attempt completed.
 * Returns a server-scored ResultsSummary for PDF / results UI.
 */
export async function completeAttempt(
  input: CompleteAttemptInput
): Promise<CompleteAttemptResult> {
  if (!hasServiceRole) {
    return { ok: false, error: "Server is not configured for attempt writes." };
  }
  if (!input.attemptId) {
    return { ok: false, error: "Missing attempt id." };
  }

  try {
    const sb = createAdminClient();
    const user = await getCurrentUser();

    const { data: attempt, error: aErr } = await sb
      .from("attempts")
      .select("id,user_id,question_ids,mode,status,started_at")
      .eq("id", input.attemptId)
      .maybeSingle();
    if (aErr) return { ok: false, error: aErr.message };
    if (!attempt) return { ok: false, error: "Attempt not found." };

    // Owners (or admins) only — guests have null user_id.
    if (
      attempt.user_id &&
      user &&
      user.id !== "demo" &&
      user.role !== "admin" &&
      attempt.user_id !== user.id
    ) {
      return { ok: false, error: "Not allowed to complete this attempt." };
    }

    const questionIds: string[] = attempt.question_ids ?? [];
    if (!questionIds.length) {
      return { ok: false, error: "Attempt has no questions." };
    }

    const { data: qRows, error: qErr } = await sb
      .from("questions")
      .select(
        "id,stem,explanation,difficulty,difficulty_override,section_id,sections(name),question_options(id,is_correct,sort_order)"
      )
      .in("id", questionIds);
    if (qErr) return { ok: false, error: qErr.message };

    type QRow = {
      id: string;
      stem: string;
      explanation: string | null;
      difficulty: string | null;
      difficulty_override: string | null;
      section_id: string | null;
      sections: { name: string } | null;
      question_options: {
        id: string;
        is_correct: boolean;
        sort_order: number | null;
      }[];
    };

    const byId = new Map(
      ((qRows ?? []) as unknown as QRow[]).map((q) => [q.id, q])
    );

    const flagSet = new Set(input.flags);
    const answerRows: {
      attempt_id: string;
      question_id: string;
      selected_option_id: string | null;
      is_correct: boolean;
      flagged: boolean;
      answered_at: string;
    }[] = [];

    let correctCount = 0;
    let answeredCount = 0;
    const perQuestion: {
      questionId: string;
      stem: string;
      categoryName: string;
      difficulty: Difficulty;
      selectedOptionId?: string;
      correctOptionId: string;
      isCorrect: boolean;
      explanation: string;
    }[] = [];

    const nowIso = new Date().toISOString();

    for (const qid of questionIds) {
      const q = byId.get(qid);
      if (!q) continue;
      const opts = [...(q.question_options ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
      const correctOpt = opts.find((o) => o.is_correct);
      const selected = input.answers[qid];
      const isCorrect = Boolean(selected && correctOpt && selected === correctOpt.id);
      if (selected) answeredCount += 1;
      if (isCorrect) correctCount += 1;

      answerRows.push({
        attempt_id: input.attemptId,
        question_id: qid,
        selected_option_id: selected ?? null,
        is_correct: isCorrect,
        flagged: flagSet.has(qid),
        answered_at: nowIso,
      });

      perQuestion.push({
        questionId: qid,
        stem: q.stem,
        categoryName: q.sections?.name ?? "Unassigned",
        difficulty: ((q.difficulty_override || q.difficulty || "medium") as Difficulty),
        selectedOptionId: selected,
        correctOptionId: correctOpt?.id ?? "",
        isCorrect,
        explanation: q.explanation ?? "",
      });
    }

    // Replace any prior answers (re-submit / resume edge cases).
    await sb.from("attempt_answers").delete().eq("attempt_id", input.attemptId);
    if (answerRows.length) {
      const { error: insErr } = await sb.from("attempt_answers").insert(answerRows);
      if (insErr) return { ok: false, error: insErr.message };
    }

    const total = questionIds.length;
    const scorePercent = total ? Math.round((correctCount / total) * 100) : 0;
    const startedMs = input.startedAt || Date.now();
    const durationSeconds = Math.max(
      0,
      Math.round((Date.now() - startedMs) / 1000)
    );

    const { error: upErr } = await sb
      .from("attempts")
      .update({
        status: "completed",
        completed_at: nowIso,
        score_percent: scorePercent,
      })
      .eq("id", input.attemptId);
    if (upErr) return { ok: false, error: upErr.message };

    // Bump per-question correct_rate / sample size (best-effort).
    for (const row of answerRows) {
      if (!row.selected_option_id) continue;
      const q = byId.get(row.question_id);
      if (!q) continue;
      // Lightweight: we don't have prior rate here — skip bulk recalc; admin
      // analytics still count attempt_answers directly.
    }

    const sectionName =
      input.sectionName ||
      (perQuestion[0] &&
      perQuestion.every((p) => p.categoryName === perQuestion[0]!.categoryName)
        ? perQuestion[0]!.categoryName
        : "Mixed sections");

    const difficulties: Difficulty[] = ["easy", "medium", "hard"];
    const byDifficulty = difficulties
      .map((d) => {
        const rows = perQuestion.filter((p) => p.difficulty === d);
        const c = rows.filter((p) => p.isCorrect).length;
        return {
          difficulty: d,
          total: rows.length,
          correct: c,
          percent: rows.length ? Math.round((c / rows.length) * 100) : 0,
        };
      })
      .filter((d) => d.total > 0);

    const mode = (attempt.mode as RunnerMode) || input.mode;
    const modeLabel =
      mode === "practice" ? "Practice" : mode === "timed" ? "Timed" : "Mock";
    const studentName = user?.full_name || "Student";
    const completedAt = Date.now();

    const summary: ResultsSummary = {
      attemptId: input.attemptId,
      studentName,
      sectionName,
      modeLabel,
      paperName: mode === "mock" ? input.mockName : undefined,
      scorePercent,
      correct: correctCount,
      total,
      durationLabel: formatDurationLabel(durationSeconds),
      durationSeconds,
      byDifficulty,
      performanceNote:
        scorePercent >= 70
          ? "Solid result — keep practising to lock it in."
          : "Room to improve — review the missed questions below.",
      completedAt,
      completedAtLabel: new Date(completedAt).toLocaleString(),
    };

    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Load a completed attempt scored on the server (for PDF download). */
export async function getServerResultsSummary(
  attemptId: string
): Promise<CompleteAttemptResult> {
  if (!hasServiceRole) {
    return { ok: false, error: "Server is not configured." };
  }
  if (!attemptId) return { ok: false, error: "Missing attempt id." };

  try {
    const sb = createAdminClient();
    const user = await getCurrentUser();

    const { data: attempt, error } = await sb
      .from("attempts")
      .select(
        "id,user_id,question_ids,mode,status,score_percent,started_at,completed_at,mock_exams(name)"
      )
      .eq("id", attemptId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!attempt) return { ok: false, error: "Attempt not found." };
    if (attempt.status !== "completed") {
      return { ok: false, error: "Attempt is not completed yet." };
    }
    if (
      attempt.user_id &&
      user &&
      user.id !== "demo" &&
      user.role !== "admin" &&
      attempt.user_id !== user.id
    ) {
      return { ok: false, error: "Not allowed." };
    }

    const { data: answers } = await sb
      .from("attempt_answers")
      .select("question_id,is_correct")
      .eq("attempt_id", attemptId);

    const correct = (answers ?? []).filter(
      (a: { is_correct: boolean }) => a.is_correct
    ).length;
    const total = (attempt.question_ids as string[] | null)?.length ?? 0;
    const scorePercent =
      attempt.score_percent != null
        ? Number(attempt.score_percent)
        : total
          ? Math.round((correct / total) * 100)
          : 0;

    const started = attempt.started_at
      ? new Date(attempt.started_at).getTime()
      : Date.now();
    const completed = attempt.completed_at
      ? new Date(attempt.completed_at).getTime()
      : Date.now();
    const durationSeconds = Math.max(0, Math.round((completed - started) / 1000));

    const mode = (attempt.mode as RunnerMode) || "practice";
    const mockJoin = attempt.mock_exams as
      | { name: string }
      | { name: string }[]
      | null
      | undefined;
    const mockName = Array.isArray(mockJoin)
      ? mockJoin[0]?.name
      : mockJoin?.name;

    const summary: ResultsSummary = {
      attemptId,
      studentName: user?.full_name || "Student",
      sectionName: "Session",
      modeLabel:
        mode === "practice" ? "Practice" : mode === "timed" ? "Timed" : "Mock",
      paperName: mode === "mock" ? mockName : undefined,
      scorePercent,
      correct,
      total,
      durationLabel: formatDurationLabel(durationSeconds),
      durationSeconds,
      byDifficulty: [],
      performanceNote: "",
      completedAt: completed,
      completedAtLabel: new Date(completed).toLocaleString(),
    };

    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
