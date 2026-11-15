/* =========================================================
   DEMO-FABRIK (Titelbildschirm): baut DEMO aus data/demo.js in einer frischen Welt auf
   Läuft im Host wie ein normales Spiel, wird aber nie gespeichert. Kein DOM-Zugriff.
   ========================================================= */
import { DEMO } from '../data/demo.js';
import { ITEM_ORDER } from '../data/items.js';
import { HOME_ISL, tkx, tky } from '../util/tiles.js';
import { newGame, islData, kontorOf } from './state.js';
import { addBuilding, bAt, checkPlace } from './buildings.js';
import { reveal, revealIsland } from './explore.js';
import { sim, applyCommand } from './sim.js';
import { newShip, setRoute } from './ships.js';
import { TICK } from '../config.js';

export function buildDemo(g) {
  newGame(g, DEMO.seed, addBuilding, reveal, revealIsland, { noStory: true });   // Demo ohne Geschichte und NPC-Inseln
  applyCommand(g, { type: 'devUnlock' });   // Demo: alle Freischaltungen (Volk, Story, Pläne), ohne Story
  applyCommand(g, { type: 'unlockAll' });
  const H = kontorOf(g, HOME_ISL);
  reveal(g, H.x, H.y, DEMO.reveal);
  restock(g);
  const bad = [];
  for (const [t, x, y, d, o] of DEMO.build) {
    applyCommand(g, Object.assign({ type: 'place', t, x, y, d: d || 0 }, o || {}));
    if (t !== 'rohr' && !(bAt(g, x, y) && bAt(g, x, y).t === t)) bad.push(`${t} ${x}/${y}`);
  }
  // Handelskontor in der Nähe suchen
  restock(g);
  let hk = null;
  const [nx, ny] = DEMO.port.near;
  for (let r = 0; r <= DEMO.port.r && !hk; r++) for (let dy = -r; dy <= r && !hk; dy++) for (let dx = -r; dx <= r && !hk; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    for (let d = 0; d < 4 && !hk; d++) if (checkPlace(g, 'handelskontor', nx + dx, ny + dy, false, d).ok) {
      applyCommand(g, { type: 'place', t: 'handelskontor', x: nx + dx, y: ny + dy, d });
      const b = bAt(g, nx + dx, ny + dy);
      if (b && b.t === 'handelskontor') hk = b;
    }
  }
  if (!hk) bad.push('handelskontor');
  if (bad.length) console.warn('Demo: nicht gebaut:', bad.join(', '));
  // Schiff auf Route
  if (hk && H._dock != null) {
    const s = newShip(g, tkx(H._dock) + 0.5, tky(H._dock) + 0.5, H.id, 'fracht');
    const id = { hq: H.id, hk: hk.id };
    setRoute(g, s, DEMO.route.map(st => ({ kontor: id[st.port], load: st.load, unload: st.unload, wait: 0 })), true);
  }
  restock(g);
  g.undo = { u: [], r: [], open: null }; g.undos = new Map([['host', g.undo]]);
  for (let t = 0; t < DEMO.prerun; t += TICK) { sim(g, TICK); demoTick(g, TICK); }
  g.events = [];
  g.demo = { t: 0 };
  return bad;
}
// Inselinventar auf DEMO.stock setzen, Lagerkisten leeren
function restock(g) {
  const inv = islData(g, HOME_ISL).inv;
  for (const it of ITEM_ORDER) inv[it] = DEMO.stock;
  for (const b of g.blds.values()) if (b.t === 'kiste' || b.t === 'handelskontor') b.inv = {};
}
export function demoTick(g, dt) {
  const D = g.demo || (g.demo = { t: 0 });
  D.t += dt;
  if (D.t >= DEMO.refresh) { D.t = 0; restock(g); }
  g.events = [];
}
