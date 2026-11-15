/* =========================================================
   KONTORE UND SPEICHER
   Hauptkontor (kontor, 3×3, oder kontoralt, 2×2 aus alten Spielständen) = Inselinventar (state.isl[k].inv).
   Lagerkiste und Handelskontor haben einen eigenen Bestand b.inv (nicht im Inselinventar).
   Hauptkontor und Handelskontor haben einen Steg: ein Feld breit, gerade von der Mitte einer Seite (b.d) zum Meer,
   b.sl = Zahl der Steg-Felder an Land (1–2), das erste Meeresfeld dahinter ist der Anleger (b._dock).
   Die Steg-Felder gehören zum Gebäude (Belegung), sind nicht bebaubar und nehmen keine Items an.
   Abfragen laufen auch auf dem Spiegel der Oberfläche. Kein DOM-Zugriff.
   ========================================================= */
import { DIRS, BUILDABLE, G_MOUNT, G_LAVA } from '../config.js';
import { BD, HQ, STEG, PORTS } from '../data/buildings.js';
import { islData, invOf, islName, ownerOf, fogOf } from './state.js';
import { mods } from './mods.js';
import { npcName } from '../data/npcs.js';

export const STEG_MAX = 2;   // so viele Steg-Felder an Land höchstens (Kontor 1–2 Felder von der Küste)

/* ---------- Geometrie ---------- */
// Steg eines Gebäudes vom Typ t an (x, y) zur Seite d mit sl Feldern: { tiles: [{x, y}], dock: {x, y} }
export function stegLine(t, x, y, d, sl) {
  const D = BD[t], [dx, dy] = DIRS[d];
  const sx = d === 0 ? x + D.w : d === 2 ? x - 1 : x + (D.w >> 1);
  const sy = d === 1 ? y + D.h : d === 3 ? y - 1 : y + (D.h >> 1);
  const tiles = [];
  for (let i = 0; i < sl; i++) tiles.push({ x: sx + dx * i, y: sy + dy * i });
  return { tiles, dock: { x: sx + dx * sl, y: sy + dy * sl } };
}
export const stegOf = (b) => STEG.has(b.t) && b.sl > 0 ? stegLine(b.t, b.x, b.y, b.d, b.sl) : null;
// Alle belegten Felder eines Gebäudes: Grundfläche und Steg
export function bldTiles(b) {
  const D = BD[b.t], o = [];
  for (let dy = 0; dy < D.h; dy++) for (let dx = 0; dx < D.w; dx++) o.push({ x: b.x + dx, y: b.y + dy });
  const s = stegOf(b);
  if (s) o.push(...s.tiles);
  return o;
}
// Liegt (x, y) in der Grundfläche (nicht auf dem Steg)?
export function inBody(b, x, y) { const D = BD[b.t]; return x >= b.x && x < b.x + D.w && y >= b.y && y < b.y + D.h; }

/* ---------- Platzierung mit Steg ---------- */
// Darf ein Gebäude t (Hauptkontor/Handelskontor) der Insel isl an (x, y) mit Steg zur Seite d stehen?
// opt.ignore = Gebäude-ID, deren Felder als frei gelten (Kontor verlegen). → { ok, reason, sl, dock }
export function stegSpot(g, t, isl, x, y, d, opt) {
  const W = g.W, D = BD[t], ign = opt && opt.ignore;
  const free = (xx, yy) => { const id = g.bmap.get(xx, yy); return !id || id === ign; }, fog = fogOf(g);
  const fail = (reason) => ({ ok: false, reason, sl: 0, dock: null });
  for (let dy = 0; dy < D.h; dy++) for (let dx = 0; dx < D.w; dx++) {
    const xx = x + dx, yy = y + dy, il = W.il(xx, yy), gr = W.gr(xx, yy);
    if (!fog.get(xx, yy)) return fail('Unerkundetes Gebiet.');
    if (il !== isl) return fail(il < 0 ? `Das ${D.name} muss ganz an Land stehen.` : `Das ${D.name} muss ganz auf dieser Insel stehen.`);
    if (gr === G_MOUNT) return fail(`Auf Bergen kann kein ${D.name} stehen.`);
    if (gr === G_LAVA) return fail(`Auf Lava kann kein ${D.name} stehen.`);
    if (!BUILDABLE[gr]) return fail('Hier kann nicht gebaut werden.');
    if (!free(xx, yy)) return fail('Hier steht schon etwas.');
    if (g.pipes.get(xx, yy)) return fail('Hier liegt ein Rohr.');
  }
  const L = stegLine(t, x, y, d, STEG_MAX + 1);
  for (let i = 0; i <= STEG_MAX; i++) {
    const p = L.tiles[i], xx = p.x, yy = p.y;
    if (W.ocean(xx, yy)) {
      if (i === 0) return fail(`Zu nah am Wasser: Das ${D.name} steht 1–2 Felder von der Küste, der Steg führt zum Meer.`);
      return { ok: true, reason: '', sl: i, dock: { x: xx, y: yy } };
    }
    if (i === STEG_MAX) return fail(`Zu weit von der Küste: Der Steg ist höchstens ${STEG_MAX} Felder lang.`);
    const gr = W.gr(xx, yy);
    if (!fog.get(xx, yy)) return fail('Unerkundetes Gebiet.');
    if (W.il(xx, yy) !== isl) return fail('Der Steg muss auf dieser Insel beginnen.');
    if (gr === G_MOUNT || gr === G_LAVA) return fail('Der Steg kann nicht über Berge oder Lava führen.');
    if (!free(xx, yy)) return fail('Auf dem Weg des Stegs steht schon etwas.');
    if (g.pipes.get(xx, yy)) return fail('Auf dem Weg des Stegs liegt ein Rohr.');
  }
  return fail('Kein Weg zum Meer.');
}
// Gültige Steg-Richtungen an (x, y): [{ d, sl, dock }]
export function stegDirs(g, t, isl, x, y, opt) {
  const o = [];
  for (let d = 0; d < 4; d++) { const r = stegSpot(g, t, isl, x, y, d, opt); if (r.ok) o.push({ d, sl: r.sl, dock: r.dock }); }
  return o;
}
// Plätze für ein Hauptkontor im Rechteck um (cx, cy) (Radius r) bzw. auf der ganzen Insel (r = null):
// [{ x, y, dirs: [{ d, sl, dock }] }]
export function kontorSpots(g, isl, cx, cy, r, opt) {
  const W = g.W, out = [];
  let x0, y0, x1, y1;
  if (r == null) { const I = W.island(isl); if (!I) return out; x0 = I.x0; y0 = I.y0; x1 = I.x0 + I.w - 3; y1 = I.y0 + I.h - 3; }
  else { x0 = cx - r; y0 = cy - r; x1 = cx + r; y1 = cy + r; }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (W.il(x, y) !== isl || W.il(x + 2, y + 2) !== isl) continue;   // schneller Vorfilter
    const dirs = stegDirs(g, 'kontor', isl, x, y, opt);
    if (dirs.length) out.push({ x, y, dirs });
  }
  return out;
}

/* ---------- Speicher ---------- */
export const isStore = (b) => !!b && (HQ.has(b.t) || b.t === 'kiste' || b.t === 'handelskontor');
// Bestand eines Speichers (in der Simulation veränderbar): Hauptkontor = Inselinventar, sonst b.inv
export function stockOf(g, b) { return HQ.has(b.t) ? islData(g, b.isl).inv : (b.inv || (b.inv = {})); }
// Nur lesen (auch auf dem Spiegel)
export function stockRead(g, b) { return HQ.has(b.t) ? invOf(g, b.isl) : (b.inv || {}); }
// Platz je Ware (mit Upgrades)
export function storeCap(g, b) { const c = mods(g, ownerOf(b)).cap; return HQ.has(b.t) ? c.kontor : (c[b.t] || 0); }

/* ---------- Kontore als Routen-Stopps ---------- */
// Nummer eines Handelskontors auf seiner Insel (nach Bau-Reihenfolge)
export function handelNo(g, b) {
  let n = 1;
  for (const o of g.blds.values()) if (o.t === 'handelskontor' && o.isl === b.isl && o.id < b.id) n++;
  return n;
}
// „Möwenklippe · Hauptkontor“, „Möwenklippe · Handelskontor 2“
export function kontorKind(g, b) { return HQ.has(b.t) ? 'Hauptkontor' : b.t === 'npchafen' ? `${npcName(b.npc)}s Steg` : `Handelskontor ${handelNo(g, b)}`; }
export function kontorLabel(g, b, isl) { return `${isl != null ? isl : islName(g, b.isl)} · ${kontorKind(g, b)}`; }
// Alle Kontore mit Anleger: je Insel das Hauptkontor zuerst, dann die Handelskontore (und die NPC-Stege)
export function portList(g) {
  return [...g.blds.values()].filter(b => PORTS.has(b.t)).sort((a, b) => a.isl - b.isl || (HQ.has(b.t) - HQ.has(a.t)) || a.id - b.id);
}
export const portById = (g, id) => { const b = g.blds.get(+id); return b && PORTS.has(b.t) ? b : null; };
