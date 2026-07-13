"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExamConfig, Section } from "@/lib/types";
import { deleteExam, saveExam } from "@/lib/actions/exams";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";

const ALL = "__all__";

const LENGTH_PRESETS = [20, 40, 100, 200] as const;
const TIME_PRESETS = [
  { label: "Untimed", value: "" },
  { label: "20 min", value: "20" },
  { label: "40 min", value: "40" },
  { label: "60 min", value: "60" },
  { label: "90 min", value: "90" },
  { label: "120 min", value: "120" },
] as const;

interface FormState {
  id: string | null;
  name: string;
  section_id: string;
  selectedCounts: number[];
  time_limit_minutes: string;
  customTime: boolean;
}

function parseCounts(raw: string): number[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ].sort((a, b) => a - b);
}

function formatTimer(minutes: number | null | undefined) {
  if (minutes == null) return "Untimed";
  if (minutes < 60) return `${minutes} min timer`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m timer` : `${h}h timer`;
}

export function ExamManager({
  exams,
  sections,
  enabled,
}: {
  exams: ExamConfig[];
  sections: Section[];
  enabled: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  const openNew = () => {
    if (!enabled) {
      toast.error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local to create exams.");
      return;
    }
    setForm({
      id: null,
      name: "",
      section_id: ALL,
      selectedCounts: [20, 40, 100, 200],
      time_limit_minutes: "",
      customTime: false,
    });
  };

  const openEdit = (e: ExamConfig) => {
    if (!enabled) {
      toast.error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local to edit exams.");
      return;
    }
    const time =
      e.time_limit_minutes != null ? String(e.time_limit_minutes) : "";
    const isPreset = TIME_PRESETS.some((t) => t.value === time);
    setForm({
      id: e.id,
      name: e.name,
      section_id: e.section_id ?? ALL,
      selectedCounts: [...(e.available_question_counts ?? [])],
      time_limit_minutes: time,
      customTime: time !== "" && !isPreset,
    });
  };

  const close = () => setForm(null);

  const toggleCount = (n: number) => {
    if (!form) return;
    const current = form.selectedCounts ?? [];
    const has = current.includes(n);
    const next = has
      ? current.filter((c) => c !== n)
      : [...current, n].sort((a, b) => a - b);
    setForm({ ...form, selectedCounts: next });
  };

  const submit = () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("Exam name is required.");
      return;
    }
    const counts = form.selectedCounts ?? [];
    if (!counts.length) {
      toast.error("Pick at least one question length.");
      return;
    }
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("section_id", form.section_id);
    fd.set("counts", counts.join(", "));
    fd.set("time_limit_minutes", form.time_limit_minutes ?? "");
    startTransition(async () => {
      const res = await saveExam(form.id, fd);
      if (res.ok) {
        toast.success(
          form.id
            ? "Exam updated"
            : "Exam created — it now appears for students."
        );
        close();
        router.refresh();
      } else toast.error(res.error ?? "Save failed");
    });
  };

  const remove = (e: ExamConfig) => {
    if (!confirm(`Delete exam "${e.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteExam(e.id);
      if (res.ok) {
        toast.success("Exam deleted");
        router.refresh();
      } else toast.error(res.error ?? "Delete failed");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" className="gap-1.5" onClick={openNew}>
          <Plus className="size-4" />
          New exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No exams yet. Create one so students can take a configurable-length
            test on Dashboard → Exams.
          </p>
          <Button type="button" className="gap-1.5" onClick={openNew}>
            <Plus className="size-4" />
            Create your first exam
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {exams.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.name}</span>
                  {!e.is_active && <Badge variant="outline">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Section: {e.section_name ?? "All sections"}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1.5 sm:items-end">
                <div className="flex flex-wrap gap-1">
                  {(e.available_question_counts ?? []).map((c) => (
                    <Badge key={c} variant="secondary">
                      {c} Q
                    </Badge>
                  ))}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    e.time_limit_minutes != null
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Clock className="size-3.5" />
                  {formatTimer(e.time_limit_minutes)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => openEdit(e)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(e)}
                disabled={!enabled || pending}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Sheet
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{form?.id ? "Edit exam" : "New exam"}</SheetTitle>
            <SheetDescription>
              You set the section, allowed lengths, and one timer for the exam.
              Students then pick a length on Dashboard → Exams.
            </SheetDescription>
          </SheetHeader>

          {form && (() => {
            const selectedCounts = form.selectedCounts ?? [];
            const timeLimit = form.time_limit_minutes ?? "";
            const customTime = form.customTime ?? false;
            return (
            <div className="space-y-5 px-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-name">Exam name</Label>
                <Input
                  id="e-name"
                  value={form.name}
                  onChange={(ev) => setForm({ ...form, name: ev.target.value })}
                  placeholder="e.g. Biology Practice Exam"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Section</Label>
                <Select
                  value={form.section_id}
                  onValueChange={(v) =>
                    setForm({ ...form, section_id: v ?? ALL })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All sections (mixed)</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Question lengths students can pick</Label>
                <div className="flex flex-wrap gap-2">
                  {LENGTH_PRESETS.map((n) => {
                    const on = selectedCounts.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => toggleCount(n)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:border-primary/40 hover:bg-accent/50"
                        )}
                      >
                        {n} Q
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tap to toggle. Selected:{" "}
                  {selectedCounts.length
                    ? selectedCounts.map((c) => `${c} Q`).join(", ")
                    : "none"}
                </p>
                <Input
                  value={selectedCounts.join(", ")}
                  onChange={(ev) =>
                    setForm({
                      ...form,
                      selectedCounts: parseCounts(ev.target.value),
                    })
                  }
                  placeholder="Or type custom: 10, 30, 50"
                />
              </div>

              <div className="space-y-2">
                <Label>Exam timer</Label>
                <p className="text-xs text-muted-foreground">
                  One timer for the whole exam (applies no matter which length
                  the student picks). Choose Untimed for practice-style exams.
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIME_PRESETS.map((t) => {
                    const on = !customTime && timeLimit === t.value;
                    return (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            time_limit_minutes: t.value,
                            customTime: false,
                          })
                        }
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:border-primary/40 hover:bg-accent/50"
                        )}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        customTime: true,
                        time_limit_minutes: timeLimit || "30",
                      })
                    }
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      customTime
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary/40 hover:bg-accent/50"
                    )}
                  >
                    Custom…
                  </button>
                </div>
                {customTime ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={600}
                      value={timeLimit}
                      onChange={(ev) =>
                        setForm({
                          ...form,
                          time_limit_minutes: ev.target.value,
                        })
                      }
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                ) : null}
              </div>
            </div>
            );
          })()}

          <SheetFooter>
            <Button
              type="button"
              onClick={submit}
              disabled={pending || !enabled}
            >
              {pending ? "Saving…" : form?.id ? "Save changes" : "Create exam"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={pending}
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
