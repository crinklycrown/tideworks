/* =========================================================
   VÖLKER (Taste N, seit Version 17): Handel, Ruf, Aufträge und Lieferverträge mit Ole, Brann und Aurel
   Ein Reiter je Volk (unentdeckte Völker ausgegraut). Liest nur den Spiegel (state.npc, Abfragen aus sim/npc.js).
   Kaufen und Verkaufen gehen über ein eigenes Schiff am Steg des Volks: Laden = kaufen (shipLoad), Entladen = verkaufen
   bzw. liefern (shipUnload). Pläne und Seekarten: npcBuy, Aufträge: npcDeliver, Lieferverträge: npcDeal.
   Knöpfe tragen data-nv="<Aktion>"; npcClick() führt sie aus (auch im Schiffs-Panel am Steg, ui/ships.js).
   Alle Zahlen stehen in data/npctrade.js.
   ========================================================= */
import { CYCLE } from '../config.js';
import { ITEMS } from '../data/items.js';
import { REP, REP_LEVELS, NPC_TRADE, CONTRACTS } from '../data/npctrade.js';
import { NPC_ORDER, TRADERS, traderInfo, npcName } from '../data/npcs.js';
import { npcGone, endingOf } from '../sim/ending.js';
import { npcOf, npcKnown, repLvl, lvlOf, lvlOk, basePrice, npcPays, npcAsks, npcStock, npcUnlocks, villageStage, sellOpen } from '../sim/npc.js';
import { npcPort } from '../sim/villages.js';
import { portOf, cargoOf, holdRoom } from '../sim/ships.js';
import { mine, islName } from '../sim/state.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR, flagSpr } from '../gfx/sprites.js';
import { esc, fmt, pad } from '../util/format.js';
import { game, ui, send, saveGame, afterSync } from './context.js';
import { setHTML } from './common.js';
import { registerWindow, renderWindow, openWindow } from './windows.js';
import { registerTip } from './tooltip.js';
import { renderInsights } from './insights.js';
import { holdsHTML, shipAction } from './ships.js';
import { centerOnTile } from '../gfx/camera.js';
import { coinsHTML } from './market.js';

const nw = { npc: null };
const LVL_NAME = { misstrauisch: 'Misstrauisch', neutral: 'Neutral', freundlich: 'Freundlich', vertraut: 'Vertraut' };
export const lvlName = (id) => LVL_NAME[id] || id;
const price = (v) => (v >= 100 ? fmt(Math.round(v)) : (Math.round(v * 10) / 10).toLocaleString('de-DE'));
const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${pad(Math.floor(Math.max(0, s) % 60))}`;
const lockTag = (lvl) => `<span class="nlock xs">${img(SPR.icon.lock, 1)} ab ${lvlName(lvl)}</span>`;

// Eigenes Schiff am Steg des Volks (das ausgewählte zuerst), sonst null
export function myShipAt(id) {
  const P = npcPort(game, id);
  if (!P) return null;
  const at = game.state.ships.filter(s => mine(game, s) && s.st !== 'sail' && portOf(game, s) === P);
  return at.find(s => s.id === ui.selShip) || at[0] || null;
}
// Fälligkeit eines Auftrags: „heute Abend“ / „morgen Abend“ / „in 2 Tagen“ und Restzeit
function dueText(due) {
  const t = game.state.time, d = Math.floor((due - 1) / CYCLE) - Math.floor(t / CYCLE);
  return `${d <= 0 ? 'bis heute Abend' : d === 1 ? 'bis morgen Abend' : `in ${d} Tagen`} &middot; noch ${mmss(due - t)}`;
}

/* ---------- Ruf ---------- */
function repHTML(id, N) {
  const L = repLvl(N.rep), next = REP_LEVELS[L + 1];
  const marks = REP_LEVELS.slice(1).map(R => `<i style="left:${R.min / REP.max * 100}%" title="${lvlName(R.id)} ab ${R.min}"></i>`).join('');
  return `<div class="row" style="gap:8px"><span class="nlvl l${L}">${lvlName(REP_LEVELS[L].id)}</span><div class="bar green nrep grow" data-tip="nv:rep"><div style="width:${N.rep / REP.max * 100}%"></div>${marks}</div><b class="xs">${Math.floor(N.rep)} / ${REP.max}</b></div>
    <div class="xs muted" style="margin:3px 0 0">${next ? `Ab Ruf ${next.min}: ${lvlName(next.id)}.` : 'Höchste Stufe erreicht.'} Ankauf ${Math.round(lvlOf(N).buy * 100)} %, Verkauf ${Math.round(lvlOf(N).sell * 100)} % des Grundpreises, ${lvlOf(N).orders} Auftr${lvlOf(N).orders === 1 ? 'ag' : 'äge'} gleichzeitig.</div>`;
}

/* ---------- Angebot (was das Volk verkauft) ---------- */
// Teil der Taucherglocke (ab Akt 3, data/npctrade.js part): ein Stück, Knopf „Kaufen“
function partHTML(id, N, s, e) {
  const p = npcAsks(game, id, e.it), st = npcStock(game, id, e.it), room = s && holdRoom(game, s, e.it);
  const btn = s ? `<button class="btn btn-green btn-xs" data-sact="load" data-ship="${s.id}" data-it="${e.it}" data-n="1" ${room && st ? '' : 'disabled'}>Kaufen</button>` : '';
  return `<div class="lrow">${img(SPR.item[e.it], 2)}<span class="grow xs"><b>${ITEMS[e.it].name}</b> &middot; ${img(SPR.icon.coin, 1)}${price(p)} &middot; <span class="muted">${st ? 'Teil der Taucherglocke' : 'kommt bald wieder'}</span></span>${btn}</div>`;
}
function sellsHTML(id, N, s) {
  const T = NPC_TRADE[id];
  let h = T.sells.filter(e => !e.it || sellOpen(game, e)).map(e => {
    if (e.part) return partHTML(id, N, s, e);
    if (e.soon) return `<div class="lrow soon">${img(SPR.icon.lock, 2)}<span class="grow xs"><b>${esc(e.soon)}</b> <span class="muted">&middot; bald</span></span>${lvlOk(N, e.lvl) ? '<span class="xs muted">noch nicht im Angebot</span>' : lockTag(e.lvl)}</div>`;
    const ok = lvlOk(N, e.lvl), p = npcAsks(game, id, e.it), st = npcStock(game, id, e.it), room = s && holdRoom(game, s, e.it);
    const btns = ok && s ? [10, 40].map(n => `<button class="btn btn-paper btn-xs" data-sact="load" data-ship="${s.id}" data-it="${e.it}" data-n="${n}" ${room && st ? '' : 'disabled'}>+${n}</button>`).join('')
      + `<button class="btn btn-paper btn-xs" data-sact="load" data-ship="${s.id}" data-it="${e.it}" data-n="-1" ${room && st ? '' : 'disabled'}>Alles</button>` : '';
    return `<div class="lrow${ok ? '' : ' soon'}">${img(SPR.item[e.it], 2)}<span class="grow xs"><b>${ITEMS[e.it].name}</b>${ok ? ` &middot; ${img(SPR.icon.coin, 1)}${price(p)} &middot; <span class="muted">${fmt(st)} da</span>` : ''}</span>${ok ? btns : lockTag(e.lvl)}</div>`;
  }).join('');
  const C = T.chart;
  if (C) {
    const ok = lvlOk(N, C.lvl);
    h += `<div class="lrow${ok ? '' : ' soon'}">${img(SPR.icon.map, 2)}<span class="grow xs"><b>Seekarte</b>${ok ? ` &middot; ${img(SPR.icon.coin, 1)}${fmt(C.price)} &middot; <span class="muted">heute noch ${N.chart}</span>` : ''}<br><span class="muted">Deckt die nächste unentdeckte Insel auf.</span></span>`
      + (ok ? `<button class="btn btn-green btn-xs" data-nv="buy" data-npc="${id}" data-key="karte" ${s && N.chart > 0 && (game.state.coins | 0) >= C.price ? '' : 'disabled'}>Kaufen</button>` : lockTag(C.lvl)) + '</div>';
  }
  return h;
}
/* ---------- Ankauf (was das Volk kauft) ---------- */
function buysHTML(id, N, s) {
  return NPC_TRADE[id].buys.map(e => {
    const ok = lvlOk(N, e.lvl), p = npcPays(game, id, e.it), have = s ? cargoOf(s, e.it) : 0;
    return `<div class="lrow${ok ? '' : ' soon'}">${img(SPR.item[e.it], 2)}<span class="grow xs"><b>${ITEMS[e.it].name}</b>${ok ? ` &middot; zahlt ${img(SPR.icon.coin, 1)}${price(p)}${N.sat[e.it] ? ` <span class="trdn" title="Preis gedrückt durch viel Verkauf">&#9660;</span>` : ''}` : ''}${have ? ` &middot; <span class="muted">${fmt(have)} an Bord</span>` : ''}</span>${ok ? '' : lockTag(e.lvl)}</div>`;
  }).join('') + `<div class="xs muted" style="margin-top:3px">Verkauft wird mit „Entladen“ am Laderaum. Viel Verkauf drückt den Preis, er erholt sich langsam.</div>`;
}
/* ---------- Aufträge ---------- */
function ordersHTML(id, N, s) {
  if (!N.orders.length) return '<div class="xs muted">Gerade keine Aufträge. Neue gibt es jeden Morgen.</div>';
  return N.orders.map(o => {
    const have = s ? cargoOf(s, o.it) : 0;
    return `<div class="tord buy"><div class="row">${img(SPR.item[o.it], 2)}<span class="grow xs"><b>${fmt(o.n)} ${ITEMS[o.it].name}</b> &middot; ${fmt(o.got)} geliefert</span>
      <button class="btn btn-green btn-xs" data-nv="deliver" data-npc="${id}" data-oid="${o.id}" ${s && have ? '' : 'disabled'} title="${s ? have ? `${fmt(have)} an Bord` : 'nichts davon an Bord' : 'kein Schiff am Steg'}">Liefern</button></div>
      <div class="minibar"><span style="width:${o.got / o.n * 100}%"></span></div>
      <div class="xs muted">Belohnung ${img(SPR.icon.coin, 1)}${fmt(o.pay)} und +${o.rep} Ruf &middot; ${dueText(o.due)}</div></div>`;
  }).join('') + '<div class="xs muted" style="margin-top:3px">Auch „Entladen“ und Routen liefern zuerst an offene Aufträge. Läuft ein Auftrag ab, zahlt das Volk nur für das Gelieferte.</div>';
}
/* ---------- Lieferverträge ---------- */
function dealsHTML(id, N, s) {
  const T = NPC_TRADE[id];
  if (!T.deals || !T.deals.length) return '';
  const rows = T.deals.map(t => {
    const d = N.deals.find(x => x.id === t.id), ok = lvlOk(N, t.lvl);
    if (d) return `<div class="tord sell"><div class="row">${img(SPR.item[t.it], 2)}<span class="grow xs"><b>${fmt(d.n)} ${ITEMS[t.it].name} je Tag</b> &middot; ${img(SPR.icon.coin, 1)}${price(d.p)} je Stück</span><button class="btn btn-paper btn-xs" data-nv="dealEnd" data-npc="${id}" data-deal="${t.id}">Kündigen</button></div>
      <div class="minibar"><span class="${d.got >= d.n ? 'full' : ''}" style="width:${Math.min(1, d.got / d.n) * 100}%"></span></div>
      <div class="xs muted">Heute ${fmt(d.got)} von ${fmt(d.n)}${d.fresh ? ' (erster Tag, zählt noch nicht)' : ''} &middot; erfüllt: +${fmt(d.bonus)} Münzen, +${d.rep} Ruf${d.miss ? ` &middot; <span class="bad">${d.miss}× verpasst</span>` : ''}</div></div>`;
    return `<div class="lrow${ok ? '' : ' soon'}">${img(SPR.item[t.it], 2)}<span class="grow xs"><b>${fmt(t.n)} ${ITEMS[t.it].name} je Tag</b>${ok ? ` &middot; ${img(SPR.icon.coin, 1)}${price(basePrice(t.it) * t.f)} je Stück, +${fmt(t.bonus)} je Tag` : ''}</span>`
      + (ok ? `<button class="btn btn-green btn-xs" data-nv="dealTake" data-npc="${id}" data-deal="${t.id}" ${s && N.deals.length < CONTRACTS.max ? '' : 'disabled'} title="${s ? '' : 'Ein Schiff muss am Steg liegen'}">Abschließen</button>` : lockTag(t.lvl)) + '</div>';
  }).join('');
  return `<div class="lbl mt" data-tip="nv:deal">Lieferverträge</div>${rows}<div class="xs muted" style="margin-top:3px">Es zählen nur Lieferungen über eine Route mit diesem Steg als Stopp. Abgerechnet wird jeden Morgen; verpasst kostet ${CONTRACTS.missRep} Ruf, nach ${CONTRACTS.missMax} Tagen in Folge kündigt ${esc(npcName(id))}.</div>`;
}
/* ---------- Pläne und Freischaltungen ---------- */
function unlocksHTML(id, N, s) {
  const unl = game.state.unl || {};
  return npcUnlocks(id).map(u => {
    const have = !!unl[u.key], ok = lvlOk(N, u.lvl);
    const right = have ? `<span class="xs good">${img(SPR.icon.check, 1)} ${u.plan ? 'gekauft' : 'freigeschaltet'}</span>`
      : !ok ? lockTag(u.lvl)
      : u.plan ? `<button class="btn btn-green btn-xs" data-nv="buy" data-npc="${id}" data-key="${u.key}" ${s && (game.state.coins | 0) >= u.price ? '' : 'disabled'} title="${s ? '' : 'Ein Schiff muss am Steg liegen'}">${img(SPR.icon.coin, 1)}${fmt(u.price)}</button>` : '';
    return `<div class="lrow${ok || have ? '' : ' soon'}">${img(u.plan ? SPR.icon.book : SPR.icon.star, 2)}<span class="grow xs"><b>${esc(u.name)}</b> <span class="muted">${u.plan ? '&middot; Plan (Voraussetzung in der Forschung)' : '&middot; zum Bauen'}</span></span>${right}</div>`;
  }).join('');
}
/* ---------- Dorf ---------- */
function villageHTML(id, N) {
  const V = NPC_TRADE[id].village, st = villageStage(id, N.del), next = V[st];
  return `<div class="stat"><span>Dorfstufe</span><b>${st} / ${V.length}</b></div>
    <div class="row" style="gap:6px;margin:4px 0"><div class="bar grow"><div style="width:${next ? Math.min(1, N.del / next.at) * 100 : 100}%"></div></div><span class="xs muted">${next ? `${fmt(N.del)} / ${fmt(next.at)}` : 'fertig'}</span></div>
    <div class="xs muted">Wert aller Lieferungen. Mit jeder Stufe baut ${esc(npcName(id))} neue Häuser, nachts brennen mehr Lichter.</div>`;
}

// Nach dem Ende (0.23.0): ein Volk, das nicht mehr handelt
const GONE = {
  a: { aurel: 'Aurel ist ins Exil gegangen. Seine Fabriken hat er angezündet, bevor er ablegte. Der Inselrat hat dir den Goldberg übergeben: Dein Hauptkontor steht an seinem alten Steg. Einen Teil seiner Waren verkauft jetzt der Inselrat.' },
  b: { aurel: 'Aurel handelt nicht mehr. Er verlangt nichts von dir: Seine Insel gehört dir mit allen Gebäuden, wie eine Kolonie nach „Kontor gründen“. Er steht noch an deinem Kontor am Goldberg.',
       ole: 'Pfahldorf liegt in Ruinen. Vom Steg sind nur die Pfähle geblieben. Niemand ist mehr da.',
       brann: 'Die Werkstattbucht liegt in Ruinen. Die Essen sind kalt, niemand ist mehr da.' }
};
function npcHTML(id) {
  const N = npcOf(game, id), V = traderInfo(id), P = npcPort(game, id), s = myShipAt(id), gone = npcGone(game, id);
  let h = `<div class="row" style="gap:8px">${P ? img(flagSpr(V.flag), 2) : ''}<div class="grow"><div class="pix" style="font-size:18px;font-weight:600">${esc(npcName(id))}</div><div class="xs muted">${esc(V.role)} &middot; ${P ? esc(islName(game, P.isl)) : V.isl}</div></div><span class="pix" style="font-size:16px">${coinsHTML(game.state.coins | 0, 2)}</span></div>`;
  if (gone) return h + `<div class="hint mt">${esc((GONE[endingOf(game)] || {})[id] || 'Kein Handel mehr.')}</div>` + (N.log.length ? `<div class="lbl mt">Zuletzt</div>${N.log.slice().reverse().map(l => `<div class="xs nlog">${esc(l.s)}</div>`).join('')}` : '');
  h += `<div class="mt">${repHTML(id, N)}</div>`;
  if (s) h += `<div class="lbl mt">${esc(s.name)} am Steg</div>${holdsHTML(s, P)}`;
  else h += `<div class="hint mt">Kein Schiff von dir an ${esc(npcName(id))}s Steg. Leg mit einem Schiff dort an, um zu kaufen, zu verkaufen, Aufträge zu liefern und Verträge abzuschließen.${P ? ` <button class="btn btn-paper btn-xs" data-nv="loc" data-npc="${id}">Zeigen</button>` : ''}</div>`;
  h += `<div class="lbl mt">Angebot</div>${sellsHTML(id, N, s)}`;
  h += `<div class="lbl mt">${esc(npcName(id))} kauft</div>${buysHTML(id, N, s)}`;
  h += `<div class="lbl mt">Aufträge</div>${ordersHTML(id, N, s)}`;
  h += dealsHTML(id, N, s);
  h += `<div class="lbl mt">Pläne und Freischaltungen</div>${unlocksHTML(id, N, s)}`;
  if ((NPC_TRADE[id].village || []).length) h += `<div class="lbl mt">Dorf</div>${villageHTML(id, N)}`;
  if (N.log.length) h += `<div class="lbl mt">Zuletzt</div>${N.log.slice().reverse().map(l => `<div class="xs nlog">${esc(l.s)}</div>`).join('')}`;
  return h;
}
function npcsHTML() {
  const st = game.state;
  if (!st.npc) return '<div class="hint">In diesem Spiel gibt es keine Völker (Getrennte Inseln haben vorerst keine Geschichte).</div>';
  // Reiter: die drei Völker, nach Ende A zusätzlich der Inselrat; nach dem Ende ohne Handel mit „fort“ bzw. „Ruinen“
  const ids = TRADERS.filter(id => NPC_ORDER.includes(id) || npcKnown(game, id));
  const known = ids.filter(id => npcKnown(game, id));
  if (!known.includes(nw.npc)) nw.npc = known.find(id => !npcGone(game, id)) || known[0] || null;
  const tabs = `<div class="seg stabs">${ids.map(id => {
    const ok = known.includes(id), N = npcOf(game, id), gone = ok && npcGone(game, id);
    const tag = gone ? `<span class="xs muted">${id === 'aurel' ? (endingOf(game) === 'a' ? 'fort' : 'kein Handel') : 'Ruinen'}</span>` : `<span class="xs nlvl l${repLvl(N.rep)}">${lvlName(lvlOf(N).id)}</span>`;
    return `<button class="segb${id === nw.npc ? ' on' : ''}" data-ntab="${id}" ${ok ? '' : 'disabled'}>${ok ? `${esc(npcName(id))} ${tag}` : '???'}</button>`;
  }).join('')}</div>`;
  if (!nw.npc) return tabs + '<div class="hint">Noch hast du kein Volk getroffen. Erkunde das Meer um deine Heimatinsel: Auf einer Insel mit Steg und Dorf wohnt jemand, der mit dir handeln möchte.</div>';
  return tabs + npcHTML(nw.npc);
}
// Fenster für ein Volk öffnen (Schiffs-Panel, Info-Panel)
export function openNpc(id) { nw.npc = id; if (ui.win === 'npcs') renderWindow(true); else openWindow('npcs'); }

// Knöpfe mit data-nv (Fenster, Schiffs-Panel); true = verbraucht
export function npcClick(e) {
  const a = e.target.closest('[data-nv]');
  if (!a) return false;
  const id = a.dataset.npc, s = myShipAt(id), act = a.dataset.nv;
  if (act === 'open') { openNpc(id); return true; }
  if (act === 'loc') { const P = npcPort(game, id); if (P) { centerOnTile(P.x + 1, P.y + 1); ui.selected = P.id; renderInsights(); } return true; }
  if (act === 'buy') send({ type: 'npcBuy', npc: id, key: a.dataset.key, ship: s ? s.id : null });
  else if (act === 'deliver') send({ type: 'npcDeliver', npc: id, oid: +a.dataset.oid, ship: s ? s.id : null });
  else if (act === 'dealTake') send({ type: 'npcDeal', npc: id, deal: a.dataset.deal, op: 'take', ship: s ? s.id : null });
  else if (act === 'dealEnd') send({ type: 'npcDeal', npc: id, deal: a.dataset.deal, op: 'end' });
  else return true;
  saveGame(); afterSync(() => { renderWindow(true); renderInsights(); });
  return true;
}

registerWindow('npcs', {
  title: 'Völker', icon: 'people', side: true,
  render(body) { setHTML(body, npcsHTML()); },
  wire(body) {
    body.addEventListener('click', e => {
      if (ui.win !== 'npcs') return;
      ui.uiPressed = false;
      const t = e.target.closest('[data-ntab]');
      if (t) { nw.npc = t.dataset.ntab; this.render(body); return; }
      if (npcClick(e)) return;
      // Laden/Entladen über die gemeinsamen Schiffs-Knöpfe
      const sa = e.target.closest('[data-sact]');
      if (sa && shipAction(sa)) afterSync(() => renderWindow(true));
    });
  }
});
registerTip('nv', (c) => c === 'rep'
  ? `<div class="tt-h"><span>Ruf</span></div><div class="xs">Steigt mit Verkäufen (1 Punkt je ${REP.sale} Münzen), erledigten Aufträgen und erfüllten Lieferverträgen; sinkt bei verpassten Verträgen. Stufen: ${REP_LEVELS.map(L => `${lvlName(L.id)} ab ${L.min}`).join(', ')}. Mit jeder Stufe wird das Angebot größer und die Preise besser.</div>`
  : `<div class="tt-h"><span>Lieferverträge</span></div><div class="xs">Feste Menge je Tag zu einem festen, guten Preis, plus Bonus am Morgen. Lege eine Route an, die hier entlädt. Höchstens ${CONTRACTS.max} je Volk.</div>`);
