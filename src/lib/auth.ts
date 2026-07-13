import { cookies } from "next/headers";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

const DEMO_COOKIE = "mp_user";

export type CurrentUser = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url?: string | null;
};

/** Current signed-in user for server components (Supabase session or demo cookie). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      return {
        id: user.id,
        email: user.email ?? "",
        full_name:
          profile?.full_name ||
          (user.user_metadata?.full_name as string | undefined) ||
          user.email?.split("@")[0] ||
          "User",
        role: (profile?.role as Role) || "student",
        avatar_url: profile?.avatar_url ?? null,
      };
    } catch {
      return null;
    }
  }

  const store = await cookies();
  const email = store.get(DEMO_COOKIE)?.value;
  if (!email) return null;
  return {
    id: "demo",
    email,
    full_name: email.split("@")[0] || "Demo",
    role: "student",
    avatar_url: null,
  };
}
