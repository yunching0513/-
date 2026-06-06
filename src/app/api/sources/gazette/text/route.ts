import { NextResponse } from "next/server";
import { getAgendaText } from "@/lib/sources/gazette";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/sources/gazette/text?id={公報議程編號}
 * Returns the full transcript text.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }
    const text = await getAgendaText(id);
    return NextResponse.json({ id, text, char_count: text.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "未知錯誤" },
      { status: 500 },
    );
  }
}
