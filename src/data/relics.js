/* =========================================================
   RELIKTE UND RELIKTSOCKEL (seit 0.24.0): alle Zahlen zum Anpassen
   Logik: sim/relics.js, Fenster „Relikte“ (Taste L): ui/relics.js, Symbole: gfx/sprites/relics.js.
   Relikte sind einzelne Fundstücke aus dem versunkenen Land. Sie liegen in einer weltweiten Sammlung (state.relics),
   nicht im Inselinventar. Ein Reliktsockel (genau einer je Insel) hält genau ein Relikt; seine Wirkung gilt für die ganze Insel.
   Ein Relikt passt in einen Sockel gleicher oder höherer Stufe. Legendäre Relikte gibt es je nur einmal im Spiel und sie
   verbrauchen Perlen aus dem Inselinventar, solange sie eingesetzt sind (UPKEEP); fehlen Perlen, ruht die Wirkung.
   ========================================================= */

// Stufen (1 = gewöhnlich, 2 = selten, 3 = legendär). col = Farbe für Rahmen und Schrift
export const RELIC_TIERS = {
  1: { id: 'gewoehnlich', name: 'Gewöhnlich', adj: 'gewöhnlich', col: '#b8ad9a' },
  2: { id: 'selten', name: 'Selten', adj: 'selten', col: '#4fa8e8' },
  3: { id: 'legendaer', name: 'Legendär', adj: 'legendär', col: '#ffc61a' }
};

// Reliktsockel: Gebäudetyp → Stufe. Aufwerten 1 → 2 → 3 (UPGRADE_TO in data/buildings.js), das eingesetzte Relikt bleibt.
// Baukosten (aus dem Inselinventar). Beim Aufwerten wird der alte Sockel voll erstattet und der neue bezahlt (sim/buildings.js),
// netto kostet die nächste Stufe also nur den Unterschied.
export const PEDESTALS = { sockel1: 1, sockel2: 2, sockel3: 3 };
export const PEDESTAL_COST = {
  sockel1: { holz: 40, kalk: 30, ziegel: 20 },                                  // gewöhnlich: einfache Baustoffe
  sockel2: { holz: 40, kalk: 30, ziegel: 40, perle: 4, koralle: 8 },            // selten: zusätzlich Perlen und Korallen
  sockel3: { holz: 40, kalk: 30, ziegel: 40, perle: 24, muschel: 30 }           // legendär: viele Perlen und Muscheln
};

// Unterhalt legendärer Relikte: so viele Stück der Ware it je Spieltag (Tag + Nacht, config.js CYCLE) aus dem Inselinventar
// der Insel, auf der der Sockel steht. Gezahlt wird stückweise im gleichen Abstand, das erste Stück beim Einsetzen.
export const RELIC_UPKEEP = { it: 'perle', perDay: 2 };

// „Öfen brauchen keine Kohle/Energie“ (Ewige Glut): je Ofen, ob die Kohle-Zutat entfällt (coal) und ob er ohne Strom
// mit voller Geschwindigkeit läuft (power). Der Pyrolyse-Ofen fehlt bewusst: dort ist Kohle der Rohstoff, nicht der Brennstoff.
export const RELIC_FURNACES = {
  schmelzofen: { coal: true },
  induktionsofen: { coal: true, power: true },
  siliziumofen: { power: true }
};
// „Doppelte Produktion einer gewählten Ressource“: wählbar sind Waren dieser Arten (data/items.js kind), ohne Waren der Völker
export const RELIC_PICK_KINDS = ['roh', 'nahrung', 'zwischen', 'end'];

/* Relikte
   tier  Stufe (RELIC_TIERS)
   fx    Wirkung auf der Insel des Sockels (alle Werte additiv, Anteile: 0,05 = 5 %):
           prod   Produktionsrate aller Produktionsgebäude (Rezepte, Sägewerk, Fischer, Bohrer)
           drill  Förderrate der Bohrer (zusätzlich zu prod)
           belt   Bänder schneller (auch Splitter, Überlauf-Tor, Sortierer dahinter)
           ship   Schiffe dieser Insel (in einer Werft der Insel gebaut) schneller
           power  Stromverbrauch der Gebäude (−0,25 = 25 % weniger)
           cap    Platz im Hauptkontor (Inselinventar)
           house  Verbrauch der Häuser (−0,25 = 25 % weniger, +1 = doppelt so viel); Pläne liefern sie unverändert
           air    Sekunden Sauerstoff beim Tauchen (nur, solange das Relikt auf der Heimatinsel des Tauchers liegt)
           furnace  Öfen brauchen keine Kohle/Energie (RELIC_FURNACES)
           double   doppelte Produktion einer beim Einsetzen gewählten Ware (RELIC_PICK_KINDS)
           coal2iron  Bohrer auf Kohle fördern Eisenerz
           spots  Tauchspots erscheinen öfter (+1 = doppelt so oft; gilt weltweit, solange das Relikt eingesetzt ist)
           noPower  Gebäude der Insel brauchen keinen Strom
   end   End-Relikt: kommt nur mit der Entscheidung am Leuchtturm ('a' | 'b'), nie aus Handel oder Tauchgängen
   name, desc  Name und kurzer Text (Fundstück aus dem versunkenen Land) */
export const RELICS = {
  // Gewöhnlich (Ole, Aufträge, Tauchgänge)
  zunftrad:    { tier: 1, fx: { prod: 0.05 }, name: 'Zahnrad der Uhrmacherzunft',
                 desc: 'Messing, grün angelaufen. Es dreht sich ein wenig weiter, wenn niemand hinsieht.' },
  bohrkopf:    { tier: 1, fx: { drill: 0.10 }, name: 'Gesegneter Bohrkopf',
                 desc: 'Die Bergleute der alten Stadt ritzten Gebete in ihre Bohrer. Dieser hat sie behalten.' },
  rollenglied: { tier: 1, fx: { belt: 0.10 }, name: 'Rollenglied der Hafenbahn',
                 desc: 'Ein Glied aus der Kette, die einst die Kräne am Hafen trieb. Es will immer weiter.' },
  lotsenkompass: { tier: 1, fx: { ship: 0.15 }, name: 'Kompass des Lotsen',
                 desc: 'Die Nadel zeigt nicht nach Norden, sondern nach Hause. Schiffe finden schneller zurück.' },
  // Selten (Brann, Aufträge, Tauchgänge)
  werksiegel:  { tier: 2, fx: { prod: 0.20 }, name: 'Siegel des Werkmeisters',
                 desc: 'Wer dieses Siegel trug, durfte jede Werkstatt der Stadt betreten. Die Arbeit geht leichter von der Hand.' },
  glimmspule:  { tier: 2, fx: { power: -0.25 }, name: 'Glimmende Spule',
                 desc: 'Kupfer, das seit Jahrhunderten leise summt. Der Strom fließt sparsamer, wo sie liegt.' },
  speicherbund: { tier: 2, fx: { cap: 0.50 }, name: 'Schlüsselbund des Speichermeisters',
                 desc: 'Zu jeder Tür ein Schlüssel, auch zu denen, die es nicht mehr gibt. Im Kontor ist plötzlich mehr Platz.' },
  genuegsam:   { tier: 2, fx: { house: -0.25 }, name: 'Tafel der Genügsamkeit',
                 desc: '„Nimm, was du brauchst, und keinen Fisch mehr.“ Die Bewohner halten sich daran.' },
  atemmuschel: { tier: 2, fx: { air: 20 }, name: 'Atemmuschel',
                 desc: 'Eine Muschel, in der die Luft nie ausgeht. Liegt sie auf der Heimatinsel, bleibt der Taucher länger unten.' },
  // Legendär (Aurel, vor allem Tauchgänge), je nur einmal im Spiel
  ewigeglut:   { tier: 3, fx: { furnace: true }, name: 'Ewige Glut',
                 desc: 'Ein Stück Kohle, das brennt, ohne zu vergehen. Öfen brauchen keine Kohle und keinen Strom mehr.' },
  fuellhorn:   { tier: 3, fx: { double: true }, name: 'Füllhorn der Flutstadt',
                 desc: 'Aus dem Horn fiel einst mehr, als man hineinlegte. Eine Ware deiner Wahl kommt doppelt.' },
  wandelstein: { tier: 3, fx: { coal2iron: true }, name: 'Stein der Wandlung',
                 desc: 'Schwarz wird rot. Alle auf der Insel geförderte Kohle kommt als Eisenerz an.' },
  herzderflut: { tier: 3, fx: { spots: 1 }, name: 'Herz der Flut',
                 desc: 'Es schlägt im Takt der Gezeiten. Das Meer gibt seine Geheimnisse doppelt so oft preis.' },
  // End-Relikte (legendär)
  erste_flamme: { tier: 3, end: 'a', fx: { prod: 0.30, noPower: true }, name: 'Die erste Flamme',
                 desc: 'Das Feuer, das der Leuchtturm zurückgab. Die Insel arbeitet schneller, und keine Maschine braucht mehr Strom.' },
  krone:       { tier: 3, end: 'b', fx: { prod: 0.50, house: 1 }, name: 'Die Krone des Herrschers',
                 desc: 'Aurels Krone, schwer von Gold. Die Insel produziert wie nie, doch ihre Bewohner verlangen doppelt so viel.' }
};
export const RELIC_ORDER = Object.keys(RELICS);

/* Herkunft (sim/relics.js, sim/npc.js, sim/dive.js, sim/ending.js)
   npc     je Volk: tier = Stufe der Relikte im Angebot, lvl = ab dieser Rufstufe, price = Münzen.
           Jeden Morgen legt das Volk ein Relikt ins Angebot, wenn keins da ist (legendäre nur, solange es sie noch gibt).
   orders  Aufträge: mit chance trägt ein neuer Auftrag zusätzlich ein Relikt der Stufe tier[Volk] als Belohnung
   dive    erfolgreicher Tauchgang an einem normalen Spot: mit chance ein Relikt, Stufe nach Gewicht w (legendär nur, solange es
           noch eins gibt, das weder gefunden noch im Angebot ist)
   mermaid Meerjungfrauen: folgt in einem späteren Schritt (nur Anzeige in der Sammlung)
   end     End-Relikte: kommen mit der Entscheidung (data/npctrade.js ENDINGS.relic) in die Sammlung */
export const RELIC_SOURCES = {
  npc: {
    ole:   { tier: 1, lvl: 'freundlich', price: 900 },
    brann: { tier: 2, lvl: 'vertraut',   price: 3500 },
    aurel: { tier: 3, lvl: 'vertraut',   price: 15000 }
  },
  orders: { chance: 0.12, tier: { ole: 1, brann: 2, aurel: 2, rat: 2 } },
  dive: { chance: 0.25, w: { 1: 4, 2: 3, 3: 3 } },
  mermaid: { soon: true, name: 'Meerjungfrauen', tiers: [1, 2, 3], note: 'An Riffen, nachts und an Tauchspots. Folgt bald.' }
};
// Texte der Herkunft für die Sammlung (Reihenfolge = Anzeige)
export const RELIC_SOURCE_TEXT = [
  { id: 'ole', name: 'Ole', tiers: [1], text: 'Gewöhnliche Relikte, ab Ruf „freundlich“' },
  { id: 'brann', name: 'Brann', tiers: [2], text: 'Seltene Relikte, ab Ruf „vertraut“' },
  { id: 'aurel', name: 'Aurel', tiers: [3], text: 'Legendäre Relikte, ab Ruf „vertraut“, teuer' },
  { id: 'orders', name: 'Aufträge', tiers: [1, 2], text: 'Manchmal liegt einer Belohnung ein Relikt bei' },
  { id: 'dive', name: 'Tauchgänge', tiers: [1, 2, 3], text: 'Die beste Quelle für legendäre Relikte' },
  { id: 'mermaid', name: 'Meerjungfrauen', tiers: [1, 2, 3], text: 'Folgt bald', soon: true },
  { id: 'end', name: 'Die Entscheidung', tiers: [3], text: 'Ein Relikt je Ende' }
];

// Debug (tideworks.relicsAll()): so viele Perlen legt tideworks.pearls() ohne Angabe ins Inselinventar
export const RELIC_DEBUG = { pearls: 50 };
