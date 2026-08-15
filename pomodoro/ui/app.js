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

/* ———— 設定 ———— */
const DEFAULTS = {
  focus: 25, short: 5, long: 15,
  autoBreak: true, autoFocus: false, sound: true, notify: true, pinned: false,
  warmup: true, restLock: true, cleanCut: true,
  audio: 'off', volume: 35,
};
const settings = Object.assign({}, DEFAULTS, store.get('pomo.settings.v1', {}));
const saveSettings = () => store.set('pomo.settings.v1', settings);

/* ———— 今日統計 ———— */
const todayKey = () => new Date().toISOString().slice(0, 10);
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

function addTask(text) {
  const clean = text.trim();
  if (!clean) return;
  const first = !tasks.some((t) => t.active && !t.done);
  tasks.unshift({
    id: `t${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    text: clean,
    done: false,
    active: first, // 第一件未完成的任務自動成為本回合目標
    tomatoes: 0,
    next: '',
  });
  saveTasks();
  renderTasks();
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
  if (t.done) t.active = false;
  saveTasks();
  renderTasks();
}

function removeTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
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
    if (!TAURI) document.title = state.running ? `${text} — 蕃茄鐘` : '蕃茄鐘 — 心流專注工具';
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

/* ———— 音訊：提示音 + 雙耳節拍（原則四） ———— */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
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

/* 雙耳節拍：左右耳各一純音，頻率差即為目標腦波頻率 */
const BEAT_HZ = { beta: 18, alpha: 8, theta: 6 };
const CARRIER = 220; // A3 載波，低頻聽感柔和
let beat = null;

function startBeat(band) {
  const ctx = ensureAudio();
  if (!ctx || !BEAT_HZ[band]) return;
  stopBeat(true);

  const merger = ctx.createChannelMerger(2);
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(Math.max(0.0002, settings.volume / 100 * 0.16), ctx.currentTime + 1.6);

  const oscs = [CARRIER, CARRIER + BEAT_HZ[band]].map((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(merger, 0, i);
    osc.start();
    return osc;
  });

  merger.connect(master).connect(ctx.destination);
  beat = { oscs, master, band };
  el.audioBtn.classList.add('on');
  el.audioBtn.setAttribute('aria-pressed', 'true');
}

function stopBeat(immediate) {
  if (!beat) return;
  const { oscs, master } = beat;
  const ctx = audioCtx;
  const t = ctx.currentTime;
  const stopAt = immediate ? t + 0.05 : t + 0.9;
  try {
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
    master.gain.exponentialRampToValueAtTime(0.0001, stopAt);
  } catch { /* 節點已停止 */ }
  for (const o of oscs) { try { o.stop(stopAt + 0.05); } catch { /* 已停止 */ } }
  beat = null;
  el.audioBtn.classList.remove('on');
  el.audioBtn.setAttribute('aria-pressed', 'false');
}

/* 專注播使用者選定的頻段；休息自動切 Alpha（利於 DMN 恢復） */
function syncBeat() {
  if (settings.audio === 'off' || !state.running) { stopBeat(); return; }
  const want = state.mode === 'focus' ? settings.audio : 'alpha';
  if (beat?.band === want) return;
  startBeat(want);
}

function setVolume(v) {
  settings.volume = v;
  saveSettings();
  if (beat && audioCtx) {
    const t = audioCtx.currentTime;
    beat.master.gain.cancelScheduledValues(t);
    beat.master.gain.setTargetAtTime(Math.max(0.0001, v / 100 * 0.16), t, 0.15);
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
  closeRest();
  renderMeta();
  render();
  if (autoStart) start();
  else { syncBeat(); syncTray(fmt(remaining())); }
}

function start() {
  ensureAudio();
  state.endAt = Date.now() + remaining();
  state.running = true;
  renderMeta();
  render();
  syncBeat();
  if (state.mode !== 'focus' && settings.restLock) openRest();
}

function pause() {
  state.remainMs = remaining();
  state.running = false;
  state.endAt = null;
  renderMeta();
  render();
  syncBeat();
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
  closeRest();
  renderMeta();
  render();
  syncBeat();
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
function openSheet(node) {
  closeSheets(true);
  node.hidden = false;
  el.backdrop.hidden = false;
  requestAnimationFrame(() => {
    node.classList.add('show');
    el.backdrop.classList.add('show');
  });
}

function closeSheets(instant) {
  for (const s of [el.sheet, el.taskSheet]) {
    if (s.hidden) continue;
    s.classList.remove('show');
    setTimeout(() => { s.hidden = true; }, instant ? 0 : 340);
  }
  el.backdrop.classList.remove('show');
  setTimeout(() => { el.backdrop.hidden = true; }, instant ? 0 : 340);
}

const sheetOpen = () => !el.sheet.hidden || !el.taskSheet.hidden;

function syncSheetUI() {
  document.querySelectorAll('.stepper').forEach((st) => {
    const key = st.dataset.key;
    st.querySelector('.step-val b').textContent = settings[key];
    st.querySelector('[data-dir="-1"]').disabled = settings[key] <= +st.dataset.min;
    st.querySelector('[data-dir="1"]').disabled = settings[key] >= +st.dataset.max;
  });
  for (const [id, key] of TOGGLES) $(`#${id}`).checked = settings[key];
  $('#optVolume').value = settings.volume;
  document.querySelectorAll('.seg-btn').forEach((b) => {
    const on = b.dataset.audio === settings.audio;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
}

const TOGGLES = [
  ['optAutoBreak', 'autoBreak'], ['optAutoFocus', 'autoFocus'],
  ['optSound', 'sound'], ['optNotify', 'notify'],
  ['optWarmup', 'warmup'], ['optRestLock', 'restLock'], ['optCleanCut', 'cleanCut'],
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
    if (key === 'restLock') {
      if (!e.target.checked) closeRest();
      else if (state.running && state.mode !== 'focus') openRest();
    }
  });
}

$('#audioSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  settings.audio = btn.dataset.audio;
  saveSettings();
  syncSheetUI();
  ensureAudio();
  stopBeat(true);
  syncBeat();
});

$('#optVolume').addEventListener('input', (e) => setVolume(+e.target.value));

el.audioBtn.addEventListener('click', () => {
  // 快速切換：關閉 ⇄ 上次選的頻段（預設 Alpha）
  settings.audio = settings.audio === 'off' ? (beat?.band || 'alpha') : 'off';
  saveSettings();
  syncSheetUI();
  ensureAudio();
  stopBeat(true);
  syncBeat();
});

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
  beat: () => (beat ? { band: beat.band, ctx: audioCtx?.state } : null),
};
