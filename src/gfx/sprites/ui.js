/* ---------- UI-Symbole ---------- */
import { PB, spr, shadeEllipse, fromTpl } from '../pixelbuffer.js';

export function makeSun() {
  const pb = new PB(16, 16);
  shadeEllipse(pb, 8, 8, 4, 4, ['#fff4a0', '#ffd84a', '#f6b02a', '#e08a1a'], 0, 0.2);
  pb.outline('#b8640e');
  for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4; pb.set(7.5 + Math.cos(an) * 6.4, 7.5 + Math.sin(an) * 6.4, '#f6b02a'); }
  return spr(pb, 8, 8);
}
export function makeMoon() {
  const pb = new PB(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const a = Math.hypot(x + 0.5 - 8, y + 0.5 - 8), b = Math.hypot(x + 0.5 - 10.6, y + 0.5 - 6.2);
    if (a <= 5.5 && b > 4.6) pb.set(x, y, (x + y) % 4 === 0 ? '#e8d27a' : (x < 7 ? '#fff6c8' : '#f2df8a'));
  }
  pb.outline('#7a6a2a');
  return spr(pb, 8, 8);
}

/* ---------- Symbole der Oberfläche (Knopfleiste, Kategorien, Menüs) ---------- */
const STEEL = { M: '#8a8f98', L: '#c8ccd4', D: '#5a5f68' }, WOOD = { H: '#a87444', J: '#7a4a28' };
// Bauen: Hammer
export const makeHammer = () => spr(fromTpl([
  '..LLL......', '.LMMMM.....', 'LMMMMMM....', '.MMMMMMJ...', '..MMM.JHJ..', '......JHHJ.', '.......JHH.', '........JHJ', '.........J.'],
  Object.assign({}, STEEL, WOOD), '#2a1a10'), 5, 4);
// Forschung: Kolben
export const makeFlask = () => spr(fromTpl([
  '...HHH...', '...WGW...', '...WGW...', '...WGW...', '..WGGGW..', '.WGGGGGW.', 'WGLLLLLGW', 'WLLKLLLLW', 'WLLLLLKLW', '.WWWWWWW.'],
  { H: '#a87444', W: '#9ac4d4', G: '#eef8fb', L: '#7cc24f', K: '#b4e47c' }, '#22343a'), 4, 5);
// Flotte: Anker
export const makeAnchor = () => spr(fromTpl([
  '....XXX....', '....X.X....', '....XXX....', '..XXXXXXX..', '.....X.....', '.....X.....', '.....X.....', 'X....X....X', 'XX...X...XX', '.XX..X..XX.', '..XXXXXXX..', '....XXX....'],
  { X: '#5a6f86' }, '#1e2a36'), 5, 6);
// Statistik: Säulendiagramm
export const makeChart = () => spr(fromTpl([
  'A..........', 'A.......GG.', 'A.......GG.', 'A....YY.GG.', 'A....YY.GG.', 'A.RR.YY.GG.', 'A.RR.YY.GG.', 'AAAAAAAAAAA'],
  { A: '#5c3a1b', R: '#e8774f', Y: '#ffc61a', G: '#7cc24f' }), 5, 4);
// Einstellungen: Zahnrad
export const makeGear = () => spr(fromTpl([
  '.....XX.....', '..X..XX..X..', '.XXXXXXXXXX.', '..XXLLLLXX..', '..XLX..XLX..', 'XXXL....LXXX', 'XXXL....LXXX', '..XLX..XLX..', '..XXLLLLXX..', '.XXXXXXXXXX.', '..X..XX..X..', '.....XX.....'],
  { X: '#8a8f98', L: '#c8ccd4' }, '#2a2e34'), 6, 6);
// Logistik: Pfeil über einem Band
export const makeCatLogistik = () => spr(fromTpl([
  '......X....', '......XX...', 'XXXXXXXXX..', 'XXXXXXXXXX.', 'XXXXXXXXX..', '......XX...', '......X....', '...........', 'DDDDDDDDDDD', 'DLDLDLDLDLD', 'DDDDDDDDDDD'],
  { X: '#ffc61a', D: '#5a4a3e', L: '#9a8a7a' }, '#2a1a10'), 5, 5);
// Abbau: Axt
export const makeCatAbbau = () => spr(fromTpl([
  '..MMM.HH...', '.LMMMMHH...', 'LMMMMMHH...', '.LMMMMHH...', '..MMM.HH...', '......HH...', '......JH...', '......JH...', '......JH...'],
  Object.assign({}, STEEL, WOOD), '#2a1a10'), 5, 4);
// Verarbeitung: Amboss
export const makeCatVerarbeitung = () => spr(fromTpl([
  'LLLLLLLLLLL', '.MMMMMMMMMM', '...MMMMMMM.', '....DMMMD..', '....DMMMD..', '..MMMMMMMM.', '.DDDDDDDDDD'],
  STEEL, '#22262c'), 5, 3);
// Flüssigkeiten: Tropfen
export const makeCatFluessig = () => spr(fromTpl([
  '....X....', '....X....', '...XXX...', '..XXXXX..', '.XXXXXXX.', '.XLXXXXX.', '.XLXXXXX.', '..XXXXX..', '...XXX...'],
  { X: '#4a9ae0', L: '#a6d6f6' }, '#1a3a5a'), 4, 4);
// Chemie: Reagenzglas mit gelber Flüssigkeit und Blase
export const makeCatChemie = () => spr(fromTpl([
  '..WWWWW..', '...WGW...', '...WGW..B', '...WGW...', '..WGGGW.B', '.WGYYYGW.', 'WGYYKYYGW', 'WYYYYYYYW', 'WYYKYYYYW', '.WWWWWWW.'],
  { W: '#9ac4d4', G: '#eef8fb', Y: '#f0d030', K: '#fff6a0', B: '#c8e8f4' }, '#22343a'), 4, 5);
// Skilltree-Wurzel „Grundlagen“: aufgeschlagenes Buch
export const makeBook = () => spr(fromTpl([
  '.PPPP.PPPP.', 'PLLLLPLLLLP', 'PLKKLPLKKLP', 'PLLLLPLLLLP', 'PLKKLPLKKLP', 'PLLLLPLLLLP', 'PLKKLPLKLLP', 'PLLLLPLLLLP', 'RRRRRPRRRRR', '.RRRR.RRRR.'],
  { P: '#5c3a1b', L: '#fbf0d4', K: '#b89a70', R: '#c4553f' }, '#2a1a10'), 5, 5);
// Upgrade-Abzeichen (Pfeil nach oben)
export const makeUpBadge = () => spr(fromTpl([
  '...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '..XXX..', '..XXX..', '..XXX..'],
  { X: '#7cd04f' }, '#1f3d10'), 4, 4);
// Schifffahrt: Segelboot
export const makeCatSchiff = () => spr(fromTpl([
  '.....P.....', '.....PS....', '.....PSS...', '.....PSSS..', '.....PSSSS.', '.....P.....', 'HHHHHHHHHHH', '.HJHHHHHJH.', '..HHHHHHH..'],
  { P: '#5c3a1b', S: '#fbf0d4', H: '#a87444', J: '#7a4a28' }, '#2a1a10'), 5, 4);
// Zoom
export const makePlus = () => spr(fromTpl(['...XX...', '...XX...', 'XXXXXXXX', 'XXXXXXXX', '...XX...', '...XX...'], { X: '#5c3a1b' }), 4, 3);
export const makeMinus = () => spr(fromTpl(['XXXXXXXX', 'XXXXXXXX'], { X: '#5c3a1b' }), 4, 1);
// Inselflagge in der Farbe der Insel
export const makeFlag = (col) => spr(fromTpl(['P.......', 'PFFFFF..', 'PFFFFFF.', 'PFFFFF..', 'P.......', 'P.......', 'P.......'], { P: '#5c3a1b', F: col }, '#2a1a10'), 4, 3);

/* ---------- Komfort: Aufwerten, Blaupause, Statusansicht, Rückgängig/Wiederholen, Spieltempo, Tasten ---------- */
// Aufwerten: grüner Pfeil über einem Stahlblock
export const makeUpgrade = () => spr(fromTpl([
  '.....G.....', '....GGG....', '...GGKGG...', '..GGGKGGG..', '.GGGGKGGGG.', '....GKG....', '....GKG....', '....GGG....', '.MMMMMMMMM.', '.MLLLLLLLM.', '.MMMMMMMMM.'],
  { G: '#7cc24f', K: '#b4e47c', M: '#8a8f98', L: '#c8ccd4' }, '#1e3a12'), 5, 5);
// Blaupause: blaues Blatt mit weißem Raster und Grundriss
export const makeBlueprint = () => spr(fromTpl([
  'BBBBBBBBBBB', 'BLBBBLBBBLB', 'BBWWWWWBBBB', 'BBWBBBWBBBB', 'BLWBBBWWWWB', 'BBWBBBBBBWB', 'BBWWWWBBBWB', 'BLBBBWWWWWB', 'BBBBBBBBBBB', 'LLLLLLLLLLL'],
  { B: '#3d74c8', L: '#5e93dc', W: '#eef6ff' }, '#16305a'), 5, 5);
// Statusansicht: Lupe mit grünem, gelbem und rotem Punkt
export const makeStatus = () => spr(fromTpl([
  '..XXXXX....', '.XGG.YYX...', 'XGGG.YYYX..', 'X.........X', 'XRRR......X', 'XRRR.....X.', '.X......X..', '..XXXXXXHH.', '.......HHH.', '........HHH', '.........HH'],
  { X: '#5a5f68', G: '#7cc24f', Y: '#ffc61a', R: '#e8504a', H: '#a87444' }, '#2a1a10'), 5, 5);
// Rückgängig / Wiederholen: gebogener Pfeil
const ARROW = ['...X.......', '..XX.......', '.XXXXXXXX..', 'XXXXXXXXXX.', '.XXXXXXXXXX', '..XX....XXX', '...X.....XX', '.........XX', '........XX.'];
export const makeUndo = () => spr(fromTpl(ARROW, { X: '#e8d2a0' }, '#3a2414'), 5, 4);
export const makeRedo = () => spr(fromTpl(ARROW.map(r => [...r].reverse().join('')), { X: '#e8d2a0' }, '#3a2414'), 5, 4);
// Spieltempo: Pause, 1×, 2×, 3×
export const makePause = () => spr(fromTpl(['XXX.XXX', 'XXX.XXX', 'XXX.XXX', 'XXX.XXX', 'XXX.XXX', 'XXX.XXX', 'XXX.XXX'], { X: '#fbf0d4' }, '#3a2414'), 3, 3);
const tri = (n) => ['X...', 'XX..', 'XXX.', 'XXXX', 'XXX.', 'XX..', 'X...'].map(r => Array(n).fill(r).join('.'));
export const makePlay = (n) => spr(fromTpl(tri(n), { X: '#fbf0d4' }, '#3a2414'), 2 * n, 3);
// Tastenkürzel: Taste
export const makeKey = () => spr(fromTpl(['.XXXXXXX.', 'XLLLLLLLX', 'XLMMMMMLX', 'XLMLLLMLX', 'XLMMMMMLX', 'XLLLLLLLX', 'XDDDDDDDX', '.XXXXXXX.'],
  { X: '#3a2414', L: '#fbf0d4', M: '#8a5a32', D: '#c8a878' }), 4, 4);

/* ---------- Koop: Markierungen und Chat ---------- */
// Hierher: Pfeil nach unten
export const makeMarkHere = () => spr(fromTpl(['..XXXXX..', '..XWWWX..', '..XWWWX..', 'XXXWWWXXX', '.XWWWWWX.', '..XWWWX..', '...XWX...', '....X....'],
  { X: '#2a1a10', W: '#fff8e0' }), 4, 7);
// Achtung: Warndreieck
export const makeMarkWarn = () => spr(fromTpl(['.....X.....', '....XYX....', '....XYX....', '...XYKYX...', '...XYKYX...', '..XYYKYYX..', '..XYYYYYX..', '.XYYYKYYYX.', 'XXXXXXXXXXX'],
  { X: '#5a3a10', Y: '#ffd23f', K: '#2a1a10' }), 5, 8);
// Hilfe: Fragezeichen im Kreis
export const makeMarkHelp = () => spr(fromTpl(['...XXXXX...', '..XWWWWWX..', '.XWWKKKWWX.', '.XWKWWWKWX.', '.XWWWWKWWX.', '.XWWWKWWWX.', '.XWWWWWWWX.', '.XWWWKWWWX.', '..XWWWWWX..', '...XXXXX...'],
  { X: '#1e3a5a', W: '#d8ecff', K: '#1e3a5a' }), 5, 9);
// Chat: Sprechblase
export const makeChat = () => spr(fromTpl(['XXXXXXXXXX', 'XWWWWWWWWX', 'XWKKKKKKWX', 'XWWWWWWWWX', 'XWKKKKWWWX', 'XWWWWWWWWX', 'XXXWXXXXXX', '..XWX.....', '..XX......'],
  { X: '#3a2414', W: '#fbf0d4', K: '#8a5a32' }), 5, 4);

/* ---------- Logo „TIDEWORKS“ (Titelbildschirm, Kopfzeile, Favicon) ---------- */
// Zeichen: Zahnrad, das rechts in eine Welle übergeht (24×24)
export function logoIconPB() {
  const pb = new PB(24, 24), c = 11.5;
  const BR = ['#ffe9a0', '#f6c453', '#e0a030', '#b87a22'], SEA = ['#bfe8ff', '#6cc0e8', '#3f8fd0', '#2a5ab0'];
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const dx = x + 0.5 - 12, dy = y + 0.5 - 12, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const left = dx < 1.5, tone = Math.max(0, Math.min(3, Math.floor((dy + 10) / 5.5)));
    if (left) {
      const tooth = Math.cos(a * 8) > 0.35 ? 11.4 : 9.2;
      if (r <= tooth && r >= 3.2) pb.set(x, y, r < 5 ? BR[1] : BR[tone]);
    } else {
      // Welle: Ring, dessen Außenkante oben rechts zu einer Gischt-Locke wird
      if (r <= 9.4 && r >= 3.2) pb.set(x, y, r < 5 ? BR[1] : SEA[tone]);
      if (r > 9.4 && r < 11 && dy > -2) pb.set(x, y, SEA[3]);
    }
  }
  // Locke oben rechts mit Schaumkrone
  for (let y = 0; y < 24; y++) for (let x = 12; x < 24; x++) {
    const d = Math.hypot(x + 0.5 - 18.5, y + 0.5 - 5.5);
    if (d <= 4.2 && d >= 2) pb.set(x, y, y < 5 ? '#fbf6ea' : '#6cc0e8');
  }
  pb.set(17, 6, null); pb.set(18, 6, null); pb.set(18, 5, null);
  pb.rect(10, 10, 4, 4, null);   // Nabe
  pb.set(c, c, null);
  pb.outline('#2a1a10');
  return pb;
}
const GLYPH = {
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.']
};
// Schriftzug in Messing/Gold mit dunkler Kontur und Schatten, links das Zeichen
export function makeLogo(text = 'TIDEWORKS') {
  const S = 2, gap = 2, icon = logoIconPB();
  const widths = [...text].map(ch => GLYPH[ch][0].length * S);
  const tw = widths.reduce((a, w) => a + w, 0) + gap * (text.length - 1);
  const pb = new PB(icon.w + 5 + tw + 3, 28), oy = 6, GOLD = ['#fff4c0', '#ffe08a', '#f6c453', '#e8a83a', '#c98a2a', '#9a6420'];
  const draw = (ox, oy2, col) => {
    let x0 = ox;
    [...text].forEach((ch, i) => {
      GLYPH[ch].forEach((row, gy) => [...row].forEach((v, gx) => {
        if (v !== '#') return;
        for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) { const y = gy * S + sy; pb.set(x0 + gx * S + sx, oy2 + y, col || GOLD[Math.min(5, Math.floor(y / 2.5))]); }
      }));
      x0 += widths[i] + gap;
    });
  };
  draw(icon.w + 6, oy + 2, '#3a2414');    // Schatten
  draw(icon.w + 5, oy);
  pb.outline('#2a1a10');
  pb.blit(icon, 1, 2);
  return spr(pb, 0, 0);
}
// Kartenansicht: gefaltete Seekarte mit Insel und Route
export const makeMapIcon = () => spr(fromTpl([
  'PPPPQQQQRRRR', 'PBBPQBBQRBBR', 'PBGGQBBQRBBR', 'PGGGGBBQRBBR', 'PBGGQ.BQRBXR', 'PBBPQB.QR.BR', 'PBBPQBB.RBBR', 'PBBPQBBQ.BBR', 'PPPPQQQQRRRR'],
  { P: '#f3e1b6', Q: '#e6cd96', R: '#f3e1b6', B: '#6cc0e8', G: '#7cc24f', X: '#e0384f', '.': '#c0392b' }, '#5c3a1b'), 6, 4);
