/* Enden-Test ohne Browser (npm run check:ending), 0.23.0:
   Für Ende A und B (je ein neues Spiel): Entscheidung über den Debug-Schalter, Folgen für die Welt (sim/ending.js),
   Handel, Bauen auf dem Goldberg, Ruinen, Hauptkontor, Inselrat, Relikt, Fest, Story-Zeile, Speichern/Laden, Spiegel (Koop),
   eine zweite Entscheidung wird abgelehnt. Beendet sich mit Code 1 bei Fehlern. -v zeigt jeden Schritt. */
import { createGame, newGame, islData, homeIsl, kontorOf } from '../src/sim/state.js';
import { addBuilding, checkPlace } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import { sim, applyCommand } from '../src/sim/sim.js';
import { npcPort } from '../src/sim/villages.js';
import { npcOf, npcAsks, npcPays, npcTrades } from '../src/sim/npc.js';
import { npcGone, festOn, npcIslFree, endingInfo } from '../src/sim/ending.js';
import { serialize, loadInto } from '../src/save/serialize.js';
import { createView, netWorld, netSnap } from '../src/sim/views.js';
import { createMirror } from '../src/sim/snapshot.js';
import { remoteWorld, remoteSnap } from '../src/net/remote.js';
import { ENDINGS } from '../src/data/npctrade.js';
import { BD } from '../src/data/buildings.js';
import { actGoal } from '../src/data/story.js';
import { tkx, tky } from '../src/util/tiles.js';

const err = [], ok = (c, m) => { if (!c) err.push(m); else if (process.argv.includes('-v')) console.log('ok  ', m); };
const SEEDS = process.argv.filter(a => /^\d+$/.test(a)).map(Number);
const GUEST = 'pgast1234';

function run(SEED, c) {
  const tag = `[${SEED} ${c.toUpperCase()}]`, T = (m) => `${tag} ${m}`;
  const g = createGame();
  newGame(g, SEED, addBuilding, reveal, revealIsland);
  const S = () => g.state.story;
  const step = (s) => { for (let i = 0; i < s * 10; i++) sim(g, 0.1); };
  const cmd = (x, pid) => { const n0 = g.events.length; applyCommand(g, x, pid); return g.events.slice(n0); };
  const K0 = [...g.blds.values()].find(b => b.t === 'kontor');
  cmd({ type: 'giveShip', x: K0.x, y: K0.y });
  const ship = g.state.ships[0];
  const put = (P) => { ship.x = tkx(P._dock) + 0.5; ship.y = tky(P._dock) + 0.5; ship.st = 'idle'; ship.dest = ''; ship.path = null; };
  // Akt 5, alle Völker entdeckt, Route über Aurels Steg
  cmd({ type: 'storyDebug', op: 'act', n: 5 });
  for (const id of ['ole', 'brann', 'aurel']) cmd({ type: 'storyDebug', op: 'flag', flag: 'npc_' + id });
  step(2);
  const PA = npcPort(g, 'aurel'), PO = npcPort(g, 'ole'), PB = npcPort(g, 'brann'), kG = PA.isl;
  cmd({ type: 'setRoute', ship: ship.id, stops: [{ kontor: K0.id, load: [], unload: [] }, { kontor: PA.id, load: [], unload: [] }, { kontor: PO.id, load: [], unload: [] }] });
  ok(ship.route && ship.route.stops.length === 3, T('Route mit drei Stopps (Heimat, Aurel, Ole)'));
  const villaN = [...g.blds.values()].filter(b => b.isl === kG && b.t === 'npc_villa').length;
  const askOle = npcAsks(g, 'ole', 'fisch'), payOle = npcPays(g, 'ole', 'holz');
  ok(!npcIslFree(g, kG) && !checkPlace(g, 'huette', PA.x, PA.y - 6).ok, T('vorher: auf dem Goldberg kann man nicht bauen'));

  const evs = cmd({ type: 'storyDebug', op: 'ending', c });
  const E = evs.find(e => e.type === 'story' && e.ending === c), X = evs.find(e => e.type === 'ending');
  ok(E && E.cs === `cs_ende_${c}` && S().choice === c && S().act === 6, T(`Entscheidung ${c}: Ereignis mit cs_ende_${c}, Akt 6`));
  ok(X && X.relic === ENDINGS[c].relic, T('Ereignis „ending“ an alle'));
  ok((islData(g, homeIsl(g)).inv[ENDINGS[c].relic] | 0) === 1, T(`Relikt ${ENDINGS[c].relic} im Lager der Heimatinsel`));
  ok(!cmd({ type: 'storyDebug', op: 'ending', c: c === 'a' ? 'b' : 'a' }).some(e => e.type === 'story') && S().choice === c, T('zweite Entscheidung abgelehnt'));
  ok(!cmd({ type: 'storyChoice', c: 'b' }).some(e => e.type === 'story'), T('storyChoice danach abgelehnt'));

  // Goldberg: Hauptkontor am alten Steg, Bauen erlaubt
  const KG = kontorOf(g, kG);
  ok(!npcPort(g, 'aurel') && KG && KG.x === PA.x && KG.y === PA.y && KG.by === 'host' && KG.owner === 'host', T('Aurels Steg ist jetzt dein Hauptkontor (Host)'));
  ok(npcIslFree(g, kG), T('Goldberg ist deine Insel'));
  let spot = null;
  const I = g.W.island(kG);
  for (let y = I.y0; y < I.y0 + I.h && !spot; y++) for (let x = I.x0; x < I.x0 + I.w && !spot; x++) if (checkPlace(g, 'huette', x, y, true).ok) spot = [x, y];
  ok(spot, T('auf dem Goldberg lässt sich eine Hütte bauen'));
  ok(npcGone(g, 'aurel') && !npcTrades(g, 'aurel') && !npcAsks(g, 'aurel', 'glas'), T('kein Handel mehr mit Aurel'));
  ok(ship.route && ship.route.stops.every(st => st.kontor !== PA.id), T('Route: Stopp an Aurels Steg entfernt'));
  const onG = [...g.blds.values()].filter(b => b.isl === kG);

  if (c === 'a') {
    const ruins = onG.filter(b => b.ruin === 'brand');
    ok(ruins.length === villaN && ruins.every(b => b.t === 'npc_villa' && b.by === 'host'), T(`${ruins.length} Brandruinen (die Villen), gehören dir`));
    ok(!onG.some(b => ['npc_terrasse', 'npc_banner', 'npc_laterne'].includes(b.t)), T('Terrassen, Banner, Laternen verschwunden'));
    const n0 = g.blds.size; cmd({ type: 'remove', id: ruins[0].id });
    ok(g.blds.size === n0 - 1, T('Brandruine lässt sich abreißen'));
    const R = npcPort(g, 'rat');
    ok(R && R.isl === kG && R.npc === 'rat' && Math.hypot(R.x - KG.x, R.y - KG.y) >= 5, T(`Steg des Inselrats am Goldberg (${R ? Math.round(Math.hypot(R.x - KG.x, R.y - KG.y)) : '–'} Felder vom Kontor)`));
    ok(npcTrades(g, 'rat') && S().flags.npc_rat, T('Inselrat handelt'));
    step(2);
    ok(npcAsks(g, 'rat', 'uhrwerk') > 0 && npcAsks(g, 'rat', 'glas') > 0, T('Inselrat verkauft Uhrwerke und Glas'));
    // Ein Schiff am Steg des Inselrats kauft Glas
    if (R) {
      put(R); g.state.coins = 5000; step(1);
      const c0 = g.state.coins; cmd({ type: 'shipLoad', ship: ship.id, it: 'glas', n: 10 });
      ok((ship.cargo || []).some(h => h && h.it === 'glas' && h.n === 10) && g.state.coins < c0, T('10 Glas beim Inselrat gekauft'));
    }
    ok(npcOf(g, 'ole').rep >= 80 && npcOf(g, 'brann').rep >= 80, T('Ole und Brann: Ruf vertraut'));
    ok(npcAsks(g, 'ole', 'fisch') < askOle && npcPays(g, 'ole', 'holz') > payOle, T(`Ole: Rabatt (Fisch ${askOle.toFixed(2)} → ${npcAsks(g, 'ole', 'fisch').toFixed(2)}, Holz-Ankauf ${payOle.toFixed(2)} → ${npcPays(g, 'ole', 'holz').toFixed(2)})`));
    ok(npcAsks(g, 'ole', 'raeucherfisch') > 0 && npcAsks(g, 'brann', 'stahl') > 0, T('besseres Angebot: Räucherfisch bei Ole, Stahl bei Brann'));
    ok(festOn(g), T('Fest läuft'));
    ok(/Leuchtfeuer brennt.*Goldberg/.test(actGoal(S(), {})), T(`Story-Zeile: „${actGoal(S(), {})}“`));
    ok([...g.blds.values()].filter(b => b.isl === PO.isl && b.ruin).length === 0, T('Pfahldorf steht noch'));
  } else {
    const houses = onG.filter(b => b.t === 'buerger');
    ok(houses.length === villaN && houses.every(b => b.by === 'host' && b.tm === 0), T(`${houses.length} Villen sind jetzt Bürgerhäuser`));
    ok(onG.filter(b => BD[b.t].npc).every(b => b.by === 'host'), T('übrige Gebäude am Goldberg gehören dir'));
    const deco = onG.find(b => b.t === 'npc_banner');
    if (deco) { const n0 = g.blds.size; cmd({ type: 'remove', id: deco.id }); ok(g.blds.size === n0 - 1, T('Aurels Banner lässt sich abreißen')); }
    for (const [id, P] of [['ole', PO], ['brann', PB]]) {
      const list = [...g.blds.values()].filter(b => b.isl === P.isl);
      ok(list.length > 1 && list.every(b => b.ruin === 'sturm'), T(`${id}: ${list.length} Ruinen (Steg eingeschlossen)`));
      ok(!list.some(b => b.t === 'npc_laterne'), T(`${id}: keine Laternen`));
      ok(npcGone(g, id) && !npcAsks(g, id, id === 'ole' ? 'fisch' : 'zahnrad'), T(`${id}: kein Handel`));
      put(P); step(1);
      const ev = cmd({ type: 'talk', npc: id });
      ok(!ev.some(e => e.type === 'talk' || e.type === 'story'), T(`${id}: kein Gespräch`));
      const n0 = g.blds.size; cmd({ type: 'remove', id: list[1].id });
      ok(g.blds.size === n0, T(`${id}: Ruinen sind fest`));
    }
    ok(ship.route && ship.route.stops.length === 1, T('Route: Stopps an Aurel und Ole entfernt'));
    ok(!npcTrades(g, 'rat') && !npcPort(g, 'rat'), T('kein Inselrat'));
    ok(!festOn(g), T('kein Fest'));
    ok(/bleibt dunkel.*Dörfer/.test(actGoal(S(), {})), T(`Story-Zeile: „${actGoal(S(), {})}“`));
  }
  step(5);
  // Speichern/Laden und Spiegel
  const g2 = createGame();
  ok(loadInto(g2, serialize(g)), T('Laden'));
  ok(JSON.stringify(endingInfo(g2)) === JSON.stringify(endingInfo(g)), T('Speichern/Laden: Folgen bleiben gleich'));
  const v = createView(GUEST), m = createMirror();
  remoteWorld(m, netWorld(g, v)); remoteSnap(m, netSnap(g, v, { speed: 1, halt: false }), 0);
  const mr = [...m.blds.values()].filter(b => b.ruin).length, gr = [...g.blds.values()].filter(b => b.ruin).length;
  ok(m.state.story.choice === c && mr === gr && gr > 0, T(`Spiegel (Koop): Entscheidung und ${mr} Ruinen`));
  ok(m.KONT[kG] && m.KONT[kG].by === 'host', T('Spiegel: Goldberg-Kontor gehört dem Host'));
  // Mitspieler darf auf dem Goldberg bauen (Gemeinsame Insel)
  if (spot) { const n0 = g.blds.size; cmd({ type: 'place', t: 'huette', x: spot[0], y: spot[1], d: 0 }, GUEST); ok(g.blds.size === n0 + 1 || g.events.some(e => e.type === 'fail' && /fehlen/.test(e.msg)), T('Mitspieler kann auf dem Goldberg bauen')); }
  return endingInfo(g);
}

for (const seed of SEEDS.length ? SEEDS : [4711, 99, 12345]) for (const c of ['a', 'b']) { const info = run(seed, c); if (process.argv.includes('-v')) console.log(seed, c, JSON.stringify(info)); }
if (err.length) { console.log('FEHLER:\n' + err.join('\n')); process.exit(1); }
console.log('Enden OK: A (Brandruinen, Kontor, Inselrat, Rabatt, Fest) und B (Ruinen, Bürgerhäuser, kein Handel), Relikte, Bauen auf dem Goldberg, Speichern, Spiegel.');
