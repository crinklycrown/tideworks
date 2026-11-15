/* =========================================================
   CHUNK-BILDER: vorgerenderter Boden und Nebel je Chunk, gecacht (LRU)
   Der Renderer meldet jedes Bild die sichtbaren Chunks an (wantGround/wantFog) und ruft pump(ms) auf.
   pump malt in der Zeit noch fehlende Bilder, zuletzt angefragte zuerst; der Boden wird zeilenweise
   über mehrere Bilder verteilt gemalt. Bis ein Bild fertig ist, liefert get… null (Platzhalter zeichnen).
   ========================================================= */
import { TS, MAX_CHUNK_IMAGES } from '../config.js';
import { CS, ck } from '../util/tiles.js';
import { createGroundJob, runGroundJob } from './ground.js';
import { paintFog, FOG_SZ } from './fog.js';

const PX = CS * TS;
const ground = new Map();     // ck → { cv, done, land, used }
const fogImg = new Map();     // ck → { cv, ver, used, empty }
let job = null, jobKey = -1, jobIm = null, fogIm = null, clock = 0, worldVer = -1;
const spare = [];             // wiederverwendbare Leinwände (Boden)
export const counts = () => ({ groundImages: ground.size, fogImages: fogImg.size });

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// Neue Welt: alles verwerfen
export function resetChunkImages(ver) {
  if (ver === worldVer) return;
  worldVer = ver;
  for (const e of ground.values()) if (e.cv) spare.push(e.cv);
  ground.clear(); fogImg.clear(); job = null; jobKey = -1;
}
function evict(map, keep, onDrop) {
  if (map.size <= keep) return;
  const arr = [...map].sort((a, b) => a[1].used - b[1].used);
  for (let i = 0; i < arr.length - keep; i++) { if (onDrop) onDrop(arr[i][1]); map.delete(arr[i][0]); }
}

/* ---------- Boden ---------- */
// Fertiges Bild oder null; vermerkt den Chunk als gebraucht
export function wantGround(cx, cy) {
  const key = ck(cx, cy);
  let e = ground.get(key);
  if (!e) { e = { cx, cy, cv: null, done: false, land: true, used: 0 }; ground.set(key, e); }
  e.used = ++clock;
  return e;
}
/* ---------- Nebel ---------- */
// ver = Summe der Nebel-Versionen des Chunks und seiner Nachbarn
export function wantFog(cx, cy, ver) {
  const key = ck(cx, cy);
  let e = fogImg.get(key);
  if (!e) { e = { cx, cy, cv: null, ver: -1, used: 0, empty: false, want: ver }; fogImg.set(key, e); }
  e.used = ++clock; e.want = ver;
  return e;
}

// Arbeitet fehlende Bilder ab (zuletzt angefragte zuerst), bis budget ms verbraucht sind
export function pump(W, fog, budget, frameUsed) {
  const t0 = performance.now(), deadline = t0 + budget;
  // Nebel zuerst (kleine Bilder, sichtbar wichtiger)
  const fq = [...fogImg.values()].filter(e => e.ver !== e.want && e.used >= frameUsed).sort((a, b) => b.used - a.used);
  for (const e of fq) {
    if (performance.now() > deadline) break;
    if (!fogIm) fogIm = new ImageData(FOG_SZ, FOG_SZ);
    fogIm.data.fill(0);
    e.empty = !paintFog(fog, e.cx, e.cy, fogIm);
    if (!e.empty) { if (!e.cv) e.cv = canvas(FOG_SZ, FOG_SZ); e.cv.getContext('2d').putImageData(fogIm, 0, 0); }
    e.ver = e.want;
  }
  // Boden
  while (performance.now() < deadline) {
    if (!job) {
      let best = null;
      for (const e of ground.values()) if (!e.done && e.used >= frameUsed && (!best || e.used > best.used)) best = e;
      if (!best) break;
      job = createGroundJob(W, best.cx, best.cy); jobKey = ck(best.cx, best.cy);
      best.land = job.land;
    }
    if (!jobIm) jobIm = new ImageData(PX, PX);
    if (!runGroundJob(job, jobIm.data, deadline)) break;
    const e = ground.get(jobKey);
    if (e) {
      e.cv = e.cv || spare.pop() || canvas(PX, PX);
      e.cv.getContext('2d').putImageData(jobIm, 0, 0);
      e.done = true;
    }
    job = null; jobKey = -1;
  }
  // Ein angefangener Auftrag für einen nicht mehr sichtbaren Chunk wird verworfen
  if (job) { const e = ground.get(jobKey); if (!e || e.used < frameUsed) { job = null; jobKey = -1; } }
  evict(ground, MAX_CHUNK_IMAGES, (e) => { if (e.cv) spare.push(e.cv); });
  if (spare.length > 8) spare.length = 8;
  evict(fogImg, MAX_CHUNK_IMAGES * 2);
}
export const frameStamp = () => clock + 1;
