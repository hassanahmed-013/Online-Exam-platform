import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  activatePaidPlan,
  deactivatePaidPlan,
  endsAtFromUnix,
} from "@/lib/billing";
import {
  getStripe,
  planFromPriceId,
} from "@/lib/stripe";
import type { PaidPlan } from "@/lib/billing-types";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function planFromSubscription(sub: Stripe.Subscription): PaidPlan | null {
  const fromMeta = sub.metadata?.plan;
  if (fromMeta === "monthly" || fromMeta === "annual") return fromMeta;
  const priceId = sub.items.data[0]?.price?.id;
  return planFromPriceId(priceId);
}

function userIdFromSubscription(sub: Stripe.Subscription): string | null {
  return sub.metadata?.supabase_user_id || null;
}

async function resolveUserId(opts: {
  metadataUserId?: string | null;
  clientReferenceId?: string | null;
  customerId?: string | null;
}): Promise<string | null> {
  if (opts.metadataUserId) return opts.metadataUserId;
  if (opts.clientReferenceId) return opts.clientReferenceId;
  if (!opts.customerId || !hasServiceRole) return null;
  const sb = createAdminClient();
  const { data } = await sb
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", opts.customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const userId = await resolveUserId({
    metadataUserId: userIdFromSubscription(sub),
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
  });
  if (!userId) {
    console.error("[stripe webhook] no user for subscription", sub.id);
    return;
  }

  const plan = planFromSubscription(sub);
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  const active =
    sub.status === "active" ||
    sub.status === "trialing" ||
    sub.status === "past_due";

  if (!active || !plan) {
    await deactivatePaidPlan(userId);
    return;
  }

  const periodEnd = sub.items?.data?.[0]?.current_period_end;

  const res = await activatePaidPlan({
    userId,
    plan,
    endsAt: endsAtFromUnix(periodEnd),
    paymentRef: sub.id,
    stripeCustomerId: customerId ?? null,
  });
  if (!res.ok) console.error("[stripe webhook] activate failed", res.error);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!webhookSecret.startsWith("whsec_")) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 }
    );
  }
  if (!hasServiceRole) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    console.error("[stripe webhook] signature", e);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = await resolveUserId({
          metadataUserId: session.metadata?.supabase_user_id,
          clientReferenceId: session.client_reference_id,
          customerId:
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id,
        });
        if (!userId) {
          console.error("[stripe webhook] checkout missing user", session.id);
          break;
        }

        const planMeta = session.metadata?.plan;
        const plan: PaidPlan | null =
          planMeta === "monthly" || planMeta === "annual" ? planMeta : null;

        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (subId) {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        } else if (plan) {
          // Fallback if subscription object is not expanded yet.
          const ends = new Date();
          if (plan === "monthly") ends.setMonth(ends.getMonth() + 1);
          else ends.setFullYear(ends.getFullYear() + 1);
          await activatePaidPlan({
            userId,
            plan,
            endsAt: ends.toISOString(),
            paymentRef: session.id,
            stripeCustomerId:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? null,
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId({
          metadataUserId: userIdFromSubscription(sub),
          customerId:
            typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        });
        if (userId) await deactivatePaidPlan(userId);
        break;
      }

      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler", e);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
