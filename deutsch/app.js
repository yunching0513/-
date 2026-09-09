'use strict';

/* ————————————————————————————————————————————————
   Nochmal — 主程式
   ————————————————————————————————————————————————
   資料全部留在瀏覽器：進度在 localStorage，語音在 IndexedDB。
   沒有帳號、沒有後端，關掉分頁也不會掉。
   ———————————————————————————————————————————————— */

const { COURSE, ITEMS, ITEM_BY_ID } = window.NochmalCourse;
const { GRADE, Deck, Session, DAY } = window.NochmalScheduler;
const { Speaker, cacheCount, cacheClear } = window.NochmalTTS;
const { Listener, Recorder, score, canRecognize, canRecord } = window.NochmalSpeech;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 無痕模式 */ }
  },
};

const K = { settings: 'nochmal.settings.v1', deck: 'nochmal.deck.v1', log: 'nochmal.log.v1' };

const DEFAULTS = {
  apiKey: '',
  voice: 'de-DE-Chirp3-HD-Kore',
  rate: 1,
  slowRate: 0.7,
  pause: 4,
  size: 20,
  newLimit: 6,
  mode: 'mixed',
  scope: 'all',
  autoPlay: true,
  showLit: true,
  autoAdvance: false,
};
const settings = Object.assign({}, DEFAULTS, store.get(K.settings, {}));
const saveSettings = () => store.set(K.settings, settings);

const deck = new Deck(store.get(K.deck, {}));
const saveDeck = () => store.set(K.deck, deck.cards);

/* 練習紀錄：只留每天的作答數，用來算連續天數 */
let log = store.get(K.log, {});
const saveLog = () => store.set(K.log, log);

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function recordAnswers(n) {
  const k = dayKey();
  log[k] = (log[k] || 0) + n;
  saveLog();
}

/* 連續天數：從今天（或昨天，今天還沒練也算數）往回數 */
function streak() {
  const days = new Set(Object.keys(log).filter((k) => log[k] > 0));
  if (!days.size) return 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

const speaker = new Speaker({ apiKey: settings.apiKey, voice: settings.voice, rate: settings.rate });
const listener = new Listener();
const recorder = new Recorder();

/* ———— 小工具 ———— */
let toastTimer = null;
function toast(msg, isError) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('err', !!isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 5200 : 2600);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function relativeDue(card) {
  if (!card || !card.due) return 'new';
  const days = Math.round((card.due - Date.now()) / DAY);
  if (days <= 0) return 'due now';
  if (days === 1) return 'due tomorrow';
  if (days < 30) return `due in ${days} d`;
  return `due in ${Math.round(days / 30)} mo`;
}

/* ———— 範圍 ———— */
function poolFor(scope) {
  if (scope === 'all') return ITEMS.map((i) => i.id);
  if (scope === 'sentences') return ITEMS.filter((i) => i.kind === 'sentence').map((i) => i.id);
  if (scope === 'patterns') return ITEMS.filter((i) => i.kind === 'pattern').map((i) => i.id);
  return ITEMS.filter((i) => i.unitId === scope).map((i) => i.id);
}

/* ———— 導覽 ———— */
function show(view) {
  $$('.view').forEach((v) => v.classList.toggle('is-on', v.id === 'view' + view[0].toUpperCase() + view.slice(1)));
  $$('.nav-btn').forEach((b) => b.classList.toggle('is-on', b.dataset.view === view));
  if (view === 'home') renderHome();
  if (view === 'units') renderUnits();
  if (view === 'stats') renderStats();
  window.scrollTo(0, 0);
}
$$('.nav-btn').forEach((b) => b.addEventListener('click', () => {
  if (session && !session.finished && b.dataset.view !== 'drill') endSession(true);
  show(b.dataset.view);
}));

/* ———— 練習首頁 ———— */
function statTile(cls, value, label) {
  return `<div class="stat ${cls}"><b>${value}</b><span>${label}</span></div>`;
}

function renderHome() {
  const ids = poolFor(settings.scope);
  const s = deck.stats(ids);
  $('#homeStats').innerHTML =
    statTile('due', s.due, 'due for review') +
    statTile('new', s.fresh, 'not started') +
    statTile('mature', s.mature, 'settled (21 d+)') +
    statTile('', s.total, 'in this selection');
  $('#poolHint').textContent = `${s.due} due · ${s.fresh} new · ${s.total} total`;
  $('#streakNum').textContent = streak();
  renderPreview(ids);

  const key = settings.apiKey;
  $('#ttsStatus').innerHTML = key
    ? `Voice: <b>${esc(settings.voice)}</b> via Google Cloud.`
    : 'No Google key set, so the browser’s built-in German voice will be used. Add a key in Settings for the HD voices.';
}

/* 排程器挑卡不會改動 deck，所以可以先建一個丟掉的 Session 當預覽。
   「這次 20 張」但新卡上限 6 的時候，實際只會拿到 6 張，得先說。 */
function renderPreview(ids) {
  const preview = new Session(deck, ids, { size: settings.size, newLimit: settings.newLimit });
  const n = preview.plannedTotal;
  const fresh = preview.queue.filter((q) => deck.isNew(q.id)).length;
  const el = $('#previewLine');
  if (!n) { el.textContent = 'Nothing due in this selection — pick another unit, or allow more new sentences.'; return; }
  el.innerHTML = `Next session: <b>${n}</b> card${n === 1 ? '' : 's'}` +
    (fresh ? ` — ${fresh} new, ${n - fresh} review` : ' — all review') +
    (n < settings.size ? ` <span class="hint">(the new-sentence limit caps it at ${settings.newLimit} unseen ones)</span>` : '');
}

function buildScopeSelect() {
  const sel = $('#scopeSelect');
  const opts = [
    ['all', 'Everything (all 12 units)'],
    ['sentences', 'Full sentences only'],
    ['patterns', 'Substitution drills only'],
  ].concat(COURSE.map((u, i) => [u.id, `${i + 1}. ${u.title} — ${u.de}`]));
  sel.innerHTML = opts.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('');
  sel.value = settings.scope;
}

/* ———— 課程 ———— */
function unitProgress(unit) {
  const ids = unit.items.map((i) => i.id);
  const s = deck.stats(ids);
  return { ...s, pct: s.total ? (s.mature + s.learning * 0.45) / s.total : 0 };
}

function renderUnits() {
  $('#unitList').innerHTML = COURSE.map((unit, i) => {
    const p = unitProgress(unit);
    return `
    <div class="unit" data-unit="${unit.id}">
      <button class="unit-head" data-toggle="${unit.id}">
        <span class="unit-num">${i + 1}</span>
        <span class="unit-titles">
          <b>${esc(unit.title)}</b>
          <span>${esc(unit.de)} · ${esc(unit.focus)}</span>
        </span>
        <span class="unit-meter">
          <i><b style="width:${Math.round(p.pct * 100)}%"></b></i>
          <span>${p.mature}/${p.total} settled</span>
        </span>
      </button>
      <div class="unit-body" hidden id="body-${unit.id}"></div>
    </div>`;
  }).join('');

  $$('[data-toggle]').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.dataset.toggle;
    const body = $('#body-' + id);
    if (!body.hidden) { body.hidden = true; return; }
    body.innerHTML = unitBody(COURSE.find((u) => u.id === id));
    body.hidden = false;
    body.querySelectorAll('.sent-play').forEach((b) =>
      b.addEventListener('click', () => play(b.dataset.de, settings.rate, b)));
    body.querySelector('.unit-actions button').addEventListener('click', () => {
      settings.scope = id; saveSettings();
      buildScopeSelect(); show('home'); startSession();
    });
  }));
}

function unitBody(unit) {
  const rows = unit.items.map((it) => {
    const c = deck.cards[it.id];
    const state = !c || !c.due ? 'new' : c.interval >= 21 ? 'mature' : 'learning';
    return `<div class="sent">
      <button class="sent-play" data-de="${esc(it.de)}" title="Play">▶</button>
      <span class="sent-text">
        <span class="sent-de">${esc(it.de)}</span>
        <span class="sent-en">${esc(it.en)}</span>
      </span>
      <span class="sent-dot" data-s="${state}" title="${state}"></span>
    </div>`;
  }).join('');

  const patterns = unit.patterns.map((p) =>
    `<div class="sent"><span class="sent-text">
      <span class="sent-de">${esc(p.frame)}</span>
      <span class="sent-en">${esc(p.en)} — ${p.slots.map((s) => esc(s.de)).join(' · ')}</span>
    </span></div>`).join('');

  return `
    <div class="grammar">${unit.grammar.map((g) => `<p>${g}</p>`).join('')}</div>
    ${rows}
    <div class="grammar" style="background:var(--blue-soft)">
      <p><b>Substitution drills</b> — the same frame, one part swapped each time.</p>
    </div>
    ${patterns}
    <div class="unit-actions"><button class="cta cta-slim">Drill this unit</button></div>`;
}

/* ———— 進度 ———— */
function renderStats() {
  const ids = ITEMS.map((i) => i.id);
  const s = deck.stats(ids);
  const answers = Object.values(log).reduce((a, b) => a + b, 0);
  $('#bigStats').innerHTML =
    statTile('mature', s.mature, 'settled (21 d+)') +
    statTile('', s.learning, 'in progress') +
    statTile('new', s.fresh, 'not started') +
    statTile('due', answers, 'answers all time');

  /* 未來十四天的到期量 */
  const buckets = new Array(14).fill(0);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  let overdue = 0;
  for (const id of ids) {
    const c = deck.cards[id];
    if (!c || !c.due) continue;
    const d = Math.floor((c.due - start.getTime()) / DAY);
    if (d < 0) overdue++;
    else if (d < 14) buckets[d]++;
  }
  buckets[0] += overdue;
  const max = Math.max(1, ...buckets);
  $('#forecast').innerHTML = buckets.map((n, i) => {
    const d = new Date(start.getTime() + i * DAY);
    const label = i === 0 ? 'today' : d.toLocaleDateString('en', { weekday: 'narrow' });
    return `<div class="fc-day">
      <span class="fc-count">${n || ''}</span>
      <div class="fc-bar ${i === 0 ? 'today' : ''}" style="height:${(n / max) * 100}%"></div>
      <span class="fc-label">${label}</span>
    </div>`;
  }).join('');

  const weak = ids
    .map((id) => deck.cards[id])
    .filter((c) => c && c.lapses > 0)
    .sort((a, b) => (b.lapses - a.lapses) || (a.correct / Math.max(1, a.seen)) - (b.correct / Math.max(1, b.seen)))
    .slice(0, 12);
  $('#weakList').innerHTML = weak.length ? weak.map((c) => {
    const it = ITEM_BY_ID.get(c.id);
    if (!it) return '';
    return `<div class="sent">
      <button class="sent-play" data-de="${esc(it.de)}">▶</button>
      <span class="sent-text">
        <span class="sent-de">${esc(it.de)}</span>
        <span class="sent-en">${esc(it.en)}</span>
      </span>
      <span class="weak-badge">forgotten ${c.lapses}×</span>
    </div>`;
  }).join('') : '<p class="micro">Nothing forgotten yet. Come back after a few sessions.</p>';
  $$('#weakList .sent-play').forEach((b) =>
    b.addEventListener('click', () => play(b.dataset.de, settings.rate, b)));
}

/* ————————————————————————————————————————————————
   語音播放
   ———————————————————————————————————————————————— */
let playToken = 0;
async function play(text, rate, btn) {
  const my = ++playToken;
  if (btn) btn.classList.add('is-playing');
  try {
    const r = await speaker.speak(text, { rate });
    if (my === playToken && r.source === 'browser' && settings.apiKey && speaker.lastError) {
      toast(speaker.lastError, true);
    }
    return r;
  } catch (err) {
    if (my === playToken) toast(err.message || 'Could not play audio.', true);
    return null;
  } finally {
    if (btn) btn.classList.remove('is-playing');
  }
}

/* 沒有真實音檔長度時的估算：德語約每秒 13 個字元 */
const estimateMs = (text, rate) => Math.max(1200, (text.length / 13) * 1000 / (rate || 1));

/* ————————————————————————————————————————————————
   練習
   ———————————————————————————————————————————————— */
let session = null;
let current = null;        // { item, card, mode }
let revealed = false;
let suggested = GRADE.GOOD;
let anticipation = null;   // 進行中的動畫，切卡要取消
let answeredThisSession = 0;

/* mixed：依這張卡的成熟度決定用哪種操練。
   沒見過的句子不可能「回想」，所以先用拼句把每個字看過一遍；
   熟了才推到出聲產出。 */
function pickMode(card, n) {
  if (settings.mode !== 'mixed') return settings.mode;
  if (!card || !card.due) return 'build';
  if (card.reps <= 2) return n % 2 === 0 ? 'recall' : 'listen';
  if (canRecognize() && n % 3 === 0) return 'speak';
  if (n % 3 === 1) return 'shadow';
  return 'recall';
}

const MODE_LABEL = { recall: 'Recall', listen: 'Dictation', shadow: 'Shadow', speak: 'Speak', build: 'Word order' };

function startSession() {
  const pool = poolFor(settings.scope);
  session = new Session(deck, pool, { size: settings.size, newLimit: settings.newLimit });
  if (!session.plannedTotal) {
    toast('Nothing to practise in this selection yet.');
    session = null;
    return;
  }
  answeredThisSession = 0;
  $('#doneCard').hidden = true;
  $('#card').hidden = false;
  $('#keys').hidden = false;
  show('drill');
  $$('.nav-btn').forEach((b) => b.classList.remove('is-on'));
  nextCard();
}

function nextCard() {
  stopEverything();
  if (!session || session.finished) return finishSession();

  const entry = session.peek();
  const item = ITEM_BY_ID.get(entry.id);
  const card = deck.cards[entry.id];
  current = { item, card, mode: pickMode(card, session.log.length) };
  revealed = false;
  suggested = GRADE.GOOD;

  $('#progressBar').style.width = `${session.progress * 100}%`;
  $('#counter').textContent = `${session.done.length} / ${session.plannedTotal}`;
  $('#modeTag').textContent = MODE_LABEL[current.mode];
  $('#unitTag').textContent = item.unitTitle;
  $('#dueTag').textContent = relativeDue(card);
  $('#reveal').hidden = true;
  $('#feedback').hidden = true;
  $('#feedback').innerHTML = '';
  $('#gradeRow').hidden = true;
  $('#showRow').hidden = false;
  $('#anticipate').hidden = true;
  $('#answerBox').innerHTML = '';

  renderPrompt();
}

function renderPrompt() {
  const { item, mode } = current;
  const p = $('#prompt');

  if (mode === 'listen' || mode === 'shadow') {
    p.innerHTML = `<span><span class="ear">🎧</span>
      <span class="cue">${mode === 'listen'
        ? 'Type the German you hear. Play it as often as you need.'
        : 'Listen, then say it back at the same speed and rhythm.'}</span></span>`;
  } else {
    p.innerHTML = `<span>${esc(item.en)}
      ${settings.showLit && item.lit ? `<span class="cue">${esc(item.lit)}</span>` : ''}</span>`;
  }

  if (mode === 'recall') renderRecall();
  else if (mode === 'listen') renderListen();
  else if (mode === 'shadow') renderShadow();
  else if (mode === 'speak') renderSpeak();
  else if (mode === 'build') renderBuild();
}

/* ———— Recall：預期停頓後自動揭曉 ———— */
function renderRecall() {
  $('#answerBox').innerHTML = '';
  if (settings.pause <= 0) return;
  const wrap = $('#anticipate');
  wrap.hidden = false;
  const fill = $('#anticipateFill');
  anticipation = fill.animate(
    [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
    { duration: settings.pause * 1000, easing: 'linear', fill: 'forwards' }
  );
  anticipation.onfinish = () => { if (!revealed) doReveal(); };
}

/* ———— Dictation ———— */
function renderListen() {
  $('#answerBox').innerHTML = `
    <input class="type-in" id="typeIn" placeholder="Was hörst du?" autocomplete="off"
           autocorrect="off" autocapitalize="off" spellcheck="false">
    <div class="umlaut-row">
      ${['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].map((c) => `<button class="umlaut" data-ch="${c}">${c}</button>`).join('')}
      <button class="ghost" id="checkBtn" style="margin-left:auto">Check <kbd>↵</kbd></button>
    </div>`;
  const input = $('#typeIn');
  $$('.umlaut').forEach((b) => b.addEventListener('click', () => insertAt(input, b.dataset.ch)));
  $('#checkBtn').addEventListener('click', checkTyped);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); checkTyped(); } });
  input.focus();
  play(current.item.de, settings.rate);
}

function insertAt(input, ch) {
  const s = input.selectionStart ?? input.value.length;
  const e = input.selectionEnd ?? s;
  input.value = input.value.slice(0, s) + ch + input.value.slice(e);
  input.selectionStart = input.selectionEnd = s + ch.length;
  input.focus();
}

function checkTyped() {
  if (revealed) return;
  const said = $('#typeIn').value.trim();
  if (!said) { toast('Type something first, or press Space to give up.'); return; }
  /* 打字用 strict：ß 與變音符號是拼寫練習的重點，不能放行 */
  const r = score(current.item.de, said, { strict: true });
  showFeedback(r, 'You typed');
  suggested = r.score >= 0.999 ? GRADE.GOOD : r.score >= 0.7 ? GRADE.HARD : GRADE.AGAIN;
  doReveal();
  maybeAdvance(r.score);
}

/* ———— Shadow ———— */
function renderShadow() {
  $('#answerBox').innerHTML = `
    <div class="mic-wrap">
      <button class="mic-btn" id="shadowBtn">▶ Play, then repeat</button>
      <span class="micro" id="shadowMsg">${canRecord()
        ? 'Your attempt is recorded so you can hear both back.'
        : 'Recording is unavailable here, so just repeat out loud.'}</span>
    </div>
    <div class="compare-row" id="compareRow" hidden></div>`;
  $('#shadowBtn').addEventListener('click', runShadow);
  runShadow();
}

async function runShadow() {
  const btn = $('#shadowBtn');
  const msg = $('#shadowMsg');
  if (!btn) return;
  btn.disabled = true;

  btn.textContent = '🔊 Listen…';
  await play(current.item.de, settings.rate);
  if (!current) return;

  if (!canRecord()) {
    btn.disabled = false;
    btn.textContent = '▶ Again';
    doReveal();
    return;
  }

  try {
    await recorder.start();
  } catch {
    msg.textContent = 'Microphone blocked — repeat out loud anyway.';
    btn.disabled = false;
    btn.textContent = '▶ Again';
    doReveal();
    return;
  }

  const dur = (speaker.audio.duration ? speaker.audio.duration * 1000 : estimateMs(current.item.de, settings.rate)) + 900;
  btn.classList.add('is-live');
  btn.textContent = '🎙 Your turn — go!';
  await new Promise((r) => setTimeout(r, dur));

  const url = await recorder.stop();
  btn.classList.remove('is-live');
  btn.disabled = false;
  btn.textContent = '↻ Once more';

  if (url && $('#compareRow')) {
    $('#compareRow').hidden = false;
    $('#compareRow').innerHTML = `
      <button class="audio-btn" id="cmpModel">▶ The voice</button>
      <button class="audio-btn" id="cmpYou">▶ You</button>`;
    $('#cmpModel').addEventListener('click', () => play(current.item.de, settings.rate, $('#cmpModel')));
    $('#cmpYou').addEventListener('click', () => { const a = new Audio(url); a.play(); });
  }
  doReveal();
}

/* ———— Speak ———— */
function renderSpeak() {
  const ok = canRecognize();
  $('#answerBox').innerHTML = `
    <div class="mic-wrap">
      <button class="mic-btn" id="micBtn" ${ok ? '' : 'disabled'}>🎙 ${ok ? 'Hold your nerve and say it' : 'Not supported here'}</button>
      <span class="micro">${ok
        ? 'Say the German out loud. <kbd>M</kbd> starts the microphone.'
        : 'Speech recognition needs Chrome, Edge or Safari. Say it out loud and grade yourself.'}</span>
    </div>
    <p class="heard" id="heard"></p>`;
  if (ok) $('#micBtn').addEventListener('click', runSpeak);
}

async function runSpeak() {
  const btn = $('#micBtn');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  btn.classList.add('is-live');
  btn.textContent = '🎙 Listening…';
  const heard = $('#heard');
  try {
    const { transcript } = await listener.listen({
      onPartial: (t) => { if (heard) heard.textContent = t; },
      timeout: 9000,
    });
    if (!current) return;
    if (!transcript.trim()) {
      toast('I didn’t catch that. Try again, a little closer to the microphone.');
      btn.disabled = false; btn.classList.remove('is-live'); btn.textContent = '🎙 Try again';
      return;
    }
    const r = score(current.item.de, transcript);
    showFeedback(r, 'Recognised');
    suggested = r.score >= 0.9 ? GRADE.GOOD : r.score >= 0.6 ? GRADE.HARD : GRADE.AGAIN;
    doReveal();
    maybeAdvance(r.score);
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false; btn.classList.remove('is-live'); btn.textContent = '🎙 Try again';
  }
}

/* ———— Word order ———— */
function renderBuild() {
  const tokens = current.item.de.split(/\s+/);
  const bank = window.NochmalScheduler.shuffle(tokens.map((w, i) => ({ w, i })));
  $('#answerBox').innerHTML = `
    <div class="tiles slot" id="slot"></div>
    <div class="tiles" id="bank">
      ${bank.map((t) => `<button class="tile" data-i="${t.i}">${esc(t.w)}</button>`).join('')}
    </div>
    <div class="umlaut-row"><button class="ghost" id="checkBtn" style="margin-left:auto">Check <kbd>↵</kbd></button></div>`;

  const placed = [];
  const slot = $('#slot');
  const redraw = () => {
    slot.innerHTML = placed.map((p, k) => `<button class="tile" data-k="${k}">${esc(p.w)}</button>`).join('');
    slot.querySelectorAll('.tile').forEach((el) => el.addEventListener('click', () => {
      const k = +el.dataset.k;
      const [back] = placed.splice(k, 1);
      $(`#bank .tile[data-i="${back.i}"]`).classList.remove('used');
      redraw();
    }));
  };
  $$('#bank .tile').forEach((el) => el.addEventListener('click', () => {
    el.classList.add('used');
    placed.push({ w: el.textContent, i: +el.dataset.i });
    redraw();
  }));
  $('#checkBtn').addEventListener('click', () => {
    if (revealed) return;
    const said = placed.map((p) => p.w).join(' ');
    if (!said) { toast('Put the sentence together first.'); return; }
    const r = score(current.item.de, said, { strict: true });
    showFeedback(r, 'You built');
    suggested = r.score >= 0.999 ? GRADE.GOOD : r.score >= 0.7 ? GRADE.HARD : GRADE.AGAIN;
    doReveal();
    maybeAdvance(r.score);
  });
}

/* ———— 回饋 ———— */
function showFeedback(r, label) {
  const pct = Math.round(r.score * 100);
  const cls = pct >= 90 ? 'good' : pct >= 60 ? 'mid' : 'bad';
  const verdict = pct === 100 ? 'Exactly right.' : pct >= 80 ? 'Close — check the marked words.' : 'Not there yet.';
  const marks = r.marks.map((m) => {
    if (m.status === 'ok') return `<span class="ok">${esc(m.word)}</span>`;
    if (m.status === 'missing') return `<span class="missing">${esc(m.word)}</span>`;
    return `<span class="wrong">${esc(m.word)}<sup>${esc(m.said)}</sup></span>`;
  }).join(' ');
  $('#feedback').innerHTML = `
    <div class="score-line">
      <span class="score-num ${cls}">${pct}%</span>
      <span class="score-label">${r.hit} of ${r.total} words · ${verdict}</span>
    </div>
    <div class="marks">${marks}</div>
    <p class="micro">${esc(label)}: “${esc(r.said)}”</p>`;
  $('#feedback').hidden = false;
}

/* ———— 揭曉與評分 ———— */
function doReveal() {
  if (revealed || !current) return;
  revealed = true;
  cancelAnticipation();
  const { item } = current;

  $('#deText').textContent = item.de;
  $('#enText').textContent = item.en;
  $('#litText').textContent = item.lit || '';
  $('#litText').hidden = !(settings.showLit && item.lit);
  $('#noteText').innerHTML = item.note ? esc(item.note) : '';
  $('#noteText').hidden = !item.note;
  $('#audioNote').textContent = speaker.usingFallback ? 'browser voice' : '';
  $('#reveal').hidden = false;
  $('#showRow').hidden = true;
  $('#gradeRow').hidden = false;
  $('#anticipate').hidden = true;

  $$('.grade').forEach((b) => b.style.outline = (+b.dataset.grade === suggested) ? '2px solid var(--accent)' : 'none');

  if (settings.autoPlay && current.mode !== 'listen' && current.mode !== 'shadow') {
    play(item.de, settings.rate, $('#playBtn'));
  }
}

/* 全對就自己往下走。留 1.4 秒讓人看得到那句德文與逐字回饋，
   不然畫面一閃而過，等於沒有揭曉。 */
function maybeAdvance(scoreValue) {
  if (!settings.autoAdvance || scoreValue < 0.999) return;
  const at = current && current.item.id;
  setTimeout(() => {
    if (current && current.item.id === at && revealed) grade(suggested);
  }, 1400);
}

function grade(g) {
  if (!revealed || !session) return;
  session.answer(deck, g);
  answeredThisSession++;
  saveDeck();
  nextCard();
}

function cancelAnticipation() {
  if (anticipation) { try { anticipation.cancel(); } catch { /* 已結束 */ } anticipation = null; }
}

function stopEverything() {
  cancelAnticipation();
  speaker.stop();
  listener.stop();
  playToken++;
}

function finishSession() {
  stopEverything();
  recorder.release();
  const s = session ? session.summary() : { cards: 0, answers: 0, accuracy: 0, minutes: 0 };
  recordAnswers(answeredThisSession);
  $('#card').hidden = true;
  $('#gradeRow').hidden = true;
  $('#showRow').hidden = true;
  $('#keys').hidden = true;
  $('#doneCard').hidden = false;
  $('#doneStats').innerHTML =
    statTile('mature', s.cards, 'sentences cleared') +
    statTile('', s.answers, 'answers given') +
    statTile('due', `${Math.round(s.accuracy * 100)}%`, 'first-try accuracy') +
    statTile('new', `${s.minutes}′`, 'minutes');

  const upcoming = poolFor(settings.scope).filter((id) => {
    const c = deck.cards[id];
    return c && c.due && c.due <= Date.now() + DAY;
  }).length;
  $('#doneNext').textContent = upcoming
    ? `${upcoming} sentences come back within the next 24 hours. Short and often beats long and rare.`
    : 'Nothing else falls due today. Come back tomorrow — the gap is doing the work.';
  session = null;
  current = null;
  $('#streakNum').textContent = streak();
}

function endSession(silent) {
  if (session) {
    recordAnswers(answeredThisSession);
    answeredThisSession = 0;
    saveDeck();
  }
  stopEverything();
  recorder.release();
  session = null;
  current = null;
  if (!silent) show('home');
}

/* ————————————————————————————————————————————————
   設定
   ———————————————————————————————————————————————— */
async function refreshVoices() {
  const sel = $('#voiceSelect');
  sel.innerHTML = '<option>Loading…</option>';
  const voices = await speaker.listVoices();
  const groups = {};
  for (const v of voices) (groups[v.tier] = groups[v.tier] || []).push(v);
  const order = ['Chirp3 HD', 'Chirp HD', 'Studio', 'Neural2', 'Polyglot', 'WaveNet', 'Standard'];
  sel.innerHTML = order.filter((t) => groups[t]).map((t) =>
    `<optgroup label="${esc(t)}">${groups[t].map((v) =>
      `<option value="${esc(v.name)}">${esc(v.name.replace('de-DE-', ''))} · ${esc((v.ssmlGender || '').toLowerCase())}</option>`
    ).join('')}</optgroup>`).join('');
  if (voices.some((v) => v.name === settings.voice)) sel.value = settings.voice;
  else if (voices.length) { sel.value = voices[0].name; settings.voice = voices[0].name; speaker.configure({ voice: settings.voice }); saveSettings(); }
  $('#voiceCount').textContent = settings.apiKey
    ? `${voices.length} German voices`
    : 'Built-in list — add a key to load the live one';
}

function wireSettings() {
  const key = $('#keyInput');
  key.value = settings.apiKey;
  key.addEventListener('change', async () => {
    settings.apiKey = key.value.trim();
    saveSettings();
    speaker.configure({ apiKey: settings.apiKey });
    await refreshVoices();
    renderHome();
  });
  $('#keyToggle').addEventListener('click', () => {
    key.type = key.type === 'password' ? 'text' : 'password';
  });
  $('#keyTest').addEventListener('click', async () => {
    settings.apiKey = key.value.trim();
    saveSettings();
    speaker.configure({ apiKey: settings.apiKey });
    $('#keyMsg').textContent = 'Checking…';
    const r = await speaker.testKey();
    $('#keyMsg').textContent = r.message;
    $('#keyMsg').style.color = r.ok ? 'var(--green)' : 'var(--accent)';
    if (r.ok) { await refreshVoices(); renderHome(); }
  });

  $('#voiceSelect').addEventListener('change', (e) => {
    settings.voice = e.target.value;
    speaker.configure({ voice: settings.voice });
    saveSettings();
    renderHome();
  });
  $('#voicePreview').addEventListener('click', () =>
    play('Guten Morgen! Ich freue mich, dass du Deutsch lernst.', settings.rate, $('#voicePreview')));

  const bind = (id, valId, prop, fmt, after) => {
    const el = $(id);
    el.value = settings[prop];
    $(valId).textContent = fmt(settings[prop]);
    el.addEventListener('input', () => {
      settings[prop] = parseFloat(el.value);
      $(valId).textContent = fmt(settings[prop]);
      saveSettings();
      if (after) after();
    });
  };
  bind('#rateRange', '#rateVal', 'rate', (v) => `${v.toFixed(2)}×`, () => speaker.configure({ rate: settings.rate }));
  bind('#slowRange', '#slowVal', 'slowRate', (v) => `${v.toFixed(2)}×`);
  bind('#pauseRange', '#pauseVal', 'pause', (v) => `${v.toFixed(1)} s`);
  bind('#sizeRange', '#sizeVal', 'size', (v) => `${v}`, () => renderPreview(poolFor(settings.scope)));
  bind('#newRange', '#newVal', 'newLimit', (v) => `${v}`, () => renderPreview(poolFor(settings.scope)));

  const check = (id, prop) => {
    const el = $(id);
    el.checked = !!settings[prop];
    el.addEventListener('change', () => { settings[prop] = el.checked; saveSettings(); });
  };
  check('#optAutoPlay', 'autoPlay');
  check('#optLit', 'showLit');
  check('#optAutoAdvance', 'autoAdvance');

  $('#warmBtn').addEventListener('click', async () => {
    if (!settings.apiKey) { toast('Add a Google key first — the browser voice needs no cache.'); return; }
    const ids = poolFor(settings.scope).slice(0, 120);
    const texts = ids.map((id) => ITEM_BY_ID.get(id).de);
    const msg = $('#cacheMsg');
    msg.textContent = 'Synthesising…';
    const r = await speaker.warm(texts, [settings.rate, settings.slowRate],
      (i, n, failed) => { msg.textContent = `${i} / ${n} clips${failed ? ` · ${failed} failed` : ''}`; });
    msg.textContent = `Cached. ${r.done} clips ready${r.failed ? `, ${r.failed} failed` : ''}.`;
  });
  $('#cacheClearBtn').addEventListener('click', async () => {
    await cacheClear();
    $('#cacheMsg').textContent = 'Audio cache cleared.';
  });
  cacheCount().then((n) => { if (n) $('#cacheMsg').textContent = `${n} clips cached.`; });
}

/* ———— 匯出／匯入／重設 ———— */
function wireData() {
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({
      app: 'nochmal', version: 1, exportedAt: new Date().toISOString(),
      deck: deck.cards, log, settings: Object.assign({}, settings, { apiKey: '' }),
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nochmal-progress-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'nochmal' || !data.deck) throw new Error('Not a Nochmal export.');
      /* 合併而不是覆蓋：兩台裝置各練一半時，取比較新的那筆 */
      let merged = 0;
      for (const [id, card] of Object.entries(data.deck)) {
        const mine = deck.cards[id];
        if (!mine || (card.last || 0) > (mine.last || 0)) { deck.cards[id] = card; merged++; }
      }
      for (const [d, n] of Object.entries(data.log || {})) log[d] = Math.max(log[d] || 0, n);
      saveDeck(); saveLog();
      toast(`Imported: ${merged} sentences updated.`);
      renderStats(); renderHome();
    } catch (err) {
      toast(err.message || 'Could not read that file.', true);
    }
    e.target.value = '';
  });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('Erase all progress? The course itself stays, but every schedule goes back to zero.')) return;
    deck.cards = {};
    log = {};
    saveDeck(); saveLog();
    toast('Progress reset.');
    renderStats(); renderHome();
  });
}

/* ————————————————————————————————————————————————
   事件
   ———————————————————————————————————————————————— */
$$('#modeChips .chip').forEach((c) => c.addEventListener('click', () => {
  $$('#modeChips .chip').forEach((x) => x.classList.toggle('is-on', x === c));
  settings.mode = c.dataset.mode;
  saveSettings();
}));

$('#scopeSelect').addEventListener('change', (e) => {
  settings.scope = e.target.value;
  saveSettings();
  renderHome();
});

$('#startBtn').addEventListener('click', startSession);
$('#showBtn').addEventListener('click', doReveal);
$('#quitBtn').addEventListener('click', () => endSession(false));
$('#againBtn').addEventListener('click', startSession);
$('#homeBtn').addEventListener('click', () => show('home'));
$$('.grade').forEach((b) => b.addEventListener('click', () => grade(+b.dataset.grade)));
$('#playBtn').addEventListener('click', () => current && play(current.item.de, settings.rate, $('#playBtn')));
$('#slowBtn').addEventListener('click', () => current && play(current.item.de, settings.slowRate, $('#slowBtn')));
$('#crawlBtn').addEventListener('click', () => current && play(current.item.de, Math.max(0.25, settings.slowRate - 0.25), $('#crawlBtn')));

document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  if (e.key === 'Escape') {
    if (session) { endSession(false); e.preventDefault(); }
    return;
  }
  if (!$('#viewDrill').classList.contains('is-on') || !current) return;

  if (e.key === ' ' && !typing) {
    e.preventDefault();
    if (!revealed) doReveal();
    else grade(suggested);
    return;
  }
  if (typing) return;

  if (e.key >= '1' && e.key <= '4') { e.preventDefault(); grade(+e.key - 1); return; }
  if (e.key === 'r' || e.key === 'R') { play(current.item.de, settings.rate, $('#playBtn')); return; }
  if (e.key === 's' || e.key === 'S') { play(current.item.de, settings.slowRate, $('#slowBtn')); return; }
  if (e.key === 'm' || e.key === 'M') {
    if ($('#micBtn')) runSpeak();
    else if ($('#shadowBtn')) runShadow();
  }
});

/* 分頁切走就停聲音，回來時不會有半句德文突然冒出來 */
document.addEventListener('visibilitychange', () => { if (document.hidden) stopEverything(); });

/* ————————————————————————————————————————————————
   啟動
   ———————————————————————————————————————————————— */
function init() {
  buildScopeSelect();
  $$('#modeChips .chip').forEach((c) => c.classList.toggle('is-on', c.dataset.mode === settings.mode));
  wireSettings();
  wireData();
  refreshVoices();
  /* Chrome 的語音清單是非同步載入的，第一次取常常是空的 */
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  show('home');
}
init();

/* 自動化測試用的鉤子：只讀，不改狀態 */
window.__peek = () => (current ? current.item.de : null);
window.__state = () => ({ mode: current && current.mode, revealed, remaining: session && session.remaining });
