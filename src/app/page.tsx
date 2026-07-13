import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CategoryCard } from "@/components/marketing/category-card";
import { Reveal } from "@/components/marketing/reveal";
import { CheckoutButton } from "@/components/marketing/checkout-button";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { getSections, sectionAsCategory } from "@/lib/sections";
import { isStripeConfigured } from "@/lib/stripe";
import type { PaidPlan } from "@/lib/billing-types";
import {
  ArrowRight,
  BarChart3,
  Clock,
  GraduationCap,
  ListChecks,
  Target,
} from "lucide-react";

const stories = [
  {
    icon: ListChecks,
    title: "A bank that matches how you revise",
    body: "Thousands of Single Best Answer MCQs organised by section — filter, practise, and rebuild weak areas without noise.",
    image:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",
    alt: "Clinical notes and stethoscope on a desk",
  },
  {
    icon: Clock,
    title: "Pressure when you need it",
    body: "Standard practice with instant explanations, timed tests that beat the clock, and curated mock papers under exam conditions.",
    image:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    alt: "Student studying with textbooks",
  },
  {
    icon: BarChart3,
    title: "Honest feedback, not vanity metrics",
    body: "Review every attempt, spot weak topics, and keep mocks scored separately so your bank stats stay clean.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    alt: "Analytics charts on a laptop",
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
    stripePlan: null as PaidPlan | null,
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
    href: "/signup?next=/#pricing",
    highlight: true,
    stripePlan: "monthly" as PaidPlan,
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
    href: "/signup?next=/#pricing",
    highlight: false,
    stripePlan: "annual" as PaidPlan,
  },
];

export default async function LandingPage() {
  const [sections, user] = await Promise.all([getSections(), getCurrentUser()]);
  const isAdmin = user?.role === "admin";
  const subjects = sections.map(sectionAsCategory);
  const totalQuestions = sections.reduce((n, s) => n + (s.question_count ?? 0), 0);
  const practiseHref = user ? "/dashboard/question-bank" : "/signup";
  const practiseLabel = user ? "Continue practising" : "Start practising free";
  const accountHref = user ? "/dashboard" : "/signup";
  const stats = [
    {
      value: totalQuestions > 0 ? totalQuestions.toLocaleString() : "—",
      label: "Live questions",
    },
    {
      value: sections.length > 0 ? String(sections.length) : "—",
      label: "Sections",
    },
    { value: "20–200", label: "Exam lengths" },
    { value: "Stripe", label: "Secure checkout" },
  ];

  return (
    <>
      <SiteHeader variant="dark" />

      <main className="flex-1">
        {/* Full-bleed hero */}
        <section className="relative min-h-[min(100svh,56rem)] overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=2400&q=80"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-teal-950/92 via-teal-900/78 to-teal-950/55"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-teal-950/70 via-transparent to-teal-950/30"
            aria-hidden
          />

          <div className="relative mx-auto flex min-h-[min(100svh,56rem)] w-full max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-24 md:justify-center md:pb-28">
            <p className="mp-hero-brand font-heading text-6xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-7xl md:text-8xl lg:text-9xl">
              MedPrep
            </p>
            <div className="mp-hero-copy mt-5 max-w-xl space-y-4">
              <h1 className="font-heading text-2xl font-medium tracking-tight text-balance text-white/95 sm:text-3xl md:text-4xl">
                Practice that adapts to how you revise for the MDCAT.
              </h1>
              <p className="max-w-md text-base text-teal-50/80 text-pretty sm:text-lg">
                Subject banks, timed mocks, and clear feedback — built for
                focused medical prep.
              </p>
            </div>
            <div className="mp-hero-cta mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={practiseHref}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 gap-2 bg-white px-8 text-base text-teal-950 shadow-xl shadow-black/20 hover:bg-teal-50"
                )}
              >
                {practiseLabel}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/categories"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 border-white/35 bg-white/5 px-8 text-base text-white backdrop-blur-sm hover:bg-white/15 hover:text-white"
                )}
              >
                Browse sections
              </Link>
            </div>
          </div>
        </section>

        {/* Proof strip */}
        <section className="border-b border-border/70 bg-card">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 divide-x divide-y divide-border/60 sm:grid-cols-4 sm:divide-y-0">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-start gap-1.5 px-5 py-7 sm:px-8"
              >
                <div className="font-heading text-3xl font-semibold text-primary tabular-nums">
                  {s.value}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Subjects */}
        <section id="subjects" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
          <Reveal className="mb-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                Live bank
              </p>
              <h2 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                Choose your subject
              </h2>
              <p className="mt-3 text-muted-foreground">
                Real sections and counts from your admin bank — published
                instantly, no redeploy.
              </p>
            </div>
            <Link
              href="/categories"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "shrink-0 gap-1.5 border-primary/25"
              )}
            >
              View all
              <ArrowRight className="size-4" />
            </Link>
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
                <Reveal key={subject.id} delay={i * 0.07}>
                  <CategoryCard
                    category={subject}
                    primaryHref={`/categories/${subject.id}`}
                    primaryLabel="Explore"
                  />
                </Reveal>
              ))}
            </div>
          )}
        </section>

        {/* Editorial feature stories */}
        <section id="features" className="border-y border-border/60 bg-muted/25 py-6">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <Reveal className="mb-16 max-w-2xl">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                Why MedPrep
              </p>
              <h2 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                Built for deliberate medical revision
              </h2>
            </Reveal>

            <div className="space-y-20">
              {stories.map((story, i) => {
                const reverse = i % 2 === 1;
                return (
                  <Reveal key={story.title} delay={0.05}>
                    <div
                      className={cn(
                        "grid items-center gap-10 lg:grid-cols-2 lg:gap-14",
                        reverse && "lg:[&>*:first-child]:order-2"
                      )}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] shadow-2xl shadow-teal-950/10 ring-1 ring-border/60">
                        <Image
                          src={story.image}
                          alt={story.alt}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </div>
                      <div className="max-w-lg">
                        <span className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <story.icon className="size-6" />
                        </span>
                        <h3 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                          {story.title}
                        </h3>
                        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                          {story.body}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
          <Reveal className="mb-14 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              Pricing
            </p>
            <h2 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
              Simple plans. Serious prep.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              {isStripeConfigured
                ? "Pay securely with Stripe. Access unlocks as soon as payment succeeds."
                : "Start free. Upgrade when you're ready to unlock the full bank."}
            </p>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
            {plans.map((plan, i) => {
              const isFree = plan.name === "Free";
              const showCheckout =
                Boolean(user) && !isAdmin && !isFree && Boolean(plan.stripePlan);

              return (
                <Reveal key={plan.name} delay={i * 0.08}>
                  <div
                    className={cn(
                      "relative flex h-full flex-col rounded-[1.35rem] border p-8 transition-shadow",
                      plan.highlight
                        ? "border-primary bg-gradient-to-b from-primary/[0.1] via-card to-card shadow-2xl shadow-primary/15 md:-translate-y-3"
                        : "border-border/70 bg-card/95 shadow-sm"
                    )}
                  >
                    {plan.highlight && (
                      <Badge className="absolute -top-3 left-7 px-3 shadow-md">
                        Most popular
                      </Badge>
                    )}
                    <h3 className="font-heading text-2xl font-medium">{plan.name}</h3>
                    <div className="mt-4 flex items-end gap-1.5">
                      <span className="font-heading text-5xl font-semibold tracking-tight">
                        {plan.price}
                      </span>
                      <span className="pb-2 text-sm text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>
                    <ul className="mt-8 flex-1 space-y-3.5">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-sm">
                          <Target className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                    {showCheckout && plan.stripePlan ? (
                      <CheckoutButton
                        plan={plan.stripePlan}
                        label={plan.cta}
                        highlight={plan.highlight}
                      />
                    ) : (
                      <Link
                        href={
                          user
                            ? isFree
                              ? "/dashboard/question-bank"
                              : isAdmin
                                ? "/admin/users"
                                : "/signup"
                            : plan.href
                        }
                        className={cn(
                          buttonVariants({
                            variant: plan.highlight ? "default" : "outline",
                            size: "lg",
                          }),
                          "mt-8 h-12",
                          plan.highlight && "shadow-lg shadow-primary/25"
                        )}
                      >
                        {user
                          ? isFree
                            ? "Continue practising"
                            : isAdmin
                              ? "Grant plan in Admin"
                              : plan.cta
                          : plan.cta}
                      </Link>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=2400&q=80"
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-teal-950/85" aria-hidden />
          </div>
          <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
            <GraduationCap className="mb-6 size-12 text-teal-100/90" />
            <h2 className="font-heading text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Your seat in medical school starts with one question
            </h2>
            <p className="mt-5 max-w-xl text-teal-50/80">
              Bank, mocks, and analytics in one place — built for the MDCAT
              grind.
            </p>
            <Link
              href={accountHref}
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-10 h-12 gap-2 bg-white px-8 text-teal-950 hover:bg-teal-50"
              )}
            >
              {user ? "Open your dashboard" : "Create your free account"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
