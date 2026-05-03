import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Layers,
  Network,
  Sparkles,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-radial-fade">
        <div className="absolute inset-0 bg-grid opacity-[0.35] [mask-image:linear-gradient(to_bottom,white,transparent)]" />
        <div className="container relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
          {/* Top nav */}
          <nav className="flex items-center justify-between">
            <Wordmark />
            <div className="flex items-center gap-2">
              <Link
                href="#features"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-block"
              >
                功能
              </Link>
              <Link
                href="#codebooks"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-block"
              >
                編碼簿
              </Link>
              <Link
                href="#pricing"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-block"
              >
                定價
              </Link>
              <Button asChild size="sm" variant="outline">
                <Link href="/app">登入</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/app">開始使用</Link>
              </Button>
            </div>
          </nav>

          {/* Headline */}
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 inline-flex gap-2 border-primary/20 text-primary">
              <Sparkles className="h-3.5 w-3.5" /> 雙層編碼框架 + AI 輔助
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              把公聽會逐字稿，
              <br className="hidden sm:inline" />
              變成可分析的<span className="bg-gradient-to-r from-surface_axis via-primary to-deep_axis bg-clip-text text-transparent">層次資料</span>。
            </h1>
            <p className="mt-6 text-balance text-lg text-muted-foreground">
              Strata 是一個為質性研究者設計的編碼平台。
              上傳 PDF／Word 文件、套用內建或自訂編碼簿、用 AI 加速標註、
              一鍵匯出 Excel 與 ATLAS.ti（REFI-QDA）格式。
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/app">
                  免費開始 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/app/codebook">瀏覽內建編碼簿</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              全功能免費 · AI 進階模型按量計費 · 學術機構年度貼補方案
            </p>
          </div>

          {/* Hero preview card */}
          <HeroPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="container mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              專為質性研究的真實工作流程設計
            </h2>
            <p className="mt-4 text-muted-foreground">
              不只標籤管理，更支援多軸平行編碼、Hybrid 衍生規則、信度檢驗。
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-surface p-6 shadow-soft transition hover:border-primary/30 hover:shadow-glow"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Codebook teaser */}
      <section id="codebooks" className="border-b border-border bg-muted/30">
        <div className="container mx-auto max-w-6xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="surface" className="mb-4">表層 × 深層</Badge>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                內建：雙層編碼簿 v3.0
              </h2>
              <p className="mt-4 text-muted-foreground">
                以 Tyler 程序正義（4 類）× Tversky &amp; Kahneman 行為經濟學偏誤（5 類）
                為基礎的雙層平行框架。同時辨識 7 種典型 Hybrid 模式：錨點防衛、承諾錨點化、
                陰謀詮釋、稟賦防衛、比較印象、程序救命、失去歸責。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["錨點防衛", "承諾錨點化", "陰謀詮釋", "稟賦防衛", "比較印象", "程序救命", "失去歸責"].map(
                  (p) => (
                    <Badge key={p} variant="hybrid">
                      {p}
                    </Badge>
                  ),
                )}
              </div>
              <Button asChild className="mt-8" variant="outline">
                <Link href="/app/codebook/dual-layer-pj-be-v3">
                  查看完整編碼簿 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CodebookPreview />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-border">
        <div className="container mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              全功能免費，AI 用多少付多少
            </h2>
            <p className="mt-4 text-muted-foreground">
              學術界友善：個人月度免費額度涵蓋常見論文工作量；超出部分按量計費，
              機構可申請年度補助。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={
                  "flex flex-col rounded-xl border p-6 shadow-soft " +
                  (p.featured
                    ? "border-primary/40 bg-surface ring-1 ring-primary/20"
                    : "border-border bg-surface")
                }
              >
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                <div className="mt-4 text-3xl font-semibold">{p.price}</div>
                <p className="text-xs text-muted-foreground">{p.priceNote}</p>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  <Button asChild variant={p.featured ? "default" : "outline"} className="w-full">
                    <Link href="/app">{p.cta}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <Wordmark />
          <span>© 2026 Strata · 質性編碼研究平台</span>
        </div>
      </footer>
    </main>
  );
}

const FEATURES = [
  {
    title: "PDF / Word 智慧解析",
    icon: FileText,
    desc: "自動擷取段落、識別發言者、保留頁碼與來源資訊，方便追溯。",
  },
  {
    title: "多軸平行編碼",
    icon: Layers,
    desc: "支援單一階層編碼，也支援雙層／多軸平行框架（如表層 × 深層）。",
  },
  {
    title: "AI 結構化輔助",
    icon: Sparkles,
    desc: "依編碼簿的 Chain-of-Thought 工作流，逐步建議編碼、撰寫剖析。",
  },
  {
    title: "Hybrid 模式辨識",
    icon: Network,
    desc: "依規則自動推算衍生編碼，匹配內建模式樣板（如 7 種 Hybrid）。",
  },
  {
    title: "Excel & ATLAS.ti 匯出",
    icon: FileSpreadsheet,
    desc: "一鍵匯出 .xlsx 與 REFI-QDA（.qdpx）— 同時相容 NVivo / MAXQDA。",
  },
  {
    title: "多人協作與信度",
    icon: ShieldCheck,
    desc: "團隊共同編碼、Cohen's κ 信度檢驗、編碼差異視覺化。",
  },
];

const PRICING = [
  {
    name: "Free 個人版",
    tagline: "適合學生與初次使用者",
    price: "NT$ 0",
    priceNote: "永久免費 · 含 50,000 字 / 月 AI 額度（Haiku）",
    features: ["全部編碼與視覺化功能", "Excel + ATLAS.ti 匯出", "AI 輔助：Claude Haiku 4.5"],
    cta: "立即註冊",
    featured: false,
  },
  {
    name: "Academic Pro",
    tagline: "研究者主力方案",
    price: "按量計費",
    priceNote: "AI 用多少付多少，無月費",
    features: [
      "包含 Free 全部功能",
      "AI 升級：Claude Sonnet 4.6",
      "5 人協作 + κ 信度檢驗",
      "客製編碼簿無上限",
    ],
    cta: "免費試用",
    featured: true,
  },
  {
    name: "機構版",
    tagline: "學校、智庫、政府單位",
    price: "聯繫洽談",
    priceNote: "年度機構授權 + AI 補助方案",
    features: [
      "包含 Pro 全部功能",
      "AI 旗艦：Claude Opus 4.7",
      "SSO / 私有部署選項",
      "教育訓練與技術支援",
    ],
    cta: "聯繫我們",
    featured: false,
  },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-glow">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <span className="ml-3 text-xs text-muted-foreground">strata.app · 編碼工作台</span>
      </div>
      <div className="grid gap-0 md:grid-cols-[1fr_320px]">
        <div className="border-r border-border p-6">
          <div className="text-xs font-medium text-muted-foreground">範例：都更公聽會逐字稿</div>
          <p className="mt-3 leading-relaxed text-foreground">
            <span className="bg-surface_axis/15 underline decoration-surface_axis decoration-2 underline-offset-4">
              永和大陳一坪換五坪
            </span>
            <span className="mx-1">，</span>
            <span className="bg-surface_axis/15 underline decoration-surface_axis decoration-2 underline-offset-4">
              怎麼我們連兩坪都不到？
            </span>
            <span className="mx-1">同樣是都更，</span>
            <span className="bg-deep_axis/10 underline decoration-deep_axis decoration-2 underline-offset-4 decoration-dashed">
              為什麼差這麼多？
            </span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="surface">PJ2 · 分配與比較性不公</Badge>
            <Badge variant="deep">BE1 · 定錨效應</Badge>
            <Badge variant="hybrid">⊕ 錨點防衛模式</Badge>
          </div>
        </div>
        <aside className="bg-muted/30 p-6">
          <div className="text-xs font-medium text-muted-foreground">AI 推理（CoT）</div>
          <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li>1. 發言者：私產權人</li>
            <li>2. 表層：援引外部案例 → PJ2 分配比較</li>
            <li>3. 深層：歷史錨點驅動 → BE1 定錨</li>
            <li>4. Hybrid：✓ 表層 × 深層皆觸發</li>
            <li>5. 模式比對：錨點防衛模式</li>
          </ol>
        </aside>
      </div>
    </div>
  );
}

function CodebookPreview() {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-3 text-xs font-medium text-surface_axis">表層：程序正義</div>
          <ul className="space-y-2 text-sm">
            {[
              ["PJ1", "程序不正義"],
              ["PJ2", "分配與比較性不公"],
              ["PJ3", "實施者不信任"],
              ["PJ4", "資訊揭露不足"],
            ].map(([code, name]) => (
              <li key={code} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                <Badge variant="surface" className="font-mono">{code}</Badge>
                <span className="text-foreground">{name}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-medium text-deep_axis">深層：行為經濟學</div>
          <ul className="space-y-2 text-sm">
            {[
              ["BE1", "定錨效應"],
              ["BE2", "損失厭避"],
              ["BE3", "稟賦效應"],
              ["BE4", "框架效應"],
              ["BE5", "直覺捷徑與確認偏誤"],
            ].map(([code, name]) => (
              <li key={code} className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
                <Badge variant="deep" className="font-mono">{code}</Badge>
                <span className="text-foreground">{name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
