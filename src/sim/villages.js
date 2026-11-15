/* =========================================================
   NPC-DÖRFER (Daten: data/npcs.js, Insel-Vorlagen: world/worldgen.js)
   buildVillage legt beim Spielstart (und bei der Migration auf Version 16) das Dorf eines NPCs an:
   den Steg (npchafen) am erzeugten Kontorplatz, danach die Gebäude der Vorlage, die nächsten Plätze zum Steg zuerst
   (mit etwas Zufall aus dem Seed, VILLAGE_GAP Felder Abstand, 'coast' = mit Meer daneben).
   Die Gebäude gehören dem NPC (by = owner = 'npc:<id>'), sind fest und stehen still. Nebel wird dabei nicht aufgedeckt.
   Abfragen (npcPort, shipAtPort, isNpcB) laufen auch auf dem Spiegel. Kein DOM-Zugriff.
   ========================================================= */
import { BUILDABLE, G_MOUNT, G_LAVA, DIRS } from '../config.js';
import { BD } from '../data/buildings.js';
import { NPC_ISL, NPC_ORDER, VILLAGE_GAP, npcPid, npcOfPid } from '../data/npcs.js';
import { hash2 } from '../util/math.js';
import { stegLine, STEG_MAX } from './kontor.js';
import { portOf } from './ships.js';

// Gehört das Gebäude (oder Schiff) einem NPC?
export const isNpcB = (b) => !!b && !!npcOfPid(b.by);
// Steg des NPCs (oder null)
export function npcPort(g, npc) {
  for (const b of g.blds.values()) if (b.t === 'npchafen' && b.npc === npc) return b;
  return null;
}
// Ein Schiff liegt am Steg P (höchstens PORT_RANGE Felder vom Anleger, steht still). Liefert das Schiff oder null.
export function shipAtPort(g, P) {
  for (const s of g.state.ships) if (s.st !== 'sail' && portOf(g, s) === P) return s;
  return null;
}

/* ---------- Dorf bauen ---------- */
function bodyOk(g, k, x, y, w, h, gap) {
  const W = g.W;
  for (let dy = -gap; dy < h + gap; dy++) for (let dx = -gap; dx < w + gap; dx++) {
    const xx = x + dx, yy = y + dy, inside = dx >= 0 && dy >= 0 && dx < w && dy < h;
    if (g.bmap.get(xx, yy)) return false;
    if (!inside) continue;
    const gr = W.gr(xx, yy);
    if (W.il(xx, yy) !== k || !BUILDABLE[gr] || gr === G_MOUNT || gr === G_LAVA) return false;
  }
  return true;
}
// Steg-Länge für einen 3×3-Steg an (x, y) zur Seite d (1–STEG_MAX) oder 0
function stegLen(g, k, x, y, d) {
  const L = stegLine('npchafen', x, y, d, STEG_MAX + 1);
  for (let i = 0; i <= STEG_MAX; i++) {
    const p = L.tiles[i];
    if (g.W.ocean(p.x, p.y)) return i;
    const gr = g.W.gr(p.x, p.y);
    if (g.W.il(p.x, p.y) !== k || gr === G_MOUNT || gr === G_LAVA || g.bmap.get(p.x, p.y)) return 0;
  }
  return 0;
}
// Platz für den Steg: erzeugter Kontorplatz, sonst der erste passende Platz auf der Insel
function dockSpot(g, I) {
  const k = I.id;
  if (I.kontor && bodyOk(g, k, I.kontor.x, I.kontor.y, 3, 3, 0)) { const sl = stegLen(g, k, I.kontor.x, I.kontor.y, I.kontor.d); if (sl) return { x: I.kontor.x, y: I.kontor.y, d: I.kontor.d, sl }; }
  for (let y = I.y0; y < I.y0 + I.h - 2; y++) for (let x = I.x0; x < I.x0 + I.w - 2; x++) {
    if (!bodyOk(g, k, x, y, 3, 3, 0)) continue;
    for (let d = 0; d < 4; d++) { const sl = stegLen(g, k, x, y, d); if (sl) return { x, y, d, sl }; }
  }
  return null;
}
const seaNext = (g, x, y, w, h) => { for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) if (g.W.ocean(xx, yy)) return true; return false; };
// Dorf des NPCs id anlegen. addBuilding aus sim/buildings.js (übergeben, damit hier keine Abhängigkeit entsteht). Liefert den Steg oder null.
export function buildVillage(g, id, addBuilding) {
  const k = g.W.npcIsl(id), I = k >= 0 ? g.W.island(k) : null, V = NPC_ISL[id], by = npcPid(id);
  if (!I || npcPort(g, id)) return null;
  const d = g.state.isl[k] || (g.state.isl[k] = { inv: {} });
  d.name = V.isl; d.flag = V.flag;
  const spot = dockSpot(g, I);
  if (!spot) return null;
  const mk = (t, x, y, dd, extra) => { const b = Object.assign({ id: g.state.nextId++, t, x, y, d: dd || 0, isl: k, buf: {}, out: {}, prog: 0, acc: 0, by, owner: by, npc: id }, extra || {}); addBuilding(g, b, true); return b; };
  const port = mk('npchafen', spot.x, spot.y, spot.d, { sl: spot.sl });
  placeVillage(g, id, V.village, addBuilding, 0, 22);
  return port;
}
// Gebäude der Liste [[Typ, Anzahl, 'coast']] um den Steg des NPCs id setzen, die nächsten freien Plätze zuerst
// (n0 = Zähler für den Zufall, rmax = höchster Abstand zum Steg). Wachsende Dörfer (sim/npc.js) nutzen das ebenso.
// Liefert die Zahl gesetzter Gebäude; ohne Platz wird ein Gebäude still übersprungen.
export function placeVillage(g, id, list, addBuilding, n0, rmax) {
  const P = npcPort(g, id), k = P ? P.isl : -1, I = k >= 0 ? g.W.island(k) : null, by = npcPid(id);
  if (!I) return 0;
  const pcx = P.x + 1.5 + DIRS[P.d][0] * 0.5, pcy = P.y + 1.5 + DIRS[P.d][1] * 0.5, seed = g.state.seed;
  let n = n0, placed = 0;
  for (const [t, cnt, where] of list) for (let i = 0; i < cnt; i++, n++) {
    const D = BD[t];
    let best = null, bs = Infinity;
    for (let y = I.y0; y <= I.y0 + I.h - D.h; y++) for (let x = I.x0; x <= I.x0 + I.w - D.w; x++) {
      const dist = Math.hypot(x + D.w / 2 - pcx, y + D.h / 2 - pcy);
      if (dist > rmax || dist >= bs) continue;
      const sc = dist + hash2(x, y, seed + n * 31) * 4;
      if (sc >= bs || !bodyOk(g, k, x, y, D.w, D.h, VILLAGE_GAP)) continue;
      if (where === 'coast' && !seaNext(g, x, y, D.w, D.h)) continue;
      bs = sc; best = { x, y };
    }
    if (!best) continue;
    addBuilding(g, { id: g.state.nextId++, t, x: best.x, y: best.y, d: 0, isl: k, buf: {}, out: {}, prog: 0, acc: 0, by, owner: by, npc: id }, true);
    placed++;
  }
  return placed;
}
// Alle Dörfer der Welt (neues Spiel, Migration)
export function buildVillages(g, addBuilding) { for (const id of NPC_ORDER) buildVillage(g, id, addBuilding); }
