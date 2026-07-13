import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

const navLinks = [
  { href: "/#subjects", label: "Subjects" },
  { href: "/#features", label: "Why MedPrep" },
  { href: "/#pricing", label: "Pricing" },
];

export async function SiteHeader({
  variant = "light",
}: {
  /** `dark` for full-bleed photo heroes; `light` for standard pages. */
  variant?: "light" | "dark";
}) {
  const user = await getCurrentUser();
  const dark = variant === "dark";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full backdrop-blur-xl",
        dark
          ? "border-b border-white/10 bg-teal-950/40 text-white"
          : "border-b border-border/50 bg-background/80"
      )}
    >
      <div className="mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo className={cn(dark && "[&_span]:text-white")} />

        <nav className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                dark
                  ? "text-teal-50/80 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {user.role === "admin" ? (
                <Link
                  href="/admin"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "hidden sm:inline-flex",
                    dark && "text-teal-50 hover:bg-white/10 hover:text-white"
                  )}
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "px-5 shadow-md",
                  dark
                    ? "!bg-white !text-teal-950 shadow-black/20 hover:!bg-teal-50 hover:!text-teal-950"
                    : "shadow-primary/20"
                )}
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "hidden sm:inline-flex",
                  dark && "text-teal-50 hover:bg-white/10 hover:text-white"
                )}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "px-5 shadow-md",
                  dark
                    ? "!bg-white !text-teal-950 shadow-black/20 hover:!bg-teal-50 hover:!text-teal-950"
                    : "shadow-primary/20"
                )}
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
