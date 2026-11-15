/* =========================================================
   WELTENLEUCHTTURM (sim/wonder.js): einmalig in der Welt, 4 Stufen (Geschichte, docs/STORY.md und docs/SYSTEMS.md 6)
   Seit 0.18.0 ist jede Stufe eine Baustelle: Im Info-Panel eröffnet man die nächste Stufe, dann sammelt der Turm ihre Waren
   über Bänder (und Extraktoren daneben) und, wenn eingeschaltet, aus dem Inselinventar (pull Stück je Sekunde).
   Sind alle Waren da, wird build Sekunden gebaut. Keine Münzen, kein Ruhm, keine Wirkungen über mods (effect leer).
   Je Stufe:
     name   – Anzeige im Info-Panel
     cost   – Waren der Baustelle (große Mengen: Überproduktion binden; mehr als ein Kontor fasst ist erlaubt, es wird nach und nach geliefert)
     sight  – aufgedeckte Sichtweite um den Turm in Feldern, sobald die Stufe fertig ist (der größte Wert zählt)
     need   – Freigabe: act (ab diesem Akt) und/oder flag (Story-Flag gesetzt, data/story.js); gesperrt zeigt nur „Wird später freigeschaltet“
   Bis Version 15 gaben fertige Phasen fame Ruhm und wirkten über mods(g) (sim/mods.js); effect bleibt dafür lesbar:
     reveal    = Aufdeck-Radius aller Schiffe +f        tradeFreq  = Händler kommen +f öfter
     prod      = Produktionsgebäude +f Tempo            tradePrice = Ankaufpreise der Händler +f
     evWarn    = Ereignisse s früher angekündigt        drones     = +n Drohnen je Drohnenhafen
     powerAll  = Stromerzeugung aller Generatoren +f    beam       = Lichtstrahl über der Karte (nachts)
   ========================================================= */
// firstFame = Ruhm für den ersten vollendeten Leuchtturm (Getrennte Inseln: Wettstreit, nur alte Spielstände)
// pull = Stück je Sekunde aus dem Inselinventar (alle Waren zusammen), wenn „Aus dem Inselinventar nehmen“ an ist
// Startwerte fürs Balancing.
export const WONDER = {
  build: 120, fame: 0, firstFame: 2000, pull: 12,
  phases: [
    { name: 'Grundmauer', cost: { holz: 600, ziegel: 800, eisen: 300 }, sight: 40, need: { act: 2 }, effect: {} },
    { name: 'Turm mit Gerüst', cost: { ziegel: 1500, eisen: 600, glas: 200, seil: 80, zahnrad: 40 }, sight: 60, need: { act: 2 }, effect: {} },
    { name: 'Lampenkammer', cost: { stahl: 600, glas: 800, kupfer: 500, werkzeug: 200 }, sight: 85, need: { flag: 'karte_gefunden' }, effect: {} },
    { name: 'Vollendung', cost: { stahl: 1000, kupfer: 600, glas: 600, werkzeug: 300, feder: 80 }, sight: 115, need: { flag: 'pumpe_gefunden' }, effect: {} }
  ]
};
// Lichtstrahl: Umdrehungen je Minute Spielzeit, Länge in Feldern
export const BEAM = { rpm: 3, len: 70 };
// Text für gesperrte Stufen (ohne Story-Spoiler)
export const WONDER_LOCKED = 'Wird später freigeschaltet';
