/* =========================================================
   RELIKTE (Taste L, seit 0.24.0): Fenster „Relikte“ (Sammlung, eingesetzte Relikte, Herkunft),
   Info-Panel des Reliktsockels (Einsetzen, Herausnehmen, Ware des Füllhorns), Zeile im Lagerfenster, Tooltips.
   Liest nur den Spiegel (state.relics, Abfragen aus sim/relics.js). Einsetzen und Herausnehmen gehen als Kommando an den Host
   (relicPut, relicTake). Zahlen und Texte: data/relics.js.
   ========================================================= */
import { RELICS, RELIC_ORDER, RELIC_TIERS, RELIC_SOURCE_TEXT, RELIC_UPKEEP } from '../data/relics.js';
import { ITEMS } from '../data/items.js';
import { npcName } from '../data/npcs.js';
import { relicsFree, pedTier, pedestalState, fxLines, upkeepText, PICK_LIST } from '../sim/relics.js';
import { islName, mine } from '../sim/state.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { esc } from '../util/format.js';
import { centerOnTile } from '../gfx/camera.js';
import { game, ui, send, saveGame, afterSync } from './context.js';
import { setHTML } from './common.js';
import { registerWindow, renderWindow } from './windows.js';
import { registerTip } from './tooltip.js';
import { renderInsights } from './insights.js';

export const tierTag = (t) => `<span class="rtier t${t}">${RELIC_TIERS[t] ? RELIC_TIERS[t].name : ''}</span>`;
// Herkunft eines Eintrags als Text (e.src)
function srcText(src) {
  if (!src) return '';
  const [k, id] = String(src).split(':');
  if (k === 'npc') return `gekauft bei ${npcName(id)}`;
  if (k === 'auftrag') return `Auftrag von ${npcName(id)}`;
  return { tauchen: 'Tauchgang', ende: 'die Entscheidung am Leuchtturm', debug: 'Debug', meer: 'Meerjungfrauen' }[k] || '';
}
// Tooltip eines Relikts: Name, Stufe, Text, genaue Wirkung, Unterhalt (pick = gewählte Ware des Füllhorns)
export function relicTipHTML(id, pick, e) {
  const D = RELICS[id];
  if (!D) return '';
  const st = e && e.at != null ? (e.off ? '<div class="xs bad">Die Wirkung ruht: keine Perlen im Inselinventar.</div>' : `<div class="xs good">Wirkt auf ${esc(islName(game, e.isl))}.</div>`) : '';
  return `<div class="tt-h"><span>${esc(D.name)}</span>${tierTag(D.tier)}</div><div class="xs rdesc">${esc(D.desc)}</div>`
    + `<div class="xs" style="margin-top:4px"><b>Wirkung auf die ganze Insel:</b></div>` + fxLines(D.fx, pick).map(l => `<div class="xs">&middot; ${esc(l)}</div>`).join('')
    + (upkeepText(id) ? `<div class="xs muted" style="margin-top:3px">${esc(upkeepText(id))}. Fehlen sie, ruht die Wirkung.</div>` : '')
    + (D.tier === 3 ? '<div class="xs muted">Legendär: Es gibt dieses Relikt nur einmal im Spiel.</div>' : '')
    + (D.end ? '<div class="xs muted">End-Relikt: kommt nur mit der Entscheidung am Leuchtturm.</div>' : '')
    + (e && srcText(e.src) ? `<div class="xs muted">Herkunft: ${esc(srcText(e.src))}</div>` : '') + st;
}
registerTip('relic', (arg) => {
  const [id, u] = arg.split('|'), S = game.state.relics, e = S && u ? S.list.find(x => x.u === +u) : null;
  return relicTipHTML(id, e && e.pick, e);
});
// Relikt der Insel (Lagerfenster): Name und Wirkung
registerTip('relicIsl', (k) => {
  const e = activeOn(+k);
  return e ? relicTipHTML(e.id, e.pick, e) : '';
});
// eingesetztes Relikt auf Insel k (aktiv oder ruhend) oder null
export function activeOn(k) { const S = game.state.relics; return S ? S.list.find(e => e.at != null && e.isl === k) || null : null; }

/* ---------- Zeile im Lagerfenster ---------- */
export function islandRelicHTML(k) {
  const e = activeOn(k), D = e && RELICS[e.id];
  if (!D) return '';
  const lines = fxLines(D.fx, e.pick);
  return `<div class="relicline${e.off ? ' off' : ''}" data-tip="relicIsl:${k}">${img(SPR.relic[e.id], 2)}<span class="grow"><b>${esc(D.name)}</b>${e.off ? ' <span class="bad">ruht</span>' : ''}<br><span class="xs muted">${esc(lines.join(' · '))}</span></span></div>`;
}

/* ---------- Info-Panel des Sockels ---------- */
const picking = () => ui.relicPick || null;   // Füllhorn: Nummer des Relikts, für das gerade eine Ware gewählt wird
function pickGrid(u, sel) {
  return `<div class="picker">${PICK_LIST.map(it => `<button class="itb${it === sel ? ' on' : ''}" data-act="relicPick" data-u="${u}" data-v="${it}" title="${ITEMS[it].name}">${img(SPR.item[it], 2)}</button>`).join('')}</div>`;
}
export function pedestalHTML(b) {
  const tier = pedTier(b.t), st = pedestalState(game, b), e = st.e, own = mine(game, b);
  let h = `<div class="stat"><span>Stufe</span><b>${tierTag(tier)} hält ${tier === 3 ? 'jedes Relikt' : tier === 2 ? 'seltene und gewöhnliche' : 'gewöhnliche'}</b></div>`;
  if (!game.state.relics) return h + '<div class="xs muted">In diesem Spiel gibt es keine Relikte.</div>';
  if (e) {
    const D = RELICS[e.id];
    h += `<div class="relicbox${st.active ? '' : ' off'}" data-tip="relic:${e.id}|${e.u}">${img(SPR.relic[e.id], 3)}<div class="grow"><div class="pix" style="font-size:15px;font-weight:600">${esc(D.name)}</div>${tierTag(D.tier)}
      <div class="xs rdesc">${esc(D.desc)}</div></div></div>`;
    h += fxLines(D.fx, e.pick).map(l => `<div class="xs ${st.active ? 'good' : 'muted'}">&middot; ${esc(l)}</div>`).join('');
    if (upkeepText(e.id)) h += `<div class="xs muted">${esc(upkeepText(e.id))}.</div>`;
    if (!st.active) h += `<div class="warn xs">${esc(st.why)}</div>`;
    if (D.fx.double) h += `<div class="lbl" style="margin-top:6px">Doppelte Ware</div>${pickGrid(e.u, e.pick)}`;
    if (own) h += `<div class="btns"><button class="btn btn-paper btn-sm" data-act="relicTake" style="grid-column:1/-1">Herausnehmen</button></div>`;
  } else h += '<div class="hint">Kein Relikt eingesetzt. Wähle eins aus deiner Sammlung.</div>';
  if (!own) return h;
  // Sammlung: was hier passt (frei, nicht eingesetzt), dazu die, für die der Sockel zu klein ist
  const free = relicsFree(game, tier), big = relicsFree(game, 3).filter(x => RELICS[x.id].tier > tier);
  if (free.length) {
    h += `<div class="lbl" style="margin-top:8px">${e ? 'Austauschen gegen' : 'Einsetzen'}</div>` + free.map(x => {
      const D = RELICS[x.id], pk = picking() === x.u;
      return `<div class="lrow" data-tip="relic:${x.id}|${x.u}">${img(SPR.relic[x.id], 2)}<span class="grow xs"><b>${esc(D.name)}</b> ${tierTag(D.tier)}<br><span class="muted">${esc(fxLines(D.fx).join(' · '))}</span></span>
        <button class="btn btn-green btn-xs" data-act="relicPut" data-u="${x.u}">${D.fx.double ? (pk ? 'Ware wählen …' : 'Einsetzen …') : 'Einsetzen'}</button></div>` + (pk ? `<div class="xs muted">Welche Ware soll doppelt kommen?</div>${pickGrid(x.u, null)}` : '');
    }).join('');
  } else if (!e) h += `<div class="xs muted" style="margin-top:6px">In deiner Sammlung liegt kein freies Relikt${tier < 3 ? ' dieser Stufe' : ''}. Relikte gibt es bei den Völkern, als Belohnung für Aufträge und bei Tauchgängen (Fenster „Relikte“, L).</div>`;
  if (big.length) h += `<div class="xs muted" style="margin-top:4px">${big.length} ${big.length === 1 ? 'weiteres Relikt passt' : 'weitere Relikte passen'} erst in einen höheren Sockel. Werte ihn auf (U).</div>`;
  return h;
}
// Klicks im Info-Panel (ui/panels.js); true = verbraucht
export function pedestalClick(a, b) {
  const act = a.dataset.act;
  if (act === 'relicPut') {
    const u = +a.dataset.u, e = game.state.relics.list.find(x => x.u === u);
    if (e && RELICS[e.id].fx.double) { ui.relicPick = ui.relicPick === u ? null : u; renderInsights(); return true; }
    send({ type: 'relicPut', id: b.id, u });
  } else if (act === 'relicPick') { send({ type: 'relicPut', id: b.id, u: +a.dataset.u, pick: a.dataset.v }); ui.relicPick = null; }
  else if (act === 'relicTake') send({ type: 'relicTake', id: b.id });
  else return false;
  saveGame(); afterSync(() => { renderInsights(); renderWindow(true); });
  return true;
}

/* ---------- Fenster „Relikte“ ---------- */
function relicsHTML() {
  const S = game.state.relics;
  if (!S) return '<div class="hint">In diesem Spiel gibt es keine Relikte.</div>';
  const have = new Set(S.list.map(e => e.id)), seated = S.list.filter(e => e.at != null);
  let h = `<div class="row" style="gap:8px">${img(SPR.icon.relic, 3)}<div class="grow"><div class="pix" style="font-size:18px;font-weight:600">Reliktsammlung</div>
    <div class="xs muted">Fundstücke aus dem versunkenen Land. ${have.size} von ${RELIC_ORDER.length} Arten gefunden, ${S.list.length} Relikt${S.list.length === 1 ? '' : 'e'} insgesamt.</div></div></div>`;
  h += `<div class="xs muted" style="margin-top:6px">Ein Reliktsockel (Baumenü „Wohnen“) hält ein Relikt, seine Wirkung gilt für die ganze Insel. Einsetzen und Herausnehmen per Klick auf den Sockel. Ein Relikt passt in einen Sockel gleicher oder höherer Stufe.</div>`;
  // eingesetzt
  h += `<div class="lbl mt">Eingesetzt</div>` + (seated.length ? seated.map(e => {
    const D = RELICS[e.id];
    return `<div class="lrow${e.off ? ' soon' : ''}" data-tip="relic:${e.id}|${e.u}">${img(SPR.relic[e.id], 2)}<span class="grow xs"><b>${esc(D.name)}</b> &middot; ${esc(islName(game, e.isl))}${e.off ? ' &middot; <span class="bad">ruht (keine Perlen)</span>' : ''}<br><span class="muted">${esc(fxLines(D.fx, e.pick).join(' · '))}</span></span>
      <button class="btn btn-paper btn-xs" data-rl="show" data-id="${e.at}">Zeigen</button></div>`;
  }).join('') : '<div class="xs muted">Noch kein Relikt in einem Sockel.</div>');
  // Sammlung je Stufe
  for (const t of [1, 2, 3]) {
    const ids = RELIC_ORDER.filter(id => RELICS[id].tier === t);
    h += `<div class="lbl mt">${tierTag(t)} <span class="xs muted">${ids.filter(id => have.has(id)).length} / ${ids.length}</span></div><div class="rgrid">` + ids.map(id => {
      const D = RELICS[id], list = S.list.filter(e => e.id === id), free = list.filter(e => e.at == null).length;
      if (!list.length) return `<div class="rcell unk" title="Noch nicht gefunden">${img(SPR.relicShadow[id], 3)}<span class="xs muted">${D.end ? 'End-Relikt' : 'unbekannt'}</span></div>`;
      const n = list.length, where = n > 1 ? `${n}× · ${free ? `${free} frei` : 'alle eingesetzt'}` : free ? 'in der Sammlung' : 'eingesetzt';
      return `<div class="rcell" data-tip="relic:${id}|${list[0].u}">${img(SPR.relic[id], 3)}<span class="xs"><b>${esc(D.name)}</b></span><span class="xs ${free ? 'muted' : 'good'}">${where}</span></div>`;
    }).join('') + '</div>';
  }
  // Herkunft
  h += `<div class="lbl mt">Herkunft</div>` + RELIC_SOURCE_TEXT.map(s => `<div class="lrow${s.soon ? ' soon' : ''}"><span class="grow xs"><b>${esc(s.name)}</b>${s.soon ? ' <span class="muted">&middot; bald</span>' : ''}<br><span class="muted">${esc(s.text)}</span></span>${s.tiers.map(tierTag).join(' ')}</div>`).join('');
  const ofr = ['ole', 'brann', 'aurel'].map(id => { const N = game.state.npc && game.state.npc[id]; return N && N.relic && RELICS[N.relic.id] ? `${npcName(id)}: ${RELICS[N.relic.id].name}` : ''; }).filter(Boolean);
  if (ofr.length) h += `<div class="xs muted" style="margin-top:4px">Heute im Angebot: ${esc(ofr.join(' · '))} (Fenster „Völker“, N).</div>`;
  h += `<div class="xs muted" style="margin-top:4px">Legendäre Relikte gibt es je nur einmal. Eingesetzt verbrauchen sie ${RELIC_UPKEEP.perDay} Perlen je Spieltag aus dem Inselinventar.</div>`;
  return h;
}
registerWindow('relics', {
  title: 'Relikte', icon: 'relic', side: true,
  render(body) { setHTML(body, relicsHTML()); },
  wire(body) {
    body.addEventListener('click', e => {
      if (ui.win !== 'relics') return;
      ui.uiPressed = false;
      const a = e.target.closest('[data-rl="show"]');
      if (!a) return;
      const b = game.blds.get(+a.dataset.id);
      if (b) { centerOnTile(b.x + 1, b.y + 1); ui.selected = b.id; ui.selTile = -1; ui.selShip = -1; game.state.ui.infoCollapsed = false; renderInsights(); }
    });
  }
});
// Kurztext eines Relikts für Meldungen
export const relicName = (id) => RELICS[id] ? RELICS[id].name : id;
