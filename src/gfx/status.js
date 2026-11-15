/* =========================================================
   STATUSANSICHT (Taste H): Produkt-Symbol und Status-Punkt über Produktionsgebäuden
   Liest nur den Spiegel (Laufzeitfelder _st, _act, _acid … aus sim/production.js und sim/fluids.js).
   Farben: ok = läuft (grün), wait = wartet auf Zutaten oder Ausgabe voll (gelb),
           bad = kein Strom / kein Wasser / überhitzt / unversorgt / Tor geschlossen (rot), off = kein Rezept / nichts zu fördern (grau)
   ========================================================= */
import { RECIPES_OF, recipeOf, recipeMain, recipePower } from '../data/recipes.js';
import { netOf } from '../sim/power.js';
import { DRILLS, HOUSES, SAW, FISHER } from '../data/mining.js';
import { PUMPS } from '../data/fluids.js';
import { extractInfo } from '../sim/logistics.js';

export const STATUS_COL = { ok: '#7cc24f', wait: '#ffc61a', bad: '#e8504a', off: '#9a9a9a' };

// Braucht Strom und hängt an keinem Netz mit Erzeuger oder Batterie (rot, auch wenn gerade Zutaten fehlen)
function unpowered(g, b, need) {
  if (!need) return false;
  const n = netOf(g, b);
  return !n || !(n.gens.length + n.bats.length);
}
// → { c: 'ok'|'wait'|'bad'|'off', it: Item/Flüssigkeit für das Symbol oder 'bolt' (Strom) } oder null (kein Produktionsgebäude)
export function statusOf(g, b) {
  const t = b.t, st = b._st || '';
  if (b.dmg) return { c: 'bad', it: 'wrench' };
  if (t === 'drohnenhafen') return { c: st === 'power' || unpowered(g, b, 2) ? 'bad' : 'ok', it: 'bolt' };
  if (RECIPES_OF[t]) {
    const R = recipeOf(b);
    if (!R) return { c: 'off', it: null };
    const it = R.icon || recipeMain(R);
    if (b._acid || st === 'power' || (st === 'wait' && b._wf) || unpowered(g, b, recipePower(R).need)) return { c: 'bad', it };
    if (st === 'wait' || st === 'full') return { c: 'wait', it };
    return { c: 'ok', it };
  }
  if (DRILLS[t]) {
    if (!b._ot || st === 'none') return { c: 'off', it: b._ot || null };
    return { c: st === 'hot' || st === 'lube' || st === 'power' || unpowered(g, b, DRILLS[t].power) ? 'bad' : st === 'full' ? 'wait' : 'ok', it: b._ot };
  }
  if (PUMPS[t]) return { c: st === 'none' ? 'off' : st === 'power' || unpowered(g, b, PUMPS[t].power) ? 'bad' : st === 'full' ? 'wait' : 'ok', it: PUMPS[t].out };
  if (t === 'kraftwerk') return { c: st === 'water' || st === 'fuel' ? 'bad' : 'ok', it: 'bolt' };
  if (t === 'geothermie') return { c: st === 'lava' ? 'bad' : 'ok', it: 'bolt' };
  if (t === 'verbrennung') return { c: b._bt > 0 ? 'ok' : 'wait', it: 'bolt' };
  if (HOUSES[t]) return { c: b.sup ? (b.full ? 'wait' : 'ok') : 'bad', it: HOUSES[t].gives };
  if (t === 'saege') return { c: (b.out.holz || 0) >= SAW.buf ? 'wait' : b._m > 0 ? 'ok' : 'wait', it: 'holz' };
  if (t === 'tor') return b.cl ? { c: 'bad', it: b.ga ? b.ga.it : null } : null;
  if (t === 'extraktor') { const X = extractInfo(g, b); return { c: X.from.length && X.to.length ? 'ok' : 'off', it: b.ex || null }; }
  if (t === 'fischer') return { c: (b.out.fisch || 0) >= FISHER.buf ? 'wait' : b._fr > 0 ? 'ok' : 'off', it: 'fisch' };
  return null;
}
