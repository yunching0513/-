"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, FileText, Plus } from "lucide-react";
import { useStrata, useActiveDocument } from "@/lib/store/strata";
import { cn } from "@/lib/utils";

export function DocumentSwitcher() {
  const documents = useStrata((s) => s.documents);
  const activeId = useStrata((s) => s.active_document_id);
  const setActiveDocument = useStrata((s) => s.setActiveDocument);
  const segments = useStrata((s) => s.segments);
  const activeDoc = useActiveDocument();
  const activeSegCount = segments.filter((s) => s.document_id === activeId).length;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-sm border border-border bg-background p-2.5 text-left text-sm hover:bg-muted"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-foreground/15 bg-muted text-foreground/70">
          <FileText className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{activeDoc.name}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {activeSegCount} 筆編碼
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-80 overflow-y-auto border border-border bg-surface shadow-glow scrollbar-thin">
          <div className="border-b border-border px-3 py-2">
            <p className="eyebrow">切換文件（{documents.length}）</p>
          </div>
          <ul>
            {documents.map((d) => {
              const segCount = segments.filter((s) => s.document_id === d.id).length;
              const isActive = d.id === activeId;
              return (
                <li key={d.id}>
                  <button
                    onClick={() => {
                      setActiveDocument(d.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                      isActive && "bg-muted/60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{d.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {segCount} 筆編碼
                      </div>
                    </div>
                    {isActive && <span className="text-[10px] text-muted-foreground">●</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <Link
            href="/app/documents"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 border-t border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            管理文件 / 上傳新文件
          </Link>
        </div>
      )}
    </div>
  );
}
