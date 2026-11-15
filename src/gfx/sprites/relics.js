/* ---------- Relikte (0.24.0): Symbole der Relikte, Reliktsockel in drei Stufen, Knopf-Symbol ----------
   Symbole 13×13 (Mitte als Anker), Sockel 2×2 Felder (32 breit, unten bündig). s.relic = Punkt auf dem Sockel, an dem das
   eingesetzte Relikt steht (gfx/renderer.js zeichnet es dort klein, beim Goldenen Sockel mit Schimmer). */
import { PB, spr, line, bay, BS } from '../pixelbuffer.js';

const N = 13, C = 6.5;
// Helfer: Licht von links oben, Rampe [hell, mittel, dunkel, tief]
const lit = (dx, dy, extra = 0) => -(dx * 0.12 + dy * 0.14) + extra;
const pick4 = (ramp, l) => ramp[l > 0.35 ? 0 : l > 0 ? 1 : l > -0.35 ? 2 : 3];
const BRASS = ['#ffe08a', '#d8a440', '#9a6a1e', '#6a4410'];
const GOLD = ['#fff2a0', '#ffd23f', '#e0a82a', '#9a6a10'];
const STONE = ['#d8d4cc', '#aaa59c', '#7e7a72', '#55524c'];
const COPPER = ['#ffc890', '#e08848', '#a85a20', '#6a3410'];

function disc(pb, cx, cy, r, ramp, hole) {
  for (let y = 0; y < pb.h; y++) for (let x = 0; x < pb.w; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d > r || (hole && d < hole)) continue;
    pb.set(x, y, pick4(ramp, lit(dx, dy) + (bay(x, y) - 0.5) * 0.2));
  }
}

const DRAW = {
  // Zahnrad der Uhrmacherzunft: Messingrad mit acht Zähnen und Nabe
  zunftrad(pb) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x + 0.5 - C, dy = y + 0.5 - C, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const tooth = Math.cos(a * 8) > 0.15;
      if (r > (tooth ? 6.2 : 4.6) || r < 1.4) continue;
      pb.set(x, y, r < 2.4 ? '#9a6a1e' : pick4(BRASS, lit(dx, dy) + (bay(x, y) - 0.5) * 0.2));
    }
    pb.set(5, 4, '#fff6c0'); pb.set(4, 5, '#fff6c0');
    pb.set(8, 9, '#4f8a6a'); pb.set(9, 8, '#4f8a6a');   // Grünspan
  },
  // Gesegneter Bohrkopf: Stahlkegel mit Wendel und leuchtender Rune
  bohrkopf(pb) {
    pb.rect(4, 0, 5, 3, '#8a5a32'); pb.rect(4, 0, 2, 3, '#a87444');
    for (let y = 3; y < N; y++) {
      const half = (N - y) * 0.42;
      for (let x = 0; x < N; x++) {
        const dx = x + 0.5 - C;
        if (Math.abs(dx) > half + 0.2) continue;
        const groove = ((x + y * 2) % 4) === 0;
        pb.set(x, y, groove ? '#4a5262' : dx < -half * 0.3 ? '#e4ecf6' : dx > half * 0.4 ? '#6a7484' : '#b4bccc');
      }
    }
    pb.set(6, 6, '#5af0d8'); pb.set(6, 7, '#b8fff0'); pb.set(7, 6, '#5af0d8');
  },
  // Rollenglied der Hafenbahn: zwei verschränkte Kettenglieder
  rollenglied(pb) {
    const ring = (cx, cy, rx, ry, col) => {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.hypot(dx, dy);
        if (d > 1 || d < 0.55) continue;
        pb.set(x, y, col[dx + dy < -0.3 ? 0 : dx + dy > 0.5 ? 2 : 1]);
      }
    };
    ring(4.6, 4.6, 4, 3.2, ['#e8ecf0', '#9aa0aa', '#5a5f68']);
    ring(8.4, 8.4, 4, 3.2, ['#ffd8a8', '#c8783a', '#7a4418']);
    pb.set(7, 5, '#9aa0aa'); pb.set(8, 5, '#5a5f68');
  },
  // Kompass des Lotsen: Messinggehäuse, helles Zifferblatt, Nadel
  lotsenkompass(pb) {
    disc(pb, C, C, 6, BRASS);
    disc(pb, C, C, 4.3, ['#fffbe8', '#f4ead0', '#e0d4b4', '#c8bc98']);
    line(pb, 6, 2, 6, 6, '#e0384f'); line(pb, 7, 3, 7, 6, '#b02838');
    line(pb, 6, 7, 6, 10, '#3f6fd8'); line(pb, 5, 7, 5, 9, '#2a4a9a');
    pb.set(6, 6, '#3a2414'); pb.set(6, 0, '#9a6a1e'); pb.set(6, 1, '#d8a440');
  },
  // Siegel des Werkmeisters: rotes Wachs mit goldenem Hammer
  werksiegel(pb) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = x + 0.5 - C, dy = y + 0.5 - C, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy), edge = 5.4 + Math.sin(a * 7) * 0.6;
      if (r > edge) continue;
      pb.set(x, y, r > 4.2 ? (lit(dx, dy) > 0 ? '#d8505a' : '#8a1e2a') : lit(dx, dy) > 0.2 ? '#e8606a' : '#b8303e');
    }
    pb.rect(4, 4, 5, 2, '#ffd23f'); pb.rect(4, 4, 5, 1, '#fff2a0'); line(pb, 6, 6, 6, 9, '#e0a82a');
  },
  // Glimmende Spule: Kupferwicklung auf Eisenkern, türkises Glimmen an den Enden
  glimmspule(pb) {
    pb.rect(2, 1, 9, 2, '#5a5f68'); pb.rect(2, 10, 9, 2, '#5a5f68'); pb.rect(2, 1, 9, 1, '#9aa0aa');
    for (let y = 3; y < 10; y++) for (let x = 3; x < 10; x++) pb.set(x, y, y % 2 ? pick4(COPPER, (6.5 - x) * 0.12) : '#7a4418');
    pb.set(1, 2, '#5af0d8'); pb.set(11, 2, '#5af0d8'); pb.set(0, 1, '#b8fff0'); pb.set(12, 11, '#b8fff0'); pb.set(11, 10, '#5af0d8');
  },
  // Schlüsselbund des Speichermeisters: Eisenring mit drei Schlüsseln
  speicherbund(pb) {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const d = Math.hypot(x + 0.5 - 3.5, y + 0.5 - 3.5); if (d <= 3.2 && d >= 2) pb.set(x, y, d < 2.6 ? '#c8ccd4' : '#6a6e78'); }
    const key = (x0, y0, dx, dy, col, dk) => {
      for (let i = 0; i < 7; i++) pb.set(x0 + dx * i, y0 + dy * i, i < 2 ? dk : col);
      pb.set(x0 + dx * 6 + dy, y0 + dy * 6 - dx, col); pb.set(x0 + dx * 5 + dy, y0 + dy * 5 - dx, col);
    };
    key(5, 5, 1, 1, '#ffd23f', '#e0a82a'); key(4, 6, 0, 1, '#e8ecf0', '#9aa0aa'); key(6, 4, 1, 0, '#d8a440', '#9a6a1e');
  },
  // Tafel der Genügsamkeit: Steintafel mit eingeritzten Zeilen
  genuegsam(pb) {
    for (let y = 1; y < 12; y++) for (let x = 2; x < 11; x++) {
      if ((y === 1 || y === 11) && (x === 2 || x === 10)) continue;
      pb.set(x, y, pick4(STONE, lit(x + 0.5 - C, y + 0.5 - C) + (bay(x, y) - 0.5) * 0.3));
    }
    for (const y of [3, 5, 7, 9]) line(pb, 4, y, y === 9 ? 6 : 8, y, '#55524c');
    pb.set(3, 2, '#f0ece4'); pb.set(4, 2, '#f0ece4');
  },
  // Atemmuschel: Spiralmuschel in Perlmutt mit einer Luftblase
  atemmuschel(pb) {
    for (let y = 2; y < N; y++) for (let x = 0; x < 11; x++) {
      const dx = x + 0.5 - 5.5, dy = y + 0.5 - 7.5, r = Math.hypot(dx, dy * 1.1);
      if (r > 5) continue;
      pb.set(x, y, lit(dx, dy) > 0.15 ? '#fff4f8' : lit(dx, dy) > -0.3 ? '#f0d0dc' : '#d8a8bc');
    }
    // Spirale von innen nach außen
    for (let th = 0.4; th < Math.PI * 4; th += 0.08) { const r = 4.6 * th / (Math.PI * 4); pb.set(5.5 + Math.cos(th) * r - 0.5, 7.5 + Math.sin(th) * r - 0.5, '#a8607e'); }
    pb.set(11, 1, '#e8f8ff'); pb.set(12, 2, '#6ec8f0'); pb.set(11, 3, '#6ec8f0'); pb.set(10, 2, '#e8f8ff'); pb.set(9, 0, '#b8e8ff');
  },
  // Ewige Glut: schwarzes Kohlestück mit glühenden Rissen
  ewigeglut(pb) {
    for (let y = 2; y < 12; y++) for (let x = 1; x < 12; x++) {
      const dx = (x + 0.5 - C) / 5.4, dy = (y + 0.5 - 7) / 4.6;
      if (dx * dx + dy * dy > 1) continue;
      pb.set(x, y, pick4(['#4a4a56', '#30303a', '#202028', '#101016'], lit(dx * 5, dy * 5)));
    }
    for (const [a, b, c, d] of [[3, 6, 6, 8], [6, 8, 9, 5], [6, 8, 7, 11], [5, 4, 6, 6]]) line(pb, a, b, c, d, '#ff9a2a');
    pb.set(6, 8, '#fff2a0'); pb.set(9, 5, '#ffd23f'); pb.set(4, 7, '#ffd23f');
    pb.set(6, 0, '#ffb04a'); pb.set(7, 1, '#ff7a2a'); pb.set(5, 1, '#ffd23f');
  },
  // Füllhorn der Flutstadt: goldenes Horn mit Früchten und Perlen
  fuellhorn(pb) {
    // gebogenes Horn: Spitze links unten, Öffnung rechts oben; Ringe quer zum Horn
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const cx = 1.5 + t * 7.2, cy = 11 - t * 5.2 - Math.sin(t * Math.PI) * 2.2, r = 0.5 + t * 2.9, ring = Math.floor(t * 7) % 2;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (dx * dx + dy * dy > r * r) continue;
        pb.set(x, y, dy < -r * 0.45 ? '#fff2a0' : dy > r * 0.45 ? '#9a6a10' : ring ? '#e0a82a' : '#ffd23f');
      }
    }
    // Öffnung (dunkel) und herausquellende Früchte und Perlen
    for (let y = 2; y < 9; y++) for (let x = 8; x < 12; x++) { const dx = (x + 0.5 - 9.9) / 1.4, dy = (y + 0.5 - 5.2) / 3; if (dx * dx + dy * dy <= 1) pb.set(x, y, '#6a4410'); }
    for (const [x, y, c] of [[10, 2, '#e0384f'], [11, 2, '#e0384f'], [10, 1, '#ff7a8a'], [12, 4, '#7cc24f'], [12, 5, '#5a9a2e'], [11, 4, '#7cc24f'], [12, 7, '#f4eef8'], [11, 6, '#a25ad8'], [11, 7, '#7a3aa8'], [10, 5, '#ff9a3a']]) pb.set(x, y, c);
  },
  // Stein der Wandlung: halb Kohle, halb Eisenerz, schräg geteilt
  wandelstein(pb) {
    for (let y = 1; y < 12; y++) for (let x = 1; x < 12; x++) {
      const dx = (x + 0.5 - C) / 5.4, dy = (y + 0.5 - C) / 5.2;
      if (dx * dx + dy * dy > 1) continue;
      const l = lit(dx * 5, dy * 5) + (bay(x, y) - 0.5) * 0.3;
      pb.set(x, y, x + y < 12 ? pick4(['#5a5a66', '#3a3a44', '#26262e', '#141418'], l) : pick4(['#e09070', '#b8603e', '#8a4028', '#5a2414'], l));
    }
    line(pb, 2, 10, 10, 2, '#ffe08a'); pb.set(6, 6, '#fff6c0');
  },
  // Herz der Flut: blaues Herz mit einer weißen Welle
  herzderflut(pb) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = (x + 0.5 - C) / 5.6, py = -(y + 0.5 - 6) / 5.6;
      const v = (px * px + py * py - 0.45) ** 3 - px * px * py ** 3 * 1.2;
      if (v > 0) continue;
      pb.set(x, y, pick4(['#9cd8ff', '#3f8fe8', '#2a5ab8', '#1a3478'], lit(x + 0.5 - C, y + 0.5 - C)));
    }
    for (let x = 2; x < 11; x++) pb.set(x, 7 + Math.round(Math.sin(x * 1.1) * 0.8), '#e8f8ff');
    pb.set(3, 3, '#ffffff');
  },
  // Die erste Flamme (Ende A): Flamme in einer Messingschale
  erste_flamme(pb) {
    for (let y = 0; y < 9; y++) for (let x = 0; x < N; x++) {
      const u = y / 8, half = 4.6 * Math.sin(Math.min(1, u * 1.3 + 0.1) * Math.PI) * (0.55 + u * 0.45), dx = x + 0.5 - C - (1 - u) * 0.8;
      if (Math.abs(dx) > half) continue;
      const d = Math.abs(dx) / Math.max(1, half);
      pb.set(x, y, d < 0.35 && u > 0.35 ? '#fffbe0' : d < 0.7 ? '#ffd65a' : '#f08a3a');
    }
    for (let x = 1; x < 12; x++) { pb.set(x, 9, x < 4 ? '#ffe08a' : '#d8a440'); if (x > 1 && x < 11) pb.set(x, 10, x < 5 ? '#d8a440' : '#9a6a1e'); }
    pb.rect(5, 11, 3, 1, '#9a6a1e'); pb.rect(3, 12, 7, 1, '#7a5228');
  },
  // Die Krone des Herrschers (Ende B): goldene Krone mit Steinen
  krone(pb) {
    for (let y = 3; y < 11; y++) for (let x = 0; x < N; x++) {
      const spike = y >= 6 || [1, 6, 11].some(c => Math.abs(x - c) <= (y - 3) * 0.6);
      if (!spike) continue;
      pb.set(x, y, y === 10 ? '#9a6a10' : x < 4 ? '#fff2a0' : x > 9 ? '#e0a82a' : '#ffd23f');
    }
    for (const c of [1, 6, 11]) pb.set(c, 2, '#fff2a0');
    pb.set(3, 8, '#e0384f'); pb.set(6, 8, '#3f8fe8'); pb.set(9, 8, '#e0384f'); pb.set(6, 4, '#2f8a52');
  }
};
const OUTLINE = { ewigeglut: '#08080c', herzderflut: '#0e1a3a', werksiegel: '#3a0a10', genuegsam: '#2e2c28' };

// Symbol eines Relikts (Mitte als Anker); unbekannte id: Fragezeichen-Stein
export function makeRelicIcon(id) {
  const pb = new PB(N, N);
  (DRAW[id] || DRAW.genuegsam)(pb);
  pb.outline(OUTLINE[id] || '#2a1a10');
  return spr(pb, pb.w >> 1, pb.h >> 1);
}
// Umriss eines noch nicht gefundenen Relikts (Sammlung): Silhouette in Grau
export function makeRelicShadow(id) {
  const src = new PB(N, N);
  (DRAW[id] || DRAW.genuegsam)(src);
  const pb = new PB(N, N);
  for (let i = 0; i < src.p.length; i++) if (src.p[i]) pb.p[i] = '#5a5248';
  pb.outline('#3a332c');
  return spr(pb, pb.w >> 1, pb.h >> 1);
}

// Reliktsockel (2×2): tier 1 Stein, 2 Messing mit blauen Einlagen, 3 Gold mit Edelstein (Schimmer zeichnet der Renderer)
export function makeSockel(tier) {
  const pb = new PB(32, 40);
  const R = tier === 3 ? GOLD : tier === 2 ? BRASS : STONE, dark = tier === 3 ? '#6a4808' : tier === 2 ? '#4a3010' : '#3a3834';
  // Bodenplatte (Stufen) aus Stein bei allen, darüber die Säule im Material der Stufe
  for (let y = 33; y < 40; y++) for (let x = 1; x < 31; x++) pb.set(x, y, pick4(STONE, (y === 33 ? 0.5 : -0.1) + (x < 4 ? 0.3 : x > 27 ? -0.4 : 0) + (bay(x, y) - 0.5) * 0.3));
  for (let y = 29; y < 33; y++) for (let x = 4; x < 28; x++) pb.set(x, y, pick4(STONE, (y === 29 ? 0.5 : 0) + (x < 7 ? 0.3 : x > 24 ? -0.4 : 0) + (bay(x, y) - 0.5) * 0.3));
  // Säule
  for (let y = 15; y < 29; y++) for (let x = 9; x < 23; x++) {
    const dx = x + 0.5 - 16;
    pb.set(x, y, pick4(R, -dx * 0.09 + (tier === 1 ? (bay(x, y) - 0.5) * 0.35 : 0) + ((x === 12 || x === 19) && tier > 1 ? -0.3 : 0)));
  }
  // Kapitell und Schale oben (hier steht das Relikt)
  for (let y = 11; y < 15; y++) for (let x = 6; x < 26; x++) pb.set(x, y, pick4(R, (y === 11 ? 0.5 : y === 14 ? -0.4 : 0.05) - (x - 16) * 0.05));
  for (let x = 8; x < 24; x++) pb.set(x, 10, R[0]);
  if (tier === 2) {   // Nieten und blaue Einlagen
    for (const [x, y] of [[10, 17], [21, 17], [10, 26], [21, 26]]) pb.set(x, y, '#fff2c0');
    pb.rect(14, 19, 4, 5, '#2a5ab8'); pb.rect(14, 19, 2, 2, '#6ec8f0');
  }
  if (tier === 3) {   // Edelstein in der Säule, Ornament am Kapitell
    pb.rect(14, 19, 4, 5, '#e0384f'); pb.rect(14, 19, 2, 2, '#ff9aa8'); pb.set(17, 23, '#8a1e2a');
    for (let x = 8; x < 24; x += 3) pb.set(x, 12, '#fff8d0');
    pb.set(11, 16, '#fffbe8'); pb.set(11, 17, '#fffbe8');
  }
  if (tier === 1) { pb.set(13, 20, '#55524c'); pb.set(14, 21, '#55524c'); pb.set(19, 25, '#55524c'); }   // Risse im Stein
  pb.outline(dark);
  // relic = Fußpunkt des Relikts (oben auf der Schale), shine = Bereich für den Schimmer (Goldener Sockel)
  return BS(pb, { relic: [16, 10], glow: [16, 12], shine: tier === 3 ? [7, 10, 18, 19] : null, tier });
}

// Knopf-Symbol „Relikte“ (Knopfleiste, Fenster): kleiner Sockel mit Stern
export function makeRelicButton() {
  const pb = new PB(11, 11);
  for (let x = 3; x < 8; x++) pb.set(x, 0, '#ffe08a');
  pb.set(5, 1, '#fff6c0'); pb.set(4, 1, '#ffd23f'); pb.set(6, 1, '#ffd23f'); pb.set(5, 2, '#ffd23f');
  pb.rect(2, 3, 7, 2, '#d8a440'); pb.rect(2, 3, 7, 1, '#ffe08a');
  pb.rect(4, 5, 3, 4, '#aaa59c'); pb.rect(4, 5, 1, 4, '#d8d4cc');
  pb.rect(1, 9, 9, 2, '#7e7a72'); pb.rect(1, 9, 9, 1, '#aaa59c');
  pb.outline('#2a1a10');
  return spr(pb, 5, 5);
}
