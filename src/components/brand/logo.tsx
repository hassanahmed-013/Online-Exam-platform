import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        {/* medical cross + pulse */}
        <path
          d="M4 13h3l2-4 3 8 2-5h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({
  href = "/",
  className,
  showText = true,
}: {
  href?: string;
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-heading", className)}
    >
      <LogoMark />
      {showText && (
        <span className="text-lg font-semibold tracking-tight">
          Med<span className="text-primary">Prep</span>
        </span>
      )}
    </Link>
  );
}
