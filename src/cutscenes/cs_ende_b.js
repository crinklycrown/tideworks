/* =========================================================
   CUTSCENE cs_ende_b „Die Lichter gehen aus“ (Ende B: du lässt das Leuchtfeuer dunkel)
   Nach docs/STORY.md, ruhiger als dort angegeben (Max' Wunsch: jede Einstellung braucht Zeit).
     1  0–7,5     Lampenkammer: die Fackel sinkt, ihre Flamme wird klein; Aurel steigt aus der Luke und verneigt sich
     2  7,5–16    der Horizont: eine Sturmwand zieht von links herein, auf Oles und Branns Inseln erlöschen die Lichter
                  nacheinander; nur der Goldberg behält seine Lichter
     3  16–22     Pfahldorf im Sturm: ein Fenster nach dem anderen wird dunkel, Oles Laterne zuletzt, das Wasser steigt
     4  22–29     Morgen: Ruinen, leere Pfähle, wo Oles Steg war
     5  29–34     Morgen: die Ruinen der Werkstattbucht, eingestürzte Schornsteine
     6  34–43     Aurel in der Morgendämmerung (Aurel: „Eine weise Entscheidung. Willkommen zurück, Herrscher.“), dann reicht er die Krone
     7  43–49,5   danach keine Stimme mehr, nur Wellen; Abblende
   Kein Dialog danach (dialog null). Bei reduzierter Bewegung zeigt der Player Aurels Zeile als Dialog (linesDialog ende_b).
   Bausteine: cutscene/enden.js, cs_wahrheit.js. Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, hash, canvas, glow, black, vignette as makeVignette, PB, blinkAt, talkAt } from '../cutscene/kit.js';
import { capsule, ellipse } from '../divegame/art.js';
import { portrait } from '../gfx/portraits.js';
import { DIALOGS, dialogLines } from '../data/dialogs/index.js';
import { buildAurelFigure } from './cs_npc_aurel.js';
import { stormRain, nightTint, buildLampRoom, buildTorchHand, torchFlame, LENS, TIP, FOAM, NSEA } from './cs_wahrheit.js';
import {
  buildFigures, LIGHTS, flick, buildNight, buildDawn, waves, P_HOR, ISLES, buildPanorama, isleLights, dot,
  V_HOR, V_WL, buildPfahldorf, buildBucht, windows, smoke, buildCrown, DSEA
} from '../cutscene/enden.js';

const T1 = 7.5, T2 = 16, T3 = 22, T4 = 29, T5 = 34, T6 = 43, T_END = 49.5;
const MID = (LENS.top + LENS.bot) / 2;
const ROBE = ['#fffbf2', '#efe4cf', '#d6c6a8', '#a89878'];
const SKIN = ['#f7d7ba', '#ebbd9c', '#d49e80', '#a87460'];

let L = null;
function setup() {
  if (L) return;
  const rest = buildAurelFigure('rest', 0);
  L = {
    lamp: buildLampRoom(), torchHand: nightTint(buildTorchHand(), .2, .45, 'right'), aurel: nightTint(rest, .6, .45, 'right'),
    pano: buildPanorama('night'), lights: isleLights(), night: buildNight(V_HOR), dawn: buildDawn(V_HOR), dawnHi: buildDawn(P_HOR),
    pf: buildPfahldorf('night'), pfR: buildPfahldorf('ruin'), buR: buildBucht('ruin'), fig: buildFigures(),
    crown: buildCrownHands(), aurelP: portrait('aurel'),
    vig: makeVignette('#06080e', 1.3, .7)
  };
}
const vig = (ctx, a = .55) => { ctx.globalAlpha = a; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1; };

// Aurels Hände in weißen Ärmeln halten die Krone (1×, wird doppelt gezeichnet wie das Porträt)
function buildCrownHands() {
  const pb = new PB(56, 48);
  capsule(pb, 6, 50, 11, 26, 6, 5, ROBE, .1); capsule(pb, 50, 50, 45, 26, 6, 5, ROBE, -.1);
  for (let x = 4; x < 18; x++) pb.set(x, 30, '#c8a040'); for (let x = 39; x < 53; x++) pb.set(x, 30, '#c8a040');   // Goldborte am Ärmel
  ellipse(pb, 11, 22, 5, 5, SKIN, .1); ellipse(pb, 45, 22, 5, 5, SKIN, -.1);
  pb.outline('#3b2a1f');
  const c = canvas(56, 48), x = c.getContext('2d');
  x.drawImage(pb.canvas(), 0, 0);
  x.drawImage(buildCrown(), 10, 4);
  // Daumen über dem Reif
  const th = new PB(56, 48); ellipse(th, 14, 18, 2.4, 2, SKIN, .2); ellipse(th, 42, 18, 2.4, 2, SKIN, -.1); th.outline('#3b2a1f');
  x.drawImage(th.canvas(), 0, 0);
  return c;
}

/* ---------- 1 die Fackel sinkt, Aurel verneigt sich ---------- */
function renderSink(ctx, t, lt) {
  const sink = ease(clamp((lt - .6) / 3, 0, 1)), dim = 1 - sink * .75;
  ctx.drawImage(L.lamp.room, -4, -2);
  stormRain(ctx, t, 60, 'rgba(150,166,200,.3)', .2);
  // Aurel steigt aus der Luke und verneigt sich (der Oberkörper neigt sich nach vorn: kürzer, der Kopf sinkt)
  const ay = 160 - ease(clamp((lt - 1) / 2.4, 0, 1)) * 66, bow = ease(clamp((lt - 4.2) / 1.2, 0, 1)) * (lt < 6.6 ? 1 : 1 - ease((lt - 6.6) / .8));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 150); ctx.clip();
  const HIP = 34, s = 1 - bow * .24, ax = 14, y = Math.round(ay);
  ctx.drawImage(L.aurel, 0, HIP, 60, 60 - HIP, ax, y + HIP, 60, 60 - HIP);
  ctx.drawImage(L.aurel, 0, 0, 60, HIP, ax + Math.round(bow * 2), y + Math.round(HIP * (1 - s)), 60, Math.round(HIP * s));
  ctx.restore();
  ctx.drawImage(L.lamp.lens, LENS.cx - LENS.hw - 10, LENS.top - 6);
  glow(ctx, LENS.cx - 30, MID, 34, .3 * dim, '255,170,80');
  // die Hand sinkt mit der Fackel aus dem Bild, die Flamme wird klein
  const hx = 8 - sink * 16, hy = 62 + sink * 78 + Math.round(Math.sin(t * 1.3));
  const fx = hx + TIP[0], fy = hy + TIP[1] - 2;
  ctx.drawImage(L.torchHand, Math.round(hx), Math.round(hy));
  ctx.save(); ctx.translate(fx, fy); ctx.scale(dim, dim); ctx.globalAlpha = .4 + dim * .6; torchFlame(ctx, 0, 0, t); ctx.restore();
  glow(ctx, fx, fy - 8, 120 * dim + 20, .42 * dim, '255,170,80');
  black(ctx, Math.max(1 - lt / 1.2, (lt - 6.4) / 1.1 * .35));
}

/* ---------- 2 die Lichter gehen aus ---------- */
const FRONT = (lt) => lerp(-70, 236, clamp((lt - .4) / 6.6, 0, 1));            // Vorderkante der Sturmwand
function renderDark(ctx, t, lt) {
  ctx.drawImage(L.pano.sky, -Math.round(t * 5) % 140, 0);
  ctx.drawImage(L.pano.sea, 0, P_HOR);
  waves(ctx, t, P_HOR, 46, NSEA[0]);
  ctx.drawImage(L.pano.land, 0, 0);
  const X = FRONT(lt);
  for (const I of ISLES) {
    const S = L.lights[I.key];
    if (I.key === 'aurel') { S.L.forEach((p, i) => dot(ctx, p.x, p.y, .7 + Math.sin(t * 2 + i) * .05, false, '#f0d890')); continue; }
    if (I.key === 'klein') continue;
    // jedes Licht geht aus, kurz nachdem die Sturmwand darüber ist (nacheinander, mit kurzem Flackern)
    S.L.forEach((p, i) => {
      const off = (X - p.x - 6) / 10 - p.d * .9;
      const a = off < 0 ? flick(t, i) : off < .5 ? (Math.floor(t * 18 + i) % 2 ? .8 : .2) : 0;
      dot(ctx, p.x, p.y, a, i % 4 === 0);
    });
  }
  // die Sturmwand: dunkel, Regenschleier, weicher Rand
  const g = ctx.createLinearGradient(X - 40, 0, X + 6, 0);
  g.addColorStop(0, 'rgba(6,8,16,.62)'); g.addColorStop(1, 'rgba(6,8,16,0)');
  ctx.fillStyle = g; ctx.fillRect(Math.min(0, X - 400), 0, X + 6 - Math.min(0, X - 400), H);
  ctx.save(); ctx.beginPath(); ctx.rect(-20, 0, Math.max(0, X + 20), H); ctx.clip();
  stormRain(ctx, t, 260, 'rgba(140,156,190,.5)', .8);
  ctx.restore();
  stormRain(ctx, t, 50, 'rgba(150,166,200,.3)');
}

/* ---------- 3 Pfahldorf im Sturm: Fenster für Fenster dunkel, Oles Laterne zuletzt ---------- */
function renderFade(ctx, t, lt) {
  ctx.drawImage(L.night.sky, -Math.round(t * 9) % 140, 0);
  ctx.drawImage(L.night.sea, 0, V_HOR);
  waves(ctx, t, V_HOR, 44, NSEA[0], 22);
  ctx.drawImage(L.pf.land, 0, 0);
  const order = [6, 4, 5, 3, 0, 2, 1];
  windows(ctx, L.pf.win, (i) => { const k = order.indexOf(i); const u = lt - .8 - k * .55; return u < 0 ? 1 : u < .3 ? (Math.floor(t * 20) % 2 ? .7 : .1) : 0; }, t);
  const S = 3, fx = 36, fy = V_WL - 6 - 15 * S, lamp = 1 - clamp((lt - 4.6) / .5, 0, 1);
  ctx.drawImage(L.fig.ole[1], 0, 0, 9, 15, fx, fy, 9 * S, 15 * S);
  const [lx, ly] = LIGHTS.ole[1];
  if (lamp < 1) { ctx.fillStyle = '#3a2a18'; ctx.fillRect(fx + lx * S, fy + ly * S, S, S); }
  if (lamp > 0) glow(ctx, fx + (lx + .5) * S, fy + (ly + .5) * S, 46, .6 * lamp * flick(t));
  // das Wasser steigt
  const lvl = V_WL + 10 - ease(clamp((lt - 2.5) / 3.5, 0, 1)) * 22;
  for (let x = 0; x < W; x++) {
    const y0 = Math.round(lvl + Math.sin(x * .07 + t * 3) * 3 + Math.sin(x * .19 - t * 5) * 1.5);
    if (x > 176 && y0 > V_WL - (x - 170) * 1.9) continue;
    ctx.fillStyle = NSEA[3]; ctx.fillRect(x, y0 + 2, 1, H - y0);
    ctx.fillStyle = FOAM; ctx.fillRect(x, y0, 1, 1);
  }
  stormRain(ctx, t, 200, 'rgba(150,166,200,.5)', .7);
  black(ctx, (lt - 5.2) / .8);
}

/* ---------- 4/5 Morgen: Ruinen ---------- */
function flotsam(ctx, t, top, seed) {
  for (let i = 0; i < 7; i++) {
    const x = ((hash(i, 1, seed) * 360 + t * 3) % 360) - 20, y = top + 14 + hash(i, 2, seed) * 30 + Math.sin(t * 1.4 + i) * 1;
    ctx.fillStyle = '#5a4c40'; ctx.fillRect(Math.round(x), Math.round(y), 4 + (i % 3) * 2, 1);
    ctx.fillStyle = '#3a3028'; ctx.fillRect(Math.round(x) + 1, Math.round(y) + 1, 2 + (i % 3), 1);
  }
}
function renderRuinOle(ctx, t, lt) {
  ctx.drawImage(L.dawn.sky, -Math.round(t * 2) % 140, 0);
  ctx.drawImage(L.dawn.sea, 0, V_HOR);
  waves(ctx, t * .5, V_HOR, 40, '#c8c6b8', 6, 13);
  ctx.save(); ctx.translate(-Math.round(ease(lt / 7) * 0), 0);
  ctx.drawImage(L.pfR.land, 0, 0);
  ctx.restore();
  flotsam(ctx, t, V_HOR + 12, 3);
  black(ctx, 1 - lt / 1.4);
}
function renderRuinBrann(ctx, t, lt) {
  ctx.drawImage(L.dawn.sky, -Math.round(t * 2) % 140 - 30, 0);
  ctx.drawImage(L.dawn.sea, 0, V_HOR);
  waves(ctx, t * .5, V_HOR, 40, '#c8c6b8', 6, 17);
  ctx.drawImage(L.buR.land, 0, 0);
  flotsam(ctx, t, V_HOR + 16, 5);
}

/* ---------- 6 Aurel reicht die Krone ---------- */
const LINE = dialogLines(DIALOGS.ende_b)[0];
const L6 = [T5 + .6, T5 + 4.6];                  // erst spricht er, dann hebt er die Krone ins Bild
function renderCrown(ctx, t, lt, still) {
  ctx.drawImage(L.dawnHi.sky, -Math.round(t * 2) % 140, 0);
  glow(ctx, 70, P_HOR - 4, 140, .35, '255,220,160');
  ctx.drawImage(L.dawnHi.sea, 0, P_HOR);
  waves(ctx, t * .5, P_HOR, 30, '#d8d2c0', 5, 19);
  // Porträt doppelt: halbes Lächeln (Augen 4), spricht während seiner Zeile
  const abs = T5 + lt, talking = !still && abs >= L6[0] + .5 && abs < L6[0] + .5 + LINE.text.length / 42;
  const push = still ? 1 : ease(lt / (T6 - T5));
  const img = L.aurelP(blinkAt(t) ? 2 : 4, talking && talkAt(t) ? 1 : 0);
  const px = 104 - Math.round(push * 4), py = 8 - Math.round(push * 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, px, py, 128, 160);
  // die Krone kommt von unten ins Bild, in beiden Händen
  const cy = still ? 110 : lerp(184, 110, ease(clamp((lt - 4.8) / 2.4, 0, 1)));
  ctx.drawImage(L.crown, px + 8, Math.round(cy), 112, 96);
  glow(ctx, px + 64, cy + 30, 50, .25, '255,226,150');
}

/* ---------- 7 nur Wellen ---------- */
function renderWaves(ctx, t, lt) {
  ctx.drawImage(L.dawnHi.sky, -Math.round(t * 2) % 140, -40);
  ctx.drawImage(L.dawnHi.sea, 0, 68);
  ctx.fillStyle = DSEA[5]; ctx.fillRect(0, 68 + L.dawnHi.sea.height, W, H);
  for (let i = 0; i < 70; i++) {
    const y = 70 + hash(i, 1, 23) * 110, sp = 5 + (y - 70) * .08, x = ((hash(i, 2, 23) * 400 + t * sp) % 380) - 30;
    ctx.fillStyle = y > 120 ? '#e4e0d4' : '#c8c6b8'; ctx.fillRect(Math.round(x), Math.round(y), 2 + Math.floor((y - 70) / 14), 1);
  }
}

export default {
  id: 'cs_ende_b',
  title: 'Die Lichter gehen aus',
  len: T_END,
  dialog: null,
  linesDialog: 'ende_b',
  lines: [{ from: L6[0], to: L6[1], who: LINE.who, text: LINE.text, face: null }],
  setup,
  shots: [
    { from: 0, to: T1, draw(ctx, lt, t) { renderSink(ctx, t, lt); vig(ctx, .5); } },
    { from: T1, to: T2, draw(ctx, lt, t) { renderDark(ctx, t, lt); vig(ctx, .55); } },
    { from: T2, to: T3, draw(ctx, lt, t) { renderFade(ctx, t, lt); vig(ctx, .6); } },
    { from: T3, to: T4, draw(ctx, lt, t) { renderRuinOle(ctx, t, lt); vig(ctx, .35); } },
    { from: T4, to: T5, draw(ctx, lt, t) { renderRuinBrann(ctx, t, lt); vig(ctx, .35); } },
    { from: T5, to: T6, draw(ctx, lt, t) { renderCrown(ctx, t, lt); vig(ctx, .4); } },
    { from: T6, to: T_END, draw(ctx, lt, t) { renderWaves(ctx, t, lt); vig(ctx, .35); black(ctx, (lt - 4.4) / 2); } }
  ],
  dialogBg(ctx, el, now) { renderCrown(ctx, now, T6 - T5, true); vig(ctx, .4); }
};
