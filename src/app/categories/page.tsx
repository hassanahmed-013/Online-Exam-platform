import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CategoryCard } from "@/components/marketing/category-card";
import { Reveal } from "@/components/marketing/reveal";
import { getCurrentUser } from "@/lib/auth";
import { getSections, sectionAsCategory } from "@/lib/sections";

export const metadata = { title: "Subjects" };

export default async function CategoriesPage() {
  const [sections, user] = await Promise.all([getSections(), getCurrentUser()]);
  const subjects = sections.map(sectionAsCategory);
  const isAdmin = user?.role === "admin";

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="mb-10 max-w-2xl">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Browse subjects
            </h1>
            <p className="mt-2 text-muted-foreground">
              Live sections from the admin panel. Sign up to unlock the full
              question bank, timed tests and configurable exams.
            </p>
          </Reveal>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isAdmin ? (
                <>
                  No sections published yet.{" "}
                  <Link
                    href="/admin/sections"
                    className="font-medium text-primary hover:underline"
                  >
                    Create one under Admin → Sections
                  </Link>
                  .
                </>
              ) : (
                <>No subjects available yet — check back soon.</>
              )}
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject, i) => (
                <Reveal key={subject.id} delay={(i % 3) * 0.06}>
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
      </main>
      <SiteFooter />
    </>
  );
}
