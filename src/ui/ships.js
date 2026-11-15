/* =========================================================
   SCHIFFE IN DER OBERFLÄCHE: Auswahl, Status, Laderäume, Kontor gründen, Route anlegen
   Gemeinsam genutzt vom Flotten-Fenster (ui/fleet.js), vom Info-Panel (ui/insights.js) und von der Eingabe.
   Knöpfe tragen data-sact="<Aktion>" und data-ship="<ID>"; shipAction() führt sie aus.
   Modi (ui.mode):
     { kind: 'found', ship, isl, spots, tiles, keys, sel, hover, bad, flag, d }  Kontor gründen (Vorschau 3×3 mit Steg, R wechselt die Steg-Seite)
     { kind: 'move', id, …gleiche Felder }                                       Hauptkontor verlegen (alle gültigen Plätze der Insel)
     { kind: 'route', ship, stops: [Kontor-ID …] }                               Route anlegen (Hauptkontore und Handelskontore anklicken)
   ========================================================= */
import { diveAction } from './dive.js';
import { TS, SHIP_WAIT_MAX, FOUND_COST, JETTISON_TTL } from '../config.js';
import { holdCapOf } from '../sim/mods.js';
import { SHIP_KINDS, shipKind, EXPLORE, EXPLORE_RANGE_NAME } from '../data/ships.js';
import { ITEMS, ITEM_ORDER } from '../data/items.js';
import { tk, tkx, tky } from '../util/tiles.js';
import { esc, fmt } from '../util/format.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR, shipSprite, flagSpr, kontorSpr } from '../gfx/sprites.js';
import { cam, clampCam, followShip } from '../gfx/camera.js';
import { flagOf, islName, isSep, mine, ownerOf, playerName } from '../sim/state.js';
import { plViewHTML } from './market.js';
import { portOf, foundInfo, orderDone, holdRoom, kontorSpotReason } from '../sim/ships.js';
import { stockRead, storeCap, portById, kontorLabel, kontorKind, kontorSpots, stegLine } from '../sim/kontor.js';
import { game, ui, $, send, afterSync, saveGame } from './context.js';
import { islLabel } from './common.js';
import { toast } from './toasts.js';
import { NPC_TRADE } from '../data/npctrade.js';
import { npcOf, npcKnown, lvlOf, lvlOk, npcAsks, npcStock, sellOpen, goneWhy } from '../sim/npc.js';
import { npcGone } from '../sim/ending.js';

export const shipById = (id) => (id >= 0 && game.state.ships.find(s => s.id === id)) || null;
export const selShip = () => shipById(ui.selShip);
// Sprite und Art eines Schiffs (Frachtschiff, Entdecker)
export const shipSpr = (s) => shipSprite(s && s.kind);
export const kindName = (s) => shipKind(s).name;
// „Möwenklippe · Hauptkontor“ / „Möwenklippe · Handelskontor 2“ für eine Kontor-ID (Routen-Stopps)
export function portLabel(id) {
  const P = portById(game, id);
  if (!P) return 'Kontor fehlt';
  // Getrennte Inseln: fremde Kontore heißen „<Name> · Hauptkontor“
  return mine(game, P) ? kontorLabel(game, P, islLabel(P.isl)) : `${playerName(game, ownerOf(P))} · ${kontorKind(game, P)}`;
}
export const portFlag = (id) => { const P = portById(game, id); return flagOf(game, P ? P.isl : -1); };

export function shipStatus(s) {
  if (!mine(game, s)) return s.st === 'sail' ? 'Unterwegs' : portOf(game, s) ? 'Liegt an' : 'Liegt vor Anker';
  const st = shipStatus0(s);
  return s.wp ? `${st} &middot; <span class="bad">Wartet auf Erlaubnis von ${esc(playerName(game, s.wp))}</span>` : st;
}
function shipStatus0(s) {
  if (s.wi && s.wp) return 'Route angehalten';
  if (s.auto) return s._an ? (s.st === 'sail' ? 'Umgebung erkundet – fährt heim' : 'Umgebung erkundet – wartet') : s.st === 'sail' ? 'Erkundet selbst' : 'Erkundet selbst – sucht ein neues Ziel';
  if (s.st === 'sail' && s.dest === 'man') return (s.mt != null ? `Fährt zum Ziel (${tkx(s.mt)} / ${tky(s.mt)})` : 'Fährt zum Ziel') + (s.route ? ' &middot; Route pausiert' : '');
  const r = s.route;
  if (s.np) return 'Kein Seeweg gefunden';
  if (r && r.paused) return 'Route pausiert – manuell gesteuert';
  if (!r) return 'Wartet – keine Route';
  if (r.stops.length < 2) return 'Wartet – Route braucht mindestens 2 Stopps';
  const stop = r.stops[r.idx], nm = esc(portLabel(stop.kontor));
  if (s.st === 'sail') return `Fährt zu Stopp ${r.idx + 1}: ${nm}`;
  if (s.st === 'dock') return `Lädt in ${nm}`;
  if (s.st === 'wait') {
    const miss = stop.load.filter(o => !orderDone(game, s, o)).map(o => ITEMS[o.it].name);
    return `Wartet auf Ladung (${miss.length ? miss.join(', ') + ', ' : ''}noch ${Math.max(0, Math.ceil(SHIP_WAIT_MAX - (s.wt || 0)))} s)`;
  }
  return 'Wartet';
}

// Laderäume; unload = Kontor, an dem entladen werden kann (sonst null). Je belegtem Raum „Über Bord“.
export function holdsHTML(s, unload = null) {
  const cap = holdCapOf(game, s);
  return `<div class="holds">${s.cargo.map((h, i) => {
    const btn = (unload && h ? `<button class="btn btn-paper btn-xs" data-sact="unload" data-ship="${s.id}" data-hold="${i}">Entladen</button>` : '')
      + (h ? `<button class="btn btn-paper btn-xs" data-sact="jettison" data-ship="${s.id}" data-hold="${i}" data-tip="jettison">Über Bord</button>` : '');
    return `<div class="hold${h ? '' : ' empty'}">${h ? `${img(SPR.item[h.it], 2)}<span class="hn"><span><b>${h.n}</b> / ${cap}</span><span class="xs muted">${ITEMS[h.it].name}</span></span>` : `<span class="xs muted">Laderaum ${i + 1} leer</span>`}${btn}</div>`;
  }).join('')}</div>`;
}
// Schalter „Funde einsammeln“
export function pickHTML(s) {
  return `<label class="chk" data-tip="pick"><input type="checkbox" data-sact="pick" data-ship="${s.id}" ${s.pick !== false ? 'checked' : ''}> Funde einsammeln</label>`;
}
export const JETTISON_TIP = `<div class="tt-h"><span>Über Bord werfen</span></div><div class="xs">Die Ladung treibt als Kisten direkt neben dem Schiff und kann wieder eingesammelt werden. Nach ${JETTISON_TTL / 60} Minuten ist sie weg.</div>`;
export const PICK_TIP = '<div class="tt-h"><span>Funde einsammeln</span></div><div class="xs">Aus: Das Schiff fährt an Treibgut und Wracks vorbei. Mit Rechtsklick direkt auf einen Fund gesteuert, sammelt es ihn trotzdem ein.</div>';

// „Kontor gründen“: nur in Reichweite einer Insel ohne Kontor; ausgegraut mit Grund
export function foundHTML(s) {
  if (!mine(game, s)) return '';
  const fi = foundInfo(game, s, false);
  if (!fi) return '';
  return `<button class="btn btn-green btn-sm btn-block" data-sact="found" data-ship="${s.id}" ${fi.reason ? 'disabled' : ''}>${img(SPR.icon.chest, 1)} Kontor gründen <span class="xs">(${FOUND_COST.holz} Holz)</span></button>`
    + (fi.reason ? `<div class="xs muted" style="margin-top:3px">${fi.reason}.</div>` : '');
}
// Schalter „Selbst erkunden“ (nur Entdecker)
export function autoHTML(s) {
  if (s.kind !== 'entdecker') return '';
  const xr = EXPLORE.ranges[s.xr] ? s.xr : EXPLORE.def;
  return `<label class="chk" data-tip="auto"><input type="checkbox" data-sact="auto" data-ship="${s.id}" ${s.auto ? 'checked' : ''}> Selbst erkunden</label>`
    + `<div class="row" style="gap:6px"><span class="xs muted">Reichweite</span><div class="seg seg3 grow">${Object.keys(EXPLORE.ranges).map(k => `<button class="segb${k === xr ? ' on' : ''}" style="padding:2px 4px;font-size:12.5px" data-sact="range" data-v="${k}" data-ship="${s.id}" title="höchstens ${fmt(EXPLORE.ranges[k])} Felder um die Heimatinsel">${EXPLORE_RANGE_NAME[k]}</button>`).join('')}</div></div>`;
}
export const AUTO_TIP = '<div class="tt-h"><span>Selbst erkunden</span></div><div class="xs">Der Entdecker fährt von selbst zum nächsten erreichbaren Rand des Nebels, nah an der Heimatinsel zuerst, und sammelt unterwegs Funde ein. Er bleibt innerhalb der Reichweite (Nah 600, Mittel 1.000, Weit 1.500 Felder um die Heimatinsel). Ist dort alles erkundet, kehrt er zum Hauptkontor zurück. Manuelles Steuern oder eine Route schalten es ab.</div>';
export function resumeHTML(s) {
  return s.route && s.route.paused ? `<button class="btn btn-sm btn-block" data-sact="resume" data-ship="${s.id}">Route fortsetzen</button>` : '';
}

// Laden/Entladen am Kontor (höchstens 2 Felder vom Anleger, Schiff steht)
export function portHTML(s) {
  const P = portOf(game, s);
  if (!P || s.st === 'sail' || !mine(game, s)) return '';
  if (P.t === 'npchafen') return npcPortHTML(s, P);
  if (!mine(game, P)) return partnerPortHTML(s, P);
  const inv = stockRead(game, P), cap = storeCap(game, P);
  const rows = ITEM_ORDER.filter(it => Math.floor(inv[it] || 0) > 0).map(it => {
    const room = holdRoom(game, s, it);
    return `<div class="lrow">${img(SPR.item[it], 2)}<span class="grow xs"><b>${Math.floor(inv[it])}</b> ${ITEMS[it].name}</span>`
      + [10, 40].map(n => `<button class="btn btn-paper btn-xs" data-sact="load" data-ship="${s.id}" data-it="${it}" data-n="${n}" ${room ? '' : 'disabled'}>+${n}</button>`).join('')
      + `<button class="btn btn-paper btn-xs" data-sact="load" data-ship="${s.id}" data-it="${it}" data-n="-1" ${room ? '' : 'disabled'}>Alles</button></div>`;
  }).join('');
  return `<div class="lbl" style="margin-top:8px">Laden/Entladen &middot; <span class="row" style="display:inline-flex">${img(flagSpr(flagOf(game, P.isl)), 1)}${esc(kontorLabel(game, P, islLabel(P.isl)))}</span></div>
    ${holdsHTML(s, P)}
    <div class="xs muted" style="margin:4px 0 2px">Bestand im Kontor (Platz je Ware: ${cap})</div>
    ${rows || '<div class="xs muted">Das Kontor ist leer.</div>'}`;
}

// Am Steg eines NPCs (seit Version 17): Gespräch, Laderäume (Entladen = verkaufen/liefern), Kaufen; alles Weitere im Fenster „Völker“ (N)
export function npcPortHTML(s, P) {
  const who = playerName(game, P.by), id = P.npc, known = npcKnown(game, id), N = npcOf(game, id);
  // Nach dem Ende (0.23.0): Ruinen-Steg ohne Leute; der Inselrat handelt, spricht aber nicht
  if (known && npcGone(game, id)) return `<div class="lbl" style="margin-top:8px">${esc(islName(game, P.isl))} &middot; Ruinen</div><div class="xs muted">${esc(goneWhy(game, id))}</div>` + holdsHTML(s);
  const head = `<div class="lbl" style="margin-top:8px">Am Steg von ${esc(who)} &middot; ${esc(islName(game, P.isl))}</div>`
    + (id === 'rat' ? '' : `<button class="btn btn-green btn-sm btn-block" data-sact="talk" data-ship="${s.id}" data-npc="${id}" ${known ? '' : 'disabled'}>Mit ${esc(who)} sprechen</button>`);
  if (!N || !known) return head + holdsHTML(s);
  const rows = NPC_TRADE[id].sells.filter(e => e.it && lvlOk(N, e.lvl) && sellOpen(game, e)).map(e => {
    const room = holdRoom(game, s, e.it), st = npcStock(game, id, e.it), ok = room && st;
    return `<div class="lrow">${img(SPR.item[e.it], 2)}<span class="grow xs">${ITEMS[e.it].name} &middot; ${img(SPR.icon.coin, 1)}${(Math.round(npcAsks(game, id, e.it) * 10) / 10).toLocaleString('de-DE')} <span class="muted">(${fmt(st)})</span></span>`
      + (e.part ? `<button class="btn btn-green btn-xs" data-sact="load" data-ship="${s.id}" data-it="${e.it}" data-n="1" ${ok ? '' : 'disabled'}>Kaufen</button>`
        : [10, 40].map(n => `<button class="btn btn-paper btn-xs" data-sact="load" data-ship="${s.id}" data-it="${e.it}" data-n="${n}" ${ok ? '' : 'disabled'}>+${n}</button>`).join('')) + '</div>';
  }).join('');
  return head + holdsHTML(s, P)
    + `<div class="xs muted" style="margin:4px 0 2px">Entladen liefert zuerst an Aufträge, der Rest wird verkauft (wenn ${esc(who)} die Ware kauft). Ruf: ${lvlOf(N).id.replace(/^./, c => c.toUpperCase())}.</div>`
    + (rows ? `<div class="lbl" style="margin-top:6px">Kaufen</div>${rows}` : '')
    + `<button class="btn btn-paper btn-sm btn-block" style="margin-top:6px" data-nv="open" data-npc="${id}">${img(SPR.icon.people, 1)} Handel mit ${esc(who)} (N)${N.orders.length ? ` &middot; ${N.orders.length} Auftr${N.orders.length === 1 ? 'ag' : 'äge'}` : ''}</button>`;
}
// Getrennte Inseln: am Kontor eines Mitspielers. Handelskontor = Preisliste (Laden kauft, Entladen verkauft), Hauptkontor = nur per erlaubter Route
function partnerPortHTML(s, P) {
  const head = `<div class="lbl" style="margin-top:8px">Am Kontor von ${esc(playerName(game, ownerOf(P)))} &middot; ${esc(kontorKind(game, P))}</div>`;
  if (P.t !== 'handelskontor') return head + holdsHTML(s) + '<div class="xs muted" style="margin-top:4px">Am Hauptkontor eines Mitspielers wird nur über eine erlaubte Route geladen und entladen.</div>';
  const pl = P.pl || { sell: [], buy: [] }, buy = new Set(pl.buy.map(o => o.it));
  const rows = pl.sell.map(o => {
    const room = holdRoom(game, s, o.it);
    return `<div class="lrow">${img(SPR.item[o.it], 2)}<span class="grow xs">${ITEMS[o.it].name}</span>`
      + [10, 40].map(n => `<button class="btn btn-paper btn-xs" data-sact="load" data-ship="${s.id}" data-it="${o.it}" data-n="${n}" ${room ? '' : 'disabled'}>+${n}</button>`).join('') + '</div>';
  }).join('');
  return head + plViewHTML(P) + (rows ? `<div class="lbl" style="margin-top:6px">Kaufen</div>${rows}` : '')
    + holdsHTML(s, buy.size ? P : null);
}

/* ---------- Auswahl ---------- */
export function locateShip(s) { cam.x = s.x * TS; cam.y = s.y * TS; clampCam(); followShip(s.id); }
// Schiff auswählen: Info-Panel und Flotten-Fenster mit hervorgehobenem Eintrag
export function selectShip(id, openFleet = true) {
  ui.selShip = id; ui.selected = -1; ui.selTile = -1;
  if (openFleet) {
    ui.flash = { id, until: performance.now() + 1600 };
    hooks.openFleet(id);
  }
  hooks.renderAll();
}
// werden von panels.js/fleet.js gesetzt (vermeidet Import-Zyklen beim Start)
export const hooks = { renderAll: () => {}, openFleet: () => {}, setMode: () => {}, renderFleet: () => {}, nameIsland: () => {} };

/* ---------- Kontor gründen / verlegen: Vorschau 3×3 mit Steg ---------- */
// Plätze [{ x, y, dirs: [{ d, sl, dock }] }] → markierte Felder und Schlüssel
function spotMode(base, spots, best) {
  const tiles = new Set(), keys = new Map();
  for (const p of spots) { keys.set(tk(p.x, p.y), p); for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) tiles.add(tk(p.x + dx, p.y + dy)); }
  const sel = best ? { x: best.x, y: best.y, d: best.dirs[0].d, sl: best.dirs[0].sl } : null;
  return Object.assign(base, { spots, tiles: [...tiles], keys, sel, hover: null, bad: null, d: sel ? sel.d : 0 });
}
export function startFound(s) {
  const fi = foundInfo(game, s, true);
  if (!fi) { toast('Hier liegt keine Insel ohne Kontor in der Nähe.'); return; }
  if (fi.reason) { toast(fi.reason + '.'); return; }
  hooks.setMode(spotMode({ kind: 'found', ship: s.id, isl: fi.isl, flag: flagOf(game, fi.isl) }, fi.spots, fi.best));
}
// Hauptkontor verlegen: alle gültigen Plätze der Insel (das Kontor selbst zählt als frei)
export function startMove(b) {
  const spots = kontorSpots(game, b.isl, 0, 0, null, { ignore: b.id });
  if (!spots.length) { toast('Auf dieser Insel gibt es keinen anderen Platz für das Hauptkontor (3×3, 1–2 Felder von der Küste, Steg zum Meer).'); return; }
  let best = spots[0], bd = 1e9;
  for (const p of spots) { const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; best = p; } }
  hooks.setMode(spotMode({ kind: 'move', id: b.id, isl: b.isl, flag: flagOf(game, b.isl) }, spots, best));
}
const spotDir = (p, want) => p.dirs.find(o => o.d === want) || p.dirs[0];
// Mausposition (Weltpixel): Platz, dessen Mitte der Maus am nächsten liegt, sonst rot markierter ungültiger Platz
export function foundHover(w) {
  const m = ui.mode;
  if (!m || (m.kind !== 'found' && m.kind !== 'move')) return;
  if (!w) { m.hover = null; m.bad = null; return; }
  const gx = Math.round(w.x / TS - 1.5), gy = Math.round(w.y / TS - 1.5);
  let best = m.keys.get(tk(gx, gy)) || null;
  if (!best) {
    const tx = Math.floor(w.x / TS), ty = Math.floor(w.y / TS);
    let bd = 1e9;
    for (const p of m.spots) {
      if (tx < p.x || tx > p.x + 2 || ty < p.y || ty > p.y + 2) continue;
      const d = Math.hypot(p.x + 1.5 - w.x / TS, p.y + 1.5 - w.y / TS);
      if (d < bd) { bd = d; best = p; }
    }
  }
  if (best) { const o = spotDir(best, m.d); m.hover = { x: best.x, y: best.y, d: o.d, sl: o.sl }; m.bad = null; return; }
  m.hover = null;
  m.bad = { x: gx, y: gy, reason: kontorSpotReason(game, m.isl, gx, gy, m.d, m.kind === 'move' ? { ignore: m.id } : null) || (m.kind === 'found' ? 'Zu weit vom Schiff entfernt.' : 'Hier geht es nicht.') };
}
// R: Steg-Seite des gewählten Platzes wechseln (nur Seiten, die dort gehen)
export function foundRotate() {
  const m = ui.mode;
  if (!m || (m.kind !== 'found' && m.kind !== 'move') || !m.sel) return;
  const p = m.keys.get(tk(m.sel.x, m.sel.y));
  if (!p) return;
  const i = p.dirs.findIndex(o => o.d === m.sel.d), o = p.dirs[(i + 1) % p.dirs.length];
  m.sel.d = o.d; m.sel.sl = o.sl; m.d = o.d;
  if (p.dirs.length < 2) toast('An diesem Platz führt der Steg nur in diese Richtung zum Meer.');
}
export function foundClick() {
  const m = ui.mode;
  if (m.hover) { m.sel = Object.assign({}, m.hover); return; }
  if (m.bad) toast(m.bad.reason);
}
export function foundConfirm() {
  const m = ui.mode;
  if (!m || (m.kind !== 'found' && m.kind !== 'move') || !m.sel) return;
  if (m.kind === 'found') send({ type: 'foundKontor', ship: m.ship, x: m.sel.x, y: m.sel.y, d: m.sel.d });
  else send({ type: 'moveKontor', id: m.id, x: m.sel.x, y: m.sel.y, d: m.sel.d });
  afterSync(() => { if (ui.mode === m) hooks.setMode(null); saveGame(); hooks.renderAll(); });
}
// Steg-Felder des gewählten Platzes (Vorschau)
export function selSteg(m) { return m && m.sel ? stegLine('kontor', m.sel.x, m.sel.y, m.sel.d, m.sel.sl) : null; }
// Haken und X über der Vorschau (Bildschirmkoordinaten, jedes Bild)
export function placeFoundButtons() {
  const el = $('foundBtns'), m = ui.mode;
  if (!m || (m.kind !== 'found' && m.kind !== 'move') || !m.sel) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
  const sp = kontorSpr(m.flag), wx = (m.sel.x + 1.5) * TS, wy = (m.sel.y + 3) * TS - sp.h - 4;
  const sx = (wx * cam.Z + cam.OX) / cam.DPR, sy = (wy * cam.Z + cam.OY) / cam.DPR;
  el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
  if (el.classList.contains('hidden')) {
    el.innerHTML = `<button class="ibtn ok" data-fb="ok" title="Bestätigen (Enter)">${img(SPR.icon.check, 2)}</button><button class="ibtn no" data-fb="no" title="Abbrechen (Esc)">${img(SPR.icon.cross, 2)}</button>`;
    el.classList.remove('hidden');
  }
}

/* ---------- Route anlegen ---------- */
// Prüft die Reihenfolge: dasselbe Kontor nicht zweimal direkt hintereinander (auch nicht letzter → erster)
export function stopsProblem(isls) {   // Kontor-IDs
  for (let i = 1; i < isls.length; i++) if (isls[i] === isls[i - 1]) return 'Dasselbe Kontor darf nicht zweimal direkt hintereinander angefahren werden.';
  if (isls.length > 2 && isls[0] === isls[isls.length - 1]) return 'Der letzte Stopp darf nicht dasselbe Kontor sein wie der erste (die Route beginnt danach von vorn).';
  return '';
}
export function startRouteMode(s) { hooks.setMode({ kind: 'route', ship: s.id, stops: [] }); hooks.renderFleet(); }
export function routeAdd(k) {
  const m = ui.mode;
  if (!m || m.kind !== 'route') return;
  if (!portById(game, k)) return;
  if (m.stops[m.stops.length - 1] === k) { toast('Dasselbe Kontor darf nicht zweimal direkt hintereinander angefahren werden.'); return; }
  m.stops.push(k);
  hooks.setMode(m); hooks.renderFleet();
}
export function routeFinish() {
  const m = ui.mode;
  if (!m || m.kind !== 'route') return;
  const st = m.stops.slice();
  if (st.length > 2 && st[0] === st[st.length - 1]) { st.pop(); toast('Der letzte Stopp war wieder der Start und wurde entfernt – die Route beginnt ohnehin von vorn.'); }
  if (st.length < 2) { toast('Eine Route braucht mindestens 2 Stopps.'); return; }
  send({ type: 'setRoute', ship: m.ship, reset: true, stops: st.map(kontor => ({ kontor, load: [], unload: [{ it: '*', mode: 'all', n: 0 }], wait: false })) });
  const f = ui.fleet[m.ship] || (ui.fleet[m.ship] = {});
  f.route = true; f.stop = 0; f.pick = null;
  hooks.setMode(null);
  saveGame();
  afterSync(() => { hooks.renderAll(); toast('Route angelegt. Lege im Routen-Editor fest, was an jedem Stopp geladen wird.'); });
}

/* ---------- Knöpfe (Flotten-Fenster und Info-Panel) ---------- */
export function shipAction(el) {
  const s = shipById(+el.dataset.ship);
  if (!s) return false;
  switch (el.dataset.sact) {
    case 'found': startFound(s); return true;
    case 'resume': send({ type: 'resumeRoute', ship: s.id }); break;
    case 'routeNew': startRouteMode(s); return true;
    case 'locate': locateShip(s); selectShip(s.id, false); return true;
    case 'select': selectShip(s.id); return true;
    case 'unload': send({ type: 'shipUnload', ship: s.id, hold: +el.dataset.hold }); break;
    case 'load': send({ type: 'shipLoad', ship: s.id, it: el.dataset.it, n: +el.dataset.n }); break;
    case 'talk': send({ type: 'talk', npc: el.dataset.npc }); return true;
    case 'jettison': send({ type: 'jettison', ship: s.id, hold: +el.dataset.hold }); break;
    case 'pick': send({ type: 'shipPick', ship: s.id, on: el.checked }); break;
    case 'auto': send({ type: 'shipAuto', ship: s.id, on: el.checked }); break;
    case 'range': send({ type: 'shipRange', ship: s.id, v: el.dataset.v }); break;
    default: if (!diveAction(el, s)) return false;   // Taucherglocke (ui/dive.js)
  }
  saveGame(); afterSync(() => hooks.renderAll());
  return true;
}
