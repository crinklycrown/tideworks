/* =========================================================
   KONSTANTEN
   ========================================================= */
// Simulation im Web Worker (true) oder im Hauptthread (false). Gleiche Kommando-/Snapshot-Schnittstelle.
export const USE_WORKER = true;
// Band-Items und Schiffe zwischen zwei Snapshots linear interpolieren (false = Darstellung in 20-Hz-Schritten wie bisher)
export const INTERPOLATE = true;

export const TS = 16;                                  // Pixel pro Kachel
// Bodenarten. Bebaubar ist alles außer Wasser, Berg und Lava.
export const G_WATER = 0, G_SAND = 1, G_GRASS = 2, G_ROCK = 3, G_DUNE = 4, G_MOUNT = 5, G_LAVA = 6, G_ASH = 7;
export const GROUND_NAME = ['Wasser', 'Strand', 'Wiese', 'Steinboden', 'Sand', 'Berg', 'Lava', 'Basalt'];
export const BUILDABLE = [false, true, true, true, true, false, false, true];
export const SANDY = [false, true, false, false, true, false, false, false];   // Quarzsand, Palmen

// Unendliche Welt (siehe world/): Chunks zu 32×32 Feldern, Inselzellen zu 112×112 Feldern
export const CELL = 112;                                // Zellgröße; Zelle (0,0) liegt mittig um den Spawn (0,0)
export const CELL_EDGE = 5;                             // so viele Felder Meer bleiben mindestens am Zellrand
export const MAX_CHUNKS = 900;                          // Boden-Chunks im Speicher (je Simulation und Oberfläche)
export const MAX_ISLANDS = 400;                         // erzeugte Inseln im Speicher
export const MAX_CHUNK_IMAGES = 120;                    // vorgerenderte Boden-Chunks (Bilder)
export const SHIP_SEARCH_MARGIN = 40, SHIP_SEARCH_MAX = 60000;   // A*-Suche der Schiffe
// Erkundung: aufgedeckter Radius in Feldern
export const REVEAL = { spawn: 60, building: 6, kontor: 25 };   // Schiffe: je Art (data/ships.js)
export const REVEAL_STRIP = 3;                         // Kontor gründen deckt die ganze Insel plus so viele Felder Küstenstreifen auf
export const MAP_COAST_SHARE = 0.7;                    // ab diesem Anteil gesehener Küstenfelder gilt eine Insel als kartiert (ganz aufgedeckt)
export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];  // 0 rechts, 1 unten, 2 links, 3 oben
export const DIR_NAME = ['nach rechts', 'nach unten', 'nach links', 'nach oben'];
export const CYCLE = 900, DAY_LEN = 600;               // 10 min Tag + 5 min Nacht
export const TICK = 0.05;                              // Simulationsschritt (20 Hz)
export const MAX_STEPS = 8;                            // höchstens so viele Schritte pro Durchlauf
export const MAX_FRAME_DT = 0.25;                      // längster berücksichtigter Zeitsprung je Durchlauf (s)
export const TREE_GROW = 45;                           // Sekunden, bis ein Setzling reif ist
export const SHIP_BUILD = 20;                           // Sekunden Bauzeit; Arten, Tempo, Laderäume und Kosten in data/ships.js
// Laderäume vor Version 6 (nur für die Migration alter Spielstände)
export const SHIP_HOLDS = 3, SHIP_HOLD_CAP = 40;
export const SHIP_DOCK_TIME = 2, SHIP_WAIT_MAX = 60, SHIP_RETRY = 10;   // Sekunden: Anlegen, längstes Warten auf Ladung, neuer Wegversuch
export const PORT_RANGE = 2;                           // so weit (Felder) darf ein Schiff vom Anleger/von der Küste entfernt sein
export const FOUND_COST = { holz: 40 }, FOUND_RANGE = 8;   // Kontor gründen: Holz an Bord, Umkreis der Alternativplätze
export const FIND_CELL = 32, FIND_COAST = 3;           // Funde auf See: Zellgröße, Mindestabstand zur Küste
export const JETTISON_TTL = 300;                       // über Bord geworfene Ladung treibt so viele Sekunden Spielzeit, dann ist sie weg
export const WIRE_RANGE = 7, POLE_LINKS = 4, GEN_CAP = 50, BAT_CAP = 500;

// Speichern
export const SAVE_VERSION = 18;                        // v2 = Einzeldatei, v3 = IndexedDB, v4 = neue Oberfläche, v5 = unendliche Welt (ältere passen nicht), v6 = Routen/Laderäume/Funde, v7 = Rezepte/Pläne/Ruhm, v8 = Skilltree/Upgrades/Kartieren/Über Bord, v9 = Rohre/Flüssigkeiten, v10 = Hauptkontor/Kisten/Extraktoren/Entdecker, v11 = Münzen/Handel/Leuchtturm/Ereignisse/Drohnen, v12 = Ziele nach id/Sortierer/Speicherplätze, v13 = Koop (Spieler, Modus, Erbauer/Eigentümer), v14 = Getrennte Inseln (Startplätze, Spielstand und Nebel je Spieler), v15 = Freischalt-System (state.unl, frühe Forschungen, Pläne), v16 = Geschichte und NPC-Inseln (state.story, state.npcs, NPC-Dörfer), v17 = Handel mit den Völkern (state.npc: Ruf, Aufträge, Lieferverträge), v18 = Extraktor ohne Richtung (b.fd für alte, quer liefernde)
// Speicher (save/storage.js): IndexedDB „tideworks“ mit den Stores saves (Spielstände), meta (Liste) und kv (Blaupausen, letzter Platz).
// Beim ersten Start werden die alten Namen übernommen und erst danach gelöscht.
export const DB_NAME = 'tideworks', LS_PREFIX = 'tideworks.';
export const OLD_DB = { name: 'workscape', store: 'saves', slot: 'slot1' }, OLD_STORAGE_KEY = 'workscape.factory.v2', OLD_LS_PREFIX = 'workscape.';
export const LOCAL_SLOTS = 3;                          // localStorage-Fallback: höchstens so viele Spielstände
export const GAME_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';   // aus package.json (vite define)
// Kamera mit der Tastatur: base = Bildschirmpunkte/s (vorher 500, jetzt × 2,5), fast = Faktor mit Umschalt, ramp = Anfahren (s)
export const CAM_SPEED = { base: 1250, fast: 3, ramp: 0.15 };
export const SAVE_EVERY = 15;                          // Sekunden zwischen automatischen Speicherungen
