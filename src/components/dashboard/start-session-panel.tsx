"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Category, ExamConfig } from "@/lib/types";
import { startBankSession } from "@/lib/actions/bank-sessions";
import { DEFAULT_QUESTION_COUNTS } from "@/lib/session-utils";
import { ArrowRight, Clock, Loader2, Zap } from "lucide-react";

type Mode = "practice" | "timed";

function countsForSelection(
  selectedIds: string[],
  exams: ExamConfig[]
): number[] {
  if (selectedIds.length === 1) {
    const scoped = exams.find((e) => e.section_id === selectedIds[0]);
    if (scoped?.available_question_counts?.length) {
      return scoped.available_question_counts;
    }
  }
  const mixed = exams.find((e) => !e.section_id);
  if (mixed?.available_question_counts?.length) {
    return mixed.available_question_counts;
  }
  return [...DEFAULT_QUESTION_COUNTS];
}

export function StartSessionPanel({
  categories,
  exams = [],
  initialSectionId,
}: {
  categories: Category[];
  exams?: ExamConfig[];
  initialSectionId?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSectionId ? [initialSectionId] : [])
  );
  const [mode, setMode] = useState<Mode>("practice");
  const [count, setCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const allSelected = selected.size === categories.length && categories.length > 0;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCount(null);
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === categories.length
        ? new Set()
        : new Set(categories.map((c) => c.id))
    );
    setCount(null);
  };

  const selectedIds = useMemo(() => [...selected], [selected]);

  const allowedCounts = useMemo(
    () => countsForSelection(selectedIds, exams),
    [selectedIds, exams]
  );

  const selectedTotal = useMemo(
    () =>
      categories
        .filter((c) => selected.has(c.id))
        .reduce((sum, c) => sum + c.total, 0),
    [categories, selected]
  );

  const start = () => {
    if (selected.size === 0 || count == null) return;
    startTransition(async () => {
      const res = await startBankSession({
        sectionIds: selectedIds,
        mode,
        count,
        allowedCounts,
      });
      if (res.ok && res.attemptId) {
        router.push(`/exam/run?exam=${res.attemptId}`);
      } else {
        toast.error(res.error ?? "Could not start the session.");
      }
    });
  };

  return (
    <Card id="start-session">
      <CardHeader>
        <CardTitle>Build your session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              { key: "practice", label: "Standard", desc: "Instant feedback", icon: Zap },
              { key: "timed", label: "Timed test", desc: "Beat the clock", icon: Clock },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                mode === m.key
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:border-primary/40 hover:bg-accent/40"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-lg",
                  mode === m.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <m.icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {m.desc}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3"
            onClick={(e) => {
              e.preventDefault();
              toggleAll();
            }}
          >
            <Checkbox checked={allSelected} />
            <span className="text-sm font-medium">All sections</span>
            <Badge variant="secondary" className="ml-auto">
              {categories.length}
            </Badge>
          </label>

          {categories.map((c) => {
            const isChecked = selected.has(c.id);
            const attemptedPct = c.total ? (c.attempted / c.total) * 100 : 0;
            return (
              <label
                key={c.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                  isChecked
                    ? "border-primary/40 bg-primary/5"
                    : "hover:bg-accent/40"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  toggle(c.id);
                }}
              >
                <Checkbox checked={isChecked} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.attempted} of {c.total}
                    </span>
                  </div>
                  <Progress value={attemptedPct} className="mt-1.5 h-1" />
                </div>
              </label>
            );
          })}
        </div>

        {selected.size > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">How many questions?</p>
            <p className="text-xs text-muted-foreground">
              Lengths come from the admin exam config for this scope
              {selectedTotal > 0
                ? ` · ${selectedTotal.toLocaleString()} available`
                : ""}
              .
            </p>
            <div className="flex flex-wrap gap-2">
              {allowedCounts.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant={count === n ? "default" : "outline"}
                  className="min-w-16"
                  onClick={() => setCount(n)}
                  disabled={pending}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {selected.size === 0
              ? "Select at least one section."
              : count == null
                ? "Pick a question count to continue."
                : `${selected.size} section${selected.size === 1 ? "" : "s"} · ${count} questions`}
          </p>
          <Button
            onClick={start}
            disabled={selected.size === 0 || count == null || pending}
            className="h-10 gap-1.5"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Start the questions
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
