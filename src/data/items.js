// Items und Erze. Neue Items hier eintragen (Symbol in gfx/sprites/items.js, Kistenfarbe in gfx/sprites/sea.js ITEM_COL).
// Reihenfolge = ITEM_ORDER (Lager-Panel, Statistik, Auswahllisten).
// burn = Brennwert in der Verbrennungsanlage, kind = Art:
//   roh (Rohstoff), nahrung, zwischen (Zwischenprodukt), end (Endprodukt), plan (Pläne von Häusern, werden beim Abriss nicht erstattet).
// npc = Ware eines Volks (nur dort kaufbar, data/npctrade.js).
// Flüssigkeiten stehen in einer eigenen Tabelle (FLUIDS, data/fluids.js); Rezepte nutzen sie über fin/fout.
import { FLUIDS } from './fluids.js';
export const ITEMS = {
  holz:       { name: 'Holz',          burn: 4,  kind: 'roh' },
  kohle:      { name: 'Kohle',         burn: 12, kind: 'roh' },
  eisenerz:   { name: 'Eisenerz',      burn: 1,  kind: 'roh' },
  kupfererz:  { name: 'Kupfererz',     burn: 1,  kind: 'roh' },
  kalk:       { name: 'Kalkstein',     burn: 1,  kind: 'roh' },
  quarz:      { name: 'Quarzsand',     burn: 1,  kind: 'roh' },
  schwefel:   { name: 'Schwefel',      burn: 6,  kind: 'roh' },
  neodymerz:  { name: 'Neodym-Erz',    burn: 1,  kind: 'roh' },
  fisch:      { name: 'Fisch',         burn: 2,  kind: 'nahrung' },
  eisen:      { name: 'Eisenbarren',   burn: 1,  kind: 'zwischen' },
  kupfer:     { name: 'Kupferbarren',  burn: 1,  kind: 'zwischen' },
  ziegel:     { name: 'Ziegel',        burn: 1,  kind: 'zwischen' },
  glas:       { name: 'Glas',          burn: 1,  kind: 'zwischen' },
  draht:      { name: 'Kupferdraht',   burn: 1,  kind: 'zwischen' },
  werkzeug:   { name: 'Werkzeug',      burn: 2,  kind: 'zwischen' },
  stahl:      { name: 'Stahlbarren',   burn: 1,  kind: 'zwischen' },
  graphit:    { name: 'Graphit',       burn: 8,  kind: 'zwischen' },
  silizium:   { name: 'Silizium',      burn: 1,  kind: 'zwischen' },
  chip:       { name: 'Mikrochip',     burn: 1,  kind: 'end' },
  teer:       { name: 'Teer',          burn: 20, kind: 'zwischen' },
  kunststoff: { name: 'Kunststoff',    burn: 3,  kind: 'zwischen' },
  schmiermittel: { name: 'Schmiermittel', burn: 3, kind: 'zwischen' },
  neodym:     { name: 'Neodym',        burn: 1,  kind: 'zwischen' },
  magnet:     { name: 'Supermagnet',   burn: 1,  kind: 'end' },
  // Fässer: Flüssigkeiten als Items (Abfüllanlage/Entleerer, data/recipes.js); fluid = Inhalt (Farbe des Bands am Symbol)
  fass:        { name: 'Leeres Fass',  burn: 1,  kind: 'zwischen' },
  fass_wasser: { name: 'Wasserfass',   burn: 1,  kind: 'zwischen', fluid: 'wasser' },
  fass_rohoel: { name: 'Ölfass',       burn: 1,  kind: 'zwischen', fluid: 'rohoel' },
  fass_saeure: { name: 'Säurefass',    burn: 1,  kind: 'zwischen', fluid: 'saeure' },
  raeucherfisch: { name: 'Räucherfisch', burn: 2, kind: 'nahrung' },   // Räucherei (Freischaltung bei Ole)
  // Waren der Völker (Version 17): nur bei Ole, Brann oder Aurel zu kaufen, kein Rezept stellt sie her (Preise: data/npctrade.js NPC_GOODS)
  seil:       { name: 'Seil',          burn: 2,  kind: 'zwischen', npc: 'ole' },
  netz:       { name: 'Fischernetz',   burn: 2,  kind: 'zwischen', npc: 'ole' },
  zahnrad:    { name: 'Zahnrad',       burn: 1,  kind: 'zwischen', npc: 'brann' },
  feder:      { name: 'Feder',         burn: 1,  kind: 'zwischen', npc: 'brann' },
  rohrteil:   { name: 'Rohrstück',     burn: 1,  kind: 'zwischen', npc: 'brann' },
  uhrwerk:    { name: 'Uhrwerk',       burn: 1,  kind: 'end', npc: 'aurel' },
  zelle:      { name: 'Batteriezelle', burn: 1,  kind: 'end', npc: 'aurel' },
  perle:      { name: 'Perle',         burn: 1,  kind: 'end' },   // kauft Aurel; Quelle: Tauchgänge (data/dive.js), später Meerjungfrauen
  // Taucherglocke (0.19.0): Schrott aus Tauchgängen (kauft Brann), Teile der Glocke (bell: nur einmal gebraucht, Montage in der Werft, data/dive.js)
  schrott:     { name: 'Schrott',      burn: 1,  kind: 'roh' },
  glockenseil: { name: 'Glockenseil',  burn: 2,  kind: 'end', npc: 'ole', bell: true },
  glockenhaube: { name: 'Messingglocke mit Bullauge', burn: 1, kind: 'end', npc: 'brann', bell: true },
  skizze:     { name: 'Skizze',        burn: 1,  kind: 'plan' },
  bauplan:    { name: 'Bauplan',       burn: 1,  kind: 'plan' },
  schaltplan: { name: 'Schaltplan',    burn: 1,  kind: 'plan' },
  // End-Relikte (0.23.0, Platzhalter): je nach Ende eins im Lager der Heimatinsel; Wirkung kommt mit dem Relikt-System (docs/SYSTEMS.md 8)
  erste_flamme: { name: 'Die erste Flamme',        burn: 0, kind: 'relikt', tier: 'legendär', end: 'a' },
  krone:        { name: 'Die Krone des Herrschers', burn: 0, kind: 'relikt', tier: 'legendär', end: 'b' }
};
export const ITEM_ORDER = Object.keys(ITEMS);
export const PLAN_ITEMS = ITEM_ORDER.filter(it => ITEMS[it].kind === 'plan');
export const isPlan = (it) => !!ITEMS[it] && ITEMS[it].kind === 'plan';
// Name eines Items oder einer Flüssigkeit
export const resName = (it) => ITEMS[it] ? ITEMS[it].name : FLUIDS[it] ? FLUIDS[it].name : it;

// Vorkommen (Index = Wert im Boden-Layer „ore“, Reihenfolge nie ändern). item = was ein Bohrer dort fördert (null = nicht mit dem Bohrer).
// rank = Vorrang bei Gleichstand unter einem Bohrer (höher = seltener = gewinnt), siehe data/mining.js.
// quarz liegt auf jedem Sand-/Strandfeld und steht nicht im Layer (siehe oreAt in world/world.js).
// Farben der Erzbrocken stehen in gfx/ground.js (ORE_RAMP), Rohöl wird als Fleck gezeichnet.
export const ORES = [
  null,
  { id: 'kohle',     name: 'Kohle',      item: 'kohle',     rank: 3 },
  { id: 'eisenerz',  name: 'Eisenerz',   item: 'eisenerz',  rank: 4 },
  { id: 'kupfererz', name: 'Kupfererz',  item: 'kupfererz', rank: 5 },
  { id: 'kalk',      name: 'Kalkstein',  item: 'kalk',      rank: 2 },
  { id: 'schwefel',  name: 'Schwefel',   item: 'schwefel',  rank: 6 },
  { id: 'oel',       name: 'Rohöl',      item: null,        rank: 0, why: 'Öl fördert nur eine Saugpumpe (Flüssigkeiten)' },
  { id: 'neodym',    name: 'Neodym-Erz', item: 'neodymerz', rank: 7 },
  { id: 'quarz',     name: 'Quarzsand',  item: 'quarz',     rank: 1 }
];
export const ORE_IDX = Object.fromEntries(ORES.filter(Boolean).map((o, i) => [o.id, i + 1]));
export const ORE_ITEM = ORES.map(o => o ? o.item : null);
export const ORE_OIL = ORE_IDX.oel, ORE_QUARZ = ORE_IDX.quarz;
