import { NextResponse } from "next/server";
import {
  complete,
  translateError,
  defaultModel,
  validateKeyShape,
  type Provider,
} from "@/lib/ai/providers";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/ai/test
 * Body: { provider?, api_key? }
 *
 * Sends a minimal ping ("hi") to verify the key works against the chosen
 * provider's default model. If api_key is empty, uses the server's env var.
 * Returns structured diagnostics.
 */
export async function POST(req: Request) {
  let provider: Provider = "anthropic";
  let api_key = "";
  try {
    const body = (await req.json().catch(() => ({}))) as {
      provider?: Provider;
      api_key?: string;
    };
    if (body.provider) provider = body.provider;
    if (body.api_key) api_key = body.api_key;
  } catch {
    // fall through with defaults
  }

  // Decide key source
  const envKey =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : provider === "openai"
        ? process.env.OPENAI_API_KEY
        : process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  const usingByo = !!api_key;
  const finalKey = api_key || envKey;

  if (!finalKey) {
    return NextResponse.json({
      ok: false,
      stage: "config",
      message: usingByo
        ? "未填寫 API key"
        : `伺服器未設定 ${providerEnvName(provider)}。請至「設定」貼入你自己的 API key，或在伺服器設定環境變數。`,
      using_byo: usingByo,
    });
  }

  // Shape validation (only when BYO — env vars are deployer's responsibility)
  if (usingByo) {
    const shape = validateKeyShape(provider, finalKey);
    if (shape) {
      return NextResponse.json({
        ok: false,
        stage: "config",
        message: shape,
        using_byo: usingByo,
      });
    }
  }

  const model = defaultModel(provider);

  try {
    const reply = await complete({
      provider,
      api_key: finalKey,
      model,
      system: "Reply with a single word: pong",
      user: "ping",
      max_tokens: 16,
    });
    return NextResponse.json({
      ok: true,
      stage: "success",
      message: "AI 連線正常",
      provider,
      model,
      reply: reply.slice(0, 50),
      key_prefix: finalKey.slice(0, 12) + "…",
      using_byo: usingByo,
    });
  } catch (err) {
    const translated = translateError(err, provider, model);
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: unknown }).status)
        : null;
    return NextResponse.json({
      ok: false,
      stage: stageFromStatus(status),
      message: translated.message,
      status,
      raw:
        err instanceof Error
          ? err.message.slice(0, 300)
          : String(err).slice(0, 300),
      provider,
      model,
      key_prefix: finalKey.slice(0, 12) + "…",
      using_byo: usingByo,
    });
  }
}

function stageFromStatus(status: number | null): string {
  if (!status) return "unknown";
  if (status === 401) return "key";
  if (status === 402) return "billing";
  if (status === 403) return "permission";
  if (status === 429) return "rate";
  if (status === 529) return "overload";
  if (status >= 500) return "upstream";
  return "unknown";
}

function providerEnvName(provider: Provider): string {
  if (provider === "anthropic") return "ANTHROPIC_API_KEY";
  if (provider === "openai") return "OPENAI_API_KEY";
  return "GOOGLE_API_KEY";
}
