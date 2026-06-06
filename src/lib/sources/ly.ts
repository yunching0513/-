import "server-only";

/**
 * ly.govapi.tw v2 — 立法院開放資料 API 整合（社群維護，g0v 系列）
 *
 * 端點基底：https://v2.ly.govapi.tw
 *
 * 本模組目前只串「立委質詢」（/interpellations），對 Strata 雙層編碼簿
 * 最有意義（程序正義 × 行為經濟學的典型場域）。
 *
 * 支援的 filter 參數：屆、會期、質詢委員、q（全文搜尋）
 */

const BASE = "https://v2.ly.govapi.tw";
const USER_AGENT =
  "Mozilla/5.0 (compatible; Strata/0.2; +https://github.com/yunching0513) StrataResearch";

export interface Interpellation {
  /** 質詢編號（unique stable id） */
  id: string;
  /** 屆（第 N 屆立委） */
  term: number;
  /** 會期 */
  session: number;
  /** 會次 */
  meeting: number;
  /** 質詢委員（多名委員可能聯名） */
  members: string[];
  /** 會議代碼 + 文字（如「第 11 屆第 1 會期第 1 次會議」） */
  meeting_label: string;
  /** 刊登日期 yyyy-mm-dd */
  publish_date: string;
  /** 事由（質詢主旨） */
  subject: string;
  /** 說明（完整質詢內容） */
  content: string;
  /** 質詢起始 / 結束頁碼 */
  page_start?: number;
  page_end?: number;
}

interface RawInterpellation {
  屆?: number;
  質詢委員?: string[];
  會議代碼?: string;
  "會議代碼:str"?: string;
  質詢編號?: string;
  質詢起始頁?: number;
  質詢結束頁?: number;
  刊登日期?: string;
  事由?: string;
  說明?: string;
  會議編號?: string;
  會期?: number;
  會次?: number;
}

interface RawListResponse {
  total: number;
  total_page: number;
  page: number;
  limit: number;
  interpellations: RawInterpellation[];
}

function normalize(r: RawInterpellation): Interpellation {
  return {
    id: r.質詢編號 ?? "",
    term: r.屆 ?? 0,
    session: r.會期 ?? 0,
    meeting: r.會次 ?? 0,
    members: Array.isArray(r.質詢委員) ? r.質詢委員 : [],
    meeting_label: r["會議代碼:str"] ?? r.會議代碼 ?? "",
    publish_date: r.刊登日期 ?? "",
    subject: (r.事由 ?? "").trim(),
    content: (r.說明 ?? "").trim(),
    page_start: r.質詢起始頁,
    page_end: r.質詢結束頁,
  };
}

export interface SearchOptions {
  q?: string;
  term?: number;
  session?: number;
  member?: string;
  page?: number;
  perPage?: number;
}

export interface SearchResult {
  interpellations: Interpellation[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function searchInterpellations(
  opts: SearchOptions,
): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.term) params.set("屆", String(opts.term));
  if (opts.session) params.set("會期", String(opts.session));
  if (opts.member) params.set("質詢委員", opts.member);
  params.set("page", String(opts.page ?? 1));
  params.set("limit", String(Math.min(50, opts.perPage ?? 20)));

  const url = `${BASE}/interpellations?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
    // ly.govapi.tw is community infra — cache aggressively
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) {
    throw new Error(`ly.govapi.tw HTTP ${res.status}`);
  }
  const data = (await res.json()) as RawListResponse;
  return {
    interpellations: data.interpellations.map(normalize),
    total: data.total,
    page: data.page,
    perPage: data.limit,
    totalPages: data.total_page,
  };
}

/** Build Strata document text from an interpellation. */
export function buildInterpellationDocText(i: Interpellation): string {
  const memberTag = i.members.length > 0 ? i.members.join("、") : "立委";
  const lines = [
    `【${memberTag}】${i.subject}`,
    "",
    `（${i.meeting_label}；刊登於 ${i.publish_date}）`,
    "",
    "【說明】",
    i.content,
    "",
    `（來源：立法院公報 — ly.govapi.tw 質詢編號 ${i.id}）`,
  ];
  return lines.join("\n");
}
