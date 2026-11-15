/* =========================================================
   CUTSCENE cs_npc_ole „Rauch hinter dem Nebel“ (Akt 1: erstes Schiff erreicht Oles Insel)
   Portiert aus der Referenz docs/cutscenes/rauch-hinter-dem-nebel.html, Bild für Bild gleich.
   Kühler, verregneter Morgen: Blick über den Bug in dichten Nebel (0–4 s) · Rauchsäulen hinter dem Nebel (4–7 s) ·
   Nebel teilt sich: Dorf an grauen Klippen, Steg mit Pfahlhaus (7–11 s) · Nahaufnahme: Ole hebt die Laterne (11–13 s) ·
   Großaufnahme, misstrauischer Blick (13–15,2 s), Abblende bis 16,4 s. Danach Dialog ole_1 vor der Insel.
   Format einer Szene: cutscene/player.js
   ========================================================= */
import { W, H, clamp, ease, bay, hash, vnoise, fbm, PB, pick, layer, tpl, vignette as makeVignette, disc, glow, drawTiled, rain, black } from '../cutscene/kit.js';
import { portrait } from '../gfx/portraits.js';

const HOR = 98;                                         // Horizont
const T_FOG = 7, T_SHOT4 = 11, T_SHOT5 = 13, T_FADE = 15.2, T_END = 16.4;

/* ---------- Farbpaletten: kühler, verregneter Morgen ---------- */
const SKY = ['#4c5a6a', '#5b6a7a', '#6c7b89', '#7f8d98', '#939fa7', '#a6b0b5'];
const SEA = ['#8196a0', '#64808e', '#4f6b7b', '#3e5868', '#314757', '#283b49'];
const ROCK = ['#8d969b', '#737c82', '#5c656b', '#474f56'];
const GRASS = ['#7a9562', '#61804f', '#4c6a42'];
const WOOD = ['#8a6644', '#6c4d33', '#523a27', '#35251a'];
const THATCH = ['#a39167', '#8a7a57', '#6f6146', '#544934'];
const WARM = '#f6c96c';

/* ---------- Statische Ebenen (setup, einmal je Spiel) ---------- */
const SKY_W = 380, IL_W = 300, IL_H = 86, WL = 64;      // WL = Wasserlinie innerhalb der Insel-Ebene
const BOW_Y = 118;
let L = null;                                           // Ebenen nach setup()
const CHIMNEYS = [], WINDOWS = [];

function setup() {
  if (L) return;
  // Himmel mit Wolkenbänken und fernen Inseln (leichte Parallaxe)
  const skyCv = layer(SKY_W, HOR, (x, y) => {
    let l = y / HOR * 5 + (bay(x, y) - .5) * .55;
    const n = fbm(x / 70, y / 9, 3, 3);
    if (n > .56 && y < HOR - 14) l -= 1.1;
    if (n > .66 && y < HOR - 20) l -= .8;
    const hill = HOR - 2 - Math.max(0, 7 - Math.abs(x - 70) * .16) * (1 + (vnoise(x / 6, 1, 7) - .5) * .5) - Math.max(0, 4 - Math.abs(x - 300) * .12);
    if (y >= hill && hill < HOR - 2) return (y + x) % 2 ? '#7a8792' : '#738190';
    return SKY[clamp(Math.round(l), 0, 5)];
  });
  // Meer: Grundfarbe von hell (Horizont) nach dunkel (vorne)
  const seaCv = layer(W, H - HOR, (x, y) => {
    const f = y / (H - HOR);
    const l = Math.pow(f, .75) * 5 + (bay(x, y) - .5) * .5;
    return SEA[clamp(Math.round(l), 0, 5)];
  });
  // Nebel: gestrichelte Pixelschwaden
  const fogTex = (w, h, seed, dens, sc, wall) => layer(w, h, (x, y) => {
    const n = fbm(x / sc, y / 11, seed, 3);
    let v = 1 - Math.abs((y - h * .55) / (h * .5)); v = Math.pow(clamp(v, 0, 1), .6);
    if (wall) { v = clamp((1 - Math.abs((y - h * .5) / (h * .5))) * 2.3, 0, 1) * clamp(Math.min(x, w - x) / 45, 0, 1); }
    const d = (n * dens - .2) * v;
    if (d <= bay(x, y) * .85 + .04) return null;
    return d > .8 ? '#e3e8e9' : d > .5 ? '#cfd7da' : '#b9c4c8';
  });
  // Hintergrund der Großaufnahme
  const closeBG = layer(W, H, (x, y) => {
    const n = fbm(x / 60, y / 14, 77, 3);
    const l = y / H * 3.2 + (n - .5) * 1.6 + (bay(x, y) - .5) * .5;
    return ['#56616c', '#46515c', '#38424c', '#2c343c'][clamp(Math.round(l), 0, 3)];
  });
  // Der Fischer auf dem Steg (klein): drei Bilder, die Laterne wird gehoben
  const FPAL = { Y: '#e3b04a', y: '#a8781f', S: '#d79a72', B: '#d4d2ca', D: '#3a2e26', L: '#3a2a18', F: '#ffd36b' };
  const FIG = [
    tpl(['.........', '.........', '...YYY...', '..YYYYY..', '.yyyyyyy.', '...SSS...', '...BBB...', '..YYYYY..', '..YYYYYL.', '..YYYYYF.', '..YYYYYL.', '..yYYYy..', '..yy.yy..', '..DD.DD..', '..DD.DD..'], FPAL),
    tpl(['.........', '.........', '...YYY...', '..YYYYY..', '.yyyyyyy.', '...SSS.L.', '...BBBYF.', '..YYYYYL.', '..YYYYY..', '..YYYYY..', '..YYYYY..', '..yYYYy..', '..yy.yy..', '..DD.DD..', '..DD.DD..'], FPAL),
    tpl(['.......L.', '.......F.', '...YYY.L.', '..YYYYYY.', '.yyyyyyY.', '...SSSY..', '...BBB...', '..YYYYY..', '..YYYYY..', '..YYYYY..', '..YYYYY..', '..yYYYy..', '..yy.yy..', '..DD.DD..', '..DD.DD..'], FPAL)
  ];
  L = {
    skyCv, seaCv, island: buildIsland(), boat: buildBoat(), closeBG, FIG,
    fogWallL: fogTex(220, 150, 21, 2.2, 36, true), fogWallR: fogTex(220, 150, 23, 2.2, 36, true),
    fogA: fogTex(640, 70, 41, 1.45, 52), fogB: fogTex(640, 46, 61, 1.35, 44),
    vignette: makeVignette(), ole: portrait('ole')
  };
}

/* ---------- Die Insel von Stufe 1: Klippen, Hütten, Steg ---------- */
function buildIsland() {
  const pb = new PB(IL_W, IL_H);
  // Höhenprofil der Klippen
  const keys = [[34, 60], [40, 50], [56, 45], [72, 41], [82, 26], [92, 17], [112, 13], [130, 16], [150, 11], [168, 19], [178, 31], [194, 33], [206, 23], [224, 18], [242, 22], [256, 35], [266, 50], [272, 62]];
  const top = new Array(IL_W).fill(999);
  for (let k = 0; k < keys.length - 1; k++) {
    const [x0, y0] = keys[k], [x1, y1] = keys[k + 1];
    for (let x = x0; x <= x1; x++) top[x] = y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  for (let x = 34; x <= 272; x++) top[x] = Math.round(top[x] + (vnoise(x / 4, 2, 5) - .5) * 4 + (hash(x, 0, 9) < .15 ? 1 : 0));
  // Bauplätze einebnen
  const HOUSES = [[90, 14], [116, 12], [140, 16], [212, 13], [229, 12]];
  HOUSES.forEach(([hx, hw]) => { let m = 999; for (let x = hx - 1; x <= hx + hw; x++) m = Math.min(m, top[x]); for (let x = hx - 1; x <= hx + hw; x++) top[x] = m; });
  // Fels
  for (let x = 34; x <= 272; x++) {
    for (let y = top[x]; y < WL; y++) {
      const d = y - top[x];
      const n = vnoise(x / 2.6, y / 8, 11);
      let l = .55 - d / 42 + (n - .5) * .75 + (bay(x, y) - .5) * .25;
      if (top[x] < top[x - 1] - 1) l += .2;           // nach links gewandte, hellere Kanten
      if (top[x] > top[x + 1] + 1) l -= .2;
      let c = pick(ROCK, l);
      if (d > 4 && hash(x, y >> 2, 5) < .045) c = '#3d444a';    // Risse
      if (y >= WL - 3) c = ROCK[3];                              // nasser Fuß
      if (d < 2 || (d === 2 && hash(x, 7, 3) < .45) || (d === 3 && hash(x, 8, 3) < .15)) c = GRASS[d === 0 ? (hash(x, 1, 2) < .5 ? 0 : 1) : d === 1 ? 1 : 2];
      pb.set(x, y, c);
    }
  }
  // Hütten mit Reetdach, Fenster und Schornstein
  function hut(x, base, w, seed) {
    const wallH = 7, rh = Math.ceil(w / 2) + 1, cx = x + (w - 1) / 2;
    for (let y = base - wallH; y < base; y++) for (let i = 0; i < w; i++) {
      const c = (y - base) % 3 === 0 ? WOOD[3] : (i === 0 ? WOOD[0] : WOOD[1 + ((i + seed) % 4 === 0 ? 1 : 0)]);
      pb.set(x + i, y, c);
    }
    pb.rect(x + 2, base - 5, 2, 5, '#24180f');                      // Tür
    const wx = x + w - 5; pb.rect(wx - 1, base - 6, 4, 4, WOOD[3]); pb.rect(wx, base - 5, 2, 2, WARM);
    WINDOWS.push([wx + 1, base - 4]);
    for (let k = 0; k < rh; k++) {                                  // Satteldach aus Reet
      const y = base - wallH - 1 - k, half = (w + 2) / 2 * (1 - k / rh);
      for (let xx = Math.round(cx - half); xx <= Math.round(cx + half); xx++) {
        let c = k % 2 ? THATCH[1] : THATCH[2];
        if (xx < cx - half + 1.5) c = THATCH[0];
        if (k === 0) c = THATCH[3];
        pb.set(xx, y, c);
      }
    }
    const chx = x + w - 4, chy = base - wallH - rh + 1;
    pb.rect(chx, chy, 2, 4, '#5c656b'); pb.set(chx, chy, '#8d969b');
    CHIMNEYS.push([chx + 1, chy - 1]);
  }
  HOUSES.forEach(([hx, hw], i) => hut(hx, top[hx] + 1, hw, i));
  // Steg mit Pfählen und Pfahlhaus
  for (let x = 0; x <= 48; x++) { pb.set(x, WL - 6, x % 4 === 0 ? WOOD[3] : WOOD[0]); pb.set(x, WL - 5, WOOD[2]); }
  for (let x = 2; x <= 46; x += 7) pb.rect(x, WL - 4, 2, 10, x % 2 ? WOOD[2] : WOOD[3]);
  pb.rect(0, WL - 10, 2, 4, WOOD[2]); pb.set(0, WL - 10, WOOD[0]);
  hut(26, WL - 6, 13, 7);
  // Fischgestell auf der flachen Schulter
  pb.rect(44, WL - 16, 1, 8, WOOD[3]); pb.rect(56, WL - 19, 1, 9, WOOD[3]);
  for (let x = 45; x < 56; x++) pb.set(x, WL - 16 - Math.round((x - 45) * 3 / 11), WOOD[2]);
  [47, 50, 53].forEach(x => { const y = WL - 15 - Math.round((x - 45) * 3 / 11); pb.rect(x, y, 1, 3, '#b8c6cc'); pb.set(x, y + 2, '#8fa2aa'); });
  pb.outline('#262c31');
  return pb.canvas();
}

/* ---------- Unser Boot: Blick über den Bug nach vorn ---------- */
function buildBoat() {
  const pb = new PB(W, H - BOW_Y + 4);
  const TX = 168, TY = 14;                                      // Bugspitze (in Ebenen-Koordinaten)
  const sl = (20 - TX) / (72 - TY), sr = (320 - TX) / (72 - TY);
  for (let y = TY; y < pb.h; y++) {
    const xl = TX + (y - TY) * sl, xr = TX + (y - TY) * sr, rw = 2 + (y - TY) * .13;
    for (let x = Math.floor(xl); x <= Math.ceil(xr); x++) {
      if (x < xl || x > xr) continue;
      let c;
      if (x - xl < rw) c = (x - xl < rw * .45) ? '#b8936a' : WOOD[2];         // linke Reling
      else if (xr - x < rw) c = (xr - x < rw * .45) ? '#9a7650' : WOOD[3];   // rechte Reling
      else {
        const u = (x + .5 - TX) / Math.max(1, (y - TY));
        const k = (u + 3) * 3.1, fr = k - Math.floor(k);
        c = fr < .14 ? '#2c1f15' : (Math.floor(k) % 2 ? WOOD[1] : WOOD[2]);
        if (c !== '#2c1f15' && hash(x, y, 4) < .05) c = '#9a7a58';          // nasse Glanzstellen
      }
      pb.set(x, y, c);
    }
  }
  // Steven mit Tauwerk
  pb.rect(TX - 2, TY - 12, 4, 14, WOOD[2]); pb.rect(TX - 2, TY - 12, 1, 14, WOOD[0]); pb.rect(TX - 3, TY - 13, 6, 2, WOOD[3]);
  for (let y = TY - 8; y < TY - 2; y += 2) pb.rect(TX - 3, y, 6, 1, '#c2a774');
  // Taurolle auf dem Deck
  for (let y = 46; y < 62; y++) for (let x = 96; x < 132; x++) {
    const r = Math.hypot((x + .5 - 114) / 16, (y + .5 - 54) / 6.5);
    if (r <= 1 && r > .35) pb.set(x, y, (Math.floor(r * 9) % 2) ? '#c2a774' : '#8e7650');
  }
  pb.outline('#1d140d');
  return pb.canvas();
}

const LANTERN_OFF = [[7, 9], [7, 6], [7, 1]];   // Flammenpunkt je Bild der Figur
const camX = (t) => 150 * ease(t / 11);

/* ---------- Weite Einstellung: Meer, Insel, Rauch, Nebel, Boot ---------- */
function renderWide(ctx, o) {
  const { time, cam, fog, smoke, fig, boatOn = true } = o;
  ctx.drawImage(L.skyCv, Math.round(-cam * .12 - 10), 0);
  ctx.drawImage(L.seaCv, 0, HOR);
  // Wellenkämme
  for (let row = 0, y = HOR + 2; y < H; row++) {
    const f = (y - HOR) / (H - HOR), gap = 2 + Math.floor(f * 5);
    const par = .35 + f * 1.1, off = cam * par + time * (3 + f * 9), spacing = 16 + f * 26;
    for (let i = 0; i < 24; i++) {
      const x = ((i * spacing + hash(row, i, 8) * spacing * .8 - off) % (W + 40) + W + 40) % (W + 40) - 20;
      const len = Math.round(2 + f * 7 * hash(row, i, 9)), ph = Math.sin(time * 1.6 + i + row) > -.2;
      if (!ph) continue;
      ctx.fillStyle = f < .25 ? '#93a8b1' : '#7d97a3';
      ctx.fillRect(Math.round(x), y, len, 1);
      if (f > .35) { ctx.fillStyle = '#243644'; ctx.fillRect(Math.round(x) + 1, y + 1, len, 1); }
    }
    y += gap;
  }
  const IX = Math.round(145 - cam * .6), IY = HOR - WL;
  // Spiegelung der Insel
  ctx.globalAlpha = .2;
  for (let r = 0; r < 22; r++) ctx.drawImage(L.island, 0, WL - 1 - r, IL_W, 1, IX + Math.round(Math.sin(r * .9 + time * 2.4) * 1.2), HOR + r, IL_W, 1);
  ctx.globalAlpha = 1;
  for (const [wx, wy] of WINDOWS) if (wy > WL - 12) { ctx.fillStyle = 'rgba(246,201,108,.45)'; for (let k = 0; k < 3; k++) ctx.fillRect(IX + wx - 1 + Math.round(Math.sin(time * 3 + k) * 1), HOR + 3 + k * 2, 3 - (k > 1 ? 1 : 0), 1); }
  ctx.drawImage(L.island, IX, IY);
  // Gischt am Fuß der Klippen
  ctx.fillStyle = '#c9d6d9';
  for (let x = 34; x < 272; x++) if (hash(x, Math.floor(time * 3), 4) < .45) ctx.fillRect(IX + x, HOR, 1, 1);
  // Fenster flackern leicht
  for (const [wx, wy] of WINDOWS) if (Math.sin(time * 7 + wx) > .7) { ctx.fillStyle = '#ffe2a0'; ctx.fillRect(IX + wx - 1, IY + wy - 1, 1, 1); }
  // Fischer auf dem Steg
  if (fig != null) {
    const fx = IX + 6, fy = IY + WL - 6 - 15;
    ctx.drawImage(L.FIG[fig], fx, fy);
    const [lx, ly] = LANTERN_OFF[fig], fl = .5 + Math.sin(time * 11) * .08 + Math.sin(time * 17) * .05;
    glow(ctx, fx + lx + .5, fy + ly + .5, fig === 2 ? 16 : 10, fl);
    ctx.fillStyle = 'rgba(255,211,107,.55)';
    for (let k = 0; k < 4; k++) ctx.fillRect(fx + lx - 1 + Math.round(Math.sin(time * 4 + k * 1.7)), HOR + 2 + k * 2, 3, 1);
  }
  // Nebel: Wand vor der Insel teilt sich, Schwaden ziehen
  const part = fog;
  if (part < 1) {
    const wa = 1 - part, split = part * 120;
    ctx.globalAlpha = wa;
    ctx.drawImage(L.fogWallL, IX - 60 - split, IY - 40);
    ctx.drawImage(L.fogWallR, IX + 110 + split, IY - 40);
    ctx.globalAlpha = 1;
  }
  // Rauchsäulen
  if (smoke > 0) {
    for (let c = 0; c < CHIMNEYS.length; c++) {
      const [cx, cy] = CHIMNEYS[c], N = 12;
      for (let i = 0; i < N; i++) {
        const p = ((time * .2 + i / N + c * .37) % 1), born = time - p / .2;
        if (born < 2.2) continue;
        const a = (1 - p * .8) * smoke * clamp((born - 2.2) / 1, 0, 1) * clamp(fog + p * 4 - .3, 0, 1);
        if (a <= .02) continue;
        const sx = IX + cx + Math.sin(p * 5 + i + c) * 1.6 + p * 12, sy = IY + cy - p * 56;
        ctx.globalAlpha = a;
        disc(ctx, sx, sy, 1.5 + p * 5, p < .3 ? '#6b747a' : p < .65 ? '#80898f' : '#98a1a6');
      }
    }
    ctx.globalAlpha = 1;
  }
  drawTiled(ctx, L.fogA, -cam * .55 - time * 6, HOR - 46, .85 - part * .55);
  drawTiled(ctx, L.fogB, -cam * .9 - time * 11, HOR - 12, .75 - part * .45);
  if (boatOn) ctx.drawImage(L.boat, 0, BOW_Y + Math.round(Math.sin(time * 1.5) * 1.5 + .5));
}

/* ---------- Einstellung 4: Steg in dreifacher Pixelgröße, Himmel und Meer bleiben fein ---------- */
function renderPier(ctx, t, lt, fig) {
  const S = 3, HZ = 128, drift = Math.round(lt * 3);
  ctx.fillStyle = SKY[0]; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(L.skyCv, -40, HZ - HOR);
  ctx.drawImage(L.seaCv, 0, 0, W, H - HOR, 0, HZ, W, H - HOR);
  for (let row = 0, y = HZ + 2; y < H; row++) {
    const f = (y - HZ) / (H - HZ);
    for (let i = 0; i < 18; i++) {
      const x = ((i * 26 + hash(row, i, 8) * 20 - t * (5 + f * 10)) % 360 + 360) % 360 - 20;
      if (Math.sin(t * 1.6 + i + row) < -.2) continue;
      ctx.fillStyle = '#7d97a3'; ctx.fillRect(Math.round(x), y, Math.round(2 + f * 8 * hash(row, i, 9)), 1);
    }
    y += 2 + Math.floor(f * 4);
  }
  drawTiled(ctx, L.fogA, -t * 6, HZ - 52, .45);
  const dx = 70 - drift, dy = HZ + 6 - WL * S;
  // Rauch aus dem Pfahlhaus
  const [cx, cy] = CHIMNEYS[CHIMNEYS.length - 1];
  for (let i = 0; i < 10; i++) {
    const p = (t * .18 + i / 10) % 1;
    ctx.globalAlpha = (1 - p) * .8;
    disc(ctx, dx + (cx + p * 8 + Math.sin(p * 5 + i) * 1.4) * S, dy + (cy - p * 30) * S, 3 + p * 9, p < .4 ? '#6b747a' : '#8a9399');
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(L.island, 0, 0, IL_W, IL_H, dx, dy, IL_W * S, IL_H * S);
  const fx = dx + 6 * S, fy = dy + (WL - 21) * S;
  ctx.drawImage(L.FIG[fig], 0, 0, 9, 15, fx, fy, 27, 45);
  const [lx, ly] = LANTERN_OFF[fig], fl = .55 + Math.sin(t * 11) * .08 + Math.sin(t * 17) * .05;
  glow(ctx, fx + (lx + .5) * S, fy + (ly + .5) * S, fig === 2 ? 46 : 30, fl);
  ctx.fillStyle = 'rgba(255,211,107,.5)';
  for (let k = 0; k < 5; k++) ctx.fillRect(fx + lx * S - 3 + Math.round(Math.sin(t * 4 + k * 1.7) * 2), HZ + 10 + k * 4, 8 - k, 1);
  drawTiled(ctx, L.fogB, -t * 14, HZ - 8, .35);
}
const vig = (ctx) => { ctx.globalAlpha = .55; ctx.drawImage(L.vignette, 0, 0); ctx.globalAlpha = 1; };

export default {
  id: 'cs_npc_ole',
  title: 'Rauch hinter dem Nebel',
  len: T_END,
  dialog: 'ole_1',
  setup,
  shots: [
    // Einstellungen 1–3: Bug, Nebel, Rauch, Nebel reißt auf (eine Kamerafahrt nach rechts)
    { from: 0, to: T_SHOT4, draw(ctx, lt, t) {
      renderWide(ctx, { time: t, cam: camX(t), fog: ease((t - T_FOG) / 3.5), smoke: clamp((t - 2.6) / 2, 0, 1), fig: t > 9.5 ? 0 : null });
      rain(ctx, t, 150, false);
      vig(ctx);
      black(ctx, 1 - t / 1.2);
    } },
    // Einstellung 4: harter Schnitt, dreifache Pixelgröße auf den Steg – die Laterne wird gehoben
    { from: T_SHOT4, to: T_SHOT5, draw(ctx, lt, t) {
      renderPier(ctx, t, lt, lt < .55 ? 0 : lt < 1 ? 1 : 2);
      rain(ctx, t, 110, true);
      vig(ctx);
    } },
    // Einstellung 5: Großaufnahme, misstrauischer Blick, Abblende
    { from: T_SHOT5, to: T_END, draw(ctx, lt, t) {
      ctx.drawImage(L.closeBG, 0, 0);
      glow(ctx, 268, 70, 60, .22); glow(ctx, 40, 150, 40, .12);
      const eyes = lt < .55 ? 0 : (lt < .68 ? 2 : 1);
      ctx.drawImage(L.ole(eyes, 0), 0, 0, 64, 80, 96, 6 - Math.round(ease(lt / 2) * 2), 128, 160);
      glow(ctx, 236, 96, 34, .16 + Math.sin(t * 11) * .03);
      rain(ctx, t, 90, true);
      vig(ctx);
      black(ctx, (t - T_FADE) / .6);
    } }
  ],
  // Hintergrund des Dialogs: die Insel nach der Szene, ohne Boot, Ole mit Laterne; el = Sekunden seit Dialogbeginn, now = Uhr (s)
  dialogBg(ctx, el, now) {
    renderWide(ctx, { time: T_SHOT4 + el, cam: camX(11), fog: 1, smoke: 1, fig: 1, boatOn: false });
    rain(ctx, now, 150, false);
    vig(ctx);
  }
};
