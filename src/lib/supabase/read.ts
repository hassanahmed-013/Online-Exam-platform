// Lightweight anon read client for public data in Server Components / Actions.
// The anon key is already public (shipped to the browser), so this needs no
// cookies and can be called from any server context. RLS still applies.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./client";

export { isSupabaseConfigured };

export function createReadClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
