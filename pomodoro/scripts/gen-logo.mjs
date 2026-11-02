#!/usr/bin/env node
/* 產生品牌識別：標記（環＋蒂頭）與橫式標準字。
   標記是純幾何，SVG 到哪都一樣；標準字有字體，另外輸出 PNG 避免對方沒裝字體。

   PNG 需要 Playwright 的 Chromium：npx playwright install chromium
   用法（在 pomodoro/ 底下）：npm run logo
*/
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(APP, 'brand');
mkdirSync(OUT, { recursive: true });

/* App 的三個模式色，標記用專注色 */
const ACCENT = '#D0563E';
const LEAF   = '#4E8F5B';
const TRACK_LIGHT = '#E3DDD2';
const TRACK_DARK  = '#3A342C';

/* ———— 標記 ————
   同一個圓同時是蕃茄，也是 App 主畫面那個倒數環：
   淡色軌道跑完整圈，主色弧只跑一部分，缺口留給蒂頭。 */
const CX = 256, CY = 300, R = 150, W = 30;
const P = (deg) => {
  const a = (deg * Math.PI) / 180;
  return `${(CX + R * Math.cos(a)).toFixed(1)} ${(CY + R * Math.sin(a)).toFixed(1)}`;
};
const ARC = (a1, a2) => `M ${P(a1)} A ${R} ${R} 0 ${(a2 - a1) % 360 > 180 ? 1 : 0} 1 ${P(a2)}`;

const CALYX = `
  <path d="M 256 126 L 256 162" stroke="${LEAF}" stroke-width="16" stroke-linecap="round" fill="none"/>
  <path d="M 260 158 C 279 134, 310 127, 333 136 C 326 160, 296 174, 260 164 Z" fill="${LEAF}"/>
  <path d="M 252 158 C 233 134, 202 127, 179 136 C 186 160, 216 174, 252 164 Z" fill="${LEAF}"/>`;

const mark = (track) => `
  <circle cx="${CX}" cy="${CY}" r="${R}" stroke="${track}" stroke-width="${W}" fill="none"/>
  <path d="${ARC(-66, 152)}" stroke="${ACCENT}" stroke-width="${W}" stroke-linecap="round" fill="none"/>
  ${CALYX}`;

const svg = (body, w, h) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" `
  + `role="img" aria-label="Flowmato">${body}\n</svg>\n`;

writeFileSync(join(OUT, 'logo-mark.svg'), svg(mark(TRACK_LIGHT), 512, 512));
writeFileSync(join(OUT, 'logo-mark-dark.svg'), svg(mark(TRACK_DARK), 512, 512));

/* ———— 橫式標準字 ————
   標記縮小放左邊，字放右邊。字體用 Outfit（OFL），沒有就退回系統無襯線。 */
const wordmark = (track, ink) => {
  const s = 0.62; // 標記縮到 62%
  return `
  <g transform="translate(0,26) scale(${s})">${mark(track)}</g>
  <text x="392" y="243" font-family="Outfit, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif"
        font-size="150" font-weight="600" letter-spacing="-2" fill="${ink}">Flowmato</text>`;
};
/* 先用一個寬鬆的畫布，等下量完實際內容再裁緊（字寬取決於字體，不能硬算） */
const WORD = [
  ['logo-wordmark.svg', TRACK_LIGHT, '#26211C'],
  ['logo-wordmark-dark.svg', TRACK_DARK, '#EFEAE2'],
];
for (const [f, track, ink] of WORD) writeFileSync(join(OUT, f), svg(wordmark(track, ink), 1500, 420));

/* ———— PNG ————
   背景透明，放在任何底色上都能用。 */
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
  return null;
}
const chromium = loadChromium();
if (!chromium) {
  console.log('（找不到 playwright，只產生 SVG。要 PNG 請執行：npm i -D playwright && npx playwright install chromium）');
  process.exit(0);
}

const FONT = join(APP, 'scripts/store/Outfit-SemiBold.ttf');
const fontCss = existsSync(FONT)
  ? `@font-face{font-family:Outfit;font-weight:600;src:url(data:font/ttf;base64,${readFileSync(FONT).toString('base64')})}`
  : '';

const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = async (w, h) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  return [ctx, await ctx.newPage()];
};
const load = async (p, file) => {
  await p.setContent(`<style>${fontCss}html,body{margin:0;background:transparent}svg{display:block}</style>`
    + readFileSync(join(OUT, file), 'utf8'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
};

/* 量出標準字實際佔多大，把畫布裁到剛好（字寬由字體決定，硬算會留一大塊空白） */
let box;
{
  const [ctx, p] = await page(1500, 420);
  await load(p, 'logo-wordmark.svg');
  box = await p.evaluate(() => {
    const b = document.querySelector('svg').getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  await ctx.close();
}
const PAD = 24;
const vb = { x: Math.floor(box.x - PAD), y: Math.floor(box.y - PAD),
             w: Math.ceil(box.w + PAD * 2), h: Math.ceil(box.h + PAD * 2) };
for (const [f, track, ink] of WORD) {
  const body = wordmark(track, ink);
  writeFileSync(join(OUT, f),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" `
    + `width="${vb.w}" height="${vb.h}" role="img" aria-label="Flowmato">${body}\n</svg>\n`);
}

const JOBS = [
  ['logo-mark.svg', 'logo-mark-1024.png', 512, 512],
  ['logo-mark-dark.svg', 'logo-mark-dark-1024.png', 512, 512],
  ['logo-wordmark.svg', 'logo-wordmark.png', vb.w, vb.h],
  ['logo-wordmark-dark.svg', 'logo-wordmark-dark.png', vb.w, vb.h],
];
for (const [src, dst, w, h] of JOBS) {
  const [ctx, p] = await page(w, h);
  await load(p, src);
  await p.screenshot({ path: join(OUT, dst), omitBackground: true });
  await ctx.close();
}
await b.close();
console.log('SVG:', ['logo-mark', 'logo-mark-dark', ...WORD.map((w) => w[0].replace('.svg', ''))].join(', '));
console.log('PNG:', JOBS.map((j) => `${j[1]} (${j[2] * 2}×${j[3] * 2})`).join(', '));
