/* =========================================================
   CUTSCENE cs_abstieg „Abstieg“ (Akt 3, allererster Tauchgang, direkt vor dem Tauch-Minispiel; ui/divegame.js)
   Nach docs/STORY.md, ruhiger als dort angegeben (Max' Wunsch: jede Einstellung braucht Zeit).
   (1) 0–8 s: Die Glocke sinkt an der Kette unter dem Schiff, die Kamera folgt; die helle Oberfläche wird kleiner und
       bleibt oben zurück, schräge Lichtstrahlen.
   (2) 8–14,5 s: Im Inneren der Glocke, Blick aufs Bullauge: im gewölbten Glas spiegelt sich der Spieler, verzerrt
       (dunkles Haar mit heller Strähne, grüner Mantelkragen mit Messingknöpfen), dahinter das dunkle Wasser.
   (3) 14,5–20,5 s: Ein Fischschwarm teilt sich vor der sinkenden Glocke und ihrem Licht.
   (4) 20,5–28 s: Langsamer Schwenk über das versunkene Dorf: ein Dach, der Glockenturm, eine Straße mit Laternen.
   (5) 28–35,4 s: Die Lampe der Glocke streift einen Wegweiser „Zu den Bergdörfern“, Abblende.
   Kein Dialog (dialog: null): danach blendet das Minispiel aus dem Schwarz auf. Branns Satz kommt nach dem Tauchgang.
   Unterwasser-Bausteine (Glocke, Strahlen, Fische, Teilchen) teilt sich die Szene mit dem Minispiel (divegame/art.js).
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, fbm, PB, layer, canvas, glow, black, vignette as makeVignette, mix, shadeE, eyePair, brow, mouth } from '../cutscene/kit.js';
import { glyphText } from '../cutscene/glyphs.js';
import { art, drawRays, drawMotes, drawBell, drawChain, WATER, BRASS, LEAD, STONE, BRICK, WEED, EDGE, capsule, ellipse, line, step, waterAt } from '../divegame/art.js';

const T_EYE = 8, T_FISH = 14.5, T_TOWN = 20.5, T_SIGN = 28, T_FADE = 34, T_END = 35.4;
const LAMP = '255,206,128';

/* ---------- Paletten ---------- */
const SKY = ['#e8f0e8', '#cfe2e0', '#b2d2d4'];
const HULL = ['#6a5844', '#4e4234', '#362e26', '#221e1a'];
const DEEP = ['#2a6e86', '#1f5872', '#17445e', '#11344c', '#0c263a', '#081a2a', '#05111c'];   // tieferes Wasser (Szene 3–5)
const RUIN = ['#5e8a90', '#476e7a', '#355866', '#264454', '#1a3242', '#102230'];               // Stein unter Wasser
const ROOF = ['#7e6a5e', '#62544e', '#4a4242', '#343238', '#22242c'];                          // Dachziegel (Farbe vom Wasser geschluckt)
const WOOD = ['#6a6656', '#504e46', '#3a3c38', '#282c2c'];
const LIT = (c, k) => mix(c, '#ffd9a0', k);   // k: wie stark                                                    // Farbe im Lampenlicht
// Spieler (wie im Prolog und in cs_licht_im_wind)
const SKIN = ['#efc9ae', '#d8a98c', '#b9876d', '#8e604e'];
const HAIR_D = ['#4a3628', '#33251b', '#241a12'];
const HAIR_L = ['#f6f2e6', '#ddd5bf', '#bcb39b'];
const COAT = ['#4a7a58', '#365f45', '#264a35', '#183224'];
const BRASSB = ['#f0cc6a', '#c8963a', '#8a6024'];

let L = null;

/* =========================================================
   (1) Abstieg: hohe Ebene mit Himmel, Oberfläche, Schiff, Wassersäule
   ========================================================= */
const COL_H = 560, SURF = 44;
function buildColumn() {
  const water = layer(W, COL_H, (x, y) => {
    if (y < SURF - 2) { const u = y / SURF; return SKY[clamp(Math.round(u * 2 + (bay(x, y) - .5) * .8), 0, 2)]; }
    const u = (y - SURF) / (COL_H - SURF), wv = Math.sin(x / 9 + Math.sin(x / 23) * 2) * 1.2;
    if (y < SURF + 1 + wv) return '#d8fff4';                                                      // Wasserlinie
    if (y < SURF + 5 + wv) return bay(x, y) < .5 ? '#9ef0e2' : WATER[0];                          // Unterseite der Oberfläche (hell)
    return waterAt(clamp(u * 1.25, 0, 1) * .95 + (fbm(x / 50, y / 40, 4, 2) - .5) * .1, x, y);
  });
  // Rumpf eines Schiffs an der Oberfläche (Silhouette mit Planken), Kran am Heck
  const hull = new PB(170, 46);
  for (let y = 0; y < 30; y++) {
    const half = 78 - Math.pow(y / 30, 1.7) * 52, cx = 85;
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      const pl = Math.floor(y / 5), seam = y % 5 === 0;
      hull.set(x, y + 14, seam ? HULL[3] : step(HULL, 1 + y / 14 + (x - cx) / 160 + (hash(pl, x >> 4, 3) - .5) * .5, x, y));
    }
  }
  for (let x = 4; x < 166; x++) for (let y = 10; y < 14; y++) hull.set(x, y, y === 10 ? HULL[0] : HULL[1]);   // Reling
  for (let y = 0; y < 14; y++) { hull.set(132, y, WOOD[1]); hull.set(133, y, WOOD[2]); }                     // Kranpfosten
  line(hull, 132, 1, 152, 4, WOOD[2]);
  // Seegras und Muscheln am Kiel (unter Wasser)
  for (let i = 0; i < 20; i++) { const x = 20 + Math.floor(hash(i, 1, 9) * 130), y = 40 + Math.floor(hash(i, 2, 9) * 4); hull.set(x, y, hash(i, 3, 9) < .5 ? WEED[1] : '#c8d0c0'); }
  hull.outline('#1a1612');
  return { water, hull: hull.canvas() };
}
function renderDescent(ctx, t) {
  const u = ease(clamp((t - 1.8) / (T_EYE - 2.2), 0, 1)), camY = lerp(0, COL_H - H, u);
  ctx.drawImage(L.col.water, 0, Math.round(-camY));
  // Lichtstrahlen fallen von der Oberfläche schräg ins Wasser; je tiefer, desto schwächer
  ctx.save(); ctx.translate(0, Math.round(-camY + SURF)); drawRays(ctx, t, .28 * (1 - u * .5)); ctx.restore();
  const hy = Math.round(-camY + SURF - 26);
  ctx.drawImage(L.col.hull, 60, hy);
  // Kette vom Kran, Glocke sinkt etwas schneller als die Kamera (wird im Bild langsam tiefer)
  const by = Math.round(lerp(SURF + 30, 112, ease(clamp((t - .4) / (T_EYE - 1), 0, 1))) - Math.min(camY, 0));   // Glocke im Bild: sinkt erst, dann folgt die Kamera
  drawChain(ctx, 212, hy + 4, by + 2);
  drawBell(ctx, 212, by, t, true);
  glow(ctx, 212, by + 26, 34, .25, LAMP);
  // Blasen, die von der Glocke aufsteigen
  for (let i = 0; i < 14; i++) {
    const k = ((t * .7 + hash(i, 1, 21)) % 1), x = 212 + (hash(i, 2, 21) - .5) * 30 + Math.sin(t * 2 + i) * 2, y = by + 36 - k * 90;
    if (y < hy + 40) continue;
    ctx.fillStyle = 'rgba(220,252,246,.8)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    if (i % 3 === 0) { ctx.fillRect(Math.round(x) + 1, Math.round(y) - 1, 1, 1); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 1, 1); }
  }
  drawMotes(ctx, t, 50, 7, camY * .6);
}

/* =========================================================
   (2) Bullauge von innen mit der verzerrten Spiegelung des Spielers
   ========================================================= */
const PCX = 168, PCY = 88, PR = 58;   // Bullauge (Glas) im Bild
// Gesicht des Spielers (von vorn, leicht gedreht), 72×80: dunkles Haar, helle Strähne, grüner Mantelkragen, Messingknöpfe
function buildFace() {
  const pb = new PB(72, 80);
  // Mantel mit hohem Kragen und Knöpfen
  for (let y = 54; y < 80; y++) for (let x = 0; x < 72; x++) {
    const nx = (x + .5 - 36) / 34, ny = (y + .5 - 96) / 44;
    if (nx * nx + ny * ny > 1) continue;
    let l = -nx * .7 + (bay(x, y) - .5) * .3 + .05;
    if (Math.abs(x - 36) < 3 + (y - 54) * .25) l -= 1.4;   // Ausschnitt (dunkel, Hemd)
    pb.set(x, y, COAT[clamp(Math.round(1.5 - l * 1.5), 0, 3)]);
  }
  for (let y = 56; y < 80; y++) for (let x = 0; x < 72; x++) if (Math.abs(x - 36) < 2 + (y - 56) * .22 && Math.abs(x - 36) > (y - 56) * .1) pb.set(x, y, y > 66 ? '#d8d0bc' : '#bab09a');   // Hemd
  for (const [bx, by] of [[27, 66], [26, 74]]) { pb.rect(bx, by, 3, 3, BRASSB[1]); pb.set(bx, by, BRASSB[0]); pb.set(bx + 2, by + 2, BRASSB[2]); }
  // Kragen hoch (zwei Spitzen)
  for (let y = 50; y < 62; y++) { const w = (62 - y) * .5; for (let x = Math.round(20 - w); x <= 24; x++) pb.set(x, y, COAT[x < 21 ? 1 : 0]); for (let x = 48; x <= Math.round(52 + w); x++) pb.set(x, y, COAT[x > 51 ? 2 : 1]); }
  // Hals, Ohren, Gesicht
  for (let y = 46; y < 58; y++) for (let x = 29; x < 43; x++) pb.set(x, y, SKIN[x < 33 ? 2 : 3]);
  shadeE(pb, 20.5, 37, 3, 4.6, SKIN); shadeE(pb, 51.5, 37, 3, 4.6, SKIN, { bias: -.3 });
  shadeE(pb, 36, 35, 15, 18, SKIN, { noise: .12, seed: 5, bias: .1 });
  // Bartschatten an Kinn und Wangen
  for (let y = 40; y < 54; y++) for (let x = 23; x < 50; x++) { const c = pb.get(x, y); if (c && SKIN.includes(c) && y > 44 + Math.abs(x - 36) * .05 && bay(x, y) < .14 && Math.abs(x - 36) > 2 + (y < 49 ? 6 : 0)) pb.set(x, y, SKIN[2]); }
  // Augen, Brauen, Nase, Mund
  eyePair(pb, { y: 35, skin: SKIN, list: [{ x: 27, w: 5, row: 'WIPIW' }, { x: 40, w: 5, row: 'WIPIW' }], iris: '#4a6a5a', lash: '#2e2018' }, 0);
  brow(pb, 26, 32, 31, true, 0, HAIR_D); brow(pb, 40, 46, 31, false, 0, HAIR_D);
  for (let y = 36; y < 44; y++) pb.set(36 + (y > 41 ? 1 : 0), y, SKIN[2]);
  pb.rect(35, 44, 4, 1, SKIN[3]);
  mouth(pb, 33, 48, 7, 0, { line: '#7a4636' });
  // Haar: dunkel, oben voll, über die Stirn; die helle Strähne fällt vorn links über die Stirn
  for (let y = 12; y < 36; y++) for (let x = 16; x < 57; x++) {
    const nx = (x + .5 - 36) / 21, ny = (y + .5 - 28) / 17, d = nx * nx + ny * ny;
    if (d > 1) continue;
    const fore = 25 + Math.abs(nx) * 9 - (hash(x >> 1, 2, 7) - .5) * 4;   // Stirn-Haarlinie (gezackt)
    if (y > fore && Math.abs(nx) < .74) continue;
    const st = Math.sin(x * .9 + y * .35) * .5 + nx * .8;
    pb.set(x, y, HAIR_D[clamp(Math.round(1 + st), 0, 2)]);
  }
  for (let i = 0; i < 40; i++) {   // helle Strähne: vom Scheitel links schräg über die Stirn bis zur rechten Braue, oben breit
    const u = i / 39, x = 25 + u * 16 + Math.sin(u * 3.1) * 1.5, y = 14 + u * 15 - Math.sin(u * 3.1) * 2, w = 3.2 - u * 2.2;
    for (let k = -w; k <= w; k += .5) { const X = Math.round(x + k * .45), Y = Math.round(y + k); if (pb.get(X, Y)) pb.set(X, Y, HAIR_L[k < -w * .3 ? 0 : k > w * .4 ? 2 : 1]); }
  }
  return pb;
}
// Inneres der Glocke: Messingwand im Lampenlicht, das Bullauge mit Bolzenkranz
function buildCabin() {
  const wall = layer(W + 40, H + 30, (x, y) => {
    const d = Math.hypot(x - 60, y - 160) / 260, l = d * 3.2 + (fbm(x / 20, y / 14, 3, 3) - .5) * 1.2;
    const rv = (y % 26 === 8) && (x % 7 === 2);   // Nietreihen
    return rv ? BRASS[4] : step(['#b0803e', '#8a6030', '#6a4a26', '#4c341c', '#30200f', '#1c1208'], l, x, y);
  });
  const ring = new PB(2 * (PR + 16), 2 * (PR + 16)), c = PR + 16;
  for (let y = 0; y < 2 * c; y++) for (let x = 0; x < 2 * c; x++) {
    const d = Math.hypot(x + .5 - c, y + .5 - c);
    if (d < PR || d > PR + 14) continue;
    const nx = (x + .5 - c) / d, ny = (y + .5 - c) / d, rim = (d - PR) / 14;
    const l = 1.5 + (nx * .7 + ny * .6) * (rim < .5 ? -1.2 : 1.4) + (bay(x, y) - .5) * .7;
    ring.set(x, y, d < PR + 2 ? BRASS[4] : BRASS[clamp(Math.round(l), 0, 4)]);
  }
  for (let i = 0; i < 10; i++) {   // Bolzen
    const a = i / 10 * Math.PI * 2 + .3, bx = c + Math.cos(a) * (PR + 8), by = c + Math.sin(a) * (PR + 8);
    shadeE(ring, bx, by, 2.6, 2.6, [BRASS[0], BRASS[1], BRASS[3], BRASS[4]]);
  }
  ring.outline('#140c06');
  return { wall, ring: ring.canvas() };
}
// Glas: draußen dunkles Wasser (Strahl, Teilchen), darüber die Spiegelung (gewölbt, gespiegelt, leicht wabernd)
function renderPort(ctx, t, lt, zoom) {
  const cx = PCX, cy = PCY, R = PR * zoom;
  const im = ctx.getImageData(0, 0, W, H), d = im.data, F = L.face, fw = F.w, fh = F.h;
  const see = clamp((lt - .8) / 2, 0, 1) * (.8 + Math.sin(lt * .9) * .06) - clamp((lt - 5.4) / 1.1, 0, 1) * .45;   // Spiegelung taucht auf, atmet leicht, verblasst am Ende
  for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(H, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(W, cx + R); x++) {
    const dx = (x + .5 - cx) / R, dy = (y + .5 - cy) / R, r = Math.hypot(dx, dy);
    if (r >= 1) continue;
    // Wasser hinter dem Glas: dunkel, ein schwacher Lichtstrahl, Schwebeteilchen
    const beam = Math.max(0, 1 - Math.abs(dx + dy * .4 - .25 + Math.sin(t * .3) * .05) / .22) * (1 - dy) * .5;
    let col = DEEP[clamp(Math.round(3.2 + dy * 2 - beam * 3 + (bay(x, y) - .5) * .8), 0, 6)];
    if (hash(x + Math.floor(t * 4), y + Math.floor(t * 9), 77) < .004) col = '#8ad0cc';
    // Spiegelung: Fischauge (Mitte vergrößert, Rand gestaucht), waagerecht gespiegelt, wabert
    const k = Math.pow(r, .6) * 1.05, wob = Math.sin(dy * 9 + t * 1.6) * .025;   // gewölbtes Glas: Mitte vergrößert, Rand gestaucht
    const sx = Math.floor(((-dx * k + wob) * .5 + .5) * fw), sy = Math.floor((dy * k * .52 + .46) * fh);
    const fc = sx >= 0 && sy >= 0 && sx < fw && sy < fh ? F.p[sy * fw + sx] : null;
    const a = see * (1 - Math.pow(r, 5));
    if (fc && a > .05 && (a > .55 || bay(x, y) < a * 1.6)) col = mix(mix(fc, '#ffd9a0', .2), '#1e5468', .18 + (1 - a) * .35);   // vom Lampenlicht warm, vom Wasser kühl
    // Glanz auf dem Glas (Bogen oben links) und dunkler Rand
    const arc = Math.abs(r - .8) < .035 && dx < -.1 && dy < -.15;
    if (arc && bay(x, y) < .7) col = '#cdeee8';
    if (r > .94) col = '#071420';
    const i = (y * W + x) * 4, [rr, gg, bb] = hexRgb(col);
    d[i] = rr; d[i + 1] = gg; d[i + 2] = bb;
  }
  ctx.putImageData(im, 0, 0);
}
const RGB = new Map();
function hexRgb(c) { let v = RGB.get(c); if (!v) { v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; RGB.set(c, v); } return v; }
function renderEye(ctx, t, lt) {
  const z = 1 + ease(clamp(lt / 6.5, 0, 1)) * .1, ox = -20 * (z - 1) * 4, oy = -10 * (z - 1) * 4;
  ctx.drawImage(L.cabin.wall, Math.round(-20 + ox), Math.round(-12 + oy));
  // Lampe links unten im Bild: warmer Schein auf dem Messing, flackert leicht
  const fl = .9 + Math.sin(t * 7) * .04 + Math.sin(t * 13) * .03;
  glow(ctx, 40, 170, 150, .35 * fl, LAMP);
  renderPort(ctx, t, lt, z);
  const rs = L.cabin.ring, s = z;
  ctx.drawImage(rs, Math.round(PCX - rs.width * s / 2), Math.round(PCY - rs.height * s / 2), Math.round(rs.width * s), Math.round(rs.height * s));
  glow(ctx, PCX - 40, PCY + 50, 70, .12 * fl, LAMP);
  ctx.globalAlpha = .7; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1;
}

/* =========================================================
   (3) Fischschwarm weicht der sinkenden Glocke aus
   ========================================================= */
const SCHOOL = Array.from({ length: 64 }, (_, i) => ({ ox: hash(i, 1, 41) * 150, oy: (hash(i, 2, 41) - .5) * 40 + Math.sin(hash(i, 1, 41) * 6) * 8, ph: hash(i, 3, 41) * 6.3, big: hash(i, 4, 41) < .3 }));
function renderFish(ctx, t, lt) {
  ctx.drawImage(L.mid, 0, 0);
  drawRays(ctx, t, .14);
  const by = lerp(-46, 112, ease(clamp(lt / 5.6, 0, 1))), bx = 168;
  // Fische: Schwarm zieht nach links, weicht dem Licht der Glocke aus (stärker, je näher)
  const A = art();
  for (const f of SCHOOL) {
    let x = 300 - lt * 16 - f.ox + Math.sin(t * 1.4 + f.ph) * 3, y = 100 + f.oy + Math.sin(t + f.ph) * 2;
    const ex = x - bx, ey = y - (by + 28), d = Math.hypot(ex, ey), push = Math.max(0, 1 - d / 64);
    x += ex / (d || 1) * push * 46; y += ey / (d || 1) * push * 30;
    const sp = A.fish[0][f.big ? 1 : 0];
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(sp, -Math.round(x) - sp.width, Math.round(y)); ctx.restore();
  }
  drawChain(ctx, bx, 0, by + 2);
  // Glocke näher: doppelt so groß
  const c = canvas(1, 1); void c;
  ctx.save(); ctx.translate(bx, by); ctx.scale(2, 2); drawBell(ctx, 0, 0, t, true); ctx.restore();
  glow(ctx, bx, by + 70, 70, .3, LAMP);
  glow(ctx, bx, by + 50, 26, .35, LAMP);
  drawMotes(ctx, t, 60, 11);
  ctx.globalAlpha = .6; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1;
}

/* =========================================================
   (4) Versunkenes Dorf: Dach, Glockenturm, Straße (breite Ebene, Schwenk nach rechts)
   (5) Wegweiser im Lampenlicht
   Jede Ebene zweimal: dunkel (Tiefe) und im Lampenlicht; das Licht legt die helle Fassung dithernd darüber.
   ========================================================= */
const TOWN_W = 560, GROUND = 150;
function townPixel(x, y, lit) {
  const k = lit ? .62 : 0, sh = (c) => lit ? LIT(c, k) : c;
  // Straße mit Pflaster
  if (y >= GROUND) {
    const cx = (x + (Math.floor(y / 4) & 1) * 3) % 7, mort = cx === 0 || y % 4 === 0;
    return sh(mort ? RUIN[5] : step(RUIN.slice(1), 1.2 + (y - GROUND) * .08 + (hash(x >> 3, y >> 2, 5) - .5) * .8, x, y));
  }
  return null;
}
function buildTown(lit) {
  const pb = new PB(TOWN_W, H);
  const S = (c) => lit ? LIT(c, .62) : c;
  // Wasser
  for (let y = 0; y < H; y++) for (let x = 0; x < TOWN_W; x++) pb.set(x, y, lit ? LIT(DEEP[clamp(Math.round(2 + y / 60 + (bay(x, y) - .5) * .7), 0, 6)], .32) : DEEP[clamp(Math.round(2.4 + y / 55 + (bay(x, y) - .5) * .7), 0, 6)]);
  for (let y = GROUND; y < H; y++) for (let x = 0; x < TOWN_W; x++) pb.set(x, y, townPixel(x, y, lit));
  // Häuser: Mauern, Fenster, Dächer mit Ziegeln (eins eingestürzt)
  const house = (x0, w, h, roofH, broken) => {
    const yb = GROUND, yt = yb - h;
    for (let y = yt; y < yb; y++) for (let x = x0; x < x0 + w; x++) {
      const row = Math.floor(y / 4), mort = y % 4 === 0 || (x + (row & 1) * 4) % 8 === 0;
      const win = ((x - x0 - 5) % 14 < 6) && (x - x0 > 3) && (x0 + w - x > 4) && (y - yt) % 22 > 5 && (y - yt) % 22 < 15;
      pb.set(x, y, win ? S(DEEP[6]) : S(mort ? RUIN[4] : step(RUIN, 1.4 + (x - x0) / w * 1.2 + (hash(row, x >> 3, 3) - .5) * .7, x, y)));
    }
    for (let y = yt - roofH; y < yt + 2; y++) {
      const half = (y - (yt - roofH)) / roofH * (w / 2 + 4);
      for (let x = Math.round(x0 + w / 2 - half); x <= x0 + w / 2 + half; x++) {
        if (broken && x > x0 + w * .55 && y < yt - roofH * .2 + hash(x >> 1, 1, 9) * 8) continue;   // Loch im Dach
        const row = Math.floor((y - yt + roofH) / 3), tile = (x + (row & 1) * 2) % 5 === 0;
        pb.set(x, y, S(tile ? ROOF[4] : step(ROOF, .6 + (x - x0) / w * 1.6 + (row % 2) * .3, x, y)));
      }
    }
    if (broken) for (let i = 0; i < 6; i++) { const bx = x0 + w * .6 + hash(i, 1, 7) * w * .3, by = yt - roofH * .4 + hash(i, 2, 7) * roofH * .5; line(pb, bx, by, bx + 2, by + 4, S(WOOD[2])); }   // Dachlatten
  };
  house(10, 60, 44, 26, false);
  house(84, 48, 36, 22, true);
  // Glockenturm mit Glocke im offenen Glockenstuhl, Spitzdach
  const tx = 156, tw = 34, tt = 26;
  for (let y = tt + 34; y < GROUND; y++) for (let x = tx; x < tx + tw; x++) {
    const row = Math.floor(y / 5), mort = y % 5 === 0 || (x + (row & 1) * 5) % 10 === 0;
    pb.set(x, y, S(mort ? RUIN[4] : step(RUIN, 1.1 + (x - tx) / tw * 1.4 + (hash(row, x >> 3, 4) - .5) * .6, x, y)));
  }
  for (let y = tt + 14; y < tt + 34; y++) for (let x = tx; x < tx + tw; x++) {   // Glockenstuhl: Bogenöffnung
    const ox = x - tx - tw / 2, open = Math.abs(ox) < 9 && (y > tt + 18 + Math.max(0, 9 - Math.sqrt(Math.max(0, 81 - ox * ox))) * .9);
    pb.set(x, y, open ? S(DEEP[5]) : S(step(RUIN, 1.2 + (x - tx) / tw * 1.4, x, y)));
  }
  shadeE(pb, tx + tw / 2, tt + 26, 6, 6, [S(BRASS[2]), S(BRASS[3]), S(BRASS[4]), S('#2a1a0a')], { clip: (x, y) => y < tt + 30 });   // alte Glocke
  for (let y = tt - 18; y < tt + 14; y++) {   // Spitzdach
    const half = (y - tt + 18) / 32 * (tw / 2 + 4);
    for (let x = Math.round(tx + tw / 2 - half); x <= tx + tw / 2 + half; x++) pb.set(x, y, S(step(ROOF, .5 + (x - tx) / tw * 1.8 + (Math.floor(y / 3) % 2) * .3, x, y)));
  }
  for (let y = tt - 30; y < tt - 18; y++) pb.set(tx + tw / 2, y, S(LEAD[1]));   // Kreuz/Wetterfahne
  pb.rect(tx + tw / 2 - 3, tt - 26, 7, 1, S(LEAD[1]));
  // Straße: Laternenpfähle, Brunnen, weitere Häuser
  for (const lx of [214, 300, 380]) { for (let y = GROUND - 30; y < GROUND; y++) pb.set(lx, y, S(LEAD[2])); pb.rect(lx - 2, GROUND - 34, 5, 5, S(LEAD[1])); pb.rect(lx - 1, GROUND - 33, 3, 3, S('#2c4a50')); }
  house(232, 54, 40, 24, false);
  house(400, 64, 48, 28, true);
  house(476, 50, 34, 20, false);
  // Wegweiser an der Straßenecke (für Einstellung 5): Pfahl mit zwei Brettern, Schrift im Licht
  const sx = 336;
  for (let y = GROUND - 46; y < GROUND; y++) { pb.set(sx, y, S(WOOD[1])); pb.set(sx + 1, y, S(WOOD[2])); pb.set(sx + 2, y, S(WOOD[3])); }
  const board = (y0, dir, text) => {
    const w = text.length * 4 + 9, x0 = dir > 0 ? sx + 3 : sx - w;
    for (let y = y0; y < y0 + 9; y++) for (let x = x0; x < x0 + w; x++) {
      const tip = dir > 0 ? x - (x0 + w - 5) : (x0 + 5) - x;
      if (tip > 0 && Math.abs(y - y0 - 4) > 4 - tip) continue;   // Pfeilspitze
      pb.set(x, y, S(step(WOOD, .4 + (y - y0) * .25 + (hash(x >> 2, y, 6) - .5) * .7, x, y)));
    }
    glyphText((x, y, c) => pb.set(x, y, c), text, x0 + (dir > 0 ? 3 : 6), y0 + 2, lit ? '#2a1e14' : WOOD[2]);   // im Dunkeln kaum lesbar
    for (let i = 0; i < 6; i++) pb.set(x0 + Math.floor(hash(i, 1, y0) * w), y0 + 8, S(WEED[1]));   // Algen am Brett
  };
  board(GROUND - 44, 1, 'ZU DEN BERGDÖRFERN');
  board(GROUND - 32, -1, 'ZUM HAFEN');
  // Seegras, Steine
  for (let i = 0; i < 40; i++) { const x = Math.floor(hash(i, 1, 13) * TOWN_W), h = 5 + Math.floor(hash(i, 2, 13) * 12); for (let j = 0; j < h; j++) pb.set(x + Math.round(Math.sin(j * .5 + i) * .8), GROUND - j, S(WEED[j > h * .6 ? 0 : 1])); }
  pb.outline(EDGE);
  return pb.canvas();
}
// Lampenlicht als geditherte Maske: Kegel von (lx, ly) nach unten mit Richtung ang, Reichweite len
function lightMask(lx, ly, ang, spread, len, power) {
  const c = L.mask, x = c.getContext('2d'), im = L.maskData, d = im.data;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    const dx = xx - lx, dy = y - ly, along = dx * ca + dy * sa, side = -dx * sa + dy * ca;
    let a = 0;
    if (along > 0) a = Math.max(0, 1 - Math.abs(side) / (along * spread + 6)) * Math.max(0, 1 - along / len);
    a = Math.max(a, Math.max(0, 1 - Math.hypot(dx, dy) / 30) * .9);
    d[(y * W + xx) * 4 + 3] = bay(xx, y) < a * power ? 255 : 0;
  }
  x.putImageData(im, 0, 0);
  return c;
}
function renderTownLit(ctx, camX, lx, ly, ang, spread, len, power) {
  ctx.drawImage(L.town, Math.round(-camX), 0);
  const tmp = L.tmp, tx = tmp.getContext('2d');
  tx.clearRect(0, 0, W, H);
  tx.drawImage(L.townLit, Math.round(-camX), 0);
  tx.globalCompositeOperation = 'destination-in';
  tx.drawImage(lightMask(lx, ly, ang, spread, len, power), 0, 0);
  tx.globalCompositeOperation = 'source-over';
  ctx.drawImage(tmp, 0, 0);
}
function renderTown(ctx, t, lt) {
  const u = ease(clamp(lt / 7.2, 0, 1)), camX = lerp(0, 196, u);
  const lx = 150 + Math.sin(lt * .5) * 10, ly = -6, ang = Math.PI / 2 + Math.sin(lt * .35) * .25;
  renderTownLit(ctx, camX, lx, ly, ang, .55, 210, .75);
  glow(ctx, lx, 20, 80, .18, LAMP);
  drawRays(ctx, t, .08);
  drawMotes(ctx, t, 50, 17);
  // Unterseite der Glocke ragt oben ins Bild
  ctx.save(); ctx.translate(Math.round(lx), -50); ctx.scale(2, 2); drawBell(ctx, 0, 0, t, true); ctx.restore();
  ctx.globalAlpha = .75; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1;
}
function renderSign(ctx, t, lt) {
  // Kamera steht vor dem Wegweiser (2×); das Licht schwenkt von links über das Schild und bleibt darauf
  const s = 2;
  const sw = ease(clamp((lt - .5) / 4.2, 0, 1)), ang = lerp(2.3, 1.45, sw);
  const tmp = L.tmp2, tx = tmp.getContext('2d');
  tx.imageSmoothingEnabled = false;
  tx.clearRect(0, 0, W, H);
  // Bildausschnitt 160×90 der Dorfebene um den Wegweiser, 2× vergrößert
  const sx0 = 290 + Math.round(lt * 1.2), sy0 = GROUND - 70;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(L.town, sx0, sy0, W / s, H / s, 0, 0, W, H);
  tx.drawImage(L.townLit, sx0, sy0, W / s, H / s, 0, 0, W, H);
  tx.globalCompositeOperation = 'destination-in';
  tx.drawImage(lightMask(150, -90, ang, .5, 700, 1.7), 0, 0);
  tx.globalCompositeOperation = 'source-over';
  ctx.drawImage(tmp, 0, 0);
  glow(ctx, 150 + Math.cos(ang) * 160, -90 + Math.sin(ang) * 160, 70, .22, LAMP);
  drawMotes(ctx, t, 40, 23);
  ctx.globalAlpha = .8; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1;
}

/* =========================================================
   STATISCHE EBENEN
   ========================================================= */
function setup() {
  if (L) return;
  art();
  L = {};
  L.col = buildColumn();
  L.face = buildFace();
  L.cabin = buildCabin();
  L.mid = layer(W, H, (x, y) => DEEP[clamp(Math.round(.6 + y / 70 + (fbm(x / 50, y / 30, 8, 2) - .5) * .5 + (bay(x, y) - .5) * .6), 0, 6)]);
  L.town = buildTown(false); L.townLit = buildTown(true);
  L.mask = canvas(W, H); L.maskData = L.mask.getContext('2d').createImageData(W, H);
  for (let i = 0; i < W * H; i++) { const d = L.maskData.data; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; }
  L.tmp = canvas(W, H); L.tmp2 = canvas(W, H);
  L.vig = makeVignette('#03080e', 1.4, .85);
}

export const _debugFace = () => (setup(), L.face.canvas());
export default {
  id: 'cs_abstieg',
  title: 'Abstieg',
  len: T_END,
  dialog: null,
  setup,
  shots: [
    // (1) Die Glocke sinkt, die Oberfläche bleibt oben zurück
    { from: 0, to: T_EYE, draw(ctx, lt, t) { renderDescent(ctx, t); black(ctx, 1 - t / 1.6); black(ctx, (t - (T_EYE - .5)) / .5 * .0); } },
    // (2) Bullauge: die verzerrte Spiegelung
    { from: T_EYE, to: T_FISH, draw(ctx, lt, t) { renderEye(ctx, t, lt); } },
    // (3) Fischschwarm weicht aus
    { from: T_FISH, to: T_TOWN, draw(ctx, lt, t) { renderFish(ctx, t, lt); } },
    // (4) Dach, Glockenturm, Straße
    { from: T_TOWN, to: T_SIGN, draw(ctx, lt, t) { renderTown(ctx, t, lt); } },
    // (5) Wegweiser „Zu den Bergdörfern“, Abblende
    { from: T_SIGN, to: T_END, draw(ctx, lt, t) { renderSign(ctx, t, lt); black(ctx, (t - T_FADE) / (T_END - T_FADE - .1)); } }
  ]
};
