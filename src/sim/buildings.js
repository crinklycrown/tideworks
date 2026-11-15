/* =========================================================
   GEBÄUDE PLATZIEREN, ENTFERNEN, NETZWERK
   Felder werden über Kachel-Schlüssel adressiert (util/tiles.js), Inseln über ihre Insel-ID.
   ========================================================= */
import { G_WATER, G_ROCK, G_MOUNT, G_LAVA, BUILDABLE, REVEAL, DIRS } from '../config.js';
import { BD, FLAT, CONVEY, DRILL, PIPE, GENS, UPGRADE_TO, HQ, STEG, BELT_BRIDGE } from '../data/buildings.js';
import { ITEMS, ORES, ORE_ITEM, ORE_QUARZ, ORE_OIL, isPlan } from '../data/items.js';
import { DRILLS, FISHER, HOUSES } from '../data/mining.js';
import { PIPES, PIPE_BY_TIER, GEOTHERMIE } from '../data/fluids.js';
import { RECIPES_OF } from '../data/recipes.js';
import { lockReason } from '../data/unlocks.js';
import { npcName, npcOfPid } from '../data/npcs.js';
import { perim } from '../util/math.js';
import { tk, tkx, tky } from '../util/tiles.js';
import { isUnlocked, afford, pay, missingText, recount, islData, islName, invOf, islc, countType, isSep, actor, fogOf, islOwner, foreignIsl, homeAt, homeIsl, playerName, pst, ownerOf } from './state.js';
import { isPowered, autoLink } from './power.js';
import { storeInsert, beltShape } from './logistics.js';
import { bldTiles, stegSpot, stegOf, storeCap, isStore } from './kontor.js';
import { reveal, revealIsland } from './explore.js';
import { rateOf } from './mods.js';
import { isFluidB, netGuard } from './fluids.js';
import { logOp, snapOf } from './undo.js';
import { setRecipe } from './production.js';
import { npcIslFree } from './ending.js';
import { isPedestal, relicUnseat } from './relics.js';
import { PEDESTALS } from '../data/relics.js';

// Vorkommen unter einem Bohrer (Mehrheitsregel, Zahlen in data/mining.js):
// gefördert wird das Vorkommen mit den meisten Feldern, bei Gleichstand das seltenere (rank in ORES).
// Quarzsand (Sand/Strand ohne Vorkommen) zählt nur, wenn sonst nichts darunter liegt. Öl kann kein Bohrer fördern.
// Liefert { ore, n, item, ign: [{ ore, n }], oil, why } (ore = Index in ORES, 0 = keins; why = Grund, warum nichts gefördert wird)
export function drillInfo(g, x, y, w, h) {
  const c = {};
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const o = g.W.oreAt(x + dx, y + dy); if (o) c[o] = (c[o] || 0) + 1; }
  const oil = c[ORE_OIL] || 0;
  delete c[ORE_OIL];
  const keys = Object.keys(c).map(Number), other = keys.filter(k => k !== ORE_QUARZ);
  const cand = other.length ? other : keys;
  let best = 0, n = 0;
  for (const k of cand) if (c[k] > n || (c[k] === n && ORES[k].rank > ORES[best].rank)) { n = c[k]; best = k; }
  const ign = keys.filter(k => k !== best).map(k => ({ ore: k, n: c[k] }));
  if (oil) ign.push({ ore: ORE_OIL, n: oil });
  const why = best ? null : oil ? ORES[ORE_OIL].why : null;
  return { ore: best, n, item: best ? ORE_ITEM[best] : null, ign, oil, why };
}
// Förderung eines Bohrers in Items/s (ohne Rücksicht auf Strom, mit Upgrades)
export const drillRate = (g, t, n, pid) => DRILLS[t].rate * rateOf(g, t, pid) * n;
export function waterAround(g, x, y, w, h) {
  let n = 0;
  for (let yy = y - 2; yy < y + h + 2; yy++) for (let xx = x - 2; xx < x + w + 2; xx++) {
    if (xx >= x && xx < x + w && yy >= y && yy < y + h) continue;
    if (g.W.gr(xx, yy) === G_WATER) n++;
  }
  return n;
}
// Meeresfelder direkt am Rechteck (Kachel-Schlüssel)
export function oceanDocks(g, x, y, w, h) { return perim(x, y, w, h).filter(p => g.W.ocean(p.x, p.y)).map(p => tk(p.x, p.y)); }
// Felder eines Rechtecks zählen, für die test(x, y) gilt (Lava unter dem Geothermie-Generator, Öl unter der Saugpumpe)
export function countTiles(x, y, w, h, test) { let n = 0; for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (test(x + dx, y + dy)) n++; return n; }
export const lavaUnder = (g, x, y, w, h) => countTiles(x, y, w, h, (xx, yy) => g.W.gr(xx, yy) === G_LAVA);
export const oilUnder = (g, x, y, w, h) => countTiles(x, y, w, h, (xx, yy) => g.W.oreAt(xx, yy) === ORE_OIL);
// Felder eines Rechtecks (Kachel-Schlüssel)
export function footprint(x, y, w, h) { const o = []; for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) o.push(tk(x + dx, y + dy)); return o; }
export function ringTiles(x, y, w, h) {
  const o = [];
  for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) {
    if (xx >= x && xx < x + w && yy >= y && yy < y + h) continue;
    o.push(tk(xx, yy));
  }
  return o;
}
// Prüft, ob ein Gebäude an (x,y) stehen darf. free = ohne Kostenprüfung (Blaupausen rechnen die Kosten selbst zusammen)
// d = Drehung; bei Gebäuden mit Steg die gewünschte Steg-Seite (passt sie nicht, wird die erste passende gewählt: Ergebnis d, sl)
// Getrennte Inseln: nur auf eigenen Inseln, im eigenen Nebel (Spieler des Kommandos bzw. eigener Spieler im Spiegel).
export function checkPlace(g, t, x, y, free, d) {
  const def = BD[t], W = g.W, fog = fogOf(g);
  if (!def || def.fixed) return { ok: false, reason: 'Dieses Gebäude lässt sich nicht bauen.' };
  if (!isUnlocked(g, t)) return { ok: false, reason: lockReason(t) };
  if (PIPE.has(t)) return checkPipe(g, t, x, y, free);
  if (STEG.has(t)) return checkSteg(g, t, x, y, free, d);
  let k = -2;
  for (let dy = 0; dy < def.h; dy++) for (let dx = 0; dx < def.w; dx++) {
    const xx = x + dx, yy = y + dy;
    if (!fog.get(xx, yy)) return { ok: false, reason: 'Unerkundetes Gebiet. Erst mit Schiffen oder Gebäuden in der Nähe aufdecken.' };
    const il = W.il(xx, yy), gr = W.gr(xx, yy);
    if (il < 0) return { ok: false, reason: t === 'bandbruecke' ? 'Brückenband-Enden brauchen festen Boden.' : 'Hier ist Wasser.' };
    if (k === -2) { k = il; const why = ownWhy(g, k); if (why) return { ok: false, reason: why, isl: k }; }
    else if (il !== k) return { ok: false, reason: 'Gebäude müssen ganz auf einer Insel stehen.' };
    const id = g.bmap.get(xx, yy);
    if (id) { const ex = g.blds.get(id); if (!(FLAT.has(t) && ex && FLAT.has(ex.t) && ex.t !== t)) return { ok: false, reason: 'Hier steht schon etwas.' }; }
    if (!FLAT.has(t) && g.pipes.get(xx, yy)) return { ok: false, reason: 'Hier liegt ein Rohr. Rohre dürfen nur unter Bändern liegen, nicht unter Gebäuden.' };
    if (!BUILDABLE[gr] && !(gr === G_LAVA && t === 'geothermie')) return { ok: false, reason: gr === G_LAVA ? 'Auf Lava kann nur ein Geothermie-Generator stehen.' : gr === G_MOUNT ? 'Auf Bergen kann nicht gebaut werden.' : 'Hier kann nicht gebaut werden.' };
    if (t === 'saege' && gr === G_ROCK) return { ok: false, reason: 'Sägewerke können nicht auf Steinboden stehen.' };
  }
  if (DRILL.has(t)) {
    const o = drillInfo(g, x, y, def.w, def.h);
    if (DRILLS[t].noOil && o.oil) return { ok: false, reason: `Der ${def.name} kann nicht auf Öl stehen.` };
    if (!o.n) return { ok: false, reason: o.why ? o.why + '.' : 'Bohrer müssen auf einem Vorkommen stehen.' };
  }
  if (t === 'geothermie' && lavaUnder(g, x, y, def.w, def.h) < GEOTHERMIE.lava) return { ok: false, reason: `Der Geothermie-Generator muss mindestens ${GEOTHERMIE.lava} Lavafelder überdecken.` };
  if (t === 'saugpumpe' && !oilUnder(g, x, y, def.w, def.h)) return { ok: false, reason: 'Saugpumpen müssen auf einem Ölfeld stehen.' };
  if (t === 'pumpe' && !oceanDocks(g, x, y, def.w, def.h).length) return { ok: false, reason: 'Wasserpumpen müssen direkt am Meer stehen.' };
  if (t === 'fischer' && waterAround(g, x, y, def.w, def.h) < 3) return { ok: false, reason: 'Fischerhütten brauchen Wasser in der Nähe.' };
  if (t === 'werft' && oceanDocks(g, x, y, def.w, def.h).length < 2) return { ok: false, reason: 'Werften müssen direkt am Meer stehen.' };
  if (t === 'handel') {
    if (!g.KONT[k]) return { ok: false, reason: 'Handelsposten gibt es nur auf Inseln mit Hauptkontor.', isl: k };
    if (islc(g, k).handel) return { ok: false, reason: 'Auf jeder Insel steht höchstens ein Handelsposten.', isl: k };
    if (oceanDocks(g, x, y, def.w, def.h).length < 2) return { ok: false, reason: 'Handelsposten müssen direkt am Meer stehen (mindestens 2 Meeresfelder daneben).', isl: k };
  }
  if (t === 'leuchtturm') {
    const sep = isSep(g);
    if (countType(g, 'leuchtturm', sep ? actor(g) : undefined)) return { ok: false, reason: sep ? 'Jeder Spieler baut nur einen Weltenleuchtturm.' : 'Den Weltenleuchtturm gibt es nur einmal in der Welt.', isl: k };
    const I = W.island(k);
    if (g.state.story) { if (k !== homeIsl(g)) return { ok: false, reason: 'Der Weltenleuchtturm steht nur auf der Heimatinsel.', isl: k }; }
    else if (k !== homeIsl(g) && !(I && I.ring >= 2)) return { ok: false, reason: 'Der Weltenleuchtturm steht auf der Heimatinsel oder auf einer Insel ab Ring 2.', isl: k };
    if (!g.KONT[k]) return { ok: false, reason: 'Der Weltenleuchtturm braucht ein Hauptkontor auf der Insel.', isl: k };
    if (oceanDocks(g, x, y, def.w, def.h).length < 2) return { ok: false, reason: 'Der Weltenleuchtturm muss direkt am Meer stehen.', isl: k };
  }
  // Reliktsockel (0.24.0): nur mit Hauptkontor, höchstens einer je Insel (jede Stufe zählt)
  if (isPedestal(t)) {
    if (!g.KONT[k]) return { ok: false, reason: 'Reliktsockel gibt es nur auf Inseln mit Hauptkontor.', isl: k };
    const c = islc(g, k);
    if (Object.keys(PEDESTALS).some(p => c[p])) return { ok: false, reason: 'Auf jeder Insel steht höchstens ein Reliktsockel. Werte den vorhandenen auf (U).', isl: k };
  }
  if (t === 'tank') { const why = netGuard(g, footprint(x, y, def.w, def.h), true); if (why) return { ok: false, reason: why, isl: k }; }
  if (free) return { ok: true, isl: k };
  if (!afford(g, k, def.cost)) return { ok: false, reason: `Auf ${islName(g, k)} fehlen: ${missingText(g, k, def.cost)}.`, isl: k };
  return { ok: true, isl: k };
}
// Grund, warum der Spieler auf Insel k nicht bauen darf (NPC-Insel; Getrennte Inseln: fremdes Hauptkontor, Startplatz eines anderen), sonst ''
export function ownWhy(g, k, pid) {
  const npc = k >= 0 && g.W ? g.W.npcOf(k) : null;
  if (npc && !npcIslFree(g, k)) return `Das ist ${npcName(npc)}s Insel. Hier kannst du nicht bauen.`;   // Goldberg nach dem Ende: deine Insel (sim/ending.js)
  if (!isSep(g) || k < 0) return '';
  pid = pid || actor(g);
  const o = islOwner(g, k);
  if (o && o !== pid) return foreignIsl(g, k);
  const h = !o && homeAt(g, k);
  if (h && h.pid !== pid) return h.pid ? `Hier ist der Startplatz von ${playerName(g, h.pid)}.` : 'Hier ist der Startplatz für einen Mitspieler.';
  return '';
}
// Handelskontor (und Kontor gründen/verlegen über sim/kontor.js): ganz an Land, Steg gerade zum Meer
function checkSteg(g, t, x, y, free, d) {
  const def = BD[t], k = g.W.il(x + (def.w >> 1), y + (def.h >> 1));
  if (!fogOf(g).get(x, y)) return { ok: false, reason: 'Unerkundetes Gebiet. Erst mit Schiffen oder Gebäuden in der Nähe aufdecken.' };
  if (k < 0) return { ok: false, reason: 'Hier ist Wasser.' };
  const why = ownWhy(g, k);
  if (why) return { ok: false, reason: why, isl: k };
  if (t === 'handelskontor' && !g.KONT[k]) return { ok: false, reason: 'Handelskontore gibt es nur auf Inseln mit Hauptkontor.', isl: k };
  const want = d == null ? 0 : d % 4;
  let r = stegSpot(g, t, k, x, y, want), dd = want;
  for (let i = 1; i < 4 && !r.ok; i++) { const q = stegSpot(g, t, k, x, y, (want + i) % 4); if (q.ok) { r = q; dd = (want + i) % 4; } }
  if (!r.ok) return { ok: false, reason: stegSpot(g, t, k, x, y, want).reason, isl: k };
  if (!free && !afford(g, k, def.cost)) return { ok: false, reason: `Auf ${islName(g, k)} fehlen: ${missingText(g, k, def.cost)}.`, isl: k, d: dd, sl: r.sl };
  return { ok: true, isl: k, d: dd, sl: r.sl };
}
// Rohr: auf festem, bebaubarem Boden, unter Bändern erlaubt, nicht unter Gebäuden mit Grundfläche
export function checkPipe(g, t, x, y, free) {
  const W = g.W, gr = W.gr(x, y), k = W.il(x, y), tier = PIPES[t].tier, ex = g.pipes.get(x, y);
  if (!fogOf(g).get(x, y)) return { ok: false, reason: 'Unerkundetes Gebiet. Erst mit Schiffen oder Gebäuden in der Nähe aufdecken.' };
  if (k < 0) return { ok: false, reason: 'Rohre können nicht über Wasser liegen.' };
  const own = ownWhy(g, k);
  if (own) return { ok: false, reason: own, isl: k };
  if (!BUILDABLE[gr]) return { ok: false, reason: gr === G_LAVA ? 'Auf Lava kann kein Rohr liegen.' : gr === G_MOUNT ? 'Über Berge führt kein Rohr.' : 'Hier kann kein Rohr liegen.' };
  const b = bAt(g, x, y);
  if (b && !FLAT.has(b.t)) return { ok: false, reason: 'Rohre dürfen nicht unter Gebäuden liegen (nur unter Bändern).' };
  if (ex === tier) return { ok: false, reason: 'Hier liegt schon dieses Rohr.' };
  const why = netGuard(g, [tk(x, y)], !!PIPES[t].acid);
  if (why) return { ok: false, reason: why, isl: k };
  if (free) return { ok: true, isl: k, replace: ex || 0 };
  if (!afford(g, k, BD[t].cost)) return { ok: false, reason: `Auf ${islName(g, k)} fehlen: ${missingText(g, k, BD[t].cost)}.`, isl: k };
  return { ok: true, isl: k, replace: ex || 0 };
}
// Rohr verlegen (ein anderes Rohr auf dem Feld wird ersetzt und voll erstattet)
export function placePipe(g, t, x, y, k) {
  const ex = g.pipes.get(x, y);
  logOp(g, { k: 'pipe', x, y, from: ex || 0, to: PIPES[t].tier, cost: Object.assign({}, BD[t].cost), gain: ex ? Object.assign({}, BD[PIPE_BY_TIER[ex]].cost) : {}, isl: k });
  if (ex) refundPipe(g, ex, k);
  pay(g, k, BD[t].cost, 'bauen');
  g.pipes.set(x, y, PIPES[t].tier);
  g.pipeVer++;
  reveal(g, x, y, REVEAL.building);
}
// Rohr entfernen: Kosten 100 % zurück (wie Bänder)
export function removePipe(g, x, y) {
  const ex = g.pipes.get(x, y), k = g.W.il(x, y);
  if (!ex) return false;
  if (k >= 0) { logOp(g, { k: 'pipe', x, y, from: ex, to: 0, cost: {}, gain: Object.assign({}, BD[PIPE_BY_TIER[ex]].cost), isl: k }); refundPipe(g, ex, k); }
  g.pipes.set(x, y, 0);
  g.pipeVer++;
  return true;
}
function refundPipe(g, tier, k) { const inv = islData(g, k).inv, c = BD[PIPE_BY_TIER[tier]].cost; for (const r in c) inv[r] = (inv[r] || 0) + c[r]; }
// Mittelpunkt eines Gebäudes (Feld) und sein Aufdeck-Radius (für den Besitzer)
export function revealAround(g, b) {
  const def = BD[b.t], pid = ownerOf(b);
  reveal(g, b.x + (def.w >> 1), b.y + (def.h >> 1), HQ.has(b.t) ? REVEAL.kontor : REVEAL.building, pid);
  if (HQ.has(b.t)) revealIsland(g, b.isl, false, pid);   // Kontor: ganze Insel plus Küstenstreifen
}
// opt.rc = Rezept, opt.ex = Ware des Extraktors, opt.ga = Tor-Automatik, opt.so = Sortierer-Einstellung (Pipette, Blaupausen); opt.noLink = keine Kabel automatisch ziehen;
// opt.sl = Steg-Länge (Gebäude mit Steg, aus checkPlace); opt.noBridge = Brückenband nicht automatisch verbinden
export function placeBuilding(g, t, x, y, d, k, opt) {
  const def = BD[t];
  let carry = [];
  if (FLAT.has(t)) { const ex = bAt(g, x, y); if (ex && FLAT.has(ex.t)) { carry = carriedItems(ex); removeBuilding(g, ex, true); } }   // auf Bänder bauen
  pay(g, k, def.cost, 'bauen');
  const b = { id: g.state.nextId++, t, x, y, d: d || 0, isl: k, buf: {}, out: {}, prog: 0, acc: 0, by: g.pid || 'host' };   // by = Erbauer (Spieler-ID)
  if (FLAT.has(t)) { b.it = null; b.p = 0; b.tg = 0; }
  if (t === 'kreuzung') b.ln = [null, null];
  if (t === 'bandbruecke') { b.bl = null; b.q = []; }
  if (t === 'tor') { b.cl = false; b.ga = null; }
  if (t === 'sortierer') b.so = sorterCfg(opt && opt.so);
  if (t === 'extraktor') b.ex = '';
  if (t === 'kiste' || t === 'handelskontor') b.inv = {};
  if (STEG.has(t)) b.sl = (opt && opt.sl) || 1;
  // Items des überbauten Teils übernehmen; was nicht passt, kommt ins Lager der Insel
  for (const c of carry) if (!takeCarried(b, c)) storeInsert(g, k, c.it, false);
  if (RECIPES_OF[t]) { b.rc = RECIPES_OF[t][0].id; b.run = false; }
  if (HOUSES[t]) { b.tm = 0; b.sup = false; b.plans = 0; }
  if (t === 'werft') b.bq = 0;
  if (t === 'dkiste') { b.dm = 'offer'; b.inv = {}; b.dw = null; }
  if (t === 'drohnenhafen') b.dr = [];
  if (GENS.has(t) || t === 'batterie') b.e = 0;
  if (t === 'kraftwerk') b.fuel = 0;
  if (DRILLS[t] && DRILLS[t].lube) b.lt = 0;
  if (opt && opt.rc && b.rc) setRecipe(g, b, opt.rc);
  if (opt && t === 'extraktor' && typeof opt.ex === 'string' && (opt.ex === '' || ITEMS[opt.ex])) b.ex = opt.ex;
  if (opt && t === 'tor' && opt.ga) b.ga = gateAuto(opt.ga);
  addBuilding(g, b);
  if (t === 'bandbruecke' && !(opt && opt.noBridge)) { const c = bridgeCandidate(g, b); if (c) linkBridge(g, c.from, c.to); }
  if (isPowered(t) && !(opt && opt.noLink)) autoLink(g, b);
  revealAround(g, b);
  logOp(g, { k: 'add', s: snapOf(g, b), cost: Object.assign({}, def.cost), isl: k });
  return b;
}
// Items auf einem flachen Logistik-Teil mit ihrer Laufrichtung (d, -1 = unbekannt)
function carriedItems(ex) {
  const o = [];
  if (ex.it) o.push({ it: ex.it, d: CONVEY.has(ex.t) || ex.t === 'sortierer' || ex.t === 'tor' ? ex.d : ex.from != null ? (ex.from + 2) % 4 : -1, sp: CONVEY.has(ex.t) ? BD[ex.t].speed : ex.sp });
  for (const L of ex.ln || []) if (L) o.push({ it: L.it, d: L.d, sp: L.sp });
  return o;
}
function takeCarried(b, c) {
  if (CONVEY.has(b.t) || b.t === 'splitter' || b.t === 'ueberlauf') {
    if (b.it) return false;
    b.it = c.it; b.p = 0;
    if (!CONVEY.has(b.t)) { b.from = c.d >= 0 ? (c.d + 2) % 4 : null; b.sp = c.sp; }   // from = Seite, von der es kam, sp = Tempo
    return true;
  }
  if (b.t === 'sortierer') {
    if (b.it) return false;
    b.it = c.it; b.p = 0; b.sp = c.sp; return true;
  }
  if (b.t === 'tor') {
    if (b.it || b.cl) return false;
    b.it = c.it; b.p = 0; b.sp = c.sp; return true;
  }
  if (b.t === 'kreuzung') {
    if (c.d < 0 || b.ln[c.d % 2]) return false;   // Spur = Achse der Laufrichtung
    b.ln[c.d % 2] = { it: c.it, p: 0, d: c.d, sp: c.sp };
    return true;
  }
  return false;
}
export function addBuilding(g, b, loading) {
  const def = BD[b.t];
  g.blds.set(b.id, b);
  islData(g, b.isl);
  for (const p of bldTiles(b)) { g.bmap.set(p.x, p.y, b.id); g.tree.set(p.x, p.y, 0); g.growing.delete(tk(p.x, p.y)); }
  if (DRILL.has(b.t)) { const o = drillInfo(g, b.x, b.y, def.w, def.h); b._ore = o.ore; b._ot = o.item; b._oc = o.n; b._ign = o.ign; b._why = o.why; }
  if (b.t === 'saugpumpe') b._oc = oilUnder(g, b.x, b.y, def.w, def.h);
  if (b.t === 'geothermie') b._lv = lavaUnder(g, b.x, b.y, def.w, def.h);
  if (isFluidB(b.t)) { b.fi = b.fi || {}; b.fo = b.fo || {}; g.pipeVer++; }
  if (b.t === 'fischer') { b._wn = waterAround(g, b.x, b.y, def.w, def.h); b._fr = Math.min(FISHER.max, b._wn * FISHER.perWater); }
  if (b.t === 'werft' || b.t === 'kontoralt') { const d = oceanDocks(g, b.x, b.y, def.w, def.h); b._dock = d.length ? d[0] : null; }
  if (STEG.has(b.t)) { const s = stegOf(b); b._dock = s ? tk(s.dock.x, s.dock.y) : null; }
  if (b.t === 'kiste' || b.t === 'handelskontor' || b.t === 'dkiste') b.inv = b.inv || {};
  if (b.t === 'handel') { const d = oceanDocks(g, b.x, b.y, def.w, def.h); b._tdock = d.length ? d[d.length >> 1] : null; }
  if (b.t === 'bandbruecke') b.q = b.q || [];
  if (HQ.has(b.t) || b.t === 'handelskontor') g.shipPathCache.clear();
  if (isPowered(b.t)) g.wireVer++;
  g.topoVer++;
  if (!loading) { if (b.t === 'saege') recomputeClaims(g); recount(g); }
}
// opt.straighten = letzte Kurve vor dem abgerissenen Ziel geradeaus stellen (B5, nur beim Abreißen durch den Spieler)
export function removeBuilding(g, b, refund, opt) {
  const def = BD[b.t];
  // fest; Ausnahme seit 0.23.0: Dorfgebäude, die nach dem Ende dir gehören (Brandruinen, Aurels Schmuck), sind abreißbar
  if (def.fixed && !(def.npc && b.t !== 'npchafen' && !npcOfPid(b.by))) return false;
  const W = b.t === 'leuchtturm' ? pst(g, ownerOf(b)).wonder : null;
  if (W && (W.ph || W.pb)) { g.events.push({ type: 'fail', msg: 'Der Weltenleuchtturm lässt sich nach Baubeginn nicht mehr abreißen.' }); return false; }
  const gain = {};
  if (refund) for (const r in def.cost) if (!isPlan(r)) gain[r] = Math.floor(def.cost[r] * (FLAT.has(b.t) ? 1 : 0.5));
  const fix = opt && opt.straighten ? curvesInto(g, b) : [];
  logOp(g, { k: 'del', s: snapOf(g, b), gain, isl: b.isl, stash: false });
  // Bestand einer Lagerkiste / eines Handelskontors ins Hauptkontor (was nicht passt, geht verloren)
  if (b.inv && b.t !== 'werft') stashToHQ(g, b.isl, b.inv);
  if (b.t === 'dkiste' && b.out) stashToHQ(g, b.isl, b.out);
  for (const p of bldTiles(b)) g.bmap.set(p.x, p.y, 0);
  g.blds.delete(b.id);
  relicUnseat(g, b);   // Reliktsockel: das Relikt geht zurück in die Sammlung
  if (b.t === 'bandbruecke') unlinkInto(g, b);
  if (STEG.has(b.t)) g.shipPathCache.clear();
  for (const id of (b.links || [])) { const o = g.blds.get(id); if (o && o.links) o.links = o.links.filter(x => x !== b.id); }
  if (isPowered(b.t)) g.wireVer++;
  if (isFluidB(b.t)) g.pipeVer++;
  // Rückerstattung: Bänder 100 %, sonst 50 %; Pläne werden nicht erstattet
  if (refund) { const inv = islData(g, b.isl).inv; for (const r in gain) inv[r] = (inv[r] || 0) + gain[r]; }
  g.topoVer++;
  if (b.t === 'saege') recomputeClaims(g);
  recount(g);
  for (const f of fix) straighten(g, f);
  // (Die Auswahl in der Oberfläche wird dort aufgehoben, sobald das Gebäude fehlt.)
  return true;
}
// Bestand (Lagerkiste, Handelskontor) ins Hauptkontor der Insel; was nicht passt, geht verloren. → { moved, lost }
export function stashToHQ(g, k, inv) {
  const H = g.KONT[k], to = islData(g, k).inv, cap = H ? storeCap(g, H) : 0;
  let moved = 0, lost = 0;
  for (const it in inv) {
    const n = Math.floor(inv[it] || 0);
    if (n <= 0) continue;
    const m = Math.max(0, Math.min(n, Math.floor(cap - (to[it] || 0))));
    if (m) { to[it] = (to[it] || 0) + m; moved += m; }
    lost += n - m;
    delete inv[it];
  }
  if (moved || lost) g.events.push({ type: 'stashed', moved, lost, isl: k });
  return { moved, lost };
}

/* ---------- B5: Kurve vor einem abgerissenen Ziel geradeaus stellen ---------- */
// Bänder, die in b hineinzeigen (Positionen)
function curvesInto(g, b) {
  if (FLAT.has(b.t)) return [];
  const def = BD[b.t], o = [];
  for (let yy = b.y - 1; yy <= b.y + def.h; yy++) for (let xx = b.x - 1; xx <= b.x + def.w; xx++) {
    const t = bAt(g, xx, yy);
    if (!t || !CONVEY.has(t.t)) continue;
    const fx = t.x + DIRS[t.d][0], fy = t.y + DIRS[t.d][1];
    if (fx >= b.x && fx < b.x + def.w && fy >= b.y && fy < b.y + def.h) o.push(t.id);
  }
  return o;
}
// Nimmt das Feld (x, y) Items in Richtung d an? (Band, das nicht zurückzeigt, oder ein Gebäude)
function takesAt(g, x, y, d) {
  const t = bAt(g, x, y);
  if (!t) return false;
  if (CONVEY.has(t.t) || t.t === 'tor') return t.d !== (d + 2) % 4;
  if (STEG.has(t.t) && !(x >= t.x && x < t.x + BD[t.t].w && y >= t.y && y < t.y + BD[t.t].h)) return false;
  return t.t !== 'extraktor' && t.t !== 'mast';
}
function straighten(g, id) {
  const b = g.blds.get(id);
  if (!b) return;
  const sh = beltShape(g, b);
  if (sh < 0) return;
  const fx = b.x + DIRS[b.d][0], fy = b.y + DIRS[b.d][1];
  if (bAt(g, fx, fy)) return;   // vorne steht noch etwas: Kurve bleibt
  const nd = sh === 0 ? (b.d + 1) % 4 : (b.d + 3) % 4;
  if (!takesAt(g, b.x + DIRS[nd][0], b.y + DIRS[nd][1], nd)) return;
  logOp(g, { k: 'set', x: b.x, y: b.y, t: b.t, f: 'd', from: b.d, to: nd });
  b.d = nd; g.topoVer++;
}

/* ---------- Brückenband ---------- */
// Ende auf der Linie in Richtung d im Abstand n (1 … range + 1) oder null
function endAt(g, b, d, n) { const e = bAt(g, b.x + DIRS[d][0] * n, b.y + DIRS[d][1] * n); return e && e.t === 'bandbruecke' && e.id !== b.id ? e : null; }
// Ende, das auf b zeigt, oder null
export function bridgeIn(g, b) {
  for (let d = 0; d < 4; d++) for (let n = 1; n <= BELT_BRIDGE.range + 1; n++) {
    const e = endAt(g, b, d, n);
    if (e && e.bl && e.bl[0] === (d + 2) % 4 && e.bl[1] === n) return e;
  }
  return null;
}
// Ziel-Ende einer Verbindung von b aus (oder null)
export function bridgeOut(g, b) { return b.bl ? endAt(g, b, b.bl[0], b.bl[1]) : null; }
// Nächstes freies, unverbundenes Ende in Reichweite (es wird Eingang, b Ausgang): { from, to } oder null
export function bridgeCandidate(g, b) {
  for (let n = 1; n <= BELT_BRIDGE.range + 1; n++) for (let d = 0; d < 4; d++) {
    const e = endAt(g, b, d, n);
    if (e && !e.bl && !bridgeIn(g, e)) return { from: e, to: b };
  }
  return null;
}
// Kann from mit to verbunden werden (gleiche Linie, Reichweite)? → [d, n] oder null
export function bridgeVec(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y, n = Math.abs(dx) + Math.abs(dy);
  if ((dx && dy) || n < 1 || n > BELT_BRIDGE.range + 1) return null;
  return [dx > 0 ? 0 : dx < 0 ? 2 : dy > 0 ? 1 : 3, n];
}
// Verbindung from → to setzen (alte Verbindung von from und andere Zuläufe auf to werden gelöst); als Bau-Schritt aufgezeichnet
export function linkBridge(g, from, to) {
  const v = bridgeVec(from, to);
  if (!v) return false;
  const old = bridgeIn(g, to);
  if (old && old !== from) setBl(g, old, null);
  const back = bridgeOut(g, to);
  if (back === from) setBl(g, to, null);   // keine Schleife aus zwei Enden
  setBl(g, from, v);
  return true;
}
export function setBl(g, b, v) {
  const from = b.bl ? b.bl.slice() : null;
  logOp(g, { k: 'set', x: b.x, y: b.y, t: b.t, f: 'bl', from, to: v ? v.slice() : null });
  b.bl = v ? v.slice() : null;
  g.topoVer++;
}
// Abriss eines Endes: Verbindungen darauf lösen
function unlinkInto(g, b) { const e = bridgeIn(g, b); if (e) setBl(g, e, null); }

/* ---------- Tor ---------- */
// Automatik prüfen: { it, hi, lo } (schließen bei ≥ hi, öffnen bei < lo) oder null
// Sortierer-Einstellung prüfen: { it: Ware oder '', rv: umgekehrt }
export function sorterCfg(o) { return { it: o && ITEMS[o.it] ? o.it : '', rv: !!(o && o.rv) }; }
export function gateAuto(o) {
  if (!o || !ITEMS[o.it]) return null;
  const hi = Math.max(1, Math.floor(+o.hi || 0)), lo = Math.max(0, Math.min(hi, Math.floor(+o.lo || 0)));
  return { it: o.it, hi, lo };
}

// Jeder Baum gehört höchstens einem Sägewerk
export function recomputeClaims(g) {
  g.claim.clear();
  [...g.blds.values()].filter(b => b.t === 'saege').sort((a, b) => a.id - b.id).forEach(b => {
    b._ring = [];
    for (const i of ringTiles(b.x, b.y, 2, 2)) { const x = tkx(i), y = tky(i); if (g.W.il(x, y) === b.isl && !g.claim.get(x, y)) { g.claim.set(x, y, b.id); b._ring.push(i); } }
  });
}
export const bAt = (g, x, y) => { const id = g.bmap.get(x, y); return id ? g.blds.get(id) : null; };
export function rotateB(g, b) { if (!BD[b.t].rot) return; b.d = (b.d + 1) % 4; g.topoVer++; }

/* ---------- Aufwerten (UPGRADE_TO in data/buildings.js) ---------- */
// Was das Aufwerten kostet und ob es geht; auch von der Oberfläche auf dem Spiegel genutzt.
// b = Gebäude oder { pipe: Stufe, x, y }. Das alte Teil wird voll erstattet (ohne Pläne), das neue voll bezahlt.
// Liefert null (keine Stufe darüber) oder { from, to, cost, gain, isl, ok, locked, reason, miss }
export function upgradeInfo(g, b) {
  const from = b.pipe ? PIPE_BY_TIER[b.pipe] : b.t, to = UPGRADE_TO[from];
  if (!to) return null;
  const k = b.pipe ? g.W.il(b.x, b.y) : b.isl, cost = BD[to].cost, gain = {};
  for (const r in BD[from].cost) if (!isPlan(r)) gain[r] = BD[from].cost[r];
  const o = { from, to, cost, gain, isl: k, ok: false, locked: false, reason: null, miss: {} };
  if (!isUnlocked(g, to)) { o.locked = true; o.reason = lockReason(to); return o; }
  if (b.pipe) { const why = netGuard(g, [tk(b.x, b.y)], !!PIPES[to].acid); if (why) { o.reason = why; return o; } }
  if (DRILL.has(to) && DRILLS[to].noOil && drillInfo(g, b.x, b.y, BD[to].w, BD[to].h).oil) { o.reason = `Der ${BD[to].name} kann nicht auf Öl stehen.`; return o; }
  const inv = invOf(g, k);
  for (const r in cost) { const have = (inv[r] || 0) + (gain[r] || 0); if (have < cost[r]) o.miss[r] = cost[r] - Math.floor(have); }
  const m = Object.keys(o.miss);
  if (m.length) { o.reason = `Auf ${islName(g, k)} fehlen: ${m.map(r => o.miss[r] + ' ' + ITEMS[r].name).join(', ')}.`; return o; }
  o.ok = true;
  return o;
}
// Typ wechseln, alles andere bleibt (Position, Drehung, Items, Puffer, Kabel, Rezept, Zähler der Häuser)
export function applyUpgrade(g, b, to) {
  const was = isPowered(b.t), def = BD[to];
  if (isFluidB(b.t) || isFluidB(to)) g.pipeVer++;
  b.t = to;
  if (isFluidB(to)) { b.fi = b.fi || {}; b.fo = b.fo || {}; }
  if (DRILL.has(to)) { const o = drillInfo(g, b.x, b.y, def.w, def.h); b._ore = o.ore; b._ot = o.item; b._oc = o.n; b._ign = o.ign; b._why = o.why; }
  if (DRILLS[to] && DRILLS[to].lube && b.lt == null) b.lt = 0;
  if (HOUSES[to] && b.tm == null) { b.tm = 0; b.sup = false; b.plans = 0; }
  if (isPowered(to)) { g.wireVer++; if (!was || !(b.links || []).length) autoLink(g, b); }
  g.topoVer++;
  recount(g);
}
// Aufwerten mit Bezahlen (Kommando 'upgrade'); liefert den Grund, falls es nicht geht
export function upgradeAt(g, b) {
  const u = upgradeInfo(g, b);
  if (!u) return 'Dieses Teil lässt sich nicht weiter aufwerten.';
  if (!u.ok) return u.reason;
  const inv = islData(g, u.isl).inv;
  for (const r in u.gain) inv[r] = (inv[r] || 0) + u.gain[r];
  pay(g, u.isl, u.cost, 'bauen');
  if (b.pipe) {
    logOp(g, { k: 'pipe', x: b.x, y: b.y, from: b.pipe, to: PIPES[u.to].tier, cost: Object.assign({}, u.cost), gain: u.gain, isl: u.isl });
    g.pipes.set(b.x, b.y, PIPES[u.to].tier); g.pipeVer++;
  } else {
    logOp(g, { k: 'up', x: b.x, y: b.y, from: u.from, to: u.to, cost: Object.assign({}, u.cost), gain: u.gain, isl: u.isl });
    applyUpgrade(g, b, u.to);
  }
  return null;
}
