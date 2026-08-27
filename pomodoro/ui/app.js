'use strict';

/* ———— 工具 ———— */
const $ = (s) => document.querySelector(s);
const TAURI = window.__TAURI__ || null;
/* 行動版（iOS/Android）：沒有選單列與視窗置頂，且背景時 JS 會被凍結 */
const MOBILE = !!TAURI && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
if (MOBILE) document.documentElement.classList.add('mobile');

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 私密模式等情況 */ }
  },
};

/* ———— 設定 ———— */
const DEFAULTS = {
  focus: 25, short: 5, long: 15,
  autoBreak: true, autoFocus: false, sound: true, notify: true, pinned: false,
  warmup: true, restLock: true, cleanCut: true,
  audio: 'off', ambience: 'off', pad: false, muted: false, volume: 35,
};
const settings = Object.assign({}, DEFAULTS, store.get('pomo.settings.v1', {}));
const saveSettings = () => store.set('pomo.settings.v1', settings);

/* ———— 今日統計 ———— */
/* 用本地時間切日，不能用 toISOString()（那是 UTC，
   在 UTC+8 會把凌晨到早上 8 點算成前一天） */
const dayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const todayKey = () => dayKey();
let stats = store.get('pomo.stats.v1', {});
function bumpToday(minutes) {
  const k = todayKey();
  if (stats.date !== k) stats = { date: k, count: 0, minutes: 0 };
  stats.count += 1;
  stats.minutes += minutes;
  store.set('pomo.stats.v1', stats);
}
const todayStats = () => (stats.date === todayKey() ? stats : { count: 0, minutes: 0 });

/* ———— 待辦事項（原則一：認知卸載） ———— */
let tasks = store.get('pomo.tasks.v1', []);
const saveTasks = () => store.set('pomo.tasks.v1', tasks);
const activeTask = () => tasks.find((t) => t.active && !t.done) || null;

function addTask(text, date = '') {
  const clean = text.trim();
  if (!clean) return null;
  const first = !tasks.some((t) => t.active && !t.done);
  const task = {
    id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    done: false,
    active: first, // 第一件未完成的任務自動成為本回合目標
    tomatoes: 0,
    next: '',
    date,          // 'YYYY-MM-DD'，空字串＝不綁日期
    createdAt: Date.now(),
  };
  tasks.unshift(task);
  saveTasks();
  renderTasks();
  return task;
}

function setActive(id) {
  for (const t of tasks) t.active = (t.id === id && !t.done);
  saveTasks();
  renderTasks();
}

function toggleDone(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  t.doneAt = t.done ? Date.now() : null;
  if (t.done) t.active = false;
  saveTasks();
  renderTasks();
  document.dispatchEvent(new CustomEvent('pomo:tasks-changed'));
}

function removeTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
  document.dispatchEvent(new CustomEvent('pomo:tasks-changed'));
}

/* ———— 思緒卸載盒 ———— */
let dump = store.get('pomo.dump.v1', null);
const saveDump = (text) => {
  dump = text.trim() ? { text: text.trim(), at: Date.now() } : null;
  store.set('pomo.dump.v1', dump);
};

/* ———— 狀態機 ———— */
const MODE_LABEL = { focus: '專注', short: '短休息', long: '長休息' };
const LONG_EVERY = 4;

const state = {
  mode: 'focus',
  completed: 0,
  running: false,
  endAt: null,
  remainMs: settings.focus * 60000,
  warmupDone: false, // 本段是否已做過卸載
  segStart: null,    // 這一段第一次按下開始的時間戳（供歷程紀錄）
};

const durMs = (mode) => settings[mode] * 60000;
const remaining = () => (state.running ? Math.max(0, state.endAt - Date.now()) : state.remainMs);
const atFullDuration = () => Math.abs(state.remainMs - durMs(state.mode)) < 1000;

/* ———— DOM ———— */
const el = {
  body: document.body,
  time: $('#time'),
  modeLabel: $('#modeLabel'),
  ringBar: $('#ringBar'),
  ringWrap: $('#ringWrap'),
  dots: Array.from(document.querySelectorAll('.dot')),
  playBtn: $('#playBtn'),
  today: $('#today'),
  sheet: $('#sheet'),
  taskSheet: $('#taskSheet'),
  backdrop: $('#backdrop'),
  taskChip: $('#taskChip'),
  taskChipText: $('#taskChipText'),
  taskList: $('#taskList'),
  taskEmpty: $('#taskEmpty'),
  dumpOverlay: $('#dumpOverlay'),
  dumpText: $('#dumpText'),
  dumpCount: $('#dumpCount'),
  restOverlay: $('#restOverlay'),
  restTime: $('#restTime'),
  restEyebrow: $('#restEyebrow'),
  breathWord: $('#breathWord'),
  cutOverlay: $('#cutOverlay'),
  cutInput: $('#cutInput'),
  cutTitle: $('#cutTitle'),
  audioBtn: $('#audioBtn'),
};

const CIRC = 2 * Math.PI * 118;
el.ringBar.style.strokeDasharray = `${CIRC}`;

/* ———— 畫面更新 ———— */
const fmt = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let shownText = '';
function render() {
  const rem = remaining();
  const text = fmt(rem);
  if (text !== shownText) {
    shownText = text;
    el.time.textContent = text;
    if (!el.restOverlay.hidden) el.restTime.textContent = text;
    syncTray(text);
    if (!TAURI) document.title = state.running ? `${text} — Flowmato` : 'Flowmato 心流鐘';
  }
  el.ringBar.style.strokeDashoffset = `${CIRC * (1 - rem / durMs(state.mode))}`;
}

function renderMeta() {
  el.body.dataset.mode = state.mode;
  el.body.classList.toggle('running', state.running);
  el.modeLabel.textContent = MODE_LABEL[state.mode];
  el.playBtn.setAttribute('aria-label', state.running ? '暫停' : '開始');

  const filled = state.mode === 'long' ? LONG_EVERY : state.completed % LONG_EVERY;
  el.dots.forEach((d, i) => {
    d.classList.toggle('done', i < filled);
    d.classList.toggle('now', state.mode === 'focus' && state.running && i === filled);
  });

  const t = todayStats();
  el.today.textContent = t.count > 0
    ? `今天已完成 ${t.count} 顆蕃茄 · 專注 ${t.minutes} 分鐘`
    : '準備好開始專注了嗎？';
}

function renderChip() {
  const t = activeTask();
  el.taskChip.classList.toggle('has-task', !!t);
  el.taskChipText.textContent = t ? t.text : '＋ 這回合要完成什麼？';
  el.taskChip.title = t ? `本回合目標：${t.text}（點擊管理待辦）` : '待辦事項（T）';
}

const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';

function renderTasks() {
  el.taskList.replaceChildren();
  el.taskEmpty.hidden = tasks.length > 0;

  for (const t of tasks) {
    const li = document.createElement('li');
    li.className = `task-item${t.done ? ' done' : ''}${t.active && !t.done ? ' active' : ''}`;

    const check = document.createElement('button');
    check.className = 'task-check';
    check.innerHTML = ICON_CHECK;
    check.setAttribute('aria-label', t.done ? '標記為未完成' : '標記為完成');
    check.addEventListener('click', () => toggleDone(t.id));

    const text = document.createElement('button');
    text.className = 'task-text';
    text.textContent = t.text; // 使用者輸入一律走 textContent
    text.title = '設為本回合目標';
    text.addEventListener('click', () => setActive(t.id));

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    if (t.tomatoes > 0) {
      const c = document.createElement('span');
      c.className = 'task-count';
      c.textContent = `🍅 ${t.tomatoes}`;
      meta.appendChild(c);
    }
    const del = document.createElement('button');
    del.className = 'task-del';
    del.innerHTML = ICON_X;
    del.setAttribute('aria-label', '刪除');
    del.addEventListener('click', () => removeTask(t.id));
    meta.appendChild(del);

    li.append(check, text, meta);
    el.taskList.appendChild(li);

    if (t.next) {
      const nx = document.createElement('li');
      nx.className = 'task-next';
      nx.textContent = `↳ 下次：${t.next}`;
      el.taskList.appendChild(nx);
    }
  }
  renderChip();
}

function renderDumpRecall() {
  const box = $('#dumpRecall');
  box.hidden = !dump;
  if (!dump) return;
  $('#dumpRecallText').textContent = dump.text;
  const d = new Date(dump.at);
  $('#dumpStamp').textContent = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ———— 音訊：提示音 + 三層音景（原則四） ———— */
let audioCtx = null;
let mix = null; // 音景總匯流，提示音不經過它

function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    mix = audioCtx.createGain();
    mix.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function chime(kind) {
  if (!settings.sound || !audioCtx) return;
  const notes = kind === 'focus-done'
    ? [[659.25, 0], [493.88, 0.22]]   // E5 → B4：辛苦了，放鬆
    : [[440.0, 0], [659.25, 0.22]];   // A4 → E5：回神，開始
  const t0 = audioCtx.currentTime + 0.02;
  for (const [freq, dt] of notes) {
    for (const [mult, gain] of [[1, 0.32], [2, 0.06]]) {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(gain, t0 + dt + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.9);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(t0 + dt);
      osc.stop(t0 + dt + 1);
    }
  }
}

/* 三層可獨立開關：雙耳節拍 / 環境音 / 和聲鋪底 */
const layers = { beat: null, amb: null, pad: null };
const LAYER_VOL = { beat: 0.34, amb: 0.32, pad: 0.10 };

const BEAT_HZ = { beta: 18, alpha: 8, theta: 6 };
const CARRIER = 220; // A3 載波，低頻聽感柔和

/* 三首專注樂曲。head / tail 是實測出來的素材本身淡入淡出長度，
   循環時要跳過，否則每一輪接縫都會聽到音量掉下去又升起來。 */
const TRACKS = {
  beta:  { src: 'audio/beta.mp3',  head: 0.0, tail: 5.0 },
  alpha: { src: 'audio/alpha.mp3', head: 6.0, tail: 5.0 },
  theta: { src: 'audio/theta.mp3', head: 4.0, tail: 7.0 },
};
const XFADE = 4;          // 相鄰兩輪重疊的秒數
const SCHEDULE_AHEAD = 6; // 提前多久排下一輪
const trackCache = new Map();

/* 單檔版把音檔內嵌成 data URI：直接解 base64，不走網路層，
   免得被內容安全政策擋掉 */
function dataUriToBuffer(uri) {
  const bin = atob(uri.slice(uri.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function loadTrack(band) {
  if (trackCache.has(band)) return trackCache.get(band);
  const src = TRACKS[band].src;
  const bytes = src.startsWith('data:')
    ? Promise.resolve(dataUriToBuffer(src))
    : fetch(src).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); });
  const p = bytes.then((buf) => audioCtx.decodeAudioData(buf));
  trackCache.set(band, p);
  p.catch(() => trackCache.delete(band)); // 失敗不要卡住之後的重試
  return p;
}

/* 等功率淡化：兩段線性淡化重疊會在中點掉 3dB，sin/cos 曲線才不會凹 */
function fadeCurve(param, at, dur, dir) {
  const N = 33;
  const arr = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    arr[i] = dir === 'in' ? Math.sin((t * Math.PI) / 2) : Math.cos((t * Math.PI) / 2);
  }
  try { param.setValueCurveAtTime(arr, at, dur); } catch { param.value = dir === 'in' ? 1 : 0; }
}

/* 把一首曲子接成無限循環：每輪只播有效區間，前後輪重疊 XFADE 秒 */
function loopTrack(buffer, meta, dest) {
  const ctx = audioCtx;
  const segStart = Math.min(meta.head, buffer.duration - 1);
  const segEnd = Math.max(segStart + 2 * XFADE + 1, buffer.duration - meta.tail);
  const segLen = Math.min(segEnd, buffer.duration) - segStart;
  const step = segLen - XFADE; // 下一輪提前 XFADE 秒進來

  const live = new Set();
  let nextAt = ctx.currentTime + 0.06;
  let timer = null;

  function schedule(at) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = 0;
    fadeCurve(g.gain, at, XFADE, 'in');
    fadeCurve(g.gain, at + segLen - XFADE, XFADE, 'out');
    src.connect(g).connect(dest);
    src.start(at, segStart, segLen);
    src.onended = () => live.delete(src);
    live.add(src);
    return at + step;
  }

  nextAt = schedule(nextAt);
  timer = setInterval(() => {
    if (nextAt - ctx.currentTime < SCHEDULE_AHEAD) nextAt = schedule(nextAt);
  }, 1000);

  return {
    stop(at) {
      clearInterval(timer);
      for (const s of live) { try { s.stop(at); } catch { /* 已結束 */ } }
      live.clear();
    },
  };
}

/* 和弦：專注用小調（沉靜不搶戲），休息用大調（開闊放鬆） */
const CHORD = {
  focus: [110.00, 164.81, 220.00, 261.63],           // A2 E3 A3 C4 — Am
  rest:  [110.00, 164.81, 220.00, 277.18, 329.63],   // A2 E3 A3 C#4 E4 — A
};

/* 噪音樣本：4 秒 loop，首尾交叉淡化避免接縫 click */
const noiseCache = {};
function noiseBuffer(kind) {
  if (noiseCache[kind]) return noiseCache[kind];
  const ctx = audioCtx;
  const len = Math.floor(ctx.sampleRate * 4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);

  if (kind === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else {
    let last = 0; // 積分白噪音 → 棕噪音，能量集中在低頻
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.5;
    }
  }

  const fade = Math.floor(ctx.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    d[i] = d[i] * t + d[len - fade + i] * (1 - t);
  }

  noiseCache[kind] = buf;
  return buf;
}

/* 合成雙耳節拍：音檔載不到時的後備（例如頁面沒有附上 audio/） */
function attachSynthBeat(band, gain) {
  const ctx = audioCtx;
  const merger = ctx.createChannelMerger(2);
  const nodes = [CARRIER, CARRIER + BEAT_HZ[band]].map((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(merger, 0, i);
    osc.start();
    return osc;
  });
  merger.connect(gain);
  return nodes;
}

function buildBeat(band) {
  const ctx = audioCtx;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  gain.connect(mix);
  const layer = { gain, nodes: [], loop: null };

  // 音檔是非同步載入的，期間可能已經換層或停播，故每次都要確認 layer 還在線上
  loadTrack(band)
    .then((buf) => {
      if (layers.beat !== layer) return;
      layer.loop = loopTrack(buf, TRACKS[band], gain);
      layer.mode = 'track';
    })
    .catch(() => {
      if (layers.beat !== layer) return;
      layer.nodes = attachSynthBeat(band, gain);
      layer.mode = 'synth'; // 沒有音檔時仍有聲音可聽
    });

  layer.dispose = (at) => { layer.loop?.stop(at); };
  return layer;
}

function buildAmbience(kind) {
  const ctx = audioCtx;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(kind === 'rain' ? 'white' : 'brown');
  src.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  const nodes = [src];

  if (kind === 'rain') {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.5;
    const hs = ctx.createBiquadFilter();
    hs.type = 'highshelf'; hs.frequency.value = 4500; hs.gain.value = -7;
    src.connect(bp).connect(hs).connect(gain);
  } else if (kind === 'waves') {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
    // 潮汐：獨立的調製節點，不去動被淡入淡出控制的 gain
    const tide = ctx.createGain();
    tide.gain.value = 0.62;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07; // 約 14 秒一次起落
    const cut = ctx.createGain(); cut.gain.value = 240;
    const amp = ctx.createGain(); amp.gain.value = 0.34;
    lfo.connect(cut).connect(lp.frequency);
    lfo.connect(amp).connect(tide.gain);
    lfo.start();
    src.connect(lp).connect(tide).connect(gain);
    nodes.push(lfo);
  } else {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1000;
    src.connect(lp).connect(gain);
  }

  gain.connect(mix);
  src.start();
  return { gain, nodes };
}

function buildPad(mode) {
  const ctx = audioCtx;
  const freqs = CHORD[mode];
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 760; lp.Q.value = 0.3;
  lp.connect(gain).connect(mix);

  const nodes = [];
  freqs.forEach((f, i) => {
    for (const cents of [-4, 4]) { // 微失諧兩支 → 自然的 chorus 厚度
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      osc.frequency.value = f * Math.pow(2, cents / 1200);
      const g = ctx.createGain();
      g.gain.value = 0.5 / freqs.length / (i === 0 ? 1 : 1.7);
      osc.connect(g).connect(lp);
      osc.start();
      nodes.push(osc);
    }
  });

  // 織體呼吸：極慢 LFO 推動截止頻率
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.045; // 約 22 秒一輪
  const depth = ctx.createGain();
  depth.gain.value = 240;
  lfo.connect(depth).connect(lp.frequency);
  lfo.start();
  nodes.push(lfo);

  return { gain, nodes };
}

const layerTarget = (name) => Math.max(0.0002, settings.volume / 100 * LAYER_VOL[name]);

function killLayer(name) {
  const l = layers[name];
  if (!l) return;
  layers[name] = null;
  const t = audioCtx.currentTime;
  const stopAt = t + 0.9;
  try {
    l.gain.gain.cancelScheduledValues(t);
    l.gain.gain.setValueAtTime(Math.max(0.0001, l.gain.gain.value), t);
    l.gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  } catch { /* 節點已停止 */ }
  for (const n of l.nodes) { try { n.stop(stopAt + 0.05); } catch { /* 已停止 */ } }
  l.dispose?.(stopAt + 0.05);
}

function syncLayer(name, key, build) {
  if (layers[name]?.key === key) return;
  killLayer(name); // 舊層淡出與新層淡入重疊即為 crossfade
  if (!key) return;
  const l = build(key);
  l.key = key;
  layers[name] = l;
  const t = audioCtx.currentTime;
  l.gain.gain.setValueAtTime(0.0001, t);
  l.gain.gain.exponentialRampToValueAtTime(layerTarget(name), t + 1.4);
}

const audioWanted = () => settings.audio !== 'off' || settings.ambience !== 'off' || settings.pad;

/* 專注播選定頻段；休息自動切 Alpha 與大調和聲（利於 DMN 恢復） */
function syncAudio() {
  if (!audioCtx) { updateAudioBtn(); return; }
  const live = !settings.muted && state.running;
  const resting = state.mode !== 'focus';

  syncLayer('beat', live && settings.audio !== 'off' ? (resting ? 'alpha' : settings.audio) : null, buildBeat);
  syncLayer('amb', live && settings.ambience !== 'off' ? settings.ambience : null, buildAmbience);
  syncLayer('pad', live && settings.pad ? (resting ? 'rest' : 'focus') : null, buildPad);
  updateAudioBtn();
}

function updateAudioBtn() {
  const on = !settings.muted && audioWanted();
  el.audioBtn.classList.toggle('on', on);
  el.audioBtn.classList.toggle('playing', on && state.running);
  el.audioBtn.setAttribute('aria-pressed', String(on));
  el.audioBtn.title = on ? '靜音音景（A）' : '開啟音景（A）';
}

function setVolume(v) {
  settings.volume = v;
  saveSettings();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  for (const name of Object.keys(layers)) {
    const l = layers[name];
    if (!l) continue;
    l.gain.gain.cancelScheduledValues(t);
    l.gain.gain.setTargetAtTime(layerTarget(name), t, 0.12);
  }
}

/* 耳機鍵：一鍵靜音／恢復；全部關著時給一組預設 */
function toggleMute() {
  if (!audioWanted()) {
    settings.audio = 'alpha';
    settings.ambience = 'rain';
    settings.muted = false;
  } else {
    settings.muted = !settings.muted;
  }
  saveSettings();
  syncSheetUI();
  ensureAudio();
  syncAudio();
}

/* ———— 通知 ———— */
/* 行動版進入背景後 WebView 的 JS 會被凍結，計時器不會如期觸發。
   因此按下開始時就把「時間到」的通知預先排程給系統；
   暫停／重設／跳過時取消。回到前景時 remaining() 以時間戳重算，本來就準。 */
const NOTI_ID = 27182;

async function scheduleEndNotification() {
  if (!settings.notify || !TAURI?.notification || !state.running) return;
  await cancelScheduled();
  const n = TAURI.notification;
  try {
    if (!(await n.isPermissionGranted()) && (await n.requestPermission()) !== 'granted') return;
    const at = new Date(state.endAt);
    const focusDone = state.mode === 'focus';
    await n.sendNotification({
      id: NOTI_ID,
      title: focusDone ? '完成一顆蕃茄 🍅' : '休息結束',
      body: focusDone ? '辛苦了，去休息一下。' : '回來囉，開始下一輪專注。',
      schedule: { at, repeating: false, allowWhileIdle: true },
    });
  } catch { /* 舊版或不支援排程時，退回前景通知 */ }
}

async function cancelScheduled() {
  try { await TAURI?.notification?.cancel([NOTI_ID]); } catch { /* 沒有待排程項目 */ }
}

async function notify(title, body) {
  if (!settings.notify) return;
  if (MOBILE) return; // 行動版已由 scheduleEndNotification 預先排程，避免重複
  try {
    if (TAURI?.notification) {
      const n = TAURI.notification;
      let ok = await n.isPermissionGranted();
      if (!ok) ok = (await n.requestPermission()) === 'granted';
      if (ok) n.sendNotification({ title, body });
    } else if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission === 'granted') new Notification(title, { body });
    }
  } catch { /* 通知失敗不影響計時 */ }
}

/* ———— 選單列（Tauri tray） ———— */
let lastTray = null;
function syncTray(text) {
  if (!TAURI?.core) return;
  const title = state.running ? text : (remaining() < durMs(state.mode) ? `‖ ${text}` : '');
  if (title === lastTray) return;
  lastTray = title;
  TAURI.core.invoke('tray_title', { title }).catch(() => {});
}

/* ———— 覆蓋層 ———— */
/* 淡出是延遲隱藏，若期間又被開啟必須取消，否則會把新畫面關掉 */
const hideTimers = new WeakMap();

function showOverlay(node) {
  clearTimeout(hideTimers.get(node));
  hideTimers.delete(node);
  node.hidden = false;
  requestAnimationFrame(() => node.classList.add('show'));
}

function hideOverlay(node) {
  if (node.hidden) return;
  node.classList.remove('show');
  clearTimeout(hideTimers.get(node));
  hideTimers.set(node, setTimeout(() => {
    node.hidden = true;
    hideTimers.delete(node);
  }, 300));
}
const anyOverlayOpen = () =>
  !el.dumpOverlay.hidden || !el.restOverlay.hidden || !el.cutOverlay.hidden;

/* 暖身：思緒卸載盒 */
let dumpTimer = null;
function openDump() {
  el.dumpText.value = '';
  el.dumpCount.textContent = '60';
  showOverlay(el.dumpOverlay);
  setTimeout(() => el.dumpText.focus(), 320);

  let left = 60;
  clearInterval(dumpTimer);
  dumpTimer = setInterval(() => {
    left -= 1;
    el.dumpCount.textContent = String(Math.max(0, left));
    if (left <= 0) { clearInterval(dumpTimer); finishDump(true); }
  }, 1000);
}

function finishDump(save) {
  clearInterval(dumpTimer);
  if (save) { saveDump(el.dumpText.value); renderDumpRecall(); }
  hideOverlay(el.dumpOverlay);
  state.warmupDone = true;
  start();
}

/* 休息鎖定：呼吸引導 */
const BREATH_CYCLE = 12000; // 吸 4s → 停 2s → 吐 6s
let breathTimer = null;
let breathStart = 0;

function openRest() {
  el.restEyebrow.textContent = state.mode === 'long' ? '長休息 · 讓大腦離線' : '休息 · 讓大腦離線';
  el.restTime.textContent = fmt(remaining());
  showOverlay(el.restOverlay);

  breathStart = Date.now();
  // 重啟呼吸動畫，讓文字與縮放同步
  for (const n of el.restOverlay.querySelectorAll('.breath-ring, .breath-core')) {
    n.style.animation = 'none';
    void n.offsetWidth;
    n.style.animation = '';
  }

  clearInterval(breathTimer);
  let lastWord = '';
  breathTimer = setInterval(() => {
    const p = (Date.now() - breathStart) % BREATH_CYCLE;
    const word = p < 4000 ? '吸氣' : p < 6000 ? '屏住' : '吐氣';
    if (word !== lastWord) { lastWord = word; el.breathWord.textContent = word; }
  }, 200);
}

function closeRest() {
  clearInterval(breathTimer);
  hideOverlay(el.restOverlay);
}

/* Clean Cut：下次起點 */
let pendingNext = null;
function openCut(nextMode) {
  pendingNext = nextMode;
  const t = activeTask();
  el.cutTitle.textContent = t ? `「${t.text}」告一段落` : '完成一顆蕃茄 🍅';
  el.cutInput.value = t?.next || '';
  showOverlay(el.cutOverlay);
  setTimeout(() => el.cutInput.focus(), 320);
}

function finishCut() {
  const t = activeTask();
  if (t) { t.next = el.cutInput.value.trim(); saveTasks(); renderTasks(); }
  hideOverlay(el.cutOverlay);
  const next = pendingNext;
  pendingNext = null;
  applyNext(next);
}

/* ———— 動作 ———— */
function setMode(mode, { autoStart = false } = {}) {
  state.mode = mode;
  state.running = false;
  state.endAt = null;
  state.remainMs = durMs(mode);
  state.warmupDone = false;
  state.segStart = null;
  cancelScheduled();
  closeRest();
  renderMeta();
  render();
  if (autoStart) start();
  else { syncAudio(); syncTray(fmt(remaining())); }
}

function start() {
  ensureAudio();
  if (!state.segStart) state.segStart = Date.now();
  state.endAt = Date.now() + remaining();
  state.running = true;
  renderMeta();
  render();
  syncAudio();
  scheduleEndNotification();
  if (state.mode !== 'focus' && settings.restLock) openRest();
}

function pause() {
  state.remainMs = remaining();
  state.running = false;
  state.endAt = null;
  cancelScheduled();
  renderMeta();
  render();
  syncAudio();
  closeRest();
}

/* 開始鍵：專注段起手先做卸載（原則一） */
function requestStart() {
  if (state.running) { pause(); return; }
  const needWarmup = settings.warmup && state.mode === 'focus' && atFullDuration() && !state.warmupDone;
  if (needWarmup) { ensureAudio(); openDump(); return; }
  start();
}

function reset() {
  state.remainMs = durMs(state.mode);
  state.running = false;
  state.endAt = null;
  state.warmupDone = false;
  state.segStart = null;
  cancelScheduled();
  closeRest();
  renderMeta();
  render();
  syncAudio();
}

/* 一段結束：計分、提示，再交給 applyNext 換段 */
function finishSegment({ skipped = false } = {}) {
  const finished = state.mode;
  state.running = false;
  state.endAt = null;

  let next;
  if (finished === 'focus') {
    if (!skipped) {
      bumpToday(settings.focus);
      const t = activeTask();
      if (t) { t.tomatoes += 1; saveTasks(); renderTasks(); }
      // 歷程模組（journal.js）接手記錄，計時本身不依賴它
      document.dispatchEvent(new CustomEvent('pomo:session', {
        detail: {
          start: state.segStart || (Date.now() - settings.focus * 60000),
          end: Date.now(),
          minutes: settings.focus,
          taskId: t?.id || null,
          taskText: t?.text || '',
        },
      }));
    }
    state.completed += 1;
    next = state.completed % LONG_EVERY === 0 ? 'long' : 'short';
  } else {
    next = 'focus';
  }

  if (skipped) { applyNext(next); return; }

  el.ringWrap.classList.remove('pulse');
  void el.ringWrap.offsetWidth;
  el.ringWrap.classList.add('pulse');
  chime(finished === 'focus' ? 'focus-done' : 'break-done');

  if (finished === 'focus') {
    notify('完成一顆蕃茄 🍅', `辛苦了，休息 ${settings[next]} 分鐘吧。`);
    closeRest();
    if (settings.cleanCut) { openCut(next); return; } // 等使用者寫完下次起點
  } else {
    notify('休息結束', '回來囉，開始下一輪專注。');
  }
  applyNext(next);
}

function applyNext(next) {
  const auto = next === 'focus' ? settings.autoFocus : settings.autoBreak;
  setMode(next, { autoStart: auto });
}

const skip = () => finishSegment({ skipped: true });

/* ———— 計時核心：時間戳計算，休眠喚醒也準 ———— */
setInterval(() => {
  if (!state.running) return;
  if (remaining() <= 0) finishSegment();
  else render();
}, 250);

(function raf() {
  if (state.running) render();
  requestAnimationFrame(raf);
})();

/* ———— 面板 ———— */
/* 逐一列舉面板很容易漏掉新增的（歷程面板就曾因此關不掉），改為動態查詢 */
const allSheets = () => document.querySelectorAll('.sheet');

/* 收合是延遲隱藏。若期間又被開啟，必須取消那個 timer——否則它會把剛開的東西關掉
   （背景遮罩就是這樣一直沒顯示出來：closeSheets 的 setTimeout(0) 跑在
    requestAnimationFrame 之前，把同步設好的 hidden=false 又改回 true）*/
const sheetTimers = new WeakMap();
let backdropTimer = null;

function hideSheet(node, instant) {
  if (node.hidden) return;
  node.classList.remove('show');
  clearTimeout(sheetTimers.get(node));
  sheetTimers.set(node, setTimeout(() => {
    node.hidden = true;
    sheetTimers.delete(node);
  }, instant ? 0 : 340));
}

function openSheet(node) {
  for (const s of allSheets()) if (s !== node) hideSheet(s, true);

  clearTimeout(sheetTimers.get(node));
  sheetTimers.delete(node);
  clearTimeout(backdropTimer);
  backdropTimer = null;

  node.hidden = false;
  el.backdrop.hidden = false;
  requestAnimationFrame(() => {
    node.classList.add('show');
    el.backdrop.classList.add('show');
  });
}

function closeSheets(instant) {
  for (const s of allSheets()) hideSheet(s, instant);
  el.backdrop.classList.remove('show');
  clearTimeout(backdropTimer);
  backdropTimer = setTimeout(() => { el.backdrop.hidden = true; }, instant ? 0 : 340);
}

const sheetOpen = () => [...allSheets()].some((s) => !s.hidden);

function syncSheetUI() {
  document.querySelectorAll('.stepper').forEach((st) => {
    const key = st.dataset.key;
    st.querySelector('.step-val b').textContent = settings[key];
    st.querySelector('[data-dir="-1"]').disabled = settings[key] <= +st.dataset.min;
    st.querySelector('[data-dir="1"]').disabled = settings[key] >= +st.dataset.max;
  });
  for (const [id, key] of TOGGLES) $(`#${id}`).checked = settings[key];
  $('#optVolume').value = settings.volume;
  for (const [id, key] of [['beatSeg', 'audio'], ['ambSeg', 'ambience']]) {
    for (const b of document.querySelectorAll(`#${id} .seg-btn`)) {
      const on = b.dataset.val === settings[key];
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    }
  }
  updateAudioBtn();
}

const TOGGLES = [
  ['optAutoBreak', 'autoBreak'], ['optAutoFocus', 'autoFocus'],
  ['optSound', 'sound'], ['optNotify', 'notify'],
  ['optWarmup', 'warmup'], ['optRestLock', 'restLock'], ['optCleanCut', 'cleanCut'],
  ['optPad', 'pad'],
];

/* ———— 事件繫結 ———— */
document.querySelectorAll('.stepper').forEach((st) => {
  st.addEventListener('click', (e) => {
    const btn = e.target.closest('.step-btn');
    if (!btn) return;
    const key = st.dataset.key;
    const next = settings[key] + (+btn.dataset.dir) * (+st.dataset.step);
    settings[key] = Math.min(+st.dataset.max, Math.max(+st.dataset.min, next));
    saveSettings();
    syncSheetUI();
    if (state.mode === key && !state.running) reset();
    else render();
  });
});

for (const [id, key] of TOGGLES) {
  $(`#${id}`).addEventListener('change', (e) => {
    settings[key] = e.target.checked;
    saveSettings();
    if (key === 'sound' && e.target.checked) ensureAudio();
    if (key === 'pad') {
      if (e.target.checked) { settings.muted = false; ensureAudio(); }
      syncAudio();
    }
    if (key === 'restLock') {
      if (!e.target.checked) closeRest();
      else if (state.running && state.mode !== 'focus') openRest();
    }
  });
}

for (const [id, key] of [['beatSeg', 'audio'], ['ambSeg', 'ambience']]) {
  $(`#${id}`).addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    settings[key] = btn.dataset.val;
    settings.muted = false; // 手動挑了音色就代表要聽
    saveSettings();
    syncSheetUI();
    ensureAudio();
    syncAudio();
  });
}

$('#optVolume').addEventListener('input', (e) => setVolume(+e.target.value));

el.audioBtn.addEventListener('click', toggleMute);

/* 待辦 */
$('#taskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  addTask($('#taskInput').value);
  $('#taskInput').value = '';
});
el.taskChip.addEventListener('click', () => openSheet(el.taskSheet));
$('#dumpClear').addEventListener('click', () => { saveDump(''); renderDumpRecall(); });

/* 覆蓋層按鈕 */
$('#dumpDone').addEventListener('click', () => finishDump(true));
$('#dumpSkip').addEventListener('click', () => finishDump(false));
$('#restEnd').addEventListener('click', () => { closeRest(); skip(); });
$('#cutSave').addEventListener('click', finishCut);
el.cutInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') finishCut(); });

/* 釘選最上層 */
const pinBtn = $('#pinBtn');
async function applyPin(flag) {
  settings.pinned = flag;
  saveSettings();
  pinBtn.classList.toggle('pinned', flag);
  pinBtn.setAttribute('aria-pressed', String(flag));
  try { await TAURI?.window?.getCurrentWindow().setAlwaysOnTop(flag); } catch { /* 網頁版無此功能 */ }
}
pinBtn.addEventListener('click', () => applyPin(!settings.pinned));

/* 主控制 */
el.playBtn.addEventListener('click', requestStart);
$('#resetBtn').addEventListener('click', reset);
$('#skipBtn').addEventListener('click', skip);
$('#setBtn').addEventListener('click', () => openSheet(el.sheet));
document.querySelectorAll('.close-sheet').forEach((b) => b.addEventListener('click', () => closeSheets()));
el.backdrop.addEventListener('click', () => closeSheets());

document.addEventListener('pointerdown', ensureAudio, { once: true, capture: true });

/* 舊 WebKit 無 overflow:clip 時的保險：焦點捲動推走版面就立刻歸位 */
$('#app').addEventListener('scroll', (e) => {
  e.currentTarget.scrollTop = 0;
  e.currentTarget.scrollLeft = 0;
});

document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);

  if (e.metaKey && e.key === ',') {
    e.preventDefault();
    el.sheet.hidden ? openSheet(el.sheet) : closeSheets();
    return;
  }
  if (e.key === 'Escape') {
    if (sheetOpen()) closeSheets();
    else if (!el.dumpOverlay.hidden) finishDump(false);
    return;
  }
  if (typing || sheetOpen() || anyOverlayOpen()) return;

  if (e.key === ' ') { e.preventDefault(); requestStart(); }
  else if (e.key === 'r' || e.key === 'R') reset();
  else if (e.key === 's' || e.key === 'S') skip();
  else if (e.key === 't' || e.key === 'T') openSheet(el.taskSheet);
  else if (e.key === 'a' || e.key === 'A') el.audioBtn.click();
});

/* Tauri 選單列指令 */
TAURI?.event?.listen('tray-command', ({ payload }) => {
  if (payload === 'toggle') requestStart();
  else if (payload === 'skip') skip();
  else if (payload === 'reset') reset();
}).catch?.(() => {});

/* ———— 啟動 ———— */
if (settings.pinned) applyPin(true);
syncSheetUI();
renderTasks();
renderDumpRecall();
renderMeta();
render();

/* 測試鉤子（不影響一般使用） */
window.__pomo = {
  fastForward(ms) {
    if (state.running) state.endAt -= ms;
    else state.remainMs = Math.max(0, state.remainMs - ms);
    render();
  },
  state, settings, finishSegment, start, pause,
  tasks: () => tasks,
  active: () => activeTask(),
  audio: () => ({
    ctx: audioCtx?.state || null,
    beat: layers.beat?.key || null,
    beatMode: layers.beat?.mode || 'loading',
    amb: layers.amb?.key || null,
    pad: layers.pad?.key || null,
  }),
};
