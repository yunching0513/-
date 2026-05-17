"use client";

import { Button } from "@/components/ui/button";
import { useActiveDocument, useActiveSegments } from "@/lib/store/strata";

export function Topbar() {
  const doc = useActiveDocument();
  const segments = useActiveSegments();
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <div className="text-sm">
        <span className="text-muted-foreground">當前文件　/</span>
        <span className="ml-2 font-medium">{doc.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{segments.length} 筆編碼</span>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline">
          邀請協作者
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-foreground/15 bg-muted text-[11px] font-medium text-foreground/80">
          YC
        </div>
      </div>
    </header>
  );
}
