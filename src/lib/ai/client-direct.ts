"use client";

import { GoogleGenAI } from "@google/genai";
import { BUILTIN_CODEBOOKS } from "../codebook/builtin";
import type { Codebook } from "../codebook/types";

/**
 * Client-direct Gemini calls. Bypasses Strata's backend entirely so we sidestep
 * the Vercel Hobby region lock (Hong Kong, which Google AI Studio blocks).
 * The user's browser sits in their actual location (Taiwan, US, etc.) which
 * Google permits.
 *
 * Trade-off: the user's BYO API key sits in their browser's memory and is sent
 * directly to Google. The Strata server never sees it. This is actually a
 * privacy win — but the key is visible in DevTools network panel.
 */

export interface SuggestionResult {
  reasoning: string[];
  suggested: { axis_id: string; code: string; rationale: string }[];
  pattern_id?: string;
  interweaving_analysis?: string;
  is_hybrid_strategy: boolean;
  confidence: "high" | "medium" | "low";
}

/**
 * Should we route AI calls through the user's browser directly?
 * True only when the user is using Gemini with their own key.
 */
export function shouldRouteDirect(
  provider: string | undefined,
  apiKey: string | undefined,
): boolean {
  return provider === "gemini" && !!apiKey;
}

/**
 * Direct Gemini call from the browser. Same interface as server-side
 * /api/ai/suggest so the calling code only needs to switch entry points.
 */
export async function suggestDirectGemini(args: {
  text: string;
  speaker?: string;
  codebook_id: string;
  user_codebooks?: Codebook[];
  model: string;
  api_key: string;
}): Promise<SuggestionResult> {
  const cb =
    BUILTIN_CODEBOOKS.find((c) => c.codebook_id === args.codebook_id) ??
    args.user_codebooks?.find((c) => c.codebook_id === args.codebook_id);
  if (!cb) throw new Error(`Codebook not found: ${args.codebook_id}`);

  const ai = new GoogleGenAI({ apiKey: args.api_key });
  const system = buildSystemPrompt(cb);
  const user = buildUserPrompt(args.text, args.speaker);

  let raw: string;
  try {
    const res = await ai.models.generateContent({
      model: args.model || "gemini-2.5-flash",
      contents: user,
      config: { systemInstruction: system, maxOutputTokens: 1024 },
    });
    raw = res.text ?? "";
  } catch (err) {
    throw translateGeminiError(err);
  }

  return extractJson(raw) as SuggestionResult;
}

/**
 * A minimal ping-style call used by the settings page connection test.
 */
export async function testDirectGemini(args: {
  api_key: string;
  model: string;
}): Promise<{ reply: string }> {
  const ai = new GoogleGenAI({ apiKey: args.api_key });
  try {
    const res = await ai.models.generateContent({
      model: args.model || "gemini-2.5-flash",
      contents: "ping",
      config: {
        systemInstruction: "Reply with a single word: pong",
        maxOutputTokens: 16,
      },
    });
    return { reply: res.text ?? "" };
  } catch (err) {
    throw translateGeminiError(err);
  }
}

/* ----- shared prompt builders ----- */

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

function translateGeminiError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err);
  if (/API key not valid|API_KEY_INVALID/i.test(raw)) {
    return new Error("Gemini API key 無效。請至 aistudio.google.com/apikey 確認。");
  }
  if (/User location is not supported/i.test(raw)) {
    return new Error(
      "Gemini 拒絕：「User location is not supported」。" +
        "由於你已透過瀏覽器直接呼叫，這代表你的 Google 帳號／瀏覽器所在地區不支援 Gemini API。" +
        "請確認 Google 帳號區域、或改用 Anthropic / TAIDE。",
    );
  }
  if (/quota|RESOURCE_EXHAUSTED/i.test(raw)) {
    return new Error("Gemini 配額已用完（每日 1500 次免費額度）。請明天再試或升級。");
  }
  if (/PERMISSION_DENIED/i.test(raw)) {
    return new Error("Gemini 權限不足。請確認 API key 已啟用 Generative Language API。");
  }
  return new Error(`Gemini 呼叫失敗：${raw}`);
}
