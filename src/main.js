/* =========================================================
   START, HAUPTSCHLEIFE & VERDRAHTUNG
   ========================================================= */
import { onDiveEvent } from './ui/dive.js';
import { debugDiveGame, setForceTask, diveGameState } from './ui/divegame.js';
import { USE_WORKER, SAVE_EVERY, MAX_FRAME_DT, TS, JETTISON_TTL, SAVE_VERSION, INTERPOLATE } from './config.js';
import { pipeNets } from './sim/fluids.js';
import { mods } from './sim/mods.js';
import { BD } from './data/buildings.js';
import { ISL_TYPES, RINGS } from './data/islands.js';
import { ORES, ORE_IDX } from './data/items.js';
import { tkx, tky } from './util/tiles.js';
import { TECH_BY_ID } from './data/tech.js';
import { UNLOCK_KEYS, unlockName, srcOf } from './data/unlocks.js';
import { esc } from './util/format.js';
import { img, fitScale } from './gfx/pixelbuffer.js';
import { SPR, shipSprite, buildSprites, drawLogo, setFavicon } from './gfx/sprites.js';
import { cam, initCamera, resize, clampCam, tileAtW, centerIsland, centerOnTile } from './gfx/camera.js';
import { initRenderer, draw, renderStats } from './gfx/renderer.js';
import { counts as imageCounts } from './gfx/chunks.js';
import { applyWorld, applySnapshot } from './sim/snapshot.js';
import { kontorIslands, islName, homeIsl, homeOf, isSep } from './sim/state.js';
import { checkPlace } from './sim/buildings.js';
import { levelInfo } from './sim/research.js';
import { serialize, parseSave, isOldSave } from './save/serialize.js';
import { storage, newId, saveIslands } from './save/storage.js';
import { createSimClient } from './simclient.js';
import { game, ui, $, setClient, runAfterSync, afterSync, saveGame } from './ui/context.js';
import { renderAllUI, renderIslandChange, setMode, wirePanels } from './ui/panels.js';
import { wireHud, closeMenus, renderGoal } from './ui/hud.js';
import { wireHotbar, showKeys } from './ui/hotbar.js';
import { wireSpeed, renderSpeed } from './ui/speed.js';
import { loadLibrary } from './ui/blueprints.js';
import { wireBuildMenu, closeBuild } from './ui/buildmenu.js';
import { wireInventory, closePopover } from './ui/inventory.js';
import { wireWindows, renderWindow, closeWindow } from './ui/windows.js';
import { wireTooltips } from './ui/tooltip.js';
import { wireLayout, isSmallScreen } from './ui/layout.js';
import { skilltreeDebug } from './ui/skilltree.js';
import './ui/fleet.js';
import './ui/stats.js';
import './ui/market.js';
import { lvlName } from './ui/npcs.js';
import { relicName } from './ui/relics.js';
import { curIsl } from './ui/common.js';
import './ui/mapview.js';
import { TRADERS } from './data/trade.js';
import { EVENTS } from './data/events.js';
import { WONDER } from './data/wonder.js';
import { fmt } from './util/format.js';
import { toast } from './ui/toasts.js';
import { askConfirm, askInfo } from './ui/modal.js';
import { onStory, onTalk, onNpcArrive, debugScene, debugDialog, stopStory, afterStory, resumeStory } from './ui/story.js';
import { setupTimes } from './cutscene/player.js';
import { NPC_ISL, npcName } from './data/npcs.js';
import { endingInfo } from './sim/ending.js';
import { renderMinimap, wireMinimap, thumbnail, renderMiniHead } from './ui/minimap.js';
import { placeFoundButtons } from './ui/ships.js';
import { nameIsland } from './ui/islandname.js';
import { ITEMS } from './data/items.js';
import { findsNear, lootLeft } from './world/finds.js';
import { wireInput, keys } from './input/input.js';
import { setApp, wireMenus, showTitle, hideTitle, closePause } from './ui/menu.js';
import { moveCamera, demoCamera, followCamera, stopFollow } from './gfx/camera.js';
import * as NET_S from './net/session.js';
import { netDebug, setNetDebug } from './net/peer.js';
import { createRemoteClient, remoteWorld, remoteSnap, clearPending, pending } from './net/remote.js';
import { setCoopApi, openCoop, closeLobby, askJoin } from './ui/coop.js';
import { wireChat, renderChat, closeChat } from './ui/chat.js';
import { wireMarks, renderMarkEdges, closeMarkMenu } from './ui/marks.js';
import { localPeerState, viewRect } from './gfx/peers.js';
import { renderSpeed as renderSpeedUI } from './ui/speed.js';

let client = null, started = false, saveGen = 0;
// Koop: localClient = eigene Simulation (Host, Einzelspieler, Demo); als Mitspieler ist client die Verbindung zum Host (net/remote.js)
let localClient = null, remote = null, guestReady = false, triedWorker = false;
let lobbySlot = null;            // Koop-Host: Spielstand der Welt hinter der Lobby (bis „Spiel starten“)
let lastT = 0, saveT = 0, camTile = -2, camFogVer = -1;
let animT = 0;                   // Animationsuhr: läuft mit dem Spieltempo, steht in der Pause
let slot = null;                 // laufender Spielstand { id, name, playTime (s) }; null im Hauptmenü
let wired = false;               // Oberfläche des Spiels einmal verdrahtet
// Nach einer Anfrage, die eine neue Welt liefert (Demo, Laden, Neues Spiel): fn beim ersten Snapshot dieser Welt
let worldReq = 0, worldGot = 0, onWorldSnap = null;
function requestWorld(fn) { worldReq++; onWorldSnap = fn; }

/* ---------- Speichern (in den laufenden Spielstand) ---------- */
let thumbT = 0, thumbUrl = '';
function slotMeta(sl) {
  if (performance.now() - thumbT > 30000 || !thumbUrl) { thumbUrl = thumbnail(); thumbT = performance.now(); }
  const m = { name: sl.name, played: Date.now(), playTime: Math.round(sl.playTime || 0), islands: kontorIslands(game).length, thumb: thumbUrl, v: SAVE_VERSION };
  // Koop-Spielstand: in „Spiel laden“ markiert, mit den Spielern (ID, Name, Farbe)
  if (sl.coop) Object.assign(m, { coop: true, mode: game.state.mode || 'shared', players: Object.entries(game.state.players || {}).map(([id, p]) => ({ id, name: p.name, color: p.color })) });
  // Getrennte Inseln: „Getrennte Inseln · 2/3 Spieler“ (Spieler mit Startplatz / Startplätze)
  if (sl.coop && game.state.homes) Object.assign(m, { slots: game.state.homes.length, players: m.players.filter(p => game.state.homes.some(h => h.pid === p.id)), islands: kontorIslands(game, 'host').length });
  return m;
}
// Regulär: Spielstand von der Simulation anfordern und ablegen. Liefert true bei Erfolg.
async function saveNow() {
  if (!started || !slot) return false;
  const gen = saveGen, sl = slot;
  const json = await client.save(game.state.ui);
  if (gen !== saveGen || !json) return false;
  return storage.write(sl.id, json, slotMeta(sl));
}
// Beim Verlassen/Verstecken der Seite: sofort aus dem Spiegel (Stand des letzten Snapshots),
// damit der Schreibvorgang noch synchron gestartet wird
// Getrennte Inseln: der Spiegel kennt nur die eigene Sicht (kein Spielstand der Mitspieler), dort nur regulär speichern
function saveFromMirror() {
  if (!started || !slot || isSep(game)) return;
  storage.write(slot.id, serialize(game, game.state.ui), slotMeta(slot));
}

/* ---------- Nachrichten der Simulation ---------- */
const ISL_NAME_EV = new Set(['traderComing', 'trade', 'evWarn', 'evStart', 'evEnd']);
// Version 18: Meldungen bündeln. Neu entdeckte und kartierte Inseln sammelt islandNews (eine Meldung je Insel, mehrere als Sammelmeldung);
// gleichartige Meldungen eines Snapshots (Freischaltungen, neue/abgelaufene Aufträge, erfüllte Verträge) werden zu einer zusammengefasst.
const ISL_NEWS = { wait: 2500, mapWait: 8000 };   // ms Ruhe vor der Meldung; so lange wartet eine entdeckte Insel aufs Kartieren
const islNews = new Map();   // Insel → { d: Entdeckt-Ereignis, m: Kartiert-Ereignis, t: Zeitpunkt }
let islTimer = 0;
function islandNews(ev) {
  const e = islNews.get(ev.id) || { t: performance.now() };
  if (ev.type === 'discovered') e.d = ev; else e.m = ev;
  islNews.set(ev.id, e);
  clearTimeout(islTimer); islTimer = setTimeout(flushIslandNews, ISL_NEWS.wait);
}
function oreList(ores) {
  return Object.entries(ores || {}).sort((a, b) => b[1] - a[1]).map(([id]) => { const O = ORES[ORE_IDX[id]]; return O.item ? `<span class="row" style="display:inline-flex;gap:2px">${img(SPR.item[O.item], 1)}${O.name}</span>` : O.name; });
}
function flushIslandNews() {
  const now = performance.now(), out = [];
  for (const [k, e] of islNews) {
    if (!e.m && now - e.t < ISL_NEWS.mapWait) continue;   // entdeckt, noch nicht kartiert: etwas warten
    out.push(e); islNews.delete(k);
  }
  if (islNews.size) islTimer = setTimeout(flushIslandNews, ISL_NEWS.wait);
  if (!out.length) return;
  const ic = img(SPR.icon.anchor, 2), typeOf = (e) => ISL_TYPES[(e.m || e.d).itype].name;
  if (out.length === 1) {
    const e = out[0];
    if (e.m) toast(`${ic}<span><b>${typeOf(e)} ${e.d ? 'entdeckt und kartiert' : 'kartiert'}</b>${e.d ? ` &middot; ${RINGS[e.d.ring].name}` : ''} &ndash; Vorkommen: ${oreList(e.m.ores).join(', ') || 'keine'}</span>`, 'gold');
    else toast(`${ic}<span><b>Insel entdeckt!</b> ${typeOf(e)} &middot; ${RINGS[e.d.ring].name}</span>`, 'gold');
    return;
  }
  const m = out.filter(e => e.m), d = out.length - m.length, allNew = m.every(e => e.d);
  const types = {}, ores = {};
  for (const e of out) { const t = typeOf(e); types[t] = (types[t] || 0) + 1; if (e.m) for (const o in e.m.ores || {}) ores[o] = (ores[o] || 0) + e.m.ores[o]; }
  const head = [m.length ? `${m.length} ${allNew ? 'neue ' : ''}Inseln kartiert` : '', d ? `${d} ${m.length ? 'weitere ' : ''}${d === 1 ? 'Insel' : 'Inseln'} entdeckt` : ''].filter(Boolean).join(', ');
  const list = Object.entries(types).map(([t, n]) => n > 1 ? `${n}× ${t}` : t).join(', '), ol = oreList(ores);
  toast(`${ic}<span><b>${head}</b><br><span class="xs">${list}${ol.length ? ` &middot; Vorkommen: ${ol.join(', ')}` : ''}</span></span>`, 'gold');
}
function onEvents(events) {
  const B = { unl: [], orders: [], ordEnd: [], dealOk: [], relicOffer: [] };   // gesammelt, am Ende je eine Meldung
  for (const ev of events) {
    if (ISL_NAME_EV.has(ev.type) && ev.isl != null) ev.name = islName(game, ev.isl);   // Name aus eigener Sicht (Getrennte Inseln: „Heimatinsel“)
    switch (ev.type) {
      case 'shipLaunched':
        toast(`${img(shipSprite(ev.kind), 1)}<span><b>${esc(ev.name)}</b> ist vom Stapel gelaufen. Anklicken und mit Rechtsklick steuern, Routen im Fenster „Flotte“ (F).</span>`, 'gold');
        renderWindow(); break;
      case 'shipGoto': ui.mark = { x: ev.x, y: ev.y, t: performance.now() }; break;
      case 'loot': {
        const what = ev.got.map(g => g.it === 'coins' ? `<b>${g.n} Münzen</b>` : `${g.n} ${ITEMS[g.it].name}`).join(', '), ic = img(ev.kind === 'wreck' ? SPR.wreck : ev.kind === 'jet' ? SPR.jetsam : SPR.drift, 1);
        if (ev.got.length) toast(`${ic}<span><b>${esc(ev.name)}</b> hat ${ev.what} geborgen: ${what}${ev.full ? ' &middot; <b>Laderaum voll</b>, der Rest bleibt liegen' : ''}</span>`, 'gold');
        else toast(`${ic}<span><b>Laderaum voll</b> &middot; ${ev.what} bleibt liegen</span>`);
        renderAllUI(); break;
      }
      case 'kontorFounded':
        if (ui.mode && ui.mode.kind === 'found') setMode(null);
        saveGame(); renderAllUI(true);
        nameIsland(ev.isl, true, () => renderAllUI(true));
        break;
      case 'researched':
        if (otherPlayer(ev)) { NET_S.sys(`${playerName(ev.pid)} hat „${TECH_BY_ID[ev.id].name}“ erforscht.`, true); renderAllUI(true); break; }
        if (NET_S.active()) NET_S.sys(`Forschung abgeschlossen: ${TECH_BY_ID[ev.id].name}.`, true);
        toast(`${img(SPR.icon.star, 2)}<span><b>${TECH_BY_ID[ev.id].name}</b> erforscht! +${ev.fame || 0} Ruhm</span>`, 'gold');
        saveGame(); renderAllUI(true); break;
      // Freischaltung durch Volk oder Story (sim/unlocks.js); all = Debug „Alles freischalten“
      case 'unlocked':
        if (ev.all) toast(`${img(SPR.icon.star, 2)}<span><b>Debug:</b> alles freigeschaltet (Völker, Story, Pläne, Forschung).</span>`, 'gold');
        else B.unl.push(ev);
        saveGame(); renderAllUI(true); break;
      case 'placed':
        if (ev.click && ev.t === 'saege' && ev.n === 1) toast(`${img(SPR.icon.chest, 2)}<span>Sägewerk steht! Lege jetzt ein <b>Fließband</b> von dort ins Kontor.</span>`, 'gold');
        break;
      case 'removed':
        if (ui.selected === ev.id) ui.selected = -1;
        if (ev.notify) toast(`${BD[ev.t].name} abgerissen.`);
        break;
      case 'goal':
        if (NET_S.active()) NET_S.sys(`Ziel erreicht: +${ev.fame} Ruhm${ev.coins ? `, +${fmt(ev.coins)} Münzen` : ''}.`, true);
        toast(`${img(SPR.icon.star, 2)}<span><b>Ziel erreicht!</b> +${ev.fame} Ruhm${ev.coins ? `, +${fmt(ev.coins)} Münzen` : ''}</span>`, 'gold', true);
        renderGoal(); break;
      case 'fail': toast(ev.msg); break;
      case 'undone': toast(`${img(SPR.icon.undo, 2)}<span>Rückgängig: ${esc(ev.label)}</span>`); break;
      case 'redone': toast(`${img(SPR.icon.redo, 2)}<span>Wiederholt: ${esc(ev.label)}</span>`); break;
      case 'upgraded': break;
      case 'bpPlaced':
        toast(`${img(SPR.icon.blueprint, 2)}<span>${ev.name ? `<b>${esc(ev.name)}</b>: ` : ''}${ev.built} von ${ev.total} Teilen gebaut${ev.reason && ev.built < ev.total ? `<br><span class="xs">Häufigster Grund: ${esc(ev.reason)}</span>` : ''}</span>`, ev.built === ev.total ? 'gold' : '');
        break;
      case 'discovered':
        if (ev.npc) { toast(`${img(SPR.npc.fig[ev.npc], 2)}<span><b>${esc(NPC_ISL[ev.npc].isl)} entdeckt!</b> Hier lebt ${esc(npcName(ev.npc))}.</span>`, 'gold', true); break; }
        islandNews(ev);
        break;
      case 'mapped':
        if (!game.W.npcOf(ev.id)) islandNews(ev);   // NPC-Inseln: keine Vorkommen, die Entdeckung hat schon eine Meldung
        renderAllUI(); break;
      case 'jettison':
        toast(`${img(SPR.jetsam, 1)}<span><b>${esc(ev.name)}</b>: ${ev.n} ${ITEMS[ev.it].name} über Bord geworfen. Die Kisten treiben ${JETTISON_TTL / 60} Minuten neben dem Schiff.</span>`);
        renderAllUI(); break;
      case 'cleared':
        toast(`${ev.n > 1 ? `Strecke geleert (${ev.n} Felder)` : 'Feld geleert'}: ${ev.moved} Item${ev.moved === 1 ? '' : 's'} ins Kontor${ev.lost ? `, ${ev.lost} gingen verloren (Kontor voll)` : ''}.`);
        renderAllUI(); break;
      case 'stashed':
        if (ev.moved || ev.lost) toast(`Bestand ins Hauptkontor gebracht: ${ev.moved} Items${ev.lost ? `, ${ev.lost} gingen verloren (Kontor voll)` : ''}.`);
        break;
      case 'kontorMoved':
        if (ui.mode && ui.mode.kind === 'move') setMode(null);
        toast(`${img(SPR.icon.chest, 2)}<span>Hauptkontor verlegt. Bestand und Routen bleiben erhalten.</span>`, 'gold');
        saveGame(); renderAllUI(true); break;
      case 'gate': renderAllUI(); break;
      case 'exploreDone':
        toast(`${img(SPR.shipE, 1)}<span><b>${esc(ev.name)}</b>: Umgebung erkundet. Innerhalb der Reichweite ist alles aufgedeckt, der Entdecker kehrt zum Hauptkontor zurück. Mit größerer Reichweite fährt er weiter hinaus.</span>`);
        renderAllUI(); break;
      case 'migrated':
        askInfo('Spielstand aktualisiert', `Die Lagerlogik ist neu: Das Hauptkontor ist jetzt das Inselinventar (3×3 mit Steg), Lagerhallen wurden zu Lagerkisten und Waren verlassen Speicher nur noch über <b>Extraktoren</b>.${ev.outItem ? `<br><br>${ev.outItem} Lager-Ausgabe${ev.outItem === 1 ? ' wurde' : 'n wurden'} entfernt: Setze an diese Stellen einen Extraktor.` : ''}<br><br>Alte Kontore bleiben 2×2 &ndash; über „Kontor verlegen“ bekommst du das neue Hauptkontor mit Steg.`, 'Verstanden');
        break;
      case 'migrated15':
        askInfo('Spielstand aktualisiert', 'Gebäude werden jetzt nach und nach freigeschaltet: am Anfang, durch Forschung, bei den Völkern oder durch die Geschichte. Dein Spielstand behält alles, was bisher baubar war. Neu im Skilltree sind die frühen Forschungen <b>Ofenbau</b>, <b>Bandtechnik</b> und <b>Schiffbau</b>; sie gelten als erforscht.', 'Verstanden');
        break;
      case 'traderComing':
        toast(`${img(SPR.trader[ev.kind], 1)}<span><b>${TRADERS[ev.kind].name}</b> segelt nach ${esc(ev.name)}.</span>`); break;
      case 'trade': {
        // „Hafenhändler auf Möwenklippe: 120 Holz verkauft (+240), 20 Glas gekauft (−280)“
        const parts = ev.lines.map(l => `${l.n} ${ITEMS[l.it].name} ${l.sell ? 'verkauft' : 'gekauft'} (${l.sell ? '+' : '&minus;'}${fmt(l.sum)})`);
        if (parts.length) toast(`${img(SPR.icon.coin, 2)}<span><b>${TRADERS[ev.kind].name} auf ${esc(ev.name)}:</b> ${parts.join(', ')}</span>`, 'gold');   // ohne Handel still (kam bei jedem Besuch)
        renderAllUI(); break;
      }
      case 'evWarn': {
        const D = EVENTS[ev.kind], s = Math.max(0, Math.round(ev.at - game.state.time));
        if (s <= 2) break;   // sofort laufend (Debug): nur die Start-Meldung
        toast(`${img(SPR.ev[ev.kind], 2)}<span><b>${D.name}</b> in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}${ev.name ? ` bei ${esc(ev.name)}` : ''}: ${D.eff}.</span>`); break;
      }
      case 'evStart': {
        const D = EVENTS[ev.kind];
        toast(`${img(SPR.ev[ev.kind], 2)}<span><b>${D.name}</b>${ev.name ? ` bei ${esc(ev.name)}` : ''} hat begonnen.${ev.dmg ? ` <b>${ev.dmg} Gebäude beschädigt</b> &ndash; im Info-Panel reparieren.` : ''}</span>`, ev.dmg ? '' : 'gold');
        renderAllUI(); break;
      }
      case 'evEnd': toast(`${img(SPR.ev[ev.kind], 2)}<span>${EVENTS[ev.kind].name} ist vorbei.</span>`); renderAllUI(); break;
      case 'evCancel': toast('Ereignisse aus: das angekündigte Ereignis fällt aus.'); break;
      case 'repaired': if (ev.src !== 'drone' || ui.selected === ev.id) toast(`${img(SPR.icon.wrench, 2)}<span>${BD[ev.t].name} repariert${ev.src === 'drone' ? ' (Drohne)' : ''}.</span>`); renderAllUI(); break;
      // Leuchtturm: Baustelle eröffnet (Waren über Bänder oder aus dem Inselinventar), Stufe fertig (mit größerer Sicht)
      case 'wonderStart': toast(`${img(SPR.b.leuchtturm[ev.ph], fitScale(SPR.b.leuchtturm[ev.ph], 40))}<span>Weltenleuchtturm: Baustelle für Stufe ${ev.ph} „${ev.name}“ eröffnet. Bring die Waren per Band hin oder lass sie aus dem Inselinventar holen.</span>`, 'gold'); renderAllUI(); break;
      case 'wonderPhase': toast(`${img(SPR.b.leuchtturm[ev.ph], fitScale(SPR.b.leuchtturm[ev.ph], 40))}<span><b>Stufe ${ev.ph} „${ev.name}“ fertig!</b>${ev.sight ? ` Der Turm überblickt jetzt ${ev.sight} Felder.` : ''}${ev.fame ? ` +${ev.fame} Ruhm` : ''}</span>`, 'gold'); saveGame(); renderAllUI(true); break;
      // Getrennte Inseln: Wettstreit um den Leuchtturm, Handel zwischen Spielern, Erlaubnis für Routen
      case 'wonderNews': NET_S.sys(`${ev.who === NET_S.myPid() ? 'Du hast' : `${ev.name} hat`} Leuchtturm-Phase ${ev.ph} „${ev.phase}“ fertiggestellt.`, true); renderAllUI(); break;
      case 'wonderFirst':
        NET_S.sys(`${ev.name} hat den ersten Weltenleuchtturm entzündet!`, true);
        toast(`${img(SPR.b.leuchtturm[4], 1)}<span><b>${esc(ev.name)} hat den ersten Weltenleuchtturm entzündet!</b>${ev.who === NET_S.myPid() ? ` +${fmt(ev.fame)} Ruhm` : ' Du kannst deinen trotzdem fertig bauen.'}</span>`, 'gold');
        renderAllUI(true); break;
      case 'ptrade': {
        const me = NET_S.myPid(), buy = ev.buyer === me, other = playerName(buy ? ev.seller : ev.buyer);
        NET_S.sys(`${buy ? `Kauf von ${other}` : `Verkauf an ${other}`}: ${ev.n} ${ITEMS[ev.it].name} für ${fmt(ev.sum)} Münzen.`, true);
        renderAllUI(); break;
      }
      case 'permAsk':
        toast(`${img(SPR.ship, 1)}<span><b>${esc(playerName(ev.from))}</b> möchte mit <b>${esc(ev.name)}</b> dein Hauptkontor anfahren. Erlauben unter Flotte (F) &rarr; Anfragen.</span>`, 'gold');
        renderWindow(); break;
      case 'permAns':
        toast(`${img(SPR.ship, 1)}<span><b>${esc(playerName(ev.by))}</b> hat die Route von <b>${esc(ev.name)}</b> ${ev.ok ? 'erlaubt' : ev.revoked ? 'widerrufen' : 'abgelehnt'}.</span>`, ev.ok ? 'gold' : '');
        renderWindow(); break;
      case 'seated': renderAllUI(true); break;
      case 'wonderDone': {
        if (game.state.story) break;   // mit Geschichte folgt das Finale (Ereignis story)
        const m = Math.floor(ev.play / 60), hh = Math.floor(m / 60);
        const badge = ev.first ? `<div class="wbadge">${img(SPR.icon.star, 2)}<b>Erster Leuchtturm</b><span class="xs">+${fmt(WONDER.firstFame)} Ruhm</span></div>` : ev.firstBy ? `<div class="xs muted" style="text-align:center">Den ersten Weltenleuchtturm hat ${esc(ev.firstBy)} entzündet.</div>` : '';
        askInfo('Der Weltenleuchtturm leuchtet!', `<div style="text-align:center">${img(SPR.b.leuchtturm[4], 1)}</div>${badge}Sein Licht reicht über alle Inseln. Das Spiel geht weiter &ndash; baue dein Reich so groß, wie du willst.
          <div class="wdone"><span>Spielzeit</span><b>${hh ? `${hh} h ` : ''}${m % 60} min</b><span>Gebäude</span><b>${fmt(ev.blds)}</b><span>Inseln mit Kontor</span><b>${ev.isl}</b><span>Ruhm (gesamt)</span><b>${fmt(ev.fame)}</b><span>Münzen</span><b>${fmt(ev.coins)}</b><span>Münzen verdient (gesamt)</span><b>${fmt(ev.coinsTotal)}</b></div>`, 'Weiterspielen');
        break;
      }
      // Geschichte (Version 16): Szenen und Dialoge (Platzhalter in ui/story.js), Gespräch, Ankunft am NPC-Steg
      case 'story': onStory(ev); renderAllUI(true); break;
      case 'talk': onTalk(ev); break;
      // Handel mit den Völkern (Version 17, sim/npc.js); Einzelheiten im Fenster „Völker“ (N)
      case 'npcTrade': {
        const parts = ev.lines.map(l => `${l.n} ${ITEMS[l.it].name} ${l.kind === 'buy' ? 'gekauft' : l.kind === 'order' ? 'für einen Auftrag geliefert' : l.kind === 'deal' ? 'per Vertrag geliefert' : 'verkauft'}${l.sum ? ` (${l.kind === 'buy' ? '&minus;' : '+'}${fmt(l.sum)})` : ''}`);
        toast(`${img(SPR.icon.coin, 2)}<span><b>${esc(npcName(ev.npc))}:</b> ${parts.join(', ')}</span>`, 'gold');
        renderAllUI(); break;
      }
      case 'npcLevel': {
        const who = esc(npcName(ev.npc)), L = lvlName(ev.lvl);
        const more = [ev.names.length ? `Freigeschaltet: <b>${ev.names.map(esc).join(', ')}</b>.` : '', ev.plans.length ? `Neue Pläne zu kaufen: ${ev.plans.map(esc).join(', ')}.` : ''].filter(Boolean).join(' ');
        toast(`${img(SPR.npc.fig[ev.npc], 2)}<span>${ev.first ? `<b>${who}</b> ist dir gegenüber <b>${L.toLowerCase()}</b>. Handeln kannst du am Steg, alles Weitere im Fenster „Völker“ (N).` : `<b>${who}</b>: Ruf jetzt <b>${L}</b>!`} ${more}</span>`, 'gold');
        saveGame(); renderAllUI(true); break;
      }
      case 'npcOrders': B.orders.push(ev); renderWindow(); break;
      case 'npcOrder': toast(`${img(ev.relic && SPR.relic[ev.relic] ? SPR.relic[ev.relic] : SPR.icon.check, 2)}<span><b>Auftrag für ${esc(npcName(ev.npc))} erledigt:</b> ${fmt(ev.n)} ${ITEMS[ev.it].name} &middot; +${fmt(ev.coins)} Münzen, +${ev.rep} Ruf${ev.relic ? ` &middot; Relikt: <b>${esc(relicName(ev.relic))}</b> (Relikte, L)` : ''}</span>`, 'gold', true); renderAllUI(); break;
      // Relikte (0.24.0, sim/relics.js, ui/relics.js)
      case 'relicGot': {
        const how = String(ev.src || '').startsWith('npc:') ? `bei ${esc(npcName(ev.src.slice(4)))} gekauft` : 'gefunden';
        toast(`${img(SPR.relic[ev.id], 2)}<span><b>Relikt ${how}:</b> ${esc(relicName(ev.id))}. Es liegt in der Sammlung (Relikte, L), setz es in einen Reliktsockel.</span>`, 'gold', true);
        renderAllUI(); break;
      }
      case 'relicPaused': toast(`${img(SPR.relic[ev.id], 2)}<span><b>${esc(relicName(ev.id))}</b> auf ${esc(islName(game, ev.isl))} ruht: Es fehlen Perlen im Inselinventar.</span>`, '', true); renderAllUI(); break;
      case 'relicResumed': toast(`${img(SPR.relic[ev.id], 2)}<span><b>${esc(relicName(ev.id))}</b> wirkt wieder (${esc(islName(game, ev.isl))}).</span>`); renderAllUI(); break;
      case 'relicTaken': if (ev.removed) toast(`${img(SPR.relic[ev.id], 2)}<span><b>${esc(relicName(ev.id))}</b> liegt wieder in der Sammlung (Sockel abgerissen).</span>`); renderAllUI(); break;
      case 'relicPut': renderAllUI(); break;
      case 'relicOffer': B.relicOffer.push(ev); renderWindow(); break;
      case 'relicDebug': toast(ev.pearls ? `Debug: ${fmt(ev.pearls)} Perlen (und Korallen, Muscheln) auf ${esc(ev.name)}.` : `Debug: ${ev.n} Relikte in die Sammlung gelegt.`); renderAllUI(true); break;
      case 'migrated19':
        askInfo('Spielstand aktualisiert', `Es gibt jetzt <b>Relikte</b> und <b>Reliktsockel</b>. ${ev.ids.map(id => `<b>${esc(relicName(id))}</b>`).join(' und ')} liegt nicht mehr im Lager, sondern in deiner Reliktsammlung (Taste L). Setz es in einen Goldenen Sockel, dann wirkt es auf die ganze Insel.`, 'Verstanden');
        break;
      case 'npcOrderEnd': B.ordEnd.push(ev); renderAllUI(); break;
      case 'npcDeal': {
        const who = esc(npcName(ev.npc)), it = ITEMS[ev.it].name;
        if (ev.taken) toast(`${img(SPR.npc.fig[ev.npc], 2)}<span>Liefervertrag mit <b>${who}</b>: ${fmt(ev.n)} ${it} je Tag. Leg eine Route an, die an ${who}s Steg entlädt.</span>`, 'gold', true);
        else if (ev.ok) B.dealOk.push(ev);
        else if (ev.ok === false) toast(`${img(SPR.npc.fig[ev.npc], 2)}<span>Liefervertrag mit <b>${who}</b> verpasst: ${fmt(ev.got)} von ${fmt(ev.n)} ${it} (${ev.rep} Ruf)${ev.ended ? `. <b>${who} hat den Vertrag gekündigt.</b>` : '.'}</span>`, '', true);
        else if (ev.ended) toast(`Liefervertrag mit ${who} (${it}) gekündigt.`);
        renderAllUI(); break;
      }
      case 'npcGift': toast(`${img(SPR.npc.fig[ev.npc], 2)}<span><b>${esc(npcName(ev.npc))}</b> schickt dir ein Geschenk: ${ev.coins ? `<b>${fmt(ev.coins)} Münzen</b>` : `<b>${fmt(ev.n)} ${ITEMS[ev.it].name}</b> (Heimatinsel)`}.</span>`, 'gold'); renderAllUI(); break;
      case 'npcVillage': toast(`${img(SPR.npc.fig[ev.npc], 2)}<span>Das Dorf von <b>${esc(npcName(ev.npc))}</b> wächst (Stufe ${ev.stage} von ${ev.max}).</span>`); renderAllUI(); break;
      case 'npcChart':
        ui.mark = { x: ev.x, y: ev.y, t: performance.now() };
        toast(`${img(SPR.icon.map, 2)}<span><b>Seekarte:</b> Eine Insel bei ${ev.x} / ${ev.y} ist jetzt aufgedeckt. In der Karte (M) markiert.</span>`, 'gold');
        renderAllUI(true); break;
      case 'npcArrive': onNpcArrive(ev); renderAllUI(); break;
      case 'storyDebug': toast(`Debug: ${esc(ev.msg)}`); renderAllUI(true); break;
      // Taucherglocke und Tauchen (ui/dive.js)
      case 'bellMounted': case 'diveSpot': case 'diveStart': case 'diveResult': case 'diveDebug': onDiveEvent(ev); renderAllUI(true); break;
      case 'migrated16':
        askInfo('Spielstand aktualisiert', 'Tideworks hat jetzt eine <b>Geschichte</b>. Irgendwo hinter dem Nebel liegen drei bewohnte Inseln: das Pfahldorf von Ole, die Werkstattbucht von Brann und der Goldberg von Aurel. Finde sie mit deinen Schiffen.<br><br>Der <b>Weltenleuchtturm</b> gehört jetzt zur Geschichte: Den Bauplan bekommst du von Brann, gebaut wird er auf der Heimatinsel.' + (ev.had ? ' Dein bisheriger Turm bleibt stehen und lässt sich ohne Wartezeit weiterbauen.' : ''), 'Verstanden');
        break;
      case 'debugKontor':
        toast(`Debug: Kontor auf Insel bei ${ev.x} / ${ev.y} gesetzt.`); renderAllUI(true); break;
    }
  }
  // Gesammelte Meldungen dieses Snapshots
  const star = img(SPR.icon.star, 2), who = (id) => esc(npcName(id));
  if (B.unl.length === 1) toast(`${star}<span><b>${esc(B.unl[0].name)}</b> ${B.unl[0].plan ? 'erhalten' : 'freigeschaltet'}!</span>`, 'gold');
  else if (B.unl.length) toast(`${star}<span><b>Freigeschaltet:</b> ${B.unl.map(e => esc(e.name)).join(', ')}</span>`, 'gold');
  if (B.relicOffer.length) toast(`${img(SPR.icon.relic, 2)}<span><b>Relikte im Angebot:</b> ${B.relicOffer.map(e => `${who(e.npc)}: ${esc(relicName(e.id))}`).join(', ')} (Völker, N).</span>`, '', true);
  if (B.orders.length === 1) { const e = B.orders[0]; toast(`${img(SPR.npc.fig[e.npc], 2)}<span><b>${who(e.npc)}</b> hat ${e.n === 1 ? 'einen neuen Auftrag' : `${e.n} neue Aufträge`} (Völker, N).</span>`, '', true); }
  else if (B.orders.length) toast(`${img(SPR.icon.check, 2)}<span><b>Neue Aufträge:</b> ${B.orders.map(e => `${who(e.npc)} ${e.n}`).join(', ')} (Völker, N).</span>`, '', true);
  if (B.ordEnd.length === 1) { const e = B.ordEnd[0]; toast(`${img(SPR.npc.fig[e.npc], 2)}<span>Auftrag von <b>${who(e.npc)}</b> abgelaufen: ${fmt(e.got)} von ${fmt(e.n)} ${ITEMS[e.it].name} geliefert${e.coins ? ` (+${fmt(e.coins)} Münzen)` : ''}.</span>`, '', true); }
  else if (B.ordEnd.length) toast(`${img(SPR.icon.check, 2)}<span><b>${B.ordEnd.length} Aufträge abgelaufen:</b> ${B.ordEnd.map(e => `${who(e.npc)} ${ITEMS[e.it].name} ${fmt(e.got)}/${fmt(e.n)}`).join(', ')}${B.ordEnd.some(e => e.coins) ? ` (+${fmt(B.ordEnd.reduce((a, e) => a + (e.coins || 0), 0))} Münzen)` : ''}</span>`, '', true);
  if (B.dealOk.length === 1) { const e = B.dealOk[0]; toast(`${img(SPR.icon.check, 2)}<span>Liefervertrag mit <b>${who(e.npc)}</b> erfüllt (${ITEMS[e.it].name}): +${fmt(e.coins)} Münzen, +${e.rep} Ruf</span>`, 'gold', true); }
  else if (B.dealOk.length) toast(`${img(SPR.icon.check, 2)}<span><b>${B.dealOk.length} Lieferverträge erfüllt:</b> ${B.dealOk.map(e => `${who(e.npc)} (${ITEMS[e.it].name})`).join(', ')} &middot; +${fmt(B.dealOk.reduce((a, e) => a + e.coins, 0))} Münzen</span>`, 'gold', true);
}
// Koop: Ereignis eines anderen Spielers (bekommen alle, z. B. „erforscht“)
const otherPlayer = (ev) => NET_S.active() && ev.pid != null && ev.pid !== NET_S.myPid();
const playerName = (pid) => { const p = game.state.players && game.state.players[pid]; return p ? p.name : 'Ein Mitspieler'; };
// Nachrichten der eigenen Simulation; als Koop-Mitspieler ruht sie (alte Nachrichten verfallen)
function onLocal(msg) {
  if (msg.kind === 'net') { NET_S.toGuest(msg.pid, msg.buf); return; }
  if (client && client.remote) return;
  onMessage(msg);
}
function onMessage(msg) {
  if (msg.kind === 'world') {
    applyWorld(game, msg);
    game.me = null;   // eigene Simulation: Host bzw. Einzelspieler
    worldGot++;
    return;
  }
  if (msg.kind === 'snap') {
    const events = applySnapshot(game, msg, performance.now());
    if (onWorldSnap && worldGot === worldReq) { const f = onWorldSnap; onWorldSnap = null; f(); }
    if (started) { onEvents(events); runAfterSync(msg.ack); }
  }
}

/* ---------- Kamera folgt einem Schiff (gfx/camera.js) ---------- */
// Position eines Schiffs wie gezeichnet (zwischen zwei Snapshots interpoliert) oder null
function shipPos(id) {
  const s = game.state.ships.find(o => o.id === id);
  if (!s) return null;
  if (s._x0 == null || !INTERPOLATE) return s;
  const a = Math.min(1, Math.max(0, (performance.now() - game.snapAt) / game.snapDur));
  return { x: s._x0 + (s.x - s._x0) * a, y: s._y0 + (s.y - s._y0) * a };
}
let followShown = null;
function renderFollowTag() {
  const s = cam.follow >= 0 ? game.state.ships.find(o => o.id === cam.follow) : null, key = s ? s.id + ':' + s.name : '';
  if (key === followShown) return;
  followShown = key;
  const el = $('followTag');
  el.classList.toggle('hidden', !s);
  if (s) el.innerHTML = `${img(shipSprite(s.kind), 1)}<span>Kamera folgt <b>${esc(s.name)}</b></span><kbd>Esc</kbd>`;
}

/* ---------- Hauptschleife ---------- */
function frame(t) {
  const now = t / 1000, dt = lastT ? Math.min(MAX_FRAME_DT, now - lastT) : 0;
  lastT = now;
  animT += dt * (ui.menu ? 1 : ui.halt ? 0 : ui.speed);
  if (!game.state) { requestAnimationFrame(frame); return; }   // erste Welt noch nicht da
  if (ui.menu) { if (!NET_S.active()) demoCamera(dt); draw(animT, t); requestAnimationFrame(frame); return; }   // Koop-Lobby: Kamera steht über der Heimatinsel
  moveCamera(keys, dt);
  if (!started) { draw(animT, t); requestAnimationFrame(frame); return; }
  followCamera(dt, shipPos);
  renderFollowTag();
  if (slot && !ui.pause && !document.hidden) slot.playTime = (slot.playTime || 0) + dt;
  // Inselname und Lager folgen der Insel in der Kartenmitte (im Nebel: keine)
  const i = tileAtW(cam.x, cam.y), fv = game.fog.ver;
  if (i !== camTile || fv !== camFogVer) {
    camTile = i; camFogVer = fv;
    const fogged = !game.fog.getK(i), k = fogged ? -1 : islandNear(i);
    if (k !== ui.camIsl || fogged !== ui.camFog) { ui.camIsl = k; ui.camFog = fogged; if (k >= 0) ui.viewIsl = k; renderIslandChange(); }
  }
  saveT += dt;
  if (saveT > SAVE_EVERY) { saveT = 0; saveNow(); }
  if (ui.cine === 'film') { requestAnimationFrame(frame); return; }   // Cutscene im Vollbild: Karte nicht zeichnen
  draw(animT, t);
  placeFoundButtons();
  renderMinimap(t);
  renderMarkEdges();
  requestAnimationFrame(frame);
}

// Insel auf Kachel i oder in bis zu 3 Feldern Abstand (Ufer zählt noch zur Insel), sonst -1 = offenes Meer
function islandNear(i) {
  const W = game.W, x0 = tkx(i), y0 = tky(i);
  if (W.il(x0, y0) >= 0) return W.il(x0, y0);
  let best = -1, bd = 99;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const d = dx * dx + dy * dy;
    if (d >= bd || d > 9) continue;
    const k = W.il(x0 + dx, y0 + dy);
    if (k >= 0) { best = k; bd = d; }
  }
  return best;
}

/* ---------- Ablauf: Hauptmenü (Demo-Fabrik) ↔ Spiel ---------- */
function resetUI() { setMode(null); closeBuild(); closeWindow(); closePopover(); closeMenus(); closeMarkMenu(); closeChat(); ui.selected = -1; ui.selTile = -1; ui.selShip = -1; ui.viewIsl = 0; camTile = -2; keys.clear(); }
// Titelbildschirm: Demo-Fabrik starten, Spielstand vergessen
function toTitle() {
  started = false; slot = null; saveGen++;
  stopStory(); resetUI(); closePause(true); closeLobby();
  ui.speed = 1; ui.halt = false; renderSpeedUI();
  requestWorld(() => {});
  client.demo();
  showTitle();
  renderChat();
}
// Spiel starten: json = Spielstand (Text) oder null für eine neue Welt mit seed.
// lobby = Koop-Host: Welt laden und angehalten hinter der Lobby lassen (play() beim „Spiel starten“). Liefert true bei Erfolg.
// opts.slots = Spielerzahl „Getrennte Inseln“ (neue Koop-Welt)
async function enterGame(sl, json, seed, lobby, opts) {
  if (started) await saveNow();
  started = false; saveGen++;
  resetUI(); closePause(true);
  ui.speed = 1; ui.halt = false;
  requestWorld(() => {
    if (lobby) { centerIsland(game, homeIsl(game)); return; }
    play(sl, !!json);
  });
  const ok = json ? await client.load(json) : await client.newGame(seed, opts);
  if (!ok) {
    worldReq--; onWorldSnap = null;
    toast('Dieser Spielstand ist beschädigt und kann nicht geladen werden.');
    if (!ui.menu) toTitle();
    return false;
  }
  return true;
}
// Ins Spiel wechseln (Titelbildschirm/Lobby ausblenden). sl = null: Koop-Mitspieler (kein eigener Spielstand)
function play(sl, loaded) {
  slot = sl; started = true; saveT = 0; thumbUrl = '';
  hideTitle(); closeLobby();
  // Tablet/Handy: Lager und Info-Panel starten eingeklappt
  if (!loaded && isSmallScreen()) { game.state.ui.invCollapsed = true; game.state.ui.infoCollapsed = true; if (window.innerWidth < 700) game.state.ui.goalCollapsed = true; }
  centerIsland(game, homeIsl(game)); ui.lastLevel = levelInfo(game.state.xpTotal).level;
  if (!wired) wireGame();
  renderMiniHead(); renderSpeed(); renderAllUI(true); renderChat();
  if (sl) { storage.setLast(sl.id); saveNow(); }
  if (loaded || NET_S.isHost()) resumeStory();   // Finale gesehen, aber noch nicht entschieden: zurück an den Leuchtturm (nur Host bzw. allein)
  if (!sl) { const h = NET_S.coop.players.get(NET_S.HOST); toast(`${img(SPR.icon.chat, 2)}<span>Du spielst bei <b>${esc(h ? h.name : 'dem Host')}</b> mit. Chat: <kbd>Enter</kbd>, Markierung: mittlere Maustaste oder Alt+Klick.</span>`, 'gold'); return; }
  if (NET_S.isHost()) { toast(`${img(SPR.icon.chat, 2)}<span>Koop läuft! Chat: <kbd>Enter</kbd>, Markierung: mittlere Maustaste oder Alt+Klick.</span>`, 'gold'); return; }
  // Neues Spiel mit Geschichte: der Prolog (cs_prolog) läuft vor dem ersten Bild der Karte, der Hinweis kommt danach
  (!loaded && game.state.story ? afterStory : (f) => f())(() => toast([...game.blds.values()].some(b => b.t !== 'kontor' && !BD[b.t].npc) ? `Willkommen zurück auf deinen Inseln! <span class="xs muted">(${esc(sl.name)})</span>` : `${img(SPR.icon.chest, 2)}<span>Willkommen! Du hast <b>100 Holz</b> im Kontor. Baue ein <b>Sägewerk</b> an einen Wald und liefere Holz per Band ins Kontor.</span>`));
}

/* ---------- Koop (net/session.js, ui/coop.js) ---------- */
// Mitspieler: eigene Simulation ruht, der Spiegel kommt nur noch aus den Nachrichten des Hosts
function becomeGuest() {
  if (client === remote && remote) return;
  started = false; slot = null; saveGen++;
  resetUI(); closePause(true);
  localClient.idle();
  remote = createRemoteClient((cmds, seq) => NET_S.guestSend(cmds, seq));
  client = remote; setClient(remote, () => {});
  guestReady = false;
  worldReq = worldGot = 0;   // Welten der eigenen Simulation zählen nicht mehr (ihre Nachrichten verfallen)
  requestWorld(() => { guestReady = true; if (NET_S.coop.phase === 'game') play(null, true); });
}
// zurück zur eigenen Simulation (Sitzung zu Ende)
function leaveGuest() {
  if (client !== remote || !remote) return;
  client = localClient; setClient(localClient, () => { saveNow(); }); remote = null; clearPending();
  game._net = null;
}
function guestSnap(m) {
  const now = performance.now(), events = remoteSnap(game, m, now);
  if (m.speed !== ui.speed || !!m.halt !== ui.halt) { ui.speed = m.speed || 1; ui.halt = !!m.halt; if (started) renderSpeed(); }
  if (onWorldSnap && worldGot === worldReq) { const f = onWorldSnap; onWorldSnap = null; f(); }
  if (started) { onEvents(events); runAfterSync(m.ack || 0); }
}
// Host: Simulation muss im Web Worker laufen (der Hauptthread wird im Hintergrund gedrosselt)
function ensureWorker() {
  if (triedWorker || localClient.mode === 'worker') return;
  triedWorker = true;
  const old = localClient;
  localClient = client = createSimClient(true, onLocal);
  setClient(client, () => { saveNow(); });
  old.idle();
}
// Spieler im Spielstand eintragen (Name, Farbe) – der Host schickt es an seine Simulation
// seat: Getrennte Inseln – freien Startplatz belegen (die Simulation ignoriert es bei „Gemeinsame Insel“)
function syncPlayer(pid, name, color) { if (NET_S.isHost()) localClient.send({ type: 'player', id: pid, name, color, seat: true }); }
// Getrennte Inseln: Beitritt nur mit freiem Startplatz; zählt auch Spieler, die gerade erst beigetreten sind (Startplatz noch unterwegs)
function canJoin(pid) {
  const H = game.state && game.state.homes;
  if (!H || !isSep(game)) return { ok: true };
  if (H.some(h => h.pid === pid)) return { ok: true };
  const waiting = NET_S.playerList().filter(p => p.pid !== pid && p.status !== 'gone' && !H.some(h => h.pid === p.pid)).length;
  return H.filter(h => !h.pid).length - waiting > 0 ? { ok: true } : { ok: false, n: H.length };
}
NET_S.setHooks({
  cmd: (pid, cmds, seq) => localClient.sendAs(pid, cmds, seq),
  addView: (pid) => localClient.post({ type: 'addView', pid }),
  dropView: (pid) => localClient.post({ type: 'dropView', pid }),
  view: (pid, rect, sel) => localClient.post({ type: 'view', pid, rect, sel }),
  busy: (pid, busy) => localClient.post({ type: 'busy', pid, busy }),
  player: syncPlayer,
  canJoin,
  slotOf: (pid) => { const h = game.state && isSep(game) ? homeOf(game, pid) : null; return h ? h.slot : null; },
  known: (pid) => { const p = game.state && game.state.players && game.state.players[pid]; return p ? { name: p.name, color: p.color } : null; },
  ask: (p) => askJoin(p),
  world: (m) => { becomeGuest(); remoteWorld(game, m); worldGot++; },
  snap: (m) => { if (client === remote && remote) guestSnap(m); },
  start: () => { if (guestReady && !started) play(null, true); },
  ended: (text) => { leaveGuest(); toTitle(); if (text) askInfo('Koop beendet', esc(text), 'Verstanden'); },
  localState: () => localPeerState(started && !ui.menu),
  localView: () => ({ rect: viewRect(), sel: ui.selected >= 0 ? ui.selected : null })
});
setCoopApi({
  workerOk: () => localClient.mode === 'worker',
  async coopSaves() { return (await storage.list()).filter(m => m.coop); },
  // Lobby gründen: Welt laden (angehalten), Koop-Einstellungen eintragen, Vermittlung starten
  async host(world, opts) {
    let sl, json = null, seed = null, slots = null;
    if (world.kind === 'new') {
      if (!(await storage.canCreate())) return { ok: false, msg: `Ohne IndexedDB passen höchstens ${storage.limit} Spielstände in den Browser. Lösche zuerst einen.` };
      sl = { id: newId(), name: world.name, playTime: 0, coop: true }; seed = world.seed;
      if (opts.mode === 'separate') slots = opts.slots || 2;
    } else {
      const [j, meta] = await Promise.all([storage.load(world.id), storage.meta(world.id)]);
      if (!j || !meta) return { ok: false, msg: 'Spielstand nicht gefunden.' };
      sl = { id: world.id, name: meta.name, playTime: meta.playTime || 0, coop: true }; json = j;
      if ((meta.mode || 'shared') !== opts.mode) return { ok: false, msg: 'Der Modus dieses Spielstands steht fest.' };
      slots = meta.slots || null;
    }
    ensureWorker();
    const loading = enterGame(sl, json, seed, true, slots && !json ? { slots } : null);
    // Reihenfolge in der Simulation: erst die Welt, dann diese Kommandos, dann „angehalten“ bis zum Spielstart
    localClient.send({ type: 'coopSetup', mode: opts.mode, demolish: !!opts.demolish, fresh: !json });
    localClient.setSpeed(1, true);
    if (!(await loading)) return { ok: false, msg: 'Dieser Spielstand ist beschädigt und kann nicht geladen werden.' };
    lobbySlot = sl;
    NET_S.startHost({ mode: opts.mode, demolish: !!opts.demolish, worldName: sl.name, slots: opts.mode === 'separate' ? (slots || (game.state.homes ? game.state.homes.length : null)) : undefined });
    return { ok: true };
  },
  async join(code) { const r = await NET_S.joinHost(code); if (r.ok) becomeGuest(); return r; },
  async joinManual(offer) { const a = await NET_S.joinManual(offer); return { code: a.code, cancel: a.cancel, done: a.done.then(r => { if (r.ok) becomeGuest(); return r; }) }; },
  start() {
    if (!NET_S.isHost() || !lobbySlot) return;
    const sl = lobbySlot; lobbySlot = null;
    ui.speed = 1; ui.halt = false; localClient.setSpeed(1, false);
    play(sl, sl.playTime > 0);
    NET_S.hostStart();
  },
  leave() { leaveSession(); },
  // Vorgabe „Mitspieler dürfen meine Gebäude abreißen“ aus der Lobby (gilt für alle, jeder kann sie später ändern)
  setDemolish(v) { localClient.send({ type: 'coopSetup', demolish: !!v, fresh: true }); }
});
// Sitzung verlassen (Mitspieler) bzw. beenden (Host, speichert vorher), zurück zum Titelbildschirm
async function leaveSession() {
  if (NET_S.isHost() && started) await saveNow();
  lobbySlot = null;
  NET_S.endSession(null, true);
  leaveGuest();
  toTitle();
}

const APP = {
  current: () => slot,
  async continueGame() { const id = await storage.last(); if (id) APP.loadSlot(id); },
  startNew(name, seed) { enterGame({ id: newId(), name, playTime: 0 }, null, seed); },
  async loadSlot(id) {
    if (started && slot && slot.id === id) return;
    const [json, meta] = await Promise.all([storage.load(id), storage.meta(id)]);
    if (!json || !meta) { toast('Spielstand nicht gefunden.'); return; }
    enterGame({ id, name: meta.name, playTime: meta.playTime || 0, coop: !!meta.coop }, json, null);
  },
  save: () => saveNow(),
  async toMainMenu() { if (NET_S.active()) { leaveSession(); return; } await saveNow(); toTitle(); },
  async exportSlot(id) {
    if (started && slot && slot.id === id) await saveNow();
    const [json, meta] = await Promise.all([storage.load(id), storage.meta(id)]);
    if (!json) { toast('Spielstand nicht gefunden.'); return; }
    let text = json;
    try { const o = JSON.parse(json); o.name = meta ? meta.name : undefined; text = JSON.stringify(o); } catch (e) { /* unverändert */ }
    download(`tideworks-save-${today()}.json`, text);
  },
  async importFile(text, fileName) {
    const s = parseSave(text);
    if (!s) return isOldSave(text) ? 'Dieser Spielstand gehört zur alten Welt (vor dem Umbau) und kann nicht geladen werden.' : 'Diese Datei ist kein gültiger Tideworks-Spielstand.';
    if (!(await storage.canCreate())) return `Ohne IndexedDB passen höchstens ${storage.limit} Spielstände in den Browser. Lösche zuerst einen.`;
    const name = String(s.name || fileName.replace(/\.json$/i, '') || 'Importiert').replace(/\s+/g, ' ').trim().slice(0, 32);
    const ok = await storage.write(newId(), JSON.stringify(s), { name, created: Date.now(), played: Date.now(), playTime: Math.round(s.time || 0), islands: saveIslands(s) || 1, v: SAVE_VERSION });
    return ok ? `„${esc(name)}“ importiert.` : 'Import fehlgeschlagen (Speicher voll?).';
  },
  // Testmodus: alles erforschen und Lager auffüllen
  unlock() {
    client.send({ type: 'unlockAll' });
    saveGame();
    afterSync(() => renderAllUI(true));
    toast(`${img(SPR.icon.star, 2)}<span><b>Testmodus:</b> alles erforscht, Inselinventar jeder Insel mit Kontor bis zur Kapazität aufgefüllt (Pläne je 100), +1.000 Ruhm, +50.000 Münzen.</span>`, 'gold');
  },
  coop() { openCoop(); }
};

const today = () => { const d = new Date(), p2 = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Start ---------- */
async function boot() {
  buildSprites();
  drawLogo($('logo')); setFavicon();
  const { legacy } = await storage.init();
  localClient = client = createSimClient(USE_WORKER, onLocal);
  setClient(client, () => { saveNow(); });
  setApp(APP); wireMenus(); wireChat(); wireMarks();
  initView();
  debugApi();
  requestAnimationFrame(frame);
  toTitle();
  // Link mit #join=TIDE-XXXX: direkt zu „Beitreten“
  const jm = location.hash.match(/join=([A-Za-z0-9-]+)/);
  if (jm) { const code = NET_S.parseCode(jm[1]); if (code) openCoop(code); }
  // Stand der alten, festen Karte: als Datei exportieren
  if (legacy) {
    const oldV = isOldSave(legacy);
    await askInfo('Alter Spielstand', 'Die Welt wurde komplett neu aufgebaut. Ein Spielstand der alten, festen Karte kann nicht übernommen werden. Er wird jetzt als Datei exportiert.', 'Verstanden');
    download(`tideworks-alter-spielstand-v${oldV}-${today()}.json`, legacy);
  }
  if (!storage.ok) toast('Hinweis: Der Browser blockiert das Speichern – Spielstände bleiben nicht erhalten.');
}
// Karte, Kamera und Zeichnen (einmal, auch für den Titelbildschirm)
function initView() {
  const canvas = $('world');
  initCamera(canvas); initRenderer(canvas);
  resize();
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', () => { saveFromMirror(); NET_S.endSession(null, true); });
  // Verstecktes Fenster: Einzelspieler hält an. Koop: der Host rechnet weiter (Mitspieler warten sonst), beim Mitspieler läuft ohnehin keine Simulation
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { saveFromMirror(); if (!NET_S.active()) client.pause(); } else client.resume();
  });
}
// Oberfläche des Spiels (einmal, beim ersten Betreten eines Spielstands)
function wireGame() {
  wired = true;
  $('zoomIn').innerHTML = img(SPR.icon.plus, 2);
  $('zoomOut').innerHTML = img(SPR.icon.minus, 2);
  $('goHome').innerHTML = img(SPR.icon.house, 2);
  wireTooltips(); wirePanels(); wireHud(); wireHotbar(); wireSpeed(); wireBuildMenu(); wireInventory(); wireWindows(); wireInput(); wireMinimap();
  $('followTag').addEventListener('click', () => stopFollow());
  wireLayout();
  loadLibrary();
  setInterval(() => { if (started) renderAllUI(false); }, 500);
  // Für Tests in der Konsole (siehe README „Debug-Funktionen“); window.workscape bleibt als Alias
  Object.assign(window.tideworks, {
    slot: () => slot,
    save: () => saveNow(),
    menu: () => APP.toMainMenu(),
    info: () => worldInfo(),
    check: (t, x, y) => checkPlace(game, t, x, y),
    tp: (x, y) => { centerOnTile(x + 0.5, y + 0.5); return camXY(); },
    reveal: (r = 40) => { const c = camXY(); client.send({ type: 'reveal', x: c.x, y: c.y, r }); return c; },
    islandAt: (x, y) => islandInfo(x, y),
    debugKontor: () => { const c = camXY(); client.send({ type: 'debugKontor', x: c.x, y: c.y }); return c; },
    giveShip: (kind) => { const c = camXY(); client.send({ type: 'giveShip', x: c.x, y: c.y, kind }); return c; },
    finds: (r = 60) => { const c = camXY(); return findsNear(game.W, c.x, c.y, r).filter(f => lootLeft(game.state.loot, f)).map(f => ({ x: f.x, y: f.y, kind: f.kind, items: lootLeft(game.state.loot, f), seen: !!game.fog.get(f.x, f.y) })); },
    tree: () => skilltreeDebug(),
    // Freischaltungen (data/unlocks.js): Debug „Alles freischalten“, einen Schlüssel freischalten oder sperren, Übersicht
    unlockAll: () => { client.send({ type: 'devUnlock' }); return true; },
    unlock: (key, src = 'debug') => { if (!UNLOCK_KEYS.includes(key)) return UNLOCK_KEYS; client.send({ type: 'unlock', key, src }); return key; },
    relock: (key) => { client.send({ type: 'relock', key }); return key; },
    // Leuchtturm (0.18.0): wonder() = Zustand, wonder(2) = 2 Stufen fertig, wonder(2, 'fire') dazu den Story-Auslöser wonder:2 (cs_licht_im_wind),
    // wonder(1, 'site') = Stufe 1 fertig und Baustelle für Stufe 2 mit allen Waren (Bauzeit läuft), 'half' = mit der Hälfte der Waren
    wonder: (n, opt) => {
      if (n == null) return JSON.parse(JSON.stringify(game.state.wonder));
      client.send({ type: 'wonderDebug', n, fire: opt === 'fire', site: opt === 'site' ? 'full' : opt === 'half' ? 'half' : null }); return n;
    },
    // Taucherglocke (0.19.0, nur Host): dive() = Zustand, dive('parts') beide Teile ins Lager der Heimatinsel, dive('mount', id) Glocke ohne Kosten an Schiff id
    // (ohne id das erste), dive('spot') Spot sofort (in der Nähe der Kamera, sonst zufällig), dive('story', 'karte' | 'pumpwerk') nächster Spot als Story-Spot,
    // dive('reset') alles zurück, dive('over') Taucherschiff direkt über den Spot setzen
    dive: (op, arg) => {
      if (op == null) return JSON.parse(JSON.stringify(game.state.dive));
      const c = camXY();
      client.send({ type: 'diveDebug', op, ship: op === 'mount' ? arg : undefined, find: op === 'story' ? arg : undefined, n: op === 'count' ? arg : undefined, x: op === 'spot' ? c.x : undefined, y: op === 'spot' ? c.y : undefined });
      return op;
    },
    // Tauch-Minispiel (0.20.0): dive('count', n) Zähler erfolgreicher Tauchgänge (Karte der alten Welt nach DIVE_GAME.karteAfter),
    // dive('intro') nächster Tauchgang wieder mit cs_abstieg; diveTask('search'|'weld') Aufgabe des nächsten Tauchgangs erzwingen;
    // diveGame({ task, act, seed, weld: 'kiste'|'tuer', target, story: 'karte'|'pumpwerk', intro }) Probe ohne Host und ohne Beute; diveState() laufendes Spiel
    diveTask: (t) => setForceTask(t),
    diveGame: (o) => { debugDiveGame(o); return true; },
    diveState: () => diveGameState(),
    // Völker (Version 17): Ruf setzen (nur Host), Zustand ansehen
    rep: (npc, n) => { if (!NPC_ISL[npc]) return Object.keys(NPC_ISL); client.send({ type: 'npcRep', npc, n }); return n; },
    npc: (id) => id ? game.state.npc && game.state.npc[id] : game.state.npc,
    dock: (npc, ship) => { client.send({ type: 'debugDock', npc, ship }); const k = game.W.npcIsl(npc), I = k >= 0 ? game.W.island(k) : null; if (I) centerOnTile(I.kontor ? I.kontor.x + 1.5 : I.x, I.kontor ? I.kontor.y + 1.5 : I.y); return npc; },
    time: (h) => { client.send({ type: 'debugTime', h }); return h; },
    unlocks: () => UNLOCK_KEYS.map(k => ({ key: k, name: unlockName(k), src: srcOf(k).src, npc: srcOf(k).npc, on: game.state.unl[k] || null })),
    // Insel unter der Kamera (über dem Meer die zuletzt besuchte), isl = bestimmte Insel
    give: (n = 200, items = Object.keys(ITEMS), isl) => { const k = isl != null ? isl : ui.camIsl >= 0 ? ui.camIsl : ui.viewIsl; client.send({ type: 'give', n, items, isl: k }); return k; },
    cargo: (id, it, n) => { const s0 = game.state.ships[0]; client.send({ type: 'cargo', ship: id == null && s0 ? s0.id : id, it, n }); return true; },   // id null = erstes Schiff
    // Rohrnetze (Spiegel): Inhalt, Durchsatz, Rohre, angeschlossene Gebäude
    nets: () => pipeNets(game).nets.map(n => ({ rep: n.rep, isl: n.isl, fluid: n.fluid, amt: +n.amt.toFixed(1), cap: n.cap, flow: +n.flow.toFixed(2), rate: n.rate, pipes: n.pipes, tanks: n.tanks.length, acidOk: n.acidOk, bs: n.bs.map(id => game.blds.get(id).t) })),
    // Endgame: Ereignis sofort auslösen (warn = erst ankündigen), Münzen geben, Händler sofort schicken
    event: (id, warn = false) => { if (!EVENTS[id]) return Object.keys(EVENTS); client.send({ type: 'event', kind: id, warn }); return id; },
    coins: (n = 1000) => { client.send({ type: 'coins', n }); return n; },
    damage: (id) => { client.send({ type: 'damage', id }); return id; },
    mods: () => Object.assign({}, mods(game)),
    trader: (kind = 'hafen', isl) => { client.send({ type: 'trader', kind, isl }); return kind; },
    chunks: () => Object.assign({ world: game.W.stats(), fogChunks: game.fog.m.size, treeChunks: game.tree.m.size }, imageCounts(), { render: Object.assign({}, renderStats) })
  });
}
const pendingCount = () => pending.length;
// Ab dem Start verfügbar (auch im Hauptmenü): Spiegel, Koop-Verbindungen und Debug-Schalter
function debugApi() {
  window.tideworks = window.workscape = {
    game, ui, cam,
    get client() { return client; },
    // Koop: Verbindungen, Ping, Datenmengen (KB, KB/s je Mitspieler)
    net: () => Object.assign(NET_S.netInfo(), { marks: NET_S.liveMarks().length, pending: pendingCount() }),
    // Koop-Debug: { blockPeer: true } = Vermittlung „nicht erreichbar“, { server: '127.0.0.1:9000' } = eigener PeerServer, { fakeVersion: 'x' } = andere Version; null-Werte löschen
    netDebug: (o) => o ? setNetDebug(o) : Object.assign({}, netDebug),
    netDrop: () => NET_S.dropConn(),
    // Geschichte: story() = Zustand, story(3) = Akt 3 setzen, story('fire', 'find:karte'), story('step', 'akt1_ende'), story('flag', 'npc_ole'), story('reset'), story('on')
    story: (op, arg) => {
      if (op == null) return game.state.story && JSON.parse(JSON.stringify(game.state.story));
      const c = typeof op === 'number' ? { op: 'act', n: op } : op === 'fire' ? { op, on: arg } : op === 'step' ? { op, id: arg } : op === 'flag' ? { op, flag: arg } : { op };
      client.send(Object.assign({ type: 'storyDebug' }, c)); return c;
    },
    // Cutscene oder Dialog zeigen (nur hier, ohne Wirkung): cs('cs_npc_ole') abspielen, cs('cs_npc_ole', 12.5) Bild bei 12,5 s
    // (ab Szenenlänge: Dialogzeile), dialog('ole_1') abspielen, dialog('ole_1', 3) Zeile 3 zeigen; csTimes() = Vorbereitung je Szene (ms)
    cs: (id, t) => debugScene(id, t), dialog: (id, n) => debugDialog(id, n), csTimes: () => setupTimes(),
    // Finale direkt (seit 0.22.0, nur Host): Akt 5, Leuchtturm Stufe 4, dann cs_wahrheit und die Entscheidung; eine schon getroffene Entscheidung wird zurückgesetzt
    finale: () => { client.send({ type: 'storyDebug', op: 'act', n: 5 }); client.send({ type: 'wonderDebug', n: 4 }); client.send({ type: 'storyDebug', op: 'step', id: 'finale' }); return true; },
    // Ende direkt setzen (0.23.0, nur Host, endgültig: vorher eine Kopie des Spielstands speichern): Szene, Dialog und Folgen
    ending: (c) => { if (c !== 'a' && c !== 'b') return 'tideworks.ending(\'a\') oder tideworks.ending(\'b\')'; client.send({ type: 'storyDebug', op: 'act', n: 5 }); client.send({ type: 'wonderDebug', n: 4 }); client.send({ type: 'storyDebug', op: 'ending', c }); return c; },
    endingInfo: () => endingInfo(game),
    // Relikte (0.24.0, nur Host): relicsAll() legt jedes Relikt, das es noch nicht gibt, in die Sammlung (auch die End-Relikte);
    // pearls(n) legt n Perlen (Standard 50) und je halb so viele Korallen und Muscheln ins Inselinventar der Insel unter der Kamera;
    // relics() listet die Sammlung (id, Sockel, Insel, ruht)
    relicsAll: () => { client.send({ type: 'relicDebug', op: 'all' }); return true; },
    pearls: (n) => { client.send({ type: 'relicDebug', op: 'pearls', n: n | 0, isl: curIsl() >= 0 ? curIsl() : undefined }); return true; },
    relics: () => (game.state.relics ? game.state.relics.list : []).map(e => ({ u: e.u, id: e.id, at: e.at, isl: e.isl, off: !!e.off, pick: e.pick || null }))
  };
}
const camXY = () => ({ x: Math.floor(cam.x / TS), y: Math.floor(cam.y / TS) });
// Insel der Zelle, in der (x, y) liegt: Typ, Ring, Radius, Vorkommen (Anzahl Felder)
function islandInfo(x, y) {
  const I = game.W.islandNear(Math.floor(x), Math.floor(y));
  if (!I) return null;
  return { id: I.id, cell: [I.cx, I.cy], type: I.type, typeName: ISL_TYPES[I.type].name, ring: I.ring, dist: I.dist, r: I.r, center: [I.x, I.y], tiles: I.tiles,
    ores: I.ores, kontorSpot: I.kontor, found: !!game.state.found[I.id] };
}
function worldInfo() {
  return { seed: game.state.seed, islandsWithData: Object.keys(game.state.isl).map(Number), found: Object.keys(game.state.found).length, buildings: game.blds.size, mode: client.mode, storage: storage.kind, ores: ORES.filter(Boolean).map(o => o.id) };
}
boot();
