/* ---------- Stromnetz: Masten, Kabel, Erzeuger, Batterien, Verbraucher ---------- */
import { WIRE_RANGE, POLE_LINKS } from '../config.js';
import { storeOf } from './mods.js';
import { ownerOf } from './state.js';
import { BD, POWER_USE, GENS } from '../data/buildings.js';
import { flowPower } from './stats.js';
import { fxPower } from './relics.js';

export const isPowered = (t) => t === 'mast' || GENS.has(t) || t === 'batterie' || POWER_USE[t] != null;
export function nets(g) {
  if (g.netVer === g.wireVer) return g.NETS;
  g.NETS = [];
  const seen = new Set();
  for (const b of g.blds.values()) {
    if (!isPowered(b.t) || seen.has(b.id)) continue;
    const net = { gens: [], bats: [], cons: [], poles: [] }, q = [b];
    seen.add(b.id);
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      c._net = net;
      (GENS.has(c.t) ? net.gens : c.t === 'batterie' ? net.bats : c.t === 'mast' ? net.poles : net.cons).push(c);
      for (const id of c.links || []) { const o = g.blds.get(id); if (o && !seen.has(o.id)) { seen.add(o.id); q.push(o); } }
    }
    g.NETS.push(net);
  }
  g.netVer = g.wireVer;
  return g.NETS;
}
export function netOf(g, b) { nets(g); return b._net || null; }
export const netStore = (n) => n ? n.gens.concat(n.bats) : [];
export function netStored(n) { return netStore(n).reduce((a, s) => a + (s.e || 0), 0); }
// Speicher je Erzeuger/Batterie (mit Upgrades, sim/mods.js)
export function netCap(g, n) { return n ? netStore(n).reduce((a, s) => a + storeOf(g, s.t, ownerOf(s)), 0) : 0; }
export function netDraw(n, amt) {
  if (!n || netStored(n) < amt) return false;
  for (const s of netStore(n)) { const t = Math.min(s.e || 0, amt); s.e = (s.e || 0) - t; amt -= t; if (amt <= 1e-9) break; }
  return true;
}
// Verbraucher zieht amt Strom aus seinem Netz; Bedarf und Versorgung werden für die Strom-Anzeige gezählt
// Relikte der Insel (sim/relics.js fxPower): weniger Verbrauch, „Die erste Flamme“: gar keiner (zählt dann weder als Bedarf noch als Versorgung)
export function drawPower(g, b, amt) {
  const f = fxPower(g, b.isl);
  if (f <= 0) return true;
  amt *= f;
  b._pq = (b._pq || 0) + amt;
  const ok = netDraw(netOf(g, b), amt);
  if (ok) b._ps = (b._ps || 0) + amt;
  return ok;
}
// Erzeugter Strom in den eigenen Speicher, dann in die Batterien des Netzes. Was nicht mehr passt, wird verworfen (_pd, Anzeige „Überschuss verworfen“).
export function addEnergy(g, inc, amt) {
  inc._pg = (inc._pg || 0) + amt;
  const t = Math.max(0, Math.min(storeOf(g, inc.t, ownerOf(inc)) - (inc.e || 0), amt));
  inc.e = (inc.e || 0) + t; amt -= t;
  const n = netOf(g, inc);
  if (n) for (const bt of n.bats) { if (amt <= 0) break; const tt = Math.max(0, Math.min(storeOf(g, 'batterie', ownerOf(bt)) - (bt.e || 0), amt)); bt.e = (bt.e || 0) + tt; amt -= tt; }
  if (amt > 1e-9) inc._pd = (inc._pd || 0) + amt;
}
export function islPower(g, k) {
  let e = 0, cap = 0;
  for (const b of g.blds.values()) if (b.isl === k && (GENS.has(b.t) || b.t === 'batterie')) { e += b.e || 0; cap += storeOf(g, b.t, ownerOf(b)); }
  return { e, cap };
}
export function bdist(a, b) {
  const A = BD[a.t], B = BD[b.t];
  const dx = Math.max(0, a.x - (b.x + B.w - 1), b.x - (a.x + A.w - 1)), dy = Math.max(0, a.y - (b.y + B.h - 1), b.y - (a.y + A.h - 1));
  return Math.max(dx, dy);
}
export const linkCount = (b) => (b.links || []).length;
export function canLink(a, b) {
  if (a === b) return 'Das ist dasselbe Gebäude.';
  if (!isPowered(a.t) || !isPowered(b.t)) return 'Dieses Gebäude nutzt keinen Strom.';
  if (a.t !== 'mast' && b.t !== 'mast') return 'Kabel laufen immer über einen Strommast.';
  if (a.isl !== b.isl) return 'Kabel reichen nicht über das Meer.';
  if ((a.t === 'mast' && linkCount(a) >= POLE_LINKS) || (b.t === 'mast' && linkCount(b) >= POLE_LINKS)) return 'Ein Strommast hat höchstens 4 Verbindungen.';
  if (bdist(a, b) > WIRE_RANGE) return `Zu weit entfernt (max. ${WIRE_RANGE} Felder).`;
  return null;
}
export function link(g, a, b) {
  a.links = a.links || []; b.links = b.links || [];
  if (a.links.includes(b.id)) return;
  a.links.push(b.id); b.links.push(a.id); g.wireVer++;
}
export function unlink(g, a, b) {
  a.links = (a.links || []).filter(x => x !== b.id); b.links = (b.links || []).filter(x => x !== a.id); g.wireVer++;
}
// Neuer Mast: zum nächsten Mast und zu unverkabelten Gebäuden. Neues Gebäude: zum nächsten Mast.
export function autoLink(g, b) {
  const cands = [...g.blds.values()].filter(o => o !== b && o.isl === b.isl && isPowered(o.t) && bdist(b, o) <= WIRE_RANGE).sort((p, q) => bdist(b, p) - bdist(b, q));
  if (b.t === 'mast') {
    const pole = cands.find(o => o.t === 'mast' && !canLink(b, o));
    if (pole) link(g, b, pole);
    for (const o of cands) { if (linkCount(b) >= POLE_LINKS) break; if (o.t !== 'mast' && linkCount(o) === 0 && !canLink(b, o)) link(g, b, o); }
  } else {
    const pole = cands.find(o => o.t === 'mast' && !canLink(b, o));
    if (pole) link(g, b, pole);
  }
}

/* ---------- Strom-Anzeige (einmal pro Sekunde aus sim/sim.js) ---------- */
// Zähler der letzten Sekunde → _PG (erzeugt/s), _PQ (Bedarf/s), _PS (versorgt/s), _PD (verworfen/s, Speicher voll).
// Verbrennung/Dampfkraftwerk: _bm = verbrannte Items und _bvm = verbrannter Brennwert der letzten 60 s.
const BURN_RING = 60;
export function powerRoll(g, span) {
  const isl = {};
  for (const b of g.blds.values()) {
    if (!isPowered(b.t)) continue;
    b._PG = (b._pg || 0) / span; b._PQ = (b._pq || 0) / span; b._PS = (b._ps || 0) / span; b._PD = (b._pd || 0) / span;
    b._pg = 0; b._pq = 0; b._ps = 0; b._pd = 0;
    if (b.t === 'verbrennung' || b.t === 'kraftwerk') {
      const r = b._br || (b._br = []);
      r.push([b._bn || 0, b._bv || 0]); if (r.length > BURN_RING) r.shift();
      b._bn = 0; b._bv = 0;
      let n = 0, v = 0;
      for (const x of r) { n += x[0]; v += x[1]; }
      b._bm = n; b._bvm = v; b._bs = r.length;
    }
    if (b._PG || b._PQ) { const o = isl[b.isl] || (isl[b.isl] = [0, 0, 0, 0]); o[0] += b._PG; o[1] += b._PQ; o[2] += b._PS; o[3] += b._PD; }
  }
  for (const k in isl) flowPower(g, +k, isl[k][0] * span, isl[k][1] * span, isl[k][2] * span, isl[k][3] * span);
}
// Übersicht eines Netzes (auch auf dem Spiegel): erzeugt (gesamt), Bedarf, versorgt, verworfen, genutzt (= erzeugt − verworfen; je s), Speicher, Kapazität, Bilanz
export function netSummary(g, n) {
  if (!n) return null;
  let gen = 0, dem = 0, sup = 0, lost = 0;
  for (const b of n.gens) { gen += b._PG || 0; lost += b._PD || 0; }
  for (const b of n.cons) { dem += b._PQ || 0; sup += b._PS || 0; }
  const e = netStored(n), cap = netCap(g, n), bal = gen - dem;
  return { gen, dem, sup, lost, used: Math.max(0, gen - lost), e, cap, bal, ok: bal >= -0.05, empty: bal < -0.05 ? e / -bal : null, full: bal > 0.05 && lost < 0.05 ? (cap - e) / bal : null };
}
