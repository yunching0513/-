import type { Codebook, CodedSegment } from "../codebook/types";

export interface CodeFrequency {
  axis_id: string;
  code: string;
  name: string;
  count: number;
  percent: number;
}

/** Per-axis code frequency, sorted desc */
export function codeFrequency(
  segments: CodedSegment[],
  codebook: Codebook,
): CodeFrequency[] {
  const total = segments.length || 1;
  const out: CodeFrequency[] = [];
  for (const axis of codebook.axes) {
    for (const code of axis.codes) {
      const count = segments.filter((s) =>
        s.applied.some((a) => a.axis_id === axis.axis_id && a.code === code.code),
      ).length;
      if (count > 0) {
        out.push({
          axis_id: axis.axis_id,
          code: code.code,
          name: code.name,
          count,
          percent: count / total,
        });
      }
    }
  }
  return out.sort((a, b) => b.count - a.count);
}

/** Heatmap: surface code × deep code co-occurrence */
export interface CoOccurrenceCell {
  surface_code: string;
  surface_name: string;
  deep_code: string;
  deep_name: string;
  count: number;
}

export function surfaceDeepCoOccurrence(
  segments: CodedSegment[],
  codebook: Codebook,
): CoOccurrenceCell[] {
  const surface = codebook.axes.find((a) => a.axis_id === "surface");
  const deep = codebook.axes.find((a) => a.axis_id === "deep");
  if (!surface || !deep) return [];
  const cells: CoOccurrenceCell[] = [];
  for (const sc of surface.codes) {
    for (const dc of deep.codes) {
      const count = segments.filter(
        (s) =>
          s.applied.some((a) => a.axis_id === "surface" && a.code === sc.code) &&
          s.applied.some((a) => a.axis_id === "deep" && a.code === dc.code),
      ).length;
      cells.push({
        surface_code: sc.code,
        surface_name: sc.name,
        deep_code: dc.code,
        deep_name: dc.name,
        count,
      });
    }
  }
  return cells;
}

/** Pattern distribution */
export interface PatternStat {
  pattern_id: string;
  name: string;
  count: number;
  percent: number;
}

export function patternDistribution(
  segments: CodedSegment[],
  codebook: Codebook,
): PatternStat[] {
  const hybrid = segments.filter((s) => s.derived?.is_hybrid_strategy);
  const total = hybrid.length || 1;
  return (codebook.patterns ?? [])
    .map((p) => {
      const count = hybrid.filter((s) => s.pattern_id === p.pattern_id).length;
      return { pattern_id: p.pattern_id, name: p.name, count, percent: count / total };
    })
    .sort((a, b) => b.count - a.count);
}

/** Speaker × code matrix */
export interface SpeakerCodeRow {
  speaker: string;
  total: number;
  byCode: Record<string, number>;
}

export function speakerByCode(segments: CodedSegment[]): SpeakerCodeRow[] {
  const map = new Map<string, SpeakerCodeRow>();
  for (const s of segments) {
    const speaker = s.speaker ?? "未指定";
    if (!map.has(speaker)) map.set(speaker, { speaker, total: 0, byCode: {} });
    const row = map.get(speaker)!;
    row.total += 1;
    for (const a of s.applied) {
      row.byCode[a.code] = (row.byCode[a.code] ?? 0) + 1;
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/** Confidence distribution */
export function confidenceDistribution(segments: CodedSegment[]) {
  const counts = { high: 0, medium: 0, low: 0, unknown: 0 };
  for (const s of segments) {
    if (s.confidence === "high") counts.high++;
    else if (s.confidence === "medium") counts.medium++;
    else if (s.confidence === "low") counts.low++;
    else counts.unknown++;
  }
  return counts;
}
