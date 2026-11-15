/* =========================================================
   OBERE LEISTE (Ruhm, Bewohner, Insel unter der Kamera, Uhr, Einstellungen) + ZIEL-KARTE rechts oben
   ========================================================= */
import { openPause } from './menu.js';
import { GOALS } from '../data/goals.js';
import { img, fitScale } from '../gfx/pixelbuffer.js';
import { SPR, flagSpr, bIcon } from '../gfx/sprites.js';
import { centerIsland, cam } from '../gfx/camera.js';
import { TS } from '../config.js';
import { esc, fmt, pad } from '../util/format.js';
import { dayInfo } from '../world/daytime.js';
import { totalPop, islName, kontorIslands, flagOf, isSep, playerName, islOwner, actor, isUnlocked } from '../sim/state.js';
import { WONDER } from '../data/wonder.js';
import { coinSrcName } from './common.js';
import { levelInfo } from '../sim/research.js';
import { game, ui, $ } from './context.js';
import { setHTML, mapText, foundName } from './common.js';
import { npcName } from '../data/npcs.js';
import { JETTISON_TIP, PICK_TIP, AUTO_TIP } from './ships.js';
import { fuelTitle } from './insights.js';
import { registerTip } from './tooltip.js';
import { layout } from './layout.js';
import { toast } from './toasts.js';
import { EVENTS, EVENT_MODES } from '../data/events.js';
import { coinSums } from '../sim/coins.js';
import { send, saveGame } from './context.js';
import { storyLine } from './story.js';

export function renderTopbar() {
  const state = game.state, li = levelInfo(state.xpTotal);
  $('xpBar').style.width = `${(li.cur / li.need) * 100}%`;
  $('levelText').textContent = `Ruhm ${li.level}`;
  setHTML($('popText'), `${img(SPR.icon.people, 2)}${totalPop(game)}/${allPop()}`);
  if (li.level > ui.lastLevel) { if (ui.lastLevel > 0) toast(`${img(SPR.icon.star, 2)}<span><b>Ruhm-Stufe ${li.level} erreicht!</b></span>`, 'gold'); ui.lastLevel = li.level; }
  const d = dayInfo(state.time);
  setHTML($('clockIcon'), img(d.isDay ? SPR.sun : SPR.moon, 2));
  $('clockText').textContent = `Tag ${d.day} · ${d.clock}`;
  $('clockSub').textContent = `${d.isDay ? 'Nacht' : 'Morgen'} in ${Math.floor(d.left / 60)}:${pad(Math.floor(d.left % 60))}`;
  renderIslandName();
  renderCoins(); renderEvents(); renderLighthouses();
}
/* ---------- Münzen und Ereignisse ---------- */
const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${pad(Math.floor(Math.max(0, s) % 60))}`;
function renderCoins() { setHTML($('coinText'), `${img(SPR.icon.coin, 2)}${fmt(game.state.coins | 0)}`); }
function coinTip() {
  const st = game.state, S = coinSums(st.coinLog, st.time, 900);
  const rows = (o, sign) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="stat"><span>${esc(coinSrcName(k))}</span><b class="${sign > 0 ? 'pos' : 'neg'}">${sign > 0 ? '+' : '&minus;'}${fmt(v)}</b></div>`).join('');
  return `<div class="tt-h"><span>Münzen</span><span class="xs muted">${fmt(st.coins | 0)}</span></div>
    <div class="xs">Verdient mit Handel, Wrackfunden ab Ring 2 und Zielen. Ausgegeben für Käufe, Forschung und den Weltenleuchtturm.</div>
    <div class="lbl" style="margin-top:4px">Letzte 15 Minuten</div>${rows(S.in, 1) || ''}${rows(S.out, -1) || ''}${S.inSum || S.outSum ? `<div class="stat"><span>Saldo</span><b>${S.inSum - S.outSum >= 0 ? '+' : '&minus;'}${fmt(Math.abs(S.inSum - S.outSum))}</b></div>` : '<div class="xs muted">keine Buchungen</div>'}
    <div class="xs muted">Verlauf im Fenster „Statistik“, Reiter „Münzen“.</div>`;
}
// Getrennte Inseln: „Leuchttürme“ – Phase je Spieler in seiner Farbe (sichtbar, sobald jemand Phase 1 hat oder du ihn erforscht hast)
const lhList = () => {
  const L = game.lh || {}, P = game.state.players || {};
  return Object.keys(L).map(pid => ({ pid, ph: L[pid].ph, done: L[pid].done, color: (P[pid] && P[pid].color) || '#fff' })).sort((a, b) => b.ph - a.ph);
};
function renderLighthouses() {
  const el = $('lhText'), L = lhList();
  const on = isSep(game) && L.length > 1 && (isUnlocked(game, 'leuchtturm') || L.some(x => x.ph > 0));
  el.classList.toggle('hidden', !on);
  if (on) setHTML(el, `${img(bIcon('leuchtturm'), fitScale(bIcon('leuchtturm'), 20))}${L.map(x => `<span class="lhp" style="--c:${esc(x.color)}">${x.ph}</span>`).join('')}`);
}
function lhTip() {
  const n = WONDER.phases.length, F = game.state.wfirst;
  return `<div class="tt-h"><span>Leuchttürme</span><span class="xs muted">${n} Phasen</span></div>`
    + lhList().map(x => `<div class="stat"><span><b style="color:${esc(x.color)};text-shadow:0 0 1px #2a1a10">${esc(playerName(game, x.pid))}</b>${x.pid === F ? ' &middot; Erster Leuchtturm' : ''}</span><b>${x.ph} / ${n}</b></div>`).join('')
    + `<div class="xs muted">Wer als Erster Phase ${n} vollendet, bekommt das Abzeichen „Erster Leuchtturm“ und +${fmt(WONDER.firstFame)} Ruhm.</div>`;
}
const evPlace = (e) => e.name || (e.isl != null ? islName(game, e.isl) : null);
export function renderEvents() {
  const E = game.state.ev, L = (E && E.list) || [], now = game.state.time;
  const warn = L.filter(e => !e.on).sort((a, b) => a.at - b.at)[0];
  $('evNext').classList.toggle('hidden', !warn);
  if (warn) setHTML($('evNext'), `${img(SPR.ev[warn.kind], 2)}${mmss(warn.at - now)}`);
  const on = L.filter(e => e.on), bar = $('evBar'), was = !bar.classList.contains('hidden');
  bar.classList.toggle('hidden', !on.length);
  if (on.length) setHTML(bar, on.map(e => { const D = EVENTS[e.kind], p = evPlace(e); return `<div class="evrow">${img(SPR.ev[e.kind], 2)}<div class="grow"><div class="row"><span class="evname grow">${D.name}</span><span class="evt">${mmss(e.end - now)}</span></div>
    <div class="xs">${p ? `${esc(p)} &middot; ` : ''}${D.eff}${e.soft && D.dmg ? ' (sanft: ohne Schäden)' : ''}${e.dmg ? ` &middot; <b class="bad">${e.dmg} Gebäude beschädigt</b>` : ''}</div>
    <div class="bar"><div style="width:${Math.round((e.end - now) / D.dur * 100)}%;transition:none"></div></div></div></div>`; }).join(''));
  if (was !== !!on.length) layout();
  // Einstellung im Pausenmenü
  const m = game.state.evMode || 'normal';
  setHTML($('evModeSeg'), Object.keys(EVENT_MODES).map(k => `<button class="segb${k === m ? ' on' : ''}" data-evm="${k}">${k}</button>`).join(''));
}
function evTip() {
  const E = game.state.ev, w = E && E.list.filter(e => !e.on).sort((a, b) => a.at - b.at)[0];
  if (!w) return '';
  const D = EVENTS[w.kind], p = evPlace(w);
  return `<div class="tt-h"><span>${D.name}</span><span class="xs muted">in ${mmss(w.at - game.state.time)}</span></div><div class="xs">${p ? `${esc(p)}: ` : ''}${D.eff}. Dauer ${D.dur / 60} min. Ort auf der Karte (Minimap) markiert.</div>`;
}
// Alle Bewohner (auch unversorgte), auf allen Inseln
function allPop() { let n = 0; for (const k in game.RT.popAll) n += game.RT.popAll[k]; return n; }
// Inselname der Insel unter der Kamera mit ihrer Flaggenfarbe (im Nebel: „Unerkundet“)
export function renderIslandName() {
  const k = ui.camIsl, isl = k >= 0;
  setHTML($('islFlag'), isl ? img(flagSpr(flagOf(game, k)), 2) : img(SPR.icon.anchor, 2));
  $('islName').textContent = isl ? islName(game, k) : ui.camFog ? 'Unerkundet' : 'Offenes Meer';
  $('islBtn').style.setProperty('--flag', isl ? flagOf(game, k) : '#3474b8');
  $('islBtn').classList.toggle('sea', !isl);
}

/* ---------- Kleines Menü: Inselliste (das Zahnrad öffnet das Pausenmenü, ui/menu.js) ---------- */
const MENUS = ['islMenu'];
export const menusOpen = () => MENUS.some(id => !$(id).classList.contains('hidden'));
export function closeMenus() { MENUS.forEach(id => $(id).classList.add('hidden')); $('islBtn').classList.remove('on'); }
function toggleMenu(id, btn) {
  const open = $(id).classList.contains('hidden');
  closeMenus();
  if (!open) return;
  if (id === 'islMenu') renderIslandMenu();
  $(id).classList.remove('hidden'); $(btn).classList.add('on');
}
// Inseln mit Kontor, darunter die entdeckten Inseln ohne Kontor (die 12 nächsten zur Kamera) mit kartiert/Anteil der Küste
const MENU_FOUND = 12;
function renderIslandMenu() {
  const W = game.W, mapped = game.state.mapped, cx = cam.x / TS, cy = cam.y / TS;
  const sep = isSep(game), all = kontorIslands(game), kont = sep ? kontorIslands(game, actor(game)) : all, ks = new Set(all);
  const partner = sep ? all.filter(k => !kont.includes(k)) : [], P = game.state.players || {};
  const other = Object.keys(game.state.found).map(Number).filter(k => !ks.has(k)).map(k => ({ k, I: W.island(k) })).filter(o => o.I)
    .sort((a, b) => Math.hypot(a.I.x - cx, a.I.y - cy) - Math.hypot(b.I.x - cx, b.I.y - cy)).slice(0, MENU_FOUND);
  const row = (k, icon, name, sub) => `<button class="mitem${k === ui.camIsl ? ' on' : ''}" data-isl="${k}"><span class="row">${icon}${name}</span><span class="xs muted">${sub}</span></button>`;
  $('islMenu').innerHTML = kont.map(k => row(k, img(flagSpr(flagOf(game, k)), 2), esc(islName(game, k)), mapped[k] ? 'kartiert' : mapText(k))).join('')
    + (partner.length ? `<div class="lbl" style="margin:6px 8px 2px">Mitspieler</div>` + partner.map(k => { const o = islOwner(game, k), c = (P[o] && P[o].color) || '#fff';
      return row(k, img(flagSpr(flagOf(game, k)), 2), `<b style="color:${esc(c)};text-shadow:0 0 1px #2a1a10">${esc(islName(game, k))}</b>`, esc(playerName(game, o))); }).join('') : '')
    + (other.length ? `<div class="lbl" style="margin:6px 8px 2px">Entdeckt, ohne Kontor</div>` + other.map(o => { const npc = W.npcOf(o.k); return row(o.k, npc ? img(SPR.npc.mark[npc], 1) : img(SPR.icon.anchor, 1), esc(foundName(o.k)), npc ? `${esc(npcName(npc))} &middot; ${o.I.x} / ${o.I.y}` : `${mapText(o.k)} &middot; ${o.I.x} / ${o.I.y}`); }).join('') : '');
}

/* ---------- Ziel-Karte ---------- */
export function goalHTML() {
  const i = game.state.goal, g = Number.isFinite(i) ? GOALS[i] : GOALS.find(x => !x.done(game));
  return g ? `<div class="goal">${g.txt}</div>` : `<div class="goal"><b>Alle Ziele erreicht!</b> Baue dein Inselreich weiter aus.</div>`;
}
// Geschichte (seit Version 16): Akt und nächstes Story-Ziel in einem Satz über dem Aufbau-Ziel
function storyHTML(L) {
  return `<div class="lbl">Geschichte</div><div class="goal story">${esc(L.goal)}</div><div class="lbl">Aufbau</div>`;
}
export function renderGoal() {
  const col = game.state.ui.goalCollapsed, L = storyLine();
  setHTML($('goalCard'), `<div class="phead click" data-act="goal"><span class="row">${img(L ? SPR.icon.book : SPR.icon.star, 2)}${L ? `Akt ${L.act}: ${esc(L.name)}` : 'Nächstes Ziel'}</span><span class="tog">${col ? '&#9656;' : '&#9662;'}</span></div>
    ${col ? '' : `<div class="pbody scroll">${L ? storyHTML(L) : ''}${goalHTML()}<div class="xs muted" style="line-height:1.5">Klicke ein Gebäude an, um Fortschritt, Bestand und Rezept zu sehen. Links-Ziehen bewegt die Karte, im Baumodus Rechts-Ziehen. Ein Klick auf eine Ware im Inselinventar zeigt ihre Statistik.</div></div>`}`);
}

export function wireHud() {
  $('xpIcon').innerHTML = img(SPR.icon.star, 2);
  $('gearBtn').innerHTML = img(SPR.icon.gear, 2);
  registerTip('jettison', () => JETTISON_TIP);
  registerTip('pick', () => PICK_TIP);
  registerTip('auto', () => AUTO_TIP);
  registerTip('fuel', (it) => `<div class="xs">${fuelTitle(it)}</div>`);
  registerTip('pop', () => `<div class="tt-h"><span>Bewohner</span></div><div class="xs">Versorgte / alle Bewohner auf allen Inseln. Versorgte Häuser liefern Pläne für die Forschung.</div>`);
  registerTip('fame', () => { const li = levelInfo(game.state.xpTotal); return `<div class="tt-h"><span>Ruhm</span><span class="xs muted">Stufe ${li.level}</span></div><div class="xs">${fmt(li.cur)} / ${fmt(li.need)} bis zur nächsten Stufe. Ruhm gibt es für jede abgeschlossene Forschung (Stufe &times; 50) und jedes erreichte Ziel (+30).</div>`; });
  registerTip('isl', () => `<div class="tt-h"><span>Inseln</span></div><div class="xs">Insel in der Kartenmitte. Klick: zu einer Insel springen.</div>`);
  registerTip('gear', () => `<div class="tt-h"><span>Menü</span><kbd>Esc</kbd></div><div class="xs">Pausenmenü: Speichern, Spiel laden, Tastenkürzel, Ereignisse, Testmodus, Hauptmenü</div>`);
  registerTip('coins', coinTip);
  registerTip('evnext', evTip);
  registerTip('lh', lhTip);
  $('evModeSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-evm]');
    if (!b) return;
    send({ type: 'evMode', mode: b.dataset.evm }); game.state.evMode = b.dataset.evm; renderEvents(); saveGame();
    toast(`${EVENT_MODES[b.dataset.evm]}${b.dataset.evm === 'sanft' ? ': halb so oft, ohne Schäden' : b.dataset.evm === 'aus' ? ': angekündigte Ereignisse fallen aus' : ''}.`);
  });
  $('islBtn').addEventListener('click', () => toggleMenu('islMenu', 'islBtn'));
  $('gearBtn').addEventListener('click', () => { closeMenus(); openPause(); });
  $('islMenu').addEventListener('click', e => { const b = e.target.closest('[data-isl]'); if (b) { centerIsland(game, +b.dataset.isl); closeMenus(); } });
  // Klick außerhalb schließt die Menüs
  document.addEventListener('pointerdown', e => { if (!e.target.closest('.menu, #islBtn')) closeMenus(); });
  $('goalCard').addEventListener('click', e => {
    if (!e.target.closest('[data-act="goal"]')) return;
    game.state.ui.goalCollapsed = !game.state.ui.goalCollapsed; renderGoal(); layout();
  });
}
