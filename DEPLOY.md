# Deploying Strata

Strata 是一個 Next.js 15 應用，最快的部署路徑是 **Vercel**（一鍵 GitHub 整合）。
本指南也涵蓋自架選項。

---

## 🚀 部署到 Vercel（推薦）

### 方法 1：透過 Vercel Dashboard（最簡單）

1. 到 https://vercel.com/new
2. **Import Git Repository** → 連結你的 GitHub 帳號 → 選 `yunching0513/-`
3. **Configure Project**：
   - Framework Preset：Vercel 會自動偵測為 **Next.js**，不用改
   - Root Directory：留 `./`
   - Build Command：留預設（`next build`）
4. **Environment Variables**（重要）：
   ```
   ANTHROPIC_API_KEY = sk-ant-...
   ```
   沒有這個的話 AI 建議功能會回錯誤；其他功能正常運作。
5. **Deploy** — 約 60–90 秒
6. 完成後會給你一個 `https://*.vercel.app` 網址

之後每次 push 到 `claude/qualitative-research-platform-VoEjt` 或 `main`，
Vercel 都會自動重新部署。

### 方法 2：CLI

```bash
npm i -g vercel
vercel login
vercel link        # 連結到你的 Vercel 專案
vercel env add ANTHROPIC_API_KEY production
vercel deploy --prod
```

---

## ⚙️ Vercel 環境變數

| 變數 | 必填 | 用途 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 推薦 | AI 建議與批次預編碼。從 https://console.anthropic.com 取得 |
| `NEXT_PUBLIC_APP_URL` | 否 | 自訂網址（如 `https://strata.app`） |
| `NEXT_TELEMETRY_DISABLED` | 否 | 設 `1` 關掉 Next.js 匿名遙測 |

> 將來加入 Supabase / Stripe 時還會多幾個。目前 MVP 只需 `ANTHROPIC_API_KEY`。

---

## 📏 Vercel 平台限制（要知道）

| 項目 | Hobby（免費） | Pro（$20/月起） |
|---|---|---|
| Function 執行時間 | 10 秒 | 60 秒（含此專案 maxDuration 設定） |
| Function 請求體上限 | 4.5 MB | 4.5 MB（同上） |
| 大檔上傳建議方式 | < 4 MB 直傳 | < 4 MB 直傳 |
| 部署頻寬 | 100 GB / 月 | 1 TB / 月 |

**重要**：本專案 client 限制設為 25MB，但 Vercel 平台限制是 **4.5 MB**。
超過 4.5 MB 的 PDF 在 Vercel 會失敗 — 這不是 Strata 的問題，是平台層限制。

**解法（將來）**：改用 Vercel Blob 直接前端→Storage 上傳，繞過 function payload 限制。
目前 MVP 階段建議只測試 < 4 MB 的 PDF。Word（.docx）通常較小，多半沒問題。

---

## 🏠 自架（不使用 Vercel）

### 選項 A：Docker Compose（建議自架用）

未來會加入 `docker-compose.yml`。預期組件：
- `strata-app`：Next.js（port 3000）
- `caddy`：HTTPS 反向代理 + 自動 Let's Encrypt

### 選項 B：Node.js 直接執行

```bash
npm ci
npm run build
ANTHROPIC_API_KEY=sk-ant-... npm run start
# → http://localhost:3000
```

用 `systemd` 或 `pm2` 管理 process，前面套個 nginx / Caddy 做 HTTPS。

---

## 🩺 部署後檢查清單

部署完成後，逐項確認：

- [ ] 落地頁載入正常（`/`）
- [ ] 應用區可進入（`/app`）
- [ ] 編碼工作台可用游標選取文本（`/app/coding`）
- [ ] 上傳一份 < 4 MB 的 Word 檔（`/app/documents`）→ 自動進入編碼工作台
- [ ] 視覺化頁所有 6 張圖表正常顯示（`/app/dashboard`）
- [ ] 編碼簿下載 JSON / CSV 可下載（`/app/codebook/dual-layer-pj-be-v3`）
- [ ] 編碼簿匯入 JSON 與 CSV 都可用
- [ ] 設定中切換 AI tier 會持久化（重整還在）
- [ ] AI 建議：填入 ANTHROPIC_API_KEY 後，編碼工作台「取得 AI 建議」回正常結果
- [ ] AI 批次預編碼：對短文件可完整跑完

---

## 🐛 常見部署問題

### 「Module not found: Can't resolve 'pdf-parse/lib/pdf-parse.js'」
不會發生 — 我們已用內部路徑 import 避開 pdf-parse 套件 index.js 在 serverless 上的副作用。

### 「ANTHROPIC_API_KEY is not set」
到 Vercel Dashboard → Project → Settings → Environment Variables 新增，
新增後要重新部署一次才會生效（Deployments → 選最新 → Redeploy）。

### 「Request body too large」
Vercel 平台層限制 4.5 MB。檔案太大請壓縮或先用 OCR 工具轉純文字。

### Function timeout
Hobby 是 10 秒。大 PDF + AI 推理可能不夠用。升 Pro 可到 60 秒（vercel.json 已設）。

---

## 📦 部署後的網址範例

部署後可分享的網址：
- 落地頁：`https://your-strata.vercel.app`
- 範例編碼簿：`https://your-strata.vercel.app/app/codebook/dual-layer-pj-be-v3`
- 編碼工作台（帶範例資料）：`https://your-strata.vercel.app/app/coding`
