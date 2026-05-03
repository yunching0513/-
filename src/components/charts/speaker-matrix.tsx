"use client";

import type { Codebook } from "@/lib/codebook/types";
import type { SpeakerCodeRow } from "@/lib/analytics/aggregate";

export function SpeakerMatrix({
  data,
  codebook,
}: {
  data: SpeakerCodeRow[];
  codebook: Codebook;
}) {
  const allCodes = codebook.axes.flatMap((axis) =>
    axis.codes.map((c) => ({ axis_id: axis.axis_id, code: c.code, name: c.name })),
  );
  const max = Math.max(
    1,
    ...data.flatMap((row) => allCodes.map((c) => row.byCode[c.code] ?? 0)),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="px-2 pb-1 text-left text-muted-foreground">發言者</th>
            {allCodes.map((c) => (
              <th key={c.code} className="pb-1 font-mono text-[10px]">
                <span
                  style={{
                    color: c.axis_id === "surface" ? "hsl(var(--surface-axis))" : "hsl(var(--deep-axis))",
                  }}
                >
                  {c.code}
                </span>
              </th>
            ))}
            <th className="pb-1 text-right text-muted-foreground">合計</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.speaker}>
              <th className="whitespace-nowrap px-2 text-left font-medium">{row.speaker}</th>
              {allCodes.map((c) => {
                const v = row.byCode[c.code] ?? 0;
                const intensity = v / max;
                return (
                  <td
                    key={c.code}
                    className="h-7 w-7 rounded text-center font-mono"
                    style={{
                      background:
                        v === 0
                          ? "transparent"
                          : c.axis_id === "surface"
                            ? `hsl(var(--surface-axis) / ${0.1 + intensity * 0.5})`
                            : `hsl(var(--deep-axis) / ${0.1 + intensity * 0.5})`,
                      color: intensity > 0.4 ? "white" : "hsl(var(--foreground))",
                    }}
                  >
                    {v || ""}
                  </td>
                );
              })}
              <td className="px-2 text-right font-mono font-semibold">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
