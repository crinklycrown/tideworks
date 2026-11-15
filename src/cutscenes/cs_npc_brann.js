/* =========================================================
   CUTSCENE cs_npc_brann „Funken in der Werkstatt“ (Akt 1: Schiff erreicht Branns Insel)
   Nach docs/STORY.md; ruhiger als dort angegeben (Max' Wunsch: jede Einstellung braucht Zeit).
   Bewölkt, aber trocken, warmes Werkstattlicht: Kamera gleitet vom Wasser in die Bucht mit Kränen und Schornsteinen (0–8 s) ·
   Hämmern im offenen Tor, Funken fliegen heraus (8–14 s) · über die Schulter des Spielers (grüner Mantel): Brann tritt heraus
   und wischt die Hände an einem Lappen ab (14–21 s) · Großaufnahme: Er mustert dich zu lange (21–27,4 s), Abblende bis 28,6 s.
   Danach Dialog brann_1 vor der Werkstatt.
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, vnoise, fbm, PB, pick, layer, vignette as makeVignette, disc, glow, black } from '../cutscene/kit.js';
import { portrait } from '../gfx/portraits.js';

const T_GATE = 8, T_OUT = 14, T_CLOSE = 21, T_FADE = 27.4, T_END = 28.6;
const HOR = 100;                                        // Horizont der weiten Einstellung

/* ---------- Farbpaletten: bedeckter, trockener Tag, warmes Licht aus der Werkstatt ---------- */
const SKY = ['#77787d', '#85858a', '#949392', '#a5a19b', '#b6b0a6', '#c6beb1'];
const CLOUD = ['#d2cabd', '#bdb5a9', '#6c6b6f', '#5d5c61'];       // helle Ränder, dunkle Wolkenbäuche
const SEA = ['#a4a8a2', '#8a928f', '#73807f', '#5f6e6f', '#4f5e61', '#424f53'];
const ROCK = ['#a69a88', '#8a7e6e', '#6e6457', '#534b41'];
const GRASS = ['#8c9468', '#717b53', '#586143'];
const BRICK = ['#b5694b', '#94503b', '#733d2e', '#4f2a20'];
const MORTAR = '#9e9284';
const SLATE = ['#74767b', '#5e6066', '#4a4c51', '#36383c'];
const WOOD = ['#9a7350', '#7a5939', '#5c432c', '#3c2b1d'];
const STONE = ['#b3a998', '#988e7e', '#7c7365', '#5f574c'];
const IRON = ['#9a9a98', '#76777a', '#55575b', '#393b3f'];
const COAT = ['#4a7a58', '#365f45', '#264a35', '#183224'];       // Mantel des Spielers (wie im Prolog)
const HAIR_P = ['#4a3628', '#33251b', '#241a13'];
const SKIN = ['#e8b48c', '#cb8e68', '#a66b4a', '#744530'];       // Brann (wie das Porträt)
const SHIRT = ['#e4d9c2', '#c6b99f', '#a1957c', '#786c58'];
const LEATHER = ['#b77c47', '#945d33', '#6f4325', '#4b2b17'];
const TROU = ['#6f665a', '#585148', '#443f37', '#302c26'];
const BEARD = ['#6c5242', '#503c30', '#3b2b22', '#281c16'];
const HAIR_B = ['#5a4638', '#3b2d24'];
const WARM = '#ffb24a', WARM_L = '#ffd98a';
const FORGE = '255,140,50', LAMP = '255,190,100';
const SPARK = ['#fff6c8', '#ffd660', '#ff9c2c', '#d85a1c'];
const RAG = ['#bccad3', '#95a6b3', '#6e7f8d', '#4b5864'];       // Lappen (verwaschenes Blau, gegen Schürze und Hemd)
const EDGE = '#241a14';

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
// Zahnrad (Messing oder Eisen) mit n Zähnen
function gear(pb, cx, cy, r, n, ramp) {
  for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
    const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const tooth = Math.cos(a * n) > .2, rr = tooth ? r + 2 : r;
    if (d > rr || (d < r * .35)) continue;
    const spoke = d < r * .75 && d > r * .45 && Math.abs(Math.sin(a * 3)) > .35;
    if (spoke) continue;
    let l = -(dx * .62 + dy * .55) / r * .9 + (bay(x, y) - .5) * .3;
    if (d > rr - 1) l -= .4;
    pb.set(x, y, pick(ramp, l));
  }
}

/* =========================================================
   STATISCHE EBENEN (setup, einmal je Spiel)
   ========================================================= */
let L = null;
const SKY_W = 400, BAY_W = 380, BAY_H = 100, WL = 80;        // Bucht: Wasserlinie innerhalb der Ebene
const GW = 360, GH = 150;                                     // Werkstatt-Fassade (Einstellung 2 einfach, 3 doppelt)
const GATE = { x: 150, y: 54, w: 40, h: 68 };                 // Toröffnung in der Fassade (Boden bei y + h)
const FLOOR = GATE.y + GATE.h;                                // Pflaster beginnt hier
const SMOKE_B = [], WIN_B = [];                               // Schornsteine und Fenster der Bucht
let CRANE_TIP = [0, 0];

function setup() {
  if (L) return;
  // Himmel: geschlossene Wolkendecke mit hellen Rändern, ferne Inseln
  const skyCv = layer(SKY_W, HOR, (x, y) => {
    const f = y / HOR, n = fbm(x / 64, y / 10, 14, 4), m = fbm(x / 30, y / 6, 15, 2);
    let l = f * 5 + (bay(x, y) - .5) * .55;
    if (n > .55 && y < HOR - 16) { const k = n > .62 ? 3 : 2; if (m > .58 && n < .6) return CLOUD[bay(x, y) < .5 ? 0 : 1]; return bay(x, y) < (n - .5) * 4 ? CLOUD[k] : SKY[clamp(Math.round(l - 1), 0, 5)]; }
    if (n < .4 && m > .6 && y < HOR - 20) l += .8;
    const hill = HOR - 2 - Math.max(0, 6 - Math.abs(x - 40) * .15) * (1 + (vnoise(x / 6, 1, 7) - .5) * .5) - Math.max(0, 4 - Math.abs(x - 360) * .1);
    if (y >= hill && hill < HOR - 2) return (y + x) % 2 ? '#8e8c8a' : '#878684';
    return SKY[clamp(Math.round(l), 0, 5)];
  });
  const seaCv = layer(W, H - HOR, (x, y) => {
    const f = y / (H - HOR), l = Math.pow(f, .7) * 5 + (bay(x, y) - .5) * .5;
    return SEA[clamp(Math.round(l), 0, 5)];
  });
  // Großaufnahme: unscharfe Werkstattwand, warmes Licht rechts
  const closeBG = layer(W, H, (x, y) => {
    const n = fbm(x / 50, y / 16, 81, 3), warm = clamp((x - 200) / 120, 0, 1) * clamp(1 - Math.abs(y - 110) / 90, 0, 1);
    const l = 2.4 - warm * 2.2 + (n - .5) * 1.4 + y / H * .8 + (bay(x, y) - .5) * .5;
    const brick = (Math.floor(y / 9) + Math.floor((x + (Math.floor(y / 9) % 2) * 14) / 28)) % 5 === 0;
    return ['#a46a4c', '#83503c', '#5f3a2e', '#422821', '#2e1d18'][clamp(Math.round(l + (brick ? .5 : 0)), 0, 4)];
  });
  L = {
    skyCv, seaCv, closeBG, bay: buildBay(), facade: buildFacade(), inside: buildInside(), shoulder: buildShoulder(),
    vig: makeVignette('#2a1e17', 1.25, .65), brann: portrait('brann'),
    fig: {}
  };
  for (const p of ['stand', 'walk1', 'walk2', 'wipe1', 'wipe2', 'up', 'mid', 'down']) L.fig[p] = buildBrann(p);
}

/* ---------- Die Werkstattbucht (weite Einstellung): Landzungen, Kai, Halle, Schornsteine, Kräne ---------- */
function buildBay() {
  const pb = new PB(BAY_W, BAY_H);
  const keys = [[0, 62], [20, 44], [40, 24], [56, 15], [70, 22], [86, 34], [104, 52], [118, 64], [286, 64], [298, 50], [314, 30], [330, 11], [348, 18], [366, 32], [380, 44]];
  const top = new Array(BAY_W).fill(WL);
  for (let k = 0; k < keys.length - 1; k++) {
    const [x0, y0] = keys[k], [x1, y1] = keys[k + 1];
    for (let x = x0; x <= x1 && x < BAY_W; x++) top[x] = y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  const QUAY = (x) => x >= 116 && x <= 288;
  for (let x = 0; x < BAY_W; x++) if (!QUAY(x)) top[x] = Math.round(top[x] + (vnoise(x / 4, 2, 5) - .5) * 4);
  const HOUSES = [[44, 11], [66, 10], [304, 10], [322, 12]];
  HOUSES.forEach(([hx, hw]) => { let m = 999; for (let x = hx - 1; x <= hx + hw; x++) m = Math.min(m, top[x]); for (let x = hx - 1; x <= hx + hw; x++) top[x] = m; });
  // Fels und Gras der Landzungen, Kaimauer aus Quadern
  for (let x = 0; x < BAY_W; x++) for (let y = Math.round(top[x]); y < WL; y++) {
    const d = y - top[x];
    if (QUAY(x)) {
      if (d < 2) { pb.set(x, y, d === 0 ? STONE[0] : STONE[1]); continue; }
      const row = Math.floor((y - top[x] - 2) / 3), off = row % 2 ? 4 : 0;
      let c = ((x + off) % 8 === 0 || (y - top[x] - 2) % 3 === 0) ? STONE[3] : pick(STONE, .2 + (hash(Math.floor((x + off) / 8), row, 4) - .5) * .8 + (bay(x, y) - .5) * .3);
      if (y >= WL - 3) c = '#4c463d';
      pb.set(x, y, c); continue;
    }
    const n = vnoise(x / 2.6, y / 8, 11);
    let l = .55 - d / 40 + (n - .5) * .75 + (bay(x, y) - .5) * .25;
    if (top[x] < top[x - 1] - 1) l += .2;
    if (top[x] > top[x + 1] + 1) l -= .2;
    let c = pick(ROCK, l);
    if (y >= WL - 3) c = ROCK[3];
    if (d < 2 || (d === 2 && hash(x, 7, 3) < .45)) c = GRASS[d === 0 ? (hash(x, 1, 2) < .5 ? 0 : 1) : d === 1 ? 1 : 2];
    pb.set(x, y, c);
  }
  const Q = 64;                                        // Höhe des Kais
  // Häuschen an den Hängen (Holz, Schieferdach, warmes Fenster, Schornstein)
  function house(x, base, w, seed) {
    const wallH = 7, rh = Math.ceil(w / 2) + 1, cx = x + (w - 1) / 2;
    for (let y = base - wallH; y < base; y++) for (let i = 0; i < w; i++) pb.set(x + i, y, (y - base) % 3 === 0 ? WOOD[3] : (i === 0 ? WOOD[0] : WOOD[1 + ((i + seed) % 4 === 0 ? 1 : 0)]));
    pb.rect(x + 2, base - 5, 2, 5, '#24180f');
    const wx = x + w - 5; pb.rect(wx - 1, base - 6, 4, 4, WOOD[3]); pb.rect(wx, base - 5, 2, 2, WARM); WIN_B.push([wx + 1, base - 4]);
    for (let k = 0; k < rh; k++) {
      const y = base - wallH - 1 - k, half = (w + 2) / 2 * (1 - k / rh);
      for (let xx = Math.round(cx - half); xx <= Math.round(cx + half); xx++) pb.set(xx, y, k === 0 ? SLATE[3] : xx < cx - half + 1.5 ? SLATE[0] : (k % 2 ? SLATE[1] : SLATE[2]));
    }
    const chx = x + w - 4, chy = base - wallH - rh + 1;
    pb.rect(chx, chy, 2, 4, BRICK[2]); pb.set(chx, chy, BRICK[1]); SMOKE_B.push([chx + 1, chy - 1, .5]);
  }
  HOUSES.forEach(([hx, hw], i) => house(hx, Math.round(top[hx]) + 1, hw, i));
  // Kleiner Holzschuppen links
  for (let y = Q - 12; y < Q; y++) for (let x = 124; x < 146; x++) pb.set(x, y, (x - 124) % 4 === 0 ? WOOD[3] : y === Q - 12 ? WOOD[0] : WOOD[1 + (hash(x, 1, 1) < .3 ? 1 : 0)]);
  pb.rect(129, Q - 8, 5, 8, '#24180f'); pb.rect(138, Q - 9, 4, 4, WOOD[3]); pb.rect(139, Q - 8, 2, 2, WARM); WIN_B.push([140, Q - 7]);
  for (let k = 0; k < 6; k++) for (let x = 122 + k; x <= 148 - k; x++) pb.set(x, Q - 13 - k, k === 0 ? SLATE[3] : x < 124 + k ? SLATE[0] : SLATE[1 + (k % 2)]);
  // Die große Halle aus Ziegeln mit Schieferdach und offenem Tor (hier glüht es)
  for (let y = Q - 22; y < Q; y++) for (let x = 156; x < 216; x++) {
    const row = Math.floor((Q - y) / 2), off = row % 2 ? 2 : 0;
    pb.set(x, y, (Q - y) % 2 === 0 || (x + off) % 4 === 0 ? BRICK[3] : pick(BRICK, .3 - (x - 156) / 80 + (hash(Math.floor((x + off) / 4), row, 9) - .5) * .6));
  }
  for (let k = 0; k < 13; k++) for (let x = 153 + k; x <= 218 - k; x++) pb.set(x, Q - 23 - k, k === 0 ? SLATE[3] : x < 155 + k ? SLATE[0] : ((x + k) % 5 === 0 ? SLATE[3] : SLATE[1 + (k % 2)]));
  for (let y = Q - 15; y < Q; y++) for (let x = 177; x < 193; x++) pb.set(x, y, y > Q - 5 ? (hash(x, y, 3) < .5 ? '#ff9a3a' : '#c4581e') : y > Q - 9 ? '#5a2a14' : '#1b120d');
  pb.rect(176, Q - 16, 18, 1, WOOD[2]);
  [[162, Q - 15], [202, Q - 15]].forEach(([wx, wy]) => { pb.rect(wx - 1, wy - 1, 7, 7, BRICK[3]); pb.rect(wx, wy, 5, 5, WARM); pb.rect(wx + 2, wy, 1, 5, '#7a4a20'); pb.rect(wx, wy + 2, 5, 1, '#7a4a20'); WIN_B.push([wx + 2, wy + 2]); });
  // Hoher Schornstein und Ziegelschuppen mit kleinem Schornstein
  for (let y = 6; y < Q - 20; y++) for (let x = 220; x < 225; x++) pb.set(x, y, y < 9 ? BRICK[3] : y % 3 === 0 ? BRICK[3] : x === 220 ? BRICK[0] : x === 224 ? BRICK[2] : BRICK[1]);
  pb.rect(219, 9, 7, 1, BRICK[3]); SMOKE_B.push([222, 4, 1.4]);
  for (let y = Q - 14; y < Q; y++) for (let x = 228; x < 256; x++) pb.set(x, y, (Q - y) % 2 === 0 || (x + ((Q - y) >> 1) * 2) % 4 === 0 ? BRICK[3] : pick(BRICK, -.1 + (hash(x >> 2, y >> 1, 5) - .5) * .6));
  for (let k = 0; k < 5; k++) for (let x = 226; x <= 258; x++) pb.set(x, Q - 15 - k + Math.round((x - 226) / 16 * (k > 0 ? 0 : 0)), k === 0 ? SLATE[3] : SLATE[1 + (k % 2)]);
  pb.rect(236, Q - 9, 6, 9, '#24180f'); pb.rect(246, Q - 10, 5, 4, WARM); WIN_B.push([248, Q - 8]);
  pb.rect(250, Q - 26, 3, 7, BRICK[2]); pb.set(250, Q - 26, BRICK[0]); SMOKE_B.push([251, Q - 28, .8]);
  // Kisten und Fässer auf dem Kai
  const crate = (x, y, s) => { pb.rect(x, y, s, s, WOOD[1]); pb.rect(x, y, s, 1, WOOD[0]); line(pb, x, y + s - 1, x + s - 1, y, WOOD[3]); pb.rect(x, y + s - 1, s, 1, WOOD[3]); };
  crate(198, Q - 5, 5); crate(203, Q - 4, 4); crate(259, Q - 6, 6); crate(265, Q - 6, 6); crate(262, Q - 11, 5);
  for (const bx of [272, 276]) { pb.rect(bx, Q - 5, 3, 5, WOOD[1]); pb.set(bx, Q - 5, WOOD[0]); pb.rect(bx, Q - 3, 3, 1, IRON[2]); }
  // Kran rechts: Tretrad am Fuß, Mast, Ausleger über dem Wasser (Seil und Last zeichnet die Szene)
  pb.rect(279, Q - 32, 2, 32, WOOD[2]); pb.rect(279, Q - 32, 1, 32, WOOD[0]);
  line(pb, 280, Q - 30, 306, Q - 40, WOOD[2]); line(pb, 280, Q - 29, 306, Q - 39, WOOD[1]);
  line(pb, 280, Q - 18, 294, Q - 35, WOOD[3]);
  for (let a = 0; a < 40; a++) { const an = a / 40 * Math.PI * 2; pb.set(Math.round(273 + Math.cos(an) * 6), Math.round(Q - 7 + Math.sin(an) * 6), WOOD[2]); }
  for (let a = 0; a < 4; a++) { const an = a / 4 * Math.PI; line(pb, 273 - Math.cos(an) * 6, Q - 7 - Math.sin(an) * 6, 273 + Math.cos(an) * 6, Q - 7 + Math.sin(an) * 6, WOOD[3]); }
  CRANE_TIP = [306, Q - 39];
  // Gitterkran links am Kai mit Ausleger über die Kisten
  for (let y = Q - 34; y < Q; y++) { pb.set(117, y, IRON[1]); pb.set(121, y, IRON[2]); if ((y - Q) % 4 === 0) line(pb, 117, y, 121, y + 4 > Q ? y : y + 4, IRON[2]); }
  line(pb, 117, Q - 34, 152, Q - 34, IRON[1]); line(pb, 121, Q - 30, 152, Q - 34, IRON[2]);
  for (let x = 124; x < 152; x += 4) line(pb, x, Q - 34, x + 2, Q - 31 - Math.round((x - 121) / 31 * -1), IRON[2]);
  line(pb, 148, Q - 33, 148, Q - 22, '#3a2e24'); pb.rect(147, Q - 22, 3, 2, IRON[3]);
  // Steg ins Wasser rechts
  for (let x = 288; x < 326; x++) { pb.set(x, Q + 4, x % 4 === 0 ? WOOD[3] : WOOD[0]); pb.set(x, Q + 5, WOOD[2]); }
  for (let x = 290; x < 326; x += 7) pb.rect(x, Q + 6, 2, WL - Q - 6, WOOD[3]);
  pb.outline(EDGE);
  return pb.canvas();
}

/* ---------- Werkstatt-Fassade: Ziegelwand, Schieferkante, offenes Tor (durchsichtig), Fenster, Zahnrad, Kisten ---------- */
function buildFacade() {
  const pb = new PB(GW, GH);
  const ROOF = 26;
  // Dachkante aus Schiefer und Schornstein dahinter
  for (let y = 0; y < 16; y++) for (let x = 296; x < 310; x++) pb.set(x, y, y % 3 === 0 ? BRICK[3] : x === 296 ? BRICK[0] : x > 307 ? BRICK[2] : BRICK[1]);
  pb.rect(294, 0, 18, 2, BRICK[3]);
  for (let y = 14; y < ROOF; y++) for (let x = 0; x < GW; x++) {
    const row = Math.floor((y - 14) / 3), off = row % 2 ? 5 : 0;
    let c = (y - 14) % 3 === 2 || (x + off) % 10 === 0 ? SLATE[3] : pick(SLATE, .35 - (y - 14) / 12 + (hash(Math.floor((x + off) / 10), row, 3) - .5) * .7 + (bay(x, y) - .5) * .3);
    pb.set(x, y, c);
  }
  for (let x = 0; x < GW; x++) { pb.set(x, ROOF, '#2a2220'); pb.set(x, ROOF + 1, '#3e2c25'); }
  // Ziegelwand mit Mörtel, Ruß über dem Tor (Fahne nach oben)
  for (let y = ROOF + 2; y < FLOOR; y++) for (let x = 0; x < GW; x++) {
    const row = Math.floor((y - ROOF - 2) / 4), off = row % 2 ? 5 : 0, bx = Math.floor((x + off) / 10);
    if ((y - ROOF - 2) % 4 === 3 || (x + off) % 10 === 9) { pb.set(x, y, hash(x, y, 2) < .3 ? '#8a7f72' : MORTAR); continue; }
    let l = .2 + (hash(bx, row, 7) - .5) * .9 + (bay(x, y) - .5) * .35 - (y - ROOF) / 300;
    const sx = (x + .5 - (GATE.x + GATE.w / 2)) / (26 + (GATE.y - y) * .5), sy = GATE.y - y;
    if (sy > -2 && sy < 30 && Math.abs(sx) < 1) l -= (1 - Math.abs(sx)) * (1 - sy / 30) * 1.6 + (fbm(x / 6, y / 5, 9, 2) - .5);
    if (y > FLOOR - 6) l -= .25;
    pb.set(x, y, pick(BRICK, l));
  }
  // Pflaster: runde Steine, nach vorn größer
  for (let y = FLOOR; y < GH; y++) for (let x = 0; x < GW; x++) {
    const sz = 4 + (y - FLOOR) / 8, row = Math.floor((y - FLOOR) / (sz * .7)), off = (row % 2) * sz / 2;
    const cx = (Math.floor((x + off) / sz) + .5) * sz - off, cy = FLOOR + (row + .5) * sz * .7;
    const d = Math.hypot((x + .5 - cx) / (sz * .5), (y + .5 - cy) / (sz * .35));
    let l = d > .9 ? -.8 : .45 - d * .6 + (hash(Math.floor((x + off) / sz), row, 5) - .5) * .5 + (bay(x, y) - .5) * .3;
    pb.set(x, y, pick(STONE, l - (y < FLOOR + 3 ? .4 : 0)));
  }
  // Toröffnung: Pfosten, Sturz, geöffneter Torflügel links (zum Betrachter gedreht)
  for (let y = GATE.y; y < FLOOR; y++) for (let x = GATE.x; x < GATE.x + GATE.w; x++) pb.p[y * GW + x] = null;
  for (const px of [GATE.x - 5, GATE.x + GATE.w]) for (let y = GATE.y - 4; y < FLOOR; y++) for (let i = 0; i < 5; i++) pb.set(px + i, y, i === 0 ? WOOD[0] : i === 4 ? WOOD[3] : (y % 9 === 0 ? WOOD[3] : WOOD[1 + (hash(px + i, y >> 2, 3) < .3 ? 1 : 0)]));
  for (let y = GATE.y - 8; y < GATE.y; y++) for (let x = GATE.x - 8; x < GATE.x + GATE.w + 8; x++) pb.set(x, y, y === GATE.y - 8 ? WOOD[0] : y === GATE.y - 1 ? WOOD[3] : (x % 13 === 0 ? WOOD[3] : WOOD[1]));
  [[GATE.x - 5, GATE.y + 8], [GATE.x - 5, FLOOR - 12]].forEach(([x, y]) => { pb.rect(x - 1, y, 3, 3, IRON[3]); pb.set(x, y, IRON[0]); });
  const LX0 = GATE.x - 26, LX1 = GATE.x - 6;
  for (let x = LX0; x <= LX1; x++) {
    const u = (LX1 - x) / (LX1 - LX0), y0 = Math.round(GATE.y - u * 7), y1 = Math.round(FLOOR + u * 6);
    for (let y = y0; y < y1; y++) {
      let c = (x - LX0) % 5 === 0 ? WOOD[3] : pick(WOOD, -.1 - u * .3 + (hash(Math.floor((x - LX0) / 5), y >> 3, 6) - .5) * .5 + (bay(x, y) - .5) * .3);
      const yb = (y - y0) / (y1 - y0);
      if (Math.abs(yb - .2) < .025 || Math.abs(yb - .8) < .025) c = IRON[2];
      pb.set(x, y, c);
    }
  }
  // Schild über dem Tor an zwei Ketten: Zahnrad
  for (const cx of [GATE.x + 8, GATE.x + 32]) for (let y = GATE.y - 18; y < GATE.y - 8; y++) pb.set(cx, y, y % 2 ? IRON[1] : IRON[3]);
  for (let y = GATE.y - 26; y < GATE.y - 17; y++) for (let x = GATE.x + 4; x < GATE.x + 36; x++) pb.set(x, y, y === GATE.y - 26 ? WOOD[0] : y === GATE.y - 18 ? WOOD[3] : WOOD[1 + (hash(x >> 3, y, 2) < .3 ? 1 : 0)]);
  gear(pb, GATE.x + 20, GATE.y - 22, 2.5, 7, ['#efe4c6', '#d8c9a3', '#b8a77f', '#8e7e5a']);
  // Fenster mit warmem Licht (Sprossen), Steinsims
  for (const wx of [56, 234]) {
    pb.rect(wx - 3, 60, 30, 34, STONE[2]); pb.rect(wx - 4, 92, 32, 3, STONE[1]); pb.rect(wx - 4, 92, 32, 1, STONE[0]);
    for (let y = 62; y < 92; y++) for (let x = wx - 1; x < wx + 25; x++) {
      const fr = (x - wx + 1) % 13 < 2 || (y - 62) % 15 < 2;
      pb.set(x, y, fr ? WOOD[3] : (y - 62 + (x - wx) * .3) < 12 ? WARM_L : bay(x, y) < .5 ? WARM : '#e89238');
    }
  }
  // Großes Zahnrad an der Wand, Kisten, Fass, Taurolle, Kette
  gear(pb, 214, FLOOR - 13, 11, 10, IRON);
  const crate = (x, y, s) => { for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) pb.set(x + i, y + j, i === 0 || j === 0 ? WOOD[0] : i === s - 1 || j === s - 1 ? WOOD[3] : (Math.abs(i - j) < 1.5 || Math.abs(i + j - s + 1) < 1.5) ? WOOD[2] : WOOD[1]); };
  crate(280, FLOOR - 16, 16); crate(296, FLOOR - 14, 14); crate(284, FLOOR - 30, 14);
  for (let y = FLOOR - 20; y < FLOOR + 2; y++) for (let x = 314; x < 330; x++) {
    const nx = (x + .5 - 322) / 8; if (Math.abs(nx) > 1 - Math.pow((y - FLOOR + 9) / 12, 2) * .15) continue;
    const band = y === FLOOR - 16 || y === FLOOR - 3;
    pb.set(x, y, band ? IRON[2] : pick(WOOD, -nx * .8 + (bay(x, y) - .5) * .3 + ((x - 314) % 4 === 0 ? -.4 : 0)));
  }
  for (let y = FLOOR - 4; y < FLOOR + 4; y++) for (let x = 96; x < 120; x++) {
    const r = Math.hypot((x + .5 - 108) / 12, (y + .5 - FLOOR) / 4);
    if (r <= 1 && r > .3) pb.set(x, y, Math.floor(r * 8) % 2 ? '#c8ad7a' : '#927a52');
  }
  for (let y = 64; y < 96; y++) pb.set(132 + Math.round(Math.sin(y * .4) * .5), y, y % 2 ? IRON[1] : IRON[3]);
  pb.rect(131, 62, 3, 2, IRON[3]);
  pb.outline(EDGE);
  return pb.canvas();
}

/* ---------- Innen hinter dem Tor: dunkle Werkstatt, Werkzeug an der Wand, Esse und Amboss ---------- */
const ANVIL = [31, 40];          // Schlagpunkt auf dem Amboss (in der Toröffnung)
function buildInside() {
  const w = GATE.w, h = GATE.h, pb = new PB(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const warm = clamp(1 - Math.hypot(x - 32, y - 42) / 46, 0, 1);
    const l = 2.7 - warm * 2.8 + (bay(x, y) - .5) * .6;
    pb.set(x, y, ['#8a4a26', '#5a3020', '#3a2219', '#271813', '#1a110d'][clamp(Math.round(l), 0, 4)]);
  }
  for (let x = 0; x < w; x++) for (let y = 54; y < h; y++) pb.set(x, y, y === 54 ? '#4a2c1e' : (x + y) % 5 === 0 ? '#22150f' : '#2e1c14');
  // Werkzeug an der Rückwand (Zangen, Hämmer)
  for (const tx of [4, 8, 12, 17]) { pb.rect(tx, 12, 1, 10, '#140c09'); pb.rect(tx - 1, tx % 2 ? 21 : 11, 3, 2, '#140c09'); }
  pb.rect(2, 11, 18, 1, '#3a2219');
  // Esse: Ziegel mit glühender Öffnung
  for (let y = 26; y < 54; y++) for (let x = 27; x < 40; x++) pb.set(x, y, (y % 3 === 0 || (x + (y / 3 | 0) * 2) % 5 === 0) ? '#2a1610' : '#5c2e1e');
  for (let y = 36; y < 44; y++) for (let x = 30; x < 38; x++) pb.set(x, y, y < 38 ? '#ff8a2a' : bay(x, y) < .5 ? '#ffd060' : '#ff6a1e');
  // Amboss auf dem Klotz
  pb.rect(26, 41, 11, 3, '#2a2b2e'); pb.rect(24, 41, 3, 2, '#2a2b2e'); pb.rect(28, 44, 7, 3, '#1f2023'); pb.rect(29, 47, 5, 8, '#3a2618');
  pb.rect(26, 41, 11, 1, '#77706a');
  return pb.canvas();
}

// Kompakte Faust 4×4 (ohne Finger), Licht von links oben; side 1 = rechte Hand (etwas dunkler)
function fist(pb, hx, hy, side) {
  const x0 = Math.round(hx) - 2, y0 = Math.round(hy) - 2, d = side ? 1 : 0;
  ['.01.', '0112', '1122', '.22.'].forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') pb.set(x0 + x, y0 + y, SKIN[Math.min(3, +c + d)]); }));
}
// Lappen (w×h) mit Falten und ausgefranstem Saum unten
function rag(pb, x0, y0, w, h, seed) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if ((y === 0 && (x === 0 || x === w - 1)) || (y === h - 1 && (x + seed) % 2)) continue;
    const fold = y > 1 && y < h - 1 && x === Math.round(w * .45) + ((y + seed) % 3 ? 0 : 1);   // eine Falte längs
    pb.set(x0 + x, y0 + y, RAG[fold ? 3 : x < w * .3 || y < 2 ? 0 : x > w * .75 ? 2 : 1]);
  }
  pb.set(x0 + 1, y0 + h, RAG[2]); pb.set(x0 + 2, y0 + h + 1, RAG[3]);   // Zipfel
}

/* ---------- Brann als Figur (Einstellungen 2 und 3): kräftig, Lederschürze, aufgekrempelte Ärmel ---------- */
// Haltungen: stand, walk1/walk2 (auf uns zu), wipe1/wipe2 (Hände im Lappen), up/mid/down (Hammer)
// Hände sind kompakte Fäuste mit eigener Kontur; meist hält er etwas (Lappen, Hammer), damit sie wenig Detail brauchen
const FW = 44, FH = 64, FX = 17, FY = 6;     // Figur: Mitte x = FX, Kopf oben bei FY, Füße unten bei FH − 1
function buildBrann(pose) {
  const pb = new PB(FW, FH), X = FX, Y = FY;
  const walk = pose === 'walk1' ? 1 : pose === 'walk2' ? -1 : 0;
  // Beine und Stiefel (beim Gehen ein Knie gebeugt: der Fuß hebt sich)
  for (const [lx, side] of [[X - 5, 1], [X + 5, -1]]) {
    const lift = walk === side ? 2 : 0;
    capsule(pb, lx, Y + 33, lx + (walk === side ? side : 0), Y + 51 - lift, 3.6, 3.2, TROU, side > 0 ? .1 : -.15);
    pb.rect(lx - 3, Y + 51 - lift, 7, 5, '#2b1f17'); pb.rect(lx - 3, Y + 51 - lift, 7, 1, '#4a3628'); pb.rect(lx + (side > 0 ? -4 : 2), Y + 54 - lift, 3, 2, '#2b1f17');
  }
  // Rumpf: Hemd mit breiten Schultern
  ellipse(pb, X, Y + 23, 11, 12, SHIRT, .05);
  ellipse(pb, X, Y + 15, 13, 4.5, SHIRT, .15);
  // Lederschürze mit Latz, Riemen, Tasche mit Werkzeug, Ruß
  for (let y = Y + 17; y < Y + 48; y++) {
    const half = y < Y + 29 ? 6 + (y - Y - 17) * .12 : 8 + (y - Y - 29) * .12;
    for (let x = Math.floor(X - half); x <= X + half; x++) {
      const e = half - Math.abs(x + .5 - X);
      let l = -((x - X) / half) * .6 + (bay(x, y) - .5) * .3 + (hash(x >> 1, y >> 1, 21) - .5) * .4 + .05;
      if (e < 1) l -= .6;
      let c = pick(LEATHER, l);
      if (hash(x >> 1, y >> 1, 40) < .08) c = '#4e3e35';
      pb.set(x, y, c);
    }
  }
  line(pb, X - 6, Y + 17, X - 4, Y + 11, LEATHER[1]); line(pb, X + 6, Y + 17, X + 4, Y + 11, LEATHER[2]);
  pb.rect(X + 1, Y + 32, 5, 5, LEATHER[2]); pb.rect(X + 1, Y + 32, 5, 1, LEATHER[0]); pb.rect(X + 3, Y + 28, 1, 4, WOOD[1]); pb.rect(X + 2, Y + 27, 3, 2, IRON[2]);
  // Arme: Schulter → Ellbogen → Hand; Oberarm im Hemd, Krempe hell am Ellbogen, Unterarm nackt
  const A = {
    stand: [[X - 13, Y + 25, X - 12, Y + 33], [X + 13, Y + 25, X + 12, Y + 33]],
    walk1: [[X - 13, Y + 25, X - 11, Y + 32], [X + 13, Y + 24, X + 13, Y + 34]],
    walk2: [[X - 13, Y + 24, X - 13, Y + 34], [X + 13, Y + 25, X + 11, Y + 32]],
    wipe1: [[X - 12, Y + 25, X - 5, Y + 31], [X + 12, Y + 26, X + 3, Y + 33]],
    wipe2: [[X - 12, Y + 26, X - 3, Y + 33], [X + 12, Y + 25, X + 5, Y + 31]],
    up:    [[X - 12, Y + 25, X + 2, Y + 30], [X + 17, Y + 10, X + 13, Y + 1]],
    mid:   [[X - 12, Y + 25, X + 2, Y + 30], [X + 18, Y + 16, X + 19, Y + 7]],
    down:  [[X - 12, Y + 25, X + 2, Y + 30], [X + 16, Y + 24, X + 20, Y + 30]]
  }[pose];
  const hammer = (hx, hy, ang) => {          // Stiel von der Hand weg, Kopf am Ende
    const dx = Math.cos(ang), dy = Math.sin(ang);
    for (let i = 0; i < 9; i++) pb.set(hx + dx * i, hy + dy * i, WOOD[i < 3 ? 2 : 1]);
    const kx = hx + dx * 9, ky = hy + dy * 9;
    for (let j = -3; j <= 3; j++) for (let k = -1; k <= 1; k++) pb.set(kx - dy * j + dx * k, ky + dx * j + dy * k, j < -1 ? IRON[0] : IRON[2]);
  };
  // Arme, Hände und Lappen auf eigener Ebene mit eigener Kontur (sonst verschwimmen sie mit Schürze und Hemd)
  const ap = new PB(FW, FH), arms = [[X - 11, Y + 15], [X + 11, Y + 15]];
  A.forEach(([ex, ey, hx, hy], i) => {
    const [sx, sy] = arms[i], bias = i ? -.15 : .1;
    capsule(ap, sx, sy, ex, ey - 2, 3.4, 3, SHIRT, bias + .1);
    capsule(ap, ex, ey, hx, hy, 2.6, 2.2, SKIN, bias);
    const ux = (ex - sx), uy = (ey - sy), ul = Math.hypot(ux, uy), cx = ex - ux / ul * 2.5, cy = ey - uy / ul * 2.5;
    for (let k = -3; k <= 3; k++) ap.set(cx - uy / ul * k, cy + ux / ul * k, k < 0 ? SHIRT[0] : SHIRT[1]);     // Krempe
    fist(ap, hx, hy, i);
  });
  if (pose === 'wipe1' || pose === 'wipe2') {          // Hände reiben im Lappen
    const [l, r] = [A[0][2], A[1][2]].sort((a, b) => a - b), cy = (A[0][3] + A[1][3]) / 2, sh = pose === 'wipe1' ? 0 : 1;
    rag(ap, l - 1 + sh, cy - 3, r - l + 2, 7, sh);
    A.forEach(([, , hx, hy], i) => fist(ap, hx + (hx < (l + r) / 2 ? -1 : 1), hy - 1, i));   // die Fäuste greifen den Lappen an den Enden
  } else if (!['up', 'mid', 'down'].includes(pose)) {   // Lappen hängt aus der rechten Hand
    const [, , hx, hy] = A[1], sway = pose === 'walk1' ? 1 : pose === 'walk2' ? -1 : 0;
    for (let y = 0; y < 8; y++) for (let x = -2; x <= 1; x++) {
      if (y === 7 && (x + sway) % 2) continue;                                     // ausgefranster Saum
      ap.set(hx + x + Math.round(sway * y / 7), hy + 1 + y, RAG[x < -1 ? 0 : (x + y) % 4 === 0 ? 2 : 1]);
    }
    fist(ap, hx, hy, 1);
  }
  ap.outline(EDGE);
  for (let k = 0; k < ap.p.length; k++) if (ap.p[k]) pb.p[k] = ap.p[k];
  if (pose === 'up' || pose === 'mid' || pose === 'down') {
    const [, , hx, hy] = A[1];
    hammer(hx, hy, pose === 'up' ? -2.4 : pose === 'mid' ? -1.4 : .25);
    for (let i = 0; i < 12; i++) pb.set(A[0][2] + i, A[0][3] + Math.round(i * .35), i < 6 ? IRON[2] : IRON[3]);  // Zange zum Amboss
    fist(pb, hx, hy, 1);                                                                                     // Hand um den Stiel
  }
  // Kopf: Hals, Gesicht, Bart, kurzes Haar, Schutzbrille auf der Stirn
  capsule(pb, X, Y + 9, X, Y + 13, 3.4, 3.4, SKIN, -.1);
  ellipse(pb, X, Y + 5.5, 5.6, 6.6, SKIN);
  for (let y = Y + 6; y < Y + 13; y++) for (let x = X - 5; x <= X + 5; x++) if (pb.get(x, y) && SKIN.includes(pb.get(x, y)) && (y > Y + 8 || Math.abs(x - X) > 3)) pb.set(x, y, pick(BEARD, -(x - X) / 6 - (y - Y - 9) / 6 + (bay(x, y) - .5) * .3));
  ellipse(pb, X, Y + 2.2, 6, 4.4, [HAIR_B[0], HAIR_B[0], HAIR_B[1], HAIR_B[1]], 0, (x, y) => y < Y + 3);
  pb.set(X - 2, Y + 5, '#2a1a12'); pb.set(X + 2, Y + 5, '#2a1a12'); pb.set(X - 2, Y + 4, BEARD[1]); pb.set(X - 3, Y + 4, BEARD[1]); pb.set(X + 2, Y + 3, BEARD[1]); pb.set(X + 3, Y + 3, BEARD[1]); pb.set(X, Y + 7, SKIN[2]);
  pb.rect(X - 5, Y, 11, 1, '#3a281d'); pb.rect(X - 3, Y - 1, 2, 2, '#cc9c3c'); pb.rect(X + 1, Y - 1, 2, 2, '#cc9c3c'); pb.set(X - 3, Y - 1, '#a9cfc8'); pb.set(X + 1, Y - 1, '#a9cfc8');
  pb.outline(EDGE);
  const lit = pb.canvas();
  // Schattenriss mit glühendem Rand (Licht der Esse von rechts hinten)
  const dk = new PB(FW, FH);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    if (!pb.get(x, y)) continue;
    const rim = !pb.get(x + 1, y) || !pb.get(x + 1, y - 1) || (!pb.get(x, y - 1) && x > X);
    dk.set(x, y, rim ? (pb.get(x, y) === EDGE ? '#b4561c' : '#e07a2a') : '#160e0b');
  }
  return { lit, dark: dk.canvas() };
}

/* ---------- Der Spieler von hinten über die Schulter: Hinterkopf, hochgeschlagener Kragen des grünen Mantels ---------- */
const SH_W = 90, SH_H = 80;
const inEar = (x, y) => Math.pow((x + .5 - 45) / 2.6, 2) + Math.pow((y + .5 - 20) / 4.5, 2) <= 1;
function buildShoulder() {
  const pb = new PB(SH_W, SH_H), part = new Uint8Array(SH_W * SH_H);   // 1 Mantel, 2 Kragen, 3 Haar
  const put = (x, y, c, k) => { pb.set(x, y, c); part[y * SH_W + x] = k; };
  // Schulter und Rücken (unscharf: weiche, flache Schattierung); die Schulter fällt nach rechts ab
  for (let y = 0; y < SH_H; y++) for (let x = 0; x < SH_W; x++) {
    const sh = 40 + Math.pow(Math.max(0, x - 40) / 50, 1.5) * 26;
    if (y < sh) continue;
    let l = .05 - (x - 30) / 110 + (bay(x, y) - .5) * .25 - (y - sh) / 50;
    if (Math.abs(x - 62 - (y - 50) * .35) < .8 && y > 54) l -= .6;           // Schulternaht
    put(x, y, pick(COAT, l), 1);
  }
  // Hochgeschlagener Kragen: Band um den Hals, oben ein heller Umschlag, innen eine Falte
  for (let y = 26; y < 54; y++) for (let x = 4; x < 56; x++) {
    const nx = (x + .5 - 30) / 25, top = 31 + nx * nx * 7 - (x > 30 ? (x - 30) * .05 : 0);
    if (Math.abs(nx) > 1 || y < top || y > 46 + nx * nx * 6) continue;
    let l = .15 - nx * .55 + (bay(x, y) - .5) * .25 - (y - top) / 22;
    if (y < top + 2) l += .45;
    if (Math.abs(x - 30 - nx * 4) < .8 && y > top + 4) l -= .6;
    put(x, y, pick(COAT, l), 2);
  }
  // Hinterkopf: dunkles Haar mit Strähnen, oben etwas Himmelslicht
  for (let y = 0; y < 38; y++) for (let x = 12; x < 48; x++) {
    const nx = (x + .5 - 30) / 15.5, ny = (y + .5 - 17) / 19;
    if (nx * nx + ny * ny > 1 || (y > 30 && part[y * SH_W + x] === 2)) continue;
    if (y > 33 && Math.abs(nx) > .55) continue;
    let l = .25 - nx * .7 - ny * .5 + (bay(x, y) - .5) * .3;
    if ((x * 3 + Math.floor(y * .6)) % 7 === 0) l -= .6;
    if (hash(x, y >> 2, 3) < .08) l += .5;
    put(x, y, HAIR_P[clamp(Math.round(1 - l * 1.5), 0, 2)], 3);
  }
  // Ohr rechts und ein Streifen Nacken über dem Kragen
  for (let y = 15; y < 25; y++) for (let x = 43; x < 48; x++) if (inEar(x, y)) put(x, y, pick(['#d8a080', '#b98062', '#94604a', '#6a4232'], .3 - (x - 43) * .25 + (bay(x, y) - .5) * .3), 3);
  for (let x = 20; x < 40; x++) for (let y = 31; y < 35; y++) if (part[y * SH_W + x] === 3 && y > 32 + Math.abs(x - 30) * .15) put(x, y, (x + y) % 3 ? '#94604a' : '#6a4232', 3);
  for (let y = 1; y < SH_H; y++) for (let x = 0; x < SH_W; x++) if (part[y * SH_W + x] === 1 && part[(y - 1) * SH_W + x] === 2) pb.set(x, y, COAT[3]);
  // Warmer Saum rechts (Licht aus der Werkstatt)
  const q = pb.p.slice();
  for (let y = 0; y < SH_H; y++) for (let x = 0; x < SH_W; x++) {
    const k = part[y * SH_W + x];
    if (!k || x < 34) continue;
    const edge = !q[y * SH_W + x + 1] || (y > 0 && !q[(y - 1) * SH_W + x] && x > 40);
    if (edge) pb.set(x, y, k === 3 ? '#7a5236' : '#8f8a52');
  }
  pb.outline('#0f1410');
  return pb.canvas();
}

/* =========================================================
   ZEICHNEN
   ========================================================= */
// Rauch (dunkler Werkstattrauch, der Wind treibt ihn nach rechts)
function smoke(ctx, x, y, t, k, seed, s = 1) {
  const N = 10;
  for (let i = 0; i < N; i++) {
    const p = (t * .14 + i / N + seed * .37) % 1;
    const a = (1 - p) * .85 * clamp(t * .4 + p * 3 - .2, 0, 1);
    if (a <= .02) continue;
    ctx.globalAlpha = a;
    disc(ctx, x + (Math.sin(p * 5 + i + seed) * 1.6 + p * 26 * k) * s, y - p * 44 * s * Math.min(1, k + .3), (1.4 + p * 5 * k) * s, p < .25 ? '#4a4442' : p < .6 ? '#6a6461' : '#8a8580');
  }
  ctx.globalAlpha = 1;
}
// Funken eines Hammerschlags; deterministisch aus der Zeit (seek zeigt dasselbe Bild)
const STRIKE = .95;   // Sekunden je Schlag
function sparks(ctx, t, ox, oy, floorY, scale, stop) {
  const k0 = Math.max(0, Math.floor((t - 1.6) / STRIKE));
  for (let k = k0; k <= Math.floor(t / STRIKE); k++) {
    const st = k * STRIKE;
    if (st > stop) break;
    const age = t - st;
    if (age < 0 || age > 1.6) continue;
    for (let i = 0; i < 24; i++) {
      const life = .5 + hash(k, i, 1) * 1.1;
      if (age > life) continue;
      const an = -Math.PI * (.05 + hash(k, i, 2) * .9), sp = (30 + hash(k, i, 3) * 70) * scale;
      let vx = Math.cos(an) * sp * (hash(k, i, 4) < .3 ? -1 : 1) - 12 * scale, vy = Math.sin(an) * sp;
      let x = ox + vx * age, y = oy + vy * age + 90 * scale * age * age;
      if (y > floorY) y = floorY - (y - floorY) * .3;                              // springt auf dem Boden
      const u = age / life, c = SPARK[clamp(Math.floor(u * 4), 0, 3)];
      ctx.fillStyle = c;
      const s = Math.max(1, Math.round(scale));
      if (u < .5) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,150,50,.25)'; ctx.fillRect(Math.round(x) - s, Math.round(y) - s, s * 3, s * 3); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = c; }
      ctx.fillRect(Math.round(x), Math.round(y), s, s);
      if (u < .4) { ctx.globalAlpha = .55; ctx.fillRect(Math.round(x - vx * .012), Math.round(y - vy * .012), s, s); ctx.globalAlpha = 1; }   // Schweif
    }
  }
}
const strikeFlash = (t, stop) => { if (t > stop + .4) return 0; const a = (t % STRIKE); return Math.max(0, 1 - a / .25); };

/* ---------- Einstellung 1: vom Wasser in die Bucht ---------- */
const camB = (t) => ease(t / (T_GATE - .4));
function renderBay(ctx, t, u, still) {
  const BX = Math.round(lerp(236, -32, u)), BY = HOR - WL;
  ctx.drawImage(L.skyCv, Math.round(lerp(0, -70, u)), 0);
  ctx.drawImage(L.seaCv, 0, HOR);
  // Wellenkämme (Dünung ruhig, trockener Tag)
  for (let row = 0, y = HOR + 2; y < H; row++) {
    const f = (y - HOR) / (H - HOR), gap = 2 + Math.floor(f * 5), par = .4 + f * 1.2, off = u * 260 * par + t * (2 + f * 6), spacing = 16 + f * 26;
    for (let i = 0; i < 24; i++) {
      const x = ((i * spacing + hash(row, i, 8) * spacing * .8 - off) % (W + 40) + W + 40) % (W + 40) - 20;
      if (Math.sin(t * 1.3 + i + row) < -.25) continue;
      const len = Math.round(2 + f * 7 * hash(row, i, 9));
      ctx.fillStyle = f < .25 ? '#b3b5ad' : '#98a09c'; ctx.fillRect(Math.round(x), y, len, 1);
      if (f > .35) { ctx.fillStyle = '#3a464a'; ctx.fillRect(Math.round(x) + 1, y + 1, len, 1); }
    }
    y += gap;
  }
  // Spiegelung der Bucht und der warmen Fenster
  ctx.globalAlpha = .22;
  for (let r = 0; r < 20; r++) ctx.drawImage(L.bay, 0, WL - 1 - r, BAY_W, 1, BX + Math.round(Math.sin(r * .9 + t * 2) * 1.2), HOR + r, BAY_W, 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,178,74,.5)';
  for (let k = 0; k < 4; k++) ctx.fillRect(BX + 184 - 4 + Math.round(Math.sin(t * 3 + k) * 1.5), HOR + 2 + k * 3, 8 - k * 2, 1);
  // Rauch hinter der Bucht, dann die Bucht
  for (const [sx, sy, k] of SMOKE_B) smoke(ctx, BX + sx, BY + sy, t, k, sx);
  ctx.drawImage(L.bay, BX, BY);
  // Seil und Last am Kran, pendelt leicht
  const [tx, ty] = CRANE_TIP, sw = Math.sin(t * .9) * 1.4;
  ctx.fillStyle = '#3a2e24';
  for (let y = 0; y < 16; y++) ctx.fillRect(BX + tx + Math.round(sw * y / 16), BY + ty + y, 1, 1);
  ctx.fillStyle = EDGE; ctx.fillRect(BX + tx + Math.round(sw) - 3, BY + ty + 16, 7, 6);
  ctx.fillStyle = WOOD[1]; ctx.fillRect(BX + tx + Math.round(sw) - 2, BY + ty + 17, 5, 4);
  ctx.fillStyle = WOOD[0]; ctx.fillRect(BX + tx + Math.round(sw) - 2, BY + ty + 17, 5, 1);
  // Glühen im Tor und in den Fenstern, dazu einzelne Funken (das Hämmern ist von hier nur zu ahnen)
  const fl = .5 + Math.sin(t * 9) * .08 + strikeFlash(t, 99) * .25;
  glow(ctx, BX + 185, BY + 60, 16, fl, FORGE);
  for (const [wx, wy] of WIN_B) glow(ctx, BX + wx, BY + wy, 5, .35, LAMP);
  if (!still) for (let i = 0; i < 5; i++) {
    const a = (t * 1.3 + i * .21) % 1;
    if (a > .6) continue;
    ctx.fillStyle = SPARK[Math.floor(a * 6) % 4];
    ctx.fillRect(BX + 182 + Math.round(hash(i, Math.floor(t * 1.3 + i * .21), 3) * 10 + a * 6), BY + 57 - Math.round(a * 8 - a * a * 10), 1, 1);
  }
  // Gischt an der Kaimauer und den Felsen
  ctx.fillStyle = '#d4d6cf';
  for (let x = 0; x < BAY_W; x++) if (hash(x, Math.floor(t * 2.5), 4) < .35) ctx.fillRect(BX + x, HOR, 1, 1);
}

/* ---------- Einstellungen 2 und 3: Fassade mit Tor, Innen, Brann ---------- */
// s = Pixelgröße, (ox, oy) = linke obere Ecke des Ausschnitts in der Fassade
function renderFacade(ctx, t, s, ox, oy, o) {
  const P = (x, y) => [Math.round((x - ox) * s), Math.round((y - oy) * s)];
  ctx.fillStyle = SKY[3]; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(L.skyCv, 0, 50, SKY_W, 30, 0, 0, SKY_W * s, 30 * s);
  // Innen: dunkle Werkstatt, Esse glimmt, beim Schlag hell
  const [ix, iy] = P(GATE.x, GATE.y);
  ctx.drawImage(L.inside, 0, 0, GATE.w, GATE.h, ix, iy, GATE.w * s, GATE.h * s);
  const flash = o.flash || 0, fl = .55 + Math.sin(t * 9) * .07 + Math.sin(t * 15) * .04;
  const [ex, ey] = P(GATE.x + 34, GATE.y + 40);
  glow(ctx, ex, ey, 26 * s, fl + flash * .35, FORGE);
  // Brann im Tor (innen: Schattenriss mit glühendem Rand), dann die Wand davor
  const B = o.brann;
  if (B && B.inside) drawFig(ctx, B, P, s);
  ctx.drawImage(L.facade, Math.round(ox), Math.round(oy), Math.ceil(W / s) + 1, Math.ceil(H / s) + 1, 0, 0, (Math.ceil(W / s) + 1) * s, (Math.ceil(H / s) + 1) * s);
  // Licht aus Tor und Fenstern auf Wand und Pflaster
  const [gx, gy] = P(GATE.x + GATE.w / 2, FLOOR);
  glow(ctx, gx, gy, 46 * s, .26 + flash * .2 + Math.sin(t * 9) * .03, FORGE);
  for (const wx of [68, 246]) { const [wx2, wy2] = P(wx, 78); glow(ctx, wx2, wy2, 26 * s, .22, LAMP); }
  // Rauch aus dem Schornstein
  const [cx, cy] = P(303, 0);
  if (cy > -40) smoke(ctx, cx, cy, t, 1.2, 3, s);
  if (B && !B.inside) drawFig(ctx, B, P, s);
  if (o.sparks) sparks(ctx, o.sparks.t, ...P(GATE.x + ANVIL[0], GATE.y + ANVIL[1]), P(0, FLOOR + 6)[1], s, o.sparks.stop);
}
// Figur: pose, x/y (Füße, Fassaden-Koordinaten), dark (0–1 Anteil Schattenriss)
function drawFig(ctx, B, P, s) {
  const F = L.fig[B.pose], [x, y] = P(B.x - FX, B.y - FH + 1);
  if (B.dark < 1) ctx.drawImage(F.lit, 0, 0, FW, FH, x, y, FW * s, FH * s);
  if (B.dark > 0) { ctx.globalAlpha = B.dark; ctx.drawImage(F.dark, 0, 0, FW, FH, x, y, FW * s, FH * s); ctx.globalAlpha = 1; }
}
// Haltung beim Hämmern (Schlag bei Phase 0)
const hammerPose = (t) => { const p = (t % STRIKE) / STRIKE; return p < .22 ? 'down' : p < .4 ? 'mid' : p < .86 ? 'up' : 'mid'; };
const vig = (ctx, a = .55) => { ctx.globalAlpha = a; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1; };

// Einstellung 2: Fassade einfach, Kamera driftet langsam nach rechts, Brann hämmert im Tor
const HAMMER_END = 4.75;             // danach lässt er den Hammer sinken
const BRANN_IN = [GATE.x + 13, FLOOR - 4];
function renderGate(ctx, t, lt) {
  const u = ease(lt / (T_OUT - T_GATE)), ox = lerp(4, 30, u);
  const hammering = lt < HAMMER_END;
  renderFacade(ctx, t, 1, ox, -6, {
    brann: { pose: hammering ? hammerPose(lt) : 'stand', x: BRANN_IN[0], y: BRANN_IN[1], dark: 1, inside: true },
    flash: hammering ? strikeFlash(lt, HAMMER_END) : 0,
    sparks: { t: lt, stop: HAMMER_END - .2 }
  });
}
// Einstellung 3: über die Schulter, doppelte Pixelgröße; Brann tritt heraus und wischt die Hände ab
const WALK0 = .9, WALK1 = 3.1, WIPE0 = 3.6, WIPE1 = 5.9;
function brannOut(lt) {
  const w = clamp((lt - WALK0) / (WALK1 - WALK0), 0, 1);
  const x = lerp(BRANN_IN[0], GATE.x + 20, w), y = lerp(BRANN_IN[1], FLOOR + 6, w);
  let pose = 'stand';
  if (lt > WALK0 && lt < WALK1) pose = Math.floor((lt - WALK0) / .32) % 2 ? 'walk2' : 'walk1';
  else if (lt > WIPE0 && lt < WIPE1) pose = Math.floor((lt - WIPE0) / .36) % 2 ? 'wipe2' : 'wipe1';
  return { pose, x, y, dark: clamp(1 - (w - .15) / .6, 0, 1), inside: w < .35 };
}
function renderOver(ctx, t, lt, still) {
  const u = still ? 1 : ease(lt / (T_CLOSE - T_OUT)), ox = lerp(84, 92, u), oy = 49;
  renderFacade(ctx, t, 2, ox, oy, { brann: still ? { pose: 'stand', x: GATE.x + 20, y: FLOOR + 6, dark: 0 } : brannOut(lt) });
  if (still) return;
  // Vorn links: Schulter und Hinterkopf des Spielers im grünen Mantel (näher, also mehr Parallaxe)
  ctx.drawImage(L.shoulder, 0, 0, SH_W, SH_H, Math.round(-34 - u * 22), 48, SH_W * 2, SH_H * 2);
}

/* ---------- Einstellung 4: Großaufnahme, er mustert dich zu lange ---------- */
function renderClose(ctx, t, lt) {
  ctx.drawImage(L.closeBG, 0, 0);
  const fl = Math.sin(t * 9) * .03;
  glow(ctx, 290, 120, 90, .3 + fl, FORGE); glow(ctx, 30, 40, 60, .1, LAMP);
  // Augen: ansehen, blinzeln, zusammenkneifen (mustern), Blick auf die Hände, wieder mustern, blinzeln, ansehen
  const eyes = lt < 1.4 ? 0 : lt < 1.53 ? 2 : lt < 2.6 ? 0 : lt < 3.5 ? 1 : lt < 4.4 ? 3 : lt < 5.6 ? 1 : lt < 5.73 ? 2 : 0;
  ctx.drawImage(L.brann(eyes, 0), 0, 0, 64, 80, 96, 8 - Math.round(ease(lt / 6) * 3), 128, 160);
  // Glut treibt durchs Bild
  for (let i = 0; i < 7; i++) {
    const p = (t * .12 + hash(i, 1, 7)) % 1, x = 330 - p * 360 + Math.sin(p * 9 + i) * 8, y = 150 - p * 120 - hash(i, 2, 7) * 30;
    ctx.fillStyle = SPARK[i % 3 + 1]; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
  }
}

export default {
  id: 'cs_npc_brann',
  title: 'Funken in der Werkstatt',
  len: T_END,
  dialog: 'brann_1',
  setup,
  shots: [
    // Einstellung 1: über das Wasser in die Bucht (eine Kamerafahrt nach rechts)
    { from: 0, to: T_GATE, draw(ctx, lt, t) {
      renderBay(ctx, t, camB(t));
      vig(ctx, .5);
      black(ctx, 1 - t / 1.6);
    } },
    // Einstellung 2: harter Schnitt vor das offene Tor – Hämmern, Funken fliegen heraus
    { from: T_GATE, to: T_OUT, draw(ctx, lt, t) { renderGate(ctx, t, lt); vig(ctx); } },
    // Einstellung 3: über die Schulter – Brann tritt heraus und wischt die Hände an einem Lappen ab
    { from: T_OUT, to: T_CLOSE, draw(ctx, lt, t) { renderOver(ctx, t, lt); vig(ctx); } },
    // Einstellung 4: Großaufnahme, er mustert dich zu lange; Abblende
    { from: T_CLOSE, to: T_END, draw(ctx, lt, t) {
      renderClose(ctx, t, lt);
      vig(ctx, .6);
      black(ctx, (t - T_FADE) / 1.2);
    } }
  ],
  // Hintergrund des Dialogs: Brann vor dem Tor, ohne Kamerafahrt; el = Sekunden seit Dialogbeginn, now = Uhr (s)
  dialogBg(ctx, el, now) {
    renderFacade(ctx, now, 1, 30, -6, { brann: { pose: 'stand', x: GATE.x + 20, y: FLOOR + 9, dark: 0 } });
    vig(ctx);
  }
};
