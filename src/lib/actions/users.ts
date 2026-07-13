"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { activatePaidPlan, deactivatePaidPlan } from "@/lib/billing";

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
    const res = await activatePaidPlan({
      userId,
      plan,
      endsAt: planEndsAt(plan),
      paymentRef: "admin_grant",
    });
    if (!res.ok) return res;
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
    const res = await deactivatePaidPlan(userId);
    if (!res.ok) return res;
    revalidatePath("/admin/users");
    revalidatePath("/admin/subscriptions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
