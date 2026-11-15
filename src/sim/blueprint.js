/* =========================================================
   BLAUPAUSEN: erfassen, prüfen, drehen, platzieren
   Format (Version 1), Ursprung = linke obere Ecke des Inhalts:
     { v: 1, name, w, h,
       parts: [{ t, x, y, d, rc?, ex?, ga?, so?, bl? }],   Gebäude und flache Logistik-Teile (Reihenfolge = Bau-Reihenfolge);
                                             ex = Ware des Extraktors, ga = Tor-Automatik { it, hi, lo }, so = Sortierer { it, rv }, bl = Brückenband-Verbindung [Richtung, Abstand]
       pipes: [[x, y, Stufe]],               Rohre (Stufe 1–3)
       links: [[i, j]] }                     Kabel zwischen parts[i] und parts[j]
   Als Code wird das JSON (UTF-8) Base64-kodiert. Erfassen, Prüfen und Drehen laufen auch auf dem Spiegel
   der Oberfläche (Vorschau), gebaut wird nur in der Simulation (Kommando 'placeBlueprint').
   Kein DOM-Zugriff.
   ========================================================= */
import { BD, FLAT, PIPE, BELT_BRIDGE } from '../data/buildings.js';
import { ITEMS } from '../data/items.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { PIPE_BY_TIER } from '../data/fluids.js';
import { checkPlace, placeBuilding, placePipe, bAt, gateAuto, sorterCfg, linkBridge } from './buildings.js';
import { DIRS } from '../config.js';
import { canLink, link, autoLink, isPowered } from './power.js';
import { logOp } from './undo.js';
import { mine, myIsl } from './state.js';

export const BP_VERSION = 1;
export const BP_NAME_LEN = 32;
// Diese Gebäude kommen nie in eine Blaupause (eins pro Insel bzw. ans Meer gebunden)
export const BP_EXCLUDE = new Set(['kontor', 'kontoralt', 'handelskontor', 'werft', 'handel', 'leuchtturm', 'sockel1', 'sockel2', 'sockel3']);

/* ---------- Erfassen ---------- */
// Rechteck (Felder, einschließlich) → { bp, skipped: { Typ: Anzahl }, n } (bp = null, wenn nichts darin liegt)
export function captureBlueprint(g, x0, y0, x1, y1) {
  const ax = Math.min(x0, x1), ay = Math.min(y0, y1), bx = Math.max(x0, x1), by = Math.max(y0, y1);
  const seen = new Set(), list = [], skipped = {};
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
    const b = bAt(g, x, y);
    if (!b || seen.has(b.id)) continue;
    seen.add(b.id);
    if (!mine(g, b)) continue;   // Getrennte Inseln: fremde Gebäude nicht kopieren
    const d = BD[b.t];
    if (b.x < ax || b.y < ay || b.x + d.w - 1 > bx || b.y + d.h - 1 > by) continue;   // nur ganz enthaltene
    if (BP_EXCLUDE.has(b.t) || d.fixed) { skipped[b.t] = (skipped[b.t] || 0) + 1; continue; }
    list.push(b);
  }
  list.sort((p, q) => p.id - q.id);
  const pipes = [];
  for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) { const p = g.pipes.get(x, y); if (p && myIsl(g, g.W.il(x, y))) pipes.push([x, y, p]); }
  if (!list.length && !pipes.length) return { bp: null, skipped, n: 0 };
  const idx = new Map(list.map((b, i) => [b.id, i]));
  const parts = list.map(b => {
    const p = { t: b.t, x: b.x, y: b.y, d: BD[b.t].rot ? b.d : 0 };
    if (b.rc) p.rc = b.rc;
    if (b.t === 'extraktor' && b.ex) p.ex = b.ex;
    if (b.t === 'tor' && b.ga) p.ga = Object.assign({}, b.ga);
    if (b.t === 'sortierer' && b.so) p.so = Object.assign({}, b.so);
    if (b.t === 'bandbruecke' && b.bl) p.bl = b.bl.slice();
    return p;
  });
  const links = [];
  for (const b of list) for (const id of b.links || []) { const j = idx.get(id), i = idx.get(b.id); if (j != null && i < j) links.push([i, j]); }
  return { bp: normalize({ v: BP_VERSION, name: '', parts, pipes, links }), skipped, n: list.length };
}
// Auf die linke obere Ecke des Inhalts schieben, Breite und Höhe setzen
function normalize(bp) {
  let ax = Infinity, ay = Infinity, bx = -Infinity, by = -Infinity;
  for (const p of bp.parts) { const d = BD[p.t]; ax = Math.min(ax, p.x); ay = Math.min(ay, p.y); bx = Math.max(bx, p.x + d.w - 1); by = Math.max(by, p.y + d.h - 1); }
  for (const [x, y] of bp.pipes) { ax = Math.min(ax, x); ay = Math.min(ay, y); bx = Math.max(bx, x); by = Math.max(by, y); }
  if (ax === Infinity) { bp.w = bp.h = 0; return bp; }
  for (const p of bp.parts) { p.x -= ax; p.y -= ay; }
  bp.pipes = bp.pipes.map(([x, y, t]) => [x - ax, y - ay, t]);
  bp.w = bx - ax + 1; bp.h = by - ay + 1;
  return bp;
}

/* ---------- Prüfen (Import, Kommando) ---------- */
// Beliebiges Objekt → { bp, notes } (bp = null, wenn nichts Brauchbares darin ist). Unbekanntes wird ausgelassen und in notes vermerkt.
export function parseBlueprint(o) {
  const notes = [];
  if (!o || typeof o !== 'object' || !Array.isArray(o.parts)) return { bp: null, notes: ['Das ist keine Blaupause.'] };
  if (o.v !== BP_VERSION) return { bp: null, notes: [`Unbekannte Blaupausen-Version (${o.v}).`] };
  const num = (v) => Number.isInteger(v) && Math.abs(v) < 4096;
  const parts = [], map = new Map();
  let badB = 0, badR = 0, badI = 0;
  o.parts.forEach((p, i) => {
    if (!p || !BD[p.t] || BD[p.t].fixed || BP_EXCLUDE.has(p.t) || PIPE.has(p.t) || !num(p.x) || !num(p.y)) { badB++; return; }
    const q = { t: p.t, x: p.x, y: p.y, d: BD[p.t].rot && num(p.d) ? ((p.d % 4) + 4) % 4 : 0 };
    if (p.rc != null) { const R = RECIPE_BY_ID[p.rc]; if (R && R.b === p.t) q.rc = p.rc; else badR++; }
    if (p.ex != null && p.ex !== '') { if (ITEMS[p.ex] && p.t === 'extraktor') q.ex = p.ex; else badI++; }
    if (p.ga != null && p.t === 'tor') { const a = gateAuto(p.ga); if (a) q.ga = a; else badI++; }
    if (p.so != null && p.t === 'sortierer') { const s = sorterCfg(p.so); if (p.so.it && !s.it) badI++; q.so = s; }
    if (Array.isArray(p.bl) && p.t === 'bandbruecke' && num(p.bl[0]) && p.bl[0] >= 0 && p.bl[0] < 4 && num(p.bl[1]) && p.bl[1] >= 1 && p.bl[1] <= BELT_BRIDGE.range + 1) q.bl = [p.bl[0], p.bl[1]];
    map.set(i, parts.length);
    parts.push(q);
  });
  const pipes = [];
  let badP = 0;
  for (const p of Array.isArray(o.pipes) ? o.pipes : []) { if (Array.isArray(p) && num(p[0]) && num(p[1]) && PIPE_BY_TIER[p[2]]) pipes.push([p[0], p[1], p[2]]); else badP++; }
  const links = [];
  for (const L of Array.isArray(o.links) ? o.links : []) { if (Array.isArray(L) && map.has(L[0]) && map.has(L[1])) links.push([map.get(L[0]), map.get(L[1])]); }
  // Überlappende Teile sind ungültig: das spätere fällt weg
  const occ = new Set(), keep = [];
  parts.forEach((p, i) => {
    const d = BD[p.t], tiles = [];
    for (let dy = 0; dy < d.h; dy++) for (let dx = 0; dx < d.w; dx++) tiles.push((p.x + dx) + ',' + (p.y + dy));
    if (tiles.some(k => occ.has(k))) { badB++; return; }
    tiles.forEach(k => occ.add(k)); keep.push(i);
  });
  const re = new Map(keep.map((i, j) => [i, j]));
  const bp = normalize({ v: BP_VERSION, name: cleanName(o.name), parts: keep.map(i => parts[i]), pipes, links: links.filter(([a, b]) => re.has(a) && re.has(b)).map(([a, b]) => [re.get(a), re.get(b)]) });
  if (badB) notes.push(`${badB} unbekannte oder ungültige Gebäude ausgelassen`);
  if (badR) notes.push(`${badR} unbekannte Rezepte ausgelassen`);
  if (badI) notes.push(`${badI} unbekannte Waren ausgelassen`);
  if (badP) notes.push(`${badP} ungültige Rohre ausgelassen`);
  if (!bp.parts.length && !bp.pipes.length) return { bp: null, notes: notes.concat('Die Blaupause ist leer.') };
  return { bp, notes };
}
export const cleanName = (n) => String(n || '').replace(/\s+/g, ' ').trim().slice(0, BP_NAME_LEN);

/* ---------- Code (Base64 von UTF-8-JSON) ---------- */
export function encodeBlueprint(bp) {
  const bytes = new TextEncoder().encode(JSON.stringify(bp));
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
// → { bp, notes } wie parseBlueprint
export function decodeBlueprint(code) {
  try {
    const bin = atob(String(code).replace(/\s+/g, ''));
    const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
    return parseBlueprint(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (e) { return { bp: null, notes: ['Der Code ist unvollständig oder beschädigt.'] }; }
}

/* ---------- Drehen (90° im Uhrzeigersinn, rot-mal) ---------- */
export function rotateBlueprint(bp, rot) {
  let o = bp;
  for (let r = 0; r < ((rot % 4) + 4) % 4; r++) {
    const H = o.h;
    o = Object.assign({}, o, {
      w: o.h, h: o.w,
      parts: o.parts.map(p => { const s = BD[p.t].w, q = Object.assign({}, p, { x: H - p.y - s, y: p.x, d: BD[p.t].rot ? (p.d + 1) % 4 : 0 }); if (p.bl) q.bl = [(p.bl[0] + 1) % 4, p.bl[1]]; return q; }),
      pipes: o.pipes.map(([x, y, t]) => [H - y - 1, x, t])
    });
  }
  return o;
}

/* ---------- Kosten und Prüfung an einer Stelle ---------- */
export function blueprintCost(bp) {
  const c = {};
  const add = (cost) => { for (const r in cost || {}) c[r] = (c[r] || 0) + cost[r]; };
  for (const p of bp.parts) add(BD[p.t].cost);
  for (const p of bp.pipes) add(BD[PIPE_BY_TIER[p[2]]].cost);
  return c;
}
// Jedes Teil an (ox, oy) einzeln prüfen (ohne Kosten): { parts: [{ ok, reason }], pipes: [...], isl, n, total }
export function checkBlueprint(g, bp, ox, oy) {
  let isl = null, n = 0;
  const one = (t, x, y) => {
    const r = checkPlace(g, t, x, y, true);
    if (r.ok) { n++; if (isl == null) isl = r.isl; }
    return { ok: r.ok, reason: r.reason || null };
  };
  const parts = bp.parts.map(p => {
    const ex = bAt(g, ox + p.x, oy + p.y);
    if (ex && ex.t === p.t && ex.x === ox + p.x && ex.y === oy + p.y && (ex.d === p.d || !BD[p.t].rot)) return { ok: false, reason: 'Steht schon da.' };
    return one(p.t, ox + p.x, oy + p.y);
  });
  const pipes = bp.pipes.map(([x, y, tier]) => one(PIPE_BY_TIER[tier], ox + x, oy + y));
  return { parts, pipes, isl, n, total: bp.parts.length + bp.pipes.length };
}

/* ---------- Bauen (nur Simulation) ---------- */
// c = { bp, rot, x, y, name }. Gebäude zuerst, dann Bänder, dann Rohre; was nicht passt oder nicht mehr bezahlbar ist,
// wird übersprungen. Kabel der Blaupause werden danach verbunden, Masten und Gebäude ohne Kabel verbinden sich selbst.
export function placeBlueprint(g, c) {
  const { bp } = parseBlueprint(c.bp);
  if (!bp) { g.events.push({ type: 'fail', msg: 'Die Blaupause ist ungültig.' }); return; }
  const B = rotateBlueprint(bp, c.rot | 0), ox = Math.floor(c.x), oy = Math.floor(c.y);
  const order = B.parts.map((p, i) => i).sort((i, j) => (FLAT.has(B.parts[i].t) ? 1 : 0) - (FLAT.has(B.parts[j].t) ? 1 : 0) || i - j);
  const built = new Map(), why = {};
  const fail = (r) => { why[r] = (why[r] || 0) + 1; };
  for (const i of order) {
    const p = B.parts[i], x = ox + p.x, y = oy + p.y, ex = bAt(g, x, y);
    if (ex && ex.t === p.t && ex.x === x && ex.y === y && (ex.d === p.d || !BD[p.t].rot)) { fail('Steht schon da.'); continue; }
    const r = checkPlace(g, p.t, x, y);
    if (!r.ok) { fail(r.reason); continue; }
    built.set(i, placeBuilding(g, p.t, x, y, p.d, r.isl, { rc: p.rc, ex: p.ex, ga: p.ga, so: p.so, noLink: true, noBridge: true }));
  }
  // Brückenbänder verbinden (Ziel muss mitgebaut sein)
  const at = new Map();
  for (const [i, b] of built) at.set(b.x + ',' + b.y, b);
  for (const [i, b] of built) {
    const bl = B.parts[i].bl;
    if (!bl) continue;
    const T = at.get((b.x + DIRS[bl[0]][0] * bl[1]) + ',' + (b.y + DIRS[bl[0]][1] * bl[1]));
    if (T && T.t === 'bandbruecke') linkBridge(g, b, T);
  }
  let pn = 0;
  for (const [x, y, tier] of B.pipes) {
    const t = PIPE_BY_TIER[tier], r = checkPlace(g, t, ox + x, oy + y);
    if (!r.ok) { fail(r.reason); continue; }
    placePipe(g, t, ox + x, oy + y, r.isl); pn++;
  }
  for (const [i, j] of B.links) {
    const A = built.get(i), O = built.get(j);
    if (A && O && !canLink(A, O)) { link(g, A, O); logOp(g, { k: 'link', a: { x: A.x, y: A.y, t: A.t }, b: { x: O.x, y: O.y, t: O.t }, on: true }); }
  }
  const mine = [...built.values()];
  for (const b of mine) if (b.t === 'mast') autoLink(g, b);
  for (const b of mine) if (b.t !== 'mast' && isPowered(b.t) && !(b.links || []).length) autoLink(g, b);
  const reason = Object.keys(why).sort((a, b) => why[b] - why[a])[0] || null;
  g.events.push({ type: 'bpPlaced', built: built.size + pn, total: B.parts.length + B.pipes.length, reason, name: cleanName(c.name) });
}
