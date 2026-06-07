"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Save,
  MessageSquare,
  Network,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { BatchPrecodeDialog } from "@/components/coding/batch-precode-dialog";
import { ShortcutsHelp } from "@/components/coding/shortcuts-help";
import {
  useCodingShortcuts,
  buildKeyHints,
} from "@/lib/hooks/use-coding-shortcuts";
import {
  useStrata,
  useActiveCodebook,
  useActiveDocument,
  useActiveSegments,
} from "@/lib/store/strata";
import { callAiSuggest } from "@/lib/ai/call-suggest";
import type { Codebook, CodedSegment } from "@/lib/codebook/types";
import { cn } from "@/lib/utils";

type Active =
  | { kind: "existing"; segment_id: string }
  | { kind: "draft"; text: string; start: number; end: number; speaker?: string }
  | null;

export default function CodingWorkspacePage() {
  const codebook = useActiveCodebook();
  const document = useActiveDocument();
  const segments = useActiveSegments();

  const [active, setActive] = useState<Active>(
    segments[0] ? { kind: "existing", segment_id: segments[0].id } : null,
  );
  const [popover, setPopover] = useState<{ x: number; y: number } | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Store actions for shortcut handlers
  const toggleCode = useStrata((s) => s.toggleCode);
  const setConfidence = useStrata((s) => s.setConfidence);
  const removeSegmentAction = useStrata((s) => s.removeSegment);

  // If the focused existing segment gets removed, clear focus
  useEffect(() => {
    if (active?.kind === "existing" && !segments.find((s) => s.id === active.segment_id)) {
      setActive(null);
    }
  }, [segments, active]);

  const selectedSegmentId = active?.kind === "existing" ? active.segment_id : null;
  const activeSegment =
    active?.kind === "existing" ? segments.find((s) => s.id === active.segment_id) ?? null : null;

  function selectExisting(id: string) {
    setActive({ kind: "existing", segment_id: id });
    setPopover(null);
  }

  function selectDraft(d: { text: string; start: number; end: number; speaker?: string }) {
    setActive({ kind: "draft", ...d });
  }

  // Wire keyboard shortcuts (only when an existing segment is focused)
  useCodingShortcuts(
    codebook.axes,
    {
      onCodeKey: (axis_id, code) => {
        if (active?.kind === "existing") {
          toggleCode(active.segment_id, axis_id, code);
        }
      },
      onConfidence: (level) => {
        if (active?.kind === "existing") {
          setConfidence(active.segment_id, level);
        }
      },
      onNext: () => {
        const idx = selectedSegmentId
          ? segments.findIndex((s) => s.id === selectedSegmentId)
          : -1;
        const nx = segments[idx + 1] ?? segments[0];
        if (nx) selectExisting(nx.id);
      },
      onPrev: () => {
        const idx = selectedSegmentId
          ? segments.findIndex((s) => s.id === selectedSegmentId)
          : -1;
        const pv = idx > 0 ? segments[idx - 1] : segments[segments.length - 1];
        if (pv) selectExisting(pv.id);
      },
      onEscape: () => {
        if (helpOpen) setHelpOpen(false);
        else if (batchOpen) setBatchOpen(false);
        else setActive(null);
      },
      onHelp: () => setHelpOpen((o) => !o),
      onDelete:
        active?.kind === "existing"
          ? () => {
              if (confirm("刪除此片段？此操作無法復原。")) {
                removeSegmentAction(active.segment_id);
              }
            }
          : undefined,
    },
    !batchOpen && !helpOpen,
  );

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[1fr_400px] overflow-hidden">
      <div className="grid grid-rows-[auto_1fr_auto] overflow-hidden border-r border-border">
        <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div>
            <div className="text-sm font-medium">{document.name}</div>
            <div className="text-xs text-muted-foreground">
              編碼簿：{codebook.name}　·　{segments.length} 個已編碼片段
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setBatchOpen(true)}>
              <Sparkles className="h-4 w-4" />
              AI 預編碼整份
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setHelpOpen(true)}
              title="鍵盤快捷鍵（?）"
            >
              <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                ?
              </kbd>
              <span className="text-xs text-muted-foreground">快捷鍵</span>
            </Button>
            <Button size="sm" variant="ghost" disabled>
              <Save className="h-4 w-4" />
              已自動儲存
            </Button>
          </div>
        </header>

        <TextReader
          text={document.parsed_text}
          segments={segments}
          activeSegmentId={selectedSegmentId}
          onSelectExisting={selectExisting}
          onSelectDraft={selectDraft}
          onPopover={setPopover}
        />

        <ReaderFooter
          segments={segments}
          activeSegmentId={selectedSegmentId}
          onPick={(s) => selectExisting(s.id)}
        />

        {popover && active?.kind === "draft" && (
          <SelectionPopover
            x={popover.x}
            y={popover.y}
            onDismiss={() => setPopover(null)}
            draft={active}
            codebook={codebook}
            onAfterApply={(id) => {
              selectExisting(id);
            }}
          />
        )}
      </div>

      <CodingPanel
        active={active}
        activeSegment={activeSegment}
        codebook={codebook}
        onClear={() => setActive(null)}
        onCreatedFromDraft={(id) => selectExisting(id)}
      />

      <BatchPrecodeDialog
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        documentText={document.parsed_text}
        documentId={document.id}
        existingSegments={segments}
        codebook={codebook}
      />

      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} codebook={codebook} />
    </div>
  );
}

/* ----- Text reader (continuous selectable) ----- */

interface TextReaderProps {
  text: string;
  segments: CodedSegment[];
  activeSegmentId: string | null;
  onSelectExisting: (id: string) => void;
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

  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      onPopover(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;
    const start = offsetFromNode(containerRef.current, range.startContainer, range.startOffset);
    const end = offsetFromNode(containerRef.current, range.endContainer, range.endOffset);
    if (start == null || end == null || start === end) return;
    const [s, t] = start < end ? [start, end] : [end, start];
    const selectedText = text.slice(s, t).trim();
    if (selectedText.length === 0) return;
    const actualStart = text.indexOf(selectedText, s);
    const finalStart = actualStart === -1 ? s : actualStart;
    onSelectDraft({
      text: selectedText,
      start: finalStart,
      end: finalStart + selectedText.length,
      speaker: detectSpeaker(text, finalStart),
    });
    const rect = range.getBoundingClientRect();
    onPopover({ x: rect.left + rect.width / 2, y: rect.top });
  }

  return (
    <div className="overflow-y-auto px-8 py-10 scrollbar-thin">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow mb-1">逐字稿</p>
        <p className="mb-6 text-xs text-muted-foreground">
          以游標拖曳選取任意片段建立編碼；點擊既有底色片段以重新編輯。
        </p>
        <div
          ref={containerRef}
          onMouseUp={handleMouseUp}
          className="select-text whitespace-pre-wrap text-[15px] leading-[1.95] tracking-tightish text-foreground caret-foreground selection:bg-foreground/15"
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
            const hasAny = seg.applied.length > 0;
            const isActive = seg.id === activeSegmentId;
            return (
              <span
                key={idx}
                data-start={piece.start}
                data-end={piece.end}
                data-seg-id={seg.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectExisting(seg.id);
                }}
                className={cn(
                  "cursor-pointer transition-colors",
                  isHybrid
                    ? "bg-hybrid_axis/12 border-b border-hybrid_axis/60 hover:bg-hybrid_axis/20"
                    : surface
                      ? "bg-surface_axis/12 border-b border-surface_axis/60 hover:bg-surface_axis/20"
                      : deep
                        ? "bg-deep_axis/10 border-b border-dashed border-deep_axis/60 hover:bg-deep_axis/18"
                        : hasAny
                          ? "bg-muted border-b border-muted-foreground/30"
                          : "bg-muted/60 border-b border-dashed border-muted-foreground/40",
                  isActive && "ring-1 ring-foreground/40 ring-offset-1 ring-offset-background",
                )}
                title={`${seg.speaker ?? ""}　${seg.applied.map((a) => a.code).join(" + ") || "未編碼"}`}
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

interface Piece {
  start: number;
  end: number;
  text: string;
  segment?: CodedSegment;
}
function buildPieces(text: string, segments: CodedSegment[]): Piece[] {
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

function detectSpeaker(text: string, offset: number): string | undefined {
  const before = text.slice(0, offset);
  const m = before.match(/【([^】]{1,20})】[^【]*$/);
  return m?.[1];
}

/* ----- Floating popover near selection ----- */

function SelectionPopover({
  x,
  y,
  onDismiss,
  draft,
  codebook,
  onAfterApply,
}: {
  x: number;
  y: number;
  onDismiss: () => void;
  draft: { text: string; start: number; end: number; speaker?: string };
  codebook: Codebook;
  onAfterApply: (id: string) => void;
}) {
  const addSegment = useStrata((s) => s.addSegment);
  return (
    <div
      data-strata-popover
      className="pointer-events-auto fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-sm border border-border bg-surface px-1.5 py-1 shadow-glow"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 px-2"
          onClick={() => {
            const seg = addSegment({
              text: draft.text,
              start: draft.start,
              end: draft.end,
              speaker: draft.speaker,
            });
            onAfterApply(seg.id);
            onDismiss();
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">建立片段並編碼</span>
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDismiss}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <span className="sr-only">
        codebook: {codebook.codebook_id}
      </span>
    </div>
  );
}

/* ----- Footer ----- */

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
          <span className="h-2.5 w-3 border-b border-surface_axis/60 bg-surface_axis/25" />
          表層
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 border-b border-dashed border-deep_axis/60 bg-deep_axis/20" />
          深層
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 border-b border-hybrid_axis/60 bg-hybrid_axis/25" />
          Hybrid
        </span>
      </div>
    </footer>
  );
}

/* ----- Coding panel (right) ----- */

function CodingPanel({
  active,
  activeSegment,
  codebook,
  onClear,
  onCreatedFromDraft,
}: {
  active: Active;
  activeSegment: CodedSegment | null;
  codebook: Codebook;
  onClear: () => void;
  onCreatedFromDraft: (id: string) => void;
}) {
  const surface = codebook.axes.find((a) => a.axis_id === "surface")!;
  const deep = codebook.axes.find((a) => a.axis_id === "deep")!;
  const addSegment = useStrata((s) => s.addSegment);
  const removeSegment = useStrata((s) => s.removeSegment);
  const toggleCode = useStrata((s) => s.toggleCode);
  const clearAxis = useStrata((s) => s.clearAxis);
  const setConfidence = useStrata((s) => s.setConfidence);
  const setMemo = useStrata((s) => s.setMemo);
  const setInterweaving = useStrata((s) => s.setInterweaving);
  const keyHints = useMemo(() => buildKeyHints(codebook.axes), [codebook.axes]);

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

  if (active.kind === "draft") {
    return (
      <aside className="flex flex-col overflow-hidden bg-surface">
        <PanelHeader title="新片段（草稿）" subtitle={active.speaker ?? "（未指定發言者）"} onClose={onClear} />
        <div className="flex-1 space-y-6 overflow-y-auto p-5 scrollbar-thin">
          <SelectedText text={active.text} subtle={`位置：${active.start}–${active.end}`} />
          <p className="text-xs text-muted-foreground">
            草稿尚未建立。按下方「建立片段」後，編碼、信心度、Memo 才會啟用。
          </p>
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <Button variant="outline" className="flex-1" size="sm" onClick={onClear}>
            取消
          </Button>
          <Button
            className="flex-1"
            size="sm"
            onClick={() => {
              const seg = addSegment(active);
              onCreatedFromDraft(seg.id);
            }}
          >
            建立片段
          </Button>
        </div>
      </aside>
    );
  }

  if (!activeSegment) return null;
  const seg = activeSegment;
  const surfaceCode = seg.applied.find((a) => a.axis_id === "surface")?.code;
  const deepCode = seg.applied.find((a) => a.axis_id === "deep")?.code;
  const matchedPattern = codebook.patterns?.find(
    (p) => p.surface_code === surfaceCode && p.deep_code === deepCode,
  );
  const isHybrid = !!seg.derived?.is_hybrid_strategy;

  return (
    <aside className="flex flex-col overflow-hidden bg-surface">
      <PanelHeader
        title="編輯片段"
        subtitle={seg.speaker ?? "（未指定發言者）"}
        onClose={onClear}
        actions={
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (confirm("刪除此片段？此操作無法復原。")) removeSegment(seg.id);
            }}
            title="刪除片段"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        }
      />

      <div className="flex-1 space-y-6 overflow-y-auto p-5 scrollbar-thin">
        <SelectedText text={seg.text} />

        <section>
          <SectionLabel color="surface">
            表層 — 程序正義
            {surfaceCode && (
              <button
                onClick={() => clearAxis(seg.id, "surface")}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
              >
                清除
              </button>
            )}
          </SectionLabel>
          <CodeChips
            axis={surface}
            active={surfaceCode}
            keyHints={keyHints}
            onPick={(code) => toggleCode(seg.id, "surface", code)}
          />
        </section>

        <section>
          <SectionLabel color="deep">
            深層 — 行為經濟學
            {deepCode && (
              <button
                onClick={() => clearAxis(seg.id, "deep")}
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
              >
                清除
              </button>
            )}
          </SectionLabel>
          <CodeChips
            axis={deep}
            active={deepCode}
            keyHints={keyHints}
            onPick={(code) => toggleCode(seg.id, "deep", code)}
          />
        </section>

        <section className="border-t border-border pt-5">
          <div className="flex items-center gap-2 text-xs">
            <Network className="h-3.5 w-3.5 text-hybrid_axis" />
            <span className="font-medium text-hybrid_axis">Hybrid 策略</span>
          </div>
          <div className="mt-2 text-sm">
            {isHybrid ? (
              <span>
                <Badge variant="hybrid" className="mr-2">
                  ✓ 觸發
                </Badge>
                {matchedPattern ? (
                  <span className="text-muted-foreground">
                    模式：
                    <span className="font-medium text-foreground">{matchedPattern.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">未匹配內建模式</span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">尚未觸發（表層與深層需皆有編碼）</span>
            )}
          </div>
        </section>

        <section>
          <SectionLabel>編碼信心度</SectionLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {(["high", "medium", "low"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setConfidence(seg.id, seg.confidence === c ? null : c)}
                className={cn(
                  "rounded-sm border px-2 py-1.5 text-xs transition",
                  seg.confidence === c
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
            key={seg.id + "-memo"}
            defaultValue={seg.memo ?? ""}
            onBlur={(e) => setMemo(seg.id, e.target.value)}
            placeholder="例：本段次要觸發 PJ4，因發言者亦質疑估價方法..."
            rows={3}
          />
        </section>

        {isHybrid && (
          <section>
            <SectionLabel>交織剖析（50–150 字）</SectionLabel>
            <Textarea
              key={seg.id + "-int"}
              defaultValue={seg.interweaving_analysis ?? ""}
              onChange={(e) => {
                // Live char counter
                const next = e.currentTarget.parentElement?.querySelector(
                  "[data-int-counter]",
                );
                if (next) next.textContent = `${e.target.value.length} / 150`;
              }}
              onBlur={(e) => setInterweaving(seg.id, e.target.value)}
              placeholder="說明（1）表層程序爭議（2）深層心理偏誤（3）二者結合機制..."
              rows={4}
            />
            <div
              data-int-counter
              className="mt-1 text-right text-[10px] text-muted-foreground"
            >
              {(seg.interweaving_analysis ?? "").length} / 150
            </div>
          </section>
        )}

        <AiSuggestSection segment={seg} codebook={codebook} />
      </div>
    </aside>
  );
}

function PanelHeader({
  title,
  subtitle,
  onClose,
  actions,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3">
      <div className="min-w-0">
        <p className="eyebrow">{title}</p>
        <div className="mt-0.5 truncate text-sm font-medium">{subtitle}</div>
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose} title="關閉">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SelectedText({ text, subtle }: { text: string; subtle?: string }) {
  return (
    <section>
      <SectionLabel>所選文本</SectionLabel>
      <div className="border-l-2 border-foreground/20 bg-muted/40 p-3 text-[13px] leading-relaxed text-foreground/90">
        {text}
      </div>
      {subtle && <p className="mt-1.5 text-[11px] text-muted-foreground">{subtle}</p>}
    </section>
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
  onPick,
  keyHints,
}: {
  axis: Codebook["axes"][number];
  active?: string;
  onPick: (code: string) => void;
  keyHints?: Map<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {axis.codes.map((code) => {
        const hint = keyHints?.get(`${axis.axis_id}:${code.code}`);
        const isActive = active === code.code;
        return (
          <button
            key={code.code}
            onClick={() => onPick(code.code)}
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs transition",
              isActive
                ? axis.color_token === "surface_axis"
                  ? "border-surface_axis bg-surface_axis/10 text-surface_axis"
                  : "border-deep_axis bg-deep_axis/10 text-deep_axis"
                : "border-border hover:bg-muted",
            )}
            title={`${code.definition}${hint ? `\n快捷鍵：${hint.toUpperCase()}` : ""}`}
          >
            {hint && (
              <kbd
                className={cn(
                  "inline-flex h-4 min-w-[14px] items-center justify-center rounded-sm border px-1 font-mono text-[9px]",
                  isActive
                    ? "border-current/40 bg-background/60"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {hint.toUpperCase()}
              </kbd>
            )}
            <span className="font-mono">{code.code}</span>
            <span>{code.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ----- AI suggest section ----- */

interface AiResult {
  reasoning: string[];
  suggested: { axis_id: string; code: string; rationale: string }[];
  pattern_id?: string;
  interweaving_analysis?: string;
  is_hybrid_strategy: boolean;
  confidence: "high" | "medium" | "low";
}

function AiSuggestSection({
  segment,
  codebook,
}: {
  segment: CodedSegment;
  codebook: Codebook;
}) {
  const toggleCode = useStrata((s) => s.toggleCode);
  const setConfidence = useStrata((s) => s.setConfidence);
  const setInterweaving = useStrata((s) => s.setInterweaving);
  const ai_tier = useStrata((s) => s.ai_tier);
  const ai_provider = useStrata((s) => s.ai_provider);
  const ai_api_key = useStrata((s) => s.ai_api_key);
  const ai_model = useStrata((s) => s.ai_model);
  const user_codebooks = useStrata((s) => s.userCodebooks);

  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setStatus("loading");
    setError(null);
    try {
      const data = (await callAiSuggest({
        text: segment.text,
        speaker: segment.speaker,
        codebook_id: codebook.codebook_id,
        provider: ai_provider,
        model: ai_model || undefined,
        api_key: ai_api_key || undefined,
        user_codebooks: user_codebooks,
      })) as AiResult;
      setResult(data);
      setStatus("ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知錯誤");
      setStatus("error");
    }
  }

  function applyAll() {
    if (!result) return;
    for (const s of result.suggested) {
      const current = segment.applied.find((a) => a.axis_id === s.axis_id);
      if (current?.code !== s.code) {
        toggleCode(segment.id, s.axis_id, s.code);
      }
    }
    setConfidence(segment.id, result.confidence);
    if (result.interweaving_analysis) {
      setInterweaving(segment.id, result.interweaving_analysis);
    }
  }

  const modelLabel = buildAiLabel(ai_provider, ai_model, ai_tier);

  return (
    <section className="border border-border bg-muted/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5" /> AI 結構化建議
        </div>
        <Badge variant="outline" className="font-mono">
          {modelLabel}
        </Badge>
      </div>

      {status === "idle" && (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            請 Claude 依此編碼簿的 Chain-of-Thought 流程逐步推理並建議編碼。
          </p>
          <Button size="sm" variant="outline" className="mt-3 w-full" onClick={run}>
            取得 AI 建議
          </Button>
        </>
      )}

      {status === "loading" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          推理中…通常需要 5–15 秒
        </div>
      )}

      {status === "error" && (
        <div className="mt-3 space-y-2">
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-medium">無法取得 AI 建議</div>
              <div className="mt-0.5 text-destructive/80">{error}</div>
              {error?.includes("ANTHROPIC_API_KEY") && (
                <div className="mt-1.5 text-destructive/60">
                  請於專案根目錄 .env.local 加入 ANTHROPIC_API_KEY=...
                </div>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={run}>
            重試
          </Button>
        </div>
      )}

      {status === "ok" && result && (
        <div className="mt-3 space-y-3">
          <ol className="space-y-1 text-xs text-muted-foreground">
            {result.reasoning.map((r, i) => (
              <li key={i}>
                {i + 1}. {r}
              </li>
            ))}
          </ol>
          <div className="space-y-1.5 border-t border-border pt-2">
            <div className="text-[11px] font-medium uppercase tracking-widish text-muted-foreground">
              建議
            </div>
            {result.suggested.map((s) => {
              const axisDef = codebook.axes.find((a) => a.axis_id === s.axis_id);
              const codeDef = axisDef?.codes.find((c) => c.code === s.code);
              return (
                <div
                  key={`${s.axis_id}-${s.code}`}
                  className="flex items-start gap-2 text-xs"
                >
                  <Badge
                    variant={s.axis_id === "surface" ? "surface" : "deep"}
                    className="shrink-0 font-mono"
                  >
                    {s.code}
                  </Badge>
                  <div>
                    <div className="font-medium">{codeDef?.name ?? s.code}</div>
                    <div className="text-muted-foreground">{s.rationale}</div>
                  </div>
                </div>
              );
            })}
            {result.is_hybrid_strategy && result.pattern_id && (
              <div className="pt-1 text-xs">
                <span className="text-muted-foreground">Hybrid 模式：</span>
                <span className="font-medium text-hybrid_axis">
                  {codebook.patterns?.find((p) => p.pattern_id === result.pattern_id)?.name ??
                    result.pattern_id}
                </span>
              </div>
            )}
            {result.interweaving_analysis && (
              <p className="border-l-2 border-foreground/15 pl-2 text-xs italic text-muted-foreground">
                {result.interweaving_analysis}
              </p>
            )}
            <div className="pt-1 text-xs">
              <span className="text-muted-foreground">信心度：</span>
              <span className="font-medium">
                {result.confidence === "high"
                  ? "高"
                  : result.confidence === "medium"
                    ? "中"
                    : "低"}
              </span>
            </div>
          </div>
          <div className="flex gap-2 border-t border-border pt-2">
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => setStatus("idle")}>
              關閉
            </Button>
            <Button size="sm" className="flex-1" onClick={applyAll}>
              全部套用
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function buildAiLabel(
  provider: "anthropic" | "openai" | "gemini" | "taide",
  model: string,
  tier: "free" | "pro" | "institute",
): string {
  if (model) return model.replace(/-20\d{6}$/, "");
  if (provider === "openai") return "GPT-4o mini";
  if (provider === "gemini") return "Gemini 2.5 Flash";
  if (provider === "taide") return "TAIDE 8B";
  return tier === "free" ? "Haiku 4.5" : tier === "pro" ? "Sonnet 4.6" : "Opus 4.8";
}
