import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/#subjects", label: "Question bank" },
      { href: "/dashboard/mock-exams", label: "Mock exams" },
      { href: "/dashboard/performance", label: "Performance" },
      { href: "/#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#features", label: "Why MedPrep" },
      { href: "/#", label: "About" },
      { href: "/#", label: "Contact" },
      { href: "/#", label: "Blog" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Sign up" },
      { href: "/admin", label: "Admin" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-gradient-to-b from-muted/40 to-muted/70">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Focused MDCAT prep — live question banks, timed mocks, and analytics
            that show where to improve next.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title} className="space-y-3">
            <h3 className="font-heading text-sm font-semibold">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} MedPrep. All rights reserved.</p>
          <p>Built for serious MDCAT preparation.</p>
        </div>
      </div>
    </footer>
  );
}
