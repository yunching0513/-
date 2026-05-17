import { NextResponse } from "next/server";
import { findBuiltinCodebook } from "@/lib/codebook/builtin";
import { suggestCoding, type Tier } from "@/lib/ai/coding-assistant";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/ai/suggest
 * Body: { text, speaker?, codebook_id, tier? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text, speaker, codebook_id, tier } = body as {
      text: string;
      speaker?: string;
      codebook_id: string;
      tier?: Tier;
    };
    const codebook = findBuiltinCodebook(codebook_id);
    if (!codebook) {
      return NextResponse.json({ error: "Codebook not found" }, { status: 404 });
    }
    const result = await suggestCoding({ text, speaker, codebook, tier });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
