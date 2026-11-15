/* =========================================================
   RÜCKBLENDE „FLUTNACHT“: gemeinsame Bausteine für cs_wahrheit (seit 0.22.0) und das spätere cs_flutnacht
     Thronsaal – buildThrone() einmal, drawThrone(ctx, T, t, cam): Seitenansicht des Saals bei Kerzenlicht, Bogenfenster mit
                 Sturm und dem fernen, dunklen Leuchtturm, Banner mit dem Turm des Herrschers, Thron, Tür rechts,
                 Kartentisch mit Karte, Kerzen und einem gesiegelten Befehl (Siegel aus motifs.js).
                 Figuren zeichnet die Szene selbst (der Herrscher von hinten, Aurel).
     Flut      – buildFlood() einmal, drawFlood(ctx, F, t, o): das Tiefland vom Berg aus gesehen (Felder, Flüsse, Dörfer mit
                 Lichtern, an der Küste links der dunkle Leuchtturm, rechts der Berg, der heute eine Insel ist).
                 o.front = x der Flutwelle (null = keine), o.flooded = alles unter Wasser, o.dawn = Morgengrauen (0–1),
                 o.cam = Kamera x. Die Welle rollt von links nach rechts, Lichter erlöschen, sobald sie überrollt sind.
   Alles wird später mit sepia() (cutscene/kit.js) eingefärbt; gezeichnet wird in warmen, neutralen Tönen mit klaren
   Helligkeitsstufen, damit die Rückblende lesbar bleibt. Licht von links oben bzw. von den Kerzen.
   ========================================================= */
import { W, H, clamp, lerp, ease, bay, hash, vnoise, fbm, PB, layer, glow, disc } from './kit.js';
import { siegel } from './motifs.js';
import { capsule, ellipse, line } from '../divegame/art.js';

const step = (r, l, x, y) => r[clamp(Math.round(l + (bay(x, y) - .5) * .9), 0, r.length - 1)];
const STONE = ['#e2d2b2', '#c4b08e', '#a08a6c', '#7a6650', '#564636', '#382c22', '#201812'];
const WOOD = ['#c89a64', '#9c7046', '#744e30', '#4e321e', '#2e1c10'];
const CLOTH = ['#d8584a', '#ac3a32', '#7c2622', '#4e1614'];
const PAPER = ['#f2e4c0', '#dcc89c', '#bca478', '#8e7654'];
const SKY_N = ['#5a6478', '#454e62', '#343c4e', '#262c3a', '#1a1e28', '#101219'];
const EDGE = '#140e0a';

/* =========================================================
   THRONSAAL (Ebene 360×180, Kamera 0–40)
   ========================================================= */
export const THRONE_W = 360;
export const WIN = { cx: 150, x0: 126, x1: 174, top: 28, bot: 112 };     // Bogenfenster
export const TABLE = { x0: 96, x1: 214, y: 124 };                        // Kartentisch (Oberkante)
export const DOOR = { x0: 318, x1: 346, top: 70, bot: 140 };            // Tür rechts (Aurel kommt herein)
export const FLOOR = 138;
const inWin = (x, y) => x >= WIN.x0 && x < WIN.x1 && y < WIN.bot && (y >= WIN.top + 24 || Math.hypot(x + .5 - WIN.cx, y + .5 - (WIN.top + 24)) < 24);
const inDoor = (x, y) => x >= DOOR.x0 && x < DOOR.x1 && y < DOOR.bot && (y >= DOOR.top + 14 || Math.hypot(x + .5 - (DOOR.x0 + DOOR.x1) / 2, y + .5 - (DOOR.top + 14)) < 14);
// Kerzenlicht: hell um den Tisch, dunkel zu den Rändern
const candle = (x, y) => 1.4 - Math.hypot((x - 160) / 1.3, (y - 118) * 1.1) / 95;

export function buildThrone() {
  const T = {};
  // Himmel im Fenster: Sturmwolken (zwei Ebenen, die sich gegeneinander bewegen), Meer, ferne Küste mit dem Turm
  T.sky = layer(140, 90, (x, y) => step(SKY_N, 1.3 + (fbm(x / 26, y / 9, 41, 4) - .5) * 3.2 + y / 90 * 1.2, x, y));
  T.sea = layer(60, 26, (x, y) => step(SKY_N, 3 + y / 26 * 2 - (vnoise(x / 6, y / 1.4, 5) > .64 ? 1.2 : 0), x, y));
  const lt = new PB(12, 34);                                               // ferner Leuchtturm (Schattenriss, Lampe dunkel)
  for (let y = 6; y < 34; y++) { const w = 1.6 + (y - 6) * .09; for (let x = 0; x < 12; x++) if (Math.abs(x + .5 - 6) <= w) lt.set(x, y, y > 30 ? SKY_N[5] : (y >> 2) % 2 ? SKY_N[4] : SKY_N[5]); }
  lt.rect(3, 4, 6, 3, SKY_N[5]); lt.rect(4, 1, 4, 3, SKY_N[4]); lt.set(6, 0, SKY_N[5]);
  T.tower = lt.canvas();
  // Wand, Pfeiler, Boden, Thron, Tür (mit Löchern für Fenster und Tür)
  const pb = new PB(THRONE_W, H);
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < THRONE_W; x++) {
    if (inWin(x, y) || inDoor(x, y)) continue;
    const row = Math.floor(y / 12), bx = (x + (row % 2) * 13) % 26, by = y % 12;
    let l = 5.2 - candle(x, y) * 3.2 + (hash(Math.floor((x + (row % 2) * 13) / 26), row, 3) - .5) * .7;
    if (bx === 0 || by === 0) l += 1.1;                                     // Fugen
    else if (bx === 1 || by === 1) l -= .5;                                // Kante oben links fängt Licht
    pb.set(x, y, step(STONE, l, x, y));
  }
  // Fensterlaibung (tief, helle Kante innen links) und Sims
  for (let y = WIN.top - 4; y < WIN.bot + 5; y++) for (let x = WIN.x0 - 5; x < WIN.x1 + 5; x++) {
    if (inWin(x, y)) continue;
    const near = [[-4, 0], [4, 0], [0, -4], [0, 4], [-3, -3], [3, -3]].some(([dx, dy]) => inWin(x + dx, y + dy));
    if (!near) continue;
    pb.set(x, y, step(STONE, x < WIN.cx ? 2.4 : 4, x, y));
  }
  pb.rect(WIN.x0 - 7, WIN.bot, WIN.x1 - WIN.x0 + 14, 3, STONE[2]); pb.rect(WIN.x0 - 7, WIN.bot + 3, WIN.x1 - WIN.x0 + 14, 1, STONE[5]);
  // Pfeiler mit Kapitell (links und rechts), dunkler (weiter vorn, gegen das Licht)
  for (const px of [30, 282]) for (let y = 0; y < FLOOR; y++) for (let x = px; x < px + 22; x++) {
    const nx = (x + .5 - px - 11) / 11;
    let l = 4.4 - candle(x, y) * 2 + nx * 1.2 - (1 - nx * nx) * .6;
    if (y > 14 && y < 20) l -= .8; if (y === 14 || y === 20) l += .8;
    if (y > FLOOR - 8) l -= .4;
    pb.set(x - (y > 14 && y < 20 ? 2 : 0), y, step(STONE, l, x, y));
    if (y > 14 && y < 20) pb.set(x + 2, y, step(STONE, l, x, y));
  }
  // Tür: tiefe Laibung
  for (let y = DOOR.top - 4; y < DOOR.bot; y++) for (let x = DOOR.x0 - 4; x < DOOR.x1 + 4; x++) if (!inDoor(x, y) && [[-3, 0], [3, 0], [0, 3]].some(([dx, dy]) => inDoor(x + dx, y + dy))) pb.set(x, y, step(STONE, 4.2, x, y));
  // Boden: Platten, Fluchtlinien zur Mitte des Fensters
  for (let y = FLOOR; y < H; y++) for (let x = 0; x < THRONE_W; x++) {
    const d = (y - FLOOR) / (H - FLOOR), u = (x - 160) / (1 + d * 3.2), rowEdge = [0, 5, 12, 21, 32].includes(y - FLOOR);
    const cell = (Math.floor(u / 16) + Math.floor(Math.pow(d, .7) * 4)) % 2;
    let l = 4 - candle(x, Math.min(y, 140)) * 2.2 + cell * .6 - d * .6;
    if (rowEdge || Math.abs((u % 16 + 16) % 16) < .6 + d * .3) l += 1;
    pb.set(x, y, step(STONE, l, x, y));
  }
  // Thron auf zwei Stufen (rechts vor der Wand)
  pb.rect(232, FLOOR - 6, 46, 6, STONE[3]); pb.rect(232, FLOOR - 6, 46, 1, STONE[2]); pb.rect(238, FLOOR - 11, 34, 5, STONE[3]); pb.rect(238, FLOOR - 11, 34, 1, STONE[2]);
  for (let y = 70; y < FLOOR - 11; y++) for (let x = 242; x < 268; x++) {
    const back = y < 108, seat = y >= 108 && y < 114, leg = y >= 114 && (x < 246 || x > 263);
    if (back && (x < 245 || x > 264) && y < 78) continue;
    if (!(back || seat || leg)) continue;
    let l = back ? 2.2 + (x - 242) / 26 * 1.4 : seat ? 1.4 : 3;
    if (back && x > 246 && x < 262 && y > 80 && y < 106) { pb.set(x, y, step(CLOTH, 1 + (x - 246) / 16 + (bay(x, y) - .5) * .3, x, y)); continue; }   // Polster
    pb.set(x, y, step(WOOD, l, x, y));
  }
  for (const x of [244, 265]) { pb.rect(x - 2, 68, 4, 3, WOOD[0]); pb.set(x - 1, 67, WOOD[1]); }        // Knäufe
  // Banner mit dem Zeichen des Herrschers (Turm über einer Welle), Schwalbenschwanz
  for (const bx of [70, 206]) {
    for (let y = 18; y < 96; y++) for (let x = bx; x < bx + 24; x++) {
      if (y > 86 && Math.abs(x + .5 - bx - 12) < (y - 86) * 1.2) continue;
      let l = .6 + (x - bx) / 24 * 1.4 + Math.sin((x - bx) * .7) * .35 - (candle(x, y) - .6) * .8;
      pb.set(x, y, step(CLOTH, l, x, y));
    }
    pb.rect(bx - 2, 16, 28, 2, WOOD[2]);
    const mk = ['..LLL..', '..LLL..', '.TTTTT.', '..TTT..', '..T.T..', '..TTT..', '..TTT..', '.TTTTT.', 'TTTTTTT', 'ww.ww.w', '.ww.ww.'];
    mk.forEach((r, j) => [...r].forEach((c, i) => { if (c !== '.') { pb.set(bx + 8 + i, 38 + j * 2, c === 'L' ? '#fff0b0' : '#f0d27a'); pb.set(bx + 8 + i, 39 + j * 2, c === 'L' ? '#fff0b0' : '#d8b45a'); } }));
  }
  pb.outline(EDGE);
  T.room = pb.canvas();
  // Kartentisch: Platte (von leicht oben), Karte, Beine, gesiegelter Befehl
  const tb = new PB(TABLE.x1 - TABLE.x0 + 4, 40), tw = TABLE.x1 - TABLE.x0;
  for (let y = 0; y < 8; y++) for (let x = 2; x < tw + 2; x++) tb.set(x, y, step(WOOD, 1.2 + y * .15 + (vnoise(x / 9, y, 4) - .5) * .8, x, y));
  for (let y = 8; y < 12; y++) for (let x = 2; x < tw + 2; x++) tb.set(x, y, step(WOOD, 2.6 + (y - 8) * .3, x, y));
  for (const lx of [8, tw - 10]) for (let y = 12; y < 40; y++) for (let x = lx; x < lx + 6; x++) tb.set(x, y, step(WOOD, 2.6 + (x - lx) / 6 + (y % 9 === 0 ? -.8 : 0), x, y));
  // Karte: Papier mit Küste und Bergen
  for (let y = 1; y < 7; y++) for (let x = 22; x < tw - 18; x++) {
    const c = vnoise(x / 9, y * 1.2, 77) > .52;
    tb.set(x, y, c ? PAPER[1 + ((x + y) % 3 === 0 ? 1 : 0)] : PAPER[0]);
  }
  for (let x = 22; x < tw - 18; x += 2) tb.set(x, 6, PAPER[2]);
  // Befehl mit Siegel (rechts auf dem Tisch)
  tb.rect(tw - 32, 2, 12, 5, PAPER[0]); for (let x = tw - 31; x < tw - 21; x += 2) tb.set(x, 3, PAPER[3]);
  tb.outline(EDGE);
  T.table = tb.canvas();
  T.seal = siegel('wachs');
  return T;
}
// Kerzenflamme mit Leuchten
function flame(ctx, x, y, t, k) {
  const f = Math.sin(t * 13 + k) * .5 + Math.sin(t * 7.3 + k * 2) * .5;
  ctx.fillStyle = '#fff8d8'; ctx.fillRect(x, y - 3 - (f > .4 ? 1 : 0), 1, 3 + (f > .4 ? 1 : 0));
  ctx.fillStyle = '#ffd070'; ctx.fillRect(x - 1, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1 - (f > 0 ? 1 : 0), 1, 1);
  glow(ctx, x, y - 2, 30 + f * 3, .32, '255,200,120');
}
// Saal zeichnen: Himmel im Fenster, Wand, Tisch mit Kerzen; cam = Verschiebung nach rechts (0–40)
export function drawThrone(ctx, T, t, cam = 0, o = {}) {
  const ox = -Math.round(cam);
  ctx.fillStyle = SKY_N[3]; ctx.fillRect(0, 0, W, H);
  const sx = WIN.x0 + ox - 40;
  ctx.drawImage(T.sky, Math.round(sx - (t * 3) % 70), WIN.top - 4);
  ctx.globalAlpha = .5; ctx.drawImage(T.sky, Math.round(sx - 70 + (t * 6) % 70), WIN.top + 8); ctx.globalAlpha = 1;
  ctx.drawImage(T.sea, WIN.x0 + ox - 4, WIN.bot - 22);
  ctx.drawImage(T.tower, WIN.cx + ox + 6, WIN.bot - 22 - 31);
  // Regen am Fenster
  ctx.fillStyle = 'rgba(200,210,226,.45)';
  for (let i = 0; i < 26; i++) { const y = WIN.top + ((hash(i, 1, 9) * 90 + t * 120) % 90), x = WIN.x0 + ox + ((hash(i, 2, 9) * 50 - (y - WIN.top) * .3 + 60) % 50); ctx.fillRect(Math.round(x), Math.round(y), 1, 3); }
  // Tür: Licht aus dem Gang (o.door 0–1 = offen)
  const d = o.door == null ? 1 : o.door;
  ctx.fillStyle = '#1a1410'; ctx.fillRect(DOOR.x0 + ox, DOOR.top, DOOR.x1 - DOOR.x0, DOOR.bot - DOOR.top);
  if (d > 0) { ctx.fillStyle = `rgba(214,170,110,${.55 * d})`; ctx.fillRect(DOOR.x0 + ox + 4, DOOR.top + 6, DOOR.x1 - DOOR.x0 - 8, DOOR.bot - DOOR.top - 6); glow(ctx, (DOOR.x0 + DOOR.x1) / 2 + ox, DOOR.bot - 20, 40, .25 * d, '255,190,120'); }
  ctx.drawImage(T.room, ox, 0);
  // Fensterkreuz
  ctx.fillStyle = EDGE; ctx.fillRect(WIN.cx + ox - 1, WIN.top, 2, WIN.bot - WIN.top); ctx.fillRect(WIN.x0 + ox, 78, WIN.x1 - WIN.x0, 2);
  ctx.fillStyle = STONE[4]; ctx.fillRect(WIN.cx + ox - 1, WIN.top, 1, WIN.bot - WIN.top); ctx.fillRect(WIN.x0 + ox, 78, WIN.x1 - WIN.x0, 1);
  if (o.figBehind) o.figBehind(ctx, ox);                                   // Figuren hinter dem Tisch (Aurel)
  ctx.drawImage(T.table, TABLE.x0 + ox - 2, TABLE.y);
  ctx.drawImage(T.seal, 0, 0, 25, 25, TABLE.x1 - 30 + ox, TABLE.y - 3, 9, 9);
  // Kerzenleuchter an beiden Enden
  for (const [cx, k] of [[TABLE.x0 + 12, 0], [TABLE.x1 - 12, 2]]) {
    ctx.fillStyle = '#c89a44'; ctx.fillRect(cx + ox - 2, TABLE.y - 2, 5, 2); ctx.fillRect(cx + ox, TABLE.y - 8, 1, 6);
    ctx.fillStyle = '#f2ead6'; ctx.fillRect(cx + ox - 1, TABLE.y - 15, 3, 7);
    flame(ctx, cx + ox, TABLE.y - 15, t, k);
  }
}

/* =========================================================
   FLUT: das Tiefland vom Berg aus (Ebene 420×180, Kamera 0–100)
   ========================================================= */
export const FLOOD_W = 420;
const HOR = 66, PLAIN0 = 92;                                              // Horizont, Beginn der Ebene
export const COAST = 84;                                                  // Küste (x); links davon das Meer
export const FLOOD_TOWER = { x: 76, y: 96 };                              // Leuchtturm an der Küste (Fuß)
const MOUNT = (x) => x < 318 ? 999 : 182 - (x - 318) * 1.5 + Math.sin(x * .13) * 3 + (vnoise(x / 7, 1, 61) - .5) * 6;   // Berg rechts (Oberkante)
const LAND = ['#d6c49c', '#b8a47c', '#98845e', '#786646', '#584a32', '#3a3022', '#221c14'];
const VILLAGES = [{ x: 96, y: 112, n: 5 }, { x: 150, y: 100, n: 4 }, { x: 196, y: 126, n: 6 }, { x: 246, y: 106, n: 5 }, { x: 290, y: 132, n: 4 }, { x: 128, y: 146, n: 4 }];
export function buildFlood() {
  const F = { lights: [] };
  const sky = (dawn) => layer(FLOOD_W, HOR + 2, (x, y) => {
    const c = fbm(x / 40, y / 10, dawn ? 17 : 23, 4);
    const l = dawn ? 1.2 + y / HOR * -.6 + (c - .5) * 2.4 : 3.2 + (c - .5) * 3 - y / HOR * .8;
    return step(SKY_N, l, x, y);
  });
  F.sky = sky(false); F.skyDawn = sky(true);
  const pb = new PB(FLOOD_W, H);
  for (let y = HOR; y < H; y++) for (let x = 0; x < FLOOD_W; x++) {
    const coast = COAST + Math.sin(y * .3) * 4 + (y - HOR) * .35;
    if (x < coast) {   // Meer
      const l = 3.4 + (y - HOR) / 40 - (vnoise(x / 8, y / 1.5, 3) > .66 ? 1.1 : 0);
      pb.set(x, y, step(SKY_N, l, x, y)); continue;
    }
    if (y < PLAIN0) {  // ferne Hügel am Horizont
      const hill = PLAIN0 - 10 - fbm(x / 30, 1, 9, 3) * 18;
      if (y < hill) { pb.set(x, y, step(SKY_N, 3 + (vnoise(x / 4, y, 9) - .5), x, y)); continue; }
    }
    // Felder: Streifen, Hecken, Flüsse
    const d = (y - HOR) / (H - HOR), fx = Math.floor((x - 210) / (24 * (.4 + d)) + y * .05), fy = Math.floor(Math.pow(d, .8) * 12);
    let l = 5 - d * .9 + ((fx + fy) % 3) * .4 + (hash(fx, fy, 5) - .5) * .7;
    if ((x + y * 2) % 4 === 0 && (fx + fy) % 3 === 1) l += .4;             // Furchen
    const river = Math.abs(x - (180 + Math.sin(y * .09) * 40 + (y - 120) * .8)) < 1 + d * 1.5;
    if (river) l = 3.2;
    if (hash(fx, fy, 7) < .25 && (x % 3 === 0) && Math.abs(((x - 210) / (24 * (.4 + d))) % 1) < .08) l = 5;   // Hecken
    pb.set(x, y, step(LAND, l, x, y));
  }
  // Dörfer: kleine Häuser mit Giebeln, Fenster leuchten (Lichter als Liste, damit sie erlöschen können)
  for (const V of VILLAGES) {
    for (let i = 0; i < V.n; i++) {
      const hx = V.x + Math.round((hash(i, 1, V.x) - .5) * 26), hy = V.y + Math.round((hash(i, 2, V.x) - .5) * 8), hw = 5 + (i % 3), hh = 3 + (i % 2);
      for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) pb.set(hx + x, hy - y, x < 2 ? LAND[4] : LAND[5]);
      for (let k = 0; k < Math.ceil(hw / 2) + 1; k++) for (let x = k; x < hw - k; x++) pb.set(hx + x, hy - hh - k, x < hw / 2 ? LAND[5] : LAND[6]);
      F.lights.push({ x: hx + 1 + (i % 2) * 2, y: hy - 1, v: V });
    }
    // Kirchturm im größten Dorf
    if (V.n >= 6) { pb.rect(V.x - 2, V.y - 16, 4, 14, LAND[4]); for (let k = 0; k < 4; k++) pb.rect(V.x - 2 + Math.round(k / 2), V.y - 17 - k, 4 - k, 1, LAND[5]); }
  }
  // Leuchtturm an der Küste (dunkel), auf einem Felsen
  const T = FLOOD_TOWER;
  for (let y = T.y - 3; y < T.y + 6; y++) for (let x = T.x - 9; x < T.x + 9; x++) if (Math.abs(x - T.x) < 9 - (T.y + 6 - y) * .3 * (y < T.y ? 3 : 0)) pb.set(x, y, LAND[5]);
  for (let y = T.y - 30; y < T.y - 2; y++) { const w = 2 + (y - T.y + 30) * .07; for (let x = T.x - 4; x <= T.x + 4; x++) if (Math.abs(x + .5 - T.x) <= w) pb.set(x, y, ((y - T.y) >> 2) % 2 ? LAND[3] : LAND[5]); }
  pb.rect(T.x - 3, T.y - 35, 7, 5, LAND[6]); pb.rect(T.x - 2, T.y - 34, 5, 3, '#2c2a2e'); pb.rect(T.x - 2, T.y - 38, 5, 3, LAND[5]); pb.set(T.x, T.y - 39, LAND[6]);
  // Berg rechts (wird zur Insel): eigene Ebene, liegt über dem Wasser
  const mt = new PB(FLOOD_W, H);
  for (let x = 318; x < FLOOD_W; x++) for (let y = Math.max(0, Math.floor(MOUNT(x))); y < H; y++) {
    const l = 2.6 + (x - 318) / 100 * -.6 + (fbm(x / 9, y / 6, 13, 3) - .5) * 2 + (y - MOUNT(x) < 2 ? -1 : 0);
    mt.set(x, y, step(LAND, l, x, y));
  }
  F.land = pb.canvas(); F.mount = mt.canvas();
  return F;
}
// Die Flut kommt vom Horizont auf den Betrachter zu: front = Bildzeile der Vorderkante (HOR … H + 30).
// Darüber ist alles Wasser; an der Vorderkante steht die Welle als Wand mit Kamm, die näher kommend höher wird.
const waveH = (front) => 3 + Math.max(0, front - HOR) * .32;
const crestAt = (front, x, t) => front - waveH(front) + Math.sin(x * .09 + t * 4) * 1.6 + Math.sin(x * .23 - t * 6) * .8;
export function drawFlood(ctx, F, t, o = {}) {
  const cam = Math.round(o.cam || 0), front = o.flooded ? 9999 : o.front;
  ctx.fillStyle = SKY_N[4]; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(o.dawn ? F.skyDawn : F.sky, -cam - Math.round(t * 2) % 20, 0);
  ctx.drawImage(F.land, -cam, 0);
  // Lichter der Dörfer (nur, was noch nicht überrollt ist)
  for (const Lt of F.lights) {
    if (o.lightsOff || (front != null && Lt.y < front + 1)) continue;
    const fl = .7 + Math.sin(t * 5 + Lt.x) * .15;
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(Lt.x - cam, Lt.y, 1, 1);
    glow(ctx, Lt.x - cam, Lt.y, 7, .4 * fl, '255,214,140');
  }
  if (front == null) { ctx.drawImage(F.mount, -cam, 0); return; }
  const fr = Math.min(front, H + 40), wh = waveH(fr);
  for (let x = 0; x < W; x++) {
    const wx = x + cam, crest = o.flooded ? HOR : crestAt(fr, wx, t);
    for (let y = Math.max(0, Math.floor(Math.min(crest, HOR))); y < Math.min(H, o.flooded ? H : fr + 1); y++) {
      if (y < HOR && y < crest) continue;
      let c;
      const k = y - crest;
      if (!o.flooded && y >= crest) {                                       // die Wand der Welle
        const u = k / wh;
        if (k < 1.5) c = '#f6eedc';
        else if (u > .55 && hash(wx, y + Math.floor(t * 18), 3) < (u - .45) * 1.1) c = u > .8 ? '#f0e8d4' : '#cfc6b0';   // Schaum unten an der Wand
        else c = step(SKY_N, 1.2 + u * 2.2 + (vnoise(wx / 5, y / 2 - t * 5, 8) > .62 ? -1 : 0), wx, y);
      } else {                                                              // Wasser dahinter (bis zum Horizont)
        const deep = clamp((fr - y) / 40, 0, 1);
        c = step(SKY_N, 3.6 - (1 - deep) * .8 + (vnoise(wx / 9, y / 1.4 - t * 3, 21) > .66 ? -1 : 0), wx, y);
        if (!o.flooded && fr - y < 12 && hash(wx, y + Math.floor(t * 10), 5) < .12) c = '#bfb5a0';   // Schaumstreifen hinter dem Kamm
      }
      ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
    }
  }
  // Gischt über dem Kamm
  if (!o.flooded) for (let i = 0; i < 90; i++) {
    const x = hash(i, 1, 44) * W, a = (t * 1.4 + hash(i, 2, 44)) % 1, y = crestAt(fr, x + cam, t) - 1 - a * (4 + wh * .4);
    ctx.fillStyle = `rgba(240,232,214,${(1 - a) * .75})`; ctx.fillRect(Math.round(x + a * 6), Math.round(y), 1, 1);
  }
  ctx.drawImage(F.mount, -cam, 0);
}
export const floodFront = (u) => lerp(HOR - 2, H + 40, Math.pow(clamp(u, 0, 1), 1.35));   // Bildzeile der Welle für u = 0–1
