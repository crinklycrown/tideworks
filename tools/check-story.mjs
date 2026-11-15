/* Story-Test ohne Browser (npm run check:story):
   Spielt Akt 1 in der Simulation durch, mit echtem Segeln: Schiff zu Ole, Brann und Aurel (Entdecken beim Näherkommen),
   Gespräche am Steg, zurück zu Brann → Bauplan Weltenleuchtturm, Akt 2. Prüft außerdem: Bauen auf NPC-Inseln gesperrt,
   NPC-Gebäude fest, Leuchtturm nur auf der Heimatinsel und Stufen nach Akt, Debug-Schalter (Akt setzen, zurücksetzen),
   Speichern/Laden, Spiegel (Snapshot) und die Migration eines Spielstands von Version 15.
   Beendet sich mit Code 1 bei Fehlern. */
import { createGame, newGame } from '../src/sim/state.js';
import { addBuilding, checkPlace } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import { sim, applyCommand } from '../src/sim/sim.js';
import { stegLine } from '../src/sim/kontor.js';
import { npcPort, shipAtPort } from '../src/sim/villages.js';
import { wonderReason } from '../src/sim/wonder.js';
import { serialize, loadInto } from '../src/save/serialize.js';
import { createSnapCache, worldMessage, buildSnapshot, createMirror } from '../src/sim/snapshot.js';
import { createView, netWorld, netSnap } from '../src/sim/views.js';
import { remoteWorld, remoteSnap } from '../src/net/remote.js';
import { isUnlocked } from '../src/sim/state.js';
import { NPC_ORDER } from '../src/data/npcs.js';
import { BD } from '../src/data/buildings.js';
import { SAVE_VERSION } from '../src/config.js';
import { tkx, tky } from '../src/util/tiles.js';

const err = [], ok = (c, m) => { if (!c) err.push(m); else if (process.argv.includes('-v')) console.log('ok  ', m); };
const SEED = +(process.argv.find(a => /^\d+$/.test(a)) || 4711);
const g = createGame();
newGame(g, SEED, addBuilding, reveal, revealIsland);
const S = () => g.state.story;
ok(S() && S().act === 1, 'neues Spiel beginnt in Akt 1');
ok(g.events.some(e => e.type === 'story' && e.id === 'prolog' && e.cs === 'cs_prolog'), 'Prolog-Ereignis beim Start');
ok(!isUnlocked(g, 'leuchtturm'), 'Leuchtturm am Anfang gesperrt');
for (const id of NPC_ORDER) ok(npcPort(g, id), `Steg von ${id} steht`);

// NPC-Gebäude abreißen
const PO = npcPort(g, 'ole');
let n0 = g.events.length;
applyCommand(g, { type: 'remove', id: PO.id });
ok(g.blds.has(PO.id), 'NPC-Steg lässt sich nicht abreißen');

// Gespräch vor dem Entdecken
n0 = g.events.length;
applyCommand(g, { type: 'talk', npc: 'ole' });
ok(g.events.slice(n0).some(e => e.type === 'fail' && /kennt dich noch nicht/.test(e.msg)), 'Gespräch vor dem Entdecken abgelehnt');

// Schiff vom Heimatkontor
const K = [...g.blds.values()].find(b => b.t === 'kontor');
applyCommand(g, { type: 'giveShip', x: K.x, y: K.y });
const ship = g.state.ships[0];
ok(ship, 'Schiff erhalten');

function sailTo(id, maxMin = 25) {
  const P = npcPort(g, id), L = stegLine(P.t, P.x, P.y, P.d, P.sl);
  applyCommand(g, { type: 'shipGoto', ship: ship.id, x: L.dock.x, y: L.dock.y });
  const t0 = g.state.time;
  for (let i = 0; i < maxMin * 60 * 10; i++) {
    sim(g, 0.1);
    if (ship.st !== 'sail' && shipAtPort(g, P)) break;
    if (ship.st !== 'sail' && i > 20) break;
  }
  for (let i = 0; i < 15; i++) sim(g, 0.1);   // Hinweis „liegt am Steg“ kommt mit dem Sekundentakt
  const at = !!shipAtPort(g, P);
  console.log(`${id}: ${Math.round(Math.hypot(L.dock.x - tkx(K._dock), L.dock.y - tky(K._dock)))} Felder, ${Math.round((g.state.time - t0) / 60)} min Spielzeit, am Steg: ${at ? 'ja' : 'nein'}`);
  return at;
}
const talk = (npc) => { const n = g.events.length; applyCommand(g, { type: 'talk', npc }); sim(g, 0.1); return g.events.slice(n); };

// Reihenfolge: Brann zuerst (Gespräch noch ohne Bauplan), dann Ole, Aurel, zurück zu Brann
let evs = [];
const grab = () => { const e = g.events.slice(); return e; };
ok(sailTo('brann'), 'Schiff erreicht Branns Steg');
ok(S().flags.npc_brann, 'Flag npc_brann nach dem Entdecken');
ok(g.events.some(e => e.type === 'story' && e.id === 'npc_brann' && e.cs === 'cs_npc_brann' && e.dialog === 'brann_1'), 'Story-Ereignis cs_npc_brann mit Dialog brann_1');
ok(g.events.some(e => e.type === 'discovered' && e.npc === 'brann' && e.name === 'Werkstattbucht'), 'Entdeckt-Ereignis mit NPC und Inselnamen');
ok(g.events.some(e => e.type === 'npcArrive' && e.npc === 'brann'), 'Hinweis beim Anlegen an Branns Steg');
{ // Version 18: ohne Story-Schritt nur beim ersten Anlegen je NPC
  const x0 = ship.x, y0 = ship.y, n1 = g.events.length;
  ship.x += 40; for (let i = 0; i < 15; i++) sim(g, 0.1);
  ship.x = x0; ship.y = y0; for (let i = 0; i < 15; i++) sim(g, 0.1);
  ok(!g.events.slice(n1).some(e => e.type === 'npcArrive') && S().once.steg_brann, 'zweites Anlegen bei Brann ohne Story-Schritt: kein Hinweis mehr');
}
evs = talk('brann');
ok(evs.some(e => e.type === 'talk' && e.dialog === 'brann_idle') && S().act === 1, 'Brann vor allen drei Völkern: nur ein Satz, Akt bleibt 1');
n0 = g.events.length; const cargo0 = ship.cargo; ship.cargo = ship.cargo.map(() => null);
applyCommand(g, { type: 'shipLoad', ship: ship.id, it: 'holz', n: 1 });
ok(g.events.slice(n0).some(e => e.type === 'fail' && /Brann verkauft kein Holz/.test(e.msg)) && !ship.cargo.some(Boolean), 'Brann verkauft kein Holz');
n0 = g.events.length; g.state.coins = 500;
applyCommand(g, { type: 'shipLoad', ship: ship.id, it: 'zahnrad', n: 10 });
ok(ship.cargo.some(h => h && h.it === 'zahnrad' && h.n === 10) && g.state.coins < 500 && g.events.slice(n0).some(e => e.type === 'npcTrade'), `bei Brann 10 Zahnräder gekauft (${500 - g.state.coins} Münzen)`);
ok(S().act === 1, 'Handel mit Brann ändert den Akt nicht');
ship.cargo = cargo0;
ok(sailTo('ole'), 'Schiff erreicht Oles Steg');
ok(S().flags.npc_ole, 'Flag npc_ole');
{ let r0 = null; for (let y = PO.y - 8; y < PO.y + 8 && !r0; y++) for (let x = PO.x - 8; x < PO.x + 8 && !r0; x++) if (g.W.il(x, y) === PO.isl && g.fog.get(x, y) && !g.bmap.get(x, y)) r0 = checkPlace(g, 'band', x, y, 0);
  ok(r0 && !r0.ok && /Oles Insel/.test(r0.reason || ''), `Bauen auf Oles Insel gesperrt (${r0 && r0.reason})`); }
evs = talk('ole');
ok(evs.some(e => e.type === 'talk' && e.dialog === 'ole_idle'), 'Ole: ein Satz');
ok(sailTo('aurel', 40), 'Schiff erreicht Aurels Steg (Ring 3)');
ok(S().flags.npc_aurel, 'Flag npc_aurel');
ok(S().act === 1, 'nach dem Entdecken aller drei noch Akt 1 (zurück zu Brann)');
ok(sailTo('brann', 40), 'zurück an Branns Steg');
evs = talk('brann');
ok(evs.some(e => e.type === 'story' && e.id === 'akt1_ende' && e.cs === 'cs_bauplan' && e.dialog === 'brann_bauplan'), 'Akt 1 Ende: cs_bauplan mit Dialog');
ok(S().act === 2, 'jetzt Akt 2');
ok(isUnlocked(g, 'leuchtturm') && g.state.unl.leuchtturm === 'story', 'Leuchtturm durch die Geschichte freigeschaltet');
evs = talk('brann');
ok(evs.some(e => e.type === 'talk' && e.dialog === 'brann_idle2') && !evs.some(e => e.type === 'story'), 'zweites Gespräch: kein Schritt doppelt');

// Leuchtturm: nur Heimatinsel; Stufe 3 erst mit dem Flag karte_gefunden (ausführlich: npm run check:wonder)
const PB = npcPort(g, 'brann');
const rL = checkPlace(g, 'leuchtturm', PB.x - 6, PB.y, 0);
ok(!rL.ok, `Leuchtturm nicht auf Branns Insel (${rL.reason})`);
const fakeT = { t: 'leuchtturm', isl: 0, by: null, owner: null, id: -1 };
g.state.wonder.ph = 2;
ok(/später freigeschaltet/.test(wonderReason(g, fakeT) || ''), `Stufe 3 in Akt 2 gesperrt (${wonderReason(g, fakeT)})`);
g.state.wonder.ph = 0;

// Speichern und Laden
const json = JSON.parse(serialize(g, { goalCollapsed: false }));
ok(json.v === SAVE_VERSION && json.story && json.npcs, 'Spielstand enthält Geschichte und NPC-Zellen');
const g2 = createGame();
ok(loadInto(g2, JSON.parse(JSON.stringify(json))), 'Spielstand lädt');
ok(g2.state.story.act === 2 && g2.state.story.flags.npc_aurel && g2.state.story.once.akt1_ende, 'Geschichte nach dem Laden gleich');
ok(NPC_ORDER.every(id => npcPort(g2, id)), 'Dörfer nach dem Laden da');
ok([...g2.blds.values()].filter(b => b.npc).length === [...g.blds.values()].filter(b => b.npc).length, 'gleich viele NPC-Gebäude');

// Spiegel: Welt-Nachricht mit NPC-Zellen, Snapshot mit Geschichte
const wm = worldMessage(g, createSnapCache());
ok(wm.npcs && wm.npcs.ole, 'Welt-Nachricht enthält NPC-Zellen');
const snap = buildSnapshot(g, createSnapCache(), 1);
ok(snap.story && snap.story.act === 2, 'Snapshot enthält die Geschichte');

// Koop (Gemeinsame Insel): Mitspieler bekommt NPC-Zellen, Dörfer und Geschichte
{
  const v = createView('pgast1234'), w = netWorld(g, v), m = createMirror();
  remoteWorld(m, w);
  remoteSnap(m, netSnap(g, v, { speed: 1, halt: false }), 0);
  ok(w.npcs && m.state.npcs && m.state.npcs.aurel, 'Koop: Mitspieler bekommt die NPC-Zellen');
  ok(m.state.story && m.state.story.act === 2, 'Koop: Mitspieler sieht den Akt');
  ok(m.W.npcIsl('brann') === g.W.npcIsl('brann'), 'Koop: Welt des Mitspielers hat dieselben NPC-Inseln');
}
// Debug-Schalter
applyCommand(g, { type: 'storyDebug', op: 'act', n: 4 });
ok(S().act === 4 && S().once.akt3_ende && S().flags.karte_gefunden, 'Debug: Akt 4 setzt frühere Schritte');
applyCommand(g, { type: 'storyDebug', op: 'act', n: 1 });
ok(S().act === 1 && !S().once.akt1_ende && !isUnlocked(g, 'leuchtturm'), 'Debug: zurück auf Akt 1 sperrt den Leuchtturm wieder');
ok(S().flags.npc_brann, 'Debug: Akt 1 behält die Entdeckungen (Schritte von Akt 1)');
applyCommand(g, { type: 'storyDebug', op: 'act', n: 2 });
ok(S().act === 2 && isUnlocked(g, 'leuchtturm'), 'Debug: Akt 2 schaltet den Leuchtturm frei');
n0 = g.events.length;
applyCommand(g, { type: 'storyDebug', op: 'fire', on: 'wonder:2' });
ok(S().act === 3 && g.events.slice(n0).some(e => e.type === 'story' && e.id === 'akt2_ende'), 'Debug: Auslöser wonder:2 → Akt 3');
applyCommand(g, { type: 'storyDebug', op: 'act', n: 5 });
applyCommand(g, { type: 'storyDebug', op: 'fire', on: 'wonder:4' });
ok(g.events.some(e => e.type === 'story' && e.id === 'finale' && e.choice), 'Finale mit Entscheidung');
applyCommand(g, { type: 'storyChoice', c: 'b' });
ok(S().choice === 'b' && S().act === 6, 'Entscheidung B, Akt 6');
n0 = g.events.length;
applyCommand(g, { type: 'storyChoice', c: 'a' });
ok(S().choice === 'b' && g.events.slice(n0).some(e => e.type === 'fail'), 'Entscheidung ist endgültig');

// Migration von Version 15: ohne Geschichte, ohne Dörfer
const old = JSON.parse(JSON.stringify(json));
old.v = 15; delete old.story; delete old.npcs;
old.blds = old.blds.filter(b => !BD[b.t] || !BD[b.t].npc);
for (const k in old.isl) if (old.isl[k].name && ['Pfahldorf', 'Werkstattbucht', 'Goldberg'].includes(old.isl[k].name)) delete old.isl[k];
old.found = {}; old.unl = Object.assign({}, old.unl, { leuchtturm: 'debug' });
const g3 = createGame();
ok(loadInto(g3, old), 'Spielstand v15 lädt');
ok(g3.state.story && g3.state.story.act === 1, 'v15 → Geschichte beginnt in Akt 1');
ok(NPC_ORDER.every(id => npcPort(g3, id)), 'v15 → Dörfer gebaut');
ok(g3.events.some(e => e.type === 'migrated16'), 'v15 → Hinweis migrated16');
ok(!isUnlocked(g3, 'leuchtturm'), 'v15 ohne Turm → Leuchtturm wieder über die Geschichte');
for (const id of NPC_ORDER) { const P = npcPort(g3, id); ok(!g3.fog.get(P.x, P.y), `v15 → ${id} liegt im unerkundeten Nebel`); }
// Getrennte Inseln: ohne Geschichte
const g4 = createGame();
newGame(g4, SEED, addBuilding, reveal, revealIsland, { slots: 2 });
ok(!g4.state.story && !g4.state.npcs && ![...g4.blds.values()].some(b => b.npc), 'Getrennte Inseln: ohne Geschichte und NPC-Inseln');

if (err.length) { console.error('FEHLER:\n' + err.join('\n')); process.exit(1); }
console.log(`Geschichte OK (Seed ${SEED}): Akt 1 durchgespielt, Leuchtturm, Debug, Speichern/Laden, Spiegel, Migration v15.`);
