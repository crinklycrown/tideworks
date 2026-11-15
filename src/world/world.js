/* =========================================================
   UNENDLICHE WELT: Zugriff auf den unveränderlichen Boden
   Simulation (Worker) und Oberfläche erzeugen ihre Welt jeweils selbst aus dem Seed.
   - Inseln werden je Zelle erzeugt (worldgen.js) und gecacht (LRU, MAX_ISLANDS).
   - Chunks (32×32 Felder) kopieren die Daten der bis zu 4 berührten Zellen in flache Arrays
     und werden ebenfalls gecacht (LRU, MAX_CHUNKS). Ein entladener Chunk wird später identisch neu erzeugt.
   Alle Abfragen nehmen Feldkoordinaten (x, y); die Varianten mit K nehmen einen Kachel-Schlüssel.
   Kein DOM-Zugriff.
   ========================================================= */
import { MAX_CHUNKS, MAX_ISLANDS, G_WATER, G_LAVA, SANDY } from '../config.js';
import { ORE_QUARZ } from '../data/items.js';
import { CS, CS2, CSH, ck, cidx, tkx, tky, cellOf, islId, islCell } from '../util/tiles.js';
import { genIsland } from './worldgen.js';
import { homeDist, ringIndex } from '../data/islands.js';

export class World {
  // homes = Zellen der Heimatinseln [[cx, cy], …] (Getrennte Inseln, state.homes); ohne Angabe nur (0,0)
  // npcs = Zellen der NPC-Inseln { ole: [cx, cy], … } (state.npcs, Version 16); ohne Angabe keine
  constructor(seed, homes, npcs) {
    this.seed = seed;
    this.homes = homes && homes.length > 1 ? homes.map(h => [h[0] | 0, h[1] | 0]) : null;
    this.homeIds = new Set((this.homes || [[0, 0]]).map(h => islId(h[0], h[1])));
    this.npcIds = new Map();    // Insel-ID → NPC-ID
    if (npcs) for (const id in npcs) if (npcs[id]) this.npcIds.set(islId(npcs[id][0], npcs[id][1]), id);
    this.isles = new Map();     // Insel-ID → { I (Insel oder null), used }
    this.chunks = new Map();    // Chunk-Schlüssel → Chunk
    this.clock = 0; this.lk = -1; this.lc = null;
    this.built = 0;             // erzeugte Chunks (Zähler, für Tests)
    this.pin = null;            // optional: (chunkKey) => true hält einen Chunk im Speicher (z. B. mit Gebäuden)
  }

  /* ---------- Inseln ---------- */
  islandCell(cx, cy) {
    const id = islId(cx, cy);
    let e = this.isles.get(id);
    if (!e) {
      if (this.isles.size >= MAX_ISLANDS) this.evictIslands();
      e = { I: genIsland(this.seed, cx, cy, this.homes, this.npcIds.get(id) || null), used: 0 };
      this.isles.set(id, e);
    }
    e.used = ++this.clock;
    return e.I;
  }
  island(id) { if (id == null || id < 0) return null; const [cx, cy] = islCell(id); return this.islandCell(cx, cy); }
  // Insel der Zelle, in der das Feld liegt (auch wenn das Feld selbst Wasser ist)
  islandNear(x, y) { return this.islandCell(cellOf(x), cellOf(y)); }
  // NPC der Insel k (oder null) und Insel-ID eines NPCs (oder -1)
  npcOf(k) { return this.npcIds.get(k) || null; }
  npcIsl(id) { for (const [k, v] of this.npcIds) if (v === id) return k; return -1; }
  evictIslands() {
    const arr = [...this.isles].filter(([id]) => !this.homeIds.has(id) && !this.npcIds.has(id)).sort((a, b) => a[1].used - b[1].used);
    for (let i = 0; i < arr.length / 4; i++) this.isles.delete(arr[i][0]);
  }
  // Abstand (Felder) zur nächsten Heimatinsel und Ring an (x, y) (Funde, Treibgut, Wracks)
  homeDist(x, y) { return homeDist(this.homes, x, y); }
  ringAt(x, y) { return ringIndex(this.homeDist(x, y)); }
  // Rohzugriff ohne Chunk-Cache (z. B. für die Minimap): Bodenart des Feldes
  rawGround(x, y) {
    const I = this.islandCell(cellOf(x), cellOf(y));
    if (!I) return G_WATER;
    const lx = x - I.x0, ly = y - I.y0;
    return lx < 0 || ly < 0 || lx >= I.w || ly >= I.h ? G_WATER : I.ground[ly * I.w + lx];
  }

  /* ---------- Chunks ---------- */
  chunk(cx, cy) {
    const key = ck(cx, cy);
    if (key === this.lk) return this.lc;
    let c = this.chunks.get(key);
    if (!c) c = this.buildChunk(cx, cy, key);
    c.used = ++this.clock; this.lk = key; this.lc = c;
    return c;
  }
  hasChunk(cx, cy) { return this.chunks.has(ck(cx, cy)); }
  buildChunk(cx, cy, key) {
    if (this.chunks.size >= MAX_CHUNKS) this.evictChunks();
    const c = {
      key, cx, cy, used: 0, land: false,
      ground: new Uint8Array(CS2), isl: new Int32Array(CS2).fill(-1), ore: new Uint8Array(CS2), dw: new Uint8Array(CS2),
      mh: new Uint8Array(CS2), coast: new Uint8Array(CS2), tree0: new Uint8Array(CS2), lava: []
    };
    const X0 = cx << CSH, Y0 = cy << CSH;
    const ca = cellOf(X0), cb = cellOf(X0 + CS - 1), da = cellOf(Y0), db = cellOf(Y0 + CS - 1);
    for (let gy = da; gy <= db; gy++) for (let gx = ca; gx <= cb; gx++) {
      const I = this.islandCell(gx, gy);
      if (!I) continue;
      const xa = Math.max(X0, I.x0), xb = Math.min(X0 + CS, I.x0 + I.w), ya = Math.max(Y0, I.y0), yb = Math.min(Y0 + CS, I.y0 + I.h);
      for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
        const s = (y - I.y0) * I.w + (x - I.x0), d = ((y - Y0) << CSH) | (x - X0), g = I.ground[s];
        c.ground[d] = g; c.coast[d] = I.coast[s];
        if (g === G_WATER) continue;
        c.land = true; c.isl[d] = I.id; c.ore[d] = I.ore[s]; c.dw[d] = I.dw[s]; c.mh[d] = I.mh[s]; c.tree0[d] = I.tree0[s];
        if (g === G_LAVA) c.lava.push(d);
      }
    }
    this.built++;
    this.chunks.set(key, c);
    return c;
  }
  // Die am längsten nicht gebrauchten Chunks entladen (ohne angeheftete und den zuletzt benutzten)
  evictChunks() {
    const arr = [];
    for (const [k, c] of this.chunks) if (k !== this.lk && !(this.pin && this.pin(k))) arr.push(c);
    arr.sort((a, b) => a.used - b.used);
    for (let i = 0; i < arr.length / 4; i++) this.chunks.delete(arr[i].key);
  }

  /* ---------- Abfragen je Feld ---------- */
  gr(x, y) { return this.chunk(x >> CSH, y >> CSH).ground[cidx(x, y)]; }
  il(x, y) { return this.chunk(x >> CSH, y >> CSH).isl[cidx(x, y)]; }
  dw(x, y) { return this.chunk(x >> CSH, y >> CSH).dw[cidx(x, y)]; }
  mh(x, y) { return this.chunk(x >> CSH, y >> CSH).mh[cidx(x, y)]; }
  coast(x, y) { return this.chunk(x >> CSH, y >> CSH).coast[cidx(x, y)]; }
  tree0(x, y) { return this.chunk(x >> CSH, y >> CSH).tree0[cidx(x, y)]; }
  // Vorkommen: Layer-Wert, auf Sand und Strand sonst Quarzsand
  oreAt(x, y) { const c = this.chunk(x >> CSH, y >> CSH), i = cidx(x, y); return c.ore[i] || (SANDY[c.ground[i]] ? ORE_QUARZ : 0); }
  ocean(x, y) { return this.gr(x, y) === G_WATER; }
  grK(k) { return this.gr(tkx(k), tky(k)); }
  ilK(k) { return this.il(tkx(k), tky(k)); }
  oceanK(k) { return this.gr(tkx(k), tky(k)) === G_WATER; }

  stats() { return { chunks: this.chunks.size, islands: this.isles.size, built: this.built }; }
}
export { CS };
