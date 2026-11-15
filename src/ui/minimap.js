/* =========================================================
   MINIMAP rechts oben unter der Ziel-Karte (einklappbar, Zustand in state.ui.miniCollapsed)
   Zeigt die aufgedeckte Welt grob (1 Pixel = 2, 4 oder 8 Felder, Mausrad wechselt; state.ui.miniScale),
   Nebel dunkel, Kontore als Flaggenpunkte, Funde als kleine Punkte, Schiffe als helle Punkte, Händler in Wimpelfarbe, Ereignisse als Kreis mit Symbol und das Kamera-Rechteck.
   Der Ausschnitt folgt der Kamera, ein Klick bewegt die Kamera dorthin.
   Das Grundbild wird gecacht und nur neu gezeichnet, wenn sich Ausschnitt, Maßstab oder Nebel ändern
   (höchstens alle 120 ms; dazwischen wird das alte Bild verschoben).
   ========================================================= */
import { TS, FIND_CELL } from '../config.js';
import { ck } from '../util/tiles.js';
import { flagOf } from '../sim/state.js';
import { BD } from '../data/buildings.js';
import { NPC_ORDER, NPC_ISL } from '../data/npcs.js';
import { findsInCell, lootLeft } from '../world/finds.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { GROUND_FLAT } from '../gfx/ground.js';
import { cam, centerOnTile } from '../gfx/camera.js';
import { rgb } from '../gfx/pixelbuffer.js';
import { game, $ } from './context.js';
import { registerTip } from './tooltip.js';
import { foreignIslands, outlineIsland } from './common.js';
import { layout } from './layout.js';
import { drawPeersMap } from '../gfx/peers.js';

const SZ = 180, SCALES = [2, 4, 8], FOG = [27, 34, 54];
const COLS = GROUND_FLAT.map(rgb);
let base = null, baseIm = null, bx = 0, by = 0, bs = 0, bFog = -1, bWorld = -1, lastBase = 0, lastDraw = 0;

const scale = () => SCALES[Math.min(SCALES.length - 1, Math.max(0, game.state.ui.miniScale | 0))];
// Linke obere Ecke des Ausschnitts in Minimap-Pixeln (Felder / Maßstab)
function origin(s) { return { ox: Math.floor(cam.x / TS / s) - SZ / 2, oy: Math.floor(cam.y / TS / s) - SZ / 2 }; }

function paintBase(ox, oy, s) {
  if (!base) { base = document.createElement('canvas'); base.width = SZ; base.height = SZ; baseIm = new ImageData(SZ, SZ); }
  const D = baseIm.data, W = game.W, fog = game.fog, h = s >> 1;
  for (let py = 0; py < SZ; py++) for (let px = 0; px < SZ; px++) {
    const tx = (ox + px) * s + h, ty = (oy + py) * s + h, p = (py * SZ + px) * 4;
    const c = fog.get(tx, ty) ? COLS[W.rawGround(tx, ty)] : FOG;
    D[p] = c[0]; D[p + 1] = c[1]; D[p + 2] = c[2]; D[p + 3] = 255;
  }
  base.getContext('2d').putImageData(baseIm, 0, 0);
  bx = ox; by = oy; bs = s; bFog = fog.ver; bWorld = game.worldVer;
}

export function renderMinimap(now) {
  if (!game.state || game.state.ui.miniCollapsed) return;
  if (now - lastDraw < 50) return;           // Punkte und Rahmen reichen mit 20 Bildern/s
  lastDraw = now;
  const cv = $('miniCv'), ctx = cv.getContext('2d'), s = scale(), { ox, oy } = origin(s);
  const stale = !base || bs !== s || bWorld !== game.worldVer || bFog !== game.fog.ver || bx !== ox || by !== oy;
  if (stale && (now - lastBase > 120 || bs !== s || bWorld !== game.worldVer)) { paintBase(ox, oy, s); lastBase = now; }
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = `rgb(${FOG.join(',')})`; ctx.fillRect(0, 0, SZ, SZ);
  if (bs === s) ctx.drawImage(base, bx - ox, by - oy);
  const P = (x, y) => [Math.floor(x / s) - ox, Math.floor(y / s) - oy];
  // Getrennte Inseln: Inseln der Mitspieler in ihrer Farbe umrandet
  for (const o of foreignIslands()) outlineIsland(ctx, o.I, o.color, (x, y) => [x / s - ox, y / s - oy], 1 / s, 1);
  // Kontore als Flaggenpunkte (Hauptkontor in der Mitte, alt 2×2), Handelskontore kleiner
  for (const b of game.blds.values()) {
    if (b.t === 'handelskontor') { const [px, py] = P(b.x + 1, b.y + 1); ctx.fillStyle = '#2a1a10'; ctx.fillRect(px - 1, py - 1, 3, 3); ctx.fillStyle = flagOf(game, b.isl); ctx.fillRect(px, py, 1, 1); continue; }
    if (b.t !== 'kontor' && b.t !== 'kontoralt') continue;
    const c = BD[b.t].w >> 1, [px, py] = P(b.x + c, b.y + c);
    if (px < -3 || py < -3 || px > SZ + 3 || py > SZ + 3) continue;
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(px - 2, py - 2, 5, 5);
    ctx.fillStyle = flagOf(game, b.isl); ctx.fillRect(px - 1, py - 1, 3, 3);
  }
  // NPC-Inseln (entdeckt): Symbol und Name
  for (const id of NPC_ORDER) {
    const k = game.W.npcIsl ? game.W.npcIsl(id) : -1, I = k >= 0 && game.state.found[k] ? game.W.island(k) : null;
    if (!I) continue;
    const [px, py] = P(I.x, I.y), m = SPR.npc.mark[id];
    if (px < -40 || py < -20 || px > SZ + 40 || py > SZ + 20) continue;
    ctx.drawImage(m.cv, px - (m.w >> 1), py - m.h);
    ctx.font = '700 9px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const name = NPC_ISL[id].isl, w = Math.ceil(ctx.measureText(name).width) + 4;
    ctx.fillStyle = 'rgba(42,26,16,.75)'; ctx.fillRect(Math.round(px - w / 2), py + 1, w, 11);
    ctx.fillStyle = '#fbf0d4'; ctx.fillText(name, px, py + 2);
  }
  // Funde (nur aufgedeckte, noch nicht eingesammelte): Treibgut hellbraun, Wracks orange
  const fx0 = ox * s, fy0 = oy * s, fx1 = (ox + SZ) * s, fy1 = (oy + SZ) * s, loot = game.state.loot;
  for (let cy = Math.floor(fy0 / FIND_CELL); cy <= Math.floor(fy1 / FIND_CELL); cy++) for (let cx = Math.floor(fx0 / FIND_CELL); cx <= Math.floor(fx1 / FIND_CELL); cx++) {
    if (!game.fog.coverage(ck(cx, cy))) continue;      // Fund-Zellen sind so groß wie Chunks
    for (const f of findsInCell(game.W, cx, cy)) {
      if (!game.fog.get(f.x, f.y) || !lootLeft(loot, f)) continue;
      const [px, py] = P(f.x, f.y);
      ctx.fillStyle = f.kind === 'wreck' ? '#ff9a3a' : '#e6bf85'; ctx.fillRect(px, py, f.kind === 'wreck' ? 2 : 1, f.kind === 'wreck' ? 2 : 1);
    }
  }
  // abgeworfene Ladung (Kisten): hellgelb
  ctx.fillStyle = '#ffd86a';
  for (const j of game.state.jet || []) { if (!game.fog.get(j.x, j.y)) continue; const [px, py] = P(j.x, j.y); ctx.fillRect(px, py, 1, 1); }
  // Tauchspot (0.19.0): Blasen-Symbol mit pulsierendem Ring
  const DS = game.state.dive && game.state.dive.spot;
  if (DS && game.fog.get(DS.x, DS.y)) {
    const [px, py] = P(DS.x, DS.y), ic = SPR.icon.bubbles, ph = (now / 1200) % 1;
    ctx.strokeStyle = `rgba(160,220,255,${(1 - ph).toFixed(2)})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px + 0.5, py + 0.5, 4 + ph * 6, 0, Math.PI * 2); ctx.stroke();
    ctx.drawImage(ic.cv, px - ic.ax, py - ic.ay);
  }
  // Schiffe: Frachtschiffe hell, Entdecker blau mit hellem Rand (Kreuz)
  for (const sh of game.state.ships) {
    const [px, py] = P(sh.x, sh.y);
    if (sh.kind === 'entdecker') { ctx.fillStyle = '#fff8e0'; ctx.fillRect(px - 1, py, 3, 1); ctx.fillRect(px, py - 1, 1, 3); ctx.fillStyle = '#3f8fe8'; ctx.fillRect(px, py, 1, 1); }
    else { ctx.fillStyle = '#fff8e0'; ctx.fillRect(px - 1, py - 1, 2, 2); }
    if (sh.bell) { ctx.fillStyle = '#d8a440'; ctx.fillRect(px - 1, py + 2, 2, 1); }   // Taucherschiff: gelber Strich darunter
  }
  // Händler: Punkt in der Wimpelfarbe
  for (const t of (game.state.trade && game.state.trade.list) || []) {
    const [px, py] = P(t.x, t.y);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(px - 1, py - 1, 3, 3); ctx.fillStyle = t.kind === 'fern' ? '#a25ad8' : '#3f6fd8'; ctx.fillRect(px, py, 1, 1);
  }
  // Ereignisse: Gebiet als Kreis (angekündigt gestrichelt), Symbol in der Mitte
  for (const e of (game.state.ev && game.state.ev.list) || []) {
    if (e.x == null) continue;
    const [px, py] = P(e.x, e.y), r = Math.max(3, e.r / s), blink = e.on || Math.floor(now / 400) % 2;
    ctx.strokeStyle = e.on ? 'rgba(255,120,90,.9)' : 'rgba(255,230,120,.9)'; ctx.lineWidth = 1;
    if (!e.on) ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.arc(px + 0.5, py + 0.5, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    const ic = SPR.ev[e.kind];
    if (ic && blink) ctx.drawImage(ic.cv, px - (ic.w >> 1), py - (ic.h >> 1));
  }
  // Koop: Kamera-Rechtecke der Mitspieler, Markierungen
  drawPeersMap(ctx, (x, y) => [x / s - ox, y / s - oy], 1 / s, now, 1);
  // Kamera-Rechteck
  const vw = cam.canvas.width / cam.Z / TS / s, vh = cam.canvas.height / cam.Z / TS / s;
  const [cx, cy] = [cam.x / TS / s - ox, cam.y / TS / s - oy];
  ctx.strokeStyle = 'rgba(255,248,224,.9)'; ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(cx - vw / 2) + 0.5, Math.round(cy - vh / 2) + 0.5, Math.max(2, Math.round(vw)), Math.max(2, Math.round(vh)));
}

export function renderMiniHead() {
  const col = game.state.ui.miniCollapsed;
  $('miniTog').innerHTML = col ? '&#9656;' : '&#9662;';
  $('miniBody').classList.toggle('hidden', col);
  $('miniScale').textContent = col ? '' : `1 : ${scale()}`;
}
export function wireMinimap() {
  $('miniIcon').innerHTML = img(SPR.icon.anchor, 2);
  registerTip('mini', () => '<div class="tt-h"><span>Karte</span></div><div class="xs">Klick: Kamera dorthin. Mausrad: Maßstab (1 Pixel = 2, 4 oder 8 Felder).</div>');
  renderMiniHead();
  $('miniHead').addEventListener('click', () => { game.state.ui.miniCollapsed = !game.state.ui.miniCollapsed; renderMiniHead(); lastDraw = 0; layout(); });
  const cv = $('miniCv');
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const ui = game.state.ui;
    ui.miniScale = Math.min(SCALES.length - 1, Math.max(0, (ui.miniScale | 0) + (e.deltaY > 0 ? 1 : -1)));
    renderMiniHead(); lastDraw = 0;
  }, { passive: false });
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect(), s = scale(), { ox, oy } = origin(s);
    const px = (e.clientX - r.left) / r.width * SZ, py = (e.clientY - r.top) / r.height * SZ;
    centerOnTile((ox + px) * s, (oy + py) * s);
    lastDraw = 0;
  });
}

// Vorschaubild für die Spielstand-Liste: Heimatinsel (wie die Minimap, Nebel dunkel, Kontore als Flaggenpunkte) als PNG-Daten-URL
export function thumbnail(w = 96, h = 72) {
  const I = game.W && game.W.island(0);
  if (!I) return '';
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'), im = ctx.createImageData(w, h), D = im.data, fog = game.fog, W = game.W;
  const s = Math.max((I.w + 8) / w, (I.h + 8) / h), cx = I.x0 + I.w / 2, cy = I.y0 + I.h / 2;
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const tx = Math.floor(cx + (px - w / 2) * s), ty = Math.floor(cy + (py - h / 2) * s), p = (py * w + px) * 4;
    const c = fog.get(tx, ty) ? COLS[W.rawGround(tx, ty)] : FOG;
    D[p] = c[0]; D[p + 1] = c[1]; D[p + 2] = c[2]; D[p + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
  for (const b of game.blds.values()) {
    if (b.t !== 'kontor' && b.t !== 'kontoralt' && b.t !== 'handelskontor') continue;
    const px = Math.floor(w / 2 + (b.x + 1 - cx) / s), py = Math.floor(h / 2 + (b.y + 1 - cy) / s);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(px - 2, py - 2, 5, 5); ctx.fillStyle = flagOf(game, b.isl); ctx.fillRect(px - 1, py - 1, 3, 3);
  }
  try { return cv.toDataURL('image/png'); } catch (e) { return ''; }
}
