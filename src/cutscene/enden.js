/* =========================================================
   BAUSTEINE DER ENDEN (cs_ende_a „Das Feuer antwortet“, cs_ende_b „Die Lichter gehen aus“), seit 0.23.0
   Gemeinsam für beide Szenen:
     Panorama   nächtliches Meer, am Horizont die Inseln (Pfahldorf, ein Inselchen, Werkstattbucht, Goldberg) mit Lichtern
     Dörfer     Pfahldorf (Klippe, Pfahlhäuser, Steg, Pfad nach oben) und Werkstattbucht (Hallen, Schornsteine, Kran, Hügelpfad),
                jeweils nachts oder als Ruine am Morgen
     Lichtstrahl Keil aus dem Leuchtfeuer (additiv), Figuren als kleine Pixelvorlagen wie der Fischer in cs_npc_ole
   Alle Ebenen werden einmal gebaut (Kosten nur beim ersten Abspielen).
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, vnoise, fbm, PB, layer, tpl, canvas, mix, glow } from './kit.js';
import { NSKY, NSEA, FOAM, ROCK, step } from '../cutscenes/cs_wahrheit.js';

/* ---------- Paletten ---------- */
// Morgen danach: grau, still, ein wenig Gold am Horizont
export const DSKY = ['#e8d6b4', '#cfc2a8', '#b4ac9c', '#9a9690', '#828286', '#6c707a', '#585e6a'];
export const DSEA = ['#b8b6a8', '#9a9c94', '#7e8580', '#646e6e', '#50595c', '#3e474c'];
const DROCK = ['#9a9890', '#7c7a74', '#605e5a', '#464442', '#302e2e'];
const NTHATCH = ['#6e6450', '#544c3e', '#3e382e', '#2a2620'];
const DTHATCH = ['#a39167', '#8a7a57', '#6f6146', '#544934'];
const NWOOD = ['#5a4a3c', '#43372e', '#302822', '#1e1916'];
const DWOOD = ['#8a7460', '#6c5a4a', '#504236', '#362c24'];
const CHAR = ['#4a4038', '#36302a', '#26221e', '#181614'];
const NBRICK = ['#6e4440', '#563432', '#3e2626', '#2a1a1c'];
const DBRICK = ['#a8705a', '#86563f', '#62402f', '#432c20'];
const NSLATE = ['#4a4e5c', '#3a3e4a', '#2c2f3a', '#1e2028'];
const NGRASS = ['#3e4a44', '#303a36', '#232c2a'];
const DGRASS = ['#8c9468', '#717b53', '#586143'];
export const WARM = '#ffd27a', WARM_D = '#d8913c';

/* =========================================================
   LICHTSTRAHL des Leuchtfeuers: Keil von (ox, oy) nach (ex, ey), Breite w0 → w1, additiv
   ========================================================= */
export function beam(ctx, ox, oy, ex, ey, w0, w1, a) {
  if (a <= 0) return;
  const dx = ex - ox, dy = ey - oy, l = Math.hypot(dx, dy) || 1, px = -dy / l, py = dx / l;
  const gr = ctx.createLinearGradient(ox, oy, ex, ey);
  gr.addColorStop(0, `rgba(255,236,170,${a})`); gr.addColorStop(.35, `rgba(255,220,140,${a * .55})`); gr.addColorStop(1, 'rgba(255,210,130,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.moveTo(ox + px * w0, oy + py * w0); ctx.lineTo(ex + px * w1, ey + py * w1); ctx.lineTo(ex - px * w1, ey - py * w1); ctx.lineTo(ox - px * w0, oy - py * w0);
  ctx.closePath(); ctx.fill();
  // heller Kern
  const g2 = ctx.createLinearGradient(ox, oy, ex, ey);
  g2.addColorStop(0, `rgba(255,250,220,${a * .8})`); g2.addColorStop(.5, `rgba(255,240,190,${a * .2})`); g2.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.moveTo(ox + px * w0 * .4, oy + py * w0 * .4); ctx.lineTo(ex + px * w1 * .3, ey + py * w1 * .3); ctx.lineTo(ex - px * w1 * .3, ey - py * w1 * .3); ctx.lineTo(ox - px * w0 * .4, oy - py * w0 * .4);
  ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}
// Drehendes Leuchtfeuer in Seitenansicht: Winkel th (0 = nach rechts, π/2 = auf uns zu). Länge ∝ |cos|, Aufblitzen, wenn es zu uns zeigt
export function sweep(ctx, x, y, th, len, a = 1) {
  const c = Math.cos(th), s = Math.sin(th);
  beam(ctx, x, y, x + c * len, y + 10 + Math.abs(c) * 8, 2, 6 + 26 * Math.abs(s) + 10 * Math.abs(c), a * (.35 + .65 * Math.abs(c)));
  const flare = Math.pow(Math.max(0, s), 6);
  glow(ctx, x, y, 18 + flare * 90, .55 + flare * .45, '255,236,170');
  if (flare > .3) glow(ctx, x, y, 220, flare * .35, '255,226,160');
}

/* =========================================================
   FIGUREN (9×15 wie der Fischer in cs_npc_ole; Kontur dunkel). Laterne/Fackel: Punkt L/F, Lage in LIGHT
   ========================================================= */
const PAL = {
  Y: '#e3b04a', y: '#a8781f', S: '#d79a72', B: '#d4d2ca', D: '#3a2e26', L: '#3a2a18', F: '#ffd36b',
  a: '#9a6a3c', A: '#7a4e2c', h: '#5a4638', W: '#e4d9c2', T: '#6f665a',
  c: '#6a6e84', C: '#4e5268', r: '#8a5a4a', R: '#6a3e34', k: '#c8b898', K: '#a09070', g: '#5a7a5a', G: '#3e5a40'
};
// Ole: Ölzeug, Laterne gesenkt (0) bzw. gehoben (1)
const OLE = [
  ['.........', '.........', '...YYY...', '..YYYYY..', '.yyyyyyy.', '...SSS...', '...BBB...', '..YYYYY..', '..YYYYYL.', '..YYYYYF.', '..YYYYYL.', '..yYYYy..', '..yy.yy..', '..DD.DD..', '..DD.DD..'],
  ['.......L.', '.......F.', '...YYY.L.', '..YYYYYY.', '.yyyyyyY.', '...SSSY..', '...BBB...', '..YYYYY..', '..YYYYY..', '..YYYYY..', '..YYYYY..', '..yYYYy..', '..yy.yy..', '..DD.DD..', '..DD.DD..']
];
const OLE_LIGHT = [[7, 9], [7, 1]];
// Brann: kräftig, Hemd, Lederschürze, Bart; steht (0) bzw. hebt die Hand an die Stirn (1, schaut zum Licht)
const BRANN = [
  ['.........', '...hhh...', '..hSSSh..', '..SSSSS..', '...hhh...', '.WWWWWWW.', 'SWaaaaaWS', 'SWaaaaaWS', 'S.aaaaa.S', '..aaaaa..', '..aAaAa..', '..TT.TT..', '..TT.TT..', '..TT.TT..', '..DD.DD..'],
  ['.........', '...hhh.S.', '..hSSSSS.', '..SSSSSW.', '...hhhW..', '.WWWWWW..', 'SWaaaaa..', 'SWaaaaa..', 'S.aaaaa..', '..aaaaa..', '..aAaAa..', '..TT.TT..', '..TT.TT..', '..TT.TT..', '..DD.DD..']
];
// Dorfleute mit Bündel auf dem Rücken und Laterne (zwei Schritte), drei Farben
const FOLK = (m, M, b) => [
  ['.........', '...hh....', '..SSS....', '..SSSbb..', '.mmmmbbb.', '.mMmmbbb.', '.mMmmbb..', '.LmMmm...', '.FmMmm...', '.LMMMM...', '..MMMM...', '..D..D...', '..D..D...', '.DD..DD..', '.........'],
  ['.........', '...hh....', '..SSS....', '..SSSbb..', '.mmmmbbb.', '.mMmmbbb.', '.mMmmbb..', '.LmMmm...', '.FmMmm...', '.LMMMM...', '..MMMM...', '...DD....', '...DD....', '..DD.D...', '.........']
].map(rows => rows.map(r => r.replace(/m/g, m).replace(/M/g, M).replace(/b/g, b)));
const FOLK_LIGHT = [1, 8];
export function buildFigures() {
  const mk = (rows) => tpl(rows, PAL, '#0e0c10');
  return {
    ole: OLE.map(mk), brann: BRANN.map(mk),
    folk: [FOLK('c', 'C', 'k'), FOLK('r', 'R', 'K'), FOLK('g', 'G', 'k')].map(set => set.map(mk))
  };
}
export const LIGHTS = { ole: OLE_LIGHT, folk: FOLK_LIGHT };
// Flackern einer Laterne (0..1)
export const flick = (t, s = 0) => .82 + Math.sin(t * 11 + s) * .1 + Math.sin(t * 17 + s * 2) * .08;

/* =========================================================
   NACHTHIMMEL, MEER, REGEN für die Dorf-Einstellungen
   ========================================================= */
export function buildNight(hor) {
  return {
    sky: layer(W + 140, hor, (x, y) => step(NSKY, 2.4 + (fbm(x / 34, y / 11, 41, 4) - .5) * 3.4 + y / hor * 1.8, x, y)),
    sea: layer(W, H - hor, (x, y) => step(NSEA, 1.6 + y / (H - hor) * 2.8 - (vnoise(x / 9, y / 1.3, 9) > .66 ? 1.1 : 0), x, y))
  };
}
export function buildDawn(hor) {
  return {
    sky: layer(W + 140, hor, (x, y) => step(DSKY, (1 - y / hor) * 4.2 + (fbm(x / 40, y / 9, 51, 4) - .5) * 2.2, x, y)),
    sea: layer(W, H - hor, (x, y) => step(DSEA, .6 + y / (H - hor) * 3.6 - (vnoise(x / 11, y / 1.2, 19) > .7 ? 1 : 0), x, y))
  };
}
export function waves(ctx, t, top, n, col, speed = 14, seed = 2) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const y = top + 3 + hash(i, 1, seed) * (H - top - 4), x = ((hash(i, 2, seed) * 400 + t * (speed + (y - top) * .12)) % 380) - 30;
    ctx.fillRect(Math.round(x), Math.round(y), 2 + (i % 4) + Math.floor((y - top) / 25), 1);
  }
}

/* =========================================================
   PANORAMA: der Horizont mit den Inseln (Einstellung A3 und B2)
   ========================================================= */
export const P_HOR = 108;
// x Mitte, w halbe Breite, h Höhe, d Ferne (0 nah … 1 fern), lights Anzahl, key
export const ISLES = [
  { key: 'ole', x: 64, w: 48, h: 30, d: .1, lights: 16 },
  { key: 'klein', x: 132, w: 16, h: 9, d: .7, lights: 3 },
  { key: 'brann', x: 192, w: 40, h: 22, d: .4, lights: 14 },
  { key: 'aurel', x: 276, w: 34, h: 40, d: .55, lights: 10 }
];
const isleTop = (I, x) => {
  const u = (x - I.x) / I.w;
  if (Math.abs(u) >= 1) return null;
  let s = Math.pow(1 - u * u, I.key === 'aurel' ? .7 : 1.1);
  if (I.key === 'brann') s = Math.min(1, s * 1.25) * (u > .2 ? .7 + .3 * (1 - u) : 1);   // Bucht mit flachem Ostteil
  if (I.key === 'ole') s *= u > -.2 ? 1 : .7 + .3 * (u + 1) / .8;                       // Klippe im Osten
  return P_HOR - s * I.h - (vnoise(x / 4, I.x, 3) - .5) * 2.2 * s;
};
export function buildPanorama(mode) {
  const night = mode !== 'dawn';
  const SK = night ? NSKY : DSKY, SE = night ? NSEA : DSEA, RK = night ? ROCK : DROCK;
  const sky = layer(W + 140, P_HOR, (x, y) => step(SK, night ? 2.2 + (fbm(x / 36, y / 12, 61, 4) - .5) * 3.4 + y / P_HOR * 2 : (1 - y / P_HOR) * 4.4 + (fbm(x / 40, y / 9, 51, 4) - .5) * 2, x, y));
  const sea = layer(W, H - P_HOR, (x, y) => step(SE, 1.4 + y / (H - P_HOR) * 3 - (vnoise(x / 10, y / 1.3, 11) > .66 ? 1.1 : 0), x, y));
  const pb = new PB(W, P_HOR + 2);
  const far = night ? NSKY[3] : DSKY[4];
  for (const I of [...ISLES].sort((a, b) => b.d - a.d)) {
    for (let x = Math.floor(I.x - I.w); x <= I.x + I.w; x++) {
      const top = isleTop(I, x);
      if (top == null) continue;
      for (let y = Math.floor(top); y <= P_HOR; y++) {
        const c = step(RK, 2.6 + I.d * 1.2 + (y - top < 1.5 ? -1 : 0) + (fbm(x / 6, y / 4, I.x, 2) - .5) * 1.6, x, y);
        pb.set(x, y, I.d > .5 && bay(x, y) < (I.d - .5) * 1.4 ? far : c);
      }
    }
    // Goldberg: Palast mit Kuppel oben, Türme
    if (I.key === 'aurel') {
      const tx = I.x, ty = isleTop(I, I.x);
      for (let y = Math.floor(ty - 10); y < ty + 1; y++) for (let x = tx - 7; x <= tx + 7; x++) if (y > ty - 6 || Math.hypot(x - tx, y - ty + 6) < 5) pb.set(x, y, step(RK, 2.4, x, y));
      for (const dx of [-11, 11]) for (let y = Math.floor(ty - 9); y < ty + 3; y++) pb.set(tx + dx, y, RK[3]);
    }
    if (I.key === 'brann') for (const dx of [-14, -6, 4]) { const ty = isleTop(I, I.x + dx); for (let y = Math.floor(ty - 9); y < ty; y++) { pb.set(I.x + dx, y, RK[3]); pb.set(I.x + dx + 1, y, RK[3]); } }
  }
  pb.outline(night ? '#0a0c14' : '#3e3a38');
  return { sky, sea, land: pb.canvas() };
}
// Lichter je Insel: Fenster unten an der Küste und Lichter am Hang; climb = Weg vom Ufer zum Gipfel
export function isleLights() {
  const out = {};
  for (const I of ISLES) {
    const L = [];
    for (let i = 0; i < I.lights; i++) {
      const u = (hash(i, 3, I.x) * 1.6 - .8) * (I.key === 'aurel' ? .7 : 1), x = Math.round(I.x + u * I.w);
      const top = isleTop(I, x) ?? P_HOR;
      const y = Math.round(lerp(P_HOR - 2, top + 2, Math.pow(hash(i, 4, I.x), I.key === 'aurel' ? .6 : 1.6)));
      L.push({ x, y, d: hash(i, 5, I.x) });
    }
    const sx = Math.round(I.x - I.w * .55), top = Math.round(isleTop(I, I.x) ?? P_HOR);
    out[I.key] = { L, climb: [[sx, P_HOR - 2], [Math.round(I.x - I.w * .3), Math.round((P_HOR + top) / 2) + 2], [Math.round(I.x - 4), top + 2]] };
  }
  return out;
}
export function along(P, u) {
  u = clamp(u, 0, 1) * (P.length - 1);
  const i = Math.min(P.length - 2, Math.floor(u)), f = u - i;
  return [lerp(P[i][0], P[i + 1][0], f), lerp(P[i][1], P[i + 1][1], f)];
}
// ein Licht am Horizont (1–2 Pixel, mit kleinem Schein)
export function dot(ctx, x, y, a, big, col = WARM) {
  if (a <= 0) return;
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  if (big) { ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1); }
  ctx.globalAlpha = 1;
  glow(ctx, x + .5, y + .5, big ? 6 : 4, .35 * a, '255,200,110');
}

/* =========================================================
   PFAHLDORF (Oles Insel), Seitenansicht: Steg links, Pfahlhäuser am Ufer, Klippe rechts mit Zickzack-Pfad
   mode 'night' | 'ruin' (Morgen nach dem Sturm: Häuser zerstört, nur Pfähle vom Steg)
   ========================================================= */
export const V_HOR = 118, V_WL = 132;            // Horizont, Wasserlinie (Steg, Pfähle)
export function buildPfahldorf(mode) {
  const ruin = mode === 'ruin', RK = ruin ? DROCK : ROCK, TH = ruin ? DTHATCH : NTHATCH, WD = ruin ? DWOOD : NWOOD, GR = ruin ? DGRASS : NGRASS;
  const pb = new PB(W, H), win = [], path = [];
  // Klippe rechts: Fuß an der Wasserlinie, Plateau oben bei ~44
  const cliff = (x) => x < 170 ? null : x < 214 ? V_WL - (x - 170) * 1.9 - Math.sin(x * .5) * 2 : 46 + Math.sin(x * .09) * 3 + (vnoise(x / 7, 2, 4) - .5) * 4;
  for (let x = 170; x < W; x++) {
    const top = Math.max(40, cliff(x));
    for (let y = Math.floor(top); y < H; y++) {
      let l = 1.5 + (fbm(x / 7, y / 9, 13, 3) - .5) * 2.6 + (x < 216 ? .8 : 0);
      if ((x * 3 + y * 7) % 23 === 0) l += 1;
      pb.set(x, y, y - top < 2 && x > 214 ? GR[y - top < 1 ? 0 : 1] : step(RK, l, x, y));
    }
  }
  // Zickzack-Pfad an der Klippe (Stufen, hell)
  const P = [[178, V_WL - 4], [232, 112], [214, 96], [262, 80], [240, 64], [276, 48]];
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let k = 0; k <= n; k++) { const x = Math.round(lerp(x0, x1, k / n)), y = Math.round(lerp(y0, y1, k / n)); if (pb.get(x, y + 1)) { pb.set(x, y + 1, RK[0]); pb.set(x, y + 2, RK[2]); } }
  }
  for (const p of P) path.push([p[0], p[1]]);
  // Pfahlhäuser am Ufer (auf Pfählen über dem Wasser) und zwei Hütten auf dem Plateau
  const house = (x0, y0, w, h, pile) => {
    if (pile) for (const px of [x0 + 1, x0 + w - 2]) for (let y = y0 + h; y < V_WL + 14; y++) { pb.set(px, y, WD[2]); pb.set(px + 1, y, WD[3]); }
    if (ruin) {
      // eingestürzt: Wandstümpfe, schiefe Balken, kein Dach
      for (let y = y0 + Math.floor(h * .45); y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        const cut = y0 + h * .45 + hash(x, 1, y0) * h * .4;
        if (y > cut) pb.set(x, y, (x % 4 === 0) ? WD[3] : step(WD, 1.4 + (x - x0) / w, x, y));
      }
      for (let k = 0; k < w + 4; k++) pb.set(x0 - 2 + k, Math.round(y0 + h * .4 + k * .5), WD[1]);
      for (let k = 0; k < 5; k++) pb.set(x0 + w + k, y0 + h - 1 - (k > 2 ? 0 : 1), WD[2]);
      return;
    }
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) pb.set(x, y, (x % 4 === 0) ? WD[3] : step(WD, 1.2 + (x - x0) / w * 1.2, x, y));
    for (let k = 0; k < 7; k++) for (let x = x0 - 2 + k; x < x0 + w + 2 - k; x++) pb.set(x, y0 - 1 - k, step(TH, 1 + k * .2 + (x % 3 === 0 ? .6 : 0), x, y0 - 1 - k));
    const wx = x0 + Math.floor(w / 2) - 1, wy = y0 + 3;
    win.push({ x: wx, y: wy, w: 3, h: 3 });
  };
  house(96, V_WL - 18, 13, 10, true); house(118, V_WL - 20, 15, 12, true); house(142, V_WL - 17, 12, 9, true);
  house(156, V_WL - 30, 11, 9, false);
  house(222, 34, 14, 10, false); house(250, 32, 16, 12, false); house(282, 36, 12, 9, false);
  // Steg: Bohlen auf Pfählen von links bis zu den Häusern (Ruine: nur Pfähle, ein paar schiefe)
  for (let x = 18; x < 98; x++) {
    if (!ruin) { pb.set(x, V_WL - 6, WD[0]); pb.set(x, V_WL - 5, WD[1]); pb.set(x, V_WL - 4, WD[2]); if (x % 6 === 0) pb.set(x, V_WL - 5, WD[3]); }
  }
  for (let px = 22; px < 98; px += 12) {
    const lean = ruin ? Math.round((hash(px, 1, 7) - .5) * 4) : 0, top = ruin ? V_WL - 8 + Math.round(hash(px, 2, 7) * 6) : V_WL - 6;
    for (let y = top; y < V_WL + 16; y++) { const x = px + Math.round(lean * (V_WL + 16 - y) / 24); pb.set(x, y, WD[2]); pb.set(x + 1, y, WD[3]); }
  }
  pb.outline(ruin ? '#2a2624' : '#0a0c14');
  return { land: pb.canvas(), win, path, jetty: [18, 98] };
}

/* =========================================================
   WERKSTATTBUCHT (Branns Insel): Hallen mit Sheddächern, Schornsteine, Kran am Kai, Hügel rechts mit Pfad
   ========================================================= */
export function buildBucht(mode) {
  const ruin = mode === 'ruin', RK = ruin ? DROCK : ROCK, BR = ruin ? DBRICK : NBRICK, SL = ruin ? DROCK : NSLATE, WD = ruin ? DWOOD : NWOOD, GR = ruin ? DGRASS : NGRASS;
  const pb = new PB(W, H), win = [], stacks = [];
  const quay = V_WL - 4;
  // Kai (Stein) von links bis zum Hügel
  for (let x = 0; x < W; x++) for (let y = quay; y < quay + 8; y++) pb.set(x, y, step(RK, 1.6 + (y - quay) * .25 + ((x + (y > quay + 3 ? 4 : 0)) % 9 === 0 ? 1 : 0), x, y));
  // Hügel rechts: hinauf bis ~52
  const hill = (x) => x < 214 ? null : quay - (x - 214) * 1.1 - Math.sin(x * .07) * 3;
  for (let x = 214; x < W; x++) { const top = Math.max(52, hill(x)); for (let y = Math.floor(top); y < quay; y++) pb.set(x, y, y - top < 2 ? GR[y - top < 1 ? 0 : 1] : step(RK, 1.8 + (fbm(x / 8, y / 6, 17, 3) - .5) * 2, x, y)); }
  const path = [[206, quay - 2], [236, quay - 22], [262, 86], [286, 66], [306, 56]];
  for (let i = 0; i < path.length - 1; i++) { const [x0, y0] = path[i], [x1, y1] = path[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let k = 0; k <= n; k++) { const x = Math.round(lerp(x0, x1, k / n)), y = Math.round(lerp(y0, y1, k / n)); if (pb.get(x, y + 1)) pb.set(x, y + 1, RK[0]); } }
  // Hallen: Ziegel, Sheddach (Sägezahn), große Fenster; Schornsteine
  const hall = (x0, w, h, teeth, stack) => {
    const y0 = quay - h;
    for (let y = y0; y < quay; y++) for (let x = x0; x < x0 + w; x++) {
      if (ruin && y < y0 + h * .35 + hash(x, 3, x0) * h * .35) continue;
      const mortar = y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0;
      pb.set(x, y, mortar ? BR[3] : step(BR, 1.2 + (x - x0) / w, x, y));
    }
    if (!ruin) {
      const tw = Math.floor(w / teeth);
      for (let i = 0; i < teeth; i++) for (let k = 0; k < tw; k++) { const hh = Math.round(k * 7 / tw); for (let j = 0; j <= hh; j++) pb.set(x0 + i * tw + k, y0 - j, j === hh ? SL[0] : step(SL, 1.4 + j * .1, x0 + i * tw + k, y0 - j)); pb.set(x0 + i * tw + tw - 1, y0 - 7, SL[3]); }
      for (let i = 0; i < Math.floor(w / 9); i++) win.push({ x: x0 + 3 + i * 9, y: y0 + 4, w: 5, h: 6 });
    } else {
      for (let k = 0; k < w; k += 3) pb.set(x0 + k, quay - 1 - Math.round(hash(k, 4, x0) * 3), BR[1]);
    }
    if (stack) {
      const sx = x0 + w - 8, top = ruin ? y0 + 2 - Math.round(hash(x0, 5, 1) * 6) : y0 - 30;
      if (!ruin) for (let y = top; y < y0; y++) for (let x = sx; x < sx + 5; x++) pb.set(x, y, (y % 4 === 0) ? BR[3] : step(BR, 1 + (x - sx) / 4, x, y));
      if (!ruin) { for (let x = sx - 1; x < sx + 6; x++) pb.set(x, top, BR[3]); stacks.push([sx + 2, top - 1]); }
      else for (let k = 0; k < 9; k++) pb.set(sx + 6 + k, quay - 1 - (k % 3 === 0 ? 1 : 0), BR[k % 2 ? 2 : 1]);   // Schutt
    }
  };
  hall(14, 62, 34, 4, true); hall(82, 52, 28, 3, false); hall(140, 66, 38, 4, true);
  // Kran am Kai
  if (!ruin) {
    for (let y = quay - 54; y < quay; y++) { pb.set(126, y, WD[1]); pb.set(127, y, WD[2]); }
    for (let x = 100; x < 136; x++) pb.set(x, quay - 54, WD[1]);
    for (let y = quay - 53; y < quay - 30; y++) pb.set(104, y, '#2a2a30');
  } else for (let k = 0; k < 30; k++) pb.set(100 + k, quay - 1 - Math.round(k * .25), WD[2]);
  pb.outline(ruin ? '#2a2624' : '#0a0c14');
  return { land: pb.canvas(), win, path, stacks, quay };
}
// Fensterlichter (an: 0..1 je Fenster)
export function windows(ctx, list, on, t, ox = 0) {
  list.forEach((w, i) => {
    const a = typeof on === 'function' ? on(i, w) : on;
    if (a <= 0) return;
    const f = flick(t, i);
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = WARM_D; ctx.fillRect(w.x + ox, w.y, w.w, w.h);
    ctx.fillStyle = WARM; ctx.fillRect(w.x + ox, w.y, w.w - 1, w.h - 1);
    ctx.globalAlpha = 1;
    glow(ctx, w.x + ox + w.w / 2, w.y + w.h / 2, 12, .3 * a * f);
  });
}
// Rauch (Schornsteine, Brand): Pixelschwaden, die mit dem Wind nach rechts treiben
export function smoke(ctx, x, y, t, n, cols, wind = 10, rise = 9, spread = 1) {
  for (let i = 0; i < n; i++) {
    const a = ((t * .12 + hash(i, 1, x)) % 1);
    const px = x + a * wind * 6 + (vnoise(i, t * .4, 3) - .5) * 8 * spread * a, py = y - a * rise * 6;
    const r = 1 + a * 4 * spread;
    ctx.fillStyle = cols[Math.min(cols.length - 1, Math.floor(a * cols.length))];
    for (let k = 0; k < r * r; k++) { const dx = (hash(i, k, 7) - .5) * r * 2, dy = (hash(i, k, 8) - .5) * r * 2; if (dx * dx + dy * dy < r * r && bay(Math.round(px + dx), Math.round(py + dy)) < 1 - a * .7) ctx.fillRect(Math.round(px + dx), Math.round(py + dy), 1, 1); }
  }
}

/* =========================================================
   DIE KRONE (Ende B): schwerer Goldreif mit Zacken und grünem Stein (wie der Ring); Hände in weißen Ärmeln
   ========================================================= */
export function buildCrown() {
  const G = ['#fff2b8', '#e8c35a', '#b8892c', '#6e4a18'];
  const pb = new PB(36, 22), cx = 18;
  for (let y = 10; y < 20; y++) for (let x = 3; x < 33; x++) { const nx = (x + .5 - cx) / 15; pb.set(x, y, G[clamp(Math.round(1.2 + nx * 1.4 + (y === 10 || y === 19 ? -1 : 0) + (bay(x, y) - .5) * .8), 0, 3)]); }
  for (const [px, h] of [[5, 6], [11, 8], [18, 10], [25, 8], [31, 6]]) for (let k = 0; k < h; k++) { const hw = Math.max(0, 2.5 - k * .3); for (let x = Math.floor(px - hw); x <= px + hw; x++) pb.set(x, 10 - k, G[x < px ? 0 : 2]); pb.set(px, 10 - h, G[0]); }
  pb.rect(16, 13, 4, 4, '#2f8a52'); pb.set(16, 13, '#7ad89a'); pb.set(19, 16, '#1c5a34');
  for (const x of [8, 28]) { pb.rect(x - 1, 14, 3, 3, '#8a2a3a'); pb.set(x - 1, 14, '#e07a8a'); }
  pb.outline('#2a1a0c');
  return pb.canvas();
}
