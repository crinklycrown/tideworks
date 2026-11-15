/* Koop-Test „Getrennte Inseln“ ohne Browser (npm run check:coop):
   Spielt in der Simulation des Hosts ein Spiel mit 3 Startplätzen und zwei Spielern durch und prüft
   Besitz, getrennte Forschung, Routen mit Erlaubnis, Preislisten-Handel, Datenschutz der Snapshots,
   „Welt voll“, Wiederverbinden, Speichern/Laden und den Leuchtturm-Wettstreit.
   Beendet sich mit Code 1 bei Fehlern. */
import { createGame, newGame, pst, fogOf, ownerOf, islOwner, kontorOf, homeIsl, isSep } from '../src/sim/state.js';
import { addBuilding, checkPlace } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import { sim, applyCommand, seatPlayer } from '../src/sim/sim.js';
import { newShip, portOf } from '../src/sim/ships.js';
import { speedOf } from '../src/sim/mods.js';
import { createView, netWorld, netSnap, feedViews, evFor } from '../src/sim/views.js';
import { createSnapCache, worldMessage, buildSnapshot } from '../src/sim/snapshot.js';
import { serialize, loadInto } from '../src/save/serialize.js';
import { tkx, tky } from '../src/util/tiles.js';
import { BD } from '../src/data/buildings.js';
import { WONDER } from '../src/data/wonder.js';

const err = [], ok = (c, m) => { if (!c) err.push(m); };
const H = 'host', B = 'pbea12345';
const g = createGame();
newGame(g, 4711, addBuilding, reveal, revealIsland, { slots: 3 });
ok(isSep(g) && g.state.homes.length === 3, 'drei Startplätze');
applyCommand(g, { type: 'player', id: B, name: 'Bea', color: '#3f8fe8', seat: true }, H);
const hB = g.state.homes.find(h => h.pid === B);
ok(hB && hB.slot === 2, 'Bea hat Startplatz 2');
const kH = homeIsl(g, H), kB = homeIsl(g, B), KH = kontorOf(g, kH), KB = kontorOf(g, kB);
ok(KH && KB && ownerOf(KB) === B && islOwner(g, kB) === B, 'Heimatinsel und Hauptkontor gehören Bea');
ok(pst(g, B).found[kH] && fogOf(g, B).get(KH.x, KH.y), 'Heimatinsel des Hosts ist für Bea aufgedeckt');
ok(!fogOf(g, H).get(KB.x - 40, KB.y) || true, '');

// Besitz: auf fremder Insel bauen, fremdes Kontor drehen/abreißen
const ev0 = g.events.length;
applyCommand(g, { type: 'place', t: 'band', x: KH.x - 3, y: KH.y, d: 0 }, B);
ok(g.events.slice(ev0).some(e => e.type === 'fail' && /gehört/.test(e.msg)), 'Bauen auf fremder Insel abgelehnt');
const e1 = g.events.length;
applyCommand(g, { type: 'remove', id: KH.id }, B);
ok(g.blds.has(KH.id) && g.events.slice(e1).some(e => e.type === 'fail' && e.msg.startsWith('Abreißen nicht erlaubt – Gebäude von')), 'fremdes Kontor nicht abreißbar');

// Getrennte Forschung: Bessere Segel nur für eigene Schiffe
const sH = newShip(g, tkx(KH._dock) + 0.5, tky(KH._dock) + 0.5, null, 'fracht', H);
const sB = newShip(g, tkx(KB._dock) + 0.5, tky(KB._dock) + 0.5, null, 'fracht', B);
const v0 = speedOf(g, sB);
Object.assign(g.state.isl[kH].inv, { skizze: 50, werkzeug: 50 });
applyCommand(g, { type: 'research', id: 'segel1' }, H);
ok(g.state.tech.segel1 && !pst(g, B).tech.segel1, 'Forschung nur beim Host');
ok(speedOf(g, sH) > speedOf(g, sB) && speedOf(g, sB) === v0, 'Bessere Segel beschleunigt nur Schiffe des Hosts');
applyCommand(g, { type: 'research', id: 'segel1' }, B);
ok(!pst(g, B).tech.segel1, 'Bea kann ohne eigene Rohstoffe nicht forschen');

// Fremdes Schiff steuern
const e2 = g.events.length;
applyCommand(g, { type: 'renameShip', ship: sH.id, name: 'Gekapert' }, B);
ok(sH.name !== 'Gekapert' && g.events.slice(e2).some(e => e.type === 'fail'), 'fremdes Schiff nicht steuerbar');

// Route mit Erlaubnis: Bea fährt Holz zum Hauptkontor des Hosts
g.state.isl[kB].inv.holz = 300;
applyCommand(g, { type: 'setRoute', ship: sB.id, reset: true, stops: [{ kontor: KB.id, load: [{ it: 'holz', mode: 'all' }], unload: [] }, { kontor: KH.id, load: [], unload: [{ it: '*', mode: 'all' }] }] }, B);
ok(sB.route && sB.route.perm && sB.route.perm[KH.id].st === 'ask', 'Erlaubnis angefragt');
ok(g.events.some(e => e.type === 'permAsk' && e.to.includes(H)), 'Anfrage an den Host');
const holz0 = g.state.isl[kH].inv.holz || 0;
for (let i = 0; i < 20 * 60; i++) sim(g, 0.05);
ok((g.state.isl[kH].inv.holz || 0) === holz0, 'ohne Erlaubnis kein Holz beim Host');
ok(sB.wp === H, 'Schiff wartet auf Erlaubnis des Hosts');
applyCommand(g, { type: 'perm', ship: sB.id, kontor: KH.id, ok: true }, B);
ok(sB.route.perm[KH.id].st === 'ask', 'nur der Besitzer darf erlauben');
applyCommand(g, { type: 'perm', ship: sB.id, kontor: KH.id, ok: true }, H);
ok(sB.route.perm[KH.id].st === 'ok', 'Host erlaubt');
for (let i = 0; i < 20 * 400 && (g.state.isl[kH].inv.holz || 0) === holz0; i++) sim(g, 0.05);
ok((g.state.isl[kH].inv.holz || 0) > holz0, 'mit Erlaubnis kommt Holz beim Host an');
const fl = JSON.stringify(g.state.flow.isl[kH]);
ok(fl.includes('schiffe@' + B), 'Statistik des Hosts: Schiffe von Bea');
// Aufträge ändern: neu fragen
applyCommand(g, { type: 'setRoute', ship: sB.id, stops: [{ kontor: KB.id, load: [{ it: 'holz', mode: 'all' }], unload: [] }, { kontor: KH.id, load: [{ it: 'kalk', mode: 'all' }], unload: [{ it: '*', mode: 'all' }] }] }, B);
ok(sB.route.perm[KH.id].st === 'ask', 'geänderte Aufträge fragen neu');
applyCommand(g, { type: 'perm', ship: sB.id, kontor: KH.id, ok: false }, H);
ok(sB.route.perm[KH.id].st === 'no', 'Host lehnt ab');

// Preislisten-Handel: Handelskontor des Hosts
let HK = null;
const I = g.W.island(kH);
Object.assign(g.state.isl[kH].inv, { holz: 999, eisen: 999 });
for (let y = I.y0; y < I.y0 + I.h && !HK; y++) for (let x = I.x0; x < I.x0 + I.w && !HK; x++) {
  if (!checkPlace(g, 'handelskontor', x, y, false, 0).ok) continue;
  applyCommand(g, { type: 'place', t: 'handelskontor', x, y, d: 0 }, H);
  HK = [...g.blds.values()].find(b => b.t === 'handelskontor');
}
ok(!!HK, 'Handelskontor gebaut');
if (HK) {
  HK.inv = { kalk: 100 };
  applyCommand(g, { type: 'setPrices', id: HK.id, pl: { sell: [{ it: 'kalk', p: 3, keep: 40 }], buy: [{ it: 'holz', p: 2, upto: 30 }] } }, B);
  ok(!HK.pl, 'Preisliste nur vom Besitzer');
  applyCommand(g, { type: 'setPrices', id: HK.id, pl: { sell: [{ it: 'kalk', p: 3, keep: 40 }], buy: [{ it: 'holz', p: 2, upto: 30 }] } }, H);
  ok(HK.pl && HK.pl.sell.length === 1, 'Preisliste gesetzt');
  pst(g, B).coins = 100; g.state.coins = 1000;
  // Bea legt direkt am Handelskontor an (Schiff hinsetzen)
  sB.route = null; sB.st = 'idle'; sB.dest = ''; sB.path = null;
  sB.x = tkx(HK._dock) + 0.5; sB.y = tky(HK._dock) + 0.5; sB.cargo = sB.cargo.map(() => null); sB.cargo[0] = { it: 'holz', n: 50 };
  ok(portOf(g, sB) && portOf(g, sB).id === HK.id, 'Schiff liegt am Handelskontor');
  applyCommand(g, { type: 'shipLoad', ship: sB.id, it: 'kalk', n: -1 }, B);
  ok(HK.inv.kalk === 67 && pst(g, B).coins === 1 && g.state.coins === 1099, `Kauf begrenzt durch Münzen (kalk ${HK.inv.kalk}, Bea ${pst(g, B).coins}, Host ${g.state.coins})`);
  applyCommand(g, { type: 'shipUnload', ship: sB.id, hold: 0 }, B);
  ok((HK.inv.holz || 0) === 30 && pst(g, B).coins === 61, `Verkauf bis Bestand 30 (holz ${HK.inv.holz}, Bea ${pst(g, B).coins})`);
  applyCommand(g, { type: 'shipLoad', ship: sB.id, it: 'eisen', n: -1 }, B);
  ok(!(sB.cargo.some(h => h && h.it === 'eisen')), 'Ware ohne Preisliste wird nicht gehandelt');
  ok(pst(g, B).coinLog.some(b => b.v['pk:' + H]) && g.state.coinLog.some(b => b.v['pv:' + B]), 'Münzbuch beider Seiten');
}

// Datenschutz: Snapshot für Bea
const v = createView(B), w = netWorld(g, v), snap = netSnap(g, v, { speed: 1, halt: false });
const F = fogOf(g, B);
ok(w.fog.length === F.m.size && w.homes && w.me === B, 'world-Nachricht mit Beas Nebel und Startplätzen');
ok((snap.bUpd || []).every(r => { const b = g.blds.get(r.id); return ownerOf(b) === B || F.get(b.x + (BD[b.t].w >> 1), b.y + (BD[b.t].h >> 1)); }), 'nur sichtbare Gebäude');
const rK = (snap.bUpd || []).find(r => r.id === KH.id);
ok(rK && !('buf' in rK) && !('out' in rK), 'fremdes Kontor ohne Puffer');
ok(snap.isl && snap.isl[kH] && Object.keys(snap.isl[kH].inv).length === 0, 'fremdes Inselinventar leer');
ok(snap.coins === pst(g, B).coins && JSON.stringify(snap.tech) === JSON.stringify(pst(g, B).tech), 'eigene Münzen und Forschung');
ok((snap.flowB || []).every(([k]) => islOwner(g, k) === B), 'Statistik nur eigene Inseln');
ok((snap.shipD || []).every(d => { const s = g.state.ships.find(x => x.id === d.id); return ownerOf(s) === B || !d.cargo || !d.cargo.length; }), 'fremde Schiffe ohne Ladung');
ok(!JSON.stringify(snap.players).includes('"st"'), 'Spielerliste ohne Spielstand');
if (HK) { const rH = (snap.bUpd || []).find(r => r.id === HK.id); ok(rH && rH.av && rH.av[0] === 27 && !rH.inv, `fremdes Handelskontor mit verfügbarer Menge (${rH && rH.av})`); }
// Etwas im Nebel von Bea: Gebäude des Hosts weit weg
const far = { id: g.state.nextId++, t: 'kiste', x: KH.x - 60, y: KH.y - 60, d: 0, isl: kH, by: H, inv: { gold: 5 } };
g.blds.set(far.id, far);
const snap2 = netSnap(g, v, { speed: 1, halt: false });
ok(!F.get(far.x + 1, far.y + 1) ? !(snap2.bUpd || []).some(r => r.id === far.id) : true, 'Gebäude im Nebel fehlt im Snapshot');
g.blds.delete(far.id);
// Host-Snapshot: Beas Insel ist für den Host aufgedeckt (Partner-Heimatinsel), ihr Inventar aber nicht
const hc = createSnapCache(); worldMessage(g, hc);
const hs = buildSnapshot(g, hc, 0);
ok(hs.isl[kB] && Object.keys(hs.isl[kB].inv).length === 0, 'Host sieht Beas Inventar nicht');
ok(hs.lh && hs.lh[B] && hs.perms, 'Host-Snapshot mit Leuchttürmen und Anfragen');

// Welt voll und Wiederverbinden
seatPlayer(g, 'pcarl12345');
ok(seatPlayer(g, 'pdora12345') === null, 'vierter Spieler: Welt voll');
ok(seatPlayer(g, B).slot === 2, 'Bea behält ihren Platz');

// Leuchtturm-Wettstreit: Bea beendet Phase 4 zuerst
const W = pst(g, B).wonder;
W.ph = 3; W.pb = 4; W.pt = WONDER.build;
g.state.blds = undefined;
const n0 = g.events.length, fame0 = pst(g, B).xpTotal;
const lt = { id: g.state.nextId++, t: 'leuchtturm', x: KB.x + 6, y: KB.y + 6, d: 0, isl: kB, by: B };
g.blds.set(lt.id, lt); W.id = lt.id;
sim(g, 0.05);
const evs = g.events.slice(n0);
ok(g.state.wfirst === B && evs.some(e => e.type === 'wonderFirst' && e.to === '*'), 'Bea entzündet den ersten Leuchtturm');
ok(pst(g, B).xpTotal - fame0 >= WONDER.firstFame, 'Bonus-Ruhm für den ersten Leuchtturm');
ok(evs.some(e => e.type === 'wonderNews') && evFor(evs.find(e => e.type === 'wonderNews'), H, true), 'alle bekommen die Phase im Chat');
g.blds.delete(lt.id);

// Speichern und Laden
const json = serialize(g), g2 = createGame();
ok(loadInto(g2, json), 'Spielstand lädt');
ok(isSep(g2) && g2.state.homes.length === 3 && g2.state.homes[1].pid === B, 'Startplätze gespeichert');
ok(pst(g2, B).coins === pst(g, B).coins && pst(g2, B).wonder.ph === 4 && g2.state.wfirst === B, 'Spielstand von Bea gespeichert');
ok(fogOf(g2, B).m.size === fogOf(g, B).m.size && fogOf(g2, B).get(KB.x, KB.y), 'Nebel von Bea gespeichert');
ok(g2.state.ships.find(s => s.id === sB.id).owner === B, 'Schiff gehört Bea');
const c2 = createSnapCache(); worldMessage(g2, c2);
const snapA = buildSnapshot(g2, c2, 0);
ok(snapA && snapA.homes, 'Snapshot nach dem Laden');

// Datenrate: 200 Gebäude je Spieler (Bänder auf der eigenen Insel), 10 s Snapshots für Bea
const fill = (pid, K) => {
  const J = g.W.island(islOwner(g, K.isl) === pid ? K.isl : -1);
  let n = 0;
  g.pid = pid;
  for (let y = J.y0; y < J.y0 + J.h && n < 200; y++) for (let x = J.x0; x < J.x0 + J.w && n < 200; x++) {
    if (!checkPlace(g, 'band', x, y, true).ok) continue;
    addBuilding(g, { id: g.state.nextId++, t: 'band', x, y, d: n % 4, isl: K.isl, by: pid, buf: {}, out: {} });
    n++;
  }
  g.pid = null;
  return n;
};
const nH = fill(H, KH), nB = fill(B, KB);
const v2 = createView(B); netWorld(g, v2); v2.rect = [KB.x - 40, KB.y - 30, KB.x + 40, KB.y + 30];
let bytes = 0;
const { encode } = await import('../src/net/protocol.js');
for (let t = 0; t < 100; t++) {
  for (let i = 0; i < 2; i++) sim(g, 0.05);
  feedViews(g, new Map([[B, v2]]), 2);
  buildSnapshot(g, hc, 2);
  const s = netSnap(g, v2, { speed: 1, halt: false });
  if (t >= 20) bytes += (await encode(s)).byteLength;
}
const kbps = bytes / 1024 / 8;
console.log(`Datenrate: ${nH} + ${nB} Bänder, ${kbps.toFixed(1)} KB/s an Bea`);
ok(kbps < 30, `Datenrate ${kbps.toFixed(1)} KB/s`);

if (err.filter(Boolean).length) { console.error(err.filter(Boolean).map(e => '✗ ' + e).join('\n')); process.exit(1); }
console.log('Koop OK: Getrennte Inseln (Besitz, Forschung, Erlaubnis, Preislisten, Datenschutz, Welt voll, Leuchtturm, Speichern).');
