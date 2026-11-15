/* =========================================================
   SPIELZUSTAND & LAUFZEIT-STRUKTUREN
   Ein „Spielkontext“ g bündelt alles, was früher globale Variablen waren:
     g.W       – unveränderliche, unendliche Welt (world/world.js, aus dem Seed)
     g.state   – speicherbarer Zustand (Lager je Insel-ID, XP, Forschung, Schiffe …)
     g.tree    – Baumwachstum je Feld (TreeLayer, 0 = kein Baum, 1 = reif)
     g.bmap    – Gebäude-ID je Feld (ChunkLayer), g.blds – Gebäude nach ID
     g.claim   – welches Sägewerk welchen Baum erntet (ChunkLayer)
     g.fog     – aufgedeckte Felder (FogLayer)
     g.pipes   – Rohrebene (PipeLayer, Stufe je Feld), Netze daraus in sim/fluids.js (pipeNets, Versionszähler g.pipeVer)
     g.fogs    – Getrennte Inseln: Nebel der Mitspieler (Spieler-ID → FogLayer); g.fog ist der des Hosts
   Getrennte Inseln (state.mode = 'separate'): Jeder Spieler hat eigenen Nebel, Forschung, Ruhm, Münzen, Ziele und
   Leuchtturm-Phasen. Die Werte des Hosts stehen wie im Einzelspiel direkt in state, die der Mitspieler in
   state.players[pid].st (gleiche Feldnamen, PLAYER_FIELDS). pst(g, pid) liefert das passende Objekt, fogOf(g, pid) den Nebel.
   Ohne Spieler-Angabe gilt der Spieler, dessen Kommando gerade läuft (g.pid), auf dem Spiegel der eigene (g.me), sonst der Host.
   Im Spiegel (g.mirror) stehen ohnehin nur die eigenen Werte in state.
   Felder werden über Kachel-Schlüssel (util/tiles.js) adressiert, Inseln über ihre Insel-ID.
   Lager, Statistik usw. sind Objekte je Insel-ID; eine Insel steht erst im Spielstand,
   wenn dort etwas gebaut wurde (islData).
   Der Worker (bzw. die lokale Simulation) besitzt den maßgeblichen Kontext,
   der Hauptthread einen Spiegel davon, der aus Snapshots gefüllt wird.
   Kein Zugriff auf DOM, Canvas oder window.
   ========================================================= */
import { SAVE_VERSION, REVEAL } from '../config.js';
import { BD, HQ } from '../data/buildings.js';
import { ITEMS } from '../data/items.js';
import { HOME, islFlag, homeCells } from '../data/islands.js';
import { World } from '../world/world.js';
import { ChunkLayer, TreeLayer, FogLayer, PipeLayer } from '../world/layers.js';
import { HOME_ISL, islId } from '../util/tiles.js';
import { CELL } from '../config.js';
import { freshFlow, flowAdd } from './stats.js';
import { mods } from './mods.js';
import { PLAYER_COLORS } from '../data/net.js';
import { TECH } from '../data/tech.js';
import { srcOf } from '../data/unlocks.js';
import { freshStory } from '../data/story.js';
import { freshDive } from '../data/dive.js';
import { npcOfPid, npcName } from '../data/npcs.js';
import { pickNpcCells } from '../world/npcs.js';
import { buildVillages } from './villages.js';
import { storyStart } from './story.js';
import { freshNpc } from './npc.js';

// Spieler-ID des Hosts bzw. des Einzelspielers. Mitspieler haben eine feste ID aus ihrem Browser (net/session.js).
export const HOST_PID = 'host';
export const freshPlayer = (name, color, demolish) => ({ name: name || 'Spieler', color: color || PLAYER_COLORS[0], opts: { demolish: !!demolish } });
// Getrennte Inseln: Werte, die jeder Spieler für sich hat (beim Host direkt in state, sonst in players[pid].st)
export const PLAYER_FIELDS = ['xp', 'xpTotal', 'goal', 'gdone', 'tech', 'coins', 'coinsTotal', 'coinLog', 'found', 'mapped', 'wonder', 'stats'];
export const freshPS = () => ({ xp: 0, xpTotal: 0, goal: 0, gdone: {}, tech: {}, coins: 0, coinsTotal: 0, coinLog: [], found: {}, mapped: {},
  wonder: { ph: 0, pb: 0, pt: 0, got: null, lager: 1, acc: 0, id: null, doneAt: null }, stats: { made: {}, delivered: 0, burned: 0, sold: 0, bought: 0 } });

export function createGame() {
  return {
    W: null, state: null, tree: null, bmap: null, claim: null, fog: null,
    blds: new Map(), growing: new Set(), topoVer: 1, wireVer: 1, netVer: -1, NETS: [], ISLC: {}, KONT: {},
    pipes: null, pipeVer: 1, pnVer: -1, PN: null,   // Rohrebene und Rohrnetze (sim/fluids.js)
    RT: { popSup: {}, popAll: {} },
    shipPathCache: new Map(),
    lootVer: 1,          // steigt, wenn ein Fund eingesammelt wird (Snapshot schickt state.loot dann mit)
    jetVer: 1,           // steigt, wenn sich die abgeworfene Ladung ändert (Snapshot schickt state.jet dann mit)
    events: [],          // Ereignisse für die Oberfläche (Toasts usw.), werden pro Snapshot geleert
    paint: null,         // laufender Zieh-Vorgang beim Bänder-Verlegen
    SOLL: {},            // Soll-Raten je Insel und Ware (sim/soll.js), nicht gespeichert
    inspect: new Set(),  // im Info-Panel gewählte Gebäude (Set aller Spieler): nur deren Durchsatz wird gezählt (sim/stats.js ioAdd)
    pid: null            // Spieler, dessen Kommando gerade läuft (applyCommand); sonst null = Simulation selbst
  };
}

export function freshState(seed) {
  return {
    v: SAVE_VERSION, seed, time: 120, xp: 0, xpTotal: 0, goal: 0, gdone: {}, tech: {}, nextId: 1,   // xp/xpTotal = Ruhm, goal = nächstes offenes Ziel, gdone = erreichte Ziele (id → 1)
    isl: {},            // Insel-ID → { inv (Inselinventar = Bestand des Hauptkontors), name?, flag? }
    found: {},          // entdeckte Inseln (Insel-ID → 1)
    loot: {},           // Funde auf See: Fund-Schlüssel → 0 (eingesammelt) oder [{it, n}] (Rest, siehe world/finds.js)
    jet: [],            // über Bord geworfene Ladung: [{ id, x, y, items: [{it, n}], exp (Spielzeit, dann weg), lock (Schiff, das sie abgeworfen hat) }]
    mapped: {},         // kartierte Inseln (Insel-ID → 1): ganz aufgedeckt (Kontor oder ≥ MAP_COAST_SHARE der Küste gesehen)
    ships: [], stats: { made: {}, delivered: 0, burned: 0, sold: 0, bought: 0 },
    flow: freshFlow(),
    coins: 0, coinsTotal: 0, coinLog: [],   // Münzen (sim/coins.js), coinsTotal = je eingenommen
    market: { s: {}, b: {}, h: {}, ht: 0 },  // Preise: Sättigung, Nachfrage, Verlauf (sim/trade.js)
    trade: { due: {}, list: [], n: 0 },      // Händler: nächste Besuche, Händler-Schiffe unterwegs
    orders: {},                              // Handelsaufträge je Insel
    wonder: { ph: 0, pb: 0, pt: 0, got: null, lager: 1, acc: 0, id: null, doneAt: null },   // Weltenleuchtturm (sim/wonder.js)
    dive: freshDive(),                       // Taucherglocke und Tauchspot (sim/dive.js, data/dive.js); gehört zur Welt
    unl: {},                                 // Freischaltungen durch Volk, Story, Pläne (Schlüssel → Quelle, data/unlocks.js); gehört zur Welt
    ev: { list: [], nextAt: null, n: 0 },    // Ereignisse (sim/events.js)
    evMode: 'normal',                        // Einstellung Ereignisse: aus | sanft | normal
    // Spieler (Koop): ID → { name, color, opts: { demolish } }; Einzelspieler = nur der Host
    players: { [HOST_PID]: freshPlayer() },
    mode: 'shared',                          // Koop-Modus: 'shared' (Gemeinsame Insel) | 'separate' (Getrennte Inseln)
    // Getrennte Inseln zusätzlich: homes = [{ slot, cx, cy, pid | null }] (Startplätze, Zelle der Heimatinsel), wfirst = wer den ersten Leuchtturm entzündet hat
    coop: null,                              // Koop-Spielstand: { demolish } = Voreinstellung für neue Mitspieler; Einzelspieler null
    story: null,                             // Geschichte (data/story.js): { act, flags, seen, once, choice }; null = ohne Geschichte (Getrennte Inseln, Demo)
    npc: null,                               // Handel mit den Völkern (sim/npc.js): Ruf, Preise, Vorrat, Aufträge, Verträge, Dörfer; null = ohne Geschichte
    npcs: null,                              // Zellen der NPC-Inseln { ole: [cx, cy], brann, aurel } (data/npcs.js, world/npcs.js); null = keine
    ui: freshUI()
  };
}
// Einstellungen der Oberfläche (gehören der UI, werden nur mitgespeichert)
export function freshUI() {
  return { infoCollapsed: false, invCollapsed: false, goalCollapsed: false, miniCollapsed: false, miniScale: 1, buildCat: 'logistik', statusView: false,
    tree: { x: 0, y: 0, z: 2, detail: true, init: false } };   // Skilltree: Mitte der Ansicht (Baum-Pixel), Zoomstufe (ZOOMS in ui/skilltree.js), Detailspalte offen, schon einmal eingepasst
}
// Standardwerte verschachtelt ergänzen: erst die Defaults, dann der geladene Stand darüber
export function mergeDefaults(def, val) {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return def;
  const o = Object.assign({}, def);
  for (const k in val) {
    const d = def[k], v = val[k];
    o[k] = d && typeof d === 'object' && !Array.isArray(d) && v && typeof v === 'object' && !Array.isArray(v) ? mergeDefaults(d, v) : v;
  }
  return o;
}
// Welt und Feld-Layer für einen Seed anlegen (Simulation und Spiegel); homes = Startplätze (Getrennte Inseln), npcs = Zellen der NPC-Inseln
export function initWorld(g, seed, homes, npcs) {
  g.W = new World(seed, homes && homes.length > 1 ? homes.map(h => [h.cx, h.cy]) : null, npcs || null);
  g.tree = new TreeLayer(g.W); g.fog = new FogLayer(); g.fogs = new Map();
  g.bmap = new ChunkLayer(); g.claim = new ChunkLayer(); g.pipes = new PipeLayer();
  g.W.pin = (key) => g.bmap.m.has(key);      // Chunks mit Gebäuden bleiben geladen
}
export function initRuntime(g) {
  g.bmap.clear(); g.claim.clear();
  g.blds = new Map(); g.growing = new Set(); g.topoVer++; g.pipeVer++; g.PN = null;
  g.RT.popSup = {}; g.RT.popAll = {};
  g.shipPathCache.clear();
  g.undos = new Map(); g.undo = { u: [], r: [], open: null }; g.undos.set(HOST_PID, g.undo); g.rec = null;   // Rückgängig/Wiederholen je Spieler (sim/undo.js), wird nicht gespeichert
}
// addBuilding, reveal und revealIsland werden übergeben, damit state.js nicht von buildings.js/explore.js abhängt.
// opts.slots = Spielerzahl bei „Getrennte Inseln“ (2–4): Startplätze anlegen, Platz 1 gehört dem Host (sim/players.js für die übrigen)
// opts.noStory = ohne Geschichte und NPC-Inseln (Demo im Titelbildschirm). Getrennte Inseln laufen immer ohne Geschichte.
export function newGame(g, seed, addBuilding, reveal, revealIsland, opts) {
  g.state = freshState(seed);
  const sep = opts && opts.slots > 1;
  if (sep) {
    g.state.mode = 'separate';
    g.state.homes = homeCells(opts.slots).map(([cx, cy], i) => ({ slot: i + 1, cx, cy, pid: i ? null : HOST_PID }));
    g.state.wfirst = null;
  } else if (!(opts && opts.noStory)) {
    g.state.npcs = pickNpcCells(seed);
    g.state.story = freshStory();
    g.state.npc = freshNpc();
  }
  initWorld(g, seed, g.state.homes, g.state.npcs);
  initRuntime(g);
  startHome(g, HOST_PID, addBuilding, reveal, revealIsland);
  if (g.state.npcs) buildVillages(g, addBuilding);
  recount(g);
  g.events = [];
  if (g.state.story) storyStart(g);
}
// Heimatinsel eines Spielers einrichten: 100 Holz, Startnebel (Spawn-Radius), Hauptkontor am erzeugten Platz, ganze Insel aufgedeckt.
// Einzelspieler und „Gemeinsame Insel“: Heimatinsel bei (0,0), Spawn (0,0).
export function startHome(g, pid, addBuilding, reveal, revealIsland) {
  const h = homeOf(g, pid), I = g.W.islandCell(h ? h.cx : 0, h ? h.cy : 0), P = pst(g, pid);
  islData(g, I.id).inv.holz = 100;
  P.found[I.id] = 1;
  if (isSep(g)) for (const T of TECH) if (T.early) P.tech[T.id] = true;   // Getrennte Inseln ohne Story: frühe Forschungen sind erforscht
  reveal(g, h ? h.cx * CELL : 0, h ? h.cy * CELL : 0, REVEAL.spawn, pid);
  if (I.kontor) { addBuilding(g, { id: g.state.nextId++, t: 'kontor', x: I.kontor.x, y: I.kontor.y, d: I.kontor.d, sl: I.kontor.sl, isl: I.id, buf: {}, out: {}, prog: 0, acc: 0, by: pid, owner: pid }); reveal(g, I.kontor.x + 1, I.kontor.y + 1, REVEAL.kontor, pid); }
  revealIsland(g, I.id, false, pid);
  return I;
}

/* ---------- Spieler (Getrennte Inseln) ---------- */
export const isSep = (g) => !!(g.state && g.state.mode === 'separate');
// Spieler, für den gerade gerechnet wird: Kommando (g.pid), eigener Spieler im Spiegel (g.me), sonst Host
export const actor = (g) => g.pid || g.me || HOST_PID;
// Spielstand-Teil des Spielers (Forschung, Ruhm, Münzen, Ziele, Nebel-Inseln, Leuchtturm, Statistik-Zähler)
export function pst(g, pid) {
  if (!isSep(g) || g.mirror) return g.state;
  pid = pid || actor(g);
  if (pid === HOST_PID) return g.state;
  const P = g.state.players[pid];
  if (!P) return freshPS();   // unbekannter Spieler: Werte ohne Wirkung (nichts erforscht, keine Münzen)
  return P.st || (P.st = freshPS());
}
// Nebel des Spielers
export function fogOf(g, pid) {
  if (!isSep(g) || g.mirror) return g.fog;
  pid = pid || actor(g);
  if (pid === HOST_PID) return g.fog;
  let F = g.fogs.get(pid);
  if (!F) { F = new FogLayer(); g.fogs.set(pid, F); }
  return F;
}
// Besitzer eines Gebäudes (owner bei Kontoren, sonst Erbauer) oder Schiffs
export const ownerOf = (o) => (o && (o.owner || o.by)) || HOST_PID;
// Besitzer einer Insel = Besitzer ihres Hauptkontors (null = niemand)
export const islOwner = (g, k) => { const K = g.KONT[k]; return K ? ownerOf(K) : null; };
// Gehört o (Gebäude, Schiff) dem Spieler? In „Gemeinsame Insel“ und im Einzelspiel gehört alles allen.
export const mine = (g, o, pid) => !isSep(g) || ownerOf(o) === (pid || actor(g));
export const myIsl = (g, k, pid) => !isSep(g) || islOwner(g, k) === (pid || actor(g));
// Startplatz eines Spielers (Getrennte Inseln) oder null
export const homeOf = (g, pid) => { const H = g.state && g.state.homes; return H ? H.find(h => h.pid === (pid || actor(g))) || null : null; };
// Insel-ID der eigenen Heimatinsel (Einzelspieler, Gemeinsame Insel: 0)
export const homeIsl = (g, pid) => { const h = homeOf(g, pid); return h ? islId(h.cx, h.cy) : HOME_ISL; };
// Startplatz, zu dem die Insel k gehört (oder null)
export const homeAt = (g, k) => { const H = g.state && g.state.homes; return H ? H.find(h => islId(h.cx, h.cy) === k) || null : null; };
// Spieler mit Startplatz (Getrennte Inseln) bzw. alle eingetragenen Spieler
export const seatedPids = (g) => isSep(g) ? g.state.homes.filter(h => h.pid).map(h => h.pid) : [HOST_PID];
// Meldung: fremde Insel
export const foreignIsl = (g, k) => `Diese Insel gehört ${playerName(g, islOwner(g, k))}.`;

/* ---------- Abfragen (auch vom Hauptthread auf dem Spiegel genutzt) ---------- */
// Freigeschaltet? key = Gebäudetyp | 'ship:<Art>' | 'rc:<Rezept>' | 'gruenden' | 'plan:<id>' (data/unlocks.js).
// Forschung je Spieler (pst), Volk und Story aus state.unl (Welt). Getrennte Inseln: Volk-Quellen sind frei.
export function isUnlocked(g, key, pid) {
  const S = srcOf(key);
  if (S.src === 'start') return true;
  if (S.src === 'tech') return !!pst(g, pid).tech[S.id];
  const unl = g.state.unl;
  return !!(unl && unl[key]) || (S.src === 'npc' && isSep(g));
}
// Plan-Voraussetzung einer Forschung erfüllt (Getrennte Inseln: keine Pläne nötig)
export const planOk = (g, T) => !T.plan || isSep(g) || !!(g.state.unl && g.state.unl['plan:' + T.plan]);
const NONE = Object.freeze({});
// Gebäudezahlen je Typ auf Insel k (leer, wenn dort nichts steht)
export const islc = (g, k) => g.ISLC[k] || NONE;
// Platz je Ware im Inselinventar k (Hauptkontor, mit Upgrades des Besitzers, sim/mods.js); ohne Hauptkontor 0
export const capOf = (g, k) => g.KONT[k] ? mods(g, islOwner(g, k)).cap.kontor : 0;
export const totalPop = (g) => { let n = 0; for (const k in g.RT.popSup) n += g.RT.popSup[k]; return n; };
// Inselinventar nur lesen (leer, wenn die Insel noch nicht im Spielstand steht)
export const invOf = (g, k) => (g.state.isl[k] && g.state.isl[k].inv) || NONE;
// Daten einer Insel, bei Bedarf anlegen (nur in der Simulation)
export function islData(g, k) { return g.state.isl[k] || (g.state.isl[k] = { inv: {} }); }
// Name: gespeichert, Heimatinsel oder „Unbekannte Insel“. Getrennte Inseln: die eigene heißt „Heimatinsel“, die anderen „<Name>s Heimatinsel“.
export function islName(g, k, pid) {
  const d = g.state.isl[k];
  if (d && d.name) return d.name;
  const h = homeAt(g, k);
  if (h) return !h.pid || h.pid === (pid || actor(g)) ? HOME.name : `${playerName(g, h.pid)}s ${HOME.name}`;
  return k === HOME_ISL && !(g.state.homes && g.state.homes.length > 1) ? HOME.name : k >= 0 ? 'Unbekannte Insel' : 'Offenes Meer';
}
// Flaggenfarbe: gewählt (beim Gründen/Umbenennen) oder nach Insel-ID
export function flagOf(g, k) { const d = g.state && g.state.isl[k]; return (d && d.flag) || islFlag(k); }
// Hauptkontor der Insel k (neu oder alt) oder null
export const kontorOf = (g, k) => g.KONT[k] || null;
// Inseln mit Kontor (für Routen, Inselliste, Statistik), Heimatinsel zuerst. pid = nur die Inseln dieses Spielers (Getrennte Inseln)
export const kontorIslands = (g, pid) => Object.keys(g.KONT).map(Number).filter(k => pid == null || myIsl(g, k, pid)).sort((a, b) => a - b);
export function recount(g) {
  g.ISLC = {}; g.KONT = {};
  for (const b of g.blds.values()) {
    const c = g.ISLC[b.isl] || (g.ISLC[b.isl] = {});
    c[b.t] = (c[b.t] || 0) + 1;
    if (HQ.has(b.t) && (!g.KONT[b.isl] || b.id < g.KONT[b.isl].id)) g.KONT[b.isl] = b;
  }
}
export function afford(g, k, cost) { const inv = invOf(g, k); return Object.keys(cost).every(r => (inv[r] || 0) >= cost[r]); }
// src = Posten in der Produktionsstatistik (z. B. 'bauen')
export function pay(g, k, cost, src) { const inv = islData(g, k).inv; for (const r in cost) { inv[r] -= cost[r]; if (src) flowAdd(g, k, 'c', r, cost[r], src); } }
export function missingText(g, k, cost) {
  const inv = invOf(g, k);
  return Object.entries(cost).filter(([r, n]) => (inv[r] || 0) < n).map(([r, n]) => `${n - Math.floor(inv[r] || 0)} ${ITEMS[r].name}`).join(', ');
}
// Koop: darf pid das Gebäude b abreißen? Liefert die Meldung, wenn nicht (Erbauer erlaubt es nicht; Getrennte Inseln: nie fremde), sonst null.
export function demolishBlock(g, b, pid) {
  pid = pid || HOST_PID;
  if (isSep(g) && b && ownerOf(b) !== pid) return `Abreißen nicht erlaubt – Gebäude von ${playerName(g, ownerOf(b))}.`;
  const by = b && b.by, P = by && g.state.players ? g.state.players[by] : null;
  if (!by || by === pid || !P || (P.opts && P.opts.demolish)) return null;
  return `Abreißen nicht erlaubt – Gebäude von ${P.name}.`;
}
// Name eines Spielers (Erbauer, Chat); NPC: sein Name; unbekannt: „ein Mitspieler“
export const playerName = (g, pid) => { const P = g.state && g.state.players && g.state.players[pid]; return P ? P.name : npcOfPid(pid) ? npcName(npcOfPid(pid)) : 'ein Mitspieler'; };
// pid = nur Gebäude bzw. Inseln dieses Spielers (Getrennte Inseln); ohne Angabe alle
export function countType(g, t, pid) { let n = 0; for (const b of g.blds.values()) if (b.t === t && (pid == null || mine(g, b, pid))) n++; return n; }
export function totalRes(g, r, pid) { let n = 0; for (const k in g.state.isl) if (pid == null || myIsl(g, +k, pid)) n += g.state.isl[k].inv[r] || 0; return n; }
