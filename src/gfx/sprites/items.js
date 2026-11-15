/* ---------- Item-Symbole ---------- */
import { PB, spr, line, shadeEllipse, bay } from '../pixelbuffer.js';
import { ITEMS } from '../../data/items.js';
import { FLUIDS } from '../../data/fluids.js';

export function makeItemIcon(id) {
  let pb;
  const lump = (ramp, spot, ol) => { pb = new PB(10, 10); shadeEllipse(pb, 5, 5.6, 4.2, 3.7, ramp, 0, 0.3); if (spot) [[3, 4], [6, 6], [5, 3], [7, 4]].forEach(([x, y]) => { if (pb.get(x, y)) pb.set(x, y, spot); }); pb.outline(ol); };
  const ingot = (r, ol) => { pb = new PB(11, 8); for (let y = 1; y < 7; y++) { const a = y < 3 ? 2 : 1, b = y < 3 ? 8 : 9; for (let x = a; x <= b; x++) pb.set(x, y, y < 3 ? (x < 5 ? r[0] : r[1]) : (x === 1 ? r[1] : x === 9 ? r[3] : r[2])); } pb.outline(ol); };
  switch (id) {
    case 'holz':
      pb = new PB(12, 8);
      for (let y = 1; y < 7; y++) for (let x = 1; x < 9; x++) pb.set(x, y, y === 1 ? '#c9995e' : y >= 5 ? '#6a4426' : ((x + y) % 4 === 0 ? '#7a4a28' : '#a87444'));
      for (let y = 1; y < 7; y++) for (let x = 8; x < 11; x++) { const r = Math.hypot((x + 0.5 - 9.5) / 1.6, (y + 0.5 - 4) / 3); if (r <= 1) pb.set(x, y, r > 0.75 ? '#8a5a32' : (r < 0.3 ? '#a87444' : '#e6bf85')); }
      pb.outline('#3a2414'); break;
    case 'kohle': lump(['#4a4a56', '#30303a', '#202028', '#101016'], '#9aa0c0', '#08080c'); break;
    // Eisenerz rostrot-braun mit dunklen Adern, Kupfererz grau-grün mit türkisen Einschlüssen
    case 'eisenerz': lump(['#d08060', '#a85a3c', '#7e3e28', '#56281a'], null, '#2a120c'); line(pb, 2, 4, 5, 6, '#3a1a10'); line(pb, 5, 6, 8, 5, '#3a1a10'); pb.set(4, 3, '#3a1a10'); break;
    case 'kupfererz': lump(['#a8b8a0', '#86988a', '#62766a', '#44544a'], '#3ed6c4', '#1c2620'); pb.set(4, 7, '#8af0e0'); break;
    case 'kalk': lump(['#ffffff', '#ece8dc', '#d0cabc', '#a8a294'], null, '#6a6458'); break;
    case 'quarz':      // Sandhaufen mit glitzernden Körnern
      pb = new PB(12, 9);
      for (let y = 0; y < 9; y++) for (let x = 0; x < 12; x++) {
        const nx = (x + 0.5 - 6) / 5.4, top = 8.5 - 6.2 * (1 - nx * nx);
        if (Math.abs(nx) > 1 || y + 0.5 < top) continue;
        const l = -nx * 0.6 - (y - top) * 0.12 + (bay(x, y) - 0.5) * 0.5;
        pb.set(x, y, l > 0.35 ? '#fff0c8' : l > 0 ? '#ecd498' : l > -0.4 ? '#d0b070' : '#a8884c');
      }
      [[4, 4], [7, 5], [5, 7], [8, 7]].forEach(([x, y]) => { if (pb.get(x, y)) pb.set(x, y, '#ffffff'); });
      pb.outline('#6a5428'); break;
    case 'schwefel': lump(['#fff27a', '#f0d030', '#c8a018', '#8a6a0a'], '#fffbd0', '#4a3a06'); break;
    case 'neodymerz': lump(['#9a92a8', '#787088', '#5a5468', '#3e3a4a'], '#c88aff', '#1e1a26'); break;
    case 'eisen': ingot(['#e2ebf6', '#b4c4d8', '#8698b0', '#5e6e84'], '#26303c'); break;   // kühles Blaugrau, heller als Stahl
    case 'kupfer': ingot(['#ffd8a8', '#f0a060', '#c8702e', '#8a4618'], '#3a1a08'); break;
    case 'stahl': ingot(['#b8cce4', '#7a90ac', '#566a86', '#34445c'], '#0e1420'); pb.set(3, 2, '#e8f2ff'); pb.set(4, 2, '#e8f2ff'); pb.set(5, 4, '#34445c'); pb.set(6, 4, '#34445c'); break;
    case 'ziegel':     // zwei gestapelte Ziegel mit Fuge
      pb = new PB(12, 9);
      for (let y = 1; y < 8; y++) for (let x = 1; x < 11; x++) {
        const fuge = y === 4 || (y < 4 ? x === 6 : x === 3 || x === 9);
        pb.set(x, y, fuge ? '#d8c8b0' : y === 1 || y === 5 ? '#e07a5a' : y === 3 || y === 7 ? '#93372a' : (x + y) % 5 === 0 ? '#a8432f' : '#c4553f');
      }
      pb.outline('#3a1810'); break;
    case 'glas':       // Scheibe mit Lichtkante
      pb = new PB(10, 11);
      for (let y = 1; y < 10; y++) for (let x = 1; x < 9; x++) pb.set(x, y, x === 1 || y === 1 ? '#e8f8ff' : x === 8 || y === 9 ? '#5a9ab8' : '#a8dcf0');
      line(pb, 3, 7, 6, 3, '#ffffff'); line(pb, 3, 8, 4, 7, '#ffffff'); pb.set(6, 7, '#e8f8ff');
      pb.outline('#1e4a5e'); break;
    case 'draht':      // Kupferdraht-Rolle
      pb = new PB(11, 11);
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const r = Math.hypot(x + 0.5 - 5.5, y + 0.5 - 5.5);
        if (r > 4.8 || r < 1.6) continue;
        const ring = Math.floor(r * 1.6) % 2, l = -(x - 5.5) * 0.12 - (y - 5.5) * 0.14;
        pb.set(x, y, r < 2.3 ? '#5a3218' : ring ? (l > 0 ? '#ffc890' : '#d88040') : (l > 0 ? '#f0a060' : '#a85a20'));
      }
      pb.set(9, 2, '#f0a060'); pb.set(10, 1, '#f0a060');
      pb.outline('#3a1a08'); break;
    case 'graphit':    // glänzender Graphitstab
      pb = new PB(12, 8);
      for (let y = 1; y < 7; y++) for (let x = 1; x < 11; x++) {
        if ((x === 1 || x === 10) && (y === 1 || y === 6)) continue;
        pb.set(x, y, y === 2 ? '#b8c0cc' : y === 1 ? '#7a8088' : y >= 5 ? '#26282c' : (x + y) % 4 === 0 ? '#4a4e56' : '#3e4248');
      }
      pb.set(3, 2, '#e8eef6'); pb.set(4, 2, '#e8eef6');
      pb.outline('#0c0e10'); break;
    case 'silizium':   // Wafer mit abgeflachter Kante, schillernd
      pb = new PB(11, 11);
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const dx = x + 0.5 - 5.5, dy = y + 0.5 - 5.5;
        if (Math.hypot(dx, dy) > 4.9 || dy > 3.8) continue;
        const l = -(dx * 0.12 + dy * 0.16) + (bay(x, y) - 0.5) * 0.3;
        pb.set(x, y, l > 0.45 ? '#e0e8f8' : l > 0.1 ? '#9aa8d0' : l > -0.3 ? '#6a78a8' : '#4a5480');
      }
      pb.set(4, 3, '#c8a0e8'); pb.set(6, 5, '#a0d8e8');
      pb.outline('#1a1e34'); break;
    case 'chip':       // Mikrochip auf grüner Platine mit Goldbeinen
      pb = new PB(12, 12);
      pb.rect(1, 1, 10, 10, '#2f7a3a'); pb.rect(1, 1, 10, 1, '#5aa860'); pb.rect(1, 10, 10, 1, '#1e5a28');
      for (let i = 0; i < 4; i++) { pb.set(3 + i * 2, 1, '#ffd23f'); pb.set(3 + i * 2, 10, '#ffd23f'); pb.set(1, 3 + i * 2, '#ffd23f'); pb.set(10, 3 + i * 2, '#ffd23f'); }
      pb.rect(3, 3, 6, 6, '#26262a'); pb.rect(3, 3, 6, 1, '#4a4a52'); pb.set(4, 4, '#8a8a94');
      pb.outline('#0e2a12'); break;
    case 'teer':       // Fass mit Teertropfen
      pb = new PB(10, 12);
      for (let y = 2; y < 11; y++) for (let x = 1; x < 9; x++) pb.set(x, y, y === 4 || y === 8 ? '#5a5f68' : x === 1 ? '#5a3a24' : x === 8 ? '#26160c' : '#3e2616');
      pb.rect(2, 1, 6, 1, '#1a1a1e'); pb.rect(3, 2, 3, 2, '#101014'); pb.set(4, 2, '#4a4a58');
      pb.set(6, 3, '#101014'); pb.set(6, 5, '#101014'); pb.set(6, 6, '#101014'); pb.set(5, 3, '#101014');
      pb.outline('#0a0604'); break;
    case 'skizze': case 'bauplan': case 'schaltplan': {
      // Blatt mit Eselsohr: Skizze = Pergament mit Bleistiftstrichen, Bauplan = blau, Schaltplan = grün mit Leiterbahnen
      const P = { skizze: ['#fff4d8', '#e6cfa0', '#6a5a48'], bauplan: ['#4a7ad8', '#2f58b0', '#e8f2ff'], schaltplan: ['#3a9a5a', '#2a7444', '#e0ffd8'] }[id];
      pb = new PB(10, 12);
      for (let y = 1; y < 11; y++) for (let x = 1; x < 9; x++) { if (x > 5 && y < 4 && x - 5 > y - 1) continue; pb.set(x, y, x === 8 || y === 10 ? P[1] : P[0]); }
      pb.set(6, 1, P[1]); pb.set(6, 2, P[1]); pb.set(7, 3, P[1]); pb.set(6, 3, P[1]); pb.set(8, 3, P[1]);
      if (id === 'skizze') { line(pb, 2, 5, 6, 5, P[2]); line(pb, 2, 7, 7, 7, P[2]); line(pb, 2, 9, 5, 9, P[2]); pb.set(6, 8, P[2]); }
      else if (id === 'bauplan') { pb.rect(2, 5, 5, 4, P[2]); pb.rect(3, 6, 3, 2, P[0]); pb.set(4, 6, P[2]); line(pb, 2, 3, 4, 3, P[2]); }
      else { line(pb, 2, 4, 5, 4, P[2]); line(pb, 5, 4, 5, 8, P[2]); line(pb, 2, 8, 7, 8, P[2]); pb.set(2, 6, P[2]); pb.set(3, 6, P[2]); pb.set(7, 6, '#ffd23f'); pb.set(5, 6, '#ffd23f'); }
      pb.outline(id === 'skizze' ? '#4a3a24' : id === 'bauplan' ? '#14285a' : '#0e3a1c'); break;
    }
    case 'fisch':
      pb = new PB(12, 8);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) { const nx = (x + 0.5 - 4.8) / 4.3, ny = (y + 0.5 - 4) / 2.6; if (nx * nx + ny * ny <= 1) pb.set(x, y, ny < -0.2 ? '#c8dce8' : (ny > 0.4 ? '#5a7a98' : '#8ab0c8')); }
      [[9, 2], [9, 3], [9, 4], [9, 5], [10, 1], [10, 2], [10, 5], [10, 6], [11, 1], [11, 6]].forEach(([x, y]) => pb.set(x, y, '#6a8aa8'));
      pb.set(2, 3, '#1a2a3a'); pb.outline('#1e2e3e'); break;
    case 'kunststoff':  // Kunststoffplatte mit Granulat
      pb = new PB(12, 10);
      for (let y = 2; y < 8; y++) for (let x = 1; x < 10; x++) { const sx = x + (7 - y) * 0.4; pb.set(sx, y, y === 2 ? '#ffffff' : y === 7 ? '#3a90a0' : x === 1 ? '#c8f4ff' : '#7fd8e8'); }
      [[9, 8], [10, 7], [8, 9]].forEach(([x, y]) => pb.set(x, y, '#e8774f'));
      pb.set(3, 4, '#ffffff'); pb.set(4, 4, '#e8fcff');
      pb.outline('#14404a'); break;
    case 'schmiermittel':   // Kanister mit Griff und Ausgießer
      pb = new PB(10, 12);
      for (let y = 3; y < 11; y++) for (let x = 1; x < 9; x++) pb.set(x, y, x === 1 ? '#ffe070' : x === 8 ? '#a87810' : y === 6 ? '#3a2a10' : '#e8b020');
      pb.rect(2, 1, 4, 2, '#a87810'); pb.rect(3, 2, 2, 1, null);
      pb.rect(6, 1, 2, 2, '#26262a'); pb.set(8, 1, '#26262a');
      pb.rect(3, 7, 4, 3, '#3a2a10'); pb.set(4, 8, '#ffe070');
      pb.outline('#3a2808'); break;
    case 'neodym': ingot(['#f0e8ff', '#c8b8e8', '#9a88c0', '#6a5a90'], '#1e1630'); pb.set(3, 2, '#ffffff'); pb.set(6, 4, '#d8c8ff'); break;
    case 'magnet':      // Hufeisen-Supermagnet: rot mit silbernen Polen
      pb = new PB(11, 11);
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const dx = x + 0.5 - 5.5, dy = y + 0.5 - 5, r = Math.hypot(dx, dy);
        const ring = (dy <= 0 && r >= 2 && r <= 5) || (dy > 0 && Math.abs(dx) >= 2 && Math.abs(dx) <= 5);
        if (!ring || y > 9) continue;
        pb.set(x, y, y >= 7 ? (x < 5 ? '#e8ecf2' : '#a8b0ba') : dx < 0 ? '#ff6a5a' : '#c4302a');
      }
      pb.set(3, 2, '#ffd0c8');
      pb.outline('#3a0e0a'); break;
    case 'fass': case 'fass_wasser': case 'fass_rohoel': case 'fass_saeure': {
      // Fass: Holzdauben mit Stahlreifen; volle Fässer tragen ein Band in der Farbe ihrer Flüssigkeit
      const F = ITEMS[id].fluid ? FLUIDS[ITEMS[id].fluid] : null;
      pb = new PB(10, 12);
      for (let y = 1; y < 11; y++) {
        const side = y >= 3 && y <= 8 ? 0 : 1;
        for (let x = 1 + side; x < 9 - side; x++) {
          let c = x <= 2 ? '#c9995e' : x >= 7 ? '#6a4426' : (x % 2 ? '#a87444' : '#8a5a32');
          if (y === 2 || y === 9) c = x <= 2 ? '#e4e8ec' : x >= 7 ? '#5a5f68' : '#9aa0aa';
          if (F && (y === 5 || y === 6)) c = y === 5 ? (x <= 3 ? F.hi : F.col) : (x >= 7 ? F.dk : F.col);
          pb.set(x, y, c);
        }
      }
      pb.rect(3, 1, 4, 1, '#5a3a24'); pb.set(5, 1, F ? F.col : '#3a2414');
      pb.outline('#2a1a10'); break;
    }
    case 'raeucherfisch':   // Fisch golden geräuchert, an einer Schnur
      pb = new PB(12, 10);
      for (let y = 2; y < 10; y++) for (let x = 0; x < 12; x++) { const nx = (x + 0.5 - 4.8) / 4.3, ny = (y + 0.5 - 6) / 2.6; if (nx * nx + ny * ny <= 1) pb.set(x, y, ny < -0.2 ? '#f0c070' : (ny > 0.4 ? '#8a4a1a' : '#c8782a')); }
      [[9, 4], [9, 5], [9, 6], [9, 7], [10, 3], [10, 4], [10, 7], [10, 8], [11, 3], [11, 8]].forEach(([x, y]) => pb.set(x, y, '#9a5a24'));
      pb.set(2, 5, '#2a1a10'); line(pb, 5, 0, 5, 3, '#6a4426'); pb.set(4, 6, '#ffe0a0');
      pb.outline('#3a1e0a'); break;
    case 'seil':   // aufgerolltes Tau
      pb = new PB(11, 11);
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const r = Math.hypot(x + 0.5 - 5.5, y + 0.5 - 5.5);
        if (r > 4.9 || r < 1.4) continue;
        pb.set(x, y, Math.floor(r * 1.4 + (x + y) * 0.35) % 2 ? '#e8cc8a' : '#b8944c');
      }
      pb.set(9, 9, '#b8944c'); pb.set(10, 10, '#e8cc8a');
      pb.outline('#4a3418'); break;
    case 'netz':   // Fischernetz mit Schwimmern
      pb = new PB(12, 10);
      for (let y = 1; y < 9; y++) for (let x = 1; x < 11; x++) if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) pb.set(x, y, '#8a9a8a');
      line(pb, 1, 1, 10, 1, '#6a5a3a'); pb.set(2, 1, '#e8504a'); pb.set(6, 1, '#e8504a'); pb.set(10, 1, '#e8504a');
      pb.outline('#2a2a22'); break;
    case 'zahnrad': {   // Messing-Zahnrad
      pb = new PB(11, 11);
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) {
        const dx = x + 0.5 - 5.5, dy = y + 0.5 - 5.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), tooth = Math.cos(a * 8) > 0.2;
        if (r > (tooth ? 5.2 : 4.0) || r < 1.3) continue;
        pb.set(x, y, dx + dy < -1 ? '#ffe08a' : dx + dy > 2 ? '#a8781a' : '#e0b040');
      }
      pb.outline('#3a2808'); break;
    }
    case 'feder':   // Spiralfeder aus Stahl
      pb = new PB(9, 12);
      for (let i = 0; i < 5; i++) { line(pb, 1, 1 + i * 2, 7, 2 + i * 2, i % 2 ? '#8a98ac' : '#d8e2ee'); line(pb, 7, 2 + i * 2, 1, 3 + i * 2, '#5e6e84'); }
      pb.outline('#1e2632'); break;
    case 'rohrteil':   // Rohrstück mit Flansch
      pb = new PB(12, 8);
      for (let y = 2; y < 6; y++) for (let x = 2; x < 10; x++) pb.set(x, y, y === 2 ? '#e4e8ec' : y === 5 ? '#5a5f68' : '#9aa0aa');
      pb.rect(0, 1, 2, 6, '#c4553f'); pb.rect(10, 1, 2, 6, '#c4553f'); pb.set(0, 1, '#e07a5a'); pb.set(10, 1, '#e07a5a');
      pb.outline('#22262c'); break;
    case 'uhrwerk': {   // goldenes Uhrwerk mit Zeigern
      pb = new PB(11, 11);
      for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) { const r = Math.hypot(x + 0.5 - 5.5, y + 0.5 - 5.5); if (r <= 4.9) pb.set(x, y, r > 4 ? '#c8901a' : r > 3.4 ? '#ffd23f' : '#fff4d8'); }
      line(pb, 5, 5, 5, 2, '#3a2414'); line(pb, 5, 5, 7, 6, '#3a2414'); pb.set(5, 5, '#c4302a');
      pb.outline('#4a3008'); break;
    }
    case 'zelle':   // Batteriezelle: Zylinder mit Pol
      pb = new PB(8, 12);
      for (let y = 2; y < 11; y++) for (let x = 1; x < 7; x++) pb.set(x, y, y < 5 ? (x < 3 ? '#a8ec90' : '#5ab848') : x < 3 ? '#5a5f68' : x > 5 ? '#26282c' : '#3e4248');
      pb.rect(3, 0, 2, 2, '#c8ccd4'); pb.set(3, 7, '#ffd23f'); pb.set(4, 6, '#ffd23f'); pb.set(4, 8, '#ffd23f');
      pb.outline('#121416'); break;
    case 'perle':   // Perle mit Glanz
      pb = new PB(9, 9);
      shadeEllipse(pb, 4.5, 4.5, 3.8, 3.8, ['#ffffff', '#f4eef8', '#d8cce4', '#a898b8'], 0, 0.3);
      pb.set(3, 2, '#ffffff'); pb.set(2, 3, '#ffffff');
      pb.outline('#4a3e5a'); break;
    case 'schrott': {   // Haufen aus rostigen Blechen, Rohrstück und Schraube
      pb = new PB(12, 10);
      for (let y = 3; y < 10; y++) for (let x = 0; x < 12; x++) {
        const nx = (x + 0.5 - 6) / 5.6, top = 9.5 - 6.4 * (1 - nx * nx);
        if (Math.abs(nx) > 1 || y + 0.5 < top) continue;
        const v = bay(x, y);
        pb.set(x, y, v > 0.72 ? '#c8783a' : v > 0.45 ? '#8a5a3a' : v > 0.22 ? '#6a6e74' : '#4a4e54');
      }
      line(pb, 2, 4, 6, 2, '#a8acb4'); line(pb, 2, 5, 6, 3, '#6a6e74');   // Blech
      pb.rect(7, 2, 3, 2, '#9aa0aa'); pb.set(7, 2, '#e4e8ec');            // Rohrstück
      pb.set(4, 7, '#e0b040'); pb.set(8, 6, '#c8ccd4');
      pb.outline('#22201e'); break;
    }
    case 'glockenseil': {   // dickes, geteertes Tau mit Eisenhaken
      pb = new PB(12, 12);
      for (let y = 2; y < 12; y++) for (let x = 0; x < 10; x++) {
        const r = Math.hypot(x + 0.5 - 5, y + 0.5 - 7);
        if (r > 4.8 || r < 1.6) continue;
        pb.set(x, y, Math.floor(r * 1.5 + (x + y) * 0.4) % 2 ? '#c8a060' : '#7a5a2a');
      }
      line(pb, 9, 6, 9, 1, '#b8944c'); pb.rect(9, 0, 3, 1, '#8a8f98'); pb.set(11, 1, '#8a8f98'); pb.set(11, 2, '#5a5f68'); pb.set(10, 2, '#5a5f68');
      pb.outline('#3a2810'); break;
    }
    case 'glockenhaube': {   // Messingglocke mit Bullauge
      pb = new PB(11, 12);
      for (let y = 1; y < 11; y++) for (let x = 0; x < 11; x++) {
        const half = y < 3 ? 2 + y : Math.min(5, 3.4 + y * 0.25), dx = x + 0.5 - 5.5;
        if (Math.abs(dx) > half) continue;
        pb.set(x, y, dx < -half + 1.4 ? '#ffe08a' : dx > half - 1.2 ? '#9a6a1e' : '#d8a440');
      }
      pb.rect(4, 0, 3, 1, '#8a8f98');
      for (let y = 4; y < 8; y++) for (let x = 3; x < 8; x++) { const r = Math.hypot(x + 0.5 - 5.5, y + 0.5 - 6); if (r <= 2.2) pb.set(x, y, r > 1.5 ? '#5a3a1b' : '#2a4a6a'); }
      pb.set(5, 5, '#9cc8ff'); pb.rect(0, 10, 11, 1, '#7a5228'); pb.rect(1, 11, 9, 1, '#3a3e44');
      pb.outline('#2a1a10'); break;
    }
    case 'erste_flamme': {   // End-Relikt A: Flamme in einer Messingschale
      pb = new PB(12, 13);
      for (let y = 0; y < 9; y++) for (let x = 0; x < 12; x++) {
        const u = y / 8, half = 4.6 * Math.sin(Math.min(1, u * 1.3 + 0.1) * Math.PI) * (0.55 + u * 0.45), dx = x + 0.5 - 6 - (1 - u) * 0.8;
        if (Math.abs(dx) > half) continue;
        const d = Math.abs(dx) / Math.max(1, half);
        pb.set(x, y, d < 0.35 && u > 0.35 ? '#fffbe0' : d < 0.7 ? '#ffd65a' : '#f08a3a');
      }
      for (let x = 1; x < 11; x++) { pb.set(x, 9, x < 4 ? '#ffe08a' : '#d8a440'); if (x > 1 && x < 10) pb.set(x, 10, x < 5 ? '#d8a440' : '#9a6a1e'); }
      pb.rect(5, 11, 2, 1, '#9a6a1e'); pb.rect(3, 12, 6, 1, '#7a5228');
      pb.outline('#3a1a08'); break;
    }
    case 'krone': {   // End-Relikt B: goldene Krone mit Steinen
      pb = new PB(13, 10);
      for (let y = 2; y < 10; y++) for (let x = 0; x < 13; x++) {
        const spike = y >= 5 || [1, 6, 11].some(c => Math.abs(x - c) <= (y - 2) * 0.6);
        if (!spike) continue;
        pb.set(x, y, y === 9 ? '#9a6a10' : x < 4 ? '#fff2a0' : x > 9 ? '#e0a82a' : '#ffd23f');
      }
      for (const c of [1, 6, 11]) pb.set(c, 1, '#fff2a0');
      pb.set(3, 7, '#e0384f'); pb.set(6, 7, '#3f8fe8'); pb.set(9, 7, '#e0384f'); pb.set(6, 3, '#2f8a52');
      pb.outline('#4a3010'); break;
    }
    case 'werkzeug':
    default:
      pb = new PB(10, 10);
      line(pb, 2, 8, 6, 4, '#a87444'); line(pb, 3, 8, 7, 4, '#7a4a28');
      pb.rect(5, 1, 4, 3, '#b0b6be'); pb.rect(5, 1, 4, 1, '#e4e8ec'); pb.rect(4, 2, 1, 2, '#8a8f98');
      pb.outline('#22262c');
  }
  return spr(pb, pb.w >> 1, pb.h >> 1);
}

// Flüssigkeiten: Tropfen in der Farbe der Flüssigkeit (FLUIDS in data/fluids.js)
export function makeFluidIcon(F) {
  const pb = new PB(9, 11);
  for (let y = 0; y < 11; y++) for (let x = 0; x < 9; x++) {
    const dx = x + 0.5 - 4.5, dy = y + 0.5 - 6.8;
    const inside = y >= 7 - 0.1 ? Math.hypot(dx, dy) <= 3.8 : Math.abs(dx) <= (y + 0.5) * 3.8 / 7.3 - 0.2;
    if (!inside) continue;
    const l = -(dx * 0.18 + dy * 0.12) + (bay(x, y) - 0.5) * 0.3;
    pb.set(x, y, l > 0.5 ? F.hi : l > -0.2 ? F.col : F.dk);
  }
  pb.set(3, 6, F.hi); pb.set(3, 7, F.hi);
  pb.outline('#14181e');
  return spr(pb, pb.w >> 1, pb.h >> 1);
}
