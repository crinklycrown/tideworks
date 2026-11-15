/* ---------- NPC-Inseln (seit Version 16): Stege, Dorfgebäude und Figuren ----------
   Ole (Pfahldorf, graues Holz, Laterne), Brann (Werkstattbucht, Ziegel und Kräne, orange), Aurel (Goldberg, Marmor und Gold).
   Breite = Grundfläche (16 px je Feld), unten bündig wie alle Gebäude. sm = Rauchpunkt (raucht immer), glow = Licht bei Nacht. */
import { PB, BS, spr, line, fromTpl } from '../pixelbuffer.js';
import { hash2 } from '../../util/math.js';
import { bricks, steel, STEEL } from './buildings.js';

const GREY = ['#c8c4b8', '#a8a397', '#8a8578', '#6a665c', '#4a4740'];      // verwittertes Holz (Ole)
const BRICK = ['#e07a5a', '#c4553f', '#a8432f', '#7a2f22'];
const MARBLE = ['#fbf8ee', '#ece6d4', '#d6cdb4', '#b0a688'];
const GOLD = ['#fff2a0', '#ffd23f', '#e0a82a', '#9a6a10'];

// Bretterwand mit senkrechten Fugen
function planks(pb, x0, y0, w, h, pal, seed) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const col = (x - x0) % 4, n = hash2(x >> 2, y >> 3, seed);
    pb.set(x, y, col === 3 ? pal[3] : x === x0 ? pal[0] : n < 0.3 ? pal[2] : pal[1]);
  }
}
// Satteldach (Dreieck mit Streifen), Spitze bei (cx, y0), Höhe h, halbe Breite unten hw
function gable(pb, cx, y0, h, hw, pal) {
  for (let j = 0; j < h; j++) {
    const half = Math.round(1 + j * (hw - 1) / (h - 1));
    for (let x = cx - half; x < cx + half; x++) pb.set(x, y0 + j, j === h - 1 ? pal[3] : (((x >> 1) + j) & 1 ? pal[1] : pal[2]));
    pb.set(cx - half, y0 + j, pal[0]);
  }
}
const win = (pb, x, y, w, h, lit) => { pb.rect(x, y, w, h, '#3a2414'); pb.rect(x + 1, y + 1, w - 2, h - 2, lit ? '#ffd65a' : '#8fd0ea'); pb.set(x + 1, y + 1, lit ? '#fff4c0' : '#dff6ff'); };
// Pfähle unter einem Haus
const stilts = (pb, xs, y0, y1) => { for (const x of xs) { pb.rect(x, y0, 2, y1 - y0, GREY[4]); pb.rect(x, y0, 1, y1 - y0, GREY[3]); } };

/* ---------- Stege (Hauptgebäude, 3×3) ---------- */
function stegOle() {
  const pb = new PB(48, 60);
  // Plattform auf Pfählen
  stilts(pb, [4, 14, 32, 42], 46, 60);
  pb.rect(1, 42, 46, 4, GREY[2]); pb.rect(1, 42, 46, 1, GREY[0]); for (let x = 3; x < 47; x += 5) pb.set(x, 44, GREY[4]);
  // Haus: graue Bretter, Reetdach
  planks(pb, 6, 22, 36, 20, GREY, 11);
  gable(pb, 24, 3, 20, 23, ['#d8c48a', '#b8a060', '#9a8448', '#6a5a30']);
  pb.rect(30, 0, 4, 10, GREY[3]); pb.rect(30, 0, 1, 10, GREY[1]);
  pb.rect(19, 28, 10, 14, '#4a3020'); pb.rect(20, 29, 8, 13, '#6a4426'); pb.set(26, 35, '#f0c050');
  win(pb, 9, 27, 7, 6, false); win(pb, 33, 27, 7, 6, false);
  // Netz über dem Geländer, Fischkorb, Laterne
  for (let x = 2; x < 16; x++) for (let y = 36; y < 42; y++) if ((x + y) % 3 === 0) pb.set(x, y, '#8a8f98');
  pb.rect(38, 36, 7, 6, '#8a5a32'); pb.rect(38, 36, 7, 1, '#c9995e'); pb.set(40, 35, '#9ad0e8'); pb.set(42, 35, '#c8d4e0');
  pb.rect(44, 18, 1, 24, GREY[4]); pb.rect(42, 18, 4, 1, GREY[4]); pb.rect(41, 19, 3, 4, '#3a3a40'); pb.rect(42, 20, 1, 2, '#ffd65a');
  pb.outline('#22201c');
  return BS(pb, { sm: [32, 0], glow: [42, 21] });
}
function stegBrann() {
  const pb = new PB(48, 64);
  // Halle aus Ziegeln mit Sägezahndach
  bricks(pb, 3, 30, 45, 64, BRICK, 5);
  for (let k = 0; k < 3; k++) for (let j = 0; j < 10; j++) for (let x = 3 + k * 14; x < 3 + k * 14 + 14; x++) {
    if (x - (3 + k * 14) > j * 1.4) continue;
    pb.set(x, 20 + j, j === 9 ? '#454c58' : (x - (3 + k * 14) === Math.floor(j * 1.4) ? '#8fd0ea' : STEEL[(j & 1) + 1]));
  }
  pb.rect(3, 29, 42, 1, '#454c58');
  // Schlot
  pb.rect(37, 2, 6, 18, BRICK[2]); for (let y = 2; y < 20; y += 2) pb.rect(37, y, 6, 1, BRICK[3]); pb.rect(36, 2, 8, 2, '#5a5f68');
  // Tor und Fenster
  pb.rect(16, 44, 16, 20, '#3a2414'); for (let y = 45; y < 64; y += 2) pb.rect(17, y, 14, 1, '#6a4426');
  win(pb, 6, 36, 7, 6, false); win(pb, 35, 36, 7, 6, false);
  // Schild mit Zahnrad
  pb.rect(18, 33, 12, 8, '#5a3218'); pb.rect(19, 34, 10, 6, '#e0843a');
  for (const [x, y] of [[23, 35], [24, 35], [22, 36], [25, 36], [22, 37], [25, 37], [23, 38], [24, 38]]) pb.set(x, y, '#3a2414');
  // Amboss vor der Halle
  pb.rect(3, 58, 9, 3, '#454c58'); pb.rect(5, 61, 5, 3, '#5a5f68'); pb.rect(3, 58, 9, 1, '#8a94a2');
  pb.outline('#22201c');
  return BS(pb, { sm: [40, 0], glow: [24, 52] });
}
function stegAurel() {
  const pb = new PB(48, 66);
  // Sockel und Säulenhalle aus Marmor, goldenes Kuppeldach
  pb.rect(1, 58, 46, 8, MARBLE[2]); pb.rect(1, 58, 46, 1, MARBLE[0]); pb.rect(1, 62, 46, 1, MARBLE[3]);
  pb.rect(4, 32, 40, 26, MARBLE[1]);
  for (const x of [5, 13, 31, 39]) { pb.rect(x, 32, 4, 26, MARBLE[0]); pb.rect(x + 3, 32, 1, 26, MARBLE[3]); }
  pb.rect(2, 28, 44, 4, GOLD[2]); pb.rect(2, 28, 44, 1, GOLD[0]); pb.rect(2, 31, 44, 1, GOLD[3]);
  for (let y = 6; y < 28; y++) {
    const r = 18, dy = 28 - y, half = Math.round(Math.sqrt(Math.max(0, r * r - dy * dy * 0.66)));
    for (let x = 24 - half; x < 24 + half; x++) pb.set(x, y, (x - (24 - half)) < 3 ? GOLD[0] : ((x + y) % 7 === 0 ? GOLD[2] : GOLD[1]));
  }
  pb.rect(23, 0, 2, 7, GOLD[3]); pb.rect(22, 0, 4, 2, GOLD[1]);
  pb.rect(19, 40, 10, 18, '#5a3a1b'); pb.rect(20, 41, 8, 17, '#7a4a28'); pb.rect(19, 40, 10, 1, GOLD[1]);
  // Banner rechts und links
  for (const x of [0, 44]) { pb.rect(x + 1, 14, 1, 18, '#5a3218'); pb.rect(x, 15, 4, 10, '#8a2a3a'); pb.rect(x, 18, 4, 2, GOLD[1]); }
  pb.outline('#22201c');
  return BS(pb, { glow: [24, 48] });
}

// Steg des Inselrats (Ende A, 0.23.0): Holzhalle auf Marmorsockel aus Aurels Trümmern, drei Fahnen (Ole, Brann, Goldberg)
function stegRat() {
  const pb = new PB(48, 62);
  pb.rect(1, 54, 46, 8, MARBLE[2]); pb.rect(1, 54, 46, 1, MARBLE[0]); pb.rect(1, 58, 46, 1, MARBLE[3]);
  for (const x of [4, 18, 30, 42]) pb.set(x, 56, MARBLE[3]);
  planks(pb, 5, 30, 38, 24, ['#d8b07a', '#b88c5a', '#9a6e44', '#6a4a2a'], 23);
  gable(pb, 24, 12, 18, 23, ['#a8a397', '#8a8578', '#6a665c', '#4a4740']);
  pb.rect(19, 38, 10, 16, '#4a3020'); pb.rect(20, 39, 8, 15, '#6a4426'); pb.set(26, 46, '#f0c050');
  win(pb, 8, 36, 7, 6, false); win(pb, 33, 36, 7, 6, false);
  // drei Fahnen: Ole (grau-blau), Brann (orange), Goldberg (gold)
  [[6, '#8a8f98'], [24, '#e0843a'], [41, '#e8c43a']].forEach(([x, c], i) => {
    pb.rect(x, 0 + (i === 1 ? 0 : 6), 1, i === 1 ? 14 : 10, '#5a3a1b');
    pb.rect(x + 1, 1 + (i === 1 ? 0 : 6), 5, 4, c); pb.set(x + 5, 4 + (i === 1 ? 0 : 6), c);
  });
  pb.outline('#22201c');
  return BS(pb, { glow: [24, 44] });
}

/* ---------- Dorfgebäude ---------- */
function pfahlhaus(v) {
  const pb = new PB(32, 42);
  stilts(pb, [4, 25], 34, 42);
  pb.rect(1, 31, 30, 3, GREY[2]); pb.rect(1, 31, 30, 1, GREY[0]);
  planks(pb, 4, 17, 24, 14, GREY, 3 + v);
  gable(pb, 16, 2, 16, 15, v & 1 ? ['#9aa0a8', '#7a808a', '#62686f', '#454a52'] : ['#d8c48a', '#b8a060', '#9a8448', '#6a5a30']);
  pb.rect(12, 22, 7, 9, '#4a3020'); pb.rect(13, 23, 5, 8, '#6a4426');
  win(pb, 21, 21, 5, 5, false);
  if (v & 2) { pb.rect(2, 26, 3, 5, '#8a5a32'); pb.set(3, 25, '#c8d4e0'); }
  pb.outline('#22201c');
  return BS(pb, { glow: [23, 23] });
}
function netz() {
  const pb = new PB(32, 22);
  for (const x of [2, 15, 28]) { pb.rect(x, 2, 2, 20, GREY[3]); pb.rect(x, 2, 1, 20, GREY[1]); }
  pb.rect(1, 2, 30, 1, GREY[4]);
  for (let y = 3; y < 17; y++) for (let x = 3; x < 29; x++) {
    const sag = Math.round(Math.sin((x % 13) / 13 * Math.PI) * 2);
    if (y > 15 + sag) continue;
    if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) pb.set(x, y, (x * 3 + y) % 7 ? '#7a8a96' : '#5a6672');
  }
  pb.set(8, 9, '#e8504a'); pb.set(22, 10, '#e8504a');   // Schwimmer
  pb.rect(0, 20, 32, 2, '#a87444');
  pb.outline('#22201c');
  return BS(pb);
}
function raeucher() {
  const pb = new PB(16, 30);
  planks(pb, 1, 14, 14, 16, GREY, 9);
  gable(pb, 8, 5, 9, 8, ['#9aa0a8', '#7a808a', '#62686f', '#454a52']);
  pb.rect(10, 0, 3, 8, '#5a5f68');
  pb.rect(5, 20, 6, 10, '#3a2414');
  pb.set(6, 22, '#e0843a'); pb.set(8, 23, '#ffb050');   // Glut
  pb.outline('#22201c');
  return BS(pb, { sm: [11, 0], glow: [8, 23] });
}
function werkstatt() {
  const pb = new PB(48, 44);
  bricks(pb, 2, 16, 46, 44, BRICK, 17);
  for (let k = 0; k < 3; k++) for (let j = 0; j < 9; j++) for (let x = 2 + k * 15; x < 2 + k * 15 + 15; x++) {
    if (x - (2 + k * 15) > j * 1.7) continue;
    pb.set(x, 7 + j, j === 8 ? '#454c58' : (x - (2 + k * 15) === Math.floor(j * 1.7) ? '#8fd0ea' : STEEL[(j & 1) + 1]));
  }
  pb.rect(38, 0, 5, 10, BRICK[2]); pb.rect(37, 0, 7, 2, '#5a5f68');
  pb.rect(6, 28, 14, 16, '#3a2414'); for (let y = 29; y < 44; y += 2) pb.rect(7, y, 12, 1, '#6a4426');
  win(pb, 25, 24, 8, 7, false); win(pb, 36, 24, 8, 7, false);
  pb.rect(26, 36, 16, 8, '#a87444'); pb.rect(26, 36, 16, 1, '#c9995e'); line(pb, 26, 36, 41, 43, '#7a4a28');   // Werkbank
  pb.rect(29, 33, 3, 3, '#8a94a2'); pb.rect(36, 34, 4, 2, '#e0843a');
  pb.outline('#22201c');
  return BS(pb, { sm: [40, 0], glow: [29, 28] });
}
function kran() {
  const pb = new PB(30, 50);
  // Gittermast (1×1) mit Ausleger nach rechts, Haken und Kiste
  for (let y = 10; y < 46; y++) { pb.set(3, y, '#e0843a'); pb.set(11, y, '#c46a28'); if (y % 6 === 0) line(pb, 3, y, 11, y + 5, '#a85a20'); }
  pb.rect(1, 46, 13, 4, '#5a5f68'); pb.rect(1, 46, 13, 1, '#8a94a2');
  pb.rect(2, 6, 11, 5, '#454c58'); pb.rect(4, 7, 4, 3, '#8fd0ea');
  pb.rect(2, 3, 28, 2, '#e0843a'); for (let x = 4; x < 30; x += 3) pb.set(x, 4, '#a85a20');
  line(pb, 7, 0, 29, 3, '#454c58'); pb.rect(6, 0, 2, 3, '#454c58');
  pb.rect(25, 5, 1, 22, '#3a3a40'); pb.rect(24, 27, 3, 2, '#3a3a40');
  pb.rect(21, 29, 9, 7, '#c9995e'); pb.rect(21, 29, 9, 1, '#e6bf85'); line(pb, 21, 29, 29, 35, '#8a5a32');
  pb.outline('#22201c');
  return BS(pb);
}
function schlot() {
  const pb = new PB(16, 48);
  for (let y = 4; y < 44; y++) {
    const half = 3 + Math.floor((y - 4) / 14);
    for (let x = 8 - half; x < 8 + half; x++) pb.set(x, y, (y % 3 === 0) ? BRICK[3] : (x === 8 - half ? BRICK[0] : ((x + (y >> 1)) % 4 ? BRICK[1] : BRICK[2])));
  }
  pb.rect(4, 2, 8, 3, '#5a5f68'); pb.rect(4, 2, 8, 1, '#8a94a2');
  pb.rect(2, 44, 12, 4, '#7a7468'); pb.rect(2, 44, 12, 1, '#a89d94');
  pb.rect(6, 38, 4, 6, '#3a2414'); pb.set(7, 41, '#ff9a2a');
  pb.outline('#22201c');
  return BS(pb, { sm: [8, 0], glow: [8, 41] });
}
function lager() {
  const pb = new PB(32, 36);
  steel(pb, 2, 14, 28, 22, STEEL);
  for (let j = 0; j < 10; j++) { const half = Math.round(4 + j * 11 / 9); for (let x = 16 - half; x < 16 + half; x++) pb.set(x, 4 + j, j === 9 ? '#5a3218' : ((x + j) % 4 ? '#c4553f' : '#a8432f')); }
  pb.rect(10, 22, 12, 14, '#3a2414'); for (let y = 23; y < 36; y += 2) pb.rect(11, y, 10, 1, '#5a5f68');
  for (const [x, y] of [[0, 28], [24, 29], [27, 24]]) { pb.rect(x, y, 6, 6, '#c9995e'); pb.rect(x, y, 6, 1, '#e6bf85'); line(pb, x, y, x + 5, y + 5, '#8a5a32'); }
  pb.outline('#22201c');
  return BS(pb);
}
function villa(v) {
  const pb = new PB(32, 46);
  pb.rect(1, 42, 30, 4, MARBLE[2]); pb.rect(1, 42, 30, 1, MARBLE[0]);
  pb.rect(3, 20, 26, 22, MARBLE[1]); pb.rect(3, 20, 2, 22, MARBLE[0]); pb.rect(27, 20, 2, 22, MARBLE[3]);
  for (const x of [6, 13, 19]) { pb.rect(x, 26, 6, 9, '#3a2414'); pb.rect(x + 1, 27, 4, 7, v & 1 ? '#8fd0ea' : '#a8d8f0'); pb.rect(x, 26, 6, 1, GOLD[2]); }
  pb.rect(13, 35, 6, 7, '#7a4a28'); pb.rect(13, 35, 6, 1, GOLD[1]);
  // Walmdach in Gold oder Terrakotta
  const R = v & 2 ? ['#e07a5a', '#c4553f', '#a8432f', '#7a2f22'] : [GOLD[0], GOLD[1], GOLD[2], GOLD[3]];
  for (let j = 0; j < 14; j++) { const y = 6 + j, half = Math.round(6 + j * 10 / 13); for (let x = 16 - half; x < 16 + half; x++) pb.set(x, y, j === 13 ? R[3] : (((x >> 1) + j) & 1 ? R[1] : R[2])); pb.set(16 - half, y, R[0]); }
  pb.rect(15, 0, 1, 7, '#5a3218'); pb.rect(16, 0, 5, 3, '#8a2a3a');
  pb.outline('#22201c');
  return BS(pb, { glow: [16, 30] });
}
function terrasse() {
  const pb = new PB(48, 32);
  // Drei Stufen mit Mauern aus goldgelbem Stein, darauf Reben und Zitronenbäumchen
  for (let k = 0; k < 3; k++) {
    const y = 8 + k * 8, x0 = 2 + k * 2, x1 = 46 - k * 2;
    for (let x = x0; x < x1; x++) for (let yy = y; yy < y + 8; yy++) {
      const wall = yy >= y + 5;
      pb.set(x, yy, wall ? ((x + (yy & 1) * 2) % 4 === 0 ? '#9a7a3a' : (yy === y + 5 ? '#e8c87a' : '#c8a458')) : (yy === y ? '#9ad05a' : ((x + yy) % 5 ? '#6aa03a' : '#5a8a32')));
    }
    for (let x = x0 + 3; x < x1 - 3; x += 6) { pb.rect(x, y - 3, 1, 4, '#6a4426'); pb.set(x - 1, y - 3, '#7a3a8a'); pb.set(x + 1, y - 2, '#7a3a8a'); pb.set(x, y - 4, '#5a8a32'); }
  }
  for (const x of [8, 38]) { pb.rect(x, 0, 5, 5, '#4a8a2a'); pb.set(x + 1, 1, GOLD[1]); pb.set(x + 3, 3, GOLD[1]); pb.rect(x + 2, 5, 1, 3, '#6a4426'); }
  pb.outline('#22201c');
  return BS(pb);
}
function banner(v) {
  const pb = new PB(16, 42);
  pb.rect(7, 2, 2, 38, '#6a4426'); pb.rect(7, 2, 1, 38, '#a87444'); pb.rect(6, 0, 4, 3, GOLD[1]);
  pb.rect(3, 39, 10, 3, MARBLE[2]); pb.rect(3, 39, 10, 1, MARBLE[0]);
  const C = v & 1 ? ['#8a2a3a', '#a83a4a'] : ['#3a2a8a', '#4a3aa8'];
  for (let y = 5; y < 26; y++) for (let x = 9; x < 15; x++) { if (y > 22 && Math.abs(x - 12) < y - 22) continue; pb.set(x, y, x === 9 ? C[1] : C[0]); }
  pb.rect(9, 10, 6, 2, GOLD[1]); pb.set(12, 15, GOLD[0]); pb.set(11, 16, GOLD[1]); pb.set(13, 16, GOLD[1]); pb.set(12, 17, GOLD[1]);
  pb.outline('#22201c');
  return BS(pb);
}

// Laterne (1×1, wächst mit dem Dorf): Pfahl mit Lampe, leuchtet nachts
function laterne(v) {
  const pb = new PB(16, 30);
  const P = v === 1 ? ['#e6e0d0', '#8a5a32'] : v === 2 ? [GOLD[1], '#6a4426'] : [GREY[1], GREY[3]];
  pb.rect(7, 8, 2, 20, P[1]); pb.rect(7, 8, 1, 20, P[0]); pb.rect(4, 27, 8, 3, P[1]);
  pb.rect(5, 1, 6, 1, '#3a2414'); pb.rect(5, 2, 6, 5, '#ffd65a'); pb.rect(6, 3, 2, 2, '#fff4c0'); pb.rect(5, 7, 6, 1, '#3a2414'); pb.rect(5, 2, 1, 5, '#3a2414'); pb.rect(10, 2, 1, 5, '#3a2414');
  pb.outline('#22201c');
  return BS(pb, { glow: [8, 4] });
}

/* ---------- Figuren am Steg (Anker = Füße) ---------- */
const FIG = {
  ole: [['..hhh..', '.hSSSh.', '.SeSeS.', '.SBBBS.', '..BBB..', 'CCCCCCL', 'CCCCCCL', '.CCCC.L', '.CCCC..', '.CCCC..', '.P..P..', '.P..P..'],
    { h: '#c8ccd4', S: '#f0c49a', e: '#2a1a10', B: '#e8e8e4', C: '#3f5a8a', P: '#4a4740', L: '#ffd65a' }],
  brann: [['..rrr..', '.rSSSr.', '.SeSeS.', '..SSS..', '.WWWWW.', 'SAAAAAS', 'SAAAAAS', '.AAAAA.', '.AAAAA.', '.WWWWW.', '.P...P.', '.P...P.'],
    { r: '#e0843a', S: '#f0c49a', e: '#2a1a10', W: '#e6e0d0', A: '#8a5a32', P: '#454c58' }],
  aurel: [['.G.G.G.', '.GGGGG.', '.SSSSS.', '.SeSeS.', '..SSS..', 'RRGGGRR', 'RRRRRRR', '.RRRRR.', '.RRGRR.', '.RRRRR.', '.RRRRR.', '..G.G..'],
    { G: '#ffd23f', S: '#f0c49a', e: '#2a1a10', R: '#7a3a9a' }],
  // Inselrat (Ende A): Bürgerin in schlichtem Mantel mit dreifarbiger Schärpe
  rat: [['..hhh..', '.hSSSh.', '.SeSeS.', '..SSS..', '.MMMMM.', 'SMoMMMS', 'SMMbMMS', '.MMMgM.', '.MMMMM.', '.MMMMM.', '.P...P.', '.P...P.'],
    { h: '#6a4a2a', S: '#f0c49a', e: '#2a1a10', M: '#7a6a52', o: '#8a8f98', b: '#e0843a', g: '#e8c43a', P: '#4a4740' }]
};
const makeFigure = (id) => spr(fromTpl(FIG[id][0], FIG[id][1], '#22201c'), 4, 13);
// Kartensymbole der NPC-Inseln (Minimap, Kartenansicht, Inselliste): Pfahlhaus, Zahnrad, Krone; Rand aus „.“ für die Kontur
const MARK = {
  ole: [['....R....', '...RRR...', '..RRRRR..', '.RRRRRRR.', '..WWDWW..', '..WWDWW..', '..P...P..', 'BBPBBBPBB'],
    { R: '#b4543a', W: '#d8b07a', D: '#5a3a22', P: '#7a4a28', B: '#4aa0d8' }],
  brann: [['....G....', '.G.GGG.G.', '..GGGGG..', '.GGG.GGG.', 'GGG...GGG', '.GGG.GGG.', '..GGGGG..', '.G.GGG.G.', '....G....'],
    { G: '#e0843a' }],
  aurel: [['Y...Y...Y', 'YY.YRY.YY', 'YYYYYYYYY', 'YRYYBYYRY', 'YYYYYYYYY', '.DDDDDDD.'],
    { Y: '#f2d040', R: '#e0384f', B: '#3f8fe8', D: '#b08a1a' }]
};
const pad = (rows) => ['.'.repeat(rows[0].length + 2), ...rows.map(r => '.' + r + '.'), '.'.repeat(rows[0].length + 2)];
const makeMark = (id) => { const pb = fromTpl(pad(MARK[id][0]), MARK[id][1], '#22201c'); return spr(pb, pb.w >> 1, pb.h >> 1); };

export function npcSprites() {
  return {
    b: {
      npc_pfahlhaus: [0, 1, 2, 3].map(pfahlhaus), npc_netz: netz(), npc_raeucher: raeucher(),
      npc_werkstatt: werkstatt(), npc_kran: kran(), npc_schlot: schlot(), npc_lager: lager(),
      npc_villa: [0, 1, 2, 3].map(villa), npc_terrasse: terrasse(), npc_banner: [0, 1].map(banner),
      npc_laterne: { ole: laterne(0), brann: laterne(1), aurel: laterne(2) }
    },
    hafen: { ole: stegOle(), brann: stegBrann(), aurel: stegAurel(), rat: stegRat() },
    fig: { ole: makeFigure('ole'), brann: makeFigure('brann'), aurel: makeFigure('aurel'), rat: makeFigure('rat') },
    mark: { ole: makeMark('ole'), brann: makeMark('brann'), aurel: makeMark('aurel') }
  };
}
// Bild eines NPC-Gebäudes; Varianten (Liste) nach Gebäude-Id. b.ruin (seit 0.23.0): Ruine aus demselben Bild (ruinOf)
export function npcSprite(NS, b) {
  let s;
  if (b.t === 'npchafen') s = NS.hafen[b.npc] || (b.npc === 'rat' ? NS.hafen.rat : NS.hafen.ole);
  else { s = NS.b[b.t]; if (b.t === 'npc_laterne') s = s[b.npc] || s.ole; else if (Array.isArray(s)) s = s[b.id % s.length]; }
  return b.ruin ? ruinOf(NS, s, b) : s;
}

/* ---------- Ruinen (Enden, seit 0.23.0): aus dem fertigen Bild erzeugt, je Bild und Art einmal ----------
   brand = Brandruine (Ende A, Goldberg): verkohlt, schwarz und braun, Dach weg.
   sturm = vom Sturm zerstört (Ende B, Pfahldorf, Werkstattbucht): grau, nass, Moos; vom Steg bleiben nur die Pfähle.
   Die Mauern brechen in einer gezackten Linie ab (Rest = keep des Bilds von unten), unten liegt Schutt. Kein Licht, kein Rauch. */
const RUIN = {
  brand: { ramp: ['#6a5a50', '#4a3e38', '#30282a', '#1c1618'], keep: 0.5, accent: '#7a3a1e', moss: null },
  sturm: { ramp: ['#a8a89c', '#808276', '#5c5e56', '#3c3e3a'], keep: 0.42, accent: '#6a8a5a', moss: '#4e6e44' }
};
export function ruinOf(NS, s, b) {
  const cache = NS.ruins || (NS.ruins = new Map()), key = s;
  let m = cache.get(key);
  if (!m) cache.set(key, m = {});
  return m[b.ruin] || (m[b.ruin] = makeRuin(s, b.ruin, b.t === 'npchafen' ? 0.27 : null));
}
function makeRuin(s, kind, keepFrac) {
  const R = RUIN[kind] || RUIN.sturm, w = s.w, h = s.h, d = s.cv.getContext('2d').getImageData(0, 0, w, h).data;
  const pb = new PB(w, h), keep = Math.max(9, Math.round(h * (keepFrac || R.keep)));
  const seed = w * 31 + h;
  for (let x = 0; x < w; x++) {
    const cut = h - keep + Math.round((hash2(x >> 1, 3, seed) - 0.5) * 9 + Math.abs(Math.sin(x * 0.45 + seed)) * 4);
    for (let y = Math.max(0, cut); y < h; y++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 128) continue;
      const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
      let c = R.ramp[lum > 0.7 ? 0 : lum > 0.48 ? 1 : lum > 0.28 ? 2 : 3];
      if (y - cut < 2 && hash2(x, y, seed + 1) < 0.5) c = R.ramp[3];                         // Bruchkante
      else if (R.moss && hash2(x, y, seed + 2) < 0.08) c = R.moss;                            // Moos, Algen
      else if (kind === 'brand' && hash2(x >> 1, y >> 1, seed + 3) < 0.07) c = R.accent;      // verkohltes Holz
      pb.set(x, y, c);
    }
  }
  // Schutt am Boden: Steine, Balken
  for (let x = 1; x < w - 1; x++) for (let k = 0; k < 3; k++) {
    if (hash2(x, k, seed + 5) > 0.42 - k * 0.12) continue;
    pb.set(x, h - 1 - k, hash2(x, k, seed + 6) < 0.25 ? R.accent : R.ramp[1 + ((x + k) % 3)]);
  }
  pb.outline('#1a1714');
  return BS(pb);
}
