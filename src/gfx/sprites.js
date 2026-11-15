/* =========================================================
   SPRITES – werden beim Start einmalig erzeugt
   ========================================================= */
import { PB, spr, fromTpl, fillBlob } from './pixelbuffer.js';
import { ITEM_ORDER } from '../data/items.js';
import { SPECIES, makeTree, makePalm } from './sprites/trees.js';
import { makeSaege, makeBohrer, makeSchmelzofen, makeVerbrennung, makeFischer, makeWerkzeug, makeWerft, makeKontor, makeHuette, makeBuerger,
  makeDrahtzieherei, makeInduktionsofen, makeGraphitpresse, makeSiliziumofen, makeAssembler, makePyrolyseofen, makeBohrer2, makeRaeucherei } from './sprites/buildings.js';
import { beltFrames, beltCurves, splitterPB, ueberPB, bridgePB, sorterSprites, makeMast, makeBatterie, makeShip, makeKogge } from './sprites/logistics.js';
import { makeItemIcon, makeFluidIcon } from './sprites/items.js';
import { makeKontor3, stegSprites, makeLantern, makeKiste, makeHandels, extraktorSprites, gateSprites, bridgeEndPB, makeShipE } from './sprites/storage.js';
import { pipeSprites, makePumpe, makeTank, makeKraftwerk, makeSaugpumpe, makeReaktor, makeGeothermie, makeIngenieur, makeMultibohrer, makeAbfueller, makeEntleerer } from './sprites/fluids.js';
import { FLUIDS, PIPES } from '../data/fluids.js';
import { makeCoin, makeWrench, makeEventIcons, makeTraderShip, makeHandel, makeLighthouse, makeScaffold, LIGHTHOUSE_H, makeHub, makeDKiste, makeDrone } from './sprites/endgame.js';
import { npcSprites, npcSprite } from './sprites/npc.js';
import { makeDrift, makeJetsam, makeWreck, makeCrate, makeFlagMarker, makeCross, ITEM_COL } from './sprites/sea.js';
import { makeSun, makeMoon, makeHammer, makeFlask, makeAnchor, makeChart, makeGear, makeCatLogistik, makeCatAbbau, makeCatVerarbeitung, makeCatFluessig, makeCatSchiff, makeCatChemie, makeBook, makeUpBadge, makePlus, makeMinus, makeFlag,
  makeUpgrade, makeBlueprint, makeStatus, makeUndo, makeRedo, makePause, makePlay, makeKey, logoIconPB, makeLogo, makeMapIcon, makeMarkHere, makeMarkWarn, makeMarkHelp, makeChat } from './sprites/ui.js';

export const SPR = { tree: {}, item: {}, b: {}, icon: {} };
export function buildSprites() {
  Object.keys(SPECIES).forEach((id, n) => {
    SPR.tree[id] = [makeTree(id, 1, 0), [0, 1, 2].map(v => makeTree(id, 2, 100 + n * 37 + v * 1009)), [0, 1, 2].map(v => makeTree(id, 3, 300 + n * 41 + v * 977))];
  });
  SPR.palm = [makePalm(1, 0), [0, 1, 2].map(v => makePalm(2, 500 + v * 31)), [0, 1, 2].map(v => makePalm(3, 700 + v * 47))];
  ITEM_ORDER.forEach(id => { SPR.item[id] = makeItemIcon(id); });
  for (const f in FLUIDS) SPR.item[f] = makeFluidIcon(FLUIDS[f]);   // Flüssigkeiten als Tropfen (gleiche Tabelle, damit Rezepte und Statistik sie wie Items zeigen)
  SPR.b.kiste = makeKiste();
  SPR.b.extraktor = extraktorSprites();
  SPR.steg = stegSprites(); SPR.lantern = makeLantern();
  SPR.gate = gateSprites();
  SPR.bbEnd = spr(bridgeEndPB(), 0, 0);
  SPR.shipE = makeShipE();
  SPR.b.saege = [makeSaege(0), makeSaege(1)];
  SPR.b.bohrer = [makeBohrer(0), makeBohrer(1)];
  SPR.b.bohrer2 = [makeBohrer2(0), makeBohrer2(1)];
  SPR.b.schmelzofen = makeSchmelzofen();
  SPR.b.drahtzieherei = [makeDrahtzieherei(0), makeDrahtzieherei(1)];
  SPR.b.induktionsofen = makeInduktionsofen();
  SPR.b.graphitpresse = [0, 1, 2, 1].map(makeGraphitpresse);
  SPR.b.siliziumofen = makeSiliziumofen();
  SPR.b.assembler = [0, 1, 2, 3].map(makeAssembler);
  SPR.b.pyrolyseofen = makePyrolyseofen();
  SPR.b.verbrennung = makeVerbrennung();
  SPR.b.fischer = makeFischer();
  SPR.b.werkzeug = makeWerkzeug();
  SPR.b.raeucherei = makeRaeucherei();
  SPR.b.werft = makeWerft();
  SPR.b.huette = makeHuette(false); SPR.b.huetteN = makeHuette(true);
  SPR.b.buerger = makeBuerger(false); SPR.b.buergerN = makeBuerger(true);
  SPR.belt = [beltFrames(1), beltFrames(2), beltFrames(3)];
  SPR.splitter = spr(splitterPB(), 0, 0);
  SPR.ueber = spr(ueberPB(), 0, 0);
  SPR.sorter = sorterSprites();
  SPR.bridge = spr(bridgePB(), 0, 0);
  SPR.curve = [beltCurves(1), beltCurves(2), beltCurves(3)];
  // Flüssigkeiten: Rohre je Stufe (16 Verbindungsmasken), Pumpen, Tank, Kraftwerke, Reaktor, Ingenieurshaus, Multi-Bohrer
  SPR.pipe = [pipeSprites(1), pipeSprites(2), pipeSprites(3)];
  SPR.b.pumpe = [0, 1, 2, 3].map(makePumpe);
  SPR.b.tank = makeTank();
  SPR.b.kraftwerk = makeKraftwerk();
  SPR.b.saugpumpe = [0, 1, 2, 3].map(makeSaugpumpe);
  SPR.b.reaktor = makeReaktor();
  SPR.b.geothermie = makeGeothermie();
  SPR.b.ingenieur = makeIngenieur(false); SPR.b.ingenieurN = makeIngenieur(true);
  SPR.b.multibohrer = [makeMultibohrer(0), makeMultibohrer(1)];
  SPR.b.abfueller = makeAbfueller();
  SPR.b.entleerer = makeEntleerer();
  // Endgame: Handel, Weltenleuchtturm, Drohnen, Ereignisse
  SPR.b.handel = makeHandel();
  SPR.b.leuchtturm = [0, 1, 2, 3, 4].map(ph => makeLighthouse(ph, false));
  SPR.b.leuchtturmLit = makeLighthouse(4, true);   // brennende Lampe (Ende A)
  SPR.scaffold = LIGHTHOUSE_H.map(makeScaffold);
  SPR.b.drohnenhafen = makeHub();
  SPR.b.dkiste = makeDKiste(false); SPR.b.dkisteR = makeDKiste(true);
  SPR.drone = [makeDrone(0), makeDrone(1)];
  SPR.trader = { hafen: makeTraderShip('#3f6fd8', false), fern: makeTraderShip('#a25ad8', true) };
  SPR.ev = makeEventIcons();
  SPR.icon.coin = makeCoin(); SPR.icon.wrench = makeWrench();
  SPR.b.mast = makeMast();
  SPR.b.batterie = makeBatterie();
  SPR.ship = makeShip(); SPR.shipK = makeKogge();
  SPR.drift = makeDrift(); SPR.jetsam = makeJetsam(); SPR.wreck = makeWreck(); SPR.mark = makeFlagMarker();
  SPR.crate = {}; ITEM_ORDER.forEach(id => { SPR.crate[id] = makeCrate(ITEM_COL[id] || '#e6bf85'); });
  SPR.sun = makeSun(); SPR.moon = makeMoon();
  SPR.icon.star = spr(fromTpl(['.....X.....', '.....X.....', '....XYX....', '....XXX....', 'XXXXYXXXXXX', '.XXYYXXXXX.', '..XXXXXXX..', '...XXXXX...', '..XXX.XXX..', '..XX...XX..', '.X.......X.'],
    { X: '#ffc61a', Y: '#fff2a0' }, '#9a6a10'), 5, 10);
  SPR.icon.house = spr(fromTpl(['.....R.....', '....RRR....', '...RRRRR...', '..RRRRRRR..', '.RRRRRRRRR.', '..WWWWWWW..', '..WDDWGGW..', '..WDDWGGW..', '..WDDWWWW..', '..WDDWWWW..'],
    { R: '#c4553f', W: '#e6bf85', D: '#7a4a28', G: '#8fd0ea' }, '#3a2414'), 5, 9);
  SPR.icon.chest = spr(fromTpl(['..XXXXXXX..', '.XYYYYYYYX.', 'XYYYYYYYYYX', 'XXXXXGXXXXX', 'XZZZZGZZZZX', 'XZZZZZZZZZX', 'XZZZZZZZZZX', 'XXXXXXXXXXX'],
    { X: '#7a4a28', Y: '#b8874c', Z: '#9a6a3e', G: '#ffd23f' }, '#3a2414'), 5, 7);
  SPR.icon.lock = spr(fromTpl(['..XXX..', '.X...X.', '.X...X.', 'YYYYYYY', 'YYYZYYY', 'YYYZYYY', 'YYYYYYY'], { X: '#8a8f98', Y: '#e8b45c', Z: '#5a3a1b' }, '#3a2414'), 3, 6);
  SPR.icon.check = spr(fromTpl(['........XX', '.......XXX', '......XXX.', 'XX...XXX..', 'XXX.XXX...', '.XXXXX....', '..XXX.....', '...X......'], { X: '#2f6a1e' }), 5, 7);
  SPR.icon.pick = spr(fromTpl(['..BBBBBB...', '.BCCCCCCB..', 'BC.....HCB.', 'B.....H..B.', '.....H.....', '....H......', '...H.......', '..H........', '.H.........'],
    { B: '#8a8f98', C: '#c8ccd4', H: '#a87444' }, '#2a1a10'), 5, 8);
  SPR.icon.bolt = spr(fromTpl(['....XX', '...XX.', '..XX..', '.XXXX.', '...XX.', '..XX..', '.XX...', 'XX....'], { X: '#ffd23f' }, '#7a5a10'), 3, 4);
  // Oberfläche: Knopfleiste, Einstellungen, Baukategorien (Schlüssel in BUILD_CATS), Zoom, Inselflaggen
  SPR.icon.hammer = makeHammer(); SPR.icon.flask = makeFlask(); SPR.icon.anchor = makeAnchor(); SPR.icon.chart = makeChart(); SPR.icon.gear = makeGear();
  SPR.icon.catLogistik = makeCatLogistik(); SPR.icon.catAbbau = makeCatAbbau(); SPR.icon.catVerarbeitung = makeCatVerarbeitung();
  SPR.icon.catFluessig = makeCatFluessig(); SPR.icon.catSchiff = makeCatSchiff(); SPR.icon.catChemie = makeCatChemie();
  SPR.icon.book = makeBook(); SPR.icon.up = makeUpBadge();
  SPR.icon.plus = makePlus(); SPR.icon.minus = makeMinus(); SPR.icon.cross = makeCross();
  SPR.icon.upgrade = makeUpgrade(); SPR.icon.blueprint = makeBlueprint(); SPR.icon.status = makeStatus(); SPR.icon.undo = makeUndo(); SPR.icon.redo = makeRedo();
  SPR.icon.pause = makePause(); SPR.icon.speed1 = makePlay(1); SPR.icon.speed2 = makePlay(2); SPR.icon.speed3 = makePlay(3); SPR.icon.key = makeKey();
  SPR.icon.people = spr(fromTpl(['.SS...SS.', 'SSSS.SSSS', '.SS...SS.', 'BBBB.CCCC', 'BBBB.CCCC', 'BBBB.CCCC', '.B.B..C.C'], { S: '#f6c79a', B: '#3f6fd8', C: '#c4553f' }, '#2a1a10'), 4, 6);
  SPR.icon.map = makeMapIcon();
  // Taucherglocke (Platzhalter im Baumenü, Bauplan aus cs_licht_im_wind): Messingglocke mit Bullaugen an der Kette
  SPR.icon.glocke = spr(fromTpl([
    '.......C.......', '.......C.......', '......CCC......', '.....YYYYY.....', '....YHYYYYY....', '...YHYYYYYYZ...', '...YHYYYYYYZ...',
    '..YHYGGYYGGYZ..', '..YHGBBGGBBGZ..', '..YYGBBGGBBGZ..', '..YYYGGYYGGYZ..', '.YYYYYYYYYYYYZ.', '.YHYYYYYYYYYZZ.', 'RRRRRRRRRRRRRRR', '.KKKKKKKKKKKKK.'],
    { C: '#8a8f98', Y: '#d8a440', H: '#ffe08a', Z: '#9a6a1e', G: '#5a3a1b', B: '#2a4a6a', R: '#7a5228', K: '#3a3e44' }, '#2a1a10'), 7, 14);
  // 0.19.0: kleine Glocke (Schiff mit Taucherglocke in Listen), Glocke am Kran des Schiffs, Blasen (Tauchspot auf Minikarte und in Meldungen)
  SPR.icon.bellS = spr(fromTpl(['.........', '....C....', '...YYY...', '..YHYYZ..', '..YHBYZ..', '..YHBYZ..', '.YHYYYYZ.', '.RRRRRRR.', '.........'],
    { C: '#8a8f98', Y: '#d8a440', H: '#ffe08a', Z: '#9a6a1e', B: '#2a4a6a', R: '#7a5228' }, '#2a1a10'), 4, 4);
  SPR.bellHang = spr(fromTpl(['.........', '...CCC...', '..YHYYZ..', '..YHYYZ..', '.YHGBGYZ.', '.YYGBGYZ.', '.YYYYYYZ.', '.RRRRRRR.', '.........'],
    { C: '#8a8f98', Y: '#d8a440', H: '#ffe08a', Z: '#9a6a1e', G: '#5a3a1b', B: '#2a4a6a', R: '#7a5228' }, '#2a1a10'), 4, 1);
  SPR.icon.bubbles = spr(fromTpl(['...........', '.......WW..', '......WHHW.', '......WHHW.', '...W...WW..', '..WHW......', '...W..WWW..', '.....WHHHW.', '.....WHHHW.', '......WWW..', '...........'],
    { W: '#e8f8ff', H: '#6ec8f0' }, '#1e4a6a'), 5, 5);
  SPR.icon.markHere = makeMarkHere(); SPR.icon.markWarn = makeMarkWarn(); SPR.icon.markHelp = makeMarkHelp(); SPR.icon.chat = makeChat();
  // NPC-Inseln: Stege je NPC, Dorfgebäude, Figuren
  SPR.npc = npcSprites();
  SPR.logo = makeLogo(); SPR.logoIcon = spr(logoIconPB(), 12, 12);
}
// Logo-Zeichen (Zahnrad wird zur Welle) in ein Canvas zeichnen (Kopfzeile 24×24), Favicon setzen
export function drawLogo(cv) {
  const pb = logoIconPB();
  cv.width = pb.w; cv.height = pb.h;
  cv.getContext('2d').drawImage(pb.toCanvas(), 0, 0);
}
export function setFavicon() {
  const pb = logoIconPB(), cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(pb.toCanvas(), 0, 0, 24, 24, 2, 2, 28, 28);
  let link = document.querySelector('link[rel="icon"]');
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = cv.toDataURL('image/png');
}
// Bild einer Schiffsart (Frachtschiff, Entdecker, Kogge)
export const shipSprite = (kind) => kind === 'entdecker' ? SPR.shipE : kind === 'kogge' ? SPR.shipK : SPR.ship;
export function bIcon(t) {
  if (t === 'band') return SPR.belt[0][0][0];
  if (t === 'band2') return SPR.belt[1][0][0];
  if (t === 'band3') return SPR.belt[2][0][0];
  if (t === 'splitter') return SPR.splitter;
  if (t === 'ueberlauf') return SPR.ueber;
  if (t === 'sortierer') return SPR.sorter[0];
  if (t === 'kreuzung') return SPR.bridge;
  if (t === 'tor') return SPR.gate[0][1];
  if (t === 'bandbruecke') return SPR.bbEnd;
  if (t === 'extraktor') return SPR.b.extraktor[0];
  if (t === 'handelskontor') return handelSpr('#e0384f');
  if (PIPES[t]) return SPR.pipe[PIPES[t].tier - 1][5];
  if (t === 'leuchtturm') return SPR.b.leuchtturm[4];
  if (t === 'npchafen') return SPR.npc.hafen.ole;
  if (SPR.npc && SPR.npc.b[t]) return npcSprite(SPR.npc, { t, id: 0 });
  if (Array.isArray(SPR.b[t])) return SPR.b[t][0];
  if (t === 'kontor') return kontor3Spr('#e0384f');
  if (t === 'kontoralt') return kontorSpr('#e0384f');
  return SPR.b[t];
}
// Kontor und Flagge in einer Flaggenfarbe (je Farbe einmal erzeugt; Farbe einer Insel: flagOf in sim/state.js)
const KONT = new Map(), FLAG = new Map();
export function kontorSpr(c) { if (!KONT.has(c)) KONT.set(c, makeKontor(c)); return KONT.get(c); }
// Hauptkontor 3×3 und Handelskontor in der Flaggenfarbe
const KONT3 = new Map(), HANDEL = new Map();
export function kontor3Spr(c) { if (!KONT3.has(c)) KONT3.set(c, makeKontor3(c)); return KONT3.get(c); }
export function handelSpr(c) { if (!HANDEL.has(c)) HANDEL.set(c, makeHandels(c)); return HANDEL.get(c); }
// Sprite eines Kontors (Hauptkontor neu/alt, Handelskontor) für die Insel-Flaggenfarbe
export function kontorOfType(t, c) { return t === 'kontor' ? kontor3Spr(c) : t === 'handelskontor' ? handelSpr(c) : kontorSpr(c); }
export function flagSpr(c) { if (!FLAG.has(c)) FLAG.set(c, makeFlag(c)); return FLAG.get(c); }
