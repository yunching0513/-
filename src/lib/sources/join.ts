import "server-only";

/**
 * join.gov.tw — 公共政策網路參與平台「提點子」開放資料整合
 *
 * 端點：https://join.gov.tw/toOpenData/v2/ey/idea?year={年份}
 * 授權：政府資料開放授權條款 v1.0
 *
 * 因 join.gov.tw 對外有 Cloudflare 流量保護，採年度批次抓取後在
 * memory 內快取（24 小時），搜尋與分頁皆在伺服器內完成。
 */

export interface JoinProposal {
  /** ISO timestamp of original publish */
  publishDate: string;
  /** Permalink on join.gov.tw */
  url: string;
  /** Proposal title */
  title: string;
  /** Main proposal body */
  content: string;
  /** "Benefits & impacts" section */
  impact: string;
  /** Total supporters so far */
  support_count: number;
  /** Threshold (typically 5000) */
  support_threshold: number;
  /** Submission date (yyyy-mm-dd) */
  submitted_date: string;
  /** Watchers */
  watch_count: number;
  /** Comments */
  comment_count: number;
  /** Proposer display name */
  proposer: string;
  /** Year (derived from year param) */
  year: number;
}

interface RawProposal {
  publishDate?: string;
  網址?: string;
  標題?: string;
  提議內容?: string;
  利益與影響?: string;
  附議數量?: string | number;
  附議門檻?: string | number;
  提送日期?: string;
  關注數量?: string | number;
  留言數量?: string | number;
  提議者?: string;
}

interface CachedYear {
  fetched_at: number;
  proposals: JoinProposal[];
}

const yearCache = new Map<number, CachedYear>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

const USER_AGENT =
  "Mozilla/5.0 (compatible; Strata/0.2; +https://github.com/yunching0513) StrataResearch";

/**
 * Fetch all proposals for a given year (cached).
 */
export async function fetchYearProposals(year: number): Promise<JoinProposal[]> {
  const cached = yearCache.get(year);
  if (cached && Date.now() - cached.fetched_at < CACHE_TTL_MS) {
    return cached.proposals;
  }

  const url = `https://join.gov.tw/toOpenData/v2/ey/idea?year=${year}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    // join.gov.tw can be slow; give it room
    signal: AbortSignal.timeout(45_000),
  });

  // Cloudflare quirk: status may be 503 but body is valid JSON. Try parsing
  // regardless; only fall back to error if body isn't JSON.
  const text = await res.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(
      `join.gov.tw 回應非 JSON (HTTP ${res.status})；可能因流量過大被擋。請稍後再試。`,
    );
  }
  if (!Array.isArray(raw)) {
    throw new Error("join.gov.tw 回應格式異常（非陣列）");
  }
  const proposals = (raw as RawProposal[]).map((r) => normalize(r, year));
  yearCache.set(year, { fetched_at: Date.now(), proposals });
  return proposals;
}

function normalize(r: RawProposal, year: number): JoinProposal {
  return {
    publishDate: r.publishDate ?? "",
    url: r.網址 ?? "",
    title: (r.標題 ?? "").trim(),
    content: (r.提議內容 ?? "").trim(),
    impact: (r.利益與影響 ?? "").trim(),
    support_count: toNum(r.附議數量),
    support_threshold: toNum(r.附議門檻) || 5000,
    submitted_date: r.提送日期 ?? "",
    watch_count: toNum(r.關注數量),
    comment_count: toNum(r.留言數量),
    proposer: (r.提議者 ?? "").trim() || "（匿名）",
    year,
  };
}

function toNum(v: string | number | undefined): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

export interface SearchOptions {
  year: number;
  /** Full-text search across title + content + impact */
  q?: string;
  /** Minimum support count to filter noise */
  minSupport?: number;
  /** Pagination */
  page?: number;
  perPage?: number;
  /** Sort: relevance (q only) / recent / popular */
  sort?: "recent" | "popular";
}

export interface SearchResult {
  proposals: JoinProposal[];
  total: number;
  page: number;
  perPage: number;
  year: number;
}

export async function searchProposals(opts: SearchOptions): Promise<SearchResult> {
  const all = await fetchYearProposals(opts.year);
  const q = opts.q?.trim().toLowerCase() ?? "";
  const minSupport = opts.minSupport ?? 0;

  let filtered = all.filter((p) => p.support_count >= minSupport);
  if (q) {
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.impact.toLowerCase().includes(q),
    );
  }

  if (opts.sort === "popular") {
    filtered.sort((a, b) => b.support_count - a.support_count);
  } else {
    filtered.sort((a, b) => (b.publishDate > a.publishDate ? 1 : -1));
  }

  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.max(1, Math.min(50, opts.perPage ?? 20));
  const start = (page - 1) * perPage;
  return {
    proposals: filtered.slice(start, start + perPage),
    total: filtered.length,
    page,
    perPage,
    year: opts.year,
  };
}

/**
 * Build the document body for importing a proposal into Strata.
 * Uses speaker tags so the dual-layer codebook + speaker detection works.
 */
export function buildDocumentText(p: JoinProposal): string {
  const lines = [
    `【${p.proposer}】${p.title}`,
    "",
    `（提議於 ${p.submitted_date}；附議 ${p.support_count} 人；留言 ${p.comment_count} 則）`,
    "",
    "【提議內容】",
    p.content,
  ];
  if (p.impact) {
    lines.push("");
    lines.push("【利益與影響】");
    lines.push(p.impact);
  }
  lines.push("");
  lines.push(`（來源：join.gov.tw — ${p.url}）`);
  return lines.join("\n");
}
