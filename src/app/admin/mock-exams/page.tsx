import { MockExamManager } from "@/components/admin/mock-exam-manager";
import { getAdminMockPapers, hasServiceRole } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export const metadata = { title: "Admin · Mock exams" };

export default async function AdminMockExamsPage() {
  const papers = await getAdminMockPapers();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Mock exams
        </h2>
        <p className="text-sm text-muted-foreground">
          Curated papers with a fixed question set. Create a paper, then assign
          existing bank questions (not a fresh content CSV).
        </p>
      </div>

      {(!isSupabaseConfigured || !hasServiceRole) && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Mock papers need the service role key</AlertTitle>
          <AlertDescription>
            Add SUPABASE_SERVICE_ROLE_KEY and run
            supabase/migrations/0003_mock_exam_papers.sql.
          </AlertDescription>
        </Alert>
      )}

      <MockExamManager papers={papers} enabled={hasServiceRole} />
    </div>
  );
}
