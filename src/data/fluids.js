/* =========================================================
   FLÜSSIGKEITEN, ROHRE, PUMPEN, KRAFTWERKE: alle Zahlen zum Nachjustieren
   Flüssigkeiten werden in Einheiten gemessen, liegen nur in Rohrnetzen, Tanks und Gebäudepuffern,
   kommen nicht ins Lager-Netzwerk. Verschifft werden sie in Fässern (Items, Abfüllanlage und Entleerer in data/recipes.js).
   Logik in sim/fluids.js (Rohrebene, Netze, Austausch) und sim/production.js (Gebäude).
   ========================================================= */

// col = Farbe im Rohr, hi = Glanzlicht, dk = dunkler Rand (Symbol, Tank-Füllstand)
export const FLUIDS = {
  wasser: { name: 'Wasser',        col: '#6ec8f0', hi: '#d8f4ff', dk: '#2a7ab0' },
  rohoel: { name: 'Rohöl',         col: '#2e2018', hi: '#8a6a48', dk: '#100a06' },
  saeure: { name: 'Schwefelsäure', col: '#c8e040', hi: '#f4ffb0', dk: '#6a8a14' }
};
export const FLUID_ORDER = Object.keys(FLUIDS);
export const isFluid = (f) => !!FLUIDS[f];
export const ACID = 'saeure';       // braucht säurefeste Rohre (Mk3)

// Rohre: Stufe, Durchsatz (Einheiten/s), säurefest. Ein Netz läuft so schnell wie sein langsamstes Rohr.
export const PIPES = {
  rohr:  { tier: 1, rate: 20 },
  rohr2: { tier: 2, rate: 50 },
  rohr3: { tier: 3, rate: 100, acid: true }
};
export const PIPE_BY_TIER = Object.fromEntries(Object.entries(PIPES).map(([t, P]) => [P.tier, t]));
export const PIPE_CAP = 10;          // Speicher je Rohrfeld
export const TANK_CAP = 500;         // Speicher je Tank (zählt zum angeschlossenen Netz)
export const NET_RATE_FREE = 100;    // Durchsatz eines Netzes ganz ohne Rohre (nur Tanks)
export const FLUID_BUF = 2;          // Gebäudepuffer = FLUID_BUF × Rezeptmenge bzw. × Bedarf/Leistung pro Sekunde

// Pumpen: out = geförderte Flüssigkeit, rate = Einheiten/s (Saugpumpe: perTile je Ölfeld, höchstens max), power = Strom/s (nötig)
export const PUMPS = {
  pumpe:     { out: 'wasser', rate: 10, power: 0 },
  saugpumpe: { out: 'rohoel', perTile: 1.25, max: 5, power: 2 }
};

// Dampfkraftwerk: power = Strom/s (× mods(g).power.kraftwerk), burn = Brennwert/s, water = Wasser/s,
// buf = Brennstoff-Puffer (Items), fuelMin = kleinster Brennwert, den es vom Band annimmt (Holz 4, Kohle 12, Teer 20 …)
export const KRAFTWERK = { power: 12, burn: 2.4, water: 5, buf: 10, fuelMin: 4 };
// Geothermie-Generator: power = Strom/s ohne Verbrauch, lava = mindestens so viele Lavafelder unter der Grundfläche
export const GEOTHERMIE = { power: 30, lava: 2 };

// Gebäude, die an Rohrnetze angeschlossen werden (Rohre verbinden sich mit ihnen; Bau und Abriss berechnen die Netze neu)
export const FLUID_BUILDINGS = new Set(['pumpe', 'saugpumpe', 'tank', 'kraftwerk', 'reaktor', 'multibohrer', 'abfueller', 'entleerer']);
