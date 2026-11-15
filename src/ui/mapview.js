/* =========================================================
   KARTENANSICHT (Taste M): großes Fenster mit der ganzen erkundeten Welt
   Inseln in den Farben ihres Typs (Berge dunkler, Lava orange), Meer blau, Nebel dunkel.
   Darüber: Kontore mit Flagge (und Namen), Handelskontore, Schiffe mit Fahrtrichtung, Handelsrouten als Linien
   mit nummerierten Stopps in der Farbe des Schiffs, Funde, das Kamera-Rechteck.
   Mausrad zoomt (ZOOMS, Pixel je Feld), Ziehen verschiebt, Klick springt mit der Kamera dorthin (und schließt),
   Klick auf ein Schiff wählt es aus. Filter (Routen, Schiffe, Funde, Inselnamen) in state.ui.mapF.
   Das Grundbild entsteht je Chunk (1 Pixel je Feld, gecacht nach Nebel-Version des Chunks), höchstens
   BUDGET Chunks je Bild, der Rest folgt in den nächsten Bildern.
   ========================================================= */
import { TS, FIND_CELL } from '../config.js';
import { CS, ck, ckx, cky, tkx as tkxOf, tky as tkyOf } from '../util/tiles.js';
import { flagOf, islName, kontorIslands } from '../sim/state.js';
import { foreignIslands, outlineIsland } from './common.js';
import { portById } from '../sim/kontor.js';
import { ISL_TYPES } from '../data/islands.js';
import { NPC_ISL } from '../data/npcs.js';
import { findsInCell, lootLeft } from '../world/finds.js';
import { G_WATER, G_MOUNT, G_LAVA, G_ROCK, G_ASH } from '../config.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR, flagSpr } from '../gfx/sprites.js';
import { cam, centerOnTile, followShip } from '../gfx/camera.js';
import { drawPeersMap } from '../gfx/peers.js';
import { game, ui } from './context.js';
import { registerWindow, closeWindow } from './windows.js';
import { selectShip } from './ships.js';

export const ZOOMS = [0.25, 0.5, 1, 2, 4];           // Pixel je Feld (CSS)
const BUDGET = 48;                                    // neue Chunk-Bilder je Bild
const FOG = '#1b2236', SEA = [52, 116, 184];
// Grundfarben je Inseltyp (Gras/Sand), daraus Berg, Fels, Asche und Lava abgeleitet
export const TYPE_COL = { normal: [111, 176, 70], sand: [230, 204, 143], vulkan: [150, 104, 84] };
const SHIP_COLS = ['#ffd23f', '#e0384f', '#5ac8fa', '#7cc24f', '#c77dff', '#ff8c42', '#3fd0b0', '#f6c79a'];
export const shipCol = (s) => SHIP_COLS[((s.n || 1) - 1) % SHIP_COLS.length];
const FILTERS = [['routes', 'Routen'], ['ships', 'Schiffe'], ['finds', 'Funde'], ['names', 'Inselnamen']];

const S = { wrap: null, cv: null, ctx: null, view: null, cw: 0, ch: 0, dpr: 1, ro: null, z: 2, cx: 0, cy: 0, drag: null, timer: 0, need: true, heading: new Map() };
const cache = new Map();   // Chunk-Schlüssel → { ver, cv }
const F = () => { const u = game.state.ui; return u.mapF || (u.mapF = { routes: true, ships: true, finds: true, names: true }); };
const zoom = () => ZOOMS[S.z];

/* ---------- Grundbild je Chunk ---------- */
function tileRGB(x, y) {
  const W = game.W, I = W.islandNear(x, y);
  if (!I) return SEA;
  const lx = x - I.x0, ly = y - I.y0;
  const gr = lx < 0 || ly < 0 || lx >= I.w || ly >= I.h ? G_WATER : I.ground[ly * I.w + lx];
  if (gr === G_WATER) return SEA;
  if (gr === G_LAVA) return [255, 122, 42];
  const c = TYPE_COL[I.type] || TYPE_COL.normal, f = gr === G_MOUNT ? 0.62 : gr === G_ROCK || gr === G_ASH ? 0.82 : 1;
  return [c[0] * f, c[1] * f, c[2] * f];
}
function chunkImage(key) {
  const ver = game.fog.chunkVer(key), e = cache.get(key);
  if (e && e.ver === ver && e.wv === game.worldVer) return e.cv;
  if (S.budget <= 0) { S.need = true; return e ? e.cv : null; }
  S.budget--;
  const cv = e ? e.cv : document.createElement('canvas');
  cv.width = CS; cv.height = CS;
  const c = cv.getContext('2d'), im = c.createImageData(CS, CS), D = im.data, x0 = ckx(key) * CS, y0 = cky(key) * CS;
  for (let y = 0; y < CS; y++) for (let x = 0; x < CS; x++) {
    const p = (y * CS + x) * 4;
    if (!game.fog.get(x0 + x, y0 + y)) { D[p + 3] = 0; continue; }
    const col = tileRGB(x0 + x, y0 + y);
    D[p] = col[0]; D[p + 1] = col[1]; D[p + 2] = col[2]; D[p + 3] = 255;
  }
  c.putImageData(im, 0, 0);
  cache.set(key, { ver, wv: game.worldVer, cv });
  return cv;
}

/* ---------- Zeichnen ---------- */
// Feld (x, y) → Canvas-Pixel
const toPx = (x, y) => [(x - S.cx) * zoom() * S.dpr + S.cw / 2, (y - S.cy) * zoom() * S.dpr + S.ch / 2];
const toTile = (px, py) => [(px * S.dpr - S.cw / 2) / (zoom() * S.dpr) + S.cx, (py * S.dpr - S.ch / 2) / (zoom() * S.dpr) + S.cy];
function draw() {
  S.need = false;
  if (!S.ctx || !game.state) return;
  const ctx = S.ctx, z = zoom() * S.dpr, f = F();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = FOG; ctx.fillRect(0, 0, S.cw, S.ch);
  // sichtbare, aufgedeckte Chunks
  const [tx0, ty0] = toTile(0, 0), [tx1, ty1] = toTile(S.cw / S.dpr, S.ch / S.dpr);
  S.budget = BUDGET;
  for (const key of game.fog.m.keys()) {
    const kx = ckx(key), ky = cky(key);
    if ((kx + 1) * CS < tx0 || kx * CS > tx1 || (ky + 1) * CS < ty0 || ky * CS > ty1) continue;
    const cv = chunkImage(key);
    if (!cv) continue;
    const [px, py] = toPx(kx * CS, ky * CS);
    ctx.drawImage(cv, Math.floor(px), Math.floor(py), Math.ceil(CS * z) + 1, Math.ceil(CS * z) + 1);
  }
  const big = Math.max(1, Math.round(S.dpr));
  // Funde
  if (f.finds) {
    const loot = game.state.loot;
    for (let cy = Math.floor(ty0 / FIND_CELL); cy <= Math.floor(ty1 / FIND_CELL); cy++) for (let cx = Math.floor(tx0 / FIND_CELL); cx <= Math.floor(tx1 / FIND_CELL); cx++) {
      if (!game.fog.coverage(ck(cx, cy))) continue;
      for (const fd of findsInCell(game.W, cx, cy)) {
        if (!game.fog.get(fd.x, fd.y) || !lootLeft(loot, fd)) continue;
        const [px, py] = toPx(fd.x + 0.5, fd.y + 0.5), r = (fd.kind === 'wreck' ? 3 : 2) * big;
        ctx.fillStyle = '#2a1a10'; ctx.fillRect(px - r - big, py - r - big, 2 * r + 2 * big, 2 * r + 2 * big);
        ctx.fillStyle = fd.kind === 'wreck' ? '#ff9a3a' : '#e6bf85'; ctx.fillRect(px - r, py - r, 2 * r, 2 * r);
      }
    }
  }
  // Handelsrouten: Linie Anleger → Anleger (geschlossen), Stopps nummeriert
  if (f.routes) for (const s of game.state.ships) {
    const R = s.route;
    if (!R || !R.stops.length) continue;
    const pts = R.stops.map(st => { const P = portById(game, st.kontor); return P ? dockXY(P) : null; });
    if (pts.some(p => !p)) continue;
    ctx.strokeStyle = shipCol(s); ctx.lineWidth = 2 * big; ctx.globalAlpha = R.paused ? 0.45 : 0.9;
    ctx.setLineDash(R.paused ? [6 * big, 4 * big] : []);
    ctx.beginPath();
    pts.forEach((p, i) => { const [px, py] = toPx(p[0], p[1]); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    if (pts.length > 2) ctx.closePath();
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    pts.forEach((p, i) => {
      const [px, py] = toPx(p[0], p[1]), r = 7 * big;
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(px, py, r + big, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shipCol(s); ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a1a10'; ctx.font = `700 ${10 * big}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), px, py + 0.5 * big);
    });
  }
  // Getrennte Inseln: Inseln der Mitspieler in ihrer Farbe umrandet
  for (const o of foreignIslands()) outlineIsland(ctx, o.I, o.color, toPx, z, 2 * big);
  // Kontore mit Flagge (und Namen), Handelskontore
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const b of game.blds.values()) {
    if (b.t !== 'kontor' && b.t !== 'kontoralt' && b.t !== 'handelskontor') continue;
    const [px, py] = toPx(b.x + 1, b.y + 1);
    if (px < -50 || py < -50 || px > S.cw + 50 || py > S.ch + 50) continue;
    if (b.t === 'handelskontor') {
      const s = Math.max(4, 4 * big);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(px - s, py - s, 2 * s, 2 * s); ctx.fillStyle = flagOf(game, b.isl); ctx.fillRect(px - s + big, py - s + big, 2 * s - 2 * big, 2 * s - 2 * big);
      continue;
    }
    const fl = flagSpr(flagOf(game, b.isl)), sc = 2 * big;
    ctx.drawImage(fl.cv, Math.round(px - fl.w * sc / 2), Math.round(py - fl.h * sc), fl.w * sc, fl.h * sc);
    if (f.names) label(ctx, islName(game, b.isl), px, py + 3 * big, big);
  }
  // Namen entdeckter Inseln ohne Kontor (nur mit Namen, ab Zoom 1). NPC-Inseln immer: Symbol und Name (Pfahldorf, Werkstattbucht, Goldberg)
  {
    const ks = new Set(kontorIslands(game));
    for (const k of Object.keys(game.state.found).map(Number)) {
      if (ks.has(k)) continue;
      const I = game.W.island(k), npc = I && game.W.npcOf(k);
      if (!I || (!npc && !(f.names && S.z >= 2))) continue;
      const [px, py] = toPx(I.x, I.y);
      if (px < -80 || py < -40 || px > S.cw + 80 || py > S.ch + 20) continue;
      if (npc) {
        const m = SPR.npc.mark[npc], sc = 2 * big;
        ctx.drawImage(m.cv, Math.round(px - m.w * sc / 2), Math.round(py - m.h * sc), m.w * sc, m.h * sc);
        if (f.names) label(ctx, NPC_ISL[npc].isl, px, py + 2 * big, big);
      } else label(ctx, ISL_TYPES[I.type].name, px, py, big, true);
    }
  }
  // Tauchspot (0.19.0): Blasen-Symbol, doppelt groß, mit Ring
  const DS = game.state.dive && game.state.dive.spot;
  if (DS && game.fog.get(DS.x, DS.y)) {
    const [px, py] = toPx(DS.x + 0.5, DS.y + 0.5), ic = SPR.icon.bubbles, sc = 2 * big, ph = (performance.now() / 1200) % 1;
    ctx.strokeStyle = `rgba(160,220,255,${(1 - ph).toFixed(2)})`; ctx.lineWidth = big;
    ctx.beginPath(); ctx.arc(px, py, (8 + ph * 10) * big, 0, Math.PI * 2); ctx.stroke();
    ctx.drawImage(ic.cv, Math.round(px - ic.w * sc / 2), Math.round(py - ic.h * sc / 2), ic.w * sc, ic.h * sc);
  }
  // Schiffe: Pfeil in Fahrtrichtung, Farbe wie die Route
  if (f.ships) for (const s of game.state.ships) {
    const [px, py] = toPx(s.x, s.y), a = heading(s), r = 7 * big;
    ctx.save(); ctx.translate(px, py); ctx.rotate(a);
    ctx.fillStyle = '#2a1a10'; tri(ctx, r + 2 * big);
    ctx.fillStyle = s.kind === 'entdecker' ? '#9cc8ff' : shipCol(s); tri(ctx, r);
    ctx.restore();
    if (s.id === ui.selShip) { ctx.strokeStyle = '#fff8e0'; ctx.lineWidth = big; ctx.beginPath(); ctx.arc(px, py, r + 5 * big, 0, Math.PI * 2); ctx.stroke(); }
  }
  // Koop: Kamera-Rechtecke der Mitspieler, Markierungen
  drawPeersMap(ctx, toPx, z, performance.now(), Math.max(1, big));
  // Kamera-Rechteck
  const vw = cam.canvas.width / cam.Z / TS, vh = cam.canvas.height / cam.Z / TS;
  const [rx, ry] = toPx(cam.x / TS - vw / 2, cam.y / TS - vh / 2);
  ctx.strokeStyle = 'rgba(255,248,224,.95)'; ctx.lineWidth = Math.max(1, big);
  ctx.strokeRect(Math.round(rx) + 0.5, Math.round(ry) + 0.5, Math.max(3, vw * z), Math.max(3, vh * z));
  if (S.need) request();
}
function tri(ctx, r) { ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(-r * 0.75, r * 0.7); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r * 0.75, -r * 0.7); ctx.closePath(); ctx.fill(); }
function label(ctx, txt, x, y, big, dim) {
  ctx.font = `700 ${11 * big}px Nunito, sans-serif`;
  const w = ctx.measureText(txt).width + 8 * big, h = 15 * big;
  ctx.fillStyle = dim ? 'rgba(42,26,16,.55)' : 'rgba(42,26,16,.8)'; ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), h);
  ctx.fillStyle = dim ? '#e6cd96' : '#fbf0d4'; ctx.fillText(txt, x, y + 2 * big);
}
// Anleger eines Kontors (Feldmitte) oder seine Mitte
function dockXY(P) { if (P._dock != null) { const k = P._dock; return [tkxOf(k) + 0.5, tkyOf(k) + 0.5]; } return [P.x + 1, P.y + 1]; }
// Fahrtrichtung: zum nächsten Wegpunkt, sonst die zuletzt bekannte
function heading(s) {
  const p = s.path;
  if (p && s.pi < p.length - 1) { const n = p[s.pi + 1], a = Math.atan2(tkyOf(n) + 0.5 - s.y, tkxOf(n) + 0.5 - s.x); S.heading.set(s.id, a); return a; }
  return S.heading.get(s.id) || 0;
}
function request() { if (S.raf) return; S.raf = requestAnimationFrame(() => { S.raf = 0; if (ui.win === 'map') draw(); }); }

/* ---------- Fenster ---------- */
function headHTML() {
  const f = F();
  return `<span class="st-title pix">${img(SPR.icon.map, 2)}Karte</span>
    <span class="st-quick">${FILTERS.map(([k, n]) => `<button class="st-qb${f[k] ? ' on' : ''}" data-mv="filter" data-k="${k}">${n}</button>`).join('')}</span>
    <span class="grow"></span>
    <span class="xs muted mv-legend">${Object.entries(TYPE_COL).map(([k, c]) => `<span class="row" style="gap:3px;display:inline-flex"><i class="sw" style="background:rgb(${c.join(',')})"></i>${ISL_TYPES[k].name}</span>`).join(' ')}</span>
    <button class="btn btn-paper btn-sm" data-mv="out" title="Herauszoomen (Mausrad)">&minus;</button><span class="xs mv-z">${zoomText()}</span><button class="btn btn-paper btn-sm" data-mv="in" title="Hineinzoomen (Mausrad)">+</button>
    <button class="btn btn-paper btn-sm" data-mv="home">Heimatinsel</button>
    <button class="xbtn" data-mv="close" title="Schließen (M oder Esc)">&times;</button>`;
}
const zoomText = () => { const z = zoom(); return z >= 1 ? `${z} px/Feld` : `1 px / ${1 / z} Felder`; };
function build(body) {
  body.innerHTML = `<div class="st-wrap"><div class="st-head mv-head">${headHTML()}</div>
    <div class="st-main"><div class="st-view mv-view"><canvas class="st-cv"></canvas></div></div>
    <div class="xs muted" style="padding:4px 6px 0">Mausrad: Zoom &middot; Ziehen: verschieben &middot; Klick: Kamera dorthin &middot; Klick auf ein Schiff: auswählen</div></div>`;
  S.wrap = body.firstElementChild; S.view = S.wrap.querySelector('.mv-view'); S.cv = S.wrap.querySelector('canvas'); S.ctx = S.cv.getContext('2d');
  S.cw = 0; S.ch = 0;
  wireCanvas();
  if (!S.ro) S.ro = new ResizeObserver(() => resize());
  S.ro.observe(S.view);
  resize();
}
function resize() {
  if (!S.view) return;
  const r = S.view.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  const cw = Math.max(1, Math.round(r.width * dpr)), ch = Math.max(1, Math.round(r.height * dpr));
  if (cw === S.cw && ch === S.ch && dpr === S.dpr) return;
  S.cw = cw; S.ch = ch; S.dpr = dpr;
  S.cv.width = cw; S.cv.height = ch; S.cv.style.width = `${r.width}px`; S.cv.style.height = `${r.height}px`;
  draw();
}
function zoomTo(nz, px, py) {
  nz = Math.max(0, Math.min(ZOOMS.length - 1, nz));
  if (nz === S.z) return;
  const [wx, wy] = toTile(px, py);
  S.z = nz;
  const [nx, ny] = toTile(px, py);
  S.cx += wx - nx; S.cy += wy - ny;
  const zt = S.wrap.querySelector('.mv-z'); if (zt) zt.textContent = zoomText();
  draw();
}
function shipAt(px, py) {
  const [tx, ty] = toTile(px, py), rr = 10 / zoom();
  let best = null, bd = rr;
  for (const s of game.state.ships) { const d = Math.hypot(s.x - tx, s.y - ty); if (d < bd) { bd = d; best = s; } }
  return best;
}
function wireCanvas() {
  const cv = S.cv, pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); S.drag = { x, y, cx: S.cx, cy: S.cy, moved: false }; e.preventDefault(); });
  cv.addEventListener('pointermove', e => {
    if (!S.drag) return;
    const [x, y] = pos(e), dx = x - S.drag.x, dy = y - S.drag.y;
    if (!S.drag.moved && Math.hypot(dx, dy) < 5) return;
    S.drag.moved = true; cv.classList.add('grabbing');
    S.cx = S.drag.cx - dx / zoom(); S.cy = S.drag.cy - dy / zoom();
    request();
  });
  cv.addEventListener('pointerup', e => {
    const d = S.drag; S.drag = null; cv.classList.remove('grabbing');
    if (!d || d.moved) return;
    const [x, y] = pos(e);
    if (F().ships) { const s = shipAt(x, y); if (s) { closeWindow(); centerOnTile(s.x, s.y); selectShip(s.id, false); followShip(s.id); return; } }
    const [tx, ty] = toTile(x, y);
    closeWindow(); centerOnTile(tx, ty);
  });
  cv.addEventListener('pointercancel', () => { S.drag = null; cv.classList.remove('grabbing'); });
  cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = pos(e); zoomTo(S.z + (e.deltaY < 0 ? 1 : -1), x, y); }, { passive: false });
}

registerWindow('map', {
  title: 'Karte', icon: 'map', big: true,
  render(body) { if (!S.wrap || !body.contains(S.wrap)) build(body); draw(); },
  onOpen() { S.wrap = null; S.cx = cam.x / TS; S.cy = cam.y / TS; S.timer = setInterval(() => { if (ui.win === 'map') request(); }, 150); },
  onClose() { if (S.ro && S.view) S.ro.unobserve(S.view); S.wrap = null; S.view = null; S.cv = null; S.ctx = null; clearInterval(S.timer); S.timer = 0; },
  wire(body) {
    body.addEventListener('click', e => {
      if (ui.win !== 'map') return;
      ui.uiPressed = false;
      const a = e.target.closest('[data-mv]');
      if (!a) return;
      switch (a.dataset.mv) {
        case 'close': closeWindow(); return;
        case 'in': zoomTo(S.z + 1, S.cw / S.dpr / 2, S.ch / S.dpr / 2); return;
        case 'out': zoomTo(S.z - 1, S.cw / S.dpr / 2, S.ch / S.dpr / 2); return;
        case 'home': { const I = game.W.island(0); if (I) { S.cx = I.x; S.cy = I.y; draw(); } return; }
        case 'filter': { const f = F(); f[a.dataset.k] = !f[a.dataset.k]; a.classList.toggle('on', f[a.dataset.k]); draw(); return; }
      }
    });
  }
});
// Für Tests: Ansicht und Umrechnung
export const mapDebug = () => ({ z: S.z, zoom: zoom(), cx: S.cx, cy: S.cy, size: [S.cw, S.ch, S.dpr], cached: cache.size, screenOf: (x, y) => { const r = S.cv && S.cv.getBoundingClientRect(); if (!r) return null; const [px, py] = toPx(x, y); return { x: r.left + px / S.dpr, y: r.top + py / S.dpr }; } });
