"use client";

import { BUILTIN_CODEBOOKS } from "../codebook/builtin";
import type { Codebook } from "../codebook/types";

/**
 * Client-direct AI calls — bypass Strata's backend entirely. Three reasons:
 *   (1) Vercel Hobby region lock (Hong Kong → Google blocks Gemini)
 *   (2) Privacy: user's BYO API key never touches Strata server
 *   (3) Tauri desktop app: no server at all, must call provider APIs directly
 *
 * Supports all four providers. Each uses its own auth scheme and SDK quirk.
 */

export type Provider = "anthropic" | "openai" | "gemini" | "taide";

export interface SuggestionResult {
  reasoning: string[];
  suggested: { axis_id: string; code: string; rationale: string }[];
  pattern_id?: string;
  interweaving_analysis?: string;
  is_hybrid_strategy: boolean;
  confidence: "high" | "medium" | "low";
}

export function shouldRouteDirect(
  provider: string | undefined,
  apiKey: string | undefined,
): boolean {
  return !!provider && !!apiKey;
}

export async function suggestDirect(args: {
  text: string;
  speaker?: string;
  codebook_id: string;
  user_codebooks?: Codebook[];
  provider: Provider;
  model: string;
  api_key: string;
}): Promise<SuggestionResult> {
  const cb =
    BUILTIN_CODEBOOKS.find((c) => c.codebook_id === args.codebook_id) ??
    args.user_codebooks?.find((c) => c.codebook_id === args.codebook_id);
  if (!cb) throw new Error(`Codebook not found: ${args.codebook_id}`);

  const system = buildSystemPrompt(cb);
  const user = buildUserPrompt(args.text, args.speaker);

  const raw = await complete({
    provider: args.provider,
    api_key: args.api_key,
    model: args.model,
    system,
    user,
    max_tokens: 1024,
  });

  return extractJson(raw) as SuggestionResult;
}

export async function testDirect(args: {
  provider: Provider;
  api_key: string;
  model: string;
}): Promise<{ reply: string }> {
  const reply = await complete({
    provider: args.provider,
    api_key: args.api_key,
    model: args.model,
    system: "Reply with a single word: pong",
    user: "ping",
    max_tokens: 16,
  });
  return { reply };
}

/* ----- Provider dispatch ----- */

interface CompleteArgs {
  provider: Provider;
  api_key: string;
  model: string;
  system: string;
  user: string;
  max_tokens: number;
}

async function complete(args: CompleteArgs): Promise<string> {
  try {
    switch (args.provider) {
      case "anthropic":
        return await callAnthropic(args);
      case "openai":
        return await callOpenAI(args);
      case "gemini":
        return await callGemini(args);
      case "taide":
        return await callTaide(args);
    }
  } catch (err) {
    throw translateError(err, args.provider, args.model);
  }
}

async function callAnthropic(args: CompleteArgs): Promise<string> {
  // Anthropic SDK supports browser if dangerouslyAllowBrowser: true + dangerous-direct-browser-access header
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({
    apiKey: args.api_key,
    dangerouslyAllowBrowser: true,
    defaultHeaders: { "anthropic-dangerous-direct-browser-access": "true" },
  });
  const res = await client.messages.create({
    model: args.model,
    max_tokens: args.max_tokens,
    system: args.system,
    messages: [{ role: "user", content: args.user }],
  });
  const block = res.content.find((c) => c.type === "text");
  return block && "text" in block ? block.text : "";
}

async function callOpenAI(args: CompleteArgs): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: args.api_key, dangerouslyAllowBrowser: true });
  const res = await client.chat.completions.create({
    model: args.model,
    max_completion_tokens: args.max_tokens,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

async function callGemini(args: CompleteArgs): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: args.api_key });
  const res = await ai.models.generateContent({
    model: args.model,
    contents: args.user,
    config: {
      systemInstruction: args.system,
      maxOutputTokens: args.max_tokens,
    },
  });
  return res.text ?? "";
}

async function callTaide(args: CompleteArgs): Promise<string> {
  // TAIDE via NCHC — OpenAI-compatible REST with x-api-key header.
  // Hand-roll the fetch (SDK doesn't allow custom auth header).
  const res = await fetch(
    "https://portal.genai.nchc.org.tw/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": args.api_key,
      },
      body: JSON.stringify({
        model: args.model,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        max_tokens: args.max_tokens,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status} ${body}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/* ----- prompt building & utilities ----- */

function buildSystemPrompt(cb: Codebook): string {
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
  return (
    "你是一位質性研究的編碼助手。嚴格依使用者提供的編碼簿與工作流程，逐步推理後輸出 JSON。輸出語言為繁體中文。\n\n" +
    `# 編碼簿：${cb.name} v${cb.version}\n${cb.description ?? ""}\n\n${axes}\n\n## 工作流程\n${cot}\n\n## Hybrid 模式樣板\n${patterns}`
  );
}

function buildUserPrompt(text: string, speaker?: string): string {
  return `請為下列文本片段提供編碼建議。

發言者：${speaker ?? "（未指定）"}
文本：「${text}」

請依編碼簿的 Chain-of-Thought 五步驟逐步推理，最後僅輸出單一 JSON 物件，schema：
{
  "reasoning": [string, string, string, string, string],
  "suggested": [{"axis_id": string, "code": string, "rationale": string}],
  "pattern_id": string | null,
  "interweaving_analysis": string | null,
  "is_hybrid_strategy": boolean,
  "confidence": "high" | "medium" | "low"
}`;
}

function extractJson(s: string): unknown {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI 回應未包含可解析的 JSON");
  return JSON.parse(s.slice(start, end + 1));
}

function translateError(err: unknown, provider: Provider, model: string): Error {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status)
      : null;
  const raw = err instanceof Error ? err.message : String(err);
  const name =
    provider === "anthropic"
      ? "Anthropic"
      : provider === "openai"
        ? "OpenAI"
        : provider === "gemini"
          ? "Google Gemini"
          : "TAIDE";

  if (status === 401 || /unauthor|invalid.*key|API_KEY_INVALID|API Key 驗證失敗/i.test(raw)) {
    return new Error(`${name} API key 無效。請至供應商 console 確認。`);
  }
  if (status === 402 || /insufficient.*quota|billing|RESOURCE_EXHAUSTED/i.test(raw)) {
    return new Error(`${name} 額度不足或未設定付款。請至供應商 console 加值。`);
  }
  if (status === 403 || /forbidden|not allowed|permission|User location|PERMISSION_DENIED/i.test(raw)) {
    const isAnthropic = provider === "anthropic";
    const hint = isAnthropic
      ? "\n\n常見原因（依機率排序）：" +
        "\n  1. 帳戶未加信用卡 — Anthropic 即使 Free tier 也要綁卡才能呼叫 API，credits 用完更會 403" +
        "\n  2. 免費 credits 已用完 — 到 console.anthropic.com → Plans 看餘額" +
        "\n  3. Workspace 限制了模型存取 — 換 default workspace 的 key 試試" +
        "\n\n如不想處理 Anthropic 帳號，建議改用：" +
        "\n  • Gemini（aistudio.google.com/apikey 5 秒申請，每日 1500 次免費，不需綁卡）" +
        "\n  • TAIDE（學術免費，但需 NCHC iService 帳號）"
      : `\n\n建議改用該供應商的「推薦」小模型，或檢查帳戶設定。`;
    return new Error(
      `${name} 拒絕請求（403）— ${model} 沒權限或地區受限。${hint}`,
    );
  }
  if (status === 429 || /rate.*limit/i.test(raw)) {
    return new Error(`${name} 速率限制（429）。請稍候 30-60 秒重試。`);
  }
  if (status === 529 || /overload/i.test(raw)) {
    return new Error(`${name} 服務暫時過載。請稍後重試。`);
  }
  if (status && status >= 500) {
    return new Error(`${name} 伺服器錯誤（${status}）。請稍後重試。`);
  }
  return new Error(`${name} 呼叫失敗：${raw}`);
}
