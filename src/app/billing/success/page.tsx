import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Payment successful" };

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const user = await getCurrentUser();

  let planLabel = "your plan";
  if (user && hasServiceRole) {
    const sb = createAdminClient();
    const { data } = await sb
      .from("profiles")
      .select("current_plan")
      .eq("id", user.id)
      .maybeSingle();
    const plan = data?.current_plan;
    if (plan === "monthly") planLabel = "Monthly";
    else if (plan === "annual") planLabel = "Annual";
    else if (plan && plan !== "free") planLabel = plan;
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <CheckCircle2 className="size-14 text-primary" />
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Payment received
        </h1>
        <p className="text-muted-foreground">
          {session_id
            ? `Thanks — your ${planLabel} access is activating. If the dashboard still shows Free, wait a few seconds and refresh (Stripe webhook).`
            : `Thanks — your ${planLabel} access should be active shortly.`}
        </p>
        <Link
          href="/dashboard/question-bank"
          className={cn(buttonVariants({ size: "lg" }), "mt-4 h-11 px-6")}
        >
          Start practising
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
