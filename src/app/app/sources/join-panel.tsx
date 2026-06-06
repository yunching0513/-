"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  AlertCircle,
  ExternalLink,
  Heart,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useStrata } from "@/lib/store/strata";
import { buildJoinDocText, type JoinProposal } from "@/lib/sources/join-client";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2017 + 1 }, (_, i) => CURRENT_YEAR - i);

type Sort = "recent" | "popular";

interface SearchResult {
  proposals: JoinProposal[];
  total: number;
  page: number;
  perPage: number;
  year: number;
}

export function JoinPanel() {
  const router = useRouter();
  const addDocument = useStrata((s) => s.addDocument);

  const [year, setYear] = useState(CURRENT_YEAR);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const [minSupport, setMinSupport] = useState(0);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [year, debouncedQ, sort, minSupport]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      year: String(year),
      sort,
      page: String(page),
      per_page: "20",
    });
    if (debouncedQ) params.set("q", debouncedQ);
    if (minSupport > 0) params.set("min_support", String(minSupport));
    fetch(`/api/sources/join?${params.toString()}`)
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
  }, [year, debouncedQ, sort, minSupport, page]);

  function toggle(p: JoinProposal) {
    const next = new Set(selected);
    if (next.has(p.url)) next.delete(p.url);
    else next.add(p.url);
    setSelected(next);
  }

  function importOne(p: JoinProposal, navigate = true) {
    const text = buildJoinDocText(p);
    addDocument({
      id: `doc_join_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name: `join｜${p.title.slice(0, 40)}（${p.submitted_date}）`,
      parsed_text: text,
      uploaded_at: new Date().toISOString(),
      size_bytes: new Blob([text]).size,
    });
    if (navigate) router.push("/app/coding");
  }

  function importSelected() {
    if (!data) return;
    const toImport = data.proposals.filter((p) => selected.has(p.url));
    for (const p of toImport) importOne(p, false);
    setSelected(new Set());
    router.push("/app/coding");
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="flex items-center justify-between border border-foreground/30 bg-muted/40 px-4 py-2.5">
          <span className="text-sm">已選 {selected.size} 筆</span>
          <Button size="sm" onClick={importSelected}>
            匯入並編碼
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 border border-border bg-surface p-4">
        <div className="flex-1 min-w-[240px]">
          <label className="eyebrow mb-1.5 block">關鍵字</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="如：都市更新、租屋、教育..."
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">年份</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 rounded-sm border border-border bg-surface px-3 text-sm"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">排序</label>
          <div className="flex">
            <button
              onClick={() => setSort("popular")}
              className={cn(
                "h-9 rounded-l-sm border px-3 text-sm",
                sort === "popular"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface hover:bg-muted",
              )}
            >
              附議數
            </button>
            <button
              onClick={() => setSort("recent")}
              className={cn(
                "-ml-px h-9 rounded-r-sm border px-3 text-sm",
                sort === "recent"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-surface hover:bg-muted",
              )}
            >
              最新
            </button>
          </div>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">最低附議</label>
          <Input
            type="number"
            value={minSupport}
            onChange={(e) => setMinSupport(Math.max(0, Number(e.target.value) || 0))}
            min={0}
            step={100}
            className="h-9 w-24"
          />
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex items-start gap-3 py-6 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <div className="font-medium text-destructive">無法取得資料</div>
              <div className="mt-1 text-muted-foreground">{error}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                join.gov.tw 對外有流量保護，偶爾會擋。請稍後重試。
              </p>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            載入中…（首次取得整年資料約 5–15 秒）
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="text-xs text-muted-foreground">
            {data.year} 年共 {data.total} 筆符合
            {debouncedQ ? `「${debouncedQ}」` : "條件"}
            ，第 {data.page} / {totalPages} 頁
          </div>

          <div className="space-y-3">
            {data.proposals.map((p) => (
              <JoinRow
                key={p.url}
                p={p}
                selected={selected.has(p.url)}
                onToggle={() => toggle(p)}
                onImport={() => importOne(p)}
              />
            ))}
            {data.proposals.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  本頁無結果。試試換關鍵字或降低最低附議門檻。
                </CardContent>
              </Card>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                上一頁
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
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

function JoinRow({
  p,
  selected,
  onToggle,
  onImport,
}: {
  p: JoinProposal;
  selected: boolean;
  onToggle: () => void;
  onImport: () => void;
}) {
  const supportPct = Math.min(100, (p.support_count / p.support_threshold) * 100);
  const passedThreshold = p.support_count >= p.support_threshold;

  return (
    <article
      className={cn(
        "border bg-surface p-5 transition",
        selected
          ? "border-foreground/40 bg-muted/30"
          : "border-border hover:border-foreground/20",
      )}
    >
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 shrink-0 text-foreground/60 hover:text-foreground">
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-medium tracking-tightish">{p.title}</h3>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              title="開啟 join.gov.tw 原文"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>提議者：{p.proposer}</span>
            <span>·</span>
            <span>提送 {p.submitted_date}</span>
            {passedThreshold && (
              <Badge variant="hybrid" className="ml-1">
                已達門檻
              </Badge>
            )}
          </div>
          <p className="mt-3 line-clamp-3 text-sm text-foreground/85">{p.content}</p>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                {p.support_count.toLocaleString()} / {p.support_threshold.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                {p.comment_count.toLocaleString()}
              </span>
              <div className="w-24">
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-foreground/40"
                    style={{ width: `${supportPct}%` }}
                  />
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onImport}>
              匯入並編碼
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
