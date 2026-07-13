"use server";

import { getCurrentUser } from "@/lib/auth";
import {
  getStripe,
  isStripeConfigured,
  priceIdForPlan,
} from "@/lib/stripe";
import type { PaidPlan } from "@/lib/billing-types";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/**
 * Create a Stripe Checkout session for Monthly / Annual and return the URL.
 * Requires a signed-in (non-demo) user.
 */
export async function createCheckoutSession(
  plan: PaidPlan
): Promise<CheckoutResult> {
  if (plan !== "monthly" && plan !== "annual") {
    return { ok: false, error: "Invalid plan." };
  }
  if (!isStripeConfigured) {
    return {
      ok: false,
      error:
        "Stripe is not configured. Add STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, and STRIPE_PRICE_ANNUAL to .env.local.",
    };
  }
  if (!hasServiceRole) {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is required for billing.",
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Sign in to purchase a plan." };
  }
  if (user.id === "demo") {
    return {
      ok: false,
      error: "Demo accounts cannot purchase — sign up with a real email.",
    };
  }
  if (user.role === "admin") {
    return {
      ok: false,
      error: "Admins already have full access — no purchase needed.",
    };
  }

  try {
    const stripe = getStripe();
    const sb = createAdminClient();
    const { data: profile } = await sb
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id as string | null | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name || user.full_name || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await sb
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const base = appUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
      success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return { ok: false, error: "Stripe did not return a checkout URL." };
    }
    return { ok: true, url: session.url };
  } catch (e) {
    console.error("[createCheckoutSession]", e);
    return { ok: false, error: (e as Error).message };
  }
}
