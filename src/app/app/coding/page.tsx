"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Save, MessageSquare, Network, Plus, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { dualLayerPJxBE } from "@/lib/codebook/builtin";
import { SAMPLE_DOCUMENT, SAMPLE_SEGMENTS } from "@/lib/seed/sample-segments";
import type { CodedSegment } from "@/lib/codebook/types";
import { cn } from "@/lib/utils";

/**
 * Active editing target. Either a stored CodedSegment (clicked an existing
 * highlight) or a transient new selection (dragged with the cursor).
 */
type Active =
  | { kind: "existing"; segment: CodedSegment }
  | { kind: "draft"; text: string; start: number; end: number; speaker?: string }
  | null;

export default function CodingWorkspacePage() {
  const codebook = dualLayerPJxBE;
  const fullText = SAMPLE_DOCUMENT.parsed_text;

  const [segments, setSegments] = useState<CodedSegment[]>(SAMPLE_SEGMENTS);
  const [active, setActive] = useState<Active>({ kind: "existing", segment: SAMPLE_SEGMENTS[0] });
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);

  const selectedSegmentId = active?.kind === "existing" ? active.segment.id : null;

  function selectExisting(s: CodedSegment) {
    setActive({ kind: "existing", segment: s });
    setPopover(null);
  }

  function selectDraft(d: { text: string; start: number; end: number; speaker?: string }) {
    setActive({ kind: "draft", ...d });
  }

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[1fr_400px] overflow-hidden">
      {/* Left: continuous text reader with cursor-selection support */}
      <div className="grid grid-rows-[auto_1fr_auto] overflow-hidden border-r border-border">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div>
            <div className="text-sm font-medium">{SAMPLE_DOCUMENT.name}</div>
            <div className="text-xs text-muted-foreground">
              編碼簿：{codebook.name}　·　{segments.length} 個已編碼片段
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

        <TextReader
          text={fullText}
          segments={segments}
          activeSegmentId={selectedSegmentId}
          onSelectExisting={selectExisting}
          onSelectDraft={selectDraft}
          onPopover={setPopover}
        />

        <ReaderFooter
          segments={segments}
          activeSegmentId={selectedSegmentId}
          onPick={selectExisting}
        />

        {popover && active?.kind === "draft" && (
          <SelectionPopover
            x={popover.x}
            y={popover.y}
            onDismiss={() => setPopover(null)}
            onApply={() => setPopover(null)}
          />
        )}
      </div>

      {/* Right: coding panel */}
      <CodingPanel
        active={active}
        codebook={codebook}
        onClear={() => setActive(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  TextReader — renders the document as continuous text with         *
 *  inline highlights for existing coded segments.                    *
 *  - Drag with cursor to create a new draft selection                *
 *  - Click an existing highlight to focus it                         *
 * ------------------------------------------------------------------ */

interface TextReaderProps {
  text: string;
  segments: CodedSegment[];
  activeSegmentId: string | null;
  onSelectExisting: (s: CodedSegment) => void;
  onSelectDraft: (d: { text: string; start: number; end: number; speaker?: string }) => void;
  onPopover: (p: { x: number; y: number } | null) => void;
}

function TextReader({
  text,
  segments,
  activeSegmentId,
  onSelectExisting,
  onSelectDraft,
  onPopover,
}: TextReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const pieces = useMemo(() => buildPieces(text, segments), [text, segments]);

  // Read the user's cursor selection on mouseup. Compute the global character
  // offsets by reading data-start on the span the selection landed inside.
  function handleMouseUp(e: React.MouseEvent) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      onPopover(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }
    const start = offsetFromNode(containerRef.current, range.startContainer, range.startOffset);
    const end = offsetFromNode(containerRef.current, range.endContainer, range.endOffset);
    if (start == null || end == null || start === end) return;
    const [s, t] = start < end ? [start, end] : [end, start];
    const selectedText = text.slice(s, t).trim();
    if (selectedText.length === 0) return;
    const actualStart = text.indexOf(selectedText, s);
    onSelectDraft({
      text: selectedText,
      start: actualStart === -1 ? s : actualStart,
      end: (actualStart === -1 ? s : actualStart) + selectedText.length,
      speaker: detectSpeaker(text, s),
    });
    // Position popover near the selection's bounding rect
    const rect = range.getBoundingClientRect();
    onPopover({ x: rect.left + rect.width / 2, y: rect.top });
  }

  // Clear selection state when clicking elsewhere
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Don't clear when clicking the popover itself
        const tgt = e.target as HTMLElement;
        if (tgt.closest("[data-strata-popover]")) return;
        // Keep selection but hide popover when clicking outside
        // onPopover(null);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [onPopover]);

  return (
    <div className="overflow-y-auto px-8 py-10 scrollbar-thin">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow mb-1">逐字稿</p>
        <p className="mb-6 text-xs text-muted-foreground">
          以游標拖曳選取任意片段以建立編碼；點擊既有底色片段以重新編輯。
        </p>
        <div
          ref={containerRef}
          onMouseUp={handleMouseUp}
          className="select-text whitespace-pre-wrap text-[15px] leading-[1.95] tracking-tightish text-foreground caret-foreground selection:bg-foreground/15"
          // Disable browser's auto-scroll-into-view on selection in some browsers
          style={{ wordBreak: "break-word" }}
        >
          {pieces.map((piece, idx) => {
            if (!piece.segment) {
              return (
                <span key={idx} data-start={piece.start} data-end={piece.end}>
                  {piece.text}
                </span>
              );
            }
            const seg = piece.segment;
            const surface = seg.applied.find((a) => a.axis_id === "surface")?.code;
            const deep = seg.applied.find((a) => a.axis_id === "deep")?.code;
            const isHybrid = !!(surface && deep);
            const isActive = seg.id === activeSegmentId;
            return (
              <span
                key={idx}
                data-start={piece.start}
                data-end={piece.end}
                data-seg-id={seg.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectExisting(seg);
                }}
                className={cn(
                  "cursor-pointer transition-colors",
                  isHybrid
                    ? "bg-hybrid_axis/12 border-b border-hybrid_axis/60 hover:bg-hybrid_axis/20"
                    : surface
                      ? "bg-surface_axis/12 border-b border-surface_axis/60 hover:bg-surface_axis/20"
                      : deep
                        ? "bg-deep_axis/10 border-b border-dashed border-deep_axis/60 hover:bg-deep_axis/18"
                        : "bg-muted",
                  isActive && "ring-1 ring-foreground/30 ring-offset-1 ring-offset-background",
                )}
                title={`${seg.speaker ?? ""}　${seg.applied.map((a) => a.code).join(" + ")}`}
              >
                {piece.text}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Pieces of the document text, split at coded-segment boundaries. */
interface Piece {
  start: number;
  end: number;
  text: string;
  segment?: CodedSegment;
}
function buildPieces(text: string, segments: CodedSegment[]): Piece[] {
  // Resolve overlaps by sorting and skipping any segment that overlaps the previous.
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const ranges: { start: number; end: number; segment: CodedSegment }[] = [];
  let lastEnd = -1;
  for (const s of sorted) {
    if (s.start < lastEnd) continue;
    ranges.push({ start: s.start, end: s.end, segment: s });
    lastEnd = s.end;
  }
  const pieces: Piece[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) {
      pieces.push({ start: cursor, end: r.start, text: text.slice(cursor, r.start) });
    }
    pieces.push({
      start: r.start,
      end: r.end,
      text: text.slice(r.start, r.end),
      segment: r.segment,
    });
    cursor = r.end;
  }
  if (cursor < text.length) {
    pieces.push({ start: cursor, end: text.length, text: text.slice(cursor) });
  }
  return pieces;
}

/** Walk up from a DOM node to find the wrapping <span data-start="…">. */
function offsetFromNode(
  root: HTMLElement,
  node: Node,
  offsetInNode: number,
): number | null {
  let el: Node | null = node;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.dataset.start !== undefined) {
      const base = parseInt(el.dataset.start, 10);
      if (Number.isNaN(base)) return null;
      return base + offsetInNode;
    }
    el = el.parentNode;
  }
  return null;
}

/** Best-effort: locate the most recent 「【某某】」 speaker tag before offset. */
function detectSpeaker(text: string, offset: number): string | undefined {
  const before = text.slice(0, offset);
  const m = before.match(/【([^】]{1,20})】[^【]*$/);
  return m?.[1];
}

/* ------------------------------------------------------------------ *
 *  Floating popover — appears near the user's selection,             *
 *  giving a quick "code this" action.                                *
 * ------------------------------------------------------------------ */

function SelectionPopover({
  x,
  y,
  onDismiss,
  onApply,
}: {
  x: number;
  y: number;
  onDismiss: () => void;
  onApply: () => void;
}) {
  return (
    <div
      data-strata-popover
      className="pointer-events-auto fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-sm border border-border bg-surface px-1.5 py-1 shadow-glow"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center gap-0.5">
        <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2" onClick={onApply}>
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">套用編碼</span>
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Reader footer — compact navigation through coded segments         *
 * ------------------------------------------------------------------ */

function ReaderFooter({
  segments,
  activeSegmentId,
  onPick,
}: {
  segments: CodedSegment[];
  activeSegmentId: string | null;
  onPick: (s: CodedSegment) => void;
}) {
  const idx = activeSegmentId ? segments.findIndex((s) => s.id === activeSegmentId) : -1;
  const prev = idx > 0 ? segments[idx - 1] : null;
  const next = idx >= 0 && idx < segments.length - 1 ? segments[idx + 1] : null;

  return (
    <footer className="flex items-center justify-between border-t border-border bg-surface px-6 py-2.5 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={!prev}
          onClick={() => prev && onPick(prev)}
          title="上一段"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span>
          {idx >= 0 ? `${idx + 1} / ${segments.length}` : `— / ${segments.length}`}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={!next}
          onClick={() => next && onPick(next)}
          title="下一段"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 bg-surface_axis/25 border-b border-surface_axis/60" />
          表層
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 bg-deep_axis/20 border-b border-dashed border-deep_axis/60" />
          深層
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 bg-hybrid_axis/25 border-b border-hybrid_axis/60" />
          Hybrid
        </span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ *
 *  Coding panel — drives the active draft or existing segment        *
 * ------------------------------------------------------------------ */

function CodingPanel({
  active,
  codebook,
  onClear,
}: {
  active: Active;
  codebook: typeof dualLayerPJxBE;
  onClear: () => void;
}) {
  const surface = codebook.axes.find((a) => a.axis_id === "surface")!;
  const deep = codebook.axes.find((a) => a.axis_id === "deep")!;

  const isDraft = active?.kind === "draft";
  const segment = active?.kind === "existing" ? active.segment : null;
  const draftText = active?.kind === "draft" ? active.text : null;
  const draftSpeaker = active?.kind === "draft" ? active.speaker : null;

  const surfaceCode = segment?.applied.find((a) => a.axis_id === "surface")?.code;
  const deepCode = segment?.applied.find((a) => a.axis_id === "deep")?.code;
  const matchedPattern = codebook.patterns?.find(
    (p) => p.surface_code === surfaceCode && p.deep_code === deepCode,
  );
  const isHybrid = !!segment?.derived?.is_hybrid_strategy;

  if (!active) {
    return (
      <aside className="flex flex-col items-center justify-center gap-3 bg-surface p-10 text-center">
        <p className="eyebrow">編碼面板</p>
        <p className="max-w-[260px] text-sm text-muted-foreground">
          以游標拖曳選取文本，或點擊既有底色片段，即可開始編碼。
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col overflow-hidden bg-surface">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <p className="eyebrow">{isDraft ? "新片段（草稿）" : "編輯片段"}</p>
          <div className="mt-0.5 text-sm font-medium">
            {isDraft ? draftSpeaker ?? "（未指定發言者）" : segment!.speaker}
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClear} title="關閉">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5 scrollbar-thin">
        {/* Selected text — now a passive view, the real selection happens in the middle */}
        <section>
          <SectionLabel>所選文本</SectionLabel>
          <div className="border-l-2 border-foreground/20 bg-muted/40 p-3 text-[13px] leading-relaxed text-foreground/90">
            {isDraft ? draftText : segment!.text}
          </div>
          {isDraft && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              位置：{(active as { start: number; end: number }).start}–{(active as { end: number }).end}
            </p>
          )}
        </section>

        <section>
          <SectionLabel color="surface">表層 — 程序正義</SectionLabel>
          <CodeChips axis={surface} active={surfaceCode} />
        </section>

        <section>
          <SectionLabel color="deep">深層 — 行為經濟學</SectionLabel>
          <CodeChips axis={deep} active={deepCode} />
        </section>

        <section className="border-t border-border pt-5">
          <div className="flex items-center gap-2 text-xs">
            <Network className="h-3.5 w-3.5 text-hybrid_axis" />
            <span className="font-medium text-hybrid_axis">Hybrid 策略</span>
          </div>
          <div className="mt-2 text-sm">
            {isHybrid ? (
              <span>
                <Badge variant="hybrid" className="mr-2">✓ 觸發</Badge>
                {matchedPattern && (
                  <span className="text-muted-foreground">
                    模式：<span className="font-medium text-foreground">{matchedPattern.name}</span>
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">尚未觸發</span>
            )}
          </div>
        </section>

        <section>
          <SectionLabel>編碼信心度</SectionLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {(["high", "medium", "low"] as const).map((c) => (
              <button
                key={c}
                className={cn(
                  "rounded-sm border px-2 py-1.5 text-xs",
                  segment?.confidence === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted",
                )}
              >
                {c === "high" ? "高" : c === "medium" ? "中" : "低"}
              </button>
            ))}
          </div>
        </section>

        <section>
          <SectionLabel>
            <MessageSquare className="h-3.5 w-3.5" /> 備註（次要觸發、上下文等）
          </SectionLabel>
          <Textarea
            defaultValue={segment?.memo ?? ""}
            placeholder="例：本段次要觸發 PJ4，因發言者亦質疑估價方法..."
            rows={3}
            key={(segment?.id ?? draftText) as string}
          />
        </section>

        {(isHybrid || isDraft) && (
          <section>
            <SectionLabel>交織剖析（50–150 字）</SectionLabel>
            <Textarea
              defaultValue={segment?.interweaving_analysis ?? ""}
              placeholder="說明（1）表層程序爭議（2）深層心理偏誤（3）二者結合機制..."
              rows={4}
              key={(segment?.id ?? draftText) + "-int"}
            />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">
              {(segment?.interweaving_analysis ?? "").length} / 150
            </div>
          </section>
        )}

        <section className="border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> AI 結構化建議
            </div>
            <Badge variant="outline" className="font-mono">Sonnet 4.6</Badge>
          </div>
          <ol className="mt-3 space-y-1 text-xs text-muted-foreground">
            <li>1. 發言者：私產權人</li>
            <li>2. 表層：援引「永和大陳」外部錨點 → PJ2</li>
            <li>3. 深層：歷史/外部數字驅動 → BE1</li>
            <li>4. Hybrid：✓ 表層 × 深層皆觸發</li>
            <li>5. 比對模式：錨點防衛模式</li>
          </ol>
          <Button size="sm" variant="outline" className="mt-3 w-full">
            套用 AI 建議
          </Button>
        </section>
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        <Button variant="outline" className="flex-1" size="sm" onClick={onClear}>
          取消
        </Button>
        <Button className="flex-1" size="sm">
          {isDraft ? "建立片段" : "儲存變更"}
        </Button>
      </div>
    </aside>
  );
}

function SectionLabel({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: "surface" | "deep";
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widish",
        color === "surface"
          ? "text-surface_axis"
          : color === "deep"
            ? "text-deep_axis"
            : "text-muted-foreground",
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
    <div className="flex flex-wrap gap-1.5">
      {axis.codes.map((code) => (
        <button
          key={code.code}
          className={cn(
            "rounded-sm border px-2 py-1 text-xs transition",
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
      <button className="rounded-sm border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
        無
      </button>
    </div>
  );
}
