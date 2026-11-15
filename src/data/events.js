/* =========================================================
   EREIGNISSE (sim/events.js): Häufigkeit, Dauer, Wirkung
   Ein Ereignis wird warn Sekunden vorher angekündigt (Toast, Symbol mit Countdown in der Kopfleiste, Ort auf der Minimap),
   läuft dur Sekunden und endet dann. Zufall kommt aus Seed + Ereigniszähler: Speichern und Laden verschiebt nichts.
   place: wo es passiert
     kontor = Gebiet um eine Insel mit Kontor (Radius r), vulkan = Vulkaninsel mit Gebäuden, fisch = Meer an einer Insel mit Fischerhütte,
     sea = offenes Meer nahe einem Kontor, world = ganze Welt
   Wirkungen (alle optional):
     ship    = Tempo-Faktor der Schiffe (im Radius bzw. überall), fischer = Faktor der Fischerhütten (im Radius bzw. auf der Insel),
     geo     = Faktor der Geothermie auf der Insel, dmg = { r (Felder um Lava), chance } Gebäude werden beschädigt (nicht bei „sanft“),
     drift   = [min, max] zusätzliches Treibgut, das am Ende verschwindet, tradePrice = Ankaufpreise +f, visit = zusätzlicher Hafenhändler-Besuch
   w = Gewicht bei der Auswahl.
   ========================================================= */
export const EVENTS = {
  sturm:    { name: 'Sturm',           dur: 180, w: 1, place: 'kontor', r: 60, ship: 0.5, fischer: 0.5,
              eff: 'Schiffe im Sturmgebiet −50 % Tempo, Fischer −50 %' },
  vulkan:   { name: 'Vulkanausbruch',  dur: 120, w: 1, place: 'vulkan', geo: 1.5, dmg: { r: 6, chance: 0.2 },
              eff: 'Geothermie +50 %, Gebäude nahe der Lava können beschädigt werden' },
  schwarm:  { name: 'Fischschwarm',    dur: 240, w: 1, place: 'fisch', r: 30, fischer: 2,
              eff: 'Fischerhütten der Insel +100 %' },
  treibgut: { name: 'Treibgutfeld',    dur: 300, w: 1, place: 'sea', drift: [6, 10],
              eff: '6–10 zusätzliche Treibgut-Funde, danach weg' },
  fest:     { name: 'Händlerfest',     dur: 180, w: 1, place: 'world', tradePrice: 0.25, visit: true,
              eff: 'Ankaufpreise +25 %, ein zusätzlicher Hafenhändler-Besuch' },
  flaute:   { name: 'Flaute',          dur: 120, w: 1, place: 'world', ship: 0.75,
              eff: 'Alle Schiffe −25 % Tempo' }
};
export const EVENT_ORDER = Object.keys(EVENTS);
// first = frühestens ab dieser Spielzeit (s), gap = Abstand zwischen zwei Ereignissen gleichverteilt min–max (Mittel 8 min),
// warn = Vorwarnzeit (s), soft = Faktor auf den Abstand bei „sanft“, drift = Abstand des Treibgutfelds vom Kontor (Felder)
export const EVENT_TIMING = { first: 1200, gap: [240, 720], warn: 60, soft: 2, drift: [14, 30] };
// Einstellung im Zahnrad-Menü
export const EVENT_MODES = { aus: 'Ereignisse aus', sanft: 'Ereignisse sanft', normal: 'Ereignisse normal' };
// Reparatur beschädigter Gebäude: Anteil der Baukosten (aufgerundet)
export const REPAIR_SHARE = 0.2;
