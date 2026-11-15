/* =========================================================
   SPIELSTAND ↔ JSON, Versionierung
   Format (JSON-Objekt, Version 11): alle Felder von state (v, seed, time, xp, isl, found, mapped, loot, jet, flow, ui …) plus
     blds:  Gebäude ohne Laufzeit-Felder (die mit „_“ beginnen, außer SAVE_KEEP)
     trees: { Chunk-Schlüssel: [Index, Wachstum in %, …] } – nur Abweichungen von der erzeugten Startwelt
     fog:   { Chunk-Schlüssel: Base64 } – aufgedeckte Felder, Lauflängen-kodiert (FogLayer.encode)
     pipes: { Chunk-Schlüssel: [Index, Rohrstufe 1–3, …] } – Rohrebene
     fnets: [{ t: Feldschlüssel im Netz, f: Flüssigkeit, n: Menge }] – Inhalt der Rohrnetze (beim Laden auf die neu berechneten Netze verteilt)
     ships: Schiffe ohne Pfad (wird beim Laden neu berechnet), mit Laderäumen und Route (sim/ships.js)
   Die Welt selbst wird aus dem Seed neu erzeugt. v5 (Pendelverkehr A/B, ein Laderaum) wird nach v6 migriert,
   v6 (Holzkohle, Kohlemeiler, Schmelze, XP-Forschung) nach v7 (Rezepte, Pläne, Ruhm),
   v7 nach v8 (kartierte Inseln, abgeworfene Ladung, Schalter „Funde einsammeln“, Skilltree-Ansicht),
   v8 nach v9 (Rohre, Flüssigkeiten; nichts umzurechnen),
   v9 nach v10 (Hauptkontor mit Steg: das alte 2×2-Kontor bleibt als „kontoralt“, Lagerhallen werden Lagerkisten,
   Lager-Ausgaben entfallen (Extraktoren), Brücke → Kreuzung, Routen-Stopps auf Kontor-IDs, Schiffsarten),
   v10 nach v11 (Endgame: Münzen 0, leerer Markt, keine Händler, Aufträge, Ereignisse, Leuchtturm-Phasen; Drohnen stecken in den Drohnenhäfen),
   v11 nach v12 (Spieltest-Runde 2: Ziele nach id in gdone, Ziel „Waren extrahieren“ entfällt, Dampfkraftwerk-Ziel nach dem ersten Stahl).
   v12 nach v13 (Koop: ein Spieler „host“, Modus „Gemeinsame Insel“, alle Gebäude, Schiffe und Kontore gehören ihm).
   v13 nach v14 (Getrennte Inseln; nichts umzurechnen, ältere Stände bleiben Einzelspieler bzw. „Gemeinsame Insel“).
   v14 nach v15 (Freischalt-System: frühe Forschungen, Volk-Freischaltungen und Pläne mit Quelle 'alt').
   v15 nach v16 (Geschichte und NPC-Inseln): Einzelspieler und „Gemeinsame Insel“ bekommen die Geschichte ab Akt 1 und die drei NPC-Inseln,
   und zwar in Zellen, die noch nicht aufgedeckt und nicht bebaut sind (die bekannte Welt bleibt gleich). Getrennte Inseln bleiben ohne.
   v16 nach v17 (Handel mit den Völkern): state.npc mit Startruf, ohne Aufträge; die Stufe gilt beim nächsten Sekundentakt (Freischaltungen der erreichten Stufe).
   Neu in v17: npc ({ day, n, ole|brann|aurel: { rep, lv, sat, dem, stock, chart, orders, deals, del, vil, log } }, sim/npc.js), Schiffsart kogge, Routen-Stopps an NPC-Stegen.
   Neu in v16: story ({ act, flags, seen, once, choice }), npcs ({ ole: [cx, cy], brann, aurel }), Gebäude der NPC-Dörfer (by = 'npc:<id>').
   Neu in v14 (nur „Getrennte Inseln“): homes ([{ slot, cx, cy, pid | null }], Startplätze), wfirst (wer den ersten Leuchtturm entzündet hat),
   players[pid].st (Spielstand des Mitspielers, Felder wie PLAYER_FIELDS in sim/state.js), pfog ({ pid: { Chunk: Base64 } }, Nebel der Mitspieler),
   ft (Gründungszeit) an Kontoren, Routen-Erlaubnis (route.perm), Preislisten der Handelskontore (b.pl).
   Neu in v13: players ({ ID: { name, color, opts: { demolish } } }), mode ('shared' | 'separate'), coop (Koop-Stand: { demolish } oder null),
   by (Erbauer) an jedem Gebäude, owner an Schiffen und Kontoren.
   Neu in v12: gdone (erreichte Ziele), Sortierer (b.so = { it, rv }), optional name (Name des Speicherplatzes, nur in exportierten Dateien).
   Neu in v11: coins, coinsTotal, coinLog (Münzbuch), market, trade (Termine und Händler ohne Pfad), orders, wonder, ev (Ereignisse), evMode.
   Tank- und Gebäudepuffer (b.fi, b.fo) stecken in den Gebäuden.
   Ältere Stände (v2–v4) gehören zur alten, festen
   Karte und lassen sich nicht übernehmen (isOldSave; die Oberfläche exportiert sie und startet neu).
   Kein DOM-Zugriff (läuft auch im Worker).
   ========================================================= */
import { SAVE_VERSION, DIRS } from '../config.js';
import { BD } from '../data/buildings.js';
import { ITEMS } from '../data/items.js';
import { CS, CS2, CSH, ckx, cky, tk, cellOf, islCell } from '../util/tiles.js';
import { pickNpcCells, cleanNpcCells } from '../world/npcs.js';
import { cleanNpc } from '../sim/npc.js';
import { buildVillages } from '../sim/villages.js';
import { freshStory, ACT_MAX, CHOICES } from '../data/story.js';
import { cleanDive, syncBell } from '../sim/dive.js';
import { repairStory } from '../sim/story.js';
import { freshState, initWorld, initRuntime, recount, mergeDefaults, freshPlayer, freshPS, fogOf, HOST_PID } from '../sim/state.js';
import { HOME_SLOTS } from '../data/islands.js';
import { PLAYER_COLORS, NAME_MAX } from '../data/net.js';
import { freshFlow, validFlow, pruneFlow } from '../sim/stats.js';
import { addBuilding, recomputeClaims } from '../sim/buildings.js';
import { SHIP_HOLDS, SHIP_HOLD_CAP } from '../config.js';
import { SHIP_KINDS } from '../data/ships.js';
import { resumeShip, cleanStops } from '../sim/ships.js';
import { revealIsland, checkMapped } from '../sim/explore.js';
import { holdsOf } from '../sim/mods.js';
import { isPowered } from '../sim/power.js';
import { checkGoals } from '../sim/research.js';
import { TECH, TECH_BY_ID } from '../data/tech.js';
import { UNLOCK_KEYS, srcOf } from '../data/unlocks.js';
import { GOALS, GOAL_IDS_V11 } from '../data/goals.js';
import { netContents, restoreContents } from '../sim/fluids.js';
import { resumeDrones } from '../sim/drones.js';

// Laufzeit-Felder, die trotzdem gespeichert werden (_pt = Pflanz-Timer der Sägewerke)
const SAVE_KEEP = new Set(['_pt']);

// Spielstand als JSON-Text. ui (optional) ersetzt state.ui – die Oberfläche verwaltet diese Einstellungen selbst.
export function serialize(g, ui) {
  const state = g.state;
  if (!state) return null;
  const bl = [];
  for (const b of g.blds.values()) { const o = {}; for (const k in b) if (k[0] !== '_' || SAVE_KEEP.has(k)) o[k] = b[k]; bl.push(o); }
  if (state.flow) pruneFlow(state.flow, state.time);
  const trees = {}, fog = {};
  for (const key of g.tree.m.keys()) { const d = g.tree.diff(key); if (d.length) trees[key] = d; }
  for (const key of g.fog.m.keys()) fog[key] = g.fog.encode(key);
  // Getrennte Inseln: Nebel der Mitspieler
  let pfog = null;
  if (state.mode === 'separate' && g.fogs) for (const [pid, F] of g.fogs) { const o = {}; for (const key of F.m.keys()) o[key] = F.encode(key); (pfog || (pfog = {}))[pid] = o; }
  const pipes = {};
  for (const key of g.pipes.m.keys()) { const l = g.pipes.list(key); if (l.length) pipes[key] = l; }
  const extra = { blds: bl, trees, fog, pipes, fnets: netContents(g), ships: state.ships.map(s => { const o = {}; for (const k in s) if (k[0] !== '_') o[k] = s[k]; o.path = null; return o; }) };
  if (ui) extra.ui = ui;
  if (pfog) extra.pfog = pfog;
  const o = Object.assign({}, state, extra);
  delete o.flowT;      // nur im Spiegel (Zeitpunkt der letzten Statistik)
  return JSON.stringify(o);
}

// Version eines Spielstands, der zu einer älteren Welt gehört (sonst 0)
export function isOldSave(raw) {
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return s && typeof s === 'object' && Number.isFinite(s.seed) && (!Number.isFinite(s.v) || s.v < 5) ? (s.v || 2) : 0;
  } catch (e) { return 0; }
}
// Prüft einen geparsten Spielstand. Liefert null, wenn er unbrauchbar ist.
// Neue Versionen: hier einen Schritt „vN → vN+1“ ergänzen und SAVE_VERSION in config.js erhöhen.
export function migrate(s) {
  if (!s || typeof s !== 'object' || !Number.isFinite(s.seed)) return null;
  if (s.v === 5) migrate5(s);
  if (s.v === 6) migrate6(s);
  if (s.v === 7) migrate7(s);
  if (s.v === 8) migrate8(s);
  if (s.v === 9) migrate9(s);
  if (s.v === 10) migrate10(s);
  if (s.v === 11) migrate11(s);
  if (s.v === 12) migrate12(s);
  if (s.v === 13) migrate13(s);
  if (s.v === 14) migrate14(s);
  if (s.v === 15) migrate15(s);
  if (s.v === 16) migrate16(s);
  if (s.v === 17) migrate17(s);
  if (s.v !== SAVE_VERSION) return null;      // v2–v4: alte, feste Karte, nicht übertragbar
  if (!s.isl || typeof s.isl !== 'object' || Array.isArray(s.isl)) return null;
  return s;
}
// v5 → v6: Laderäume statt einer Ladung, Route statt Insel A/B, Schiffsnamen, Funde
function migrate5(s) {
  for (const sh of (Array.isArray(s.ships) ? s.ships : [])) {
    const c = sh.cargo, holds = Array(SHIP_HOLDS).fill(null);
    if (c && !Array.isArray(c) && c.it && c.n > 0) for (let i = 0, left = c.n; i < SHIP_HOLDS && left > 0; i++) { holds[i] = { it: c.it, n: Math.min(left, SHIP_HOLD_CAP) }; left -= holds[i].n; }
    sh.cargo = holds;
    sh.name = sh.name || `Schiff ${sh.n}`;
    // Pendelverkehr: A lädt ia und entlädt ib, B umgekehrt
    const o = (it) => it ? [{ it, mode: 'all', n: 0 }] : [];
    sh.route = sh.a >= 0 && sh.b >= 0 && sh.a !== sh.b
      ? { stops: [{ isl: sh.a, load: o(sh.ia), unload: o(sh.ib), wait: false }, { isl: sh.b, load: o(sh.ib), unload: o(sh.ia), wait: false }], idx: sh.tgt === 'B' ? 1 : 0, paused: false }
      : null;
    sh.dest = sh.route ? 'route' : ''; sh.mt = null; sh.tm = sh.tm || 0; sh.wt = 0; sh.rt = 0;
    if (!sh.route && sh.st !== 'idle') sh.st = 'idle';
    delete sh.a; delete sh.b; delete sh.ia; delete sh.ib; delete sh.tgt;
  }
  s.loot = {};
  s.v = 6;
}

// v6 → v7: neue Produktionsketten
//   Holzkohle wird überall zu Kohle (1:1), Kohlemeiler werden abgerissen (Baukosten und Puffer zurück ins Lager der Insel),
//   Schmelze → Schmelzofen (Rezept, Puffer, Brennstoff als Kohle), Forschung umbuchen, verfügbare XP verfallen (xpTotal bleibt als Ruhm).
const OLD_COST = { meiler: { holz: 100 } };
const OLD_TECH = { verbrennung: ['kupfer', 'strom'], werkzeug: ['handwerk'], buerger: ['handwerk'], band2: ['stahl', 'schnellband'] };   // bohrer, schmelze, werft, bruecke, meiler entfallen
const KOHLE = (it) => it === 'holzkohle' ? 'kohle' : it;
function mergeCoal(o) {
  if (!o || typeof o !== 'object' || !('holzkohle' in o)) return;
  o.kohle = (o.kohle || 0) + (o.holzkohle || 0); delete o.holzkohle;
}
function migrate6(s) {
  const isl = s.isl && typeof s.isl === 'object' ? s.isl : {};
  for (const k in isl) { if (!isl[k].inv) isl[k].inv = {}; mergeCoal(isl[k].inv); }
  const inv = (k) => (isl[k] || (isl[k] = { inv: {} })).inv;
  const add = (k, it, n) => { if (n > 0) { const v = inv(k); v[it] = (v[it] || 0) + n; } };
  const keep = [];
  for (const b of (Array.isArray(s.blds) ? s.blds : [])) {
    mergeCoal(b.buf); mergeCoal(b.out);
    if (b.it) b.it = KOHLE(b.it);
    for (const L of (Array.isArray(b.ln) ? b.ln : [])) if (L) L.it = KOHLE(L.it);
    if (b.outItem) b.outItem = KOHLE(b.outItem);
    if (b.t === 'meiler') {   // abreißen: 100 % Baukosten und Puffer ins Lager
      for (const r in OLD_COST.meiler) add(b.isl, r, OLD_COST.meiler[r]);
      for (const r in (b.buf || {})) add(b.isl, r, b.buf[r]);
      for (const r in (b.out || {})) add(b.isl, r, b.out[r]);
      continue;
    }
    if (b.t === 'schmelze') {
      b.t = 'schmelzofen';
      b.rc = b.rc === 'kupfer' ? 'kupferbarren' : 'eisenbarren';
      const buf = b.buf || {};
      if (buf.fuel) { buf.kohle = (buf.kohle || 0) + buf.fuel; delete buf.fuel; }
      b.buf = buf; b.prog = 0; b.run = false;
    }
    if (b.t === 'werkzeug') { b.rc = 'werkzeug'; b.prog = 0; b.run = false; }
    if (b.t === 'huette' || b.t === 'buerger') b.plans = b.plans || 0;
    keep.push(b);
  }
  // Kabel zu entfernten Gebäuden lösen (die übrigen prüft loadInto)
  const ids = new Set(keep.map(b => b.id));
  for (const b of keep) if (Array.isArray(b.links)) b.links = b.links.filter(id => ids.has(id));
  s.blds = keep;
  for (const sh of (Array.isArray(s.ships) ? s.ships : [])) {
    for (const h of (Array.isArray(sh.cargo) ? sh.cargo : [])) if (h) h.it = KOHLE(h.it);
    for (const st of (sh.route && Array.isArray(sh.route.stops) ? sh.route.stops : [])) {
      for (const o of (st.load || []).concat(st.unload || [])) o.it = KOHLE(o.it);
    }
  }
  for (const k in (s.loot || {})) if (Array.isArray(s.loot[k])) s.loot[k].forEach(x => { x.it = KOHLE(x.it); });
  // Forschung umbuchen (mit allen Voraussetzungen, damit der Baum stimmig bleibt)
  const tech = {}, give = (id) => { if (tech[id] || !TECH_BY_ID[id]) return; tech[id] = true; TECH_BY_ID[id].req.forEach(give); };
  for (const id in (s.tech || {})) if (s.tech[id]) (OLD_TECH[id] || [id]).forEach(give);
  s.tech = tech;
  s.xp = 0; s.xpTotal = s.xpTotal || 0;
  delete s.goal;   // wird beim ersten Prüfen ohne Ruhm nachgezogen (checkGoals)
  if (s.stats && s.stats.made) mergeCoal(s.stats.made);
  // Statistik: Holzkohle-Einträge entfallen
  if (s.flow && s.flow.isl) for (const k in s.flow.isl) for (const bk of s.flow.isl[k] || []) if (bk) for (const kind of ['p', 'c', 'm']) {
    if (bk[kind]) { delete bk[kind].holzkohle; for (const it in bk[kind]) { const by = bk[kind][it]; if (by.meiler) delete by.meiler; if (by.schmelze) { by.schmelzofen = (by.schmelzofen || 0) + by.schmelze; delete by.schmelze; } } }
  }
  s.v = 7;
}

// v7 → v8: neue Felder bekommen Standardwerte (mapped, jet, pick, ui.tree über freshState/mergeDefaults).
// Beim Laden (loadInto) werden Inseln mit Kontor ganz aufgedeckt und alle entdeckten Inseln still auf „kartiert“ geprüft.
function migrate7(s) {
  s.mapped = {}; s.jet = [];
  for (const sh of (Array.isArray(s.ships) ? s.ships : [])) if (sh.pick == null) sh.pick = true;
  s._remap = true;
  s.v = 8;
}

// v8 → v9: Rohre und Flüssigkeiten kommen neu dazu, es gibt nichts umzurechnen
function migrate8(s) {
  s.pipes = {}; s.fnets = [];
  s.v = 9;
}

// v9 → v10: Lagerlogik und Bänder (Spieltest-Runde 1)
//   kontor (2×2) → kontoralt (arbeitet mit dem alten Anleger weiter, Hinweis „bitte verlegen“), lager (3×3) → kiste (2×2, gleiche linke obere Ecke;
//   das Inselinventar bleibt und wird nicht gekürzt), Lager-Ausgabe (outItem) entfällt (ein Hinweis beim Laden), bruecke → kreuzung (Spuren bleiben),
//   Routen-Stopps: Insel → ID des Hauptkontors, alle Schiffe sind Frachtschiffe, Statistik-Quelle ausgabe → extraktor.
function migrate9(s) {
  const blds = Array.isArray(s.blds) ? s.blds : [], hq = {};
  let out = 0;
  for (const b of blds) {
    if (!b) continue;
    if (b.outItem) out++;
    delete b.outItem;
    if (b.t === 'kontor') { b.t = 'kontoralt'; if (hq[b.isl] == null || b.id < hq[b.isl]) hq[b.isl] = b.id; }
    else if (b.t === 'lager') { b.t = 'kiste'; b.inv = {}; }
    else if (b.t === 'bruecke') b.t = 'kreuzung';
  }
  for (const sh of (Array.isArray(s.ships) ? s.ships : [])) {
    sh.kind = 'fracht'; sh.auto = false;
    for (const st of (sh.route && Array.isArray(sh.route.stops) ? sh.route.stops : [])) {
      if (st && st.kontor == null && hq[st.isl] != null) st.kontor = hq[st.isl];
      if (st) delete st.isl;
    }
  }
  if (s.flow && s.flow.isl) for (const k in s.flow.isl) for (const bk of s.flow.isl[k] || []) if (bk && bk.c) for (const it in bk.c) {
    const by = bk.c[it];
    if (by.ausgabe) { by.extraktor = (by.extraktor || 0) + by.ausgabe; delete by.ausgabe; }
  }
  if (out) s._outNote = out;
  s.v = 10;
}

// v10 → v11: Münzen, Handel, Leuchtturm, Ereignisse, Drohnen. Alte Stände starten mit 0 Münzen;
// alle neuen Felder kommen als Standardwerte aus freshState (loadInto).
function migrate10(s) {
  s.coins = 0; s.coinsTotal = 0;
  s.v = 11;
}

// v11 → v12: Ziele werden nach id gemerkt. Alle Ziele vor dem alten Zeiger gelten als erreicht (gdone),
// der Zeiger zeigt danach auf das erste noch offene Ziel der neuen Reihenfolge. Das Ziel „Waren extrahieren“ gibt es nicht mehr.
function migrate11(s) {
  const gd = {};
  if (Number.isFinite(s.goal)) {
    for (let i = 0; i < Math.min(s.goal, GOAL_IDS_V11.length); i++) gd[GOAL_IDS_V11[i]] = 1;
    let i = 0;
    while (i < GOALS.length && gd[GOALS[i].id]) i++;
    s.goal = i;
  }
  s.gdone = gd;
  s.v = 12;
}

// v12 → v13: Koop vorbereiten. Einzelspieler-Stände bekommen den Spieler „host“, alles gehört ihm.
function migrate12(s) {
  s.players = { [HOST_PID]: freshPlayer() };
  s.mode = 'shared'; s.coop = null;
  for (const b of (Array.isArray(s.blds) ? s.blds : [])) { if (!b) continue; b.by = HOST_PID; if (b.t === 'kontor' || b.t === 'kontoralt') b.owner = HOST_PID; }
  for (const sh of (Array.isArray(s.ships) ? s.ships : [])) if (sh) sh.owner = HOST_PID;
  s.v = 13;
}
// v13 → v14: Getrennte Inseln kommen dazu, es gibt nichts umzurechnen
function migrate13(s) { s.v = 14; }
// v14 → v15: Freischalt-System. Was in Version 14 baubar war, bleibt baubar (gebaute Gebäude sowieso):
//   die neuen frühen Forschungen (early) gelten als erforscht, alle Volk-Freischaltungen (Kontor gründen, Brann-Teile)
//   und Pläne stehen mit der Quelle 'alt' in unl, sonst wären z. B. Sortierer oder Dampfkraft ohne Völker nicht mehr erreichbar.
//   Die Forschung „Weltenleuchtturm“ gibt es nicht mehr: war sie erforscht oder steht er schon, bleibt er freigeschaltet.
//   Ziele: „Ofenbau“ ist neu (gilt als erreicht, wenn der Schmelzofen-Schritt erreicht war), „Kontor auf einer zweiten Insel“
//   ist nach hinten gerückt; der Zeiger zeigt danach auf das erste offene Ziel der neuen Reihenfolge.
function migrate14(s) {
  if (!s.tech || typeof s.tech !== 'object') s.tech = {};
  const sts = [s];
  if (s.mode === 'separate' && s.players && typeof s.players === 'object') for (const id in s.players) { const p = s.players[id]; if (id !== HOST_PID && p && p.st && typeof p.st === 'object') sts.push(p.st); }
  let lt = (Array.isArray(s.blds) ? s.blds : []).some(b => b && b.t === 'leuchtturm');
  for (const P of sts) {
    if (!P.tech || typeof P.tech !== 'object') P.tech = {};
    if (P.tech.leuchtturm) lt = true;
    delete P.tech.leuchtturm;
    for (const T of TECH) if (T.early) P.tech[T.id] = true;
    if (P.gdone && typeof P.gdone === 'object' && !Array.isArray(P.gdone)) {
      if (P.gdone.schmelz) P.gdone.ofenbau = 1;
      let i = 0;
      while (i < GOALS.length && P.gdone[GOALS[i].id]) i++;
      if (Number.isFinite(P.goal)) P.goal = i;
    }
  }
  const unl = {};
  for (const key of UNLOCK_KEYS) if (srcOf(key).src === 'npc') unl[key] = 'alt';
  if (lt) unl.leuchtturm = 'alt';
  s.unl = unl;
  s._v15 = 1;   // Hinweis beim ersten Laden (loadInto)
  s.v = 15;
}
// v15 → v16: Geschichte ab Akt 1 und NPC-Inseln für Einzelspieler und „Gemeinsame Insel“ (Getrennte Inseln ohne).
// Die NPC-Zellen meiden alles, was der Spielstand schon kennt (aufgedeckte Chunks, Gebäude, Inseln mit Daten, entdeckte Inseln),
// damit sich keine bekannte Insel verändert. Das Dorf entsteht erst in loadInto (braucht die Welt).
function migrate15(s) {
  if (s.mode !== 'separate') {
    const bad = new Set(), add = (cx, cy) => bad.add(cx + ',' + cy);
    for (const key in (s.fog && typeof s.fog === 'object' ? s.fog : {})) { const X = ckx(+key) * CS, Y = cky(+key) * CS; for (const x of [X, X + CS - 1]) for (const y of [Y, Y + CS - 1]) add(cellOf(x), cellOf(y)); }
    for (const b of Array.isArray(s.blds) ? s.blds : []) if (b && Number.isFinite(b.x) && Number.isFinite(b.y)) add(cellOf(b.x), cellOf(b.y));
    for (const o of [s.isl, s.found]) for (const k in (o && typeof o === 'object' ? o : {})) { const c = islCell(+k); add(c[0], c[1]); }
    s.npcs = pickNpcCells(s.seed, (cx, cy) => bad.has(cx + ',' + cy));
    s.story = freshStory();
    // Turm aus der Zeit vor der Geschichte: darf ohne Akt-Sperre weitergebaut werden
    if ((s.wonder && s.wonder.ph > 0) || (Array.isArray(s.blds) && s.blds.some(b => b && b.t === 'leuchtturm'))) s.story.flags.alt_turm = 1;
    else if (s.unl && typeof s.unl === 'object') delete s.unl.leuchtturm;   // sonst gibt Brann den Bauplan (Ende Akt 1)
    s._npc16 = 1;   // Dörfer in loadInto bauen
  }
  s.v = 16;
}
// v16 → v17: Handel mit den Völkern. Der Zustand entsteht in loadInto (cleanNpc), hier nichts umzurechnen.
function migrate16(s) { s.v = 17; }
// v17 → v18: Der Extraktor hat keine Richtung mehr und gibt nur auf Bänder ab, die von ihm wegführen (sim/logistics.js).
// Lief das Band vor einem alten Extraktor quer (er lud seitlich auf), merkt er sich die alte Richtung in fd und liefert dort weiter.
function migrate17(s) {
  const blds = Array.isArray(s.blds) ? s.blds : [], belt = new Map();
  for (const b of blds) if (b && (b.t === 'band' || b.t === 'band2' || b.t === 'band3' || b.t === 'tor')) belt.set(b.x + ',' + b.y, b);
  for (const b of blds) {
    if (!b || b.t !== 'extraktor') continue;
    const d = (b.d | 0) & 3, f = belt.get((b.x + DIRS[d][0]) + ',' + (b.y + DIRS[d][1]));
    if (f && f.d !== d && f.d !== (d + 2) % 4) b.fd = d;
  }
  s.v = 18;
}
// Story-Zustand prüfen (null = ohne Geschichte)
function cleanStory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const S = freshStory(), obj = (o) => o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  S.act = Math.max(1, Math.min(ACT_MAX, Math.floor(+raw.act) || 1));
  for (const k of ['flags', 'seen', 'once']) { const o = obj(raw[k]); for (const id in o) if (typeof id === 'string' && id.length <= 40) S[k][id] = Number.isFinite(+o[id]) ? +o[id] : 1; }
  S.choice = CHOICES[raw.choice] ? raw.choice : null;
  S.dives = Math.max(0, raw.dives | 0);   // erfolgreiche Tauchgänge (0.19.0)
  if (S.choice === 'a' && Number.isFinite(+raw.fest) && +raw.fest > 0) S.fest = +raw.fest;   // Dorffest nach Ende A (0.23.0)
  return S;
}
// Startplätze prüfen (Getrennte Inseln): 2–4 Plätze mit Zelle und Spieler; sonst null
function cleanHomes(raw) {
  if (!Array.isArray(raw) || raw.length < HOME_SLOTS.min || raw.length > HOME_SLOTS.max) return null;
  const out = raw.map((h, i) => h && Number.isInteger(h.cx) && Number.isInteger(h.cy) ? { slot: i + 1, cx: h.cx, cy: h.cy, pid: typeof h.pid === 'string' && /^[a-z0-9_-]{1,40}$/i.test(h.pid) ? h.pid : null } : null);
  return out.every(Boolean) && out[0].pid === HOST_PID ? out : null;
}
// Spielerliste prüfen: Name, Farbe, Einstellungen; der Host fehlt nie. sep: Spielstand der Mitspieler (st) behalten
function cleanPlayers(raw, sep) {
  const out = {};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) for (const id in raw) {
    const p = raw[id];
    if (!p || typeof p !== 'object' || !/^[a-z0-9_-]{1,40}$/i.test(id)) continue;
    out[id] = freshPlayer(String(p.name || '').slice(0, NAME_MAX), PLAYER_COLORS.includes(p.color) ? p.color : PLAYER_COLORS[0], !!(p.opts && p.opts.demolish));
    if (sep && id !== HOST_PID && p.st && typeof p.st === 'object') {
      const st = out[id].st = mergeDefaults(freshPS(), p.st);
      st.coins = Math.max(0, Math.floor(+st.coins) || 0);
      if (!Array.isArray(st.coinLog)) st.coinLog = [];
    }
  }
  if (!out[HOST_PID]) out[HOST_PID] = freshPlayer();
  return out;
}

// JSON-Text (oder bereits geparstes Objekt) prüfen und migrieren. Liefert das Objekt oder null.
export function parseSave(raw) {
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return migrate(s);
  } catch (e) { return null; }
}

// Lädt einen Spielstand in den Spielkontext g. Liefert false bei defektem oder altem Stand.
export function loadInto(g, raw) {
  try {
    const s = parseSave(raw);
    if (!s) return false;
    const base = freshState(s.seed);
    // Erst die Standardwerte, dann der geladene Stand darüber (stats und ui verschachtelt)
    const state = g.state = Object.assign({}, base, s);
    state.isl = {};
    for (const k in s.isl) state.isl[k] = Object.assign({ inv: {} }, s.isl[k]);
    state.found = Object.assign({}, s.found || {});
    state.gdone = s.gdone && typeof s.gdone === 'object' && !Array.isArray(s.gdone) ? Object.assign({}, s.gdone) : {};
    delete state.name;
    state.stats = mergeDefaults(base.stats, s.stats); state.ui = mergeDefaults(base.ui, s.ui);
    if (!validFlow(s.flow)) state.flow = freshFlow();
    // Koop (v13), Getrennte Inseln (v14): vor den Schiffen, weil Laderäume von der Forschung des Besitzers abhängen
    state.homes = s.mode === 'separate' ? cleanHomes(s.homes) : null;
    state.mode = state.homes ? 'separate' : 'shared';
    if (!state.homes) delete state.homes; else state.wfirst = typeof s.wfirst === 'string' ? s.wfirst : null;
    state.players = cleanPlayers(s.players, !!state.homes);
    state.coop = s.coop && typeof s.coop === 'object' ? { demolish: !!s.coop.demolish } : null;
    // Geschichte und NPC-Inseln (v16): nur ohne Startplätze und nur beide zusammen
    state.npcs = state.homes ? null : cleanNpcCells(s.npcs);
    state.story = state.npcs ? cleanStory(s.story) : null;
    if (!state.story) state.npcs = null;
    state.npc = state.story ? cleanNpc(s.npc) : null;   // Handel mit den Völkern (v17)
    delete state._npc16;
    initWorld(g, state.seed, state.homes, state.npcs);
    for (const key in (s.trees || {})) g.tree.applyDiff(+key, s.trees[key]);
    for (const key in (s.fog || {})) g.fog.decode(+key, s.fog[key]);
    g.fog.dirty.clear();
    if (state.homes) for (const pid in (s.pfog || {})) { if (pid === HOST_PID || !state.players[pid]) continue; const F = fogOf(g, pid); for (const key in s.pfog[pid]) F.decode(+key, s.pfog[pid][key]); F.dirty.clear(); }
    delete state.trees; delete state.fog; delete state.pfog;
    const list = s.blds || []; delete state.blds;
    initRuntime(g);
    for (const b of list) { if (!BD[b.t]) continue; b.buf = b.buf || {}; b.out = b.out || {}; addBuilding(g, b, true); }
    // Rohre nach den Gebäuden, dann den Inhalt auf die Netze verteilen
    for (const key in (s.pipes || {})) if (Array.isArray(s.pipes[key])) g.pipes.applyList(+key, s.pipes[key]);
    g.pipes.dirty.clear(); g.pipeVer++; g.PN = null;
    restoreContents(g, s.fnets);
    delete state.pipes; delete state.fnets;
    // Kabel nur zwischen Gebäuden, die Strom nutzen (z. B. Bohrer Mk1 seit v7 nicht mehr)
    for (const b of g.blds.values()) if (b.links) b.links = isPowered(b.t) ? b.links.filter(id => { const o = g.blds.get(id); return o && isPowered(o.t); }) : [];
    // v15 → v16: Dörfer der NPC-Inseln anlegen (die Zellen sind noch unbekannt)
    if (s._npc16 && state.npcs) buildVillages(g, addBuilding);
    recomputeClaims(g); recount(g);
    // wachsende Bäume wieder in die Liste
    for (const [key, c] of g.tree.m) {
      const X = ckx(key) << CSH, Y = cky(key) << CSH;
      for (let i = 0; i < CS2; i++) if (c[i] > 0 && c[i] < 1) g.growing.add(tk(X + (i & (CS - 1)), Y + (i >> CSH)));
    }
    state.loot = s.loot && typeof s.loot === 'object' && !Array.isArray(s.loot) ? s.loot : {};
    state.mapped = s.mapped && typeof s.mapped === 'object' && !Array.isArray(s.mapped) ? Object.assign({}, s.mapped) : {};
    state.jet = (Array.isArray(s.jet) ? s.jet : []).filter(j => j && Number.isFinite(j.x) && Number.isFinite(j.y) && Array.isArray(j.items))
      .map(j => Object.assign({ id: j.id, x: j.x, y: j.y, items: j.items.filter(o => o && ITEMS[o.it] && o.n > 0), exp: +j.exp || 0, lock: j.lock != null ? j.lock : null }, j.ev != null ? { ev: j.ev } : {}));
    state.ships = s.ships || [];
    state.ships.forEach(sh => {
      if (!SHIP_KINDS[sh.kind]) sh.kind = 'fracht';
      const holds = holdsOf(g, sh);
      if (!Array.isArray(sh.cargo)) sh.cargo = [];
      while (sh.cargo.length < holds) sh.cargo.push(null);
      sh.cargo.length = holds;
      if (sh.pick == null) sh.pick = true;
      // Stopps ohne Kontor fallen weg; ohne gültige Inseln keine Route
      if (sh.route) { sh.route.stops = cleanStops(g, sh.route.stops); if (!sh.route.stops.length) { sh.route = null; if (sh.dest === 'route') sh.dest = ''; } else if (!(sh.route.idx < sh.route.stops.length)) sh.route.idx = 0; }
      if (!sh.route && (sh.st === 'dock' || sh.st === 'wait')) sh.st = 'idle';
      resumeShip(g, sh);
    });
    // v7 → v8: Inseln mit Kontor ganz aufdecken, entdeckte Inseln still auf „kartiert“ prüfen
    if (s._remap) {
      delete state._remap;
      for (const k in g.KONT) revealIsland(g, +k, true);
      checkMapped(g, Object.keys(state.found).map(Number), true);
      g.fog.dirty.clear();
    }
    // Endgame (v11): Münzen, Markt, Händler, Aufträge, Leuchtturm, Ereignisse – fehlende Teile mit Standardwerten
    state.coins = Math.max(0, Math.floor(+s.coins) || 0); state.coinsTotal = Math.max(0, Math.floor(+s.coinsTotal) || 0);
    state.coinLog = Array.isArray(s.coinLog) ? s.coinLog.filter(b => b && Number.isFinite(b.t) && b.v) : [];
    state.market = mergeDefaults(base.market, s.market);
    state.trade = mergeDefaults(base.trade, s.trade);
    state.trade.list = (Array.isArray(state.trade.list) ? state.trade.list : []).filter(t => t && Array.isArray(t.path) && t.path.length >= 2 && g.blds.get(t.post));
    state.orders = s.orders && typeof s.orders === 'object' && !Array.isArray(s.orders) ? s.orders : {};
    state.wonder = mergeDefaults(base.wonder, s.wonder);
    // Taucherglocke und Tauchspot (0.19.0): fehlt in älteren Ständen
    state.dive = cleanDive(s.dive, state.ships); syncBell(g);
    // Freischaltungen (v15): nur bekannte Schlüssel
    state.unl = {};
    if (s.unl && typeof s.unl === 'object' && !Array.isArray(s.unl)) for (const k in s.unl) if (UNLOCK_KEYS.includes(k) && typeof s.unl[k] === 'string') state.unl[k] = s.unl[k];
    repairStory(g);   // 0.20.1: Freischaltungen der erreichten Akte nachholen (z. B. Bauplan Taucherglocke in Akt 3)
    state.ev = mergeDefaults(base.ev, s.ev);
    if (!Array.isArray(state.ev.list)) state.ev.list = [];
    if (!['aus', 'sanft', 'normal'].includes(state.evMode)) state.evMode = 'normal';
    resumeDrones(g);
    // Ziele: ohne gespeicherten Stand (alte Spielstände) still nachziehen, ohne Ruhm
    if (!Number.isFinite(s.goal)) { state.goal = null; checkGoals(g, true); }
    g.events = [];
    if (s._outNote) { delete state._outNote; g.events.push({ type: 'migrated', outItem: s._outNote }); }
    if (s._v15) { delete state._v15; g.events.push({ type: 'migrated15' }); }
    if (s._npc16 && state.story) g.events.push({ type: 'migrated16', had: !!state.story.flags.alt_turm });
    return true;
  } catch (e) { console.warn('Spielstand defekt', e); return false; }
}
