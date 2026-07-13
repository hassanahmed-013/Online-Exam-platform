import { QuestionsTable } from "@/components/admin/questions-table";
import {
  getAdminQuestions,
  getAdminSections,
  hasServiceRole,
} from "@/lib/admin-data";
import { sectionAsCategory } from "@/lib/sections";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export const metadata = { title: "Admin · Questions" };

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; page?: string }>;
}) {
  const { section: sectionParam, page: pageParam } = await searchParams;
  const sections = await getAdminSections();
  const activeSections = sections.filter((s) => s.is_active);

  const requested = sectionParam?.trim() || null;
  const selectedSectionId =
    requested && sections.some((s) => s.id === requested)
      ? requested
      : activeSections[0]?.id ?? sections[0]?.id ?? null;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const { rows, total, pageSize } = await getAdminQuestions(selectedSectionId, {
    page,
    pageSize: 50,
  });
  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const categories = [
    ...activeSections.filter((s) => s.id === selectedSectionId),
    ...activeSections.filter((s) => s.id !== selectedSectionId),
  ].map(sectionAsCategory);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Questions
        </h2>
        <p className="text-sm text-muted-foreground">
          {selectedSection
            ? `Showing questions in ${selectedSection.name}${
                total != null ? ` (${total} total)` : ""
              }. Switch section to browse another bank.`
            : "Live inventory from Supabase — including bulk-imported rows."}
        </p>
      </div>

      {(!isSupabaseConfigured || !hasServiceRole) && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Service role required</AlertTitle>
          <AlertDescription>
            Add SUPABASE_SERVICE_ROLE_KEY to .env.local to load and manage live
            questions.
          </AlertDescription>
        </Alert>
      )}

      <QuestionsTable
        rows={rows}
        categories={categories}
        sections={sections}
        selectedSectionId={selectedSectionId}
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
