/* =========================================================
   INSEL-GENERATOR: eine Insel je Zelle, allein aus (seed, zellX, zellY)
   Reine Funktion, kein DOM-Zugriff (läuft auch im Worker). Liefert null für leere Zellen.
   Ergebnis: Raster (x0, y0, w, h) mit Boden, Vorkommen, Abstand zum Wasser (dw),
   Berghöhe (mh), Küstenkacheln und Startbäumen. Außerhalb des Rasters ist Meer.
   Ablauf wie früher je Insel: Umriss per Rauschen → größte Fläche → Binnenseen zuschütten →
   Abstand zum Wasser → Bodenarten (je Inseltyp) → Berge/Vulkan → Kontorplatz → Vorkommen → Bäume → Küste.
   NPC-Inseln (Version 16, data/npcs.js): in ihrer Zelle entsteht statt einer Zufallsinsel die Vorlage des NPCs
   (Größe, Optik look: Klippen, Bucht oder Goldberg, keine Vorkommen, Lichtung um den Steg).
   ========================================================= */
import { CELL, CELL_EDGE, G_WATER, G_SAND, G_GRASS, G_ROCK, G_DUNE, G_MOUNT, G_LAVA, G_ASH, BUILDABLE } from '../config.js';
import { HOME, ISL_TYPES, RINGS, ringIndex, islandRadius, oreScale, islFlag, homeDist } from '../data/islands.js';
import { NPC_ISL } from '../data/npcs.js';
import { ORE_IDX, ORE_OIL } from '../data/items.js';
import { mulberry32, fbm, hash2, hashInt } from '../util/math.js';
import { islId, cellMin } from '../util/tiles.js';

const NOISE = 0.45;           // Stärke der Rauschverformung des Umrisses

function pick(weights, r) {
  let acc = 0;
  for (const k in weights) { acc += weights[k]; if (r < acc) return k; }
  return Object.keys(weights)[0];
}

// homes = Zellen der Heimatinseln [[cx, cy], …] (Getrennte Inseln); fehlt es, gibt es nur die Heimatinsel bei (0,0).
// Jede Heimatinsel entsteht nach der Vorlage HOME; Ring, Größe und Vorkommen der übrigen Inseln richten sich nach der nächsten Heimatinsel.
// npc = ID des NPCs, dem diese Zelle gehört (data/npcs.js), sonst null
export function genIsland(seed, cx, cy, homes, npc) {
  const slot = homes && homes.length > 1 ? homes.findIndex(h => h[0] === cx && h[1] === cy) : cx === 0 && cy === 0 ? 0 : -1, home = slot >= 0;
  const NP = !home && npc ? NPC_ISL[npc] : null, look = NP ? NP.look : null;
  const dist = homeDist(homes, cx * CELL, cy * CELL), ringIdx = ringIndex(dist), ring = RINGS[ringIdx];
  const rnd = mulberry32(hashInt(seed ^ 0x5bd1e995, cx, cy));
  if (!home && rnd() < ring.empty && !NP) return null;
  const type = home ? HOME.type : NP ? 'normal' : pick(ring.types, rnd());
  const r = home ? HOME.r : NP ? NP.r * (0.95 + rnd() * 0.1) : islandRadius(dist, rnd());
  const id = islId(cx, cy), nseed = seed + (id % 9973) * 17;
  const noise = look === 'goldberg' ? NOISE * 0.5 : NOISE;

  // Mittelpunkt mit Zufallsversatz, sodass die Insel ihre Zelle nicht verlässt
  const ext = Math.ceil(r * (1 + NOISE / 2)) + 1, extY = Math.ceil(r * 0.85 * (1 + NOISE / 2)) + 1;
  const cminX = cellMin(cx), cminY = cellMin(cy), HALF = CELL / 2;
  const offX = Math.max(0, HALF - CELL_EDGE - ext), offY = Math.max(0, HALF - CELL_EDGE - extY);
  const icx = cx * CELL + (home || NP ? (rnd() - 0.5) * 3 : (rnd() * 2 - 1) * offX);
  const icy = cy * CELL + (home || NP ? (rnd() - 0.5) * 3 : (rnd() * 2 - 1) * offY);
  // Richtung zur nächsten Heimatinsel (Steg, Bucht und klippenfreie Seite der NPC-Inseln zeigen dorthin)
  const nh = !home && homes && homes.length > 1 ? homes.reduce((a, h) => Math.hypot(cx - h[0], cy - h[1]) < Math.hypot(cx - a[0], cy - a[1]) ? h : a) : [0, 0];
  const toH = Math.atan2(nh[1] * CELL - icy, nh[0] * CELL - icx);
  const offH = (X, Y) => { const a = Math.abs(Math.atan2(Y - icy, X - icx) - toH) % (2 * Math.PI); return Math.min(a, 2 * Math.PI - a); };
  // Raster: Insel plus Rand, innerhalb der Zelle
  const x0 = Math.max(cminX, Math.floor(icx - ext) - 3), x1 = Math.min(cminX + CELL - 1, Math.ceil(icx + ext) + 3);
  const y0 = Math.max(cminY, Math.floor(icy - extY) - 3), y1 = Math.min(cminY + CELL - 1, Math.ceil(icy + extY) + 3);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, N = w * h;
  const lxMin = cminX + CELL_EDGE - x0, lxMax = cminX + CELL - 1 - CELL_EDGE - x0, lyMin = cminY + CELL_EDGE - y0, lyMax = cminY + CELL - 1 - CELL_EDGE - y0;
  const nb = (i) => { const x = i % w, y = (i / w) | 0, o = []; if (x > 0) o.push(i - 1); if (x < w - 1) o.push(i + 1); if (y > 0) o.push(i - w); if (y < h - 1) o.push(i + w); return o; };

  // Umriss
  let land = new Uint8Array(N);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x < lxMin || x > lxMax || y < lyMin || y > lyMax) continue;
    const X = x0 + x, Y = y0 + y, dx = (X + 0.5 - icx) / r, dy = (Y + 0.5 - icy) / (r * 0.85);
    if (1 - Math.hypot(dx, dy) + (fbm(X / 7, Y / 7, nseed, 3) - 0.5) * noise > 0) land[y * w + x] = 1;
  }
  // Werkstattbucht: eine tiefe, runde Bucht zur Heimatinsel hin
  if (look === 'bucht') {
    const bx = icx + Math.cos(toH) * r * 0.62, by = icy + Math.sin(toH) * r * 0.85 * 0.62, br = r * 0.42;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x0 + x + 0.5 - bx, y0 + y + 0.5 - by) < br) land[y * w + x] = 0;
  }
  // Nur die größte zusammenhängende Fläche behalten
  const comp = new Int32Array(N).fill(-1);
  let best = -1, bestN = 0;
  for (let i = 0; i < N; i++) {
    if (!land[i] || comp[i] >= 0) continue;
    const q = [i]; comp[i] = i;
    for (let k = 0; k < q.length; k++) for (const n of nb(q[k])) if (land[n] && comp[n] < 0) { comp[n] = i; q.push(n); }
    if (q.length > bestN) { bestN = q.length; best = i; }
  }
  if (best < 0) return null;
  for (let i = 0; i < N; i++) if (land[i] && comp[i] !== best) land[i] = 0;
  // Binnenseen zuschütten: Meer ist, was vom Rasterrand aus erreichbar ist
  const ocean = new Uint8Array(N); let q = [];
  for (let i = 0; i < N; i++) { const x = i % w, y = (i / w) | 0; if (!land[i] && (x === 0 || y === 0 || x === w - 1 || y === h - 1)) { ocean[i] = 1; q.push(i); } }
  for (let k = 0; k < q.length; k++) for (const n of nb(q[k])) if (!ocean[n] && !land[n]) { ocean[n] = 1; q.push(n); }
  for (let i = 0; i < N; i++) if (!ocean[i]) land[i] = 1;
  // Abstand zum Wasser
  const dw = new Uint8Array(N); q = [];
  for (let i = 0; i < N; i++) if (land[i] && nb(i).some(n => !land[n])) { dw[i] = 1; q.push(i); }
  for (let k = 0; k < q.length; k++) for (const n of nb(q[k])) if (land[n] && !dw[n]) { dw[n] = Math.min(255, dw[q[k]] + 1); q.push(n); }
  let maxDw = 0;
  for (let i = 0; i < N; i++) if (dw[i] > maxDw) maxDw = dw[i];

  // Bodenarten je Inseltyp
  const ground = new Uint8Array(N), XY = (i) => [x0 + i % w, y0 + ((i / w) | 0)];
  let mountThr = 0;
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const [X, Y] = XY(i);
    if (type === 'sand') {
      if (dw[i] === 1) ground[i] = G_SAND;
      else ground[i] = dw[i] >= 3 && fbm(X / 6, Y / 6, nseed + 55, 3) > 0.7 ? G_GRASS : G_DUNE;   // kleine Oasen
    } else if (type === 'vulkan') {
      ground[i] = dw[i] <= 1 || (dw[i] === 2 && fbm(X / 5, Y / 5, nseed + 33, 2) < 0.45) ? G_SAND : G_ASH;
    } else if (look === 'klippe') {
      ground[i] = fbm(X / 6, Y / 6, nseed + 61, 3) > 0.6 ? G_GRASS : G_ROCK;
      if (dw[i] === 1 && fbm(X / 5, Y / 5, nseed + 62, 2) < 0.35) ground[i] = G_SAND;
    } else {
      if (dw[i] === 1 && fbm(X / 6, Y / 6, seed + 33, 2) < 0.6) ground[i] = G_SAND;
      else if (dw[i] >= 3 && fbm(X / 7, Y / 7, seed + 51, 3) > 0.71) ground[i] = G_ROCK;
      else ground[i] = G_GRASS;
    }
  }
  // Vulkan: Berg in der Mitte, oben ein Lavakrater
  if (type === 'vulkan' && maxDw >= 4) {
    mountThr = Math.max(3, Math.round(maxDw * 0.6));
    const lavaThr = maxDw - Math.max(1, Math.round(maxDw * 0.2));
    for (let i = 0; i < N; i++) if (land[i] && dw[i] >= mountThr) ground[i] = dw[i] >= lavaThr ? G_LAVA : G_MOUNT;
    // Lava nur innerhalb eines Kraterrands
    for (let i = 0; i < N; i++) if (ground[i] === G_LAVA && nb(i).some(n => ground[n] !== G_LAVA && ground[n] !== G_MOUNT)) ground[i] = G_MOUNT;
  }
  // Pfahldorf: graue Klippen entlang der Küste, nur nicht auf der Seite zur Heimatinsel (dort liegen Steg und Dorf)
  if (look === 'klippe') for (let i = 0; i < N; i++) {
    if (!land[i] || dw[i] > 2) continue;
    const [X, Y] = XY(i);
    if (offH(X + 0.5, Y + 0.5) > 1.05 && fbm(X / 4, Y / 4, nseed + 64, 2) > (dw[i] === 1 ? 0.3 : 0.48)) ground[i] = G_MOUNT;
  }
  // Goldberg: ein großer Berg in der Mitte (Terrassen und Gold zeichnet gfx/ground.js)
  if (look === 'goldberg' && maxDw >= 5) {
    mountThr = Math.max(4, Math.round(maxDw * 0.6));
    for (let i = 0; i < N; i++) if (land[i] && dw[i] >= mountThr) ground[i] = G_MOUNT;
  }
  // Berge auf normalen Inseln: 1–3 zusammenhängende Felsformationen
  if (type === 'normal' && !look) {
    const n = home ? HOME.mountains : rnd() < ISL_TYPES.normal.mountainChance ? 1 + Math.floor(rnd() * 3) : 0;
    for (let f = 0; f < n; f++) {
      let c = -1;
      for (let a = 0; a < 200 && c < 0; a++) { const i = (rnd() * N) | 0; if (dw[i] >= Math.min(7, maxDw - 1) && ground[i] !== G_MOUNT) c = i; }
      if (c < 0) break;
      const s = 2.5 + rnd() * (home ? 2.5 : 3.5) + r / 18, ang = rnd() * Math.PI, el = 1 + rnd() * 0.8;
      const co = Math.cos(ang), si = Math.sin(ang), [CX, CY] = XY(c), R = Math.ceil(s * el * 1.6);
      for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) {
        const lx = c % w + xx, ly = ((c / w) | 0) + yy;
        if (lx < 0 || ly < 0 || lx >= w || ly >= h) continue;
        const j = ly * w + lx;
        if (!land[j] || dw[j] < 3) continue;
        const u = (xx * co + yy * si) / el, v = -xx * si + yy * co;
        if (1 - Math.hypot(u, v) / s + (fbm((CX + xx) / 4, (CY + yy) / 4, nseed + 71 + f, 3) - 0.5) * 0.9 > 0) ground[j] = G_MOUNT;
      }
    }
  }
  // Berghöhe: Abstand zum Bergrand (für die Schattierung beim Zeichnen)
  const mh = new Uint8Array(N); q = [];
  for (let i = 0; i < N; i++) if (ground[i] === G_MOUNT && nb(i).some(n => ground[n] !== G_MOUNT && ground[n] !== G_LAVA)) { mh[i] = 1; q.push(i); }
  for (let k = 0; k < q.length; k++) for (const n of nb(q[k])) if ((ground[n] === G_MOUNT || ground[n] === G_LAVA) && !mh[n]) { mh[n] = Math.min(255, mh[q[k]] + 1); q.push(n); }

  // Platz für das Hauptkontor (3×3) 1–2 Felder von der Küste: gerader Steg (1 breit) von der Mitte einer Seite zum Meer,
  // die drei übrigen Seiten frei (Land ohne Berg und Lava). Heimatinsel nach Osten, sonst zum Spawn (zur nächsten Heimatinsel) hin.
  // Gibt es keinen solchen Platz, zählen zuerst zwei, dann keine freien Seiten.
  const tgtX = home ? icx + r : nh[0] * CELL, tgtY = home ? icy : nh[1] * CELL;
  const inG = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const buildable = (x, y) => inG(x, y) && land[y * w + x] && BUILDABLE[ground[y * w + x]];
  const water = (x, y) => !inG(x, y) || !land[y * w + x];
  let kontor = null, dock = null;
  const SIDES = [[[3, 0], [3, 1], [3, 2]], [[0, 3], [1, 3], [2, 3]], [[-1, 0], [-1, 1], [-1, 2]], [[0, -1], [1, -1], [2, -1]]];
  const STEP = [[1, 0], [0, 1], [-1, 0], [0, -1]], MID = [[3, 1], [1, 3], [-1, 1], [1, -1]];
  for (const need of [3, 2, 0]) {
    let bs = 1e18;
    for (let y = 1; y < h - 3; y++) for (let x = 1; x < w - 3; x++) {
      let ok = true;
      for (let dy = 0; dy < 3 && ok; dy++) for (let dx = 0; dx < 3; dx++) if (!buildable(x + dx, y + dy)) { ok = false; break; }
      if (!ok) continue;
      for (let d = 0; d < 4; d++) {
        let sl = 0;
        const sx = x + MID[d][0], sy = y + MID[d][1];
        for (let i = 0; i <= 2; i++) {
          const px = sx + STEP[d][0] * i, py = sy + STEP[d][1] * i;
          if (water(px, py)) { sl = i; break; }
          if (!buildable(px, py) || i === 2) { sl = -1; break; }
        }
        if (sl < 1) continue;
        let free = 0;
        for (let o = 0; o < 4; o++) if (o !== d && SIDES[o].every(([ax, ay]) => buildable(x + ax, y + ay))) free++;
        if (free < need) continue;
        const sc = Math.hypot(x0 + x + 1.5 - tgtX, y0 + y + 1.5 - tgtY);
        if (sc < bs) { bs = sc; kontor = { x: x0 + x, y: y0 + y, d, sl }; dock = { x: x0 + sx + STEP[d][0] * sl, y: y0 + sy + STEP[d][1] * sl }; }
      }
    }
    if (kontor) break;
  }

  // Vorkommen
  const ore = new Uint8Array(N), sc = oreScale(dist);
  const ores = home ? HOME.ores.map(([o, n, s]) => [o, n, s || 1]) : NP ? [] :
    ((ring.ores && ring.ores[type]) || []).map(([o, a, b, s]) => [o, a + Math.floor(rnd() * (b - a + 1)), s || 1]);
  const summary = {};
  for (const [name, n, size] of ores) {
    const oi = ORE_IDX[name], oil = oi === ORE_OIL, sulfur = name === 'schwefel';
    const okGround = (g) => oil ? (g === G_SAND || g === G_DUNE) : BUILDABLE[g];
    for (let c = 0; c < n; c++) {
      for (let a = 0; a < 400; a++) {
        const i = (rnd() * N) | 0, minDw = a < 200 ? 3 : a < 320 ? 2 : 1;
        if (!land[i] || !okGround(ground[i]) || dw[i] < (oil ? 2 : minDw)) continue;
        if (sulfur && mountThr && (dw[i] < mountThr - 3 || dw[i] >= mountThr) && a < 300) continue;   // am Fuß des Vulkans
        const x = i % w, y = (i / w) | 0;
        if (kontor && Math.hypot(x0 + x - kontor.x - 1, y0 + y - kontor.y - 1) < 6) continue;
        let near = false;
        for (let yy = y - 4; yy <= y + 4 && !near; yy++) for (let xx = x - 4; xx <= x + 4; xx++) { if (xx >= 0 && yy >= 0 && xx < w && yy < h && ore[yy * w + xx]) { near = true; break; } }
        if (near) continue;
        const rr = oil ? 0.9 + rnd() * 0.6 : (1.6 + rnd() * 1.1) * size * sc, R = Math.ceil(rr) + 1;
        for (let yy = y - R; yy <= y + R; yy++) for (let xx = x - R; xx <= x + R; xx++) {
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const j = yy * w + xx;
          if (!land[j] || !okGround(ground[j]) || dw[j] < Math.min(2, minDw)) continue;
          if (Math.hypot(xx - x, yy - y) + (hash2(x0 + xx, y0 + yy, seed + oi) - 0.5) * 0.9 <= rr) {
            if (!ore[j]) summary[name] = (summary[name] || 0) + 1;
            ore[j] = oi;
            if (type === 'normal' && ground[j] === G_SAND) ground[j] = G_GRASS;
          }
        }
        break;
      }
    }
  }

  // Bäume: Wälder auf Wiesen, vereinzelt Palmen auf Sandinseln
  const tree0 = new Uint8Array(N);
  if (type !== 'vulkan') {
    for (const th of [0.55, 0.5]) {
      let n0 = 0;
      for (let i = 0; i < N; i++) {
        if (ground[i] !== G_GRASS || ore[i] || tree0[i]) { if (tree0[i]) n0++; continue; }
        const [X, Y] = XY(i);
        if (fbm(X / 7, Y / 7, seed + 91, 3) > th) { tree0[i] = 1; n0++; }
      }
      if (!home || n0 >= 140) break;
    }
  }
  if (type === 'sand') for (let i = 0; i < N; i++) {
    if ((ground[i] !== G_SAND && ground[i] !== G_DUNE) || ore[i]) continue;
    const [X, Y] = XY(i);
    if (hash2(X, Y, seed + 404) < (dw[i] <= 2 ? 0.05 : 0.018)) tree0[i] = 1;
  }
  if (home && kontor) for (let y = kontor.y - 2; y <= kontor.y + 4; y++) for (let x = kontor.x - 2; x <= kontor.x + 4; x++) {
    const lx = x - x0, ly = y - y0;
    if (lx >= 0 && ly >= 0 && lx < w && ly < h) tree0[ly * w + lx] = 0;
  }
  // NPC-Inseln: Lichtung für das Dorf um den Steg
  if (NP && kontor) for (let i = 0; i < N; i++) { const [X, Y] = XY(i); if (Math.hypot(X - kontor.x - 1, Y - kontor.y - 1) < 11) tree0[i] = 0; }

  // Küsten-Kacheln (Wasser/Land-Wechsel im 3×3-Umfeld; außerhalb des Rasters ist Wasser)
  const coast = new Uint8Array(N);
  let tiles = 0;
  for (let i = 0; i < N; i++) {
    const x = i % w, y = (i / w) | 0, w0 = !land[i];
    if (land[i]) tiles++;
    for (let dy = -1; dy <= 1 && !coast[i]; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy, w1 = xx < 0 || yy < 0 || xx >= w || yy >= h ? true : !land[yy * w + xx];
      if (w1 !== w0) { coast[i] = 1; break; }
    }
  }
  for (let i = 0; i < N; i++) if (!land[i]) ground[i] = G_WATER;

  return {
    id, cx, cy, home, slot: home ? slot + 1 : 0, type, ring: ringIdx, dist: Math.round(dist), r: Math.round(r * 10) / 10,
    x: Math.round(icx), y: Math.round(icy), name: home ? HOME.name : NP ? NP.isl : null, flag: NP ? NP.flag : islFlag(id), npc: NP ? npc : null, look,
    x0, y0, w, h, ground, ore, dw, mh, coast, tree0, tiles, kontor, dock, ores: summary,
    big: maxDw >= 9
  };
}
