/* =========================================================
   VERÄNDERLICHE FELD-DATEN, chunkweise gespeichert
   ChunkLayer – Zahl je Feld (Standard 0), z. B. Gebäude-Belegung (bmap) und Erntegebiete (claim).
                Chunks entstehen erst beim ersten Schreiben eines Wertes ≠ 0.
   TreeLayer  – Baumwachstum je Feld (0 = kein Baum, 1 = reif). Unveränderte Chunks liest er aus der
                erzeugten Welt (World.tree0); beim ersten Schreiben wird der Chunk „materialisiert“ und
                bleibt dann im Speicher (er enthält Änderungen gegenüber der Startwelt). chg sammelt
                Änderungen für den nächsten Snapshot (nur in der Simulation gesetzt).
   FogLayer   – aufgedeckte Felder als Bitmaske (128 Byte je Chunk). Nicht vorhandene Chunks sind ganz im Nebel.
   PipeLayer  – Rohrebene: Stufe des Rohrs je Feld (0 = kein Rohr, 1–3 = Mk1–Mk3). Unabhängig von der Gebäude-Belegung,
                ein Feld kann also ein Rohr und ein Band tragen. dirty sammelt geänderte Chunks für den Snapshot.
   Kein DOM-Zugriff.
   ========================================================= */
import { CS, CS2, CSH, ck, ckx, cky, cidx, tkx, tky } from '../util/tiles.js';

export class ChunkLayer {
  constructor(Ctor = Int32Array) { this.C = Ctor; this.m = new Map(); }
  get(x, y) { const c = this.m.get(ck(x >> CSH, y >> CSH)); return c ? c[cidx(x, y)] : 0; }
  set(x, y, v) {
    const key = ck(x >> CSH, y >> CSH);
    let c = this.m.get(key);
    if (!c) { if (!v) return; c = new this.C(CS2); this.m.set(key, c); }
    c[cidx(x, y)] = v;
  }
  getK(k) { return this.get(tkx(k), tky(k)); }
  setK(k, v) { this.set(tkx(k), tky(k), v); }
  clear() { this.m.clear(); }
}

export class TreeLayer {
  constructor(W) { this.W = W; this.m = new Map(); this.chg = null; }
  get(x, y) { const c = this.m.get(ck(x >> CSH, y >> CSH)); return c ? c[cidx(x, y)] : this.W.tree0(x, y); }
  set(x, y, v) {
    const key = ck(x >> CSH, y >> CSH);
    let c = this.m.get(key);
    if (!c) { if (this.W.tree0(x, y) === v) return; c = this.materialize(key); }
    const i = cidx(x, y);
    if (c[i] === v) return;
    c[i] = v;
    if (this.chg) this.chg.set(key * CS2 + i, v);
  }
  getK(k) { return this.get(tkx(k), tky(k)); }
  setK(k, v) { this.set(tkx(k), tky(k), v); }
  materialize(key) {
    const ch = this.W.chunk(ckx(key), cky(key)), c = new Float32Array(CS2);
    for (let i = 0; i < CS2; i++) c[i] = ch.tree0[i];
    this.m.set(key, c);
    return c;
  }
  // Abweichungen eines Chunks von der Startwelt: [Index, Wert in %, …]
  diff(key) {
    const c = this.m.get(key), t0 = this.W.chunk(ckx(key), cky(key)).tree0, o = [];
    for (let i = 0; i < CS2; i++) if (c[i] !== t0[i]) o.push(i, Math.round(c[i] * 100));
    return o;
  }
  applyDiff(key, arr) {
    const c = this.m.get(key) || this.materialize(key);
    for (let j = 0; j + 1 < arr.length; j += 2) if (arr[j] >= 0 && arr[j] < CS2) c[arr[j]] = arr[j + 1] / 100;
  }
}
// Schlüssel einer Baum-Änderung (chg) zurück in Feldkoordinaten
export function chgXY(k) { const key = Math.floor(k / CS2), i = k % CS2; return [(ckx(key) << CSH) + (i & (CS - 1)), (cky(key) << CSH) + (i >> CSH)]; }

export class FogLayer {
  constructor() { this.m = new Map(); this.cver = new Map(); this.ver = 1; this.dirty = new Set(); this.cov = new Map(); }
  get(x, y) { const c = this.m.get(ck(x >> CSH, y >> CSH)); if (!c) return 0; const i = cidx(x, y); return (c[i >> 3] >> (i & 7)) & 1; }
  getK(k) { return this.get(tkx(k), tky(k)); }
  // Kreis um (cx, cy) aufdecken; onNew(x, y) für jedes neu aufgedeckte Feld
  reveal(cx, cy, r, onNew) {
    cx = Math.floor(cx); cy = Math.floor(cy);
    const r2 = r * r + r;
    let key = -1, c = null, n = 0;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy))), y = cy + dy;
      for (let x = cx - half; x <= cx + half; x++) {
        const k2 = ck(x >> CSH, y >> CSH);
        if (k2 !== key) { key = k2; c = this.m.get(key); if (!c) { c = new Uint8Array(CS2 >> 3); this.m.set(key, c); } }
        const i = cidx(x, y), b = 1 << (i & 7);
        if (c[i >> 3] & b) continue;
        c[i >> 3] |= b; n++;
        this.touch(key);
        if (onNew) onNew(x, y);
      }
    }
    return n;
  }
  // Einzelne Felder aufdecken (Listen von x und y); onNew(x, y) für jedes neu aufgedeckte Feld
  revealTiles(xs, ys, onNew) {
    let key = -1, c = null, n = 0;
    for (let j = 0; j < xs.length; j++) {
      const x = xs[j], y = ys[j], k2 = ck(x >> CSH, y >> CSH);
      if (k2 !== key) { key = k2; c = this.m.get(key); if (!c) { c = new Uint8Array(CS2 >> 3); this.m.set(key, c); } }
      const i = cidx(x, y), b = 1 << (i & 7);
      if (c[i >> 3] & b) continue;
      c[i >> 3] |= b; n++;
      this.touch(key);
      if (onNew) onNew(x, y);
    }
    return n;
  }
  touch(key) { if (!this.dirty.has(key)) { this.dirty.add(key); this.cver.set(key, (this.cver.get(key) || 0) + 1); } this.ver++; }
  // ganzen Chunk setzen (Snapshot, Laden)
  setChunk(key, bits) { this.m.set(key, bits); this.cver.set(key, (this.cver.get(key) || 0) + 1); this.ver++; }
  chunkVer(key) { return this.cver.get(key) || 0; }
  // Anteil aufgedeckt: 0 = nichts, 2 = alles, 1 = teilweise (gecacht je Chunk-Version)
  coverage(key) {
    const c = this.m.get(key);
    if (!c) return 0;
    const v = this.cver.get(key) || 0, e = this.cov.get(key);
    if (e && e[0] === v) return e[1];
    let all = true, none = true;
    for (let i = 0; i < c.length; i++) { if (c[i] !== 255) all = false; if (c[i]) none = false; }
    const r = all ? 2 : none ? 0 : 1;
    this.cov.set(key, [v, r]);
    return r;
  }
  // Komprimiert: Lauflängen der Bits (abwechselnd 0 und 1, beginnend mit 0; > 255 als 255,0,…), Base64
  encode(key) {
    const c = this.m.get(key), out = [];
    let cur = 0, run = 0;
    const push = (n) => { while (n > 255) { out.push(255, 0); n -= 255; } out.push(n); };
    for (let i = 0; i < CS2; i++) {
      const b = (c[i >> 3] >> (i & 7)) & 1;
      if (b === cur) run++; else { push(run); cur = b; run = 1; }
    }
    push(run);
    let s = '';
    for (const v of out) s += String.fromCharCode(v);
    return btoa(s);
  }
  decode(key, str) {
    const s = atob(str), c = new Uint8Array(CS2 >> 3);
    let i = 0, cur = 0;
    for (let j = 0; j < s.length; j++) {
      const n = s.charCodeAt(j);
      if (cur) for (let k = 0; k < n && i + k < CS2; k++) c[(i + k) >> 3] |= 1 << ((i + k) & 7);
      i += n; cur ^= 1;
    }
    this.setChunk(key, c);
  }
}

export class PipeLayer extends ChunkLayer {
  constructor() { super(Uint8Array); this.dirty = new Set(); this.ver = 1; }
  set(x, y, v) {
    const key = ck(x >> CSH, y >> CSH), c = this.m.get(key);
    if ((c ? c[cidx(x, y)] : 0) === v) return;
    super.set(x, y, v);
    this.dirty.add(key); this.ver++;
  }
  // ganzen Chunk setzen (Snapshot, Laden); leere Chunks fallen weg
  setChunk(key, arr) { if (arr.some(v => v)) this.m.set(key, arr); else this.m.delete(key); this.ver++; }
  // Alle Rohre eines Chunks: [Index, Stufe, …] (Spielstand)
  list(key) { const c = this.m.get(key), o = []; if (c) for (let i = 0; i < CS2; i++) if (c[i]) o.push(i, c[i]); return o; }
  applyList(key, arr) {
    const c = new Uint8Array(CS2);
    for (let j = 0; j + 1 < arr.length; j += 2) if (arr[j] >= 0 && arr[j] < CS2 && arr[j + 1] >= 1 && arr[j + 1] <= 3) c[arr[j]] = arr[j + 1];
    this.setChunk(key, c);
  }
}
