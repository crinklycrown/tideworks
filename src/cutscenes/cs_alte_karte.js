/* =========================================================
   CUTSCENE cs_alte_karte „Die alte Karte“ (Ende Akt 3: Gespräch mit Brann, nachdem die Karte gefunden ist)
   Nach docs/STORY.md, ruhiger als dort angegeben (Max' Wunsch: jede Einstellung braucht Zeit).
   Branns Werkstatt am Tag, bewölkt, warmes Werkstattlicht:
     1 (0–8,5 s)    von oben: Brann entrollt die alte Karte auf dem Werktisch
     2 (8,5–18,5 s) doppelte Pixelgröße: sein Finger fährt über Täler, Felder und Dörfer, die Kamera folgt ihm
     3 (18,5–29,5 s) die ganze Karte: gezeichnetes Wasser in Sepia steigt vom alten Meer her über das Land, nur die Bergspitzen bleiben
     4 (29,5–37,2 s) Schnitt zum Fenster: draußen liegen die Inseln, genau in dieser Form; Abblende
   Danach Dialog brann_karte am Fenster.
   Die Karte ist echt: Die vier Bergspitzen, die übrig bleiben, sind die heutigen Inseln dieser Welt (Heimatinsel, Pfahldorf,
   Werkstattbucht, Goldberg) in ihrer wirklichen Lage zueinander und mit ihrem wirklichen Umriss (verkleinert aus den Inselrastern).
   Ohne Welt (z. B. Probe ohne Spiel) nimmt die Szene eine feste Lage. Die Inseln vor dem Fenster sind dieselben Spitzen von der
   Seite gesehen (Höhenprofil aus derselben Höhenkarte), vom Fenster der Werkstattbucht aus in ihrer echten Richtung.
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, vnoise, fbm, PB, pick, layer, canvas, vignette as makeVignette, glow, black, mix } from '../cutscene/kit.js';
import { game } from '../ui/context.js';
import { homeIsl } from '../sim/state.js';
import { G_WATER } from '../config.js';

const T_FINGER = 8.5, T_FLOOD = 18.5, T_WIN = 29.5, T_FADE = 36, T_END = 37.2;

/* ---------- Farben: bewölkter Tag, Werkstatt; Karte vergilbt, Tinte Sepia ---------- */
const WOOD = ['#b8895a', '#926a42', '#6c4c2e', '#49321e', '#2c1e12'];
const IRON = ['#a49c94', '#77706a', '#514c48', '#33302d'];
const PAPER = ['#efe0b2', '#dcc794', '#c4aa72', '#a48a54', '#7e6638'];
const INK = '#4a2e1a', INK_F = '#86633c', INK_L = '#a88a5c';
const WASH = '#a88a5a', WASH_D = '#8a6c42';                   // gezeichnetes Wasser (Sepia)
const SKIN = ['#f0b888', '#d28c60', '#a8653e', '#7a4428', '#4a2816'];
const SHIRT = ['#e8dcc4', '#c8b898', '#a09074', '#746650'];
const SKY = ['#d6d8d4', '#c0c4c2', '#a8aeae', '#8e9698', '#767e82'];   // Wolkendecke
const SEA = ['#8a9a9c', '#748688', '#5e7072', '#4a5a5e'];
const BRICK = ['#a8705a', '#86563f', '#62402f', '#432c20', '#2a1c14'];
const EDGE = '#1e130d';
const LAMP = '255,200,120', DAY = '200,214,224';

/* ---------- Helfer ---------- */
const step5 = (r, l, x, y) => r[clamp(Math.round(l + (bay(x, y) - .5) * .9), 0, r.length - 1)];
function line(pb, x0, y0, x1, y1, c) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
  for (let i = 0; i <= n; i++) pb.set(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), typeof c === 'function' ? c(i, n) : c);
}
// Licht auf vorgerenderten Ebenen: dunkelt nach lf(x, y) in vier geditherten Stufen ab
function shade(cv, lf) {
  const w = cv.width, h = cv.height, x = cv.getContext('2d'), im = x.getImageData(0, 0, w, h), d = im.data;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const i = (yy * w + xx) * 4;
    if (!d[i + 3]) continue;
    const k = lerp(.5, 1, clamp(Math.floor(clamp(lf(xx, yy), 0, 1) * 3 + bay(xx, yy)), 0, 3) / 3);
    d[i] *= k; d[i + 1] *= k * .98; d[i + 2] *= k * .95;
  }
  x.putImageData(im, 0, 0);
  return cv;
}

/* =========================================================
   LAGE DER INSELN (aus der Welt)
   ========================================================= */
const KEYS = ['home', 'ole', 'brann', 'aurel'];
// Feste Lage ohne Welt: Tile-Koordinaten der Mitten, Radius, Umriss als Funktion
const DEMO = {
  home: { x: 0, y: 0, r: 30 }, ole: { x: 250, y: -230, r: 21 }, brann: { x: -560, y: -300, r: 27 }, aurel: { x: 620, y: 780, r: 33 }
};
function islandOf(key) {
  const W_ = game && game.W;
  if (!W_ || !game.state || !game.state.story) return null;
  const k = key === 'home' ? homeIsl(game) : (W_.npcIsl ? W_.npcIsl(key) : -1);
  const I = k != null && k >= 0 ? W_.island(k) : null;
  if (!I || !I.ground) return null;
  return { x: I.x, y: I.y, r: I.r || 25, land: (tx, ty) => { const lx = Math.floor(tx) - I.x0, ly = Math.floor(ty) - I.y0; return lx >= 0 && ly >= 0 && lx < I.w && ly < I.h && I.ground[ly * I.w + lx] !== G_WATER; } };
}
function layout() {
  const real = KEYS.map(islandOf);
  if (real.every(Boolean)) return { key: 'w' + game.state.seed + ':' + real.map(I => I.x + ',' + I.y).join(';'), isl: real };
  // Probe ohne Welt: runde Umrisse mit Buchten aus Rauschen
  return { key: 'demo', isl: KEYS.map((k, i) => { const D = DEMO[k]; return { x: D.x, y: D.y, r: D.r, land: (tx, ty) => { const dx = tx - D.x, dy = ty - D.y, a = Math.atan2(dy, dx); return Math.hypot(dx, dy) < D.r * (.78 + vnoise(Math.cos(a) * 2 + 3, Math.sin(a) * 2 + 3, 50 + i) * .4); } }; }) };
}

/* =========================================================
   DIE KARTE: Höhenkarte mit genau vier Spitzen über dem Endwasserstand SEA_END
   ========================================================= */
const MW = 208, MH = 132;                 // Kartenblatt (Pixel); liegt auf dem Tisch bei (MX, MY)
const MX = 56, MY = 24;
const IN = 9;                             // Rand bis zur Zeichnung
const SEA_END = .62;                      // Endwasserstand: darüber nur die vier Inselumrisse
const COAST = 11;                         // altes Meer am unteren Rand (Zeilen der Zeichnung)
let M = null;                             // gebaute Karte { key, h (Float32Array), base (ImageData-Daten), cv, peaks, villages, path, flood }

function buildMap(lay) {
  const w = MW, h = MH, N = w * h, x0 = IN + 2, y0 = IN + 2, x1 = w - IN - 2, y1 = h - IN - 2 - COAST;
  // Lage der Spitzen: Mitten so skaliert, dass alle mit ihrem Radius in die Zeichnung passen
  const P = lay.isl, RPK = P.map(I => clamp(I.r * .3, 6, 11));
  const minX = Math.min(...P.map(I => I.x)), maxX = Math.max(...P.map(I => I.x)), minY = Math.min(...P.map(I => I.y)), maxY = Math.max(...P.map(I => I.y));
  const pad = 14, sx = (x1 - x0 - 2 * pad) / Math.max(1, maxX - minX), sy = (y1 - y0 - 2 * pad) / Math.max(1, maxY - minY), s = Math.min(sx, sy);
  const cxm = (x0 + x1) / 2 - (minX + maxX) / 2 * s, cym = (y0 + y1) / 2 - (minY + maxY) / 2 * s;
  const peaks = P.map((I, i) => ({ key: KEYS[i], x: cxm + I.x * s, y: cym + I.y * s, R: RPK[i], k: RPK[i] / I.r, I }));
  // Umriss je Spitze (Insel verkleinert): mask[i] = Insel i
  const mask = new Int8Array(N).fill(-1);
  for (const [i, Q] of peaks.entries()) {
    const R = Math.ceil(Q.R * 1.6);
    for (let y = Math.floor(Q.y - R); y <= Q.y + R; y++) for (let x = Math.floor(Q.x - R); x <= Q.x + R; x++) {
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
      if (Q.I.land(Q.I.x + (x + .5 - Q.x) / Q.k, Q.I.y + (y + .5 - Q.y) / Q.k)) mask[y * w + x] = i;
    }
  }
  // Abstand zum nächsten Umriss (Chamfer 3-4) außen und innen
  const out = chamfer(w, h, (j) => mask[j] >= 0), inn = chamfer(w, h, (j) => mask[j] < 0);
  // Höhe: welliges Tiefland mit Tälern, Hügel; um die Spitzen Berge, die bis knapp unter SEA_END reichen
  const H0 = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const j = y * w + x;
    let v = .16 + fbm(x / 34, y / 30, 71, 4) * .3 + vnoise(x / 9, y / 9, 72) * .05;
    if (mask[j] >= 0) v = SEA_END + .03 + Math.min(inn[j], 8) * .025;
    else { const d = out[j]; v = Math.max(v, Math.min(SEA_END - .006, SEA_END - .012 - d * .016 + (fbm(x / 7, y / 7, 73, 2) - .5) * .05 * Math.min(1, d / 3))); }
    if (y > y1) v = Math.min(v, Math.max(0, .14 - (y - y1) * .04));                                // altes Meer unten (Küste mit Deich)
    if (x < x0 || x > x1 || y < y0) v = Math.min(v, .3);
    H0[j] = v;
  }
  // Flüsse: von den Bergflanken bergab bis ins Meer (Tinte), sie graben die Täler
  const river = new Uint8Array(N), rivers = [];
  for (const [i, Q] of peaks.entries()) for (const a of [hash(i, 1, 81) * 6.28, hash(i, 2, 81) * 6.28 + 2.5]) {
    let x = Q.x + Math.cos(a) * (Q.R + 4), y = Q.y + Math.sin(a) * (Q.R + 4);
    const pts = [];
    for (let n = 0; n < 260; n++) {
      const xi = Math.round(x), yi = Math.round(y);
      if (xi < 2 || yi < 2 || xi >= w - 2 || yi >= h - 2) break;
      pts.push([xi, yi]);
      if (yi > y1 + 2) break;
      // Richtung: bergab (Gefälle) mit Zug zur Küste, etwas Mäander
      const gx = H0[yi * w + xi + 1] - H0[yi * w + xi - 1], gy = H0[(yi + 1) * w + xi] - H0[(yi - 1) * w + xi];
      let dx = -gx * 30, dy = -gy * 30 + .55;
      dx += Math.sin(n * .35 + i * 3) * .45;
      const l = Math.hypot(dx, dy) || 1;
      x += dx / l * .9; y += dy / l * .9;
    }
    if (pts.length > 25) { rivers.push(pts); for (const [px, py] of pts) { river[py * w + px] = 1; for (let k = 0; k < 9; k++) { const j = (py + (k / 3 | 0) - 1) * w + px + (k % 3) - 1; if (mask[j] < 0) H0[j] = Math.min(H0[j], H0[j] * .96); } } }
  }
  // Dörfer: im Tiefland, Abstand zueinander und zu Flüssen, nicht im Gebirge; Straßen verbinden Nachbarn
  const villages = [];
  for (let t = 0; t < 500 && villages.length < 10; t++) {
    const x = Math.round(x0 + 6 + hash(t, 1, 91) * (x1 - x0 - 12)), y = Math.round(y0 + 6 + hash(t, 2, 91) * (y1 - y0 - 10)), j = y * w + x;
    if (H0[j] > .4 || out[j] < 9 || villages.some(v => Math.hypot(v.x - x, v.y - y) < 22)) continue;
    let nearRiver = false; for (let k = -3; k <= 3 && !nearRiver; k++) for (let l = -3; l <= 3; l++) if (river[(y + k) * w + x + l]) { nearRiver = true; break; }
    if (nearRiver) continue;
    villages.push({ x, y, n: 3 + Math.floor(hash(t, 3, 91) * 3), church: hash(t, 4, 91) < .5 });
  }
  // Bergdörfer (Aurels Leute) an den Flanken des Goldbergs: ein paar Häuschen knapp unter der Spitze
  const gold = peaks[3];
  const mountainVil = [0, 1, 2].map(k => { const a = -2.2 + k * .9; return { x: Math.round(gold.x + Math.cos(a) * (gold.R + 3)), y: Math.round(gold.y + Math.sin(a) * (gold.R + 3)), n: 2, church: false, high: true }; });

  // Kartenblatt zeichnen
  const pb = new PB(w, h);
  const paperL = (x, y) => {
    const e = Math.min(x, y, w - 1 - x, h - 1 - y);
    let l = .65 + (fbm(x / 30, y / 24, 31, 3) - .5) * 1.5 + (vnoise(x / 3, y / 3, 32) - .5) * .4;
    if (e < 7) l += (7 - e) * .2 + (hash(x, y, 1) - .5) * .4;
    l += Math.sin(x / 13 * Math.PI) * .2;                                         // Wellen vom Rollen (gerollt von oben)
    if (hash(x >> 1, y >> 1, 33) < .01) l += 1.5;                                   // Stockflecken
    return l;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if ((w - 1 - x) + (h - 1 - y) < 7 + vnoise(x / 2, y / 2, 3) * 4) continue;      // eingerissene Ecke unten rechts
    if (x + y < 4) continue;
    pb.set(x, y, step5(PAPER, paperL(x, y), x, y));
  }
  const inside = (x, y) => x >= x0 - 2 && x <= x1 + 2 && y >= y0 - 2 && y < h - IN - 2;
  // Felder: Flickenteppich im Tiefland (Schraffur in wechselnder Richtung), Wälder an den Hängen (kleine Bäume)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const j = y * w + x, v = H0[j];
    if (mask[j] >= 0 || river[j]) continue;
    const cx = Math.floor((x + (Math.floor(y / 7) % 2) * 4) / 9), cy = Math.floor(y / 7), r = hash(cx, cy, 95);
    if (v < .36 && out[j] > 6 && r < .7) {
      const border = (x + (Math.floor(y / 7) % 2) * 4) % 9 === 0 || y % 7 === 0;
      if (border) { if (hash(x, y, 96) < .5) pb.set(x, y, INK_L); continue; }
      const dir = r < .23 ? (x + y) % 3 : r < .46 ? (x - y + 300) % 3 : r < .6 ? (y % 2 ? 1 : 0) : 1;
      if (dir === 0) pb.set(x, y, INK_L);
    } else if (v > .36 && v < SEA_END - .05 && (x * 3 + y * 5) % 11 === 0 && hash(x, y, 97) < .6) {   // Wald
      pb.set(x, y, INK_F); pb.set(x, y - 1, INK_L); pb.set(x - 1, y + 1, INK_L); pb.set(x + 1, y + 1, INK_L);
    }
  }
  // Höhenlinien (Berge): Tinte, wo die Höhe eine Stufe überschreitet; Schraffur auf der Schattenseite
  const lvls = [.44, .52, .58, SEA_END + .05];
  for (let y = y0; y < h - IN - 2; y++) for (let x = x0; x < x1; x++) {
    const j = y * w + x, a = H0[j], b = H0[j + 1], c = H0[j + w];
    for (const L of lvls) if ((a < L) !== (b < L) || (a < L) !== (c < L)) { pb.set(x, y, L > SEA_END ? INK : INK_F); break; }
    if (a > .5 && a < SEA_END && H0[j - w - 1] - a > .006 && (x + y) % 2 === 0) pb.set(x, y, INK_L);   // Schraffur abgewandt vom Licht
  }
  // Spitzen: Umrisslinie kräftig, Felsstriche
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const j = y * w + x;
    if (mask[j] < 0) continue;
    if (mask[j - 1] < 0 || mask[j + 1] < 0 || mask[j - w] < 0 || mask[j + w] < 0) pb.set(x, y, INK);
    else if ((x - y) % 3 === 0 && hash(x, y, 98) < .5) pb.set(x, y, INK_F);
  }
  // Flüsse: doppelte Linie, an der Mündung breiter
  for (const pts of rivers) pts.forEach(([x, y], n) => { pb.set(x, y, INK); if (n > pts.length * .6) pb.set(x + 1, y, INK_F); });
  // Straßen: gestrichelt zwischen nahen Dörfern
  const all = villages.concat(mountainVil);
  for (const [a, A] of villages.entries()) for (const B of all.slice(a + 1)) {
    const d = Math.hypot(B.x - A.x, B.y - A.y);
    if (d > 46) continue;
    const n = Math.ceil(d);
    for (let k = 0; k <= n; k++) if (Math.floor(k / 2) % 2 === 0) { const x = Math.round(lerp(A.x, B.x, k / n) + Math.sin(k * .3) * 1.2), y = Math.round(lerp(A.y, B.y, k / n)); if (mask[y * w + x] < 0) pb.set(x, y, INK_F); }
  }
  // Dörfer: Häuschen (2×2 mit Dachpixel), Kirche mit Turm; Schriftzug (unleserliche Handschrift)
  const house = (x, y) => { pb.rect(x, y, 2, 2, INK); pb.set(x, y - 1, INK_F); pb.set(x + 1, y - 1, INK_F); pb.set(x, y + 1, INK_F); };
  for (const [i, V] of all.entries()) {
    for (let k = 0; k < V.n; k++) house(V.x - 3 + (k % 3) * 3, V.y - 2 + Math.floor(k / 3) * 3 + (k % 2));
    if (V.church) { pb.rect(V.x + 5, V.y - 4, 1, 5, INK); pb.set(V.x + 4, V.y - 3, INK); pb.set(V.x + 6, V.y - 3, INK); pb.rect(V.x + 4, V.y + 1, 3, 1, INK); }
    if (!V.high) for (let k = 0; k < 9 + (i % 3) * 3; k++) { const yy = V.y + 5 + (hash(k, 1, 99 + i) < .3 ? -1 : 0); if (hash(k >> 2, 0, 99 + i) > .2 || k % 4) pb.set(V.x - 4 + k, yy, INK_F); }
  }
  // Deich an der Küste (doppelte Linie mit Querstrichen) und das Pumpwerk darauf (Haus mit Rad und Schornstein)
  const dikeY = (x) => y1 + 2 + Math.round(Math.sin(x / 15) * 1.2);
  for (let x = x0; x <= x1; x++) { pb.set(x, dikeY(x), INK); pb.set(x, dikeY(x) + 2, INK); if (x % 3 === 0) pb.set(x, dikeY(x) + 1, INK_F); }
  const pwx = Math.round(x0 + (x1 - x0) * .62), pwy = dikeY(pwx) - 1;
  for (let y = pwy - 6; y <= pwy; y++) for (let x = pwx - 5; x <= pwx + 5; x++) pb.set(x, y, (x === pwx - 5 || x === pwx + 5 || y === pwy - 6) ? INK : PAPER[1]);
  for (let x = pwx - 6; x <= pwx + 6; x++) pb.set(x, pwy - 7 - Math.max(0, 3 - Math.abs(x - pwx) * .5) | 0, INK);
  pb.rect(pwx + 3, pwy - 12, 1, 5, INK);
  for (let a = 0; a < 16; a++) { const an = a / 16 * 6.28; pb.set(Math.round(pwx - 1 + Math.cos(an) * 2.5), Math.round(pwy - 3 + Math.sin(an) * 2.5), INK); }
  // Leuchtturm auf der Spitze der Heimatinsel (das Licht von früher): kleiner Turm, Lampe rot
  const hp = peaks[0], ly = Math.round(hp.y) + 1, lx = Math.round(hp.x);
  pb.rect(lx - 1, ly - 6, 3, 6, INK); pb.set(lx, ly - 4, PAPER[1]); pb.set(lx, ly - 7, '#9a4a32'); pb.set(lx - 1, ly - 7, INK); pb.set(lx + 1, ly - 7, INK); pb.set(lx, ly - 8, INK);
  // Meer (altes Meer am unteren Rand) als Wellenschrift, Windrose oben links, Rahmen
  // (das Wasser selbst zeichnet floodCanvas über das Blatt)
  rose(pb, x1 - 12, y0 + 11);
  for (let x = 4; x < w - 4; x++) for (const yy of [4, 6, h - 7, h - 5]) if (hash(x, yy, 5) > .08 && pb.get(x, yy)) pb.set(x, yy, yy === 4 || yy === h - 5 ? INK_F : INK);
  for (let y = 4; y < h - 4; y++) for (const xx of [4, 6, w - 7, w - 5]) if (hash(xx, y, 5) > .08 && pb.get(xx, y)) pb.set(xx, y, xx === 4 || xx === w - 5 ? INK_F : INK);
  // Titelfeld oben links (Handschrift, unleserlich)
  for (let x = x0 + 1; x < x0 + 40; x++) { pb.set(x, y0 + 1, INK); pb.set(x, y0 + 12, INK); }
  for (let y = y0 + 1; y <= y0 + 12; y++) { pb.set(x0 + 1, y, INK); pb.set(x0 + 39, y, INK); }
  for (let y = y0 + 2; y < y0 + 12; y++) for (let x = x0 + 2; x < x0 + 39; x++) pb.set(x, y, step5(PAPER, .2 + (bay(x, y) - .5), x, y));
  scrib(pb, x0 + 5, y0 + 5, 30, 1, INK); scrib(pb, x0 + 8, y0 + 9, 22, 2, INK_F);
  pb.outline('#3a2414');
  const cv = pb.canvas();
  // Fensterlicht von links oben (bewölkter Tag) auf das Blatt
  shade(cv, (x, y) => 1.35 - Math.hypot(x + MX - 40, (y + MY - 10) * 1.2) / 320);
  const base = cv.getContext('2d').getImageData(0, 0, w, h);
  // Abstand zur Küste (für das Wasser, das vom Meer her steigt)
  const coastD = new Float32Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) coastD[y * w + x] = clamp((y1 + 2 - y) / (y1 - y0), 0, 1);
  // Weg des Fingers: über Täler (Fluss), Felder, Dörfer – drei Dörfer nahe der Mitte, von links nach rechts
  const vs = villages.slice().sort((a, b) => Math.hypot(a.x - w / 2, a.y - h / 2) - Math.hypot(b.x - w / 2, b.y - h / 2)).slice(0, 3).sort((a, b) => a.x - b.x);
  const path = vs.length >= 2 ? vs.map(v => [v.x + 1, v.y + 3]) : [[w * .3, h * .55], [w * .5, h * .6], [w * .7, h * .5]];
  return { key: lay.key, h: H0, mask, base, cv, peaks, villages, path, coastD, river };
}
// Chamfer-Abstand zu Pixeln mit src(j) (3-4-Maske, in Pixeln)
function chamfer(w, h, src) {
  const N = w * h, d = new Float32Array(N).fill(1e9);
  for (let j = 0; j < N; j++) if (src(j)) d[j] = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const j = y * w + x; if (x > 0) d[j] = Math.min(d[j], d[j - 1] + 1); if (y > 0) { d[j] = Math.min(d[j], d[j - w] + 1); if (x > 0) d[j] = Math.min(d[j], d[j - w - 1] + 1.41); if (x < w - 1) d[j] = Math.min(d[j], d[j - w + 1] + 1.41); } }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const j = y * w + x; if (x < w - 1) d[j] = Math.min(d[j], d[j + 1] + 1); if (y < h - 1) { d[j] = Math.min(d[j], d[j + w] + 1); if (x < w - 1) d[j] = Math.min(d[j], d[j + w + 1] + 1.41); if (x > 0) d[j] = Math.min(d[j], d[j + w - 1] + 1.41); } }
  return d;
}
// Handschrift (nicht lesbar)
function scrib(pb, x, y, len, seed, c = INK_F) {
  for (let i = 0; i < len; i++) {
    if (hash(i >> 2, 0, seed) < .18 && i % 5 === 0) { i += 2; continue; }
    const k = hash(i, 1, seed), up = k < .2 ? 2 : k < .5 ? 1 : 0, dn = k > .9 ? 1 : 0;
    for (let j = -up; j <= dn; j++) pb.set(x + i, y + j, c);
  }
}
// Windrose: Stern mit vier Spitzen, Ring, N oben
function rose(pb, cx, cy) {
  for (let a = 0; a < 40; a++) { const an = a / 40 * 6.28; pb.set(Math.round(cx + Math.cos(an) * 6), Math.round(cy + Math.sin(an) * 6), INK_F); }
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) for (let k = 0; k <= 8; k++) { pb.set(cx + dx * k, cy + dy * k, INK); if (k < 4) { pb.set(cx + dx * k + dy, cy + dy * k + dx, INK_F); } }
  pb.set(cx - 1, cy - 12, INK); pb.set(cx - 1, cy - 11, INK); pb.set(cx - 1, cy - 10, INK); pb.set(cx, cy - 11, INK); pb.set(cx + 1, cy - 12, INK); pb.set(cx + 1, cy - 11, INK); pb.set(cx + 1, cy - 10, INK);
}

/* ---------- Gezeichnetes Wasser (Sepia) bis zur Höhe lv; u = Fortschritt der Flut (0–1): vorn am Meer steigt es zuerst ---------- */
const floodCv = { cv: null, key: '' };
const WASH_RGB = [0xa8, 0x8a, 0x5a], INK_RGB = [0x4a, 0x2e, 0x1a], INKF_RGB = [0x86, 0x63, 0x3c];
function floodCanvas(lv, u, t) {
  const key = Math.round(lv * 800) + ':' + Math.round(u * 60) + ':' + Math.floor(t * 4) % 6;
  if (floodCv.key === key && floodCv.cv) return floodCv.cv;
  const w = MW, h = MH, src = M.base.data, H0 = M.h, C = M.coastD;
  if (!floodCv.cv) floodCv.cv = canvas(w, h);
  const x = floodCv.cv.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  const tilt = (1 - u) * .22;
  const wet = (j) => H0[j] + tilt * C[j] < lv;
  const ph = Math.floor(t * 4) % 6;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const j = y * w + xx, i = j * 4;
    if (!src[i + 3]) continue;
    if (xx < IN || xx >= w - IN || y < IN || y >= h - IN || !wet(j)) { d[i] = src[i]; d[i + 1] = src[i + 1]; d[i + 2] = src[i + 2]; d[i + 3] = 255; continue; }
    // Lavierung: das Blatt scheint gedämpft durch (untergegangene Dörfer bleiben schwach zu sehen)
    const k = .6 + (bay(xx, y) < .5 ? .05 : 0);
    let r = src[i] * (1 - k) + WASH_RGB[0] * k, g = src[i + 1] * (1 - k) + WASH_RGB[1] * k, b = src[i + 2] * (1 - k) + WASH_RGB[2] * k;
    // Wellenschrift: kurze Bögen in Reihen
    const row = (y + 400) % 5, wx = (xx + (Math.floor(y / 5) % 2) * 5 + ph) % 10;
    if (row === 0 && wx < 3) { r = INKF_RGB[0]; g = INKF_RGB[1]; b = INKF_RGB[2]; }
    else if (row === 1 && (wx === 3 || wx === 4)) { r = INKF_RGB[0]; g = INKF_RGB[1]; b = INKF_RGB[2]; }
    // Uferlinie: Wasser neben Land
    if (!wet(j - 1) || !wet(j + 1) || !wet(j - w) || !wet(j + w)) { r = INK_RGB[0]; g = INK_RGB[1]; b = INK_RGB[2]; }
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  floodCv.key = key;
  return floodCv.cv;
}

/* =========================================================
   STATISCHE EBENEN
   ========================================================= */
let L = null;
function setup() {
  if (L) return;
  L = { table: buildTable(), handL: buildHand(false, false), handR: buildHand(true, false), point: buildHand(false, true), vig: makeVignette('#160d08', 1.2, .66) };
  shade(L.table, (x, y) => 1.35 - Math.hypot(x - 40, (y - 10) * 1.2) / 320);
}
// Kartenblatt passend zur aktuellen Welt (neu, wenn sich die Lage geändert hat)
function ensureMap() {
  const lay = layout();
  if (M && M.key === lay.key) return;
  M = buildMap(lay);
  floodCv.key = '';
  W4 = null;
}

/* ---------- Werktisch von oben (Tageslicht): Bretter, Werkzeug, Zirkel, Lupe ---------- */
function buildTable() {
  const pb = new PB(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const plank = Math.floor((x + 9) / 31), px = (x + 9) % 31, seam = px === 0 || px === 30;
    const g = fbm((y + plank * 37) / 40, x / 2.4, 160 + plank, 3);
    let l = 1.3 + (g - .5) * 2 + (hash(plank, 0, 4) - .5) * .7;
    if (seam) l = 4;
    if (hash(x, y >> 3, 8) < .01) l += 1.2;
    pb.set(x, y, step5(WOOD, l, x, y));
  }
  // Ölflecken, Späne, Werkzeug: Zirkel links, Lupe rechts unten, Messingschraube, Bleistift
  for (let y = 0; y < H; y++) for (let x = 0; x < 50; x++) { const d = Math.hypot(x - 28, (y - 150) * 1.3); if (d < 10 && bay(x, y) < .4 * (1 - d / 10)) pb.set(x, y, WOOD[4]); }
  line(pb, 24, 52, 14, 92, IRON[1]); line(pb, 25, 52, 36, 92, IRON[2]);
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y < 6) pb.set(24 + x, 51 + y, x + y < 0 ? IRON[0] : IRON[2]);
  for (let y = 0; y < H; y++) for (let x = 270; x < 312; x++) { const d = Math.hypot(x - 291, y - 132); if (d < 12 && d > 9) pb.set(x, y, d > 11 ? IRON[3] : '#b08a3a'); else if (d <= 9) pb.set(x, y, bay(x, y) < .1 ? '#e8f0f0' : null); }
  for (let k = 0; k < 18; k++) { pb.set(300 + k, 142 + k, WOOD[0]); pb.set(301 + k, 142 + k, WOOD[3]); }
  line(pb, 280, 40, 306, 58, '#c8a040'); line(pb, 280, 41, 306, 59, '#8a6a20'); pb.set(307, 59, '#2a2a2a');
  for (const [x, y] of [[18, 20], [300, 92], [42, 120]]) { for (let k = 0; k < 9; k++) pb.set(x + (k % 3), y + (k / 3 | 0), k === 4 ? IRON[3] : '#c09a48'); }
  pb.outline(EDGE);
  return pb.canvas();
}

/* ---------- Hände von oben (wie cs_bauplan: flache Tonstufen, Finger als Block mit Fugen, Daumen innen) ----------
   point = Zeigehand: drei Finger eingeschlagen (kurz, dunkle Kuppen = untergeschlagen), Zeigefinger gestreckt */
const HW = 20, HC = 9;
const HH = (point) => point ? 36 : 24;
function buildHand(right, point) {
  const hh = HH(point), pb = new PB(HW, hh), S = SKIN;
  for (let y = 6; y < 17; y++) for (let x = 0; x < HW; x++) {
    const ax = HC + 6.6 + (y - 6) * (point ? .15 : .3), dd = x + .5 - ax, wd = y > 14 ? 1.8 - (y - 14) * .5 : 1.8;
    if (Math.abs(dd) > wd) continue;
    pb.set(x, y, dd < -.6 ? S[1] : dd > .6 ? S[3] : S[2]);
  }
  pb.outline(EDGE);
  const K = 11, X0 = HC - 7.5, LEN = point ? [15, 15.5, 15.5, 33] : [18.5, 20.5, 21.5, 20.5];
  for (let y = 0; y <= hh - 2; y++) for (let x = 0; x < HW; x++) {
    const px = x + .5;
    if (y <= K) {
      const half = y < 3 ? 4.5 : 4.5 + (y - 3) * .375, dx = px - HC;
      if (Math.abs(dx) > half) continue;
      const nx = dx / half;
      let c = nx < -.72 ? S[0] : nx < .35 ? S[1] : nx < .8 ? S[2] : S[3];
      if (y === K) { const f = Math.floor((px - X0) / 4), fx = px - X0 - f * 4; c = fx > 3 ? S[3] : fx < 1.5 ? S[0] : S[1]; }
      pb.set(x, y, c);
      continue;
    }
    const f = Math.floor((px - X0) / 4), fx = px - X0 - f * 4;
    if (f < 0 || f > 3) continue;
    const len = LEN[f];
    if (fx > 3) { if (y < len - 1.5 && y < (LEN[f + 1] || 0) - 1.5) pb.set(x, y, S[3]); continue; }
    if (y > len) continue;
    if (y > len - 1 && (fx < .6 || fx > 2.4)) continue;
    let c;
    if (point && f < 3) c = y > len - 2 ? S[3] : S[clamp((fx < 1 ? 0 : fx < 2 ? 1 : 2) + 1, 0, 4)];    // eingeschlagen: Fingerrücken, unten dunkel
    else c = S[clamp((fx < 1 ? 0 : fx < 2 ? 1 : 2) + (y > K + 5 && !point ? 1 : 0) + (f === 3 && !point ? 1 : 0), 0, 4)];
    if (point && f === 3 && y > len - 3 && fx > .8 && fx < 2.2) c = '#f4d0b0';                               // Fingernagel
    if (y === K + 1) c = S[2];
    pb.set(x, y, c);
  }
  pb.outline(EDGE);
  const cv = pb.canvas();
  if (!right) return cv;
  const m = canvas(HW, hh), mx = m.getContext('2d');
  mx.translate(HW, 0); mx.scale(-1, 1); mx.drawImage(cv, 0, 0);
  return m;
}
// Unterarm von oben mit aufgekrempeltem Ärmel (wie cs_bauplan)
function armPB(pb, ax, ay, bx, by, mirror) {
  const vx = bx - ax, vy = by - ay, ll = vx * vx + vy * vy, len = Math.sqrt(ll), SLEEVE = clamp(1 - 24 / len, 0, 1);
  for (let y = Math.floor(Math.min(ay, by) - 7); y <= Math.max(ay, by) + 7; y++) for (let x = Math.floor(Math.min(ax, bx) - 8); x <= Math.max(ax, bx) + 8; x++) {
    const px = x + .5, py = y + .5, u = clamp(((px - ax) * vx + (py - ay) * vy) / ll, 0, 1);
    const sleeve = u < SLEEVE, r = sleeve ? 6.6 : lerp(5.8, 5.2, (u - SLEEVE) / (1 - SLEEVE));
    const nx = (px - ax - u * vx) / r, ny = (py - ay - u * vy) / r, d = nx * nx + ny * ny;
    if (d > 1) continue;
    const l = -(nx * .62 + ny * .55) * .9 + (1 - d) * .22 + (bay(x, y) - .5) * .3;
    if (sleeve) { const cuff = u > SLEEVE - .07; pb.set(x, y, cuff ? (u > SLEEVE - .02 ? SHIRT[3] : pick(SHIRT, l + .35)) : pick(SHIRT, l - .1)); }
    else {
      let q = ((px - ax - u * vx) * vy - (py - ay - u * vy) * vx) / (len * r);
      if (mirror) q = -q;
      pb.set(x, y, q < -.72 ? SKIN[0] : q < .35 ? SKIN[1] : q < .8 ? SKIN[2] : SKIN[3]);
    }
  }
}
// Hand (Canvas) ohne Außenkontur in den Puffer setzen; Arm und Hand bekommen danach eine gemeinsame Kontur
function putHand(pb, img, x, top) {
  const w = img.width, h = img.height, hand = img.getContext('2d').getImageData(0, 0, w, h).data;
  const op = (xx, y) => xx >= 0 && y >= 0 && xx < w && y < h && hand[(y * w + xx) * 4 + 3];
  const edge = (xx, y) => { const j = (y * w + xx) * 4; return hand[j] < 60 && hand[j + 1] < 40 && (!op(xx - 1, y) || !op(xx + 1, y) || !op(xx, y - 1) || !op(xx, y + 1)); };
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const j = (y * w + xx) * 4; if (hand[j + 3] && !edge(xx, y)) pb.set(x + xx, top + y, '#' + [0, 1, 2].map(k => hand[j + k].toString(16).padStart(2, '0')).join('')); }
}
// Arme und Hände zusammen mit Schatten zeichnen; parts = [{ img, x (Mitte Handgelenk), top, from: [ax, ay], mirror }]; s, ox, oy = Ausschnitt
function drawArms(ctx, parts, s = 1, ox = 0, oy = 0) {
  const pb = new PB(W, H);
  for (const P of parts) { armPB(pb, P.from[0], P.from[1], P.x, P.top + 6, P.mirror); putHand(pb, P.img, Math.round(P.x - (P.mirror ? HW - HC : HC)), Math.round(P.top)); }
  pb.outline(EDGE);
  const cv = pb.canvas(), sh = canvas(W, H), sx = sh.getContext('2d');
  sx.drawImage(cv, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = 'rgba(30,14,6,.38)'; sx.fillRect(0, 0, W, H);
  const vw = W / s, vh = H / s;
  ctx.drawImage(sh, ox - 3, oy - 3, vw, vh, 0, 0, W, H);
  ctx.drawImage(cv, ox, oy, vw, vh, 0, 0, W, H);
}

/* =========================================================
   ZEICHNEN: Tisch, Karte, Rolle
   ========================================================= */
const vig = (ctx, a = .5) => { ctx.globalAlpha = a; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1; };
// Tisch mit Karte: rev = sichtbare Länge der Karte (0–MH), danach die Rolle; s = Pixelgröße, (ox, oy) = linke obere Ecke des Ausschnitts
const ROLL_R0 = 7, ROLL_R1 = 4.5, rollR = (rev) => lerp(ROLL_R0, ROLL_R1, rev / MH);
function renderTable(ctx, t, rev, s, ox, oy, mapCv) {
  ox = Math.round(ox); oy = Math.round(oy);
  const vw = Math.ceil(W / s), vh = Math.ceil(H / s);
  ctx.drawImage(L.table, ox, oy, vw, vh, 0, 0, vw * s, vh * s);
  const r = Math.round(rev), cv = mapCv || M.cv;
  if (r > 0) {
    // Schatten der Karte auf dem Holz, dann das Blatt
    ctx.fillStyle = 'rgba(30,16,8,.35)'; ctx.fillRect((MX + 2 - ox) * s, (MY + 2 - oy) * s, MW * s, r * s);
    ctx.drawImage(cv, 0, 0, MW, r, (MX - ox) * s, (MY - oy) * s, MW * s, r * s);
  }
  if (r < MH) drawRoll(ctx, MY + rev + rollR(rev), rollR(rev), s, ox, oy);
  glow(ctx, (40 - ox) * s, (10 - oy) * s, 260 * s, .1, DAY);
}
function drawRoll(ctx, cy, r, s, ox, oy) {
  const x0 = MX - 2, x1 = MX + MW + 2, top = Math.round(cy - r), n = Math.round(r * 2);
  const P = (x, y) => [Math.round((x - ox) * s), Math.round((y - oy) * s)];
  ctx.fillStyle = 'rgba(30,16,8,.45)'; { const [sx, sy] = P(x0 + 2, top + n); ctx.fillRect(sx, sy, (x1 - x0) * s, 2 * s); }
  for (let j = 0; j < n; j++) {
    const ny = (j + .5) / n * 2 - 1, base = 1.1 + ny * 1.6 - (1 - ny * ny) * .4;
    for (let x = x0; x < x1; x++) {
      const end = x - x0 < 2 || x1 - 1 - x < 2;
      ctx.fillStyle = step5(PAPER, base + (end ? 1.2 + (((x + j) % 3 === 0) ? .8 : 0) : 0) + (fbm(x / 20, j / 4, 33, 2) - .5) * .5 + (x - x0) / 400, x, top + j);
      const [sx, sy] = P(x, top + j); ctx.fillRect(sx, sy, s, s);
    }
  }
  ctx.fillStyle = EDGE;
  { const [sx, sy] = P(x0 - 1, top); ctx.fillRect(sx, sy, s, n * s); }
  { const [sx, sy] = P(x1, top); ctx.fillRect(sx, sy, s, n * s); }
  { const [sx, sy] = P(x0, top + n); ctx.fillRect(sx, sy, (x1 - x0) * s, s); }
}
// Staub im Tageslicht
function dust(ctx, t, cx, cy, r, n, s = 1) {
  for (let i = 0; i < n; i++) {
    const p = (t * (.03 + hash(i, 1, 9) * .03) + hash(i, 2, 9)) % 1, a = hash(i, 3, 9) * Math.PI * 2;
    const x = cx + Math.cos(a) * r * hash(i, 4, 9) + Math.sin(t * .7 + i) * 6, y = cy - r + p * r * 2;
    ctx.globalAlpha = Math.sin(p * Math.PI) * .6;
    ctx.fillStyle = '#fff0d0'; ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }
  ctx.globalAlpha = 1;
}

/* ---------- Einstellung 1: Entrollen (er schiebt, gibt einen Schubs, der Rest rollt allein) ---------- */
const U0 = 1.6, U1 = 4.2, U2 = 7.2, PUSH = 52;
const unroll = (lt) => lt < U0 ? 0 : lt < U1 ? ease((lt - U0) / (U1 - U0)) * PUSH : lerp(PUSH, MH, 1 - Math.pow(1 - clamp((lt - U1) / (U2 - U1), 0, 1), 2.2));
const HANDS = [MX + 52, MX + MW - 52];

/* ---------- Einstellung 2: der Finger auf der Karte ---------- */
// Fingerspitze in Tischkoordinaten zum Zeitpunkt lt: kommt von oben, folgt dem Weg (Täler, Felder, Dörfer), ruht
function fingerAt(lt) {
  const P = M.path.map(([x, y]) => [x + MX, y + MY]), A = P[0];
  if (lt < 1.4) { const u = ease(lt / 1.4); return [lerp(A[0] + 10, A[0], u), lerp(A[1] - 60, A[1], u)]; }
  const u = clamp((lt - 1.6) / 7.2, 0, 1), e = u * u * (3 - 2 * u), segs = P.length - 1, f = e * segs, k = Math.min(segs - 1, Math.floor(f)), v = f - k;
  const a = P[k], b = P[k + 1], sag = Math.sin(v * Math.PI) * 5 * (k % 2 ? 1 : -1);   // leichter Bogen zwischen den Dörfern
  return [lerp(a[0], b[0], v), lerp(a[1], b[1], v) + sag];
}
function pointerPart(tip) {
  const hx = tip[0] - 6, top = tip[1] - 33;
  return { img: L.point, x: hx, top, from: [hx + 14, top - 44], mirror: false };
}

/* ---------- Einstellung 4: das Fenster der Werkstatt, draußen die Inseln ---------- */
let W4 = null;
const WIN = { x: 70, y: 30, w: 180, h: 104 }, HOR = 96;      // Fensterrahmen innen, Horizont (Bildzeile)
// Blickrichtung von der Werkstattbucht so, dass möglichst viele der anderen drei Inseln im Fenster liegen; dazu ihr Profil
function islandViews() {
  const B = M.peaks[2], others = [M.peaks[0], M.peaks[1], M.peaks[3]];
  const FOV = .62;
  let best = null;
  for (let k = 0; k < 72; k++) {
    const dir = k / 72 * Math.PI * 2;
    const vis = others.filter(Q => Math.abs(angDiff(Math.atan2(Q.y - B.y, Q.x - B.x), dir)) < FOV * .92);
    const score = vis.length * 10 - Math.abs(angDiff(Math.atan2(M.peaks[0].y - B.y, M.peaks[0].x - B.x), dir));
    if (!best || score > best.score) best = { dir, score };
  }
  const dir = best.dir, fx = Math.cos(dir), fy = Math.sin(dir), rx = -fy, ry = fx;
  const views = [];
  for (const Q of others) {
    const dx = Q.x - B.x, dy = Q.y - B.y, depth = dx * fx + dy * fy, lat = dx * rx + dy * ry;
    if (depth <= 1 || Math.abs(Math.atan2(lat, depth)) > FOV) continue;
    // Profil: für jede Spalte quer zur Blickrichtung die größte Höhe über dem Endwasserstand
    const prof = [];
    for (let o = -Q.R * 1.7; o <= Q.R * 1.7; o += .5) {
      let top = 0;
      for (let q = -Q.R * 1.7; q <= Q.R * 1.7; q += .5) {
        const x = Math.round(Q.x + rx * o + fx * q), y = Math.round(Q.y + ry * o + fy * q);
        if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
        const j = y * MW + x;
        if (M.mask[j] >= 0) top = Math.max(top, M.h[j] - SEA_END + .01);
      }
      prof.push([o, top]);
    }
    views.push({ Q, depth, lat, prof });
  }
  return { dir, views: views.sort((a, b) => b.depth - a.depth) };
}
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const PAN = 14;                                              // Fahrt in Einstellung 4 (Pixel); die Ebenen sind so viel breiter
function buildWindowView() {
  const V = islandViews(), cx = WIN.x + WIN.w / 2 + PAN / 2, FOC = 150, HEX = 32;
  const dMin = Math.min(...V.views.map(v => v.depth), 1e9);
  // die nächste Insel höchstens 100 Pixel breit
  const near = V.views.find(v => v.depth === dMin), k = near ? Math.min(1, 100 / (2 * near.Q.R * 1.2 * FOC / dMin)) : 1;
  const w = W + PAN, pb = new PB(w, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    if (y < HOR) { const n = fbm(x / 70, y / 14, 201, 4); pb.set(x, y, step5(SKY, .4 + (1 - y / HOR) * 1.6 + (n - .5) * 2.2 + (y > HOR - 10 ? -.6 : 0), x, y)); }
    else {
      const d = y - HOR, glint = d > 1 && hash(Math.floor(x / (3 + d * .4)), y, 203) < .08 + d * .004;
      pb.set(x, y, glint ? SKY[1] : step5(SEA, .2 + d * .07 + (fbm(x / 30, y / 4, 202, 2) - .5) * 1.2, x, y));
    }
  }
  // Inseln: Silhouette = Höhenprofil derselben Karte (Spalte für Spalte), hinten heller im Dunst; Fels oben, dunkler Fuß
  const isl = [];
  for (const v of V.views) {
    const sc = FOC / v.depth * k, px = cx + Math.tan(Math.atan2(v.lat, v.depth)) * FOC * .9, far = clamp((v.depth - dMin) / 70, 0, 1);
    const col = [mix('#66716f', SKY[1], far * .6), mix('#525d5c', SKY[2], far * .6), mix('#3e4848', SKY[2], far * .5)];
    const P = v.prof, o0 = P[0][0], o1 = P[P.length - 1][0];
    const at = (o) => { const f = (o - o0) / (o1 - o0) * (P.length - 1), i = Math.floor(f); if (i < 0 || i >= P.length - 1) return 0; return lerp(P[i][1], P[i + 1][1], f - i); };
    for (let x = Math.floor(px + o0 * sc); x <= px + o1 * sc; x++) {
      const top = at((x + .5 - px) / sc);
      if (top <= 0) continue;
      const hh = Math.max(1, Math.round(top * HEX * sc));
      for (let y = HOR - hh; y <= HOR; y++) { const l = (y - (HOR - hh)) / (hh + 1); pb.set(x, y, col[l < .3 ? 0 : l < .75 ? 1 : 2]); }
      if (hash(x, 1, 7) < .45) pb.set(x, HOR + 1, '#e4e8e6');   // Brandung am Fuß
    }
    isl.push({ key: v.Q.key, x: px });
  }
  return { sky: pb.canvas(), isl };
}
// Innenraum: Ziegelwand mit Fenster (drei Felder, Sprossen), Fensterbank mit Werkzeug, Lampe aus, Licht fällt herein
function buildRoomWall() {
  const pb = new PB(W + PAN, H), lit = (x, y) => clamp(1 - Math.hypot(x - 160, (y - 80) * 1.2) / 240, 0, 1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W + PAN; x++) {
    const inWin = x >= WIN.x && x < WIN.x + WIN.w && y >= WIN.y && y < WIN.y + WIN.h;
    if (inWin) continue;
    const row = Math.floor(y / 5), off = row % 2 ? 6 : 0, joint = y % 5 === 4 || (x + off) % 13 === 12;
    pb.set(x, y, joint ? step5(BRICK, 3.4 - lit(x, y) * 1.2, x, y) : step5(BRICK, 2.8 - lit(x, y) * 2.2 + (hash(Math.floor((x + off) / 13), row, 7) - .5) * .8, x, y));
  }
  // Rahmen und Sprossen
  const fr = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pb.set(x + i, y + j, c(i, j)); };
  fr(WIN.x - 5, WIN.y - 5, WIN.w + 10, 5, (i, j) => step5(WOOD, 1 + j * .4, i, j));
  fr(WIN.x - 5, WIN.y, 5, WIN.h, (i, j) => step5(WOOD, 1.4 + i * .3, i, j));
  fr(WIN.x + WIN.w, WIN.y, 5, WIN.h, (i, j) => step5(WOOD, 2.2 + i * .3, i, j));
  for (const mx of [WIN.x + 59, WIN.x + 119]) fr(mx, WIN.y, 3, WIN.h, (i, j) => step5(WOOD, 1.2 + i * .8, i, j));
  fr(WIN.x, WIN.y + 50, WIN.w, 2, (i, j) => step5(WOOD, 1.6 + j, i, j));
  // Fensterbank (breit, dunkles Holz), darauf eine Ölkanne, ein Zahnrad, ein Glas mit Schrauben
  fr(WIN.x - 14, WIN.y + WIN.h, WIN.w + 28, 7, (i, j) => step5(WOOD, j === 0 ? .4 : 1.6 + j * .35, i, j));
  fr(WIN.x - 14, WIN.y + WIN.h + 7, WIN.w + 28, H - WIN.y - WIN.h - 7, (i, j) => step5(BRICK, 3.2 + (bay(i, j) - .5), i, j));
  const sill = WIN.y + WIN.h;
  for (let y = sill - 12; y < sill; y++) for (let x = WIN.x + 14; x < WIN.x + 24; x++) pb.set(x, y, step5(IRON, (x - WIN.x - 14) / 3.5, x, y));
  line(pb, WIN.x + 24, sill - 9, WIN.x + 31, sill - 14, IRON[1]);
  for (let a = 0; a < 30; a++) { const an = a / 30 * 6.28, r = a % 2 ? 6 : 4.8; pb.set(Math.round(WIN.x + 150 + Math.cos(an) * r), Math.round(sill - 6 + Math.sin(an) * r), IRON[a % 3 ? 1 : 2]); }
  for (let y = sill - 10; y < sill; y++) for (let x = WIN.x + 120; x < WIN.x + 128; x++) pb.set(x, y, (x === WIN.x + 120 || x === WIN.x + 127) ? '#b8c8c8' : bay(x, y) < .3 ? IRON[1] : '#8aa0a0');
  pb.outline(EDGE);
  return pb.canvas();
}
function renderWindow(ctx, t, push) {
  if (!W4) W4 = Object.assign(buildWindowView(), { wall: buildRoomWall() });
  // langsame Fahrt seitwärts: die Wand zieht vorbei, draußen bewegt sich kaum etwas (Tiefe)
  const ow = Math.round(push * PAN), oo = Math.round(push * PAN * .3);
  ctx.drawImage(W4.sky, -oo, 0);
  // Wolken ziehen langsam (helle Streifen), eine Möwe
  for (let i = 0; i < 3; i++) { const x = ((t * (3 + i) + i * 120) % 420) - 60, y = WIN.y + 8 + i * 9; ctx.fillStyle = 'rgba(232,234,230,.35)'; ctx.fillRect(Math.round(x), y, 40 + i * 12, 2); }
  { const gx = ((t * 9) % 360) - 20, gy = WIN.y + 22 + Math.sin(t * 1.3) * 3, fl = Math.floor(t * 3) % 2; ctx.fillStyle = '#3a3e40'; ctx.fillRect(Math.round(gx), Math.round(gy), 1, 1); ctx.fillRect(Math.round(gx) - 1, Math.round(gy) - fl, 1, 1); ctx.fillRect(Math.round(gx) + 1, Math.round(gy) - fl, 1, 1); ctx.fillRect(Math.round(gx) - 2, Math.round(gy) - 1 + fl, 1, 1); ctx.fillRect(Math.round(gx) + 2, Math.round(gy) - 1 + fl, 1, 1); }
  ctx.drawImage(W4.wall, -ow, 0);
  glow(ctx, 160 - ow, 80, 150, .12, DAY);
}

/* =========================================================
   DIE SZENE
   ========================================================= */
export default {
  id: 'cs_alte_karte',
  title: 'Die alte Karte',
  len: T_END,
  dialog: 'brann_karte',
  setup,
  shots: [
    // Einstellung 1: von oben – Brann entrollt die alte Karte
    { from: 0, to: T_FINGER, draw(ctx, lt, t) {
      ensureMap();
      const rev = unroll(lt);
      renderTable(ctx, t, rev, 1, 0, 0, floodCanvas(0, 0, t));
      const cy = MY + rev + rollR(rev), onRoll = cy + rollR(rev) * .45, hold = MY + PUSH + rollR(PUSH) * 1.45;
      const hy = lt < U0 ? lerp(-14, onRoll, ease(lt / U0)) : lt < U1 ? onRoll : lt < 5 ? hold : lerp(hold, -34, ease((lt - 5) / 1.4));
      if (lt < 6.5) drawArms(ctx, HANDS.map((hx, i) => ({ img: i ? L.handR : L.handL, x: hx, top: hy - 24 + 3, from: [hx + (i ? -13 : 13), Math.min(hy - 61, 10)], mirror: i === 1 })));
      dust(ctx, t, 90, 70, 60, 10);
      vig(ctx, .5);
      black(ctx, 1 - t / 1.8);
    } },
    // Einstellung 2: doppelte Pixelgröße – der Finger fährt über Täler, Felder und Dörfer, die Kamera folgt ihm ruhig
    { from: T_FINGER, to: T_FLOOD, draw(ctx, lt, t) {
      ensureMap();
      const tip = fingerAt(lt), aim = fingerAt(Math.max(1.4, lt));
      const ox = clamp(aim[0] - 80, MX - 10, MX + MW + 10 - 160), oy = clamp(aim[1] - 52, MY - 6, MY + MH + 6 - 90);
      renderTable(ctx, t, MH, 2, ox, oy, floodCanvas(0, 0, t));
      if (lt < 9.4) {
        const back = lt > 8.8 ? ease((lt - 8.8) / .6) * 60 : 0;
        drawArms(ctx, [pointerPart([tip[0], tip[1] - back])], 2, ox, oy);
      }
      dust(ctx, t, 160, 90, 120, 8, 2);
      vig(ctx, .5);
    } },
    // Einstellung 3: die ganze Karte – Sepia-Wasser steigt vom alten Meer her, bis nur die Bergspitzen bleiben
    { from: T_FLOOD, to: T_WIN, draw(ctx, lt, t) {
      ensureMap();
      const u = clamp((lt - 1.2) / 7.4, 0, 1), e = 1 - Math.pow(1 - u, 2.4), lv = e * SEA_END;
      renderTable(ctx, t, MH, 1, 0, 0, floodCanvas(lv, e, t));
      vig(ctx, .45);
    } },
    // Einstellung 4: Schnitt zum Fenster – draußen haben die Inseln genau diese Form; Abblende
    { from: T_WIN, to: T_END, draw(ctx, lt, t) {
      ensureMap();
      renderWindow(ctx, t, ease(lt / 7.4));
      vig(ctx, .5);
      black(ctx, (t - T_FADE) / 1.2);
    } }
  ],
  // Hintergrund des Dialogs: das Fenster mit den Inseln (ohne Fahrt)
  dialogBg(ctx, el, now) {
    ensureMap();
    renderWindow(ctx, now, 1);
    vig(ctx, .5);
  }
};
// Für Tests: Lage der Spitzen auf der Karte (Kartenpixel) und Ausschnitt des Fensters
export const alteKarteInfo = () => { ensureMap(); if (!W4) W4 = Object.assign(buildWindowView(), { wall: buildRoomWall() }); return { key: M.key, peaks: M.peaks.map(p => ({ key: p.key, x: Math.round(p.x), y: Math.round(p.y), R: p.R })), window: W4.isl.map(i => ({ key: i.key, x: Math.round(i.x) })) }; };
