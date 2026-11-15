/* =========================================================
   CUTSCENE cs_npc_aurel „Der Goldberg“ (Akt 1: Schiff erreicht Aurels Insel)
   Nach docs/STORY.md; ruhiger als dort angegeben (Max' Wunsch: jede Einstellung braucht Zeit).
   Die erste Szene mit Sonne im ganzen Spiel: warm, gold, hell, alles ein bisschen zu perfekt (symmetrisch, sauber, in Reihen).
   Die Wolken reißen auf, der erste Sonnenstrahl fällt auf den Goldberg (0–8 s) · Terrassengärten, weiße Häuser, goldene Banner
   im Wind, Kamera fährt vom Hafen hinauf zum Palast (8–15,5 s) · Aurel mit offenen Armen auf der Treppe, neben ihm seine Fahne
   mit dem Wappen vom Wrack (15,5–23 s) · Großaufnahme: sein Lächeln stockt einen Moment (23–30 s), Abblende bis 31,2 s.
   Danach Dialog aurel_1 vor der Treppe.
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, vnoise, fbm, PB, pick, layer, canvas, rgb, vignette as makeVignette, disc, glow, black } from '../cutscene/kit.js';
import { portrait } from '../gfx/portraits.js';
import { wappen, WAPPEN_SIZE } from '../cutscene/motifs.js';

const T_TERR = 8, T_STAIR = 15.5, T_CLOSE = 23, T_FADE = 30, T_END = 31.2;

/* ---------- Farbpaletten: Sonne, Marmor, Gold (zum ersten Mal warm und hell) ---------- */
const SKY = ['#4f8ed0', '#5f9fd9', '#74b1e0', '#8ec2e5', '#accfe4', '#cfe0dc'];      // oben → Horizont
const CLOUD_D = ['#a3a5aa', '#8d9096', '#777a82', '#62656e'];                         // Wolken vor der Sonne (wie bisher grau)
const CLOUD_L = ['#fffbea', '#f7e9c8', '#dccbb4', '#b9aca6'];                         // Wolken im Licht: weiß, goldener Rand
const SEA = ['#a6dcdc', '#77c2cc', '#55a6c0', '#3f8cb0', '#32749c', '#285e86'];
const MARBLE = ['#fffaf0', '#f3e9d6', '#e0d0b5', '#c0ad91', '#94816a'];
const GOLD = ['#fff1a4', '#f5cd52', '#daa234', '#a8741e', '#704b12'];
const GOLD4 = [GOLD[0], GOLD[1], GOLD[2], GOLD[3]];
const GREEN = ['#c4dd78', '#94c256', '#69a240', '#477c32', '#2e5828'];
const CYP = ['#5c9644', '#3f7636', '#2b562a'];
const LEMON = ['#fff27a', '#f2cf3a'];
const TERRA = ['#f0a474', '#d07a52', '#a2563a'];
const PURPLE = ['#a86cc8', '#7e449e', '#5c2c78', '#3e1c54'];
const SKIN = ['#f7d7ba', '#ebbd9c', '#d49e80', '#a87460'];          // Aurel (wie das Porträt)
const HAIR = ['#dcb47c', '#b88e58', '#8e683a', '#624624'];
const ROBE = ['#fffbf2', '#efe4cf', '#d6c6a8', '#a89878'];
const FLOWER = ['#ff6f8e', '#ffd84a', '#ffffff', '#e8506a', '#c890ff'];
const WIN = '#5a74a8';                                              // Fenster: kühles Blau im Schatten
const EDGE = '#3b2a1f';
const SUN = '255,238,176';

/* ---------- Kleine Helfer ---------- */
function capsule(pb, ax, ay, bx, by, r0, r1, ramp, bias = 0) {
  const vx = bx - ax, vy = by - ay, ll = vx * vx + vy * vy || 1, R = Math.max(r0, r1);
  for (let y = Math.floor(Math.min(ay, by) - R - 1); y <= Math.max(ay, by) + R + 1; y++) for (let x = Math.floor(Math.min(ax, bx) - R - 1); x <= Math.max(ax, bx) + R + 1; x++) {
    const px = x + .5, py = y + .5, u = clamp(((px - ax) * vx + (py - ay) * vy) / ll, 0, 1), r = lerp(r0, r1, u);
    const nx = (px - ax - u * vx) / r, ny = (py - ay - u * vy) / r, d = nx * nx + ny * ny;
    if (d > 1) continue;
    pb.set(x, y, pick(ramp, -(nx * .62 + ny * .55) * .9 + (1 - d) * .22 + (bay(x, y) - .5) * .3 + bias));
  }
}
function ellipse(pb, cx, cy, rx, ry, ramp, bias = 0, clip) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1 || (clip && !clip(x, y))) continue;
    pb.set(x, y, pick(ramp, -(nx * .62 + ny * .55) * .9 + (1 - d) * .22 + (bay(x, y) - .5) * .3 + bias));
  }
}
// Farbe im Wolkenlicht (vor der Sonne): grau, kühl, dunkler
function dullCanvas(src) {
  const w = src.width, h = src.height, c = canvas(w, h), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11;
    d[i] = lerp(d[i], l * .78 + 18, .72) * .8; d[i + 1] = lerp(d[i + 1], l * .8 + 22, .72) * .8; d[i + 2] = lerp(d[i + 2], l * .84 + 32, .72) * .82;
  }
  x.putImageData(im, 0, 0);
  return c;
}
// Überblendung Pixel für Pixel: Pixel mit thr(x, y) < u kommen aus „sun“, sonst aus „dull“ (Licht breitet sich aus)
function dissolve(dull, sun, thr) {
  const w = dull.width, h = dull.height, cv = canvas(w, h), cx = cv.getContext('2d');
  const A = dull.getContext('2d').getImageData(0, 0, w, h).data, B = sun.getContext('2d').getImageData(0, 0, w, h).data;
  const T = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) T[y * w + x] = thr(x, y);
  const im = cx.createImageData(w, h), d = im.data;
  let last = -1;
  return (u) => {
    u = Math.round(clamp(u, 0, 1.01) * 80) / 80;
    if (u === last) return cv;
    last = u;
    for (let i = 0, n = w * h; i < n; i++) { const S = T[i] < u ? B : A, j = i * 4; d[j] = S[j]; d[j + 1] = S[j + 1]; d[j + 2] = S[j + 2]; d[j + 3] = S[j + 3]; }
    cx.putImageData(im, 0, 0);
    return cv;
  };
}

/* =========================================================
   STATISCHE EBENEN (setup, einmal je Spiel)
   ========================================================= */
let L = null;
const HOR = 110, SW1 = 380, SUNX = 214, SUNY = 30;          // Einstellung 1: Horizont, Breite, Sonne (in Himmels-Koordinaten)
const IW = 240, IH = 96, IWL = 88, IC = 120;                 // Insel in der Ferne: Wasserlinie, Mitte
const TW = 340, TH = 360, TC = 170, QY = 322;                // Einstellung 2: Hang, Mitte, Kai
const S3W = 190, S3H = 152, CARPET = [92, 118];              // Einstellung 3: Treppe (2×)
const FLAG = { x: 49, y: 52, w: 28, h: 47 };                 // Fahne an der Querstange (Einstellung 3)
const BANNERS = [], BOATS = [];                              // Banner und Boote am Hang (Einstellung 2)

function setup() {
  if (L) return;
  // ----- Einstellung 1: Himmel mit Sonne, Wolken (grau / im Licht), Insel und Meer (grau / sonnig) -----
  const skyCv = layer(SW1, HOR, (x, y) => {
    const d = Math.hypot(x - SUNX, (y - SUNY) * 1.15);
    if (d < 6.5) return '#fffdf0';
    if (d < 10 && bay(x, y) < (10 - d) / 3.5) return '#fff3c4';
    let l = y / HOR * 5.2 + (bay(x, y) - .5) * .55 + clamp(2.2 - d / 26, 0, 2.2);
    const n = fbm(x / 50, y / 7, 5, 3);
    if (n > .6 && y > 40 && y < HOR - 12) l += .8;                       // feine helle Schleierwolken
    const hill = HOR - 2 - Math.max(0, 5 - Math.abs(x - 40) * .12) * (1 + (vnoise(x / 6, 1, 7) - .5) * .5) - Math.max(0, 3 - Math.abs(x - 350) * .1);
    if (y >= hill && hill < HOR - 2) return (x + y) % 2 ? '#a6c4d4' : '#9dbccd';
    return SKY[clamp(Math.round(l), 0, 5)];
  });
  const clouds = cloudCover();
  const isleSun = buildIsle();
  const isle = dissolve(dullCanvas(isleSun), isleSun, (x, y) => clamp(Math.hypot(x - IC, (y - 20) * 1.3) / 150, 0, 1) * .85 + bay(x, y) * .15);
  const seaSun = layer(W + 40, H - HOR, (x, y) => {
    const f = y / (H - HOR), l = Math.pow(f, .72) * 5 + (bay(x, y) - .5) * .5;
    return SEA[clamp(Math.round(l), 0, 5)];
  });
  const sea = dissolve(dullCanvas(seaSun), seaSun, (x, y) => clamp(Math.abs(x - 190) / 260 + y / 300, 0, 1) * .8 + bay(x, y) * .2);
  // Sonnenstrahlen durch die Lücke (Raster-Punkte)
  const rays = layer(W + 60, H, (x, y) => {
    const dx = x - (SUNX - 10), dy = y - SUNY;
    if (dy < 8) return null;
    const a = Math.atan2(dx, dy);
    if (Math.abs(a) > .62) return null;
    const s = .5 + .5 * Math.sin(a * 34 + 1.3) * Math.sin(a * 13 + .4);
    const v = s * s * clamp(1 - dy / 190, 0, 1) * clamp(1 - Math.abs(a) / .62, 0, 1) * clamp(dy / 30, 0, 1);
    return bay(x, y) < v * .9 ? '#fff6d2' : null;
  });
  // ----- Einstellung 2: der Hang mit Terrassen; Einstellung 3: die Treppe; Großaufnahme -----
  const closeBG = layer(W, H, (x, y) => {
    const n = fbm(x / 70, y / 20, 91, 3), sky = clamp(1 - (x / 230 + y / 150), 0, 1);
    const col = Math.max(0, 1 - Math.abs(x - 38) / 16) + Math.max(0, 1 - Math.abs(x - 286) / 18);
    if (sky > .25 + (bay(x, y) - .5) * .25 && col < .3) return SKY[clamp(Math.round(2.6 + (1 - sky) * 3 + (bay(x, y) - .5) * .6), 0, 5)];
    const l = 1.4 - col * 1.1 + y / H * 1.2 + (n - .5) * 1.2 + (bay(x, y) - .5) * .55;
    return MARBLE[clamp(Math.round(l), 0, 4)];
  });
  L = {
    skyCv, clouds, isle, sea, rays, closeBG,
    hill: buildHill(), stair: buildStair(), flag: buildFlag(), vig: makeVignette('#9c6a30', 1.1, .5),
    aurel: portrait('aurel'), fig: {}
  };
  for (const p of ['rest', 'half', 'open']) for (const f of [0, 1]) L.fig[p + f] = buildAurel(p, f);
}

/* ---------- Einstellung 1: Wolkendecke, die von der Sonne aus aufreißt ---------- */
// Jeder Pixel hat einen Abstand zur Sonne (in die Breite gezogen) minus Wolkendichte; bei Radius R ist alles darunter offen.
// u = Sonne: der Rand an der Lücke leuchtet zuerst (Silberrand), dann die ganze Decke.
const CW = SW1 + 60;
function cloudCover() {
  const w = CW, h = HOR, D = new Float32Array(w * h), N = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x / 34, y / 10, 51, 4), i = y * w + x;
    N[i] = n; D[i] = Math.hypot((x - SUNX - 30) / 1.9, (y - SUNY) * 1.15) / 100 - (n - .5) * 1.25 + Math.max(0, y - h + 26) / 70;
  }
  const cv = canvas(w, h), cx = cv.getContext('2d'), im = cx.createImageData(w, h), d = im.data;
  const DULL = CLOUD_D.map(rgb), LIT = CLOUD_L.map(rgb);
  let last = '';
  return (R, u) => {
    const key = Math.round(R * 300) + '/' + Math.round(u * 60);
    if (key === last) return cv;
    last = key;
    for (let i = 0, n = w * h; i < n; i++) {
      const e = D[i] - R, j = i * 4;
      if (e < 0) { d[j + 3] = 0; continue; }
      const x = i % w, y = (i / w) | 0, b = bay(x, y);
      let c;
      if (b * .3 + e * 1.4 < u) c = LIT[clamp(Math.round(e * 10 + (N[i] - .5) * 1.6 + y / h * .9 + (b - .5) * .5 - .3), 0, 3)];
      else c = DULL[clamp(Math.round((N[i] - .5) * 2.8 + y / h * 1.6 + (b - .5) * .5 + .6 - (e < .03 && u > 0 ? 1 : 0)), 0, 3)];
      d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
    }
    cx.putImageData(im, 0, 0);
    return cv;
  };
}

/* ---------- Einstellung 1: der Goldberg in der Ferne (Terrassen, weiße Häuser, Palast mit goldener Kuppel) ---------- */
function buildIsle() {
  const pb = new PB(IW, IH), top = [], cv = (x) => Math.round(Math.pow((x - IC) / 90, 2) * 9);   // Terrassen biegen sich zu den Seiten
  for (let x = 0; x < IW; x++) {
    const u = (x - IC) / 104;
    let h = Math.abs(u) < 1 ? 70 * Math.pow(Math.cos(u * Math.PI / 2), 1.25) : 0;
    h = Math.min(h, 64);
    top[x] = h < 1 ? 999 : Math.round(IWL - h + (vnoise(x / 5, 1, 3) - .5) * 2.5);
  }
  for (let x = 0; x < IW; x++) for (let y = top[x]; y < IWL; y++) {
    const k = IWL - y, kk = k + cv(x), band = kk % 9, d = y - top[x];
    let c;
    if (k < 4) c = k === 3 ? MARBLE[1] : MARBLE[k < 2 ? 3 : 2];                        // Kaimauer
    else if (band === 0) c = MARBLE[3];
    else if (band === 1) c = (x + (kk >> 3)) % 5 === 0 ? MARBLE[3] : MARBLE[1];         // Stützmauer der Terrasse
    else {
      let l = .4 - (band - 2) * .06 + (bay(x, y) - .5) * .4 - (x - IC) / 200;
      c = pick([GREEN[0], GREEN[1], GREEN[2], GREEN[3]], l);
      if (band === 2 && x % 3 === 0) c = FLOWER[(x / 3 | 0) % 3];                      // Blumenreihen, genau im Takt
      if (band >= 4 && band <= 7 && Math.abs(x - IC) % 6 < 3 && (kk / 9 | 0) % 2 && hash(Math.abs(x - IC) / 6 | 0, kk / 9 | 0, 4) < .5) c = band === 4 ? GREEN[3] : GREEN[band < 6 ? 2 : 1];   // Bäumchen in Reihen
      if (band >= 3 && band <= 8 && Math.abs(x - IC) % 11 === 5 && !((kk / 9 | 0) % 2)) c = CYP[band > 6 ? 0 : 1];     // Zypressen
    }
    if (d < 1) c = GREEN[0];
    pb.set(x, y, c);
  }
  // Häuser: weiße Würfel, symmetrisch zur Treppe, goldene Kuppeln und Ziegeldächer im Wechsel
  for (let j = 1; j < 7; j++) for (let n = 0; n < 5; n++) {
    if (hash(j, n, 12) < .45) continue;
    for (const s of [-1, 1]) {
      const x = IC + s * (9 + n * 15 + (j % 2) * 7) - (s < 0 ? 6 : 0), base = IWL - 9 * j + cv(x + 3) - 1;
      if (top[x] > base - 8 || top[x + 6] > base - 8) continue;
      pb.rect(x, base - 5, 6, 5, MARBLE[0]); pb.rect(x + 5, base - 5, 1, 5, MARBLE[2]);
      pb.set(x + 3, base - 3, WIN); pb.rect(x + 1, base - 2, 1, 2, '#7a5a48');
      if ((n + j) % 3 === 0) { pb.rect(x + 1, base - 6, 4, 1, GOLD[1]); pb.rect(x + 2, base - 7, 2, 1, GOLD[0]); }
      else pb.rect(x, base - 6, 6, 1, (n + j) % 3 === 1 ? TERRA[1] : MARBLE[1]);
    }
  }
  // Treppe in der Mitte, vom Kai bis zum Palast
  for (let y = IWL - 64; y < IWL - 2; y++) for (let x = IC - 2; x < IC + 3; x++) pb.set(x, y, y % 2 ? MARBLE[0] : MARBLE[2]);
  for (let y = IWL - 64; y < IWL - 2; y++) pb.set(IC, y, PURPLE[1]);
  // Palast auf dem Gipfel: Säulenfront, goldene Kuppel, zwei Türmchen
  const PT = IWL - 64;
  for (let y = PT - 10; y < PT; y++) for (let x = IC - 17; x <= IC + 17; x++) pb.set(x, y, (x - IC) % 3 === 0 ? MARBLE[2] : x > IC + 12 ? MARBLE[1] : MARBLE[0]);
  pb.rect(IC - 18, PT - 11, 37, 1, GOLD[2]);
  for (let y = PT - 19; y < PT - 10; y++) for (let x = IC - 8; x <= IC + 8; x++) {
    const nx = (x + .5 - IC) / 8.5, ny = (y + .5 - (PT - 10)) / 9;
    if (nx * nx + ny * ny > 1) continue;
    pb.set(x, y, pick(GOLD4, -(nx * .7 + ny * .5) + (bay(x, y) - .5) * .3));
  }
  pb.rect(IC, PT - 23, 1, 4, GOLD[3]); pb.set(IC, PT - 24, GOLD[0]);
  for (const s of [-1, 1]) { pb.rect(IC + s * 14 - 1, PT - 15, 3, 5, MARBLE[s < 0 ? 0 : 1]); pb.rect(IC + s * 14 - 1, PT - 16, 3, 1, GOLD[1]); pb.set(IC + s * 14, PT - 17, GOLD[0]); }
  pb.outline('#4a3a30');
  return pb.canvas();
}

/* ---------- Einstellung 2: der Hang in einfacher Pixelgröße (Kai unten, Palast oben) ---------- */
const mt = (x) => 82 + Math.pow((x - TC) / 170, 2) * 170;                        // Umriss des Bergs
const wallY = (k, x) => QY - 8 - k * 24 + Math.round(Math.pow((x - TC) / 170, 2) * 22);   // Oberkante der Stützmauer k
function buildHill() {
  const pb = new PB(TW, TH);
  // Himmel: klar, oben links heller (Sonne), eine kleine Wolke
  for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
    let l = 1.2 + y / 220 * 3 + (bay(x, y) - .5) * .55 - clamp(1.6 - Math.hypot(x, y) / 120, 0, 1.6) * -1;
    const n = fbm(x / 40, y / 9, 17, 3);
    if (n > .62 && y > 30 && y < 120) l += 1.5;
    pb.set(x, y, SKY[clamp(Math.round(l), 0, 5)]);
  }
  // Berg: Stützmauern aus Marmorquadern, Gärten dazwischen
  for (let x = 0; x < TW; x++) for (let y = Math.ceil(mt(x)); y < QY; y++) {
    let c = null;
    for (let k = 0; k < 11; k++) {
      const wy = wallY(k, x);
      if (y >= wy && y < wy + 6) {
        const r = y - wy, off = (r < 3 ? 0 : 5) + k * 3;
        c = r === 0 ? MARBLE[0] : (x + off) % 10 === 0 || r === 3 ? MARBLE[3] : r < 3 ? MARBLE[1] : MARBLE[2];
        break;
      }
    }
    if (!c) {
      const l = .2 + (bay(x, y) - .5) * .45 + (fbm(x / 9, y / 5, 23, 2) - .5) * .6 - (x - TC) / 400;
      c = pick([GREEN[1], GREEN[2], GREEN[3], GREEN[4]], l);
    }
    if (y - mt(x) < 1.5) c = GREEN[0];
    pb.set(x, y, c);
  }
  // Kai und Wasser
  for (let y = QY; y < QY + 8; y++) for (let x = 0; x < TW; x++) pb.set(x, y, y === QY ? MARBLE[0] : (x + (y > QY + 3 ? 6 : 0)) % 12 === 0 || y === QY + 4 ? MARBLE[3] : MARBLE[y < QY + 4 ? 1 : 2]);
  for (let y = QY + 8; y < TH; y++) for (let x = 0; x < TW; x++) pb.set(x, y, SEA[clamp(Math.round(1 + (y - QY - 8) / 9 + (bay(x, y) - .5) * .6), 0, 5)]);
  // Gegenstände je Terrasse, oben (fern) zuerst; alles symmetrisch zur Treppe
  const okAt = (x, gy, h) => x > 2 && x < TW - 3 && gy - h > mt(x) + 2;
  const lemon = (x, gy) => {
    pb.rect(x, gy - 4, 1, 4, '#7a5a3a');
    ellipse(pb, x + .5, gy - 8, 4.6, 4.2, [GREEN[0], GREEN[1], GREEN[2], GREEN[3]], .1);
    for (let i = 0; i < 6; i++) pb.set(x - 3 + Math.floor(hash(i, x, 5) * 7), gy - 11 + Math.floor(hash(i, x, 6) * 6), LEMON[i % 2]);
    pb.rect(x - 2, gy - 1, 5, 2, TERRA[1]); pb.rect(x - 2, gy - 1, 5, 1, TERRA[0]);
  };
  const cypress = (x, gy) => ellipse(pb, x + .5, gy - 9, 2.6, 9.5, CYP.concat(CYP[2]), .1);
  const flowers = (x0, x1, gy) => { for (let x = x0; x <= x1; x++) { pb.set(x, gy - 1, GREEN[3]); if (x % 2 === 0) pb.set(x, gy - 2, FLOWER[(x >> 1) % 4]); } };
  const vines = (x0, x1, gy) => { for (let x = x0; x <= x1; x += 3) { pb.rect(x, gy - 5, 1, 5, '#8a6a46'); pb.set(x - 1, gy - 4, GREEN[1]); pb.set(x + 1, gy - 3, GREEN[2]); pb.set(x, gy - 6, GREEN[1]); pb.set(x - 1, gy - 2, '#8a4aa0'); } };
  const house = (x, gy, w, h, roof) => {
    const x0 = Math.round(x - w / 2);
    for (let y = gy - h; y < gy; y++) for (let i = 0; i < w; i++) pb.set(x0 + i, y, i >= w - 3 ? MARBLE[2] : bay(x0 + i, y) < .1 ? MARBLE[1] : MARBLE[0]);
    pb.rect(x0 + w - 3, gy - h, 1, h, MARBLE[3]);
    // Tür mit Bogen, Fenster mit blauem Schatten, Blumenkasten
    const dx = x0 + 3; pb.rect(dx, gy - 6, 3, 6, '#8a5a3a'); pb.set(dx + 1, gy - 7, '#8a5a3a'); pb.set(dx, gy - 6, MARBLE[0]); pb.set(dx + 2, gy - 6, MARBLE[0]);
    for (let wx = x0 + 8; wx < x0 + w - 4; wx += 5) {
      pb.rect(wx, gy - h + 4, 2, 3, WIN); pb.set(wx, gy - h + 4, '#8ea6cc');
      pb.rect(wx - 1, gy - h + 7, 4, 1, TERRA[2]); pb.set(wx - 1, gy - h + 6, FLOWER[0]); pb.set(wx + 2, gy - h + 6, FLOWER[3]);
    }
    if (roof === 'dome') {
      pb.rect(x0 - 1, gy - h - 1, w + 2, 1, MARBLE[1]);
      ellipse(pb, x0 + w / 2 - 1, gy - h - 1, Math.min(6, w / 2 - 2), 5, GOLD4, .15, (xx, yy) => yy < gy - h - 1);
      pb.set(Math.round(x0 + w / 2 - 1), gy - h - 7, GOLD[0]);
    } else if (roof === 'tile') {
      for (let k = 0; k < 4; k++) for (let i = -1 + k; i <= w - k; i++) pb.set(x0 + i, gy - h - 1 - k, k === 0 ? TERRA[2] : (i + k) % 3 === 0 ? TERRA[2] : i < w / 2 ? TERRA[0] : TERRA[1]);
    } else { pb.rect(x0 - 1, gy - h - 2, w + 2, 2, MARBLE[1]); pb.rect(x0 - 1, gy - h - 2, w + 2, 1, MARBLE[0]); for (let i = 0; i < w; i += 4) pb.set(x0 + i, gy - h - 3, GOLD[1]); }
  };
  for (let k = 10; k >= 0; k--) {
    const gy = (x) => wallY(k, x);
    const kind = k % 3;
    for (const s of [-1, 1]) {
      const at = (d) => TC + s * d;
      if (kind === 0) {
        for (const d of [44, 124]) if (okAt(at(d), gy(at(d)), 22)) house(at(d), gy(at(d)), 22, 14, (d + k) % 2 ? 'dome' : 'tile');
        for (const d of [22, 84, 104, 150]) if (okAt(at(d), gy(at(d)), 14)) lemon(at(d), gy(at(d)));
      } else if (kind === 1) {
        for (let d = 26; d < 170; d += 22) if (okAt(at(d), gy(at(d)), 20)) cypress(at(d), gy(at(d)));
        for (let d = 32; d < 160; d += 22) { const a = at(d), b = at(d + 12); if (okAt(Math.min(a, b), gy(a), 4) && okAt(Math.max(a, b), gy(b), 4)) flowers(Math.min(a, b), Math.max(a, b), Math.round((gy(a) + gy(b)) / 2)); }
      } else {
        for (const d of [40, 100]) if (okAt(at(d), gy(at(d)), 14)) lemon(at(d), gy(at(d)));
        for (const d of [54, 116]) { const a = at(d), b = at(d + 30); if (okAt(Math.min(a, b), gy(a), 8) && okAt(Math.max(a, b), gy(b), 8)) vines(Math.min(a, b), Math.max(a, b), Math.round((gy(a) + gy(b)) / 2)); }
        if (okAt(at(150), gy(at(150)), 22)) house(at(150), gy(at(150)), 20, 13, 'flat');
      }
      if (k % 2 === 1 && okAt(at(16), gy(at(16)), 24)) BANNERS.push([at(16) + (s < 0 ? 0 : 0), gy(at(16))]);
    }
  }
  // Große Treppe mit purpurnem Läufer, Pfosten mit Goldkugeln an jeder Mauer
  const PB_Y = 92;                                                  // Fuß des Palasts
  for (let y = PB_Y; y < QY + 1; y++) for (let x = TC - 12; x <= TC + 12; x++) {
    const r = (y - PB_Y) % 4, edge = x === TC - 12 || x === TC + 12;
    let c = edge ? MARBLE[3] : r === 0 ? MARBLE[0] : r === 3 ? MARBLE[3] : x > TC + 6 ? MARBLE[2] : MARBLE[1];
    if (Math.abs(x - TC) <= 3 && !edge) c = Math.abs(x - TC) === 3 ? GOLD[2] : r === 0 ? PURPLE[0] : r === 3 ? PURPLE[3] : PURPLE[1];
    pb.set(x, y, c);
  }
  for (let k = 0; k < 10; k++) for (const s of [-1, 1]) {
    const x = TC + s * 13, y = wallY(k, x);
    if (y < PB_Y) continue;
    pb.rect(x - 1, y - 5, 3, 6, MARBLE[1]); pb.set(x + 1, y - 5, MARBLE[3]); pb.rect(x - 1, y - 7, 3, 2, GOLD[1]); pb.set(x - 1, y - 7, GOLD[0]);
  }
  // Palast: Säulenfront, Gesims mit Goldfries, Tambour und goldene Kuppel, zwei Türmchen
  const PX0 = TC - 44, PX1 = TC + 44, PT = PB_Y - 28;
  for (let y = PT; y < PB_Y; y++) for (let x = PX0; x <= PX1; x++) {
    const cx = (x - PX0) % 10;
    let c = cx === 0 || cx === 1 ? MARBLE[0] : cx === 2 ? MARBLE[2] : cx === 9 ? MARBLE[1] : x > PX1 - 10 ? MARBLE[2] : MARBLE[3];
    if (y < PT + 3) c = y === PT ? GOLD[0] : y === PT + 1 ? GOLD[2] : MARBLE[1];
    if (y > PB_Y - 4) c = y === PB_Y - 3 ? MARBLE[0] : MARBLE[2];
    if (cx > 3 && cx < 8 && y > PT + 9 && y < PT + 18) c = y === PT + 10 ? '#8ea6cc' : WIN;
    if (cx > 3 && cx < 8 && y > PB_Y - 12 && y <= PB_Y - 4 && Math.abs(x - TC) < 8) c = '#6a4a3a';
    pb.set(x, y, c);
  }
  for (let y = PT - 8; y < PT; y++) for (let x = TC - 16; x <= TC + 16; x++) pb.set(x, y, (x - TC) % 4 === 0 ? MARBLE[2] : x > TC + 10 ? MARBLE[1] : MARBLE[0]);
  pb.rect(TC - 17, PT - 9, 35, 1, GOLD[1]);
  ellipse(pb, TC, PT - 9, 17, 16, GOLD4, .15, (x, y) => y < PT - 9);
  for (let y = PT - 25; y < PT - 9; y++) { const x = Math.round(TC - 9 + (y - PT + 25) * .1); if (pb.get(x, y)) pb.set(x, y, GOLD[0]); }
  pb.rect(TC - 1, PT - 30, 3, 5, MARBLE[1]); pb.rect(TC - 1, PT - 31, 3, 1, GOLD[1]); pb.rect(TC, PT - 46, 1, 15, GOLD[3]); pb.set(TC, PT - 47, GOLD[0]);
  BANNERS.push([TC, PT - 31, 'big']);
  for (const s of [-1, 1]) {
    const tx = TC + s * 38;
    for (let y = PT - 14; y < PT; y++) for (let x = tx - 4; x <= tx + 4; x++) pb.set(x, y, x === tx + 4 ? MARBLE[3] : x > tx + 1 ? MARBLE[1] : MARBLE[0]);
    pb.rect(tx - 1, PT - 10, 2, 4, WIN);
    ellipse(pb, tx, PT - 14, 5, 5, GOLD4, .1, (x, y) => y < PT - 14);
    pb.set(tx, PT - 20, GOLD[0]);
  }
  // Zwei Boote mit goldenen Segeln am Kai
  for (const bx of [44, 292]) {
    const wy = QY + 9;
    for (let y = wy - 3; y < wy + 1; y++) for (let x = bx - 10 + (wy - y); x <= bx + 10 - (wy - y) * .5; x++) pb.set(x, y, y === wy - 3 ? MARBLE[0] : y === wy ? '#6a5a4a' : MARBLE[1]);
    pb.rect(bx, wy - 16, 1, 13, '#7a5a3a');
    for (let y = wy - 15; y < wy - 4; y++) for (let x = bx + 1; x <= bx + 1 + Math.round((y - wy + 15) * .7); x++) pb.set(x, y, x === bx + 1 ? GOLD[2] : (x + y) % 5 === 0 ? GOLD[2] : GOLD[1]);
    BOATS.push([bx, wy]);
  }
  pb.outline(EDGE);
  return pb.canvas();
}

/* ---------- Einstellung 3: die Treppe vor dem Palast (doppelte Pixelgröße) ---------- */
const LAND = 96, STEP = 6, STAIR_TOP = 102;                 // Treppenabsatz, Stufenhöhe
function buildStair() {
  const pb = new PB(S3W, S3H);
  // Himmel (Sonne oben links), weit hinten das Meer
  for (let y = 0; y < LAND; y++) for (let x = 0; x < S3W; x++) {
    let c;
    if (y >= 80) c = SEA[clamp(Math.round((y - 80) / 4 + (bay(x, y) - .5) * .6), 0, 3)];
    else {
      let l = 1 + y / 80 * 3.4 + (bay(x, y) - .5) * .55 + clamp(1.4 - Math.hypot(x, y) / 60, 0, 1.4);
      if (fbm(x / 30, y / 7, 33, 3) > .63 && y > 14 && y < 60) l += 1.4;
      c = SKY[clamp(Math.round(l), 0, 5)];
    }
    pb.set(x, y, c);
  }
  // Gebälk mit Goldfries über dem Bogengang
  for (let y = 30; y < 40; y++) for (let x = 0; x < S3W; x++) pb.set(x, y, y === 30 ? MARBLE[0] : y === 34 ? GOLD[1] : y === 35 ? GOLD[3] : y === 39 ? MARBLE[3] : y < 34 ? MARBLE[1] : (x % 6 === 0 ? MARBLE[2] : MARBLE[1]));
  // Säulen (links und rechts, die Mitte bleibt offen: Himmel hinter der Fahne und hinter Aurel)
  for (const cx of [10, 30, 140, 162, 184]) for (let y = 40; y < LAND - 6; y++) for (let x = cx - 4; x <= cx + 4; x++) {
    const u = (x - cx) / 4.5;
    let c = pick([MARBLE[0], MARBLE[1], MARBLE[2], MARBLE[3]], -u * 1.1 + .25 + (bay(x, y) - .5) * .3);
    if (y < 43) c = y === 40 ? GOLD[0] : y === 41 ? GOLD[1] : GOLD[3];
    if ((x - cx + 9) % 3 === 0 && y > 44 && Math.abs(u) < .8) c = MARBLE[Math.min(4, MARBLE.indexOf(c) + 1)];
    pb.set(x, y, c);
  }
  // Brüstung mit Balustern hinter dem Absatz
  for (let y = LAND - 8; y < LAND; y++) for (let x = 0; x < S3W; x++) {
    let c = null;
    if (y < LAND - 6) c = y === LAND - 8 ? MARBLE[0] : MARBLE[2];
    else { const bx = x % 5; c = bx === 0 || bx === 4 ? null : bx === 1 ? MARBLE[0] : bx === 2 ? MARBLE[1] : MARBLE[3]; if (y === LAND - 1) c = MARBLE[3]; }
    if (c) pb.set(x, y, c);
  }
  // Absatz und Stufen (Trittfläche hell, Setzstufe im Schatten), Läufer in Purpur mit Goldkante
  for (let y = LAND; y < S3H; y++) for (let x = 0; x < S3W; x++) {
    let c;
    if (y < STAIR_TOP) c = (x + (y > LAND + 2 ? 4 : 0)) % 16 === 0 ? MARBLE[2] : y === LAND ? MARBLE[0] : MARBLE[1];
    else {
      const r = (y - STAIR_TOP) % STEP;
      c = r === 0 ? MARBLE[0] : r === 1 ? MARBLE[1] : r === STEP - 1 ? MARBLE[4] : bay(x, y) < .2 ? MARBLE[3] : MARBLE[2];
    }
    if (x >= CARPET[0] && x <= CARPET[1]) {
      const r = y < STAIR_TOP ? 1 : (y - STAIR_TOP) % STEP, e = x === CARPET[0] || x === CARPET[1];
      c = e ? (r === STEP - 1 ? GOLD[3] : GOLD[1]) : r === 0 ? PURPLE[0] : r === 1 ? PURPLE[1] : r === STEP - 1 ? PURPLE[3] : PURPLE[2];
      if (!e && (x === CARPET[0] + 2 || x === CARPET[1] - 2) && r < 2) c = GOLD[2];
    }
    pb.set(x, y, c);
  }
  // Pfosten mit Goldkugeln und Zitronenbäumchen in Kübeln am Absatz (symmetrisch)
  for (const x of [20, 170]) {
    for (let y = LAND - 6; y < STAIR_TOP + 2; y++) for (let i = -3; i <= 3; i++) pb.set(x + i, y, i === 3 ? MARBLE[3] : i > 0 ? MARBLE[2] : MARBLE[0]);
    ellipse(pb, x, LAND - 9, 3.4, 3.2, GOLD4, .1);
  }
  for (const x of [8, 182]) {
    for (let y = LAND - 1; y < STAIR_TOP; y++) for (let i = -4; i <= 4; i++) pb.set(x + i, y, i > 2 ? TERRA[2] : y === LAND - 1 ? TERRA[0] : TERRA[1]);
    pb.rect(x, LAND - 9, 1, 8, '#7a5a3a');
    ellipse(pb, x + .5, LAND - 15, 7, 7, [GREEN[0], GREEN[1], GREEN[2], GREEN[3]], .1);
    for (let i = 0; i < 8; i++) { const lx = x - 5 + Math.floor(hash(i, x, 5) * 11), ly = LAND - 20 + Math.floor(hash(i, x, 6) * 10); pb.set(lx, ly, LEMON[0]); pb.set(lx + 1, ly, LEMON[1]); }
  }
  // Fahnenstange mit Querstange und Sockel (das Tuch zeichnet die Szene, es weht)
  const PX = FLAG.x - 3;
  pb.rect(PX, 46, 2, STAIR_TOP - 46, GOLD[2]); pb.rect(PX, 46, 1, STAIR_TOP - 46, GOLD[0]);
  ellipse(pb, PX + 1, 43, 2.6, 2.6, GOLD4, .2);
  pb.rect(PX, FLAG.y - 2, FLAG.w + 5, 2, GOLD[2]); pb.rect(PX, FLAG.y - 2, FLAG.w + 5, 1, GOLD[1]);
  pb.set(PX + FLAG.w + 5, FLAG.y - 2, GOLD[0]); pb.set(PX + FLAG.w + 5, FLAG.y - 1, GOLD[3]);
  for (let y = LAND - 2; y < STAIR_TOP; y++) for (let i = -4; i <= 5; i++) pb.set(PX + i, y, y === LAND - 2 ? GOLD[1] : i > 3 ? MARBLE[3] : MARBLE[1]);
  pb.outline(EDGE);
  return pb.canvas();
}

/* ---------- Aurels Fahne: Purpur mit Goldsaum, Schwalbenschwanz, darauf das Wappen vom Wrack (exakt, motifs.js) ---------- */
function buildFlag() {
  const { w, h } = FLAG, pb = new PB(w, h + 2), notch = 8;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = h - 1 - Math.round(notch * (1 - Math.abs(x + .5 - w / 2) / (w / 2)));
    if (y > v) continue;
    const e = Math.min(x, w - 1 - x, y, v - y);
    let c = e === 0 ? GOLD[2] : e === 1 ? GOLD[1] : pick(PURPLE, .2 - (x / w) * .5 + (bay(x, y) - .5) * .3);
    pb.set(x, y, c);
  }
  // Fransen an den Spitzen
  for (let x = 0; x < w; x += 2) { const v = h - Math.round(notch * (1 - Math.abs(x + .5 - w / 2) / (w / 2))); pb.set(x, v, GOLD[1]); pb.set(x, v + 1, GOLD[2]); }
  pb.outline(EDGE);
  const cv = pb.canvas(), [ww] = WAPPEN_SIZE;
  cv.getContext('2d').drawImage(wappen('fahne'), Math.round((w - ww) / 2) + 1, 6);
  return cv;
}

/* ---------- Aurel als Figur (Einstellung 3): goldener Umhang, weißes Gewand, Purpur, schmaler Reif ---------- */
// Haltungen: rest (Hände vor dem Bauch), half (Arme öffnen sich), open (offene Arme); f = Umhang im Wind (0/1)
const FW = 60, FH = 60, FX = 30, FY = 4;                    // Figur: Mitte x = FX, Kopf oben bei FY, Füße unten bei FH − 2
function buildAurel(pose, f) {
  const pb = new PB(FW, FH), X = FX, Y = FY, open = pose === 'open' ? 1 : pose === 'half' ? .5 : 0;
  // Umhang hinten: von den Schultern bis zum Saum, nach unten weiter, der Wind (von links) drückt ihn nach rechts
  const C0 = Y + 13, C1 = FH - 3;
  for (let y = C0; y <= C1; y++) {
    const u = (y - C0) / (C1 - C0), hl = 8 + u * 6 + open * u * 2 - u * u * f, hr = 8 + u * 6 + open * u * 2 + u * u * (3 + f * 2);
    for (let x = Math.floor(X - hl); x <= X + hr; x++) {
      const nx = (x + .5 - X) / (x < X ? hl : hr);
      let l = -nx * .8 + (bay(x, y) - .5) * .3 + .05;
      if ((x * 2 + y + f * 4) % 11 === 0 && u > .15) l -= .55;                        // Falten
      let c = pick(GOLD4, l);
      if (y === C1 || (y === C1 - 1 && x > X + hr - 3)) c = PURPLE[2];                // Futter am Saum
      pb.set(x, y, c);
    }
  }
  // Gewand: weiß, lang, purpurne Schärpe, Goldborte am Saum, goldene Schuhspitzen
  for (let y = Y + 13; y < FH - 2; y++) {
    const u = (y - Y - 13) / (FH - Y - 15), half = 5 + u * 3.5;
    for (let x = Math.floor(X - half); x <= X + half; x++) {
      const nx = (x + .5 - X) / half;
      let c = pick(ROBE, -nx * .8 + (bay(x, y) - .5) * .3 + .2);
      if ((x - X + 30) % 4 === 0 && u > .45) c = ROBE[2];
      if (y === Y + 23 || y === Y + 24) c = y === Y + 23 ? PURPLE[1] : PURPLE[2];
      if (y >= FH - 4) c = y === FH - 4 ? GOLD[1] : GOLD[2];
      pb.set(x, y, c);
    }
  }
  pb.rect(X - 4, FH - 2, 3, 1, GOLD[1]); pb.rect(X + 2, FH - 2, 3, 1, GOLD[2]);
  // Schultern des Umhangs mit purpurnem Kragen und Sonnen-Brosche
  ellipse(pb, X, Y + 15, 9.5, 3.6, GOLD4, .15);
  for (let x = X - 8; x <= X + 8; x++) { const y = Y + 12 + Math.round(Math.abs(x - X) * .12); pb.set(x, y, GOLD[0]); pb.set(x, y + 1, PURPLE[x < X ? 1 : 2]); }
  pb.set(X, Y + 14, GOLD[0]); pb.set(X - 1, Y + 15, GOLD[2]); pb.set(X + 1, Y + 15, GOLD[2]); pb.set(X, Y + 16, GOLD[2]);
  // Arme: goldene Ärmel (weit, innen Purpur), Hände geöffnet; Finger als ein Stück, Daumen oben
  const S = [[X - 8, Y + 15], [X + 8, Y + 15]];
  const A = {
    rest: [[X - 9, Y + 22, X - 2, Y + 26], [X + 9, Y + 22, X + 2, Y + 26]],
    half: [[X - 11, Y + 22, X - 17, Y + 24], [X + 11, Y + 22, X + 17, Y + 24]],
    open: [[X - 13, Y + 21, X - 21, Y + 17], [X + 13, Y + 21, X + 21, Y + 17]]
  }[pose];
  A.forEach(([ex, ey, hx, hy], i) => {
    const [sx, sy] = S[i], bias = i ? -.2 : .15, dir = i ? 1 : -1;
    capsule(pb, sx, sy, ex, ey, 2.8, 2.6, GOLD4, bias);
    const vx = hx - ex, vy = hy - ey, vl = Math.hypot(vx, vy), ux = vx / vl, uy = vy / vl;
    const wx = hx - ux * 2.2, wy = hy - uy * 2.2;                                         // Handgelenk
    capsule(pb, ex, ey, wx, wy, 2.4, 3.2, GOLD4, bias);
    for (let k = -3; k <= 3; k++) pb.set(wx - uy * k + ux * .5, wy + ux * k + uy * .5, Math.abs(k) > 2 ? GOLD[3] : PURPLE[Math.abs(k) > 1 ? 2 : 3]);   // Ärmelöffnung
    if (pose === 'rest') { if (i === 0) { ellipse(pb, X, Y + 26.5, 3, 2.2, SKIN, .1); pb.set(X - 1, Y + 25, SKIN[0]); pb.rect(X, Y + 27, 2, 1, SKIN[2]); } return; }
    // Hand: Handfläche nach oben, Finger zusammen in einem Stück, Daumen nach oben
    ellipse(pb, hx + ux * .6, hy + uy * .6, 2.6, 1.7, SKIN, .25);
    pb.set(Math.round(hx + ux * 2.6), Math.round(hy + uy * 2.6 + .2), SKIN[1]);
    pb.set(Math.round(hx - ux * .4), Math.round(hy - 2), SKIN[0]); pb.set(Math.round(hx - ux * .4), Math.round(hy - 1), SKIN[1]);
    pb.set(Math.round(hx + ux * 1.4), Math.round(hy + 1), SKIN[2]);
  });
  // Kopf: Hals, Haar hinten bis zum Kiefer, Gesicht, Reif, freundliches Lächeln
  capsule(pb, X, Y + 9, X, Y + 12, 2.2, 2.4, SKIN, -.15);
  ellipse(pb, X, Y + 6, 5.6, 6.6, HAIR, .05, (x, y) => y > Y + 2);
  ellipse(pb, X, Y + 6, 4.3, 5.3, SKIN, .15);
  ellipse(pb, X, Y + 3, 5.2, 3.6, HAIR, .1, (x, y) => y < Y + 4 || x < X - 3.6 || x > X + 3.6);
  for (let x = X - 4; x <= X + 4; x++) pb.set(x, Y + 3 + (Math.abs(x - X) > 3 ? 1 : 0), x < X ? GOLD[0] : GOLD[1]);
  pb.set(X, Y + 3, '#3a6ac8');
  pb.set(X - 2, Y + 6, '#3a2a20'); pb.set(X + 2, Y + 6, '#3a2a20');
  pb.set(X - 2, Y + 8, '#a85a4c'); pb.rect(X - 1, Y + 9, 3, 1, '#a85a4c'); pb.set(X + 2, Y + 8, '#a85a4c');
  pb.set(X - 3, Y + 8, '#efa892'); pb.set(X + 3, Y + 8, '#efa892');
  pb.outline(EDGE);
  return pb.canvas();
}

/* =========================================================
   ZEICHNEN
   ========================================================= */
// Wellenkämme; u = Sonne (0 grau, 1 hell)
function waves(ctx, t, top, cam, u) {
  for (let row = 0, y = top + 2; y < H; row++) {
    const f = (y - top) / (H - top), gap = 2 + Math.floor(f * 5), par = .4 + f * 1.1, off = cam * par + t * (2 + f * 7), spacing = 16 + f * 26;
    for (let i = 0; i < 24; i++) {
      const x = ((i * spacing + hash(row, i, 8) * spacing * .8 - off) % (W + 40) + W + 40) % (W + 40) - 20;
      if (Math.sin(t * 1.4 + i + row) < -.25) continue;
      const len = Math.round(2 + f * 7 * hash(row, i, 9)), sun = hash(row, i, 5) < u;
      ctx.fillStyle = sun ? (f < .25 ? '#d6f2ee' : '#bfe6ea') : (f < .25 ? '#aab0b2' : '#949ea2');
      ctx.fillRect(Math.round(x), y, len, 1);
      if (f > .35) { ctx.fillStyle = sun ? '#22547a' : '#3a464c'; ctx.fillRect(Math.round(x) + 1, y + 1, len, 1); }
    }
    y += gap;
  }
}
// Glitzern auf dem Wasser unter der Sonne
function glitter(ctx, t, top, cx, u) {
  if (u <= 0) return;
  for (let y = top + 1; y < H; y++) {
    const f = (y - top) / (H - top), wd = 6 + f * 70, n = Math.round(2 + f * 6);
    for (let k = 0; k < n; k++) {
      const h = hash(k, y, Math.floor(t * 6 + k * .37));
      if (h > .55 * u) continue;
      const x = cx + (hash(k, y, 77 + Math.floor(t * 2)) - .5) * wd * 2;
      ctx.fillStyle = h < .2 ? '#fffbe6' : '#ffe9a0';
      ctx.fillRect(Math.round(x), y, f > .5 ? 2 : 1, 1);
    }
  }
}
// Tauben (zwei Flügelstellungen)
function doves(ctx, t, n, seed, y0, spd, s = 1) {
  for (let i = 0; i < n; i++) {
    const x = ((hash(i, 1, seed) * 420 + t * spd * (.8 + hash(i, 2, seed) * .4)) % 420) - 50, y = y0 + hash(i, 3, seed) * 40 + Math.sin(t * 1.3 + i) * 3;
    const up = Math.floor(t * 5 + i * 1.7) % 2 === 0;
    ctx.fillStyle = '#5a4a40'; ctx.fillRect(Math.round(x) - s, Math.round(y) + s, 3 * s, s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(x), Math.round(y), s, s);
    ctx.fillRect(Math.round(x) - 2 * s, Math.round(y) + (up ? -s : s), 2 * s, s); ctx.fillRect(Math.round(x) + s, Math.round(y) + (up ? -s : s), 2 * s, s);
  }
}
// Banner im Wind: Tuch weht nach rechts, Gold mit purpurnem Streifen; s = Pixelgröße
function bannerCloth(ctx, x, y, t, s, big, seed) {
  const w = big ? 16 : 11, h = big ? 7 : 5;
  for (let c = 0; c < w; c++) {
    const ph = t * 5.2 - c * .75 + seed, yo = Math.round(Math.sin(ph) * c / w * (big ? 2.4 : 1.6)), cs = Math.cos(ph);
    const hh = h - (c > w - 3 ? 1 : 0);
    for (let r = 0; r < hh; r++) {
      let col = cs > .35 ? GOLD[0] : cs < -.45 ? GOLD[2] : GOLD[1];
      if (r === Math.floor(h / 2)) col = cs < -.45 ? PURPLE[2] : PURPLE[1];
      if (r === hh - 1) col = GOLD[3];
      if (c === w - 1 && r % 2) continue;
      ctx.fillStyle = col; ctx.fillRect(Math.round(x + (c + 1) * s), Math.round(y + (r + yo) * s), s, s);
    }
  }
}

/* ---------- Einstellung 1: die Wolken reißen auf ---------- */
const PART0 = 1.6, PART1 = 6.6, SUN0 = 2.4, SUN1 = 7;
function renderSea(ctx, t, cam, part, sun, still) {
  const sx = -cam * .2;
  ctx.drawImage(L.skyCv, Math.round(sx - 30), 0);
  glow(ctx, sx - 30 + SUNX, SUNY, 60, .35 * sun, SUN);
  ctx.drawImage(L.clouds(lerp(-.75, .9, part), sun), Math.round(-cam * .3 - 30 - t * 1.5), 0);
  ctx.drawImage(L.sea(sun), Math.round(-cam * .5 % 20) - 20, HOR);
  waves(ctx, t, HOR, cam, sun);
  glitter(ctx, t, HOR, sx - 30 + SUNX - 10, sun);
  const IX = Math.round(70 - cam * .7), IY = HOR - IWL;
  // Spiegelung der Insel
  ctx.globalAlpha = .22;
  const isle = L.isle(sun);
  for (let r = 0; r < 18; r++) ctx.drawImage(isle, 0, IWL - 1 - r, IW, 1, IX + Math.round(Math.sin(r * .9 + t * 2) * 1.2), HOR + r, IW, 1);
  ctx.globalAlpha = 1;
  ctx.drawImage(isle, IX, IY);
  // Gischt am Kai
  ctx.fillStyle = sun > .5 ? '#f4fbf6' : '#c4c8c8';
  for (let x = 20; x < IW - 20; x++) if (hash(x, Math.floor(t * 2.5), 4) < .3) ctx.fillRect(IX + x, HOR, 1, 1);
  // Strahlen durch die Lücke, Aufleuchten der Kuppel
  if (sun > 0) {
    ctx.globalAlpha = clamp(sun * 1.4, 0, 1) * (.3 + Math.sin(t * .9) * .04);
    ctx.drawImage(L.rays, Math.round(sx - 30 - 10), 0);
    ctx.globalAlpha = 1;
    glow(ctx, IX + IC, IY + IWL - 80, 26, .45 * clamp((sun - .2) * 2, 0, 1), SUN);
    if (!still) { const k = clamp((t - SUN0 - .6) / .5, 0, 1) * clamp((SUN0 + 2.2 - t) / 1.1, 0, 1); glow(ctx, IX + IC, IY + IWL - 82, 90, .28 * k, SUN); }   // erster Strahl trifft die Kuppel
  }
  if (!still) doves(ctx, t, 3, 2, 40, 14);
}

/* ---------- Einstellung 2: vom Hafen hinauf zum Palast ---------- */
function renderHill(ctx, t, oy) {
  const ox = 10;
  ctx.drawImage(L.hill, ox, Math.round(oy), W, H, 0, 0, W, H);
  // Glitzern im Hafenbecken, schaukelnde Boote: das Wasser beginnt bei QY + 8
  const wy = QY + 8 - oy;
  if (wy < H) glitter(ctx, t, Math.round(wy), 160, .7);
  // Banner
  for (const [bx, by, big] of BANNERS) {
    const x = bx - ox, y = by - oy;
    if (y < -30 || y > H + 20) continue;
    if (big) { bannerCloth(ctx, x, y - 15, t, 1, true, bx * .1); continue; }
    ctx.fillStyle = EDGE; ctx.fillRect(x - 1, y - 23, 3, 23);
    ctx.fillStyle = GOLD[2]; ctx.fillRect(x, y - 22, 1, 22);
    ctx.fillStyle = GOLD[0]; ctx.fillRect(x, y - 24, 1, 2);
    bannerCloth(ctx, x, y - 21, t, 1, false, bx * .1);
  }
  doves(ctx, t, 5, 9, 20, 16);
  // Sonne oben links (außerhalb des Bilds): warmes Licht
  glow(ctx, -20, -40 - oy * .3, 160, .32, SUN);
}

/* ---------- Einstellung 3: Treppe, Fahne, Aurel ---------- */
const OY0 = 22, OY1 = 52, OX3 = 14, AUREL = [105, STAIR_TOP + STEP * 4];   // Füße Aurels auf der vierten Stufe
function drawFlag(ctx, t, ox, oy, s) {
  const { x, y, w, h } = FLAG, F = L.flag, x0 = (x - ox) * s, y0 = (y - oy) * s;
  // Tuch hängt an der Querstange; unten (unter dem Wappen) schwingen die Spitzen im Wind
  for (let r = 0; r < h + 2; r++) {
    const k = clamp((r - 32) / 15, 0, 1), dx = Math.round(Math.sin(t * 2.1 + r * .18) * k * 2.2 + k * 1.2);
    ctx.drawImage(F, 0, r, w + 2, 1, x0 + dx * s - s, y0 + r * s, (w + 2) * s, s);
  }
  // Falten wandern durchs Tuch (Schatten, das Wappen bleibt Pixel für Pixel gleich)
  for (let c = 1; c < w - 1; c++) {
    const v = Math.sin(c * .55 - t * 2.4);
    if (Math.abs(v) < .55) continue;
    ctx.fillStyle = v > 0 ? 'rgba(40,10,60,.16)' : 'rgba(255,240,200,.1)';
    ctx.fillRect(x0 + c * s, y0 + s, s, (h - 10) * s);
  }
}
function renderStair(ctx, t, lt, still) {
  const s = 2, u = still ? 1 : ease((lt - .8) / 4.6), oy = lerp(OY0, OY1, u), ox = OX3;
  ctx.drawImage(L.stair, ox, Math.round(oy), W / s, H / s, 0, 0, W, H);
  const oyR = Math.round(oy);
  drawFlag(ctx, t, ox, oyR, s);
  // Aurel: Arme öffnen sich, der Umhang weht
  const pose = still ? 'open' : lt < 3.4 ? 'rest' : lt < 3.75 ? 'half' : 'open';
  const fr = Math.floor(t * 2.6) % 2;
  const F = L.fig[pose + fr], [ax, ay] = AUREL, breath = pose === 'open' && Math.sin(t * 1.6) > .6 ? 1 : 0;
  ctx.drawImage(F, 0, 0, FW, FH, (ax - FX - ox) * s, (ay - FH + 2 - oyR - breath * 0) * s, FW * s, FH * s);
  // kleine goldene Banner an den Säulen
  for (const cx of [140, 184]) bannerCloth(ctx, (cx + 4 - ox) * s, (44 - oyR) * s, t, s, false, cx);
  // Blütenblätter treiben durchs Bild, Sonne oben links
  for (let i = 0; i < 9; i++) {
    const p = (t * .07 + hash(i, 1, 21)) % 1, x = -20 + p * 360 + Math.sin(p * 11 + i) * 10, y = 30 + hash(i, 2, 21) * 120 + p * 30 + Math.sin(t * 2 + i) * 4;
    ctx.fillStyle = i % 3 ? '#ffe6ee' : '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    if (i % 2) { ctx.fillStyle = '#f7b4c6'; ctx.fillRect(Math.round(x) + 2, Math.round(y) + 1, 1, 1); }
  }
  glow(ctx, 0, -10, 150, .3, SUN);
}

/* ---------- Einstellung 4: Großaufnahme, das Lächeln stockt ---------- */
// Augen: Lächeln, blinzeln, Lächeln; dann stockt es (weit, Mund gerade), findet sich wieder (halb) und wird zu breit (lachende Augen)
const closeFace = (lt) => lt < 1.4 ? 0 : lt < 1.53 ? 2 : lt < 2.5 ? 0 : lt < 3.9 ? 3 : lt < 4.3 ? 4 : lt < 5.7 ? 1 : lt < 6.25 ? 0 : lt < 6.38 ? 2 : 0;
function renderClose(ctx, t, lt) {
  ctx.drawImage(L.closeBG, 0, 0);
  glow(ctx, 10, 0, 170, .38, SUN);
  // Goldene Lichtpunkte (unscharfe Kuppeln und Banner hinter ihm)
  for (let i = 0; i < 6; i++) glow(ctx, 30 + hash(i, 1, 4) * 260 + Math.sin(t * .4 + i) * 4, 40 + hash(i, 2, 4) * 110, 10 + hash(i, 3, 4) * 10, .22, '255,214,110');
  const e = closeFace(lt);
  ctx.drawImage(L.aurel(e, 0), 0, 0, 64, 80, 96, 8 - Math.round(ease(lt / 7) * 3), 128, 160);
  // Während das Lächeln stockt, zieht eine Wolke vor die Sonne: das Licht wird kurz kühler
  const sh = clamp((lt - 2.3) / .5, 0, 1) * clamp((4.4 - lt) / .7, 0, 1);
  if (sh > 0) { ctx.fillStyle = `rgba(60,80,120,${.2 * sh})`; ctx.fillRect(0, 0, W, H); }
}
const vig = (ctx, a = .45) => { ctx.globalAlpha = a; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1; };

export default {
  id: 'cs_npc_aurel',
  title: 'Der Goldberg',
  len: T_END,
  dialog: 'aurel_1',
  setup,
  shots: [
    // Einstellung 1: die Wolken reißen auf, der erste Sonnenstrahl (eine langsame Kamerafahrt nach rechts)
    { from: 0, to: T_TERR, draw(ctx, lt, t) {
      renderSea(ctx, t, ease(t / T_TERR) * 40, ease((t - PART0) / (PART1 - PART0)), ease((t - SUN0) / (SUN1 - SUN0)));
      vig(ctx, .4);
      black(ctx, 1 - t / 1.6);
    } },
    // Einstellung 2: harter Schnitt an den Hang – vom Hafen hinauf zum Palast
    { from: T_TERR, to: T_STAIR, draw(ctx, lt, t) {
      renderHill(ctx, t, lerp(TH - H, 0, ease((lt - .3) / 6.9)));
      vig(ctx, .35);
    } },
    // Einstellung 3: Aurel auf der Treppe, die Fahne mit dem Wappen; Kamera neigt sich von der Fahne zu ihm
    { from: T_STAIR, to: T_CLOSE, draw(ctx, lt, t) { renderStair(ctx, t, lt); vig(ctx, .4); } },
    // Einstellung 4: Großaufnahme, das Lächeln stockt; Abblende
    { from: T_CLOSE, to: T_END, draw(ctx, lt, t) {
      renderClose(ctx, t, lt);
      vig(ctx, .45);
      black(ctx, (t - T_FADE) / 1.2);
    } }
  ],
  // Hintergrund des Dialogs: Aurel mit offenen Armen auf der Treppe, ohne Kamerafahrt; el = Sekunden seit Dialogbeginn, now = Uhr (s)
  dialogBg(ctx, el, now) {
    renderStair(ctx, now, 0, true);
    vig(ctx, .4);
  }
};
// Für cs_wahrheit: Aurel als Figur (rest, half, open; f = Umhang im Wind)
export { buildAurel as buildAurelFigure, FW as AUREL_FW, FH as AUREL_FH, FX as AUREL_FX };
