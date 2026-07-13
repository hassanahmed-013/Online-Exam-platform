"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ExamConfig } from "@/lib/types";
import { startExam } from "@/lib/actions/exams";
import { Clock, Loader2 } from "lucide-react";

export function ExamLengthPicker({ exam }: { exam: ExamConfig }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyCount, setBusyCount] = useState<number | null>(null);

  const start = (count: number) => {
    setBusyCount(count);
    startTransition(async () => {
      const res = await startExam(exam.id, count);
      if (res.ok && res.attemptId) {
        router.push(`/exam/run?exam=${res.attemptId}`);
      } else {
        toast.error(res.error ?? "Could not start the exam.");
        setBusyCount(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{exam.name}</CardTitle>
          {exam.time_limit_minutes != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {exam.time_limit_minutes}m
            </span>
          )}
        </div>
        <Badge variant="secondary" className="w-fit">
          {exam.section_name ?? "All sections"}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Choose how many questions:
        </p>
        <div className="flex flex-wrap gap-2">
          {exam.available_question_counts.map((count) => (
            <Button
              key={count}
              variant="outline"
              onClick={() => start(count)}
              disabled={pending}
              className="min-w-20 gap-1.5"
            >
              {pending && busyCount === count && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              {count}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
