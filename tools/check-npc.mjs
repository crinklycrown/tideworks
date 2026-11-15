/* Handels-Test ohne Browser (npm run check:npc):
   Handel mit den Völkern in der Simulation: Kontakt und Rufstufen, Kaufen und Verkaufen am Steg, Preisdruck und Erholung,
   Aufträge (Liefern, Ablauf mit Teilzahlung), Lieferverträge über eine echte Route mit Abrechnung am Morgen,
   Pläne und Seekarte, wachsende Dörfer, Geschenke von Aurel, Speichern/Laden, Spiegel und Koop-Sicht, Migration von Version 16.
   Beendet sich mit Code 1 bei Fehlern. -v zeigt jeden Schritt. */
import { createGame, newGame, isUnlocked } from '../src/sim/state.js';
import { addBuilding } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import { sim, applyCommand, HOST_ONLY } from '../src/sim/sim.js';
import { npcPort } from '../src/sim/villages.js';
import { npcOf, npcPays, npcAsks, repLvl } from '../src/sim/npc.js';
import { serialize, loadInto } from '../src/save/serialize.js';
import { createSnapCache, worldMessage, buildSnapshot, createMirror } from '../src/sim/snapshot.js';
import { createView, netWorld, netSnap } from '../src/sim/views.js';
import { remoteWorld, remoteSnap } from '../src/net/remote.js';
import { NPC_ORDER } from '../src/data/npcs.js';
import { NPC_TRADE, REP_LEVELS, CONTRACTS } from '../src/data/npctrade.js';
import { RELIC_SOURCES } from '../src/data/relics.js';
import { RECIPES } from '../src/data/recipes.js';
import { SHIP_KINDS } from '../src/data/ships.js';
import { CYCLE, SAVE_VERSION } from '../src/config.js';
import { tkx, tky } from '../src/util/tiles.js';

const err = [], ok = (c, m) => { if (!c) err.push(m); else if (process.argv.includes('-v')) console.log('ok  ', m); };
const SEED = +(process.argv.find(a => /^\d+$/.test(a)) || 4711);
const g = createGame();
newGame(g, SEED, addBuilding, reveal, revealIsland);
const N = (id) => npcOf(g, id), evSince = (n) => g.events.slice(n), step = (s) => { for (let i = 0; i < s * 10; i++) sim(g, 0.1); };
const K = [...g.blds.values()].find(b => b.t === 'kontor');
applyCommand(g, { type: 'giveShip', x: K.x, y: K.y });
const ship = g.state.ships[0];
const dockAt = (id) => { const P = npcPort(g, id); ship.x = tkx(P._dock) + 0.5; ship.y = tky(P._dock) + 0.5; ship.st = 'idle'; ship.dest = null; ship.route = null; return P; };
const empty = () => { ship.cargo = ship.cargo.map(() => null); };
const cargo = (it) => ship.cargo.reduce((a, h) => a + (h && h.it === it ? h.n : 0), 0);
// bis kurz nach dem nächsten Morgen (Tageswechsel) vorspulen
const nextDawn = () => { g.state.time = (Math.floor(g.state.time / CYCLE) + 1) * CYCLE - 0.2; step(2.5); };

// Zustand und Daten
ok(g.state.npc && NPC_ORDER.every(id => N(id) && N(id).lv === -1), 'neues Spiel: Völker ohne Kontakt');
ok(N('ole').rep === 10 && N('brann').rep === 30 && N('aurel').rep === 60, 'Startruf Ole 10, Brann 30, Aurel 60');
ok(REP_LEVELS.length === 4 && repLvl(N('ole').rep) === 0 && repLvl(N('aurel').rep) === 2, 'vier Rufstufen: Ole misstrauisch, Aurel freundlich');
// seit 0.24.0: die Relikt-Platzhalter sind echte Angebote (data/relics.js RELIC_SOURCES.npc), nur Aurels „Luxuswaren“ bleiben Platzhalter
for (const id of NPC_ORDER) ok(RELIC_SOURCES.npc[id] && !NPC_TRADE[id].sells.some(e => e.soon && /Relikt/.test(e.soon)), `${id}: Relikte im Angebot statt Platzhalter`);
ok(RECIPES.some(r => r.b === 'raeucherei') && SHIP_KINDS.kogge, 'Räucherei und Kogge vorhanden');
ok(HOST_ONLY.has('npcRep'), 'Debug npcRep nur für den Host');

// Vor dem Entdecken
dockAt('ole'); empty();
let n0 = g.events.length;
applyCommand(g, { type: 'shipLoad', ship: ship.id, it: 'fisch', n: 10 });
ok(evSince(n0).some(e => e.type === 'fail' && /kennt dich noch nicht/.test(e.msg)) && !cargo('fisch'), 'vor dem Entdecken kein Handel');

// Kontakt
for (const id of NPC_ORDER) applyCommand(g, { type: 'storyDebug', op: 'flag', flag: 'npc_' + id });
n0 = g.events.length; step(1.2);
ok(evSince(n0).some(e => e.type === 'npcLevel' && e.npc === 'ole' && e.first && e.lvl === 'misstrauisch'), 'erster Kontakt: Ole misstrauisch');
ok(N('ole').orders.length === 1 && N('aurel').orders.length === 3, 'Aufträge nach Stufe: Ole 1, Aurel 3');
ok(!isUnlocked(g, 'gruenden') && isUnlocked(g, 'ueberlauf'), 'Ole misstrauisch sperrt Kontor gründen; Brann neutral schaltet Überlauf frei');

// Kaufen am Steg
g.state.coins = 2000;
n0 = g.events.length;
applyCommand(g, { type: 'shipLoad', ship: ship.id, it: 'seil', n: 10 });
ok(!cargo('seil') && evSince(n0).some(e => e.type === 'fail' && /Ruf/.test(e.msg)), 'Seil bei Ole erst ab neutral');
const ask0 = npcAsks(g, 'ole', 'fisch'), c0 = g.state.coins;
applyCommand(g, { type: 'shipLoad', ship: ship.id, it: 'fisch', n: 40 });
ok(cargo('fisch') === 40 && g.state.coins < c0 && npcAsks(g, 'ole', 'fisch') > ask0, `40 Fisch gekauft (${c0 - g.state.coins} Münzen), Preis steigt`);
ok(Math.floor(N('ole').stock.fisch) === NPC_TRADE.ole.sells[0].n - 40, 'Vorrat sinkt');

// Verkaufen: erst an den Auftrag, dann an den Markt; Preisdruck und Erholung
empty();
const o = N('ole').orders[0];
ok(o && o.it === 'holz', 'Oles erster Auftrag will Holz');
o.n = 60;   // kleiner als die Ladung, damit ein Rest verkauft wird
applyCommand(g, { type: 'cargo', ship: ship.id, it: 'holz', n: 999 });
const have = cargo('holz'), pay0 = npcPays(g, 'ole', 'holz'), rep0 = N('ole').rep;
n0 = g.events.length; const c1 = g.state.coins;
for (let i = 0; i < ship.cargo.length; i++) applyCommand(g, { type: 'shipUnload', ship: ship.id, hold: i });
ok(evSince(n0).some(e => e.type === 'npcOrder' && e.npc === 'ole'), 'Auftrag mit Entladen erledigt');
ok(evSince(n0).some(e => e.type === 'npcTrade' && e.lines.some(l => l.kind === 'sell')), 'Rest verkauft');
ok(!cargo('holz') && g.state.coins > c1 + o.pay, `Münzen für Auftrag und Verkauf (+${g.state.coins - c1}, ${have} Holz)`);
ok(N('ole').rep > rep0, `Ruf steigt (${rep0} → ${N('ole').rep})`);
const pay1 = npcPays(g, 'ole', 'holz');
ok(pay1 < pay0, `viel Verkauf drückt den Preis (${pay0.toFixed(2)} → ${pay1.toFixed(2)})`);
step(60);
ok(npcPays(g, 'ole', 'holz') > pay1, `Preis erholt sich (${npcPays(g, 'ole', 'holz').toFixed(2)} nach 1 min)`);

// Rufstufe neutral: Freischaltung, Seekarte
n0 = g.events.length;
applyCommand(g, { type: 'npcRep', npc: 'ole', n: 30 });
ok(evSince(n0).some(e => e.type === 'npcLevel' && e.npc === 'ole' && e.lvl === 'neutral' && e.names.length) && g.state.unl.gruenden === 'npc', 'Ole neutral: Kontor gründen freigeschaltet');
const found0 = Object.keys(g.state.found || {}).length, cc = g.state.coins;
n0 = g.events.length;
applyCommand(g, { type: 'npcBuy', npc: 'ole', key: 'karte', ship: ship.id });
ok(evSince(n0).some(e => e.type === 'npcChart') && g.state.coins === cc - NPC_TRADE.ole.chart.price && N('ole').chart === NPC_TRADE.ole.chart.n - 1, 'Seekarte gekauft');
ok(Object.keys(g.state.found || {}).length >= found0, 'Seekarte deckt Nebel auf');

// Plan bei Brann (erst ab freundlich, Schiff am Steg)
dockAt('brann');
n0 = g.events.length;
applyCommand(g, { type: 'npcBuy', npc: 'brann', key: 'plan:brann_schnellband', ship: ship.id });
ok(!g.state.unl['plan:brann_schnellband'] && evSince(n0).some(e => e.type === 'fail'), 'Plan Schnellbänder bei Brann neutral gesperrt');
applyCommand(g, { type: 'npcRep', npc: 'brann', n: 55 });
applyCommand(g, { type: 'npcBuy', npc: 'brann', key: 'plan:brann_schnellband', ship: ship.id });
ok(g.state.unl['plan:brann_schnellband'] === 'npc' && isUnlocked(g, 'ship:kogge'), 'Brann freundlich: Plan gekauft, Kogge freigeschaltet');

// Auftrag läuft ab: Teilzahlung
dockAt('aurel'); empty();
const oa = N('aurel').orders[0];
applyCommand(g, { type: 'cargo', ship: ship.id, it: oa.it, n: 5 });
applyCommand(g, { type: 'npcDeliver', npc: 'aurel', oid: oa.id, ship: ship.id });
ok(oa.got === 5, 'Teillieferung für Aurels Auftrag');
oa.due = g.state.time + 0.5;
n0 = g.events.length; step(2.5);
ok(evSince(n0).some(e => e.type === 'npcOrderEnd' && e.npc === 'aurel' && e.got === 5 && e.coins > 0) && !N('aurel').orders.includes(oa), 'Auftrag abgelaufen, Teilzahlung');

// Liefervertrag über eine echte Route: Heimat (Holz laden) → Oles Steg (alles entladen)
dockAt('ole'); empty();
N('ole').orders = [];
applyCommand(g, { type: 'npcDeal', npc: 'ole', deal: 'ole_holz', op: 'take', ship: ship.id });
const d = N('ole').deals[0];
ok(d && d.it === 'holz' && d.fresh, 'Liefervertrag Holz abgeschlossen');
applyCommand(g, { type: 'give', n: 2000, items: ['holz'], isl: K.isl });
applyCommand(g, { type: 'setRoute', ship: ship.id, reset: true, stops: [{ kontor: K.id, load: [{ it: 'holz', mode: 'all', n: 0 }], unload: [], wait: false }, { kontor: npcPort(g, 'ole').id, load: [], unload: [{ it: '*', mode: 'all', n: 0 }], wait: false }] });
ok(ship.route && ship.route.stops.length === 2, 'Route mit NPC-Steg als Stopp');
const t0 = g.state.time, cd = g.state.coins;
nextDawn();   // frischer Tag, damit die Lieferung in einen Tag fällt
N('ole').orders = [];
for (let i = 0; i < 12 * 60 && d.got < d.n; i++) { step(1); N('ole').orders = []; }
ok(d.got >= d.n, `Route liefert den Vertrag (${d.got} / ${d.n} in ${Math.round((g.state.time - t0) / 60)} min)`);
ok(g.state.coins > cd, 'Vertragspreis bezahlt');
ship.route = null; ship.st = 'idle';
n0 = g.events.length; const rr = N('ole').rep;
nextDawn();
ok(evSince(n0).some(e => e.type === 'npcDeal' && e.ok && e.npc === 'ole') && N('ole').rep > rr, 'am Morgen abgerechnet: Bonus und Ruf');
n0 = g.events.length;
nextDawn();
ok(evSince(n0).some(e => e.type === 'npcDeal' && e.ok === false), 'verpasster Tag kostet Ruf');
nextDawn();
ok(!N('ole').deals.length, `nach ${CONTRACTS.missMax} verpassten Tagen gekündigt`);

// Dorf wächst
const npcB = () => [...g.blds.values()].filter(b => b.by === 'npc:ole').length, nb0 = npcB();
const vil0 = N('ole').vil;
N('ole').del = NPC_TRADE.ole.village[vil0].at - 1;
dockAt('ole'); empty();
applyCommand(g, { type: 'cargo', ship: ship.id, it: 'holz', n: 20 });
n0 = g.events.length;
applyCommand(g, { type: 'shipUnload', ship: ship.id, hold: 0 });
ok(evSince(n0).some(e => e.type === 'npcVillage' && e.npc === 'ole' && e.stage === vil0 + 1) && npcB() > nb0, `Oles Dorf wächst auf Stufe ${vil0 + 1} (${nb0} → ${npcB()} Gebäude)`);
ok([...g.blds.values()].some(b => b.by === 'npc:ole' && b.t === 'npc_laterne'), 'mit Laternen für die Nacht');

// Geschenke von Aurel (freundlich)
let gifts = 0;
for (let i = 0; i < 10; i++) { n0 = g.events.length; nextDawn(); gifts += evSince(n0).filter(e => e.type === 'npcGift').length; }
ok(gifts > 0, `Aurel schickt Geschenke (${gifts} in 10 Tagen)`);

// Speichern und Laden
const json = JSON.parse(serialize(g, { goalCollapsed: false }));
ok(json.v === SAVE_VERSION && json.npc && json.npc.ole, 'Spielstand enthält den Handel');
const g2 = createGame();
ok(loadInto(g2, JSON.parse(JSON.stringify(json))), 'Spielstand lädt');
ok(JSON.stringify(g2.state.npc) === JSON.stringify(g.state.npc), 'Handel nach dem Laden gleich');

// Spiegel und Koop-Sicht
const sc = createSnapCache(); worldMessage(g, sc);
const snap = buildSnapshot(g, sc, 1);
ok(snap.npc && snap.npc.ole.rep === N('ole').rep, 'Snapshot enthält den Handel');
{
  const v = createView('pgast1234'), m = createMirror();
  remoteWorld(m, netWorld(g, v));
  remoteSnap(m, netSnap(g, v, { speed: 1, halt: false }), 0);
  ok(m.state.npc && m.state.npc.brann.rep === N('brann').rep, 'Koop: Mitspieler sieht Ruf und Angebot');
}

// Koop: Debug-Ruf nur vom Host, Handel eines Mitspielers läuft über den Host wie jedes Kommando
{
  const r0 = N('brann').rep;
  applyCommand(g, { type: 'npcRep', npc: 'brann', n: 99 }, 'pgast1234');
  ok(N('brann').rep === r0, 'Koop: Mitspieler kann den Ruf nicht setzen');
  dockAt('brann'); empty(); g.state.coins = 1000;
  applyCommand(g, { type: 'shipLoad', ship: ship.id, it: 'zahnrad', n: 10 }, 'pgast1234');
  ok(cargo('zahnrad') === 10, 'Koop: Mitspieler kauft am Steg (gemeinsame Kasse)');
}
// Migration von Version 16: Handel beginnt frisch
const old = JSON.parse(JSON.stringify(json));
old.v = 16; delete old.npc;
const g3 = createGame();
ok(loadInto(g3, old) && g3.state.npc && g3.state.npc.ole.rep === NPC_TRADE.ole.rep, 'v16 → Handel mit Startwerten');

if (err.length) { console.error('FEHLER:\n' + err.join('\n')); process.exit(1); }
console.log(`Handel OK (Seed ${SEED}): Kontakt, Rufstufen, Kaufen/Verkaufen, Preise, Aufträge, Lieferverträge per Route, Pläne, Seekarte, Dörfer, Geschenke, Speichern, Koop, Migration v16.`);
