/* Determinismus-Test der Welt (npm run check:world):
   Welten mit einer Heimatinsel (Einzelspieler, „Gemeinsame Insel“, alle alten Stände) müssen Feld für Feld gleich bleiben.
   Für einige Seeds werden alle Inselzellen im Umkreis von R Zellen erzeugt (Boden, Vorkommen, Höhe, Küste, Startbäume,
   Kontorplatz, Typ, Ring …), dazu die Funde auf See und der Start eines neuen Spiels (Gebäude, Nebel, Lager).
   Verglichen wird mit tools/world-v13.json (erzeugt mit dem Code von Version 13). --write schreibt die Datei neu.
   Zusätzlich: Welten für 2–4 Spieler (Startplätze, gleichwertige Heimatinseln, Ringe nach der nächsten Heimatinsel).
   Seit Version 16 (NPC-Inseln): Die drei NPC-Zellen sind die einzigen Zellen, die sich ändern dürfen. Der Vergleich mit der
   Referenz läuft deshalb ohne NPC-Inseln; zusätzlich wird geprüft, dass eine Welt mit NPC-Inseln in allen anderen Zellen gleich ist,
   dass die NPC-Inseln im richtigen Ring liegen, aus dem Seed folgen und ein Dorf mit Steg bekommen. Der Spielstart wird ohne
   Dorf, Geschichte, NPC-Inseldaten und Handel (state.npc, v17) verglichen.
   Beendet sich mit Code 1 bei Abweichungen. */
import { readFileSync, writeFileSync } from 'node:fs';
import { World } from '../src/world/world.js';
import { findsInCell } from '../src/world/finds.js';
import { createGame, newGame } from '../src/sim/state.js';
import { addBuilding } from '../src/sim/buildings.js';
import { reveal, revealIsland } from '../src/sim/explore.js';
import * as islands from '../src/data/islands.js';
import { CELL } from '../src/config.js';
import { CS, cellOf } from '../src/util/tiles.js';
import { pickNpcCells } from '../src/world/npcs.js';
import { NPC_ORDER, NPC_ISL } from '../src/data/npcs.js';

const SEEDS = [1, 12345, 777777, 2024, 99];
const R = 9;                      // Zellen in jede Richtung (19 × 19 Zellen ≈ 2128 × 2128 Felder)
const FIND_R = 40;                // Fund-Zellen in jede Richtung
const FILE = new URL('./world-v13.json', import.meta.url);

// FNV-1a über Bytes bzw. Text
function fnv(h, arr) { for (let i = 0; i < arr.length; i++) { h ^= arr[i] & 255; h = Math.imul(h, 16777619) >>> 0; } return h; }
const fnvS = (h, s) => fnv(h, Buffer.from(s, 'utf8'));

function worldPrint(seed, homes, npcs, skip) {
  const W = homes || npcs ? new World(seed, homes, npcs) : new World(seed);
  let h = 2166136261;
  for (let cy = -R; cy <= R; cy++) for (let cx = -R; cx <= R; cx++) {
    if (skip && skip.has(cx + ',' + cy)) continue;
    const I = W.islandCell(cx, cy);
    if (!I) { h = fnvS(h, `${cx},${cy}:-`); continue; }
    h = fnvS(h, JSON.stringify([I.id, I.cx, I.cy, I.home, I.type, I.ring, I.dist, I.r, I.x, I.y, I.name, I.flag, I.x0, I.y0, I.w, I.h, I.tiles, I.kontor, I.dock, I.ores, I.big]));
    for (const a of [I.ground, I.ore, I.dw, I.mh, I.coast, I.tree0]) h = fnv(h, a);
  }
  let f = 2166136261;
  // Fund-Zellen (so groß wie Chunks), die eine übersprungene Inselzelle berühren, zählen nicht mit (Funde meiden Land)
  const near = (cx, cy) => skip && [0, CS - 1].some(dx => [0, CS - 1].some(dy => skip.has(cellOf(cx * CS + dx) + ',' + cellOf(cy * CS + dy))));
  for (let cy = -FIND_R; cy <= FIND_R; cy++) for (let cx = -FIND_R; cx <= FIND_R; cx++) if (!near(cx, cy)) f = fnvS(f, JSON.stringify(findsInCell(W, cx, cy)));
  return { cells: h.toString(16), finds: f.toString(16) };
}
function startPrint(seed) {
  const g = createGame();
  newGame(g, seed, addBuilding, reveal, revealIsland);
  const fog = [...g.fog.m.keys()].sort((a, b) => a - b).map(k => k + ':' + g.fog.encode(k)).join('|');
  // ohne Versionsnummer und ohne Freischaltungen (v15, beim Start leer); ohne Geschichte, NPC-Zellen und Dorf (v16):
  // Dorf-Gebäude bekommen ihre Ids nach den Startgebäuden, nextId zählt sie deshalb wieder ab; ohne Handel mit den Völkern (v17);
  // Leuchtturm ohne die Baustellen-Felder von 0.18.0 (got, lager, acc); ohne Taucherglocke und Tauchspot (0.19.0)
  const npcB = [...g.blds.values()].filter(b => b.npc), isl = Object.assign({}, g.state.isl);
  for (const b of npcB) delete isl[b.isl];
  const st = Object.assign({}, g.state, { flow: null, v: null, unl: undefined, story: undefined, npcs: undefined, npc: undefined, dive: undefined, nextId: g.state.nextId - npcB.length, isl,
    wonder: (({ ph, pb, pt, id, doneAt }) => ({ ph, pb, pt, id, doneAt }))(g.state.wonder) });
  return fnvS(fnvS(fnvS(2166136261, JSON.stringify([...g.blds.values()].filter(b => !b.npc))), fog), JSON.stringify(st)).toString(16);
}

const now = {};
for (const s of SEEDS) now[s] = Object.assign(worldPrint(s), { start: startPrint(s) });
const err = [];
if (process.argv.includes('--write')) {
  writeFileSync(FILE, JSON.stringify(now, null, 1) + '\n');
  console.log('tools/world-v13.json geschrieben.');
} else {
  const ref = JSON.parse(readFileSync(FILE, 'utf8'));
  for (const s of SEEDS) for (const k of ['cells', 'finds', 'start']) {
    if (!ref[s]) { err.push(`Seed ${s}: kein Referenzwert`); continue; }
    if (ref[s][k] !== now[s][k]) err.push(`Seed ${s}: ${k} weicht ab (${now[s][k]} statt ${ref[s][k]})`);
  }
  // Eine Heimatinsel ausdrücklich bei (0,0) angegeben: dieselbe Welt
  if (typeof islands.homeCells === 'function') {
    for (const s of SEEDS) { const p = worldPrint(s, [[0, 0]]); if (p.cells !== now[s].cells || p.finds !== now[s].finds) err.push(`Seed ${s}: Welt mit Startplatz [(0,0)] weicht von der Einzelspieler-Welt ab`); }
    // Getrennte Inseln: 2–4 Startplätze, gleichwertig, Ringe nach der nächsten Heimatinsel
    for (let n = 2; n <= 4; n++) {
      const cells = islands.homeCells(n);
      if (cells.length !== n || String(cells[0]) !== '0,0') err.push(`${n} Spieler: Startplätze ${JSON.stringify(cells)}`);
      for (const s of SEEDS) {
        const W = new World(s, cells), I = cells.map(([cx, cy]) => W.islandCell(cx, cy));
        if (I.some(x => !x || !x.home || x.ring !== 0 || !x.kontor)) { err.push(`Seed ${s}, ${n} Spieler: Heimatinsel fehlt oder ohne Kontorplatz`); continue; }
        const sig = (x) => JSON.stringify([x.type, x.r, x.ores && Object.keys(x.ores).sort()]);
        if (I.some(x => sig(x) !== sig(I[0]))) err.push(`Seed ${s}, ${n} Spieler: Heimatinseln nicht gleichwertig ${I.map(sig).join(' / ')}`);
        for (let cy = -R; cy <= R; cy++) for (let cx = -R; cx <= R; cx++) {
          const J = W.islandCell(cx, cy);
          if (!J) continue;
          const d = Math.min(...cells.map(([hx, hy]) => Math.hypot((cx - hx) * CELL, (cy - hy) * CELL)));
          if (J.ring !== islands.ringIndex(d)) err.push(`Seed ${s}, ${n} Spieler: Zelle ${cx},${cy} hat Ring ${J.ring} statt ${islands.ringIndex(d)}`);
        }
      }
      const dist = [];
      for (let i = 1; i < n; i++) dist.push(Math.round(Math.hypot(cells[i][0] * CELL, cells[i][1] * CELL)));
      console.log(`${n} Spieler: Startplätze ${cells.map(c => `(${c})`).join(' ')}, Abstand zu Platz 1: ${dist.join(', ')} Felder`);
    }
  }
  // NPC-Inseln (Version 16)
  for (const s of SEEDS) {
    const g = createGame();
    newGame(g, s, addBuilding, reveal, revealIsland);
    const cells = g.state.npcs, skip = new Set(Object.values(cells || {}).map(c => c.join(',')));
    if (!cells || JSON.stringify(cells) !== JSON.stringify(pickNpcCells(s))) { err.push(`Seed ${s}: NPC-Zellen fehlen oder folgen nicht aus dem Seed`); continue; }
    if (skip.size !== 3 || skip.has('0,0')) err.push(`Seed ${s}: NPC-Zellen ${JSON.stringify(cells)}`);
    const a = worldPrint(s, null, null, skip), b = worldPrint(s, null, cells, skip);
    if (a.cells !== b.cells || a.finds !== b.finds) err.push(`Seed ${s}: Welt mit NPC-Inseln weicht außerhalb der NPC-Zellen ab`);
    const ring = [];
    for (const id of NPC_ORDER) {
      const k = g.W.npcIsl(id), I = k >= 0 && g.W.island(k), [lo, hi] = NPC_ISL[id].band, port = [...g.blds.values()].find(o => o.t === 'npchafen' && o.npc === id);
      if (!I) { err.push(`Seed ${s}: Insel von ${id} fehlt`); continue; }
      if (I.dist < lo || I.dist > hi + 6 * CELL) err.push(`Seed ${s}: ${id} liegt ${Math.round(I.dist)} Felder weit (Band ${lo}–${hi})`);
      if (!port || !port.sl) err.push(`Seed ${s}: ${id} hat keinen Steg`);
      const n = [...g.blds.values()].filter(o => o.npc === id).length;
      if (n < 6) err.push(`Seed ${s}: Dorf von ${id} hat nur ${n} Gebäude`);
      if (g.state.found[k]) err.push(`Seed ${s}: Insel von ${id} ist schon beim Start entdeckt`);
      ring.push(`${id} R${I.ring} ${Math.round(I.dist)}f ${n}G`);
    }
    console.log(`Seed ${s}: ${ring.join(', ')}`);
  }
  if (err.length) { console.error(err.join('\n')); process.exit(1); }
  console.log(`Welt OK: ${SEEDS.length} Seeds, je ${(2 * R + 1) ** 2} Inselzellen, ${(2 * FIND_R + 1) ** 2} Fund-Zellen und der Spielstart gleich wie in Version 13; NPC-Inseln in Ring 1–3 mit Dorf, sonst keine Änderung.`);
}
