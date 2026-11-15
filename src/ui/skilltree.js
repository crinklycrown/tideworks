/* =========================================================
   FENSTER „FORSCHUNG“ (T): Skilltree
   Großes Fenster (92 % × 92 %) mit eigener Kopfzeile, rechts eine einklappbare Detailspalte,
   in der Mitte ein eigenes Canvas mit dem Baum (Layout: ui/skilltree-layout.js).
   Zeichnen: Die Grundebene (Hintergrund, Linien, Knoten) liegt in einem Zwischenbild und wird nur neu
   gezeichnet, wenn sich etwas ändert (Ziehen, Zoom, Größe, Forschung/Lager im Snapshot). Darüber kommen
   je Bild nur Pulsieren (gedrosselt), Hover-Pfad, Auswahl und die Gold-Animation nach dem Erforschen.
   Alles wird in Geräte-Pixeln auf ganze Pixel gerundet gezeichnet, Sprites ohne Glättung: scharf bei jedem Zoom und DPR.
   Ansicht (Mitte, Zoomstufe, Detailspalte) steht in game.state.ui.tree und wird mitgespeichert.
   ========================================================= */
import { BD } from '../data/buildings.js';
import { ITEMS } from '../data/items.js';
import { TECH, TECH_BY_ID, TECH_BRANCHES, TECH_CATS, TECH_PLANNED, techName, isUpgrade } from '../data/tech.js';
import { RECIPE_BY_ID } from '../data/recipes.js';
import { FAME_TECH } from '../data/mining.js';
import { img, fitScale } from '../gfx/pixelbuffer.js';
import { SPR, bIcon } from '../gfx/sprites.js';
import { fmt, esc } from '../util/format.js';
import { totalRes, isUnlocked, planOk, actOk } from '../sim/state.js';
import { lockReason, planText, srcOf, NPCS } from '../data/unlocks.js';
import { canResearch, reqMet } from '../sim/research.js';
import { effectLines, descOf } from '../sim/mods.js';
import { game, ui, send } from './context.js';
import { setHTML, costText } from './common.js';
import { registerWindow, closeWindow } from './windows.js';
import { showTipAt, hideTooltip } from './tooltip.js';
import { buildLayout, unlocksOf, LABEL, SIZE } from './skilltree-layout.js';

export const ZOOMS = [0.6, 0.8, 1, 1.4, 2];
const PULSE_MS = 100, ANIM_MS = 900;
const COL = {
  bg: '#140f0a', glow: '232,180,92', gold: '#e8b45c', goldHi: '#ffe39a', avail: '#efe2c2', lock: '#4b4136',
  fillDone: '#2c2014', fill: '#1d1610', fillLock: '#15110d', lineAvail: '#8f7d5c', lineLock: '#3f372e', bus: '#b38a48',
  label: '#f0d690', labelAvail: '#e6dbc2', labelLock: '#857761', green: '#6fd04a'
};

let L = null;                       // Layout (einmalig)
const S = {
  wrap: null, view: null, cv: null, ctx: null, base: null, bctx: null, detail: null,
  cw: 0, ch: 0, dpr: 1, baseDirty: true, sig: '', hover: null, sel: null,
  anims: [], prevTech: null, raf: 0, pulse: 0, pointers: new Map(), drag: null, pinch: null, mouse: null
};

/* ---------- Zustände ---------- */
const V = () => game.state.ui.tree;
const zoom = () => ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, V().z | 0))];
const done = (T) => !!game.state.tech[T.id];
const missingReq = (T) => T.req.filter(r => !TECH_BY_ID[r]);
// 'done' | 'avail' | 'lock'
const stateOf = (T) => done(T) ? 'done' : reqMet(game, T) && !missingReq(T).length ? 'avail' : 'lock';
function nodeState(n) {
  if (n.kind === 'root' || n.kind === 'cat') return 'done';
  if (n.kind === 'tech') return stateOf(n.tech);
  return n.owner === 'root' ? (isUnlocked(game, n.leaf.id) ? 'done' : 'lock') : stateOf(TECH_BY_ID[n.owner]);   // Wurzel: Start, Volk oder Story
}

/* ---------- Symbole ---------- */
function iconSpec(T) {
  if (T.icon) {
    const [k, v] = T.icon.split(':');
    if (k === 'b' && BD[v]) return bIcon(v);
    if (k === 'i' && SPR.item[v]) return SPR.item[v];
    if (k === 'icon' && SPR.icon[v]) return SPR.icon[v];
    if (k === 'ship') return SPR.ship;
  }
  const u = unlocksOf(T.id)[0];
  return u ? (u.kind === 'b' ? bIcon(u.id) : SPR.item[u.item]) : SPR.icon.flask;
}
function spriteOf(n) {
  if (n.kind === 'root') return SPR.icon.book;
  if (n.kind === 'cat') return SPR.icon[n.branch.icon] || SPR.icon.flask;
  if (n.kind === 'tech') return iconSpec(n.tech);
  return n.leaf.kind === 'b' ? bIcon(n.leaf.id) : SPR.item[n.leaf.item];
}
// Entsättigte, abgedunkelte Fassung eines Sprites (gesperrte Knoten), einmal je Sprite
const GREY = new WeakMap();
function greyOf(sp) {
  let c = GREY.get(sp);
  if (c) return c;
  c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h;
  const g = c.getContext('2d');
  g.drawImage(sp.cv, 0, 0);
  const d = g.getImageData(0, 0, sp.w, sp.h);
  for (let i = 0; i < d.data.length; i += 4) { const l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) * 0.55 + 34; d.data[i] = l; d.data[i + 1] = l * 0.96; d.data[i + 2] = l * 0.9; }
  g.putImageData(d, 0, 0);
  GREY.set(sp, c);
  return c;
}

/* ---------- Koordinaten ---------- */
// Baum → Geräte-Pixel (ganzzahlig)
function T2D(x, y) { const s = zoom() * S.dpr, v = V(); return [Math.round((x - v.x) * s + S.cw / 2), Math.round((y - v.y) * s + S.ch / 2)]; }
// Bildschirm (CSS-Pixel relativ zum Canvas) → Baum
function C2T(cx, cy) { const z = zoom(), v = V(); return [(cx - S.cw / S.dpr / 2) / z + v.x, (cy - S.ch / S.dpr / 2) / z + v.y]; }
function hitNode(cx, cy) {
  const [x, y] = C2T(cx, cy), z = zoom();
  let best = null;
  for (const n of L.nodes) { const r = n.size / 2 + 2 / z; if (Math.abs(x - n.x) <= r && Math.abs(y - n.y) <= r && (!best || n.size < best.size)) best = n; }
  return best;
}

/* ---------- Zeichnen ---------- */
const px = (v) => Math.max(1, Math.round(v));
function segs(g, pts, w, col, dash) {
  g.fillStyle = col;
  const h = Math.floor(w / 2);
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = T2D(pts[i][0], pts[i][1]), [bx, by] = T2D(pts[i + 1][0], pts[i + 1][1]);
    const x0 = Math.min(ax, bx), y0 = Math.min(ay, by), len = Math.max(Math.abs(bx - ax), Math.abs(by - ay)), horiz = ay === by;
    if (!dash) { g.fillRect(horiz ? x0 - h : ax - h, horiz ? ay - h : y0 - h, horiz ? len + w : w, horiz ? w : len + w); continue; }
    for (let t = 0; t < len; t += dash[0] + dash[1]) {
      const l = Math.min(dash[0], len - t);
      if (horiz) g.fillRect(x0 + t, ay - h, l, w); else g.fillRect(ax - h, y0 + t, w, l);
    }
  }
}
function edgeStyle(e) {
  const s = zoom() * S.dpr;
  if (e.kind === 'bus') return { w: px(2 * s), col: COL.bus };
  const to = L.byId.get(e.to), st = to ? nodeState(to) : 'done';
  if (e.kind === 'leaf') return { w: px(1 * s), col: st === 'done' ? COL.gold : st === 'avail' ? COL.lineAvail : COL.lineLock };
  if (e.kind === 'cross') return { w: px(1 * s), col: 'rgba(232,180,92,0.16)', dash: [px(4 * s), px(3 * s)] };
  return { w: px(2 * s), col: st === 'done' ? COL.gold : st === 'avail' ? COL.lineAvail : COL.lineLock };
}
function drawIcon(g, sp, cx, cy, inner, grey) {
  if (!sp) return;
  let k = inner / Math.max(sp.w, sp.h);
  if (k >= 1) k = Math.floor(k);
  const dw = Math.max(1, Math.round(sp.w * k)), dh = Math.max(1, Math.round(sp.h * k));
  g.drawImage(grey ? greyOf(sp) : sp.cv, Math.round(cx - dw / 2), Math.round(cy - dh / 2), dw, dh);
}
function drawSprite(g, sp, x, y, k) { g.drawImage(sp.cv, x, y, sp.w * k, sp.h * k); }
function drawNode(g, n) {
  const s = zoom() * S.dpr, [cx, cy] = T2D(n.x, n.y), half = Math.round(n.size * s / 2), st = nodeState(n);
  const bw = px((n.kind === 'leaf' ? 1 : 2) * s), x0 = cx - half, y0 = cy - half, W = 2 * half;
  // leichtes Leuchten erforschter Forschungen
  if (n.kind !== 'leaf' && st === 'done') {
    const gl = px(3 * s);
    g.fillStyle = `rgba(${COL.glow},0.13)`; g.fillRect(x0 - 2 * gl, y0 - 2 * gl, W + 4 * gl, W + 4 * gl);
    g.fillStyle = `rgba(${COL.glow},0.22)`; g.fillRect(x0 - gl, y0 - gl, W + 2 * gl, W + 2 * gl);
  }
  g.fillStyle = st === 'done' ? (n.kind === 'cat' || n.kind === 'root' ? '#a9783a' : COL.gold) : st === 'avail' ? COL.avail : COL.lock;
  g.fillRect(x0, y0, W, W);
  g.fillStyle = st === 'done' ? COL.fillDone : st === 'avail' ? COL.fill : COL.fillLock;
  g.fillRect(x0 + bw, y0 + bw, W - 2 * bw, W - 2 * bw);
  if (n.kind === 'cat' || n.kind === 'root') {   // doppelter Rahmen
    g.fillStyle = 'rgba(232,180,92,0.55)'; const i = bw + px(s);
    g.fillRect(x0 + i, y0 + i, W - 2 * i, px(s)); g.fillRect(x0 + i, y0 + W - i - px(s), W - 2 * i, px(s));
    g.fillRect(x0 + i, y0 + i, px(s), W - 2 * i); g.fillRect(x0 + W - i - px(s), y0 + i, px(s), W - 2 * i);
  }
  const pad = px((n.kind === 'leaf' ? 1.5 : 4) * s);
  drawIcon(g, spriteOf(n), cx, cy, W - 2 * bw - 2 * pad, st === 'lock');
  if (st === 'lock') { g.fillStyle = 'rgba(10,8,6,0.22)'; g.fillRect(x0 + bw, y0 + bw, W - 2 * bw, W - 2 * bw); }
  if (n.kind !== 'tech') return;
  const k = Math.max(1, Math.round(s * 0.8));
  if (isUpgrade(n.tech)) drawSprite(g, SPR.icon.up, x0 - Math.round(2 * k), y0 - Math.round(2 * k), k);
  if (st === 'lock') drawSprite(g, SPR.icon.lock, x0 + W - SPR.icon.lock.w * k + Math.round(2 * k), y0 + W - SPR.icon.lock.h * k + Math.round(2 * k), k);
  // bezahlbar: kleiner grüner Punkt
  if (st === 'avail' && canResearch(game, n.tech)) {
    const d = px(5 * s), o = px(s);
    g.fillStyle = '#1a3a0c'; g.fillRect(x0 + W - d + o, y0 - o - o, d + o, d + o);
    g.fillStyle = COL.green; g.fillRect(x0 + W - d + o + o, y0 - o, d - o, d - o);
  }
}
function drawLabel(g, n) {
  const s = zoom() * S.dpr;
  if (zoom() < 0.8) return;
  let text = '', col = COL.label, below = true;
  if (n.kind === 'tech') { text = n.tech.name; const st = nodeState(n); col = st === 'done' ? COL.label : st === 'avail' ? COL.labelAvail : COL.labelLock; below = n.up; }
  else if (n.kind === 'cat') { text = n.branch.name; below = n.up; }
  else if (n.kind === 'root') text = 'Grundlagen';
  else return;
  const fs = Math.round((n.kind === 'tech' ? LABEL.font : 11) * s);
  g.font = `600 ${fs}px "Pixelify Sans", monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const [cx, cy] = T2D(n.x, n.y), half = Math.round(n.size * s / 2), gap = Math.round(LABEL.gap * s);
  const y = below ? cy + half + gap + Math.round(fs * 0.6) : cy - half - gap - Math.round(fs * 0.6);
  const w = Math.ceil(g.measureText(text).width) + px(4 * s);
  g.fillStyle = 'rgba(20,15,10,0.82)'; g.fillRect(Math.round(cx - w / 2), Math.round(y - fs * 0.62), w, Math.round(fs * 1.24));
  g.fillStyle = col; g.fillText(text, cx, y + Math.round(fs * 0.06));
}
function drawBase() {
  const g = S.bctx, s = zoom() * S.dpr;
  g.imageSmoothingEnabled = false;
  g.fillStyle = COL.bg; g.fillRect(0, 0, S.cw, S.ch);
  // weiches goldenes Leuchten um die Wurzel
  const [rx, ry] = T2D(0, 0), R = Math.max(S.cw, S.ch) * 0.25 + 260 * s;
  const gr = g.createRadialGradient(rx, ry, 0, rx, ry, R);
  gr.addColorStop(0, `rgba(${COL.glow},0.30)`); gr.addColorStop(0.35, `rgba(${COL.glow},0.12)`); gr.addColorStop(1, `rgba(${COL.glow},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, S.cw, S.ch);
  for (const e of L.edges) { if (e.kind === 'cross') { const st = edgeStyle(e); segs(g, e.pts, st.w, st.col, st.dash); } }
  for (const e of L.edges) { if (e.kind !== 'cross') { const st = edgeStyle(e); segs(g, e.pts, st.w, st.col, st.dash); } }
  for (const n of L.nodes) if (visible(n)) drawNode(g, n);
  for (const n of L.nodes) if (visible(n)) drawLabel(g, n);
  S.baseDirty = false;
}
function visible(n) {
  const [x, y] = T2D(n.x, n.y), m = 120 * zoom() * S.dpr;
  return x > -m && y > -m && x < S.cw + m && y < S.ch + m;
}
// Pfad aller Voraussetzungen eines Knotens (Schlüssel inkl. Kategorie-Knoten und Wurzel)
function pathOf(n) {
  const set = new Set();
  if (!n) return set;
  const addT = (id) => {
    if (set.has(id) || !L.byId.has(id)) return;
    set.add(id);
    const m = L.byId.get(id);
    let p = m.parent;
    while (p && !set.has(p)) { set.add(p); const q = L.byId.get(p); p = q && q.kind === 'tech' ? q.parent : null; }
    TECH_BY_ID[id].req.forEach(addT);
  };
  if (n.kind === 'tech') addT(n.key);
  else if (n.kind === 'leaf' && n.owner !== 'root') addT(n.owner);
  for (const k of [...set]) if (k.startsWith('cat:')) set.add('root');
  return set;
}
function drawOverlay(now) {
  const g = S.ctx, s = zoom() * S.dpr;
  g.imageSmoothingEnabled = false;
  g.drawImage(S.base, 0, 0);
  // sanftes Pulsieren verfügbarer Forschungen (gedrosselt auf PULSE_MS)
  const ph = 0.5 + 0.5 * Math.sin(Math.floor(now / PULSE_MS) * PULSE_MS / 1000 * 3.2);
  for (const n of L.nodes) {
    if (n.kind !== 'tech' || nodeState(n) !== 'avail' || !visible(n)) continue;
    const [cx, cy] = T2D(n.x, n.y), half = Math.round(n.size * s / 2), o = px((2 + ph * 2) * s), w = px(s);
    g.fillStyle = `rgba(239,226,194,${0.15 + 0.35 * ph})`;
    ring(g, cx - half - o, cy - half - o, 2 * (half + o), w);
  }
  // Hover: Pfad der Voraussetzungen hervorheben
  const path = pathOf(S.hover);
  if (path.size) {
    for (const e of L.edges) {
      if (!path.has(e.to) || !path.has(e.from)) continue;
      segs(g, e.pts, px((e.kind === 'cross' ? 1.5 : 2.5) * s), COL.goldHi, e.kind === 'cross' ? [px(4 * s), px(3 * s)] : null);
    }
    for (const k of path) { const n = L.byId.get(k); if (n) { drawNode(g, n); hl(g, n, COL.goldHi); } }
  }
  if (S.hover) hl(g, S.hover, '#ffffff');
  if (S.sel && L.byId.has(S.sel)) corners(g, L.byId.get(S.sel));
  // Gold-Animation nach dem Erforschen
  S.anims = S.anims.filter(a => now - a.t0 < ANIM_MS);
  for (const a of S.anims) {
    const n = L.byId.get(a.key);
    if (!n) continue;
    const f = (now - a.t0) / ANIM_MS, [cx, cy] = T2D(n.x, n.y), half = Math.round(n.size * s / 2), o = Math.round(f * 18 * s);
    g.fillStyle = `rgba(255,214,110,${1 - f})`;
    ring(g, cx - half - o, cy - half - o, 2 * (half + o), px(2 * s));
    for (let i = 0; i < 8; i++) {
      const an = i * Math.PI / 4 + f, r = half + f * 26 * s;
      g.fillRect(Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), px(2 * s), px(2 * s));
    }
  }
}
function ring(g, x, y, w, t) { g.fillRect(x, y, w, t); g.fillRect(x, y + w - t, w, t); g.fillRect(x, y, t, w); g.fillRect(x + w - t, y, t, w); }
function hl(g, n, col) {
  const s = zoom() * S.dpr, [cx, cy] = T2D(n.x, n.y), half = Math.round(n.size * s / 2), o = px(2 * s);
  g.fillStyle = col; ring(g, cx - half - o, cy - half - o, 2 * (half + o), px(s));
}
function corners(g, n) {
  const s = zoom() * S.dpr, [cx, cy] = T2D(n.x, n.y), half = Math.round(n.size * s / 2) + px(4 * s), l = px(6 * s), t = px(2 * s);
  g.fillStyle = '#fff6d8';
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx < 0 ? cx - half : cx + half - t, y = sy < 0 ? cy - half : cy + half - t;
    g.fillRect(sx < 0 ? x : x - l + t, y, l, t); g.fillRect(x, sy < 0 ? y : y - l + t, t, l);
  }
}
function frame() {
  S.raf = 0;
  if (ui.win !== 'tech' || !S.cv || !S.cw) return;
  if (S.baseDirty) drawBase();
  const now = performance.now();
  drawOverlay(now);
  if (S.anims.length) request();
}
function request() { if (!S.raf) S.raf = requestAnimationFrame(frame); }
function invalidate() { S.baseDirty = true; request(); }

/* ---------- Ansicht: Ziehen, Zoom, Zentrieren ---------- */
function resize() {
  if (!S.view) return;
  const r = S.view.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const cw = Math.max(1, Math.round(r.width * dpr)), ch = Math.max(1, Math.round(r.height * dpr));
  if (cw === S.cw && ch === S.ch && dpr === S.dpr) return;
  S.cw = cw; S.ch = ch; S.dpr = dpr;
  for (const c of [S.cv, S.base]) { c.width = cw; c.height = ch; }
  S.cv.style.width = `${r.width}px`; S.cv.style.height = `${r.height}px`;
  invalidate();
}
// Zoomstufe ändern, der Baum-Punkt unter (cx, cy) (CSS-Pixel im Canvas) bleibt stehen
function zoomTo(z, cx, cy) {
  const v = V(), nz = Math.max(0, Math.min(ZOOMS.length - 1, z));
  if (nz === v.z) return;
  const [tx, ty] = C2T(cx, cy);
  v.z = nz;
  const [ux, uy] = C2T(cx, cy);
  v.x += tx - ux; v.y += ty - uy;
  invalidate();
}
function centerOn(x, y) { const v = V(); v.x = Math.round(x); v.y = Math.round(y); invalidate(); }
// Ganzer Baum: Mitte der Ausdehnung, größte Zoomstufe, bei der alles passt (mindestens die kleinste)
function centerAll() {
  const b = L.bounds, w = S.cw / S.dpr, h = S.ch / S.dpr;
  let z = 0;
  for (let i = ZOOMS.length - 1; i >= 0; i--) if ((b.x1 - b.x0) * ZOOMS[i] <= w - 30 && (b.y1 - b.y0) * ZOOMS[i] <= h - 30) { z = i; break; }
  V().z = z;
  centerOn((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
}
function centerBranch(id) {
  const ns = L.nodes.filter(n => n.key === 'cat:' + id || (n.kind === 'tech' && n.tech.cat === id) || (n.kind === 'leaf' && n.owner !== 'root' && TECH_BY_ID[n.owner].cat === id));
  const xs = ns.map(n => n.x), ys = ns.map(n => n.y);
  centerOn((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
}
function select(key, jump) {
  S.sel = key;
  if (jump) { const n = L.byId.get(key); if (n) centerOn(n.x, n.y); }
  V().detail = true;
  renderHead(); renderDetail(); request();
}

/* ---------- Tooltips ---------- */
// Quelle eines Blatts an der Wurzel: „Brann (Ruf: freundlich)“, „Geschichte (Akt 2)“
const srcLabel = (t) => { const S = srcOf(t); return S.src === 'npc' ? `${NPCS[S.npc].name} (Ruf: ${S.lvl})` : S.src === 'story' ? `Geschichte${S.hint ? ` (${S.hint})` : ''}` : ''; };
const stateText = { done: '<span class="good">Erforscht</span>', avail: 'Verfügbar', lock: '<span class="bad">Gesperrt</span>' };
function costHTML(res, isDone, coins) {
  return Object.entries(res).map(([r, n]) => {
    const have = totalRes(game, r), miss = !isDone && have < n;
    return `<span class="cost${miss ? ' no' : ''}" title="${ITEMS[r].name}">${img(SPR.item[r], 1)}${isDone ? n : `${fmt(Math.min(Math.floor(have), 99999))}/${n}`}</span>`;
  }).join('') + (coins ? `<span class="cost${!isDone && (game.state.coins | 0) < coins ? ' no' : ''}" title="Münzen">${img(SPR.icon.coin, 1)}${isDone ? fmt(coins) : `${fmt(Math.min(game.state.coins | 0, 999999))}/${fmt(coins)}`}</span>` : '');
}
function reqText(T) {
  const l = T.req.map(r => TECH_BY_ID[r] ? `${TECH_BY_ID[r].name}${game.state.tech[r] ? '' : ' (offen)'}` : `${techName(r)} (${TECH_PLANNED[r] ? TECH_PLANNED[r].note : 'fehlt'})`);
  if (T.plan && !planOk(game, T)) l.push(`${planText(T)} (${lockReason('plan:' + T.plan).replace(/\.$/, '')})`);
  if (!actOk(game, T)) l.push(`Akt ${T.act} der Geschichte`);
  return l.join(', ');
}
// Voraussetzung anzeigen: Forschungen, ein noch fehlender Plan oder ein späterer Akt
const hasReq = (T) => T.req.length || (T.plan && !planOk(game, T)) || !actOk(game, T);
function unlockText(T) {
  if (isUpgrade(T)) return effectLines(T.effect).join(' &middot; ');
  return unlocksOf(T.id).map(u => u.kind === 'b' ? BD[u.id].name : `Rezept ${RECIPE_BY_ID[u.id].name || ITEMS[u.item].name}`).join(', ');
}
function tipHTML(n) {
  if (n.kind === 'root') return `<div class="tt-h"><span>Grundlagen</span></div><div class="xs">Immer erforscht. Daran hängen die Start-Gebäude, weiter außen die Gebäude, die Völker und die Geschichte freischalten. Von hier gehen die Äste je Kategorie ab.</div>`;
  if (n.kind === 'cat') {
    const ts = TECH.filter(T => T.cat === n.branch.id), d = ts.filter(done).length;
    return `<div class="tt-h"><span>${n.branch.name}</span><span class="xs muted">${d} / ${ts.length}</span></div>`
      + `<div class="xs">${ts.length ? 'Ast mit allen Forschungen und Upgrades dieser Kategorie. Weiter außen liegen höhere Stufen.' : 'Noch keine Forschungen &ndash; sie folgen mit der Flüssigkeits-Technik.'}</div>`;
  }
  if (n.kind === 'leaf') {
    if (n.leaf.kind === 'r') { const R = RECIPE_BY_ID[n.leaf.id]; return `<div class="tt-h"><span>Rezept: ${R.name || ITEMS[n.leaf.item].name}</span></div><div class="xs">${BD[R.b].name}</div>`; }
    const d = BD[n.leaf.id];
    return `<div class="tt-h"><span>${d.name}</span><span class="xs muted">${d.w}&times;${d.h}</span></div>`
      + (d.cost ? `<div class="tt-c">${costText(d.cost, -1)}</div>` : '') + `<div class="xs">${descOf(game, n.leaf.id)}</div>`
      + (n.leaf.src ? `<div class="xs ${isUnlocked(game, n.leaf.id) ? 'muted' : 'bad'}" style="margin-top:3px">${isUnlocked(game, n.leaf.id) ? `Freigeschaltet &middot; ${srcLabel(n.leaf.id)}` : `${img(SPR.icon.lock, 1)} ${lockReason(n.leaf.id)}`}</div>` : '');
  }
  const T = n.tech, st = stateOf(T), un = unlockText(T);
  return `<div class="tt-h"><span>${T.name}</span><span class="xs muted">${isUpgrade(T) ? 'Upgrade' : 'Forschung'} &middot; Stufe ${T.stufe}</span></div>`
    + `<div class="xs">${T.desc}</div>`
    + (st === 'done' ? '' : `<div class="tt-c">${costHTML(T.res, false, T.coins)}</div>`)
    + (hasReq(T) ? `<div class="xs ${st === 'lock' ? 'bad' : 'muted'}">Voraussetzung: ${reqText(T)}</div>` : '')
    + (un ? `<div class="xs">${isUpgrade(T) ? 'Wirkung' : 'Schaltet frei'}: <b>${un}</b></div>` : '')
    + `<div class="xs" style="margin-top:3px">${stateText[st]}${st === 'avail' && canResearch(game, T) ? ' &middot; <span class="good">bezahlbar</span>' : ''}</div>`;
}
function updateTip() {
  if (!S.hover || !S.mouse) { hideTooltip(); return; }
  const r = S.cv.getBoundingClientRect(), [dx, dy] = T2D(S.hover.x, S.hover.y), half = S.hover.size * zoom() / 2;
  showTipAt(tipHTML(S.hover), r.left + dx / S.dpr, r.top + dy / S.dpr, half + 4);
}

/* ---------- Kopfzeile und Detailspalte ---------- */
function renderHead() {
  if (!S.wrap) return;
  const n = TECH.filter(done).length, v = V();
  setHTML(S.wrap.querySelector('.st-prog'), `erforscht <b>${n}</b> / ${TECH.length}`);
  const tb = S.wrap.querySelector('[data-st="detail"]');
  tb.classList.toggle('on', !!v.detail);
  S.detail.classList.toggle('hidden', !v.detail);
}
function detailHTML() {
  const n = S.sel ? L.byId.get(S.sel) : null;
  if (!n || n.kind !== 'tech') {
    return `<div class="pix st-dname">Forschung</div>
      <div class="xs muted" style="margin:4px 0 10px">Klicke auf eine Forschung im Baum. Kosten kommen aus den Kontoren aller Inseln: Skizzen liefern Hütten, Baupläne Bürgerhäuser.</div>
      <div class="lbl">Zustände</div>
      <div class="st-legend"><span class="st-sw done"></span>erforscht</div>
      <div class="st-legend"><span class="st-sw avail"></span>verfügbar <span class="st-dot"></span> bezahlbar</div>
      <div class="st-legend"><span class="st-sw lock"></span>gesperrt</div>
      <div class="st-legend">${img(SPR.icon.up, 2)}Upgrade: dauerhafte Wirkung statt neuem Gebäude</div>
      <div class="xs muted" style="margin-top:10px">Ziehen verschiebt den Baum, Mausrad oder zwei Finger zoomen. Hovern zeigt den Pfad aller Voraussetzungen.</div>`;
  }
  const T = n.tech, st = stateOf(T), sp = iconSpec(T), un = unlocksOf(T.id), can = canResearch(game, T), miss = missingReq(T);
  let h = `<div class="st-dhead"><span class="st-big">${img(sp, fitScale(sp, 52))}</span><div style="min-width:0"><div class="pix st-dname">${T.name}</div>
    <div class="xs muted">${TECH_CATS[T.cat]} &middot; Stufe ${T.stufe} &middot; ${isUpgrade(T) ? 'Upgrade' : 'Forschung'}</div></div></div>
    <div class="xs" style="margin:6px 0">${T.desc}</div><div class="xs">${stateText[st]}</div>`;
  if (st !== 'done') h += `<div class="lbl">Kosten</div><div class="xs tcost">${costHTML(T.res, false, T.coins)}</div>`;
  if (hasReq(T)) {
    h += `<div class="lbl">Voraussetzungen</div><div class="st-reqs">` + T.req.map(r => {
      const R = TECH_BY_ID[r];
      if (!R) return `<div class="xs bad">${img(SPR.icon.lock, 1)} ${techName(r)} &ndash; ${TECH_PLANNED[r] ? TECH_PLANNED[r].note : 'fehlt'}</div>`;
      return `<button class="st-req${game.state.tech[r] ? ' ok' : ''}" data-st="goto" data-id="${r}">${img(iconSpec(R), fitScale(iconSpec(R), 18))}<span>${R.name}</span>${game.state.tech[r] ? img(SPR.icon.check, 1) : img(SPR.icon.lock, 1)}</button>`;
    }).join('') + (T.plan && !planOk(game, T) ? `<div class="xs bad">${img(SPR.icon.lock, 1)} ${planText(T)} nötig &ndash; ${lockReason('plan:' + T.plan)}</div>` : '')
      + (!actOk(game, T) ? `<div class="xs bad">${img(SPR.icon.lock, 1)} Erst ab Akt ${T.act} der Geschichte</div>` : '') + '</div>';
  }
  if (isUpgrade(T)) h += `<div class="lbl">Wirkung</div>` + effectLines(T.effect).map(l => `<div class="xs st-eff">${img(SPR.icon.up, 1)} ${l}</div>`).join('');
  else if (un.length) {
    h += `<div class="lbl">Schaltet frei</div>` + un.map(u => {
      if (u.kind === 'r') { const R = RECIPE_BY_ID[u.id]; return `<div class="st-unl">${img(SPR.item[u.item], 2)}<div><b>Rezept: ${R.name || ITEMS[u.item].name}</b><div class="xs muted">${BD[R.b].name}</div></div></div>`; }
      const ic = bIcon(u.id);
      return `<div class="st-unl">${img(ic, fitScale(ic, 30))}<div><b>${BD[u.id].name}</b><div class="xs muted">${descOf(game, u.id)}</div></div></div>`;
    }).join('');
  }
  if (st !== 'done') {
    h += `<button class="btn btn-green btn-block st-go" data-st="research" data-id="${T.id}" ${can ? '' : 'disabled'}>Erforschen &middot; +${T.stufe * FAME_TECH} Ruhm</button>`;
    if (!can) h += `<div class="xs muted" style="margin-top:4px">${miss.length ? 'Die Voraussetzung gibt es noch nicht.' : st === 'lock' ? (T.req.every(r => game.state.tech[r]) ? `Erst den ${planText(T)} besorgen.` : 'Erst die Voraussetzungen erforschen.') : 'Es fehlen noch Waren oder Pläne.'}</div>`;
  }
  return h;
}
function renderDetail() { if (S.detail && V().detail) setHTML(S.detail, detailHTML()); }

/* ---------- Fenster ---------- */
function build(body) {
  if (!L) L = buildLayout();
  body.innerHTML = `<div class="st-wrap">
    <div class="st-head">
      <span class="st-title pix">${img(SPR.icon.flask, 2)}Forschung</span>
      <span class="st-prog xs"></span>
      <span class="st-quick">${TECH_BRANCHES.map(B => `<button class="st-qb" data-st="branch" data-b="${B.id}" title="${B.name}">${img(SPR.icon[B.icon], 2)}<span>${B.name}</span></button>`).join('')}</span>
      <span class="grow"></span>
      <button class="btn btn-paper btn-sm" data-st="center">Zentrieren</button>
      <button class="btn btn-paper btn-sm st-dt" data-st="detail" title="Detailspalte ein-/ausklappen">Details</button>
      <button class="xbtn" data-st="close" title="Schließen (Esc)">&times;</button>
    </div>
    <div class="st-main"><div class="st-view"><canvas class="st-cv px"></canvas></div><aside class="st-detail scroll"></aside></div>
  </div>`;
  S.wrap = body.firstElementChild; S.view = S.wrap.querySelector('.st-view'); S.cv = S.wrap.querySelector('.st-cv'); S.detail = S.wrap.querySelector('.st-detail');
  S.ctx = S.cv.getContext('2d'); S.base = document.createElement('canvas'); S.bctx = S.base.getContext('2d');
  S.cw = 0; S.ch = 0; S.sig = ''; S.prevTech = new Set(Object.keys(game.state.tech));
  wireCanvas();
  if (!S.ro) S.ro = new ResizeObserver(() => resize());
  S.ro.observe(S.view);
  resize();
  if (!V().init) { V().init = true; requestAnimationFrame(() => centerAll()); }   // beim ersten Öffnen: ganzer Baum
}
// Signatur der Daten, die den Baum verändern: Zustand und Bezahlbarkeit jeder Forschung
const signature = () => TECH.map(T => { const s = stateOf(T); return s === 'avail' ? (canResearch(game, T) ? 'a' : 'b') : s[0]; }).join('') + Object.keys(game.state.unl || {}).join(',');
function render(body) {
  if (!S.wrap || !body.contains(S.wrap)) build(body);
  // neu erforscht: kurze Gold-Animation (bei vielen auf einmal, z. B. Testmodus, nicht)
  const now = new Set(Object.keys(game.state.tech).filter(k => game.state.tech[k]));
  const fresh = [...now].filter(k => !S.prevTech.has(k) && L.byId.has(k));
  if (fresh.length && fresh.length <= 3) for (const k of fresh) S.anims.push({ key: k, t0: performance.now() });
  S.prevTech = now;
  const sig = signature();
  if (sig !== S.sig) { S.sig = sig; S.baseDirty = true; }
  renderHead(); renderDetail();
  if (S.hover) updateTip();
  request();
}
function wireCanvas() {
  const cv = S.cv, pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    S.pointers.set(e.pointerId, pos(e));
    if (S.pointers.size === 1) { const [x, y] = pos(e); S.drag = { x, y, vx: V().x, vy: V().y, moved: false }; S.pinch = null; }
    else if (S.pointers.size === 2) {
      const [a, b] = [...S.pointers.values()];
      S.pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: V().z }; S.drag = null;
    }
    e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    const p = pos(e);
    if (S.pointers.has(e.pointerId)) S.pointers.set(e.pointerId, p);
    if (S.pinch && S.pointers.size >= 2) {
      const [a, b] = [...S.pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const z = S.pinch.z + Math.round(Math.log(d / S.pinch.d) / Math.log(1.45));
      zoomTo(z, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      return;
    }
    if (S.drag) {
      const dx = p[0] - S.drag.x, dy = p[1] - S.drag.y;
      if (!S.drag.moved && Math.hypot(dx, dy) < 5) return;
      if (!S.drag.moved) { S.drag.moved = true; S.hover = null; hideTooltip(); cv.classList.add('grabbing'); }
      const v = V(), z = zoom();
      v.x = S.drag.vx - dx / z; v.y = S.drag.vy - dy / z;
      invalidate();
      return;
    }
    if (e.pointerType === 'touch') return;
    S.mouse = p;
    const n = hitNode(p[0], p[1]);
    if (n !== S.hover) { S.hover = n; cv.style.cursor = n && (n.kind === 'tech' || n.kind === 'cat' || n.kind === 'root') ? 'pointer' : ''; request(); }
    updateTip();
  });
  const up = (e) => {
    const d = S.drag, p = pos(e);
    S.pointers.delete(e.pointerId);
    if (S.pointers.size < 2) S.pinch = null;
    if (!S.pointers.size) { S.drag = null; cv.classList.remove('grabbing'); }
    if (e.type === 'pointerup' && d && !d.moved) {
      const n = hitNode(p[0], p[1]);
      if (n && n.kind === 'tech') select(n.key, false);
      else if (n && n.kind === 'cat') centerBranch(n.branch.id);
      else if (n && n.kind === 'root') centerAll();
      if (e.pointerType === 'touch' && n) { S.hover = n; S.mouse = p; updateTip(); setTimeout(() => { if (S.hover === n) { S.hover = null; hideTooltip(); request(); } }, 2500); }
    }
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { S.hover = null; S.mouse = null; hideTooltip(); request(); } });
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const [x, y] = pos(e);
    zoomTo(V().z + (e.deltaY < 0 ? 1 : -1), x, y);
    if (S.hover) updateTip();
  }, { passive: false });
}

registerWindow('tech', {
  title: 'Forschung', icon: 'flask', big: true,
  render,
  onOpen() { S.wrap = null; if (!S.timer) S.timer = setInterval(() => { if (ui.win === 'tech' && L && L.nodes.some(n => n.kind === 'tech' && nodeState(n) === 'avail')) request(); }, PULSE_MS); },
  onClose() { if (S.ro && S.view) S.ro.unobserve(S.view); S.wrap = null; S.view = null; S.cv = null; S.hover = null; clearInterval(S.timer); S.timer = 0; },
  wire(body) {
    body.addEventListener('click', e => {
      if (ui.win !== 'tech') return;
      ui.uiPressed = false;
      const a = e.target.closest('[data-st]');
      if (!a || a.disabled) return;
      switch (a.dataset.st) {
        case 'close': closeWindow(); return;
        case 'center': centerAll(); return;
        case 'detail': V().detail = !V().detail; renderHead(); renderDetail(); requestAnimationFrame(resize); return;
        case 'branch': centerBranch(a.dataset.b); return;
        case 'goto': select(a.dataset.id, true); return;
        case 'research': send({ type: 'research', id: a.dataset.id }); return;
      }
    });
  }
});

// Für Tests (Konsole): Layout und Ansicht
export const skilltreeDebug = () => ({ layout: L || (L = buildLayout()), view: Object.assign({}, V()), sel: S.sel, size: [S.cw, S.ch, S.dpr], SIZE,
  // Bildschirmposition (CSS-Pixel) eines Knotens, für Tests
  screenOf: (id) => { const n = L && L.byId.get(id), r = S.cv && S.cv.getBoundingClientRect(); if (!n || !r) return null; const [x, y] = T2D(n.x, n.y); return { x: r.left + x / S.dpr, y: r.top + y / S.dpr }; } });
