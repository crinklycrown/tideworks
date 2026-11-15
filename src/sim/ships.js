/* =========================================================
   SCHIFFFAHRT: Wegfindung (A*), Laderäume, Handelsrouten, Steuerung, Funde, Kontor gründen
   Pfade sind Listen von Kachel-Schlüsseln über Meeresfelder (8 Richtungen).
   Die Suche bleibt in einem Rechteck um Start und Ziel (+SHIP_SEARCH_MARGIN) und bricht nach
   SHIP_SEARCH_MAX untersuchten Feldern ab. Ohne Weg wartet das Schiff (s.np = „Kein Seeweg gefunden“).
   Fahrende Schiffe decken den Nebel um sich herum auf und sammeln Funde in 1 Feld Abstand ein
   (mit pick = false nur den Fund, zu dem sie per Rechtsklick geschickt wurden).
   Über Bord geworfene Ladung (jettison) treibt als eigenes Treibgut in state.jet und verschwindet nach JETTISON_TTL.
   Schiffsarten (Frachtschiff, Entdecker) in data/ships.js; Laderäume, Laderaum-Größe und Tempo je Art mit Upgrades (holdsOf, holdCapOf, speedOf in sim/mods.js).
   Selbst erkunden (auto): fährt zum Rand des Nebels mit der kleinsten Wertung Abstand zum Schiff + 2 × Abstand zur Heimatinsel,
   in einem wachsenden Kreis um die Heimatinsel, nie über die Reichweite s.xr (nah/mittel/weit, EXPLORE in data/ships.js).
   Ist alles erkundet, fährt es zum Hauptkontor der Heimatinsel und meldet „Umgebung erkundet“. Manuelles Steuern und Routen schalten es ab.
   Häfen sind Kontore mit Anleger (Hauptkontor, altes Kontor, Handelskontor; sim/kontor.js), Stopps verweisen auf ihre Gebäude-ID.

   Schiff: { id, n, name, kind, home, x, y, cargo: [{it, n} | null] × Laderäume, pick (Funde einsammeln, Standard true), auto (selbst erkunden),
             xr (Reichweite beim Erkunden), xs (aktueller Suchradius),
             st: 'idle'|'sail'|'dock'|'wait', dest: 'route'|'man'|'auto'|'', mt (manuelles Ziel, Kachel),
             route: { stops: [{ kontor (Gebäude-ID), load: [{it, mode, n}], unload: [{it|'*', mode, n}], wait }], idx, paused } | null,
             path, pi, f, fl, np, tm (Anlegen), wt (Warten), rt (neuer Wegversuch), _pv (Pfad-Version) }
   Laden-Modi: all (so viel wie möglich), upto (bis n an Bord), keep (nur, was über n im Kontor liegt).
   Entladen-Modi: all (alles), keep (n bleiben an Bord). it = '*' heißt alle Waren an Bord.
   Getrennte Inseln: Schiffe gehören ihrem Besitzer (owner); Upgrades, Nebel, Heimatinsel und Funde zählen für ihn.
   Ein Stopp darf das Hauptkontor eines Partners sein: Der Besitzer muss die Route erlauben (route.perm[Kontor-ID] =
   { sig (Aufträge an diesem Kontor), st: 'ask'|'ok'|'no' }); bis dahin überspringt das Schiff den Stopp (s.wp = wer fehlt).
   Ändern sich Stopps oder Aufträge an diesem Kontor, wird neu gefragt. An fremden Handelskontoren handelt es nach deren
   Preisliste (sim/ptrade.js). Ware, die ein Laderaum von einem Partner geladen hat, trägt dessen pid (h.fr) für die Statistik.
   Kein DOM-Zugriff; die Abfragen (portOf, foundInfo …) nutzt auch die Oberfläche auf dem Spiegel.
   ========================================================= */
import { SHIP_SEARCH_MARGIN, SHIP_SEARCH_MAX, SHIP_DOCK_TIME, SHIP_WAIT_MAX, SHIP_RETRY,
  PORT_RANGE, FOUND_COST, FOUND_RANGE, JETTISON_TTL } from '../config.js';
import { HQ } from '../data/buildings.js';
import { SHIP_KINDS, shipKind, EXPLORE } from '../data/ships.js';
import { ITEMS } from '../data/items.js';
import { FIND_NAME } from '../data/finds.js';
import { tk, tkx, tky, ck, ckx, cky, CS, HOME_ISL } from '../util/tiles.js';
import { kontorOf, ownerOf, isSep, fogOf, homeIsl, actor, playerName, mine, isUnlocked, pst } from './state.js';
import { lockReason } from '../data/unlocks.js';
import { ownWhy } from './buildings.js';
import { isPartnerShop, buyFrom, sellTo } from './ptrade.js';
import { npcSellFrom, npcBuyTo, npcStock, npcAsks, npcWhy, npcKnown, npcWants, npcTrades, goneWhy } from './npc.js';
import { npcName } from '../data/npcs.js';
import { stockOf, stockRead, storeCap, portById, stegSpot, kontorSpots } from './kontor.js';
import { flowAdd } from './stats.js';
import { reveal } from './explore.js';
import { findsNear, lootLeft } from '../world/finds.js';
import { holdsOf, holdCapOf, speedOf, mods } from './mods.js';
import { evShip } from './events.js';
import { coinAdd } from './coins.js';
import { WRECK_COINS } from '../data/trade.js';
import { hash2 } from '../util/math.js';

const SQ2 = Math.SQRT2;
const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];
export const MAX_STOPS = 50, MAX_ORDERS = 12, NAME_LEN = 24;

// Binärer Min-Heap über (f, Index)
class Heap {
  constructor() { this.f = []; this.v = []; }
  get size() { return this.v.length; }
  push(f, v) {
    const F = this.f, V = this.v; let i = V.length; F.push(f); V.push(v);
    while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= f) break; F[i] = F[p]; V[i] = V[p]; i = p; }
    F[i] = f; V[i] = v;
  }
  pop() {
    const F = this.f, V = this.v, top = V[0], lf = F.pop(), lv = V.pop(), n = V.length;
    if (n) {
      let i = 0;
      for (;;) { let c = 2 * i + 1; if (c >= n) break; if (c + 1 < n && F[c + 1] < F[c]) c++; if (F[c] >= lf) break; F[i] = F[c]; V[i] = V[c]; i = c; }
      F[i] = lf; V[i] = lv;
    }
    return top;
  }
}
const octile = (dx, dy) => { dx = Math.abs(dx); dy = Math.abs(dy); return Math.max(dx, dy) + (SQ2 - 1) * Math.min(dx, dy); };

// A* von s nach goal (Kachel-Schlüssel); null, wenn kein Weg gefunden wurde.
// partial: Reicht die Suche nicht bis zum Ziel (sehr weite Fahrten, Ziel hinter einer großen Insel), führt der Weg zum Feld,
// das dem Ziel am nächsten kam (gesteuerte Schiffe fahren so schon einmal in die Richtung; ein weiterer Klick fährt weiter).
export function seaPath(g, s, goal, partial) {
  const W = g.W;
  if (s == null || goal == null) return null;
  if (s === goal) return [s];
  const sx = tkx(s), sy = tky(s), gx = tkx(goal), gy = tky(goal), M = SHIP_SEARCH_MARGIN;
  const x0 = Math.min(sx, gx) - M, y0 = Math.min(sy, gy) - M, x1 = Math.max(sx, gx) + M, y1 = Math.max(sy, gy) + M, w = x1 - x0 + 1;
  const L = (x, y) => (y - y0) * w + (x - x0);
  const gs = new Map(), prev = new Map(), closed = new Set(), open = new Heap();
  const start = L(sx, sy), end = L(gx, gy);
  gs.set(start, 0); prev.set(start, -1); open.push(octile(gx - sx, gy - sy), start);
  let n = 0, best = start, bh = Infinity;
  const walk = (c) => { const path = []; for (let k = c; k >= 0; k = prev.get(k)) path.push(tk(x0 + k % w, y0 + Math.floor(k / w))); return path.reverse(); };
  while (open.size) {
    const c = open.pop();
    if (closed.has(c)) continue;
    if (c === end) return walk(c);
    closed.add(c);
    const cx = x0 + c % w, cy = y0 + Math.floor(c / w), gc = gs.get(c);
    if (partial) { const h = octile(gx - cx, gy - cy); if (h < bh) { bh = h; best = c; } }
    if (++n > SHIP_SEARCH_MAX) break;
    for (const [dx, dy, cost] of D8) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < x0 || ny < y0 || nx > x1 || ny > y1) continue;
      const nl = L(nx, ny);
      if (closed.has(nl) || !W.ocean(nx, ny)) continue;
      if (dx && dy && (!W.ocean(nx, cy) || !W.ocean(cx, ny))) continue;
      const ng = gc + cost, old = gs.get(nl);
      if (old !== undefined && old <= ng) continue;
      gs.set(nl, ng); prev.set(nl, c);
      open.push(ng + octile(gx - nx, gy - ny), nl);
    }
  }
  return partial && best !== start ? walk(best) : null;
}
// Anleger eines Kontors (Gebäude-ID) als Kachel-Schlüssel oder null
const dockOf = (g, id) => { const b = portById(g, id); return b && b._dock != null ? b._dock : null; };
function dockPath(g, from, to) {
  const key = from + '-' + to;
  if (!g.shipPathCache.has(key)) g.shipPathCache.set(key, seaPath(g, dockOf(g, from), dockOf(g, to)));
  return g.shipPathCache.get(key);
}
// Nächstes Meeresfeld zur Schiffsposition
function shipTile(g, s) {
  const W = g.W, x = Math.floor(s.x), y = Math.floor(s.y);
  if (W.ocean(x, y)) return tk(x, y);
  for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (W.ocean(x + dx, y + dy)) return tk(x + dx, y + dy);
  return tk(x, y);
}
function setShipPos(s) {
  const p = s.path;
  if (!p || !p.length) return;
  const a = p[Math.min(s.pi, p.length - 1)], b = p[Math.min(s.pi + 1, p.length - 1)];
  const ax = tkx(a), ay = tky(a), bx = tkx(b), by = tky(b);
  s.x = ax + (bx - ax) * s.f + 0.5; s.y = ay + (by - ay) * s.f + 0.5;
  if (bx !== ax) s.fl = bx < ax;
}

/* ---------- Laderäume: je Raum genau eine Warenart, bis holdCapOf(g, s) ---------- */
export const emptyHolds = (g, s) => Array(holdsOf(g, s)).fill(null);
// Laderäume aller Schiffe an die Upgrades anpassen (neue Räume kommen leer dazu)
export function fitHolds(g, pid) {
  for (const s of g.state.ships) {
    if (pid != null && ownerOf(s) !== pid) continue; const n = holdsOf(g, s); if (!Array.isArray(s.cargo)) s.cargo = []; while (s.cargo.length < n) s.cargo.push(null); }
}
export function cargoOf(s, it) { let n = 0; for (const h of s.cargo) if (h && h.it === it) n += h.n; return n; }
// Platz für Ware it: Rest der Räume mit derselben Ware plus leere Räume
export function holdRoom(g, s, it) { const cap = holdCapOf(g, s); let r = 0; for (const h of s.cargo) r += !h ? cap : h.it === it ? Math.max(0, cap - h.n) : 0; return r; }
export const cargoItems = (s) => [...new Set(s.cargo.filter(Boolean).map(h => h.it))];
// Laden: erst Räume mit derselben Ware auffüllen, dann leere Räume. Liefert die geladene Menge.
export function addCargo(g, s, it, n) {
  const cap = holdCapOf(g, s);
  let left = Math.max(0, Math.floor(n));
  for (const h of s.cargo) if (left > 0 && h && h.it === it) { const a = Math.max(0, Math.min(left, cap - h.n)); h.n += a; left -= a; }
  for (let i = 0; i < s.cargo.length && left > 0; i++) if (!s.cargo[i]) { const a = Math.min(left, cap); s.cargo[i] = { it, n: a }; left -= a; }
  return Math.floor(n) - left;
}
// Entnehmen: zuerst aus den leersten Räumen (volle Räume bleiben voll). Liefert die entnommene Menge.
export function takeCargo(s, it, n) {
  let left = Math.max(0, Math.floor(n));
  const idx = s.cargo.map((h, i) => i).filter(i => s.cargo[i] && s.cargo[i].it === it).sort((a, b) => s.cargo[a].n - s.cargo[b].n);
  for (const i of idx) {
    if (!left) break;
    const h = s.cargo[i], a = Math.min(left, h.n);
    h.n -= a; left -= a;
    if (h.n <= 0) s.cargo[i] = null;
  }
  return Math.floor(n) - left;
}

/* ---------- Abfragen (auch für die Oberfläche) ---------- */
// Kontor, an dessen Anleger das Schiff liegt (höchstens PORT_RANGE Felder entfernt; das nächste), sonst null
export function portOf(g, s) {
  const x = Math.floor(s.x), y = Math.floor(s.y);
  let best = null, bd = 99;
  for (const b of g.blds.values()) {
    if (b._dock == null || b.t === 'werft') continue;
    const d = Math.max(Math.abs(tkx(b._dock) - x), Math.abs(tky(b._dock) - y));
    if (d <= PORT_RANGE && (d < bd || (d === bd && HQ.has(b.t)))) { bd = d; best = b; }
  }
  return best;
}
// Nächstes Landfeld höchstens PORT_RANGE Felder vom Schiff: { isl, x, y } oder null
export function coastNear(g, s) {
  const W = g.W, x0 = Math.floor(s.x), y0 = Math.floor(s.y);
  let best = null, bd = 1e9;
  for (let dy = -PORT_RANGE; dy <= PORT_RANGE; dy++) for (let dx = -PORT_RANGE; dx <= PORT_RANGE; dx++) {
    const k = W.il(x0 + dx, y0 + dy), d = dx * dx + dy * dy;
    if (k >= 0 && d < bd) { bd = d; best = { isl: k, x: x0 + dx, y: y0 + dy }; }
  }
  return best;
}
// Darf auf (x, y) mit Steg zur Seite d ein Hauptkontor der Insel isl stehen? Liefert '' oder den Grund.
export function kontorSpotReason(g, isl, x, y, d, opt) {
  const r = stegSpot(g, 'kontor', isl, x, y, d, opt);
  return r.ok ? '' : r.reason;
}
// Kontor gründen möglich? null = keine Insel ohne Kontor in Reichweite, sonst
// { isl, reason ('' = möglich), spots: gültige Plätze [{ x, y, dirs: [{ d, sl, dock }] }] (nur mit withSpots), best }
export function foundInfo(g, s, withSpots) {
  const c = coastNear(g, s);
  if (!c || kontorOf(g, c.isl)) return null;
  const r = { isl: c.isl, anchor: c, reason: '', spots: [], best: null };
  const why = ownWhy(g, c.isl, ownerOf(s));   // Getrennte Inseln: Startplatz eines Mitspielers
  if (why) { r.reason = why.replace(/\.$/, ''); return r; }
  // Kontor gründen ist eine Freischaltung (Ole, data/unlocks.js 'gruenden')
  if (!isUnlocked(g, 'gruenden', ownerOf(s))) { r.reason = `Kontor gründen: ${lockReason('gruenden').replace(/\.$/, '')}`; r.locked = true; return r; }
  const wood = cargoOf(s, 'holz');
  if (wood < FOUND_COST.holz) r.reason = `Es fehlen ${FOUND_COST.holz - wood} Holz an Bord`;
  else if (s.st === 'sail') r.reason = 'Das Schiff fährt noch';
  if (!withSpots && r.reason) return r;
  let bd = 1e9;
  for (const p of kontorSpots(g, c.isl, c.x, c.y, FOUND_RANGE)) {
    const d = Math.hypot(p.x + 1.5 - s.x, p.y + 1.5 - s.y);
    r.spots.push(p);
    if (d < bd) { bd = d; r.best = p; }
  }
  if (!r.spots.length && !r.reason) r.reason = 'Kein freier Platz 1–2 Felder von der Küste in der Nähe';
  return r;
}
export const routeOn = (s) => !!(s.route && !s.route.paused && s.route.stops.length >= 2);

/* ---------- Erlaubnis für Stopps an fremden Hauptkontoren (Getrennte Inseln) ---------- */
export const needPerm = (g, s, P) => isSep(g) && !!P && HQ.has(P.t) && ownerOf(P) !== ownerOf(s);
// Aufträge der Route an Kontor kid (ändern sie sich, wird neu gefragt)
export const permSig = (route, kid) => JSON.stringify(route.stops.filter(st => st.kontor === kid).map(st => [st.load, st.unload]));
export const permOf = (s, kid) => (s.route && s.route.perm && s.route.perm[kid]) || null;
function stopOk(g, s, stop) {
  const P = stop ? portById(g, stop.kontor) : null;
  if (!needPerm(g, s, P)) return true;
  const q = permOf(s, P.id);
  return !!q && q.st === 'ok';
}
// pid des Partners, dessen Erlaubnis noch fehlt (oder null)
function permWait(g, s) {
  const r = s.route;
  if (!r || !r.perm) return null;
  for (const st of r.stops) { const P = portById(g, st.kontor); if (needPerm(g, s, P) && !stopOk(g, s, st)) return ownerOf(P); }
  return null;
}
const setWait = (s, pid) => { if (pid) s.wp = pid; else delete s.wp; };
// Nach dem Speichern der Route: Erlaubnis je fremdem Hauptkontor behalten (gleiche Aufträge) oder neu anfragen
function refreshPerms(g, s) {
  const r = s.route;
  if (!r) return;
  const old = r.perm || {}, perm = {};
  for (const st of r.stops) {
    const P = portById(g, st.kontor);
    if (!needPerm(g, s, P) || perm[P.id]) continue;
    const sig = permSig(r, P.id), o = old[P.id];
    if (o && o.sig === sig) { perm[P.id] = o; continue; }
    perm[P.id] = { sig, st: 'ask' };
    g.events.push({ type: 'permAsk', to: [ownerOf(P)], ship: s.id, name: s.name, from: ownerOf(s), kontor: P.id });
  }
  if (Object.keys(perm).length) r.perm = perm; else delete r.perm;
}
// Kommando 'perm': der Besitzer des Kontors erlaubt (ok), lehnt ab oder widerruft (ok = false)
export function setPerm(g, s, kid, ok) {
  const q = permOf(s, kid), P = portById(g, kid);
  if (!q || !P || ownerOf(P) !== actor(g)) return;
  const st = ok ? 'ok' : 'no';
  if (q.st === st) return;
  const was = q.st;
  q.st = st;
  g.events.push({ type: 'permAns', to: [ownerOf(s)], ship: s.id, name: s.name, by: ownerOf(P), ok: !!ok, revoked: was === 'ok' });
  if (routeOn(s) && (s.wi || s.st === 'idle' || (!ok && s.dest === 'route' && s.st === 'sail' && s.route.stops[s.route.idx].kontor === kid))) sailToStop(g, s, null);
  else setWait(s, permWait(g, s));
}

/* ---------- Fahren ---------- */
function setPath(g, s, path) {
  s.path = path; s.pi = 0; s.f = 0; s.np = !path; s.rt = SHIP_RETRY;
  s._pv = (s._pv || 0) + 1;
  s.st = path ? 'sail' : 'idle';
  return !!path;
}
// Zum aktuellen Stopp der Route fahren; from = Kontor (ID), an dessen Anleger das Schiff gerade liegt (Pfad aus dem Cache)
function sailToStop(g, s, from) {
  const r = s.route;
  s.dest = 'route';
  if (s.wi) delete s.wi;
  // Getrennte Inseln: Stopps an fremden Hauptkontoren ohne Erlaubnis überspringen; erlaubt keiner, wartet das Schiff
  setWait(s, permWait(g, s));
  if (s.wp) {
    let n = 0;
    while (n < r.stops.length && !stopOk(g, s, r.stops[r.idx])) { r.idx = (r.idx + 1) % r.stops.length; n++; }
    if (n >= r.stops.length) { s.path = null; s._pv = (s._pv || 0) + 1; s.np = false; s.st = 'idle'; s.wi = true; s.rt = SHIP_RETRY; return; }
  }
  const stop = r.stops[r.idx];
  const dock = stop ? dockOf(g, stop.kontor) : null;
  if (dock == null) { setPath(g, s, null); return; }
  if (from === stop.kontor) { s.path = null; s._pv = (s._pv || 0) + 1; s.np = false; s.st = 'dock'; s.tm = SHIP_DOCK_TIME; return; }
  setPath(g, s, from != null && dockOf(g, from) != null ? dockPath(g, from, stop.kontor) : seaPath(g, shipTile(g, s), dock));
}
function nextStop(g, s, from) {
  const r = s.route;
  r.idx = (r.idx + 1) % r.stops.length;
  sailToStop(g, s, from);
}
// Route (neu) starten: ab Stopp idx, von der aktuellen Position
export function startRoute(g, s) {
  if (!routeOn(s)) { if (s.dest === 'route') { s.st = 'idle'; s.dest = ''; s.path = null; s._pv = (s._pv || 0) + 1; } return; }
  sailToStop(g, s, null);
}
// Ziel eines Rechtsklicks: Wasser = dieses Feld, Land = erstes Meeresfeld auf der Linie vom Klick zum Schiff
function seaTarget(g, s, x, y) {
  const W = g.W;
  if (W.ocean(x, y)) return tk(x, y);
  const dx = s.x - (x + 0.5), dy = s.y - (y + 0.5), n = Math.ceil(Math.hypot(dx, dy) * 2);
  for (let i = 1; i <= n; i++) { const px = Math.floor(x + 0.5 + dx * i / n), py = Math.floor(y + 0.5 + dy * i / n); if (W.ocean(px, py)) return tk(px, py); }
  return null;
}
// Manuell steuern: pausiert die Route. Liefert false, wenn es keinen Seeweg gibt (Ereignis „fail“).
const MG_LEGS = 6;
export function shipGoto(g, s, x, y) {
  const t = seaTarget(g, s, x, y), path = t != null ? seaPath(g, shipTile(g, s), t, true) : null;
  if (!path) { g.events.push({ type: 'fail', msg: 'Kein Seeweg gefunden.' }); return false; }
  if (s.route) s.route.paused = true;
  setPath(g, s, path);
  // Ziel zu weit für eine Suche: erst bis zum nächsten erreichten Feld, dort weiter (s.mg = eigentliches Ziel, höchstens MG_LEGS Etappen)
  const part = path[path.length - 1] !== t;
  s.dest = 'man'; s.mt = part ? path[path.length - 1] : t; s.auto = false;
  s.mg = part ? t : null; s.mgn = part ? (s.mgn || 0) + 1 : 0;
  g.events.push({ type: 'shipGoto', id: s.id, x: tkx(t), y: tky(t) });
  return true;
}
// Nach dem Laden eines Spielstands: Pfade neu berechnen
export function resumeShip(g, s) {
  s.path = null;
  if (s.st !== 'sail') return;
  if (s.dest === 'man' && s.mt != null) { if (!setPath(g, s, seaPath(g, shipTile(g, s), s.mt))) s.dest = ''; }
  else if (routeOn(s)) sailToStop(g, s, null);
  else { s.st = 'idle'; s.dest = ''; }
}

/* ---------- Selbst erkunden ---------- */
// Heimatpunkt: Mitte der Heimatinsel. Reichweite: s.xr (nah/mittel/weit), Suchradius s.xs wächst bis dahin.
// Getrennte Inseln: Heimatinsel des Schiffsbesitzers
export function homePoint(g, s) { const I = g.W.island(s ? homeIsl(g, ownerOf(s)) : HOME_ISL); return I ? { x: I.x0 + I.w / 2, y: I.y0 + I.h / 2 } : { x: 0, y: 0 }; }
export const exploreLimit = (s) => EXPLORE.ranges[s.xr] || EXPLORE.ranges[EXPLORE.def];
// Ränder des Nebels: aufgedeckte Meeresfelder mit unerkundetem Nachbarn, höchstens R vom Heimatpunkt H.
// Halb aufgedeckte Chunks werden ganz geprüft, ganz aufgedeckte nur an Kanten zu nicht ganz aufgedeckten Nachbarn.
export function fogEdges(g, H, R, fog) {
  fog = fog || g.fog;
  const W = g.W, out = [], R2 = R * R;
  const test = (x, y) => {
    const dx = x + 0.5 - H.x, dy = y + 0.5 - H.y;
    if (dx * dx + dy * dy > R2 || !fog.get(x, y) || !W.ocean(x, y)) return;
    if (!fog.get(x + 1, y) || !fog.get(x - 1, y) || !fog.get(x, y + 1) || !fog.get(x, y - 1)) out.push(tk(x, y));
  };
  for (const key of fog.m.keys()) {
    const cx = ckx(key), cy = cky(key), x0 = cx * CS, y0 = cy * CS;
    const nx = Math.max(x0, Math.min(H.x, x0 + CS)), ny = Math.max(y0, Math.min(H.y, y0 + CS));
    if ((nx - H.x) ** 2 + (ny - H.y) ** 2 > R2) continue;
    const cov = fog.coverage(key);
    if (cov === 0) continue;
    if (cov === 1) { for (let y = y0; y < y0 + CS; y++) for (let x = x0; x < x0 + CS; x++) test(x, y); continue; }
    if (fog.coverage(ck(cx + 1, cy)) !== 2) for (let y = y0; y < y0 + CS; y++) test(x0 + CS - 1, y);
    if (fog.coverage(ck(cx - 1, cy)) !== 2) for (let y = y0; y < y0 + CS; y++) test(x0, y);
    if (fog.coverage(ck(cx, cy + 1)) !== 2) for (let x = x0; x < x0 + CS; x++) test(x, y0 + CS - 1);
    if (fog.coverage(ck(cx, cy - 1)) !== 2) for (let x = x0; x < x0 + CS; x++) test(x, y0);
  }
  return out;
}
// Ränder, die sich als unerreichbar erwiesen haben (je Schiff, nur zur Laufzeit, nicht im Spielstand)
const badOf = (g, s) => { const m = g.xBad || (g.xBad = new Map()); let b = m.get(s.id); if (!b) m.set(s.id, b = new Set()); return b; };
const resetBad = (g, s) => { if (g.xBad) g.xBad.delete(s.id); };
// Weg zum besten erreichbaren Rand im Radius R (ganzer Weg innerhalb der Reichweite lim) oder null
function exploreRoute(g, s, H, R, lim, edges) {
  const start = shipTile(g, s), sx = tkx(start), sy = tky(start), bad = badOf(g, s);
  const cand = [];
  for (const k of edges) {
    if (bad.has(k)) continue;
    const x = tkx(k), y = tky(k), dh = Math.hypot(x + 0.5 - H.x, y + 0.5 - H.y);
    if (dh > R) continue;
    const ds = Math.hypot(x - sx, y - sy);
    if (ds < 2) continue;
    if (ds < EXPLORE.hop) { cand.push([ds + EXPLORE.home * dh + EXPLORE.hop * 4, k]); continue; }   // nahe Ränder hinten anstellen (data/ships.js hop)
    cand.push([ds + EXPLORE.home * dh, k]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  const lim2 = lim * lim;
  for (let i = 0, n = 0; i < cand.length && n < EXPLORE.tries; i++) {
    const k = cand[i][1];
    if (bad.has(k)) continue;
    n++;
    const path = seaPath(g, start, k);
    if (path && path.length > 1 && path.every(p => (tkx(p) + 0.5 - H.x) ** 2 + (tky(p) + 0.5 - H.y) ** 2 <= lim2)) return path;
    // unerreichbar oder Weg führt über die Reichweite hinaus: Felder ringsum nicht noch einmal versuchen
    const x = tkx(k), y = tky(k);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) bad.add(tk(x + dx, y + dy));
  }
  if (bad.size > 200000) bad.clear();
  return null;
}
// Selbst erkunden ein-/ausschalten
export function setAuto(g, s, on) {
  s.auto = !!on; s._ar = 0; s._an = 0; resetBad(g, s);
  if (!on && s.dest !== 'auto') return;
  if (on && s.route) s.route.paused = true;
  s.path = null; s._pv = (s._pv || 0) + 1; s.st = 'idle'; s.dest = ''; s.np = false;
}
// Reichweite (nah/mittel/weit) setzen; ein Schiff jenseits der neuen Grenze sucht sofort neu
export function setRange(g, s, v) {
  if (!EXPLORE.ranges[v]) return;
  s.xr = v; s._an = 0; s._ar = 0; resetBad(g, s);
  if (s.auto && s.dest === 'auto' && s.st === 'sail') { s.path = null; s._pv = (s._pv || 0) + 1; s.st = 'idle'; s.dest = ''; }
}
function tickAuto(g, s, dt) {
  if ((s._ar = (s._ar || 0) - dt) > 0) return;
  const lim = exploreLimit(s), H = homePoint(g, s), edges = fogEdges(g, H, lim, fogOf(g, ownerOf(s)));
  for (let R = Math.min(lim, s.xs || EXPLORE.start); ; R = Math.min(lim, R + EXPLORE.step)) {
    const path = exploreRoute(g, s, H, R, lim, edges);
    if (path) { s.xs = R; s._an = 0; setPath(g, s, path); s.dest = 'auto'; s.mt = null; return; }
    if (R >= lim) break;
  }
  // Alles in Reichweite erkundet: zurück zum Hauptkontor der Heimatinsel, einmal melden
  s.xs = lim; resetBad(g, s);
  s._ar = EXPLORE.homeRetry;
  if (s._an) return;
  s._an = 1;
  g.events.push({ type: 'exploreDone', id: s.id, name: s.name, pid: own(g, s) });
  const K = kontorOf(g, homeIsl(g, ownerOf(s))), dock = K ? dockOf(g, K.id) : null, path = dock != null ? seaPath(g, shipTile(g, s), dock) : null;
  if (path && path.length > 1) { setPath(g, s, path); s.dest = 'auto'; s.mt = null; }
}

/* ---------- Laden und Entladen ---------- */
// Bestand des Kontors P (Hauptkontor = Inselinventar). Abgänge/Zugänge des Inselinventars zählen in der Statistik.
// Getrennte Inseln: Lieferungen von/an Partner zählen als 'schiffe@<pid>' (Partner = Schiffsbesitzer bzw. Herkunft der Ladung)
const flowIf = (g, P, kind, it, n, from) => { if (HQ.has(P.t)) flowAdd(g, P.isl, kind, it, n, from && from !== ownerOf(P) ? 'schiffe@' + from : 'schiffe'); };
// Herkunft der Ware it an Bord (pid des Partners, bei dem geladen wurde) bzw. setzen
const cargoFrom = (s, it) => { for (const h of s.cargo) if (h && h.it === it && h.fr) return h.fr; return null; };
function markFrom(g, s, it, P) { const fr = isSep(g) && ownerOf(P) !== ownerOf(s) ? ownerOf(P) : undefined; for (const h of s.cargo) if (h && h.it === it) { if (fr) h.fr = fr; else delete h.fr; } }
// Ereignis-Empfänger eines Schiffs (Getrennte Inseln: der Besitzer)
const own = (g, s) => isSep(g) ? ownerOf(s) : undefined;
// Menge, die ein Lade-Auftrag jetzt laden würde (P = Kontor-Gebäude)
export function loadAmount(g, s, P, o) {
  const have = P.t === 'npchafen' ? npcHave(g, s, P, o.it) : Math.floor(stockRead(g, P)[o.it] || 0), on = cargoOf(s, o.it);
  const n = o.mode === 'upto' ? Math.min(have, Math.max(0, (o.n || 0) - on)) : o.mode === 'keep' ? Math.max(0, have - (o.n || 0)) : have;
  return Math.max(0, Math.min(n, holdRoom(g, s, o.it)));
}
// Lade-Auftrag erfüllt: kein Platz mehr für die Ware oder (upto) Menge erreicht
export const orderDone = (g, s, o) => holdRoom(g, s, o.it) === 0 || (o.mode === 'upto' && cargoOf(s, o.it) >= (o.n || 0));
// Am NPC-Steg: was das Schiff kaufen kann (Vorrat und Münzen beim jetzigen Preis)
function npcHave(g, s, P, it) { const p = npcAsks(g, P.npc, it); return p ? Math.min(npcStock(g, P.npc, it), Math.floor((pst(g, ownerOf(s)).coins | 0) / p)) : 0; }
function doLoad(g, s, stop, P) {
  if (P.t === 'npchafen') { for (const o of stop.load) { const n = loadAmount(g, s, P, o); if (n > 0) npcBuyTo(g, s, P.npc, o.it, n, true); } return; }
  const inv = stockOf(g, P), shop = isPartnerShop(g, P, ownerOf(s));
  for (const o of stop.load) {
    const n = loadAmount(g, s, P, o);
    if (n <= 0) continue;
    if (shop) { buyFrom(g, s, P, o.it, n); continue; }
    inv[o.it] -= n; addCargo(g, s, o.it, n); flowIf(g, P, 'c', o.it, n, ownerOf(s)); markFrom(g, s, o.it, P);
  }
}
// Ins Kontor entladen, soweit Platz ist (Rest bleibt an Bord). Liefert die entladene Menge.
function unloadTo(g, s, P, it, want) {
  if (P.t === 'npchafen') return npcSellFrom(g, s, P.npc, it, want, true, null, true);   // Route: liefern (Aufträge, Verträge) und verkaufen
  if (isPartnerShop(g, P, ownerOf(s))) return sellTo(g, s, P, it, want);
  const from = ownerOf(P) !== ownerOf(s) ? ownerOf(s) : cargoFrom(s, it);
  const inv = stockOf(g, P), n = Math.min(Math.max(0, want), Math.max(0, storeCap(g, P) - Math.floor(inv[it] || 0)), cargoOf(s, it));
  if (n <= 0) return 0;
  takeCargo(s, it, n); inv[it] = (inv[it] || 0) + n; flowIf(g, P, 'p', it, n, isSep(g) ? from : null);
  return n;
}
function doUnload(g, s, stop, P) {
  for (const o of stop.unload) for (const it of o.it === '*' ? cargoItems(s) : [o.it]) {
    const have = cargoOf(s, it);
    unloadTo(g, s, P, it, o.mode === 'keep' ? have - (o.n || 0) : have);
  }
}
// Manuell am Kontor (Anleger höchstens PORT_RANGE entfernt): n = Menge oder -1 = so viel wie möglich
// Getrennte Inseln: an fremden Handelskontoren nach Preisliste, an fremden Hauptkontoren nur über eine erlaubte Route
// NPC-Steg (Version 17): Laden = kaufen, Entladen = liefern/verkaufen (sim/npc.js), erst nach dem Entdecken
function foreignPort(g, s, P) {
  if (P.t === 'npchafen') { if (npcTrades(g, P.npc)) return false; g.events.push({ type: 'fail', msg: npcKnown(g, P.npc) ? goneWhy(g, P.npc) : `${npcName(P.npc)} kennt dich noch nicht.` }); return true; }
  if (!isSep(g) || ownerOf(P) === ownerOf(s) || isPartnerShop(g, P, ownerOf(s))) return false;
  g.events.push({ type: 'fail', msg: `Kontor von ${playerName(g, ownerOf(P))}: Laden und Entladen nur über eine erlaubte Route.` });
  return true;
}
export function manualLoad(g, s, it, n) {
  const P = portOf(g, s);
  if (!P || s.st === 'sail' || !ITEMS[it] || foreignPort(g, s, P)) return;
  if (P.t === 'npchafen') {
    if (!npcBuyTo(g, s, P.npc, it, n < 0 ? Infinity : n)) g.events.push({ type: 'fail', msg: npcWhy(g, P.npc, it, false) || (npcStock(g, P.npc, it) <= 0 ? `${npcName(P.npc)} hat gerade kein ${ITEMS[it].name} mehr.` : holdRoom(g, s, it) ? 'Dafür reichen deine Münzen nicht.' : 'Kein Platz im Laderaum.') });
    return;
  }
  if (isPartnerShop(g, P, ownerOf(s))) {
    if (!buyFrom(g, s, P, it, n < 0 ? Infinity : n)) g.events.push({ type: 'fail', msg: `${ITEMS[it].name}: hier nichts zu kaufen (Preisliste, Bestand, Münzen oder Laderaum).` });
    return;
  }
  const inv = stockOf(g, P), k = Math.min(n < 0 ? Infinity : n, Math.floor(inv[it] || 0), holdRoom(g, s, it));
  if (k <= 0) { g.events.push({ type: 'fail', msg: holdRoom(g, s, it) ? `Im Kontor ist kein ${ITEMS[it].name}.` : 'Kein Platz im Laderaum.' }); return; }
  inv[it] -= k; addCargo(g, s, it, k); flowIf(g, P, 'c', it, k); markFrom(g, s, it, P);
}
export function manualUnload(g, s, hold) {
  const P = portOf(g, s), h = s.cargo[hold];
  if (!P || s.st === 'sail' || !h || foreignPort(g, s, P)) return;
  if (P.t === 'npchafen') {
    if (!npcSellFrom(g, s, P.npc, h.it, h.n, false)) g.events.push({ type: 'fail', msg: npcWants(g, P.npc, h.it) ? `${ITEMS[h.it].name}: nichts abgegeben.` : npcWhy(g, P.npc, h.it, true) });
    return;
  }
  if (isPartnerShop(g, P, ownerOf(s))) {
    if (!sellTo(g, s, P, h.it, h.n)) g.events.push({ type: 'fail', msg: `${ITEMS[h.it].name}: wird hier nicht angekauft (Preisliste, Bestand oder Münzen des Besitzers).` });
    return;
  }
  const inv = stockOf(g, P), n = Math.min(h.n, Math.max(0, storeCap(g, P) - Math.floor(inv[h.it] || 0)));
  if (n <= 0) { g.events.push({ type: 'fail', msg: `Das Kontor ist voll (${ITEMS[h.it].name}).` }); return; }
  h.n -= n; inv[h.it] = (inv[h.it] || 0) + n; flowIf(g, P, 'p', h.it, n, isSep(g) ? h.fr : null);
  if (h.n <= 0) s.cargo[hold] = null;
}

/* ---------- Routen prüfen ---------- */
const LOAD_MODES = new Set(['all', 'upto', 'keep']), UNLOAD_MODES = new Set(['all', 'keep']);
const num = (v) => Math.max(0, Math.min(99999, Math.floor(+v) || 0));
// Stopps aus einem Kommando bereinigen: nur Kontore mit Anleger (kontor = Gebäude-ID; isl = Hauptkontor dieser Insel), gültige Waren und Modi.
// pid (Getrennte Inseln): eigene Kontore, fremde Hauptkontore und Handelskontore nur, wenn pid sie aufgedeckt hat
// NPC-Stege erst, wenn das Volk entdeckt ist, und nur, solange es handelt (Enden, sim/ending.js)
export const stopAllowed = (g, P, pid) => P.t === 'npchafen' ? npcTrades(g, P.npc) : !isSep(g) || pid == null || ownerOf(P) === pid || fogOf(g, pid).get(P.x, P.y);
export function cleanStops(g, stops, pid) {
  if (!Array.isArray(stops)) return [];
  const out = [];
  for (const st of stops.slice(0, MAX_STOPS)) {
    if (!st) continue;
    let P = st.kontor != null ? portById(g, st.kontor) : null;
    if (!P && st.isl != null) P = kontorOf(g, +st.isl);
    if (!P || !stopAllowed(g, P, pid)) continue;
    const load = (Array.isArray(st.load) ? st.load : []).filter(o => o && ITEMS[o.it]).slice(0, MAX_ORDERS)
      .map(o => ({ it: o.it, mode: LOAD_MODES.has(o.mode) ? o.mode : 'all', n: num(o.n) }));
    const unload = (Array.isArray(st.unload) ? st.unload : []).filter(o => o && (o.it === '*' || ITEMS[o.it])).slice(0, MAX_ORDERS)
      .map(o => ({ it: o.it, mode: UNLOAD_MODES.has(o.mode) ? o.mode : 'all', n: num(o.n) }));
    out.push({ kontor: P.id, load, unload, wait: !!st.wait });
  }
  return out;
}
// reset = neue Route (ab Stopp 1, Pause aufgehoben), sonst Änderung der bestehenden
export function setRoute(g, s, stops, reset) {
  const clean = cleanStops(g, stops, ownerOf(s));
  if (clean.length) s.auto = false;
  if (!clean.length) { s.route = null; delete s.wp; delete s.wi; startRoute(g, s); return; }
  const old = s.route;
  if (reset || !old) {
    s.route = { stops: clean, idx: 0, paused: false };
    if (old && old.perm) s.route.perm = old.perm;   // gleiche Aufträge an einem fremden Kontor: Erlaubnis bleibt
    refreshPerms(g, s);
    startRoute(g, s);
    return;
  }
  const before = old.stops[old.idx] ? old.stops[old.idx].kontor : -1;
  old.stops = clean;
  refreshPerms(g, s);
  if (old.idx >= clean.length) old.idx = 0;
  if (!routeOn(s)) { if (s.dest === 'route') startRoute(g, s); return; }
  const now = clean[old.idx].kontor;
  if ((s.dest === 'route' && s.st === 'sail' && now !== before) || (s.st === 'idle' && s.dest !== 'man')) sailToStop(g, s, null);
}
export function resumeRoute(g, s) {
  if (!s.route) return;
  s.route.paused = false; s.auto = false;
  if (routeOn(s)) sailToStop(g, s, null);
}

/* ---------- Funde ---------- */
// Ladung in den Laderaum nehmen: { got, rest }
function takeLoot(g, s, left) {
  const got = [], rest = [];
  for (const L of left) {
    const n = addCargo(g, s, L.it, L.n);
    if (n) got.push({ it: L.it, n });
    if (L.n - n > 0) rest.push({ it: L.it, n: L.n - n });
  }
  return { got, rest };
}
// Darf das Schiff den Fund bei (fx, fy) einsammeln? Mit „Funde einsammeln: aus“ nur, wenn es manuell genau dorthin fährt.
const mayPick = (s, fx, fy) => s.pick !== false || (s.dest === 'man' && s.mt != null && Math.max(Math.abs(tkx(s.mt) - fx), Math.abs(tky(s.mt) - fy)) <= 1);
function collectFinds(g, s) {
  const st = g.state, x = Math.floor(s.x), y = Math.floor(s.y);
  const report = (key, kind, got, full) => {
    // voller Laderaum: nur einmal je Fund melden
    if (got.length || s._lk !== key) g.events.push({ type: 'loot', id: s.id, name: s.name, kind, what: FIND_NAME[kind], got, full, pid: own(g, s) });
    s._lk = key;
  };
  for (const f of findsNear(g.W, x, y, 1)) {
    const left = lootLeft(st.loot, f);
    if (!left || !mayPick(s, f.x, f.y)) continue;
    const first = st.loot[f.key] === undefined;
    const { got, rest } = takeLoot(g, s, left);
    if (got.length) { st.loot[f.key] = rest.length ? rest : 0; g.lootVer++; }
    // Wracks ab Ring 2: beim ersten Plündern mit WRECK_COINS.chance zusätzlich Münzen
    if (got.length && first && f.kind === 'wreck' && g.W.ringAt(f.x, f.y) >= WRECK_COINS.ring && hash2(f.x, f.y, st.seed + 6007) < WRECK_COINS.chance) {
      const n = WRECK_COINS.min + Math.floor(hash2(f.y, f.x, st.seed + 6011) * (WRECK_COINS.max - WRECK_COINS.min + 1));
      coinAdd(g, n, 'funde', ownerOf(s));
      got.push({ it: 'coins', n });
    }
    report(f.key, f.kind, got, rest.length > 0);
  }
  // abgeworfene Ladung (das abwerfende Schiff erst, wenn es sich entfernt hat oder gezielt hinfährt)
  for (const j of st.jet) {
    if (Math.abs(j.x - x) > 1 || Math.abs(j.y - y) > 1 || !mayPick(s, j.x, j.y)) continue;
    if (j.lock === s.id && !(s.dest === 'man' && s.mt != null && Math.max(Math.abs(tkx(s.mt) - j.x), Math.abs(tky(s.mt) - j.y)) <= 1)) continue;
    const { got, rest } = takeLoot(g, s, j.items);
    if (got.length) { j.items = rest; g.jetVer++; }
    report('j' + j.id, 'jet', got, rest.length > 0);
  }
  if (st.jet.some(j => !j.items.length)) { st.jet = st.jet.filter(j => j.items.length); g.jetVer++; }
}
// Laderaum hold über Bord werfen: Kisten auf einem freien Meeresfeld direkt neben dem Schiff (zählt nicht in der Statistik)
export function jettison(g, s, hold) {
  const h = s.cargo[hold], st = g.state, W = g.W;
  if (!h) return;
  const x = Math.floor(s.x), y = Math.floor(s.y), used = (px, py) => st.jet.some(j => j.x === px && j.y === py) || findsNear(W, px, py, 0).some(f => lootLeft(st.loot, f));
  let spot = null;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 0]]) {
    if (W.ocean(x + dx, y + dy) && !used(x + dx, y + dy)) { spot = { x: x + dx, y: y + dy }; break; }
  }
  if (!spot) {   // alles belegt: zu Ladung gleicher Art daneben legen
    const j = st.jet.find(o => Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1);
    if (!j) { g.events.push({ type: 'fail', msg: 'Hier ist kein freies Wasser für die Ladung.' }); return; }
    const same = j.items.find(o => o.it === h.it);
    if (same) same.n += h.n; else j.items.push({ it: h.it, n: h.n });
    j.exp = st.time + JETTISON_TTL; j.lock = s.id;
  } else st.jet.push({ id: st.nextId++, x: spot.x, y: spot.y, items: [{ it: h.it, n: h.n }], exp: st.time + JETTISON_TTL, lock: s.id });
  s.cargo[hold] = null;
  g.jetVer++;
  g.events.push({ type: 'jettison', id: s.id, name: s.name, it: h.it, n: h.n });
}
// Abgeworfene Ladung altern lassen; Sperre für das abwerfende Schiff lösen, sobald es mehr als 1 Feld entfernt ist
export function tickJetsam(g) {
  const st = g.state;
  if (!st.jet.length) return;
  const before = st.jet.length;
  st.jet = st.jet.filter(j => j.exp > st.time && j.items.length);
  if (st.jet.length !== before) g.jetVer++;
  for (const j of st.jet) {
    if (j.lock == null) continue;
    const s = st.ships.find(o => o.id === j.lock);
    if (!s || Math.max(Math.abs(Math.floor(s.x) - j.x), Math.abs(Math.floor(s.y) - j.y)) > 1) { j.lock = null; g.jetVer++; }
  }
}
// Neues Feld erreicht: Nebel aufdecken, Funde einsammeln
function onTile(g, s) {
  const t = tk(Math.floor(s.x), Math.floor(s.y));
  if (s._rt === t) return;
  s._rt = t;
  reveal(g, s.x, s.y, shipKind(s).reveal * mods(g, ownerOf(s)).reveal, ownerOf(s));
  collectFinds(g, s);
}

/* ---------- Schiffe erzeugen und bewegen ---------- */
// owner = Spieler, dem das Schiff gehört (Koop; in „Gemeinsame Insel“ darf jeder jedes Schiff steuern)
export function newShip(g, x, y, home, kind, owner) {
  const state = g.state, n = state.ships.length + 1, k = SHIP_KINDS[kind] ? kind : 'fracht';
  const s = { id: state.nextId++, n, kind: k, owner: owner || actor(g), name: `${k === 'fracht' ? 'Schiff' : SHIP_KINDS[k].name} ${n}`, home, x, y, cargo: [], pick: true, auto: false, xr: EXPLORE.def, st: 'idle', dest: '', mt: null, route: null,
    pi: 0, f: 0, fl: false, path: null, np: false, tm: 0, wt: 0, rt: 0, _pv: 0 };
  s.cargo = emptyHolds(g, s);
  state.ships.push(s);
  onTile(g, s);
  return s;
}
export function spawnShip(g, b) {
  const H = kontorOf(g, b.isl), dock = b._dock != null ? b._dock : H ? H._dock : null;
  if (dock == null) return;
  // Neue Schiffe warten ohne Route. home = ID der Werft, die es gebaut hat; Art aus dem Bauauftrag (b.bk)
  const s = newShip(g, tkx(dock) + 0.5, tky(dock) + 0.5, b.id, b.bk || 'fracht', b.bo || b.by);   // bo = wer den Bau beauftragt hat
  g.events.push({ type: 'shipLaunched', id: s.id, n: s.n, name: s.name, kind: s.kind, pid: own(g, s) });
}
export function tickShip(g, s, dt) {
  if (s.st === 'sail') {
    const p = s.path;
    if (!p) { s.st = 'idle'; return; }
    let move = speedOf(g, s) * evShip(g, s.x, s.y) * dt;
    while (move > 0 && s.pi < p.length - 1) {
      const a = p[s.pi], b = p[s.pi + 1];
      const seg = Math.hypot(tkx(b) - tkx(a), tky(b) - tky(a)) || 1, rem = (1 - s.f) * seg;
      if (move >= rem) { move -= rem; s.pi++; s.f = 0; } else { s.f += move / seg; move = 0; }
    }
    setShipPos(s);
    onTile(g, s);
    if (s.pi >= p.length - 1) {
      s.path = null; s._pv = (s._pv || 0) + 1;
      if (s.dest === 'man' && s.mg != null && s.mgn < MG_LEGS) { const t = s.mg; s.st = 'idle'; if (!shipGoto(g, s, tkx(t), tky(t))) { s.dest = ''; s.mt = s.mg = null; } }
      else if (s.dest === 'man' || s.dest === 'auto') { s.st = 'idle'; s.dest = ''; s.mt = s.mg = null; s.mgn = 0; }
      else { s.st = 'dock'; s.tm = SHIP_DOCK_TIME; }
    }
  } else if (s.st === 'dock') {
    s.tm -= dt;
    if (s.tm > 0) return;
    if (!routeOn(s)) { s.st = 'idle'; s.dest = ''; return; }
    const stop = s.route.stops[s.route.idx], P = portById(g, stop.kontor);
    if (!P || !stopOk(g, s, stop)) { nextStop(g, s, P ? stop.kontor : null); return; }   // Erlaubnis unterwegs widerrufen: weiter
    doUnload(g, s, stop, P); doLoad(g, s, stop, P);
    if (stop.wait && stop.load.length && !stop.load.every(o => orderDone(g, s, o))) { s.st = 'wait'; s.wt = 0; return; }
    nextStop(g, s, stop.kontor);
  } else if (s.st === 'wait') {
    if (!routeOn(s)) { s.st = 'idle'; s.dest = ''; return; }
    const stop = s.route.stops[s.route.idx], P = portById(g, stop.kontor);
    s.wt += dt;
    if (P) doLoad(g, s, stop, P);
    if (!stop.wait || stop.load.every(o => orderDone(g, s, o)) || s.wt >= SHIP_WAIT_MAX || !P) nextStop(g, s, stop.kontor);
  } else if (s.auto && s.st === 'idle') {
    tickAuto(g, s, dt);
  } else if ((s.np || s.wi) && routeOn(s)) {
    // kein Seeweg bzw. kein erlaubter Stopp: alle SHIP_RETRY Sekunden neu versuchen
    s.rt -= dt;
    if (s.rt <= 0) sailToStop(g, s, null);
  }
}
