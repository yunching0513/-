import type { Codebook, CodebookAxis, CodeDefinition } from "./types";

/**
 * Parse a CSV file produced by codebookToCsv() (or hand-authored with the
 * same shape) into a Codebook.
 *
 * Format expectations:
 *   - Optional metadata lines at top, each starting with "# key: value"
 *     (codebook_id, name, version, domain, methodology)
 *   - One header row with column names; required columns are `axis_id`,
 *     `code`, `name`. All others are optional.
 *   - One row per code. List columns (trigger_conditions, exclusion_conditions,
 *     examples) are pipe (|) delimited.
 *
 * Codebook-level metadata can also be supplied via a filename so users can
 * import a hand-rolled CSV with no header comments.
 */
export function parseCodebookCsv(text: string, filenameHint?: string): Codebook {
  const meta: Record<string, string> = {};
  const lines: string[] = [];

  // Strip BOM if present
  let body = text.replace(/^﻿/, "");

  // Pull off # metadata lines from the start
  const rawLines = body.split(/\r?\n/);
  let i = 0;
  while (i < rawLines.length) {
    const line = rawLines[i];
    if (line.trim().startsWith("#")) {
      const match = line.match(/^#\s*([a-z_]+)\s*:\s*(.+)$/i);
      if (match) meta[match[1].toLowerCase()] = match[2].trim();
      i++;
    } else if (line.trim() === "") {
      i++;
    } else {
      break;
    }
  }
  body = rawLines.slice(i).join("\n");

  const rows = parseCsv(body);
  if (rows.length < 2) {
    throw new Error("CSV 至少需有標題列與一筆資料列");
  }
  const headers = rows[0].map((h) => h.trim());
  const required = ["axis_id", "code", "name"];
  for (const req of required) {
    if (!headers.includes(req)) {
      throw new Error(`CSV 缺少必要欄位「${req}」`);
    }
  }
  const idx = (key: string) => headers.indexOf(key);
  const colAxisId = idx("axis_id");
  const colAxisName = idx("axis_name");
  const colCardinality = idx("axis_cardinality");
  const colColor = idx("axis_color_token");
  const colCode = idx("code");
  const colName = idx("name");
  const colDefinition = idx("definition");
  const colTriggers = idx("trigger_conditions");
  const colExclusions = idx("exclusion_conditions");
  const colExamples = idx("examples");
  const colParent = idx("parent");

  // Group rows by axis_id, preserving axis order of first appearance
  const axisOrder: string[] = [];
  const axisMap = new Map<
    string,
    { name: string; cardinality?: string; color?: string; codes: CodeDefinition[] }
  >();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip blank rows
    if (row.every((c) => c.trim() === "")) continue;
    const axisId = row[colAxisId]?.trim();
    const code = row[colCode]?.trim();
    const name = row[colName]?.trim();
    if (!axisId) throw new Error(`第 ${r + 1} 列缺少 axis_id`);
    if (!code) throw new Error(`第 ${r + 1} 列缺少 code`);
    if (!name) throw new Error(`第 ${r + 1} 列缺少 name`);

    if (!axisMap.has(axisId)) {
      axisOrder.push(axisId);
      axisMap.set(axisId, {
        name: (colAxisName >= 0 ? row[colAxisName]?.trim() : "") || axisId,
        cardinality: colCardinality >= 0 ? row[colCardinality]?.trim() : undefined,
        color: colColor >= 0 ? row[colColor]?.trim() : undefined,
        codes: [],
      });
    }
    const axis = axisMap.get(axisId)!;
    axis.codes.push({
      code,
      name,
      definition: colDefinition >= 0 ? row[colDefinition]?.trim() ?? "" : "",
      trigger_conditions: splitPipe(colTriggers >= 0 ? row[colTriggers] : ""),
      exclusion_conditions: splitPipe(colExclusions >= 0 ? row[colExclusions] : ""),
      examples: splitPipe(colExamples >= 0 ? row[colExamples] : ""),
      parent: colParent >= 0 ? row[colParent]?.trim() || undefined : undefined,
    });
  }

  const axes: CodebookAxis[] = axisOrder.map((id) => {
    const a = axisMap.get(id)!;
    const cardinality =
      a.cardinality === "multiple" ? "multiple" : ("exclusive" as const);
    return {
      axis_id: id,
      name: a.name,
      cardinality,
      color_token: a.color as CodebookAxis["color_token"],
      codes: a.codes,
    };
  });

  if (axes.length === 0) {
    throw new Error("CSV 未包含任何編碼");
  }

  const baseId =
    meta.codebook_id ||
    deriveIdFromFilename(filenameHint) ||
    `imported-${Date.now().toString(36)}`;

  return {
    codebook_id: baseId,
    name: meta.name || deriveNameFromFilename(filenameHint) || "從 CSV 匯入的編碼簿",
    domain: meta.domain || "（未指定）",
    version: meta.version || "1.0",
    methodology:
      (meta.methodology as Codebook["methodology"]) ??
      (axes.length > 1 ? "multi_axis" : "simple"),
    description: meta.description,
    source: meta.source ?? (filenameHint ? `CSV 匯入：${filenameHint}` : "CSV 匯入"),
    axes,
  };
}

function splitPipe(s: string | undefined): string[] | undefined {
  if (!s) return undefined;
  const parts = s
    .split(/\s*\|\s*/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

function deriveIdFromFilename(name?: string): string | undefined {
  if (!name) return undefined;
  return name
    .replace(/\.(csv|tsv)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveNameFromFilename(name?: string): string | undefined {
  if (!name) return undefined;
  return name.replace(/\.(csv|tsv)$/i, "");
}

/**
 * Minimal RFC 4180-ish CSV parser. Handles quoted cells with embedded
 * commas, quotes ("" → "), and newlines.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      // swallow CR; LF will close the row
      i++;
      continue;
    }
    cell += ch;
    i++;
  }
  // Flush last cell/row if not blank
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
