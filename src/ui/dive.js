/* =========================================================
   TAUCHEN IN DER OBERFLÄCHE (seit 0.19.0; Simulation sim/dive.js, Zahlen data/dive.js)
   Schnittstelle für das Minispiel (nächster Thread):
     startDive(spot, info) → Promise<{ ok, found?, junk? }>   spot = { id, x, y, kind, find }, info = { ship, name, intro, act }
   Seit 0.20.0 hängt sich ui/divegame.js (Minispiel) ein; der Platzhalter bleibt als Rückfall.
   Bis dahin läuft der Platzhalter placeholderDive (kurze Meldung, nach DIVE_PLACEHOLDER.time Sekunden „gefunden“).
   Das Minispiel hängt sich mit setDiveGame(fn) ein; fn bekommt dieselben Argumente und liefert dasselbe Ergebnis.
   Die Beute würfelt immer der Host (sim/dive.js), das Minispiel entscheidet nur, ob etwas gefunden wurde.
   Ablauf: Knopf „Tauchgang starten“ → Kommando diveStart → Ereignis diveStart an alle → beim Taucher startDive →
   Kommando diveEnd { ok } → Ereignis diveResult an alle. Die anderen Spieler sehen nur Meldungen.
   Außerdem: Taucherglocke-Abschnitt im Info-Panel der Werft und des Schiffs, Meldungen.
   ========================================================= */
import { BELL, DIVE, DIVE_PLACEHOLDER, SPOT_KINDS } from '../data/dive.js';
import { ITEMS } from '../data/items.js';
import { RELICS } from '../data/relics.js';
import { img, fitScale } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { esc, fmt } from '../util/format.js';
import { game, send, saveGame } from './context.js';
import { tkx, tky } from '../util/tiles.js';
import { toast } from './toasts.js';
import { costText } from './common.js';
import { mine, isUnlocked } from '../sim/state.js';
import { mountWhy, atWerft, bellShip, diveSpot, diveBusy, diveWhy, overSpot, spotDist } from '../sim/dive.js';
import * as NET_S from '../net/session.js';

const bellIc = (n = 2) => img(SPR.icon.glocke, n);

/* ---------- Schnittstelle Minispiel ---------- */
// Platzhalter: Glocke sinkt, kurze Meldung, nach DIVE_PLACEHOLDER.time Sekunden zurück mit Fund
export function placeholderDive(spot, info) {
  toast(`${bellIc()}<span><b>${esc(info.name)}</b> lässt die Taucherglocke hinab &hellip;<br><span class="xs muted">(Das Tauch-Minispiel kommt mit dem nächsten Update.)</span></span>`, 'gold', true);
  return new Promise(resolve => setTimeout(() => resolve({ ok: true }), DIVE_PLACEHOLDER.time * 1000));
}
let diveGame = placeholderDive;
export function setDiveGame(fn) { diveGame = typeof fn === 'function' ? fn : placeholderDive; }
// Ergebnis an das Minispiel (Ergebnisfenster) statt als Meldung: hook(ev) → true = angezeigt
let resultHook = null;
export function setDiveResultHook(fn) { resultHook = typeof fn === 'function' ? fn : null; }
// Tauchgang am Spot spot ausführen (nur auf dem Rechner des Tauchers). Fehler im Minispiel zählen als „nichts gefunden“.
export async function startDive(spot, info) {
  try {
    const r = await diveGame(spot, info);
    return { ok: !!(r && r.ok), found: r && r.found ? String(r.found) : undefined, junk: r && Array.isArray(r.junk) ? r.junk : undefined };
  } catch (e) { console.error('Tauchgang', e); return { ok: false }; }
}
let running = null;   // Spot-ID des eigenen laufenden Tauchgangs
export const diving = () => running != null;

/* ---------- Ereignisse ---------- */
const myPid = () => NET_S.myPid();
const lootText = (l) => l.map(o => `${fmt(o.n)} ${ITEMS[o.it].name}`).join(', ');
export function onDiveEvent(ev) {
  switch (ev.type) {
    case 'bellMounted':
      toast(`${bellIc()}<span><b>Taucherglocke montiert</b> an <b>${esc(ev.name)}</b>. Halte Ausschau nach Blasen im Wasser: Dort liegt etwas.</span>`, 'gold', true);
      return;
    case 'diveSpot':
      toast(`${img(SPR.icon.bubbles, 2)}<span><b>${ev.kind === 'story' ? 'Große Blasen' : 'Blasen'} im Wasser!</b> Ein ${ev.kind === 'story' ? 'besonderer ' : ''}Tauchspot bei ${ev.x} / ${ev.y} (Minikarte).</span>`, 'gold', ev.kind === 'story');
      return;
    case 'diveStart':
      if (ev.pid === myPid()) {
        if (running === ev.spot.id) return;
        running = ev.spot.id;
        startDive(ev.spot, { ship: ev.ship, name: ev.name, intro: !!ev.intro, act: ev.act }).then(r => {
          running = null;
          send(Object.assign({ type: 'diveEnd', ship: ev.ship }, r));
          saveGame();
        });
      } else toast(`${bellIc()}<span><b>${esc(ev.who)}</b> taucht gerade mit ${esc(ev.name)}.</span>`);
      return;
    case 'diveResult': {
      const me = ev.pid === myPid();
      if (me && resultHook && resultHook(ev)) return;   // Minispiel zeigt das Ergebnisfenster
      if (ev.cancel) { if (me) toast(`${bellIc()}<span>Tauchgang abgebrochen. Der Tauchspot bleibt.</span>`); return; }
      if (!me) { toast(`${bellIc()}<span>Der Tauchgang ist vorbei${ev.got && ev.got.length ? `: ${lootText(ev.got.concat(ev.home || []))}` : ''}.</span>`); return; }
      if (!ev.ok) { toast(`${bellIc()}<span><b>${esc(ev.name)}</b>: Die Glocke kommt leer zurück.${ev.keep ? ' Der Tauchspot bleibt.' : ''}</span>`); return; }
      const parts = [];
      if (ev.got.length) parts.push(`an Bord: ${lootText(ev.got)}`);
      if (ev.home.length) parts.push(`ins Lager der Heimatinsel: ${lootText(ev.home)}`);
      if (ev.lost.length) parts.push(`<b>kein Platz</b> für ${lootText(ev.lost)}`);
      if (ev.relic && RELICS[ev.relic]) parts.push(`Relikt: ${img(SPR.relic[ev.relic], 1)} <b>${esc(RELICS[ev.relic].name)}</b> (Relikte, L)`);
      toast(`${bellIc()}<span><b>Tauchgang geschafft!</b> ${parts.join(' &middot; ') || 'Nichts Brauchbares.'}<br><span class="xs muted">Der Spot ist weg. Bald blubbert es woanders.</span></span>`, 'gold', true);
      return;
    }
    case 'diveDebug': toast(`Debug: ${esc(ev.msg)}`); return;
  }
}

/* ---------- Info-Panel ---------- */
// Werft: Taucherglocke montieren (sobald der Bauplan da ist), Liste der eigenen Schiffe am Anleger oder zum Hinholen
export function werftBellHTML(b) {
  if (!isUnlocked(game, 'glocke')) return '';
  const bs = bellShip(game);
  let h = `<div class="lbl" style="margin-top:10px">${bellIc(1)} Taucherglocke</div>`;
  if (bs) return h + `<div class="xs">Hängt an <b>${esc(bs.name)}</b>. Es gibt nur eine.</div>`;
  const why = mountWhy(game, b, null);
  h += `<div class="xs" style="margin-bottom:4px">Teile: ${costText(BELL.cost, b.isl)}</div>`;
  if (why) return h + `<div class="xs bad">${esc(why)}</div><div class="xs muted">Das Glockenseil verkauft Ole, die Messingglocke Brann. Am Steg laden, dann hier im Hauptkontor entladen.</div>`;
  const ships = game.state.ships.filter(s => mine(game, s));
  if (!ships.length) return h + '<div class="xs muted">Du brauchst ein Schiff.</div>';
  h += ships.map(s => {
    const at = atWerft(game, b, s);
    return `<div class="lrow">${img(SPR.icon.anchor, 1)}<span class="grow xs"><b>${esc(s.name)}</b> <span class="muted">&middot; ${at ? 'am Anleger' : 'unterwegs'}</span></span>`
      + (at ? `<button class="btn btn-green btn-xs" data-sact="mount" data-ship="${s.id}" data-werft="${b.id}">Montieren</button>`
        : `<button class="btn btn-paper btn-xs" data-sact="toWerft" data-ship="${s.id}" data-werft="${b.id}">Herholen</button>`) + '</div>';
  }).join('');
  return h + '<div class="xs muted">Die Glocke gibt es nur einmal. Das Schiff behält sie für immer.</div>';
}
// Schiff mit Glocke: Tauchspot, Knöpfe „Zum Tauchspot“ und „Tauchgang starten“
export function shipDiveHTML(s) {
  if (!s.bell) return '';
  const P = diveSpot(game), B = diveBusy(game), why = diveWhy(game, s), d = spotDist(game, s);
  let h = `<div class="lbl" style="margin-top:8px">${bellIc(1)} Taucherglocke</div>`;
  if (B) h += `<div class="xs">${B.ship === s.id ? '<b>Die Glocke ist unten &hellip;</b>' : 'Gerade taucht jemand anderes.'}</div>`;
  else if (!P) h += '<div class="xs muted">Kein Tauchspot zu sehen. Bald blubbert es irgendwo im aufgedeckten Meer.</div>';
  else h += `<div class="xs">${esc(SPOT_KINDS[P.kind].name)} bei ${P.x} / ${P.y} &middot; ${overSpot(game, s) ? '<b class="good">genau darüber</b>' : `${fmt(Math.round(d))} Felder entfernt`}</div>`;
  h += `<div class="btns">`
    + `<button class="btn btn-paper btn-sm" data-sact="toSpot" data-ship="${s.id}" ${P && !B && d > DIVE.over ? '' : 'disabled'}>Zum Tauchspot</button>`
    + `<button class="btn btn-green btn-sm" data-sact="dive" data-ship="${s.id}" ${why ? `disabled title="${esc(why)}"` : ''}>Tauchgang starten</button></div>`;
  if (why && P && !B) h += `<div class="xs muted">${esc(why)}</div>`;
  return h;
}
// Knöpfe (ui/ships.js shipAction): true = erledigt
export function diveAction(el, s) {
  switch (el.dataset.sact) {
    case 'toSpot': { const P = diveSpot(game); if (!P) return true; send({ type: 'shipGoto', ship: s.id, x: P.x, y: P.y }); break; }
    case 'dive': send({ type: 'diveStart', ship: s.id }); break;
    case 'toWerft': { const b = game.blds.get(+el.dataset.werft); if (!b || b._dock == null) return true; send({ type: 'shipGoto', ship: s.id, x: tkx(b._dock), y: tky(b._dock) }); break; }
    case 'mount': send({ type: 'mountBell', id: +el.dataset.werft, ship: s.id }); break;
    default: return false;
  }
  return true;
}
