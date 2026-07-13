import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/#exams", label: "Question bank" },
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
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            The smarter way to prepare for the MDCAT — thousands of MCQs, timed
            mocks and analytics that find your weak spots.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title} className="space-y-3">
            <h3 className="text-sm font-semibold">{col.title}</h3>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} MedPrep. All rights reserved.</p>
          <p>Built with Next.js, Supabase &amp; shadcn/ui.</p>
        </div>
      </div>
    </footer>
  );
}
