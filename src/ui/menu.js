/* =========================================================
   MENÜS: Titelbildschirm, „Neues Spiel“, „Spiel laden“ (Spielstand-Liste) und Pausenmenü
   Der Ablauf (Demo starten, Spiel laden, speichern) liegt in main.js und kommt über setApp() herein:
     app.current()          aktueller Spielstand { id, name } oder null (im Hauptmenü)
     app.continueGame()     zuletzt gespielten Spielstand laden
     app.startNew(name, seed)   neues Spiel in einem neuen Spielstand (seed: Zahl oder null = zufällig)
     app.loadSlot(id)       Spielstand laden (im Spiel wird vorher gespeichert)
     app.save()             jetzt speichern (Promise → true/false)
     app.toMainMenu()       speichern, zurück zum Titelbildschirm
     app.exportSlot(id)     Spielstand als Datei herunterladen
     app.importFile(text, fileName)  Datei als neuen Spielstand anlegen (Promise → Meldung oder '')
     app.unlock(), app.coop()
   ========================================================= */
import { GAME_VERSION } from '../config.js';
import { SPR } from '../gfx/sprites.js';
import { img } from '../gfx/pixelbuffer.js';
import { esc } from '../util/format.js';
import { storage } from '../save/storage.js';
import { ui, $, simClient, game, send } from './context.js';
import { askConfirm } from './modal.js';
import { showKeys } from './hotbar.js';
import { renderEvents } from './hud.js';
import { toast } from './toasts.js';
import { coop, active as coopActive, isHost, isGuest, myPid, joinLink, on as onNet } from '../net/session.js';
import { pauseCoopHTML, copyText, MODE_NAME } from './coop.js';
import { CUTSCENES } from '../data/story.js';
import { hasScene } from '../cutscene/player.js';
import { replayScene } from './story.js';

let app = null;
export function setApp(a) { app = a; }

/* ---------- Titelbildschirm ---------- */
export async function showTitle() {
  ui.menu = true;
  document.body.classList.add('menu');
  $('title').classList.remove('hidden');
  const cv = $('titleLogo'), L = SPR.logo;
  if (cv.width !== L.w) { cv.width = L.w; cv.height = L.h; cv.getContext('2d').drawImage(L.cv, 0, 0); }
  $('tVersion').textContent = `Version ${GAME_VERSION}`;
  const last = await storage.last(), meta = last ? await storage.meta(last) : null;
  $('tContinue').disabled = !meta;
  $('tContSub').textContent = meta ? meta.name : 'kein Spielstand';
}
export function hideTitle() {
  ui.menu = false;
  document.body.classList.remove('menu');
  $('title').classList.add('hidden');
}
export function wireMenus() {
  $('tContinue').addEventListener('click', () => app.continueGame());
  $('tNew').addEventListener('click', () => openNewGame());
  $('tLoad').addEventListener('click', () => openLoadList());
  $('tCoop').addEventListener('click', () => app.coop());
  $('pauseMenu').addEventListener('click', async e => {
    if (e.target === $('pauseMenu')) { closePause(); return; }
    // Koop: Code und Link kopieren
    const l = e.target.closest('[data-l]');
    if (l) {
      if (l.dataset.l === 'copyCode') toast((await copyText(coop.code)) ? 'Code kopiert.' : 'Kopieren nicht möglich.');
      if (l.dataset.l === 'copyLink') toast((await copyText(joinLink(coop.code))) ? 'Link kopiert.' : 'Kopieren nicht möglich.');
      return;
    }
    const b = e.target.closest('[data-pm]');
    if (!b) return;
    switch (b.dataset.pm) {
      case 'resume': closePause(); break;
      case 'save': toast((await app.save()) ? 'Gespeichert.' : 'Speichern fehlgeschlagen.'); break;
      case 'load': openLoadList(); break;
      case 'keys': showKeys(); break;
      case 'scenes': openScenes(); break;
      case 'unlock': app.unlock(); closePause(); break;
      case 'menu': closePause(true); app.toMainMenu(); break;
      case 'demolish': send({ type: 'setOpt', k: 'demolish', v: b.checked }); toast(b.checked ? 'Mitspieler dürfen deine Gebäude abreißen.' : 'Mitspieler dürfen deine Gebäude nicht mehr abreißen.'); break;
    }
  });
}

/* ---------- Pausenmenü: hält das Spiel an, solange es offen ist ---------- */
let pauseHalt = false;
// Koop: Der Host hält die Simulation nicht an („Das Spiel läuft weiter“), Mitspieler können weder speichern noch laden.
export function openPause() {
  if (ui.menu || ui.pause) return;
  ui.pause = true;
  pauseHalt = ui.halt;
  const co = coopActive();
  if (!co) simClient().setSpeed(ui.speed, true);
  const cur = app.current();
  $('pmSlot').textContent = cur ? cur.name : co ? `Koop bei ${(coop.players.get('host') || {}).name || 'Host'}` : '';
  $('pmTitle').innerHTML = `${img(SPR.icon.gear, 2)}${co ? 'Menü' : 'Pause'}`;
  renderEvents();
  renderPauseCoop();
  $('pauseMenu').classList.remove('hidden');
}
function renderPauseCoop() {
  const co = coopActive(), guest = isGuest(), pm = $('pauseMenu');
  const me = game.state && game.state.players && game.state.players[myPid()];
  $('pmCoop').innerHTML = co ? pauseCoopHTML(!!(me && me.opts && me.opts.demolish)) : '';
  $('pmCoop').classList.toggle('hidden', !co);
  pm.querySelector('[data-pm="resume"]').firstChild.textContent = co ? 'Zurück zum Spiel' : 'Fortsetzen';
  pm.querySelector('[data-pm="save"]').classList.toggle('hidden', guest);
  pm.querySelector('[data-pm="load"]').classList.toggle('hidden', co);
  pm.querySelector('[data-pm="unlock"]').classList.toggle('hidden', guest);
  pm.querySelector('[data-pm="scenes"]').classList.toggle('hidden', !(game.state && game.state.story));
  $('evModeRow').classList.toggle('hidden', guest);
  const mb = pm.querySelector('[data-pm="menu"]');
  mb.innerHTML = guest ? 'Sitzung verlassen<span class="tsub">deine Gebäude bleiben stehen</span>' : isHost() ? 'Hauptmenü<span class="tsub">speichert und beendet die Koop-Sitzung</span>' : 'Hauptmenü<span class="tsub">speichert vorher</span>';
}
onNet('update', () => { if (ui.pause) renderPauseCoop(); });
// keep = Tempo nicht wiederherstellen (Hauptmenü)
export function closePause(keep) {
  if (!ui.pause) return;
  ui.pause = false;
  $('pauseMenu').classList.add('hidden');
  if (!keep && !coopActive()) simClient().setSpeed(ui.speed, pauseHalt);
}

/* ---------- Szenen: gesehene Cutscenes erneut abspielen (nur hier, ohne Wirkung; „gesehen“ aus state.story.seen) ---------- */
export function openScenes() {
  const m = $('modal'), seen = (game.state.story && game.state.story.seen) || {}, ids = Object.keys(CUTSCENES), n = ids.filter(id => seen[id]).length;
  m.innerHTML = `<div class="panel modal" role="dialog" aria-modal="true"><div class="phead"><span>Szenen</span><button class="xbtn" data-sc="close">&times;</button></div>
    <div class="mb small col" style="gap:8px"><div class="xs muted">${n} von ${ids.length} Szenen gesehen. Klick, Leertaste oder Enter blättert weiter, Esc überspringt.</div>
      <div class="scene-list">${ids.map((id, i) => seen[id]
        ? `<div class="scene-row"><span class="pix grow">${i + 1}. ${esc(CUTSCENES[id])}</span>${hasScene(id) ? `<button class="btn btn-green btn-sm" data-sc="play" data-id="${id}">Ansehen</button>` : '<span class="xs muted">folgt bald</span>'}</div>`
        : `<div class="scene-row locked"><span class="pix grow">${i + 1}. ???</span><span class="xs muted">noch nicht gesehen</span></div>`).join('')}</div>
    </div></div>`;
  m.classList.remove('hidden');
  const close = () => { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  m.onclick = (e) => {
    if (e.target === m) { close(); return; }
    const b = e.target.closest('[data-sc]');
    if (!b) return;
    if (b.dataset.sc === 'close') { close(); return; }
    close();
    replayScene(b.dataset.id).then(() => { if (ui.pause) openScenes(); });
  };
}

/* ---------- Neues Spiel ---------- */
// „Inselwelt 1“, „Inselwelt 2“ … (erste freie Nummer)
async function nextName() {
  const names = new Set((await storage.list()).map(m => m.name));
  let n = 1;
  while (names.has(`Inselwelt ${n}`)) n++;
  return `Inselwelt ${n}`;
}
// Seed aus der Eingabe: leer = zufällig, Zahl = diese Zahl, sonst ein Hash des Textes
export function parseSeed(txt) {
  const t = String(txt || '').trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t) % 2147483647;
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 2147483647;
}
export async function openNewGame() {
  if (!(await storage.canCreate())) { toast(`Dieser Browser speichert ohne IndexedDB höchstens ${storage.limit} Spielstände. Lösche zuerst einen unter „Spiel laden“.`); return; }
  const name = await nextName(), m = $('modal');
  m.innerHTML = `<div class="panel modal" role="dialog" aria-modal="true"><div class="phead"><span>Neues Spiel</span></div>
    <div class="mb small col" style="gap:10px">
      <label class="col" style="gap:3px"><span class="lbl">Name</span><input class="inp" id="ngName" maxlength="32" value="${esc(name)}" spellcheck="false" autocomplete="off"></label>
      <label class="col" style="gap:3px"><span class="lbl">Seed (optional)</span><input class="inp" id="ngSeed" maxlength="24" placeholder="leer = zufällige Welt" spellcheck="false" autocomplete="off"></label>
      <div class="xs muted">Gleicher Seed, gleiche Inselwelt. Der Spielstand wird als neuer Eintrag angelegt.</div>
    </div>
    <div class="mf"><button class="btn btn-sm" data-m="no">Abbrechen</button><button class="btn btn-green btn-sm" data-m="yes">Spiel starten</button></div></div>`;
  m.classList.remove('hidden');
  const done = (go) => {
    const nm = $('ngName').value.replace(/\s+/g, ' ').trim() || name, seed = parseSeed($('ngSeed').value);
    m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true);
    if (go) app.startNew(nm, seed);
  };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); done(true); } };
  document.addEventListener('keydown', onKey, true);
  m.onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) done(b.dataset.m === 'yes'); else if (e.target === m) done(false); };
  $('ngName').focus(); $('ngName').select();
}

/* ---------- Spiel laden: Liste der Spielstände ---------- */
const p2 = (n) => String(n).padStart(2, '0');
const when = (t) => { if (!t) return '–'; const d = new Date(t); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}, ${p2(d.getHours())}:${p2(d.getMinutes())} Uhr`; };
const dur = (s) => { const m = Math.floor((s || 0) / 60), h = Math.floor(m / 60); return h ? `${h} h ${m % 60} min` : `${m} min`; };
let renaming = null;
export async function openLoadList() {
  const m = $('modal');
  const list = await storage.list(), cur = app.current(), full = list.length >= storage.limit;
  m.innerHTML = `<div class="panel modal wide" role="dialog" aria-modal="true"><div class="phead"><span>Spiel laden</span><button class="xbtn" data-sl="close">&times;</button></div>
    <div class="mb small">
      <div class="row" style="gap:8px;margin-bottom:10px"><button class="btn btn-paper btn-sm" data-sl="import" ${full ? 'disabled' : ''}>Datei importieren</button>
        <span class="xs muted grow">${storage.kind === 'local' ? `Ohne IndexedDB: höchstens ${storage.limit} Spielstände.` : 'Eine exportierte Datei wird als neuer Spielstand angelegt.'}</span></div>
      <div class="slots-list scroll">${list.length ? list.map(s => slotRow(s, cur)).join('') : '<div class="muted">Noch keine Spielstände. Starte ein neues Spiel.</div>'}</div>
    </div></div>`;
  m.classList.remove('hidden');
  const close = () => { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true); renaming = null; };
  const onKey = (e) => {
    if (e.target.matches && e.target.matches('[data-ren]')) {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finishRename(e.target); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); renaming = null; openLoadList(); }
      return;
    }
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
  };
  document.addEventListener('keydown', onKey, true);
  const finishRename = async (inp) => {
    const nm = inp.value.replace(/\s+/g, ' ').trim();
    if (nm) { await storage.rename(inp.dataset.ren, nm); if (cur && cur.id === inp.dataset.ren) cur.name = nm; }
    renaming = null; document.removeEventListener('keydown', onKey, true); openLoadList();
  };
  m.onclick = async (e) => {
    if (e.target === m) { close(); return; }
    const b = e.target.closest('[data-sl]');
    if (!b || b.disabled) return;
    const id = b.dataset.id, meta = list.find(x => x.id === id);
    switch (b.dataset.sl) {
      case 'close': close(); break;
      case 'load': close(); app.loadSlot(id); break;
      case 'rename': renaming = id; document.removeEventListener('keydown', onKey, true); openLoadList(); break;
      case 'renOk': finishRename(m.querySelector('[data-ren]')); break;
      case 'export': app.exportSlot(id); break;
      case 'del': {
        document.removeEventListener('keydown', onKey, true);
        const ok = await askConfirm('Spielstand löschen?', `<b>${esc(meta ? meta.name : '')}</b> wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.`, 'Löschen');
        if (ok) await storage.remove(id);
        openLoadList();
        if (ok && ui.menu) showTitle();
        break;
      }
      case 'import': {
        const f = $('importFile');
        f.value = '';
        f.onchange = async () => {
          const file = f.files && f.files[0];
          if (!file) return;
          let text = '';
          try { text = await file.text(); } catch (err) { text = ''; }
          const msg = await app.importFile(text, file.name);
          if (msg) toast(msg);
          document.removeEventListener('keydown', onKey, true);
          openLoadList();
          if (ui.menu) showTitle();
        };
        f.click();
        break;
      }
    }
  };
  const ren = m.querySelector('[data-ren]');
  if (ren) { ren.focus(); ren.select(); }
}
function slotRow(s, cur) {
  const isCur = !!cur && cur.id === s.id;
  const name = renaming === s.id
    ? `<span class="row" style="gap:4px"><input class="inp" data-ren="${s.id}" maxlength="32" value="${esc(s.name)}" spellcheck="false" autocomplete="off"><button class="btn btn-green btn-sm" data-sl="renOk">OK</button></span>`
    : `<span class="pix sname">${esc(s.name)}</span>${isCur ? '<span class="xs good">aktuell</span>' : ''}`;
  return `<div class="slotrow${isCur ? ' cur' : ''}">
    <div class="sthumb">${s.thumb ? `<img src="${s.thumb}" alt="">` : img(SPR.logoIcon, 2)}</div>
    <div class="grow col" style="gap:2px;min-width:0">
      <div class="row" style="gap:6px">${name}${s.coop ? `<span class="coopmark" title="Koop-Spielstand">${img(SPR.icon.chat, 1)}Koop</span>` : ''}</div>
      ${s.coop ? `<div class="xs muted row" style="gap:4px;flex-wrap:wrap">${(s.players || []).map(p => `<span class="row" style="gap:3px"><span class="lsw sm" style="background:${esc(p.color)}"></span>${esc(p.name)}</span>`).join('')} &middot; ${MODE_NAME[s.mode || 'shared']}${s.mode === 'separate' && s.slots ? ` &middot; ${(s.players || []).length}/${s.slots} Spieler` : ''}</div>` : ''}
      <div class="xs muted">Zuletzt gespielt: ${when(s.played)}</div>
      <div class="xs muted">Spielzeit ${dur(s.playTime)} &middot; ${s.islands || 1} ${s.islands === 1 || !s.islands ? 'Insel' : 'Inseln'} mit Kontor</div>
    </div>
    <div class="sbtns">
      <button class="btn btn-green btn-sm" data-sl="load" data-id="${s.id}" ${isCur ? 'disabled' : ''}>Laden</button>
      <button class="btn btn-paper btn-sm" data-sl="rename" data-id="${s.id}">Umbenennen</button>
      <button class="btn btn-paper btn-sm" data-sl="export" data-id="${s.id}">Exportieren</button>
      <button class="btn btn-red btn-sm" data-sl="del" data-id="${s.id}" ${isCur ? 'disabled title="Der laufende Spielstand kann nicht gelöscht werden."' : ''}>Löschen</button>
    </div>
  </div>`;
}
export const menuOpen = () => ui.menu || ui.pause;
