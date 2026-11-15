/* =========================================================
   KOOP-PROTOKOLL: Nachrichten ↔ Binärdaten
   Jede Nachricht ist ein Objekt mit Typ t. Gepackt wird sie als
     [Flag 1 Byte: 0 roh, 1 deflate] [u32 Länge JSON] [JSON (UTF-8)] [u8 Anzahl Blöcke] { [u8 Art] [u32 Bytes] [Daten] }
   Typed Arrays im Objekt (Band-Items, Nebel, Rohre …) stehen nicht im JSON, sondern als Binärblock dahinter.
   Ab NET.compressMin Bytes wird der Teil hinter dem Flag mit deflate-raw komprimiert (CompressionStream; fehlt sie, bleibt es roh).
   Auf dem Datenkanal werden Nachrichten in Stücke zu NET.chunk Bytes zerlegt (Framer), weil Browser nur
   begrenzt große Nachrichten erlauben.
   Läuft im Hauptthread und im Worker (kein DOM).

   Mitspieler → Host: hello, cmd, view (Kamera, Auswahl), state (Zeiger, Modus, Vorschau), chat, mark, prof (Name/Farbe), ping, pong, bye
   Host → Mitspieler: welcome, reject, wait (Beitritt wartet auf Zulassen), lobby, world, snap, start, peers (Zustand der anderen),
                      chat, mark, ping, pong, bye
   ========================================================= */
import { NET } from '../data/net.js';

const TA = [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array];
const TAG = '§b';
const enc = new TextEncoder(), dec = new TextDecoder();

// Objekt → Bytes (ohne Kompression); Kommazahlen auf drei Nachkommastellen gerundet
export function pack(obj) {
  const blobs = [];
  const json = JSON.stringify(obj, (k, v) => {
    if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 1000) / 1000;
    if (v instanceof ArrayBuffer) v = new Uint8Array(v);
    if (ArrayBuffer.isView(v)) { blobs.push(v); return { [TAG]: blobs.length - 1 }; }
    return v;
  });
  const jb = enc.encode(json);
  let size = 4 + jb.length + 1;
  for (const b of blobs) size += 5 + b.byteLength;
  const out = new Uint8Array(size), dv = new DataView(out.buffer);
  dv.setUint32(0, jb.length); out.set(jb, 4);
  let o = 4 + jb.length;
  out[o++] = blobs.length;
  for (const b of blobs) {
    out[o] = TA.findIndex(C => b instanceof C); dv.setUint32(o + 1, b.byteLength); o += 5;
    out.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), o); o += b.byteLength;
  }
  return out;
}
export function unpack(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), jl = dv.getUint32(0);
  const json = dec.decode(u8.subarray(4, 4 + jl));
  let o = 4 + jl;
  const n = u8[o++], blobs = [];
  for (let i = 0; i < n; i++) {
    const C = TA[u8[o]] || Uint8Array, len = dv.getUint32(o + 1);
    o += 5;
    blobs.push(new C(u8.slice(o, o + len).buffer));
    o += len;
  }
  return JSON.parse(json, (k, v) => v && typeof v === 'object' && TAG in v ? blobs[v[TAG]] : v);
}

const canZip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
async function through(u8, Stream) {
  const s = new Blob([u8]).stream().pipeThrough(new Stream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
// Objekt → ArrayBuffer (mit Flag, ab compressMin komprimiert)
export async function encode(obj) {
  const raw = pack(obj);
  let body = raw, flag = 0;
  if (canZip && raw.length >= NET.compressMin) { try { const z = await through(raw, CompressionStream); if (z.length < raw.length) { body = z; flag = 1; } } catch (e) { /* roh */ } }
  const out = new Uint8Array(body.length + 1);
  out[0] = flag; out.set(body, 1);
  return out.buffer;
}
// Schnell und synchron (kleine Nachrichten: Zeiger, Ping, Chat)
export function encodeSync(obj) {
  const raw = pack(obj), out = new Uint8Array(raw.length + 1);
  out.set(raw, 1);
  return out.buffer;
}
export async function decode(buf) {
  const u8 = new Uint8Array(buf);
  const body = u8[0] === 1 ? await through(u8.subarray(1), DecompressionStream) : u8.subarray(1);
  return unpack(body);
}
export const bytesOf = (buf) => buf.byteLength;

/* ---------- Zerlegen und Zusammensetzen auf dem Datenkanal ---------- */
// Stück: [0] = ganze Nachricht folgt; [1][u32 id][u16 i][u16 n] = Teil i von n
export class Framer {
  constructor() { this.id = 0; this.parts = new Map(); }
  split(buf) {
    const u8 = new Uint8Array(buf), max = NET.chunk;
    if (u8.length + 1 <= max) { const o = new Uint8Array(u8.length + 1); o.set(u8, 1); return [o.buffer]; }
    const id = ++this.id >>> 0, step = max - 9, n = Math.ceil(u8.length / step), out = [];
    for (let i = 0; i < n; i++) {
      const part = u8.subarray(i * step, (i + 1) * step), o = new Uint8Array(part.length + 9), dv = new DataView(o.buffer);
      o[0] = 1; dv.setUint32(1, id); dv.setUint16(5, i); dv.setUint16(7, n); o.set(part, 9);
      out.push(o.buffer);
    }
    return out;
  }
  // liefert die ganze Nachricht oder null (noch nicht vollständig)
  join(buf) {
    const u8 = new Uint8Array(buf);
    if (u8[0] === 0) return u8.slice(1).buffer;
    const dv = new DataView(u8.buffer, u8.byteOffset), id = dv.getUint32(1), i = dv.getUint16(5), n = dv.getUint16(7);
    let P = this.parts.get(id);
    if (!P) { P = { n, got: 0, list: new Array(n) }; this.parts.set(id, P); }
    if (!P.list[i]) { P.list[i] = u8.slice(9); P.got++; }
    if (P.got < P.n) return null;
    this.parts.delete(id);
    let len = 0;
    for (const p of P.list) len += p.length;
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of P.list) { out.set(p, o); o += p.length; }
    return out.buffer;
  }
}
