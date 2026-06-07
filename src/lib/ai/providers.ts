import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

/**
 * Multi-provider AI dispatch. Strata supports four providers; researchers
 * can bring their own API key, otherwise fall back to a server-side env var.
 */

export type Provider = "anthropic" | "openai" | "gemini" | "taide";

export interface ProviderModel {
  provider: Provider;
  label: string;
  id: string;
  /** Whether this is the recommended default for the provider */
  default?: boolean;
}

export const MODELS: Record<Provider, ProviderModel[]> = {
  anthropic: [
    {
      provider: "anthropic",
      label: "Claude Haiku 4.5",
      id: "claude-haiku-4-5-20251001",
      default: true,
    },
    { provider: "anthropic", label: "Claude Sonnet 4.6", id: "claude-sonnet-4-6" },
    { provider: "anthropic", label: "Claude Opus 4.8", id: "claude-opus-4-8" },
  ],
  openai: [
    { provider: "openai", label: "GPT-4o mini", id: "gpt-4o-mini", default: true },
    { provider: "openai", label: "GPT-4o", id: "gpt-4o" },
    { provider: "openai", label: "GPT-4.1", id: "gpt-4.1" },
  ],
  gemini: [
    {
      provider: "gemini",
      label: "Gemini 2.5 Flash",
      id: "gemini-2.5-flash",
      default: true,
    },
    { provider: "gemini", label: "Gemini 2.5 Pro", id: "gemini-2.5-pro" },
    { provider: "gemini", label: "Gemini 1.5 Flash", id: "gemini-1.5-flash" },
  ],
  taide: [
    {
      provider: "taide",
      label: "Llama3-TAIDE-LX-8B-Chat",
      id: "Llama3-TAIDE-LX-8B-Chat-Alpha1",
      default: true,
    },
    {
      provider: "taide",
      label: "Llama3-TAIDE-LX-8B-Instruct",
      id: "Llama3-TAIDE-LX-8B-Instruct-Alpha1",
    },
  ],
};

export function defaultModel(provider: Provider): string {
  return MODELS[provider].find((m) => m.default)?.id ?? MODELS[provider][0].id;
}

export interface CompletionRequest {
  provider: Provider;
  api_key: string;
  model: string;
  system: string;
  user: string;
  max_tokens?: number;
}

/**
 * Unified call interface — returns plain text response. Caller parses JSON
 * out of it. All three providers are instructed via system + user messages;
 * for Gemini we concatenate system into the prompt prefix.
 */
export async function complete(req: CompletionRequest): Promise<string> {
  const maxTokens = req.max_tokens ?? 1024;
  switch (req.provider) {
    case "anthropic": {
      const client = new Anthropic({ apiKey: req.api_key });
      const res = await client.messages.create({
        model: req.model,
        max_tokens: maxTokens,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
      });
      const block = res.content.find((c) => c.type === "text");
      return block && "text" in block ? block.text : "";
    }
    case "openai": {
      const client = new OpenAI({ apiKey: req.api_key });
      const res = await client.chat.completions.create({
        model: req.model,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
      });
      return res.choices[0]?.message?.content ?? "";
    }
    case "gemini": {
      const client = new GoogleGenAI({ apiKey: req.api_key });
      const res = await client.models.generateContent({
        model: req.model,
        contents: req.user,
        config: {
          systemInstruction: req.system,
          maxOutputTokens: maxTokens,
        },
      });
      return res.text ?? "";
    }
    case "taide": {
      // TAIDE 透過國網中心 (NCHC) 多模型 API 平台對外提供 OpenAI 相容 API。
      // 認證 header 不是 Authorization Bearer，而是 x-api-key。
      // 因此手寫 fetch，不走 OpenAI SDK。
      const res = await fetch(
        "https://portal.genai.nchc.org.tw/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": req.api_key,
          },
          body: JSON.stringify({
            model: req.model,
            messages: [
              { role: "system", content: req.system },
              { role: "user", content: req.user },
            ],
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(60_000),
        },
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        const err = new Error(`HTTP ${res.status} ${errBody}`) as Error & {
          status?: number;
        };
        err.status = res.status;
        throw err;
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? "";
    }
  }
}

/**
 * Translate provider-specific errors to a unified, user-readable message.
 * Recognises the canonical status codes; falls back to raw message.
 */
export function translateError(
  err: unknown,
  provider: Provider,
  model: string,
): Error {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status)
      : null;
  const raw = err instanceof Error ? err.message : String(err);
  const providerName = providerLabel(provider);

  if (
    status === 401 ||
    /unauthor|invalid.*key|AuthenticationError|API Key 驗證失敗/i.test(raw)
  ) {
    return new Error(`${providerName} API key 無效。請確認 key 是否正確、未過期。`);
  }
  if (status === 402 || /insufficient.*quota|billing/i.test(raw)) {
    return new Error(
      `${providerName} 帳戶餘額不足或未設定付款方式。請至該供應商 console 加入信用卡或購買 credits。`,
    );
  }
  if (status === 403 || /forbidden|not allowed|permission/i.test(raw)) {
    const isNewClaude = /claude-(haiku-4|sonnet-4|opus-4)/i.test(model);
    const hint =
      provider === "anthropic" && isNewClaude
        ? "\n\n常見解法：去「設定」把模型改為「Claude 3.5 Haiku（最廣相容）」— " +
          "這個版本舊但便宜，幾乎所有 Anthropic 帳戶都能用。"
        : provider === "anthropic"
          ? "\n\n建議：去 console.anthropic.com 確認帳戶已驗證（含信用卡），且 workspace 有此模型存取權。"
          : "\n\n建議改用該供應商的「預設小模型」或檢查帳戶設定。";
    return new Error(
      `${providerName} 拒絕請求（403）— 你的 key 沒有權限使用 ${model}。可能原因：` +
        `(a) 帳戶尚未驗證；(b) workspace 限制了模型存取；(c) 該模型較新、key 未授權。` +
        hint,
    );
  }
  if (status === 429 || /rate.*limit/i.test(raw)) {
    return new Error(`${providerName} 速率限制（429）。請稍候 30–60 秒重試。`);
  }
  if (status === 529 || /overload/i.test(raw)) {
    return new Error(`${providerName} 服務暫時過載。請稍後重試。`);
  }
  if (status && status >= 500) {
    return new Error(`${providerName} 伺服器錯誤（${status}）。請稍後重試。`);
  }
  return new Error(`${providerName} 呼叫失敗：${raw}`);
}

export function providerLabel(p: Provider): string {
  if (p === "anthropic") return "Anthropic";
  if (p === "openai") return "OpenAI";
  if (p === "gemini") return "Google Gemini";
  return "TAIDE（國網中心）";
}

/**
 * Light-touch shape check. We don't try to be clever about prefixes — every
 * provider's actual API will give a better verdict than our regex. We only
 * catch the obvious mistakes (empty key, dragged-in whitespace, way too short).
 */
export function validateKeyShape(provider: Provider, key: string): string | null {
  const k = key.trim();
  if (!k) return "未填 API key";
  if (k !== key) return "key 前後有空白字元，請清掉";
  if (k.length < 10) return "key 看起來太短，請確認複製完整";
  // Provider-specific hints are now informational only — we don't block.
  // The real check happens when we hit the provider's API.
  return null;
}
