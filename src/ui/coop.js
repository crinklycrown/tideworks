/* =========================================================
   KOOP-OBERFLÄCHE: Koop-Menü (Titelbildschirm), „Lobby gründen“, Lobby-Fenster, Beitritt (Code oder manuell),
   Beitrittsanfrage während des Spiels, Hinweis „Verbindung wird wiederhergestellt…“, Mitspieler im Pausenmenü.
   Der Ablauf (Welt laden, Simulation, Spiegel) liegt in main.js und kommt über setCoopApi() herein:
     api.host(world, opts)   world = { kind: 'new', name, seed } | { kind: 'load', id }; opts = { mode, demolish } → Promise<{ ok, msg }>
     api.join(code)          → Promise<{ ok, why, host }>   (Lobby-Code, über die Vermittlung)
     api.joinManual(offer)   → Promise<{ code, done: Promise<{ ok, why }>, cancel }>
     api.start()             Host: Spiel starten (Lobby → Spiel)
     api.leave()             Sitzung verlassen bzw. beenden, zurück zum Titelbildschirm
     api.workerOk()          Simulation läuft im Web Worker (sonst drosselt der Browser den Host im Hintergrund)
     api.coopSaves()         → Promise<Liste der Koop-Spielstände (meta)>
     api.setDemolish(v)      Host: Vorgabe „Mitspieler dürfen meine Gebäude abreißen“ für alle (nur „Gemeinsame Insel“)
   Getrennte Inseln: opts.slots = Spielerzahl 2–4 (HOME_SLOTS), in der Lobby steht der Startplatz je Spieler.
   „Verbindung“ im Koop-Menü: eigener TURN/STUN-Server (net/peer.js, localStorage).
   ========================================================= */
import { PLAYER_COLORS, NAME_MAX, NET } from '../data/net.js';
import { HOME_SLOTS } from '../data/islands.js';
import { turnSettings, setTurnSettings } from '../net/peer.js';
import { esc } from '../util/format.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { inkOn } from '../gfx/peers.js';
import { coop, on, profile, saveProfile, parseCode, joinLink, sendChat, hostOffer, isHost, isGuest, HOST, setSettings, playerList } from '../net/session.js';
import { $ } from './context.js';
import { toast } from './toasts.js';
import { chatLine } from './chat.js';
import { parseSeed } from './menu.js';

let api = null;
export function setCoopApi(a) { api = a; }

export const MODE_NAME = { shared: 'Gemeinsame Insel', separate: 'Getrennte Inseln' };
const MODE_TXT = {
  shared: 'Alles gehört allen: Inseln, Lager, Forschung, Münzen, Schiffe.',
  separate: 'Jeder hat eine eigene Heimatinsel, eigene Forschung, Münzen und eigenen Nebel. Handel über Routen und Preislisten. Vorerst ohne Geschichte und ohne Weltenleuchtturm.'
};
const isSepSession = () => !!(coop.settings && coop.settings.mode === 'separate');
const TURN_HINT = ' <span class="xs muted">Klappt die direkte Verbindung nicht (z. B. im Firmennetz), kann ein eigener TURN-Server helfen: Koop &rarr; <b>Verbindung</b>.</span>';
export const WORKER_WARN = 'Dein Browser drosselt das Spiel im Hintergrund – Tab bitte im Vordergrund lassen.';

/* ---------- Hilfen ---------- */
export async function copyText(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch (e) { /* Rückfall unten */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove();
    return ok;
  } catch (e) { return false; }
}
const copied = (ok, what) => toast(ok ? `${what} kopiert.` : 'Kopieren nicht möglich – bitte markieren und selbst kopieren.');
export function joinError(r) {
  switch (r && r.why) {
    case 'unreachable': return 'Der Vermittlungsdienst ist nicht erreichbar. Verbindet euch über „Manuell verbinden“.' + TURN_HINT;
    case 'no-host': return 'Unter diesem Code gibt es keine offene Lobby. Stimmt der Code?';
    case 'version': return `Ihr nutzt verschiedene Versionen von Tideworks.${r.host ? ` <span class="xs muted">(Host: ${esc(r.host.v)}, Spielstand-Version ${r.host.sv}, Daten ${esc(r.host.dh)})</span>` : ''}`;
    case 'full': return `Die Lobby ist voll (höchstens ${NET.maxPlayers} Spieler).`;
    case 'worldfull': return `Diese Welt ist voll (${r.n | 0} Spieler).`;
    case 'denied': return 'Der Host hat den Beitritt abgelehnt.';
    case 'cancel': return '';
    default: return 'Keine Antwort vom Host. Prüft den Code und versucht es noch einmal.' + TURN_HINT;
  }
}
function swatches(cur, taken) {
  return `<div class="swatches">${PLAYER_COLORS.map(c => `<button class="sw${c === cur ? ' on' : ''}" data-col="${c}" style="background:${c}" ${taken && taken.has(c) && c !== cur ? 'disabled title="schon vergeben"' : ''} aria-label="Farbe"></button>`).join('')}</div>`;
}
function profileHTML(taken) {
  return `<div class="cprof">
    <label class="col" style="gap:3px"><span class="lbl">Dein Name</span><input class="inp" data-prof="name" maxlength="${NAME_MAX}" value="${esc(profile.name)}" spellcheck="false" autocomplete="off"></label>
    <div class="col" style="gap:3px"><span class="lbl">Deine Farbe</span>${swatches(profile.color, taken)}</div></div>`;
}
// Name/Farbe in einem Container verdrahten (Koop-Menü und Lobby)
function wireProfile(root, after) {
  root.addEventListener('change', (e) => { if (e.target.matches('[data-prof="name"]')) { saveProfile({ name: e.target.value }); e.target.value = profile.name; if (after) after(); } });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-col]');
    if (!b || b.disabled) return;
    saveProfile({ color: b.dataset.col });
    root.querySelectorAll('[data-col]').forEach(x => x.classList.toggle('on', x.dataset.col === profile.color));
    if (after) after();
  });
}
// Modal-Grundgerüst (wie ui/menu.js): Esc schließt, Klick daneben schließt
function modal(html, onClose) {
  const m = $('modal');
  m.innerHTML = html;
  m.classList.remove('hidden');
  const close = () => { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true); if (onClose) onClose(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); } };
  document.addEventListener('keydown', onKey, true);
  return { m, close };
}

/* ---------- Koop-Menü (Titelbildschirm → Koop) ---------- */
export function openCoop(code) {
  const { m, close } = modal(`<div class="panel modal" role="dialog" aria-modal="true"><div class="phead"><span class="row">${img(SPR.icon.chat, 2)}Koop</span><button class="xbtn" data-c="close">&times;</button></div>
    <div class="mb small col" style="gap:12px">
      ${profileHTML()}
      <button class="tbtn tbtn-sm" data-c="host">Lobby gründen<span class="tsub">Du bist Host, deine Freunde treten mit dem Code bei</span></button>
      <div class="col" style="gap:4px"><span class="lbl">Beitreten</span>
        <div class="row" style="gap:6px"><input class="inp grow cpcode" id="cpCode" maxlength="64" placeholder="TIDE-XXXX" value="${esc(code || '')}" spellcheck="false" autocomplete="off"><button class="btn btn-green btn-sm" data-c="join">Beitreten</button></div>
        <div id="cpMsg" class="xs"></div>
      </div>
      <div class="xs muted">Ohne Vermittlungsdienst (z. B. im Firmennetz): <button class="lnk" data-c="manual">Manuell verbinden</button> &ndash; zwei Codes per Chat oder Mail austauschen.</div>
      <div class="row xs muted" style="gap:6px"><button class="btn btn-paper btn-sm" data-c="turn">Verbindung</button><span>${turnSettings() ? `Eigener Server: <b>${esc(turnSettings().url)}</b>` : 'Eigener TURN/STUN-Server (optional)'}</span></div>
    </div></div>`, () => { busy = false; });
  let busy = false;
  wireProfile(m);
  const msg = (h, bad) => { const el = $('cpMsg'); if (el) { el.innerHTML = h; el.className = `xs ${bad ? 'bad' : 'muted'}`; } };
  const join = async () => {
    if (busy) return;
    const c = parseCode($('cpCode').value);
    if (!c) { msg('Der Code hat die Form TIDE-XXXX.', true); return; }
    busy = true; msg('Verbinde …');
    const off = watchStatus(msg);
    const r = await api.join(c);
    off(); busy = false;
    if (r.ok) { close(); openLobby(); return; }
    const t = joinError(r);
    if (t) msg(t + (r.why === 'unreachable' ? ' <button class="lnk" data-c="manual">Manuell verbinden</button>' : ''), true);
  };
  m.onclick = (e) => {
    if (e.target === m) { close(); return; }
    const b = e.target.closest('[data-c]');
    if (!b) return;
    switch (b.dataset.c) {
      case 'close': close(); break;
      case 'host': close(); openHostSetup(); break;
      case 'join': join(); break;
      case 'manual': close(); openManualJoin(); break;
      case 'turn': close(); openTurn(); break;
    }
  };
  $('cpCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); join(); } });
  if (code) { $('cpCode').focus(); $('cpCode').select(); msg('Link geöffnet: Name und Farbe wählen, dann „Beitreten“.'); }
}
/* ---------- Verbindung: eigener TURN/STUN-Server (gespeichert im Browser) ---------- */
function openTurn() {
  const t = turnSettings() || { url: '', user: '', pass: '' };
  const { m, close } = modal(`<div class="panel modal" role="dialog" aria-modal="true"><div class="phead"><span>Verbindung</span><button class="xbtn" data-t="close">&times;</button></div>
    <div class="mb small col" style="gap:8px">
      <div class="xs muted">Kommt keine direkte Verbindung zustande, leitet ein TURN-Server die Daten weiter. Trage hier deinen eigenen ein (optional, wird nur in diesem Browser gespeichert). Die öffentlichen Server bleiben als Rückfall.</div>
      <label class="col" style="gap:3px"><span class="lbl">URL</span><input class="inp" id="tnUrl" maxlength="200" placeholder="turn:mein-server.de:3478" value="${esc(t.url)}" spellcheck="false" autocomplete="off"></label>
      <label class="col" style="gap:3px"><span class="lbl">Benutzer</span><input class="inp" id="tnUser" maxlength="80" value="${esc(t.user)}" spellcheck="false" autocomplete="off"></label>
      <label class="col" style="gap:3px"><span class="lbl">Passwort</span><input class="inp" id="tnPass" type="password" maxlength="120" value="${esc(t.pass)}" autocomplete="off"></label>
      <div class="xs muted">Gilt für neue Verbindungen. Ob eine Verbindung direkt oder über TURN läuft, zeigt <code>tideworks.net()</code> in der Konsole.</div>
    </div>
    <div class="mf"><button class="btn btn-sm" data-t="clear">Löschen</button><button class="btn btn-green btn-sm" data-t="save">Speichern</button></div></div>`);
  m.onclick = (e) => {
    if (e.target === m) { close(); return; }
    const b = e.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === 'save') { setTurnSettings({ url: $('tnUrl').value, user: $('tnUser').value, pass: $('tnPass').value }); toast(turnSettings() ? 'Verbindung gespeichert.' : 'Kein eigener Server eingetragen.'); }
    if (b.dataset.t === 'clear') { setTurnSettings(null); toast('Eigener Server gelöscht.'); }
    close(); openCoop();
  };
}
// Statuszeile der Sitzung (z. B. „Der Host muss den Beitritt erst zulassen …“) in eine Meldung spiegeln
let statusFns = [];
function watchStatus(fn) { const f = () => { if (coop.status && coop.status !== 'reconnecting') fn(esc(coop.status)); }; statusFns.push(f); return () => { statusFns = statusFns.filter(x => x !== f); }; }
on('update', () => { for (const f of statusFns) f(); });

/* ---------- Lobby gründen ---------- */
async function openHostSetup() {
  const saves = await api.coopSaves();
  let kind = 'new', mode = 'shared', slots = HOME_SLOTS.min, pick = saves[0] ? saves[0].id : null;
  const { m, close } = modal(`<div class="panel modal wide" role="dialog" aria-modal="true"><div class="phead"><span>Lobby gründen</span><button class="xbtn" data-h="close">&times;</button></div>
    <div class="mb small col" style="gap:10px">
      <div class="col" style="gap:4px"><span class="lbl">Welt</span><div class="seg seg2" id="hsKind"><button class="segb on" data-k="new">Neue Welt</button><button class="segb" data-k="load" ${saves.length ? '' : 'disabled title="Noch keine Koop-Spielstände"'}>Koop-Spielstand fortsetzen</button></div></div>
      <div id="hsNew" class="col" style="gap:8px">
        <label class="col" style="gap:3px"><span class="lbl">Name</span><input class="inp" id="hsName" maxlength="32" value="Koop-Welt ${saves.length + 1}" spellcheck="false" autocomplete="off"></label>
        <label class="col" style="gap:3px"><span class="lbl">Seed (optional)</span><input class="inp" id="hsSeed" maxlength="24" placeholder="leer = zufällige Welt" spellcheck="false" autocomplete="off"></label>
      </div>
      <div id="hsLoad" class="col hidden" style="gap:4px"><div class="slots-list scroll" style="max-height:220px">${saves.map(s => `<button class="segb hsave" data-s="${s.id}"><b>${esc(s.name)}</b><span class="xs muted">${esc((s.players || []).map(p => p.name).join(', ') || 'Koop')} &middot; ${MODE_NAME[s.mode || 'shared']}${s.mode === 'separate' && s.slots ? ` &middot; ${(s.players || []).length}/${s.slots} Spieler` : ''}</span></button>`).join('')}</div></div>
      <div class="col" style="gap:4px"><span class="lbl">Modus</span><div class="seg seg2" id="hsMode"><button class="segb on" data-md="shared">Gemeinsame Insel</button><button class="segb" data-md="separate">Getrennte Inseln</button></div>
        <div id="hsModeTxt" class="xs muted">${MODE_TXT.shared}</div></div>
      <div id="hsSlots" class="col hidden" style="gap:4px"><span class="lbl">Spieler</span><div class="seg seg3">${Array.from({ length: HOME_SLOTS.max - HOME_SLOTS.min + 1 }, (_, i) => HOME_SLOTS.min + i).map(n => `<button class="segb" data-n="${n}">${n} Spieler</button>`).join('')}</div>
        <div class="xs muted">Jeder bekommt einen Startplatz mit gleichwertiger Heimatinsel, etwa ${HOME_SLOTS.dist} Felder voneinander entfernt.</div></div>
      <label class="row chk" style="gap:6px" id="hsDemoRow"><input type="checkbox" id="hsDemo" checked><span>Mitspieler dürfen meine Gebäude abreißen<span class="xs muted"> &middot; jeder kann das später im Pausenmenü für sich ändern</span></span></label>
      ${api.workerOk() ? '' : `<div class="warn xs">${WORKER_WARN}</div>`}
      <div id="hsMsg" class="xs bad"></div>
    </div>
    <div class="mf"><button class="btn btn-sm" data-h="back">Zurück</button><button class="btn btn-green btn-sm" data-h="go" id="hsGo">Lobby gründen</button></div></div>`);
  const render = () => {
    m.querySelectorAll('#hsKind [data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === kind));
    $('hsNew').classList.toggle('hidden', kind !== 'new');
    $('hsLoad').classList.toggle('hidden', kind !== 'load');
    m.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === pick));
    // Fortgesetzter Spielstand: Modus steht fest
    const sv = kind === 'load' ? saves.find(s => s.id === pick) : null;
    if (sv) mode = sv.mode || 'shared';
    m.querySelectorAll('#hsMode [data-md]').forEach(b => { b.classList.toggle('on', b.dataset.md === mode); b.disabled = !!sv && b.dataset.md !== mode; });
    $('hsModeTxt').innerHTML = MODE_TXT[mode];
    // Getrennte Inseln: Spielerzahl nur bei neuer Welt, Abreißen fremder Gebäude gibt es dort nicht
    $('hsSlots').classList.toggle('hidden', mode !== 'separate' || kind !== 'new');
    m.querySelectorAll('[data-n]').forEach(b => b.classList.toggle('on', +b.dataset.n === slots));
    $('hsDemoRow').classList.toggle('hidden', mode === 'separate');
    $('hsGo').disabled = kind === 'load' && !sv;
  };
  m.onclick = async (e) => {
    if (e.target === m) { close(); return; }
    const k = e.target.closest('[data-k]'), md = e.target.closest('[data-md]'), s = e.target.closest('[data-s]'), h = e.target.closest('[data-h]'), n = e.target.closest('[data-n]');
    if (k && !k.disabled) { kind = k.dataset.k; render(); return; }
    if (n) { slots = +n.dataset.n; render(); return; }
    if (md && !md.disabled) { mode = md.dataset.md; render(); return; }
    if (s) { pick = s.dataset.s; render(); return; }
    if (!h) return;
    if (h.dataset.h === 'close') { close(); return; }
    if (h.dataset.h === 'back') { close(); openCoop(); return; }
    if (h.dataset.h === 'go' && !h.disabled) {
      h.disabled = true; $('hsMsg').textContent = '';
      const world = kind === 'new' ? { kind, name: $('hsName').value.replace(/\s+/g, ' ').trim() || 'Koop-Welt', seed: parseSeed($('hsSeed').value) } : { kind, id: pick };
      const r = await api.host(world, { mode, demolish: mode === 'shared' && $('hsDemo').checked, slots: mode === 'separate' && kind === 'new' ? slots : undefined });
      if (!r.ok) { $('hsMsg').textContent = r.msg || 'Die Lobby konnte nicht gegründet werden.'; h.disabled = false; return; }
      close(); openLobby();
    }
  };
  render();
}
export const playersText = (s) => s.mode === 'separate' && s.slots ? `${MODE_NAME.separate} · ${(s.players || []).length}/${s.slots} Spieler` : (s.players || []).map(p => p.name).join(', ') || 'Koop';

/* ---------- Manuell verbinden (Mitspieler) ---------- */
function openManualJoin() {
  let pend = null;
  const { m, close } = modal(`<div class="panel modal wide" role="dialog" aria-modal="true"><div class="phead"><span>Manuell verbinden</span><button class="xbtn" data-j="close">&times;</button></div>
    <div class="mb small col" style="gap:10px">
      ${profileHTML()}
      <div class="xs">1. Der Host erzeugt in seiner Lobby einen <b>Angebots-Code</b> (beginnt mit TWO-) und schickt ihn dir. Füge ihn hier ein:</div>
      <textarea class="inp code-ta" id="mjOffer" rows="3" spellcheck="false" placeholder="TWO-…"></textarea>
      <button class="btn btn-green btn-sm" data-j="answer" id="mjBtn">Antwort-Code erzeugen</button>
      <div id="mjAns" class="col hidden" style="gap:6px">
        <div class="xs">2. Schicke diesen <b>Antwort-Code</b> an den Host. Er fügt ihn in der Lobby ein, dann verbindet ihr euch.</div>
        <textarea class="inp code-ta" id="mjAnsTa" rows="3" readonly></textarea>
        <button class="btn btn-paper btn-sm" data-j="copy">Antwort-Code kopieren</button>
      </div>
      <div id="mjMsg" class="xs muted"></div>
    </div></div>`, () => { if (pend && !pend.done) pend.cancel(); });
  wireProfile(m);
  const msg = (h, bad) => { const el = $('mjMsg'); if (el) { el.innerHTML = h; el.className = `xs ${bad ? 'bad' : 'muted'}`; } };
  m.onclick = async (e) => {
    if (e.target === m) { close(); return; }
    const b = e.target.closest('[data-j]');
    if (!b || b.disabled) return;
    if (b.dataset.j === 'close') { close(); return; }
    if (b.dataset.j === 'copy') { copied(await copyText($('mjAnsTa').value), 'Antwort-Code'); return; }
    if (b.dataset.j === 'answer') {
      b.disabled = true; msg('Erzeuge Antwort-Code …');
      try {
        const a = await api.joinManual($('mjOffer').value);
        pend = { cancel: a.cancel, done: false };
        $('mjAns').classList.remove('hidden'); $('mjAnsTa').value = a.code; $('mjAnsTa').select();
        msg('Warte auf den Host …');
        const off = watchStatus(msg);
        const r = await a.done;
        off(); pend.done = true;
        if (r.ok) { close(); openLobby(); return; }
        msg(joinError(r), true); b.disabled = false;
      } catch (err) { msg(esc(err && err.message || 'Der Code ist ungültig.'), true); b.disabled = false; }
    }
  };
}

/* ---------- Lobby-Fenster ---------- */
let lobbyOpen = false, man = null;   // man: laufendes manuelles Angebot des Hosts { code, accept, cancel }
export const isLobbyOpen = () => lobbyOpen;
export function openLobby() {
  lobbyOpen = true;
  const L = $('lobby');
  L.classList.remove('hidden');
  L.innerHTML = `<div class="panel lobby col" role="dialog">
    <div class="phead"><span class="row">${img(SPR.icon.chat, 2)}Koop-Lobby</span><span id="lbWorld" class="xs muted"></span></div>
    <div class="lbody">
      <div class="col" style="gap:10px;min-width:0">
        <div id="lbCode"></div>
        <div id="lbMan"></div>
        <div class="col" style="gap:4px"><span class="lbl">Spieler</span><div id="lbPlayers" class="col" style="gap:4px"></div></div>
        <div id="lbSet" class="col" style="gap:4px"></div>
        <div id="lbWarn"></div>
        <div id="lbProf">${profileHTML()}</div>
      </div>
      <div class="col lchat" style="gap:6px;min-width:0"><span class="lbl">Chat</span><div id="lbChat" class="lchatlog scroll"></div>
        <input class="inp" id="lbChatIn" maxlength="160" placeholder="Nachricht … (Enter)" spellcheck="false" autocomplete="off"></div>
    </div>
    <div class="mf"><span id="lbStatus" class="xs muted grow"></span><button class="btn btn-red btn-sm" data-l="leave" id="lbLeave">Lobby verlassen</button><button class="btn btn-green btn-sm hidden" data-l="start" id="lbStart">Spiel starten</button></div>
  </div>`;
  wireProfile($('lbProf'), renderLobby);
  $('lbChatIn').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); sendChat(e.target.value); e.target.value = ''; } });
  L.onclick = async (e) => {
    const b = e.target.closest('[data-l]');
    if (!b || b.disabled) return;
    switch (b.dataset.l) {
      case 'leave': closeLobby(); api.leave(); break;
      case 'start': b.disabled = true; api.start(); break;
      case 'copyCode': copied(await copyText(coop.code), 'Code'); break;
      case 'copyLink': copied(await copyText(joinLink(coop.code)), 'Link'); break;
      case 'offer': {
        b.disabled = true;
        try { man = await hostOffer(); } catch (err) { toast('Angebot konnte nicht erzeugt werden.'); }
        renderMan(true); break;
      }
      case 'copyOffer': if (man) copied(await copyText(man.code), 'Angebots-Code'); break;
      case 'accept': {
        if (!man) break;
        const ta = $('lbAns'), v = ta ? ta.value : '';
        b.disabled = true; $('lbManMsg').textContent = 'Verbinde …';
        try { await man.accept(v); man = null; renderMan(true); toast('Manuell verbunden.'); }
        catch (err) { $('lbManMsg').textContent = err && err.message || 'Verbindung fehlgeschlagen.'; b.disabled = false; }
        break;
      }
      case 'demolish': setSettings({ demolish: !coop.settings.demolish }); api.setDemolish(coop.settings.demolish); break;
    }
  };
  renderMan(true);
  renderLobby();
}
export function closeLobby() {
  lobbyOpen = false;
  if (man) { try { man.cancel(); } catch (e) { /* egal */ } man = null; }
  const L = $('lobby');
  L.classList.add('hidden'); L.innerHTML = ''; L.onclick = null;
}
// Manuell verbinden (Host): Angebots-Code erzeugen, Antwort einfügen
function renderMan(force) {
  const el = $('lbMan');
  const key = `${!!man}:${coop.peerOk}`;
  if (!el || (!force && el.dataset.k === key)) return;
  el.dataset.k = key;
  if (!isHost()) { el.innerHTML = ''; return; }
  const open = coop.peerOk === false || man;
  el.innerHTML = `<details class="lman" ${open ? 'open' : ''}><summary class="lbl">Manuell verbinden</summary>
    <div class="col" style="gap:6px;margin-top:4px">
    ${man ? `<div class="xs">1. Schicke diesen <b>Angebots-Code</b> an einen Mitspieler (er wählt im Koop-Menü „Manuell verbinden“):</div>
      <textarea class="inp code-ta" rows="3" readonly>${esc(man.code)}</textarea><button class="btn btn-paper btn-sm" data-l="copyOffer">Angebots-Code kopieren</button>
      <div class="xs">2. Seinen <b>Antwort-Code</b> (TWA-…) hier einfügen:</div><textarea class="inp code-ta" id="lbAns" rows="2" spellcheck="false" placeholder="TWA-…"></textarea>
      <button class="btn btn-green btn-sm" data-l="accept">Verbinden</button><div id="lbManMsg" class="xs bad"></div>`
    : `<div class="xs muted">Zwei Codes austauschen, ganz ohne Vermittlungsdienst. Ein Angebot gilt für einen Mitspieler.</div><button class="btn btn-paper btn-sm" data-l="offer">Angebots-Code erzeugen</button>`}
    </div></details>`;
}
const statusText = (p) => p.status === 'lost' ? '<span class="bad">Verbindung verloren …</span>' : p.status === 'wait' ? 'wartet' : p.host ? 'Host' : 'verbunden';
export function playersHTML() {
  return playerList().map(p => `<div class="lpl"><span class="lsw" style="background:${esc(p.color)}"></span><b class="grow">${esc(p.name)}${p.pid === (isGuest() ? coop.pid : HOST) ? ' <span class="xs muted">(du)</span>' : ''}</b>
    ${p.slot ? `<span class="xs muted">Platz ${p.slot}</span>` : ''}<span class="xs muted">${statusText(p)}</span><span class="xs muted lping">${p.host ? '' : `${p.ping | 0} ms`}</span></div>`).join('');
}
export function codeHTML() {
  if (coop.code) return `<div class="lcode"><span class="lbl">Lobby-Code</span><div class="row" style="gap:6px;flex-wrap:wrap"><span class="pix lcodev">${esc(coop.code)}</span>
    <button class="btn btn-paper btn-sm" data-l="copyCode">Code kopieren</button><button class="btn btn-paper btn-sm" data-l="copyLink">Link kopieren</button></div></div>`;
  if (isHost() && coop.peerOk === false) return `<div class="warn xs">Der Vermittlungsdienst ist nicht erreichbar, es gibt keinen Lobby-Code. Verbindet euch über „Manuell verbinden“.</div>`;
  if (isHost() && coop.peerOk == null) return '<div class="xs muted">Lobby-Code wird angelegt …</div>';
  return coop.manual ? '<div class="xs muted">Manuell verbunden.</div>' : '';
}
export function renderLobby() {
  if (!lobbyOpen || !coop.role) return;
  const S = coop.settings || {};
  $('lbWorld').textContent = S.worldName || '';
  const ch = codeHTML(); if ($('lbCode').dataset.h !== ch) { $('lbCode').innerHTML = ch; $('lbCode').dataset.h = ch; }
  $('lbPlayers').innerHTML = playersHTML();
  $('lbSet').innerHTML = `<span class="lbl">Einstellungen${isHost() ? '' : ' (vom Host)'}</span>
    <div class="xs">Modus: <b>${MODE_NAME[S.mode || 'shared']}</b>${S.slots ? ` &middot; ${S.slots} Spieler` : ''}</div>
    ${S.mode === 'separate' ? '<div class="xs muted">Fremde Gebäude kann niemand abreißen. Jeder baut nur auf eigenen Inseln.</div>' : isHost() ? `<label class="row chk xs" style="gap:6px"><input type="checkbox" data-l="demolish" ${S.demolish ? 'checked' : ''}><span>Mitspieler dürfen meine Gebäude abreißen (Vorgabe für alle)</span></label>`
    : `<div class="xs">Abreißen fremder Gebäude: <b>${S.demolish ? 'erlaubt' : 'nicht erlaubt'}</b> (Vorgabe, jeder kann es im Pausenmenü für sich ändern)</div>`}`;
  $('lbWarn').innerHTML = isHost() && !api.workerOk() ? `<div class="warn xs">${WORKER_WARN}</div>` : '';
  // Farben der anderen sind vergeben
  const taken = new Set(playerList().filter(p => p.pid !== (isGuest() ? coop.pid : HOST)).map(p => p.color));
  $('lbProf').querySelectorAll('[data-col]').forEach(b => { b.disabled = taken.has(b.dataset.col) && b.dataset.col !== profile.color; b.classList.toggle('on', b.dataset.col === profile.color); });
  const log = $('lbChat'), h = coop.chat.map(chatLine).join('') || '<div class="xs muted">Noch keine Nachrichten.</div>';
  if (log.dataset.h !== h) { log.innerHTML = h; log.dataset.h = h; log.scrollTop = log.scrollHeight; }
  $('lbStart').classList.toggle('hidden', !isHost());
  $('lbLeave').textContent = isHost() ? 'Lobby schließen' : 'Lobby verlassen';
  $('lbStatus').innerHTML = isHost() ? `${playerList().length} von ${S.slots || NET.maxPlayers} Spielern${playerList().length < 2 ? ' &middot; schick deinen Freunden den Code' : ''}`
    : coop.status === 'reconnecting' ? 'Verbindung wird wiederhergestellt …' : coop.phase === 'game' ? 'Das Spiel läuft, Welt wird geladen …' : 'Warte, bis der Host das Spiel startet …';
  renderMan(false);
}
on('update', renderLobby);
on('chat', renderLobby);
setInterval(renderLobby, 1000);

/* ---------- Beitrittsanfrage während des Spiels (nur Host) ---------- */
export function askJoin(p) {
  return new Promise(resolve => {
    const box = $('joinAsk'), el = document.createElement('div');
    el.className = 'panel jask';
    el.innerHTML = `<span class="lsw" style="background:${esc(p.color || '#fff')}"></span><span class="grow"><b>${esc(p.name)}</b> möchte beitreten</span>
      <button class="btn btn-sm" data-a="no">Ablehnen</button><button class="btn btn-green btn-sm" data-a="yes">Zulassen</button>`;
    box.appendChild(el);
    const done = (v) => { clearTimeout(t); el.remove(); resolve(v); };
    const t = setTimeout(() => done(false), NET.joinWait * 1000);
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === 'yes'); });
  });
}

/* ---------- Hinweis bei Verbindungsproblemen ---------- */
export function renderNetBanner() {
  const el = $('netBanner');
  const show = isGuest() && coop.status === 'reconnecting';
  el.classList.toggle('hidden', !show);
  if (show) el.textContent = 'Verbindung wird wiederhergestellt …';
}
on('status', renderNetBanner);
on('update', renderNetBanner);

/* ---------- Pausenmenü: Mitspieler, Code, eigene Einstellung ---------- */
export function pauseCoopHTML(demolishMine) {
  if (!coop.role) return '';
  return `<div class="pmcoop col" style="gap:6px">
    ${codeHTML()}
    <div class="col" style="gap:3px">${playersHTML()}</div>
    ${isSepSession() ? '' : `<label class="row chk xs" style="gap:6px"><input type="checkbox" data-pm="demolish" ${demolishMine ? 'checked' : ''}><span>Mitspieler dürfen meine Gebäude abreißen</span></label>`}
    ${isHost() ? '<div class="xs muted">Das Spiel läuft weiter, solange das Menü offen ist.</div>' : ''}
  </div>`;
}
