/* =========================================================
   TAUCH-MINISPIEL (seit 0.20.0) – hängt sich mit setDiveGame an ui/dive.js (startDive)
   Seitenansicht unter Wasser auf der Cutscene-Bühne (cutscene/stage.js, 320×180, bildschirmfüllend). Die Fabrik läuft weiter.
   Ablauf eines Tauchgangs (nur auf dem Rechner des Tauchers):
     1. allererster Tauchgang: Szene cs_abstieg (info.intro vom Host), sonst blendet die Karte nach Schwarz
     2. Aufgabe wird eingeblendet; Sauerstoff (DIVE_GAME.air) läuft
          search: Haufen freilegen (Klick/Halten bzw. Leertaste/E), einer enthält das Ziel (Glitzern, Blasen), andere Kleinkram oder nichts
          weld:   Schweißnaht an Kiste oder Wracktür entlangfahren (Maustaste halten bzw. Leertaste/E), neben der Naht kein Fortschritt
     3. Ende: Aufgabe erfüllt (ok) oder Luft leer (Abblende, ohne Hauptbeute, Kleinkram bleibt) → Promise erfüllt { ok, found, junk }
        → ui/dive.js schickt diveEnd → der Host würfelt die Beute → diveResult kommt zurück → Ergebnisfenster → zurück zur Karte
   Steuerung: Maus-Klick = hinschwimmen, Halten auf Haufen/Naht = graben/schweißen; WASD/Pfeile = schwimmen, Leertaste/E halten =
   graben/schweißen; Esc zweimal = vorzeitig auftauchen.
   Debug: tideworks.diveGame({ task, act, seed, weld, target, intro }) spielt ohne Host (Probe, keine Beute);
          tideworks.diveTask('search'|'weld'|null) erzwingt die Aufgabe des nächsten echten Tauchgangs.
   Zahlen: data/dive.js (DIVE_GAME, DIVE_TARGETS, DIVE_WELD, DIVE_JUNK), Grafik: divegame/art.js, Platz: divegame/world.js.
   ========================================================= */
import { W, H, clamp, lerp, ease, hash, bay, vignette, glow, disc } from '../cutscene/kit.js';
import { stageOpen, stageClose, stageScene, stageBlit, stageBlack, stageVeil, stageView, stageSkip, stageMode } from '../cutscene/stage.js';
import { playScene, hasScene, reducedMotion } from '../cutscene/player.js';
import { glyphText } from '../cutscene/glyphs.js';
import { DIVE_GAME, DIVE_TARGETS, DIVE_STORY_TARGETS, DIVE_WELD, DIVE_JUNK, DIVE_PUMP } from '../data/dive.js';
import { ITEMS } from '../data/items.js';
import { SPR } from '../gfx/sprites.js';
import { img } from '../gfx/pixelbuffer.js';
import { esc, fmt } from '../util/format.js';
import { ui, simClient } from './context.js';
import * as NET_S from '../net/session.js';
import { WELD_ARMS, handOff, art, drawRays, drawMotes, makeSchool, drawFish, drawBell, drawChain, itemSprite, BRASS, SAND, HOSE, WATER, DIVER_FX, DIVER_FY, HOSE_AT, HAND_AT } from '../divegame/art.js';
import { buildWorld, drawWeeds, BELL_X, BELL_Y } from '../divegame/world.js';
import { setDiveGame, setDiveResultHook } from './dive.js';

const CFG = DIVE_GAME;
const PRE = .8, IN = 1, WON = 2.2, LOST = 1.8, OUTF = .9;   // Sekunden: Karte → Schwarz, Aufblende, Fund zeigen, Abblende ohne Luft, Abblende nach Fund
const HAND = { x: 10, y: -20 };                             // ungefähr die Hand relativ zu den Füßen (Blick nach rechts, Arm gerade)
const LANCE = 16;                                          // so weit reicht der Brenner von der Hand

let forceTask = null;          // Debug: Aufgabe des nächsten Tauchgangs
export const setForceTask = (t) => { forceTask = t === 'search' || t === 'weld' ? t : null; return forceTask; };

/* ---------- Aufgabe aus dem Spot ---------- */
export function taskFor(spot, act) {
  const id = spot && spot.id | 0, r = (a) => hash(id, a, 7331);
  if (spot && spot.find === 'pumpwerk') return pumpTask();
  if (spot && spot.find && DIVE_STORY_TARGETS[spot.find]) return { task: 'search', target: DIVE_STORY_TARGETS[spot.find], story: spot.find };
  let task = forceTask;
  if (!task) { const T = CFG.tasks, sum = T.search + T.weld; task = r(1) * sum < T.search ? 'search' : 'weld'; }
  return task === 'search' ? { task, target: DIVE_TARGETS[Math.floor(r(2) * DIVE_TARGETS.length)] } : { task, weld: DIVE_WELD[Math.floor(r(3) * DIVE_WELD.length)] };
}

// Story-Tauchgang Pumpwerk (0.21.0): erst das Tor aufschweißen, dann in der Halle suchen (eigene Szene, doppelte Luft)
const pumpTask = () => ({ task: 'weld', weld: { id: 'tor', name: DIVE_PUMP.name }, then: 'search', target: DIVE_STORY_TARGETS.pumpwerk, story: 'pumpwerk', scene: 'pumpwerk' });

/* ---------- DOM: Anzeigen über dem Bild ---------- */
let D = null;
function dom() {
  if (D) return D;
  const stage = document.getElementById('cineStage');
  const hud = document.createElement('div');
  hud.id = 'diveHud'; hud.className = 'cine-ov dive-hud'; hud.hidden = true;
  hud.innerHTML = `<div class="dv-task"></div><div class="dv-hint"></div><div class="dv-floats"></div><div class="dv-esc" hidden></div>
    <div class="dv-result" hidden role="dialog" aria-modal="true"></div>`;
  stage.appendChild(hud);
  D = { hud, task: hud.querySelector('.dv-task'), hint: hud.querySelector('.dv-hint'), floats: hud.querySelector('.dv-floats'), esc: hud.querySelector('.dv-esc'), res: hud.querySelector('.dv-result'), key: '' };
  return D;
}
// Anzeige auf den sichtbaren Teil des 16:9-Bilds legen; liefert die Umrechnung Bild → Bildschirm
function placeHud() {
  const V = stageView(), l = Math.max(0, V.ox), t = Math.max(0, V.oy), r = Math.min(V.cw, V.ox + W), b = Math.min(V.ch, V.oy + H);
  const key = [l, t, r, b, V.s].join();
  if (key !== D.key) { D.key = key; Object.assign(D.hud.style, { left: l * V.s + 'px', top: t * V.s + 'px', width: (r - l) * V.s + 'px', height: (b - t) * V.s + 'px' }); }
  return { x: (x) => (V.ox + x - l) * V.s, y: (y) => (V.oy + y - t) * V.s };
}

/* ---------- Spiel ---------- */
let G = null;                  // laufender Tauchgang
let pulseVig = null;
const worldOf = (o, stage) => buildWorld({ task: o.task, act: o.act, seed: o.seed, target: o.target, weld: o.weld, junk: DIVE_JUNK, cfg: CFG,
  scene: o.scene, stage, gate: DIVE_PUMP.gate, piles: DIVE_PUMP.piles });
function newGame(o) {
  const Wd = worldOf(o, 'gate'), airMax = CFG.air * (o.scene === 'pumpwerk' ? DIVE_PUMP.air : 1);
  const dv = { x: BELL_X + 6, y: 92, vx: 0, vy: 0, face: 1, anim: 0, mode: 'swim', ground: false, tx: null, ty: null };
  const rope = Array.from({ length: 22 }, (_, i) => ({ x: BELL_X, y: 50 + i, px: BELL_X, py: 50 + i }));
  return {
    o, Wd, dv, rope, t: 0, air: airMax, airMax, stage: 1, bt: 0, phase: 'pre', pt: 0, ptr: { x: 160, y: 90, down: false, sel: null, weld: false, credit: 0 },
    keys: new Set(), act: false, parts: [], junk: [], found: null, ok: false, escT: -9, breathe: 0, prog: 0, lastHint: '',
    schools: [makeSchool(9, (o.seed | 0) + 3, 70, 96, 1), makeSchool(6, (o.seed | 0) + 9, 104, 122, -1)], res: null, resolve: null, done: false
  };
}

// Haufen in Reichweite des Tauchers (der nächste ungeöffnete), oder der angeklickte
const pileReach = (g, p) => !p.open && Math.abs(g.dv.x - p.x) < CFG.reach + p.w / 2 && g.dv.y > p.y - 30;
const pileAt = (g, x, y) => g.Wd.piles.find(p => !p.open && Math.abs(x - p.x) < p.w / 2 + 3 && y > p.y - p.h - 6 && y < p.y + 5);
// Hand (beim Schweißen die Armhaltung, die am nächsten an T liegt)
function handOf(g, T) {
  let best = 1, bd = 1e9;
  if (T) WELD_ARMS.forEach((a, i) => { const o = handOff(a), d = Math.hypot(g.dv.x + g.dv.face * o.x - T.x, g.dv.y + o.y - T.y); if (d < bd) { bd = d; best = i; } });
  g.arm = best;
  const o = handOff(WELD_ARMS[best]);
  return { x: g.dv.x + g.dv.face * o.x, y: g.dv.y + o.y };
}
function seamNear(g, x, y, i0, i1) {
  const O = g.Wd.obj; let best = -1, bd = 1e9;
  for (let i = Math.max(0, Math.floor(i0)); i <= Math.min(O.len, Math.ceil(i1)); i++) { const p = O.pts[i], d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } }
  return { i: best, d: bd };
}

/* ---------- Partikel ---------- */
const P = {
  bubble: (g, x, y, r = 1) => g.parts.push({ k: 'b', x, y, vx: 0, vy: -(14 + Math.random() * 10), r, life: 9, ph: Math.random() * 6 }),
  dust: (g, x, y) => g.parts.push({ k: 'd', x, y, vx: (Math.random() - .5) * 18, vy: -Math.random() * 10 - 2, r: 2 + Math.random() * 3, life: 1.2 + Math.random() * .6, age: 0 }),
  spark: (g, x, y) => g.parts.push({ k: 's', x, y, vx: (Math.random() - .5) * 60, vy: (Math.random() - .7) * 50, life: .25 + Math.random() * .3, age: 0 }),
  glint: (g, x, y) => g.parts.push({ k: 'g', x, y, life: .7, age: 0 })
};
function stepParts(g, dt) {
  for (const p of g.parts) {
    p.life -= dt; p.age = (p.age || 0) + dt;
    if (p.k === 'b') { p.vy = Math.max(p.vy - 6 * dt, -34); p.x += Math.sin(g.t * 3 + p.ph) * 6 * dt; p.y += p.vy * dt; if (p.y < -4) p.life = 0; }
    else if (p.k === 'd') { p.vx *= Math.pow(.2, dt); p.vy *= Math.pow(.3, dt); p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 3; }
    else if (p.k === 's') { p.vx *= Math.pow(.05, dt); p.vy = p.vy * Math.pow(.05, dt) + 30 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  }
  g.parts = g.parts.filter(p => p.life > 0);
}
function drawParts(ctx, g, kind) {
  for (const p of g.parts) {
    if (p.k !== kind) continue;
    if (p.k === 'b') {
      const x = Math.round(p.x), y = Math.round(p.y);
      ctx.fillStyle = 'rgba(214,250,246,.85)';
      if (p.r <= 1) { ctx.fillRect(x, y, 1, 1); continue; }
      ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x, y - 1, 1, 1);
    } else if (p.k === 'd') {   // Staubwolke: geditherte Scheibe, wird durchsichtiger
      const a = clamp(p.life / 1.2, 0, 1) * .55, r = p.r, s = p.seed || (p.seed = 1 + Math.floor(Math.random() * 999));
      for (let yy = -Math.ceil(r); yy <= r; yy++) for (let xx = -Math.ceil(r); xx <= r; xx++) {
        const q = (xx * xx + yy * yy) / (r * r + 1);
        if (q > 1) continue;
        if (hash(xx, yy, s + Math.floor(p.age * 6)) < a * (1 - q)) { ctx.fillStyle = (xx + yy < 0) ? SAND[1] : SAND[2]; ctx.fillRect(Math.round(p.x + xx), Math.round(p.y + yy), 1, 1); }
      }
    } else if (p.k === 's') {
      ctx.fillStyle = p.age < .12 ? '#ffffff' : p.age < .3 ? '#ffe680' : '#ff9a40';
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    } else if (p.k === 'g') {   // Glitzern: kleines Kreuz, wächst und schrumpft
      const u = p.age / .7, s = Math.round(Math.sin(u * Math.PI) * 2.4), x = Math.round(p.x), y = Math.round(p.y);
      ctx.fillStyle = '#fffbe0'; ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = 'rgba(255,248,200,.85)';
      for (let k = 1; k <= s; k++) { ctx.fillRect(x - k, y, 1, 1); ctx.fillRect(x + k, y, 1, 1); ctx.fillRect(x, y - k, 1, 1); ctx.fillRect(x, y + k, 1, 1); }
    }
  }
}

/* ---------- Taucher ---------- */
function moveDiver(g, dt) {
  const dv = g.dv, k = g.keys, sp = CFG.speed;
  let ix = (k.has('a') || k.has('arrowleft') ? -1 : 0) + (k.has('d') || k.has('arrowright') ? 1 : 0);
  let iy = (k.has('w') || k.has('arrowup') ? -1 : 0) + (k.has('s') || k.has('arrowdown') ? 1 : 0);
  let wx = 0, wy = 0, steer = false;
  if (ix || iy) { const n = Math.hypot(ix, iy); wx = ix / n * sp; wy = iy / n * sp; dv.tx = null; steer = true; }
  else if (dv.tx != null) {
    const ex = dv.tx - dv.x, ey = dv.ty - dv.y, d = Math.hypot(ex, ey);
    if (d < 1.5) { dv.tx = null; }
    else { const s = Math.min(sp, d * 4); wx = ex / d * s; wy = ey / d * s; steer = true; }
  }
  const a = 1 - Math.pow(.004, dt);   // Wasser bremst
  dv.vx = lerp(dv.vx, wx, a); dv.vy = lerp(dv.vy, wy, a);
  if (!steer && !dv.ground) dv.vy = Math.min(dv.vy + 26 * dt, 14);      // Bleischuhe: sinkt langsam zum Boden
  dv.x = clamp(dv.x + dv.vx * dt, 10, W - 10);
  const gy = g.Wd.gy[clamp(Math.round(dv.x), 0, W - 1)];
  dv.y = dv.y + dv.vy * dt;
  dv.ground = dv.y >= gy;
  if (dv.y > gy) { dv.y = gy; dv.vy = Math.min(0, dv.vy); }
  if (dv.y < 82) { dv.y = 82; dv.vy = Math.max(0, dv.vy); }
  if (Math.abs(dv.vx) > 3 && g.mode !== 'weld') dv.face = dv.vx > 0 ? 1 : -1;
  const v = Math.hypot(dv.vx, dv.vy);
  dv.anim += dt * (dv.ground ? v / 7 : 3 + v / 12);
  dv.mode = dv.ground ? (Math.abs(dv.vx) > 4 ? 'walk' : 'idle') : 'swim';
}
function stepRope(g, dt, A) {
  const R = g.rope, dv = g.dv, n = R.length;
  const B = { x: dv.x + dv.face * (HOSE_AT.x - DIVER_FX), y: dv.y - (DIVER_FY - HOSE_AT.y) };
  const rest = (Math.hypot(B.x - A.x, B.y - A.y) * 1.12 + 26) / (n - 1);
  for (const p of R) {   // Verlet mit viel Wasserwiderstand
    const vx = (p.x - p.px) * .86, vy = (p.y - p.py) * .86;
    p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + 9 * dt * dt * 60;
  }
  for (let it = 0; it < 8; it++) {
    R[0].x = A.x; R[0].y = A.y; R[n - 1].x = B.x; R[n - 1].y = B.y;
    for (let i = 0; i < n - 1; i++) {
      const a = R[i], b = R[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - rest) / d * .5;
      if (i > 0) { a.x += dx * f; a.y += dy * f; }
      if (i < n - 2) { b.x -= dx * f; b.y -= dy * f; }
    }
    for (const p of R) { const gy = g.Wd.gy[clamp(Math.round(p.x), 0, W - 1)] - 1; if (p.y > gy) p.y = gy; }
  }
}
function drawRope(ctx, g) {
  const R = g.rope;
  for (let i = 0; i < R.length - 1; i++) {
    const a = R[i], b = R[i + 1], m = Math.ceil(Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))) || 1;
    for (let k = 0; k < m; k++) {
      const x = Math.round(lerp(a.x, b.x, k / m)), y = Math.round(lerp(a.y, b.y, k / m));
      ctx.fillStyle = HOSE[2]; ctx.fillRect(x, y + 1, 1, 1);
      ctx.fillStyle = HOSE[1]; ctx.fillRect(x, y, 1, 1);
      if (((i * 7 + k) % 9) === 0) { ctx.fillStyle = HOSE[0]; ctx.fillRect(x, y, 1, 1); }
    }
  }
}
function diverImg(g) {
  const A = art().diver, dv = g.dv;
  if (g.phase === 'won' && g.o.task === 'search') return A.hold[0];
  if (g.mode === 'dig') return A.dig[Math.floor(g.t * 6) % 2];
  if (g.mode === 'weld') return A.weld[g.arm | 0][Math.floor(g.t * 10) % 2];
  const set = A[dv.mode] || A.idle;
  return set[Math.floor(dv.anim) % set.length];
}
function drawDiver(ctx, g) {
  const dv = g.dv, im = diverImg(g), bob = dv.ground ? 0 : Math.round(Math.sin(g.t * 2.2) * .8);
  const x = Math.round(dv.x), y = Math.round(dv.y) + bob;
  if (dv.face > 0) ctx.drawImage(im, x - DIVER_FX, y - DIVER_FY);
  else { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(im, -x - (im.width - DIVER_FX), y - DIVER_FY); ctx.restore(); }
}

/* ---------- Aufgaben ---------- */
function updateSearch(g, dt) {
  const ptr = g.ptr;
  let pile = null;
  if (ptr.down && ptr.sel && pileReach(g, ptr.sel)) pile = ptr.sel;
  else if (g.act) pile = g.Wd.piles.filter(p => pileReach(g, p)).sort((a, b) => Math.abs(a.x - g.dv.x) - Math.abs(b.x - g.dv.x))[0] || null;
  if (!pile && ptr.credit > 0 && ptr.sel && pileReach(g, ptr.sel)) pile = ptr.sel;
  g.mode = null;
  if (pile) {
    let d = 0;
    if ((ptr.down && ptr.sel === pile) || g.act) d = dt;
    if (ptr.credit > 0) { const c = Math.min(ptr.credit, dt * 2.5); ptr.credit -= c; d = Math.max(d, c); }
    if (d > 0) {
      g.mode = 'dig'; g.dv.face = pile.x >= g.dv.x ? 1 : -1; g.dv.tx = null;
      pile.prog = Math.min(1, pile.prog + d / CFG.dig);
      if (Math.random() < dt * 14) P.dust(g, pile.x + (Math.random() - .5) * pile.w * .6, pile.y - pile.h * (1 - pile.prog) * .6);
      if (pile.prog >= 1) openPile(g, pile);
    }
  } else if (!ptr.down) ptr.credit = 0;
  // Hinweise am Ziel: Glitzern und kleine Blasen (nur für Aufmerksame)
  for (const p of g.Wd.piles) {
    if (p.kind !== 'target' || p.open) continue;
    p.gl = (p.gl || hash(p.x, 1, 3) * 2) - dt;
    if (p.gl <= 0) { p.gl = 2.2 + Math.random() * 1.2; P.glint(g, p.x + (Math.random() - .5) * p.w * .5, p.y - p.h * (1 - p.prog) * .7 - 1); }
    p.bb = (p.bb || 1) - dt;
    if (p.bb <= 0) { p.bb = 1.4 + Math.random() * 1.4; P.bubble(g, p.x + (Math.random() - .5) * 6, p.y - p.h * (1 - p.prog) - 1, 1); }
  }
}
function openPile(g, p) {
  p.open = true; p.openT = g.t;
  for (let i = 0; i < 10; i++) P.dust(g, p.x + (Math.random() - .5) * p.w, p.y - 3);
  if (p.kind === 'target') { g.found = g.o.target; win(g, p); return; }
  if (p.kind === 'junk' && p.junk) { g.junk.push(p.junk); float(g, p.x, p.y - 16, `${img(SPR.item[p.junk.it], 2)}<b>+${p.junk.n}</b> ${esc(ITEMS[p.junk.it] ? ITEMS[p.junk.it].name : p.junk.it)}`); }
  else float(g, p.x, p.y - 14, 'Nur Sand');
}
function updateWeld(g, dt) {
  const O = g.Wd.obj, ptr = g.ptr;
  g.mode = null; g.torch = null;
  if (O.open) return;
  let T = null, keyb = false;
  if (ptr.down && ptr.weld) T = { x: ptr.x, y: ptr.y };
  else if (g.act) { const p = O.pts[Math.min(O.len, Math.floor(O.prog))]; T = { x: p.x, y: p.y }; keyb = true; }
  if (!T) return;
  // Taucher stellt sich neben die Stelle (Hand etwa 6 Pixel daneben); mit Tastatur zieht es ihn sanft hin, wenn keine Taste lenkt
  const want = (face) => ({ x: T.x - face * 9, y: Math.min(T.y - HAND.y, g.Wd.gy[clamp(Math.round(T.x - face * 9), 0, W - 1)]) });
  if (T.x > g.dv.x + 4) g.dv.face = 1; else if (T.x < g.dv.x - 4) g.dv.face = -1;
  const w = want(g.dv.face), moving = ['a', 'd', 'w', 's', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].some(k => g.keys.has(k));
  if (!keyb) { g.dv.tx = w.x; g.dv.ty = w.y; }
  else if (!moving) { g.dv.x = lerp(g.dv.x, w.x, 1 - Math.pow(.35, dt)); g.dv.y = lerp(g.dv.y, w.y, 1 - Math.pow(.35, dt)); }
  const hd = handOf(g, T), reach = Math.hypot(T.x - hd.x, T.y - hd.y);
  if (reach > LANCE) return;
  g.mode = 'weld'; g.torch = { hx: hd.x, hy: hd.y, x: T.x, y: T.y };
  const on = keyb ? { i: O.prog, d: 0 } : seamNear(g, T.x, T.y, O.prog - 6, O.prog + 14);
  if (on.i >= 0 && on.d <= CFG.tol) {
    const before = O.prog;
    O.prog = Math.min(O.len, keyb ? O.prog + CFG.weld * .8 * dt : O.prog + clamp(on.i - O.prog, 0, CFG.weld * dt));
    for (let i = Math.floor(before); i <= Math.floor(O.prog); i++) if (O.heat[i] == null) O.heat[i] = g.t;
    if (Math.random() < dt * 40) P.spark(g, T.x, T.y);
    g.torch.cut = true;
    if (O.prog >= O.len) { O.open = true; O.openT = g.t; for (let i = 0; i < 26; i++) P.bubble(g, O.box.x0 + Math.random() * (O.box.x1 - O.box.x0), O.box.y0 + Math.random() * (O.box.y1 - O.box.y0), Math.random() < .5 ? 2 : 1); win(g, null); }
  } else if (Math.random() < dt * 10) P.spark(g, T.x, T.y);   // neben der Naht: nur ein paar Funken, kein Fortschritt
}
const OPEN_TXT = { kiste: 'Die Kiste ist offen!', tuer: 'Die Tür ist offen!', tor: 'Das Tor ist offen!' };
function win(g, pile) {
  if (g.phase !== 'play') return;
  g.ptr.down = false; g.act = false;
  // Zweiteiliger Tauchgang (Pumpwerk): nach dem Tor geht es in die Halle, die Luft läuft weiter
  if (g.o.then && g.stage === 1) { g.phase = 'swap'; g.pt = 0; banner(g, OPEN_TXT[g.Wd.obj.kind] || 'Offen!', true); return; }
  g.phase = 'won'; g.pt = 0; g.ok = true; g.winPile = pile;
  banner(g, g.o.task === 'search' ? `Gefunden: ${g.o.target.name}!` : OPEN_TXT[g.Wd.obj.kind] || 'Offen!', true);
  settle(g);
}
// Wechsel in die Halle (Pumpwerk): neuer Platz, Taucher steht drinnen, Aufgabe Suchen
const SWAP_OUT = 1.6, SWAP_DARK = .8;
function enterHall(g) {
  g.stage = 2; g.o.task = g.o.then;
  g.Wd = worldOf(g.o, 'hall');
  Object.assign(g.dv, { x: 66, y: g.Wd.gy[66], vx: 0, vy: 0, face: 1, tx: null, ty: null });
  for (const p of g.rope) { p.x = p.px = BELL_X; p.y = p.py = 60; }
  g.parts = []; g.mode = null; g.torch = null; g.ptr.sel = null; g.ptr.credit = 0;
  g.phase = 'in'; g.pt = 0; g.bt = g.t;
  banner(g, `Finde: ${g.o.target.name}`, true);
}
function lose(g, why) {
  if (g.phase !== 'play' && g.phase !== 'in') return;
  g.phase = 'lost'; g.pt = 0; g.ok = false; g.why = why; g.ptr.down = false; g.act = false;
  banner(g, why === 'air' ? 'Die Luft wird knapp!' : 'Auftauchen …', true);
  settle(g);
}
// Ergebnis an den Aufrufer (ui/dive.js schickt diveEnd); das Bild bleibt offen bis zum Ergebnisfenster
function settle(g) {
  if (!g.resolve) return;
  const r = { ok: g.ok, junk: g.junk.slice() };
  if (g.ok && g.o.story) r.found = g.o.story;
  g.resolve(r); g.resolve = null;
}

/* ---------- Anzeigen ---------- */
function banner(g, text, big) {
  D.task.innerHTML = `<span>${esc(text)}</span>`;
  D.task.className = 'dv-task' + (big ? ' big' : '');
}
function hint(g, text) { if (g.lastHint === text) return; g.lastHint = text; D.hint.textContent = text; D.hint.classList.toggle('on', !!text); }
function float(g, x, y, html) {
  const el = document.createElement('div');
  el.className = 'dv-float'; el.innerHTML = html; el.dataset.x = x; el.dataset.y = y;
  D.floats.appendChild(el);
  const M = placeHud();
  el.style.left = M.x(x) + 'px'; el.style.top = M.y(y) + 'px';
  setTimeout(() => el.remove(), 2600);
}
function drawAir(ctx, g) {
  const u = clamp(g.air / g.airMax, 0, 1), low = u < CFG.warn, blink = low && Math.floor(g.t * 4) % 2 === 0;
  const V = stageView(), x = Math.max(0, -V.ox) + 8, y = Math.max(0, -V.oy) + 6, w = 72;   // oben links im sichtbaren Teil (breite Bildschirme beschneiden oben)
  glyphText((px, py, c) => { ctx.fillStyle = c; ctx.fillRect(px, py, 1, 1); }, 'LUFT', x, y + 1, low ? (blink ? '#ff8a80' : '#f0d8c0') : '#d8f4f0');
  const bx = x + 18;
  ctx.fillStyle = '#081420'; ctx.fillRect(bx - 1, y - 1, w + 2, 9);
  ctx.fillStyle = BRASS[3]; ctx.fillRect(bx, y, w, 7);
  ctx.fillStyle = BRASS[1]; ctx.fillRect(bx, y, w, 1);
  ctx.fillStyle = '#0c1c2a'; ctx.fillRect(bx + 1, y + 1, w - 2, 5);
  const fw = Math.round((w - 2) * u);
  ctx.fillStyle = low ? (blink ? '#ff5a4a' : '#c02a28') : u < .5 ? '#7ad8c8' : '#9ef0e0'; ctx.fillRect(bx + 1, y + 1, fw, 5);
  ctx.fillStyle = low ? '#ff9a88' : '#e0fff8'; ctx.fillRect(bx + 1, y + 1, fw, 1);
  for (let i = 1; i < 4; i++) { ctx.fillStyle = 'rgba(8,20,32,.6)'; ctx.fillRect(bx + Math.round((w - 2) * i / 4), y + 1, 1, 5); }
  // Blase als Zeichen
  ctx.fillStyle = '#d8f4f0'; ctx.fillRect(bx + w + 4, y + 1, 3, 1); ctx.fillRect(bx + w + 3, y + 2, 1, 3); ctx.fillRect(bx + w + 7, y + 2, 1, 3); ctx.fillRect(bx + w + 4, y + 5, 3, 1); ctx.fillRect(bx + w + 4, y + 2, 1, 1);
}
// Herzschlag: doppelter Puls (wie „bumm-bumm“), schneller, je weniger Luft
function heartbeat(g) {
  const u = clamp(g.air / g.airMax, 0, 1);
  if (u >= CFG.warn) return 0;
  const per = lerp(.55, .95, u / CFG.warn), ph = (g.t % per) / per;
  const b = (c, w) => Math.max(0, 1 - Math.abs(ph - c) / w);
  return Math.max(b(.06, .08), b(.27, .08) * .7);
}

/* ---------- Bild ---------- */
function render(ctx, g, dt) {
  const A = art(), Wd = g.Wd, t = g.t;
  ctx.drawImage(Wd.bg, 0, 0);
  drawRays(ctx, t, Wd.hall ? .34 : .2);
  if (Wd.hall) glow(ctx, 162, 10, 120, .14, '150,230,225');   // Licht durch das Dachloch
  drawFish(ctx, g.schools[1], t, dt, { x: g.dv.x, y: g.dv.y - 18, r: 38 });
  // Glocke mit Kette, Blasen aus dem Rand
  drawChain(ctx, BELL_X + Math.round(Math.sin(t * .8)), 0, BELL_Y + 2);
  const port = drawBell(ctx, BELL_X, BELL_Y, t, true);
  g.port = port;
  ctx.drawImage(Wd.floor, 0, 0);
  // Kiste oder Wracktür mit Naht
  if (Wd.obj) drawObj(ctx, g);
  // Haufen
  for (const p of Wd.piles) {
    if (p.open) {
      ctx.drawImage(p.dip, Math.round(p.x - p.dip.width / 2), p.y - 4);
      if (p.kind === 'junk' && p.junk && t - p.openT < 2.4) { const s = SPR.item[p.junk.it]; if (s) ctx.drawImage(s.cv, Math.round(p.x - s.w / 2), p.y - s.h - 1 - Math.round(Math.min(1, (t - p.openT) * 3) * 4)); }
      if (p.kind === 'target' && g.phase === 'won') { /* Ziel ist beim Taucher */ }
      continue;
    }
    const st = p.prog < .25 ? 0 : p.prog < .5 ? 1 : p.prog < .75 ? 2 : 3, im = p.img[st];
    ctx.drawImage(im, Math.round(p.x - im.width / 2), p.y - im.height + 2);
    if (p.prog > 0 && p.prog < 1) {   // Fortschritt als kleiner Balken
      ctx.fillStyle = '#081420'; ctx.fillRect(Math.round(p.x - 9), p.y - p.h - 9, 18, 3);
      ctx.fillStyle = '#e8d8a0'; ctx.fillRect(Math.round(p.x - 8), p.y - p.h - 8, Math.round(16 * p.prog), 1);
    }
  }
  drawWeeds(ctx, Wd, t);
  drawRope(ctx, g);
  drawDiver(ctx, g);
  // gefundenes Ziel steigt zum Taucher hoch und glänzt
  if (g.phase === 'won' && g.found) {
    const im = itemSprite(g.found.id), u = ease(Math.min(1, g.pt / .7)), wp = g.winPile;
    const sx = wp ? wp.x : g.dv.x, sy = wp ? wp.y - 4 : g.dv.y;
    const x = lerp(sx, g.dv.x + g.dv.face * 4, u), y = lerp(sy, g.dv.y - 44, u);
    glow(ctx, x, y, 16, .35 + Math.sin(t * 6) * .1, '255,240,170');
    ctx.drawImage(im, Math.round(x - im.width / 2), Math.round(y - im.height / 2));
    if (Math.random() < dt * 5) P.glint(g, x + (Math.random() - .5) * 10, y + (Math.random() - .5) * 8);
  }
  ctx.drawImage(Wd.fg, 0, 0);
  drawFish(ctx, g.schools[0], t, dt, { x: g.dv.x, y: g.dv.y - 18, r: 44 });
  drawParts(ctx, g, 'd'); drawParts(ctx, g, 'b'); drawParts(ctx, g, 's'); drawParts(ctx, g, 'g');
  drawMotes(ctx, t, 60, (g.o.seed | 0) + 1);
  // Brenner: Lanze von der Hand zur Flamme, Licht
  if (g.torch) {
    const T = g.torch, n = Math.ceil(Math.hypot(T.x - T.hx, T.y - T.hy));
    for (let k = 0; k < n - 2; k++) { ctx.fillStyle = k % 3 ? '#3a4048' : '#6a747c'; ctx.fillRect(Math.round(lerp(T.hx, T.x, k / n)), Math.round(lerp(T.hy, T.y, k / n)), 1, 1); }
    const fl = .7 + Math.random() * .3;
    glow(ctx, T.x, T.y, 22, .45 * fl, '200,230,255');
    glow(ctx, T.x, T.y, 8, .7 * fl, '255,250,230');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(T.x), Math.round(T.y), 1, 1);
    ctx.fillStyle = '#bfe8ff'; ctx.fillRect(Math.round(T.x) - 1, Math.round(T.y), 1, 1); ctx.fillRect(Math.round(T.x), Math.round(T.y) - 1, 1, 1);
  }
  // Kiste/Tür springt auf: Lichtschein
  if (Wd.obj && Wd.obj.open) { const B = Wd.obj.box, u = clamp((t - Wd.obj.openT) / .5, 0, 1); glow(ctx, (B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2 + 4, 40, .4 * (1 - u * .5), '255,226,150'); }
  drawAir(ctx, g);
  const hb = heartbeat(g);
  if (hb > 0) { ctx.globalAlpha = .25 + hb * .55; ctx.drawImage(pulseVig, 0, 0); ctx.globalAlpha = 1; }
}
// Kiste bzw. Wracktür und die Naht (ungeschnitten: Schweißraupe, geschnitten: glühend, dann dunkler Spalt)
function drawObj(ctx, g) {
  const O = g.Wd.obj, t = g.t;
  if (O.kind === 'kiste') {
    if (O.open) { ctx.drawImage(O.imgOpen, O.x, O.y); const u = ease(clamp((t - O.openT) / .35, 0, 1)); if (u >= 1) ctx.drawImage(O.hatch, O.box.x0 - 2, O.box.y1 - 2); }
    else ctx.drawImage(O.imgClosed, O.x, O.y);
  } else ctx.drawImage(O.open && t - O.openT > .25 ? O.imgOpen : O.imgClosed, O.x, O.y);
  if (O.open && t - O.openT > .4) return;
  for (let i = 0; i <= O.len; i++) {
    const p = O.pts[i], x = Math.round(p.x), y = Math.round(p.y), h = O.heat[i];
    if (h == null) {   // Schweißraupe: hell, leicht knubbelig
      ctx.fillStyle = (i % 3) ? '#a8b4b4' : '#d0d8d4'; ctx.fillRect(x, y, 1, 1);
      if (i % 3 === 0) { ctx.fillStyle = '#7a8686'; ctx.fillRect(x + (p.y === O.pts[Math.min(O.len, i + 1)].y ? 0 : 1), y + (p.y === O.pts[Math.min(O.len, i + 1)].y ? 1 : 0), 1, 1); }
    } else {
      const a = t - h;
      ctx.fillStyle = a < .3 ? '#fff6d0' : a < 1.2 ? '#ffb040' : a < 3 ? '#c84a24' : a < 6 ? '#6a2a1c' : '#0a1218';
      ctx.fillRect(x, y, 1, 1);
      if (a < 1.2) { ctx.fillStyle = 'rgba(255,170,60,.5)'; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); }
    }
  }
  // Startpunkt blinkt (wo man anfangen muss)
  if (O.prog < O.len) {
    const p = O.pts[Math.floor(O.prog)], on = Math.floor(t * 3) % 2 === 0;
    if (on) { ctx.fillStyle = '#fff2a0'; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); ctx.fillStyle = '#ff9a40'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
  }
}

/* ---------- Ablauf je Bild ---------- */
function frame(g, ctxV, now, dt) {
  const V = stageView();
  if (g.phase === 'pre') {   // Karte blendet nach Schwarz (Schleier)
    g.pt += dt;
    ctxV.clearRect(0, 0, V.cw, V.ch);
    stageBlack(ctxV, ease(g.pt / PRE));
    if (g.pt >= PRE) { stageVeil(false); g.phase = 'in'; g.pt = 0; }
    return;
  }
  g.pt += dt; g.t += dt;
  const live = g.phase === 'in' || g.phase === 'play';
  if (g.phase === 'in' && g.pt >= IN) { g.phase = 'play'; g.pt = 0; }
  if (g.phase === 'swap' && g.pt >= SWAP_OUT + SWAP_DARK) enterHall(g);
  if (g.phase === 'play') {
    g.air -= dt;
    if (g.air <= 0) { g.air = 0; lose(g, 'air'); }
  }
  if (live) {
    moveDiver(g, dt);
    if (g.o.task === 'search') updateSearch(g, dt); else updateWeld(g, dt);
  } else { g.mode = (g.phase === 'won' || g.phase === 'swap') && g.o.task === 'weld' ? null : g.mode; g.torch = null; moveDiver(g, dt); }
  // Atmen: Blasen aus dem Helm (öfter, wenn die Luft knapp wird)
  g.breathe -= dt;
  if (g.breathe <= 0) { const u = g.air / g.airMax; g.breathe = u < CFG.warn ? .45 : 1.3; const n = 2 + (Math.random() < .5 ? 1 : 0); for (let i = 0; i < n; i++) P.bubble(g, g.dv.x - g.dv.face * 3 + Math.random() * 2, g.dv.y - 35 - i * 2, i ? 1 : 2); }
  for (const v of g.Wd.vents) if (((g.t + v.t0) % 3.1) < dt) P.bubble(g, v.x, g.Wd.gy[v.x] - 1, 1);
  if (Math.random() < dt * 3) P.bubble(g, BELL_X + (Math.random() - .5) * 40, BELL_Y + 40, Math.random() < .3 ? 2 : 1);
  stepRope(g, dt, g.port || { x: BELL_X, y: BELL_Y + 42 });
  stepParts(g, dt);
  const sc = stageScene();
  render(sc, g, dt);
  // Abblenden: Aufgeben/keine Luft = langsam dunkel mit enger werdendem Rand; Fund = nach dem Zeigen
  let dark = 0;
  if (g.phase === 'in') dark = 1 - ease(g.pt / IN);
  if (g.phase === 'won') dark = clamp((g.pt - (WON - OUTF)) / OUTF, 0, 1);
  if (g.phase === 'swap') dark = clamp((g.pt - SWAP_OUT) / SWAP_DARK, 0, 1);
  if (g.phase === 'lost') { dark = clamp(g.pt / LOST, 0, 1); sc.globalAlpha = dark * .9; sc.drawImage(pulseVig, 0, 0); sc.globalAlpha = 1; }
  if (g.phase === 'result') dark = .62;
  stageBlit(ctxV);
  stageBlack(ctxV, dark);
  placeHud();
  if ((g.phase === 'won' && g.pt >= WON) || (g.phase === 'lost' && g.pt >= LOST)) { g.phase = 'result'; g.pt = 0; showResult(g); }
  // Bedienhinweis
  if (g.phase === 'play' || g.phase === 'in') {
    if (g.t - g.bt > 3.2 && D.task.classList.contains('big')) banner(g, g.o.task === 'search' ? `Finde: ${g.o.target.name}` : g.o.weld.name, false);
    const near = g.o.task === 'search' ? g.Wd.piles.some(p => pileReach(g, p)) : false;
    hint(g, g.t - g.bt < 9 ? (g.o.task === 'search' ? 'Klick: hinschwimmen · Auf einem Haufen halten: graben · WASD/Pfeile, Leertaste/E halten' : 'Am blinkenden Punkt die Maustaste halten und der Naht folgen · WASD/Pfeile, Leertaste/E halten')
      : near && g.o.task === 'search' && g.mode !== 'dig' ? 'Halten (Maus, Leertaste oder E): graben' : '');
  } else hint(g, '');
}

/* ---------- Ergebnisfenster ---------- */
const lootRows = (l) => l.map(o => `<div class="dv-row">${SPR.item[o.it] ? img(SPR.item[o.it], 2) : ''}<span><b>${fmt(o.n)}</b> ${esc(ITEMS[o.it] ? ITEMS[o.it].name : o.it)}</span></div>`).join('');
function showResult(g) {
  D.task.className = 'dv-task'; D.task.innerHTML = '';
  D.res.hidden = false;
  fillResult(g);
}
function fillResult(g) {
  const r = g.res, found = g.ok && g.found, it = found ? itemSprite(g.found.id) : null, k = it && it.width > 40 ? 3 : it && it.width > 24 ? 2 : 4;
  let h = `<div class="dv-rhead">${g.ok ? 'Tauchgang geschafft' : g.why === 'air' ? 'Die Luft wurde knapp' : 'Aufgetaucht'}</div>`;
  // Story-Fund: nur Beschreibung (desc) und nächstes Ziel (goal), keine Erklärung
  if (found) h += `<div class="dv-main"><img class="px" src="${it.toDataURL()}" width="${it.width * k}" height="${it.height * k}" alt=""><span><b>${esc(g.found.name)}</b>${g.found.desc ? `<br>${esc(g.found.desc)}` : ''}${g.o.story && g.found.goal ? `<br><span class="dv-muted">${esc(g.found.goal)}</span>` : ''}</span></div>`;
  else if (g.ok) h += `<div class="dv-main"><span><b>${esc(g.Wd.obj.kind === 'kiste' ? 'Die Kiste ist offen.' : 'Die Tür ist offen.')}</b></span></div>`;
  else h += `<div class="dv-muted">Ohne Hauptbeute zurück. ${g.junk.length ? 'Der Kleinkram ist mit oben.' : ''}${g.o.scene === 'pumpwerk' ? ' Die großen Blasen bleiben: Du kannst es noch einmal versuchen.' : ''}</div>`;
  if (!r) h += g.o.probe ? `<div class="dv-muted">Probe-Tauchgang (Debug): keine Beute.${g.junk.length ? '' : ''}</div>${g.junk.length ? `<div class="dv-sub">Kleinkram</div>${lootRows(g.junk)}` : ''}`
    : `<div class="dv-muted">Die Glocke steigt auf &hellip;</div>`;
  else {
    if (r.main && r.main.length) h += `<div class="dv-sub">Beute</div>${lootRows(r.main)}`;
    if (r.small && r.small.length) h += `<div class="dv-sub">Kleinkram</div>${lootRows(r.small)}`;
    const where = [];
    if (r.got && r.got.length) where.push('an Bord');
    if (r.home && r.home.length) where.push('ins Lager der Heimatinsel');
    if (where.length) h += `<div class="dv-muted">Geht ${where.join(' und ')}.${r.lost && r.lost.length ? ` <b>Kein Platz</b> für ${r.lost.map(o => `${fmt(o.n)} ${esc(ITEMS[o.it].name)}`).join(', ')}.` : ''}</div>`;
    else if (!(r.main && r.main.length) && !(r.small && r.small.length)) h += `<div class="dv-muted">Nichts Brauchbares.</div>`;
  }
  h += `<div class="dv-btns"><button type="button" class="btn btn-green btn-sm" data-dv="close" ${!r && !g.o.probe ? 'disabled' : ''}>Zurück zur Karte</button></div>`;
  D.res.innerHTML = h;
  const b = D.res.querySelector('[data-dv="close"]');
  b.onclick = (e) => { e.stopPropagation(); closeGame(g); };
  if (!b.disabled) setTimeout(() => b.focus({ preventScroll: true }), 50);
}
// diveResult vom Host (ui/dive.js): true = angezeigt (keine Meldung nötig)
function onResult(ev) {
  const g = G;
  if (!g || g.done || g.o.probe) return false;
  g.res = ev;
  if (g.phase === 'result') fillResult(g);
  // Fällt das Ergebnis nicht aus (z. B. abgebrochen), trotzdem schließen lassen
  return true;
}
function closeGame(g) {
  if (g.done) return;
  g.done = true;
  D.res.hidden = true; D.res.innerHTML = ''; D.hud.hidden = true; D.floats.innerHTML = '';
  document.getElementById('cine').classList.remove('dive');
  if (G === g) G = null;
  stageClose(() => { if (g.closed) g.closed(); }, !reducedMotion());
}

/* ---------- Eingabe ---------- */
function toScene(e) {
  const cv = document.getElementById('cineCv'), r = cv.getBoundingClientRect(), V = stageView();
  return { x: (e.clientX - r.left) / r.width * V.cw - V.ox, y: (e.clientY - r.top) / r.height * V.ch - V.oy };
}
let inputOn = false;
function bindInput() {
  if (inputOn) return;
  inputOn = true;
  const cv = document.getElementById('cineCv');
  cv.addEventListener('pointerdown', (e) => {
    const g = G; if (!g || (g.phase !== 'play' && g.phase !== 'in')) return;
    const p = toScene(e), ptr = g.ptr;
    ptr.x = p.x; ptr.y = p.y; ptr.down = true; ptr.weld = false; ptr.sel = null;
    try { cv.setPointerCapture(e.pointerId); } catch (_) { /* egal */ }
    if (g.o.task === 'search') {
      const pile = pileAt(g, p.x, p.y);
      if (pile) {
        ptr.sel = pile;
        if (pileReach(g, pile)) ptr.credit += CFG.click;
        else { g.dv.tx = clamp(pile.x + (g.dv.x < pile.x ? -1 : 1) * (pile.w / 2 + 4), 10, W - 10); g.dv.ty = pile.y; }
        return;
      }
    } else {
      const O = g.Wd.obj, s = seamNear(g, p.x, p.y, 0, O.len);
      if (!O.open && s.d < 12) { ptr.weld = true; return; }
    }
    g.dv.tx = clamp(p.x, 10, W - 10); g.dv.ty = clamp(p.y + 18, 82, 999);
  });
  cv.addEventListener('pointermove', (e) => { const g = G; if (!g) return; const p = toScene(e); g.ptr.x = p.x; g.ptr.y = p.y; });
  const up = () => { const g = G; if (g) g.ptr.down = false; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  window.addEventListener('keydown', (e) => {
    const g = G; if (!g || g.done) return;
    const k = e.key.toLowerCase();
    if (g.phase === 'result') { if ((k === 'enter' || k === ' ' || k === 'escape') && (g.res || g.o.probe)) { e.preventDefault(); closeGame(g); } return; }
    if (['w', 'a', 's', 'd', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) { g.keys.add(k); e.preventDefault(); }
    if (k === ' ' || k === 'e') { g.act = true; e.preventDefault(); }
  }, true);
  window.addEventListener('keyup', (e) => {
    const g = G; if (!g) return;
    const k = e.key.toLowerCase();
    g.keys.delete(k);
    if (k === ' ' || k === 'e') g.act = false;
  }, true);
  window.addEventListener('blur', () => { const g = G; if (g) { g.keys.clear(); g.act = false; g.ptr.down = false; } });
}

/* ---------- Start ---------- */
// o = { task, target, weld, story, act, seed, probe, intro }; liefert Promise { ok, found, junk } (Ende des Spiels),
// o.closed() wird aufgerufen, wenn das Ergebnisfenster zu ist
function runGame(o, fromScene) {
  dom(); bindInput();
  if (!pulseVig) pulseVig = vignette('#5a0a18', 1.7, .92);
  const g = newGame(o);
  G = g;
  return new Promise(resolve => {
    g.resolve = resolve;
    g.closed = o.closed;
    const calm = !reducedMotion();
    if (fromScene || !calm) { g.phase = 'in'; g.pt = calm ? 0 : IN; }
    const h = {
      frame(now, dt) { if (G === g && !g.done) frame(g, ctx, now, dt); },
      advance() {},
      skip() {   // Esc: zweimal kurz hintereinander = auftauchen
        if (g.phase === 'result') { if (g.res || g.o.probe) closeGame(g); return; }
        if (g.phase !== 'play' && g.phase !== 'in') return;
        if (g.t - g.escT < 2.5) { D.esc.hidden = true; lose(g, 'esc'); return; }
        g.escT = g.t; D.esc.hidden = false; D.esc.textContent = 'Esc noch einmal: auftauchen (ohne Hauptbeute)';
        setTimeout(() => { if (g.t - g.escT >= 2.4) D.esc.hidden = true; }, 2600);
      }
    };
    const ctx = stageOpen('film', h, { veil: g.phase === 'pre' });
    document.getElementById('cine').classList.add('dive');
    stageSkip(false);
    D.hud.hidden = false; D.res.hidden = true; D.esc.hidden = true; D.floats.innerHTML = '';
    banner(g, g.o.task === 'search' ? `Finde: ${g.o.target.name}` : g.o.weld.name, true);
    hint(g, '');
  });
}

// Tauchgang am Spot (setDiveGame): erst ggf. cs_abstieg, dann das Spiel
// Läuft noch ein Dialog oder eine Szene auf der Bühne (z. B. Brann nach dem ersten Auftauchen), erst danach abtauchen:
// sonst übernimmt das Spiel die Bühne, der Dialog endet nie und die Story-Warteschlange bliebe stehen
const stageFree = () => new Promise(res => { const go = () => stageMode() ? setTimeout(go, 200) : res(); go(); });
export async function playDive(spot, info = {}) {
  const T = taskFor(spot, info.act);
  forceTask = null;
  await stageFree();
  let fromScene = false;
  if (info.intro && hasScene('cs_abstieg')) {
    const halt = !NET_S.active();   // Einzelspieler: Szene hält die Zeit an; im Koop sieht sie nur der Taucher, die Welt läuft weiter
    if (halt) simClient().setSpeed(ui.speed, true);
    try { await playScene('cs_abstieg', { dialog: null, canSkip: true }); } catch (e) { console.error('cs_abstieg', e); }
    if (halt) simClient().setSpeed(ui.speed, ui.halt);
    fromScene = true;
  }
  return runGame(Object.assign({ act: info.act || 3, seed: spot ? spot.id : 1 }, T), fromScene);
}
// Debug: Probe ohne Host (keine Beute, kein Spot)
export function debugDiveGame(o = {}) {
  const act = o.act || 3, seed = o.seed != null ? o.seed : Math.floor(Math.random() * 1e6);
  let T;
  if (o.story === 'pumpwerk') T = pumpTask();
  else if (o.story) T = { task: 'search', target: DIVE_STORY_TARGETS[o.story], story: o.story };
  else if ((o.task || 'search') === 'search') T = { task: 'search', target: DIVE_TARGETS.find(x => x.id === o.target) || DIVE_TARGETS[seed % DIVE_TARGETS.length] };
  else T = { task: 'weld', weld: DIVE_WELD.find(x => x.id === o.weld) || DIVE_WELD[seed % DIVE_WELD.length] };
  const go = async () => {
    if (o.intro && hasScene('cs_abstieg')) { await playScene('cs_abstieg', { dialog: null }); return runGame(Object.assign({ act, seed, probe: true }, T), true); }
    return runGame(Object.assign({ act, seed, probe: true }, T), false);
  };
  return go();
}
// Debug/Prüfen: laufendes Spiel (für Tests: Zustand lesen, Luft setzen)
export const diveGameState = () => G;

setDiveGame(playDive);
setDiveResultHook(onResult);
