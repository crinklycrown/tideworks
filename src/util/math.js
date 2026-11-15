import { TK_DY } from './tiles.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const randInt = () => (Math.random() * 2147483647) | 0;

export function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, s, oct) {
  let sum = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { sum += vnoise(x * f, y * f, s + i * 101) * amp; norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}
// Nachbarn eines Kachel-Schlüssels (4 Richtungen)
export const nb4 = (k) => [k - 1, k + 1, k - TK_DY, k + TK_DY];
// Kacheln direkt neben einem Rechteck (ohne Ecken); d = Richtung vom Gebäude weg
export function perim(x, y, w, h) {
  const o = [];
  for (let i = 0; i < w; i++) { o.push({ x: x + i, y: y - 1, d: 3 }); o.push({ x: x + i, y: y + h, d: 1 }); }
  for (let j = 0; j < h; j++) { o.push({ x: x - 1, y: y + j, d: 2 }); o.push({ x: x + w, y: y + j, d: 0 }); }
  return o;
}
// Ganzzahliger Hash aus Seed und zwei Koordinaten (für Zufallsgeneratoren je Zelle)
export function hashInt(s, x, y) { return (hash2(x, y, s) * 4294967296) | 0; }
