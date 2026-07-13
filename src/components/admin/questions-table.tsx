"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category, Difficulty, Question, Section } from "@/lib/types";
import { classifyDifficulty } from "@/lib/difficulty";
import type { AdminQuestionRow } from "@/lib/admin-data";
import { QuestionForm } from "@/components/admin/question-form";
import { ImageIcon, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";

const AUTO = "__auto__";

const diffVariant = (d: string) =>
  d === "easy" ? "secondary" : d === "hard" ? "destructive" : "default";

const sourceLabel: Record<string, string> = {
  computed: "auto",
  override: "override",
  "insufficient-data": "manual",
};

export function QuestionsTable({
  rows: initialRows,
  categories,
  sections = [],
  selectedSectionId = null,
  total = 0,
  page = 1,
  pageSize = 50,
}: {
  rows: AdminQuestionRow[];
  categories: Category[];
  sections?: Section[];
  selectedSectionId?: string | null;
  total?: number;
  page?: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Question | undefined>(undefined);

  // Server refetch replaces props when the section filter changes.
  useEffect(() => {
    setRows(initialRows);
    setQuery("");
  }, [initialRows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.question.stem.toLowerCase().includes(query.toLowerCase()) ||
          r.question.category_name.toLowerCase().includes(query.toLowerCase())
      ),
    [rows, query]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setSection = (sectionId: string | null) => {
    if (!sectionId) {
      router.push(pathname);
      return;
    }
    const params = new URLSearchParams();
    params.set("section", sectionId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const goPage = (next: number) => {
    const params = new URLSearchParams();
    if (selectedSectionId) params.set("section", selectedSectionId);
    if (next > 1) params.set("page", String(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const remove = (id: string) => {
    setRows((r) => r.filter((row) => row.question.id !== id));
    toast.success("Question deleted", {
      description: "In production this would delete the row via Supabase.",
    });
  };

  // Change (or clear) the admin difficulty override and recompute the effective
  // difficulty client-side, mirroring the nightly recalc precedence.
  const setOverride = (id: string, value: string) => {
    const override = value === AUTO ? null : (value as Difficulty);
    setRows((r) =>
      r.map((row) => {
        if (row.question.id !== id) return row;
        const question = { ...row.question, difficulty_override: override };
        const classification = classifyDifficulty({
          correctRate: row.stats ? row.stats.correct / row.stats.total : undefined,
          sampleSize: row.stats?.total,
          adminDifficulty: question.difficulty,
          override,
        });
        return { ...row, question, classification };
      })
    );
    toast.success(
      override ? `Difficulty forced to ${override}` : "Override cleared — using computed value",
      { description: "In production this updates difficulty_override via Supabase." }
    );
  };

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (q: Question) => {
    setEditing(q);
    setFormOpen(true);
  };

  const bulkImportHref = selectedSectionId
    ? `/admin/bulk-import?section_id=${encodeURIComponent(selectedSectionId)}`
    : "/admin/bulk-import";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {sections.length > 0 && (
            <Select
              value={selectedSectionId ?? undefined}
              onValueChange={(v) => setSection(v)}
            >
              <SelectTrigger className="h-9 w-48">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.question_count != null ? ` (${s.question_count})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              className="h-9 w-64 pl-8"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={bulkImportHref}
            className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
          >
            <Upload className="size-4" />
            Bulk import
          </Link>
          <Button className="gap-1.5" onClick={openNew}>
            <Plus className="size-4" />
            New question
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">Question</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Correct rate</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead className="w-40">Override</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(({ question: q, stats, classification }) => {
              const rate =
                stats && stats.total > 0
                  ? Math.round((stats.correct / stats.total) * 100)
                  : undefined;
              return (
                <TableRow key={q.id}>
                  <TableCell className="max-w-0 truncate font-medium">
                    <span className="flex items-center gap-2">
                      {q.image_url && (
                        <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{q.stem}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {q.category_name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {rate === undefined ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span>
                        {rate}%{" "}
                        <span className="text-xs text-muted-foreground">
                          ({stats!.total})
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={diffVariant(classification.difficulty)}
                        className="capitalize"
                      >
                        {classification.difficulty}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {sourceLabel[classification.source]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={q.difficulty_override ?? AUTO}
                      onValueChange={(v) => setOverride(q.id, v ?? AUTO)}
                    >
                      <SelectTrigger size="sm" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={AUTO}>Auto</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(q)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(q.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {rows.length === 0
                    ? "No questions in this section yet. Use Bulk import or New question."
                    : "No questions match your search."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {total} question(s)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <QuestionForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        question={editing}
        categories={categories}
      />
    </div>
  );
}
