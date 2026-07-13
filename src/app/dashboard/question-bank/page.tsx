import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StartSessionPanel } from "@/components/dashboard/start-session-panel";
import { CategoryCard } from "@/components/marketing/category-card";
import { getCurrentUser } from "@/lib/auth";
import { getActiveExams } from "@/lib/exams";
import { getSections, sectionAsCategory } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { ArrowRight, Upload } from "lucide-react";

export const metadata = { title: "Question bank" };

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section: initialSectionId } = await searchParams;
  const [sections, user, exams] = await Promise.all([
    getSections(),
    getCurrentUser(),
    getActiveExams(),
  ]);
  const isAdmin = user?.role === "admin";
  const subjects = sections.map(sectionAsCategory);
  const totalQuestions = sections.reduce((n, s) => n + (s.question_count ?? 0), 0);

  const emptySections = sections.filter((s) => (s.question_count ?? 0) === 0);
  const importHref =
    emptySections.length === 1
      ? `/admin/bulk-import?section_id=${emptySections[0].id}`
      : "/admin/bulk-import";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-primary/15 bg-gradient-to-br from-primary/[0.14] via-card to-emerald-500/[0.06] p-7 shadow-sm sm:p-9">
        <div
          className="pointer-events-none absolute -right-8 top-0 size-40 rounded-full bg-primary/10 blur-2xl"
          aria-hidden
        />
        {totalQuestions > 0 ? (
          <>
            <h2 className="relative font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              <span className="text-primary">{totalQuestions.toLocaleString()}</span>{" "}
              live questions across{" "}
              <span className="text-primary">{sections.length}</span> sections.
            </h2>
            <p className="relative mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Pick your sections, choose a length, then start a fresh session from
              the real inventory.
            </p>
          </>
        ) : isAdmin ? (
          <>
            <h2 className="relative font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              No questions in the bank yet
            </h2>
            <p className="relative mt-2 text-sm text-muted-foreground">
              {sections.length === 0
                ? "Create a section first, then import a CSV into it."
                : "Import a CSV to populate your sections with questions."}
            </p>
            <div className="relative mt-5 flex flex-wrap gap-2">
              {sections.length === 0 ? (
                <Link
                  href="/admin/sections"
                  className={cn(buttonVariants({ size: "lg" }), "h-11")}
                >
                  Create sections
                </Link>
              ) : null}
              <Link
                href={importHref}
                className={cn(
                  buttonVariants({
                    size: "lg",
                    variant: sections.length === 0 ? "outline" : "default",
                  }),
                  "h-11 gap-1.5"
                )}
              >
                <Upload className="size-4" />
                Import questions
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="relative font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              No questions available yet
            </h2>
            <p className="relative mt-2 text-sm text-muted-foreground">
              This bank doesn&apos;t have questions yet — check back soon.
            </p>
          </>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-xl font-semibold tracking-tight">
            Browse by section
          </h3>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isAdmin ? (
              <>
                No sections yet.{" "}
                <Link
                  href="/admin/sections"
                  className="font-medium text-primary hover:underline"
                >
                  Create one in Admin → Sections
                </Link>
                .
              </>
            ) : (
              <>No sections available yet — check back soon.</>
            )}
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {subjects.map((subject) => {
              const empty = subject.total === 0;
              const href =
                isAdmin && empty
                  ? `/admin/bulk-import?section_id=${subject.id}`
                  : `/dashboard/question-bank?section=${subject.id}#start-session`;
              const label = isAdmin && empty ? "Import" : "Practice";
              return (
                <CategoryCard
                  key={subject.id}
                  category={subject}
                  primaryHref={href}
                  primaryLabel={label}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <StartSessionPanel
          categories={subjects}
          exams={exams}
          initialSectionId={initialSectionId}
        />

        <aside className="h-fit space-y-4 rounded-[1.35rem] border border-border/70 bg-card p-6 shadow-sm">
          <h3 className="font-heading text-lg font-semibold">Configurable exams</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Prefer a named exam with its own lengths and timer? Start one from the
            exams page.
          </p>
          <Link
            href="/dashboard/exams"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-10 w-full gap-1.5"
            )}
          >
            Open exams
            <ArrowRight className="size-4" />
          </Link>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">Live</Badge>
              <span className="text-xs text-muted-foreground">Supabase</span>
            </div>
            <div className="text-sm font-medium">
              {sections.length} section{sections.length === 1 ? "" : "s"} ready
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
