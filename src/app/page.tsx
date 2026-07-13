import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CategoryCard } from "@/components/marketing/category-card";
import { Reveal } from "@/components/marketing/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { getSections, sectionAsCategory } from "@/lib/sections";
import {
  BarChart3,
  BookOpenCheck,
  Clock,
  GraduationCap,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

const features = [
  {
    icon: ListChecks,
    title: "Massive question bank",
    body: "Thousands of MDCAT MCQs across Biology, Chemistry, Physics and English — filtered by subject and difficulty.",
  },
  {
    icon: Clock,
    title: "Three practice modes",
    body: "Untimed practice with instant explanations, timed tests, and full mock-exam simulations.",
  },
  {
    icon: BarChart3,
    title: "Performance analytics",
    body: "Track accuracy over time, spot weak topics automatically, and keep your study streak alive.",
  },
  {
    icon: BookOpenCheck,
    title: "Review & key concepts",
    body: "Revisit every question you've answered with full explanations and a curated key-concepts list.",
  },
  {
    icon: Target,
    title: "Realistic mock exams",
    body: "Sit named papers under exam conditions — scored separately so they never skew your bank stats.",
  },
  {
    icon: ShieldCheck,
    title: "Save & resume anywhere",
    body: "Every answer is saved as you go. Pause a session and pick up exactly where you left off.",
  },
];

const plans = [
  {
    name: "Free",
    price: "Rs 0",
    period: "forever",
    features: ["Demo sessions", "50 practice questions", "Basic performance view"],
    cta: "Start free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Monthly",
    price: "Rs 1,500",
    period: "/ month",
    features: [
      "Full question bank",
      "Timed tests & all mocks",
      "Full analytics & review",
      "Save & resume",
    ],
    cta: "Go monthly",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Annual",
    price: "Rs 9,000",
    period: "/ year",
    features: [
      "Everything in Monthly",
      "Save 50% vs monthly",
      "Priority new content",
      "Exam-day countdown",
    ],
    cta: "Go annual",
    href: "/signup",
    highlight: false,
  },
];

export default async function LandingPage() {
  const [sections, user] = await Promise.all([getSections(), getCurrentUser()]);
  const isAdmin = user?.role === "admin";
  const subjects = sections.map(sectionAsCategory);
  const totalQuestions = sections.reduce((n, s) => n + (s.question_count ?? 0), 0);
  const stats = [
    {
      value: totalQuestions > 0 ? totalQuestions.toLocaleString() : "—",
      label: "Live questions",
    },
    {
      value: sections.length > 0 ? String(sections.length) : "—",
      label: "Sections",
    },
    { value: "50–200", label: "Exam lengths" },
    { value: "Live", label: "Admin-managed" },
  ];

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
          <div className="absolute -top-24 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 md:py-28">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Sparkles className="size-3.5 text-primary" />
              Built for the 2026 MDCAT
            </Badge>
            <h1 className="max-w-3xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl">
              Ace the MDCAT with{" "}
              <span className="text-primary">practice that adapts</span> to you
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground text-pretty">
              Practise thousands of MCQs by subject, sit realistic timed mock
              exams, and track exactly where you need to improve — all in one
              focused platform.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base")}
              >
                Start practising free
              </Link>
              <Link
                href="/categories"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-6 text-base"
                )}
              >
                Browse sections
              </Link>
            </div>

            {/* Stat strip */}
            <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-card px-4 py-5 ring-1 ring-foreground/10"
                >
                  <div className="text-2xl font-semibold text-primary">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subject cards */}
        <section id="subjects" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="mb-10 text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Choose your subject
            </h2>
            <p className="mt-2 text-muted-foreground">
              Sections are managed by admins and appear here as soon as they&apos;re
              published — with real question counts from the live bank.
            </p>
          </Reveal>
          {subjects.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              {isAdmin ? (
                <>
                  No sections yet.{" "}
                  <Link
                    href="/admin/sections"
                    className="font-medium text-primary hover:underline"
                  >
                    Add them under Admin → Sections
                  </Link>
                  .
                </>
              ) : (
                <>Subjects will appear here once they&apos;re published.</>
              )}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {subjects.map((subject, i) => (
                <Reveal key={subject.id} delay={i * 0.06}>
                  <CategoryCard
                    category={subject}
                    primaryHref={`/categories/${subject.id}`}
                    primaryLabel="Explore"
                  />
                </Reveal>
              ))}
            </div>
          )}
          <div className="mt-8 text-center">
            <Link
              href="/categories"
              className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
            >
              Browse all subjects
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-muted/30 py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <Reveal className="mb-12 max-w-2xl">
              <Badge variant="outline" className="mb-3">
                Why MedPrep
              </Badge>
              <h2 className="font-heading text-3xl font-semibold tracking-tight">
                Everything you need, nothing you don&apos;t
              </h2>
              <p className="mt-2 text-muted-foreground">
                A focused toolkit modelled on how top scorers actually
                revise — deliberate practice, timed pressure, and honest
                feedback.
              </p>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 0.06}>
                  <div className="h-full rounded-xl bg-card p-6 ring-1 ring-foreground/10">
                    <div className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="size-5" />
                    </div>
                    <h3 className="mb-1.5 font-heading text-lg font-medium">
                      {f.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{f.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <Reveal className="mb-12 text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight">
              Simple, student-friendly pricing
            </h2>
            <p className="mt-2 text-muted-foreground">
              Start free. Upgrade when you&apos;re ready to unlock the full bank.
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "flex flex-col rounded-2xl bg-card p-6 ring-1 ring-foreground/10",
                  plan.highlight &&
                    "ring-2 ring-primary shadow-lg md:-translate-y-2"
                )}
              >
                {plan.highlight && (
                  <Badge className="mb-3 w-fit">Most popular</Badge>
                )}
                <h3 className="font-heading text-lg font-medium">{plan.name}</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-3xl font-semibold">{plan.price}</span>
                  <span className="pb-1 text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <ListChecks className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={cn(
                    buttonVariants({
                      variant: plan.highlight ? "default" : "outline",
                      size: "lg",
                    }),
                    "mt-6 h-10"
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground">
            <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />
            <GraduationCap className="relative mx-auto mb-4 size-10" />
            <h2 className="relative mx-auto max-w-2xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Your seat in medical school starts with one question
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/80">
              Join thousands of students preparing smarter for the MDCAT.
            </p>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "relative mt-6 h-11 px-6 text-base"
              )}
            >
              Create your free account
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
