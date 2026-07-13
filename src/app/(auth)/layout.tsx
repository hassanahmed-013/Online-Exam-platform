import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GraduationCap, ListChecks, BarChart3 } from "lucide-react";

const highlights = [
  { icon: ListChecks, text: "12,000+ MDCAT questions with explanations" },
  { icon: GraduationCap, text: "Realistic timed mock exams" },
  { icon: BarChart3, text: "Analytics that pinpoint your weak topics" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-teal-700 to-teal-900 p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
        <div className="absolute -right-16 top-24 size-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <Logo href="/" className="relative text-primary-foreground [&_span]:text-primary-foreground" />
        <div className="relative space-y-6">
          <h2 className="max-w-sm font-heading text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            The smarter way to prepare for the MDCAT.
          </h2>
          <ul className="space-y-3">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/15">
                  <h.icon className="size-5" />
                </span>
                <span className="text-sm text-primary-foreground/90">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} MedPrep
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo href="/" />
          </div>
          {children}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
