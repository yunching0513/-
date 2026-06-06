import "server-only";

/**
 * ly.govapi.tw — 立法院公報議程整合（含完整逐字稿）
 *
 * 端點：
 *   /gazette_agendas              — 議程列表（16,471 筆，支援 q 全文搜尋）
 *   /gazette_agenda_doc/{id}/txt  — 該議程的完整逐字稿（純文字）
 *
 * 對 Strata 雙層編碼簿是最高價值的單一資料源：
 * 委員會討論與院會逐字稿即「公聽會的鏡像場域」，
 * 含主席／立委／部會首長／與會專家之真實對話。
 */

const BASE = "https://v2.ly.govapi.tw";
const USER_AGENT =
  "Mozilla/5.0 (compatible; Strata/0.2; +https://github.com/yunching0513) StrataResearch";

export interface GazetteAgenda {
  /** 公報議程編號（unique，用於取逐字稿） */
  id: string;
  /** 公報編號（卷年 + 編號） */
  gazette_id: string;
  term: number;
  session: number;
  meeting: number;
  /** ISO date string(s) — 議程可能跨日 */
  dates: string[];
  /** 案由（議程主旨；列表顯示用） */
  subject: string;
  /** 起訖頁碼 */
  page_start?: number;
  page_end?: number;
  /** 來源：原立法院公報網頁 */
  source_url: string;
  /** ly.govapi 處理後純文字 URL */
  text_url: string;
  /** ly.govapi 處理後 HTML URL */
  html_url?: string;
}

interface RawAgenda {
  公報議程編號?: string;
  公報編號?: string | number;
  屆?: number;
  會期?: number;
  會次?: number;
  會議日期?: string[];
  案由?: string;
  起始頁碼?: number;
  結束頁碼?: number;
  公報網網址?: string;
  處理後公報網址?: { type: string; url: string }[];
}

interface RawListResponse {
  total: number;
  total_page: number;
  page: number;
  limit: number;
  gazetteagendas: RawAgenda[];
}

function normalize(r: RawAgenda): GazetteAgenda {
  const processed = r.處理後公報網址 ?? [];
  const txt = processed.find((p) => p.type === "txt");
  const html = processed.find((p) => p.type === "html");
  const id = r.公報議程編號 ?? "";
  return {
    id,
    gazette_id: String(r.公報編號 ?? ""),
    term: r.屆 ?? 0,
    session: r.會期 ?? 0,
    meeting: r.會次 ?? 0,
    dates: Array.isArray(r.會議日期) ? r.會議日期 : [],
    subject: (r.案由 ?? "").trim(),
    page_start: r.起始頁碼,
    page_end: r.結束頁碼,
    source_url: r.公報網網址 ?? "",
    text_url: txt?.url ?? `${BASE}/gazette_agenda_doc/${id}/txt`,
    html_url: html?.url,
  };
}

export interface SearchOptions {
  q?: string;
  term?: number;
  session?: number;
  page?: number;
  perPage?: number;
}

export interface SearchResult {
  agendas: GazetteAgenda[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export async function searchAgendas(opts: SearchOptions): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.term) params.set("屆", String(opts.term));
  if (opts.session) params.set("會期", String(opts.session));
  params.set("page", String(opts.page ?? 1));
  params.set("limit", String(Math.min(50, opts.perPage ?? 20)));

  const url = `${BASE}/gazette_agendas?${params.toString()}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
    next: { revalidate: 60 * 60 },
  });
  if (!res.ok) {
    throw new Error(`ly.govapi.tw HTTP ${res.status}`);
  }
  const data = (await res.json()) as RawListResponse;
  return {
    agendas: (data.gazetteagendas ?? []).map(normalize),
    total: data.total,
    page: data.page,
    perPage: data.limit,
    totalPages: data.total_page,
  };
}

/**
 * 取單一議程的完整逐字稿純文字。
 * 逐字稿可能很大（數萬至十萬字）；呼叫端應節制。
 */
export async function getAgendaText(agendaId: string): Promise<string> {
  const url = `${BASE}/gazette_agenda_doc/${encodeURIComponent(agendaId)}/txt`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/plain" },
    signal: AbortSignal.timeout(60_000),
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    throw new Error(`取得逐字稿失敗 (HTTP ${res.status})`);
  }
  return await res.text();
}

/**
 * Build the document text for Strata import.
 * 逐字稿本身已含「主席：」「委員：」格式，speaker detector 可直接吃。
 * 我們只在前面加 metadata header。
 */
export function buildAgendaDocText(a: GazetteAgenda, transcript: string): string {
  const dates = a.dates.length > 0 ? a.dates.join("、") : "（未知日期）";
  const header = [
    `第 ${a.term} 屆第 ${a.session} 會期第 ${a.meeting} 次會議`,
    `會議日期：${dates}`,
    `案由：${a.subject}`,
    `來源：立法院公報議程 ${a.id}（${a.source_url}）`,
    "",
    "──────────",
    "",
  ].join("\n");
  return header + transcript.trim();
}
