"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import type { Category, Difficulty, Question } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface FormState {
  stem: string;
  category_id: string;
  difficulty: Difficulty;
  options: string[];
  correctIndex: number;
  explanation: string;
  is_demo: boolean;
  image_url?: string;
}

function toForm(question: Question | undefined, categories: Category[]): FormState {
  if (!question) {
    return {
      stem: "",
      category_id: categories[0]?.id ?? "",
      difficulty: "medium",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      is_demo: false,
      image_url: undefined,
    };
  }
  const opts = question.options.map((o) => o.option_text);
  while (opts.length < 4) opts.push("");
  return {
    stem: question.stem,
    category_id: question.category_id,
    difficulty: question.difficulty,
    options: opts.slice(0, 4),
    correctIndex: Math.max(
      0,
      question.options.findIndex((o) => o.is_correct)
    ),
    explanation: question.explanation,
    is_demo: question.is_demo,
    image_url: question.image_url,
  };
}

export function QuestionForm({
  open,
  onClose,
  question,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  question?: Question;
  categories: Category[];
}) {
  const [form, setForm] = useState<FormState>(() => toForm(question, categories));

  // Re-seed the form each time the sheet opens for a different question.
  useEffect(() => {
    if (open) setForm(toForm(question, categories));
  }, [open, question, categories]);

  const setOption = (i: number, val: string) =>
    setForm((f) => ({
      ...f,
      options: f.options.map((o, idx) => (idx === i ? val : o)),
    }));

  const save = () => {
    if (!form.stem.trim()) {
      toast.error("Question stem is required");
      return;
    }
    if (form.options.some((o) => !o.trim())) {
      toast.error("All four options are required");
      return;
    }
    toast.success(question ? "Question updated" : "Question created", {
      description:
        "In production this would upsert the question, its options and any uploaded image via Supabase.",
    });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{question ? "Edit question" : "New question"}</SheetTitle>
          <SheetDescription>
            Attach an optional reference image — it renders above the stem when
            students answer.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-stem">Question stem</Label>
            <Textarea
              id="q-stem"
              value={form.stem}
              onChange={(e) => setForm({ ...form, stem: e.target.value })}
              placeholder="Which organelle is the primary site of ATP synthesis?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v ?? "" })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty (manual)</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) =>
                  setForm({ ...form, difficulty: v as Difficulty })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Used until this question has enough attempts to auto-classify.
          </p>

          <div className="space-y-2">
            <Label>Options (select the correct one)</Label>
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, correctIndex: i })}
                  className={
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors " +
                    (form.correctIndex === i
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "text-muted-foreground hover:border-primary/50")
                  }
                  aria-label={`Mark ${LETTERS[i]} correct`}
                >
                  {LETTERS[i]}
                </button>
                <Input
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  placeholder={`Option ${LETTERS[i]}`}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-exp">Explanation</Label>
            <Textarea
              id="q-exp"
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              placeholder="Shown after answering in practice mode."
            />
          </div>

          <ImageUploadField
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
          />

          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={form.is_demo}
              onCheckedChange={(c) => setForm({ ...form, is_demo: c === true })}
            />
            <span className="text-sm">Include in the free guest demo</span>
          </label>
        </div>

        <SheetFooter>
          <Button onClick={save}>
            {question ? "Save changes" : "Create question"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
