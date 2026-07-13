import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSectionById, sectionAsCategory } from "@/lib/sections";
import { ArrowRight } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = await getSectionById(slug);
  return { title: section ? section.name : "Subject" };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = await getSectionById(slug);
  if (!section) notFound();

  const category = sectionAsCategory(section);
  const startHref = `/dashboard/question-bank?section=${section.id}#start-session`;

  const stats = [
    {
      label: "Total questions",
      value: (section.question_count ?? 0).toLocaleString(),
    },
    { label: "Status", value: section.is_active ? "Live" : "Hidden" },
    { label: "Source", value: "Admin" },
  ];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b">
          {category.cover_image_url && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- storage URL */}
              <img
                src={category.cover_image_url}
                alt=""
                className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/80 to-background/40" />
            </>
          )}
          <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
            <Link
              href="/categories"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              ← All subjects
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-4xl font-semibold tracking-tight">
                {category.name}
              </h1>
              <Badge variant="secondary">Section</Badge>
            </div>
            {category.short_description && (
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                {category.short_description}
              </p>
            )}

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10"
                >
                  <div className="text-2xl font-semibold text-primary">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={startHref}
                className={cn(buttonVariants({ size: "lg" }), "h-11 gap-1.5 px-6")}
              >
                Start practising
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/dashboard/exams"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 gap-1.5 px-6"
                )}
              >
                Take a timed exam
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
