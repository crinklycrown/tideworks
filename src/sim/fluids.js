/* =========================================================
   FLÜSSIGKEITEN: Rohrnetze, Tanks und der Austausch mit Gebäuden
   Rohre liegen auf einer eigenen Felderebene (g.pipes, world/layers.js PipeLayer), Tanks sind Gebäude.
   Netz = zusammenhängende Rohr- und Tankfelder (4 Richtungen). Jedes Netz führt genau eine Flüssigkeit
   (die erste, die hineingelangt; leer = frei), Speicher = PIPE_CAP je Rohrfeld + TANK_CAP je Tank,
   Durchsatz = Tempo des langsamsten Rohrs. Säure nur in Netzen, die ganz aus säurefesten Rohren bestehen.
   Gebäude mit Flüssigkeiten (FLUID_BUILDINGS) haben kleine Puffer: b.fi (rein) und b.fo (raus), je { Flüssigkeit: Einheiten }.
   Sie hängen an allen Netzen, die an ihre Grundfläche grenzen (b._pn).
   Die Netze werden nur neu berechnet, wenn sich g.pipeVer ändert (Bau/Abriss von Rohren und Flüssigkeits-Gebäuden),
   der Inhalt wird dabei anteilig auf die neuen Netze verteilt. Simulation und Spiegel nutzen dieselbe Berechnung;
   der Inhalt der Netze kommt im Snapshot (fnets, Schlüssel = kleinster Feldschlüssel des Netzes).
   Kein DOM-Zugriff.
   ========================================================= */
import { FLUIDS, PIPES, PIPE_BY_TIER, PIPE_CAP, TANK_CAP, NET_RATE_FREE, ACID, FLUID_BUILDINGS, PUMPS, KRAFTWERK, FLUID_BUF } from '../data/fluids.js';
import { BD } from '../data/buildings.js';
import { DRILLS } from '../data/mining.js';
import { recipeOf, fluidCap } from '../data/recipes.js';
import { CS, CS2, CSH, ckx, cky, tk, tkx, tky, TK_DY } from '../util/tiles.js';
import { perim } from '../util/math.js';
import { flowAdd } from './stats.js';
import { pst, ownerOf } from './state.js';

const EPS = 1e-9;
export const isFluidB = (t) => FLUID_BUILDINGS.has(t);
export const accepts = (n, f) => f !== ACID || n.acidOk;
export const pipeRate = (tier) => PIPES[PIPE_BY_TIER[tier]].rate;

// Förderung einer Pumpe (Einheiten/s): Wasserpumpe fest, Saugpumpe je Ölfeld (b._oc)
export function pumpRate(b) {
  const P = PUMPS[b.t];
  if (!P) return 0;
  return P.perTile ? Math.min(P.max, P.perTile * (b._oc || 0)) : P.rate;
}
// Anschlüsse eines Gebäudes: { in: { Flüssigkeit: Puffergröße }, out: { … } }
export function fluidPorts(b) {
  const o = { in: {}, out: {} };
  if (PUMPS[b.t]) { const r = pumpRate(b); if (r) o.out[PUMPS[b.t].out] = FLUID_BUF * r; }
  else if (b.t === 'kraftwerk') o.in.wasser = FLUID_BUF * KRAFTWERK.water;
  else if (DRILLS[b.t] && DRILLS[b.t].water) o.in.wasser = FLUID_BUF * DRILLS[b.t].water;
  else {
    const R = recipeOf(b);
    if (R) { for (const f in R.fin || {}) o.in[f] = fluidCap(R.fin[f]); for (const f in R.fout || {}) o.out[f] = fluidCap(R.fout[f]); }
  }
  return o;
}

/* ---------- Netze ---------- */
// Felder je Rohr (Kachel-Schlüssel) über alle Chunks der Rohrebene
function forPipes(g, fn) {
  for (const [key, c] of g.pipes.m) {
    const X = ckx(key) << CSH, Y = cky(key) << CSH;
    for (let i = 0; i < CS2; i++) if (c[i]) fn(tk(X + (i & (CS - 1)), Y + (i >> CSH)), c[i]);
  }
}
// { nets, tile: Map(Feld → Netz), fbs: Flüssigkeits-Gebäude ohne Tanks }
export function pipeNets(g) {
  if (g.PN && g.pnVer === g.pipeVer) return g.PN;
  const old = g.PN, tankAt = new Map(), tile = new Map(), nets = [], fbs = [];
  for (const b of g.blds.values()) {
    if (!isFluidB(b.t)) continue;
    if (b.t !== 'tank') { fbs.push(b); continue; }
    const d = BD[b.t];
    for (let dy = 0; dy < d.h; dy++) for (let dx = 0; dx < d.w; dx++) tankAt.set(tk(b.x + dx, b.y + dy), b);
  }
  const node = (k) => g.pipes.getK(k) || tankAt.has(k);
  const grow = (start) => {
    const n = { rep: start, isl: g.W.ilK(start), keys: [], pipes: 0, tanks: [], minTier: 9, cap: 0, rate: 0, acidOk: true, fluid: null, amt: 0, flow: 0, bs: [] };
    const q = [start];
    tile.set(start, n);
    for (let h = 0; h < q.length; h++) {
      const k = q[h];
      n.keys.push(k);
      if (k < n.rep) n.rep = k;
      const tier = g.pipes.getK(k);
      if (tier) { n.pipes++; n.minTier = Math.min(n.minTier, tier); if (!PIPES[PIPE_BY_TIER[tier]].acid) n.acidOk = false; }
      else { const tb = tankAt.get(k); if (!n.tanks.includes(tb.id)) n.tanks.push(tb.id); }
      for (const o of [k - 1, k + 1, k - TK_DY, k + TK_DY]) if (!tile.has(o) && node(o)) { tile.set(o, n); q.push(o); }
    }
    n.cap = n.pipes * PIPE_CAP + n.tanks.length * TANK_CAP;
    n.rate = n.pipes ? pipeRate(n.minTier) : NET_RATE_FREE;
    nets.push(n);
  };
  forPipes(g, (k) => { if (!tile.has(k)) grow(k); });
  for (const k of tankAt.keys()) if (!tile.has(k)) grow(k);
  // Gebäude an angrenzende Netze hängen
  for (const b of g.blds.values()) {
    if (b.t === 'tank') { const n = tile.get(tk(b.x, b.y)); b._pn = n ? [n] : []; continue; }
    if (!isFluidB(b.t)) continue;
    const d = BD[b.t], pn = [];
    for (const p of perim(b.x, b.y, d.w, d.h)) { const n = tile.get(tk(p.x, p.y)); if (n && !pn.includes(n)) pn.push(n); }
    b._pn = pn;
    for (const n of pn) n.bs.push(b.id);
  }
  // Inhalt der alten Netze anteilig übernehmen (je Feld sein Anteil am Speicher); bei gemischten Flüssigkeiten gewinnt die größere Menge
  if (old) for (const n of nets) {
    const by = {};
    for (const k of n.keys) {
      const on = old.tile.get(k);
      if (!on || !on.fluid || !on.amt || !on.cap) continue;
      const share = g.pipes.getK(k) ? PIPE_CAP : TANK_CAP / (BD.tank.w * BD.tank.h);
      by[on.fluid] = (by[on.fluid] || 0) + on.amt * share / on.cap;
    }
    let best = null;
    for (const f in by) if (!best || by[f] > by[best]) best = f;
    if (best && accepts(n, best)) { n.fluid = best; n.amt = Math.min(n.cap, by[best]); if (n.amt < 1e-6) { n.amt = 0; n.fluid = null; } }
  }
  g.PN = { nets, tile, fbs, byRep: new Map(nets.map(n => [n.rep, n])) };
  g.pnVer = g.pipeVer;
  return g.PN;
}
export const netAt = (g, x, y) => pipeNets(g).tile.get(tk(x, y)) || null;

/* ---------- Schutz beim Bauen ----------
   Ein neues Rohr oder ein Tank verbindet alle Netze, die an seine Felder grenzen (ein ersetztes Rohr gehört mit dazu).
   Abgelehnt wird, was ein Netz zerstören würde: Säure in einem Netz mit Rohren unter Mk3 oder zwei verschiedene Flüssigkeiten in einem Netz.
   tiles = Felder des neuen Teils (Kachel-Schlüssel), acidOk = ist das neue Teil selbst säurefest (Tank, Rohr Mk3).
   Liefert den Grund (Text) oder null. Leere Netze schränken nichts ein. */
export function netGuard(g, tiles, acidOk) {
  const P = pipeNets(g), own = new Set(tiles), nets = [];
  for (const k of tiles) for (const o of [k, k - 1, k + 1, k - TK_DY, k + TK_DY]) {
    if (o !== k && own.has(o)) continue;
    const n = P.tile.get(o);
    if (n && !nets.includes(n)) nets.push(n);
  }
  const full = nets.filter(n => n.fluid && n.amt > 1e-6), kinds = [...new Set(full.map(n => n.fluid))];
  if (kinds.length > 1) return `Würde ${FLUIDS[kinds[0]].name} und ${FLUIDS[kinds[1]].name} mischen – erst ein Netz leeren.`;
  if (kinds[0] === ACID) {
    if (!acidOk) return 'Würde das Säurenetz zerstören – hier nur Rohr Mk3.';
    // das ersetzte Rohr zählt nicht; jedes andere Netz, das dazukäme, muss ganz säurefest sein
    if (nets.some(n => !n.acidOk && n.fluid !== ACID)) return 'Würde das Säurenetz zerstören – das angrenzende Netz hat Rohre unter Mk3.';
  }
  return null;
}

// Netz leeren: Inhalt verwerfen (zählt in der Statistik als verbraucht, Quelle „leeren“)
export function drainNet(g, n) {
  if (!n || !n.amt) return;
  flowAdd(g, n.isl, 'c', n.fluid, n.amt, 'leeren');
  n.amt = 0; n.fluid = null;
}

// Gespeicherte Menge einer Flüssigkeit in Netzen und Tanks einer Insel (k = -1: alle Inseln) und deren Speicher
export function fluidStock(g, k, f) {
  let n = 0, cap = 0;
  for (const net of pipeNets(g).nets) if ((k < 0 || net.isl === k) && net.fluid === f) { n += net.amt; cap += net.cap; }
  return { n, cap };
}
// Erzeugte Flüssigkeit eines Gebäudes zählen (Ziele, Statistik „Produktion“)
export function madeFluid(g, b, f, n) {
  if (n <= 0) return;
  const M = pst(g, ownerOf(b)).stats.made;
  M[f] = (M[f] || 0) + n;
  flowAdd(g, b.isl, 'm', f, n, b.t);
}

/* ---------- Austausch je Takt ---------- */
// Nach den Gebäude-Ticks: Erzeuger schieben aus b.fo ins Netz, Verbraucher ziehen nach b.fi.
// Je Netz und Richtung höchstens Durchsatz × dt, begrenzt durch freien Speicher bzw. Inhalt; reicht es nicht, anteilig.
export function fluidStep(g, dt) {
  const P = pipeNets(g);
  if (!P.nets.length) return;
  for (const n of P.nets) { n._off = null; n._dem = null; n._claim = null; n._io = 0; }
  // Erzeuger
  for (const b of P.fbs) {
    b._acid = false;
    for (const f in b.fo) {
      const a = b.fo[f];
      if (!(a > EPS)) continue;
      const pn = b._pn || [];
      const n = pn.find(x => x.fluid === f && accepts(x, f) && x.amt < x.cap - EPS) || pn.find(x => !x.fluid && accepts(x, f) && (!x._claim || x._claim === f));
      if (!n) { if (f === ACID && pn.length && !pn.some(x => x.acidOk)) b._acid = true; continue; }
      if (!n.fluid) n._claim = f;
      (n._off || (n._off = [])).push({ b, f, a });
    }
  }
  for (const n of P.nets) {
    if (!n._off) continue;
    const f = n.fluid || n._claim;
    let tot = 0;
    for (const o of n._off) if (o.f === f) tot += o.a;
    const can = Math.min(tot, n.rate * dt, n.cap - n.amt);
    if (!(can > EPS)) continue;
    const k = can / tot;
    for (const o of n._off) if (o.f === f) { const t = o.a * k; o.b.fo[f] -= t; flowAdd(g, n.isl, 'p', f, t, o.b.t); }
    n.amt += can; n.fluid = f; n._io = can;
  }
  // Verbraucher
  for (const b of P.fbs) {
    const ports = fluidPorts(b).in;
    for (const f in ports) {
      const d = ports[f] - (b.fi[f] || 0);
      if (!(d > EPS)) continue;
      const pn = b._pn || [];
      if (f === ACID && pn.length && !pn.some(x => x.acidOk)) b._acid = true;
      const n = pn.filter(x => x.fluid === f && x.amt > EPS).sort((p, q) => q.amt - p.amt)[0];
      if (n) (n._dem || (n._dem = [])).push({ b, f, d });
    }
  }
  for (const n of P.nets) {
    if (n._dem) {
      let tot = 0;
      for (const o of n._dem) tot += o.d;
      const give = Math.min(tot, n.rate * dt, n.amt);
      if (give > EPS) {
        const k = give / tot;
        for (const o of n._dem) { const t = o.d * k; o.b.fi[o.f] = (o.b.fi[o.f] || 0) + t; flowAdd(g, n.isl, 'c', o.f, t, o.b.t); }
        n.amt -= give; n._io = Math.max(n._io, give);
      }
    }
    if (n.amt < 1e-6) { n.amt = 0; n.fluid = null; }
    // aktueller Durchsatz (Einheiten/s), geglättet
    n.flow += (n._io / dt - n.flow) * 0.1;
  }
}

/* ---------- Spielstand und Snapshot ---------- */
// Inhalt aller Netze: [{ t: Feld des Netzes, f, n }]
export function netContents(g) {
  return pipeNets(g).nets.filter(n => n.fluid && n.amt > 0).map(n => ({ t: n.rep, f: n.fluid, n: Math.round(n.amt * 1000) / 1000 }));
}
// Beim Laden: Inhalte auf die neu berechneten Netze verteilen (Feld → Netz)
export function restoreContents(g, list) {
  const P = pipeNets(g);
  for (const o of Array.isArray(list) ? list : []) {
    const n = o && P.tile.get(o.t);
    if (!n || !FLUIDS[o.f] || !(o.n > 0) || (n.fluid && n.fluid !== o.f) || !accepts(n, o.f)) continue;
    n.fluid = o.f; n.amt = Math.min(n.cap, n.amt + o.n);
  }
}
