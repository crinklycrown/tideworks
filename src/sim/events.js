/* =========================================================
   EREIGNISSE: Sturm, Vulkanausbruch, Fischschwarm, Treibgutfeld, Händlerfest, Flaute (data/events.js)
   state.ev = { list: [{ id, kind, at (Beginn), end, x, y, isl, r, on (läuft), soft (ohne Schaden), dmg (beschädigte Gebäude) }],
                nextAt (Beginn des nächsten Ereignisses, Spielzeit), n (Zähler, auch für den Zufall) }
   state.evMode = 'aus' | 'sanft' | 'normal' (Zahnrad-Menü).
   Spielzeit = state.time − 120 (der Tag beginnt bei 120 s). Zufall aus Seed und Zähler: Speichern und Laden verschiebt nichts.
   Beschädigte Gebäude (b.dmg) stehen still, bis sie repariert sind (Info-Panel oder Drohnen, REPAIR_SHARE der Baukosten).
   Getrennte Inseln: Wirkungen gelten für alle. Meldungen bekommt, wer den Ort aufgedeckt hat oder dort etwas besitzt
   (Weltereignisse: alle), die Ankündigung je Spieler mit seiner eigenen Vorwarnzeit (e.warned[pid]).
   Kein DOM-Zugriff; die Wirkungs-Abfragen laufen auch auf dem Spiegel.
   ========================================================= */
import { EVENTS, EVENT_ORDER, EVENT_TIMING, REPAIR_SHARE } from '../data/events.js';
import { BD, FLAT } from '../data/buildings.js';
import { FIND_LOOT } from '../data/finds.js';
import { G_LAVA, G_WATER } from '../config.js';
import { hash2 } from '../util/math.js';
import { tk, tkx, tky } from '../util/tiles.js';
import { kontorIslands, kontorOf, islName, afford, pay, missingText, isSep, seatedPids, fogOf, islOwner, ownerOf } from './state.js';
import { mods } from './mods.js';
import { extraVisit } from './trade.js';
import { PRODUCTION_TICKS } from './production.js';

const T0 = 120;   // Spielbeginn (state.time)
export const freshEv = () => ({ list: [], nextAt: null, n: 0 });
const rnd = (g, a, b) => hash2(g.state.ev.n * 977 + a, b, g.state.seed + 9001);
const gap = (g) => { const [a, b] = EVENT_TIMING.gap; return (a + rnd(g, 1, 1) * (b - a)) * (g.state.evMode === 'sanft' ? EVENT_TIMING.soft : 1); };
export const warnTime = (g, pid) => EVENT_TIMING.warn + mods(g, pid).evWarn;
// Getrennte Inseln: längste Vorwarnzeit aller Spieler (so früh wird das Ereignis angelegt)
const maxWarn = (g) => isSep(g) ? Math.max(...seatedPids(g).map(p => warnTime(g, p))) : warnTime(g);
// Wer bekommt die Meldungen zum Ereignis? Weltereignis: alle; sonst wer den Ort aufgedeckt hat oder auf der Insel etwas besitzt
export function evTo(g, e) {
  const all = seatedPids(g);
  if (e.x == null) return all;
  return all.filter(p => fogOf(g, p).get(Math.floor(e.x), Math.floor(e.y)) || (e.isl != null && (islOwner(g, e.isl) === p || [...g.blds.values()].some(b => b.isl === e.isl && ownerOf(b) === p))));
}
// Meldung je Empfänger (Getrennte Inseln) bzw. an alle
function evNews(g, e, ev, to) {
  if (!isSep(g)) { g.events.push(ev); return; }
  const list = to || evTo(g, e);
  if (list.length) g.events.push(Object.assign(ev, { to: list }));
}
// Ankündigung an jeden Empfänger, sobald seine Vorwarnzeit beginnt
function warnDue(g, e) {
  const now = g.state.time, W = e.warned || (e.warned = {}), to = evTo(g, e).filter(p => !W[p] && now >= e.at - warnTime(g, p));
  if (!to.length) return;
  for (const p of to) W[p] = 1;
  g.events.push({ type: 'evWarn', kind: e.kind, at: e.at, isl: e.isl, name: e.isl != null ? islName(g, e.isl) : null, x: e.x, y: e.y, to });
}

/* ---------- Wirkungen (Simulation und Spiegel) ---------- */
const active = (g) => { const E = g.state.ev; return E ? E.list.filter(e => e.on) : []; };
// Tempo-Faktor der Schiffe an (x, y)
export function evShip(g, x, y) {
  const E = g.state.ev;
  if (!E || !E.list.length) return 1;
  let f = 1;
  for (const e of E.list) {
    if (!e.on) continue;
    const D = EVENTS[e.kind];
    if (D.ship == null) continue;
    if (D.place === 'world' || Math.hypot(x - e.x, y - e.y) <= e.r) f *= D.ship;
  }
  return f;
}
// Faktor einer Fischerhütte
export function evFisher(g, b) {
  const E = g.state.ev;
  if (!E || !E.list.length) return 1;
  let f = 1;
  for (const e of E.list) {
    if (!e.on) continue;
    const D = EVENTS[e.kind];
    if (D.fischer == null) continue;
    if (D.place === 'fisch' ? b.isl === e.isl : Math.hypot(b.x + 1 - e.x, b.y + 1 - e.y) <= e.r) f *= D.fischer;
  }
  return f;
}
// Faktor eines Geothermie-Generators
export function evGeo(g, b) { let f = 1; for (const e of active(g)) if (EVENTS[e.kind].geo && e.isl === b.isl) f *= EVENTS[e.kind].geo; return f; }
// Zuschlag auf die Ankaufpreise
export function evTradePrice(g) { let f = 0; for (const e of active(g)) f += EVENTS[e.kind].tradePrice || 0; return f; }

/* ---------- Beschädigte Gebäude ---------- */
// Kann ein Gebäude beschädigt werden? Produktion, Generatoren, Häuser, Pumpen, Werft, Drohnenhafen (keine Logistik, keine Speicher)
export const canDamage = (t) => !!(PRODUCTION_TICKS[t] || t === 'drohnenhafen') && !FLAT.has(t) && !BD[t].fixed;
export function repairCost(b) {
  const c = BD[b.t].cost || {}, o = {};
  for (const r in c) o[r] = Math.ceil(c[r] * REPAIR_SHARE);
  return o;
}
// Reparieren aus dem Inselinventar; src = 'panel' | 'drone'. Liefert den Grund, falls es nicht geht.
export function repair(g, b, src) {
  if (!b || !b.dmg) return 'Dieses Gebäude ist nicht beschädigt.';
  const c = repairCost(b);
  if (!afford(g, b.isl, c)) return `Für die Reparatur fehlen: ${missingText(g, b.isl, c)}.`;
  pay(g, b.isl, c, 'reparatur');
  b.dmg = false;
  g.events.push({ type: 'repaired', id: b.id, t: b.t, isl: b.isl, src });
  return null;
}

/* ---------- Ort eines Ereignisses ---------- */
function pick(g, arr, salt) { return arr.length ? arr[Math.floor(rnd(g, salt, 7) * arr.length)] : null; }
function openSea(W, x, y, r) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!W.ocean(x + dx, y + dy)) return false; return true; }
function place(g, kind) {
  const D = EVENTS[kind], W = g.W, K = kontorIslands(g);
  if (D.place === 'world') return { x: null, y: null, isl: null, r: 0 };
  if (D.place === 'kontor') {
    const k = pick(g, K, 11);
    if (k == null) return null;
    const I = W.island(k);
    return { x: I.x, y: I.y, isl: k, r: D.r };
  }
  if (D.place === 'vulkan') {
    const list = Object.keys(g.ISLC).map(Number).filter(k => k >= 0 && W.island(k) && W.island(k).type === 'vulkan');
    const k = pick(g, list, 12);
    if (k == null) return null;
    const I = W.island(k);
    return { x: I.x, y: I.y, isl: k, r: Math.round(I.r) + 6 };
  }
  if (D.place === 'fisch') {
    const list = Object.keys(g.ISLC).map(Number).filter(k => k >= 0 && g.ISLC[k].fischer);
    const k = pick(g, list, 13);
    if (k == null) return null;
    const I = W.island(k);
    return { x: I.x, y: I.y, isl: k, r: D.r };
  }
  if (D.place === 'sea') {
    const k = pick(g, K, 14), H = k != null ? kontorOf(g, k) : null;
    if (!H) return null;
    const cx = H._dock != null ? tkx(H._dock) : H.x, cy = H._dock != null ? tky(H._dock) : H.y, [a, b] = EVENT_TIMING.drift;
    for (let i = 0; i < 24; i++) {
      const ang = rnd(g, 30 + i, 8) * Math.PI * 2, d = a + rnd(g, 60 + i, 9) * (b - a);
      const x = Math.round(cx + Math.cos(ang) * d), y = Math.round(cy + Math.sin(ang) * d);
      if (openSea(W, x, y, 3)) return { x, y, isl: k, r: 10 };
    }
    return null;
  }
  return null;
}
// Ereignis anlegen (angekündigt oder sofort laufend); force = über Debug (Ort notfalls ersatzweise)
export function makeEvent(g, kind, at, force) {
  const E = g.state.ev, D = EVENTS[kind];
  if (!D) return null;
  E.n++;
  let p = place(g, kind);
  if (!p && force) { const k = kontorIslands(g)[0], I = k != null ? g.W.island(k) : null; if (I) p = { x: I.x, y: I.y, isl: k, r: D.r || 30 }; }
  if (!p) return null;
  const e = { id: E.n, kind, at, end: at + D.dur, x: p.x, y: p.y, isl: p.isl, r: p.r, on: false, soft: g.state.evMode === 'sanft' };
  E.list.push(e);
  if (isSep(g)) warnDue(g, e);
  else g.events.push({ type: 'evWarn', kind, at, isl: e.isl, name: e.isl != null ? islName(g, e.isl) : null, x: e.x, y: e.y });
  g.evVer = (g.evVer || 0) + 1;
  return e;
}

/* ---------- Ablauf (einmal je Sekunde aus sim/sim.js) ---------- */
export function evTick(g) {
  const st = g.state, E = st.ev, now = st.time, mode = st.evMode || 'normal';
  for (const e of E.list) {
    if (isSep(g)) e.vis = evTo(g, e);   // Empfänger (sim/privacy.js)
    if (!e.on && !e.done && isSep(g)) warnDue(g, e);
    if (!e.on && !e.done && now >= e.at) startEvent(g, e);
    if (e.on && now >= e.end) endEvent(g, e);
  }
  if (E.list.some(e => e.done)) { E.list = E.list.filter(e => !e.done); g.evVer = (g.evVer || 0) + 1; }
  if (mode === 'aus') {
    // angekündigte Ereignisse entfallen, laufende enden regulär
    if (E.list.some(e => !e.on && !e.dbg)) { E.list = E.list.filter(e => e.on || e.dbg); g.events.push({ type: 'evCancel', to: isSep(g) ? '*' : undefined }); g.evVer = (g.evVer || 0) + 1; }
    E.nextAt = null;
    return;
  }
  if (E.nextAt == null) E.nextAt = Math.max(now, T0 + EVENT_TIMING.first) + gap(g) * 0.5;
  if (E.list.some(e => !e.on)) return;   // schon eins angekündigt
  if (now < E.nextAt - maxWarn(g)) return;
  // Art nach Gewicht, nur Arten mit gültigem Ort
  const cand = EVENT_ORDER.filter(k => place(g, k));
  let sum = 0; for (const k of cand) sum += EVENTS[k].w;
  let r = rnd(g, 2, 2) * sum, kind = cand[0];
  for (const k of cand) { if (r < EVENTS[k].w) { kind = k; break; } r -= EVENTS[k].w; }
  const at = Math.max(E.nextAt, now + 1), e = kind ? makeEvent(g, kind, at) : null;
  E.nextAt = (e ? e.end : now) + gap(g);
}
function startEvent(g, e) {
  const D = EVENTS[e.kind], st = g.state;
  e.on = true;
  if (D.dmg && !e.soft && st.evMode !== 'sanft') e.dmg = damage(g, e, D.dmg);
  if (D.drift) spawnDrift(g, e, D.drift);
  if (D.visit) extraVisit(g, 'hafen');
  evNews(g, e, { type: 'evStart', kind: e.kind, isl: e.isl, name: e.isl != null ? islName(g, e.isl) : null, dmg: e.dmg || 0 });
  g.evVer = (g.evVer || 0) + 1;
}
function endEvent(g, e) {
  e.on = false; e.done = true;
  if (EVENTS[e.kind].drift) { const n = g.state.jet.length; g.state.jet = g.state.jet.filter(j => j.ev !== e.id); if (g.state.jet.length !== n) g.jetVer++; }
  evNews(g, e, { type: 'evEnd', kind: e.kind, isl: e.isl, name: e.isl != null ? islName(g, e.isl) : null });
}
// Vulkan: jedes Gebäude der Insel im Umkreis von D.r Feldern um Lava wird mit D.chance beschädigt
function damage(g, e, D) {
  const W = g.W;
  let n = 0;
  for (const b of g.blds.values()) {
    if (b.isl !== e.isl || b.dmg || !canDamage(b.t)) continue;
    const w = BD[b.t].w, h = BD[b.t].h;
    let near = false;
    for (let y = b.y - D.r; y < b.y + h + D.r && !near; y++) for (let x = b.x - D.r; x < b.x + w + D.r; x++) if (W.gr(x, y) === G_LAVA) { near = true; break; }
    if (!near || hash2(b.id, e.id, g.state.seed + 4243) >= D.chance) continue;
    b.dmg = true; n++;
  }
  if (n) g.topoVer++;
  return n;
}
// Treibgutfeld: n Kisten auf offenem Meer um (e.x, e.y), Inhalt wie Treibgut im Ring
function spawnDrift(g, e, [a, b]) {
  const st = g.state, W = g.W, n = a + Math.floor(rnd(g, 3, 3) * (b - a + 1)), T = FIND_LOOT.drift[Math.min(FIND_LOOT.drift.length - 1, W.ringAt(e.x, e.y))];
  let made = 0;
  for (let i = 0; i < 80 && made < n; i++) {
    const x = e.x + Math.round((rnd(g, 100 + i, 5) - 0.5) * 2 * e.r), y = e.y + Math.round((rnd(g, 200 + i, 6) - 0.5) * 2 * e.r);
    if (W.gr(x, y) !== G_WATER || !W.ocean(x, y) || st.jet.some(j => Math.abs(j.x - x) < 2 && Math.abs(j.y - y) < 2)) continue;
    const it = T.items[Math.floor(rnd(g, 300 + i, 7) * T.items.length)], cnt = T.min + Math.floor(rnd(g, 400 + i, 8) * (T.max - T.min + 1));
    st.jet.push({ id: st.nextId++, x, y, items: [{ it, n: cnt }], exp: e.end, lock: null, ev: e.id });
    made++;
  }
  g.jetVer++;
}
// Debug: Ereignis sofort starten (warn = erst ankündigen)
export function debugEvent(g, kind, warn) {
  const now = g.state.time, e = makeEvent(g, kind, now + (warn ? warnTime(g) : 0), true);
  if (!e) { g.events.push({ type: 'fail', msg: `Ereignis ${kind}: unbekannt oder kein passender Ort.` }); return; }
  e.dbg = true;
  if (!warn) startEvent(g, e);
}
// Einstellung ändern
export function setEvMode(g, m) {
  if (m !== 'aus' && m !== 'sanft' && m !== 'normal') return;
  g.state.evMode = m;
  if (m !== 'aus' && g.state.ev.nextAt == null) g.state.ev.nextAt = null;
}
