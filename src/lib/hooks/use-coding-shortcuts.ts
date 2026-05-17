"use client";

import { useEffect } from "react";

/**
 * Build a key-hint map for code chips:
 *   axis index 0 (surface) → "1".."9","0"
 *   axis index 1 (deep)    → "q".."p" (top row)
 *   axis index 2+          → "a".."l"
 *
 * Returns a lookup keyed by `${axis_id}:${code}`.
 */
export function buildKeyHints(
  axes: { axis_id: string; codes: { code: string }[] }[],
): Map<string, string> {
  const map = new Map<string, string>();
  const rows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ];
  axes.forEach((axis, ai) => {
    const row = rows[ai] ?? [];
    axis.codes.forEach((code, ci) => {
      const key = row[ci];
      if (key) map.set(`${axis.axis_id}:${code.code}`, key);
    });
  });
  return map;
}

interface ShortcutBindings {
  onCodeKey: (axis_id: string, code: string) => void;
  onConfidence: (level: "high" | "medium" | "low") => void;
  onNext: () => void;
  onPrev: () => void;
  onEscape: () => void;
  onHelp: () => void;
  onDelete?: () => void;
}

/**
 * Wire keyboard shortcuts for the coding workspace. Skipped automatically
 * while the user is typing in an input or textarea.
 */
export function useCodingShortcuts(
  axes: { axis_id: string; codes: { code: string }[] }[],
  bindings: ShortcutBindings,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const keyMap = buildKeyHints(axes);
    const reverse = new Map<string, { axis_id: string; code: string }>();
    keyMap.forEach((key, idCode) => {
      const [axis_id, code] = idCode.split(":");
      reverse.set(key, { axis_id, code });
    });

    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();

      if (k === "?" || (e.shiftKey && k === "/")) {
        e.preventDefault();
        bindings.onHelp();
        return;
      }
      if (k === "escape") {
        bindings.onEscape();
        return;
      }
      if (k === "arrowright" || k === "n" || k === "j") {
        e.preventDefault();
        bindings.onNext();
        return;
      }
      if (k === "arrowleft" || k === "p" || k === "k") {
        e.preventDefault();
        bindings.onPrev();
        return;
      }
      if (k === "backspace" && bindings.onDelete) {
        e.preventDefault();
        bindings.onDelete();
        return;
      }

      // Confidence on Shift+H/M/L (Shift to avoid clashing with future code keys)
      if (e.shiftKey && (k === "h" || k === "m" || k === "l")) {
        e.preventDefault();
        bindings.onConfidence(k === "h" ? "high" : k === "m" ? "medium" : "low");
        return;
      }

      const hit = reverse.get(k);
      if (hit) {
        e.preventDefault();
        bindings.onCodeKey(hit.axis_id, hit.code);
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [axes, bindings, enabled]);
}
