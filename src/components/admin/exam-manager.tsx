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
import type { ExamConfig, Section } from "@/lib/types";
import { deleteExam, saveExam } from "@/lib/actions/exams";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";

const ALL = "__all__";

interface FormState {
  id: string | null;
  name: string;
  section_id: string;
  counts: string;
  time_limit_minutes: string;
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
      counts: "20, 40, 100, 200",
      time_limit_minutes: "",
    });
  };
  const openEdit = (e: ExamConfig) => {
    if (!enabled) {
      toast.error("Add SUPABASE_SERVICE_ROLE_KEY to .env.local to edit exams.");
      return;
    }
    setForm({
      id: e.id,
      name: e.name,
      section_id: e.section_id ?? ALL,
      counts: e.available_question_counts.join(", "),
      time_limit_minutes: e.time_limit_minutes?.toString() ?? "",
    });
  };
  const close = () => setForm(null);

  const submit = () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("Exam name is required.");
      return;
    }
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("section_id", form.section_id);
    fd.set("counts", form.counts);
    fd.set("time_limit_minutes", form.time_limit_minutes);
    startTransition(async () => {
      const res = await saveExam(form.id, fd);
      if (res.ok) {
        toast.success(form.id ? "Exam updated" : "Exam created — it now appears for students.");
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
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.name}</span>
                  {!e.is_active && <Badge variant="outline">Inactive</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {e.section_name ?? "All sections"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {e.available_question_counts.map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
              {e.time_limit_minutes != null && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  {e.time_limit_minutes}m
                </span>
              )}
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
              Choose a section (or all), the lengths students can pick, and an
              optional time limit. Students see this on Dashboard → Exams.
            </SheetDescription>
          </SheetHeader>

          {form && (
            <div className="space-y-4 px-4">
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
                {sections.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No sections yet — create one under Admin → Sections, or leave
                    this as All sections.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-counts">Available lengths</Label>
                <Input
                  id="e-counts"
                  value={form.counts}
                  onChange={(ev) =>
                    setForm({ ...form, counts: ev.target.value })
                  }
                  placeholder="20, 40, 100, 200"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated question counts students can choose.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-time">Time limit (minutes, optional)</Label>
                <Input
                  id="e-time"
                  type="number"
                  value={form.time_limit_minutes}
                  onChange={(ev) =>
                    setForm({ ...form, time_limit_minutes: ev.target.value })
                  }
                  placeholder="Leave blank for untimed"
                />
              </div>
            </div>
          )}

          <SheetFooter>
            <Button type="button" onClick={submit} disabled={pending || !enabled}>
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
