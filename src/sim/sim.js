/* =========================================================
   SIMULATION: fester Schritt sim(g, dt) und Kommando-Verarbeitung
   Die Oberfläche ändert den Spielzustand nur über Kommandos (applyCommand).
   Rückmeldungen an die Oberfläche laufen über g.events.
   ========================================================= */
import { DIRS, TREE_GROW, BUILDABLE, G_MOUNT, G_LAVA, FOUND_COST, FOUND_RANGE, PORT_RANGE, CYCLE, DAY_LEN } from '../config.js';
import { BD, PIPE, FLAT, CONVEY, HQ, BELT_BRIDGE, GATE } from '../data/buildings.js';
import { SHIP_KINDS } from '../data/ships.js';
import { ITEMS, ITEM_ORDER, PLAN_ITEMS } from '../data/items.js';
import { FLAGS, HOME } from '../data/islands.js';
import { tk, tkx, tky } from '../util/tiles.js';
import { afford, pay, missingText, countType, capOf, kontorOf, kontorIslands, islData, recount, HOST_PID, freshPlayer, demolishBlock, isUnlocked,
  isSep, pst, mine, myIsl, ownerOf, islOwner, playerName, foreignIsl, seatedPids, startHome, homeOf } from './state.js';
import { islId } from '../util/tiles.js';
import { FOUND_RACE } from '../data/trade.js';
import { setPrices } from './ptrade.js';
import { PLAYER_COLORS, NAME_MAX } from '../data/net.js';
import { checkPlace, placeBuilding, removeBuilding, bAt, addBuilding, recomputeClaims, revealAround, placePipe, removePipe, upgradeAt, linkBridge, setBl, bridgeVec, gateAuto, sorterCfg } from './buildings.js';
import { recStart, recEnd, logOp, undo, redo } from './undo.js';
import { placeBlueprint } from './blueprint.js';
import { fluidStep, netAt, drainNet } from './fluids.js';
import { PIPES } from '../data/fluids.js';
import { canLink, link, unlink, powerRoll } from './power.js';
import { LOGISTICS_TICKS, beltShape, gateCheck, storeInsert, beltObstacle, crossable } from './logistics.js';
export { beltObstacle, crossable };
import { computeSoll } from './soll.js';
import { ioReset, flowAdd } from './stats.js';
import { stegSpot, bldTiles } from './kontor.js';
import { reveal, revealIsland } from './explore.js';
import { PRODUCTION_TICKS } from './production.js';
import { tickShip, newShip, shipGoto, setRoute, resumeRoute, manualLoad, manualUnload, foundInfo, coastNear, takeCargo, addCargo, NAME_LEN, jettison, tickJetsam, fitHolds, setAuto, setRange, setPerm } from './ships.js';
import { ownWhy } from './buildings.js';
import { mods } from './mods.js';
import { research, checkGoals } from './research.js';
import { setRecipe } from './production.js';
import { coinAdd, coinTick } from './coins.js';
import { marketTick, tradeTick, tradeOrder, spawnTrader, postOf, posts } from './trade.js';
import { evTick, debugEvent, setEvMode, repair, canDamage } from './events.js';
import { wonderTick, wonderOrder, wonderStore, wonderDebug } from './wonder.js';
import { setDKiste } from './drones.js';
import { TRADERS } from '../data/trade.js';
import { lockReason } from '../data/unlocks.js';
import { unlock, relock, researchFree, devUnlockAll } from './unlocks.js';
import { talk, storySeen, storyChoice, storyDebug, storyTick } from './story.js';
import { npcTick, npcBuy, npcDeliver, npcDeal, npcRepDebug } from './npc.js';
import { npcPort } from './villages.js';
import { diveTick, mountBell, diveStart, diveEnd, diveDebug } from './dive.js';

const TICKS = Object.assign({}, LOGISTICS_TICKS, PRODUCTION_TICKS);

export function sim(g, dt) {
  const state = g.state, tree = g.tree, RT = g.RT;
  state.time += dt;
  // Getrennte Inseln: Baumwachstum mit den Upgrades des Inselbesitzers
  const sep = isSep(g), grow0 = sep ? 0 : dt / TREE_GROW * mods(g).treeGrow, growOf = sep ? new Map() : null;
  for (const i of g.growing) {
    const x = tkx(i), y = tky(i);
    let grow = grow0;
    if (sep) { const o = islOwner(g, g.W.il(x, y)) || HOST_PID; grow = growOf.get(o); if (grow == null) growOf.set(o, grow = dt / TREE_GROW * mods(g, o).treeGrow); }
    const v = Math.min(1, tree.get(x, y) + grow); tree.set(x, y, v); if (v >= 1) g.growing.delete(i);
  }
  for (const k in RT.popSup) RT.popSup[k] = 0;
  for (const k in RT.popAll) RT.popAll[k] = 0;
  for (const b of g.blds.values()) { if (b.dmg) { b._act = false; continue; } const f = TICKS[b.t]; if (f) f(g, b, dt); }   // beschädigt: Stillstand
  fluidStep(g, dt);
  for (const s of state.ships) tickShip(g, s, dt);
  tickJetsam(g);
  tradeTick(g, dt);
  wonderTick(g, dt);
  // Etwa einmal pro Sekunde: Ziele, Strom-Anzeige, Tor-Automatik, Soll-Raten
  g._gt = (g._gt || 0) + dt;
  if (g._gt >= GATE.every) { const span = g._gt; powerRoll(g, span); g._gt = 0; checkGoals(g); gateCheck(g); computeSoll(g); marketTick(g, span); evTick(g); coinTick(g); storyTick(g); npcTick(g, span); diveTick(g); }
}

/* ---------- Bänder ziehen: gedrückt halten und ziehen, jedes Band zeigt in Zugrichtung ---------- */
// Beim Ziehen von Bändern (B3):
//  - quer über ein gerades Band (keine Kurve, kein Splitter/Tor) entsteht eine Kreuzung, sobald der Zug geradeaus weitergeht
//    (endet er darauf, bleibt das Band und wird seitlich beliefert); eine Kreuzung wird durchlaufen
//  - über ein Hindernis bis BELT_BRIDGE.range Felder (Gebäude ohne Band-Funktion, Wasser, Berg, Lava) entsteht ein Brückenband:
//    Enden auf dem letzten freien Feld davor und dem ersten danach; breitere Hindernisse beenden den Zug
// Der ganze Zug ist ein Rückgängig-Schritt (gleiche Zug-Nummer).
function warnOnce(g, msg) { const P = g.paint; if (!P.warned) { P.warned = true; g.events.push({ type: 'fail', msg }); } }
function putBelt(g, t, x, y, d, opt) {
  const P = g.paint, ex = bAt(g, x, y);
  if (PIPE.has(t)) {   // Rohre: eigene Ebene, gleiches Rohr bleibt liegen
    if (g.pipes.get(x, y) === PIPES[t].tier) return;
    const r = checkPlace(g, t, x, y);
    if (!r.ok) { warnOnce(g, r.reason); return; }
    placePipe(g, t, x, y, r.isl);
    g.events.push({ type: 'placed', t, isl: r.isl, pipe: true });
    return;
  }
  if (ex && !mine(g, ex)) { warnOnce(g, ownWhy(g, ex.isl) || `Gehört ${playerName(g, ownerOf(ex))}.`); return; }
  if (ex && ex.t === t) {   // gleiches Teil: nur in Zugrichtung drehen
    if (BD[ex.t].rot && ex.d !== d) turn(g, ex, d);
    P.placed.add(ex.id);
    return;
  }
  const r = checkPlace(g, t, x, y);
  if (!r.ok) { warnOnce(g, r.reason); return; }
  const b = placeBuilding(g, t, x, y, d, r.isl, opt);
  P.placed.add(b.id);
  g.events.push({ type: 'placed', id: b.id, t, isl: b.isl, n: countType(g, t) });
}
function makeCrossing(g, Q, opt) {
  const ex = g.blds.get(Q.id);
  if (!ex || !CONVEY.has(ex.t) || ex.x !== Q.x || ex.y !== Q.y) return;
  const r = checkPlace(g, 'kreuzung', Q.x, Q.y);
  if (!r.ok) { warnOnce(g, r.reason); return; }
  const b = placeBuilding(g, 'kreuzung', Q.x, Q.y, 0, r.isl, opt);
  g.paint.placed.add(b.id);
  g.events.push({ type: 'placed', id: b.id, t: 'kreuzung', isl: b.isl, n: countType(g, 'kreuzung'), auto: true });
}
// Brückenband vom Feld G (letztes freies Feld vor dem Hindernis, dort liegt ein eben verlegtes Band) bis (x, y)
function makeBridge(g, G, x, y) {
  const A = bAt(g, G.x, G.y);
  if (!A || !CONVEY.has(A.t)) return false;
  if (g.W.il(x, y) !== A.isl) { warnOnce(g, 'Brückenbänder verbinden nur Felder derselben Insel.'); return false; }
  const rb = checkPlace(g, 'bandbruecke', x, y, true);
  if (!rb.ok) { warnOnce(g, rb.reason); return false; }
  const c = BD.bandbruecke.cost, need = {};
  for (const r in c) need[r] = 2 * c[r] - (BD[A.t].cost[r] || 0);
  if (!afford(g, A.isl, need)) { warnOnce(g, `Für das Brückenband fehlen: ${missingText(g, A.isl, need)}.`); return false; }
  const a = placeBuilding(g, 'bandbruecke', G.x, G.y, 0, A.isl, { noBridge: true });
  const b = placeBuilding(g, 'bandbruecke', x, y, 0, A.isl, { noBridge: true });
  linkBridge(g, a, b);
  g.paint.placed.add(a.id); g.paint.placed.add(b.id);
  g.events.push({ type: 'placed', id: b.id, t: 'bandbruecke', isl: b.isl, n: countType(g, 'bandbruecke'), auto: true });
  return true;
}
// Ein Schritt des Zugs von (px, py) nach (x, y) in Richtung sd
function paintStep(g, t, px, py, x, y, sd, d, opt) {
  const P = g.paint;
  if (P.stop) return;
  const conv = CONVEY.has(t);
  if (P.gap) {   // über ein Hindernis
    const G = P.gap;
    if (sd !== G.d) { P.gap = null; P.stop = true; warnOnce(g, 'Ein Brückenband braucht eine gerade Linie über das Hindernis.'); return; }
    if (beltObstacle(g, x, y)) {
      if (++G.n > BELT_BRIDGE.range) { P.gap = null; P.stop = true; warnOnce(g, `Hindernis zu breit für ein Brückenband (max. ${BELT_BRIDGE.range} Felder).`); }
      return;
    }
    P.gap = null;
    if (!makeBridge(g, G, x, y)) P.stop = true;
    return;
  }
  if (P.pend) {   // vorgemerkte Kreuzung: Zug geht geradeaus weiter
    const Q = P.pend;
    P.pend = null;
    if (sd === Q.d && px === Q.x && py === Q.y) makeCrossing(g, Q, opt);
  }
  const ex = bAt(g, x, y);
  if (conv && ex && ex.t === 'kreuzung' && !P.placed.has(ex.id)) return;   // vorhandene Kreuzung durchlaufen
  if (conv && !P.placed.has(ex && ex.id) && crossable(g, ex, sd)) { P.pend = { x, y, d: sd, id: ex.id }; return; }
  if (conv && beltObstacle(g, x, y)) {
    const prev = bAt(g, px, py);
    if (prev && P.placed.has(prev.id) && CONVEY.has(prev.t)) { P.gap = { x: px, y: py, d: sd, n: 1 }; return; }
  }
  putBelt(g, t, x, y, d, opt);
}
// Drehung setzen und für Rückgängig festhalten
function turn(g, b, d) { logOp(g, { k: 'set', x: b.x, y: b.y, t: b.t, f: 'd', from: b.d, to: d }); b.d = d; g.topoVer++; }
// Einstellung (Rezept, Ware des Extraktors, Tor-Automatik) ändern und festhalten
function setField(g, b, f, v) {
  const from = b[f];
  if (f === 'rc') setRecipe(g, b, v); else b[f] = v;
  if (JSON.stringify(b[f]) !== JSON.stringify(from)) { logOp(g, { k: 'set', x: b.x, y: b.y, t: b.t, f, from, to: b[f] }); g.topoVer++; }
}
// from = zuletzt bearbeitete Kachel (-1 am Anfang des Zugs), to = aktuelle Kachel, d = aktuelle Bau-Richtung
function paintBelt(g, t, from, to, d, opt) {
  const rot = BD[t].rot;
  if (from >= 0) {
    let cx = tkx(from), cy = tky(from);
    const tx = tkx(to), ty = tky(to);
    while (cx !== tx || cy !== ty) {
      const sd = cx !== tx ? (tx > cx ? 0 : 2) : (ty > cy ? 1 : 3);
      const prev = bAt(g, cx, cy);
      if (rot && prev && g.paint.placed.has(prev.id) && prev.t === t && prev.d !== sd && !g.paint.stop) turn(g, prev, sd);
      if (rot) d = sd;
      const px = cx, py = cy;
      cx += DIRS[sd][0]; cy += DIRS[sd][1];
      paintStep(g, t, px, py, cx, cy, sd, d, opt);
    }
  } else putBelt(g, t, tkx(to), tky(to), d, opt);
}

/* ---------- Bänder leeren (B7) ---------- */
// Strecke: vom Teil vorwärts und rückwärts bis zum nächsten Splitter, Gebäude oder Speicher
const LINE_T = new Set(['band', 'band2', 'band3', 'tor', 'kreuzung', 'bandbruecke', 'sortierer']);
function beltLine(g, b) {
  const seen = new Set([b.id]), q = [b];
  for (let h = 0; h < q.length; h++) {
    const c = q[h];
    for (let d = 0; d < 4; d++) {
      const n = bAt(g, c.x + DIRS[d][0], c.y + DIRS[d][1]);
      if (!n || seen.has(n.id) || !LINE_T.has(n.t)) continue;
      // verbunden: einer zeigt auf den anderen, oder ein Band läuft aus einer Kreuzung / einem Brückenband heraus
      const dirT = (a) => CONVEY.has(a.t) || a.t === 'tor';
      if (!((dirT(c) && c.d === d) || (dirT(n) && (n.d === (d + 2) % 4 || (!dirT(c) && n.d === d))))) continue;
      seen.add(n.id); q.push(n);
    }
    if (c.t === 'bandbruecke' && c.bl) { const e = bAt(g, c.x + DIRS[c.bl[0]][0] * c.bl[1], c.y + DIRS[c.bl[0]][1] * c.bl[1]); if (e && !seen.has(e.id)) { seen.add(e.id); q.push(e); } }
  }
  return q;
}
function clearBelt(g, b, line) {
  if (!LINE_T.has(b.t) && b.t !== 'splitter' && b.t !== 'ueberlauf') return;
  const list = line ? beltLine(g, b) : [b];
  let moved = 0, lost = 0;
  const take = (it) => { if (storeInsert(g, b.isl, it, false)) { moved++; flowAdd(g, b.isl, 'p', it, 1, 'leeren'); } else lost++; };
  for (const c of list) {
    if (c.it) { take(c.it); c.it = null; c.p = 0; }
    for (let i = 0; i < (c.ln || []).length; i++) if (c.ln[i]) { take(c.ln[i].it); c.ln[i] = null; }
    if (c.q && c.q.length) { for (const o of c.q) take(o.it); c.q = []; }
  }
  g.events.push({ type: 'cleared', moved, lost, n: list.length });
}

/* ---------- Kontor verlegen (A5) ---------- */
function moveKontor(g, b, x, y, d) {
  if (!b || !HQ.has(b.t)) return;
  const r = stegSpot(g, 'kontor', b.isl, x, y, d, { ignore: b.id });
  if (!r.ok) { g.events.push({ type: 'fail', msg: r.reason }); return; }
  for (const p of bldTiles(b)) g.bmap.set(p.x, p.y, 0);
  g.blds.delete(b.id);
  if (b.t === 'kontoralt') b.t = 'kontor';
  b.x = x; b.y = y; b.d = d; b.sl = r.sl;
  delete b._dock; b.links = b.links || [];
  addBuilding(g, b);
  recomputeClaims(g);
  g.shipPathCache.clear();
  revealAround(g, b);
  g.events.push({ type: 'kontorMoved', id: b.id, isl: b.isl });
}

// Testmodus: alles erforschen und jede Insel mit Kontor bis zur Lagerkapazität auffüllen (Pläne je TEST_PLANS, innerhalb der Kapazität).
// Holz mindestens 50 (auch wenn die Kapazität kleiner wäre).
const TEST_PLANS = 100;   // reicht für alle Leuchtturm-Phasen (Phase 4: 50 Schaltpläne) neben Drohnenhäfen
// Getrennte Inseln: für alle Spieler
function unlockAll(g) {
  if (isSep(g)) { for (const p of seatedPids(g)) unlockFor(g, p); }
  else unlockFor(g, null);
  for (const k of kontorIslands(g)) {
    const cap = capOf(g, k), inv = islData(g, k).inv;
    ITEM_ORDER.forEach(it => { inv[it] = Math.max(inv[it] || 0, it === 'holz' ? Math.max(cap, 50) : PLAN_ITEMS.includes(it) ? Math.min(cap, TEST_PLANS) : cap); });
  }
}
function unlockFor(g, pid) {
  const P = pst(g, pid || HOST_PID);
  // Forschungen, deren Voraussetzung es noch nicht gibt (TECH_PLANNED) oder deren Plan fehlt (Volk), bleiben gesperrt.
  // Volk- und Story-Freischaltungen setzt der Testmodus nicht (dafür Debug tideworks.unlockAll()).
  researchFree(g, pid || HOST_PID);
  fitHolds(g, pid);
  P.xp += 1000; P.xpTotal += 1000;
  coinAdd(g, 50000, 'debug', pid || HOST_PID);
}

// Kommandos, die als Bau-Aktion für Rückgängig aufgezeichnet werden (Art des Eintrags)
const REC_KIND = { place: 'build', paint: 'build', remove: 'remove', removePipe: 'remove', rotate: 'rotate', setRecipe: 'recipe', setExtract: 'out', gateAuto: 'gate', setSorter: 'sort',
  upgrade: 'upgrade', link: 'link', unlink: 'link', bridgeLink: 'bridge', placeBlueprint: 'bp' };

// Kommandos, die nur der Host schicken darf (Koop): Testmodus, Ereignis-Einstellung, Debug, Spielerliste.
// Tempo, Pause, Speichern und Laden sind keine Kommandos, sondern eigene Nachrichten an den Host (sim/host.js).
// Getrennte Inseln: Kommandos, die fremde Gebäude nur lesen (alle anderen mit Gebäude-ID nur für eigene)
const READ_ONLY = new Set(['inspect', 'remove']);
// Geschichte: „gesehen“ und die Entscheidung am Leuchtturm setzt nur der Host, ebenso die Story-Debug-Befehle.
export const HOST_ONLY = new Set(['unlockAll', 'devUnlock', 'unlock', 'relock', 'evMode', 'event', 'coins', 'damage', 'trader', 'reveal', 'debugKontor', 'giveShip', 'debugDock', 'debugTime', 'give', 'cargo', 'player', 'coopSetup', 'dropUndo',
  'storySeen', 'storyChoice', 'storyDebug', 'npcRep', 'wonderDebug', 'diveDebug']);
// Rückgängig-Stapel eines Spielers (wird bei Bedarf angelegt)
export function undoOf(g, pid) {
  let U = g.undos.get(pid);
  if (!U) { U = { u: [], r: [], open: null }; g.undos.set(pid, U); }
  return U;
}

// Verarbeitet ein Kommando der Oberfläche. Ungültige Kommandos werden ignoriert.
// grp = Zug-Nummer der Oberfläche: Kommandos mit derselben Nummer bilden eine Aktion (Ziehen, Abreißen per Ziehen).
// pid = Spieler, der es geschickt hat (Koop; Einzelspieler und Host: 'host'). Gebäude merken sich ihren Erbauer (by),
// Rückgängig gilt je Spieler, Ereignisse des Kommandos bekommen die pid (sim/host.js verteilt sie nur an diesen Spieler).
export function applyCommand(g, c, pid) {
  pid = pid || HOST_PID;
  if (!g.state || !c || typeof c !== 'object' || (pid !== HOST_PID && HOST_ONLY.has(c.type))) return;   // ohne Welt (Koop-Mitspieler ruht) nichts tun
  const n0 = g.events.length;
  g.pid = pid; g.undo = undoOf(g, pid);
  try {
    const kind = REC_KIND[c.type];
    if (!kind) { command(g, c); return; }
    recStart(g, kind, c.grp, c.type === 'placeBlueprint' ? c.name : '');
    try { command(g, c); } finally { recEnd(g); }
    computeSoll(g);
  } finally {
    for (let i = n0; i < g.events.length; i++) if (g.events[i].pid == null) g.events[i].pid = pid;
    g.pid = null; g.undo = undoOf(g, HOST_PID);
  }
}
function command(g, c) {
  const b = c.id != null ? g.blds.get(c.id) : null;
  const fail = (msg) => g.events.push({ type: 'fail', msg });
  // Getrennte Inseln: fremde Gebäude, Schiffe und Inseln nicht verändern
  if (isSep(g)) {
    if (b && !mine(g, b) && !READ_ONLY.has(c.type)) { fail(`Gehört ${playerName(g, ownerOf(b))}.`); return; }
    if (c.ship != null && c.type !== 'perm') { const s = g.state.ships.find(x => x.id === c.ship); if (s && !mine(g, s)) { fail(`Das Schiff gehört ${playerName(g, ownerOf(s))}.`); return; } }
    if ((c.type === 'removePipe' || c.type === 'drainNet' || (c.type === 'upgrade' && c.pipe)) && !myIsl(g, g.W.il(Math.floor(c.x), Math.floor(c.y)))) { fail(foreignIsl(g, g.W.il(Math.floor(c.x), Math.floor(c.y)))); return; }
    if ((c.type === 'link' || c.type === 'unlink') && [g.blds.get(c.a), g.blds.get(c.b)].some(o => o && !mine(g, o))) { fail('Nur eigene Gebäude verbinden.'); return; }
    if ((c.type === 'setIsland' || c.type === 'tradeOrder') && g.KONT[+c.isl] && !myIsl(g, +c.isl)) { fail(foreignIsl(g, +c.isl)); return; }
  }
  const opt = { rc: typeof c.rc === 'string' ? c.rc : null, ex: typeof c.ex === 'string' ? c.ex : null, ga: c.ga && typeof c.ga === 'object' ? c.ga : null, so: c.so && typeof c.so === 'object' ? c.so : null };
  switch (c.type) {
    case 'place': {
      const r = checkPlace(g, c.t, c.x, c.y, false, c.d);
      if (!r.ok) { g.events.push({ type: 'fail', msg: r.reason }); return; }
      if (PIPE.has(c.t)) { placePipe(g, c.t, c.x, c.y, r.isl); g.events.push({ type: 'placed', t: c.t, isl: r.isl, pipe: true, click: true }); return; }
      if (r.sl) opt.sl = r.sl;
      const nb = placeBuilding(g, c.t, c.x, c.y, r.d != null ? r.d : c.d, r.isl, opt);
      g.events.push({ type: 'placed', id: nb.id, t: nb.t, isl: nb.isl, n: countType(g, nb.t), click: true });
      return;
    }
    case 'paint':      // Bänder ziehen; first = neuer Zug
      if (!BD[c.t]) return;
      if (c.first || !g.paint) g.paint = { placed: new Set(), warned: false };
      paintBelt(g, c.t, c.from, c.to, c.d, opt);
      return;
    case 'paintEnd': g.paint = null; return;
    case 'remove': {
      if (!b) return;
      const block = demolishBlock(g, b, g.pid);   // Koop: fremdes Gebäude nur mit Erlaubnis des Erbauers
      if (block) { if (!c.grp || g.rmWarn !== c.grp) { g.rmWarn = c.grp; g.events.push({ type: 'fail', msg: block }); } return; }
      if (removeBuilding(g, b, true, { straighten: true })) g.events.push({ type: 'removed', id: b.id, t: b.t, notify: !!c.notify });
      return;
    }
    case 'removePipe': removePipe(g, Math.floor(c.x), Math.floor(c.y)); return;
    case 'drainNet': drainNet(g, netAt(g, Math.floor(c.x), Math.floor(c.y))); return;
    case 'rotate': if (b && BD[b.t].rot) turn(g, b, (b.d + 1) % 4); return;
    case 'research': research(g, c.id); return;
    case 'setRecipe': if (b) setField(g, b, 'rc', c.rc); return;
    case 'setExtract': if (b && b.t === 'extraktor' && (c.item === '' || ITEMS[c.item])) setField(g, b, 'ex', c.item); return;
    // Tor: umschalten (open = true/false, sonst wechseln); Automatik { it, hi, lo } oder null
    case 'gate': if (b && b.t === 'tor') { b.cl = c.open != null ? !c.open : !b.cl; g.events.push({ type: 'gate', id: b.id, cl: b.cl }); } return;
    case 'gateAuto': if (b && b.t === 'tor') setField(g, b, 'ga', c.ga ? gateAuto(c.ga) : null); return;
    // Sortierer: Ware und Umkehren ({ it, rv })
    case 'setSorter': if (b && b.t === 'sortierer') setField(g, b, 'so', sorterCfg(c.so)); return;
    // Brückenband: Verbindung von id nach to setzen (to = null: lösen)
    case 'bridgeLink': {
      if (!b || b.t !== 'bandbruecke') return;
      if (c.to == null) { if (b.bl) setBl(g, b, null); return; }
      const T = g.blds.get(c.to);
      if (!T || T.t !== 'bandbruecke' || T.isl !== b.isl || !bridgeVec(b, T)) { g.events.push({ type: 'fail', msg: `Die Enden müssen auf einer Linie liegen, höchstens ${BELT_BRIDGE.range} Felder dazwischen.` }); return; }
      linkBridge(g, b, T);
      return;
    }
    case 'clearBelt': if (b) clearBelt(g, b, !!c.line); return;
    case 'inspect': ioReset(g, c.id, g.pid); return;
    case 'moveKontor': moveKontor(g, b, Math.floor(c.x), Math.floor(c.y), (c.d | 0) & 3); return;
    // Aufwerten: Gebäude (id) oder Rohr (pipe: true, x, y); beim Ziehen meldet nur der erste Fehler (warn)
    case 'upgrade': {
      let tgt = b;
      if (c.pipe) { const x = Math.floor(c.x), y = Math.floor(c.y), p = g.pipes.get(x, y); tgt = p ? { pipe: p, x, y } : null; }
      if (!tgt) return;
      const why = upgradeAt(g, tgt);
      // beim Ziehen nur die erste Meldung je Zug
      if (why) { if (!c.grp || g.upWarn !== c.grp) { g.upWarn = c.grp; g.events.push({ type: 'fail', msg: why }); } return; }
      g.events.push({ type: 'upgraded', click: !c.grp });
      return;
    }
    case 'undo': undo(g); return;
    case 'redo': redo(g); return;
    case 'placeBlueprint': placeBlueprint(g, c); return;
    case 'buildShip': {
      if (!b || b.t !== 'werft' || b.bq) return;
      const kind = SHIP_KINDS[c.kind] ? c.kind : 'fracht', K = SHIP_KINDS[kind];
      if (!isUnlocked(g, 'ship:' + kind)) { g.events.push({ type: 'fail', msg: `${K.name}: ${lockReason('ship:' + kind)}` }); return; }
      if (!afford(g, b.isl, K.cost)) { g.events.push({ type: 'fail', msg: `Für ${kind === 'entdecker' ? 'einen Entdecker' : kind === 'kogge' ? 'eine Kogge' : 'ein Frachtschiff'} fehlen: ${missingText(g, b.isl, K.cost)}.` }); return; }
      pay(g, b.isl, K.cost, 'schiffbau'); b.bq = 1; b.bk = kind; b.bo = g.pid; b.prog = 0;
      return;
    }
    // Schiffe: steuern, Route, Laden/Entladen, umbenennen, Kontor gründen
    case 'shipGoto': case 'setRoute': case 'resumeRoute': case 'shipLoad': case 'shipUnload': case 'renameShip': case 'foundKontor': case 'cargo': case 'jettison': case 'shipPick': case 'shipAuto': case 'shipRange': {
      const s = g.state.ships.find(x => x.id === c.ship);
      if (!s) return;
      if (c.type === 'shipGoto') { s.mgn = 0; shipGoto(g, s, Math.floor(c.x), Math.floor(c.y)); }
      else if (c.type === 'setRoute') setRoute(g, s, c.stops, !!c.reset);
      else if (c.type === 'resumeRoute') resumeRoute(g, s);
      else if (c.type === 'shipLoad') manualLoad(g, s, c.it, c.n | 0);
      else if (c.type === 'shipUnload') manualUnload(g, s, c.hold | 0);
      else if (c.type === 'renameShip') { const n = String(c.name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_LEN); s.name = n || `Schiff ${s.n}`; }
      else if (c.type === 'foundKontor') foundKontor(g, s, Math.floor(c.x), Math.floor(c.y), (c.d | 0) & 3);
      else if (c.type === 'shipAuto') setAuto(g, s, !!c.on);
      else if (c.type === 'shipRange') setRange(g, s, c.v);
      else if (c.type === 'jettison') jettison(g, s, c.hold | 0);
      else if (c.type === 'shipPick') s.pick = !!c.on;
      else if (c.type === 'cargo' && ITEMS[c.it]) { const n = Math.floor(+c.n) || 0; if (n > 0) addCargo(g, s, c.it, n); else takeCargo(s, c.it, -n || 9999); }
      return;
    }
    case 'setIsland': {
      const k = +c.isl, d = g.state.isl[k];
      if (!kontorOf(g, k) || !d) return;
      const n = String(c.name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_LEN);
      if (n) d.name = n;
      if (FLAGS.includes(c.flag) || c.flag === HOME.flag) d.flag = c.flag;
      return;
    }
    case 'link': case 'unlink': {
      const A = g.blds.get(c.a), B = g.blds.get(c.b);
      if (!A || !B) return;
      const L = { k: 'link', a: { x: A.x, y: A.y, t: A.t }, b: { x: B.x, y: B.y, t: B.t } };
      if (c.type === 'unlink') { if ((A.links || []).includes(B.id)) logOp(g, Object.assign(L, { on: false })); unlink(g, A, B); return; }
      if ((A.links || []).includes(B.id) || canLink(A, B)) return;
      link(g, A, B);
      logOp(g, Object.assign(L, { on: true }));
      return;
    }
    case 'unlockAll': unlockAll(g); return;
    // Debug (nur Entwicklung): alles freischalten; einen Schlüssel freischalten bzw. wieder sperren (data/unlocks.js)
    case 'devUnlock': devUnlockAll(g, seatedPids(g)); for (const p of seatedPids(g)) fitHolds(g, p); return;
    case 'unlock': if (!unlock(g, c.key, ['npc', 'story'].includes(c.src) ? c.src : 'debug')) fail(`Debug: „${c.key}“ ist unbekannt oder schon frei.`); return;
    case 'relock': relock(g, String(c.key)); return;
    // Koop (nur Host): Spieler anlegen/ändern, Koop-Spielstand einrichten, Rückgängig-Stapel eines Spielers leeren
    case 'player': {
      const id = String(c.id || ''), P = g.state.players;
      if (!/^[a-z0-9_-]{1,40}$/i.test(id)) return;
      const name = String(c.name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX), color = PLAYER_COLORS.includes(c.color) ? c.color : null;
      const p = P[id] || (P[id] = freshPlayer(name, color || PLAYER_COLORS[0], g.state.coop ? g.state.coop.demolish : false));
      if (name) p.name = name;
      if (color) p.color = color;
      if (isSep(g) && c.seat) seatPlayer(g, id);
      return;
    }
    case 'coopSetup': {
      if (!g.state.coop) g.state.coop = { demolish: !!c.demolish };
      else if (typeof c.demolish === 'boolean') g.state.coop.demolish = c.demolish;
      // Getrennte Inseln braucht Startplätze (newGame mit slots); ein Spielstand behält seinen Modus
      if (c.mode === 'shared' && !g.state.homes) g.state.mode = 'shared';
      if (c.fresh) for (const id in g.state.players) g.state.players[id].opts.demolish = !!c.demolish;
      return;
    }
    case 'dropUndo': g.undos.delete(String(c.id)); return;
    // jeder Spieler für sich: Mitspieler dürfen meine Gebäude abreißen
    case 'setOpt': {
      const p = g.state.players[g.pid];
      if (p && c.k === 'demolish') p.opts.demolish = !!c.v;
      return;
    }
    // Endgame: Reparatur, Handelsaufträge, Leuchtturm-Phase, Drohnenkiste, Ereignis-Einstellung
    case 'repair': { const why = repair(g, b, 'panel'); if (why) g.events.push({ type: 'fail', msg: why }); return; }
    case 'tradeOrder': tradeOrder(g, c); return;
    // Handel zwischen Spielern: Preisliste eines Handelskontors; Erlaubnis für eine Route an mein Hauptkontor
    case 'setPrices': setPrices(g, b, c.pl); return;
    case 'perm': { const s = g.state.ships.find(x => x.id === c.ship); if (s) setPerm(g, s, +c.kontor, !!c.ok); return; }
    case 'wonderOrder': wonderOrder(g, b); return;
    case 'wonderStore': wonderStore(g, b, !!c.on); return;
    case 'wonderDebug': wonderDebug(g, c); return;
    // Geschichte (sim/story.js): Gespräch mit einem NPC, Cutscene/Dialog gesehen, Entscheidung, Debug
    case 'talk': talk(g, String(c.npc || (b && b.npc) || '')); return;
    // Handel mit den Völkern (sim/npc.js); Laden und Entladen am Steg laufen über shipLoad/shipUnload
    case 'npcBuy': npcBuy(g, c); return;
    case 'npcDeliver': npcDeliver(g, c); return;
    case 'npcDeal': npcDeal(g, c); return;
    case 'npcRep': npcRepDebug(g, c); return;
    // Taucherglocke und Tauchen (sim/dive.js)
    case 'mountBell': mountBell(g, b, c.ship); return;
    case 'diveStart': diveStart(g, c); return;
    case 'diveEnd': diveEnd(g, c); return;
    case 'diveDebug': diveDebug(g, c); return;
    case 'storySeen': storySeen(g, c.ids); return;
    case 'storyChoice': storyChoice(g, String(c.c)); return;
    case 'storyDebug': storyDebug(g, c); return;
    case 'dkiste': if (b && b.t === 'dkiste') setDKiste(g, b, c); return;
    case 'evMode': setEvMode(g, c.mode); return;
    // Debug: Ereignis auslösen, Münzen geben, Händler sofort schicken
    case 'event': debugEvent(g, String(c.kind), !!c.warn); return;
    case 'coins': coinAdd(g, Math.round(+c.n) || 0, 'debug'); return;
    case 'damage': { const t = g.blds.get(c.id); if (t && canDamage(t.t)) { t.dmg = true; g.topoVer++; } return; }
    case 'trader': {
      const kind = TRADERS[c.kind] ? c.kind : 'hafen', P = c.isl != null ? [postOf(g, +c.isl)].filter(Boolean) : posts(g);
      if (!P.length) { g.events.push({ type: 'fail', msg: 'Debug: Kein Handelsposten gebaut.' }); return; }
      for (const p of P) if (!spawnTrader(g, kind, p)) g.events.push({ type: 'fail', msg: 'Debug: Kein Seeweg für den Händler gefunden.' });
      return;
    }
    // Debug (nur über die Konsole): Nebel aufdecken, Kontor setzen
    case 'reveal': reveal(g, c.x, c.y, Math.min(400, Math.max(1, c.r | 0))); return;
    case 'debugKontor': debugKontor(g, c.x, c.y); return;
    case 'giveShip': giveShip(g, c.x, c.y, c.kind); return;
    case 'debugDock': debugDock(g, String(c.npc || ''), c.ship); return;
    case 'debugTime': debugTime(g, +c.h); return;
    // Debug: Waren ins Lager einer Insel legen (Standard: Heimatinsel)
    case 'give': { const inv = islData(g, Number.isFinite(+c.isl) && +c.isl >= 0 ? +c.isl : 0).inv; for (const it of c.items || []) if (ITEMS[it]) inv[it] = (inv[it] || 0) + Math.max(0, c.n | 0); return; }
  }
}

// Kontor auf die Insel unter (x, y) setzen: an den erzeugten Platz oder den nächsten gültigen Platz (3×3 mit Steg)
function debugKontor(g, x, y) {
  const W = g.W, I = W.il(x, y) >= 0 ? W.island(W.il(x, y)) : W.islandNear(x, y);
  if (!I) { g.events.push({ type: 'fail', msg: 'Debug: Keine Insel unter der Kamera.' }); return; }
  if (I.npc) { g.events.push({ type: 'fail', msg: 'Debug: Das ist eine NPC-Insel.' }); return; }
  if (kontorOf(g, I.id)) { g.events.push({ type: 'fail', msg: 'Debug: Diese Insel hat schon ein Kontor.' }); return; }
  revealIsland(g, I.id);
  let spot = null;
  if (I.kontor) { const r = stegSpot(g, 'kontor', I.id, I.kontor.x, I.kontor.y, I.kontor.d); if (r.ok) spot = { x: I.kontor.x, y: I.kontor.y, d: I.kontor.d, sl: r.sl }; }
  for (let r = 0; r < 60 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    for (let d = 0; d < 4; d++) { const q = stegSpot(g, 'kontor', I.id, I.x + dx, I.y + dy, d); if (q.ok) { spot = { x: I.x + dx, y: I.y + dy, d, sl: q.sl }; break; } }
  }
  if (!spot) { g.events.push({ type: 'fail', msg: 'Debug: Kein freier Platz für ein Kontor gefunden.' }); return; }
  const b = buildKontor(g, I.id, spot.x, spot.y, spot.d, spot.sl);
  g.events.push({ type: 'debugKontor', id: b.id, isl: I.id, x: spot.x, y: spot.y });
}
// Getrennte Inseln: freien Startplatz für pid belegen, Heimatinsel einrichten, alle Heimatinseln gegenseitig aufdecken.
// Liefert den Startplatz oder null (Welt voll). Bekannte Spieler behalten ihren Platz.
export function seatPlayer(g, pid) {
  const H = g.state.homes;
  if (!H) return null;
  let h = homeOf(g, pid);
  if (h) return h;
  h = H.find(o => !o.pid);
  if (!h) return null;
  h.pid = pid;
  startHome(g, pid, addBuilding, reveal, revealIsland);
  recount(g);
  for (const a of H) if (a.pid) for (const o of H) if (o.pid && o !== a) revealIsland(g, islId(o.cx, o.cy), true, a.pid);
  g.events.push({ type: 'seated', pid, slot: h.slot, to: '*' });
  return h;
}
function buildKontor(g, isl, x, y, d, sl) {
  const b = { id: g.state.nextId++, t: 'kontor', x, y, d, sl, isl, buf: {}, out: {}, prog: 0, acc: 0, by: g.pid || HOST_PID, owner: g.pid || HOST_PID, ft: g.state.time };
  islData(g, isl);
  addBuilding(g, b);
  recount(g);
  revealAround(g, b);
  return b;
}
// Kontor auf einer Insel ohne Kontor gründen: Holz kommt aus dem Laderaum des Schiffs; d = Seite des Stegs
function foundKontor(g, s, x, y, d) {
  const fi = foundInfo(g, s, false), fail = (msg) => g.events.push({ type: 'fail', msg });
  if (!fi) {
    // Getrennte Inseln: jemand war schneller (das erste Kommando gewinnt, das Holz bleibt an Bord)
    const cn = coastNear(g, s), K = cn && kontorOf(g, cn.isl);
    if (K && isSep(g) && !mine(g, K)) { fail(K.ft != null && g.state.time - K.ft < FOUND_RACE.recent ? `Gerade von ${playerName(g, ownerOf(K))} besiedelt.` : foreignIsl(g, cn.isl)); return; }
    fail('Hier liegt keine Insel ohne Kontor in der Nähe.'); return;
  }
  if (fi.reason) { fail(fi.reason + '.'); return; }
  const r = stegSpot(g, 'kontor', fi.isl, x, y, d);
  if (!r.ok) { fail(r.reason); return; }
  if (Math.max(Math.abs(x + 1 - s.x), Math.abs(y + 1 - s.y)) > FOUND_RANGE + PORT_RANGE + 3) { fail('Dieser Platz ist zu weit vom Schiff entfernt.'); return; }
  takeCargo(s, 'holz', FOUND_COST.holz);
  const b = buildKontor(g, fi.isl, x, y, d, r.sl);
  g.events.push({ type: 'kontorFounded', id: b.id, isl: fi.isl, ship: s.id });
}
// Debug: Schiff (ship = ID, sonst das erste) an den Steg des Volks npc setzen und die Umgebung aufdecken (entdeckt das Volk)
function debugDock(g, npc, ship) {
  const P = npcPort(g, npc), s = ship != null ? g.state.ships.find(x => x.id === +ship) : g.state.ships[0];
  if (!P || !s) { g.events.push({ type: 'fail', msg: 'Debug: kein Steg oder kein Schiff.' }); return; }
  s.x = tkx(P._dock) + 0.5; s.y = tky(P._dock) + 0.5; s.st = 'idle'; s.dest = ''; s.path = null; s._pv = (s._pv || 0) + 1; s.mt = null;
  if (s.route) s.route.paused = true;
  reveal(g, P.x + 1, P.y + 1, 30, ownerOf(s));
}
// Debug: Uhrzeit h (6–30, 24 = Mitternacht) am selben Tag setzen; Tageswechsel laufen nicht rückwärts
function debugTime(g, h) {
  if (!Number.isFinite(h)) return;
  if (h < 6) h += 24;
  h = Math.max(6, Math.min(29.99, h));
  const ct = h < 21 ? (h - 6) / 15 * DAY_LEN : DAY_LEN + (h - 21) / 9 * (CYCLE - DAY_LEN);
  g.state.time = Math.max(g.state.time, Math.floor(g.state.time / CYCLE) * CYCLE + ct);
}
// Debug: neues Schiff am Kontor der Insel unter (x, y)
function giveShip(g, x, y, kind) {
  const W = g.W, I = W.il(x, y) >= 0 ? W.island(W.il(x, y)) : W.islandNear(x, y), b = I ? kontorOf(g, I.id) : null;
  if (!b || b._dock == null) { g.events.push({ type: 'fail', msg: 'Debug: Hier ist kein Kontor mit Anleger.' }); return; }
  const s = newShip(g, tkx(b._dock) + 0.5, tky(b._dock) + 0.5, null, SHIP_KINDS[kind] ? kind : undefined, isSep(g) ? ownerOf(b) : undefined);   // Getrennte Inseln: gehört dem Besitzer des Kontors
  g.events.push({ type: 'shipLaunched', id: s.id, n: s.n, name: s.name });
}
