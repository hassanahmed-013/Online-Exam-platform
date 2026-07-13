"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSectionId ? [initialSectionId] : [])
  );
  const [mode, setMode] = useState<Mode>("practice");
  const [count, setCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  // Practice cards link here with ?section=…#start-session. Soft navigation
  // on the same page does not remount this panel, so sync selection + scroll.
  useEffect(() => {
    if (!initialSectionId) return;
    setSelected(new Set([initialSectionId]));
    setCount(null);
    setMode("practice");
    // Defer so layout is ready after the query-param update.
    const t = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [initialSectionId]);

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
    <div
      ref={panelRef}
      id="start-session"
      className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-card shadow-sm scroll-mt-6"
    >
      <div className="border-b border-border/60 bg-gradient-to-r from-primary/[0.08] to-transparent px-6 py-5">
        <h3 className="font-heading text-xl font-semibold tracking-tight">
          Build your session
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a mode, sections, and length — then start.
        </p>
      </div>

      <div className="space-y-5 p-6">
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
                "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
                mode === m.key
                  ? "border-primary bg-primary/[0.07] shadow-md shadow-primary/10 ring-1 ring-primary"
                  : "hover:border-primary/40 hover:bg-accent/40"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-10 items-center justify-center rounded-xl",
                  mode === m.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <m.icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] p-3.5"
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
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
                  isChecked
                    ? "border-primary/45 bg-primary/[0.06]"
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
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {c.attempted} of {c.total.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={attemptedPct} className="mt-2 h-1.5" />
                </div>
              </label>
            );
          })}
        </div>

        {selected.size > 0 && (
          <div className="space-y-3 rounded-2xl bg-muted/40 p-4">
            <p className="text-sm font-semibold">How many questions?</p>
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
                  className={cn(
                    "min-w-16",
                    count === n && "shadow-md shadow-primary/20"
                  )}
                  onClick={() => setCount(n)}
                  disabled={pending}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
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
            className="h-11 gap-1.5 px-6 shadow-md shadow-primary/20"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Start the questions
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
