import type { CodedSegment } from "../codebook/types";
import type { StrataDocument } from "../store/strata";

export interface TimelineBucket {
  /** YYYY-MM (month bin) or YYYY (year bin) */
  bucket: string;
  /** Total segments in this bucket */
  total: number;
  surface_only: number;
  deep_only: number;
  hybrid: number;
  uncoded: number;
}

export type BucketMode = "month" | "quarter" | "year";

interface BuildOptions {
  segments: CodedSegment[];
  documents: StrataDocument[];
  mode?: BucketMode;
}

/**
 * Group coded segments into time buckets by document.source_date.
 * Documents without source_date fall back to uploaded_at (less meaningful but
 * keeps every segment somewhere on the chart).
 */
export function buildTimeline({
  segments,
  documents,
  mode,
}: BuildOptions): { buckets: TimelineBucket[]; mode: BucketMode } {
  const docDateById = new Map<string, string>();
  for (const d of documents) {
    docDateById.set(d.id, d.source_date ?? d.uploaded_at.slice(0, 10));
  }

  // Decide bucket mode automatically when not specified
  const dates = segments
    .map((s) => docDateById.get(s.document_id))
    .filter((x): x is string => !!x)
    .map((d) => new Date(d).getTime())
    .filter((t) => !Number.isNaN(t));
  const span = dates.length > 1 ? Math.max(...dates) - Math.min(...dates) : 0;
  const YEAR = 1000 * 60 * 60 * 24 * 365;
  const auto: BucketMode =
    span > YEAR * 6 ? "year" : span > YEAR * 1.5 ? "quarter" : "month";
  const useMode = mode ?? auto;

  const counters = new Map<string, TimelineBucket>();
  for (const seg of segments) {
    const date = docDateById.get(seg.document_id);
    if (!date) continue;
    const bucket = toBucket(date, useMode);
    if (!bucket) continue;
    let c = counters.get(bucket);
    if (!c) {
      c = {
        bucket,
        total: 0,
        surface_only: 0,
        deep_only: 0,
        hybrid: 0,
        uncoded: 0,
      };
      counters.set(bucket, c);
    }
    c.total += 1;
    const hasSurface = seg.applied.some((a) => a.axis_id === "surface");
    const hasDeep = seg.applied.some((a) => a.axis_id === "deep");
    if (hasSurface && hasDeep) c.hybrid += 1;
    else if (hasSurface) c.surface_only += 1;
    else if (hasDeep) c.deep_only += 1;
    else c.uncoded += 1;
  }

  const buckets = [...counters.values()].sort((a, b) =>
    a.bucket.localeCompare(b.bucket),
  );
  return { buckets, mode: useMode };
}

function toBucket(isoDate: string, mode: BucketMode): string | null {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = String(d.getFullYear());
  if (mode === "year") return yyyy;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  if (mode === "month") return `${yyyy}-${mm}`;
  // quarter
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${yyyy}-Q${q}`;
}
