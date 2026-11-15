# Tideworks – Plan für die Story-Umsetzung

Stand: 24.10.2026, Spielstand-Version 14 (Koop Teil 1 und 2 fertig). Antworten von Max eingearbeitet (Abschnitt 4).
Grundlage: `docs/STORY.md` (Story), `docs/SYSTEMS.md` (Systeme), `README.md` und `NOTES.md` (aktueller Stand), Referenz `docs/cutscenes/rauch-hinter-dem-nebel.html`.
In diesem Schritt wurde kein Spielcode geändert. Dateinamen und Funktionen unten sind am Code vom 24.10.2026 geprüft.

## 1. Bestandsaufnahme

### 1.1 Was es schon gibt und wozu es passt

| System (SYSTEMS.md) | Vorhanden | Dateien | Wiederverwenden oder erweitern |
| --- | --- | --- | --- |
| 1 Freischaltungen | Forschung mit `tech` an Gebäuden, Rezepten und Schiffsarten; eine zentrale Prüfung `isUnlocked(g, t, pid)` | `sim/state.js:184`, `data/tech.js`, `data/buildings.js`, `data/recipes.js`, `data/ships.js`, `sim/research.js` | **Erweitern.** `isUnlocked` ist der eine Haken, an dem auch Volk- und Story-Freischaltungen hängen können. Daneben prüfen Rezepte (`sim/production.js:67`, `ui/insights.js:164`) und Schiffsarten (`sim/sim.js:363`, `ui/insights.js:405`) `tech` selbst; die müssen auf dieselbe Prüfung umgestellt werden. |
| 2 Story-Zustand | nichts | – | **Neu.** Muster für Zustand + Migration + Snapshot liefern `wonder`, `ev`, `trade` (Version 11). |
| 2 Trigger | Simulations-Ereignisse in `g.events` (`discovered`, `mapped`, `wonderPhase`, `wonderDone`, `shipLaunched`, `loot` …), Anlegen eines Schiffs (`st: 'dock'` in `sim/ships.js`) | `sim/explore.js:61`, `sim/ships.js`, `sim/wonder.js` | **Wiederverwenden.** Story-Trigger hören auf dieselben Stellen; neue Ereignisse (`story`, `npcArrive`) laufen über `g.events` wie alle anderen. |
| 3 NPC-Inseln | Inseln nur aus Seed + Zelle (`genIsland`), Heimatinseln nach Vorlage `HOME`, mehrere Heimatinseln über `homes` (Version 14) | `world/worldgen.js`, `world/world.js`, `data/islands.js` | **Erweitern.** Feste Inseln gibt es schon: die Heimatinseln. NPC-Inseln werden nach demselben Muster wie `HOME`/`homes` als feste Zellen mit Vorlage erzeugt. |
| 4 Handel, Währung | Münzen (`state.coins`, ganzzahlig, Münzbuch mit Posten), Markt mit Sättigung und Erholung, Händler-Schiffe, Handelsaufträge | `sim/coins.js`, `sim/trade.js`, `data/trade.js`, `ui/market.js` | **Wiederverwenden.** „Gold“ = Münzen. Die Sättigung (`MARKET.per`/`recover`) ist genau „Preis sinkt bei viel Verkauf und erholt sich“. |
| 4 Handel am Steg | Preislisten an Handelskontoren und Handel zwischen Spielern beim Anlegen (Laden = kaufen, Entladen = verkaufen), Routen zu fremden Kontoren mit Erlaubnis | `sim/ptrade.js`, `sim/ships.js` (`route.perm`), `ui/market.js` (Reiter „Spieler“) | **Wiederverwenden.** Ein NPC-Steg ist im Kern ein fremdes Handelskontor mit Preisliste aus Daten. Routen, Laden/Entladen von Hand und Münzbuch-Posten gibt es damit schon. |
| 4 Aufträge, Feste | Ziele (`GOALS`, `state.gdone`, Belohnung `coins`), Ereignis „Händlerfest“ | `data/goals.js`, `data/events.js`, `sim/events.js` | **Teilweise.** Aufträge sind neu (zeitlich begrenzt, je NPC). Feste können das Ereignis-System nutzen (Dauer, Anzeige in `#evBar`), brauchen aber eine neue Wirkung „Produktion +x %“ (über `mods`/`prodOf` wie Leuchtturm-Phase 2). |
| 4 Laufzeit am Tag-Nacht-Zyklus | `dayInfo(time)`, `CYCLE` 900 s (10 min Tag, 5 min Nacht) | `world/daytime.js`, `config.js` | **Wiederverwenden.** „Bis morgen Abend“ = Ende des nächsten Tages (`day + 1`, `left`). |
| 5 Dialoge, Cutscenes | Modale Dialoge (`askConfirm`, `askInfo`), Pausenmenü hält die Simulation an (`pause`/`resume` an den Host), Toasts | `ui/modal.js`, `ui/menu.js`, `sim/host.js:125` | **Neu**, aber Pause und Esc-Kette werden wiederverwendet. Technik und Stil kommen aus der Referenz-Datei. |
| 6 Leuchtturm | Weltenleuchtturm: 5×5, einmalig, 4 Phasen mit Kosten, 2 min Bau, Gerüst, Wirkungen über `mods`, Lichtstrahl, Ziele `phase1`–`phase4`, Wettstreit bei Getrennten Inseln | `data/wonder.js`, `sim/wonder.js`, `gfx/sprites/endgame.js`, `data/goals.js` | **Erweitern.** Das ist der Story-Leuchtturm: Phasen = Stufen, Phase-Abschluss = Trigger. Kosten, Freischaltung und Bedingungen für Stufe 3/4 ändern sich (siehe Abweichungen). |
| 7 Taucherglocke | Schiffsarten (`SHIP_KINDS`), Funde auf See (Treibgut, Wracks), Ereignis „Treibgutfeld“ | `data/ships.js`, `world/finds.js`, `data/finds.js` | **Später** (nicht Thread 2–6). Tauchspots können wie Funde gezeichnet und eingesammelt werden; das Minispiel kann den Cutscene-Player (Thread 5) als Vollbild-Ebene nutzen. |
| 8 Relikte | Upgrade-Wirkungen nur über `mods(g, pid)` mit Cache-Schlüssel (Forschung × Leuchtturm-Phase) | `sim/mods.js` | **Später.** Relikte sind „Upgrades je Insel“: `mods` braucht dafür eine Insel-Ebene und einen erweiterten Cache-Schlüssel. |
| 9 Enden | Besitz über Hauptkontor (`ownerOf`, `islOwner`), Kontor setzen (`debugKontor`, `foundKontor`), Blaupausen bauen ganze Anlagen (`placeBlueprint`) | `sim/state.js`, `sim/ships.js`, `sim/blueprint.js` | **Später.** Ende B („Aurels Inseln samt Gebäuden“) lässt sich mit Blaupausen-Vorlagen umsetzen, die beim Ende für den Spieler gebaut werden. |
| 10 Koop | Host rechnet allein, Kommandos mit `pid`, `HOST_ONLY`, Ansichten mit Änderungs-Snapshots (`TOP`), Meldungen an alle (`SHARED_EV`, `to: '*'`), Datenschutz je Spieler, Versionsprüfung über alle `src/data/`-Tabellen | `sim/sim.js`, `sim/views.js`, `sim/privacy.js`, `net/version.js` | **Wiederverwenden.** Neue Zustandsteile kommen in `TOP` (`sim/views.js`) und in den lokalen Snapshot; neue Daten-Dateien sind automatisch Teil der Versionsprüfung. |
| Speichern | `SAVE_VERSION` in `config.js`, Migration Schritt für Schritt (`migrate5` … `migrate13`), `mergeDefaults` ergänzt fehlende Felder | `save/serialize.js`, `sim/state.js` | **Erweitern** mit `migrate14` → Version 15. |

### 1.2 Wie es zusammenhängt

- **Datenfluss bleibt gleich:** Oberfläche → Kommando (`send`) → Simulation im Worker (`applyCommand(g, c, pid)`) → Ereignisse in `g.events` und Zustand → Snapshot → Spiegel (`ui/context.js`) → Oberfläche/Renderer.
  Die Story-Logik (Akt, Flags, Ruf, Aufträge) gehört deshalb in die **Simulation**. Dialoge und Cutscenes sind reine **Oberfläche**: Sie werden von einem Ereignis gestartet und melden „gesehen“ oder „Entscheidung“ per Kommando zurück.
- **Freischaltung → Bauen:** `checkPlace` (`sim/buildings.js:74`) und das Baumenü (`ui/buildmenu.js`) fragen `isUnlocked`. Blaupausen (`sim/blueprint.js`) und Aufwerten (`upgradeInfo`, `sim/buildings.js:429`) gehen über `checkPlace` bzw. `isUnlocked`. Die automatische Kreuzung bzw. das Brückenband beim Band-Ziehen (`sim/sim.js:134`, `beltObstacle`/`crossable`) prüft heute keine Freischaltung, weil beide frei sind.
- **Leuchtturm → Ziele → Münzen → mods:** Phase fertig → `wonderPhase`-Ereignis → Ziel `phaseN` mit Münzen → neue Wirkung in `mods` (Cache-Schlüssel enthält die Phase).
- **Getrennte Inseln:** Alles, was „einem Spieler“ gehört, steht in `PLAYER_FIELDS` (`xp`, `tech`, `coins`, `goal`, `wonder`, `found` …) und wird über `pst(g, pid)` gelesen. Der Spiegel sieht immer seine eigenen Werte oben in `state`.

## 2. Abweichungen zwischen SYSTEMS.md und dem Spiel

### 2.1 Gebäude, Namen, Waren

| SYSTEMS.md | Spiel heute | Folge |
| --- | --- | --- |
| „Gold“ | **Münzen** (`state.coins`), in der Oberfläche überall „Münzen“ | Vorschlag: bei Münzen bleiben, in den Story-Texten „Münzen“ schreiben. |
| Lagerhalle (Start) | Gibt es seit Version 10 nicht mehr. Speicher = **Hauptkontor** (Inselinventar, fest) und **Lagerkiste** (`kiste`) | „Lagerhalle“ → Lagerkiste. |
| Ofen (Forschung) | **Schmelzofen**, Stufe 1, ohne Forschung | Ohne Schmelzofen kein Eisen, ohne Eisen keine Werft (30 Eisenbarren), kein Schiff (20 Eisenbarren), kein Sortierer/Tor. Eine Forschung dafür muss ganz früh und billig sein. |
| Hütte (frühe Forschung) | Hütte ist die **einzige Quelle für Skizzen**, und jede Forschung kostet Skizzen | **Sackgasse:** Ist die Hütte hinter einer Forschung, kann man nie forschen. Die Hütte muss beim Start frei sein. |
| fehlt in der Tabelle | **Fischerhütte, Bohrer Mk1** (beide Stufe 1, frei) | Ohne beide keine Skizzen (Hütte braucht Fisch) und kein Erz. Vorschlag: Start. |
| Splitter, Kreuzung (frühe Forschung) | Stufe 1, frei | Geht, wenn die Hütte frei ist (Skizzen). |
| Überlauf-Tor, Brücke, Sortierer, Tor (Brann) | alle Stufe 1, frei. Die alte „Brücke“ heißt seit Version 10 **Kreuzung**; daneben gibt es das **Brückenband** (`bandbruecke`) | „Brücke“ bei Brann ist vermutlich das Brückenband. Beim Ziehen setzt das Spiel Kreuzungen und Brückenband-Paare **automatisch** (`sim/sim.js:134`); das muss die Freischaltung beachten. |
| Extraktor (Ole) | Stufe 1, frei. **Seit Version 10 der einzige Weg, Waren aus einem Speicher zu holen** (Hauptkontor, Kiste, Handelskontor) | Hinter Ole wäre bis Akt 1 kein Kontor als Puffer nutzbar (z. B. Kohle aus dem Kontor in den Schmelzofen). Vorschlag: Start oder frühe Forschung. |
| Kontor für weitere Inseln (Ole) | Kein Gebäude: Ein Schiff mit 40 Holz **gründet** ein Hauptkontor (`foundKontor`, `FOUND_COST`). Das Gebäude „Handelskontor“ ist etwas anderes (zweiter Speicher mit Steg) | Freischaltung muss an `foundKontor` hängen, nicht an `isUnlocked`. Ziel 7 `kontor2` steht heute **vor** der Kupferverarbeitung und müsste nach hinten. Ohne Kontor keine Ring-1-Kupferinsel, keine Sandinsel (Öl). |
| Räucherei | gibt es nicht, ebenso Räucherfisch | neues Gebäude, neues Rezept, neue Ware. |
| Schnellband (Brann) | Forschung `schnellband` (nach Stahl) | „Genau eine Quelle“ heißt: Forschung streichen oder Brann-Freischaltung verlangt zusätzlich die Forschung (dann zwei Quellen). |
| Pumpen und Rohre (Brann) | Forschung `dampf` (Rohr Mk1, Wasserpumpe, Tank, Dampfkraftwerk), `druckleitung` (Mk2), `erdoel` (Saugpumpe), `chemie` (Mk3) | Wie oben. Hängt auch das Dampfkraftwerk an Brann? |
| Größere Schiffe (Brann) | Nur **Frachtschiff** und **Entdecker** (Forschung Kartografie). Mehr Laderaum gibt es über Upgrades (`laderaum1/2`) | neue Schiffsart nötig (Eintrag in `SHIP_KINDS`). |
| Aurel: Strom-Technik | Elektrizität (`strom`) ist Pflicht: Stahl braucht den Induktionsofen (4 Strom/s), Stahl braucht man für fast alles danach, auch für den Leuchtturm | Widerspricht der eigenen Regel „nichts nur bei Aurel darf Pflicht sein“. Aurel kann nur Strom-Extras geben (z. B. Bessere Akkus, Geothermie, Kesseltechnik). |
| Waren der NPCs | Fehlen: Seile, Netze, Räucherfisch, Zahnräder, Federn, Rohre (als Ware), Uhrwerke, Batterien (als Ware; die Batterie ist ein Gebäude), Perlen, Korallen, Muscheln, Luxuswaren, Relikte, Teile der Taucherglocke | Alle neu in `data/items.js` mit Symbol, Kistenfarbe, Preis (`PRICES`). „Batterien“ als Ware braucht einen anderen Namen als das Gebäude. |

### 2.2 Systeme

- **Leuchtturm.** Heute Endgame: Forschung Stufe 6 (20 Schaltpläne + 2.000 Münzen), Phasen kosten bis zu 200 Mikrochips, 100 Supermagnete, 12.000 Münzen. Die Story braucht Stufe 1 direkt nach Akt 1 (Holz, Eisen, Ziegel). Kosten und Freischaltung (`cs_bauplan` statt Forschung) müssen neu, Stufen 3 und 4 bekommen Story-Bedingungen.
  Bauort heute: nur Heimatinsel oder Insel ab Ring 2. Phase 4 heißt „Feuer“ und schaltet den Lichtstrahl ein; bei Ende B („Nicht entzünden“) darf er eigentlich nicht leuchten.
  Die Ziele `phase1`–`phase4` liegen am Ende der Zielliste hinter Multi-Bohrer und Drohnen.
- **Entdeckung.** Heute gilt eine Insel als entdeckt, sobald irgendein Feld von ihr aufgedeckt ist (`discovered` in `sim/explore.js`). SYSTEMS 3 sagt „Schiff in der Nähe“, STORY sagt „erstes Schiff **erreicht** Oles Insel“. Das sind zwei verschiedene Auslöser (Entdecken ≠ Anlegen).
  Der Entdecker (`EXPLORE`, Reichweite bis 1.500) und der Aufdeck-Radius beim Start (60) können eine weite NPC-Insel vor der nahen aufdecken. Die Reihenfolge Ole → Brann → Aurel ist also nicht von selbst gesichert.
- **Ruf** gibt es nicht. Achtung Verwechslung mit **Ruhm** (`xp`), das im Spiel schon so heißt.
- **Feste.** Das Ereignis `fest` heißt schon „Händlerfest“ (Ankauf +25 %). Ein Dorffest mit Produktionsbonus braucht einen anderen Namen und die Wirkung `prod`.
- **Ziele.** `GOALS` ist eine feste Liste ohne Akt. Sie kennt keine Story-Ziele und kein „Rede mit Brann“.
- **Cutscenes pausieren die Simulation.** Im Koop hält der Host bewusst **nicht** an (Pausenmenü, versteckter Tab: „Das Spiel läuft weiter“). Eine Cutscene, die für alle pausiert, ist eine neue Regel.
- **Story „gehört zur Welt“** (SYSTEMS 2 und 10). Bei *Getrennten Inseln* hat jeder Spieler eigene Forschung, Münzen, Ziele und einen **eigenen Leuchtturm** mit Wettstreit. Ein weltweiter Akt passt dazu nicht; deshalb dort vorerst keine Story (Entscheidung 2).
- **Testmodus** („Alles freischalten“, `unlockAll`) erforscht alles. Mit Volk- und Story-Freischaltungen muss festgelegt werden, ob er die auch setzt und ob er die Story überspringt.
- **Demo-Welt** des Titelbildschirms läuft mit derselben Simulation und darf keine Story auslösen.
- **Cutscene-Referenz und STORY.md** unterscheiden sich bei Ole: Zeile 5 hat in der Referenz zusätzlich „Pah. Ist mir auch egal.“, Zeile 6 nennt dort Osten, Werkstattleute und Goldberg.
- **Schrift.** Die Referenz setzt den Dialogtext in Pixelify Sans ab 10 px; im Spiel gilt seit Version 10 „Pixelify nur für Überschriften ab 15 px, sonst Nunito“.

## 3. Umsetzungsplan

Querschnitt für alle Threads:
- **Spielstand-Version 15** einmal in Thread 2 (`migrate14`), spätere Threads ergänzen nur Felder über `mergeDefaults` (wie das Komfort-Update), solange nichts umgebaut werden muss.
- **Story ist immer an** (kein freies Spiel, Entscheidung 1). Ausnahme: Koop mit *Getrennten Inseln*, dort vorerst keine Story (Entscheidung 2).
- **Alte Spielstände (bis Version 14)** werden nicht übernommen. Sie werden wie die Stände v2–v4 behandelt: beim Start als Datei exportiert, mit Hinweis gelöscht, Import abgelehnt (`migrate` in `save/serialize.js`). Grund neben Entscheidung 1: Die NPC-Inseln ändern die Welt-Erzeugung, alte Kontore könnten auf einer NPC-Insel stehen.
  `check:world` und `check:coop` prüfen danach den Story-Start statt der Gleichheit mit Version 13/14 (außer bei Getrennten Inseln, die ohne Story gleich bleiben sollen).
- **Zahlen in Tabellen** unter `src/data/` (neue Dateien `story.js`, `npcs.js`, `unlocks.js`, `dialogs/`), nie im Code. Neue Daten-Dateien zählen automatisch zur Versionsprüfung im Koop.
- **Debug** in `window.tideworks` und nur als `HOST_ONLY`-Kommando: `story(akt | flag)`, `rep(npc, n)`, `cs(id)`.
- **Dokumentation:** je Thread ein README-Abschnitt (wo man Neues einträgt) und ein NOTES-Abschnitt (Entscheidungen, Geprüft, Nicht geprüft), wie bisher.
- **Prüfen** wie bisher: headless mit dem Simulationscode, Playwright in beiden `USE_WORKER`-Modi, Dev-Server und `dist/tideworks.html` per file://, Koop mit zwei Profilen und lokalem PeerServer.

### Thread 2: Freischalt-System

Ziel: Jedes Gebäude, Rezept und jede Schiffsart hat genau eine Freischalt-Quelle: `start`, `tech` (Forschung), `npc` (Volk + Rufstufe), `story` (Flag). Noch ohne echten Ruf: Thread 4 liefert ihn, bis dahin ein Platzhalter-Wert und Debug.

**NPC-Pläne als Voraussetzung einer Forschung** (Entscheidung 4): Gebäude, die heute schon eine Forschung haben (Schnellband, Rohre, Pumpen, Bessere Akkus …), bleiben im Skilltree. Die Forschung bekommt eine zusätzliche Voraussetzung „Plan von Brann“ (bzw. Ole, Aurel). Den Plan kauft man beim NPC (ab einer Rufstufe); er ist ein Flag in `unl`, **keine Ware**, damit er nicht mit dem Item „Bauplan“ aus dem Bürgerhaus verwechselt wird.
Gebäude ohne Forschung (Sortierer, Tor, Brückenband, Kogge …) schaltet der Plan direkt frei. Daraus ergibt sich die Zuordnung in Abschnitt 3.1.

Schritte:
1. Tabelle `UNLOCKS` in neuer Datei `src/data/unlocks.js`: Gebäude → `{ src: 'tech', id }` | `{ src: 'npc', npc: 'ole', lvl: 'neutral' }` | `{ src: 'story', flag: 'cs_bauplan' }`; fehlt der Eintrag = Start. `BD[t].tech` bleibt für Forschung erhalten, damit Skilltree und Prüfskript weiter funktionieren; `unlocks.js` ergänzt nur die anderen Quellen. Eine Prüfung beim Laden der Tabellen meldet doppelte Quellen.
   Forschungen in `data/tech.js` bekommen optional `plan: 'brann_schnellband'` (Voraussetzung neben `req`); `reqMet`/`canResearch` (`sim/research.js`) und die Detailspalte im Skilltree zeigen „Plan von Brann nötig“.
2. Freigeschaltetes je Spieler: neues Feld `unl` in `PLAYER_FIELDS` (`sim/state.js`), gesetzt von Forschung (`sim/research.js`), Ruf (Thread 4) und Story (Thread 3). `isUnlocked(g, t, pid)` liest Forschung **und** `unl`. Dazu `lockReason(g, t, pid)` mit dem Text („Noch nicht erforscht (…)“, „Freischaltung bei Ole: freundlich“, „Folgt in der Geschichte“).
3. Alle Stellen, die heute `tech` selbst prüfen, auf `isUnlocked`/`lockReason` umstellen: Rezepte (`sim/production.js`, `ui/insights.js`), Schiffsarten (`sim/sim.js:363`, `ui/insights.js:405`), Baumenü (`ui/buildmenu.js`), Aufwerten (`sim/buildings.js`), automatische Kreuzung und Brückenband beim Ziehen (`sim/sim.js:134`).
4. Kontor gründen (`foundKontor`, `sim/ships.js`, Knopf in `ui/ships.js`) bekommt eine eigene Freischaltung „Kontor gründen“ (Quelle Ole). Das Ziel `kontor2` rückt in `data/goals.js` hinter den ersten Handel mit Ole (Entscheidung 7).
5. Neue frühe Forschungen für die Story (z. B. „Ofenbau“ für den Schmelzofen, „Schiffbau“ für die Werft, „Bandtechnik“ für Splitter, Kreuzung und Extraktor) in `data/tech.js`, sehr billig (wenige Skizzen + Holz). Neue IDs wählen: `bohrer`, `schmelze`, `werft`, `bruecke`, `meiler` waren Forschungen bis Version 6 und werden in `migrate7` entfernt.
   Die Forschung `leuchtturm` entfällt; der Leuchtturm hat nur noch die Quelle `story` (Entscheidung 3).
6. Skilltree: Gebäude mit Quelle `npc` oder `story` erscheinen nicht als Blatt einer Forschung, sondern in einer eigenen Gruppe (z. B. Blätter neben der Wurzel mit Volks-Abzeichen). `ui/skilltree-layout.js` (`baseBuildings`, `unlocksOf`), `ui/skilltree.js`, `tools/check-skilltree.mjs` („jedes Gebäude genau einmal“ muss die neuen Quellen kennen).
7. Testmodus (`unlockAll`, `sim/sim.js`) erforscht weiter alles, lässt aber Story-Flags und NPC-Pläne unberührt (Entscheidung 16). Forschungen mit fehlendem Plan überspringt er, wie heute Forschungen mit fehlender Voraussetzung.
8. Spielstand: `SAVE_VERSION = 15` (`config.js`), ältere Stände werden nicht übernommen (siehe Querschnitt). Bei *Getrennten Inseln* (ohne Story) ist `unl` von Anfang an alles, was Version 14 frei hatte; NPC-Pläne als Forschungs-Voraussetzung gelten dort nicht.
9. Snapshot: `unl` in `TOP` (`sim/views.js`) und im lokalen Snapshot.

| | Dateien |
| --- | --- |
| Neu | `src/data/unlocks.js`, `src/sim/unlocks.js` (Quelle, Prüfung, Text, Setzen) |
| Betroffen | `sim/state.js`, `sim/research.js`, `sim/buildings.js`, `sim/production.js`, `sim/sim.js`, `sim/ships.js`, `sim/views.js`, `sim/snapshot.js`, `data/tech.js`, `data/buildings.js` (Kommentare, ggf. `tech` entfernen), `data/ships.js`, `data/recipes.js`, `data/goals.js` (Reihenfolge, falls `kontor2` wandert), `ui/buildmenu.js`, `ui/insights.js`, `ui/ships.js`, `ui/skilltree-layout.js`, `ui/skilltree.js`, `save/serialize.js`, `config.js`, `tools/check-skilltree.mjs`, README, NOTES |

Risiken im Koop:
- Bei Getrennten Inseln ist `unl` je Spieler (wie `tech`). Alle Prüfungen müssen `pid` bzw. `ownerOf(b)` durchreichen; heute nimmt z. B. `insights.js:164` `game.state.tech` (auf dem Spiegel richtig, in der Simulation wäre es der Host).
- Der Mitspieler prüft Bauvorschauen auf seinem Spiegel: `unl` muss im Snapshot stehen, sonst zeigt die Vorschau grün und der Host lehnt ab.
- Ein Mitspieler mit gesperrtem Gebäude in einer Blaupause: Teil wird übersprungen (Toast nennt den Grund), wie bei fehlender Forschung.
- Getrennte Inseln ohne Story: Vergleichslauf gegen Version 14 sollte gleiche Spielstände ergeben (bis auf `v` und `unl`).

#### 3.1 Vorgeschlagene Zuordnung (aus den Entscheidungen, Zahlen beim Umsetzen)

| Quelle | Gebäude, Rezepte, Schiffe |
| --- | --- |
| Start | Fließband, Lagerkiste, Sägewerk, Fischerhütte, Bohrer Mk1, Hütte, Hauptkontor (fest) |
| Frühe Forschung | Schmelzofen („Ofenbau“), Werft + Frachtschiff („Schiffbau“), Splitter, Kreuzung, Extraktor („Bandtechnik“) |
| Forschung wie heute | Drahtzieherei, Werkzeugmacher, Bürgerhaus, Elektrizität (Verbrennung, Mast, Batterie), Stahl, Graphit, Halbleiter, Montage … |
| Ole (Ruf) | Kontor gründen, Räucherei (+ Rezept Räucherfisch) |
| Brann (Ruf, Plan) | direkt: Überlauf-Tor, Brückenband, Sortierer, Tor, Kogge (neue Schiffsart, ca. 5 Laderäume, langsamer); als Plan vor der Forschung: Schnellbänder, Dampfkraft (Rohr Mk1, Pumpe, Tank, Kraftwerk), Druckleitungen |
| Aurel (Ruf, Plan) | als Plan vor der Forschung: Bessere Akkus, Kesseltechnik, Geothermie, Ingenieurwesen (bessere Häuser); nichts davon ist Pflicht |
| Story | Weltenleuchtturm (`cs_bauplan`), Stufen 3 und 4; später Taucherglocke |

Hinweis: Brann schaltet Überlauf-Tor und Brückenband frei, die Kreuzung bleibt frühe Forschung. Beim Band-Ziehen setzt das Spiel ohne Brann-Freischaltung nur Kreuzungen, keine Brückenband-Paare.

### Thread 3: Story-Zustand, Trigger, feste NPC-Inseln

**Umgesetzt in Version 16 (24.10.).** Abweichungen (NPCs nicht in `state.players`, eigener Steg-Typ statt Hauptkontor, Dörfer aus Listen statt Blaupausen, Schiffe fahren weite Ziele in Etappen) stehen in NOTES.md, Abschnitt „Geschichte und NPC-Inseln (Version 16)“. Testanleitung: `docs/TEST-AKT1.md`.

Ziel: Akt 1 bis 5 laufen in der Simulation durch (ohne Bilder, nur Ereignisse und Toasts), die drei NPC-Inseln stehen in der Welt und verhalten sich wie Inseln anderer Spieler.

Schritte:
1. `state.story = { act, flags: {}, seen: {}, once: {}, choice: null }` (`sim/state.js`, `createGame`), bei jedem neuen Spiel außer *Getrennte Inseln*.
2. `src/data/story.js`: Akte mit Ziel-Texten, Übergängen und Bedingungen als Daten (z. B. `{ id: 'akt1_ende', when: { flags: ['npc_ole', 'npc_brann', 'npc_aurel'], talk: 'brann' }, cs: 'cs_bauplan', set: ['leuchtturm'], act: 2 }`), Cutscene- und Dialog-IDs aus STORY.md.
3. `src/sim/story.js`: Auswertung der Trigger, `storyTick` (in `sim/sim.js` neben `wonderTick`), Kommandos `talk` (Klick auf NPC), `storySeen` (Cutscene/Dialog gesehen), `storyDebug` (`HOST_ONLY`). Ereignis `story` mit `to: '*'`.
4. Trigger anschließen: Schiff legt an NPC-Steg an (`sim/ships.js`), Insel entdeckt (`sim/explore.js`), Leuchtturm-Phase fertig (`sim/wonder.js`), später Tauchgang. Akt-Ziele in der Ziel-Karte (`ui/hud.js`, `#goalCard`) vor den normalen Zielen.
5. Leuchtturm an die Story binden (Entscheidung 3): Freischaltung nur über Flag `cs_bauplan`, **nur auf der Heimatinsel** (Bauort-Prüfung in `sim/wonder.js`/`sim/buildings.js`), neue Kosten für Stufe 1–4 in `data/wonder.js` (Stufe 1 mit Waren aus Akt 1), Stufe 3 erst nach `cs_alte_karte`, Stufe 4 erst nach `cs_flutnacht` (`wonderReason`).
   **Keine Phasen-Wirkungen** mehr: `effect` der Phasen leer, `mods` braucht die Phase nicht mehr im Cache-Schlüssel (`sim/mods.js`). Die Ziele `phase1`–`phase4` werden durch die Akt-Ziele ersetzt. Der Lichtstrahl (`BEAM`) leuchtet erst nach Ende A, bei Ende B nie. Das Abschlussfenster nach Phase 4 entfällt (stattdessen `cs_wahrheit` und Entscheidung).
6. NPC-Inseln (Entscheidung 15): Ole in Ring 1, Brann in Ring 2, Aurel in Ring 3, **Zelle zufällig aus dem Seed** innerhalb des Rings. Deterministisch: Zellen eines Abstandsbands nach Seed-Hash ordnen, die erste nehmen, die nicht zu nah an einer anderen NPC-Insel liegt (leere Zellen werden für NPCs überschrieben). Für Aurel ein Band knapp hinter der Ringgrenze (etwa 900–1.100 Felder), damit die Fahrt nicht endlos wird.
   `NPC_ISLANDS` in `src/data/npcs.js` (Ring, Abstandsband, Typ, Radius, Vorlage für Umriss und Dorf). `genIsland` (`world/worldgen.js`) erzeugt dort die Vorlage statt einer Zufallsinsel; `World` bekommt die NPC-Zellen wie heute `homes`.
   Durch die Ringe ergibt sich die Reihenfolge Ole → Brann → Aurel von selbst aus der Entfernung. Erreicht man trotzdem eine weitere Insel früher, spielt deren Cutscene beim ersten Anlegen; Akt 1 endet erst, wenn alle drei entdeckt sind. Die feste Lösung „Aurels Steg erst nach Brann ansprechbar“ ist damit nicht nötig.
7. **NPCs als Spieler mit echten Gebäuden** (Entscheidung 13): Jeder NPC ist ein Eintrag in `state.players` mit eigener ID (`npc:ole`, `npc:brann`, `npc:aurel`, Merkmal `npc: true`, ohne Verbindung) und besitzt seine Insel über ein Hauptkontor mit Steg, so wie ein Mitspieler bei Getrennten Inseln (`ownerOf`, `islOwner`).
   Das Dorf entsteht beim Spielstart aus Blaupausen-Vorlagen (`src/data/villages/`, Format von `sim/blueprint.js`) und wächst mit dem Ruf um weitere Vorlagen-Stufen (Dörfer wachsen sichtbar). Die Gebäude sind echte Gebäude (`by: 'npc:ole'`), stehen aber still (kein Takt; Waren und Vorrat verwaltet `sim/npc.js` aus Thread 4), damit sie keine Rechenzeit kosten und keine Bänder brauchen.
   Schiffe legen am NPC-Hauptkontor an, Routen steuern es an (`PORTS`), eine Erlaubnis ist nicht nötig. Die NPC-Figur steht am Steg und ist anklickbar.
8. Neue Optik: Pfahldorf, Werkstattbucht, Goldberg (`src/gfx/sprites/npc.js`, Sprites der NPC-Gebäude, Boden in `gfx/ground.js`), NPC-Figur (`input/input.js`, `ui/insights.js`).
9. `tools/check-world.mjs` um Story-Welten erweitern (NPC-Inseln für gleichen Seed immer an derselben Stelle und im richtigen Ring, nie auf einem Startplatz). Neues `tools/check-story.mjs`: Akt 1 → 5 headless über Kommandos.

Vorbereitet für die Enden (Umsetzung später): Bei **Ende B** wechselt der Besitzer von Aurels Hauptkontor und Gebäuden auf den Spieler; die Insel ist dann eine Kolonie wie nach „Kontor gründen“, und die Gebäude laufen ab da normal (Aurel verlangt nichts, Entscheidung 17). Die Inseln von Ole und Brann werden zu Ruinen (Gebäude → Ruinen-Sprites, Handel aus). Bei **Ende A** werden Aurels Gebäude entfernt (verbrannt), der Spieler bekommt ein Hauptkontor auf der leeren Insel.

| | Dateien |
| --- | --- |
| Neu | `src/data/story.js`, `src/data/npcs.js`, `src/sim/story.js`, `src/gfx/sprites/npc.js`, `tools/check-story.mjs` |
| Betroffen | `sim/state.js`, `sim/sim.js`, `sim/ships.js`, `sim/explore.js`, `sim/wonder.js`, `data/wonder.js`, `data/goals.js`, `data/buildings.js`, `world/worldgen.js`, `world/world.js`, `data/islands.js`, `sim/views.js`, `sim/snapshot.js`, `sim/privacy.js`, `gfx/renderer.js`, `gfx/sprites.js`, `gfx/ground.js`, `ui/hud.js`, `ui/menu.js`, `ui/minimap.js`, `ui/mapview.js`, `main.js`, `save/serialize.js`, `tools/check-world.mjs`, `package.json` (Skript `check:story`), README, NOTES |

Risiken im Koop:
- **Welt-Gleichheit:** Jeder Mitspieler erzeugt die Welt selbst aus dem Seed. Ob NPC-Inseln existieren, muss deshalb in der `world`-Nachricht (`worldMessage`/`applyWorld`) und in `initWorld` mitkommen, sonst sehen Host und Mitspieler verschiedenes Land.
- **Getrennte Inseln** haben vorerst keine Story, keine NPC-Inseln und damit auch **keinen Leuchtturm** (er ist nur noch über die Story freischaltbar). Der Leuchtturm-Wettstreit aus Version 14 ruht, bis Koop geklärt ist.
- Story-Ereignisse müssen an alle gehen (`to: '*'` bzw. `SHARED_EV`), Anlege-Trigger auch von Schiffen der Mitspieler.
- **NPC-Besitz in allen Modi:** Im Einzelspiel und bei *Gemeinsamer Insel* gilt heute „alles gehört allen“ (`own` mit `pid == null` zählt alles, z. B. in `data/goals.js`). NPC-Gebäude dürfen trotzdem nicht abgerissen, bedient, aufgewertet, in Blaupausen aufgenommen oder in Zielen, Statistik, Soll/Ist und `countType` mitgezählt werden. Dafür braucht es eine Prüfung `isNpc(b)` an all diesen Stellen; das ist der größte Aufwand dieses Threads.
- Datenschutz: NPC-Gebäude sieht jeder, der das Gebiet aufgedeckt hat (`bldSeen`). `npc:*` als Besitzer darf in `ownerOf`/`playerName`/`playersFor`, Lobby, Chat und Spielerliste keinen Fehler werfen und nicht als Mitspieler erscheinen.
- Seeweg: Aurel liegt etwa 1.000 Felder weit. Die Suche ist begrenzt (`SHIP_SEARCH_MAX` 60.000 Knoten, NOTES v5); lange Wege müssen geprüft werden, sonst „Kein Seeweg gefunden“.
- `storyDebug` und alles, was Akte setzt, ist `HOST_ONLY`.

### Thread 4: Handel, Ruf, Aufträge mit NPCs

**Erledigt (Version 17, 24.10.2026):** siehe NOTES.md „Handel mit den Völkern (Version 17)“ und README; Zahlen in `src/data/npctrade.js`, Testanleitung `docs/TEST-HANDEL.md`. Nicht umgesetzt: Dorffeste (Schritt 6), Relikt-Belohnungen, Statistik-Quelle je Volk.

Ziel: Ole, Brann und Aurel kaufen und verkaufen, Ruf steigt, Stufen schalten Gebäude frei (an Thread 2 angeschlossen), Aufträge laufen mit dem Tag-Nacht-Zyklus.

Schritte:
1. Daten in `src/data/npcs.js`: je NPC Ankauf und Verkauf je Rufstufe (Ware, Preisfaktor, Vorrat, Nachschub), Startruf (Ole 10, Brann 30, Aurel 60), Rufpunkte je Münze bzw. Auftrag, Freischaltungen je Stufe, Auftrags-Vorlagen, Feste.
2. Neue Waren in `data/items.js` (Liste aus Abschnitt 2.1). Sie sind **nur bei NPCs kaufbar**, kein Rezept erzeugt sie (Entscheidung 10); Luxuswaren folgen später. Dazu Symbole in `gfx/sprites/items.js`, `ITEM_COL` in `gfx/sprites/sea.js`, Grundpreise in `PRICES` (`data/trade.js`), Räucherei in `data/buildings.js` + Rezept in `data/recipes.js`.
3. `src/sim/npc.js`: Ruf (`state.npc[id] = { rep, stock, sat, orders, deals }`), Handel beim Anlegen am NPC-Steg mit der Preislisten-Logik aus `sim/ptrade.js` (Laden = kaufen, Entladen = verkaufen, Münzen über `coinAdd` mit Posten `npc:ole` …), Sättigung je NPC nach dem Muster von `MARKET`, Rufstufen-Wechsel setzt `unl` (Thread 2) und meldet sich.
4. Routen zu NPC-Stegen: im Routen-Editor (`ui/fleet.js`) wählbar, keine Erlaubnis nötig (`route.perm` überspringen), Lieferverträge als eigener Auftrags-Typ „x je Tag an Ole“ mit Münzen je Tag.
5. Aufträge: 1–3 je NPC, Laufzeit bis Tagesende (`dayInfo`), Belohnung Münzen, Ruf, manchmal Relikt (Relikte selbst kommen später; bis dahin nur Platzhalter).
6. Dorffest: neues Ereignis in `data/events.js` (Name z. B. „Dorffest bei Ole“) mit neuer Wirkung `prod` auf die Inseln des Spielers (`sim/events.js`, `sim/mods.js`).
7. Oberfläche: NPC-Steg im Info-Panel (`ui/insights.js`), neues Fenster „Völker“ oder Reiter im Markt (`ui/market.js`): Ruf mit Stufe, Angebot, Aufträge, Verträge. Statistik-Quelle „Ole“ … (`SRC` in `ui/stats.js`), Münzbuch-Posten (`COIN_SRC`).
8. Story-Dialoge, die an Handel hängen („einmalig beim Handel mit Aurel in Akt 2“), als Trigger `trade:aurel` an Thread 3 melden.

| | Dateien |
| --- | --- |
| Neu | `src/sim/npc.js`, `src/ui/npcs.js` (Fenster/Reiter) |
| Betroffen | `data/npcs.js`, `data/items.js`, `data/trade.js`, `data/buildings.js`, `data/recipes.js`, `data/events.js`, `sim/ships.js`, `sim/ptrade.js`, `sim/coins.js`, `sim/events.js`, `sim/mods.js`, `sim/story.js`, `sim/unlocks.js`, `sim/sim.js`, `sim/views.js`, `sim/privacy.js`, `gfx/sprites/items.js`, `gfx/sprites/sea.js`, `ui/fleet.js`, `ui/market.js`, `ui/insights.js`, `ui/stats.js`, `ui/hotbar.js` (Knopf/Taste), `main.js`, README, NOTES |

Risiken im Koop:
- **Ruf gilt je Welt** (Entscheidung 11): `state.npc` liegt oben im Zustand, nicht in `PLAYER_FIELDS`. NPC-Pläne aus dem Ruf gelten für alle Spieler (bei Gemeinsamer Insel ohnehin). Bei Getrennten Inseln gibt es vorerst keine NPCs.
- Zwei Schiffe verschiedener Spieler legen gleichzeitig an: Vorrat und Preis werden der Reihe nach abgearbeitet (wie bei den Händlern), das muss deterministisch bleiben.
- Datenmenge: NPC-Zustand (Preise, Vorrat, Aufträge) nur bei Änderung und höchstens einmal je Sekunde mitschicken, wie Markt und Statistik.
- Toasts zu NPC-Handel nur an den handelnden Spieler (`pid`), Rufstufen-Wechsel und Feste an alle bzw. die Betroffenen.

### Thread 5: Dialog-System und Cutscene-Engine

Ziel: Ein Cutscene-Player und ein Monolog-Fenster im Spiel, die Szenen und Dialoge aus Daten abspielen. Die Referenz-Szene läuft darin unverändert gut.

Schritte:
1. **Bausteine** aus der Referenz in `src/cutscene/kit.js` übernehmen: `hash`, `vnoise`, `fbm`, `BAYER`, `shadeE`, `layer` (Vorrendern), `tpl`, `glow`, `rain`, `bars`, `black`, `ease`, Paletten-Hilfen, Sepia-Filter mit dunklem Rand für Rückblenden.
2. **Cutscene-Format** (`src/cutscene/player.js`): Modul `{ id, title, len, setup(), shots: [{ from, to, draw(ctx, lt, t) }], dialog }`; `setup` rendert die Ebenen beim Start (einmal, zwischengespeichert). Player: Canvas 320×180, ganzzahlig skaliert, `image-rendering: pixelated`, Balken 16 px, Überspringen-Knopf, `prefers-reduced-motion` springt in den Dialog (wie in der Referenz), `seek(t)` zum Prüfen.
3. **Monolog-Fenster** (`src/ui/dialog.js`): Porträt links (64×80, ragt ins Fenster), Namensschild, Pergament-Kasten im Holzrahmen, Schreibmaschinen-Text mit Pausen an Satzzeichen, Klick/Leertaste/Enter, Blinzeln, Mundbewegung, Pfeil „weiter“. Text als DOM über dem Canvas (wie in der Referenz). Schrift (Entscheidung 18): Namensschild in Pixelify Sans, Textkasten in Nunito (gut lesbar, passt zur Regel „Pixelify nur ab 15 px“). Läuft auch **ohne** Cutscene (Dialog beim Klick auf einen NPC über der laufenden Karte).
4. **Dialog-Daten** (`src/data/dialogs/<figur>.js`): `{ id, speaker, portrait, lines: [...], when: { act, flag }, once }`. Porträts in `src/gfx/portraits.js` (Ole aus der Referenz übernehmen).
5. **Einbindung:** `#cutscene` und `#dialog` in `index.html`, Stile in `styles/main.css`. `main.js` startet beim Ereignis `story` den Player, danach den Dialog, danach Kommando `storySeen`. Simulation anhalten über `pause`/`resume` wie das Pausenmenü (`sim/host.js`), Esc-Kette und Tastenkürzel gesperrt (`input/input.js`, `ui/hotbar.js`), Chat-Enter gesperrt (`ui/chat.js`).
6. **Erneut ansehen:** Pausenmenü → „Szenen“ (`ui/menu.js`), Liste der gesehenen Cutscenes aus `state.story.seen`.
7. **Größe:** Cutscenes sind Code, keine Bilder. Ziel: unter 40 KB je Szene im Bundle; `dist/tideworks.html` bleibt eine Datei (keine nachgeladenen Teile, weil die IIFE-Ausgabe keine Chunks lädt).
8. Prüfseite für Entwickler: `docs/cutscenes/` behält die Einzeldatei; zusätzlich `tideworks.cs(id)` im Spiel. Die Story-Debug-Funktionen stehen wie alle anderen auch in `dist/tideworks.html` über die Konsole bereit (Entscheidung 19: einheitlich mit `tideworks.event`, `coins` …, und Fehler lassen sich so auch in der fertigen Datei nachstellen); im Koop wirken sie nur beim Host.

| | Dateien |
| --- | --- |
| Neu | `src/cutscene/kit.js`, `src/cutscene/player.js`, `src/ui/dialog.js`, `src/gfx/portraits.js`, `src/data/dialogs/` |
| Betroffen | `index.html`, `styles/main.css`, `main.js`, `input/input.js`, `ui/hotbar.js` (Esc/Kürzel), `ui/chat.js`, `ui/menu.js`, `ui/speed.js`, `sim/host.js` (nur falls eine eigene Pause-Art nötig ist), `net/session.js` (Koop), README, NOTES |

Risiken im Koop:
- **Pause** (Entscheidung 12): Heute läuft der Host im Koop immer weiter. Neu: Die Cutscene startet bei allen gleichzeitig (Ereignis mit `to: '*'`), der Host hält die Simulation an, solange er die Szene und den Dialog sieht, und nur der Host kann überspringen (`csSkip` über die Sitzung an alle). Mitspieler, die während einer Szene beitreten, sehen sie nicht (nur im Menü „Szenen“).
- Wer ist „du“ in Dialogen, wenn vier Spieler zuhören? Texte bleiben in der Du-Form, Entscheidungen trifft nur der Host (STORY.md, offene Punkte).
- Ein Mitspieler darf `storySeen` nicht für alle setzen: „gesehen“ setzt nur der Host, eigene Wiederholungen bleiben lokal.
- Die Hauptschleife des Spiels darf während der Szene weiterlaufen (Snapshots kommen weiter an), der Renderer der Karte sollte aber pausieren, damit die Szene flüssig bleibt.

### Thread 6: Cutscenes und Dialoge von Prolog und Akt 1

Ziel: `cs_prolog`, `cs_npc_ole`, `cs_npc_brann`, `cs_npc_aurel`, `cs_bauplan` mit ihren Dialogen im Spiel, angeschlossen an die Trigger aus Thread 3.

Schritte:
1. `cs_npc_ole` aus der Referenz in das Format von Thread 5 übertragen (Bild für Bild gleich, Prüfung mit `seek(t)` gegen die Referenz-Datei).
2. `cs_prolog` „Gestrandet“: Sturm, Blitz mit Boot, Morgenstrand mit Wrack und **Aurels Wappen**, Hand mit Ring und Seilspuren, nasser Zettel mit Siegel, Titel „Tideworks“. Auslöser: „Neues Spiel“, vor dem ersten Bild der Karte.
3. `cs_npc_brann` (Werkstattbucht, Funken, grüner Mantel über die Schulter), `cs_npc_aurel` (erster Sonnenstrahl, Terrassen, Fahne mit dem Wappen), `cs_bauplan` (Werkstatt abends, Bauplan, Siegel wie im Prolog).
4. Porträts Brann und Aurel (64×80, Blinzeln, Mund), Wappen und Siegel als gemeinsame Pixel-Vorlagen (Leitmotive, `src/cutscene/motifs.js`), damit Wrack, Fahne und Zettel exakt gleich aussehen.
5. Dialoge in `src/data/dialogs/ole.js`, `brann.js`, `aurel.js` (Texte aus STORY.md, Entscheidung 14; die Referenz-Datei wird bei Oles Zeilen 5 und 6 angepasst), einmalige Dialoge aus Akt 2 schon als Daten anlegen.
6. Wrack mit Wappen auch auf der Karte am Strand der Heimatinsel (Funde-Sprite `gfx/sprites/sea.js`), damit der Prolog im Spiel weitergeht.
7. Ablauf von Akt 1 einmal ganz spielen: neues Spiel → Prolog → Werft → Ole → Brann → Aurel → zurück zu Brann → `cs_bauplan` → Leuchtturm frei.

| | Dateien |
| --- | --- |
| Neu | `src/cutscenes/cs_prolog.js`, `cs_npc_ole.js`, `cs_npc_brann.js`, `cs_npc_aurel.js`, `cs_bauplan.js`, `src/cutscene/motifs.js`, `src/data/dialogs/ole.js`, `brann.js`, `aurel.js` |
| Betroffen | `src/gfx/portraits.js`, `src/data/story.js` (IDs eintragen), `gfx/sprites/sea.js`, `gfx/renderer.js` (Wrack am Strand), `ui/menu.js` (Prolog nach „Neues Spiel“), README, NOTES |

Risiken im Koop:
- Prolog nur beim Host bzw. bei „Neues Spiel“; ein Mitspieler, der einer Story-Welt beitritt, sieht ihn nicht automatisch (er kann ihn unter „Szenen“ ansehen, wenn der Host ihn gesehen hat).
- NPC-Cutscenes beim Anlegen eines Mitspieler-Schiffs laufen bei allen (gleiches Verhalten wie Thread 5).
- Bei Getrennten Inseln gibt es vorerst keine Cutscenes.

### Reihenfolge und Abhängigkeiten

- Thread 2 zuerst (Spielstand-Version 15, Grundlage für Ruf- und Story-Freischaltungen).
- Thread 3 und Thread 5 können danach gleichzeitig laufen: Thread 3 ist Simulation, Thread 5 ist Oberfläche. Schnittstelle zwischen beiden: das Ereignis `story` (`{ type: 'story', cs, dialog, to: '*' }`) und das Kommando `storySeen`. Diese Schnittstelle legt Thread 3 als Erstes fest.
- Thread 4 braucht Thread 2 und die NPC-Stege aus Thread 3.
- Thread 6 braucht Thread 3 und 5; „Erster Handel“ in Akt 1 braucht Thread 4.
- Danach (nicht in diesem Plan): Taucherglocke und Tauchspots, Relikte und Sockel, Akte 2–5 mit ihren Cutscenes, Enden.

## 4. Entscheidungen (Antworten von Max, 24.10.2026)

1. Alte Spielstände werden nicht übernommen. Ein freies Spiel ohne Story gibt es vorerst nicht.
2. Koop wird später geklärt. *Getrennte Inseln* laufen vorerst ohne Story.
3. Der Story-Leuchtturm ist der Weltenleuchtturm, freischaltbar nur durch die Story, baubar nur auf der Heimatinsel. Phasen-Wirkungen entfallen vorerst. Bei Ende B leuchtet er nicht.
4. Schnellbänder (und andere Brann-Technik) bleiben im Skilltree; die Forschung braucht als Voraussetzung den Plan von Brann.
5. Hütte, Fischerhütte und Bohrer Mk1 sind Start-Gebäude, der Ofen wird eine billige erste Forschung.
6. Der Extraktor kommt früh (frühe Forschung), nicht erst bei Ole.
7. Kontor gründen schaltet Ole frei, das Ziel „Kontor auf einer zweiten Insel“ rückt nach hinten.
8. Aurel bringt optionale Strom-Technik (Bessere Akkus, Kesseltechnik, Geothermie) und bessere Häuser.
9. Brann bringt eine neue größere Schiffsart (Kogge).
10. Neue Waren sind nur bei NPCs kaufbar. Luxuswaren legt Max später fest.
11. Ruf gilt je Welt.
12. Cutscenes halten im Koop die Simulation für alle an, nur der Host überspringt.
13. NPC-Inseln verhalten sich wie andere Spieler mit echten Gebäuden (Plan in Thread 3). Bei Ende B wird Aurels Insel zu einer eigenen Kolonie.
14. Für Dialoge gilt der Text aus STORY.md.
15. Ole in Ring 1, Brann in Ring 2, Aurel in Ring 3, Lage zufällig innerhalb des Rings.
16. Der Testmodus lässt die Story unberührt.
17. Ende B: Aurel verlangt nichts, man übernimmt nur seine Insel (in STORY.md eingetragen).
18. Schrift: entschieden in Thread 5 (Nunito im Textkasten, Pixelify im Namensschild).
19. Debug: entschieden in Thread 5 (Konsole auch in `dist/tideworks.html`, nur Host).

## 5. Folgefragen (beantwortet am 24.10.2026)

1. Getrennte Inseln ohne Leuchtturm und ohne Wettstreit: vorerst in Ordnung.
2. Leuchtturm-Stufen geben **keinen** Ruhm und keine Münzen mehr (`WONDER.fame` und die Münz-Belohnungen der Ziele `phase1`–`phase3` entfallen; die Baukosten in Münzen werden mit den neuen Stufen-Kosten neu festgelegt); belohnt wird nur über die Story.
3. NPC-Gebäude sind echt, produzieren aber nicht selbst; Waren und Vorrat der NPCs kommen aus Tabellen.

Weitere offene Punkte: Luxuswaren (legt Max später fest), Koop bei Getrennten Inseln.
