import { TextbookManager } from "@/components/admin/textbook-manager";
import { getAdminTextbooks } from "@/lib/textbooks";
import { hasServiceRole } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export const metadata = { title: "Admin · Textbooks" };

export default async function AdminTextbooksPage() {
  const { textbooks, tableReady, error } = await getAdminTextbooks();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Textbooks
        </h2>
        <p className="text-sm text-muted-foreground">
          Upload study documents (PDF, Word, etc.). Active files appear on the
          student Textbooks page immediately.
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
          <AlertTitle>Service role key required</AlertTitle>
          <AlertDescription>
            Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase → Settings →
            API).
          </AlertDescription>
        </Alert>
      )}
      {hasServiceRole && !tableReady && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Run the textbooks migration</AlertTitle>
          <AlertDescription>
            Open the Supabase SQL editor and run{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              supabase/migrations/0002_textbooks.sql
            </code>
            {error ? ` (${error})` : ""}. Then refresh this page.
          </AlertDescription>
        </Alert>
      )}

      <TextbookManager
        textbooks={textbooks}
        enabled={hasServiceRole && tableReady}
      />
    </div>
  );
}
