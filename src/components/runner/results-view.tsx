"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadResult,
  toResultsSummary,
  type StoredResult,
} from "@/lib/session-store";
import { downloadResultsPdf } from "@/lib/actions/results-pdf";
import { formatDurationLabel } from "@/lib/session-utils";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Download,
  Home,
  ListChecks,
  Loader2,
  RotateCcw,
  Target,
  X,
} from "lucide-react";

function ScoreRing({ percent }: { percent: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const color =
    percent >= 70
      ? "text-emerald-500"
      : percent >= 50
        ? "text-amber-500"
        : "text-destructive";
  return (
    <div className="relative size-32">
      <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          className="fill-none stroke-muted"
          strokeWidth="10"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          className={cn("fill-none", color)}
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-semibold"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {percent}%
        </motion.span>
        <span className="text-xs text-muted-foreground">score</span>
      </div>
    </div>
  );
}

export function ResultsView({ studentName }: { studentName?: string }) {
  const params = useSearchParams();
  const id = params.get("id");
  const [result, setResult] = useState<StoredResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pdfPending, startPdf] = useTransition();

  useEffect(() => {
    if (id) setResult(loadResult(id));
    setLoaded(true);
  }, [id]);

  if (loaded && !result) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-heading text-xl font-semibold">Results not found</h1>
        <p className="text-sm text-muted-foreground">
          This session may have expired. Start a new one to keep practising.
        </p>
        <Link href="/dashboard/question-bank" className={buttonVariants()}>
          Go to question bank
        </Link>
      </div>
    );
  }

  if (!result) {
    return <div className="min-h-[60vh]" />;
  }

  const summary = toResultsSummary(result, studentName);
  const retryHref =
    result.mode === "mock"
      ? "/dashboard/mock-exams"
      : "/dashboard/question-bank";

  const onDownloadPdf = () => {
    startPdf(async () => {
      const res = await downloadResultsPdf(summary);
      if (!res.ok || !res.base64 || !res.filename) {
        toast.error(res.error ?? "Could not generate PDF");
        return;
      }
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Badge variant="secondary" className="mb-2 capitalize">
          {summary.paperName ?? summary.modeLabel} · complete
        </Badge>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Session results
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary.sectionName}
          {summary.paperName ? ` · ${summary.paperName}` : ""} ·{" "}
          {summary.modeLabel}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-6 py-6 sm:flex-row sm:justify-around">
            <ScoreRing percent={summary.scorePercent} />
            <div className="grid grid-cols-3 gap-6 text-center sm:gap-8">
              <div>
                <div className="flex items-center justify-center gap-1 text-emerald-600">
                  <Target className="size-4" />
                  <span className="text-2xl font-semibold">
                    {summary.correct}/{summary.total}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-semibold">{result.answered}</div>
                <div className="text-xs text-muted-foreground">Answered</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-2xl font-semibold tabular-nums">
                    {formatDurationLabel(summary.durationSeconds)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {summary.performanceNote && (
        <motion.p
          className="rounded-xl border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          {summary.performanceNote}
        </motion.p>
      )}

      {summary.byDifficulty.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>By difficulty</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {summary.byDifficulty.map((d) => (
              <div
                key={d.difficulty}
                className="rounded-lg border p-3 text-center"
              >
                <div className="text-xs font-medium capitalize text-muted-foreground">
                  {d.difficulty}
                </div>
                <div className="mt-1 text-xl font-semibold">{d.percent}%</div>
                <div className="text-xs text-muted-foreground">
                  {d.correct}/{d.total}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={onDownloadPdf}
          disabled={pdfPending}
        >
          {pdfPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Download PDF
        </Button>
        <Link
          href="#question-review"
          className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
        >
          <ListChecks className="size-4" />
          Review questions
        </Link>
        <Link href={retryHref} className={cn(buttonVariants(), "gap-1.5")}>
          <RotateCcw className="size-4" />
          Practise again
        </Link>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
        >
          <Home className="size-4" />
          Dashboard
        </Link>
      </div>

      <Card id="question-review">
        <CardHeader>
          <CardTitle>Question review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.perQuestion.map((q, i) => (
            <div key={q.questionId} className="rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-white",
                    q.isCorrect ? "bg-emerald-500" : "bg-destructive"
                  )}
                >
                  {q.isCorrect ? (
                    <Check className="size-4" />
                  ) : (
                    <X className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {q.categoryName}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {q.difficulty}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Q{i + 1}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{q.stem}</p>
                  {!q.selectedOptionId && (
                    <p className="mt-1 text-xs text-amber-600">Not answered</p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {q.explanation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
