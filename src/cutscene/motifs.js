/* =========================================================
   LEITMOTIVE: wiederkehrende Bausteine mehrerer Cutscenes (docs/STORY.md „Leitmotive“)
     Blitz   – lightningFlash(lt), drawLightning(ctx, lt, at): ein einziger Blitz (cs_prolog, cs_wahrheit exakt gleich)
     Wappen  – wappen(art) → Canvas 13×18: Aurels Wappen (Krone, Berg, aufgehende Sonne).
               art 'fahne' (Aurels Fahne, Akt 1), 'verwittert' (Wrack im Prolog), 'praegung' (Werkzeug am Pumpwerk)
     Siegel  – siegel(art) → Canvas 21×21: Siegel des Herrschers (Leuchtturm über einer Welle).
               art 'wachs' (nasser Zettel im Prolog), 'verblasst' (Ecke des Bauplans in cs_bauplan)
   Alle Bilder werden beim ersten Bedarf gezeichnet und behalten. Kontur, Licht von links oben und Bayer-Dithering
   wie die übrigen Szenen (cutscene/kit.js). Nur Oberfläche (DOM-Canvas).
   ========================================================= */
import { PB, bay, hash, clamp, glow } from './kit.js';

/* =========================================================
   BLITZ – ein Einschlag mit Vorblitz, kurzer Pause, Hauptblitz und langsamem Nachleuchten.
   lt = Sekunden seit dem Einschlag. Die Szene färbt ihren Himmel mit lightningFlash(lt) (0–1) und zeichnet
   Vordergrund (Wellen, Boot) danach als Schattenriss; drawLightning zeichnet den Strahl selbst (zwischen Himmel und Vordergrund).
   ========================================================= */
export const LIGHTNING_LEN = 1.8;                         // danach ist alles wieder dunkel
export const BOLT = { x: 214, top: 4, bottom: 104, seed: 7 };   // Standard-Einschlag (Prolog und cs_wahrheit)
// Helligkeit des Himmels: Vorblitz, Pause, Hauptblitz, Nachleuchten
export function lightningFlash(lt) {
  if (lt < 0 || lt >= LIGHTNING_LEN) return 0;
  if (lt < .06) return .55;
  if (lt < .12) return .1;
  if (lt < .34) return 1 - (lt - .12) * .6;
  return .87 * Math.exp(-(lt - .34) * 3.4) * clamp((LIGHTNING_LEN - lt) / .3, 0, 1);
}
// Sichtbarkeit des Strahls (Nachbild nach dem Hauptblitz)
const boltAlpha = (lt) => lt < 0 ? 0 : lt < .06 ? .8 : lt < .12 ? 0 : lt < .34 ? 1 : clamp(1 - (lt - .34) / .5, 0, 1) * .55;

const bolts = {};
// Zickzack von oben nach unten mit Seitenästen (fest je seed)
function boltPath(at) {
  const key = [at.x, at.top, at.bottom, at.seed].join();
  if (bolts[key]) return bolts[key];
  const main = [], branches = [];
  let x = at.x, y = at.top, i = 0;
  main.push([x, y]);
  while (y < at.bottom) {
    y += 3 + Math.floor(hash(i, 1, at.seed) * 5);
    x += Math.round((hash(i, 2, at.seed) - .5) * 9 + (hash(i, 6, at.seed) < .2 ? (hash(i, 7, at.seed) - .5) * 10 : 0));
    main.push([x, Math.min(y, at.bottom)]);
    // Seitenast an einigen Knicken
    if (i > 1 && hash(i, 3, at.seed) < .3 && y < at.bottom - 20) {
      const dir = hash(i, 4, at.seed) < .5 ? -1 : 1, br = [[x, y]];
      let bx = x, by = y;
      const n = 3 + Math.floor(hash(i, 5, at.seed) * 4);
      for (let k = 0; k < n; k++) { bx += dir * (2 + Math.floor(hash(i, 10 + k, at.seed) * 4)); by += 2 + Math.floor(hash(i, 20 + k, at.seed) * 4); br.push([bx, by]); }
      branches.push(br);
    }
    i++;
  }
  return (bolts[key] = { main, branches });
}
// Linie Pixel für Pixel (Bresenham)
function line(ctx, x0, y0, x1, y1, w) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    ctx.fillRect(x, y, w, 1);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
// Strahl mit Saum und Leuchten; at = BOLT oder eigene Lage { x, top, bottom, seed }
export function drawLightning(ctx, lt, at = BOLT) {
  const a = boltAlpha(lt);
  if (a <= 0) return;
  const P = boltPath(at), main = lt >= .34;
  glow(ctx, at.x, at.top + 30, 90, .35 * a, '205,215,255');
  ctx.globalAlpha = a;
  // Saum (bläulich, breiter), dann Kern (weiß)
  ctx.fillStyle = '#9fb0ff';
  for (let k = 1; k < P.main.length; k++) line(ctx, P.main[k - 1][0] - 1, P.main[k - 1][1], P.main[k][0] - 1, P.main[k][1], 3);
  ctx.fillStyle = main ? '#dfe5ff' : '#ffffff';
  for (let k = 1; k < P.main.length; k++) line(ctx, P.main[k - 1][0], P.main[k - 1][1], P.main[k][0], P.main[k][1], k < P.main.length / 2 ? 2 : 1);
  ctx.fillStyle = main ? '#aab8f0' : '#e8ecff';
  for (const br of P.branches) for (let k = 1; k < br.length; k++) line(ctx, br[k - 1][0], br[k - 1][1], br[k][0], br[k][1], 1);
  ctx.globalAlpha = 1;
}

/* =========================================================
   WAPPEN (Aurel): Krone über einem Schild mit goldenem Rand; im blauen Feld eine Sonne mit Strahlen über einem Berg mit drei Gipfeln.
   Form als Kennbuchstaben-Raster (15×20), Farbe je Art.
   ========================================================= */
const WAPPEN_ROWS = [
  '...C...C...C...',
  '...CC.CjC.CC...',
  '...CCCCCCCCC...',
  '...............',
  'BBBBBBBBBBBBBBB',
  'BFFFFFFRFFFFFFB',
  'BFFFRFFFFFRFFFB',
  'BFFFFFSSSFFFFFB',
  'BFFRFSSSSSFRFFB',
  'BFFFFSSSSSFFFFB',
  'BFFFFFSSSFFFFFB',
  'BFFFRFFFFFRFFFB',
  'BFFFFFFMFFFFFFB',
  'BFFFFFMMmFFFFFB',
  'BFFMFMMMmmFmFFB',
  'BFMMmMMMMmmmmFB',
  '.BMMMMMMMmmmmB.',
  '..BMMMMMMmmmB..',
  '...BBMMMmmBB...',
  '.....BBBBB.....'
];
const WAPPEN_W = WAPPEN_ROWS[0].length, WAPPEN_H = WAPPEN_ROWS.length;
// Farben je Art: Kennbuchstabe → Farbe; F zwei Töne (Dithering), Kontur edge
const WAPPEN_ART = {
  fahne: { C: '#f6cf5a', j: '#c0392b', B: '#f2c24e', F: ['#26397a', '#2f468e'], R: '#ffe08a', S: '#fff5cc', M: '#f2c24e', m: '#c08a2a', edge: '#1d140d' },
  verwittert: { C: '#b09a62', j: '#7a3a30', B: '#a8915c', F: ['#4f6678', '#5a7082'], R: '#c9b886', S: '#ddd0a8', M: '#b89e62', m: '#8c7548', edge: '#3a2f25', bare: ['#8a7660', '#6f5e4b'] },
  praegung: { metal: ['#e2e6ea', '#aab1b7', '#7c858c', '#50585e'], edge: '#262b2f' }
};
const wappenCache = {};
export function wappen(art = 'fahne') {
  if (wappenCache[art]) return wappenCache[art];
  const A = WAPPEN_ART[art], pb = new PB(WAPPEN_W + 2, WAPPEN_H + 2);
  const at = (x, y) => (y < 0 || y >= WAPPEN_H || x < 0 || x >= WAPPEN_W) ? '.' : WAPPEN_ROWS[y][x];
  for (let y = 0; y < WAPPEN_H; y++) for (let x = 0; x < WAPPEN_W; x++) {
    const k = at(x, y);
    if (k === '.') continue;
    let c;
    if (art === 'praegung') {
      // Prägung im Metall: Feld vertieft (dunkler), Zeichen erhaben: hell an der Kante oben links, dunkel unten rechts
      const M = A.metal, up = k !== 'F';
      if (up) c = (at(x - 1, y) === 'F' || at(x, y - 1) === 'F' || at(x - 1, y) === '.' || at(x, y - 1) === '.') ? M[0] : (at(x + 1, y) === 'F' || at(x, y + 1) === 'F') ? M[2] : M[1];
      else c = (at(x - 1, y) !== 'F' || at(x, y - 1) !== 'F') ? M[3] : M[2];
    } else {
      c = A[k];
      if (k === 'F') c = A.F[bay(x, y) < .25 ? 1 : 0];
      // verwittert: abgeplatzte Farbe, darunter Holz
      if (A.bare && hash(x >> 1, y, 13) < .14 && hash(x, y, 14) < .7) c = A.bare[(x + y) % 3 ? 0 : 1];
    }
    pb.set(x + 1, y + 1, c);
  }
  pb.outline(A.edge);
  return (wappenCache[art] = pb.canvas());
}
export const WAPPEN_SIZE = [WAPPEN_W + 2, WAPPEN_H + 2];

/* =========================================================
   SIEGEL (der Herrscher): Wachsklecks mit unregelmäßigem Rand, eingedrückter Ring, darin ein Leuchtturm mit Lampe über einer Welle.
   Eingedrückt heißt: die Vertiefung dunkel, ihre untere rechte Kante fängt Licht.
   ========================================================= */
const SIEGEL_N = 25;
// Zeichen im Ring (11×12, Mitte des Siegels): T = Turm, L = Lampe, r = Strahl, w = Welle
const SIEGEL_MARK = [
  '.r...r...r.',
  '...........',
  'r...LLL...r',
  '....LLL....',
  '...TTTTT...',
  '....TTT....',
  '....T.T....',
  '....TTT....',
  '...TT.TT...',
  '...TTTTT...',
  '..TTTTTTT..',
  '.ww..ww..ww',
  'w..ww..ww..'
];
const SIEGEL_ART = {
  wachs: { r: ['#f39a80', '#d4523f', '#b03a2c', '#7e2219', '#521510'], edge: '#2a0c08', gloss: true },
  verblasst: { r: ['#d8b8a0', '#c09078', '#a87a66', '#86584a', '#5c3529'], edge: '#7a5a48', holes: true }
};
const siegelCache = {};
export function siegel(art = 'wachs') {
  if (siegelCache[art]) return siegelCache[art];
  const A = SIEGEL_ART[art], R = A.r, pb = new PB(SIEGEL_N, SIEGEL_N), c0 = (SIEGEL_N - 1) / 2;
  const mark = (x, y) => { const mx = x - (c0 - 5), my = y - (c0 - 6); return (mx < 0 || my < 0 || mx > 10 || my > 12) ? '.' : SIEGEL_MARK[my][mx]; };
  const ring = (x, y) => { const d = Math.hypot(x - c0, y - c0); return d > 8 && d < 9; };
  const deep = (x, y) => ring(x, y) || mark(x, y) !== '.';
  for (let y = 0; y < SIEGEL_N; y++) for (let x = 0; x < SIEGEL_N; x++) {
    const dx = x - c0, dy = y - c0, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const rim = 10.6 + Math.sin(a * 5 + 1) * .5 + (hash(Math.round(a * 6), 1, 5) - .5) * .9;
    if (d > rim) continue;
    if (A.holes && !deep(x, y) && bay(x, y) < .25 && hash(x, y, 9) < .55) continue;  // verblasst: Papier scheint durch (die Prägung bleibt lesbar)
    let l = 1.7 + (dx * .5 + dy * .45) / 12 + (bay(x, y) - .5) * .3;
    if (d > rim - 1.6) l += (dx + dy) < 0 ? -1 : 1.2;             // Wulst am Rand: Licht oben links
    if (deep(x, y)) l = 4;
    else if (deep(x, y - 1)) l = .8;                                // untere Kante der Vertiefung fängt Licht
    pb.set(x, y, R[clamp(Math.round(l), 0, 4)]);
  }
  if (A.gloss) { pb.set(c0 - 6, c0 - 7, '#ffe2d6'); pb.set(c0 - 7, c0 - 6, '#ffe2d6'); pb.set(c0 - 5, c0 - 8, R[0]); }
  pb.outline(A.edge);
  return (siegelCache[art] = pb.canvas());
}
export const SIEGEL_SIZE = SIEGEL_N;
