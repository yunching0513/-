import "server-only";
import type { Codebook } from "../codebook/types";
import {
  complete,
  translateError,
  defaultModel,
  type Provider,
} from "./providers";

/**
 * AI-assisted coding. Dispatches to the chosen provider (Anthropic / OpenAI /
 * Gemini) with the codebook's Chain-of-Thought workflow as a system prompt.
 *
 * The same prompt works across providers — all three modern models follow
 * structured reasoning when asked.
 */

export interface SuggestionRequest {
  text: string;
  speaker?: string;
  codebook: Codebook;
  /** Provider override; defaults to anthropic */
  provider?: Provider;
  /** Model override; defaults to provider's default model */
  model?: string;
  /** User-provided API key. If absent, server falls back to its env var. */
  api_key?: string;
}

export interface SuggestionResult {
  reasoning: string[];
  suggested: { axis_id: string; code: string; rationale: string }[];
  pattern_id?: string;
  interweaving_analysis?: string;
  is_hybrid_strategy: boolean;
  confidence: "high" | "medium" | "low";
}

export async function suggestCoding(
  req: SuggestionRequest,
): Promise<SuggestionResult> {
  const provider: Provider = req.provider ?? "anthropic";
  const model = req.model ?? defaultModel(provider);
  const key = req.api_key ?? envKeyFor(provider);

  if (!key) {
    throw new Error(
      `未提供 ${provider} 的 API key。請至「設定」貼入你的 key，` +
        `或在伺服器設 ${envVarName(provider)}。`,
    );
  }

  const system =
    "你是一位質性研究的編碼助手。嚴格依使用者提供的編碼簿與工作流程，逐步推理後輸出 JSON。輸出語言為繁體中文。" +
    "\n\n" +
    renderCodebookBlock(req.codebook);

  const user = `請為下列文本片段提供編碼建議。

發言者：${req.speaker ?? "（未指定）"}
文本：「${req.text}」

請依編碼簿的 Chain-of-Thought 五步驟逐步推理，最後僅輸出單一 JSON 物件，schema：
{
  "reasoning": [string, string, string, string, string],
  "suggested": [{"axis_id": string, "code": string, "rationale": string}],
  "pattern_id": string | null,
  "interweaving_analysis": string | null,
  "is_hybrid_strategy": boolean,
  "confidence": "high" | "medium" | "low"
}`;

  let raw: string;
  try {
    raw = await complete({
      provider,
      api_key: key,
      model,
      system,
      user,
      max_tokens: 2500,
    });
  } catch (err) {
    throw translateError(err, provider, model);
  }

  return extractJson(raw) as SuggestionResult;
}

function envKeyFor(provider: Provider): string | undefined {
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY;
  if (provider === "openai") return process.env.OPENAI_API_KEY;
  if (provider === "gemini") return process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (provider === "taide") return process.env.TAIDE_API_KEY ?? process.env.NCHC_API_KEY;
}

function envVarName(provider: Provider): string {
  if (provider === "anthropic") return "ANTHROPIC_API_KEY";
  if (provider === "openai") return "OPENAI_API_KEY";
  if (provider === "gemini") return "GOOGLE_API_KEY";
  return "TAIDE_API_KEY";
}

function renderCodebookBlock(cb: Codebook): string {
  const axes = cb.axes
    .map((a) => {
      const codes = a.codes
        .map(
          (c) =>
            `- ${c.code} ${c.name}：${c.definition}\n  觸發：${(c.trigger_conditions ?? []).join("; ") || "—"}\n  排除：${(c.exclusion_conditions ?? []).join("; ") || "—"}`,
        )
        .join("\n");
      return `## ${a.name}\n${codes}`;
    })
    .join("\n\n");
  const cot = (cb.cot_workflow ?? [])
    .map((s) => `${s.step}. ${s.title}：${s.prompt}`)
    .join("\n");
  const patterns = (cb.patterns ?? [])
    .map(
      (p) =>
        `- ${p.name}（${p.surface_code ?? "?"} × ${p.deep_code ?? "?"}）：${p.description}`,
    )
    .join("\n");
  return `# 編碼簿：${cb.name} v${cb.version}\n${cb.description ?? ""}\n\n${axes}\n\n## 工作流程\n${cot}\n\n## Hybrid 模式樣板\n${patterns}`;
}

function extractJson(s: string): unknown {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI 回應未包含可解析的 JSON");
  return JSON.parse(s.slice(start, end + 1));
}

// Backward-compat: keep the old `Tier` type so existing imports compile.
// Tier maps to provider + default model for Strata-managed (env-var) usage.
export type Tier = "free" | "pro" | "institute";
