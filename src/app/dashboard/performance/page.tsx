import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  AccuracyByCategoryChart,
  ScoreTrendChart,
} from "@/components/dashboard/performance-charts";
import { getStudentPerformance } from "@/lib/student-analytics";
import { Flame, Percent, Target, TrendingUp } from "lucide-react";

export const metadata = { title: "Performance" };

export default async function PerformancePage() {
  const perf = await getStudentPerformance();
  const weakTopics = [...perf.bySection]
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);
  const improvementLabel =
    perf.improvement > 0
      ? `+${perf.improvement}%`
      : perf.improvement < 0
        ? `${perf.improvement}%`
        : "0%";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Performance
        </h2>
        <p className="text-sm text-muted-foreground">
          Track your progress, spot weak topics, and focus your revision.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Percent}
          label="Overall accuracy"
          value={`${perf.averageScore}%`}
        />
        <StatCard
          icon={TrendingUp}
          label="Improvement"
          value={improvementLabel}
          hint="first → latest session"
        />
        <StatCard
          icon={Target}
          label="Questions answered"
          value={perf.answered.toLocaleString()}
        />
        <StatCard
          icon={Flame}
          label="Study streak"
          value={`${perf.streakDays} days`}
        />
      </div>

      {perf.answered === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Complete a practice or mock session to see your performance charts
            here.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <ScoreTrendChart data={perf.scoreHistory} />
            <AccuracyByCategoryChart data={perf.bySection} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="size-4 text-primary" />
                Focus areas — your weakest topics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weakTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Not enough section data yet.
                </p>
              ) : (
                weakTopics.map((t) => (
                  <div key={t.category}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium">{t.category}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">
                          {t.accuracy}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t.answered} answered
                        </span>
                      </div>
                    </div>
                    <Progress value={t.accuracy} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
