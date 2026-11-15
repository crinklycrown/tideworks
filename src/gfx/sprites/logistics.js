/* ---------- Logistik-Sprites ---------- */
import { PB, spr, BS, rotPB, tri, flipV } from '../pixelbuffer.js';

// Farben je Bandstufe: Holz (Mk1), Stahl mit gelben Pfeilen (Mk2), dunkel mit grünen Pfeilen (Mk3)
const BELT_PAL = {
  1: { rail: ['#d8a868', '#8a5a32', '#4a2a14'], surf: ['#7a756a', '#6c675e'], chev: '#b4ae9e' },
  2: { rail: ['#c8ccd4', '#8a8f98', '#454a52'], surf: ['#5a6070', '#4e5464'], chev: '#ffd23f' },
  3: { rail: ['#6a7480', '#3a4048', '#16191e'], surf: ['#2a2e36', '#22262c'], chev: '#5af07a' }
};
export function beltFrames(tier) {
  const { rail, surf, chev } = BELT_PAL[tier];
  const out = [[], [], [], []];
  for (let f = 0; f < 4; f++) {
    const pb = new PB(16, 16);
    for (let x = 0; x < 16; x++) { pb.set(x, 0, rail[2]); pb.set(x, 1, rail[0]); pb.set(x, 2, rail[1]); pb.set(x, 13, rail[1]); pb.set(x, 14, rail[2]); pb.set(x, 15, rail[2]); }
    for (let y = 3; y <= 12; y++) for (let x = 0; x < 16; x++) pb.set(x, y, ((x - f * 2 + 16) % 4 === 0) ? surf[1] : surf[0]);
    for (let y = 4; y <= 11; y++) {
      const off = Math.round(Math.abs(y - 7.5) - 0.5);
      for (let base = 0; base < 16; base += 8) { const x = (((base + f * 2 - off) % 16) + 16) % 16; pb.set(x, y, chev); }
    }
    for (let x = (f * 2) % 4; x < 16; x += 4) { pb.set(x, 1, rail[1]); pb.set(x, 14, rail[1]); }
    let r = pb;
    for (let d = 0; d < 4; d++) { out[d].push(spr(r, 0, 0)); r = rotPB(r); }
  }
  return out;
}
// Kurvenstück (Viertelkreis): Grundform kommt von oben und fährt nach rechts
export function beltCurves(tier) {
  const { rail, surf, chev } = BELT_PAL[tier];
  const out = [[[], [], [], []], [[], [], [], []]];
  for (let f = 0; f < 4; f++) {
    const pb = new PB(16, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 16, dy = y + 0.5, r = Math.hypot(dx, dy), lat = r - 8, al = Math.abs(lat);
      if (al > 7.6) continue;
      let c;
      if (al >= 7) c = rail[2];
      else if (al >= 6) c = lat < 0 ? rail[0] : rail[2];
      else if (al >= 5) c = rail[1];
      else {
        const u = Math.round((Math.PI - Math.atan2(dy, dx)) / (Math.PI / 2) * 16), off = Math.round(al - 0.5);
        c = (al <= 4 && ((((u - f * 2 + off) % 8) + 8) % 8) === 0) ? chev : (((((u - f * 2) % 4) + 4) % 4) === 0 ? surf[1] : surf[0]);
      }
      pb.set(x, y, c);
    }
    let a = pb, b = flipV(pb);
    for (let d = 0; d < 4; d++) { out[0][d].push(spr(a, 0, 0)); out[1][d].push(spr(b, 0, 0)); a = rotPB(a); b = rotPB(b); }
  }
  return out;   // out[Seite][Richtung][Frame]
}
export function splitterPB() {
  const pb = new PB(16, 16);
  pb.rect(1, 1, 14, 14, '#454a52'); pb.rect(2, 2, 12, 12, '#8a8f98'); pb.rect(2, 2, 12, 1, '#c8ccd4'); pb.rect(2, 13, 12, 1, '#5a5f68'); pb.rect(2, 2, 1, 12, '#b0b6be');
  pb.rect(6, 6, 4, 4, '#5a5f68'); pb.rect(7, 7, 2, 2, '#c8ccd4');
  tri(pb, 13, 7, 0, '#ffd23f'); tri(pb, 8, 13, 1, '#ffd23f'); tri(pb, 2, 8, 2, '#ffd23f'); tri(pb, 7, 2, 3, '#ffd23f');
  return pb;
}
export function ueberPB() {
  const pb = new PB(16, 16);
  pb.rect(1, 1, 14, 14, '#5a3218'); pb.rect(2, 2, 12, 12, '#c98a2a'); pb.rect(2, 2, 12, 1, '#ffd977'); pb.rect(2, 13, 12, 1, '#8a5a1a'); pb.rect(2, 2, 1, 12, '#f0b443');
  pb.rect(4, 7, 8, 2, '#5a3218'); pb.rect(7, 4, 2, 8, '#5a3218');
  pb.rect(6, 6, 4, 4, '#e8774f'); pb.rect(7, 7, 2, 2, '#ffd0c0');
  tri(pb, 13, 7, 0, '#fff0b8'); tri(pb, 2, 8, 2, '#fff0b8');
  return pb;
}
export function makeMast() {
  const pb = new PB(16, 32);
  pb.rect(7, 4, 2, 27, '#8a5a32'); pb.rect(7, 4, 1, 27, '#a87444');
  pb.rect(2, 7, 12, 2, '#7a4a28'); pb.rect(2, 7, 12, 1, '#a87444');
  pb.rect(2, 5, 2, 2, '#c8e0e8'); pb.rect(12, 5, 2, 2, '#c8e0e8'); pb.rect(7, 1, 2, 3, '#c8e0e8');
  pb.rect(5, 29, 6, 2, '#5a3218');
  pb.outline('#2a1a10');
  return BS(pb);
}
export function makeBatterie() {
  const pb = new PB(16, 26);
  pb.rect(2, 6, 12, 19, '#5a5f68'); pb.rect(3, 7, 10, 17, '#8a8f98'); pb.rect(3, 7, 2, 17, '#b0b6be');
  pb.rect(5, 2, 6, 4, '#454a52'); pb.rect(6, 3, 1, 2, '#e0384f'); pb.rect(9, 3, 1, 2, '#3f6fd8');
  pb.rect(6, 10, 4, 12, '#2a2e34');
  pb.outline('#1e2228');
  return BS(pb, { bar: [6, 10, 4, 12] });
}
export function bridgePB() {
  const pb = new PB(16, 16);
  for (let x = 0; x < 16; x++) {
    pb.set(x, 0, '#4a2a14'); pb.set(x, 1, '#d8a868'); pb.set(x, 2, '#8a5a32'); pb.set(x, 13, '#8a5a32'); pb.set(x, 14, '#4a2a14'); pb.set(x, 15, '#4a2a14');
    for (let y = 3; y < 13; y++) pb.set(x, y, '#6c675e');
  }
  for (let y = 0; y < 16; y++) for (let x = 3; x < 13; x++) pb.set(x, y, (y % 3 === 0) ? '#7a4a28' : (x === 3 || x === 12) ? '#5a3218' : (x < 6 ? '#e6bf85' : '#c9995e'));
  tri(pb, 7, 0, 3, '#ffd23f'); tri(pb, 8, 15, 1, '#ffd23f'); tri(pb, 0, 7, 2, '#b4ae9e'); tri(pb, 15, 8, 0, '#b4ae9e');
  return pb;
}
export function makeShip() {
  const pb = new PB(22, 20);
  for (let x = 1; x < 21; x++) { const t = Math.abs(x - 10.5) / 10, bot = Math.round(17 - t * 2.5); for (let y = 12; y <= bot; y++) pb.set(x, y, y === 12 ? '#e6bf85' : (y === 13 ? '#5a3218' : (y < 15 ? '#a87444' : '#7a4a28'))); }
  pb.rect(10, 1, 1, 11, '#5a3218');
  for (let y = 2; y < 11; y++) { const w = Math.round((y - 1) * 0.9); for (let x = 11; x <= 11 + w; x++) pb.set(x, y, x === 11 + w ? '#d8d0c0' : '#fbf6ea'); }
  for (let y = 4; y < 10; y++) { const w = Math.round((y - 3) * 0.7); for (let x = 9 - w; x <= 9; x++) pb.set(x, y, '#f0e8d8'); }
  pb.rect(10, 0, 3, 1, '#e0384f');
  pb.outline('#2a1a0c');
  return spr(pb, 11, 16);
}

// Kogge (Version 17): breiter, hoher Rumpf mit Kastell, zwei Masten mit Rahsegeln
export function makeKogge() {
  const pb = new PB(30, 24);
  for (let x = 1; x < 29; x++) { const t = Math.abs(x - 14.5) / 14, top = x < 6 || x > 24 ? 13 : 15, bot = Math.round(21 - t * 3); for (let y = top; y <= bot; y++) pb.set(x, y, y === top ? '#e6bf85' : y === top + 1 ? '#5a3218' : (y % 2 ? '#a87444' : '#8a5a32')); }
  pb.rect(1, 11, 5, 2, '#7a4a28'); pb.rect(24, 11, 5, 2, '#7a4a28');
  for (const [mx, top, w] of [[10, 1, 6], [19, 3, 5]]) {
    pb.rect(mx, top, 1, 15 - top, '#5a3218');
    for (let y = top + 1; y < top + 9; y++) for (let x = mx - w; x <= mx + w; x++) pb.set(x, y, x === mx - w || y === top + 1 ? '#fbf6ea' : y === top + 8 ? '#d8d0c0' : (x + y) % 6 === 0 ? '#e8504a' : '#f0e8d8');
  }
  pb.rect(10, 0, 4, 1, '#e0843a');
  pb.outline('#2a1a0c');
  return spr(pb, 15, 20);
}
// Sortierer (flach, Richtung d): Bandstück mit Weiche, Ausgängen zu beiden Seiten und Farbfeld der gewählten Ware (patch, beim Zeichnen gefüllt)
export function sorterSprites() {
  const pb = new PB(16, 16);
  for (let x = 0; x < 16; x++) { pb.set(x, 0, '#4a2a14'); pb.set(x, 1, '#d8a868'); pb.set(x, 2, '#8a5a32'); pb.set(x, 13, '#8a5a32'); pb.set(x, 14, '#4a2a14'); pb.set(x, 15, '#4a2a14'); }
  for (let y = 3; y < 13; y++) for (let x = 0; x < 16; x++) pb.set(x, y, x % 4 === 0 ? '#6c675e' : '#7a756a');
  // Ausgänge links und rechts: Lücke in den Schienen
  for (let x = 5; x < 11; x++) for (const y of [0, 1, 2, 13, 14, 15]) pb.set(x, y, '#7a756a');
  tri(pb, 7, 1, 3, '#b4ae9e'); tri(pb, 8, 14, 1, '#b4ae9e');
  // Gehäuse der Weiche mit Farbfeld und Hebel
  pb.rect(4, 4, 8, 8, '#2a2e34'); pb.rect(5, 5, 6, 6, '#8a8f98'); pb.rect(5, 5, 6, 1, '#c8ccd4');
  pb.rect(6, 6, 4, 4, '#2a2e34');   // Farbfeld (patch)
  pb.rect(2, 3, 1, 1, '#ffd23f'); pb.rect(3, 4, 1, 1, '#ffd23f'); pb.set(1, 3, '#c98a2a');   // Hebel
  tri(pb, 13, 7, 0, '#ffd23f');
  const out = [];
  let a = pb;
  for (let d = 0; d < 4; d++) { out.push(Object.assign(spr(a, 0, 0), { patch: [6, 6, 4, 4] })); a = rotPB(a); }
  return out;
}
