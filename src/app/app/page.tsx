import Link from "next/link";
import { ArrowRight, FileText, BookOpenText, Highlighter, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SAMPLE_SEGMENTS } from "@/lib/seed/sample-segments";

export default function AppOverviewPage() {
  const total = SAMPLE_SEGMENTS.length;
  const hybrid = SAMPLE_SEGMENTS.filter((s) => s.derived?.is_hybrid_strategy).length;
  const surface = SAMPLE_SEGMENTS.filter((s) =>
    s.applied.some((a) => a.axis_id === "surface"),
  ).length;
  const deep = SAMPLE_SEGMENTS.filter((s) =>
    s.applied.some((a) => a.axis_id === "deep"),
  ).length;

  return (
    <div className="space-y-12 p-10">
      <header>
        <p className="eyebrow mb-2">總覽</p>
        <h1 className="text-3xl font-light tracking-tightish">研究空間</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          從文件、編碼簿到視覺化儀表板的概覽。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="文件數" value="1" hint="範例專案" />
        <Stat label="已編碼片段" value={String(total)} hint="跨 8 名發言者" />
        <Stat label="Hybrid 策略" value={`${hybrid} / ${total}`} hint="表層 × 深層皆觸發" />
        <Stat label="平均信心度" value="高" hint="以高信心為主" />
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
            {SAMPLE_SEGMENTS.slice(0, 4).map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">{s.speaker}</div>
                  <div className="flex gap-1">
                    {s.applied.map((a) => (
                      <Badge
                        key={a.code}
                        variant={a.axis_id === "surface" ? "surface" : "deep"}
                        className="font-mono text-[10px]"
                      >
                        {a.code}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm">{s.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <QuickAction
          href="/app/documents"
          icon={FileText}
          title="上傳文件"
          desc="PDF、Word、TXT"
        />
        <QuickAction
          href="/app/codebook"
          icon={BookOpenText}
          title="選擇編碼簿"
          desc="內建 3 套或自行匯入"
        />
        <QuickAction
          href="/app/coding"
          icon={Highlighter}
          title="開始編碼"
          desc="標註與 AI 輔助"
        />
        <QuickAction
          href="/app/dashboard"
          icon={BarChart3}
          title="查看視覺化"
          desc="6 種專業圖表"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
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
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono">
          {count} / {total} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
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
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-border bg-surface p-5 shadow-soft transition hover:border-primary/30 hover:shadow-glow"
    >
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </Link>
  );
}
