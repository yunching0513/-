"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Upload,
  BookOpen,
  Layers,
  Check,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BUILTIN_CODEBOOKS } from "@/lib/codebook/builtin";
import { parseCodebookJson } from "@/lib/codebook/import";
import { parseCodebookCsv } from "@/lib/codebook/csv-import";
import { useStrata } from "@/lib/store/strata";
import type { Codebook } from "@/lib/codebook/types";
import { cn } from "@/lib/utils";

export default function CodebookLibraryPage() {
  const activeId = useStrata((s) => s.codebook_id);
  const setCodebook = useStrata((s) => s.setCodebook);
  const userCodebooks = useStrata((s) => s.userCodebooks);
  const addUserCodebook = useStrata((s) => s.addUserCodebook);
  const removeUserCodebook = useStrata((s) => s.removeUserCodebook);

  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.toLowerCase().split(".").pop();
    try {
      const text = await file.text();
      let cb;
      if (ext === "csv" || ext === "tsv") {
        cb = parseCodebookCsv(text, file.name);
      } else if (ext === "json") {
        cb = parseCodebookJson(JSON.parse(text));
      } else {
        // Fall back: try JSON first, then CSV
        try {
          cb = parseCodebookJson(JSON.parse(text));
        } catch {
          cb = parseCodebookCsv(text, file.name);
        }
      }
      addUserCodebook(cb);
      setError(null);
      setCodebook(cb.codebook_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知錯誤");
    }
  }

  return (
    <div className="space-y-10 p-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow mb-2">編碼簿</p>
          <h1 className="text-3xl font-light tracking-tightish">編碼簿庫</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            選擇內建編碼簿，或匯入你自己的（JSON 或 CSV 格式）。
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          匯入編碼簿
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.csv,.tsv,application/json,text/csv"
          className="hidden"
          onChange={(e) => handleImport(e.target.files)}
        />
      </header>

      {error && (
        <div className="flex items-start gap-3 border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">匯入失敗</div>
            <div className="mt-1 text-xs">{error}</div>
            <div className="mt-2 text-xs text-destructive/70">
              請參考{" "}
              <Link href="/app/codebook/dual-layer-pj-be-v3" className="underline">
                內建編碼簿格式
              </Link>
              {" "}或下載匯出的 JSON 作為樣板。
            </div>
          </div>
        </div>
      )}

      <section>
        <h2 className="eyebrow mb-4">內建編碼簿</h2>
        <div className="grid gap-px bg-border md:grid-cols-2">
          {BUILTIN_CODEBOOKS.map((cb) => (
            <CodebookCard
              key={cb.codebook_id}
              cb={cb}
              isActive={cb.codebook_id === activeId}
              onActivate={() => setCodebook(cb.codebook_id)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-4">你的編碼簿</h2>
        {userCodebooks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              尚未匯入自訂編碼簿。
              <button
                onClick={() => inputRef.current?.click()}
                className="ml-1 underline underline-offset-2 hover:text-foreground"
              >
                立即匯入 JSON 或 CSV
              </button>
              {" "}— 或在編碼簿詳細頁點「下載 CSV」當樣板修改，或「複製為自訂版本」作為起點。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-px bg-border md:grid-cols-2">
            {userCodebooks.map((cb) => (
              <CodebookCard
                key={cb.codebook_id}
                cb={cb}
                isActive={cb.codebook_id === activeId}
                onActivate={() => setCodebook(cb.codebook_id)}
                onRemove={() => {
                  if (confirm(`移除「${cb.name}」？`)) removeUserCodebook(cb.codebook_id);
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CodebookCard({
  cb,
  isActive,
  onActivate,
  onRemove,
}: {
  cb: Codebook;
  isActive: boolean;
  onActivate: () => void;
  onRemove?: () => void;
}) {
  const totalCodes = cb.axes.reduce((sum, a) => sum + a.codes.length, 0);
  const isBuiltin = !onRemove;
  return (
    <div
      className={cn(
        "group flex flex-col bg-surface p-6 transition hover:bg-muted/30",
        isActive && "ring-1 ring-inset ring-foreground/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/app/codebook/${cb.codebook_id}`} className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-base font-medium tracking-tightish hover:underline">
              {cb.name}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{cb.domain}</p>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">v{cb.version}</Badge>
          {!isBuiltin && (
            <button
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive"
              title="移除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {cb.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{cb.description}</p>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5" /> {cb.axes.length} 軸
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" /> {totalCodes} 編碼
        </span>
        {cb.patterns && cb.patterns.length > 0 && (
          <Badge variant="hybrid" className="ml-auto">
            {cb.patterns.length} Hybrid 模式
          </Badge>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {cb.axes.map((a) => (
            <Badge
              key={a.axis_id}
              variant={
                a.color_token === "surface_axis"
                  ? "surface"
                  : a.color_token === "deep_axis"
                    ? "deep"
                    : "secondary"
              }
            >
              {a.name.replace(/^[^：]+：/, "")}
            </Badge>
          ))}
        </div>
        {isActive ? (
          <span className="flex items-center gap-1 text-xs text-foreground">
            <Check className="h-3.5 w-3.5" /> 使用中
          </span>
        ) : (
          <Button size="sm" variant="outline" onClick={onActivate}>
            設為當前
          </Button>
        )}
      </div>

      <div className="mt-3">
        <Link
          href={`/app/codebook/${cb.codebook_id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          查看完整定義 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
