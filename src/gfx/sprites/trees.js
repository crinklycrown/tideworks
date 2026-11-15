/* ---------- Bäume ---------- */
import { PB, spr, fillBlob, bay } from '../pixelbuffer.js';
import { hash2 } from '../../util/math.js';

export const SPECIES = {
  birke: { name: 'Birke', shape: 'tall', size: 0.9, leaf: ['#e2f290', '#b4da5c', '#86b944', '#5b8b2f'], trunk: ['#fbf8ee', '#ddd5c2', '#aea48e'], mark: '#3a3430', outline: '#2f4a1a' },
  tanne: { name: 'Tanne', shape: 'pine', leaf: ['#72c27d', '#489b5d', '#307548', '#205334'], trunk: ['#8a5a32', '#5e3c20', '#3e2814'], outline: '#13301e' },
  eiche: { name: 'Eiche', shape: 'round', size: 1.1, leaf: ['#9cd962', '#67ae41', '#458b32', '#2e6326'], trunk: ['#a87444', '#7d522c', '#55361d'], outline: '#1e3a16' },
  buche: { name: 'Buche', shape: 'round', size: 1.0, leaf: ['#c4e874', '#8cc84c', '#5f9e3a', '#3e722a'], trunk: ['#d4d4cc', '#a4a49c', '#74746c'], outline: '#24401a' }
};
export const TREE_SP = ['eiche', 'tanne', 'buche', 'birke', 'eiche', 'tanne'];
export function makeSprout(S) {
  const pb = new PB(9, 11), L = S.sprout || S.leaf;
  pb.rect(2, 10, 5, 1, '#6b4426'); pb.rect(3, 9, 3, 1, '#8a5a32');
  if (S.shape === 'pine') {
    pb.set(4, 3, L[0]); pb.rect(3, 4, 3, 1, L[1]); pb.set(5, 4, L[2]); pb.rect(2, 5, 5, 1, L[1]); pb.set(2, 5, L[0]); pb.set(6, 5, L[2]);
    pb.rect(3, 6, 3, 1, L[2]); pb.set(4, 7, '#7a4f2a'); pb.set(4, 8, '#7a4f2a');
  } else {
    pb.set(4, 8, L[2]); pb.set(4, 7, L[2]); pb.set(4, 6, L[1]);
    pb.set(3, 5, L[1]); pb.set(2, 4, L[1]); pb.set(1, 4, L[0]); pb.set(2, 3, L[0]); pb.set(3, 4, L[2]);
    pb.set(5, 5, L[2]); pb.set(6, 4, L[1]); pb.set(7, 4, L[1]); pb.set(6, 3, L[0]); pb.set(5, 4, L[2]); pb.set(4, 5, L[1]);
  }
  pb.outline(S.outline);
  return spr(pb, 4, 10);
}
export function canopyCircles(sh, stage, x, y, R) {
  if (stage === 2) return [{ x, y, r: R }];
  if (sh === 'tall') return [{ x, y: y - R * 0.75, r: R * 0.62 }, { x: x - R * 0.38, y: y - R * 0.1, r: R * 0.62 }, { x: x + R * 0.4, y: y - R * 0.15, r: R * 0.6 }, { x, y: y + R * 0.4, r: R * 0.66 }];
  return [{ x, y: y - R * 0.55, r: R * 0.68 }, { x: x - R * 0.55, y: y - R * 0.3, r: R * 0.6 }, { x: x + R * 0.55, y: y - R * 0.35, r: R * 0.6 },
    { x: x - R * 0.6, y: y + R * 0.25, r: R * 0.62 }, { x: x + R * 0.6, y: y + R * 0.22, r: R * 0.62 }, { x, y: y + R * 0.25, r: R * 0.72 }];
}
export function makeBroadleaf(S, stage, seed) {
  const sh = S.shape;
  const R = { 2: 3.4, 3: 5, 4: 7 }[stage] * (S.size || 1);
  const th = { 2: 3, 3: 5, 4: 7 }[stage];
  const tw = (sh === 'tall' ? { 2: 1, 3: 2, 4: 2 } : { 2: 1, 3: 2, 4: 3 })[stage];
  let W = Math.ceil(R * 2.8) + 4; if (W % 2 === 0) W++;
  const H = th + Math.ceil(R * 2.5) + 4;
  const pb = new PB(W, H), cx = (W - 1) / 2, by = H - 2;
  const ccx = cx + 0.5, ccy = by - th - R * 0.55;
  const tx0 = Math.round(cx - (tw - 1) / 2);
  for (let y = Math.round(ccy); y <= by; y++)
    for (let i = 0; i < tw; i++) pb.set(tx0 + i, y, i === 0 ? S.trunk[0] : (i === tw - 1 ? S.trunk[2] : S.trunk[1]));
  if (S.mark) for (let y = by - 1; y > by - th - 2; y -= 3) pb.set(tx0 + ((y >> 1) % tw), y, S.mark);
  fillBlob(pb, canopyCircles(sh, stage, ccx, ccy, R), S.leaf, seed);
  pb.outline(S.outline);
  return spr(pb, Math.floor(cx), by);
}
export function makePine(S, stage, seed) {
  const tiers = { 2: 2, 3: 3, 4: 4 }[stage], W0 = { 2: 7, 3: 11, 4: 15 }[stage], trunkH = stage >= 4 ? 3 : 2;
  const dec = 2 * Math.max(1, Math.round((W0 - 5) / (2 * Math.max(1, tiers - 1))));
  const ws = [], hs = [];
  for (let k = 0; k < tiers; k++) { const tw = Math.max(3, W0 - k * dec); ws.push(tw); hs.push(Math.max(3, Math.round(tw * 0.45) + 1)); }
  const steps = hs.map(h => Math.max(2, Math.round(h * 0.55)));
  let top = trunkH; for (let k = 0; k < tiers - 1; k++) top += steps[k]; top += hs[tiers - 1];
  const W = W0 + 4, H = top + 4, pb = new PB(W, H), cx = (W - 1) / 2, by = H - 2;
  for (let y = by - trunkH - 1; y <= by; y++) pb.set(cx, y, S.trunk[0]);
  let bottom = by - trunkH;
  for (let k = 0; k < tiers; k++) {
    const half0 = (ws[k] - 1) / 2, th = hs[k];
    for (let j = 0; j < th; j++) {
      const yy = bottom - j, half = Math.round(half0 * (1 - j / th));
      for (let x = cx - half; x <= cx + half; x++) {
        const nx = (x - cx) / (half0 || 1);
        const l = -nx * 0.75 + (j / th) * 0.35 - (j === 0 ? 0.55 : 0) + (hash2(x, yy, seed) - 0.5) * 0.3 + (bay(x, yy) - 0.5) * 0.3;
        pb.set(x, yy, S.leaf[l > 0.42 ? 0 : l > 0 ? 1 : l > -0.42 ? 2 : 3]);
      }
    }
    bottom -= steps[k];
  }
  pb.outline(S.outline);
  return spr(pb, cx, by);
}
export function makeTree(id, stage, seed) {
  const S = SPECIES[id];
  if (stage === 1) return makeSprout(S);
  return S.shape === 'pine' ? makePine(S, stage, seed) : makeBroadleaf(S, stage, seed);
}

/* ---------- Palme (Sandinseln) ---------- */
const PALM = { leaf: ['#b6e070', '#7cbf4a', '#4f9636', '#2f6a26'], trunk: ['#d8b07a', '#b08450', '#7e5a32'], nut: '#6b4426', outline: '#24401a' };
// stage 1 = Setzling, 2 = jung, 3 = ausgewachsen; seed variiert Neigung und Wedel
export function makePalm(stage, seed) {
  if (stage === 1) {
    const pb = new PB(9, 11), L = PALM.leaf;
    pb.rect(2, 10, 5, 1, '#b08450'); pb.set(4, 9, PALM.trunk[1]); pb.set(4, 8, PALM.trunk[0]);
    for (const [x, y, c] of [[3, 7, 1], [2, 6, 0], [1, 6, 1], [5, 7, 1], [6, 6, 0], [7, 6, 2], [4, 6, 1], [4, 5, 0], [3, 5, 2], [5, 5, 2]]) pb.set(x, y, L[c]);
    pb.outline(PALM.outline);
    return spr(pb, 4, 10);
  }
  const H = stage === 2 ? 14 : 22, R = stage === 2 ? 6 : 9, W = 2 * R + 7, pb = new PB(W, H + R + 4);
  const lean = (hash2(seed, 1, 77) - 0.5) * (stage === 2 ? 3 : 6), by = pb.h - 2, cx = Math.floor(W / 2);
  // Stamm: leicht gebogen, mit Ringen
  let tx = cx, ty = by;
  for (let j = 0; j <= H; j++) {
    const t = j / H, x = Math.round(cx + lean * t * t), y = by - j;
    const ring = j % 3 === 0;
    pb.set(x, y, ring ? PALM.trunk[2] : PALM.trunk[0]);
    pb.set(x + 1, y, ring ? PALM.trunk[2] : PALM.trunk[1]);
    tx = x; ty = y;
  }
  // Wedel: Bögen, die vom Kopf nach außen hängen
  const n = stage === 2 ? 5 : 7;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k - (n - 1) / 2) * (Math.PI * 1.15 / (n - 1)) + (hash2(seed, k, 78) - 0.5) * 0.3;
    const len = R * (0.8 + hash2(seed, k, 79) * 0.3);
    for (let s = 0; s <= len; s += 0.5) {
      const x = tx + 0.5 + Math.cos(a) * s, y = ty + Math.sin(a) * s + (s / len) * (s / len) * R * 0.75;
      const c = s < len * 0.3 ? 1 : (k + (s | 0)) % 2 ? 2 : 1;
      pb.set(x, y, PALM.leaf[y < ty - 1 ? 0 : c]);
      if (s > len * 0.25 && s < len * 0.85) pb.set(x, y + 1, PALM.leaf[3]);
    }
  }
  if (stage === 3) { pb.set(tx, ty + 1, PALM.nut); pb.set(tx + 1, ty + 2, PALM.nut); pb.set(tx - 1, ty + 2, PALM.nut); }
  pb.outline(PALM.outline);
  return spr(pb, cx, by);
}
