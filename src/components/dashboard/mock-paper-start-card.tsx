"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminMockPaper } from "@/lib/types";
import { startMockPaper } from "@/lib/actions/mock-exams";
import { Clock, FileStack, Play } from "lucide-react";

export function MockPaperStartCard({ paper }: { paper: AdminMockPaper }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const start = () => {
    startTransition(async () => {
      const res = await startMockPaper(paper.id);
      if (res.ok && res.attemptId) {
        router.push(`/exam/run?exam=${res.attemptId}`);
      } else {
        toast.error(res.error ?? "Could not start paper");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileStack className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{paper.name}</div>
          {paper.series ? (
            <div className="text-xs text-muted-foreground">{paper.series}</div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{paper.question_count} questions</Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="size-3" />
          {paper.duration_minutes} min
        </Badge>
      </div>
      <Button className="gap-1.5" onClick={start} disabled={pending}>
        <Play className="size-4" />
        {pending ? "Starting…" : "Start paper"}
      </Button>
    </div>
  );
}
