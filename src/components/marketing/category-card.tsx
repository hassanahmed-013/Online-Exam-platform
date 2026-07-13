import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";
import { PlayCircle } from "lucide-react";

// Fallback gradient when a category has no cover_image_url (e.g. leaf topics).
const FALLBACK_GRADIENT = "from-teal-500/90 to-emerald-500/90";

export function CategoryCard({
  category,
  demoHref,
  primaryHref,
  primaryLabel = "Sign up",
}: {
  category: Category;
  /** When set, a "Try demo" button is shown. */
  demoHref?: string;
  primaryHref: string;
  primaryLabel?: string;
}) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-lg">
      {/* Cover */}
      <div className="relative h-32 overflow-hidden">
        {category.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URI / storage URL, no next/image remote config needed
          <img
            src={category.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "flex h-full items-end bg-gradient-to-br p-4",
              FALLBACK_GRADIENT
            )}
          >
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
            <span className="relative text-xl font-semibold text-white drop-shadow-sm">
              {category.name}
            </span>
          </div>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-lg font-medium">{category.name}</h3>
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {category.attempted > 0
              ? `${category.attempted}/${category.total.toLocaleString()}`
              : `${category.total.toLocaleString()} Q`}
          </Badge>
        </div>
        {category.short_description && (
          <p className="flex-1 text-sm text-muted-foreground">
            {category.short_description}
          </p>
        )}
        <div className="mt-1 flex gap-2">
          {demoHref && (
            <Link
              href={demoHref}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "flex-1 gap-1.5"
              )}
            >
              <PlayCircle className="size-4" />
              Try demo
            </Link>
          )}
          <Link
            href={primaryHref}
            className={cn(buttonVariants(), "flex-1")}
          >
            {primaryLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
