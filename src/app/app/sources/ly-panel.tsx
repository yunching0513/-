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
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useStrata } from "@/lib/store/strata";
import { buildLyDocText, type Interpellation } from "@/lib/sources/ly-client";
import { cn } from "@/lib/utils";

interface SearchResult {
  interpellations: Interpellation[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// Available terms (屆) — current is 11, prior is 10
const TERMS = [11, 10];

export function LyPanel() {
  const router = useRouter();
  const addDocument = useStrata((s) => s.addDocument);

  const [term, setTerm] = useState<number | "">(11);
  const [session, setSession] = useState<number | "">("");
  const [member, setMember] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [debouncedMember, setDebouncedMember] = useState("");
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
    const t = setTimeout(() => setDebouncedMember(member), 400);
    return () => clearTimeout(t);
  }, [member]);

  useEffect(() => {
    setPage(1);
  }, [term, session, debouncedMember, debouncedQ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      per_page: "20",
    });
    if (term !== "") params.set("term", String(term));
    if (session !== "") params.set("session", String(session));
    if (debouncedMember) params.set("member", debouncedMember);
    if (debouncedQ) params.set("q", debouncedQ);

    fetch(`/api/sources/ly?${params.toString()}`)
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
  }, [term, session, debouncedMember, debouncedQ, page]);

  function toggle(i: Interpellation) {
    const next = new Set(selected);
    if (next.has(i.id)) next.delete(i.id);
    else next.add(i.id);
    setSelected(next);
  }

  function importOne(i: Interpellation, navigate = true) {
    const text = buildLyDocText(i);
    const memberTag = i.members.join("、") || "立委";
    addDocument({
      id: `doc_ly_${i.id}_${Date.now().toString(36)}`,
      name: `立院｜${memberTag}：${i.subject.slice(0, 30)}（${i.publish_date}）`,
      parsed_text: text,
      uploaded_at: new Date().toISOString(),
      size_bytes: new Blob([text]).size,
    });
    if (navigate) router.push("/app/coding");
  }

  function importSelected() {
    if (!data) return;
    const toImport = data.interpellations.filter((i) => selected.has(i.id));
    for (const i of toImport) importOne(i, false);
    setSelected(new Set());
    router.push("/app/coding");
  }

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
          <label className="eyebrow mb-1.5 block">關鍵字（搜事由與說明）</label>
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

        <div>
          <label className="eyebrow mb-1.5 block">委員</label>
          <Input
            value={member}
            onChange={(e) => setMember(e.target.value)}
            placeholder="如：羅智強"
            className="h-9 w-32"
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
                ly.govapi.tw 是社群維護服務，偶有短暫不穩。請稍後重試。
              </p>
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
            共 {data.total.toLocaleString()} 筆質詢符合條件，第 {data.page} / {data.totalPages} 頁
          </div>

          <div className="space-y-3">
            {data.interpellations.map((i) => (
              <LyRow
                key={i.id}
                i={i}
                selected={selected.has(i.id)}
                onToggle={() => toggle(i)}
                onImport={() => importOne(i)}
              />
            ))}
            {data.interpellations.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  本頁無結果。試試換關鍵字或拉寬篩選範圍。
                </CardContent>
              </Card>
            )}
          </div>

          {data.totalPages > 1 && (
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
                {page} / {data.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= data.totalPages}
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

function LyRow({
  i,
  selected,
  onToggle,
  onImport,
}: {
  i: Interpellation;
  selected: boolean;
  onToggle: () => void;
  onImport: () => void;
}) {
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
            <Badge variant="outline" className="font-mono text-[10px]">
              {i.id}
            </Badge>
            <h3 className="text-base font-medium tracking-tightish">{i.subject}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {i.members.join("、") || "（未列名）"}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {i.publish_date}
            </span>
            <span>·</span>
            <span>{i.meeting_label}</span>
          </div>
          <p className="mt-3 line-clamp-3 text-sm text-foreground/85">{i.content}</p>

          <div className="mt-3 flex items-center justify-end">
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
