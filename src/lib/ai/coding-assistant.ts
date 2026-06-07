import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Codebook } from "../codebook/types";

/**
 * AI-assisted coding using Claude with the codebook's Chain-of-Thought workflow.
 *
 * Tier mapping:
 *   - free      → Claude Haiku 4.5
 *   - pro       → Claude Sonnet 4.6
 *   - institute → Claude Opus 4.8
 */
export type Tier = "free" | "pro" | "institute";

const MODEL: Record<Tier, string> = {
  free: "claude-haiku-4-5-20251001",
  pro: "claude-sonnet-4-6",
  institute: "claude-opus-4-8",
};

const MODEL_LABEL: Record<Tier, string> = {
  free: "Claude Haiku 4.5",
  pro: "Claude Sonnet 4.6",
  institute: "Claude Opus 4.8",
};

export interface SuggestionRequest {
  text: string;
  speaker?: string;
  codebook: Codebook;
  tier?: Tier;
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local before using AI assist.",
    );
  }
  const client = new Anthropic({ apiKey });
  const tier: Tier = req.tier ?? "free";

  // System prompt incorporates the codebook's CoT workflow + axis definitions.
  // We use prompt caching on the codebook block so repeated calls are cheap.
  const codebookBlock = renderCodebookBlock(req.codebook);

  let message;
  try {
    message = await client.messages.create({
    model: MODEL[tier],
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: "你是一位質性研究的編碼助手。嚴格依使用者提供的編碼簿與工作流程，逐步推理後輸出 JSON。輸出語言為繁體中文。",
      },
      {
        type: "text",
        text: codebookBlock,
        // Cache the (large, stable) codebook block so repeat calls are cheap.
        // Cast required because the typed shape varies across SDK minor versions.
        ...({ cache_control: { type: "ephemeral" } } as Record<string, unknown>),
      },
    ] as Anthropic.TextBlockParam[],
    messages: [
      {
        role: "user",
        content: `請為下列文本片段提供編碼建議。

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
}`,
      },
    ],
  });
  } catch (err) {
    throw translateAnthropicError(err, tier);
  }

  const block = message.content.find((c) => c.type === "text");
  const raw = block && "text" in block ? block.text : "";
  const json = extractJson(raw);
  return json as SuggestionResult;
}

/**
 * Map Anthropic SDK errors to user-readable messages with concrete next steps.
 * Especially helps non-engineer users understand 403s ("your key can't use
 * this model") and 429s ("you hit a rate limit").
 */
function translateAnthropicError(err: unknown, tier: Tier): Error {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status)
      : null;
  const raw = err instanceof Error ? err.message : String(err);

  if (status === 401) {
    return new Error(
      "ANTHROPIC_API_KEY 無效或已停用。請至 console.anthropic.com 確認 API key。",
    );
  }
  if (status === 403) {
    return new Error(
      `你的 API key 沒有權限使用 ${MODEL_LABEL[tier]}（${MODEL[tier]}）。可能原因：` +
        `(1) Anthropic 帳戶尚未升級到對應方案；` +
        `(2) 該模型在你的地區或組織內被限制。` +
        `建議到「設定」改用 Haiku 4.5（Free tier 可用），或到 console.anthropic.com 升級方案。`,
    );
  }
  if (status === 429) {
    return new Error(
      "Anthropic API 速率限制（429）。請稍候 30–60 秒再試；批次預編碼可降低並行數或縮小範圍。",
    );
  }
  if (status === 529) {
    return new Error("Anthropic 服務暫時過載（529）。請稍後重試。");
  }
  if (status && status >= 500) {
    return new Error(`Anthropic 伺服器錯誤（${status}）。請稍後重試。`);
  }
  // Fallback: keep raw message but prefix for clarity
  return new Error(`AI 呼叫失敗：${raw}`);
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
  if (start === -1 || end === -1) throw new Error("AI response did not contain JSON");
  return JSON.parse(s.slice(start, end + 1));
}
