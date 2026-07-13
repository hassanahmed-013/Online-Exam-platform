import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground">
            Live sections and question counts from your admin bank.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/exams"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10")}
          >
            Take an exam
          </Link>
          <Link
            href="/dashboard/question-bank"
            className={cn(buttonVariants({ size: "lg" }), "h-10 gap-1.5")}
          >
            Start a session
            <ArrowRight className="size-4" />
          </Link>
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-primary" />
              Your sections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
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
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
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
                      className="rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {empty && isAdmin
                          ? "Import questions →"
                          : `${(s.question_count ?? 0).toLocaleString()} questions`}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              Textbooks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {textbooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
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
              textbooks.slice(0, 4).map((t) => (
                <Link
                  key={t.id}
                  href="/dashboard/textbooks"
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div>
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.tag}</div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}