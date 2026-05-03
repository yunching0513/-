"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ConfidenceBars({
  data,
}: {
  data: { high: number; medium: number; low: number; unknown: number };
}) {
  const rows = [
    { label: "高", value: data.high, color: "hsl(143 64% 45%)" },
    { label: "中", value: data.medium, color: "hsl(45 90% 55%)" },
    { label: "低", value: data.low, color: "hsl(0 84% 60%)" },
    { label: "未標", value: data.unknown, color: "hsl(220 10% 60%)" },
  ];

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
          <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
