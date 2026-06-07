# Strata 桌面版（Tauri）

> 把 Strata 打包為 macOS / Windows / Linux 原生應用。資料完全在使用者電腦，零雲端。

## 為什麼有桌面版

Strata 的網頁版（部署在 Vercel）已經是 local-first 架構：所有研究資料只存在使用者瀏覽器的 `localStorage`，Strata 後端從不持久化。桌面版進一步：

- **完全不需要伺服器** — 沒有部署、沒有 region 鎖
- **AI 直接從你電腦呼叫** — API key 不經第三方
- **可離線跑** — 沒網路也能編碼（網路只在拉公開資料源或 AI 推理時用）
- **公聽會敏感資料不會出你電腦** — 研究倫理友善

## 系統需求（使用者端）

| 平台 | 最低 | 安裝包大小 |
|---|---|---|
| macOS | 10.15+ | ~10 MB |
| Windows | 10 1809+ | ~12 MB |
| Linux | webkit2gtk 4.1 | ~15 MB |

## 開發者：本地建置

### 一次性安裝

需要 Rust toolchain：

```bash
# macOS / Linux
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows
# 從 https://rustup.rs 下載安裝程式
```

平台特定相依（Tauri 文件）：

- **macOS**：`xcode-select --install`（Xcode Command Line Tools）
- **Windows**：Visual Studio 2022 C++ build tools
- **Linux**：`libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`

接著安裝專案依賴：

```bash
npm install
```

### 開發模式

```bash
npm run tauri:dev
```

啟動：
1. Next.js dev server（http://localhost:3000）
2. Tauri 視窗載入它
3. 修改前端即時熱重載；修改 `src-tauri/src/*.rs` 自動重啟

### 建置安裝包

```bash
npm run tauri:build
```

產出（依平台不同）：

```
src-tauri/target/release/bundle/
├── macos/Strata.app
├── dmg/Strata_0.1.0_aarch64.dmg
├── msi/Strata_0.1.0_x64_en-US.msi
├── nsis/Strata_0.1.0_x64-setup.exe
├── deb/strata_0.1.0_amd64.deb
└── appimage/strata_0.1.0_amd64.AppImage
```

> 注意：本機只能 build 自己的平台。跨平台 build 需要 GitHub Actions（見下）。

## 架構：桌面 vs 網頁的差異

| 元件 | Vercel 網頁版 | Tauri 桌面版 |
|---|---|---|
| 前端 | Next.js SSR + 靜態頁 | Next.js static export |
| PDF / Word 解析 | `/api/parse` 後端 | 客戶端 pdf.js / mammoth |
| AI 呼叫 | `/api/ai/*` 後端 | Tauri HTTP 直發供應商 |
| 公開資料源 | `/api/sources/*` 後端 | Tauri HTTP 直發 |
| 持久化 | localStorage（純前端） | localStorage（純前端） |
| API key 儲存 | localStorage | localStorage |

關鍵：所有原本在 `/api/*` 的後端邏輯，桌面版改為**客戶端直發**，透過 Tauri 的 `@tauri-apps/plugin-http` 繞過瀏覽器 CORS 限制。

## 建置流程

`npm run tauri:build` 會：

1. 跑 `npm run build:tauri`
   → 執行 `node scripts/build-tauri.mjs`
   → 暫時搬走 `src/app/api`（static export 不允許 API routes）
   → 跑 `next build` with `TAURI_BUILD=1`（觸發 `output: 'export'`）
   → 還原 `src/app/api`
   → 產出 `./out/`（純靜態前端）

2. Tauri 把 `./out/` 包進 Rust 應用殼

3. 用 `cargo build --release` 產出原生執行檔

4. 用平台特定打包工具（DMG / MSI / NSIS / deb / AppImage）打包

## 跨平台 build（GitHub Actions）

待加入 `.github/workflows/release.yml`，會在每個 tag push 自動：
- macOS Apple Silicon（aarch64）
- macOS Intel（x64）
- Windows x64
- Linux x64

並把產出附加到 GitHub Release。

## 已知限制

1. **自訂編碼簿頁面在桌面版無法直接 URL 開啟**
   只有內建編碼簿有預生成 HTML；自訂編碼簿須從庫頁面 SPA 導航進入（多數使用者本來就會這樣做）。

2. **首次建置 Rust 較久**
   首次 `tauri:build` 約 5–15 分鐘編譯 Rust 相依。之後增量編譯快。

3. **macOS 程式碼簽章**
   未簽章的 .app 開啟時 macOS 會警告「無法驗證開發者」。生產環境需 Apple Developer Program 簽章（$99/年）。學術發佈可附說明請使用者右鍵打開繞過。

## 維運成本

| 項目 | 估計 |
|---|---|
| Apple Developer Program | $99 / 年（生產發佈簽章）|
| Windows 程式碼簽章憑證 | $200–500 / 年（避免 SmartScreen 警告）|
| GitHub Actions（build） | 公開 repo 免費 |
| 自動更新伺服器 | 用 GitHub Releases，免費 |

**沒簽章也能用**，使用者需要手動允許。學術 / 內部使用完全可行。
