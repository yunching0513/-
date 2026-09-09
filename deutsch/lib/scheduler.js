(function () {
'use strict';

/* ————————————————————————————————————————————————
   反覆訓練的排程器
   ————————————————————————————————————————————————
   兩層循環，缺一不可：

   短程（同一次練習裡）：Pimsleur 的 graduated interval recall。
   答錯的句子不是丟到最後面，而是隔 3 題回來，再隔 8 題、16 題 ——
   間隔一次比一次長，逼你在「快要忘掉」的臨界點取回記憶。
   在臨界點成功取回，記憶才會被強化；太快問等於在看答案。

   長程（跨天）：SM-2（SuperMemo 2）。每張卡帶一個 ease（難度係數），
   答對就把間隔乘上 ease，答錯就打回原形。這是 Anki 的底層演算法。

   兩個依據：
   - Cepeda et al. (2006) Psychological Bulletin 的分散練習後設分析
   - Roediger & Karpicke (2006) Psychological Science 的提取練習效應
   ———————————————————————————————————————————————— */

const GRADE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };

/* 同一次練習裡答錯後，隔幾題再問一次。用完就用最後一個值。 */
const RELEARN_GAPS = [3, 8, 16];
/* 一張新卡要在同一次練習裡連續答對幾次才畢業，進入跨天排程 */
const GRADUATE_AT = 2;

const DAY = 86400000;
const now = () => Date.now();

/* ———— 單張卡的長期狀態 ———— */
function newCard(id) {
  return {
    id,
    reps: 0,        // 成功複習次數
    lapses: 0,      // 忘記次數
    ease: 2.5,      // SM-2 難度係數，越低表示這張卡對你越難
    interval: 0,    // 天
    due: 0,         // 到期時間戳，0 = 還沒學過
    last: 0,
    seen: 0,        // 總作答次數，含答錯
    correct: 0,
  };
}

/* SM-2 本體。回傳更新後的卡，不改動傳進來的物件。 */
function schedule(card, grade, atMs = now()) {
  const c = Object.assign({}, card);
  c.seen += 1;
  c.last = atMs;

  if (grade === GRADE.AGAIN) {
    c.lapses += 1;
    c.reps = 0;
    /* 答錯不重來到零：留 1 天，並把 ease 壓下去。
       全部歸零會讓難卡在隔天塞爆佇列。 */
    c.interval = 1;
    c.ease = Math.max(1.3, c.ease - 0.2);
    c.due = atMs + DAY;
    return c;
  }

  c.correct += 1;
  c.reps += 1;

  /* SM-2 的前兩次是固定間隔，之後才開始乘 ease */
  if (c.reps === 1) c.interval = grade === GRADE.EASY ? 3 : 1;
  else if (c.reps === 2) c.interval = grade === GRADE.EASY ? 7 : 4;
  else {
    const mult = grade === GRADE.HARD ? 1.2 : grade === GRADE.EASY ? c.ease * 1.3 : c.ease;
    c.interval = Math.round(c.interval * mult);
  }

  /* ease 調整：SM-2 原式簡化成三檔 */
  if (grade === GRADE.HARD) c.ease = Math.max(1.3, c.ease - 0.15);
  else if (grade === GRADE.EASY) c.ease = Math.min(3.0, c.ease + 0.15);

  c.interval = Math.max(1, Math.min(c.interval, 365));
  /* ±5% 抖動，免得同一天學的卡永遠黏在一起同一天到期 */
  const jitter = 1 + (Math.random() * 0.1 - 0.05);
  c.due = atMs + Math.round(c.interval * DAY * jitter);
  return c;
}

/* ———— 卡片庫 ———— */
class Deck {
  constructor(cards = {}) { this.cards = cards; }

  card(id) {
    if (!this.cards[id]) this.cards[id] = newCard(id);
    return this.cards[id];
  }

  isNew(id) { return !this.cards[id] || this.cards[id].due === 0; }
  isDue(id, atMs = now()) {
    const c = this.cards[id];
    return !!c && c.due > 0 && c.due <= atMs;
  }

  apply(id, grade, atMs = now()) {
    this.cards[id] = schedule(this.card(id), grade, atMs);
    return this.cards[id];
  }

  /* 熟練度 0–1：拿間隔長度當代理指標，21 天視為記牢了 */
  strength(id) {
    const c = this.cards[id];
    if (!c || c.due === 0) return 0;
    return Math.max(0, Math.min(1, Math.log(1 + c.interval) / Math.log(22)));
  }

  stats(ids, atMs = now()) {
    let fresh = 0, learning = 0, mature = 0, due = 0;
    for (const id of ids) {
      const c = this.cards[id];
      if (!c || c.due === 0) { fresh++; continue; }
      if (c.interval >= 21) mature++; else learning++;
      if (c.due <= atMs) due++;
    }
    return { total: ids.length, fresh, learning, mature, due };
  }
}

/* ———— 一次練習 ————
   佇列裡放的是 { id, passes }。答對就 passes+1，滿 GRADUATE_AT 才離開佇列；
   答錯就把 passes 歸零並依 RELEARN_GAPS 重新插隊。 */
class Session {
  /**
   * @param {Deck} deck
   * @param {string[]} pool   這次可以出的題目 id（已依單元／範圍篩過）
   * @param {object} opts     { size, newLimit }
   */
  constructor(deck, pool, opts = {}) {
    const size = opts.size || 20;
    const newLimit = opts.newLimit == null ? 6 : opts.newLimit;
    const t = now();

    const due = pool.filter((id) => deck.isDue(id, t))
      .sort((a, b) => deck.cards[a].due - deck.cards[b].due);
    const fresh = pool.filter((id) => deck.isNew(id));

    /* 到期的優先，額度沒滿才補新卡；再不夠就抓最快到期的來提前複習 */
    const picked = due.slice(0, Math.max(0, size - Math.min(newLimit, fresh.length)));
    const newOnes = fresh.slice(0, Math.min(newLimit, Math.max(0, size - picked.length)));
    let chosen = picked.concat(newOnes);

    if (chosen.length < size) {
      const rest = pool
        .filter((id) => !chosen.includes(id) && !deck.isNew(id))
        .sort((a, b) => deck.cards[a].due - deck.cards[b].due)
        .slice(0, size - chosen.length);
      chosen = chosen.concat(rest);
    }

    /* 交錯：新舊打散，不要前十題全是新卡（Bjork 的 desirable difficulties） */
    this.queue = shuffle(chosen).map((id) => ({ id, passes: 0, missed: false }));
    this.done = [];
    this.log = [];   // { id, grade, at }
    this.startedAt = t;
    this.plannedTotal = this.queue.length;
  }

  get remaining() { return this.queue.length; }
  get finished() { return this.queue.length === 0; }
  /* 進度用「已畢業卡數 / 總卡數」，不用剩餘題數 —— 答錯會讓題數變多，
     進度條倒退回去會讓人以為自己在退步 */
  get progress() {
    const total = this.plannedTotal || 1;
    return Math.min(1, this.done.length / total);
  }

  peek() { return this.queue[0] || null; }

  /**
   * 記一次作答，回傳這張卡是否畢業。
   * @param {Deck} deck
   * @param {number} grade GRADE.*
   */
  answer(deck, grade) {
    const entry = this.queue.shift();
    if (!entry) return null;

    this.log.push({ id: entry.id, grade, at: now() });
    deck.apply(entry.id, grade);

    if (grade === GRADE.AGAIN) {
      entry.passes = 0;
      entry.missed = true;
      entry.relearn = (entry.relearn || 0) + 1;
      this.reinsert(entry);
      return { graduated: false, entry };
    }

    entry.passes += 1;
    /* 答得很順就不必再問第二次；一般順利要再確認一次 */
    const need = grade === GRADE.EASY ? 1 : GRADUATE_AT;
    if (entry.passes >= need) {
      this.done.push(entry);
      return { graduated: true, entry };
    }
    this.reinsert(entry);
    return { graduated: false, entry };
  }

  /* 依 graduated interval recall 插回佇列：間隔一次比一次長 */
  reinsert(entry) {
    const step = Math.min((entry.relearn || entry.passes || 1) - 1, RELEARN_GAPS.length - 1);
    const gap = RELEARN_GAPS[Math.max(0, step)];
    const at = Math.min(this.queue.length, gap);
    this.queue.splice(at, 0, entry);
  }

  summary() {
    const graded = this.log.length;
    const right = this.log.filter((l) => l.grade !== GRADE.AGAIN).length;
    return {
      cards: this.done.length,
      answers: graded,
      accuracy: graded ? right / graded : 0,
      minutes: Math.max(1, Math.round((now() - this.startedAt) / 60000)),
    };
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

window.NochmalScheduler = { GRADE, Deck, Session, schedule, newCard, shuffle, DAY };
})();
