#!/usr/bin/env node
/* 把 ui/ 打包成單一 HTML：CSS、JS、音檔全部內嵌。
   給 Artifact 檢視器與「一個檔案就能跑」的離線散布用。

   輸出不含 <!doctype>/<html>/<head>/<body>——Artifact 發佈時會自己包一層，
   多包一次會變成巢狀文件。 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', 'ui');
const out = process.argv[2];
if (!out) { console.error('用法：build-single.mjs <輸出檔>'); process.exit(1); }

const read = (f) => readFileSync(join(UI, f), 'utf8');
const b64 = (f) => readFileSync(join(UI, f)).toString('base64');
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

let html = read('index.html');

// 去掉外層文件骨架，只留 head 內容 + body 內容
html = html
  .replace(/^[\s\S]*?<head>\s*/i, '')
  .replace(/<\/head>\s*<body[^>]*>/i, '')
  .replace(/<\/body>\s*<\/html>\s*$/i, '');

// 樣式與腳本內嵌
html = html.replace(/[ \t]*<link rel="stylesheet" href="style\.css">\n?/, `<style>\n${read('style.css')}\n</style>\n`);
for (const js of ['i18n.js', 'app.js', 'journal.js']) {
  html = html.replace(new RegExp(`[ \\t]*<script src="${js}"></script>\\n?`),
                      `<script>\n${read(js)}\n</script>\n`);
}

// 圖示走 data URI（單檔沒有相對路徑可用）
const icon = `data:image/png;base64,${b64('favicon.png')}`;
html = html.replace(/href="favicon\.png"/g, `href="${icon}"`);

/* 音檔：app.js 用 TRACKS 的 src 去 fetch，改寫成 data URI 後由 dataUriToBuffer 接手。
   三首合起來約 9 MB → base64 後約 12 MB，仍在 Artifact 的 16 MB 上限內。 */
let audio = 0;
for (const key of ['beta', 'alpha', 'theta']) {
  const f = `audio/${key}.mp3`;
  audio += statSync(join(UI, f)).size;
  html = html.replace(`'${f}'`, `'data:audio/mpeg;base64,${b64(f)}'`);
}

writeFileSync(out, html);
console.log(`${out}  ${mb(statSync(out).size)}（音檔原始 ${mb(audio)}）`);

// 沒接好的相對路徑會在檢視器裡靜默失效，寧可在這裡就擋下來
const left = html.match(/(?:src|href)="(?!https?:|data:|#)[^"]+"/g);
if (left) { console.error('還有沒內嵌的外部參照：', left); process.exit(1); }
