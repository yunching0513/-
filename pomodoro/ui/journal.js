'use strict';
/* 歷程：每日工作紀錄、月曆檢視、.ics 匯出。
   包在 IIFE 裡，避免與 app.js 的頂層宣告衝突。 */
(function () {
  const TAURI = window.__TAURI__ || null;
  const q = (s) => document.querySelector(s);
  /* 內嵌在 iframe（例如 Artifact 檢視器）時，瀏覽器不會允許頁面觸發下載，
     a[download] 與 blob: 都會靜默失效 —— 這種情況改成把內容攤在畫面上讓使用者複製 */
  const EMBEDDED = (() => { try { return window.top !== window.self; } catch { return true; } })();

  /* ———— 資料層 ———— */
  const KEY = 'pomo.history.v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const write = (h) => { try { localStorage.setItem(KEY, JSON.stringify(h)); } catch { /* 私密模式 */ } };

  let history = read();

  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayK = () => keyOf(new Date());

  const dayOf = (k) => history[k] || { sessions: [] };
  const sumOf = (k) => {
    const s = dayOf(k).sessions;
    return { count: s.length, minutes: s.reduce((n, x) => n + (x.m || 0), 0) };
  };

  /* 舊版只保留「今天」的統計，第一次載入時併進歷程，資料不會憑空消失 */
  (function migrate() {
    try {
      const old = JSON.parse(localStorage.getItem('pomo.stats.v1'));
      if (!old?.date || !old.count) return;
      if (history[old.date]) return;
      history[old.date] = {
        sessions: Array.from({ length: old.count }, () => ({
          s: null, e: null, m: Math.round(old.minutes / old.count), tt: '', legacy: true,
        })),
      };
      write(history);
    } catch { /* 沒有舊資料 */ }
  })();

  /* 專注完成時由 app.js 發事件過來 */
  document.addEventListener('pomo:session', (e) => {
    const d = e.detail;
    const k = keyOf(new Date(d.start));
    if (!history[k]) history[k] = { sessions: [] };
    history[k].sessions.push({ s: d.start, e: d.end, m: d.minutes, tid: d.taskId, tt: d.taskText });
    write(history);
    if (!sheet.hidden) renderAll();
  });

  document.addEventListener('pomo:tasks-changed', () => { if (!sheet.hidden) renderDay(); });

  /* ———— DOM ———— */
  const sheet = q('#journalSheet');
  const grid = q('#calGrid');
  const monthLabel = q('#calMonth');
  const detail = q('#dayDetail');
  const monthSum = q('#calSummary');

  let viewYear, viewMonth, picked;

  const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  /* ———— 月曆 ———— */
  function renderCalendar() {
    monthLabel.textContent = `${viewYear} 年 ${MONTH_NAMES[viewMonth]}`;
    grid.replaceChildren();

    for (const w of WEEK) {
      const h = document.createElement('div');
      h.className = 'cal-dow';
      h.textContent = w;
      grid.appendChild(h);
    }

    const first = new Date(viewYear, viewMonth, 1);
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let i = 0; i < first.getDay(); i++) grid.appendChild(document.createElement('div'));

    let mCount = 0, mMin = 0;
    for (let d = 1; d <= days; d++) {
      const k = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      const { count, minutes } = sumOf(k);
      mCount += count; mMin += minutes;

      const cell = document.createElement('button');
      cell.className = 'cal-day';
      cell.type = 'button';
      if (k === todayK()) cell.classList.add('today');
      if (k === picked) cell.classList.add('picked');
      // 濃度分四級，一眼看出哪幾天真的有做事
      if (count > 0) cell.dataset.level = count >= 8 ? '4' : count >= 5 ? '3' : count >= 3 ? '2' : '1';

      const n = document.createElement('span');
      n.className = 'cal-num';
      n.textContent = d;
      cell.appendChild(n);

      if (count > 0) {
        const b = document.createElement('span');
        b.className = 'cal-count';
        b.textContent = count;
        cell.appendChild(b);
      }
      cell.setAttribute('aria-label', `${viewMonth + 1} 月 ${d} 日，${count} 顆蕃茄`);
      cell.addEventListener('click', () => { picked = k; renderCalendar(); renderDay(); });
      grid.appendChild(cell);
    }

    monthSum.textContent = mCount > 0
      ? `這個月 ${mCount} 顆蕃茄 · 專注 ${Math.round(mMin / 60 * 10) / 10} 小時`
      : '這個月還沒有紀錄';
  }

  /* ———— 當日詳情 ———— */
  const hhmm = (ts) => {
    const d = new Date(ts);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  function renderDay() {
    detail.replaceChildren();
    if (!picked) return;

    const [y, m, d] = picked.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const { count, minutes } = sumOf(picked);

    const head = document.createElement('div');
    head.className = 'day-head';
    const h = document.createElement('h3');
    h.textContent = `${m} 月 ${d} 日 星期${WEEK[dt.getDay()]}`;
    const s = document.createElement('span');
    s.textContent = count > 0 ? `${count} 顆 · ${minutes} 分鐘` : '沒有紀錄';
    head.append(h, s);
    detail.appendChild(head);

    // 這一天的專注段落
    const sessions = dayOf(picked).sessions.filter((x) => x.s);
    if (sessions.length) {
      const ul = document.createElement('ul');
      ul.className = 'sess-list';
      for (const x of sessions.sort((a, b) => a.s - b.s)) {
        const li = document.createElement('li');
        const time = document.createElement('span');
        time.className = 'sess-time';
        time.textContent = `${hhmm(x.s)}–${hhmm(x.e)}`;
        const txt = document.createElement('span');
        txt.className = 'sess-text';
        txt.textContent = x.tt || '專注';
        li.append(time, txt);
        ul.appendChild(li);
      }
      detail.appendChild(ul);
    }

    // 這一天的待辦
    const all = window.__pomo?.tasks?.() || [];
    const dayTasks = all.filter((t) => t.date === picked || (t.doneAt && keyOf(new Date(t.doneAt)) === picked));
    const tl = document.createElement('ul');
    tl.className = 'day-tasks';
    for (const t of dayTasks) {
      const li = document.createElement('li');
      li.className = `day-task${t.done ? ' done' : ''}`;
      const cb = document.createElement('button');
      cb.className = 'task-check';
      cb.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>';
      cb.setAttribute('aria-label', t.done ? '標記為未完成' : '標記為完成');
      cb.addEventListener('click', () => window.toggleDone(t.id));
      const tx = document.createElement('span');
      tx.textContent = t.text;
      li.append(cb, tx);
      if (t.tomatoes > 0) {
        const c = document.createElement('span');
        c.className = 'task-count';
        c.textContent = `🍅 ${t.tomatoes}`;
        li.appendChild(c);
      }
      tl.appendChild(li);
    }
    detail.appendChild(tl);

    // 加一件事到這一天
    const form = document.createElement('form');
    form.className = 'day-add';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 80;
    input.placeholder = `加一件 ${m}/${d} 要做的事…`;
    input.autocomplete = 'off';
    const add = document.createElement('button');
    add.type = 'submit';
    add.className = 'add-btn';
    add.textContent = '＋';
    add.setAttribute('aria-label', '新增');
    form.append(input, add);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (!input.value.trim()) return;
      window.addTask(input.value, picked);
      input.value = '';
      renderDay();
    });
    detail.appendChild(form);

    const ex = document.createElement('button');
    ex.className = 'text-btn';
    ex.textContent = '匯出這一天到日曆';
    ex.disabled = sessions.length === 0;
    ex.addEventListener('click', () => exportICS(sessions, `flowmato-${picked}.ics`));
    detail.appendChild(ex);
  }

  const renderAll = () => { renderCalendar(); renderDay(); };

  /* ———— .ics 產生 ———— */
  const esc = (s) => String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

  /* RFC 5545：每行不得超過 75 octets，續行前置一個空白 */
  function fold(line) {
    const bytes = new TextEncoder().encode(line);
    if (bytes.length <= 75) return line;
    const out = [];
    let cur = '';
    let len = 0;
    for (const ch of line) {
      const n = new TextEncoder().encode(ch).length;
      if (len + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
      cur += ch; len += n;
    }
    if (cur) out.push(cur);
    return out.join('\r\n ');
  }

  const icsTime = (ts) => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  function buildICS(sessions) {
    const now = icsTime(Date.now());
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Flowmato//Focus Log//TW',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Flowmato 專注紀錄',
    ];
    for (const x of sessions) {
      if (!x.s || !x.e) continue;
      lines.push(
        'BEGIN:VEVENT',
        `UID:flowmato-${x.s}-${Math.random().toString(36).slice(2, 8)}@flowmato.app`,
        `DTSTAMP:${now}`,
        `DTSTART:${icsTime(x.s)}`,
        `DTEND:${icsTime(x.e)}`,
        fold(`SUMMARY:🍅 ${esc(x.tt || '專注')}`),
        fold(`DESCRIPTION:${esc(`專注 ${x.m} 分鐘`)}`),
        'CATEGORIES:Flowmato',
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      );
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  async function exportICS(sessions, filename) {
    const list = sessions.filter((x) => x.s && x.e);
    if (!list.length) { toast('這段期間沒有可匯出的紀錄'); return; }
    const ics = buildICS(list);

    // 桌面版：用系統存檔對話框
    if (TAURI?.dialog && TAURI?.fs) {
      try {
        const path = await TAURI.dialog.save({
          defaultPath: filename,
          filters: [{ name: '日曆檔', extensions: ['ics'] }],
        });
        if (!path) return;
        await TAURI.fs.writeTextFile(path, ics);
        toast(`已存檔：${list.length} 筆紀錄`);
        return;
      } catch { /* 落到下面的下載方式 */ }
    }

    // 內嵌環境不能下載，改為顯示內容供複製
    if (EMBEDDED) { showICSText(ics, filename, list.length); return; }

    // 網頁版與其他情況：直接下載
    try {
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast(`已匯出 ${list.length} 筆紀錄`);
    } catch {
      toast('這個環境無法下載檔案');
    }
  }

  /* 內嵌環境的降級：把 .ics 內容攤開讓使用者自己複製存檔 */
  function showICSText(ics, filename, count) {
    let box = q('#icsFallback');
    if (!box) {
      box = document.createElement('section');
      box.id = 'icsFallback';
      box.className = 'overlay';
      box.hidden = true;
      box.innerHTML = `
        <div class="overlay-inner">
          <p class="overlay-eyebrow">匯出到日曆</p>
          <h2 class="overlay-title">複製下面的內容</h2>
          <p class="overlay-sub" id="icsHint"></p>
          <textarea id="icsText" class="dump-text" rows="7" readonly></textarea>
          <div class="overlay-actions">
            <button id="icsCopy" class="pill-btn primary">複製</button>
            <button id="icsClose" class="text-btn">關閉</button>
          </div>
          <p class="task-tip" style="text-align:left">
            貼進純文字編輯器，存成 <b id="icsName"></b>（副檔名要是 .ics），
            再用 Google 日曆的「匯入」或 Apple 行事曆的「檔案 → 輸入」載入。
          </p>
        </div>`;
      document.querySelector('.app').appendChild(box);
      box.querySelector('#icsClose').addEventListener('click', () => {
        box.classList.remove('show');
        setTimeout(() => { box.hidden = true; }, 300);
      });
      box.querySelector('#icsCopy').addEventListener('click', async () => {
        const ta = box.querySelector('#icsText');
        try {
          await navigator.clipboard.writeText(ta.value);
          toast('已複製到剪貼簿');
        } catch {
          ta.select();               // 剪貼簿被擋時退回手動選取
          toast('請按 ⌘C／Ctrl+C 複製');
        }
      });
    }
    box.querySelector('#icsText').value = ics;
    box.querySelector('#icsName').textContent = filename;
    box.querySelector('#icsHint').textContent = `${count} 段專注紀錄。這個畫面裡無法直接下載檔案。`;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('show'));
  }

  /* 匯出範圍 */
  const monthSessions = () => {
    const out = [];
    for (const [k, v] of Object.entries(history)) {
      const [y, m] = k.split('-').map(Number);
      if (y === viewYear && m === viewMonth + 1) out.push(...v.sessions);
    }
    return out;
  };
  const allSessions = () => Object.values(history).flatMap((v) => v.sessions);

  /* ———— 提示 ———— */
  let toastTimer = null;
  function toast(msg) {
    let t = q('#jToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'jToast';
      t.className = 'toast';
      document.querySelector('.app').appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ———— 開關 ———— */
  function open() {
    const now = new Date();
    if (viewYear === undefined) { viewYear = now.getFullYear(); viewMonth = now.getMonth(); }
    if (!picked) picked = todayK();
    history = read();
    renderAll();
    window.openSheet(sheet);
  }

  q('#journalBtn').addEventListener('click', open);
  q('#calPrev').addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    renderCalendar();
  });
  q('#calNext').addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    renderCalendar();
  });
  q('#icsMonth').addEventListener('click', () => exportICS(monthSessions(), `flowmato-${viewYear}-${pad(viewMonth + 1)}.ics`));
  q('#icsAll').addEventListener('click', () => exportICS(allSessions(), 'flowmato-all.ics'));

  document.addEventListener('keydown', (e) => {
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.key === 'j' || e.key === 'J') && sheet.hidden) open();
  });

  /* 測試用 */
  window.__journal = {
    history: () => history,
    buildICS,
    add(k, sessions) { history[k] = { sessions }; write(history); },
    open,
    pick(k) { picked = k; const [y, m] = k.split('-').map(Number); viewYear = y; viewMonth = m - 1; renderAll(); },
  };
})();
