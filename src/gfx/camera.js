/* =========================================================
   KAMERA: Position, Zoom, Umrechnung Bildschirm ↔ Welt
   ========================================================= */
import { TS } from '../config.js';
import { clamp } from '../util/math.js';
import { tk } from '../util/tiles.js';
import { kontorOf } from '../sim/state.js';
import { DEMO } from '../data/demo.js';
import { CAM_SPEED } from '../config.js';

// x/y = Weltpunkt in der Bildmitte; Z = Zoom (Gerätepixel je Weltpixel); OX/OY = Verschiebung beim Zeichnen
// follow = ID des Schiffs, dem die Kamera folgt (-1 = keins)
export const cam = { x: 0, y: 0, DPR: 1, Z: 2, ZMIN: 1, ZMAX: 6, OX: 0, OY: 0, canvas: null, follow: -1 };

/* ---------- Kamera folgt einem Schiff (Version 18) ----------
   Klick auf ein Schiff: die Kamera zieht weich hinterher (k = Nachzieh-Stärke je Sekunde). Das Folgen endet, sobald die Kamera
   anders bewegt wird (Ziehen, Tasten, Minimap, Sprung zu einer Insel), beim Zoomen auf eine andere Stelle (weiter als near
   Bildschirmpunkte von der Bildmitte; näher dran wird um das Schiff gezoomt) und mit Esc. */
export const FOLLOW = { k: 5, near: 90 };
export function followShip(id) { cam.follow = id; }
export function stopFollow() { cam.follow = -1; }
// Jedes Bild: pos(id) = aktuelle (interpolierte) Position des Schiffs in Feldern oder null (Schiff weg → Folgen endet)
export function followCamera(dt, pos) {
  if (cam.follow < 0) return;
  const p = pos(cam.follow);
  if (!p) { cam.follow = -1; return; }
  const f = 1 - Math.exp(-FOLLOW.k * dt);
  cam.x += (p.x * TS - cam.x) * f; cam.y += (p.y * TS - cam.y) * f;
  clampCam();
}

export function initCamera(canvas) {
  cam.canvas = canvas;
  cam.DPR = Math.min(window.devicePixelRatio || 1, 3); cam.ZMIN = Math.max(1, Math.round(cam.DPR)); cam.ZMAX = Math.round(6 * cam.DPR); cam.Z = Math.round(2 * cam.DPR);
}
export function resize() {
  const canvas = cam.canvas, w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  if (dpr !== cam.DPR) { const css = cam.Z / cam.DPR; cam.DPR = dpr; cam.ZMIN = Math.max(1, Math.round(cam.DPR)); cam.ZMAX = Math.round(6 * cam.DPR); cam.Z = clamp(Math.round(css * cam.DPR), cam.ZMIN, cam.ZMAX); }
  const bw = Math.round(w * cam.DPR), bh = Math.round(h * cam.DPR);
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  clampCam();
}
// Die Welt ist unendlich; begrenzt wird nur auf den Bereich, den Kachel-Schlüssel abdecken (±1 Mio. Felder)
const LIM = 1000000 * TS;
export function clampCam() {
  if (!Number.isFinite(cam.x) || !Number.isFinite(cam.y)) { cam.x = 0; cam.y = 0; }
  cam.x = clamp(cam.x, -LIM, LIM); cam.y = clamp(cam.y, -LIM, LIM);
}
export function screenToWorld(sx, sy) { return { x: (sx * cam.DPR - cam.OX) / cam.Z, y: (sy * cam.DPR - cam.OY) / cam.Z }; }
// Kachel-Schlüssel des Feldes unter einem Weltpunkt
export function tileAtW(wx, wy) { return tk(Math.floor(wx / TS), Math.floor(wy / TS)); }
export function centerOnTile(x, y) { cam.follow = -1; cam.x = x * TS; cam.y = y * TS; clampCam(); }
// Zum Kontor der Insel k, sonst zur Inselmitte
export function centerIsland(g, k) {
  cam.follow = -1;
  const b = kontorOf(g, k);
  if (b) { const c = b.t === 'kontor' ? 1.5 : 1; centerOnTile(b.x + c, b.y + c); return; }
  const I = g.W.island(k);
  if (I) centerOnTile(I.x + 0.5, I.y + 0.5);
}
export function zoomAt(sx, sy, dir) {
  if (cam.follow >= 0) {   // beim Folgen: nahe der Bildmitte um das Schiff zoomen, sonst endet das Folgen
    const cx = cam.canvas.width / cam.DPR / 2, cy = cam.canvas.height / cam.DPR / 2;
    if (Math.hypot(sx - cx, sy - cy) <= FOLLOW.near) { sx = cx; sy = cy; } else cam.follow = -1;
  }
  const nz = clamp(cam.Z + dir, cam.ZMIN, cam.ZMAX);
  if (nz === cam.Z) return;
  const w = screenToWorld(sx, sy);
  cam.Z = nz;
  cam.x = w.x - (sx * cam.DPR - cam.canvas.width / 2) / cam.Z;
  cam.y = w.y - (sy * cam.DPR - cam.canvas.height / 2) / cam.Z;
  clampCam();
}

// Tastatur (WASD/Pfeile): Grundtempo CAM_SPEED.base Bildschirmpunkte/s, mit Umschalt × CAM_SPEED.fast,
// in CAM_SPEED.ramp Sekunden von 0 auf volles Tempo (keys: 'l', 'r', 'u', 'd', 'fast')
let ramp = 0;
export function moveCamera(keys, dt) {
  const dx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), dy = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
  if (!dx && !dy) { ramp = 0; return; }
  cam.follow = -1;
  ramp = Math.min(1, ramp + dt / CAM_SPEED.ramp);
  const sp = CAM_SPEED.base * (keys.has('fast') ? CAM_SPEED.fast : 1) * ramp * dt / (cam.Z / cam.DPR), n = Math.hypot(dx, dy);
  cam.x += dx / n * sp; cam.y += dy / n * sp;
  clampCam();
}
// Titelbildschirm: Kamera fährt den Pfad DEMO.cam in einer Schleife ab (weich zwischen den Punkten)
let demoT = 0;
export function demoCamera(dt) {
  const P = DEMO.cam;
  let total = 0;
  for (const p of P) total += p[2];
  demoT = (demoT + dt) % total;
  let t = demoT, i = 0;
  while (t >= P[i][2]) { t -= P[i][2]; i++; }
  const a = P[i], b = P[(i + 1) % P.length], f = t / a[2], e = f * f * (3 - 2 * f);
  cam.x = (a[0] + (b[0] - a[0]) * e) * TS; cam.y = (a[1] + (b[1] - a[1]) * e) * TS;
  cam.Z = clamp(Math.round(DEMO.zoom * cam.DPR), cam.ZMIN, cam.ZMAX);
}
