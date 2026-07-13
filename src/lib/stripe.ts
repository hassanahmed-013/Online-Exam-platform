import "server-only";
import Stripe from "stripe";
import type { PaidPlan } from "@/lib/billing-types";

export type { PaidPlan };

const secret = process.env.STRIPE_SECRET_KEY ?? "";

export const isStripeConfigured =
  secret.startsWith("sk_") &&
  Boolean(process.env.STRIPE_PRICE_MONTHLY) &&
  Boolean(process.env.STRIPE_PRICE_ANNUAL);

export function getStripe(): Stripe {
  if (!secret.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  // API version pinned by the installed `stripe` SDK defaults.
  return new Stripe(secret);
}

/** Map app plan → Stripe Price id from env. */
export function priceIdForPlan(plan: PaidPlan): string {
  const id =
    plan === "monthly"
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_ANNUAL;
  if (!id) {
    throw new Error(
      `Missing Stripe price id for ${plan}. Set STRIPE_PRICE_${plan.toUpperCase()} in .env.local.`
    );
  }
  return id;
}

export function planFromPriceId(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return "monthly";
  if (priceId === process.env.STRIPE_PRICE_ANNUAL) return "annual";
  return null;
}

export const PLAN_LABEL: Record<PaidPlan, string> = {
  monthly: "Monthly",
  annual: "Annual",
};
