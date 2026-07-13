"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createCheckoutSession } from "@/lib/actions/billing";
import type { PaidPlan } from "@/lib/billing-types";
import { Loader2 } from "lucide-react";

export function CheckoutButton({
  plan,
  label,
  highlight,
  className,
}: {
  plan: PaidPlan;
  label: string;
  highlight?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const res = await createCheckoutSession(plan);
      if (res.ok) {
        window.location.href = res.url;
        return;
      }
      toast.error(res.error);
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        buttonVariants({
          variant: highlight ? "default" : "outline",
          size: "lg",
        }),
        "mt-6 h-10",
        className
      )}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Redirecting…
        </>
      ) : (
        label
      )}
    </button>
  );
}
