/* =========================================================
   HANDEL: Markt (Preise, Sättigung, Verlauf), Händler-Schiffe, Handelsaufträge
   Zahlen in data/trade.js.
   state.market = { s: { Ware: Sättigung 0–max (senkt den Ankaufpreis) }, b: { Ware: Nachfrage 0–max (hebt den Verkaufspreis) },
                    h: { Ware: [[Ankauf, Verkauf], …] } (Verlauf, alle MARKET.histEvery s), ht (letzte Probe) }
   state.trade  = { due: { 'Händler:Insel': Spielzeit des nächsten Besuchs }, list: [Händler], n (Zähler für den Zufall) }
     Händler: { id, kind, isl, post (Gebäude-ID), x, y, fl, path, pi, f, st: 'in'|'dock'|'out', tm, offer: [{ it, n }] | null }
   state.orders = { Insel: [{ id, kind: 'sell'|'buy', it, n (über / bis Bestand), lim (Mindest-/Höchstpreis oder null) }] }
   Getrennte Inseln: Preise und Sättigung gelten für alle; Boni (Handelspreis, Besuche) und Kasse gehören dem Besitzer der Insel,
   Aufträge stellt nur er. Der Fernhändler kommt zu einem Spieler erst, wenn dieser ein Kontor ab Ring needRing hat.
   Händler segeln wie Schiffe (A*, sim/ships.js seaPath), sind aber nicht steuerbar, sammeln nichts ein und blockieren nichts.
   Kein DOM-Zugriff; die Preis-Abfragen laufen auch auf dem Spiegel.
   ========================================================= */
import { PRICES, MARKET, TRADERS, TRADER_ORDER, MAX_TRADE_ORDERS } from '../data/trade.js';
import { ITEMS, ITEM_ORDER, isPlan } from '../data/items.js';
import { hash2 } from '../util/math.js';
import { tk, tkx, tky } from '../util/tiles.js';
import { islData, capOf, kontorIslands, islName, islOwner, ownerOf, pst, myIsl, foreignIsl, isSep, actor } from './state.js';
import { mods } from './mods.js';
import { coinAdd } from './coins.js';
import { flowAdd } from './stats.js';
import { seaPath } from './ships.js';
import { evShip, evTradePrice } from './events.js';

export const freshMarket = () => ({ s: {}, b: {}, h: {}, ht: 0 });
export const freshTrade = () => ({ due: {}, list: [], n: 0 });
export const TRADE_GOODS = ITEM_ORDER.filter(it => PRICES[it] != null);

/* ---------- Preise ---------- */
// Ankaufpreis (der Händler zahlt, der Spieler verkauft): Grundpreis × (1 − Sättigung) × (1 + Boni)
// pid = Spieler, dessen Boni gelten (Getrennte Inseln: Besitzer der Insel)
export function buyPrice(g, it, pid) {
  const P = PRICES[it], M = g.state.market;
  if (!P || isPlan(it)) return 0;
  return P * MARKET.buy * (1 - ((M && M.s[it]) || 0)) * (1 + mods(g, pid).tradePrice + evTradePrice(g));
}
// Verkaufspreis (der Spieler kauft): Grundpreis × 1,4 × (1 + Nachfrage)
export function sellPrice(g, it) {
  const P = PRICES[it], M = g.state.market;
  if (!P) return 0;
  return P * MARKET.sell * (1 + ((M && M.b[it]) || 0));
}
// Wer kauft / verkauft die Ware? → Liste der Händlerarten
export const buyersOf = (it) => TRADER_ORDER.filter(k => (TRADERS[k].buys || []).includes(it));
export const sellersOf = (it) => TRADER_ORDER.filter(k => (TRADERS[k].sells || []).includes(it) || (TRADERS[k].offer || []).some(o => o.it === it));

// Sättigung und Nachfrage erholen sich, Verlauf aufzeichnen (einmal je Sekunde aus sim/sim.js)
export function marketTick(g, dt) {
  const st = g.state, M = st.market, r = MARKET.recover * dt / 60;
  for (const k of ['s', 'b']) for (const it in M[k]) { M[k][it] = Math.max(0, M[k][it] - r); if (M[k][it] <= 0) delete M[k][it]; }
  if (!M.ht || st.time - M.ht >= MARKET.histEvery || st.time < M.ht) {
    M.ht = st.time;
    for (const it of TRADE_GOODS) {
      const h = M.h[it] || (M.h[it] = []);
      h.push([Math.round(buyPrice(g, it) * 10) / 10, Math.round(sellPrice(g, it) * 10) / 10]);
      while (h.length > MARKET.histLen) h.shift();
    }
  }
}

/* ---------- Handelsposten und Termine ---------- */
export function postOf(g, k) { for (const b of g.blds.values()) if (b.t === 'handel' && b.isl === k) return b; return null; }
export function posts(g) { const o = []; for (const b of g.blds.values()) if (b.t === 'handel') o.push(b); return o; }
// Ist die Händlerart schon unterwegs (needRing)? pid = Besitzer des Postens (Getrennte Inseln: nur dessen Kontore zählen)
export function traderActive(g, kind, pid) {
  const T = TRADERS[kind];
  if (!T.needRing) return true;
  return kontorIslands(g, isSep(g) ? pid || actor(g) : null).some(k => { const I = g.W.island(k); return I && I.ring >= T.needRing; });
}
export const interval = (g, kind, pid) => TRADERS[kind].every / (1 + mods(g, pid).tradeFreq);
const key = (kind, k) => kind + ':' + k;

export function tradeTick(g, dt) {
  const st = g.state, T = st.trade, P = posts(g), have = new Set();
  for (const b of P) for (const kind of TRADER_ORDER) {
    const own = ownerOf(b);
    if (!traderActive(g, kind, own)) continue;
    const K = key(kind, b.isl);
    have.add(K);
    if (T.due[K] == null) T.due[K] = st.time + TRADERS[kind].first;
    if (st.time >= T.due[K]) {
      if (!T.list.some(t => t.kind === kind && t.isl === b.isl)) spawnTrader(g, kind, b);
      T.due[K] = st.time + interval(g, kind, own);
    }
  }
  for (const K in T.due) if (!have.has(K)) delete T.due[K];
  for (const t of T.list) moveTrader(g, t, dt);
  if (T.list.some(t => t.gone)) T.list = T.list.filter(t => !t.gone);
}
// Zusätzlicher Besuch des Hafenhändlers auf jeder Insel mit Handelsposten (Händlerfest)
export function extraVisit(g, kind) {
  const T = g.state.trade;
  for (const b of posts(g)) { const K = key(kind, b.isl); if (!T.list.some(t => t.kind === kind && t.isl === b.isl)) T.due[K] = Math.min(T.due[K] != null ? T.due[K] : Infinity, g.state.time + 3); }
}

/* ---------- Händler-Schiffe ---------- */
function rnd(g, a, b) { return hash2(g.state.trade.n * 131 + a, b, g.state.seed + 5003); }
// Wechselndes Angebot (Fernhändler): offerN Einträge nach Gewicht, je mit Vorrat
function rollOffer(g, T) {
  if (!T.offer) return null;
  const pool = T.offer.slice(), [a, b] = T.offerN, n = a + Math.floor(rnd(g, 1, 2) * (b - a + 1)), out = [];
  for (let i = 0; i < n && pool.length; i++) {
    let sum = 0; for (const o of pool) sum += o.w;
    let r = rnd(g, 10 + i, 3) * sum, j = 0;
    while (j < pool.length - 1 && r >= pool[j].w) { r -= pool[j].w; j++; }
    const o = pool.splice(j, 1)[0];
    out.push({ it: o.it, n: o.min + Math.floor(rnd(g, 20 + i, 4) * (o.max - o.min + 1)) });
  }
  return out;
}
export function spawnTrader(g, kind, post) {
  const st = g.state, T = TRADERS[kind], W = g.W, dock = post._tdock;
  if (dock == null) return null;
  st.trade.n++;
  const dx0 = tkx(dock), dy0 = tky(dock), a0 = rnd(g, 0, 1) * Math.PI * 2;
  for (let i = 0; i < 16; i++) {
    const a = a0 + i * Math.PI / 8, x = Math.round(dx0 + Math.cos(a) * T.spawn), y = Math.round(dy0 + Math.sin(a) * T.spawn);
    if (!W.ocean(x, y)) continue;
    const path = seaPath(g, tk(x, y), dock);
    if (!path || path.length < 2) continue;
    const t = { id: st.nextId++, kind, isl: post.isl, post: post.id, x: x + 0.5, y: y + 0.5, fl: false, path, pi: 0, f: 0, st: 'in', tm: 0, offer: rollOffer(g, T) };
    st.trade.list.push(t);
    g.events.push({ type: 'traderComing', kind, isl: post.isl, name: islName(g, post.isl, ownerOf(post)), pid: isSep(g) ? ownerOf(post) : undefined });
    return t;
  }
  return null;
}
function setPos(t) {
  const p = t.path, a = p[Math.min(t.pi, p.length - 1)], b = p[Math.min(t.pi + 1, p.length - 1)];
  const ax = tkx(a), ay = tky(a), bx = tkx(b), by = tky(b);
  t.x = ax + (bx - ax) * t.f + 0.5; t.y = ay + (by - ay) * t.f + 0.5;
  if (bx !== ax) t.fl = bx < ax;
}
// Wegfahren: den bisherigen Weg zurück
function leave(g, t) {
  t.path = t.path.slice(0, Math.min(t.path.length, t.pi + 1)).reverse();
  t.pi = 0; t.f = 0; t.st = 'out';
  if (t.path.length < 2) t.gone = true;
}
function moveTrader(g, t, dt) {
  const T = TRADERS[t.kind];
  if (t.st === 'dock') {
    t.tm -= dt;
    if (t.tm <= 0 || !g.blds.get(t.post)) leave(g, t);
    return;
  }
  if (t.st === 'in' && !g.blds.get(t.post)) { leave(g, t); return; }
  const p = t.path;
  let move = T.speed * evShip(g, t.x, t.y) * dt;
  while (move > 0 && t.pi < p.length - 1) {
    const a = p[t.pi], b = p[t.pi + 1], seg = Math.hypot(tkx(b) - tkx(a), tky(b) - tky(a)) || 1, rem = (1 - t.f) * seg;
    if (move >= rem) { move -= rem; t.pi++; t.f = 0; } else { t.f += move / seg; move = 0; }
  }
  setPos(t);
  if (t.pi >= p.length - 1) {
    if (t.st === 'out') { t.gone = true; return; }
    t.st = 'dock'; t.tm = T.dock;
    doTrade(g, t);
  }
}

/* ---------- Handel beim Anlegen ---------- */
// Führt die Aufträge der Insel aus (höchstens MARKET.perVisit Stück je Ware), in Teilgeschäften zu MARKET.chunk Stück
export function doTrade(g, t) {
  const st = g.state, T = TRADERS[t.kind], k = t.isl, inv = islData(g, k).inv, cap = capOf(g, k), M = st.market;
  const own = islOwner(g, k) || 'host', ps = pst(g, own);   // Kasse und Zähler des Inselbesitzers
  const orders = st.orders[k] || [], lines = [], done = {};
  const stockOf = (it) => t.offer ? (t.offer.find(o => o.it === it) || { n: 0 }).n : (T.sells || []).includes(it) ? Infinity : 0;
  for (const o of orders) {
    if (!ITEMS[o.it]) continue;
    const used = done[o.it] || 0;
    let moved = 0, sum = 0;
    if (o.kind === 'sell') {
      if (!(T.buys || []).includes(o.it) || isPlan(o.it)) continue;
      let want = Math.min(MARKET.perVisit - used, Math.floor(inv[o.it] || 0) - o.n);
      while (want > 0) {
        const price = buyPrice(g, o.it, own);
        if (o.lim != null && price < o.lim) break;
        const m = Math.min(MARKET.chunk, want), gain = Math.round(price * m);
        inv[o.it] -= m; moved += m; sum += gain; want -= m;
        coinAdd(g, gain, 'verkauf', own);
        M.s[o.it] = Math.min(MARKET.max, (M.s[o.it] || 0) + MARKET.per * m / MARKET.step);
        flowAdd(g, k, 'c', o.it, m, 'handel');
      }
      if (moved) { ps.stats.sold = (ps.stats.sold || 0) + moved; lines.push({ it: o.it, n: moved, sum, sell: true }); }
    } else if (o.kind === 'buy') {
      let want = Math.min(MARKET.perVisit - used, o.n - Math.floor(inv[o.it] || 0), Math.floor(cap - (inv[o.it] || 0)), stockOf(o.it));
      while (want > 0) {
        const price = sellPrice(g, o.it);
        if (o.lim != null && price > o.lim) break;
        const m = Math.min(MARKET.chunk, want, Math.floor((ps.coins | 0) / price));
        if (m <= 0) break;
        const cost = Math.round(price * m);
        inv[o.it] = (inv[o.it] || 0) + m; moved += m; sum += cost; want -= m;
        coinAdd(g, -cost, 'kauf', own);
        M.b[o.it] = Math.min(MARKET.max, (M.b[o.it] || 0) + MARKET.per * m / MARKET.step);
        flowAdd(g, k, 'p', o.it, m, 'handel');
        if (t.offer) { const of = t.offer.find(x => x.it === o.it); if (of) of.n -= m; }
      }
      if (moved) { ps.stats.bought = (ps.stats.bought || 0) + moved; lines.push({ it: o.it, n: moved, sum, sell: false }); }
    }
    done[o.it] = used + moved;
  }
  g.events.push({ type: 'trade', kind: t.kind, isl: k, name: islName(g, k, own), lines, pid: isSep(g) ? own : undefined });
  return lines;
}

/* ---------- Aufträge (Kommando 'tradeOrder') ---------- */
const num = (v, max) => Math.max(0, Math.min(max, Math.floor(+v) || 0));
function cleanOrder(o) {
  if (!o || !ITEMS[o.it] || PRICES[o.it] == null || (o.kind !== 'sell' && o.kind !== 'buy')) return null;
  if (o.kind === 'sell' && isPlan(o.it)) return null;   // Pläne kann man nur kaufen
  const lim = o.lim == null || o.lim === '' || !(+o.lim > 0) ? null : Math.round(+o.lim * 10) / 10;
  return { kind: o.kind, it: o.it, n: num(o.n, 99999), lim };
}
// op: 'add' (o), 'set' (oid, o), 'del' (oid), 'up' (oid: eins nach oben)
export function tradeOrder(g, c) {
  const st = g.state, k = +c.isl;
  if (!Number.isFinite(k) || !g.KONT[k]) return;
  if (!myIsl(g, k)) { g.events.push({ type: 'fail', msg: foreignIsl(g, k) }); return; }
  const L = st.orders[k] || (st.orders[k] = []), i = L.findIndex(o => o.id === c.oid);
  if (c.op === 'add') {
    const o = cleanOrder(c.o);
    if (!o) return;
    if (L.length >= MAX_TRADE_ORDERS) { g.events.push({ type: 'fail', msg: `Höchstens ${MAX_TRADE_ORDERS} Handelsaufträge je Insel.` }); return; }
    L.push(Object.assign({ id: st.nextId++ }, o));
  } else if (c.op === 'set' && i >= 0) {
    const o = cleanOrder(Object.assign({}, L[i], c.o));
    if (o) L[i] = Object.assign({ id: L[i].id }, o);
  } else if (c.op === 'del' && i >= 0) L.splice(i, 1);
  else if (c.op === 'up' && i > 0) { const [o] = L.splice(i, 1); L.splice(i - 1, 0, o); }
  if (!L.length) delete st.orders[k];
}
