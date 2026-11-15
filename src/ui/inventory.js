/* =========================================================
   LAGER-PANEL links oben (Insel unter der Kamera) + Item-Popover mit Statistik
   ========================================================= */
import { mods } from '../sim/mods.js';
import { ITEMS, ITEM_ORDER, resName } from '../data/items.js';
import { FLUID_ORDER, FLUIDS } from '../data/fluids.js';
import { fluidStock } from '../sim/fluids.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { esc, fmt } from '../util/format.js';
import { capOf, invOf } from '../sim/state.js';
import { BD } from '../data/buildings.js';
import { npcName } from '../data/npcs.js';
import { stockRead, storeCap, kontorKind } from '../sim/kontor.js';
import { bIcon } from '../gfx/sprites.js';
import { islPower } from '../sim/power.js';
import { game, ui, $ } from './context.js';
import { setHTML, patchList, uiBusy, curIsl, islLabel } from './common.js';
import { ratesFor, fmtRate, rateCls, active, chartHTML, drawChart, breakdownHTML, itemFacts, sollIst } from './stats.js';
import { layout } from './layout.js';
import { registerTip } from './tooltip.js';
import { hooks } from './ships.js';

export function renderInventory() {
  const k = curIsl(), inv = invOf(game, k), cap = capOf(game, k), col = game.state.ui.invCollapsed;
  setHTML($('invTitle'), `${img(SPR.icon.chest, 2)}<span>Inselinventar &middot; ${esc(islLabel(k))}${ui.camIsl < 0 ? ' <span class="xs muted">(zuletzt)</span>' : ''}</span>`);
  $('invTog').innerHTML = col ? '&#9656;' : '&#9662;';
  $('invBody').classList.toggle('hidden', col);
  if (col) return;
  // nur Items, die vorhanden sind oder sich bewegen; Reihenfolge wie ITEM_ORDER
  const R = ratesFor(k), rows = [];
  for (const it of ITEM_ORDER) {
    const n = Math.floor(inv[it] || 0), r = R[it];
    if (!n && !active(r)) continue;
    const f = cap ? Math.min(1, n / cap) : 0, net = r ? r.p - r.c : 0, S = sollIst(k, it);
    // Soll groß (Plan der Gebäude), Ist klein darunter (gelb: mehr als 20 % darunter); ohne Plan die Netto-Rate
    const rt = S.has ? `<span class="rt soll"><b class="${rateCls(S.soll)}">${fmtRate(S.soll, true)}</b><span class="ist${S.low ? ' warnc' : ''}">Ist ${fmtRate(S.ist, true)}</span></span>`
      : `<span class="rt ${rateCls(net)}">${fmtRate(net, true)}/min</span>`;
    rows.push({
      k: it, tag: 'button', cls: `res${ui.popItem === it ? ' on' : ''}`,
      html: `${img(SPR.item[it], 2)}<span class="nm">${ITEMS[it].name}<span class="minibar"><span class="${f >= 1 ? 'full' : ''}" style="width:${f * 100}%"></span></span></span><span class="vl">${fmt(n)}</span>${rt}`
    });
  }
  // Flüssigkeiten der Insel (in Rohren und Tanks): nur, wenn vorhanden oder in Bewegung
  const fl = [];
  for (const f of FLUID_ORDER) {
    const S = fluidStock(game, k, f), r = R[f];
    if (S.n < 0.5 && !active(r)) continue;
    const fr = S.cap ? Math.min(1, S.n / S.cap) : 0;
    fl.push({
      k: f, tag: 'button', cls: `res${ui.popItem === f ? ' on' : ''}`,
      html: `${img(SPR.item[f], 2)}<span class="nm">${FLUIDS[f].name}<span class="minibar"><span class="${fr >= 1 ? 'full' : ''}" style="width:${fr * 100}%"></span></span></span><span class="vl">${fmt(Math.floor(S.n))}</span><span class="rt"><span class="pos">+${fmtRate(r ? r.p : 0)}</span> <span class="neg">&minus;${fmtRate(r ? r.c : 0)}</span>/min</span>`
    });
  }
  if (fl.length) rows.push({ k: '_fl', cls: 'lbl invsec', html: 'Flüssigkeiten' }, ...fl);
  if (!rows.length) rows.push({ k: '_leer', cls: 'empty xs muted', html: cap ? 'Noch nichts im Kontor.' : game.W.npcOf(k) ? `Hier wohnt ${esc(npcName(game.W.npcOf(k)))}. Auf dieser Insel kannst du nicht bauen.` : 'Auf dieser Insel gibt es kein Kontor.' });
  // Weitere Speicher der Insel (Lagerkisten, Handelskontore): eigener Bestand, nicht im Inselinventar
  const more = [...game.blds.values()].filter(b => b.isl === k && (b.t === 'kiste' || b.t === 'handelskontor'));
  if (more.length) {
    const open = !!game.state.ui.invMore;
    rows.push({ k: '_more', tag: 'button', cls: 'lbl invsec more', html: `${open ? '&#9662;' : '&#9656;'} Weitere Speicher (${more.length})` });
    if (open) for (const b of more) {
      const inv = stockRead(game, b), c = storeCap(game, b), its = Object.keys(inv).filter(it => Math.floor(inv[it]) > 0);
      const tot = its.reduce((a, it) => a + Math.floor(inv[it]), 0), full = its.filter(it => inv[it] >= c).length;
      rows.push({ k: 'S' + b.id, tag: 'button', cls: 'res store', html: `${img(bIcon(b.t), 1)}<span class="nm">${b.t === 'kiste' ? BD.kiste.name : kontorKind(game, b)}<span class="xs muted"> ${its.slice(0, 6).map(it => img(SPR.item[it], 1)).join('')}</span></span><span class="vl">${fmt(tot)}</span><span class="rt xs ${full ? 'warnc' : 'muted'}">${full ? `${full} voll` : `je ${fmt(c)}`}</span>` });
    }
  }
  patchList($('inventory'), rows);
  const ps = islPower(game, k);
  setHTML($('invDetail'), `Kapazität: <b>${fmt(cap)}</b> je Ware im Hauptkontor` +
    (ps.cap ? `<div class="row" style="margin-top:5px" data-tip="power">${img(SPR.icon.bolt, 2)}<div class="bar blue" style="height:9px"><div style="width:${ps.e / ps.cap * 100}%"></div></div><span class="pix">${Math.floor(ps.e)}/${ps.cap}</span></div>` : ''));
  renderPopover();
}

/* ---------- Popover ---------- */
export function openPopover(it) { ui.popItem = it; $('invPop')._html = null; renderInventory(); renderPopover(true); }
export function closePopover() {
  if (!ui.popItem) return;
  ui.popItem = null;
  $('invPop').classList.add('hidden');
  renderInventory();
}
export function renderPopover(force) {
  const el = $('invPop'), it = ui.popItem;
  if (!it || game.state.ui.invCollapsed) { el.classList.add('hidden'); return; }
  if (!force && uiBusy(el)) return;
  const k = curIsl();
  const changed = setHTML(el, `<div class="phead"><span class="row">${img(SPR.item[it], 2)}${resName(it)}<span class="xs muted" style="text-transform:none;letter-spacing:0">${esc(islLabel(k))}</span></span><button class="xbtn" data-act="popClose">&times;</button></div>
    <div class="pbody">${itemFacts(k, it)}${chartHTML()}${breakdownHTML(ratesFor(k)[it])}</div>`);
  el.classList.remove('hidden');
  if (changed || el._cv !== game.flowVer) { el._cv = game.flowVer; drawChart(el, k, it); }
  layout();
}

export function wireInventory() {
  registerTip('power', () => '<div class="xs">Gespeicherter Strom aller Netze dieser Insel</div>');
  $('invHead').addEventListener('click', () => {
    game.state.ui.invCollapsed = !game.state.ui.invCollapsed;
    if (game.state.ui.invCollapsed) ui.popItem = null;
    renderInventory(); layout();
  });
  $('inventory').addEventListener('click', e => {
    ui.uiPressed = false;
    const mo = e.target.closest('.more');
    if (mo) { game.state.ui.invMore = !game.state.ui.invMore; renderInventory(); layout(); return; }
    const sb = e.target.closest('.store');
    if (sb) { ui.selected = +sb.dataset.k.slice(1); ui.selTile = -1; ui.selShip = -1; game.state.ui.infoCollapsed = false; hooks.renderAll(); return; }
    const r = e.target.closest('.res');
    if (!r) return;
    if (ui.popItem === r.dataset.k) closePopover(); else openPopover(r.dataset.k);
  });
  $('invPop').addEventListener('click', e => { ui.uiPressed = false; if (e.target.closest('[data-act="popClose"]')) closePopover(); });
}
