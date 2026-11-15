/* =========================================================
   SNAPSHOTS: Simulation → Oberfläche
   Die Welt selbst wird nicht übertragen: beide Seiten erzeugen sie aus dem Seed (world/world.js).
   Die Simulation schickt nach jedem Durchlauf einen schlanken Snapshot:
     - kleine Zustandsteile (Zeit, XP, Lager, Forschung, Schiffe, entdeckte Inseln …) komplett
     - Gebäude als Änderungen (nur geänderte Einträge + gelöschte IDs)
     - Band-Inhalte (Item + Fortschritt) als Typed Arrays
     - Bäume als Änderungen je Feld (Schlüssel aus Chunk und Index, siehe TreeLayer.chg)
     - Nebel als ganze Bitmasken der geänderten Chunks
     - die Produktionsstatistik (flow) höchstens einmal pro Sekunde Spielzeit
   Belegung (bmap) und Erntegebiete (claim) berechnet der Spiegel aus den Gebäuden selbst.
     - Rohre als ganze geänderte Chunks der Rohrebene, dazu pipeVer und der Inhalt der Rohrnetze (fnets: [Netz-Schlüssel, Flüssigkeit, Menge, Durchfluss])
   Die „world“-Nachricht (Start, Neustart, Import) enthält nur Seed, veränderte Baum-Chunks, Rohr-Chunks und den Nebel,
   dazu die Zellen der Startplätze (homes) und der NPC-Inseln (npcs), weil beide die erzeugte Welt verändern.
   Getrennte Inseln: auch der Host sieht nur, was in seinem Nebel liegt (sim/privacy.js, wie die Mitspieler in sim/views.js).
   Kein DOM-Zugriff.
   ========================================================= */
import { TICK } from '../config.js';
import { BD, FLAT, CONVEY } from '../data/buildings.js';
import { ITEM_ORDER } from '../data/items.js';
import { createGame, recount, freshUI, mergeDefaults, initWorld, isSep, HOST_PID } from './state.js';
import { bldSeen, bldFor, shipSeen, shipFor, islFor, ownKeys, flowFor, rtFor, evFor2, tradeFor, jetFor, lootFor, playersFor, sepTop, maskTrees, maskPipes, treeSeen, netSeen } from './privacy.js';
import { freshFlow, pruneFlow, ioRates } from './stats.js';
import { bldTiles } from './kontor.js';
import { recomputeClaims } from './buildings.js';
import { chgXY } from '../world/layers.js';
import { CS2 } from '../util/tiles.js';
import { pipeNets } from './fluids.js';
import { undoInfo } from './undo.js';

const FLOW_EVERY = 1;     // Sekunden zwischen zwei Statistik-Übertragungen

const ITEM_IDX = Object.fromEntries(ITEM_ORDER.map((it, i) => [it, i + 1]));
// Reine Zwischenspeicher der Simulation – die Oberfläche berechnet sie bei Bedarf selbst
const SKIP = new Set(['_sv', '_sh', '_ov', '_outs', '_net', '_rr', '_pt', '_ring', '_pn', '_cd', '_ri', '_pg', '_pq', '_ps', '_pd', '_bn', '_bv', '_fa', '_br', '_it', '_tl', '_ac', '_tdock', '_xn', '_xv', '_ro']);

export function createSnapCache() {
  return { recs: new Map(), flatIds: [], flowAt: null, pv: new Map(), lootVer: null, jetVer: null, fogVer: -1 };
}

export function record(b) {
  const o = {}, flat = FLAT.has(b.t);
  for (const k in b) { if (SKIP.has(k) || (flat && (k === 'it' || k === 'p'))) continue; o[k] = b[k]; }
  return o;
}

// Einmalig nach Start, Neustart oder Import: Seed, veränderte Baum-Chunks, Nebel. Setzt den Cache zurück.
export function worldMessage(g, cache, info) {
  cache.recs.clear(); cache.flatIds = []; cache.flowAt = null; cache.pv.clear(); cache.lootVer = null; cache.jetVer = null; cache.fogVer = -1;
  if (g.tree.chg) g.tree.chg.clear(); else g.tree.chg = new Map();
  g.fog.dirty.clear(); g.pipes.dirty.clear();
  const sep = isSep(g), F = g.fog;
  const trees = [...g.tree.m].filter(([k]) => !sep || F.m.has(k)).map(([k, a]) => [k, sep ? maskTrees(g, F, k, a) : a.slice()]), fog = [...g.fog.m].map(([k, a]) => [k, a.slice()]);
  const pipes = [...g.pipes.m].filter(([k]) => !sep || F.m.has(k)).map(([k, a]) => [k, sep ? maskPipes(F, k, a) : a.slice()]);
  return Object.assign({ kind: 'world', seed: g.state.seed, v: g.state.v, ui: g.state.ui, trees, fog, pipes, homes: sep ? g.state.homes : null, npcs: g.state.npcs || null }, info || {});
}

// Snapshot nach einem Simulationsdurchlauf (steps = gerechnete Schritte, 0 = nur Kommandos verarbeitet)
export function buildSnapshot(g, cache, steps) {
  const st = g.state, sep = isSep(g), me = HOST_PID, F = g.fog;
  const fogNew = sep && cache.fogVer !== F.ver;
  cache.fogVer = F.ver;
  const snap = {
    kind: 'snap', steps,
    time: st.time, xp: st.xp, xpTotal: st.xpTotal, goal: st.goal, gdone: st.gdone, nextId: st.nextId, tech: st.tech, isl: sep ? islFor(g, me) : st.isl, stats: st.stats, found: st.found, mapped: st.mapped,
    // Schiffe; den Pfad nur, wenn er sich geändert hat (_pv), sonst behält der Spiegel den alten
    ships: (sep ? st.ships.filter(s => shipSeen(s, me, F)).map(s => shipFor(s, me)) : st.ships).map(s => {
      const o = Object.assign({}, s);
      if (cache.pv.get(s.id) === s._pv) delete o.path; else { cache.pv.set(s.id, s._pv); o.path = s.path ? s.path.slice() : null; }
      return o;
    }),
    RT: sep ? rtFor(g, me) : g.RT, topoVer: g.topoVer, wireVer: g.wireVer,
    // Endgame: Münzen, Leuchtturm, Ereignisse, Aufträge, Händler (ohne Pfad)
    coins: st.coins, coinsTotal: st.coinsTotal, wonder: st.wonder, unl: st.unl, story: st.story, npc: st.npc, dive: st.dive, ev: sep ? evFor2(g, me) : st.ev, evMode: st.evMode, orders: sep ? ownKeys(g, st.orders, me) : st.orders,
    players: sep ? playersFor(g) : st.players, mode: st.mode,   // Koop: Spieler (Name, Farbe, Einstellungen) und Modus
    trade: sep ? tradeFor(g, me, F) : { due: st.trade.due, list: st.trade.list.map(t => ({ id: t.id, kind: t.kind, isl: t.isl, post: t.post, x: t.x, y: t.y, fl: t.fl, st: t.st, tm: t.tm, offer: t.offer })) },
    events: g.events, bUpd: [], bDel: [],
    undo: undoInfo(g)   // Beschriftung der obersten Rückgängig-/Wiederholen-Einträge
  };
  g.events = [];
  if (sep) Object.assign(snap, sepTop(g, me));
  // eingesammelte Funde nur nach Änderungen
  if (cache.lootVer !== g.lootVer || fogNew) { cache.lootVer = g.lootVer; snap.loot = sep ? lootFor(g, F) : st.loot; }
  // abgeworfene Ladung nur nach Änderungen
  if (cache.jetVer !== g.jetVer || fogNew) { cache.jetVer = g.jetVer; snap.jet = sep ? jetFor(g, F) : st.jet; }
  // Produktionsstatistik nur einmal pro Sekunde
  if (cache.flowAt == null || st.time - cache.flowAt >= FLOW_EVERY || st.time < cache.flowAt) {
    cache.flowAt = st.time; pruneFlow(st.flow, st.time);
    snap.flow = sep ? flowFor(g, me) : st.flow; snap.flowT = st.time;
    snap.soll = sep ? ownKeys(g, g.SOLL, me) : g.SOLL;          // Soll-Raten (sim/soll.js)
    snap.insp = ioRates(g);      // Durchsatz des gewählten Gebäudes
    if (sep && snap.insp) { const ib = g.blds.get(snap.insp.id); if (ib && (ib.owner || ib.by || HOST_PID) !== me) snap.insp = null; }
    snap.market = st.market; snap.coinLog = st.coinLog;   // Preise und Münzbuch
  }
  // Gebäude-Änderungen
  const flatIds = [];
  let seen = 0;
  for (const b of g.blds.values()) {
    if (sep && !bldSeen(b, me, F)) continue;   // fremd und im Nebel
    seen++;
    const r = sep ? bldFor(b, record(b), me) : record(b), j = JSON.stringify(r);
    if (cache.recs.get(b.id) !== j) { cache.recs.set(b.id, j); snap.bUpd.push(r); }
    if (FLAT.has(b.t)) flatIds.push(b.id);
  }
  if (cache.recs.size !== seen) for (const id of cache.recs.keys()) if (!g.blds.has(id)) { cache.recs.delete(id); snap.bDel.push(id); }
  // Band-Inhalte
  let same = flatIds.length === cache.flatIds.length;
  for (let k = 0; same && k < flatIds.length; k++) if (flatIds[k] !== cache.flatIds[k]) same = false;
  if (!same) { cache.flatIds = flatIds; snap.flatIds = Int32Array.from(flatIds); }
  const fp = new Float64Array(flatIds.length), fi = new Uint8Array(flatIds.length);
  flatIds.forEach((id, k) => { const b = g.blds.get(id); fp[k] = b.p || 0; fi[k] = b.it ? ITEM_IDX[b.it] : 0; });
  snap.flatP = fp; snap.flatIt = fi;
  // Bäume (Änderungen) und Nebel (geänderte Chunks)
  const chg = g.tree.chg, tk = new Float64Array(chg.size), tv = new Float32Array(chg.size);
  let n = 0;
  for (const [k, v] of chg) { if (sep && !treeSeen(F, k)) continue; tk[n] = k; tv[n] = v; n++; }
  chg.clear();
  snap.trK = n < tk.length ? tk.slice(0, n) : tk; snap.trV = n < tv.length ? tv.slice(0, n) : tv;
  snap.fog = [];
  const pk = new Set(g.pipes.dirty);
  if (sep) snap.trC = [];
  for (const key of g.fog.dirty) {
    snap.fog.push([key, g.fog.m.get(key).slice()]);
    // Getrennte Inseln: neu aufgedeckt – Baum- und Rohr-Chunk (maskiert) dazu
    if (sep) { const a = g.tree.m.get(key); if (a) snap.trC.push([key, maskTrees(g, F, key, a)]); pk.add(key); }
  }
  g.fog.dirty.clear();
  // Rohre (geänderte Chunks, gelöschte als leerer Chunk) und Inhalt der Netze
  snap.pipes = [];
  for (const key of pk) snap.pipes.push([key, g.pipes.m.has(key) ? (sep ? maskPipes(F, key, g.pipes.m.get(key)) : g.pipes.m.get(key).slice()) : new Uint8Array(CS2)]);
  g.pipes.dirty.clear();
  snap.pipeVer = g.pipeVer;
  snap.fnets = [];
  for (const n of pipeNets(g).nets) if ((n.fluid || n.flow > 0.01) && (!sep || netSeen(F, n.rep))) snap.fnets.push([n.rep, n.fluid, n.amt, n.flow]);
  return snap;
}
// Typed Arrays eines Snapshots (zum Übertragen ohne Kopie)
export function snapTransfer(s) {
  const t = [s.flatP.buffer, s.flatIt.buffer, s.trK.buffer, s.trV.buffer];
  for (const f of s.fog) t.push(f[1].buffer);
  for (const f of s.pipes) t.push(f[1].buffer);
  for (const f of s.trC || []) t.push(f[1].buffer);
  if (s.flatIds) t.push(s.flatIds.buffer);
  return t;
}

/* ---------- Gegenseite: Spiegel-Kontext ---------- */
export function createMirror() {
  const m = createGame();
  m.flatIds = new Int32Array(0);
  m.snapAt = 0; m.snapDur = TICK * 1000; m.flowVer = 0; m.worldVer = 0;
  m.speed = 1; m.halt = false; m.undo = { u: null, r: null };
  m.mirror = true;   // Abfragen in sim/state.js: im Spiegel stehen nur die eigenen Werte (Getrennte Inseln), m.me = eigene Spieler-ID
  return m;
}
export function applyWorld(m, w) {
  initWorld(m, w.seed, w.homes, w.npcs);
  m.worldVer++;
  m.demo = !!w.demo;   // Demo-Fabrik des Titelbildschirms
  for (const [k, a] of w.trees) m.tree.m.set(k, a);
  for (const [k, a] of w.fog) m.fog.setChunk(k, a);
  for (const [k, a] of w.pipes || []) m.pipes.setChunk(k, a);
  m.pipeVer = 1; m.PN = null; m.pnVer = -1; m.fnets = [];
  m.state = { v: w.v, seed: w.seed, time: 0, xp: 0, xpTotal: 0, goal: 0, tech: {}, nextId: 1, isl: {}, found: {}, mapped: {}, jet: [], ships: [], loot: {}, stats: { made: {}, delivered: 0, burned: 0, sold: 0, bought: 0 }, flow: freshFlow(), flowT: 0, ui: mergeDefaults(freshUI(), w.ui),
    coins: 0, coinsTotal: 0, coinLog: [], market: { s: {}, b: {}, h: {}, ht: 0 }, trade: { due: {}, list: [] }, orders: {}, wonder: { ph: 0, pb: 0, pt: 0, got: null, lager: 1, acc: 0, id: null, doneAt: null }, unl: {}, ev: { list: [], nextAt: null, n: 0 }, evMode: 'normal',
    players: {}, mode: w.homes ? 'separate' : 'shared', homes: w.homes || null, wfirst: null, story: null, npc: null, dive: null, npcs: w.npcs || null };
  m.lh = null; m.perms = { ask: [], ok: [] };
  m.flowVer = (m.flowVer || 0) + 1;
  m.blds = new Map(); m.flatIds = new Int32Array(0);
  m.RT = { popSup: {}, popAll: {} };
  m.netVer = -1; m.NETS = [];
  recount(m);
}
function markTiles(m, b, id) { for (const p of bldTiles(b)) m.bmap.set(p.x, p.y, id); }
// now = Zeitpunkt des Eintreffens (ms), für die Interpolation von Band-Items und Schiffen
export function applySnapshot(m, s, now) {
  const st = m.state, moved = s.steps > 0;
  st.time = s.time; st.xp = s.xp; st.xpTotal = s.xpTotal; st.goal = s.goal; st.gdone = s.gdone || {}; st.nextId = s.nextId; st.tech = s.tech; st.isl = s.isl; st.stats = s.stats; st.found = s.found; st.mapped = s.mapped || {};
  if (s.loot) { st.loot = s.loot; m.lootVer = (m.lootVer || 0) + 1; }
  if (s.jet) { st.jet = s.jet; m.jetVer = (m.jetVer || 0) + 1; }
  if (s.flow) { st.flow = s.flow; st.flowT = s.flowT; m.flowVer++; m.SOLL = s.soll || {}; m.insp = s.insp || null; }
  if (s.market) { st.market = s.market; st.coinLog = s.coinLog || []; m.marketVer = (m.marketVer || 0) + 1; }
  st.coins = s.coins; st.coinsTotal = s.coinsTotal; st.wonder = s.wonder; st.unl = s.unl || {}; st.story = s.story || null; st.npc = s.npc || null; st.dive = s.dive || null; st.ev = s.ev; st.evMode = s.evMode; st.orders = s.orders;
  if (s.players) st.players = s.players;
  if (s.mode) st.mode = s.mode;
  // Getrennte Inseln: Startplätze, erster Leuchtturm, Leuchtturm-Phasen aller, Erlaubnis-Anfragen
  if (s.homes !== undefined) st.homes = s.homes;
  if (s.wfirst !== undefined) st.wfirst = s.wfirst;
  if (s.lh !== undefined) m.lh = s.lh;
  if (s.perms !== undefined) m.perms = s.perms || { ask: [], ok: [] };
  // Händler: alte Position für die Interpolation
  const oldT = new Map((st.trade.list || []).map(x => [x.id, x]));
  for (const t of s.trade.list) {
    const o = oldT.get(t.id);
    t._x0 = o && moved ? o.x : t.x; t._y0 = o && moved ? o.y : t.y;
    if (Math.abs(t._x0 - t.x) + Math.abs(t._y0 - t.y) > 3) { t._x0 = t.x; t._y0 = t.y; }
  }
  st.trade = s.trade;   // flowVer: Oberfläche zeichnet Statistik neu
  // Schiffe: alte Position für die Interpolation merken
  const old = new Map(st.ships.map(x => [x.id, x]));
  for (const sh of s.ships) {
    const o = old.get(sh.id);
    if (!('path' in sh)) sh.path = o ? o.path : null;
    sh._x0 = o && moved ? o.x : sh.x; sh._y0 = o && moved ? o.y : sh.y;
    if (Math.abs(sh._x0 - sh.x) + Math.abs(sh._y0 - sh.y) > 3) { sh._x0 = sh.x; sh._y0 = sh.y; }
  }
  st.ships = s.ships;
  m.RT = s.RT; m.topoVer = s.topoVer; m.wireVer = s.wireVer;
  // Gebäude und Belegung; Erntegebiete neu, wenn sich Sägewerke geändert haben
  let saw = false;
  for (const id of s.bDel) { const b = m.blds.get(id); if (b) { markTiles(m, b, 0); if (b.t === 'saege') saw = true; } m.blds.delete(id); }
  for (const r of s.bUpd) {
    const ex = m.blds.get(r.id);
    if (ex) {
      // Koop-Snapshots enthalten nur geänderte Felder (sim/views.js): fehlende Felder bleiben, $del entfernt Felder
      if (r.dr && ex.dr) r.dr.forEach((d, i) => { const o = ex.dr[i]; d._x0 = o && moved ? o.x : d.x; d._y0 = o && moved ? o.y : d.y; });   // Drohnen interpolieren
      const ch = (k) => k in r && ex[k] !== r[k];
      const mv = ch('x') || ch('y') || ch('t') || ch('d') || ch('sl');   // Kontor verlegt, Aufwerten
      if (mv) markTiles(m, ex, 0);
      const del = r.$del;
      if (del) { delete r.$del; for (const k of del) delete ex[k]; }
      Object.assign(ex, r);
      if (mv) markTiles(m, ex, ex.id);
    }
    else if (r.t) { if (FLAT.has(r.t)) { r.it = null; r.p = 0; } m.blds.set(r.id, r); markTiles(m, r, r.id); if (r.t === 'saege') saw = true; }
  }
  if (s.bDel.length || s.bUpd.length) recount(m);
  if (saw) recomputeClaims(m);
  if (s.vfIt) applyViewFlats(m, s, moved);   // Koop: Band-Items nur im Sichtbereich
  else {
  if (s.flatIds) m.flatIds = s.flatIds;
  const ids = m.flatIds;
  for (let k = 0; k < ids.length; k++) {
    const b = m.blds.get(ids[k]);
    if (!b) continue;
    const it = s.flatIt[k] ? ITEM_ORDER[s.flatIt[k] - 1] : null, p = s.flatP[k];
    // _pp = Fortschritt beim letzten Snapshot, falls dasselbe Item weiterfährt (sonst keine Interpolation)
    b._pp = moved && CONVEY.has(b.t) && it && b.it === it && p >= b.p ? b.p : null;
    b.it = it; b.p = p;
  }
  }
  for (const [k, a] of s.trC || []) m.tree.m.set(k, a);
  for (let k = 0; k < s.trK.length; k++) { const [x, y] = chgXY(s.trK[k]); m.tree.set(x, y, s.trV[k]); }
  for (const [key, bits] of s.fog) m.fog.setChunk(key, bits);
  for (const [key, arr] of s.pipes) m.pipes.setChunk(key, arr);
  m.pipeVer = s.pipeVer; if (s.fnets) m.fnets = s.fnets;
  applyNets(m);
  if (s.undo) m.undo = s.undo; else if (!s.vfIt) m.undo = { u: null, r: null };
  if (s.speed) { m.speed = s.speed; m.halt = !!s.halt; }
  // Dauer bis zum nächsten Snapshot: bei höherem Tempo entsprechend kürzer (für die Interpolation)
  if (moved) { m.snapAt = now; m.snapDur = s.dur || s.steps * TICK * 1000 / (m.speed || 1); }
  return s.events;
}
// Band-Items eines Koop-Snapshots: IDs (nur bei Änderung), Ware und Fortschritt (0–250) der Bänder im Sichtbereich.
// Wechselt ein Item auf das nächste Band, beginnt es um einen Snapshot-Weg zurückversetzt (fließt weiter statt zu springen).
function applyViewFlats(m, s, moved) {
  if (s.vfIds) m.vfIds = s.vfIds;
  const ids = m.vfIds || [], adv = (m.snapDur / 1000) * (m.speed || 1);
  for (let k = 0; k < ids.length; k++) {
    const b = m.blds.get(ids[k]);
    if (!b) continue;
    const it = s.vfIt[k] ? ITEM_ORDER[s.vfIt[k] - 1] : null, p = s.vfP[k] / 250;
    let pp = null;
    if (moved && CONVEY.has(b.t) && it) {
      if (b.it === it && p >= b.p) pp = b.p;
      else if (p < 0.6) pp = Math.max(-0.45, p - (BD[b.t].speed || 1) * adv);
    }
    b._pp = pp; b.it = it; b.p = p;
  }
}

// Inhalt der Rohrnetze im Spiegel: Netze aus Rohrebene und Gebäuden selbst berechnen, Inhalt über den Netz-Schlüssel setzen
export function applyNets(m) {
  const P = pipeNets(m), by = new Map(P.nets.map(n => [n.rep, n]));
  for (const n of P.nets) { n.fluid = null; n.amt = 0; n.flow = 0; }
  for (const [rep, f, amt, flow] of m.fnets || []) { const n = by.get(rep); if (n) { n.fluid = f; n.amt = amt; n.flow = flow; } }
}
