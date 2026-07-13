import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StartSessionPanel } from "@/components/dashboard/start-session-panel";
import { CategoryCard } from "@/components/marketing/category-card";
import { getCurrentUser } from "@/lib/auth";
import { getActiveExams } from "@/lib/exams";
import { getSections, sectionAsCategory } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 ring-1 ring-primary/10">
        {totalQuestions > 0 ? (
          <>
            <h2 className="font-heading text-xl font-semibold sm:text-2xl">
              <span className="text-primary">{totalQuestions.toLocaleString()}</span>{" "}
              live questions across{" "}
              <span className="text-primary">{sections.length}</span> sections.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick your sections, choose a length, then start a fresh session from
              the real inventory.
            </p>
          </>
        ) : isAdmin ? (
          <>
            <h2 className="font-heading text-xl font-semibold sm:text-2xl">
              No questions in the bank yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sections.length === 0
                ? "Create a section first, then import a CSV into it."
                : "Import a CSV to populate your sections with questions."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {sections.length === 0 ? (
                <Link
                  href="/admin/sections"
                  className={cn(buttonVariants({ size: "lg" }), "h-10")}
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
                  "h-10 gap-1.5"
                )}
              >
                <Upload className="size-4" />
                Import questions
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-heading text-xl font-semibold sm:text-2xl">
              No questions available yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This bank doesn&apos;t have questions yet — check back soon.
            </p>
          </>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-heading text-lg font-medium">Browse by section</h3>
          <Link
            href="/categories"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <StartSessionPanel
          categories={subjects}
          exams={exams}
          initialSectionId={initialSectionId}
        />

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Configurable exams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Prefer a named exam with its own lengths and timer? Start one from
              the exams page.
            </p>
            <Link
              href="/dashboard/exams"
              className="text-sm font-medium text-primary hover:underline"
            >
              Open exams →
            </Link>
            <div className="rounded-lg border p-3">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline">Live</Badge>
                <span className="text-xs text-muted-foreground">Supabase</span>
              </div>
              <div className="text-sm font-medium">
                {sections.length} section{sections.length === 1 ? "" : "s"} ready
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
