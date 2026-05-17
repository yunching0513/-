import type { Codebook, CodebookAxis, CodeDefinition } from "./types";

/**
 * Validate a JSON object as a Codebook. Returns a typed Codebook or throws
 * with a human-readable error message describing what's wrong.
 *
 * Strict enough to catch typos / missing fields, lenient enough to accept
 * codebooks authored by hand without every optional field.
 */
export function parseCodebookJson(raw: unknown): Codebook {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("檔案內容不是有效的 JSON 物件");
  }
  const o = raw as Record<string, unknown>;

  must(o, "codebook_id", "string");
  must(o, "name", "string");
  must(o, "version", "string");
  must(o, "axes", "array");

  const methodology = (o.methodology as string) ?? "simple";
  if (!["simple", "hierarchical", "multi_axis"].includes(methodology)) {
    throw new Error(`methodology 必須是 simple / hierarchical / multi_axis 之一`);
  }

  const axes = (o.axes as unknown[]).map((a, i) => parseAxis(a, i));

  const codebook: Codebook = {
    codebook_id: o.codebook_id as string,
    name: o.name as string,
    domain: (o.domain as string) ?? "（未指定）",
    version: o.version as string,
    methodology: methodology as Codebook["methodology"],
    description: o.description as string | undefined,
    authors: o.authors as string[] | undefined,
    source: o.source as string | undefined,
    axes,
    derived_codes: o.derived_codes as Codebook["derived_codes"],
    patterns: o.patterns as Codebook["patterns"],
    cot_workflow: o.cot_workflow as Codebook["cot_workflow"],
    annotations: o.annotations as Codebook["annotations"],
    references: o.references as string[] | undefined,
  };

  return codebook;
}

function parseAxis(raw: unknown, idx: number): CodebookAxis {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`第 ${idx + 1} 個軸不是有效物件`);
  }
  const o = raw as Record<string, unknown>;
  must(o, "axis_id", "string", `第 ${idx + 1} 個軸`);
  must(o, "name", "string", `第 ${idx + 1} 個軸`);
  must(o, "codes", "array", `第 ${idx + 1} 個軸（${o.axis_id}）`);

  const codes = (o.codes as unknown[]).map((c, i) => parseCode(c, i, o.axis_id as string));
  return {
    axis_id: o.axis_id as string,
    name: o.name as string,
    description: o.description as string | undefined,
    theory_ref: o.theory_ref as string | undefined,
    color_token: o.color_token as CodebookAxis["color_token"],
    cardinality: (o.cardinality as CodebookAxis["cardinality"]) ?? "exclusive",
    codes,
  };
}

function parseCode(raw: unknown, idx: number, axisId: string): CodeDefinition {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`軸 ${axisId} 的第 ${idx + 1} 個 code 不是有效物件`);
  }
  const o = raw as Record<string, unknown>;
  must(o, "code", "string", `軸 ${axisId} 第 ${idx + 1} 個編碼`);
  must(o, "name", "string", `軸 ${axisId} 第 ${idx + 1} 個編碼`);
  return {
    code: o.code as string,
    name: o.name as string,
    definition: (o.definition as string) ?? "",
    trigger_conditions: o.trigger_conditions as string[] | undefined,
    exclusion_conditions: o.exclusion_conditions as string[] | undefined,
    examples: o.examples as string[] | undefined,
    parent: o.parent as string | undefined,
    color: o.color as string | undefined,
  };
}

function must(
  o: Record<string, unknown>,
  key: string,
  type: "string" | "array",
  context = "",
) {
  const v = o[key];
  if (v === undefined || v === null) {
    throw new Error(`${context ? context + " " : ""}缺少欄位「${key}」`);
  }
  if (type === "string" && typeof v !== "string") {
    throw new Error(`${context ? context + " " : ""}「${key}」必須是字串`);
  }
  if (type === "array" && !Array.isArray(v)) {
    throw new Error(`${context ? context + " " : ""}「${key}」必須是陣列`);
  }
}
