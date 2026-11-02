#!/usr/bin/env node
/* 產生商店截圖：iPhone 6.9 吋（1290×2796）與 iPad 13 吋（2048×2732）。
   兩種尺寸 App Store 都是必填（有支援 iPad 就必須附 iPad 截圖）。

   需要 Playwright 的 Chromium：
     npx playwright install chromium
   或用 CHROME_PATH 指向現成的 Chromium／Chrome。

   用法（在 pomodoro/ 底下）：npm run screenshots
*/
import { mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const APP = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW = join(APP, '.screenshot-cache');
const FRAME = pathToFileURL(join(APP, 'scripts/store/shot-frame.html')).href;

/* 專案的 node_modules 找不到時，再退到全域安裝（CI 或已經全域裝過的機器） */
function loadChromium() {
  for (const id of ['playwright', 'playwright-core']) {
    try { return require(id).chromium; } catch { /* 換下一個 */ }
  }
  try {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    for (const id of ['playwright', 'playwright-core']) {
      try { return createRequire(join(root, 'x.js'))(id).chromium; } catch { /* 換下一個 */ }
    }
  } catch { /* 沒有 npm 也不強求 */ }
  console.error('找不到 playwright，請先執行：npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}
const chromium = loadChromium();

/* 兩種商店尺寸。deviceScaleFactor 乘上去要剛好等於 Apple 要求的像素數。 */
const DEVICES = [
  { id: 'iphone', vw: 430,  vh: 932,  dsf: 3, out: 'store/screenshots',      frame: 'iphone' },
  { id: 'ipad',   vw: 1024, vh: 1366, dsf: 2, out: 'store/screenshots-ipad', frame: 'ipad'   },
];

const seed = () => {
  const k = (off) => { const d = new Date(); d.setDate(d.getDate() - off);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  localStorage.setItem('pomo.tasks.v1', JSON.stringify([
    { id: 't1', text: '完成第三章初稿', done: false, active: true, tomatoes: 2, est: 4, date: k(0), next: '從方法論那一節接下去' },
    { id: 't2', text: '整理下週簡報大綱', done: false, active: false, tomatoes: 0, est: 3, date: k(0), next: '' },
    { id: 't3', text: '回覆三封重要郵件', done: true, active: false, tomatoes: 1, est: 1, date: k(0), doneAt: Date.now(), next: '' },
  ]));
  localStorage.setItem('pomo.stats.v1', JSON.stringify({ date: k(0), count: 4, minutes: 100 }));
};
const asMobile = () => document.documentElement.classList.add('tauri', 'mobile');

const SCENES = [
  { id: '1-focus', dark: false, t: '一次只做一件事', s: '把這回合的目標放在計時器上\n完成的蕃茄自動記在它身上',
    act: async (p) => { await p.click('#playBtn'); await p.waitForTimeout(350); await p.click('#dumpSkip'); await p.waitForTimeout(600);
                        await p.evaluate(() => window.__pomo.fastForward(25 * 60000 * 0.42)); await p.waitForTimeout(400); } },
  { id: '2-dump', dark: false, t: '開始前，先把牽掛放下', s: '寫下來就不必再記著\n工作記憶留給真正要做的事',
    act: async (p) => { await p.click('#playBtn'); await p.waitForTimeout(500);
                        await p.fill('#dumpText', '・要回信給小陳\n・下一步：先把大綱的三個重點列出來');
                        await p.locator('#dumpText').blur(); await p.waitForTimeout(250); } },
  { id: '3-rest', dark: false, t: '休息就好好休息', s: '休息時鎖住畫面，用呼吸引導\n讓注意力真正離開工作',
    act: async (p) => { await p.evaluate(() => { window.__pomo.settings.warmup = false; });
                        await p.click('#skipBtn'); await p.waitForTimeout(1400); } },
  { id: '4-tasks', dark: true, t: '先規劃，再開始', s: '每件事規劃幾顆蕃茄\n做掉幾顆、還欠幾顆一眼看得出來',
    act: async (p) => { await p.click('#taskChip'); await p.waitForTimeout(620); } },
  { id: '5-sound', dark: true, t: '照你的節奏調整', s: '時長、心流輔助、兩層音景\n每一項都能自己開關',
    act: async (p) => { await p.click('#setBtn'); await p.waitForTimeout(560);
                        await p.click('#beatSeg .seg-btn[data-val="alpha"]');
                        await p.click('label:has(#optPad)'); await p.waitForTimeout(450); } },
];

const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'],
});
const errs = [];

for (const dev of DEVICES) {
  const raw = join(RAW, dev.id);
  const out = join(APP, dev.out);
  mkdirSync(raw, { recursive: true });
  mkdirSync(out, { recursive: true });

  // 第一階段：擷取 App 畫面本身
  for (const sc of SCENES) {
    const ctx = await b.newContext({
      viewport: { width: dev.vw, height: dev.vh }, deviceScaleFactor: dev.dsf,
      isMobile: true, hasTouch: true, colorScheme: sc.dark ? 'dark' : 'light',
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(`${dev.id}/${sc.id}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(`${dev.id}/${sc.id}: ${m.text()}`); });
    await p.goto(pathToFileURL(join(APP, 'ui/index.html')).href);
    await p.evaluate(seed); await p.reload();
    await p.evaluate(asMobile); await p.waitForTimeout(450);
    await sc.act(p);
    await p.screenshot({ path: join(raw, `${sc.id}.png`) });
    await ctx.close();
  }

  // 第二階段：套上標語外框
  for (const sc of SCENES) {
    const ctx = await b.newContext({ viewport: { width: dev.vw, height: dev.vh }, deviceScaleFactor: dev.dsf });
    const p = await ctx.newPage();
    const q = new URLSearchParams({
      t: sc.t, s: sc.s, device: dev.frame, dark: sc.dark ? '1' : '0',
      img: pathToFileURL(join(raw, `${sc.id}.png`)).href,
    });
    await p.goto(`${FRAME}?${q}`);
    await p.waitForTimeout(700);
    await p.screenshot({ path: join(out, `${sc.id}.png`) });
    await ctx.close();
  }
  console.log(`${dev.id.padEnd(7)} → ${dev.out}  ${readdirSync(out).filter((f) => f.endsWith('.png')).join(', ')}`);
}

await b.close();
console.log(errs.length ? `\n\x1b[31m${errs.join('\n')}\x1b[0m` : '\nerrors: none');
process.exit(errs.length ? 1 : 0);
