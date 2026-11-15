/* =========================================================
   NAMENSGENERATOR für Inseln mit Kontor
   Deutsche Silben: Vorsilbe + Endung, abhängig vom Inseltyp:
     normal → „Möwenklippe“, „Bernsteinbucht“, „Nebelriff“
     sand   → „…düne“ („Muscheldüne“)
     vulkan → „…glut“ („Ascheglut“) oder „Feuer…“ („Feuerhorn“)
   Gleicher Seed, gleiche Insel und gleicher Versuch n ergeben denselben Namen.
   ========================================================= */
import { hash2 } from '../util/math.js';

const PRE = ['Möwen', 'Bernstein', 'Nebel', 'Wind', 'Salz', 'Falken', 'Robben', 'Muschel', 'Sturm', 'Tang', 'Krähen', 'Silber', 'Stern', 'Moos',
  'Otter', 'Hummer', 'Perlen', 'Kormoran', 'Kiesel', 'Reiher', 'Ebben', 'Austern', 'Lotsen', 'Seehund', 'Kupfer', 'Birken', 'Dorsch', 'Schwalben'];
const SUF = ['klippe', 'bucht', 'riff', 'holm', 'wacht', 'eck', 'hafen', 'horn', 'sund', 'ufer', 'fels', 'kap', 'au', 'werder', 'nase', 'stein'];
const PRE_SAND = ['Gold', 'Bernstein', 'Muschel', 'Wander', 'Sonnen', 'Möwen', 'Salz', 'Weiß', 'Glitzer', 'Wind', 'Dünen', 'Hitze', 'Seestern', 'Palmen'];
const PRE_GLUT = ['Asche', 'Rauch', 'Basalt', 'Abend', 'Rot', 'Dunkel', 'Schwefel', 'Funken', 'Ruß', 'Drachen', 'Kohlen'];
const SUF_FEUER = ['klippe', 'berg', 'horn', 'kap', 'riff', 'fels', 'zahn', 'schlund', 'kegel', 'insel'];

const pick = (arr, a, b, s) => arr[Math.floor(hash2(a, b, s) * arr.length)];

export function islandName(seed, id, type, n = 0) {
  const a = id * 7 + 3, b = n * 13 + 1;
  if (type === 'sand') return pick(PRE_SAND, a, b, seed + 11) + 'düne';
  if (type === 'vulkan') return hash2(a, b, seed + 17) < 0.5 ? pick(PRE_GLUT, a, b, seed + 19) + 'glut' : 'Feuer' + pick(SUF_FEUER, a, b, seed + 23);
  return pick(PRE, a, b, seed + 29) + pick(SUF, b, a, seed + 31);
}
// Erster Name, der noch nicht vergeben ist (taken = Set der vorhandenen Namen); n = Startversuch
export function suggestName(seed, id, type, taken, n = 0) {
  for (let i = 0; i < 200; i++) { const s = islandName(seed, id, type, n + i); if (!taken.has(s)) return { name: s, n: n + i }; }
  return { name: islandName(seed, id, type, n), n };
}
