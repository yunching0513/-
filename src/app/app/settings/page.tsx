"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStrata, useActiveCodebook } from "@/lib/store/strata";
import { downloadExcel, downloadQdpx } from "@/lib/export/client";

export default function SettingsPage() {
  const segments = useStrata((s) => s.segments);
  const document = useStrata((s) => s.document);
  const cb = useActiveCodebook();
  const aiTier = useStrata((s) => s.ai_tier);
  const setAiTier = useStrata((s) => s.setAiTier);

  return (
    <div className="space-y-8 p-10">
      <header>
        <p className="eyebrow mb-2">設定</p>
        <h1 className="text-3xl font-light tracking-tightish">帳戶與專案</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI 模型、用量、資料匯出。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 模型</CardTitle>
          <CardDescription>選擇預設模型；按量計費，不會強制升級。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              { id: "free", name: "Free 個人版", model: "Claude Haiku 4.5", price: "免費 50,000 字 / 月" },
              { id: "pro", name: "Academic Pro", model: "Claude Sonnet 4.6", price: "按量計費" },
              { id: "institute", name: "機構版", model: "Claude Opus 4.7", price: "聯繫洽談" },
            ] as const
          ).map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-3 rounded-sm border border-border p-3 hover:bg-muted/40"
            >
              <input
                type="radio"
                name="tier"
                checked={aiTier === t.id}
                onChange={() => setAiTier(t.id)}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.model}</div>
              </div>
              <Badge variant="outline">{t.price}</Badge>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">本月 AI 用量</CardTitle>
          <CardDescription>累積消耗與餘額</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="輸入字元" value="—" />
          <Row label="輸出字元" value="—" />
          <Row label="本月費用" value="NT$ 0" />
          <p className="pt-1 text-xs text-muted-foreground">
            尚未啟用 AI；在 .env.local 填入 ANTHROPIC_API_KEY 後可使用。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">資料匯出</CardTitle>
          <CardDescription>
            匯出當前專案的 {segments.length} 個編碼片段
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant="outline"
            disabled={segments.length === 0}
            onClick={() => downloadExcel(segments, cb, document.name)}
          >
            下載 Excel (.xlsx)
          </Button>
          <Button
            disabled={segments.length === 0}
            onClick={() => downloadQdpx(segments, cb, document)}
          >
            下載 ATLAS.ti (.qdpx)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
