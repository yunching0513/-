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
      {/* ─── Top nav ─── */}
      <nav className="container mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <div className="flex items-center gap-6">
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
          <Link
            href="/app"
            className="text-sm text-foreground hover:text-accent"
          >
            登入
          </Link>
          <Button asChild size="sm">
            <Link href="/app">開始使用</Link>
          </Button>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="rule-bottom">
        <div className="container mx-auto max-w-6xl px-6 pb-28 pt-20 md:pt-28">
          <div className="grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow mb-8">
                <span className="mr-2">01</span> 質性編碼研究平台
              </p>
              <h1 className="text-balance text-[44px] font-light leading-[1.1] tracking-tightish text-foreground md:text-[60px]">
                把公聽會逐字稿，
                <br />
                變成可分析的
                <br />
                <span className="italic text-accent">層次資料</span>。
              </h1>
              <p className="mt-10 max-w-xl text-balance text-[15px] leading-relaxed text-muted-foreground">
                Strata 是為質性研究者打造的編碼平台。上傳 PDF 與 Word 文件、套用內建或自訂編碼簿、
                以 AI 加速結構化標註，並一鍵匯出 Excel 與 ATLAS.ti（REFI-QDA）格式。
              </p>
              <div className="mt-10 flex items-center gap-6">
                <Button asChild size="lg">
                  <Link href="/app">
                    免費開始 <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Link
                  href="/app/codebook"
                  className="text-sm text-foreground underline-offset-4 hover:underline"
                >
                  瀏覽內建編碼簿 →
                </Link>
              </div>
            </div>

            <HeroPreview />
          </div>

          <FootNote />
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="rule-bottom">
        <div className="container mx-auto max-w-6xl px-6 py-24">
          <header className="mb-16 grid gap-12 md:grid-cols-[260px_1fr]">
            <div>
              <p className="eyebrow mb-3">
                <span className="mr-2">02</span> 功能
              </p>
              <h2 className="text-3xl font-light leading-tight tracking-tightish md:text-4xl">
                為真實的質性
                <br />
                工作流程設計
              </h2>
            </div>
            <p className="max-w-xl self-end text-[15px] leading-relaxed text-muted-foreground">
              不只是標籤管理。Strata 同時支援多軸平行編碼、衍生規則、Chain-of-Thought
              的 AI 引導、以及 Cohen&apos;s κ 信度檢驗——這些是論文真正會用到的工具。
            </p>
          </header>

          <div className="grid gap-x-12 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <article key={f.title} className="group">
                <div className="mb-5 flex items-baseline gap-3">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <f.icon className="h-4 w-4 text-foreground/70" strokeWidth={1.4} />
                </div>
                <h3 className="text-lg font-medium tracking-tightish">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Codebook teaser ─── */}
      <section id="codebooks" className="rule-bottom">
        <div className="container mx-auto max-w-6xl px-6 py-24">
          <div className="grid items-end gap-16 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <p className="eyebrow mb-3">
                <span className="mr-2">03</span> 內建編碼簿
              </p>
              <h2 className="text-3xl font-light leading-tight tracking-tightish md:text-[40px]">
                雙層編碼簿 <span className="italic">v3.0</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">程序正義 × 行為經濟學</p>
              <p className="mt-8 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                以 Tyler 程序正義（4 類）× Tversky &amp; Kahneman 行為經濟學偏誤（5 類）為基礎的
                雙層平行框架。同時辨識 7 種典型 Hybrid 模式：錨點防衛、承諾錨點化、陰謀詮釋、
                稟賦防衛、比較印象、程序救命、失去歸責。
              </p>
              <Link
                href="/app/codebook/dual-layer-pj-be-v3"
                className="mt-10 inline-flex items-center gap-2 text-sm text-foreground underline-offset-4 hover:underline"
              >
                查看完整編碼簿 →
              </Link>
            </div>
            <CodebookPreview />
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="rule-bottom">
        <div className="container mx-auto max-w-6xl px-6 py-24">
          <header className="mb-16 grid gap-12 md:grid-cols-[260px_1fr]">
            <div>
              <p className="eyebrow mb-3">
                <span className="mr-2">04</span> 定價
              </p>
              <h2 className="text-3xl font-light leading-tight tracking-tightish md:text-4xl">
                全功能免費，
                <br />
                AI 用多少付多少
              </h2>
            </div>
            <p className="max-w-xl self-end text-[15px] leading-relaxed text-muted-foreground">
              學術界友善：個人月度免費額度涵蓋常見論文工作量；超出部分按量計費，
              機構可申請年度補助。
            </p>
          </header>

          <div className="grid gap-px overflow-hidden rounded-md bg-border md:grid-cols-3">
            {PRICING.map((p, i) => (
              <article
                key={p.name}
                className={
                  "flex flex-col bg-surface p-8 " +
                  (p.featured ? "ring-1 ring-inset ring-foreground/10" : "")
                }
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-medium tracking-tightish">{p.name}</h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                <div className="mt-8 text-3xl font-light tracking-tightish">{p.price}</div>
                <p className="mt-1 text-xs text-muted-foreground">{p.priceNote}</p>
                <ul className="mt-8 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className="mt-2 h-px w-3 shrink-0 bg-foreground/30" />
                      <span className="text-foreground/80">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-10">
                  <Button asChild variant={p.featured ? "default" : "outline"} className="w-full">
                    <Link href="/app">{p.cta}</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground">
          <Wordmark />
          <span className="text-xs">© 2026 Strata · 質性編碼研究平台</span>
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
    title: "Excel 與 ATLAS.ti 匯出",
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
    features: ["全部編碼與視覺化功能", "Excel 與 ATLAS.ti 匯出", "AI 輔助：Claude Haiku 4.5"],
    cta: "立即註冊",
    featured: false,
  },
  {
    name: "Academic Pro",
    tagline: "研究者主力方案",
    price: "按量計費",
    priceNote: "AI 用多少付多少 · 無月費",
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
      "SSO 與私有部署選項",
      "教育訓練與技術支援",
    ],
    cta: "聯繫我們",
    featured: false,
  },
];

function FootNote() {
  return (
    <div className="mt-24 grid gap-px bg-border md:grid-cols-3">
      {[
        ["141", "已標註論述", "雙層編碼資料集"],
        ["7", "Hybrid 模式", "經實證歸納"],
        ["3", "內建編碼簿", "可自由匯入擴充"],
      ].map(([n, label, sub]) => (
        <div key={label} className="bg-background px-2 py-6">
          <div className="text-3xl font-light tracking-tightish">{n}</div>
          <div className="mt-1 text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
      ))}
    </div>
  );
}

function HeroPreview() {
  return (
    <figure className="border border-border bg-surface">
      <div className="border-b border-border px-5 py-3">
        <p className="eyebrow">範例：都更公聽會逐字稿</p>
      </div>
      <div className="p-6">
        <p className="leading-relaxed text-foreground">
          <span className="bg-surface_axis/15 underline decoration-surface_axis decoration-1 underline-offset-[6px]">
            永和大陳一坪換五坪
          </span>
          <span className="mx-1">，</span>
          <span className="bg-surface_axis/15 underline decoration-surface_axis decoration-1 underline-offset-[6px]">
            怎麼我們連兩坪都不到？
          </span>
          <span className="mx-1">同樣是都更，</span>
          <span className="bg-deep_axis/10 underline decoration-deep_axis decoration-1 underline-offset-[6px] decoration-dashed">
            為什麼差這麼多？
          </span>
        </p>
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <span className="text-surface_axis">
            <span className="font-mono">PJ2</span> · 分配與比較性不公
          </span>
          <span className="text-deep_axis">
            <span className="font-mono">BE1</span> · 定錨效應
          </span>
          <span className="italic text-hybrid_axis">⊕ 錨點防衛模式</span>
        </div>
      </div>
      <div className="rule-top bg-muted/40 p-5">
        <p className="eyebrow mb-3">AI 推理（CoT）</p>
        <ol className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <li>1. 發言者：私產權人</li>
          <li>2. 表層：援引外部案例 → PJ2 分配比較</li>
          <li>3. 深層：歷史錨點驅動 → BE1 定錨</li>
          <li>4. Hybrid：✓ 表層 × 深層皆觸發</li>
          <li>5. 模式比對：錨點防衛模式</li>
        </ol>
      </div>
    </figure>
  );
}

function CodebookPreview() {
  return (
    <div className="grid grid-cols-2 gap-px bg-border">
      <div className="bg-surface p-6">
        <p className="eyebrow mb-4 text-surface_axis">表層 — 程序正義</p>
        <ul className="space-y-3 text-sm">
          {[
            ["PJ1", "程序不正義"],
            ["PJ2", "分配與比較性不公"],
            ["PJ3", "實施者不信任"],
            ["PJ4", "資訊揭露不足"],
          ].map(([code, name]) => (
            <li key={code} className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-muted-foreground">{code}</span>
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-surface p-6">
        <p className="eyebrow mb-4 text-deep_axis">深層 — 行為經濟學</p>
        <ul className="space-y-3 text-sm">
          {[
            ["BE1", "定錨效應"],
            ["BE2", "損失厭避"],
            ["BE3", "稟賦效應"],
            ["BE4", "框架效應"],
            ["BE5", "直覺捷徑與確認偏誤"],
          ].map(([code, name]) => (
            <li key={code} className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-muted-foreground">{code}</span>
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="col-span-2 bg-muted/40 p-5">
        <p className="eyebrow mb-3 text-hybrid_axis">7 種 Hybrid 模式</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          錨點防衛 · 承諾錨點化 · 陰謀詮釋 · 稟賦防衛 · 比較印象 · 程序救命 · 失去歸責
        </p>
      </div>
    </div>
  );
}
