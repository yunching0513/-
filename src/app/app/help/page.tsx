import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HelpPage() {
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">使用說明</h1>
        <p className="mt-1 text-sm text-muted-foreground">快速入門與常見問題</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">五分鐘上手</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li>
              <span className="font-medium">1. 上傳文件</span>
              <p className="mt-1 text-muted-foreground">在「文件」頁拖曳 PDF / Word 上傳，Strata 會自動解析並識別發言者。</p>
            </li>
            <li>
              <span className="font-medium">2. 選擇編碼簿</span>
              <p className="mt-1 text-muted-foreground">內建 3 套編碼簿，或從「編碼簿」頁匯入你自己的 JSON / REFI-QDA。</p>
            </li>
            <li>
              <span className="font-medium">3. 開始編碼</span>
              <p className="mt-1 text-muted-foreground">在編碼工作台選取文本片段，套用編碼。可請 AI 依 Chain-of-Thought 提供結構化建議。</p>
            </li>
            <li>
              <span className="font-medium">4. 視覺化與匯出</span>
              <p className="mt-1 text-muted-foreground">完成編碼後到「視覺化」頁查看 6 種圖表，並一鍵匯出至 Excel 或 ATLAS.ti。</p>
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">關於雙層編碼簿</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            內建的「雙層編碼簿 v3.0」結合 Tyler (2003) 的程序正義理論與 Tversky &amp; Kahneman 的行為經濟學偏誤理論，
            適用於分析公聽會、聽證會等公共政策論述文本。
          </p>
          <p>
            其核心主張：部分居民論述同時具備表層程序質疑與深層心理偏誤特徵，二者非平行而是「以程序正義包裝心理偏誤」之策略性交織（Hybrid 策略）。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
