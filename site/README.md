# 個人網站 · Personal Website

吳昀慶 Yun-Ching Wu 的個人網站——純靜態 HTML / CSS / JS，沒有建置步驟。

- `index.html` — 全部內容（中英雙語，以 `.zh-only` / `.en-only` 切換）
- `styles.css` — 設計 token 與版面
- `main.js` — 語言切換、捲動淡入
- `.nojekyll` — 讓 GitHub Pages 直接輸出檔案，不經 Jekyll

## 設計語彙

視覺語言取自《こども本の森 中之島 — UI 設計準則 v1.0》：

| Token | 值 | 用途 |
| --- | --- | --- |
| `--accent` | `#2E5339` | 森林綠——連結、CTA、強調 |
| `--paper` | `#F3EFE4` | 紙——頁面底色 |
| `--surface` | `#FCFBF6` | 卡片表面 |
| `--panel` | `#EAE3D2` | 麻——區塊底 |
| `--ink` / `--ink-soft` | `#211F18` / `#6A665A` | 主文字 / 次文字 |
| `--pink` `--yellow` `--sky` | `#E89AB0` `#E6CF3E` `#8FB9C9` | 點綴，小面積使用 |

- 字體：Huninn（粉圓）+ Varela Round，單一字重，粗體以 `-webkit-text-stroke` 模擬
- 間距：8 的倍數（段落 24、區塊 72、章節 120）；容器最大寬 1180，桌面邊距 40 / 手機 20
- 圓角：卡片 18–20、輸入 14、膠囊 9999
- 動效：淡入上移 0.8s `cubic-bezier(.4,0,.2,1)`，列表交錯 80ms；`prefers-reduced-motion` 全部關閉

## 本機預覽

```bash
cd site
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

## 部署

推到 `main` 後由 `.github/workflows/pages.yml` 自動部署到 GitHub Pages。
需要在 repo 的 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**。

## 內容更新

所有文字都在 `index.html` 裡，中英文成對出現：

```html
<span class="zh-only">中文</span><span class="en-only">English</span>
```

改字直接編輯即可，不需要重新建置。

## 隱私

CV 上的市話／手機與住家地址沒有放上網站——公開頁面只留 email、LinkedIn 與所在城市。
若要補上，直接編輯 `index.html` 的 Contact 區塊。
