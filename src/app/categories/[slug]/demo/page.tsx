import { notFound, redirect } from "next/navigation";
import { DemoRunner } from "@/components/runner/demo-runner";
import { trackDemoSession } from "@/lib/actions/demo";
import { getQuestionsBySectionIds } from "@/lib/live-questions";
import { getSectionById } from "@/lib/sections";

export const metadata = { title: "Free demo" };

export default async function CategoryDemoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const section = await getSectionById(slug);
  if (!section) notFound();

  const all = await getQuestionsBySectionIds([section.id]);
  const questions = all.filter((q) => q.is_demo).slice(0, 10);
  // No flagged demo rows — send them into a short live practice instead of mock data.
  if (!questions.length) {
    redirect(`/exam/run?mode=practice&cats=${section.id}`);
  }

  await trackDemoSession(questions.map((q) => q.id));

  return (
    <DemoRunner
      examName={section.name}
      questions={questions}
      signupHref={`/signup?next=/categories/${section.id}`}
    />
  );
}
