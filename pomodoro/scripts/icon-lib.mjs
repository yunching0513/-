// 共用繪圖工具：以正規化座標（0..1）畫 Flowmato 圖示，任何尺寸皆可輸出。
// 不依賴任何套件——PNG / ICNS / ICO 都自行編碼。
import { deflateSync } from 'node:zlib';

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

/** RGBA buffer → PNG。alpha=false 時輸出不含透明通道（App Store 要求） */
export function encodePNG(rgba, w, h, { alpha = true } = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = alpha ? 6 : 2;
  const ch = alpha ? 4 : 3;
  const raw = Buffer.alloc((w * ch + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * ch + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = row + 1 + x * ch;
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2];
      if (alpha) raw[d + 3] = rgba[s + 3];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ———— SDF 幾何（正規化座標） ———— */
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
  return (Math.hypot(x / rx, y / ry) - 1) * Math.min(rx, ry);
}

const mix = (a, b, t) => a + (b - a) * t;
const over = (dst, src, a) => [mix(dst[0], src[0], a), mix(dst[1], src[1], a), mix(dst[2], src[2], a)];

/* 蕃茄圖形（正規化，視覺中心約 y=0.52） */
const G = {
  tomato: { cx: 0.5, cy: 0.5469, r: 0.2520 },
  hi:     { cx: 0.4102, cy: 0.4512, rx: 0.09375, ry: 0.0605, rot: -28 },
  stem:   { cx: 0.5, cy: 0.28125, hw: 0.01367, hh: 0.03320, r: 0.01172 },
  leafL:  { cx: 0.4316, cy: 0.3125, rx: 0.0859, ry: 0.0332, rot: 32 },
  leafR:  { cx: 0.5684, cy: 0.3125, rx: 0.0859, ry: 0.0332, rot: -32 },
  visualCy: 0.52,
};

/**
 * 畫一張 Flowmato 圖示。
 * @param size      邊長（px）
 * @param bgMode    'rounded' 圓角方形（桌面）｜'full' 滿版（iOS，不可透明）｜'none' 透明（Android 前景層）
 * @param content   蕃茄相對畫布的縮放（1 = 原設計）
 */
export function drawIcon(size, { bgMode = 'rounded', content = 1 } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const aa = 1.0 / size; // 一個像素在正規化空間的寬度

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / size, py = (y + 0.5) / size;

      let bgA = 1, rgb = [250, 247, 242];
      if (bgMode === 'rounded') {
        const d = sdRoundBox(px, py, 0.5, 0.5, 0.4023, 0.4023, 0.1816);
        bgA = clamp01(0.5 - d / aa);
        if (bgA <= 0) { continue; }
      } else if (bgMode === 'none') {
        bgA = 0;
      }
      if (bgMode !== 'none') rgb = [mix(250, 242, py), mix(247, 238, py), mix(242, 231, py)];

      // 以視覺中心為基準縮放並置於畫布中央
      const gx = (px - 0.5) / content + 0.5;
      const gy = (py - 0.5) / content + G.visualCy;
      const ga = aa / content;

      let inkA = 0;

      const dTomato = sdCircle(gx, gy, G.tomato.cx, G.tomato.cy, G.tomato.r);
      if (dTomato < ga) {
        const t = clamp01((gy - 0.295) / 0.504);
        const a = clamp01(0.5 - dTomato / ga);
        rgb = over(rgb, [mix(226, 199, t), mix(106, 74, t), mix(79, 52, t)], a);
        inkA = Math.max(inkA, a);
        const dHi = sdEllipseRot(gx, gy, G.hi.cx, G.hi.cy, G.hi.rx, G.hi.ry, G.hi.rot);
        if (dHi < ga) rgb = over(rgb, [238, 148, 124], clamp01(0.5 - dHi / ga) * 0.55);
      }

      const dGreen = Math.min(
        sdRoundBox(gx, gy, G.stem.cx, G.stem.cy, G.stem.hw, G.stem.hh, G.stem.r),
        sdEllipseRot(gx, gy, G.leafL.cx, G.leafL.cy, G.leafL.rx, G.leafL.ry, G.leafL.rot),
        sdEllipseRot(gx, gy, G.leafR.cx, G.leafR.cy, G.leafR.rx, G.leafR.ry, G.leafR.rot),
      );
      if (dGreen < ga) {
        const t = clamp01((gy - 0.248) / 0.117);
        const a = clamp01(0.5 - dGreen / ga);
        rgb = over(rgb, [mix(88, 62, t), mix(158, 128, t), mix(102, 78, t)], a);
        inkA = Math.max(inkA, a);
      }

      const i = (y * size + x) * 4;
      buf[i] = Math.round(rgb[0]);
      buf[i + 1] = Math.round(rgb[1]);
      buf[i + 2] = Math.round(rgb[2]);
      buf[i + 3] = Math.round(Math.max(bgMode === 'none' ? 0 : bgA, inkA) * 255);
    }
  }
  return buf;
}

/** Android adaptive icon 的背景層：暖米色微漸層 */
export function drawFlatBackground(size) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = (x / size * 0.35 + y / size * 0.65);
      const i = (y * size + x) * 4;
      buf[i] = Math.round(mix(250, 240, t));
      buf[i + 1] = Math.round(mix(247, 235, t));
      buf[i + 2] = Math.round(mix(242, 227, t));
      buf[i + 3] = 255;
    }
  }
  return buf;
}

/** macOS 選單列 template 圖示（純黑 + 透明） */
export function drawTrayIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const S = size / 44, aa = 1.0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / S, py = (y + 0.5) / S;
      const body = sdCircle(px, py, 22, 25.5, 13) * S;
      const ring = Math.abs(body + 1.25 * S) - 2.5 * S;
      const d = Math.min(
        ring,
        sdRoundBox(px, py, 22, 9.5, 1.6, 3.4, 1.4) * S,
        sdEllipseRot(px, py, 15.5, 12.2, 6.4, 2.6, 30) * S,
        sdEllipseRot(px, py, 28.5, 12.2, 6.4, 2.6, -30) * S,
      );
      const i = (y * size + x) * 4;
      buf[i + 3] = Math.round(clamp01(0.5 - d / aa) * 255);
    }
  }
  return buf;
}

/* ———— 容器格式 ———— */
export function makeICNS(entries) {
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

export function makeICO(pngs) {
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

/**
 * Google Play 必填的「功能圖片」1024×500。
 * 刻意不放文字——Play 會在不同版位上裁切，且各語系都得重做一張。
 * 左側是產品圖示，右側是呼應 App 的計時環。
 */
export function drawFeatureGraphic(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  const cx = w * 0.685, cy = h * 0.5;
  const R = h * 0.33, stroke = h * 0.022;
  const START = -Math.PI / 2, SWEEP = Math.PI * 2 * 0.68; // 已走完 68% 的專注段

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      // 暖米色斜向漸層
      const t = clamp01(u * 0.45 + v * 0.55);
      let rgb = [mix(250, 236, t), mix(247, 230, t), mix(242, 221, t)];

      // 計時環
      const dist = Math.hypot(x - cx, y - cy);
      const ring = Math.abs(dist - R) - stroke / 2;
      if (ring < 1.5) {
        let ang = Math.atan2(y - cy, x - cx) - START;
        while (ang < 0) ang += Math.PI * 2;
        const active = ang <= SWEEP;
        const col = active ? [208, 86, 62] : [231, 226, 216];
        rgb = over(rgb, col, clamp01(0.5 - ring / 1.5));
      }

      const i = (y * w + x) * 4;
      buf[i] = Math.round(rgb[0]);
      buf[i + 1] = Math.round(rgb[1]);
      buf[i + 2] = Math.round(rgb[2]);
      buf[i + 3] = 255;
    }
  }

  // 左側疊上圖示本體
  const icon = h * 0.56;
  const ox = Math.round(w * 0.20 - icon / 2), oy = Math.round(cy - icon / 2);
  const badge = drawIcon(Math.round(icon), { bgMode: 'rounded' });
  const n = Math.round(icon);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const s = (y * n + x) * 4;
      const a = badge[s + 3] / 255;
      if (a <= 0) continue;
      const dx = ox + x, dy = oy + y;
      if (dx < 0 || dy < 0 || dx >= w || dy >= h) continue;
      const d = (dy * w + dx) * 4;
      buf[d] = Math.round(mix(buf[d], badge[s], a));
      buf[d + 1] = Math.round(mix(buf[d + 1], badge[s + 1], a));
      buf[d + 2] = Math.round(mix(buf[d + 2], badge[s + 2], a));
    }
  }
  return buf;
}
