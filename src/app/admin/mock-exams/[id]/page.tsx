import Link from "next/link";
import { notFound } from "next/navigation";
import { MockPaperQuestionPicker } from "@/components/admin/mock-paper-question-picker";
import {
  getAdminMockPaper,
  getAdminQuestionPickerRows,
  getAdminQuestionsByIds,
  getAdminSections,
  hasServiceRole,
} from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, TriangleAlert } from "lucide-react";

export const metadata = { title: "Admin · Mock paper questions" };

export default async function MockPaperDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { id } = await params;
  const { section: sectionParam } = await searchParams;
  const sections = await getAdminSections();
  const activeSections = sections.filter((s) => s.is_active);

  const requested = sectionParam?.trim() || null;
  // "__all__" or missing → load every section (per-section queries).
  // A concrete section id → load that bank only.
  const selectedSectionId =
    !requested || requested === "__all__"
      ? null
      : sections.some((s) => s.id === requested)
        ? requested
        : null;

  const paper = await getAdminMockPaper(id);
  if (!paper) notFound();

  const [bank, assigned] = await Promise.all([
    getAdminQuestionPickerRows(selectedSectionId),
    getAdminQuestionsByIds(paper.assignedIds),
  ]);

  // Merge so assigned rows still resolve even when filtering another section.
  const byId = new Map(bank.map((q) => [q.id, q]));
  for (const q of assigned) {
    if (!byId.has(q.id)) byId.set(q.id, q);
  }
  const questions = [...byId.values()];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/admin/mock-exams"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 -ml-2")}
        >
          <ArrowLeft className="size-4" />
          All papers
        </Link>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          {paper.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {paper.series ? `${paper.series} · ` : ""}
          {paper.duration_minutes} min · {paper.question_count} assigned
        </p>
      </div>

      {(!isSupabaseConfigured || !hasServiceRole) && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Assignment needs the service role key</AlertTitle>
          <AlertDescription>
            Add SUPABASE_SERVICE_ROLE_KEY to enable question assignment.
          </AlertDescription>
        </Alert>
      )}

      <MockPaperQuestionPicker
        paperId={paper.id}
        paperName={paper.name}
        assignedIds={paper.assignedIds}
        questions={questions}
        sections={activeSections.map((s) => ({ id: s.id, name: s.name }))}
        selectedSectionId={selectedSectionId}
        enabled={hasServiceRole}
      />
    </div>
  );
}
