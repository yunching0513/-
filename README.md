# Strata 層析

> 為公聽會、聽證會等質性研究文本提供雙層編碼、AI 輔助標註、視覺化與 ATLAS.ti 匯出的編碼研究平台。

Strata 不是傳統的標籤工具。它把質性研究真實的工作流程作為一等公民：
**多軸平行編碼、Chain-of-Thought 結構化 AI 建議、Hybrid 衍生規則、信度檢驗、QDA 軟體互通**。

---

## ✨ 核心特性

- **雙層／多軸編碼簿** — 不只階層編碼，更支援表層 × 深層平行框架
- **內建 3 套編碼簿**
  - 雙層編碼簿 v3.0｜程序正義 × 行為經濟學（含 7 種 Hybrid 模式樣板）
  - 公共政策立場與議題分析 v1.0
  - 利害關係人立場分析 v1.0
- **AI 結構化輔助** — 依編碼簿的 CoT 工作流程，逐步推理、給出建議與信心度
- **三層 AI 模型分級** — Free（Haiku）/ Pro（Sonnet）/ Institute（Opus）
- **6 種專業視覺化** — 編碼頻次、共現熱力圖、Hybrid 模式分布、Sankey、發言者矩陣、信心度
- **匯出標準格式**
  - Excel `.xlsx`（多 sheet：Segments / Codebook / Patterns）
  - REFI-QDA `.qdpx`（與 ATLAS.ti、NVivo、MAXQDA 互通）
- **PDF / Word 智慧解析** — 自動識別發言者、保留位置資訊
- **設計：簡潔、明亮、科技感** — Tailwind + 自訂層析配色（surface/deep/hybrid）

---

## 🏗️ 技術架構

| 層 | 選擇 | 說明 |
|---|---|---|
| 前端 | Next.js 15（App Router）＋ React 19 ＋ TypeScript | 主流現代框架 |
| UI | Tailwind CSS v3 ＋ Radix UI ＋ 自製 shadcn-style 元件 | 一致的設計系統 |
| 圖表 | Recharts ＋ 自製 SVG（Sankey、Heatmap） | 輕量、可匯出 |
| AI | `@anthropic-ai/sdk`（Claude Haiku/Sonnet/Opus） | 含 prompt caching |
| 文件解析 | `pdf-parse`、`mammoth` | 開源、穩定 |
| 匯出 | `xlsx`、`jszip`（REFI-QDA） | QDA 通用標準 |
| 認證／DB／儲存（Phase 2） | Supabase | 一站式、可自架 |
| 金流（Phase 2） | Stripe | 按量計費 |

```
src/
├── app/                  Next.js App Router
│   ├── page.tsx          落地頁
│   ├── app/              應用主體（受認證保護的區域）
│   │   ├── page.tsx      總覽 dashboard
│   │   ├── documents/    文件管理
│   │   ├── codebook/     編碼簿庫 + 詳細頁
│   │   ├── coding/       編碼工作台（核心）
│   │   ├── dashboard/    視覺化儀表板
│   │   └── settings/     設定 + 用量
│   └── api/
│       ├── ai/suggest    AI 編碼建議 API
│       └── export        Excel / .qdpx 匯出 API
├── components/
│   ├── ui/               基礎元件（Button, Card, Badge…）
│   ├── brand/            Logo、Wordmark
│   └── charts/           6 種視覺化元件
└── lib/
    ├── codebook/
    │   ├── types.ts      編碼簿、編碼片段的型別
    │   └── builtin/      3 套內建編碼簿（含雙層 v3.0）
    ├── parse/document.ts PDF/DOCX/TXT 解析
    ├── ai/               AI 助手（CoT prompt + 模型分層）
    ├── analytics/        統計聚合
    ├── export/
    │   ├── excel.ts      .xlsx 匯出
    │   └── refi-qda.ts   .qdpx 匯出（ATLAS.ti 相容）
    └── seed/             示範資料
```

---

## 🚀 本地開發

```bash
# 1. 安裝依賴（需要 Node 22+）
npm install

# 2. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local，至少填入 ANTHROPIC_API_KEY 才能啟用 AI 輔助

# 3. 啟動開發伺服器
npm run dev
# → http://localhost:3000
```

---

## ☁️ 部署：SaaS（推薦）

最低成本上線：Vercel + Supabase + Anthropic API，初期月費 < NT$ 500。

### 1. Vercel（前端 + Serverless）

```bash
# 安裝 vercel CLI
npm i -g vercel

# 登入後一行部署
vercel deploy --prod
```

在 Vercel 後台設定環境變數（同 `.env.example`）。

### 2. Supabase（資料庫 + Auth + 儲存）

1. 至 https://supabase.com 建立新專案
2. 把 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 填入 Vercel
3. 將來會於 `supabase/migrations/` 加入 schema 與 RLS 規則

### 3. Anthropic API

至 https://console.anthropic.com 申請 API key，填入 `ANTHROPIC_API_KEY`。

---

## 🏠 自架伺服器

若你想完全本地端運行（例如：機構內網、敏感資料），使用 Docker Compose：

```bash
# (Phase 2 文件)
docker compose up -d
```

服務組件：
- `strata-app`：Next.js 主程式（port 3000）
- `postgres`：自架 Postgres（取代 Supabase Cloud）
- `minio`：物件儲存（取代 Supabase Storage）
- `caddy`：HTTPS 反向代理

完整自架指南將於 v0.2.0 加入 `docs/self-hosting.md`。

---

## 🧪 編碼簿格式

Strata 使用通用 JSON schema 描述編碼簿。一份簡單編碼簿：

```ts
{
  codebook_id: "my-cb",
  name: "我的編碼簿",
  methodology: "simple",
  axes: [{
    axis_id: "main",
    name: "主類目",
    codes: [
      { code: "A1", name: "支持", definition: "..." },
      { code: "A2", name: "反對", definition: "..." },
    ],
  }],
}
```

完整 schema：見 `src/lib/codebook/types.ts`。

支援匯入格式：JSON、CSV（將支援）、REFI-QDA `.qdpx`（將支援）。

---

## 📤 匯出格式

| 格式 | 路由 | 用途 |
|---|---|---|
| Excel `.xlsx` | `GET /api/export?format=xlsx` | 多 sheet：Segments / Codebook / Patterns |
| REFI-QDA `.qdpx` | `GET /api/export?format=qdpx` | ATLAS.ti、NVivo、MAXQDA、Quirkos、Taguette 通用 |

REFI-QDA 是 QDA 業界開放標準（https://www.qdasoftware.org），
ATLAS.ti 22+ 可直接 File → Import → REFI-QDA Project 載入。

---

## 🗺️ Roadmap（為期 1 個月 MVP）

- [x] 專案骨架、設計系統、三主畫面靜態原型
- [x] 編碼工作台（單人）、6 視覺化、ATLAS.ti / Excel 匯出
- [x] 三套內建編碼簿（含使用者提供的雙層 v3.0）
- [ ] Supabase 整合：認證、文件儲存、專案持久化
- [ ] AI 串接前端：批次預編碼、Chain-of-Thought 即時建議
- [ ] PDF / Word 上傳與解析串接（後端已完成，前端串接中）
- [ ] 編碼簿匯入（JSON / CSV / REFI-QDA）
- [ ] 多人協作 + Cohen's κ 信度檢驗
- [ ] Stripe 用量計費

---

## 📜 授權

Strata 為開源專案。授權條款待定（候選：AGPL-3.0、Elastic License v2）。

---

## 🙏 致謝

內建雙層編碼簿 v3.0 之理論基礎：

- Tyler, T. R. (2003). *Procedural justice, legitimacy, and the effective rule of law.*
- Tversky, A. & Kahneman, D. (1974, 1981); Kahneman & Tversky (1979).
- Lord, C. G., Ross, L., & Lepper, M. R. (1979).
- Thaler, R. (1980, 1985).
