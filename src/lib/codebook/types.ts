/**
 * Strata codebook schema.
 *
 * Supports both simple hierarchical codebooks (single axis, parent/child codes)
 * and advanced multi-axis codebooks where each segment is coded across several
 * parallel dimensions (e.g. dual-layer Procedural Justice × Behavioral Economics).
 */

export type ConfidenceLevel = "high" | "medium" | "low";

export interface CodeDefinition {
  /** Stable short id, e.g. "PJ1" or "BE3" */
  code: string;
  name: string;
  definition: string;
  trigger_conditions?: string[];
  exclusion_conditions?: string[];
  examples?: string[];
  /** For hierarchical codebooks */
  parent?: string;
  /** Color (CSS color or HSL var token); falls back to axis color */
  color?: string;
}

export interface CodebookAxis {
  axis_id: string;
  name: string;
  description?: string;
  /** Theory reference / citation */
  theory_ref?: string;
  /** Token name from --surface-axis / --deep-axis / --hybrid-axis or any HSL */
  color_token?: "surface_axis" | "deep_axis" | "hybrid_axis" | string;
  codes: CodeDefinition[];
  /** "exclusive": one code per segment; "multiple": several allowed */
  cardinality?: "exclusive" | "multiple";
}

export interface DerivedCodeRule {
  code: string;
  name: string;
  description: string;
  /**
   * Human-readable rule. The runtime evaluates a small DSL:
   *   axis:<axis_id> != null AND axis:<axis_id> != null
   * For more complex rules, the rule is documented and evaluated in TS.
   */
  rule: string;
  type: "boolean" | "category";
}

export interface HybridPattern {
  pattern_id: string;
  name: string;
  surface_code?: string;
  deep_code?: string;
  description: string;
  example?: string;
  theoretical_implication?: string;
}

export interface CoTStep {
  step: number;
  title: string;
  prompt: string;
}

export interface Codebook {
  codebook_id: string;
  name: string;
  domain: string;
  version: string;
  /** "simple" | "hierarchical" | "multi_axis" */
  methodology: "simple" | "hierarchical" | "multi_axis";
  description?: string;
  authors?: string[];
  source?: string;
  axes: CodebookAxis[];
  derived_codes?: DerivedCodeRule[];
  patterns?: HybridPattern[];
  cot_workflow?: CoTStep[];
  annotations?: {
    memo?: boolean;
    confidence?: boolean;
    interweaving_analysis?: { min_chars: number; max_chars: number };
  };
  references?: string[];
}

/** A single code applied to a text segment */
export interface AppliedCode {
  axis_id: string;
  code: string;
  /** Optional sub-note attached to this specific code application */
  note?: string;
}

/** A coded text segment (the unit of analysis) */
export interface CodedSegment {
  id: string;
  document_id: string;
  /** Character offsets in the parsed plain text */
  start: number;
  end: number;
  text: string;
  /** Optional speaker attribution (e.g., "私產權人 A", "市府代表") */
  speaker?: string;
  /** Codes from each axis applied to this segment */
  applied: AppliedCode[];
  /** Free-form memo */
  memo?: string;
  /** Coder confidence */
  confidence?: ConfidenceLevel;
  /** Long-form qualitative analysis (e.g., 50–150 char interweaving description) */
  interweaving_analysis?: string;
  /** Pattern id matched by this segment, if any (e.g., "anchor_defense") */
  pattern_id?: string;
  /** Derived code values (computed) */
  derived?: Record<string, boolean | string | null>;
  created_at: string;
  updated_at: string;
  coder_id?: string;
}
