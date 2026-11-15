/* =========================================================
   KOORDINATEN DER UNENDLICHEN WELT
   Felder haben beliebige ganzzahlige Koordinaten (auch negativ), (0,0) ist der Spawn.
   Kachel-Schlüssel (tk): eine Zahl je Feld, für Maps/Sets und Pfade (gültig für |x|,|y| < 2^20).
   Chunk-Schlüssel (ck): eine Zahl je Chunk (32×32 Felder).
   Insel-ID: eindeutige Zahl aus den Zellkoordinaten, Heimatinsel (Zelle 0,0) = 0.
   Wichtig: Schlüssel sind größer als 2^31 – keine Bit-Operatoren darauf anwenden.
   ========================================================= */
import { CELL } from '../config.js';

export const CS = 32, CS2 = CS * CS, CSH = 5;           // Chunkgröße (Felder), Fläche, log2

const OFF = 1 << 20, SPAN = 1 << 21;
export const tk = (x, y) => (y + OFF) * SPAN + (x + OFF);
export const tkx = (k) => k % SPAN - OFF;
export const tky = (k) => Math.floor(k / SPAN) - OFF;
export const TK_DY = SPAN;                               // Schlüssel-Abstand zur Zeile darunter

const COFF = 1 << 15, CSPAN = 1 << 16;
export const ck = (cx, cy) => (cy + COFF) * CSPAN + (cx + COFF);
export const ckx = (k) => k % CSPAN - COFF;
export const cky = (k) => Math.floor(k / CSPAN) - COFF;
// Chunk-Schlüssel des Feldes (x,y) und Index im Chunk
export const ckOf = (x, y) => ck(x >> CSH, y >> CSH);
export const cidx = (x, y) => ((y & (CS - 1)) << CSH) | (x & (CS - 1));

// Inselzellen: Zelle (0,0) reicht von -56 bis 55
const HALF = CELL / 2;
export const cellOf = (v) => Math.floor((v + HALF) / CELL);
export const cellMin = (c) => c * CELL - HALF;           // erstes Feld der Zelle

// Insel-ID aus Zellkoordinaten (Zickzack + Szudzik-Paarung): (0,0) → 0
const zz = (n) => n >= 0 ? 2 * n : -2 * n - 1;
const unzz = (z) => z % 2 ? -(z + 1) / 2 : z / 2;
export function islId(cx, cy) { const a = zz(cx), b = zz(cy); return a >= b ? a * a + a + b : a + b * b; }
export function islCell(id) {
  const s = Math.floor(Math.sqrt(id)), r = id - s * s;
  return r < s ? [unzz(r), unzz(s)] : [unzz(s), unzz(r - s)];
}
export const HOME_ISL = 0;
