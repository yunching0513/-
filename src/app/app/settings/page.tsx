import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">帳戶、AI 模型、訂閱與用量。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 模型</CardTitle>
          <CardDescription>選擇預設模型；按量計費，不會強制升級。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { name: "Free 個人版", model: "Claude Haiku 4.5", price: "免費 50,000 字 / 月" },
            { name: "Academic Pro", model: "Claude Sonnet 4.6", price: "按量計費" },
            { name: "機構版", model: "Claude Opus 4.7", price: "聯繫洽談" },
          ].map((t, i) => (
            <label key={t.name} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/40">
              <input type="radio" name="tier" defaultChecked={i === 1} />
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
          <div className="flex justify-between"><span className="text-muted-foreground">輸入字元</span><span className="font-mono">12,438</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">輸出字元</span><span className="font-mono">4,201</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">本月費用</span><span className="font-mono">NT$ 0</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">資料匯出</CardTitle>
          <CardDescription>隨時匯出整個專案至 ATLAS.ti、Excel</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/api/export?format=xlsx">下載 Excel (.xlsx)</a>
          </Button>
          <Button asChild>
            <a href="/api/export?format=qdpx">下載 ATLAS.ti (.qdpx)</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
