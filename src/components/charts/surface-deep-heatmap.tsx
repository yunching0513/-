"use client";

import type { CoOccurrenceCell } from "@/lib/analytics/aggregate";
import { useMemo } from "react";

export function SurfaceDeepHeatmap({ data }: { data: CoOccurrenceCell[] }) {
  const { surfaceCodes, deepCodes, max } = useMemo(() => {
    const sSet = new Map<string, string>();
    const dSet = new Map<string, string>();
    let max = 0;
    for (const c of data) {
      sSet.set(c.surface_code, c.surface_name);
      dSet.set(c.deep_code, c.deep_name);
      if (c.count > max) max = c.count;
    }
    return {
      surfaceCodes: [...sSet.entries()],
      deepCodes: [...dSet.entries()],
      max,
    };
  }, [data]);

  function getCell(s: string, d: string) {
    return data.find((x) => x.surface_code === s && x.deep_code === d)?.count ?? 0;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th />
            {deepCodes.map(([code, name]) => (
              <th key={code} className="px-1 pb-1 font-medium text-deep_axis">
                <div className="font-mono">{code}</div>
                <div className="text-[10px] text-muted-foreground">{name.slice(0, 5)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {surfaceCodes.map(([s, sName]) => (
            <tr key={s}>
              <th className="pr-2 text-right font-medium text-surface_axis">
                <div className="font-mono">{s}</div>
                <div className="text-[10px] text-muted-foreground">{sName.slice(0, 5)}</div>
              </th>
              {deepCodes.map(([d]) => {
                const v = getCell(s, d);
                const intensity = max ? v / max : 0;
                return (
                  <td
                    key={d}
                    className="h-12 w-12 rounded text-center font-mono text-xs"
                    style={{
                      background: `hsl(var(--hybrid-axis) / ${0.06 + intensity * 0.6})`,
                      color: intensity > 0.5 ? "white" : "hsl(var(--foreground))",
                    }}
                    title={`${s} × ${d}: ${v}`}
                  >
                    {v || ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
