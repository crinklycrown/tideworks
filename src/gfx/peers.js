/* =========================================================
   KOOP: MITSPIELER AUF DER KARTE
   Welt (vor der Nacht): Bauvorschau der anderen in ihrer Farbe (Gebäude, gezogene Linie, Blaupause),
     Abriss-/Aufwerten-/Auswahlrahmen, eigene noch unbestätigte Bauten (halb durchsichtig mit Ladesymbol).
   Bildschirm (zuletzt): Mauszeiger mit Namen, Markierungen („Hierher“, „Achtung“ …) mit Puls.
   localPeerState(): was dieser Spieler gerade zeigt (geht ~10-mal je Sekunde an die anderen, net/session.js).
   ========================================================= */
import { TS } from '../config.js';
import { BD } from '../data/buildings.js';
import { MARKS, NET } from '../data/net.js';
import { tkx, tky } from '../util/tiles.js';
import { SPR } from './sprites.js';
import { cam } from './camera.js';
import { ghostSprite, ghostPos, bpGhost, upgradeTarget } from './renderer.js';
import { game, ui } from '../ui/context.js';
import { coop, myPid, liveMarks } from '../net/session.js';
import { pending } from '../net/remote.js';
import { dragPath } from '../input/input.js';

const KIND = Object.fromEntries(MARKS.kinds.map(k => [k.id, k]));
// '#rrggbb' → 'rgba(r,g,b,a)'
export function rgba(hex, a) {
  const n = parseInt(String(hex || '#ffffff').slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
// helle Farben bekommen dunkle Schrift
export const inkOn = (hex) => { const n = parseInt(String(hex || '#ffffff').slice(1), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 > 150 ? '#2a1a10' : '#fbf0d4'; };

// andere Spieler mit Zustand (Zeiger, Modus)
export const others = () => coop.role ? [...coop.players.values()].filter(p => p.pid !== myPid() && p.state && p.status !== 'gone') : [];

/* ---------- Eigener Zustand für die anderen ---------- */
let bpKey = '', bpObj = null, bpSent = '';
const r2 = (v) => Math.round(v * 100) / 100;
// Kamera-Ausschnitt in Feldern [x0, y0, x1, y1]
export function viewRect() {
  const vw = cam.canvas.width / cam.Z / TS, vh = cam.canvas.height / cam.Z / TS, cx = cam.x / TS, cy = cam.y / TS;
  return [Math.floor(cx - vw / 2), Math.floor(cy - vh / 2), Math.ceil(cx + vw / 2), Math.ceil(cy + vh / 2)];
}
export function localPeerState(active) {
  if (!active || !game.state) return { state: null };
  const m = ui.mode, s = { r: viewRect() };
  if (ui.hoverW) s.c = [r2(ui.hoverW.x / TS), r2(ui.hoverW.y / TS)];
  if (m && ui.hoverW) {
    s.m = m.kind;
    if (m.kind === 'build') {
      const g = ghostPos();
      s.t = m.t; s.d = m.d | 0; s.g = [g.x, g.y];
      const p = dragPath();
      if (p && p.length) s.p = p.slice(-120);
    } else if ((m.kind === 'demolish' || m.kind === 'upgrade') && ui.hoverTile >= 0) {
      const b = m.kind === 'upgrade' ? upgradeTarget(ui.hoverTile, ui.shift) : game.blds.get(game.bmap.getK(ui.hoverTile));
      if (b && !b.pipe && BD[b.t]) s.f = [b.x, b.y, BD[b.t].w, BD[b.t].h];
      else s.f = [tkx(ui.hoverTile), tky(ui.hoverTile), 1, 1];
    } else if (m.kind === 'bpSelect' && m.a != null) {
      const b = m.b != null ? m.b : ui.hoverTile >= 0 ? ui.hoverTile : m.a;
      const x0 = Math.min(tkx(m.a), tkx(b)), y0 = Math.min(tky(m.a), tky(b));
      s.f = [x0, y0, Math.max(tkx(m.a), tkx(b)) - x0 + 1, Math.max(tky(m.a), tky(b)) - y0 + 1];
    } else if (m.kind === 'bpPlace') {
      const gh = bpGhost();
      if (gh) {
        const key = `${m.bp && (m.bp.id || m.bp.name) || 'clip'}:${m.rot | 0}:${gh.B.parts.length}`;
        if (key !== bpKey) { bpKey = key; bpObj = { k: key, w: gh.B.w, h: gh.B.h, parts: gh.B.parts.slice(0, NET.bpParts).map(p => [p.t, p.x, p.y, p.d | 0]), pipes: gh.B.pipes.slice(0, NET.bpParts) }; }
        s.g = [gh.x, gh.y]; s.bk = key;
      }
    }
  }
  const bpNew = !!bpObj && bpSent !== bpKey;
  if (bpNew) bpSent = bpKey;
  return { state: s, bp: bpObj, bpNew };
}

/* ---------- Welt ---------- */
function frameRect(ctx, x, y, w, h, col, t) { ctx.fillStyle = col; ctx.fillRect(x, y, w, t); ctx.fillRect(x, y + h - t, w, t); ctx.fillRect(x, y, t, h); ctx.fillRect(x + w - t, y, t, h); }
function ghost(ctx, t, d, x, y, col, alpha, now, lw) {
  const D = BD[t];
  if (!D) return;
  const G = ghostSprite(t, d, x, y, now);
  ctx.fillStyle = rgba(col, 0.2); ctx.fillRect(x * TS, y * TS, D.w * TS, D.h * TS);
  if (G.s) { ctx.globalAlpha = alpha; ctx.drawImage(G.s.cv, x * TS, G.flat ? y * TS : (y + D.h) * TS - G.s.h); ctx.globalAlpha = 1; }
  frameRect(ctx, x * TS, y * TS, D.w * TS, D.h * TS, rgba(col, 0.85), lw);
}
// kleines Ladesymbol (8 Punkte, einer hell) rechts oben
function spinner(ctx, x, y, now, px1) {
  const r = Math.max(3, 4 * px1 * 2), k = Math.floor(now * 10) % 8, sz = Math.max(1, px1 * 2);
  ctx.fillStyle = 'rgba(42,26,16,.55)'; ctx.fillRect(x - r - sz * 2, y - r - sz * 2, 2 * r + sz * 4, 2 * r + sz * 4);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    ctx.fillStyle = i === k ? '#fff8e0' : 'rgba(255,248,224,.35)';
    ctx.fillRect(Math.round(x + Math.cos(a) * r - sz / 2), Math.round(y + Math.sin(a) * r - sz / 2), sz, sz);
  }
}
export function drawPeersWorld(ctx, now, px1) {
  if (!coop.role || !game.state) return;
  const lw = Math.max(px1 * 2, 1);
  for (const p of others()) {
    const s = p.state, col = p.color;
    if (s.p) for (const [x, y] of s.p) { ctx.fillStyle = rgba(col, 0.28); ctx.fillRect(x * TS, y * TS, TS, TS); }
    if (s.m === 'build' && s.g && BD[s.t]) ghost(ctx, s.t, s.d, s.g[0], s.g[1], col, 0.45, now, lw);
    else if (s.f) {
      const [x, y, w, h] = s.f;
      if (s.m === 'demolish') { ctx.fillStyle = 'rgba(232,80,60,0.25)'; ctx.fillRect(x * TS, y * TS, w * TS, h * TS); }
      else if (s.m === 'upgrade') { ctx.fillStyle = 'rgba(124,194,79,0.22)'; ctx.fillRect(x * TS, y * TS, w * TS, h * TS); }
      else { ctx.fillStyle = rgba(col, 0.12); ctx.fillRect(x * TS, y * TS, w * TS, h * TS); }
      frameRect(ctx, x * TS, y * TS, w * TS, h * TS, rgba(col, 0.9), lw);
    } else if (s.m === 'bpPlace' && s.g && p.bp && p.bp.k === s.bk) {
      const B = p.bp, ox = s.g[0], oy = s.g[1];
      for (const [x, y] of B.pipes || []) { ctx.fillStyle = rgba(col, 0.25); ctx.fillRect((ox + x) * TS + 4, (oy + y) * TS + 4, TS - 8, TS - 8); }
      ctx.globalAlpha = 1;
      for (const [t, x, y, d] of B.parts) {
        const D = BD[t];
        if (!D) continue;
        const G = ghostSprite(t, d, ox + x, oy + y, now);
        ctx.fillStyle = rgba(col, 0.16); ctx.fillRect((ox + x) * TS, (oy + y) * TS, D.w * TS, D.h * TS);
        if (G.s) { ctx.globalAlpha = 0.4; ctx.drawImage(G.s.cv, (ox + x) * TS, G.flat ? (oy + y) * TS : (oy + y + D.h) * TS - G.s.h); ctx.globalAlpha = 1; }
      }
      frameRect(ctx, ox * TS, oy * TS, B.w * TS, B.h * TS, rgba(col, 0.9), lw);
    }
  }
  // eigene, noch nicht vom Host bestätigte Bauten
  if (coop.role === 'guest' && pending.length) {
    const t = performance.now() / 1000;
    for (const q of pending) {
      if (game.bmap.get(q.x, q.y)) continue;      // schon da (der Snapshot hat es gebracht)
      const D = BD[q.t], G = ghostSprite(q.t, q.d, q.x, q.y, now);
      if (!D || !G.s) continue;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(G.s.cv, q.x * TS, G.flat ? q.y * TS : (q.y + D.h) * TS - G.s.h);
      ctx.globalAlpha = 1;
      if (!q.flat || q === pending[pending.length - 1]) spinner(ctx, (q.x + D.w) * TS - 5, q.y * TS + 5, t, px1);
    }
  }
}

/* ---------- Bildschirm ---------- */
function arrow(ctx, x, y, s, col) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 14 * s); ctx.lineTo(x + 4 * s, y + 10.5 * s); ctx.lineTo(x + 7 * s, y + 16 * s); ctx.lineTo(x + 9 * s, y + 15 * s);
  ctx.lineTo(x + 6.5 * s, y + 9.5 * s); ctx.lineTo(x + 11 * s, y + 9.5 * s); ctx.closePath();
  ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 1.5 * s; ctx.strokeStyle = '#2a1a10'; ctx.stroke();
}
function tag(ctx, txt, x, y, s, col) {
  ctx.font = `700 ${Math.round(11 * s)}px Nunito, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const w = ctx.measureText(txt).width + 8 * s, h = 15 * s;
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(Math.round(x - s), Math.round(y - s), Math.round(w + 2 * s), Math.round(h + 2 * s));
  ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.fillStyle = inkOn(col); ctx.fillText(txt, x + 4 * s, y + 1.5 * s);
}
export function drawPeersScreen(ctx, Z, OX, OY, DPR, cw, ch, nowMs) {
  if (!coop.role || !game.state) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const s = DPR;
  for (const p of others()) {
    const c = p.state.c;
    if (!c) continue;
    const x = c[0] * TS * Z + OX, y = c[1] * TS * Z + OY;
    if (x < -40 || y < -40 || x > cw + 40 || y > ch + 40) continue;
    arrow(ctx, Math.round(x), Math.round(y), s, p.color);
    tag(ctx, p.name, x + 12 * s, y + 14 * s, s, p.color);
  }
  // Markierungen auf der Karte (außerhalb: Pfeile am Rand, ui/marks.js)
  for (const k of liveMarks()) {
    const age = (nowMs - k.t0) / 1000, left = MARKS.ttl - age, a = left < 2 ? Math.max(0, left / 2) : 1;
    const x = (k.x + 0.5) * TS * Z + OX, y = (k.y + 0.5) * TS * Z + OY;
    if (x < -20 || y < -20 || x > cw + 20 || y > ch + 20) continue;
    ctx.globalAlpha = a;
    // Aufblitzen beim Setzen, danach ruhiger Puls
    if (age < 0.8) { const r = (10 + age * 70) * s; ctx.strokeStyle = rgba(k.color, 1 - age / 0.8); ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
    const pr = (9 + 3 * Math.sin(age * 5)) * s;
    ctx.fillStyle = rgba(k.color, 0.3); ctx.beginPath(); ctx.ellipse(x, y, pr * 1.4, pr * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = k.color; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.ellipse(x, y, pr * 1.4, pr * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
    // Fähnchen mit Symbol
    const K = KIND[k.kind], ic = K && SPR.icon[K.icon], bob = Math.round(Math.sin(age * 4) * 2 * s), sc = 2 * s;
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(Math.round(x - s), Math.round(y - 30 * s + bob), Math.round(2 * s), Math.round(30 * s));
    if (ic) {
      const w = ic.w * sc, h = ic.h * sc, bx = Math.round(x - w / 2 - 3 * s), by = Math.round(y - 30 * s - h - 6 * s + bob);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(bx - s, by - s, w + 8 * s, h + 8 * s);
      ctx.fillStyle = k.color; ctx.fillRect(bx, by, w + 6 * s, h + 6 * s);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(ic.cv, bx + 3 * s, by + 3 * s, w, h);
      tag(ctx, `${k.name}: ${K.name}`, bx + w + 10 * s, by + 2 * s, s, k.color);
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- Minimap und Kartenansicht ---------- */
// P(x, y) → [px, py] im Ziel-Canvas, sc = Pixel je Feld
export function drawPeersMap(ctx, P, sc, now, lw) {
  if (!coop.role) return;
  for (const p of others()) {
    const r = p.state.r;
    if (!r) continue;
    const [x0, y0] = P(r[0], r[1]), w = Math.max(2, (r[2] - r[0]) * sc), h = Math.max(2, (r[3] - r[1]) * sc);
    ctx.strokeStyle = p.color; ctx.lineWidth = lw;
    ctx.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.round(w), Math.round(h));
  }
  const blink = Math.floor(now / 300) % 2;
  for (const k of liveMarks()) {
    const [x, y] = P(k.x + 0.5, k.y + 0.5), r = Math.max(2, 3 * lw);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(Math.round(x - r - lw), Math.round(y - r - lw), Math.round(2 * r + 2 * lw), Math.round(2 * r + 2 * lw));
    ctx.fillStyle = blink ? k.color : '#fff8e0'; ctx.fillRect(Math.round(x - r), Math.round(y - r), Math.round(2 * r), Math.round(2 * r));
  }
}
