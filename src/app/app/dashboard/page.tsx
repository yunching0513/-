"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, RotateCcw } from "lucide-react";
import {
  useStrata,
  useActiveCodebook,
  useActiveDocument,
  useActiveSegments,
} from "@/lib/store/strata";
import {
  codeFrequency,
  surfaceDeepCoOccurrence,
  patternDistribution,
  speakerByCode,
  confidenceDistribution,
} from "@/lib/analytics/aggregate";
import { CodeFrequencyChart } from "@/components/charts/code-frequency-chart";
import { SurfaceDeepHeatmap } from "@/components/charts/surface-deep-heatmap";
import { PatternDonut } from "@/components/charts/pattern-donut";
import { SpeakerMatrix } from "@/components/charts/speaker-matrix";
import { ConfidenceBars } from "@/components/charts/confidence-bars";
import { HybridSankey } from "@/components/charts/hybrid-sankey";
import { downloadExcel, downloadQdpx } from "@/lib/export/client";
import { cn } from "@/lib/utils";

type Scope = "current" | "all";

export default function DashboardPage() {
  const [scope, setScope] = useState<Scope>("current");

  const allSegments = useStrata((s) => s.segments);
  const activeSegments = useActiveSegments();
  const documents = useStrata((s) => s.documents);
  const document = useActiveDocument();
  const resetToSample = useStrata((s) => s.resetToSample);
  const cb = useActiveCodebook();

  const segments = scope === "current" ? activeSegments : allSegments;

  const freq = codeFrequency(segments, cb);
  const cooc = surfaceDeepCoOccurrence(segments, cb);
  const patterns = patternDistribution(segments, cb);
  const speakers = speakerByCode(segments);
  const confidence = confidenceDistribution(segments);

  const hasData = segments.length > 0;

  return (
    <div className="space-y-8 p-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">視覺化</p>
          <h1 className="text-3xl font-light tracking-tightish">儀表板</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {scope === "current" ? (
              <>
                當前文件「{document.name}」· {segments.length} 筆編碼
              </>
            ) : (
              <>
                全部 {documents.length} 份文件 · {segments.length} 筆編碼
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <ScopeToggle
            scope={scope}
            onChange={setScope}
            currentLabel={document.name}
            totalDocs={documents.length}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("將重設為內建範例資料，目前的編碼會被清除。確定嗎？"))
                resetToSample();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            重設為範例
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasData}
            onClick={() => downloadExcel(segments, cb, document.name)}
          >
            <FileSpreadsheet className="h-4 w-4" />
            匯出 Excel
          </Button>
          <Button
            size="sm"
            disabled={!hasData}
            onClick={() => downloadQdpx(segments, cb, document)}
          >
            <Download className="h-4 w-4" />
            匯出 ATLAS.ti
          </Button>
        </div>
      </header>

      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {scope === "current"
              ? "當前文件尚無編碼資料。"
              : "尚無任何編碼資料。"}{" "}
            <a href="/app/coding" className="underline underline-offset-2">
              前往編碼工作台
            </a>{" "}
            開始標註。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">編碼頻次</CardTitle>
              <CardDescription>各表層／深層編碼的出現次數</CardDescription>
            </CardHeader>
            <CardContent>
              {freq.length > 0 ? <CodeFrequencyChart data={freq} /> : <EmptyChart />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">表層 × 深層共現熱力圖</CardTitle>
              <CardDescription>哪些程序訴求常與哪些心理偏誤共同出現</CardDescription>
            </CardHeader>
            <CardContent>
              <SurfaceDeepHeatmap data={cooc} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hybrid 模式分布</CardTitle>
              <CardDescription>7 種典型 Hybrid 模式於本資料集之佔比</CardDescription>
            </CardHeader>
            <CardContent>
              <PatternDonut data={patterns} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">表層 → 深層流向（Sankey）</CardTitle>
              <CardDescription>程序訴求如何流向心理偏誤</CardDescription>
            </CardHeader>
            <CardContent>
              <HybridSankey data={cooc} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                發言者 × 編碼矩陣
                {scope === "all" && (
                  <Badge variant="outline" className="ml-2">
                    跨文件
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>誰關心什麼議題</CardDescription>
            </CardHeader>
            <CardContent>
              <SpeakerMatrix data={speakers} codebook={cb} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">編碼信心度分布</CardTitle>
              <CardDescription>編碼品質的整體檢視</CardDescription>
            </CardHeader>
            <CardContent>
              <ConfidenceBars data={confidence} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">摘要統計</CardTitle>
              <CardDescription>
                {scope === "current" ? "本文件" : "全部文件合併"}的編碼指標
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Row label="總片段數" value={String(segments.length)} />
              <Row
                label="含表層程序質疑"
                value={`${segments.filter((s) => s.applied.some((a) => a.axis_id === "surface")).length}`}
              />
              <Row
                label="含深層心理驅動"
                value={`${segments.filter((s) => s.applied.some((a) => a.axis_id === "deep")).length}`}
              />
              <Row
                label="Hybrid 策略"
                value={`${segments.filter((s) => s.derived?.is_hybrid_strategy).length}`}
                accent
              />
              <Row label="不重複發言者" value={`${speakers.length}`} />
              {scope === "all" && <Row label="納入文件數" value={String(documents.length)} />}
              <div className="pt-2">
                <Badge variant="surface">表層 = 程序正義</Badge>{" "}
                <Badge variant="deep">深層 = 行為經濟學</Badge>{" "}
                <Badge variant="hybrid">Hybrid = 兩者交織</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ScopeToggle({
  scope,
  onChange,
  currentLabel,
  totalDocs,
}: {
  scope: Scope;
  onChange: (s: Scope) => void;
  currentLabel: string;
  totalDocs: number;
}) {
  return (
    <div className="flex items-center rounded-sm border border-border bg-surface">
      <button
        onClick={() => onChange("current")}
        className={cn(
          "px-3 py-1.5 text-xs transition",
          scope === "current"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
        title={currentLabel}
      >
        當前文件
      </button>
      <button
        onClick={() => onChange("all")}
        className={cn(
          "px-3 py-1.5 text-xs transition",
          scope === "all"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
        disabled={totalDocs <= 1}
        title={totalDocs <= 1 ? "目前只有一份文件" : `合併 ${totalDocs} 份文件`}
      >
        全部文件
      </button>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "font-mono font-semibold text-hybrid_axis" : "font-mono"}>
        {value}
      </span>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
      尚無資料
    </div>
  );
}
