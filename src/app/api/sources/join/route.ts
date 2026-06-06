import { NextResponse } from "next/server";
import { searchProposals } from "@/lib/sources/join";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/sources/join?year=2024&q=...&sort=popular&page=1
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const year = parseInt(url.searchParams.get("year") ?? "2024", 10);
    if (Number.isNaN(year) || year < 2015 || year > new Date().getFullYear()) {
      return NextResponse.json({ error: "year 參數無效" }, { status: 400 });
    }
    const result = await searchProposals({
      year,
      q: url.searchParams.get("q") ?? undefined,
      minSupport: Number(url.searchParams.get("min_support") ?? "0") || 0,
      page: Number(url.searchParams.get("page") ?? "1") || 1,
      perPage: Number(url.searchParams.get("per_page") ?? "20") || 20,
      sort: (url.searchParams.get("sort") as "recent" | "popular") ?? "recent",
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "未知錯誤" },
      { status: 500 },
    );
  }
}
