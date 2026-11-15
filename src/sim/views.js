/* =========================================================
   KOOP: SCHLANKE SNAPSHOTS JE MITSPIELER (läuft im Simulations-Host, kein DOM)
   Jeder Mitspieler hat eine „Ansicht“ (view) mit eigenem Zwischenspeicher. Der Host schickt höchstens alle
   NET.snapEvery Sekunden einen Snapshot, der nur Änderungen seit dem letzten an diesen Mitspieler enthält:
     - kleine Zustandsteile (Zeit, Ruhm, Forschung, Münzen …) nur, wenn sich ihr Inhalt geändert hat
     - Inselinventare je Insel, Statistik-Fächer je Insel (höchstens einmal je Sekunde)
     - Gebäude feldweise: neue ganz, sonst nur geänderte Felder ($del = entfernte Felder); innerhalb des
       Sichtbereichs (Kamera + Rand) und das ausgewählte Gebäude bei jedem Snapshot, außerhalb höchstens einmal je Sekunde.
       Lage, Typ und Drehung gehen immer sofort mit, ebenso neue und abgerissene Gebäude.
     - Band-Items nur im Sichtbereich (IDs nur bei Änderung, Ware und Fortschritt als Uint8Array)
     - Bäume, Nebel und Rohre als geänderte Chunks (wie beim eigenen Snapshot)
     - Ereignisse: die des Spielers selbst und die allgemeinen (evFor)
   Getrennte Inseln: alles aus Sicht des Spielers (eigener Spielstand pst, eigener Nebel, sim/privacy.js); wird ein Nebel-Chunk
   aufgedeckt, gehen Baum- und Rohr-Chunk (maskiert), Treibgut und Funde neu mit.
   Gerundet wird beim Packen (net/protocol.js) auf drei Nachkommastellen; Vergleiche hier ebenso, damit
   winzige Änderungen keinen Verkehr erzeugen.
   ========================================================= */
import { FLAT } from '../data/buildings.js';
import { ITEM_ORDER } from '../data/items.js';
import { NET } from '../data/net.js';
import { CS, CS2 } from '../util/tiles.js';
import { record } from './snapshot.js';
import { pruneFlow, ioRates } from './stats.js';
import { undoInfo } from './undo.js';
import { pipeNets } from './fluids.js';
import { isSep, pst, fogOf, mine } from './state.js';
import { bldSeen, bldFor, shipSeen, shipFor, islFor, ownKeys, ownIsl, flowFor, rtFor, evFor2, tradeFor, jetFor, lootFor, playersFor, sepTop, maskTrees, maskPipes, treeSeen, netSeen } from './privacy.js';

const ITEM_IDX = Object.fromEntries(ITEM_ORDER.map((it, i) => [it, i + 1]));
const RND = (k, v) => typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v;
const str = (v) => v === undefined ? '§u' : JSON.stringify(v, RND);
const STRUCT = new Set(['x', 'y', 't', 'd', 'sl', 'isl']);   // sofort, auch außerhalb des Sichtbereichs
const SLOW = new Set(['stats', 'RT', 'npc']);                  // Zähler, die sich ständig ändern: nur mit der Statistik (1/s); npc = Handel mit den Völkern (Preise erholen sich je Sekunde)

// Ereignisse, die alle Spieler bekommen, auch wenn ein Spieler sie ausgelöst hat (Toasts „erforscht“ usw. zeigt nur der Auslöser)
const SHARED_EV = new Set(['researched', 'unlocked', 'goal', 'discovered', 'mapped', 'evWarn', 'evStart', 'evEnd', 'evCancel', 'traderComing', 'trade',
  'wonderStart', 'wonderPhase', 'wonderDone', 'shipLaunched', 'loot', 'exploreDone']);
// to = Empfänger ('*' = alle, sonst Liste); Getrennte Inseln (sep): ohne to nur die eigenen und die allgemeinen (ohne pid)
export const evFor = (ev, pid, sep) => ev.to ? ev.to === '*' || ev.to.includes(pid) : ev.pid == null || ev.pid === pid || (!sep && SHARED_EV.has(ev.type));

// Kleine Zustandsteile: Name → Wert aus dem Spielkontext
// (g, v): v = Ansicht; P = Spielstand des Spielers (Getrennte Inseln) bzw. state
const P = (g, v) => pst(g, v.pid), S = (g) => isSep(g);
const TOP = {
  time: g => g.state.time, xp: (g, v) => P(g, v).xp, xpTotal: (g, v) => P(g, v).xpTotal, goal: (g, v) => P(g, v).goal, gdone: (g, v) => P(g, v).gdone, nextId: g => g.state.nextId,
  tech: (g, v) => P(g, v).tech, stats: (g, v) => P(g, v).stats, found: (g, v) => P(g, v).found, mapped: (g, v) => P(g, v).mapped,
  coins: (g, v) => P(g, v).coins, coinsTotal: (g, v) => P(g, v).coinsTotal, wonder: (g, v) => P(g, v).wonder, unl: g => g.state.unl, story: g => g.state.story, npc: g => g.state.npc, dive: g => g.state.dive,
  ev: (g, v) => S(g) ? evFor2(g, v.pid) : g.state.ev, evMode: g => g.state.evMode, orders: (g, v) => S(g) ? ownKeys(g, g.state.orders, v.pid) : g.state.orders,
  players: g => S(g) ? playersFor(g) : g.state.players, mode: g => g.state.mode, RT: (g, v) => S(g) ? rtFor(g, v.pid) : g.RT, topoVer: g => g.topoVer, wireVer: g => g.wireVer,
  trade: (g, v) => S(g) ? tradeFor(g, v.pid, fogOf(g, v.pid)) : { due: g.state.trade.due, list: g.state.trade.list.map(t => ({ id: t.id, kind: t.kind, isl: t.isl, post: t.post, x: t.x, y: t.y, fl: t.fl, st: t.st, tm: t.tm, offer: t.offer })) }
};
// nur bei Getrennten Inseln: Startplätze, erster Leuchtturm, Leuchtturm-Phasen, Erlaubnis-Anfragen
const SEP_TOP = ['homes', 'wfirst', 'lh', 'perms'];

export function createView(pid) {
  return { pid, rect: null, sel: null, ack: 0, busy: false, steps: 0, events: [], trees: new Map(), treeC: new Set(), fog: new Set(), pipes: new Set(), q: Promise.resolve(), last: 0, bytes: 0 };
}
// Zwischenspeicher leeren: der nächste Snapshot enthält alles (nach der world-Nachricht)
function resetView(v) {
  v.recs = new Map(); v.ships = new Map(); v.shipIds = ''; v.top = {}; v.isl = {}; v.flowB = {}; v.soll = {}; v.flatIds = []; v.pv = new Map(); v.lootVer = null; v.jetVer = null;
  v.offAt = -1e9; v.flowAt = -1e9; v.fn = ''; v.market = ''; v.coinLog = ''; v.insp = ''; v.undo = '';
  v.trees.clear(); v.treeC.clear(); v.fog.clear(); v.pipes.clear(); v.events = []; v.fogVer = -1;
}

// Vor dem eigenen Snapshot des Hosts (der die Änderungslisten leert): Änderungen in die Ansichten übernehmen
export function feedViews(g, views, steps) {
  const sep = isSep(g);
  for (const v of views.values()) {
    if (!v.recs) continue;
    v.steps += steps;
    for (const ev of g.events) if (evFor(ev, v.pid, sep)) v.events.push(ev);
    const fog = sep ? fogOf(g, v.pid) : g.fog;
    if (g.tree.chg) for (const [k, val] of g.tree.chg) if (!sep || treeSeen(fog, k)) v.trees.set(k, val);
    for (const k of fog.dirty) { v.fog.add(k); if (sep) { v.treeC.add(k); v.pipes.add(k); } }
    for (const k of g.pipes.dirty) v.pipes.add(k);
  }
  if (sep) for (const F of g.fogs.values()) F.dirty.clear();
}

// world-Nachricht für einen Mitspieler: Seed, Bäume, Nebel, Rohrebene (die Welt erzeugt er selbst aus dem Seed)
export function netWorld(g, v) {
  resetView(v);
  if (isSep(g)) {   // eigener Nebel, Bäume und Rohre nur auf aufgedeckten Feldern
    const fog = fogOf(g, v.pid);
    fog.dirty.clear();
    return { t: 'world', seed: g.state.seed, v: g.state.v, mode: g.state.mode, homes: g.state.homes, me: v.pid,
      trees: [...g.tree.m].filter(([k]) => fog.m.has(k)).map(([k, a]) => [k, maskTrees(g, fog, k, a)]), fog: [...fog.m].map(([k, a]) => [k, a.slice()]),
      pipes: [...g.pipes.m].filter(([k]) => fog.m.has(k)).map(([k, a]) => [k, maskPipes(fog, k, a)]) };
  }
  return { t: 'world', seed: g.state.seed, v: g.state.v, mode: g.state.mode, me: v.pid, npcs: g.state.npcs || null,
    trees: [...g.tree.m].map(([k, a]) => [k, a.slice()]), fog: [...g.fog.m].map(([k, a]) => [k, a.slice()]), pipes: [...g.pipes.m].map(([k, a]) => [k, a.slice()]) };
}

function inRect(v, b) {
  if (b.id === v.sel) return true;
  const R = v.rect;
  if (!R) return false;
  const m = CS * NET.viewMargin;
  return b.x >= R[0] - m && b.x <= R[2] + m && b.y >= R[1] - m && b.y <= R[3] + m;
}

// Snapshot für eine Ansicht (host = SimHost: Tempo und Pause)
export function netSnap(g, v, host) {
  const st = g.state, snap = { t: 'snap', steps: v.steps, bUpd: [], bDel: [] }, sep = isSep(g), pid = v.pid, fog = sep ? fogOf(g, pid) : g.fog, ps = pst(g, pid);
  v.steps = 0;
  const fogNew = sep && v.fogVer !== fog.ver;   // Nebel hat sich geändert: Treibgut und Funde neu filtern
  v.fogVer = fog.ver;
  // Bestätigung, Tempo, Pause, Rohr-Version: nur nach Änderung (net/remote.js behält den letzten Wert)
  for (const [k, val] of [['ack', v.ack], ['speed', host.speed], ['halt', host.halt], ['pipeVer', g.pipeVer]]) if (v.top[k] !== val) { v.top[k] = val; snap[k] = val; }
  const flowDue = st.time - v.flowAt >= NET.flowEvery || st.time < v.flowAt;
  for (const k in TOP) { if (SLOW.has(k) && !flowDue) continue; const val = TOP[k](g, v), j = str(val); if (v.top[k] !== j) { v.top[k] = j; snap[k] = val; } }
  if (sep) { const X = sepTop(g, pid); for (const k of SEP_TOP) { const j = str(X[k]); if (v.top[k] !== j) { v.top[k] = j; snap[k] = X[k]; } } }
  // Inselinventare je Insel
  const ISL = sep ? islFor(g, pid) : st.isl;
  for (const k in ISL) { const j = str(ISL[k]); if (v.isl[k] !== j) { v.isl[k] = j; (snap.isl || (snap.isl = {}))[k] = ISL[k]; } }
  // Schiffe: Liste der IDs nur nach Änderung, je Schiff nur geänderte Felder ($del = entfernte), den Pfad nur nach Änderung
  const ships = sep ? st.ships.filter(s => shipSeen(s, pid, fog)).map(s => shipFor(s, pid)) : st.ships;
  const ids = ships.map(s => s.id), ij = ids.join(',');
  if (ij !== v.shipIds) { v.shipIds = ij; snap.shipIds = ids; for (const id of [...v.ships.keys()]) if (!ids.includes(id)) { v.ships.delete(id); v.pv.delete(id); } }
  const sd = [];
  for (const s of ships) {
    let prev = v.ships.get(s.id), d = null;
    if (!prev) { prev = {}; v.ships.set(s.id, prev); }
    for (const k in s) { if (k[0] === '_' || k === 'path') continue; const j = str(s[k]); if (prev[k] !== j) { prev[k] = j; (d || (d = { id: s.id }))[k] = s[k]; } }
    for (const k in prev) if (!(k in s)) { delete prev[k]; ((d || (d = { id: s.id })).$del || (d.$del = [])).push(k); }
    if (v.pv.get(s.id) !== s._pv) { v.pv.set(s.id, s._pv); (d || (d = { id: s.id })).path = s.path ? s.path.slice() : null; }
    if (d) sd.push(d);
  }
  if (sd.length) snap.shipD = sd;
  if (v.lootVer !== g.lootVer || fogNew) { v.lootVer = g.lootVer; snap.loot = sep ? lootFor(g, fog) : st.loot; }
  if (v.jetVer !== g.jetVer || fogNew) { v.jetVer = g.jetVer; snap.jet = sep ? jetFor(g, fog) : st.jet; }
  const U = undoInfo(g, g.undos.get(v.pid) || { u: [], r: [] }), uj = str(U);
  if (v.undo !== uj) { v.undo = uj; snap.undo = U; }
  // Statistik höchstens einmal je Sekunde: nur geänderte Fächer
  if (flowDue) {
    v.flowAt = st.time; pruneFlow(st.flow, st.time);
    const fb = [];
    for (const k in st.flow.isl) if (!sep || ownIsl(g, k, pid)) st.flow.isl[k].forEach((bk, i) => { const key = k + ':' + i, j = str(bk); if (v.flowB[key] !== j) { v.flowB[key] = j; fb.push([+k, i, bk]); } });
    snap.flowB = fb; snap.flowT = st.time;
    const soll = {};
    for (const k in g.SOLL) { if (sep && !ownIsl(g, k, pid)) continue; const j = str(g.SOLL[k]); if (v.soll[k] !== j) { v.soll[k] = j; soll[k] = g.SOLL[k]; } }
    snap.soll = soll;
    const io = v.sel != null ? ioRates(g, v.pid) : null, ib = io && g.blds.get(io.id);
    snap.insp = io && (!sep || mine(g, ib, pid)) ? io : null;   // fremde Gebäude: kein Durchsatz
    const mj = str(st.market), cj = str(ps.coinLog);
    if (mj !== v.market) { v.market = mj; snap.market = st.market; }
    if (cj !== v.coinLog) { v.coinLog = cj; snap.coinLog = ps.coinLog; }
  }
  // Gebäude feldweise
  const off = st.time - v.offAt >= NET.offViewEvery || st.time < v.offAt;
  if (off) v.offAt = st.time;
  const flatIds = [];
  let seen = 0;
  for (const b of g.blds.values()) {
    if (sep && !bldSeen(b, pid, fog)) continue;   // fremd und im Nebel
    seen++;
    const vis = inRect(v, b);
    if (vis && FLAT.has(b.t)) flatIds.push(b.id);
    const prev = v.recs.get(b.id), r = sep ? bldFor(b, record(b), pid) : record(b);
    if (!prev) {
      const p = {};
      for (const k in r) p[k] = str(r[k]);
      v.recs.set(b.id, p); snap.bUpd.push(r);
      continue;
    }
    let d = null;
    const full = vis || off;
    for (const k in r) {
      if (!full && !STRUCT.has(k)) continue;
      const j = str(r[k]);
      if (prev[k] !== j) { prev[k] = j; (d || (d = { id: b.id }))[k] = r[k]; }
    }
    if (full) for (const k in prev) if (!(k in r)) { delete prev[k]; ((d || (d = { id: b.id })).$del || (d.$del = [])).push(k); }
    if (d) snap.bUpd.push(d);
  }
  if (v.recs.size !== seen) for (const id of v.recs.keys()) if (!g.blds.has(id)) { v.recs.delete(id); snap.bDel.push(id); }
  // Band-Items im Sichtbereich
  let same = flatIds.length === v.flatIds.length;
  for (let k = 0; same && k < flatIds.length; k++) if (flatIds[k] !== v.flatIds[k]) same = false;
  if (!same) { v.flatIds = flatIds; snap.vfIds = Int32Array.from(flatIds); }
  const fp = new Uint8Array(flatIds.length), fi = new Uint8Array(flatIds.length);
  flatIds.forEach((id, k) => { const b = g.blds.get(id); fp[k] = Math.round(Math.min(1, Math.max(0, b.p || 0)) * 250); fi[k] = b.it ? ITEM_IDX[b.it] : 0; });
  snap.vfP = fp; snap.vfIt = fi;
  // Bäume, Nebel, Rohre
  const tk2 = new Float64Array(v.trees.size), tv = new Float32Array(v.trees.size);
  let n = 0;
  for (const [k, val] of v.trees) { tk2[n] = k; tv[n] = val; n++; }
  v.trees.clear();
  snap.trK = tk2; snap.trV = tv;
  snap.fog = [];
  for (const key of v.fog) { const a = fog.m.get(key); if (a) snap.fog.push([key, a.slice()]); }
  v.fog.clear();
  // Getrennte Inseln: Baum-Chunks der neu aufgedeckten Gebiete (maskiert)
  if (v.treeC.size) { snap.trC = []; for (const key of v.treeC) { const a = g.tree.m.get(key); if (a) snap.trC.push([key, maskTrees(g, fog, key, a)]); } v.treeC.clear(); if (!snap.trC.length) delete snap.trC; }
  snap.pipes = [];
  for (const key of v.pipes) snap.pipes.push([key, g.pipes.m.has(key) ? (sep ? maskPipes(fog, key, g.pipes.m.get(key)) : g.pipes.m.get(key).slice()) : new Uint8Array(CS2)]);
  v.pipes.clear();
  const fn = [];
  for (const N of pipeNets(g).nets) if ((N.fluid || N.flow > 0.01) && (!sep || netSeen(fog, N.rep))) fn.push([N.rep, N.fluid, Math.round(N.amt * 10) / 10, Math.round(N.flow * 100) / 100]);
  const fj = JSON.stringify(fn);
  if (fj !== v.fn) { v.fn = fj; snap.fnets = fn; }
  snap.events = v.events; v.events = [];
  // Leeres weglassen (net/remote.js setzt es wieder ein)
  for (const k of ['bUpd', 'bDel', 'fog', 'pipes', 'events', 'trK', 'trV', 'vfP', 'vfIt']) if (!snap[k].length) delete snap[k];
  return snap;
}
