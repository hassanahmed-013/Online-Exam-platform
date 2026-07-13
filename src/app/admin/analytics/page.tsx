import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/dashboard/stat-card";
import { SignupChart } from "@/components/admin/signup-chart";
import { AccuracyByCategoryChart } from "@/components/dashboard/performance-charts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAdminAnalytics, hasServiceRole } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Activity, Percent, TrendingUp, TriangleAlert, Users } from "lucide-react";

export const metadata = { title: "Admin · Analytics" };

function formatCount(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString();
}

export default async function AdminAnalyticsPage() {
  const configured = isSupabaseConfigured && hasServiceRole;
  const { kpis, signupTrend, categoryPerformance, mostMissed } = configured
    ? await getAdminAnalytics()
    : {
        kpis: {
          mau: null,
          dau: null,
          demoConversion: null,
          activeSubs: null,
        },
        signupTrend: [],
        categoryPerformance: [],
        mostMissed: [],
      };

  const mostAttempted = categoryPerformance.slice(0, 5);
  const topAnswered = mostAttempted[0]?.answered ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Platform analytics
        </h2>
        <p className="text-sm text-muted-foreground">
          Engagement, conversion and content performance.
        </p>
      </div>

      {!configured && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Live analytics need Supabase</AlertTitle>
          <AlertDescription>
            Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
            SUPABASE_SERVICE_ROLE_KEY to load real platform metrics.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="MAU" value={formatCount(kpis.mau)} />
        <StatCard icon={Activity} label="DAU" value={formatCount(kpis.dau)} />
        <StatCard
          icon={Percent}
          label="Demo → signup"
          value={
            kpis.demoConversion != null ? `${kpis.demoConversion}%` : "—"
          }
        />
        <StatCard
          icon={TrendingUp}
          label="Active subs"
          value={formatCount(kpis.activeSubs)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Signup funnel (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {signupTrend.length > 0 && signupTrend.some((p) => p.signups > 0) ? (
              <SignupChart data={signupTrend} />
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {configured
                  ? "No sign-ups in the last 6 months yet."
                  : "Sign-up chart unavailable."}
              </p>
            )}
          </CardContent>
        </Card>
        {categoryPerformance.length > 0 ? (
          <AccuracyByCategoryChart data={categoryPerformance} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Accuracy by category</CardTitle>
            </CardHeader>
            <CardContent className="flex h-72 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {configured
                  ? "No answered questions yet — accuracy appears once students practice."
                  : "Accuracy chart unavailable."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Most-attempted categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mostAttempted.length > 0 ? (
              mostAttempted.map((c) => (
                <div key={c.category}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{c.category}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.answered.toLocaleString()} answered
                    </span>
                  </div>
                  <Progress
                    value={topAnswered > 0 ? (c.answered / topAnswered) * 100 : 0}
                  />
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {configured
                  ? "No category attempts recorded yet."
                  : "Most-attempted list unavailable."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most-missed questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mostMissed.length > 0 ? (
              mostMissed.map((q) => (
                <div
                  key={q.stem}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{q.stem}</div>
                    <div className="text-xs text-muted-foreground">{q.category}</div>
                  </div>
                  <Badge variant="destructive">{q.missRate}% missed</Badge>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {configured
                  ? "Need at least 20 attempts per question before rankings appear."
                  : "Most-missed list unavailable."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
