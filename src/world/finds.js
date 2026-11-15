/* =========================================================
   FUNDE AUF SEE: Lage und Inhalt aus Seed und Fund-Zelle (Tabellen in data/finds.js)
   Gleicher Seed = gleiche Funde, in Simulation und Oberfläche. Eingesammelt wird in der
   Simulation; was übrig ist, steht in state.loot (Fund-Schlüssel → 0 = leer, oder [{it, n}] = Rest).
   Für die Küstenprüfung wird nur rawGround benutzt (keine Boden-Chunks), damit auch die Minimap
   viele Zellen günstig abfragen kann. Kein DOM-Zugriff.
   ========================================================= */
import { FIND_CELL, FIND_COAST, G_WATER } from '../config.js';
import { FIND_SPAWN, FIND_LOOT } from '../data/finds.js';
import { hash2 } from '../util/math.js';
import { tk } from '../util/tiles.js';

const MAX_CACHE = 6000;

function openSea(W, x, y) {
  const r = FIND_COAST - 1;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (W.rawGround(x + dx, y + dy) !== G_WATER) return false;
  return true;
}
function lootFor(W, kind, x, y, salt) {
  const T = FIND_LOOT[kind][Math.min(FIND_LOOT[kind].length - 1, W.ringAt(x, y))];
  const pool = T.items.slice(), out = [];
  for (let i = 0; i < T.kinds && pool.length; i++) {
    const it = pool.splice(Math.floor(hash2(x, y, W.seed + salt + i * 31) * pool.length), 1)[0];
    out.push({ it, n: T.min + Math.floor(hash2(y, x, W.seed + salt + i * 57) * (T.max - T.min + 1)) });
  }
  // Bonus (ein Eintrag oder eine Liste); der erste Eintrag würfelt wie bisher, damit bekannte Wracks gleich bleiben
  [].concat(T.bonus || []).forEach((B, j) => {
    if (hash2(x, y, W.seed + salt + 7919 + j * 101) < B.chance) out.push({ it: B.it, n: B.min + Math.floor(hash2(y, x, W.seed + salt + 7927 + j * 101) * (B.max - B.min + 1)) });
  });
  return out;
}
// Funde einer Fund-Zelle: [{ key, x, y, kind: 'drift'|'wreck', items: [{it, n}] }]
export function findsInCell(W, cx, cy) {
  const cache = W._finds || (W._finds = new Map()), ck = cx * 1000003 + cy;
  let list = cache.get(ck);
  if (list) return list;
  if (cache.size >= MAX_CACHE) cache.clear();
  list = [];
  const seed = W.seed, X0 = cx * FIND_CELL, Y0 = cy * FIND_CELL, h = hash2(cx, cy, seed + 4711);
  const W8 = FIND_SPAWN.drift;
  let nd = 0, acc = W8[0];
  while (nd < W8.length - 1 && h >= acc) acc += W8[++nd];
  const want = [];
  for (let i = 0; i < nd; i++) want.push('drift');
  if (hash2(cx, cy, seed + 919) < FIND_SPAWN.wreck) want.push('wreck');
  want.forEach((kind, i) => {
    // bis zu 6 Versuche, einen Platz auf offener See zu finden
    for (let t = 0; t < 6; t++) {
      const x = X0 + Math.floor(hash2(cx * 7 + i, cy * 13 + t, seed + 1301) * FIND_CELL);
      const y = Y0 + Math.floor(hash2(cx * 11 + t, cy * 5 + i, seed + 1709) * FIND_CELL);
      if (!openSea(W, x, y) || list.some(f => Math.abs(f.x - x) < 3 && Math.abs(f.y - y) < 3)) continue;
      list.push({ key: tk(x, y), x, y, kind, items: lootFor(W, kind, x, y, i * 101) });
      break;
    }
  });
  cache.set(ck, list);
  return list;
}
// Funde im Quadrat mit Radius r um (x, y)
export function findsNear(W, x, y, r) {
  const out = [], c0 = Math.floor((x - r) / FIND_CELL), c1 = Math.floor((x + r) / FIND_CELL), d0 = Math.floor((y - r) / FIND_CELL), d1 = Math.floor((y + r) / FIND_CELL);
  for (let cy = d0; cy <= d1; cy++) for (let cx = c0; cx <= c1; cx++) for (const f of findsInCell(W, cx, cy)) if (Math.abs(f.x - x) <= r && Math.abs(f.y - y) <= r) out.push(f);
  return out;
}
// Was von einem Fund noch übrig ist (null = eingesammelt)
export function lootLeft(loot, f) {
  const v = loot && loot[f.key];
  if (v === 0) return null;
  return Array.isArray(v) ? (v.length ? v : null) : f.items;
}
