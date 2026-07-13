import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { SignupChart } from "@/components/admin/signup-chart";
import { getAdminOverview, hasServiceRole } from "@/lib/admin-data";
import { isSupabaseConfigured } from "@/lib/supabase/read";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  CreditCard,
  ListChecks,
  TriangleAlert,
  TrendingUp,
  Users,
} from "lucide-react";

export const metadata = { title: "Admin overview" };

function formatCount(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString();
}

export default async function AdminOverviewPage() {
  const configured = isSupabaseConfigured && hasServiceRole;
  const { kpis, signupTrend, mostMissed } = configured
    ? await getAdminOverview()
    : {
        kpis: {
          totalUsers: null,
          activeSubs: null,
          dau: null,
          mau: null,
          questionsAnswered: null,
        },
        signupTrend: [],
        mostMissed: [],
      };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Platform overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Key metrics across users, subscriptions and content.
        </p>
      </div>

      {!configured && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Live metrics need Supabase</AlertTitle>
          <AlertDescription>
            Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
            SUPABASE_SERVICE_ROLE_KEY to load real overview numbers.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Users}
          label="Total users"
          value={formatCount(kpis.totalUsers)}
        />
        <StatCard
          icon={CreditCard}
          label="Active subscriptions"
          value={formatCount(kpis.activeSubs)}
        />
        <StatCard
          icon={Activity}
          label="Daily active users"
          value={formatCount(kpis.dau)}
        />
        <StatCard
          icon={Activity}
          label="Monthly active users"
          value={formatCount(kpis.mau)}
        />
        <StatCard
          icon={ListChecks}
          label="Questions answered"
          value={formatCount(kpis.questionsAnswered)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              Sign-ups (last 6 months)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {signupTrend.length > 0 && signupTrend.some((p) => p.signups > 0) ? (
              <SignupChart data={signupTrend} />
            ) : signupTrend.length > 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No sign-ups in the last 6 months yet.
              </p>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {configured ? "No sign-ups in the last 6 months yet." : "Sign-up chart unavailable."}
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
