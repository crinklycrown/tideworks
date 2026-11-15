/* =========================================================
   CUTSCENE-BAUKASTEN: gemeinsame Zeichenhilfen für Cutscenes, Porträts und das Dialogfenster
   Übernommen aus der Referenz docs/cutscenes/rauch-hinter-dem-nebel.html (Bild für Bild gleich):
     Raster 320×180 (W, H), Balken BAR, Rauschen (hash, vnoise, fbm), Bayer-Dithering (bay), Pixelpuffer PB,
     schattierte Ellipse shadeE, vorgerenderte Ebenen layer/tpl, Licht glow, Regen rain, Balken bars, Abblende black.
   Neu: Porträt-Bausteine (Augen, Brauen, Mund, Wangen, Oberkörper, Bildsatz mit Blinzeln/Mund), Paletten-Hilfen,
   Rückblende in Sepia mit dunklem Rand (sepia).
   Achtung: PB setzt Pixel mit Math.floor (wie die Referenz), der PB der Spiel-Sprites (gfx/pixelbuffer.js) rundet.
   Nur für die Oberfläche (DOM-Canvas), nicht in der Simulation verwenden.
   ========================================================= */
import { BAYER, bay, rgb } from '../gfx/pixelbuffer.js';

export { BAYER, bay, rgb };
export const W = 320, H = 180, BAR = 16;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, u) => a + (b - a) * u;
// weiche Kamerafahrt (ein- und ausschwingend), u außerhalb 0–1 wird begrenzt
export const ease = (u) => (u = clamp(u, 0, 1), u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

/* ---------- Rauschen ---------- */
export function hash(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, s, o) { let r = 0, a = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { r += vnoise(x * f, y * f, s + i * 31) * a; n += a; a *= .5; f *= 2; } return r / n; }

/* ---------- Paletten ---------- */
const hex2 = (n) => n.toString(16).padStart(2, '0');
// Farbe zwischen a und b (u = 0–1), als #rrggbb
export function mix(a, b, u) { const A = rgb(a), B = rgb(b); return '#' + [0, 1, 2].map(i => hex2(Math.round(lerp(A[i], B[i], clamp(u, 0, 1))))).join(''); }
// n Stufen von hell nach dunkel (wie die Rampen der Referenz)
export const ramp = (light, dark, n) => Array.from({ length: n }, (_, i) => mix(light, dark, n > 1 ? i / (n - 1) : 0));
// Stufe aus einer 4er-Rampe nach Helligkeit l (Schwellen der Referenz)
export const pick = (r, l) => r[l > .45 ? 0 : l > .1 ? 1 : l > -.25 ? 2 : 3];

/* ---------- Pixelpuffer: Grafiken werden Pixel für Pixel gesetzt ---------- */
export class PB {
  constructor(w, h) { this.w = w; this.h = h; this.p = new Array(w * h).fill(null); }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = c; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? null : this.p[y * this.w + x]; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  outline(c) {
    const q = this.p.slice(), w = this.w, h = this.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (q[y * w + x]) continue;
      if ((x > 0 && q[y * w + x - 1]) || (x < w - 1 && q[y * w + x + 1]) || (y > 0 && q[(y - 1) * w + x]) || (y < h - 1 && q[(y + 1) * w + x])) this.p[y * w + x] = c;
    }
  }
  canvas() {
    const c = canvas(this.w, this.h);
    const x = c.getContext('2d'), im = x.createImageData(this.w, this.h);
    this.p.forEach((col, i) => { if (!col) return; const [r, gg, b] = rgb(col); im.data[i * 4] = r; im.data[i * 4 + 1] = gg; im.data[i * 4 + 2] = b; im.data[i * 4 + 3] = 255; });
    x.putImageData(im, 0, 0);
    return c;
  }
}
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// schattierte Ellipse (Licht von links oben); opt: clip(x, y) → bool, bias (heller/dunkler), noise + seed (Körnung)
export function shadeE(pb, cx, cy, rx, ry, r, opt = {}) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1) continue;
    if (opt.clip && !opt.clip(x, y)) continue;
    let l = -(nx * .62 + ny * .55) * .9 + (1 - d) * .22 + (bay(x, y) - .5) * .3 + (opt.bias || 0);
    if (opt.noise) l += (hash(x, y, opt.seed || 1) - .5) * opt.noise;
    pb.set(x, y, pick(r, l));
  }
}
// Liegt (x, y) in der Ellipse? (Pixelmitte)
export const inE = (x, y, cx, cy, rx, ry) => Math.pow((x + .5 - cx) / rx, 2) + Math.pow((y + .5 - cy) / ry, 2) <= 1;

/* ---------- Vorgerenderte Ebenen ---------- */
// Ebene w×h aus einer Farbfunktion fn(x, y) → '#rrggbb' | null (durchsichtig)
export function layer(w, h, fn) {
  const c = canvas(w, h);
  const x = c.getContext('2d'), im = x.createImageData(w, h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const col = fn(xx, yy);
    if (!col) continue;
    const i = (yy * w + xx) * 4, [r, gg, b] = rgb(col);
    im.data[i] = r; im.data[i + 1] = gg; im.data[i + 2] = b; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}
// kleine Figur aus Textzeilen (ein Zeichen = ein Pixel, Farbe aus pal), mit Kontur
export function tpl(rows, pal, edge = '#1d140d') {
  const pb = new PB(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) pb.set(x, y, pal[ch]); }));
  if (edge) pb.outline(edge);
  return pb.canvas();
}
// Pixel-Vignette (dunkler Rand aus Bayer-Punkten)
export function vignette(col = '#07090c', k = 1.3, max = .75) {
  return layer(W, H, (x, y) => {
    const e = Math.pow((x - 160) / 175, 2) + Math.pow((y - 90) / 108, 2);
    return bay(x, y) < clamp((e - .5) * k, 0, max) ? col : null;
  });
}

/* ---------- Zeichnen in die Szene ---------- */
// gefüllter Kreis aus waagerechten Pixelzeilen
export function disc(ctx, cx, cy, r, col) {
  ctx.fillStyle = col;
  for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) {
    const half = Math.sqrt(Math.max(0, r * r - y * y));
    if (half < .5) continue;
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), Math.round(half * 2), 1);
  }
}
// warmes Licht (additiv); c = '255,205,110' (Laterne) oder eine andere Farbe als r,g,b
export function glow(ctx, x, y, r, a, c = '255,205,110') {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`);
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
}
// Ebene waagerecht gekachelt (Nebel, Wolken), x verschiebt
export function drawTiled(ctx, img, x, y, alpha) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  const w = img.width; let sx = ((x % w) + w) % w - w;
  for (; sx < W; sx += w) ctx.drawImage(img, Math.round(sx), Math.round(y));
  ctx.globalAlpha = 1;
}
// Regen: n Striche, big = näher (länger, schneller)
export function rain(ctx, time, n, big) {
  ctx.fillStyle = big ? 'rgba(200,212,218,.55)' : 'rgba(178,192,200,.5)';
  for (let i = 0; i < n; i++) {
    const sp = (big ? 260 : 170) + hash(i, 1, 3) * 70;
    const y = ((hash(i, 2, 3) * 220 + time * sp) % 220) - 20;
    const x = ((hash(i, 3, 3) * 380 - y * .3 - time * 12) % 360 + 360) % 360 - 20;
    ctx.fillRect(Math.round(x), Math.round(y), 1, big ? 5 : 3);
  }
}
// schwarze Kinobalken oben und unten (h Pixel)
export function bars(ctx, h) { if (h <= 0) return; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); }
// Abblende: a = 0 (nichts) bis 1 (schwarz)
export function black(ctx, a) { if (a <= 0) return; ctx.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`; ctx.fillRect(0, 0, W, H); }

/* ---------- Rückblende: Sepia mit dunklem Rand ---------- */
export const SEPIA = ['#f3e2bd', '#dcc28f', '#bf9f69', '#9a7a4c', '#735636', '#4c3622', '#2c1e12'];
let sepiaEdge = null;
// färbt das ganze Bild in Sepia-Stufen (mit Dithering), amt 0–1 blendet über; danach dunkler Rand
export function sepia(ctx, amt = 1) {
  if (amt <= 0) return;
  const im = ctx.getImageData(0, 0, W, H), d = im.data, n = SEPIA.length - 1, P = SEPIA.map(rgb);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255;
    const k = clamp(Math.round((1 - l) * n + (bay(x, y) - .5) * .8), 0, n), c = P[k];
    d[i] = lerp(d[i], c[0], amt); d[i + 1] = lerp(d[i + 1], c[1], amt); d[i + 2] = lerp(d[i + 2], c[2], amt);
  }
  ctx.putImageData(im, 0, 0);
  if (!sepiaEdge) sepiaEdge = vignette('#1b120a', 2.2, .95);
  ctx.globalAlpha = amt; ctx.drawImage(sepiaEdge, 0, 0); ctx.globalAlpha = 1;
}

/* =========================================================
   PORTRÄT-BAUSTEINE (64×80, Licht von links oben; Beispiel: gfx/portraits.js, Ole)
   ========================================================= */
export const PW = 64, PH = 80;
// Augenpaar. o = { y (Augenzeile), skin (4er-Rampe), list: [{ x, w, row }] }, row = Pixel der offenen Augenzeile:
//   W = Augenweiß, I = Iris, P = Pupille. Farben: lash (Lidstrich), squint (Lid beim Zukneifen), white, iris, pupil.
// eyes: 0 offen, 1 zusammengekniffen, 2 zu
export function eyePair(pb, o, eyes) {
  const S = o.skin, col = { W: o.white || '#e9e4d6', I: o.iris || '#4f7484', P: o.pupil || '#1d2a30' }, y = o.y;
  for (const e of o.list) pb.rect(e.x - 1, y - 1, e.w + 2, 3, S[2]);   // Augenhöhle
  for (const e of o.list) {
    if (eyes === 0) {
      pb.rect(e.x, y - 1, e.w, 1, o.lash || '#4a2c20');
      [...e.row].forEach((ch, i) => { if (col[ch]) pb.set(e.x + i, y, col[ch]); });
      pb.rect(e.x, y + 1, e.w, 1, S[2]);
    } else if (eyes === 1) {
      pb.rect(e.x, y, e.w, 1, o.squint || '#3a2018'); pb.set(e.x + e.row.indexOf('P'), y, col.P); pb.rect(e.x, y + 1, e.w, 1, S[3]);
    } else pb.rect(e.x, y, e.w, 1, S[3]);
  }
}
// Augenbraue von x0 bis x1 auf Zeile y; innerRight = innen (zur Nase) liegt rechts; lift = 1 zieht sie zusammen (misstrauisch).
// r = [hell, mittel, dunkel] (Haarfarbe)
export function brow(pb, x0, x1, y, innerRight, lift, r) {
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0), inner = innerRight ? t : 1 - t;
    const yy = y + lift + Math.round(inner * (1 + lift));
    pb.set(x, yy, r[1]); pb.set(x, yy - 1, (x % 2) ? r[2] : r[0]); if (hash(x, yy, 2) < .4) pb.set(x, yy - 2, r[2]);
  }
}
// Mund an (x, y), Breite w: offen (sprechen) mit Zähnen und Unterlippe, sonst ein Strich
export function mouth(pb, x, y, w, open, c = {}) {
  if (open) { pb.rect(x, y, w, 2, c.dark || '#2a140f'); pb.rect(x + 1, y, 3, 1, c.teeth || '#d8d0bc'); pb.rect(x + 1, y + 2, w - 2, 1, c.lip || '#8a4a3a'); }
  else pb.rect(x, y, w, 1, c.line || '#5a3024');
}
// gerötete Wangen: geditherte Kreise (Radius 2) an den Punkten pts
export function blush(pb, pts, col) {
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
    if (x * x + y * y > 4 || bay(x + 9, y + 9) >= .5) continue;
    for (const [px, py] of pts) pb.set(px + x, py + y, col);
  }
}
// Oberkörper: unterer Kreisausschnitt (Mitte cx/cy, Radius r) ab Zeile y0, Licht von links; folds(x, y) → dunkle Falte
export function torso(pb, o) {
  for (let y = o.y0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const nx = (x + .5 - o.cx) / o.r, ny = (y + .5 - o.cy) / o.r;
    if (nx * nx + ny * ny > 1) continue;
    let l = -nx * .75 + (bay(x, y) - .5) * .3 + (o.bias != null ? o.bias : .1);
    if (o.folds && o.folds(x, y)) l -= .5;
    pb.set(x, y, pick(o.ramp, l));
  }
}
// Bildsatz eines Porträts: draw(eyes, mouth) → Canvas 64×80; Bilder werden beim ersten Bedarf gezeichnet und behalten
export function portraitSet(draw) {
  const cache = {};
  return (eyes = 0, mouthOpen = 0) => cache[eyes + '' + (mouthOpen ? 1 : 0)] || (cache[eyes + '' + (mouthOpen ? 1 : 0)] = draw(eyes, mouthOpen ? 1 : 0));
}
// Blinzeln (alle 3,7 s kurz zu) und Sprechen (Mund wechselt 11× je s), wie in der Referenz
export const blinkAt = (now) => (now % 3.7) < .13;
export const talkAt = (now) => Math.floor(now * 11) % 2 === 0;
