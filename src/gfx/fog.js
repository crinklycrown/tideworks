/* =========================================================
   NEBEL: Wolkendecke über unerkundeten Feldern, je Chunk als kleines Bild (128×128, 1 Pixel = 4×4 Weltpixel)
   Die Dichte je Pixel wird aus den aufgedeckten Feldern (FogLayer) bilinear gemischt und mit Rauschen
   ausgefranst: dunkelblaue Wolken innen, helle Wolkenränder außen, kein Gitterrand.
   ========================================================= */
import { TS } from '../config.js';
import { CS } from '../util/tiles.js';
import { hash2, vnoise, fbm } from '../util/math.js';
import { bay } from './pixelbuffer.js';

export const FOG_PX = 4;                      // Weltpixel je Nebel-Pixel
const SZ = CS * TS / FOG_PX;                  // 128
const FW = CS + 2;                            // Raster mit 1 Feld Rand
export const FOG_FLAT = '#232d4a';            // Platzhalter, solange das Bild fehlt
const BODY = [[29, 38, 64], [35, 45, 75], [42, 55, 90], [52, 68, 108]], RIM = [[128, 147, 184], [196, 208, 228]];

// Malt den Nebel eines Chunks in ein ImageData (SZ×SZ). Liefert false, wenn der Chunk nebelfrei ist.
export function paintFog(fog, cx, cy, im) {
  const tx0 = cx * CS - 1, ty0 = cy * CS - 1, f = new Float32Array(FW * FW);
  let any = false;
  for (let y = 0; y < FW; y++) for (let x = 0; x < FW; x++) { const v = fog.get(tx0 + x, ty0 + y) ? 0 : 1; f[y * FW + x] = v; if (v) any = true; }
  if (!any) return false;
  const D = im.data, X0 = cx * CS * TS, Y0 = cy * CS * TS;
  for (let sy = 0; sy < SZ; sy++) for (let sx = 0; sx < SZ; sx++) {
    const wx = X0 + sx * FOG_PX + 2, wy = Y0 + sy * FOG_PX + 2;
    // Feldmitten liegen bei (Feld + 0,5) · TS; Raster beginnt 1 Feld vor dem Chunk
    const u = wx / TS - 0.5 - tx0, v = wy / TS - 0.5 - ty0, ix = Math.floor(u), iy = Math.floor(v), fx = u - ix, fy = v - iy;
    const a = f[iy * FW + ix], b = f[iy * FW + ix + 1], c = f[(iy + 1) * FW + ix], d = f[(iy + 1) * FW + ix + 1];
    const base = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    const p = (sy * SZ + sx) * 4;
    if (base <= 0) { D[p + 3] = 0; continue; }
    const dd = base + (vnoise(wx / 22, wy / 22, 777) - 0.5) * 0.55 + (hash2(sx + X0, sy + Y0, 778) - 0.5) * 0.08;
    let col;
    if (dd > 0.6) {
      const t = fbm(wx / 110, wy / 110, 4242, 3) * 0.75 + vnoise(wx / 26, wy / 26, 4243) * 0.25 + (bay(sx, sy) - 0.5) * 0.06;
      col = BODY[t > 0.64 ? 3 : t > 0.55 ? 2 : t > 0.45 ? 1 : 0];
    } else if (dd > 0.45) col = RIM[dd > 0.53 ? 0 : 1];
    else { D[p + 3] = 0; continue; }
    D[p] = col[0]; D[p + 1] = col[1]; D[p + 2] = col[2]; D[p + 3] = 255;
  }
  return true;
}
export { SZ as FOG_SZ };
