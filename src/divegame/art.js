/* =========================================================
   UNTERWASSER-GRAFIK für das Tauch-Minispiel (ui/divegame.js) und die Szene cs_abstieg
   Alles prozedural Pixel für Pixel wie die Cutscenes (cutscene/kit.js: PB, Kontur, Bayer-Dithering, Licht von links oben),
   eigene Palette: Türkis oben bis Dunkelblau unten. Statisches wird einmal vorgerendert (art()), Bewegtes je Bild gezeichnet.
     art()                – vorgerenderte Ebenen und Sprites (einmal, dann behalten)
     waterLayer(w, h, top, bottom) – Wasser mit Verlauf und geditherten Stufen
     drawRays(ctx, t, a)  – schräge Lichtstrahlen (Ebene, die langsam schwankt)
     drawMotes(ctx, t, n) – Schwebeteilchen
     makeSchool(n, seed, y0, y1), drawFish(ctx, school, t, flee) – kleine Fische (weichen aus)
     drawBell(ctx, x, y, t, lamp) – Taucherglocke (Mitte oben x, y = Oberkante)
     diverFrame(pose, k) – Taucher mit Helm (Füße unten in der Mitte, Blick nach rechts)
     itemSprite(id)       – Suchziele (Kompass, Uhr …, Alte Karte)
   ========================================================= */
import { W, H, clamp, lerp, bay, hash, fbm, PB, layer, tpl, mix, canvas } from '../cutscene/kit.js';
import { wappen } from '../cutscene/motifs.js';

/* ---------- Paletten ---------- */
export const WATER = ['#6fd8cc', '#52c2c2', '#3aa6b6', '#2c88a6', '#236c92', '#1c5480', '#173f6a', '#122e54', '#0d2040', '#09162e'];
export const SAND = ['#c4cc9c', '#a2b08a', '#7e9478', '#5c7668', '#405a58', '#2c4048'];
export const STONE = ['#8eaab0', '#6a8c98', '#4c6e80', '#355468', '#223c50'];
export const BRICK = ['#9a9488', '#7a7a76', '#5c6268', '#424c58', '#2c3646'];
export const RUST = ['#c88a5a', '#9a6446', '#6c4a3c', '#463430'];
export const PLANKC = ['#9a8a6a', '#76705a', '#56584e', '#3a4240'];
export const BRASS = ['#f8dc8a', '#e0b24e', '#b07e32', '#7a5222', '#4a3016'];
export const SUIT = ['#dcc6a0', '#b49c78', '#8a7456', '#5e4c3a', '#3c3026'];   // Segeltuch, warm gegen das blaue Wasser
export const GLOVE = ['#7a6a52', '#5a4c3c', '#3e342a', '#2a221c'];
export const LEAD = ['#7a8a92', '#56666e', '#38464e'];
export const GLASS = ['#0e2a36', '#1c4a58', '#bfeaf0'];
export const HOSE = ['#5e5446', '#3e362e', '#241e1a'];
export const WEED = ['#5e9a6a', '#3e7a5a', '#2a5a4a'];
export const EDGE = '#08141e';
const pickR = (r, l) => r[l > .45 ? 0 : l > .1 ? 1 : l > -.25 ? 2 : 3];
const step = (r, l, x, y) => r[clamp(Math.round(l + (bay(x, y) - .5) * .9), 0, r.length - 1)];

/* ---------- Helfer ---------- */
export function line(pb, x0, y0, x1, y1, c) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
  for (let i = 0; i <= n; i++) pb.set(Math.round(lerp(x0, x1, i / n)), Math.round(lerp(y0, y1, i / n)), typeof c === 'function' ? c(i, n) : c);
}
export function capsule(pb, ax, ay, bx, by, r0, r1, ramp, bias = 0) {
  const vx = bx - ax, vy = by - ay, ll = vx * vx + vy * vy || 1, R = Math.max(r0, r1);
  for (let y = Math.floor(Math.min(ay, by) - R - 1); y <= Math.max(ay, by) + R + 1; y++) for (let x = Math.floor(Math.min(ax, bx) - R - 1); x <= Math.max(ax, bx) + R + 1; x++) {
    const px = x + .5, py = y + .5, u = clamp(((px - ax) * vx + (py - ay) * vy) / ll, 0, 1), r = lerp(r0, r1, u);
    const nx = (px - ax - u * vx) / r, ny = (py - ay - u * vy) / r, d = nx * nx + ny * ny;
    if (d > 1) continue;
    pb.set(x, y, pickR(ramp, -(nx * .62 + ny * .55) * .9 + (1 - d) * .22 + (bay(x, y) - .5) * .3 + bias));
  }
}
export function ellipse(pb, cx, cy, rx, ry, ramp, bias = 0, clip) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const nx = (x + .5 - cx) / rx, ny = (y + .5 - cy) / ry, d = nx * nx + ny * ny;
    if (d > 1 || (clip && !clip(x, y))) continue;
    pb.set(x, y, pickR(ramp, -(nx * .62 + ny * .55) * .9 + (1 - d) * .22 + (bay(x, y) - .5) * .3 + bias));
  }
}
const cvOf = (pb, edge = EDGE) => { if (edge) pb.outline(edge); return pb.canvas(); };
// Wasserfarbe in der Tiefe u (0 = oben, 1 = unten), geditherte Stufen
export const waterAt = (u, x, y) => WATER[clamp(Math.round(u * (WATER.length - 1) + (bay(x, y) - .5) * .6), 0, WATER.length - 1)];

/* ---------- Wasser: Verlauf (top/bottom = Anteil der Palette oben/unten) ---------- */
export function waterLayer(w, h, top = .05, bottom = .85, seed = 1) {
  return layer(w, h, (x, y) => {
    const u = lerp(top, bottom, y / (h - 1)) + (fbm(x / 60, y / 30, seed, 2) - .5) * .12;
    return waterAt(u, x, y);
  });
}

/* ---------- Lichtstrahlen: helle, schräge Bahnen (geditherte Pixel), schwanken langsam ---------- */
const RAY_W = W + 120;
function buildRays() {
  const beams = [[30, 14, .9], [92, 9, .6], [140, 20, .8], [214, 11, .55], [268, 16, .75], [360, 12, .6], [410, 18, .7]];
  const c = canvas(RAY_W, H), x = c.getContext('2d'), im = x.createImageData(RAY_W, H);
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < RAY_W; xx++) {
    let a = 0;
    for (const [bx, bw, k] of beams) {
      const cx = bx + yy * .45, d = Math.abs(xx - cx) / (bw * (1 + yy / 260));
      if (d < 1) a = Math.max(a, (1 - d * d) * k * (1 - yy / (H * 1.15)));
    }
    if (a <= 0 || bay(xx, yy) > a * .55) continue;
    const i = (yy * RAY_W + xx) * 4;
    im.data[i] = 190; im.data[i + 1] = 246; im.data[i + 2] = 236; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c;
}
// a = Deckkraft (0–1); off = zusätzliche Verschiebung (Kamera)
export function drawRays(ctx, t, a = .22, off = 0) {
  const A = art(), sway = Math.sin(t * .35) * 14 + Math.sin(t * .13) * 8;
  ctx.globalAlpha = a * (.85 + Math.sin(t * .9) * .15);
  ctx.drawImage(A.rays, Math.round(-60 + sway - off), 0);
  ctx.globalAlpha = 1;
}

/* ---------- Schwebeteilchen: helle Punkte, die langsam sinken und treiben ---------- */
export function drawMotes(ctx, t, n = 70, seed = 3, offY = 0) {
  for (let i = 0; i < n; i++) {
    const near = hash(i, 1, seed) < .25, sp = near ? 5 : 2.5;
    const x = ((hash(i, 2, seed) * 360 + Math.sin(t * .4 + i) * 6 + t * (near ? 3 : 1.5)) % 340 + 340) % 340 - 10;
    const y = ((hash(i, 3, seed) * 200 + t * sp - offY) % 200 + 200) % 200 - 10;
    ctx.fillStyle = near ? 'rgba(220,250,240,.75)' : 'rgba(170,226,222,.45)';
    ctx.fillRect(Math.round(x), Math.round(y), near && hash(i, 4, seed) < .3 ? 2 : 1, 1);
  }
}

/* ---------- Fische: kleiner Schwarm, weicht einem Punkt aus (flee = { x, y, r }) ---------- */
const FISH_PAL = [
  { b: '#c8e4e8', d: '#7aa8b8', f: '#4c7a90' },   // silbrig
  { b: '#f0d27a', d: '#c49a48', f: '#8a6a34' }    // gelblich
];
function fishSprite(p, big) {
  const rows = big ? ['..ddd...', '.dbbbdf.', 'bbebbbff', '.dbbbdf.', '..ddd...'] : ['.dd..', 'bebbf', '.dd..'];
  return tpl(rows, { b: p.b, d: p.d, f: p.f, e: '#0c1a22' }, '#0c2030');
}
export function makeSchool(n, seed, y0, y1, dir = 1) {
  const fish = [];
  for (let i = 0; i < n; i++) fish.push({ ox: hash(i, 1, seed) * 70, oy: hash(i, 2, seed) * (y1 - y0), ph: hash(i, 3, seed) * 6.28, sp: .8 + hash(i, 4, seed) * .4,
    big: hash(i, 5, seed) < .3, pal: hash(i, 6, seed) < .25 ? 1 : 0, dx: 0, dy: 0 });
  return { fish, seed, y0, y1, dir, x: hash(9, 9, seed) * 320, speed: 9 + hash(8, 8, seed) * 6 };
}
// Schwarm einen Schritt weiter (dt s) und zeichnen; flee: Punkt, vor dem die Fische ausweichen
export function drawFish(ctx, S, t, dt, flee) {
  const A = art();
  S.x += S.dir * S.speed * dt;
  if (S.dir > 0 && S.x > 400) S.x = -110; if (S.dir < 0 && S.x < -110) S.x = 400;
  for (const f of S.fish) {
    let x = S.x + f.ox * S.dir + Math.sin(t * 1.3 * f.sp + f.ph) * 3, y = S.y0 + f.oy + Math.sin(t * .9 + f.ph) * 2;
    if (flee) {   // ausweichen: Versatz wächst, solange der Punkt nah ist, und klingt danach ab
      const ex = x + f.dx - flee.x, ey = y + f.dy - flee.y, d = Math.hypot(ex, ey);
      if (d < flee.r) { const k = (1 - d / flee.r) * 70 * dt; f.dx += ex / (d || 1) * k; f.dy += ey / (d || 1) * k; }
    }
    f.dx *= Math.pow(.6, dt); f.dy *= Math.pow(.6, dt);
    x += f.dx; y += f.dy;
    const sp = A.fish[f.pal][f.big ? 1 : 0];
    if (S.dir < 0) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(sp, -Math.round(x) - sp.width, Math.round(y)); ctx.restore(); }
    else ctx.drawImage(sp, Math.round(x), Math.round(y));
  }
}

/* ---------- Taucherglocke (Seitenansicht): Messing, Nietreihen, Bullaugen mit Lampenlicht, Ballast am Rand ---------- */
export const BELL_W = 46, BELL_H = 42;
const BTOP = 7, BSH = 18, BBOT = 36, BR0 = 11, BR1 = 19, BCX = 23;
export const bellHalf = (y) => y < BSH ? BR0 * Math.sqrt(clamp(1 - Math.pow(1 - (y - BTOP) / (BSH - BTOP), 2), 0, 1)) : lerp(BR0, BR1, Math.pow((y - BSH) / (BBOT - BSH), 1.3));
export const BELL_PORTS = [[BCX, 25, 4.2], [BCX - 12, 27, 2.6], [BCX + 12, 27, 2.6]];
function buildBell(lit) {
  const pb = new PB(BELL_W, BELL_H);
  // Öse und Kettenglied oben
  for (let y = 0; y < BTOP; y++) for (let x = BCX - 2; x <= BCX + 2; x++) { const d = Math.hypot(x + .5 - BCX - .5, y + .5 - 3); if (d > 1.2 && d < 3) pb.set(x, y, BRASS[d < 2 ? 2 : 3]); }
  for (let y = BTOP; y <= BBOT; y++) {
    const h = bellHalf(y);
    for (let x = Math.floor(BCX - h); x <= BCX + h; x++) {
      const nx = (x + .5 - BCX) / Math.max(1, h), l = 1.2 + nx * 1.8 + Math.pow(Math.abs(nx), 5) * 1.2 - (y < BSH ? (BSH - y) * .05 : 0);
      let c = step(BRASS, l, x, y);
      if ((y === BSH + 4 || y === BSH + 11) && (x & 1)) c = BRASS[4];          // Nietreihen
      if (Math.abs(nx) > .93) c = BRASS[nx < 0 ? 2 : 4];
      pb.set(x, y, c);
    }
  }
  // Glanzlicht links oben
  for (let y = BTOP + 3; y < BSH + 8; y++) pb.set(Math.round(BCX - bellHalf(y) * .55), y, BRASS[0]);
  // Bullaugen: Messingring, Glas mit Licht
  for (const [px, py, r] of BELL_PORTS) {
    for (let y = Math.floor(py - r - 1); y <= py + r + 1; y++) for (let x = Math.floor(px - r - 1); x <= px + r + 1; x++) {
      const d = Math.hypot(x + .5 - px, y + .5 - py);
      if (d > r + 1.2) continue;
      if (d > r - .2) pb.set(x, y, d > r + .6 ? BRASS[4] : BRASS[x < px ? 1 : 3]);
      else if (lit) pb.set(x, y, d < r * .5 ? '#fff0b8' : bay(x, y) < .5 ? '#f6c86a' : '#d89a48');
      else pb.set(x, y, d < r * .45 && x < px ? GLASS[1] : GLASS[0]);
    }
    pb.set(Math.round(px - r * .4), Math.round(py - r * .4), lit ? '#fffbe8' : GLASS[2]);
  }
  // Rand mit Ballastgewichten
  for (let x = BCX - BR1 - 3; x <= BCX + BR1 + 3; x++) for (let y = BBOT + 1; y <= BBOT + 4; y++) {
    const blk = Math.floor((x - BCX + 40) / 6) % 2;
    pb.set(x, y, y === BBOT + 1 ? LEAD[0] : LEAD[blk ? 1 : 2]);
  }
  // Schlauchanschluss unten in der Mitte
  pb.rect(BCX - 1, BBOT + 5, 3, 2, BRASS[3]);
  return cvOf(pb);
}
// Glocke zeichnen: x = Mitte, y = Oberkante (Öse); lamp = Bullaugen leuchten; liefert den Schlauchanschluss { x, y }
export function drawBell(ctx, x, y, t, lamp = true) {
  const A = art(), sw = Math.round(Math.sin(t * .8) * 1);
  ctx.drawImage(lamp ? A.bellLit : A.bell, Math.round(x - BCX + sw), Math.round(y));
  return { x: Math.round(x + sw), y: Math.round(y + BBOT + 6) };
}
// Kette von oben bis zur Öse
export function drawChain(ctx, x, y0, y1) {
  for (let y = Math.floor(y0); y < y1; y += 3) {
    ctx.fillStyle = BRASS[3]; ctx.fillRect(Math.round(x) - 1, y, 3, 2);
    ctx.fillStyle = BRASS[4]; ctx.fillRect(Math.round(x), y + 1, 1, 1);
    ctx.fillStyle = LEAD[2]; ctx.fillRect(Math.round(x), y + 2, 1, 1);
  }
}

/* ---------- Taucher (Seitenansicht, Blick nach rechts): Messinghelm mit Sichtfenster, Segeltuch-Anzug, Bleischuhe ----------
   pose = { legs: [Winkel vorn, Winkel hinten] (Bogenmaß, 0 = gerade nach unten), arm: Winkel (0 = nach unten, + = nach vorn),
            arm2: zweiter Arm (hinten) }. Gezeichnet in Grundmaßen × K. Füße bei (DIVER_FX, DIVER_FY), Helm oben.
   Schlauchanschluss hinten am Helm: HOSE_AT; Hand: HAND_AT(arm). */
const K = 1.45;
export const DIVER_W = 34, DIVER_H = 38, DIVER_FX = 17, DIVER_FY = 36;
const OX = DIVER_FX - 12 * K, OY = DIVER_FY - 25 * K;                 // Grundmaß (12, 25) = Füße
const X = (v) => OX + v * K, Y = (v) => OY + v * K;
export const HOSE_AT = { x: Math.round(X(7.6)), y: Math.round(Y(5.2)) };
// Schweißen: drei Armhaltungen (tief, gerade, hoch); handOff(arm) = Hand relativ zu den Füßen
export const WELD_ARMS = [.75, 1.5, 2.2];
export const handOff = (arm) => { const h = HAND_AT(arm); return { x: h.x - DIVER_FX, y: h.y - DIVER_FY }; };
export const HAND_AT = (arm, len = 6.5) => ({ x: X(12.5 + Math.sin(arm) * len), y: Y(10.5 + Math.cos(arm) * len) });
export function diverFrame(pose) {
  const pb = new PB(DIVER_W, DIVER_H), arm2 = pose.arm2 != null ? pose.arm2 : pose.arm * .4 - .3;
  const cap = (ax, ay, bx, by, r0, r1, ramp, b) => capsule(pb, X(ax), Y(ay), X(bx), Y(by), r0 * K, r1 * K, ramp, b);
  const ell = (cx, cy, rx, ry, ramp, b) => ellipse(pb, X(cx), Y(cy), rx * K, ry * K, ramp, b);
  const hip = { x: 12, y: 17 }, foot = (a) => ({ x: hip.x + Math.sin(a) * 6.3, y: hip.y + Math.cos(a) * 6.3 });
  const F2 = foot(pose.legs[1]), F1 = foot(pose.legs[0]);
  // hinterer Arm und hinteres Bein (im Schatten)
  cap(12, 10.5, 12 + Math.sin(arm2) * 6, 10.5 + Math.cos(arm2) * 6, 1.7, 1.5, SUIT.slice(1), -.25);
  ell(12 + Math.sin(arm2) * 6.3, 10.5 + Math.cos(arm2) * 6.3, 1.5, 1.5, GLOVE.slice(1), -.2);
  cap(hip.x - .5, hip.y, F2.x, F2.y, 2.1, 1.9, SUIT.slice(1), -.25);
  ell(F2.x + .9, F2.y + .5, 2.7, 1.6, LEAD, -.25);
  // Rumpf, Gürtel mit Bleigewichten
  ell(12, 13.6, 4.2, 5.1, SUIT, .05);
  for (let x = Math.round(X(7.9)); x <= X(16.1); x++) { pb.set(x, Math.round(Y(16.2)), (x & 1) ? LEAD[1] : LEAD[2]); pb.set(x, Math.round(Y(16.2)) + 1, LEAD[2]); }
  // vorderes Bein, Schuh mit Bleisohle
  cap(hip.x + .5, hip.y, F1.x, F1.y, 2.2 + .7, 2 + .7, [EDGE, EDGE, EDGE, EDGE], 0);   // innere Kontur: Bein vor dem Rumpf
  cap(hip.x + .5, hip.y, F1.x, F1.y, 2.2, 2, SUIT, 0);
  ell(F1.x + 1, F1.y + .5, 2.8, 1.7, LEAD, 0);
  // Brustplatte (Messing) mit Nieten, Helm
  ell(12.4, 9, 5, 2, BRASS, .15);
  for (let i = -3; i <= 3; i += 2) pb.set(Math.round(X(12.4 + i)), Math.round(Y(9.6)), BRASS[3]);
  ell(12.6, 4.9, 4.7, 4.7, BRASS, .12);
  // Sichtfenster vorn mit Gitter, kleines Fenster oben
  const fx = X(15.4), fy = Y(5.2), fr = 2.5 * K;
  for (let y = Math.floor(fy - fr - 2); y <= fy + fr + 2; y++) for (let x = Math.floor(fx - fr - 2); x <= fx + fr + 2; x++) {
    const d = Math.hypot(x + .5 - fx, y + .5 - fy);
    if (d <= fr) pb.set(x, y, Math.round(x - fx) === 0 && d > 1 ? BRASS[3] : d < fr * .55 && x < fx ? GLASS[1] : GLASS[0]);
    else if (d <= fr + 1.3 && pb.get(x, y)) pb.set(x, y, x < fx ? BRASS[1] : BRASS[3]);
  }
  pb.set(Math.round(fx - fr * .5), Math.round(fy - fr * .45), GLASS[2]);
  const tx = X(12.2), ty = Y(1.6);
  for (let y = Math.floor(ty - 1.6); y <= ty + 1.6; y++) for (let x = Math.floor(tx - 1.6); x <= tx + 1.6; x++) if (Math.hypot(x + .5 - tx, y + .5 - ty) < 1.4) pb.set(x, y, GLASS[0]);
  // Schlauchstutzen hinten
  pb.rect(HOSE_AT.x, HOSE_AT.y - 1, 2, 3, BRASS[3]); pb.set(HOSE_AT.x, HOSE_AT.y - 1, BRASS[2]);
  // vorderer Arm mit Handschuh
  const ax = 12.5 + Math.sin(pose.arm) * 6.5, ay = 10.5 + Math.cos(pose.arm) * 6.5;
  cap(12.5, 10.5, ax, ay, 1.8 + .7, 1.6 + .7, [EDGE, EDGE, EDGE, EDGE], 0);              // innere Kontur: Arm vor dem Rumpf
  cap(12.5, 10.5, ax, ay, 1.8, 1.6, SUIT, .05);
  ell(ax, ay, 1.6, 1.6, GLOVE, 0);
  return cvOf(pb);
}
// Bildsatz: name → Liste von Canvas (Blick nach rechts)
function buildDiver() {
  const P = Math.PI;
  const swim = [0, 1, 2, 3].map(i => { const a = Math.sin(i / 4 * P * 2) * .5; return diverFrame({ legs: [a + .25, -a + .25], arm: .9 + Math.sin(i / 4 * P * 2) * .25 }); });
  const walk = [0, 1, 2, 3].map(i => { const a = Math.sin(i / 4 * P * 2) * .38; return diverFrame({ legs: [a, -a], arm: -a * .8 + .1, arm2: a * .8 }); });
  return {
    idle: [diverFrame({ legs: [.08, -.08], arm: .12 })],
    swim, walk,
    dig: [diverFrame({ legs: [.3, -.25], arm: 1.05, arm2: .8 }), diverFrame({ legs: [.3, -.25], arm: .45, arm2: .3 })],
    weld: WELD_ARMS.map(a => [diverFrame({ legs: [.25, -.2], arm: a, arm2: .7 }), diverFrame({ legs: [.25, -.2], arm: a - .1, arm2: .75 })]),
    hold: [diverFrame({ legs: [.1, -.1], arm: 2.05, arm2: 1.7 })]
  };
}

/* ---------- Suchziele (klein, mit Kontur) ---------- */
const ITEM_ROWS = {
  kompass: { rows: ['..yyy..', '.yGGGy.', 'yGGrGGy', 'yGGrGGy', 'yGGwGGy', '.yGGGy.', '..yyy..'], pal: { y: BRASS[1], G: '#e8e0c4', r: '#c03a2a', w: '#3a4048' } },
  uhr: { rows: ['...y...', '..yYy..', '.yWWWy.', 'yWWkWWy', 'yWWkkWy', 'yWWWWWy', '.yWWWy.', '..yyy..'], pal: { y: BRASS[2], Y: BRASS[0], W: '#f0ead6', k: '#2a2a30' } },
  fernrohr: { rows: ['.......yY', '.....yYYy', '...dYYyy.', '.ddYyy...', 'ddyy.....', 'dd.......'], pal: { y: BRASS[2], Y: BRASS[0], d: '#5a3a24' } },
  becher: { rows: ['sSSSSSs', 'sSWSSSs', '.sSSSs.', '..sSs..', '...s...', '..sSs..', '.sssss.'], pal: { s: '#8a96a0', S: '#d4dce0', W: '#ffffff' } },
  medaille: { rows: ['.r.b.', '.rbb.', '..r..', '.yyy.', 'yYYyy', 'yYyyy', '.yyy.'], pal: { r: '#c03a2a', b: '#3a5aa0', y: BRASS[2], Y: BRASS[0] } },
  lampe: { rows: ['..kk..', '.kyyk.', '.yWWy.', '.yWWy.', '.yWWy.', 'yyyyyy', '.kkkk.'], pal: { k: '#3a3a40', y: BRASS[1], W: '#fff2b0' } },
  karte: { rows: ['.........', 'yyyyyyyy.', 'YppppppYy', 'ypPPPPpyy', 'YppppppYy', 'yyyyyyyy.', '...rr....', '...r.....'], pal: { y: BRASS[2], Y: BRASS[0], p: '#e8d8a8', P: '#a08860', r: '#a83a2a' } },
  ventil: { rows: ['.rrrrr.', 'r..r..r', 'r..r..r', 'rrrRrrr', 'r..r..r', 'r..r..r', '.rrrrr.', '...s...', '..sSs..'], pal: { r: RUST[1], R: RUST[0], s: LEAD[1], S: LEAD[0] } }
};
export const itemSprite = (id) => { const A = art(); return A.items[id] || A.items.kompass; };

/* ---------- Verbogenes Brecheisen (Story-Fund Pumpwerk, 0.21.0) ----------
   Schwerer Stahl: links die gespaltene Klaue am Schwanenhals, rechts die Meißelspitze, das Eisen ist verbogen.
   In der Mitte eine flach geschmiedete Platte mit Aurels Wappen als Prägung – dasselbe Sprite wie auf Wrack und Fahne
   (cutscene/motifs.js wappen('praegung')). */
const STEEL = ['#dfe5e9', '#aeb7bd', '#7f8990', '#566067', '#353c42'];
function buildCrowbar() {
  const w = 74, h = 28, pb = new PB(w, h), PC = 37, MID = 14;
  // Mittellinie des Eisens: links vom Plattenrand leicht nach oben, rechts ein Knick nach unten (verbogen)
  const cy = (x) => x < 24 ? MID - (24 - x) * .16 : x > 50 ? MID + Math.max(0, x - 54) * .32 : MID;
  for (let x = 6; x < w - 2; x++) {
    const c = cy(x), r = x > w - 8 ? 1.6 - (x - (w - 8)) * .18 : 2.2;   // Meißelspitze läuft flach aus
    for (let y = Math.floor(c - r - 1); y <= c + r + 1; y++) {
      const u = (y + .5 - c) / r;
      if (Math.abs(u) > 1) continue;
      pb.set(x, y, STEEL[clamp(Math.round(1.4 + u * 1.7 + (bay(x, y) - .5) * .5), 0, 4)]);
    }
    if (x % 9 === 4 && x > 50) pb.set(x, Math.round(c - 1), STEEL[0]);   // Schlagspuren
  }
  // Schwanenhals mit gespaltener Klaue links
  for (let k = 0; k <= 20; k++) {
    const a = Math.PI * .5 + k / 20 * Math.PI * .95, x = 8 + Math.cos(a) * 6, y = cy(6) + 6 - Math.sin(a) * 6 - 6;
    for (let j = -1.6; j <= 1.6; j += .5) pb.set(Math.round(x + Math.cos(a) * j), Math.round(y - Math.sin(a) * j), STEEL[clamp(Math.round(2 - Math.sin(a) * 1.2 + j * .4), 0, 4)]);
  }
  pb.set(3, Math.round(cy(6) + 5), STEEL[4]); pb.set(4, Math.round(cy(6) + 6), STEEL[4]);
  // Platte: geschmiedetes Oval mit Hammerschlag
  for (let y = 0; y < h; y++) for (let x = PC - 13; x <= PC + 13; x++) {
    const nx = (x + .5 - PC) / 13, ny = (y + .5 - MID) / 13.5;
    if (nx * nx + ny * ny > 1) continue;
    const l = 1.6 + (nx * .6 + ny * .55) * 1.4 + (hash(x >> 1, y >> 1, 77) - .5) * .7;
    pb.set(x, y, STEEL[clamp(Math.round(l + (bay(x, y) - .5) * .5), 0, 4)]);
  }
  pb.outline(EDGE);
  const c = pb.canvas(), cx = c.getContext('2d'), wp = wappen('praegung');
  cx.drawImage(wp, Math.round(PC - wp.width / 2), Math.round(MID - wp.height / 2 + .5));
  return c;
}

/* ---------- alles vorrendern (einmal) ---------- */
let A = null;
export function art() {
  if (A) return A;
  A = {};
  A.rays = buildRays();
  A.fish = FISH_PAL.map(p => [fishSprite(p, false), fishSprite(p, true)]);
  A.bell = buildBell(false); A.bellLit = buildBell(true);
  A.diver = buildDiver();
  A.items = Object.fromEntries(Object.entries(ITEM_ROWS).map(([k, v]) => [k, tpl(v.rows, v.pal, EDGE)]));
  A.items.brecheisen = buildCrowbar();
  return A;
}
export { mix, step, pickR, cvOf };
