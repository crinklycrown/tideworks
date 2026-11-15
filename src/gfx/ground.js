/* =========================================================
   BODEN-TEXTUR je Chunk (32×32 Felder = 512×512 Pixel)
   Strände, Küstenkanten mit Schaum, Wasser, Erzbrocken, Ölflecken, Dünen, Basalt, Berge und Lava werden
   Pixel für Pixel gemalt. Ein Auftrag (createGroundJob) liest zuerst ein Raster der Felder des Chunks
   plus 2 Felder Rand über die Welt (World.gr usw.), damit die Ränder nahtlos zu den Nachbarn passen,
   und malt dann zeilenweise (runGroundJob), sodass sich die Arbeit über mehrere Bilder verteilen lässt.
   ========================================================= */
import { TS, G_WATER, G_SAND, G_ROCK, G_DUNE, G_MOUNT, G_LAVA, G_ASH } from '../config.js';
import { ORE_OIL } from '../data/items.js';
import { CS } from '../util/tiles.js';
import { NPC_ISL } from '../data/npcs.js';
import { hash2, vnoise } from '../util/math.js';
import { rgb, bay } from './pixelbuffer.js';

// Farbverläufe der Erzbrocken: hell → dunkel, Kontur [4], optional Einsprengsel [5] (Index = Vorkommen in ORES)
export const ORE_RAMP = {
  1: ['#7a7a8a', '#52525e', '#36363f', '#24242b', '#121216'],
  2: ['#d88a66', '#a85a3c', '#7e3e28', '#56281a', '#2a120c', '#3a1a10'],     // Eisenerz: rostrot-braun, [5] = dunkle Adern
  3: ['#b4c4ac', '#86988a', '#62766a', '#44544a', '#1c2620', '#3ed6c4'],     // Kupfererz: grau-grün, [5] = türkise Einschlüsse
  4: ['#ffffff', '#f0ecdf', '#d6d0bc', '#aca58f', '#6a6454'],
  5: ['#fff6a0', '#f2dc40', '#c8a81e', '#8a7010', '#3a300a'],      // Schwefel
  7: ['#d4c6ec', '#a594c4', '#76689a', '#4e4470', '#221c34']       // Neodym-Erz
};
export const COL = {
  grass: [[92, 156, 60], [111, 176, 70], [130, 192, 82], [158, 212, 102]],
  rock: [[138, 142, 118], [156, 160, 134], [176, 178, 150], [112, 114, 98]],
  deep: [[52, 116, 184], [46, 106, 172]], shallow: [[86, 162, 222], [100, 176, 232]], foam: [216, 241, 251], hi: [128, 192, 240],
  bank: [214, 186, 120], bankD: [150, 114, 66],
  flowers: [[255, 255, 255], [255, 226, 90], [255, 154, 192], [180, 156, 255]],
  ash: [[62, 58, 60], [74, 69, 70], [88, 82, 80], [44, 40, 42]],
  mount: ['#d8d2c4', '#b4ad9e', '#918a7c', '#6e685d', '#4f4a42'].map(rgb),
  basalt: ['#8a7f7a', '#6c625e', '#554c49', '#433b39', '#2f2927'].map(rgb),
  snow: ['#ffffff', '#e6eef6', '#c3d0de'].map(rgb),
  cliff: ['#6e685d', '#58534a', '#3a3631'].map(rgb),
  lava: [[255, 230, 130], [255, 164, 52], [236, 98, 36], [184, 50, 30], [96, 32, 22]],
  // NPC-Inseln (data/npcs.js look): Pfahldorf = dunkler Schiefer, Goldberg = goldener Fels mit grünen Terrassen
  slate: ['#a4a8ae', '#848a92', '#686e78', '#50555e', '#383c44'].map(rgb), slateRock: [[112, 118, 126], [128, 134, 140], [146, 150, 156], [92, 96, 104]],
  gold: ['#f6dc8a', '#e0bc5a', '#c49a3e', '#9a7430', '#6a4e22'].map(rgb),
  terrace: [[118, 178, 70], [98, 158, 58], [80, 134, 48]],
  oil: [[20, 17, 26], [34, 29, 44], [52, 45, 66], [106, 96, 128], [207, 200, 232]]
};
// Grobe Farbe je Bodenart (Platzhalter, solange ein Chunk noch nicht gemalt ist, und Minimap)
export const GROUND_FLAT = ['#3474b8', '#e6cc8f', '#6fb046', '#9ea08a', '#ecd49a', '#8d877c', '#ff7a2a', '#4a4644'];
export const shade = (c, f) => [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];

let NEAR, NEAR2;
function buildNear() {
  NEAR = []; NEAR2 = [];
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.hypot(dx, dy); if (d > 0 && d <= 4.3) NEAR.push([dx, dy, d]); }
  NEAR.sort((a, b) => a[2] - b[2]);
  NEAR.forEach(n => { if (n[2] <= 2.3) NEAR2.push(n); });
}

/* ---------- Raster des Chunks (mit 2 Feldern Rand) ---------- */
const P = 2, GW = CS + 2 * P;
let J = null;        // gerade gemalter Auftrag (Raster, Seed)
const gi = (tx, ty) => (ty - J.ty0) * GW + (tx - J.tx0);
const grd = (tx, ty) => J.gG[gi(tx, ty)];
const wT = (tx, ty) => grd(tx, ty) === G_WATER;
const isM = (tx, ty) => { const g = grd(tx, ty); return g === G_MOUNT || g === G_LAVA; };

// Ist dieses Welt-Pixel Land? (Küstenecken werden abgerundet)
function landPix(x, y) {
  const tx = x >> 4, ty = y >> 4;
  if (wT(tx, ty)) return false;
  const lx = x & 15, ly = y & 15, sx = lx < 8 ? -1 : 1, sy = ly < 8 ? -1 : 1;
  if (wT(tx + sx, ty) && wT(tx, ty + sy) && wT(tx + sx, ty + sy)) {
    const R = 6, cx = sx < 0 ? R : 16 - R, cy = sy < 0 ? R : 16 - R, ddx = lx + 0.5 - cx, ddy = ly + 0.5 - cy;
    if (ddx * sx > 0 && ddy * sy > 0 && ddx * ddx + ddy * ddy > R * R) return false;
  }
  return true;
}
function duneColor(x, y, seed) {
  const big = vnoise(x / 40, y / 34, seed + 61);
  const rip = Math.sin(x * 0.42 + y * 0.9 + vnoise(x / 14, y / 14, seed + 62) * 7);
  let c = big < 0.45 ? [230, 204, 142] : [240, 218, 160];
  if (rip > 0.8) c = big < 0.45 ? [214, 186, 124] : [226, 202, 144];      // Rippel-Schatten
  else if (rip < -0.92) c = [248, 232, 184];                               // Rippel-Kante
  if (hash2(x, y, seed + 63) < 0.008) c = [196, 166, 108];
  return c;
}
function lavaColor(x, y, seed) {
  const v = vnoise(x / 7, y / 6, seed + 91) * 0.7 + vnoise(x / 2.5, y / 2.5, seed + 92) * 0.3;
  if (vnoise(x / 5, y / 5, seed + 93) < 0.18) return COL.lava[4];         // erstarrte Kruste
  return COL.lava[v > 0.72 ? 0 : v > 0.55 ? 1 : v > 0.38 ? 2 : 3];
}
// Bodenfarbe eines Landpixels (g = Bodenart)
function landColor(g, i, x, y, seed) {
  let c;
  if (g === G_SAND) {
    const n = hash2(x, y, seed + 51);
    c = n > 0.996 ? [255, 250, 240] : n < 0.05 ? [214, 186, 128] : (vnoise(x / 7, y / 7, seed + 52) < 0.5 ? [234, 210, 154] : [242, 222, 170]);
  } else if (g === G_DUNE) c = duneColor(x, y, seed);
  else if (g === G_ROCK) {
    const n = hash2(x >> 1, y >> 1, seed + 8);
    const R = J.look === 'klippe' ? COL.slateRock : COL.rock;
    c = hash2(x, y, seed + 9) < 0.04 ? R[3] : n < 0.3 ? R[0] : n < 0.8 ? R[1] : R[2];
  } else if (g === G_ASH) {
    const n = hash2(x >> 1, y >> 1, seed + 81);
    c = hash2(x, y, seed + 82) < 0.04 ? COL.ash[3] : n < 0.3 ? COL.ash[0] : n < 0.85 ? COL.ash[1] : COL.ash[2];
  } else if (g === G_LAVA) return lavaColor(x, y, seed);
  else {
    c = vnoise(x / 11, y / 11, seed + 21) < 0.4 ? COL.grass[1] : COL.grass[2];
    if (hash2(x, (y + (x & 1)) >> 1, seed + 2) < 0.035) c = COL.grass[0];
    else if (hash2(x, y, seed + 3) < 0.02) c = COL.grass[3];
    const hf = hash2(x, y, seed + 4);
    if (hf < 0.004) c = COL.flowers[((hf * 1000) | 0) % 4];
  }
  if (i >= 0 && J.oil[i]) { const c2 = oilColor(x, y, seed); if (c2) c = c2; }
  if (i >= 0 && J.gN[i]) { const c2 = oreColor(x, y, c); if (c2) c = c2; }
  return c;
}
// Berg: Höhe aus der Berghöhe der Felder (bilinear) plus Felsrauschen, in Stufen (Terrassen) gezeichnet:
// Licht von oben links, dunkle Felsflanken unter jeder Stufe und am Fuß, Schnee auf hohen Gipfeln
function hgt(x, y) {
  const u = x / TS - 0.5, v = y / TS - 0.5, ix = Math.floor(u), iy = Math.floor(v), fx = u - ix, fy = v - iy;
  const m = (tx, ty) => { const k = gi(tx, ty), g = J.gG[k]; return g === G_MOUNT || g === G_LAVA ? J.gM[k] : 0; };
  const a = m(ix, iy), b = m(ix + 1, iy), c = m(ix, iy + 1), d = m(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
// Goldberg: glatter und flacher, damit breite Terrassen entstehen
const rockH = (x, y, seed) => J.look === 'goldberg' ? hgt(x, y) * 0.8 + (vnoise(x / 16, y / 16, seed + 44) - 0.5) * 0.7 : hgt(x, y) * 1.15 + (vnoise(x / 9, y / 9, seed + 44) - 0.5) * 1.3 + (vnoise(x / 3.5, y / 3.5, seed + 45) - 0.5) * 0.35;
function mountColor(x, y, seed) {
  const tx = x >> 4, ty = y >> 4, lx = x & 15, ly = y & 15;
  // runde Ecken: außerhalb liegt der Boden des Nachbarfeldes
  const sx = lx < 8 ? -1 : 1, sy = ly < 8 ? -1 : 1;
  if (!isM(tx + sx, ty) && !isM(tx, ty + sy) && !isM(tx + sx, ty + sy)) {
    const R = 5, cx = sx < 0 ? R : 16 - R, cy = sy < 0 ? R : 16 - R, ddx = lx + 0.5 - cx, ddy = ly + 0.5 - cy;
    if (ddx * sx > 0 && ddy * sy > 0 && ddx * ddx + ddy * ddy > R * R) { const g = grd(tx + sx, ty); return landColor(g === G_WATER ? G_SAND : g, -1, x, y, seed); }
  }
  // Kraterrand um die Lava
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
    if (grd((x + dx) >> 4, (y + dy) >> 4) === G_LAVA) return Math.abs(dx) + Math.abs(dy) >= 2 && hash2(x, y, seed + 7) < 0.5 ? COL.cliff[1] : COL.cliff[2];
  }
  // Felsflanke am Fuß (Unterkante zum flachen Land)
  if (!isM(tx, ty + 1) && ly >= 10) {
    if (ly === 15) return COL.cliff[2];
    return ((x + ((hash2(x >> 1, ty, seed + 31) * 3) | 0)) % 3 === 0) ? COL.cliff[2] : ly === 10 ? COL.mount[1] : COL.cliff[(x >> 1) & 1];
  }
  // dunkle Kontur an den übrigen Kanten
  if ((lx === 0 && !isM(tx - 1, ty)) || (lx === 15 && !isM(tx + 1, ty)) || (ly === 0 && !isM(tx, ty - 1))) return COL.mount[4];
  const h = rockH(x, y, seed), lv = Math.floor(h);
  // Stufen: direkt unter einer höheren Stufe liegt eine Felswand, an der Oberkante einer Stufe eine helle Kante
  const up1 = Math.floor(rockH(x, y - 1, seed)), up3 = Math.floor(rockH(x, y - 3, seed));
  if (up1 > lv || up3 > lv) return up1 > lv ? COL.cliff[1] : COL.cliff[0];
  if (Math.floor(rockH(x, y + 1, seed)) < lv) return J.vulkan ? COL.mount[2] : COL.mount[0];
  // Fläche: Licht von oben links
  const s = rockH(x - 3, y - 3, seed) - rockH(x + 3, y + 3, seed);
  const l = s * 0.9 + (hash2(x >> 1, y >> 1, seed + 41) - 0.5) * 0.3 + (bay(x, y) - 0.5) * 0.3;
  if (J.look === 'goldberg') {   // jede zweite Stufe eine grüne Terrasse, der Rest goldener Fels, ganz oben Gold statt Schnee
    if ((lv & 1) && h < 5.2) return COL.terrace[l > 0.3 ? 0 : l > -0.4 ? 1 : 2];
    return COL.gold[l > 0.5 ? 0 : l > 0.12 ? 1 : l > -0.25 ? 2 : l > -0.6 ? 3 : 4];
  }
  if (!J.vulkan && !J.look && h > 5.2 + (hash2(x >> 2, y >> 2, seed + 43) - 0.5) * 0.5) return COL.snow[l > 0.2 ? 0 : l > -0.3 ? 1 : 2];
  const R = J.vulkan ? COL.basalt : J.look === 'klippe' ? COL.slate : COL.mount;
  return R[l > 0.5 ? 0 : l > 0.12 ? 1 : l > -0.25 ? 2 : l > -0.6 ? 3 : 4];
}
// Rohöl: dunkle, glänzende Flecken
function oilAt(x, y) {
  const u = x / TS - 0.5, v = y / TS - 0.5, ix = Math.floor(u), iy = Math.floor(v), fx = u - ix, fy = v - iy;
  const m = (tx, ty) => J.gO[gi(tx, ty)] === ORE_OIL ? 1 : 0;
  const a = m(ix, iy), b = m(ix + 1, iy), c = m(ix, iy + 1), d = m(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
function oilColor(x, y, seed) {
  const v = oilAt(x, y) + (vnoise(x / 5, y / 5, seed + 97) - 0.5) * 0.55;
  if (v <= 0.5) return null;
  if (v < 0.58) return COL.oil[2];
  if (hash2(x, y, seed + 98) < 0.004) return COL.oil[4];
  const sheen = oilAt(x - 3, y - 3) - oilAt(x + 1, y + 1);
  if (v > 0.7 && sheen < -0.08 && hash2(x >> 1, y, seed + 99) < 0.5) return COL.oil[3];
  return v > 0.8 && ((x + y) & 3) === 0 ? COL.oil[1] : COL.oil[0];
}
function groundColor(x, y, seed) {
  const tx = x >> 4, ty = y >> 4, i = gi(tx, ty), g = J.gG[i];
  if (!landPix(x, y)) {
    if (J.gC[i] || g !== G_WATER) {
      let d = 99;
      for (const k of NEAR) if (landPix(x + k[0], y + k[1])) { d = k[2]; break; }
      if (d <= 1) return COL.foam;
      if (d <= 2.3) return COL.shallow[1];
      if (d <= 4.3) return (d > 3.5 && ((x + y) & 1)) ? COL.deep[0] : COL.shallow[0];
    }
    if (hash2(x >> 2, y, seed + 13) < 0.012) return COL.hi;
    return vnoise(x / 38, y / 30, seed + 5) < 0.42 ? COL.deep[1] : COL.deep[0];
  }
  if (J.gC[i]) {
    let d = 99;
    for (const k of NEAR2) if (!landPix(x + k[0], y + k[1])) { d = k[2]; break; }
    if (d <= 2.3) {
      if (g === G_SAND || g === G_DUNE) return d <= 1 ? [200, 172, 112] : [226, 200, 144];
      if (g === G_ASH) return d <= 1 ? [44, 40, 42] : [96, 88, 84];
      return d <= 1 ? COL.bankD : COL.bank;
    }
  }
  if (g === G_MOUNT) return mountColor(x, y, seed);
  return landColor(g, i, x, y, seed);
}
// Erzadern: runde, schattierte Brocken mit Kontur und weichem Schlagschatten
function nuggets(tx, ty, o, seed) {
  const n = 2 + ((hash2(tx, ty, seed + 77) * 2) | 0), a = [];
  for (let k = 0; k < n; k++) {
    const rx = 2.4 + hash2(tx + k * 7, ty, seed + 5) * 1.6;
    a.push({ cx: tx * TS + 3.5 + hash2(tx, ty + k * 13, seed + 11) * 9, cy: ty * TS + 3.5 + hash2(tx + k * 3, ty, seed + 23) * 9, rx, ry: rx * (0.72 + hash2(tx, ty, seed + k) * 0.2), o });
  }
  return a;
}
function oreColor(x, y, base) {
  const tx = x >> 4, ty = y >> 4, px = x + 0.5, py = y + 0.5;
  let body = null, bodyY = -1e9, edge = null, sh = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const a = J.nug[gi(tx + dx, ty + dy)];
    if (!a) continue;
    for (const n of a) {
      const ux = px - n.cx, uy = py - n.cy, nx = ux / n.rx, ny = uy / n.ry, d = nx * nx + ny * ny;
      if (d <= 1) {
        if (n.cy > bodyY) { bodyY = n.cy; const R = ORE_RAMP[n.o], l = -(nx * 0.55 + ny * 0.8) + (bay(x, y) - 0.5) * 0.35 + (1 - d) * 0.2; body = R[5] && hash2(x, y, 31) < 0.14 ? R[5] : R[l > 0.5 ? 0 : l > 0.05 ? 1 : l > -0.4 ? 2 : 3]; }
        continue;
      }
      const ex = ux / (n.rx + 1), ey = uy / (n.ry + 1);
      if (ex * ex + ey * ey <= 1) { edge = ORE_RAMP[n.o][4]; continue; }
      const sx = (ux - 1.2) / (n.rx + 0.8), sy = (uy - 2) / (n.ry + 0.6);
      if (sx * sx + sy * sy <= 1) { sh = Math.max(sh, 2); continue; }
      const hx = ux / (n.rx + 3.2), hy = (uy - 0.8) / (n.ry + 2.6);
      if (hx * hx + hy * hy <= 1) sh = Math.max(sh, 1);
    }
  }
  if (body) return rgb(body);
  if (edge) return rgb(edge);
  if (sh === 2) return shade(base, 0.5);
  if (sh === 1) return shade(base, 0.8);
  return null;
}

/* ---------- Aufträge ---------- */
// Raster lesen. Liefert { land } (false = nur offenes Meer) und malt noch nichts.
export function createGroundJob(W, cx, cy) {
  if (!NEAR) buildNear();
  const tx0 = cx * CS - P, ty0 = cy * CS - P, n = GW * GW;
  const j = { cx, cy, tx0, ty0, seed: W.seed, row: 0, land: false, vulkan: false, look: null,
    gG: new Uint8Array(n), gC: new Uint8Array(n), gO: new Uint8Array(n), gM: new Uint8Array(n), gN: new Uint8Array(n), oil: new Uint8Array(n), nug: new Array(n).fill(null) };
  for (let y = 0; y < GW; y++) for (let x = 0; x < GW; x++) {
    const X = tx0 + x, Y = ty0 + y, k = y * GW + x, c = W.chunk(X >> 5, Y >> 5), li = ((Y & 31) << 5) | (X & 31);
    j.gG[k] = c.ground[li]; j.gC[k] = c.coast[li]; j.gO[k] = c.ore[li]; j.gM[k] = c.mh[li];
    if (c.ground[li] !== G_WATER || c.coast[li]) j.land = true;
    if (c.ground[li] === G_LAVA || c.ground[li] === G_ASH) j.vulkan = true;
  }
  // NPC-Insel im Chunk? (Stichproben; Inseln liegen mittig in ihren Zellen, ein Chunk berührt höchstens eine NPC-Insel)
  if (W.npcIds && W.npcIds.size) for (let y = 0; y < CS && !j.look; y += 4) for (let x = 0; x < CS && !j.look; x += 4) {
    const k = W.il(cx * CS + x, cy * CS + y), npc = k >= 0 && W.npcOf(k);
    if (npc) j.look = NPC_ISL[npc].look;
  }
  // Erzbrocken (ohne Öl) und ihre Umgebung, Ölflecken
  for (let y = 0; y < GW; y++) for (let x = 0; x < GW; x++) {
    const o = j.gO[y * GW + x];
    if (!o) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= GW || yy >= GW) continue;
      (o === ORE_OIL ? j.oil : j.gN)[yy * GW + xx] = 1;
    }
    if (o !== ORE_OIL) j.nug[y * GW + x] = nuggets(tx0 + x, ty0 + y, o, j.seed);
  }
  return j;
}
// Malt Zeilen in D (ImageData-Daten 512×512), bis deadline (performance.now()) erreicht ist. true = fertig.
export function runGroundJob(j, D, deadline) {
  J = j;
  const seed = j.seed, X0 = j.cx * CS * TS, Y0 = j.cy * CS * TS, SZ = CS * TS;
  while (j.row < SZ) {
    for (let r = 0; r < 8 && j.row < SZ; r++, j.row++) {
      const y = j.row, Y = Y0 + y;
      for (let x = 0; x < SZ; x++) {
        const c = groundColor(X0 + x, Y, seed), p = (y * SZ + x) * 4;
        D[p] = c[0]; D[p + 1] = c[1]; D[p + 2] = c[2]; D[p + 3] = 255;
      }
    }
    if (performance.now() > deadline) break;
  }
  J = null;
  return j.row >= SZ;
}
