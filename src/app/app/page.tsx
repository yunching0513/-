"use client";

import Link from "next/link";
import { ArrowRight, FileText, BookOpenText, Highlighter, BarChart3, Sparkles, X, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useActiveDocument,
  useActiveSegments,
  useStrata,
} from "@/lib/store/strata";

export default function AppOverviewPage() {
  const segments = useActiveSegments();
  const document = useActiveDocument();
  const onboardingDone = useStrata((s) => s.onboarding_complete);
  const apiKey = useStrata((s) => s.ai_api_key);
  const clearSampleData = useStrata((s) => s.clearSampleData);
  const setOnboardingComplete = useStrata((s) => s.setOnboardingComplete);
  const isSample = document.source_kind === "sample";

  const total = segments.length;
  const hybrid = segments.filter((s) => s.derived?.is_hybrid_strategy).length;
  const surface = segments.filter((s) => s.applied.some((a) => a.axis_id === "surface")).length;
  const deep = segments.filter((s) => s.applied.some((a) => a.axis_id === "deep")).length;

  return (
    <div className="space-y-8 p-10">
      {!onboardingDone && (
        <div className="flex items-start gap-3 border border-foreground/20 bg-muted/30 p-4">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
          <div className="flex-1">
            <div className="text-sm font-medium">先完成 3 步驟引導</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              選 AI 供應商 → 貼 API key → 挑編碼簿。約 3-5 分鐘即可開始用 AI 編碼。
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/onboard">
              開始引導 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <button
            onClick={() => setOnboardingComplete(true)}
            className="text-muted-foreground hover:text-foreground"
            title="略過"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isSample && (
        <div className="flex items-start gap-3 border border-border bg-surface p-4">
          <span className="mt-0.5 text-sm">🧪</span>
          <div className="flex-1">
            <div className="text-sm font-medium">這是示範資料</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              「{document.name}」是內建範例。用來理解雙層編碼簿如何運作。
              準備好開始自己的研究時點右邊按鈕清掉。
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/app/coding">▶ 互動教學</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (
                confirm("清除示範資料？示範文件與其 8 筆編碼會被刪除，你自己上傳的不受影響。")
              ) {
                clearSampleData();
              }
            }}
          >
            清除示範
          </Button>
        </div>
      )}

      {!apiKey && onboardingDone && (
        <div className="flex items-start gap-3 border border-foreground/20 bg-muted/30 p-4">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
          <div className="flex-1">
            <div className="text-sm font-medium">尚未設定 AI API key</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              手動編碼可以用，但 AI 建議與批次預編碼需要 key。
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/app/settings">去設定</Link>
          </Button>
        </div>
      )}

      <header>
        <p className="eyebrow mb-2">總覽</p>
        <h1 className="text-3xl font-light tracking-tightish">研究空間</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          當前文件：{document.name}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="當前文件" value="1" hint={document.name} />
        <Stat label="已編碼片段" value={String(total)} hint={total ? "可繼續編碼" : "尚未開始"} />
        <Stat
          label="Hybrid 策略"
          value={total ? `${hybrid} / ${total}` : "—"}
          hint="表層 × 深層皆觸發"
        />
        <Stat
          label="平均信心度"
          value={confidenceLabel(segments)}
          hint="多數編碼的信心程度"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>表層／深層分布</CardTitle>
            <CardDescription>程序正義訴求 vs 行為經濟學偏誤觸發比例</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Bar label="表層觸發" count={surface} total={total} variant="surface" />
            <Bar label="深層觸發" count={deep} total={total} variant="deep" />
            <Bar label="Hybrid 同時觸發" count={hybrid} total={total} variant="hybrid" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>近期編碼</CardTitle>
            <CardDescription>最近的標註活動</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {segments.length === 0 && (
              <p className="text-sm text-muted-foreground">
                尚未建立任何編碼。前往編碼工作台開始。
              </p>
            )}
            {[...segments]
              .sort((a, b) =>
                (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at),
              )
              .slice(0, 4)
              .map((s) => (
                <div key={s.id} className="border-l-2 border-foreground/20 pl-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">
                      {s.speaker ?? "（未指定）"}
                    </span>
                    <div className="flex gap-1">
                      {s.applied.map((a) => (
                        <Badge
                          key={`${a.axis_id}-${a.code}`}
                          variant={a.axis_id === "surface" ? "surface" : "deep"}
                          className="font-mono"
                        >
                          {a.code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{s.text}</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <QuickAction href="/app/documents" icon={FileText} title="上傳文件" desc="PDF、Word、TXT" />
        <QuickAction href="/app/codebook" icon={BookOpenText} title="選擇編碼簿" desc="內建 3 套或自行匯入" />
        <QuickAction href="/app/coding" icon={Highlighter} title="開始編碼" desc="標註與 AI 輔助" />
        <QuickAction href="/app/dashboard" icon={BarChart3} title="查看視覺化" desc="6 種專業圖表" />
      </div>
    </div>
  );
}

function confidenceLabel(segments: { confidence?: string }[]) {
  if (segments.length === 0) return "—";
  const counts = { high: 0, medium: 0, low: 0 };
  for (const s of segments) {
    if (s.confidence === "high") counts.high++;
    else if (s.confidence === "medium") counts.medium++;
    else if (s.confidence === "low") counts.low++;
  }
  if (counts.high >= counts.medium && counts.high >= counts.low) return "高";
  if (counts.medium >= counts.low) return "中";
  return "低";
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-light tracking-tightish">{value}</div>
        {hint && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Bar({
  label,
  count,
  total,
  variant,
}: {
  label: string;
  count: number;
  total: number;
  variant: "surface" | "deep" | "hybrid";
}) {
  const pct = total ? (count / total) * 100 : 0;
  const color =
    variant === "surface"
      ? "bg-surface_axis"
      : variant === "deep"
        ? "bg-deep_axis"
        : "bg-hybrid_axis";
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {count} / {total} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col border border-border bg-surface p-5 transition hover:bg-muted/40"
    >
      <Icon className="h-5 w-5 text-foreground/70" strokeWidth={1.4} />
      <div className="mt-4 flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}
