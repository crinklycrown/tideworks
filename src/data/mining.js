/* =========================================================
   ABBAU UND HÄUSER: alle Zahlen zum Nachjustieren
   ========================================================= */

// Bohrer: rate = Förderung je Feld des geförderten Vorkommens (Items/s), power = Strom/s (ohne Strom Stillstand), buf = Ausgabepuffer.
// Mehrheitsregel (sim/buildings.js drillInfo): gefördert wird das Vorkommen mit den meisten Feldern unter dem Bohrer,
// bei Gleichstand das seltenere (rank in ORES, data/items.js). Quarzsand zählt nur, wenn kein anderes Vorkommen darunter liegt.
// water = Kühlwasser/s aus dem Rohrnetz (ohne Wasser Stillstand), noOil = darf nicht auf Öl stehen,
// lube = Schmiermittel vom Band: { it, every (s Betrieb je Stück), buf (Puffer), opt (ohne läuft er auch), boost (+Leistung, solange geschmiert) }
export const DRILLS = {
  bohrer:      { rate: 0.08, power: 0, buf: 10 },
  bohrer2:     { rate: 0.2,  power: 4, buf: 10, lube: { it: 'schmiermittel', every: 60, buf: 5, opt: true, boost: 0.5 } },
  multibohrer: { rate: 0.3,  power: 10, buf: 10, water: 5, noOil: true, lube: { it: 'schmiermittel', every: 30, buf: 5 } }
};

// Sägewerk und Fischerhütte (unverändert)
export const SAW = { rate: 0.1, buf: 20, plant: 2.5 };          // Holz/s je reifem Baum, Ausgabepuffer, Sekunden je Setzling
export const FISHER = { perWater: 0.025, max: 0.3, buf: 10 };   // Fisch/s je Wasserfeld, höchstens, Ausgabepuffer

// Häuser: alle `every` Sekunden wird der Bedarf aus dem Lager der Insel genommen; gedeckt → 1 Plan (gives) ins Lager.
export const HOUSE_EVERY = 60;
export const HOUSES = {
  huette:  { pop: 2, need: { fisch: 2, holz: 1 },                gives: 'skizze' },
  buerger: { pop: 4, need: { fisch: 2, werkzeug: 1, glas: 1 },   gives: 'bauplan' },
  ingenieur: { pop: 6, need: { fisch: 3, kunststoff: 1, chip: 1 }, gives: 'schaltplan' }
};

// Ruhm (früher XP): je abgeschlossener Forschung Stufe × FAME_TECH, je erreichtem Ziel FAME_GOAL
export const FAME_TECH = 50, FAME_GOAL = 30;
