import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { hasServiceRole } from "@/lib/supabase/admin";

export type AdminGateResult =
  | { ok: true; user: CurrentUser }
  | { ok: false; error: string };

/**
 * Every admin mutation must pass this — service-role key alone is not enough.
 * Callers still use the service-role client for writes; this only authorizes who.
 */
export async function requireAdmin(): Promise<AdminGateResult> {
  if (!hasServiceRole) {
    return {
      ok: false,
      error:
        "Admin writes are disabled — add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }
  if (user.role !== "admin") {
    return { ok: false, error: "Admin access required." };
  }
  return { ok: true, user };
}

/** Active paid plan (or admin). Free / expired → false. */
export async function userHasActiveAccess(
  user?: CurrentUser | null
): Promise<boolean> {
  const u = user === undefined ? await getCurrentUser() : user;
  if (!u) return false;
  if (u.role === "admin") return true;
  if (u.id === "demo") return true; // local demo cookie — allow browsing

  const { createAdminClient, hasServiceRole: hasKey } = await import(
    "@/lib/supabase/admin"
  );
  if (!hasKey) return true; // no backend — don't block

  try {
    const sb = createAdminClient();
    const { data } = await sb
      .from("profiles")
      .select("current_plan, plan_expires_at")
      .eq("id", u.id)
      .maybeSingle();
    if (!data) return false;
    const plan = (data.current_plan as string) || "free";
    if (plan === "free") return false;
    if (data.plan_expires_at) {
      return new Date(data.plan_expires_at).getTime() > Date.now();
    }
    // lifetime / no expiry
    return true;
  } catch {
    return false;
  }
}

export const PAYWALL_ERROR =
  "An active subscription is required. Upgrade on the pricing page, or ask an admin to grant access.";
