#!/usr/bin/env node
/* 送審前檢查：把「上傳後才會被 Apple 擋下來」的事情，先在這裡擋掉。
   在 pomodoro/ 目錄下執行 `node scripts/preflight-ios.mjs`。
   有 ✗ 就不要送審；⚠ 是提醒，不一定會被拒。 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => join(ROOT, p);
let bad = 0, warn = 0;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const no = (m) => { bad++; console.log(`  \x1b[31m✗\x1b[0m ${m}`); };
const hm = (m) => { warn++; console.log(`  \x1b[33m⚠\x1b[0m ${m}`); };
const head = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

/* ———— PNG：尺寸與 alpha ————
   App Store 的 1024 行銷圖示不得含 alpha 色版，含了會在上傳階段直接被退。 */
function png(path) {
  const d = readFileSync(path);
  if (d.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  const w = d.readUInt32BE(16), h = d.readUInt32BE(20), colorType = d[25];
  // 調色盤圖可以用 tRNS 帶透明，也算有 alpha
  let tRNS = false;
  for (let i = 8; i + 8 <= d.length;) {
    const len = d.readUInt32BE(i);
    const type = d.subarray(i + 4, i + 8).toString('latin1');
    if (type === 'tRNS') { tRNS = true; break; }
    if (type === 'IDAT' || type === 'IEND') break;
    i += 12 + len;
  }
  return { w, h, alpha: colorType === 4 || colorType === 6 || tRNS };
}

/* ———— 專案設定 ———— */
head('專案設定');
const conf = JSON.parse(readFileSync(R('src-tauri/tauri.conf.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(R('package.json'), 'utf8'));

/^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/i.test(conf.identifier)
  ? ok(`bundle identifier：${conf.identifier}`)
  : no(`bundle identifier 格式怪異：${conf.identifier}`);
/^\d+\.\d+\.\d+$/.test(conf.version)
  ? ok(`版本：${conf.version}（每次上傳都要比上一次大，否則 App Store Connect 會退件）`)
  : no(`版本格式必須是 x.y.z：${conf.version}`);
conf.version === pkg.version
  ? ok('package.json 與 tauri.conf.json 版本一致')
  : hm(`版本不一致：package.json ${pkg.version} / tauri.conf.json ${conf.version}`);
const minIOS = conf.bundle?.iOS?.minimumSystemVersion;
parseFloat(minIOS) >= 14
  ? ok(`最低 iOS 版本：${minIOS}`)
  : hm(`最低 iOS 版本 ${minIOS} 低於 Tauri 預設的 14.0，未經測試`);

/* ———— Info.plist 覆寫 ———— */
head('Info.plist 覆寫（src-tauri/Info.ios.plist）');
if (!existsSync(R('src-tauri/Info.ios.plist'))) {
  no('缺少 Info.ios.plist');
} else {
  const t = readFileSync(R('src-tauri/Info.ios.plist'), 'utf8');
  /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(t)
    ? ok('已宣告 ITSAppUsesNonExemptEncryption=false（免去每次上傳的出口合規問答）')
    : hm('未宣告 ITSAppUsesNonExemptEncryption，每次上傳都要手動回答出口合規');
  /UIInterfaceOrientationPortrait/.test(t) ? ok('已鎖直向') : hm('未鎖定螢幕方向');
}

/* ———— 隱私權資訊清單 ———— */
head('隱私權資訊清單（PrivacyInfo.xcprivacy）');
const PRIV = R('src-tauri/ios/PrivacyInfo.xcprivacy');
if (!existsSync(PRIV)) {
  no('缺少 PrivacyInfo.xcprivacy');
} else {
  const t = readFileSync(PRIV, 'utf8');
  const need = {
    NSPrivacyAccessedAPICategoryFileTimestamp: 'C617.1',
    NSPrivacyAccessedAPICategoryUserDefaults: 'CA92.1',
    NSPrivacyAccessedAPICategorySystemBootTime: '35F9.1',
  };
  for (const [cat, reason] of Object.entries(need)) {
    t.includes(cat) && t.includes(reason)
      ? ok(`${cat.replace('NSPrivacyAccessedAPICategory', '')} → ${reason}`)
      : no(`缺少 ${cat} 或其理由代碼 ${reason}`);
  }
  /<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(t)
    ? ok('NSPrivacyTracking=false')
    : no('NSPrivacyTracking 未宣告為 false');
  hm('這個檔不會被 Tauri 自動打包，要在 Xcode 手動加入 target（見 docs/PUBLISHING.md）');
}

/* ———— 圖示 ———— */
head('圖示');
const ICON_SET = {
  'AppIcon-20x20@1x.png': 20, 'AppIcon-20x20@2x.png': 40, 'AppIcon-20x20@3x.png': 60,
  'AppIcon-29x29@1x.png': 29, 'AppIcon-29x29@2x.png': 58, 'AppIcon-29x29@3x.png': 87,
  'AppIcon-40x40@1x.png': 40, 'AppIcon-40x40@2x.png': 80, 'AppIcon-40x40@3x.png': 120,
  'AppIcon-60x60@2x.png': 120, 'AppIcon-60x60@3x.png': 180,
  'AppIcon-76x76@1x.png': 76, 'AppIcon-76x76@2x.png': 152,
  'AppIcon-83.5x83.5@2x.png': 167, 'AppIcon-512@2x.png': 1024,
};
let iconBad = 0;
for (const [f, size] of Object.entries(ICON_SET)) {
  const p = R(`src-tauri/icons/ios/${f}`);
  if (!existsSync(p)) { no(`缺少 ${f}`); iconBad++; continue; }
  const i = png(p);
  if (!i || i.w !== size || i.h !== size) { no(`${f} 應為 ${size}×${size}，實際 ${i?.w}×${i?.h}`); iconBad++; }
  else if (i.alpha) { no(`${f} 含 alpha 色版，iOS 圖示不得透明`); iconBad++; }
}
if (!iconBad) ok(`iOS 圖示 ${Object.keys(ICON_SET).length} 個尺寸齊全、無 alpha`);

const mk = R('store/appstore-icon-1024.png');
if (!existsSync(mk)) no('缺少 store/appstore-icon-1024.png');
else {
  const i = png(mk);
  i.w === 1024 && i.h === 1024 && !i.alpha
    ? ok('App Store 行銷圖示 1024×1024、無 alpha')
    : no(`App Store 行銷圖示不合格：${i.w}×${i.h}${i.alpha ? '、含 alpha' : ''}`);
}

/* ———— 截圖 ————
   iPhone 6.9 吋必填；有支援 iPad 就得另外附 iPad 13 吋，兩者缺一不可。
   其餘尺寸 Apple 會自動沿用。 */
head('截圖');
const SETS = [
  { dir: 'store/screenshots',      label: 'iPhone 6.9 吋', sizes: [[1290, 2796], [1320, 2868]] },
  { dir: 'store/screenshots-ipad', label: 'iPad 13 吋',    sizes: [[2048, 2732], [2064, 2752]] },
];
for (const set of SETS) {
  const dir = R(set.dir);
  const spec = set.sizes.map(([w, h]) => `${w}×${h}`).join(' 或 ');
  if (!existsSync(dir)) { no(`缺少 ${set.dir}（${set.label}）`); continue; }
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  if (files.length < 1) { no(`${set.label}：沒有任何截圖`); continue; }
  if (files.length > 10) { no(`${set.label}：${files.length} 張，超過 App Store 上限 10 張`); continue; }
  let sBad = 0;
  for (const f of files) {
    const i = png(join(dir, f));
    if (!set.sizes.some(([w, h]) => i.w === w && i.h === h)) {
      no(`${set.dir}/${f} 尺寸 ${i.w}×${i.h}，${set.label}需要 ${spec}`); sBad++;
    }
  }
  if (!sBad) ok(`${set.label} ${files.length} 張，尺寸皆符合（${spec}）`);
}

/* ———— 商店文案長度 ———— */
head('商店文案長度');
const listing = readFileSync(R('store/listing.md'), 'utf8');
const field = (heading) => {
  const i = listing.indexOf(heading);
  if (i < 0) return null;
  const m = listing.slice(i).match(/```\n([\s\S]*?)\n```/);
  return m ? m[1].trim() : null;
};
for (const [heading, limit, label] of [
  ['### 名稱（最多 30 字元）', 30, '名稱'],
  ['### 副標題（最多 30 字元）', 30, '副標題'],
  ['### 關鍵字（最多 100 字元', 100, '關鍵字'],
  ['### 宣傳文字（最多 170 字元', 170, '宣傳文字'],
]) {
  const v = field(heading);
  if (v == null) { no(`listing.md 找不到「${label}」`); continue; }
  v.length <= limit
    ? ok(`${label} ${v.length}/${limit} 字元`)
    : no(`${label} ${v.length} 字元，超過上限 ${limit}`);
}

/* ———— 其他必要檔案 ———— */
head('其他');
existsSync(R('ui/privacy.html'))
  ? ok('隱私權政策頁存在（送審前務必確認公開網址打得開）')
  : no('缺少 ui/privacy.html');
for (const t of ['beta', 'alpha', 'theta']) {
  const p = R(`ui/audio/${t}.mp3`);
  existsSync(p) ? ok(`內建音檔 ${t}.mp3（${(statSync(p).size / 1048576).toFixed(1)} MB）`)
                : no(`缺少 ui/audio/${t}.mp3`);
}

console.log(`\n${bad ? '\x1b[31m' : '\x1b[32m'}${bad} 項阻擋、${warn} 項提醒\x1b[0m`);
process.exit(bad ? 1 : 0);
