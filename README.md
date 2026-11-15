# Tideworks

**Jetzt spielen: https://crinklycrown.github.io/tideworks/**

Insel- und Fabrikbauspiel (Canvas, Pixel-Art, Vanilla-JS mit ES-Modulen, Vite).
Früher „Workscape“; aus der Einzeldatei `Workscape_3.html` modularisiert. Seit Version 4 mit neuer Vollbild-Oberfläche und Produktionsstatistik,
seit Version 5 mit unendlicher, prozedural erzeugter Welt (Inseltypen, Nebel, Minimap),
seit Version 6 mit steuerbaren Schiffen, Kontoren auf neuen Inseln, Handelsrouten mit beliebig vielen Stopps und Funden auf See,
seit Version 7 mit tieferen Produktionsketten: datengetriebene Rezepte, neue Rohstoffe und Gebäude, Häuser liefern Pläne, Forschung kostet Pläne und Waren, Ruhm statt XP,
seit Version 8 mit Forschung als Skilltree, Upgrades mit dauerhafter Wirkung, kartierten Inseln und Ladung über Bord,
seit Version 9 mit Flüssigkeiten, Rohrnetzen, Dampfkraft, Erdöl, Chemie und Hochtechnik (siehe „Flüssigkeiten und Rohre“),
seit dem Komfort-Update mit Spieltempo, Pipette, Statusansicht, Aufwerten, Rückgängig/Wiederholen, Blaupausen, Fässern und Schutz der Rohrnetze
(siehe „Komfortfunktionen“ und „Fässer“; der Spielstand bleibt Version 9),
seit Version 10 (Spieltest-Runde 1) mit Hauptkontor 3×3 und Steg, Lagerkiste, Handelskontor, Extraktor, Tor, Brückenband, Soll/Ist-Statistik, Strom-Tab und Entdecker-Schiff
(siehe „Lagerlogik, Bänder, Strom“),
seit Version 11 (Endgame) mit Münzen, Handelsposten und Händlern, Markt, Weltenleuchtturm, Ereignissen und Drohnen
(siehe „Endgame: Münzen, Handel, Leuchtturm, Ereignisse, Drohnen“),
seit Version 12 (Spieltest-Runde 2) als **Tideworks** mit Titelbildschirm, Pausenmenü, beliebig vielen Spielständen, Kartenansicht (M), Sortierer und überarbeitetem Entdecker
(siehe „Tideworks: Titel, Spielstände, Karte, Sortierer (Version 12)“),
seit Version 13 mit **Koop** für bis zu 4 Spieler über WebRTC: Lobby mit Code, gemeinsame Insel, Chat und Markierungen (siehe „Koop (Version 13)“),
seit Version 14 (Koop Teil 2) mit **Getrennten Inseln**: je Spieler eine Heimatinsel, Besitz, eigener Nebel und eigene Forschung, Handel zwischen Spielern und Wettstreit um den Leuchtturm (siehe „Getrennte Inseln (Version 14)“),
seit Version 15 mit dem **Freischalt-System**: jedes Gebäude hat genau eine Quelle (Start, Forschung, Volk mit Rufstufe, Story), frühe Forschungen Ofenbau, Bandtechnik, Schiffbau, Pläne der Völker als Voraussetzung einzelner Forschungen (siehe „Freischaltungen (Version 15)“),
seit Version 16 mit **Geschichte und NPC-Inseln**: Akte, Auslöser, die Dörfer von Ole, Brann und Aurel, Akt 1 spielbar bis zum Bauplan des Weltenleuchtturms (siehe „Geschichte und NPC-Inseln (Version 16)“),
seit Version 17 mit **Handel mit den Völkern**: Ruf in vier Stufen, Kaufen und Verkaufen am Steg, Aufträge, Lieferverträge über Routen, wachsende Dörfer, Räucherei und Kogge, Fenster „Völker“ (N) (siehe „Handel mit den Völkern (Version 17)“),
seit 0.10.0 mit **Cutscenes und Dialogfenster**: Cutscene-Player (320×180, seit 0.16.0 bildschirmfüllend mit weichen Übergängen), Monolog-Fenster mit Porträt, erste echte Szene „Rauch hinter dem Nebel“ bei Ole, Menü „Szenen“ (siehe „Cutscenes und Dialoge (0.10.0)“); seit 0.11.0 der **Prolog „Gestrandet“** vor dem ersten Bild eines neuen Spiels (siehe „Prolog (0.11.0)“);
seit 0.15.0 (Spielstand Version 18) nach dem ersten Story-Test mit **Extraktor wie der Unloader in Mindustry**, weiter fahrendem Entdecker, Namen und Symbolen der Story-Inseln, gebündelten Meldungen und einer **Kamera, die dem Schiff folgt** (siehe „Nach dem Story-Test (0.15.0)“);
seit 0.24.0 (Spielstand Version 19) mit **Relikten und Reliktsockeln**: 15 Relikte in drei Stufen in einer weltweiten Sammlung (Fenster „Relikte“, L), je Insel ein Sockel (Stein, Messing, Gold), Wirkung auf die ganze Insel, legendäre verbrauchen Perlen; Herkunft Handel, Aufträge, Tauchgänge und die Enden (siehe `docs/SYSTEMS.md` Abschnitt 8, Test in `docs/TEST-RELIKTE.md`).

## Starten

```bash
npm install
npm run dev       # Entwicklungsserver (http://localhost:5173/tideworks/)
npm run build     # fertige Version nach dist/
npm run preview   # dist/ über einen lokalen Server ansehen (http://localhost:4173/tideworks/)
npm run check:tree  # Skilltree prüfen: keine Überlappungen, jede Forschung genau einmal, alle Gebäude und Rezepte abgedeckt
npm run check:world # Welt-Erzeugung: gleich für gleichen Seed, Einzelspieler-Start wie in Version 13, Startplätze für 2–4 Spieler
npm run check:coop  # Getrennte Inseln ohne Browser (Besitz, Erlaubnis, Preislisten, Datenschutz, Speichern, Datenrate)
npm run check:story # Akt 1 mit echtem Segeln, Debug, Speichern, Koop-Ansicht, Migration v15
npm run check:npc   # Handel mit den Völkern: Ruf, Kaufen/Verkaufen, Preise, Aufträge, Lieferverträge per Route, Dörfer, Speichern, Koop
npm run check:relics # Relikte (0.24.0): Sockel, Stufen, alle Wirkungen, Perlen-Unterhalt, Handel, Aufträge, Tauchen, Speichern, Migration v18, Spiegel
```

**GitHub Pages (seit 0.23.1):** Jeder Push auf `main` baut das Spiel (`.github/workflows/deploy.yml`) und veröffentlicht `dist/`
unter https://crinklycrown.github.io/tideworks/. Dafür ist `base` in `vite.config.js` auf `/tideworks/` gesetzt:
`dist/index.html` lädt seine Dateien aus `/tideworks/assets/…` und braucht deshalb einen Server mit diesem Pfad (Pages oder `npm run preview`).
Vite baut weiterhin ein klassisches Skript (IIFE) mit eingebettetem Worker und ohne `type="module"` (siehe `vite.config.js`).
Zusätzlich entsteht `dist/tideworks.html`: das ganze Spiel als **eine einzige Datei** (Skript und CSS eingebettet).
Diese Datei lässt sich ohne den Ordner `assets/` weitergeben und per Doppelklick (file://) starten.

## Schalter (`src/config.js`)

- `USE_WORKER = true`: Die Simulation läuft im Web Worker. Mit `false` läuft dieselbe Simulation im Hauptthread, über dieselbe Kommando- und Snapshot-Schnittstelle.
- `INTERPOLATE = true`: Band-Items und Schiffe werden zwischen zwei Snapshots weich bewegt. Mit `false` springen sie in 20-Hz-Schritten wie im Original.

Startet der Worker nicht (Fehler beim Erzeugen, `onerror`, keine Antwort nach 5 s),
schaltet das Spiel automatisch auf den Hauptthread um. In der Browser-Konsole zeigt
`tideworks.info()` Seed, Inseln mit Daten, entdeckte Inseln, Gebäudezahl, Modus (`worker`/`local`) und Speicherart (`idb`/`local`).
Weitere Debug-Funktionen siehe „Welt“ unten. `window.workscape` bleibt als Alias von `window.tideworks` erhalten.

## Ordner

```
index.html            Markup: Vollbild-Canvas #world und die Overlays in #hud (ohne Tailwind)
src/
  main.js             Start (Titelbildschirm), Hauptschleife (Insel unter der Kamera), Spielstände (Autosave, Laden, Export/Import), Debug-Objekt window.tideworks
  config.js           Konstanten und Schalter
  simclient.js        Verbindung zur Simulation (Worker oder Hauptthread)
  data/               reine Daten: items (mit Vorkommen ORES), buildings (mit BUILD_CATS), recipes (Rezepte),
                      mining (Bohrer, Sägewerk, Fischer, Häuser, Ruhm), tech, islands, goals,
                      finds (Funde auf See: Häufigkeit, Inhalt je Ring), names (Namensgenerator für Inseln),
                      trade (Preise, Markt, Händler, Münzbuch), events (Ereignisse), wonder (Leuchtturm-Phasen), drones (Drohnen),
                      demo (Demo-Fabrik des Titelbildschirms mit Kamerapfad), ships (Schiffsarten, Entdecker EXPLORE),
                      unlocks (Freischalt-Quellen: Volk, Story, Pläne; Texte „Forschung: …“, „Bei Brann erhältlich“),
                      story (Akte, Auslöser, Szenen- und Dialog-IDs, Ziel-Satz je Akt), npcs (NPC-Inseln: Band, Optik, Dorf),
                      relics (Relikte, Sockel, Wirkungen, Unterhalt, Herkunft; seit 0.24.0)
  util/               Mathe (Zufall, Rauschen), Formatierung, tiles.js (Feld-/Chunk-Schlüssel, Zellen, Insel-IDs)
  world/
    worldgen.js       eine Insel aus (Seed, Zelle) erzeugen: Umriss, Typ, Berge/Vulkan, Vorkommen, Bäume, Kontorplatz
    world.js          World: Inseln und Boden-Chunks bei Bedarf erzeugen (LRU), Abfragen je Feld (gr, ore, tree0 …)
    layers.js         veränderliche Felddaten je Chunk: Belegung, Erntegebiete, Bäume (nur Änderungen), Nebel
    npcs.js           Zellen der NPC-Inseln aus dem Seed wählen (pickNpcCells)
    finds.js          Funde auf See (Treibgut, Wracks): Lage und Inhalt aus Seed und Fund-Zelle
    daytime.js        Tageszeit
  sim/                Simulation, ohne DOM/Canvas/window
    state.js          Spielobjekt createGame(), Lager, Kosten, UI-Defaults (freshUI), mergeDefaults
    sim.js            sim(g, dt) und applyCommand(g, cmd)
    buildings.js      Platzieren/Abreißen/Drehen, checkPlace, Aufwerten (upgradeInfo, applyUpgrade)
    undo.js           Rückgängig/Wiederholen: Aufzeichnen der Bau-Aktionen, Prüfen, Ausführen
    blueprint.js      Blaupausen: Erfassen, Format prüfen, Code (Base64), Drehen, Prüfen an einer Stelle, Bauen
    logistics.js      Bänder, Splitter, Überlauf, Brücke
    production.js     Verhalten der Gebäude (PRODUCTION_TICKS): Rezepte (auch mit Flüssigkeiten), Bohrer, Pumpen, Kraftwerke, Häuser, Sägewerk, Fischer, Werft
    fluids.js         Rohrnetze (pipeNets), Austausch mit Gebäuden (fluidStep), Netz leeren, Inhalt für Spielstand und Snapshot
    stats.js          Produktionsstatistik: Erfassung (flowAdd) und Auswertung (flowRates, flowHistory)
    explore.js        Nebel aufdecken, Ereignis „Insel entdeckt“, Kontor deckt Insel auf, Kartieren
    ships.js          Schiffe: Seeweg per A*, Laderäume, Routen, manuelles Steuern, Funde einsammeln, Über Bord (Treibgut), Kontor-Platz prüfen
    power.js          Stromnetz (Masten, Kabel, Erzeuger, Batterien)
    research.js       Forschung, Ziele (state.goal) und Ruhm
    story.js          Geschichte: storyEvent (Auslöser), Gespräch (talk), gesehen, Entscheidung, Debug, storyTick
    villages.js       NPC-Dörfer bauen (Steg und Gebäude), npcPort, shipAtPort
    unlocks.js        Freischaltungen setzen: unlock(g, key, src) für Volk und Story, Debug „Alles freischalten“, researchFree
    mods.js           Wirkungen der Upgrades und Leuchtturm-Phasen: mods(g), rateOf, prodOf, powerOf, storeOf, descOf
    coins.js          Münzen: coinAdd, Münzbuch (coinLog), coinSums
    trade.js          Markt (Preise, Sättigung, Verlauf), Händler-Schiffe, Handel beim Anlegen, Handelsaufträge
    ptrade.js         Getrennte Inseln: Preislisten der Handelskontore, Handel zwischen Spielern
    privacy.js        Getrennte Inseln: was jeder Spieler sehen darf (Gebäude, Schiffe, Inseln, Bäume, Rohre, Anfragen)
    events.js         Ereignisse: Planung aus Seed + Zähler, Ankündigung, Wirkungen, Schäden, Reparatur
    wonder.js         Weltenleuchtturm: Baustelle je Stufe (Bänder, Inselinventar), Freigabe, Bauen, Sichtweite, Abschluss
    drones.js         Drohnenhafen und Drohnenkiste: Aufträge, Flüge, Reparaturen
    demo.js           Demo-Fabrik für den Titelbildschirm aufbauen (buildDemo) und nachfüllen (demoTick)
    host.js           fester 0,05-s-Takt, Snapshots (Worker und Hauptthread); Nachrichten init, demo, new, load, import, save …, Koop: addView, view, busy, idle
    views.js          Koop: schlanke Snapshots je Mitspieler (nur Änderungen, Sichtbereich), world-Nachricht
    snapshot.js       Snapshot bauen/anwenden, Spiegel im Hauptthread
    worker.js         Worker-Einstieg
  save/               serialize.js (Format, Version, Migration), storage.js (mehrere Spielstände in IndexedDB/localStorage, Übernahme aus „workscape“)
  net/                Koop (siehe „Koop (Version 13)“)
    protocol.js       Nachrichten ↔ Binärdaten (JSON + Typed Arrays, deflate ab 400 Byte, Zerlegen in 16-KB-Stücke)
    peer.js           Verbindungen: PeerJS (Lobby-Code) und manuell (zwei Codes), gleiche Hülle Conn; Debug-Schalter netDebug
    session.js        Sitzung: Profil, Lobby, Beitritt, Versionsprüfung, Ping, Abbrüche, Chat, Markierungen, Zustand der Mitspieler
    remote.js         Mitspieler-Seite: Kommandos an den Host, world/snap in den Spiegel, Bauvorschau bis zur Bestätigung
    version.js        Spielversion, SAVE_VERSION und Prüfwert der Datentabellen
  gfx/                Pixelpuffer, Sprites, Kamera, Renderer
    ground.js         Boden eines Chunks malen (zeilenweise, über mehrere Bilder verteilt)
    fog.js            Wolkendecke eines Chunks malen
    chunks.js         Cache der Chunk-Bilder (LRU), Zeitbudget je Bild
    sprites/ui.js     Symbole der Oberfläche (Knopfleiste, Kategorien, Zahnrad, Zoom, Flaggen, Tempo, Aufwerten, Blaupause, Status, Pfeile)
    status.js         Statusansicht: Status und Produkt je Produktionsgebäude (statusOf)
    peers.js          Koop: Mauszeiger und Bauvorschau der Mitspieler, eigene unbestätigte Bauten, Markierungen, Rahmen auf Minimap/Kartenansicht
    sprites/sea.js    Treibgut, Wrack, Kisten an Deck, Zielmarke, Abbrechen-Symbol
    sprites/endgame.js Münze, Schraubenschlüssel, Ereignis-Symbole, Händler-Schiffe, Handelsposten, Leuchtturm (Phasen 0–4, Gerüst), Drohnenhafen, Drohnenkiste, Drohne
    sprites/npc.js    NPC-Stege (Ole, Brann, Aurel), Dorfgebäude, Figuren am Steg
    sprites/fluids.js Rohre (3 Stufen × 16 Verbindungen), Pumpe, Tank, Dampfkraftwerk, Saugpumpe, Reaktor, Geothermie, Ingenieurhaus, Multi-Bohrer, Abfüllanlage, Entleerer
  ui/                 Oberfläche (siehe unten); neu: menu.js (Titelbildschirm, Pausenmenü, Neues Spiel, Spiel laden), mapview.js (Kartenansicht M),
                      coop.js (Koop-Menü, Lobby, Beitritt, Beitrittsanfrage), chat.js (Chat unten links), marks.js (Markierungs-Menü, Pfeile am Rand),
                      story.js (Geschichte: Szenen und Dialoge abspielen, Warteschlange, Entscheidung, Story-Zeile), dialog.js (Dialogfenster)
  cutscene/           kit.js (Zeichenhilfen für Szenen und Porträts), stage.js (Bühne #cine), player.js (Cutscene-Player), motifs.js (Leitmotive: Blitz, Wappen, Siegel)
  cutscenes/          eine Datei je Szene (cs_prolog.js, cs_npc_ole.js, cs_npc_brann.js …), index.js (Liste)
  data/dialogs/       Dialogtexte je Figur (ole.js, brann.js, aurel.js, story.js), index.js (Format, Sprecher, Auswahl)
  input/              Maus, Touch, Tastatur (Karte, Kamera, R, Q, Strg-Kürzel, Leertaste, +/−; die übrigen Kürzel in ui/hotbar.js)
  styles/main.css     eigenes CSS (ersetzt Tailwind)
tools/check-skilltree.mjs  Prüfskript für den Skilltree (npm run check:tree)
tools/check-world.mjs      Prüfskript für die Welt-Erzeugung (npm run check:world; Vergleichswerte von Version 13 in tools/world-v13.json)
tools/check-coop.mjs       Prüfskript für Getrennte Inseln (npm run check:coop)
tools/check-story.mjs      Prüfskript für die Geschichte: Akt 1 mit echtem Segeln, Debug, Speichern, Migration (npm run check:story)
```

## Oberfläche

Die Karte (`canvas#world`) füllt das ganze Fenster. Alles andere schwebt als Pergament-Panel darüber
(`#hud`, der Container selbst lässt Klicks zur Karte durch, die Panels fangen sie ab).

| Bereich | Element | Modul |
|---|---|---|
| Obere Leiste: Logo, Ruhm (Stufe), Bewohner (versorgte / alle), Münzen (Tooltip: Einnahmen/Ausgaben 15 min), angekündigtes Ereignis mit Countdown, Insel unter der Kamera (Klick: Inselliste), Uhr, Zahnrad-Menü (mit Ereignisse aus/sanft/normal) | `#topbar` | `ui/hud.js` |
| Rechts oben über dem Ziel: laufende Ereignisse (Name, Restzeit, Wirkung) | `#evBar` | `ui/hud.js` |
| Obere Leiste rechts: „Pausiert“, Tempo-Knöpfe Pause/1×/2×/3× | `#pausedBadge`, `#speedBtns` | `ui/speed.js` |
| Links oben: Inselinventar der Insel unter der Kamera mit Raten, Item-Popover | `#invPanel`, `#invPop` | `ui/inventory.js` |
| Links unten: Gebäude/Feld, nur bei Auswahl | `#insights` | `ui/insights.js` |
| Rechts oben: nächstes Ziel (einklappbar); mit Geschichte Kopf „Akt n“ und Story-Satz über dem Aufbau-Ziel | `#goalCard` | `ui/hud.js`, `ui/story.js` |
| Rechts darunter: Minimap (einklappbar, Mausrad = Maßstab, Klick = Kamera) | `#miniMap` | `ui/minimap.js` |
| Rechts unten: Zoom, zur Insel zurück | `#mapTools` | `input/input.js` |
| Unten mittig: Knopfleiste + Baumenü | `#hotbar`, `#buildBar` | `ui/hotbar.js`, `ui/buildmenu.js` |
| Großes Fenster (Forschung, Flotte, Statistik, Markt, Blaupausen) | `#win` | `ui/windows.js` + `ui/skilltree.js`, `ui/fleet.js`, `ui/stats.js`, `ui/market.js`, `ui/blueprints.js` |
| Haken/X über der Kontor-Vorschau | `#foundBtns` | `ui/ships.js` |
| Dialoge „Insel benennen“, „Blaupause speichern“, „Tastenkürzel“ | `#modal` | `ui/islandname.js`, `ui/blueprints.js`, `ui/hotbar.js` |
| Tooltips | `#tooltip` | `ui/tooltip.js` |
| Höhen/Abstände der Overlays | – | `ui/layout.js` |

Weitere Module: `ui/panels.js` (Gesamt-Neuzeichnen, Baumodus `setMode`, Klicks im Info-Panel), `ui/ships.js` (Schiffsauswahl, Status, Laderäume,
Kontor gründen, Route anlegen; gemeinsam für Flotten-Fenster, Info-Panel und Eingabe),
`ui/common.js` (`setHTML`, `patchList`, `uiBusy`, Kostenanzeige), `ui/context.js` (Spiegel `game`, Oberflächen-Zustand `ui`, Zug-Nummern `newGrp`),
`ui/tools.js` (Aufwerten, Statusansicht, Rückgängig/Wiederholen, Pipette), `ui/speed.js` (Spieltempo), `ui/blueprints.js` (Blaupausen).

- **Neu zeichnen:** Alle 500 ms und nach Änderungen. `setHTML` setzt `innerHTML` nur, wenn sich der Text geändert hat,
  `patchList` gleicht Listen (Lagerzeilen, Kategorien, Gebäude-Slots) Zeile für Zeile ab. Solange eine Maustaste in einem Panel
  gedrückt ist oder ein Select offen ist (`uiBusy`), wird dort nicht neu gezeichnet.
- **Tastenkürzel:** siehe „Komfortfunktionen → Tastenkürzel“ (die Tabelle steht auch im Spiel: Zahnrad → „Tastenkürzel“, Daten in `KEYS`, `ui/hotbar.js`).
  Esc schließt der Reihe nach: Blaupause platzieren/Auswahl → Kontor gründen/Route anlegen → Kamera folgt Schiff → Popover/Menü → Fenster → Bau-/Abriss-/Aufwerten-Modus → Baumenü → Auswahl.
  In Eingabefeldern und Selects wirken keine Kürzel (Enter verlässt ein Textfeld und übernimmt den Wert).
- **Neue Baukategorie:** Eintrag in `BUILD_CATS` (`src/data/buildings.js`, mit `id`, `name`, `icon`) und `cat: '<id>'` an den Gebäuden.
  Kategorien ohne Gebäude werden ausgeblendet (z. B. „Flüssigkeiten“). `icon` ist ein Schlüssel in `SPR.icon`.
- **Neues Symbol:** Funktion in `src/gfx/sprites/ui.js` (Pixel-Vorlage mit `fromTpl`), in `buildSprites()` (`src/gfx/sprites.js`) als `SPR.icon.<name>` eintragen.
- **Neues Fenster:** `registerWindow(id, { title, icon, side, render(body), wire(body) })` in einem eigenen Modul unter `src/ui/`,
  das Modul in `main.js` importieren, Knopf in `HOTBAR` (`ui/hotbar.js`) ergänzen. `side: true` = Seitenpanel rechts, sonst zentriert.
  `big: true` = großes Fenster (92 % der Fläche, so wie der Skilltree), `onOpen`/`onClose` werden beim Öffnen und Schließen aufgerufen.
- **Tooltips:** `data-tip="name:arg"` am Element und `registerTip('name', (arg, el) => html)`.
- **Gespeicherte UI-Einstellungen** (`state.ui`): `infoCollapsed`, `invCollapsed`, `goalCollapsed`, `buildCat`, `miniCollapsed`, `miniScale`, `statusView` (Statusansicht an), `tree` (Ansicht des Skilltrees: Mitte `x`/`y`, Zoomstufe `z`, Detailspalte offen `detail`). Neue Felder in `freshUI()` (`src/sim/state.js`) eintragen; beim Laden werden fehlende Felder ergänzt.
- **Kleine Bildschirme:** Ab 1024×640 ist alles vollständig sichtbar. Darunter starten Lager und Info-Panel eingeklappt,
  die Knopfleiste zeigt unter 1320 px Breite nur Symbole; Touch-Ziehen und -Bauen funktionieren wie bisher.
  Passt die Knopfleiste trotzdem nicht in die Breite, fallen erst die Tasten weg (`tight`, die Taste steht im Tooltip), dann die Namen (`compact`, `layout()` in `ui/layout.js`).

## Produktionsstatistik

Die Simulation zählt je Insel und Item (`src/sim/stats.js`, gespeichert in `state.flow`):

- **erzeugt** (`p`): ins Lager-Netzwerk gelangt – über Bänder (`band`), Schiffsentladung (`schiffe`, auf Routen und von Hand) oder als Plan von Häusern (`haeuser`). Rückerstattungen und der Testmodus zählen nicht.
- **verbraucht** (`c`): aus dem Lager genommen – Häuser (`haeuser`), Baukosten (`bauen`), Schiffbau (`schiffbau`), Forschung (`forschung`),
  Schiffsbeladung (`schiffe`, auf Routen und von Hand), Lager-Ausgabe auf Bänder (`ausgabe`), Verbrennung des Überlaufs (`verbrennung`, zählt dann auch als erzeugt).
- **Produktion** (`m`): Ausgabe der Gebäude (`addOut`), je Gebäudetyp, auch wenn sie nicht ins Lager geht. Pläne der Häuser stehen hier unter `haeuser`.

Welches Gebäude ein Item auf dem Band erzeugt hat, ist im Lager nicht bekannt. Die Aufschlüsselung „Erzeugt von“ zeigt deshalb die
Produktion je Gebäudetyp (plus Schiffe). Gespeichert wird in 30 Fächern zu 30 s Spielzeit (15 min). „Pro Minute“ ist die Summe der
letzten 60 s (laufendes Fach ganz, das vorletzte anteilig). In den Snapshot kommt die Statistik höchstens einmal pro Sekunde.
Neue Quellen: `flowAdd(g, insel, 'p'|'c'|'m', item, n, quelle)` aufrufen und den Namen/das Symbol in `SRC` (`src/ui/stats.js`) ergänzen.

Datenfluss: Die UI ändert den Zustand nur über Kommandos (`send({type:'place', …})`).
Die Simulation antwortet mit Snapshots, in denen auch Ereignisse stehen
(`placed`, `removed`, `fail`, `researched`, `goal`, `shipLaunched`, `shipGoto`, `loot`, `kontorFounded`, `discovered`, `mapped`, `jettison`). Daraus macht `main.js` die Toasts,
die Zielmarke und den Dialog „Insel benennen“.
Die Produktionsstatistik (`flow`) steckt höchstens einmal pro Sekunde im Snapshot.
Der Hauptthread hält einen Spiegel des Zustands (`ui/context.js` → `game`).
Renderer und Vorschau (`checkPlace`) lesen nur diesen Spiegel.

## Neues hinzufügen

Alle Zahlen stehen in Tabellen unter `src/data/`, nicht im Code.

- **Item:** Eintrag in `ITEMS` (`src/data/items.js`, mit `name`, Brennwert `burn` und Art `kind`: `roh`, `nahrung`, `zwischen`, `end`, `plan`).
  Die Reihenfolge ist `ITEM_ORDER` (Lager-Panel, Statistik, Auswahllisten). Symbol in `src/gfx/sprites/items.js` (`makeItemIcon`, 10–12 px mit Kontur),
  Kistenfarbe für Schiffe in `ITEM_COL` (`src/gfx/sprites/sea.js`). Items der Art `plan` werden beim Abriss nicht erstattet.
- **Rezept:** Eintrag in `RECIPES` (`src/data/recipes.js`): `{ id, b: Gebäudetyp, in: { item: n }, out: { item: n }, t: Sekunden, power }`.
  `power: 0` = ohne Strom, `{ need: n }` = braucht n Strom/s (ohne Strom Stillstand), `{ opt: n }` = läuft ohne Strom, mit n Strom/s doppelt so schnell.
  Optional `name`/`icon` für die Rezeptauswahl. Hat ein Gebäude mehrere Rezepte, ist das erste Standard. Mehr ist nicht nötig: Annahme vom Band,
  Puffer, Status, Info-Panel, Stromanschluss und Statistik ergeben sich aus der Tabelle.
- **Gebäude:**
  1. Eintrag in `src/data/buildings.js` (`BD`, mit Name, Mehrzahl `pl` für die Rückgängig-Beschriftungen, Kategorie `cat` aus `BUILD_CATS`, `stufe`, Größe, Kosten, `desc` für den Tooltip und optional `tech`) und in `BUILD_ORDER` (Reihenfolge = Tasten 1–9 innerhalb der Kategorie).
     Freischalt-Quelle: `tech` (Forschung) **oder** ein Eintrag in `UNLOCKS` (`src/data/unlocks.js`, Volk oder Story) **oder** nichts (Start). Beides zugleich meldet `npm run check:tree`.
     Soll es sich aufwerten lassen: Eintrag in `UPGRADE_TO` (gleiche Größe wie die Stufe davor).
  2. Sprite in `src/gfx/sprites/buildings.js`, registriert in `buildSprites()` (`src/gfx/sprites.js`). Eine Liste von Bildern wird im Betrieb abgespielt (`fps` am ersten Bild).
     Zusätze am Sprite: `sm` (Rauch, `smDark` = dunkel), `fire`, `glow` (Licht bei Nacht, `glowCol` = Farbe im Betrieb), `lit` (Rechtecke, die im Betrieb leuchten).
  3. Verhalten: Verarbeitung über Rezepte (siehe oben); Sonderfälle in `src/sim/production.js` (`PRODUCTION_TICKS`).
  4. Strom: Gebäude mit Rezepten oder Bohrer mit `power` lassen sich automatisch verkabeln (`POWER_USE` wird aus den Tabellen berechnet).
- **Bohrer:** `DRILLS` in `src/data/mining.js` (`rate` je Feld, `power`, Ausgabepuffer `buf`) plus Eintrag in `BD`. Vorrang der Vorkommen: `rank` in `ORES` (`src/data/items.js`).
- **Haus:** `HOUSES` in `src/data/mining.js` (`pop`, `need` je Prüfung, `gives` = Plan-Item), Prüfabstand `HOUSE_EVERY`, plus Eintrag in `BD`.
- **Forschung und Upgrades:** Eintrag in `src/data/tech.js` (`TECH`), der Skilltree ordnet ihn selbst ein. Details siehe „Skilltree (Version 8)“.
- **Flüssigkeit:** Eintrag in `FLUIDS` (`src/data/fluids.js`, mit `name` und Farben `col`/`hi`/`dk`). Symbol (Tropfen) und Farbe im Rohr ergeben sich daraus.
  Flüssigkeiten sind keine Items: Sie liegen nur in Rohrnetzen, Tanks und Gebäudepuffern. Rezepte nutzen sie über `fin`/`fout` (siehe unten).
- **Rohr:** Eintrag in `PIPES` (`tier`, `rate`, optional `acid`) plus Eintrag in `BD` (Kategorie `fluessig`). Farben in `PIPE_PAL` (`src/gfx/sprites/fluids.js`).
- **Flüssigkeits-Gebäude:** in `FLUID_BUILDINGS` (`src/data/fluids.js`) aufnehmen, dann verbinden sich Rohre mit ihm. Welche Flüssigkeit es nimmt oder abgibt, steht in `fluidPorts` (`src/sim/fluids.js`):
  Pumpen über `PUMPS`, Rezeptgebäude über `fin`/`fout` ihres Rezepts, Kraftwerk und Multi-Bohrer über ihr `water`.
- **Ziele:** `src/data/goals.js`. Die Simulation prüft sie der Reihe nach und merkt sich das nächste offene Ziel in `state.goal`.

## Wirtschaft

Belt-Grundtakt: Fließband Mk1 = 1 Item/s, Schnellband (Mk2, aus Stahl) = 2 Items/s, Hochleistungsband (Mk3, Stahl + Kunststoff) = 4 Items/s. Splitter, Überlauf-Tor und Brücke laufen so schnell wie das Band,
von dem das Item kam (ohne Eingangsband, z. B. direkt aus einem Gebäude: Mk1-Tempo).

### Rohstoffe und Abbau (`data/mining.js`, `ORES` in `data/items.js`)

| Gebäude | Größe | Leistung | Strom |
|---|---|---|---|
| Sägewerk | 2×2 | 0,1 Holz/s je reifem Baum | – |
| Fischerhütte | 2×2 | bis 0,3 Fisch/s | – |
| Bohrer Mk1 | 2×2 | 0,08/s je Feld (max. 0,32/s) | – |
| Bohrer Mk2 | 2×2 | 0,2/s je Feld (max. 0,8/s) | 4/s, ohne Strom Stillstand |

**Mehrheitsregel** (`drillInfo` in `sim/buildings.js`): Ein Bohrer zählt unter seiner Fläche die Felder je Vorkommen und fördert das mit den meisten Feldern,
bei Gleichstand das seltenere (Neodym-Erz > Schwefel > Kupfererz > Eisenerz > Kohle > Kalkstein > Quarzsand). Leistung = Grundrate × Felder dieses Vorkommens.
Jedes Sand- und Strandfeld ist Quarzsand, zählt aber nur, wenn unter dem Bohrer kein anderes Vorkommen liegt. Öl kann kein Bohrer fördern,
das macht die Saugpumpe (siehe „Flüssigkeiten und Rohre“); liegt nur Öl darunter, lässt sich der Bohrer nicht bauen.
Bauvorschau und Info-Panel zeigen gefördertes Vorkommen, Felder, Leistung und „ignoriert: 1× Kalkstein“. Ausgabepuffer: 10.

### Rezepte (`data/recipes.js`)

| Gebäude | Eingang | Ausgang | Zeit | Strom/s |
|---|---|---|---|---|
| Schmelzofen | 2 Eisenerz + 1 Kohle | 2 Eisenbarren | 6 s | – |
| | 2 Kupfererz + 1 Kohle | 2 Kupferbarren | 6 s | – |
| | 2 Kalkstein + 1 Quarzsand + 1 Kohle | 3 Ziegel | 6 s | – |
| | 3 Quarzsand + 1 Kohle | 2 Glas | 6 s | – |
| Drahtzieherei | 1 Kupferbarren | 2 Kupferdraht | 3 s | optional 1 |
| Werkzeugmacher | 1 Eisenbarren + 1 Holz | 1 Werkzeug | 5 s | optional 2 |
| Induktionsofen | 2 Eisenbarren + 1 Kohle | 1 Stahlbarren | 4 s | 4 (nötig) |
| Graphit-Presse | 3 Kohle | 1 Graphit | 4 s | 3 (nötig) |
| Silizium-Ofen | 2 Quarzsand + 1 Graphit | 1 Silizium | 6 s | 6 (nötig) |
| Assembler | 1 Silizium + 2 Kupferdraht | 1 Mikrochip | 8 s | 4 (nötig) |
| Pyrolyse-Ofen | 4 Kohle | 1 Teer | 6 s | 3 (nötig) |
| | 8 Holz | 1 Teer | 6 s | 3 (nötig) |

So läuft ein Rezept (`tickRecipe` in `sim/production.js`):

- Gebäude nehmen von Bändern nur Zutaten des aktiven Rezepts an, je Zutat bis zum Doppelten der Rezeptmenge (mindestens 5, `IN_MIN`).
- Ein Durchgang startet, wenn alle Zutaten im Puffer liegen und für jedes Produkt Platz ist (Ausgangspuffer `OUT_CAP` = 10 je Produkt). Die Zutaten werden beim Start entnommen,
  die Produkte am Ende in den Ausgangspuffer gelegt und von dort auf wegführende Bänder gegeben.
- Strom wird nur während eines laufenden Durchgangs gezogen. `opt`: läuft ohne Strom, mit Strom `OPT_BOOST` (2×) so schnell.
- Umschalten (Info-Panel, Kommando `setRecipe`): Ein laufender Durchgang gibt seine Zutaten in den Puffer zurück. Zutaten, die das neue Rezept nicht braucht, bleiben im Puffer
  („Rest im Puffer“) und blockieren nichts.
- Status im Info-Panel: „Produziert“, „Wartet auf: 1 Kohle“, „Ausgabe voll“, „Kein Strom“, dazu Fortschritt, Puffer, Leistung pro Minute (Ein- und Ausgang) und Stromverbrauch.
- Sägewerk, Fischer, Bohrer, Häuser, Lager, Verbrennung und Werft haben eigene Ticks.

### Gebäude und Baukosten (`data/buildings.js`)

| Stufe | Gebäude | Kategorie | Größe | Kosten | Forschung |
|---|---|---|---|---|---|
| 1 | Fließband | Logistik | 1×1 | 1 Holz | – |
| 1 | Splitter / Überlauf-Tor / Brücke | Logistik | 1×1 | 2 / 3 / 3 Holz | – |
| 1 | Lagerhalle | Logistik | 3×3 | 50 Holz | – |
| 1 | Sägewerk | Abbau | 2×2 | 25 Holz | – |
| 1 | Fischerhütte | Abbau | 2×2 | 30 Holz | – |
| 1 | Bohrer Mk1 | Abbau | 2×2 | 50 Holz | – |
| 1 | Schmelzofen | Verarbeitung | 2×2 | 40 Holz + 20 Kalkstein | – |
| 1 | Hütte | Wohnen | 2×2 | 20 Holz | – |
| 1 | Werft | Schifffahrt | 3×3 | 150 Holz + 30 Eisenbarren | – |
| 2 | Drahtzieherei | Verarbeitung | 2×2 | 30 Holz + 10 Eisenbarren | kupfer |
| 2 | Werkzeugmacher | Verarbeitung | 2×2 | 40 Holz + 10 Eisenbarren | handwerk |
| 2 | Bürgerhaus | Wohnen | 2×2 | 30 Ziegel + 10 Eisenbarren + 10 Glas | handwerk |
| 2 | Verbrennungsanlage | Energie | 2×2 | 20 Ziegel + 10 Eisenbarren | strom |
| 2 | Strommast | Energie | 1×1 | 2 Holz + 2 Kupferdraht | strom |
| 2 | Batterie | Energie | 1×1 | 20 Eisenbarren + 20 Kupferdraht | strom |
| 3 | Induktionsofen | Verarbeitung | 2×2 | 40 Ziegel + 20 Kupferdraht | stahl |
| 3 | Graphit-Presse | Verarbeitung | 2×2 | 20 Stahl + 20 Eisenbarren | graphit |
| 3 | Schnellband | Logistik | 1×1 | 1 Stahlbarren | schnellband |
| 4 | Silizium-Ofen | Verarbeitung | 2×2 | 40 Ziegel + 20 Stahl + 10 Graphit | halbleiter |
| 4 | Assembler | Verarbeitung | 3×3 | 30 Stahl + 30 Kupferdraht + 10 Graphit + 2 Baupläne | montage |
| 4 | Bohrer Mk2 | Abbau | 2×2 | 20 Stahl + 5 Silizium | tiefbohrung |
| 5 | Pyrolyse-Ofen | Verarbeitung | 2×2 | 30 Ziegel + 20 Stahl | pyrolyse |

Schiff 80 Holz + 20 Eisenbarren, Kontor gründen 40 Holz an Bord. Abriss: Bänder 100 %, sonst 50 %, Pläne werden nicht erstattet.
Strom liefern Verbrennungsanlage, Dampfkraftwerk und Geothermie-Generator (die beiden letzten siehe „Flüssigkeiten und Rohre“).
Die Verbrennungsanlage verbrennt alles Brennbare nach Brennwert, auch den Überlauf voller Lager.

### Häuser liefern Pläne (`HOUSES` in `data/mining.js`)

| Haus | Bewohner | Bedarf je 60 s | Ergebnis |
|---|---|---|---|
| Hütte | 2 | 2 Fisch + 1 Holz | 1 Skizze |
| Bürgerhaus | 4 | 2 Fisch + 1 Werkzeug + 1 Glas | 1 Bauplan |

Jedes Haus prüft gleich nach dem Bau und dann alle 60 s das Lager seiner Insel. Gedeckt: Bedarf wird entnommen, 1 Plan kommt ins Lager
(Statistik: erzeugt, Quelle „Häuser“). Nicht gedeckt: „unversorgt“, nichts entsteht. Ist im Lager kein Platz für den Plan, wird nichts entnommen („Lager voll“).
Das Info-Panel zeigt Bedarf mit Lagerbestand, versorgt ja/nein, Zeit bis zur nächsten Prüfung und die erzeugten Pläne. Schaltpläne liefert das Ingenieurhaus (siehe „Flüssigkeiten und Rohre“).
Häuser lassen sich aufwerten (Hütte → Bürgerhaus → Ingenieurhaus); Zähler und erzeugte Pläne bleiben dabei erhalten.

### Forschung und Ruhm (`data/tech.js`)

| id | Name | Stufe | Ast | Kosten | Voraussetzung | Schaltet frei |
|---|---|---|---|---|---|---|
| ofenbau | Ofenbau | 2 | Verarbeitung | 2 Skizzen + 30 Holz | – | Schmelzofen |
| bandtechnik | Bandtechnik | 2 | Logistik | 2 Skizzen + 40 Holz | – | Splitter, Kreuzung, Extraktor |
| schiffbau | Schiffbau | 2 | Schifffahrt | 4 Skizzen + 20 Eisenbarren | ofenbau | Werft, Handelskontor |
| kupfer | Kupferverarbeitung | 2 | Verarbeitung | 5 Skizzen + 20 Kupferbarren | ofenbau | Drahtzieherei |
| strom | Elektrizität | 2 | Energie | 10 Skizzen + 30 Kupferdraht | kupfer | Verbrennungsanlage, Strommast, Batterie |
| handwerk | Handwerk | 2 | Wohnen | 10 Skizzen + 30 Eisenbarren | ofenbau | Werkzeugmacher, Bürgerhaus |
| stahl | Stahlerzeugung | 3 | Verarbeitung | 20 Skizzen + 40 Ziegel | strom | Induktionsofen |
| graphit | Graphit | 3 | Verarbeitung | 10 Skizzen + 20 Stahl | stahl | Graphit-Presse |
| schnellband | Schnellbänder | 3 | Logistik | 15 Skizzen + 30 Stahl | stahl, Plan von Brann | Schnellband |
| halbleiter | Halbleiter | 4 | Verarbeitung | 10 Baupläne + 30 Stahl + 20 Graphit | graphit, handwerk | Silizium-Ofen |
| montage | Montage | 4 | Verarbeitung | 10 Baupläne + 20 Silizium | halbleiter | Assembler |
| tiefbohrung | Tiefbohrung | 4 | Abbau | 8 Baupläne + 30 Stahl | stahl, handwerk | Bohrer Mk2 |
| pyrolyse | Pyrolyse | 5 | Chemie | 15 Baupläne + 20 Mikrochips | montage | Pyrolyse-Ofen |

Kosten kommen aus den Lagern aller Inseln. Es gibt keine XP-Kosten und keine Bewohner-Grenze mehr. Die Forschungen stehen im Skilltree (siehe „Skilltree (Version 8)“),
dort auch die 12 Upgrades.

**Ruhm** (früher XP, `state.xpTotal`, Stufen wie bisher): je abgeschlossener Forschung Stufe × 50 (`FAME_TECH`), je erreichtem Ziel +30 (`FAME_GOAL`).
Ruhm ist keine Währung. Häuser erzeugen keinen Ruhm.

### Ziele, Funde, Testmodus

- **Ziele** (`data/goals.js`, Stand Version 15): Sägewerk mit Band ins Kontor → Fischerhütte → Hütte (erste Skizze) → Bohrer auf Kohle und Eisenerz → Ofenbau erforscht → Schmelzofen (erste Eisenbarren)
  → Schiffbau, Werft und Schiff → Kupferverarbeitung → Strom (Verbrennungsanlage + Mast) → erster Stahlbarren → Kontor auf einer zweiten Insel (Ole) → Dampfkraftwerk läuft (Plan von Brann) → Bürgerhaus versorgt (erster Bauplan) → erster Mikrochip
  → erstes Rohöl → erster Kunststoff → erster Schaltplan → erster Supermagnet → Multi-Bohrer läuft
  → Handelsposten gebaut → erster Verkauf → 5.000 Münzen besessen → Drohnenhafen in Betrieb. Die Leuchtturm-Ziele gibt es seit Version 16 nicht mehr; der Turm gehört zur Geschichte (Story-Zeile über den Zielen).
  Die Endgame-Ziele geben zusätzlich Münzen (`coins` am Ziel, Posten „Ziele“ bzw. „Leuchtturm“).
- **Funde:** Wracks in Ring 2 enthalten mit 30 % zusätzlich 2–5 Skizzen, in Ring 3 mit 30 % 1–3 Baupläne und zusätzlich mit 15 % 1–2 Schaltpläne (`bonus` in `FIND_LOOT`, eine Liste; jeder Eintrag wird für sich gewürfelt).
- **Münzen aus Wracks:** ab Ring 2 bringt ein Wrack mit 25 % zusätzlich 50–200 Münzen (`WRECK_COINS` in `data/trade.js`), beim ersten Bergen.
- **Testmodus** („Alles freischalten“): alles erforscht, was ohne Volk geht (Forschungen mit fehlendem Plan und alles dahinter bleiben offen, Volk- und Story-Freischaltungen setzt er nicht; dafür `tideworks.unlockAll()`), Lager jeder Insel mit Kontor bis zur Kapazität (auch Kunststoff, Schmiermittel, Neodym und Supermagnete), Pläne je 100 (innerhalb der Kapazität; reicht für alle Leuchtturm-Phasen), +1.000 Ruhm, +50.000 Münzen.

## Flüssigkeiten und Rohre

Zahlen in `data/fluids.js` (Flüssigkeiten, Rohre, Pumpen, Kraftwerke), Logik in `sim/fluids.js` (Netze) und `sim/production.js` (Gebäude).

### Flüssigkeiten

| ID | Name | Farbe | Herkunft |
|---|---|---|---|
| `wasser` | Wasser | hellblau | Wasserpumpe am Meer (10/s) |
| `rohoel` | Rohöl | schwarzbraun, glänzend | Saugpumpe auf Öl (1,25/s je Ölfeld, höchstens 5/s) |
| `saeure` | Schwefelsäure | gelbgrün | Reaktor (Schwefel + Wasser) |

Flüssigkeiten werden in Einheiten gemessen. Sie kommen nicht ins Lager-Netzwerk; verschifft werden sie in Fässern (siehe „Fässer“).
Neue Items: Kunststoff, Schmiermittel (Kanister), Neodym (violett-silberner Barren), Supermagnet (Hufeisen).

### Rohrnetz

- Rohre liegen auf einer **eigenen Felderebene** (`g.pipes`, `PipeLayer` in `world/layers.js`, Stufe 1–3 je Feld). Ein Feld kann ein Rohr **und** ein Band, einen Splitter, ein Überlauf-Tor oder eine Brücke tragen.
  Das Rohr wird darunter gezeichnet, seine Ränder bleiben sichtbar. Unter Gebäuden mit Grundfläche sind Rohre nicht erlaubt (und umgekehrt).
- Rohre verbinden sich selbst in 4 Richtungen und mit angrenzenden Flüssigkeits-Gebäuden. Sie werden nicht gedreht und wie Bänder **gezogen** (gedrückt halten). Rückerstattung beim Abriss 100 %.
- **Abriss:** Auf einem Feld mit Band und Rohr entfernt der erste Klick das Band, der zweite das Rohr. Mit **Umschalt** nur das Rohr. Beim Ziehen zählt jedes Feld einmal.
- **Netz** = zusammenhängende Rohr- und Tankfelder. Es führt genau eine Flüssigkeit (die erste, die hineinkommt; leer = frei). Speicher: 10 je Rohrfeld (`PIPE_CAP`) + 500 je Tank (`TANK_CAP`).
- **Durchsatz** = Tempo des langsamsten Rohrs: Mk1 (Kupfer) 20/s, Mk2 (Stahl) 50/s, Mk3 (Kunststoff + Glas) 100/s; ein Netz nur aus Tanks 100/s.
  Erzeuger schieben bis zu diesem Wert ins Netz (begrenzt durch freien Speicher), Verbraucher ziehen. Reicht es nicht für alle, wird anteilig verteilt (Rein und Raus je für sich begrenzt).
- **Säure** fließt nur in Netzen, die ganz aus Mk3 bestehen. Sonst zeigt das Gebäude „Säure braucht säurefeste Rohre (Mk3)“.
- **Schutz der Netze** (siehe „Rohrnetz-Schutz“ unten): Bauen, das zwei gefüllte Netze mischen oder ein Säurenetz verderben würde, wird abgelehnt.
- Ein Gebäude kann an mehreren Netzen hängen: Es zieht jede benötigte Flüssigkeit aus einem angrenzenden Netz mit dieser Flüssigkeit und gibt seine Ausgabe in ein Netz mit derselben Flüssigkeit oder in ein leeres.
- Flüssigkeits-Gebäude, die sich direkt berühren, sind **nicht** verbunden; dazwischen gehört ein Rohr (oder ein Tank).
- Netze werden bei Bau und Abriss von Rohren und Flüssigkeits-Gebäuden neu berechnet (Versionszähler `g.pipeVer`); der Inhalt wird anteilig auf die neuen Netze verteilt.
  Würden trotzdem Netze mit verschiedenen Flüssigkeiten zusammenkommen (Sicherheitsnetz, z. B. alte Spielstände), bleibt die größere Menge, der Rest geht verloren.
- **Info-Panel** (Rohrfeld, Band über Rohr oder Tank anklicken): Flüssigkeit, Füllstand/Speicher, Durchsatz aktuell/max, langsamstes Rohr, säurefest, Erzeuger und Verbraucher, Knopf „Netz leeren“.
- Darstellung: Kupfer-, Stahl- und weiß-graue Rohre mit Kunststoffringen, Muffen an den Feldrändern, ein dünner Streifen in der Farbe der Flüssigkeit, wenn das Netz gefüllt ist (Glanzpunkte wandern, solange etwas fließt).
- Snapshot: geänderte Chunks der Rohrebene, `pipeVer` und der Inhalt der Netze (`fnets`, Schlüssel = kleinster Feldschlüssel des Netzes). Der Spiegel berechnet die Netze selbst.

### Rezepte mit Flüssigkeiten

Rezepte haben optional `fin`/`fout` (Flüssigkeit → Einheiten je Durchgang). `fin` wird während des Durchgangs anteilig verbraucht; fehlt es, pausiert der Fortschritt („Wartet auf: Wasser“).
`fout` kommt am Ende des Durchgangs in den Ausgangspuffer; ist dort kein Platz, startet kein neuer Durchgang („Ausgabe voll“). Gebäudepuffer = 2 × Rezeptmenge (`FLUID_BUF`).
Info-Panel und Statistik zeigen Flüssigkeiten wie Items (Einheiten/min).

| Gebäude | Eingang | Ausgang | Zeit | Strom/s | Forschung |
|---|---|---|---|---|---|
| Chemischer Reaktor | 2 Teer + 10 Wasser | 1 Schmiermittel | 6 s | 6 | chemie |
| | 10 Rohöl | 2 Schmiermittel | 6 s | 6 | chemie |
| | 10 Rohöl + 1 Kohle | 2 Kunststoff | 6 s | 6 | chemie |
| | 1 Schwefel + 10 Wasser | 10 Schwefelsäure | 4 s | 6 | chemie |
| | 2 Neodym-Erz + 10 Schwefelsäure | 1 Neodym | 8 s | 6 | chemie |
| Assembler | 2 Neodym + 1 Stahlbarren | 1 Supermagnet | 10 s | 4 | magnete |
| Werkzeugmacher | 2 Eisenbarren | 1 Leeres Fass | 4 s | optional 2 | faesser |
| Abfüllanlage | 1 Leeres Fass + 50 Wasser / Rohöl / Säure | 1 Wasser-, Öl- bzw. Säurefass | 2 s | 1 | faesser |
| Entleerer | 1 Wasser-, Öl- bzw. Säurefass | 1 Leeres Fass + 50 Wasser / Rohöl / Säure | 2 s | 1 | faesser |

### Gebäude

| Gebäude | Größe | Kosten | Leistung | Forschung |
|---|---|---|---|---|
| Rohr Mk1 | 1×1 | 1 Kupferbarren | 20/s | dampf |
| Wasserpumpe | 1×1 | 20 Holz + 10 Eisenbarren | 10 Wasser/s, an Land am Meer | dampf |
| Tank | 2×2 | 20 Eisenbarren + 10 Kupferbarren | 500 Einheiten, Füllstandsanzeige | dampf |
| Dampfkraftwerk | 2×2 | 40 Ziegel + 20 Eisenbarren | 12 Strom/s (× Kesseltechnik), verbrennt 2,4 Brennwert/s + 5 Wasser/s, Brennstoff vom Band (Puffer 10, ab Brennwert 4) | dampf |
| Rohr Mk2 | 1×1 | 1 Stahlbarren | 50/s | druckleitung |
| Saugpumpe | 2×2 | 20 Kupferbarren + 10 Silizium | 1,25 Rohöl/s je Ölfeld (max. 5), nur auf Öl, 2 Strom/s | erdoel |
| Chemischer Reaktor | 3×3 | 40 Stahl + 20 Glas + 10 Mikrochips + 3 Baupläne | Rezepte oben, 6 Strom/s | chemie |
| Rohr Mk3 | 1×1 | 1 Kunststoff + 1 Glas | 100/s, säurefest | chemie |
| Hochleistungsband | 1×1 | 1 Stahl + 1 Kunststoff | 4 Items/s, mit Kurven | hochband |
| Geothermie-Generator | 2×2 | 40 Stahl + 20 Graphit + 10 Mikrochips | 30 Strom/s ohne Verbrauch, muss mind. 2 Lavafelder überdecken | geothermie |
| Ingenieurhaus | 2×2 | 40 Stahl + 20 Glas + 10 Kunststoff + 5 Mikrochips | 6 Bewohner, je Prüfung 3 Fisch + 1 Kunststoff + 1 Mikrochip → 1 Schaltplan | ingenieure |
| Abfüllanlage | 2×2 | 20 Stahl + 10 Kupferbarren | füllt 50 Einheiten in ein leeres Fass, 1 Strom/s | faesser |
| Entleerer | 2×2 | 20 Stahl + 10 Kupferbarren | leert ein volles Fass ins Netz, 1 Strom/s | faesser |
| Multi-Bohrer | 3×3 | 50 Stahl + 10 Mikrochips + 5 Supermagnete + 3 Schaltpläne | 0,3/s je Feld (max. 2,7/s, × Bohrer-Upgrades), Mehrheitsregel, 5 Wasser/s + 1 Schmiermittel je 30 s, 10 Strom/s | multibohrer |

- Das **Dampfkraftwerk** erzeugt aus demselben Brennstoff fünfmal so viel Strom wie die Verbrennungsanlage. Ist sein Speicher (und der der Batterien im Netz) voll, läuft es nicht und spart Brennstoff.
  Status: „Erzeugt Strom“, „Wartet auf: Wasser“, „Wartet auf: Brennstoff“, „Leerlauf – Speicher voll“.
- Der **Bohrer Mk2** nimmt zusätzlich Schmiermittel vom Band (Puffer 5): 1 je 60 s gibt +50 % („geschmiert“). Ohne Schmiermittel läuft er normal.
- Der **Multi-Bohrer** darf auf Quarz/Sand stehen, nicht auf Öl. Ohne Wasser: „Überhitzt – braucht Kühlwasser“, ohne Schmiermittel: „Braucht Schmiermittel“.
- Ein Bohrer auf Öl verweist auf die Saugpumpe. Die Bauvorschau zeigt bei Saugpumpe und Geothermie die Öl- bzw. Lavafelder unter dem Gebäude.

### Forschung

| ID | Name | Ast | Stufe | Kosten | Voraussetzung | Schaltet frei |
|---|---|---|---|---|---|---|
| dampf | Dampfkraft | Energie | 2 | 10 Skizzen + 30 Ziegel + 20 Kupferbarren | strom | Rohr Mk1, Wasserpumpe, Tank, Dampfkraftwerk |
| druckleitung | Druckleitungen | Flüssigkeiten | 3 | 10 Skizzen + 20 Stahl | stahl, dampf | Rohr Mk2 |
| erdoel | Erdöl | Flüssigkeiten | 4 | 8 Baupläne + 20 Kupferbarren + 10 Silizium | halbleiter, dampf | Saugpumpe |
| chemie | Chemie | Chemie | 5 | 25 Baupläne + 20 Mikrochips + 30 Glas | pyrolyse, erdoel | Reaktor, Rohr Mk3 |
| hochband | Hochleistungsbänder | Logistik | 5 | 15 Baupläne + 20 Kunststoff | chemie, schnellband | Hochleistungsband |
| geothermie | Geothermie | Energie | 5 | 15 Baupläne + 10 Mikrochips + 20 Graphit | montage | Geothermie-Generator |
| ingenieure | Ingenieurwesen | Wohnen | 5 | 20 Baupläne + 20 Kunststoff + 10 Mikrochips | chemie | Ingenieurhaus |
| magnete | Supermagnete | Chemie | 6 | 10 Schaltpläne + 20 Stahl | chemie | Rezept Supermagnet |
| multibohrer | Multi-Bohrer | Abbau | 6 | 20 Schaltpläne + 20 Kunststoff + 20 Schmiermittel | magnete, tiefbohrung | Multi-Bohrer |
| faesser | Fässer | Flüssigkeiten | 4 | 6 Baupläne + 20 Stahl | erdoel | Abfüllanlage, Entleerer, Rezept Fass im Werkzeugmacher |

### Oberfläche und Statistik

- Baumenü: Kategorie „Flüssigkeiten“ (Rohre, Pumpen, Tank). Kraftwerke unter Energie, Reaktor unter Verarbeitung, Ingenieurhaus unter Wohnen, Multi-Bohrer unter Abbau.
- Lager-Panel: Abschnitt „Flüssigkeiten“ für die Insel unter der Kamera (gespeichert in Rohren und Tanks, erzeugt/min, verbraucht/min), nur wenn etwas da ist oder fließt.
  Ein Klick öffnet das Popover wie bei Items.
- Statistik-Fenster: Flüssigkeiten als Zeilen wie Items. Erzeugt = ins Netz gepumpt, verbraucht = aus dem Netz gezogen; „Netz geleert“ ist eine eigene Quelle (`leeren` in `SRC`, `ui/stats.js`).

## Komfortfunktionen

Alles, was das Spiel verändert, läuft als Kommando an die Simulation; die Oberfläche liest nur den Spiegel.

### Spieltempo

- Knöpfe neben der Uhr: Pause, 1×, 2×, 3× (der aktive ist hervorgehoben, Tooltip mit Kürzel). **Leertaste** schaltet die Pause, **Umschalt+1/2/3** wählt das Tempo.
- Die Simulation rechnet je Durchlauf entsprechend mehr feste 0,05-s-Schritte (auch die Obergrenze `MAX_STEPS` wächst mit dem Tempo, `sim/host.js`).
  Die Interpolation der Bänder und Schiffe rechnet mit der kürzeren Zeit zwischen zwei Snapshots, Animationen laufen mit dem Tempo.
- In der Pause werden Kommandos weiter ausgeführt (bauen, abreißen, Rezepte …), die Zeit steht. Die Leiste zeigt „Pausiert“, die Karte wird leicht entsättigt.
- Das Tempo wird nicht gespeichert (Start immer 1×). Das Anhalten bei verstecktem Fenster ist davon unabhängig.

### Pipette (Q)

- Über einem Gebäude: Baumodus mit demselben Typ, derselben Drehung, demselben Rezept und derselben Lager-Ausgabe (werden beim Platzieren übernommen; Kommandos `place`/`paint` mit `rc`, `outItem`).
- Über einem Rohr ohne Band: dasselbe Rohr. Band über Rohr: das Band, mit **Umschalt+Q** das Rohr.
- Gesperrte oder zu teure Gebäude starten trotzdem den Baumodus (Vorschau rot mit Grund). Das Baumenü springt in die passende Kategorie.
- Q über leerem Feld oder dem Kontor beendet den Baumodus.

### Statusansicht (H)

- Knopf „Status“ in der Knopfleiste oder Taste H (wird in `state.ui.statusView` gespeichert). Über jedem Produktionsgebäude ein Schildchen mit dem Produkt und einem Status-Punkt:
  **grün** läuft, **gelb** wartet auf Zutaten oder Ausgabe voll, **rot** kein Strom / kein Wasser / überhitzt / unversorgt / Säure im falschen Netz, **grau** nichts zu fördern.
  Ein Gebäude, das Strom braucht und an keinem Netz mit Erzeuger oder Batterie hängt, ist immer rot.
- Rohre zeigen den Flüssigkeitsstreifen doppelt so breit. Gezeichnet wird nur der sichtbare Ausschnitt; ab Zoomstufe 1 mit Symbol, darunter nur der Punkt.
- Die Zuordnung steht in `src/gfx/status.js` (`statusOf`).

### Aufwerten (U)

- `UPGRADE_TO` in `src/data/buildings.js`: Fließband → Schnellband → Hochleistungsband, Rohr Mk1 → Mk2 → Mk3, Bohrer Mk1 → Mk2, Hütte → Bürgerhaus → Ingenieurhaus.
- Info-Panel: Knopf „Aufwerten zu …“ mit Kosten (fehlende rot, gesperrt mit Schloss und Forschung). Werkzeug „Aufwerten“ (Knopfleiste, U): Klick oder Ziehen wertet je Teil eine Stufe auf.
  Die Vorschau färbt das Teil unter der Maus grün (geht), rot (geht nicht, Grund im Hinweis) oder neutral (keine höhere Stufe); beim Ziehen zeigt der Hinweis Anzahl und Gesamtkosten.
  Band über Rohr: das Band, mit Umschalt das Rohr.
- Das alte Teil wird zu 100 % erstattet (ohne Pläne), das neue voll bezahlt; gezählt wird beides unter „Bauen“. Erhalten bleiben Position, Drehung, Items auf Bändern, Puffer, Kabel, Rezept,
  Wasser- und Schmiermittelpuffer und der Zähler der Häuser. Beim Bohrer wird das Vorkommen neu bestimmt. Rohre unterliegen dem Rohrnetz-Schutz.
- Kommando `upgrade` mit `id` (Gebäude) oder `pipe: true, x, y`; beim Ziehen gibt es nur eine Fehlermeldung je Zug.

### Rückgängig und Wiederholen

- **Strg+Z** rückgängig, **Strg+Y** oder **Strg+Umschalt+Z** wiederholen, dazu zwei Pfeil-Knöpfe in der Knopfleiste (ausgegraut, wenn leer; Tooltip z. B. „Rückgängig: 14 Fließbänder gebaut“).
- Rückgängig machen lassen sich: Bauen (eine gezogene Strecke ist eine Aktion), Abreißen (auch gezogen), Rohre, Drehen, Rezept, Lager-Ausgabe, Aufwerten, Kabel verbinden/lösen, Blaupause platzieren.
  Nicht: Forschung, Schiffe, Kontor, Netz leeren, Umbenennen.
- Der Stapel liegt in der Simulation (`sim/undo.js`), höchstens 50 Einträge, wird nicht gespeichert und ist nach Laden, Neustart und Import leer. Einträge merken sich Positionen und Typen, keine IDs.
- Bauen rückgängig = Abriss mit 100 % Erstattung (auch Pläne); Items auf Bändern und Puffer kommen ins Lager der Insel (ist es voll, gehen sie verloren).
- Abriss rückgängig = Wiederaufbau mit dem gespeicherten Zustand; bezahlt wird genau die damalige Erstattung, Puffer kommen aus dem Lager, soweit vorhanden.
  Fehlt etwas oder ist die Stelle belegt, wird die ganze Aktion abgelehnt („Rückgängig nicht möglich: …“) und bleibt auf dem Stapel.
- Wiederholen führt die Aktion mit denselben Prüfungen erneut aus. Eine neue Aktion leert den Wiederholen-Stapel.

### Blaupausen (V)

- **V** (oder Knopf „Blaupause“): Rechteck aufziehen. Erfasst werden Gebäude, die ganz im Rechteck liegen, Rohre, Bänder mit Richtung, Rezepte, Lager-Ausgaben und Kabel zwischen erfassten Gebäuden.
  Kontor und Werft kommen nicht hinein (Hinweis). Danach fragt ein Dialog nach dem Namen (Vorschlag „Blaupause 1“ …): Speichern, Nur kopieren, Abbrechen.
- **Strg+C** kopiert die Auswahl in die Zwischenablage des Spiels (ohne Namen, nicht in die Bibliothek), **Strg+V** startet das Platzieren.
- **Bibliothek** „Blaupausen“ (Umschalt+V oder Knopf im Hinweis): Vorschaubild (Draufsicht, Farben je Baumenü-Kategorie), Name (umbenennbar), Größe, Anzahl Gebäude, Gesamtkosten,
  Knöpfe Platzieren, Code kopieren, Löschen (mit Rückfrage); oben „Code einfügen“.
- **Platzieren:** halbtransparente Vorschau, **R** dreht um 90° (Positionen, Bandrichtungen und Kurven; Rohre über ihre Position). Jedes Teil wird einzeln geprüft (grün/rot),
  der Hinweis zeigt Gesamtkosten gegen das Lager und „x von y platzierbar“. Ein Klick baut alle gültigen Teile als eine Rückgängig-Aktion: zuerst Gebäude, dann Bänder, dann Rohre,
  jeweils in der gespeicherten Reihenfolge; reicht das Lager nicht, wird gebaut, solange es reicht. Ein Toast nennt die Anzahl und den häufigsten Grund für Ausgelassenes.
  Kabel innerhalb der Blaupause werden danach verbunden, Masten verbinden sich anschließend selbst. Geprüft und gebaut wird in der Simulation (Kommando `placeBlueprint`).

**Format** (Version 1, `sim/blueprint.js`), Ursprung = linke obere Ecke des Inhalts:

```json
{ "v": 1, "name": "Schmelzreihe", "w": 7, "h": 3,
  "parts": [ { "t": "schmelzofen", "x": 0, "y": 0, "d": 0, "rc": "glas" }, { "t": "band", "x": 0, "y": 2, "d": 0 }, { "t": "lager", "x": 4, "y": 0, "d": 0, "out": "eisen" } ],
  "pipes": [ [3, 2, 1] ],
  "links": [ [0, 2] ] }
```

`parts` = Gebäude und flache Teile (`t` Typ, `d` Richtung 0–3, optional `rc` Rezept und `out` Lager-Ausgabe), `pipes` = Rohre `[x, y, Stufe]`, `links` = Kabel als Indizes in `parts`.
Der **Code** ist dieses JSON als UTF-8 in Base64. Beim Einfügen wird geprüft: unbekannte Gebäude, Rezepte, Waren und Rohrstufen werden ausgelassen (mit Hinweis), überlappende Teile ebenso.

### Rohrnetz-Schutz

- Rohre, Tanks und deren Aufwerten werden vor dem Bauen gegen die angrenzenden Netze geprüft (`netGuard` in `sim/fluids.js`, gemeinsam für Simulation und Vorschau):
  - Ein Säurenetz bekommt ein Rohr unter Mk3: „Würde das Säurenetz zerstören – hier nur Rohr Mk3.“ Ebenso, wenn ein Mk3-Rohr ein Säurenetz mit einem Netz verbinden würde, das Rohre unter Mk3 hat.
  - Zwei gefüllte Netze mit verschiedenen Flüssigkeiten würden verbunden: „Würde Wasser und Rohöl mischen – erst ein Netz leeren.“
  - Leere Netze sind frei. Abriss ist immer erlaubt.
- Die Bauvorschau zeigt den Grund rot. Beim Ziehen wird das Feld übersprungen, die Meldung erscheint einmal je Zug.
- Die alte Verwerfen-Logik beim Verbinden bleibt als Sicherheitsnetz.

### Tastenkürzel

| Taste | Wirkung |
|---|---|
| W A S D / Pfeiltasten, + / −, Mausrad | Karte verschieben, zoomen |
| Leertaste, Umschalt+1 / 2 / 3 | Pause, Spieltempo |
| B, 1–9 | Baumenü, Gebäude der offenen Kategorie |
| R | Drehen (Bauen, Blaupause, ausgewähltes Gebäude) |
| Q, Umschalt+Q | Pipette, Pipette für das Rohr unter einem Band |
| X | Abriss (Umschalt: nur das Rohr) |
| U | Aufwerten |
| Strg+Z, Strg+Y / Strg+Umschalt+Z | Rückgängig, Wiederholen |
| V, Strg+C, Strg+V, Umschalt+V | Blaupause auswählen, kopieren, einfügen, Bibliothek |
| T, F, P, H | Forschung, Flotte, Statistik, Statusansicht |
| M, K | Kartenansicht, Markt |
| Umschalt + W A S D | Karte dreimal so schnell verschieben |
| Enter | „Kontor gründen“ / „Kontor verlegen“ bestätigen, „Route anlegen“ beenden |
| G, Umschalt+Klick | Tor öffnen/schließen |
| Umschalt beim Band-Ziehen | Achse sperren |
| Esc | Abbrechen und schließen (Reihenfolge siehe „Oberfläche“); ist nichts offen, öffnet Esc das Pausenmenü |

Auf dem Mac gilt Cmd statt Strg. In Eingabefeldern wirken keine Kürzel.

## Fässer

Flüssigkeiten verschiffen: **abfüllen, per Schiff transportieren, entleeren.**

- Forschung **Fässer** (Ast Flüssigkeiten, Stufe 4, 6 Baupläne + 20 Stahl, braucht Erdöl).
- Waren: Leeres Fass, Wasserfass, Ölfass, Säurefass (Zwischenprodukte, Brennwert 1). Ein Fass fasst 50 Einheiten.
- Der **Werkzeugmacher** macht aus 2 Eisenbarren 1 leeres Fass (4 s, mit Strom schneller).
- Die **Abfüllanlage** (2×2, 1 Strom/s) nimmt leere Fässer vom Band und füllt sie aus dem angrenzenden Netz (Rezept wählen: Wasser, Rohöl, Säure).
- Der **Entleerer** (2×2, 1 Strom/s) nimmt volle Fässer vom Band, gibt die Flüssigkeit ins angrenzende Netz und das leere Fass aufs Band.
  Säure gibt er nur in ein säurefestes Netz (sonst Status „Säure braucht säurefeste Rohre (Mk3)“).
- Fässer sind normale Waren: Sie liegen im Lager, fahren auf Bändern und Schiffen und stehen in Routen.

**Beispiel Öl von der Sandinsel zur Heimatinsel:** Auf der Sandinsel Saugpumpe → Rohr → Abfüllanlage (Rezept „Rohöl abfüllen“), leere Fässer per Band hinein, volle Ölfässer per Band ins Lager.
Eine Route lädt am Kontor der Sandinsel Ölfässer und entlädt leere Fässer, an der Heimatinsel umgekehrt. Dort bringt eine Lager-Ausgabe die Ölfässer zum Entleerer,
der das Rohöl in das Netz des Reaktors gibt; die leeren Fässer laufen per Band zurück ins Lager und fahren mit dem nächsten Schiff wieder zur Sandinsel.

## Skilltree (Version 8)

Taste T oder Knopf „Forschung“ öffnet ein großes Fenster (`ui/skilltree.js`, Lage der Knoten in `ui/skilltree-layout.js`).
Hat der Knopf einen grünen Punkt, ist mindestens eine Forschung verfügbar und bezahlbar (`anyResearchable` in `sim/research.js`).

- **Aufbau:** In der Mitte die Wurzel „Grundlagen“, links und rechts daneben alle Gebäude der Stufe 1 als kleine Blätter.
  Von der Wurzel gehen 8 Äste ab (`TECH_BRANCHES` in `data/tech.js`): Logistik, Abbau, Verarbeitung und Energie nach oben, Flüssigkeiten, Chemie, Wohnen und Schifffahrt nach unten.
  Jeder Ast beginnt mit einem Kategorie-Knoten, weiter außen liegen die höheren Stufen. An jeder Forschung hängen rechts die Gebäude und Rezepte, die sie freischaltet.
- **Linien:** Goldene, rechtwinklige Linien verbinden die Knoten eines Astes. Voraussetzungen aus anderen Ästen sind dünn gestrichelt und leuchten auf, wenn man über den Knoten fährt.
  Beim Hovern wird der ganze Pfad der Voraussetzungen hervorgehoben.
- **Zustände:** erforscht = Goldrahmen mit Schein; verfügbar = heller Rahmen, pulsiert, grüner Punkt wenn bezahlbar; gesperrt = dunkel, entsättigt, mit Schloss.
  Upgrades tragen ein grünes Pfeil-Abzeichen.
- **Bedienen:** Ziehen verschiebt, Mausrad zoomt an der Mausposition (5 Stufen, `ZOOMS` in `ui/skilltree.js`, Beschriftungen ab Stufe 0,8), mit zwei Fingern ziehen und zoomen.
  Kopfzeile: „erforscht x / y“, je Ast ein Knopf zum Hinspringen, „Zentrieren“, „Details“ (Spalte rechts ein/aus), Schließen. Die Ansicht wird in `state.ui.tree` gespeichert.
- **Detailspalte:** großes Symbol, Beschreibung, Wirkung, Kosten mit Bestand, Voraussetzungen (anklickbar, springt hin), freigeschaltete Gebäude, Knopf „Erforschen“.
  Nach dem Erforschen läuft eine goldene Animation am Knoten, dazu kommt ein Toast.
- **Zeichnen:** Ein Canvas in Gerätepixeln (scharf bei jedem Zoom und jeder Bildschirmdichte). Knoten, Linien und Beschriftungen liegen in einem
  zwischengespeicherten Bild, das nur bei Änderungen (Ansicht, Größe, Forschungsstand, Bestand) neu entsteht. Darüber zeichnet eine dünne Ebene Puls, Hover-Pfad, Auswahl und Animationen (alle 100 ms, nur solange das Fenster offen ist).

### Neue Forschung oder neues Upgrade

Ein Eintrag in `TECH` (`src/data/tech.js`), mehr ist nicht nötig:

```js
{ id: 'segel2', name: 'Klipper-Segel', stufe: 4, cat: 'schifffahrt', res: { bauplan: 10, stahl: 20 }, req: ['segel1'],
  icon: 'icon:anchor', effect: { shipSpeed: 0.2 }, desc: 'Schlanke Rümpfe und mehr Tuch.' }
```

- `stufe` = Abstand von der Wurzel (Ruhm = Stufe × `FAME_TECH`), `cat` = Ast (Schlüssel aus `TECH_BRANCHES`), `req` = Voraussetzungen (auch aus anderen Ästen), `res` = Kosten.
- **Forschung** (schaltet etwas frei): Gebäude bekommen in `data/buildings.js` `tech: '<id>'`, Rezepte in `data/recipes.js` ebenso `tech: '<id>'`
  (ein Rezept mit fehlender Forschung ist im Info-Panel ausgegraut und lässt sich nicht wählen). Die Blätter im Baum ergeben sich daraus.
- **Upgrade** (schaltet nichts frei): `effect` setzen, `icon` = `'b:<Gebäude>'`, `'i:<Item>'`, `'ship'` oder `'icon:<SPR.icon>'`.
- Optional `pos: [x, y]` legt einen Knoten fest (Baum-Pixel bei Zoom 1, Wurzel bei 0, 0; y wächst nach unten). Sonst rechnet `buildLayout()` die Lage aus.
- Verweist `req` auf eine Forschung, die es noch nicht gibt, bleibt der Eintrag gesperrt. Mit einem Eintrag in `TECH_PLANNED` zeigt der Baum dafür einen Namen und einen Hinweis
  (seit v9 leer; früher `dampf` „Dampfkraft“ für „Kesseltechnik“). Sobald die echte Forschung in `TECH` steht, gilt sie automatisch.
- Nach jeder Änderung `npm run check:tree` ausführen: keine Überlappung von Knoten und Beschriftungen, jede Forschung genau einmal, jedes Gebäude genau einmal als Blatt, Rezepte mit `tech` genau einmal, alle Verweise gültig.
- Neuer Ast: Eintrag in `TECH_BRANCHES` (Reihenfolge: die ersten vier nach oben) und ein Symbol in `SPR.icon`.

### Wirkungen: `mods(g)` (`src/sim/mods.js`)

Alle Werte, die Upgrades verändern können, liest das Spiel nur über `mods(g)`. Das Objekt wird aus den Basiswerten (`config.js`, `data/mining.js`) und den `effect`
aller erforschten Upgrades berechnet und am Spielkontext zwischengespeichert, bis sich der Forschungsstand ändert. Upgrades wirken sofort, auch für bestehende Gebäude und
fahrende Schiffe (ein neuer Laderaum wird bei allen Schiffen angehängt). Simulation und Oberfläche nutzen dieselbe Funktion, die Panels zeigen also immer die Werte mit Upgrades.

| Feld in `effect` | Wirkung | gelesen in |
|---|---|---|
| `cap: { lager, kontor }` | + Platz je Ware | `capOf` (`sim/state.js`) |
| `store: { batterie }` | + Stromspeicher | `storeOf` (`sim/power.js`, Info-Panel) |
| `rate: { <Gebäude> \| drill }` | Leistung × (1 + f), `drill` = alle Bohrer | `rateOf` (`sim/production.js`, `sim/buildings.js`) |
| `power: { <Gebäude> }` | Stromerzeugung × (1 + f) | Dampfkraftwerk (`powerOf(g, t)`) |
| `holds` | + Laderäume je Schiff | `sim/ships.js` (`fitHolds`) |
| `holdCap` | + Platz je Laderaum | `holdRoom` (`sim/ships.js`) |
| `shipSpeed` | Schiffstempo × (1 + f) | `sim/ships.js` |
| `treeGrow` | Baumwachstum × (1 + f) | `sim/sim.js` |
| `houseEvery` | Prüfabstand der Häuser − s (mindestens 5 s) | `sim/production.js` |

Neue Art von Wirkung: Basiswert in `base()` und Verrechnung in `computeMods()` (`sim/mods.js`) ergänzen, Text in `effectLines()`, dann den Wert an der passenden Stelle über `mods(g)` lesen.

**Beschreibungen mit Werten:** `desc` in `data/buildings.js` darf Platzhalter enthalten, `descOf(g, t)` setzt die aktuellen Werte ein:
`{cap:lager}`, `{store:batterie}`, `{house}` (Prüfabstand), `{rate:<Gebäude>:<Basiswert>}` (Basiswert × Faktor, z. B. `{rate:bohrer:0.08}`).

### Die 12 Upgrades

| id | Name | Ast | Stufe | Kosten | Voraussetzung | Wirkung |
|---|---|---|---|---|---|---|
| lager1 | Größere Lager I | Logistik | 2 | 10 Skizzen + 100 Holz | – | Lagerhalle +200 je Ware |
| lager2 | Größere Lager II | Logistik | 3 | 20 Skizzen + 40 Stahl | lager1, stahl | Lagerhalle +300 je Ware |
| kontor1 | Hafenspeicher | Schifffahrt | 2 | 10 Skizzen + 50 Ziegel | – | Kontor +150 je Ware |
| laderaum1 | Größere Laderäume | Schifffahrt | 2 | 10 Skizzen + 40 Eisenbarren | – | +20 je Laderaum |
| laderaum2 | Vierter Laderaum | Schifffahrt | 4 | 10 Baupläne + 30 Stahl | laderaum1 | +1 Laderaum je Schiff |
| segel1 | Bessere Segel | Schifffahrt | 3 | 15 Skizzen + 20 Werkzeug | – | Schiffe +20 % schneller |
| saege1 | Forstwirtschaft | Abbau | 2 | 8 Skizzen + 60 Holz | – | Bäume wachsen +30 % schneller |
| fischer1 | Schleppnetze | Abbau | 2 | 8 Skizzen + 20 Werkzeug | handwerk | Fischerhütte +30 % |
| bohrer1 | Gehärtete Bohrköpfe | Abbau | 3 | 15 Skizzen + 20 Stahl | stahl | alle Bohrer +20 % |
| haus1 | Vorratskammern | Wohnen | 3 | 15 Skizzen + 30 Glas | handwerk | Häuser prüfen alle 50 s statt 60 s |
| batterie1 | Bessere Akkus | Energie | 4 | 8 Baupläne + 20 Graphit | graphit, strom | Batterie +250 Speicher |
| kraftwerk1 | Kesseltechnik | Energie | 4 | 10 Baupläne + 30 Stahl | dampf | Dampfkraftwerk +25 % Strom (12 → 15/s) |

Die Stromerzeugung des Dampfkraftwerks wird mit `mods(g).power.kraftwerk` multipliziert (`powerOf`), „Kesseltechnik“ hebt es also von 12 auf 15 Strom/s.
Der Speicher von Kraftwerk und Geothermie kommt aus `mods(g).store`. „Gehärtete Bohrköpfe“ (`rate.drill`) gilt auch für den Multi-Bohrer.

## Welt

Die Welt ist unendlich und entsteht nur aus dem Seed (`state.seed`). Gleicher Seed = gleiche Welt, egal in welcher Reihenfolge man sie bereist.

- **Felder** haben ganzzahlige Koordinaten (auch negativ). Spawn ist (0,0). Für Maps/Sets gibt es den Schlüssel `tk(x, y)` (`util/tiles.js`); er ist eine große Zahl, also nie mit Bit-Operatoren rechnen, sondern `tkx`/`tky` benutzen.
- **Chunks** sind 32×32 Felder. Boden, Vorkommen, Höhen und Startbäume eines Chunks erzeugt `World.chunk(cx, cy)` bei Bedarf; höchstens `MAX_CHUNKS` (900) bleiben im Speicher, der Rest wird nach LRU verworfen und bei Bedarf identisch neu erzeugt. Chunks mit Gebäuden bleiben angeheftet.
- **Inselzellen** sind 112×112 Felder (`CELL`), Zelle (0,0) liegt mittig um den Spawn. Jede Zelle hat höchstens eine Insel; mindestens `CELL_EDGE` Felder am Rand bleiben Meer. Die Insel-ID (`islId(cx, cy)`) ist ein fester Schlüssel, die Heimatinsel hat ID 0.
- **Veränderliches** liegt chunkweise in `world/layers.js`: Gebäudebelegung und Erntegebiete, Bäume (ein Chunk wird erst beim ersten Ändern kopiert, gespeichert werden nur Abweichungen) und der Nebel (Bitmaske).
- **Worker und Hauptthread** erzeugen ihre Welt jeweils selbst aus dem Seed. Im Snapshot stehen nur geänderte Bäume und Nebel-Chunks.

### Inseltypen und Ringe

Heimatinsel (Zelle 0,0): Radius 42, Name „Heimatinsel“, Kontor mit roter Flagge, 100 Holz, Kohle ×3, Eisenerz ×3, Kalk ×2, Kupfer ×1 (klein), eine Bergformation. Alle anderen Inseln heißen „Unbekannte Insel“, haben kein Kontor und einen Radius von 14–36 (wächst leicht mit der Entfernung).

| Ring | Entfernung der Zellmitte | leere Zellen | Typen | Vorkommen |
|---|---|---|---|---|
| 0 | < 180 | 20 % | normal | Kohle, Eisen, Kalk, selten Kupfer |
| 1 | 180–450 | 40 % | normal 80 %, Sand 20 % | viel Kupfer; Sand: Kupfer, Kalk |
| 2 | 450–900 | 40 % | normal 45 %, Vulkan 25 %, Sand 30 % | Sand: Öl; Vulkan: Schwefel, Eisen |
| 3 | > 900 | 40 % | normal 40 %, Vulkan 30 %, Sand 30 % | normal: Neodym; Sand: viel Öl; Vulkan: viel Schwefel |

- **Normal:** Gras, Wald, auf etwa 40 % der Inseln 1–3 Bergformationen (nicht bebaubar, Gipfel mit Schnee).
- **Sand:** Dünen mit Rippeln, Palmen, Öl-Vorkommen.
- **Vulkan:** Basalt und Asche, Krater mit animierter Lava (glüht nachts), Schwefel am Fuß. Lava und Berge sind nicht bebaubar.
- **Vorkommen** Quarzsand (jedes Sand-/Strandfeld), Schwefel und Neodym-Erz sind abbaubar (siehe „Wirtschaft“). Öl fördert die Saugpumpe.
- Die Feld-Info zeigt Inseltyp und Ring.

### Nebel, Entdecken, Schiffe

- Unbekanntes liegt unter einer Wolkendecke. Aufgedeckt wird im Radius `REVEAL` (`config.js`): Spawn 60, Gebäude 6, Schiff 14, Kontor 25. Gebaut werden kann nur auf aufgedeckten Feldern. Wird eine Insel zum ersten Mal gesehen, erscheint „Insel entdeckt“.
- **Kontor deckt die Insel auf:** Ein neues Kontor (auch das der Heimatinsel beim Start und `debugKontor`) deckt die ganze Insel und einen Küstenstreifen von `REVEAL_STRIP` (3) Feldern auf.
- **Kartieren:** Sind mindestens `MAP_COAST_SHARE` (70 %) der Küstenfelder einer Insel aufgedeckt, wird die ganze Insel aufgedeckt und gilt als kartiert (`state.mapped`).
  Toast: „<Inseltyp> kartiert – Vorkommen: …“ mit Symbolen. Geprüft wird nur, wenn sich der Nebel an dieser Insel ändert (`checkMapped` in `sim/explore.js`).
  Feld-Info und Inselliste (Menü „Heimatinsel ▾“) zeigen „kartiert“ oder den Anteil der gesehenen Küste. Die Inselliste zeigt neben den Kontor-Inseln die 12 nächsten entdeckten Inseln ohne Kontor.
- Schiffe suchen ihren Weg per A* über Wasser, begrenzt auf das Rechteck um Start und Ziel plus `SHIP_SEARCH_MARGIN` (40) Felder und höchstens `SHIP_SEARCH_MAX` (60 000) Knoten. Ohne Weg meldet das Schiff „Kein Seeweg gefunden“ (auf einer Route neuer Versuch alle 10 s).
- Neue Kontore gründen Schiffe (siehe „Schiffe“). `tideworks.debugKontor()` setzt zum Testen weiterhin ein Kontor ohne Schiff.

### Schiffe

Alle Zahlen stehen in `src/config.js`, die Logik in `src/sim/ships.js`, die Oberfläche in `src/ui/ships.js` und `src/ui/fleet.js`.

- **Laderaum:** `SHIP_HOLDS` (3) Laderäume zu je `SHIP_HOLD_CAP` (40) Items (mit Upgrades mehr, siehe `mods(g)`), jeder genau eine Warenart: `cargo: [{it, n} | null, …]`.
  Laden füllt zuerst Räume mit derselben Ware auf, dann leere Räume; Entladen nimmt zuerst aus den leersten Räumen.
  An Deck steht je belegtem Raum eine Kiste in der Farbe der Ware (`ITEM_COL` in `gfx/sprites/sea.js`).
- **Auswählen:** Klick auf ein Schiff (Sprite plus etwas Rand, Vorrang vor dem Feld darunter). Gelber Rahmen, restlicher Weg gestrichelt,
  das Flotten-Fenster öffnet sich am Eintrag des Schiffs, das Info-Panel links unten zeigt Name, Status, Laderäume und Knöpfe.
- **Steuern:** Rechtsklick auf die Karte, solange ein Schiff ausgewählt ist. Wasser = genau dieses Feld, Land = erstes Meeresfeld auf der Linie
  vom Klick zum Schiff (also die Küste in Richtung des Klicks). Am Ziel erscheint kurz ein Fähnchen. Ohne Weg: „Kein Seeweg gefunden“.
  Ohne ausgewähltes Schiff bleibt der Rechtsklick wie bisher (Baumodus abbrechen, Ziehen = Kamera). Manuelles Fahren pausiert eine Route,
  „Route fortsetzen“ fährt den nächsten Stopp an.
- **Über Bord:** Jeder belegte Laderaum hat im Flotten-Eintrag und im Info-Panel den Knopf „Über Bord“ (ohne Rückfrage). Die Ladung wird Treibgut (Kiste) auf einem freien
  Meeresfeld neben dem Schiff (`state.jet`), lässt sich wieder einsammeln und verschwindet nach `JETTISON_TTL` (300 s Spielzeit). Das werfende Schiff sammelt sie erst wieder ein,
  wenn es sich entfernt hat oder gezielt dorthin gesteuert wird. Über Bord geworfene Ware zählt nicht in der Statistik.
- **Funde einsammeln:** Schalter je Schiff (Standard an). Aus = das Schiff fährt an Funden vorbei, außer man steuert es per Rechtsklick genau auf einen Fund.
- **Umbenennen:** Textfeld im Flotten-Eintrag (höchstens 24 Zeichen, Standard „Schiff 1“ …).
- **Laden/Entladen von Hand:** Liegt ein Schiff höchstens `PORT_RANGE` (2) Felder vom Anleger eines Kontors und fährt nicht, zeigt sein Eintrag
  die Waren des Kontor-Lagers (+10, +40, Alles) und je Laderaum „Entladen“. Lagerkapazität und Laderaum-Grenzen gelten; die Statistik zählt es unter „Schiffe“.
- **Kontor gründen:** Liegt ein stehendes Schiff höchstens 2 Felder vor der Küste einer Insel ohne Kontor und hat `FOUND_COST` (40 Holz) an Bord,
  erscheint „Kontor gründen“ (sonst ausgegraut mit Grund). Die Vorschau steht am gültigen Platz, der dem Schiff am nächsten ist; gültige Plätze im Umkreis
  von `FOUND_RANGE` (8) Feldern um die nächste Küste sind hell markiert, ein Klick verschiebt die Vorschau, ungültige Plätze werden rot mit Grund angezeigt.
  Gültig = 2×2 ganz auf der Insel, aufgedeckt, frei, kein Berg und keine Lava, mindestens ein Meeresfeld direkt daneben (Anleger).
  Haken/Enter baut das Kontor (deckt Radius 25 auf, Lager mit 100 je Ware), danach folgt der Dialog „Insel benennen“ (Name und Flaggenfarbe).
  Name und Flagge lassen sich später im Info-Panel des Kontors („Insel benennen · Flagge“) ändern. Kontore bleiben nicht abreißbar.

#### Routenformat

```js
route = {
  stops: [ { isl,                                  // Insel-ID mit Kontor
             unload: [{ it: 'holz' | '*', mode: 'all' | 'keep', n }],
             load:   [{ it: 'holz', mode: 'all' | 'upto' | 'keep', n }],
             wait: false } ],
  idx,       // Stopp, der gerade angefahren wird bzw. an dem das Schiff liegt
  paused     // true nach manuellem Steuern
}
```

- Laden: `all` = so viel wie möglich, `upto` = bis n an Bord sind, `keep` = nur, was über n im Kontor-Lager liegt (das Kontor wird nicht leergeräumt).
- Entladen: `all` = alles, `keep` = n bleiben an Bord. `it: '*'` = alle Waren an Bord.
- Ablauf am Stopp: anlegen (`SHIP_DOCK_TIME`, 2 s), erst entladen, dann laden, dann der nächste Stopp (nach dem letzten wieder der erste). Ist das Lager voll, bleibt der Rest an Bord.
- `wait`: am Stopp bleiben, bis jeder Lade-Auftrag erfüllt ist (kein Platz mehr für die Ware oder bei `upto` die Menge erreicht), höchstens `SHIP_WAIT_MAX` (60 s).
- Eine Route braucht mindestens 2 Stopps. Dasselbe Kontor darf mehrfach vorkommen, aber nicht zweimal direkt hintereinander (auch nicht letzter → erster).
- „Route anlegen“ im Flotten-Eintrag: Kontore in der Karte der Reihe nach anklicken oder aus der Liste wählen; Enter/Haken legt die Route an
  (jeder Stopp entlädt zunächst alle Waren, geladen wird noch nichts). Danach im Routen-Editor je Stopp Entladen/Laden (Ware per Symbol, Modus, Menge),
  „Warten bis beladen“, Reihenfolge, Entfernen, „Stopp hinzufügen“, „Route löschen“. Jede Änderung geht sofort als `setRoute` an die Simulation.
- Kommandos: `shipGoto`, `setRoute` (`reset: true` = neu ab Stopp 1), `resumeRoute`, `shipLoad`, `shipUnload`, `renameShip`, `foundKontor`, `setIsland` (siehe `sim/sim.js`).

#### Funde auf See

Je Fund-Zelle (`FIND_CELL`, 32×32 Felder = ein Chunk) liegen 0–2 Treibgut (45 % / 40 % / 15 %) und mit 15 % ein Wrack, nur auf Meeresfeldern mit
mindestens `FIND_COAST` (3) Feldern Abstand zur Küste. Lage und Inhalt hängen nur vom Seed und der Zelle ab. Sichtbar sind Funde erst auf aufgedeckten Feldern,
auf der Minimap als kleine Punkte (Treibgut hell, Wracks orange). Ein Schiff sammelt einen Fund ein, wenn es höchstens 1 Feld entfernt vorbeifährt
oder dorthin gesteuert wird. Passt nicht alles in den Laderaum, bleibt der Rest liegen („Laderaum voll“). Eingesammeltes steht in `state.loot`.

Inhalt (`FIND_LOOT` in `src/data/finds.js`, Ring wie bei den Inseln):

| Art | Ring 0 | Ring 1 | Ring 2 | Ring 3 |
|---|---|---|---|---|
| Treibgut (Holz, Eisenerz, Kohle, Kalkstein) | 1 Ware, 10–30 | 1 Ware, 15–35 | 1 Ware, 20–40 | 2 Waren, je 20–40 |
| Wrack (Eisenbarren, Kupferbarren, Werkzeug) | 1 Ware, 20–40 | 1 Ware, 20–40 | 2 Waren, je 30–50, mit 30 % + 2–5 Skizzen | 2 Waren, je 40–60, mit 30 % + 1–3 Baupläne |

Neue Inhalte: Item in `data/items.js` anlegen und in `items` (oder `bonus`) der passenden Zeile eintragen.

#### Namensgenerator

`src/data/names.js` setzt Vorsilbe und Endung zusammen, abhängig vom Inseltyp: normal „Möwenklippe“, „Bernsteinbucht“, „Nebelriff“;
Sand „…düne“ („Muscheldüne“); Vulkan „…glut“ („Ascheglut“) oder „Feuer…“ („Feuerhorn“). Der Vorschlag hängt von Seed, Insel-ID und Versuch ab
(„Vorschlag“ im Dialog würfelt neu) und überspringt Namen, die schon vergeben sind. Flaggenfarben: die 8 Farben in `FLAGS` (`data/islands.js`).

### Darstellung

- Der Boden wird je Chunk einmal vorgerendert (`gfx/ground.js`), höchstens 6 ms pro Bild, zuletzt sichtbare Chunks zuerst; im Cache bleiben `MAX_CHUNK_IMAGES` (120) Bilder. Gezeichnet werden nur sichtbare Chunks, Bäume und Gebäude nur im sichtbaren Ausschnitt.
- Nebel-Bilder (`gfx/fog.js`) werden je Chunk gecacht und nur neu gemalt, wenn sich der Nebel des Chunks oder seiner Nachbarn ändert.
- Inselnamen stehen nur an benannten Inseln (Heimatinsel und Inseln mit gegründetem Kontor).
- Funde auf See werden mit den Bäumen und Gebäuden nach Tiefe sortiert gezeichnet, nur auf aufgedeckten Feldern.

### Wo nachjustieren?

| Was | Wo |
|---|---|
| Ringgrenzen, leere Zellen, Typ-Wahrscheinlichkeiten, Vorkommen je Typ | `RINGS` in `src/data/islands.js` |
| Inselgröße, Wachstum der Vorkommen mit der Entfernung | `islandRadius`, `oreScale` in `src/data/islands.js` |
| Heimatinsel | `HOME` in `src/data/islands.js` |
| Bergchance normaler Inseln | `ISL_TYPES.normal.mountainChance` |
| Umriss, Berge, Vulkan, Dünen, Bäume im Detail | `src/world/worldgen.js` |
| Zellgröße, Speichergrenzen, Aufdeck-Radien, Schiffssuche | `src/config.js` |
| Farben von Boden, Bergen, Lava, Vorkommen | `src/gfx/ground.js` |
| Rezepte (Zutaten, Zeit, Strom), Puffergrößen | `src/data/recipes.js` |
| Bohrer, Sägewerk, Fischer, Häuser, Ruhm | `src/data/mining.js` |
| Baukosten, Bandtempo | `src/data/buildings.js` |
| Forschungskosten | `src/data/tech.js` |

### Debug-Funktionen (Browser-Konsole)

| Aufruf | Wirkung |
|---|---|
| `tideworks.tp(x, y)` | Kamera auf Feld (x, y) |
| `tideworks.reveal(r)` | Nebel im Radius r (Standard 40) um die Kartenmitte aufdecken |
| `tideworks.islandAt(x, y)` | Insel der Zelle von (x, y): ID, Typ, Ring, Radius, Mitte, Vorkommen, entdeckt |
| `tideworks.debugKontor()` | Kontor auf die Insel in der Kartenmitte setzen (ohne Schiff) |
| `tideworks.giveShip(kind)` | neues Schiff am Kontor der Insel unter der Kamera (`kind`: `fracht` Standard, `entdecker`) |
| `tideworks.cargo(id, it, n)` | n Stück Ware it auf Schiff id laden (negativ: entnehmen) |
| `tideworks.finds(r)` | nicht eingesammelte Funde im Radius r (Standard 60) um die Kartenmitte |
| `tideworks.give(n, items, isl)` | n Stück jeder Ware (Standard 200, alle Items) ins Lager der Insel unter der Kamera (über dem Meer die zuletzt besuchte), mit `isl` in das einer bestimmten Insel; liefert die Insel-ID |
| `tideworks.tree()` | Skilltree: Layout, Ansicht, Auswahl, `screenOf(id)` = Bildschirmposition eines Knotens |
| `tideworks.unlockAll()` | Debug „Alles freischalten“ (nur Entwicklung, nur Host): alle Volk- und Story-Freischaltungen, alle Pläne, alle Forschungen. Füllt keine Lager (dafür der Testmodus) |
| `tideworks.unlock(key, src)` | einen Schlüssel freischalten (`src` = `npc`, `story` oder `debug`), z. B. `unlock('sortierer', 'npc')`, `unlock('plan:brann_dampf')`, `unlock('gruenden')`; ohne gültigen Schlüssel: Liste aller Schlüssel |
| `tideworks.relock(key)` | Freischaltung wieder entfernen (Test) |
| `tideworks.unlocks()` | alle Schlüssel mit Name, Quelle, Volk und ob/wodurch frei |
| `tideworks.chunks()` | Speicher: Chunks, Inseln, Baum- und Nebel-Chunks, Chunk-Bilder, Renderzeit |
| `tideworks.info()` | Seed, Modus, Speicherart, entdeckte Inseln |
| `tideworks.check(t, x, y)` | Platzierungsprüfung für Gebäude t (auch Rohre) |
| `tideworks.nets()` | Rohrnetze: Flüssigkeit, Menge, Speicher, Durchsatz, Rohre, Tanks, säurefest, angeschlossene Gebäude |
| `tideworks.event(id, warn)` | Ereignis sofort starten (`sturm`, `vulkan`, `schwarm`, `treibgut`, `fest`, `flaute`); `warn = true` kündigt es erst an. Ohne gültige id: Liste der ids. Läuft auch bei „Ereignisse aus“ |
| `tideworks.coins(n)` | n Münzen gutschreiben (Standard 1.000, negativ = abziehen; Posten „Test“) |
| `tideworks.trader(kind, isl)` | Händler (`hafen` Standard, `fern`) sofort zu jedem Handelsposten schicken, mit `isl` nur zu dieser Insel |
| `tideworks.damage(id)` | Gebäude id beschädigen (nur Gebäude, die ein Vulkan treffen kann) |
| `tideworks.net()` | Koop: Rolle, Phase, Lobby-Code, Vermittlung erreichbar, eigene ID, Ping; je Spieler Status, Ping, Verbindungsart, KB rein/raus, KB/s; lebende Markierungen, unbestätigte Bauten |
| `tideworks.netDebug(o)` | Koop-Schalter (bleiben in localStorage `tideworks.netDebug`): `{ blockPeer: true }` Vermittlung gilt als nicht erreichbar (→ „Manuell verbinden“), `{ server: '127.0.0.1:9000' }` eigener PeerServer, `{ secure: true }` dazu mit TLS, `{ fakeVersion: 'x' }` andere Spielversion vortäuschen; `null` löscht einen Schalter; ohne Argument: aktuelle Schalter |
| `tideworks.netDrop()` | Koop: Verbindung hart trennen (ohne Abmeldung), um das Wiederverbinden zu testen |
| `tideworks.wonder(n, opt)` | Leuchtturm (0.18.0, nur Host): ohne n Zustand; n Stufen fertig (mit Sichtweite); `'fire'` dazu Story-Auslöser `wonder:n` (bei 2: `cs_licht_im_wind` → Akt 3); `'site'` Stufe n fertig und Baustelle n+1 mit allen Waren, `'half'` mit der Hälfte |
| `tideworks.finale()` | Finale (0.22.0, nur Host): Akt 5, Leuchtturm Stufe 4 fertig, dann Szene `cs_wahrheit` und die Entscheidung; Test in `docs/TEST-FINALE.md` |
| `tideworks.ending('a'\|'b')`, `tideworks.endingInfo()` | Ende direkt setzen (0.23.0, nur Host, endgültig: vorher Kopie speichern): Szene, Dialog und Folgen; `endingInfo()` zählt Ruinen und eigene Gebäude auf den NPC-Inseln; Test in `docs/TEST-ENDEN.md` |
| `tideworks.relicsAll()`, `tideworks.pearls(n)`, `tideworks.relics()` | Relikte (0.24.0, nur Host): alle Relikte, die es noch nicht gibt, in die Sammlung; n Perlen (Standard 50, dazu je halb so viele Korallen und Muscheln) auf die Insel unter der Kamera; Sammlung als Liste; Test in `docs/TEST-RELIKTE.md` |
| `tideworks.mods()` | aktuelle Wirkungen aller Upgrades und Leuchtturm-Phasen (`reveal`, `tradeFreq`, `prod`, `tradePrice`, `evWarn`, `drones`, `powerAll`, `beam` …) |

## Lagerlogik, Bänder, Strom (Version 10, Spieltest-Runde 1)

### Speicher (`STORE_CAP`, `HQ`, `STORE`, `PORTS` in `data/buildings.js`; Logik in `sim/kontor.js`)

| Gebäude | Größe | Speicher | Besonderheit |
|---|---|---|---|
| Hauptkontor | 3×3 + Steg | `STORE_CAP.kontor` je Ware = **Inselinventar** | bezahlt Bauen, Häuser, Forschung, Schiffbau; Bänder an drei Seiten hinein, Steg zum Meer |
| Lagerkiste | 2×2 | `STORE_CAP.kiste` je Ware, eigener Bestand `b.inv` | nicht im Inselinventar; Abriss: Inhalt ins Hauptkontor |
| Handelskontor | 2×2 + Steg | `STORE_CAP.handelskontor` je Ware, eigener Bestand | nur auf Inseln mit Hauptkontor; Routen-Stopp, Schiffe laden/entladen dort |

- In alle Speicher liefern Bänder hinein (voll = Stau). **Heraus kommt nur ein Extraktor.** Die alte „Lager-Ausgabe“ gibt es nicht mehr.
- **Steg:** Hauptkontor und Handelskontor stehen 1–2 Felder von der Küste; R dreht den Steg beim Platzieren. Schiffe legen am Stegende an (Laterne bei Nacht).
- **Kontor verlegen** (Info-Panel des Hauptkontors): Vorschau wie beim Gründen, Enter oder Klick bestätigt. Inventar, Routen (über die Kontor-ID) und Schiffe bleiben.
- **Routen** zeigen auf Kontor-IDs (`stop.kontor`), nicht mehr auf Inseln; ein Stopp kann Hauptkontor oder Handelskontor sein.
- Abriss einer Kiste oder eines Handelskontors, die dabei mehr als 10 % verlieren würden (Hauptkontor voll), fragt nach (`demolishAsk`, `ui/panels.js`).
- Inventar-Panel: Titel „Inselinventar · Insel“, darunter einklappbar **„Weitere Speicher“** (Kisten, Handelskontore; Klick wählt das Gebäude).

### Logistik-Teile

- **Extraktor** (`EXTRACT`): seit 0.15.0 ohne Richtung, wie der Unloader in Mindustry (siehe „Nach dem Story-Test (0.15.0)“). Der Farbfleck zeigt den Filter (vierfarbig = alles).
- **Kreuzung** (früher „Brücke“): zwei Bänder kreuzen sich. Beim Ziehen quer über ein gerades Band entsteht sie von selbst (Hinweis nennt die Kosten).
- **Brückenband** (`BELT_BRIDGE`): zwei Enden auf einer Linie, bis zu `range` Felder dazwischen. Ein neues Ende verbindet sich mit dem nächsten freien Ende; im Info-Panel „Neu verbinden“/„Lösen“.
  Beim Ziehen über ein Hindernis, das eine Kreuzung nicht lösen kann, setzt das Spiel automatisch ein Brückenband-Paar (wenn die Lücke passt).
- **Tor** (`GATE`): Bandstück mit Schranke. G (ausgewähltes Tor) oder Umschalt+Klick schaltet um. Automatik: schließt ab `hi`, öffnet unter `lo` der gewählten Ware im Inselinventar.
- **Band ziehen:** Umschalt beim Ziehen sperrt die Achse. Seitliche Zuläufe bleiben erhalten, eine ungewollte Kurve am Streckenende wird begradigt.
- **Band leeren / Strecke leeren** (Info-Panel eines Bandes): die Items kommen ins Hauptkontor (Statistik-Quelle „Geleert“).

### Statistik

- **Soll/Ist:** Soll = was die Gebäude laut Rezept schaffen könnten, Ist = tatsächliche Produktion minus Eigenverbrauch (`sollIst`, `ui/stats.js`). Ist mehr als `IST_WARN` (20 %) unter Soll, wird es gelb.
  Inventar-Panel: Soll groß, Ist klein darunter. Statistik-Tabelle: Spalten Soll, Ist und **Einmalig** (Baukosten, Forschung, Schiffbau getrennt von laufendem Verbrauch).
- **Durchsatz je Gebäude** im Info-Panel (Soll gegen Ist aus `inspect`), für Bänder der Fluss in Items/min.
- **Strom-Tab** in der Statistik: Erzeugung, Verbrauch und Speicher je Netz mit Verlauf.

### Strom

- Netz-Zusammenfassung im Info-Panel: „Versorgt“ oder „Unterversorgt: −x/s“, aufklappbare Listen der Erzeuger und Verbraucher.
- Verbrennung und Kraftwerk zeigen eine aufklappbare **Brennwert-Tabelle** (Brennwert, Strom je Item in der Verbrennung und im Kraftwerk) und was in den letzten 60 s verbrannt wurde; der Tooltip „Brennwert“ erklärt die Zahl.
- Beim Bau eines Masts: gestrichelter Reichweiten-Rahmen, erreichbare Gebäude hervorgehoben, Kabel-Vorschau.

### Schiffe

- Die Werft hat zwei Knöpfe (`SHIP_KINDS` in `data/ships.js`): **Frachtschiff** (3 Laderäume) und **Entdecker** (1 Laderaum, schneller, Sicht 64 seit 0.15.0, vorher 40, Forschung Kartografie).
- **Selbst erkunden** (Entdecker, `EXPLORE`): seit Version 12 siehe „Entdecker“ im Abschnitt Version 12.

### Lesbarkeit

- Zahlen und kleine Beschriftungen in **Nunito** (800, `tabular-nums`), **Pixelify Sans** nur noch für Überschriften ab 15 px. `--muted` dunkler (#6b5034), `.xs` 12 px.
- Erz- und Barrenfarben deutlicher getrennt: Eisenerz rostrot mit dunklen Adern, Kupfererz graugrün mit Türkis, Eisenbarren kühles Blaugrau.

### Neuen Speicher hinzufügen

Eintrag in `BD` (mit `steg: true`, wenn er am Meer liegt), Kapazität in `STORE_CAP`, Typ in `STORE` (und `PORTS`, wenn Schiffe anlegen sollen),
Sprite in `gfx/sprites/storage.js`, Kapazitäts-Upgrade über `effect: { cap: { typ: n } }` in `data/tech.js`.

## Endgame: Münzen, Handel, Leuchtturm, Ereignisse, Drohnen (Version 11)

Alle Zahlen stehen in Tabellen: `data/trade.js` (Preise, Markt, Händler, Münzbuch, Wrack-Münzen), `data/events.js`, `data/wonder.js`, `data/drones.js`.
Die neuen Forschungen und Upgrades stehen wie alle anderen in `data/tech.js`, die Gebäude in `data/buildings.js`.

### Münzen (`sim/coins.js`)

- `state.coins` ist eine ganze Zahl und **kein Item**: nicht im Lager, nicht verschiffbar. Quellen: Handel, Wracks ab Ring 2, Ziele und Leuchtturm-Phasen.
  Ausgaben: Käufe bei Händlern, die Forschung „Weltenleuchtturm“ (2.000) und die Leuchtturm-Phasen.
- Jede Buchung geht mit Posten (`COIN_SRC`: Verkauf, Kauf, Funde, Leuchtturm, Ziele, Forschung, Reparatur, Test) ins Münzbuch `state.coinLog` (30-s-Eimer mit Kontostand, 60 min).
- Anzeige: Kopfleiste neben dem Ruhm (Tooltip: Einnahmen und Ausgaben der letzten 15 min je Posten), Statistik-Reiter **„Münzen“** (Tabelle 15/60 min, Säulen je 30 s, Kontostand-Verlauf).

### Handel (`sim/trade.js`, Fenster „Markt“ `ui/market.js`)

- **Handelsposten** (`handel`, 3×3, Schifffahrt): mindestens 2 Meeresfelder daneben, höchstens einer je Insel, nur auf Inseln mit Hauptkontor.
  Kosten 60 Ziegel, 30 Eisenbarren, 20 Glas, 5 Baupläne; Forschung `handel` (Stufe 3, 15 Skizzen + 30 Werkzeug). Der Anleger (`_tdock`) ist ein Meeresfeld neben dem Posten.
- **Händler** (`TRADERS`) segeln sichtbar per A* (gleicher Seeweg wie Schiffe), haben eigene Sprites mit Wimpel, legen `dock` = 20 s an, handeln beim Anlegen und fahren den Weg zurück.
  Sie sind nicht steuerbar, sammeln nichts ein und blockieren nichts. Termine je Insel und Händlerart in `state.trade.due` (`'hafen:0'` = Spielzeit des nächsten Besuchs).
  - **Hafenhändler:** alle 3 min, kauft und verkauft Grund- und Zwischenwaren (`BASIC`).
  - **Fernhändler:** alle 12 min, sobald irgendwo ein Kontor auf einer Insel ab Ring 2 steht; kauft Mikrochips, Kunststoff, Schmiermittel, Fässer (leer und gefüllt) und Supermagnete,
    verkauft ein wechselndes Angebot aus `offer` (3–4 Einträge nach Gewicht, je mit Vorrat; Neodym, Schwefel, Rohöl-Fässer, Neodym-Erz, manchmal Baupläne/Schaltpläne).
- **Preise:** `PRICES` × 100 % (Händler kauft) bzw. × 140 % (Händler verkauft). Je 10 verkaufte Stück sinkt der Ankaufpreis um 1 % (höchstens −60 %), erholt sich um 2 % je Minute;
  Kaufen hebt den Verkaufspreis genauso. Gehandelt wird in Teilgeschäften zu 10 Stück, der Preis wird dazwischen neu berechnet. Pläne kann man nur kaufen.
  Boni auf den Ankaufpreis: `handel1` „Zunftbriefe“ (+15 %), Leuchtturm Phase 3 (+10 %), Händlerfest (+25 %). `handel2` „Schnellsegler“ und Phase 1 lassen Händler öfter kommen.
- **Handelsaufträge** je Insel (`state.orders`, höchstens 12): Verkaufen „über Bestand N“ mit optionalem Mindestpreis, Kaufen „bis Bestand N“ mit optionalem Höchstpreis
  (nur so viel, wie Münzen und Lagerplatz reichen). Höchstens 200 Stück je Ware und Besuch. Reihenfolge = Ausführungsreihenfolge (▲ schiebt nach oben).
  Editor im Info-Panel des Handelspostens und im Fenster „Markt“ (Taste **K**, Knopf in der Knopfleiste; M öffnet seit Version 12 die Kartenansicht).
- **Toast je Besuch:** „Hafenhändler auf Möwenklippe: 120 Holz verkauft (+240), 20 Glas gekauft (−280)“. Statistik-Quelle der Waren: „Handel“.
- **Markt-Fenster:** Kontostand, nächste Ankunft je Händler und Insel (bzw. „liegt an“, Angebot des Fernhändlers), Aufträge je Insel, Preisliste mit Ankauf/Verkauf, Trendpfeil (gegen ~2,5 min vorher),
  Mini-Verlauf der letzten 20 min (grün Ankauf, orange Verkauf) und welche Händler die Ware handeln.

### Weltenleuchtturm (`sim/wonder.js`, `data/wonder.js`)

- **Seit 0.18.0:** jede Stufe ist eine Baustelle (Waren per Band oder 12/s aus dem Inselinventar, keine Münzen), Stufe 3/4 nach den Flags `karte_gefunden`/`pumpe_gefunden`, Sichtweite je Stufe, eigene Optik je Stufe mit dunkler Lampe; Stufe 2 löst `cs_licht_im_wind` und Akt 3 aus. Details in NOTES.md „Leuchtturm-Stufen, Akt 2 und cs_licht_im_wind (0.18.0)“, Test in `docs/TEST-AKT2.md`. Debug: `tideworks.wonder(n[, 'fire'|'site'|'half'])`.
- **Seit Version 16 gilt der Abschnitt „Geschichte und NPC-Inseln (Version 16)“:** Bauplan von Brann am Ende von Akt 1, nur auf der Heimatinsel, Stufen nach Akt, neue Kosten, keine Wirkungen und kein Ruhm, Lichtstrahl erst nach Ende A. Der Rest dieses Abschnitts beschreibt Version 11–15.
- `leuchtturm`, 5×5, Schifffahrt, einmal in der Welt; auf der Heimatinsel oder einer Insel ab Ring 2 mit Hauptkontor, am Meer. Seit Version 15 keine Forschung mehr, sondern Quelle Story (`UNLOCKS.leuchtturm`, Akt 2).
- Vier Phasen, jede im Info-Panel beauftragt (Waren aus dem Inselinventar plus Münzen), dann 2 min Bauzeit mit Gerüst; der Turm wächst sichtbar mit dem Fortschritt. +500 Ruhm je Phase.
  Wirkungen über `mods(g)`: Phase 1 Aufdeck-Radius +50 %, Händler +20 % öfter; Phase 2 alle Produktion +10 % (`prodOf`); Phase 3 Ankaufpreise +10 %, Ereignisse 1 min früher, +2 Drohnen je Hafen;
  Phase 4 alle Generatoren +15 % (`powerOf`), Lichtstrahl nachts (`BEAM`), Ziel. Nach Phase 4 erscheint ein Abschlussfenster (Spielzeit, Gebäude, Inseln, Ruhm, Münzen), das Spiel läuft weiter.
- Nach Baubeginn der ersten Phase lässt sich der Leuchtturm nicht mehr abreißen.

### Ereignisse (`sim/events.js`, `data/events.js`)

- Ab Spielminute 20 im Mittel alle 8 min (gleichverteilt 4–12 min Abstand), 60 s vorher angekündigt (mit Phase 3: 120 s): Toast, Symbol mit Countdown in der Kopfleiste, Kreis auf der Minimap.
  Laufende Ereignisse stehen rechts oben (`#evBar`). Zufall aus Seed + Ereigniszähler, deshalb verschiebt Speichern/Laden nichts; angekündigte und laufende Ereignisse sind im Spielstand.
- Zahnrad-Menü: **aus** (nichts Neues, Angekündigtes fällt aus), **sanft** (halb so oft, keine Schäden), **normal**.
- Sturm (3 min, Radius 60 um eine Kontor-Insel: Schiffe und Händler −50 % Tempo, Fischer −50 %, Regen und Schaumkronen), Vulkan (2 min, Vulkaninsel mit Gebäuden: Geothermie +50 %,
  jedes Gebäude bis 6 Felder neben Lava mit 20 % beschädigt, Asche und Glut), Fischschwarm (4 min, Fischer der Insel +100 %), Treibgutfeld (5 min, 6–10 Treibgut-Kisten, die danach verschwinden),
  Händlerfest (3 min, Ankauf +25 %, ein zusätzlicher Hafenhändler), Flaute (2 min, alle Schiffe −25 %).
- **Beschädigt** (`b.dmg`): steht still, roter Schraubenschlüssel über dem Gebäude, rot in der Statusansicht. Reparatur im Info-Panel für 20 % der Baukosten (aufgerundet) oder durch Drohnen.
  Abriss bleibt möglich (50 % Erstattung wie immer).

### Drohnen (`sim/drones.js`, `data/drones.js`)

- **Drohnenhafen** (`drohnenhafen`, 2×2, Logistik; 30 Stahl, 20 Kunststoff, 10 Chips, 2 Supermagnete, 2 Schaltpläne; Forschung Stufe 6 nach „Supermagnete“):
  4 Drohnen (`drohnen1` „Größere Schwärme“ +4, Leuchtturm Phase 3 +2), Arbeitsradius 20 Felder (gestrichelter Rahmen bei Auswahl und Bauvorschau),
  Strom 2/s plus 1/s je fliegender Drohne; ohne Strom starten keine neuen Flüge. Info-Panel: freie/fliegende Drohnen, offene Anforderungen, Durchsatz je Minute.
- **Drohnenkiste** (`dkiste`, 1×1, 5 Stahl + 2 Kunststoff): „Anbieten“ nimmt Waren von Bändern an (höchstens 50), „Anfordern“ hat Ware und Zielmenge und gibt auf abgehende Bänder aus.
- Drohnen fliegen nur zwischen Kisten im Radius ihres Hafens (gleiche Insel), bis 10 Stück je Flug mit 6 Feldern/s, zuerst Reparaturen (wenn das Inselinventar die Kosten deckt), dann Anforderungen aus der nächsten Anbieten-Kiste.

## Tideworks: Titel, Spielstände, Karte, Sortierer (Version 12)

Spieltest-Runde 2. Der Name ist jetzt **Tideworks** (Fenstertitel, Logo, `package.json` Version 0.4.0, Einzeldatei `dist/tideworks.html`).

### Titelbildschirm und Pausenmenü (`ui/menu.js`, `#title` und `#pauseMenu` in `index.html`)

- Pixel-Logo (`makeLogo` in `gfx/sprites/ui.js`, Zeichen: Zahnrad mit Welle, auch als Favicon), Knöpfe **Fortsetzen** (zuletzt gespielter Stand mit Name und Spielzeit),
  **Neues Spiel** (Name und Seed; Seed leer = zufällig, Text wird zu einer Zahl), **Spiel laden**, **Koop** (seit Version 13, siehe „Koop (Version 13)“). Unten rechts die Version.
- Im Hintergrund läuft eine **Demo-Fabrik** (`data/demo.js`: Seed, Bauliste, Schiffsroute, Kamerapfad `cam`, Zoom; `sim/demo.js` baut sie). Tag und Nacht laufen `DEMO.day`-mal so schnell, Lager werden alle `refresh` s aufgefüllt.
  Die Demo ist eine eigene Welt im Simulations-Host (Nachricht `demo`) und wird nie gespeichert.
- **Pausenmenü** über Esc (wenn nichts anderes offen ist) oder das Zahnrad oben rechts: Fortsetzen, Speichern, Spiel laden, Tastenkürzel, Testmodus, Ereignisse an/aus, Hauptmenü (speichert vorher).
  Solange es offen ist, steht die Simulation; danach gilt wieder das vorige Tempo. Das alte Zahnrad-Menü ist darin aufgegangen.

### Spielstände (`save/storage.js`)

- Beliebig viele Spielstände. IndexedDB `tideworks`: Store `saves` (ID → JSON), `meta` (ID → Name, Erstellt, Zuletzt gespielt, Spielzeit, Inseln, Vorschaubild 96×72), `kv` (`blueprints`, `last`).
- Ohne IndexedDB: localStorage mit Präfix `tideworks.` und höchstens `LOCAL_SLOTS` (3) Ständen; „Neues Spiel“ meldet dann, wenn kein Platz mehr frei ist.
- Autosave alle 15 s (`SAVE_EVERY`), beim Schließen und wenn die Seite in den Hintergrund geht, vor „Hauptmenü“ und vor dem Laden eines anderen Stands.
- **Spiel laden**: Liste mit Vorschaubild, Datum, Spielzeit, Inseln und den Knöpfen Laden, Umbenennen, Exportieren, Löschen (der laufende Stand lässt sich nicht löschen) sowie „Datei importieren“.
- **Übernahme beim ersten Start:** IndexedDB `workscape` (Schlüssel `slot1` und `blueprints`) und localStorage `workscape.factory.v2`/`workscape.blueprints` werden zu „Spielstand 1“ und zur Blaupausen-Bibliothek.
  Erst wenn das Schreiben geklappt hat, werden die alten Daten gelöscht.

### Kamera und Kartenansicht (`gfx/camera.js`, `ui/mapview.js`)

- WASD/Pfeile: `CAM_SPEED` in `config.js` (Grundtempo 2,5-mal so schnell wie bisher, Umschalt ×3, 0,15 s Anfahren).
- **Kartenansicht (Taste M**, Knopf „Karte“): 5 Zoomstufen (Mausrad, +/−), Ziehen verschiebt, Klick springt dorthin und schließt, Klick auf ein Schiff wählt es aus.
  Zeigt Inseln (aufgedeckter Teil), Kontore mit Flagge und Namen, Handelskontore, Routen mit nummerierten Stopps, Schiffe in Fahrtrichtung, Funde und das Kamera-Rechteck. Filter oben (in `state.ui.mapF` gespeichert).
- **Der Markt liegt jetzt auf K** (vorher M).

### Entdecker (`EXPLORE` in `data/ships.js`, `tickAuto` in `sim/ships.js`)

- Ziel ist der Rand des Nebels mit der kleinsten Wertung *Abstand zum Schiff + home × Abstand zur Heimatinsel* (Ränder näher als `hop` Felder bekommen einen Aufschlag). Gesucht wird zuerst im Radius `start` um die Heimatinsel, ohne Treffer wächst er um `step`.
- Reichweite je Schiff (Schalter im Schiffs-Panel): Nah, Mittel (Standard), Weit Felder um die Heimatinsel (`EXPLORE.ranges`).
- Werte seit 0.15.0: Sicht 64, `home` 0, `hop` 64, `start` 450, `step` 250, Nah 900 / Mittel 1.500 / Weit 2.400 (vorher Sicht 40, `home` 2, 300/150, 600/1.000/1.500).
- Ist innerhalb der Reichweite nichts mehr zu entdecken, fährt er zum Hauptkontor zurück und meldet einmal „Umgebung erkundet“. Unerreichbare Ziele werden pro Schiff gemerkt (nicht im Spielstand).

### Brückenband und Sortierer (`sim/logistics.js`)

- **Brückenband** (`BELT_BRIDGE`): Tempo = das schnellste zuführende Band (höchstens `max` 4/s); ohne Zulauf seit 1,5 s gilt `rate` 1/s. Das Info-Panel zeigt das Tempo.
- **Sortierer** (`sortierer`, Logistik, 2 Holz + 1 Eisen): nimmt von hinten an; die gewählte Ware läuft geradeaus, alles andere abwechselnd links/rechts. „Umkehren“ tauscht das (gewählte Ware zur Seite, Rest geradeaus).
  Ist eine Seite blockiert, geht es über die andere. Die Einstellung (`so: { it, rv }`) übernehmen Pipette (Q), Blaupausen und Rückgängig. Der Farbfleck zeigt die Ware, ein heller Rand „Umkehren“.

### Kraftwerke

- Das Dampfkraftwerk läuft auch bei vollem Speicher weiter; der Überschuss wird verworfen. Info-Panel und Strom-Netz zeigen „Genutzt“ und „Überschuss verworfen“. Geothermie ist immer aktiv.

### Ziele und Forschung

- Das Ziel „Waren extrahieren“ ist entfallen. Ziele werden nach id gemerkt (`state.gdone`), damit spätere Änderungen an der Liste keine Stände verschieben.
- `dampf` setzt `stahl` voraus (Dampfkraftwerk also erst nach Stahl). `npm run check:tree` ist sauber.

### Scrollposition (`setHTML`/`patchList` in `ui/common.js`)

- Panels werden nicht mehr per `innerHTML` ersetzt, sondern mit dem DOM abgeglichen (morph): Scrollposition, Fokus und offene Auswahllisten bleiben erhalten.
- Liegt die Maus über dem Panel und kam seit 0,8 s keine Eingabe, ändern sich nur Texte und Zahlen; neue oder wegfallende Elemente folgen, wenn die Maus geht (spätestens nach 2,5 s), damit nichts unter dem Zeiger springt.
- `setHTML(el, html, key)`: wechselt `key` (z. B. ein anderes ausgewähltes Gebäude), wird neu aufgebaut und beginnt oben.

### Debug

- `window.tideworks` (Alias `window.workscape`) hat zusätzlich `slot()` (laufender Spielstand), `save()` (sofort speichern), `menu()` (zurück zum Titel) und `giveShip('entdecker')`.

## Koop (Version 13)

Bis zu 4 Spieler (`NET.maxPlayers`) bauen gemeinsam. Ein Spieler ist **Host**: Nur seine Simulation läuft, alle anderen sind Spiegel.
Alle Zahlen stehen in `src/data/net.js` (Takte, Zeitgrenzen, Vermittlung, Farben, Chat, Markierungen).

### Ablauf

- **Titelbildschirm → Koop**: oben eigener Name und Farbe (localStorage `tideworks.profile`, dort auch die feste Spieler-ID `p…` für das Wiederverbinden).
  Darunter **Lobby gründen** und **Beitreten** (Feld für den Code; Kleinbuchstaben, ohne Bindestrich oder der ganze Link gehen auch). „Manuell verbinden“ steht klein darunter und erscheint, wenn die Vermittlung nicht erreichbar ist.
- **Lobby gründen**: *Neue Welt* (Name, Seed) oder *Koop-Spielstand fortsetzen* (nur Koop-Stände, mit Spielernamen). Modus *Gemeinsame Insel* oder *Getrennte Inseln*
  (bei einem fortgesetzten Stand fest). Bei *Getrennte Inseln* die Spielerzahl (2, 3 oder 4 Plätze), bei *Gemeinsame Insel* die Vorgabe „Mitspieler dürfen meine Gebäude abreißen“.
- Die Welt des Hosts wird dabei schon geladen und steht angehalten hinter der Lobby; die Demo endet. Mitspieler bekommen die Welt beim Beitreten (sie laden nie eine eigene).
- **Lobby**: Code `TIDE-XXXX` (ohne 0/O, 1/I/L) mit „Code kopieren“ und „Link kopieren“ (`…/tideworks.html#join=TIDE-XXXX`; der Link öffnet direkt „Beitreten“ mit dem Code),
  Spielerliste (Farbe, Name, Status, Ping), Einstellungen (beim Mitspieler nur lesbar), Chat, eigener Name und Farbe (vergebene Farben sind gesperrt), **Spiel starten** (nur Host).
- **Beitritt während des Spiels**: Der Host bekommt oben „<Name> möchte beitreten“ mit Zulassen/Ablehnen (ohne Antwort nach 60 s abgelehnt). Wer nur kurz weg war (gleiche Spieler-ID), kommt ohne Rückfrage wieder.
- **Ende**: Beendet der Host (Hauptmenü, Tab zu) oder bleibt er weg, steht beim Mitspieler „Der Host hat das Spiel beendet“ und er landet im Titelbildschirm (Demo läuft wieder).
  Geht ein Mitspieler, bleiben seine Gebäude; im Chat steht „<Name> hat das Spiel verlassen“. Er kann mit demselben Code wieder beitreten: gleiche ID, gleiche Farbe, eigener Rückgängig-Stapel leer.
- **Abbrüche**: Kommt 10 s nichts an (`NET.timeout`), zeigt der Mitspieler „Verbindung wird wiederhergestellt …“ und wählt sich alle 3 s neu ein (nur über die Vermittlung), höchstens 30 s lang (`NET.reconnect`).
  Der Host markiert ihn so lange als „Verbindung verloren“ und entfernt ihn danach.

### Technik

- **WebRTC-Datenkanäle über PeerJS 1.5.5** (MIT, im Bundle, also auch in `dist/tideworks.html` per Doppelklick). Vermittlung: der kostenlose PeerJS-Dienst (`0.peerjs.com`), dazu öffentliche STUN-Server und der TURN-Server von PeerJS (`ICE`).
  Die Peer-ID des Hosts ist `tideworks-` + Code, Mitspieler wählen eine eigene zufällige ID. Weil beide Seiten ihre ID selbst wählen, braucht PeerJS keinen HTTP-Abruf; nur die WebSocket-Verbindung zur Vermittlung (geht auch aus file://).
- **Manuell verbinden** (ohne Vermittlung): Der Host erzeugt in der Lobby einen Angebots-Code (`TWO-…`, komprimierte Sitzungsbeschreibung mit allen ICE-Kandidaten), der Mitspieler fügt ihn unter „Manuell verbinden“ ein und schickt den Antwort-Code (`TWA-…`) zurück.
  Ein Angebot gilt für einen Mitspieler. Ohne Vermittlung gibt es kein automatisches Wiederverbinden.
- **Versionsprüfung** beim Beitreten: Spielversion (`package.json`), `SAVE_VERSION` und ein Prüfwert über alle Tabellen in `src/data/` (`net/version.js`). Weicht etwas ab: „Ihr nutzt verschiedene Versionen von Tideworks“, kein Beitritt.
- **Nur der Host rechnet.** Mitspieler schicken dieselben Kommandos wie die eigene Oberfläche (`{ t: 'cmd', cmds, seq }`); der Host gibt sie mit der Spieler-ID an seine Simulation (`applyCommand(g, c, pid)`).
  Sie prüft die Rechte: Host-Kommandos (`HOST_ONLY` in `sim/sim.js`: Testmodus, Debug, Ereignis-Einstellung, Spieler eintragen …) von Mitspielern verfallen, Tempo, Pause, Speichern und Laden sind ohnehin keine Kommandos.
- **Schlanke Snapshots** (`sim/views.js`): Jeder Mitspieler hat im Simulations-Host eine Ansicht mit eigenem Zwischenspeicher. Höchstens 10-mal je Sekunde geht ein Snapshot mit nur den Änderungen seit dem letzten an diesen Mitspieler:
  kleine Zustandsteile nur nach Änderung, Gebäude feldweise (im Sichtbereich + 1 Chunk Rand und das ausgewählte Gebäude jedes Mal, außerhalb einmal je Sekunde; Lage, Typ, neue und abgerissene Gebäude sofort),
  Band-Items nur im Sichtbereich (Ware und Fortschritt als Uint8Array), Schiffe feldweise, Statistik, Markt und Durchsatz des ausgewählten Gebäudes einmal je Sekunde, Bäume/Nebel/Rohre als geänderte Chunks.
  Der Mitspieler meldet seinen Kamera-Ausschnitt alle 0,5 s. Kommazahlen werden auf drei Stellen gerundet, ab 400 Byte wird komprimiert (deflate, im Worker). Ist der Datenkanal voll (512 KB), wartet der Host mit Snapshots.
- **Interpolation**: Der Mitspieler misst den Abstand der Snapshots (gleitender Mittelwert, 50–400 ms) und bewegt Band-Items und Schiffe über diese Dauer.
- **Bauen fühlt sich sofort an**: Ein Bau-Kommando legt beim Mitspieler gleich eine halb durchsichtige Vorschau mit kleinem Ladesymbol an (`pending` in `net/remote.js`), bis der Host den Befehl bestätigt (`ack`) oder 8 s vergangen sind.
- **Meldungen**: persönliche (gebaut, fehlgeschlagen, abgerissen, Kontor gegründet …) bekommt nur der Auslöser; allgemeine (Forschung, Ziel, Ereignisse, Händler, Funde, Leuchtturm) alle (`SHARED_EV` in `sim/views.js`).
  Forscht ein anderer, steht es grau im Chat statt als Toast.
- **Was jeder selbst hat**: Kamera, Auswahl, Baumodus, Fenster, Kartenansicht, Statusansicht und die Blaupausen-Bibliothek (Platzieren läuft als Kommando über den Host).
- **Zeiger und Vorschau** (`gfx/peers.js`, `localPeerState`): etwa 10-mal je Sekunde Mauszeiger, Modus, Bauvorschau (Gebäude, gezogene Linie, Blaupause), Abriss-/Aufwerten-Rahmen und Kamera-Ausschnitt; der Host verteilt das ohne Simulation.
  Eine Blaupause geht nur einmal mit (höchstens 300 Teile), danach nur ihre Lage.
- **Host im Hintergrund**: Im Koop hält der Host nicht an, wenn sein Tab versteckt ist oder das Pausenmenü offen ist („Das Spiel läuft weiter“). Die Simulation muss dafür im Web Worker laufen
  (Koop startet ihn auch bei `USE_WORKER = false`); geht das nicht, warnt die Lobby: „Dein Browser drosselt das Spiel im Hintergrund – Tab bitte im Vordergrund lassen.“
- **Tempo und Pause** bestimmt nur der Host. Beim Mitspieler sind die Knöpfe ausgegraut („Nur der Host“), Leertaste und Umschalt+1/2/3 wirken nicht; „Pausiert“ und die entsättigte Karte sehen alle.
- **Pausenmenü im Koop**: Lobby-Code, Spieler mit Ping und der eigene Schalter „Mitspieler dürfen meine Gebäude abreißen“. Mitspieler: kein Speichern/Laden/Testmodus/Ereignisse, „Hauptmenü“ heißt „Sitzung verlassen“.
  „Spiel laden“ gibt es im Koop auch beim Host nicht (er beendet dazu die Sitzung).
- Spielzeit, Vorschaubild, Autosave und das Speichern beim Schließen gibt es nur beim Host.

### Gemeinsame Insel

- Alles gehört allen: Inseln, Kontore, Inselinventar, Gebäude, Schiffe und Routen (jeder kann jedes Schiff steuern), Forschung, Ruhm, Münzen, Handelsaufträge, Leuchtturm, Ziele, Nebel.
- Jedes Gebäude merkt sich seinen Erbauer (`by`), das Info-Panel zeigt „gebaut von <Name>“ (in der Spielerfarbe), sobald mehr als ein Spieler im Spielstand steht. Bedienen darf jeder alles.
- **Abreißen fremder Gebäude** nur, wenn der Erbauer es erlaubt (Schalter je Spieler im Pausenmenü, Vorgabe aus der Lobby), sonst „<Name> erlaubt kein Abreißen seiner Gebäude.“ Das gilt auch für Rückgängig.
- **Rückgängig** nur für eigene Aktionen: ein Stapel je Spieler in der Simulation (`g.undos`).
- Mitspieler sieht man als kleinen Pfeil in ihrer Farbe mit Namen, ihre Bauvorschau halb durchsichtig in ihrer Farbe; auf Minimap und Kartenansicht ihren Kamera-Ausschnitt als Rahmen in ihrer Farbe.
- Gespeichert wird nur beim Host, als **Koop-Spielstand** (in „Spiel laden“ mit „Koop“ und den Spielern markiert; in den Metadaten `coop`, `mode`, `players` mit ID, Name, Farbe).

### Chat und Markierungen

- **Chat** (`ui/chat.js`): Enter öffnet die Eingabe unten links (nicht in Modi, die Enter brauchen: Kontor gründen/verlegen, Route anlegen, Dialoge, Eingabefelder), Enter schickt, Esc schließt.
  Nachrichten stehen 8 s da (Name in Spielerfarbe), Systemmeldungen grau (beigetreten, verlassen, Forschung, Ziel). Der Knopf daneben zeigt den Verlauf (letzte 100).
- **Markierungen** (`ui/marks.js`): mittlere Maustaste (Klick ohne Ziehen; Ziehen verschiebt weiter die Karte) oder Alt+Klick öffnet ein Halbkreis-Menü: Hierher, Achtung, Hilfe, Bauplatz.
  Alle sehen die Markierung 15 s lang auf Karte, Minimap und Kartenansicht in der Farbe des Spielers, mit kurzem Ton und Aufblitzen. Liegt sie außerhalb des Bildschirms, zeigt ein Pfeil am Rand die Richtung; ein Klick darauf fährt hin.

### Getrennte Inseln

Siehe den eigenen Abschnitt „Getrennte Inseln (Version 14)“ unten.

### Grenzen

- Getestet mit 2 Spielern; 4 sind erlaubt. Gegen den echten PeerJS-Dienst wurde aus der Testumgebung nicht verbunden (siehe NOTES.md), nur gegen einen lokalen PeerServer und manuell.
- Ohne TURN-Server kommen Verbindungen hinter strengen Firmen-NATs eventuell nicht zustande; der kostenlose PeerJS-TURN ist eingetragen, aber nicht garantiert.
  Einen eigenen TURN/STUN-Server trägt man unter **Koop → Verbindung** ein (siehe „Getrennte Inseln (Version 14)“, TURN).
- Manuell verbundene Mitspieler können sich nach einem Abbruch nicht selbst neu verbinden (neue Codes nötig).
- Der Mitspieler sieht Gebäude außerhalb seines Bildschirms mit bis zu 1 s Verzögerung (nur deren Zustand, nicht ob es sie gibt).

### Testen (zwei Fenster)

- Zwei Browser-Profile (oder ein normales und ein privates Fenster), weil Name, Farbe und ID im localStorage liegen. Beide `npm run dev` bzw. `dist/tideworks.html` öffnen.
- Ohne Internet: lokalen PeerServer starten (`npx -p peer peerjs --port 9000 -H 127.0.0.1`) und in beiden Konsolen `tideworks.netDebug({ server: '127.0.0.1:9000' })`.
- Manuelle Verbindung erzwingen: `tideworks.netDebug({ blockPeer: true })`. Versionsprüfung: beim Mitspieler `tideworks.netDebug({ fakeVersion: '0.0.1' })`. Zurück: dieselben Schalter mit `null`.

## Getrennte Inseln (Version 14)

Jeder Spieler hat seine eigene Heimatinsel, seinen eigenen Nebel, seine eigene Forschung und seine eigenen Münzen. Alle spielen in derselben Welt und können miteinander handeln.
Wer zuerst den Weltenleuchtturm entzündet, gewinnt den Wettstreit. Die Simulation läuft weiterhin nur beim Host.
Einzelspieler und „Gemeinsame Insel“ verhalten sich genau wie in Version 13 (geprüft mit einem Vergleich gegen den Stand von Version 13).

### Plätze und Welt (`HOME_SLOTS` in `data/islands.js`, `sim/state.js`, `world/worldgen.js`)

- Der Host wählt in der Lobby **2–4 Plätze** (`HOME_SLOTS = { min: 2, max: 4, dist: 200 }`). Jeder Platz bekommt eine Heimatinsel nach der Vorlage `HOME`, etwa 200 Felder voneinander entfernt (Zellen aus `homeCells`).
  Die Ringe (Inseltypen und Schwierigkeit) richten sich nach der **nächsten** Heimatinsel. Die Welt hängt nur vom Seed und der Platzzahl ab; `npm run check:world` prüft, dass sie stets gleich erzeugt wird und der Einzelspieler-Start gleich bleibt wie in Version 13.
- `state.homes = [{ slot, cx, cy, pid }]`: Startplätze mit Zelle der Heimatinsel und Spieler (`null` = frei). Der Host sitzt auf Platz 1.
- **Wer beitritt**, bekommt den nächsten freien Platz und einen frischen Start (Hauptkontor, Startwaren, Ziele). Eine bekannte Spieler-ID bekommt ihren alten Platz zurück.
  Sind alle Plätze vergeben: „Diese Welt ist voll (x Spieler).“ (auch beim Beitritt während des Spiels).
- Die eigene Heimatinsel heißt „Heimatinsel“, die der anderen „<Name>s Heimatinsel“ (in der Spielerfarbe). Die Heimatinseln aller Mitspieler sind von Anfang an aufgedeckt.

### Besitz

- **Eine Insel gehört dem, dessen Hauptkontor dort steht.** Auf fremden Inseln kann man nicht bauen, kein Kontor gründen und keine Rohre legen („Diese Insel gehört <Name>.“).
  Gründen zwei Spieler fast gleichzeitig ein Kontor (`FOUND_RACE.recent` = 30 s in `data/trade.js`), bekommt der zweite „Gerade von <Name> besiedelt.“, und das Holz bleibt an Bord.
- Gebäude (`by`/`owner`), Schiffe (`owner`) und Routen gehören ihrem Spieler. Fremde Gebäude öffnen ein Info-Panel nur zum Ansehen („Gehört <Name>“, ohne Bestand und Einstellungen).
  Fremde Schiffe lassen sich anklicken (Name, Art, Besitzer, „Unterwegs“/„Liegt an“), aber nicht steuern. Die Flotte zeigt nur eigene Schiffe.
- Abreißen fremder Gebäude ist nie erlaubt („Abreißen nicht erlaubt – Gebäude von <Name>“); der Schalter „Mitspieler dürfen meine Gebäude abreißen“ gibt es in diesem Modus nicht.
  Rückgängig, Pipette, Aufwerten und Blaupausen (Aufnehmen) wirken nur auf eigene Gebäude.
- Fremde Kontore zeigen die Flagge ihres Besitzers mit einem Rahmen in seiner Farbe. Minimap und Kartenansicht umranden die Inseln der Mitspieler in ihrer Farbe; die Inselliste oben zeigt sie unter „Mitspieler“.
- Die Simulation prüft das alles (`command()` in `sim/sim.js`, `ownWhy` in `sim/buildings.js`); die Oberfläche blendet nur aus, was ohnehin abgelehnt würde.

### Was jeder für sich hat (`PLAYER_FIELDS`, `pst(g, pid)` in `sim/state.js`)

- Nebel, Forschung und Upgrades (`mods(g, pid)`), Ruhm, Münzen und Münzbuch, Ziele, Leuchtturm-Phase, entdeckte und kartierte Inseln, Händlerbesuche, Ereignis-Vorwarnung.
  Die Werte des Hosts stehen wie bisher oben in `state`, die der Mitspieler in `state.players[pid].st`; den Nebel der Mitspieler speichert der Spielstand als `pfog`.
- **Datenschutz** (`sim/privacy.js`): Jeder Mitspieler (und der Host selbst) bekommt nur, was er sehen darf: fremde Gebäude nur im eigenen aufgedeckten Bereich und ohne Puffer, Bestand oder Einstellungen,
  fremde Schiffe ohne Ladung und Route, fremde Inseln ohne Inventar, Bäume und Rohre nur im eigenen Nebel, eigene Statistik, eigene Ereignisse.
- **Ereignisse** (`sim/events.js`) gehen an die Spieler, die den Ort aufgedeckt haben oder dort etwas besitzen; jeder wird mit seiner eigenen Vorwarnzeit angekündigt.
  Der **Fernhändler** kommt zu einem Spieler erst, wenn er ein Kontor in Ring 2 oder weiter draußen hat. **Drohnen** nutzen nur Kisten ihres Besitzers.

### Handel zwischen Spielern (`sim/ptrade.js`, Erlaubnis in `sim/ships.js`)

- **Routen zum Hauptkontor eines Mitspielers**: Im Routen-Editor stehen auch aufgedeckte fremde Kontore („<Name> · Hauptkontor“). Der Besitzer muss die Route erlauben:
  Er bekommt einen Hinweis und unter **Flotte → Anfragen** die Route mit ihren Aufträgen an seinem Kontor („Erlauben“/„Ablehnen“), erlaubte stehen unter **Flotte → Erlaubte Routen** („Widerrufen“).
  Bis dahin überspringt das Schiff den Stopp („Wartet auf Erlaubnis von <Name>“). Ändern sich die Aufträge an diesem Kontor, wird neu gefragt.
  Lieferungen zählen in der Statistik als „Schiffe (<Name>)“.
- **Preislisten an Handelskontoren**: Im Info-Panel eines eigenen Handelskontors und im Markt (K), Reiter „Spieler“, legt man fest, was Mitspieler kaufen (Preis, Menge, die bleiben soll) und was man ankauft (Preis, bis zu welchem Bestand).
  Der Händlerpreis steht als Hinweis daneben. Grenzen in `PLAYER_TRADE` (`data/trade.js`: 12 Einträge je Liste, Preis bis 9999, Stufe 0,1).
- Schiffe von Mitspielern handeln dort ohne Rückfrage, per Route oder von Hand am Anleger: Laden = kaufen, Entladen = verkaufen. Die Münzen gehen direkt vom Käufer zum Verkäufer (nur so viel, wie der Käufer hat).
  Jeder Handel steht im Chat beider Spieler und im Münzbuch als „Verkauf an <Name>“ bzw. „Kauf von <Name>“ (Posten `pv:<pid>`/`pk:<pid>`).

### Wettstreit um den Leuchtturm (`sim/wonder.js`, `data/wonder.js`)

**Seit Version 15 ruht der Wettstreit:** Der Weltenleuchtturm kommt nur noch über die Story, und Getrennte Inseln laufen vorerst ohne Story. Der Code bleibt für später.

- Jeder baut seinen eigenen Weltenleuchtturm. Oben in der Leiste zeigt „Leuchttürme“ die Phase jedes Spielers in seiner Farbe (sobald jemand angefangen oder ihn erforscht hat; Tooltip mit Namen).
- Jede vollendete Phase steht bei allen im Chat. Wer als Erster Phase 4 vollendet: „<Name> hat den ersten Weltenleuchtturm entzündet!“, Abzeichen „Erster Leuchtturm“ und +2000 Ruhm (`WONDER.firstFame`).

### Lobby und Spielstände

- Die Lobby zeigt Modus und Platzzahl („2 von 3 Spielern“); Spielstände in der Liste „Getrennte Inseln · 2/3 Spieler“. Ein fortgesetzter Stand behält seinen Modus und seine Plätze.
- Mitspieler bekommen ihren alten Platz beim Fortsetzen über ihre Spieler-ID (localStorage `tideworks.profile`).

### Verbindung: eigener TURN/STUN-Server (`net/peer.js`)

- **Koop → Verbindung**: URL (`turn:…` oder `stun:…`), Benutzer, Passwort. Gespeichert in localStorage `tideworks.turn`, nur auf diesem Gerät; der eigene Server steht vor den öffentlichen.
  Scheitert eine Verbindung, weist die Meldung auf diese Einstellung hin.
- `tideworks.net()` zeigt je Verbindung, ob sie **direkt** oder über **TURN** läuft (`via`), und ob ein eigener Server eingetragen ist (`turn`).

### Testen

- `npm run check:coop`: Getrennte Inseln ohne Browser (Plätze, Besitz, Forschung, Erlaubnis, Preislisten, Datenschutz, Welt voll, Leuchtturm, Speichern) und die Datenrate bei 200 Bändern je Spieler.
- Zwei Fenster wie oben unter „Koop → Testen“; im Host-Dialog *Getrennte Inseln* wählen.

## Freischaltungen (Version 15)

Jedes Gebäude, jede Schiffsart und jedes Rezept hat **genau eine** Freischalt-Quelle. Die Tabelle steht an einer Stelle: `src/data/unlocks.js` (Volk, Story, Pläne) plus `tech` an Gebäude, Schiffsart oder Rezept (Forschung). Ohne beides = Start.

| Quelle | Gebäude, Schiffe, Rezepte |
|---|---|
| Start | Fließband, Lagerkiste, Sägewerk, Fischerhütte, Bohrer Mk1, Hütte (Hauptkontor ist fest) |
| Frühe Forschung (Stufe 2, billig) | Ofenbau: Schmelzofen · Bandtechnik: Splitter, Kreuzung, Extraktor · Schiffbau: Werft (damit Frachtschiff), Handelskontor |
| Forschung wie bisher | alles mit `tech` in `data/buildings.js`, Entdecker (Kartografie), Rezepte Fass und Supermagnet |
| Ole | Kontor gründen (`gruenden`, Knopf am Schiff) |
| Brann direkt | Überlauf-Tor, Brückenband (Ruf neutral), Sortierer, Tor (Ruf freundlich) |
| Brann als Plan vor der Forschung | Schnellbänder, Dampfkraft (Rohr Mk1, Wasserpumpe, Tank, Dampfkraftwerk), Druckleitungen |
| Aurel als Plan vor der Forschung | Bessere Akkus, Kesseltechnik, Geothermie, Ingenieurwesen (nichts davon ist für den Leuchtturm nötig) |
| Story | Weltenleuchtturm (Akt 2) |

- **Prüfen:** `isUnlocked(g, key, pid)` in `sim/state.js` für alles (Baumenü, `checkPlace`, Aufwerten, Blaupausen, Kreuzung/Brückenband beim Ziehen, Werft, Rezeptwahl, Kontor gründen). Forschung zählt je Spieler (`pst`), Volk und Story aus `state.unl` (Welt).
  Schlüssel: Gebäudetyp, `ship:<Art>`, `rc:<Rezept>`, `gruenden`, `plan:<id>`.
- **Texte:** `lockHint(key)` kurz für Baumenü und Skilltree („Forschung: Ofenbau“, „Bei Brann erhältlich“, „Story“), `lockReason(key)` als Satz für Meldungen („Noch nicht erforscht (Ofenbau).“, „Bei Brann erhältlich (Ruf: freundlich).“, „Folgt in der Geschichte (Akt 2).“).
- **Freischalten (Schnittstelle für spätere Schritte):** `unlock(g, key, src)` in `sim/unlocks.js`, nur in der Simulation. `src` = `npc` (Ruf, Thread 4) oder `story` (Thread 3). Setzt `state.unl[key]`, schickt das Ereignis `unlocked` an alle (Toast „… freigeschaltet!“ bzw. „Plan: … erhalten!“) und liefert `true`, wenn es neu war.
- **Pläne:** `plan: '<id>'` an einer Forschung (`data/tech.js`) ist eine zusätzliche Voraussetzung (`reqMet` in `sim/research.js`). Der Plan ist ein Flag `plan:<id>` in `unl`, keine Ware. Der Skilltree zeigt „Plan von Brann nötig – Bei Brann erhältlich (Ruf: …)“.
- **Rufstufen** sind Platzhalter (`REP_LVLS`: neutral, freundlich, vertraut), bis der Ruf kommt. Neue Völker in `NPCS`.
- **Skilltree:** An der Wurzel stehen links und rechts die Start-Gebäude, nach einer Lücke die Gebäude von Völkern und Story (grau, bis sie frei sind; Tooltip nennt Volk und Rufstufe).
- **Koop:** `unl` gehört zur Welt, steht im Spielstand und im Snapshot (lokal und `TOP` in `sim/views.js`). `unlock`, `relock`, `devUnlock` sind Host-Kommandos.
  *Getrennte Inseln* laufen vorerst ohne Story: Volk-Quellen gelten dort als frei, Pläne sind keine Voraussetzung, die frühen Forschungen (`early`) sind von Anfang an erforscht, der Weltenleuchtturm (Story) ist nicht baubar.
- **Neue Freischaltung eintragen:** Gebäude mit Forschung → `tech` am Gebäude. Volk oder Story → Eintrag in `UNLOCKS` (ohne `tech`). Plan vor einer Forschung → Eintrag in `PLANS` und `plan` an der Forschung. `npm run check:tree` meldet doppelte Quellen, unbekannte Schlüssel und Pläne ohne Forschung.

## Geschichte und NPC-Inseln (Version 16)

Grundlage: `docs/STORY.md`, `docs/PLAN.md` (Thread 3). Akt 1 ist spielbar: Prolog → drei Völker entdecken (in beliebiger Reihenfolge) → zurück zu Brann → Bauplan Weltenleuchtturm → Akt 2.
Cutscenes und Dialoge laufen seit 0.10.0 im Cutscene-Player und im Dialogfenster (siehe „Cutscenes und Dialoge (0.10.0)“); Szenen ohne Modul zeigen weiter kurz ihren Titel. Testanleitung: `docs/TEST-AKT1.md`.

### Zustand (`state.story`, `data/story.js`)

- `{ act, flags, seen, once, choice }` gehört zur Welt, steht im Spielstand und im Snapshot (lokal und `TOP` in `sim/views.js`, Mitspieler über `net/remote.js`).
  `act` 1–5, 6 = nach der Entscheidung; `flags` Story-Flags (`npc_ole`, `karte_gefunden` …); `seen` gesehene Szenen/Dialoge (setzt die Oberfläche des Hosts mit `storySeen`); `once` ausgelöste Schritte; `choice` `'a'` | `'b'` | `null`.
- Ohne Geschichte (`state.story = null`): Getrennte Inseln, Demo im Titelbildschirm (`newGame(…, { noStory: true })`).

### Auslöser (`TRIGGERS` in `data/story.js`, Auswertung `storyEvent` in `sim/story.js`)

- Ein Schritt: `{ id, on, act | minAct, flags, wonder, set, unlock, toAct, pre, cs, dialog, choice }`. Er läuft genau einmal, wenn `on` eintritt und die Bedingungen stimmen.
- Auslöser und wer sie meldet: `start` (`newGame`), `discover:<npc>` (Insel aufgedeckt, `sim/explore.js`), `talk:<npc>` (Kommando `talk`, ein Schiff liegt am Steg), `wonder:<n>` (Leuchtturm-Stufe fertig, `sim/wonder.js`),
  `trade:<npc>` (Thread 4: `storyEvent(g, 'trade', npc)` beim Handel), `dive` und `find:<fund>` (Tauchen, später).
- **Neuen Schritt eintragen:** Zeile in `TRIGGERS`, Szene in `CUTSCENES` (Modul in `src/cutscenes/`), Dialog in `src/data/dialogs/`; braucht er einen neuen Auslöser, an der Stelle in der Simulation `storyEvent(g, kind, arg)` aufrufen. Ziel-Satz des Akts in `actGoal`.
- Nach einem Akt-Wechsel werden schon fertige Leuchtturm-Stufen nachgeholt (`wonder:<n>` erneut geprüft).
- An die Oberfläche geht `{ type: 'story', id, pre, cs, dialog, act, choice, unlock, ending, to: '*' }`. `ui/story.js` spielt pre → cs → dialog nacheinander ab (Dialogfenster `ui/dialog.js`, Player `cutscene/player.js`), meldet sie als gesehen und fragt bei `choice` die Entscheidung ab (nur Host).
- Weitere Ereignisse: `talk` (Gespräch ohne Schritt, eine Zeile je NPC), `npcArrive` (Schiff liegt an einem NPC-Steg; `step` = ein Gespräch bringt die Geschichte weiter), `discovered` mit `npc` und Inselnamen.

### NPC-Inseln (`data/npcs.js`, `world/npcs.js`, `world/worldgen.js`, `sim/villages.js`)

- Ole (Pfahldorf, graue Klippen, Ring 1, 240–420 Felder), Brann (Werkstattbucht mit Kränen, Ring 2, 520–780), Aurel (Goldberg mit Terrassen und Bannern, knapp hinter der Grenze zu Ring 3, 930–1.090).
  Die Zelle wählt `pickNpcCells(seed)` aus dem Seed (Zellen im Band nach Hash geordnet, die erste freie, 2 Zellen Abstand untereinander); `state.npcs` speichert sie, `World(seed, homes, npcs)` erzeugt dort die Vorlage (`genIsland` mit `NP`, Umriss und Boden je `look`).
- Das Dorf baut `buildVillage` beim Spielstart: NPC-Steg (`npchafen`, 3×3 mit Steg) am Kontorplatz, dann die Gebäude aus `village` (`npc_*` in `data/buildings.js`), die nächsten Plätze zum Steg zuerst.
  Alle sind echte, feste Gebäude (`by` = `owner` = `npc:<id>`, `fixed`), stehen aber still. Auf NPC-Inseln kann niemand bauen (`ownWhy` in `sim/buildings.js`); Laden und Entladen am NPC-Steg ist Handel (Version 17).
- Grafik: `gfx/sprites/npc.js` (Stege je NPC, Dorfgebäude mit Varianten, Figuren am Steg), Boden in `gfx/ground.js` (`J.look`: Schiefer bei Ole, Gold mit grünen Terrassen bei Aurel). Rauch und Licht bei Nacht laufen immer.
- Gespräch: Steg anklicken → Info-Panel „Mit Ole sprechen“ (nur, wenn ein Schiff am Steg liegt) → Kommando `{ type: 'talk', id }` bzw. `{ type: 'talk', npc }`.
- Gesteuerte Schiffe fahren bei sehr weiten Zielen in Etappen (`seaPath(…, partial)`, `s.mg`), damit Aurel mit einem Klick erreichbar ist.

### Weltenleuchtturm mit Geschichte (`data/wonder.js`, `sim/wonder.js`)

- Bauplan von Brann am Ende von Akt 1 (`unlock(g, 'leuchtturm', 'story')`), nur auf der Heimatinsel. Stufe 1 und 2 ab Akt 2, Stufe 3 ab Akt 4 (nach der alten Karte), Stufe 4 ab Akt 5 (nach der Flutnacht), siehe `WONDER_ACT`.
- Kosten: Fundament 400 Holz, 300 Ziegel, 150 Eisen · Turm 500 Ziegel, 250 Eisen, 150 Glas · Laterne 300 Stahl, 300 Glas, 150 Werkzeug, 2.000 Münzen · Feuer 400 Stahl, 300 Kupfer, 50 Chips, 5.000 Münzen. Keine Wirkungen, kein Ruhm, kein Abschlussfenster.
- Stufe 4 fertig → Finale `cs_wahrheit` mit Entscheidung (A: Leuchtfeuer entzünden, B: nicht). Der Lichtstrahl leuchtet nur nach A (ohne Geschichte wie bisher).
- **Enden (0.23.0, `sim/ending.js`, Daten `ENDINGS` und `NPC_TRADE.rat` in `data/npctrade.js`):** Szene `cs_ende_a` bzw. `cs_ende_b`, danach Akt 6 und freies Spiel.
  A: Goldberg mit Brandruinen (Gebäudefeld `ruin: 'brand'`) und deinem Hauptkontor an Aurels Steg, Inselrat als neuer Handelspartner (eigener Steg, `npc: 'rat'`), Ole und Brann vertraut mit Rabatt und mehr Waren, einmal ein Dorffest (`story.fest`), Relikt „Die erste Flamme“.
  B: Pfahldorf und Werkstattbucht als Ruinen (`ruin: 'sturm'`, Stege nur Pfähle, kein Handel), Aurels Gebäude gehören dir (Villen → Bürgerhäuser), Aurel steht am Kontor, Relikt „Die Krone des Herrschers“.
  Neue Abfragen: `npcGone(g, id)` (handelt nicht mehr), `npcIslFree(g, k)` (frühere NPC-Insel bebaubar), `festOn(g)`. Szenenbausteine in `cutscene/enden.js`.

### Story-Zeile und Debug

- Ziel-Karte (`ui/hud.js`): Kopf „Akt n: Name“, darunter „Geschichte“ mit dem nächsten Ziel in einem Satz (`actGoal`), dann das Aufbau-Ziel.
- Konsole (nur Host): `tideworks.story()` Zustand · `tideworks.story(3)` Akt setzen (frühere Schritte gelten als erledigt, Schritte im Akt bleiben, spätere werden zurückgenommen) ·
  `tideworks.story('fire', 'wonder:2')` Auslöser · `tideworks.story('step', 'akt1_ende')` Schritt erzwingen · `tideworks.story('flag', 'npc_ole')` · `tideworks.story('reset')` · `tideworks.story('on')` (Geschichte in einer Welt ohne einschalten) ·
  `tideworks.cs('cs_prolog')`, `tideworks.cs('cs_prolog', 12.6)`, `tideworks.cs('cs_npc_ole')`, `tideworks.dialog('brann_1')` Szene, Einzelbild bzw. Dialog zeigen (siehe „Cutscenes und Dialoge (0.10.0)“).
- Prüfskript: `npm run check:story [Seed] [-v]` spielt Akt 1 mit echtem Segeln durch und prüft Debug, Speichern/Laden, Spiegel, Koop-Ansicht und Migration.

## Handel mit den Völkern (Version 17)

Grundlage: `docs/SYSTEMS.md` Abschnitt 4, `docs/PLAN.md` Thread 4. Gehandelt wird mit **Münzen** (das „Gold“ aus SYSTEMS.md) am Steg der NPC-Insel; ein Schiff muss dort liegen.
Testanleitung: `docs/TEST-HANDEL.md`. **Alle Zahlen stehen in `src/data/npctrade.js`** (mit Kommentaren je Feld).

### Wo was steht

| Datei | Inhalt |
| --- | --- |
| `data/npctrade.js` | Rufstufen (`REP_LEVELS`: ab Ruf, Preisfaktoren, Zahl der Aufträge), Ruf je Münze (`REP.sale`), Preisdruck (`NPC_MARKET`), Grundpreise der Völker-Waren (`NPC_GOODS`), Planpreise (`PLAN_PRICE`), Aufträge (`ORDERS`), Lieferverträge (`CONTRACTS`), Seekarte (`SEA_CHART`) und je Volk `NPC_TRADE` (Startruf, Ankauf, Angebot mit Platzhaltern, Auftrags-Vorlagen, Verträge, Dorfstufen, Geschenke, Preise ab Akt) |
| `data/unlocks.js` | Was eine Rufstufe freischaltet (`UNLOCKS`, `PLANS` mit `npc` und `lvl`) |
| `sim/npc.js` | Zustand `state.npc`, Preise, Handel (`npcBuyTo`, `npcSellFrom`), Kommandos, Tagesablauf (`npcTick`) |
| `sim/ships.js` | Laden/Entladen am NPC-Steg von Hand und über Routen (`manualLoad`, `manualUnload`, `doLoad`, `unloadTo`), NPC-Steg als Routen-Stopp |
| `sim/villages.js` | `placeVillage`: Dorfgebäude um den Steg setzen (Start und Wachstum) |
| `ui/npcs.js` | Fenster „Völker“ (Taste N, Knopf in der Hotbar), Knöpfe `data-nv` |
| `ui/ships.js` `npcPortHTML`, `ui/insights.js` `infoNpc` | Schiffs-Panel am Steg (Laderäume, Kaufen, Gespräch) und Info-Panel des Stegs |

### Ablauf

- **Kontakt:** Erst wenn die Insel entdeckt ist (`story.flags.npc_<id>`), handelt das Volk. Beim ersten Sekundentakt danach gilt die Stufe des Startrufs (Freischaltungen still, Meldung `npcLevel` mit `first`), und es kommen die ersten Aufträge.
- **Ruf 0–100**, vier Stufen: misstrauisch (ab 0), neutral (25), freundlich (50), vertraut (80). Start: Ole 10, Brann 30, Aurel 60. Steigt mit Verkäufen (1 Punkt je 40 Münzen Umsatz), erledigten Aufträgen und erfüllten Verträgen; sinkt bei verpassten Verträgen. Eine einmal erreichte Stufe nimmt nichts zurück (`lv` = höchste Stufe), Preise und Angebot folgen aber dem aktuellen Ruf.
- **Kaufen** = Laden am Steg (Schiffs-Panel „Kaufen“ oder Fenster „Völker“, +10/+40/Alles, oder ein Routen-Stopp mit Lade-Auftrag). **Verkaufen und Liefern** = Entladen. Reihenfolge beim Entladen: offene Aufträge → (nur über Routen) Lieferverträge → Verkauf, wenn das Volk die Ware ankauft; sonst bleibt sie an Bord.
- **Preise:** Grundpreis (`PRICES` bzw. `NPC_GOODS`) × Faktor der Ware × Faktor der Rufstufe × Faktor des Akts (Aurel ab Akt 5 teurer). Jede 10 verkauften Stück drücken den Ankaufpreis um 2,5 % (höchstens 60 %), jede 10 gekauften heben den Verkaufspreis; beides erholt sich um 3 % je Minute. Vorräte füllen sich je Minute nach.
- **Aufträge:** 1–3 je Volk (nach Stufe), neue jeden Morgen und beim Aufstieg in eine höhere Stufe. Laufzeit bis zum Abend (`days` 0 = heute, 1 = morgen; Tag 10 min, Nacht 5 min). Belohnung Münzen + Ruf. Läuft ein Auftrag ab, zahlt das Volk 80 % des Grundpreises für das schon Gelieferte. Liefern: Entladen, Routen oder Knopf „Liefern“ im Fenster.
- **Lieferverträge** (`deals`): feste Menge je Tag zum festen, guten Preis, höchstens 2 je Volk, Abschluss nur mit Schiff am Steg. Es zählen nur Lieferungen über eine **Route**, die am Steg entlädt (keine Erlaubnis nötig). Abrechnung jeden Morgen: erfüllt → Bonus + Ruf, sonst −3 Ruf, nach 2 verpassten Tagen in Folge kündigt das Volk. Der erste, angebrochene Tag zählt nicht als verpasst.
- **Dörfer wachsen** mit dem Wert aller Lieferungen (Münzen zum Grundpreis): je Volk vier Stufen mit weiteren Häusern und Laternen (`npc_laterne`, leuchtet nachts). Neue Gebäude setzt `placeVillage` in der Nähe des Stegs.
- **Pläne** (Brann, Aurel) und die **Seekarte** (Ole, deckt die nächste unentdeckte Insel auf) kauft man im Fenster „Völker“, mit Schiff am Steg. Gebäude-Freischaltungen (Kontor gründen, Räucherei, Überlauf-Tor, Brückenband, Sortierer, Tor, Kogge) kommen automatisch mit der Stufe.
- **Geschenke:** Aurel schickt ab „freundlich“ an manchen Morgen Münzen oder Waren (ins Hauptkontor der Heimatinsel).
- **Platzhalter** im Angebot (Relikte, Teile der Taucherglocke, Luxuswaren) stehen mit Stufe im Fenster, sind aber nicht kaufbar (`{ soon: Name, lvl }`).
- **Neue Waren** (`npc: true` in `data/items.js`): nur bei den Völkern kaufbar, kein Rezept erzeugt sie: Seil, Fischernetz (Ole), Zahnrad, Feder, Rohrstück (Brann), Uhrwerk, Batteriezelle (Aurel), dazu Perle (Aurel kauft sie, für spätere Funde). Räucherfisch macht die neue **Räucherei** (Ole, freundlich) aus 2 Fisch + 1 Holz; Brann und der Hafenhändler kaufen ihn. Die **Kogge** (Brann, freundlich) hat 5 Laderäume zu 40, kostet unter anderem Seil und Zahnräder.
- **Münzbuch:** Posten `pv:npc:<id>` (Verkauf an …), `pk:npc:<id>` (Kauf von …), `na:npc:<id>` (Aufträge und Verträge), `ng:npc:<id>` (Geschenke).
- **Story:** Jeder Handel meldet `storyEvent(g, 'trade', npc)` (Auslöser `trade:<npc>` in `data/story.js`).

### Koop und Speichern

- `state.npc` gehört zur Welt (Ruf je Welt), steht im Spielstand, im lokalen Snapshot und in `TOP` der Mitspieler-Ansicht (`sim/views.js`, `net/remote.js`), höchstens einmal je Sekunde (`SLOW`).
- Alle Handelsaktionen sind normale Kommandos und laufen über den Host (`shipLoad`, `shipUnload`, `npcBuy`, `npcDeliver`, `npcDeal`); `npcRep` (Debug) nur vom Host. Meldungen zu Aufträgen, Verträgen, Stufen, Geschenken und Dorfwachstum gehen an alle, die Meldung zu einem Kauf/Verkauf nur an den Handelnden.
- Getrennte Inseln haben (vorerst) keine Völker (`state.npc = null`).

### Neues eintragen

- **Ware ins Angebot:** Eintrag in `sells` des Volks (`{ it, f, n, refill, lvl }`); eine ganz neue Ware zuerst in `data/items.js` (mit `npc: true`), Symbol in `gfx/sprites/items.js`, Farbe in `ITEM_COL` (`gfx/sprites/sea.js`), Grundpreis in `NPC_GOODS`.
- **Platzhalter kaufbar machen:** `{ soon: … }` durch `{ it, … }` ersetzen.
- **Auftrag/Vertrag:** Zeile in `orders` bzw. `deals` (Vertrags-`id` eindeutig, sie steht im Spielstand).
- **Freischaltung an eine Stufe hängen:** `data/unlocks.js` (`UNLOCKS` oder `PLANS` mit `npc` und `lvl`), Planpreis in `PLAN_PRICE`.

### Debug (Konsole, nur Host)

`tideworks.rep('ole', 55)` Ruf setzen (Stufen und Freischaltungen wie im Spiel) · `tideworks.npc('ole')` Zustand ansehen · `tideworks.dock('ole')` erstes Schiff an Oles Steg setzen, Umgebung aufdecken, Kamera hinfahren ·
`tideworks.time(23)` Uhrzeit setzen (nur vorwärts; 6–21 Tag, danach Nacht) · `tideworks.cargo(id, 'holz', 120)` Ladung (`id` null = erstes Schiff) · `tideworks.coins(5000)`.

## Cutscenes und Dialoge (0.10.0)

Grundlage: `docs/STORY.md` („Stil der Cutscenes“), `docs/SYSTEMS.md` (5, 10), `docs/PLAN.md` (Thread 5), Referenz `docs/cutscenes/rauch-hinter-dem-nebel.html`.
Spielstand-Version bleibt 17: „gesehen“ steht schon seit Version 16 in `state.story.seen`.

### Wo was steht

| Datei | Inhalt |
| --- | --- |
| `cutscene/kit.js` | Zeichenhilfen: Raster `W`×`H` = 320×180, `BAR` 16, `hash`/`vnoise`/`fbm`, Bayer `bay`, Pixelpuffer `PB` (rundet ab wie die Referenz), `shadeE`, `layer`, `tpl`, `vignette`, `disc`, `glow`, `drawTiled`, `rain`, `bars`, `black`, Paletten (`mix`, `ramp`, `pick`), Rückblende `sepia(ctx, amt)`, Porträt-Bausteine (`eyePair`, `brow`, `mouth`, `blush`, `torso`, `portraitSet`, `blinkAt`, `talkAt`) |
| `cutscene/stage.js` | Bühne `#cine` (in `index.html`). Seit 0.16.0: Szenen zeichnen in ein 320×180-Bild (`stageScene`), das sichtbare Canvas hat das Seitenverhältnis des Fensters und füllt es (Faktor krumm, Nearest Neighbour); das 16:9-Bild wird beschnitten statt umrandet (höchstens bis 270 px Breite), Kinobalken immer 16/180 der Bildhöhe (`stageBars`), Dialogkasten am sichtbaren Bildrand (`boxRect`). Schleier (`stageVeil`, `ui.cine = 'veil'`): Karte läuft dahinter weiter, für Ein- und Ausblenden; `stageClose(fn, true)` blendet aus dem Schwarz zurück ins Spiel. Arten `film` und `over` (Dialog über der Karte, 320×180, höchstens 3×). Fängt Klick, Leertaste, Enter, Esc ab; `ui.cine` sperrt die Spieltasten. |
| `cutscene/player.js` | Cutscene-Player: Spielbild nach Schwarz (0,8 s, Balken fahren ein), Szene blendet auf (0,7 s), Einstellung zu `t` zeichnen, Überspringen blendet ab (0,6 s), danach Dialog mit dem Hintergrund der Szene oder zurück ins Spiel; `cold: true` (Prolog) beginnt im Schwarz; `prefers-reduced-motion` geht ohne Blenden direkt in den Dialog; `seekScene(id, t)` zum Prüfen |
| `cutscenes/*.js`, `cutscenes/index.js` | eine Szene je Datei; bisher `cs_prolog` „Gestrandet“ (seit 0.11.0) `cs_npc_ole` „Rauch hinter dem Nebel“ und `cs_npc_brann` „Funken in der Werkstatt“ (seit 0.12.0) … bis `cs_ende_a` „Das Feuer antwortet“ und `cs_ende_b` „Die Lichter gehen aus“ (0.23.0, Bausteine in `cutscene/enden.js`) |
| `cutscene/motifs.js` | Leitmotive für mehrere Szenen (seit 0.11.0): Blitz `lightningFlash(lt)` + `drawLightning(ctx, lt, BOLT)`, Wappen `wappen('fahne' \| 'verwittert' \| 'praegung')`, Siegel `siegel('wachs' \| 'verblasst')` |
| `ui/dialog.js` | Dialogfenster: Porträt links, Namensschild (Pixelify Sans), Pergament-Kasten (Nunito), Schreibmaschine 42 Zeichen/s mit Pausen an Satzzeichen, Blinzeln, Mund, Pfeil „weiter“ |
| `gfx/portraits.js` | Porträts 64×80 (Ole aus der Referenz); Figuren ohne Porträt bekommen einen Schattenriss in ihrer Farbe |
| `data/dialogs/` | Dialoge als Daten: `{ speaker, portrait, lines, when, once, idle }`, Zeilen auch `{ who, text }` für mehrere Sprecher; Namen in `SPEAKERS`; `idleDialogFor(npc, story)` wählt den Gesprächsdialog (Simulation) |
| `ui/story.js` | Story-Ereignisse in einer Warteschlange abspielen (wartet, solange Titel, Pausenmenü, Fenster oder eine andere Szene offen ist), Koop-Steuerung, „gesehen“ an die Simulation, Menü-Wiederholung |

### Ablauf

- Ereignis `story` → Dialog `pre` (über der Karte) → Cutscene `cs` im Vollbild → Dialog `dialog` vor dem Bild der Szene → `storySeen` (nur Host bzw. Einzelspieler) → Toasts (Bauplan, neuer Akt) → bei `choice` die Entscheidung.
- Während Szene und Dialog hält der Host (bzw. der Einzelspieler) die Simulation an (`setSpeed(…, true)` wie das Pausenmenü), danach gilt wieder seine eigene Pause. Dialoge ohne Szene (Gespräch am Steg) laufen über der weiterlaufenden Karte.
- Szenen ohne Modul (Brann, Aurel, Bauplan …) zeigen ihren Titel als Meldung, der Dialog kommt trotzdem im Dialogfenster.
- Die Karte wird während einer Vollbild-Szene nicht gezeichnet (Hauptschleife in `main.js`), Snapshots kommen weiter an.

### Prolog (0.11.0)

- `cs_prolog` „Gestrandet“ (32 s, kein Dialog) läuft bei **Neues Spiel** vor dem ersten Bild der Karte: Die Bühne öffnet sich im selben Schritt, in dem der Titel verschwindet. Danach Abblende, Titel „Tideworks“, das Spiel beginnt; der Willkommens-Hinweis kommt erst nach der Szene (`afterStory` in `ui/story.js`). Esc überspringt direkt ins Spiel.
- Ansehen: Pausenmenü → „Szenen“ → „Gestrandet“, oder in der Konsole `tideworks.cs('cs_prolog')` bzw. `tideworks.cs('cs_prolog', t)` für ein Einzelbild.
- `cs_npc_brann` „Funken in der Werkstatt“ (28,6 s, danach Dialog `brann_1`) läuft, wenn ein Schiff Branns Insel erreicht (Story-Schritt `npc_brann`). Ansehen: Pausenmenü → „Szenen“ → „Funken in der Werkstatt“, `tideworks.cs('cs_npc_brann'[, t])`, oder im Spiel `tideworks.story('fire', 'discover:brann')`. Brann hat jetzt ein Porträt mit Gesicht (auch in allen Brann-Dialogen).

### Koop

- Szenen laufen bei allen gleichzeitig (Ereignis an alle). Nur der Host sieht „Überspringen“, Mitspieler den Hinweis „Nur der Host kann überspringen“. Überspringt der Host, schickt die Sitzung `{ t: 'cs', op: 'skip', id }` an alle (`csShare` in `net/session.js`), alle springen in den Dialog (auch wer die Szene erst gleich startet, 30 s lang).
- Den Dialog liest jeder in seinem Tempo. Die Simulation läuft weiter, sobald der Host fertig ist.
- „Gesehen“ setzt nur der Host. Wiederholen im Menü ist immer nur lokal und hält nichts an. Wer während einer Szene beitritt, sieht sie nicht (nur später unter „Szenen“).
- `data/story.js` und `data/dialogs/` zählen jetzt zum Prüfwert der Versionsprüfung (`net/version.js`): andere Texte = andere Version.

### Menü „Szenen“

Pausenmenü (Esc) → „Szenen“: alle Cutscenes in Reihenfolge, gesehene mit Titel und „Ansehen“ (Szene und Dialog danach), noch nicht gebaute „folgt bald“, ungesehene als „???“. Nur in Welten mit Geschichte.

### Neue Cutscene, neuer Dialog

Kurzanleitung in `NOTES.md` („So baut man eine neue Cutscene“). Dialogtext: Eintrag in der Datei der Figur in `src/data/dialogs/`, Id im Story-Schritt (`TRIGGERS`) oder als Gesprächsdialog mit `idle`.

### Debug (Konsole)

`tideworks.cs('cs_npc_ole')` Szene abspielen · `tideworks.cs('cs_npc_ole', 12.5)` Bild bei 12,5 s zeigen (ab der Szenenlänge: Dialogzeile `t − Länge`; Klick schließt) · `tideworks.dialog('ole_1')` Dialog abspielen · `tideworks.dialog('ole_1', 3)` Zeile 3 zeigen · `tideworks.csTimes()` Vorbereitungszeit je Szene (ms).
Die Anzeigen wirken nur lokal (kein „gesehen“, keine Pause). Story-Schritte selbst (mit Wirkung) weiter über `tideworks.story('step', 'npc_ole')`, nur Host.

## Nach dem Story-Test (0.15.0)

Testanleitung: `docs/TEST-0.15.md`. Prüfungen ohne Browser: `npm run check:extract` (neu), dazu wie bisher `check:story`, `check:npc`, `check:world`, `check:coop`, `check:tree`.

### Extraktor (`sim/logistics.js`, Abschnitt Extraktor)

- **Ein schlichter Block ohne Richtung** (keine Antenne, keine Pfeile, R dreht nichts). Mitte = Filterfenster.
- **Eingang automatisch:** nimmt aus *jedem* angrenzenden Gebäude mit Waren – Speicher (Hauptkontor, Lagerkiste, Handelskontor) aus dem Bestand, alle anderen aus ihrer **Ausgabe** (`b.out`: Sägewerk, Fischer, Bohrer, Rezept-Gebäude, Drohnen-Kiste im Modus Anfordern). Nie aus Zutaten-Puffern.
- **Ausgabe in alle Richtungen:** auf angrenzende Bänder und Tore, die **vom Extraktor wegführen** (geradeaus), auf andere Logistik-Teile daneben (Splitter, Kreuzung, Brückenband, Sortierer von hinten) und **in angrenzende Gebäude, die die Ware annehmen** (Rezept-Zutat, Speicher, Verbrennung …). Nie zurück in das Gebäude, aus dem die Ware kam.
- **Speicher → Speicher** nur aus Lagerkiste/Handelskontor ins Hauptkontor (sonst pendelten Waren zwischen zwei Speichern hin und her).
- **Reihum:** Quellen und Waren reihum (`b._ri`), Ziele reihum (`b._ro`). **Filter** (`b.ex`) im Info-Panel unter „Filter wählen“; ohne Filter alles.
- **Tempo:** so schnell wie das schnellste wegführende Band, sonst `EXTRACT.building` Items/s.
- **Ab 0.17.0:** auch parallel/seitlich vorbeilaufende Bänder sind Ausgang (nur Bänder, die *in* den Extraktor zeigen, nicht), außer der Bandstrang mündet in die Quelle selbst (`beltEnd`, `loopsBack`). Dazu **Ausgleich** zwischen zwei Gebäuden mit derselben Ware (Puffer ↔ Puffer, z. B. zwei Öfen, oder Kiste ↔ Kiste) – siehe Abschnitt „Extraktor: parallele Bänder und Ausgleich (0.17.0)“.
- Nachbarn sind je `topoVer` gecacht (`extractNear`), das Info-Panel zeigt „Holt aus“ und „Gibt ab an“ (`extractInfo`).
- **Alte Spielstände:** siehe „Spielstand“ v17 → v18 (`fd`). Die Demo-Fabrik im Titel führt das Kohleband jetzt gerade weg.

### Entdecker

Fährt gerade nach außen statt sich an der Heimatinsel entlangzutasten und sieht weiter (Werte in `data/ships.js`, siehe „Entdecker“ im Abschnitt Version 12).

### Story-Inseln mit Namen

Pfahldorf (Ole), Werkstattbucht (Brann), Goldberg (Aurel) tragen ihren Namen und ein eigenes Symbol (`SPR.npc.mark`: Pfahlhaus, Zahnrad, Krone; `gfx/sprites/npc.js`):
auf der Minimap, in der Kartenansicht (immer, unabhängig vom Zoom), in der Inselliste oben („Entdeckt, ohne Kontor“, mit Bewohner) und im Feld-Info („Bewohnt von“). `foundName(k)` in `ui/common.js`.

### Meldungen

- **„… liegt an …s Steg“** nur beim ersten Anlegen je NPC (`story.once.steg_<npc>`); bringt das Gespräch die Geschichte weiter, kommt der goldene Hinweis wie bisher.
- **Entdeckt und kartiert** werden je Insel zu einer Meldung zusammengefasst (`islandNews` in `main.js`: 2,5 s Ruhe, eine entdeckte Insel wartet bis 8 s aufs Kartieren). Mehrere auf einmal: Sammelmeldung „3 neue Inseln kartiert“ mit Inseltypen und Vorkommen.
- **Gleiche Meldung**, die noch zu sehen ist, erscheint nicht doppelt, sondern bekommt einen Zähler „×2“ (`ui/toasts.js`).
- **Vorrang:** Story-Meldungen, Ziele und Aufträge (`toast(html, cls, true)`) stehen länger (`TOAST.prioMs`) und werden zuletzt verdrängt.
- **Zusammengefasst je Snapshot:** mehrere Freischaltungen, neue Aufträge mehrerer Völker, abgelaufene Aufträge, erfüllte Lieferverträge. Hafenhändler ohne Handel melden nichts mehr.

### Kamera folgt dem Schiff (`gfx/camera.js`, `FOLLOW`)

Klick auf ein Schiff (Karte, Kartenansicht oder „Zeigen“ in der Flotte): die Kamera folgt ihm weich, unten erscheint „Kamera folgt …“ (Klick darauf oder Esc beendet).
Das Folgen endet beim Ziehen der Karte, bei WASD/Pfeiltasten, bei Minimap-Klick oder Sprung zu einer Insel, beim Zoomen auf eine andere Stelle (weiter als `FOLLOW.near` Punkte von der Bildmitte; nah an der Mitte wird um das Schiff gezoomt) und mit Esc. Nur in der Oberfläche, Koop unberührt.

## Extraktor: parallele Bänder und Ausgleich (0.17.0)

Testanleitung: `docs/TEST-0.17.md`. Ohne Browser: `npm run check:extract`. Code: `sim/logistics.js`, Abschnitt Extraktor.

- **Ausgänge:** alle angrenzenden Bänder und Tore, die nicht in den Extraktor hineinzeigen – wegführend oder seitlich vorbeilaufend. Ausnahme: Ein Bandstrang, der (Bänder und Tore geradeaus verfolgt, `beltEnd`) in die Quelle selbst mündet oder ins Hauptkontor derselben Insel, wenn die Quelle das Hauptkontor ist, bekommt aus dieser Quelle nichts (`loopsBack`). Andere Quellen dürfen darauf ausgeben (Kiste → Band → Hauptkontor).
- **Ausgleich (wie der Unloader in Mindustry):** Liegen zwei Gebäude am Extraktor, die dieselbe Ware lagern bzw. als Zutat annehmen, schiebt er aus dem volleren ins leerere. Gemessen am Füllstand relativ zur Kapazität (`balStock`): Rezept-Gebäude = Zutaten-Puffer des aktiven Rezepts (`inCap`), Bohrer = Schmiermittel, Dampfkraftwerk = Brennstoff-Puffer, Lagerkiste/Handelskontor = Bestand je Ware (`storeCap`). Das Hauptkontor gleicht nicht aus.
  - **Nur gleiche Art:** Puffer ↔ Puffer oder Speicher ↔ Speicher. Ofen → Kiste wäre Pendeln gewesen (die Kiste gibt ja wieder an den Ofen ab).
  - **Kein Pendeln:** verschoben wird nur, wenn die Quelle danach noch mindestens so voll ist wie das Ziel (`balWorth`: (n−1)/cap ≥ (m+1)/cap'); bei gleicher Kapazität heißt das: mindestens 2 Items Unterschied. 8/0 → 4/4, 5/4 bleibt.
- **Reihum:** Ausgabe-Kandidaten (Quelle, Ware) und Ausgleichs-Kandidaten (Quelle, Ware im Lager) stehen in einer Liste, die reihum abgearbeitet wird (`b._ri`), Ziele ebenfalls reihum (`b._ro`). Der **Filter** (`b.ex`) gilt für beides.
- **Bandkurve:** Ein Band, das neben einem Extraktor beginnt und quer läuft, wird jetzt als Kurve aus dem Extraktor gezeichnet (`feeds`).
- Kein neues Feld im Spielstand, Version bleibt 18; Koop unverändert (läuft im Host).

## Taucherglocke und Tauchspots (0.19.0)

- **Teile:** Ab Akt 3 verkauft Ole das *Glockenseil*, Brann die *Messingglocke mit Bullauge* (je eins, `data/npctrade.js`, Felder `act` und `part`). Beim ersten Kauf bei Ole: „Lass die Toten schlafen.“
- **Montage:** Werft anklicken → Abschnitt „Taucherglocke“. Beide Teile müssen im Lager der Werft-Insel liegen, das Schiff am Anleger der Werft („Herholen“). Nur einmal je Welt. Im Baumenü (Schifffahrt) steht ein Feld „Taucherglocke“, das die Werft auswählt.
- **Tauchspot:** immer genau einer im aufgedeckten Meer, erkennbar an Blasen; Symbol auf Minikarte und Karte. Nach einem Tauchgang 2–3 Minuten Pause.
- **Tauchgang:** Schiff mit Glocke anklicken → „Zum Tauchspot“ → „Tauchgang starten“. Minispiel siehe unten, Beute (Schrott, Erze, Kohle, Kalk, Perlen) in den Laderaum, Rest ins Lager der Heimatinsel.
- **Dateien:** Zahlen `data/dive.js` (`BELL`, `DIVE`, `SPOT_KINDS`, `DIVE_LOOT`), Logik `sim/dive.js`, Oberfläche `ui/dive.js`, Zeichnen `drawBubbles`/`drawBellRig` in `gfx/renderer.js`.
- **Minispiel einhängen:** `setDiveGame(fn)` in `ui/dive.js`; `fn(spot, { ship, name })` liefert ein Promise `{ ok, found }`. Mehr ist nicht nötig, die Beute würfelt der Host.
- **Debug:** `tideworks.dive()`, `dive('parts')`, `dive('mount')`, `dive('spot')`, `dive('over')`, `dive('story', 'karte')`, `dive('reset')`. Test: `npm run check:dive`, `docs/TEST-TAUCHEN.md`.

## Tauch-Minispiel und Szene „Abstieg“ (0.20.0)

- **Ablauf:** Beim allerersten Tauchgang läuft vorher die Szene `cs_abstieg`. Dann Seitenansicht unter Wasser: Klick = hinschwimmen, WASD/Pfeile, Leertaste/E bzw. Maus halten = graben/schweißen, Esc zweimal = auftauchen.
- **Aufgaben:** *Suchen* (5–8 Haufen, das Ziel glitzert und blubbert) oder *Aufschweißen* (Kiste/Wracktür, Naht nachfahren). Luft 35 s.
- **Karte der alten Welt:** ab 3 erfolgreichen Tauchgängen in Akt 3 bringt der nächste Spot die „Alte Karte“.
- **Dateien:** Zahlen `data/dive.js` (`DIVE_GAME`, `DIVE_TARGETS`, `DIVE_STORY_TARGETS`, `DIVE_WELD`, `DIVE_JUNK`), Steuerung `ui/divegame.js`, Bild `divegame/art.js` und `divegame/world.js`, Szene `cutscenes/cs_abstieg.js`.
- **Neue Aufgabe:** Typ in `DIVE_GAME.tasks` eintragen, in `taskFor` (`ui/divegame.js`) auswählen und ein `update…`/`draw…`-Paar daneben schreiben.
- **Debug:** `tideworks.diveGame({ task: 'weld' })`, `diveTask('search')`, `dive('count', 3)`, `dive('intro')`, `diveState()`. Test: `docs/TEST-TAUCHSPIEL.md`.

## Alte Karte, Akt 4 und Pumpwerk (0.21.0)

- **Szene `cs_alte_karte`** (`cutscenes/cs_alte_karte.js`, ca. 37 s): Karte entrollen · Finger fährt durch Täler und Dörfer · Sepia-Wasser steigt, übrig bleiben die Gipfel der heutigen Inseln · Blick aus Branns Fenster. Die Karte wird aus den echten Inselformen der Welt gebaut (`layout()`), sonst eine Vorlage.
- **Akt 4:** Leuchtturm Stufe 3, Aurels Geschenke größer und häufiger (`byAct` in `data/npctrade.js`), Aurels Dialog `aurel_tauchen` beim ersten Besuch nach Stufe 3 (Auslöser `visit:aurel`, `talk:aurel`, `trade:aurel`).
- **Pumpwerk:** Nach Stufe 3 wird der nächste Tauchspot zum Story-Spot `pumpwerk` (größere Blasen). Minispiel in zwei Teilen: Tor aufschweißen, dann in der Pumpenhalle das „Verbogene Brecheisen“ suchen. Doppelte Luft, bei Fehlschlag bleibt der Spot. Zahlen `DIVE_PUMP` (`data/dive.js`), Bild `divegame/pumpwerk.js`.
- **Debug:** `dive('story', 'pumpwerk')`, `diveGame({ story: 'pumpwerk' })`. Test: `npm run check:akt4`, `docs/TEST-AKT4.md`.

## Spielstand

- Gespeichert wird in IndexedDB (Datenbank `tideworks`, Stores `saves`, `meta`, `kv`; Aufbau siehe `src/save/storage.js` und Abschnitt „Version 12“). Ohne IndexedDB weicht das Spiel auf localStorage aus (Präfix `tideworks.`, höchstens 3 Spielstände). Blockiert der Browser beides, erscheint der bekannte Hinweis-Toast.
- Das Spiel speichert alle 15 s, beim Schließen der Seite und wenn sie in den Hintergrund geht.
- Das Format ist JSON mit Versionsfeld `v`. Die aktuelle Version ist `SAVE_VERSION = 18`: Seed, Ruhm (`xp`, `xpTotal`), nächstes Ziel (`goal`), Gebäude, Schiffe (ohne Pfad, mit Name, Laderäumen und Route), Inseln mit Daten (`isl`, Schlüssel = Insel-ID, mit `name` und `flag`), entdeckte Inseln (`found`), eingesammelte Funde (`loot`), kartierte Inseln (`mapped`), Treibgut aus „Über Bord“ (`jet`, mit Ablaufzeit), je Schiff den Schalter „Funde einsammeln“ (`pick`), Baum-Abweichungen je Chunk (`trees`) und der Nebel je Chunk (`fog`, Lauflängen + Base64), die Rohrebene je Chunk (`pipes`: Index, Stufe, …) und der Inhalt der Rohrnetze (`fnets`: ein Feld des Netzes, Flüssigkeit, Menge). Tank- und Gebäudepuffer (`fi`, `fo`, Brennstoff, Schmiermittel) stecken in den Gebäuden. Die Welt selbst wird aus dem Seed neu erzeugt. Beim Laden werden erst die Standardwerte gesetzt und der geladene Stand verschachtelt darübergemischt (`mergeDefaults`).
- **v5 → v6** wird beim Laden umgewandelt: `cargo {it, n}` kommt in den ersten Laderaum, Insel A/B mit `ia`/`ib` werden eine Route mit 2 Stopps
  (an A `ia` laden und `ib` entladen, an B umgekehrt, jeweils `all`), Schiffe heißen „Schiff n“. Ohne zwei gültige Inseln gibt es keine Route.
- **v6 → v7** wird beim Laden umgewandelt: Holzkohle wird überall zu Kohle (Lager, Puffer, Bänder, Laderäume, Routen-Aufträge, Lager-Ausgabe, Funde).
  Kohlemeiler werden entfernt, ihre Baukosten (100 Holz) und Puffer kommen ins Lager der Insel. Schmelzen werden Schmelzöfen (Rezept Eisen/Kupfer, Erz-Puffer bleibt, Brennstoff wird Kohle-Puffer).
  Forschung: `bohrer`, `schmelze`, `werft`, `bruecke`, `meiler` entfallen (Stufe 1); `verbrennung` → `kupfer` + `strom`; `werkzeug`/`buerger` → `handwerk`; `band2` → `stahl` + `schnellband`
  (jeweils mit allen Voraussetzungen). Verfügbare XP verfallen, `xpTotal` bleibt als Ruhm. Kabel zu Gebäuden ohne Strombedarf (Bohrer Mk1, Schmelzofen) werden gelöst.
  Bereits erfüllte Ziele werden still nachgezogen (ohne Ruhm).
- **v7 → v8** wird beim Laden umgewandelt: `mapped` und `jet` leer, alle Schiffe sammeln Funde ein. Inseln mit Kontor werden ganz aufgedeckt,
  bereits entdeckte Inseln mit genug gesehener Küste still als kartiert markiert. Forschungen bleiben erhalten; „Pyrolyse“ steht jetzt im Ast Chemie.
- **v8 → v9** wird beim Laden ergänzt: leere Rohrebene, keine Netze. Sonst ändert sich nichts (alle Gebäude, Lager, Forschungen und Schiffe bleiben).
  Beim Laden werden erst die Gebäude, dann die Rohre gesetzt; danach wird der gespeicherte Inhalt auf die neu berechneten Netze verteilt.
- **v9 → v10** wird beim Laden umgewandelt: Das alte 2×2-Kontor bleibt als „Hauptkontor (alt)“ (`kontoralt`) mit dem alten Anleger und einem Hinweis, es zu verlegen.
  Lagerhallen werden Lagerkisten (gleiche Ecke; das Inselinventar bleibt ungekürzt), Lager-Ausgaben entfallen (ein Dialog nennt die Anzahl), Brücken werden Kreuzungen.
  Routen-Stopps zeigen auf die ID des Hauptkontors, alle Schiffe werden Frachtschiffe, Statistik-Quelle „Ausgabe“ heißt „Extraktor“.
- **v10 → v11** wird beim Laden ergänzt: 0 Münzen, leerer Markt (Grundpreise), keine Händler unterwegs, keine Handelsaufträge, keine Ereignisse, Leuchtturm nicht begonnen.
  Neu im Spielstand: `coins`, `coinsTotal`, `coinLog` (Münzbuch, 30-s-Eimer), `market` (Sättigung, Nachfrage, Preisverlauf), `trade` (nächste Besuche, Händler ohne Pfad; der Weg wird beim Laden neu berechnet),
  `orders` (Handelsaufträge je Insel), `wonder` (Phasen, Bau), `ev` (angekündigte und laufende Ereignisse mit Zähler und nächstem Termin), `evMode`. In den Gebäuden: `dmg` (beschädigt), Drohnen `dr` im Hafen, Modus/Anforderung der Drohnenkiste (`dm`, `dw`).
- **v11 → v12** wird beim Laden umgewandelt: Ziele werden nach id gemerkt (`gdone`); alle Ziele vor dem alten Zeiger gelten als erreicht. Das Ziel „Waren extrahieren“ entfällt, das Dampfkraft-Ziel kommt nach Stahl.
  Neu: `gdone`, Sortierer-Einstellung `so: { it, rv }` im Gebäude, Entdecker-Reichweite `xr` am Schiff, in exportierten Dateien optional `name` (Name des Spielstands).
- **v12 → v13** wird beim Laden ergänzt (verlustfrei): `players` mit dem Spieler `host`, `mode: 'shared'`, `coop: null`; alle Gebäude bekommen `by: 'host'`, Schiffe `owner: 'host'`.
  Koop-Stände tragen dieselben Felder mit mehreren Spielern (Name, Farbe, Einstellung „Abreißen erlauben“). Nicht im Spielstand: Rückgängig-Stapel, Chat, Markierungen, Verbindungen.
- **v13 → v14**: nur die Versionsnummer ändert sich; Einzelspieler- und Gemeinsame-Insel-Stände laden unverändert.
  Neu bei Getrennten Inseln: `homes` (Plätze), `players[pid].st` (Forschung, Ruhm, Münzen, Ziele, Leuchtturm … je Mitspieler), `pfog` (Nebel der Mitspieler), `wfirst` (wer den ersten Leuchtturm entzündet hat),
  an Routen `perm` (Erlaubnis je fremdem Hauptkontor), an Handelskontoren `pl` (Preisliste), an Kontoren `ft` (Gründungszeit).
- **v14 → v15** wird beim Laden umgewandelt (`migrate14`): Was in Version 14 baubar war, bleibt baubar. Die frühen Forschungen Ofenbau, Bandtechnik und Schiffbau gelten als erforscht (bei Getrennten Inseln für jeden Spieler),
  alle Volk-Freischaltungen (Kontor gründen, Überlauf-Tor, Brückenband, Sortierer, Tor) und alle Pläne stehen mit der Quelle `alt` in `unl`. Die Forschung „Weltenleuchtturm“ entfällt; war sie erforscht oder steht der Turm schon, bleibt er freigeschaltet.
  Ziel „Ofenbau“ gilt als erreicht, wenn „Schmelzofen“ erreicht war; der Zielzeiger springt auf das erste offene Ziel der neuen Reihenfolge. Beim ersten Laden erklärt ein Dialog die Änderung.
  Neu im Spielstand: `unl` (Schlüssel → Quelle `npc` | `story` | `alt` | `debug`).
- **v15 → v16** wird beim Laden ergänzt (`migrate15`), außer bei Getrennten Inseln (die bleiben ohne Geschichte): Die Welt bekommt die drei NPC-Inseln in Zellen, die noch nicht aufgedeckt, bebaut oder entdeckt sind
  (die bekannte Welt ändert sich nicht), die Dörfer werden beim Laden gebaut, die Geschichte beginnt in Akt 1. Ohne Turm wird der Leuchtturm wieder gesperrt (Bauplan von Brann);
  steht schon ein Turm oder ist eine Phase fertig, bleibt er und lässt sich ohne Akt-Sperre weiterbauen (Flag `alt_turm`). Beim ersten Laden erklärt ein Dialog die Änderung.
  Neu im Spielstand: `story` (`act`, `flags`, `seen`, `once`, `choice`) und `npcs` (Zelle je NPC); NPC-Gebäude stehen wie alle Gebäude in `blds` (`by`/`owner` = `npc:<id>`, `npc`).
- **v16 → v17** wird beim Laden ergänzt (`migrate16`): Der Handel beginnt mit den Startwerten (Ruf, Vorräte, keine Aufträge); wer schon entdeckt ist, bekommt beim ersten Sekundentakt Stufe und Aufträge. Schiffe unbekannter Art werden Frachtschiffe. Neu im Spielstand: `npc` (siehe „Handel mit den Völkern“).
- **v17 → v18** wird beim Laden ergänzt (`migrate17`): Extraktoren haben keine Richtung mehr. Lief das Band vor einem alten Extraktor quer (er lud seitlich auf), bekommt er `fd` = alte Richtung und liefert dort weiter. Sonst ändert sich nichts. Neu im Spielstand: `fd` an Extraktoren, in `story.once` die Schlüssel `steg_<npc>` (erstes Anlegen).
- **Alte Stände (v2–v4)** gehören zur festen Karte und lassen sich nicht übernehmen. Findet das Spiel beim Start einen, erscheint „Die Welt wurde komplett neu aufgebaut …“, der alte Stand wird als `tideworks-alter-spielstand-vN-JJJJ-MM-TT.json` heruntergeladen, gelöscht, und eine neue Welt beginnt. Ein alter Stand beim Import wird mit einem Hinweis abgelehnt.
- Mitgespeichert werden die Produktionsstatistik (`flow`, wenige KB), die UI-Einstellungen, der Pflanz-Timer der Sägewerke (`_pt`) und an Schiffen die Werft, die sie gebaut hat (`home`; bei alten Schiffen leer).
- „Exportieren“ (Liste „Spiel laden“) lädt `tideworks-save-JJJJ-MM-TT.json` herunter. „Datei importieren“ legt aus der Datei einen neuen Spielstand an.
- **Komfort-Update:** Das Format bleibt Version 9. Neu ist nur `state.ui.statusView` (fehlt es in einem alten Stand, wird es beim Laden mit `false` ergänzt).
  Nicht im Spielstand: Spieltempo (Start immer 1×), Rückgängig-Stapel (beim Laden, Neustart und Import leer) und die Blaupausen-Bibliothek
  (spielstandübergreifend unter dem Schlüssel `blueprints` im selben IndexedDB-Store, ohne IndexedDB in localStorage `tideworks.blueprints`).
