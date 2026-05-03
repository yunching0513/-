"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FileText, Upload, Search, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SAMPLE_DOCUMENT } from "@/lib/seed/sample-segments";

export default function DocumentsPage() {
  const [query, setQuery] = useState("");
  const docs = [SAMPLE_DOCUMENT].filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">文件</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            上傳公聽會、聽證會逐字稿。Strata 會自動解析並識別段落。
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4" />
          上傳文件
        </Button>
      </div>

      <UploadZone />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋文件..."
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          篩選
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">文件清單（{docs.length}）</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {docs.map((d) => (
              <DocRow key={d.id} doc={d} />
            ))}
            {docs.length === 0 && (
              <div className="p-12 text-center text-sm text-muted-foreground">
                沒有符合條件的文件
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UploadZone() {
  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-10 text-center transition hover:border-primary/40 hover:bg-muted/50">
      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">拖曳檔案至此或點擊上傳</p>
      <p className="mt-1 text-xs text-muted-foreground">
        支援 PDF、Word（.docx）、純文字（.txt）·　單檔最大 25MB
      </p>
      <Button className="mt-4" variant="outline" size="sm">
        選擇檔案
      </Button>
    </div>
  );
}

function DocRow({ doc }: { doc: typeof SAMPLE_DOCUMENT }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 transition hover:bg-muted/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{doc.name}</span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {(doc.size_bytes / 1024).toFixed(1)} KB · {doc.page_count} 頁
          </Badge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          上傳於 {new Date(doc.uploaded_at).toLocaleString("zh-TW")}
        </div>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link href={`/app/coding?doc=${doc.id}`}>
          開始編碼 <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <Button size="icon" variant="ghost">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  );
}
