/* =========================================================
   RÜCKGÄNGIG / WIEDERHOLEN (in der Simulation)
   Jede Bau-Aktion legt einen Eintrag { kind, grp, ops, label } auf den Stapel g.undo.u (höchstens UNDO_MAX,
   nicht gespeichert, beim Laden/Neustart/Import leer). Eine gezogene Strecke ist eine Aktion: alle Kommandos
   mit derselben Zug-Nummer (grp) landen im selben Eintrag, solange er oben liegt.
   Die Einträge verweisen auf Positionen und Typen, nie auf Gebäude-IDs (die ändern sich beim Wiederaufbau).
   Bausteine (ops), jeder hat ein Gegenstück (inverse):
     add  { s: Gebäude-Abbild, cost, isl }        Gebäude entsteht, cost wird bezahlt
     del  { s, gain, isl, stash }                 Gebäude verschwindet, gain kommt ins Lager (stash: Inhalt ins Lager)
     pipe { x, y, from, to, cost, gain, isl }     Rohrstufe von → nach (0 = kein Rohr)
     up   { x, y, from, to, cost, gain, isl }     Gebäude wird zu einem anderen Typ gleicher Größe (Aufwerten)
     set  { x, y, t, f, from, to }                Drehung (d), Rezept (rc), Ware des Extraktors (ex), Tor-Automatik (ga), Sortierer (so), Brückenband-Verbindung (bl)
     link { a: {x, y, t}, b: {x, y, t}, on }      Kabel verbinden / lösen
   Rückgängig = Gegenstücke in umgekehrter Reihenfolge, Wiederholen = die Bausteine selbst. Vorher wird die ganze Folge
   geprüft (Stellen frei, Gebäude noch da, Lager reicht); schlägt etwas fehl, passiert nichts und der Eintrag bleibt liegen.
   Kein DOM-Zugriff.
   ========================================================= */
import { BD, FLAT, plName, PIPE } from '../data/buildings.js';
import { PIPE_BY_TIER, PIPES } from '../data/fluids.js';
import { ITEMS, resName } from '../data/items.js';
import { RECIPE_BY_ID, recipeMain } from '../data/recipes.js';
import { tk, tkx, tky } from '../util/tiles.js';
import { islData, islName, pay, invOf, demolishBlock } from './state.js';
import { bAt, addBuilding, removeBuilding, revealAround, footprint, applyUpgrade } from './buildings.js';
import { bldTiles } from './kontor.js';
import { isPowered, autoLink, link, unlink, canLink } from './power.js';
import { storeInsert } from './logistics.js';
import { setRecipe } from './production.js';
import { netGuard } from './fluids.js';

export const UNDO_MAX = 50;

export function initUndo(g) { g.undo = { u: [], r: [], open: null }; g.rec = null; }

/* ---------- Aufzeichnen ---------- */
// Vor einem Kommando: neuen Eintrag beginnen oder (gleiche Zug-Nummer, Eintrag liegt oben) den alten fortsetzen
export function recStart(g, kind, grp, name) {
  const U = g.undo, top = U.u[U.u.length - 1];
  if (grp != null && top && U.open === top && top.grp === grp && top.kind === kind) { g.rec = top; return; }
  g.rec = { kind, grp: grp != null ? grp : null, ops: [], name: name || '', fresh: true };
}
// Nach dem Kommando: ein neuer Eintrag mit Bausteinen kommt auf den Stapel (Wiederholen-Stapel wird geleert)
export function recEnd(g) {
  const e = g.rec, U = g.undo;
  g.rec = null;
  if (!e) return;
  if (e.fresh) {
    delete e.fresh;
    if (!e.ops.length) return;
    U.u.push(e); if (U.u.length > UNDO_MAX) U.u.shift();
    U.r = []; U.open = e;
  }
  e.label = labelOf(e);
}
export function logOp(g, op) { if (g.rec) g.rec.ops.push(op); }

// Abbild eines Gebäudes ohne ID und Laufzeitfelder; Kabel als Position und Typ der Partner
export function snapOf(g, b) {
  const s = {};
  for (const k in b) if (k[0] !== '_' && k !== 'id' && k !== 'links') s[k] = b[k];
  const o = JSON.parse(JSON.stringify(s));
  o.L = (b.links || []).map(id => g.blds.get(id)).filter(Boolean).map(p => ({ x: p.x, y: p.y, t: p.t }));
  return o;
}
// Inhalt eines Gebäudes, der beim Abriss verloren ginge (Band-Item, Brücken-Spuren, Puffer)
function contents(b) {
  const o = {};
  const add = (it, n) => { if (it && ITEMS[it] && n > 0) o[it] = (o[it] || 0) + n; };
  add(b.it, 1);
  for (const L of b.ln || []) if (L) add(L.it, 1);
  for (const q of b.q || []) add(q.it, 1);
  for (const it in b.buf || {}) add(it, Math.floor(b.buf[it]));
  for (const it in b.out || {}) add(it, Math.floor(b.out[it]));
  return o;
}

/* ---------- Beschriftung ---------- */
const cnt = (ops, f) => { const c = {}; for (const o of ops) { const t = f(o); if (t) c[t] = (c[t] || 0) + 1; } return c; };
function countText(c, verb, many) {
  const ts = Object.keys(c), n = ts.reduce((a, t) => a + c[t], 0);
  if (!n) return '';
  if (ts.length === 1) return `${n === 1 ? BD[ts[0]].name : n + ' ' + plName(ts[0], n)} ${verb}`;
  return `${n} ${many} ${verb}`;
}
const pipeT = (tier) => PIPE_BY_TIER[tier];
export function labelOf(e) {
  const ops = e.ops;
  switch (e.kind) {
    case 'build': {
      const lay = ops.every(o => o.k === 'pipe' || o.k === 'set');
      const c = cnt(ops, o => o.k === 'add' ? o.s.t : o.k === 'pipe' && o.to ? pipeT(o.to) : null);
      return countText(c, lay ? 'verlegt' : 'gebaut', 'Teile') || 'Bänder gedreht';
    }
    case 'remove': return countText(cnt(ops, o => o.k === 'del' ? o.s.t : o.k === 'pipe' && !o.to ? pipeT(o.from) : null), 'abgerissen', 'Teile');
    case 'upgrade': return countText(cnt(ops, o => o.k === 'up' ? o.from : o.k === 'pipe' ? pipeT(o.from) : null), 'aufgewertet', 'Teile');
    case 'rotate': { const o = ops[ops.length - 1]; return `${BD[o.t].name} gedreht`; }
    case 'recipe': { const o = ops[ops.length - 1], R = RECIPE_BY_ID[o.to]; return `Rezept ${R ? R.name || resName(recipeMain(R)) : ''}`; }
    case 'out': { const o = ops[ops.length - 1]; return `Extraktor: ${o.to ? ITEMS[o.to].name : 'beliebig'}`; }
    case 'gate': { const o = ops[ops.length - 1]; return o.to ? `Tor-Automatik: ${ITEMS[o.to.it].name}` : 'Tor-Automatik aus'; }
    case 'sort': { const o = ops[ops.length - 1], t = o.to || {}; return `Sortierer: ${t.it ? ITEMS[t.it].name : 'keine Ware'}${t.rv ? ' (umgekehrt)' : ''}`; }
    case 'bridge': { const o = ops[ops.length - 1]; return o.to ? 'Brückenband verbunden' : 'Brückenband gelöst'; }
    case 'link': { const on = ops.filter(o => o.on).length, off = ops.length - on; return off && !on ? (off > 1 ? `${off} Kabel gelöst` : 'Kabel gelöst') : on > 1 ? `${on} Kabel verbunden` : 'Kabel verbunden'; }
    case 'bp': { const n = ops.filter(o => o.k === 'add' || (o.k === 'pipe' && o.to)).length; return `Blaupause ${e.name ? '„' + e.name + '“ ' : ''}platziert (${n} Teile)`; }
  }
  return 'Bau-Aktion';
}

/* ---------- Gegenstücke ---------- */
function inverse(o) {
  switch (o.k) {
    case 'add': return { k: 'del', s: o.s, gain: o.cost, isl: o.isl, stash: true };
    case 'del': return { k: 'add', s: o.s, cost: o.gain, isl: o.isl };
    case 'pipe': return Object.assign({}, o, { from: o.to, to: o.from, cost: o.gain, gain: o.cost });
    case 'up': return Object.assign({}, o, { from: o.to, to: o.from, cost: o.gain, gain: o.cost });
    case 'set': return Object.assign({}, o, { from: o.to, to: o.from });
    case 'link': return Object.assign({}, o, { on: !o.on });
  }
  return o;
}

/* ---------- Prüfen (ohne etwas zu ändern) ---------- */
// Spielt die Folge auf einer Überlagerung durch: Belegung, Gebäude an Positionen, Rohrstufen, Lagerbilanz je Insel
function validate(g, seq) {
  const occ = new Map(), at = new Map(), pipe = new Map(), bal = new Map();
  const occT = (k) => { if (occ.has(k)) return occ.get(k); const id = g.bmap.getK(k), b = id ? g.blds.get(id) : null; return b ? b.t : ''; };
  const bldAt = (x, y, t) => { const key = tk(x, y); if (at.has(key)) return at.get(key) === t; const b = bAt(g, x, y); return !!b && b.x === x && b.y === y && b.t === t; };
  const pipeAt = (k) => pipe.has(k) ? pipe.get(k) : g.pipes.getK(k);
  const money = (isl, cost, gain) => {
    const d = bal.get(isl) || {};
    bal.set(isl, d);
    for (const r in gain || {}) d[r] = (d[r] || 0) + gain[r];
    for (const r in cost || {}) d[r] = (d[r] || 0) - cost[r];
    const inv = invOf(g, isl), miss = [];
    for (const r in cost || {}) { const have = (inv[r] || 0) + d[r]; if (have < -1e-9) miss.push(`${Math.ceil(-have)} ${ITEMS[r] ? ITEMS[r].name : r}`); }
    return miss.length ? `Auf ${islName(g, isl)} fehlen: ${miss.join(', ')}.` : null;
  };
  const GONE = 'Das Gebäude steht dort nicht mehr.', BUSY = 'Die Stelle ist inzwischen belegt.';
  for (const o of seq) {
    let why = null;
    if (o.k === 'add') {
      const s = o.s, tiles = bldTiles(s).map(p => tk(p.x, p.y));
      if (tiles.some(k => occT(k) || (!FLAT.has(s.t) && pipeAt(k)))) return BUSY;
      for (const k of tiles) occ.set(k, s.t);
      at.set(tk(s.x, s.y), s.t);
      why = money(o.isl, o.cost);
    } else if (o.k === 'del') {
      const s = o.s;
      if (!bldAt(s.x, s.y, s.t)) return GONE;
      if (!at.has(tk(s.x, s.y))) { const block = demolishBlock(g, bAt(g, s.x, s.y), g.pid); if (block) return block; }   // Koop: fremdes Gebäude
      for (const p of bldTiles(s)) occ.set(tk(p.x, p.y), '');
      at.set(tk(s.x, s.y), null);
      why = money(o.isl, null, o.gain);
    } else if (o.k === 'pipe') {
      const k = tk(o.x, o.y), t = occT(k);
      if (pipeAt(k) !== o.from) return 'Das Rohr wurde inzwischen verändert.';
      if (o.to && t && !FLAT.has(t)) return BUSY;
      if (o.to) { const w = netGuard(g, [k], !!PIPES[pipeT(o.to)].acid); if (w) return w; }
      pipe.set(k, o.to);
      why = money(o.isl, o.cost, o.gain);
    } else if (o.k === 'up') {
      if (!bldAt(o.x, o.y, o.from)) return GONE;
      const d = BD[o.to];
      at.set(tk(o.x, o.y), o.to);
      for (const k of footprint(o.x, o.y, d.w, d.h)) occ.set(k, o.to);
      why = money(o.isl, o.cost, o.gain);
    } else if (o.k === 'set') {
      if (!bldAt(o.x, o.y, o.t)) return GONE;
    } else if (o.k === 'link') {
      if (!bldAt(o.a.x, o.a.y, o.a.t) || !bldAt(o.b.x, o.b.y, o.b.t)) return GONE;
    }
    if (why) return why;
  }
  return null;
}

/* ---------- Ausführen ---------- */
const findAt = (g, x, y, t) => { const b = bAt(g, x, y); return b && b.x === x && b.y === y && b.t === t ? b : null; };
function gainTo(g, isl, gain) { const inv = islData(g, isl).inv; for (const r in gain || {}) inv[r] = (inv[r] || 0) + gain[r]; }
// Gebäude aus einem Abbild neu errichten; Puffer kommen aus dem Lager der Insel, soweit vorhanden
function rebuild(g, o) {
  const s = o.s, inv = islData(g, o.isl).inv;
  pay(g, o.isl, o.cost || {}, 'bauen');
  const b = JSON.parse(JSON.stringify(s));
  delete b.L;
  b.id = g.state.nextId++; b.isl = o.isl;
  for (const key of ['buf', 'out', 'inv']) {
    if (key === 'inv' && !s.inv) continue;
    const want = b[key] || {};
    b[key] = {};
    for (const it in want) { const n = Math.min(Math.floor(want[it]), Math.floor(inv[it] || 0)); if (n > 0) { inv[it] -= n; b[key][it] = n; } }
  }
  if (FLAT.has(b.t)) { b.it = null; b.p = 0; if (b.t === 'kreuzung') b.ln = [null, null]; if (b.t === 'bandbruecke') b.q = []; }
  if ('fi' in b) b.fi = {};
  if ('fo' in b) b.fo = {};
  if ('e' in b) b.e = 0;
  if ('fuel' in b) b.fuel = 0;
  if ('run' in b) { b.run = false; b.prog = 0; }
  if ('bq' in b) { b.bq = 0; b.prog = 0; }
  b.acc = 0; b.links = [];
  addBuilding(g, b);
  for (const p of s.L || []) { const o2 = findAt(g, p.x, p.y, p.t); if (o2 && !canLink(b, o2)) link(g, b, o2); }
  if (isPowered(b.t) && !b.links.length) autoLink(g, b);
  revealAround(g, b);
  return b;
}
function apply(g, o) {
  switch (o.k) {
    case 'add': rebuild(g, o); return;
    case 'del': {
      const b = findAt(g, o.s.x, o.s.y, o.s.t);
      if (!b) return;
      if (o.stash) { const c = contents(b); for (const it in c) for (let i = 0; i < c[it]; i++) if (!storeInsert(g, o.isl, it, false)) break; }
      if (!removeBuilding(g, b, false)) return;
      gainTo(g, o.isl, o.gain);
      return;
    }
    case 'pipe':
      gainTo(g, o.isl, o.gain);
      pay(g, o.isl, o.cost || {}, 'bauen');
      g.pipes.set(o.x, o.y, o.to); g.pipeVer++;
      return;
    case 'up': {
      const b = findAt(g, o.x, o.y, o.from);
      if (!b) return;
      gainTo(g, o.isl, o.gain);
      pay(g, o.isl, o.cost || {}, 'bauen');
      applyUpgrade(g, b, o.to);
      return;
    }
    case 'set': {
      const b = findAt(g, o.x, o.y, o.t);
      if (!b) return;
      if (o.f === 'rc') setRecipe(g, b, o.to);
      else if (o.f === 'd') { b.d = o.to; g.topoVer++; }
      else { b[o.f] = o.to && typeof o.to === 'object' ? JSON.parse(JSON.stringify(o.to)) : o.to; g.topoVer++; }
      return;
    }
    case 'link': {
      const A = findAt(g, o.a.x, o.a.y, o.a.t), B = findAt(g, o.b.x, o.b.y, o.b.t);
      if (!A || !B) return;
      if (!o.on) unlink(g, A, B);
      else if (!(A.links || []).includes(B.id) && !canLink(A, B)) link(g, A, B);
    }
  }
}
function run(g, seq) {
  const why = validate(g, seq);
  if (why) return why;
  g.rec = null;
  for (const o of seq) apply(g, o);
  return null;
}

export function undo(g) {
  const U = g.undo, e = U.u[U.u.length - 1];
  if (!e) return;
  const why = run(g, e.ops.slice().reverse().map(inverse));
  if (why) { g.events.push({ type: 'fail', msg: `Rückgängig nicht möglich: ${why}` }); return; }
  U.u.pop(); U.r.push(e); U.open = null;
  g.events.push({ type: 'undone', label: e.label });
}
export function redo(g) {
  const U = g.undo, e = U.r[U.r.length - 1];
  if (!e) return;
  const why = run(g, e.ops);
  if (why) { g.events.push({ type: 'fail', msg: `Wiederholen nicht möglich: ${why}` }); return; }
  U.r.pop(); U.u.push(e); U.open = null;
  g.events.push({ type: 'redone', label: e.label });
}
// Für den Snapshot: Beschriftung der obersten Einträge (Tooltips der Pfeil-Knöpfe)
export function undoInfo(g, U) {
  U = U || g.undo;
  if (!U) return { u: null, r: null };
  const a = U.u[U.u.length - 1], b = U.r[U.r.length - 1];
  return { u: a ? a.label : null, r: b ? b.label : null };
}

