import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/stat-card";
import { getCurrentUser } from "@/lib/auth";
import { getSections } from "@/lib/sections";
import { getTextbooks } from "@/lib/textbooks";
import { ArrowRight, BookOpen, Layers, Percent, Target } from "lucide-react";

export default async function DashboardHome() {
  const [sections, textbooks, user] = await Promise.all([
    getSections(),
    getTextbooks(),
    getCurrentUser(),
  ]);
  const isAdmin = user?.role === "admin";
  const totalQuestions = sections.reduce((n, s) => n + (s.question_count ?? 0), 0);
  const firstName = user?.full_name?.split(" ")[0] || "there";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-teal-800 via-primary to-teal-600 p-7 text-primary-foreground shadow-xl shadow-primary/20 sm:p-9">
        <div
          className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]"
          aria-hidden
        />
        <div
          className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <p className="text-sm font-medium text-teal-100/80">Welcome back</p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {firstName}, ready to practise?
            </h2>
            <p className="text-sm text-teal-50/85 sm:text-base">
              Live sections and question counts from your admin bank — start a
              session whenever you are.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/exams"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              )}
            >
              Take an exam
            </Link>
            <Link
              href="/dashboard/question-bank"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 gap-1.5 bg-white text-teal-950 hover:bg-teal-50"
              )}
            >
              Start a session
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Layers}
          label="Live questions"
          value={totalQuestions.toLocaleString()}
        />
        <StatCard icon={Percent} label="Sections" value={sections.length} />
        <StatCard
          icon={Target}
          label="Ready to practise"
          value={sections.filter((s) => (s.question_count ?? 0) > 0).length}
          hint="Sections with questions"
        />
        <StatCard
          icon={BookOpen}
          label="Exams"
          value="Open"
          hint="Pick a length under Exams"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading text-xl font-semibold tracking-tight">
              Your sections
            </h3>
            <Link
              href="/dashboard/question-bank"
              className="text-sm font-medium text-primary hover:underline"
            >
              Question bank →
            </Link>
          </div>
          {sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-8 text-sm text-muted-foreground">
              {isAdmin ? (
                <>
                  No sections yet —{" "}
                  <Link
                    href="/admin/sections"
                    className="font-medium text-primary hover:underline"
                  >
                    create them in Admin → Sections
                  </Link>
                  , then{" "}
                  <Link
                    href="/admin/bulk-import"
                    className="font-medium text-primary hover:underline"
                  >
                    import questions
                  </Link>
                  .
                </>
              ) : (
                <>No sections available yet — check back soon.</>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sections.map((s) => {
                const empty = (s.question_count ?? 0) === 0;
                const href =
                  isAdmin && empty
                    ? `/admin/bulk-import?section_id=${s.id}`
                    : `/dashboard/question-bank?section=${s.id}#start-session`;
                return (
                  <Link
                    key={s.id}
                    href={href}
                    className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <div className="relative h-28 overflow-hidden bg-gradient-to-br from-teal-600 to-emerald-700">
                      {s.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-teal-950/70 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4">
                        <div className="font-heading text-lg font-semibold text-white">
                          {s.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-4">
                      <span className="text-sm text-muted-foreground">
                        {empty && isAdmin
                          ? "Import questions →"
                          : `${(s.question_count ?? 0).toLocaleString()} questions`}
                      </span>
                      <ArrowRight className="size-4 text-primary opacity-70 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="font-heading text-xl font-semibold tracking-tight">
            Textbooks
          </h3>
          <div className="rounded-2xl border border-border/70 bg-card p-2 shadow-sm">
            {textbooks.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {isAdmin ? (
                  <>
                    No textbooks yet —{" "}
                    <Link
                      href="/admin/textbooks"
                      className="font-medium text-primary hover:underline"
                    >
                      upload them under Admin → Textbooks
                    </Link>
                    .
                  </>
                ) : (
                  <>No textbooks available yet — check back soon.</>
                )}
              </p>
            ) : (
              <div className="space-y-1">
                {textbooks.slice(0, 4).map((t) => (
                  <Link
                    key={t.id}
                    href="/dashboard/textbooks"
                    className="flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-primary/5"
                  >
                    <div>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.tag}</div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
