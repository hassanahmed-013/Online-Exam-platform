import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-125"
        aria-hidden
      />
      <span className="relative mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10">
        <Icon className="size-5" />
      </span>
      <div className="relative min-w-0">
        <div className="font-heading text-3xl font-semibold leading-none tracking-tight tabular-nums">
          {value}
        </div>
        <div className="mt-2 text-sm font-medium text-muted-foreground">{label}</div>
        {hint ? (
          <div className="mt-1 text-xs text-primary/90">{hint}</div>
        ) : null}
      </div>
    </div>
  );
}
