/* ---------- Speicher-, Steg- und neue Logistik-Sprites ----------
   Hauptkontor 3×3, Steg und Anleger, Lagerkiste, Handelskontor, Extraktor, Tor, Brückenband-Ende, Entdecker */
import { PB, spr, BS, line, rotPB, tri } from '../pixelbuffer.js';

const WOOD = ['#f2d29c', '#e6bf85', '#c9995e', '#a87444', '#8a5a32', '#5a3218'];

// Hauptkontor (3×3): großes Kontorhaus mit blauem Dach, Fahnenmast, Vordach und Fässern
export function makeKontor3(flag) {
  const pb = new PB(48, 62);
  // Fahnenmast mit Flagge
  pb.rect(41, 0, 1, 30, '#5a3218'); pb.rect(42, 1, 6, 5, flag); pb.set(41, 0, '#ffd23f');
  // Wände (Fachwerk)
  for (let y = 28; y < 62; y++) for (let x = 2; x < 46; x++) {
    let c = (x % 6 === 0) ? WOOD[2] : (x < 4 ? WOOD[0] : (x > 43 ? WOOD[2] : WOOD[1]));
    if (y === 28 || y === 42) c = WOOD[3];
    pb.set(x, y, c);
  }
  line(pb, 4, 29, 13, 41, WOOD[3]); line(pb, 13, 29, 4, 41, WOOD[3]); line(pb, 34, 29, 43, 41, WOOD[3]); line(pb, 43, 29, 34, 41, WOOD[3]);
  // Dach (Walmdach, blau) mit Gaube
  for (let j = 0; j < 22; j++) {
    const y = 7 + j, half = Math.round(6 + j * 18 / 21);
    for (let x = 24 - half; x < 24 + half; x++) pb.set(x, y, j === 21 ? '#2a3a7a' : ((((x >> 1) + j) & 1) ? '#4a6abf' : '#3a5aa8'));
    pb.set(24 - half, y, '#6a8ad8');
  }
  pb.rect(20, 12, 8, 7, '#5a3218'); pb.rect(21, 13, 6, 5, '#8fd0ea'); pb.set(21, 13, '#dff6ff'); pb.rect(23, 13, 1, 5, '#5a3218');
  pb.rect(18, 10, 12, 2, '#2a3a7a');
  // Tor, Fenster, Schild
  pb.rect(18, 46, 12, 16, '#5a3218'); pb.rect(19, 47, 10, 15, '#7a4a28'); pb.rect(23, 47, 2, 15, '#5a3218'); line(pb, 19, 47, 28, 61, '#9a6a3e');
  pb.rect(5, 46, 8, 6, '#5a3218'); pb.rect(6, 47, 6, 4, '#8fd0ea'); pb.set(6, 47, '#dff6ff');
  pb.rect(35, 46, 8, 6, '#5a3218'); pb.rect(36, 47, 6, 4, '#8fd0ea'); pb.set(36, 47, '#dff6ff');
  pb.rect(16, 32, 16, 7, '#5a3218'); pb.rect(17, 33, 14, 5, '#e6bf85'); pb.rect(19, 35, 10, 1, '#5a3218');
  // Fässer und Kiste vor dem Haus
  for (const bx of [3, 8]) { pb.rect(bx, 55, 5, 7, '#8a5a32'); pb.rect(bx, 57, 5, 1, '#5a5f68'); pb.rect(bx, 60, 5, 1, '#5a5f68'); pb.rect(bx + 1, 55, 1, 7, '#a87444'); }
  pb.rect(36, 54, 9, 8, '#c9995e'); pb.rect(36, 54, 9, 1, '#e6bf85'); line(pb, 36, 54, 44, 61, '#8a5a32');
  pb.outline('#22201c');
  return BS(pb, { glow: [24, 40] });
}

// Steg: Planken quer zur Laufrichtung. Grundform läuft nach rechts (d = 0); dock = Anleger auf dem Wasser mit Pollern
function stegPB(dock) {
  const pb = new PB(16, 16);
  for (let x = 0; x < 16; x++) for (let y = 3; y < 13; y++) {
    const pl = x % 4;
    pb.set(x, y, pl === 3 ? WOOD[5] : (pl === 0 ? WOOD[1] : WOOD[2]));
  }
  for (let x = 0; x < 16; x++) { pb.set(x, 3, WOOD[4]); pb.set(x, 12, WOOD[4]); pb.set(x, 13, '#3a2414'); }
  if (dock) {
    // Pfähle im Wasser und zwei Poller an der Kante
    for (const px of [1, 13]) { pb.rect(px, 13, 2, 3, '#5a3218'); pb.rect(px, 13, 1, 3, '#7a4a28'); }
    for (const py of [3, 10]) { pb.rect(12, py, 3, 3, '#3a3a40'); pb.set(12, py, '#8a8f98'); }
  }
  return pb;
}
// [d] = { land, dock }
export function stegSprites() {
  const out = [];
  let a = stegPB(false), b = stegPB(true);
  for (let d = 0; d < 4; d++) { out.push({ land: spr(a, 0, 0), dock: spr(b, 0, 0) }); a = rotPB(a); b = rotPB(b); }
  return out;
}
// Laterne am Steg-Anfang (steht auf dem ersten Steg-Feld)
export function makeLantern() {
  const pb = new PB(5, 14);
  pb.rect(2, 4, 1, 10, '#3a2414'); pb.rect(0, 0, 5, 1, '#3a2414'); pb.rect(1, 1, 3, 3, '#ffd23f'); pb.set(1, 1, '#fff4c0'); pb.rect(0, 4, 5, 1, '#3a2414');
  return spr(pb, 2, 13);
}

// Lagerkiste (2×2): gestapelte Holzkisten mit Eisenbeschlägen
export function makeKiste() {
  const pb = new PB(32, 34);
  const crate = (x, y, w, h) => {
    pb.rect(x, y, w, h, WOOD[3]); pb.rect(x + 1, y + 1, w - 2, h - 2, WOOD[2]); pb.rect(x + 1, y + 1, w - 2, 1, WOOD[1]);
    line(pb, x + 1, y + 1, x + w - 2, y + h - 2, WOOD[4]);
    pb.rect(x, y + 2, 1, 2, '#8a8f98'); pb.rect(x + w - 1, y + 2, 1, 2, '#8a8f98'); pb.rect(x, y + h - 4, 1, 2, '#8a8f98'); pb.rect(x + w - 1, y + h - 4, 1, 2, '#8a8f98');
  };
  crate(1, 18, 15, 15); crate(16, 18, 15, 15); crate(8, 4, 15, 14);
  pb.rect(10, 9, 11, 3, '#5a3218'); pb.rect(11, 10, 9, 1, '#e6bf85');
  pb.outline('#2e1c10');
  return BS(pb);
}

// Handelskontor (2×2): Lagerhaus mit Ladekran, Fässern und Flagge mit weißem Rand
export function makeHandels(flag) {
  const pb = new PB(32, 48);
  // Kran
  pb.rect(26, 2, 2, 30, '#5a5f68'); pb.rect(26, 2, 1, 30, '#8a8f98'); pb.rect(14, 2, 15, 2, '#5a5f68'); pb.rect(14, 2, 15, 1, '#8a8f98');
  line(pb, 27, 4, 21, 2, '#454a52'); pb.rect(15, 4, 1, 10, '#2a2e34'); pb.rect(13, 14, 5, 4, WOOD[2]); pb.rect(13, 14, 5, 1, WOOD[1]);
  // Flagge mit weißem Rand
  pb.rect(1, 4, 1, 22, '#5a3218'); pb.rect(2, 4, 8, 6, '#fbf6ea'); pb.rect(3, 5, 6, 4, flag);
  // Haus
  for (let y = 26; y < 48; y++) for (let x = 1; x < 31; x++) pb.set(x, y, (x % 5 === 0) ? '#8a7f76' : (x < 3 ? '#c8bcb0' : '#a89d94'));
  for (let j = 0; j < 9; j++) { const y = 18 + j, half = Math.round(8 + j * 8 / 8); for (let x = 16 - half; x < 16 + half; x++) pb.set(x, y, j === 8 ? '#5a2a1a' : (((x + j) % 3) ? '#a8432f' : '#93372a')); }
  pb.rect(10, 34, 12, 14, '#5a3218'); pb.rect(11, 35, 10, 13, '#7a4a28'); pb.rect(11, 40, 10, 1, '#5a3218');
  pb.rect(3, 30, 5, 4, '#2a2e34'); pb.rect(24, 30, 5, 4, '#2a2e34');
  // Fässer
  for (const bx of [1, 25]) { pb.rect(bx, 41, 6, 7, '#8a5a32'); pb.rect(bx, 43, 6, 1, '#5a5f68'); pb.rect(bx, 46, 6, 1, '#5a5f68'); pb.rect(bx + 1, 41, 1, 7, '#a87444'); }
  pb.outline('#22201c');
  return BS(pb, { glow: [16, 32] });
}

// Extraktor (1×1, seit Version 18 ohne Richtung): schlichter Metallblock mit Nieten und Filterfenster in der Mitte
// (patch, beim Zeichnen mit der Farbe der gefilterten Ware gefüllt, ohne Filter vierfarbig). Viermal dasselbe Bild (Index = alte Richtung).
export function extraktorSprites() {
  const pb = new PB(16, 18);
  pb.rect(1, 2, 14, 16, '#454a52'); pb.rect(2, 3, 12, 14, '#8a8f98');
  pb.rect(2, 3, 12, 2, '#c8ccd4'); pb.rect(2, 5, 1, 12, '#b0b6be'); pb.rect(2, 15, 12, 2, '#5a5f68');
  for (const [x, y] of [[3, 6], [12, 6], [3, 13], [12, 13]]) pb.set(x, y, '#3a3f47');
  pb.rect(5, 7, 6, 6, '#2a2e34');   // Filterfenster (patch)
  pb.outline('#1e2228');
  const s = BS(pb, { patch: [6, 8, 4, 4] });
  return [s, s, s, s];
}

// Tor (flach, Richtung d): Band mit rot-weißer Schranke; [d][0 = offen, 1 = geschlossen]
function gatePB(closed) {
  const pb = new PB(16, 16);
  for (let x = 0; x < 16; x++) { pb.set(x, 0, '#4a2a14'); pb.set(x, 1, '#d8a868'); pb.set(x, 2, '#8a5a32'); pb.set(x, 13, '#8a5a32'); pb.set(x, 14, '#4a2a14'); pb.set(x, 15, '#4a2a14'); }
  for (let y = 3; y < 13; y++) for (let x = 0; x < 16; x++) pb.set(x, y, x % 4 === 0 ? '#6c675e' : '#7a756a');
  // Pfosten
  pb.rect(6, 0, 4, 3, '#2a2e34'); pb.rect(7, 0, 2, 2, '#8a8f98');
  if (closed) for (let y = 2; y < 15; y++) { const c = (y >> 1) % 2 ? '#fbf6ea' : '#e0384f'; pb.rect(7, y, 2, 1, c); }
  else { for (let x = 9; x < 16; x++) pb.set(x, 1, (x >> 1) % 2 ? '#fbf6ea' : '#e0384f'); pb.set(9, 2, '#e0384f'); }
  tri(pb, 13, 7, 0, '#b4ae9e');
  return pb;
}
export function gateSprites() {
  const out = [];
  let a = gatePB(false), b = gatePB(true);
  for (let d = 0; d < 4; d++) { out.push([spr(a, 0, 0), spr(b, 0, 0)]); a = rotPB(a); b = rotPB(b); }
  return out;
}

// Brückenband-Ende (flach): Metallplattform mit Rampe
export function bridgeEndPB() {
  const pb = new PB(16, 16);
  pb.rect(0, 0, 16, 16, '#454a52'); pb.rect(1, 1, 14, 14, '#8a8f98'); pb.rect(1, 1, 14, 1, '#c8ccd4'); pb.rect(1, 1, 1, 14, '#b0b6be');
  for (let y = 3; y < 14; y += 3) pb.rect(2, y, 12, 1, '#6a6f78');
  pb.rect(5, 5, 6, 6, '#5a5f68'); pb.rect(6, 6, 4, 4, '#c8ccd4'); pb.rect(7, 7, 2, 2, '#ffd23f');
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) pb.set(x, y, '#2a2e34');
  return pb;
}

// Entdecker: schlanker Rumpf, blaues Segel, Krähennest
export function makeShipE() {
  const pb = new PB(24, 24);
  for (let x = 1; x < 23; x++) { const t = Math.abs(x - 11.5) / 11, bot = Math.round(20 - t * 2); for (let y = 17; y <= bot; y++) pb.set(x, y, y === 17 ? '#e6bf85' : (y === 18 ? '#3a2414' : '#5a3218')); }
  pb.rect(0, 16, 3, 1, '#a87444');
  pb.rect(11, 2, 1, 15, '#5a3218');
  pb.rect(9, 3, 5, 2, '#7a4a28'); pb.rect(9, 3, 5, 1, '#a87444');   // Krähennest
  for (let y = 6; y < 16; y++) { const w = Math.round((y - 5) * 0.8); for (let x = 12; x <= 12 + w; x++) pb.set(x, y, x === 12 + w ? '#2a5ab0' : (y % 3 === 0 ? '#3f6fd8' : '#4f8af0')); }
  for (let y = 8; y < 15; y++) { const w = Math.round((y - 7) * 0.6); for (let x = 10 - w; x <= 10; x++) pb.set(x, y, '#9cc8ff'); }
  pb.rect(11, 0, 3, 2, '#ffd23f');
  pb.outline('#2a1a0c');
  return spr(pb, 12, 20);
}
