/* =========================================================
   PANELS: Gesamt-Neuzeichnen, Baumodus, Klicks im Info-Panel
   Änderungen am Spiel gehen als Kommandos an die Simulation (send).
   Neu gezeichnet wird nur, was sich geändert hat (setHTML/patchList in den Modulen).
   ========================================================= */
import { SHIP_KINDS } from '../data/ships.js';
import { BD, GATE } from '../data/buildings.js';
import { afford, missingText } from '../sim/state.js';
import { askConfirm } from './modal.js';
import { game, ui, $, send, afterSync, saveGame, newGrp } from './context.js';
import { upgradeCmd } from './tools.js';
import { renderTopbar, renderGoal } from './hud.js';
import { renderInventory } from './inventory.js';
import { renderInsights, updateHint, stashPreview } from './insights.js';
import { renderBuildMenu } from './buildmenu.js';
import { renderHotbar } from './hotbar.js';
import { renderWindow } from './windows.js';
import { refreshTooltip } from './tooltip.js';
import { layoutSoon } from './layout.js';
import { toast } from './toasts.js';
import { hooks, shipAction, startMove } from './ships.js';
import { npcClick } from './npcs.js';
import { pedestalClick } from './relics.js';
import { nameIsland } from './islandname.js';
import { marketClick, marketChange } from './market.js';

export function renderAllUI(force) {
  if (force) ui.uiPressed = false;
  renderTopbar(); renderInventory(); renderInsights(); renderGoal(); renderBuildMenu(); renderHotbar();
  if (ui.mode) updateHint();
  renderWindow(force); refreshTooltip();
  layoutSoon();
}
// Kamera ist auf eine andere Insel gewechselt
export function renderIslandChange() {
  renderTopbar(); renderInventory(); renderBuildMenu(); refreshTooltip();
  if (ui.mode) updateHint();
}
export function setMode(m) {
  ui.mode = m;
  if (m && (m.kind === 'build' || m.kind === 'demolish')) { ui.selected = -1; ui.selTile = -1; ui.selShip = -1; }
  updateHint(); renderBuildMenu(); renderHotbar(); renderInsights(); layoutSoon();
  if (ui.win) renderWindow(true);
}

export function wirePanels() {
  // Panels nicht neu zeichnen, während eine Maustaste darin gedrückt ist
  $('hud').addEventListener('pointerdown', () => { ui.uiPressed = true; });
  document.addEventListener('pointerup', () => { ui.uiPressed = false; });
  document.addEventListener('pointercancel', () => { ui.uiPressed = false; });

  hooks.renderAll = () => renderAllUI(true);
  hooks.setMode = setMode;
  $('insights').addEventListener('click', e => {
    ui.uiPressed = false;
    if (marketClick(e) || npcClick(e)) return;
    const sa = e.target.closest('[data-sact]');
    if (sa) { if (!sa.disabled) shipAction(sa); return; }
    const a = e.target.closest('[data-act]');
    if (!a || a.tagName === 'SELECT') return;
    const act = a.dataset.act;
    if (act === 'close') { ui.selected = -1; ui.selTile = -1; ui.selShip = -1; renderAllUI(true); return; }
    if (act === 'toggle') { game.state.ui.infoCollapsed = !game.state.ui.infoCollapsed; renderInsights(); return; }
    if (act === 'fold') { const f = ui.fold || (ui.fold = {}); f[a.dataset.k] = !f[a.dataset.k]; renderInsights(); return; }
    // Rohrnetz (Feld oder Band über einem Rohr): leeren, Rohr abreißen
    if (act === 'upgrade' && a.dataset.x != null) { const x = +a.dataset.x, y = +a.dataset.y; upgradeCmd({ pipe: game.pipes.get(x, y), x, y }); saveGame(); afterSync(() => renderAllUI(true)); return; }
    if (act === 'drain' || act === 'rmPipe') {
      send({ type: act === 'drain' ? 'drainNet' : 'removePipe', x: +a.dataset.x, y: +a.dataset.y });
      if (act === 'drain') toast('Rohrnetz geleert.');
      saveGame(); afterSync(() => renderAllUI(true)); return;
    }
    const b = game.blds.get(ui.selected);
    if (!b) return;
    if (pedestalClick(a, b)) return;   // Reliktsockel (ui/relics.js)
    if (act === 'wire') { setMode({ kind: 'wire', from: b.id }); return; }
    if (act === 'nameIsl') { nameIsland(b.isl, false, () => renderAllUI(true)); return; }
    if (act === 'upgrade') { upgradeCmd(b); saveGame(); afterSync(() => renderAllUI(true)); return; }
    if (act === 'moveKontor') { startMove(b); return; }
    if (act === 'bridgeRelink') { setMode(ui.mode && ui.mode.kind === 'bridge' ? null : { kind: 'bridge', from: b.id }); return; }
    if (act === 'demolish') { demolishAsk(b); return; }
    if (act === 'gateAutoOn') {
      send({ type: 'gateAuto', id: b.id, ga: a.checked ? Object.assign({}, GATE.auto) : null });
      saveGame(); afterSync(renderInsights); return;
    }
    if (act === 'unwire') { const grp = newGrp(); send(...(b.links || []).map(id => ({ type: 'unlink', a: b.id, b: id, grp }))); }
    else if (act === 'rotate') send({ type: 'rotate', id: b.id });
    else if (act === 'rc') send({ type: 'setRecipe', id: b.id, rc: a.dataset.v });
    else if (act === 'ex') send({ type: 'setExtract', id: b.id, item: a.dataset.v });
    else if (act === 'gate') send({ type: 'gate', id: b.id });
    else if (act === 'sortIt') send({ type: 'setSorter', id: b.id, so: { it: a.dataset.v, rv: !!(b.so && b.so.rv) } });
    else if (act === 'sortRv') send({ type: 'setSorter', id: b.id, so: { it: b.so ? b.so.it : '', rv: a.checked } });
    else if (act === 'gateIt' && b.ga) send({ type: 'gateAuto', id: b.id, ga: Object.assign({}, b.ga, { it: a.dataset.v }) });
    else if (act === 'bridgeUnlink') send({ type: 'bridgeLink', id: b.id, to: null });
    else if (act === 'repair') send({ type: 'repair', id: b.id });
    else if (act === 'wonder') send({ type: 'wonderOrder', id: b.id });
    else if (act === 'wonderStore') send({ type: 'wonderStore', id: b.id, on: a.checked });
    else if (act === 'talk') send({ type: 'talk', id: b.id });
    else if (act === 'dkMode') send({ type: 'dkiste', id: b.id, dm: a.dataset.v });
    else if (act === 'dkIt') send({ type: 'dkiste', id: b.id, it: a.dataset.v, n: b.dw && b.dw.n ? b.dw.n : 50 });
    else if (act === 'clear') { send({ type: 'clearBelt', id: b.id, line: a.dataset.line === '1' }); }
    else if (act === 'ship') {
      const K = SHIP_KINDS[a.dataset.kind] || SHIP_KINDS.fracht;
      if (b.bq) return;
      if (!afford(game, b.isl, K.cost)) { toast(`Für ${K.name === 'Entdecker' ? 'einen Entdecker' : 'ein Frachtschiff'} fehlen: ${missingText(game, b.isl, K.cost)}.`); return; }
      send({ type: 'buildShip', id: b.id, kind: a.dataset.kind });
    }
    saveGame(); afterSync(renderInsights);
  });
  // Tor-Automatik: Schwellen
  $('insights').addEventListener('change', e => {
    if (marketChange(e)) return;
    const dn = e.target.closest('[data-act="dkN"]'), db = game.blds.get(ui.selected);
    if (dn && db && db.t === 'dkiste') { send({ type: 'dkiste', id: db.id, it: db.dw ? db.dw.it : '', n: +dn.value }); dn.blur(); saveGame(); afterSync(renderInsights); return; }
    const s = e.target.closest('[data-act="gateHi"], [data-act="gateLo"]');
    const b = game.blds.get(ui.selected);
    if (!s || !b || !b.ga) return;
    const ga = Object.assign({}, b.ga, { [s.dataset.act === 'gateHi' ? 'hi' : 'lo']: Math.max(0, Math.floor(+s.value) || 0) });
    if (ga.lo > ga.hi) ga.lo = ga.hi;
    send({ type: 'gateAuto', id: b.id, ga }); s.blur(); saveGame(); afterSync(renderInsights);
  });
}
// Abreißen; bei Speichern fragen, wenn mehr als 10 % des Bestands verloren gingen (Hauptkontor voll)
export async function demolishAsk(b, grp) {
  if (b.t === 'kiste' || b.t === 'handelskontor') {
    const p = stashPreview(b);
    if (p.total && p.lost > p.total * 0.1) {
      const ok = await askConfirm(`${BD[b.t].name} abreißen?`, `Der Bestand kommt ins Hauptkontor, aber dort ist nicht genug Platz: <b>${p.lost}</b> von ${p.total} Items gehen verloren.`, 'Trotzdem abreißen');
      if (!ok) return false;
    }
  }
  send({ type: 'remove', id: b.id, notify: true, grp });
  saveGame(); afterSync(() => renderAllUI(true));
  return true;
}
