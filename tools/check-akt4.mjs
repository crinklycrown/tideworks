/* Akt-4-Test ohne Browser (npm run check:akt4), 0.21.0:
   Karte zu Brann → Story-Schritt akt3_ende mit cs_alte_karte und brann_karte → Akt 4, Leuchtturm Stufe 3 offen, Story-Zeile;
   Aurels Geschenke in Akt 4 größer und öfter; Aurels Frage einmal beim nächsten Besuch nach Stufe 3 (Anlegen), nicht vorher;
   Story-Spot Pumpwerk erst nach Stufe 3, bleibt bei Fehlschlag, Fund setzt pumpe_gefunden, Story-Zeile „Bring deinen Fund zu Brann“;
   Brann: erst brann_pumpwerk (pre), dann cs_flutnacht (noch ohne Szene), Akt 5, Stufe 4 offen; Speichern/Laden, Spiegel, Debug.
   Beendet sich mit Code 1 bei Fehlern. -v zeigt jeden Schritt. */
import { createGame, newGame, islData } from '../src/sim/state.js';
import { addBuilding, checkPlace } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import { sim, applyCommand } from '../src/sim/sim.js';
import { npcPort } from '../src/sim/villages.js';
import { npcOf } from '../src/sim/npc.js';
import { serialize, loadInto } from '../src/save/serialize.js';
import { createView, netWorld, netSnap } from '../src/sim/views.js';
import { createMirror } from '../src/sim/snapshot.js';
import { remoteWorld, remoteSnap } from '../src/net/remote.js';
import { DIVE, DIVE_PUMP, DIVE_STORY_TARGETS } from '../src/data/dive.js';
import { NPC_TRADE } from '../src/data/npctrade.js';
import { WONDER } from '../src/data/wonder.js';
import { actGoal, TRIGGER_BY_ID } from '../src/data/story.js';
import { CYCLE } from '../src/config.js';
import { tkx, tky } from '../src/util/tiles.js';

const err = [], ok = (c, m) => { if (!c) err.push(m); else if (process.argv.includes('-v')) console.log('ok  ', m); };
const SEED = +(process.argv.find(a => /^\d+$/.test(a)) || 4711);
const g = createGame();
newGame(g, SEED, addBuilding, reveal, revealIsland);
const S = () => g.state.story, D = () => g.state.dive;
const step = (s) => { for (let i = 0; i < s * 10; i++) sim(g, 0.1); };
const cmd = (c, pid) => { const n0 = g.events.length; applyCommand(g, c, pid); return g.events.slice(n0); };
const K = [...g.blds.values()].find(b => b.t === 'kontor');
const GUEST = 'pgast1234';
cmd({ type: 'giveShip', x: K.x, y: K.y });
const ship = g.state.ships[0];
const put = (x, y) => { ship.x = x; ship.y = y; ship.st = 'idle'; ship.dest = ''; ship.path = null; ship.route = null; };
const dockAt = (id) => { const P = npcPort(g, id); put(tkx(P._dock) + 0.5, tky(P._dock) + 0.5); return P; };
const away = () => put(K.x + 3, K.y + 30);
const nextDawn = () => { g.state.time = (Math.floor(g.state.time / CYCLE) + 1) * CYCLE - 0.2; step(2.5); };
const storyEv = (evs, id) => evs.find(e => e.type === 'story' && e.id === id);

// Akt 3 mit Glocke und gefundener Karte
cmd({ type: 'storyDebug', op: 'act', n: 3 });
cmd({ type: 'diveDebug', op: 'mount', ship: ship.id });
cmd({ type: 'storyDebug', op: 'flag', flag: 'karte_gefunden' });
ok(actGoal(S(), { bell: true }) === 'Bring die Karte zu Brann.', 'Akt 3 mit Karte: „Bring die Karte zu Brann.“');
ok(!WONDER.phases[2].need.act && WONDER.phases[2].need.flag === 'karte_gefunden', 'Stufe 3 hängt an karte_gefunden');

// Aurel vor Akt 4: Anlegen löst nichts aus
dockAt('aurel'); let evs = []; { const n0 = g.events.length; step(2); evs = g.events.slice(n0); }
ok(!evs.some(e => e.type === 'story'), 'Akt 3: Anlegen bei Aurel ohne Story-Schritt');
away(); step(2);

// Bei Brann: Szene cs_alte_karte, Dialog brann_karte, Akt 4
dockAt('brann'); step(2);
evs = cmd({ type: 'talk', npc: 'brann' });
const E3 = storyEv(evs, 'akt3_ende');
ok(E3 && E3.cs === 'cs_alte_karte' && E3.dialog === 'brann_karte' && !E3.pre, 'Gespräch mit Brann: cs_alte_karte, danach brann_karte');
ok(S().act === 4 && E3.act === 4, 'Akt 4 beginnt');
ok(/^Baue den Leuchtturm weiter aus/.test(actGoal(S(), { wonder: 2, site: 0 })), `Story-Zeile Akt 4: „${actGoal(S(), { wonder: 2, site: 0 })}“`);
ok(/Stufe 3.*Waren 40 %/.test(actGoal(S(), { wonder: 2, site: 3, share: .4 })), 'Story-Zeile mit Baustelle Stufe 3 und Anteil');
evs = cmd({ type: 'talk', npc: 'brann' });
ok(!evs.some(e => e.type === 'story'), 'Brann: Szene nur einmal');
away(); step(2);

// Aurels Geschenke: in Akt 4 größer und öfter als in Akt 3
{
  const A = npcOf(g, 'aurel'); A.rep = Math.max(A.rep, 60); A.lv = Math.max(A.lv | 0, 0);
  const count = (act) => {
    S().act = act; let n = 0, sum = 0;
    for (let i = 0; i < 30; i++) { const n0 = g.events.length; nextDawn(); for (const e of g.events.slice(n0)) if (e.type === 'npcGift' && e.npc === 'aurel') { n++; sum += e.coins || e.n || 0; } }
    return { n, avg: n ? sum / n : 0 };
  };
  g.state.coins = 0;
  for (const it of ['glas', 'uhrwerk', 'werkzeug']) islData(g, K.isl).inv[it] = 0;
  const a3 = count(3);
  for (const it of ['glas', 'uhrwerk', 'werkzeug']) islData(g, K.isl).inv[it] = 0;
  const a4 = count(4);
  ok(NPC_TRADE.aurel.gift.byAct && NPC_TRADE.aurel.gift.byAct[4], 'Geschenke je Akt einstellbar (gift.byAct)');
  ok(a4.n > a3.n, `Akt 4: öfter (${a3.n} → ${a4.n} Geschenke in 30 Tagen)`);
  ok(a4.avg > a3.avg * 1.5, `Akt 4: größer (Schnitt ${Math.round(a3.avg)} → ${Math.round(a4.avg)})`);
  S().act = 4;
}

// Vor Stufe 3: kein Pumpwerk-Spot, Aurel fragt noch nicht
step(DIVE.pause[1] + 10);
ok(!(D().spot && D().spot.find === 'pumpwerk') && !(D().story && D().story.find === 'pumpwerk'), 'Vor Stufe 3: kein Pumpwerk-Spot');
dockAt('aurel'); { const n0 = g.events.length; step(2); evs = g.events.slice(n0); }
ok(!storyEv(evs, 'akt4_aurel'), 'Vor Stufe 3: Aurel fragt nicht');
away(); step(2);

// Stufe 3 fertig (Debug wie im Spiel: Turm steht) → Pumpwerk-Spot ersetzt den nächsten Spot
{
  // Turm neben dem Kontor setzen (wie check-wonder), Waren dafür geben
  { const inv = islData(g, K.isl).inv; inv.holz = 1000; inv.ziegel = 1000; inv.eisen = 1000; }
  let spot = null;
  for (let r = 4; r < 60 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) { const x = K.x + dx, y = K.y + dy; if (checkPlace(g, 'leuchtturm', x, y, false, 0).ok) spot = { x, y }; }
  cmd({ type: 'place', t: 'leuchtturm', x: spot.x, y: spot.y, d: 0 });
  ok([...g.blds.values()].some(b => b.t === 'leuchtturm'), 'Leuchtturm steht');
}
cmd({ type: 'wonderDebug', n: 3, fire: true });
ok(((g.state.wonder && g.state.wonder.ph) | 0) === 3, 'Leuchtturm Stufe 3 fertig');
step(3);
ok((D().story && D().story.find === 'pumpwerk') || (D().spot && D().spot.find === 'pumpwerk'), 'Nach Stufe 3: Pumpwerk als nächster Spot vorgemerkt');
D().next = g.state.time; step(3);
ok(D().spot && D().spot.kind === 'story' && D().spot.find === 'pumpwerk', `Story-Spot Pumpwerk liegt (${D().spot && D().spot.x} / ${D().spot && D().spot.y})`);
ok(/großen Blasen/.test(actGoal(S(), { wonder: 3, spot: 'story' })), 'Story-Zeile: zu den großen Blasen');

// Aurel: einmal beim nächsten Besuch (Anlegen)
dockAt('aurel'); { const n0 = g.events.length; step(2); evs = g.events.slice(n0); }
const EA = storyEv(evs, 'akt4_aurel');
ok(EA && EA.dialog === 'aurel_tauchen' && !EA.cs, 'Nach Stufe 3: Aurel fragt beim Anlegen („Ihr taucht in letzter Zeit viel …“)');
evs = cmd({ type: 'talk', npc: 'aurel' });
ok(!storyEv(evs, 'akt4_aurel'), 'Aurels Frage nur einmal');
away(); step(2);
dockAt('aurel'); { const n0 = g.events.length; step(2); evs = g.events.slice(n0); }
ok(!storyEv(evs, 'akt4_aurel'), 'Auch beim nächsten Anlegen nicht wieder');
away(); step(2);
ok(Array.isArray(TRIGGER_BY_ID.akt4_aurel.on), 'Auslöser als Liste (Anlegen, Gespräch, Handel)');

// Tauchgang misslingt: Spot bleibt
const P = D().spot;
cmd({ type: 'diveDebug', op: 'over' });
evs = cmd({ type: 'diveStart', ship: ship.id });
ok(evs.some(e => e.type === 'diveStart' && e.spot.find === 'pumpwerk' && e.act === 4), 'Tauchgang am Pumpwerk startet (Akt 4)');
evs = cmd({ type: 'diveEnd', ok: false, junk: [{ it: 'schrott', n: 3 }] });
const R1 = evs.find(e => e.type === 'diveResult');
ok(R1 && !R1.ok && R1.keep && D().spot && D().spot.id === P.id, 'Misslungen (Luft leer): Spot bleibt bestehen');
ok(!S().flags.pumpe_gefunden, 'Ohne Fund kein Flag');
// Abbruch: Spot bleibt auch
cmd({ type: 'diveStart', ship: ship.id }); cmd({ type: 'diveEnd', cancel: true });
ok(D().spot && D().spot.id === P.id, 'Abgebrochen: Spot bleibt');
// Gast kann den Spot nicht stören; Speichern/Laden mit dem Spot
{
  const g2 = createGame();
  ok(loadInto(g2, serialize(g)) && g2.state.dive.spot && g2.state.dive.spot.find === 'pumpwerk' && g2.state.story.act === 4, 'Speichern/Laden: Pumpwerk-Spot und Akt 4 bleiben');
  const v = createView(GUEST), m = createMirror();
  remoteWorld(m, netWorld(g, v)); remoteSnap(m, netSnap(g, v, { speed: 1, halt: false }), 0);
  ok(m.state.dive && m.state.dive.spot && m.state.dive.spot.kind === 'story' && m.state.dive.spot.find === 'pumpwerk', 'Spiegel (Koop) sieht den Story-Spot');
}

// Erfolg: pumpe_gefunden, Story-Zeile
evs = cmd({ type: 'diveStart', ship: ship.id });
evs = cmd({ type: 'diveEnd', ok: true, found: 'pumpwerk' });
const R2 = evs.find(e => e.type === 'diveResult');
ok(R2 && R2.ok && R2.find === 'pumpwerk' && !D().spot, 'Erfolg: Fund Pumpwerk, Spot weg');
ok(S().flags.pumpe_gefunden && storyEv(evs, 'pumpwerk'), 'Flag pumpe_gefunden gesetzt');
ok(actGoal(S(), { wonder: 3 }) === 'Bring deinen Fund zu Brann.', 'Story-Zeile: „Bring deinen Fund zu Brann.“');
ok(DIVE_STORY_TARGETS.pumpwerk.name === 'Verbogenes Brecheisen' && DIVE_STORY_TARGETS.pumpwerk.desc === 'Ein schweres Brecheisen mit einem eingeprägten Wappen.', 'Fund: Verbogenes Brecheisen mit Beschreibung');
ok(DIVE_PUMP.air === 2 && DIVE_PUMP.keep, 'Doppelte Luft, Spot bleibt bei Fehlschlag (Daten)');
step(DIVE.pause[1] + 10);
ok(!(D().spot && D().spot.find === 'pumpwerk') && !(D().story && D().story.find === 'pumpwerk'), 'Danach kein Pumpwerk-Spot mehr');

// Brann: Zeile zum Pumpwerk, dann (Platzhalter) cs_flutnacht, Akt 5
dockAt('brann'); step(2);
evs = cmd({ type: 'talk', npc: 'brann' });
const E4 = storyEv(evs, 'akt4_ende');
ok(E4 && E4.pre === 'brann_pumpwerk' && E4.cs === 'cs_flutnacht' && E4.dialog === 'brann_flutnacht', 'Brann: erst „Das ist das alte Pumpwerk …“, dann cs_flutnacht (Platzhalter), dann sein Dialog');
ok(S().act === 5, 'Akt 5 beginnt (Stufe 4 offen über pumpe_gefunden)');

// Debug nur Host: Story-Spot erzwingen
{
  const g3 = createGame(); newGame(g3, SEED, addBuilding, reveal, revealIsland);
  applyCommand(g3, { type: 'diveDebug', op: 'story', find: 'pumpwerk' }, GUEST);
  ok(!g3.state.dive || !g3.state.dive.story, 'Debug story nur für den Host');
  applyCommand(g3, { type: 'diveDebug', op: 'story', find: 'pumpwerk' });
  ok(g3.state.dive.story && g3.state.dive.story.find === 'pumpwerk', 'Debug: dive(\'story\', \'pumpwerk\') merkt den Story-Spot vor');
}

if (err.length) { console.log('FEHLER:\n' + err.join('\n')); process.exit(1); }
console.log(`Akt 4 OK (Seed ${SEED}): Karte zu Brann → cs_alte_karte → Akt 4, Stufe 3, Aurels Geschenke größer und öfter, Aurels Frage einmal nach Stufe 3, Pumpwerk-Spot (bleibt bei Fehlschlag), pumpe_gefunden, Branns Zeile vor cs_flutnacht, Akt 5, Speichern, Spiegel, Debug.`);
