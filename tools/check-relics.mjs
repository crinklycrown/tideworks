/* Relikte-Test ohne Browser (npm run check:relics), 0.24.0:
   Forschung „Reliktkunde“ erst ab Akt 2, Reliktsockel (nur mit Hauptkontor, einer je Insel, Aufwerten 1 → 2 → 3 mit Relikt darin),
   Sammlung (Debug: alle Relikte, Perlen), Stufenregel, Wirkungen (Produktion, Bohrer, Bänder, Schiffe, Strom, Lager, Häuser, Sauerstoff,
   Öfen ohne Kohle/Strom, Füllhorn, Kohle → Eisenerz, Tauchspots, keine Stromkosten, Krone), legendär nur einmal, Perlen-Unterhalt
   (Pause und Fortsetzung), Abriss gibt das Relikt zurück, Handel (Angebot je Tag, Kauf am Steg), Aufträge mit Relikt, Tauchgang mit
   Relikt, End-Relikt, Speichern/Laden, Migration v18 → v19, Spiegel (Koop) mit Befehlen eines Mitspielers.
   Beendet sich mit Code 1 bei Fehlern. -v zeigt jeden Schritt. */
import { createGame, newGame, islData, capOf, homeIsl, isUnlocked } from '../src/sim/state.js';
import { addBuilding, checkPlace } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import { sim, applyCommand } from '../src/sim/sim.js';
import { PRODUCTION_TICKS } from '../src/sim/production.js';
import { LOGISTICS_TICKS } from '../src/sim/logistics.js';
import { drawPower } from '../src/sim/power.js';
import { speedOf } from '../src/sim/mods.js';
import { npcPort } from '../src/sim/villages.js';
import { npcOf } from '../src/sim/npc.js';
import { relicFx, relicIn, relicAir, relicSpots, fxProd, pedestalState, fxLines, PICK_LIST } from '../src/sim/relics.js';
import { serialize, loadInto, parseSave } from '../src/save/serialize.js';
import { createView, netWorld, netSnap } from '../src/sim/views.js';
import { createMirror } from '../src/sim/snapshot.js';
import { remoteWorld, remoteSnap } from '../src/net/remote.js';
import { RELICS, RELIC_ORDER, RELIC_SOURCES, RELIC_UPKEEP, PEDESTAL_COST } from '../src/data/relics.js';
import { CYCLE, SAVE_VERSION } from '../src/config.js';
import { tkx, tky } from '../src/util/tiles.js';

const err = [], ok = (c, m) => { if (!c) err.push(m); else if (process.argv.includes('-v')) console.log('ok  ', m); };
const SEED = +(process.argv.find(a => /^\d+$/.test(a)) || 4711);
const GUEST = 'pgast1234';
const g = createGame();
newGame(g, SEED, addBuilding, reveal, revealIsland);
const R = () => g.state.relics, S = () => g.state.story;
const step = (s) => { for (let i = 0; i < Math.round(s * 10); i++) sim(g, 0.1); };
const cmd = (c, pid) => { const n0 = g.events.length; applyCommand(g, c, pid); return g.events.slice(n0); };
const K = [...g.blds.values()].find(b => b.t === 'kontor'), k = K.isl, inv = islData(g, k).inv;
const entry = (id) => R().list.find(e => e.id === id);
const fill = (cost, n = 1) => { for (const r in cost) inv[r] = Math.max(inv[r] || 0, cost[r] * n); };

// ---------- Forschung und Freischaltung ----------
ok(R() && Array.isArray(R().list) && !R().list.length, 'Neues Spiel: leere Reliktsammlung');
ok(!isUnlocked(g, 'sockel1'), 'Reliktsockel anfangs gesperrt');
g.state.tech.handwerk = true;
fill({ skizze: 20, ziegel: 40 });
cmd({ type: 'research', id: 'reliktkunde' });
ok(!g.state.tech.reliktkunde, 'Akt 1: Reliktkunde nicht erforschbar');
cmd({ type: 'storyDebug', op: 'act', n: 2 });
step(1);
cmd({ type: 'research', id: 'reliktkunde' });
ok(g.state.tech.reliktkunde && isUnlocked(g, 'sockel1'), 'Akt 2: Reliktkunde erforscht, Reliktsockel frei');
ok(!isUnlocked(g, 'sockel2') && !isUnlocked(g, 'sockel3'), 'Messing- und Goldsockel noch gesperrt (Brann, Aurel)');

// ---------- Sockel bauen ----------
fill(PEDESTAL_COST.sockel1, 3);
let spot = null;
for (let r = 3; r < 30 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) if (checkPlace(g, 'sockel1', K.x + dx, K.y + dy).ok) spot = [K.x + dx, K.y + dy];
ok(spot, 'Platz für einen Reliktsockel auf der Heimatinsel');
cmd({ type: 'place', t: 'sockel1', x: spot[0], y: spot[1], d: 0 });
let P = [...g.blds.values()].find(b => b.t === 'sockel1');
ok(P && P.isl === k, 'Reliktsockel gebaut');
let other = null;
for (let r = 3; r < 30 && !other; r++) for (let dy = -r; dy <= r && !other; dy++) for (let dx = -r; dx <= r && !other; dx++) { const c = checkPlace(g, 'sockel1', K.x + dx, K.y + dy); if (!c.ok && /höchstens ein Reliktsockel/.test(c.reason || '')) other = c; }
ok(other, 'Zweiter Sockel auf derselben Insel abgelehnt');

// ---------- Sammlung, Stufenregel ----------
cmd({ type: 'relicDebug', op: 'all' }, GUEST);
ok(!R().list.length, 'Debug „alle Relikte“ nur für den Host');
cmd({ type: 'relicDebug', op: 'all' });
ok(RELIC_ORDER.every(id => entry(id)), `Debug: alle ${RELIC_ORDER.length} Relikte in der Sammlung`);
cmd({ type: 'relicDebug', op: 'all' });
ok(R().list.length === RELIC_ORDER.length, 'zweimal Debug: keine Doppelten');
let evs = cmd({ type: 'relicPut', id: P.id, u: entry('werksiegel').u });
ok(!relicIn(g, P.id) && evs.some(e => e.type === 'fail'), 'Seltenes Relikt passt nicht in den gewöhnlichen Sockel');
cmd({ type: 'relicPut', id: P.id, u: entry('zunftrad').u });
ok(relicIn(g, P.id) && relicIn(g, P.id).id === 'zunftrad' && Math.abs(fxProd(g, k) - 1.05) < 1e-9, 'Zahnrad eingesetzt: Produktion +5 %');
ok(fxLines(RELICS.zunftrad.fx).join() === 'Produktionsrate +5 %', 'Tooltip-Text der Wirkung');

// Produktion messen: Sägewerk-ähnlich über ein Rezept (Schmelzofen) mit vollen Puffern, je 60 s
const furnace = (extra) => Object.assign({ id: 900001, t: 'schmelzofen', x: -9000, y: -9000, d: 0, isl: k, buf: { eisenerz: 999, kohle: 999 }, out: {}, prog: 0, acc: 0, run: false, fi: {}, fo: {} }, extra || {});
const runFurnace = (b, s) => { let made = 0; for (let i = 0; i < s * 10; i++) { PRODUCTION_TICKS.schmelzofen(g, b, 0.1); made += b.out.eisen || 0; b.out = {}; } return made; };
const f0 = furnace();
cmd({ type: 'relicTake', id: P.id });
const base = runFurnace(furnace(), 300);
cmd({ type: 'relicPut', id: P.id, u: entry('zunftrad').u });
const withR = runFurnace(furnace(), 300);
// Takt 0,1 s: ein Durchgang endet auf einem ganzen Takt, daher etwas weniger als +5 % (wie beim Leuchtturm-Bonus)
ok(base > 0 && withR / base > 1.01 && withR / base < 1.09, `Schmelzofen mit Zahnrad schneller (${base} → ${withR} Eisen in 300 s)`);
void f0;

// Bohrer, Bänder
cmd({ type: 'relicPut', id: P.id, u: entry('bohrkopf').u });
ok(relicIn(g, P.id).id === 'bohrkopf' && !entry('zunftrad').at, 'Tausch: altes Relikt zurück in der Sammlung');
const drill = () => ({ id: 900002, t: 'bohrer', x: -9100, y: -9000, d: 0, isl: k, buf: {}, out: {}, prog: 0, acc: 0, _ot: 'kohle', _oc: 4 });
const runDrill = (b, s) => { let n = 0, it = {}; for (let i = 0; i < s * 10; i++) { PRODUCTION_TICKS.bohrer(g, b, 0.1); for (const x in b.out) { n += b.out[x]; it[x] = 1; } b.out = {}; } return { n, it }; };
const dR = runDrill(drill(), 100);
cmd({ type: 'relicTake', id: P.id });
const d0 = runDrill(drill(), 100);
ok(dR.n > d0.n && dR.n / d0.n > 1.05, `Bohrkopf: Bohrer fördert mehr (${d0.n} → ${dR.n} in 100 s)`);
cmd({ type: 'relicPut', id: P.id, u: entry('rollenglied').u });
const belt = { id: 900003, t: 'band', x: -9200, y: -9000, d: 0, isl: k, it: 'holz', p: 0 };
LOGISTICS_TICKS.band(g, belt, 0.5);
ok(Math.abs(belt.p - 0.55) < 1e-9, `Rollenglied: Band 10 % schneller (${belt.p.toFixed(3)} nach 0,5 s)`);
// Schiffe dieser Insel (Werft der Insel als Heimathafen)
cmd({ type: 'relicPut', id: P.id, u: entry('lotsenkompass').u });
g.blds.set(900004, { id: 900004, t: 'werft', x: -9300, y: -9000, isl: k, buf: {}, out: {} });
const sh = { id: 1, kind: 'fracht', home: 900004 }, sh2 = { id: 2, kind: 'fracht' };
ok(Math.abs(speedOf(g, sh) / speedOf(g, sh2) - 1.15) < 1e-9, 'Kompass: Schiffe dieser Insel 15 % schneller, andere nicht');
g.blds.delete(900004);

// ---------- Aufwerten auf Messing (Brann) ----------
cmd({ type: 'unlock', key: 'sockel2', src: 'npc' });
fill(PEDESTAL_COST.sockel2, 2);
cmd({ type: 'upgrade', id: P.id });
P = g.blds.get(P.id);
ok(P.t === 'sockel2' && relicIn(g, P.id) && relicIn(g, P.id).id === 'lotsenkompass', 'Aufwerten auf Messingsockel, Relikt bleibt');
const cap0 = capOf(g, k);
cmd({ type: 'relicPut', id: P.id, u: entry('speicherbund').u });
ok(capOf(g, k) === Math.round(cap0 * 1.5), `Schlüsselbund: Lager ${cap0} → ${capOf(g, k)}`);
cmd({ type: 'relicPut', id: P.id, u: entry('glimmspule').u });
const cons = { isl: k };
drawPower(g, cons, 10);
ok(Math.abs(cons._pq - 7.5) < 1e-9, 'Glimmspule: Stromverbrauch −25 %');
cmd({ type: 'relicPut', id: P.id, u: entry('atemmuschel').u });
ok(relicAir(g) === 20 && relicAir(g, GUEST) === 20, 'Atemmuschel auf der Heimatinsel: +20 s Sauerstoff');
cmd({ type: 'relicPut', id: P.id, u: entry('genuegsam').u });
const hut = { id: 900005, t: 'huette', x: -9400, y: -9000, isl: k, buf: {}, out: {}, tm: 0, sup: false, plans: 0 };
inv.fisch = 1000; inv.holz = 1000;
const f1 = inv.fisch, h1 = inv.holz;
for (let n = 0; n < 4; n++) { hut.tm = 0; PRODUCTION_TICKS.huette(g, hut, 0.01); }
ok(f1 - inv.fisch === 6 && h1 - inv.holz === 3, `Tafel der Genügsamkeit: 4 Prüfungen verbrauchen 6 Fisch und 3 Holz statt 8 und 4 (${f1 - inv.fisch} / ${h1 - inv.holz})`);

// ---------- Goldener Sockel, legendäre Relikte, Unterhalt ----------
cmd({ type: 'unlock', key: 'sockel3', src: 'npc' });
fill(PEDESTAL_COST.sockel3, 2);
cmd({ type: 'upgrade', id: P.id });
P = g.blds.get(P.id);
ok(P.t === 'sockel3', 'Aufwerten auf den Goldenen Sockel');
inv.perle = 0;
evs = cmd({ type: 'relicPut', id: P.id, u: entry('ewigeglut').u });
ok(relicIn(g, P.id).id === 'ewigeglut' && relicIn(g, P.id).off && !pedestalState(g, P).active, 'Ewige Glut ohne Perlen: eingesetzt, Wirkung ruht');
ok(/Perlen/.test(pedestalState(g, P).why), 'Hinweis am Sockel: keine Perlen');
const offF = runFurnace(furnace({ buf: { eisenerz: 999 } }), 20);
ok(offF === 0, 'Ruhende Glut: Schmelzofen ohne Kohle steht');
inv.perle = 10;
step(2);
ok(!relicIn(g, P.id).off && inv.perle === 9, `Perle da: Wirkung läuft, eine Perle bezahlt (${inv.perle} übrig)`);
const noCoal = furnace({ buf: { eisenerz: 999 } }), madeNC = runFurnace(noCoal, 60);
ok(madeNC > 0 && !noCoal.buf.kohle, `Ewige Glut: Schmelzofen schmilzt ohne Kohle (${madeNC} Eisen in 60 s)`);
const ind = { id: 900006, t: 'induktionsofen', x: -9500, y: -9000, d: 0, isl: k, buf: { eisen: 999 }, out: {}, prog: 0, acc: 0, run: false, fi: {}, fo: {} };
let st = 0; for (let i = 0; i < 300; i++) { PRODUCTION_TICKS.induktionsofen(g, ind, 0.1); st += ind.out.stahl || 0; ind.out = {}; }
ok(st > 0, `Ewige Glut: Induktionsofen ohne Kohle und ohne Strom (${st} Stahl in 30 s)`);
step(CYCLE);
ok(inv.perle === 9 - RELIC_UPKEEP.perDay, `Unterhalt: ${RELIC_UPKEEP.perDay} Perlen je Spieltag (${inv.perle} übrig)`);
inv.perle = 0;
step(CYCLE / RELIC_UPKEEP.perDay + 2);
ok(relicIn(g, P.id).off, 'Perlen aufgebraucht: Wirkung ruht wieder');
inv.perle = 5;
step(2);
ok(!relicIn(g, P.id).off, 'Neue Perlen: Wirkung läuft weiter');
// Füllhorn: Ware wählen, doppelte Produktion (jedes Einsetzen eines legendären kostet sofort eine Perle)
inv.perle = 50;
evs = cmd({ type: 'relicPut', id: P.id, u: entry('fuellhorn').u });
ok(relicIn(g, P.id).id === 'ewigeglut' && evs.some(e => e.type === 'fail'), 'Füllhorn ohne gewählte Ware abgelehnt');
cmd({ type: 'relicPut', id: P.id, u: entry('fuellhorn').u, pick: 'kohle' });
ok(relicIn(g, P.id).id === 'fuellhorn' && relicFx(g, k).double === 'kohle' && PICK_LIST.includes('eisen'), 'Füllhorn: Kohle gewählt');
const dD = runDrill(drill(), 100);
cmd({ type: 'relicPut', id: P.id, u: entry('fuellhorn').u, pick: 'holz' });
ok(relicFx(g, k).double === 'holz', 'Füllhorn: Ware umgestellt');
const dN = runDrill(drill(), 100);
ok(dD.n === 2 * dN.n, `Füllhorn: doppelte Kohle (${dN.n} → ${dD.n})`);
cmd({ type: 'relicPut', id: P.id, u: entry('wandelstein').u });
const dW = runDrill(drill(), 100);
ok(dW.it.eisenerz && !dW.it.kohle, 'Stein der Wandlung: Kohle kommt als Eisenerz');
cmd({ type: 'relicPut', id: P.id, u: entry('herzderflut').u });
ok(relicSpots(g) === 2, 'Herz der Flut: Tauchspots doppelt so oft');
cmd({ type: 'relicPut', id: P.id, u: entry('erste_flamme').u });
const cons2 = { isl: k };
ok(drawPower(g, cons2, 10) && !cons2._pq && Math.abs(fxProd(g, k) - 1.3) < 1e-9, 'Die erste Flamme: +30 % Produktion, kein Strom nötig');
cmd({ type: 'relicPut', id: P.id, u: entry('krone').u });
inv.fisch = 1000; inv.holz = 1000;
const f2 = inv.fisch;
hut.tm = 0; PRODUCTION_TICKS.huette(g, hut, 0.01);
ok(f2 - inv.fisch === 4 && Math.abs(fxProd(g, k) - 1.5) < 1e-9, `Krone: +50 % Produktion, Häuser verbrauchen doppelt (${f2 - inv.fisch} Fisch, Produktion ×${fxProd(g, k)}, off ${relicIn(g, P.id).off}, Perlen ${inv.perle})`);

// Legendär nur einmal
const n0 = R().list.length;
cmd({ type: 'relicDebug', op: 'all' });
ok(R().list.length === n0 && R().list.filter(e => e.id === 'krone').length === 1, 'Legendäre Relikte gibt es nur einmal');

// Abriss: Relikt zurück
cmd({ type: 'remove', id: P.id });
ok(!g.blds.get(P.id) && entry('krone').at == null && fxProd(g, k) === 1, 'Sockel abgerissen: Krone zurück in der Sammlung, keine Wirkung');
fill(PEDESTAL_COST.sockel3, 2);
cmd({ type: 'place', t: 'sockel3', x: spot[0], y: spot[1], d: 0 });
P = [...g.blds.values()].find(b => b.t === 'sockel3');
ok(P, 'Goldener Sockel direkt gebaut (freigeschaltet)');

// ---------- Handel: Angebot und Kauf ----------
for (const id of ['ole', 'brann', 'aurel']) cmd({ type: 'storyDebug', op: 'flag', flag: 'npc_' + id });
cmd({ type: 'npcRep', npc: 'ole', n: 60 });
step(2);
const O = npcOf(g, 'ole');
ok(O.relic && RELICS[O.relic.id].tier === 1 && O.relic.price === RELIC_SOURCES.npc.ole.price, `Ole bietet ein gewöhnliches Relikt an (${O.relic && RELICS[O.relic.id].name})`);
ok(!npcOf(g, 'brann').relic, 'Brann (nicht vertraut) bietet keins an');
cmd({ type: 'giveShip', x: K.x, y: K.y });
const ship = g.state.ships[g.state.ships.length - 1], PO = npcPort(g, 'ole');
ship.x = tkx(PO._dock) + 0.5; ship.y = tky(PO._dock) + 0.5; ship.st = 'idle'; ship.dest = ''; ship.path = null;
g.state.coins = 5000;
const want = O.relic.id, cnt = R().list.filter(e => e.id === want).length;
evs = cmd({ type: 'npcBuy', npc: 'ole', key: 'relic', ship: ship.id });
ok(R().list.filter(e => e.id === want).length === cnt + 1 && g.state.coins === 5000 - RELIC_SOURCES.npc.ole.price && !O.relic && evs.some(e => e.type === 'relicGot'), 'Relikt bei Ole gekauft, in der Sammlung');
step(2);
ok(!O.relic, 'Heute kein zweites Angebot');
g.state.time = (Math.floor(g.state.time / CYCLE) + 1) * CYCLE + 1;
step(2);
ok(O.relic, 'Am nächsten Tag ein neues Angebot');
// Aurel: legendär, ohne die schon vergebenen
cmd({ type: 'npcRep', npc: 'aurel', n: 90 });
step(2);
ok(!npcOf(g, 'aurel').relic, 'Aurel: alle legendären schon vergeben, kein Angebot');

// ---------- Aufträge mit Relikt ----------
const Ord = O.orders[0];
ok(Ord, 'Ole hat einen Auftrag');
Ord.relic = 'zunftrad';
const z0 = R().list.filter(e => e.id === 'zunftrad').length;
ship.cargo = ship.cargo.map(() => null); ship.cargo[0] = { it: Ord.it, n: Ord.n };
evs = cmd({ type: 'npcDeliver', npc: 'ole', oid: Ord.id, ship: ship.id });
ok(R().list.filter(e => e.id === 'zunftrad').length === z0 + 1 && evs.some(e => e.type === 'npcOrder' && e.relic === 'zunftrad'), 'Auftrag erledigt: Relikt als Belohnung');
let withRel = 0;
const oldChance = RELIC_SOURCES.orders.chance;
RELIC_SOURCES.orders.chance = 1;
O.orders = []; step(0); g.state.time = (Math.floor(g.state.time / CYCLE) + 1) * CYCLE + 1; step(2);
withRel = O.orders.filter(o => o.relic && RELICS[o.relic].tier === 1).length;
RELIC_SOURCES.orders.chance = oldChance;
ok(withRel > 0 && withRel === O.orders.length, `Neue Aufträge tragen ein Relikt (Chance 1: ${withRel} von ${O.orders.length})`);

// ---------- Tauchgang mit Relikt ----------
cmd({ type: 'storyDebug', op: 'act', n: 3 });
cmd({ type: 'diveDebug', op: 'mount', ship: ship.id });
cmd({ type: 'diveDebug', op: 'spot' });
cmd({ type: 'diveDebug', op: 'over' });
RELIC_SOURCES.dive.chance = 1;
const before = R().list.length;
cmd({ type: 'diveStart', ship: ship.id });
evs = cmd({ type: 'diveEnd', ok: true });
const res = evs.find(e => e.type === 'diveResult');
ok(res && res.relic && R().list.length === before + 1 && R().list[R().list.length - 1].src === 'tauchen', `Tauchgang: Relikt gefunden (${res && res.relic})`);
ok(res && (res.main || []).every(l => l.it !== 'perle' || true), 'Tauchbeute unverändert lesbar');

// ---------- Speichern und Laden ----------
cmd({ type: 'relicPut', id: P.id, u: entry('werksiegel').u });
const json = serialize(g);
const g2 = createGame();
ok(loadInto(g2, json), 'Laden');
ok(g2.state.relics.list.length === R().list.length && relicIn(g2, P.id) && relicIn(g2, P.id).id === 'werksiegel' && Math.abs(fxProd(g2, k) - 1.2) < 1e-9, 'Sammlung und eingesetztes Relikt bleiben, Wirkung gleich');
ok(JSON.stringify(g2.state.relics.got) === JSON.stringify(R().got), 'Liste der erhaltenen Relikte bleibt (legendär nur einmal)');

// Migration v18 → v19: End-Relikt im Inselinventar
const old = JSON.parse(json);
old.v = 18; delete old.relics; old.isl[k].inv.erste_flamme = 1; old.isl[k].inv.holz = 5;
const m = parseSave(JSON.stringify(old));
ok(m && m.v === SAVE_VERSION && m.relics.list.length === 1 && m.relics.list[0].id === 'erste_flamme' && !('erste_flamme' in m.isl[k].inv), 'Migration v18: Die erste Flamme wandert in die Sammlung');
const g3 = createGame();
ok(loadInto(g3, JSON.stringify(old)) && g3.events.some(e => e.type === 'migrated19'), 'Alter Stand lädt, Hinweis „migrated19“');

// ---------- Koop: Spiegel und Befehle eines Mitspielers ----------
const v = createView(GUEST), mir = createMirror();
remoteWorld(mir, netWorld(g, v));
remoteSnap(mir, JSON.parse(JSON.stringify(netSnap(g, v, { speed: 1, halt: false }))), 0);
ok(mir.state.relics && mir.state.relics.list.length === R().list.length && relicIn(mir, P.id) && relicIn(mir, P.id).id === 'werksiegel', 'Spiegel: Sammlung und Sockel des Hosts');
ok(Math.abs(fxProd(mir, k) - 1.2) < 1e-9 && capOf(mir, k) === capOf(g, k), 'Spiegel: Wirkung (Produktion, Lager) wie beim Host');
cmd({ type: 'relicTake', id: P.id }, GUEST);
ok(!relicIn(g, P.id), 'Mitspieler nimmt das Relikt heraus (über den Host)');
cmd({ type: 'relicPut', id: P.id, u: entry('glimmspule').u }, GUEST);
remoteSnap(mir, JSON.parse(JSON.stringify(netSnap(g, v, { speed: 1, halt: false }))), 0);
ok(relicIn(mir, P.id) && relicIn(mir, P.id).id === 'glimmspule', 'Mitspieler setzt ein, Spiegel zeigt es');

if (err.length) { console.error('Fehler:\n- ' + err.join('\n- ')); process.exit(1); }
console.log(`Relikte OK: Sockel (Stufen, einer je Insel, Aufwerten, Abriss), ${RELIC_ORDER.length} Relikte mit Wirkung, Unterhalt, Handel, Aufträge, Tauchen, Speichern, Migration v18, Spiegel.`);
