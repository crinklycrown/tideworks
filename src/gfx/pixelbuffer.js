/* =========================================================
   PIXELART-ENGINE – alle Grafiken werden Pixel für Pixel erzeugt
   ========================================================= */
import { DIRS } from '../config.js';
import { clamp, hash2 } from '../util/math.js';
import { esc } from '../util/format.js';

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
export const bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
export const RGB = {};
export function rgb(hex) {
  if (RGB[hex]) return RGB[hex];
  const n = parseInt(hex.slice(1), 16);
  return (RGB[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
export class PB {
  constructor(w, h) { this.w = w; this.h = h; this.p = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; }
  get(x, y) { x = Math.round(x); y = Math.round(y); return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? null : this.p[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  outline(c) {
    const q = this.p.slice(), w = this.w, h = this.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (q[y * w + x]) continue;
      if ((x > 0 && q[y * w + x - 1]) || (x < w - 1 && q[y * w + x + 1]) || (y > 0 && q[(y - 1) * w + x]) || (y < h - 1 && q[(y + 1) * w + x])) this.p[y * w + x] = c;
    }
  }
  blit(src, ox, oy) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.p[y * src.w + x]; if (c) this.set(ox + x, oy + y, c); } }
  toCanvas() {
    const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    const g = cv.getContext('2d'), im = g.createImageData(this.w, this.h);
    this.p.forEach((c, i) => { if (!c) return; const [r, gg, b] = rgb(c); im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255; });
    g.putImageData(im, 0, 0);
    return cv;
  }
}
export const spr = (pb, ax, ay) => ({ cv: pb.toCanvas(), ax: Math.round(ax), ay: Math.round(ay), w: pb.w, h: pb.h, url: null });
export function sprUrl(s) { return s.url || (s.url = s.cv.toDataURL()); }
export function img(s, scale = 2, title = '') {
  return `<img class="px" src="${sprUrl(s)}" width="${Math.round(s.w * scale)}" height="${Math.round(s.h * scale)}" alt="" ${title ? `title="${esc(title)}"` : ''}>`;
}
export function fitScale(s, box = 36) { const f = box / Math.max(s.w, s.h); return f >= 1 ? clamp(Math.floor(f), 1, 3) : Math.max(0.25, Math.floor(f * 8) / 8); }
export function rotPB(pb) { const n = new PB(pb.h, pb.w); for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) n.set(pb.h - 1 - y, x, pb.get(x, y)); return n; }
export function fromTpl(rows, pal, outline) {
  const pb = new PB(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) pb.set(x, y, pal[ch]); }));
  if (outline) pb.outline(outline);
  return pb;
}
export function line(pb, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  for (let i = 0; i <= n; i++) pb.set(x0 + (x1 - x0) * i / (n || 1), y0 + (y1 - y0) * i / (n || 1), c);
}
export function fillBlob(pb, circles, ramp, seed) {
  const pts = [];
  for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) {
    const px = x + 0.5, py = y + 0.5;
    let c = null;
    for (const k of circles) { const dx = px - k.x, dy = py - k.y; if (dx * dx + dy * dy <= k.r * k.r) c = k; }
    if (!c) continue;
    const nx = (px - c.x) / c.r, ny = (py - c.y) / c.r;
    let l = -(nx * 0.55 + ny * 0.85) * 0.8;
    l += (hash2(x >> 1, y >> 1, seed) - 0.5) * 0.45;
    l += (bay(x, y) - 0.5) * 0.3;
    if (nx * nx + ny * ny > 0.72 && ny > 0) l -= 0.25;
    pb.set(x, y, ramp[l > 0.4 ? 0 : l > 0 ? 1 : l > -0.4 ? 2 : 3]);
    pts.push([x, y]);
  }
  return pts;
}
export function shadeEllipse(pb, cx, cy, rx, ry, ramp, rot = 0, dither = 0.25) {
  const co = Math.cos(rot), si = Math.sin(rot);
  for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    const ux = dx * co + dy * si, uy = -dx * si + dy * co;
    const nx = ux / rx, ny = uy / ry, d = nx * nx + ny * ny;
    if (d > 1) continue;
    const l = -(dx / rx * 0.6 + dy / ry * 0.75) * 0.9 + (1 - d) * 0.25 + (bay(x, y) - 0.5) * dither;
    pb.set(x, y, ramp[l > 0.45 ? 0 : l > 0.05 ? 1 : l > -0.35 ? 2 : 3]);
  }
}

// Gebäude-Sprites: Breite = Grundfläche, unten bündig
export const BS = (pb, extra) => Object.assign(spr(pb, 0, pb.h - 1), extra || {});
export function tri(pb, tx, ty, d, col) { const [fx, fy] = DIRS[d], px = -fy, py = fx; for (let k = 0; k < 3; k++) for (let v = -k; v <= k; v++) pb.set(tx - fx * k + px * v, ty - fy * k + py * v, col); }
export function flipV(pb) { const n = new PB(pb.w, pb.h); for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) n.set(x, pb.h - 1 - y, pb.get(x, y)); return n; }
