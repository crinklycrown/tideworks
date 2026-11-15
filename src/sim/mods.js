/* =========================================================
   WIRKUNGEN DER UPGRADES: mods(g)
   Alle dauerhaften Wirkungen der erforschten Upgrades (effect in data/tech.js) werden hier zu einem
   Objekt zusammengefasst. Simulation und Oberfläche lesen Werte, die Upgrades verändern können,
   nur über mods(g) – neue Upgrades sind damit reine Daten.
   Berechnet wird einmal je Forschungsänderung (gecacht am Spielkontext: gleicher Zustand,
   gleiche Zahl erforschter Einträge). Getrennte Inseln: mods(g, pid) je Spieler (eigene Forschung und Leuchtturm-Phase,
   Zwischenspeicher je Spieler); für Gebäude und Schiffe gilt der Besitzer. Ohne pid: Spieler des laufenden Kommandos bzw. Host,
   auf dem Spiegel der eigene Spieler (dort stehen ohnehin nur die eigenen Werte). Kein DOM-Zugriff.
   ========================================================= */
import { BAT_CAP, GEN_CAP } from '../config.js';
import { HOUSE_EVERY, DRILLS } from '../data/mining.js';
import { BD, STORE_CAP, BELT_BRIDGE, EXTRACT } from '../data/buildings.js';
import { shipKind } from '../data/ships.js';
import { TECH } from '../data/tech.js';
import { WONDER } from '../data/wonder.js';
import { DRONES, DKISTE } from '../data/drones.js';
import { pst, isSep, actor, ownerOf } from './state.js';

// Gruppen in rate: { drill: … } gilt für alle Bohrer
const GROUPS = { drill: Object.keys(DRILLS) };

function base() {
  return {
    cap: Object.assign({}, STORE_CAP),                 // Platz je Ware (Hauptkontor, Lagerkiste, Handelskontor)
    store: { batterie: BAT_CAP, verbrennung: GEN_CAP, kraftwerk: GEN_CAP, geothermie: GEN_CAP }, // Stromspeicher je Gebäude
    rate: {},                                          // Leistungsfaktor je Gebäudetyp (fehlt = 1)
    power: {},                                         // Faktor der Stromerzeugung je Gebäudetyp (fehlt = 1)
    holds: 0, holdCap: 0, shipSpeed: 1,                // Laderäume und Platz je Raum zusätzlich (nur Frachtschiffe), Tempo-Faktor (alle Schiffe)
    treeGrow: 1,                                       // Faktor des Baumwachstums
    houseEvery: HOUSE_EVERY,                           // Sekunden zwischen zwei Prüfungen eines Hauses
    tradePrice: 0, tradeFreq: 0,                       // Ankaufpreise +f, Händler kommen +f öfter
    drones: DRONES.per,                                // Drohnen je Drohnenhafen
    reveal: 1, prod: 1, powerAll: 1, evWarn: 0, beam: false   // Weltenleuchtturm (data/wonder.js)
  };
}
const addTo = (o, add, mult) => { for (const k in add) for (const t of GROUPS[k] || [k]) o[t] = (o[t] != null ? o[t] : mult ? 1 : 0) + add[k]; };
// Wirkungen aller erforschten Upgrades und der fertigen Phasen des Weltenleuchtturms (ph = Zahl der fertigen Phasen)
export function computeMods(tech, ph) {
  const M = base();
  const list = TECH.filter(T => T.effect && tech[T.id]).map(T => T.effect).concat(WONDER.phases.slice(0, ph || 0).map(P => P.effect));
  for (const e of list) {
    if (e.cap) addTo(M.cap, e.cap);
    if (e.store) addTo(M.store, e.store);
    if (e.rate) addTo(M.rate, e.rate, true);
    if (e.power) addTo(M.power, e.power, true);
    if (e.holds) M.holds += e.holds;
    if (e.holdCap) M.holdCap += e.holdCap;
    if (e.shipSpeed) M.shipSpeed += e.shipSpeed;
    if (e.treeGrow) M.treeGrow += e.treeGrow;
    if (e.houseEvery) M.houseEvery = Math.max(5, M.houseEvery + e.houseEvery);
    if (e.tradePrice) M.tradePrice += e.tradePrice;
    if (e.tradeFreq) M.tradeFreq += e.tradeFreq;
    if (e.drones) M.drones += e.drones;
    if (e.reveal) M.reveal += e.reveal;
    if (e.prod) M.prod += e.prod;
    if (e.powerAll) M.powerAll += e.powerAll;
    if (e.evWarn) M.evWarn += e.evWarn;
    if (e.beam) M.beam = true;
  }
  return M;
}
export function mods(g, pid) {
  if (isSep(g) && !g.mirror) {
    pid = pid || actor(g);
    const P = pst(g, pid), cache = g._modsP || (g._modsP = new Map()), n = Object.keys(P.tech).length * 8 + (P.wonder ? P.wonder.ph | 0 : 0), c = cache.get(pid);
    if (c && c.st === P && c.n === n) return c.m;
    const e = { st: P, n, m: computeMods(P.tech, P.wonder ? P.wonder.ph | 0 : 0) };
    cache.set(pid, e);
    return e.m;
  }
  const st = g.state, tech = st ? st.tech : null, ph = st && st.wonder ? st.wonder.ph | 0 : 0, n = (tech ? Object.keys(tech).length : 0) * 8 + ph, c = g._mods;
  if (c && c.st === st && c.n === n) return c.m;
  g._mods = { st, n, m: computeMods(tech || {}, ph) };
  return g._mods.m;
}
// Die folgenden Abfragen nehmen den Spieler (pid) oder bei Gebäuden/Schiffen deren Besitzer.
// Leistung (Bohrer, Fischer …) inklusive Leuchtturm-Bonus für Produktionsgebäude
export const rateOf = (g, t, pid) => { const M = mods(g, pid); return (M.rate[t] || 1) * M.prod; };
export const prodOf = (g, pid) => mods(g, pid).prod;
export const storeOf = (g, t, pid) => mods(g, pid).store[t] || 0;
// Stromerzeugung je Generator inklusive Leuchtturm-Bonus (alle Generatoren)
export const powerOf = (g, t, pid) => { const M = mods(g, pid); return (M.power[t] || 1) * M.powerAll; };
// Schiffe je Art (data/ships.js): Laderäume, Platz je Laderaum, Tempo (Felder/s) – mit den Upgrades des Besitzers
export const holdsOf = (g, s) => { const K = shipKind(s); return K.holds + (K.upHolds ? mods(g, ownerOf(s)).holds : 0); };
export const holdCapOf = (g, s) => { const K = shipKind(s); return K.holdCap + (K.upHolds ? mods(g, ownerOf(s)).holdCap : 0); };
export const speedOf = (g, s) => shipKind(s).speed * mods(g, ownerOf(s)).shipSpeed;

// Beschreibung eines Gebäudes mit den Werten inklusive Upgrades (Platzhalter in BD[t].desc, data/buildings.js):
// {cap:kontor}, {store:batterie}, {house}, {rate:<Gebäude>:<Grundwert>}, {power:<Gebäude>:<Grundwert>}, {bb:<Feld>} (Brückenband), {ex:building} (Extraktor)
const num = (v) => (Math.round(v * 1000) / 1000).toString().replace('.', ',');
export function descOf(g, t) {
  const M = mods(g);
  return (BD[t].desc || '').replace(/\{(\w+)(?::(\w+))?(?::([\d.]+))?\}/g, (all, kind, key, v) =>
    kind === 'cap' ? num(M.cap[key] || 0) : kind === 'store' ? num(M.store[key] || 0) : kind === 'house' ? num(M.houseEvery)
      : kind === 'rate' ? num(+v * (M.rate[key] || 1) * M.prod) : kind === 'power' ? num(+v * (M.power[key] || 1) * M.powerAll)
      : kind === 'dr' ? num(key === 'n' ? M.drones : key === 'r' ? DRONES.radius : key === 'st' ? DRONES.stack : key === 'sp' ? DRONES.speed : DRONES.power)
      : kind === 'dk' ? num(DKISTE[key])
      : kind === 'bb' ? num(BELT_BRIDGE[key]) : kind === 'ex' ? num(EXTRACT[key]) : all);
}

// Wirkung als Text (Tooltips, Detailspalte)
const pct = (f) => `${f > 0 ? '+' : ''}${Math.round(f * 100)} %`;
const bname = (t) => t === 'drill' ? 'alle Bohrer' : BD[t] ? BD[t].name : t;
export function effectLines(e) {
  if (!e) return [];
  const out = [];
  for (const t in e.cap || {}) out.push(`${bname(t)} +${e.cap[t]} je Ware`);
  for (const t in e.store || {}) out.push(`${bname(t)} +${e.store[t]} Speicher`);
  for (const t in e.rate || {}) out.push(`${bname(t)} ${pct(e.rate[t])} Leistung`);
  for (const t in e.power || {}) out.push(`${bname(t)} ${pct(e.power[t])} Strom`);
  if (e.holds) out.push(`+${e.holds} Laderaum je Frachtschiff`);
  if (e.holdCap) out.push(`+${e.holdCap} je Laderaum (Frachtschiffe)`);
  if (e.shipSpeed) out.push(`Schiffe ${pct(e.shipSpeed)} schneller`);
  if (e.treeGrow) out.push(`Bäume wachsen ${pct(e.treeGrow)} schneller`);
  if (e.houseEvery) out.push(`Häuser prüfen alle ${HOUSE_EVERY + e.houseEvery} s statt ${HOUSE_EVERY} s`);
  if (e.tradePrice) out.push(`Ankaufpreise der Händler ${pct(e.tradePrice)}`);
  if (e.tradeFreq) out.push(`Händler kommen ${pct(e.tradeFreq)} öfter`);
  if (e.drones) out.push(`+${e.drones} Drohnen je Drohnenhafen`);
  if (e.reveal) out.push(`Aufdeck-Radius aller Schiffe ${pct(e.reveal)}`);
  if (e.prod) out.push(`Alle Produktionsgebäude ${pct(e.prod)} Tempo`);
  if (e.powerAll) out.push(`Stromerzeugung aller Generatoren ${pct(e.powerAll)}`);
  if (e.evWarn) out.push(`Ereignisse ${e.evWarn} s früher angekündigt`);
  if (e.beam) out.push('Lichtstrahl über der Karte');
  return out;
}
