"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addQuestionsToMockPaper,
  bulkAssignMockQuestions,
  removeQuestionFromMockPaper,
} from "@/lib/actions/mock-exams";
import {
  MOCK_ASSIGN_TEMPLATE,
  normalizeCsvRow,
  validateMockAssignHeaders,
} from "@/lib/import-shared";
import { Download, Search, Trash2, Upload } from "lucide-react";

type PickerRow = {
  id: string;
  stem: string;
  section_name: string;
  difficulty: string;
};

type SectionOption = { id: string; name: string };

const ALL = "__all__";

export function MockPaperQuestionPicker({
  paperId,
  paperName,
  assignedIds,
  questions: initialQuestions,
  sections = [],
  selectedSectionId = null,
  enabled,
}: {
  paperId: string;
  paperName: string;
  assignedIds: string[];
  questions: PickerRow[];
  sections?: SectionOption[];
  selectedSectionId?: string | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState(initialQuestions);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [csvProgress, setCsvProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [csvErrors, setCsvErrors] = useState<
    { line: number; messages: string[] }[]
  >([]);

  useEffect(() => {
    setQuestions(initialQuestions);
    setSelected(new Set());
    setQuery("");
  }, [initialQuestions]);

  const assignedSet = useMemo(() => new Set(assignedIds), [assignedIds]);
  const byId = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions]
  );

  const sectionFilterValue = selectedSectionId ?? ALL;

  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedName = selectedSectionId
      ? sections.find((s) => s.id === selectedSectionId)?.name
      : null;
    return questions.filter((row) => {
      if (assignedSet.has(row.id)) return false;
      // When a section is selected server-side, bank rows are already scoped;
      // still filter by name so merged assigned-from-other-section rows stay out
      // of the addable pool.
      if (selectedName && row.section_name !== selectedName) return false;
      if (!q) return true;
      return (
        row.stem.toLowerCase().includes(q) ||
        row.section_name.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q)
      );
    });
  }, [questions, assignedSet, selectedSectionId, sections, query]);

  const assignedRows = assignedIds
    .map((id) => byId.get(id))
    .filter((q): q is PickerRow => !!q);

  const setSectionFilter = (value: string | null) => {
    const params = new URLSearchParams();
    if (value && value !== ALL) params.set("section", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelected = () => {
    const ids = [...selected];
    if (!ids.length) return;
    startTransition(async () => {
      const res = await addQuestionsToMockPaper(paperId, ids);
      if (res.ok) {
        toast.success(`Added ${ids.length} question(s)`);
        setSelected(new Set());
        router.refresh();
      } else toast.error(res.error ?? "Add failed");
    });
  };

  const remove = (questionId: string) => {
    startTransition(async () => {
      const res = await removeQuestionFromMockPaper(paperId, questionId);
      if (res.ok) {
        toast.success("Removed from paper");
        router.refresh();
      } else toast.error(res.error ?? "Remove failed");
    });
  };

  const runCsv = (file: File) => {
    setCsvErrors([]);
    try {
      // Avoid transformHeader with worker — functions aren't cloneable to workers.
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const headerErr = validateMockAssignHeaders(res.meta.fields);
          if (headerErr) {
            toast.error("CSV header problem", { description: headerErr });
            setCsvErrors([{ line: 1, messages: [headerErr] }]);
            return;
          }

          const rows = res.data.map((raw, i) => {
            const data = normalizeCsvRow(raw);
            const sortRaw = data.sort_order ?? "";
            const sort_order = sortRaw ? parseInt(sortRaw, 10) : undefined;
            return {
              line: i + 2,
              question_id: data.question_id || undefined,
              question_text: data.question_text || undefined,
              sort_order:
                sort_order != null && Number.isFinite(sort_order)
                  ? sort_order
                  : undefined,
            };
          });
          if (!rows.length) {
            toast.error("No rows found in that CSV.");
            return;
          }
          startTransition(async () => {
            setCsvProgress({ done: 0, total: rows.length });
            const result = await bulkAssignMockQuestions(
              paperId,
              rows,
              selectedSectionId
            );
            setCsvProgress({ done: rows.length, total: rows.length });
            const errs = (result.results ?? []).filter((r) => r.status === "error");
            setCsvErrors(
              errs.map((e) => ({ line: e.line, messages: e.messages ?? [] }))
            );
            if (result.ok) {
              const assigned = (result.results ?? []).filter(
                (r) => r.status === "assigned"
              ).length;
              toast.success(`Assigned ${assigned} question(s)`, {
                description: errs.length
                  ? `${errs.length} row(s) rejected.`
                  : undefined,
              });
              router.refresh();
            } else {
              toast.error(result.error ?? "Bulk assign failed");
            }
            setTimeout(() => setCsvProgress(null), 800);
          });
        },
        error: (err) => toast.error(err?.message || "Could not read that file."),
      });
    } catch (e) {
      toast.error((e as Error).message || "Could not start CSV parsing.");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-heading text-lg font-semibold">
          Assigned to {paperName}
        </h3>
        <p className="text-sm text-muted-foreground">
          {assignedIds.length} question(s) · fixed order for every student
        </p>
        {assignedRows.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No questions assigned yet. Pick from the bank below or upload a CSV
            of external ids (e.g. MRCP-Q-001).
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {assignedRows.map((q, i) => (
              <div
                key={q.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <span className="w-6 shrink-0 text-xs text-muted-foreground">
                  {i + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium line-clamp-2">{q.stem}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">{q.section_name}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {q.difficulty}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!enabled || pending}
                  onClick={() => remove(q.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">Bulk-assign via CSV</div>
            <p className="text-xs text-muted-foreground">
              Use <code>question_id,sort_order</code> (
              <code>MRCP-Q-001</code> or bank UUID) or{" "}
              <code>question_text,sort_order</code>. If the same external id
              exists in more than one section, select that section first.
              Unmatched rows are rejected with a reason.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                const blob = new Blob([MOCK_ASSIGN_TEMPLATE], {
                  type: "text/csv",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "mock-paper-assign-template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="size-3.5" />
              Template
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!enabled || pending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Upload CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) runCsv(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        {csvProgress && (
          <Progress
            value={Math.round((csvProgress.done / csvProgress.total) * 100)}
          />
        )}
        {csvErrors.length > 0 && (
          <div className="space-y-1 text-xs text-destructive">
            {csvErrors.slice(0, 10).map((e) => (
              <div key={e.line}>
                Line {e.line}: {e.messages.join("; ")}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-semibold">Question bank</h3>
            <p className="text-sm text-muted-foreground">
              Select existing questions to add — content is not duplicated.
            </p>
          </div>
          <Button
            onClick={addSelected}
            disabled={!enabled || pending || selected.size === 0}
          >
            Add {selected.size || ""} to paper
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stem, section, or id…"
              className="h-9 w-72 pl-8"
            />
          </div>
          <Select
            value={sectionFilterValue}
            onValueChange={(v) => setSectionFilter(v)}
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {pool.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {questions.length === 0
              ? "Import questions into a section first."
              : "No matching unassigned questions."}
          </div>
        ) : (
          <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-xl border p-2">
            {pool.slice(0, 200).map((q) => (
              <label
                key={q.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selected.has(q.id)}
                  onCheckedChange={() => toggle(q.id)}
                  disabled={!enabled}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm line-clamp-2">{q.stem}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary">{q.section_name}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {q.difficulty}
                    </Badge>
                  </div>
                </div>
              </label>
            ))}
            {pool.length > 200 && (
              <p className="p-2 text-xs text-muted-foreground">
                Showing first 200 of {pool.length} — refine your search or pick a
                section.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
