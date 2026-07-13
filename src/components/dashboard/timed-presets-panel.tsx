"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { startBankSession } from "@/lib/actions/bank-sessions";
import { Clock, Gauge, Loader2, Timer, Zap } from "lucide-react";

const PRESETS = [
  {
    name: "Quick fire",
    questions: 10,
    minutes: 10,
    desc: "A fast 10-question sprint across all live sections.",
    icon: Zap,
  },
  {
    name: "Standard test",
    questions: 20,
    minutes: 25,
    desc: "A balanced 20-question timed test across the bank.",
    icon: Timer,
  },
  {
    name: "Exam sprint",
    questions: 40,
    minutes: 50,
    desc: "Simulate exam pacing with 40 questions.",
    icon: Gauge,
  },
] as const;

export function TimedPresetsPanel({ sectionIds }: { sectionIds: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const allowedCounts = PRESETS.map((p) => p.questions);

  const startPreset = (name: string, questions: number) => {
    if (!sectionIds.length) {
      toast.error("No sections available yet — check back soon.");
      return;
    }
    setBusy(name);
    startTransition(async () => {
      const res = await startBankSession({
        sectionIds,
        mode: "timed",
        count: questions,
        allowedCounts: [...allowedCounts],
      });
      if (res.ok && res.attemptId) {
        router.push(`/exam/run?exam=${res.attemptId}`);
      } else {
        toast.error(res.error ?? "Could not start the timed set.");
        setBusy(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map((p) => (
          <div
            key={p.name}
            className="flex flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-sm"
          >
            <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <p.icon className="size-5" />
            </div>
            <h3 className="font-heading text-lg font-semibold">{p.name}</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.desc}</p>
            <div className="mt-4 flex gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="size-4" />
                {p.questions} Q
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {p.minutes} min
              </span>
            </div>
            <Button
              className="mt-4 h-11 gap-1.5 shadow-sm shadow-primary/15"
              disabled={pending || sectionIds.length === 0}
              onClick={() => startPreset(p.name, p.questions)}
            >
              {pending && busy === p.name ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Start {p.questions}-question timed set
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Custom</Badge>
            <span className="font-medium">Build your own timed set</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose specific sections and a length in the question bank.
          </p>
        </div>
        <Link
          href="/dashboard/question-bank#start-session"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
        >
          Go to question bank
        </Link>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Prefer a named exam with admin-set lengths?{" "}
        <Link
          href="/dashboard/exams"
          className="font-medium text-primary hover:underline"
        >
          Open Exams
        </Link>
      </p>
    </div>
  );
}
