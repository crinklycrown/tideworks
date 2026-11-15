/* =========================================================
   CUTSCENE cs_prolog „Gestrandet“ (Prolog: neues Spiel, vor dem ersten Bild der Karte; kein Dialog danach)
   Schwarzbild, nur Sturm, Regen und Wellen (0–5 s, langsam aus dem Schwarz) · ein einziger Blitz zeigt das Boot als Schattenriss (5–7,5 s) ·
   harter Schnitt zum Morgen: ruhiger Strand, Möwen, kleine Wellen, Wrack mit fremdem Wappen (7,5–12 s), näher ans Wappen (12–15,5 s) ·
   Großaufnahme: Hand mit Seilspuren und schwerem Ring öffnet sich, daneben die helle Strähne im Sand (15,5–19,5 s) ·
   der nasse Zettel „…Leuchtfeuer sofort entzünden. Gez. …“, Kamera fährt ans Siegel (19,5–25 s) ·
   Abblende, Titel „Tideworks“ über einer Wasserlinie (26,2–32 s). Danach beginnt das Spiel.
   Wiederkehrend (cutscene/motifs.js): Blitz (cs_wahrheit), Wappen (Aurels Fahne, Werkzeug), Siegel (cs_bauplan).
   Der Spieler im Bild (STORY.md): nur Hand mit Ring und Seilspuren, Ärmel des grünen Mantels, helle Strähne – kein Gesicht.
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, vnoise, fbm, PB, pick, layer, tpl, vignette as makeVignette, glow, black } from '../cutscene/kit.js';
import { lightningFlash, drawLightning, BOLT, wappen, siegel } from '../cutscene/motifs.js';
import { SPR } from '../gfx/sprites.js';

const T_BOLT = 5, T_BEACH = 7.5, T_WRECK = 12, T_HAND = 15.5, T_NOTE = 19.5, T_FADE = 25, T_TITLE = 26.2, T_END = 32;

/* ---------- Farbpaletten ---------- */
// Sturm: fast schwarz; im Blitz kaltes Violettweiß
const NIGHT = ['#0a0d13', '#07090e', '#05070a', '#040508', '#030406'];
const LIT = ['#eef0ff', '#c9cfee', '#9ea7d2', '#737db0', '#4d5688'];
const SIL = '#020305';
// Morgen am Strand: kühles, helles Licht
const SKY = ['#f4f7f5', '#e6eff1', '#d5e6ec', '#c1d9e3', '#abcbd9', '#97bdd0'];
const SEA = ['#b9d6d8', '#9cc4c8', '#80b0b6', '#689ca4', '#558991', '#46767f'];
const SAND = ['#f1e8d3', '#e2d6bb', '#cfc09f', '#b5a481'];
const WET = ['#c8bb9c', '#ad9f80', '#958866'];
const FOAM = '#fbfdfb';
const DRIFT = ['#b4a58f', '#928370', '#6f6252', '#4b4137'];     // ausgeblichenes Holz des Wracks
const CLOTH = ['#d9d4c2', '#b9b39f', '#948e7b'];
// Großaufnahmen: kalte, nasse Haut, Seilspuren, Messing, grüner Mantel
const SKIN = ['#efc9ae', '#d8a98c', '#b9876d', '#8e604e'];
const ROPE = ['#c06a6e', '#9a4652', '#6e2c3a'];
const GOLD = ['#fff2b8', '#e8c35a', '#b8892c', '#6e4a18'];
const COAT = ['#4a7a58', '#365f45', '#264a35', '#183224'];
const BRASS = ['#f6dc8a', '#c99a3a', '#7e5a1c'];
const HAIR_L = ['#f6f2e6', '#ddd5bf', '#bcb39b'];
const HAIR_D = ['#4a3628', '#33251b'];
const PAPER = ['#ece7d6', '#dcd6c2', '#c6bfa8', '#a8a28b'];
const INK = '#26304a', INK_B = '#69718a';

/* ---------- Kleine Helfer ---------- */
// Ellipse/Kapsel mit Licht von links oben (wie shadeE), Strecke a→b, Radius r0→r1; rim = dunkler Saum
function capsule(pb, ax, ay, bx, by, r0, r1, ramp, o = {}) {
  const vx = bx - ax, vy = by - ay, ll = vx * vx + vy * vy || 1, R = Math.max(r0, r1);
  for (let y = Math.floor(Math.min(ay, by) - R - 1); y <= Math.max(ay, by) + R + 1; y++) for (let x = Math.floor(Math.min(ax, bx) - R - 1); x <= Math.max(ax, bx) + R + 1; x++) {
    const px = x + .5, py = y + .5, u = clamp(((px - ax) * vx + (py - ay) * vy) / ll, 0, 1), r = lerp(r0, r1, u);
    const nx = (px - ax - u * vx) / r, ny = (py - ay - u * vy) / r, d = nx * nx + ny * ny;
    if (d > 1) continue;
    const k = o.soft || 1;   // soft < 1: flacher gewölbt (weniger Licht und Schatten quer)
    let l = -(nx * .62 + ny * .55) * .9 * k + (1 - d) * .22 * k + (bay(x, y) - .5) * .3 + (o.bias || 0);
    if (o.rim && d > .72) l -= pb.get(x, y) ? 1.2 : .5;      // Saum; wo der Teil über einem anderen liegt, eine dunkle Fuge
    if (o.noise) l += (hash(x, y, o.seed || 1) - .5) * o.noise;
    if (o.fn) { const c = o.fn(x, y, u, nx, ny, l); if (c) { pb.set(x, y, c); continue; } }
    pb.set(x, y, pick(ramp, l));
  }
}
// Kurve (quadratische Bézierkurve) Pixel für Pixel; col(i, n) → Farbe
function curve(pb, x0, y0, cx, cy, x1, y1, col, wide) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.6);
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
    const x = a * x0 + b * cx + c * x1, y = a * y0 + b * cy + c * y1, k = col(i, n);
    if (!k) continue;
    pb.set(x, y, k);
    if (wide && wide(i, n)) pb.set(x + 1, y, k);
  }
}
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/* ---------- Handschrift für den Zettel (7 Zeilen hoch, Kleinbuchstaben ab Zeile 3) ---------- */
const GLYPHS = {
  L: ['#...', '#...', '#...', '#...', '#...', '#...', '####'],
  G: ['.##.', '#..#', '#...', '#.##', '#..#', '#..#', '.###'],
  e: ['....', '....', '....', '.##.', '####', '#...', '.###'],
  u: ['....', '....', '....', '#..#', '#..#', '#..#', '.###'],
  'ü': ['....', '#..#', '....', '#..#', '#..#', '#..#', '.###'],
  c: ['...', '...', '...', '.##', '#..', '#..', '.##'],
  h: ['#...', '#...', '#...', '###.', '#..#', '#..#', '#..#'],
  t: ['...', '.#.', '.#.', '###', '.#.', '.#.', '..#'],
  f: ['.##', '#..', '#..', '###', '#..', '#..', '#..'],
  r: ['...', '...', '...', '#.#', '##.', '#..', '#..'],
  s: ['...', '...', '...', '.##', '#..', '..#', '##.'],
  o: ['....', '....', '....', '.##.', '#..#', '#..#', '.##.'],
  z: ['....', '....', '....', '####', '..#.', '.#..', '####'],
  n: ['....', '....', '....', '###.', '#..#', '#..#', '#..#'],
  d: ['...#', '...#', '...#', '.###', '#..#', '#..#', '.###'],
  '.': ['.', '.', '.', '.', '.', '.', '#'],
  '…': ['.....', '.....', '.....', '.....', '.....', '.....', '#.#.#'],
  ' ': ['..', '..', '..', '..', '..', '..', '..']
};
// Text in Tinte; Rückgabe: Breite. Leichte Schräge (Handschrift): obere Zeilen 1 Pixel nach rechts
function write(pb, text, x0, y0, fade) {
  let x = x0;
  for (const ch of text) {
    const G = GLYPHS[ch];
    G.forEach((row, gy) => [...row].forEach((v, gx) => {
      if (v !== '#') return;
      const px = x + gx + (gy < 3 ? 1 : 0), py = y0 + gy;
      const f = fade ? fade(px, py) : 0;
      if (f > .85) return;
      pb.set(px, py, f > .45 && bay(px, py) < .5 ? INK_B : INK);
    }));
    x += G[0].length + 1;
  }
  return x - x0;
}
// Tinte verläuft im nassen Papier: helle Tinte neben der Schrift
function bleed(pb, x0, y0, w, h) {
  const q = pb.p.slice();
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const c = q[y * pb.w + x];
    if (c === INK || c === INK_B) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => q[(y + dy) * pb.w + x + dx] === INK).length;
    if (n && hash(x, y, 31) < .22 + n * .1) pb.set(x, y, n > 1 && bay(x, y) < .5 ? '#8d93a2' : '#a9adb6');
  }
}

/* ---------- Statische Ebenen (setup, einmal je Spiel) ---------- */
let L = null;
const HOR_S = 112;                         // Horizont im Sturm
const HOR_B = 84, BW = 420;                // Morgen: Horizont, Breite der Strand-Welt
const shore = (x) => 121 + x * .022 + Math.round((vnoise(x / 30, 3, 8) - .5) * 4);

function setup() {
  if (L) return;
  // Sturm: Himmel dunkel und im Blitz (dieselben Wolken, andere Palette)
  const cloud = (x, y) => fbm(x / 46, y / 14, 91, 4) + (1 - y / HOR_S) * .25;
  const stormSky = (P) => layer(W, H, (x, y) => {
    if (y >= HOR_S) return null;
    const l = (1 - cloud(x, y)) * 5.2 - 1.2 + y / HOR_S * 1.4 + (bay(x, y) - .5) * .6;
    return P[clamp(Math.round(l), 0, 4)];
  });
  // Meer im Sturm: dunkel bzw. vom Blitz beschienen (Streifen)
  const stormSea = (P) => layer(W, H - HOR_S, (x, y) => {
    const st = vnoise(x / 9, y / 1.6, 33);
    const l = 2 + y / (H - HOR_S) * 2.5 - (st > .62 ? 1.4 : 0) + (bay(x, y) - .5) * .6;
    return P[clamp(Math.round(l), 0, 4)];
  });
  // Morgen: Himmel mit flachen Wolkenbänken und fernen Inseln
  const beachSky = layer(BW, HOR_B, (x, y) => {
    const f = y / HOR_B;
    let l = (1 - f) * 4.6 + (bay(x, y) - .5) * .55;
    const n = fbm(x / 80, y / 7, 52, 3);
    if (n > .58 && y > 18 && y < HOR_B - 10) l -= 1.6;
    if (n > .66 && y > 22 && y < HOR_B - 14) l -= .9;
    const hill = HOR_B - 1 - Math.max(0, 6 - Math.abs(x - 330) * .14) * (1 + (vnoise(x / 5, 1, 4) - .5) * .5) - Math.max(0, 3.5 - Math.abs(x - 60) * .1);
    if (y >= hill && hill < HOR_B - 1.5) return (x + y) % 2 ? '#a7c0cb' : '#9fb9c5';
    return SKY[clamp(Math.round(l), 0, 5)];
  });
  const beachSea = layer(W, H - HOR_B, (x, y) => {
    const f = y / (H - HOR_B), l = Math.pow(f, .7) * 5.5 + (bay(x, y) - .5) * .5;
    return SEA[clamp(Math.round(l), 0, 5)];
  });
  // Sand mit Rippeln, nasser Saum an der Wasserlinie (Wasserlinie: shore(x))
  const beachSand = layer(BW, H, (x, y) => {
    const s = shore(x);
    if (y < s) return null;
    const d = y - s;
    if (d < 7) return WET[clamp(Math.round(d / 3 + (bay(x, y) - .5) * .8), 0, 2)];
    const rip = Math.sin((x * .5 + y * 2.6) + vnoise(x / 12, y / 5, 6) * 4) > .82;
    let l = .2 + (1 - Math.min(1, d / 40)) * -.35 + (fbm(x / 20, y / 6, 17, 2) - .5) * .7 + (bay(x, y) - .5) * .35;
    if (rip) l -= .35;
    let c = pick(SAND, l);
    if (hash(x, y, 71) < .006) c = '#8f8577';      // Steinchen
    return c;
  });
  // Großaufnahme Sand (Hand und Zettel, 2×): Körnung, Rippeln, nasse Flecken
  const sandClose = (w, h, seed) => layer(w, h, (x, y) => {
    const wet = fbm(x / 40, y / 30, seed + 5, 3);
    let l = .35 + (fbm(x / 9, y / 6, seed, 3) - .5) * .9 + (bay(x, y) - .5) * .4 - (wet > .7 ? .35 : 0);
    if (Math.sin(x * .32 + y * .9 + vnoise(x / 14, y / 9, seed) * 5) > .86) l -= .3;
    let c = pick(SAND, l);
    const g = hash(x, y, seed + 9);
    if (g < .012) c = '#9a8f7e'; else if (g > .992) c = '#fbf6e8';
    return c;
  });
  L = {
    skyDark: stormSky(NIGHT), skyLit: stormSky(LIT), seaDark: stormSea(NIGHT), seaLit: stormSea(LIT),
    boat: [-.16, -.06, .05, .15].map(buildBoatSil),
    beachSky, beachSea, beachSand, wreck: buildWreck(), figure: buildFigure(), gulls: buildGulls(),
    handBg: buildHandBg(sandClose(170, 96, 3)), hand: [0, .45, 1].map(buildHand),
    note: buildNote(sandClose(210, 170, 11)),
    vigDark: makeVignette('#020305', 1.3, .75), vigDay: makeVignette('#5f7884', 1.2, .55), vigSand: makeVignette('#6e5c40', 1.2, .6)
  };
  L.wreckClose = buildWreckClose();
}

/* ---------- Sturm: das Boot als Schattenriss (in Neigung a), mit Mast, zerfetztem Segel und einer zusammengesunkenen Gestalt ---------- */
function buildBoatSil(a) {
  const pb = new PB(64, 52), cx = 32, cy = 38;
  for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) {
    const [u, v] = rot(x + .5 - cx, y + .5 - cy, -a);     // Bootskoordinaten: u längs, v nach unten
    let on = false;
    // Rumpf: oben gerade (Reling), unten Bogen; Bug links höher
    const half = 23, top = -3 - Math.max(0, (-u - 14)) * .45 - Math.max(0, u - 17) * .25;
    if (Math.abs(u) < half && v > top && v < 5 - Math.pow(u / half, 2) * 6) on = true;
    if (u > -24 && u < -21 && v > top - 2 && v < 2) on = true;                       // Steven
    // Mast mit Rah, Segelfetzen
    if (Math.abs(u - 2) < 1 && v > -34 && v < -2) on = true;
    if (v > -30 && v < -29 && u > -8 && u < 10) on = true;
    if (v > -29 && v < -14 && u > 3 && u < 3 + (v + 29) * .55 && hash(Math.round(u), Math.round(v), 4) > .18) on = true;
    if (v > -28 && v < -20 && u > -7 && u < -7 + (-20 - v) * .5) on = true;
    // Gestalt im Heck: zusammengesunken, Kopf nach vorn
    if (Math.hypot(u - 13, v + 7) < 3.6) on = true;
    if (Math.hypot(u - 10.5, v + 10.5) < 2.1) on = true;
    if (on) pb.set(x, y, SIL);
  }
  return pb.canvas();
}

/* ---------- Morgen: das Wrack (Seitenansicht, auf der Seite liegend), Wappen am Heck ---------- */
const WR_W = 104, WR_H = 52;
function buildWreck() {
  const pb = new PB(WR_W, WR_H);
  const tilt = (x) => Math.round((x - 50) * -.13);           // Heck (rechts) höher
  const top = (x) => 18 + tilt(x) + Math.round(Math.max(0, 20 - x) * .35);   // Reling, Bug hebt sich leicht
  const bot = (x) => 18 + tilt(x) + Math.round(26 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 52) / 50, 2))));
  const hole = (x, y) => x > 22 && x < 46 && y > top(x) + 3 + Math.round(vnoise(x / 3, 1, 2) * 4) && y < bot(x) - 3 - Math.round(vnoise(x / 3, 2, 2) * 6);
  for (let x = 3; x < 101; x++) {
    for (let y = top(x); y < bot(x); y++) {
      const d = y - top(x), plank = Math.floor((d + (x >> 4)) / 4);
      let l = .55 - d / 22 + (vnoise(x / 6, y / 2, 5) - .5) * .6 + (bay(x, y) - .5) * .3;
      let c = pick(DRIFT, l);
      if ((d + (x >> 4)) % 4 === 0) c = DRIFT[3];                           // Plankenfuge
      if (hash(x, plank, 8) < .04 && d > 2) c = DRIFT[0];                     // ausgebleichte Stelle
      if (hash(x >> 1, y, 3) < .03) c = '#5c6a5c';                              // Algen
      if (hole(x, y)) c = (x % 5 === 0) ? DRIFT[2] : (x % 5 === 1 ? DRIFT[1] : '#2a241e');   // Loch mit Spanten
      pb.set(x, y, c);
    }
    pb.set(x, top(x), DRIFT[0]);   // Reling
  }
  // zersplitterter Mast, schräg; Segelfetzen hängt über die Bordwand
  for (let k = 0; k < 30; k++) {
    const mx = 54 - k * .55, my = top(54) - k;
    pb.rect(Math.round(mx), Math.round(my), 2, 1, k % 7 === 0 ? DRIFT[3] : DRIFT[1]);
    pb.set(Math.round(mx), Math.round(my), DRIFT[0]);
  }
  pb.set(38, top(54) - 30, DRIFT[2]); pb.set(39, top(54) - 31, DRIFT[1]); pb.set(37, top(54) - 31, DRIFT[2]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 14; x++) {
    const sx = 56 + x, sy = top(56 + x) - 4 + y + Math.round(Math.sin(x * .7) * 1.2);
    if (y > 12 - x * .4 + hash(x, y, 6) * 3) continue;
    pb.set(sx, sy, CLOTH[(x + y) % 5 === 0 ? 2 : (bay(sx, sy) < .3 ? 1 : 0)]);
  }
  // Tau, das in den Sand führt
  for (let k = 0; k < 20; k++) pb.set(20 - k * .8, bot(20) - 8 + k * .5 + Math.sin(k * .8), k % 2 ? '#a68d5e' : '#c2a774');
  // Heckbrett mit dem Wappen
  const hx = 74, hy = top(84) + 1;
  pb.rect(hx, hy, 21, 26, DRIFT[1]); pb.rect(hx, hy, 21, 1, DRIFT[0]); pb.rect(hx, hy, 1, 26, DRIFT[0]); pb.rect(hx + 20, hy, 1, 26, DRIFT[3]);
  pb.outline('#2c251f');
  const cv = pb.canvas();
  cv.getContext('2d').drawImage(wappen('verwittert'), hx + 2, hy + 2);
  L_WR.hx = hx; L_WR.hy = hy; L_WR.top = top;
  L_WR.a = cv.getContext('2d').getImageData(0, 0, WR_W, WR_H).data;
  return cv;
}
const L_WR = {};
const wreckAt = (x, y) => x >= 0 && y >= 0 && x < WR_W && y < WR_H && L_WR.a[(y * WR_W + x) * 4 + 3] > 0;
// winzige Gestalt im Spülsaum: grüner Mantel, helle Strähne, ausgestreckter Arm
const buildFigure = () => tpl([
  '...hHh..........',
  '..hhhhGGGGGG....',
  'Ss.cGGGGGGGGGDD.',
  '....gggggggg.DDD'
], { h: HAIR_D[0], H: HAIR_L[0], G: COAT[1], g: COAT[2], c: COAT[0], S: SKIN[1], s: SKIN[2], D: '#3a3028' }, '#2a2a24');
// Möwen: drei Flügelbilder im Flug, zwei Bilder sitzend
function buildGulls() {
  const pal = { W: '#fbfbf6', G: '#7d8a92', K: '#3a4247', Y: '#e8b84a', y: '#d08a3a' }, edge = '#5c676e';
  return {
    fly: [
      tpl(['K.......K', '.G.....G.', '..GGWGG..', '....W....'], pal, null),
      tpl(['.GG...GG.', 'K..GWG..K', '....W....', '.........'], pal, null),
      tpl(['....W....', '..GGWGG..', '.G.....G.', 'K.......K'], pal, null)
    ],
    sit: [
      tpl(['....WW.', '...WWWY', 'GGGWWW.', '.KGGWW.', '...WW..', '...y.y.'], pal, edge),
      tpl(['...WW..', '..WWWY.', 'GGGWWW.', '.KGGWW.', '...WW..', '...y.y.'], pal, edge)
    ]
  };
}

/* ---------- Großaufnahme: Hand (Handfläche nach oben, öffnet sich), 160×90, 2× gezeichnet ---------- */
const HD = (() => { const l = Math.hypot(1, .55); return [-1 / l, -.55 / l]; })();     // Richtung der Finger
const HP = [-HD[1], HD[0]];                                                            // quer (zum Daumen)
const HC = [96, 50];                                                                    // Mitte der Handfläche
const at = (s, q) => [HC[0] + HD[0] * s + HP[0] * q, HC[1] + HD[1] * s + HP[1] * q];

function buildHandBg(sand) {
  // Sand mit Haar: der Kopf liegt außerhalb des Bildes (oben links), nasses dunkles Haar ragt herein, darin die helle Strähne
  const pb = new PB(sand.width, sand.height), ctx = sand.getContext('2d');
  for (let y = 0; y < 44; y++) for (let x = 0; x < 56; x++) {
    const e = Math.pow((x + 4) / 44, 2) + Math.pow((y + 2) / 32, 2) + (vnoise(x / 3, y / 3, 8) - .5) * .3;
    if (e > 1) continue;
    const st = Math.sin(x * .35 - y * .5 + vnoise(x / 8, y / 8, 2) * 4);
    pb.set(x, y, st > .82 ? '#5c4534' : st < -.55 ? HAIR_D[1] : HAIR_D[0]);
  }
  // einzelne Strähnen, die aus dem Haar in den Sand fallen
  for (let i = 0; i < 7; i++) {
    const a = .2 + i * .19, x0 = Math.cos(a) * 40 - 4, y0 = Math.sin(a) * 28 - 2;
    const len = 8 + hash(i, 4, 5) * 12, x1 = x0 + Math.cos(a + .3) * len, y1 = y0 + Math.sin(a + .2) * len;
    curve(pb, x0, y0, (x0 + x1) / 2 + (hash(i, 1, 5) - .5) * 8, (y0 + y1) / 2 + (hash(i, 2, 5) - .5) * 8, x1, y1, (k, n) => (k / n > .7 && hash(i, k, 6) < .5) ? null : HAIR_D[(k >> 2) % 2]);
  }
  // die helle Strähne: ein breites Band aus dem Haar bis neben die Finger, zum Ende schmaler, mit Glanz; dann eine Locke
  const P = (u) => [(1 - u) * (1 - u) * 14 + 2 * u * (1 - u) * 34 + u * u * 60, (1 - u) * (1 - u) * 8 + 2 * u * (1 - u) * 34 + u * u * 38];
  for (let i = 0; i <= 120; i++) {
    const u = i / 120, [x, y] = P(u), [x2, y2] = P(Math.min(1, u + .01)), dl = Math.hypot(x2 - x, y2 - y) || 1;
    const nx = -(y2 - y) / dl, ny = (x2 - x) / dl, w = 2.6 * (1 - u * .6);
    for (let k = -w; k <= w; k += .5) pb.set(x + nx * k, y + ny * k, Math.sin(k * 2.6 + i * .04) > .7 ? HAIR_L[2] : HAIR_L[k < -w * .3 ? 0 : k > w * .5 ? 2 : 1]);
  }
  // das Ende fasert in einzelne Haare aus
  for (let j = 0; j < 4; j++) curve(pb, 59, 37 + j * .6, 64 + j, 37 + j * 1.5, 67 + j * 2, 35 + j * 3, (k) => HAIR_L[(j + k) % 3 ? 1 : 0]);
  // Sandkörner auf dem Haar
  for (let i = 0; i < 30; i++) { const x = 4 + hash(i, 1, 9) * 50, y = hash(i, 2, 9) * 34; if (pb.get(x, y)) pb.set(x, y, SAND[1]); }
  pb.outline('#5a4a34');
  // abgeschnittenes, ausgefranstes Seil im Sand neben dem Handgelenk
  for (let k = 0; k < 22; k++) { const x = 118 + k, y = 76 - k * .25 + Math.sin(k * .6) * .8; pb.set(x, y, k % 3 ? '#c2a774' : '#8e7650'); pb.set(x, y + 1, k % 3 ? '#a68d5e' : '#6f5c3e'); }
  for (let k = 0; k < 4; k++) pb.set(117 - k, 76 + (k % 2 ? -1 : 1) * Math.ceil(k / 2), '#c2a774');
  ctx.drawImage(pb.canvas(), 0, 0);
  return sand;
}

// o = 0 Faust (Zettel darin), 1 offen
function buildHand(o) {
  const pb = new PB(170, 96);
  // Mantelärmel (grün) mit Aufschlag und zwei Messingknöpfen
  capsule(pb, ...at(-33, 0), ...at(-90, 6), 13, 15, COAT, { fn: (x, y, u) => (Math.floor(u * 40) % 9 === 0 ? COAT[3] : null) });
  capsule(pb, ...at(-33, 0), ...at(-40, 1), 13.5, 14, COAT, { bias: .25 });
  for (const q of [-7, 6]) { const [bx, by] = at(-38, q); pb.rect(Math.round(bx), Math.round(by), 2, 2, BRASS[1]); pb.set(Math.round(bx), Math.round(by), BRASS[0]); pb.set(Math.round(bx) + 1, Math.round(by) + 1, BRASS[2]); }
  // Handgelenk mit Seilspuren (zwei Windungen, gedrehtes Muster)
  capsule(pb, ...at(-31, 0), ...at(-12, 0), 9, 10.5, SKIN, {
    noise: .2, seed: 4,
    fn: (x, y, u, nx, ny, l) => {
      const s = -31 + u * 19, band = (s > -27 && s < -24) || (s > -22.5 && s < -20);
      if (!band) return null;
      const twist = Math.floor(s * 2 + nx * 4 + ny * 2) % 3 === 0;
      return ROPE[clamp((twist ? 1 : 0) + (l < -.1 ? 1 : 0), 0, 2)];
    }
  });
  // Handfläche, Handlinien und der Zettel darauf (offene Hand: erst nach den Fingern, damit die Finger aus der Handfläche wachsen)
  const open = o > .9;
  const palm = () => {
    // Handfläche
    capsule(pb, ...at(-8, 0), ...at(6, 0), 13, 14, SKIN, { noise: .25, seed: 5 });
    // Handlinien
    curve(pb, ...at(4, 12), ...at(-2, 2), ...at(-8, -10), (k) => k % 4 === 3 ? null : SKIN[2]);
    curve(pb, ...at(9, 13), ...at(6, 2), ...at(7, -12), (k) => k % 5 === 4 ? null : SKIN[2]);
    // der nasse Zettel auf der Handfläche (zerknüllt), mit rotem Fleck vom Siegel
    const [zx, zy] = at(4, -1), rx = 9 + o * 4, ry = 6 + o * 2;
    if (o >= .3) for (let y = Math.floor(zy - ry - 2); y <= zy + ry + 2; y++) for (let x = Math.floor(zx - rx - 2); x <= zx + rx + 2; x++) {
      const a = Math.atan2(y - zy, x - zx), r = 1 + (hash(Math.round(a * 4), 2, 7) - .5) * .35;
      const e = Math.pow((x + .5 - zx) / (rx * r), 2) + Math.pow((y + .5 - zy) / (ry * r), 2);
      if (e > 1) continue;
      const fold = Math.sin((x - y) * .9 + vnoise(x / 3, y / 3, 3) * 3);
      let c = PAPER[fold > .55 ? 0 : fold < -.6 ? 3 : (bay(x, y) < .35 ? 2 : 1)];
      if (hash(x >> 1, y, 12) < .08 && e < .7) c = INK_B;                           // verlaufene Schrift
      if (Math.hypot(x - (zx + rx * .5), y - (zy + ry * .35)) < 2.2) c = hash(x, y, 2) < .4 ? '#7e2219' : '#a83428';   // Siegel
      pb.set(x, y, c);
    }
  };
  if (!open) palm();
  // Finger: Grundglied und Endglied, bei der Faust über die Handfläche geklappt; Ring am Ringfinger
  const F = [{ q: 9.4, len: 29, r: 3.1 }, { q: 3.1, len: 32, r: 3.3 }, { q: -3.2, len: 30, r: 3.1, ring: true }, { q: -9.2, len: 24, r: 2.8 }];
  const segs = F.map((f, i) => {
    const b = at(15, f.q), fan = (1.5 - i) * .15 * o;
    const d1 = rot(HD[0], HD[1], fan), L1 = f.len * .5 * (.4 + .6 * o);
    const p1 = [b[0] + d1[0] * L1, b[1] + d1[1] * L1];
    const d2 = rot(d1[0], d1[1], (1 - o) * 2.95), L2 = f.len * .5 * (.55 + .45 * o);
    const p2 = [p1[0] + d2[0] * L2, p1[1] + d2[1] * L2];
    return { f, b, p1, p2, d1 };
  });
  // Grundglieder; am Ringfinger ein schwerer Ring: breites Band über den Finger, dunkelgrüner Stein mit Lichtpunkt
  const RP = .5;
  // jedes Glied auf eigener Ebene mit Innenkontur, damit die Finger getrennt bleiben (erst Grund-, dann Endglieder, kleiner Finger zuerst)
  const part = (draw) => { const q = new PB(pb.w, pb.h); draw(q); q.outline('#7a4636'); q.p.forEach((c, i) => { if (c) pb.p[i] = c; }); };
  if (open) openFingers(); else {
  for (const s of segs.slice().reverse()) part(q => {
    const L1 = Math.hypot(s.p1[0] - s.b[0], s.p1[1] - s.b[1]) || 1, half = 2 / L1;
    capsule(q, ...s.b, ...s.p1, s.f.r, s.f.r * .95, SKIN, {
      noise: .2, seed: 6,
      fn: s.f.ring ? (x, y, u, nx, ny, l) => Math.abs(u - RP) < half ? GOLD[clamp(Math.round(1.2 - l * 1.4 + (Math.abs(u - RP) > half * .6 ? 1 : 0)), 0, 3)] : null : null
    });
    if (s.f.ring) {
      const rx = Math.round(lerp(s.b[0], s.p1[0], RP) + HP[0] * .4), ry = Math.round(lerp(s.b[1], s.p1[1], RP) + HP[1] * .4);
      q.rect(rx - 1, ry - 1, 3, 3, GOLD[3]); q.rect(rx - 1, ry - 1, 2, 2, '#2c6a4a'); q.set(rx - 1, ry - 1, '#9ad4b4'); q.set(rx, ry, '#173826');
    }
  });
  for (const s of segs.slice().reverse()) part(q => {
    capsule(q, ...s.p1, ...s.p2, s.f.r * .95, s.f.r * .82, SKIN, { noise: .2, seed: 7, bias: o < .5 ? -.1 : 0 });
    if (o > .5) { const [kx, ky] = s.p1; q.set(kx, ky, SKIN[2]); q.set(kx + 1, ky, SKIN[2]); }   // Gelenkfalte
  });
  }
  // offene Hand: jeder Finger in einem Stück (Grund-, Mittel-, Endglied mit feinen Gelenkfalten), flach gewölbt,
  // der Ansatz liegt unter der Handfläche; zwischen Fingern nur eine weiche Fuge, an der Handfläche die Beugefalte
  function openFingers() {
    const soft = (q) => { const t = new PB(pb.w, pb.h); q(t); t.outline('#a06a54'); t.p.forEach((c, i) => { if (c) pb.p[i] = c; }); };
    for (const sg of segs.slice().reverse()) soft(q => {
      const b0 = [sg.b[0] - sg.d1[0] * 4, sg.b[1] - sg.d1[1] * 4], r = sg.f.r;
      const L1 = Math.hypot(sg.p1[0] - b0[0], sg.p1[1] - b0[1]) || 1, half = 2.6 / L1, rp = (4 + (L1 - 4) * RP) / L1;
      capsule(q, ...b0, ...sg.p1, r * 1.05, r * .95, SKIN, {
        soft: .55, noise: .15, seed: 6, bias: .05,
        fn: sg.f.ring ? (x, y, u, nx, ny, l) => Math.abs(u - rp) < half ? GOLD[clamp(Math.round(1.2 - l * 1.4 + (Math.abs(u - rp) > half * .6 ? 1 : 0)), 0, 3)] : null : null
      });
      capsule(q, ...sg.p1, ...sg.p2, r * .95, r * .85, SKIN, { soft: .55, noise: .15, seed: 7, bias: .1 });
      // Fingerkuppe etwas heller, Gelenkfalten quer (Grund-/Mittelglied und Mittel-/Endglied)
      const tip = [lerp(sg.p1[0], sg.p2[0], .82), lerp(sg.p1[1], sg.p2[1], .82)];
      q.set(tip[0] - 1, tip[1], SKIN[0]); q.set(tip[0], tip[1] - 1, SKIN[0]);
      for (const u of [0, .45]) {
        const cx = lerp(sg.p1[0], sg.p2[0], u), cy = lerp(sg.p1[1], sg.p2[1], u);
        for (let k = -1; k <= 1; k++) q.set(cx + HP[0] * k, cy + HP[1] * k, SKIN[2]);
      }
      if (sg.f.ring) {
        const rx = Math.round(lerp(b0[0], sg.p1[0], rp) + HP[0] * .4), ry = Math.round(lerp(b0[1], sg.p1[1], rp) + HP[1] * .4);
        q.rect(rx - 1, ry - 1, 3, 3, GOLD[3]); q.rect(rx - 1, ry - 1, 2, 2, '#2c6a4a'); q.set(rx - 1, ry - 1, '#9ad4b4'); q.set(rx, ry, '#173826');
      }
    });
    palm();
    // Beugefalte am Fingeransatz: entlang des Randes der Handfläche, mit Lücken
    for (let q = -11; q <= 11; q += .5) {
      const e = 6 + Math.sqrt(Math.max(0, 14 * 14 - q * q * 1.15)) - 1.5, [x, y] = at(e, q);
      if (hash(Math.round(q * 2), 1, 3) < .25) continue;
      pb.set(x, y, SKIN[2]);
    }
  }
  // Daumen: offen zur Seite, bei der Faust quer über die Finger
  const ta = lerp(-3.55, -1.95, o), tb = at(-2, 12), t1 = [tb[0] + Math.cos(ta) * 9, tb[1] + Math.sin(ta) * 9];
  const ta2 = ta + (1 - o) * -.4, t2 = [t1[0] + Math.cos(ta2) * 8, t1[1] + Math.sin(ta2) * 8];
  const thumb = (q) => { capsule(q, ...tb, ...t1, 5, 4.2, SKIN, { noise: .2, seed: 8, bias: .1, soft: open ? .6 : 1 }); capsule(q, ...t1, ...t2, 4.1, 3.4, SKIN, { noise: .2, seed: 9, bias: .1, soft: open ? .6 : 1 }); };
  if (open) { const q = new PB(pb.w, pb.h); thumb(q); q.outline('#a06a54'); q.p.forEach((c, i) => { if (c) pb.p[i] = c; }); } else part(thumb);
  // bei der Faust: Ecke des Zettels zwischen Daumen und Zeigefinger
  if (o < .3) { const [cx, cy] = at(16, 13); for (let k = 0; k < 4; k++) pb.rect(Math.round(cx) - k, Math.round(cy) + k - 3, 1 + k, 1, k === 0 ? PAPER[3] : PAPER[k % 2]); }
  pb.outline('#2e1d16');
  // Schatten auf dem Sand (Licht von links oben)
  const sh = new PB(pb.w, pb.h);
  for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) if (!pb.get(x, y) && pb.get(x - 3, y - 2) && bay(x, y) < .75) sh.set(x, y, '#9c8d6c');
  const out = sh.canvas();
  out.getContext('2d').drawImage(pb.canvas(), 0, 0);
  return out;
}

/* ---------- Großaufnahme: der nasse Zettel (210×170, 2× gezeichnet, Kamera fährt ans Siegel) ---------- */
const NOTE_X0 = 16, NOTE_X1 = 176, NOTE_Y0 = 6, NOTE_Y1 = 160;
const SEAL_X = 120, SEAL_Y = 96;           // Lage des Siegels (links oben)
function buildNote(sand) {
  const pb = new PB(sand.width, sand.height);
  const edgeL = (y) => NOTE_X0 + Math.round((vnoise(y / 7, 1, 4) - .5) * 3), edgeR = (y) => NOTE_X1 + Math.round((vnoise(y / 7, 2, 4) - .5) * 3);
  const edgeT = (x) => NOTE_Y0 + Math.round(vnoise(x / 5, 3, 4) * 6 + (hash(x, 0, 5) < .2 ? 1 : 0));   // abgerissen
  const edgeB = (x) => NOTE_Y1 + Math.round((vnoise(x / 8, 4, 4) - .5) * 3);
  for (let y = NOTE_Y0; y < NOTE_Y1 + 3; y++) for (let x = NOTE_X0 - 2; x < NOTE_X1 + 3; x++) {
    if (x < edgeL(y) || x > edgeR(y) || y < edgeT(x) || y > edgeB(x)) continue;
    // Knicke: zwei Falten, eine Seite heller; nasse Flecken dunkler, mit Rand
    const f1 = (x - NOTE_X0) * .45 - (y - 70), f2 = (x - 100) + (y - NOTE_Y0) * .2;
    let l = .3 + (bay(x, y) - .5) * .35;
    if (Math.abs(f1) < 1.2) l += f1 < 0 ? .6 : -.7; else if (f1 > 0 && f1 < 6) l -= .15;
    if (Math.abs(f2) < 1) l += f2 < 0 ? .5 : -.6;
    const wet = fbm(x / 26, y / 20, 44, 3);
    if (wet > .58) l -= .55; else if (wet > .55) l -= 1;                         // Wasserrand
    l += (vnoise(x / 2, y / 2, 9) - .5) * .25;
    pb.set(x, y, pick(PAPER, l));
  }
  // weggewaschene Zeilen oben (nicht mehr lesbar)
  for (const [yy, x0, x1] of [[22, 34, 150], [32, 34, 136]]) for (let x = x0; x < x1; x++) {
    const v = vnoise(x / 3, yy, 6);
    if (v < .42 || hash(x, yy, 3) < .3) continue;
    pb.set(x, yy + Math.round(Math.sin(x * .7) * 1.4), v > .7 ? INK_B : '#9aa0ae');
    if (v > .65 && hash(x, yy, 4) < .5) pb.set(x, yy + 1 + Math.round(Math.sin(x * .7) * 1.4), '#b3b6bc');
  }
  // lesbar: „…Leuchtfeuer sofort / entzünden. / Gez. …“ (am Anfang und in der Unterschrift verwischt)
  const smear = (x, y) => clamp(1 - (x - 30) / 16, 0, 1) * .5;
  write(pb, '…Leuchtfeuer sofort', 30, 44, smear);
  write(pb, 'entzünden.', 32, 56);
  write(pb, 'Gez. …', 38, 76, (x, y) => x > 58 ? .6 : 0);
  // Unterschrift: verwischter Schnörkel
  for (let x = 66; x < 104; x++) { const y = 80 + Math.round(Math.sin(x * .35) * 2.2 + Math.sin(x * .11) * 2); if (hash(x, 1, 8) < .7) pb.set(x, y, hash(x, 2, 8) < .5 ? INK_B : '#9aa0ae'); }
  bleed(pb, 26, 40, 140, 50);
  // Wassertropfen (Glanzpunkt, Schatten darunter)
  for (const [x, y] of [[60, 104], [148, 60], [96, 128], [44, 132], [158, 118]]) { pb.set(x, y, '#ffffff'); pb.set(x + 1, y, PAPER[0]); pb.set(x, y + 1, PAPER[2]); pb.set(x + 1, y + 1, PAPER[3]); }
  pb.outline('#6d6656');
  const cv = sand, ctx = cv.getContext('2d');
  // Schatten des Papiers
  ctx.fillStyle = 'rgba(120,104,74,.45)';
  for (let y = NOTE_Y0 + 3; y < NOTE_Y1 + 5; y++) ctx.fillRect(edgeR(y) + 2, y, 2, 1);
  for (let x = NOTE_X0 + 3; x < NOTE_X1 + 4; x++) ctx.fillRect(x, edgeB(x) + 2, 1, 2);
  ctx.drawImage(pb.canvas(), 0, 0);
  ctx.drawImage(siegel('wachs'), SEAL_X, SEAL_Y);
  // Daumen am linken Rand, der den Zettel hält
  const th = new PB(40, 50);
  capsule(th, -6, 46, 20, 24, 9, 7, SKIN, { rim: true, noise: .2, seed: 3, bias: .1 });
  th.rect(13, 22, 5, 3, '#e8d0c0'); th.set(13, 22, '#f6e6da');      // Nagel
  th.outline('#2e1d16');
  ctx.drawImage(th.canvas(), 0, 104);
  return cv;
}

/* ---------- Sturm (Einstellung 1) ---------- */
const swell = (x, t, k) => Math.sin(x * .021 + t * 1.25 + k) * 7 + Math.sin(x * .053 - t * 1.9 + k * 2) * 3 + Math.sin(x * .11 + t * 2.7) * 1.2;
function rainStorm(ctx, t, n, col) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const sp = 300 + hash(i, 1, 4) * 90, y = ((hash(i, 2, 4) * 230 + t * sp) % 230) - 25;
    const x = ((hash(i, 3, 4) * 400 - y * .45 - t * 40) % 380 + 380) % 380 - 30;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 4 + (i % 3)); ctx.fillRect(Math.round(x) - 1, Math.round(y) + 3, 1, 3);
  }
}
function renderStorm(ctx, t) {
  const fl = lightningFlash(t - T_BOLT), bob = Math.round(Math.sin(t * .9) * 3);
  ctx.fillStyle = NIGHT[4]; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(L.skyDark, 0, bob);
  ctx.drawImage(L.seaDark, 0, HOR_S + bob);
  if (fl > 0) {
    ctx.globalAlpha = Math.min(1, fl);
    ctx.drawImage(L.skyLit, 0, bob); ctx.drawImage(L.seaLit, 0, HOR_S + bob);
    ctx.globalAlpha = 1;
  }
  ctx.save(); ctx.translate(0, bob);
  drawLightning(ctx, t - T_BOLT, BOLT);
  ctx.restore();
  // hintere Dünung (Schattenriss), Boot darauf, vordere Wellen; Kämme fangen etwas Licht
  const crest = fl > .05 ? `rgba(200,208,240,${Math.min(1, fl * .9)})` : 'rgba(40,52,66,.8)';
  const back = (x) => HOR_S + 10 + bob + swell(x, t, 0) * .6;
  for (let x = 0; x < W; x++) {
    const y = Math.round(back(x));
    ctx.fillStyle = SIL; ctx.fillRect(x, y, 1, H - y);
    if (hash(x, Math.floor(t * 6), 3) < .5 || fl > .05) { ctx.fillStyle = crest; ctx.fillRect(x, y, 1, 1); }
  }
  const bx = 150, by = back(bx), slope = back(bx + 6) - back(bx - 6);
  const k = clamp(Math.round(slope / 4 + 1.5), 0, 3);
  ctx.drawImage(L.boat[k], Math.round(bx - 32), Math.round(by - 43));
  for (let x = 0; x < W; x++) {
    const y = Math.round(HOR_S + 40 + bob + swell(x + 90, t * 1.2, 2) * 1.3);
    ctx.fillStyle = SIL; ctx.fillRect(x, y, 1, H - y);
    if (hash(x, Math.floor(t * 8), 5) < .35 || fl > .05) { ctx.fillStyle = crest; ctx.fillRect(x, y, 1, 1); }
    if (fl > .3 && hash(x, 9, 6) < .25) { ctx.fillStyle = `rgba(220,226,250,${fl * .6})`; ctx.fillRect(x, y - 1, 1, 1); }   // Gischt
  }
  rainStorm(ctx, t, 170, fl > .05 ? `rgba(215,222,250,${.25 + fl * .5})` : 'rgba(70,82,96,.55)');
}

/* ---------- Morgen am Strand (Einstellung 2) ---------- */
const WRECK_X = 262, WRECK_Y = 102, FIG_X = 196;
const GULLS = [{ x0: -40, y: 34, v: 26, ph: 0 }, { x0: 60, y: 22, v: 19, ph: 1.3 }, { x0: 160, y: 46, v: 31, ph: 2.1 }];
// Spülsaum: Welle läuft den Strand hinauf und zieht sich zurück (Pixelzeile y je Spalte)
const swash = (x, t) => shore(x) + 3 - Math.max(0, Math.sin(t * 1.1 + x * .006)) * 4 - Math.round(vnoise(x / 9, t * .5, 2) * 1.5);
function renderBeach(ctx, t, cam) {
  ctx.drawImage(L.beachSky, Math.round(cam * .25), 0, W, HOR_B, 0, 0, W, HOR_B);
  glow(ctx, 70 - cam * .25, 30, 70, .35, '255,252,240');           // tief stehende Sonne hinter Dunst
  ctx.drawImage(L.beachSea, 0, HOR_B);
  // kleine Wellen auf dem Meer
  for (let row = 0, y = HOR_B + 2; y < 128; row++) {
    const f = (y - HOR_B) / 44;
    for (let i = 0; i < 20; i++) {
      const x = ((i * 23 + hash(row, i, 8) * 18 - cam * (.4 + f * .5) - t * (2 + f * 4)) % 360 + 360) % 360 - 20;
      if (Math.sin(t * 1.3 + i + row) < -.3) continue;
      ctx.fillStyle = f < .4 ? '#e2eeee' : '#d3e6e6'; ctx.fillRect(Math.round(x), y, Math.round(2 + f * 5 * hash(row, i, 9)), 1);
    }
    y += 2 + Math.floor(f * 3);
  }
  const ox = Math.round(-cam);
  ctx.drawImage(L.beachSand, ox, 0);
  // Spülsaum: Wasserfilm und Schaumkante
  for (let sx = 0; sx < W; sx++) {
    const x = sx - ox, s = shore(x), fy = swash(x, t);
    if (fy > s) { ctx.fillStyle = 'rgba(150,196,200,.55)'; ctx.fillRect(sx, s, 1, Math.round(fy - s)); }
    ctx.fillStyle = FOAM; ctx.fillRect(sx, Math.round(fy), 1, 1);
    if (hash(x, Math.floor(t * 4), 2) < .45) ctx.fillRect(sx, Math.round(fy) - 1, 1, 1);
    if (hash(x, Math.floor(t * 3), 4) < .2) { ctx.fillStyle = '#e4f0ee'; ctx.fillRect(sx, Math.round(fy) + 1, 1, 1); }
  }
  // Gestalt im Spülsaum, Wrack (Sand davor verdeckt den Kiel)
  ctx.drawImage(L.figure, FIG_X + ox, Math.round(shore(FIG_X)) + 4);
  ctx.drawImage(L.wreck, WRECK_X + ox, WRECK_Y);
  ctx.drawImage(L.beachSand, WRECK_X - 4, 140, WR_W + 8, H - 140, WRECK_X - 4 + ox, 140, WR_W + 8, H - 140);
  ctx.fillStyle = SAND[2];
  for (let x = WRECK_X - 2; x < WRECK_X + WR_W + 2; x++) if (hash(x, 3, 3) < .5) ctx.fillRect(x + ox, 140, 1, 1);
  // Möwe auf dem Heck, Möwen in der Luft
  ctx.drawImage(L.gulls.sit[Math.floor(t * 1.4) % 7 === 0 ? 1 : 0], WRECK_X + L_WR.hx + 10 + ox, WRECK_Y + L_WR.hy - 7);
  for (const G of GULLS) {
    const x = ((G.x0 + t * G.v - cam * .6) % 420 + 420) % 420 - 50, y = G.y + Math.sin(t * .8 + G.ph) * 4;
    ctx.drawImage(L.gulls.fly[[0, 1, 2, 1][Math.floor(t * 6 + G.ph * 3) % 4]], Math.round(x), Math.round(y));
  }
}
// Einstellung 2b: näher ans Heck (dreifache Pixelgröße), Himmel und Meer bleiben fein; die Möwe fliegt auf
const CW = 112, CHT = 60;                                   // Ausschnitt um das Heck (Weltkoordinaten des Strands)
const cropX = () => WRECK_X + L_WR.hx - 52, cropY = () => WRECK_Y + L_WR.hy - 20;
function buildWreckClose() {
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CHT;
  const c = cv.getContext('2d'), x0 = cropX(), y0 = cropY();
  c.drawImage(L.beachSand, -x0, -y0);
  c.drawImage(L.wreck, WRECK_X - x0, WRECK_Y - y0);
  c.drawImage(L.beachSand, x0, 140, CW, H - 140, 0, 140 - y0, CW, H - 140);
  c.fillStyle = SAND[2];
  for (let x = 0; x < CW; x++) if (hash(x + x0, 3, 3) < .5) c.fillRect(x, 140 - y0, 1, 1);
  return cv;
}
function renderWreck(ctx, t, lt) {
  const S = 3, drift = Math.round(lt * 2.5), HZ = 44, x0 = cropX(), y0 = cropY();
  ctx.drawImage(L.beachSky, BW - W, HOR_B - HZ, W, HZ, 0, 0, W, HZ);
  ctx.drawImage(L.beachSea, 0, 0, W, H - HOR_B, 0, HZ, W, H - HOR_B);
  ctx.drawImage(L.beachSea, 0, H - HOR_B - 1, W, 1, 0, HZ + H - HOR_B, W, H);
  for (let row = 0, y = HZ + 2; y < 100; row++) {
    const f = (y - HZ) / 56;
    for (let i = 0; i < 16; i++) {
      const x = ((i * 27 + hash(row, i, 8) * 20 - t * (4 + f * 6)) % 360 + 360) % 360 - 20;
      if (Math.sin(t * 1.4 + i + row) < -.2) continue;
      ctx.fillStyle = '#e2eeee'; ctx.fillRect(Math.round(x), y, Math.round(2 + f * 6 * hash(row, i, 9)), 1);
    }
    y += 2 + Math.floor(f * 3);
  }
  // Spülsaum in dreifacher Pixelgröße (hinter dem Wrack)
  for (let cx = 0; cx < CW; cx++) {
    const x = cx + x0, s = shore(x), fy = swash(x, t), sx = cx * S - drift;
    if (fy > s) { ctx.fillStyle = 'rgba(150,196,200,.55)'; ctx.fillRect(sx, (s - y0) * S, S, Math.round(fy - s) * S); }
  }
  ctx.drawImage(L.wreckClose, 0, 0, CW, CHT, -drift, 0, CW * S, CHT * S);
  for (let cx = 0; cx < CW; cx++) {
    const x = cx + x0, fy = Math.round(swash(x, t)), sx = cx * S - drift;
    if (wreckAt(x - WRECK_X, fy - WRECK_Y) || wreckAt(x - WRECK_X, fy - 1 - WRECK_Y)) continue;   // hinter dem Wrack kein Schaum
    ctx.fillStyle = FOAM; ctx.fillRect(sx, (fy - y0) * S, S, S);
    if (hash(x, Math.floor(t * 4), 2) < .45) ctx.fillRect(sx, (fy - y0 - 1) * S, S, S);
  }
  // Möwe: sitzt auf dem Heckbrett, fliegt bei 1,1 s auf
  const gx = (WRECK_X + L_WR.hx + 10 - x0) * S - drift, gy = (WRECK_Y + L_WR.hy - 7 - y0) * S;
  if (lt < 2) ctx.drawImage(L.gulls.sit[lt > 1.2 && lt < 1.4 ? 1 : 0], 0, 0, 9, 8, gx, gy, 27, 24);
  else {
    const u = lt - 2, f = L.gulls.fly[[0, 1, 2, 1][Math.floor(u * 9) % 4]];
    ctx.drawImage(f, 0, 0, 9, 4, Math.round(gx + u * 120), Math.round(gy - u * 26 - u * u * 8), 27, 12);
  }
}

/* ---------- Großaufnahmen (Einstellungen 3 und 4) ---------- */
function renderHand(ctx, t, lt) {
  const px = Math.round(ease(lt / 4) * 6);                 // langsame Fahrt nach links oben
  ctx.drawImage(L.handBg, px, px >> 1, 160, 90, 0, 0, 320, 180);
  const k = lt < 1.3 ? 0 : lt < 2 ? 1 : 2;                  // Faust → halb → offen
  const tw = k === 2 && lt > 3 && lt < 3.15 ? 1 : 0;       // Finger zucken kurz
  ctx.drawImage(L.hand[k], px - tw, (px >> 1), 160, 90, 0, 0, 320, 180);
  // Schatten einer Möwe zieht über den Sand
  const sx = 340 - lt * 150, sy = 40 + lt * 18;
  ctx.fillStyle = 'rgba(70,60,40,.25)';
  ctx.fillRect(Math.round(sx), Math.round(sy), 10, 2); ctx.fillRect(Math.round(sx) - 6, Math.round(sy) - 2, 6, 2); ctx.fillRect(Math.round(sx) + 10, Math.round(sy) - 2, 6, 2);
  // Funkeln im nassen Sand
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 6; i++) if (Math.sin(t * 5 + i * 2.3) > .85) ctx.fillRect(Math.round(hash(i, 1, 3) * 320) & ~1, Math.round(hash(i, 2, 3) * 180) & ~1, 2, 2);
}
const NOTE_CAM0 = [0, 22], NOTE_CAM1 = [SEAL_X + 12 - 80, SEAL_Y + 12 - 45];
function renderNote(ctx, t, lt) {
  const u = ease((lt - 2.4) / 2.6);                            // erst lesen, dann ans Siegel
  const ox = Math.round(lerp(NOTE_CAM0[0], NOTE_CAM1[0], u)), oy = Math.round(lerp(NOTE_CAM0[1], NOTE_CAM1[1], u));
  ctx.drawImage(L.note, ox, oy, 160, 90, 0, 0, 320, 180);
  // Glanz auf dem nassen Wachs
  if (Math.sin(t * 3) > .3) { ctx.fillStyle = 'rgba(255,230,220,.7)'; ctx.fillRect((SEAL_X + 5 - ox) * 2, (SEAL_Y + 6 - oy) * 2, 2, 2); }
}

/* ---------- Titel: „Tideworks“ über einer Wasserlinie ---------- */
function renderTitle(ctx, t, lt) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const logo = SPR.logo && SPR.logo.cv;
  const a = clamp((lt - .8) / 1.6, 0, 1) * clamp((T_END - .6 - t) / 1.2, 0, 1);
  if (a <= 0) return;
  const WL = 112;
  ctx.globalAlpha = a;
  if (logo) {
    const lw = logo.width * 2, lh = logo.height * 2, x = Math.round((W - lw) / 2), y = WL - lh - 6;
    ctx.drawImage(logo, 0, 0, logo.width, logo.height, x, y, lw, lh);
    // Spiegelung im Wasser (Zeile für Zeile, leicht wellig)
    ctx.globalAlpha = a * .22;
    for (let r = 0; r < 24; r++) ctx.drawImage(logo, 0, logo.height - 1 - (r >> 1), logo.width, 1, x + Math.round(Math.sin(r * .8 + t * 2.4) * 1.5), WL + 2 + r, lw, 1);
    ctx.globalAlpha = a;
  }
  // Wasserlinie
  for (let x = 40; x < 280; x++) {
    const e = Math.min(x - 40, 280 - x) / 40, on = hash(x, Math.floor(t * 4 + x * .05), 3) < .75;
    if (bay(x, WL) > e * 1.6 || !on) continue;
    ctx.fillStyle = (Math.floor(x / 6 + t * 3) % 4 === 0) ? '#d9f0f4' : '#6cc0e8';
    ctx.fillRect(x, WL, 1, 1);
  }
  ctx.globalAlpha = 1;
}

const vig = (ctx, img, a) => { ctx.globalAlpha = a; ctx.drawImage(img, 0, 0); ctx.globalAlpha = 1; };
const beachCam = (t) => 92 * ease((t - T_BEACH) / (T_WRECK - T_BEACH));

export default {
  id: 'cs_prolog',
  title: 'Gestrandet',
  len: T_END,
  dialog: null,
  cold: true,                 // läuft beim Spielstart vor dem ersten Bild der Karte: ohne Abblende des Spielbilds
  setup,
  shots: [
    // Einstellung 1: Sturm, fast schwarz; ein einziger Blitz zeigt das Boot (eine Kamerabewegung: das Auf und Ab der See)
    { from: 0, to: T_BEACH, draw(ctx, lt, t) {
      renderStorm(ctx, t);
      vig(ctx, L.vigDark, .75 - lightningFlash(t - T_BOLT) * .45);
      black(ctx, 1 - t / 3);
    } },
    // Einstellung 2: harter Schnitt zum Morgen, Fahrt am Strand entlang zum Wrack
    { from: T_BEACH, to: T_WRECK, draw(ctx, lt, t) {
      renderBeach(ctx, t, beachCam(t));
      vig(ctx, L.vigDay, .4);
    } },
    // Einstellung 2b: das Wappen am Heck, die Möwe fliegt auf
    { from: T_WRECK, to: T_HAND, draw(ctx, lt, t) {
      renderWreck(ctx, t, lt);
      vig(ctx, L.vigDay, .4);
    } },
    // Einstellung 3: Großaufnahme der Hand, sie öffnet sich
    { from: T_HAND, to: T_NOTE, draw(ctx, lt, t) {
      renderHand(ctx, t, lt);
      vig(ctx, L.vigSand, .45);
    } },
    // Einstellung 4: der Zettel, Kamera fährt ans Siegel; Abblende
    { from: T_NOTE, to: T_TITLE, draw(ctx, lt, t) {
      renderNote(ctx, t, lt);
      vig(ctx, L.vigSand, .45);
      black(ctx, (t - T_FADE) / 1);
    } },
    // Titel
    { from: T_TITLE, to: T_END, draw(ctx, lt, t) { renderTitle(ctx, t, lt); } }
  ],
  dialogBg(ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
};
// Für cs_wahrheit (Bild 8): dasselbe Boot als Schattenriss
export { buildBoatSil };
