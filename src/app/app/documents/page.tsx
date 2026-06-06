"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  FileText,
  Upload,
  Loader2,
  AlertCircle,
  Check,
  Trash2,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStrata, type StrataDocument } from "@/lib/store/strata";
import { cn } from "@/lib/utils";

export default function DocumentsPage() {
  const router = useRouter();
  const documents = useStrata((s) => s.documents);
  const activeId = useStrata((s) => s.active_document_id);
  const addDocument = useStrata((s) => s.addDocument);
  const setActiveDocument = useStrata((s) => s.setActiveDocument);
  const removeDocument = useStrata((s) => s.removeDocument);
  const segments = useStrata((s) => s.segments);

  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 25 * 1024 * 1024) {
      setError("檔案超過 25MB 上限");
      setStatus("error");
      return;
    }
    setStatus("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `解析失敗（HTTP ${res.status}）`);
      }
      const data = (await res.json()) as {
        name: string;
        text: string;
        size_bytes: number;
        page_count?: number;
      };
      addDocument({
        id: `doc_${Date.now()}`,
        name: data.name,
        parsed_text: data.text,
        uploaded_at: new Date().toISOString(),
        size_bytes: data.size_bytes,
        page_count: data.page_count,
      });
      setStatus("idle");
      router.push("/app/coding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知錯誤");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-8 p-10">
      <header className="flex items-end justify-between">
        <div>
          <p className="eyebrow mb-2">文件</p>
          <h1 className="text-3xl font-light tracking-tightish">文件管理</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            上傳公聽會、聽證會逐字稿，或從{" "}
            <Link href="/app/sources" className="underline underline-offset-2 hover:text-foreground">
              公開資料源
            </Link>{" "}
            匯入提案文本。
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/app/sources">
              <Globe2 className="h-4 w-4" />
              從資料源匯入
            </Link>
          </Button>
          <Button onClick={() => inputRef.current?.click()} disabled={status === "uploading"}>
            {status === "uploading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {status === "uploading" ? "解析中..." : "上傳檔案"}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "border border-dashed bg-muted/30 px-10 py-14 text-center transition",
          dragOver ? "border-foreground/40 bg-muted/60" : "border-border",
        )}
      >
        {status === "uploading" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">正在解析文件...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF 較大時可能需要 10–30 秒
            </p>
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={() => {
                setStatus("idle");
                setError(null);
              }}
            >
              再試一次
            </Button>
          </>
        ) : (
          <>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">拖曳檔案至此或點擊上傳</p>
            <p className="mt-1 text-xs text-muted-foreground">
              支援 PDF、Word（.docx）、純文字（.txt、.md）　·　單檔最大 25MB
            </p>
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              選擇檔案
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-6 py-3">
            <h2 className="text-sm font-medium">文件列表（{documents.length}）</h2>
            <p className="text-xs text-muted-foreground">點切換為當前　·　當前文件的編碼會顯示於工作台</p>
          </div>
          <div className="divide-y divide-border">
            {documents.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                isActive={d.id === activeId}
                segmentCount={segments.filter((s) => s.document_id === d.id).length}
                onActivate={() => setActiveDocument(d.id)}
                onRemove={() => {
                  if (
                    confirm(
                      `移除「${d.name}」？此文件的所有編碼也會一併刪除。`,
                    )
                  ) {
                    removeDocument(d.id);
                  }
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DocRow({
  doc,
  isActive,
  segmentCount,
  onActivate,
  onRemove,
}: {
  doc: StrataDocument;
  isActive: boolean;
  segmentCount: number;
  onActivate: () => void;
  onRemove: () => void;
}) {
  const sizeKB = (doc.size_bytes / 1024).toFixed(1);
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-6 py-4 transition hover:bg-muted/30",
        isActive && "bg-muted/40",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted text-foreground/70">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <button onClick={onActivate} className="truncate text-left font-medium hover:underline">
            {doc.name}
          </button>
          {isActive && (
            <Badge variant="outline" className="gap-1">
              <Check className="h-3 w-3" /> 當前
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">
            {sizeKB} KB{doc.page_count ? ` · ${doc.page_count} 頁` : ""}
          </span>
          <span>·</span>
          <span>{segmentCount} 個編碼</span>
          <span>·</span>
          <span>上傳於 {new Date(doc.uploaded_at).toLocaleString("zh-TW")}</span>
        </div>
      </div>
      {!isActive && (
        <Button size="sm" variant="outline" onClick={onActivate}>
          設為當前
        </Button>
      )}
      <Button asChild size="sm" variant={isActive ? "default" : "ghost"}>
        <Link href="/app/coding" onClick={onActivate}>
          開始編碼 <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        title="刪除文件"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
