// 產生所有平台圖示：桌面（macOS/Windows/Linux）、iOS、Android、商店素材。
// 執行：npm run icons
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawIcon, drawFlatBackground, drawTrayIcon, drawFeatureGraphic, encodePNG, makeICNS, makeICO } from './icon-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = join(ROOT, 'src-tauri', 'icons');
const STORE = join(ROOT, 'store');

const png = (size, opts, alpha = true) => encodePNG(drawIcon(size, opts), size, size, { alpha });
const write = (p, buf) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, buf); };

/* ———— 桌面：圓角方形、外圍透明 ———— */
const desk = {};
for (const s of [16, 32, 64, 128, 256, 512, 1024]) desk[s] = png(s, { bgMode: 'rounded' });

write(join(ICONS, 'icon.png'), desk[1024]);
write(join(ICONS, '32x32.png'), desk[32]);
write(join(ICONS, '128x128.png'), desk[128]);
write(join(ICONS, '128x128@2x.png'), desk[256]);
write(join(ICONS, 'icon.icns'), makeICNS([
  ['icp4', desk[16]], ['ic11', desk[32]],
  ['icp5', desk[32]], ['ic12', desk[64]],
  ['ic07', desk[128]], ['ic13', desk[256]],
  ['ic08', desk[256]], ['ic14', desk[512]],
  ['ic09', desk[512]], ['ic10', desk[1024]],
]));
write(join(ICONS, 'icon.ico'), makeICO([[16, desk[16]], [32, desk[32]], [64, desk[64]], [256, desk[256]]]));
write(join(ICONS, 'tray-icon.png'), encodePNG(drawTrayIcon(22), 22, 22));
write(join(ICONS, 'tray-icon@2x.png'), encodePNG(drawTrayIcon(44), 44, 44));

/* ———— iOS：滿版方形、不得含透明通道、圓角由系統套用 ———— */
rmSync(join(ICONS, 'ios'), { recursive: true, force: true });
const IOS_SET = [
  ['AppIcon-20x20@1x', 20], ['AppIcon-20x20@2x', 40], ['AppIcon-20x20@3x', 60],
  ['AppIcon-29x29@1x', 29], ['AppIcon-29x29@2x', 58], ['AppIcon-29x29@3x', 87],
  ['AppIcon-40x40@1x', 40], ['AppIcon-40x40@2x', 80], ['AppIcon-40x40@3x', 120],
  ['AppIcon-60x60@2x', 120], ['AppIcon-60x60@3x', 180],
  ['AppIcon-76x76@1x', 76], ['AppIcon-76x76@2x', 152],
  ['AppIcon-83.5x83.5@2x', 167],
  ['AppIcon-512@2x', 1024],
];
for (const [name, size] of IOS_SET) {
  write(join(ICONS, 'ios', `${name}.png`), png(size, { bgMode: 'full', content: 1.05 }, false));
}

/* ———— Android：legacy mipmap + adaptive icon 前景／背景層 ———— */
rmSync(join(ICONS, 'android'), { recursive: true, force: true });
// [密度, legacy 邊長, adaptive 圖層邊長(108dp)]
const DENSITIES = [
  ['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432],
];
for (const [dpi, legacy, adaptive] of DENSITIES) {
  const dir = join(ICONS, 'android', `mipmap-${dpi}`);
  write(join(dir, 'ic_launcher.png'), png(legacy, { bgMode: 'rounded' }));
  write(join(dir, 'ic_launcher_round.png'), png(legacy, { bgMode: 'rounded' }));
  // 前景層：透明底，內容縮到 108dp 畫布中央 72dp 的安全區內（外圍會被各家遮罩裁掉）
  write(join(dir, 'ic_launcher_foreground.png'), png(adaptive, { bgMode: 'none', content: 0.75 }));
  write(join(dir, 'ic_launcher_background.png'), encodePNG(drawFlatBackground(adaptive), adaptive, adaptive));
}

/* ———— 商店素材 ———— */
// Play 商店圖示 512×512（32-bit PNG，可含 alpha）
write(join(STORE, 'play-icon-512.png'), png(512, { bgMode: 'full', content: 1.05 }));
// App Store 行銷圖示 1024×1024（不得含透明）
write(join(STORE, 'appstore-icon-1024.png'), png(1024, { bgMode: 'full', content: 1.05 }, false));

// Play 功能圖片 1024×500（必填）
write(join(STORE, 'play-feature-graphic-1024x500.png'), encodePNG(drawFeatureGraphic(1024, 500), 1024, 500));

console.log('圖示已產生：');
console.log('  桌面    →', ICONS);
console.log('  iOS     →', join(ICONS, 'ios'), `(${IOS_SET.length} 個尺寸)`);
console.log('  Android →', join(ICONS, 'android'), `(${DENSITIES.length} 種密度 × 4 檔)`);
console.log('  商店    →', STORE);
