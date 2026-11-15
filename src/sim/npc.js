/* =========================================================
   HANDEL MIT DEN VÖLKERN (seit Version 17; alle Zahlen in data/npctrade.js)
   Zustand state.npc gehört zur Welt (Ruf je Welt, Entscheidung 11) und läuft nur, solange es eine Geschichte gibt:
     state.npc = { day (zuletzt abgerechneter Tag), n (Zähler für den Zufall), ole: N, brann: N, aurel: N }
     N = { rep (0–100), lv (höchste erreichte Stufe, −1 = noch kein Kontakt), sat/dem ({ Ware: Preisdruck }), stock ({ Ware: Vorrat }),
           chart (Seekarten übrig heute), orders: [{ id, it, n, got, due, pay, rep }], deals: [{ id, it, n, p, bonus, rep, got, miss, fresh }],
           del (Wert aller Lieferungen, Münzen), vil (Dorfstufe), log: [{ t, s }] (letzte Geschäfte) }
   Gehandelt wird nur am Steg (Schiff liegt dort, sim/villages.js shipAtPort) oder über Routen (sim/ships.js):
     Laden = kaufen (npcBuyTo), Entladen = liefern und verkaufen (npcSellFrom: erst offene Aufträge, über Routen dann
     Lieferverträge, der Rest wird verkauft, wenn das Volk die Ware ankauft; sonst bleibt sie an Bord).
   Kommandos (über den Host wie alle anderen): shipLoad/shipUnload am NPC-Steg, npcBuy (Plan, Seekarte), npcDeliver (Auftrag),
   npcDeal (Liefervertrag abschließen/kündigen), npcRep (Debug, nur Host).
   Tagesablauf (npcTick, einmal je Sekunde): Preise erholen sich, Vorräte füllen sich, Aufträge laufen am Abend ab;
   jeden Morgen neue Aufträge, Abrechnung der Lieferverträge, Seekarten, Geschenke von Aurel.
   Die Abfragen (Preise, Stufe, Angebot) laufen auch auf dem Spiegel. Kein DOM-Zugriff.
   ========================================================= */
import { CYCLE, DAY_LEN } from '../config.js';
import { REP, REP_LEVELS, NPC_MARKET, NPC_GOODS, PLAN_PRICE, ORDERS, CONTRACTS, SEA_CHART, NPC_TRADE, ENDINGS } from '../data/npctrade.js';
import { PRICES } from '../data/trade.js';
import { ITEMS } from '../data/items.js';
import { UNLOCKS, PLANS, unlockName } from '../data/unlocks.js';
import { TRADERS, npcName, npcPid } from '../data/npcs.js';
import { hash2 } from '../util/math.js';
import { islId, HOME_ISL } from '../util/tiles.js';
import { pst, ownerOf, islData, capOf } from './state.js';
import { coinAdd } from './coins.js';
import { unlock } from './unlocks.js';
import { storyEvent } from './story.js';
import { npcPort, shipAtPort, placeVillage } from './villages.js';
import { holdRoom, addCargo, takeCargo, cargoOf, portOf } from './ships.js';
import { reveal } from './explore.js';
import { addBuilding } from './buildings.js';
import { npcGone, endingOf } from './ending.js';
import { RELIC_SOURCES } from '../data/relics.js';
import { relicDef, isLegend, giveRelic, rollRelic, offeredRelics } from './relics.js';

const LOG_LEN = 8;
const LVL_IDX = Object.fromEntries(REP_LEVELS.map((L, i) => [L.id, i]));
export const lvlIdx = (id) => LVL_IDX[id || REP_LEVELS[0].id] | 0;

/* ---------- Zustand ---------- */
function freshOne(id) {
  const T = NPC_TRADE[id], stock = {};
  for (const e of T.sells) if (e.it) stock[e.it] = e.n;
  return { rep: T.rep, lv: -1, sat: {}, dem: {}, stock, chart: T.chart ? T.chart.n : 0, orders: [], deals: [], del: 0, vil: 0, log: [], relic: null, rday: null };
}
export function freshNpc() { const o = { day: null, n: 0 }; for (const id of TRADERS) o[id] = freshOne(id); return o; }
// Geladenen Zustand prüfen und mit Standardwerten ergänzen (save/serialize.js)
export function cleanNpc(raw) {
  const o = freshNpc();
  if (!raw || typeof raw !== 'object') return o;
  o.day = Number.isFinite(raw.day) ? raw.day : null; o.n = Math.max(0, raw.n | 0);
  const obj = (v) => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const nums = (v) => { const r = {}; for (const k in obj(v)) if (ITEMS[k] && Number.isFinite(+v[k])) r[k] = +v[k]; return r; };
  for (const id of TRADERS) {
    const s = obj(raw[id]), N = o[id];
    if (Number.isFinite(+s.rep)) N.rep = Math.max(0, Math.min(REP.max, +s.rep));
    if (Number.isInteger(s.lv)) N.lv = Math.max(-1, Math.min(REP_LEVELS.length - 1, s.lv));
    N.sat = nums(s.sat); N.dem = nums(s.dem); Object.assign(N.stock, nums(s.stock));
    if (Number.isFinite(+s.chart)) N.chart = Math.max(0, s.chart | 0);
    N.orders = (Array.isArray(s.orders) ? s.orders : []).filter(q => q && ITEMS[q.it] && q.n > 0).map(q => Object.assign({ id: q.id | 0, it: q.it, n: q.n | 0, got: Math.max(0, q.got | 0), due: +q.due || 0, pay: Math.max(0, q.pay | 0), rep: +q.rep || 0 }, relicDef(q.relic) ? { relic: q.relic } : {}));
    // Relikt im Angebot (0.24.0) und Tag, an dem zuletzt eins ausgewählt wurde
    N.relic = s.relic && relicDef(s.relic.id) ? { id: s.relic.id, price: Math.max(0, s.relic.price | 0) } : null;
    N.rday = Number.isFinite(s.rday) ? s.rday : null;
    N.deals = (Array.isArray(s.deals) ? s.deals : []).filter(d => d && ITEMS[d.it] && d.n > 0).map(d => ({ id: String(d.id), it: d.it, n: d.n | 0, p: +d.p || 0, bonus: d.bonus | 0, rep: +d.rep || 0, got: Math.max(0, d.got | 0), miss: d.miss | 0, fresh: !!d.fresh }));
    N.del = Math.max(0, +s.del || 0); N.vil = Math.max(0, s.vil | 0);
    N.log = (Array.isArray(s.log) ? s.log : []).filter(l => l && typeof l.s === 'string').slice(-LOG_LEN).map(l => ({ t: +l.t || 0, s: l.s.slice(0, 160) }));
  }
  return o;
}

/* ---------- Abfragen (auch auf dem Spiegel) ---------- */
export const npcOf = (g, id) => (g.state && g.state.npc && g.state.npc[id]) || null;
export const npcKnown = (g, id) => !!(g.state && g.state.story && g.state.story.flags['npc_' + id]);
// Handelt das Volk (noch) mit dir? Nach den Enden nicht mehr: Aurel (A und B), Ole und Brann (B); der Inselrat nur nach A (sim/ending.js)
export const npcTrades = (g, id) => npcKnown(g, id) && !npcGone(g, id);
// Stufe zum Ruf (Index in REP_LEVELS)
export function repLvl(rep) { let i = 0; for (let j = 0; j < REP_LEVELS.length; j++) if (rep >= REP_LEVELS[j].min) i = j; return i; }
export const lvlOf = (N) => REP_LEVELS[repLvl(N ? N.rep : 0)];
export const lvlOk = (N, lvl) => !!N && repLvl(N.rep) >= lvlIdx(lvl);
// Grundpreis einer Ware (Markt oder Waren der Völker)
export const basePrice = (it) => PRICES[it] != null ? PRICES[it] : NPC_GOODS[it] || 0;
const actF = (g, id) => {
  const A = NPC_TRADE[id].act, act = g.state.story ? g.state.story.act : 1; let f = null; if (A) for (const k in A) if (act >= +k) f = A[k];
  // Ende A (0.23.0): Ole und Brann dauerhaft mit Rabatt (data/npctrade.js ENDINGS.a)
  if (endingOf(g) === 'a' && (id === 'ole' || id === 'brann')) { const E = ENDINGS.a, b = f || { buy: 1, sell: 1 }; return { buy: b.buy * E.buy, sell: b.sell * E.sell }; }
  return f || { buy: 1, sell: 1 };
};
export const buyEntry = (id, it) => NPC_TRADE[id] && NPC_TRADE[id].buys.find(e => e.it === it) || null;
export const sellEntry = (id, it) => NPC_TRADE[id] && NPC_TRADE[id].sells.find(e => e.it === it) || null;
// Was das Volk je Stück zahlt (0 = kauft es nicht oder noch nicht)
export function npcPays(g, id, it) {
  const N = npcOf(g, id), e = buyEntry(id, it);
  if (!N || !e || !lvlOk(N, e.lvl) || npcGone(g, id)) return 0;
  return basePrice(it) * (e.f || 1) * lvlOf(N).buy * actF(g, id).buy * (1 - (N.sat[it] || 0));
}
// Was das Volk je Stück verlangt (0 = verkauft es nicht oder noch nicht)
// Steht der Eintrag gerade im Angebot? act = erst ab diesem Akt, part = Teil der Taucherglocke (nach der Montage nicht mehr)
export function sellOpen(g, e) {
  if (!e) return false;
  if (e.act && (!g.state.story || g.state.story.act < e.act)) return false;
  if (e.part && g.state.dive && g.state.dive.bell) return false;
  if (e.end && endingOf(g) !== e.end) return false;   // erst nach diesem Ende (0.23.0)
  return true;
}
export function npcAsks(g, id, it) {
  const N = npcOf(g, id), e = sellEntry(id, it);
  if (!N || !e || !lvlOk(N, e.lvl) || !sellOpen(g, e) || npcGone(g, id)) return 0;
  return basePrice(it) * (e.f || 1) * lvlOf(N).sell * actF(g, id).sell * (1 + (N.dem[it] || 0));
}
// Bei Lieferverträgen und für den Plan- und Kartenpreis gelten feste Preise
export const planPrice = (pid) => PLAN_PRICE[pid] || 0;
// Vorrat einer Ware (ganze Stück)
export const npcStock = (g, id, it) => { const N = npcOf(g, id); return N ? Math.floor(N.stock[it] || 0) : 0; };
// Stück, die ein Schiff s am Steg jetzt kaufen könnte (Vorrat, Münzen beim jetzigen Preis, Laderaum)
export function npcBuyable(g, s, id, it) {
  const p = npcAsks(g, id, it);
  if (!p) return 0;
  return Math.max(0, Math.min(npcStock(g, id, it), Math.floor((pst(g, ownerOf(s)).coins | 0) / p), holdRoom(g, s, it)));
}
// Offene Liefermenge einer Ware für Aufträge (und mit route auch für Lieferverträge)
export function npcWants(g, id, it, route) {
  const N = npcOf(g, id);
  if (!N || npcGone(g, id)) return 0;
  let n = 0;
  for (const o of N.orders) if (o.it === it) n += o.n - o.got;
  if (route) for (const d of N.deals) if (d.it === it) n += Math.max(0, d.n - d.got);
  return n;
}
// Fälligkeit eines Auftrags mit days: Ende des Tages (Abend) days Tage später, mindestens ORDERS.minLeft Sekunden
export function orderDue(time, days) {
  let due = Math.floor(time / CYCLE) * CYCLE + DAY_LEN;
  if (time >= due) due += CYCLE;
  due += (days | 0) * CYCLE;
  if (due - time < ORDERS.minLeft) due += CYCLE;
  return due;
}
// Freischaltungen eines Volks je Stufe: [{ key, name, lvl, plan }]
export function npcUnlocks(id) {
  const out = [];
  for (const key in UNLOCKS) { const U = UNLOCKS[key]; if (U.src === 'npc' && U.npc === id) out.push({ key, name: unlockName(key), lvl: U.lvl, plan: false }); }
  for (const p in PLANS) if (PLANS[p].npc === id) out.push({ key: 'plan:' + p, name: PLANS[p].name, lvl: PLANS[p].lvl, plan: true, price: planPrice(p) });
  return out.sort((a, b) => lvlIdx(a.lvl) - lvlIdx(b.lvl));
}
// Dorfstufe zum Wert der Lieferungen
export const villageStage = (id, del) => (NPC_TRADE[id].village || []).filter(v => del >= v.at).length;

/* ---------- Ruf ---------- */
function logLine(g, id, s) { const N = npcOf(g, id); N.log.push({ t: g.state.time, s }); while (N.log.length > LOG_LEN) N.log.shift(); }
const r2 = (v) => Math.round(v * 100) / 100, r4 = (v) => Math.round(v * 1e4) / 1e4;
// Ruf ändern; beim Aufstieg in eine neue Stufe Freischaltungen setzen und melden
export function addRep(g, id, d) {
  const N = npcOf(g, id);
  if (!N || !d) return;
  N.rep = r2(Math.max(0, Math.min(REP.max, N.rep + d)));
  levelCheck(g, id);
}
function levelCheck(g, id, first) {
  const N = npcOf(g, id), L = repLvl(N.rep);
  if (L <= N.lv) return;
  N.lv = L;
  const names = [];
  for (const u of npcUnlocks(id)) if (!u.plan && lvlIdx(u.lvl) <= L && unlock(g, u.key, 'npc', true)) names.push(u.name);
  const plans = npcUnlocks(id).filter(u => u.plan && lvlIdx(u.lvl) === L).map(u => u.name);
  g.events.push({ type: 'npcLevel', npc: id, lvl: REP_LEVELS[L].id, first: !!first, names, plans, to: '*' });
  // höhere Stufe = mehr Aufträge gleichzeitig: gleich auffüllen statt erst am Morgen
  if (!first) { const n = fillOrders(g, id); if (n) g.events.push({ type: 'npcOrders', npc: id, n, to: '*' }); }
}

/* ---------- Handel am Steg ---------- */
function tradeDone(g, id, lines, quiet) {
  if (!lines.length) return;
  if (!quiet) g.events.push({ type: 'npcTrade', npc: id, lines });
  logLine(g, id, lines.map(l => `${l.n} ${ITEMS[l.it].name} ${l.kind === 'buy' ? 'gekauft' : l.kind === 'order' ? 'für einen Auftrag geliefert' : l.kind === 'deal' ? 'per Vertrag geliefert' : 'verkauft'}${l.sum ? ` (${l.kind === 'buy' ? '−' : '+'}${l.sum})` : ''}`).join(', '));
  storyEvent(g, 'trade', id);
}
function delivered(g, id, it, n) {
  const N = npcOf(g, id);
  N.del = Math.round(N.del + n * basePrice(it));
  growCheck(g, id);
}
// Auftrag fertig: Belohnung und Ruf
function orderDone(g, id, o, pid) {
  const N = npcOf(g, id);
  N.orders = N.orders.filter(x => x !== o);
  coinAdd(g, o.pay, 'na:' + npcPid(id), pid);
  addRep(g, id, o.rep);
  const rel = o.relic && giveRelic(g, o.relic, 'auftrag:' + id, true);   // Relikt als Belohnung (0.24.0)
  g.events.push({ type: 'npcOrder', npc: id, it: o.it, n: o.n, coins: o.pay, rep: o.rep, relic: rel ? rel.id : null, to: '*' });
  logLine(g, id, `Auftrag erledigt: ${o.n} ${ITEMS[o.it].name} (+${o.pay} Münzen, +${o.rep} Ruf${rel ? `, Relikt: ${relicDef(rel.id).name}` : ''})`);
}
// Schiff s gibt am Steg bis zu want Stück der Ware it ab: zuerst an offene Aufträge, über Routen an Lieferverträge,
// der Rest wird verkauft (wenn das Volk die Ware ankauft). Liefert die abgegebene Menge.
// oid = nur dieser Auftrag (Knopf „Liefern“), quiet = keine Meldung (Routen)
export function npcSellFrom(g, s, id, it, want, route, oid, quiet) {
  const N = npcOf(g, id), pid = ownerOf(s);
  if (!N || !ITEMS[it] || npcGone(g, id)) return 0;
  let left = Math.min(Math.floor(want), cargoOf(s, it)), moved = 0;
  const lines = [], ps = pst(g, pid);
  for (const o of N.orders.slice()) {
    if (left <= 0 || o.it !== it || (oid != null && o.id !== oid)) continue;
    const k = Math.min(left, o.n - o.got);
    if (k <= 0) continue;
    takeCargo(s, it, k); o.got += k; left -= k; moved += k;
    lines.push({ it, n: k, kind: 'order' });
    delivered(g, id, it, k);
    if (o.got >= o.n) orderDone(g, id, o, pid);
  }
  if (oid == null && route) for (const d of N.deals) {
    if (left <= 0 || d.it !== it) continue;
    const k = Math.min(left, d.n - d.got);
    if (k <= 0) continue;
    const sum = Math.round(k * d.p);
    takeCargo(s, it, k); d.got += k; left -= k; moved += k;
    coinAdd(g, sum, 'na:' + npcPid(id), pid);
    lines.push({ it, n: k, sum, kind: 'deal' });
    delivered(g, id, it, k);
  }
  if (oid == null) {
    let sold = 0, sum = 0;
    while (left > 0) {
      const p = npcPays(g, id, it);
      if (!p) break;
      const m = Math.min(NPC_MARKET.chunk, left), gain = Math.round(p * m);
      takeCargo(s, it, m); left -= m; sold += m; sum += gain;
      coinAdd(g, gain, 'pv:' + npcPid(id), pid);
      N.sat[it] = r4(Math.min(NPC_MARKET.max, (N.sat[it] || 0) + NPC_MARKET.per * m / NPC_MARKET.step));
      addRep(g, id, gain / REP.sale);
    }
    if (sold) { moved += sold; ps.stats.sold = (ps.stats.sold || 0) + sold; lines.push({ it, n: sold, sum, kind: 'sell' }); delivered(g, id, it, sold); }
  }
  tradeDone(g, id, lines, quiet);
  return moved;
}
// Schiff s kauft am Steg bis zu want Stück der Ware it. Liefert die gekaufte Menge.
export function npcBuyTo(g, s, id, it, want, quiet) {
  const N = npcOf(g, id), pid = ownerOf(s);
  if (!N || npcGone(g, id)) return 0;
  let left = Math.min(Math.floor(want), npcStock(g, id, it), holdRoom(g, s, it)), n = 0, sum = 0;
  while (left > 0) {
    const p = npcAsks(g, id, it);
    if (!p) break;
    const m = Math.min(NPC_MARKET.chunk, left, Math.floor((pst(g, pid).coins | 0) / p));
    if (m <= 0) break;
    const cost = Math.round(p * m);
    addCargo(g, s, it, m); N.stock[it] -= m; left -= m; n += m; sum += cost;
    coinAdd(g, -cost, 'pk:' + npcPid(id), pid);
    N.dem[it] = r4(Math.min(NPC_MARKET.max, (N.dem[it] || 0) + NPC_MARKET.per * m / NPC_MARKET.step));
  }
  if (n) {
    const ps = pst(g, pid); ps.stats.bought = (ps.stats.bought || 0) + n; tradeDone(g, id, [{ it, n, sum, kind: 'buy' }], quiet);
    if (ITEMS[it].bell) storyEvent(g, 'buy', it);   // Teil der Taucherglocke gekauft (Ole: „Lass die Toten schlafen.“)
  }
  return n;
}
// Grund, warum am Steg nicht gekauft/verkauft werden kann ('' = geht)
export function npcWhy(g, id, it, sell) {
  const N = npcOf(g, id), name = npcName(id);
  if (!N || !npcKnown(g, id)) return `${name} kennt dich noch nicht.`;
  if (npcGone(g, id)) return goneWhy(g, id);
  const e = sell ? buyEntry(id, it) : sellEntry(id, it);
  if (!e || (!sell && !sellOpen(g, e))) return sell ? `${name} kauft kein ${ITEMS[it].name}.` : `${name} verkauft kein ${ITEMS[it].name}.`;
  if (!lvlOk(N, e.lvl)) return `${ITEMS[it].name}: erst, wenn ${name} dir ${e.lvl === 'neutral' ? 'nicht mehr misstraut' : `${e.lvl} gesinnt ist`} (Ruf: ${e.lvl}).`;
  return '';
}

// Warum ein Volk nach dem Ende nicht mehr handelt (Meldung)
export function goneWhy(g, id) {
  if (id === 'rat') return 'Den Inselrat gibt es nur, wenn das Leuchtfeuer brennt.';
  if (id === 'aurel') return endingOf(g) === 'a' ? 'Aurel ist fort. Mit ihm handelt niemand mehr.' : 'Aurel handelt nicht mehr. Seine Insel gehört jetzt dir.';
  return `Hier lebt niemand mehr. ${npcName(id)}s Dorf liegt in Ruinen.`;
}

/* ---------- Kommandos ---------- */
const failMsg = (g, msg) => g.events.push({ type: 'fail', msg });
// Schiff am Steg des Volks (shipId = genau dieses, sonst irgendeins), sonst null mit Meldung
function shipThere(g, id, shipId) {
  const P = npcPort(g, id), s = !P ? null : shipId != null ? g.state.ships.find(x => x.id === +shipId && x.st !== 'sail' && portOf(g, x) === P) : shipAtPort(g, P);
  if (!s) failMsg(g, `Leg erst mit einem Schiff an ${npcName(id)}s Steg an.`);
  return s || null;
}
// npcBuy: Plan oder Seekarte kaufen (ein Schiff muss am Steg liegen)
export function npcBuy(g, c) {
  const id = String(c.npc || ''), N = npcOf(g, id), key = String(c.key || '');
  if (!N || !NPC_TRADE[id]) return;
  if (!npcKnown(g, id)) { failMsg(g, `${npcName(id)} kennt dich noch nicht.`); return; }
  if (npcGone(g, id)) { failMsg(g, goneWhy(g, id)); return; }
  const s = shipThere(g, id, c.ship);
  if (!s) return;
  const pid = ownerOf(s), coins = pst(g, pid).coins | 0;
  if (key.startsWith('plan:')) {
    const P = PLANS[key.slice(5)], price = planPrice(key.slice(5));
    if (!P || P.npc !== id) return;
    if (g.state.unl && g.state.unl[key]) { failMsg(g, `${unlockName(key)}: hast du schon.`); return; }
    if (!lvlOk(N, P.lvl)) { failMsg(g, `${unlockName(key)}: ${npcName(id)} gibt den Plan erst ab Ruf „${P.lvl}“ her.`); return; }
    if (coins < price) { failMsg(g, `${unlockName(key)}: Es fehlen ${price - coins} Münzen.`); return; }
    coinAdd(g, -price, 'pk:' + npcPid(id), pid);
    unlock(g, key, 'npc');
    logLine(g, id, `${unlockName(key)} gekauft (−${price})`);
    storyEvent(g, 'trade', id);
    return;
  }
  // Relikt im Angebot (0.24.0, data/relics.js RELIC_SOURCES.npc): eins je Tag, kommt in die Reliktsammlung
  if (key === 'relic') {
    const C = RELIC_SOURCES.npc[id], O = N.relic, D = O && relicDef(O.id);
    if (!C) return;
    if (!lvlOk(N, C.lvl)) { failMsg(g, `Relikte: ${npcName(id)} zeigt dir seine Schätze erst ab Ruf „${C.lvl}“.`); return; }
    if (!D) { failMsg(g, `${npcName(id)} hat heute kein Relikt mehr. Morgen vielleicht wieder.`); return; }
    if (coins < O.price) { failMsg(g, `${D.name}: Es fehlen ${O.price - coins} Münzen.`); return; }
    const e = giveRelic(g, O.id, 'npc:' + id, true);
    N.relic = null;
    if (!e) { failMsg(g, `${D.name} gibt es nicht mehr: Jemand anderes hat es schon gefunden.`); return; }
    coinAdd(g, -O.price, 'pk:' + npcPid(id), pid);
    g.events.push({ type: 'relicGot', id: O.id, src: 'npc:' + id, to: '*' });
    logLine(g, id, `Relikt gekauft: ${D.name} (−${O.price})`);
    storyEvent(g, 'trade', id);
    return;
  }
  if (key === 'karte') {
    const C = NPC_TRADE[id].chart;
    if (!C) return;
    if (!lvlOk(N, C.lvl)) { failMsg(g, `Seekarte: ${npcName(id)} zeigt dir seine Karten erst ab Ruf „${C.lvl}“.`); return; }
    if (N.chart <= 0) { failMsg(g, `Seekarte: ${npcName(id)} hat heute keine Karte mehr. Morgen wieder.`); return; }
    if (coins < C.price) { failMsg(g, `Seekarte: Es fehlen ${C.price - coins} Münzen.`); return; }
    const I = chartTarget(g, pid);
    if (!I) { failMsg(g, `${npcName(id)} kennt keine Insel mehr, die du noch nicht entdeckt hast.`); return; }
    coinAdd(g, -C.price, 'pk:' + npcPid(id), pid);
    N.chart--;
    reveal(g, I.x, I.y, SEA_CHART.r, pid);
    g.events.push({ type: 'npcChart', npc: id, x: I.x, y: I.y, ring: I.ring });
    logLine(g, id, `Seekarte gekauft (−${C.price})`);
    storyEvent(g, 'trade', id);
  }
}
// Nächste noch unentdeckte Insel (Zellen nach Abstand zur Heimatinsel, höchstens SEA_CHART.cells weit)
function chartTarget(g, pid) {
  const found = pst(g, pid).found || {}, R = SEA_CHART.cells, cells = [];
  for (let cy = -R; cy <= R; cy++) for (let cx = -R; cx <= R; cx++) if (cx || cy) cells.push([cx * cx + cy * cy, cx, cy]);
  cells.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  for (const [, cx, cy] of cells) {
    const k = islId(cx, cy);
    if (found[k] || k === HOME_ISL || g.W.npcOf(k)) continue;
    const I = g.W.islandCell(cx, cy);
    if (I && I.tiles > 0) return I;
  }
  return null;
}
// npcDeliver: Ware für genau einen Auftrag abgeben
export function npcDeliver(g, c) {
  const id = String(c.npc || ''), N = npcOf(g, id);
  if (!N) return;
  if (npcGone(g, id)) { failMsg(g, goneWhy(g, id)); return; }
  const o = N.orders.find(x => x.id === +c.oid);
  if (!o) { failMsg(g, 'Diesen Auftrag gibt es nicht mehr.'); return; }
  const s = shipThere(g, id, c.ship);
  if (!s) return;
  if (!cargoOf(s, o.it)) { failMsg(g, `${s.name} hat kein ${ITEMS[o.it].name} an Bord.`); return; }
  npcSellFrom(g, s, id, o.it, Infinity, false, o.id);
}
// npcDeal: Liefervertrag abschließen (op 'take', Schiff am Steg) oder kündigen (op 'end')
export function npcDeal(g, c) {
  const id = String(c.npc || ''), N = npcOf(g, id), T = NPC_TRADE[id];
  if (!N || !T) return;
  const tpl = (T.deals || []).find(d => d.id === c.deal);
  if (!tpl) return;
  const i = N.deals.findIndex(d => d.id === tpl.id);
  if (c.op === 'end') {
    if (i < 0) return;
    N.deals.splice(i, 1);
    logLine(g, id, `Liefervertrag ${ITEMS[tpl.it].name} gekündigt`);
    g.events.push({ type: 'npcDeal', npc: id, it: tpl.it, ended: true, by: 'player', to: '*' });
    return;
  }
  if (i >= 0) return;
  if (!npcKnown(g, id)) { failMsg(g, `${npcName(id)} kennt dich noch nicht.`); return; }
  if (npcGone(g, id)) { failMsg(g, goneWhy(g, id)); return; }
  if (!lvlOk(N, tpl.lvl)) { failMsg(g, `Liefervertrag: erst ab Ruf „${tpl.lvl}“.`); return; }
  if (N.deals.length >= CONTRACTS.max) { failMsg(g, `Mit ${npcName(id)} höchstens ${CONTRACTS.max} Lieferverträge gleichzeitig.`); return; }
  if (!shipThere(g, id, c.ship)) return;
  N.deals.push({ id: tpl.id, it: tpl.it, n: tpl.n, p: r2(basePrice(tpl.it) * tpl.f), bonus: tpl.bonus, rep: tpl.rep, got: 0, miss: 0, fresh: true });
  logLine(g, id, `Liefervertrag: ${tpl.n} ${ITEMS[tpl.it].name} je Tag`);
  g.events.push({ type: 'npcDeal', npc: id, it: tpl.it, taken: true, n: tpl.n, to: '*' });
}
// Debug (nur Host): Ruf setzen
export function npcRepDebug(g, c) {
  const id = String(c.npc || ''), N = npcOf(g, id);
  if (!N) { failMsg(g, 'Debug: unbekanntes Volk oder keine Geschichte.'); return; }
  N.rep = r2(Math.max(0, Math.min(REP.max, +c.n || 0)));
  if (npcKnown(g, id)) levelCheck(g, id);
}

/* ---------- Tagesablauf ---------- */
function rnd(g, a, b) { const S = g.state.npc; return hash2(S.n * 131 + a, b, g.state.seed + 7019); }
// Neue Aufträge bis zur Zahl der Stufe (Vorlagen der Stufe, möglichst verschiedene Waren)
function fillOrders(g, id) {
  const N = npcOf(g, id), T = NPC_TRADE[id], S = g.state.npc, max = lvlOf(N).orders;
  let added = 0;
  while (N.orders.length < max) {
    const pool = T.orders.filter(o => lvlOk(N, o.lvl)), open = new Set(N.orders.map(o => o.it)), fresh = pool.filter(o => !open.has(o.it));
    const P = fresh.length ? fresh : pool;
    if (!P.length) break;
    S.n++;
    const tpl = P[Math.floor(rnd(g, 1, 2) * P.length)], [lo, hi] = tpl.n;
    const n = Math.max(ORDERS.round, Math.round((lo + rnd(g, 3, 4) * (hi - lo)) / ORDERS.round) * ORDERS.round);
    const o = { id: g.state.nextId++, it: tpl.it, n, got: 0, due: orderDue(g.state.time, tpl.days), pay: Math.round(n * basePrice(tpl.it) * tpl.pay), rep: tpl.rep };
    // Relikt als zusätzliche Belohnung (0.24.0): mit RELIC_SOURCES.orders.chance, Stufe je Volk
    const RT = RELIC_SOURCES.orders.tier[id];
    if (RT && rnd(g, 11, 12) < RELIC_SOURCES.orders.chance) { const r = rollRelic(g, RT, 13); if (r) o.relic = r; }
    N.orders.push(o);
    added++;
  }
  return added;
}
// Morgens: Lieferverträge für den Vortag abrechnen, Seekarten auffüllen, Geschenke, neue Aufträge
function dawn(g, id) {
  const N = npcOf(g, id), T = NPC_TRADE[id], host = 'host';
  for (const d of N.deals.slice()) {
    if (d.got >= d.n) {
      coinAdd(g, d.bonus, 'na:' + npcPid(id), host);
      addRep(g, id, d.rep);
      d.miss = 0;
      g.events.push({ type: 'npcDeal', npc: id, it: d.it, ok: true, coins: d.bonus, rep: d.rep, to: '*' });
      logLine(g, id, `Liefervertrag erfüllt: ${d.n} ${ITEMS[d.it].name} (+${d.bonus} Münzen, +${d.rep} Ruf)`);
    } else if (!d.fresh) {
      d.miss++;
      addRep(g, id, -CONTRACTS.missRep);
      const end = d.miss >= CONTRACTS.missMax;
      if (end) N.deals = N.deals.filter(x => x !== d);
      g.events.push({ type: 'npcDeal', npc: id, it: d.it, ok: false, got: d.got, n: d.n, rep: -CONTRACTS.missRep, ended: end, by: end ? 'npc' : undefined, to: '*' });
      logLine(g, id, `Liefervertrag verpasst: ${d.got} von ${d.n} ${ITEMS[d.it].name} (−${CONTRACTS.missRep} Ruf)${end ? ', gekündigt' : ''}`);
    }
    d.got = 0; d.fresh = false;
  }
  if (T.chart) N.chart = T.chart.n;
  const G = T.gift;
  if (G && lvlOk(N, G.lvl)) {
    // Akt 4 (seit 0.21.0): Aurels Geschenke werden größer und kommen öfter (gift.byAct)
    const A = (G.byAct && g.state.story && G.byAct[g.state.story.act]) || {}, chance = A.chance != null ? A.chance : G.chance, mul = A.mul || 1;
    for (let k = 0; k < (A.rolls || 1); k++) {
      g.state.npc.n++;
      if (rnd(g, 5, 6) >= chance) continue;
      const o = G.list[Math.floor(rnd(g, 7, 8) * G.list.length)], span = (r) => Math.round((r[0] + Math.floor(rnd(g, 9, 10) * (r[1] - r[0] + 1))) * mul);
      let what;
      if (o.coins) { const n = span(o.coins); coinAdd(g, n, 'ng:' + npcPid(id), host); what = { coins: n }; }
      else { const inv = islData(g, HOME_ISL).inv, n = Math.max(0, Math.min(span(o.n), Math.floor(capOf(g, HOME_ISL) - (inv[o.it] || 0)))); if (n) { inv[o.it] = (inv[o.it] || 0) + n; what = { it: o.it, n }; } }
      if (what) { g.events.push(Object.assign({ type: 'npcGift', npc: id, to: '*' }, what)); logLine(g, id, `Geschenk: ${what.coins ? `${what.coins} Münzen` : `${what.n} ${ITEMS[what.it].name}`}`); }
    }
  }
  const n = fillOrders(g, id);
  if (n) g.events.push({ type: 'npcOrders', npc: id, n, to: '*' });
}
// Dorf wächst mit den Lieferungen
function growCheck(g, id) {
  const N = npcOf(g, id), V = NPC_TRADE[id].village, st = villageStage(id, N.del);
  if (st <= N.vil) return;
  for (let i = N.vil; i < st; i++) placeVillage(g, id, V[i].add, addBuilding, 200 + i * 37, 26);
  N.vil = st;
  g.events.push({ type: 'npcVillage', npc: id, stage: st, max: V.length, to: '*' });
  logLine(g, id, `Das Dorf wächst (Stufe ${st} von ${V.length})`);
}
// Einmal je Sekunde (sim/sim.js), span = vergangene Spielzeit
export function npcTick(g, span) {
  const S = g.state.npc;
  if (!S || !g.state.story) return;
  const st = g.state, day = Math.floor(st.time / CYCLE), newDay = S.day != null && day > S.day, r = NPC_MARKET.recover * span / 60;
  if (S.day == null || day > S.day) S.day = day;
  for (const id of TRADERS) {
    const N = S[id], T = NPC_TRADE[id];
    if (!N || npcGone(g, id)) continue;   // nach dem Ende stillgelegt (sim/ending.js)
    for (const k of ['sat', 'dem']) for (const it in N[k]) { N[k][it] = r4(Math.max(0, N[k][it] - r)); if (N[k][it] <= 0) delete N[k][it]; }
    for (const e of T.sells) if (e.it && (N.stock[e.it] || 0) < e.n) N.stock[e.it] = r4(Math.min(e.n, (N.stock[e.it] || 0) + e.refill * span / 60));
    if (!npcKnown(g, id)) continue;
    // Erster Kontakt (Insel entdeckt): Stufe anwenden, erste Aufträge
    if (N.lv < 0) { levelCheck(g, id, true); fillOrders(g, id); continue; }
    // Abgelaufene Aufträge: Teillieferungen zum Grundpreis × partial
    for (const o of N.orders.slice()) if (st.time >= o.due) {
      N.orders = N.orders.filter(x => x !== o);
      const pay = Math.round(o.got * basePrice(o.it) * ORDERS.partial);
      if (pay) coinAdd(g, pay, 'na:' + npcPid(id), 'host');
      g.events.push({ type: 'npcOrderEnd', npc: id, it: o.it, got: o.got, n: o.n, coins: pay, to: '*' });
      logLine(g, id, `Auftrag abgelaufen: ${o.got} von ${o.n} ${ITEMS[o.it].name}${pay ? ` (+${pay})` : ''}`);
    }
    if (newDay) dawn(g, id);
    relicOffer(g, id, day);
  }
}
// Relikt im Angebot (0.24.0): ab der Rufstufe aus RELIC_SOURCES.npc einmal je Tag eins auswählen, wenn keins da ist.
// Ein legendäres, das inzwischen anderswo gefunden wurde, verschwindet aus dem Angebot.
function relicOffer(g, id, day) {
  const N = npcOf(g, id), C = RELIC_SOURCES.npc[id], S = g.state.relics;
  if (!C || !S) return;
  if (N.relic && (!relicDef(N.relic.id) || (isLegend(N.relic.id) && S.got[N.relic.id]))) N.relic = null;
  if (N.relic || N.rday === day || !lvlOk(N, C.lvl)) return;
  N.rday = day;
  const r = rollRelic(g, C.tier, 21 + TRADERS.indexOf(id), offeredRelics(g));
  if (r) { N.relic = { id: r, price: C.price }; g.events.push({ type: 'relicOffer', npc: id, id: r, to: '*' }); }
}
