import { SectionManager } from "@/components/admin/section-manager";
import { getAdminSections, hasServiceRole } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export const metadata = { title: "Admin · Sections" };

export default async function AdminSectionsPage() {
  const sections = await getAdminSections();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Sections
        </h2>
        <p className="text-sm text-muted-foreground">
          Name, describe and picture each section. New sections appear on the
          landing page and dashboard immediately — no redeploy.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Supabase not configured</AlertTitle>
          <AlertDescription>
            Set NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY in .env.local to go live.
          </AlertDescription>
        </Alert>
      )}
      {isSupabaseConfigured && !hasServiceRole && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Service role key required to manage sections</AlertTitle>
          <AlertDescription>
            Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings →
            API), then run supabase/migrations/0001_admin_sections_import_exams.sql.
          </AlertDescription>
        </Alert>
      )}

      <SectionManager sections={sections} enabled={hasServiceRole} />
    </div>
  );
}
