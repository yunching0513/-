"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  ArrowRight,
  Calendar,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useStrata } from "@/lib/store/strata";
import { buildAgendaName, type GazetteAgenda } from "@/lib/sources/gazette-client";
import { cn } from "@/lib/utils";

interface SearchResult {
  agendas: GazetteAgenda[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const TERMS = [11, 10];

export function GazettePanel() {
  const router = useRouter();
  const addDocument = useStrata((s) => s.addDocument);

  const [term, setTerm] = useState<number | "">(11);
  const [session, setSession] = useState<number | "">("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [term, session, debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (term !== "") params.set("term", String(term));
    if (session !== "") params.set("session", String(session));
    if (debouncedQ) params.set("q", debouncedQ);

    fetch(`/api/sources/gazette?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return (await res.json()) as SearchResult;
      })
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "未知錯誤");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [term, session, debouncedQ, page]);

  function toggle(a: GazetteAgenda) {
    const next = new Set(selected);
    if (next.has(a.id)) next.delete(a.id);
    else next.add(a.id);
    setSelected(next);
  }

  async function fetchAndAddOne(a: GazetteAgenda): Promise<boolean> {
    try {
      const res = await fetch(`/api/sources/gazette/text?id=${encodeURIComponent(a.id)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { text } = (await res.json()) as { text: string };
      const dates = a.dates.join("、") || "（未知日期）";
      const header = [
        `第 ${a.term} 屆第 ${a.session} 會期第 ${a.meeting} 次會議`,
        `會議日期：${dates}`,
        `案由：${a.subject}`,
        `來源：立法院公報議程 ${a.id}（${a.source_url}）`,
        "",
        "──────────",
        "",
      ].join("\n");
      const fullText = header + text.trim();
      addDocument({
        id: `doc_gazette_${a.id}_${Date.now().toString(36)}`,
        name: buildAgendaName(a),
        parsed_text: fullText,
        uploaded_at: new Date().toISOString(),
        size_bytes: new Blob([fullText]).size,
        source_kind: "gazette",
        source_date: a.dates[0],
      });
      return true;
    } catch (err) {
      setImportErrors((es) => [
        ...es,
        `${a.id}: ${err instanceof Error ? err.message : "未知"}`,
      ]);
      return false;
    }
  }

  async function importOne(a: GazetteAgenda) {
    setImporting({ done: 0, total: 1 });
    setImportErrors([]);
    const ok = await fetchAndAddOne(a);
    setImporting(null);
    if (ok) router.push("/app/coding");
  }

  async function importSelected() {
    if (!data) return;
    const toImport = data.agendas.filter((a) => selected.has(a.id));
    if (toImport.length === 0) return;
    setImporting({ done: 0, total: toImport.length });
    setImportErrors([]);
    let okCount = 0;
    for (let i = 0; i < toImport.length; i++) {
      const ok = await fetchAndAddOne(toImport[i]);
      if (ok) okCount++;
      setImporting({ done: i + 1, total: toImport.length });
    }
    setImporting(null);
    setSelected(new Set());
    if (okCount > 0) router.push("/app/coding");
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 && !importing && (
        <div className="flex items-center justify-between border border-foreground/30 bg-muted/40 px-4 py-2.5">
          <span className="text-sm">已選 {selected.size} 筆</span>
          <Button size="sm" onClick={importSelected}>
            匯入並編碼
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {importing && (
        <div className="flex items-center gap-3 border border-border bg-muted/40 px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          <div className="flex-1 text-sm">
            正在取得逐字稿 {importing.done} / {importing.total}…
          </div>
          <div className="h-1 w-32 overflow-hidden bg-border">
            <div
              className="h-full bg-foreground/70 transition-all"
              style={{ width: `${(importing.done / importing.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {importErrors.length > 0 && (
        <details className="border border-destructive/30 bg-destructive/5 p-3 text-xs">
          <summary className="cursor-pointer text-destructive">
            {importErrors.length} 篇取得失敗
          </summary>
          <ul className="mt-2 space-y-1 text-destructive/80">
            {importErrors.slice(0, 10).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap items-end gap-3 border border-border bg-surface p-4">
        <div className="flex-1 min-w-[240px]">
          <label className="eyebrow mb-1.5 block">關鍵字（搜案由）</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="如：都市更新、社會住宅、健保..."
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">屆</label>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value === "" ? "" : Number(e.target.value))}
            className="h-9 rounded-sm border border-border bg-surface px-3 text-sm"
          >
            <option value="">全部</option>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                第 {t} 屆
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">會期</label>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value === "" ? "" : Number(e.target.value))}
            className="h-9 rounded-sm border border-border bg-surface px-3 text-sm"
          >
            <option value="">全部</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                第 {s} 會期
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex items-start gap-3 py-6 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <div className="font-medium text-destructive">無法取得資料</div>
              <div className="mt-1 text-muted-foreground">{error}</div>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            載入中…
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="text-xs text-muted-foreground">
            共 {data.total.toLocaleString()} 筆議程符合條件，第 {data.page} / {data.totalPages} 頁
            <span className="ml-3 text-foreground/50">
              · 每筆含完整委員會／院會逐字稿（含主席、立委、與會官員之對話）
            </span>
          </div>

          <div className="space-y-3">
            {data.agendas.map((a) => (
              <AgendaRow
                key={a.id}
                a={a}
                selected={selected.has(a.id)}
                onToggle={() => toggle(a)}
                onImport={() => importOne(a)}
                disabled={!!importing}
              />
            ))}
            {data.agendas.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  本頁無結果。
                </CardContent>
              </Card>
            )}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || !!importing}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                上一頁
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {data.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= data.totalPages || !!importing}
                onClick={() => setPage((p) => p + 1)}
              >
                下一頁
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function AgendaRow({
  a,
  selected,
  onToggle,
  onImport,
  disabled,
}: {
  a: GazetteAgenda;
  selected: boolean;
  onToggle: () => void;
  onImport: () => void;
  disabled: boolean;
}) {
  const pages = a.page_start != null && a.page_end != null ? a.page_end - a.page_start + 1 : null;
  return (
    <article
      className={cn(
        "border bg-surface p-5 transition",
        selected ? "border-foreground/40 bg-muted/30" : "border-border hover:border-foreground/20",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          disabled={disabled}
          className="mt-0.5 shrink-0 text-foreground/60 hover:text-foreground disabled:opacity-40"
        >
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              {a.id}
            </Badge>
            <h3 className="text-base font-medium tracking-tightish">
              第{a.term}屆第{a.session}會期 第{a.meeting}次
            </h3>
            <a
              href={a.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="開啟立法院公報原文"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {a.dates.join("、") || "（未列日期）"}
            </span>
            {pages !== null && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {pages} 頁逐字稿
                </span>
              </>
            )}
          </div>
          <p className="mt-3 line-clamp-3 text-sm text-foreground/85">{a.subject}</p>

          <div className="mt-3 flex items-center justify-end">
            <Button size="sm" variant="outline" onClick={onImport} disabled={disabled}>
              匯入逐字稿並編碼
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
