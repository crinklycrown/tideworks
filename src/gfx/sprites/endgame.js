/* ---------- Endgame: Münze, Ereignisse, Händler, Handelsposten, Weltenleuchtturm, Drohnen ---------- */
import { PB, spr, fromTpl, line, shadeEllipse, BS, bay } from '../pixelbuffer.js';

const OUT = '#22201c';
const STONE = ['#e8e2d4', '#c8bfae', '#a89d8c', '#7e7466'];

// Münze (Kopfleiste, Kosten, Markt)
export const makeCoin = () => spr(fromTpl([
  '..XXXXX..', '.XYYYYYX.', 'XYYZZZYYX', 'XYZYYYZYX', 'XYZYYYYYX', 'XYZYYYZYX', 'XYYZZZYYX', '.XYYYYYX.', '..XXXXX..'],
  { X: '#c8860e', Y: '#ffd23f', Z: '#fff2a0' }, '#6a4408'), 4, 4);
// Schraubenschlüssel (beschädigt), rot
export const makeWrench = () => spr(fromTpl([
  '.XX...XX.', '.XX...XX.', '.XXXXXXX.', '..XXXXX..', '...XXX...', '...XXX...', '...XXX...', '...XXX...', '..XXXXX..', '..XX.XX..'],
  { X: '#e8504a' }, '#5a1410'), 4, 5);
// Ereignis-Symbole (Kopfleiste, Ereignisleiste, Minimap)
export function makeEventIcons() {
  return {
    sturm: spr(fromTpl(['...CCCC....', '..CWWWWC...', '.CWWWWWWCC.', 'CWWWWWWWWWC', 'CDDDDDDDDDC', '.CCCCCCCCC.', '..Y..R..R..', '.YY.R..R...', '..Y........', '.Y...R..R..'],
      { C: '#5a6070', W: '#c8ccd4', D: '#8a8f98', Y: '#ffd23f', R: '#7ab0e8' }, '#1e2430'), 5, 5),
    vulkan: spr(fromTpl(['....A.A....', '...A.F.A...', '....FFF....', '...BFOFB...', '..BBBOBBB..', '..BBOBBBB..', '.BBBBBOBBB.', 'BBBBBBBBBBB'],
      { A: '#8a8f98', F: '#ff9a2a', O: '#ffe08a', B: '#5a4038' }, '#22140e'), 5, 4),
    schwarm: spr(fromTpl(['...........', '.FF.....FF.', 'FFFF...FFFF', '.FF.....FF.', '...........', '....FFF....', '...FFFFF.F.', '....FFF.FF.', '.........F.'],
      { F: '#8ab0c8' }, '#1e3a50'), 5, 4),
    treibgut: spr(fromTpl(['...........', '.XXX...XXX.', '.XYX...XYX.', '.XXX...XXX.', '....XXX....', '....XYX....', 'WW..XXX..WW', '.WWW...WWW.'],
      { X: '#7a4a28', Y: '#c9995e', W: '#7ab0e8' }, '#22201c'), 5, 4),
    fest: spr(fromTpl(['R.........B', 'RR.......BB', 'RRR.....BBB', 'R..YYYYY..B', 'R.YYZZZYY.B', 'R.YZYYYZY.B', 'R.YYZZZYY.B', 'R..YYYYY..B'],
      { R: '#e0384f', B: '#3f6fd8', Y: '#ffd23f', Z: '#fff2a0' }, '#3a2414'), 5, 4),
    flaute: spr(fromTpl(['.....X.....', '.....XS....', '.....XSS...', '.....XSSS..', '.....XSSS..', '.....XSS...', 'HHHHHHHHHHH', '.HHHHHHHHH.', '...........', 'WW.WW.WW.WW'],
      { X: '#5a3218', S: '#fbf6ea', H: '#a87444', W: '#7ab0e8' }, '#22201c'), 5, 5)
  };
}

// Händler-Schiff mit Wimpel (Farbe des Händlers), Fernhändler mit zwei Masten
export function makeTraderShip(col, big) {
  const W = big ? 30 : 24, pb = new PB(W, 24);
  for (let x = 1; x < W - 1; x++) {
    const t = Math.abs(x - (W - 1) / 2) / ((W - 2) / 2), bot = Math.round(21 - t * 3);
    for (let y = 15; y <= bot; y++) pb.set(x, y, y === 15 ? '#e6bf85' : y === 16 ? col : (y < 19 ? '#8a5a32' : '#5a3218'));
  }
  const masts = big ? [9, 20] : [12];
  for (const m of masts) {
    pb.rect(m, 3, 1, 12, '#5a3218');
    for (let y = 5; y < 14; y++) { const w = Math.round((y - 4) * 0.75); for (let x = m + 1; x <= m + 1 + w; x++) pb.set(x, y, x === m + 1 + w ? '#d8d0c0' : ((y & 1) ? '#fbf6ea' : '#f0e8d8')); }
    for (let y = 7; y < 13; y++) { const w = Math.round((y - 6) * 0.6); for (let x = m - 1 - w; x <= m - 1; x++) pb.set(x, y, '#efe6d2'); }
    // Wimpel
    pb.rect(m, 0, 1, 3, '#5a3218');
    pb.rect(m + 1, 0, 5, 1, col); pb.rect(m + 1, 1, 4, 1, col); pb.rect(m + 1, 2, 2, 1, col);
  }
  // Fässer und Kisten an Deck
  pb.rect(3, 12, 3, 3, '#a87444'); pb.rect(3, 13, 3, 1, '#5a5f68'); pb.rect(W - 6, 12, 3, 3, '#c9995e');
  pb.outline('#2a1a0c');
  return spr(pb, W >> 1, 20);
}

// Handelsposten 3×3: Markthalle mit gestreiftem Sonnendach, Waage, Kisten, Fässer, Flagge
export function makeHandel() {
  const pb = new PB(48, 58);
  // Holzplattform
  for (let y = 40; y < 58; y++) for (let x = 0; x < 48; x++) pb.set(x, y, (x % 6 === 0) ? '#7a4a28' : ((y + ((x / 6) | 0)) % 5 === 0 ? '#a87444' : '#c9995e'));
  // Pfosten
  for (const px of [4, 23, 42]) { pb.rect(px, 22, 2, 22, '#7a4a28'); pb.rect(px, 22, 1, 22, '#a87444'); }
  // Sonnendach rot/weiß gestreift
  for (let j = 0; j < 12; j++) {
    const y = 12 + j, half = Math.round(10 + j * 14 / 11);
    for (let x = 24 - half; x < 24 + half; x++) pb.set(x, y, j === 11 ? '#7a2a1a' : ((((x - 24 + 40) / 4) | 0) % 2 ? '#fbf6ea' : '#d8443a'));
  }
  // Volant
  for (let x = 0; x < 48; x++) if ((x % 4) < 2) pb.set(x, 24, (((x / 4) | 0) % 2) ? '#fbf6ea' : '#d8443a');
  // Theke
  pb.rect(8, 36, 32, 6, '#8a5a32'); pb.rect(8, 36, 32, 1, '#c9995e'); pb.rect(8, 41, 32, 1, '#5a3218');
  // Waage
  pb.rect(23, 27, 2, 9, '#5a5f68'); pb.rect(16, 27, 16, 1, '#8a8f98');
  pb.rect(15, 30, 5, 1, '#c8860e'); pb.rect(28, 30, 5, 1, '#c8860e'); line(pb, 16, 28, 17, 30, '#8a8f98'); line(pb, 31, 28, 30, 30, '#8a8f98');
  // Münzstapel und Waren auf der Theke
  pb.rect(11, 33, 3, 3, '#ffd23f'); pb.rect(11, 33, 3, 1, '#fff2a0'); pb.rect(34, 32, 4, 4, '#3f6fd8'); pb.rect(34, 32, 4, 1, '#8fb0f0');
  // Kisten und Fässer
  pb.rect(1, 48, 7, 7, '#a87444'); pb.rect(1, 48, 7, 1, '#c9995e'); line(pb, 1, 48, 7, 54, '#7a4a28');
  pb.rect(40, 46, 6, 9, '#8a5a32'); pb.rect(40, 48, 6, 1, '#5a5f68'); pb.rect(40, 52, 6, 1, '#5a5f68'); pb.rect(41, 46, 1, 9, '#a87444');
  pb.rect(32, 49, 6, 6, '#c9995e'); pb.rect(32, 49, 6, 1, '#e6bf85');
  // Flagge mit Münze
  pb.rect(44, 0, 1, 14, '#5a3218'); pb.rect(38, 1, 6, 5, '#ffd23f'); pb.rect(40, 2, 2, 3, '#c8860e');
  pb.outline(OUT);
  return BS(pb, { glow: [24, 30] });
}

// Weltenleuchtturm 5×5 (80 px breit) je Stufe 0–4 (0.18.0): 0 Bauplatz · 1 Grundmauer · 2 Turm mit Gerüst (oben das leere Gerippe
// der Lampenkammer) · 3 Turm mit Lampenkammer (Glas, Plane statt Dach, Rest vom Gerüst) · 4 fertig (rot-weiß, Kuppel, Wärterhaus, Fahne).
// Die Lampe bleibt dunkel; lit = brennende Lampe (erst nach Ende A, data/story.js). beam = Mitte der Lampe (Lichtstrahl, Glühen).
const LH_H = [36, 56, 138, 138, 150];
const MASON = ['#ece4d2', '#cfc5b0', '#aba08b', '#857a68'];      // Mauerwerk (hell → Schatten)
const MORT = '#6e6556';
const WHITE = ['#fbf6ea', '#ece4d2', '#c8bfae', '#a29a8a'], RED = ['#e8604a', '#c4453a', '#93372a', '#6e271e'];
const WOODS = ['#c9995e', '#a87444', '#8a5a32', '#5a3a1e'];
const IRONS = ['#a8aeb8', '#8a8f98', '#5a5f68', '#3e424a'];
const GLASS_D = ['#5a7488', '#3e5466', '#2c3c4c', '#1e2a36'];   // dunkles Glas: die Lampe brennt nicht
const COPPER = ['#7cc4a4', '#4f9c82', '#3a7a66', '#285648'];      // Kupferdach mit Grünspan
const shade4 = (r, l) => r[l > 0.45 ? 0 : l > 0.05 ? 1 : l > -0.35 ? 2 : 3];
// Zylinder (Achse senkrecht) von yb (Mitte der Grundfläche) bis yt, Radius rb → rt, Ellipsen-Höhe k·r (Draufsicht schräg).
// col(nx, h, x, y) → Farbe der Mantelfläche (nx −1 links … 1 rechts, h = Höhe über yb), top(x, y, nx, nz) → Deckfläche (null = offen)
function cyl(pb, cx, yb, yt, rb, rt, k, col, top) {
  const R = Math.max(rb, rt);
  for (let y = Math.floor(yt - rt * k) - 1; y <= Math.ceil(yb + rb * k) + 1; y++) for (let x = Math.floor(cx - R) - 1; x <= cx + R + 1; x++) {
    const px = x + 0.5, py = y + 0.5;
    // Mantel: gibt es eine Höhe v, deren vordere Ellipsenkante durch (px, py) läuft?
    let hit = null;
    for (let s = 0; s <= 1.0001; s += 1 / Math.max(8, (yb - yt) * 2)) {
      const v = yb + (yt - yb) * s, r = rb + (rt - rb) * s, nx = (px - cx) / r;
      if (Math.abs(nx) > 1) continue;
      const fy = v + Math.sqrt(1 - nx * nx) * r * k;   // vordere Kante
      if (Math.abs(py - fy) <= 0.5) { hit = { nx, h: yb - v }; }
    }
    if (hit) { pb.set(x, y, col(hit.nx, hit.h, x, y)); continue; }
    // Deckfläche oben
    if (top) { const nx = (px - cx) / rt, nz = (py - yt) / (rt * k); if (nx * nx + nz * nz <= 1) { const c = top(x, y, nx, nz); if (c) pb.set(x, y, c); } }
  }
}
// Mauerwerk: Lagen alle 4 px, Stoßfugen versetzt; band(h) → Farbrampe (für Anstrich)
function masonry(rampOf, rows = 4, joint = 7) {
  return (nx, h, x, y) => {
    const r = rampOf(h), l = -nx * 0.85 + (bay(x, y) - 0.5) * 0.3 + 0.12;
    const row = Math.floor(h / rows), a = Math.asin(Math.max(-1, Math.min(1, nx))) * 9 + (row & 1) * joint / 2;
    if (rampOf === STONEW && ((Math.round(h) % rows === 0) || (Math.abs(a % joint) < 0.6 && Math.abs(nx) < 0.9))) return l > -0.6 ? MORT : r[3];
    return shade4(r, l);
  };
}
const STONEW = () => MASON;
// Felsplateau (alle Stufen)
function plateau(pb, b) {
  for (let y = b - 16; y <= b; y++) for (let x = 2; x < 78; x++) {
    const e = Math.abs(x - 40) / 38, top = b - 16 + Math.round(e * e * 8);
    if (y < top) continue;
    pb.set(x, y, y === top ? STONE[0] : ((x * 7 + y * 3) % 11 === 0 ? STONE[3] : (y > b - 4 ? STONE[2] : STONE[1])));
  }
}
const block = (pb, x, y, w = 7, h = 5) => { pb.rect(x, y, w, h, MASON[1]); pb.rect(x, y, w, 1, MASON[0]); pb.rect(x + w - 1, y, 1, h, MASON[2]); pb.rect(x, y + h - 1, w, 1, MASON[3]); };
const crate = (pb, x, y) => { pb.rect(x, y, 6, 5, WOODS[1]); pb.rect(x, y, 6, 1, WOODS[0]); pb.rect(x, y + 2, 6, 1, WOODS[2]); pb.rect(x + 5, y, 1, 5, WOODS[3]); };
// Gerüst um den Schaft: Stangen, Riegel, Streben, Bohlen, Leiter. x0/x1 = äußere Stangen, y0 oben, y1 unten (Boden)
function scaffoldAround(pb, x0, x1, y0, y1, inner) {
  for (const x of [x0, x1]) { pb.rect(x, y0, 2, y1 - y0, WOODS[1]); pb.rect(x, y0, 1, y1 - y0, WOODS[0]); }
  for (const x of inner) pb.rect(x, y0 + 4, 1, y1 - y0 - 4, WOODS[2]);
  for (let y = y1 - 10; y > y0; y -= 12) {
    pb.rect(x0 - 1, y, x1 - x0 + 4, 2, WOODS[1]); pb.rect(x0 - 1, y, x1 - x0 + 4, 1, WOODS[0]);   // Bohle
    pb.rect(x0 - 1, y + 2, x1 - x0 + 4, 1, WOODS[3]);
  }
  for (let y = y1 - 10; y > y0 + 12; y -= 24) { line(pb, x0 + 1, y, x0 + 7, y - 12, WOODS[2]); line(pb, x1, y, x1 - 6, y - 12, WOODS[2]); }
  // Leiter links außen
  const lx = x0 - 4;
  pb.rect(lx, y0 + 8, 1, y1 - y0 - 8, WOODS[2]); pb.rect(lx + 3, y0 + 8, 1, y1 - y0 - 8, WOODS[2]);
  for (let y = y1 - 2; y > y0 + 8; y -= 3) pb.rect(lx, y, 4, 1, WOODS[1]);
}
export function makeLighthouse(ph, lit) {
  const H = LH_H[ph], pb = new PB(80, H), b = H - 1, cx = 40;
  plateau(pb, b);
  if (ph === 0) {
    // Pflöcke, Seile, Steinblöcke
    for (const [x, y] of [[14, b - 26], [64, b - 26], [24, b - 30], [54, b - 30]]) { pb.rect(x, y, 2, 14, '#8a5a32'); pb.set(x, y, '#c9995e'); }
    line(pb, 15, b - 24, 25, b - 28, '#e6dcc0'); line(pb, 25, b - 28, 55, b - 28, '#e6dcc0'); line(pb, 55, b - 28, 65, b - 24, '#e6dcc0');
    for (const [x, y] of [[30, b - 14], [38, b - 15], [46, b - 13], [34, b - 20]]) block(pb, x, y);
    pb.outline(OUT);
    return BS(pb, { beam: null });
  }
  const K = 0.38;                          // Ellipsen-Höhe je Radius
  const pyb = b - 9, pyt = pyb - (ph === 1 ? 13 : 15), PR = 27;   // Sockel
  if (ph === 1) {
    // Grundmauer: dicker, offener Mauerring, innen dunkel, vorn ein Torbogen; Baumaterial daneben
    cyl(pb, cx, pyb, pyt, PR, PR, K, masonry(STONEW), (x, y, nx, nz) => {
      const d = Math.sqrt(nx * nx + nz * nz);
      if (d > 0.8) return shade4(MASON, 0.5 - nx * 0.3 + (bay(x, y) - 0.5) * 0.3);   // Mauerkrone
      return nz < -0.1 ? '#5a5244' : (bay(x, y) < 0.3 ? '#4a4236' : '#3e382e');          // Innenraum im Schatten
    });
    // unregelmäßige Krone: einzelne Steine fehlen
    for (const [x, w] of [[22, 4], [50, 5], [33, 3]]) for (let i = 0; i < w; i++) { const tx = x + i, ty = pyt - Math.round(Math.sqrt(Math.max(0, 1 - ((tx + 0.5 - cx) / PR) ** 2)) * PR * K); pb.set(tx, ty - 1, null); }
    // Torbogen vorn
    const dy = pyb + Math.round(PR * K) - 1;
    pb.rect(36, dy - 10, 8, 10, '#2e2820'); pb.rect(37, dy - 11, 6, 1, '#2e2820'); pb.rect(35, dy - 10, 1, 10, MASON[0]); pb.rect(44, dy - 10, 1, 10, MASON[2]);
    for (const [x, y] of [[6, b - 12], [12, b - 10], [8, b - 17], [64, b - 11], [70, b - 13]]) block(pb, x, y);
    crate(pb, 58, b - 18); crate(pb, 66, b - 20);
    pb.outline(OUT);
    return BS(pb, { beam: null });
  }
  // Ab Stufe 2: geschlossener Sockel (Plattform) und Schaft
  const painted = ph >= 4;
  cyl(pb, cx, pyb, pyt, PR, PR - 1, K, masonry(STONEW), (x, y, nx, nz) => shade4(MASON, 0.55 - nx * 0.25 - nz * 0.2 + (bay(x, y) - 0.5) * 0.3));
  const sb = pyt, st = sb - 74, SR0 = 14, SR1 = 10;                // Schaft
  const bandRamp = (h) => painted && (Math.floor(h / 12) & 1) ? RED : WHITE;
  cyl(pb, cx, sb, st, SR0, SR1, K, painted ? masonry(bandRamp, 99, 99) : masonry(STONEW), (x, y, nx, nz) => shade4(MASON, 0.3 - nx * 0.3 + (bay(x, y) - 0.5) * 0.3));
  // Fenster im Schaft (Treppenhaus)
  for (const wy of [sb - 24, sb - 48]) { pb.rect(38, wy, 4, 6, '#2a3a4a'); pb.rect(38, wy, 4, 1, painted ? '#8fd0ea' : '#5a6a78'); pb.rect(37, wy + 6, 6, 1, MASON[0]); }
  // Galerie: auskragende Platte mit Geländer
  const gy = st - 1;
  cyl(pb, cx, gy + 2, gy, 16, 16, K, (nx, h, x, y) => shade4(IRONS, -nx * 0.7 + 0.1), (x, y, nx) => shade4(IRONS, 0.5 - nx * 0.4));
  const ly0 = gy - 2, ly1 = ly0 - 14, LR = 8;                       // Lampenkammer
  if (ph === 2) {
    // leere Lampenkammer: nur das eiserne Gerippe, darüber Rauchhimmel – dazu das Gerüst mit Kran
    for (const x of [cx - LR, cx - 3, cx + 2, cx + LR - 1]) pb.rect(x, ly1, 1, ly0 - ly1, IRONS[x < cx ? 1 : 2]);
    for (let x = cx - LR; x < cx + LR; x++) { pb.set(x, ly1, IRONS[1]); pb.set(x, ly1 + 1, IRONS[3]); }
    scaffoldAround(pb, 20, 58, gy - 6, sb + 2, [28, 51]);
    // Kran oben rechts: Ausleger, Seil, Haken
    pb.rect(58, gy - 18, 2, 14, WOODS[1]); line(pb, 58, gy - 18, 74, gy - 14, WOODS[2]); line(pb, 59, gy - 17, 74, gy - 13, WOODS[1]);
    pb.rect(73, gy - 13, 1, 18, '#e6dcc0'); pb.rect(72, gy + 5, 3, 2, IRONS[2]); pb.set(72, gy + 7, IRONS[2]);
    block(pb, 70, gy + 8, 6, 4);
    for (const [x, y] of [[6, b - 12], [64, b - 11], [70, b - 14]]) block(pb, x, y);
    crate(pb, 10, b - 19);
    pb.outline(OUT);
    return BS(pb, { beam: null });
  }
  // Glas der Lampenkammer (dunkel), Sprossen, Linse in der Mitte
  for (let y = ly1; y < ly0; y++) for (let x = cx - LR; x < cx + LR; x++) {
    const nx = (x + 0.5 - cx) / LR, mull = x === cx - LR || x === cx + LR - 1 || x === cx - 3 || x === cx + 2 || y === ly1 + 6;
    const glass = lit ? ((y + x) % 5 === 0 ? '#fff6c8' : '#ffd84a') : shade4(GLASS_D, -nx * 0.6 + (y - ly1) / 30 + (bay(x, y) - 0.5) * 0.3 + ((x - y) % 7 === 0 ? 0.6 : 0));
    pb.set(x, y, mull ? IRONS[nx < 0 ? 1 : 2] : glass);
  }
  if (!lit) { pb.rect(cx - 2, ly1 + 3, 4, 7, '#8a6a32'); pb.rect(cx - 1, ly1 + 4, 2, 5, '#b89a52'); pb.set(cx - 1, ly1 + 4, '#d8c088'); }   // Linse, dunkel
  else { pb.rect(cx - 4, ly1 + 3, 8, 7, '#fff2a0'); pb.rect(cx - 2, ly1 + 1, 4, 3, '#ffe08a'); }
  pb.rect(cx - LR - 1, ly1 - 1, LR * 2 + 2, 2, IRONS[2]); pb.rect(cx - LR - 1, ly1 - 1, LR * 2 + 2, 1, IRONS[1]);
  // Geländer der Galerie
  for (let x = cx - 15; x <= cx + 15; x += 3) pb.rect(x, gy - 4, 1, 4, IRONS[2]);
  pb.rect(cx - 16, gy - 5, 33, 1, IRONS[1]);
  if (ph === 3) {
    // noch ohne Dach: Plane über dem Ring, Rest vom Gerüst an der Schattenseite, Material am Fuß
    for (let x = cx - LR; x < cx + LR; x++) { const sag = Math.round(Math.sin((x - cx + LR) / (LR * 2) * Math.PI) * 2); pb.set(x, ly1 - 2 - (2 - sag), '#c8b88a'); pb.set(x, ly1 - 1 - (2 - sag), '#a8986a'); }
    scaffoldAround(pb, 52, 60, gy + 2, sb - 18, []);
    for (const [x, y] of [[64, b - 11], [70, b - 14]]) block(pb, x, y);
    crate(pb, 10, b - 19); crate(pb, 16, b - 17);
    pb.outline(OUT);
    return BS(pb, { beam: [cx, ly1 + 6] });
  }
  // Stufe 4: Kupferkuppel mit Lüftungskugel und Wetterfahne
  for (let j = 0; j < 8; j++) { const y = ly1 - 2 - j, half = LR + 1 - j * 1.15; for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) pb.set(x, y, shade4(COPPER, -((x + 0.5 - cx) / half) * 0.8 + 0.25 - (j === 0 ? 0.5 : 0) + (bay(x, y) - 0.5) * 0.3)); }
  pb.rect(cx - 1, ly1 - 12, 2, 2, COPPER[1]); pb.rect(cx, ly1 - 17, 1, 5, IRONS[2]); pb.rect(cx + 1, ly1 - 17, 4, 2, IRONS[1]); pb.set(cx + 4, ly1 - 17, '#e8604a');
  // Wärterhaus links am Sockel (Ziegeldach), Tür mit Stufen und Laterne vorn, Fahne rechts
  const hy = b - 14;
  pb.rect(6, hy - 12, 16, 12, MASON[1]); pb.rect(6, hy - 12, 2, 12, MASON[0]); pb.rect(20, hy - 12, 2, 12, MASON[2]);
  for (let j = 0; j < 7; j++) pb.rect(5 + j, hy - 13 - j, 18 - j * 2, 1, j === 0 ? RED[3] : RED[j % 2 ? 1 : 2]);
  pb.rect(10, hy - 8, 4, 4, '#2a3a4a'); pb.rect(10, hy - 8, 4, 1, '#8fd0ea'); pb.rect(16, hy - 7, 3, 7, WOODS[2]);
  const dy = pyb + Math.round(PR * K) - 2;
  pb.rect(36, dy - 9, 8, 9, WOODS[3]); pb.rect(37, dy - 8, 6, 8, WOODS[2]); pb.rect(40, dy - 8, 1, 8, WOODS[3]); pb.rect(35, dy, 10, 2, MASON[0]);
  pb.rect(46, dy - 9, 2, 3, IRONS[2]); pb.set(46, dy - 7, '#ffd23f');
  pb.rect(66, b - 40, 1, 28, WOODS[2]); pb.rect(67, b - 40, 8, 5, '#e8604a'); pb.rect(67, b - 38, 8, 1, '#fbf6ea');
  pb.outline(OUT);
  return BS(pb, { beam: [cx, ly1 + 6], glow: lit ? [cx, ly1 + 6] : [46, dy - 7] });
}
// Baugerüst (über dem Leuchtturm während einer Bauphase), Höhe h
export const LIGHTHOUSE_H = LH_H;
export function makeScaffold(h) {
  const pb = new PB(80, h);
  for (const x of [10, 26, 54, 70]) pb.rect(x, 0, 2, h, '#a87444');
  for (let y = h - 1; y > 0; y -= 12) { pb.rect(8, y, 66, 2, '#8a5a32'); pb.rect(8, y, 66, 1, '#c9995e'); }
  for (let y = h - 1; y > 12; y -= 24) { line(pb, 12, y, 26, y - 12, '#7a4a28'); line(pb, 68, y, 54, y - 12, '#7a4a28'); }
  pb.outline('#3a2414');
  return BS(pb);
}

// Drohnenhafen 2×2: Landeplattform mit H, Mast mit Antenne, Ladelichter
export function makeHub() {
  const pb = new PB(32, 40);
  pb.rect(1, 20, 30, 20, '#454a52'); pb.rect(2, 21, 28, 18, '#6a707a'); pb.rect(2, 21, 28, 1, '#a8aeb8'); pb.rect(2, 38, 28, 1, '#30343a');
  // Landefläche
  shadeEllipse(pb, 16, 29, 11, 7, ['#d8dce4', '#b0b6be', '#8a8f98', '#6a707a'], 0, 0.1);
  pb.rect(12, 26, 2, 7, '#ffd23f'); pb.rect(18, 26, 2, 7, '#ffd23f'); pb.rect(12, 29, 8, 1, '#ffd23f');
  // Mast mit Antenne und Schüssel
  pb.rect(26, 4, 2, 17, '#5a5f68'); pb.rect(26, 4, 1, 17, '#8a8f98'); pb.rect(24, 4, 6, 1, '#454a52');
  pb.set(27, 1, '#e8504a'); pb.rect(27, 2, 1, 2, '#8a8f98');
  shadeEllipse(pb, 22, 10, 3, 4, ['#e8ecf2', '#c8ccd4', '#8a8f98', '#5a5f68'], 0.6, 0.1);
  // Lichter an den Ecken
  for (const [x, y] of [[3, 22], [28, 22], [3, 36], [28, 36]]) pb.rect(x, y, 2, 2, '#3a7a3a');
  pb.outline(OUT);
  return BS(pb, { lit: [[3, 22, 2, 2, '#3a7a3a', '#7cff6a'], [28, 22, 2, 2, '#3a7a3a', '#7cff6a'], [3, 36, 2, 2, '#3a7a3a', '#7cff6a'], [28, 36, 2, 2, '#3a7a3a', '#7cff6a']], glow: [27, 2], glowCol: '120,255,140' });
}
// Drohnenkiste 1×1: Anbieten blau, Anfordern orange; patch = Farbfeld der angeforderten Ware
export function makeDKiste(req) {
  const pb = new PB(16, 20), band = req ? '#e8964a' : '#4a8ae8', hi = req ? '#ffc890' : '#9cc8ff';
  pb.rect(1, 6, 14, 14, '#5a5f68'); pb.rect(2, 7, 12, 12, '#8a8f98'); pb.rect(2, 7, 12, 1, '#c8ccd4'); pb.rect(2, 18, 12, 1, '#454a52');
  pb.rect(2, 11, 12, 3, band); pb.rect(2, 11, 12, 1, hi);
  // Landefeld oben
  pb.rect(4, 3, 8, 4, '#454a52'); pb.rect(5, 4, 6, 2, '#ffd23f'); pb.rect(7, 4, 2, 2, '#454a52');
  pb.outline(OUT);
  return BS(pb, req ? { patch: [6, 15, 4, 3] } : {});
}
// Drohne (7×5): Körper und zwei Rotoren, Rotoren in zwei Stellungen
export function makeDrone(f) {
  const pb = new PB(9, 6);
  pb.rect(3, 2, 3, 2, '#e8ecf2'); pb.set(4, 2, '#4a8ae8');
  pb.rect(1, 3, 2, 1, '#5a5f68'); pb.rect(6, 3, 2, 1, '#5a5f68');
  if (f) { pb.rect(0, 2, 3, 1, '#c8ccd4'); pb.rect(6, 2, 3, 1, '#c8ccd4'); } else { pb.set(1, 1, '#c8ccd4'); pb.set(1, 2, '#c8ccd4'); pb.set(7, 1, '#c8ccd4'); pb.set(7, 2, '#c8ccd4'); }
  pb.outline('#1e2430');
  return spr(pb, 4, 4);
}
