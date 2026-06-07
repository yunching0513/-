"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStrata } from "@/lib/store/strata";
import type { Codebook, CodedSegment } from "@/lib/codebook/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  documentText: string;
  documentId: string;
  existingSegments: CodedSegment[];
  codebook: Codebook;
}

/**
 * Split a document into candidate segments for batch AI coding.
 *
 * Strategy: prefer 【speaker】tagged blocks (typical hearing transcripts);
 * fall back to paragraph splits (blank lines), or sentence-ish splits.
 * Skips ranges that already overlap with existing coded segments.
 */
interface Candidate {
  speaker?: string;
  text: string;
  start: number;
  end: number;
}

function buildCandidates(
  text: string,
  existing: CodedSegment[],
  opts: { min: number; max: number },
): Candidate[] {
  // Try speaker tags first
  const speakerRe = /[【(\[]([^】)\]：:]{1,20})[】)\]]\s*[：:]\s*/g;
  const matches: { idx: number; tagLen: number; speaker: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = speakerRe.exec(text)) !== null) {
    matches.push({ idx: m.index, tagLen: m[0].length, speaker: m[1].trim() });
  }

  let raw: Candidate[];
  if (matches.length >= 2) {
    raw = matches.map((mat, i) => {
      const start = mat.idx + mat.tagLen;
      const end = i + 1 < matches.length ? matches[i + 1].idx : text.length;
      return { speaker: mat.speaker, text: text.slice(start, end).trim(), start, end };
    });
  } else {
    // Fallback: paragraph splits (blank lines)
    const parts: Candidate[] = [];
    const re = /[^\n]+/g;
    let pm: RegExpExecArray | null;
    while ((pm = re.exec(text)) !== null) {
      const body = pm[0].trim();
      if (body.length === 0) continue;
      parts.push({
        text: body,
        start: pm.index,
        end: pm.index + pm[0].length,
      });
    }
    raw = parts;
  }

  // Filter: length bounds + not overlapping existing segments
  function overlapsExisting(c: Candidate) {
    return existing.some((s) => s.start < c.end && c.start < s.end);
  }
  return raw
    .filter((c) => c.text.length >= opts.min && c.text.length <= opts.max)
    .filter((c) => !overlapsExisting(c));
}

interface AiResult {
  reasoning: string[];
  suggested: { axis_id: string; code: string; rationale: string }[];
  pattern_id?: string;
  interweaving_analysis?: string;
  is_hybrid_strategy: boolean;
  confidence: "high" | "medium" | "low";
}

export function BatchPrecodeDialog({
  open,
  onClose,
  documentText,
  documentId,
  existingSegments,
  codebook,
}: Props) {
  const addSegment = useStrata((s) => s.addSegment);
  const toggleCode = useStrata((s) => s.toggleCode);
  const setConfidence = useStrata((s) => s.setConfidence);
  const setInterweaving = useStrata((s) => s.setInterweaving);
  const ai_tier = useStrata((s) => s.ai_tier);
  const ai_provider = useStrata((s) => s.ai_provider);
  const ai_api_key = useStrata((s) => s.ai_api_key);
  const ai_model = useStrata((s) => s.ai_model);

  const [phase, setPhase] = useState<"setup" | "running" | "done" | "cancelled">("setup");
  const [progress, setProgress] = useState(0);
  const [created, setCreated] = useState(0);
  const [errors, setErrors] = useState<{ candidate: Candidate; message: string }[]>([]);
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "medium" | "high">(
    "medium",
  );
  const [skipUncoded, setSkipUncoded] = useState(true);
  const cancelRef = useState({ current: false })[0];

  const candidates = useMemo(
    () =>
      open
        ? buildCandidates(documentText, existingSegments, { min: 8, max: 600 })
        : [],
    [open, documentText, existingSegments],
  );

  useEffect(() => {
    if (!open) {
      setPhase("setup");
      setProgress(0);
      setCreated(0);
      setErrors([]);
      cancelRef.current = false;
    }
  }, [open, cancelRef]);

  if (!open) return null;

  const modelLabel = buildModelLabel(ai_provider, ai_model, ai_tier);
  const estTokens = candidates.reduce((sum, c) => sum + Math.ceil(c.text.length * 1.5), 0);

  async function runBatch() {
    setPhase("running");
    setProgress(0);
    setCreated(0);
    setErrors([]);

    const passes = (level: "high" | "medium" | "low"): boolean => {
      if (confidenceFilter === "all") return true;
      if (confidenceFilter === "high") return level === "high";
      return level === "high" || level === "medium";
    };

    // Stop early if too many consecutive failures (likely a config issue:
    // missing API key, wrong model permission, etc.) — saves the user from
    // waiting for 100 requests to all 403.
    let consecutiveFailures = 0;
    const FAIL_FAST_THRESHOLD = 3;
    let abortReason: string | null = null;

    for (let i = 0; i < candidates.length; i++) {
      if (cancelRef.current) {
        setPhase("cancelled");
        return;
      }
      const c = candidates[i];
      try {
        const res = await fetch("/api/ai/suggest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: c.text,
            speaker: c.speaker,
            codebook_id: codebook.codebook_id,
            provider: ai_provider,
            model: ai_model || undefined,
            api_key: ai_api_key || undefined,
            tier: ai_tier,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as AiResult;
        consecutiveFailures = 0;

        const hasAny = data.suggested.length > 0;
        if (skipUncoded && !hasAny) {
          setProgress(i + 1);
          continue;
        }
        if (!passes(data.confidence)) {
          setProgress(i + 1);
          continue;
        }

        const seg = addSegment({
          text: c.text,
          start: c.start,
          end: c.end,
          speaker: c.speaker,
          document_id: documentId,
        });
        for (const s of data.suggested) {
          toggleCode(seg.id, s.axis_id, s.code);
        }
        setConfidence(seg.id, data.confidence);
        if (data.interweaving_analysis) {
          setInterweaving(seg.id, data.interweaving_analysis);
        }
        setCreated((n) => n + 1);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知錯誤";
        setErrors((es) => [...es, { candidate: c, message: msg }]);
        consecutiveFailures += 1;
        if (consecutiveFailures >= FAIL_FAST_THRESHOLD) {
          abortReason = msg;
          break;
        }
      }
      setProgress(i + 1);
    }

    if (abortReason) {
      setErrors((es) => [
        ...es,
        {
          candidate: { speaker: "", text: "", start: -1, end: -1 } as Candidate,
          message: `連續 ${FAIL_FAST_THRESHOLD} 次失敗，已中止以節省 API 用量。最後錯誤：${abortReason}`,
        },
      ]);
    }
    setPhase("done");
  }

  const cantStart = candidates.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
      <div
        className="w-full max-w-2xl border border-border bg-surface shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-foreground/70" />
            <h2 className="text-base font-medium">AI 批次預編碼</h2>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {phase === "setup" && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">
                  Strata 會掃描整份逐字稿，自動切出候選片段，請 Claude 依編碼簿的
                  Chain-of-Thought 流程逐一推理並建立編碼。已存在的編碼片段會被跳過。
                </p>
              </div>

              <div className="grid grid-cols-3 gap-px bg-border">
                <Stat label="候選片段" value={String(candidates.length)} />
                <Stat label="跳過（已編碼）" value={String(existingSegments.length)} />
                <Stat
                  label="估算 Token"
                  value={`${(estTokens / 1000).toFixed(1)}K`}
                  hint={`模型：${modelLabel}`}
                />
              </div>

              {cantStart && (
                <div className="flex items-start gap-2 border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    無候選片段。可能是文件太短、已全部編碼完，或無法切出符合長度範圍（8–600 字）的段落。
                  </span>
                </div>
              )}

              <fieldset className="space-y-2 border-t border-border pt-4">
                <legend className="eyebrow">篩選</legend>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={skipUncoded}
                    onChange={(e) => setSkipUncoded(e.target.checked)}
                  />
                  <span>跳過 AI 認為無需編碼的片段（建議勾選）</span>
                </label>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">僅自動套用：</div>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: "high", label: "高信心度" },
                        { id: "medium", label: "中信心度以上" },
                        { id: "all", label: "全部信心度" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setConfidenceFilter(opt.id)}
                        className={cn(
                          "rounded-sm border px-2.5 py-1 text-xs transition",
                          confidenceFilter === opt.id
                            ? "border-foreground bg-foreground text-background"
                            : "border-border hover:bg-muted",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </fieldset>
            </>
          )}

          {phase === "running" && (
            <>
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-foreground/70" />
                <div className="flex-1">
                  <div className="text-sm font-medium">推理中…</div>
                  <div className="text-xs text-muted-foreground">
                    {progress} / {candidates.length}　·　已建立 {created} 個編碼
                  </div>
                </div>
              </div>
              <div className="h-1 w-full overflow-hidden bg-muted">
                <div
                  className="h-full bg-foreground/70 transition-all"
                  style={{
                    width: `${candidates.length ? (progress / candidates.length) * 100 : 0}%`,
                  }}
                />
              </div>
              {errors.length > 0 && (
                <div className="text-xs text-destructive">
                  {errors.length} 個片段失敗（會繼續處理其餘）
                </div>
              )}
            </>
          )}

          {(phase === "done" || phase === "cancelled") && (
            <>
              <div className="grid grid-cols-3 gap-px bg-border">
                <Stat label="處理數" value={String(progress)} />
                <Stat label="新建編碼" value={String(created)} />
                <Stat label="失敗" value={String(errors.length)} />
              </div>
              {phase === "cancelled" && (
                <p className="text-xs text-muted-foreground">使用者已取消。</p>
              )}
              {errors.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    查看 {errors.length} 個錯誤
                  </summary>
                  <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto border border-border bg-muted/40 p-2">
                    {errors.slice(0, 20).map((e, i) => (
                      <li key={i} className="text-destructive">
                        {e.candidate.start >= 0 && (
                          <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">
                            位置 {e.candidate.start}
                          </span>
                        )}
                        <span className="break-words">{e.message}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
          {phase === "setup" && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                取消
              </Button>
              <Button size="sm" onClick={runBatch} disabled={cantStart}>
                <Sparkles className="h-3.5 w-3.5" />
                開始預編碼
              </Button>
            </>
          )}
          {phase === "running" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                cancelRef.current = true;
              }}
            >
              停止
            </Button>
          )}
          {(phase === "done" || phase === "cancelled") && (
            <Button size="sm" onClick={onClose}>
              完成
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface px-3 py-3 text-center">
      <div className="text-2xl font-light tracking-tightish">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function buildModelLabel(
  provider: "anthropic" | "openai" | "gemini",
  model: string,
  tier: "free" | "pro" | "institute",
): string {
  if (model) return model.replace(/-20\d{6}$/, "");
  if (provider === "openai") return "GPT-4o mini";
  if (provider === "gemini") return "Gemini 2.5 Flash";
  return tier === "free" ? "Haiku 4.5" : tier === "pro" ? "Sonnet 4.6" : "Opus 4.8";
}
