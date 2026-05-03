"use client";

import { useMemo } from "react";
import type { CoOccurrenceCell } from "@/lib/analytics/aggregate";

/**
 * Lightweight SVG Sankey diagram (no dependency on d3-sankey).
 * Surface codes on the left, deep codes on the right; ribbon thickness = count.
 */
export function HybridSankey({ data }: { data: CoOccurrenceCell[] }) {
  const { nodes, links, w, h } = useMemo(() => buildLayout(data), [data]);

  if (links.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        尚無 Hybrid 資料可繪製
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        {links.map((link, i) => (
          <path
            key={i}
            d={link.path}
            fill="none"
            stroke="hsl(var(--hybrid-axis))"
            strokeOpacity={0.35}
            strokeWidth={link.width}
          />
        ))}
        {nodes.map((n) => (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={12}
              height={n.height}
              fill={n.side === "L" ? "hsl(var(--surface-axis))" : "hsl(var(--deep-axis))"}
              rx={2}
            />
            <text
              x={n.side === "L" ? n.x - 6 : n.x + 18}
              y={n.y + n.height / 2}
              fontSize="11"
              textAnchor={n.side === "L" ? "end" : "start"}
              dominantBaseline="middle"
              fill="hsl(var(--foreground))"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function buildLayout(cells: CoOccurrenceCell[]) {
  const filtered = cells.filter((c) => c.count > 0);
  const sIds = [...new Set(filtered.map((c) => c.surface_code))];
  const dIds = [...new Set(filtered.map((c) => c.deep_code))];

  const w = 520;
  const h = Math.max(220, Math.max(sIds.length, dIds.length) * 50);
  const lx = 110;
  const rx = w - 110;
  const minBlockH = 22;

  const sTotals = sIds.map((s) =>
    filtered.filter((c) => c.surface_code === s).reduce((a, c) => a + c.count, 0),
  );
  const dTotals = dIds.map((d) =>
    filtered.filter((c) => c.deep_code === d).reduce((a, c) => a + c.count, 0),
  );

  const totalCount = sTotals.reduce((a, b) => a + b, 0);
  const yScale = (h - 40) / totalCount;

  const nodes: {
    id: string;
    side: "L" | "R";
    x: number;
    y: number;
    height: number;
    label: string;
  }[] = [];

  let y = 20;
  const sNodes = sIds.map((id, i) => {
    const height = Math.max(minBlockH, sTotals[i] * yScale);
    const node = {
      id: `s-${id}`,
      side: "L" as const,
      x: lx,
      y,
      height,
      label: cellsLookup(filtered, id, "surface")?.surface_name ?? id,
    };
    y += height + 8;
    nodes.push(node);
    return { id, y0: node.y, height: node.height };
  });

  y = 20;
  const dNodes = dIds.map((id, i) => {
    const height = Math.max(minBlockH, dTotals[i] * yScale);
    const node = {
      id: `d-${id}`,
      side: "R" as const,
      x: rx,
      y,
      height,
      label: cellsLookup(filtered, id, "deep")?.deep_name ?? id,
    };
    y += height + 8;
    nodes.push(node);
    return { id, y0: node.y, height: node.height };
  });

  // Build links with cumulative offsets
  const sUsed = new Map<string, number>();
  const dUsed = new Map<string, number>();
  const links: { path: string; width: number }[] = [];

  for (const cell of filtered) {
    const sNode = sNodes.find((n) => n.id === cell.surface_code)!;
    const dNode = dNodes.find((n) => n.id === cell.deep_code)!;
    const linkH = Math.max(2, cell.count * yScale);
    const sOff = sUsed.get(cell.surface_code) ?? 0;
    const dOff = dUsed.get(cell.deep_code) ?? 0;
    sUsed.set(cell.surface_code, sOff + linkH);
    dUsed.set(cell.deep_code, dOff + linkH);

    const x0 = lx + 12;
    const x1 = rx;
    const y0 = sNode.y0 + sOff + linkH / 2;
    const y1 = dNode.y0 + dOff + linkH / 2;
    const cx0 = x0 + (x1 - x0) * 0.4;
    const cx1 = x0 + (x1 - x0) * 0.6;
    links.push({
      path: `M ${x0} ${y0} C ${cx0} ${y0}, ${cx1} ${y1}, ${x1} ${y1}`,
      width: linkH,
    });
  }

  return { nodes, links, w, h };
}

function cellsLookup(
  cells: CoOccurrenceCell[],
  code: string,
  side: "surface" | "deep",
): CoOccurrenceCell | undefined {
  return cells.find((c) => (side === "surface" ? c.surface_code === code : c.deep_code === code));
}
