/* =========================================================
   WERKZEUGE: Aufwerten (U), Statusansicht (H), Rückgängig/Wiederholen (Strg+Z/Y), Pipette (Q)
   Alles Spielrelevante läuft als Kommando an die Simulation; hier wird nur der Spiegel gelesen.
   ========================================================= */
import { BD } from '../data/buildings.js';
import { PIPE_BY_TIER } from '../data/fluids.js';
import { tkx, tky } from '../util/tiles.js';
import { bAt } from '../sim/buildings.js';
import { mine, ownerOf, playerName } from '../sim/state.js';
import { game, ui, send, afterSync, saveGame } from './context.js';
import { setMode, renderAllUI } from './panels.js';
import { openBuild } from './buildmenu.js';
import { renderHotbar } from './hotbar.js';
import { toast } from './toasts.js';

/* ---------- Aufwerten ---------- */
export const toggleUpgrade = () => setMode(ui.mode && ui.mode.kind === 'upgrade' ? null : { kind: 'upgrade' });
// Ein Teil aufwerten (Klick im Werkzeug, Knopf im Info-Panel); grp = Zug-Nummer beim Ziehen
export function upgradeCmd(T, grp) {
  if (!T) return;
  send(T.pipe ? { type: 'upgrade', pipe: true, x: T.x, y: T.y, grp } : { type: 'upgrade', id: T.id, grp });
}
// Kosten aufsummieren (Hinweis beim Ziehen)
export function addCost(sum, cost) { for (const r in cost) sum[r] = (sum[r] || 0) + cost[r]; return sum; }

/* ---------- Statusansicht ---------- */
export function toggleStatus() {
  game.state.ui.statusView = !game.state.ui.statusView;
  saveGame(); renderHotbar();
}

/* ---------- Rückgängig / Wiederholen ---------- */
export function undo() { if (!game.undo.u) { toast('Nichts zum Rückgängigmachen.'); return; } send({ type: 'undo' }); saveGame(); afterSync(() => renderAllUI(true)); }
export function redo() { if (!game.undo.r) { toast('Nichts zum Wiederholen.'); return; } send({ type: 'redo' }); saveGame(); afterSync(() => renderAllUI(true)); }

/* ---------- Pipette ---------- */
// Über einem Gebäude: Baumodus mit Typ, Drehung, Rezept, Extraktor-Ware, Tor-Automatik und Sortierer-Einstellung. Über einem Rohr ohne Band: dasselbe Rohr.
// Band über Rohr: das Band, mit Umschalt das Rohr. Über leerem Feld (oder Kontor): Baumodus beenden.
export function pipette(shift) {
  const i = ui.hoverTile;
  const end = () => { if (ui.mode && ui.mode.kind === 'build') setMode(null); };
  if (i < 0) { end(); return; }
  const x = tkx(i), y = tky(i), b = bAt(game, x, y), p = game.pipes.get(x, y);
  let mode = null;
  if (b && !mine(game, b)) { toast(`Gehört ${playerName(game, ownerOf(b))}.`); end(); return; }   // Getrennte Inseln: nur eigene Gebäude
  if (p && (shift || !b)) mode = { kind: 'build', t: PIPE_BY_TIER[p], d: 0 };
  else if (b && !BD[b.t].fixed) {
    mode = { kind: 'build', t: b.t, d: BD[b.t].rot ? b.d : 0 };
    if (b.rc) mode.rc = b.rc;
    if (b.t === 'extraktor' && b.ex) mode.ex = b.ex;
    if (b.t === 'tor' && b.ga) mode.ga = Object.assign({}, b.ga);
    if (b.t === 'sortierer' && b.so) mode.so = Object.assign({}, b.so);
    if (BD[b.t].steg) mode.d = b.d;
  }
  if (!mode) { end(); return; }
  // Baumenü auf die Kategorie springen lassen; gesperrte oder zu teure Gebäude starten trotzdem (Vorschau rot)
  game.state.ui.buildCat = BD[mode.t].cat;
  openBuild();
  setMode(mode);
}
