"use client";

import { useMemo, useState } from "react";
import { Sparkles, Save, ChevronRight, MessageSquare, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { dualLayerPJxBE } from "@/lib/codebook/builtin";
import { SAMPLE_DOCUMENT, SAMPLE_SEGMENTS } from "@/lib/seed/sample-segments";
import type { CodedSegment } from "@/lib/codebook/types";
import { cn } from "@/lib/utils";

export default function CodingWorkspacePage() {
  const codebook = dualLayerPJxBE;
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(SAMPLE_SEGMENTS[0].id);
  const segment =
    SAMPLE_SEGMENTS.find((s) => s.id === selectedSegmentId) ?? SAMPLE_SEGMENTS[0];

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[1fr_360px] overflow-hidden">
      {/* Left: text reader + segment list */}
      <div className="grid grid-rows-[auto_1fr] overflow-hidden border-r border-border">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div>
            <div className="text-sm font-medium">{SAMPLE_DOCUMENT.name}</div>
            <div className="text-xs text-muted-foreground">
              編碼簿：{codebook.name}　·　{SAMPLE_SEGMENTS.length} 個已編碼片段
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Sparkles className="h-4 w-4" />
              AI 預編碼整份
            </Button>
            <Button size="sm">
              <Save className="h-4 w-4" />
              儲存
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-[1fr_280px] overflow-hidden">
          {/* Document text */}
          <div className="overflow-y-auto p-6 scrollbar-thin">
            <div className="prose prose-sm mx-auto max-w-2xl">
              <h2 className="mb-4 text-base font-semibold text-muted-foreground">逐字稿</h2>
              <div className="space-y-3 text-[15px] leading-relaxed">
                {SAMPLE_SEGMENTS.map((s) => (
                  <SegmentBlock
                    key={s.id}
                    segment={s}
                    selected={s.id === selectedSegmentId}
                    onSelect={() => setSelectedSegmentId(s.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Segment index */}
          <aside className="overflow-y-auto border-l border-border bg-muted/20 p-3 scrollbar-thin">
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              片段索引（{SAMPLE_SEGMENTS.length}）
            </div>
            <div className="space-y-1">
              {SAMPLE_SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSegmentId(s.id)}
                  className={cn(
                    "block w-full rounded-md p-2 text-left text-xs transition",
                    s.id === selectedSegmentId
                      ? "bg-surface ring-1 ring-primary/30"
                      : "hover:bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.speaker}</span>
                    {s.derived?.is_hybrid_strategy && (
                      <Badge variant="hybrid" className="text-[9px] py-0 px-1.5">⊕</Badge>
                    )}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-muted-foreground">{s.text}</div>
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {s.applied.map((a) => (
                      <span
                        key={a.code}
                        className={cn(
                          "rounded px-1 font-mono text-[9px]",
                          a.axis_id === "surface"
                            ? "bg-surface_axis/15 text-surface_axis"
                            : "bg-deep_axis/15 text-deep_axis",
                        )}
                      >
                        {a.code}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* Right: coding panel */}
      <CodingPanel segment={segment} />
    </div>
  );
}

function SegmentBlock({
  segment,
  selected,
  onSelect,
}: {
  segment: CodedSegment;
  selected: boolean;
  onSelect: () => void;
}) {
  const hasSurface = segment.applied.some((a) => a.axis_id === "surface");
  const hasDeep = segment.applied.some((a) => a.axis_id === "deep");
  return (
    <div
      onClick={onSelect}
      className={cn(
        "cursor-pointer rounded-lg border p-3 transition",
        selected ? "border-primary/40 bg-surface shadow-soft" : "border-transparent hover:border-border",
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-xs">
        <span className="font-medium text-muted-foreground">【{segment.speaker}】</span>
        <div className="flex gap-1">
          {segment.applied.map((a) => (
            <Badge
              key={a.code}
              variant={a.axis_id === "surface" ? "surface" : "deep"}
              className="font-mono text-[10px]"
            >
              {a.code}
            </Badge>
          ))}
          {segment.derived?.is_hybrid_strategy && (
            <Badge variant="hybrid" className="text-[10px]">⊕ Hybrid</Badge>
          )}
        </div>
      </div>
      <p>
        <span
          className={cn(
            "decoration-2 underline-offset-4",
            hasSurface && hasDeep
              ? "bg-hybrid_axis/10 underline decoration-hybrid_axis"
              : hasSurface
                ? "bg-surface_axis/10 underline decoration-surface_axis"
                : hasDeep
                  ? "bg-deep_axis/10 underline decoration-deep_axis decoration-dashed"
                  : "",
          )}
        >
          {segment.text}
        </span>
      </p>
    </div>
  );
}

function CodingPanel({ segment }: { segment: CodedSegment }) {
  const cb = dualLayerPJxBE;
  const surface = cb.axes.find((a) => a.axis_id === "surface")!;
  const deep = cb.axes.find((a) => a.axis_id === "deep")!;
  const surfaceCode = segment.applied.find((a) => a.axis_id === "surface")?.code;
  const deepCode = segment.applied.find((a) => a.axis_id === "deep")?.code;
  const matchedPattern = cb.patterns?.find(
    (p) => p.surface_code === surfaceCode && p.deep_code === deepCode,
  );

  return (
    <aside className="flex flex-col overflow-hidden bg-surface">
      <div className="border-b border-border px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          編碼面板
        </div>
        <div className="mt-1 text-sm font-medium">{segment.speaker}</div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 scrollbar-thin">
        {/* Selected text */}
        <section>
          <Label>所選文本</Label>
          <div className="rounded-md border border-border bg-muted/40 p-2.5 text-sm leading-relaxed">
            {segment.text}
          </div>
        </section>

        {/* Surface axis */}
        <section>
          <Label color="surface">表層：程序正義</Label>
          <CodeChips axis={surface} active={surfaceCode} />
        </section>

        {/* Deep axis */}
        <section>
          <Label color="deep">深層：行為經濟學</Label>
          <CodeChips axis={deep} active={deepCode} />
        </section>

        {/* Hybrid status */}
        <section className="rounded-lg border border-hybrid_axis/30 bg-hybrid_axis/5 p-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Network className="h-3.5 w-3.5 text-hybrid_axis" />
            Hybrid 策略狀態
          </div>
          <div className="mt-2 text-sm">
            {segment.derived?.is_hybrid_strategy ? (
              <span>
                <Badge variant="hybrid" className="mr-2">✓ 觸發</Badge>
                {matchedPattern && (
                  <span className="text-muted-foreground">
                    匹配模式：<span className="font-medium text-foreground">{matchedPattern.name}</span>
                  </span>
                )}
              </span>
            ) : (
              <Badge variant="secondary">未觸發</Badge>
            )}
          </div>
        </section>

        {/* Confidence */}
        <section>
          <Label>編碼信心度</Label>
          <div className="flex gap-1.5">
            {(["high", "medium", "low"] as const).map((c) => (
              <button
                key={c}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-xs",
                  segment.confidence === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted",
                )}
              >
                {c === "high" ? "高" : c === "medium" ? "中" : "低"}
              </button>
            ))}
          </div>
        </section>

        {/* Memo */}
        <section>
          <Label>
            <MessageSquare className="h-3.5 w-3.5" />
            備註（次要觸發、上下文等）
          </Label>
          <Textarea
            defaultValue={segment.memo ?? ""}
            placeholder="例：本段次要觸發 PJ4，因發言者亦質疑估價方法..."
            rows={3}
          />
        </section>

        {/* Interweaving */}
        {segment.derived?.is_hybrid_strategy && (
          <section>
            <Label>交織剖析（50–150 字）</Label>
            <Textarea
              defaultValue={segment.interweaving_analysis ?? ""}
              placeholder="說明（1）表層程序爭議（2）深層心理偏誤（3）二者結合機制..."
              rows={4}
            />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">
              {(segment.interweaving_analysis ?? "").length} / 150
            </div>
          </section>
        )}

        {/* AI assist */}
        <section className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI 結構化建議
            </div>
            <Badge variant="outline" className="text-[10px]">Sonnet 4.6</Badge>
          </div>
          <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>1. 發言者：私產權人</li>
            <li>2. 表層：援引「永和大陳」外部錨點 → PJ2</li>
            <li>3. 深層：歷史/外部數字驅動 → BE1</li>
            <li>4. Hybrid：✓ 表層 × 深層皆觸發</li>
            <li>5. 比對模式：錨點防衛模式</li>
          </ol>
          <Button size="sm" variant="outline" className="mt-3 w-full">
            套用 AI 建議
            <ChevronRight className="h-4 w-4" />
          </Button>
        </section>
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        <Button variant="outline" className="flex-1" size="sm">
          上一段
        </Button>
        <Button className="flex-1" size="sm">
          確認並繼續
        </Button>
      </div>
    </aside>
  );
}

function Label({ children, color }: { children: React.ReactNode; color?: "surface" | "deep" }) {
  return (
    <div
      className={cn(
        "mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider",
        color === "surface" ? "text-surface_axis" : color === "deep" ? "text-deep_axis" : "text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}

function CodeChips({
  axis,
  active,
}: {
  axis: (typeof dualLayerPJxBE.axes)[number];
  active?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {axis.codes.map((code) => (
          <button
            key={code.code}
            className={cn(
              "rounded-md border px-2 py-1 text-xs transition",
              active === code.code
                ? axis.color_token === "surface_axis"
                  ? "border-surface_axis bg-surface_axis/10 text-surface_axis"
                  : "border-deep_axis bg-deep_axis/10 text-deep_axis"
                : "border-border hover:bg-muted",
            )}
            title={code.definition}
          >
            <span className="font-mono">{code.code}</span>
            <span className="ml-1">{code.name}</span>
          </button>
        ))}
        <button className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
          無
        </button>
      </div>
    </div>
  );
}
