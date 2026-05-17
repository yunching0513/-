"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Codebook } from "@/lib/codebook/types";
import { buildKeyHints } from "@/lib/hooks/use-coding-shortcuts";

export function ShortcutsHelp({
  open,
  onClose,
  codebook,
}: {
  open: boolean;
  onClose: () => void;
  codebook: Codebook;
}) {
  if (!open) return null;
  const keyHints = buildKeyHints(codebook.axes);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl border border-border bg-surface shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-medium">鍵盤快捷鍵</h2>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
          <Group title="導覽">
            <Row k={["N", "→", "J"]} desc="下一段已編碼片段" />
            <Row k={["P", "←", "K"]} desc="上一段已編碼片段" />
            <Row k={["Esc"]} desc="關閉編碼面板" />
            <Row k={["⌫"]} desc="刪除當前片段（含確認）" />
            <Row k={["?"]} desc="開啟此說明" />
          </Group>

          <Group title="信心度（Shift +）">
            <Row k={["⇧H"]} desc="高" />
            <Row k={["⇧M"]} desc="中" />
            <Row k={["⇧L"]} desc="低" />
          </Group>

          {codebook.axes.map((axis) => (
            <Group key={axis.axis_id} title={axis.name}>
              {axis.codes.map((code) => {
                const key = keyHints.get(`${axis.axis_id}:${code.code}`);
                return (
                  <Row
                    key={code.code}
                    k={key ? [key.toUpperCase()] : []}
                    desc={`${code.code} · ${code.name}`}
                    color={
                      axis.color_token === "surface_axis"
                        ? "surface"
                        : axis.color_token === "deep_axis"
                          ? "deep"
                          : undefined
                    }
                  />
                );
              })}
            </Group>
          ))}
        </div>

        <div className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
          快捷鍵在編碼工作台全域生效；於文字輸入框中會自動暫停。
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="eyebrow mb-3">{title}</h3>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Row({
  k,
  desc,
  color,
}: {
  k: string[];
  desc: string;
  color?: "surface" | "deep";
}) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="flex w-20 shrink-0 items-center gap-1">
        {k.length === 0 ? (
          <span className="text-[10px] text-muted-foreground">—</span>
        ) : (
          k.map((key, i) => (
            <kbd
              key={i}
              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-sm border border-border bg-muted px-1.5 font-mono text-[10px] text-foreground"
            >
              {key}
            </kbd>
          ))
        )}
      </span>
      <span
        className={
          color === "surface"
            ? "text-surface_axis"
            : color === "deep"
              ? "text-deep_axis"
              : ""
        }
      >
        {desc}
      </span>
    </li>
  );
}
