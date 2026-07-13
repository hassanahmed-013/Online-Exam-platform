import { Suspense } from "react";
import { ResultsView } from "@/components/runner/results-view";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Results" };

async function ResultsWithUser() {
  const user = await getCurrentUser();
  return <ResultsView studentName={user?.full_name} />;
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <ResultsWithUser />
    </Suspense>
  );
}
