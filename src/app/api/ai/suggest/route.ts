import { NextResponse } from "next/server";
import { findBuiltinCodebook } from "@/lib/codebook/builtin";
import { suggestCoding } from "@/lib/ai/coding-assistant";
import type { Provider } from "@/lib/ai/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/suggest
 * Body: { text, speaker?, codebook_id, provider?, model?, api_key? }
 *
 * If api_key is provided, it's used for the call (BYO key mode).
 * Otherwise falls back to the server's env var for the chosen provider.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      text,
      speaker,
      codebook_id,
      provider,
      model,
      api_key,
    } = body as {
      text: string;
      speaker?: string;
      codebook_id: string;
      provider?: Provider;
      model?: string;
      api_key?: string;
    };
    const codebook = findBuiltinCodebook(codebook_id);
    if (!codebook) {
      return NextResponse.json({ error: "Codebook not found" }, { status: 404 });
    }
    const result = await suggestCoding({
      text,
      speaker,
      codebook,
      provider,
      model,
      api_key,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
