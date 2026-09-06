'use strict';
/* 語言切換。
   字典直接用中文原字串當 key：翻不到就原樣顯示中文，不會冒出空白或 key 名。
   靜態 HTML 不必加任何標記——載入時走一次 DOM 比對字典換掉即可；
   原字串記在 WeakMap 裡，切回中文時才翻得回來。
   帶變數的字串用 {name} 佔位，不用範本字串，否則沒辦法整句翻譯。 */
(function () {
  const EN = {
    /* ——— 主畫面 ——— */
    'Flowmato 心流鐘': 'Flowmato',
    '專注': 'Focus',
    '短休息': 'Short break',
    '長休息': 'Long break',
    '開始': 'Start',
    '暫停': 'Pause',
    '＋ 這回合要完成什麼？': '+ What are you working on?',
    '準備好開始專注了嗎？': 'Ready to start?',
    '今天已完成 {n} 顆蕃茄 · 專注 {m} 分鐘': '{n} pomodoro{s} today · {m} min focused',
    '第 4 輪專注後進入長休息': 'Long break after the 4th round',
    '開始／暫停（空白鍵）': 'Start / Pause (Space)',
    '重設（R）': 'Reset (R)',
    '跳過這一段（S）': 'Skip this segment (S)',
    '專注音訊（A）': 'Focus audio (A)',
    '專注音訊': 'Focus audio',
    '歷程（J）': 'Journal (J)',
    '工作歷程': 'Work journal',
    '釘選在最上層': 'Keep on top',
    '設定（⌘,）': 'Settings (⌘,)',
    '待辦事項（T）': 'Tasks (T)',
    '靜音音景（A）': 'Mute soundscape (A)',
    '開啟音景（A）': 'Turn on soundscape (A)',

    /* ——— 卸載盒 ——— */
    '開始前 · 卸載': 'Before you start · Unload',
    '腦中還掛心著什麼？': "What's still on your mind?",
    '寫下來，工作記憶就不必再替你記著。': 'Write it down, and your working memory can stop holding it.',
    '放下了，開始專注': 'Cleared — start focusing',
    '這次跳過': 'Skip this time',
    '思緒卸載': 'Thought unload',
    '・要回覆的訊息\n・還沒決定的事\n・等一下要做的下一步…':
      '・Messages to reply to\n・Things still undecided\n・The next step after this…',

    /* ——— 休息 ——— */
    '休息 · 讓大腦離線': 'Break · Let your mind go offline',
    '長休息 · 讓大腦離線': 'Long break · Let your mind go offline',
    '吸氣': 'Breathe in',
    '屏住': 'Hold',
    '吐氣': 'Breathe out',
    '別滑手機。看向遠方，或就只是呼吸。': "Don't reach for your phone. Look into the distance, or just breathe.",
    '提前結束休息': 'End break early',
    '休息中': 'On a break',

    /* ——— 收尾 ——— */
    '收尾 · 乾淨切斷': 'Wrap up · Clean cut',
    '收尾': 'Wrap up',
    '完成一顆蕃茄 🍅': 'One pomodoro done 🍅',
    '「{text}」告一段落': '"{text}" — wrapping up',
    '留一句話給下次的你，大腦才會真的放下這件事。':
      'Leave a note for next time — that is how your mind actually lets go.',
    '下次從哪裡接續？': 'Where do you pick up next time?',
    '存檔，休息去': 'Save and take a break',

    /* ——— 通知 ——— */
    '休息結束': 'Break over',
    '回來囉，開始下一輪專注。': 'Back to it — next round.',
    '{note}休息 {m} 分鐘吧。': '{note} Take {m} min.',
    '辛苦了，': 'Nice work.',
    '「{text}」還差 {n} 顆，': '"{text}" needs {n} more.',
    '「{text}」已達規劃的 {n} 顆，': '"{text}" hit its plan of {n}.',
    '「{text}」已超出規劃 {n} 顆，': '"{text}" is {n} over plan.',
    '辛苦了': 'Nice work',

    /* ——— 待辦 ——— */
    '待辦事項': 'Tasks',
    '待辦': 'Tasks',
    '加一件要專注完成的事…': 'Add something to focus on…',
    '新增': 'Add',
    '還沒有待辦。先寫下這回合最重要的那一件。':
      'No tasks yet. Start with the single most important one.',
    '點文字＝設為本回合目標；點第幾個圓點＝規劃幾顆蕃茄，實心的是已經做掉的。這份清單和「歷程」是同一份。':
      "Tap the text to make it this round's goal. Tap the Nth dot to plan N pomodoros — filled dots are done. This list and Journal are the same data.",
    '先前卸下的牽掛': 'Earlier unloaded thoughts',
    '清空': 'Clear',
    '先前未完成': 'Carried over',
    '今天': 'Today',
    '之後': 'Later',
    '還欠 {n} 顆': '{n} left',
    '還欠 {n} 顆 ≈ {h} 小時（含休息）': '{n} left ≈ {h} h incl. breaks',
    ' · 今天已完成 {n} 顆': ' · {n} done today',
    '本回合目標：{text}': 'This round: {text}',
    '（規劃 {n} 顆，已完成 {done} 顆）': ' ({done} of {n} planned)',
    '規劃 {n} 顆蕃茄，已完成 {done} 顆': '{done} of {n} pomodoro{s} planned',
    '尚未規劃蕃茄數': 'No plan set',
    '取消規劃': 'Clear plan',
    '規劃 {n} 顆': 'Plan {n}',
    '標記為未完成': 'Mark as not done',
    '標記為完成': 'Mark as done',
    '已完成': 'Done',
    '設為本回合目標': "Set as this round's goal",
    '刪除': 'Delete',
    '↳ 下次：{text}': '↳ Next: {text}',

    /* ——— 歷程 ——— */
    '歷程': 'Journal',
    '上個月': 'Previous month',
    '下個月': 'Next month',
    '{y} 年 {month}': '{month} {y}',
    '這個月 {n} 顆蕃茄 · 專注 {h} 小時': '{n} pomodoro{s} this month · {h} h focused',
    '這個月還沒有紀錄': 'No records this month',
    '{m} 月 {d} 日，{n} 顆蕃茄': '{month} {d}, {n} pomodoro{s}',
    '{n} 顆 · {m} 分鐘': '{n} pomodoro{s} · {m} min',
    '沒有紀錄': 'No records',
    '{n} 件事': '{n} task{s}',
    ' · 規劃 {n} 顆': ' · {n} planned',
    ' · 實際 {n} 顆': ' · {n} actual',
    ' · 完成 {n} 件': ' · {n} done',
    '其他專注': 'Other focus',
    '專注紀錄': 'Focus log',
    '加一件 {m}/{d} 要做的事…': 'Add something for {m}/{d}…',
    '匯出這一天到日曆': 'Export this day',

    /* ——— 人生天數 ——— */
    '人生': 'Life',
    '人生天數': 'Days lived',
    '填了生日才會顯示，只存在本機': 'Shows once you enter a birthday. Stays on this device.',
    '生日': 'Birthday',
    '在「歷程」頁看已過與剩餘天數': 'See days lived and days left in Journal',
    '想活到': 'Live to',
    '剩餘天數以這個歲數計算': 'Days left are counted to this age',
    '歲': 'yrs',
    '已經活了 {n} 天': "You've lived {n} day{s}",
    '到 {to} 歲還有 {n} 天': '{n} day{s} left to {to}',
    '已經超過 {to} 歲': 'Past {to}',

    /* ——— 匯出 ——— */
    '匯出到日曆': 'Export to calendar',
    '.ics 可匯入 Google／Apple／Outlook': '.ics imports into Google / Apple / Outlook',
    '這個月': 'This month',
    '全部紀錄': 'All records',
    '匯出的檔案每段專注是一個日曆事件，含起訖時間與當時的任務名稱。':
      'Each focus session becomes one calendar event, with its start and end time and the task it belonged to.',
    '這段期間沒有可匯出的紀錄': 'Nothing to export in this range',
    '日曆檔': 'Calendar file',
    '已存檔：{n} 筆紀錄': 'Saved · {n} record{s}',
    '已匯出 {n} 筆紀錄': 'Exported {n} record{s}',
    '這個環境無法下載檔案': "Downloads aren't available here",
    '複製下面的內容': 'Copy the text below',
    '複製': 'Copy',
    '關閉': 'Close',
    '已複製到剪貼簿': 'Copied to clipboard',
    '請按 ⌘C／Ctrl+C 複製': 'Press ⌘C / Ctrl+C to copy',
    '{n} 段專注紀錄。這個畫面裡無法直接下載檔案。':
      "{n} focus session{s}. This view can't download files directly.",
    '貼進純文字編輯器，存成 {name}（副檔名要是 .ics），再用 Google 日曆的「匯入」或 Apple 行事曆的「檔案 → 輸入」載入。':
      'Paste into a plain-text editor and save as {name} (the extension must be .ics), then load it with Import in Google Calendar or File → Import in Apple Calendar.',
    'Flowmato 專注紀錄': 'Flowmato focus log',

    /* ——— 設定 ——— */
    '設定': 'Settings',
    '關閉設定': 'Close settings',
    '關閉面板': 'Close panel',
    '關閉（Esc）': 'Close (Esc)',
    '減少': 'Decrease',
    '增加': 'Increase',
    '專注時長': 'Focus',
    '分': 'min',
    '每 4 輪專注後': 'After every 4 focus rounds',
    '心流輔助': 'Flow aids',
    '開始前先卸載思緒': 'Unload thoughts before starting',
    '清除注意力殘留': 'Clears attention residue',
    '休息時鎖定畫面': 'Lock the screen during breaks',
    '呼吸引導，恢復 DMN': 'Breathing guide, DMN recovery',
    '結束時留下次起點': 'Leave a starting point at the end',
    '乾淨切斷': 'Clean cut',
    '專注音景': 'Soundscape',
    '兩層可疊加，A 鍵一鍵靜音': 'Two stackable layers, A to mute',
    '專注音樂': 'Focus music',
    '會自動循環，播完接回開頭': 'Loops seamlessly',
    '關閉音樂': 'Off',
    '分析': 'Analytical',
    '吸收': 'Absorbing',
    '發散': 'Divergent',
    '和聲鋪底': 'Harmonic bed',
    'ambient 織體，休息時轉大調': 'Ambient texture, turns major on breaks',
    '音量': 'Volume',
    '語言 Language': 'Language',
    '自動＝跟著系統語言': 'Auto follows your system language',
    '自動': 'Auto',
    '提示': 'Alerts',
    '自動開始休息': 'Auto-start breaks',
    '休息後自動開始專注': 'Auto-start focus after breaks',
    '提示音': 'Chime',
    '桌面通知': 'Notifications',

    /* ——— 頁尾 ——— */
    '空白鍵': 'Space',
    '開始／暫停': 'Start / Pause',
    '音訊': 'Audio',
    '重設': 'Reset',
    '跳過': 'Skip',
    '待辦與紀錄只存在這台裝置的瀏覽器，不會上傳':
      'Tasks and records stay in this browser. Nothing is uploaded.',
    '下載 macOS App': 'Download macOS app',
  };

  const MONTHS = {
    zh: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    en: ['January', 'February', 'March', 'April', 'May', 'June',
         'July', 'August', 'September', 'October', 'November', 'December'],
  };
  const MONTHS_SHORT = {
    zh: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  };
  const WEEK = {
    zh: ['日', '一', '二', '三', '四', '五', '六'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };

  const KEY = 'pomo.lang.v1';
  const read = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; } };
  const resolve = (pref) => (pref === 'zh' || pref === 'en' ? pref
    : (/^zh\b|^zh-/i.test(navigator.language || '') ? 'zh' : 'en'));

  let pref = read();
  let lang = resolve(pref);

  function t(zh, vars) {
    let s = (lang === 'en' && EN[zh] !== undefined) ? EN[zh] : zh;
    if (vars) {
      /* 英文的複數：字串裡寫 day{s}，依 n 展開成 '' 或 's'。
         n 可能是已經格式化過的 '13,261'，parse 不出 1 就當複數，剛好對 */
      const v = ('s' in vars) ? vars : { ...vars, s: Number(vars.n) === 1 ? '' : 's' };
      for (const k of Object.keys(v)) s = s.split('{' + k + '}').join(v[k]);
    }
    return s;
  }

  /* 原字串記在節點上，切語言時從原字串重翻，不會翻到已翻過的結果 */
  const origText = new WeakMap();
  const origAttr = new WeakMap();
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1 };

  function applyDOM(root) {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (SKIP[n.parentNode?.nodeName] ? NodeFilter.FILTER_REJECT
        : n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      let src = origText.get(n);
      if (src === undefined) { src = n.nodeValue; origText.set(n, src); }
      /* data-i18n 用來消歧義：同一個中文詞在不同位置要翻成不同英文時，
         由它指定真正的 key（例如音樂選單的「關閉」是 Off，不是 Close） */
      const key = n.parentNode?.dataset?.i18n || src.trim();
      if (EN[key] === undefined) continue;
      n.nodeValue = src.replace(src.trim(), t(key));
    }
    for (const el of (root || document).querySelectorAll('[title], [placeholder], [aria-label]')) {
      let map = origAttr.get(el);
      if (!map) { map = {}; origAttr.set(el, map); }
      for (const a of ATTRS) {
        if (!el.hasAttribute(a)) continue;
        if (map[a] === undefined) map[a] = el.getAttribute(a);
        if (EN[map[a]] !== undefined) el.setAttribute(a, t(map[a]));
      }
    }
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
    document.title = lang === 'en' ? 'Flowmato' : 'Flowmato 心流鐘';
  }

  window.I18N = {
    t,
    get lang() { return lang; },
    get pref() { return pref; },
    months: () => MONTHS[lang],
    monthsShort: () => MONTHS_SHORT[lang],
    week: () => WEEK[lang],
    locale: () => (lang === 'en' ? 'en-US' : 'zh-Hant-TW'),
    apply: applyDOM,
    set(next) {
      pref = next;
      try { localStorage.setItem(KEY, next); } catch { /* 私密模式 */ }
      lang = resolve(pref);
      applyDOM();
      document.dispatchEvent(new CustomEvent('pomo:lang-changed'));
    },
  };
  window.tr = t; // 不叫 t：程式裡區域變數常用 t，會遮蔽掉
})();
