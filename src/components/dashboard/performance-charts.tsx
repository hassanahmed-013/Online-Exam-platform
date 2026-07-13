"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryPerformance, ScorePoint } from "@/lib/types";

const axisStyle = {
  fontSize: 12,
  fill: "var(--muted-foreground)",
};

function barColor(accuracy: number) {
  if (accuracy >= 70) return "var(--chart-2)";
  if (accuracy >= 50) return "var(--chart-3)";
  return "var(--destructive)";
}

export function ScoreTrendChart({ data }: { data: ScorePoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score over time</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={axisStyle} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              formatter={(v) => [`${v}%`, "Score"]}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              fill="url(#scoreFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function AccuracyByCategoryChart({
  data,
}: {
  data: CategoryPerformance[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accuracy by category</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 20, right: 16 }}
            barCategoryGap={8}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={axisStyle} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="category"
              width={110}
              tick={axisStyle}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              formatter={(v) => [`${v}%`, "Accuracy"]}
            />
            <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>
              {data.map((d) => (
                <Cell key={d.category} fill={barColor(d.accuracy)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
