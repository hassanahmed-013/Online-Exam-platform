import { redirect } from "next/navigation";
import { DemoRunner } from "@/components/runner/demo-runner";
import { trackDemoSession } from "@/lib/actions/demo";
import { getQuestionsBySectionIds } from "@/lib/live-questions";
import { getSections } from "@/lib/sections";
import { isSupabaseConfigured } from "@/lib/supabase/read";

export const metadata = { title: "Free demo" };

export default async function DemoPage() {
  if (!isSupabaseConfigured) redirect("/categories");

  const sections = await getSections();
  const questions = (await getQuestionsBySectionIds([]))
    .filter((q) => q.is_demo)
    .slice(0, 10);

  if (!questions.length) {
    // No flagged demo rows — send them to live sections instead of seed data.
    redirect(sections[0] ? `/categories/${sections[0].id}` : "/categories");
  }

  await trackDemoSession(questions.map((q) => q.id));

  return (
    <DemoRunner
      examName={sections[0]?.name ?? "MedPrep demo"}
      questions={questions}
    />
  );
}
