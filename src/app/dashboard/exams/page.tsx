import Link from "next/link";
import { ExamLengthPicker } from "@/components/dashboard/exam-length-picker";
import { getCurrentUser } from "@/lib/auth";
import { getActiveExams } from "@/lib/exams";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

export const metadata = { title: "Exams" };

export default async function DashboardExamsPage() {
  const [exams, user] = await Promise.all([getActiveExams(), getCurrentUser()]);
  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Exams
        </h2>
        <p className="text-sm text-muted-foreground">
          Pick an exam and choose how many questions to attempt. Lengths are set
          by your admin — questions are sampled randomly from the live bank.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Supabase not configured</AlertTitle>
          <AlertDescription>
            {isAdmin ? (
              <>
                Connect Supabase and create exams in{" "}
                <Link href="/admin/exams" className="font-medium underline">
                  Admin → Exams
                </Link>{" "}
                to go live.
              </>
            ) : (
              <>Exams aren&apos;t available yet — check back soon.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isSupabaseConfigured && exams.length === 0 && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>No exams yet</AlertTitle>
          <AlertDescription>
            {isAdmin ? (
              <>
                Create an exam under{" "}
                <Link href="/admin/exams" className="font-medium underline">
                  Admin → Exams
                </Link>{" "}
                (and import questions into its section) before students can start
                one here.
              </>
            ) : (
              <>No exams are available yet — check back soon.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => (
          <ExamLengthPicker key={exam.id} exam={exam} />
        ))}
      </div>
    </div>
  );
}
