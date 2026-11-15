/* =========================================================
   GETRENNTE INSELN: WAS EIN SPIELER SIEHT (Snapshots des Hosts und der Mitspieler)
   Ein Snapshot enthält nichts aus dem Nebel des Empfängers:
     - Gebäude: eigene ganz, fremde nur, wenn ihr Mittelfeld aufgedeckt ist, und ohne Lager, Puffer und Einstellungen (PRIVATE);
       fremde Handelskontore mit Preisliste zusätzlich mit av (verfügbar je Verkaufszeile) und room (Ankauf je Zeile)
     - Schiffe und Händler: eigene immer, fremde nur auf aufgedeckten Feldern, fremde Schiffe nur Name, Besitzer, Lage, Status
     - Inseln: eigene mit Inventar; fremde nur Name und Flagge, wenn entdeckt (Heimatinseln der Partner immer)
     - Statistik, Soll-Raten, Bevölkerung, Handelsaufträge, Händler-Termine: nur eigene Inseln
     - Ereignisse: angekündigte erst mit der eigenen Vorwarnzeit, sonst nur, wenn der Spieler Empfänger ist (e.vis)
     - Treibgut, Funde, Bäume, Rohre und Rohrnetze nur auf aufgedeckten Feldern (Baum- und Rohr-Chunks maskiert)
     - Spielerliste ohne Spielstand; dazu Startplätze, Leuchtturm-Phasen aller (lh), Erlaubnis-Anfragen (perms)
   Im Einzelspiel und bei „Gemeinsame Insel“ gilt nichts davon (sep = false).
   Kein DOM-Zugriff.
   ========================================================= */
import { BD } from '../data/buildings.js';
import { CS, CS2, ckx, cky, tkx, tky } from '../util/tiles.js';
import { isSep, pst, ownerOf, islOwner, homeAt, seatedPids, islName } from './state.js';
import { portById, kontorLabel } from './kontor.js';

// Felder fremder Gebäude, die der Spieler nicht sieht
const PRIVATE = new Set(['buf', 'out', 'inv', 'fi', 'fo', 'fuel', 'lt', 'plans', 'prog', 'acc', 'bq', 'bk', 'bo', 'tm', 'ga', 'dw', 'dm', 'so', 'ex', 'q', 'ln', 'dr', 'used', 'full', 'sup']);
export const sees = (fog, x, y) => !!fog.get(Math.floor(x), Math.floor(y));
export function bldSeen(b, pid, fog) {
  if (ownerOf(b) === pid) return true;
  const D = BD[b.t];
  return sees(fog, b.x + (D.w >> 1), b.y + (D.h >> 1));
}
// Datensatz r (snapshot.record) eines Gebäudes für pid
export function bldFor(b, r, pid) {
  if (ownerOf(b) === pid) return r;
  const o = {};
  for (const k in r) if (!PRIVATE.has(k)) o[k] = r[k];
  if (b.t === 'handelskontor' && b.pl) {
    const inv = b.inv || {};
    o.av = b.pl.sell.map(e => Math.max(0, Math.floor(inv[e.it] || 0) - e.keep));
    o.room = b.pl.buy.map(e => Math.max(0, e.upto - Math.floor(inv[e.it] || 0)));
  }
  return o;
}
export const shipSeen = (s, pid, fog) => ownerOf(s) === pid || sees(fog, s.x, s.y);
const SHIP_PUBLIC = ['id', 'n', 'kind', 'owner', 'name', 'x', 'y', 'fl', 'st', 'dest', 'wp', 'home', '_pv'];
export function shipFor(s, pid) {
  if (ownerOf(s) === pid) return s;
  const o = { cargo: [], route: null, path: null };
  for (const k of SHIP_PUBLIC) if (k in s) o[k] = s[k];
  return o;
}
// Inseldaten für pid
export function islFor(g, pid) {
  const out = {}, P = pst(g, pid);
  for (const k in g.state.isl) {
    const d = g.state.isl[k], o = islOwner(g, +k);
    if (o === pid) out[k] = d;
    else if (P.found[k] || homeAt(g, +k)) { const e = { inv: {} }; if (d.name) e.name = d.name; if (d.flag) e.flag = d.flag; out[k] = e; }
  }
  return out;
}
export const ownIsl = (g, k, pid) => islOwner(g, +k) === pid;
// Objekt je Insel-ID auf die eigenen Inseln beschränken
export function ownKeys(g, obj, pid) { const o = {}; for (const k in obj) if (ownIsl(g, k, pid)) o[k] = obj[k]; return o; }
export const flowFor = (g, pid) => ({ isl: ownKeys(g, g.state.flow.isl, pid) });
export const rtFor = (g, pid) => ({ popSup: ownKeys(g, g.RT.popSup, pid), popAll: ownKeys(g, g.RT.popAll, pid) });
export function evFor2(g, pid) {
  const E = g.state.ev;
  return { nextAt: null, n: E.n, list: E.list.filter(e => (e.warned && e.warned[pid]) || (e.on && (e.x == null || (e.vis && e.vis.includes(pid))))) };
}
export function tradeFor(g, pid, fog) {
  const T = g.state.trade, due = {};
  for (const K in T.due) if (ownIsl(g, K.split(':')[1], pid)) due[K] = T.due[K];
  return { due, list: T.list.filter(t => ownIsl(g, t.isl, pid) || sees(fog, t.x, t.y)).map(t => ({ id: t.id, kind: t.kind, isl: t.isl, post: t.post, x: t.x, y: t.y, fl: t.fl, st: t.st, tm: t.tm, offer: ownIsl(g, t.isl, pid) ? t.offer : null })) };
}
export const jetFor = (g, fog) => g.state.jet.filter(j => sees(fog, j.x, j.y));
export function lootFor(g, fog) { const o = {}, L = g.state.loot; for (const k in L) if (fog.get(tkx(+k), tky(+k))) o[k] = L[k]; return o; }
// Spielerliste ohne Spielstand (st)
export function playersFor(g) { const o = {}, P = g.state.players; for (const id in P) { const p = P[id]; o[id] = { name: p.name, color: p.color, opts: p.opts }; } return o; }
// Leuchtturm-Phasen aller Spieler: { pid: ph (0–4) }
export function lighthouses(g) { const o = {}; for (const p of seatedPids(g)) { const w = pst(g, p).wonder; o[p] = { ph: w ? w.ph | 0 : 0, done: !!(w && w.doneAt != null) }; } return o; }
// Erlaubnis-Anfragen und erlaubte Routen an Kontore von pid
export function permsFor(g, pid) {
  const ask = [], ok = [];
  for (const s of g.state.ships) {
    const perm = s.route && s.route.perm;
    if (!perm) continue;
    for (const kid in perm) {
      const P = portById(g, kid), q = perm[kid];
      if (!P || ownerOf(P) !== pid || q.st === 'no') continue;
      const stops = s.route.stops.map(st => { const K = portById(g, st.kontor); return K ? kontorLabel(g, K, islName(g, K.isl, pid)) : '?'; });
      const orders = s.route.stops.filter(st => st.kontor === +kid).map(st => ({ load: st.load, unload: st.unload }));
      (q.st === 'ask' ? ask : ok).push({ ship: s.id, name: s.name, owner: ownerOf(s), kontor: +kid, stops, orders });
    }
  }
  return { ask, ok };
}
// Zusatzteile für Getrennte Inseln
export const sepTop = (g, pid) => ({ homes: g.state.homes, wfirst: g.state.wfirst || null, lh: lighthouses(g), perms: permsFor(g, pid) });
// Baum-Chunk maskiert: unaufgedeckte Felder mit dem Wert der Startwelt
export function maskTrees(g, fog, key, a) {
  const t0 = g.W.chunk(ckx(key), cky(key)).tree0, c = new Float32Array(CS2), f = fog.m.get(key);
  for (let i = 0; i < CS2; i++) c[i] = f && (f[i >> 3] >> (i & 7)) & 1 ? a[i] : t0[i];
  return c;
}
// Rohr-Chunk maskiert: unaufgedeckte Felder leer
export function maskPipes(fog, key, a) {
  const c = new Uint8Array(CS2), f = fog.m.get(key);
  if (f) for (let i = 0; i < CS2; i++) if ((f[i >> 3] >> (i & 7)) & 1) c[i] = a[i];
  return c;
}
// Baum-Änderung (Schlüssel key·CS2 + Index) auf aufgedecktem Feld?
export function treeSeen(fog, k) { const key = Math.floor(k / CS2), i = k - key * CS2, f = fog.m.get(key); return !!f && ((f[i >> 3] >> (i & 7)) & 1) === 1; }
export const netSeen = (fog, rep) => !!fog.get(tkx(rep), tky(rep));
