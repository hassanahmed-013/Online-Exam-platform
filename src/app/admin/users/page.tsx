import { UserManager } from "@/components/admin/user-manager";
import { getAdminUsers, hasServiceRole } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export const metadata = { title: "Admin · Users" };

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Users</h2>
        <p className="text-sm text-muted-foreground">
          Live sign-ups from Supabase — search, view plan status, grant or revoke
          access.
        </p>
      </div>

      {(!isSupabaseConfigured || !hasServiceRole) && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>User management needs the service role key</AlertTitle>
          <AlertDescription>
            Add SUPABASE_SERVICE_ROLE_KEY to .env.local to load profiles and
            manage subscriptions.
          </AlertDescription>
        </Alert>
      )}

      <UserManager users={users} enabled={hasServiceRole} />
    </div>
  );
}
