/* =========================================================
   TAUCHERGLOCKE UND TAUCHSPOTS (seit 0.19.0): alle Zahlen zum Anpassen
   Logik: sim/dive.js, Tauchgang in der Oberfläche: ui/dive.js (startDive, später das Minispiel).
   Ablauf: Ole verkauft das Glockenseil, Brann die Messingglocke (ab Akt 3, data/npctrade.js). Liegen beide im Lager der
   Insel einer Werft, montiert die Werft die Glocke an ein Schiff, das an ihrem Anleger liegt (einmal je Welt).
   Danach liegt immer genau EIN Tauchspot im aufgedeckten Meer (aufsteigende Blasen). Das Taucherschiff fährt hin,
   „Tauchgang starten“ → Tauchgang → Beute → der Spot verschwindet, nach einer Pause erscheint ein neuer.
   ========================================================= */

// Zustand state.dive (Felder: sim/dive.js)
export const freshDive = () => ({ bell: null, spot: null, next: null, busy: null, total: 0, n: 0, story: null });

// Teile der Glocke (Waren in data/items.js, Verkauf in data/npctrade.js) und was die Montage in der Werft kostet
export const BELL_PARTS = { glockenseil: 1, glockenhaube: 1 };
export const BELL = {
  cost: BELL_PARTS,     // aus dem Inselinventar der Werft-Insel
  range: 4              // so nah (Felder) muss das Schiff am Anleger der Werft liegen
};

// Tauchspots
//   first    Sekunden nach der Montage bis zum ersten Spot
//   pause    [min, max] Sekunden nach einem Tauchgang bis zum nächsten Spot (zufällig dazwischen)
//   coast    so viele Felder rundum müssen Wasser sein (Abstand zu Land)
//   edge     so viele Felder rundum müssen aufgedeckt sein (Abstand zum Rand des Nebels, „Kartenrand“)
//   near/far Abstand (Felder) zur Mitte der Heimatinsel: nicht näher als near, möglichst nicht weiter als far
//            (findet sich dort nichts, zählt das ganze aufgedeckte Meer)
//   tries    Versuche je Sekunde, einen Platz zu finden
//   over     so nah (Felder) muss das Taucherschiff am Spot liegen (und stillstehen), damit „Tauchgang starten“ geht
//   timeout  Sekunden, nach denen ein nicht beendeter Tauchgang abgebrochen wird (Mitspieler weg, Fenster zu)
export const DIVE = { first: 8, pause: [120, 180], coast: 6, edge: 10, near: 40, far: 420, tries: 40, over: 2.5, timeout: 240 };

// Vorläufiger Tauchgang (bis das Minispiel kommt): so lange (Sekunden) sinkt die Glocke, dann gibt es die Beute
export const DIVE_PLACEHOLDER = { time: 5 };

// Arten von Tauchspots. normal = Zufallsbeute aus DIVE_LOOT.normal; story = besonderer Spot mit Story-Fund
// (find → Auslöser find:<find> in data/story.js). Story-Spots legt erst ein späterer Thread an (sim/dive.js queueStorySpot).
export const SPOT_KINDS = {
  normal: { name: 'Tauchspot', loot: 'normal' },
  story:  { name: 'Besonderer Tauchspot', loot: 'story' }
};

// Beutetabellen: rolls = so viele Ziehungen [min, max], list = { it, w (Gewicht), n: [min, max] }.
// Gleiche Ware zweimal gezogen = Mengen zusammen. Beute geht zuerst in den Laderaum des Schiffs, der Rest ins Lager der Heimatinsel.
export const DIVE_LOOT = {
  normal: { rolls: [2, 3], list: [
    { it: 'schrott',   w: 4,   n: [10, 25] },
    { it: 'eisenerz',  w: 2.5, n: [15, 30] },
    { it: 'kupfererz', w: 2.5, n: [15, 30] },
    { it: 'kohle',     w: 2,   n: [20, 40] },
    { it: 'kalk',      w: 1,   n: [15, 30] },
    { it: 'perle',     w: 1.5, n: [1, 3] }
  ] },
  story: { rolls: [1, 1], list: [{ it: 'schrott', w: 1, n: [5, 10] }] }
};

/* =========================================================
   TAUCH-MINISPIEL (seit 0.20.0, ui/divegame.js, Zeichnen divegame/): alle Zahlen zum Anpassen
   Seitenansicht unter Wasser (320×180 wie die Cutscenes). Die Glocke hängt oben, der Taucher hängt am Schlauch.
   Zwei Aufgaben: search (Haufen freilegen, einer enthält das Ziel) und weld (Schweißnaht an Kiste oder Wracktür entlangfahren).
   Die Beute würfelt weiter der Host (DIVE_LOOT); Kleinkram aus Haufen geht als junk mit diveEnd an den Host und wird dort geprüft.
   ========================================================= */
//   air        Sekunden Sauerstoff
//   warn       ab diesem Anteil blinkt die Anzeige und der Bildrand pulsiert (Herzschlag)
//   speed      Schwimmgeschwindigkeit des Tauchers (Pixel je Sekunde, Bild 320×180)
//   reach      so nah (Pixel) muss der Taucher an einem Haufen bzw. an der Naht sein
//   dig        Sekunden Graben je Haufen (Halten; ein kurzer Klick zählt mindestens click Sekunden)
//   weld       Pixel Naht je Sekunde (höchstens), tol = so weit (Pixel) darf der Brenner neben der Naht sein
//   karteAfter nach so vielen erfolgreichen Tauchgängen in Akt 3 ist der nächste Spot ein Story-Spot mit der Alten Karte
//   tasks      Gewichte der Aufgaben bei normalen Spots
//   byAct      Schwierigkeit je Akt (3, 4, 5; danach wie 5): piles [min, max] Haufen, seam = Nahtlänge (Pixel, ungefähr)
export const DIVE_GAME = {
  air: 35, warn: 0.25, speed: 58, reach: 16, dig: 1.4, click: 0.35, weld: 34, tol: 6,
  karteAfter: 3,
  tasks: { search: 1, weld: 1 },
  byAct: { 3: { piles: [5, 6], seam: 110 }, 4: { piles: [6, 7], seam: 140 }, 5: { piles: [7, 8], seam: 170 } },
  junkChance: 0.45      // Anteil der leeren Haufen, die Kleinkram enthalten (sonst nur Sand)
};
// Was man suchen soll (normale Spots). Das Zeichen dazu steht in divegame/sprites.js (gleiche id).
export const DIVE_TARGETS = [
  { id: 'kompass', name: 'Messingkompass' },
  { id: 'uhr', name: 'Taschenuhr' },
  { id: 'fernrohr', name: 'Fernrohr' },
  { id: 'becher', name: 'Silberbecher' },
  { id: 'medaille', name: 'Zunftmedaille' },
  { id: 'lampe', name: 'Grubenlampe' }
];
// Story-Funde (Story-Spot find → Suchziel). desc = Satz im Ergebnisfenster, goal = nächstes Ziel (unter dem Fund)
export const DIVE_STORY_TARGETS = {
  karte: { id: 'karte', name: 'Alte Karte', goal: 'Bring die Karte zu Brann.' },
  pumpwerk: { id: 'brecheisen', name: 'Verbogenes Brecheisen', desc: 'Ein schweres Brecheisen mit einem eingeprägten Wappen.', goal: 'Bring deinen Fund zu Brann.' }
};
// Story-Tauchgang „Pumpwerk“ (seit 0.21.0, Akt 4 nach Leuchtturm Stufe 3): eigene Szene (divegame/pumpwerk.js), zwei Aufgaben nacheinander:
// erst das Tor zur Pumpenhalle aufschweißen (gate), dann in der Halle suchen (Ziel DIVE_STORY_TARGETS.pumpwerk).
//   air    Luft als Vielfaches von DIVE_GAME.air (doppelt)
//   gate   Größe des Tors (Pixel, Bild 320×180); die Naht läuft links hoch, oben quer, rechts hinunter
//   piles  Haufen in der Halle [min, max]
//   keep   true = misslingt der Tauchgang (Luft leer, aufgegeben), bleibt der Spot liegen
export const DIVE_PUMP = { air: 2, gate: { w: 40, h: 52 }, piles: [6, 7], keep: true, name: 'Schweiße das Tor zur Pumpenhalle auf' };
// Aufschweißen: was geöffnet wird
export const DIVE_WELD = [
  { id: 'kiste', name: 'Schweiße die Kiste auf' },
  { id: 'tuer', name: 'Öffne die Wracktür' }
];
// Kleinkram aus Haufen: Ware, Menge [min, max], Gewicht. Der Host nimmt nur Waren aus dieser Liste und höchstens max je Haufen.
export const DIVE_JUNK = [
  { it: 'schrott', n: [2, 5], w: 5 },
  { it: 'kupfererz', n: [2, 4], w: 2 },
  { it: 'eisenerz', n: [2, 4], w: 2 },
  { it: 'kohle', n: [2, 5], w: 1.5 },
  { it: 'perle', n: [1, 1], w: 0.6 }
];
