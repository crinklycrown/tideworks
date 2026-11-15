/* =========================================================
   CUTSCENE cs_licht_im_wind „Ein Licht im Wind“ (Ende Akt 2: Leuchtturm erreicht Stufe 2)
   Nach docs/STORY.md; ruhiger als dort angegeben (Max' Wunsch: jede Einstellung braucht Zeit).
   Dämmerung, der halbfertige Turm auf der Heimatinsel, Wind im Gerüst, ein Seil mit Haken pendelt (0–8 s) ·
   Kamera fährt am Turm hinauf zur noch leeren Lampenkammer; oben steht eine kleine Figur im grünen Mantel, der Mantel weht (8–17 s) ·
   Branns Boot legt am Steg unter dem Turm an, er trägt eine zusammengerollte Zeichnung und hebt sie (17–25,5 s) ·
   Nahaufnahme: der Bauplan einer Taucherglocke im Laternenlicht, Kamera fährt langsam über die Zeichnung (25,5–33 s), Abblende bis 34,2 s.
   Die Lampe des Turms bleibt dunkel (Leitmotiv). Danach Dialog brann_glocke am Steg.
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, vnoise, fbm, PB, layer, tpl, mix, vignette as makeVignette, glow, black } from '../cutscene/kit.js';

const T_UP = 8, T_BOAT = 17, T_PLAN = 25.5, T_FADE = 33, T_END = 34.2;
const HOR = 112;                                         // Horizont der weiten Einstellung

/* ---------- Farbpaletten: Dämmerung, Sonne tief links über dem Meer, violette Schatten ---------- */
const DUSK = ['#1e1c3a', '#2a2748', '#3b3458', '#56436a', '#7c5272', '#a86274', '#d07a70', '#ec9e70', '#f6c08a'];   // Himmel oben → Horizont
const CLOUD = ['#f0b08a', '#d07c7a', '#8a5a78', '#5a4668'];        // Wolken: Unterseite im Abendlicht → dunkle Oberseite
const SEA = ['#e89a6c', '#b06a76', '#7a5070', '#54405e', '#3a3050', '#282440'];
const ROCK = ['#c08474', '#8e6270', '#62485e', '#40304a', '#2a2036'];
const TOWER = ['#f4caa0', '#d8a28a', '#aa7a80', '#78586e', '#4c3a56'];  // Mauerwerk: Sonnenseite links → Schatten rechts
const MORT = '#5a4256';
const WOOD = ['#d89a62', '#a8704a', '#74503e', '#4a3434', '#2e2228'];
const IRON = ['#a898a8', '#76687c', '#4e445a', '#302a3c'];
const PLANK = ['#b8846a', '#8a6256', '#5e4448', '#3c2c36'];
const SUN = '#ffe2a0', SUN_C = '#fff4d0';
const SUNC = '255,180,110', LANT = '255,196,112', COOLC = '120,110,200';
const COAT = ['#4a7a58', '#365f45', '#264a35', '#183224'];       // Mantel des Spielers (wie im Prolog)
const SKIN = ['#e8b48c', '#cb8e68', '#a66b4a', '#744530'];       // Brann (wie das Porträt)
const SHIRT = ['#e4d9c2', '#c6b99f', '#a1957c', '#786c58'];
const LEATHER = ['#b77c47', '#945d33', '#6f4325', '#4b2b17'];
const TROU = ['#6f665a', '#585148', '#443f37', '#302c26'];
const BEARD = ['#6c5242', '#503c30', '#3b2b22', '#281c16'];
const HAIR_B = ['#5a4638', '#3b2d24'];
const ROLLP = ['#f6ead0', '#e2d2ae', '#c2ae86', '#94805e'];       // Papier der Rolle
const PAPER = ['#f4ead2', '#e6d8b4', '#cfbd92', '#ae9a70', '#857250']; // Brann's neuer Plan: hell, kaum vergilbt
const INK = '#26324e', INK_F = '#5a6680', INK_R = '#a24a3a';     // blauschwarze Tinte, verblasst, rot
const EDGE = '#1c1424';
const pick = (r, l) => r[l > .45 ? 0 : l > .1 ? 1 : l > -.25 ? 2 : 3];
const step = (r, l, x, y) => r[clamp(Math.round(l + (bay(x, y) - .5) * .9), 0, r.length - 1)];

/* ---------- Kleine Helfer ---------- */
function line(pb, x0, y0, x1, y1, c) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
  for (let i = 0; i <= n; i++) pb.set(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), typeof c === 'function' ? c(i, n) : c);
}
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
// Pixelpuffer → Canvas, mit Kontur
const cvOf = (pb, edge = EDGE) => { if (edge) pb.outline(edge); return pb.canvas(); };

/* ---------- Turm (Seitenansicht): Mauerwerk mit Lagen und Fugen, Licht von links (Sonne) ---------- */
// cx Mitte, yb unten, yt oben, h0/h1 halbe Breite unten/oben, course = Lagenhöhe (Pixel), s = Pixelgröße der Fugen
function towerBody(pb, cx, yb, yt, h0, h1, course, s = 1) {
  for (let y = Math.round(yt); y <= yb; y++) {
    const half = lerp(h1, h0, (y - yt) / (yb - yt));
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const nx = (x + .5 - cx) / half;
      if (Math.abs(nx) > 1) continue;
      const row = Math.floor((yb - y) / course), a = Math.asin(clamp(nx, -1, 1)) * half * .9 + (row & 1) * course * 1.2;
      let l = 1.3 + nx * 1.9 + Math.pow(Math.abs(nx), 6) * 1.2 + (hash(row, Math.floor(a / (course * 2.4)), 5) - .5) * .6;
      if ((yb - y) % course < s || (((a % (course * 2.4)) + course * 2.4) % (course * 2.4) < s && Math.abs(nx) < .92)) { pb.set(x, y, nx > .55 ? TOWER[4] : MORT); continue; }
      pb.set(x, y, step(TOWER, l, x, y));
    }
  }
}
// Gerüst: Stangen (poles: x-Liste), Riegel und Bohlen alle gap Pixel, Streben im Zickzack, Dicke s
function scaffold(pb, poles, yb, yt, gap, s = 1) {
  const x0 = Math.min(...poles), x1 = Math.max(...poles);
  for (const x of poles) for (let y = yt; y <= yb; y++) for (let k = 0; k < s + 1; k++) pb.set(x + k, y, WOOD[k === 0 ? 1 : 2 + (hash(x, y >> 3, 2) < .2 ? 1 : 0)]);
  let n = 0;
  for (let y = yb - gap; y > yt + s * 2; y -= gap, n++) {
    for (let x = x0 - s * 2; x <= x1 + s * 3; x++) for (let k = 0; k <= s; k++) pb.set(x, y + k, k === 0 ? PLANK[(hash(x >> 3, y, 4) < .3) ? 1 : 0] : PLANK[2]);
    for (let x = x0 - s * 2; x <= x1 + s * 3; x++) pb.set(x, y + s + 1, PLANK[3]);
    // Strebe zum nächsten Riegel (abwechselnd)
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i], b = poles[i + 1];
      if (b - a < gap * .4) continue;
      if ((i + n) & 1) line(pb, a + s, y - 1, b, y - gap + s * 2 + 1, WOOD[2]); else line(pb, b, y - 1, a + s, y - gap + s * 2 + 1, WOOD[2]);
    }
  }
}
// Leiter (Holmen bei x und x + w), Sprossen alle 3·s
function ladder(pb, x, w, yb, yt, s = 1) {
  for (let y = yt; y <= yb; y++) { pb.set(x, y, WOOD[2]); pb.set(x + w, y, WOOD[3]); if (s > 1) { pb.set(x + 1, y, WOOD[2]); pb.set(x + w - 1, y, WOOD[3]); } }
  for (let y = yb - 1; y > yt; y -= 3 * s) for (let i = 0; i <= w; i++) for (let k = 0; k < s; k++) pb.set(x + i, y - k, WOOD[1]);
}
// leere Lampenkammer: nur das eiserne Gerippe (Streben, Ring oben, Ansatz der Kuppel), dazwischen Himmel
function ribs(pb, cx, yb, yt, half, s = 1) {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), x = Math.round(cx - half + u * half * 2);
    for (let y = yt; y <= yb; y++) for (let k = 0; k < s; k++) pb.set(x + k, y, IRON[u < .5 ? 1 : 2]);
  }
  for (let x = Math.round(cx - half - s); x <= cx + half + s; x++) for (let k = 0; k < s + 1; k++) { pb.set(x, yt + k, IRON[k ? 2 : 0]); pb.set(x, yb - k, IRON[k ? 3 : 1]); }
  // Kuppel-Rippen (noch ohne Dach): zwei Bögen
  for (let i = 0; i <= 20; i++) {
    const a = i / 20 * Math.PI, x = cx - Math.cos(a) * half, y = yt - Math.sin(a) * half * .55;
    for (let k = 0; k < s; k++) pb.set(Math.round(x) + k, Math.round(y), IRON[2]);
  }
  for (let y = Math.round(yt - half * .55 - 3 * s); y <= yt - half * .55; y++) for (let k = 0; k < s; k++) pb.set(cx + k, y, IRON[1]);
}
// Galerie: auskragende Eisenplatte und Geländer
function gallery(pb, cx, y, half, s = 1) {
  for (let x = Math.round(cx - half); x <= cx + half; x++) for (let k = 0; k < 2 * s; k++) pb.set(x, y + k, k < s ? IRON[x < cx ? 0 : 1] : IRON[3]);
  for (let x = Math.round(cx - half) + 1; x <= cx + half; x += 3 * s) for (let k = 0; k < s; k++) for (let j = 1; j <= 4 * s; j++) pb.set(x + k, y - j, IRON[2]);
  for (let x = Math.round(cx - half); x <= cx + half; x++) for (let k = 0; k < s; k++) pb.set(x, y - 4 * s - k, IRON[1]);
  // Konsolen darunter
  for (let x = Math.round(cx - half) + 2 * s; x < cx + half; x += 6 * s) line(pb, x, y + 2 * s, x + (x < cx ? 3 : -3) * s, y + 6 * s, IRON[3]);
}

/* =========================================================
   STATISCHE EBENEN (setup, einmal je Spiel)
   ========================================================= */
let L = null;
const SKY_W = 360;
const TW = 320, TH = 470;                                         // hohe Ebene für die Fahrt am Turm hinauf
const TCX = 148, T_BASE = 440, T_PLINTH = 408, T_TOP = 96, T_RIB = 44;   // Turm in der hohen Ebene
const FIG = { x: TCX + 30, y: T_TOP - 1 };                         // Füße der Figur auf der Galerie
const W_TCX = 232, W_BASE = 146, W_TOP = 60;                      // Turm in der weiten Einstellung
const HOOK1 = { x: W_TCX + 34, y: W_TOP - 10 }, HOOK2 = { x: TCX + 104, y: T_RIB - 6 };   // Kranspitzen (Seil hängt hier)
const DECK = 126, JET0 = 64, JET1 = 172;                          // Steg in Einstellung 3
const PW_ = 176, PH_ = 128, PX0 = 22, PY0 = 18, PLW = 220, PLH = 166;   // Plan auf den Bohlen (Ebene PLW×PLH)

function skyLayer(w, h, hor, sunX, sunY) {
  return layer(w, h, (x, y) => {
    const f = y / hor;
    // Sonne halb über dem Horizont
    const sd = Math.hypot(x + .5 - sunX, (y + .5 - sunY) * 1.05);
    if (sd < 12) return sd < 7 ? SUN_C : SUN;
    const n = fbm(x / 80, y / 7, 21, 4), m = fbm(x / 26, y / 4, 22, 2);
    let l = Math.pow(clamp(f, 0, 1), 1.25) * 8 + (bay(x, y) - .5) * .7 - clamp(1 - sd / 120, 0, 1) * .8 + (sd < 40 ? .6 : 0);
    // Streifenwolken: Unterseite vom Abendlicht angestrahlt
    if (n > .56 && f > .18 && f < .9) {
      const k = (fbm(x / 80, (y + 2) / 7, 21, 4) < .56) ? 0 : (fbm(x / 80, (y - 2) / 7, 21, 4) < .56) ? 3 : m > .5 ? 1 : 2;
      return CLOUD[clamp(k + (sd > 160 ? 1 : 0), 0, 3)];
    }
    if (f < .32 && hash(x, y, 9) < .004) return '#e8e2ff';     // erste Sterne
    return DUSK[clamp(Math.round(l), 0, 8)];
  });
}
function seaLayer(w, h, sunX) {
  return layer(w, h, (x, y) => {
    const f = y / h, d = Math.abs(x - sunX), col = 10 + f * 50;
    let l = 2 + Math.pow(f, .6) * 3.2 + (bay(x, y) - .5) * .6 + (vnoise(x / 9, y / 1.5, 31) - .5) * .9;
    if (d < col && hash(Math.floor(x / 3), y, 33) < .55 * (1 - d / col)) l -= 2.6 * (1 - d / col) + .6;   // Glitzerbahn der Sonne
    if (y === 0) l = 1;
    return SEA[clamp(Math.round(l), 0, 5)];
  });
}

function setup() {
  if (L) return;
  L = {
    sky: skyLayer(SKY_W, HOR, HOR, 70, HOR + 2), sea: seaLayer(SKY_W, H - HOR, 70),
    skyT: buildTallSky(), wide: buildWide(), tall: buildTall(), jetty: buildJetty(), boat: buildBoat(), plan: buildPlanLayer(),
    fig: [0, 1, 2].map(buildPlayer), tiny: [0, 1].map(buildTiny),
    brann: { hold: buildBrann('hold'), lift: buildBrann('lift') },
    vig: makeVignette('#140f20', 1.25, .65), vigWarm: makeVignette('#1a1008', 1.3, .7)
  };
}

/* ---------- Einstellung 1: die Heimatinsel in der Dämmerung, der halbfertige Turm auf der Landzunge ---------- */
function buildWide() {
  const pb = new PB(SKY_W, H);
  // Landzunge: Fels von x 150 nach rechts, oben Gras im Schatten, rechts die Hügel mit der Fabrik
  const top = (x) => x < 150 ? 999 : Math.round(148 - Math.min(1, (x - 150) / 30) * 6 - Math.max(0, x - 280) * .28 + (vnoise(x / 7, 3, 41) - .5) * 4 - (x > 200 && x < 264 ? 0 : 0));
  for (let x = 150; x < SKY_W; x++) {
    const t = x > 196 && x < 268 ? 141 : top(x);
    for (let y = t; y < H; y++) {
      if (y < HOR + 4 && x < 150) continue;
      const d = y - t, n = vnoise(x / 3, y / 6, 43);
      let l = 1.2 + d / 22 + (n - .5) * 1.4 + (x - 150) / 400;
      if (d < 2) l = d ? 1.4 : .6;
      pb.set(x, y, step(ROCK, l, x, y));
    }
  }
  // Fabrik auf den Hügeln rechts: Schattenrisse mit erleuchteten Fenstern und Schornsteinen
  for (const [x, w, h, ch] of [[292, 22, 14, 1], [318, 16, 10, 0], [336, 20, 18, 1]]) {
    const y0 = top(x + (w >> 1)) - h;
    pb.rect(x, y0, w, h + 4, '#2c2234'); pb.rect(x, y0, w, 1, '#4a3a4c');
    for (let wx = x + 3; wx < x + w - 2; wx += 5) if (hash(wx, y0, 7) < .7) pb.rect(wx, y0 + 4, 2, 2, '#ffc060');
    if (ch) { pb.rect(x + w - 6, y0 - 12, 4, 12, '#2c2234'); pb.rect(x + w - 6, y0 - 12, 4, 1, '#4a3a4c'); }
  }
  // Turm: Sockel, Schaft, Galerie, leeres Gerippe der Lampenkammer
  towerBody(pb, W_TCX, W_BASE, W_BASE - 8, 18, 17, 3);
  towerBody(pb, W_TCX, W_BASE - 8, W_TOP, 10, 7, 3);
  gallery(pb, W_TCX, W_TOP, 11);
  ribs(pb, W_TCX, W_TOP - 5, W_TOP - 15, 5);
  scaffold(pb, [W_TCX - 15, W_TCX - 12, W_TCX + 12, W_TCX + 15], W_BASE - 8, W_TOP + 2, 11);
  ladder(pb, W_TCX - 19, 2, W_BASE - 8, W_TOP + 6);
  // Kran oben rechts
  for (let y = W_TOP - 14; y < W_TOP + 4; y++) { pb.set(W_TCX + 15, y, WOOD[1]); pb.set(W_TCX + 16, y, WOOD[2]); }
  line(pb, W_TCX + 15, W_TOP - 14, HOOK1.x, HOOK1.y, WOOD[1]); line(pb, W_TCX + 16, W_TOP - 9, HOOK1.x - 2, HOOK1.y, WOOD[2]);
  // Steinblöcke am Fuß
  for (const [x, y] of [[206, 138], [212, 137], [252, 138]]) { pb.rect(x, y, 5, 3, TOWER[2]); pb.rect(x, y, 5, 1, TOWER[1]); }
  return cvOf(pb);
}

/* ---------- Einstellung 2: hohe Ebene, Turm aus der Nähe, Gerüst, oben die Figur ---------- */
function buildTallSky() {
  return layer(TW, TH, (x, y) => {
    const f = y / (TH - 40), n = fbm(x / 90, y / 9, 61, 4);
    let l = Math.pow(clamp(f, 0, 1), 1.1) * 8.2 + (bay(x, y) - .5) * .7 - (x < 60 ? (60 - x) / 120 : 0);
    if (n > .6 && f > .25 && f < .85) return CLOUD[(fbm(x / 90, (y + 3) / 9, 61, 4) < .6) ? 0 : x < 120 ? 1 : 2];
    if (f < .3 && hash(x, y, 19) < .005) return '#e8e2ff';
    return DUSK[clamp(Math.round(l), 0, 8)];
  });
}
function buildTall() {
  const pb = new PB(TW, TH);
  // Fels und Brandung ganz unten
  for (let x = 0; x < TW; x++) {
    const t = Math.round(T_BASE - 6 + (vnoise(x / 9, 1, 71) - .5) * 10 + Math.abs(x - TCX) * .05);
    for (let y = t; y < TH; y++) pb.set(x, y, step(ROCK, 1 + (y - t) / 9 + (vnoise(x / 4, y / 5, 72) - .5) * 1.4 + x / 500, x, y));
  }
  for (let x = 0; x < TW; x++) for (let y = TH - 10; y < TH; y++) if (vnoise(x / 6, y / 2, 73) > .45) pb.set(x, y, SEA[(x + y) % 3 ? 3 : 2]);
  // Sockel und Schaft
  towerBody(pb, TCX, T_BASE, T_PLINTH, 74, 72, 7, 2);
  towerBody(pb, TCX, T_PLINTH, T_TOP + 2, 42, 29, 7, 2);
  // Fenster im Schaft (Treppenhaus), dunkel
  for (const wy of [T_PLINTH - 80, T_PLINTH - 180]) { pb.rect(TCX - 8, wy, 10, 16, '#1e1a2c'); pb.rect(TCX - 8, wy, 10, 2, TOWER[1]); pb.rect(TCX - 10, wy + 16, 14, 2, TOWER[1]); }
  gallery(pb, TCX, T_TOP, 46, 2);
  ribs(pb, TCX, T_TOP - 10, T_RIB, 20, 2);
  // Gerüst rund um den Schaft, Leiter links, Kran oben rechts
  scaffold(pb, [TCX - 62, TCX - 50, TCX + 46, TCX + 60], T_PLINTH, T_TOP + 4, 40, 2);
  ladder(pb, TCX - 76, 8, T_PLINTH, T_TOP + 12, 2);
  for (let y = T_RIB - 20; y <= T_TOP + 4; y++) for (let k = 0; k < 3; k++) pb.set(TCX + 60 + k, y, WOOD[k ? 2 : 1]);
  line(pb, TCX + 60, T_RIB - 20, HOOK2.x, HOOK2.y, WOOD[1]); line(pb, TCX + 61, T_RIB - 19, HOOK2.x, HOOK2.y + 1, WOOD[1]);
  line(pb, TCX + 62, T_RIB - 6, HOOK2.x - 4, HOOK2.y + 1, WOOD[2]);
  // Seilrolle und Seilbund auf der Galerie, Eimer
  pb.rect(TCX - 24, T_TOP - 6, 6, 6, WOOD[2]); pb.rect(TCX - 23, T_TOP - 5, 4, 4, WOOD[1]); pb.rect(TCX - 23, T_TOP - 7, 4, 1, IRON[2]);
  for (let i = 0; i < 6; i++) pb.rect(TCX - 38 + i * 2, T_TOP - 3 - (i & 1), 2, 3, '#c8b88a');
  return cvOf(pb);
}
// Spieler (klein, von der Seite, schaut nach links zur Sonne): grüner Mantel mit Messingknöpfen, helle Strähne im Haar.
// f = Bild des wehenden Mantelsaums (Wind von links)
function buildPlayer(f) {
  const tail = [['.......', '.......', '.......'], ['c......', 'cc.....', '.c.....'], ['cc.....', '.cc....', '..c....']][f];
  const rows = [
    '..HHH......',
    '.HHSHH.....',
    '.FHHHH.....',
    'FFHHH......',
    '.FFH.......',
    '..KC.......',
    '.RCCCc.....',
    '.RBCCcc....',
    '.RCCCcc' + tail[0].slice(0, 4),
    '.RBCCcc' + tail[1].slice(0, 4),
    '.RCCCcc' + tail[2].slice(0, 4),
    '.RCCCcc....',
    '..CCccc....',
    '..LL.L.....',
    '..LL.L.....',
    '..LL.LL....',
    '.KKK.KK....'
  ];
  return tpl(rows, { H: '#3a2a22', S: '#efe2b8', F: '#d89a78', K: '#2a2028', C: COAT[1], c: COAT[2], R: '#b08a5a', B: '#e8c060', L: '#2e2a30' }, '#120c14');
}
// Winzige Figur für die weite Einstellung (3×6)
function buildTiny(f) { return tpl(['.H.', 'RC.', 'RCc', 'RC' + (f ? 'c' : '.'), '.L.', '.L.'], { H: '#3a2a22', R: '#a07a50', C: COAT[2], c: COAT[3], L: '#201820' }, null); }

/* ---------- Einstellung 3: Steg am Fuß des Turms, Branns Boot ---------- */
function buildJetty() {
  const pb = new PB(W, H);
  // Turmfuß links: Fels, Sockel, Schaft (oben aus dem Bild), Gerüststangen
  for (let x = 0; x < 132; x++) {
    const t = Math.round(116 - Math.max(0, 70 - x) * .25 + (vnoise(x / 6, 2, 81) - .5) * 6 + Math.max(0, x - 96) * .6);
    for (let y = t; y < H; y++) pb.set(x, y, step(ROCK, 1 + (y - t) / 14 + (vnoise(x / 4, y / 6, 82) - .5) * 1.4, x, y));
  }
  towerBody(pb, 12, 118, 70, 74, 73, 7, 2);
  towerBody(pb, 12, 70, 0, 44, 40, 7, 2);
  scaffold(pb, [62, 76], 70, 0, 40, 2);
  // Steg: Bohlen, Pfähle ins Wasser, Poller
  for (let x = JET0; x < JET1; x++) for (let k = 0; k < 4; k++) pb.set(x, DECK + k, k === 0 ? PLANK[(x % 9 === 0) ? 2 : 0] : k < 3 ? PLANK[(x % 9 === 0) ? 3 : 1] : PLANK[3]);
  for (let x = JET0 + 6; x < JET1; x += 22) for (let y = DECK + 4; y < H; y++) { pb.set(x, y, WOOD[2]); pb.set(x + 1, y, WOOD[3]); pb.set(x + 2, y, WOOD[3]); }
  pb.rect(JET1 - 8, DECK - 5, 4, 5, WOOD[2]); pb.rect(JET1 - 8, DECK - 5, 4, 1, WOOD[0]); pb.rect(JET1 - 9, DECK - 6, 6, 1, WOOD[3]);
  // Laterne am Steg (dunkler Mast, warmes Licht)
  for (let y = DECK - 24; y < DECK; y++) { pb.set(JET0 + 40, y, WOOD[3]); pb.set(JET0 + 41, y, WOOD[3]); }
  pb.rect(JET0 + 38, DECK - 31, 6, 7, IRON[3]); pb.rect(JET0 + 39, DECK - 30, 4, 5, '#ffd27a'); pb.rect(JET0 + 40, DECK - 29, 2, 3, '#fff2c0');
  return cvOf(pb);
}
const BW = 120, BH = 86, GUN = 64;                        // Boot: Breite, Höhe, Oberkante der Bordwand (in der Boots-Ebene)
function buildBoat() {
  const back = new PB(BW, BH), front = new PB(BW, BH);
  // Mast mit aufgetuchtem Segel, Baum, Wanten
  for (let y = 6; y < GUN; y++) { back.set(78, y, WOOD[1]); back.set(79, y, WOOD[2]); }
  for (let x = 30; x < 80; x++) { back.set(x, 44, WOOD[1]); back.set(x, 45, WOOD[3]); }
  for (let x = 32; x < 78; x++) for (let k = 0; k < 4; k++) if (hash(x >> 2, k, 3) < .9) back.set(x, 40 + k, ['#e6d6b8', '#c6b496', '#a29076', '#7e6c5a'][k]);
  line(back, 79, 8, 108, GUN, '#5a4a44'); line(back, 78, 8, 14, GUN, '#5a4a44');
  // Laterne am Heck
  for (let y = 38; y < GUN; y++) back.set(106, y, WOOD[3]);
  back.rect(103, 31, 7, 8, IRON[3]); back.rect(104, 32, 5, 6, '#ffd27a'); back.rect(105, 33, 3, 3, '#fff2c0');
  // Rumpf (vorn, über Branns Beinen): geklinkerte Planken, Bug links
  for (let x = 0; x < BW; x++) {
    const bow = Math.max(0, 1 - x / 22), stern = Math.max(0, (x - 104) / 16);
    const t = GUN + Math.round(bow * -6 + stern * -2), bot = GUN + 18 - Math.round(bow * bow * 16 + stern * 10);
    for (let y = t; y <= bot; y++) {
      const d = y - t, strake = Math.floor(d / 4);
      let l = .6 + d / 9 + (d % 4 === 3 ? 1.1 : 0) + (hash(x >> 3, strake, 5) - .5) * .5 + x / 260;
      front.set(x, y, d === 0 ? WOOD[0] : d === 1 ? WOOD[3] : step(WOOD, l, x, y));
    }
  }
  return { back: cvOf(back), front: cvOf(front) };
}
// Brann (Figur wie in cs_npc_brann): hold = Rolle unter dem linken Arm, lift = hebt die Rolle mit der rechten Hand.
// In der Dämmerung abgedunkelt, links ein warmer Saum (Sonne), rechts ein schwächerer (Laterne am Heck)
const FW = 64, FH = 64, FX = 26, FY = 6;
function fist(pb, hx, hy, side) {
  const x0 = Math.round(hx) - 2, y0 = Math.round(hy) - 2, d = side ? 1 : 0;
  ['.01.', '0112', '1122', '.22.'].forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') pb.set(x0 + x, y0 + y, SKIN[Math.min(3, +c + d)]); }));
}
// Rolle von a nach b (Papier, helle Enden mit Spirale)
function roll(pb, ax, ay, bx, by, r) {
  capsule(pb, ax, ay, bx, by, r, r, ROLLP, .15);
  for (const [x, y] of [[ax, ay], [bx, by]]) { ellipse(pb, x, y, r * .8, r, [ROLLP[0], ROLLP[0], ROLLP[1], ROLLP[2]], .3); pb.set(x, y, ROLLP[3]); }
  // Schnur in der Mitte
  const mx = (ax + bx) / 2, my = (ay + by) / 2, nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny) || 1;
  for (let k = -r; k <= r; k++) pb.set(mx + nx / nl * k, my + ny / nl * k, '#a2484a');
}
function buildBrann(pose) {
  const pb = new PB(FW, FH), X = FX, Y = FY;
  for (const [lx, side] of [[X - 5, 1], [X + 5, -1]]) {
    capsule(pb, lx, Y + 33, lx, Y + 51, 3.6, 3.2, TROU, side > 0 ? .1 : -.15);
    pb.rect(lx - 3, Y + 51, 7, 5, '#2b1f17'); pb.rect(lx - 3, Y + 51, 7, 1, '#4a3628');
  }
  ellipse(pb, X, Y + 23, 11, 12, SHIRT, .05);
  ellipse(pb, X, Y + 15, 13, 4.5, SHIRT, .15);
  for (let y = Y + 17; y < Y + 48; y++) {
    const half = y < Y + 29 ? 6 + (y - Y - 17) * .12 : 8 + (y - Y - 29) * .12;
    for (let x = Math.floor(X - half); x <= X + half; x++) {
      const e = half - Math.abs(x + .5 - X);
      let l = -((x - X) / half) * .6 + (bay(x, y) - .5) * .3 + (hash(x >> 1, y >> 1, 21) - .5) * .4 + .05;
      if (e < 1) l -= .6;
      pb.set(x, y, hash(x >> 1, y >> 1, 40) < .08 ? '#4e3e35' : pick(LEATHER, l));
    }
  }
  line(pb, X - 6, Y + 17, X - 4, Y + 11, LEATHER[1]); line(pb, X + 6, Y + 17, X + 4, Y + 11, LEATHER[2]);
  // Arme, Hände und Rolle auf eigener Ebene mit eigener Kontur
  const ap = new PB(FW, FH), sh = [[X - 11, Y + 15], [X + 11, Y + 15]];
  const A = pose === 'hold'
    ? [[X - 14, Y + 24, X - 7, Y + 30], [X + 13, Y + 25, X + 12, Y + 33]]
    : [[X - 13, Y + 25, X - 12, Y + 33], [X + 18, Y + 20, X + 24, Y + 12]];
  if (pose === 'hold') roll(ap, X - 25, Y + 30, X - 5, Y + 28, 2.6);       // quer unter dem linken Arm
  A.forEach(([ex, ey, hx, hy], i) => {
    const [sx, sy] = sh[i], bias = i ? -.15 : .1;
    capsule(ap, sx, sy, ex, ey - 2, 3.4, 3, SHIRT, bias + .1);
    capsule(ap, ex, ey, hx, hy, 2.6, 2.2, SKIN, bias);
    const ux = ex - sx, uy = ey - sy, ul = Math.hypot(ux, uy), cx = ex - ux / ul * 2.5, cy = ey - uy / ul * 2.5;
    for (let k = -3; k <= 3; k++) ap.set(cx - uy / ul * k, cy + ux / ul * k, k < 0 ? SHIRT[0] : SHIRT[1]);
    fist(ap, hx, hy, i);
  });
  if (pose === 'lift') { roll(ap, A[1][2] - 9, A[1][3] - 2, A[1][2] + 13, A[1][3] - 5, 2.6); fist(ap, A[1][2], A[1][3], 1); }
  ap.outline(EDGE);
  for (let k = 0; k < ap.p.length; k++) if (ap.p[k]) pb.p[k] = ap.p[k];
  // Kopf: Hals, Gesicht, Bart, kurzes Haar, Schutzbrille auf der Stirn; leicht zur Seite (zum Turm) gedreht
  capsule(pb, X, Y + 9, X, Y + 13, 3.4, 3.4, SKIN, -.1);
  ellipse(pb, X, Y + 5.5, 5.6, 6.6, SKIN);
  for (let y = Y + 6; y < Y + 13; y++) for (let x = X - 5; x <= X + 5; x++) if (pb.get(x, y) && SKIN.includes(pb.get(x, y)) && (y > Y + 8 || Math.abs(x - X) > 3)) pb.set(x, y, pick(BEARD, -(x - X) / 6 - (y - Y - 9) / 6 + (bay(x, y) - .5) * .3));
  ellipse(pb, X, Y + 2.2, 6, 4.4, [HAIR_B[0], HAIR_B[0], HAIR_B[1], HAIR_B[1]], 0, (x, y) => y < Y + 3);
  pb.set(X - 3, Y + 5, '#2a1a12'); pb.set(X + 1, Y + 5, '#2a1a12'); pb.set(X - 3, Y + 4, BEARD[1]); pb.set(X - 4, Y + 4, BEARD[1]); pb.set(X + 1, Y + 4, BEARD[1]); pb.set(X + 2, Y + 4, BEARD[1]); pb.set(X - 1, Y + 7, SKIN[2]);
  pb.rect(X - 5, Y, 11, 1, '#3a281d'); pb.rect(X - 3, Y - 1, 2, 2, '#cc9c3c'); pb.rect(X + 1, Y - 1, 2, 2, '#cc9c3c');
  pb.outline(EDGE);
  // Dämmerung: abdunkeln, warmer Saum links (Sonne), schwächer rechts (Laterne)
  const q = pb.p.slice(), out = new PB(FW, FH);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const c = q[y * FW + x];
    if (!c) continue;
    if (c === EDGE) { out.set(x, y, c); continue; }
    const left = !q[y * FW + x - 1] || q[y * FW + x - 1] === EDGE, right = !q[y * FW + x + 1] || q[y * FW + x + 1] === EDGE;
    let o = mix(c, '#2e2446', .4);
    if (left) o = mix(c, '#ffa070', .45); else if (right) o = mix(c, '#ffc888', .25);
    out.set(x, y, o);
  }
  return out.canvas();
}

/* ---------- Einstellung 4: der Plan der Taucherglocke auf den Bohlen ---------- */
const GLYPH = {
  T: ['111', '.1.', '.1.', '.1.', '.1.'], A: ['.1.', '1.1', '111', '1.1', '1.1'], U: ['1.1', '1.1', '1.1', '1.1', '111'],
  C: ['.11', '1..', '1..', '1..', '.11'], H: ['1.1', '1.1', '111', '1.1', '1.1'], E: ['111', '1..', '11.', '1..', '111'],
  R: ['11.', '1.1', '11.', '1.1', '1.1'], G: ['.11', '1..', '1.1', '1.1', '.11'], L: ['1..', '1..', '1..', '1..', '111'],
  O: ['.1.', '1.1', '1.1', '1.1', '.1.'], K: ['1.1', '1.1', '11.', '1.1', '1.1']
};
function letters(pb, s, x, y, c) {
  for (const ch of s) { const g = GLYPH[ch]; if (g) g.forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') pb.set(x + i, y + j, c); })); x += 4; }
}
function scrib(pb, x, y, len, seed, c = INK_F) {
  for (let i = 0; i < len; i++) {
    if (hash(i >> 2, 0, seed) < .18 && i % 5 === 0) { i += 2; continue; }
    const k = hash(i, 1, seed), up = k < .2 ? 2 : k < .5 ? 1 : 0, dn = k > .9 ? 1 : 0;
    for (let j = -up; j <= dn; j++) pb.set(x + i, y + j, c);
  }
}
function circle(pb, cx, cy, r, c, step2 = 1) {
  const n = Math.ceil(r * 7);
  for (let i = 0; i < n; i++) { if (step2 > 1 && i % step2) continue; const a = i / n * Math.PI * 2; pb.set(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c); }
}
const BELL = { cx: 74, top: 30, sh: 50, bot: 106, r0: 22, r1: 34 };   // Glocke im Plan (Plan-Koordinaten)
const bellHalf = (y) => { const B = BELL; if (y < B.sh) { const u = (y - B.top) / (B.sh - B.top); return B.r0 * Math.sqrt(clamp(1 - Math.pow(1 - u, 2), 0, 1)); } return lerp(B.r0, B.r1, Math.pow((y - B.sh) / (B.bot - B.sh), 1.3)); };
function buildPlanLayer() {
  const pb = new PB(PLW, PLH);
  // Bohlen des Stegs (im Schatten), Fugen, Nägel
  for (let y = 0; y < PLH; y++) for (let x = 0; x < PLW; x++) {
    const bd = Math.floor((x + Math.floor(y / 58) * 7) / 26), gap = (x + Math.floor(y / 58) * 7) % 26 === 0;
    const l = 1.6 + (fbm(x / 30, y / 4, 90 + bd, 2) - .5) * 1.2 + (hash(bd, 1, 3) - .5) * .8;
    pb.set(x, y, gap ? PLANK[3] : step(PLANK, l, x, y));
  }
  // Papier
  const P = (x, y, c) => pb.set(PX0 + x, PY0 + y, c);
  for (let y = 0; y < PH_; y++) for (let x = 0; x < PW_; x++) {
    const e = Math.min(x, y, PW_ - 1 - x, PH_ - 1 - y), l = .3 + (fbm(x / 22, y / 18, 91, 3) - .5) * .9 + (e < 3 ? 1.2 - e * .3 : 0) + (y > PH_ - 10 ? .3 : 0);
    P(x, y, step(PAPER, l, x, y));
  }
  // Rahmen, Titel
  for (let x = 4; x < PW_ - 4; x++) { P(x, 4, INK_F); P(x, PH_ - 5, INK_F); }
  for (let y = 4; y < PH_ - 4; y++) { P(4, y, INK_F); P(PW_ - 5, y, INK_F); }
  letters({ set: P }, 'TAUCHERGLOCKE', 108, 10, INK);
  for (let x = 106; x < 162; x++) P(x, 17, INK_F);
  scrib({ set: P }, 108, 22, 40, 3);
  // Kette und Hebeöse oben
  for (let i = 0; i < 4; i++) { const y = 8 + i * 5; circle({ set: P }, BELL.cx, y, 2, INK); }
  circle({ set: P }, BELL.cx, BELL.top - 2, 3, INK);
  // Glocke im Aufriss: Kontur, Schraffur auf der Schattenseite, Nietreihen
  for (let y = BELL.top; y <= BELL.bot; y++) {
    const h = bellHalf(y), xl = Math.round(BELL.cx - h), xr = Math.round(BELL.cx + h);
    P(xl, y, INK); P(xr, y, INK);
    for (let x = xl + 1; x < xr; x++) {
      const u = (x - xl) / (xr - xl);
      if (u > .72 && (x + y) % 3 === 0) P(x, y, INK_F);
      if ((y - BELL.sh) % 12 === 0 && y > BELL.sh && x % 3 === 0) P(x, y, INK_F);
    }
  }
  for (let x = Math.round(BELL.cx - bellHalf(BELL.top + 1)); x <= BELL.cx + bellHalf(BELL.top + 1); x++) P(x, BELL.top, INK);
  // dicker Rand unten mit Ballastgewichten
  for (let x = BELL.cx - BELL.r1 - 3; x <= BELL.cx + BELL.r1 + 3; x++) { P(x, BELL.bot, INK); P(x, BELL.bot + 4, INK); }
  for (let y = BELL.bot; y <= BELL.bot + 4; y++) { P(BELL.cx - BELL.r1 - 3, y, INK); P(BELL.cx + BELL.r1 + 3, y, INK); }
  for (const gx of [BELL.cx - 30, BELL.cx - 10, BELL.cx + 10, BELL.cx + 30]) { for (let y = BELL.bot + 5; y < BELL.bot + 10; y++) for (let x = gx - 3; x <= gx + 3; x++) if (x === gx - 3 || x === gx + 3 || y === BELL.bot + 9) P(x, y, INK); }
  // drei Bullaugen mit Nietkranz
  for (const [ox, oy, r] of [[BELL.cx - 14, 66, 6], [BELL.cx + 12, 66, 6], [BELL.cx - 1, 86, 7]]) {
    circle({ set: P }, ox, oy, r, INK); circle({ set: P }, ox, oy, r - 2, INK_F); circle({ set: P }, ox, oy, r + 2, INK, 3);
    for (let k = -2; k <= 1; k++) P(ox + k - 1, oy - 2 + k, INK_F);   // Glanz im Glas
  }
  // Luftschlauch zur Seite, Ventil
  // Luftschlauch von der Kuppel nach links oben (zur Pumpe an Bord), Ventil rot
  for (let i = 0; i <= 44; i++) { const u = i / 44, x = BELL.cx - BELL.r0 + 4 - u * 40, y = BELL.sh - 8 - Math.sin(u * Math.PI * .8) * 18 + u * 2; P(Math.round(x), Math.round(y), INK); P(Math.round(x), Math.round(y) + 2, INK); }
  circle({ set: P }, BELL.cx - BELL.r0 + 3, BELL.sh - 6, 2, INK_R);
  scrib({ set: P }, 12, 22, 22, 19);
  // Maßlinie rechts (Höhe), rote Pfeile
  const mx = BELL.cx + BELL.r1 + 12;
  for (let y = BELL.top; y <= BELL.bot + 4; y++) P(mx, y, INK_R);
  for (let k = 0; k < 3; k++) { P(mx - k, BELL.top + k, INK_R); P(mx + k, BELL.top + k, INK_R); P(mx - k, BELL.bot + 4 - k, INK_R); P(mx + k, BELL.bot + 4 - k, INK_R); }
  scrib({ set: P }, mx + 4, 70, 9, 7, INK_R);
  // Querschnitt rechts: Glocke mit Luftblase und Wasserlinie, Figur darin
  const qx = 150, qy = 58;
  for (let y = 0; y < 34; y++) { const h = y < 8 ? 8 + y * .6 : 12 + (y - 8) * .2; P(Math.round(qx - h), qy + y, INK); P(Math.round(qx + h), qy + y, INK); }
  for (let x = qx - 8; x <= qx + 8; x++) P(x, qy, INK);
  for (let x = qx - 16; x <= qx + 16; x++) if (x % 2) P(x, qy + 26, INK_F);            // Wasserspiegel in der Glocke
  for (let x = qx - 16; x <= qx + 16; x++) P(x, qy - 12 + Math.round(Math.sin(x / 3) * 1), INK_F);   // Meeresoberfläche
  for (const [x, y] of [[qx - 2, qy + 14], [qx - 2, qy + 15], [qx - 3, qy + 16], [qx - 1, qy + 16], [qx - 2, qy + 17], [qx - 2, qy + 18], [qx - 3, qy + 20], [qx - 1, qy + 20], [qx - 2, qy + 19], [qx - 2, qy + 13]]) P(x, y, INK);
  for (const [x, y] of [[qx + 5, qy + 30], [qx + 7, qy + 36], [qx + 4, qy + 40]]) circle({ set: P }, x, y, 1, INK_F);
  scrib({ set: P }, qx - 16, qy + 46, 30, 11);
  scrib({ set: P }, 108, PH_ - 16, 54, 13);
  scrib({ set: P }, 12, PH_ - 12, 30, 17);
  // Handzeichen unten rechts: ein kleines Zahnrad (Brann)
  circle({ set: P }, PW_ - 16, PH_ - 15, 4, INK); circle({ set: P }, PW_ - 16, PH_ - 15, 6, INK, 2); P(PW_ - 16, PH_ - 15, INK);
  // Oberkante noch eingerollt (Rolle liegt oben), unten hält ein Hammer das Papier
  for (let x = -3; x < PW_ + 3; x++) for (let k = 0; k < 7; k++) {
    const ny = (k + .5) / 7 * 2 - 1;
    pb.set(PX0 + x, PY0 - 5 + k, step(ROLLP, 1.1 + ny * 1.6 - (1 - ny * ny) * .4 + ((x < 0 || x >= PW_) ? 1.2 : 0), x, k));
  }
  for (let x = PX0 + 120; x < PX0 + 150; x++) for (let k = 0; k < 3; k++) pb.set(x, PY0 + PH_ - 4 + k, WOOD[k ? 2 : 1]);
  pb.rect(PX0 + 148, PY0 + PH_ - 9, 7, 12, IRON[2]); pb.rect(PX0 + 148, PY0 + PH_ - 9, 7, 2, IRON[0]);
  return cvOf(pb);
}

/* =========================================================
   ZEICHNEN
   ========================================================= */
const vig = (ctx, a = .55, warm) => { ctx.globalAlpha = a; ctx.drawImage(warm ? L.vigWarm : L.vig, 0, 0); ctx.globalAlpha = 1; };
// Wind: weicher Wechsel aus zwei Schwingungen (Böen), 0–1
const gust = (t) => .5 + Math.sin(t * .9) * .3 + Math.sin(t * 2.3 + 1) * .2;
const coatFrame = (t) => { const g = gust(t), p = Math.floor(t * (5 + g * 5)) % 4; return g > .55 ? (p === 3 ? 1 : 2) : p === 0 ? 0 : 1; };
// Seil mit Haken, pendelt im Wind (von x, y aus, Länge len, Pixelgröße s)
function hook(ctx, x, y, len, t, s = 1, ph = 0) {
  const a = Math.sin(t * 1.1 + ph) * .09 + (gust(t) - .5) * .06, ex = x + Math.sin(a) * len, ey = y + Math.cos(a) * len;
  ctx.fillStyle = '#b8a888';
  const n = Math.ceil(len);
  for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(lerp(x, ex, i / n)), Math.round(lerp(y, ey, i / n)), s, s);
  ctx.fillStyle = IRON[3]; ctx.fillRect(Math.round(ex) - s, Math.round(ey), 3 * s, 2 * s);
  ctx.fillStyle = IRON[1]; ctx.fillRect(Math.round(ex), Math.round(ey) + 2 * s, s, 2 * s); ctx.fillRect(Math.round(ex) - s, Math.round(ey) + 3 * s, s, s);
}
// Möwen (kleine Winkel), ziehen langsam
function gulls(ctx, t, ox, oy, n = 3) {
  ctx.fillStyle = '#2a2236';
  for (let i = 0; i < n; i++) {
    const x = Math.round((40 + i * 37 + t * (5 + i)) % 380 - ox * .5 - 20), y = Math.round(36 + i * 9 + Math.sin(t * .8 + i) * 3 - oy), up = Math.floor(t * 3 + i) % 2;
    ctx.fillRect(x - 2, y - up, 2, 1); ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y - up, 2, 1);
  }
}
// Glitzern auf der Sonnenbahn
function glitter(ctx, t, x0, y0, w, h, sunX) {
  ctx.fillStyle = '#ffe2b0';
  for (let i = 0; i < 26; i++) {
    const p = hash(i, Math.floor(t * 2 + i * .37), 51), y = y0 + Math.floor(hash(i, 3, 52) * h), sp = 8 + (y - y0) * .8;
    if (p < .5) continue;
    ctx.fillRect(Math.round(sunX - x0 + (hash(i, Math.floor(t * 2 + i * .37), 53) - .5) * sp * 2), y, 2, 1);
  }
}

// Einstellung 1: weit, Kamera gleitet langsam nach rechts zum Turm
function renderWide(ctx, t, u) {
  const ox = Math.round(lerp(0, 36, u));
  ctx.drawImage(L.sky, -ox * .4, 0);
  ctx.drawImage(L.sea, -ox * .7, HOR);
  glitter(ctx, t, ox * .7, HOR + 2, H - HOR - 4, 70);
  glow(ctx, 70 - ox * .4, HOR, 90, .28, SUNC);
  gulls(ctx, t, ox, 0);
  ctx.drawImage(L.wide, -ox, 0);
  hook(ctx, HOOK1.x - ox, HOOK1.y, 14, t);
  ctx.drawImage(L.tiny[Math.floor(t * 4) % 2 && gust(t) > .5 ? 1 : 0], W_TCX + 6 - ox, W_TOP - 6);
  glow(ctx, 120 - ox, 120, 160, .12, SUNC);
}
// Einstellung 2: hohe Ebene, Kamera fährt am Turm hinauf; oy = obere Kante des Ausschnitts
function renderTall(ctx, t, oy, ox = 0) {
  oy = Math.round(oy); ox = Math.round(ox);
  const sy = Math.round(oy * .7 + (TH - H) * .3);          // Himmel zieht langsamer mit (Parallaxe)
  ctx.drawImage(L.skyT, 0, sy, TW, H, Math.round(-ox * .3), 0, TW, H);
  glow(ctx, -20, TH - 30 - sy, 200, .18, SUNC);
  gulls(ctx, t, 0, -40, 2);
  ctx.drawImage(L.tall, 0, oy, TW, H, -ox, 0, TW, H);
  hook(ctx, HOOK2.x - ox, HOOK2.y - oy, 34, t, 2, 1);
  // Figur oben auf der Galerie, Mantel im Wind
  const F = L.fig[coatFrame(t)];
  ctx.drawImage(F, FIG.x - ox, FIG.y - oy - F.height + 1);
  // warmer Saum: Abendlicht von links auf Turm und Figur
  glow(ctx, FIG.x - ox - 4, FIG.y - oy - 10, 30, .18, SUNC);
}
// Einstellung 3: Steg, Boot legt an; bx = Bug des Boots (Bildschirm), bob = Schaukeln, pose = Branns Haltung
const DOCK_X = JET1 + 1;
function renderJetty(ctx, t, bx, pose, still) {
  ctx.fillStyle = DUSK[0]; ctx.fillRect(0, 0, W, 8);
  ctx.drawImage(L.sky, -10, 8);
  ctx.drawImage(L.sea, -10, HOR + 8);
  glitter(ctx, t, 10, HOR + 10, H - HOR - 12, 70);
  glow(ctx, 60, HOR + 8, 90, .25, SUNC);
  if (!still) gulls(ctx, t, 30, -6, 2);
  ctx.drawImage(L.jetty, 0, 0);
  const bob = Math.round(Math.sin(t * 1.6) * 1.2), by = DECK + 2 - GUN + bob;
  ctx.drawImage(L.boat.back, Math.round(bx), by);
  const B = L.brann[pose];
  ctx.drawImage(B, Math.round(bx) + 46 - FX, by + GUN + 8 - FH);
  ctx.drawImage(L.boat.front, Math.round(bx), by);
  // Wellen am Rumpf
  ctx.fillStyle = SEA[1];
  for (let i = 0; i < 9; i++) { const x = Math.round(bx) + 6 + i * 12 + Math.round(Math.sin(t * 2 + i) * 2); ctx.fillRect(x, by + GUN + 15 - bob, 5, 1); }
  // Laternen: Steg und Heck
  const fl = .5 + Math.sin(t * 7.1) * .05 + Math.sin(t * 12.7) * .04;
  glow(ctx, JET0 + 41, DECK - 27, 40, fl * .55, LANT);
  glow(ctx, Math.round(bx) + 106, by + 35, 46, fl * .6, LANT);
}
const boatX = (lt) => lerp(330, DOCK_X, 1 - Math.pow(1 - clamp(lt / 5.4, 0, 1), 2.6));
// Einstellung 4: der Plan, doppelte Pixelgröße, Kamera gleitet langsam vom Titel über die Glocke zum Bullauge
function renderPlan(ctx, t, u) {
  const s = 2, ox = lerp(40, 22, u), oy = lerp(12, 72, u);   // Ausschnitt 160×90 der Ebene PLW×PLH
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(L.plan, Math.round(-ox * s), Math.round(-oy * s), PLW * s, PLH * s);
  // Laterne steht links oben neben dem Plan: warmer Lichtfleck, flackert
  const fl = .5 + Math.sin(t * 7.1) * .05 + Math.sin(t * 12.7) * .04;
  glow(ctx, Math.round((PX0 + 30 - ox) * s), Math.round((PY0 + 20 - oy) * s), 260, fl * .38, LANT);
  ctx.globalAlpha = .16; ctx.fillStyle = '#2a2050'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;   // Dämmerung
  glow(ctx, Math.round((PX0 + 30 - ox) * s), Math.round((PY0 + 20 - oy) * s), 160, fl * .3, LANT);
}

export const _debugPlan = () => (setup(), L.plan);
export default {
  id: 'cs_licht_im_wind',
  title: 'Ein Licht im Wind',
  len: T_END,
  dialog: 'brann_glocke',
  setup,
  shots: [
    // Einstellung 1: Dämmerung, der halbfertige Turm; das Seil am Kran pendelt im Wind
    { from: 0, to: T_UP, draw(ctx, lt, t) {
      renderWide(ctx, t, ease(t / (T_UP - .2)));
      vig(ctx, .5);
      black(ctx, 1 - t / 1.8);
    } },
    // Einstellung 2: harter Schnitt an den Turm, Kamera fährt hinauf zur leeren Lampenkammer; oben die Figur im grünen Mantel
    { from: T_UP, to: T_BOAT, draw(ctx, lt) {
      const u = ease((lt - .4) / 6.6);
      renderTall(ctx, T_UP + lt, lerp(TH - H, 0, u));
      vig(ctx, .5);
    } },
    // Einstellung 3: Branns Boot legt am Steg an, er trägt eine Rolle und hebt sie hoch
    { from: T_BOAT, to: T_PLAN, draw(ctx, lt, t) {
      renderJetty(ctx, t, boatX(lt), lt < 6.2 ? 'hold' : 'lift');
      vig(ctx, .5);
    } },
    // Einstellung 4: Nahaufnahme – der Bauplan einer Taucherglocke; Abblende
    { from: T_PLAN, to: T_END, draw(ctx, lt, t) {
      renderPlan(ctx, t, ease(lt / (T_FADE - T_PLAN)));
      vig(ctx, .6, true);
      black(ctx, (t - T_FADE) / 1.2);
    } }
  ],
  // Hintergrund des Dialogs: Brann im Boot am Steg, die Rolle in der Hand; el = Sekunden seit Dialogbeginn, now = Uhr (s)
  dialogBg(ctx, el, now) {
    renderJetty(ctx, now, DOCK_X, 'lift', true);
    vig(ctx, .5);
  }
};
