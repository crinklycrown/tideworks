/* =========================================================
   BAUMENÜ: Kategorienreihe + Gebäudeleiste über der Knopfleiste
   Kategorien kommen aus BUILD_CATS (data/buildings.js), Gebäude je Kategorie in BUILD_ORDER-Reihenfolge.
   Die zuletzt gewählte Kategorie steht in game.state.ui.buildCat (wird gespeichert).
   ========================================================= */
import { BD, BUILD_CATS, catBuildings } from '../data/buildings.js';
import { lockHint, lockReason, WERFT_SLOTS } from '../data/unlocks.js';
import { BELL } from '../data/dive.js';
import { ITEMS } from '../data/items.js';
import { bellShip } from '../sim/dive.js';
import { centerOnTile, cam } from '../gfx/camera.js';
import { TS } from '../config.js';
import { renderInsights } from './insights.js';
import { descOf } from '../sim/mods.js';
import { img, fitScale } from '../gfx/pixelbuffer.js';
import { SPR, bIcon } from '../gfx/sprites.js';
import { esc } from '../util/format.js';
import { isUnlocked, islName, mine } from '../sim/state.js';
import { game, ui, $ } from './context.js';
import { patchList, costText, curIsl } from './common.js';
import { setMode } from './panels.js';
import { renderHotbar } from './hotbar.js';
import { layout } from './layout.js';
import { closeWindow } from './windows.js';
import { registerTip, refreshTooltip } from './tooltip.js';
import { toast } from './toasts.js';

const visibleCats = () => BUILD_CATS.filter(c => catBuildings(c.id).length);
function curCat() {
  const cats = visibleCats(), id = game.state.ui.buildCat;
  return cats.find(c => c.id === id) || cats[0];
}

export function openBuild() {
  if (ui.buildOpen) return;
  if (ui.win && $('win').classList.contains('center')) closeWindow();   // das zentrierte Fenster würde das Baumenü verdecken
  ui.buildOpen = true;
  $('buildBar').classList.remove('hidden');
  renderBuildMenu(); renderHotbar(); layout();
}
// Schließen beendet auch den Baumodus (nicht Abriss oder Kabel)
export function closeBuild() {
  if (!ui.buildOpen) return;
  ui.buildOpen = false;
  $('buildBar').classList.add('hidden');
  if (ui.mode && ui.mode.kind === 'build') setMode(null);
  renderHotbar(); layout();
}
export function toggleBuild() { if (ui.buildOpen) closeBuild(); else openBuild(); }

// Gebäude wählen: startet den Baumodus, erneutes Wählen beendet ihn
export function pickBuilding(t) {
  if (t.startsWith('werft:')) { pickWerftSlot(t.slice(6)); return; }
  if (!isUnlocked(game, t)) { toast(`${img(SPR.icon.lock, 2)}<span><b>${BD[t].name}</b>: ${lockReason(t)}</span>`); return; }
  const mode = ui.mode;
  setMode(mode && mode.kind === 'build' && mode.t === t ? null : { kind: 'build', t, d: mode && mode.d || 0 });
}
// Taste 1–9: n-tes Gebäude der offenen Kategorie (öffnet das Menü bei Bedarf)
export function pickIndex(n) {
  openBuild();
  const t = catBuildings(curCat().id)[n];
  if (t) pickBuilding(t);
}
function setCat(id) {
  if (game.state.ui.buildCat === id) return;
  game.state.ui.buildCat = id;
  renderBuildMenu(); layout();
}

export function renderBuildMenu() {
  if (!ui.buildOpen) return;
  const cat = curCat(), mode = ui.mode;
  patchList($('catRow'), visibleCats().map(c => ({
    k: c.id, tag: 'button', cls: `catb${c.id === cat.id ? ' on' : ''}`,
    html: `${img(SPR.icon[c.icon], 2)}<span>${c.name}</span>`
  })));
  patchList($('bldSlots'), catBuildings(cat.id).map((t, i) => {
    const un = isUnlocked(game, t), on = mode && mode.kind === 'build' && mode.t === t, ic = bIcon(t);
    return {
      k: t, tag: 'button', cls: `slot${on ? ' on' : ''}${un ? '' : ' locked'}`,
      html: `<span class="sic">${img(ic, fitScale(ic, 34))}</span>${i < 9 ? `<span class="key">${i + 1}</span>` : ''}${un ? '' : `<span class="lk">${img(SPR.icon.lock, 2)}</span>`}`
    };
  }).concat(soonSlots(cat.id)));
  for (const el of $('bldSlots').children) el.dataset.tip = `b:${el.dataset.k}`;
  refreshTooltip();
}

// Felder für Dinge aus der Werft (data/unlocks.js WERFT_SLOTS, 0.19.0 Taucherglocke): erst sichtbar, wenn freigeschaltet (keine Vorschau auf die Geschichte)
const soonSlots = (cat) => Object.keys(WERFT_SLOTS).filter(k => WERFT_SLOTS[k].cat === cat && isUnlocked(game, k)).map(k => ({
  k: 'werft:' + k, tag: 'button', cls: `slot soon${bellShip(game) ? ' done' : ''}`,
  html: `<span class="sic">${img(SPR.icon.glocke, fitScale(SPR.icon.glocke, 34))}</span><span class="lk soon-tag">${bellShip(game) ? 'dran' : 'Werft'}</span>`
}));
// Eigene Werft, die der Kamera am nächsten liegt
function nearestWerft() {
  let best = null, bd = Infinity;
  const cx = cam.x / TS, cy = cam.y / TS;
  for (const b of game.blds.values()) { if (b.t !== 'werft' || !mine(game, b)) continue; const d = Math.hypot(b.x - cx, b.y - cy); if (d < bd) { bd = d; best = b; } }
  return best;
}
// Klick auf die Taucherglocke: Werft auswählen (dort wird sie montiert) bzw. das Schiff mit der Glocke zeigen
function pickWerftSlot(k) {
  const S = WERFT_SLOTS[k], ic = img(SPR.icon.glocke, 2);
  if (!S) return;
  const bs = bellShip(game);
  if (bs) { toast(`${ic}<span>Die ${S.name} hängt an <b>${esc(bs.name)}</b>.</span>`); return; }
  const b = nearestWerft();
  if (!b) { toast(`${ic}<span><b>${S.name}</b>: Sie wird in einer Werft an ein Schiff montiert. Baue zuerst eine Werft.</span>`); return; }
  centerOnTile(b.x + 1.5, b.y + 1.5); ui.selected = b.id; ui.selTile = -1; ui.selShip = -1; game.state.ui.infoCollapsed = false;
  toast(`${ic}<span><b>${S.name}</b>: Die Werft montiert sie an ein Schiff, das an ihrem Anleger liegt.</span>`);
  renderInsights();
}
const partsText = () => Object.keys(BELL.cost).map(it => `${img(SPR.item[it], 1)} ${ITEMS[it].name} <span class="muted">(${ITEMS[it].npc === 'ole' ? 'Ole' : 'Brann'})</span>`).join('<br>');
// Tooltip eines Gebäudes: Name, Größe, Kosten (Insel unter der Kamera), Beschreibung, Freischalt-Quelle (data/unlocks.js)
function buildingTip(t) {
  if (t.startsWith('werft:')) {
    const S = WERFT_SLOTS[t.slice(6)], bs = bellShip(game);
    if (!S) return '';
    return `<div class="tt-h"><span>${S.name}</span><span class="xs muted">Werft</span></div>`
      + (bs ? `<div class="xs">Hängt an <b>${esc(bs.name)}</b>. Es gibt nur eine.</div>`
        : `<div class="xs">Wird in der Werft an ein Schiff montiert, das an ihrem Anleger liegt. Nur einmal baubar.</div><div class="xs" style="margin-top:4px"><b>Teile im Lager der Werft-Insel:</b><br>${partsText()}</div><div class="xs muted" style="margin-top:4px">Klick wählt deine Werft aus.</div>`);
  }
  const d = BD[t];
  if (!d) return '';
  const k = curIsl(), un = isUnlocked(game, t);
  return `<div class="tt-h"><span>${d.name}</span><span class="xs muted">${d.w}&times;${d.h}</span></div>
    <div class="tt-c">${costText(d.cost, k)}<span class="xs muted">Kontor ${esc(islName(game, k))}${ui.camIsl < 0 ? ' (zuletzt)' : ''}</span></div>
    <div class="xs">${descOf(game, t)}</div>
    ${un ? '' : `<div class="xs bad tt-l">${img(SPR.icon.lock, 1)} <b>${lockHint(t)}</b></div>`}`;
}

export function wireBuildMenu() {
  registerTip('b', buildingTip);
  $('catRow').addEventListener('click', e => { const b = e.target.closest('.catb'); if (b) { ui.uiPressed = false; setCat(b.dataset.k); } });
  $('bldSlots').addEventListener('click', e => { const b = e.target.closest('.slot'); if (b) { ui.uiPressed = false; pickBuilding(b.dataset.k); } });
}
