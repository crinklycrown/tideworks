/* ---------- Sprites für Flüssigkeiten: Rohre, Pumpen, Tank, Kraftwerke, Reaktor, Ingenieurshaus, Multi-Bohrer ---------- */
import { PB, spr, BS, line, bay } from '../pixelbuffer.js';
import { DIRS } from '../../config.js';
import { bricks, steel, STEEL } from './buildings.js';

// Rohrfarben je Stufe: [Glanz, hell, mittel, dunkel, Rand], ring = Verbindungsmuffe
export const PIPE_PAL = {
  1: { c: ['#ffd8b0', '#f0a868', '#c87840', '#8a4a20', '#3a1a08'], ring: '#6a3414' },                     // Kupfer
  2: { c: ['#f4f8fc', '#c8d0da', '#949eac', '#5e6876', '#1e242c'], ring: '#3a424e' },                     // Stahl
  3: { c: ['#ffffff', '#eef0f2', '#cfd4da', '#9aa2ac', '#3a4048'], ring: '#3fb0a0', ring2: '#2a7a70' }    // weiß/grau mit Kunststoffringen
};
// Rohr-Sprite für eine Verbindungsmaske (Bit d = Nachbar in Richtung DIRS[d]: 0 rechts, 1 unten, 2 links, 3 oben)
export function pipePB(tier, mask) {
  const P = PIPE_PAL[tier], c = P.c, pb = new PB(16, 16);
  // Querschnitt 6 Pixel (5..10): von hell (oben/links) nach dunkel
  const shade = (i) => [c[4], c[0], c[1], c[2], c[3], c[4]][i];
  const arm = (d) => {
    const [fx, fy] = DIRS[d];
    for (let t = 0; t < 8; t++) for (let i = 0; i < 6; i++) {
      const along = fx ? (fx > 0 ? 8 + t : 7 - t) : 0, alongY = fy ? (fy > 0 ? 8 + t : 7 - t) : 0;
      if (fx) pb.set(along, 5 + i, shade(i)); else pb.set(5 + i, alongY, shade(i));
    }
    // Muffe am Feldrand (Verbindung zum Nachbarn)
    for (let i = -1; i < 7; i++) for (let t = 0; t < 2; t++) {
      const e = (fx > 0 || fy > 0) ? 15 - t : t, col = i < 0 || i > 5 ? c[4] : t === 0 ? P.ring : (i < 2 ? c[1] : c[3]);
      if (fx) pb.set(e, 5 + i, col); else pb.set(5 + i, e, col);
    }
    // Kunststoffring in der Mitte des Arms (Mk3)
    if (P.ring2) for (let i = 0; i < 6; i++) { const e = (fx > 0 || fy > 0) ? 11 : 4; if (fx) pb.set(e, 5 + i, i < 2 ? P.ring : P.ring2); else pb.set(5 + i, e, i < 2 ? P.ring : P.ring2); }
  };
  for (let d = 0; d < 4; d++) if (mask & (1 << d)) arm(d);
  const straight = mask === 5 || mask === 10;
  if (!straight) {
    // Knotenstück (Ecke, T, Kreuz, Ende oder einzelnes Rohr)
    for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) {
      const e = x === 4 || y === 4 || x === 11 || y === 11;
      pb.set(x, y, e ? c[4] : (x === 5 || y === 5) ? c[0] : (x === 10 || y === 10) ? c[3] : c[2]);
    }
    pb.set(6, 6, c[0]); pb.set(9, 9, c[3]);
    [[5, 5], [10, 5], [5, 10], [10, 10]].forEach(([x, y]) => pb.set(x, y, P.ring));
  }
  return pb;
}
export const pipeSprites = (tier) => Array.from({ length: 16 }, (_, m) => spr(pipePB(tier, m), 0, 0));

/* ---------- Gebäude ---------- */
// Wasserpumpe 1×1: Gehäuse am Wasser, Schwengel bewegt sich (4 Bilder)
export function makePumpe(f) {
  const pb = new PB(16, 28);
  const a = [0, 2, 4, 2][f];
  // Sockel
  for (let y = 18; y < 28; y++) for (let x = 1; x < 15; x++) pb.set(x, y, x === 1 ? '#a8b0ba' : x === 14 ? '#454c58' : y === 18 ? '#c8d0da' : (y % 4 === 0 ? '#6a7482' : '#8a94a2'));
  // Pumpenkörper
  pb.rect(4, 8, 7, 11, '#3a6ad8'); pb.rect(4, 8, 2, 11, '#6a9aff'); pb.rect(9, 8, 2, 11, '#26449a');
  pb.rect(3, 7, 9, 2, '#8a94a2'); pb.rect(3, 7, 9, 1, '#c8d0da');
  // Auslauf
  pb.rect(11, 12, 4, 2, '#8a94a2'); pb.rect(13, 14, 2, 2, '#6a7482'); pb.set(14, 16, '#8fd0ea');
  // Schwengel (Drehpunkt 7,6)
  line(pb, 7, 6, 1, 2 + a, '#5a3218'); line(pb, 7, 5, 1, 1 + a, '#a87444');
  pb.rect(6, 4, 3, 3, '#454c58'); pb.set(7, 5, '#c8d0da');
  pb.rect(7, 2, 1, 4, '#c8d0da');
  // Wassertropfen-Zeichen
  pb.set(7, 12, '#d8f4ff'); pb.rect(6, 13, 3, 2, '#d8f4ff'); pb.set(7, 15, '#8fd0ea');
  pb.outline('#14181e');
  return BS(pb, { fps: 4 });
}
// Tank 2×2: Stahlzylinder mit Schauglas (gauge = Füllstand in Netzfarbe)
export function makeTank() {
  const pb = new PB(32, 42);
  for (let y = 6; y < 42; y++) for (let x = 2; x < 30; x++) {
    const nx = (x + 0.5 - 16) / 14;
    let c = nx < -0.7 ? '#e0e6ee' : nx < -0.3 ? '#b8c2ce' : nx < 0.4 ? '#949eac' : nx < 0.75 ? '#6a7482' : '#454c58';
    if (y % 9 === 0) c = '#5e6876';
    pb.set(x, y, c);
  }
  // Deckel (Ellipse)
  for (let y = 0; y < 12; y++) for (let x = 2; x < 30; x++) { const nx = (x + 0.5 - 16) / 14, ny = (y + 0.5 - 6) / 5.5; const d = nx * nx + ny * ny; if (d <= 1) pb.set(x, y, d > 0.8 ? '#8a94a2' : (nx < 0 ? '#eef2f6' : '#c8d0da')); }
  pb.rect(14, 1, 4, 3, '#5e6876'); pb.rect(14, 1, 4, 1, '#a8b0ba');
  // Schauglas mit Skala
  pb.rect(9, 14, 6, 24, '#26262a'); pb.rect(10, 15, 4, 22, '#3a404a');
  for (let y = 16; y < 37; y += 5) pb.rect(15, y, 2, 1, '#ffd23f');
  // Füße und Leitern
  pb.rect(3, 39, 4, 3, '#3a404a'); pb.rect(25, 39, 4, 3, '#3a404a');
  for (let y = 12; y < 38; y += 3) pb.rect(22, y, 4, 1, '#c8d0da'); pb.rect(22, 12, 1, 26, '#c8d0da'); pb.rect(25, 12, 1, 26, '#c8d0da');
  pb.outline('#14181e');
  return BS(pb, { gauge: [10, 15, 4, 22] });
}
// Dampfkraftwerk 2×2: Ziegelhalle mit Kühlturm (Dampf), Feuerluke
export function makeKraftwerk() {
  const pb = new PB(32, 54);
  // Kühlturm rechts hinten (Hyperboloid)
  for (let y = 4; y < 36; y++) {
    const t = (y - 4) / 31, half = Math.round(5 + 3 * Math.pow(Math.abs(t - 0.55) / 0.55, 1.6) * 1.0);
    for (let x = 23 - half; x <= 23 + half; x++) {
      const nx = (x - 23) / half;
      pb.set(x, y, nx < -0.5 ? '#e8e6e0' : nx < 0.3 ? '#cfccc4' : nx < 0.7 ? '#a8a49a' : '#86827a');
    }
  }
  for (let x = 15; x < 32; x++) pb.set(x, 4, '#77736a');
  // Halle
  bricks(pb, 1, 22, 21, 54, ['#d8644a', '#a8432f', '#b8573f', '#6a2a1e'], 21);
  for (let y = 36; y < 54; y++) for (let x = 21; x < 31; x++) pb.set(x, y, x === 30 ? '#5a5650' : (y % 3 ? '#9a958a' : '#77736a'));
  // Dach
  pb.rect(0, 20, 22, 3, '#5a5650'); pb.rect(0, 20, 22, 1, '#8a857a');
  // Fenster mit Bogen
  [4, 13].forEach(x => { pb.rect(x, 27, 5, 7, '#3a2414'); pb.rect(x + 1, 28, 3, 6, '#8fd0ea'); pb.set(x + 1, 28, '#dff6ff'); });
  // Feuerluke
  pb.rect(6, 41, 10, 8, '#26262a'); pb.rect(7, 42, 8, 7, '#14100c');
  pb.rect(5, 49, 12, 2, '#5a5650');
  // Rohranschluss links
  pb.rect(0, 45, 3, 4, '#8a94a2'); pb.rect(0, 45, 3, 1, '#c8d0da');
  // Schornstein auf der Halle
  pb.rect(3, 10, 4, 11, '#a8432f'); pb.rect(3, 10, 1, 11, '#c4553f'); pb.rect(2, 9, 6, 2, '#77736a');
  pb.outline('#22140e');
  return BS(pb, { sm: [23, 3], steam: true, fire: [7, 42, 8, 7], glow: [11, 45], lit: [[25, 40, 3, 2, '#e8632a', '#ffd23f']] });
}
// Saugpumpe 2×2: Pferdekopfpumpe, Schwinge nickt (4 Bilder)
export function makeSaugpumpe(f) {
  const pb = new PB(32, 36);
  const ang = [-0.22, 0, 0.22, 0][f];
  // Fundament
  for (let y = 30; y < 36; y++) for (let x = 0; x < 32; x++) pb.set(x, y, y === 30 ? '#8a857a' : (x + y) % 5 === 0 ? '#5a5650' : '#6a665e');
  // Bohrloch-Kopf rechts
  pb.rect(25, 22, 4, 8, '#454c58'); pb.rect(24, 22, 6, 2, '#6a7482'); pb.rect(26, 26, 2, 1, '#2e2018');
  // Bock (A-Rahmen)
  line(pb, 10, 30, 15, 9, '#ffb020'); line(pb, 20, 30, 15, 9, '#c88010'); line(pb, 11, 30, 15, 10, '#ffd060');
  line(pb, 12, 22, 18, 22, '#c88010');
  // Getriebe mit Kurbel links
  pb.rect(2, 22, 8, 8, '#3a404a'); pb.rect(2, 22, 8, 1, '#8a94a2');
  const cx = 6 + Math.round(Math.sin(f * Math.PI / 2) * 3), cy = 22 - Math.round(Math.cos(f * Math.PI / 2) * 3);
  // Schwinge um (15, 9)
  const pt = (d) => [15 + Math.cos(ang) * d, 9 + Math.sin(ang) * d];
  const [ax, ay] = pt(-12), [bx, by] = pt(11);
  line(pb, ax, ay, bx, by, '#ffb020'); line(pb, ax, ay + 1, bx, by + 1, '#c88010');
  line(pb, ax, ay, cx, cy, '#5e6876');
  // Pferdekopf
  for (let k = -3; k <= 4; k++) { pb.set(bx + 1, by + k, '#ffb020'); pb.set(bx + 2, by + k, k < 0 ? '#ffd060' : '#c88010'); }
  line(pb, bx + 2, by + 4, 27, 22, '#26262a');
  pb.rect(14, 8, 3, 3, '#454c58');
  pb.outline('#1a1208');
  return BS(pb, { fps: 3 });
}
// Chemie-Reaktor 3×3: Stahlhalle mit drei Glasröhren (tubes: Flüssigkeit in Rezeptfarbe, blubbert im Betrieb)
export function makeReaktor() {
  const pb = new PB(48, 62);
  steel(pb, 1, 26, 46, 36, STEEL);
  pb.rect(1, 26, 46, 1, '#e0e6ee');
  // Kessel hinten
  for (let y = 4; y < 30; y++) for (let x = 12; x < 36; x++) { const nx = (x + 0.5 - 24) / 12, ny = (y + 0.5 - 16) / 13; if (nx * nx + ny * ny > 1) continue; const l = -(nx * 0.7 + ny * 0.5) + (bay(x, y) - 0.5) * 0.3; pb.set(x, y, l > 0.5 ? '#eef2f6' : l > 0.1 ? '#b8c2ce' : l > -0.3 ? '#8a94a2' : '#5e6876'); }
  pb.rect(21, 0, 6, 5, '#5e6876'); pb.rect(21, 0, 6, 1, '#a8b0ba');
  // drei Glasröhren vorne
  [6, 20, 34].forEach(x => {
    pb.rect(x, 30, 8, 26, '#2a2e34');
    pb.rect(x + 1, 31, 6, 24, '#a8dcf0'); pb.rect(x + 1, 31, 1, 24, '#e8f8ff');
    pb.rect(x - 1, 29, 10, 2, '#8a94a2'); pb.rect(x - 1, 55, 10, 2, '#8a94a2');
  });
  // Leitungen
  line(pb, 10, 29, 16, 22, '#c8d0da'); line(pb, 38, 29, 32, 22, '#c8d0da'); pb.rect(23, 26, 2, 4, '#c8d0da');
  // Schaltkasten
  pb.rect(42, 34, 4, 8, '#26262a'); pb.set(43, 35, '#7cc24f'); pb.set(43, 37, '#ffd23f');
  pb.rect(1, 57, 46, 5, '#454c58'); pb.rect(1, 57, 46, 1, '#8a94a2');
  pb.outline('#14181e');
  return BS(pb, { glow: [24, 40], glowCol: '170,240,140', tubes: [[7, 31, 6, 24], [21, 31, 6, 24], [35, 31, 6, 24]], sm: [24, 0] });
}
// Geothermie-Generator 2×2: Metallkuppel, orange Glut im Betrieb
export function makeGeothermie() {
  const pb = new PB(32, 34);
  for (let y = 26; y < 34; y++) for (let x = 0; x < 32; x++) pb.set(x, y, y === 26 ? '#8a857a' : (x % 4 === 0 ? '#3a3632' : '#4e4a44'));
  for (let y = 2; y < 28; y++) for (let x = 2; x < 30; x++) {
    const nx = (x + 0.5 - 16) / 14, ny = (y + 0.5 - 27) / 25;
    if (nx * nx + ny * ny > 1 || y > 26) continue;
    const l = -(nx * 0.7 + ny * 0.6) + (bay(x, y) - 0.5) * 0.25;
    let c = l > 0.75 ? '#e8ecf2' : l > 0.4 ? '#b0b8c4' : l > 0.05 ? '#7a8492' : '#4e5664';
    if (Math.abs(nx) < 0.05 || (y === 14 && Math.abs(nx) < 0.9)) c = '#3a404a';
    pb.set(x, y, c);
  }
  // Glutschlitze
  pb.rect(6, 21, 20, 2, '#3a1a08'); pb.rect(9, 17, 14, 1, '#3a1a08');
  pb.rect(14, 0, 4, 3, '#5e6876');
  pb.outline('#14181e');
  return BS(pb, { glow: [16, 20], glowCol: '255,140,40', lit: [[6, 21, 20, 2, '#e8632a', '#ffb020'], [9, 17, 14, 1, '#c84a1a', '#ff9a2a'], [15, 1, 2, 1, '#ff7a1a', '#ffd23f']] });
}
// Ingenieurshaus 2×2: moderner Flachdachbau mit Antenne und großen Fenstern (nachts beleuchtet)
export function makeIngenieur(night) {
  const pb = new PB(32, 50);
  // Antenne
  pb.rect(24, 0, 1, 14, '#8a94a2'); pb.rect(21, 3, 7, 1, '#8a94a2'); pb.rect(22, 6, 5, 1, '#8a94a2'); pb.set(24, 0, '#e8503c');
  // Satellitenschüssel
  for (let y = 8; y < 14; y++) for (let x = 3; x < 10; x++) { const d = Math.hypot(x + 0.5 - 6.5, (y + 0.5 - 11) * 1.4); if (d < 3.5) pb.set(x, y, d < 1 ? '#8a94a2' : '#e8ecf2'); }
  // Gebäude zweigeschossig
  for (let y = 14; y < 50; y++) for (let x = 1; x < 31; x++) pb.set(x, y, x === 1 ? '#ffffff' : x === 30 ? '#a8b0ba' : '#e4e8ec');
  pb.rect(0, 13, 32, 2, '#454c58'); pb.rect(0, 13, 32, 1, '#8a94a2');
  pb.rect(1, 31, 30, 2, '#454c58');
  const g = night ? ['#ffd65a', '#fff4c0'] : ['#5a9ab8', '#bfe8f8'];
  const win = (x, y, w, h) => { pb.rect(x, y, w, h, '#26262a'); pb.rect(x + 1, y + 1, w - 2, h - 2, g[0]); pb.rect(x + 1, y + 1, w - 2, 1, g[1]); };
  win(3, 17, 12, 11); win(17, 17, 12, 11); win(3, 35, 10, 11);
  // Tür
  pb.rect(18, 36, 8, 14, '#26262a'); pb.rect(19, 37, 6, 13, '#3a6ad8'); pb.rect(19, 37, 1, 13, '#6a9aff'); pb.set(24, 43, '#ffd23f');
  // Logo-Streifen
  pb.rect(1, 46, 30, 1, '#3fb0a0');
  pb.outline('#14181e');
  return BS(pb, { glow: [16, 24], glowCol: '255,230,150' });
}
// Multi-Bohrer 3×3: Bohrturm mit Kühlrohren, Dampf im Betrieb (2 Bilder: Bohrkopf dreht)
export function makeMultibohrer(f) {
  const pb = new PB(48, 70);
  // Fundament
  for (let y = 56; y < 70; y++) for (let x = 1; x < 47; x++) {
    let c = y === 56 ? '#dfe6f0' : x === 1 ? '#a8b0ba' : x === 46 ? '#454c58' : '#6a7482';
    if (y >= 57 && y <= 59) c = (((x + y) >> 1) & 1) ? '#ffd23f' : '#26262a';
    pb.set(x, y, c);
  }
  // Turm (Fachwerk)
  line(pb, 12, 56, 20, 6, '#454c58'); line(pb, 13, 56, 21, 6, '#8a94a2'); line(pb, 36, 56, 28, 6, '#3a404a'); line(pb, 35, 56, 27, 6, '#5e6876');
  for (let y = 12; y < 56; y += 7) { const a = Math.round(12 + (56 - y) * 8 / 50); line(pb, a, y, 48 - a, y, '#9aa4b0'); line(pb, a, y, 48 - a - 3, y + 6, '#6a7482'); }
  pb.rect(18, 0, 13, 7, '#3fb0a0'); pb.rect(18, 0, 13, 1, '#a8f0e0'); pb.rect(18, 6, 13, 1, '#2a7a70');
  pb.rect(23, 7, 3, 44, '#e0e6ee'); pb.rect(25, 7, 1, 44, '#a8b4c4');
  // Kühlrohre links und rechts (blau)
  for (const x of [4, 42]) { pb.rect(x, 18, 3, 38, '#3a6ad8'); pb.rect(x, 18, 1, 38, '#8ab8ff'); for (let y = 22; y < 56; y += 8) pb.rect(x - 1, y, 5, 2, '#26449a'); }
  line(pb, 6, 18, 14, 12, '#3a6ad8'); line(pb, 42, 18, 34, 12, '#3a6ad8');
  // Motor und Schmiermitteltank
  pb.rect(8, 44, 10, 12, '#565e6a'); pb.rect(8, 44, 10, 1, '#a8b4c4'); for (let y = 47; y < 55; y += 2) pb.rect(10, y, 6, 1, '#26262a');
  pb.rect(31, 46, 8, 10, '#2a2e34'); pb.rect(32, 47, 6, 3, '#c8a018'); pb.rect(32, 51, 2, 1, '#7cc24f');
  // Bohrkopf
  for (let y = 60; y < 70; y++) { const half = Math.max(0, Math.round((70 - y) * 0.6)); for (let x = 24 - half; x <= 24 + half; x++) pb.set(x, y, ((y + f * 2 + x) % 3 === 0) ? '#4e5868' : '#c8d0da'); }
  pb.outline('#10141a');
  return BS(pb, { sm: [24, 0], steam: true, glow: [35, 48], glowCol: '140,190,255' });
}

/* ---------- Fässer (Abfüllanlage, Entleerer) ----------
   fluid = Flächen in der Farbe der Flüssigkeit des aktiven Rezepts: [x, y, w, h, immer] (immer = auch im Stillstand, sonst nur im Betrieb mit wanderndem Glanz) */
// Holzfass im Pixelstil (aufrecht), x0/y0 = linke obere Ecke, 10 × 12
function barrel(pb, x0, y0) {
  for (let y = 0; y < 12; y++) {
    const side = y >= 2 && y <= 9 ? 0 : 1;
    for (let x = side; x < 10 - side; x++) {
      let c = x <= 1 ? '#c9995e' : x >= 8 ? '#6a4426' : (x % 2 ? '#a87444' : '#8a5a32');
      if (y === 1 || y === 10) c = x <= 1 ? '#e4e8ec' : x >= 8 ? '#5a5f68' : '#9aa0aa';
      pb.set(x0 + x, y0 + y, c);
    }
  }
  pb.rect(x0 + 2, y0, 6, 1, '#5a3a24');
}
// Abfüllanlage 2×2: Stahlgerüst, Trichter mit Schauglas, Fass auf einem Rollband, Füllstrahl im Betrieb
export function makeAbfueller() {
  const pb = new PB(32, 46);
  // Sockel
  for (let y = 40; y < 46; y++) for (let x = 0; x < 32; x++) pb.set(x, y, y === 40 ? '#c8d0da' : x === 0 ? '#a8b0ba' : x === 31 ? '#454c58' : (x + y) % 6 === 0 ? '#6a7482' : '#8a94a2');
  // Rollband
  pb.rect(1, 35, 30, 5, '#26262a'); pb.rect(1, 35, 30, 1, '#5e6876');
  for (let x = 3; x < 30; x += 4) { pb.rect(x, 37, 2, 2, '#8a94a2'); pb.set(x, 37, '#c8d0da'); }
  // Gerüst: zwei Pfosten und Querträger
  for (const x of [2, 27]) { pb.rect(x, 6, 3, 29, '#5e6876'); pb.rect(x, 6, 1, 29, '#a8b0ba'); for (let y = 10; y < 34; y += 6) pb.set(x + 1, y, '#26262a'); }
  pb.rect(1, 4, 30, 3, '#454c58'); pb.rect(1, 4, 30, 1, '#8a94a2');
  // Trichter mit Schauglas
  for (let y = 7; y < 15; y++) { const half = Math.round(7 - (y - 7) * 0.7); pb.rect(16 - half, y, half * 2, 1, y === 7 ? '#c8d0da' : '#8a94a2'); pb.set(16 - half, y, '#c8d0da'); pb.set(15 + half, y, '#5e6876'); }
  pb.rect(12, 9, 8, 2, '#26262a');
  pb.rect(15, 15, 2, 3, '#5e6876'); pb.rect(14, 18, 4, 1, '#454c58');
  // Zuleitung von links
  pb.rect(0, 12, 6, 3, '#8a94a2'); pb.rect(0, 12, 6, 1, '#c8d0da'); line(pb, 6, 13, 10, 10, '#8a94a2');
  // Fass auf dem Band
  barrel(pb, 11, 23);
  // Schaltkasten mit Lämpchen
  pb.rect(23, 22, 4, 6, '#26262a'); pb.set(24, 23, '#7cc24f'); pb.set(25, 25, '#ffd23f');
  pb.outline('#14181e');
  return BS(pb, { fluid: [[13, 9, 6, 2, true], [15, 19, 2, 4], [13, 28, 6, 2, true]], lit: [[24, 23, 1, 1, '#3a6a2a', '#9aff6a']] });
}
// Entleerer 2×2: gekipptes Fass in einem Gestell über einem Auffangbecken
export function makeEntleerer() {
  const pb = new PB(32, 40);
  // Becken mit Betonrand
  for (let y = 26; y < 40; y++) for (let x = 1; x < 31; x++) pb.set(x, y, y === 26 ? '#d8d4ca' : x === 1 ? '#c8c4ba' : x === 30 ? '#6a665e' : y > 36 ? '#77736a' : '#a8a49a');
  pb.rect(4, 28, 24, 7, '#3a3632');
  // Gestell (Bock) links und rechts
  line(pb, 6, 27, 11, 6, '#5e6876'); line(pb, 7, 27, 12, 6, '#a8b0ba'); line(pb, 26, 27, 21, 6, '#454c58'); line(pb, 25, 27, 20, 6, '#8a94a2');
  pb.rect(10, 4, 13, 2, '#454c58'); pb.rect(10, 4, 13, 1, '#8a94a2');
  // gekipptes Fass (um etwa 35 Grad, Öffnung rechts unten)
  const a = 0.6, co = Math.cos(a), si = Math.sin(a), cx = 15, cy = 13;
  for (let y = 4; y < 24; y++) for (let x = 6; x < 26; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = dx * co + dy * si, v = -dx * si + dy * co;
    if (Math.abs(u) > 6.5 || Math.abs(v) > 4.2 - (Math.abs(u) > 5 ? 0.8 : 0)) continue;
    let c = v < -2.6 ? '#c9995e' : v > 2.6 ? '#6a4426' : (Math.floor(v + 10) % 2 ? '#a87444' : '#8a5a32');
    if (Math.abs(Math.abs(u) - 4.5) < 0.6) c = v < -2 ? '#e4e8ec' : v > 2 ? '#5a5f68' : '#9aa0aa';
    pb.set(x, y, c);
  }
  // Ausguss
  pb.rect(19, 17, 3, 3, '#3a2414');
  // Hebel
  line(pb, 24, 8, 29, 3, '#a87444'); pb.rect(28, 2, 2, 2, '#c4553f');
  pb.outline('#14181e');
  return BS(pb, { fluid: [[5, 29, 22, 5, true], [20, 20, 2, 9]] });
}
