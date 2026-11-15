/* =========================================================
   DEMO-FABRIK für den Titelbildschirm (sim/demo.js baut sie, gfx/camera.js fährt den Kamerapfad ab)
   Eine eigene kleine Simulation: berührt keinen Spielstand, ohne Nebel, Tag und Nacht im Zeitraffer.
   Alle Koordinaten gelten für die Heimatinsel des Seeds (Hauptkontor bei 36/0, Steg nach Osten).
   Bau-Kommandos: [Typ, x, y, Richtung (0 rechts, 1 unten, 2 links, 3 oben), Zusatz { ex, so, rc } ]
   Ändert sich die Weltgenerierung, Koordinaten mit einem Testlauf prüfen: sim/demo.js meldet Fehlschläge in der Konsole.
   ========================================================= */
export const DEMO = {
  seed: 4242,
  prerun: 75,          // Sekunden, die vor dem Anzeigen schon simuliert werden (Bänder voll)
  day: 12,             // Tag und Nacht laufen so viel schneller (nur die Darstellung)
  stock: 400,          // Inselinventar je Ware; alle refresh Sekunden wieder darauf gesetzt, damit nichts vollläuft
  refresh: 120,
  reveal: 140,         // Nebel rings um die Heimatinsel aufdecken (Felder)
  build: [
    // Kohle: zwei Bohrer, Band nach Osten, mit Kreuzung, dann nach Norden über den Sortierer ins Kontor
    ['bohrer', 24, 4], ['bohrer', 26, 4],
    ['band', 24, 6, 0], ['band', 25, 6, 0], ['band', 26, 6, 0], ['band', 27, 6, 0], ['band', 28, 6, 0], ['kreuzung', 29, 6, 0], ['band', 30, 6, 0],
    ['band', 31, 6, 0], ['band', 32, 6, 0], ['band', 33, 6, 0], ['band', 34, 6, 0],
    ['band', 35, 6, 3], ['band', 35, 5, 3], ['band', 35, 4, 3], ['sortierer', 35, 3, 3, { so: { it: 'holz', rv: true } }], ['band', 35, 2, 3], ['band', 35, 1, 0],
    // Holz: Sägewerk am Waldrand, mündet in die Kohle-Linie; der Sortierer schickt das Holz zur Seite ins Dampfkraftwerk
    ['saege', 32, 7], ['band', 34, 7, 0], ['band', 35, 7, 3],
    ['band', 36, 3, 0], ['band', 37, 3, 0], ['band', 38, 3, 1], ['band', 38, 4, 1], ['kraftwerk', 37, 5],
    ['pumpe', 38, 8], ['rohr', 38, 7], ['rohr', 37, 7],
    // Eisen: zwei Extraktoren am Kontor (Erz über ein Brückenband über den Wald, Kohle von oben; seit Version 18 führt das Band gerade vom Extraktor weg), Schmelzofen, Barren über die Kreuzung in die Lagerkiste
    ['extraktor', 35, 0, 2, { ex: 'eisenerz' }], ['extraktor', 36, -1, 3, { ex: 'kohle' }],
    ['band', 36, -2, 3], ['band', 36, -3, 2], ['band', 35, -3, 1], ['band', 35, -2, 2], ['band', 34, -2, 2], ['band', 33, -2, 2], ['band', 32, -2, 2], ['band', 31, -2, 2], ['band', 30, -2, 1], ['band', 34, 0, 2],
    ['bandbruecke', 33, 0, 2], ['bandbruecke', 31, 0, 2], ['schmelzofen', 29, -1],
    ['band', 29, 1, 1], ['band', 29, 2, 1], ['band', 29, 3, 1], ['band', 29, 4, 1], ['band', 29, 5, 1], ['band', 29, 7, 1], ['kiste', 29, 8],
    // Wohnen: Hütten mit Licht in der Nacht
    ['huette', 30, -5], ['huette', 33, -5], ['huette', 27, -4], ['huette', 31, -8]
  ],
  // Handelskontor für die Schiffsroute: erster freier Platz mit Steg in der Nähe von near
  port: { near: [27, 15], r: 16 },
  // Route: Hauptkontor (Holz laden) → Handelskontor (alles entladen)
  route: [{ port: 'hq', load: [{ it: 'holz', mode: 'upto', n: 20 }], unload: [] }, { port: 'hk', load: [], unload: [{ it: '*', mode: 'all' }] }],
  // Kamerapfad: [x, y (Felder), Sekunden bis zum nächsten Punkt]; läuft in einer Schleife. zoom = Bildschirmpunkte je Weltpixel
  zoom: 2,
  cam: [[31, 1, 14], [26, 5, 12], [33, 6, 12], [38, 3, 12], [33, -4, 12], [35, 10, 14], [30, 15, 14]]
};
