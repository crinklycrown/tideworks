/* =========================================================
   SOLL-RATEN: was die Gebäude einer Insel nach Plan je Minute erzeugen (+) und verbrauchen (−)
   Rezepte: Menge × 60 / Dauer × Stromfaktor (optionaler Strom: ×2 mit Strom; nötiger Strom: 0 ohne Netz mit Erzeuger/Speicher).
   Bohrer: Rate × Felder × Upgrades × Schmiermittel. Sägewerk: reife Bäume × Rate. Fischer und Pumpen: ihre Raten.
   Häuser: Bedarf und Plan je Prüfintervall. Stillstehende Gebäude zählen voll, ihr Anteil steht zusätzlich als „davon blockiert“.
   Ergebnis: g.SOLL[Insel][Ware] = [Soll/min, davon blockiert/min]. Wird nicht gespeichert, nur im Snapshot übertragen.
   Kein DOM-Zugriff.
   ========================================================= */
import { RECIPES_OF, OPT_BOOST, recipePower, recipeOf } from '../data/recipes.js';
import { DRILLS, SAW, FISHER, HOUSES } from '../data/mining.js';
import { PUMPS } from '../data/fluids.js';
import { mods, rateOf } from './mods.js';
import { ownerOf } from './state.js';
import { netOf, netStored } from './power.js';
import { pumpRate } from './fluids.js';

// Hat das Gebäude ein Stromnetz mit Erzeuger oder gefülltem Speicher?
function powered(g, b) { const n = netOf(g, b); return !!n && (n.gens.length > 0 || netStored(n) > 0); }

// Raten eines Gebäudes je Minute: { rates: { Ware: n }, blocked: bool }
export function bldRates(g, b) {
  const o = {}, add = (it, n) => { if (n) o[it] = (o[it] || 0) + n; };
  let blocked = false;
  if (RECIPES_OF[b.t]) {
    const R = recipeOf(b);
    if (R) {
      const P = recipePower(R);
      let f = 1;
      if (P.use) { const pw = powered(g, b); f = P.need ? (pw ? 1 : 0) : (pw ? OPT_BOOST : 1); }
      for (const it in R.in) add(it, -R.in[it] * 60 / R.t * f);
      for (const it in R.out) add(it, R.out[it] * 60 / R.t * f);
      blocked = b._st === 'wait' || b._st === 'full' || b._st === 'power';
    }
  } else if (DRILLS[b.t]) {
    const D = DRILLS[b.t], L = D.lube;
    if (b._ot) {
      const pw = !D.power || powered(g, b), lub = L && (b._lub || (b.lt || 0) > 0 || (b.buf[L.it] || 0) >= 1);
      const f = (pw ? 1 : 0) * (lub ? 1 + (L.boost || 0) : 1);
      add(b._ot, D.rate * rateOf(g, b.t, ownerOf(b)) * (b._oc || 0) * f * 60);
      if (L && lub && f) add(L.it, -60 / L.every);
    }
    blocked = !!b._st && b._st !== 'none';
  } else if (b.t === 'saege') {
    add('holz', SAW.rate * (b._m || 0) * 60);
    blocked = (b.out.holz || 0) >= SAW.buf;
  } else if (b.t === 'fischer') {
    add('fisch', (b._fr || 0) * rateOf(g, 'fischer', ownerOf(b)) * 60);
    blocked = (b.out.fisch || 0) >= FISHER.buf;
  } else if (PUMPS[b.t]) {
    const P = PUMPS[b.t], pw = !P.power || powered(g, b);
    add(P.out, pumpRate(b) * (pw ? 60 : 0));
    blocked = !!b._st;
  } else if (HOUSES[b.t]) {
    const H = HOUSES[b.t], per = 60 / mods(g, ownerOf(b)).houseEvery;
    for (const r in H.need) add(r, -H.need[r] * per);
    add(H.gives, per);
    blocked = !b.sup || !!b.full;
  }
  return { rates: o, blocked };
}
export function computeSoll(g) {
  const S = {};
  for (const b of g.blds.values()) {
    const r = bldRates(g, b);
    for (const it in r.rates) {
      const I = S[b.isl] || (S[b.isl] = {}), e = I[it] || (I[it] = [0, 0]);
      e[0] += r.rates[it];
      if (r.blocked) e[1] += r.rates[it];
    }
  }
  g.SOLL = S;
  return S;
}
