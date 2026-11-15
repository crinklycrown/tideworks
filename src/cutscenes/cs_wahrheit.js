/* =========================================================
   CUTSCENE cs_wahrheit „Die Wahrheit“ (Finale: Leuchtturm Stufe 4 fertig → Entscheidung)
   Zehn Bilder nach docs/STORY.md, ruhiger als dort angegeben (Max' Wunsch: jede Einstellung braucht Zeit, Zeilen zum Lesen).
   Gegenwart in nächtlichen Sturmfarben, Rückblenden (Bild 2–8) in Sepia mit dunklem Rand (sepia() aus cutscene/kit.js).
     1   0–5,5     Gegenwart: ein Sturm zieht auf, der fertige Turm in der Nacht, die Lampe dunkel.
     2   5,5–11,5  Rückblende: Aurel sieht zu, zwei seiner Leute zerschlagen nachts die Ventile im Pumpwerk.
     3a  11,5–18,5 Thronsaal (cutscene/flutnacht.js): der Herrscher von hinten am Kartentisch, Aurel kommt herein und meldet den Ausfall.
     3b  18,5–22,7 näher: der Herrscher dreht sich um – es ist der Spieler (neues Porträt). Danach kurze Stille.
     4   22,7–30,4 über die Schulter des Herrschers: er befiehlt das Feuer, Aurel nickt (Aurels Porträt aus cs_npc_aurel).
     5   30,4–36,4 Aurel und sein Gefolge steigen schweigend auf den Berg; unten die Dörfer mit Lichtern, der Turm an der Küste bleibt dunkel.
     6   36,4–42,8 die Flut wie in cs_flutnacht (flutnacht.js): die Welle rollt übers Land, die Lichter erlöschen.
     7   42,8–49,4 Morgengrauen: Aurel spricht auf dem Berg zu den Überlebenden, neben ihm seine Fahne mit dem Wappen.
     8a  49,4–59,2 Nacht auf dem Berg: der Herrscher stellt Aurel zur Rede; Aurels Wachen gehen auf ihn los.
     8b  59,2–63,4 am Ufer: das Boot (Schattenriss aus cs_prolog) mit dem gefesselten Herrscher wird in den Sturm gestoßen.
     8c  63,4–70,9 der Sturm aus cs_prolog, Bild für Bild: dieselbe Einstellung, derselbe Blitz zur selben Zeit (5 s nach Beginn).
     9   70,9–77,4 Gegenwart: ein Boot mit Laterne (Wappen am Segel) legt am Turm an, Aurel geht hinein.
     10  77,4–83,4 die Lampenkammer: die Fackel in der Hand des Spielers (Ring, grüner Ärmel) vor der dunklen Linse,
                   Aurel im Hintergrund. Das Bild hält an (dialogBg) → Dialog „wahrheit“ → Entscheidung (ui/story.js).
   Dialogzeilen der Rückblenden (data/dialogs/story.js wahrheit_rueck) als kurze Einblendungen (lines, cutscene/player.js).
   Der Herrscher hat erst nach dem Umdrehen ein Porträt (spieler); vorher spricht er nicht.
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, vnoise, fbm, PB, layer, tpl, canvas, mix, vignette as makeVignette, glow, black, sepia } from '../cutscene/kit.js';
import { wappen } from '../cutscene/motifs.js';
import { buildThrone, drawThrone, buildFlood, drawFlood, floodFront, TABLE, FLOOR } from '../cutscene/flutnacht.js';
import { capsule, ellipse, line } from '../divegame/art.js';
import { portrait, spielerView } from '../gfx/portraits.js';
import { DIALOGS, dialogLines } from '../data/dialogs/index.js';
import prolog, { buildBoatSil } from './cs_prolog.js';
import { buildAurelFigure } from './cs_npc_aurel.js';

const T1 = 5.5, T2 = 11.5, T3B = 18.5, T4 = 22.7, T5 = 30.4, T6 = 36.4, T7 = 42.8, T8 = 49.4, T8B = 59.2, T8C = 63.4, T9 = 70.9, T10 = 77.4, T_END = 83.4;
const TURN = 1.3;                         // Bild 3b: so lange von hinten, dann dreht er sich (≈ 0,35 s)

/* ---------- Paletten: Gegenwart (Sturmnacht) ---------- */
const NSKY = ['#6a7698', '#4e5a7c', '#3a4464', '#2a3250', '#1e243c', '#141a2c', '#0c1020'];
const NSEA = ['#56688a', '#3e4e6c', '#2c3854', '#1e283e', '#141c2e', '#0c1220'];
const FOAM = '#c6d2e4';
const ROCK = ['#646474', '#4a4a5a', '#363644', '#26242e', '#17151c'];
const TWHITE = ['#c6cedc', '#9ca6ba', '#747e94', '#4e566c'];
const TRED = ['#a24e58', '#7c3644', '#58242e', '#38141e'];
const COPPER = ['#b47a58', '#8a5a44', '#603e32', '#3e2820'];
const IRON = ['#7a8296', '#565e72', '#3a4054', '#24283a'];
const GLASS = ['#46587a', '#304060', '#1e2a44', '#121a2c'];
const PLANK = ['#7a6a62', '#5a4c48', '#40363a', '#2a2228'];
const BRASS = ['#f8e09a', '#d4a444', '#8a6422', '#4e3614'];
const COAT = ['#4f8260', '#3a6649', '#2a4f38', '#1b3626'];
const SKIN = ['#eec4a4', '#d6a283', '#b07c62', '#7e5442'];
const GOLD = ['#fff2b8', '#e8c35a', '#b8892c', '#6e4a18'];
const WOODT = ['#a8784a', '#7c5634', '#563a22', '#342214'];
const FIRE = '255,170,80', LAMP = '255,200,120';
const EDGE = '#0a0c14';
const step = (r, l, x, y) => r[clamp(Math.round(l + (bay(x, y) - .5) * .9), 0, r.length - 1)];
const pick = (r, l) => r[l > .45 ? 0 : l > .1 ? 1 : l > -.25 ? 2 : 3];

// Figur nachts einfärben: dunkel und kühl, optional Licht von rechts (Fackel) bzw. links
function nightTint(src, a = .55, warm = 0, from = 'right') {
  const c = canvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = `rgba(14,20,44,${a})`; x.fillRect(0, 0, c.width, c.height);
  if (warm > 0) {
    const g = x.createLinearGradient(from === 'right' ? c.width : 0, 0, from === 'right' ? c.width * .35 : c.width * .65, 0);
    g.addColorStop(0, `rgba(255,170,90,${warm})`); g.addColorStop(1, 'rgba(255,170,90,0)');
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  }
  return c;
}
// Schattenriss einer Figur (eine Farbe)
function silhouette(src, col) { const c = canvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c; }
const fig = (c, fn) => { const pb = new PB(c[0], c[1]); fn(pb); pb.outline(EDGE); return pb.canvas(); };

/* =========================================================
   GEGENWART: der fertige Turm (Stufe 4) im Sturm
   ========================================================= */
// Turm (Seitenansicht) in einen PB: Fuß bei (cx, yb), s = Maßstab (1 = weite Einstellung)
function drawTower(pb, cx, yb, s) {
  const hShaft = 70 * s, yTop = yb - hShaft, w0 = 13 * s, w1 = 9 * s;
  for (let y = Math.floor(yTop); y < yb; y++) {
    const u = (yb - y) / hShaft, hw = lerp(w0, w1, u), band = Math.floor((yb - y) / (11 * s)) % 2;
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const nx = (x + .5 - cx) / hw;
      const l = 1.2 + nx * 1.4 - (1 - nx * nx) * .4;
      pb.set(x, y, step(band ? TRED : TWHITE, l, x, y));
    }
  }
  // Galerie, Lampenkammer (dunkles Glas mit Sprossen), Kupferkuppel, Wetterfahne
  const gy = yTop, gw = w1 + 4 * s;
  for (let x = Math.floor(cx - gw); x <= cx + gw; x++) { pb.set(x, gy, IRON[1]); pb.set(x, gy + 1, IRON[2]); if ((x - cx) % Math.max(2, Math.round(3 * s)) === 0) for (let k = 1; k <= 4 * s; k++) pb.set(x, gy - k, IRON[2]); }
  for (let x = Math.floor(cx - gw); x <= cx + gw; x++) pb.set(x, gy - Math.round(4 * s), IRON[1]);
  const lw = w1 - 1 * s, lh = 13 * s;
  for (let y = Math.floor(gy - lh); y < gy; y++) for (let x = Math.floor(cx - lw); x <= cx + lw; x++) {
    const nx = (x + .5 - cx) / lw, mull = Math.abs(((x - cx) / (4 * s)) % 1) < .25 / s;
    pb.set(x, y, mull ? IRON[3] : step(GLASS, 1.6 + nx * 1.2 + (y - gy + lh) / lh * .4, x, y));
  }
  pb.rect(Math.round(cx - 2 * s), Math.round(gy - lh * .65), Math.round(4 * s), Math.round(5 * s), GLASS[3]);   // Linse (dunkel)
  const dy0 = gy - lh;
  for (let y = Math.floor(dy0 - 8 * s); y < dy0; y++) { const u = (dy0 - y) / (8 * s), hw = (lw + 1.5 * s) * Math.sqrt(Math.max(0, 1 - u * u)); for (let x = Math.floor(cx - hw); x <= cx + hw; x++) pb.set(x, y, step(COPPER, 1.2 + (x - cx) / hw * 1.3 - (1 - u) * .3, x, y)); }
  for (let k = 0; k < 7 * s; k++) pb.set(Math.round(cx), Math.floor(dy0 - 8 * s - k), IRON[2]);
  for (let k = 0; k < 4 * s; k++) pb.set(Math.round(cx + k), Math.floor(dy0 - 12 * s), IRON[1]);
}
// Weite Einstellung (Bild 1): Himmel, Meer, Landzunge mit Turm und Wärterhaus
const WIDE_W = 360, W_HOR = 118, W_TX = 236, W_TY = 128;
function buildWide() {
  const sky = layer(WIDE_W + 120, W_HOR, (x, y) => step(NSKY, 2.6 + (fbm(x / 34, y / 11, 31, 4) - .5) * 3.6 + y / W_HOR * 1.6, x, y));
  const scud = layer(WIDE_W + 120, 70, (x, y) => { const n = fbm(x / 22, y / 6, 77, 3); return n > .6 ? (n > .7 ? NSKY[2] : NSKY[3]) : null; });
  const sea = layer(WIDE_W, H - W_HOR, (x, y) => step(NSEA, 2 + y / (H - W_HOR) * 2.4 - (vnoise(x / 10, y / 1.4, 7) > .64 ? 1.2 : 0), x, y));
  const pb = new PB(WIDE_W, H);
  // Landzunge: Felsen von rechts, steil zum Meer
  for (let x = 150; x < WIDE_W; x++) {
    const top = x < 188 ? W_TY + 26 - (x - 150) * .62 + Math.sin(x * .4) * 1.5 : W_TY + 3 + Math.sin(x * .17) * 2 + (vnoise(x / 6, 1, 3) - .5) * 4;
    for (let y = Math.floor(top); y < H; y++) pb.set(x, y, step(ROCK, 1.2 + (fbm(x / 8, y / 5, 5, 3) - .5) * 2.2 + (y - top < 2 ? -1 : 0) + (x < 190 ? .4 : 0), x, y));
  }
  // Wärterhaus links am Turm
  for (let y = W_TY - 14; y < W_TY + 2; y++) for (let x = W_TX - 34; x < W_TX - 12; x++) pb.set(x, y, step(TWHITE, 2 + (x - W_TX + 34) / 22, x, y));
  for (let k = 0; k < 9; k++) for (let x = W_TX - 35 + k; x < W_TX - 11 - k; x++) pb.set(x, W_TY - 15 - k, step(TRED, 1.8 + k * .1, x, W_TY - 15 - k));
  pb.rect(W_TX - 28, W_TY - 9, 4, 5, GLASS[2]); pb.rect(W_TX - 20, W_TY - 8, 4, 10, PLANK[3]);
  drawTower(pb, W_TX, W_TY + 1, 1);
  pb.outline(EDGE);
  return { sky, scud, sea, land: pb.canvas() };
}
// Brandung an den Felsen: Gischt schießt hoch
function surfBurst(ctx, x, y, t, ph, s = 1) {
  const a = ((t * .55 + ph) % 1);
  if (a > .55) return;
  const k = a / .55;
  for (let i = 0; i < 26; i++) {
    const ang = -Math.PI / 2 + (hash(i, 1, ph * 10) - .5) * 1.6, v = (20 + hash(i, 2, ph * 10) * 26) * s;
    const px = x + Math.cos(ang) * v * k, py = y + Math.sin(ang) * v * k + 30 * k * k * s;
    ctx.fillStyle = k < .7 ? FOAM : NSEA[0]; ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
}
function stormRain(ctx, t, n, col, slant = .5) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const sp = 280 + hash(i, 1, 6) * 90, y = ((hash(i, 2, 6) * 230 + t * sp) % 230) - 25;
    const x = ((hash(i, 3, 6) * 400 - y * slant - t * 50) % 380 + 380) % 380 - 30;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 4 + (i % 3));
  }
}
function renderWide(ctx, t, cam) {
  const c = Math.round(cam);
  ctx.drawImage(L.wide.sky, -c - Math.round(t * 6) % 120, 0);
  ctx.globalAlpha = .8; ctx.drawImage(L.wide.scud, -Math.round(t * 22) % 120, 4); ctx.globalAlpha = 1;
  ctx.drawImage(L.wide.sea, -c, W_HOR);
  // Dünung: Wellenkämme laufen auf die Felsen zu
  for (let i = 0; i < 40; i++) {
    const y = W_HOR + 4 + hash(i, 1, 2) * 55, x = ((hash(i, 2, 2) * 400 + t * (14 + y * .1)) % 380) - 30 - c;
    ctx.fillStyle = y > W_HOR + 30 ? FOAM : NSEA[0]; ctx.fillRect(Math.round(x), Math.round(y), 3 + (i % 4), 1);
  }
  ctx.drawImage(L.wide.land, -c, 0);
  surfBurst(ctx, 168 - c, W_TY + 26, t, .1); surfBurst(ctx, 158 - c, W_TY + 40, t, .55, 1.3);
  stormRain(ctx, t, 140, 'rgba(150,166,200,.45)');
}

/* =========================================================
   RÜCKBLENDE 2: Pumpwerk bei Nacht – zwei Männer zerschlagen die Ventile, Aurel sieht zu
   ========================================================= */
const PW_W = 340;
const VALVES = [70, 160, 250];
function buildPump() {
  const STONE = ['#d8c8a8', '#b4a080', '#8e7a60', '#685844', '#44382c', '#28201a'];
  const MET = ['#e0dcd0', '#b0aa9e', '#827a6e', '#585048', '#36302a'];
  const pb = new PB(PW_W, H);
  const lamp = (x, y) => 1.5 - Math.hypot(x - 140, (y - 130) * 1.2) / 120;
  for (let y = 0; y < 140; y++) for (let x = 0; x < PW_W; x++) {
    const row = Math.floor(y / 10), bx = (x + (row % 2) * 9) % 18, by = y % 10;
    let l = 4.2 - lamp(x, y) * 2.4 + (hash(Math.floor((x + (row % 2) * 9) / 18), row, 9) - .5) * .6;
    if (bx === 0 || by === 0) l += .9;
    pb.set(x, y, step(STONE, l, x, y));
  }
  // Bogenfenster oben (Nacht)
  for (const wx of [30, 205, 320]) for (let y = 14; y < 56; y++) for (let x = wx - 10; x < wx + 10; x++) if (y > 24 || Math.hypot(x + .5 - wx, y - 24) < 10) pb.set(x, y, step(['#5a6478', '#3a4256', '#262c3a'], 1 + (y - 14) / 42 + (vnoise(x / 3, y / 4, 2) - .5), x, y));
  // Boden
  for (let y = 140; y < H; y++) for (let x = 0; x < PW_W; x++) pb.set(x, y, step(STONE, 3.4 - lamp(x, 130) * 1.6 + ((x + (y > 152 ? 8 : 0)) % 16 === 0 ? .8 : 0) + (y - 140) * .03, x, y));
  // Hauptrohr quer auf halber Höhe, Stützen zum Boden
  for (const sx of [24, 115, 205, 295]) for (let y = 112; y < 140; y++) for (let x = sx - 4; x <= sx + 4; x++) pb.set(x, y, step(MET, 2.2 + (x - sx) / 4 + (y < 116 ? -.8 : 0), x, y));
  for (let y = 96; y < 113; y++) for (let x = 0; x < PW_W; x++) {
    const ny = (y + .5 - 104.5) / 8.5;
    let l = 1.7 + ny * 1.6 - (1 - ny * ny) * .5;
    if (x % 46 < 2) l -= .7;
    pb.set(x, y, step(MET, l, x, y));
  }
  // drei Schieberventile im Rohr: bauchiges Gehäuse mit verschraubten Flanschen, Deckel, Spindel, Handrad
  for (const vx of VALVES) {
    for (let y = 86; y < 124; y++) { const u = (y - 86) / 38, hw = 8 + Math.sin(u * Math.PI) * 4; for (let x = Math.floor(vx - hw); x <= vx + hw; x++) pb.set(x, y, step(MET, 1.3 + (x - vx) / hw * 1.4 - Math.sin(u * Math.PI) * .3, x, y)); }
    for (const fx of [vx - 15, vx + 13]) for (let y = 93; y < 117; y++) for (let x = fx; x < fx + 3; x++) pb.set(x, y, step(MET, (x - fx) * .8 + .6 + (y % 6 === 0 ? -1 : 0), x, y));   // Flansche mit Schrauben
    for (let y = 76; y < 86; y++) for (let x = vx - 6; x <= vx + 6; x++) pb.set(x, y, step(MET, 1.2 + (x - vx) / 6 * 1.3 + (y === 76 ? -1 : 0), x, y));   // Deckel
    for (let y = 58; y < 76; y++) { pb.set(vx, y, MET[1]); pb.set(vx + 1, y, MET[3]); }                                                    // Spindel
    for (let a = 0; a < 60; a++) { const ang = a / 60 * Math.PI * 2; pb.set(Math.round(vx + .5 + Math.cos(ang) * 12), Math.round(58 + Math.sin(ang) * 3), Math.sin(ang) < 0 ? MET[2] : MET[1]); }   // Handrad (schräg)
    line(pb, vx - 11, 58, vx + 12, 58, MET[2]);
  }
  pb.outline('#140e0a');
  return pb.canvas();
}
// Ein Mann mit Kapuze und Brecheisen (Seitenansicht nach rechts, 48×60, Füße unten): up = ausgeholt, sonst Schlag (Spitze bei 47/22)
function buildThug(up) {
  const C = ['#8a7a68', '#6a5c4c', '#4c4236', '#322a22'], M = ['#e8e8e0', '#a8a8a0', '#68686a'];
  return fig([48, 60], pb => {
    capsule(pb, 21, 24, 19, 54, 7, 10, C, 0);                                // Umhang
    pb.rect(14, 54, 5, 5, C[3]); pb.rect(22, 54, 6, 5, C[3]);                // Stiefel
    ellipse(pb, 23, 15, 6, 7, C, .1);                                        // Kapuze
    for (let y = 13; y < 20; y++) for (let x = 25; x < 29; x++) if (x - 25 < (y - 12) * .8) pb.set(x, y, y < 16 ? '#3a3028' : '#b89878');   // Gesicht im Schatten der Kapuze
    if (up) { capsule(pb, 24, 25, 30, 8, 2.6, 2.4, C, .2); ellipse(pb, 30, 6, 2.2, 2.2, ['#d8b898', '#b89878', '#8e7058', '#5e4838'], .2); line(pb, 31, 6, 12, -2, M[0]); line(pb, 31, 7, 12, -1, M[2]); line(pb, 12, -2, 9, 2, M[0]); }
    else { capsule(pb, 24, 25, 35, 27, 2.6, 2.4, C, .2); ellipse(pb, 36, 27, 2.2, 2.2, ['#d8b898', '#b89878', '#8e7058', '#5e4838'], .2); line(pb, 33, 30, 47, 21, M[0]); line(pb, 33, 31, 47, 22, M[2]); line(pb, 47, 21, 45, 18, M[0]); }
  });
}
const HITS = [[.9, 1], [1.4, 2], [2.1, 1], [2.6, 2], [3.3, 1], [3.8, 2], [4.5, 1], [5, 2]];   // Schläge: Zeit, Ventil
const PFLOOR = 140;
function renderPump(ctx, t, lt) {
  const cam = Math.round(ease(lt / 6) * 20);
  ctx.drawImage(L.pump, -cam, 0);
  glow(ctx, 112 - cam, 150, 70, .45, LAMP);                                   // Laterne auf dem Boden
  ctx.fillStyle = '#ffe2a0'; ctx.fillRect(111 - cam, 146, 3, 4); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(110 - cam, 145, 5, 1); ctx.fillRect(110 - cam, 150, 5, 1);
  // Aurel links, sieht zu
  ctx.drawImage(L.aurelRest, 6 - cam, PFLOOR + 6 - 58);
  // zwei Männer an den Ventilen 2 und 3
  for (const [k, vx] of [[1, VALVES[1]], [2, VALVES[2]]]) {
    const hits = HITS.filter(h => h[1] === k).map(h => h[0]), last = hits.filter(h => h <= lt).pop();
    const since = last == null ? 9 : lt - last, up = since > .18;
    ctx.drawImage(up ? L.thugUp : L.thugDown, vx - 57 - cam, PFLOOR + 4 - 58);
    // Funken beim Schlag
    if (since < .35) for (let i = 0; i < 14; i++) {
      const a = hash(i, k, Math.floor(last * 10)) * Math.PI * 2, r = since * (30 + hash(i, 3, k) * 40);
      ctx.fillStyle = i % 3 ? '#fff6c8' : '#ffc860'; ctx.fillRect(Math.round(vx - 10 - cam + Math.cos(a) * r), Math.round(100 + Math.sin(a) * r * .7), 1, 1);
    }
    // ab dem zweiten Schlag spritzt Wasser aus dem Ventil
    const n = hits.filter(h => h <= lt).length;
    if (n >= 2) for (let i = 0; i < 40; i++) {
      const a = (lt * 2.2 + hash(i, k, 5)) % 1, sp = 50 + hash(i, 2, k) * 40, ang = -.4 + hash(i, 4, k) * .5;
      const px = vx + 10 + Math.cos(ang) * sp * a, py = 102 + Math.sin(ang) * sp * a + 60 * a * a;
      ctx.fillStyle = a < .5 ? '#f4f0e4' : '#c8c0b0'; ctx.fillRect(Math.round(px - cam), Math.round(py), a < .3 ? 2 : 1, 1);
    }
  }
}

/* =========================================================
   RÜCKBLENDE 3a: der Herrscher von hinten am Kartentisch (Gegenlicht der Kerzen)
   ========================================================= */
function buildRulerBack() {
  const C = ['#4a7a5a', '#2c4e3a', '#1c3426', '#10201a'], HR = ['#4a3628', '#33251b', '#22180f', '#140e08'];
  const pb = new PB(110, 130), cx = 40;
  // Mantel von hinten (unten aus dem Bild), Rückennaht, Gurt mit zwei Knöpfen, Schöße
  for (let y = 28; y < 130; y++) {
    const hw = y < 34 ? 10 + (y - 28) * 1.1 : 17 + (y - 34) * .06;
    for (let x = Math.floor(cx - hw); x <= cx + hw; x++) {
      const nx = (x + .5 - cx) / hw;
      let l = -.6 + Math.abs(nx) * .4 + (bay(x, y) - .5) * .3 + (Math.abs(nx) > .85 ? .7 : 0);   // Rand vom Kerzenlicht
      if (x === cx && y > 40) l -= .5;
      pb.set(x, y, pick(C, l));
    }
  }
  for (let x = cx - 16; x <= cx + 16; x++) pb.set(x, 78, C[3]);
  pb.rect(cx - 6, 77, 2, 2, BRASS[1]); pb.rect(cx + 5, 77, 2, 2, BRASS[1]);
  // linker Arm hängt, rechter Arm greift nach vorn auf den Tisch
  capsule(pb, cx - 15, 36, cx - 19, 84, 4.6, 4, C, -.1);
  ellipse(pb, cx - 19, 88, 3.4, 4, SKIN, -.5);
  capsule(pb, cx + 15, 36, cx + 30, 62, 4.8, 4.2, C, .1);
  capsule(pb, cx + 30, 62, cx + 52, 80, 4.2, 3.6, C, .2);
  pb.rect(cx + 50, 77, 4, 6, C[0]);                                          // Aufschlag
  ellipse(pb, cx + 58, 83, 5, 3.2, SKIN, .2);                                // Hand auf dem Tisch
  for (let k = 0; k < 4; k++) pb.set(cx + 60 + k, 85, SKIN[2]);
  pb.set(cx + 57, 81, GOLD[0]); pb.set(cx + 58, 81, GOLD[1]); pb.set(cx + 58, 82, '#2f8a52'); pb.set(cx + 57, 82, GOLD[2]);   // Ring
  // hoher Kragen, Hals, Hinterkopf mit Haar und heller Strähne
  for (let y = 18; y < 32; y++) for (let x = cx - 9; x <= cx + 9; x++) pb.set(x, y, pick(C, -.3 + (Math.abs(x - cx) > 7 ? .6 : 0) + (bay(x, y) - .5) * .3));
  ellipse(pb, cx - 9, 12, 2, 3.2, SKIN, -.4); ellipse(pb, cx + 9, 12, 2, 3.2, SKIN, -.4);
  for (let y = 0; y < 24; y++) for (let x = cx - 10; x <= cx + 10; x++) {
    const nx = (x + .5 - cx) / 9.5, ny = (y + .5 - 10) / 11; if (nx * nx + ny * ny > 1) continue;
    let l = -.5 + (vnoise(x / 1.6, y / 4, 7) - .5) * .9 + (bay(x, y) - .5) * .3 + (Math.abs(nx) > .8 || ny < -.85 ? .8 : 0);
    pb.set(x, y, pick(HR, l));
  }
  for (let i = 0; i < 16; i++) { const u = i / 15, x = Math.round(cx + 4 + u * 5), y = Math.round(1 + u * 11); pb.set(x, y, '#e8e0cc'); pb.set(x + 1, y, '#c8bea4'); }
  pb.outline('#0c0806');
  return pb.canvas();
}
// Aurel geht von der Tür (x0) bis x1 und bleibt stehen; Gehen = leichtes Wippen
const aurelWalkX = (lt) => lerp(334, 262, ease(clamp((lt - .4) / 3.2, 0, 1)));
function renderThroneWide(ctx, t, lt) {
  const cam = ease(lt / 7) * 26;
  drawThrone(ctx, L.throne, t, cam, {
    figBehind: (c, ox) => {
      const x = aurelWalkX(lt), walking = lt > .4 && lt < 3.6, bob = walking ? Math.round(Math.abs(Math.sin(lt * 7))) : 0;
      c.drawImage(L.aurelRest, Math.round(x - 30) + ox, FLOOR - 56 - bob);
    }
  });
  ctx.drawImage(L.rulerBack, Math.round(98 - cam * .4), 48);                 // Vordergrund bewegt sich langsamer (näher)
}
// 3b: Großaufnahme: von hinten → Drehung → Gesicht. Hintergrund: Saal unscharf (dunkle Wand, Kerzenschein, Fenster)
function renderTurn(ctx, t, lt) {
  ctx.drawImage(L.turnBg, 0, 0);
  for (const [x, y, r] of [[60, 120, 34], [262, 116, 30]]) glow(ctx, x, y, r + Math.sin(t * 9 + x) * 2, .3, LAMP);
  const view = lt < TURN ? 'back' : lt < TURN + .12 ? 'qback' : lt < TURN + .24 ? 'side' : 'front';
  const push = ease((lt - TURN) / 3.2) * 4;
  let img = spielerView(view);
  if (view === 'front') { const e = lt > 2.9 && lt < 3.03 ? 2 : 0; img = portrait('spieler')(e, 0); }
  ctx.drawImage(img, 0, 0, 64, 80, 96 - push, 12 - push, 128 + push * 2, 160 + push * 2);
}
function buildTurnBg() {
  return layer(W, H, (x, y) => {
    const win = x > 128 && x < 192 && y < 124 && (y > 42 || Math.hypot(x - 160, y - 42) < 32) && y > 10;
    const l = win ? 4.4 + (fbm(x / 20, y / 10, 3, 2) - .5) : 4.6 - Math.max(0, 1.2 - Math.hypot(x - 160, y - 130) / 120) * 2 + (fbm(x / 30, y / 18, 8, 2) - .5) * .8;
    return step(['#c8b48e', '#a48e6c', '#806a50', '#5c4a38', '#3c3024', '#221a14'], l, x, y);
  });
}
// 4: über die Schulter des Herrschers (links vorn, dunkel), Aurel groß rechts; er nickt und lächelt halb
function renderOrder(ctx, t, lt) {
  ctx.drawImage(L.turnBg, 0, 0);
  glow(ctx, 230, 150, 60, .3, LAMP);
  const nodAt = T4 + 5.1 - T4;                                               // „Wie Ihr befehlt.“ (s. LINES)
  const nod = lt > nodAt && lt < nodAt + .7 ? Math.round(Math.sin((lt - nodAt) / .7 * Math.PI) * 4) : 0;
  const e = lt > nodAt - .05 && lt < nodAt + .6 ? 2 : lt > nodAt + 1.6 ? 4 : (lt % 3.7) < .13 ? 2 : 0;
  ctx.drawImage(portrait('aurel')(e, 0), 0, 0, 64, 80, 168, 16 + nod, 128, 160);
  ctx.drawImage(L.backDark, 0, 0, 64, 80, -24, 26, 128, 160);
}

/* =========================================================
   RÜCKBLENDE 5: der Aufstieg auf den Berg (vor dem Tiefland mit seinen Lichtern)
   ========================================================= */
const SLOPE = (x) => 168 - (x - 150) * .62 + Math.sin(x * .2) * 2;          // Oberkante des Hangs vorn rechts
const PATH = [[176, 164], [214, 146], [236, 138], [262, 120], [282, 110], [310, 92], [340, 78]];
function buildSlope() {
  const R = ['#8a7c66', '#6a5e4c', '#4c4236', '#322a22', '#1e1914'];
  return layer(W + 40, H, (x, y) => {
    if (x < 150 || y < SLOPE(x)) return null;
    let l = 2.2 + (fbm(x / 9, y / 6, 4, 3) - .5) * 2 + (y - SLOPE(x) < 2 ? -1.2 : 0);
    return step(R, l, x, y);
  });
}
function buildWalker(lead, f) {
  const C = lead ? ['#f2e2b0', '#d2b87e', '#a88a56', '#76603c'] : ['#867a6a', '#665c50', '#48423a', '#2e2a26'];
  const F = ['#f0d8b8', '#d8b494', '#b08a6c', '#7a5a46'];
  return fig([16, 24], pb => {
    capsule(pb, 8, 9, 7, 19, 2.6, 4.2, C, 0);                                // Umhang
    ellipse(pb, 8, 5, 2.6, 3, lead ? F : C, .2);                              // Kopf bzw. Kapuze
    if (lead) { pb.set(6, 2, '#fff0a0'); pb.set(7, 2, '#fff0a0'); pb.set(8, 2, '#fff0a0'); pb.set(9, 2, '#e0c060'); pb.set(10, 4, '#7a5a3a'); }
    else pb.set(10, 5, '#b89878');
    pb.rect(5 + f, 20, 2, 3, C[3]); pb.rect(9 - f, 20, 2, 3, C[3]);           // Schritt
    if (!lead) capsule(pb, 9, 10, 12, 14, 1.2, 1.2, C, .2);                  // Arm mit Laterne
  });
}
const pathAt = (s) => {
  s = clamp(s, 0, PATH.length - 1.001);
  const i = Math.floor(s), u = s - i, a = PATH[i], b = PATH[i + 1];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
};
function renderClimb(ctx, t, lt) {
  const cam = 20 + ease(lt / 6) * 18;
  drawFlood(ctx, L.flood, t, { cam: 20 + (cam - 20) * .3 });
  ctx.drawImage(L.slope, -Math.round(cam * .6), 0);
  for (let i = 0; i < 7; i++) {
    const s = .5 + lt * .5 - i * .42 + 0;
    if (s < 0) continue;
    const [x, y] = pathAt(s), f = Math.floor(lt * 4 + i) % 2;
    const sx = Math.round(x - cam * .6 - 8), sy = Math.round(y - 23);
    ctx.drawImage(i === 0 ? L.walkLead[f] : L.walker[f], sx, sy);
    if (i > 0 && i % 2 === 1) { glow(ctx, sx + 13, sy + 16, 14, .5, LAMP); ctx.fillStyle = '#ffe2a0'; ctx.fillRect(sx + 12, sy + 15, 2, 3); }
  }
}

/* =========================================================
   RÜCKBLENDE 7 / 8a: auf dem Berg (Plateau vorn), dahinter die Flut
   ========================================================= */
function buildPlateau(dawn) {
  const R = dawn ? ['#bcae90', '#9a8c70', '#786c54', '#564c3c', '#383026'] : ['#7a6e5c', '#5a5044', '#403a30', '#2a2620', '#1a1612'];
  return layer(W, H, (x, y) => {
    const top = 138 + Math.sin(x * .05) * 4 + (vnoise(x / 8, 1, 12) - .5) * 5 - (x > 200 && x < 250 ? Math.max(0, 10 - Math.abs(x - 225) * .5) : 0);   // Felsen, auf dem Aurel steht
    if (y < top) return null;
    return step(R, 1.6 + (fbm(x / 10, y / 6, 21, 3) - .5) * 2 + (y - top < 2 ? -1 : 0), x, y);
  });
}
function buildSurvivor(k) {
  const C = [['#8a7e6c', '#6a6052', '#4c443a', '#322c26'], ['#a09078', '#7c6e5a', '#5a4e40', '#3a3228'], ['#78705e', '#5a5446', '#403c32', '#2a2620']][k % 3];
  const F = ['#d8c0a0', '#b89e80', '#8e7660', '#5e4c3e'], tall = k % 2 ? 26 : 20;
  return fig([20, 30], pb => {
    const top = 30 - tall;
    capsule(pb, 10, top + 9, 10, 28, 4.6, 7, C, 0);                           // Decke um die Schultern
    ellipse(pb, 10 + (k % 3) - 1, top + 4, 3, 3.4, F, .1);
    if (k % 3 === 0) ellipse(pb, 10 + (k % 3) - 1, top + 3, 3.4, 2.6, C, .25, (x, y) => y < top + 4);   // Kopftuch
    if (k === 4) { ellipse(pb, 15, top + 14, 2, 2.2, F, .1); capsule(pb, 15, top + 17, 15, 28, 2, 2.6, C, .2); }   // Kind
  });
}
function buildBanner() {
  // Fahne mit Aurels Wappen an einer Stange (Seitenwind)
  const w = wappen('fahne'), c = canvas(34, 64), x = c.getContext('2d');
  x.fillStyle = '#3a2a1a'; x.fillRect(2, 0, 2, 64); x.fillStyle = '#e8c35a'; x.fillRect(1, 0, 4, 2);
  x.fillStyle = '#7e449e'; x.fillRect(4, 3, 28, 30); x.fillStyle = '#5c2c78'; x.fillRect(4, 31, 28, 2);
  x.drawImage(w, 9, 7);
  return c;
}
function renderSurvivors(ctx, t, lt) {
  drawFlood(ctx, L.flood, t, { cam: 90, flooded: true, dawn: 1 });
  ctx.drawImage(L.plateauDawn, 0, 0);
  ctx.drawImage(L.banner, 248, 66 + Math.round(Math.sin(t * 2) * .5));
  const f = Math.floor(t * 1.5) % 2;
  ctx.drawImage(L.aurelOpen[f], 196, 128 - 58);
  // Überlebende vorn, eng zusammen, einige wenden sich zu ihm
  for (let i = 0; i < 10; i++) ctx.drawImage(L.survivors[(i * 3) % L.survivors.length], 10 + i * 17 + (i % 2) * 4, 134 + (i % 3) * 4 - (i % 2) * 2);
}
// 8a: Konfrontation. Der Herrscher (Seitenansicht nach rechts) links, Aurel und zwei Wachen rechts; am Ende gehen die Wachen auf ihn los
function buildRulerSide(f) {
  const C = ['#4a7a5a', '#365f45', '#264a35', '#183224'], HR = ['#4a3628', '#33251b', '#22180f'];
  return fig([44, 64], pb => {
    const cx = 18;
    // Mantel mit wehenden Schößen (Wind von rechts nach links)
    for (let y = 18; y < 56; y++) { const hw = 6 + (y - 18) * .12, back = y > 36 ? (y - 36) * (.3 + f * .15) : 0; for (let x = Math.floor(cx - hw - back); x <= cx + hw; x++) pb.set(x, y, pick(C, -((x - cx) / hw) * -.5 + (bay(x, y) - .5) * .3)); }
    pb.set(cx + 5, 26, BRASS[0]); pb.set(cx + 5, 32, BRASS[0]); pb.set(cx + 5, 38, BRASS[1]);
    pb.rect(cx - 4, 56, 3, 7, '#2a2420'); pb.rect(cx + 1, 56, 3, 7, '#2a2420'); pb.rect(cx + 1, 62, 5, 1, '#2a2420');   // Stiefel
    capsule(pb, cx + 2, 21, cx + 9, 36, 2.8, 2.4, C, .2);                    // Arm (zeigt leicht nach vorn)
    ellipse(pb, cx + 10, 38, 2, 2.2, SKIN, .2); pb.set(cx + 10, 37, GOLD[1]);
    for (let y = 13; y < 20; y++) pb.rect(cx - 5, y, 9, 1, C[1]);            // Kragen
    ellipse(pb, cx + 1, 9, 5, 5.6, SKIN, .2);                                // Kopf im Profil
    pb.set(cx + 6, 9, SKIN[0]); pb.set(cx + 6, 10, SKIN[1]); pb.set(cx + 4, 8, '#2e1c14');
    for (let y = 2; y < 13; y++) for (let x = cx - 6; x < cx + 4; x++) { if ((x - cx + 1) * (x - cx + 1) / 30 + (y - 7) * (y - 7) / 30 > 1) continue; if (x > cx + 1 && y > 5) continue; pb.set(x - (y > 8 ? f : 0), y, HR[(x + y) % 3 === 0 ? 2 : 1]); }
    for (let k = 0; k < 6; k++) pb.set(cx + 1 - k, 3 + (k >> 1), '#ece4cc');   // helle Strähne
  });
}
function buildGuard(f) {
  const C = ['#7a7468', '#5a554c', '#403c36', '#2a2824'], M = ['#d0d0c8', '#a0a098', '#70706a'];
  return fig([26, 64], pb => {
    capsule(pb, 13, 20, 13, 54, 5.5, 7, C, 0);
    ellipse(pb, 13, 11, 4.4, 5, ['#d8b898', '#b89878', '#8e7058', '#5e4838'], .1);
    ellipse(pb, 13, 8, 5, 3.4, M, .2, (x, y) => y < 9);                      // Helm
    line(pb, 20 - f, 0, 20 - f, 62, '#4a3a2a');                              // Speer
    line(pb, 19 - f, 0, 21 - f, 0, M[0]); pb.set(20 - f, -1, M[0]);
    capsule(pb, 15, 22, 19 - f, 32, 2, 2, C, .2);
    pb.rect(9, 54, 3, 8, C[3]); pb.rect(15, 54, 3, 8, C[3]);
  });
}
function renderConfront(ctx, t, lt) {
  drawFlood(ctx, L.flood, t, { cam: 90, flooded: true });
  ctx.drawImage(L.plateauNight, 0, 0);
  const rush = ease(clamp((lt - 8.6) / 1.2, 0, 1));
  const f = Math.floor(t * 3) % 2;
  ctx.drawImage(L.rulerSide[f], 70, 140 - 62);
  ctx.drawImage(L.aurelNight, 200, 140 - 58);
  ctx.drawImage(L.guard[0], Math.round(252 - rush * 120), 140 - 62);
  ctx.drawImage(L.guard[1], Math.round(276 - rush * 128), 140 - 62);
  stormRain(ctx, t, 120, 'rgba(220,210,190,.35)');
}
// 8b: am Ufer wird das Boot in den Sturm gestoßen (Schattenriss wie im Prolog)
function renderPush(ctx, t, lt) {
  ctx.drawImage(L.shoreSky, 0, 0);
  const bx = 190 - ease(clamp((lt - .6) / 3.4, 0, 1)) * 150, by = 124 + Math.sin(t * 2.4) * 2;
  const tilt = clamp(Math.round(1.5 + Math.sin(t * 2) * 1.5), 0, 3);
  ctx.drawImage(L.boat[tilt], Math.round(bx - 32), Math.round(by - 43));
  // Wellen davor, Brandung
  for (let x = 0; x < W; x++) {
    const y = Math.round(132 + Math.sin(x * .05 + t * 2) * 3 + Math.sin(x * .13 - t * 3) * 1.4 + (x > 200 ? (x - 200) * .25 : 0));
    ctx.fillStyle = '#100c08'; ctx.fillRect(x, y, 1, H - y);
    if (hash(x, Math.floor(t * 8), 3) < .4) { ctx.fillStyle = 'rgba(230,220,200,.8)'; ctx.fillRect(x, y, 1, 1); }
  }
  // zwei Wachen im Wasser schieben (folgen dem Boot bis zur Brandung, dann bleiben sie stehen)
  const gx = Math.max(bx + 24, 160);
  ctx.drawImage(L.pusher, Math.round(gx), 86); ctx.drawImage(L.pusher, Math.round(gx + 20), 90);
  stormRain(ctx, t, 140, 'rgba(230,220,200,.35)');
}
function buildShore() {
  const sky = layer(W, H, (x, y) => step(['#d0c0a0', '#a89878', '#806e56', '#5a4c3c', '#3a3026', '#201a14'], 2.4 + y / 120 + (fbm(x / 30, y / 10, 55, 4) - .5) * 2.4 - (y > 110 ? 0 : 0), x, y));
  const c = canvas(W, H), x = c.getContext('2d'); x.drawImage(sky, 0, 0);
  // Strand rechts (dunkel)
  x.fillStyle = '#1a140e';
  for (let xx = 200; xx < W; xx++) { const y = 118 + (W - xx) * .1 - (xx - 200) * .05; x.fillRect(xx, Math.round(y), 1, H); }
  return c;
}

/* =========================================================
   GEGENWART 9: Aurels Boot legt am Turm an, er geht hinein
   ========================================================= */
const J9_Y = 134, DOOR9 = { x: 246, w: 22, top: 74 };
function buildBase() {
  const pb = new PB(W, H);
  // Turmfuß (groß, rechts), rot-weiße Bänder, Tür mit Bogen
  for (let y = 0; y < J9_Y + 4; y++) for (let x = 200; x < W; x++) {
    const nx = (x + .5 - 300) / 100, band = Math.floor((J9_Y + 4 - y) / 30) % 2;
    if (nx < -1) continue;
    let l = 1.2 + nx * -1.1 + (nx < -.9 ? 1 : 0);
    if ((y % 8 === 0) || ((x + Math.floor(y / 8) * 6) % 14 === 0)) l += .7;   // Mauerfugen
    pb.set(x, y, step(band ? TRED : TWHITE, l + .6, x, y));
  }
  // Tür (dunkel, offen; innen Licht bei Aurel), Laibung
  for (let y = DOOR9.top; y < J9_Y; y++) for (let x = DOOR9.x - 3; x < DOOR9.x + DOOR9.w + 3; x++) {
    const inArch = y > DOOR9.top + 10 || Math.hypot(x + .5 - DOOR9.x - DOOR9.w / 2, y - DOOR9.top - 10) < DOOR9.w / 2 + 3;
    if (!inArch) continue;
    const inner = x >= DOOR9.x && x < DOOR9.x + DOOR9.w && (y > DOOR9.top + 10 || Math.hypot(x + .5 - DOOR9.x - DOOR9.w / 2, y - DOOR9.top - 10) < DOOR9.w / 2);
    pb.set(x, y, inner ? null : ROCK[1]);
    if (inner) pb.p[y * W + x] = '#0a0a12';
  }
  // Steg: Bohlen, Pfähle
  for (let x = 40; x < 250; x++) { pb.set(x, J9_Y, PLANK[0]); pb.set(x, J9_Y + 1, PLANK[1]); pb.set(x, J9_Y + 2, PLANK[2]); if (x % 7 === 0) pb.set(x, J9_Y + 1, PLANK[3]); }
  for (const px of [48, 96, 144, 192]) for (let y = J9_Y + 3; y < H; y++) { pb.set(px, y, PLANK[2]); pb.set(px + 1, y, PLANK[3]); pb.set(px + 2, y, PLANK[3]); }
  // Laterne am Steg (aus)
  pb.outline(EDGE);
  return pb.canvas();
}
function buildAurelBoat() {
  return fig([90, 70], pb => {
    // Rumpf
    for (let x = 4; x < 86; x++) { const top = 52 - (x < 14 ? (14 - x) * .5 : 0) - (x > 76 ? (x - 76) * .6 : 0), bot = 58 + Math.sin((x - 4) / 82 * Math.PI) * 6; for (let y = Math.floor(top); y < bot; y++) pb.set(x, y, step(WOODT, 1 + (y - top) / 6 + (y === Math.floor(top) ? -1 : 0), x, y)); }
    for (let x = 6; x < 84; x++) pb.set(x, 55, WOODT[0]);
    // Mast, Segel (gerefft, Wappen darauf)
    for (let y = 2; y < 52; y++) { pb.set(40, y, WOODT[2]); pb.set(41, y, WOODT[3]); }
    for (let y = 6; y < 40; y++) for (let x = 42; x < 42 + (y - 4) * .7 && x < 68; x++) pb.set(x, y, step(['#e8dcc0', '#c8b898', '#a09070', '#786a52'], 1 + (x - 42) / 26 + (y - 6) / 40, x, y));
    // Laternenstange am Bug
    for (let y = 30; y < 52; y++) pb.set(10, y, WOODT[2]); for (let x = 10; x < 16; x++) pb.set(x, 30, WOODT[2]);
  });
}
function renderDock(ctx, t, lt) {
  ctx.fillStyle = NSKY[5]; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(L.wide.sky, -40 - Math.round(t * 6) % 120, -30);
  ctx.drawImage(L.wide.sea, 0, 112);
  for (let i = 0; i < 30; i++) { const y = 116 + hash(i, 1, 4) * 60, x = ((hash(i, 2, 4) * 400 + t * 18) % 380) - 30; ctx.fillStyle = FOAM; ctx.fillRect(Math.round(x), Math.round(y), 3, 1); }
  // Licht aus der Tür, sobald Aurel davor steht (seine Laterne)
  const bx = lerp(-100, 60, ease(clamp(lt / 2.8, 0, 1))), by = J9_Y - 46 + Math.round(Math.sin(t * 2.2) * 1.5);
  // Aurel: steht im Boot, steigt bei 2,9 s auf den Steg und geht zur Tür (bis 5,6 s), verschwindet in der Tür
  const onJetty = lt > 2.9, ax = onJetty ? lerp(bx + 74, DOOR9.x + DOOR9.w / 2, ease(clamp((lt - 3) / 2.6, 0, 1))) : bx + 74;
  const ay = onJetty ? J9_Y - 56 - Math.round(Math.abs(Math.sin(lt * 6)) * (lt < 5.6 ? 1 : 0)) : by + 52 - 56 - 4;
  ctx.drawImage(L.base, 0, 0);
  ctx.drawImage(L.dockBoat, Math.round(bx), Math.round(by));
  ctx.drawImage(L.wappenSail, Math.round(bx) + 46, Math.round(by) + 14);
  const inside = clamp((ax - DOOR9.x - 2) / 8, 0, 1);
  // Laterne (am Bug, dann in Aurels Hand)
  const lx = onJetty ? ax + 9 : bx + 13, ly = onJetty ? ay + 30 : by + 32;
  if (inside < 1) {
    ctx.save();
    if (lt > 5) { ctx.beginPath(); ctx.rect(0, 0, DOOR9.x + DOOR9.w - 2, H); ctx.clip(); }
    ctx.drawImage(L.aurelDock, Math.round(ax - 30), Math.round(ay));
    ctx.restore();
  }
  glow(ctx, lx, ly, 34, .55 * (1 - inside * .6), LAMP); ctx.fillStyle = '#ffe6a8'; ctx.fillRect(Math.round(lx) - 1, Math.round(ly) - 1, 3, 3);
  if (lt > 5.2) glow(ctx, DOOR9.x + DOOR9.w / 2, J9_Y - 26, 22, .25 * clamp((lt - 5.2) / .6, 0, 1), LAMP);
  stormRain(ctx, t, 150, 'rgba(150,166,200,.45)');
}

/* =========================================================
   GEGENWART 10: Lampenkammer – die Fackel in der Hand des Spielers vor der dunklen Linse, Aurel im Hintergrund
   ========================================================= */
const LENS = { cx: 226, top: 34, bot: 146, hw: 40 };
const lensHW = (y) => LENS.hw - 6 + 8 * Math.sin(Math.PI * clamp((y - LENS.top) / (LENS.bot - LENS.top), 0, 1));
function buildLampRoom() {
  // Rückwand: Fenster der Lampenkammer mit Sprossen, draußen Sturm (dunkel); Boden aus Eisenplatten; Luke links (Treppe)
  const room = layer(W, H, (x, y) => {
    if (y > 150) return step(IRON, 2.6 + ((x % 24) === 0 ? 1 : 0) + (y - 150) * .04, x, y);
    if (x > 18 && x < 70 && y > 60) return step(['#2a2420', '#1e1a18', '#141210', '#0c0a0a'], 1.6 + (y - 60) / 60, x, y);   // Treppenluke (Aurel steht darin)
    const mull = x % 54 < 3 || y % 46 < 2;
    if (mull) return step(IRON, 2.8 + (x % 54 === 0 ? -1 : 0), x, y);
    return step(NSKY, 4.4 + (fbm(x / 24, y / 10, 15, 3) - .5) * 2, x, y);
  });
  // Linse: Fresnel-Linse wie ein Bienenkorb – waagerechte Prismenringe, in der Mitte das Ochsenauge, Messingrahmen und Streben
  const pb = new PB(2 * LENS.hw + 12, LENS.bot - LENS.top + 30), cx = LENS.hw + 6;
  for (let y = 0; y < pb.h; y++) {
    const Y = y + LENS.top - 4, hw = lensHW(Y);
    if (Y > LENS.bot + 2) {                                                   // Sockel
      const sw = 22 - (Y - LENS.bot) * .3;
      for (let x = Math.floor(cx - sw); x <= cx + sw; x++) pb.set(x, y, step(IRON, 1.4 + (x - cx) / sw * 1.2, x, y));
      continue;
    }
    for (let x = Math.floor(cx - hw - 2); x <= cx + hw + 2; x++) {
      const nx = (x + .5 - cx) / hw;
      if (Math.abs(nx) > 1 + 2 / hw) continue;
      if (Y < LENS.top + 2 || Y > LENS.bot - 2 || Math.abs(nx) > 1) { pb.set(x, y, step(BRASS, 1.2 + nx * 1.4, x, y)); continue; }   // Rahmen
      if (Math.abs(Math.abs(nx) - .55) < .04) { pb.set(x, y, step(BRASS, 1.6 + nx, x, y)); continue; }                                 // Streben
      const mid = (LENS.top + LENS.bot) / 2, dy = Y - mid;
      let l;
      if (Math.abs(dy) < 7) l = 1.4 + nx * .6 - (1 - nx * nx) * .5 + (Math.abs(nx) < .08 ? -.8 : 0);                                       // Ochsenauge
      else { const r = ((Math.abs(dy) - 7) % 7) / 7; l = 2 + nx * .9 + (r < .18 ? -1.3 : r > .8 ? 1 : 0); }                               // Prismenringe: helle Kante oben, dunkle unten
      pb.set(x, y, step(GLASS, l, x, y));
    }
  }
  pb.outline(EDGE);
  return { room, lens: pb.canvas() };
}
// Die Hand mit der Fackel (Vordergrund links unten): Ärmel mit Messingknöpfen, Faust um den Stiel, Ring
function buildTorchHand() {
  const pb = new PB(150, 120);
  const D = [.56, -.83], P = [-D[1], D[0]];                                    // D: Stiel nach oben rechts, P: quer dazu
  const at = (s, q) => [76 + D[0] * s + P[0] * q, 74 + D[1] * s + P[1] * q];
  // Fackel: Holzstiel, oben umwickelt (Pech)
  capsule(pb, ...at(-34, 0), ...at(54, 0), 3.4, 3, WOODT, 0);
  capsule(pb, ...at(50, 0), ...at(64, 0), 5.4, 5, ['#6a5040', '#4a382c', '#30241c', '#1c1410'], .1);
  for (let k = 0; k < 4; k++) line(pb, ...at(52 + k * 3, -5).map(Math.round), ...at(52 + k * 3 + 2, 5).map(Math.round), '#2a2018');
  // Ärmel (grüner Mantel) von links unten, Aufschlag mit zwei Messingknöpfen
  capsule(pb, -14, 140, 52, 98, 24, 14, COAT, .05);
  capsule(pb, 46, 102, 56, 95, 14.5, 13, ['#5e9470', '#46785a', '#33604a', '#22422f'], .1);
  for (const [bx, by] of [[34, 104], [40, 114]]) { pb.rect(bx, by, 3, 3, BRASS[1]); pb.set(bx, by, BRASS[0]); pb.set(bx + 2, by + 2, BRASS[2]); }
  // Faust: Handrücken zum Betrachter, vier Finger quer um den Stiel (von oben nach unten), Daumen darüber
  const Hd = new PB(150, 120);
  ellipse(Hd, ...at(-9, -9), 11, 10, SKIN, .05);                              // Handrücken
  for (let i = 0; i < 4; i++) { const s0 = 6 - i * 5.6; capsule(Hd, ...at(s0, -9), ...at(s0, 5 - i * .6), 3.1, 2.9, SKIN, .25 - i * .1); }
  capsule(Hd, ...at(4, -12), ...at(10, 2), 3.2, 2.8, SKIN, .4);               // Daumen über dem Zeigefinger
  // Fugen zwischen den Fingern, Knöchel
  for (let i = 0; i < 3; i++) for (let q = -8; q <= 4; q++) { const [x, y] = at(3.2 - i * 5.6, q); if (Hd.get(x, y)) Hd.set(x, y, SKIN[3]); }
  for (let i = 0; i < 4; i++) { const [x, y] = at(6 - i * 5.6, -10); Hd.set(x, y, SKIN[0]); }
  // Ring am Mittelfinger: schweres Gold mit dunkelgrünem Stein
  for (let q = -10; q <= 4; q++) { const [x, y] = at(-5, q); Hd.set(x, y, GOLD[q < -6 ? 0 : q > 1 ? 3 : 1]); const [x2, y2] = at(-6, q); Hd.set(x2, y2, GOLD[2]); }
  { const [x, y] = at(-5.5, -8); Hd.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, '#2f8a52'); Hd.set(Math.round(x) - 1, Math.round(y) - 1, '#7ad89a'); }
  Hd.outline(EDGE);
  for (let i = 0; i < Hd.p.length; i++) if (Hd.p[i]) pb.p[i] = Hd.p[i];
  pb.outline(EDGE);
  return pb.canvas();
}
// Flamme der Fackel: Form aus Rauschen, flackert
function torchFlame(ctx, x, y, t) {
  const P = ['#fffbe8', '#ffe9a0', '#ffc35a', '#f08a3a', '#b8482a'];
  for (let j = 0; j < 44; j++) {
    const u = j / 44, w = 10 * Math.sin(Math.min(1, u * 1.6 + .15) * Math.PI) * (1 - u * .5);
    const sway = Math.sin(t * 7 + j * .3) * u * 3 + (vnoise(j * .3, t * 6, 5) - .5) * u * 4;
    for (let i = -Math.ceil(w); i <= Math.ceil(w); i++) {
      const d = Math.abs(i) / Math.max(1, w);
      if (d > 1 || hash(i, j + Math.floor(t * 20), 8) < u * .35 * d) continue;
      ctx.fillStyle = P[clamp(Math.round(d * 2.4 + u * 2 + (bay(i + 50, j) - .5) * .8), 0, 4)];
      ctx.fillRect(Math.round(x + i + sway), Math.round(y - j), 1, 1);
    }
  }
  for (let i = 0; i < 10; i++) { const a = (t * .9 + hash(i, 1, 33)) % 1; ctx.fillStyle = `rgba(255,200,110,${1 - a})`; ctx.fillRect(Math.round(x + (hash(i, 2, 33) - .5) * 14 + a * 6), Math.round(y - 24 - a * 40), 1, 1); }
}
const TIP = [76 + .56 * 62, 74 - .83 * 62];                                   // Fackelkopf in der Ebene der Hand
function renderTorch(ctx, t, lt, still) {
  const push = still ? 1 : ease(lt / 6);
  const ox = Math.round(-push * 6), oy = Math.round(-push * 3);
  ctx.drawImage(L.lamp.room, ox, oy);
  stormRain(ctx, t, 60, 'rgba(150,166,200,.3)', .2);
  const hx = 8 + Math.round(push * -4), hy = 62 + Math.round(push * -2) + Math.round(Math.sin(t * 1.3) * 1);
  const fx = hx + TIP[0], fy = hy + TIP[1] - 2, fl = .85 + Math.sin(t * 11) * .08 + Math.sin(t * 17) * .05;
  // Aurel im Hintergrund (in der Treppenluke links), vom Fackelschein von rechts gestreift
  ctx.drawImage(L.aurelLamp, 18 + ox, 152 - 58 + oy);
  ctx.drawImage(L.lamp.lens, LENS.cx - LENS.hw - 6 + ox, LENS.top - 4 + oy);
  // Fackelschein auf der Linse (links) und Spiegelbild der Flamme im Ochsenauge
  glow(ctx, LENS.cx - 26 + ox, (LENS.top + LENS.bot) / 2 + oy, 34, .3 * fl, FIRE);
  ctx.fillStyle = `rgba(255,214,140,${.7 * fl})`; ctx.fillRect(LENS.cx - 14 + ox, (LENS.top + LENS.bot) / 2 - 3 + oy, 2, 4);
  ctx.drawImage(L.torchHand, hx, hy);
  torchFlame(ctx, fx, fy, t);
  glow(ctx, fx, fy - 8, 130, .42 * fl, FIRE);
}
/* ---------- Statische Ebenen ---------- */
let L = null;
function setup() {
  if (L) return;
  if (!prolog._ready) { prolog.setup(); prolog._ready = true; }   // Bild 8c zeigt die Sturm-Einstellung des Prologs
  const aurelRest = buildAurelFigure('rest', 0);
  L = {
    wide: buildWide(), pump: buildPump(), thugUp: buildThug(true), thugDown: buildThug(false),
    aurelRest, aurelOpen: [buildAurelFigure('open', 0), buildAurelFigure('open', 1)],
    aurelNight: nightTint(aurelRest, .45), aurelDock: nightTint(buildAurelFigure('rest', 1), .5, .25, 'left'), aurelLamp: nightTint(aurelRest, .6, .45, 'right'),
    throne: buildThrone(), rulerBack: buildRulerBack(), turnBg: buildTurnBg(),
    backDark: nightTint(spielerView('back'), .55),
    flood: buildFlood(), slope: buildSlope(), walkLead: [buildWalker(true, 0), buildWalker(true, 1)], walker: [buildWalker(false, 0), buildWalker(false, 1)],
    plateauDawn: buildPlateau(true), plateauNight: buildPlateau(false), banner: buildBanner(), survivors: [0, 1, 2, 3, 4].map(buildSurvivor),
    rulerSide: [buildRulerSide(0), buildRulerSide(1)], guard: [buildGuard(0), buildGuard(1)],
    shoreSky: buildShore(), boat: [-.16, -.06, .05, .15].map(buildBoatSil),
    pusher: silhouette(buildGuard(1), '#0c0806'),
    base: buildBase(), dockBoat: nightTint(buildAurelBoat(), .35), wappenSail: nightTint(wappen('fahne'), .35),
    lamp: buildLampRoom(), torchHand: nightTint(buildTorchHand(), .2, .45, 'right'),
    vig: makeVignette('#06080e', 1.3, .7)
  };
}
const vig = (ctx, a = .55) => { ctx.globalAlpha = a; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1; };

/* ---------- Dialogzeilen der Rückblenden (Text aus data/dialogs/story.js, wahrheit_rueck) ---------- */
// Zeiten: [von, bis] in s der Szene; face: Porträt (der Herrscher erst nach dem Umdrehen, bei T3B + TURN)
const RUECK = dialogLines(DIALOGS.wahrheit_rueck);
const SLOTS = [[12.4, 18.2], [T4 + .4, T4 + 4.6], [T4 + 4.9, T4 + 7.4], [T5 + .4, T5 + 3.6], [T7 + .6, T7 + 6.2], [T8 + .4, T8 + 3.4], [T8 + 3.7, T8 + 9.4]];
const LINES = RUECK.map((l, i) => ({ from: SLOTS[i][0], to: SLOTS[i][1], who: l.who, text: l.text, face: l.face || l.who }));

export default {
  id: 'cs_wahrheit',
  title: 'Die Wahrheit',
  len: T_END,
  dialog: 'wahrheit',
  linesDialog: 'wahrheit_rueck',
  lines: LINES,
  setup,
  shots: [
    // 1 Gegenwart: Sturm, der fertige Turm, Lampe dunkel (langsame Fahrt nach rechts)
    { from: 0, to: T1, draw(ctx, lt, t) { renderWide(ctx, t, ease(lt / T1) * 24); vig(ctx, .6); black(ctx, 1 - lt / 1.4); } },
    // 2 Rückblende: Pumpwerk
    { from: T1, to: T2, draw(ctx, lt, t) { renderPump(ctx, t, lt); sepia(ctx); } },
    // 3a Thronsaal: Aurel meldet
    { from: T2, to: T3B, draw(ctx, lt, t) { renderThroneWide(ctx, t, lt); sepia(ctx); } },
    // 3b der Herrscher dreht sich um, Stille
    { from: T3B, to: T4, draw(ctx, lt, t) { renderTurn(ctx, t, lt); sepia(ctx); } },
    // 4 Befehl, Aurel nickt
    { from: T4, to: T5, draw(ctx, lt, t) { renderOrder(ctx, t, lt); sepia(ctx); } },
    // 5 Aufstieg, der Turm bleibt dunkel
    { from: T5, to: T6, draw(ctx, lt, t) { renderClimb(ctx, t, lt); sepia(ctx); } },
    // 6 die Flut
    { from: T6, to: T7, draw(ctx, lt, t) { drawFlood(ctx, L.flood, t, { cam: 90, front: floodFront(clamp((lt - .6) / 5.4, 0, 1)) }); sepia(ctx); } },
    // 7 Aurel zu den Überlebenden
    { from: T7, to: T8, draw(ctx, lt, t) { renderSurvivors(ctx, t, lt); sepia(ctx); } },
    // 8a Konfrontation
    { from: T8, to: T8B, draw(ctx, lt, t) { renderConfront(ctx, t, lt); sepia(ctx); } },
    // 8b das Boot wird in den Sturm gestoßen
    { from: T8B, to: T8C, draw(ctx, lt, t) { renderPush(ctx, t, lt); sepia(ctx); black(ctx, (lt - 3.6) / .6); } },
    // 8c der Sturm aus dem Prolog, Bild für Bild (gleiche Einstellung, gleicher Blitz bei 5 s)
    { from: T8C, to: T9, draw(ctx, lt) { prolog.shots[0].draw(ctx, lt, lt); } },
    // 9 Gegenwart: Aurel legt an und geht in den Turm
    { from: T9, to: T10, draw(ctx, lt, t) { renderDock(ctx, t, lt); vig(ctx, .6); } },
    // 10 die Fackel vor der dunklen Lampe, Aurel im Hintergrund – hält an
    { from: T10, to: T_END, draw(ctx, lt, t) { renderTorch(ctx, t, lt); vig(ctx, .55); } }
  ],
  // Das letzte Bild hält an (Dialog „wahrheit“ und die Entscheidung): nur die Flamme und der Regen bewegen sich
  dialogBg(ctx, el, now) { renderTorch(ctx, now, 6, true); vig(ctx, .55); }
};

// Bausteine für die Enden (cs_ende_a, cs_ende_b): Turm, Sturm, Lampenkammer, Fackel, Aurels Boot und der Steg am Turm
export { drawTower, buildWide, surfBurst, stormRain, nightTint, silhouette, buildLampRoom, buildTorchHand, torchFlame, buildAurelBoat, buildBase,
  LENS, lensHW, TIP, J9_Y, DOOR9, W_HOR, W_TX, W_TY, WIDE_W, NSKY, NSEA, FOAM, ROCK, TWHITE, TRED, IRON, GLASS, PLANK, BRASS, GOLD, WOODT, FIRE, LAMP, EDGE, step };
