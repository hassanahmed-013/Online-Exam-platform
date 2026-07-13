"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export interface UserActionResult {
  ok: boolean;
  error?: string;
}

function planEndsAt(plan: "monthly" | "annual" | "lifetime"): string | null {
  if (plan === "lifetime") return null;
  const d = new Date();
  if (plan === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

/** Insert an active subscription and sync profiles.current_plan. */
export async function grantAccess(
  userId: string,
  plan: "monthly" | "annual" | "lifetime"
): Promise<UserActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  if (!userId) return { ok: false, error: "Missing user id." };

  try {
    const sb = createAdminClient();
    const ends = planEndsAt(plan);

    // Cancel any currently-active rows so "latest" stays unambiguous.
    await sb
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "active");

    const { error } = await sb.from("subscriptions").insert({
      user_id: userId,
      plan,
      status: "active",
      starts_at: new Date().toISOString(),
      ends_at: ends,
    });
    if (error) return { ok: false, error: error.message };

    const { error: pErr } = await sb
      .from("profiles")
      .update({ current_plan: plan, plan_expires_at: ends })
      .eq("id", userId);
    if (pErr) return { ok: false, error: pErr.message };

    revalidatePath("/admin/users");
    revalidatePath("/admin/subscriptions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Mark active subscriptions cancelled and reset profile to free. */
export async function revokeAccess(userId: string): Promise<UserActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  if (!userId) return { ok: false, error: "Missing user id." };

  try {
    const sb = createAdminClient();
    const { error } = await sb
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) return { ok: false, error: error.message };

    const { error: pErr } = await sb
      .from("profiles")
      .update({ current_plan: "free", plan_expires_at: null })
      .eq("id", userId);
    if (pErr) return { ok: false, error: pErr.message };

    revalidatePath("/admin/users");
    revalidatePath("/admin/subscriptions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
