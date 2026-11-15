/* =========================================================
   FOLGEN DER ENTSCHEIDUNG AM LEUCHTTURM (seit 0.23.0; Daten: data/npctrade.js ENDINGS und NPC_TRADE.rat, Story: docs/STORY.md „Enden“)
   applyEnding(g, c) läuft einmal auf dem Host, direkt wenn storyChoice die Entscheidung speichert (sim/story.js). Alles, was danach
   gilt, steht im Spielzustand und wird mit ihm gespeichert und im Koop verteilt:
     state.story.choice   'a' | 'b' (schon seit 0.22.0)
     state.story.fest     Spielzeit, bis zu der Pfahldorf und Werkstattbucht feiern (nur Ende A), sonst fehlt das Feld
     Gebäude b.ruin       'brand' (Ende A, Goldberg) | 'sturm' (Ende B, Pfahldorf und Werkstattbucht): Ruine, kein Licht, kein Rauch
     NPC-Steg npc 'rat'   Steg des Inselrats am Goldberg (Ende A)
     story.flags.npc_rat  der Inselrat ist ein Handelspartner (Ende A)
   Ende A: Aurels Dorf brennt (Villen als Brandruinen, der Rest verschwindet), sein Steg wird dein Hauptkontor, der Inselrat
     bekommt einen neuen Steg auf der Insel. Ole und Brann: Ruf vertraut, Rabatt, besseres Angebot, ein Dorffest.
   Ende B: Pfahldorf und Werkstattbucht werden Ruinen (Laternen weg), ihre Stege bleiben als Pfähle stehen, ohne Figur und Handel.
     Aurels Steg wird dein Hauptkontor, seine Dorfgebäude gehören dir (Villen werden Bürgerhäuser), Aurel bleibt als Figur am Kontor.
   Koop: Die Geschichte gibt es nur bei Einzelspieler und Gemeinsamer Insel (Getrennte Inseln haben keine). Übernommene Gebäude und
   das neue Kontor gehören deshalb wie alle gemeinsamen Gebäude dem Host (by = owner = 'host', wie die Migration auf Version 13).
   Abfragen (npcGone, npcIslFree, ruinOf) laufen auch auf dem Spiegel. Kein DOM-Zugriff.
   ========================================================= */
import { ENDINGS, NPC_TRADE } from '../data/npctrade.js';
import { NPC_ORDER, npcPid } from '../data/npcs.js';
import { BD } from '../data/buildings.js';
import { BUILDABLE, G_MOUNT, G_LAVA } from '../config.js';
import { HOST_PID, islData, homeIsl, recount } from './state.js';
import { addBuilding, revealAround } from './buildings.js';
import { npcPort } from './villages.js';
import { stegLine, STEG_MAX, bldTiles } from './kontor.js';

export const endingOf = (g) => (g.state && g.state.story && g.state.story.choice) || null;
// Handelt dieses Volk nicht mehr? (Aurel nach jedem Ende, Ole und Brann nach Ende B; der Inselrat gibt es nur nach Ende A)
export function npcGone(g, id) {
  const c = endingOf(g);
  if (id === 'rat') return c !== 'a';
  if (!c) return false;
  return id === 'aurel' || c === 'b';
}
// Insel k ist eine frühere NPC-Insel, die jetzt dem Spieler gehört (Goldberg nach jedem Ende): Bauen erlaubt
export const npcIslFree = (g, k) => !!endingOf(g) && !!g.W && g.W.npcOf(k) === 'aurel';
// Feiern Pfahldorf und Werkstattbucht gerade? (Ende A, einmal)
export const festOn = (g) => { const S = g.state && g.state.story; return !!(S && S.fest && g.state.time < S.fest); };
// Steht Aurel als Figur am Kontor des Goldbergs? (Ende B)
export const aurelStays = (g) => endingOf(g) === 'b';

/* ---------- Gebäude umbauen (NPC-Gebäude sind fest: removeBuilding lehnt sie ab) ---------- */
function drop(g, b) {
  for (const p of bldTiles(b)) g.bmap.set(p.x, p.y, 0);
  g.blds.delete(b.id);
  if (b.t === 'npchafen') g.shipPathCache.clear();
  g.topoVer++;
}
const villageOf = (g, id) => [...g.blds.values()].filter(b => b.npc === id && b.by === npcPid(id) && b.t !== 'npchafen');
// Routen-Stopps an einem verschwundenen bzw. stillgelegten Steg entfernen
function dropStops(g, ids) {
  for (const s of g.state.ships) {
    const R = s.route;
    if (!R || !Array.isArray(R.stops)) continue;
    const n = R.stops.length;
    R.stops = R.stops.filter(st => !ids.has(st.kontor));
    if (R.stops.length === n) continue;
    if (!R.stops.length) { s.route = null; if (s.st === 'dock' || s.st === 'wait') s.st = 'idle'; s.dest = ''; continue; }
    R.idx = Math.min(R.idx | 0, R.stops.length - 1);
  }
}
// Aurels Steg → Hauptkontor des Spielers an derselben Stelle (gleicher Steg, gleicher Anleger)
function stegToKontor(g, P) {
  drop(g, P);
  const b = { id: g.state.nextId++, t: 'kontor', x: P.x, y: P.y, d: P.d, sl: P.sl, isl: P.isl, buf: {}, out: {}, prog: 0, acc: 0, by: HOST_PID, owner: HOST_PID, ft: g.state.time };
  islData(g, P.isl);
  addBuilding(g, b);
  revealAround(g, b);
  return b;
}
// Platz für einen 3×3-Steg auf Insel k: Körper frei (1 Feld Abstand), Steg 1–STEG_MAX Felder bis zum Meer.
// Bevorzugt wird ein Platz mindestens minD Felder vom Kontor K entfernt, davon der nächste.
function councilSpot(g, k, K) {
  const I = g.W.island(k), W = g.W;
  const free = (x, y) => {
    for (let dy = -1; dy < 4; dy++) for (let dx = -1; dx < 4; dx++) {
      const xx = x + dx, yy = y + dy, inside = dx >= 0 && dy >= 0 && dx < 3 && dy < 3;
      if (g.bmap.get(xx, yy)) return false;
      if (inside && (W.il(xx, yy) !== k || !landOk(g, xx, yy))) return false;
    }
    return true;
  };
  const stegLen = (x, y, d) => {
    const L = stegLine('npchafen', x, y, d, STEG_MAX + 1);
    for (let i = 0; i <= STEG_MAX; i++) {
      const p = L.tiles[i];
      if (W.ocean(p.x, p.y)) return i;
      if (W.il(p.x, p.y) !== k || g.bmap.get(p.x, p.y) || !landOk(g, p.x, p.y)) return 0;
    }
    return 0;
  };
  let best = null, bs = Infinity;
  const kx = K ? K.x + 1.5 : I.x, ky = K ? K.y + 1.5 : I.y;
  for (let y = I.y0; y < I.y0 + I.h - 2; y++) for (let x = I.x0; x < I.x0 + I.w - 2; x++) {
    const dist = Math.hypot(x + 1.5 - kx, y + 1.5 - ky);
    const sc = dist < 7 ? 1000 + dist : dist;
    if (sc >= bs) continue;
    if (!free(x, y)) continue;
    for (let d = 0; d < 4; d++) { const sl = stegLen(x, y, d); if (sl) { best = { x, y, d, sl }; bs = sc; break; } }
  }
  return best;
}
function landOk(g, x, y) { const gr = g.W.gr(x, y); return !g.W.ocean(x, y) && !!BUILDABLE[gr] && gr !== G_MOUNT && gr !== G_LAVA; }

function relic(g, it) { const inv = islData(g, homeIsl(g)).inv; inv[it] = Math.max(1, (inv[it] || 0) + 1); }

/* ---------- Die Folgen ---------- */
export function applyEnding(g, c) {
  const S = g.state.story, E = ENDINGS[c], gone = new Set();
  if (!S || !E) return;
  const k = g.W.npcIsl('aurel'), P = npcPort(g, 'aurel'), N = g.state.npc || {};
  // Aurel handelt nicht mehr (beide Enden): Aufträge und Verträge fallen weg
  if (N.aurel) { N.aurel.orders = []; N.aurel.deals = []; }
  if (P) gone.add(P.id);
  let K = null;
  if (c === 'a') {
    // Goldberg: Villen bleiben als Brandruinen (gehören dir, abreißbar), alles andere brennt nieder
    for (const b of villageOf(g, 'aurel')) {
      if (E.keep.includes(b.t)) { b.ruin = 'brand'; b.by = HOST_PID; b.owner = HOST_PID; }
      else drop(g, b);
    }
    if (P) K = stegToKontor(g, P);
    // Inselrat: neuer Steg auf dem Goldberg
    if (k >= 0) {
      const sp = councilSpot(g, k, K);
      if (sp) addBuilding(g, { id: g.state.nextId++, t: 'npchafen', x: sp.x, y: sp.y, d: sp.d, sl: sp.sl, isl: k, buf: {}, out: {}, prog: 0, acc: 0, by: npcPid('rat'), owner: npcPid('rat'), npc: 'rat' });
      else g.events.push({ type: 'fail', msg: 'Am Goldberg war kein Platz für den Steg des Inselrats.' });
    }
    S.flags.npc_rat = 1;
    if (N.rat) N.rat.rep = Math.max(N.rat.rep, NPC_TRADE.rat.rep);
    // Ole und Brann: vertraut, neue Waren sofort vorrätig, ein Fest
    for (const id of ['ole', 'brann']) {
      const M = N[id];
      if (!M) continue;
      M.rep = Math.max(M.rep, E.rep);
      for (const e of NPC_TRADE[id].sells) if (e.end === 'a' && e.it) M.stock[e.it] = e.n;
    }
    S.fest = g.state.time + E.fest;
  } else {
    // Pfahldorf und Werkstattbucht: Ruinen, keine Lichter, keine Figuren, kein Handel
    for (const id of ['ole', 'brann']) {
      for (const b of villageOf(g, id)) { if (E.drop.includes(b.t)) drop(g, b); else b.ruin = 'sturm'; }
      const Q = npcPort(g, id);
      if (Q) { Q.ruin = 'sturm'; gone.add(Q.id); }
      if (N[id]) { N[id].orders = []; N[id].deals = []; }
    }
    // Goldberg: alles gehört dir, als hättest du es selbst gebaut
    for (const b of villageOf(g, 'aurel')) {
      const to = E.convert[b.t];
      if (to && BD[to] && BD[to].w === BD[b.t].w && BD[to].h === BD[b.t].h) {
        drop(g, b);
        addBuilding(g, Object.assign({ id: g.state.nextId++, t: to, x: b.x, y: b.y, d: 0, isl: b.isl, buf: {}, out: {}, prog: 0, acc: 0, by: HOST_PID }, to === 'buerger' || to === 'huette' || to === 'ingenieur' ? { tm: 0, sup: false, plans: 0 } : {}));
      } else { b.by = HOST_PID; b.owner = HOST_PID; }
    }
    if (P) K = stegToKontor(g, P);
  }
  dropStops(g, gone);
  if (E.relic) relic(g, E.relic);
  recount(g);
  g.events.push({ type: 'ending', c, kontor: K ? K.id : null, isl: k, relic: E.relic, to: '*' });
}
// Debug: Folgen ohne Szene noch einmal prüfen (Anzahl der Gebäude je Art auf den NPC-Inseln)
export function endingInfo(g) {
  const out = { choice: endingOf(g), fest: festOn(g) };
  for (const id of [...NPC_ORDER, 'rat']) {
    const k = g.W.npcIsl(id === 'rat' ? 'aurel' : id), list = [...g.blds.values()].filter(b => b.isl === k);
    out[id] = { gone: npcGone(g, id), port: !!npcPort(g, id), ruins: list.filter(b => b.ruin).length, own: list.filter(b => b.by === HOST_PID).length, all: list.length };
  }
  return out;
}
