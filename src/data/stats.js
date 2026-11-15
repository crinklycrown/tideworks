/* =========================================================
   PRODUKTIONSSTATISTIK: Einteilung der Quellen (sim/stats.js, ui/stats.js)
   ONE_OFF = einmalige Abgänge und Zugänge (Bauen, Forschung, Schiffbau, Leeren von Bändern/Netzen):
   Sie zählen nicht in Rate/min und Netto, sondern stehen getrennt als Summe der letzten 15 Minuten („Einmalig“).
   ========================================================= */
export const ONE_OFF = new Set(['bauen', 'forschung', 'schiffbau', 'leeren']);
export const isOneOff = (src) => ONE_OFF.has(src);
// Ist bleibt gelb hinter Soll zurück, wenn es mehr als diesen Anteil darunter liegt
export const IST_WARN = 0.2;
// Durchsatz je Gebäude (Info-Panel): Fächer zu bucket Sekunden, n Fächer (= 60 s)
export const IO_WINDOW = { bucket: 10, n: 6 };
