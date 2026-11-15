/* =========================================================
   TAUCH-MINISPIEL: Story-Tauchgang „Pumpwerk“ (seit 0.21.0, Akt 4 nach Leuchtturm Stufe 3)
   Zwei Plätze nacheinander, beide im selben Format wie buildWorld (divegame/world.js): { bg, fg, floor, gy, piles, obj, vents, weeds, seed }
     stage 'gate' – vor dem Pumpwerk: Fassade aus großen Quadern, Bogentor mit zugeschweißtem Eisentor (Naht ∩), Inschrift
                    PUMPWERK, dicke Rohre aus der Wand in den Sand, halb versunkenes Zahnrad. Aufgabe: Tor aufschweißen.
     stage 'hall' – in der riesigen Pumpenhalle: eingestürztes Dach (die Glocke hängt durch das Loch), Bogenfenster,
                    Balancier-Pumpe mit Zylinder, Schwungrad, Rohre an der Wand mit großen Schieberventilen. Die Ventile sind
                    GEWALTSAM zerschlagen (Löcher mit hellen, frischen Bruchkanten, Risse, Dellen von Schlägen, abgebrochene Speichen,
                    verbogene Spindeln, Splitter am Boden), nicht verrostet. Aufgabe: im Schutt das Brecheisen suchen.
   Farben: tiefer und kühler als die normalen Tauchplätze (wenig Licht, nur durch das Dach), Eisen blaugrau, Bronze dunkel.
   ========================================================= */
import { W, H, clamp, lerp, bay, hash, fbm, PB, layer, mix } from '../cutscene/kit.js';
import { glyphText } from '../cutscene/glyphs.js';
import { SAND, STONE, WEED, EDGE, waterAt, ellipse, capsule, line, step, cvOf } from './art.js';
import { buildPile, buildDip, seamOf } from './world.js';

const IRON = ['#9aaab0', '#71838c', '#53646e', '#3a4a54', '#26323a'];      // Eisen im tiefen Wasser
const BRONZE = ['#b4a274', '#8c7c58', '#665c44', '#45402f', '#2c2a22'];    // Ventilgehäuse (dunkle Bronze, kein Rost)
const QUADER = ['#7c929a', '#62787f', '#4b6068', '#384a54', '#27363f'];    // Quadersteine der Fassade
const FLIES = ['#6a7e86', '#56686f', '#43545c', '#32424a'];                // Bodenplatten
const BREAK = '#e4eef0', BREAK2 = '#b6c8cc';                              // frische Bruchkanten (hell, metallisch)
const HOLE = '#060c10';
// Rückwand der Halle: Quader im Wasserdunst (weit weg, bläulich, dunkel)
const HALLQ = ['#5a7884', '#46626e', '#36505c', '#2a414e', '#1e3240', '#152636'];
const DEBRIS = ['#9aa6a8', '#7a8888', '#5c6a6c', '#444f52', '#30393c'];     // Schutt in der Halle (grau statt Sand)
const DEBRIS_J = ['#a8b4b8', '#7c8a90', '#56646c', '#3a464e'];             // herausragende Teile (Eisen, kein Rost)

// tieferes, dunkleres Wasser als die normalen Plätze
const deep = (u, x, y) => waterAt(clamp(u + .14, 0, 1), x, y);

// Boden: fast eben (gepflastert), leichte Sandwehen
function floorLine(seed, base) {
  const gy = new Int16Array(W);
  for (let x = 0; x < W; x++) gy[x] = Math.round(base + Math.sin(x / 37 + seed) * 1.2 + (fbm(x / 20, 1, seed, 2) - .5) * 2);
  return gy;
}
// Bodenpixel: Platten mit Fugen, darüber dünner Sand (Licht von oben)
function floorPix(x, y, gy, seed) {
  const d = y - gy[x];
  const sandy = fbm(x / 18, y / 6, seed + 3, 2) > .55 - d * .03;
  if (sandy && d < 4) return step(SAND, 1.6 + d * .3 + (bay(x, y) - .5) * .4, x, y);
  const joint = (x + (Math.floor(d / 6) % 2) * 11) % 22 === 0 || d % 6 === 5;
  return joint ? FLIES[3] : step(FLIES, .6 + d * .14 + (fbm(x / 9, y / 4, seed + 9, 2) - .5) * 1.2, x, y);
}

/* ---------- Riesiges Zahnrad (Seitenansicht, halb im Sand): Zähne, Speichen, Nabe ---------- */
function gear(pb, cx, cy, r, teeth, pal, seed, broken = 0) {
  for (let y = Math.floor(cy - r - 3); y <= cy + r + 3; y++) for (let x = Math.floor(cx - r - 3); x <= cx + r + 3; x++) {
    const dx = x + .5 - cx, dy = y + .5 - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const tooth = Math.cos(a * teeth) > .25 ? 3 : 0;
    if (d > r + tooth) continue;
    const rim = d > r - 5, hub = d < r * .22, spoke = [0, 1, 2, 3, 4, 5].some(k => { const sa = k / 6 * Math.PI * 2 + .3, q = Math.abs(Math.sin(a - sa)) * d; return q < 2.6 && Math.cos(a - sa) > 0; });
    if (!rim && !hub && !spoke) continue;
    if (broken && a > broken && a < broken + .9 && d > r - 6) continue;   // ein Stück vom Kranz fehlt
    const l = -(dx * .6 + dy * .55) / (r + 3) * 1.6 + 1.6 + (fbm(x / 6, y / 6, seed, 2) - .5) * 1.3 + (rim && d > r ? .6 : 0);
    pb.set(x, y, step(pal, l, x, y));
  }
}
// Riss (Zickzack) mit heller Kante oben links
function crack(pb, x, y, len, ang, seed) {
  let cx = x, cy = y;
  for (let i = 0; i < len; i++) {
    cx += Math.cos(ang) + (hash(i, 1, seed) - .5) * 1.2; cy += Math.sin(ang) + (hash(i, 2, seed) - .5) * 1.2;
    if (!pb.get(cx, cy)) return;
    pb.set(cx, cy, HOLE); if (pb.get(cx - 1, cy - 1)) pb.set(cx - 1, cy - 1, BREAK2);
  }
}
// Delle eines Schlags: dunkle Mulde, heller Rand oben links, Sternrisse
function dent(pb, x, y, seed) {
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const d = Math.hypot(i, j); if (d > 2.3 || !pb.get(x + i, y + j)) continue; pb.set(x + i, y + j, d < 1.2 ? IRON[4] : i + j < 0 ? BREAK2 : IRON[3]); }
  for (let k = 0; k < 3; k++) crack(pb, x, y, 3 + Math.floor(hash(k, 3, seed) * 4), hash(k, 4, seed) * 6.28, seed + k);
}
// Ausgezackte Bruchkante um ein Loch (hole(x, y) → true im Loch): außen heller Rand, innen dunkel
function smash(pb, hole, x0, y0, x1, y1) {
  const q = (x, y) => hole(x, y);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!pb.get(x, y)) continue;
    if (q(x, y)) { pb.set(x, y, (q(x, y - 1) && q(x - 1, y)) ? HOLE : '#16232a'); continue; }
    if (q(x + 1, y) || q(x, y + 1)) pb.set(x, y, BREAK);
    else if (q(x - 1, y) || q(x, y - 1)) pb.set(x, y, BREAK2);
  }
}

/* ---------- Schieberventil mit Handrad, gewaltsam zerschlagen ----------
   (cx, cy) Mitte des Gehäuses auf einem waagerechten Rohr; s Größe; seed; bend Winkel der verbogenen Spindel */
function smashedValve(pb, cx, cy, s, seed, bend = .5) {
  // Gehäuse: Bauch aus Bronze mit Flanschen links und rechts
  ellipse(pb, cx, cy, 9 * s, 8 * s, BRONZE, .05);
  for (const sx of [-1, 1]) {
    for (let y = Math.round(cy - 8 * s); y <= cy + 8 * s; y++) for (let x = 0; x < Math.round(2 * s); x++) pb.set(Math.round(cx + sx * 9 * s) + (sx < 0 ? -x : x), y, step(IRON, 1.4 + (sx > 0 ? 1 : 0) + (y - cy) / (8 * s), x, y));
    for (let k = -2; k <= 2; k++) pb.set(Math.round(cx + sx * (9 * s + s)), Math.round(cy + k * 3 * s), IRON[0]);   // Bolzen
  }
  // Haube oben (Joch) und Spindel – verbogen
  for (let y = Math.round(cy - 13 * s); y < cy - 7 * s; y++) for (let x = Math.round(cx - 4 * s); x <= cx + 4 * s; x++) pb.set(x, y, step(BRONZE, 1 + (x - cx) / (3 * s) + (y < cy - 12 * s ? -.6 : 0), x, y));
  const sx0 = cx, sy0 = cy - 13 * s, L = 13 * s, ex = sx0 + Math.sin(bend) * L, ey = sy0 - Math.cos(bend) * L;
  line(pb, sx0, sy0, sx0 + Math.sin(bend * .3) * L * .45, sy0 - L * .45, IRON[1]);
  line(pb, sx0 + Math.sin(bend * .3) * L * .45, sy0 - L * .45, ex, ey, IRON[1]);
  line(pb, sx0 + 1, sy0, sx0 + 1 + Math.sin(bend * .3) * L * .45, sy0 - L * .45, IRON[3]);
  // Handrad (schräg, weil die Spindel krumm ist): Kranz mit abgeschlagenem Stück, Speichen teils abgebrochen
  const R = 8 * s, miss = hash(1, 1, seed) * 6.28;
  for (let a = 0; a < 80; a++) {
    const an = a / 80 * Math.PI * 2;
    if (Math.abs(((an - miss + 9.42) % 6.28) - 3.14) < .7) continue;   // fehlendes Stück
    const x = ex + Math.cos(an) * R, y = ey + Math.sin(an) * R * .38;
    pb.set(x, y, Math.sin(an) < 0 ? IRON[1] : IRON[3]); pb.set(x, y + 1, IRON[3]);
  }
  // Enden des Kranzes: helle Bruchstellen
  for (const sg of [-1, 1]) { const an = miss + sg * .72; pb.set(ex + Math.cos(an) * R, ey + Math.sin(an) * R * .38, BREAK); }
  for (let k = 0; k < 4; k++) {
    const an = k / 4 * Math.PI * 2 + .4, cut = hash(k, 5, seed) < .5;
    const x1 = ex + Math.cos(an) * R * (cut ? .45 : 1), y1 = ey + Math.sin(an) * R * .38 * (cut ? .45 : 1);
    line(pb, ex, ey, x1, y1, IRON[2]);
    if (cut) pb.set(x1, y1, BREAK);
  }
  // Das Loch: großer, ausgezackter Bruch im Gehäuse, wo es getroffen wurde (nicht ausgefressen wie Rost)
  const hx = cx + (hash(2, 1, seed) - .3) * 4 * s, hy = cy + (hash(2, 2, seed) - .4) * 3 * s, hr = 4.2 * s;
  const hole = (x, y) => { const a = Math.atan2(y + .5 - hy, x + .5 - hx), d = Math.hypot(x + .5 - hx, (y + .5 - hy) * 1.15); return d < hr * (.62 + .5 * Math.abs(Math.sin(a * 3.5 + seed)) + (hash(Math.round(a * 4), 3, seed) - .5) * .3); };
  smash(pb, hole, Math.floor(cx - 10 * s), Math.floor(cy - 9 * s), Math.ceil(cx + 10 * s), Math.ceil(cy + 9 * s));
  // Risse vom Loch aus, Dellen von weiteren Schlägen
  for (let k = 0; k < 5; k++) crack(pb, hx + Math.cos(k * 1.3) * hr, hy + Math.sin(k * 1.3) * hr, 4 + Math.floor(hash(k, 7, seed) * 5 * s), k * 1.3 + (hash(k, 8, seed) - .5), seed + 20 + k);
  for (let k = 0; k < 2; k++) dent(pb, Math.round(cx + (hash(k, 9, seed) - .5) * 12 * s), Math.round(cy + (hash(k, 10, seed) - .5) * 9 * s), seed + 40 + k);
  return { x: hx, y: hy };
}

/* ---------- Bruchstücke am Boden (frisch, hellkantig) ---------- */
function shards(pb, x0, x1, gy, n, seed) {
  for (let i = 0; i < n; i++) {
    const x = Math.round(x0 + hash(i, 1, seed) * (x1 - x0)), y = gy[clamp(x, 0, W - 1)] - 1, w = 2 + Math.floor(hash(i, 2, seed) * 4);
    for (let k = 0; k < w; k++) { pb.set(x + k, y - (k === 1 ? 1 : 0), hash(i, 3, seed) < .5 ? BRONZE[2] : IRON[2]); }
    pb.set(x, y - 1, BREAK); if (w > 3) pb.set(x + w - 1, y, BREAK2);
  }
}

/* =========================================================
   1) VOR DEM PUMPWERK: Fassade mit Bogentor
   ========================================================= */
const FAC_X = 178;                  // linke Kante der Fassade
function buildGate(o) {
  const seed = o.seed, gy = floorLine(seed, 153), G = o.gate;
  const gx = 238, gw = G.w, gh = G.h, gbot = Math.min(...Array.from({ length: gw + 8 }, (_, i) => gy[gx - gw / 2 - 4 + i])) - 1, gtop = gbot - gh;
  const archR = gw / 2 + 7, archY = gtop + 4;
  // Hintergrund: Wasser, Fassade (Quader, Lisenen, Rundfenster, Bogen mit Keilsteinen, Inschrift), Boden
  const pb = new PB(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y >= gy[x]) { pb.set(x, y, floorPix(x, y, gy, seed)); continue; }
    pb.set(x, y, deep(.04 + y / H * .7 + (fbm(x / 60, y / 30, seed, 2) - .5) * .1, x, y));
    if (x < FAC_X) continue;
    // Quader: Lagen von 9 px, versetzte Fugen; links eine Lisene (vorspringend, heller)
    const row = Math.floor(y / 9), off = (row % 2) * 13, joint = y % 9 === 0 || (x + off) % 26 === 0;
    const pil = x < FAC_X + 10, l = 1.5 + (pil ? -.7 : 0) + (x - FAC_X) / 260 + (hash(Math.floor((x + off) / 26), row, seed) - .5) * .8 + (fbm(x / 12, y / 12, seed + 4, 2) - .5) * .9;
    pb.set(x, y, joint ? QUADER[4] : step(QUADER, l, x, y));
    if (x === FAC_X + 10) pb.set(x, y, QUADER[4]);
  }
  // Rundfenster oben (dunkel, Gitter)
  for (const [wx, wy] of [[212, 34], [266, 34], [304, 30]]) for (let y = wy - 8; y <= wy + 8; y++) for (let x = wx - 8; x <= wx + 8; x++) {
    const d = Math.hypot(x - wx, y - wy);
    if (d < 6) pb.set(x, y, (x === wx || y === wy) ? IRON[3] : HOLE); else if (d < 8) pb.set(x, y, QUADER[d < 7 ? 1 : 3]);
  }
  // Bogen über dem Tor: Keilsteine, dunkle Laibung
  for (let y = archY - archR - 6; y <= gbot; y++) for (let x = gx - archR - 6; x <= gx + archR + 6; x++) {
    const dy = Math.min(0, y - archY), d = Math.hypot(x - gx, dy);
    if (d <= archR + 6 && d > archR) { const a = Math.atan2(dy, x - gx), k = Math.floor((a + Math.PI) / (Math.PI / 9)); pb.set(x, y, (d > archR + 5 || Math.abs(((a + Math.PI) / (Math.PI / 9)) - k - .5) > .44) ? QUADER[4] : step(QUADER, .6 + (k % 2) * .5 + (x > gx ? .8 : 0), x, y)); }
    else if (d <= archR) pb.set(x, y, '#0c161c');
  }
  // Inschrift im Sturz: PUMPWERK, eingemeißelt (dunkel, Unterkante hell)
  const txt = 'PUMPWERK', tw = txt.length * 4 - 1, ty = archY - archR - 15;
  for (let y = ty - 3; y < ty + 8; y++) for (let x = gx - tw / 2 - 4; x < gx + tw / 2 + 4; x++) pb.set(x, y, step(QUADER, .4 + (bay(x, y) - .5), x, y));
  glyphText((x, y) => { pb.set(x, y, QUADER[4]); if (!pb.get(x, y + 1) || pb.get(x, y + 1) !== QUADER[4]) pb.set(x, y + 1, QUADER[0]); }, txt, Math.round(gx - tw / 2), ty, QUADER[4]);
  // Rohre aus der Fassade nach links, dann in den Sand
  const pipe = (y, r, bendX) => {
    for (let x = bendX; x < FAC_X + 2; x++) for (let j = -r; j <= r; j++) { const u = j / r; pb.set(x, y + j, step(IRON, 1.6 + u * 1.5 - (1 - u * u) * .5 + ((x - bendX) % 34 < 3 ? -.8 : 0), x, y + j)); }
    for (let x = bendX; x < FAC_X; x += 34) for (let j = -r - 1; j <= r + 1; j++) { pb.set(x, y + j, IRON[j < 0 ? 0 : 3]); if (j % 3 === 0) pb.set(x + 1, y + j, IRON[0]); }
    // Knie nach unten in den Sand
    for (let yy = y - r; yy < gy[bendX] + 2; yy++) for (let x = bendX - 2 * r; x < bendX; x++) {
      const u = (x - (bendX - r)) / r, dd = Math.hypot(x - bendX, yy - (y + r));
      if (yy < y + r && dd > 2 * r) continue;
      pb.set(x, yy, step(IRON, 1.6 + u * 1.5 - (1 - u * u) * .5, x, yy));
    }
  };
  pipe(104, 7, 64); pipe(130, 5, 110);
  // Wand-Durchführung (Mauerkragen)
  for (const [y, r] of [[104, 7], [130, 5]]) for (let j = -r - 3; j <= r + 3; j++) for (let x = FAC_X; x < FAC_X + 4; x++) pb.set(x, y + j, QUADER[x === FAC_X ? 0 : 2]);
  // Zahnrad links, halb versunken
  gear(pb, 30, gy[30] + 8, 24, 14, IRON, seed + 5, 3.6);
  // Seegras an der Fassade, Muscheln
  for (let i = 0; i < 70; i++) { const x = FAC_X + Math.floor(hash(i, 1, seed) * (W - FAC_X)), y = Math.floor(gy[x] - hash(i, 2, seed) * 30); if (Math.abs(x - gx) > archR + 7 && pb.get(x, y)) pb.set(x, y, hash(i, 3, seed) < .6 ? WEED[2] : '#c8ccc0'); }
  // Boden neu darüber (Rohrknie stecken im Sand)
  for (let x = 0; x < W; x++) for (let y = gy[x]; y < H; y++) pb.set(x, y, floorPix(x, y, gy, seed));
  pb.outline(EDGE);
  const bg = pb.canvas();

  // Das Tor: zwei Eisenflügel mit Plattenstreifen und Nieten, schwerer Riegel; offen: dunkle Halle, ein Rohr und Licht
  const make = (open) => {
    const T = new PB(gw + 2, gh + 2);
    for (let y = 0; y <= gh; y++) for (let x = 0; x <= gw; x++) {
      if (open) { T.set(x, y, x < 3 || y < 3 ? '#04080a' : (y > gh * .55 && y < gh * .62 && x > 6) ? IRON[3] : bay(x, y) < .06 && y > gh - 6 ? IRON[2] : '#0a1418'); continue; }
      const half = x < gw / 2 ? 0 : 1, lx = half ? x - gw / 2 : x, plate = Math.floor(y / 10), rivet = (y % 10 === 2 || y % 10 === 8) && (lx % 6 === 3);
      let l = 1.8 + (half ? .6 : 0) + (lx / (gw / 2)) * .6 + (hash(plate, half, seed) - .5) * .7 + (fbm(x / 7, y / 7, seed + 2, 2) - .5) * .8;
      if (y % 10 === 0) l += 1.1;
      if (x === Math.round(gw / 2) || x === Math.round(gw / 2) - 1) l = 4;
      T.set(x, y, rivet ? IRON[0] : step(IRON, l, x, y));
    }
    if (!open) {   // Querriegel und Ring
      for (let x = 3; x < gw - 3; x++) for (let j = 0; j < 4; j++) T.set(x, Math.round(gh * .5) + j, step(IRON, j === 0 ? .4 : j === 3 ? 3.4 : 2, x, j));
      for (let a = 0; a < 20; a++) T.set(Math.round(gw / 2 + Math.cos(a / 20 * 6.28) * 3), Math.round(gh * .5 + 8 + Math.sin(a / 20 * 6.28) * 3), IRON[1]);
    }
    return cvOf(T, null);
  };
  const box = { x0: gx - gw / 2, y0: gtop, x1: gx + gw / 2, y1: gbot };
  const obj = Object.assign({ kind: 'tor', x: box.x0, y: box.y0, prog: 0, open: false, openT: 0, heat: [], imgClosed: make(false), imgOpen: make(true) }, seamOf(box), { box });
  // Vordergrund: Steine, Rohrbruchstück; Bodenebene: Kleinzeug
  const fl = new PB(W, H), fg = new PB(W, H);
  for (let i = 0; i < 8; i++) { const x = 70 + hash(i, 1, seed + 3) * 100, r = 2 + hash(i, 2, seed + 3) * 3; ellipse(fl, x, gy[Math.floor(x)] + 1, r * 1.4, r, STONE, .1); }
  capsule(fg, 4, gy[10] - 2, 26, gy[26] - 5, 4, 4, IRON.slice(1));
  return {
    gy, piles: [], obj, seed, bg, floor: cvOf(fl), fg: cvOf(fg),
    vents: [{ x: 120, t0: 0 }, { x: 300, t0: 1.7 }],
    weeds: Array.from({ length: 8 }, (_, i) => ({ x: Math.floor(i < 4 ? 40 + i * 30 : FAC_X - 20 + (i - 4) * 4), h: 8 + Math.floor(hash(i, 31, seed) * 12), ph: hash(i, 32, seed) * 6 })).filter(w => Math.abs(w.x - gx) > gw)
  };
}

/* =========================================================
   2) DIE PUMPENHALLE
   ========================================================= */
const ROOF_Y = 30, GAP = [118, 206];          // Dachkante, Loch im Dach (die Glocke hängt hindurch)
function buildHall(o) {
  const seed = o.seed + 7, gy = floorLine(seed, 154);
  const pb = new PB(W, H);
  const light = (x, y) => clamp(1 - Math.hypot((x - 162) * .7, y - 20) / 190, 0, 1);    // Licht fällt durch das Dachloch
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (y >= gy[x]) { pb.set(x, y, floorPix(x, y, gy, seed)); continue; }
    if (y < ROOF_Y && x > GAP[0] + Math.abs(fbm(y / 3, 1, seed, 2) - .5) * 20 && x < GAP[1] - Math.abs(fbm(y / 3, 2, seed, 2) - .5) * 20) { pb.set(x, y, deep(.02 + y / H * .5, x, y)); continue; }   // Loch im Dach: offenes Wasser
    // Rückwand: Ziegel/Quader im Halbdunkel, Pfeiler
    const row = Math.floor(y / 6), off = (row % 2) * 8, joint = y % 6 === 0 || (x + off) % 16 === 0, pier = (x % 106) < 12;
    const l = 3.6 - light(x, y) * 2.6 + (pier ? -.6 : 0) + (hash(Math.floor((x + off) / 16), row, seed) - .5) * .5 + (fbm(x / 14, y / 10, seed + 4, 2) - .5) * .8 + (y > 120 ? (y - 120) * .02 : 0);
    pb.set(x, y, joint && !pier ? HALLQ[clamp(Math.round(l) + 1, 0, 5)] : step(HALLQ, l, x, y));
  }
  // Hohe Bogenfenster (Scheiben zerbrochen, dahinter dunkles Wasser), nicht hinter der Glocke
  for (const wx of [53, 271]) for (let y = 40; y < 118; y++) for (let x = wx - 14; x <= wx + 14; x++) {
    const top = 54, dy = Math.min(0, y - top), d = Math.hypot(x - wx, dy * 1);
    if (d > 14) continue;
    if (d > 11.5) { pb.set(x, y, HALLQ[d > 13 ? 5 : 1]); continue; }
    const bar = (x - wx) % 7 === 0 || (y - 40) % 12 === 0;
    pb.set(x, y, bar ? IRON[3] : hash(x >> 2, y >> 2, seed) < .25 ? '#1a3848' : '#0d1e2a');
  }
  // Dachstuhl: eiserne Binder, am Loch abgerissen und nach unten gebogen
  for (let x = 0; x < W; x++) for (let y = ROOF_Y - 4; y < ROOF_Y; y++) if (x < GAP[0] - 2 || x > GAP[1] + 2) pb.set(x, y, step(IRON, 2.2 + (y - ROOF_Y + 4) * .4, x, y));
  for (const [x0, dir] of [[GAP[0] - 2, 1], [GAP[1] + 2, -1]]) for (let k = 0; k < 18; k++) { const x = x0 + dir * k * .8, y = ROOF_Y - 2 + k * k * .06; pb.set(x, y, IRON[2]); pb.set(x, y + 1, IRON[3]); if (k === 17) pb.set(x, y + 1, BREAK); }
  for (let t = 0; t < 2; t++) for (let k = 0; k < 60; k++) { const x = t ? W - k * 1.6 : k * 1.6, y = ROOF_Y + 1 + k * .9; if (y < 70) { pb.set(x, y, IRON[3]); pb.set(x, y + 1, IRON[4]); } }   // Streben zu den Wänden
  // Rohr an der Wand (waagerecht), dazwischen zwei große Schieberventile – zerschlagen
  const PY = 112, PR = 6;
  for (let x = 0; x < W; x++) for (let j = -PR; j <= PR; j++) { const u = j / PR; pb.set(x, PY + j, step(IRON, 2 + u * 1.4 - (1 - u * u) * .6 - light(x, PY) * .8 + (x % 40 < 2 ? -.8 : 0), x, PY + j)); }
  for (let x = 0; x < W; x += 40) for (let j = -PR - 1; j <= PR + 1; j++) pb.set(x, PY + j, IRON[j < 0 ? 1 : 3]);
  const v1 = smashedValve(pb, 104, PY, 1.25, seed + 11, .55), v2 = smashedValve(pb, 222, PY, 1.25, seed + 23, -.7);
  // Rohr zwischen den Ventilen an einer Stelle aufgeschlagen
  const hole2 = (x, y) => Math.hypot((x + .5 - 166) / 1.6, y + .5 - PY + 1) < 3.2 + Math.sin(Math.atan2(y - PY, x - 166) * 4) * .9;
  smash(pb, hole2, 156, PY - PR, 176, PY + PR);
  dent(pb, 150, PY - 2, seed + 61); dent(pb, 182, PY + 2, seed + 62);
  // Schwungrad rechts (groß, hinter dem Boden), ein Stück vom Kranz abgeschlagen
  gear(pb, 292, 150, 40, 0.0001, IRON, seed + 31, 4.1);
  // Balancier-Pumpe links: Zylinder, Säule, Balken schräg (herabgesackt)
  for (let y = 70; y < gy[30]; y++) for (let x = 18; x < 42; x++) pb.set(x, y, step(IRON, 1.4 + (x - 18) / 10 - light(x, y) * .6 + (y % 14 === 0 ? 1 : 0), x, y));     // Zylinder
  for (let y = 60; y < 70; y++) for (let x = 14; x < 46; x++) pb.set(x, y, step(IRON, 1 + (x - 14) / 14 + (y - 60) * .1, x, y));                                           // Deckel
  for (let k = 0; k < 120; k++) { const x = 24 + k, y = 54 + k * .18; for (let j = 0; j < 5; j++) pb.set(x, y + j, step(IRON, 1 + j * .6 + (k % 30 === 0 ? 1.5 : 0), x, y + j)); }  // Balken
  for (let y = 70; y < gy[86]; y++) for (let x = 82; x < 90; x++) pb.set(x, y, step(IRON, 1.6 + (x - 82) / 3, x, y));                                                     // Säule
  for (let y = 66; y < 76; y++) for (let x = 78; x < 94; x++) if (Math.hypot(x - 86, y - 71) < 5.5) pb.set(x, y, step(BRONZE, 1 + (x - 86) / 4 + (y - 71) / 4, x, y)); // Lager
  dent(pb, 60, 60, seed + 70); dent(pb, 110, 66, seed + 71); crack(pb, 130, 76, 8, 1.3, seed + 72);
  // Splitter unter den Ventilen, Seegras an der Wand
  shards(pb, 84, 128, gy, 7, seed + 80); shards(pb, 200, 244, gy, 7, seed + 81); shards(pb, 150, 182, gy, 4, seed + 82);
  for (let i = 0; i < 50; i++) { const x = Math.floor(hash(i, 1, seed) * W), y = Math.floor(gy[x] - 1 - hash(i, 2, seed) * 24); if (pb.get(x, y) && y > PY + PR + 2) pb.set(x, y, WEED[2]); }
  // Boden neu darüber
  for (let x = 0; x < W; x++) for (let y = gy[x]; y < H; y++) pb.set(x, y, floorPix(x, y, gy, seed));
  pb.outline(EDGE);
  const bg = pb.canvas();

  // Vordergrund: links ein großes zerschlagenes Ventilgehäuse am Bildrand (Anschnitt), rechts ein abgebrochener Rohrflansch
  const fg = new PB(W, H);
  smashedValve(fg, 6, gy[6] - 10, 1.6, seed + 91, .9);
  for (let x = 296; x < W; x++) for (let j = -8; j <= 8; j++) { const u = j / 8; fg.set(x, gy[x] - 9 + j, step(IRON, 1.8 + u * 1.4 - (1 - u * u) * .5, x, j)); }
  for (let j = -10; j <= 10; j++) for (let x = 294; x < 297; x++) fg.set(x, gy[x] - 9 + j, IRON[x === 294 ? 1 : 3]);
  smash(fg, (x, y) => x < 300 && Math.abs(y - (gy[x] - 9)) < 4 + hash(y, 1, seed) * 3, 293, gy[296] - 20, 302, gy[296] + 2);
  const fgc = cvOf(fg);

  // Schutthaufen
  const [lo, hi] = o.piles, R = (a, b = 0) => hash(a, b, seed + 55), n = lo + Math.floor(R(1) * (hi - lo + 1)), tgt = 1 + Math.floor(R(2) * (n - 1));
  const span = 236 / n, wsum = o.junk.reduce((a, j) => a + j.w, 0), piles = [];
  for (let i = 0; i < n; i++) {
    const x = Math.round(46 + (i + .5) * span + (R(3, i) - .5) * span * .25), w = Math.min(span - 4, 26 + Math.floor(R(4, i) * 8)), h = 12 + Math.floor(R(5, i) * 6);
    let kind = i === tgt ? 'target' : R(6, i) < o.cfg.junkChance ? 'junk' : 'none', junk = null;
    if (kind === 'junk') {
      let r = R(7, i) * wsum, J = o.junk[0];
      for (const j of o.junk) { if (r < j.w) { J = j; break; } r -= j.w; }
      junk = { it: J.it, n: J.n[0] + Math.floor(R(8, i) * (J.n[1] - J.n[0] + 1)) };
    }
    piles.push({ x, y: gy[clamp(x, 0, W - 1)], w, h, kind, junk, prog: 0, open: false, openT: 0, dust: 0, img: buildPile(w, h, seed + i * 13, DEBRIS, DEBRIS_J), dip: buildDip(w) });
  }
  return {
    gy, piles, obj: null, seed, bg, fg: fgc, floor: new PB(1, 1).canvas(), hall: true,
    vents: [{ x: v1.x | 0, t0: 0 }, { x: v2.x | 0, t0: 1.4 }],
    weeds: Array.from({ length: 6 }, (_, i) => ({ x: Math.floor(40 + R(30, i) * 240), h: 6 + Math.floor(R(31, i) * 9), ph: R(32, i) * 6 }))
  };
}

// o = { stage: 'gate'|'hall', seed, act, junk, cfg, gate, piles }
export function buildPumpWorld(o) { return o.stage === 'hall' ? buildHall(o) : buildGate(o); }
