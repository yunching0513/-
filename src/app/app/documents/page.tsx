"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Upload, MoreVertical, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStrata } from "@/lib/store/strata";
import { cn } from "@/lib/utils";

export default function DocumentsPage() {
  const router = useRouter();
  const document = useStrata((s) => s.document);
  const setDocument = useStrata((s) => s.setDocument);
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
      setDocument({
        id: `doc_${Date.now()}`,
        name: data.name,
        parsed_text: data.text,
        uploaded_at: new Date().toISOString(),
        size_bytes: data.size_bytes,
        page_count: data.page_count,
      });
      setStatus("idle");
      // Navigate straight to coding workspace
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
            上傳公聽會、聽證會逐字稿；Strata 會自動解析並識別段落。
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={status === "uploading"}>
          {status === "uploading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {status === "uploading" ? "解析中..." : "上傳文件"}
        </Button>
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
        <CardHeader>
          <CardTitle className="text-base">當前文件</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DocRow doc={document} />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        MVP 階段每個專案只有單一活動文件；上傳新文件會替換它（編碼會被清空）。
        多文件支援於下一階段加入。
      </p>
    </div>
  );
}

function DocRow({ doc }: { doc: ReturnType<typeof useStrata.getState>["document"] }) {
  const sizeKB = (doc.size_bytes / 1024).toFixed(1);
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="flex h-10 w-10 items-center justify-center border border-border bg-muted text-foreground/70">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{doc.name}</span>
          <Badge variant="secondary" className="font-mono">
            {sizeKB} KB{doc.page_count ? ` · ${doc.page_count} 頁` : ""}
          </Badge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          上傳於 {new Date(doc.uploaded_at).toLocaleString("zh-TW")}
        </div>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href="/app/coding">
          開始編碼 <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <Button size="icon" variant="ghost">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
}
