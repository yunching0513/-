import Link from "next/link";
import {
  ArrowRight,
  Globe2,
  BookOpenText,
  Highlighter,
  BarChart3,
  Download,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HelpPage() {
  return (
    <div className="space-y-10 p-10">
      <header>
        <p className="eyebrow mb-2">使用說明</p>
        <h1 className="text-3xl font-light tracking-tightish">給研究者的 5 分鐘導覽</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          把公聽會逐字稿、立委質詢、公民提案，變成可分析的層次資料。
          雙層編碼簿 × AI 結構化建議 × 匯出 ATLAS.ti。
        </p>
        <div className="mt-4">
          <Button asChild>
            <a
              href="https://github.com/yunching0513/-/blob/main/TOUR.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看完整版（含截圖、研究設計範例）
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-1">
            <p className="eyebrow">第 0–1 分鐘</p>
            <h2 className="text-xl font-medium tracking-tightish">取得語料</h2>
          </div>
          <Card>
            <CardContent className="space-y-3 p-6 text-sm">
              <p>到「資料源」頁，三個免費且合法的公開資料源：</p>
              <ul className="ml-4 list-disc space-y-2 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">委員會逐字稿</span>{" "}
                  16,471 筆完整公報議程，含主席、立委、官員真實對話 —
                  <span className="text-foreground/80">雙層編碼簿的核心場景</span>
                </li>
                <li>
                  <span className="font-medium text-foreground">立法院質詢</span>{" "}
                  11,000+ 筆，可依屆 / 會期 / 委員篩選
                </li>
                <li>
                  <span className="font-medium text-foreground">公民提案 (join.gov.tw)</span>{" "}
                  每年 2,944 筆，含附議數、留言、政策影響評估
                </li>
              </ul>
              <p className="text-muted-foreground">
                或直接上傳 PDF / Word / TXT（25MB 內）。
              </p>
              <div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/app/sources">
                    <Globe2 className="h-4 w-4" />
                    打開資料源
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-1">
            <p className="eyebrow">第 1–2 分鐘</p>
            <h2 className="text-xl font-medium tracking-tightish">選編碼簿</h2>
          </div>
          <Card>
            <CardContent className="space-y-3 p-6 text-sm">
              <p>內建三套，可用、可改、可匯入自己的：</p>
              <ul className="ml-4 list-disc space-y-2 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">雙層編碼簿 v3.0</span>{" "}
                  程序正義（PJ1–4）× 行為經濟學（BE1–5）+ 7 種 Hybrid 模式自動辨識
                </li>
                <li>公共政策立場與議題分析 v1.0（入門用）</li>
                <li>利害關係人立場分析 v1.0（階層式）</li>
              </ul>
              <p className="text-muted-foreground">
                自帶編碼簿：匯入 JSON 或 CSV；下載 CSV → Excel 改 → 再匯入。
              </p>
              <div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/app/codebook">
                    <BookOpenText className="h-4 w-4" />
                    瀏覽編碼簿
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-1">
            <p className="eyebrow">第 2–4 分鐘</p>
            <h2 className="text-xl font-medium tracking-tightish">編碼工作台</h2>
          </div>
          <Card>
            <CardContent className="space-y-4 p-6 text-sm">
              <div>
                <h3 className="font-medium">四種編碼方式</h3>
                <ul className="mt-2 ml-4 list-disc space-y-1.5 text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">游標拖曳</span> —
                    選任意文本片段 → 浮出「建立片段並編碼」
                  </li>
                  <li>
                    <span className="font-medium text-foreground">鍵盤快捷鍵</span>（按 <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">?</kbd> 看完整列表）
                    — `1`–`4` 套 PJ；`Q`–`T` 套 BE；`Shift+H/M/L` 信心度
                  </li>
                  <li>
                    <span className="font-medium text-foreground">AI 單篇建議</span> —
                    Claude 依 Chain-of-Thought 五步驟推理，附信心度與交織剖析
                  </li>
                  <li>
                    <span className="font-medium text-foreground">AI 批次預編碼整份</span> —
                    自動切片 + 信心度濾鏡 + 進度條，適合長文件
                  </li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href="/app/coding">
                    <Highlighter className="h-4 w-4" />
                    進入編碼工作台
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/app/coding">
                    <Keyboard className="h-4 w-4" />
                    在工作台按 ? 看快捷鍵
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                AI 功能需設定 <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code>。
                免費額度（Haiku）每月 50,000 字。
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-1">
            <p className="eyebrow">第 4–5 分鐘</p>
            <h2 className="text-xl font-medium tracking-tightish">視覺化與匯出</h2>
          </div>
          <Card>
            <CardContent className="space-y-3 p-6 text-sm">
              <p>「視覺化」頁含七張圖表：</p>
              <ul className="ml-4 list-disc space-y-1 text-xs text-muted-foreground">
                <li>時間軸（編碼分布隨時間變化）</li>
                <li>編碼頻次、表層 × 深層共現熱力圖、Hybrid 模式甜甜圈</li>
                <li>表層 → 深層 Sankey 流向、發言者 × 編碼矩陣、信心度分布</li>
              </ul>
              <p className="text-muted-foreground">
                匯出 <span className="font-medium text-foreground">Excel</span>（三 sheet）
                或 <span className="font-medium text-foreground">ATLAS.ti `.qdpx`</span>（同時相容 NVivo / MAXQDA / Quirkos）。
              </p>
              <div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/app/dashboard">
                    <BarChart3 className="h-4 w-4" />
                    視覺化儀表板
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <p className="eyebrow">研究設計範例</p>
          <h2 className="text-xl font-medium tracking-tightish">三個立刻可做的研究</h2>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">正式 vs 公民論述</CardTitle>
              <CardDescription>立委質詢 × join 公民提案</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              同議題（如都市更新）分別抓兩種來源，比較 Hybrid 模式分布。
              假設：立委更多「承諾錨點化」，公民更多「稟賦防衛」。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">立委論述畫像</CardTitle>
              <CardDescription>同一人 × 多次質詢</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              篩特定立委的所有質詢 → 看其常用 Hybrid 模式 + 信心度。
              適合做政治論述風格分析。
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">議題演變</CardTitle>
              <CardDescription>同關鍵字 × 時間軸</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              跨會期的委員會逐字稿 → 用時間軸看 PJ / BE / Hybrid 比例變化。
              追蹤政策爭議的論述演變。
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Download className="mr-2 inline h-4 w-4" />
              快速取得 AI 建議
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>本地端開發：在專案根目錄建立 `.env.local`，填入：</p>
            <pre className="rounded-sm bg-muted p-3 font-mono text-xs">
{`ANTHROPIC_API_KEY=sk-ant-...`}
            </pre>
            <p>線上版（Vercel）：到 Project Settings → Environment Variables 新增。</p>
            <p className="text-xs">
              <Sparkles className="mr-1 inline h-3 w-3" />
              三層模型分級：Haiku 4.5（Free） / Sonnet 4.6（Pro） / Opus 4.7（機構）
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border pt-6 text-xs text-muted-foreground">
        <span>開發者：</span>
        <a
          href="https://www.linkedin.com/in/yunching0513/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline-offset-2 hover:underline"
        >
          吳昀慶 Yun Ching Wu
        </a>
      </footer>
    </div>
  );
}
