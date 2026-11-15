/* ---------- Gebäude-Sprites (Breite = Grundfläche, unten bündig) ---------- */
import { PB, BS, line, bay } from '../pixelbuffer.js';
import { hash2 } from '../../util/math.js';

export function makeSaege(f) {
  const pb = new PB(32, 44);
  for (let y = 30; y < 44; y++) for (let x = 1; x < 31; x++) pb.set(x, y, (y % 3 === 0) ? '#a87444' : ((x + (y >> 1) * 3) % 9 === 0 ? '#b8874c' : '#c9995e'));
  pb.rect(3, 13, 26, 17, '#6a4426'); for (let x = 3; x < 29; x += 4) pb.rect(x, 13, 1, 17, '#5a3218');
  pb.rect(2, 9, 2, 29, '#8a5a32'); pb.rect(2, 9, 1, 29, '#a87444'); pb.rect(28, 9, 2, 29, '#7a4a28');
  for (let y = 4; y < 13; y++) for (let x = 0; x < 32; x++) { if (y < 6 && (x < 1 || x > 30)) continue; pb.set(x, y, y === 12 ? '#3f5a24' : ((((x >> 2) + y) % 2) ? '#6a9a3a' : '#5a8a32')); }
  pb.rect(0, 4, 32, 1, '#9ac85a');
  pb.rect(7, 30, 17, 3, '#a87444'); pb.rect(7, 30, 17, 1, '#d8a868'); pb.rect(8, 33, 2, 5, '#5a3218'); pb.rect(21, 33, 2, 5, '#5a3218');
  pb.rect(2, 27, 9, 3, '#8a5a32'); pb.rect(2, 27, 9, 1, '#a87444');
  for (let y = 18; y <= 31; y++) for (let x = 9; x <= 22; x++) {
    const dx = x + 0.5 - 15.5, dy = y + 0.5 - 25, r = Math.hypot(dx, dy);
    if (r > 5.6) continue;
    let c = r < 1.4 ? '#5a5a60' : (dx + dy < 0 ? '#e4e8ec' : '#a8b0b8');
    if (r > 4.3) { const a = Math.atan2(dy, dx) + f * 0.5; c = ((Math.floor(a / (Math.PI / 6)) & 1) ? '#7a8088' : '#c8ccd0'); }
    pb.set(x, y, c);
  }
  [[25, 40], [29, 40], [27, 36]].forEach(([cx, cy]) => {
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) {
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (r <= 2.6) pb.set(x, y, r > 1.9 ? '#6a4426' : (r < 0.7 ? '#a87444' : (Math.floor(r * 2) % 2 ? '#e0be8a' : '#c8a06a')));
    }
  });
  pb.outline('#2e1c10');
  return BS(pb);
}
export function makeBohrer(f) {
  const pb = new PB(32, 46);
  line(pb, 5, 34, 13, 4, '#5a5f68'); line(pb, 6, 34, 14, 4, '#7a808a'); line(pb, 26, 34, 18, 4, '#454a52'); line(pb, 25, 34, 17, 4, '#5a5f68');
  for (let y = 10; y < 34; y += 8) { const a = Math.round(5 + (34 - y) * 8 / 30); line(pb, a, y, 31 - a, y, '#6a6f78'); }
  pb.rect(11, 1, 10, 6, '#c4553f'); pb.rect(11, 1, 10, 1, '#e07a5a'); pb.rect(11, 6, 10, 1, '#93372a');
  pb.rect(15, 7, 2, 30, '#c8ccd0'); pb.rect(16, 7, 1, 30, '#9aa0a8');
  for (let y = 34; y < 46; y++) for (let x = 1; x < 31; x++) pb.set(x, y, y === 34 ? '#c8ccd4' : (x === 1 ? '#b0b6be' : x === 30 ? '#5a5f68' : ((x + y) % 9 === 0 ? '#6a6f78' : '#8a8f98')));
  [[3, 36], [28, 36], [3, 43], [28, 43]].forEach(([x, y]) => pb.set(x, y, '#d8dce0'));
  pb.rect(2, 24, 8, 10, '#e8b45c'); pb.rect(2, 24, 8, 1, '#ffe08a'); pb.rect(9, 24, 1, 10, '#c98a2a'); pb.rect(4, 27, 4, 1, '#5a3a1b'); pb.rect(4, 30, 4, 1, '#5a3a1b');
  for (let y = 36; y < 45; y++) { const half = Math.max(0, Math.round((45 - y) * 0.35)); for (let x = 15 - half; x <= 16 + half; x++) pb.set(x, y, ((y + f * 2 + x) % 3 === 0) ? '#5a5f68' : '#b0b6be'); }
  pb.outline('#22262c');
  return BS(pb);
}
export function makeVerbrennung() {
  const pb = new PB(32, 48);
  pb.rect(5, 0, 7, 24, '#8a8f98'); pb.rect(5, 0, 2, 24, '#b0b6be'); pb.rect(10, 0, 2, 24, '#5a5f68'); pb.rect(4, 0, 9, 2, '#454a52');
  for (let y = 6; y < 24; y += 6) pb.rect(5, y, 7, 1, '#5a5f68');
  for (let y = 20; y < 48; y++) for (let x = 2; x < 30; x++) {
    const row = (y - 20) >> 1, bx = (x + (row & 1) * 2) % 5;
    let c = (y % 2 === 1 || bx === 0) ? '#7a2f22' : (hash2(x >> 1, row, 4) < 0.5 ? '#b8573f' : '#a8432f');
    if (x < 4) c = '#d8644a';
    pb.set(x, y, c);
  }
  pb.rect(16, 24, 10, 12, '#454a52'); pb.rect(17, 25, 8, 10, '#2a2e34');
  [[22, 26], [21, 27], [20, 28], [19, 29], [20, 29], [21, 29], [22, 29], [21, 30], [20, 31], [19, 32], [18, 33]].forEach(([x, y]) => pb.set(x, y, '#ffd23f'));
  pb.rect(5, 36, 9, 12, '#454a52'); pb.rect(6, 37, 7, 11, '#6a6f78'); pb.set(12, 42, '#ffd23f');
  pb.outline('#2a1410');
  return BS(pb, { sm: [8, 0], fire: [7, 39, 5, 3], glow: [9, 40] });
}
export function makeFischer() {
  const pb = new PB(32, 36);
  for (let y = 18; y < 34; y++) for (let x = 4; x < 28; x++) pb.set(x, y, (y % 3 === 0) ? '#b8874c' : (x === 4 ? '#f2d29c' : (x === 27 ? '#c9995e' : '#e6bf85')));
  for (let j = 0; j < 16; j++) { const y = 3 + j, half = Math.round(2 + j * 14 / 15); for (let x = 16 - half; x < 16 + half; x++) pb.set(x, y, j === 15 ? '#2a6860' : ((((x + 40) >> 1) & 1) ? '#5aa8a0' : '#3a8880')); }
  pb.rect(7, 24, 6, 10, '#5a3218'); pb.rect(8, 25, 4, 9, '#7a4a28');
  pb.rect(17, 22, 7, 6, '#5a3218'); pb.rect(18, 23, 5, 4, '#8fd0ea'); pb.set(18, 23, '#dff6ff');
  for (let y = 27; y < 35; y++) for (let x = 20; x < 31; x++) if (((x + y) % 3 === 0 || (x - y + 60) % 3 === 0) && (x > 21 || y > 29)) pb.set(x, y, '#e6dcc0');
  pb.rect(14, 19, 1, 3, '#5a3218'); pb.rect(13, 22, 3, 2, '#8ab0c8');
  pb.rect(0, 27, 5, 7, '#8a5a32'); pb.rect(0, 29, 5, 1, '#5a5f68'); pb.rect(0, 32, 5, 1, '#5a5f68');
  pb.outline('#22302c');
  return BS(pb, { glow: [20, 25] });
}
export function makeWerkzeug() {
  const pb = new PB(32, 38);
  pb.rect(22, 2, 5, 12, '#8a857a'); pb.rect(22, 2, 1, 12, '#b0aa9c'); pb.rect(21, 1, 7, 2, '#5a5650');
  for (let y = 18; y < 38; y++) for (let x = 3; x < 29; x++) { let c = (y % 4 === 0) ? '#8a857a' : ((x + (y >> 2) * 3) % 7 === 0 ? '#9a958a' : '#c6c0b2'); if (x === 3) c = '#e0dccf'; pb.set(x, y, c); }
  for (let j = 0; j < 14; j++) { const y = 5 + j, half = Math.round(2 + j * 15 / 13); for (let x = 16 - half; x < 16 + half; x++) pb.set(x, y, j === 13 ? '#3a3a44' : ((x + j) % 3 === 0 ? '#5a5a66' : '#6a6a78')); }
  pb.rect(6, 26, 6, 12, '#5a3218'); pb.rect(7, 27, 4, 11, '#7a4a28');
  pb.rect(16, 21, 10, 8, '#a87444'); pb.rect(17, 22, 8, 6, '#e6bf85'); pb.rect(18, 23, 5, 2, '#5a5f68'); pb.rect(20, 25, 1, 3, '#7a4a28');
  pb.rect(16, 32, 10, 2, '#454a52'); pb.rect(19, 34, 4, 2, '#2a2e34'); pb.rect(17, 36, 8, 2, '#454a52'); pb.rect(14, 32, 3, 1, '#454a52');
  pb.outline('#22201c');
  return BS(pb, { sm: [24, 1], glow: [21, 25] });
}
export function makeWerft() {
  const pb = new PB(48, 52);
  for (let y = 30; y < 52; y++) for (let x = 0; x < 48; x++) pb.set(x, y, (x % 6 === 0) ? '#7a4a28' : ((y + ((x / 6) | 0)) % 4 === 0 ? '#a87444' : '#c9995e'));
  for (let x = 8; x < 34; x++) {
    const t = (x - 8) / 26, top = Math.round(26 + Math.pow(Math.abs(t - 0.45) * 2, 2) * 6);
    for (let y = top; y < 40; y++) { const rib = (x % 4 === 0); if (rib || y >= 37 || y === top) pb.set(x, y, rib ? '#8a5a32' : (y >= 37 ? '#a87444' : '#d8a868')); }
  }
  pb.rect(39, 6, 4, 40, '#8a5a32'); pb.rect(39, 6, 1, 40, '#a87444'); pb.rect(22, 5, 22, 3, '#7a4a28'); pb.rect(22, 5, 22, 1, '#a87444'); line(pb, 41, 10, 32, 7, '#5a3218');
  pb.rect(26, 8, 1, 14, '#e6dcc0'); pb.rect(24, 22, 5, 3, '#5a5f68');
  pb.rect(36, 44, 10, 3, '#e6bf85'); pb.rect(36, 47, 10, 3, '#d8a868');
  pb.outline('#2a1a0c');
  return BS(pb, { glow: [41, 12] });
}
export function makeKontor(flag) {
  const pb = new PB(32, 42);
  pb.rect(27, 0, 1, 22, '#5a3218'); pb.rect(28, 1, 4, 4, flag); pb.rect(28, 4, 4, 1, '#5a3218');
  for (let y = 20; y < 42; y++) for (let x = 1; x < 31; x++) pb.set(x, y, (x % 5 === 0) ? '#b8874c' : (x < 3 ? '#f2d29c' : (x > 28 ? '#c9995e' : '#e6bf85')));
  for (let j = 0; j < 14; j++) { const y = 8 + j, half = Math.round(3 + j * 13.5 / 13); for (let x = 16 - half; x < 16 + half; x++) pb.set(x, y, j === 13 ? '#2a3a7a' : ((((x >> 1) + j) & 1) ? '#4a6abf' : '#3a5aa8')); }
  pb.rect(11, 28, 10, 14, '#5a3218'); pb.rect(12, 29, 8, 13, '#7a4a28'); pb.rect(16, 29, 1, 13, '#5a3218');
  pb.rect(2, 24, 7, 4, '#8fd0ea'); pb.rect(23, 24, 7, 4, '#8fd0ea'); pb.set(2, 24, '#dff6ff'); pb.set(23, 24, '#dff6ff');
  pb.rect(22, 35, 8, 7, '#c9995e'); line(pb, 22, 35, 29, 41, '#8a5a32'); pb.rect(1, 36, 5, 6, '#8a5a32'); pb.rect(1, 38, 5, 1, '#5a5f68');
  pb.outline('#22201c');
  return BS(pb, { glow: [16, 26] });
}
export function housePB(night) {
  const pb = new PB(31, 31);
  pb.rect(21, 2, 4, 9, '#8a7f76'); pb.rect(21, 2, 1, 9, '#a89d94'); pb.rect(21, 2, 4, 1, '#6a6058');
  for (let y = 4; y <= 14; y++) {
    const half = Math.round(3 + (y - 4) / 10 * 11.5);
    for (let x = 15 - half; x <= 15 + half; x++) {
      let c = (y % 2 === 0) ? '#a8432f' : ((((x + (y >> 1)) >> 1) % 3 === 0) ? '#93372a' : '#c4553f');
      if (x < 15 - half + 2) c = '#e07a5a';
      pb.set(x, y, c);
    }
  }
  pb.rect(0, 15, 31, 1, '#7a2f22');
  for (let y = 16; y <= 28; y++) for (let x = 4; x <= 26; x++) {
    let c = (y % 3 === 0) ? '#c9995e' : '#e6bf85';
    if ((x - 4) % 7 === 0) c = '#b8874c';
    if (x === 4) c = '#f2d29c';
    pb.set(x, y, c);
  }
  pb.rect(3, 29, 25, 1, '#8a7f76');
  pb.rect(8, 20, 5, 9, '#5a3218'); pb.rect(9, 21, 3, 8, '#7a4a28'); pb.set(11, 25, '#f0c050');
  const g = night ? ['#ffd65a', '#fff4c0'] : ['#8fd0ea', '#dff6ff'];
  pb.rect(16, 19, 7, 6, '#5a3218'); pb.rect(17, 20, 5, 4, g[0]); pb.set(17, 20, g[1]); pb.set(18, 20, g[1]); pb.set(17, 21, g[1]);
  pb.rect(19, 20, 1, 4, '#5a3218'); pb.rect(17, 22, 5, 1, '#5a3218');
  pb.rect(16, 25, 7, 2, '#7a4a28'); pb.set(17, 24, '#e0384f'); pb.set(19, 24, '#ffd23f'); pb.set(21, 24, '#e0384f');
  pb.outline('#3a2414');
  return pb;
}
export function makeHuette(night) { const pb = new PB(32, 32); pb.blit(housePB(night), 0, 1); return BS(pb, { sm: [23, 2], glow: [19, 23] }); }
export function makeBuerger(night) {
  const pb = new PB(32, 48);
  pb.rect(22, 0, 4, 10, '#8a7f76'); pb.rect(22, 0, 1, 10, '#a89d94');
  for (let j = 0; j < 16; j++) { const y = 4 + j, half = Math.round(3 + j * 13 / 15); for (let x = 16 - half; x < 16 + half; x++) pb.set(x, y, j === 15 ? '#2a3a7a' : ((y % 2 === 0) ? '#3a5aa8' : ((((x + (y >> 1)) >> 1) % 3 === 0) ? '#2f4a90' : '#4a6abf'))); }
  for (let y = 20; y < 48; y++) for (let x = 3; x < 29; x++) pb.set(x, y, x === 4 ? '#f4f0e4' : '#e8e2d0');
  [3, 10, 21, 28].forEach(x => pb.rect(x, 20, 1, 28, '#7a4a28'));
  pb.rect(3, 20, 26, 1, '#7a4a28'); pb.rect(3, 33, 26, 2, '#7a4a28'); pb.rect(3, 47, 26, 1, '#5a3218');
  line(pb, 11, 21, 20, 32, '#7a4a28'); line(pb, 20, 21, 11, 32, '#7a4a28');
  const g = night ? ['#ffd65a', '#fff4c0'] : ['#8fd0ea', '#dff6ff'];
  const win = (x, y) => { pb.rect(x, y, 4, 5, '#5a3218'); pb.rect(x + 1, y + 1, 2, 3, g[0]); pb.set(x + 1, y + 1, g[1]); };
  win(5, 24); win(23, 24); win(5, 38); win(23, 38);
  pb.rect(13, 37, 6, 10, '#5a3218'); pb.rect(14, 38, 4, 9, '#7a4a28'); pb.set(17, 42, '#f0c050');
  pb.rect(4, 29, 6, 1, '#7a4a28'); pb.set(5, 28, '#e0384f'); pb.set(8, 28, '#ffd23f');
  pb.rect(22, 29, 6, 1, '#7a4a28'); pb.set(23, 28, '#e0384f'); pb.set(26, 28, '#f28ab0');
  pb.outline('#22201c');
  return BS(pb, { sm: [24, 0], glow: [16, 32] });
}

/* ---------- Produktionsketten (Stufe 2–5) ---------- */
// Ziegelmauer-Hilfe: Fläche (x0..x1, y0..y1) mit versetzten Fugen
export function bricks(pb, x0, y0, x1, y1, pal, seed) {
  for (let y = y0; y < y1; y++) {
    const row = (y - y0) >> 1;
    for (let x = x0; x < x1; x++) {
      const bx = (x + (row & 1) * 3) % 6;
      let c = ((y - y0) % 2 === 1 || bx === 0) ? pal[3] : (hash2(x >> 1, row, seed) < 0.5 ? pal[1] : pal[2]);
      if (x < x0 + 2) c = pal[0];
      pb.set(x, y, c);
    }
  }
}
// Stahlblech mit Nieten
export function steel(pb, x0, y0, w, h, pal) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) pb.set(x, y, x === x0 ? pal[0] : x === x0 + w - 1 ? pal[3] : (y - y0) % 7 === 0 ? pal[2] : pal[1]);
  for (let y = y0 + 2; y < y0 + h - 1; y += 7) { pb.set(x0 + 2, y, pal[0]); pb.set(x0 + w - 3, y, pal[0]); }
}
export const STEEL = ['#c8d0da', '#8a94a2', '#6a7482', '#454c58'];

// Schmelzofen: die alte Schmelze mit Kohlehaufen und Gießrinne
export function makeSchmelzofen() {
  const pb = new PB(32, 46);
  pb.rect(20, 0, 7, 22, '#a8432f'); for (let y = 0; y < 22; y += 2) pb.rect(20, y, 7, 1, '#93372a'); pb.rect(20, 0, 1, 22, '#c4553f'); pb.rect(19, 0, 9, 2, '#77736a');
  for (let y = 16; y < 46; y++) {
    const inset = y < 22 ? Math.round((22 - y) * 0.7) : 0;
    for (let x = 2 + inset; x < 30 - inset; x++) {
      const row = (y - 16) >> 1, bx = (x + (row & 1) * 3) % 6;
      let c = (y % 2 === 0 || bx === 0) ? '#77736a' : ((hash2(x >> 1, row, 8) < 0.5) ? '#c6c0b2' : '#b0aa9c');
      if (x < 4 + inset) c = '#d8d4c8';
      pb.set(x, y, c);
    }
  }
  pb.rect(2, 26, 28, 2, '#5a5650'); pb.rect(2, 26, 28, 1, '#8a857a');     // Eisenband
  for (let y = 30; y < 42; y++) for (let x = 9; x < 23; x++) { const dx = x + 0.5 - 16, dy = y + 0.5 - 34; if (y < 34 && Math.hypot(dx, dy * 1.4) > 7) continue; pb.set(x, y, '#2a1a10'); }
  pb.rect(8, 42, 16, 2, '#5a5650');
  // Kohlehaufen links unten, Gießrinne rechts
  for (let y = 39; y < 46; y++) for (let x = 0; x < 8; x++) { const nx = (x + 0.5 - 3.5) / 3.8, ny = (y + 0.5 - 46) / 6.5; if (nx * nx + ny * ny <= 1) pb.set(x, y, (x + y) % 3 ? '#30303a' : '#4a4a56'); }
  pb.rect(24, 40, 8, 3, '#5a5650'); pb.rect(25, 41, 6, 1, '#2a1a10');
  pb.outline('#2e2a24');
  return BS(pb, { sm: [23, 0], fire: [10, 34, 12, 8], glow: [16, 38], lit: [[25, 41, 6, 1, '#e8632a', '#ffd23f']] });
}
// Drahtzieherei: Holzwerkstatt mit großer Kupferdrahtrolle (2 Bilder: Rolle dreht sich)
export function makeDrahtzieherei(f) {
  const pb = new PB(32, 40);
  for (let y = 20; y < 40; y++) for (let x = 2; x < 30; x++) pb.set(x, y, (x % 5 === 0) ? '#8a5a32' : (x < 4 ? '#e0b47a' : (y % 4 === 0 ? '#a87444' : '#c9995e')));
  for (let j = 0; j < 14; j++) { const y = 6 + j, half = Math.round(3 + j * 13 / 13); for (let x = 16 - half; x < 16 + half; x++) pb.set(x, y, j === 13 ? '#4a2e18' : ((((x >> 1) + j) & 1) ? '#7a4a28' : '#6a4426')); }
  pb.rect(0, 20, 32, 1, '#4a2e18');
  pb.rect(4, 26, 9, 14, '#3a2414'); pb.rect(5, 27, 7, 13, '#2a1a10');                    // offenes Tor
  pb.rect(5, 34, 7, 2, '#8a8f98'); line(pb, 6, 33, 11, 33, '#d88040');                      // Ziehbank mit Draht
  // Drahtrolle rechts
  for (let y = 22; y < 38; y++) for (let x = 15; x < 31; x++) {
    const dx = x + 0.5 - 23, dy = y + 0.5 - 30, r = Math.hypot(dx, dy);
    if (r > 7.6) continue;
    const a = Math.atan2(dy, dx) + f * 0.8, ring = Math.floor(r * 1.5) % 2;
    let c = r < 2.2 ? '#5a3218' : r > 6.6 ? '#7a4a28' : ring ? '#f0a060' : '#c8702e';
    if (r >= 2.2 && r <= 6.6 && (Math.floor(a / (Math.PI / 3)) & 1) && ring) c = '#ffc890';
    pb.set(x, y, c);
  }
  pb.rect(22, 29, 2, 2, '#a87444');
  line(pb, 12, 33, 16, 31, '#d88040');
  pb.outline('#22140a');
  return BS(pb, { glow: [8, 30] });
}
// Induktionsofen: Stahlgehäuse, Tiegel mit Kupferspulen, leuchtet im Betrieb
export function makeInduktionsofen() {
  const pb = new PB(32, 44);
  steel(pb, 1, 22, 30, 22, STEEL);
  pb.rect(1, 22, 30, 1, '#e0e6ee');
  // Tiegel (Zylinder) mit Spulen
  for (let y = 4; y < 30; y++) for (let x = 8; x < 24; x++) {
    const nx = (x + 0.5 - 16) / 8;
    pb.set(x, y, nx < -0.6 ? '#9aa4b0' : nx > 0.6 ? '#4e5868' : '#6a7480');
  }
  for (let y = 0; y < 5; y++) for (let x = 8; x < 24; x++) { const nx = (x + 0.5 - 16) / 8, ny = (y + 0.5 - 4) / 3; if (nx * nx + ny * ny <= 1) pb.set(x, y, nx * nx + ny * ny < 0.45 ? '#3a2a1a' : '#b0b8c4'); }
  for (let k = 0; k < 4; k++) { const y = 9 + k * 5; for (let x = 7; x < 25; x++) { pb.set(x, y, x < 11 ? '#ffc890' : x > 21 ? '#a85a20' : '#e08a40'); pb.set(x, y + 1, '#8a4618'); } }
  pb.rect(3, 30, 6, 10, '#2a2e34'); pb.rect(4, 31, 4, 3, '#7cc24f'); pb.rect(4, 35, 4, 1, '#ffd23f'); pb.rect(4, 37, 4, 1, '#e8503c');   // Schaltkasten
  pb.rect(24, 32, 5, 10, '#454c58'); pb.rect(25, 33, 3, 3, '#d88040');
  pb.outline('#14181e');
  return BS(pb, { glow: [16, 6], glowCol: '255,170,80', lit: [[8, 9, 16, 1, '#ff9a2a', '#ffe08a'], [8, 14, 16, 1, '#ff9a2a', '#ffe08a'], [8, 19, 16, 1, '#ff9a2a', '#ffe08a'], [8, 24, 16, 1, '#ff9a2a', '#ffe08a'], [12, 2, 8, 1, '#ff7a1a', '#ffd23f']] });
}
// Graphit-Presse: schwerer Rahmen, Stempel bewegt sich im Betrieb (3 Bilder)
export function makeGraphitpresse(f) {
  const pb = new PB(32, 46);
  const st = [0, 4, 8][f];
  // Sockel
  steel(pb, 1, 34, 30, 12, ['#a8b0ba', '#6a7280', '#565e6a', '#3a404a']);
  for (let x = 2; x < 30; x++) if (((x >> 1) & 1)) pb.set(x, 34, '#ffd23f'); else pb.set(x, 34, '#26262a');
  // Säulen und Querhaupt
  pb.rect(3, 4, 5, 30, '#6a7280'); pb.rect(3, 4, 1, 30, '#a8b0ba'); pb.rect(24, 4, 5, 30, '#565e6a'); pb.rect(28, 4, 1, 30, '#3a404a');
  pb.rect(1, 2, 30, 7, '#7a8290'); pb.rect(1, 2, 30, 1, '#c8d0da'); pb.rect(1, 8, 30, 1, '#454c58');
  pb.rect(12, 0, 8, 2, '#454c58');
  // Kolben + Stempel
  pb.rect(14, 9, 4, 8 + st, '#c8d0da'); pb.rect(17, 9, 1, 8 + st, '#8a94a2');
  pb.rect(9, 17 + st, 14, 4, '#3a404a'); pb.rect(9, 17 + st, 14, 1, '#7a8290');
  // Pressform mit Graphit
  pb.rect(9, 30, 14, 4, '#2a2e34'); pb.rect(10, 31, 12, 2, '#3e4248'); pb.set(12, 31, '#b8c0cc'); pb.set(16, 31, '#b8c0cc');
  pb.outline('#14181e');
  return BS(pb, { glow: [16, 30], fps: 4 });
}
// Silizium-Ofen: Ziegelturm mit drei Elektroden, bläuliches Leuchten im Betrieb
export function makeSiliziumofen() {
  const pb = new PB(32, 50);
  bricks(pb, 5, 10, 27, 50, ['#d8644a', '#a8432f', '#b8573f', '#6a2a1e'], 11);
  for (let y = 30; y < 50; y++) for (let x = 1; x < 31; x++) if (x < 5 || x > 26) pb.set(x, y, x < 3 ? '#9a958a' : (y % 3 ? '#77736a' : '#5a5650'));
  pb.rect(4, 8, 24, 3, '#5a5650'); pb.rect(4, 8, 24, 1, '#8a857a');
  [9, 15, 21].forEach(x => { pb.rect(x, 0, 2, 9, '#8a94a2'); pb.set(x, 0, '#c8d0da'); pb.rect(x - 1, 3, 4, 1, '#d88040'); });
  pb.rect(11, 30, 10, 12, '#26262a'); pb.rect(12, 31, 8, 10, '#14141a');                    // Schauöffnung
  pb.rect(2, 44, 28, 1, '#454a52');
  pb.outline('#22140e');
  return BS(pb, { glow: [16, 34], glowCol: '120,170,255', lit: [[12, 31, 8, 10, '#3a6ad8', '#8ab8ff'], [13, 33, 6, 6, '#8ab8ff', '#e0f0ff'], [9, 0, 2, 1, '#8ab8ff', '#e0f0ff'], [15, 0, 2, 1, '#8ab8ff', '#e0f0ff'], [21, 0, 2, 1, '#8ab8ff', '#e0f0ff']] });
}
// Assembler: Fabrikhalle 3×3 mit Sheddach und Roboterarm in der offenen Halle (4 Bilder)
export function makeAssembler(f) {
  const pb = new PB(48, 56);
  // Wände
  for (let y = 20; y < 56; y++) for (let x = 1; x < 47; x++) pb.set(x, y, x < 3 ? '#e4e8ec' : x > 44 ? '#7a8290' : (x % 8 === 0 ? '#8a94a2' : (y % 6 === 0 ? '#a8b0ba' : '#bcc4ce')));
  // Sheddach (3 Zacken mit Glasflächen)
  for (let k = 0; k < 3; k++) {
    const x0 = 1 + k * 15;
    for (let j = 0; j < 14; j++) {
      const y = 6 + j;
      for (let x = x0; x < x0 + 15; x++) {
        const t = x - x0;
        if (t > j * 15 / 13) continue;
        pb.set(x, y, t > j * 15 / 13 - 2 ? '#8fd0ea' : (j % 3 === 0 ? '#5a6270' : '#6a7280'));
      }
    }
  }
  pb.rect(1, 20, 46, 2, '#454c58');
  // offene Halle
  pb.rect(5, 28, 30, 24, '#3a404a'); pb.rect(6, 29, 28, 23, '#2a2e34');
  pb.rect(6, 46, 28, 3, '#5a5f68'); for (let x = 6; x < 34; x += 3) pb.set(x, 46, '#8a8f98');      // Förderband in der Halle
  // Roboterarm (Sockel, Ober-/Unterarm, Greifer) je Bild anders gestellt
  const A = [[20, 30, 13, 36], [22, 31, 17, 38], [24, 32, 24, 39], [22, 31, 28, 37]][f];
  pb.rect(18, 42, 6, 4, '#ffd23f'); pb.rect(18, 42, 6, 1, '#fff2a0');
  line(pb, 21, 42, A[0], A[1], '#e8b45c'); line(pb, 22, 42, A[0] + 1, A[1], '#c98a2a');
  line(pb, A[0], A[1], A[2], A[3], '#e8b45c'); line(pb, A[0] + 1, A[1], A[2] + 1, A[3], '#c98a2a');
  pb.rect(A[0], A[1] - 1, 2, 2, '#454a52'); pb.rect(A[2] - 1, A[3], 4, 2, '#8a8f98'); pb.set(A[2] - 1, A[3] + 2, '#8a8f98'); pb.set(A[2] + 2, A[3] + 2, '#8a8f98');
  pb.rect(A[2] - 1, 45, 3, 1, '#2f7a3a');   // Platine auf dem Band
  // Fenster, Tür, Lüfter
  pb.rect(38, 28, 6, 5, '#454c58'); pb.rect(39, 29, 4, 3, '#8fd0ea');
  pb.rect(37, 40, 8, 12, '#454c58'); pb.rect(38, 41, 6, 11, '#6a7280'); pb.set(43, 46, '#ffd23f');
  pb.rect(40, 1, 5, 6, '#8a94a2'); pb.rect(40, 1, 5, 1, '#c8d0da');
  pb.outline('#14181e');
  return BS(pb, { glow: [20, 40], fps: 4, sm: [42, 1] });
}
// Pyrolyse-Ofen: Kessel auf Ziegelsockel mit Schornstein, dunkler Rauch und Glut im Betrieb
export function makePyrolyseofen() {
  const pb = new PB(32, 46);
  pb.rect(22, 0, 6, 20, '#3a3a40'); pb.rect(22, 0, 1, 20, '#5a5a62'); pb.rect(21, 0, 8, 2, '#26262a');
  bricks(pb, 2, 34, 30, 46, ['#d8644a', '#a8432f', '#b8573f', '#6a2a1e'], 5);
  // Kessel
  for (let y = 12; y < 36; y++) for (let x = 2; x < 30; x++) {
    const nx = (x + 0.5 - 16) / 13.5, ny = (y + 0.5 - 24) / 12;
    if (nx * nx + ny * ny > 1) continue;
    const l = -(nx * 0.6 + ny * 0.55) + (bay(x, y) - 0.5) * 0.3;
    pb.set(x, y, l > 0.55 ? '#8a8a94' : l > 0.15 ? '#5a5a62' : l > -0.3 ? '#3e3e46' : '#26262a');
  }
  pb.rect(4, 22, 24, 2, '#7a4a28'); pb.rect(4, 22, 24, 1, '#a87444');   // Spannband
  pb.rect(13, 10, 6, 3, '#26262a'); pb.rect(12, 10, 8, 1, '#5a5a62');  // Deckel
  line(pb, 19, 16, 22, 14, '#3a3a40');
  pb.rect(11, 38, 10, 6, '#1a0c04'); pb.rect(12, 39, 8, 5, '#0e0602');  // Feuerloch
  pb.rect(26, 40, 5, 6, '#2a1a10'); pb.rect(26, 40, 5, 1, '#3e2616');    // Teerfass
  pb.outline('#0e0a08');
  return BS(pb, { sm: [25, 0], smDark: true, fire: [12, 40, 8, 4], glow: [16, 41] });
}
// Bohrer Mk2: Stahlgerüst mit Warnstreifen, Motor und Bohrkopf (2 Bilder)
export function makeBohrer2(f) {
  const pb = new PB(32, 48);
  // Turm
  line(pb, 7, 36, 13, 4, '#454c58'); line(pb, 8, 36, 14, 4, '#7a8698'); line(pb, 25, 36, 19, 4, '#3a404a'); line(pb, 24, 36, 18, 4, '#565e6a');
  for (let y = 10; y < 36; y += 6) { const a = Math.round(7 + (36 - y) * 6 / 32); line(pb, a, y, 32 - a, y, '#8a94a2'); }
  pb.rect(10, 0, 12, 5, '#3a6ad8'); pb.rect(10, 0, 12, 1, '#8ab8ff'); pb.rect(10, 4, 12, 1, '#26449a'); pb.set(20, 2, '#7cc24f');
  pb.rect(15, 5, 2, 32, '#e0e6ee'); pb.rect(16, 5, 1, 32, '#a8b4c4');
  // Sockel mit Warnstreifen
  for (let y = 36; y < 48; y++) for (let x = 1; x < 31; x++) {
    let c = y === 36 ? '#dfe6f0' : (x === 1 ? '#a8b4c4' : x === 30 ? '#4e5868' : '#7a8698');
    if (y >= 37 && y <= 39) c = (((x + y) >> 1) & 1) ? '#ffd23f' : '#26262a';
    pb.set(x, y, c);
  }
  // Motorblock
  pb.rect(2, 25, 9, 11, '#565e6a'); pb.rect(2, 25, 9, 1, '#a8b4c4'); pb.rect(4, 28, 5, 1, '#26262a'); pb.rect(4, 30, 5, 1, '#26262a'); pb.rect(4, 32, 5, 1, '#26262a');
  pb.rect(22, 27, 7, 9, '#2a2e34'); pb.rect(23, 28, 5, 2, '#8ab8ff'); pb.rect(23, 31, 2, 1, '#7cc24f'); pb.rect(26, 31, 2, 1, '#e8503c');
  // Bohrkopf
  for (let y = 40; y < 48; y++) { const half = Math.max(0, Math.round((48 - y) * 0.45)); for (let x = 15 - half; x <= 16 + half; x++) pb.set(x, y, ((y + f * 2 + x) % 3 === 0) ? '#4e5868' : '#c8d0da'); }
  pb.outline('#10141a');
  return BS(pb, { glow: [25, 29], glowCol: '140,190,255' });
}

// Räucherei (2×2, Version 17): Holzhütte mit Räucherkammer, Fische hängen unter dem Vordach, Schornstein raucht
export function makeRaeucherei() {
  const pb = new PB(32, 38);
  for (let y = 18; y < 38; y++) for (let x = 3; x < 29; x++) pb.set(x, y, (x % 4 === 0) ? '#5a3218' : (x === 3 ? '#a87444' : ((x + (y >> 2)) % 5 === 0 ? '#6a4426' : '#7a4a28')));
  for (let j = 0; j < 14; j++) { const y = 5 + j, half = Math.round(2 + j * 15 / 13); for (let x = 16 - half; x < 16 + half; x++) pb.set(x, y, j === 13 ? '#3a2414' : ((x + j) % 3 === 0 ? '#5a4a3a' : '#6a5a48')); }
  pb.rect(22, 1, 4, 12, '#6a665c'); pb.rect(22, 1, 1, 12, '#8a8578'); pb.rect(21, 0, 6, 2, '#4a4740');
  pb.rect(6, 26, 7, 12, '#3a2414'); pb.rect(7, 27, 5, 11, '#e8632a'); pb.rect(8, 30, 3, 6, '#ffb04a');
  pb.rect(15, 22, 13, 2, '#5a3218');
  for (const x of [16, 19, 22, 25]) { pb.rect(x, 24, 1, 2, '#3a2414'); pb.rect(x - 1, 26, 3, 5, '#c8782a'); pb.set(x - 1, 26, '#f0c070'); pb.rect(x, 31, 1, 1, '#9a5a24'); }
  pb.outline('#22140a');
  return BS(pb, { sm: [24, 0], smDark: true, glow: [9, 31], glowCol: '#ff9a4a', fire: [7, 30, 5, 6] });
}
