/* =========================================================
   KOOP-SITZUNG: Lobby, Spieler, Lebenszeichen, Chat, Markierungen, Zustand der Mitspieler
   Rollen: 'host' (betreibt die einzige Simulation) oder 'guest' (Spiegel aus den Snapshots des Hosts).
   Alles Spielrelevante läuft über die Simulation des Hosts (Kommandos rein, Snapshots raus); Chat, Markierungen,
   Mauszeiger und Bauvorschau verteilt der Host direkt (ohne Simulation).
   main.js verbindet die Sitzung mit Simulation und Oberfläche über setHooks():
     cmd(pid, cmds, seq), addView(pid), dropView(pid), view(pid, rect, sel), busy(pid, b), player(pid, name, color),
     known(pid) → { name, color } aus dem Spielstand, ask(player) → Promise<bool> (Beitritt während des Spiels),
     world(msg), snap(msg, bytes), start(), ended(text), localState() → Zeiger/Modus/Vorschau, localView() → { rect, sel }
   Ereignisse für die Oberfläche: on('update' | 'chat' | 'mark' | 'peers' | 'status' | 'cs', fn)
   ========================================================= */
import { NET, CODE, PLAYER_COLORS, NAME_MAX, CHAT, MARKS } from '../data/net.js';
import { openPeer, listen, dial, manualOffer, manualAnswer, netDebug, turnSettings } from './peer.js';
import { versionInfo, sameVersion } from './version.js';

export const HOST = 'host';
const now = () => performance.now() / 1000;

/* ---------- Eigenes Profil (Name, Farbe, feste Spieler-ID) ---------- */
const PROF_KEY = 'tideworks.profile';
function loadProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(PROF_KEY) || 'null'); } catch (e) { p = null; }
  if (!p || typeof p !== 'object') p = {};
  if (!/^p[a-z0-9]{6,20}$/.test(p.id || '')) p.id = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  p.name = cleanName(p.name) || 'Spieler';
  if (!PLAYER_COLORS.includes(p.color)) p.color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
  return p;
}
export const cleanName = (n) => String(n || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
export const profile = loadProfile();
export function saveProfile(o) {
  if (o.name != null) profile.name = cleanName(o.name) || profile.name;
  if (o.color && PLAYER_COLORS.includes(o.color)) profile.color = o.color;
  try { localStorage.setItem(PROF_KEY, JSON.stringify(profile)); } catch (e) { /* egal */ }
  if (coop.role === 'guest' && coop.conn) coop.conn.send({ t: 'prof', name: profile.name, color: profile.color });
  if (coop.role === 'host') { const me = coop.players.get(HOST); me.name = profile.name; me.color = pickColor(HOST, profile.color); hooks.player(HOST, me.name, me.color); broadcastLobby(); }
  emit('update');
}

/* ---------- Zustand ---------- */
// players: pid → { pid, name, color, conn, status ('ok' | 'lost' | 'wait'), ping, last (s), since, state, host }
export const coop = {
  role: null, phase: null, code: null, settings: null, players: new Map(), chat: [], marks: [], peer: null, conn: null,
  peerOk: null, manual: false, status: '', ending: false, pid: null, markN: 0, myPing: 0
};
let hooks = {};
export function setHooks(h) { hooks = h; }
const L = {};
export function on(name, fn) { (L[name] || (L[name] = [])).push(fn); }
function emit(name, a) { for (const f of L[name] || []) { try { f(a); } catch (e) { console.error(e); } } }
saveProfile({});   // Profil (neue ID, Name, Farbe) sofort ablegen
export const active = () => !!coop.role;
export const isHost = () => coop.role === 'host';
export const isGuest = () => coop.role === 'guest';
export const myPid = () => coop.role === 'guest' ? profile.id : HOST;
export const playerList = () => [...coop.players.values()];
export const playerColor = (pid) => { const p = coop.players.get(pid); return p ? p.color : null; };

let timers = [];
function every(sec, fn) { timers.push(setInterval(fn, sec * 1000)); }
function stopTimers() { for (const t of timers) clearInterval(t); timers = []; }

/* ---------- Lobby-Code ---------- */
export function newCode() {
  let s = '';
  for (let i = 0; i < CODE.len; i++) s += CODE.chars[Math.floor(Math.random() * CODE.chars.length)];
  return CODE.prefix + s;
}
// Eingabe → TIDE-XXXX (Kleinbuchstaben, ohne Bindestrich, ganzer Link) oder null
export function parseCode(txt) {
  let t = String(txt || '').toUpperCase().replace(/\s+/g, '');
  const m = t.match(/#JOIN=([A-Z0-9-]+)/);
  if (m) t = m[1];
  t = t.replace(/^TIDE-?/, '').replace(/-/g, '');
  if (t.length !== CODE.len || [...t].some(c => !CODE.chars.includes(c))) return null;
  return CODE.prefix + t;
}
// Link zum Beitreten: aktuelle Datei (oder Seite) mit #join=CODE
export function joinLink(code) {
  const base = location.href.split('#')[0];
  return `${base}#join=${code}`;
}

/* ---------- Host ---------- */
function pickColor(pid, want) {
  const used = new Set(playerList().filter(p => p.pid !== pid && p.status !== 'gone').map(p => p.color));
  if (want && !used.has(want)) return want;
  return PLAYER_COLORS.find(c => !used.has(c)) || want || PLAYER_COLORS[0];
}
// settings: { mode, demolish, worldName }; liefert { ok, code, unreachable }
export async function startHost(settings) {
  endSession(null, true);
  coop.role = 'host'; coop.phase = 'lobby'; coop.settings = Object.assign({}, settings); coop.chat = []; coop.marks = [];
  coop.players = new Map([[HOST, { pid: HOST, name: profile.name, color: profile.color, conn: null, status: 'ok', ping: 0, last: now(), host: true, state: null }]]);
  coop.code = null; coop.peer = null; coop.peerOk = null; coop.manual = false;
  hooks.player(HOST, profile.name, profile.color);
  every(NET.pingEvery, hostTick);
  every(NET.stateEvery, hostStates);
  emit('update');
  for (let tries = 0; tries < 5; tries++) {
    const code = newCode();
    try {
      const peer = await openPeer(PEER_ID(code));
      if (coop.role !== 'host') { peer.destroy(); return { ok: false }; }
      coop.peer = peer; coop.code = code; coop.peerOk = true;
      listen(peer, hostConn);
      peer.on('error', (e) => { if (e && e.type !== 'peer-unavailable') console.warn('Koop (Vermittlung):', e.type); });
      emit('update');
      return { ok: true, code };
    } catch (e) {
      if (e.type === 'unavailable-id') continue;
      coop.peerOk = false; coop.manual = true;
      emit('update');
      return { ok: false, unreachable: true, blocked: !!e.blocked };
    }
  }
  coop.peerOk = false; coop.manual = true; emit('update');
  return { ok: false, unreachable: true };
}
const PEER_ID = (code) => 'tideworks-' + code;   // = PEER.prefix + Code (net/peer.js dial)
// Manuell: Angebot für einen weiteren Mitspieler (UI zeigt den Code, dann accept(Antwort))
export async function hostOffer() {
  const o = await manualOffer();
  return { code: o.code, cancel: o.cancel, accept: async (ans) => { const c = await o.accept(ans); hostConn(c); return true; } };
}
// Neue Verbindung: auf hello warten
function hostConn(conn) {
  if (coop.role !== 'host') { conn.close(); return; }
  let pid = null;
  const timer = setTimeout(() => { if (!pid) conn.close(); }, 15000);
  conn.onmsg((m, bytes) => {
    if (!pid) {
      if (!m || m.t !== 'hello') return;
      clearTimeout(timer);
      hello(conn, m).then(id => { pid = id; });
      return;
    }
    const p = coop.players.get(pid);
    if (!p || p.conn !== conn) return;
    p.last = now(); p.bytesIn = (p.bytesIn || 0) + bytes;
    if (p.status === 'lost') { p.status = 'ok'; emit('update'); }
    fromGuest(p, m);
  });
  conn.onclose(() => { clearTimeout(timer); const p = pid && coop.players.get(pid); if (p && p.conn === conn) lost(p); });
}
async function hello(conn, m) {
  const pid = String(m.pid || ''), name = cleanName(m.name) || 'Mitspieler';
  if (!/^p[a-z0-9]{6,20}$/.test(pid)) { conn.send({ t: 'reject', why: 'bad' }); setTimeout(() => conn.close(), 500); return null; }
  if (!sameVersion(m.ver, versionInfo())) { conn.send({ t: 'reject', why: 'version', host: versionInfo() }); setTimeout(() => conn.close(), 1000); sys(`${name} konnte nicht beitreten: andere Version von Tideworks.`); return null; }
  const old = coop.players.get(pid);
  const present = playerList().filter(p => p.status !== 'gone' && p.pid !== pid).length;
  if (present >= NET.maxPlayers) { conn.send({ t: 'reject', why: 'full' }); setTimeout(() => conn.close(), 1000); return null; }
  // Getrennte Inseln: nur mit freiem Startplatz (bekannte Spieler behalten ihren)
  const seat = hooks.canJoin ? hooks.canJoin(pid) : { ok: true };
  if (!seat.ok) { conn.send({ t: 'reject', why: 'worldfull', n: seat.n }); setTimeout(() => conn.close(), 1000); sys(`${name} konnte nicht beitreten: Diese Welt ist voll (${seat.n} Spieler).`); return null; }
  // Wiederverbinden nach kurzem Abbruch: ohne Rückfrage
  const again = !!old && (old.status === 'lost' || !!m.re);   // Wiederverbinden (auch wenn der Host den Abbruch noch nicht bemerkt hat)
  if (coop.phase === 'game' && !again) {
    conn.send({ t: 'wait' });
    const ok = await hooks.ask({ pid, name });
    if (!ok || conn.closed || coop.role !== 'host') { if (!conn.closed) { conn.send({ t: 'reject', why: 'denied' }); setTimeout(() => conn.close(), 1000); } return null; }
  }
  const known = hooks.known(pid);
  const color = pickColor(pid, known ? known.color : m.color);
  const p = { pid, name, color, conn, status: 'ok', ping: 0, last: now(), since: now(), state: null, bytesIn: 0, needBp: true };
  if (old && old.conn && old.conn !== conn) { try { old.conn.close(); } catch (e) { /* egal */ } }
  coop.players.set(pid, p);
  hooks.player(pid, name, color);
  conn.send({ t: 'welcome', pid, color, code: coop.code, phase: coop.phase, settings: coop.settings, players: lobbyList(), chat: coop.chat.slice(-30), manual: conn.kind === 'manual' });
  hooks.addView(pid);
  if (!again) sys(`${name} ist beigetreten.`);
  broadcastLobby();
  emit('update');
  return pid;
}
function fromGuest(p, m) {
  switch (m.t) {
    case 'cmd': if (Array.isArray(m.cmds)) hooks.cmd(p.pid, m.cmds, m.seq | 0); return;
    case 'view': hooks.view(p.pid, m.rect, m.sel); return;
    case 'state': p.state = m.s && typeof m.s === 'object' ? m.s : null; if (m.bp) p.bp = m.bp; return;
    case 'chat': chatIn(p.pid, m.text); return;
    case 'mark': markIn(p.pid, m); return;
    case 'prof': {
      const name = cleanName(m.name);
      if (name) p.name = name;
      if (PLAYER_COLORS.includes(m.color)) p.color = pickColor(p.pid, m.color);
      hooks.player(p.pid, p.name, p.color); broadcastLobby(); emit('update');
      return;
    }
    case 'ping': p.conn.send({ t: 'pong', ts: m.ts }); return;
    case 'pong': p.ping = Math.round((performance.now() - m.ts)); return;
    case 'bye': leave(p, `${p.name} hat das Spiel verlassen.`); return;
  }
}
function lost(p) {
  if (p.status === 'gone') return;
  if (p.status !== 'lost') { p.status = 'lost'; p.lostAt = now(); emit('update'); broadcastLobby(); }
}
function leave(p, text) {
  if (p.status === 'gone') return;
  p.status = 'gone';
  try { p.conn && p.conn.close(); } catch (e) { /* egal */ }
  coop.players.delete(p.pid);
  hooks.dropView(p.pid);
  sys(text);
  broadcastLobby(); emit('update');
}
function hostTick() {
  const t = now();
  for (const p of playerList()) {
    if (p.host) continue;
    if (p.status === 'ok' && t - p.last > NET.timeout) lost(p);
    if (p.status === 'lost' && t - (p.lostAt || t) > NET.reconnect) { leave(p, `${p.name} hat das Spiel verlassen (Verbindung verloren).`); continue; }
    if (p.conn && !p.conn.closed) { p.conn.send({ t: 'ping', ts: performance.now() }); hooks.busy(p.pid, p.conn.busy()); if (!p.conn.via || Math.random() < 0.1) p.conn.probe(); }
  }
  broadcastLobby();
}
// Zeiger, Modus und Vorschau aller Spieler an alle (10-mal je Sekunde)
function hostStates() {
  const me = coop.players.get(HOST);
  if (!me) return;
  const s = hooks.localState();
  me.state = s.state; if (s.bp) me.bp = s.bp;
  const list = playerList().filter(p => p.status === 'ok' && p.state).map(p => ({ pid: p.pid, s: p.state, bp: p.bpSent === p.bp ? undefined : p.bp }));
  for (const p of playerList()) if (p.bp) p.bpSent = p.bp;
  for (const p of playerList()) if (p.conn && p.status === 'ok') p.conn.send({ t: 'peers', list: list.filter(x => x.pid !== p.pid), bpAll: p.needBp ? bpAll() : undefined }), p.needBp = false;
  emit('peers');
}
const bpAll = () => playerList().filter(p => p.bp).map(p => ({ pid: p.pid, bp: p.bp }));
// slot = Startplatz (Getrennte Inseln)
function lobbyList() { return playerList().map(p => ({ pid: p.pid, name: p.name, color: p.color, status: p.status, ping: p.ping, host: !!p.host, slot: hooks.slotOf ? hooks.slotOf(p.pid) : null })); }
function broadcastLobby() {
  if (coop.role !== 'host') return;
  const msg = { t: 'lobby', players: lobbyList(), phase: coop.phase, settings: coop.settings };
  for (const p of playerList()) if (p.conn && p.status === 'ok') p.conn.send(msg);
}
export function setSettings(o) { Object.assign(coop.settings, o); broadcastLobby(); emit('update'); }
// Spiel starten (Lobby → Spiel)
export function hostStart() {
  if (coop.role !== 'host') return;
  coop.phase = 'game';
  for (const p of playerList()) if (p.conn && p.status === 'ok') p.conn.send({ t: 'start' });
  broadcastLobby(); emit('update');
}
// fertig gepackte Nachricht (Snapshot/world aus dem Worker) an einen Mitspieler
export function toGuest(pid, buf) {
  const p = coop.players.get(pid);
  if (!p || !p.conn || p.conn.closed) return;
  p.bytesOut = (p.bytesOut || 0) + buf.byteLength;
  p.conn.sendBuf(buf);
}

/* ---------- Mitspieler ---------- */
let guestCode = null, retrying = false;
// Liefert { ok, why } – why: 'unreachable' (Vermittlung), 'no-host', 'version', 'full', 'denied', 'timeout'
export async function joinHost(code) {
  endSession(null, true);
  coop.role = 'guest'; coop.phase = 'connecting'; coop.code = code; coop.chat = []; coop.marks = []; coop.players = new Map(); coop.status = 'Verbinde …'; coop.manual = false;
  guestCode = code;
  emit('update');
  let peer;
  try { peer = await openPeer(`tideworks-c-${profile.id}-${Math.random().toString(36).slice(2, 6)}`); }
  catch (e) { const r = { ok: false, why: e.type === 'unreachable' ? 'unreachable' : e.type }; coop.peerOk = false; resetState(); emit('update'); return r; }
  if (coop.role !== 'guest') { peer.destroy(); return { ok: false, why: 'cancel' }; }
  coop.peer = peer; coop.peerOk = true;
  peer.on('disconnected', () => { setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { /* egal */ } }, 2000); });
  let conn;
  try { conn = await dial(peer, code); }
  catch (e) { resetState(); emit('update'); return { ok: false, why: e.type }; }
  return guestHello(conn, false);
}
// Manuell: Angebots-Code des Hosts → Antwort-Code; done = Promise auf das Ergebnis wie bei joinHost
export async function joinManual(offer) {
  endSession(null, true);
  coop.role = 'guest'; coop.phase = 'connecting'; coop.code = null; coop.chat = []; coop.marks = []; coop.players = new Map(); coop.manual = true; coop.status = 'Warte auf den Host …';
  emit('update');
  let a;
  try { a = await manualAnswer(offer); } catch (e) { resetState(); emit('update'); throw e; }
  const done = a.conn.then(conn => guestHello(conn, false), (e) => { resetState(); emit('update'); return { ok: false, why: 'timeout' }; });
  return { code: a.code, done, cancel: () => { a.cancel(); resetState(); emit('update'); } };
}
function guestHello(conn, again) {
  return new Promise(resolve => {
    let settled = false;
    const finish = (r) => { if (!settled) { settled = true; resolve(r); } };
    coop.conn = conn; coop.last = now();
    conn.onmsg((m, bytes) => {
      coop.last = now(); coop.bytesIn = (coop.bytesIn || 0) + bytes;
      if (coop.status === 'reconnecting') { coop.status = ''; emit('status'); }
      switch (m.t) {
        case 'welcome':
          coop.pid = m.pid; coop.phase = m.phase; coop.settings = m.settings; coop.code = m.code || coop.code; setPlayers(m.players);
          if (!again && Array.isArray(m.chat)) coop.chat = m.chat;
          coop.status = '';
          if (!timers.length) { every(NET.pingEvery, guestTick); every(NET.stateEvery, guestState); every(NET.viewEvery, guestView); }
          emit('update'); emit('chat');
          finish({ ok: true, color: m.color });
          return;
        case 'wait': coop.status = 'Der Host muss den Beitritt erst zulassen …'; emit('update'); return;
        case 'reject': finish({ ok: false, why: m.why, host: m.host, n: m.n }); if (!again) resetState(); emit('update'); return;
        default: guestMsg(m, bytes);
      }
    });
    conn.onclose(() => { if (coop.conn === conn && coop.role === 'guest' && !coop.ending) hostGone(); finish({ ok: false, why: 'timeout' }); });
    conn.send({ t: 'hello', pid: profile.id, name: profile.name, color: profile.color, ver: versionInfo(netDebug), re: again });
    setTimeout(() => finish({ ok: false, why: 'timeout' }), NET.joinWait * 1000);
  });
}
function setPlayers(list) {
  const old = coop.players;
  coop.players = new Map((list || []).map(p => [p.pid, Object.assign(old.get(p.pid) || {}, p)]));
}
function guestMsg(m, bytes) {
  switch (m.t) {
    case 'lobby': coop.phase = m.phase; coop.settings = m.settings; setPlayers(m.players); emit('update'); return;
    case 'world': hooks.world(m, bytes); return;
    case 'snap': hooks.snap(m, bytes); return;
    case 'start': coop.phase = 'game'; hooks.start(); emit('update'); return;
    case 'peers':
      for (const x of m.list || []) { const p = coop.players.get(x.pid); if (p) { p.state = x.s; if (x.bp) p.bp = x.bp; p.stAt = now(); } }
      for (const x of m.bpAll || []) { const p = coop.players.get(x.pid); if (p) p.bp = x.bp; }
      for (const p of coop.players.values()) if (p.stAt && now() - p.stAt > 1) p.state = null;
      emit('peers'); return;
    case 'chat': addChat(m.c); return;
    case 'mark': addMark(m.k); return;
    case 'cs': emit('cs', { op: String(m.op || ''), id: String(m.id || '') }); return;
    case 'ping': coop.conn.send({ t: 'pong', ts: m.ts }); return;
    case 'pong': coop.myPing = Math.round(performance.now() - m.ts); return;
    case 'bye': coop.ending = true; end('Der Host hat das Spiel beendet.'); return;
  }
}
function guestTick() {
  if (!coop.conn) return;
  const t = now();
  if (!coop.conn.closed) { coop.conn.send({ t: 'ping', ts: performance.now() }); if (!coop.conn.via || Math.random() < 0.1) coop.conn.probe(); }
  if (t - coop.last > NET.timeout && coop.status !== 'reconnecting') hostGone();
}
function guestState() { if (coop.conn && !coop.conn.closed && coop.phase === 'game') { const s = hooks.localState(); coop.conn.send({ t: 'state', s: s.state, bp: s.bpNew ? s.bp : undefined }); } }
function guestView() { if (coop.conn && !coop.conn.closed) { const v = hooks.localView(); coop.conn.send({ t: 'view', rect: v.rect, sel: v.sel }); } }
// Verbindung zum Host weg: bis NET.reconnect Sekunden neu verbinden (nur über die Vermittlung möglich)
async function hostGone() {
  if (retrying || coop.role !== 'guest') return;
  retrying = true; coop.status = 'reconnecting'; emit('status');
  const t0 = now();
  try { coop.conn && coop.conn.close(); } catch (e) { /* egal */ }
  while (coop.role === 'guest' && now() - t0 < NET.reconnect) {
    if (!coop.manual && coop.peer && guestCode) {
      try {
        const c = await dial(coop.peer, guestCode);
        const r = await guestHello(c, true);
        if (r.ok) { retrying = false; coop.status = ''; emit('status'); return; }
        if (r.why && r.why !== 'timeout') break;
      } catch (e) { /* weiter versuchen */ }
    }
    await new Promise(r => setTimeout(r, NET.retryEvery * 1000));
  }
  retrying = false;
  if (coop.role === 'guest') end('Der Host hat das Spiel beendet.');
}

/* ---------- Chat ---------- */
export function sendChat(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, CHAT.max);
  if (!t || !coop.role) return;
  if (coop.role === 'host') chatIn(HOST, t); else coop.conn && coop.conn.send({ t: 'chat', text: t });
}
function chatIn(pid, text) {
  const p = coop.players.get(pid), t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, CHAT.max);
  if (!p || !t) return;
  hostShare({ t: 'chat', c: { pid, name: p.name, color: p.color, text: t, at: Date.now() } });
}
// Systemmeldung (grau): beim Host an alle verteilt; local = nur hier (z. B. „Forschung abgeschlossen“, das jeder selbst erfährt)
export function sys(text, local) {
  const c = { sys: true, text, at: Date.now() };
  if (local || coop.role !== 'host') addChat(c); else hostShare({ t: 'chat', c });
}
function hostShare(msg) {
  for (const p of playerList()) if (p.conn && p.status === 'ok') p.conn.send(msg);
  if (msg.t === 'chat') addChat(msg.c); else if (msg.t === 'mark') addMark(msg.k);
}
function addChat(c) {
  if (!c || typeof c.text !== 'string') return;
  c.t0 = performance.now();
  coop.chat.push(c);
  if (coop.chat.length > CHAT.keep) coop.chat.splice(0, coop.chat.length - CHAT.keep);
  emit('chat', c);
}

/* ---------- Cutscenes: der Host steuert (Überspringen) ---------- */
// Host → alle Mitspieler: { t: 'cs', op: 'skip', id }; beim Mitspieler Ereignis on('cs', { op, id })
export function csShare(op, id) {
  if (coop.role !== 'host') return;
  for (const p of playerList()) if (p.conn && p.status === 'ok') p.conn.send({ t: 'cs', op, id });
}

/* ---------- Markierungen ---------- */
export function sendMark(kind, x, y) {
  if (!coop.role || !MARKS.kinds.some(k => k.id === kind)) return;
  if (coop.role === 'host') markIn(HOST, { kind, x, y }); else coop.conn && coop.conn.send({ t: 'mark', kind, x, y });
}
function markIn(pid, m) {
  const p = coop.players.get(pid);
  if (!p || !MARKS.kinds.some(k => k.id === m.kind) || !Number.isFinite(+m.x) || !Number.isFinite(+m.y)) return;
  hostShare({ t: 'mark', k: { id: `${pid}:${++coop.markN}`, pid, color: p.color, name: p.name, kind: m.kind, x: +m.x, y: +m.y } });
}
function addMark(k) {
  if (!k) return;
  k.t0 = performance.now();
  coop.marks = coop.marks.filter(o => performance.now() - o.t0 < MARKS.ttl * 1000);
  coop.marks.push(k);
  emit('mark', k);
}
export const liveMarks = () => coop.marks.filter(o => performance.now() - o.t0 < MARKS.ttl * 1000);

/* ---------- Ende ---------- */
function resetState() {
  stopTimers();
  try { coop.conn && coop.conn.close(); } catch (e) { /* egal */ }
  for (const p of coop.players.values()) { try { p.conn && p.conn.close(); } catch (e) { /* egal */ } }
  try { coop.peer && coop.peer.destroy(); } catch (e) { /* egal */ }
  Object.assign(coop, { role: null, phase: null, code: null, settings: null, players: new Map(), peer: null, conn: null, manual: false, status: '', ending: false, pid: null, bytesIn: 0 });
  guestCode = null;
}
function end(text) {
  const was = coop.role;
  resetState();
  emit('update');
  if (was) hooks.ended(text);
}
// Sitzung beenden (Host: alle bekommen „bye“). quiet = ohne Rückmeldung an main.js
export function endSession(text, quiet) {
  if (!coop.role) return;
  coop.ending = true;
  if (coop.role === 'host') for (const p of playerList()) { if (p.conn && !p.conn.closed) p.conn.send({ t: 'bye' }); }
  else if (coop.conn && !coop.conn.closed) coop.conn.send({ t: 'bye' });
  // „bye“ noch zustellen lassen, dann schließen
  const conns = [coop.conn, ...playerList().map(p => p.conn)].filter(Boolean), peer = coop.peer;
  stopTimers();
  Object.assign(coop, { role: null, phase: null, code: null, settings: null, players: new Map(), peer: null, conn: null, manual: false, status: '', ending: false, pid: null });
  guestCode = null;
  setTimeout(() => { for (const c of conns) { try { c.close(); } catch (e) { /* egal */ } } try { peer && peer.destroy(); } catch (e) { /* egal */ } }, 400);
  emit('update');
  if (!quiet) hooks.ended(text);
}
// Kommandos eines Mitspielers an den Host
export function guestSend(cmds, seq) { if (coop.conn && !coop.conn.closed) coop.conn.send({ t: 'cmd', cmds, seq }); }

/* ---------- Debug: tideworks.net(), tideworks.netDrop() ---------- */
// Verbindung hart trennen (ohne „bye“), um das Wiederverbinden zu testen
export function dropConn() {
  if (coop.role === 'guest' && coop.conn) { coop.conn.close(); return true; }
  if (coop.role === 'host') { for (const p of playerList()) if (p.conn) p.conn.close(); return true; }
  return false;
}
export function netInfo() {
  const t = now();
  const list = playerList().map(p => ({ pid: p.pid, name: p.name, color: p.color, status: p.status, host: !!p.host, ping: p.ping, conn: p.conn ? p.conn.kind : null, via: p.conn ? p.conn.via || null : null,
    kbIn: p.conn ? +(p.conn.stats.in / 1024).toFixed(1) : 0, kbOut: p.conn ? +(p.conn.stats.out / 1024).toFixed(1) : 0,
    kbps: p.conn && p.since ? +((p.conn.stats.out / 1024) / Math.max(1, t - p.since)).toFixed(2) : 0, since: p.since ? Math.round(t - p.since) : 0 }));
  return { role: coop.role, phase: coop.phase, code: coop.code, peer: coop.peerOk, manual: coop.manual, me: myPid(), ping: coop.role === 'guest' ? coop.myPing : undefined,
    via: coop.role === 'guest' && coop.conn ? coop.conn.via || null : undefined, turn: turnSettings() ? turnSettings().url : null,
    kbIn: coop.conn ? +(coop.conn.stats.in / 1024).toFixed(1) : undefined, players: list, debug: Object.assign({}, netDebug) };
}
