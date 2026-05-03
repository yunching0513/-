import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { dualLayerPJxBE } from "@/lib/codebook/builtin";
import { SAMPLE_SEGMENTS } from "@/lib/seed/sample-segments";
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

export default function DashboardPage() {
  const segments = SAMPLE_SEGMENTS;
  const cb = dualLayerPJxBE;

  const freq = codeFrequency(segments, cb);
  const cooc = surfaceDeepCoOccurrence(segments, cb);
  const patterns = patternDistribution(segments, cb);
  const speakers = speakerByCode(segments);
  const confidence = confidenceDistribution(segments);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">視覺化儀表板</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            6 種專業質性分析圖表，全部可下載為 PNG 或 SVG。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4" />
            匯出 Excel
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4" />
            匯出 ATLAS.ti（.qdpx）
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">編碼頻次</CardTitle>
            <CardDescription>各表層／深層編碼的出現次數</CardDescription>
          </CardHeader>
          <CardContent>
            <CodeFrequencyChart data={freq} />
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
            <CardTitle className="text-base">發言者 × 編碼矩陣</CardTitle>
            <CardDescription>誰關心什麼議題（聽證會的核心洞察）</CardDescription>
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
            <CardDescription>本專案的編碼整體指標</CardDescription>
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
            <div className="pt-2">
              <Badge variant="surface">表層 = 程序正義</Badge>{" "}
              <Badge variant="deep">深層 = 行為經濟學</Badge>{" "}
              <Badge variant="hybrid">Hybrid = 兩者交織</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "font-mono font-semibold text-hybrid_axis" : "font-mono"}>{value}</span>
    </div>
  );
}
