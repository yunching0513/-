"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimelineBucket } from "@/lib/analytics/timeline";

/**
 * Stacked bar timeline showing segment volume per time bucket, split by
 * surface-only / deep-only / hybrid / uncoded categories.
 */
export function TimelineChart({ buckets }: { buckets: TimelineBucket[] }) {
  if (buckets.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
        尚無含日期的編碼資料
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={buckets} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="bucket"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" iconSize={8} />
          <Bar
            dataKey="surface_only"
            name="僅表層"
            stackId="a"
            fill="hsl(var(--surface-axis))"
          />
          <Bar
            dataKey="deep_only"
            name="僅深層"
            stackId="a"
            fill="hsl(var(--deep-axis))"
          />
          <Bar dataKey="hybrid" name="Hybrid" stackId="a" fill="hsl(var(--hybrid-axis))" />
          <Bar
            dataKey="uncoded"
            name="未編碼"
            stackId="a"
            fill="hsl(var(--muted-foreground) / 0.4)"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
