import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, Gauge, Timer, Zap } from "lucide-react";

export const metadata = { title: "Fixed sets & timed tests" };

const presets = [
  {
    name: "Quick fire",
    questions: 10,
    minutes: 10,
    desc: "A fast 10-question sprint across all subjects.",
    icon: Zap,
  },
  {
    name: "Standard test",
    questions: 20,
    minutes: 25,
    desc: "A balanced 20-question timed test.",
    icon: Timer,
  },
  {
    name: "Exam sprint",
    questions: 40,
    minutes: 50,
    desc: "Simulate exam pacing with 40 questions.",
    icon: Gauge,
  },
];

export default function TimedPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Fixed sets & timed tests
        </h2>
        <p className="text-sm text-muted-foreground">
          Prefer admin-configured lengths (50 / 100 / 200)? Use Exams for random
          sampling from the live bank. Or build a custom timed set below.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((p) => (
          <Card key={p.name} className="flex flex-col">
            <CardHeader>
              <div className="mb-1 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <p.icon className="size-5" />
              </div>
              <CardTitle>{p.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <p className="flex-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Zap className="size-4" />
                  {p.questions} Q
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {p.minutes} min
                </span>
              </div>
              <Link
                href="/dashboard/exams"
                className={cn(buttonVariants(), "h-10")}
              >
                Open configurable exams
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Custom</Badge>
              <span className="font-medium">Build your own timed set</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose specific categories and switch the mode to timed.
            </p>
          </div>
          <Link
            href="/dashboard/question-bank"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Go to question bank
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
