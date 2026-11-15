/* =========================================================
   TAUCH-MINISPIEL: Aufbau eines Tauchplatzes (Meeresboden, Haufen, Kiste oder Wracktür) – nur Zeichnen und Lage, keine Regeln
   buildWorld(o) → { bg, fg, gy, piles, obj, vents, weeds }
     o = { task: 'search'|'weld', act, seed, target ({ id, name }), weld ({ id }), junk (Liste aus data/dive.js), cfg (DIVE_GAME) }
   Alles wird aus seed (Spot-ID) gewürfelt, gleicher Spot = gleicher Platz.
   ========================================================= */
import { W, H, clamp, lerp, bay, hash, fbm, PB, layer, canvas } from '../cutscene/kit.js';
import { buildPumpWorld } from './pumpwerk.js';
import { WATER, SAND, STONE, BRICK, RUST, PLANKC, LEAD, BRASS, WEED, EDGE, waterAt, ellipse, capsule, line, step, cvOf } from './art.js';

export const BELL_X = 160, BELL_Y = 3;
const IRON = ['#90a0a4', '#6a7c84', '#4c5c66', '#34424c', '#222e36'];
const WOODW = ['#8a7c62', '#6a6250', '#4e4c42', '#363834', '#24282a'];

// Höhe des Meeresbodens je Spalte
function groundLine(seed) {
  const gy = new Int16Array(W);
  const a = hash(1, 1, seed) * 6, b = hash(2, 1, seed) * 6;
  for (let x = 0; x < W; x++) gy[x] = Math.round(153 + Math.sin(x / 41 + a) * 3 + Math.sin(x / 17 + b) * 1.6);
  return gy;
}

/* ---------- Hintergrund: Wasser, ferne Ruinen (versunkenes Dorf), Felsen, Sand mit Rippeln, Steine, Schrott ---------- */
function buildBg(seed, gy) {
  // ferne Silhouetten: Häuser mit Giebeln, ein Turm, Mauerbögen (Farbe = Wasser etwas tiefer)
  const far = new Int16Array(W).fill(999), mid = new Int16Array(W).fill(999);
  let x = -10 + Math.floor(hash(3, 1, seed) * 20);
  while (x < W) {
    const kind = hash(x, 2, seed), w = 18 + Math.floor(hash(x, 3, seed) * 22), base = 150, hgt = 18 + hash(x, 4, seed) * 22;
    for (let i = 0; i < w; i++) {
      const xx = x + i; if (xx < 0 || xx >= W) continue;
      let top;
      if (kind < .55) { const u = Math.abs(i - w / 2) / (w / 2); top = base - hgt - (1 - u) * w * .45; if (hash(xx >> 2, 7, seed) < .18) top += 6; }   // Haus mit Giebel (Dach eingestürzt)
      else if (kind < .7) top = base - hgt * 2.2 - (Math.abs(i - w / 4) < 2 ? 10 : 0);                                                             // Turm
      else top = base - hgt * .7 + (Math.abs(i - w / 2) < w * .3 ? Math.sqrt(1 - Math.pow((i - w / 2) / (w * .3), 2)) * hgt * .5 : 0) * 0;      // Mauer
      far[xx] = Math.min(far[xx], Math.round(top));
    }
    x += w + 4 + Math.floor(hash(x, 5, seed) * 30);
  }
  for (let xx = 0; xx < W; xx++) mid[xx] = Math.round(gy[xx] - 6 - fbm(xx / 26, 3, seed + 5, 3) * 22 + (hash(xx >> 4, 9, seed) < .3 ? 8 : 0));
  return layer(W, H, (x, y) => {
    const g = gy[x];
    if (y >= g) {   // Sand: Rippel, Licht von oben (oben hell), Bayer-Stufen
      const d = y - g, rip = Math.sin(x / 5 + Math.sin(y / 3) * 1.5 + d * .8) * .5;
      return step(SAND, .4 + d * .16 + rip * .5 + (fbm(x / 14, y / 5, seed + 1, 2) - .5) * 1.2, x, y);
    }
    const u = .05 + y / H * .78 + (fbm(x / 60, y / 30, seed, 2) - .5) * .12;
    if (y >= mid[x]) { const e = y - mid[x]; return e < 1 ? STONE[3] : step(STONE.slice(2), .3 + e * .1 + (fbm(x / 9, y / 9, seed + 7, 2) - .5) * 1.6, x, y); }
    if (y >= far[x]) {
      const win = (Math.floor(x / 5) % 3 === 1) && (Math.floor(y / 6) % 3 === 1) && y > far[x] + 5;   // dunkle Fensterlöcher
      return waterAt(u + (win ? .3 : .16), x, y);
    }
    return waterAt(u, x, y);
  });
}

/* ---------- Vordergrund: versunkene Mauerreste links, Steine und Schrott auf dem Sand ---------- */
function buildFg(seed, gy, rightWall, avoid) {
  const pb = new PB(W, H), fl = new PB(W, H);
  const free = (x, r) => !avoid.some(([a, b]) => x + r > a - 4 && x - r < b + 4);
  // Mauerrest links: Ziegel in Lagen, oben abgebrochen, Algen
  const top = (x) => Math.round(108 + x * .9 + (hash(x >> 1, 3, seed) - .5) * 8 + (x > 18 ? (x - 18) * 2.2 : 0));
  for (let x = 0; x < 34; x++) for (let y = top(x); y < gy[x] + 2; y++) {
    const row = Math.floor(y / 4), off = (row & 1) * 4, mort = y % 4 === 0 || (x + off) % 8 === 0;
    const l = 1 + (x / 34) * 1.6 + (hash(row, (x + off) >> 3, 4) - .5) * .8 + (y - top(x) < 2 ? -1 : 0);
    pb.set(x, y, mort ? BRICK[4] : step(BRICK, l, x, y));
  }
  // Steine (auf dem Boden, hinter Haufen und Taucher; nicht dort, wo Haufen liegen)
  for (let i = 0; i < 12; i++) {
    const x = 36 + hash(i, 1, seed + 3) * 270, r = 2.5 + hash(i, 2, seed + 3) * 4;
    if (!free(x, r * 1.4)) continue;
    ellipse(fl, x, gy[Math.floor(x)] + 1, r * 1.4, r, STONE, .1);
  }
  // Schrott: Rohr, Zahnrad, Planke, Kettenstück
  const bits = 6;
  for (let i = 0; i < bits; i++) {
    const x = 40 + hash(i, 4, seed + 9) * 260, y = gy[Math.floor(x)], k = i % 4;
    if (!free(x, 8)) continue;
    const pb = fl;
    if (k === 0) capsule(pb, x - 7, y - 1, x + 7, y - 3, 1.6, 1.6, RUST);
    else if (k === 1) { for (let a = 0; a < 24; a++) { const ang = a / 24 * Math.PI * 2, r = (a & 1) ? 4 : 3.2; pb.set(Math.round(x + Math.cos(ang) * r), Math.round(y - 3 + Math.sin(ang) * r * .6), RUST[(a & 3) ? 1 : 2]); } }
    else if (k === 2) for (let j = 0; j < 14; j++) { pb.set(Math.round(x + j), Math.round(y - 1 - j * .25), PLANKC[1]); pb.set(Math.round(x + j), Math.round(y - j * .25), PLANKC[2]); }
    else for (let j = 0; j < 5; j++) { pb.set(Math.round(x + j * 2), y - 1, LEAD[1]); pb.set(Math.round(x + j * 2 + 1), y - 2, LEAD[2]); }
  }
  if (!rightWall) capsule(pb, 300, gy[300] - 3, 330, gy[319] - 9, 4.5, 4.5, BRICK.slice(0, 4));   // rechts: umgestürzte Säule
  return { fg: cvOf(pb), floor: cvOf(fl) };
}

/* ---------- Haufen aus Sand und Schrott: 4 Stufen (voll → fast weg) ---------- */
const PILE_STAGES = [1, .66, .38, .14];
const PILE = ['#c2bc8e', '#a49c74', '#80785c', '#5e5a4a', '#403e38'];   // Sand der Haufen: wärmer und dunkler als der Boden
export function buildPile(w, h, seed, pal = PILE, junk = RUST) {
  return PILE_STAGES.map((f, si) => {
    const pb = new PB(w + 4, h + 6), cx = (w + 4) / 2, base = h + 5;
    for (let x = 0; x < w + 4; x++) {
      const u = (x + .5 - cx) / (w / 2);
      if (Math.abs(u) >= 1) continue;
      const top = base - Math.max(1, h * f * Math.pow(1 - u * u, .75) + (fbm(x / 4, si, seed, 2) - .5) * 3 * f);
      for (let y = Math.floor(top); y <= base; y++) {
        const l = .6 + (y - top) * .22 + u * 1.1 + (fbm(x / 3, y / 3, seed + 2, 2) - .5) * 1.4, n = fbm(x / 2.5, y / 2.5, seed + 9, 2);
        pb.set(x, y, n > .72 ? junk[clamp(Math.round(l * .8), 1, 3)] : n < .24 ? STONE[clamp(Math.round(l), 2, 4)] : step(pal, l, x, y));   // Sand mit Rost und Steinchen
      }
    }
    // Schrott, der herausragt (verschwindet beim Graben)
    if (si < 2) {
      const nb = 5 - si * 2;
      for (let i = 0; i < nb; i++) {
        const bx = cx + (hash(i, 1, seed) - .5) * w * .6, by = base - h * f * .55, k = Math.floor(hash(i, 2, seed) * 4);
        if (k === 0) line(pb, bx - 4, by + 1, bx + 3, by - 4, (j) => junk[j & 1]);
        else if (k === 1) { pb.rect(Math.round(bx), Math.round(by - 2), 5, 2, PLANKC[1]); pb.rect(Math.round(bx), Math.round(by), 5, 1, PLANKC[3]); }
        else if (k === 2) { for (let a = 0; a < 12; a++) { const ang = a / 12 * Math.PI * 2; pb.set(Math.round(bx + Math.cos(ang) * 2.5), Math.round(by + Math.sin(ang) * 2), junk[a & 1 ? 1 : 2]); } }
        else { pb.set(Math.round(bx), Math.round(by), STONE[1]); pb.set(Math.round(bx + 1), Math.round(by), STONE[2]); pb.set(Math.round(bx), Math.round(by + 1), STONE[3]); }
      }
    }
    return cvOf(pb, si === 3 ? null : EDGE);
  });
}
// ausgegrabene Stelle: flache Mulde mit Rand
export function buildDip(w) {
  const pb = new PB(w + 8, 6), cx = (w + 8) / 2;
  for (let x = 0; x < w + 8; x++) {
    const u = Math.abs(x + .5 - cx) / ((w + 8) / 2);
    if (u >= 1) continue;
    const rim = u > .7 ? 2 : 0;
    for (let y = 4 - rim; y < 6; y++) pb.set(x, y, u < .7 ? SAND[3 + (bay(x, y) < .5 ? 1 : 0)] : SAND[y === 4 - rim ? 0 : 1]);
  }
  return pb.canvas();
}

/* ---------- Kiste mit zugeschweißter Klappe (weld 'kiste') ---------- */
function buildCrate(hw, hd, seed) {
  const bw = hw + 14, bh = hd + 14, dep = 6;
  const make = (open) => {
    const pb = new PB(bw + dep, bh + dep);
    // Oberseite und Seite (etwas Tiefe), Front
    for (let y = 0; y < dep; y++) for (let x = dep - y; x < bw + dep - y; x++) pb.set(x, y, step(IRON, .4 + (x / bw) * 1.2, x, y));
    for (let x = bw; x < bw + dep; x++) for (let y = dep - (x - bw); y < bh + dep - (x - bw); y++) pb.set(x, y, step(IRON, 2.6, x, y));
    for (let y = dep; y < bh + dep; y++) for (let x = 0; x < bw; x++) {
      let l = 1 + (x / bw) * 1.4 + (fbm(x / 8, y / 8, seed, 3) - .5) * 1.2;
      const rust = fbm(x / 7, y / 6, seed + 4, 3) > .68;
      pb.set(x, y, rust ? step(RUST, l * .8, x, y) : step(IRON, l, x, y));
    }
    // Eisenbänder und Nieten
    for (const bx of [3, bw - 5]) for (let y = dep; y < bh + dep; y++) { pb.set(bx, y, IRON[3]); pb.set(bx + 1, y, IRON[1]); if ((y - dep) % 5 === 2) pb.set(bx + 1, y, IRON[0]); }
    // Muscheln und Algen am Rand
    for (let i = 0; i < 8; i++) { const x = Math.floor(hash(i, 1, seed) * bw), y = dep + bh - 1 - Math.floor(hash(i, 2, seed) * 4); pb.set(x, y, hash(i, 3, seed) < .5 ? '#d8d4c0' : WEED[1]); }
    const x0 = 7, y0 = dep + 5, x1 = 7 + hw, y1 = dep + bh - 4;
    if (open) {   // Klappe ist nach vorn gefallen: dunkles Inneres, Schimmer
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) pb.set(x, y, (y - y0) < 3 ? '#0a141a' : bay(x, y) < .15 && y > y1 - 6 ? BRASS[1] : '#101e26');
    } else {      // Klappe: etwas heller, Griff
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (pb.get(x, y) && (x === x0 || y === y0 || x === x1 - 1)) pb.set(x, y, IRON[3]);
      const gx = Math.round((x0 + x1) / 2);
      pb.rect(gx - 3, y0 + Math.round(hd * .45), 7, 2, IRON[4]); pb.rect(gx - 2, y0 + Math.round(hd * .45), 5, 1, IRON[1]);
    }
    return cvOf(pb);
  };
  const hatch = (() => {   // liegende Klappe (stark verkürzt)
    const pb = new PB(hw + 4, 5);
    for (let y = 0; y < 5; y++) for (let x = y < 2 ? 1 : 0; x < hw + 4 - (y < 2 ? 1 : 0); x++) pb.set(x, y, step(IRON, 1 + y * .4 + (x / hw), x, y));
    return cvOf(pb);
  })();
  return { imgClosed: make(false), imgOpen: make(true), hatch, bw: bw + dep, bh: bh + dep, seamBox: { x0: 7, y0: dep + 5, x1: 7 + hw, y1: dep + bh - 4 } };
}

/* ---------- Wrackwand mit Tür (weld 'tuer'): Planken, Eisenbänder, Bullauge ---------- */
function buildDoorWall(dw, dh, gy, seed) {
  const x0 = 176, w = W - x0, top = 54, hgt = H - top;
  const dx0 = Math.round(60 - dw / 2);
  let base = 999; for (let x = x0 + dx0; x < x0 + dx0 + dw; x++) base = Math.min(base, gy[x]);
  const dyb = base - top - 2;                              // Unterkante der Tür (Ebene), knapp über dem Sand
  const make = (open) => {
    const pb = new PB(w, hgt);
    for (let y = 0; y < hgt; y++) for (let x = 0; x < w; x++) {
      const brk = top + y < 60 + Math.max(0, 22 - x) * 1.6 + (hash(x >> 2, 1, seed) - .5) * 6;   // abgebrochene Kante oben links
      if (brk || top + y > gy[x0 + x] + 1) continue;                                                 // unten im Sand versunken
      const pl = Math.floor(y / 7), seam2 = y % 7 === 0, l = 1 + (x / w) * .8 + (fbm(x / 20, pl, seed + 3, 2) - .5) * 1.4 + (hash(pl, x >> 4, seed) - .5) * .4;
      pb.set(x, y, seam2 ? WOODW[4] : step(WOODW, l, x, y));
    }
    for (const bx of [10, w - 14]) for (let y = 0; y < hgt; y++) if (pb.get(bx, y)) { pb.set(bx, y, IRON[2]); pb.set(bx + 1, y, IRON[1]); pb.set(bx + 2, y, IRON[3]); }
    // Bullauge rechts oben
    const px = w - 30, py = 22;
    for (let y = py - 7; y <= py + 7; y++) for (let x = px - 7; x <= px + 7; x++) { const d = Math.hypot(x - px, y - py); if (d < 4.5) pb.set(x, y, d < 2 && x < px ? '#1c3c48' : '#0c1c24'); else if (d < 6.5) pb.set(x, y, BRASS[d < 5.5 ? (x < px ? 1 : 3) : 4]); }
    // Tür
    const dy0 = dyb - dh;
    for (let y = dy0; y <= dyb; y++) for (let x = dx0; x < dx0 + dw; x++) {
      if (open) { pb.set(x, y, y < dy0 + 3 || x < dx0 + 2 ? '#081016' : bay(x, y) < .1 && y > dyb - 8 ? BRASS[1] : '#0e1a22'); continue; }
      const pl = Math.floor((x - dx0) / 5);
      pb.set(x, y, (x - dx0) % 5 === 0 ? WOODW[4] : step(WOODW.slice(0, 4), .5 + pl * .15 + (hash(pl, y >> 3, seed + 7) - .5) * .6, x, y));
    }
    if (!open) {   // Beschläge
      for (const yy of [dy0 + 6, dyb - 6]) for (let x = dx0 + 1; x < dx0 + dw * .7; x++) { pb.set(x, yy, IRON[3]); pb.set(x, yy - 1, IRON[1]); }
      pb.rect(dx0 + dw - 6, dy0 + Math.round(dh * .5), 3, 3, BRASS[2]);
    } else {       // offene Tür, nach außen gedreht (schmal, rechts)
      for (let y = dy0 - 2; y <= dyb + 1; y++) for (let x = dx0 + dw; x < dx0 + dw + 6; x++) pb.set(x, y, step(WOODW, 1.2 + (x - dx0 - dw) * .4, x, y));
    }
    return cvOf(pb);
  };
  return { imgClosed: make(false), imgOpen: make(true), x0, y0: top, seamBox: { x0: x0 + dx0 - 1, y0: top + dyb - dh - 1, x1: x0 + dx0 + dw, y1: top + dyb } };
}

// Naht als Punktfolge (1 Pixel Abstand) von unten links hinauf, oben quer, rechts hinunter (∩); len = Länge
export function seamOf(B) {
  const P = [[B.x0, B.y1], [B.x0, B.y0], [B.x1, B.y0], [B.x1, B.y1]], pts = [];
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k < n; k++) pts.push({ x: ax + (bx - ax) * k / n, y: ay + (by - ay) * k / n });
  }
  pts.push({ x: P[3][0], y: P[3][1] });
  return { pts, len: pts.length - 1 };
}

/* ---------- alles zusammen ---------- */
export function buildWorld(o) {
  if (o.scene === 'pumpwerk') return buildPumpWorld(o);   // Story-Tauchgang Pumpwerk (divegame/pumpwerk.js)
  const seed = (o.seed | 0) + 101, gy = groundLine(seed), R = (a, b = 0) => hash(a, b, seed + 55);
  const diff = o.cfg.byAct[clamp(o.act | 0, 3, 5)] || o.cfg.byAct[3];
  const Wd = { gy, piles: [], obj: null, seed };
  Wd.bg = buildBg(seed, gy);
  if (o.task === 'search') {
    const [lo, hi] = diff.piles, n = lo + Math.floor(R(1) * (hi - lo + 1)), tgt = Math.floor(R(2) * n);
    const span = 250 / n;
    const wsum = o.junk.reduce((a, j) => a + j.w, 0);
    for (let i = 0; i < n; i++) {
      const x = Math.round(42 + (i + .5) * span + (R(3, i) - .5) * span * .3), w = Math.min(span - 6, 26 + Math.floor(R(4, i) * 10)), h = 12 + Math.floor(R(5, i) * 6);
      let kind = i === tgt ? 'target' : R(6, i) < o.cfg.junkChance ? 'junk' : 'none', junk = null;
      if (kind === 'junk') {
        let r = R(7, i) * wsum, J = o.junk[0];
        for (const j of o.junk) { if (r < j.w) { J = j; break; } r -= j.w; }
        junk = { it: J.it, n: J.n[0] + Math.floor(R(8, i) * (J.n[1] - J.n[0] + 1)) };
      }
      Wd.piles.push({ x, y: gy[clamp(x, 0, W - 1)], w, h, kind, junk, prog: 0, open: false, openT: 0, dust: 0, img: buildPile(w, h, seed + i * 13), dip: buildDip(w) });
    }
  } else if (o.weld.id === 'kiste') {
    const hw = Math.round(diff.seam * .5), hd = Math.round(diff.seam * .25), C = buildCrate(hw, hd, seed), cx = 216;
    const bx = Math.round(cx - C.bw / 2), by = gy[cx] - C.bh + 2;
    const B = { x0: bx + C.seamBox.x0, y0: by + C.seamBox.y0, x1: bx + C.seamBox.x1, y1: by + C.seamBox.y1 };
    Wd.obj = Object.assign({ kind: 'kiste', x: bx, y: by, prog: 0, open: false, openT: 0, heat: [] }, C, seamOf(B), { box: B });
  } else {
    const dw = Math.round(diff.seam * .24), dh = Math.round(diff.seam * .38), D = buildDoorWall(dw, dh, gy, seed);
    Wd.obj = Object.assign({ kind: 'tuer', x: D.x0, y: D.y0, prog: 0, open: false, openT: 0, heat: [] }, D, seamOf(D.seamBox), { box: D.seamBox });
  }
  const avoid = Wd.piles.map(p => [p.x - p.w / 2, p.x + p.w / 2]);
  if (Wd.obj) avoid.push([Wd.obj.box.x0 - 8, Wd.obj.box.x1 + 8]);
  Object.assign(Wd, buildFg(seed, gy, o.task === 'weld' && o.weld.id === 'tuer', avoid));
  // Blasen aus dem Boden (Ablenkung) und Seegras
  Wd.vents = [0, 1].map(i => ({ x: 30 + Math.floor(R(20, i) * 260), t0: R(21, i) * 5 }));
  Wd.weeds = Array.from({ length: 10 }, (_, i) => ({ x: Math.floor(36 + R(30, i) * 270), h: 8 + Math.floor(R(31, i) * 14), ph: R(32, i) * 6 }));
  return Wd;
}

// Seegras (bewegt sich): Halme aus Pixeln
export function drawWeeds(ctx, Wd, t) {
  for (const w of Wd.weeds) {
    const gy = Wd.gy[w.x];
    for (let j = 0; j < w.h; j++) {
      const sx = Math.round(w.x + Math.sin(t * 1.1 + w.ph + j * .25) * j * .12);
      ctx.fillStyle = WEED[j < w.h * .3 ? 2 : j > w.h * .7 ? 0 : 1];
      ctx.fillRect(sx, gy - j, 1, 1);
      if (j % 4 === 2) ctx.fillRect(sx + (j & 4 ? 1 : -1), gy - j, 1, 1);
    }
  }
}
export { canvas };
