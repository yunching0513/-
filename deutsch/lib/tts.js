(function () {
'use strict';

/* ————————————————————————————————————————————————
   語音合成：Google Cloud Text-to-Speech
   ————————————————————————————————————————————————
   反覆訓練的特性是同一句話會被播幾十次，所以快取不是最佳化，
   是這個功能能不能用的前提 —— 沒有快取，練十分鐘就打掉幾百次
   API 呼叫，帳單與延遲都撐不住。合成後的 MP3 存進 IndexedDB，
   之後同一句、同一個聲音、同一個語速就直接從本機拿。

   金鑰放在 localStorage、從瀏覽器直接打 Google，是「自備金鑰」
   的常見做法（Strata 也是這樣）。代價是金鑰對這台電腦的使用者
   可見，所以 README 要求在 Google Cloud Console 限制這把金鑰：
   只開 Text-to-Speech API，再加 HTTP referrer 限制。

   沒有金鑰時退回瀏覽器內建的 speechSynthesis，App 仍然可用，
   只是聲音是系統的德語語音。
   ———————————————————————————————————————————————— */

const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const VOICES_ENDPOINT = 'https://texttospeech.googleapis.com/v1/voices';

/* 沒連上 API 時先給一份可用清單。實際清單開 App 時會去問 Google。 */
const FALLBACK_VOICES = [
  { name: 'de-DE-Chirp3-HD-Kore',    ssmlGender: 'FEMALE', tier: 'Chirp3 HD' },
  { name: 'de-DE-Chirp3-HD-Puck',    ssmlGender: 'MALE',   tier: 'Chirp3 HD' },
  { name: 'de-DE-Chirp3-HD-Aoede',   ssmlGender: 'FEMALE', tier: 'Chirp3 HD' },
  { name: 'de-DE-Chirp3-HD-Charon',  ssmlGender: 'MALE',   tier: 'Chirp3 HD' },
  { name: 'de-DE-Neural2-F',         ssmlGender: 'FEMALE', tier: 'Neural2' },
  { name: 'de-DE-Neural2-B',         ssmlGender: 'MALE',   tier: 'Neural2' },
  { name: 'de-DE-Wavenet-C',         ssmlGender: 'FEMALE', tier: 'WaveNet' },
  { name: 'de-DE-Wavenet-B',         ssmlGender: 'MALE',   tier: 'WaveNet' },
  { name: 'de-DE-Standard-A',        ssmlGender: 'FEMALE', tier: 'Standard' },
];

/* Chirp3-HD 這一代不吃 SSML，也不吃 pitch，送了會 400。 */
const isChirp = (voice) => /Chirp/i.test(voice || '');

function voiceTier(name) {
  if (/Chirp3-HD/i.test(name)) return 'Chirp3 HD';
  if (/Chirp/i.test(name)) return 'Chirp HD';
  if (/Studio/i.test(name)) return 'Studio';
  if (/Polyglot/i.test(name)) return 'Polyglot';
  if (/Neural2/i.test(name)) return 'Neural2';
  if (/Wavenet/i.test(name)) return 'WaveNet';
  return 'Standard';
}

/* ———— IndexedDB 音檔快取 ———— */
const DB_NAME = 'nochmal-audio';
const STORE = 'clips';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    let req;
    try { req = indexedDB.open(DB_NAME, 1); }
    catch { return resolve(null); }          // 無痕模式等情況
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

const cacheKey = (text, voice, rate) => `${voice}|${rate.toFixed(2)}|${text}`;

async function cacheGet(key) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

async function cachePut(key, blob) {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
  } catch { /* 配額滿了就當作沒快取，不影響播放 */ }
}

async function cacheCount() {
  const db = await openDB();
  if (!db) return 0;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => resolve(0);
  });
}

async function cacheClear() {
  const db = await openDB();
  if (!db) return;
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
}

/* ———— 主體 ———— */
class Speaker {
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || '';
    this.voice = opts.voice || 'de-DE-Chirp3-HD-Kore';
    this.rate = opts.rate == null ? 1 : opts.rate;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.lastError = null;
    this.usingFallback = !this.apiKey;
    this._urls = [];     // 播完要收回的 objectURL
  }

  configure(opts = {}) {
    if ('apiKey' in opts) this.apiKey = (opts.apiKey || '').trim();
    if ('voice' in opts && opts.voice) this.voice = opts.voice;
    if ('rate' in opts && opts.rate != null) this.rate = opts.rate;
    this.usingFallback = !this.apiKey;
  }

  /** 問 Google 有哪些德語聲音。沒金鑰或失敗就回退到內建清單。 */
  async listVoices() {
    if (!this.apiKey) return FALLBACK_VOICES.slice();
    try {
      const res = await fetch(`${VOICES_ENDPOINT}?languageCode=de-DE&key=${encodeURIComponent(this.apiKey)}`);
      if (!res.ok) throw new Error(await describeError(res));
      const data = await res.json();
      const voices = (data.voices || [])
        .filter((v) => (v.languageCodes || []).some((c) => c.startsWith('de-DE')))
        .map((v) => ({ name: v.name, ssmlGender: v.ssmlGender, tier: voiceTier(v.name) }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return voices.length ? voices : FALLBACK_VOICES.slice();
    } catch (err) {
      this.lastError = err.message;
      return FALLBACK_VOICES.slice();
    }
  }

  /** 只驗證金鑰能不能用，設定頁的「Test」按鈕用這個。 */
  async testKey() {
    if (!this.apiKey) return { ok: false, message: 'No API key set.' };
    try {
      const res = await fetch(`${VOICES_ENDPOINT}?languageCode=de-DE&key=${encodeURIComponent(this.apiKey)}`);
      if (!res.ok) return { ok: false, message: await describeError(res) };
      const data = await res.json();
      return { ok: true, message: `Connected. ${(data.voices || []).length} German voices available.` };
    } catch (err) {
      return { ok: false, message: `Network error: ${err.message}` };
    }
  }

  /** 取得（必要時合成）一段語音的 Blob。 */
  async synthesize(text, rateOverride) {
    const rate = rateOverride == null ? this.rate : rateOverride;
    const key = cacheKey(text, this.voice, rate);
    const hit = await cacheGet(key);
    if (hit) return { blob: hit, cached: true };

    const body = {
      input: { text },
      voice: { languageCode: 'de-DE', name: this.voice },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: clamp(rate, 0.25, 4),
        /* Chirp 系列不支援 pitch，送過去整個請求會被退 */
        ...(isChirp(this.voice) ? {} : { pitch: 0 }),
      },
    };

    const res = await fetch(`${TTS_ENDPOINT}?key=${encodeURIComponent(this.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await describeError(res));

    const data = await res.json();
    if (!data.audioContent) throw new Error('Google returned no audio.');
    const blob = base64ToBlob(data.audioContent, 'audio/mpeg');
    await cachePut(key, blob);
    return { blob, cached: false };
  }

  /**
   * 播一句德文，播完才 resolve。
   * @returns {Promise<{source:'google'|'browser', cached:boolean, ms:number}>}
   */
  async speak(text, opts = {}) {
    this.stop();
    const rate = opts.rate == null ? this.rate : opts.rate;
    const t0 = performance.now();

    if (this.apiKey) {
      try {
        const { blob, cached } = await this.synthesize(text, rate);
        await this.playBlob(blob);
        this.lastError = null;
        this.usingFallback = false;
        return { source: 'google', cached, ms: performance.now() - t0 };
      } catch (err) {
        /* 金鑰壞掉不該讓練習停擺：記下錯誤，改用瀏覽器語音把這句唸完 */
        this.lastError = err.message;
        this.usingFallback = true;
      }
    }
    await this.speakFallback(text, rate);
    return { source: 'browser', cached: false, ms: performance.now() - t0 };
  }

  playBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      this._urls.push(url);
      const a = this.audio;
      a.src = url;
      const cleanup = () => {
        a.onended = a.onerror = null;
        URL.revokeObjectURL(url);
        this._urls = this._urls.filter((u) => u !== url);
      };
      a.onended = () => { cleanup(); resolve(); };
      a.onerror = () => { cleanup(); reject(new Error('Could not play the audio.')); };
      a.play().catch((e) => { cleanup(); reject(e); });
    });
  }

  /* 瀏覽器內建語音。找不到德語語音就照樣唸，總比沒有聲音好。 */
  speakFallback(text, rate) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) return resolve();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'de-DE';
      u.rate = clamp(rate, 0.5, 2);
      const de = speechSynthesis.getVoices().find((v) => /^de/i.test(v.lang));
      if (de) u.voice = de;

      /* 系統一個語音都沒裝時（Linux 常見、無頭瀏覽器一定），
         speak() 不會出聲也不會觸發 onend，await 就永遠卡在這裡。
         用估算長度兜底，練習流程不能被這種事擋下來。 */
      let done = false;
      const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve(); } };
      const timer = setTimeout(finish, estimateSpeechMs(text, u.rate));

      u.onend = finish;
      u.onerror = finish;
      try { speechSynthesis.speak(u); } catch { finish(); }
    });
  }

  stop() {
    try { this.audio.pause(); this.audio.currentTime = 0; } catch { /* 還沒載入 */ }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  /** 先把一批句子合成好存起來，練習中途才不會卡在網路上。 */
  async warm(texts, rates, onProgress) {
    if (!this.apiKey) return { done: 0, failed: 0, skipped: texts.length };
    let done = 0, failed = 0;
    const jobs = [];
    for (const t of texts) for (const r of rates) jobs.push([t, r]);
    for (let i = 0; i < jobs.length; i++) {
      try { await this.synthesize(jobs[i][0], jobs[i][1]); done++; }
      catch { failed++; }
      if (onProgress) onProgress(i + 1, jobs.length, failed);
      /* 別把 quota 一次打爆 */
      await new Promise((r) => setTimeout(r, 40));
    }
    return { done, failed, skipped: 0 };
  }
}

/* Google 的錯誤訊息藏在 body 裡，直接吐 status code 對使用者沒幫助 */
async function describeError(res) {
  let detail = '';
  try {
    const j = await res.json();
    detail = j?.error?.message || '';
  } catch { /* 不是 JSON */ }
  if (res.status === 403) {
    return detail || 'Google rejected the key (403). Check that the Text-to-Speech API is enabled and the key’s restrictions allow this site.';
  }
  if (res.status === 400) return detail || 'Google rejected the request (400). The voice name may not exist.';
  if (res.status === 429) return detail || 'Quota exceeded (429). Try again later.';
  return `${res.status} ${res.statusText}${detail ? ' — ' + detail : ''}`;
}

function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* 德語約每秒 13 個字元，前面再留 1.2 秒給起播延遲 */
const estimateSpeechMs = (text, rate) =>
  Math.min(20000, 1200 + (text.length / 13) * 1000 / clamp(rate || 1, 0.25, 4));

window.NochmalTTS = { Speaker, FALLBACK_VOICES, voiceTier, cacheCount, cacheClear, cacheKey };
})();
