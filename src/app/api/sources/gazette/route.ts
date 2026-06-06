import { NextResponse } from "next/server";
import { searchAgendas } from "@/lib/sources/gazette";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/sources/gazette?q=&term=&session=&page=&per_page=
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const result = await searchAgendas({
      q: url.searchParams.get("q") ?? undefined,
      term: numOrUndef(url.searchParams.get("term")),
      session: numOrUndef(url.searchParams.get("session")),
      page: numOrUndef(url.searchParams.get("page")),
      perPage: numOrUndef(url.searchParams.get("per_page")),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "未知錯誤" },
      { status: 500 },
    );
  }
}

function numOrUndef(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}
