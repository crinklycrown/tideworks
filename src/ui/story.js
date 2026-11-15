/* =========================================================
   GESCHICHTE IN DER OBERFLÄCHE (Daten: data/story.js, data/dialogs/, Simulation: sim/story.js)
   onStory(ev) spielt ein Story-Ereignis ab: Dialog pre, Cutscene cs mit Dialog dialog danach, bei choice die Entscheidung.
   Cutscenes laufen im Player (cutscene/player.js, Szenen in src/cutscenes/), Dialoge im Dialogfenster (ui/dialog.js).
   Szenen ohne Modul (noch nicht gebaut) zeigen kurz ihren Titel als Meldung, danach kommt der Dialog über der Karte.
   Während einer Cutscene und ihres Dialogs hält der Host (oder Einzelspieler) die Simulation an; nur er kann überspringen,
   im Koop springen dann alle in den Dialog (net/session.js csShare). Den Dialog liest jeder in seinem Tempo.
   Der Host (oder Einzelspieler) meldet gesehene Szenen und Dialoge mit { type: 'storySeen', ids } an die Simulation;
   Mitspieler setzen nichts. Wiederholen (Menü „Szenen“, replayScene) ist nur lokal und hält nichts an.
   Ereignisse warten, solange Titel, Pausenmenü, ein Fenster oder eine andere Szene offen ist.
   ========================================================= */
import { CUTSCENES, CHOICES, ACTS, actGoal } from '../data/story.js';
import { ENDINGS } from '../data/npctrade.js';
import { RELICS } from '../data/relics.js';
import { fxLines } from '../sim/relics.js';
import { ITEMS } from '../data/items.js';
import { npcName } from '../data/npcs.js';
import { img, fitScale } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { esc } from '../util/format.js';
import { game, ui, $, send, saveGame, simClient } from './context.js';
import { toast } from './toasts.js';
import { showDialog as runDialog } from './dialog.js';
import { playScene, hasScene, skipScene, seekScene, sceneBg, reducedMotion } from '../cutscene/player.js';
import { stageOpen, stageClose, stageSet, stageScene, stageBlit, stageCtx, stageMode, stageText } from '../cutscene/stage.js';
import { wonderFull, wonderShare } from '../sim/wonder.js';
import { invOf, homeIsl } from '../sim/state.js';
import { BELL_PARTS } from '../data/dive.js';
import { closeChat } from './chat.js';
import * as NET_S from '../net/session.js';

const canDecide = () => !NET_S.isGuest();
const SKIP_KEEP = 30000;    // Koop: Überspringen des Hosts gilt so lange für eine Szene, die hier noch wartet (ms)

// Platzhalter für Szenen ohne Modul: Titel als Meldung
function placeholder(id) {
  toast(`${img(SPR.icon.book, 2)}<span><span class="xs muted">Szene</span><br><b>${esc(CUTSCENES[id] || id)}</b></span>`, 'gold', true);
}
// Szene id abspielen, danach den Dialog (dialog: Id, null = keiner, undefined = der Dialog der Szene). story = Teil der Geschichte (Koop: Host steuert)
// hold: das letzte Bild bleibt nach dem Dialog stehen (Finale: danach die Entscheidung)
export function playCutscene(id, dialog, story, hold) {
  if (!hasScene(id)) { placeholder(id); return dialog ? showDialog(dialog) : Promise.resolve(); }
  endChat();
  const guest = story && NET_S.isGuest();
  return playScene(id, {
    dialog, hold: !!hold, canSkip: !guest, note: 'Nur der Host kann überspringen',
    skipNow: guest && performance.now() - (skipped.get(id) || -1e9) < SKIP_KEEP,
    onSkip: () => { if (story && NET_S.isHost()) NET_S.csShare('skip', id); }
  });
}
// Dialog id im Dialogfenster über der Karte
export const showDialog = (id) => { endChat(); return runDialog(id); };
const endChat = () => { if ($('chat').classList.contains('typing')) closeChat(); };   // Koop: offene Chat-Eingabe schließen

// Koop (Mitspieler): Host hat übersprungen
const skipped = new Map();
NET_S.on('cs', (m) => { if (m.op === 'skip' && !skipScene(m.id)) skipped.set(m.id, performance.now()); });

// Warteschlange: Story-Ereignisse nacheinander abspielen, erst wenn nichts anderes offen ist (Titel, Pausenmenü, Fenster, Szene)
const queue = [];
let busy = false, gen = 0;
const free = () => !ui.menu && !ui.pause && !ui.cine && $('modal').classList.contains('hidden');
function next() {
  const job = queue.shift();
  if (!job) { busy = false; return; }
  busy = true;
  const my = gen;
  const go = () => {
    if (my !== gen) return;
    if (!free()) { setTimeout(go, 250); return; }
    job(() => { if (my === gen) next(); });
  };
  go();
}
const enqueue = (job) => { queue.push(job); if (!busy) next(); };
export const storyBusy = () => busy;
// fn, sobald keine Szene und kein Story-Dialog mehr läuft oder wartet (z. B. Willkommens-Hinweis nach dem Prolog)
export function afterStory(fn) { const my = gen; const go = () => { if (my !== gen) return; if (busy || !free()) { setTimeout(go, 250); return; } fn(); }; setTimeout(go, 0); }
// Zurück zum Titel (auch Koop-Sitzung beendet): Warteschlange leeren, laufende Szene bzw. Dialog schließen
export function stopStory() {
  gen++; queue.length = 0; busy = false; skipScene(); stageClose();
  choiceWait = null; const el = document.getElementById('cineChoice'); if (el) { el.hidden = true; el.innerHTML = ''; el.onclick = null; }
}

export function onStory(ev) {
  if (ev.ending && choiceWait) choiceWait(ev.ending);   // Koop-Mitspieler: der Host hat entschieden
  enqueue(async done => {
    const seen = [], film = !!ev.cs && hasScene(ev.cs), halt = film && canDecide(), finale = !!ev.choice;
    if (halt) simClient().setSpeed(ui.speed, true);   // Szene hält die Simulation an (Koop: für alle); im Finale bis zur Entscheidung
    try {
      if (ev.pre) { seen.push(ev.pre); await showDialog(ev.pre); }
      if (ev.cs) { seen.push(ev.cs); if (ev.dialog) seen.push(ev.dialog); await playCutscene(ev.cs, ev.dialog || null, true, finale && film); }
      else if (ev.dialog) { seen.push(ev.dialog); await showDialog(ev.dialog); }
    } catch (e) { console.error('Szene/Dialog', e); }
    if (seen.length && canDecide()) send({ type: 'storySeen', ids: seen });
    if (ev.unlock && ev.unlock.includes('leuchtturm')) toast(`${img(SPR.b.leuchtturm[4], fitScale(SPR.b.leuchtturm[4], 40))}<span><b>Bauplan erhalten: Weltenleuchtturm.</b> Baue ihn auf deiner Heimatinsel (Bauen &rarr; Schifffahrt).</span>`, 'gold', true);
    if (ev.unlock && ev.unlock.includes('glocke')) toast(`${img(SPR.icon.glocke, 2)}<span><b>Bauplan erhalten: Taucherglocke.</b> Kauf das Glockenseil bei Ole und die Messingglocke bei Brann. Montiert wird sie in der Werft.</span>`, 'gold', true);
    if (ev.id === 'akt3_ende') toast(`${img(SPR.b.leuchtturm[4], fitScale(SPR.b.leuchtturm[4], 40))}<span><b>Leuchtturm Stufe 3 freigeschaltet: die Lampenkammer.</b> Eröffne die Baustelle im Turm.</span>`, 'gold', true);
    if (STARTS[ev.id] && ACTS[ev.act]) toast(`${img(SPR.icon.book, 2)}<span><b>Akt ${ev.act}: ${ACTS[ev.act].name}</b></span>`, 'gold', true);
    if (ev.ending) endingToasts(ev.ending);
    saveGame();   // im Finale: automatisch speichern, bevor die Entscheidung fällt
    if (finale) { await decide(ev.cs); if (halt) simClient().setSpeed(ui.speed, ui.halt); done(); return; }
    if (halt) simClient().setSpeed(ui.speed, ui.halt);
    done();
  });
}
// Nach dem Ende (0.23.0): was sich geändert hat (sim/ending.js) und das End-Relikt (seit 0.24.0 in der Reliktsammlung)
function endingToasts(c) {
  const E = ENDINGS[c], R = E && RELICS[E.relic];
  toast(`${img(SPR.icon.book, 2)}<span><b>Die Geschichte ist erzählt.</b> ${esc(actGoal(game.state.story, {}))} Das Spiel geht frei weiter.</span>`, 'gold', true);
  toast(c === 'a'
    ? `${img(SPR.npc.fig.rat, 2)}<span><b>Der Goldberg gehört dir.</b> Dein Hauptkontor steht an Aurels altem Steg, seine Villen sind Brandruinen. Der Inselrat handelt jetzt am Goldberg. Ole und Brann geben dir bessere Preise, und ihre Dörfer feiern ein Fest.</span>`
    : `${img(SPR.npc.fig.aurel, 2)}<span><b>Aurels Insel gehört dir</b>, mit allen Gebäuden und einem Hauptkontor. Pfahldorf und Werkstattbucht liegen in Ruinen, dort handelt niemand mehr.</span>`, 'gold', true);
  if (R) toast(`${img(SPR.relic[E.relic], 3)}<span><b>${esc(R.name)}</b> (legendäres Relikt) liegt in deiner Reliktsammlung (L): ${esc(fxLines(R.fx).join(', '))}. Setz es in einen Goldenen Sockel.</span>`, 'gold', true);
}
// Gesehene Szene erneut abspielen (Menü „Szenen“, Debug): nur hier, ohne Wirkung auf das Spiel
export function replayScene(id) { return playCutscene(id, undefined, false); }
// Debug: Szene abspielen bzw. mit t ein Bild prüfen (t ≥ Länge: Dialogzeile), Dialog abspielen bzw. Zeile n zeigen
export function debugScene(id, t) { if (t != null) return seekScene(id, +t); replayScene(id); return true; }
export function debugDialog(id, n) { if (n != null) return runDialog(id, { seek: +n }); return showDialog(id); }
// Schritte, die einen neuen Akt beginnen (für die Akt-Meldung)
const STARTS = { akt1_ende: 1, akt2_ende: 1, akt3_ende: 1, akt4_ende: 1 };

// Gespräch ohne Story-Schritt (Dialog über der laufenden Karte)
export function onTalk(ev) { enqueue(done => { showDialog(ev.dialog).then(done, done); }); }

/* ---------- Die Entscheidung am Leuchtturm (seit 0.22.0) ----------
   Das letzte Bild von cs_wahrheit bleibt stehen (dialogBg: die Fackel vor der dunklen Lampe, Aurel im Hintergrund), darüber
   zwei Knöpfe im Stil der Spiel-UI. Kein Zeitdruck. Ein Klick fragt nach („Diese Entscheidung ist endgültig.“ Abbrechen / Bestätigen),
   Bestätigen schickt storyChoice an die Simulation (state.story.choice, gespeichert). Vorher ist automatisch gespeichert worden.
   Koop: nur der Host entscheidet; Mitspieler sehen „Der Host entscheidet …“ und danach das Ergebnis.
   Ohne Entscheidung beendet (Spiel verlassen, Neu laden): beim nächsten Laden geht es wieder hierher (resumeStory). */
let choiceWait = null;                       // Mitspieler: wartet auf das Ergebnis des Hosts
const RESULT_MS = 3200;                      // so lange sieht der Mitspieler das Ergebnis
function choiceEl() {
  let el = document.getElementById('cineChoice');
  if (!el) {
    el = document.createElement('div'); el.id = 'cineChoice'; el.className = 'cine-ov cine-choice'; el.hidden = true;
    $('cineStage').appendChild(el);
  }
  return el;
}
// Standbild halten: Handler, der das letzte Bild der Szene weiter zeichnet (Flamme und Regen bewegen sich)
function holdFrame(id, keys) {
  const bg = sceneBg(id), t0 = performance.now() / 1000;
  stageSet({
    frame(now) { const sc = stageScene(); if (bg) bg(sc, now - t0, now); else { sc.fillStyle = '#000'; sc.fillRect(0, 0, 320, 180); } stageBlit(stageCtx()); },
    advance() { const a = document.activeElement; if (a && a.closest && a.closest('#cineChoice button')) a.click(); },
    skip() { if (keys && keys.esc) keys.esc(); }
  });
  stageText(null, '');
}
function decide(id) {
  const el = choiceEl(), keys = {};
  if (stageMode() !== 'film') stageOpen('film', { frame() {}, advance() {}, skip() {} });   // ohne gehaltenes Bild (Szene fehlt): schwarz
  holdFrame(id, keys);
  const close = (resolve) => { el.hidden = true; el.innerHTML = ''; stageClose(resolve, !reducedMotion()); };
  return new Promise(resolve => {
    if (!canDecide()) {
      // Mitspieler: warten, dann das Ergebnis zeigen
      const show = (c) => {
        choiceWait = null; clearInterval(poll);
        el.innerHTML = `<div class="cine-choice-box"><div class="cine-choice-q">Der Host hat entschieden:</div><div class="cine-choice-r">${esc(CHOICES[c] ? CHOICES[c].label : c)}</div></div>`;
        setTimeout(() => close(resolve), RESULT_MS);
      };
      el.innerHTML = `<div class="cine-choice-box"><div class="cine-choice-q">Der Host entscheidet …</div></div>`;
      el.hidden = false;
      const S = game.state.story;
      if (S && S.choice) { show(S.choice); return; }
      choiceWait = show;
      const poll = setInterval(() => { const S2 = game.state.story; if (S2 && S2.choice && choiceWait) show(S2.choice); }, 500);
      return;
    }
    const ask = () => {
      keys.esc = null;
      el.innerHTML = `<div class="cine-choice-box"><div class="cine-choice-btns">${Object.entries(CHOICES).map(([k, C]) => `<button type="button" class="btn ${k === 'a' ? 'btn-green' : 'btn-paper'}" data-c="${k}">${esc(C.label)}</button>`).join('')}</div></div>`;
      el.hidden = false;
    };
    const confirm = (c) => {
      keys.esc = ask;
      el.innerHTML = `<div class="cine-choice-box"><div class="cine-choice-q">Diese Entscheidung ist endgültig.</div>
        <div class="cine-choice-btns"><button type="button" class="btn btn-paper" data-x="no">Abbrechen</button><button type="button" class="btn ${c === 'a' ? 'btn-green' : 'btn-red'}" data-x="yes" data-c="${c}">Bestätigen</button></div></div>`;
      el.querySelector('[data-x="yes"]').focus({ preventScroll: true });
    };
    el.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      e.stopPropagation();
      if (b.dataset.x === 'no') { ask(); return; }
      if (b.dataset.x === 'yes') { el.onclick = null; send({ type: 'storyChoice', c: b.dataset.c }); close(resolve); return; }
      if (b.dataset.c) confirm(b.dataset.c);
    };
    ask();
  });
}
// Nach dem Laden (auch Koop-Host nach dem Start): Finale gesehen, aber noch nicht entschieden → Aurels Satz noch einmal, dann das Standbild
export function resumeStory() {
  const S = game.state.story;
  if (!S || S.choice || !S.once || !S.once.finale || !canDecide()) return;
  enqueue(async done => {
    const halt = canDecide();
    if (halt) simClient().setSpeed(ui.speed, true);
    try {
      const bg = sceneBg('cs_wahrheit');
      if (bg) { await runDialog('wahrheit', { bg, keep: true }); await decide('cs_wahrheit'); }
    } catch (e) { console.error('Entscheidung', e); }
    if (halt) simClient().setSpeed(ui.speed, ui.halt);
    done();
  });
}

// Ein Schiff liegt an einem NPC-Steg (ohne Story-Schritt nur beim ersten Anlegen, sim/story.js storyTick)
export function onNpcArrive(ev) {
  const f = SPR.npc.fig[ev.npc], name = npcName(ev.npc);
  toast(`${f ? img(f, 2) : ''}<span><b>${esc(ev.ship)}</b> liegt an ${esc(name)}s Steg.${ev.step ? ` <b>Klick auf den Steg und sprich mit ${esc(name)}.</b>` : ` Klick auf den Steg, um mit ${esc(name)} zu sprechen.`}</span>`, ev.step ? 'gold' : '', !!ev.step);
}

// Story-Zeile für die Ziel-Karte: { act, name, goal } oder null (ohne Geschichte)
export function storyLine() {
  const S = game.state.story;
  if (!S) return null;
  let built = false;
  for (const b of game.blds.values()) if (b.t === 'leuchtturm') { built = true; break; }
  const W = game.state.wonder || {};
  const D = game.state.dive, inv = invOf(game, homeIsl(game));
  const ctx = { ship: game.state.ships.length > 0, wonder: W.ph | 0, wonderBuilt: built, site: W.pb | 0, full: wonderFull(W), share: wonderShare(W),
    bell: !!(D && D.bell), parts: Object.keys(BELL_PARTS).filter(it => (inv[it] || 0) > 0).length, spot: D && D.spot ? D.spot.kind : null };
  return { act: S.act, name: (ACTS[S.act] || ACTS[1]).name, goal: actGoal(S, ctx) };
}
