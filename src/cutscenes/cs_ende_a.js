/* =========================================================
   CUTSCENE cs_ende_a „Das Feuer antwortet“ (Ende A: du entzündest das Leuchtfeuer)
   Nach docs/STORY.md, ruhiger als dort angegeben (Max' Wunsch: jede Einstellung braucht Zeit). Höhepunkt ist der Lichtstrahl.
     1  0–7       Lampenkammer: die Fackel fährt an die Linse, das Feuer zündet (2,6 s), die Linse glüht auf; Aurel steigt die Treppe hinab
     2  7–13,5    draußen: der Turm im Sturm, der Strahl dreht sich übers Meer, blitzt auf, wenn er zu uns zeigt
     3  13,5–22   der Horizont: der Strahl streicht über die Inseln, Insel um Insel antworten Lichter, Fackeln steigen die Hänge hinauf;
                  nur der Goldberg antwortet nicht
     4  22–29     Pfahldorf: Ole hebt die Laterne, die Leute tragen ihr Hab und Gut den Klippenpfad hinauf (Ole: „Die Lampe… sie brennt.“)
     5  29–35,5   Werkstattbucht: Brann schaut zum Licht, die Leute steigen den Hügel hinauf (Brann: „Diesmal hat jemand …“)
     6  35,5–42   am Turm: Aurel geht zu seinem Boot und legt ab (Aurel: „Das war ein Fehler, Herrscher. …“)
     7  42–47,5   der Sturm trifft leere Ufer: das Wasser steigt über Steg und Pfahlhäuser, oben auf der Klippe die Laternen in Sicherheit
     8  47,5–55   Morgen: Rauch über dem Goldberg, Aurels Schiff verschwindet am Horizont. Das Bild hält an (dialogBg) → Dialog ende_a (Brann)
   Die drei Zeilen der Nacht sind Einblendungen (lines, data/dialogs/story.js ende_a_szene).
   Bausteine: cutscene/enden.js (Panorama, Dörfer, Strahl, Figuren), cs_wahrheit.js (Turm, Lampenkammer, Fackel, Steg, Boot).
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, lerp, ease, hash, canvas, glow, black, vignette as makeVignette, tpl } from '../cutscene/kit.js';
import { wappen } from '../cutscene/motifs.js';
import { DIALOGS, dialogLines } from '../data/dialogs/index.js';
import { buildAurelFigure } from './cs_npc_aurel.js';
import {
  buildWide, surfBurst, stormRain, nightTint, buildLampRoom, buildTorchHand, torchFlame, buildAurelBoat, buildBase,
  LENS, TIP, J9_Y, DOOR9, W_HOR, W_TX, FOAM, NSEA, LAMP
} from './cs_wahrheit.js';
import {
  beam, sweep, buildFigures, LIGHTS, flick, buildNight, buildDawn, waves, P_HOR, ISLES, buildPanorama, isleLights, along, dot,
  V_HOR, V_WL, buildPfahldorf, buildBucht, windows, smoke, WARM
} from '../cutscene/enden.js';

const T1 = 7, T2 = 13.5, T3 = 22, T4 = 29, T5 = 35.5, T6 = 42, T7 = 47.5, T_END = 55;
const IGN = 2.6;                                  // Bild 1: Zündung
const MID = (LENS.top + LENS.bot) / 2;
const SPIN = 1.5;                                 // Drehung des Feuers (rad/s)

let L = null;
function setup() {
  if (L) return;
  const rest = buildAurelFigure('rest', 0), lamp = buildLampRoom();
  const lit = canvas(lamp.lens.width, lamp.lens.height), lx = lit.getContext('2d');
  lx.drawImage(lamp.lens, 0, 0); lx.globalCompositeOperation = 'source-atop'; lx.fillStyle = 'rgba(255,214,130,.62)'; lx.fillRect(0, 0, lit.width, lit.height);
  L = {
    lamp, litLens: lit, torchHand: nightTint(buildTorchHand(), .2, .45, 'right'),
    aurelDark: nightTint(rest, .6, .45, 'right'), aurelLit: nightTint(rest, .3, .7, 'right'),
    wide: buildWide(), pano: buildPanorama('night'), lights: isleLights(),
    night: buildNight(V_HOR), dawn: buildDawn(P_HOR), dawnPano: buildPanorama('dawn'),
    pf: buildPfahldorf('night'), bu: buildBucht('night'), fig: buildFigures(),
    base: buildBase(), boat: nightTint(buildAurelBoat(), .35), sail: nightTint(wappen('fahne'), .35),
    aurelDock: nightTint(buildAurelFigure('rest', 1), .45, .35, 'right'),
    ship: tpl(['.....w......', '.....ww.....', '.....www....', '.....wwww...', '.....wwwww..', '.....wgwww..', '.....wwwww..', '.hhhhhhhhhhh', '..hhhhhhhhh.'], { w: '#f0e8d8', g: '#d8a83a', h: '#3a3430' }, null),
    vig: makeVignette('#06080e', 1.3, .7)
  };
}
const vig = (ctx, a = .55) => { ctx.globalAlpha = a; ctx.drawImage(L.vig, 0, 0); ctx.globalAlpha = 1; };

/* ---------- 1 Lampenkammer: Zündung ---------- */
function renderIgnite(ctx, t, lt) {
  const go = ease(clamp(lt / IGN, 0, 1)), back = ease(clamp((lt - 3.8) / 2.2, 0, 1)), lit = clamp((lt - IGN) / .5, 0, 1);
  ctx.drawImage(L.lamp.room, -4, -2);
  stormRain(ctx, t, 60, 'rgba(150,166,200,.3)', .2);
  // Aurel in der Treppenluke: erst im Fackelschein, dann im Licht der Lampe; ab 4 s steigt er hinab
  const ay = 94 + ease(clamp((lt - 4) / 2.4, 0, 1)) * 66;
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 150); ctx.clip();
  ctx.drawImage(L.aurelDark, 14, Math.round(ay));
  if (lit > 0) { ctx.globalAlpha = lit; ctx.drawImage(L.aurelLit, 14, Math.round(ay)); ctx.globalAlpha = 1; }
  ctx.restore();
  // Linse: dunkel → glühend
  const lx = LENS.cx - LENS.hw - 6 - 4, ly = LENS.top - 4 - 2;
  ctx.drawImage(L.lamp.lens, lx, ly);
  if (lit > 0) {
    const pulse = .9 + Math.sin(t * 3) * .05;
    ctx.globalAlpha = lit; ctx.drawImage(L.litLens, lx, ly); ctx.globalAlpha = 1;
    glow(ctx, LENS.cx - 4, MID - 2, 46, .7 * lit * pulse, '255,240,190');
    glow(ctx, LENS.cx - 4, MID - 2, 200, .38 * lit * pulse, LAMP);
    // Licht fällt durch die Fenster hinaus in den Regen
    beam(ctx, LENS.cx - 4, MID - 2, -60, MID - 40, 20, 70, .22 * lit);
  }
  // Hand mit Fackel: zur Linse, dann zurück und hinunter
  const hx = lerp(8, 84, go) - back * 90, hy = lerp(62, 70, go) + back * 50 + Math.round(Math.sin(t * 1.3));
  const fx = hx + TIP[0], fy = hy + TIP[1] - 2;
  ctx.drawImage(L.torchHand, Math.round(hx), Math.round(hy));
  torchFlame(ctx, fx, fy, t);
  glow(ctx, fx, fy - 8, 120, .4 * (1 - lit * .6), '255,170,80');
  // der Funke springt über: weißer Blitz
  if (lt > IGN) { const f = 1 - (lt - IGN) / .7; if (f > 0) { ctx.fillStyle = `rgba(255,250,230,${f * .85})`; ctx.fillRect(0, 0, W, H); } }
  black(ctx, 1 - lt / 1.2);
}

/* ---------- 2 der Turm draußen, der Strahl dreht sich ---------- */
const LAMP_Y = 51;
function renderTower(ctx, t, lt, cam) {
  const c = Math.round(cam);
  ctx.drawImage(L.wide.sky, -c - Math.round(t * 6) % 120, 0);
  ctx.globalAlpha = .8; ctx.drawImage(L.wide.scud, -Math.round(t * 22) % 120, 4); ctx.globalAlpha = 1;
  ctx.drawImage(L.wide.sea, -c, W_HOR);
  for (let i = 0; i < 40; i++) {
    const y = W_HOR + 4 + hash(i, 1, 2) * 55, x = ((hash(i, 2, 2) * 400 + t * (14 + y * .1)) % 380) - 30 - c;
    ctx.fillStyle = y > W_HOR + 30 ? FOAM : NSEA[0]; ctx.fillRect(Math.round(x), Math.round(y), 3 + (i % 4), 1);
  }
  ctx.drawImage(L.wide.land, -c, 0);
  // die Lampe brennt: Glas der Lampenkammer warm
  const x = W_TX - c, th = t * SPIN;
  ctx.fillStyle = '#ffe6a0'; ctx.fillRect(x - 6, LAMP_Y - 4, 13, 10);
  ctx.fillStyle = '#fff8dc'; ctx.fillRect(x - 2, LAMP_Y - 2, 5, 5);
  sweep(ctx, x, LAMP_Y, th, 460, 1);
  // Lichtschein auf dem Wasser unter dem Strahl
  const cx = Math.cos(th);
  glow(ctx, x + cx * 120, W_HOR + 14, 60, .22 * Math.abs(cx), '255,220,150');
  surfBurst(ctx, 168 - c, 154, t, .1); surfBurst(ctx, 158 - c, 168, t, .55, 1.3);
  stormRain(ctx, t, 140, 'rgba(150,166,200,.45)');
}

/* ---------- 3 der Horizont antwortet ---------- */
const P_X = (lt) => lerp(-20, 340, clamp((lt - .6) / 6.4, 0, 1));                // Ende des Strahls am Horizont
const answerAt = (I) => .6 + (I.x - I.w * .3 + 20) / 360 * 6.4 + .35;             // wann eine Insel antwortet
const ANSWER = ['ole', 'klein', 'brann'];
function renderHorizon(ctx, t, lt) {
  ctx.drawImage(L.pano.sky, -Math.round(t * 5) % 140, 0);
  ctx.drawImage(L.pano.sea, 0, P_HOR);
  waves(ctx, t, P_HOR, 46, NSEA[0]);
  ctx.drawImage(L.pano.land, 0, 0);
  // Lichter: der Goldberg kalt und gleich (antwortet nicht), die anderen gehen an, wenn der Strahl vorbei ist
  for (const I of ISLES) {
    const S = L.lights[I.key];
    if (I.key === 'aurel') { S.L.forEach((p, i) => { if (i % 2) dot(ctx, p.x, p.y, .4, false, '#e8e0c8'); }); continue; }
    if (!ANSWER.includes(I.key)) continue;
    const ta = answerAt(I);
    S.L.forEach((p, i) => dot(ctx, p.x, p.y, clamp((lt - ta - p.d * 1.6) / .25, 0, 1) * flick(t, i), i % 4 === 0));
    if (I.key === 'klein') continue;
    // Fackeln steigen den Hang hinauf, oben ein Feuer, sobald die ersten ankommen
    for (let k = 0; k < 6; k++) {
      const u = (lt - ta - .8 - k * .45) / 4.2;
      if (u <= 0) continue;
      const [x, y] = along(S.climb, u);
      dot(ctx, x, y, flick(t, k + 9), true, '#ffe6a0');
    }
    const top = S.climb[S.climb.length - 1], fire = clamp((lt - ta - 5) / .8, 0, 1);
    if (fire > 0) { dot(ctx, top[0], top[1] - 1, fire, true, '#fff0c0'); glow(ctx, top[0], top[1] - 2, 14, .45 * fire * flick(t, 3)); }
  }
  // der Strahl kommt von links (der Turm hinter uns) und streicht über die Inseln
  const X = P_X(lt);
  if (X < 340) beam(ctx, -14, 40, X, P_HOR - 6, 3, 22, .75);
  glow(ctx, X, P_HOR - 4, 36, .3, '255,226,160');
  stormRain(ctx, t, 80, 'rgba(150,166,200,.35)');
}

/* ---------- 4 Pfahldorf: Ole und die Leute auf dem Klippenpfad ---------- */
function folkOn(ctx, t, path, n, start, dur, gap, sets) {
  for (let i = 0; i < n; i++) {
    const u = (t - start - i * gap) / dur;
    if (u <= 0 || u >= 1) continue;
    const [x, y] = along(path, u), f = Math.floor(t * 4 + i) % 2, img = L.fig.folk[i % 3][f];
    ctx.drawImage(img, Math.round(x - 4), Math.round(y - 14));
    const [lx, ly] = LIGHTS.folk;
    ctx.fillStyle = '#ffd36b'; ctx.fillRect(Math.round(x - 4 + lx), Math.round(y - 14 + ly), 1, 1);
    glow(ctx, x - 4 + lx + .5, y - 14 + ly, 10, .45 * flick(t, i));
  }
}
function overheadBeam(ctx, t, x = -30, y = 26) { sweep(ctx, x, y, t * SPIN + 1, 520, .6); }
function renderVillage(ctx, t, lt) {
  ctx.drawImage(L.night.sky, -Math.round(t * 5) % 140, 0);
  overheadBeam(ctx, t);
  ctx.drawImage(L.night.sea, 0, V_HOR);
  waves(ctx, t, V_HOR, 40, NSEA[0]);
  ctx.drawImage(L.pf.land, 0, 0);
  windows(ctx, L.pf.win, (i) => i < 4 ? 1 - clamp((lt - 1 - i * .8) / .6, 0, 1) : 1, t);   // unten gehen die Leute aus dem Haus
  folkOn(ctx, lt, L.pf.path, 9, .2, 8.5, .8);
  // Ole vorn auf dem Steg, hebt die Laterne
  const f = lt > 1.4 ? 1 : 0, S = 3, fx = 36, fy = V_WL - 6 - 15 * S;
  ctx.drawImage(L.fig.ole[f], 0, 0, 9, 15, fx, fy, 9 * S, 15 * S);
  const [lx, ly] = LIGHTS.ole[f];
  glow(ctx, fx + (lx + .5) * S, fy + (ly + .5) * S, f ? 46 : 30, .6 * flick(t));
  stormRain(ctx, t, 120, 'rgba(150,166,200,.4)');
}

/* ---------- 5 Werkstattbucht: Brann schaut zum Licht ---------- */
function renderBucht(ctx, t, lt) {
  ctx.drawImage(L.night.sky, -Math.round(t * 5) % 140 - 40, 0);
  overheadBeam(ctx, t + 1.2, 20, 22);
  ctx.drawImage(L.night.sea, 0, V_HOR);
  waves(ctx, t, V_HOR, 40, NSEA[0], 16, 5);
  for (const [x, y] of L.bu.stacks) smoke(ctx, x, y, t, 10, ['#3a3e4e', '#30344a', '#262a3c'], 8, 6);
  ctx.drawImage(L.bu.land, 0, 0);
  windows(ctx, L.bu.win, (i) => 1 - clamp((lt - 2 - i * .35) / .5, 0, 1) * .7, t);
  folkOn(ctx, lt, L.bu.path, 9, 0, 6.5, .65);
  const f = lt > 1.6 ? 1 : 0, S = 3, fx = 150, fy = L.bu.quay - 15 * S + 1;
  ctx.drawImage(L.fig.brann[f], 0, 0, 9, 15, fx, fy, 9 * S, 15 * S);
  glow(ctx, fx + 14, fy + 20, 50, .18, '255,190,100');      // Schein aus der Halle
  stormRain(ctx, t, 120, 'rgba(150,166,200,.4)');
}

/* ---------- 6 Aurel legt ab ---------- */
function renderLeave(ctx, t, lt) {
  ctx.fillStyle = '#141a2c'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(L.wide.sky, -40 - Math.round(t * 6) % 120, -30);
  ctx.drawImage(L.wide.sea, 0, 112);
  for (let i = 0; i < 30; i++) { const y = 116 + hash(i, 1, 4) * 60, x = ((hash(i, 2, 4) * 400 + t * 18) % 380) - 30; ctx.fillStyle = FOAM; ctx.fillRect(Math.round(x), Math.round(y), 3, 1); }
  // oben dreht sich das Feuer: der Strahl streicht über den Himmel, Licht fällt auf Steg und Turm
  sweep(ctx, 300, -8, t * SPIN, 520, .85);
  glow(ctx, 300, 0, 160, .18 + .1 * Math.abs(Math.sin(t * SPIN)), LAMP);
  const bx = 60 - ease(clamp((lt - 3.2) / 4.2, 0, 1)) * 230, by = J9_Y - 46 + Math.round(Math.sin(t * 2.2) * 1.5);
  ctx.drawImage(L.base, 0, 0);
  glow(ctx, DOOR9.x + DOOR9.w / 2, J9_Y - 26, 30, .35, LAMP);                       // Licht aus der Tür
  ctx.drawImage(L.boat, Math.round(bx), Math.round(by));
  ctx.drawImage(L.sail, Math.round(bx) + 46, Math.round(by) + 14);
  // Aurel: aus der Tür über den Steg zum Boot (bis 2,6 s), steigt ein und steht am Mast
  const onJetty = lt < 2.6, ax = onJetty ? lerp(DOOR9.x + DOOR9.w / 2, bx + 74, ease(clamp(lt / 2.6, 0, 1))) : bx + 74;
  const ay = onJetty ? J9_Y - 56 - Math.round(Math.abs(Math.sin(lt * 6))) : by - 8;
  ctx.drawImage(L.aurelDock, Math.round(ax - 30), Math.round(ay));
  stormRain(ctx, t, 150, 'rgba(150,166,200,.45)');
}

/* ---------- 7 der Sturm trifft leere Ufer ---------- */
function renderSurge(ctx, t, lt) {
  const shake = lt > 1 && lt < 4 ? Math.round(Math.sin(t * 40)) : 0;
  ctx.save(); ctx.translate(0, shake);
  ctx.drawImage(L.night.sky, -Math.round(t * 9) % 140, 0);
  overheadBeam(ctx, t, -30, 20);
  ctx.drawImage(L.night.sea, 0, V_HOR);
  ctx.drawImage(L.pf.land, 0, 0);
  // oben auf der Klippe: alle in Sicherheit, Laternen dicht beieinander
  for (let i = 0; i < 10; i++) {
    const x = 214 + i * 9 + Math.round(hash(i, 1, 9) * 4), y = 46 + Math.round(Math.sin(x * .09) * 3) - 1;
    if (i % 3 === 0) ctx.drawImage(L.fig.folk[i % 3][0], x - 4, y - 14);
    dot(ctx, x, y - 8 + (i % 2), flick(t, i), true, '#ffd36b');
  }
  // das Wasser steigt über Steg und Pfahlhäuser
  const lvl = V_WL + 6 - ease(clamp(lt / 3, 0, 1)) * 26;
  for (let x = 0; x < W; x++) {
    const y0 = Math.round(lvl + Math.sin(x * .07 + t * 3) * 3 + Math.sin(x * .19 - t * 5) * 1.5);
    if (x > 176 && y0 > V_WL - (x - 170) * 1.9) continue;
    ctx.fillStyle = NSEA[2]; ctx.fillRect(x, y0 + 2, 1, H - y0);
    ctx.fillStyle = FOAM; ctx.fillRect(x, y0, 1, 2);
    if (hash(x, Math.floor(t * 8), 3) > .8) ctx.fillRect(x, y0 - 1, 1, 1);
  }
  waves(ctx, t, lvl + 4, 50, FOAM, 30, 7);
  surfBurst(ctx, 174, lvl, t, .2, 1.6); surfBurst(ctx, 186, lvl - 10, t, .7, 1.4);
  ctx.restore();
  stormRain(ctx, t, 180, 'rgba(160,176,210,.5)', .7);
}

/* ---------- 8 Morgen: Rauch über dem Goldberg, Aurels Schiff verschwindet ---------- */
function renderMorning(ctx, t, lt) {
  ctx.drawImage(L.dawnPano.sky, -Math.round(t * 2) % 140, 0);
  glow(ctx, 210, P_HOR - 6, 120, .22, '255,226,170');                                      // die Sonne hinter Dunst
  ctx.drawImage(L.dawnPano.sea, 0, P_HOR);
  waves(ctx, t * .5, P_HOR, 40, '#c8c6b8', 6, 11);
  ctx.drawImage(L.dawnPano.land, 0, 0);
  // Rauch: drei dunkle Säulen vom Goldberg, der Wind treibt sie nach links
  const G = ISLES.find(I => I.key === 'aurel');
  for (const [dx, s] of [[-10, 1], [2, 1.3], [12, .9]]) smoke(ctx, G.x + dx, P_HOR - G.h + 6, t, 60, ['#2e2a2a', '#3e3a38', '#524c4a', '#686260', '#7e7874'], -5 * s, 11, 1.6);
  // Aurels Schiff: fährt nach links in den Dunst und wird kleiner
  const u = clamp(lt / 6.4, 0, 1), sx = lerp(228, 160, u), a = 1 - Math.pow(u, 2.4);
  if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(L.ship, Math.round(sx), P_HOR - 8); ctx.globalAlpha = 1; }
}

const LINES = dialogLines(DIALOGS.ende_a_szene).map((l, i) => {
  const S = [[T3 + .9, T3 + 5.8], [T4 + .9, T4 + 5.8], [T5 + .9, T5 + 5.9]][i];
  return { from: S[0], to: S[1], who: l.who, text: l.text, face: l.face || l.who };
});

export default {
  id: 'cs_ende_a',
  title: 'Das Feuer antwortet',
  len: T_END,
  dialog: 'ende_a',
  linesDialog: 'ende_a_szene',
  lines: LINES,
  setup,
  shots: [
    { from: 0, to: T1, draw(ctx, lt, t) { renderIgnite(ctx, t, lt); vig(ctx, .5); } },
    { from: T1, to: T2, draw(ctx, lt, t) { renderTower(ctx, t, lt, 10 + ease(lt / (T2 - T1)) * 20); vig(ctx, .55); } },
    { from: T2, to: T3, draw(ctx, lt, t) { renderHorizon(ctx, t, lt); vig(ctx, .5); } },
    { from: T3, to: T4, draw(ctx, lt, t) { renderVillage(ctx, t, lt); vig(ctx, .55); } },
    { from: T4, to: T5, draw(ctx, lt, t) { renderBucht(ctx, t, lt); vig(ctx, .55); } },
    { from: T5, to: T6, draw(ctx, lt, t) { renderLeave(ctx, t, lt); vig(ctx, .6); } },
    { from: T6, to: T7, draw(ctx, lt, t) { renderSurge(ctx, t, lt); vig(ctx, .6); black(ctx, (lt - 4.9) / .6); } },
    { from: T7, to: T_END, draw(ctx, lt, t) { renderMorning(ctx, t, lt); vig(ctx, .35); black(ctx, 1 - lt / 1.2); } }
  ],
  // Brann spricht am Morgen: Rauch zieht weiter, das Schiff ist fort
  dialogBg(ctx, el, now) { renderMorning(ctx, now, 9); vig(ctx, .35); }
};
