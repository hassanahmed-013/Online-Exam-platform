import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";
import { ArrowRight, PlayCircle } from "lucide-react";

const FALLBACK_GRADIENT = "from-teal-600/95 via-teal-500/90 to-emerald-600/90";

export function CategoryCard({
  category,
  demoHref,
  primaryHref,
  primaryLabel = "Sign up",
}: {
  category: Category;
  demoHref?: string;
  primaryHref: string;
  primaryLabel?: string;
}) {
  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/70 p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10">
      <div className="relative h-40 overflow-hidden">
        {category.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URI / storage URL
          <img
            src={category.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "flex h-full items-end bg-gradient-to-br p-5",
              FALLBACK_GRADIENT
            )}
          >
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
            <span className="relative font-heading text-2xl font-semibold text-white drop-shadow-sm">
              {category.name}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-lg font-medium">{category.name}</h3>
          <Badge
            variant="secondary"
            className="shrink-0 bg-primary/10 text-primary tabular-nums"
          >
            {category.attempted > 0
              ? `${category.attempted}/${category.total.toLocaleString()}`
              : `${category.total.toLocaleString()} Q`}
          </Badge>
        </div>
        {category.short_description && (
          <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
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
            className={cn(buttonVariants(), "flex-1 gap-1.5")}
          >
            {primaryLabel}
            <ArrowRight className="size-3.5 opacity-70" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
