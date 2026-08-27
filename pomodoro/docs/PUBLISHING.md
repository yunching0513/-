# Flowmato 上架指南（App Store ／ Google Play）

> 程式、圖示、截圖、文案、CI 都已備妥。剩下的每一步都需要**你本人的帳號與身分**，
> 沒有人能代勞。這份文件按順序列出你要做的事。

---

## 零、先看這裡：成本與時程

| | App Store | Google Play |
|---|---|---|
| 費用 | **US$99／年**（持續） | **US$25**（一次性） |
| 帳號審核 | 數小時～2 天 | 數小時～2 天 |
| 個人開發者額外要求 | 無 | **需先找 12 位測試者，連續 14 天封閉測試**，才能申請正式發布 |
| App 審查 | 通常 24–48 小時 | 通常 1–7 天（首次較久） |
| 你需要的裝置 | **一台 Mac**（上傳與簽章） | 任何電腦 |

**時程現實**：Apple 從註冊到上線，順利的話約 1 週。
Google Play 因為那個 12 人 / 14 天的規定，個人帳號從零到正式上架**至少三週**。
建議兩邊同時開始跑帳號流程。

---

## 一、素材都在哪裡

```
pomodoro/
├── store/
│   ├── appstore-icon-1024.png              App Store 行銷圖示（1024×1024，無透明）
│   ├── play-icon-512.png                   Play 商店圖示（512×512）
│   ├── play-feature-graphic-1024x500.png   Play 功能圖片（必填）
│   ├── screenshots/                        五張 1290×2796，兩邊商店都可用
│   └── listing.md                          中英文名稱、描述、關鍵字、分級答案、送審備註
├── src-tauri/icons/ios/                    iOS AppIcon 全尺寸（15 個）
├── src-tauri/icons/android/                Android 五種密度 + adaptive icon 圖層
└── ui/privacy.html                         隱私權政策（兩邊都強制要求公開網址）
```

**隱私權政策網址**：需要一個公開 URL。啟用 GitHub Pages 後即為
`https://yunching0513.github.io/-/privacy.html`（啟用方式見主 README）。
兩邊商店的表單都要填這個網址。

---

## 二、Google Play

### 1. 開帳號
1. 前往 <https://play.google.com/console> 用 Google 帳號註冊
2. 選「個人」帳號類型，付 US$25
3. 完成身分驗證（需上傳證件、填寫地址；個人帳號還需驗證實際地址，可能收到實體信件）

### 2. 產生上傳金鑰（只做一次，務必備份）
在你自己的電腦執行：
```bash
keytool -genkey -v -keystore flowmato-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```
> ⚠️ **這個 .jks 檔和密碼弄丟就無法再更新 App**。請備份到密碼管理器或離線硬碟。
> 不要 commit 進 git。

### 3. 讓 CI 幫你建置已簽章的 AAB
把金鑰放進 GitHub Secrets（Settings → Secrets and variables → Actions）：

| Secret 名稱 | 值 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -i flowmato-upload.jks`（macOS）或 `base64 -w0 flowmato-upload.jks`（Linux）的輸出 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 你設定的金鑰密碼 |
| `ANDROID_STORE_PASSWORD` | 你設定的 keystore 密碼 |

然後到 **Actions → Flowmato mobile build → Run workflow**，
完成後在 Artifacts 下載 `flowmato-android`，裡面是 `.aab`。

> 沒設定 Secrets 也能跑，但產出的是 debug 簽章版本，只能自己安裝測試，不能上傳。

### 4. 建立商店資訊
在 Play Console 建立應用程式，依 `store/listing.md` 填入：
- 應用程式名稱、簡短說明、完整說明
- 上傳 `play-icon-512.png` 與 `play-feature-graphic-1024x500.png`
- 上傳 `screenshots/` 內的圖（至少 2 張，最多 8 張）
- 隱私權政策網址
- **資料安全表單**：全部選「不收集資料」（依 listing.md 的表格填）
- **內容分級問卷**：依 listing.md 的表格填，預期為「適合所有人」

### 5. 封閉測試（個人帳號的必經關卡）
1. 建立「封閉測試」版本，上傳 AAB
2. 建立測試人員名單，**至少 12 個 Google 帳號**（朋友、同事、自己的其他帳號都可以）
3. 讓他們實際安裝並持續參與 **14 天**
4. 期滿後在 Console 申請「正式發布」存取權，等待審核

### 6. 正式發布
通過後建立正式版本、上傳同一個 AAB、送出審查。

---

## 三、App Store

### 1. 開帳號
1. 前往 <https://developer.apple.com/programs/> 註冊 Apple Developer Program（US$99/年）
2. 個人身分即可，需通過 Apple 的身分驗證
3. 在 App Store Connect 同意所有合約，並填寫稅務與銀行資訊（免費 App 也要填稅務表）

### 2. 在你的 Mac 上準備
需要 Xcode（App Store 免費下載）、Rust、Node 22+：
```bash
git clone https://github.com/yunching0513/-.git
cd -/pomodoro
npm install
npx tauri ios init
```

### 3. 設定簽章
```bash
open src-tauri/gen/apple/Flowmato.xcodeproj
```
在 Xcode 中：
1. 選 **Flowmato_iOS** target → **Signing & Capabilities**
2. 勾選 **Automatically manage signing**
3. **Team** 選你的開發者帳號 → Xcode 會自動建立憑證與 provisioning profile
4. 確認 **Bundle Identifier** 是 `tw.yunching.flowmato`

（也可以把 Team ID 寫進 `src-tauri/tauri.conf.json` 的 `bundle.iOS.developmentTeam`，
之後就能用指令建置。）

### 4. 建置並上傳
```bash
npx tauri ios build --export-method app-store-connect
```
產出的 `.ipa` 在 `src-tauri/gen/apple/build/`。
用 **Transporter**（App Store 免費下載）上傳，或在 Xcode 用 Product → Archive → Distribute App。

### 5. 建立商店資訊
在 App Store Connect 建立 App，依 `store/listing.md` 填入：
- 名稱、副標題、關鍵字、描述、宣傳文字
- 上傳 `screenshots/` 的圖（6.7 吋必填，其他尺寸 Apple 會自動縮放）
- 上傳 `appstore-icon-1024.png`
- 隱私權政策網址
- **App 隱私**：全部選「不收集資料」
- **分級**：依 listing.md 的表格填，預期 4+
- **審查備註**：把 listing.md 最後那段英文貼上（說明離線運作、無帳號、通知用途）

### 6. 送審
選擇建置版本 → 提交審查。通常 24–48 小時有結果。

---

## 四、被拒審時最可能的原因

依這個 App 的性質，風險排序：

1. **健康宣稱**（最高風險）
   商店文案已刻意避開「腦波」「神經」「療效」等字眼。
   **請不要自行加回去。** 若審查員詢問音訊功能，回覆：這是提供給使用者選擇的背景聲音，
   App 未宣稱任何健康或醫療效果。

2. **功能過於簡單**（Apple Guideline 4.2 Minimum Functionality）
   計時器類 App 常被以此拒絕。若遇到，強調 Flowmato 不只是計時器：
   有待辦與專注的連動、思緒卸載、下次起點記錄、休息鎖定、三層可疊加音景，
   以及**完整的工作歷程與日曆匯出**（月曆檢視、每日專注紀錄、.ics 匯出）。
   截圖已針對這點設計。

3. **隱私權政策網址無法開啟**
   送審前務必自己點一次確認 Pages 已啟用且頁面正常。

4. **Play 資料安全表單與實際不符**
   我們宣告「不收集資料」，而 App 確實沒有任何網路請求，這點是一致的。
   若未來加入任何分析或雲端同步，**必須同步更新表單**。

---

## 五、上架之後

- 版本更新：改 `src-tauri/tauri.conf.json` 的 `version`，Android 另需遞增 `versionCode`
- Play 的 versionCode 每次上傳都必須比上一次大
- 兩邊都支援分階段發布，建議首次上線用 20% 逐步放量

---

## 附錄：我已經完成的部分

- ✅ iOS / Android 專案設定（bundle id、最低版本、圖示路徑）
- ✅ Rust 端已拆分桌面／行動（選單列與視窗置頂僅桌面，已通過兩個 target 的編譯檢查）
- ✅ 行動版 UI：安全區域、觸控目標 ≥44px、不透明覆蓋層、內容垂直置中
- ✅ 背景計時：進背景前預先排程本地通知，回前景以時間戳重算（不會因 JS 凍結而失準）
- ✅ 全平台圖示（含 Android adaptive icon 的前景／背景圖層）
- ✅ 商店截圖、功能圖片、中英文文案、分級與資料安全問卷答案
- ✅ 隱私權政策頁
- ✅ CI：Android AAB 建置（可選簽章）、iOS 編譯驗證

## 附錄：我無法完成的部分，以及原因

- ❌ **開發者帳號**：需要你的身分證件、信用卡、簽署合約
- ❌ **簽章憑證**：Apple 憑證只能從你的帳號產生；Android 上傳金鑰應由你保管
- ❌ **送出審查**：需在你的帳號後台操作
- ❌ **iOS 完整打包**：需要 macOS + Xcode + 你的憑證（這個環境是 Linux）
- ⚠️ **背景音訊**：切換到其他 App 時音景會暫停。iOS 要讓 WebView 的音訊在背景續播，
  需要額外的原生設定（AVAudioSession + background audio 權限），且 Apple 對
  「只為了播放背景音而宣告 audio 模式」的審查較嚴。目前設計是前景播放，計時本身
  不受影響（已由排程通知處理）。
