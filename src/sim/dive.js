/* =========================================================
   TAUCHERGLOCKE UND TAUCHSPOTS (seit 0.19.0; alle Zahlen in data/dive.js)
   Zustand state.dive gehört zur Welt (nicht zu einem Spieler) und wird im Koop vom Host verteilt:
     state.dive = { bell, spot, next, busy, total, n, story }
       bell  – { ship (Schiffs-ID), by (wer montiert hat), t } | null: die Glocke gibt es nur einmal je Welt
       spot  – { id, x, y, kind ('normal'|'story'), find (Story-Fund oder null), t (erschienen) } | null: immer höchstens EIN Spot
       next  – Spielzeit, ab der ein neuer Spot erscheinen darf (null = noch keine Glocke)
       busy  – { pid, ship, spot (ID), t } | null: es taucht immer nur einer gleichzeitig
       total – Tauchgänge mit Ergebnis (auch erfolglose), n = Zähler für den Zufall
       story – wartender Story-Spot { find } | null (legt ein späterer Thread mit queueStorySpot an)
   Der Zähler für erfolgreiche Tauchgänge steht im Story-Zustand (state.story.dives), weil die Geschichte ihn braucht
   (Karte der alten Welt nach einigen Tauchgängen).
   Ablauf und Schnittstelle:
     mountBell (Kommando, Werft) → Glocke am Schiff (s.bell = 1)
     diveTick (1/s): Spot anlegen, sobald next erreicht ist; hängende Tauchgänge nach DIVE.timeout abbrechen
     diveStart (Kommando, Schiff über dem Spot) → busy, Ereignis diveStart an alle; die Oberfläche des Tauchers ruft
       startDive(spot) aus ui/dive.js (bis zum Minispiel ein Platzhalter) und schickt dann diveEnd { ok }
     diveEnd → Beute (zuerst Laderaum, Rest Lager der Heimatinsel), Spot weg, Pause, Story-Auslöser dive (und find:<find>);
       misslingt der Story-Tauchgang „Pumpwerk“, bleibt sein Spot liegen (DIVE_PUMP.keep)
   Abfragen (diveWhy, mountWhy, overSpot …) laufen auch auf dem Spiegel. Kein DOM-Zugriff.
   ========================================================= */
import { BELL, DIVE, SPOT_KINDS, DIVE_LOOT, DIVE_GAME, DIVE_JUNK, DIVE_PUMP, freshDive } from '../data/dive.js';
export { freshDive };
import { ITEMS } from '../data/items.js';
import { hash2 } from '../util/math.js';
import { tkx, tky, ckx, cky, CS } from '../util/tiles.js';
import { G_WATER } from '../config.js';
import { afford, pay, missingText, isUnlocked, ownerOf, mine, fogOf, homeIsl, islData, capOf, actor, playerName } from './state.js';
import { addCargo, homePoint } from './ships.js';
import { storyEvent } from './story.js';

// Geladenen Zustand prüfen (save/serialize.js). Ein laufender Tauchgang wird beim Laden nicht fortgesetzt (Spot bleibt).
export function cleanDive(raw, ships) {
  const D = freshDive();
  if (!raw || typeof raw !== 'object') return D;
  const num = (v) => Number.isFinite(+v) ? +v : null;
  if (raw.bell && ships.some(s => s.id === raw.bell.ship)) D.bell = { ship: raw.bell.ship, by: typeof raw.bell.by === 'string' ? raw.bell.by : 'host', t: num(raw.bell.t) || 0 };
  const P = raw.spot;
  if (P && Number.isInteger(P.x) && Number.isInteger(P.y) && SPOT_KINDS[P.kind]) D.spot = { id: P.id | 0, x: P.x, y: P.y, kind: P.kind, find: typeof P.find === 'string' ? P.find : null, t: num(P.t) || 0 };
  D.next = num(raw.next);
  D.total = Math.max(0, raw.total | 0); D.n = Math.max(0, raw.n | 0);
  D.story = raw.story && typeof raw.story.find === 'string' ? { find: raw.story.find } : null;
  return D;
}
// Glocke am Schiff: Flag am Schiff passend zum Weltzustand (nach dem Laden)
export function syncBell(g) { const D = diveOf(g); for (const s of g.state.ships) { if (D && D.bell && D.bell.ship === s.id) s.bell = 1; else delete s.bell; } }

/* ---------- Abfragen (auch auf dem Spiegel) ---------- */
export const diveOf = (g) => (g.state && g.state.dive) || null;
export const bellBuilt = (g) => !!(diveOf(g) && diveOf(g).bell);
export const bellShip = (g) => { const D = diveOf(g); return D && D.bell ? g.state.ships.find(s => s.id === D.bell.ship) || null : null; };
export const diveSpot = (g) => { const D = diveOf(g); return D ? D.spot : null; };
export const diveBusy = (g) => { const D = diveOf(g); return D ? D.busy : null; };
// Abstand des Schiffs zum Spot (Felder, Infinity ohne Spot)
export function spotDist(g, s) { const P = diveSpot(g); return P && s ? Math.hypot(s.x - (P.x + 0.5), s.y - (P.y + 0.5)) : Infinity; }
// Liegt das Schiff still über dem Spot?
export const overSpot = (g, s) => !!s && s.st !== 'sail' && spotDist(g, s) <= DIVE.over;
// Grund, warum das Schiff s jetzt nicht tauchen kann ('' = geht)
export function diveWhy(g, s, pid) {
  const D = diveOf(g);
  if (!s || !s.bell || !D || !D.bell || D.bell.ship !== s.id) return 'Dieses Schiff hat keine Taucherglocke.';
  if (!mine(g, s, pid)) return `${s.name} gehört ${playerName(g, ownerOf(s))}.`;
  if (D.busy) return D.busy.ship === s.id ? 'Die Glocke ist schon unten.' : `${playerName(g, D.busy.pid)} taucht gerade.`;
  if (!D.spot) return 'Gerade gibt es keinen Tauchspot. Halte Ausschau nach Blasen im Wasser.';
  if (s.st === 'sail') return spotDist(g, s) <= DIVE.over ? 'Das Schiff muss erst anhalten.' : 'Fahr erst zum Tauchspot (Blasen im Wasser).';
  if (spotDist(g, s) > DIVE.over) return 'Fahr erst zum Tauchspot (Blasen im Wasser).';
  return '';
}
// Liegt das Schiff am Anleger der Werft b?
export function atWerft(g, b, s) {
  if (!b || b._dock == null || !s) return false;
  return s.st !== 'sail' && Math.hypot(s.x - (tkx(b._dock) + 0.5), s.y - (tky(b._dock) + 0.5)) <= BELL.range;
}
// Grund, warum die Werft b die Glocke jetzt nicht an das Schiff s montieren kann ('' = geht; ohne s: allgemeine Gründe)
export function mountWhy(g, b, s, pid) {
  if (!isUnlocked(g, 'glocke')) return 'Den Bauplan der Taucherglocke bekommst du von Brann.';
  if (bellBuilt(g)) return 'Die Taucherglocke ist schon montiert. Es gibt nur eine.';
  if (!afford(g, b.isl, BELL.cost)) return `Im Lager dieser Insel fehlen: ${missingText(g, b.isl, BELL.cost)}.`;
  if (!s) return '';
  if (!mine(g, s, pid)) return `${s.name} gehört ${playerName(g, ownerOf(s))}.`;
  if (!atWerft(g, b, s)) return `${s.name} muss erst am Anleger der Werft liegen.`;
  return '';
}

/* ---------- Kommandos ---------- */
const fail = (g, msg) => g.events.push({ type: 'fail', msg });
// mountBell { id: Werft, ship }: Teile aus dem Inselinventar, Glocke an das Schiff
export function mountBell(g, b, shipId) {
  if (!b || b.t !== 'werft') return;
  const s = g.state.ships.find(x => x.id === +shipId), why = mountWhy(g, b, s || null) || (!s ? 'Wähle ein Schiff.' : '');
  if (why) { fail(g, why); return; }
  const D = g.state.dive || (g.state.dive = freshDive());
  pay(g, b.isl, BELL.cost, 'schiffbau');
  D.bell = { ship: s.id, by: actor(g), t: g.state.time };
  s.bell = 1;
  if (D.next == null) D.next = g.state.time + DIVE.first;
  g.events.push({ type: 'bellMounted', ship: s.id, name: s.name, pid: actor(g), to: '*' });
}
// diveStart { ship }
export function diveStart(g, c) {
  const D = diveOf(g), s = g.state.ships.find(x => x.id === +c.ship);
  const why = diveWhy(g, s);
  if (why) { fail(g, why); return; }
  D.busy = { pid: actor(g), ship: s.id, spot: D.spot.id, t: g.state.time };
  // Allererster Tauchgang: vorher die Szene cs_abstieg (nur beim Taucher). Der Host merkt sie sich gleich als gesehen,
  // damit sie auch im Koop (Mitspieler taucht) nur einmal läuft.
  const S = g.state.story, intro = S ? !S.seen.cs_abstieg : D.total === 0;
  if (S && intro) S.seen.cs_abstieg = g.state.time || 1;
  g.events.push({ type: 'diveStart', pid: actor(g), who: playerName(g, actor(g)), ship: s.id, name: s.name, spot: Object.assign({}, D.spot), intro, act: S ? S.act : 3, to: '*' });
}
// diveEnd { ok (gefunden), found (optional, Story-Fund aus dem Minispiel), junk (Kleinkram aus Haufen), cancel }: nur, wer gerade taucht
export function diveEnd(g, c) {
  const D = diveOf(g), B = D && D.busy;
  if (!B || B.pid !== actor(g)) return;
  finish(g, !c.cancel && c.ok !== false, !!c.cancel, cleanJunk(c.junk));
}
// Kleinkram aus dem Minispiel prüfen: nur Waren aus DIVE_JUNK, höchstens max je Haufen, höchstens so viele Haufen, wie es geben kann
export function cleanJunk(raw) {
  if (!Array.isArray(raw)) return [];
  const maxPiles = Math.max(...Object.values(DIVE_GAME.byAct).map(a => a.piles[1])), out = {};
  for (const o of raw.slice(0, maxPiles)) {
    const J = o && DIVE_JUNK.find(j => j.it === o.it), n = o ? Math.floor(+o.n) : 0;
    if (!J || !(n > 0)) continue;
    out[J.it] = (out[J.it] || 0) + Math.min(n, J.n[1]);
  }
  return Object.entries(out).map(([it, n]) => ({ it, n }));
}
// Tauchgang abschließen: ok = mit Fund (Beute), sonst ohne Fund; cancel = abgebrochen (Spot bleibt, zählt nicht).
// junk = Kleinkram aus Haufen (geprüft), bleibt auch ohne Fund.
function finish(g, ok, cancel, junk = []) {
  const D = diveOf(g), B = D.busy, st = g.state, s = st.ships.find(x => x.id === B.ship), P = D.spot && D.spot.id === B.spot ? D.spot : null;
  D.busy = null;
  if (cancel || !P) { g.events.push({ type: 'diveResult', pid: B.pid, ship: B.ship, name: s ? s.name : '', cancel: true, to: '*' }); return; }
  D.total++;
  const got = [], home = [], lost = [], main = ok && s ? rollLoot(g, SPOT_KINDS[P.kind].loot) : [], small = s ? junk : [];
  // Beute zuerst in den Laderaum, Rest ins Lager der Heimatinsel (bis zur Kapazität)
  for (const L of main.concat(small)) {
    const n = addCargo(g, s, L.it, L.n);
    if (n) got.push({ it: L.it, n });
    let rest = L.n - n;
    if (rest > 0) {
      const k = homeIsl(g, ownerOf(s)), inv = islData(g, k).inv, m = Math.max(0, Math.min(rest, Math.floor(capOf(g, k) - (inv[L.it] || 0))));
      if (m) { inv[L.it] = (inv[L.it] || 0) + m; home.push({ it: L.it, n: m }); rest -= m; }
      if (rest > 0) lost.push({ it: L.it, n: rest });
    }
  }
  if (ok && s && st.story) st.story.dives = (st.story.dives | 0) + 1;
  // Spot verschwindet, nach der Pause kommt ein neuer. Ausnahme (0.21.0): ein misslungener Story-Tauchgang „Pumpwerk“ lässt den Spot liegen.
  const keep = !ok && P.find === 'pumpwerk' && DIVE_PUMP.keep;
  D.n++;
  if (!keep) {
    D.spot = null;
    const [a, b] = DIVE.pause;
    D.next = st.time + a + Math.floor(hash2(D.n, 31, st.seed + 8101) * (b - a + 1));
  }
  g.events.push({ type: 'diveResult', pid: B.pid, ship: B.ship, name: s ? s.name : '', ok, kind: P.kind, find: ok ? P.find : null, keep, got, home, lost, main, small,
    dives: st.story ? st.story.dives | 0 : D.total, to: '*' });
  storyEvent(g, 'surface');   // Glocke wieder oben (auch ohne Fund): Branns Satz nach dem ersten Tauchgang
  if (ok) {
    storyEvent(g, 'dive');
    if (P.find) storyEvent(g, 'find', P.find);
  }
}
// Beute würfeln (data/dive.js DIVE_LOOT): [{ it, n }]
export function rollLoot(g, table) {
  const T = DIVE_LOOT[table];
  if (!T) return [];
  const D = diveOf(g), seed = g.state.seed + 8209, r = (a) => hash2(D.n * 17 + a, D.total, seed);
  const [lo, hi] = T.rolls, rolls = lo + Math.floor(r(1) * (hi - lo + 1)), W = T.list.reduce((a, e) => a + e.w, 0), out = {};
  for (let i = 0; i < rolls; i++) {
    let x = r(10 + i * 3) * W, e = T.list[0];
    for (const o of T.list) { if (x < o.w) { e = o; break; } x -= o.w; }
    const n = e.n[0] + Math.floor(r(11 + i * 3) * (e.n[1] - e.n[0] + 1));
    if (ITEMS[e.it] && n > 0) out[e.it] = (out[e.it] || 0) + n;
  }
  return Object.entries(out).map(([it, n]) => ({ it, n }));
}

/* ---------- Tauchspots anlegen ---------- */
// Platz für einen Spot: Meer, DIVE.coast Felder rundum Wasser, DIVE.edge Felder rundum aufgedeckt
function spotOk(g, F, x, y) {
  const W = g.W, c = DIVE.coast, e = DIVE.edge;
  if (!W.ocean(x, y)) return false;
  for (let dy = -c; dy <= c; dy++) for (let dx = -c; dx <= c; dx++) if (W.rawGround(x + dx, y + dy) !== G_WATER) return false;
  for (let dy = -e; dy <= e; dy++) for (let dx = -e; dx <= e; dx++) if (!F.get(x + dx, y + dy)) return false;
  return true;
}
// Zufälligen Platz im aufgedeckten Meer suchen (im Nebel des Glocken-Besitzers). near/far um die Mitte der Heimatinsel.
export function pickSpot(g, salt) {
  const D = diveOf(g), s = bellShip(g), F = fogOf(g, s ? ownerOf(s) : undefined), H = homePoint(g, s), st = g.state;
  const keys = [];
  for (const k of F.m.keys()) if (F.coverage(k)) keys.push(k);
  if (!keys.length) return null;
  const dist = (k) => Math.hypot((ckx(k) + 0.5) * CS - H.x, (cky(k) + 0.5) * CS - H.y);
  const inner = keys.filter(k => dist(k) <= DIVE.far + CS);
  const r = (a, b) => hash2(D.n * 7 + a, (salt | 0) * 13 + b, st.seed + 8311);
  for (const pool of [inner, keys]) {
    if (!pool.length) continue;
    for (let t = 0; t < DIVE.tries; t++) {
      const k = pool[Math.floor(r(t, 1) * pool.length)], x = ckx(k) * CS + Math.floor(r(t, 2) * CS), y = cky(k) * CS + Math.floor(r(t, 3) * CS), d = Math.hypot(x - H.x, y - H.y);
      if (d < DIVE.near || (pool === inner && d > DIVE.far)) continue;
      if (spotOk(g, F, x, y)) return { x, y };
    }
  }
  return null;
}
function placeSpot(g, at) {
  const D = diveOf(g), Q = D.story;
  D.spot = { id: g.state.nextId++, x: at.x, y: at.y, kind: Q ? 'story' : 'normal', find: Q ? Q.find : null, t: g.state.time };
  D.story = null;
  g.events.push({ type: 'diveSpot', x: at.x, y: at.y, kind: D.spot.kind, to: '*' });
}
// Nächster Spot als Story-Spot mit Fund find (z. B. 'karte', 'pumpwerk'); liegt gerade ein normaler Spot, wird er ersetzt
export function queueStorySpot(g, find) {
  const D = diveOf(g);
  if (!D || typeof find !== 'string') return false;
  D.story = { find };
  if (D.spot && D.spot.kind === 'normal' && !D.busy) { D.spot = null; D.next = g.state.time; }
  return true;
}

// Karte der alten Welt: In Akt 3 ist nach DIVE_GAME.karteAfter erfolgreichen Tauchgängen der nächste Spot ein Story-Spot
// mit der Alten Karte (Minispiel: Suchen, Ziel „Alte Karte“). Bis sie gefunden ist, kommt immer wieder ein solcher Spot.
function karteDue(g) {
  const D = diveOf(g), S = g.state.story;
  if (!S || S.act !== 3 || S.flags.karte_gefunden || (S.dives | 0) < DIVE_GAME.karteAfter || D.busy) return;
  if ((D.story && D.story.find === 'karte') || (D.spot && D.spot.find === 'karte')) return;
  queueStorySpot(g, 'karte');
}

// Pumpwerk (seit 0.21.0): In Akt 4 ist nach Leuchtturm Stufe 3 der nächste Spot ein Story-Spot mit dem zerstörten Pumpwerk
// (Minispiel: Tor aufschweißen, dann in der Halle das Brecheisen suchen). Er bleibt, bis der Fund gemacht ist.
function pumpwerkDue(g) {
  const D = diveOf(g), S = g.state.story;
  if (!S || S.act !== 4 || S.flags.pumpe_gefunden || ((g.state.wonder && g.state.wonder.ph) | 0) < 3 || D.busy) return;
  if ((D.story && D.story.find === 'pumpwerk') || (D.spot && D.spot.find === 'pumpwerk')) return;
  queueStorySpot(g, 'pumpwerk');
}

/* ---------- Ablauf (einmal je Sekunde, sim/sim.js) ---------- */
export function diveTick(g) {
  const D = diveOf(g), st = g.state;
  if (!D || !D.bell) return;
  if (!bellShip(g)) { D.bell = null; D.busy = null; return; }   // Schiff gibt es nicht mehr
  if (D.busy && st.time - D.busy.t > DIVE.timeout) finish(g, false, true);
  karteDue(g);
  pumpwerkDue(g);
  if (!D.spot && D.next != null && st.time >= D.next) {
    const at = pickSpot(g, Math.floor(st.time));
    if (at) placeSpot(g, at);
    else D.next = st.time + 5;   // noch kein Platz (zu wenig aufgedeckt): später wieder versuchen
  }
}

/* ---------- Debug (nur Host) ---------- */
// op 'count': Zähler erfolgreicher Tauchgänge auf n · 'intro': cs_abstieg beim nächsten Tauchgang wieder zeigen ·
// op 'parts': beide Teile ins Lager der Heimatinsel · 'spot': Spot sofort (x, y = in der Nähe davon, sonst zufällig) ·
// 'story': nächster Spot als Story-Spot (find) · 'over': Taucherschiff über den Spot setzen · 'mount': Glocke an Schiff ship (oder das erste) ohne Kosten · 'reset': Glocke und Spot weg
export function diveDebug(g, c) {
  const st = g.state, D = st.dive || (st.dive = freshDive()), msg = (m) => g.events.push({ type: 'diveDebug', msg: m, to: '*' });
  switch (c.op) {
    case 'parts': {
      const k = homeIsl(g), inv = islData(g, k).inv;
      for (const it in BELL.cost) inv[it] = Math.max(inv[it] || 0, BELL.cost[it]);
      msg('Glockenseil und Messingglocke liegen im Lager der Heimatinsel.'); return;
    }
    case 'mount': {
      const s = st.ships.find(x => x.id === +c.ship) || st.ships[0];
      if (!s) { fail(g, 'Debug: kein Schiff.'); return; }
      for (const o of st.ships) delete o.bell;
      D.bell = { ship: s.id, by: actor(g), t: st.time }; s.bell = 1;
      if (D.next == null) D.next = st.time + DIVE.first;
      g.events.push({ type: 'bellMounted', ship: s.id, name: s.name, pid: actor(g), to: '*' }); return;
    }
    case 'spot': {
      if (!D.bell) { fail(g, 'Debug: Erst die Glocke montieren (tideworks.dive(\'mount\')).'); return; }
      if (D.busy) { fail(g, 'Debug: Gerade taucht jemand.'); return; }
      let at = null;
      if (Number.isFinite(+c.x) && Number.isFinite(+c.y)) {   // in der Nähe von (x, y): Spirale nach außen
        const F = fogOf(g, ownerOf(bellShip(g))), x0 = Math.floor(+c.x), y0 = Math.floor(+c.y);
        for (let r = 0; r <= 60 && !at; r++) for (let dy = -r; dy <= r && !at; dy++) for (let dx = -r; dx <= r && !at; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (spotOk(g, F, x0 + dx, y0 + dy)) at = { x: x0 + dx, y: y0 + dy };
        }
      }
      if (!at) at = pickSpot(g, Math.floor(st.time) + 77);
      if (!at) { fail(g, 'Debug: Kein passender Platz im aufgedeckten Meer.'); return; }
      placeSpot(g, at); return;
    }
    case 'over': {   // Taucherschiff direkt über den Spot setzen
      const s = bellShip(g);
      if (!s || !D.spot) { fail(g, 'Debug: Glocke oder Spot fehlt.'); return; }
      s.x = D.spot.x + 0.5; s.y = D.spot.y + 0.5; s.st = 'idle'; s.dest = ''; s.path = null; s._pv = (s._pv || 0) + 1; s.mt = null;
      if (s.route) s.route.paused = true;
      return;
    }
    case 'story': queueStorySpot(g, String(c.find || 'karte')); msg(`Nächster Spot ist ein Story-Spot (${String(c.find || 'karte')}).`); return;
    case 'reset': for (const o of st.ships) delete o.bell; st.dive = freshDive(); msg('Taucherglocke und Tauchspot zurückgesetzt.'); return;
    case 'count': {   // Zähler erfolgreicher Tauchgänge setzen (Karte der alten Welt testen)
      if (!st.story) { fail(g, 'Debug: Diese Welt hat keine Geschichte.'); return; }
      st.story.dives = Math.max(0, c.n | 0); msg(`Erfolgreiche Tauchgänge: ${st.story.dives}.`); return;
    }
    case 'intro': if (st.story) delete st.story.seen.cs_abstieg; msg('Der nächste Tauchgang beginnt wieder mit „Abstieg“.'); return;
    default: fail(g, 'Debug: unbekannte Tauch-Aktion.');
  }
}
