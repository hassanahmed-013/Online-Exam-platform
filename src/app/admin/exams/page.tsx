import { ExamManager } from "@/components/admin/exam-manager";
import { getAdminExams, getAdminSections, hasServiceRole } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export const metadata = { title: "Admin · Exams" };

export default async function AdminExamsPage() {
  const [exams, sections] = await Promise.all([
    getAdminExams(),
    getAdminSections(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Exams</h2>
        <p className="text-sm text-muted-foreground">
          Define exams tied to a section (or all sections). Students pick a length
          from the counts you set — sampled randomly from live questions.
        </p>
      </div>

      {(!isSupabaseConfigured || !hasServiceRole) && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Exam management needs the service role key</AlertTitle>
          <AlertDescription>
            Add SUPABASE_SERVICE_ROLE_KEY to .env.local and run the migration to
            create/edit exams.
          </AlertDescription>
        </Alert>
      )}

      <ExamManager exams={exams} sections={sections} enabled={hasServiceRole} />
    </div>
  );
}
