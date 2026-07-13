import "server-only";
import type { PaidPlan } from "@/lib/billing-types";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/**
 * Activate a paid plan for a user (Stripe webhook or admin grant).
 * Cancels prior active rows, inserts a new subscription, syncs profile.
 */
export async function activatePaidPlan(input: {
  userId: string;
  plan: PaidPlan | "lifetime";
  endsAt: string | null;
  paymentRef?: string | null;
  stripeCustomerId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasServiceRole) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is required." };
  }
  if (!input.userId) return { ok: false, error: "Missing user id." };

  const sb = createAdminClient();

  await sb
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("user_id", input.userId)
    .eq("status", "active");

  const { error } = await sb.from("subscriptions").insert({
    user_id: input.userId,
    plan: input.plan,
    status: "active",
    starts_at: new Date().toISOString(),
    ends_at: input.endsAt,
    payment_ref: input.paymentRef ?? null,
  });
  if (error) return { ok: false, error: error.message };

  const profilePatch: Record<string, string | null> = {
    current_plan: input.plan,
    plan_expires_at: input.endsAt,
  };
  if (input.stripeCustomerId) {
    profilePatch.stripe_customer_id = input.stripeCustomerId;
  }

  const { error: pErr } = await sb
    .from("profiles")
    .update(profilePatch)
    .eq("id", input.userId);
  if (pErr) return { ok: false, error: pErr.message };

  return { ok: true };
}

/** Downgrade to free when a Stripe subscription ends or admin revokes. */
export async function deactivatePaidPlan(
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!hasServiceRole) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is required." };
  }

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

  return { ok: true };
}

export function endsAtFromUnix(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}
