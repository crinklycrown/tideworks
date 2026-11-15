/* =========================================================
   DROHNEN (sim/drones.js): Drohnenhafen und Drohnenkisten
   Drohnen fliegen Waren nur zwischen Drohnenkisten im Radius ihres Hafens (gleiche Insel) und reparieren
   beschädigte Gebäude im Radius, wenn die Reparaturkosten im Inselinventar liegen.
   per = Drohnen je Hafen (plus Upgrades und Leuchtturm, mods(g).drones), radius = Arbeitsradius (Felder, Abstand der Grundflächen),
   speed = Felder/s, stack = Stück je Flug, power = Strom/s Grundlast, perFlying = Strom/s je fliegender Drohne,
   every = Sekunden zwischen zwei Auftragsvergaben, repair = Sekunden Arbeit am Gebäude.
   ========================================================= */
export const DRONES = { per: 4, radius: 20, speed: 6, stack: 10, power: 2, perFlying: 1, every: 0.5, repair: 2 };
// Drohnenkiste: buf = Platz im Anbieten-Modus (alle Waren zusammen), reqMax = höchste Zielmenge im Anfordern-Modus
export const DKISTE = { buf: 50, reqMax: 200 };
