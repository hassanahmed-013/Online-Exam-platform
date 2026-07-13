import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

const navLinks = [
  { href: "/#exams", label: "Exams" },
  { href: "/#features", label: "Why MedPrep" },
  { href: "/#pricing", label: "Pricing" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
                    "hidden sm:inline-flex"
                  )}
                >
                  Admin
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ size: "lg" }), "px-4")}
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
                  "hidden sm:inline-flex"
                )}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "lg" }), "px-4")}
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
