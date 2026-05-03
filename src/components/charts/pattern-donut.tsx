"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PatternStat } from "@/lib/analytics/aggregate";

const COLORS = [
  "hsl(339 90% 51%)",
  "hsl(280 70% 55%)",
  "hsl(224 76% 48%)",
  "hsl(199 89% 48%)",
  "hsl(170 70% 45%)",
  "hsl(45 90% 55%)",
  "hsl(15 85% 58%)",
  "hsl(220 10% 60%)",
];

export function PatternDonut({ data }: { data: PatternStat[] }) {
  const filtered = data.filter((d) => d.count > 0);
  if (filtered.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        尚無 Hybrid 案例
      </div>
    );
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="count"
            nameKey="name"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
          >
            {filtered.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
