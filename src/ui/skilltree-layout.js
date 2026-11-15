/* =========================================================
   SKILLTREE-LAYOUT: Lage aller Knoten, aus den Daten berechnet (ohne DOM, deterministisch)
   Koordinaten in „Baum-Pixeln“ (Zoom 1), Wurzel bei (0, 0), y wächst nach unten.
     Wurzel „Grundlagen“ in der Mitte, links und rechts daneben die Start-Gebäude als Blätter, nach einer Lücke
     die Gebäude, die ein Volk oder die Geschichte freischaltet (data/unlocks.js, Blatt mit src).
     TECH_BRANCHES (data/tech.js): die ersten vier Äste wachsen nach oben, die übrigen nach unten,
     jeder beginnt mit einem Kategorie-Knoten. Innerhalb eines Astes eine aufgeräumte Baumanordnung:
       Elternknoten = Voraussetzung im selben Ast mit der größten Tiefe, sonst der Kategorie-Knoten,
       Tiefe = max(Stufe − 1, Tiefe des Elternknotens + 1), weiter außen = höhere Stufe.
       Jeder Teilbaum bekommt einen eigenen waagerechten Streifen (Breite = max(eigene Box, Summe der Kinder)),
       der Knoten steht in der Mitte seines Streifens. So können sich Knoten nicht überschneiden.
     An jedem Forschungs-Knoten hängen rechts daneben die Gebäude (und Rezepte), die er freischaltet.
     Optional überschreibt T.pos = [x, y] die Lage eines Forschungs-Knotens (seine Blätter wandern mit).
   Kanten: rechtwinklige Linienzüge. kind 'tree' (Eltern → Kind), 'leaf' (Knoten → Blätter),
   'cross' (weitere Voraussetzung, gestrichelt), 'bus' (Wurzel → Kategorie).
   ========================================================= */
import { TECH, TECH_BRANCHES, TECH_BY_ID, isUpgrade } from '../data/tech.js';
import { BD, BUILD_ORDER } from '../data/buildings.js';
import { RECIPES, recipeMain } from '../data/recipes.js';
import { srcOf } from '../data/unlocks.js';

export const SIZE = { root: 40, cat: 32, tech: 28, leaf: 18 };
const LEAF_STEP = 21, LEAF_COLS = 4;   // Abstand der Blätter, Blätter je Reihe
const LEVEL = 74;                      // Abstand zweier Stufen (senkrecht)
const SIB_GAP = 18, BRANCH_GAP = 44;   // Abstand zwischen Teilbäumen bzw. Ästen
const CAT_Y = 96, BUS_Y = 50;          // Lage der Kategorie-Knoten und der Sammelschiene (± von der Wurzel)
export const LABEL = { font: 9, char: 5.2, gap: 3 };   // Beschriftung unter/über den Forschungs-Knoten (geschätzte Breite je Zeichen)
export const labelWidth = (s) => Math.ceil(s.length * LABEL.char) + 6;

// Was eine Forschung freischaltet: Gebäude (BUILD_ORDER-Reihenfolge) und Rezepte mit tech
export function unlocksOf(id) {
  const out = BUILD_ORDER.filter(t => BD[t].tech === id).map(t => ({ kind: 'b', id: t }));
  for (const r of RECIPES) if (r.tech === id) out.push({ kind: 'r', id: r.id, item: recipeMain(r) });
  return out;
}
// Gebäude ohne Forschung (ohne fest platzierte wie das Kontor): Start-Gebäude und solche von Volk oder Story
export const baseBuildings = () => BUILD_ORDER.filter(t => !BD[t].tech && !BD[t].fixed);
export const startBuildings = () => baseBuildings().filter(t => srcOf(t).src === 'start');
export const specialBuildings = () => baseBuildings().filter(t => srcOf(t).src !== 'start');

export function buildLayout() {
  const nodes = [], edges = [], byId = new Map();
  const add = (n) => { nodes.push(n); byId.set(n.key, n); return n; };
  const root = add({ key: 'root', kind: 'root', x: 0, y: 0, size: SIZE.root });

  // Blätter der Wurzel: abwechselnd rechts und links in einer Reihe, erst die Start-Gebäude, nach einer Lücke Volk und Story
  const base = baseBuildings(), start = startBuildings(), half = SIZE.root / 2 + 14, k0 = Math.ceil(start.length / 2) + 0.5;
  start.forEach((t, i) => {
    const side = i % 2 ? -1 : 1, k = Math.floor(i / 2);
    add({ key: 'leaf:root:' + t, kind: 'leaf', leaf: { kind: 'b', id: t }, owner: 'root', x: side * (half + k * LEAF_STEP), y: 0, size: SIZE.leaf });
  });
  specialBuildings().forEach((t, i) => {
    const side = i % 2 ? -1 : 1, k = k0 + Math.floor(i / 2);
    add({ key: 'leaf:root:' + t, kind: 'leaf', leaf: { kind: 'b', id: t, src: srcOf(t).src }, owner: 'root', x: side * (half + k * LEAF_STEP), y: 0, size: SIZE.leaf });
  });
  const lx = base.length ? Math.max(...nodes.filter(n => n.owner === 'root').map(n => Math.abs(n.x))) : 0;
  if (base.length) {
    edges.push({ kind: 'leaf', from: 'root', to: 'root', pts: [[-lx, 0], [lx, 0]] });
  }

  // Elternknoten und Tiefe je Forschung (nach Stufe, dann Datenreihenfolge)
  const order = TECH.map((T, i) => ({ T, i })).sort((a, b) => a.T.stufe - b.T.stufe || a.i - b.i).map(o => o.T);
  const parent = {}, depth = {}, kids = {};
  for (const T of order) {
    let p = null;
    for (const r of T.req) { const R = TECH_BY_ID[r]; if (R && R.cat === T.cat && depth[r] != null && (!p || depth[r] > depth[p])) p = r; }
    parent[T.id] = p;
    depth[T.id] = Math.max(T.stufe - 1, (p ? depth[p] : 0) + 1);
    const pk = p || 'cat:' + T.cat;
    (kids[pk] || (kids[pk] = [])).push(T.id);
  }
  // Box einer Forschung relativ zur Knotenmitte: links/rechts (Knoten, Blätter rechts daneben, Beschriftung)
  const box = (id) => {
    const T = TECH_BY_ID[id], n = unlocksOf(id).length, cols = Math.min(LEAF_COLS, n), lw = labelWidth(T.name) / 2;
    const r = SIZE.tech / 2 + (n ? 6 + cols * LEAF_STEP - (LEAF_STEP - SIZE.leaf) : 0);
    return { l: -Math.max(SIZE.tech / 2, lw), r: Math.max(r, lw) };
  };
  const width = {};
  const measure = (k) => {
    const own = k.startsWith('cat:') ? { l: -SIZE.cat / 2 - 30, r: SIZE.cat / 2 + 30 } : box(k);
    let sum = 0;
    for (const c of kids[k] || []) sum += measure(c);
    if ((kids[k] || []).length > 1) sum += SIB_GAP * (kids[k].length - 1);
    width[k] = Math.max(own.r - own.l, sum);
    return width[k];
  };
  const place = (k, x0, dirY, catY) => {
    const own = k.startsWith('cat:') ? { l: -SIZE.cat / 2 - 30, r: SIZE.cat / 2 + 30 } : box(k), w = width[k];
    const cs = kids[k] || [];
    let sum = cs.reduce((a, c) => a + width[c], 0) + SIB_GAP * Math.max(0, cs.length - 1), cx = x0 + (w - sum) / 2;
    const start = nodes.length, cx0 = cx;
    const xs = cs.map(c => { const v = place(c, cx, dirY, catY); cx += width[c] + SIB_GAP; return v; });
    // Knoten mittig im Streifen (Box mittig, nicht der Knoten selbst)
    let x = Math.round(x0 + w / 2 - (own.l + own.r) / 2);
    // genau ein Kind: Kind-Teilbaum unter den Knoten schieben (soweit er im Streifen bleibt), damit die Linie gerade ist
    if (xs.length === 1 && xs[0] !== x) {
      const c = cs[0], d = Math.max(x0 - cx0, Math.min(x0 + w - (cx0 + width[c]), x - xs[0]));
      for (let i = start; i < nodes.length; i++) nodes[i].x += d;
      if (xs[0] + d + own.l >= x0 && xs[0] + d + own.r <= x0 + w) x = xs[0] + d;
    }
    if (k.startsWith('cat:')) return x;
    const T = TECH_BY_ID[k], pos = T.pos;
    if (pos) x = pos[0];
    const n = add({ key: k, kind: 'tech', tech: T, up: dirY < 0, depth: depth[k], parent: parent[k] || 'cat:' + T.cat,
      x: pos ? pos[0] : x, y: pos ? pos[1] : catY + dirY * depth[k] * LEVEL, size: SIZE.tech });
    // Blätter rechts neben dem Knoten; weitere Reihen wachsen vom Label weg (oben bei aufwärts, unten bei abwärts)
    unlocksOf(k).forEach((L, i) => {
      const col = i % LEAF_COLS, row = Math.floor(i / LEAF_COLS);
      add({ key: `leaf:${k}:${L.id}`, kind: 'leaf', leaf: L, owner: k, x: n.x + SIZE.tech / 2 + 6 + SIZE.leaf / 2 + col * LEAF_STEP, y: n.y + dirY * row * LEAF_STEP, size: SIZE.leaf });
    });
    return x;
  };

  // Äste: vier nach oben, der Rest nach unten, jeweils nebeneinander und um x = 0 zentriert
  const rows = [TECH_BRANCHES.slice(0, 4), TECH_BRANCHES.slice(4)];
  rows.forEach((row, ri) => {
    const dirY = ri ? 1 : -1, catY = dirY * CAT_Y;
    const ws = row.map(B => measure('cat:' + B.id));
    let x0 = -(ws.reduce((a, b) => a + b, 0) + BRANCH_GAP * (row.length - 1)) / 2;
    row.forEach((B, bi) => {
      const cx = place('cat:' + B.id, x0, dirY, catY);
      add({ key: 'cat:' + B.id, kind: 'cat', branch: B, up: dirY < 0, x: cx, y: catY, size: SIZE.cat, span: [x0, x0 + ws[bi]] });
      x0 += ws[bi] + BRANCH_GAP;
    });
    // Sammelschiene von der Wurzel zu den Kategorie-Knoten
    const cats = row.map(B => byId.get('cat:' + B.id)), by = dirY * BUS_Y;
    edges.push({ kind: 'bus', from: 'root', to: null, pts: [[0, dirY * SIZE.root / 2], [0, by]] });
    edges.push({ kind: 'bus', from: 'root', to: null, pts: [[Math.min(0, ...cats.map(c => c.x)), by], [Math.max(0, ...cats.map(c => c.x)), by]] });
    for (const c of cats) edges.push({ kind: 'bus', from: 'root', to: c.key, pts: [[c.x, by], [c.x, c.y - dirY * SIZE.cat / 2]] });
  });

  // Kanten Eltern → Kinder: kurz hinter dem Elternknoten eine Schiene, von dort senkrecht zu jedem Kind
  for (const n of nodes) {
    if (n.kind !== 'tech') continue;
    const p = byId.get(n.parent), d = n.up ? -1 : 1;
    const by = p.y + d * (p.size / 2 + 14);
    edges.push({ kind: 'tree', from: p.key, to: n.key, pts: [[p.x, p.y + d * p.size / 2], [p.x, by], [n.x, by], [n.x, n.y - d * n.size / 2]] });
    // Blätter: waagerecht vom Knoten, bei mehreren Reihen mit kurzer senkrechter Schiene
    const leaves = nodes.filter(o => o.owner === n.key);
    if (leaves.length) {
      const sx = n.x + n.size / 2 + 3, ys = leaves.map(o => o.y);
      edges.push({ kind: 'leaf', from: n.key, to: n.key, pts: [[n.x + n.size / 2, n.y], [sx, n.y]] });
      if (Math.min(...ys) !== Math.max(...ys)) edges.push({ kind: 'leaf', from: n.key, to: n.key, pts: [[sx, Math.min(...ys)], [sx, Math.max(...ys)]] });
      for (const y of new Set(ys)) edges.push({ kind: 'leaf', from: n.key, to: n.key, pts: [[sx, y], [Math.max(...leaves.filter(o => o.y === y).map(o => o.x)), y]] });
    }
    // weitere Voraussetzungen (anderer Ast oder nicht der Elternknoten): gestrichelt
    for (const r of n.tech.req) {
      if (r === n.parent || !byId.has(r)) continue;
      const q = byId.get(r), my = Math.round((n.y + q.y) / 2);
      edges.push({ kind: 'cross', from: q.key, to: n.key, pts: [[q.x, q.y], [q.x, my], [n.x, my], [n.x, n.y]] });
    }
  }
  // Ausdehnung
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) { x0 = Math.min(x0, n.x - n.size / 2); x1 = Math.max(x1, n.x + n.size / 2); y0 = Math.min(y0, n.y - n.size / 2 - 14); y1 = Math.max(y1, n.y + n.size / 2 + 14); }
  return { nodes, edges, byId, bounds: { x0, y0, x1, y1 } };
}

// Prüfung (Tests, README): Paare von Knoten, deren Rechtecke sich überschneiden (mit Mindestabstand gap)
export function overlaps(L, gap = 2) {
  const out = [], ns = L.nodes;
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
    const a = ns[i], b = ns[j], d = (a.size + b.size) / 2 + gap;
    if (Math.abs(a.x - b.x) < d && Math.abs(a.y - b.y) < d) out.push([a.key, b.key]);
  }
  return out;
}
export { isUpgrade };
