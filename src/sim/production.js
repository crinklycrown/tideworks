/* =========================================================
   PRODUKTION & HÄUSER: Rezepte (data/recipes.js), Bohrer, Sägewerk, Fischer, Häuser, Werft, Verbrennung,
   Pumpen, Dampfkraftwerk, Geothermie
   Zahlen stehen in data/recipes.js, data/mining.js und data/fluids.js.
   Laufzeit-Status je Gebäude (für Info-Panel und Renderer):
     _act = arbeitet gerade, _pw = bekommt Strom, _wf = fehlende Flüssigkeit, _lub = geschmiert,
     _st  = '' (produziert) | 'wait' (Zutaten fehlen) | 'full' (Ausgabe voll) | 'power' (kein Strom) | 'none' (nichts zu fördern)
            | 'hot' (kein Kühlwasser) | 'lube' (kein Schmiermittel) | 'water' / 'fuel' / 'idle' (Dampfkraftwerk)
   Flüssigkeiten liegen in b.fi (rein) und b.fo (raus); den Austausch mit den Rohrnetzen macht sim/fluids.js fluidStep.
   ========================================================= */
import { G_GRASS, SHIP_BUILD } from '../config.js';
import { tkx, tky } from '../util/tiles.js';
import { islData, capOf, pst, ownerOf, isUnlocked } from './state.js';
import { RECIPES_OF, RECIPE_BY_ID, OUT_CAP, OPT_BOOST, recipePower, recipeOf, fluidCap } from '../data/recipes.js';
import { DRILLS, SAW, FISHER, HOUSES } from '../data/mining.js';
import { ITEMS } from '../data/items.js';
import { PUMPS, KRAFTWERK, GEOTHERMIE, FLUID_BUF } from '../data/fluids.js';
import { mods, rateOf, powerOf, prodOf } from './mods.js';
import { evFisher, evGeo } from './events.js';
import { tickHub, tickDKiste } from './drones.js';
import { recomputeClaims } from './buildings.js';
import { addOut, flush } from './logistics.js';
import { drawPower, addEnergy } from './power.js';
import { pumpRate, madeFluid } from './fluids.js';
import { spawnShip } from './ships.js';
import { flowAdd, ioAdd } from './stats.js';
import { fxProd, fxDrill, fxFurnace, fxCoal2Iron, fxHouse } from './relics.js';


// Rezept-Gebäude: Zutaten werden beim Start eines Durchgangs aus dem Eingangspuffer genommen,
// die Produkte am Ende in den Ausgangspuffer gelegt (OUT_CAP je Produkt, voll → Stillstand).
// Flüssigkeiten: fin wird während des Durchgangs anteilig aus b.fi gezogen (fehlt sie, pausiert der Fortschritt),
// fout kommt am Ende nach b.fo (Puffer fluidCap; ohne Platz startet kein Durchgang).
function tickRecipe(g, b, dt) {
  const R = recipeOf(b);
  b._act = false; b._pw = false; b._st = ''; b._wf = null;
  if (!R) return;
  // Relikt „Ewige Glut“ (sim/relics.js): Öfen ohne Kohle (die Zutat entfällt) und ohne Strom (volle Geschwindigkeit)
  const F = fxFurnace(g, b), noCoal = !!(F && F.coal);
  if (!b.run) {
    for (const it in R.out) if ((b.out[it] || 0) + R.out[it] > OUT_CAP) { b._st = 'full'; flush(g, b); return; }
    for (const f in R.fout || {}) if ((b.fo[f] || 0) + R.fout[f] > fluidCap(R.fout[f]) + 1e-9) { b._st = 'full'; flush(g, b); return; }
    for (const it in R.in) if (!(noCoal && it === 'kohle') && (b.buf[it] || 0) < R.in[it]) { b._st = 'wait'; flush(g, b); return; }
    for (const it in R.in) { if (noCoal && it === 'kohle') continue; b.buf[it] -= R.in[it]; flowAdd(g, b.isl, 'u', it, R.in[it], b.t); }
    b.run = true; b.prog = 0;
    if (noCoal && R.in.kohle) b.nk = 1; else delete b.nk;   // nk = Durchgang ohne Kohle (beim Rezeptwechsel keine Kohle zurückgeben)
  }
  const P = recipePower(R);
  // Flüssigkeit für den größtmöglichen Schritt muss im Puffer liegen, sonst pausiert der Fortschritt (vor dem Strom, damit kein Strom verfällt)
  const most = Math.min(dt / R.t * (P.use && !P.need ? OPT_BOOST : 1), 1 - b.prog);
  for (const f in R.fin || {}) if ((b.fi[f] || 0) < R.fin[f] * most - 1e-9) { b._st = 'wait'; b._wf = f; flush(g, b); return; }
  let sp = 1;
  if (P.use) {
    b._pw = F && F.power ? true : drawPower(g, b, P.use * dt);
    if (!b._pw && P.need) { b._st = 'power'; flush(g, b); return; }
    if (b._pw && !P.need) sp = OPT_BOOST;
  }
  const step = Math.min(dt / R.t * sp * prodOf(g, ownerOf(b)) * fxProd(g, b.isl), 1 - b.prog);
  for (const f in R.fin || {}) b.fi[f] = Math.max(0, (b.fi[f] || 0) - R.fin[f] * step);
  b._act = true; b.prog += step;
  if (b.prog >= 1 - 1e-6) {
    b.prog = 0; b.run = false;
    for (const it in R.out) addOut(g, b, it, R.out[it]);
    for (const f in R.fout || {}) { b.fo[f] = (b.fo[f] || 0) + R.fout[f]; madeFluid(g, b, f, R.fout[f]); }
  }
  flush(g, b);
}
// Rezept wechseln: laufender Durchgang gibt seine Zutaten zurück, fremde Zutaten bleiben im Puffer (blockieren nicht)
export function setRecipe(g, b, id) {
  const R = RECIPE_BY_ID[id];
  if (!R || R.b !== b.t || b.rc === id || !isUnlocked(g, 'rc:' + id, ownerOf(b))) return;   // Rezept erst nach seiner Freischaltung (tech = Forschung)
  const old = recipeOf(b);
  if (b.run && old) for (const it in old.in) if (!(b.nk && it === 'kohle')) b.buf[it] = (b.buf[it] || 0) + old.in[it];
  b.rc = id; b.run = false; b.prog = 0; delete b.nk;
}
// Bohrer: Mehrheitsregel beim Bauen (sim/buildings.js drillInfo), Förderung = rate × Felder.
// water = Kühlwasser/s (ohne Stillstand), lube = Schmiermittel vom Band (1 Stück je every Sekunden Betrieb; opt = auch ohne, boost = Zusatzleistung)
function tickDrill(g, b, dt) {
  const D = DRILLS[b.t], L = D.lube;
  b._act = false; b._pw = false; b._st = ''; b._lub = false;
  const lubed = L && ((b.lt || 0) > 0 || (b.buf[L.it] || 0) >= 1);
  // Relikt „Stein der Wandlung“: Kohle kommt als Eisenerz an
  const ot = b._ot === 'kohle' && fxCoal2Iron(g, b.isl) ? 'eisenerz' : b._ot;
  if (!b._ot) b._st = 'none';
  else if ((b.out[ot] || 0) >= D.buf) b._st = 'full';
  else if (D.water && (b.fi.wasser || 0) < D.water * dt - 1e-9) b._st = 'hot';
  else if (L && !L.opt && !lubed) b._st = 'lube';
  else if (D.power && !(b._pw = drawPower(g, b, D.power * dt))) b._st = 'power';
  else {
    let f = 1;
    if (lubed) {
      if ((b.lt || 0) <= 0) { b.buf[L.it]--; b.lt = (b.lt || 0) + L.every; flowAdd(g, b.isl, 'u', L.it, 1, b.t); }
      b.lt -= dt; b._lub = true; f += L.boost || 0;
    }
    if (D.water) b.fi.wasser -= D.water * dt;
    b._act = true; b.acc += D.rate * rateOf(g, b.t, ownerOf(b)) * fxDrill(g, b.isl) * b._oc * f * dt;
    if (b.acc >= 1) { b.acc -= 1; addOut(g, b, ot, 1); }
  }
  flush(g, b);
}
// Pumpen: fördern in den Ausgangspuffer (FLUID_BUF × Leistung), sim/fluids.js schiebt ins Netz
function tickPump(g, b, dt) {
  const P = PUMPS[b.t], f = P.out, r = pumpRate(b), cap = FLUID_BUF * r, cur = b.fo[f] || 0;
  b._act = false; b._pw = false; b._st = '';
  if (!r) { b._st = 'none'; return; }
  if (cur >= cap - 1e-9) { b._st = 'full'; return; }
  if (P.power && !(b._pw = drawPower(g, b, P.power * dt))) { b._st = 'power'; return; }
  const add = Math.min(cap - cur, r * dt);
  b.fo[f] = cur + add; b._act = true;
  madeFluid(g, b, f, add);
}
// Dampfkraftwerk: Brennwert und Wasser → Strom (× mods(g).power.kraftwerk). Läuft durch, solange Brennstoff und Wasser da sind;
// sind Speicher und Batterien voll, wird der Überschuss verworfen (addEnergy, Anzeige „Überschuss verworfen“).
function tickKraftwerk(g, b, dt) {
  const K = KRAFTWERK;
  b._act = false; b._st = '';
  const w = K.water * dt, need = K.burn * dt;
  if ((b.fi.wasser || 0) < w - 1e-9) { b._st = 'water'; return; }
  if ((b.fuel || 0) < need - 1e-9) {
    let best = null;
    for (const it in b.buf) if (b.buf[it] >= 1 && (!best || b.buf[it] > b.buf[best])) best = it;
    if (best) { b.buf[best]--; b.fuel = (b.fuel || 0) + ITEMS[best].burn; b._bn = (b._bn || 0) + 1; b._bv = (b._bv || 0) + ITEMS[best].burn; }
  }
  if ((b.fuel || 0) < need - 1e-9) { b._st = 'fuel'; return; }
  b.fuel -= need; b.fi.wasser -= w; b._act = true;
  addEnergy(g, b, K.power * powerOf(g, b.t, ownerOf(b)) * dt);
}
// Häuser: alle mods(g).houseEvery s (HOUSE_EVERY, mit Upgrades) Bedarf aus dem Lager der Insel nehmen und 1 Plan ins Lager legen
function tickHouse(g, b, dt) {
  const H = HOUSES[b.t], P = pst(g, ownerOf(b));
  b.tm -= dt;
  if (b.tm <= 0) {
    b.tm = mods(g, ownerOf(b)).houseEvery;
    // Relikte (sim/relics.js fxHouse): Verbrauch × f; Bruchteile sammeln sich je Haus in b.hc und werden ganzzahlig entnommen
    const f = fxHouse(g, b.isl), need = {};
    for (const r in H.need) need[r] = f === 1 ? H.need[r] : Math.floor((b.hc && b.hc[r] || 0) + H.need[r] * f + 1e-9);
    const inv = islData(g, b.isl).inv, ok = Object.keys(need).every(r => (inv[r] || 0) >= need[r]);
    const room = (inv[H.gives] || 0) < capOf(g, b.isl);
    if (ok && room) {
      if (f !== 1) { const hc = b.hc || (b.hc = {}); for (const r in H.need) hc[r] = Math.max(0, (hc[r] || 0) + H.need[r] * f - need[r]); }
      else if (b.hc) delete b.hc;
      for (const r in need) { if (!need[r]) continue; inv[r] -= need[r]; flowAdd(g, b.isl, 'c', r, need[r], 'haeuser'); flowAdd(g, b.isl, 'u', r, need[r], 'haeuser'); }
      inv[H.gives] = (inv[H.gives] || 0) + 1;
      flowAdd(g, b.isl, 'p', H.gives, 1, 'haeuser'); flowAdd(g, b.isl, 'm', H.gives, 1, 'haeuser');
      P.stats.made[H.gives] = (P.stats.made[H.gives] || 0) + 1;
      b.plans = (b.plans || 0) + 1;
      if (g.inspect.has(b.id)) { for (const r in need) if (need[r]) ioAdd(g, b, 'in', r, need[r]); ioAdd(g, b, 'out', H.gives, 1); }
    }
    b.sup = ok; b.full = ok && !room;
  }
  const RT = g.RT;
  RT.popAll[b.isl] = (RT.popAll[b.isl] || 0) + H.pop;
  if (b.sup) RT.popSup[b.isl] = (RT.popSup[b.isl] || 0) + H.pop;
}
export const PRODUCTION_TICKS = {
  verbrennung(g, b, dt) { if (b._bt > 0) b._bt -= dt; },
  kraftwerk: tickKraftwerk,
  // Geothermie: immer aktiv (auf genug Lava); Überschuss bei vollem Speicher wird verworfen
  geothermie(g, b, dt) {
    const lava = (b._lv || 0) >= GEOTHERMIE.lava;
    b._act = lava; b._st = lava ? '' : 'lava';
    if (b._act) addEnergy(g, b, GEOTHERMIE.power * powerOf(g, b.t, ownerOf(b)) * evGeo(g, b) * dt);
  },
  pumpe: tickPump, saugpumpe: tickPump,
  saege(g, b, dt) {
    const tree = g.tree, W = g.W;
    if (!b._ring) recomputeClaims(g);
    b._pt = (b._pt || 0) + dt;
    if (b._pt >= SAW.plant) {
      b._pt = 0;
      for (const i of b._ring) {
        const x = tkx(i), y = tky(i);
        if (tree.get(x, y) === 0 && !g.bmap.get(x, y) && W.gr(x, y) === G_GRASS && !W.oreAt(x, y)) { tree.set(x, y, 0.02); g.growing.add(i); break; }
      }
    }
    let m = 0;
    for (const i of b._ring) { const x = tkx(i), y = tky(i); if (tree.get(x, y) >= 1 && !g.bmap.get(x, y)) m++; }
    b._m = m;
    if ((b.out.holz || 0) < SAW.buf) { b.acc += SAW.rate * prodOf(g, ownerOf(b)) * fxProd(g, b.isl) * m * dt; if (b.acc >= 1) { b.acc -= 1; addOut(g, b, 'holz', 1); } }
    flush(g, b);
  },
  bohrer: tickDrill, bohrer2: tickDrill, multibohrer: tickDrill,
  fischer(g, b, dt) {
    if ((b.out.fisch || 0) < FISHER.buf) { b.acc += b._fr * rateOf(g, 'fischer', ownerOf(b)) * fxProd(g, b.isl) * evFisher(g, b) * dt; if (b.acc >= 1) { b.acc -= 1; addOut(g, b, 'fisch', 1); } }
    flush(g, b);
  },
  drohnenhafen: tickHub,
  dkiste: tickDKiste,
  werft(g, b, dt) {
    if (!b.bq) return;
    b.prog += dt / SHIP_BUILD;
    if (b.prog >= 1) { b.prog = 0; b.bq = 0; spawnShip(g, b); }
  }
};
for (const t in RECIPES_OF) PRODUCTION_TICKS[t] = tickRecipe;
for (const t in HOUSES) PRODUCTION_TICKS[t] = tickHouse;
