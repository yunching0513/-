# 專注音樂：外部生成指南與 Prompt 包

App 目前的音景是 WebAudio 即時合成（雙耳節拍＋噪音＋和聲鋪底），
優點是零檔案、離線、無版權問題，缺點是**做不出真正的音樂織體**。
要更好的聽感，就得用專業 AI 音樂服務生成音檔再嵌入。

---

## 一、該用哪個服務

| 服務 | 網址 | 最適合 | 商用授權 |
|---|---|---|---|
| **Stable Audio** | stableaudio.com | **App 背景音首選**——原生支援指定秒數與無縫循環，專長 ambient / 質感聲響 | 付費方案含商用 |
| **Suno** | suno.com | 音樂性最完整、最好聽；適合做「有記憶點」的休息曲 | 需付費方案（Pro/Premier）才有商用權 |
| **Udio** | udio.com | 音質細節與空間感佳，ambient 表現好 | 需付費方案 |
| **Mubert** | mubert.com | **專做 App 內嵌的功能性音樂**，授權條款最單純，有 API 可串流 | 有明確的 App 嵌入授權方案 |
| **Beatoven.ai** | beatoven.ai | 無版權配樂，情緒導向調整 | 付費含商用 |
| **ElevenLabs Music** | elevenlabs.io/music | 較新，授權條款寫得清楚 | 付費含商用 |

**選擇建議**

- 只是自己用 → **Suno** 最好聽，直接生成下載
- 要放進上架的 App → **Stable Audio** 或 **Mubert**。前者能直接產無縫 loop，後者授權最不會出事
- ⚠️ **免費方案通常不給商用權**。App 上架屬商業使用，務必在生成前確認你當下方案的條款（各家改版頻繁，以官方頁面為準）

---

## 二、Prompt 包

四段分別對應 App 現有的四種狀態。**每段都刻意排除旋律起伏、人聲、段落變化**——
背景音一旦有「發展」就會勾走注意力，那正是專注音樂最該避免的事。

### 1. Beta ／ 分析型（硬核工作、寫程式、算數據）

Suno / Udio 用：

```
Minimal ambient techno for deep analytical focus. Steady hypnotic 4/4 pulse
at 100 BPM with a soft muted kick, no snare, no hi-hat fills, no percussion breaks.
Warm analog pad sustained in D minor with a barely-there Rhodes arpeggio far back
in the mix. Completely consistent energy from start to finish — no intro, no build-up,
no drop, no breakdown, no outro. Instrumental only: absolutely no vocals, no vocal
samples, no spoken word. Dry, narrow dynamic range, everything sits low and even.
Designed to be ignored while working.
```

Stable Audio 用（標籤式，更好控）：

```
minimal ambient techno, 100 BPM, D minor, muted kick, warm analog pad,
subtle rhodes, static arrangement, no vocals, no build-up, low dynamic range,
seamless loop, background music for concentration
```

### 2. Alpha ／ 吸收型（閱讀、理解、吸收新知）

```
Slow beatless ambient for reading and absorption. No percussion of any kind,
no rhythmic pulse. Sustained warm string pad and soft analog synth in A major
with very slow attack and long release. Gentle tape saturation, distant plate reverb.
Static harmony — the chord never resolves, never progresses, it just breathes.
No melody line whatsoever. Instrumental only, no vocals. Extremely low dynamic range,
soft and continuous, nothing ever enters or exits abruptly.
```

Stable Audio：

```
beatless ambient drone, A major, sustained string pad, analog synth,
slow attack, tape saturation, plate reverb, static harmony, no melody,
no percussion, no vocals, seamless loop, calm reading music
```

### 3. Theta ／ 發散型（找靈感、想點子、放空式閱讀）

```
Deep meditative ambient for creative wandering and daydreaming. Completely beatless,
no rhythm, no pulse. Low sustained drone in A with slowly evolving granular textures
that morph over minutes rather than seconds. Occasional sparse harmonic overtone
appearing and dissolving. Very long reverb tails, wide stereo field, a sense of depth and space.
No melody, no chord progression, no vocals, no percussion. Hypnotic and spacious,
like a room tone from somewhere else.
```

Stable Audio：

```
deep meditative ambient drone, A, granular texture, slowly evolving,
long reverb, wide stereo, sparse overtones, no melody, no percussion,
no vocals, seamless loop, music for daydreaming
```

### 4. 休息 ／ DMN 恢復（5 分鐘低認知負荷休息）

```
Calm restorative ambient for a five minute rest. Beatless and warm. Sparse felt piano —
a single soft note every four to eight seconds, never forming a phrase or melody.
Warm pad underneath in A major. A quiet field recording texture low in the mix:
light rain on a window, or distant ocean. Nothing develops, nothing builds.
Instrumental, no vocals. The feeling of looking out of a window without thinking.
```

Stable Audio：

```
calm restorative ambient, A major, sparse felt piano, warm pad,
light rain field recording, beatless, no melody development, no vocals,
seamless loop, five minute rest music
```

---

## 三、拿到無縫循環的技巧

背景音會一直重播，接縫聽得出來就毀了。

1. **首選 Stable Audio 的 loop 模式**——直接產出頭尾對得上的檔案
2. Suno / Udio 生成的曲子要自己處理：
   - 用 Audacity（免費）開檔 → 選整段 → `Effect → Crossfade Clips`
   - 或簡單做法：剪掉開頭 2 秒與結尾 2 秒，讓中段最穩定的部分成為 loop
3. **prompt 一定要寫 `seamless loop` 與 `no intro, no outro`**——有前奏尾奏的曲子無法循環
4. 生成 **2–3 分鐘**即可，太長會讓 App 體積暴增

---

## 四、生成完之後：怎麼接進 App

音檔給我就能接，架構已經預留位置：

1. 檔案放進 `pomodoro/ui/audio/`，命名 `beta.opus` / `alpha.opus` / `theta.opus` / `rest.opus`
2. 格式建議 **Opus**（`.opus`），128 kbps 立體聲——同音質下比 MP3 小約 40%
   ```bash
   ffmpeg -i input.wav -c:a libopus -b:a 128k -application audio output.opus
   ```
   2 分鐘的檔案約 1.8 MB，四首約 7 MB
3. 我會把 `buildPad()` 那層換成 `AudioBufferSourceNode` 播放音檔並 `loop = true`，
   雙耳節拍與環境音維持合成（那兩層合成的效果本來就夠好，且能無限循環不佔空間）
4. 音檔層與合成層共用同一組淡入淡出與音量控制，切換模式時一樣 crossfade

**保留合成版作為 fallback**：音檔載入失敗或使用者關閉時，自動退回目前的合成和聲，
離線與低頻寬情境不會沒有聲音。

---

## 五、上架前的授權注意事項

要送 App Store / Google Play 的話：

- 保留**生成服務的授權證明**（訂閱方案頁面截圖、授權條款、生成紀錄），送審被問到才有東西回
- 部分服務要求在 App 內標註來源（例如「Music generated with X」），確認你的方案是否需要
- 免費方案生成的音樂**不能**用在上架 App，這是最常見的踩雷點
- App 內若有音樂播放，商店的內容分級問卷要據實回答

