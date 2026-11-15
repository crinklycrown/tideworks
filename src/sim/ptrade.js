/* =========================================================
   HANDEL ZWISCHEN SPIELERN (Getrennte Inseln)
   Preisliste eines Handelskontors: b.pl = { sell: [{ it, p, keep }], buy: [{ it, p, upto }] }
     sell = der Besitzer verkauft an Partner: Ware it zu p Münzen je Stück, keep Stück bleiben im Handelskontor
     buy  = der Besitzer kauft von Partnern: Ware it zu p je Stück, bis der Bestand upto erreicht
   Schiffe von Partnern handeln dort ohne Rückfrage: Laden = kaufen (der Käufer zahlt dem Besitzer, so viel er bezahlen kann),
   Entladen = verkaufen (der Besitzer zahlt, bis zur Menge der Liste und solange er Münzen hat). Waren, die nicht in der Liste
   stehen, werden nicht gehandelt. Jedes Geschäft: Münzbuch beider Seiten (pk:<Verkäufer> „Kauf von …“, pv:<Käufer> „Verkauf an …“)
   und eine Chat-Zeile (Ereignis ptrade an beide).
   Die Abfragen (Vorschau im Routen-Editor) laufen auch auf dem Spiegel; dort ist nur die eigene Kasse bekannt.
   ========================================================= */
import { ITEMS } from '../data/items.js';
import { PLAYER_TRADE } from '../data/trade.js';
import { ownerOf, isSep, actor, mine, pst } from './state.js';
import { stockOf, stockRead, storeCap } from './kontor.js';
import { coinAdd } from './coins.js';
import { holdRoom, addCargo, takeCargo, cargoOf } from './ships.js';

// Fremdes Handelskontor mit Preisliste aus Sicht von pid?
export const isPartnerShop = (g, P, pid) => isSep(g) && !!P && P.t === 'handelskontor' && ownerOf(P) !== (pid || actor(g));
export const plSell = (P, it) => (P && P.pl && P.pl.sell || []).find(o => o.it === it) || null;
export const plBuy = (P, it) => (P && P.pl && P.pl.buy || []).find(o => o.it === it) || null;
// Kasse von pid; auf dem Spiegel ist nur die eigene bekannt (sonst unbegrenzt)
const purse = (g, pid) => g.mirror && pid !== actor(g) ? Infinity : pst(g, pid).coins | 0;
const afford = (coins, p) => p > 0 ? Math.floor(coins / p) : Infinity;
// Stück, die pid jetzt kaufen könnte (ohne Laderaum)
export function buyable(g, P, it, pid) {
  const o = plSell(P, it);
  if (!o) return 0;
  // Spiegel: fremder Bestand ist unbekannt, der Host schickt die verfügbare Menge je Zeile (av, sim/privacy.js)
  const av = g.mirror && P.av ? P.av[P.pl.sell.indexOf(o)] || 0 : Math.floor(stockRead(g, P)[it] || 0) - o.keep;
  return Math.max(0, Math.min(av, afford(purse(g, pid), o.p)));
}
// Stück, die der Besitzer jetzt ankaufen würde
export function sellable(g, P, it) {
  const o = plBuy(P, it);
  if (!o) return 0;
  const room = g.mirror && P.room ? P.room[P.pl.buy.indexOf(o)] || 0 : Math.min(o.upto, storeCap(g, P)) - Math.floor(stockRead(g, P)[it] || 0);
  return Math.max(0, Math.min(room, afford(purse(g, ownerOf(P)), o.p)));
}
function deal(g, P, buyer, seller, it, n, p) {
  const sum = Math.round(n * p);
  if (sum) { coinAdd(g, -sum, 'pk:' + seller, buyer); coinAdd(g, sum, 'pv:' + buyer, seller); }
  g.events.push({ type: 'ptrade', to: [buyer, seller], buyer, seller, it, n, sum, isl: P.isl });
}
// Schiff s kauft am Handelskontor P bis zu want Stück; liefert die Menge
export function buyFrom(g, s, P, it, want) {
  const o = plSell(P, it), n = Math.min(Math.floor(want), buyable(g, P, it, ownerOf(s)), holdRoom(g, s, it));
  if (!o || n <= 0) return 0;
  stockOf(g, P)[it] -= n; addCargo(g, s, it, n);
  deal(g, P, ownerOf(s), ownerOf(P), it, n, o.p);
  return n;
}
// Schiff s verkauft am Handelskontor P bis zu want Stück; liefert die Menge
export function sellTo(g, s, P, it, want) {
  const o = plBuy(P, it), n = Math.min(Math.floor(want), sellable(g, P, it), cargoOf(s, it));
  if (!o || n <= 0) return 0;
  const inv = stockOf(g, P);
  takeCargo(s, it, n); inv[it] = (inv[it] || 0) + n;
  deal(g, P, ownerOf(P), ownerOf(s), it, n, o.p);
  return n;
}

/* ---------- Kommando 'setPrices' (nur der Besitzer) ---------- */
const price = (v) => Math.max(0, Math.min(PLAYER_TRADE.maxPrice, Math.round((+v || 0) / PLAYER_TRADE.step) * PLAYER_TRADE.step));
const qty = (v) => Math.max(0, Math.min(99999, Math.floor(+v) || 0));
function cleanList(L, f) {
  const seen = new Set(), out = [];
  for (const o of Array.isArray(L) ? L : []) {
    if (!o || !ITEMS[o.it] || seen.has(o.it) || out.length >= PLAYER_TRADE.lines) continue;
    seen.add(o.it);
    out.push(Object.assign({ it: o.it, p: Math.round(price(o.p) * 10) / 10 }, { [f]: qty(o[f]) }));
  }
  return out;
}
export function setPrices(g, b, pl) {
  if (!b || b.t !== 'handelskontor') return;
  if (!mine(g, b)) { g.events.push({ type: 'fail', msg: 'Die Preisliste stellt nur der Besitzer ein.' }); return; }
  const sell = cleanList(pl && pl.sell, 'keep'), buy = cleanList(pl && pl.buy, 'upto');
  if (sell.length || buy.length) b.pl = { sell, buy }; else delete b.pl;
}
