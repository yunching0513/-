'use strict';

/* ———— 工具 ———— */
const $ = (s) => document.querySelector(s);
const TAURI = window.__TAURI__ || null;

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 私密模式等情況 */ }
  },
};

/* ———— 設定與統計 ———— */
const DEFAULTS = { focus: 25, short: 5, long: 15, autoBreak: true, autoFocus: false, sound: true, notify: true, pinned: false };
const settings = Object.assign({}, DEFAULTS, store.get('pomo.settings.v1', {}));
const saveSettings = () => store.set('pomo.settings.v1', settings);

const todayKey = () => new Date().toISOString().slice(0, 10);
let stats = store.get('pomo.stats.v1', {});
function bumpToday(minutes) {
  const k = todayKey();
  if (!stats.date || stats.date !== k) stats = { date: k, count: 0, minutes: 0 };
  stats.count += 1;
  stats.minutes += minutes;
  store.set('pomo.stats.v1', stats);
}
function todayStats() {
  return (stats.date === todayKey()) ? stats : { count: 0, minutes: 0 };
}

/* ———— 狀態機 ———— */
const MODE_LABEL = { focus: '專注', short: '短休息', long: '長休息' };
const LONG_EVERY = 4;

const state = {
  mode: 'focus',
  completed: 0,          // 本循環已完成的專注數
  running: false,
  endAt: null,           // 執行中：預計結束的時間戳
  remainMs: settings.focus * 60000,
};

const durMs = (mode) => settings[mode] * 60000;
const remaining = () => state.running ? Math.max(0, state.endAt - Date.now()) : state.remainMs;

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
  backdrop: $('#backdrop'),
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
    syncTray(text);
    if (!TAURI) document.title = state.running ? `${text} — 蕃茄鐘` : '蕃茄鐘';
  }
  el.ringBar.style.strokeDashoffset = `${CIRC * (1 - rem / durMs(state.mode))}`;
}

function renderMeta() {
  el.body.dataset.mode = state.mode;
  el.body.classList.toggle('running', state.running);
  el.modeLabel.textContent = MODE_LABEL[state.mode];
  el.playBtn.setAttribute('aria-label', state.running ? '暫停' : '開始');

  const filled = (state.mode === 'long') ? LONG_EVERY : state.completed % LONG_EVERY;
  el.dots.forEach((d, i) => {
    d.classList.toggle('done', i < filled);
    d.classList.toggle('now', state.mode === 'focus' && state.running && i === filled);
  });

  const t = todayStats();
  el.today.textContent = t.count > 0
    ? `今天已完成 ${t.count} 顆蕃茄 · 專注 ${t.minutes} 分鐘`
    : '準備好開始專注了嗎？';
}

/* ———— 提示音（WebAudio 合成，無音檔） ———— */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
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

/* ———— 通知 ———— */
async function notify(title, body) {
  if (!settings.notify) return;
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

/* ———— 動作 ———— */
function setMode(mode, { keepPaused = true } = {}) {
  state.mode = mode;
  state.running = false;
  state.endAt = null;
  state.remainMs = durMs(mode);
  if (!keepPaused) start();
  renderMeta();
  render();
}

function start() {
  ensureAudio();
  state.endAt = Date.now() + remaining();
  state.running = true;
  renderMeta();
  render();
}

function pause() {
  state.remainMs = remaining();
  state.running = false;
  state.endAt = null;
  renderMeta();
  render();
}

const toggle = () => (state.running ? pause() : start());

function reset() {
  state.remainMs = durMs(state.mode);
  state.running = false;
  state.endAt = null;
  renderMeta();
  render();
}

function advance({ skipped = false } = {}) {
  const finished = state.mode;
  let next;

  if (finished === 'focus') {
    if (!skipped) bumpToday(settings.focus);
    state.completed += 1;
    next = (state.completed % LONG_EVERY === 0) ? 'long' : 'short';
  } else {
    next = 'focus';
  }

  if (!skipped) {
    el.ringWrap.classList.remove('pulse');
    void el.ringWrap.offsetWidth; /* 重新觸發動畫 */
    el.ringWrap.classList.add('pulse');
    chime(finished === 'focus' ? 'focus-done' : 'break-done');

    if (finished === 'focus') {
      const restMin = settings[next];
      notify('完成一顆蕃茄 🍅', `辛苦了，休息 ${restMin} 分鐘吧。`);
    } else {
      notify('休息結束', '回來囉，開始下一輪專注。');
    }
  }

  const auto = !skipped && (next === 'focus' ? settings.autoFocus : settings.autoBreak);
  setMode(next, { keepPaused: !auto });
}

const skip = () => advance({ skipped: true });

/* ———— 計時核心：時間戳計算，休眠喚醒也準 ———— */
setInterval(() => {
  if (state.running && remaining() <= 0) advance();
  else if (state.running) render();
}, 250);

(function raf() {
  if (state.running) render();
  requestAnimationFrame(raf);
})();

/* ———— 設定面板 ———— */
function openSheet() {
  el.sheet.hidden = false;
  el.backdrop.hidden = false;
  requestAnimationFrame(() => {
    el.sheet.classList.add('show');
    el.backdrop.classList.add('show');
  });
}

function closeSheet() {
  el.sheet.classList.remove('show');
  el.backdrop.classList.remove('show');
  setTimeout(() => { el.sheet.hidden = true; el.backdrop.hidden = true; }, 340);
}

function syncSheetUI() {
  document.querySelectorAll('.stepper').forEach((st) => {
    const key = st.dataset.key;
    st.querySelector('.step-val b').textContent = settings[key];
    st.querySelector('[data-dir="-1"]').disabled = settings[key] <= +st.dataset.min;
    st.querySelector('[data-dir="1"]').disabled = settings[key] >= +st.dataset.max;
  });
  $('#optAutoBreak').checked = settings.autoBreak;
  $('#optAutoFocus').checked = settings.autoFocus;
  $('#optSound').checked = settings.sound;
  $('#optNotify').checked = settings.notify;
}

document.querySelectorAll('.stepper').forEach((st) => {
  st.addEventListener('click', (e) => {
    const btn = e.target.closest('.step-btn');
    if (!btn) return;
    const key = st.dataset.key;
    const next = settings[key] + (+btn.dataset.dir) * (+st.dataset.step);
    settings[key] = Math.min(+st.dataset.max, Math.max(+st.dataset.min, next));
    saveSettings();
    syncSheetUI();
    if (state.mode === key && !state.running) reset(); /* 未執行時即刻套用新時長 */
    else render();
  });
});

for (const [id, key] of [['optAutoBreak', 'autoBreak'], ['optAutoFocus', 'autoFocus'], ['optSound', 'sound'], ['optNotify', 'notify']]) {
  $(`#${id}`).addEventListener('change', (e) => {
    settings[key] = e.target.checked;
    saveSettings();
    if (key === 'sound' && e.target.checked) ensureAudio();
  });
}

/* ———— 釘選在最上層 ———— */
const pinBtn = $('#pinBtn');
async function applyPin(flag) {
  settings.pinned = flag;
  saveSettings();
  pinBtn.classList.toggle('pinned', flag);
  pinBtn.setAttribute('aria-pressed', String(flag));
  try { await TAURI?.window?.getCurrentWindow().setAlwaysOnTop(flag); } catch { /* 網頁版無此功能 */ }
}
pinBtn.addEventListener('click', () => applyPin(!settings.pinned));

/* ———— 事件繫結 ———— */
el.playBtn.addEventListener('click', toggle);
$('#resetBtn').addEventListener('click', reset);
$('#skipBtn').addEventListener('click', skip);
$('#setBtn').addEventListener('click', openSheet);
$('#closeSheet').addEventListener('click', closeSheet);
el.backdrop.addEventListener('click', closeSheet);

document.addEventListener('pointerdown', ensureAudio, { once: true, capture: true });

document.addEventListener('keydown', (e) => {
  if (e.metaKey && e.key === ',') { e.preventDefault(); el.sheet.hidden ? openSheet() : closeSheet(); return; }
  if (!el.sheet.hidden) {
    if (e.key === 'Escape') closeSheet();
    return;
  }
  if (e.key === ' ') { e.preventDefault(); toggle(); }
  else if (e.key === 'r' || e.key === 'R') reset();
  else if (e.key === 's' || e.key === 'S') skip();
});

/* Tauri 選單列指令 */
TAURI?.event?.listen('tray-command', ({ payload }) => {
  if (payload === 'toggle') toggle();
  else if (payload === 'skip') skip();
  else if (payload === 'reset') reset();
}).catch?.(() => {});

/* ———— 啟動 ———— */
if (settings.pinned) applyPin(true);
syncSheetUI();
renderMeta();
render();

/* 測試鉤子（不影響一般使用） */
window.__pomo = {
  fastForward(ms) {
    if (state.running) state.endAt -= ms;
    else state.remainMs = Math.max(0, state.remainMs - ms);
    render();
  },
  state, settings, advance,
};
