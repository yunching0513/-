import type { Codebook } from "./types";

/**
 * Serialize a codebook to CSV. Each row is one code; pipe-delimited
 * sub-fields hold lists (triggers, exclusions, examples). Useful for
 * editing in Excel/Numbers/Sheets before re-importing as JSON.
 */
export function codebookToCsv(cb: Codebook): string {
  const headers = [
    "axis_id",
    "axis_name",
    "axis_cardinality",
    "axis_color_token",
    "code",
    "name",
    "definition",
    "trigger_conditions",
    "exclusion_conditions",
    "examples",
    "parent",
  ];
  const rows: string[][] = [headers];

  for (const axis of cb.axes) {
    for (const code of axis.codes) {
      rows.push([
        axis.axis_id,
        axis.name,
        axis.cardinality ?? "exclusive",
        axis.color_token ?? "",
        code.code,
        code.name,
        code.definition ?? "",
        (code.trigger_conditions ?? []).join(" | "),
        (code.exclusion_conditions ?? []).join(" | "),
        (code.examples ?? []).join(" | "),
        code.parent ?? "",
      ]);
    }
  }

  // Prepend a metadata comment block (CSV-friendly: lines starting with #)
  const meta = [
    `# Strata Codebook CSV`,
    `# codebook_id: ${cb.codebook_id}`,
    `# name: ${cb.name}`,
    `# version: ${cb.version}`,
    `# domain: ${cb.domain}`,
    `# methodology: ${cb.methodology}`,
  ].join("\n");

  return meta + "\n" + rows.map(toRow).join("\n");
}

function toRow(cells: string[]): string {
  return cells.map(escapeCell).join(",");
}

function escapeCell(s: string): string {
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
