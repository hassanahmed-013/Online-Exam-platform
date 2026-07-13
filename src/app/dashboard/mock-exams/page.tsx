import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMockPapers } from "@/lib/mock-papers";
import { MockPaperStartCard } from "@/components/dashboard/mock-paper-start-card";
import { Info, Smartphone } from "lucide-react";

export const metadata = { title: "Mock exams" };

export default async function MockExamsPage() {
  const [papers, user] = await Promise.all([
    getActiveMockPapers(),
    getCurrentUser(),
  ]);
  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Mock exams
        </h2>
        <p className="text-sm text-muted-foreground">
          Curated papers with a fixed question set — the same questions, in the
          same order, for every attempt. For random-length practice, use{" "}
          <Link href="/dashboard/exams" className="underline">
            Exams
          </Link>
          .
        </p>
      </div>

      <Alert>
        <Smartphone />
        <AlertTitle>Desktop or tablet recommended</AlertTitle>
        <AlertDescription>
          To mirror real exam conditions, take longer papers on a larger screen.
          Your progress saves automatically so you can resume.
        </AlertDescription>
      </Alert>

      {papers.length === 0 ? (
        <Alert>
          <Info />
          <AlertTitle>No mock papers published yet</AlertTitle>
          <AlertDescription>
            {isAdmin ? (
              <>
                Create a paper under{" "}
                <Link href="/admin/mock-exams" className="font-medium underline">
                  Admin → Mock exams
                </Link>{" "}
                and assign questions to it. Or try a configurable-length exam on{" "}
                <Link href="/dashboard/exams" className="underline">
                  Exams
                </Link>
                .
              </>
            ) : (
              <>
                No mock papers are available yet — check back soon. Or try a
                configurable-length exam on{" "}
                <Link href="/dashboard/exams" className="underline">
                  Exams
                </Link>
                .
              </>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {papers.map((paper) => (
            <MockPaperStartCard key={paper.id} paper={paper} />
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href="/dashboard/exams"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Configurable exams
        </Link>
      </div>
    </div>
  );
}
