/* =========================================================
   FUNDE AUF SEE: Treibgut und Wracks
   Je Fund-Zelle (config.js FIND_CELL × FIND_CELL Felder) entstehen aus Seed und Zelle
   0–2 Treibgut (Gewichte in FIND_SPAWN.drift) und mit FIND_SPAWN.wreck ein Wrack,
   nur auf Meeresfeldern mit mindestens FIND_COAST Feldern Abstand zur Küste (world/finds.js).
   Inhalt je Art und Ring (Ring = Entfernung zum Spawn wie bei den Inseln, data/islands.js):
     items = mögliche Waren, kinds = so viele verschiedene davon, min/max = Menge je Ware.
     bonus = zusätzliche Ware mit Wahrscheinlichkeit chance (Menge min–max), z. B. Pläne in Wracks weiter draußen;
             auch eine Liste solcher Einträge (jeder wird für sich gewürfelt).
   Neue Waren hier eintragen; sie brauchen einen Eintrag in data/items.js.
   ========================================================= */
export const FIND_SPAWN = { drift: [0.45, 0.4, 0.15], wreck: 0.15 };

const RAW = ['holz', 'eisenerz', 'kohle', 'kalk'];
const BARS = ['eisen', 'kupfer', 'werkzeug'];
export const FIND_LOOT = {
  //        Ring 0                                       Ring 1                                       Ring 2                                       Ring 3
  drift: [{ items: RAW, kinds: 1, min: 10, max: 30 }, { items: RAW, kinds: 1, min: 15, max: 35 }, { items: RAW, kinds: 1, min: 20, max: 40 }, { items: RAW, kinds: 2, min: 20, max: 40 }],
  wreck: [{ items: BARS, kinds: 1, min: 20, max: 40 }, { items: BARS, kinds: 1, min: 20, max: 40 },
          { items: BARS, kinds: 2, min: 30, max: 50, bonus: { it: 'skizze', chance: 0.3, min: 2, max: 5 } },
          { items: BARS, kinds: 2, min: 40, max: 60, bonus: [{ it: 'bauplan', chance: 0.3, min: 1, max: 3 }, { it: 'schaltplan', chance: 0.15, min: 1, max: 2 }] }]
};
export const FIND_NAME = { drift: 'Treibgut', wreck: 'Wrack', jet: 'Ladung' };   // jet = über Bord geworfene Ladung (sim/ships.js jettison)
