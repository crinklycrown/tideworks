/* Leuchtturm-Test ohne Browser (npm run check:wonder), 0.18.0:
   Weltenleuchtturm als Story-Gebäude mit vier Stufen und Baustelle: nur einmal, Stufe 1 und 2 in Akt 2, Stufe 3 erst mit
   karte_gefunden, Stufe 4 erst mit pumpe_gefunden (gesperrt nur „Wird später freigeschaltet“). Waren kommen über Bänder
   (nur fehlende Waren, sonst staut das Band) und aus dem Inselinventar (abschaltbar). Jede Stufe deckt mehr um den Turm auf.
   Akt 2: einmal Aurels Dialog beim Handel; Stufe 2 → cs_licht_im_wind, Dialog brann_glocke, Bauplan Taucherglocke, Akt 3.
   Außerdem: Speichern/Laden mitten auf der Baustelle, alte Baustelle (vor 0.18.0 schon bezahlt) baut weiter, Spiegel, Debug.
   Beendet sich mit Code 1 bei Fehlern. -v zeigt jeden Schritt. */
import { createGame, newGame, islData, isUnlocked } from '../src/sim/state.js';
import { addBuilding, checkPlace, placeBuilding } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import { sim, applyCommand } from '../src/sim/sim.js';
import { npcBuyTo } from '../src/sim/npc.js';
import { wonderReason, wonderFull } from '../src/sim/wonder.js';
import { serialize, loadInto } from '../src/save/serialize.js';
import { createMirror } from '../src/sim/snapshot.js';
import { createView, netWorld, netSnap } from '../src/sim/views.js';
import { remoteWorld, remoteSnap } from '../src/net/remote.js';
import { WONDER, WONDER_LOCKED } from '../src/data/wonder.js';
import { BD } from '../src/data/buildings.js';

const err = [], ok = (c, m) => { if (!c) err.push(m); else if (process.argv.includes('-v')) console.log('ok  ', m); };
const SEED = +(process.argv.find(a => /^\d+$/.test(a)) || 4711);
const g = createGame();
newGame(g, SEED, addBuilding, reveal, revealIsland);
const S = () => g.state.story, W = () => g.state.wonder;
const step = (s) => { for (let i = 0; i < s * 10; i++) sim(g, 0.1); };
const cmd = (c) => { const n0 = g.events.length; applyCommand(g, c); return g.events.slice(n0); };
const K = [...g.blds.values()].find(b => b.t === 'kontor'), k = K.isl, inv = islData(g, k).inv;

// Akt 2 (wie nach cs_bauplan): Leuchtturm freigeschaltet
cmd({ type: 'storyDebug', op: 'act', n: 2 });
ok(S().act === 2 && isUnlocked(g, 'leuchtturm'), 'Akt 2: Leuchtturm freigeschaltet');
ok(!isUnlocked(g, 'glocke'), 'Bauplan Taucherglocke noch gesperrt');

// Bauplatz am Meer auf der Heimatinsel suchen
inv.holz = 1000; inv.ziegel = 1000; inv.eisen = 1000;
let spot = null;
for (let r = 4; r < 60 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
  const x = K.x + dx, y = K.y + dy;
  if (checkPlace(g, 'leuchtturm', x, y, false, 0).ok) spot = { x, y };
}
ok(spot, 'Bauplatz für den Leuchtturm gefunden');
let evs = cmd({ type: 'place', t: 'leuchtturm', x: spot.x, y: spot.y, d: 0 });
const T = [...g.blds.values()].find(b => b.t === 'leuchtturm');
ok(T, 'Leuchtturm-Bauplatz steht');
ok(!checkPlace(g, 'leuchtturm', spot.x + 8, spot.y, false, 0).ok, 'nur einmal pro Welt');

// Stufe 1 eröffnen: noch nichts bezahlt, Waren kommen nach und nach
for (const it in inv) inv[it] = 0;
evs = cmd({ type: 'wonderOrder', id: T.id });
ok(W().pb === 1 && W().got && !wonderFull(W()), 'Baustelle Stufe 1 eröffnet, noch keine Waren');
ok(evs.some(e => e.type === 'wonderStart' && e.ph === 1), 'Meldung „Baustelle eröffnet“');
evs = cmd({ type: 'wonderOrder', id: T.id });
ok(evs.some(e => e.type === 'fail'), 'zweite Baustelle gleichzeitig abgelehnt');
// Band liefert Holz direkt auf die Baustelle; fremde Ware staut
const belt = placeBuilding(g, 'band', T.x - 1, T.y + 2, 0, k);
let n = 0;
for (let i = 0; i < 40; i++) { if (!belt.it) { belt.it = 'holz'; belt.p = 0; n++; } step(0.5); }
ok((W().got.holz || 0) >= n - 2 && W().got.holz > 10, `Band liefert Holz auf die Baustelle (${W().got.holz} von ${n})`);
belt.it = 'fisch'; belt.p = 0; step(3);
ok(belt.it === 'fisch' && !W().got.fisch, 'Ware, die die Stufe nicht braucht, wird nicht angenommen (Band staut)');
belt.it = null;
// Inselinventar: Schalter aus → nichts; an → WONDER.pull je Sekunde
inv.ziegel = 500;
cmd({ type: 'wonderStore', id: T.id, on: false });
step(5);
ok(inv.ziegel === 500 && !W().got.ziegel, 'Schalter aus: nichts aus dem Inselinventar');
cmd({ type: 'wonderStore', id: T.id, on: true });
step(10);
const took = 500 - inv.ziegel;
ok(took >= WONDER.pull * 9 && took <= WONDER.pull * 11, `Schalter an: etwa ${WONDER.pull}/s aus dem Inselinventar (${took} in 10 s)`);

// Speichern/Laden mitten auf der Baustelle
{
  const g2 = createGame();
  ok(loadInto(g2, serialize(g)), 'Spielstand mit Baustelle lädt');
  ok(g2.state.wonder.pb === 1 && g2.state.wonder.got.ziegel === W().got.ziegel && g2.state.wonder.lager === 1, 'Baustelle gespeichert (gelieferte Waren, Schalter)');
}

// Rest liefern: dann 2 min Bauzeit, danach Stufe 1 fertig mit Sicht 40
const C1 = WONDER.phases[0].cost;
for (const it in C1) inv[it] = C1[it];
step(Object.values(C1).reduce((a, b) => a + b, 0) / WONDER.pull + 3);
ok(wonderFull(W()), 'alle Waren für Stufe 1 da');
const fog = g.fog, cx = T.x + 2, cy = T.y + 2;
// Felder im Kreis r um den Turm, die noch im Nebel liegen
const dark = (r) => { let d = 0; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= (r - 1) * (r - 1) && !fog.get(cx + x, cy + y)) d++; return d; };
const d1 = dark(WONDER.phases[0].sight), d2 = dark(WONDER.phases[1].sight);
n = g.events.length;
step(WONDER.build + 1);
evs = g.events.slice(n);
ok(W().ph === 1 && !W().pb, 'Stufe 1 fertig');
ok(evs.some(e => e.type === 'wonderPhase' && e.ph === 1 && e.sight === WONDER.phases[0].sight), 'Meldung „Stufe 1 fertig“ mit Sichtweite');
ok(d1 > 100 && dark(WONDER.phases[0].sight) === 0 && dark(WONDER.phases[1].sight) > 0, `Sichtweite Stufe 1: ${WONDER.phases[0].sight} Felder um den Turm aufgedeckt (vorher ${d1} Felder Nebel)`);
ok(!evs.some(e => e.type === 'story'), 'Stufe 1 löst noch keinen Akt aus');

// Akt 2: Aurels Dialog beim ersten Handel, einmalig
applyCommand(g, { type: 'giveShip', x: K.x, y: K.y });
cmd({ type: 'coins', n: 5000 });
cmd({ type: 'debugDock', npc: 'aurel' });
const ship = g.state.ships[0];
n = g.events.length;
npcBuyTo(g, ship, 'aurel', 'glas', 10);
evs = g.events.slice(n);
ok(evs.some(e => e.type === 'story' && e.id === 'akt2_aurel' && e.dialog === 'aurel_turm'), 'erster Handel mit Aurel in Akt 2: Dialog aurel_turm');
n = g.events.length;
npcBuyTo(g, ship, 'aurel', 'glas', 10);
ok(!g.events.slice(n).some(e => e.type === 'story'), 'zweiter Handel: kein Dialog mehr');

// Stufe 2: alles aus dem Inselinventar (Seil, Zahnräder liefern die Völker; hier per Debug)
const C2 = WONDER.phases[1].cost;
for (const it in C2) inv[it] = C2[it];
cmd({ type: 'wonderOrder', id: T.id });
ok(W().pb === 2, 'Baustelle Stufe 2 eröffnet');
step(Object.values(C2).reduce((a, b) => a + b, 0) / WONDER.pull + 3);
ok(wonderFull(W()), `alle Waren für Stufe 2 da (auch mehr als ein Kontor fasst: ${C2.ziegel} Ziegel)`);
n = g.events.length;
step(WONDER.build + 1);
evs = g.events.slice(n);
const st = evs.find(e => e.type === 'story' && e.id === 'akt2_ende');
ok(W().ph === 2, 'Stufe 2 fertig');
ok(st && st.cs === 'cs_licht_im_wind' && st.dialog === 'brann_glocke', 'Stufe 2 → cs_licht_im_wind mit Dialog brann_glocke');
ok(S().act === 3 && S().flags.plan_glocke && isUnlocked(g, 'glocke') && g.state.unl.glocke === 'story', 'Akt 3, Flag plan_glocke, Bauplan Taucherglocke (Quelle story)');
ok(st && st.unlock && st.unlock.includes('glocke'), 'Ereignis nennt die Freischaltung (Toast in der Oberfläche)');
ok(d2 > d1 && dark(WONDER.phases[1].sight) === 0, `Sichtweite Stufe 2: ${WONDER.phases[1].sight} Felder um den Turm aufgedeckt (vorher ${d2} Felder Nebel)`);

// Stufe 3 gesperrt bis karte_gefunden, ohne Spoiler
let why = wonderReason(g, T);
ok(why && why.includes(WONDER_LOCKED) && !/Karte|karte|Akt/.test(why), `Stufe 3 gesperrt ohne Spoiler („${why}“)`);
evs = cmd({ type: 'wonderOrder', id: T.id });
ok(!W().pb && evs.some(e => e.type === 'fail'), 'Stufe 3 lässt sich nicht eröffnen');
cmd({ type: 'storyDebug', op: 'flag', flag: 'karte_gefunden' });
ok(!wonderReason(g, T), 'mit karte_gefunden ist Stufe 3 frei');
cmd({ type: 'wonderDebug', n: 3 });
why = wonderReason(g, T);
ok(why && why.includes(WONDER_LOCKED), 'Stufe 4 gesperrt bis pumpe_gefunden');
cmd({ type: 'storyDebug', op: 'flag', flag: 'pumpe_gefunden' });
ok(!wonderReason(g, T), 'mit pumpe_gefunden ist Stufe 4 frei');

// Spiegel (Koop-Mitspieler): Baustelle mit Waren kommt im Snapshot an
cmd({ type: 'wonderDebug', n: 3, site: 'half' });
{
  const v = createView('pgast1234'), m = createMirror();
  remoteWorld(m, netWorld(g, v)); remoteSnap(m, netSnap(g, v, { speed: 1, halt: false }), 0);
  ok(m.state.wonder.pb === 4 && m.state.wonder.got && m.state.wonder.got.stahl === W().got.stahl, 'Spiegel sieht die Baustelle mit gelieferten Waren');
}

// Debug: Stufe direkt setzen; mit fire den Story-Auslöser
cmd({ type: 'storyDebug', op: 'act', n: 2 });
ok(S().act === 2 && !isUnlocked(g, 'glocke'), 'Debug Akt 2: Taucherglocke wieder gesperrt');
evs = cmd({ type: 'wonderDebug', n: 2, fire: true });
ok(W().ph === 2 && evs.some(e => e.type === 'story' && e.id === 'akt2_ende') && S().act === 3, 'Debug wonder(2, fire): Stufe 2 und cs_licht_im_wind');
const g3 = createGame(); newGame(g3, SEED, addBuilding, reveal, revealIsland);
applyCommand(g3, { type: 'wonderDebug', n: 3 }, 'pgast12345');
ok(g3.state.wonder.ph === 0, 'Debug nur für den Host');

// Spielstand von vor 0.18.0: Stufe im Bau ist schon bezahlt (kein got) und baut weiter
{
  const j = JSON.parse(serialize(g));
  j.wonder = { ph: 0, pb: 1, pt: 100, id: T.id, doneAt: null };
  const g4 = createGame();
  ok(loadInto(g4, JSON.stringify(j)), 'alter Stand mit laufender Bauphase lädt');
  ok(wonderFull(g4.state.wonder), 'alte Bauphase gilt als vollständig beliefert');
  for (let i = 0; i < 250; i++) sim(g4, 0.1);
  ok(g4.state.wonder.ph === 1 && !g4.state.wonder.pb, 'alte Bauphase wird fertig');
}

ok(BD.leuchtturm.unique && BD.leuchtturm.w === 5, 'Leuchtturm 5×5, einmalig');
if (err.length) { console.log('FEHLER:\n' + err.join('\n')); process.exit(1); }
console.log(`Leuchtturm OK (Seed ${SEED}): Baustelle mit Bändern und Inselinventar, Stufen-Freigabe, Sichtweite, Aurel in Akt 2, Stufe 2 → cs_licht_im_wind → Akt 3 mit Bauplan Taucherglocke, Speichern, Spiegel, Debug, alte Bauphase.`);
