"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { CodeFrequency } from "@/lib/analytics/aggregate";

export function CodeFrequencyChart({ data }: { data: CodeFrequency[] }) {
  const formatted = data.map((d) => ({
    label: `${d.code} ${d.name}`,
    count: d.count,
    axis_id: d.axis_id,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={formatted} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            dataKey="label"
            type="category"
            width={150}
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))" }}
            contentStyle={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {formatted.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.axis_id === "surface"
                    ? "hsl(var(--surface-axis))"
                    : "hsl(var(--deep-axis))"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
