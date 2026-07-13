"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Question } from "@/lib/types";
import { Check, Clock, Lock, X } from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E"];
const DEMO_SECONDS = 60;

export function DemoRunner({
  examName,
  questions,
  signupHref = "/signup",
}: {
  examName: string;
  questions: Question[];
  signupHref?: string;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEMO_SECONDS);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (locked) return;
    if (timeLeft <= 0) {
      setLocked(true);
      return;
    }
    const t = setInterval(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft, locked]);

  const current = questions[index];
  const revealed = selected !== null;
  const correct = current?.options.find((o) => o.is_correct);

  const choose = (optId: string) => {
    if (revealed) return;
    setSelected(optId);
    if (optId === correct?.id) setCorrectCount((c) => c + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setLocked(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  return (
    <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Logo href="/" />
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{examName} demo</Badge>
          <span
            className={cn(
              "flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 font-mono text-sm font-medium tabular-nums",
              timeLeft <= 10 && "bg-destructive/10 text-destructive"
            )}
          >
            <Clock className="size-3.5" />
            0:{timeLeft.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      <Progress value={(timeLeft / DEMO_SECONDS) * 100} className="mb-6 h-1.5" />

      {current && (
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline">{current.category_name}</Badge>
            <span className="text-xs text-muted-foreground">
              Question {index + 1} of {questions.length}
            </span>
          </div>
          {current.image_url && (
            // eslint-disable-next-line @next/next/no-img-element -- data-URI / storage URL
            <img
              src={current.image_url}
              alt="Question reference"
              className="mb-4 max-h-72 w-full rounded-xl border object-contain"
            />
          )}
          <h2 className="mb-6 text-lg font-medium leading-relaxed">
            {current.stem}
          </h2>
          <div className="space-y-3">
            {current.options.map((opt, i) => {
              const isSel = selected === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => choose(opt.id)}
                  disabled={revealed}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-all hover:border-primary/50",
                    revealed && opt.is_correct && "border-emerald-500 bg-emerald-500/10",
                    revealed && isSel && !opt.is_correct && "border-destructive bg-destructive/10"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      revealed && opt.is_correct && "border-emerald-500 bg-emerald-500 text-white",
                      revealed && isSel && !opt.is_correct && "border-destructive bg-destructive text-white"
                    )}
                  >
                    {revealed && opt.is_correct ? (
                      <Check className="size-4" />
                    ) : revealed && isSel ? (
                      <X className="size-4" />
                    ) : (
                      LETTERS[i]
                    )}
                  </span>
                  {opt.option_text}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="mt-5 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              {current.explanation}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={next} disabled={!revealed}>
              {index + 1 >= questions.length ? "Finish demo" : "Next question"}
            </Button>
          </div>
        </div>
      )}

      {/* Lock overlay */}
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl"
            >
              <span className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Lock className="size-7" />
              </span>
              <h2 className="font-heading text-xl font-semibold">
                Demo complete!
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You scored {correctCount} of {index + (revealed ? 1 : 0)} answered.
                Sign up free to unlock the full {examName} question bank, timed
                tests and mock exams.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Link href={signupHref} className={buttonVariants({ size: "lg" })}>
                  Sign up to continue
                </Link>
                <Link
                  href="/"
                  className={buttonVariants({ variant: "ghost", size: "lg" })}
                >
                  Back to home
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
