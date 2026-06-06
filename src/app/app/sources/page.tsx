"use client";

import { useState } from "react";
import { Building2, Landmark, FileSearch } from "lucide-react";
import { JoinPanel } from "./join-panel";
import { LyPanel } from "./ly-panel";
import { GazettePanel } from "./gazette-panel";
import { cn } from "@/lib/utils";

type SourceTab = "join" | "ly" | "gazette";

const SOURCES: { id: SourceTab; label: string; sublabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    id: "gazette",
    label: "委員會逐字稿",
    sublabel: "立法院公報議程 · 含完整對話",
    icon: FileSearch,
  },
  {
    id: "ly",
    label: "立法院質詢",
    sublabel: "ly.govapi.tw · 11,000+ 筆",
    icon: Landmark,
  },
  {
    id: "join",
    label: "公共政策參與平台",
    sublabel: "join.gov.tw · 提點子",
    icon: Building2,
  },
];

export default function SourcesPage() {
  const [tab, setTab] = useState<SourceTab>("gazette");

  return (
    <div className="space-y-6 p-10">
      <header>
        <p className="eyebrow mb-2">資料源</p>
        <h1 className="text-3xl font-light tracking-tightish">公開資料瀏覽</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          直接從公開政府資料源搜尋論述文本，挑選後一鍵匯入 Strata 進行雙層編碼。
          所有資料皆為政府開放資料，授權清楚、合法。
        </p>
      </header>

      <div className="flex gap-px bg-border">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => setTab(s.id)}
            className={cn(
              "flex flex-1 items-center gap-3 bg-surface px-5 py-4 text-left transition",
              tab === s.id
                ? "ring-1 ring-inset ring-foreground/30"
                : "hover:bg-muted/40",
            )}
          >
            <s.icon className="h-5 w-5 text-foreground/70" />
            <div className="min-w-0">
              <div className="text-sm font-medium">{s.label}</div>
              <div className="truncate text-xs text-muted-foreground">{s.sublabel}</div>
            </div>
          </button>
        ))}
      </div>

      {tab === "gazette" && <GazettePanel />}
      {tab === "ly" && <LyPanel />}
      {tab === "join" && <JoinPanel />}
    </div>
  );
}
