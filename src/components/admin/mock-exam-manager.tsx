"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AdminMockPaper } from "@/lib/types";
import { deleteMockPaper, saveMockPaper } from "@/lib/actions/mock-exams";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";

interface FormState {
  id: string | null;
  name: string;
  series: string;
  duration_minutes: string;
}

export function MockExamManager({
  papers,
  enabled,
}: {
  papers: AdminMockPaper[];
  enabled: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();

  const openNew = () => {
    if (!enabled) {
      toast.error(
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to create mock papers."
      );
      return;
    }
    setForm({ id: null, name: "", series: "", duration_minutes: "180" });
  };
  const openEdit = (p: AdminMockPaper) => {
    if (!enabled) {
      toast.error(
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to edit mock papers."
      );
      return;
    }
    setForm({
      id: p.id,
      name: p.name,
      series: p.series,
      duration_minutes: String(p.duration_minutes || 180),
    });
  };
  const close = () => setForm(null);

  const submit = () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("Paper name is required.");
      return;
    }
    const fd = new FormData();
    fd.set("name", form.name);
    fd.set("series", form.series);
    fd.set("duration_minutes", form.duration_minutes);
    startTransition(async () => {
      const res = await saveMockPaper(form.id, fd);
      if (res.ok) {
        toast.success(form.id ? "Paper updated" : "Paper created");
        close();
        if (!form.id && res.id) {
          // Open the question picker on the new paper's detail page.
          router.push(`/admin/mock-exams/${res.id}`);
          return;
        }
        router.refresh();
      } else toast.error(res.error ?? "Save failed");
    });
  };

  const remove = (p: AdminMockPaper) => {
    if (!confirm(`Delete "${p.name}"? Assigned questions will be unlinked.`))
      return;
    startTransition(async () => {
      const res = await deleteMockPaper(p.id);
      if (res.ok) {
        toast.success("Paper deleted");
        router.refresh();
      } else toast.error(res.error ?? "Delete failed");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" className="gap-1.5" onClick={openNew}>
          <Plus className="size-4" />
          New paper
        </Button>
      </div>

      {papers.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No mock papers yet. Create one, then assign existing bank questions
            from the paper&apos;s detail page.
          </p>
          <Button type="button" className="gap-1.5" onClick={openNew}>
            <Plus className="size-4" />
            Create your first paper
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paper</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {papers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.series || "—"}
                  </TableCell>
                  <TableCell>{p.question_count}</TableCell>
                  <TableCell>{p.duration_minutes} min</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/mock-exams/${p.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "gap-1.5"
                        )}
                      >
                        <ListChecks className="size-3.5" />
                        Questions
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(p)}
                        disabled={!enabled || pending}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <SheetTitle>{form?.id ? "Edit paper" : "New paper"}</SheetTitle>
            <SheetDescription>
              After creating, you&apos;ll assign already-imported bank questions
              (searchable picker or CSV). Students then see the paper under Mock
              exams.
            </SheetDescription>
          </SheetHeader>

          {form && (
            <div className="space-y-4 px-4">
              <div className="space-y-1.5">
                <Label htmlFor="mp-name">Paper name</Label>
                <Input
                  id="mp-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Mock Exam A — Paper 1"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp-series">Series</Label>
                <Input
                  id="mp-series"
                  value={form.series}
                  onChange={(e) => setForm({ ...form, series: e.target.value })}
                  placeholder="e.g. Mock Exam A"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp-duration">Duration (minutes)</Label>
                <Input
                  id="mp-duration"
                  type="number"
                  min={1}
                  value={form.duration_minutes}
                  onChange={(e) =>
                    setForm({ ...form, duration_minutes: e.target.value })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Question count is derived from assigned questions — you don&apos;t
                set it here.
              </p>
            </div>
          )}

          <SheetFooter>
            <Button type="button" onClick={submit} disabled={pending || !enabled}>
              {pending
                ? "Saving…"
                : form?.id
                  ? "Save changes"
                  : "Create paper"}
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
