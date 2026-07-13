import { BulkImport } from "@/components/admin/bulk-import";
import { getAdminSections, hasServiceRole } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export const metadata = { title: "Admin · Bulk import" };

export default async function BulkImportPage({
  searchParams,
}: {
  searchParams: Promise<{ section_id?: string }>;
}) {
  const { section_id: rawSectionId } = await searchParams;
  const sectionId = rawSectionId?.trim().replace(/\/+$/, "") || undefined;
  const sections = sectionId ? await getAdminSections() : [];
  const section = sectionId ? sections.find((s) => s.id === sectionId) : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Bulk import questions
        </h2>
        <p className="text-sm text-muted-foreground">
          {section
            ? `Import questions directly into ${section.name}. Rows are validated, then inserted in batches.`
            : "Import 1,200–2,000+ questions from a CSV. Rows are validated against your live sections first, then inserted in batches. Sections must already exist; image_urls are downloaded and re-hosted in Supabase Storage."}
        </p>
      </div>

      {sectionId && !section && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Section not found</AlertTitle>
          <AlertDescription>
            No active section matches that id. Pick a section from the Sections
            page, or import without a section filter (CSV must include{" "}
            <code>section_name</code>).
          </AlertDescription>
        </Alert>
      )}

      {(!isSupabaseConfigured || !hasServiceRole) && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Import needs the service role key</AlertTitle>
          <AlertDescription>
            Add SUPABASE_SERVICE_ROLE_KEY to .env.local and run
            supabase/migrations/0001_admin_sections_import_exams.sql to enable
            bulk import.
          </AlertDescription>
        </Alert>
      )}

      <BulkImport
        enabled={hasServiceRole && (!sectionId || Boolean(section))}
        sectionId={section?.id}
        sectionName={section?.name}
      />
    </div>
  );
}
