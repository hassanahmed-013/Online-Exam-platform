"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Question, RunnerMode } from "@/lib/types";
import {
  buildResult,
  clearSession,
  loadSession,
  saveResult,
  saveSession,
  type StoredSession,
} from "@/lib/session-store";
import { completeAttempt } from "@/lib/actions/attempts";
import { formatClock } from "@/lib/session-utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Flag,
  Loader2,
  Smartphone,
  Timer,
  X,
} from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuestionRunner({
  attemptId,
  mode,
  questions,
  durationMinutes,
  mockName,
  sectionName,
}: {
  attemptId: string;
  mode: RunnerMode;
  questions: Question[];
  durationMinutes?: number;
  mockName?: string;
  sectionName?: string;
}) {
  const router = useRouter();
  // Practice: instant correct/wrong + explanation. Timed/mock: hide until submit.
  const showImmediateFeedback = mode === "practice";
  const durationSeconds = durationMinutes ? durationMinutes * 60 : undefined;
  const isCountdown = mode === "timed" || mode === "mock";

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<number | undefined>(
    isCountdown ? durationSeconds : undefined
  );
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);

  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const saved = loadSession(attemptId);
    if (saved && !saved.submitted) {
      setIndex(Math.min(saved.currentIndex, questions.length - 1));
      setAnswers(saved.answers);
      setFlags(new Set(saved.flags));
      setStartedAt(saved.startedAt);
      const elapsedSec = Math.floor((Date.now() - saved.startedAt) / 1000);
      setElapsed(Math.max(0, elapsedSec));
      if (isCountdown && durationSeconds) {
        setTimeLeft(Math.max(0, durationSeconds - elapsedSec));
      }
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const current = questions[index];

  const persist = useCallback(
    (partial: Partial<StoredSession>) => {
      const base: StoredSession = {
        attemptId,
        mode,
        mockName,
        sectionName,
        durationSeconds,
        questionIds: questions.map((q) => q.id),
        currentIndex: index,
        answers,
        flags: [...flags],
        startedAt,
        submitted: false,
      };
      saveSession({ ...base, ...partial });
    },
    [
      attemptId,
      mode,
      mockName,
      sectionName,
      durationSeconds,
      questions,
      index,
      answers,
      flags,
      startedAt,
    ]
  );

  const finish = useCallback(async () => {
    setSubmitting(true);
    const finalSession: StoredSession = {
      attemptId,
      mode,
      mockName,
      sectionName,
      durationSeconds,
      questionIds: questions.map((q) => q.id),
      currentIndex: index,
      answers,
      flags: [...flags],
      startedAt,
      submitted: true,
    };
    const result = buildResult(finalSession, questions);
    saveResult(result);

    // Persist to Supabase so Review / Performance / analytics stay in sync.
    try {
      const res = await completeAttempt({
        attemptId,
        answers,
        flags: [...flags],
        startedAt,
        mode,
        mockName,
        sectionName,
      });
      if (!res.ok) {
        toast.message("Results saved locally", {
          description: res.error ?? "Could not sync to the server.",
        });
      }
    } catch {
      toast.message("Results saved locally", {
        description: "Could not sync to the server.",
      });
    }

    clearSession(attemptId);
    router.push(`/exam/results?id=${attemptId}`);
  }, [
    attemptId,
    mode,
    mockName,
    sectionName,
    durationSeconds,
    questions,
    index,
    answers,
    flags,
    startedAt,
    router,
  ]);

  finishRef.current = finish;

  // Countdown for timed / mock — auto-submit at zero.
  useEffect(() => {
    if (!hydrated || !isCountdown || timeLeft === undefined) return;
    if (timeLeft <= 0) {
      finishRef.current();
      return;
    }
    const t = setInterval(
      () => setTimeLeft((v) => (v === undefined ? v : v - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [hydrated, isCountdown, timeLeft]);

  // Stopwatch for practice (and elapsed tracking for all modes).
  useEffect(() => {
    if (!hydrated) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [hydrated, startedAt]);

  const answeredCount = Object.keys(answers).length;

  const selectOption = (optionId: string) => {
    if (showImmediateFeedback && answers[current.id]) return;
    const next = { ...answers, [current.id]: optionId };
    setAnswers(next);
    persist({ answers: next });
  };

  const toggleFlag = () => {
    const next = new Set(flags);
    if (next.has(current.id)) next.delete(current.id);
    else next.add(current.id);
    setFlags(next);
    persist({ flags: [...next] });
  };

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(i, questions.length - 1));
    setIndex(clamped);
    persist({ currentIndex: clamped });
  };

  const handleSubmit = () => {
    const unanswered = questions.length - answeredCount;
    const msg =
      mode === "practice"
        ? "Finish this session and see your results?"
        : `Submit your ${mode === "mock" ? "mock exam" : "test"}? ${
            unanswered > 0 ? `${unanswered} question(s) are unanswered.` : ""
          }`;
    if (window.confirm(msg)) finish();
  };

  const isRevealed = showImmediateFeedback && !!answers[current?.id];
  const correctOption = useMemo(
    () => current?.options.find((o) => o.is_correct),
    [current]
  );

  if (mode === "mock" && isNarrow) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Smartphone className="size-7" />
        </span>
        <h2 className="font-heading text-xl font-semibold">
          Mock exams need a larger screen
        </h2>
        <p className="text-sm text-muted-foreground">
          To mirror real exam conditions, mock papers can&apos;t be taken on a
          mobile phone. Please switch to a tablet or desktop to continue.
        </p>
        <Link href="/dashboard/mock-exams">
          <Button variant="outline">Back to mock exams</Button>
        </Link>
      </div>
    );
  }

  if (!hydrated || !current) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progressPct = ((index + 1) / questions.length) * 100;
  const timerDisplay = isCountdown
    ? formatClock(timeLeft ?? 0)
    : formatClock(elapsed);
  const timerUrgent = isCountdown && (timeLeft ?? 0) < 60;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-4 sm:py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={
            mode === "mock" ? "/dashboard/mock-exams" : "/dashboard/question-bank"
          }
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Exit"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <Badge variant="secondary" className="capitalize">
          {mockName ?? `${mode} mode`}
        </Badge>
        <div className="ml-auto flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-sm font-medium tabular-nums",
              timerUrgent && "bg-destructive/10 text-destructive"
            )}
            title={isCountdown ? "Time remaining" : "Elapsed time"}
          >
            <Timer className="size-3.5 opacity-70" />
            {timerDisplay}
          </span>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            {mode === "practice" ? "Finish" : "Submit"}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={progressPct} />
      </div>

      <div className="flex-1">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{current.category_name}</Badge>
            <Badge variant="outline" className="capitalize">
              {current.difficulty}
            </Badge>
          </div>
          <Button
            variant={flags.has(current.id) ? "default" : "outline"}
            size="sm"
            onClick={toggleFlag}
            className="gap-1.5"
          >
            <Flag className="size-3.5" />
            {flags.has(current.id) ? "Flagged" : "Flag"}
          </Button>
        </div>

        {current.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- storage / data URI
          <img
            src={current.image_url}
            alt="Question reference"
            className="mb-4 max-h-80 w-full rounded-xl border bg-muted/30 object-contain"
          />
        )}
        <h2 className="mb-6 text-lg font-medium leading-relaxed text-balance">
          {current.stem}
        </h2>

        <div className="space-y-3">
          {current.options.map((opt, i) => {
            const selected = answers[current.id] === opt.id;
            const showState = isRevealed;
            const isCorrect = opt.is_correct;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => selectOption(opt.id)}
                disabled={isRevealed}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all",
                  "hover:border-primary/50 hover:bg-accent/40",
                  selected &&
                    !showState &&
                    "border-primary bg-primary/5 ring-1 ring-primary",
                  showState && isCorrect && "border-emerald-500 bg-emerald-500/10",
                  showState &&
                    selected &&
                    !isCorrect &&
                    "border-destructive bg-destructive/10",
                  isRevealed && "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    selected &&
                      !showState &&
                      "border-primary bg-primary text-primary-foreground",
                    showState &&
                      isCorrect &&
                      "border-emerald-500 bg-emerald-500 text-white",
                    showState &&
                      selected &&
                      !isCorrect &&
                      "border-destructive bg-destructive text-white"
                  )}
                >
                  {showState && isCorrect ? (
                    <Check className="size-4" />
                  ) : showState && selected && !isCorrect ? (
                    <X className="size-4" />
                  ) : (
                    LETTERS[i]
                  )}
                </span>
                <span className="flex-1">{opt.option_text}</span>
              </button>
            );
          })}
        </div>

        {isRevealed && (
          <div className="mt-6 rounded-xl border bg-muted/40 p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium">
              {answers[current.id] === correctOption?.id ? (
                <span className="text-emerald-600">Correct</span>
              ) : (
                <span className="text-destructive">Incorrect</span>
              )}
              <span className="text-muted-foreground">· Explanation</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {current.explanation?.trim()
                ? current.explanation
                : "No explanation has been added for this question yet."}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t pt-4">
        <Button
          variant="outline"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="gap-1"
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        {mode !== "practice" && (
          <div className="hidden max-w-md flex-wrap justify-center gap-1.5 sm:flex">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => goTo(i)}
                className={cn(
                  "size-7 rounded-md border text-xs font-medium transition-colors",
                  i === index &&
                    "border-primary bg-primary text-primary-foreground",
                  i !== index &&
                    answers[q.id] &&
                    "border-primary/40 bg-primary/10 text-primary",
                  i !== index &&
                    !answers[q.id] &&
                    "text-muted-foreground hover:bg-muted",
                  flags.has(q.id) && "ring-2 ring-amber-400"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {index === questions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            className="gap-1"
            disabled={submitting}
          >
            {mode === "practice" ? "Finish" : "Submit"}
            <Check className="size-4" />
          </Button>
        ) : (
          <Button onClick={() => goTo(index + 1)} className="gap-1">
            Next
            <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
