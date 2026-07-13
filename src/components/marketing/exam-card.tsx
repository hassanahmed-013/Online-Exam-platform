import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Exam } from "@/lib/types";
import { PlayCircle } from "lucide-react";

const GRADIENTS: Record<string, string> = {
  mdcat: "from-teal-500/90 to-emerald-500/90",
  biology: "from-emerald-500/90 to-lime-500/90",
  chemistry: "from-sky-500/90 to-indigo-500/90",
  physics: "from-violet-500/90 to-fuchsia-500/90",
};

export function ExamCard({ exam }: { exam: Exam }) {
  const gradient = GRADIENTS[exam.slug] ?? GRADIENTS.mdcat;

  return (
    <Card className="group flex flex-col p-0 transition-shadow hover:shadow-lg">
      {/* Cover */}
      <div
        className={cn(
          "relative flex h-32 items-end bg-gradient-to-br p-4",
          gradient
        )}
      >
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:16px_16px]" />
        <span className="relative text-2xl font-semibold text-white drop-shadow-sm">
          {exam.name}
        </span>
        {exam.slug === "mdcat" && (
          <Badge className="absolute right-3 top-3 bg-white/90 text-teal-700">
            Full bank
          </Badge>
        )}
      </div>

      <CardHeader className="pt-4">
        <CardTitle>{exam.name} Question Bank</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="flex-1 text-sm text-muted-foreground">
          {exam.description}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/demo/${exam.slug}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "flex-1 gap-1.5"
            )}
          >
            <PlayCircle className="size-4" />
            Try demo
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "lg" }), "flex-1")}
          >
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
