/* =========================================================
   CUTSCENE cs_bauplan „Der Bauplan“ (Ende Akt 1: Gespräch mit Brann, nachdem alle drei Völker entdeckt sind)
   Nach docs/STORY.md; ruhiger als dort angegeben (Max' Wunsch: jede Einstellung braucht Zeit).
   Abends in Branns Werkstatt, warmes Lampenlicht: Kamera gleitet vom Fenster (Dämmerung über der Bucht) zur Werkbank unter der
   Hängelampe, Brann legt eine Rolle auf die Bank (0–7,5 s) · Großaufnahme im Lampenlicht: er sieht dich an, dann auf den Plan
   (7,5–12 s) · von oben: Brann entrollt den großen, vergilbten Bauplan (12–19,5 s) · Kamera fährt über die Zeichnung des
   Leuchtturms vom Fels bis zur Lampe (19,5–26,5 s) · in der Ecke das verblasste Siegel, dasselbe wie auf dem Zettel aus dem
   Prolog (26,5–32 s), Abblende bis 33,2 s. Danach Dialog brann_bauplan an der Werkbank.
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, vnoise, fbm, PB, pick, layer, canvas, vignette as makeVignette, disc, glow, black } from '../cutscene/kit.js';
import { portrait } from '../gfx/portraits.js';
import { siegel, SIEGEL_SIZE } from '../cutscene/motifs.js';

const T_CLOSE = 7.5, T_TABLE = 12, T_PAN = 19.5, T_SEAL = 26.5, T_FADE = 32, T_END = 33.2;

/* ---------- Farbpaletten: Abend, Öllampe; draußen blaue Dämmerung ---------- */
const DUSK = ['#1d2140', '#282c52', '#3a3b62', '#58496a', '#86596a', '#b86e5e', '#d88d5c'];   // Fenster: oben → Horizont
const ISLE_D = '#241f38', SEA_D = ['#3a3d62', '#2c2f50', '#21243e'];
const BRICK = ['#b0663f', '#87482f', '#5f3324', '#3e211a', '#261411'];       // im Lampenlicht → Schatten
const WOOD = ['#bd8549', '#916133', '#674322', '#432a16', '#28180d'];
const IRON = ['#9a928a', '#6e6862', '#4a4541', '#2d2927'];
const PAPER = ['#f4e2a6', '#e2c98a', '#cbad6c', '#a98950', '#806238'];       // vergilbt
const INK = '#4e301c', INK_F = '#866038', INK_R = '#9a4a32';                  // Tinte (Sepia, verblasst, rötlich)
const SKIN = ['#f6bc86', '#d8915e', '#ab663e', '#7c4428', '#4c2816'];         // Brann im Lampenlicht (Unterarme von oben)
const SKIN_B = ['#e8b48c', '#cb8e68', '#a66b4a', '#744530'];                  // Brann (wie das Porträt), wird abgedunkelt
const SHIRT = ['#e4d9c2', '#c6b99f', '#a1957c', '#786c58'];
const LEATHER = ['#b77c47', '#945d33', '#6f4325', '#4b2b17'];
const BEARD = ['#6c5242', '#503c30', '#3b2b22', '#281c16'];
const HAIR_B = ['#5a4638', '#3b2d24'];
const FLAME = ['#fffbe0', '#ffe28a', '#ffb44a', '#e0702a'];
const LAMP = '255,196,112', EMBER = '255,110,40', COOL = '120,130,200';
const EDGE = '#1e130d';

/* ---------- Kleine Helfer ---------- */
function line(pb, x0, y0, x1, y1, c) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
  for (let i = 0; i <= n; i++) pb.set(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), typeof c === 'function' ? c(i, n) : c);
}
// Kapsel a→b mit Radius r0→r1, Licht von links oben (wie shadeE)
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
// Stufe aus einer 5er-Rampe: l = 0 hell … 4 dunkel, mit Dithering
const step5 = (r, l, x, y) => r[clamp(Math.round(l + (bay(x, y) - .5) * .9), 0, 4)];
// Abendlicht auf fertige Bilder (Porträt, Figur): Licht lf(x, y) 0–1 in vier geditherten Stufen, warm getönt, Schatten dunkelbraun
function evening(src, lf) {
  const w = src.width, h = src.height, c = canvas(w, h), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  const im = x.getImageData(0, 0, w, h), d = im.data;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const i = (yy * w + xx) * 4;
    if (!d[i + 3]) continue;
    const q = clamp(Math.floor(clamp(lf(xx, yy), 0, 1) * 3 + bay(xx, yy)), 0, 3) / 3;
    d[i] = Math.min(255, d[i] * lerp(.36, 1.06, q)); d[i + 1] = d[i + 1] * lerp(.25, .9, q); d[i + 2] = d[i + 2] * lerp(.24, .68, q);
  }
  x.putImageData(im, 0, 0);
  return c;
}
// Licht auf vorgerenderten Ebenen: dunkelt nach lf(x, y) in vier geditherten Stufen ab (Farben bleiben, nur dunkler)
function shade(cv, lf) {
  const w = cv.width, h = cv.height, x = cv.getContext('2d'), im = x.getImageData(0, 0, w, h), d = im.data;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const i = (yy * w + xx) * 4;
    if (!d[i + 3]) continue;
    const k = lerp(.42, 1, clamp(Math.floor(clamp(lf(xx, yy), 0, 1) * 3 + bay(xx, yy)), 0, 3) / 3);
    d[i] *= k; d[i + 1] *= k * .97; d[i + 2] *= k * .92;
  }
  x.putImageData(im, 0, 0);
  return cv;
}

/* =========================================================
   STATISCHE EBENEN (setup, einmal je Spiel)
   ========================================================= */
let L = null;
// Einstellung 1: Werkstatt von der Seite (400 breit, Kamera fährt 80 nach rechts)
const RW = 400, FLOOR = 158, BENCH = { x0: 178, x1: 344, top: 134 };
const LAMP_P = [234, 86];                                       // Hängelampe (Mitte des Glases), hängt am Balken
const BEAM_Y = 24, WIN_R = { x: 32, y: 42, w: 78, h: 70 };       // Deckenbalken, Fenster
const BRANN_X = 266;                                            // Brann hinter der Werkbank (Mitte der Figur)
// Einstellungen 3–5: Werkbank von oben, Bauplan
const PX = 82, PY = 22, PW_ = 156, PH_ = 134;                  // Plan auf dem Tisch (Tisch = Bildschirm 320×180)
const RULER_Y = PY - 2;                                         // eisernes Lineal hält die Oberkante
const TL = [160, 84];                                           // Lichtfleck der Lampe auf dem Tisch
const SEAL_P = [PW_ - 35, PH_ - 34];                            // Siegel in der Ecke (Plan-Koordinaten, links oben)
const TOWER = { cx: 52, y0: 34, y1: 112, top: 10, base: 17 };   // Leuchtturm im Plan (Mitte, Höhen, halbe Breiten)

function setup() {
  if (L) return;
  const room = buildRoom();
  L = {
    room, win: buildWindow(),
    table: buildTable(), plan: buildPlan(),
    handL: buildHand(false), handR: buildHand(true),
    closeBG: buildCloseBG(), vig: makeVignette('#140b07', 1.25, .7),
    fig: {}, face: {}
  };
  // Lampenlicht auf Tisch und Plan (Plan in Tisch-Koordinaten verschoben)
  const lt = (x, y) => 1.3 - Math.hypot(x - TL[0], (y - TL[1]) * 1.15) / 165;
  shade(L.table, lt); shade(L.plan, (x, y) => lt(x + PX, y + PY));
  sealOnPlan(L.plan);
  // Brann in der Totale (Licht von der Lampe links oben) und als Porträt im Lampenlicht
  for (const p of ['hold', 'lower', 'lay', 'lean']) L.fig[p] = evening(buildBrann(p), (x, y) => 1.25 - Math.hypot(x - (LAMP_P[0] - BRANN_X + FX), y - (LAMP_P[1] - FLOOR + FH)) / 52);
  const face = portrait('brann');
  for (const e of [0, 2, 3]) L.face[e] = evening(face(e, 0), (x, y) => 1.55 - Math.hypot(x - 8, y + 4) / 95);
}

/* ---------- Die Werkstatt am Abend (Seitenansicht): Ziegelwand, Balken, Fenster, Planregal, Werkzeug, Werkbank, Esse ---------- */
const roomLight = (x, y) => clamp(1.2 - Math.hypot((x - LAMP_P[0]) * .8, (y - LAMP_P[1]) * 1.1) / 150, 0, 1);
function buildRoom() {
  const pb = new PB(RW, H);
  const lv = (x, y, add = 0) => (1 - roomLight(x, y)) * 4 + add;
  // Decke (dunkle Bretter) und Balken
  for (let y = 0; y < BEAM_Y; y++) for (let x = 0; x < RW; x++) pb.set(x, y, step5(WOOD, lv(x, y, .9) + ((x % 23 === 0) ? .8 : 0), x, y));
  for (let y = BEAM_Y; y < BEAM_Y + 7; y++) for (let x = 0; x < RW; x++) pb.set(x, y, y === BEAM_Y + 6 ? WOOD[4] : step5(WOOD, lv(x, y, y === BEAM_Y ? -.6 : .2) + (fbm(x / 9, y / 2, 3, 2) - .5), x, y));
  // Ziegelwand
  for (let y = BEAM_Y + 7; y < FLOOR; y++) for (let x = 0; x < RW; x++) {
    const row = Math.floor((y - BEAM_Y - 7) / 5), off = row % 2 ? 6 : 0;
    if ((y - BEAM_Y - 7) % 5 === 4 || (x + off) % 13 === 12) { pb.set(x, y, step5(BRICK, lv(x, y, 1.3), x, y)); continue; }
    pb.set(x, y, step5(BRICK, lv(x, y) + (hash(Math.floor((x + off) / 13), row, 7) - .5) * .9, x, y));
  }
  // Dielenboden
  for (let y = FLOOR; y < H; y++) for (let x = 0; x < RW; x++) {
    const seam = (x + Math.floor((y - FLOOR) / 6) * 17) % 41 === 0 || (y - FLOOR) % 6 === 0;
    pb.set(x, y, step5(WOOD, lv(x, y, .4) + (seam ? 1 : 0) + (vnoise(x / 14, y, 5) - .5) * .6, x, y));
  }
  // Fensterrahmen und Sims (der Ausschnitt selbst ist durchsichtig, dahinter liegt die Dämmerung)
  const { x: wx, y: wy, w: ww, h: wh } = WIN_R;
  for (let y = wy - 4; y < wy + wh + 4; y++) for (let x = wx - 4; x < wx + ww + 4; x++) pb.set(x, y, step5(WOOD, lv(x, y, x < wx - 2 || y < wy - 2 ? .2 : .8), x, y));
  for (let y = wy; y < wy + wh; y++) for (let x = wx; x < wx + ww; x++) pb.p[y * RW + x] = null;
  for (let y = wy; y < wy + wh; y++) for (const mx of [wx + ww / 2 - 1, wx + ww / 2]) pb.set(mx, y, mx === wx + ww / 2 - 1 ? WOOD[2] : WOOD[3]);
  for (let x = wx; x < wx + ww; x++) { pb.set(x, wy + 34, WOOD[2]); pb.set(x, wy + 35, WOOD[3]); }
  for (let x = wx - 6; x < wx + ww + 6; x++) { pb.set(x, wy + wh + 4, step5(WOOD, lv(x, 0, 1.6), x, 0)); pb.set(x, wy + wh + 5, WOOD[4]); }
  // Ölkanne auf dem Sims
  for (let y = wy + wh - 6; y < wy + wh + 4; y++) for (let x = wx + 60; x < wx + 68; x++) pb.set(x, y, step5(IRON.concat(['#1e1b1a']), (x - wx - 60) * .3 + 1, x, y));
  line(pb, wx + 67, wy + wh - 4, wx + 72, wy + wh - 9, IRON[2]);
  // Planregal: Fächer mit Rollen (Enden als Kreise mit Spirale)
  const RX = 126, RY = 50, CW = 15, CH = 14;
  for (let y = RY; y < RY + CH * 4 + 2; y++) for (let x = RX; x < RX + CW * 3 + 2; x++) {
    const frame = (x - RX) % CW < 2 || (y - RY) % CH < 2;
    pb.set(x, y, frame ? step5(WOOD, lv(x, y, (x - RX) % CW === 0 || (y - RY) % CH === 0 ? 0 : .7), x, y) : step5(WOOD, lv(x, y, 2.2), x, y));
  }
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const n = hash(r, c, 3) < .25 ? 0 : hash(r, c, 4) < .5 ? 2 : 3;
    for (let k = 0; k < n; k++) {
      const cx = RX + c * CW + 5 + (k % 2) * 6, cy = RY + r * CH + 6 + Math.floor(k / 2) * 5 - (n === 2 ? 0 : 1);
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
        if (x * x + y * y > 5) continue;
        const ring = (x * x + y * y > 2) ? 0 : 1;
        pb.set(cx + x, cy + y, step5(PAPER, lv(cx, cy, -1.2) + ring * 1.5 + (x + y > 1 ? .8 : 0), cx + x, cy + y));
      }
    }
  }
  // Werkzeugbrett rechts: Hammer, Säge, Zange, Schraubenschlüssel als Schattenrisse mit Glanzkante
  for (let y = 54; y < 104; y++) for (let x = 300; x < 348; x++) pb.set(x, y, step5(WOOD, lv(x, y, 1.4) + ((x * 3 + y) % 9 === 0 ? .6 : 0), x, y));
  const tool = (pts, c = IRON[3]) => pts.forEach(([x0, y0, x1, y1]) => { for (let x = x0; x < x1; x++) for (let y = y0; y < y1; y++) pb.set(x, y, c); });
  tool([[306, 60, 308, 90], [302, 58, 312, 63]], WOOD[3]); tool([[302, 58, 312, 60]], IRON[1]);                      // Hammer
  tool([[318, 58, 326, 86]]); tool([[318, 58, 320, 86]], IRON[1]); tool([[317, 84, 327, 96]], WOOD[3]);            // Säge
  line(pb, 334, 60, 338, 92, IRON[3]); line(pb, 340, 60, 336, 92, IRON[3]); pb.set(337, 76, IRON[1]);             // Zange
  // Esse rechts: Ziegelherd mit Haube, Glut
  for (let y = 60; y < FLOOR; y++) for (let x = 356; x < RW; x++) {
    const hood = y < 104 && x > 352 + (104 - y) * .1;
    const herd = y > 122;
    if (!hood && !herd) continue;
    pb.set(x, y, (y % 4 === 0 || (x + (y >> 2) * 3) % 8 === 0) ? BRICK[4] : step5(BRICK, lv(x, y, .9), x, y));
  }
  for (let y = 124; y < 134; y++) for (let x = 362; x < 396; x++) pb.set(x, y, y < 126 ? '#3a1a10' : bay(x, y) < .3 ? '#ff9a3a' : hash(x, y, 2) < .5 ? '#c4481a' : '#7a2810');
  // Werkbank: Platte, Schubladen mit Griffen, Schraubstock rechts
  const { x0, x1, top } = BENCH;
  for (let y = top; y < FLOOR; y++) for (let x = x0; x < x1; x++) {
    let l = lv(x, y, y < top + 4 ? -.4 : .6);
    if (y === top) l -= .8;
    if (y === top + 4) l = 4;
    if (y > top + 4 && ((x - x0) % 41 < 2 || (y - top - 5) % 13 === 0)) l += 1.2;
    pb.set(x, y, step5(WOOD, l + (vnoise(x / 6, y / 1.5, 9) - .5) * .5, x, y));
  }
  for (let k = 0; k < 4; k++) for (let r = 0; r < 1; r++) { const hx = x0 + 18 + k * 41, hy = top + 10; pb.rect(hx - 2, hy, 5, 2, IRON[2]); pb.set(hx - 2, hy, IRON[0]); }
  for (let y = top - 9; y < top; y++) for (let x = x1 - 18; x < x1 - 4; x++) pb.set(x, y, y < top - 6 ? IRON[1] : IRON[2]);
  pb.rect(x1 - 20, top - 7, 2, 2, IRON[3]); line(pb, x1 - 24, top - 4, x1 - 18, top - 4, IRON[1]);
  // Dinge auf der Bank: Zahnrad (stehend), Becher, Bleistift
  for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y), a = Math.atan2(y, x), rr = Math.cos(a * 8) > .2 ? 5.5 : 4.3; if (d <= rr && d > 1.5) pb.set(x0 + 22 + x, top - 6 + y, step5(IRON.concat(['#1e1b1a']), lv(0, 0) + (x + y) * .15 + 1, x, y)); }
  for (let y = top - 7; y < top; y++) for (let x = x1 - 40; x < x1 - 34; x++) pb.set(x, y, x === x1 - 40 ? '#c7b8a0' : y === top - 7 ? '#5a3a24' : '#9a8670');
  pb.outline(EDGE);
  return pb.canvas();
}
// Fenster: Dämmerung über der Bucht (Hügel mit Kran und zwei Lichtern, Meer mit Abendschein, erster Stern)
function buildWindow() {
  const { w, h } = WIN_R;
  return layer(w, h, (x, y) => {
    const isle = 46 + Math.round(-Math.max(0, 7 - Math.abs(x - 18) * .3) - Math.max(0, 4 - Math.abs(x - 62) * .25) + (vnoise(x / 5, 1, 3) - .5) * 2);
    if (y >= 52) {
      const l = (y - 52) / (h - 52) * 2 + (bay(x, y) - .5) * .8;
      if (Math.abs(x - 50 - Math.sin(y * 1.3) * 2) < 3 - (y - 52) * .1 && bay(x, y) < .5) return DUSK[5];   // Abendschein auf dem Wasser
      return SEA_D[clamp(Math.round(l), 0, 2)];
    }
    if (y >= isle) {
      if ((x === 14 || x === 24) && y === isle + 2) return '#ffc86a';
      return ISLE_D;
    }
    if (x >= 58 && x <= 59 && y > 30 && y < isle) return ISLE_D;                       // Kran
    if (y === 31 && x > 58 && x < 70) return ISLE_D;
    if (x === 68 && y > 31 && y < 37) return ISLE_D;
    if ((x === 12 && y === 9) || (x === 44 && y === 18)) return '#e8e6ff';            // Sterne
    const l = Math.pow(y / 52, 1.4) * 6 + (bay(x, y) - .5) * .9;
    return DUSK[clamp(Math.round(l), 0, 6)];
  });
}

/* ---------- Brann in der Totale: hinter der Werkbank, Oberkörper (Beine verdeckt) ---------- */
// Haltungen: hold (Rolle vor der Brust), lower (halb gesenkt), lay (Hände auf der Rolle auf der Bank), lean (Hände auf dem Plan)
const FW = 44, FH = 64, FX = 22, FY = 6;     // Mitte x = FX, Kopf oben bei FY, Füße bei FH − 1 (liegen auf FLOOR)
function buildBrann(pose) {
  const pb = new PB(FW, FH), X = FX, Y = FY;
  ellipse(pb, X, Y + 23, 11, 12, SHIRT, .05);
  ellipse(pb, X, Y + 15, 13, 4.5, SHIRT, .15);
  // Lederschürze mit Latz und Riemen
  for (let y = Y + 17; y < Y + 48; y++) {
    const half = y < Y + 29 ? 6 + (y - Y - 17) * .12 : 8 + (y - Y - 29) * .12;
    for (let x = Math.floor(X - half); x <= X + half; x++) {
      const e = half - Math.abs(x + .5 - X);
      let l = -((x - X) / half) * .6 + (bay(x, y) - .5) * .3 + (hash(x >> 1, y >> 1, 21) - .5) * .4 + .05;
      if (e < 1) l -= .6;
      pb.set(x, y, pick(LEATHER, l));
    }
  }
  line(pb, X - 6, Y + 17, X - 4, Y + 11, LEATHER[1]); line(pb, X + 6, Y + 17, X + 4, Y + 11, LEATHER[2]);
  // Arme: Schulter → Ellbogen → Hand (Oberarm im Hemd, Krempe am Ellbogen, Unterarm nackt), Faust an der Rolle
  const ROLL = { hold: Y + 23, lower: Y + 28, lay: Y + 31 }[pose];
  const A = {
    hold:  [[X - 15, Y + 30, X - 12, ROLL], [X + 15, Y + 30, X + 12, ROLL]],
    lower: [[X - 15, Y + 29, X - 12, ROLL], [X + 15, Y + 29, X + 12, ROLL]],
    lay:   [[X - 15, Y + 28, X - 11, ROLL], [X + 15, Y + 28, X + 11, ROLL]],
    lean:  [[X - 15, Y + 28, X - 10, Y + 33], [X + 15, Y + 28, X + 10, Y + 33]]
  }[pose];
  // Rolle (vergilbtes Papier), liegt hinter den Händen
  if (ROLL) {
    for (let x = X - 16; x <= X + 16; x++) for (let y = ROLL - 2; y <= ROLL + 2; y++) pb.set(x, y, PAPER[clamp(y - ROLL + 2, 0, 4)]);
    for (const ex of [X - 16, X + 16]) { pb.set(ex, ROLL - 1, PAPER[3]); pb.set(ex, ROLL, PAPER[4]); pb.set(ex, ROLL + 1, PAPER[3]); }
  }
  // Arme und Fäuste auf eigener Ebene mit eigener Kontur (heben sich von Schürze und Rolle ab)
  const ap = new PB(FW, FH), arms = [[X - 11, Y + 15], [X + 11, Y + 15]];
  A.forEach(([ex, ey, hx, hy], i) => {
    const [sx, sy] = arms[i], bias = i ? -.15 : .1;
    capsule(ap, sx, sy, ex, ey - 2, 3.4, 3, SHIRT, bias + .1);
    capsule(ap, ex, ey, hx, hy, 2.6, 2.2, SKIN_B, bias);
    const ux = (ex - sx), uy = (ey - sy), ul = Math.hypot(ux, uy), cx = ex - ux / ul * 2.5, cy = ey - uy / ul * 2.5;
    for (let k = -3; k <= 3; k++) ap.set(cx - uy / ul * k, cy + ux / ul * k, k < 0 ? SHIRT[0] : SHIRT[1]);
    // kompakte Faust 4×4 ohne Finger
    const x0 = Math.round(hx) - 2, y0 = Math.round(hy) - 2;
    ['.01.', '0112', '1122', '.22.'].forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') ap.set(x0 + x, y0 + y, SKIN_B[Math.min(3, +c + i)]); }));
  });
  ap.outline(EDGE);
  for (let k = 0; k < ap.p.length; k++) if (ap.p[k]) pb.p[k] = ap.p[k];
  // Kopf: leicht gesenkt (Blick auf die Rolle), Bart, kurzes Haar, Schutzbrille auf der Stirn
  const dn = pose === 'hold' || pose === 'lower' ? 1 : 0;
  capsule(pb, X, Y + 9, X, Y + 13, 3.4, 3.4, SKIN_B, -.1);
  ellipse(pb, X, Y + 5.5 + dn, 5.6, 6.6, SKIN_B);
  for (let y = Y + 6; y < Y + 14; y++) for (let x = X - 5; x <= X + 5; x++) if (pb.get(x, y) && SKIN_B.includes(pb.get(x, y)) && (y > Y + 8 + dn || Math.abs(x - X) > 3)) pb.set(x, y, pick(BEARD, -(x - X) / 6 - (y - Y - 9) / 6 + (bay(x, y) - .5) * .3));
  ellipse(pb, X, Y + 2.2 + dn, 6, 4.4, [HAIR_B[0], HAIR_B[0], HAIR_B[1], HAIR_B[1]], 0, (x, y) => y < Y + 3 + dn);
  pb.set(X - 2, Y + 5 + dn, '#2a1a12'); pb.set(X + 2, Y + 5 + dn, '#2a1a12');
  if (dn) { pb.set(X - 2, Y + 4 + dn, SKIN_B[2]); pb.set(X + 2, Y + 4 + dn, SKIN_B[2]); }       // Lider gesenkt
  pb.set(X - 3, Y + 4, BEARD[1]); pb.set(X + 3, Y + 3, BEARD[1]); pb.set(X, Y + 7 + dn, SKIN_B[2]);
  pb.rect(X - 5, Y + dn, 11, 1, '#3a281d'); pb.rect(X - 3, Y - 1 + dn, 2, 2, '#cc9c3c'); pb.rect(X + 1, Y - 1 + dn, 2, 2, '#cc9c3c');
  pb.outline(EDGE);
  return pb.canvas();
}

/* ---------- Werkbank von oben: Dielen, Maserung, Kratzer, Werkzeug; das eiserne Lineal hält den Plan ---------- */
function buildTable() {
  const pb = new PB(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const plank = Math.floor((y + 6) / 26), py = (y + 6) % 26, seam = py === 0 || py === 25;
    const g = fbm(x / 40, (y + plank * 31) / 2.2, 60 + plank, 3), knot = Math.hypot((x - 60 - plank * 97 % 220) / 6, (py - 13) / 3);
    let l = 1.3 + (g - .5) * 2.2 + (hash(plank, 0, 3) - .5) * .8;
    if (knot < 1) l += 1.6 - knot; else if (knot < 2.2) l += (Math.floor(knot * 3) % 2) * .8;
    if (seam) l = 4;
    if (hash(x >> 3, y, 7) < .012) l += 1.2;                                           // Kratzer
    pb.set(x, y, step5(WOOD, l, x, y));
  }
  // Brandfleck links, Nagelköpfe
  for (let y = 0; y < H; y++) for (let x = 0; x < 70; x++) { const d = Math.hypot(x - 38, y - 140); if (d < 9 && d > 6.5 && bay(x, y) < .55) pb.set(x, y, WOOD[4]); }
  for (let p = 0; p < 8; p++) for (const nx of [10, 310]) pb.set(nx, p * 26 + 7, IRON[1]);
  // Zirkel (offen, Spitzen nach unten), Bleistift, Muttern, Hammer, Becher
  line(pb, 40, 46, 30, 82, IRON[1]); line(pb, 41, 46, 50, 82, IRON[2]); disc2(pb, 40, 45, 2.5, IRON[0], IRON[2]);
  line(pb, 22, 118, 54, 104, '#c8a040'); line(pb, 22, 119, 54, 105, '#8a6a20'); pb.set(21, 119, '#2a2a2a'); pb.set(55, 104, '#d07060');
  for (const [nx, ny, r] of [[28, 156, 4], [44, 164, 3], [264, 152, 3.5]]) { hex(pb, nx, ny, r); }
  for (let i = 0; i < 26; i++) { pb.set(262 + i, 104 + Math.round(i * .4), WOOD[0]); pb.set(262 + i, 105 + Math.round(i * .4), WOOD[3]); }
  for (let y = 108; y < 122; y++) for (let x = 283; x < 293; x++) pb.set(x, y, (x === 283 || y === 108) ? IRON[0] : IRON[2]);
  for (let y = 0; y < H; y++) for (let x = 250; x < 300; x++) {
    const d = Math.hypot(x - 276, y - 52);
    if (d > 11) continue;
    pb.set(x, y, d > 9.5 ? IRON[2] : d > 8 ? '#d8cdb6' : d > 7 ? '#a07a58' : bay(x, y) < .2 ? '#5a3424' : '#3a2016');   // Becher mit Kaffee
  }
  for (let y = 46; y < 58; y++) pb.set(288, y, '#d8cdb6');
  // Kaffeering auf dem Holz
  for (let a = 0; a < 80; a++) { const an = a / 80 * Math.PI * 2; if (hash(a, 1, 5) < .7) pb.set(Math.round(258 + Math.cos(an) * 9), Math.round(80 + Math.sin(an) * 9), WOOD[3]); }
  // eisernes Lineal über der Oberkante des Plans
  for (let y = RULER_Y; y < RULER_Y + 6; y++) for (let x = PX - 12; x < PX + PW_ + 12; x++) pb.set(x, y, y === RULER_Y ? IRON[0] : y === RULER_Y + 5 ? IRON[3] : ((x - PX) % 8 === 0 && y < RULER_Y + 3) ? IRON[3] : IRON[1 + (bay(x, y) < .3 ? 1 : 0)]);
  pb.outline(EDGE);
  return pb.canvas();
}
function disc2(pb, cx, cy, r, c, e) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) pb.set(cx + x, cy + y, x + y < 0 ? c : e); }
function hex(pb, cx, cy, r) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const a = Math.atan2(y, x), d = Math.hypot(x, y), rr = r * Math.cos(Math.PI / 6) / Math.cos(((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6);
    if (d > rr) continue;
    pb.set(cx + x, cy + y, d < r * .4 ? WOOD[4] : x + y < 0 ? IRON[0] : IRON[2]);
  }
}

/* ---------- Der Bauplan: vergilbtes Papier, Leuchtturm im Aufriss, Lampe im Detail, Grundriss, Titel, Siegel ---------- */
// Pixelschrift 3×5 für den Titel
const GLYPH = {
  L: ['1..', '1..', '1..', '1..', '111'], E: ['111', '1..', '11.', '1..', '111'], U: ['1.1', '1.1', '1.1', '1.1', '111'],
  C: ['.11', '1..', '1..', '1..', '.11'], H: ['1.1', '1.1', '111', '1.1', '1.1'], T: ['111', '.1.', '.1.', '.1.', '.1.'],
  F: ['111', '1..', '11.', '1..', '1..'], R: ['11.', '1.1', '11.', '1.1', '1.1']
};
function letters(pb, s, x, y, c) {
  for (const ch of s) { const g = GLYPH[ch]; if (g) g.forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') pb.set(x + i, y + j, c); })); x += 4; }
}
// Handschrift (nicht lesbar): kleine Auf- und Abstriche, Wortlücken
function scrib(pb, x, y, len, seed, c = INK_F) {
  for (let i = 0; i < len; i++) {
    if (hash(i >> 2, 0, seed) < .18 && i % 5 === 0) { i += 2; continue; }
    const k = hash(i, 1, seed), up = k < .2 ? 2 : k < .5 ? 1 : 0, dn = k > .9 ? 1 : 0;
    for (let j = -up; j <= dn; j++) pb.set(x + i, y + j, c);
    if (hash(i, 2, seed) < .3) pb.set(x + i, y - up - 1, hash(i, 3, seed) < .5 ? c : null);
  }
}
const inTower = (x, y) => { const T = TOWER; if (y < T.y0 || y > T.y1) return false; const half = lerp(T.top, T.base, (y - T.y0) / (T.y1 - T.y0)); return Math.abs(x + .5 - T.cx) <= half; };
function buildPlan() {
  const pb = new PB(PW_, PH_), w = PW_, h = PH_;
  // Papier: vergilbt, Ränder dunkler, Stockflecken, Wellen vom Rollen, abgerissene Ecke oben rechts
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if ((w - 1 - x) + y < 8 + vnoise(x / 2, y / 2, 3) * 3) continue;               // abgerissene Ecke
    const e = Math.min(x, y, w - 1 - x, h - 1 - y);
    let l = .7 + (fbm(x / 30, y / 24, 31, 3) - .5) * 1.6 + (vnoise(x / 3, y / 3, 32) - .5) * .4;
    if (e < 6) l += (6 - e) * .22 + (hash(x, y, 1) - .5) * .4;
    l += Math.sin(y / 11 * Math.PI) * .25;                                            // Wellen vom Rollen
    if (hash(x >> 1, y >> 1, 33) < .012) l += 1.6;                                   // Stockflecken
    pb.set(x, y, step5(PAPER, l, x, y));
  }
  // Wasserrand (alter Fleck) unten links
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot((x - 14) / 1.2, y - 122) + (vnoise(x / 4, y / 4, 8) - .5) * 4; if (d > 15 && d < 16.5 && pb.get(x, y)) pb.set(x, y, PAPER[3]); }
  // Rahmen (doppelt, verblasst)
  for (let x = 4; x < w - 4; x++) for (const yy of [4, 6, h - 7, h - 5]) if (hash(x, yy, 5) > .08) pb.set(x, yy, yy === 4 || yy === h - 5 ? INK_F : INK);
  for (let y = 4; y < h - 4; y++) for (const xx of [4, 6, w - 7, w - 5]) if (hash(xx, y, 5) > .08) pb.set(xx, y, xx === 4 || xx === w - 5 ? INK_F : INK);
  const T = TOWER, cx = T.cx;
  // Fels und Wasserlinie (Leitmotiv): Wellen über die ganze Breite der Zeichnung
  for (let x = 12; x < 96; x++) {
    const top = T.y1 + 2 + Math.round(Math.abs(x - cx) * .12 + (vnoise(x / 3, 1, 4) - .5) * 4);
    for (let y = top; y < T.y1 + 12; y++) if (y === top || (x + y) % 3 === 0) pb.set(x, y, y === top ? INK : INK_F);
    const wy = T.y1 + 5 + Math.round(Math.sin(x * .55) * 1.2);
    if (Math.abs(x - cx) > T.base + 4) { pb.set(x, wy, INK); if (x % 7 === 0) pb.set(x, wy - 1, INK); }
  }
  // Turm: Umriss, Steinlagen, Schraffur auf der Schattenseite, Tür und Fensterschlitze
  for (let y = T.y0; y <= T.y1; y++) for (let x = cx - T.base - 1; x <= cx + T.base + 1; x++) {
    if (!inTower(x, y)) continue;
    const edge = !inTower(x - 1, y) || !inTower(x + 1, y) || y === T.y0 || y === T.y1;
    if (edge) { pb.set(x, y, INK); continue; }
    if ((y - T.y0) % 8 === 0 && hash(x, y, 9) > .15) pb.set(x, y, INK_F);
    else if (x > cx + 3 && (x + y) % 3 === 0) pb.set(x, y, INK_F);
  }
  for (let y = T.y1 - 12; y < T.y1; y++) for (let x = cx - 3; x <= cx + 3; x++) {
    const arch = y < T.y1 - 9 && Math.hypot(x - cx, y - (T.y1 - 9)) > 3.2;
    if (arch) continue;
    if (Math.abs(x - cx) === 3 || y === T.y1 - 12 + Math.round(Math.abs(x - cx) * .3)) pb.set(x, y, INK); else pb.set(x, y, PAPER[2]);
  }
  for (const [wy, dx] of [[88, -3], [70, 2], [52, -2]]) { pb.rect(cx + dx, wy, 2, 5, INK); pb.set(cx + dx, wy - 1, INK_F); }
  // Umgang mit Geländer, Laternenhaus mit Lampe, Kuppel, Wetterfahne
  for (let x = cx - 15; x <= cx + 15; x++) { pb.set(x, T.y0 - 1, INK); pb.set(x, T.y0 - 2, INK); pb.set(x, T.y0 - 7, INK); if ((x - cx) % 3 === 0) for (let y = T.y0 - 6; y < T.y0 - 2; y++) pb.set(x, y, INK_F); }
  const LY0 = T.y0 - 20, LY1 = T.y0 - 7;
  for (let y = LY0; y <= LY1; y++) for (let x = cx - 8; x <= cx + 8; x++) if (Math.abs(x - cx) === 8 || y === LY0 || (x - cx) % 4 === 0 && Math.abs(x - cx) > 3) pb.set(x, y, INK);
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) pb.set(cx + x, LY0 + 7 + y, x * x + y * y > 5 ? INK : (x + y < 0 ? '#c89a50' : INK_R));   // die Lampe
  for (let y = LY0 - 6; y < LY0; y++) { const half = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((y - LY0) / 6, 2))) * 9); pb.set(cx - half, y, INK); pb.set(cx + half, y, INK); if (y === LY0 - 1) for (let x = cx - half; x <= cx + half; x++) pb.set(x, y, INK); }
  for (let x = cx - 2; x <= cx + 2; x++) pb.set(x, LY0 - 6, INK);
  for (let y = LY0 - 12; y < LY0 - 6; y++) pb.set(cx, y, INK);
  line(pb, cx, LY0 - 12, cx + 5, LY0 - 10, INK); line(pb, cx + 5, LY0 - 10, cx, LY0 - 9, INK);
  // Lichtstrahlen (gestrichelt) nach beiden Seiten
  for (const s of [-1, 1]) for (const a of [-.22, 0, .22]) for (let i = 13; i < 40; i++) if (Math.floor(i / 3) % 2 === 0) pb.set(cx + s * i, Math.round(LY0 + 7 + i * a), INK_R);
  // Maßlinie links mit Pfeilen und Strichen, dazu Zahlen (Handschrift)
  const MX = cx - T.base - 9;
  for (let y = LY0 - 12; y <= T.y1; y++) pb.set(MX, y, INK_F);
  for (const yy of [LY0 - 12, T.y0, T.y1]) { line(pb, MX - 2, yy, MX + 3, yy, INK_F); }
  for (const [yy, d] of [[LY0 - 12, 1], [T.y1, -1]]) { pb.set(MX - 1, yy + d, INK_F); pb.set(MX + 1, yy + d, INK_F); }
  scrib(pb, MX - 6, 76, 4, 3, INK_F);
  // Detail rechts oben: die Lampe mit Linse (Kreis), darunter Beschriftung
  const [dx, dy, dr] = [120, 36, 15];
  for (let a = 0; a < 120; a++) { const an = a / 120 * Math.PI * 2; pb.set(Math.round(dx + Math.cos(an) * dr), Math.round(dy + Math.sin(an) * dr), INK); }
  for (const r of [11, 8, 5]) for (let a = 0; a < 60; a++) { const an = a / 60 * Math.PI * 2; if (Math.abs(Math.cos(an)) > .35) pb.set(Math.round(dx + Math.cos(an) * r * .55), Math.round(dy + Math.sin(an) * r), INK_F); }
  for (let y = -3; y <= 3; y++) for (let x = -2; x <= 2; x++) if ((x * x) / 4 + (y * y) / 9 <= 1) pb.set(dx + x, dy + y, y < 0 ? '#c89a50' : INK_R);
  line(pb, dx - dr, dy + 4, cx + 9, LY0 + 8, INK_F);                                   // Hinweislinie zum Laternenhaus
  scrib(pb, dx - 12, dy + dr + 5, 24, 5);
  // Grundriss: Kreis mit Wendeltreppe
  const [gx, gy, gr] = [120, 76, 11];
  for (let a = 0; a < 90; a++) { const an = a / 90 * Math.PI * 2; pb.set(Math.round(gx + Math.cos(an) * gr), Math.round(gy + Math.sin(an) * gr), INK); pb.set(Math.round(gx + Math.cos(an) * (gr - 3)), Math.round(gy + Math.sin(an) * (gr - 3)), INK_F); }
  for (let a = 0; a < 40; a++) { const an = a / 40 * Math.PI * 3, r = 1 + a / 40 * 6; pb.set(Math.round(gx + Math.cos(an) * r), Math.round(gy + Math.sin(an) * r), INK); }
  for (let i = -gr - 3; i <= gr + 3; i++) if (Math.floor((i + 20) / 2) % 3 !== 2) { pb.set(gx + i, gy, INK_F); pb.set(gx, gy + i, INK_F); }
  scrib(pb, gx - 10, gy + gr + 6, 20, 7);
  // Titel oben rechts: LEUCHTFEUER, darunter eine Zeile Handschrift
  letters(pb, 'LEUCHTFEUER', 96, 10, INK);
  for (let x = 96; x < 140; x++) if (hash(x, 1, 6) > .2) pb.set(x, 16, INK_F);
  // Schriftfeld unten rechts (neben dem Siegel)
  for (let x = 84; x < SEAL_P[0] - 1; x++) { pb.set(x, 98, INK); pb.set(x, h - 8, INK); }
  for (let y = 98; y < h - 7; y++) pb.set(84, y, INK);
  for (const [yy, n, s] of [[103, 30, 11], [109, 24, 12], [115, 28, 13], [121, 18, 14]]) scrib(pb, 87, yy, n, s, yy === 103 ? INK : INK_F);
  pb.outline('#3a2414');
  return pb.canvas();
}

// das verblasste Siegel des Herrschers (dasselbe wie auf dem Zettel im Prolog), nach dem Lampenlicht aufgesetzt, damit die Prägung klar bleibt
function sealOnPlan(cv) {
  const x = cv.getContext('2d'), sg = siegel('verblasst'), d = sg.getContext('2d').getImageData(0, 0, SIEGEL_SIZE, SIEGEL_SIZE).data;
  const im = x.getImageData(SEAL_P[0], SEAL_P[1], SIEGEL_SIZE, SIEGEL_SIZE), o = im.data;
  for (let y = 0; y < SIEGEL_SIZE; y++) for (let xx = 0; xx < SIEGEL_SIZE; xx++) {
    const i = (y * SIEGEL_SIZE + xx) * 4;
    if (!d[i + 3] || (hash(xx, y, 41) < .06 && bay(xx, y) < .5)) continue;          // abgerieben: noch etwas mehr Papier scheint durch
    for (let k = 0; k < 3; k++) o[i + k] = d[i + k] * .9;
  }
  x.putImageData(im, SEAL_P[0], SEAL_P[1]);
}

/* ---------- Hände von oben: Handrücken mit Knöcheln, Finger in einem Stück über die Rolle gebogen, Daumen innen ---------- */
// Nach Max' Rückmeldung zum Prolog: Finger nicht als einzelne Zylinder, sondern ein Block mit weichen Fugen; nur die Kuppen sind getrennt.
const HW = 20, HH = 24, HC = 9;            // Hand: Breite, Höhe, Mitte des Handgelenks (oben)
// Flache Tonstufen statt Rauschen, damit die Form lesbar bleibt: Handrücken, Knöchelreihe, vier Finger mit dunkler Fuge,
// runde Kuppen, Daumen getrennt an der Innenseite. Gezeichnet als linke Hand im Bild (Daumen rechts), die rechte ist gespiegelt.
function buildHand(right) {
  const pb = new PB(HW, HH), S = SKIN;
  // Daumen: schräg nach unten zur Innenseite, eigene Kontur (bleibt als Trennlinie zum Handrücken stehen)
  for (let y = 6; y < 17; y++) for (let x = 0; x < HW; x++) {
    const ax = HC + 6.6 + (y - 6) * .3, d = x + .5 - ax, w = y > 14 ? 1.8 - (y - 14) * .5 : 1.8;
    if (Math.abs(d) > w) continue;
    pb.set(x, y, d < -.6 ? S[1] : d > .6 ? S[3] : S[2]);
  }
  pb.outline(EDGE);
  const K = 11, X0 = HC - 7.5, LEN = [18.5, 20.5, 21.5, 20.5];          // Knöchelreihe, linker Rand der Finger, Fingerlängen (kleiner Finger außen)
  for (let y = 0; y <= 22; y++) for (let x = 0; x < HW; x++) {
    const px = x + .5;
    if (y <= K) {
      const half = y < 3 ? 4.5 : 4.5 + (y - 3) * .375;
      const dx = px - HC;
      if (Math.abs(dx) > half) continue;
      const nx = dx / half;
      let c = nx < -.72 ? S[0] : nx < .35 ? S[1] : nx < .8 ? S[2] : S[3];
      if (y === K) { const f = Math.floor((px - X0) / 4), fx = px - X0 - f * 4; c = fx > 3 ? S[3] : fx < 1.5 ? S[0] : S[1]; }   // Knöchel hell
      if (y > 3 && y < K - 1 && Math.abs(nx + .1) < .08 && y % 3 === 0) c = S[2];   // Sehne, angedeutet
      pb.set(x, y, c);
      continue;
    }
    const f = Math.floor((px - X0) / 4), fx = px - X0 - f * 4;
    if (f < 0 || f > 3) continue;
    const len = LEN[f];
    if (fx > 3) { if (y < len - 1.5 && y < LEN[f + 1] - 1.5) pb.set(x, y, S[3]); continue; }   // Fuge zwischen den Fingern
    if (y > len) continue;
    if (y > len - 1 && (fx < .6 || fx > 2.4)) continue;                         // runde Kuppe
    const curl = y > K + 5 ? 1 : 0;                                              // Finger biegen sich über die Rolle vom Licht weg
    let c = S[clamp((fx < 1 ? 0 : fx < 2 ? 1 : 2) + curl + (f === 3 ? 1 : 0), 0, 4)];
    if (y === K + 1) c = S[2];                                                   // Falte unter den Knöcheln
    pb.set(x, y, c);
  }
  pb.set(HC - 1, 7, '#7a4a38'); pb.set(HC, 7, '#7a4a38');                       // Ruß
  pb.outline(EDGE);
  const cv = pb.canvas();
  if (!right) return cv;
  const m = canvas(HW, HH), mx = m.getContext('2d');
  mx.translate(HW, 0); mx.scale(-1, 1); mx.drawImage(cv, 0, 0);
  return m;
}
// Unterarm von oben, je Bild gezeichnet: vom Bildrand zum Handgelenk, leicht schräg (Schultern schmaler als die Hände);
// kräftig wie Branns Hände, oben steckt er im aufgekrempelten Ärmel (sonst wirken die Hände wie an Stielen)
function armPB(ax, ay, bx, by, mirror) {
  const pb = new PB(W, H), vx = bx - ax, vy = by - ay, ll = vx * vx + vy * vy, len = Math.sqrt(ll), R = 6.6, SLEEVE = clamp(1 - FOREARM / Math.sqrt(ll), 0, 1);
  for (let y = Math.max(0, Math.floor(Math.min(ay, by) - R)); y <= Math.max(ay, by) + R; y++) for (let x = Math.floor(Math.min(ax, bx) - R - 1); x <= Math.max(ax, bx) + R + 1; x++) {
    const px = x + .5, py = y + .5, u = clamp(((px - ax) * vx + (py - ay) * vy) / ll, 0, 1);
    const sleeve = u < SLEEVE, r = sleeve ? 6.6 : lerp(5.8, 5.2, (u - SLEEVE) / (1 - SLEEVE));
    const nx = (px - ax - u * vx) / r, ny = (py - ay - u * vy) / r, d = nx * nx + ny * ny;
    if (d > 1) continue;
    const l = -(nx * .62 + ny * .55) * .9 + (1 - d) * .22 + (bay(x, y) - .5) * .3;
    if (sleeve) {                                   // aufgekrempelter Ärmel: Hemd, unten die helle Krempe mit Schattenkante
      const cuff = u > SLEEVE - .07;
      pb.set(x, y, cuff ? (u > SLEEVE - .02 ? SHIRT_L[3] : pick(SHIRT_L, l + .35)) : pick(SHIRT_L, l - .1));
    } else {                                        // Unterarm: flache Tonstufen quer zum Arm wie der Handrücken (buildHand), damit beide ineinander übergehen
      let q = ((px - ax - u * vx) * vy - (py - ay - u * vy) * vx) / (len * r);
      if (mirror) q = -q;                           // rechte Hand ist gespiegelt, ihre helle Seite also rechts
      let c = q < -.72 ? SKIN[0] : q < .35 ? SKIN[1] : q < .8 ? SKIN[2] : SKIN[3];
      if (c === SKIN[1] && u < .85 && hash(x, y, 4) < .05) c = SKIN[2];   // ein paar Haare
      pb.set(x, y, c);
    }
  }
  return pb;
}
const FOREARM = 24;                                 // sichtbarer Unterarm bis zur Krempe des Ärmels (Pixel)
const SHIRT_L = ['#f6e4c0', '#d6bd96', '#ab9272', '#7a644c'];   // Hemd im Lampenlicht

/* ---------- Großaufnahme: unscharfe Werkstatt am Abend, Lampe links oben ---------- */
function buildCloseBG() {
  return layer(W, H, (x, y) => {
    const n = fbm(x / 50, y / 16, 91, 3), lit = clamp(1 - Math.hypot(x - 40, y - 10) / 260, 0, 1);
    const brick = (Math.floor(y / 9) + Math.floor((x + (Math.floor(y / 9) % 2) * 14) / 28)) % 5 === 0;
    const l = 3.4 - lit * 2.6 + (n - .5) * 1.2 + (bay(x, y) - .5) * .5 + (brick ? .4 : 0);
    return ['#8a4e30', '#653722', '#46261a', '#2e1912', '#1c0f0b'][clamp(Math.round(l), 0, 4)];
  });
}

/* =========================================================
   ZEICHNEN
   ========================================================= */
const flick = (t) => .5 + Math.sin(t * 7.3) * .04 + Math.sin(t * 13.1) * .03 + Math.sin(t * 2.1) * .03;
const vig = (ctx, a = .55) => { ctx.globalAlpha = a; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1; };
// Staub im Lampenlicht (deterministisch aus der Zeit)
function dust(ctx, t, cx, cy, r, n, s = 1) {
  for (let i = 0; i < n; i++) {
    const p = (t * (.03 + hash(i, 1, 9) * .03) + hash(i, 2, 9)) % 1, a = hash(i, 3, 9) * Math.PI * 2;
    const x = cx + Math.cos(a) * r * hash(i, 4, 9) + Math.sin(t * .7 + i) * 6, y = cy - r + p * r * 2;
    ctx.globalAlpha = Math.sin(p * Math.PI) * .7;
    ctx.fillStyle = '#ffe2a8'; ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }
  ctx.globalAlpha = 1;
}

/* ---------- Einstellung 1: die Werkstatt am Abend, Kamera vom Fenster zur Werkbank ---------- */
function renderRoom(ctx, t, ox, pose, opt = {}) {
  ox = Math.round(ox);
  ctx.fillStyle = DUSK[2]; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(L.win, WIN_R.x - ox, WIN_R.y);
  ctx.drawImage(L.room, -ox, 0);
  glow(ctx, WIN_R.x + WIN_R.w / 2 - ox, WIN_R.y + WIN_R.h / 2, 60, .08, COOL);
  // Brann hinter der Werkbank, dann die Bank davor (die Ebene liegt schon unter ihm: Bank neu über ihn zeichnen)
  ctx.drawImage(L.fig[pose], BRANN_X - FX - ox, FLOOR - FH);
  ctx.drawImage(L.room, BENCH.x0, BENCH.top - 1, BENCH.x1 - BENCH.x0, FLOOR - BENCH.top + 1, BENCH.x0 - ox, BENCH.top - 1, BENCH.x1 - BENCH.x0, FLOOR - BENCH.top + 1);
  if (opt.plan) {                                                                       // Plan liegt flach, hängt vorn etwas über
    ctx.fillStyle = PAPER[1]; ctx.fillRect(226 - ox, BENCH.top - 1, 70, 1);
    ctx.fillStyle = PAPER[2]; ctx.fillRect(232 - ox, BENCH.top, 58, 4);
    ctx.fillStyle = PAPER[3]; ctx.fillRect(232 - ox, BENCH.top + 4, 58, 1);
    ctx.fillStyle = EDGE; ctx.fillRect(231 - ox, BENCH.top, 1, 5); ctx.fillRect(290 - ox, BENCH.top, 1, 5); ctx.fillRect(232 - ox, BENCH.top + 5, 58, 1);
  }
  // Glut der Esse
  glow(ctx, 380 - ox, 130, 30, .35 + Math.sin(t * 3) * .05, EMBER);
  // Hängelampe: Kette vom Balken, schwingt ein wenig
  const sw = Math.sin(t * 1.1) * 1.2, lx = LAMP_P[0] - ox + sw, ly = LAMP_P[1];
  ctx.fillStyle = IRON[2];
  for (let y = BEAM_Y + 7; y < ly - 7; y++) ctx.fillRect(Math.round(LAMP_P[0] - ox + sw * (y - BEAM_Y) / (ly - BEAM_Y)), y, 1, 1);
  ctx.fillStyle = EDGE; ctx.fillRect(Math.round(lx) - 4, ly - 8, 9, 3); ctx.fillRect(Math.round(lx) - 4, ly + 5, 9, 3);
  ctx.fillStyle = IRON[1]; ctx.fillRect(Math.round(lx) - 3, ly - 7, 7, 1); ctx.fillRect(Math.round(lx) - 3, ly + 6, 7, 1);
  ctx.fillStyle = 'rgba(255,214,140,.8)'; ctx.fillRect(Math.round(lx) - 3, ly - 5, 7, 10);
  ctx.fillStyle = EDGE; ctx.fillRect(Math.round(lx) - 4, ly - 5, 1, 10); ctx.fillRect(Math.round(lx) + 4, ly - 5, 1, 10);
  const fh = 3 + Math.round(Math.sin(t * 9) * .6);
  ctx.fillStyle = FLAME[2]; ctx.fillRect(Math.round(lx) - 1, ly + 3 - fh, 3, fh + 1);
  ctx.fillStyle = FLAME[0]; ctx.fillRect(Math.round(lx), ly + 2 - fh, 1, fh);
  const f = flick(t);
  glow(ctx, lx, ly, 120, f * .55, LAMP); glow(ctx, lx, ly, 22, f * .8, '255,230,170');
  // Nachtfalter um die Lampe
  if (!opt.still) { const a = t * 2.6; ctx.fillStyle = '#d8c8a8'; ctx.fillRect(Math.round(lx + Math.cos(a) * 11), Math.round(ly - 3 + Math.sin(a * 1.7) * 6), 2, 1); }
  dust(ctx, t, lx, ly + 30, 34, 10);
}
// Haltung in Einstellung 1: hält die Rolle, senkt sie, legt sie auf die Bank
const roomPose = (lt) => lt < 4.1 ? 'hold' : lt < 4.6 ? 'lower' : 'lay';

/* ---------- Einstellung 2: Großaufnahme im Lampenlicht ---------- */
// Augen: ansehen, blinzeln, ansehen, Blick nach unten auf den Plan
const closeEyes = (lt) => lt < 1.5 ? 0 : lt < 1.63 ? 2 : lt < 3 ? 0 : 3;
function renderClose(ctx, t, lt) {
  ctx.drawImage(L.closeBG, 0, 0);
  const f = flick(t);
  glow(ctx, 40, 0, 200, f * .45, LAMP);
  ctx.drawImage(L.face[closeEyes(lt)], 0, 0, 64, 80, 96, 8 - Math.round(ease(lt / 4.5) * 3), 128, 160);
  glow(ctx, 70, 10, 90, f * .25, '255,220,150');
  dust(ctx, t, 90, 60, 60, 8, 2);
}

/* ---------- Einstellungen 3–5: Werkbank von oben, der Bauplan ---------- */
// Rolle (liegend, quer): Mitte y, Radius r; Papierrückseite, Licht von oben, Spiralen an den Enden. s = Pixelgröße, (ox, oy) = Ausschnitt
function drawRoll(ctx, cy, r, s, ox, oy) {
  const x0 = PX - 2, x1 = PX + PW_ + 2, top = Math.round(cy - r), n = Math.round(r * 2);
  const P = (x, y) => [Math.round((x - ox) * s), Math.round((y - oy) * s)];
  // Schatten unter der Rolle
  ctx.fillStyle = 'rgba(30,16,8,.45)'; { const [sx, sy] = P(x0 + 2, top + n); ctx.fillRect(sx, sy, (x1 - x0) * s, 2 * s); }
  for (let j = 0; j < n; j++) {
    const ny = (j + .5) / n * 2 - 1, base = 1.1 + ny * 1.6 - (1 - ny * ny) * .4;
    for (let x = x0; x < x1; x++) {
      const end = x - x0 < 2 || x1 - 1 - x < 2;
      let l = base + (end ? 1.2 + (((x + j) % 3 === 0) ? .8 : 0) : 0) + (fbm(x / 20, j / 4, 33, 2) - .5) * .5;
      ctx.fillStyle = step5(PAPER, l, x, top + j);
      const [sx, sy] = P(x, top + j); ctx.fillRect(sx, sy, s, s);
    }
  }
  ctx.fillStyle = EDGE;
  { const [sx, sy] = P(x0 - 1, top); ctx.fillRect(sx, sy, s, n * s); }
  { const [sx, sy] = P(x1, top); ctx.fillRect(sx, sy, s, n * s); }
  { const [sx, sy] = P(x0, top + n); ctx.fillRect(sx, sy, (x1 - x0) * s, s); }
  { const [sx, sy] = P(x0, top - 1); ctx.fillStyle = 'rgba(30,16,8,.6)'; ctx.fillRect(sx, sy, (x1 - x0) * s, s); }
}
// Bild des Tisches: rev = sichtbare Länge des Plans (0–PH_), dann Rolle; s, ox, oy wie oben
const ROLL_R0 = 7, ROLL_R1 = 4.5;
const rollR = (rev) => lerp(ROLL_R0, ROLL_R1, rev / PH_);
function renderTable(ctx, t, rev, s, ox, oy) {
  ox = Math.round(ox); oy = Math.round(oy);
  const vw = Math.ceil(W / s), vh = Math.ceil(H / s);
  ctx.drawImage(L.table, ox, oy, vw, vh, 0, 0, vw * s, vh * s);
  const r = Math.round(rev);
  if (r > 0) {
    const sy = Math.max(0, oy - PY);
    if (r > sy) ctx.drawImage(L.plan, 0, sy, PW_, r - sy, Math.round((PX - ox) * s), Math.round((PY + sy - oy) * s), PW_ * s, (r - sy) * s);
  }
  // Lineal über dem Plan (aus der Tischebene noch einmal darüber)
  ctx.drawImage(L.table, PX - 13, RULER_Y - 1, PW_ + 26, 8, Math.round((PX - 13 - ox) * s), Math.round((RULER_Y - 1 - oy) * s), (PW_ + 26) * s, 8 * s);
  drawRoll(ctx, PY + rev + rollR(rev), rollR(rev), s, ox, oy);
  // Lampenlicht von oben (flackert), Staub
  const f = flick(t);
  glow(ctx, (TL[0] - ox) * s + Math.sin(t * 1.1) * 2 * s, (TL[1] - oy) * s, 150 * s, f * .32, LAMP);
}
// Hände auf der Rolle: hy = Höhe der Fingerkuppen; Unterarme kommen von oben (Brann steht gegenüber)
const HANDS = [PX + 40, PX + PW_ - 40];
function drawHands(ctx, hy) {
  const pb = new PB(W, H);
  HANDS.forEach((hx, i) => {
    const top = Math.round(hy - HH + 3), x = Math.round(hx - (i ? HW - HC : HC));
    const arm = armPB(hx + (i ? -13 : 13), Math.min(top - 40, 10), hx, top + 6, i === 1);   // reicht ins Handgelenk hinein
    for (let k = 0; k < arm.p.length; k++) if (arm.p[k]) pb.p[k] = arm.p[k];
    const hand = (i ? L.handR : L.handL).getContext('2d').getImageData(0, 0, HW, HH).data;
    // Außenkontur der Hand weglassen (innere Linien wie am Daumen bleiben): Arm und Hand bekommen danach eine gemeinsame Kontur
    const op = (xx, y) => xx >= 0 && y >= 0 && xx < HW && y < HH && hand[(y * HW + xx) * 4 + 3];
    const edge = (xx, y) => { const j = (y * HW + xx) * 4; return hand[j] < 60 && hand[j + 1] < 40 && (!op(xx - 1, y) || !op(xx + 1, y) || !op(xx, y - 1) || !op(xx, y + 1)); };
    for (let y = 0; y < HH; y++) for (let xx = 0; xx < HW; xx++) { const j = (y * HW + xx) * 4; if (hand[j + 3] && !edge(xx, y)) pb.set(x + xx, top + y, '#' + [0, 1, 2].map(k => hand[j + k].toString(16).padStart(2, '0')).join('')); }
  });
  pb.outline(EDGE);
  // Schatten auf Papier und Holz (Licht von oben links), dann Arme und Hände
  const cv = pb.canvas(), sh = canvas(W, H), sx = sh.getContext('2d');
  sx.drawImage(cv, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(30,14,6,.4)'; sx.fillRect(0, 0, W, H);
  ctx.drawImage(sh, 3, 3);
  ctx.drawImage(cv, 0, 0);
}

// Entrollen: er schiebt die Rolle ein Stück (die Arme reichen nur so weit), gibt ihr einen Schubs, den Rest rollt sie allein und läuft aus
const U0 = 1.2, U1 = 3.6, U2 = 6.4, PUSH = 54;
const unroll = (lt) => lt < U1 ? ease((lt - U0) / (U1 - U0)) * PUSH : lerp(PUSH, PH_, 1 - Math.pow(1 - clamp((lt - U1) / (U2 - U1), 0, 1), 2.2));

/* ---------- Einstellung 5: das Siegel in der Ecke ---------- */
const SEAL_C = [PX + SEAL_P[0] + SIEGEL_SIZE / 2, PY + SEAL_P[1] + SIEGEL_SIZE / 2];

export default {
  id: 'cs_bauplan',
  title: 'Der Bauplan',
  len: T_END,
  dialog: 'brann_bauplan',
  setup,
  shots: [
    // Einstellung 1: Abend in der Werkstatt; Kamera gleitet vom Fenster zur Werkbank, Brann legt die Rolle ab
    { from: 0, to: T_CLOSE, draw(ctx, lt, t) {
      renderRoom(ctx, t, ease(t / (T_CLOSE - .3)) * 80, roomPose(lt));
      vig(ctx, .55);
      black(ctx, 1 - t / 1.8);
    } },
    // Einstellung 2: Großaufnahme im Lampenlicht – er sieht dich an, dann auf den Plan
    { from: T_CLOSE, to: T_TABLE, draw(ctx, lt, t) { renderClose(ctx, t, lt); vig(ctx, .6); } },
    // Einstellung 3: von oben – Brann entrollt den Bauplan zu dir hin
    { from: T_TABLE, to: T_PAN, draw(ctx, lt, t) {
      const rev = unroll(lt);
      renderTable(ctx, t, rev, 1, 0, 0);
      const cy = PY + rev + rollR(rev), onRoll = cy + rollR(rev) * .45;
      const hold = PY + PUSH + rollR(PUSH) * 1.45;                                 // hier gibt er der Rolle den letzten Schubs
      const hy = lt < 1.2 ? lerp(-12, onRoll, ease(lt / 1.2)) : lt < U1 ? onRoll : lt < 4.6 ? hold : lerp(hold, -30, ease((lt - 4.6) / 1.3));
      if (lt < 7.3) drawHands(ctx, hy);
      dust(ctx, t, TL[0], TL[1], 60, 12);
      vig(ctx, .6);
    } },
    // Einstellung 4: doppelte Pixelgröße, Kamera fährt über die Zeichnung vom Fels hinauf zur Lampe
    { from: T_PAN, to: T_SEAL, draw(ctx, lt, t) {
      const u = ease((lt - .4) / 6.2);
      renderTable(ctx, t, PH_, 2, lerp(58, 72, u), lerp(84, 6, u));
      dust(ctx, t, 160, 90, 120, 10, 2);
      vig(ctx, .55);
    } },
    // Einstellung 5: harter Schnitt in die Ecke – das verblasste Siegel; Abblende
    { from: T_SEAL, to: T_END, draw(ctx, lt, t) {
      const u = ease(lt / 3.6);
      renderTable(ctx, t, PH_, 3, lerp(SEAL_C[0] - 74, SEAL_C[0] - 53, u), lerp(SEAL_C[1] - 33, SEAL_C[1] - 30, u));
      vig(ctx, .6);
      black(ctx, (t - T_FADE) / 1.2);
    } }
  ],
  // Hintergrund des Dialogs: Brann an der Werkbank, der Plan liegt ausgebreitet; el = Sekunden seit Dialogbeginn, now = Uhr (s)
  dialogBg(ctx, el, now) {
    renderRoom(ctx, now, 64, 'lean', { plan: true, still: true });
    vig(ctx, .55);
  }
};
