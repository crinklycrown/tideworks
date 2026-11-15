/* ---------- Seefahrt: Funde, Ladung, Zielmarke ---------- */
import { PB, spr, fromTpl } from '../pixelbuffer.js';

// Treibgut: zwei Fässer auf ein paar Planken
export function makeDrift() {
  const pb = fromTpl([
    '..........',
    '.BBB......',
    'BCCCB.....',
    'BRRRB.BBB.',
    'BCCCBBCCCB',
    'BCCCBBRRRB',
    'PPPPPPPPPP',
    '.QQQQQQQQ.'],
    { B: '#5a3218', C: '#a87444', R: '#8a8f98', P: '#c9995e', Q: '#7a4a28' }, '#2a1a0c');
  return spr(pb, 5, 6);
}
// Abgeworfene Ladung: drei Holzkisten mit Eisenbändern, ohne Planken
export function makeJetsam() {
  const pb = fromTpl([
    '...KKKK...',
    '...KYYK...',
    '...KMMK...',
    'KKKKKKKKK.',
    'KYYKKYYYK.',
    'KMMKKMMMK.',
    'KYYKKYYYK.',
    'KKKKKKKKK.',
    '.WWWWWWWW.'],
    { K: '#7a4a28', Y: '#d8a868', M: '#9aa0a8', W: '#cfe8f4' }, '#2a1a0c');
  return spr(pb, 5, 7);
}
// Wrack: halb versunkener Rumpf mit gebrochenem Mast
export function makeWreck() {
  const pb = new PB(26, 16);
  for (let x = 2; x < 24; x++) {
    const t = (x - 2) / 21, top = Math.round(9 - t * 5), bot = Math.round(11 - t * 3);
    for (let y = top; y <= bot; y++) pb.set(x, y, y === top ? '#c9995e' : (y === top + 1 ? '#5a3218' : ((x + y) % 5 === 0 ? '#5a3a20' : '#7a4a28')));
  }
  // Mast, schräg abgebrochen, mit Segelfetzen
  for (let i = 0; i < 9; i++) pb.set(15 + Math.round(i * 0.35), 5 - i * 0.55 + 0.5, '#5a3218');
  pb.rect(16, 1, 3, 2, '#d8d0c0'); pb.set(19, 2, '#b8b0a0');
  // Löcher im Rumpf
  pb.set(8, 9, '#2a1a0c'); pb.set(12, 8, '#2a1a0c'); pb.set(13, 8, '#2a1a0c');
  pb.outline('#2a1a0c');
  // Wasserlinie: unten verschwindet der Rumpf im Meer
  for (let x = 0; x < 26; x++) { pb.set(x, 12, (x % 4 < 2) ? '#9ad0f0' : null); pb.set(x, 13, null); }
  return spr(pb, 13, 12);
}
// Kiste mit Warenfarbe (Ladung an Deck)
export function makeCrate(col) {
  const pb = fromTpl(['XXXXX', 'XYCYX', 'XCCCX', 'XYCYX', 'XXXXX'], { X: '#5a3218', Y: '#c9995e', C: col });
  return spr(pb, 2, 4);
}
// Zielmarke (Fähnchen) für manuell gesteuerte Schiffe
export function makeFlagMarker() {
  const pb = fromTpl([
    'PFFFFF..',
    'PFFFFFF.',
    'PFFWFFFF',
    'PFFFFFF.',
    'PFFFFF..',
    'P.......',
    'P.......',
    'P.......',
    'P.......',
    'P.......',
    'PP......'],
    { P: '#5c3a1b', F: '#ffd23f', W: '#fff2a0' }, '#2a1a10');
  return spr(pb, 1, 11);
}
// Knopf-Symbol „abbrechen“
export const makeCross = () => spr(fromTpl(['XX....XX', 'XXX..XXX', '.XXXXXX.', '..XXXX..', '..XXXX..', '.XXXXXX.', 'XXX..XXX', 'XX....XX'], { X: '#b8402e' }), 4, 4);
// Warenfarbe für Kisten an Deck
export const ITEM_COL = { holz: '#a87444', kohle: '#30303a', eisenerz: '#a85a3c', kupfererz: '#6a9a84', kalk: '#ece8dc',
  quarz: '#ecd498', schwefel: '#f0d030', neodymerz: '#8a70b8', eisen: '#b4c4d8', kupfer: '#f0a060', fisch: '#8ab0c8', werkzeug: '#8a8f98',
  ziegel: '#c4553f', glas: '#a8dcf0', draht: '#d88040', stahl: '#7a8698', graphit: '#3e4248', silizium: '#6a78a8', chip: '#2f7a3a', teer: '#1a1a1e',
  skizze: '#fff4d8', bauplan: '#4a7ad8', schaltplan: '#3a9a5a',
  kunststoff: '#7fd8e8', schmiermittel: '#e8b020', neodym: '#c8b8e8', magnet: '#c4302a',
  fass: '#8a5a32', fass_wasser: '#6ec8f0', fass_rohoel: '#2e2018', fass_saeure: '#c8e040',
  raeucherfisch: '#c8782a', seil: '#d8b870', netz: '#8a9a8a', zahnrad: '#e0b040', feder: '#b4c4d8', rohrteil: '#9aa0aa', uhrwerk: '#ffd23f', zelle: '#5ab848', perle: '#f4eef8',
  schrott: '#7a6a5a', glockenseil: '#c8a060', glockenhaube: '#d8a440', erste_flamme: '#ffd65a', krone: '#ffd23f' };
