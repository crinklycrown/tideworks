/* =========================================================
   ERKUNDUNG: Nebel aufdecken, Inseln entdecken und kartieren
   Aufgedeckt wird feldgenau in Kreisen (Radien in config.js REVEAL). Wird dabei erstmals ein Feld
   einer Insel aufgedeckt, gilt sie als entdeckt (state.found) und es gibt das Ereignis „discovered“.
   Kartieren: Hat sich der Nebel an einer Insel geändert, wird gezählt, wie viele ihrer Küstenfelder
   (Landfelder mit Meeresnachbar) aufgedeckt sind. Ab MAP_COAST_SHARE gilt sie als kartiert (state.mapped):
   alle ihre Felder werden aufgedeckt, Ereignis „mapped“. Ein Kontor deckt die ganze Insel plus
   REVEAL_STRIP Felder Küstenstreifen auf (revealIsland).
   Getrennte Inseln: Nebel, entdeckte und kartierte Inseln je Spieler (fogOf, pst in sim/state.js); pid = für wen aufgedeckt wird
   (ohne Angabe: Spieler des laufenden Kommandos bzw. Host). Ereignisse tragen die pid.
   NPC-Inseln (Version 16): beim ersten aufgedeckten Feld zusätzlich der Story-Auslöser discover:<npc> (sim/story.js).
   Kein DOM-Zugriff; coastSeen nutzt auch die Oberfläche auf dem Spiegel.
   ========================================================= */
import { REVEAL_STRIP, MAP_COAST_SHARE, G_WATER } from '../config.js';
import { pst, fogOf, actor } from './state.js';
import { storyEvent } from './story.js';

// Felder einer Insel (gecacht an der erzeugten Insel): land = alle Landfelder, coast = Landfelder mit Meeresnachbar,
// strip = Land plus Küstenstreifen. Jeweils { x: Int32Array, y: Int32Array }.
function shape(I) {
  if (I._shape) return I._shape;
  const { w, h, x0, y0, ground, coast } = I, R = REVEAL_STRIP, R2 = R * R + R;
  const land = [], cst = [], W2 = w + 2 * R, H2 = h + 2 * R, mask = new Uint8Array(W2 * H2);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (ground[i] === G_WATER) continue;
    land.push(x, y); mask[(y + R) * W2 + x + R] = 1;
    if (!coast[i]) continue;
    cst.push(x, y);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R2) mask[(y + R + dy) * W2 + x + R + dx] = 1;
  }
  const pack = (arr, ox, oy) => { const n = arr.length >> 1, X = new Int32Array(n), Y = new Int32Array(n); for (let j = 0; j < n; j++) { X[j] = arr[2 * j] + ox; Y[j] = arr[2 * j + 1] + oy; } return { x: X, y: Y }; };
  const strip = [];
  for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (mask[y * W2 + x]) strip.push(x, y);
  return (I._shape = { land: pack(land, x0, y0), coast: pack(cst, x0, y0), strip: pack(strip, x0 - R, y0 - R) });
}
// Aufgedeckte Küstenfelder einer Insel: { seen, total }
export function coastSeen(g, k, pid) {
  const I = g.W.island(k);
  if (!I) return { seen: 0, total: 0 };
  const c = shape(I).coast, fog = fogOf(g, pid);
  let seen = 0;
  for (let j = 0; j < c.x.length; j++) seen += fog.get(c.x[j], c.y[j]);
  return { seen, total: c.x.length };
}
// Anteil der gesehenen Küste (kartierte Inseln: 1)
export function coastShare(g, k, pid) {
  const P = pst(g, pid);
  if (P.mapped && P.mapped[k]) return 1;
  const c = coastSeen(g, k, pid);
  return c.total ? c.seen / c.total : 0;
}

// Neu aufgedecktes Feld: Insel merken (für die Kartier-Prüfung), beim ersten Mal „entdeckt“
function onNew(g, tx, ty, touched, pid) {
  const k = g.W.il(tx, ty);
  if (k < 0) return;
  touched.add(k);
  const found = pst(g, pid).found;
  if (found[k]) return;
  found[k] = 1;
  const I = g.W.island(k), npc = g.W.npcOf(k);
  g.events.push(Object.assign({ type: 'discovered', id: k, itype: I.type, ring: I.ring, pid }, npc ? { npc, name: I.name } : {}));
  // NPC-Insel aufgedeckt (Schiff in der Nähe): Story-Flag und Cutscene (data/story.js discover:<npc>)
  if (npc) storyEvent(g, 'discover', npc);
}
function revealTiles(g, T, touched, pid) {
  return fogOf(g, pid).revealTiles(T.x, T.y, (tx, ty) => onNew(g, tx, ty, touched, pid));
}
// Kartier-Prüfung für die Inseln, an denen sich der Nebel geändert hat. silent = ohne Ereignis (Laden alter Stände).
export function checkMapped(g, touched, silent, pid) {
  pid = pid || actor(g);
  const P = pst(g, pid), mapped = P.mapped || (P.mapped = {});
  for (const k of touched) {
    if (mapped[k]) continue;
    const c = coastSeen(g, k, pid);
    if (c.total && c.seen < c.total * MAP_COAST_SHARE) continue;
    mapped[k] = 1;
    const I = g.W.island(k);
    revealTiles(g, shape(I).land, new Set(), pid);
    if (!silent) g.events.push({ type: 'mapped', id: k, itype: I.type, ores: Object.assign({}, I.ores), pid });
  }
}
export function reveal(g, x, y, r, pid) {
  pid = pid || actor(g);
  const touched = new Set();
  const n = fogOf(g, pid).reveal(x, y, r, (tx, ty) => onNew(g, tx, ty, touched, pid));
  if (touched.size) checkMapped(g, touched, false, pid);
  return n;
}
// Ganze Insel plus Küstenstreifen aufdecken (Kontor gründen, Heimatinsel, debugKontor)
export function revealIsland(g, k, silent, pid) {
  pid = pid || actor(g);
  const I = g.W.island(k);
  if (!I) return;
  const touched = new Set([k]);
  revealTiles(g, shape(I).strip, touched, pid);
  checkMapped(g, touched, silent, pid);
}
