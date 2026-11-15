/* =========================================================
   KOOP: MITSPIELER-SEITE
   createRemoteClient: dieselbe Schnittstelle wie simclient.js, aber ohne eigene Simulation. Kommandos gehen über
   die Sitzung an den Host (er prüft Berechtigungen), Tempo, Pause, Speichern und Laden gibt es hier nicht.
   remoteWorld/remoteSnap: Nachrichten des Hosts (sim/views.js) in den Spiegel übernehmen. Die Koop-Snapshots
   enthalten nur Änderungen; was fehlt, bleibt wie beim letzten Snapshot.
   Gefühlte Verzögerung: Bau-Kommandos legen sofort eine Vorschau an (pending), bis der Host sie bestätigt (ack).
   ========================================================= */
import { applyWorld, applySnapshot } from '../sim/snapshot.js';
import { FLOW_BUCKETS } from '../sim/stats.js';
import { BD, FLAT, PIPE } from '../data/buildings.js';
import { tkx, tky } from '../util/tiles.js';

export function createRemoteClient(sendCmds) {
  let seq = 0;
  return {
    remote: true,
    get mode() { return 'remote'; },
    init() {}, demo() {}, reset() {}, pause() {}, resume() {}, setSpeed() {},
    newGame: async () => false, load: async () => false, save: async () => null, importSave: async () => false,
    send: (...cmds) => { seq++; trackPending(cmds, seq); sendCmds(cmds, seq); return seq; },
    get seq() { return seq; }
  };
}

/* ---------- Vorschau bis zur Bestätigung ---------- */
export const pending = [];      // { t, x, y, d, seq, at }
const PEND_MAX = 8000;          // ms, danach verschwindet die Vorschau auch ohne Antwort
function trackPending(cmds, seq) {
  const at = performance.now();
  for (const c of cmds) {
    if (!c || !BD[c.t]) continue;
    if (c.type === 'place') pending.push({ t: c.t, x: c.x, y: c.y, d: c.d | 0, seq, at });
    else if (c.type === 'paint' && (FLAT.has(c.t) || PIPE.has(c.t))) {
      const to = c.to;
      if (to == null || to < 0) continue;
      // Zug von from nach to: jedes Feld dazwischen (gerade Linie, wie die Simulation)
      let x = c.from >= 0 ? tkx(c.from) : tkx(to), y = c.from >= 0 ? tky(c.from) : tky(to);
      const tx = tkx(to), ty = tky(to);
      for (let n = 0; n < 200; n++) {
        if (c.from < 0 || n > 0) pending.push({ t: c.t, x, y, d: c.d | 0, seq, at, flat: true });
        if (x === tx && y === ty) break;
        if (x !== tx) x += tx > x ? 1 : -1; else y += ty > y ? 1 : -1;
      }
    }
  }
}
export function ackPending(ack) {
  const t = performance.now();
  for (let i = pending.length - 1; i >= 0; i--) if (pending[i].seq <= ack || t - pending[i].at > PEND_MAX) pending.splice(i, 1);
}
export function clearPending() { pending.length = 0; }

/* ---------- Nachrichten des Hosts in den Spiegel ---------- */
// Teile, die der Host nur nach Änderungen schickt (sim/views.js TOP)
const TOP = ['ack', 'speed', 'halt', 'pipeVer', 'time', 'xp', 'xpTotal', 'goal', 'gdone', 'nextId', 'tech', 'stats', 'found', 'mapped', 'coins', 'coinsTotal', 'wonder', 'unl', 'story', 'npc', 'dive', 'relics', 'ev', 'evMode', 'orders', 'players', 'mode', 'RT', 'topoVer', 'wireVer', 'trade',
  'homes', 'wfirst', 'lh', 'perms'];   // Getrennte Inseln

export function remoteWorld(m, w) {
  const ui0 = m._net && m.state ? m.state.ui : null;   // eigene Einstellungen (eingeklappte Panels …) bleiben beim Wiederverbinden
  applyWorld(m, { kind: 'world', seed: w.seed, v: w.v, ui: ui0, trees: w.trees, fog: w.fog, pipes: w.pipes, homes: w.homes, npcs: w.npcs || null });
  m.state.mode = w.mode || 'shared';
  m.me = w.me || null;   // eigene Spieler-ID (sim/state.js actor)
  m._net = { top: {}, isl: {}, soll: {}, ships: new Map(), order: [], at: 0, dur: 100 };
  m.vfIds = null;
  clearPending();
}
export function remoteSnap(m, s, now) {
  const N = m._net || (m._net = { top: {}, isl: {}, soll: {}, ships: new Map(), order: [], at: 0, dur: 100 });
  for (const k of TOP) { if (k in s) N.top[k] = s[k]; else s[k] = N.top[k]; }
  // Schiffe: Reihenfolge (nach Änderung), geänderte Felder einsetzen
  if (s.shipIds) { N.order = s.shipIds; for (const id of [...N.ships.keys()]) if (!N.order.includes(id)) N.ships.delete(id); }
  for (const d of s.shipD || []) {
    const o = N.ships.get(d.id) || {};
    for (const k in d) if (k !== '$del') o[k] = d[k];
    for (const k of d.$del || []) delete o[k];
    N.ships.set(d.id, o);
  }
  s.ships = N.order.filter(id => N.ships.has(id)).map(id => Object.assign({}, N.ships.get(id)));
  if (!s.trade) s.trade = { due: {}, list: [] };
  // weggelassene leere Teile
  for (const k of ['bUpd', 'bDel', 'fog', 'pipes', 'events']) if (!s[k]) s[k] = [];
  if (!s.trK) { s.trK = new Float64Array(0); s.trV = new Float32Array(0); }
  if (!s.vfIt) { s.vfIt = new Uint8Array(0); s.vfP = new Uint8Array(0); }
  if (!s.RT) s.RT = { popSup: {}, popAll: {} };
  if (s.isl) Object.assign(N.isl, s.isl);
  s.isl = N.isl;
  // Statistik: geänderte Fächer einsetzen
  if (s.flowB) {
    const f = m.state.flow;
    for (const [k, i, bk] of s.flowB) (f.isl[k] || (f.isl[k] = new Array(FLOW_BUCKETS).fill(null)))[i] = bk;
    s.flow = f;
    Object.assign(N.soll, s.soll || {});
    s.soll = N.soll;
  }
  if (s.market || s.coinLog) { s.market = s.market || m.state.market; s.coinLog = s.coinLog || m.state.coinLog; }
  // Abstand der Snapshots (gleitender Mittelwert) als Dauer für die Interpolation
  if (s.steps > 0) {
    if (N.at) N.dur = Math.min(400, Math.max(50, N.dur * 0.8 + (now - N.at) * 0.2));
    N.at = now; s.dur = N.dur;
  }
  const events = applySnapshot(m, s, now);
  ackPending(s.ack || 0);
  return events;
}
