/* Taucherglocke-Test ohne Browser (npm run check:dive), 0.19.0:
   Teile bei Ole (Glockenseil) und Brann (Messingglocke) erst ab Akt 3, Oles Dialog „Lass die Toten schlafen.“ beim ersten Kauf,
   Montage in der Werft (Teile im Inselinventar, Schiff am Anleger, nur einmal), Tauchspot (immer nur einer, im aufgedeckten Meer,
   Abstand zu Land und Nebel), Tauchgang (nur über dem Spot, nur einer gleichzeitig, Beute in Laderaum bzw. Heimatinsel),
   Pause bis zum nächsten Spot, Zähler im Story-Zustand, Story-Spot mit Fund, Abbruch nach Zeit, Speichern/Laden, Spiegel, Debug.
   Beendet sich mit Code 1 bei Fehlern. -v zeigt jeden Schritt. */
import { createGame, newGame, islData, isUnlocked } from '../src/sim/state.js';
import { addBuilding, checkPlace, placeBuilding } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import { sim, applyCommand } from '../src/sim/sim.js';
import { npcAsks } from '../src/sim/npc.js';
import { npcPort } from '../src/sim/villages.js';
import { diveWhy, mountWhy, pickSpot, rollLoot } from '../src/sim/dive.js';
import { serialize, loadInto } from '../src/save/serialize.js';
import { createView, netWorld, netSnap } from '../src/sim/views.js';
import { createMirror } from '../src/sim/snapshot.js';
import { remoteWorld, remoteSnap } from '../src/net/remote.js';
import { DIVE, BELL, DIVE_LOOT, DIVE_GAME, DIVE_JUNK } from '../src/data/dive.js';
import { actGoal } from '../src/data/story.js';
import { tkx, tky } from '../src/util/tiles.js';
import { G_WATER } from '../src/config.js';

const err = [], ok = (c, m) => { if (!c) err.push(m); else if (process.argv.includes('-v')) console.log('ok  ', m); };
const SEED = +(process.argv.find(a => /^\d+$/.test(a)) || 4711);
const g = createGame();
newGame(g, SEED, addBuilding, reveal, revealIsland);
const S = () => g.state.story, D = () => g.state.dive;
const step = (s) => { for (let i = 0; i < s * 10; i++) sim(g, 0.1); };
const cmd = (c, pid) => { const n0 = g.events.length; applyCommand(g, c, pid); return g.events.slice(n0); };
const K = [...g.blds.values()].find(b => b.t === 'kontor'), k = K.isl, inv = islData(g, k).inv;
const GUEST = 'pgast1234';

// Akt 2: Teile noch nicht im Angebot
cmd({ type: 'storyDebug', op: 'act', n: 2 });
step(2);
cmd({ type: 'giveShip', x: K.x, y: K.y });
const ship = g.state.ships[0];
const cargo = (it) => ship.cargo.reduce((a, h) => a + (h && h.it === it ? h.n : 0), 0);
const empty = () => { ship.cargo = ship.cargo.map(() => null); };
const put = (x, y) => { ship.x = x; ship.y = y; ship.st = 'idle'; ship.dest = ''; ship.path = null; ship.route = null; };
const dockAt = (id) => { const P = npcPort(g, id); put(tkx(P._dock) + 0.5, tky(P._dock) + 0.5); return P; };
g.state.coins = 10000;
ok(!npcAsks(g, 'ole', 'glockenseil') && !npcAsks(g, 'brann', 'glockenhaube'), 'Akt 2: Glockenteile nicht im Angebot');
dockAt('ole');
let evs = cmd({ type: 'shipLoad', ship: ship.id, it: 'glockenseil', n: 1 });
ok(!cargo('glockenseil') && evs.some(e => e.type === 'fail'), 'Akt 2: Glockenseil nicht kaufbar');

// Akt 3: Bauplan da, Teile kaufen (Ole ist misstrauisch, verkauft trotzdem)
cmd({ type: 'storyDebug', op: 'act', n: 3 });
step(2);
ok(S().act === 3 && isUnlocked(g, 'glocke'), 'Akt 3 mit Bauplan Taucherglocke');
ok(npcAsks(g, 'ole', 'glockenseil') > 0 && npcAsks(g, 'brann', 'glockenhaube') > 0, `Akt 3: Ole und Brann verkaufen ihr Teil (${Math.round(npcAsks(g, 'ole', 'glockenseil'))} / ${Math.round(npcAsks(g, 'brann', 'glockenhaube'))} Münzen)`);
ok(/Baue die Taucherglocke/.test(actGoal(S(), { parts: 0 })), 'Story-Zeile: „Baue die Taucherglocke“');
dockAt('ole'); empty();
const c0 = g.state.coins;
evs = cmd({ type: 'shipLoad', ship: ship.id, it: 'glockenseil', n: 1 });
ok(cargo('glockenseil') === 1 && g.state.coins < c0, `Glockenseil bei Ole gekauft (−${c0 - g.state.coins})`);
ok(evs.some(e => e.type === 'story' && e.id === 'akt3_seil' && e.dialog === 'ole_tote'), 'Erster Kauf bei Ole: Dialog „Lass die Toten schlafen.“');
evs = cmd({ type: 'shipLoad', ship: ship.id, it: 'glockenseil', n: 1 });
ok(cargo('glockenseil') === 1, 'Nur ein Glockenseil auf Vorrat');
g.state.npc.ole.stock.glockenseil = 1;
evs = cmd({ type: 'shipLoad', ship: ship.id, it: 'glockenseil', n: 1 });
ok(!evs.some(e => e.type === 'story'), 'Dialog nur einmal');
dockAt('brann');
evs = cmd({ type: 'shipLoad', ship: ship.id, it: 'glockenhaube', n: 1 });
ok(cargo('glockenhaube') === 1, 'Messingglocke bei Brann gekauft');
ok(!evs.some(e => e.type === 'story'), 'Brann: kein Dialog beim Kauf');

// Werft auf der Heimatinsel, Teile ins Lager
inv.holz = 1000; inv.eisen = 1000; g.state.tech.schiffbau = 1;
let wp = null;
for (let r = 3; r < 60 && !wp; r++) for (let dy = -r; dy <= r && !wp; dy++) for (let dx = -r; dx <= r && !wp; dx++) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
  if (checkPlace(g, 'werft', K.x + dx, K.y + dy, false, 0).ok) wp = { x: K.x + dx, y: K.y + dy };
}
ok(wp, 'Bauplatz für eine Werft');
cmd({ type: 'place', t: 'werft', x: wp.x, y: wp.y, d: 0 });
const Wf = [...g.blds.values()].find(b => b.t === 'werft');
ok(Wf && Wf._dock != null, 'Werft mit Anleger steht');
ok(/fehlen/.test(mountWhy(g, Wf, null)), 'Ohne Teile im Lager: Montage nicht möglich');
put(tkx(K._dock) + 0.5, tky(K._dock) + 0.5);
for (let i = 0; i < ship.cargo.length; i++) cmd({ type: 'shipUnload', ship: ship.id, hold: i });
ok(inv.glockenseil >= 1 && inv.glockenhaube >= 1, 'Teile im Hauptkontor entladen');
dockAt('ole');
evs = cmd({ type: 'mountBell', id: Wf.id, ship: ship.id });
const farOk = !ship.bell && evs.some(e => e.type === 'fail' && /Anleger/.test(e.msg));
ok(farOk, 'Schiff nicht am Anleger: Montage abgelehnt');
put(tkx(Wf._dock) + 0.5, tky(Wf._dock) + 0.5);
const p0 = { s: inv.glockenseil, h: inv.glockenhaube };
evs = cmd({ type: 'mountBell', id: Wf.id, ship: ship.id });
ok(ship.bell === 1 && D().bell && D().bell.ship === ship.id, 'Glocke an das Schiff montiert');
ok(inv.glockenseil === p0.s - 1 && inv.glockenhaube === p0.h - 1, 'Montage verbraucht beide Teile');
ok(evs.some(e => e.type === 'bellMounted' && e.to === '*'), 'Meldung an alle: Glocke montiert');
inv.glockenseil = 1; inv.glockenhaube = 1;
evs = cmd({ type: 'mountBell', id: Wf.id, ship: ship.id });
ok(evs.some(e => e.type === 'fail' && /nur eine/.test(e.msg)), 'Nur einmal baubar');
ok(!npcAsks(g, 'ole', 'glockenseil') && !npcAsks(g, 'brann', 'glockenhaube'), 'Nach der Montage keine Teile mehr im Angebot');
ok(/Folge den Blasen/.test(actGoal(S(), { bell: true })), 'Story-Zeile danach: „Folge den Blasen“');

// Erster Spot nach DIVE.first Sekunden; genug aufgedeckt?
reveal(g, K.x, K.y, 160);
ok(!D().spot, 'Direkt nach der Montage noch kein Spot');
step(DIVE.first + 2);
const P1 = D().spot;
ok(P1 && P1.kind === 'normal', `Tauchspot erschienen (${P1 && P1.x} / ${P1 && P1.y})`);
if (P1) {
  let water = true, seen = true;
  for (let dy = -DIVE.coast; dy <= DIVE.coast; dy++) for (let dx = -DIVE.coast; dx <= DIVE.coast; dx++) if (g.W.rawGround(P1.x + dx, P1.y + dy) !== G_WATER) water = false;
  for (let dy = -DIVE.edge; dy <= DIVE.edge; dy++) for (let dx = -DIVE.edge; dx <= DIVE.edge; dx++) if (!g.fog.get(P1.x + dx, P1.y + dy)) seen = false;
  ok(water, `Spot hat ${DIVE.coast} Felder Abstand zu Land`);
  ok(seen, `Spot liegt mindestens ${DIVE.edge} Felder im aufgedeckten Meer`);
}
step(30);
ok(D().spot === P1, 'Immer nur ein Spot (bleibt liegen, bis getaucht wird)');

// Tauchgang: erst über dem Spot
ok(/Fahr erst/.test(diveWhy(g, ship)), 'Weit weg: „Fahr erst zum Tauchspot“');
evs = cmd({ type: 'diveStart', ship: ship.id });
ok(!D().busy && evs.some(e => e.type === 'fail'), 'Tauchgang weit weg abgelehnt');
cmd({ type: 'diveDebug', op: 'over' });
ok(diveWhy(g, ship) === '', 'Über dem Spot: Tauchgang möglich');
empty();
evs = cmd({ type: 'diveStart', ship: ship.id });
ok(D().busy && D().busy.pid === 'host' && evs.some(e => e.type === 'diveStart' && e.to === '*' && e.spot.id === P1.id), 'Tauchgang gestartet, Meldung an alle mit Spot');
ok(evs.some(e => e.type === 'diveStart' && e.intro === true && e.act === 3) && S().seen.cs_abstieg, 'Allererster Tauchgang: intro (cs_abstieg vor dem Minispiel), gleich als gesehen gemerkt');
evs = cmd({ type: 'diveStart', ship: ship.id }, GUEST);
ok(evs.some(e => e.type === 'fail' && /unten|taucht/.test(e.msg)), 'Zweiter Tauchgang gleichzeitig abgelehnt');
cmd({ type: 'diveEnd', ok: true }, GUEST);
ok(D().busy, 'Fremder Spieler kann den Tauchgang nicht beenden');
const t0 = g.state.time;
evs = cmd({ type: 'diveEnd', ok: true });
const R = evs.find(e => e.type === 'diveResult');
ok(R && R.ok && R.got.length, `Beute: ${R && R.got.map(o => `${o.n} ${o.it}`).join(', ')}`);
ok(R && R.got.every(o => cargo(o.it) >= o.n), 'Beute liegt im Laderaum');
ok(R && R.got.every(o => DIVE_LOOT.normal.list.some(e => e.it === o.it)), 'Beute aus der Beutetabelle');
ok(!D().spot && !D().busy && S().dives === 1, 'Spot weg, Zähler im Story-Zustand = 1');
ok(D().next >= t0 + DIVE.pause[0] && D().next <= t0 + DIVE.pause[1], `Pause bis zum nächsten Spot ${Math.round(D().next - t0)} s`);
ok(evs.some(e => e.type === 'story' && e.id === 'abstieg' && !e.cs && e.dialog === 'brann_glocke_haelt'), 'Nach dem ersten Tauchgang: Branns Satz (ohne Szene, die lief vorher)');
step(DIVE.pause[0] - 5);
ok(!D().spot, 'Während der Pause kein Spot');
step(DIVE.pause[1] - DIVE.pause[0] + 10);
const P2 = D().spot;
ok(P2 && P2.id !== P1.id, 'Nach der Pause ein neuer Spot');

// Laderaum voll: Rest ins Lager der Heimatinsel; nichts gefunden = keine Beute, Zähler bleibt
cmd({ type: 'diveDebug', op: 'over' });
ship.cargo = ship.cargo.map(() => ({ it: 'holz', n: 40 }));
const hv = {}; for (const e of DIVE_LOOT.normal.list) hv[e.it] = inv[e.it] || 0;
evs = cmd({ type: 'diveStart', ship: ship.id });
ok(evs.some(e => e.type === 'diveStart' && e.intro === false), 'Zweiter Tauchgang ohne intro');
evs = cmd({ type: 'diveEnd', ok: true });
const R2 = evs.find(e => e.type === 'diveResult');
ok(!evs.some(e => e.type === 'story'), 'Branns Satz nur einmal');
ok(R2 && !R2.got.length && R2.home.length && R2.home.every(o => inv[o.it] === hv[o.it] + o.n), 'Laderaum voll: Beute ins Lager der Heimatinsel');
ok(S().dives === 2, 'Zähler = 2');
step(DIVE.pause[1] + 5);
cmd({ type: 'diveDebug', op: 'over' });
cmd({ type: 'diveStart', ship: ship.id });
empty();
evs = cmd({ type: 'diveEnd', ok: false, junk: [{ it: 'schrott', n: 3 }, { it: 'gold', n: 99 }, { it: 'perle', n: 50 }, { it: 'schrott', n: 1e9 }, null, { it: 'kohle', n: -4 }] });
const R3 = evs.find(e => e.type === 'diveResult');
const jmax = (it) => DIVE_JUNK.find(j => j.it === it).n[1];
ok(R3 && !R3.ok && !R3.main.length && S().dives === 2 && !D().spot, 'Ohne Fund: keine Hauptbeute, Zähler bleibt, Spot weg');
ok(R3 && R3.small.length === 2 && R3.small.find(o => o.it === 'schrott').n === 3 + jmax('schrott') && R3.small.find(o => o.it === 'perle').n === jmax('perle'),
  `Kleinkram bleibt auch ohne Fund, geprüft (unbekannte Ware weg, Mengen begrenzt): ${R3 && R3.small.map(o => o.n + ' ' + o.it).join(', ')}`);
ok(cargo('schrott') === 3 + jmax('schrott') && cargo('perle') === jmax('perle'), 'Kleinkram liegt im Laderaum');

// Abbruch nach DIVE.timeout (Taucher weg): Spot bleibt
step(DIVE.pause[1] + 5);
const P4 = D().spot;
cmd({ type: 'diveDebug', op: 'over' });
cmd({ type: 'diveStart', ship: ship.id }, GUEST);
ok(D().busy && D().busy.pid === GUEST, 'Mitspieler taucht (Gemeinsame Insel)');
step(DIVE.timeout + 3);
ok(!D().busy && D().spot === P4, 'Hängender Tauchgang nach Zeit abgebrochen, Spot bleibt');

// Story-Spot (für spätere Threads): Fund löst find:karte aus
cmd({ type: 'diveDebug', op: 'story', find: 'karte' });
step(DIVE.pause[1] + 5);
ok(D().spot && D().spot.kind === 'story' && D().spot.find === 'karte', 'Story-Spot ersetzt den normalen Spot');
cmd({ type: 'diveDebug', op: 'over' });
cmd({ type: 'diveStart', ship: ship.id });
evs = cmd({ type: 'diveEnd', ok: true });
ok(S().flags.karte_gefunden && evs.some(e => e.type === 'story' && e.id === 'karte'), 'Story-Spot: find:karte setzt karte_gefunden');
cmd({ type: 'storyDebug', op: 'flag', flag: 'karte_gefunden', off: true });
delete S().once.karte;

// Karte der alten Welt: nach DIVE_GAME.karteAfter erfolgreichen Tauchgängen in Akt 3 ist der nächste Spot ein Story-Spot mit der Karte
cmd({ type: 'diveDebug', op: 'count', n: 99 }, GUEST);
ok(S().dives !== 99, 'Debug count nur für den Host');
cmd({ type: 'diveDebug', op: 'count', n: DIVE_GAME.karteAfter - 1 });
D().story = null; D().spot = null; D().next = g.state.time;
step(3);
ok(S().dives === DIVE_GAME.karteAfter - 1 && D().spot && D().spot.kind === 'normal' && !D().story, `Vor ${DIVE_GAME.karteAfter} Tauchgängen: normaler Spot`);
cmd({ type: 'diveDebug', op: 'over' }); cmd({ type: 'diveStart', ship: ship.id }); empty(); cmd({ type: 'diveEnd', ok: true });
step(2);
ok(S().dives === DIVE_GAME.karteAfter && D().story && D().story.find === 'karte' && !D().spot, `Nach ${DIVE_GAME.karteAfter} Tauchgängen: Karte für den nächsten Spot vorgemerkt`);
step(DIVE.pause[1] + 5);
ok(D().spot && D().spot.kind === 'story' && D().spot.find === 'karte', 'Nächster Spot: Story-Spot mit der Alten Karte');
cmd({ type: 'diveDebug', op: 'over' }); cmd({ type: 'diveStart', ship: ship.id }); cmd({ type: 'diveEnd', ok: false });
step(DIVE.pause[1] + 5);
ok(D().spot && D().spot.find === 'karte' && !S().flags.karte_gefunden, 'Luft leer bei der Karte: nächster Spot wieder mit der Karte');
cmd({ type: 'diveDebug', op: 'over' }); cmd({ type: 'diveStart', ship: ship.id }); empty();
evs = cmd({ type: 'diveEnd', ok: true, found: 'karte' });
ok(S().flags.karte_gefunden && evs.some(e => e.type === 'diveResult' && e.find === 'karte'), 'Karte gefunden: Flag karte_gefunden, Ergebnis mit Fund');
ok(actGoal(S(), { bell: true }) === 'Bring die Karte zu Brann.', 'Story-Zeile: „Bring die Karte zu Brann.“');
step(DIVE.pause[1] + 5);
ok(D().spot && D().spot.kind === 'normal' && !D().story, 'Danach wieder normale Spots');
cmd({ type: 'storyDebug', op: 'flag', flag: 'karte_gefunden', off: true });
cmd({ type: 'diveDebug', op: 'count', n: 2 });
evs = cmd({ type: 'diveDebug', op: 'intro' });
ok(!S().seen.cs_abstieg, 'Debug intro: Abstieg wird wieder gezeigt');

// Speichern/Laden mitten im Tauchgang: Glocke und Spot bleiben, der Tauchgang nicht
step(DIVE.pause[1] + 5);
cmd({ type: 'diveDebug', op: 'over' });
cmd({ type: 'diveStart', ship: ship.id });
{
  const g2 = createGame();
  ok(loadInto(g2, serialize(g)), 'Spielstand mit Glocke lädt');
  const s2 = g2.state.ships.find(s => s.id === ship.id);
  ok(s2 && s2.bell === 1 && g2.state.dive.bell.ship === ship.id, 'Glocke nach dem Laden am Schiff');
  ok(g2.state.dive.spot && g2.state.dive.spot.id === D().spot.id && !g2.state.dive.busy, 'Spot gespeichert, laufender Tauchgang nicht');
  ok(g2.state.story.dives === S().dives, 'Zähler gespeichert');
  // alter Spielstand ohne dive
  const j = JSON.parse(serialize(g)); delete j.dive; delete j.story.dives;
  for (const s of j.ships) delete s.bell;
  const g3 = createGame();
  ok(loadInto(g3, JSON.stringify(j)) && g3.state.dive && !g3.state.dive.bell && g3.state.story.dives === 0, 'Alter Spielstand (0.18) lädt ohne Glocke');
  // 0.20.1: Stand aus älteren Versionen in Akt 3 ohne Bauplan Taucherglocke und mit altem Ole-Auslöser
  delete j.unl.glocke; delete j.story.flags.plan_glocke; delete j.story.once.akt2_ende; j.story.once.akt3_ole = 5; delete j.story.once.akt3_seil;
  const g4 = createGame();
  ok(loadInto(g4, JSON.stringify(j)), 'Alter Stand ohne Bauplan lädt');
  const W4 = [...g4.blds.values()].find(b => b.t === 'werft');
  ok(isUnlocked(g4, 'glocke') && g4.state.story.flags.plan_glocke && g4.state.story.once.akt2_ende, 'Alter Stand in Akt 3: Bauplan Taucherglocke nachgeholt');
  ok(!W4 || !/Bauplan/.test(mountWhy(g4, W4, null)), 'Alter Stand: Werft verlangt keinen Bauplan mehr');
  ok(!g4.state.story.once.akt3_seil, 'Alter Stand: Oles Dialog beim Glockenseil noch offen');
}
cmd({ type: 'diveEnd', cancel: true });

// Spiegel (Koop-Mitspieler): Spot und Glocke kommen an
{
  const v = createView(GUEST), m = createMirror();
  remoteWorld(m, netWorld(g, v)); remoteSnap(m, netSnap(g, v, { speed: 1, halt: false }), 0);
  const ms = m.state.ships.find(s => s.id === ship.id);
  ok(m.state.dive && m.state.dive.spot && m.state.dive.spot.id === D().spot.id && ms && ms.bell === 1, 'Spiegel sieht Tauchspot und Glocke');
}

// Debug nur für den Host; Teile geben; Spot sofort
evs = cmd({ type: 'diveDebug', op: 'reset' }, GUEST);
ok(D().bell, 'Debug nur für den Host');
{
  const g4 = createGame(); newGame(g4, SEED, addBuilding, reveal, revealIsland);
  const K4 = [...g4.blds.values()].find(b => b.t === 'kontor');
  applyCommand(g4, { type: 'diveDebug', op: 'parts' });
  ok(Object.keys(BELL.cost).every(it => islData(g4, K4.isl).inv[it] >= 1), 'Debug parts: beide Teile im Lager');
  applyCommand(g4, { type: 'giveShip', x: K4.x, y: K4.y });
  applyCommand(g4, { type: 'diveDebug', op: 'mount' });
  reveal(g4, K4.x, K4.y, 140);
  applyCommand(g4, { type: 'diveDebug', op: 'spot' });
  ok(g4.state.dive.spot, 'Debug spot: Spot sofort');
  // Getrennte Inseln (ohne Geschichte): läuft ohne Fehler
  const g5 = createGame(); newGame(g5, SEED, addBuilding, reveal, revealIsland, { slots: 2 });
  for (let i = 0; i < 30; i++) sim(g5, 0.1);
  ok(g5.state.dive && !g5.state.dive.spot, 'Getrennte Inseln: ohne Glocke kein Spot');
}
// Beute würfeln: immer mindestens eine Ware aus der Tabelle
{
  let n = 0;
  for (let i = 0; i < 200; i++) { D().n = i; const L = rollLoot(g, 'normal'); if (L.length && L.every(o => o.n > 0)) n++; }
  ok(n === 200, 'Beutetabelle liefert immer etwas');
  ok(pickSpot(g, 1), 'pickSpot findet Plätze');
}

if (err.length) { console.log('FEHLER:\n' + err.join('\n')); process.exit(1); }
console.log(`Taucherglocke OK (Seed ${SEED}): Teile ab Akt 3 bei Ole/Brann, Oles Dialog einmal, Montage in der Werft (einmal), ein Spot im aufgedeckten Meer, Tauchgang mit Beute, Pause, Zähler, Story-Spot, Abbruch, Speichern, Spiegel, Debug; 0.20.0: Abstieg vor dem ersten Tauchgang, Branns Satz, Kleinkram, Karte der alten Welt.`);
