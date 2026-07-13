// Public + admin reads for textbooks / study documents.
import { createReadClient, isSupabaseConfigured } from "./supabase/read";
import { createAdminClient, hasServiceRole } from "./supabase/admin";
import type { Textbook } from "./types";

/** Active textbooks for students. */
export async function getTextbooks(): Promise<Textbook[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sb = createReadClient();
    const { data, error } = await sb
      .from("textbooks")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as Textbook[];
  } catch {
    return [];
  }
}

/** All textbooks for the admin manager (including inactive). */
export async function getAdminTextbooks(): Promise<{
  textbooks: Textbook[];
  tableReady: boolean;
  error?: string;
}> {
  if (!hasServiceRole) return { textbooks: [], tableReady: false };
  try {
    const sb = createAdminClient();
    const { data, error } = await sb
      .from("textbooks")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      const missing =
        /schema cache|does not exist|Could not find the table/i.test(
          error.message
        );
      return {
        textbooks: [],
        tableReady: !missing,
        error: error.message,
      };
    }
    return { textbooks: (data ?? []) as Textbook[], tableReady: true };
  } catch (e) {
    return {
      textbooks: [],
      tableReady: false,
      error: (e as Error).message,
    };
  }
}
