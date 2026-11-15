/* Extraktor-Test ohne Browser (npm run check:extract):
   Extraktor wie der Unloader in Mindustry (Version 18): nimmt aus allen angrenzenden Gebäuden (Speicher und Ausgaben),
   gibt auf Bänder, die nicht hineinzeigen (wegführend und parallel, 0.17.0), und in Gebäude, die die Ware annehmen, nie zurück;
   nie auf einen Bandstrang, der in die Quelle mündet; Filter; Speicher → Speicher nur ins Hauptkontor;
   Ausgleich zwischen zwei Öfen bzw. zwei Kisten (0.17.0, ab 2 Items Unterschied, Filter gilt);
   alte Extraktoren aus Version 17 (auch mit quer laufendem Band davor) arbeiten nach dem Laden weiter.
   Beendet sich mit Code 1 bei Fehlern. -v zeigt jeden Schritt. */
import { createGame, newGame, islData } from '../src/sim/state.js';
import { addBuilding, placeBuilding, removeBuilding } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import { sim } from '../src/sim/sim.js';
import { extractInfo } from '../src/sim/logistics.js';
import { serialize, loadInto } from '../src/save/serialize.js';
import { BD } from '../src/data/buildings.js';
import { SAVE_VERSION } from '../src/config.js';

const err = [], ok = (c, m) => { if (!c) err.push(m); else if (process.argv.includes('-v')) console.log('ok  ', m); };
const SEED = +(process.argv.find(a => /^\d+$/.test(a)) || 4711);
const g = createGame();
newGame(g, SEED, addBuilding, reveal, revealIsland);
const step = (s) => { for (let i = 0; i < s * 10; i++) sim(g, 0.1); };
const K = [...g.blds.values()].find(b => b.t === 'kontor'), k = K.isl, inv = islData(g, k).inv;
// Testfeld links neben dem Hauptkontor (Gelände ist für die Simulation egal, nur die Belegung zählt)
const X = K.x - 30, Y = K.y - 10;
const put = (t, dx, dy, d, opt) => { const b = placeBuilding(g, t, X + dx, Y + dy, d || 0, k, opt); return b; };
const clear = () => { for (const b of [...g.blds.values()]) if (b.x >= X - 2 && b.x < X + 20 && b.y >= Y - 2 && b.y < Y + 20 && !BD[b.t].fixed) removeBuilding(g, b, true); };
const sum = (o) => Object.values(o || {}).reduce((a, n) => a + n, 0);
inv.holz = 500; inv.eisen = 500; inv.kalk = 500;

ok(!BD.extraktor.rot, 'Extraktor hat keine Richtung mehr');

// 1. Kiste → Extraktor → Band (wegführend); Band in den Extraktor hinein wird nicht beliefert
{
  const box = put('kiste', 0, 0); box.inv = { holz: 30, stein: 30 };
  const ex = put('extraktor', 2, 0);
  const away = put('band', 3, 0, 0);       // nach rechts, weg vom Extraktor
  const into = put('band', 2, 1, 3);       // von unten nach oben in den Extraktor
  const side = put('band', 2, -1, 0);      // oben, läuft quer vorbei (nach rechts)
  put('band', 4, 0, 0); put('band', 5, 0, 0); const end = put('kiste', 6, -1);
  step(20);
  ok(sum(end.inv) >= 15, `Waren laufen über das wegführende Band in die zweite Kiste (${sum(end.inv)})`);
  ok(end.inv.holz > 0 && end.inv.stein > 0, 'ohne Filter reihum alle Waren');
  ok(!into.it, 'kein Item auf dem Band, das in den Extraktor hineinführt');
  ok(extractInfo(g, ex).to.some(t => t.id === side.id), 'quer (parallel) vorbeilaufendes Band ist Ausgang (0.17.0)');
  const X1 = extractInfo(g, ex);
  ok(X1.from.length === 1 && X1.from[0].id === box.id, 'Quelle erkannt: Lagerkiste');
  // Filter
  ex.ex = 'stein'; const s0 = box.inv.stein || 0, h0 = box.inv.holz || 0;
  step(6);
  ok((box.inv.holz || 0) === h0 && (box.inv.stein || 0) < s0, 'Filter Stein: nur Stein wird entnommen');
  clear();
}

// 2. Produktionsgebäude (Ausgabe) → Extraktor → Lagerkiste; nie zurück in die Quelle
{
  const saw = put('saege', 0, 0); saw.out.holz = 12;
  const ex = put('extraktor', 2, 0);
  const box = put('kiste', 3, 0);
  step(10);
  ok((box.inv.holz || 0) >= 10, `Holz aus der Ausgabe des Sägewerks in die Kiste (${box.inv.holz || 0})`);
  ok(extractInfo(g, ex).from.some(b => b.id === saw.id), 'Quelle erkannt: Sägewerk (Ausgabe)');
  // Kiste → Sägewerk? Sägewerk nimmt kein Holz an; Kiste → Kiste nicht (Pendeln)
  const before = box.inv.holz;
  step(5);
  ok(box.inv.holz >= before && !(saw.buf.holz), 'Kiste gibt nichts ans Sägewerk zurück');
  clear();
}

// 3. Mehrere Quellen und Ziele: Lagerkiste → Hauptkontor erlaubt, Hauptkontor → Kiste nicht
{
  // Extraktor direkt am Hauptkontor (links daneben), Kiste links davon
  const ex = placeBuilding(g, 'extraktor', K.x - 1, K.y + 1, 0, k);
  const box = placeBuilding(g, 'kiste', K.x - 3, K.y + 1, 0, k); box.inv = { kupfer: 20 };
  const cu0 = inv.kupfer || 0, h0 = inv.holz;
  step(15);
  ok((inv.kupfer || 0) >= cu0 + 20 && !box.inv.kupfer, `Kiste → Hauptkontor (${(inv.kupfer || 0) - cu0} Kupfer)`);
  ok(inv.holz === h0 && !(box.inv.holz), 'Hauptkontor → Kiste nicht (kein Pendeln zwischen Speichern)');
  removeBuilding(g, ex, true); removeBuilding(g, box, true);
}

// 4. Hauptkontor → Extraktor → Schmelzofen (Gebäude, das annimmt) und gleichzeitig dessen Ausgabe zurück ins Hauptkontor
{
  inv.eisenerz = 100; inv.kohle = 100;
  const ex = placeBuilding(g, 'extraktor', K.x - 1, K.y + 1, 0, k);
  const oven = placeBuilding(g, 'schmelzofen', K.x - 3, K.y + 1, 0, k);
  oven.run = true;
  const e0 = inv.eisen;
  step(60);
  ok((oven.buf.eisenerz || 0) + (oven.buf.kohle || 0) > 0 || inv.eisen > e0, 'Schmelzofen bekommt Erz und Kohle direkt aus dem Hauptkontor');
  ok(inv.eisen > e0, `Eisen aus der Ofen-Ausgabe zurück ins Hauptkontor (+${inv.eisen - e0})`);
  removeBuilding(g, ex, true); removeBuilding(g, oven, true);
}

// 6. Paralleles Band als Ausgang: Kiste → Extraktor → seitlich vorbeilaufendes Band → zweite Kiste
{
  const box = put('kiste', 0, 0); box.inv = { holz: 40 };
  const ex = put('extraktor', 2, 0);
  put('band', 2, -1, 0); put('band', 3, -1, 0); put('band', 4, -1, 0);   // läuft oben am Extraktor vorbei nach rechts
  const end = put('kiste', 5, -2);
  step(20);
  ok((end.inv.holz || 0) >= 15, `paralleles Band liefert in die zweite Kiste (${end.inv.holz || 0} Holz)`);
  void ex;
  clear();
}

// 7. Kein Kreis: Band läuft am Extraktor vorbei ins Hauptkontor → nichts aus dem Hauptkontor darauf, aus der Kiste schon
{
  const ex = placeBuilding(g, 'extraktor', K.x - 1, K.y + 1, 0, k);
  const belt = placeBuilding(g, 'band', K.x - 1, K.y, 0, k);   // oben neben dem Extraktor, zeigt ins Hauptkontor
  const box = placeBuilding(g, 'kiste', K.x - 3, K.y + 1, 0, k); box.inv = { kupfer: 10 };
  ok(ex && belt && box, 'Aufbau am Hauptkontor');
  const h0 = inv.holz, cu0 = inv.kupfer || 0;
  let seen = 0;
  for (let i = 0; i < 100; i++) { sim(g, 0.1); if (belt.it && belt.it !== 'kupfer') seen++; }
  ok(!seen, 'keine Ware aus dem Hauptkontor auf dem Band, das ins Hauptkontor zurückführt');
  ok(inv.holz === h0 && (inv.kupfer || 0) === cu0 + 10, `Kiste → Hauptkontor weiter (+${(inv.kupfer || 0) - cu0} Kupfer)`);
  removeBuilding(g, ex, true); removeBuilding(g, belt, true); removeBuilding(g, box, true);
}

// 8. Ausgleich zwischen zwei Öfen (ruhend: ohne Erz läuft kein Ofen)
{
  const o1 = put('schmelzofen', 0, 0), ex = put('extraktor', 2, 0), o2 = put('schmelzofen', 3, 0);
  o1.buf = { kohle: 8 }; o2.buf = {};
  step(10);
  ok(o1.buf.kohle === 4 && o2.buf.kohle === 4, `Kohle ausgeglichen 8/0 → ${o1.buf.kohle || 0}/${o2.buf.kohle || 0}`);
  o1.buf.kohle = 5; o2.buf.kohle = 4;
  step(5);
  ok(o1.buf.kohle === 5 && o2.buf.kohle === 4, 'Unterschied 1: kein Hin-und-her');
  o1.buf = { kohle: 8, eisenerz: 0 }; o2.buf = {}; ex.ex = 'eisenerz';
  step(5);
  ok(o1.buf.kohle === 8 && !o2.buf.kohle, 'Filter Eisenerz: Kohle wird nicht verschoben');
  clear();
}

// 9. Zwei Öfen arbeiten, obwohl nur Ofen 1 beliefert wird; Ausgabe aufs Band läuft reihum mit
{
  const src = put('kiste', -5, 0); src.inv = { kohle: 300 };
  put('extraktor', -3, 0); put('band', -2, 0, 0); put('band', -1, 0, 0);   // Kohle: Kiste → Band → nur Ofen 1
  const o1 = put('schmelzofen', 0, 0), ex = put('extraktor', 2, 0), o2 = put('schmelzofen', 3, 0);
  // Erz für beide Öfen von unten (je Kiste und Extraktor)
  for (const dx of [1, 3]) { put('extraktor', dx, 2).ex = 'eisenerz'; put('kiste', dx, 3).inv = { eisenerz: 300 }; }
  put('band', 2, -1, 3); put('band', 2, -2, 3); const end = put('kiste', 2, -4);   // Eisen nach oben in eine Kiste
  let run2 = 0, maxDiff = 0;
  for (let i = 0; i < 1200; i++) {
    sim(g, 0.1);
    if (o2.run) run2++;
    if (i > 300) maxDiff = Math.max(maxDiff, Math.abs((o1.buf.kohle || 0) - (o2.buf.kohle || 0)));
  }
  ok(run2 > 200, `Ofen 2 arbeitet (${(run2 / 10).toFixed(0)} s von 120 s)`);
  ok((end.inv.eisen || 0) >= 20, `Eisen beider Öfen kommt über das Band an (${end.inv.eisen || 0})`);
  ok(maxDiff <= 3, `Kohle in beiden Öfen etwa gleich (größter Unterschied ${maxDiff})`);
  void ex;
  clear();
}

// 10. Ausgleich zwischen zwei Lagerkisten (Kiste → Kiste nur zum Ausgleich, kein Pendeln)
{
  const a = put('kiste', 0, 0), ex = put('extraktor', 2, 0), c = put('kiste', 3, 0);
  a.inv = { holz: 41 }; c.inv = {};
  step(30);
  ok(a.inv.holz === 21 && c.inv.holz === 20, `Kisten ausgeglichen 41/0 → ${a.inv.holz || 0}/${c.inv.holz || 0}`);
  step(10);
  ok(a.inv.holz === 21 && c.inv.holz === 20, 'danach Ruhe');
  void ex;
  clear();
}

// 5. Alter Spielstand (Version 17): Extraktor mit Richtung, Band davor läuft quer → arbeitet nach dem Laden weiter
{
  const box = put('kiste', 0, 0); box.inv = { holz: 40 };
  const ex = put('extraktor', 2, 0); ex.d = 0;
  const cross = put('band', 3, 0, 1);      // quer (nach unten), der alte Extraktor lud seitlich auf
  put('band', 3, 1, 1); const end = put('kiste', 3, 2);
  const json = JSON.parse(serialize(g, {}));
  ok(json.v === SAVE_VERSION && SAVE_VERSION >= 18, `Spielstand Version ${SAVE_VERSION} (ab 18)`);
  json.v = 17;
  for (const b of json.blds) delete b.fd;
  const g2 = createGame();
  ok(loadInto(g2, JSON.parse(JSON.stringify(json))), 'v17-Stand lädt');
  const ex2 = g2.blds.get(ex.id), end2 = g2.blds.get(end.id);
  ok(ex2 && ex2.fd === 0, 'alter Extraktor merkt sich die Richtung zum quer laufenden Band (fd)');
  for (let i = 0; i < 150; i++) sim(g2, 0.1);
  ok((end2.inv.holz || 0) >= 5, `alter Extraktor liefert weiter (${end2.inv.holz || 0} Holz angekommen)`);
  const json2 = JSON.parse(serialize(g2, {}));
  ok(json2.blds.find(b => b.id === ex.id).fd === 0, 'fd bleibt im Spielstand');
  // Normaler alter Extraktor (Band geradeaus): kein fd
  json.blds.find(b => b.id === cross.id).d = 0;
  const g3 = createGame(); loadInto(g3, JSON.parse(JSON.stringify(json)));
  ok(g3.blds.get(ex.id).fd == null, 'alter Extraktor mit geradem Band: keine Sonderrichtung');
  void cross;
}

if (err.length) { console.error('FEHLER:\n' + err.join('\n')); process.exit(1); }
console.log(`Extraktor OK (Seed ${SEED}): Quellen Kiste/Hauptkontor/Produktion, Ziele Band (auch parallel)/Gebäude, kein Kreis, Ausgleich Öfen/Kisten, Filter, kein Rückweg, Speicher → Hauptkontor, Migration v17.`);
