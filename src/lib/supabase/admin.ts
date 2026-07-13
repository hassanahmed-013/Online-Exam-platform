// Service-role Supabase client for privileged server-side work: admin section /
// exam CRUD and the bulk-import pipeline. It bypasses RLS, so it must ONLY be
// used in Server Actions, Route Handlers and Server Components — never in a
// Client Component. SUPABASE_SERVICE_ROLE_KEY is intentionally NOT prefixed
// NEXT_PUBLIC_, so Next never inlines it into a client bundle even by accident.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./client";

export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** True only when both the URL and the secret service-role key are present. */
export const hasServiceRole =
  SUPABASE_URL.length > 0 && SERVICE_ROLE_KEY.length > 0;

export function createAdminClient(): SupabaseClient {
  if (!hasServiceRole) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local to enable admin writes and bulk import."
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
