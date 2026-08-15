// 以純數學（SDF）繪製 App 圖示與選單列圖示，零外部依賴。
// 執行：node scripts/gen-icons.mjs  → 輸出至 src-tauri/icons/
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src-tauri', 'icons');
mkdirSync(OUT, { recursive: true });

/* ———— PNG 編碼 ———— */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function encodePNG(rgba, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ———— SDF 幾何 ———— */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sdCircle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) - r;
function sdRoundBox(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}
function sdEllipseRot(px, py, cx, cy, rx, ry, deg) {
  const a = (deg * Math.PI) / 180;
  const dx = px - cx, dy = py - cy;
  const x = dx * Math.cos(a) + dy * Math.sin(a);
  const y = -dx * Math.sin(a) + dy * Math.cos(a);
  const k = Math.hypot(x / rx, y / ry);
  return (k - 1) * Math.min(rx, ry); // 近似距離，AA 用途足夠
}
const mix = (a, b, t) => a + (b - a) * t;
const over = (dst, src, alpha) => [mix(dst[0], src[0], alpha), mix(dst[1], src[1], alpha), mix(dst[2], src[2], alpha)];

/* ———— App 圖示（Big Sur 圓角方形 + 蕃茄） ———— */
function drawAppIcon(size) {
  const S = size / 1024; // 以 1024 為設計基準
  const buf = Buffer.alloc(size * size * 4);
  const aa = 1.0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / S, py = (y + 0.5) / S;

      // 底：圓角方形（Apple 尺寸規範 ~824/1024，半徑 ~186）
      const dBox = sdRoundBox(px, py, 512, 512, 412, 412, 186) * S;
      const boxA = clamp01(0.5 - dBox / aa);
      if (boxA <= 0) continue;

      const t = py / 1024;
      let rgb = [mix(250, 242, t), mix(247, 238, t), mix(242, 231, t)]; // 暖米白微漸層

      // 蕃茄本體
      const dTomato = sdCircle(px, py, 512, 560, 258) * S;
      if (dTomato < aa) {
        const tt = clamp01((py - 302) / 516);
        const body = [mix(226, 199, tt), mix(106, 74, tt), mix(79, 52, tt)]; // #E26A4F → #C74A34
        rgb = over(rgb, body, clamp01(0.5 - dTomato / aa));
        // 柔和高光
        const dHi = sdEllipseRot(px, py, 420, 462, 96, 62, -28) * S;
        if (dHi < aa) rgb = over(rgb, [238, 148, 124], clamp01(0.5 - dHi / aa) * 0.55);
      }

      // 蒂頭：短梗 + 兩片葉
      const dStem = sdRoundBox(px, py, 512, 288, 14, 34, 12) * S;
      const dLeafL = sdEllipseRot(px, py, 442, 320, 88, 34, 32) * S;
      const dLeafR = sdEllipseRot(px, py, 582, 320, 88, 34, -32) * S;
      const dGreen = Math.min(dStem, dLeafL, dLeafR);
      if (dGreen < aa) {
        const tg = clamp01((py - 254) / 120);
        const leaf = [mix(88, 62, tg), mix(158, 128, tg), mix(102, 78, tg)]; // 葉綠漸層
        rgb = over(rgb, leaf, clamp01(0.5 - dGreen / aa));
      }

      const i = (y * size + x) * 4;
      buf[i] = Math.round(rgb[0]);
      buf[i + 1] = Math.round(rgb[1]);
      buf[i + 2] = Math.round(rgb[2]);
      buf[i + 3] = Math.round(boxA * 255);
    }
  }
  return encodePNG(buf, size, size);
}

/* ———— 選單列圖示（macOS template：黑 + 透明） ———— */
function drawTrayIcon(size) {
  const S = size / 44; // 以 44（22pt@2x）為設計基準
  const buf = Buffer.alloc(size * size * 4);
  const aa = 1.0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / S, py = (y + 0.5) / S;
      // 蕃茄輪廓（環形）+ 蒂葉實心
      const body = sdCircle(px, py, 22, 25.5, 13) * S;
      const ring = Math.abs(body + 1.25 * S) / 1 - 2.5 * S; // 描邊環
      const dStem = sdRoundBox(px, py, 22, 9.5, 1.6, 3.4, 1.4) * S;
      const dLeafL = sdEllipseRot(px, py, 15.5, 12.2, 6.4, 2.6, 30) * S;
      const dLeafR = sdEllipseRot(px, py, 28.5, 12.2, 6.4, 2.6, -30) * S;
      const d = Math.min(ring, dStem, dLeafL, dLeafR);
      const a = clamp01(0.5 - d / aa);
      const i = (y * size + x) * 4;
      buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0;
      buf[i + 3] = Math.round(a * 255);
    }
  }
  return encodePNG(buf, size, size);
}

/* ———— ICNS 打包（PNG-based） ———— */
function makeICNS(entries) {
  // entries: [type, pngBuffer]
  const chunks = entries.map(([type, png]) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  });
  const total = 8 + chunks.reduce((n, c) => n + c.length, 0);
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(total, 4);
  return Buffer.concat([head, ...chunks]);
}

/* ———— ICO 打包（PNG-based，Windows 用） ———— */
function makeICO(pngs) {
  // pngs: [size, buffer]
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const [size, png] of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += png.length;
  }
  return Buffer.concat([head, ...entries, ...pngs.map(([, p]) => p)]);
}

/* ———— 輸出 ———— */
const px = {};
for (const s of [16, 32, 64, 128, 256, 512, 1024]) px[s] = drawAppIcon(s);

writeFileSync(join(OUT, 'icon.png'), px[1024]);
writeFileSync(join(OUT, '32x32.png'), px[32]);
writeFileSync(join(OUT, '128x128.png'), px[128]);
writeFileSync(join(OUT, '128x128@2x.png'), px[256]);
writeFileSync(join(OUT, 'icon.icns'), makeICNS([
  ['icp4', px[16]], ['ic11', px[32]],
  ['icp5', px[32]], ['ic12', px[64]],
  ['ic07', px[128]], ['ic13', px[256]],
  ['ic08', px[256]], ['ic14', px[512]],
  ['ic09', px[512]], ['ic10', px[1024]],
]));
writeFileSync(join(OUT, 'icon.ico'), makeICO([[16, px[16]], [32, px[32]], [64, px[64]], [256, px[256]]]));
writeFileSync(join(OUT, 'tray-icon.png'), drawTrayIcon(22));
writeFileSync(join(OUT, 'tray-icon@2x.png'), drawTrayIcon(44));

console.log('icons written to', OUT);
