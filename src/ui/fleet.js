/* =========================================================
   FENSTER „FLOTTE“ (F) – Seitenpanel rechts
   Je Schiff ein Eintrag: Name (umbenennbar), Status, Laderäume, Kontor gründen, Laden/Entladen am Kontor
   und der Routen-Editor (Stopps mit Entladen/Laden, Warten, Umsortieren).
   Änderungen an der Route schicken die ganze, geänderte Stopp-Liste an die Simulation (setRoute).
   Aufgeklappte Teile merkt sich ui.fleet[Schiff-ID] = { route, stop, pick, add }.
   Getrennte Inseln: nur eigene Schiffe; oben „Anfragen“ (Routen von Mitspielern zum eigenen Hauptkontor,
   Erlauben/Ablehnen) und „Erlaubte Routen“ (Widerrufen). Daten: game.perms aus dem Schnappschuss.
   ========================================================= */
import { shipDiveHTML } from './dive.js';
import { SHIP_WAIT_MAX } from '../config.js';
import { mods, holdCapOf } from '../sim/mods.js';
import { SHIP_KINDS } from '../data/ships.js';
import { ITEMS, ITEM_ORDER } from '../data/items.js';
import { esc } from '../util/format.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR, flagSpr } from '../gfx/sprites.js';
import { flagOf, isSep, mine, playerName } from '../sim/state.js';
import { portList } from '../sim/kontor.js';
import { MAX_STOPS, MAX_ORDERS, stopAllowed } from '../sim/ships.js';
import { game, ui, send, afterSync, saveGame, $ } from './context.js';
import { patchList, setHTML, islLabel } from './common.js';
import { registerWindow, renderWindow, openWindow } from './windows.js';
import { shipStatus, shipSpr, kindName, portLabel, portFlag, autoHTML, holdsHTML, foundHTML, resumeHTML, portHTML, pickHTML, shipAction, shipById, stopsProblem, routeAdd, routeFinish, hooks } from './ships.js';
import { npcClick } from './npcs.js';
import { toast } from './toasts.js';

const LOAD_MODES = [['all', 'so viel wie möglich'], ['upto', 'bis Menge an Bord'], ['keep', 'Menge im Kontor lassen']];
const UNLOAD_MODES = [['all', 'alles'], ['keep', 'Menge an Bord lassen']];
const fs = (id) => ui.fleet[id] || (ui.fleet[id] = { route: false, stop: -1, pick: null, add: false });
const flagImg = (id, s = 1) => img(flagSpr(portFlag(id)), s);
// Auswahl der Kontore (Hauptkontore und Handelskontore) für Routen-Stopps
const portPick = (act) => portList(game).filter(P => stopAllowed(game, P, game.me || 'host')).map(P => `<button class="segb" data-ract="${act}" data-kontor="${P.id}">${flagImg(P.id, 1)}${esc(portLabel(P.id))}</button>`).join('');
const itemIcon = (it, s = 2) => it === '*' ? `<span class="allw">alle</span>` : img(SPR.item[it], s);

function orderHTML(s, i, kind, o, j) {
  const modes = kind === 'load' ? LOAD_MODES : UNLOAD_MODES, f = fs(s.id), pick = f.pick && f.pick.stop === i && f.pick.kind === kind && f.pick.o === j;
  const name = o.it === '*' ? 'Alle Waren' : ITEMS[o.it].name;
  let h = `<div class="ord" data-i="${i}" data-k="${kind}" data-o="${j}">
    <button class="itb${pick ? ' on' : ''}" data-ract="pick" title="${name} – Ware wählen">${itemIcon(o.it)}</button>
    <select class="sel" data-rf="mode">${modes.map(([m, t]) => `<option value="${m}" ${o.mode === m ? 'selected' : ''}>${t}</option>`).join('')}</select>
    ${o.mode === 'all' ? '<span class="grow"></span>' : `<input class="inp num" type="number" min="0" max="${holdCapOf(game, s) * s.cargo.length * 10}" step="10" data-rf="n" value="${o.n || 0}">`}
    <button class="xbtn" data-ract="rmOrder" title="Auftrag entfernen">&times;</button></div>`;
  if (pick) {
    const its = (kind === 'unload' ? ['*'] : []).concat(ITEM_ORDER);
    h += `<div class="picker" data-i="${i}" data-k="${kind}" data-o="${j}">${its.map(it => `<button class="itb${it === o.it ? ' on' : ''}" data-ract="setItem" data-it="${it}" title="${it === '*' ? 'Alle Waren' : ITEMS[it].name}">${itemIcon(it)}</button>`).join('')}</div>`;
  }
  return h;
}
// Erlaubnis am Hauptkontor eines Mitspielers: wartet / erlaubt / abgelehnt
function permTag(r, k) {
  const q = r.perm && r.perm[k];
  if (!q) return '';
  return q.st === 'ok' ? '<span class="xs good">· erlaubt</span>' : q.st === 'no' ? '<span class="xs bad">· abgelehnt</span>' : '<span class="xs bad">· wartet auf Erlaubnis</span>';
}
function stopHTML(s, i) {
  const r = s.route, st = r.stops[i], f = fs(s.id), open = f.stop === i, n = r.stops.length;
  const cur = i === r.idx && !r.paused;
  const sum = (arr) => arr.map(o => itemIcon(o.it, 1)).join('');
  let h = `<div class="stop${open ? ' open' : ''}${cur ? ' cur' : ''}">
    <div class="stoph" data-i="${i}">
      <button class="stopt" data-ract="toggle"><span class="num">${i + 1}</span>${flagImg(st.kontor, 2)}<span class="col" style="min-width:0;align-items:flex-start"><span class="nm">${esc(portLabel(st.kontor))}</span>
        <span class="sum">${st.unload.length ? `<span class="xs muted">Entladen</span>${sum(st.unload)}` : ''}${st.load.length ? `<span class="xs muted">Laden</span>${sum(st.load)}` : ''}${st.wait ? '<span class="xs muted">· wartet</span>' : ''}${!st.unload.length && !st.load.length ? '<span class="xs muted">keine Aufträge</span>' : ''}${permTag(r, st.kontor)}</span></span></button>
      <button class="xbtn" data-ract="up" title="Nach oben" ${i ? '' : 'disabled'}>&#9650;</button><button class="xbtn" data-ract="down" title="Nach unten" ${i < n - 1 ? '' : 'disabled'}>&#9660;</button><button class="xbtn" data-ract="rmStop" title="Stopp entfernen">&times;</button>
    </div>`;
  if (open) {
    h += `<div class="stopb" data-i="${i}">
      <div class="lbl">Entladen</div>${st.unload.map((o, j) => orderHTML(s, i, 'unload', o, j)).join('') || '<div class="xs muted">nichts</div>'}
      <button class="btn btn-paper btn-xs" data-ract="addOrder" data-k="unload" ${st.unload.length >= MAX_ORDERS ? 'disabled' : ''}>+ Ware entladen</button>
      <div class="lbl" style="margin-top:8px">Laden</div>${st.load.map((o, j) => orderHTML(s, i, 'load', o, j)).join('') || '<div class="xs muted">nichts</div>'}
      <button class="btn btn-paper btn-xs" data-ract="addOrder" data-k="load" ${st.load.length >= MAX_ORDERS ? 'disabled' : ''}>+ Ware laden</button>
      <label class="chk"><input type="checkbox" data-rf="wait" ${st.wait ? 'checked' : ''}> Warten bis beladen <span class="xs muted">(höchstens ${SHIP_WAIT_MAX} s)</span></label>
    </div>`;
  }
  return h + '</div>';
}
function routeHTML(s) {
  const f = fs(s.id), r = s.route, m = ui.mode;
  if (m && m.kind === 'route' && m.ship === s.id) {
    return `<div class="routebox picking"><div class="lbl">Route anlegen</div>
      <div class="xs" style="margin-bottom:6px">Kontore in der Karte der Reihe nach anklicken – der erste ist der Start. Oder hier auswählen:</div>
      <div class="kpick">${portPick('pickStop')}</div>
      <div class="xs" style="margin:6px 0">Stopps: ${m.stops.length ? m.stops.map((k, i) => `<b>${i + 1}</b> ${esc(portLabel(k))}`).join(' &rarr; ') : '<span class="muted">noch keine</span>'}</div>
      <div class="btns"><button class="btn btn-sm btn-green" data-ract="finish" ${m.stops.length >= 2 ? '' : 'disabled'}>${img(SPR.icon.check, 1)} Fertig</button><button class="btn btn-sm btn-paper" data-ract="cancelNew">Abbrechen</button></div></div>`;
  }
  const head = `<button class="lnk" data-ract="routeToggle">${f.route ? '&#9662;' : '&#9656;'} Route ${r ? `(${r.stops.length} Stopp${r.stops.length === 1 ? '' : 's'})` : '(keine)'}</button>`;
  if (!f.route) return `<div class="routebox">${head}</div>`;
  let h = `<div class="routebox">${head}`;
  if (r) h += `<div class="stops">${r.stops.map((_, i) => stopHTML(s, i)).join('')}</div>`;
  if (r && f.add) h += `<div class="kpick" style="margin-top:6px">${portPick('addStop')}</div>`;
  h += `<div class="btns">${r ? `<button class="btn btn-paper btn-sm" data-ract="addToggle" ${r.stops.length >= MAX_STOPS ? 'disabled' : ''}>${f.add ? 'Liste schließen' : '+ Stopp hinzufügen'}</button>` : ''}
    <button class="btn btn-paper btn-sm" data-sact="routeNew" data-ship="${s.id}">Route anlegen</button>
    ${r ? `<button class="btn btn-red btn-sm" data-ract="delRoute" style="grid-column:1/-1">Route löschen</button>` : ''}</div></div>`;
  return h;
}
function cardHTML(s) {
  const flash = ui.flash && ui.flash.id === s.id && performance.now() < ui.flash.until;
  return `<div class="card shipcard${ui.selShip === s.id ? ' sel' : ''}${flash ? ' flash' : ''}" data-card="${s.id}">
    <div class="row">${img(shipSpr(s), 2)}<div class="grow" style="min-width:0">
      <input class="inp shipname" data-rf="name" maxlength="24" value="${esc(s.name)}" title="Umbenennen" spellcheck="false" autocomplete="off">
      <div class="xs muted">${s.bell ? `${img(SPR.icon.bellS, 1)} ` : ''}${kindName(s)}${s.bell ? ' mit Taucherglocke' : ''} &middot; ${shipStatus(s)}</div></div>
      <button class="btn btn-paper btn-sm" data-sact="locate" data-ship="${s.id}">Zeigen</button></div>
    ${portHTML(s) || holdsHTML(s)}${shipDiveHTML(s)}
    <div class="col" style="gap:6px;margin-top:6px">${autoHTML(s)}${pickHTML(s)}${foundHTML(s)}${resumeHTML(s)}</div>
    ${routeHTML(s)}</div>`;
}
// Getrennte Inseln: Anfragen und erlaubte Routen von Mitspielern an eigene Hauptkontore
const ordTxt = (os) => os.map(o => [o.unload.length ? `entlädt ${o.unload.map(x => x.it === '*' ? 'alles' : ITEMS[x.it].name).join(', ')}` : '', o.load.length ? `lädt ${o.load.map(x => ITEMS[x.it].name).join(', ')}` : ''].filter(Boolean).join(', ') || 'keine Aufträge').join(' / ');
function permRow(q, ask) {
  return `<div class="card permcard"><div class="xs"><b>${esc(playerName(game, q.owner))}</b> &middot; ${esc(q.name)}</div>
    <div class="xs muted">Route: ${q.stops.map(esc).join(' &rarr; ')}</div>
    <div class="xs muted">Bei dir: ${esc(ordTxt(q.orders))}</div>
    <div class="btns">${ask ? `<button class="btn btn-green btn-xs" data-pact="1" data-ship="${q.ship}" data-kontor="${q.kontor}">Erlauben</button><button class="btn btn-red btn-xs" data-pact="0" data-ship="${q.ship}" data-kontor="${q.kontor}">Ablehnen</button>`
      : `<button class="btn btn-red btn-xs" data-pact="0" data-ship="${q.ship}" data-kontor="${q.kontor}">Widerrufen</button>`}</div></div>`;
}
function permsHTML() {
  const P = game.perms || { ask: [], ok: [] };
  let h = '';
  if (P.ask.length) h += `<div class="lbl">Anfragen (${P.ask.length})</div>${P.ask.map(q => permRow(q, true)).join('')}`;
  if (P.ok.length) h += `<div class="lbl" style="margin-top:6px">Erlaubte Routen</div>${P.ok.map(q => permRow(q, false)).join('')}`;
  return h ? `<div class="perms">${h}</div>` : '';
}
function fleetRender(body) {
  const state = game.state, sep = isSep(game);
  const ships = sep ? state.ships.filter(s => mine(game, s)) : state.ships;
  if (sep) {
    let top = body.querySelector(':scope > .ptop');
    if (!top) { body.innerHTML = ''; body._html = null; top = document.createElement('div'); top.className = 'ptop'; body.appendChild(top); const l = document.createElement('div'); l.className = 'plist'; body.appendChild(l); }
    const h = permsHTML();
    if (top._h !== h) { top.innerHTML = h; top._h = h; }
    body = body.querySelector(':scope > .plist');
  }
  if (!ships.length) {
    setHTML(body, `<div class="hint">Noch keine Schiffe. Baue eine Werft am Meer und gib dort ein Schiff in Auftrag.<br><br>${SHIP_KINDS.fracht.name}e haben ${SHIP_KINDS.fracht.holds + mods(game).holds} Laderäume zu je ${SHIP_KINDS.fracht.holdCap + mods(game).holdCap} Items einer Ware. ${SHIP_KINDS.entdecker.name} (Forschung Kartografie) sind schnell, sehen weit und erkunden auf Wunsch selbst. Anklicken wählt ein Schiff aus, ein Rechtsklick auf die Karte schickt es dorthin. Mit 40 Holz an Bord gründet es auf einer neuen Insel ein Kontor.</div>`);
    return;
  }
  if (body._html) { body.innerHTML = ''; body._html = null; }
  patchList(body, ships.map(s => ({ k: String(s.id), html: cardHTML(s) })));
}

/* ---------- Route bearbeiten ---------- */
const clone = (st) => st.map(x => ({ kontor: x.kontor, load: x.load.map(o => Object.assign({}, o)), unload: x.unload.map(o => Object.assign({}, o)), wait: x.wait }));
function commit(s, stops, check) {
  if (check) { const p = stopsProblem(stops.map(x => x.kontor)); if (p) { toast(p); return false; } }
  send({ type: 'setRoute', ship: s.id, stops });
  saveGame(); afterSync(() => renderWindow(true));
  return true;
}
function routeAction(el, s) {
  const f = fs(s.id), act = el.dataset.ract, r = s.route;
  const row = el.closest('[data-i]'), i = row ? +row.dataset.i : -1, ord = el.closest('[data-o]');
  switch (act) {
    case 'routeToggle': f.route = !f.route; break;
    case 'addToggle': f.add = !f.add; break;
    case 'toggle': f.stop = f.stop === i ? -1 : i; f.pick = null; break;
    case 'pickStop': routeAdd(+el.dataset.kontor); return;
    case 'finish': routeFinish(); return;
    case 'cancelNew': hooks.setMode(null); break;
    case 'delRoute': f.stop = -1; f.pick = null; send({ type: 'setRoute', ship: s.id, stops: [] }); saveGame(); afterSync(() => renderWindow(true)); return;
    default: {
      if (!r) return;
      const st = clone(r.stops);
      if (act === 'addStop') {
        const k = +el.dataset.kontor;
        if (st.length && st[st.length - 1].kontor === k) { toast('Dasselbe Kontor darf nicht zweimal direkt hintereinander angefahren werden.'); return; }
        st.push({ kontor: k, load: [], unload: [{ it: '*', mode: 'all', n: 0 }], wait: false });
        if (commit(s, st, true)) { f.stop = st.length - 1; f.add = false; }
        return;
      }
      if (act === 'up' || act === 'down') { const j = act === 'up' ? i - 1 : i + 1; [st[i], st[j]] = [st[j], st[i]]; if (commit(s, st, true)) f.stop = f.stop === i ? j : f.stop === j ? i : f.stop; return; }
      if (act === 'rmStop') { st.splice(i, 1); if (commit(s, st, true)) { f.stop = -1; f.pick = null; } return; }
      if (act === 'addOrder') { const k = el.dataset.k; st[i][k].push({ it: k === 'unload' ? '*' : 'holz', mode: 'all', n: 0 }); f.pick = { stop: i, kind: k, o: st[i][k].length - 1 }; commit(s, st); return; }
      if (!ord) return;
      const k = ord.dataset.k, j = +ord.dataset.o;
      if (act === 'pick') { f.pick = f.pick && f.pick.stop === i && f.pick.kind === k && f.pick.o === j ? null : { stop: i, kind: k, o: j }; break; }
      if (act === 'setItem') { st[i][k][j].it = el.dataset.it; f.pick = null; commit(s, st); return; }
      if (act === 'rmOrder') { st[i][k].splice(j, 1); f.pick = null; commit(s, st); return; }
      return;
    }
  }
  renderWindow(true);
}
function routeField(el, s) {
  const f = el.dataset.rf;
  if (f === 'name') { send({ type: 'renameShip', ship: s.id, name: el.value }); saveGame(); afterSync(() => hooks.renderAll()); return; }
  if (!s.route) return;
  const st = clone(s.route.stops), row = el.closest('[data-i]'), i = +row.dataset.i;
  if (f === 'wait') st[i].wait = el.checked;
  else {
    const ord = el.closest('[data-o]'), o = st[i][ord.dataset.k][+ord.dataset.o];
    if (f === 'mode') { o.mode = el.value; if (o.mode !== 'all' && !o.n) o.n = holdCapOf(game, s); }
    else if (f === 'n') o.n = Math.max(0, Math.floor(+el.value) || 0);
  }
  commit(s, st);
}

export function openFleetAt(id) {
  if (ui.win !== 'fleet') openWindow('fleet'); else renderWindow(true);
  const c = $('winBody').querySelector(`[data-card="${id}"]`);
  if (c) c.scrollIntoView({ block: 'nearest' });
}

registerWindow('fleet', {
  title: 'Flotte', icon: 'anchor', side: true,
  render: fleetRender,
  wire(body) {
    body.addEventListener('click', e => {
      if (ui.win !== 'fleet') return;
      ui.uiPressed = false;
      const pa = e.target.closest('[data-pact]');
      if (pa) { send({ type: 'perm', ship: +pa.dataset.ship, kontor: +pa.dataset.kontor, ok: pa.dataset.pact === '1' }); afterSync(() => renderWindow(true)); return; }
      if (npcClick(e)) return;
      const sa = e.target.closest('[data-sact]');
      if (sa) { if (!sa.disabled) shipAction(sa); return; }
      const ra = e.target.closest('[data-ract]'), card = e.target.closest('[data-card]');
      if (!ra || ra.disabled || !card) return;
      const s = shipById(+card.dataset.card);
      if (s) routeAction(ra, s);
    });
    body.addEventListener('change', e => {
      if (ui.win !== 'fleet') return;
      const el = e.target.closest('[data-rf]'), card = e.target.closest('[data-card]');
      if (!el || !card) return;
      const s = shipById(+card.dataset.card);
      if (!s) return;
      if (el.tagName === 'SELECT') el.blur();
      routeField(el, s);
    });
  }
});
hooks.openFleet = openFleetAt;
hooks.renderFleet = () => renderWindow(true);
