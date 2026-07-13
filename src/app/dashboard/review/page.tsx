import { ReviewList } from "@/components/dashboard/review-list";
import { getStudentReviewItems } from "@/lib/student-analytics";

export const metadata = { title: "Review questions" };

export default async function ReviewPage() {
  const { items, categories } = await getStudentReviewItems();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Review questions & key concepts
        </h2>
        <p className="text-sm text-muted-foreground">
          Revisit questions you&apos;ve answered — missed ones first — with full
          context from your live attempts.
        </p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No review items yet. Finish a practice or exam session and your
          answers will show up here.
        </div>
      ) : (
        <ReviewList items={items} categories={categories} />
      )}
    </div>
  );
}
