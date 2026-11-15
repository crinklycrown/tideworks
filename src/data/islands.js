/* =========================================================
   INSELN DER UNENDLICHEN WELT
   Jede Inselzelle (112×112 Felder, config.js CELL) hat höchstens eine Insel. Ob, welcher Typ,
   wie groß und welche Vorkommen, hängt nur vom Seed und den Zellkoordinaten ab (world/worldgen.js).
   Zum Nachjustieren: RINGS (nach Entfernung zum Spawn), ISL_TYPES und HOME.
   ========================================================= */
import { CELL } from '../config.js';

// Heimatinsel in Zelle (0,0); bei „Getrennte Inseln“ hat jeder Startplatz eine Heimatinsel nach dieser Vorlage (HOME_SLOTS)
export const HOME = {
  name: 'Heimatinsel', flag: '#e0384f', type: 'normal', r: 42,
  ores: [['kohle', 3], ['eisenerz', 3], ['kalk', 2], ['kupfererz', 1, 0.7]],   // [Vorkommen, Anzahl, Größe]
  mountains: 1
};

// Getrennte Inseln: Startplätze für min–max Spieler. Platz 1 (Host) ist Zelle (0,0), die übrigen liegen etwa dist Felder entfernt,
// bei 3–4 Spielern gleichmäßig im Kreis um den Mittelpunkt aller Plätze (auf ganze Inselzellen gerundet, siehe homeCells).
export const HOME_SLOTS = { min: 2, max: 4, dist: 200 };
// Zellen der Startplätze für n Spieler: [[cx, cy], …], Platz 1 = [0, 0]. Nachbarn auf dem Kreis haben den Abstand dist (Sehne).
// Bei 4 Spielern ist der Kreis um 45° gedreht, damit das Quadrat an den Zellen ausgerichtet ist.
export function homeCells(n) {
  if (!(n > 1)) return [[0, 0]];
  const R = HOME_SLOTS.dist / (2 * Math.sin(Math.PI / n)), a0 = Math.PI + (n === 4 ? Math.PI / 4 : 0);
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + k * 2 * Math.PI / n, x = R * (Math.cos(a) - Math.cos(a0)), y = R * (Math.sin(a) - Math.sin(a0));
    const c = [Math.round(x / CELL) || 0, Math.round(y / CELL) || 0];
    if (!out.some(o => o[0] === c[0] && o[1] === c[1])) out.push(c);
  }
  return out;
}
// Abstand (Felder) von (x, y) zur nächsten Heimatinsel (Mitte ihrer Zelle); homes = [[cx, cy], …] oder leer = nur (0,0)
export function homeDist(homes, x, y) {
  if (!homes || homes.length < 2) return Math.hypot(x, y);
  let d = Infinity;
  for (const [hx, hy] of homes) d = Math.min(d, Math.hypot(x - hx * CELL, y - hy * CELL));
  return d;
}

export const ISL_TYPES = {
  normal: { name: 'Normale Insel', mountainChance: 0.4 },
  sand:   { name: 'Sandinsel' },
  vulkan: { name: 'Vulkaninsel' }
};

// Ringe nach Entfernung der Zellmitte zum Spawn (Felder); bei mehreren Heimatinseln zur nächsten (homeDist).
//   types: Wahrscheinlichkeit je Inseltyp, empty: Anteil leerer Zellen
//   ores[typ]: [Vorkommen, min, max, Größe] – Anzahl der Flecken zufällig zwischen min und max,
//   Größe multipliziert den Radius der Flecken (zusätzlich wachsen sie mit der Entfernung, siehe oreScale)
export const RINGS = [
  { name: 'Ring 0', max: 180, empty: 0.2, types: { normal: 1 },
    ores: { normal: [['kohle', 1, 2], ['eisenerz', 1, 2], ['kalk', 1, 2], ['kupfererz', 0, 1]] } },
  { name: 'Ring 1', max: 450, empty: 0.4, types: { normal: 0.8, sand: 0.2 },
    ores: { normal: [['kupfererz', 2, 4, 1.3], ['eisenerz', 1, 2], ['kohle', 1, 2], ['kalk', 1, 2]],
            sand: [['kupfererz', 1, 2], ['kalk', 1, 2]] } },
  { name: 'Ring 2', max: 900, empty: 0.4, types: { normal: 0.45, vulkan: 0.25, sand: 0.3 },
    ores: { normal: [['kupfererz', 1, 3, 1.2], ['eisenerz', 1, 3], ['kohle', 1, 2], ['kalk', 1, 2]],
            sand: [['oel', 2, 4], ['kalk', 0, 1]],
            vulkan: [['schwefel', 2, 4], ['eisenerz', 1, 2], ['kohle', 0, 1]] } },
  { name: 'Ring 3', max: Infinity, empty: 0.4, types: { normal: 0.4, vulkan: 0.3, sand: 0.3 },
    ores: { normal: [['neodym', 1, 2], ['kupfererz', 1, 3, 1.2], ['eisenerz', 1, 3], ['kohle', 1, 2], ['kalk', 0, 2]],
            sand: [['oel', 3, 5], ['kalk', 0, 1]],
            vulkan: [['schwefel', 3, 5], ['eisenerz', 1, 2], ['kohle', 0, 1]] } }
];
export const ringIndex = (dist) => { let i = 0; while (dist >= RINGS[i].max) i++; return i; };
// Inselradius (Felder) nach Entfernung: 14–36, mit der Entfernung leicht steigend
export const islandRadius = (dist, rnd) => Math.min(36, 14 + rnd * 14 + Math.min(8, dist / 140));
// Vorkommen werden mit der Entfernung größer
export const oreScale = (dist) => 1 + Math.min(0.7, dist / 1600);

// Flaggenfarben weiterer Inseln (nach Insel-ID verteilt)
export const FLAGS = ['#e0843a', '#f4f0e0', '#8a8f98', '#3f6fd8', '#5bb04a', '#a25ad8', '#e8c43a', '#3ab8b0'];
export const islFlag = (id) => id === 0 ? HOME.flag : FLAGS[id % FLAGS.length];
