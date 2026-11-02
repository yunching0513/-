"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * CoachTour — lightweight spotlight walkthrough with zero dependencies.
 *
 * Each step targets an element carrying `data-tour="<key>"`. The component
 * dims everything except the target (using a huge box-shadow spread on the
 * highlight ring) and positions an explanation card next to it. Steps with
 * no matching element are skipped automatically, so the same tour definition
 * survives layout changes.
 */

export interface TourStep {
  /** matches [data-tour="..."]; empty string = centered modal step */
  target: string;
  title: string;
  body: string;
  /** optional hint shown in smaller type below the body */
  hint?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function CoachTour({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: (completed: boolean) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  const step = steps[idx];

  const measure = useCallback(() => {
    if (!step) return;
    if (!step.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Scroll target into view, then measure (and re-measure on scroll/resize)
  useLayoutEffect(() => {
    if (!open || !step) return;
    if (step.target) {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      el?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    }
    measure();
    const onMove = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, step, measure]);

  useEffect(() => {
    if (open) setIdx(0);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(false);
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx]);

  if (!open || !step) return null;

  function next() {
    if (idx >= steps.length - 1) {
      onClose(true);
    } else {
      setIdx((i) => i + 1);
    }
  }
  function prev() {
    setIdx((i) => Math.max(0, i - 1));
  }

  const PAD = 8;
  const highlight = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Card placement: below target if room, else above; centered when no target
  const CARD_W = 340;
  let cardStyle: React.CSSProperties;
  if (highlight) {
    const spaceBelow = window.innerHeight - (highlight.top + highlight.height);
    const top =
      spaceBelow > 220
        ? highlight.top + highlight.height + 12
        : Math.max(12, highlight.top - 212);
    const left = Math.min(
      Math.max(12, highlight.left),
      window.innerWidth - CARD_W - 12,
    );
    cardStyle = { top, left, width: CARD_W };
  } else {
    cardStyle = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: CARD_W,
    };
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Dim + spotlight. The ring's giant shadow dims everything around it. */}
      {highlight ? (
        <div
          className="pointer-events-none absolute rounded-md border-2 border-foreground/70 transition-all duration-200"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            boxShadow: "0 0 0 9999px hsl(30 17% 11% / 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-foreground/55" />
      )}
      {/* Click shield (block interactions during tour) */}
      <div className="absolute inset-0" onClick={next} />

      {/* Card */}
      <div
        className="absolute border border-border bg-surface p-5 shadow-glow"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="eyebrow">
            {idx + 1} / {steps.length}
          </p>
          <button
            onClick={() => onClose(false)}
            className="text-muted-foreground hover:text-foreground"
            title="結束教學（Esc）"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-1 text-base font-medium tracking-tightish">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">{step.body}</p>
        {step.hint && (
          <p className="mt-2 text-[11px] text-muted-foreground">{step.hint}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 w-4 rounded-full transition",
                  i === idx ? "bg-foreground" : "bg-border",
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {idx > 0 && (
              <Button size="sm" variant="ghost" onClick={prev}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {idx >= steps.length - 1 ? "完成" : "下一步"}
              {idx < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
