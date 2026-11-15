/* =========================================================
   KOOP: VERBINDUNGEN (WebRTC-Datenkanäle)
   Zwei Wege, gleiche Schnittstelle (Conn):
     - PeerJS: Vermittlung über den kostenlosen PeerJS-Dienst (PEER in data/net.js), Peer-ID des Hosts = PEER.prefix + Lobby-Code.
       Beide Seiten wählen ihre ID selbst, dadurch braucht es keinen HTTP-Abruf (klappt auch aus file://).
     - Manuell: zwei Codes per Kopieren tauschen (Angebot des Hosts, Antwort des Mitspielers), ganz ohne Vermittlung.
   Conn: send(obj) (klein, sofort), sendAsync(obj) (komprimiert), sendBuf(buf) (fertig gepackt, z. B. Snapshots aus dem Worker),
         onmsg(fn(msg, bytes)), onclose(fn), close(), busy(), stats { in, out, msgsIn, msgsOut }.
   Eigener TURN/STUN-Server (Titel → Koop → Verbindung): { url, user, pass } in localStorage (TURN_KEY), kommt vor die
   öffentlichen Server (ICE in data/net.js). Conn.via = Verbindungsart ('direkt' | 'TURN'), aus den WebRTC-Statistiken.
   Debug (tideworks.netDebug): blockPeer = Vermittlung „nicht erreichbar“, server = eigener PeerServer „host:port“ (zum Testen).
   ========================================================= */
import Peer from 'peerjs';
import { NET, PEER, ICE } from '../data/net.js';
import { Framer, encode, encodeSync, decode } from './protocol.js';

const DBG_KEY = 'tideworks.netDebug';
export const netDebug = (() => { try { return JSON.parse(localStorage.getItem(DBG_KEY) || '{}') || {}; } catch (e) { return {}; } })();
export function setNetDebug(o) {
  Object.assign(netDebug, o || {});
  for (const k in netDebug) if (netDebug[k] == null || netDebug[k] === false) delete netDebug[k];
  try { localStorage.setItem(DBG_KEY, JSON.stringify(netDebug)); } catch (e) { /* egal */ }
  return Object.assign({}, netDebug);
}
const TURN_KEY = 'tideworks.turn';
export function turnSettings() {
  try { const t = JSON.parse(localStorage.getItem(TURN_KEY) || 'null'); return t && typeof t === 'object' && t.url ? t : null; } catch (e) { return null; }
}
// t = { url, user, pass } oder null (löschen)
export function setTurnSettings(t) {
  const url = t && String(t.url || '').trim();
  try { if (url) localStorage.setItem(TURN_KEY, JSON.stringify({ url, user: String(t.user || ''), pass: String(t.pass || '') })); else localStorage.removeItem(TURN_KEY); } catch (e) { /* egal */ }
  return turnSettings();
}
// eingetragener Server zuerst, dann die öffentlichen
export function iceServers() {
  const t = turnSettings(), own = [];
  if (t) {
    const urls = t.url.split(/[\s,]+/).filter(Boolean).map(u => /^(stun|turns?):/i.test(u) ? u : 'turn:' + u);
    if (urls.length) own.push(Object.assign({ urls }, t.user ? { username: t.user, credential: t.pass } : {}));
  }
  return own.concat(ICE);
}
// Verbindungsart aus den Statistiken: Kandidatenpaar in Benutzung, „relay“ = über TURN
export async function connType(pc) {
  if (!pc || !pc.getStats) return null;
  try {
    const st = await pc.getStats();
    let pair = null;
    st.forEach(r => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = st.get(r.selectedCandidatePairId); });
    if (!pair) st.forEach(r => { if (r.type === 'candidate-pair' && (r.selected || (r.nominated && r.state === 'succeeded'))) pair = pair || r; });
    if (!pair) return null;
    const l = st.get(pair.localCandidateId), rm = st.get(pair.remoteCandidateId);
    return (l && l.candidateType === 'relay') || (rm && rm.candidateType === 'relay') ? 'TURN' : 'direkt';
  } catch (e) { return null; }
}
function peerOptions() {
  const o = { host: PEER.host, port: PEER.port, path: PEER.path, secure: PEER.secure, config: { iceServers: iceServers() }, debug: 0 };
  if (netDebug.server) { const [h, p] = String(netDebug.server).split(':'); o.host = h; o.port = +p || 9000; o.secure = !!netDebug.secure; }
  return o;
}

/* ---------- Gemeinsame Verbindungs-Hülle ---------- */
class Conn {
  constructor(kind) {
    this.kind = kind; this.framer = new Framer(); this.q = Promise.resolve(); this.rq = Promise.resolve();
    this.stats = { in: 0, out: 0, msgsIn: 0, msgsOut: 0 }; this.closed = false; this._msg = null; this._close = [];
  }
  onmsg(fn) { this._msg = fn; }
  // Verbindungsart bestimmen (this.via), z. B. nach dem Öffnen und ab und zu
  async probe() { const v = await connType(this.pc || (this.dc && this.dc.peerConnection)); if (v) this.via = v; return this.via || null; }
  onclose(fn) { this._close.push(fn); }
  // Rohdaten senden (in Stücken); die Reihenfolge aller Sendungen bleibt erhalten
  sendBuf(buf) {
    if (this.closed) return;
    this.q = this.q.then(() => { if (this.closed) return; for (const part of this.framer.split(buf)) this.raw(part); this.stats.out += buf.byteLength; this.stats.msgsOut++; }).catch(e => console.warn('Koop: Senden fehlgeschlagen', e));
  }
  send(obj) { this.sendBuf(encodeSync(obj)); }
  sendAsync(obj) { if (this.closed) return; const p = encode(obj); this.q = this.q.then(() => p).then(buf => { if (this.closed) return; for (const part of this.framer.split(buf)) this.raw(part); this.stats.out += buf.byteLength; this.stats.msgsOut++; }).catch(e => console.warn('Koop: Senden fehlgeschlagen', e)); }
  // Eingang: Stücke zusammensetzen, nacheinander entpacken
  received(data) {
    const buf = data instanceof ArrayBuffer ? data : data && data.buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : null;
    if (!buf) return;
    const whole = this.framer.join(buf);
    if (!whole) return;
    this.stats.in += whole.byteLength; this.stats.msgsIn++;
    this.rq = this.rq.then(() => decode(whole)).then(msg => { if (!this.closed && this._msg) this._msg(msg, whole.byteLength); }).catch(e => console.warn('Koop: Nachricht unlesbar', e));
  }
  ended() { if (this.closed) return; this.closed = true; for (const f of this._close) { try { f(); } catch (e) { console.error(e); } } }
}

class PeerConn extends Conn {
  constructor(dc) {
    super('peer');
    this.dc = dc;
    dc.on('data', (d) => this.received(d));
    dc.on('close', () => this.ended());
    dc.on('error', () => this.ended());
    // Der Datenkanal selbst meldet das Schließen zuverlässiger
    const ch = () => dc.dataChannel;
    const hook = () => { const c = ch(); if (c) c.addEventListener('close', () => this.ended()); };
    if (dc.open) hook(); else dc.on('open', hook);
    setTimeout(() => this.probe(), 1500);
  }
  raw(part) { this.dc.send(part); }
  busy() { const c = this.dc.dataChannel; return !!c && c.bufferedAmount > NET.busyBytes; }
  close() { if (this.closed) return; try { this.dc.close(); } catch (e) { /* egal */ } this.ended(); }
}

class RtcConn extends Conn {
  constructor(pc, ch) {
    super('manual');
    this.pc = pc; this.ch = ch;
    ch.binaryType = 'arraybuffer';
    ch.onmessage = (e) => this.received(e.data);
    ch.onclose = () => this.ended();
    pc.addEventListener('connectionstatechange', () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.ended(); });
    setTimeout(() => this.probe(), 1500);
  }
  raw(part) { if (this.ch.readyState === 'open') this.ch.send(part); }
  busy() { return this.ch.bufferedAmount > NET.busyBytes; }
  close() { if (this.closed) return; try { this.ch.close(); this.pc.close(); } catch (e) { /* egal */ } this.ended(); }
}

/* ---------- PeerJS ---------- */
// Peer mit fester ID öffnen. Liefert den Peer oder wirft { type } ('unavailable-id' = ID belegt, 'unreachable' = Dienst nicht erreichbar).
export function openPeer(id) {
  return new Promise((resolve, reject) => {
    if (netDebug.blockPeer) { setTimeout(() => reject({ type: 'unreachable', blocked: true }), 300); return; }
    let done = false, p;
    const fail = (type) => { if (done) return; done = true; try { p && p.destroy(); } catch (e) { /* egal */ } reject({ type }); };
    const timer = setTimeout(() => fail('unreachable'), NET.peerWait * 1000);
    try { p = new Peer(id, peerOptions()); } catch (e) { clearTimeout(timer); reject({ type: 'unreachable' }); return; }
    p.on('open', () => { if (done) return; done = true; clearTimeout(timer); resolve(p); });
    p.on('error', (e) => {
      if (!done) { clearTimeout(timer); fail(e && e.type === 'unavailable-id' ? 'unavailable-id' : 'unreachable'); }
    });
  });
}
// Host: eingehende Verbindungen (nur Datenkanäle) an fn(conn) geben, sobald sie offen sind
export function listen(peer, fn) {
  peer.on('connection', (dc) => {
    const c = new PeerConn(dc);
    if (dc.open) fn(c); else dc.on('open', () => fn(c));
  });
  // Verbindung zum Vermittlungsdienst verloren: neu verbinden (bestehende Datenkanäle bleiben)
  peer.on('disconnected', () => { setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { /* egal */ } }, 2000); });
}
// Mitspieler: mit dem Host (Lobby-Code) verbinden. Liefert eine offene Conn oder wirft { type } ('no-host', 'unreachable', 'timeout').
export function dial(peer, code) {
  return new Promise((resolve, reject) => {
    let done = false;
    const dc = peer.connect(PEER.prefix + code, { reliable: true, serialization: 'raw' });
    const timer = setTimeout(() => { if (!done) { done = true; try { dc.close(); } catch (e) { /* egal */ } reject({ type: 'timeout' }); } }, NET.peerWait * 1000 + 4000);
    const onErr = (e) => { if (done) return; done = true; clearTimeout(timer); reject({ type: e && e.type === 'peer-unavailable' ? 'no-host' : 'unreachable' }); };
    dc.on('open', () => { if (done) return; done = true; clearTimeout(timer); resolve(new PeerConn(dc)); });
    dc.on('error', onErr);
    peer.once('error', onErr);
  });
}

/* ---------- Manuell: Codes tauschen ---------- */
// Code = Typ-Kennung + Base64 (URL-sicher) der komprimierten Sitzungsbeschreibung (SDP mit allen ICE-Kandidaten)
async function zip(text, kind) {
  const buf = await encode({ t: kind, s: text });
  let bin = '';
  const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return (kind === 'offer' ? 'TWO-' : 'TWA-') + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function unzip(code, kind) {
  const c = String(code || '').replace(/\s+/g, '');
  const pre = kind === 'offer' ? 'TWO-' : 'TWA-';
  if (!c.startsWith(pre)) throw new Error(kind === 'offer' ? 'Das ist kein Angebots-Code (beginnt mit TWO-).' : 'Das ist kein Antwort-Code (beginnt mit TWA-).');
  const b = atob(c.slice(4).replace(/-/g, '+').replace(/_/g, '/')), u8 = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u8[i] = b.charCodeAt(i);
  const m = await decode(u8.buffer);
  if (!m || m.t !== kind || typeof m.s !== 'string') throw new Error('Der Code ist unvollständig.');
  return m.s;
}
// Warten, bis alle ICE-Kandidaten gesammelt sind (höchstens NET.gatherWait s)
function gathered(pc) {
  return new Promise(res => {
    if (pc.iceGatheringState === 'complete') { res(); return; }
    const t = setTimeout(res, NET.gatherWait * 1000);
    pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
}
// Host: Angebot erzeugen. Liefert { code, accept(answerCode) → Promise<Conn>, cancel() }
export async function manualOffer() {
  const pc = new RTCPeerConnection({ iceServers: iceServers() }), ch = pc.createDataChannel('tideworks', { ordered: true });
  await pc.setLocalDescription(await pc.createOffer());
  await gathered(pc);
  const code = await zip(pc.localDescription.sdp, 'offer');
  return {
    code,
    cancel: () => { try { pc.close(); } catch (e) { /* egal */ } },
    accept: async (answer) => {
      const sdp = await unzip(answer, 'answer');
      await pc.setRemoteDescription({ type: 'answer', sdp });
      return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Keine Verbindung zustande gekommen.')), 20000);
        const ok = () => { clearTimeout(t); resolve(new RtcConn(pc, ch)); };
        if (ch.readyState === 'open') ok(); else ch.onopen = ok;
      });
    }
  };
}
// Mitspieler: Angebot lesen, Antwort erzeugen. Liefert { code, conn: Promise<Conn> }
export async function manualAnswer(offer) {
  const sdp = await unzip(offer, 'offer');
  const pc = new RTCPeerConnection({ iceServers: iceServers() });
  const conn = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Keine Verbindung zustande gekommen.')), 60000);
    pc.ondatachannel = (e) => { const ch = e.channel; const ok = () => { clearTimeout(t); resolve(new RtcConn(pc, ch)); }; if (ch.readyState === 'open') ok(); else ch.onopen = ok; };
  });
  await pc.setRemoteDescription({ type: 'offer', sdp });
  await pc.setLocalDescription(await pc.createAnswer());
  await gathered(pc);
  return { code: await zip(pc.localDescription.sdp, 'answer'), conn, cancel: () => { try { pc.close(); } catch (e) { /* egal */ } } };
}
