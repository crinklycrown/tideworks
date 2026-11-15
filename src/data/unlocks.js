/* =========================================================
   FREISCHALTUNGEN (seit Version 15)
   Jedes Gebäude, jede Schiffsart und jedes Rezept hat genau eine Freischalt-Quelle:
     start – von Anfang an: kein Eintrag hier und kein tech
     tech  – Forschung: steht wie bisher als tech am Gebäude (data/buildings.js), an der Schiffsart (data/ships.js)
             oder am Rezept (data/recipes.js), damit Skilltree und check:tree unverändert damit arbeiten
     npc   – bei einem Volk ab einer Rufstufe: { src: 'npc', npc, lvl }
     story – durch die Geschichte: { src: 'story', hint } (hint = wann, nur für die Anzeige)
   Ein Eintrag in UNLOCKS und ein tech gleichzeitig ist ein Fehler (unlockErrors, npm run check:tree).
   Schlüssel: Gebäudetyp | 'ship:<Art>' | 'rc:<Rezept-ID>' | 'gruenden' (Kontor gründen per Schiff) | 'plan:<PLANS-ID>' | WERFT_SLOTS-Schlüssel ('glocke')
   Freigeschaltet wird über unlock(g, key, src) in sim/unlocks.js (Ruf in Thread 4, Story in Thread 3);
   gesetzt wird state.unl[key] (gehört zur Welt, nicht zu einem Spieler).
   Getrennte Inseln laufen vorerst ohne Story: Quelle npc gilt dort als frei, Pläne sind keine Voraussetzung,
   Quelle story bleibt gesperrt (kein Weltenleuchtturm), Forschungen mit early sind von Anfang an erforscht.
   ========================================================= */
import { BD } from './buildings.js';
import { SHIP_KINDS } from './ships.js';
import { RECIPE_BY_ID } from './recipes.js';
import { TECH, TECH_BY_ID } from './tech.js';
import { REP_LEVELS } from './npctrade.js';

// Völker. Rufstufen (aufsteigend) aus data/npctrade.js; ab Version 17 schaltet das Erreichen der Stufe die Einträge
// unten automatisch frei (sim/npc.js), Pläne kauft man beim Volk (Preise in data/npctrade.js PLAN_PRICE).
export const NPCS = { ole: { name: 'Ole' }, brann: { name: 'Brann' }, aurel: { name: 'Aurel' }, rat: { name: 'Inselrat' } };   // rat: Handelspartner nach Ende A (0.23.0)
export const REP_LVLS = REP_LEVELS.map(L => L.id);

export const UNLOCKS = {
  // Ole: Kontore auf weiteren Inseln, Räucherei
  gruenden:    { src: 'npc', npc: 'ole',   lvl: 'neutral',    name: 'Kontor gründen' },
  raeucherei:  { src: 'npc', npc: 'ole',   lvl: 'freundlich' },
  // Brann: Logistik-Teile ohne Forschung
  ueberlauf:   { src: 'npc', npc: 'brann', lvl: 'neutral' },
  bandbruecke: { src: 'npc', npc: 'brann', lvl: 'neutral' },
  sortierer:   { src: 'npc', npc: 'brann', lvl: 'freundlich' },
  tor:         { src: 'npc', npc: 'brann', lvl: 'freundlich' },
  'ship:kogge': { src: 'npc', npc: 'brann', lvl: 'freundlich' },
  // Reliktsockel (0.24.0): der gewöhnliche über die Forschung „Reliktkunde“ (Akt 2), der seltene bei Brann, der legendäre bei Aurel
  sockel2:     { src: 'npc', npc: 'brann', lvl: 'vertraut' },
  sockel3:     { src: 'npc', npc: 'aurel', lvl: 'vertraut' },
  // Story
  leuchtturm:  { src: 'story', hint: 'Akt 2' },
  // Bauplan Taucherglocke (Ende Akt 2, cs_licht_im_wind). Gebaut wird sie in der Werft (sim/dive.js mountBell), im Baumenü steht ein Feld (WERFT_SLOTS)
  glocke:      { src: 'story', hint: 'Akt 3', name: 'Bauplan Taucherglocke' }
};
// Felder im Baumenü für Dinge, die nicht auf die Karte gesetzt, sondern in der Werft gebaut werden (0.19.0: Taucherglocke,
// ersetzt den Platzhalter SOON aus 0.18.0). Klick wählt die Werft aus. Schlüssel → { name, cat }
export const WERFT_SLOTS = { glocke: { name: 'Taucherglocke', cat: 'schifffahrt' } };
// Pläne: Voraussetzung einer Forschung (TECH[].plan), gekauft bei einem Volk. Ein Flag in state.unl ('plan:<id>'), keine Ware.
export const PLANS = {
  brann_schnellband: { npc: 'brann', lvl: 'freundlich', name: 'Schnellbänder' },
  brann_dampf:       { npc: 'brann', lvl: 'freundlich', name: 'Dampfkraft' },
  brann_druck:       { npc: 'brann', lvl: 'vertraut',   name: 'Druckleitungen' },
  aurel_akkus:       { npc: 'aurel', lvl: 'freundlich', name: 'Bessere Akkus' },
  aurel_kessel:      { npc: 'aurel', lvl: 'freundlich', name: 'Kesseltechnik' },
  aurel_geo:         { npc: 'aurel', lvl: 'vertraut',   name: 'Geothermie' },
  aurel_ingenieur:   { npc: 'aurel', lvl: 'vertraut',   name: 'Ingenieurwesen' }
};
// Alle Schlüssel, die unlock() setzen kann
export const UNLOCK_KEYS = [...Object.keys(UNLOCKS), ...Object.keys(PLANS).map(p => 'plan:' + p)];

// Forschung eines Schlüssels (oder undefined)
function techOf(key) {
  if (key.startsWith('ship:')) { const K = SHIP_KINDS[key.slice(5)]; return K && K.tech; }
  if (key.startsWith('rc:')) { const R = RECIPE_BY_ID[key.slice(3)]; return R && R.tech; }
  return BD[key] && BD[key].tech;
}
const START = Object.freeze({ src: 'start' });
// Quelle eines Schlüssels: { src: 'start' | 'tech' (id) | 'npc' (npc, lvl) | 'story' (hint) }
export function srcOf(key) {
  if (UNLOCKS[key]) return UNLOCKS[key];
  if (key.startsWith('plan:')) { const P = PLANS[key.slice(5)]; return P ? { src: 'npc', npc: P.npc, lvl: P.lvl } : START; }
  const t = techOf(key);
  return t ? { src: 'tech', id: t } : START;
}
// Anzeigename eines Schlüssels
export function unlockName(key) {
  if (UNLOCKS[key] && UNLOCKS[key].name) return UNLOCKS[key].name;
  if (key.startsWith('plan:')) { const P = PLANS[key.slice(5)]; return P ? `Plan: ${P.name}` : key; }
  if (key.startsWith('ship:')) { const K = SHIP_KINDS[key.slice(5)]; return K ? K.name : key; }
  if (key.startsWith('rc:')) { const R = RECIPE_BY_ID[key.slice(3)]; return R ? `Rezept ${R.name || R.id}` : key; }
  return BD[key] ? BD[key].name : key;
}
const techLabel = (id) => TECH_BY_ID[id] ? TECH_BY_ID[id].name : id;
// Kurzer Hinweis, woher etwas kommt (Baumenü, Skilltree): „Forschung: Ofenbau“, „Bei Brann erhältlich“, „Story“
export function lockHint(key) {
  const S = srcOf(key);
  if (S.src === 'tech') return `Forschung: ${techLabel(S.id)}`;
  if (S.src === 'npc') return `Bei ${NPCS[S.npc].name} erhältlich`;
  if (S.src === 'story') return 'Story';
  return '';
}
// Satz für Fehlermeldungen (Simulation): „Noch nicht erforscht (Ofenbau).“
export function lockReason(key) {
  const S = srcOf(key);
  if (S.src === 'tech') return `Noch nicht erforscht (${techLabel(S.id)}).`;
  if (S.src === 'npc') return `Bei ${NPCS[S.npc].name} erhältlich (Ruf: ${S.lvl}).`;
  if (S.src === 'story') return `Folgt in der Geschichte${S.hint ? ` (${S.hint})` : ''}.`;
  return '';
}
// Plan einer Forschung als Text: „Plan von Brann“
export const planText = (T) => T.plan && PLANS[T.plan] ? `Plan von ${NPCS[PLANS[T.plan].npc].name}` : '';

// Prüfung der Tabellen: doppelte Quellen und ungültige Verweise. Liefert eine Liste von Fehlern (leer = gut).
export function unlockErrors() {
  const err = [];
  for (const key in UNLOCKS) {
    const U = UNLOCKS[key];
    if (key !== 'gruenden' && !WERFT_SLOTS[key] && !BD[key] && !(key.startsWith('ship:') && SHIP_KINDS[key.slice(5)]) && !(key.startsWith('rc:') && RECIPE_BY_ID[key.slice(3)])) err.push(`Freischaltung ${key}: unbekannter Schlüssel`);
    if (techOf(key)) err.push(`Freischaltung ${key}: hat schon die Forschung ${techOf(key)} (doppelte Quelle)`);
    if (BD[key] && BD[key].fixed) err.push(`Freischaltung ${key}: fest platziertes Gebäude`);
    if (!['npc', 'story'].includes(U.src)) err.push(`Freischaltung ${key}: unbekannte Quelle ${U.src}`);
    if (U.src === 'npc' && (!NPCS[U.npc] || !REP_LVLS.includes(U.lvl))) err.push(`Freischaltung ${key}: Volk oder Rufstufe ungültig`);
  }
  for (const id in PLANS) if (!NPCS[PLANS[id].npc] || !REP_LVLS.includes(PLANS[id].lvl)) err.push(`Plan ${id}: Volk oder Rufstufe ungültig`);
  const used = new Set();
  for (const T of TECH) if (T.plan) {
    if (!PLANS[T.plan]) err.push(`Forschung ${T.id}: Plan ${T.plan} fehlt`);
    if (used.has(T.plan)) err.push(`Plan ${T.plan}: an mehreren Forschungen`);
    used.add(T.plan);
  }
  for (const id in PLANS) if (!used.has(id)) err.push(`Plan ${id}: keine Forschung verlangt ihn`);
  return err;
}
{ const e = unlockErrors(); if (e.length) console.warn('Freischaltungen:', e.join('; ')); }
