"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  IMPORT_TEMPLATE,
  SECTION_SCOPED_IMPORT_TEMPLATE,
  normalizeCsvRow,
  validateImportHeaders,
  type ImportRowInput,
  type RowResult,
  type RowStatus,
} from "@/lib/import-shared";
import { CheckCircle2, Download, FileUp, TriangleAlert } from "lucide-react";

const CHUNK = 200;

type Phase = "idle" | "validating" | "validated" | "importing" | "done";

async function postChunk(
  rows: ImportRowInput[],
  commit: boolean,
  sectionId?: string,
  autoCreateSections?: boolean
): Promise<RowResult[]> {
  const res = await fetch("/api/admin/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rows,
      commit,
      ...(sectionId ? { section_id: sectionId } : {}),
      ...(autoCreateSections ? { auto_create_sections: true } : {}),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json.results as RowResult[];
}

export function BulkImport({
  enabled,
  sectionId,
  sectionName,
}: {
  enabled: boolean;
  /** When set, every CSV row is assigned to this section (no section_name column). */
  sectionId?: string;
  sectionName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** Monotonic id so only the latest validation run may write to the UI. */
  const runIdRef = useRef(0);
  const [fileName, setFileName] = useState<string>();
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rows, setRows] = useState<Map<number, Record<string, string>>>(new Map());
  const [results, setResults] = useState<RowResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [fileError, setFileError] = useState<string>();
  const [autoCreateSections, setAutoCreateSections] = useState(false);
  const autoCreateRef = useRef(false);

  const scoped = Boolean(sectionId);
  const template = scoped ? SECTION_SCOPED_IMPORT_TEMPLATE : IMPORT_TEMPLATE;

  const counts = (list: RowResult[]) =>
    list.reduce(
      (acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc),
      {} as Record<RowStatus, number>
    );

  const reset = () => {
    runIdRef.current += 1; // invalidate any in-flight validation
    setPhase("idle");
    setFileName(undefined);
    setRows(new Map());
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setFileError(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const parseAndValidate = (file: File) => {
    // Invalidate previous runs and wipe stale UI immediately — before parsing.
    const myRun = runIdRef.current + 1;
    runIdRef.current = myRun;

    setFileName(file.name);
    setFileError(undefined);
    setRows(new Map());
    setResults([]);
    setProgress({ done: 0, total: 0 });
    setPhase("validating");

    const isCurrent = () => runIdRef.current === myRun;

    try {
      // Do NOT pass transformHeader/transform with worker:true — functions can't
      // be cloned to the worker (DataCloneError) and parsing never starts.
      Papa.parse<Record<string, string>>(file, {
        header: true,
        worker: true,
        skipEmptyLines: true,
        complete: async (res) => {
          if (!isCurrent()) return;

          const headerErr = validateImportHeaders(res.meta.fields, scoped);
          if (headerErr) {
            if (!isCurrent()) return;
            setPhase("idle");
            setFileError(headerErr);
            toast.error("CSV header problem", { description: headerErr });
            return;
          }

          const map = new Map<number, Record<string, string>>();
          const inputs: ImportRowInput[] = res.data.map((raw, i) => {
            const line = i + 2;
            const data = normalizeCsvRow(raw);
            map.set(line, data);
            return { line, data };
          });

          if (!isCurrent()) return;
          setRows(map);

          if (!inputs.length) {
            setPhase("idle");
            toast.error("No rows found in that CSV.");
            return;
          }

          try {
            const all: RowResult[] = [];
            if (!isCurrent()) return;
            setProgress({ done: 0, total: inputs.length });

            for (let i = 0; i < inputs.length; i += CHUNK) {
              if (!isCurrent()) return;
              const chunk = inputs.slice(i, i + CHUNK);
              all.push(
                ...(await postChunk(
                  chunk,
                  false,
                  sectionId,
                  !scoped && autoCreateRef.current
                ))
              );
              if (!isCurrent()) return;
              setProgress({
                done: Math.min(i + CHUNK, inputs.length),
                total: inputs.length,
              });
            }

            if (!isCurrent()) return;
            setResults(all);
            setPhase("validated");
          } catch (e) {
            if (!isCurrent()) return;
            setPhase("idle");
            setResults([]);
            toast.error((e as Error).message);
          }
        },
        error: (err) => {
          if (!isCurrent()) return;
          setPhase("idle");
          setResults([]);
          toast.error(err?.message || "Could not read that file.");
        },
      });
    } catch (e) {
      if (!isCurrent()) return;
      setPhase("idle");
      setResults([]);
      toast.error((e as Error).message || "Could not start CSV parsing.");
    }
  };

  const runImport = async () => {
    const myRun = runIdRef.current;
    const validLines = results.filter((r) => r.status === "valid").map((r) => r.line);
    const inputs: ImportRowInput[] = validLines
      .map((line) => ({ line, data: rows.get(line)! }))
      .filter((r) => r.data);
    if (!inputs.length) return;

    setPhase("importing");
    setProgress({ done: 0, total: inputs.length });
    const committed: RowResult[] = [];
    try {
      for (let i = 0; i < inputs.length; i += CHUNK) {
        if (runIdRef.current !== myRun) return;
        const chunk = inputs.slice(i, i + CHUNK);
        committed.push(
          ...(await postChunk(
            chunk,
            true,
            sectionId,
            !scoped && autoCreateRef.current
          ))
        );
        if (runIdRef.current !== myRun) return;
        setProgress({ done: Math.min(i + CHUNK, inputs.length), total: inputs.length });
      }
    } catch (e) {
      if (runIdRef.current !== myRun) return;
      toast.error((e as Error).message);
      setPhase("validated");
      return;
    }
    if (runIdRef.current !== myRun) return;
    const byLine = new Map(committed.map((r) => [r.line, r]));
    setResults((prev) => prev.map((r) => byLine.get(r.line) ?? r));
    setPhase("done");
    const c = counts(committed);
    const skipped = (c.duplicate ?? 0) + (c.failed ?? 0);
    const failSample = committed.find((r) => r.status === "failed");
    if ((c.imported ?? 0) > 0) {
      toast.success(`Imported ${c.imported} question(s)`, {
        description: skipped ? `${skipped} skipped.` : undefined,
      });
    } else if ((c.failed ?? 0) > 0) {
      toast.error("Import failed", {
        description:
          failSample?.messages?.[0] ??
          `${c.failed} row(s) failed — see details below.`,
      });
    } else {
      toast.message(`Imported 0 question(s)`, {
        description: skipped ? `${skipped} duplicate(s) skipped.` : undefined,
      });
    }
  };

  const downloadSkipped = () => {
    const skipped = results.filter(
      (r) => r.status === "error" || r.status === "duplicate" || r.status === "failed"
    );
    if (!skipped.length) return;
    const rowsOut = skipped.map((r) => {
      const data = rows.get(r.line) ?? {};
      return {
        line: r.line,
        status: r.status,
        reason: (r.messages ?? []).join("; "),
        section_name: data.section_name ?? sectionName ?? "",
        question_text: data.question_text ?? "",
      };
    });
    const csv = Papa.unparse(rowsOut);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skipped-rows.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openFilePicker = () => {
    if (!enabled) return;
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  const c = counts(results);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const problemRows = results.filter(
    (r) => r.status === "error" || r.status === "failed"
  );
  const busy = phase === "validating" || phase === "importing";

  return (
    <div className="space-y-6">
      {scoped && sectionName && (
        <Alert>
          <AlertTitle>
            Importing into: <span className="font-semibold">{sectionName}</span>
          </AlertTitle>
          <AlertDescription>
            Every row will be assigned to this section. The CSV does not need a{" "}
            <code>section_name</code> column.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Handles 1,200–2,000+ rows: validated up front, then inserted in batches
          of {CHUNK}. Re-uploading the same file skips duplicates automatically.
        </p>
        <Button
          variant="outline"
          className="shrink-0 gap-1.5"
          onClick={() => {
            const blob = new Blob([template], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = scoped
              ? "questions-import-section-template.csv"
              : "questions-import-template.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="size-4" />
          Template
        </Button>
      </div>

      {/* Hidden input always mounted so "Choose another file" works from any phase. */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          // Reset value so selecting the same path again still fires onChange.
          e.target.value = "";
          if (f) parseAndValidate(f);
        }}
      />

      {!scoped && phase === "idle" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
          <Checkbox
            checked={autoCreateSections}
            onCheckedChange={(v) => {
              const on = v === true;
              setAutoCreateSections(on);
              autoCreateRef.current = on;
            }}
          />
          <span>
            <span className="block text-sm font-medium">
              Auto-create missing sections from this file
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Off by default. When on, unknown{" "}
              <code className="text-[0.7rem]">section_name</code> values create
              new sections (name only — add description/cover later under
              Sections). Leave off to require sections to exist first.
            </span>
          </span>
        </label>
      )}

      {phase === "idle" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f && enabled) parseAndValidate(f);
          }}
          onClick={openFilePicker}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
            enabled ? "cursor-pointer hover:border-primary/40" : "opacity-50",
            dragOver && "border-primary bg-primary/5"
          )}
        >
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileUp className="size-6" />
          </span>
          <p className="text-sm font-medium">
            {enabled ? "Drop your CSV here, or click to browse" : "Add the service role key to enable import"}
          </p>
          <p className="text-xs text-muted-foreground">
            {scoped
              ? "Columns: question_text, option_a…e, correct_option, explanation?, image_url?, difficulty?"
              : "Columns: section_name, question_text, option_a…e, correct_option, explanation?, image_url?, difficulty? — section_name must match an existing section."}
          </p>
        </div>
      )}

      {fileError && phase === "idle" && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>CSV header problem</AlertTitle>
          <AlertDescription>{fileError}</AlertDescription>
        </Alert>
      )}

      {busy && (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                {phase === "validating" ? "Validating…" : "Importing…"}
              </p>
              <p className="text-xs text-muted-foreground">
                Current file:{" "}
                <span className="font-medium text-foreground">{fileName}</span>
                {progress.total === 0 && phase === "validating"
                  ? " — parsing CSV…"
                  : null}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={reset}>
              Cancel
            </Button>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {progress.total
                ? `${progress.done} / ${progress.total} rows`
                : "Reading file…"}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={progress.total ? pct : 0} />
        </Card>
      )}

      {(phase === "validated" || phase === "done") && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              Current file:{" "}
              <span className="font-medium text-foreground">{fileName}</span>
            </p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openFilePicker}>
              <FileUp className="size-3.5" />
              Choose another file
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <div className="text-2xl font-semibold">{results.length}</div>
              <div className="text-xs text-muted-foreground">Rows</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-semibold text-emerald-600">
                {phase === "done" ? c.imported ?? 0 : c.valid ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {phase === "done" ? "Imported" : "Valid"}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-semibold text-amber-600">{c.duplicate ?? 0}</div>
              <div className="text-xs text-muted-foreground">Duplicates</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-semibold text-destructive">
                {(c.error ?? 0) + (c.failed ?? 0)}
              </div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </Card>
          </div>

          {phase === "validated" && (c.valid ?? 0) > 0 && (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Ready to import</AlertTitle>
              <AlertDescription>
                {c.valid} valid row(s) will be inserted; {c.duplicate ?? 0} duplicate(s) and{" "}
                {c.error ?? 0} error(s) skipped.
              </AlertDescription>
            </Alert>
          )}

          {problemRows.length > 0 && (
            <Card className="p-4">
              <div className="mb-2 text-sm font-medium text-destructive">
                First {Math.min(problemRows.length, 15)} problem row(s)
              </div>
              <div className="space-y-1 text-xs">
                {problemRows.slice(0, 15).map((e) => (
                  <div key={e.line} className="flex gap-2">
                    <Badge variant="outline">#{e.line}</Badge>
                    <span className="text-muted-foreground">
                      {(e.messages ?? []).join("; ") || e.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            {(c.error ?? 0) + (c.duplicate ?? 0) + (c.failed ?? 0) > 0 && (
              <Button variant="outline" className="gap-1.5" onClick={downloadSkipped}>
                <Download className="size-4" />
                Download skipped
              </Button>
            )}
            <Button variant="outline" onClick={reset}>
              {phase === "done" ? "Import another" : "Cancel"}
            </Button>
            {phase === "validated" && (
              <Button onClick={runImport} disabled={(c.valid ?? 0) === 0}>
                Import {c.valid ?? 0} question(s)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
