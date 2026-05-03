import * as XLSX from "xlsx";
import type { Codebook, CodedSegment } from "../codebook/types";

/**
 * Build an .xlsx workbook with three sheets:
 *   - Segments: one row per coded segment, with columns for each axis
 *   - Codebook: flattened code list
 *   - Patterns: pattern definitions (if multi-axis codebook with patterns)
 */
export function buildExcelWorkbook(
  segments: CodedSegment[],
  codebook: Codebook,
  documentName?: string,
): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  // Segments sheet
  const segmentRows = segments.map((s) => {
    const row: Record<string, unknown> = {
      id: s.id,
      document: documentName ?? s.document_id,
      speaker: s.speaker ?? "",
      start: s.start,
      end: s.end,
      text: s.text,
      confidence: s.confidence ?? "",
      memo: s.memo ?? "",
      interweaving_analysis: s.interweaving_analysis ?? "",
      pattern: s.pattern_id ?? "",
    };
    for (const axis of codebook.axes) {
      const code = s.applied.find((a) => a.axis_id === axis.axis_id)?.code ?? "";
      row[`${axis.axis_id}_code`] = code;
      const def = axis.codes.find((c) => c.code === code);
      row[`${axis.axis_id}_name`] = def?.name ?? "";
    }
    for (const dc of codebook.derived_codes ?? []) {
      row[dc.code] = s.derived?.[dc.code] ?? "";
    }
    return row;
  });
  const wsSegments = XLSX.utils.json_to_sheet(segmentRows);
  XLSX.utils.book_append_sheet(wb, wsSegments, "Segments");

  // Codebook sheet
  const codeRows = codebook.axes.flatMap((axis) =>
    axis.codes.map((c) => ({
      axis: axis.name,
      axis_id: axis.axis_id,
      code: c.code,
      name: c.name,
      definition: c.definition,
      trigger_conditions: (c.trigger_conditions ?? []).join(" | "),
      exclusion_conditions: (c.exclusion_conditions ?? []).join(" | "),
      examples: (c.examples ?? []).join(" | "),
      parent: c.parent ?? "",
    })),
  );
  const wsCodebook = XLSX.utils.json_to_sheet(codeRows);
  XLSX.utils.book_append_sheet(wb, wsCodebook, "Codebook");

  // Patterns sheet (optional)
  if (codebook.patterns && codebook.patterns.length > 0) {
    const patternRows = codebook.patterns.map((p) => ({
      pattern_id: p.pattern_id,
      name: p.name,
      surface_code: p.surface_code ?? "",
      deep_code: p.deep_code ?? "",
      description: p.description,
      example: p.example ?? "",
      theoretical_implication: p.theoretical_implication ?? "",
    }));
    const wsPatterns = XLSX.utils.json_to_sheet(patternRows);
    XLSX.utils.book_append_sheet(wb, wsPatterns, "Patterns");
  }

  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
