import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { QuestionRunner } from "@/components/runner/question-runner";
import {
  getExamAttempt,
  getQuestionsBySectionIds,
} from "@/lib/live-questions";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import type { RunnerMode } from "@/lib/types";

export const metadata = { title: "Session" };

type SearchParams = Promise<{
  attempt?: string;
  /** Attempt id created by startExam (configurable-length exams). */
  exam?: string;
  mode?: string;
  cats?: string;
  mock?: string;
}>;

export default async function RunPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  // Sampled attempt (configurable exam, bank session, or mock paper).
  if (sp.exam) {
    const live = await getExamAttempt(sp.exam);
    if (!live?.questions.length) redirect("/dashboard/question-bank");
    return (
      <QuestionRunner
        attemptId={sp.exam}
        mode={live.mode}
        questions={live.questions}
        durationMinutes={live.timeLimitMinutes ?? undefined}
        mockName={live.name}
        sectionName={live.sectionName}
      />
    );
  }

  // Ensure a stable attempt id lives in the URL so reload = resume.
  if (!sp.attempt) {
    const id = randomUUID();
    const params = new URLSearchParams({
      ...sp,
      attempt: id,
    } as Record<string, string>);
    redirect(`/exam/run?${params.toString()}`);
  }

  const attemptId = sp.attempt!;
  const mode: RunnerMode = sp.mode === "timed" ? "timed" : "practice";
  const sectionIds = sp.cats ? sp.cats.split(",").filter(Boolean) : [];

  // Live practice / timed sessions — always scoped to the selected section(s).
  if (isSupabaseConfigured) {
    if (!sectionIds.length) {
      redirect("/dashboard/question-bank");
    }
    const questions = await getQuestionsBySectionIds(sectionIds);
    if (!questions.length) {
      redirect("/dashboard/question-bank");
    }
    return (
      <QuestionRunner
        attemptId={attemptId}
        mode={mode}
        questions={questions}
        durationMinutes={
          mode === "timed" ? Math.max(5, questions.length) : undefined
        }
      />
    );
  }

  // Supabase not configured — nothing to run (no mock fallback).
  redirect("/dashboard");
}
