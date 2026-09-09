(function () {
'use strict';

/* ————————————————————————————————————————————————
   口說：辨識、比對、回放
   ————————————————————————————————————————————————
   口語練習要有回饋才有意義，這裡用兩條路，互相補位：

   1. 語音辨識（Web Speech API，de-DE）。把你說的話轉成文字，
      再跟目標句逐字對齊，標出哪個字沒唸出來、哪個唸成了別的字。
      只有 Chrome / Edge / Safari 支援，而且要連網。

   2. 錄音回放（MediaRecorder）。先聽母語者，再聽自己，A/B 直接比。
      這條路每個瀏覽器都能走，而且對語調、節奏的幫助比分數還大 ——
      辨識器只看字，不管你把重音放在哪裡。

   辨識分數只當作參考。辨識器對外國口音本來就嚴格，
   分數低不一定是你唸錯，所以介面上永遠保留「我自己判斷」的按鈕。
   ———————————————————————————————————————————————— */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const canRecognize = () => !!SR;
const canRecord = () => !!(navigator.mediaDevices && window.MediaRecorder);

/* 辨識器常把數字唸出來的結果寫成阿拉伯數字，比對前先換回德文字 */
const NUMBER_WORDS = {
  '0':'null','1':'eins','2':'zwei','3':'drei','4':'vier','5':'fünf','6':'sechs',
  '7':'sieben','8':'acht','9':'neun','10':'zehn','11':'elf','12':'zwölf',
  '13':'dreizehn','14':'vierzehn','15':'fünfzehn','16':'sechzehn','17':'siebzehn',
  '18':'achtzehn','19':'neunzehn','20':'zwanzig','21':'einundzwanzig','30':'dreißig',
  '40':'vierzig','50':'fünfzig','60':'sechzig','70':'siebzig','80':'achtzig',
  '90':'neunzig','100':'hundert','300':'dreihundert','600':'sechshundert','1000':'tausend',
};

/**
 * 比對用的正規化：大小寫、標點、數字都不該扣分。
 * @param {boolean} strict 打字作答用 strict：ß 與變音符號要算數，
 *   因為那是拼寫練習的重點；語音辨識則不該為了 ß 扣分。
 */
function normalize(text, strict) {
  let s = String(text || '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/€/g, ' euro ');
  if (!strict) s = s.replace(/ß/g, 'ss');
  return s
    .replace(/[.,!?;:()"„“»«\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text, strict) {
  return normalize(text, strict)
    .split(' ')
    .filter(Boolean)
    .map((w) => (strict ? w : NUMBER_WORDS[w] || w));
}

/** 詞層級的 Levenshtein，回傳距離與可回溯的對齊表。 */
function alignWords(target, said) {
  const n = target.length, m = said.length;
  const d = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = target[i - 1] === said[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  /* 從右下角回溯，把每個目標詞標成 ok / wrong / missing */
  const marks = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (target[i - 1] === said[j - 1] ? 0 : 1)) {
      marks.push({ word: target[i - 1], said: said[j - 1], status: target[i - 1] === said[j - 1] ? 'ok' : 'wrong' });
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      marks.push({ word: target[i - 1], said: null, status: 'missing' });
      i--;
    } else {
      j--;   // 多唸的字不標在目標句上，只算進距離
    }
  }
  marks.reverse();
  return { distance: d[n][m], marks };
}

/**
 * 把使用者唸的內容跟目標句比對。
 * @returns {{score:number, marks:Array, said:string, hit:number, total:number}}
 */
function score(targetText, saidText, opts = {}) {
  const t = words(targetText, opts.strict);
  const s = words(saidText, opts.strict);
  if (!t.length) return { score: 0, marks: [], said: saidText, hit: 0, total: 0 };
  const { distance, marks } = alignWords(t, s);
  const hit = marks.filter((m) => m.status === 'ok').length;
  /* 分母取目標長度：多唸幾個字會被距離罰到，但不會讓分數變成負的 */
  const raw = 1 - distance / Math.max(t.length, 1);
  return {
    score: Math.max(0, Math.min(1, raw)),
    marks,
    said: saidText,
    hit,
    total: t.length,
  };
}

/* ———— 語音辨識 ———— */
class Listener {
  constructor() {
    this.rec = null;
    this.active = false;
  }

  /**
   * 聽一句德文。
   * @param {{onPartial?:Function, timeout?:number}} opts
   * @returns {Promise<{transcript:string, confidence:number}>}
   */
  listen(opts = {}) {
    if (!SR) return Promise.reject(new Error('This browser has no speech recognition. Try Chrome, Edge or Safari.'));
    this.stop();
    return new Promise((resolve, reject) => {
      const rec = new SR();
      this.rec = rec;
      this.active = true;
      rec.lang = 'de-DE';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = false;

      let best = '';
      let confidence = 0;
      let settled = false;

      const finish = (fn, arg) => {
        if (settled) return;
        settled = true;
        this.active = false;
        clearTimeout(timer);
        try { rec.stop(); } catch { /* 已經停了 */ }
        fn(arg);
      };

      const timer = setTimeout(() => {
        /* 逾時就用目前聽到的東西結案，不要整段丟掉 */
        finish(resolve, { transcript: best, confidence });
      }, opts.timeout || 8000);

      rec.onresult = (ev) => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          if (r.isFinal) {
            best = (best + ' ' + r[0].transcript).trim();
            confidence = r[0].confidence || confidence;
          } else {
            interim += r[0].transcript;
          }
        }
        if (opts.onPartial) opts.onPartial((best + ' ' + interim).trim());
      };
      rec.onerror = (ev) => {
        const map = {
          'no-speech': 'I didn’t hear anything. Try again a bit louder.',
          'not-allowed': 'Microphone access was blocked. Allow it in your browser settings.',
          'service-not-allowed': 'Speech recognition is unavailable in this context (needs https or localhost).',
          'audio-capture': 'No microphone found.',
          'network': 'Speech recognition needs a network connection.',
        };
        finish(reject, new Error(map[ev.error] || `Speech recognition failed: ${ev.error}`));
      };
      rec.onend = () => finish(resolve, { transcript: best, confidence });

      try { rec.start(); }
      catch (err) { finish(reject, err); }
    });
  }

  stop() {
    this.active = false;
    if (this.rec) { try { this.rec.abort(); } catch { /* 已結束 */ } this.rec = null; }
  }
}

/* ———— 錄音回放 ———— */
class Recorder {
  constructor() {
    this.stream = null;
    this.rec = null;
    this.chunks = [];
    this.lastUrl = null;
  }

  async start() {
    if (!canRecord()) throw new Error('This browser cannot record audio.');
    if (!this.stream) {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    this.chunks = [];
    const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m));
    this.rec = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.start();
  }

  /** 停止並回傳可播放的 URL；上一段錄音的 URL 會在這裡回收。 */
  stop() {
    return new Promise((resolve) => {
      if (!this.rec || this.rec.state === 'inactive') return resolve(null);
      this.rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.rec.mimeType || 'audio/webm' });
        if (this.lastUrl) URL.revokeObjectURL(this.lastUrl);
        this.lastUrl = URL.createObjectURL(blob);
        resolve(this.lastUrl);
      };
      this.rec.stop();
    });
  }

  /* 練習結束就把麥克風還回去，瀏覽器分頁上的紅點才會消失 */
  release() {
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.rec = null;
    if (this.lastUrl) { URL.revokeObjectURL(this.lastUrl); this.lastUrl = null; }
  }
}

window.NochmalSpeech = { Listener, Recorder, score, normalize, words, canRecognize, canRecord };
})();
