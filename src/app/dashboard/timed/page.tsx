import { TimedPresetsPanel } from "@/components/dashboard/timed-presets-panel";
import { getSections } from "@/lib/sections";

export const metadata = { title: "Fixed sets & timed tests" };

export default async function TimedPage() {
  const sections = await getSections();
  const sectionIds = sections
    .filter((s) => (s.question_count ?? 0) > 0)
    .map((s) => s.id);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Fixed sets & timed tests
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a timed set instantly from the live bank, or build a custom one
          in the question bank. Named exams with admin lengths live under Exams.
        </p>
      </div>

      <TimedPresetsPanel sectionIds={sectionIds} />
    </div>
  );
}
