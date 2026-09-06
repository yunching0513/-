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
│   ├── screenshots/                        iPhone 6.9 吋五張 1290×2796（Play 也用這組）
│   ├── screenshots-ipad/                   iPad 13 吋五張 2048×2732
│   └── listing.md                          中英文名稱、描述、關鍵字、分級答案、送審備註
├── scripts/store/shoot.mjs                 重新產生上面兩組截圖（npm run screenshots）
├── src-tauri/Info.ios.plist                iOS Info.plist 覆寫（Tauri 自動合併）
├── src-tauri/ios/PrivacyInfo.xcprivacy     隱私權資訊清單（需在 Xcode 手動加入）
├── scripts/preflight-ios.mjs               送審前自動檢查
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

## 三、App Store（用 Xcode 送審）

> 這一節每一步都要在**你自己的 Mac** 上、用**你自己的 Apple ID** 操作。
> 程式端該備妥的都備妥了，開始之前先跑一次自動檢查（見 3-0）。

### 3-0. 先跑送審前檢查

```bash
cd pomodoro
node scripts/preflight-ios.mjs
```

它會檢查那些「上傳之後才會被 Apple 退回」的東西：圖示尺寸與 alpha 色版、
截圖規格、文案長度、隱私權資訊清單的理由代碼、版本號一致性。
**出現 ✗ 就先修掉再往下走**，不然會白跑一趟上傳流程。

### 3-1. 開發者帳號（約 1–2 天）

1. <https://developer.apple.com/programs/> 加入 Apple Developer Program，US$99／年
2. 個人身分即可，需通過 Apple 的身分驗證
3. 進 <https://appstoreconnect.apple.com> →「協議、稅務和銀行業務」
   **同意所有合約**，並填完稅務表
   （免費 App 也要填，沒填的話 App 會卡在「準備銷售」永遠不上架）

### 3-2. Mac 上的環境

```bash
xcode-select --install                 # 命令列工具
brew install rustup node               # 沒有的話
rustup target add aarch64-apple-ios    # 實機架構
sudo gem install cocoapods             # Tauri iOS 需要
```

Xcode 從 App Store 安裝，第一次開啟要讓它裝完元件。

### 3-3. 取得原始碼並產生 Xcode 專案

```bash
git clone https://github.com/yunching0513/-.git
cd -/pomodoro
git checkout claude/pomodoro-focus-tool-er00mo
npm install
npx tauri ios init
```

`ios init` 會在 `src-tauri/gen/apple/` 產生 Xcode 專案。
`src-tauri/Info.ios.plist` 會自動合併進去，不用另外處理。

> **提醒**：`gen/apple/` 是產生出來的。等一下在 Xcode 裡做的設定（3-5、3-6）
> 只要重跑 `tauri ios init` 就會不見。第一次設定完之後，建議把 `gen/apple/`
> 提交進 git（`.gitignore` 已經幫你排除掉裡面的建置產物）。

### 3-4. 打開專案

```bash
open src-tauri/gen/apple/Flowmato.xcodeproj
```

### 3-5. 簽章與裝置

左側點最上面的專案 → **TARGETS** 選 `Flowmato_iOS`：

| 分頁 | 要做的事 |
|---|---|
| **Signing & Capabilities** | 勾 **Automatically manage signing**；**Team** 選你的帳號；確認 Bundle Identifier 是 `tw.yunching.flowmato` |
| **General → Supported Destinations** | 保留 **iPhone** 與 **iPad**（預設就是兩個都有，不用動） |

**iPad 是支援的**：`ui/style.css` 有一段平板版面（`@media (min-width: 700px)
and (min-height: 700px)`），環會放大、面板變成置中的對話框、字級整組跟著加大。
直向橫向都測過（13 吋／11 吋／mini），分割檢視縮到手機寬時會自動退回手機版面。
因為支援 iPad，**App Store Connect 會另外要求一組 iPad 截圖**，已經備妥在
`store/screenshots-ipad/`。

Xcode 會自動幫你建立憑證與 provisioning profile，不需要手動去開發者網站產生。

### 3-6. 加入隱私權資訊清單（**這步不能跳過**）

Apple 會掃描上傳的 binary。用到「必須說明理由的 API」卻沒宣告的話，
上傳後會收到 **ITMS-91053** 通知信，送審會被擋下來。Rust 標準函式庫與
WebView 一定會碰到這些 API，所以檔案已經幫你寫好了，只差放進專案：

1. Finder 打開 `pomodoro/src-tauri/ios/`
2. 把 **`PrivacyInfo.xcprivacy`** 拖進 Xcode 左側的 `Flowmato_iOS` 群組
3. 彈出的對話框：
   - ✅ 勾 **Copy items if needed**
   - ✅ **Add to targets** 勾 `Flowmato_iOS`
4. 確認方式：選 target →**Build Phases → Copy Bundle Resources**，
   清單裡要看得到 `PrivacyInfo.xcprivacy`

裡面宣告了三類 API 與理由代碼（檔案時間戳記 `C617.1`／`3B52.1`、
UserDefaults `CA92.1`、系統開機時間 `35F9.1`），以及「不追蹤、不收集任何資料」。

### 3-7. 在 App Store Connect 建立 App

<https://appstoreconnect.apple.com> → **我的 App** → **＋** → **新增 App**

| 欄位 | 填什麼 |
|---|---|
| 平台 | iOS |
| 名稱 | `Flowmato 心流鐘` |
| 主要語言 | 繁體中文 |
| 套件識別碼 | 選 `tw.yunching.flowmato`（3-5 之後才會出現在清單裡） |
| SKU | 隨便一個自己看得懂的字串，例如 `flowmato-001` |

### 3-8. 建置並上傳

回到 Xcode：

1. 上方裝置選單選 **Any iOS Device (arm64)**
   （選模擬器的話 Archive 選項會是灰的）
2. 選單 **Product → Archive**
   第一次會跑滿久，Rust 要編譯 release
3. 跑完會跳出 **Organizer**，選剛剛那個 Archive → **Distribute App**
4. 依序選 **App Store Connect** → **Upload** → 一路 Next
5. 簽章方式選 **Automatically manage signing**
6. 按 **Upload**，等它跑完

上傳成功後，App Store Connect 那邊要再花 **10–30 分鐘**處理，
建置版本才會出現在「TestFlight」與版本頁的「建置版本」欄位。

> 有問題的話 Apple 會寄信來（寄件人 App Store Connect）。
> 最常見的是 ITMS-91053（隱私權清單，見 3-6）。

### 3-9. 填商店資訊

在版本頁面依 `store/listing.md` 填：

- **名稱／副標題／關鍵字／描述／宣傳文字** — 直接複製
- **截圖** — 兩組都要傳：
  - **iPhone 6.9 吋** ← `store/screenshots/`（五張，1290×2796）
  - **iPad 13 吋** ← `store/screenshots-ipad/`（五張，2048×2732）
- **App 圖示** — `store/appstore-icon-1024.png`
- **隱私權政策網址** — `https://yunching0513.github.io/-/privacy.html`
  （**要先啟用 GitHub Pages，並自己點開確認打得開**）
- **App 隱私**（左側選單獨立頁面）— 選「**不收集資料**」
- **年齡分級** — 依 listing.md 的問卷答案填，預期 4+
- **建置版本** — 選 3-8 上傳的那一版
- **審查備註** — 貼 listing.md 最後那段英文（說明離線運作、無帳號、通知用途）

### 3-10. 送審

按右上角 **加入審查** → **提交以供審查**。通常 24–48 小時有結果。

### 3-11. 之後要更新版本

1. 改 `src-tauri/tauri.conf.json` 的 `version`（例如 `1.0.1`）
   —— 每次上傳都必須比上一次大，否則會被退
2. `node scripts/preflight-ios.mjs` 再跑一次
3. 重複 3-8（Archive → Upload）
4. 在 App Store Connect 建立新版本、選新的建置版本、送審

---

## 四、被拒審時最可能的原因

依這個 App 的性質，風險排序：

1. **健康宣稱**（最高風險）
   商店文案已刻意避開「腦波」「神經」「療效」等字眼。
   **請不要自行加回去。** 若審查員詢問音訊功能，回覆：這是提供給使用者選擇的背景聲音，
   App 未宣稱任何健康或醫療效果。

2. **功能過於簡單**（Apple Guideline 4.2 Minimum Functionality）
   計時器類 App 常被以此拒絕。若遇到，強調 Flowmato 不只是計時器：
   有待辦與專注的連動、規劃顆數與實際的對照、思緒卸載、下次起點記錄、休息鎖定、
   兩層可疊加音景，以及**完整的工作歷程與日曆匯出**（月曆檢視、每日專注紀錄、.ics 匯出）。
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
- ✅ iOS 送審前置：`Info.ios.plist`（免出口合規問答、鎖直向）、
  `PrivacyInfo.xcprivacy`（三類必須說明理由的 API，代碼已對照實際出貨的 SDK 驗證）
- ✅ `scripts/preflight-ios.mjs`：圖示 alpha、兩組截圖尺寸、文案長度、版本一致性一次檢查
- ✅ iPad 版面：環與字級隨螢幕放大、面板改為置中對話框，
  13 吋／11 吋／mini 的直向橫向與分割檢視都驗證過
- ✅ iPad 13 吋商店截圖（`npm run screenshots` 可重新產生兩組）

## 附錄：我無法完成的部分，以及原因

- ❌ **開發者帳號**：需要你的身分證件、信用卡、簽署合約
- ❌ **簽章憑證**：Apple 憑證只能從你的帳號產生；Android 上傳金鑰應由你保管
- ❌ **送出審查**：需在你的帳號後台操作
- ❌ **iOS 完整打包與上傳**：需要 macOS + Xcode + 你的憑證（這個環境是 Linux）。
  Xcode 那一段已逐步寫在第三節，照著點即可
- ❌ **把 PrivacyInfo.xcprivacy 加進 Xcode target**：`gen/apple/` 要跑過
  `tauri ios init` 才存在，只能在你的 Mac 上做（3-6，拖曳一次）
- ⚠️ **背景音訊**：切換到其他 App 時音景會暫停。iOS 要讓 WebView 的音訊在背景續播，
  需要額外的原生設定（AVAudioSession + background audio 權限），且 Apple 對
  「只為了播放背景音而宣告 audio 模式」的審查較嚴。目前設計是前景播放，計時本身
  不受影響（已由排程通知處理）。
