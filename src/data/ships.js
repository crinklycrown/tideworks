/* =========================================================
   SCHIFFSARTEN (sim/ships.js, Werft im Info-Panel)
   holds = Laderäume, holdCap = Platz je Laderaum, speed = Felder/s, reveal = aufgedeckter Radius (Felder),
   cost = Baukosten aus dem Inselinventar, tech = nötige Forschung (andere Quellen: data/unlocks.js, z. B. 'ship:kogge'), upHolds = Laderaum-Upgrades (data/tech.js holds/holdCap) wirken.
   „Bessere Segel“ (shipSpeed) wirkt auf alle Arten.
   ========================================================= */
export const SHIP_KINDS = {
  fracht:    { name: 'Frachtschiff', pl: 'Frachtschiffe', holds: 3, holdCap: 40, speed: 4, reveal: 14, cost: { holz: 80, eisen: 20 }, upHolds: true,
               desc: 'Bauchiges Handelsschiff mit 3 Laderäumen für Handelsrouten.' },
  entdecker: { name: 'Entdecker', pl: 'Entdecker', holds: 1, holdCap: 40, speed: 6, reveal: 64, cost: { holz: 60, eisen: 10, glas: 5 }, tech: 'kartografie',
               desc: 'Schlanker Segler mit Krähennest: schnell, sieht weit und erkundet auf Wunsch selbst. Ein Laderaum, genug für 40 Holz zum Kontor gründen.' },
  // Version 17: Freischaltung bei Brann (data/unlocks.js 'ship:kogge'), Seile und Zahnräder gibt es bei Ole und Brann
  kogge:     { name: 'Kogge', pl: 'Koggen', holds: 5, holdCap: 40, speed: 3, reveal: 16, cost: { holz: 160, eisen: 40, seil: 20, zahnrad: 10 }, upHolds: true,
               desc: 'Breiter Zweimaster von Brann: 5 Laderäume, aber langsamer als das Frachtschiff.' }
};
export const SHIP_ORDER = Object.keys(SHIP_KINDS);
export const shipKind = (s) => SHIP_KINDS[s && s.kind] || SHIP_KINDS.fracht;
// Selbst erkunden: Ziel = Rand des Nebels mit kleinster Wertung (Abstand zum Schiff + home × Abstand zur Heimatinsel).
// Gesucht wird in einem Kreis um die Heimatinsel: Radius start, wächst um step, wenn darin kein erreichbarer Rand liegt,
// nie über die Reichweite des Schiffs (ranges, Felder; Standard def). tries = A*-Versuche je Suche (beste Kandidaten zuerst),
// retry = Pause nach einer erfolglosen Suche (s), homeRetry = Pause, wenn alles in Reichweite erkundet ist.
// hop = Mindestabstand (Felder) eines Ziels vom Schiff: nähere Ränder bekommen 4 × hop Aufschlag auf die Wertung (sonst tastet er sich
// in kleinen Schritten an Küsten entlang). Version 18: Aufdeck-Radius 40 → 64, hop 64, home 2 → 0 (zieht nicht mehr zur Heimatinsel zurück,
// fährt also gerade nach außen bis zum Suchkreis), Suchkreis und Reichweiten größer. Gemessen (NOTES.md): in 15 min etwa 2,3-mal so viel aufgedeckt und 1,8-mal so weit draußen wie vorher.
export const EXPLORE = { start: 450, step: 250, home: 0, hop: 64, ranges: { nah: 900, mittel: 1500, weit: 2400 }, def: 'mittel', tries: 6, retry: 8, homeRetry: 30 };
export const EXPLORE_RANGE_NAME = { nah: 'Nah', mittel: 'Mittel', weit: 'Weit' };
