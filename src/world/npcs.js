/* =========================================================
   NPC-INSELN: Zellen wählen (reine Funktion, kein DOM; Simulation, Spiegel und Prüfskripte)
   pickNpcCells(seed, avoid) → { ole: [cx, cy], brann: [cx, cy], aurel: [cx, cy] }
   Kandidaten = Zellen, deren Mitte im Abstandsband des NPCs liegt (data/npcs.js band, Abstand zur Heimatinsel (0,0)),
   geordnet nach einem Hash aus Seed, Zelle und NPC. Genommen wird die erste Zelle, die nicht die Heimatinsel ist,
   NPC_GAP Zellen von den schon gewählten NPC-Inseln entfernt liegt und für die avoid(cx, cy) nicht gilt
   (Spielstände vor Version 16: schon aufgedeckte oder bebaute Zellen). Gleicher Seed (und gleiches avoid) = gleiche Zellen.
   Gibt es im Band keine freie Zelle, wird es schrittweise um eine Zellbreite nach außen erweitert; erst danach gilt avoid nicht mehr.
   ========================================================= */
import { CELL } from '../config.js';
import { NPC_ORDER, NPC_ISL, NPC_GAP } from '../data/npcs.js';
import { hashInt } from '../util/math.js';

function bandCells(lo, hi) {
  const out = [], R = Math.ceil(hi / CELL) + 1;
  for (let cy = -R; cy <= R; cy++) for (let cx = -R; cx <= R; cx++) {
    const d = Math.hypot(cx * CELL, cy * CELL);
    if (d >= lo && d <= hi) out.push([cx, cy]);
  }
  return out;
}
export function pickNpcCells(seed, avoid) {
  const out = {}, taken = [[0, 0]];
  NPC_ORDER.forEach((id, n) => {
    const [lo, hi] = NPC_ISL[id].band, key = (seed ^ 0x2c1b3c6d) + n * 7919;
    const ok = (c, strict) => taken.every(t => Math.max(Math.abs(t[0] - c[0]), Math.abs(t[1] - c[1])) >= NPC_GAP) && !(strict && avoid && avoid(c[0], c[1]));
    let pick = null;
    for (const strict of [true, false]) {
      for (let grow = 0; grow < 6 && !pick; grow++) {
        const cand = bandCells(lo, hi + grow * CELL).sort((a, b) => hashInt(key, a[0], a[1]) - hashInt(key, b[0], b[1]) || a[0] - b[0] || a[1] - b[1]);
        pick = cand.find(c => ok(c, strict)) || null;
      }
      if (pick) break;
    }
    out[id] = pick;
    taken.push(pick);
  });
  return out;
}
// Zellen gültig? { id: [cx, cy] } mit ganzen Zahlen für alle drei NPCs, sonst null
export function cleanNpcCells(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const id of NPC_ORDER) { const c = raw[id]; if (!Array.isArray(c) || !Number.isInteger(c[0]) || !Number.isInteger(c[1]) || (c[0] === 0 && c[1] === 0)) return null; out[id] = [c[0], c[1]]; }
  return out;
}
