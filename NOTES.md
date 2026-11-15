# Notizen (Tideworks, früher Workscape)

## Fehler und Eigenheiten des Originals

Beim Umbau (v3) bewusst 1:1 übernommen, mit der neuen Oberfläche (v4) behoben:

- [x] **1. Item verschwindet beim Überbauen eines Bandes.** Splitter und Überlauf-Tor übernehmen das Item (`from` = Seite, aus der es kam). Die Brücke legt es auf die Spur der Laufrichtung. Passt es nicht (Spur belegt, Richtung unbekannt, Brücke → Band mit zwei Items), kommt es ins Lager der Insel. Ist das Lager voll, geht es weiterhin verloren.
- [x] **2. Standardwerte für `stats` und `ui` greifen beim Laden nicht.** `loadInto` setzt erst die Standardwerte und mischt den geladenen Stand verschachtelt darüber (`mergeDefaults`).
- [x] **3. Testmodus überschreitet die Lagergrenze.** „Alles freischalten“ füllt jede Insel mit Kontor nur bis zu ihrer Kapazität auf. Holz mindestens 50, damit eine Lagerhalle baubar ist (bei nur einem Kontor ist die Kapazität 100, die Untergrenze greift also nie über die Kapazität hinaus).
- [x] **4. „Schiffe mit Heimathafen hier“ zählt falsch.** Neues Feld `home` am Schiff (ID der Werft). Die Werft-Info zählt „In dieser Werft gebaut“. Alte Schiffe haben kein `home` und zählen nirgends.
- [x] **5. Ziel 9 zu früh erfüllt.** Erst erfüllt, wenn ein Schiff eine Route mit zwei verschiedenen Inseln hat.
- [x] **6. Toter Code:** `addInv`, `rotations`, `isl[].power` (beim Laden alter Stände entfernt) und `RT.burnT` sind entfernt.
- [x] **7. Pflanz-Timer wird nicht gespeichert.** `_pt` wird mitgespeichert.
- [x] **8. Hover-Hinweis bleibt stehen.** Verlässt die Maus die Karte (auch auf ein Panel), werden Vorschau und Hinweis geleert.
- [x] **9. Kostenanzeige von der falschen Insel.** Hinweis und Prüfung beziehen sich auf die Insel unter der Vorschau, ohne Vorschau (Tooltips im Baumenü) auf die Insel unter der Kamera.

## Neue Oberfläche (v4): Entscheidungen und Auffälligkeiten

- **„Insel unter der Kamera“ mit Ufer-Toleranz.** Liegt die Kartenmitte auf Wasser, zählt die nächste Insel in bis zu 3 Feldern Abstand noch als „unter der Kamera“. Erst weiter draußen erscheint „Offenes Meer“.
- **Lager und Auswahl folgen nur der Kamera.** Früher sprang das Lager-Panel auch auf die Insel eines angeklickten oder gebauten Gebäudes. Jetzt zeigt es immer die Insel in der Kartenmitte.
- **„Erzeugt von“ zeigt die Gebäude-Produktion.** Welches Gebäude ein Item auf dem Band erzeugt hat, weiß das Lager nicht. Die Aufschlüsselung nutzt deshalb die Ausgabe je Gebäudetyp (`m`) plus Schiffsentladung. Sie kann von „erzeugt (ins Lager)“ abweichen, z. B. wenn Holz in einen Kohlemeiler statt ins Lager läuft.
- **Überlauf zur Verbrennung** zählt als erzeugt und verbraucht (netto 0), weil das Item zwar ankommt, aber nicht ins Lager passt.
- **Statistik wird gespeichert.** Sie bläht den Spielstand nur um wenige KB auf (im Test unter 1 KB nach einigen Minuten, maximal 30 Fächer je Insel).
- **Notfall-Speichern verliert `_pt`.** Beim Schließen der Seite wird aus dem Spiegel gespeichert. Der Spiegel bekommt `_pt` nicht (er ändert sich jeden Tick und würde jeden Snapshot vergrößern). Der reguläre Speicherstand alle 15 s enthält `_pt`.
- **Baumenü und zentriertes Fenster schließen sich gegenseitig.** Das zentrierte Fenster würde das Baumenü verdecken. Das Seitenfenster „Flotte“ bleibt neben dem Baumenü offen.
- **Baumenü schließen beendet den Baumodus** (nicht aber Abriss oder Kabel verlegen).
- **Bewohner-Anzeige** steht jetzt in der oberen Leiste (vorher im entfallenen Insel-Panel). Die übrigen Zahlen des Insel-Panels (Häuser versorgt, XP/s, Produktionsgebäude, Bänder, Schiffe auf Route) entfallen.
- **Platz für das Baumenü wird immer freigehalten.** Überschneiden sich linke oder rechte Spalte waagerecht mit der Knopfleiste (z. B. bei 1024 px Breite), enden sie oberhalb von Knopfleiste und Baumenü, auch wenn das Baumenü zu ist. So springen die Panels beim Drücken von B nicht.
- **Kleine Bildschirme:** Unter 1024×640 starten Lager und Info-Panel bei jedem Start eingeklappt (ein gespeicherter „ausgeklappt“-Zustand wird dort überschrieben), und ein Klick auf die Karte klappt das Info-Panel nicht automatisch auf.
- **`window.tideworks.check(t, x, y)`** wurde fürs automatische Testen ergänzt (Platzierungsprüfung auf dem Spiegel).

## Offene Punkte und Entscheidungen beim Umbau

- **Interpolation hängt etwa einen Snapshot nach.** Mit `INTERPOLATE = true` werden Band-Items und Schiffe zwischen dem vorletzten und dem letzten Snapshot bewegt. Sie liegen dadurch bis zu 0,05 s hinter der Simulation. Mit `false` ist die Darstellung wie im Original.
- **Notfall-Speichern aus dem Spiegel.** Beim Schließen oder Verstecken der Seite wird synchron aus dem Spiegel im Hauptthread gespeichert, also mit dem Stand des letzten Snapshots. Auf eine Antwort des Workers kann dort nicht gewartet werden. Im Test war der Unterschied zum Worker-Stand nur der Fortschritt des Schiffes (`pi`/`f`), den auch das Original beim Laden zurücksetzt.
- **Hintergrund = Pause, wie bisher.** Im Original hielt `requestAnimationFrame` das Spiel im Hintergrund an. Jetzt pausiert die Simulation bei `visibilitychange` ausdrücklich und läuft beim Zurückkehren weiter.
- **file:// mit Worker nur in Chromium getestet.** Firefox und Safari erlauben eingebettete Worker unter file:// voraussichtlich ebenfalls. Notfalls greift der automatische Wechsel auf den Hauptthread.
- **Alter localStorage-Stand bleibt liegen, wenn IndexedDB schon einen Stand hat.** Dann wird nichts übernommen und nichts gelöscht.
- **UI-Einstellungen gehören der UI.** `state.ui` (eingeklappte Panels, letzte Baukategorie) verwaltet der Hauptthread. Er gibt es beim Speichern mit. Die Simulation kennt es nur zum Durchreichen.
- **Debug-Objekt.** `window.tideworks` (Alias `window.workscape`; `game`, `ui`, `cam`, `client`, `info()`) ist für Tests in der Konsole gedacht und kann entfernt werden.
- **Tailwind.** Das Basis-CSS (Preflight) von Tailwind v3.4 (MIT) ist als kleiner Ausschnitt in `main.css` nachgebaut. Benutzt wurden sonst nur `.hidden` und `.grow`.

## Unendliche Welt (v5): Entscheidungen und Auffälligkeiten

- **Keine Übernahme alter Stände.** Die feste Karte (150×110, 5 Inseln) passt nicht in die neue Welt. Alte Stände werden beim Start als Datei exportiert und dann gelöscht (siehe README „Spielstand“).
- **Felsbrocken entfallen.** Statt Felsen gibt es Bergformationen und auf Vulkaninseln Lava; beide sind nicht bebaubar und haben eigene Hinweise beim Bauen.
- **Bohrer auf neuen Vorkommen.** Quarz, Schwefel, Öl und Neodym haben noch kein Item. Ein Bohrer darf darauf stehen, steht aber still. Das Info-Panel zeigt „Vorkommen (noch nicht abbaubar)“.
- **Inseln ohne Kontor haben kein Lager.** Sie erscheinen im Lager-Panel als „Auf dieser Insel gibt es kein Lager“. Bauen ist dort nur möglich, wenn die Kosten von dort bezahlt werden könnten, also praktisch erst mit Kontor.
- **`debugKontor()` nur für Tests.** Es setzt ein Kontor auf den erzeugten Küstenplatz der Insel (oder den nächsten freien Platz am Meer). Im normalen Spiel gibt es noch keinen Weg zu einem zweiten Kontor.
- **Seeweg-Suche ist begrenzt.** Sehr weite Routen oder Ziele hinter großen Inselketten können „Kein Seeweg gefunden“ melden, obwohl ein Umweg existiert (Rechteck + 40 Felder, 60 000 Knoten). Im Test: Weg über ~390 Felder in etwa 0,1 s.
- **Chunks im Nebel werden nicht gerendert.** Ganz verdeckte Chunks zeigen nur die Wolkendecke; ihr Boden wird erst erzeugt und gemalt, wenn etwas davon aufgedeckt ist. Die Minimap zeigt Unaufgedecktes dunkel.
- **Speicher bleibt begrenzt.** Gemessen bei 2100 Feldern Fahrt in fünf Richtungen mit ständigem Aufdecken: höchstens ~900 Boden-Chunks, ≤ 400 Inseln, 120 Chunk-Bilder, 240 Nebel-Bilder, JS-Heap im Hauptthread 30–60 MB, ~17 ms je Bild (headless Chromium, Worker und Hauptthread-Modus). Nur aufgedeckter Nebel (128 Byte je Chunk) und geänderte Baum-Chunks wachsen mit dem Spielfortschritt.
- **Spielstand bleibt klein.** Nach einer Schiffsfahrt zu einer zweiten Insel etwa 7 KB.
- **Determinismus** wurde geprüft: zwei Welten mit gleichem Seed, Inseln in umgekehrter Reihenfolge und nach 2000 Chunks Cache-Druck erzeugt, sind Feld für Feld gleich.

## Schiffe, Kontore, Routen, Funde (v6): Entscheidungen und Auffälligkeiten

- **Ziel auf Land = Küste zum Schiff hin.** „Nächstes Meeresfeld an der Küste in Richtung des Klicks“ ist so umgesetzt: vom Klickpunkt aus Richtung Schiff das erste Meeresfeld. Das Schiff landet also an der Küste, die ihm zugewandt ist, auch wenn auf der anderen Seite der Insel ein näheres Ufer läge.
- **Kontor gründen nur mit stehendem Schiff.** Fährt das Schiff noch, ist der Knopf ausgegraut („Das Schiff fährt noch“). Grund: Vorschau und Plätze hängen von der Schiffsposition ab. Ein Rechtsklick an die Küste hält es dort an.
- **Platzwahl.** Gültige Plätze werden im Umkreis von 8 Feldern um das nächste Landfeld gesucht; die Vorschau steht am Platz, der dem Schiff am nächsten ist. Gezeigt wird die Fläche aller gültigen 2×2-Plätze (hell). Ein Klick in diese Fläche wählt den passenden Platz, der Mausposition am nächsten liegt.
- **Name immer vergeben.** Esc im Dialog direkt nach dem Gründen übernimmt den Vorschlag, damit jede Insel mit Kontor einen Namen hat (Inselliste, Statistik, Karte). Später (Info-Panel des Kontors) bricht Esc ohne Änderung ab. Auch die Heimatinsel lässt sich so umbenennen und umfärben.
- **Neue Routen entladen an jedem Stopp alles.** Nach „Route anlegen“ hat jeder Stopp „Entladen: alle Waren“ und keine Lade-Aufträge. Das Schiff fährt also sofort los, transportiert aber erst etwas, wenn im Editor Lade-Aufträge stehen.
- **„Warten bis beladen“ und die Modi `all`/`keep`.** Ein Auftrag gilt als erfüllt, wenn kein Platz mehr für die Ware ist oder (`upto`) die Menge an Bord ist. Bei `all` und `keep` heißt das: Laderaum für diese Ware voll. Reicht der Vorrat dafür nicht, wartet das Schiff die vollen 60 s.
- **Letzter Stopp = erster Stopp ist nicht erlaubt**, weil die Route danach von vorn beginnt und das Kontor dann zweimal direkt hintereinander käme. Beim Anlegen wird ein solcher letzter Stopp mit Hinweis entfernt, im Editor wird die Änderung abgelehnt.
- **Umsortieren ändert, welcher Stopp angefahren wird.** Das Schiff fährt immer `stops[idx]` an. Liegt nach einer Änderung ein anderes Kontor an dieser Stelle, fährt es sofort dorthin.
- **Laden von Hand nur, wenn das Schiff steht** (am Kontor höchstens 2 Felder vom Anleger). Auf einer Route ist das während der 2 s Anlegezeit und beim Warten möglich.
- **Funde je Chunk.** Die „Zelle“ der Funde ist ein Chunk (32×32), nicht die Inselzelle (112×112), sonst wären Funde sehr selten. Ergibt etwa 0,7 Funde je Chunk auf offener See. Häufigkeit in `FIND_SPAWN` (`data/finds.js`).
- **Voller Laderaum bei Funden** meldet „Laderaum voll“ nur einmal je Fund und Schiff, damit vorbeifahrende Routenschiffe die Toasts nicht fluten. Teilweise eingesammelte Funde bleiben mit dem Rest liegen.
- **Funde decken nichts auf und zählen nicht in der Statistik.** Sie landen im Schiff, nicht im Lager; ins Lager gelangen sie erst beim Entladen (dann als „Schiffe“).
- **Snapshot.** Der Pfad eines Schiffs (für die gestrichelte Linie) wird nur nach Änderungen mitgeschickt (`_pv`), `state.loot` nur nach dem Einsammeln.
- **Debug-Kontore haben keinen Namen** und erscheinen weiter als „Unbekannte Insel (x / y)“, bis man sie im Kontor-Info-Panel benennt.

## Produktionsketten (v7): Entscheidungen und Auffälligkeiten

- **Zutaten werden beim Start eines Durchgangs entnommen.** So lässt sich „Fortschritt beim Umschalten zurückgeben“ sauber umsetzen: Der laufende Durchgang legt seine Zutaten zurück in den Puffer.
  Der Puffer darf dadurch kurz über der Annahmegrenze liegen (z. B. 7 / 5 Eisenerz); das Gebäude nimmt dann einfach nichts mehr an, bis er sinkt.
- **Items auf dem Band zum alten Rezept bleiben liegen.** Puffer blockieren nach dem Umschalten nicht, ein Band mit einer Zutat, die das neue Rezept nicht braucht, steht aber, bis man zurückschaltet oder das Band neu legt.
- **Pyrolyse aus Holz ist bandbegrenzt.** 8 Holz in 6 s sind 1,33 Holz/s; ein Fließband Mk1 bringt 1/s, also 7,5 statt 10 Teer/min. Abhilfe: Schnellband oder zwei Zulaufbänder.
- **Kohle ist der Engpass.** Schmelzöfen, Induktionsofen, Graphit-Presse und Pyrolyse brauchen Kohle, die Verbrennungsanlage nimmt alles mit Bandtempo (1 Item/s). Mit Holz gefüttert (Brennwert 4) liefert sie 4 Strom/s, genau einen Induktionsofen.
- **Bohrer auf Öl.** Öl gehört nicht zur Mehrheitsregel. Liegt nur Öl unter dem Bohrer, lässt er sich nicht bauen („Öl braucht eine Saugpumpe …“); liegt Öl neben anderem Vorkommen, erscheint es unter „ignoriert“. Alte Bohrer auf Öl bleiben stehen und zeigen den Hinweis.
- **Häuser prüfen sofort nach dem Bau**, danach alle 60 s. So sieht man direkt, ob die Versorgung stimmt. Ist das Lager für den Plan voll, wird nichts entnommen („Versorgt · Lager voll“).
- **Ziele der Reihe nach.** Die Simulation merkt sich das nächste offene Ziel (`state.goal`) und vergibt Ruhm nur beim Erreichen. Ein Ziel, das später wieder „unerfüllt“ wäre (Gebäude abgerissen), bleibt erreicht. Werft und Kontor (Ziele 7–8) stehen vor der Kupferverarbeitung; wer sie überspringt, bekommt den Ruhm für die folgenden Ziele erst danach.
- **Migration: Forschung mit Voraussetzungen.** `band2` → `stahl` + `schnellband` setzt `strom` und damit `kupfer` voraus. Damit der Baum stimmig bleibt, werden alle Voraussetzungen mit freigeschaltet.
- **Migration: Meiler-Puffer.** Zusätzlich zu den Baukosten kommen Holz im Puffer und fertige Holzkohle (als Kohle) ins Lager. In der Statistik werden Holzkohle- und Meiler-Einträge gelöscht und „Schmelze“ als „Schmelzofen“ weitergeführt.
- **Bandtempo exakt.** Bisher brauchte ein Schnellband durch Rundung (10 × 0,1 < 1) einen Takt mehr: 1,82 statt 2 Items/s. Jetzt gilt ein Fortschritt ab 1 − 10⁻⁶ als angekommen: genau 2/s. Splitter und Überlauf-Tor liefen vorher fest mit 4/s, die Brücke mit 2/s.
- **Wrack-Pläne.** „In Ring 2–3 mit 30 % 2–5 Skizzen bzw. 1–3 Baupläne“ ist als Ring 2 → Skizzen, Ring 3 → Baupläne umgesetzt. Schon eingesammelte oder angebrochene Wracks bleiben, wie sie sind.
- **Testmodus** gibt weiterhin +1.000 (jetzt Ruhm) und füllt Pläne nur bis 50 auf.
- **IDs.** Die Schmelze heißt intern jetzt `schmelzofen`, der Bohrer Mk1 bleibt `bohrer`, das Schnellband bleibt `band2` (alte Bänder müssen nicht umgebaut werden). Neue IDs: `bohrer2`, `drahtzieherei`, `induktionsofen`, `graphitpresse`, `siliziumofen`, `assembler`, `pyrolyseofen`.
- **Geprüft** (headless mit dem echten Simulationscode und im Browser, beide `USE_WORKER`-Modi):
  - Jedes Rezept einzeln mit und ohne Strom über die Statistik gemessen: alle innerhalb ±10 % der Tabelle (Mikrochip 7,0–7,5/min wegen 8-s-Takt im 60-s-Fenster).
  - Splitter, Überlauf-Tor und Brücke hinter Fließband 1,00/s, hinter Schnellband 2,00/s.
  - Mehrheitsregel: halb Kohle/halb Eisenerz → Eisenerz; 3 Kalk + 1 Eisen → Kalkstein (ignoriert 1× Eisenerz); Strand ohne Erz → Quarzsand; Strand mit 1 Erzfeld → das Erz (ignoriert 3× Quarzsand).
  - Kette ohne Testmodus nur über Bau-Kommandos (Seed 4242): erste Skizze nach ~3, erste Eisenbarren nach ~9,5, Kupferverarbeitung nach ~13, erster Stahl und erster Bauplan nach ~17 Minuten Spielzeit (mit 4 Hütten, 3 Sägewerken, 9 Bohrern, 4 Schmelzöfen, Lagerhallen als Zwischenlager; ein Mensch braucht deutlich länger).
  - Alter v6-Stand mit Kohlemeiler, Holzkohle (Lager, Band, Laderaum, Route), Schmelze und Bohrer am Mast lädt korrekt.

## Skilltree, Kartieren, Über Bord (v8): Entscheidungen und Auffälligkeiten

- **Beispielbild fehlte.** Die Aufgabe nennt ein beiliegendes Beispiel, im Projekt war aber keine Datei hochgeladen. Der Baum folgt deshalb nur der Beschreibung (Pergament-Rahmen, dunkles Feld, goldener Schein in der Mitte, goldene rechtwinklige Linien).
- **Flüssigkeiten fehlen noch.** Den Ast „Flüssigkeiten“ gibt es (Kategorie-Knoten), er ist aber leer. Es gibt weder `dampf` noch Chemie- oder Erdöl-Gebäude.
  „Kesseltechnik“ (`kraftwerk1`, Wirkung `power: { kraftwerk: 0.25 }`) verlangt `dampf` und bleibt gesperrt. Der Baum zeigt dazu „Dampfkraft – folgt mit der Flüssigkeits-Technik“ (`TECH_PLANNED`).
  Die Wirkung `power` wird erst gelesen, wenn das Kraftwerk gebaut ist: Seine Stromerzeugung muss dann mit `mods(g).power.kraftwerk` (fehlt = 1) multipliziert werden.
- **Pyrolyse liegt im Ast Chemie**, sonst wäre Chemie leer. Ihre Voraussetzung „Montage“ (Verarbeitung) ist eine gestrichelte Querverbindung.
- **Elternknoten im Baum** = Voraussetzung im selben Ast mit der größten Tiefe. Alle übrigen Voraussetzungen sind Querverbindungen (gestrichelt, beim Hovern hervorgehoben).
  Einzelketten werden senkrecht ausgerichtet, damit die Linien gerade laufen. Ein Prüfskript stellt sicher: keine Überlappung von Knoten und Beschriftungen, jede Forschung genau einmal, jedes Blatt am richtigen Knoten, alle Gebäude abgedeckt.
- **Zeichnen nur bei Änderung.** Knoten, Linien und Beschriftungen liegen in einem zwischengespeicherten Bild. Das Pulsieren, der Hover-Pfad und die Gold-Animation laufen auf einer dünnen Ebene darüber, gedrosselt auf 100 ms und nur bei offenem Fenster.
- **Zoomstufen 0,6 / 0,8 / 1 / 1,4 / 2.** Unter 0,8 werden die Beschriftungen ausgeblendet, damit der ganze Baum lesbar bleibt. Gesperrte Symbole sind entsättigt, aber aufgehellt, damit man sie noch erkennt.
- **Upgrades wirken sofort.** `mods(g)` wird neu berechnet, sobald sich die Zahl der Forschungen ändert. Der vierte Laderaum wird bei allen Schiffen angehängt, auch bei fahrenden.
  „Vorratskammern“ verkürzt den Prüfabstand der Häuser auf 50 s (nie unter 5 s).
- **Testmodus** überspringt Forschungen, deren Voraussetzung es nicht gibt (also „Kesseltechnik“).
- **Kartieren** prüft nur Inseln, an denen sich gerade Nebel geändert hat. Die Küstenfelder jeder Insel werden einmal berechnet und an der Insel zwischengespeichert.
  Alte v7-Stände: Kontor-Inseln werden beim Laden ganz aufgedeckt, entdeckte Inseln mit genug Küste still als kartiert markiert (ohne Toasts).
- **Inselliste** zeigt neben den Kontor-Inseln die 12 nächsten entdeckten Inseln ohne Kontor (mit „kartiert“ oder Küstenanteil), damit die Liste in der unendlichen Welt kurz bleibt.
- **Über Bord:** Das Treibgut landet auf einem freien Meeresfeld neben dem Schiff. Ist keins frei, kommt die Ware zu einer Kiste daneben dazu.
  Damit das Schiff die Kiste nicht sofort wieder einsammelt, ist sie für dieses Schiff gesperrt, bis es mehr als 1 Feld entfernt ist (oder gezielt hingesteuert wird).
  Über Bord geworfene Ware zählt nicht in der Statistik; das spätere Einsammeln zählt wie andere Funde.
- **Einzeldatei.** `dist/tideworks.html` (bis Version 11 `tideworks.html`) entsteht beim Build zusätzlich zu `dist/index.html` (Plugin `singleFile` in `vite.config.js`) und läuft per Doppelklick mit Worker.
- **Geprüft** (headless mit dem echten Simulationscode und mit Playwright im Browser, beide `USE_WORKER`-Modi und `dist/tideworks.html` über file://):
  - Heimatinsel beim Start kartiert. Umrunden einer fremden Insel: Sie wird ab 70 % gesehener Küste kartiert, genau einmal.
  - Über Bord: Kiste neben dem Schiff, Sperre löst sich nach dem Wegfahren, mit „Funde einsammeln“ aus fährt das Schiff vorbei, gezielt angesteuert sammelt es ein, nach 300 s ist die Kiste weg. Speichern und Laden behalten Kisten, Kartierung und Schalter.
  - Alle Upgrades: Werte in `mods(g)` nach dem Erforschen (Lager 1.000, Kontor 250, 4 Laderäume à 60, Tempo +20 %, Bohrer und Fischer +20/30 %, Batterie 750, Häuser 50 s).
  - Skilltree: Tooltip, Klick → Detailspalte, Erforschen mit Animation und Toast, Punkt am Forschungs-Knopf, Mausrad, Ziehen, Zwei-Finger-Zoom, Bildschirmdichte 2, keine Konsolenfehler.

## Flüssigkeiten, Rohre, Dampfkraft, Chemie (v9): Entscheidungen und Auffälligkeiten

- **Rohre als eigene Ebene.** Rohre sind keine Gebäude, sondern eine Felderebene (`PipeLayer`, eine Zahl 1–3 je Feld). So passt ein Rohr unter Band, Splitter, Überlauf-Tor und Brücke,
  ohne dass Belegung (`bmap`), Logistik oder Abriss der Bänder davon wissen müssen. Rohre unter Gebäuden mit Grundfläche sind verboten, ebenso Gebäude auf Rohren.
- **Tanks sind Netzknoten.** Ein Tank gehört zum Netz der angrenzenden Rohre und verbindet sie miteinander. Zwei Tanks nebeneinander bilden ein Netz.
  Ein Netz nur aus Tanks hat 100/s Durchsatz und gilt als säurefest.
- **Gebäude leiten nicht weiter.** Pumpe, Kraftwerk, Reaktor usw. verbinden nur die Netze, die an sie grenzen, mit sich selbst. Zwei Flüssigkeits-Gebäude, die sich berühren, tauschen nichts aus: Dazwischen gehört ein Rohr.
- **Verbundene Netze mit verschiedenen Flüssigkeiten:** Beim Neuberechnen bleibt die Flüssigkeit mit der größeren Menge, der Rest ist weg. Säure verschwindet, wenn ihr Netz nicht mehr säurefest ist
  (z. B. weil ein Mk1-Rohr angeschlossen wurde). Beides ist bewusst einfach gehalten; „Netz leeren“ hilft beim Umbauen.
- **Durchsatz je Richtung.** Rein (Erzeuger → Netz) und raus (Netz → Verbraucher) sind je Takt für sich auf den Durchsatz begrenzt. Ein Mk1-Netz kann also 20/s aufnehmen und gleichzeitig 20/s abgeben.
- **Netz-Identität** zwischen Simulation und Spiegel ist der kleinste Feldschlüssel des Netzes (`rep`). Der Spiegel berechnet die Netze selbst aus Rohrebene und Gebäuden,
  der Snapshot liefert nur Inhalt und Durchfluss je `rep`.
- **Dampfkraftwerk** nimmt nur Brennstoff mit Brennwert ab 4 an (Holz, Kohle, Teer …), damit Kalk, Erz oder Pläne nicht im Kessel landen. Höchstens 10 Stück im Puffer, egal welche Sorte.
  Ist kein Speicher frei, läuft es nicht und verbraucht weder Wasser noch Brennstoff.
- **Multi-Bohrer** darf auf keinem Ölfeld stehen (auch nicht, wenn die Mehrheit etwas anderes ist), damit Öl immer der Saugpumpe vorbehalten bleibt.
- **Saugpumpe** zählt die Ölfelder unter ihrer Grundfläche, nicht die Mehrheit.
- **Geothermie** zählt Lavafelder unter der Grundfläche (mind. 2). Sie darf als einziges Gebäude auf Lava stehen; die übrigen Felder müssen bebaubar sein.
- **Pumpe** braucht ein Meeresfeld neben ihrer Grundfläche (Küste), nicht Süßwasser im Inneren.
- **Rückerstattung von Rohren 100 %** wie bei Bändern. Ein Rohr einer anderen Stufe auf ein vorhandenes Rohr zu ziehen ersetzt es und erstattet das alte.
- **Fässer** sind mit dem Komfort-Update gebaut (Abfüllanlage, Entleerer, siehe unten und README „Fässer“).
- **Statistik:** Für Flüssigkeiten heißt „erzeugt“ = ins Netz gepumpt, „verbraucht“ = aus dem Netz gezogen, „Produktion“ = was Pumpen und Reaktoren hergestellt haben. „Netz leeren“ zählt als verbraucht (Quelle „Netz geleert“).
- **Skilltree-Prüfung** (`npm run check:tree`, `tools/check-skilltree.mjs`) liegt jetzt im Projekt und prüft Knoten, Beschriftungen, Forschungen, Gebäude und Rezepte.
  Ergebnis v9: 31 Forschungen, 37 Blätter, keine Überlappungen.
- **Geprüft** (headless mit dem echten Simulationscode und mit Playwright im Browser, beide `USE_WORKER`-Modi und `dist/tideworks.html` über file://):
  - Pumpe → Rohr → Dampfkraftwerk mit Kohle: 12,0 Strom/s, mit Kesseltechnik 15,0 Strom/s; Silizium-Ofen (6) und Induktionsofen (4) laufen dauerhaft.
  - Rohr unter Band: Netz bleibt gleich, Durchsatz unverändert. Netz mit Mk1 und Mk3: 20/s statt 30/s (drei Pumpen). Wasser- und Ölnetz nebeneinander bleiben getrennt.
    Säure-Reaktor an Mk2: „Säure braucht säurefeste Rohre“, nichts fließt; nach Umbau auf Mk3 fließt sie.
  - Sandinsel: Saugpumpe auf 4 Ölfeldern (5/s) → zwei Reaktoren: 38 Kunststoff und 38 Schmiermittel in 120 s (Soll 40, Anlauf).
  - Vulkaninsel: Schwefel-Bohrer, Wasser → Säure über Mk3 → 14 Neodym in 120 s (Soll 15) → Supermagnete im Assembler.
  - Geothermie 30,0 Strom/s. Ingenieurhaus: 4 Schaltpläne in 151 s. Multi-Bohrer auf 9 Kalkfeldern: 3,242/s, Soll 0,3 × 9 × 1,2 (Bohrköpfe) = 3,240/s;
    ohne Wasser „Überhitzt“, ohne Schmiermittel „Braucht Schmiermittel“. Bohrer Mk2 geschmiert: Faktor 1,51.
  - Hochleistungsband mit Splitter und Brücke dazwischen: 4,00 Items/s.
  - Speichern/Laden: Rohre, Netzinhalt, Tank- und Gebäudepuffer gleich; Spiegel nach Snapshot und nach Rohrabriss gleich wie die Simulation.
    Ein echter v8-Stand (mit dem alten Code erzeugt) lädt ohne Verlust (Gebäude, Lager, Forschungen gleich).
  - Browser: Rohre ziehen, Band darüber, Abriss Band → Rohr, Umschalt nur Rohr, Ziehen beim Abriss; Neuladen behält alles; keine Konsolenfehler.

## Komfort-Update, Fässer, Rohrnetz-Schutz: Entscheidungen und Auffälligkeiten

- **SAVE_VERSION bleibt 9.** Neu im Spielstand ist nur `ui.statusView`, das beim Laden über die Vorgaben ergänzt wird. Eine Erhöhung hätte Stände für älteren Code unlesbar gemacht, ohne etwas zu gewinnen.
  Spieltempo, Undo-Stapel und Zwischenablage werden bewusst nicht gespeichert.
- **Blaupausen-Bibliothek** liegt getrennt vom Spielstand in IndexedDB (Schlüssel `blueprints`, Ersatz `localStorage` „tideworks.kv.blueprints“ (bis Version 11 „workscape.blueprints“)). Sie bleibt bei Neustart, Import und Laden erhalten.
- **Statusansicht:** Symbole ab Zoom 1 (wie in der Aufgabe), nicht erst ab Zoom 2. Ein Gebäude, das Strom braucht und an keinem Netz mit Erzeuger oder Batterie hängt, ist rot, auch wenn ihm zugleich Zutaten fehlen (sonst sähe ein unverkabelter Ofen nur „gelb“ aus).
- **Blaupausen platzieren:** Teile, die nicht passen (Feld belegt, falscher Boden, gesperrt, Rohrnetz-Schutz), werden übersprungen, der Rest wird gebaut; der Toast nennt Anzahl und Grund.
  Reihenfolge: Gebäude, Bänder, Rohre, Kabel. Ein Teil, das schon genauso dasteht, zählt als „Steht schon da“ und kostet nichts. Kontor und Werft werden nicht übernommen.
- **Strg+C im Speicher-Dialog** kopiert die Auswahl immer als Blaupause in die Zwischenablage (der Name ist vorausgewählt, ein Text-Kopieren wäre sonst verwirrend). Abbrechen behält die Auswahl.
  **Umschalt+V** öffnet die Bibliothek, V allein startet die Auswahl.
- **Undo-Semantik:** Bau rückgängig erstattet auch verbrauchte Baupläne; Abriss rückgängig zahlt genau die damalige Rückerstattung zurück (fehlt sie, wird abgelehnt). Rückgängig wird abgelehnt, wenn Ressourcen fehlen oder das Feld inzwischen belegt ist.
  Automatisches Verkabeln beim Bau wird nicht eigens aufgezeichnet, es passiert beim Wiederholen erneut.
- **Rohrnetz-Schutz** (`netGuard`): Leere Netze dürfen frei verbunden werden; gefüllte mit verschiedenen Flüssigkeiten nicht, Säure nicht in nicht säurefeste Rohre. Beim Ziehen gibt es nur eine Warnung je Zug.
- **give()** in der Konsole legt Waren auf die Insel unter der Kamera (vorher immer die Heimatinsel).
- **Geprüft** (headless und Playwright, beide `USE_WORKER`-Modi, Dev-Server und `dist/tideworks.html` über file://):
  - Tempo: Pause dt 0, 3× Rate 3,02, 1× Rate 1,0; Kommandos laufen in der Pause.
  - Pipette auf Ofen mit Glas-Rezept; 20 Bänder aufgewertet mit Items darauf, dazu Undo/Redo; Hütte → Bürgerhaus behält Baupläne.
  - Undo/Redo von gezogenen Strecken, Aufwerten, Reaktor-Rezept mit Puffer; Ablehnung bei fehlenden Ressourcen und belegtem Feld.
  - Rohrnetz-Schutz: Mischen, Säure an Mk1, Mk3 an Mk1-Netz, leere Netze frei, eine Warnung je Zug, Prüfung beim Aufwerten.
  - Fässer: Werkzeugmacher → Fass, Abfüllanlage Wasserfass, Entleerer mit Säure-Status und Wasser ins Netz, Ölfässer per Schiff laden und entladen.
  - Blaupausen: Speichern, Bibliothek, gedreht auf anderer Insel platziert, Undo, Zwischenablage, nach Neuladen noch da, Code-Import, kaputter Code gibt einen Toast.
  - Statusansicht rot/gelb, Tastenkürzel-Fenster, Speichern/Laden v9 (statusView ohne Feld = aus, Undo-Stapel nach Laden leer).

## Spieltest-Runde 1 (v10): Entscheidungen und Auffälligkeiten

- **SAVE_VERSION 10** (`migrate9` in `save/serialize.js`). Das alte 2×2-Kontor wird nicht automatisch versetzt, weil auf der Heimatinsel oft kein Platz für 3×3 plus Steg ist:
  Es bleibt als `kontoralt` voll funktionsfähig (altes Inventar, alter Anleger) mit Warnung und Knopf „Kontor verlegen“. Lagerhallen werden Lagerkisten mit leerem eigenem Bestand,
  das Inselinventar wird dabei **nicht** gekürzt (die alte Lagerhalle erhöhte nur die Kapazität; die Mengen bleiben, solange sie nicht verbraucht werden).
  Lager-Ausgaben entfallen ersatzlos, ein Dialog nach dem Laden nennt die Anzahl. Getestet mit einem echten v9-Stand.
- **Nur Extraktoren holen aus Speichern.** Häuser, Bauen, Forschung und Schiffbau zahlen weiter direkt aus dem Hauptkontor (Inselinventar). Kisten und Handelskontore zählen nicht zum Inselinventar.
- **Ziel 2** ist jetzt „Extraktor bauen“ (statt Lagerhalle), Ziel 1 „Holz per Band ins Kontor“. Bereits erfüllte Ziele werden wie bisher still nachgezogen.
- **Routen** speichern die Kontor-ID; wird ein Kontor abgerissen, bleibt der Stopp stehen, heißt „Kontor fehlt“ und wird übersprungen.
- **Auto-Kreuzung/Brückenband beim Ziehen:** quer über ein gerades Band → Kreuzung; über andere Hindernisse (Gebäude, Wasser, Berg, Lava; Lücke höchstens `BELT_BRIDGE.range`) → Brückenband-Paar.
  Passt beides nicht, endet die Strecke vor dem Hindernis. `beltObstacle`/`crossable` liegen dafür jetzt in `sim/logistics.js` (aus `sim.js` re-exportiert).
- **Durchsatz-Anzeige** braucht mindestens einen Statistik-Eimer (`IO_WINDOW.bucket`) Messzeit, sonst wurden kurz nach dem Bau zu hohe Raten angezeigt.
- **Schriften vorher/nachher:** `--muted` #86684a → #6b5034 (Kontrast auf `--parch` 4,5 → 6,6, auf `--parch2` 4,0 → 5,8), `.xs` 11,5 → 12 px; Zahlen, Raten, Kosten, Tasten und kleine Beschriftungen
  Pixelify Sans → Nunito 800 mit `tabular-nums`; Pixelify nur noch für Überschriften ab 15 px. Routen-Beschriftung auf der Karte Nunito 800 14 px.
- **Farben:** Eisenerz rostrot mit dunklen Adern, Kupfererz graugrün mit Türkis, Eisenbarren kühles Blaugrau (Symbol, Bodenvorkommen `ORE_RAMP`, Kistenfarbe `ITEM_COL`).
- **Entdecker** ist hinter Kartografie gesperrt; „Selbst erkunden“ sucht per Breitensuche über aufgedecktes Meer (`EXPLORE`) und pausiert nach erfolgloser Suche. Ein Schiff mit eigener Route erkundet nicht.
- **Undo, Pipette, Statusansicht, Blaupausen:** Extraktor (Ware), Tor (Zustand, Automatik), Steg-Richtung und Brückenband-Enden werden übernommen; Hauptkontor und Handelskontor nicht in Blaupausen (wie Kontor/Werft bisher).
- **Geprüft** (headless mit dem Simulationscode und Playwright, beide `USE_WORKER`-Modi, `dist/index.html` und `dist/tideworks.html` über file://, ohne Konsolenfehler):
  - Neue Welt: Hauptkontor 3×3 mit Steg und Laterne, Band liefert an drei Seiten, Extraktor holt Holz aufs Band, Lagerkiste und Handelskontor (Steg-Vorschau, R dreht) mit eigenem Bestand.
  - Ziehen quer über ein Band erzeugt eine Kreuzung; Brückenband-Schiene sichtbar; Tor schließt mit G und staut; Mast-Vorschau mit Reichweite.
  - Soll/Ist und Einmalig in Statistik und Inventar, Strom-Tab, Brennwert-Tabelle der Verbrennung, „Weitere Speicher“.
  - Werft baut Entdecker, „Selbst erkunden“ fährt los und deckt auf. Kontor verlegen behält Inventar und Routen.
  - v9-Stand importiert: Hinweisdialog, `kontoralt` mit Warnung, Kisten statt Lagerhallen, Routen auf Kontor-ID. `npm run check:tree` grün (34 Forschungen, 44 Blätter, keine Überlappungen).

## Endgame (v11): Münzen, Handel, Leuchtturm, Ereignisse, Drohnen – Entscheidungen und Auffälligkeiten

- **SAVE_VERSION 11** (`migrate10`): alte Stände laden mit 0 Münzen, leerem Markt, ohne Händler, Aufträge und Ereignisse. Getestet: v11-Stand mit sechs laufenden Ereignissen gespeichert und neu geladen, alle laufen mit derselben Endzeit weiter.
- **Münzen sind ganze Zahlen** und kein Item. Jede Buchung trägt einen Posten; das Münzbuch (30-s-Eimer, 60 min) speist Tooltip und Statistik-Reiter. Zusätzliche Posten gegenüber der Vorgabe: „Ziele“ (Münzen für die Endgame-Ziele), „Forschung“ (Leuchtturm-Forschung 2.000) und „Test“.
- **Händler** liegen in `state.trade.list`, getrennt von den Spielerschiffen (keine Kollision mit Routen, Flotte, Auswahl). Der Handel passiert in dem Moment, in dem der Händler anlegt; die 20 s Liegezeit sind danach nur noch sichtbar.
  Händler fahren den Hinweg zurück (kein zweites A*). Der Anleger ist `_tdock`, nicht `_dock`, damit der Handelsposten nicht als Hafen für Spielerschiffe zählt.
- **Preise sind weltweit** (ein Markt für alle Inseln). Verkaufs- und Kaufaufträge laufen in Teilgeschäften zu 10 Stück, damit der Mindest-/Höchstpreis mitten im Besuch greifen kann.
  Kaufaufträge kaufen höchstens bis zur Lagerkapazität. Aufträge sind je Insel, die Reihenfolge ist die Ausführungsreihenfolge.
- **Fernhändler:** `needRing` prüft, ob irgendwo ein Kontor auf einer Insel ab Ring 2 steht; er besucht dann alle Handelsposten (auch die Heimatinsel). Sein Angebot wird beim Erscheinen gewürfelt (Seed + Zähler) und mit dem Kauf verringert.
- **Leuchtturm:** nach Beginn der ersten Phase nicht mehr abreißbar (sonst gingen bezahlte Phasen verloren); nicht in Blaupausen. `mods(g)` hängt jetzt am Forschungsstand **und** an der Leuchtturm-Phase (Cache-Schlüssel).
  Der Testmodus gibt jetzt 100 statt 50 Pläne je Sorte, sonst reichen die Schaltpläne nicht für Phase 4 plus Drohnenhafen.
- **Ereignisse** nutzen die Spielzeit (`state.time`), nicht die Uhrzeit. Debug-Ereignisse (`tideworks.event`) starten sofort und laufen auch bei „aus“ weiter; „aus“ streicht nur geplante, noch nicht laufende Ereignisse.
  Ohne passenden Ort (z. B. keine Vulkaninsel mit Gebäuden) wird ein Ereignis nicht geplant; über Debug fällt es auf die erste Kontor-Insel zurück (dann ohne Lava, also ohne Schäden).
  Treibgut eines Treibgutfelds trägt die Ereignis-ID und verschwindet am Ende. Beschädigte Gebäude überspringen ihren Takt und nehmen nichts vom Band an.
- **Drohnen** reservieren nichts gespeichert: offene Mengen ergeben sich aus den fliegenden Drohnen. Nach dem Laden kehren Drohnen ohne gültiges Ziel zum Hafen zurück. Ladung einer Drohne, deren Ziel verschwindet, kommt ins Inselinventar.
- **Neue Debug-Funktionen:** `tideworks.event(id, warn)`, `tideworks.coins(n)`, `tideworks.trader(kind, isl)`, dazu `tideworks.damage(id)` und `tideworks.mods()` für die Abnahme.
- **Geprüft** (headless mit dem Simulationscode, Playwright in beiden `USE_WORKER`-Modi über den Dev-Server und `dist/tideworks.html` per file://, ohne Konsolenfehler):
  - Verkauf „Holz über 200“: Hafenhändler kommt, legt an, 200 Holz für +417 Münzen, Ankaufpreis fällt (Sättigung 0,2) und erholt sich mit 2 %/min.
  - Glas-Kauf mit Höchstpreis 15: kauft nur bis Kapazität bzw. bis der Preis über 15 steigt (headless: Stopp nach 80 Stück), nur mit genug Münzen.
  - Fernhändler: vor einem Ring-2-Kontor kein Termin, danach aktiv; drei Besuche mit drei verschiedenen Angeboten (3–4 Einträge).
  - Leuchtturm im Testmodus: alle 4 Phasen, Wirkungen über `tideworks.mods()` gemessen (reveal 1 → 1,5; tradeFreq +0,2; prod 1 → 1,1; tradePrice +0,1; evWarn 60; Drohnen je Hafen 8 → 10; powerAll 1,15; beam), Abschlussfenster, Lichtstrahl nachts.
  - Alle sechs Ereignisse über `tideworks.event(id)`; „aus“ setzt keinen neuen Termin; Speichern während der Ereignisse und Neuladen setzt sie fort.
  - Drohnen: Anbieten-Kiste (per Extraktor mit Eisen gefüllt) und Anfordern-Kiste ~15 Felder entfernt; 30 Eisen geliefert, bis 8 Drohnen gleichzeitig in der Luft, Strombedarf des Hafens steigt dabei von 2 auf 10/s; ein beschädigtes Sägewerk reparieren die Drohnen nach ~2 s.
- **Leistung** (Worker-Modus, headless Chromium mit Software-Rendering, 1400×860, Messung 3 × 5 s):
  200 Gebäude (4 Drohnenhäfen, 36 Werkzeugmacher, Verbrennung, Masten, Bänder), 32 Drohnen gleichzeitig in der Luft (Reparaturlast), 3 Händler, laufender Sturm:
  **41–45 Bilder/s** gleichmäßig über alle drei Messungen, Zeichnen im Mittel 1,9–2,0 ms je Bild (Spitze 16 ms beim Neuaufbau eines Chunk-Bilds).
  Zum Vergleich eine frische Welt in derselben Umgebung: 55–57 Bilder/s, 0,8–1,0 ms. Das Zeichnen selbst braucht nur ~1 ms mehr; woher der übrige Abstand kommt (Snapshot mit 200 Gebäuden, Oberfläche, Software-Rendering), ist nicht einzeln gemessen. Auf einem Rechner mit GPU dürften beide Werte höher liegen.

## Spieltest-Runde 2: Tideworks (Version 12)

- **Umbenennung.** Datenbank `tideworks` statt `workscape`. Die alte Datenbank wird beim ersten Start gelesen, als „Spielstand 1“ geschrieben und erst danach gelöscht; schlägt das Schreiben fehl, bleibt sie liegen und der nächste Start versucht es erneut. Ebenso localStorage `workscape.factory.v2` und `workscape.blueprints`.
  Ein schon übernommener Stand (Feld `from: 'workscape'` in den Metadaten) wird nicht doppelt angelegt.
- **Demo im selben Host.** Der Titelbildschirm nutzt dieselbe Simulation wie das Spiel (Nachricht `demo`), aber eine eigene Welt, die nie gespeichert wird. „Neues Spiel“ (`new`) und „Laden“ (`load`) ersetzen sie. Der Client zählt Welten (`worldReq`/`worldGot`), damit ein später Snapshot der Demo nicht in das neue Spiel gerät.
  Die Demo ist vorab 75 s gelaufen, damit Bänder und Lager beim ersten Bild schon gefüllt sind. Die beschleunigte Tageszeit betrifft nur die Darstellung (`state.time × DEMO.day`).
- **Spielzeit** zählt nur, wenn das Spiel läuft (nicht pausiert, Seite sichtbar, kein Menü). Das Vorschaubild wird höchstens alle 30 s neu gerendert (Minimap der Heimatinsel als PNG, 96×72).
- **Pausenmenü hält die Simulation an** und stellt danach das vorige Tempo wieder her (auch eine vorher gesetzte Pause).
- **Markt auf K.** M ist jetzt die Kartenansicht; Knopfleiste, Tastenkürzel-Liste, Tooltips und die Beschreibung des Handelspostens nennen K.
- **Kartenansicht** zeichnet Chunks als kleine Bilder (Cache von 48), nur aufgedeckte Felder. Funde erscheinen nur in Chunks, die schon teilweise aufgedeckt sind (sonst würde die Karte sie verraten).
- **Entdecker.** Unerreichbare Ziele (kein Seeweg) werden je Schiff im Arbeitsspeicher gemerkt, damit er nicht ständig dasselbe Ziel versucht; nach dem Laden wird neu gesucht. „Umgebung erkundet“ wird nur einmal gemeldet, bis sich die Reichweite ändert oder wieder etwas zu entdecken ist.
- **Brückenband-Tempo.** Der Takt nimmt den Rest der vorigen Ausgabe mit; sonst kamen statt 2 und 4 nur 1,85 und 3,35 Items/s an.
- **Scrollposition.** Statt `innerHTML` wird abgeglichen (siehe README). Die Sperre unter der Maus ist auf 2,5 s begrenzt, damit sich etwa ein offenes Statistikfenster nicht dauerhaft „einfriert“. Wechselt die Auswahl im Info-Panel, wird neu aufgebaut (beginnt oben).
- **Koop** war hier nur ein Platzhalter; seit Version 13 siehe „Koop (Version 13)“.
- **Geprüft** (headless mit dem Simulationscode und Playwright in beiden `USE_WORKER`-Modi über den Dev-Server sowie `dist/tideworks.html` per file://, ohne Konsolenfehler):
  - Ein mit dem alten Code erzeugter v11-Stand in IndexedDB `workscape` und einer in localStorage erscheinen als „Spielstand 1“ (v12, Ziel und `gdone` richtig, Blaupausen übernommen), die alte Datenbank ist danach gelöscht.
  - Titel mit Demo, Neues Spiel mit Seed 12345, Pausenmenü (Esc), Kartenansicht (M), Hauptmenü speichert, Liste „Spiel laden“ mit Vorschaubild.
  - WASD: mit Umschalt genau dreimal so weit in derselben Zeit (z. B. 181 → 542 bzw. 271 → 813 Weltpixel in 0,5 s, je nach Bildrate beim Anfahren).
  - Brückenband 1,00 / 2,00 / 4,00 Items/s mit Band Mk1/Mk2/Mk3 als Zulauf; Sortierer normal und umgekehrt, auch mit blockierter Seite; Einstellung über das Panel gesetzt.
  - Entdecker bleibt in der Reichweite, meldet bei kleiner Reichweite „Umgebung erkundet“ und fährt zum Anleger; Reichweiten-Schalter im Panel.
  - Kraftwerk mit voller Batterie (750/750): läuft weiter, 15/s erzeugt, 15/s verworfen.
  - Neues Spiel: Dampfkraft erst nach Stahl, kein Extraktor-Ziel; `npm run check:tree` OK.
  - Reaktor-Panel ganz nach unten gescrollt: bleibt über mehrere Sekunden stehen, mit und ohne Maus darüber.


## Koop Teil 1 (Version 13): Entscheidungen, Messungen, Tests

- **Eigene Peer-IDs statt Server-IDs.** PeerJS holt sich sonst per HTTP eine ID vom Dienst; das scheitert aus file:// (CORS). Host = `tideworks-` + Lobby-Code, Mitspieler = `tideworks-c-<Spieler-ID>-<Zufall>`. Ist der Code zufällig schon vergeben, wird ein neuer gewürfelt.
- **Datenkanal `serialization: 'raw'`** mit eigenem Format (`net/protocol.js`): JSON plus Typed Arrays als Binärblöcke, deflate ab 400 Byte, Stücke zu 16 KB (Browser begrenzen die Nachrichtengröße). Die Snapshots packt und komprimiert schon der Worker, der Hauptthread des Hosts reicht nur Bytes weiter.
- **Host-Hauptthread ist nicht der Takt.** Die Simulation und die 10-Hz-Snapshots laufen im Worker (Timer dort werden im Hintergrund nicht gedrosselt). Ping, Zeiger-Verteilung und Zeitüberwachung laufen im Hauptthread; werden dessen Timer im Hintergrund gedrosselt, kommen nur die Zeiger des Hosts seltener, Eingänge werden trotzdem sofort verarbeitet.
- **Mitspieler-Simulation ruht** (`idle`: leere Welt). Nachrichten der eigenen Simulation verfallen, solange der Spiegel aus dem Netz kommt; Kommandos ohne Welt (z. B. `inspect` beim Start) werden ignoriert.
  Die Weltzählung (`worldReq`/`worldGot`) beginnt beim Beitritt neu, sonst konnte eine noch nicht angekommene Demo-Welt den Spielstart des Mitspielers blockieren (gefunden mit dem Beitritts-Link direkt nach dem Laden).
- **Wiederverbinden ohne Rückfrage**, wenn dieselbe Spieler-ID mit `re` kommt, auch wenn der Host den Abbruch noch nicht bemerkt hat. Ein neuer Beitritt derselben ID nach „Sitzung verlassen“ fragt den Host dagegen wieder.
- **„… erlaubt kein Abreißen seiner Gebäude“** steht so wie gewünscht im Text (auch bei Spielerinnen).
- **Lobby-Vorgabe „Abreißen erlauben“** gilt beim Start für alle (auch den Host); danach stellt jeder selbst im Pausenmenü um (Kommando `setOpt`). Beim Fortsetzen eines Koop-Stands bleiben die gespeicherten Einstellungen.
- **„Spiel laden“ ist im Koop-Pausenmenü auch beim Host aus**, damit die Mitspieler nicht plötzlich in einer anderen Welt stehen.
- **Rundung** auf drei Nachkommastellen beim Packen und beim Vergleichen (`views.js`), damit Kleinständerungen keinen Verkehr erzeugen. Zähler, die sich jeden Takt ändern (`stats`, `RT`), gehen nur mit der Statistik einmal je Sekunde mit.
- **Schiffe feldweise.** Vorher gingen alle Schiffe jedes Mal ganz mit (≈ 500 Byte je Snapshot bei einem Schiff mit Route); jetzt nur geänderte Felder (Lage, Fortschritt), die Liste der IDs nur nach Änderung.

### Datenmenge je Mitspieler (gemessen)

Headless mit dem Simulationscode: Demo-Fabrik mehrfach nachgebaut plus Häuser und Bänder = **205 Gebäude** (151 Bänder, Bohrer, Schmelzöfen, Kraftwerke, Sortierer, Brückenbänder, 21 Häuser, ein Schiff auf Route),
10 Snapshots/s, gepackt und komprimiert wie im Spiel, Spiegel nach jedem Lauf mit dem Host verglichen (Gebäude, Schiffe, Inventar gleich):

| Kamera des Mitspielers | world-Nachricht | erster Snapshot | danach |
|---|---|---|---|
| über der Fabrik (40 × 25 Felder) | 1,8 KB | 4,7 KB | **4,3 KB/s** (Ø 444 Byte, max. 968 Byte je Snapshot) |
| ganze Fabrik im Blick (140 × 90 Felder) | 1,8 KB | 4,9 KB | **3,5 KB/s** |
| weit weg (nichts im Blick) | 1,8 KB | 4,2 KB | **2,3 KB/s** |

Dazu kommen Zeiger/Vorschau der anderen (10/s, je ≈ 60–120 Byte) und Ping (1/s). Im Browser (zwei Chromium-Fenster, lokaler PeerServer, 203 Gebäude, Kamera über der Heimatinsel) kamen beim Mitspieler insgesamt **2,5–3,2 KB/s** an,
über eine ganze Sitzung mit Lobby, Bauen und Testmodus im Schnitt 2,4–4,0 KB/s (`tideworks.net()`). Ziel war < 30 KB/s. Bildrate des Mitspielers dabei 60 Bilder/s.

### Geprüft

Playwright mit zwei getrennten Browser-Profilen, **lokaler PeerServer** (`peer` 1.x auf 127.0.0.1:9000), über den Dev-Server und über `dist/tideworks.html` per file://, ohne Konsolenfehler:
- Lobby gründen (neue Welt), Code `TIDE-XXXX`, Beitritt mit Code in Kleinbuchstaben ohne Bindestrich und über den Link `#join=…` (öffnet „Beitreten“ mit Code), Lobby-Chat, Spieler mit Ping, Spiel starten.
- Versionsprüfung (`fakeVersion`): „Ihr nutzt verschiedene Versionen von Tideworks.“ beim Mitspieler, Systemzeile beim Host, kein Beitritt.
- Vermittlung blockiert (`blockPeer`): Host-Lobby ohne Code mit offenem „Manuell verbinden“, Beitritt per Code meldet „nicht erreichbar“ mit Link zu „Manuell verbinden“, Codes `TWO-…`/`TWA-…` (≈ 580 Zeichen) getauscht, Spiel läuft.
- Beide bauen gleichzeitig; `by` stimmt bei beiden; Vorschau des Mitspielers bis zur Bestätigung; Strg+Z (Kommando `undo`) nimmt nur eigene Bauten zurück; Abriss eines fremden Gebäudes bei verbotenem Abreißen → „Lena erlaubt kein Abreißen seiner Gebäude.“; Mitspieler-Kommando `coins` bleibt ohne Wirkung.
- Testmodus des Hosts: Forschung (40) und Münzen (50.000) bei beiden gleich.
- Host-Pause: Mitspieler „Pausiert“ und entsättigt; Leertaste und Tempo-Knöpfe beim Mitspieler wirkungslos (gesperrt). Host-Tab versteckt (visibilitychange) und Host-Pausenmenü offen: Spielzeit beim Mitspieler läuft weiter.
- Pausenmenü: Host mit Code, Spielern, „Das Spiel läuft weiter …“; Mitspieler ohne Speichern/Laden/Testmodus/Ereignisse, „Sitzung verlassen“.
- Chat im Spiel (Enter, Text, Enter), Markierung per Alt+Klick und per mittlerer Maustaste, bei beiden sichtbar; Randpfeile bei weggefahrener Kamera, Klick fährt hin.
- Mauszeiger mit Namen und Bauvorschau (Band, Spielerfarbe) des Mitspielers beim Host.
- Mitspieler verlässt die Sitzung → „Lena hat das Spiel verlassen.“; tritt wieder bei → Host fragt „Lena möchte beitreten“, nach Zulassen gleiche Farbe, Gebäude noch da.
- Hartes Trennen (`netDrop`) beim Mitspieler → Hinweis „Verbindung wird wiederhergestellt …“, nach ≈ 1 s wieder verbunden, ohne Rückfrage beim Host. Mitspieler-Tab hart geschlossen → Host zeigt nach 10 s „Verbindung verloren“.
- Host beendet (Hauptmenü) bzw. Host-Tab weg → Mitspieler im Titelbildschirm mit „Der Host hat das Spiel beendet.“, Demo läuft.
- Koop-Spielstand: in „Spiel laden“ mit „Koop“, Spielern und Modus; „Koop-Spielstand fortsetzen“ → Mitspieler tritt bei, seine Gebäude (`by`) und Farbe sind da, Rückgängig-Stapel leer.
- Einzelspieler unverändert: Neues Spiel, Bauen, Pausenmenü hält an, Tab versteckt hält an, Enter/Alt+Klick ohne Wirkung, Speichern und Fortsetzen nach Neuladen (Gebäude mit `by: 'host'`). v12-Stände laden verlustfrei (headless: Gebäude, Inventar, Forschung gleich, `players.host`, `mode: 'shared'`).
- `npm run build` und `npm run check:tree` ohne Fehler.

**Nicht geprüft:** der echte PeerJS-Dienst `0.peerjs.com` und die öffentlichen STUN/TURN-Server. Aus der Testumgebung sind sie gesperrt (Proxy 403), deshalb liefen alle Tests gegen einen lokalen PeerServer derselben Bauart und die manuelle Verbindung.
Ebenfalls nicht geprüft: mehr als 2 Spieler gleichzeitig, echte Netze mit NAT (beide Fenster liefen auf einem Rechner), Firefox/Safari.

## Koop Teil 2 (Version 14): Getrennte Inseln – Entscheidungen, Messungen, Tests

- **Host-Werte bleiben oben in `state`.** Forschung, Ruhm, Münzen, Ziele, Leuchtturm usw. des Hosts stehen weiter in `state.*`, die der Mitspieler in `state.players[pid].st` (`pst(g, pid)`).
  So bleiben Einzelspieler und „Gemeinsame Insel“ Zeichen für Zeichen gleich: ein Vergleichslauf (gleiche Kommandos in v13 und v14, Einzelspieler, Gemeinsame Insel, Demo-Fabrik) ergibt identische Spielstände (ohne `v` und `ui`).
- **Spiegel sind immer „ein Spieler“.** Der Snapshot an jeden Mitspieler legt dessen eigene Werte oben in `state` ab; `pst`, `mods`, `fogOf` geben auf dem Spiegel (`m.mirror`) einfach `state` bzw. `fog` zurück. Die Oberfläche brauchte deshalb kaum Änderungen.
- **Schiffsfelder `wi`/`wp`** (wartet auf Erlaubnis) werden nur bei Getrennten Inseln gesetzt und sonst gelöscht statt auf `false`/`null` gesetzt, sonst unterschieden sich die Spielstände von v13.
- **Erlaubnis je Route und Kontor** mit Prüfsumme der Aufträge an diesem Kontor (`sig`): Wer die Route nur an eigenen Stopps ändert, muss nicht neu fragen. „Ablehnen“ bleibt stehen, bis sich die Aufträge ändern (dann wird neu gefragt).
- **Handel an Preislisten ohne Rückfrage** (Wunsch aus der Aufgabe). Der Käufer zahlt höchstens, was er hat; der Verkäufer gibt nie mehr ab als „Menge, die bleiben soll“ erlaubt, und kauft nie über „bis Bestand“.
- **Gründungs-Wettlauf**: Die Simulation arbeitet Kommandos der Reihe nach ab, „gleichzeitig“ heißt also: Das andere Kontor ist jünger als 30 s (`FOUND_RACE.recent`). Dann kommt „Gerade von <Name> besiedelt“, sonst „Diese Insel gehört <Name>“. Das Holz bleibt in beiden Fällen an Bord.
- **Debug `giveShip`** gibt das Schiff bei Getrennten Inseln dem Besitzer des Kontors (sonst bekäme der Host Schiffe auf fremden Inseln). `give` geht weiter an jede Insel (nur Host).
- **Fehler aus früheren Versionen nebenbei behoben**: Die Flotte ohne Schiffe nannte „0 Laderäume zu je 0 Items“ (Upgrade-Werte statt Grundwert + Upgrade).
- **Umrisse fremder Inseln** auf Minimap und Karte als Ellipse um die Insel (Mitte, Radius aus der Welt-Erzeugung), nicht als echte Küstenlinie: billig zu zeichnen und gut erkennbar.
- **Leuchtturm-Anzeige** erscheint erst, wenn jemand Phase 1 hat oder man den Leuchtturm erforscht hat, damit die Leiste am Anfang nicht voller wird.
- **Lobby** zeigt die Plätze erst ab Spielbeginn (vorher sind Mitspieler noch keinem Platz zugeordnet); der Status zeigt „x von y Spielern“.

### Datenmenge je Mitspieler (gemessen)

- Headless (`npm run check:coop`): 200 + 200 Bänder, Kamera auf der eigenen Insel: **0,8 KB/s** an den Mitspieler.
- Browser (zwei Chromium-Profile, lokaler PeerServer, Dev-Server): Host 312 und Mitspieler 236 Bänder, ein Schiff auf Route zwischen beiden Heimatinseln, Kamera auf der Heimatinsel:
  beim Mitspieler **2,4 KB/s** insgesamt (`tideworks.net().kbIn` über 10 s), Host-Seite 2,4 KB/s an Bea. Ziel war < 30 KB/s.

### Geprüft

Playwright mit zwei getrennten Browser-Profilen und lokalem PeerServer, ohne Konsolenfehler:
- Lobby gründen mit *Getrennte Inseln* und 2 Plätzen, Beitritt per Code, „2 von 2 Spielern“, Spiel starten; beide haben eine eigene Heimatinsel (Platz 1 und 2), Namen „Heimatinsel“ / „Maxs Heimatinsel“ bzw. „Beas Heimatinsel“.
- Mitspieler baut auf der Host-Insel → „Diese Insel gehört Max.“, nichts entsteht. Fremdes Hauptkontor beim Mitspieler ohne Bestand und Puffer; Info-Panel „Gehört Max“, nur lesen.
- Route des Mitspielers zum Host-Hauptkontor: Hinweis beim Host, Eintrag unter „Flotte → Anfragen“, Status „Wartet auf Erlaubnis von Max“; „Erlauben“ geklickt → erscheint unter „Erlaubte Routen“, Route fährt.
- Testmodus: Leuchtturm-Anzeige oben mit beiden Spielern. Markt, Reiter „Spieler“. Minimap und Karte mit Umriss der fremden Insel in Spielerfarbe.
- Dritter Spieler bei 2 Plätzen → „Diese Welt ist voll (2 Spieler).“
- Speichern, Hauptmenü, „Koop-Spielstand fortsetzen“ (Liste: „Getrennte Inseln · 2/2 Spieler“), Mitspieler tritt wieder bei: gleiche ID, gleicher Platz, alle 548 Gebäude, Münzen, Schiff mit erlaubter Route.
- Headless (`check:coop`): Plätze 1–3 und Nachzügler, Forschung wirkt nur beim Forschenden (Bessere Segel), fremde Schiffe nicht steuerbar, Erlaubnis fragen/überspringen/erlauben/neu fragen/ablehnen,
  Preislisten (Münzgrenzen, „bis Bestand“, nicht gelistete Waren, Münzbuch beider Seiten), Datenschutz der Snapshots für Mitspieler und Host, Welt voll und Wiederkehr, erster Leuchtturm (+2000 Ruhm, Abzeichen), Speichern/Laden.
- v13-Stände (Einzelspieler und Gemeinsame Insel) laden mit v14 und laufen weiter. `npm run build`, `check:tree`, `check:world`, `check:coop` ohne Fehler.

**Nicht geprüft:** 3–4 Spieler gleichzeitig im Browser (headless mit 3 Plätzen geprüft), ein echter eigener TURN-Server (die Einstellung wird gespeichert und an erster Stelle eingetragen; die Verbindungsart zeigte im Test „direkt“),
der echte PeerJS-Dienst (wie in Version 13 aus der Testumgebung gesperrt).

## Freischalt-System (Version 15) – Entscheidungen, Tests

Aufgabe: Jedes Gebäude bekommt genau eine Freischalt-Quelle (Start, Forschung, Volk mit Rufstufe, Story), Schnittstelle für spätere Story- und Ruf-Schritte, Baumenü mit Hinweis, Koop-tauglich, Migration, Debug „Alles freischalten“. Grundlage `docs/SYSTEMS.md` Abschnitt 1, `docs/PLAN.md` Thread 2 und Abschnitte 4–5.

- **Eine Tabelle, zwei Orte.** Forschung bleibt als `tech` an Gebäude, Schiffsart und Rezept (Skilltree, Prüfskript und alte Spielstände arbeiten damit), alles andere steht in `data/unlocks.js` (`UNLOCKS`, `PLANS`). `srcOf(key)` fasst beides zusammen; `unlockErrors()` (auch in `check:tree`) meldet ein Gebäude mit zwei Quellen.
- **Abweichungen von SYSTEMS.md 1** (aus dem Plan übernommen): Hütte, Fischerhütte, Bohrer Mk1 sind Start (sonst keine Skizzen und kein Erz, also nie Forschung). Lagerkiste ist Start statt früher Forschung (die „Lagerhalle“ gibt es nicht mehr). Extraktor ist frühe Forschung (Bandtechnik) statt Ole, weil er der einzige Weg aus einem Speicher ist. Schnellband, Rohre, Pumpen bleiben Forschung mit Plan von Brann als Voraussetzung (Entscheidung 4).
- **Handelskontor** stand in keiner Tabelle. Es hängt jetzt am Schiffbau (gehört zum Hafen, braucht ohnehin Eisen).
- **Frühe Forschungen sind neu:** Ofenbau (2 Skizzen + 30 Holz), Bandtechnik (2 Skizzen + 40 Holz), Schiffbau (4 Skizzen + 20 Eisenbarren, nach Ofenbau). Kupferverarbeitung und Handwerk verlangen den Ofenbau, Kartografie, Hafenspeicher, Größere Laderäume und Bessere Segel den Schiffbau, damit der Baum der Reihenfolge im Spiel folgt.
- **Ingenieurwesen hinter Aurels Plan** (Entscheidung 8, „bessere Häuser“). Folge: Schaltpläne, Supermagnete, Drohnen und Multi-Bohrer brauchen Aurel. Für den Leuchtturm sind sie nicht mehr nötig (Story-Quelle), deshalb verletzt das die Regel „nichts nur bei Aurel ist Pflicht“ nicht. Beim Festlegen der Leuchtturm-Stufen beachten.
- **Rufstufen und Plan-Zuordnung sind Platzhalter** (neutral/freundlich/vertraut). Thread 4 legt den Ruf fest und ruft dann `unlock(g, key, 'npc')`.
- **Räucherei und Kogge** sind noch nicht gebaut (neue Ware, neues Rezept, neue Schiffsart). Sie kommen mit dem Handel; das System kann `ship:kogge` und `rc:<id>` schon.
- **Getrennte Inseln** bleiben wie in Version 14 spielbar: Volk-Quellen gelten als frei, keine Pläne nötig, frühe Forschungen beim Start erforscht. Einziger Unterschied: kein Weltenleuchtturm (Story), wie in Folgefrage 1 besprochen.
- **Testmodus** setzt nach Entscheidung 16 keine Volk- und Story-Freischaltungen. Er erforscht nur, was ohne Plan geht; dadurch bleiben Dampfkraft und alles dahinter (Erdöl, Chemie, Kunststoff …) offen. Für „wirklich alles“ gibt es `tideworks.unlockAll()` (nur Konsole, nur Host).
- **Bestehende Spielstände werden übernommen** (Aufgabe von Max vom 24.10., neuer als „alte Stände vernachlässigen“ aus dem Plan): Was in Version 14 baubar war, bleibt baubar (Volk-Quellen und Pläne mit Quelle `alt`), gebaute Gebäude sowieso. Ob alte Stände später einen Story-Start bekommen oder bei neuen NPC-Inseln doch verworfen werden, entscheidet Thread 3.
- **Bis die Völker kommen**, endet ein neues Spiel spielerisch beim Ziel „Kontor auf einer zweiten Insel“ (Ole) bzw. bei Dampfkraft (Brann). Zum Weitertesten: `tideworks.unlock('gruenden')`, `tideworks.unlock('plan:brann_dampf')` oder `tideworks.unlockAll()`.
- **Band ziehen:** Ohne Bandtechnik setzt das Ziehen quer über ein Band keine Kreuzung, das vorhandene Band bleibt unberührt, Meldung „Noch nicht erforscht (Bandtechnik).“. Ohne Brückenband (Brann) bricht der Zug am Hindernis mit „Bei Brann erhältlich …“ ab.
- **Ziele:** neues Ziel „Ofenbau“ vor dem Schmelzofen, „Kontor auf einer zweiten Insel“ hinter den Stahl gerückt (Entscheidung 7). Text von Phase 1 nennt den Bauplan aus der Geschichte statt der Forschung. Münz-Belohnungen der Leuchtturm-Ziele bleiben bis zum Leuchtturm-Schritt.

### Geprüft

- Headless (Simulationscode in Node): Start-Gebäude frei, alle anderen gesperrt mit richtigem Text; Ofenbau schaltet den Schmelzofen frei; `unlock` setzt, meldet an alle (`to: '*'`), lehnt doppelte, Start- und unbekannte Schlüssel ab; Schnellband ohne Plan nicht erforschbar, mit Plan schon;
  Testmodus ohne Pläne, Volk und Story; `devUnlock` schaltet alles frei; Mitspieler kann `unlock`/`devUnlock` nicht schicken; Mitspieler kann gesperrtes Gebäude nicht bauen; `unl` im Koop-Snapshot (nur nach Änderung); Speichern/Laden; Kontor gründen gesperrt mit Grund, nach `unlock('gruenden')` frei; Kreuzung beim Ziehen erst nach Bandtechnik;
  Getrennte Inseln: frühe Forschungen erforscht, Volk frei, kein Leuchtturm, keine Pläne nötig.
- Migration: ein mit dem Code von Version 14 erzeugter Stand (Sortierer und Schmelzofen gebaut) lässt sich im Browser importieren und laden, Dialog „Spielstand aktualisiert“, `unl` mit Quelle `alt`, frühe Forschungen erforscht; headless zusätzlich Forschung „Weltenleuchtturm“ → Freischaltung, Zielzeiger.
- Browser (Playwright, Dev-Server mit `USE_WORKER` an und aus, `dist/tideworks.html` per file://, ohne Konsolenfehler): Baumenü mit ausgegrauten Gebäuden, Tooltip „Bei Brann erhältlich“, Klick auf gesperrtes Gebäude → Toast mit Grund, Skilltree mit Start- und Volk/Story-Blättern an der Wurzel, Detailspalte „Plan von Brann nötig“, `tideworks.unlock`/`unlockAll` mit Toast. Demo-Fabrik im Titelbildschirm baut ohne Fehlschläge.
- `npm run build`, `check:tree`, `check:world` (Welt und Spielstart gleich wie Version 13, nur `unl` neu), `check:coop` ohne Fehler.

**Nicht geprüft:** Koop mit zwei echten Browsern über PeerServer (der Snapshot-Weg ist headless geprüft: `unl` steht in `TOP` der Mitspieler-Ansicht und im Spiegel des Mitspielers).

## Geschichte und NPC-Inseln (Version 16) – Entscheidungen, Abweichungen, Tests

Aufgabe: zentraler Story-Zustand, Auslöser-System für Akt-Wechsel, drei feste NPC-Inseln (Ole, Brann, Aurel) mit eigener Optik, Entdecken per Schiff, Akt 1 spielbar bis zum Bauplan, Story-Zeile, Debug-Schalter. Grundlage `docs/STORY.md`, `docs/SYSTEMS.md` (2, 3, 10), `docs/PLAN.md` Thread 3 mit Max' Antworten (Ringe, echte stillstehende Gebäude, Leuchtturm nur Story und Heimatinsel, keine Story bei Getrennten Inseln).

- **Schnittstelle zu Thread 5:** Ereignis `story` (`id, pre, cs, dialog, act, choice, unlock, ending`, an alle) und Kommando `storySeen`. `ui/story.js` hat `playCutscene(id, done)` und `showDialog(id, done)` als Platzhalter (Meldung, nach 1,4 s weiter); Thread 5 ersetzt nur diese zwei Funktionen.
- **Auslöser als Daten** (`TRIGGERS` in `data/story.js`) für alle fünf Akte. Was in diesem Schritt wirklich ausgelöst wird: Start, Entdecken, Gespräch, Leuchtturm-Stufe. `trade:<npc>` (Thread 4), `dive` und `find:<fund>` (Tauchen) sind eingetragen, aber noch ohne Quelle; über den Debug-Schalter lassen sie sich feuern, so ist Akt 2–5 headless durchspielbar.
- **Gespräch braucht ein Schiff am Steg.** Ohne Schiff: „Leg erst mit einem Schiff an Oles Steg an.“ Vor dem Entdecken: „Ole kennt dich noch nicht.“ Ohne fälligen Schritt sagt der NPC eine Zeile (`*_idle`). Beim Anlegen kommt ein Hinweis-Toast (`npcArrive`), golden, wenn das Gespräch die Geschichte weiterbringt.
- **Entdecken = Insel aufgedeckt** (wie jede andere Insel, `sim/explore.js`). Brann zuerst geht auch; Akt 1 endet erst, wenn alle drei entdeckt sind und man danach mit Brann spricht.
- **NPC-Zellen:** wie im Plan aus dem Seed im Abstandsband (Ole 240–420, Brann 520–780, Aurel 930–1.090 Felder), 2 Zellen Abstand. Das Band wächst bei Bedarf um eine Zellbreite nach außen. Die Insel ersetzt die Zufallsinsel der Zelle (auch eine leere Zelle). Alle anderen Zellen bleiben Feld für Feld gleich (`check:world` prüft das, nur Funde direkt an den NPC-Inseln ändern sich, weil sie Land meiden).
- **Abweichung von PLAN Schritt 7:** Die NPCs stehen **nicht** in `state.players` und haben kein Hauptkontor (`HQ`/`PORTS`), sondern einen eigenen Gebäudetyp `npchafen` (3×3 mit Steg wie das Hauptkontor). Grund: Ein NPC in `players` würde in der Spielerliste, im Koop-Menü, bei Erlaubnissen und im Ruhm auftauchen; ein HQ ohne Spieler würde `KONT`/Inselinventar anlegen und Routen hätten ein Ziel ohne Handel. `playerName` kennt `npc:<id>` trotzdem. Thread 4 nimmt den Steg in `PORTS` auf, wenn es dort Handel gibt.
- **Dörfer aus Listen statt Blaupausen** (`village` in `data/npcs.js`: Typ, Anzahl, Küste). Blaupausen-Vorlagen hätten feste Umrisse gebraucht, die NPC-Inseln sind aber je Seed verschieden. Wachsende Dörfer (Ruf) können später weitere Listen-Stufen bekommen.
- **Weite Fahrten:** Die A*-Suche (60.000 Felder) reichte von der Heimat oft nicht bis Aurel und bei einigen Seeds nicht bis Brann („Kein Seeweg gefunden“). Gesteuerte Schiffe fahren jetzt bis zum Feld, das dem Ziel am nächsten kam, und suchen dort weiter (höchstens 6 Etappen). Routen sind unverändert.
- **Leuchtturm:** Bauplan nur über die Geschichte, nur Heimatinsel, Stufen nach Akt (`WONDER_ACT`), neue Kosten (Stufe 1 mit Waren der frühen Wirtschaft, Münzen erst ab Stufe 3), keine Wirkungen, kein Ruhm, Ziele `phase1`–`phase4` entfernt, kein Abschlussfenster mit Geschichte, Lichtstrahl erst nach Ende A. Ohne Geschichte (Getrennte Inseln) bleibt der Turm gesperrt wie in Version 15.
- **Debug „Akt setzen“** markiert alle Schritte früherer Akte als erledigt (Flags, Freischaltungen, ohne Meldung), lässt die Schritte des gewählten Akts, wie sie sind (Entdecken passiert nur einmal, sonst käme man nie wieder an die Flags), und nimmt spätere zurück (auch die Story-Freischaltung).
- **Alte Spielstände (v15)** bekommen die Geschichte: NPC-Inseln nur in Zellen, die noch nicht aufgedeckt, bebaut oder entdeckt sind, Dörfer beim Laden, Akt 1. Ein vorhandener Turm bleibt und baut ohne Akt-Sperre weiter (`alt_turm`), sonst wird der Leuchtturm gesperrt, bis Brann den Plan gibt. Getrennte Inseln bleiben ohne Geschichte.
- **Akt-Wechsel holt Leuchtturm-Stufen nach**, damit ein alter Turm mit Stufe 2 die Geschichte nicht festhält.
- **Inselnamen:** NPC-Inseln heißen Pfahldorf, Werkstattbucht, Goldberg und tragen eine eigene Flaggenfarbe; der Name erscheint beim Herauszoomen, sobald die Insel entdeckt ist. Die Meldung „… kartiert“ entfällt für NPC-Inseln.

### Geprüft

- `npm run check:story` (neu) mit 9 Seeds (4711, 1, 99, 6, 12345, 2024, 777777, 5, 8): Prolog, Bauen auf NPC-Insel gesperrt, Steg nicht abreißbar, Gespräch vor dem Entdecken abgelehnt, Schiff fährt wirklich zu Brann → Ole → Aurel → Brann (Spielzeit 1–4 min je Strecke bei Tempo 1),
  Flags und Story-Ereignisse mit Szene und Dialog, Hinweis beim Anlegen, Brann vor allen drei nur ein Satz, Akt 1 → 2 mit Bauplan (`unl.leuchtturm = 'story'`), kein Schritt doppelt, Leuchtturm nicht auf Branns Insel, Stufe 3 in Akt 2 gesperrt,
  Speichern/Laden, Welt-Nachricht und Snapshot, Koop-Ansicht eines Mitspielers (NPC-Zellen, Akt, gleiche Inseln), Debug (Akt 4, zurück auf 1, Akt 2, `wonder:2`, Finale, Entscheidung B endgültig), Migration v15, Getrennte Inseln ohne Geschichte.
- `check:world`: Referenz von Version 13 unverändert (ohne NPC-Inseln), mit NPC-Inseln alle anderen Zellen und Funde gleich, je Seed Ole in Ring 1, Brann in Ring 2, Aurel in Ring 3, Dorf mit 10/10/13 Gebäuden, nicht beim Start entdeckt. `check:tree`, `check:coop`, `npm run build` ohne Fehler.
- Browser (Playwright, `dist/tideworks.html` per file:// und Dev-Server, beide mit Worker, ohne Konsolenfehler): neues Spiel Seed 4711, Schiff per Debug, Fahrt zu Brann, Ole, Aurel und zurück, jeweils Klick auf den Steg → Knopf „Mit … sprechen“ → Dialog; Akt 2 mit Bauplan-Toast und neuer Story-Zeile; `tideworks.story(3)` ändert die Ziel-Karte. Screenshots aller drei Inseln geprüft.

**Nicht geprüft:** Koop mit zwei echten Browsern (der Snapshot-Weg ist headless geprüft), Akt 1 mit einer von Grund auf gebauten Wirtschaft (Werft) statt Debug-Schiff, Nacht-Optik der Dörfer nur kurz gesehen.

## Handel mit den Völkern (Version 17) – Entscheidungen, Abweichungen, Tests

Aufgabe: Handel mit Ole, Brann und Aurel am Steg mit Münzen, Ruf 0–100 in vier Stufen (Angebot und Freischaltungen hängen daran), Angebot laut `docs/SYSTEMS.md` Abschnitt 4 mit Platzhaltern für Relikte und Taucherglocke, sinkende und sich erholende Preise, Aufträge mit Tag/Nacht, Lieferverträge über Routen, wachsende Dörfer, Ole misstrauisch und Aurel freundlich mit Geschenken, Handelsfenster, Koop über den Host, alle Zahlen in einer Datei. Grundlage `docs/SYSTEMS.md` (1, 4, 10), `docs/PLAN.md` Thread 4.

- **Erweitert statt neu gebaut:** Münzen, Münzbuch (`coinAdd` mit Posten), Laden = kaufen / Entladen = verkaufen (wie an fremden Handelskontoren), Routen, Sättigung nach dem Muster von `MARKET`. Neu ist nur der Zustand je Volk (`state.npc`, `sim/npc.js`) und das Fenster. Alle Zahlen in `data/npctrade.js`.
- **Eigene Datendatei** `data/npctrade.js` statt `data/npcs.js` (Plan Schritt 1): `npcs.js` beschreibt Inseln und Dörfer und wird von der Welt-Erzeugung geladen; Handelszahlen ändern sich viel öfter, Max soll sie an einer Stelle finden.
- **Vierte Stufe „misstrauisch“** unter neutral (Ruf 0–24). Die Stufen aus Thread 2 (neutral, freundlich, vertraut) bleiben, Freischaltungen behalten ihre Stufen. Ole startet mit 10 (misstrauisch: nur Fisch, schlechtere Preise, 1 Auftrag; Kontor gründen erst ab neutral), Brann mit 30 (neutral), Aurel mit 60 (freundlich).
- **Ein einmal erreichtes Niveau bleibt freigeschaltet** (`lv`); sinkt der Ruf durch verpasste Verträge, werden Preise und Angebot wieder schlechter, aber nichts wird gesperrt.
- **Angebot laut SYSTEMS.md 4**, mit zwei Anpassungen: „Bretter“ gibt es nicht, Ole kauft deshalb Holz. Räucherfisch kauft zusätzlich Brann (sonst hätte die Räucherei keinen Abnehmer außer dem Hafenhändler). Glas verkauft Aurel, obwohl es auch eine Glashütte gibt (SYSTEMS nennt es so).
- **Neue Waren nur bei den Völkern** (Entscheidung 10): Seil, Fischernetz, Zahnrad, Feder, Rohrstück, Uhrwerk, Batteriezelle, Perle. Damit sie einen Zweck haben, kosten Räucherei (Seil) und Kogge (Seil, Zahnräder) davon. Weitere Verwendungen (Rezepte, Leuchtturm) sind noch offen; Perle kauft Aurel, sie kommt später aus Funden.
- **Platzhalter:** Relikte, Teile der Taucherglocke und Luxuswaren stehen ausgegraut mit Stufe im Angebot (`{ soon }`), nicht kaufbar. Aufträge geben noch keine Relikte (Plan Schritt 5).
- **Pläne werden gekauft** (Brann, Aurel; Preis in `PLAN_PRICE`), Gebäude-Freischaltungen kommen automatisch mit der Stufe, sobald das Volk entdeckt ist. Die Seekarte bei Ole (ab neutral, 2 je Tag) deckt die nächste unentdeckte Insel auf.
- **Handel nur mit Schiff am Steg**, auch Pläne, Seekarte und Vertragsabschluss. Kündigen geht von überall. Liefern für Aufträge geht von Hand (Entladen, Knopf „Liefern“) und über Routen; Lieferverträge zählen nur über Routen („feste Schiffsrouten“).
- **Aufträge gehören allen** (Gemeinsame Insel): Die Belohnung geht an den, dessen Schiff abliefert. Abgelaufene Teilzahlungen, Vertragsboni und Geschenke gehen an den Host (bei Gemeinsamer Insel dieselbe Kasse).
- **Tagesablauf:** Aufträge enden am Abend (Tagesende), neue kommen jeden Morgen (bei Tagwechsel) und sofort beim Aufstieg in eine Stufe mit mehr Aufträgen, bleiben weniger als 3 min, gilt der nächste Abend. Verträge werden morgens für den Vortag abgerechnet.
- **Dörfer wachsen nach Lieferwert**, nicht nach Ruf (die Aufgabe sagt „mit den Lieferungen“). Jede Stufe setzt weitere Häuser und neue Laternen (`npc_laterne`, 1×1, leuchtet nachts über den vorhandenen Nachtschein). Dafür ist `placeVillage` aus `buildVillage` herausgelöst; neue Spiele bleiben Feld für Feld gleich (`check:world`).
- **Routen mit NPC-Steg sind still:** Kein Toast je Anlegen, nur das Logbuch im Fenster. Von Hand gibt es einen Toast.
- **Koop:** `state.npc` als `SLOW`-Schlüssel (höchstens 1/s, nur bei Änderung). Handelsaktionen sind normale Kommandos über den Host; `npcRep` nur Host. Zwei Schiffe am selben Steg werden in der Reihenfolge der Kommandos abgearbeitet.
- **Nicht umgesetzt (nicht in der Aufgabe):** Dorffeste (Plan Schritt 6), Statistik-Quelle „Ole“ in der Produktionsstatistik (gekaufte Waren landen im Schiff, nicht im Lager), Meerjungfrauen, Relikt-Belohnungen.
- **Knopfleiste:** Mit dem neuen Knopf „Völker“ war sie bei 1.440 px zu breit. Sie lässt jetzt erst die Tasten weg, dann die Namen, wenn sie nicht passt (`ui/layout.js`).
- **Debug neu:** `tideworks.rep`, `npc`, `dock` (Schiff an einen Steg setzen), `time` (Uhrzeit vorwärts setzen).

### Geprüft

- `npm run check:npc` (neu) mit Seeds 4711, 1, 2, 3, 99, 12345: kein Handel vor dem Entdecken, erster Kontakt mit Stufe und Aufträgen (Ole 1, Aurel 3), Freischaltung nach Stufe, Seil bei Ole erst ab neutral, Kaufen (Preis steigt, Vorrat sinkt),
  Entladen erst an den Auftrag und dann Verkauf, Ruf steigt, Preis sinkt bei viel Verkauf und erholt sich, Ole neutral schaltet Kontor gründen frei, Seekarte, Plan bei Brann gesperrt und ab freundlich gekauft (Kogge frei), Teillieferung und Ablauf mit Teilzahlung,
  Liefervertrag über eine **echte Route** (Heimat → Oles Steg) mit Abrechnung am Morgen, verpasster Tag, Kündigung nach 2 Tagen, Dorf wächst mit Laternen, Aurels Geschenke, Speichern/Laden gleich, Snapshot, Koop-Ansicht eines Mitspielers, Mitspieler kauft am Steg, Mitspieler kann den Ruf nicht setzen, Migration v16.
- `check:story` angepasst (Brann verkauft kein Holz, aber Zahnräder; Handel ändert den Akt nicht), `check:world` (Spielstart ohne `npc` verglichen, Dörfer weiter 10/10/13 Gebäude), `check:tree`, `check:coop`, `npm run build` ohne Fehler.
- Browser (Playwright, Dev-Server und `dist/tideworks.html` per file://, ohne Konsolenfehler): Fenster „Völker“ mit drei Reitern, Kaufen +10 am Steg, Entladen mit Meldung, Schiffs-Panel am Steg, Dorf bei Tag und Nacht mit Laternen nach Wachstum. Screenshots in `screenshots/handel/`.

**Nicht geprüft:** Koop mit zwei echten Browsern (der Weg über Kommandos und `TOP`/`SLOW` ist headless geprüft), ein Liefervertrag über mehrere echte Spieltage ohne Vorspulen, Balancing der Preise und Belohnungen im längeren Spiel.

## Dialog-System und Cutscene-Engine (0.10.0) – Entscheidungen, Abweichungen, Tests

Aufgabe: Monolog-/Dialogfenster als wiederverwendbares Modul, Dialoge als Daten, Cutscene-Engine mit Zeitleiste aus Einstellungen auf 320×180, Player mit Balken, Überspringen, Pause und „gesehen“, Referenz „Rauch hinter dem Nebel“ als erste Szene `cs_npc_ole`, gemeinsame Zeichenhilfen. Grundlage `docs/PLAN.md` Thread 5, `docs/STORY.md`, `docs/SYSTEMS.md` 5 und 10, Max' Entscheidungen 12, 14, 18, 19.

- **Bild für Bild gleich wie die Referenz.** Der Port wurde mit `seek(t)` gegen die Referenz-Datei verglichen (23 Zeitpunkte über alle Einstellungen und den Dialog, je 57.600 Pixel): 0 Pixel Unterschied; im Dialog nur der blinkende Pfeil „weiter“ (10 Pixel), weil die Referenz ihn an `performance.now()` hängt, der Port an die Uhr des Dialogs. Dafür hat `cutscene/kit.js` einen eigenen Pixelpuffer `PB`, der wie die Referenz abrundet (`Math.floor`); der PB der Spiel-Sprites rundet (`Math.round`) und hätte andere Pixel ergeben. Bayer und `rgb` kommen aus `gfx/pixelbuffer.js` (gleich).
- **Oles Porträt** steht in `gfx/portraits.js` und benutzt die neuen Bausteine (`eyePair`, `brow`, `mouth`, `blush`, `torso`); auch damit pixelgleich. Brann, Aurel, Herrscher und „Eine Stimme“ haben bis Thread 6 einen **Schattenriss** in ihrer Farbe (kein Gesicht, kein Blinzeln).
- **Dialogtext nach STORY.md** (Entscheidung 14): Oles Zeilen 5 und 6 lauten jetzt „Pah. Wir handeln, mehr nicht. Bring Holz, dann reden wir weiter.“ und „Und halt die Augen offen. Da draußen gibt es noch mehr als uns.“ Die Referenz-Datei ist an diesen zwei Stellen (und beim Auslassungszeichen „…“) angeglichen, sonst unverändert.
- **Schrift** (Entscheidung 18): Namensschild Pixelify Sans, Textkasten Nunito 600. Das Namensschild ist mit 7,5 Bühnen-Pixeln etwas größer als in der Referenz (6,4), damit es bei 2× auf 15 px kommt (Regel „Pixelify nur ab 15 px“). Text in Nunito bei 6,6 Bühnen-Pixeln, Zeilenhöhe 1,25: vier Zeilen passen in den Kasten (längster Satz bisher: drei Zeilen).
- **Ganzzahlige Skalierung** der Bühne (bis 0.15.0, seit 0.16.0 bildschirmfüllend, siehe „Feinschliff Cutscenes und Dialoge“) (`fit` in `cutscene/stage.js`). Ausnahme: Passt nicht einmal 2× (Handy hochkant, unter 640 px Breite), füllt die Bühne die Breite mit krummem Faktor, sonst wäre sie 320 px klein. Dialog über der Karte höchstens 3×.
- **Dialoge über der Karte** (Gespräch am Steg, Story-Dialog ohne Szene) halten die Simulation **nicht** an; nur Cutscenes (mit ihrem Dialog) tun das. Grund: Ein Satz am Steg soll die Fabrik nicht stoppen, PLAN nennt „Dialog über der laufenden Karte“.
- **Dialoge als Daten** in `src/data/dialogs/` (eine Datei je Figur, `story.js` für mehrere Figuren). `when` und `once` werden für **Gesprächsdialoge** (`idle`) ausgewertet: Die Simulation wählt jetzt den Satz beim Klick auf den NPC aus den Daten (`idleDialogFor`, statt der festen Funktion `idleDialog`); die Ids `ole_idle`, `brann_idle`, `brann_idle2`, `aurel_idle` bleiben. Story-Dialoge brauchen kein `when`/`once`, ihr Schritt läuft ohnehin nur einmal. Alle Texte aus STORY.md sind eingetragen, auch Akt 2–5 und die Enden; die Rückblenden-Sätze (`flutnacht_rueck`, `wahrheit_rueck`) haben noch keinen Auslöser (gehören in die Szenen von später).
- **Koop** (Entscheidung 12): Szene bei allen, Pause für alle, Überspringen nur Host, über eine eigene Sitzungs-Nachricht (`csShare`, keine Simulation nötig). Den Dialog liest jeder für sich; die Simulation läuft weiter, sobald der Host fertig ist (der Mitspieler sieht dann ggf. noch den Dialog, während die Welt hinter dem Vollbild schon weiterläuft). `data/story.js` und `data/dialogs/` sind jetzt Teil des Prüfwerts beim Beitreten.
- **Warteschlange:** Story-Ereignisse warten, solange Pausenmenü, Titel, ein Fenster (`#modal`, z. B. „Insel benennen“) oder eine andere Szene offen ist. Zurück im Hauptmenü (auch wenn der Host die Sitzung beendet) wird sie geleert und eine laufende Szene geschlossen (`stopStory`).
- **Tasten:** Die Bühne fängt Tasten in der Fang-Phase am Fenster ab (Leertaste = weiter statt Spielpause, Esc = überspringen statt Pausenmenü). Strg-/Cmd-Kürzel und F-Tasten bleiben beim Browser. Losgelassene Tasten gehen weiter an das Spiel (sonst liefe die Kamera nach einer Szene weiter).
- **Größe:** Szene `cs_npc_ole` 8,9 KB, Baukasten 6,1 KB, Player/Bühne/Dialog/Porträts zusammen 9,8 KB (jeweils minimiert, ohne gzip); das Bundle wächst um 32 KB (mit allen Dialogtexten). `dist/tideworks.html` bleibt eine Datei. Vorbereitung der Szene (Ebenen, Porträts) beim ersten Abspielen: `tideworks.csTimes()`.
- **Spielstand-Version bleibt 17**: Es gibt keinen neuen Zustand („gesehen“ steht seit Version 16 in `state.story.seen`). Spielversion 0.10.0.

### So baut man eine neue Cutscene

1. **Datei anlegen:** `src/cutscenes/cs_<name>.js` (Vorlage: `cs_npc_ole.js`). Die Id muss in `CUTSCENES` in `src/data/story.js` stehen (Titel fürs Menü „Szenen“).
2. **Ebenen vorbereiten** in `setup()`: alles Statische einmal vorrendern und in Modul-Variablen behalten – Himmel, Meer, Inseln mit `layer(w, h, (x, y) => farbe)` oder einem `PB` (Pixel setzen, `outline`, `canvas()`), kleine Figuren mit `tpl([...Zeilen], palette)`, Licht mit `glow`, Vignette mit `vignette()`. Eine eigene Palette je Szene (4–6 Stufen hell → dunkel, `ramp(hell, dunkel, n)` hilft), Schattierung mit `shadeE`/`pick` und Bayer-Dithering (`bay(x, y)`), Licht von links oben.
3. **Einstellungen** in `shots`: `{ from, to, draw(ctx, lt, t) }` – `t` Sekunden seit Szenenbeginn, `lt` seit Beginn der Einstellung. Eine Kamerabewegung je Einstellung (`ease`), harte Schnitte dazwischen. Nicht selbst Balken zeichnen (der Player legt 16 px oben und unten darüber; `bars: false` schaltet sie ab). Auf- und Abblende mit `black(ctx, a)`. Rückblende: am Ende von `draw` `sepia(ctx)` (Sepia-Stufen mit Dithering, dunkler Rand).
4. **Länge und Dialog:** `len` (Sekunden), `dialog` (Id aus `src/data/dialogs/`) und `dialogBg(ctx, el, now)`: das Standbild hinter dem Dialog (meist die letzte weite Einstellung, ohne Kamerafahrt); das Abdunkeln, die einfahrenden Balken und das Einblenden macht das Dialogfenster.
5. **Porträt** für Großaufnahme und Dialog: Funktion `(eyes, mouth) → canvas` in `gfx/portraits.js` mit den Bausteinen aus `cutscene/kit.js` (`torso`, `shadeE`, `eyePair`, `brow`, `mouth`, `blush`), in `PORTRAITS` mit `face: true` eintragen. In der Großaufnahme 2× zeichnen: `ctx.drawImage(portrait('id')(eyes, 0), 0, 0, 64, 80, x, y, 128, 160)`.
6. **Eintragen:** in `src/cutscenes/index.js` in die Liste. Der Auslöser kommt aus `TRIGGERS` (`cs: 'cs_<name>', dialog: '…'`).
7. **Prüfen:** `tideworks.cs('cs_<name>')` abspielen, `tideworks.cs('cs_<name>', t)` einzelne Bilder; `prefers-reduced-motion` (DevTools → Rendering) springt direkt in den Dialog. Ziel: unter 40 KB je Szene im Bundle, keine Bilddateien.

### Geprüft

- **Pixelvergleich** Referenz ↔ Port (Playwright, 23 Zeitpunkte 0,3–21,4 s): identisch bis auf den Pfeil „weiter“ (s. oben).
- **Browser** (Playwright, Dev-Server, ohne Konsolenfehler): neues Spiel Seed 4711 → `story('step', 'npc_ole')` → Vollbild-Szene, Spielzeit steht, Leertaste schaltet nicht die Spielpause, Esc springt in den Dialog, sechs Zeilen mit Klick, danach `seen` = `cs_npc_ole`, `ole_1` und die Zeit läuft wieder. Dialog über der Karte (Spiel läuft weiter). Pausenmenü → „Szenen“ (2 von 12 gesehen, Prolog „folgt bald“) → Ansehen → Esc → Dialog mit Enter → zurück in der Liste. `prefers-reduced-motion` bei 390×844: direkt im Dialog, Bühne füllt die Breite.
- **Koop mit zwei Browsern** (lokaler PeerServer, Gemeinsame Insel): Szene startet bei beiden, Zeit steht bei beiden, Mitspieler sieht „Nur der Host kann überspringen“ und Esc wirkt bei ihm nicht, Host-Esc bringt beide in den Dialog, Host fertig → Zeit läuft, Mitspieler liest noch und schließt selbst; `seen` nur vom Host gesetzt, beim Mitspieler gespiegelt.
- `npm run check:story`, `check:npc`, `check:world`, `check:coop`, `check:tree` (die Gesprächssätze kommen jetzt aus den Dialogdaten), `npm run build`, `dist/tideworks.html` per file://.

**Nicht geprüft:** Safari und Firefox (Container-Abfragen `cqw` für die Schriftgröße brauchen aktuelle Browser), Touch auf echten Geräten, Getrennte Inseln (dort gibt es keine Geschichte).

## Prolog „Gestrandet“ (0.11.0) – Entscheidungen, Abweichungen, Tests

Aufgabe: `cs_prolog` genau nach `docs/STORY.md` (Prolog, „Der Spieler im Bild“, „Leitmotive“, „Stil der Cutscenes“), beim Start eines neuen Spiels vor dem ersten Spielbild, ohne Dialog danach; Blitz, Wappen und Siegel als wiederverwendbare Teile.

- **Ablauf (32 s; zuerst 19,4 s, auf Max' Wunsch ruhiger gemacht, damit man beim Start einer neuen Welt nicht überrumpelt wird):** Sturm fast schwarz mit Regen und Dünung, langsam aus dem Schwarz (3 s), das Boot ist nur zu ahnen (0–5 s) · ein einziger Blitz bei 5 s, Boot mit Mast, Segelfetzen und zusammengesunkener Gestalt als Schattenriss (bis 7,5 s) · harter Schnitt zum Morgen: kühles helles Licht, Möwen, kleine Wellen, Spülsaum, winzige Gestalt im grünen Mantel am Wasser, Kamerafahrt zum Wrack (7,5–12 s) · Wrack-Heck in dreifacher Pixelgröße mit dem Wappen, eine Möwe fliegt nach 2 s auf (12–15,5 s) · Großaufnahme: Faust öffnet sich (Faust → halb → offen), Seilspuren am Handgelenk, Ärmel mit Messingknöpfen, schwerer Goldring mit dunkelgrünem Stein, der zerknüllte Zettel auf der Handfläche; daneben nasses Haar und die helle Strähne, das Gesicht liegt außerhalb des Bildes (15,5–19,5 s, die Faust öffnet sich nach 1,3 s) · der Zettel in doppelter Pixelgröße: lesbar „…Leuchtfeuer sofort / entzünden. / Gez. …“ (Anfang und Unterschrift verwischt, Tinte verläuft), darunter das Siegel; erst 2,4 s Zeit zum Lesen, dann fährt die Kamera ans Siegel (19,5–25 s) · Abblende (1 s) · Titel „Tideworks“ (das Logo des Titelbildschirms, 2×) über einer schimmernden Wasserlinie mit Spiegelung (26,2–32 s).
- **STORY.md sagt 10–14 s für Hand und Zettel in einer Einstellung.** Umgesetzt als zwei Einstellungen mit hartem Schnitt (Hand und Zettel je eigene Einstellung), weil die Stilregel „eine Kamerabewegung pro Einstellung“ gilt und der Zettel sonst nicht lesbar groß wird. Ebenso das Wrack: Totale und näher ans Wappen. Auch die Längen weichen ab: STORY.md nennt 14 s bis zur Abblende, jetzt sind es 25 s (Max' Wunsch, s. oben).
- **Leitmotive in `src/cutscene/motifs.js`** (der Name stand schon im PLAN):
  - Blitz: `lightningFlash(lt)` (Helligkeit 0–1: Vorblitz, Pause, Hauptblitz, Nachleuchten, 1,8 s) und `drawLightning(ctx, lt, BOLT)` (Strahl mit Ästen, fest aus `BOLT.seed`). Die Szene färbt ihren Himmel mit zwei vorgerenderten Ebenen (dunkel, im Blitz) und zeichnet den Vordergrund danach als Schattenriss. Für **cs_wahrheit „exakt so“**: dieselben zwei Aufrufe mit `BOLT` und dem Einschlag zum selben `lt`; nur die eigenen Ebenen der Szene sind andere.
  - Wappen (Aurel): `wappen(art)` → Canvas 17×22: Krone über einem Schild, im blauen Feld eine Sonne mit Strahlen über einem Berg mit drei Gipfeln. Arten `fahne` (kräftig, für Aurels Fahne in cs_npc_aurel), `verwittert` (abgeplatzte Farbe auf Holz, Wrack), `praegung` (erhaben in Metall, Werkzeug am Pumpwerk). Die Form steht einmal als Kennbuchstaben-Raster, die Arten sind nur Farbtabellen.
  - Siegel (der Herrscher): `siegel(art)` → Canvas 25×25: Wachs mit Wulst, eingedrückter Ring, darin ein Leuchtturm mit Lampe über einer Welle (Lampe und Wasserlinie sind die anderen Leitmotive). Arten `wachs` (Prolog) und `verblasst` (für die Ecke des Bauplans in cs_bauplan, Papier scheint durch).
  - Wappen und Siegel sind bewusst verschieden: das Wappen gehört Aurel (Berg, Sonne, Krone), das Siegel dem Herrscher, also dem Spieler. Der Befehl auf dem Zettel trägt das Siegel des Herrschers.
- **Der Spieler im Bild:** nur die Hand (Ring, Seilspuren), der Ärmel des dunkelgrünen Mantels mit Messingknöpfen und die helle Strähne; in der Totale eine winzige Gestalt im Spülsaum. Kein Gesicht.
- **Paletten:** Sturm (fast Schwarz, im Blitz kaltes Violettweiß), Morgen (helles Blaugrau, Türkis, heller Sand, ausgeblichenes Holz), Großaufnahmen (kalte Haut, Seilrot, Messing, Mantelgrün, nasses Papier, Tinte). Die Vignette ist je Stimmung eingefärbt (dunkel im Sturm, blaugrau am Strand, sandbraun in den Großaufnahmen), sonst wirkte sie in hellen Bildern wie ein schwarzes Punktraster.
- **Hand:** drei vorgerenderte Bilder (Faust, halb, offen) statt Zwischenstufen, wie die Laterne bei Ole. Faust und halb: jedes Fingerglied auf eigener Ebene mit Innenkontur, sonst verschmelzen die Finger. Offen (nach Max' Rückmeldung, die Finger wirkten wie Zylinder auf der Hand): jeder Finger in einem Stück und flacher gewölbt (`soft` in `capsule`), der Ansatz liegt unter der Handfläche, die erst danach gezeichnet wird; zwischen den Fingern nur eine weiche Fuge, dazu Gelenkfalten, hellere Kuppen und die Beugefalte am Fingeransatz.
- **Handschrift:** eigene Pixelschrift für den Zettel (7 Zeilen hoch, nur die nötigen Zeichen in `GLYPHS`), in der Großaufnahme 2×, also 14 Bildschirmpixel hohe Großbuchstaben bei 2× Bühne.
- **Auslöser:** wie bisher `TRIGGERS` `prolog` (`on: 'start'`). Der Willkommens-Hinweis („100 Holz im Kontor …“) kommt bei einem neuen Spiel mit Geschichte erst nach der Szene (`afterStory` in `ui/story.js`). Die Bühne öffnet sich im selben Schritt, in dem der Titel verschwindet, darum gibt es kein Kartenbild davor (gemessen, s. unten). `prefers-reduced-motion`: die Szene entfällt, das Spiel beginnt sofort.
- **Koop:** Ein Host mit Lobby sieht den Prolog nicht, weil das Ereignis ankommt, bevor das Spiel gestartet ist (Ereignisse vor `play()` werden wie bisher verworfen). PLAN sieht den Prolog ohnehin nur für „Neues Spiel“ vor; unter „Szenen“ ist er dann nicht als gesehen markiert. Offen, falls gewünscht.
- **Nicht gemacht (PLAN Thread 6, Punkt 6):** Das Wrack mit Wappen auf der Karte am Strand der Heimatinsel gibt es noch nicht.
- **Größe und Zeit:** Bundle +24 KB (Szene und Leitmotive, minimiert), keine Bilddateien. `setup()` rund 200–250 ms beim ersten Abspielen (vor dem Öffnen der Bühne, der Titel bleibt so lange stehen), ein Bild 0,1–1,7 ms.
- Spielstand-Version bleibt 17, Spielversion **0.11.0**.

### Geprüft

- **Einzelbilder** (Playwright, `tideworks.cs('cs_prolog', t)`) bei 1,5 · 3,1 · 3,3 · 3,6 · 4,4 · 6 · 6,5 · 7,9 · 8,5 · 9 · 9,6 · 9,9 · 10,2 · 10,7 · 11,5 · 12,4 · 12,6 · 13,6 · 14,4 · 14,9 · 15,9 · 16,5 · 17 · 18,9 s angesehen und in vier Runden nachgebessert (Sturm dunkler, Vignette je Stimmung, Himmel-Ausschnitt, Möwen, Wrack-Nahaufnahme neu gerahmt, Wappen und Siegel neu gezeichnet, Finger getrennt und länger, Ring als Band, Haar und Strähne, Buchstabe G). Übersicht: `screenshots/prolog/uebersicht.png`.
- **Spielstart** (Dev-Server, Seed 4711): Neues Spiel → in dem Moment, in dem der Titel verschwindet, ist die Bühne schon offen (auch beim ersten Bild danach), Spielzeit steht während der Szene (`seen.cs_prolog` = 120,2, Startzeit 120), danach Karte und Willkommens-Hinweis; mit Esc nach 1,5 s direkt ins Spiel, Hinweis danach. Keine Konsolenfehler.
- `npm run check:story`, `check:npc`, `check:world`, `check:coop`, `check:tree`, `npm run build`.

**Nicht geprüft:** Koop mit zwei Browsern (am Ablauf für Mitspieler hat sich nichts geändert), Safari/Firefox, echte Handys.

## Cutscene Brann „Funken in der Werkstatt“ (0.12.0) – Entscheidungen, Abweichungen, Tests

Aufgabe: `cs_npc_brann` genau nach `docs/STORY.md` (Akt 1, „Der Spieler im Bild“, „Leitmotive“, „Stil der Cutscenes“), mit Porträt von Brann und Dialog `brann_1`, am vorhandenen Auslöser `npc_brann` (`discover:brann`, Schiff erreicht Branns Insel). Datei `src/cutscenes/cs_npc_brann.js`, Porträt in `gfx/portraits.js`.

- **Ablauf (28,6 s; STORY.md nennt 14 s, nach Max' Rückmeldung zum Prolog jede Einstellung mit mehr Zeit):** aus dem Schwarz (1,6 s) gleitet die Kamera über das Wasser nach rechts in die Bucht: Landzungen mit Häuschen, Kai aus Quadern, Ziegelhalle mit glühendem Tor, hoher Schornstein, Gitterkran links, Holzkran mit Tretrad rechts (die Last pendelt), Steg, dunkler Werkstattrauch, den der Wind nach rechts treibt; im Tor blitzen schon einzelne Funken (0–8 s) · harter Schnitt vor die Werkstatt (einfache Pixelgröße, langsame Drift): Ziegelwand mit Ruß über dem Tor, Schild mit Zahnrad, warme Fenster, großes Zahnrad an der Wand, Kisten, Fass, Taurolle; im Tor hämmert Brann als Schattenriss mit glühendem Rand vor der Esse, ein Schlag alle 0,95 s mit Lichtblitz und 24 Funken, die aus dem Tor fliegen und auf dem Pflaster aufspringen; nach 4,75 s lässt er den Hammer sinken (8–14 s) · über die Schulter (doppelte Pixelgröße): vorn links Hinterkopf, Ohr und hochgeschlagener Kragen des dunkelgrünen Mantels, warm vom Tor angestrahlt; Brann tritt aus dem Dunkel (Schattenriss → Tageslicht) und wischt die Hände an der Schürze ab (14–21 s) · Großaufnahme 2×: er sieht dich an, blinzelt, kneift die Augen zusammen, sein Blick geht nach unten zur Seite (auf deine Hände, passend zu Zeile 4), mustert dich wieder, blinzelt; Glut treibt durchs Bild (21–27,4 s) · Abblende (1,2 s). Danach Dialog `brann_1` vor der Werkstatt, Brann steht vor dem Tor.
- **Abweichung „eine Kamerabewegung pro Einstellung“:** STORY.md hat „Hämmern, Funken“ und „Brann tritt heraus“ als zwei Einstellungen; so umgesetzt. Die Schulter des Spielers liegt in der dritten Einstellung (STORY.md sagt nur „kurz“), weil man dort sieht, wen Brann mustert. Sie bewegt sich mit stärkerer Parallaxe als das Tor, sonst ist es dieselbe Kamerafahrt.
- **Der Spieler im Bild:** nur von hinten, Hinterkopf mit dunklem Haar, Ohr, Kragen und Schulter des dunkelgrünen Mantels (Farben wie im Prolog). Keine Strähne, kein Ring (STORY.md nennt für diese Szene nur den Mantel; „nie ganz deutlich“).
- **Brann:** Porträt 64×80 mit kantigem Kiefer, kurzem vollen Bart, an den Schläfen grau, buschigen Brauen (eine hochgezogen: prüfend; beim Mustern beide tiefer), Ruß auf Wange und Stirn, Schutzbrille mit Messingringen auf der Stirn, Hemd mit offenem Kragen, Lederschürze mit Naht, Riemen und Nieten, **verschränkte Arme** mit aufgekrempelten Ärmeln. Die Hände liegen unter den Ärmeln (nach der Rückmeldung zu den offenen Händen im Prolog keine Finger in der Großaufnahme). Augen: 0 offen, 1 zusammengekniffen, 2 zu, 3 Blick zur Seite nach unten (nur in der Szene; der Dialog nutzt 0 und 2). Die Figur in Einstellung 2/3 ist prozedural (Kapseln und Ellipsen, 44×64) in acht Haltungen: stehen, zwei Schritte auf uns zu, zweimal Hände abwischen, Hammer oben/Mitte/unten mit Zange; dazu je ein Schattenriss mit glühendem Rand (Licht der Esse von rechts hinten).
- **Palette:** bedeckter, trockener Tag in warmem Grau (Himmel, Wolken mit hellen Rändern, graugrünes Meer, warmer Fels), Ziegelrot, Schiefer, Holz, Eisen; Werkstattlicht und Funken orange bis gelb, Vignette dunkelbraun. Kein Regen, keine Nässe (Gegensatz zu Ole).
- **Leitmotive:** die Wasserlinie (Kai und Steg in der Bucht); Lampe und Wappen kommen in dieser Szene nicht vor (laut STORY.md erst in cs_npc_aurel bzw. cs_bauplan).
- **Größe und Zeit:** Bundle +25 KB (Szene und Porträt, minimiert), keine Bilddateien. `setup()` rund 60–110 ms beim ersten Abspielen, ein Bild 0,05–0,6 ms.
- Spielstand-Version bleibt 17, Spielversion **0.12.0**.

### Geprüft

- **Einzelbilder** (Playwright, `tideworks.cs('cs_npc_brann', t)`) bei 0,8 · 3 · 6 · 7,9 · 8,4 · 9,05 · 9,5 · 10,3 · 11 · 13,5 · 14,3 · 15,3 · 16,5 · 18,2 · 19,5 · 20,5 · 22 · 23,2 · 24 · 25 · 25,5 · 27,8 s und der Dialog (Zeile 4) angesehen, in drei Runden nachgebessert: Brauen als feste Form statt Rauschen, Unterarme mit Schatten dazwischen, Innenraum heller, damit der Schattenriss beim Hämmern lesbar ist (vorher diagonale Streifen aus dem Raster), Funken mit Lichthof, Hinterkopf mit Ohr, Nacken und Kragenkante (vorher eine braune Kugel), schmalere Ärmel, größerer Kopf, Brille aufs Haar statt auf Augenhöhe, Bildausschnitt so, dass die Stiefel über dem Balken bleiben. Übersicht: `screenshots/brann/uebersicht.png`.
- **Spiel** (Dev-Server, Seed 4711): neues Spiel, Prolog mit Esc übersprungen, `tideworks.story('fire', 'discover:brann')` → Szene im Vollbild, Esc → Dialog, fünf Zeilen mit Enter, danach `seen` = `cs_npc_brann`, `brann_1`. Keine Konsolenfehler.
- `npm run check:story`, `check:npc`, `check:world`, `check:coop`, `check:tree`, `npm run build`.

**Nicht geprüft:** Koop mit zwei Browsern (Ablauf unverändert), Safari/Firefox, echte Handys.

## Cutscene Aurel „Der Goldberg“ (0.13.0) – Entscheidungen, Abweichungen, Tests

Aufgabe: `cs_npc_aurel` genau nach `docs/STORY.md` (Akt 1, „Leitmotive“, „Stil der Cutscenes“), mit Porträt von Aurel und Dialog `aurel_1`, am vorhandenen Auslöser `npc_aurel` (`discover:aurel`, Schiff erreicht Aurels Insel). Datei `src/cutscenes/cs_npc_aurel.js`, Porträt in `gfx/portraits.js`.

- **Ablauf (31,2 s; STORY.md nennt 15 s, nach Max' Wunsch jede Einstellung mit mehr Zeit):** aus dem Schwarz (1,6 s) unter grauer Wolkendecke, der Goldberg in der Ferne grau wie die Szenen davor · ab 1,6 s reißt die Decke von der Sonne aus auf (der Rand an der Lücke leuchtet zuerst als Silberrand), ab 2,4 s breitet sich das Licht Pixel für Pixel über Berg und Meer aus, Strahlen fallen durch die Lücke, der erste Strahl lässt die Kuppel aufleuchten, Glitzern auf dem Wasser; Kamera gleitet langsam nach rechts (0–8 s) · harter Schnitt an den Hang: Kamera fährt vom Hafen (Boote mit goldenen Segeln, Kai) über die Terrassen hinauf zum Palast: Stützmauern aus Marmor, Zitronenbäumchen in Kübeln, Zypressen, Blumen in exakt gleichem Takt, Weinreihen, weiße Häuser mit goldenen Kuppeln oder Ziegeldach, die große Treppe mit purpurnem Läufer, goldene Banner im Wind, Tauben (8–15,5 s) · Treppe vor dem Palast in doppelter Pixelgröße: die Kamera neigt sich langsam von der Fahne zu Aurel; er steht mit gefalteten Händen, öffnet bei 3,4 s die Arme, der Umhang weht, Blütenblätter treiben (15,5–23 s) · Großaufnahme 2×: Lächeln, Blinzeln, dann stockt das Lächeln (Augen weit, Mund gerade, 1,4 s), gleichzeitig zieht eine Wolke vor die Sonne und das Licht wird kurz kühler; er findet das Lächeln wieder (halb), dann zu breit (lachende Augen), wieder freundlich (23–30 s) · Abblende (1,2 s). Danach Dialog `aurel_1` vor der Treppe, Aurel mit offenen Armen.
- **„Alles ein bisschen zu perfekt“:** alles streng symmetrisch zur Treppe, Blumen und Bäume in festen Abständen, sauberer Marmor; die Wolke in der Großaufnahme ist der einzige Moment, in dem die Sonne fehlt.
- **Wappen:** die Fahne ist Purpur mit Goldsaum und Schwalbenschwanz, darauf `wappen('fahne')` aus `cutscene/motifs.js` unverändert (dieselbe Form wie das Wrack im Prolog, nur in den kräftigen Farben). Damit es exakt bleibt, wird das Tuch nicht verzerrt: der Teil mit dem Wappen hängt gerade an der Querstange, nur die Spitzen darunter schwingen, und Falten laufen als halbdurchsichtige Schatten durchs Tuch.
- **Aurel:** Porträt 64×80 mit weichem, rundem Gesicht ohne Bart, glatter Haut, rosigen Wangen, honigbraunem Haar bis zum Kiefer (Scheitel links), schmalem Goldreif mit kleinem blauem Stein, goldenem Umhang mit purpurnem Kragen und Goldborte, Sonnen-Brosche (die Sonne aus dem Wappen), weißes Gewand. Mienen: 0 freundlich, 1 lachende Augen, 2 zu, 3 Lächeln stockt, 4 halbes Lächeln (3 und 4 nur in der Szene; der Dialog nutzt 0 und 2). Keine Hände im Porträt. In der Treppen-Einstellung ist er eine prozedurale Figur (60×60) in drei Haltungen (Hände gefaltet, halb, offene Arme) mit je zwei Stellungen des Umhangs; die offenen Hände sind Handfläche nach oben, Finger in einem Stück, Daumen oben (nach Max' Rückmeldung zu den Händen im Prolog).
- **Farben** wie im Spiel (Goldberg: Marmor und Gold, Aurels Figur auf der Karte trägt Purpur): Himmelblau, Türkis, Marmor in warmen Stufen, Gold, frisches Grün, Terrakotta, Purpur als Gegenfarbe. Vor der Sonne alles grau entsättigt (die Szene erzeugt die graue Fassung aus der sonnigen). Vignette warm goldbraun und schwach.
- **Neuer Baustein in der Szene:** `dissolve(grau, sonnig, schwelle)` blendet zwei Ebenen Pixel für Pixel über (Licht breitet sich von einem Punkt aus); `cloudCover()` die aufreißende Wolkendecke. Beide nur in dieser Datei, bei Bedarf nach `kit.js` verschiebbar.
- **Leitmotive:** Wappen (Fahne), Wasserlinie (Kai, Hafen); die Lampe kommt nicht vor.
- **Größe und Zeit:** `setup()` rund 140–230 ms beim ersten Abspielen, keine Bilddateien.
- Spielstand-Version bleibt 17, Spielversion **0.13.0**.

### Geprüft

- **Einzelbilder** (Playwright, `tideworks.cs('cs_npc_aurel', t)`) bei 1,5 · 3,2 · 3,5 · 4,5 · 5 · 6 · 7,5 · 7,9 · 8,5 · 9 · 11 · 13 · 14 · 14,8 · 15,3 · 15,6 · 16 · 17 · 18,6 · 20 · 22 · 22,5 · 22,8 · 23,5 · 24 · 24,5 · 25,6 · 26 · 27,5 · 28 · 29 s und der Dialog angesehen, in drei Runden nachgebessert: Wolken als von der Sonne aus aufreißende Decke statt zweier Vorhänge, Berg als Kegel mit Fuß statt Pyramide bzw. Halbkugel, Terrassen biegen sich zu den Seiten, weniger und unregelmäßig verteilte Häuser in der Ferne, Kragen und Brosche im Porträt, weichere Gesichtsschattierung, Arme nicht mehr waagerecht (wirkte wie eine Vogelscheuche), Figur länger. Übersicht: `screenshots/aurel/uebersicht.png`.
- **Spiel** (Dev-Server, Seed 4711): neues Spiel, Prolog mit Esc übersprungen, `tideworks.story('fire', 'discover:aurel')` → Szene im Vollbild, Esc → Dialog, fünf Zeilen mit Enter, danach `seen` = `cs_npc_aurel`, `aurel_1`. Keine Konsolenfehler.
- `npm run check:story`, `check:npc`, `check:world`, `check:coop`, `check:tree`, `npm run build`.

**Nicht geprüft:** Koop mit zwei Browsern (Ablauf unverändert), Safari/Firefox, echte Handys.

## Cutscene „Der Bauplan“ (0.14.0) – Entscheidungen, Abweichungen, Tests

Aufgabe: `cs_bauplan` genau nach `docs/STORY.md` (Akt 1 Ende, „Leitmotive“, „Stil der Cutscenes“), mit Dialog `brann_bauplan`, am vorhandenen Story-Schritt `akt1_ende` (`talk:brann` in Akt 1, wenn `npc_ole`, `npc_brann`, `npc_aurel` gesetzt sind; danach `unlock: ['leuchtturm']` mit Quelle `story` und Akt 2). Auslöser und Dialogtext gab es schon (Thread 3 und 5), neu ist nur die Szene `src/cutscenes/cs_bauplan.js` (eingetragen in `cutscenes/index.js`).

- **Ablauf (33,2 s; STORY.md nennt 14 s, nach Max' Wunsch jede Einstellung mit mehr Zeit):** aus dem Schwarz (1,8 s) in Branns Werkstatt am Abend, Seitenansicht: Fenster mit blauer Dämmerung über der Bucht (Hügel, Kran, zwei warme Lichter, Abendschein auf dem Wasser, erste Sterne), Ziegelwand, Deckenbalken, Planregal mit Rollen, Werkzeugbrett, glimmende Esse, Werkbank mit Schubladen. Die Hängelampe schwingt leicht, ein Nachtfalter kreist, Staub im Licht. Brann steht hinter der Bank, hält eine Rolle vor der Brust und legt sie bei 4,1–4,6 s auf die Bank; die Kamera gleitet vom Fenster zur Bank (0–7,5 s) · Großaufnahme 2× im Lampenlicht: er sieht dich an, blinzelt, dann geht sein Blick nach unten auf den Plan (7,5–12 s) · von oben auf die Werkbank (Dielen, Maserung, Zirkel, Bleistift, Muttern, Hammer, Becher mit Kaffeering): Branns Unterarme kommen von gegenüber, die Hände schieben die Rolle unter einem eisernen Lineal hervor zu dir hin, nach 54 Pixeln gibt er ihr einen Schubs, den Rest rollt sie allein und läuft aus; die Hände ziehen sich zurück (12–19,5 s) · doppelte Pixelgröße: die Kamera fährt über die Zeichnung vom Fels mit der Wasserlinie über Tür, Fensterschlitze und Steinlagen bis zu Umgang, Laternenhaus mit der Lampe und Titel „LEUCHTFEUER“ (19,5–26,5 s) · harter Schnitt in die Ecke, dreifache Pixelgröße: das Schriftfeld, daneben das verblasste Siegel; die Kamera gleitet ans Siegel und bleibt stehen (26,5–32 s) · Abblende (1,2 s). Danach Dialog `brann_bauplan` an der Werkbank, der Plan liegt ausgebreitet.
- **Abweichungen von STORY.md:** Die Großaufnahme (Einstellung 2) steht nicht in STORY.md; sie ist der Platz für Branns Porträt aus `cs_npc_brann` und begründet den Schnitt auf den Tisch (sein Blick nach unten). „Brann entrollt“ und „Kamera fährt über die Zeichnung“ sind zwei Einstellungen (eine Kamerabewegung je Einstellung). Das Siegel ist das Ende der Szene, damit der Wiedererkennungs-Moment zum Prolog zuletzt steht.
- **Brann:** Porträt aus `gfx/portraits.js` unverändert, für die Szene im Lampenlicht neu eingefärbt (`evening()`: Licht von links oben in vier geditherten Stufen, warm getönt, Schatten dunkelbraun). Die Figur in der Totale ist dieselbe Bauart wie in `cs_npc_brann` (Kapseln und Ellipsen, 44×64), hier als Oberkörper hinter der Bank in vier Haltungen (Rolle halten, senken, ablegen, Hände auf dem Plan), ebenfalls mit `evening()` beleuchtet.
- **Hände von oben** (nach Max' Rückmeldung zu den Händen im Prolog): keine Kapseln mit Rauschen, sondern flache Tonstufen: Handrücken, eine helle Knöchelreihe mit Falte darunter, vier Finger als ein Block mit dunkler Fuge, runde Kuppen mit kleiner Kerbe, der kleine Finger kürzer, die Finger biegen sich über die Rolle (unten eine Stufe dunkler), der Daumen liegt getrennt an der Innenseite. Die Unterarme laufen schräg zum Bildrand (Schultern schmaler als die Hände) und werden je Bild gezeichnet; Schatten auf Papier und Holz. Die Arme reichen nur bis zum Schubs, darum rollt die Rolle den Rest allein.
- **Der Plan:** vergilbtes Papier (eigene Rampe), dunklere Ränder, Stockflecken, Wellen vom Rollen, abgerissene Ecke oben rechts, alter Wasserrand unten links, doppelter Rahmen. Leuchtturm im Aufriss mit Schraffur auf der Schattenseite, Maßlinie mit Pfeilen, Lichtstrahlen gestrichelt in rötlicher Tinte, Detail der Lampe mit Linse, Grundriss mit Wendeltreppe, Titel in einer 3×5-Pixelschrift (nur die nötigen Buchstaben), Handschrift als unlesbare Striche. Das Lampenlicht liegt fest auf Tisch und Plan (`shade()`, geditherte Stufen um den Lichtfleck), darüber flackert ein Lichtschein.
- **Siegel:** `siegel('verblasst')` aus `cutscene/motifs.js`, dieselbe Form wie das Wachssiegel auf dem Zettel im Prolog, auf dem Plan noch etwas mehr abgerieben. Es wird nach dem Lampenlicht aufgesetzt, damit die Prägung klar bleibt. Änderung im Motiv (betrifft nur diese Art, der Prolog bleibt gleich): bei `verblasst` scheint das Papier nur noch neben der Prägung durch, nicht mehr in Turm, Ring und Welle, und die tiefste Stufe ist etwas dunkler; vorher war der Leuchtturm im Siegel kaum zu erkennen.
- **Palette:** draußen Dämmerungsblau bis Abendorange, drinnen Ziegel, Holz und Eisen in warmen Stufen bis Dunkelbraun, Lampenlicht gelborange, Papier vergilbt, Tinte Sepia mit Rot für die Strahlen. Vignette dunkelbraun.
- **Leitmotive:** die Lampe (Hängelampe, Lampe im Laternenhaus und im Detail), die Wasserlinie (Bucht im Fenster, Wellen am Fels der Zeichnung), das Siegel. Der Spieler ist nicht im Bild (STORY.md nennt für diese Szene keinen Auftritt).
- **Größe und Zeit:** Bundle +21 KB (minimiert), keine Bilddateien. `setup()` rund 190–210 ms beim ersten Abspielen, ein Bild 0,04–1,8 ms, beim Entrollen bis 6 ms (Arme und Rolle je Bild).
- Spielstand-Version bleibt 17, Spielversion **0.14.0**.

### Geprüft

- **Einzelbilder** (Playwright, `tideworks.cs('cs_bauplan', t)`) bei 0,5 · 0,9 · 2,5 · 3,5 · 4,3 · 5,5 · 6,5 · 7,2 · 8,5 · 9 · 11 · 11,5 · 12,5 · 13,3 · 14 · 14,5 · 15 · 15,5 · 15,6 · 16,4 · 16,8 · 17,5 · 18,2 · 18,8 · 19,3 · 20,2 · 20,5 · 23 · 25,5 · 26,2 · 27 · 29,5 · 30 · 31 · 32,5 s und der Dialog angesehen, dazu die Hände in 8–10facher Vergrößerung; in drei Runden nachgebessert: Werkbank tiefer (Brann verschwand bis zur Brust dahinter), Großaufnahme heller, Hände neu (zuerst dünne Stangen mit Knubbel, dann Pfoten, jetzt flache Tonstufen mit Fingern, Knöcheln und Daumen), Arme nicht mehr über den ganzen Tisch (Schubs), Siegel-Einstellung 3× statt 2× und mittig, Prägung im Siegel lesbar, „T“ im Titel. Übersicht: `screenshots/bauplan/uebersicht.png`.
- **Spiel** (Dev-Server, Seed 4711): neues Spiel, Prolog mit Esc übersprungen, Flags `npc_ole`, `npc_brann`, `npc_aurel` gesetzt, `tideworks.story('fire', 'talk:brann')` → Szene im Vollbild, Spielzeit steht, Esc → Dialog, vier Zeilen mit Enter; danach Akt 2, `seen` = `cs_bauplan`, `brann_bauplan`, Weltenleuchtturm freigeschaltet (Quelle `story`). Keine Konsolenfehler.
- `npm run check:story`, `check:npc`, `check:world`, `check:coop`, `check:tree`, `npm run build`.

**Nicht geprüft:** Koop mit zwei Browsern (Ablauf unverändert), Safari/Firefox, echte Handys, das Gespräch per Klick mit einem Schiff an Branns Steg (derselbe Auslöser wie im Test, `check:story` spielt Akt 1 durch).

## Nach dem ersten Story-Test (0.15.0, Spielstand Version 18) – Entscheidungen, Abweichungen, Tests

Aufgabe: Extraktor wie der Unloader in Mindustry, Entdecker weiter und mit größerem Radius, Story-Inseln mit Namen (Minimap, Karte, Inselname) und Symbol, weniger und gebündelte Meldungen, Kamera folgt dem Schiff. Testanleitung: `docs/TEST-0.15.md`.

- **Extraktor ohne Richtung** (`rot` entfällt). Quellen sind alle angrenzenden Gebäude: Speicher aus dem Bestand, alle anderen aus `b.out` (Ausgabe), nie aus Zutaten-Puffern (`b.buf`). Ziele: Bänder und Tore nur, wenn sie **geradeaus wegführen** – ein quer vorbeilaufendes Band ist oft eines, das ins Hauptkontor liefert; hätte der Extraktor dort seitlich aufgeladen, wären Waren im Kreis gelaufen und hätten die Lieferung verstopft. Andere Logistik-Teile (Splitter, Kreuzung, Brückenband, Sortierer) nehmen nach ihren eigenen Regeln an (`offer`).
- **Kein Pendeln zwischen Speichern:** Speicher → Speicher nur aus Lagerkiste/Handelskontor ins Hauptkontor. Mindustry gleicht Speicher gegeneinander aus; hier hätte das ohne Füllstands-Logik Waren endlos hin und her geschoben.
- **Tempo:** wie bisher das Band davor, jetzt das schnellste wegführende Band (sonst `EXTRACT.building` = 2/s). Mindustry hat 11/s; das hätte die Balance der Bänder (1/2/4 Items/s) gesprengt.
- **Alte Spielstände (`migrate17`):** Ein Extraktor, vor dem ein Band quer lief (früher seitliches Aufladen), bekommt `fd` = alte Richtung und liefert dort weiter. Alle anderen alten Extraktoren arbeiten ohne Änderung, holen aber jetzt auch aus angrenzenden Produktionsgebäuden und liefern in angrenzende Gebäude, die die Ware annehmen (gewollt, wie Mindustry). **Möglicher Unterschied in alten Fabriken:** steht eine Verbrennungsanlage direkt neben einem ungefilterten Extraktor am Hauptkontor, verbrennt sie jetzt Waren aus dem Kontor. Das ist Mindustry-Verhalten; Filter setzen oder Anlage versetzen.
- **Demo-Fabrik:** Das Kohleband am zweiten Extraktor lief quer und hätte nichts mehr bekommen; es führt jetzt erst gerade weg (`data/demo.js`, zwei Bänder mehr). Headless geprüft: 48 Eisen in der Kiste nach 90 s.
- **Sprite:** schlichter Block 16×18 mit Nieten, Filterfenster in der Mitte (Farbe der Ware, ohne Filter vierfarbig). `SPR.b.extraktor` bleibt eine Liste mit vier gleichen Bildern, damit Renderer, Vorschau und Blaupausen unverändert bleiben.
- **Entdecker:** gemessen mit einem Entdecker auf „Selbst erkunden“, 15 min Spielzeit, Seeds 4711/1/99 (headless): vorher etwa 30.500 Nebel-Einheiten, weitester Punkt 266–281 Felder, Ole in 0 von 3 Läufen gefunden; mit nur größerem Radius (64) 51.000 und 352–372 Felder, Ole 1 von 3. Erst `home` 0 (statt 2) und `hop` 64 brachten den Durchbruch: **69.000–74.000, 458–488 Felder, Ole 3 von 3.** Mit `start` 600 wäre er noch weiter (bis 630, einmal Brann), fand Ole aber nur einmal; darum 450. Alle Werte in `data/ships.js`.
- **Story-Inseln:** Die Inselnamen standen schon im Spielstand (`isl[k].name`), aber Kartenansicht und Inselliste zeigten für Inseln ohne Kontor den Inseltyp („Normale Insel“). Neu `foundName(k)`; NPC-Inseln in der Kartenansicht bei jedem Zoom (andere Inseln weiter erst ab Zoom 1). Symbole 9×9 bzw. 10×9 mit Kontur (`SPR.npc.mark`).
- **Meldungen:** Die Steg-Meldung merkt sich das erste Anlegen in `story.once.steg_<npc>` (gespeichert, gehört zur Welt, also auch im Koop für alle). Bei einem fälligen Story-Schritt kommt der goldene Hinweis weiterhin jedes Mal. Bei alten Ständen erscheint der Hinweis je NPC noch einmal (bewusst keine Migration, sonst fehlte er bei entdeckten, aber nie besuchten Völkern).
  Inseln: `discovered` und `mapped` werden in der Oberfläche gesammelt (`islandNews`), nicht in der Simulation, damit Koop und Statistik unverändert bleiben. Weitere doppelte Meldungen gefunden und gebündelt: Freischaltungen einer Stufe, neue Aufträge mehrerer Völker am Morgen, abgelaufene Aufträge am Abend, erfüllte Lieferverträge am Morgen, Hafenhändler „nichts gehandelt“ (kam bei jedem Besuch, jetzt still). Allgemein: gleicher Text, solange sichtbar → Zähler ×n (fängt z. B. „Laderaum voll“, Händler-Ankündigungen, wiederholte Fehlermeldungen).
- **Vorrang:** Story (Szene, Akt, Bauplan, Ende, Steg-Hinweis mit Schritt, NPC-Insel entdeckt), Ziele und Aufträge/Verträge sind `prio`: 6,5 statt 3,6 s sichtbar und werden erst verdrängt, wenn nur noch Prio-Meldungen da sind.
- **Kamera folgt:** nur Oberfläche (`cam.follow`), nichts im Spielstand oder im Netz. Folgt der interpolierten Position (wie gezeichnet), Nachziehen mit `1 − e^(−5·dt)`; bei 6 Feldern/s bleibt die Kamera rund 20 Weltpixel hinter dem Schiff. Esc beendet zuerst das Folgen (vor Fenstern und Auswahl), damit Esc genau das tut, was die Aufgabe sagt; das Schiff bleibt ausgewählt.
- Version **0.15.0**, `SAVE_VERSION` 18.

### Geprüft

- `npm run check:extract` (neu, Seeds 4711, 1, 99, 12345): Kiste → wegführendes Band → zweite Kiste, nichts auf ein hineinführendes oder quer laufendes Band, reihum mehrere Waren, Filter, Sägewerk-Ausgabe → Kiste, nichts zurück, Kiste → Hauptkontor ja / Hauptkontor → Kiste nein, Hauptkontor → Schmelzofen und Eisen zurück, v17-Stand mit quer laufendem Band (`fd`, liefert weiter, bleibt im Spielstand), v17 mit geradem Band ohne `fd`.
- `check:story` erweitert: zweites Anlegen bei Brann ohne Story-Schritt gibt keinen Hinweis; Akt 1 bis zum Bauplan weiter grün. `check:npc`, `check:world`, `check:coop`, `check:tree`, `npm run build` ohne Fehler.
- Browser (Playwright, `dist/tideworks.html` per file://, Seed 4711, ohne Konsolenfehler): Extraktor zwischen Kiste, Sägewerk, Schmelzofen und Band (Info-Panel „Holt aus“/„Gibt ab an“, Holz kommt in der zweiten Kiste an); `reveal(160)` → eine Sammelmeldung „2 neue Inseln kartiert“; Pfahldorf und Werkstattbucht mit Symbol und Namen in Minimap, Kartenansicht und Inselliste; Entdecker anklicken → Kamera folgt (Schild unten), Zoom in der Mitte behält, Zoom am Rand / Ziehen / Taste D / Esc beenden.

**Nicht geprüft:** Koop mit zwei echten Browsern (Extraktor-Kommandos laufen wie alle über den Host, `fd` und `ex` reisen im Gebäude-Datensatz; `check:coop` grün), ein echter alter Spielstand von Max (nur ein nachgebauter v17-Stand), Safari/Firefox, Handy-Bedienung des Folgens (Touch-Ziehen beendet es wie Maus-Ziehen).

## Feinschliff Cutscenes und Dialoge (0.16.0) – Entscheidungen, Abweichungen, Tests

Aufgabe: weicher Ein- und Ausstieg, gleiches Bildformat auf jeder Bildschirmgröße, Dialogfenster erst nach der Szene, einfachere Hände bei Brann, Oles Zeile 3 ersetzt. Spielstand bleibt Version 18 (nichts Gespeichertes geändert).

- **Ablauf einer Szene** (`cutscene/player.js`): Das Spielbild blendet in 0,8 s nach Schwarz, in der zweiten Hälfte fahren die Balken ein (die Bühne hat solange einen „Schleier“: `#cine.veil` ist durchsichtig, `ui.cine = 'veil'`, die Karte wird weiter gezeichnet, Tasten bleiben gesperrt). Dann blendet die Szene in 0,7 s aus dem Schwarz auf (zusätzlich zur eigenen Aufblende der Szenen; die Zeitachsen der Szenen sind unverändert). Überspringen blendet die laufende Szene in 0,6 s ab statt hart zu schneiden. Danach der Dialog (unten) oder, ohne Dialog (Prolog), aus dem Schwarz zurück ins Spiel (0,8 s, Balken fahren dabei hinaus).
- **Prolog** hat `cold: true`: Er läuft beim Spielstart vor dem ersten Bild der Karte, darum keine Abblende eines Spielbilds (sonst sähe man 0,8 s lang die Karte); er beginnt im Schwarz wie bisher. Auch beim Wiederholen im Menü „Szenen“.
- **Dialog nach der Szene** (`ui/dialog.js`, Zeitplan `FILM`): Bild aus dem Schwarz (0,7 s), Balken fahren hinaus (0,6–1,1 s), erst dann fahren Kasten, Porträt und Namensschild ruhig von unten ein (1,0–1,7 s), Name und Text erscheinen, wenn der Kasten steht, der Text beginnt 0,3 s danach. Klicks während des Einfahrens zählen nicht. Am Ende fährt der Kasten hinaus (0,45 s), das Bild blendet ab, dann zurück ins Spiel. Dialog über der Karte (`OVER`) wie bisher (Kasten 0,6 s, ohne Blenden).
- **Ursache „Name fliegt durchs Bild“:** `.cine-name` war per CSS `display:flex` und blieb dadurch trotz `hidden` sichtbar, mit dem Namen des letzten Dialogs; beim nächsten Dialog stand der alte Name vor dem einfahrenden Kasten. Jetzt `.cine-ov[hidden]{display:none !important}` und der Name wird beim Ausblenden geleert. Zusätzlich zeichnet der Dialog in der Szene nichts mehr, bevor die Balken weg sind.
- **Bildformat** (`cutscene/stage.js`): Szenen zeichnen in ein 320×180-Bild (`stageScene()`, nicht im DOM; der `ctx` in `draw`/`dialogBg` ist dieses Bild, für die Szenen ändert sich nichts). Das sichtbare Canvas `#cineCv` hat das Seitenverhältnis des Fensters und wird mit krummem Faktor hochskaliert (`image-rendering: pixelated`, Nearest Neighbour), das 16:9-Bild liegt mittig darin:
  - breiter als 16:9: Breite füllt, oben und unten beschnitten; 16:9: genau (1280×720 = 4×, 1920×1080 = 6×, 2560×1440 = 8×, 1366×768 = 4,27×); schmaler: Höhe füllt, links und rechts beschnitten, höchstens bis 270 von 320 Pixeln (16:10 → 288, 3:2 → 270). Noch schmaler (5:4, 4:3, Handy hochkant) kommt oben und unten Schwarz dazu; das wirkt wie höhere Balken, sonst würde zu viel vom Bild fehlen.
  - Die Balken legt die Bühne darüber (`stageBars`), immer 16/180 der Bildhöhe (gemessen: 64 px bei 720, 96 bei 1080, 128 bei 1440, 80 bei 1440×900, 96 bei 2560×1080). Szenen mit `bars: false` bekommen keine.
  - Der Dialogkasten steht am unteren linken Rand des sichtbaren Bilds (`boxRect()`, bei 16:9 wie bisher x 50, y 128, 266×48; bei beschnittenem Bild schmaler). Namensschild und Text (DOM) setzt `fit()` in Bildschirm-Pixeln, Schriftgrößen über `--px` (Bildschirm-Pixel je Bühnen-Pixel) statt `cqw`.
  - Krummer Faktor heißt: Bei z. B. 1366×768 sind manche Pixel 4, manche 5 Bildschirm-Pixel breit. Scharf bleiben sie (keine Glättung); bei den üblichen 16:9-Größen ist der Faktor ganzzahlig.
- **Koop:** Ablauf unverändert (Ereignis an alle, Host hält an, nur Host überspringt). Die Option `skipNow` (Host hat schon übersprungen, bevor die Szene beim Mitspieler startet) wurde bisher vom Player ignoriert; jetzt geht es dann nach dem Einblenden direkt in den Dialog. Die Simulation läuft weiter, sobald der Host den Dialog geschlossen hat und das Bild zurückblendet.
- **`prefers-reduced-motion`:** keine Blenden, direkt in den Dialog, Kasten ohne Einfahren, Schließen ohne Rückblende.
- **Brann, Hände:** Arme, Hände und Lappen liegen in der Figur (`cs_npc_brann`, `cs_bauplan`) auf einer eigenen Ebene mit eigener dunkler Kontur, sonst verschwimmen sie mit Schürze und Hemd. Hände sind kompakte Fäuste 4×4 ohne Finger. In `cs_npc_brann` hält er einen verwaschen blauen Lappen (neue Farbe gegen Braun und Beige): beim Abwischen reibt er die Hände im Lappen, sonst hängt der Lappen aus der rechten Hand; beim Hämmern hält er Hammer und Zange. STORY.md: „wischt die Hände an einem Lappen ab“ statt „an der Schürze“.
- **Brann, Porträt:** die verschränkten Arme (wirkten als hautfarbener Balken) sind weg; stattdessen hängt der Lappen über seiner linken Schulter vorn herab, mit eigener Kontur. Keine Hände mehr im Porträt (wie bei Aurel). Gilt für Großaufnahme, Dialog und `cs_bauplan` (dort im Lampenlicht).
- **Bauplan, Unterarme von oben:** kräftiger (Radius 5,8 → 4,8 statt 5,4 → 4) und oben im aufgekrempelten Ärmel (Hemd im Lampenlicht, helle Krempe), die letzten 24 Pixel vor dem Handgelenk sind nackt. Die Hände selbst (flache Tonstufen mit Fingern) sind unverändert. Die Figur hinter der Bank hat dieselben Fäuste mit Kontur.
- **Oles Zeile 3** ersetzt durch zwei Zeilen („Mein Vater hat da unten Korn gesät. Heute werfe ich dort meine Netze aus.“ / „Keiner hat uns gewarnt. Die Lampe blieb dunkel.“), `ole_1` hat jetzt sieben Zeilen; STORY.md angepasst. Die Referenz `docs/cutscenes/rauch-hinter-dem-nebel.html` bleibt beim alten Text (Referenz für die Technik).

### Tests

- **Einzelbilder** `tideworks.cs('cs_npc_brann', t)` bei 10,3 · 15 · 18 · 19 · 19,5 · 20,5 · 22 · 24 · 30 s und `cs_bauplan` bei 2 · 4,5 · 9 · 13 · 15 · 17 · 18,5 s, Hände 5–6fach vergrößert angesehen (`screenshots/feinschliff/`).
- **Ablauf im Spiel** (Dev-Server, Seed 4711, 1280×720, Bildschirmfotos der ganzen Seite): Prolog beginnt im Schwarz, Esc blendet ab und dann zurück ins Spiel; `story('fire', 'discover:ole')`: Karte dunkelt ab, Balken fahren ein, Szene blendet auf, Esc blendet ab, Dialog: erst nur Bild, Balken fahren hinaus, dann Kasten mit Porträt und Namensschild, Text danach; sieben Zeilen mit Enter, Kasten fährt hinaus, Abblende, Karte blendet auf. Kein Name ohne Kasten mehr. `seen` gesetzt, Zeit läuft wieder. Keine Konsolenfehler.
- **Größen** 1280×720, 1920×1080, 2560×1440, 1366×768, 1440×900, 1000×800 (schmales Fenster), 2560×1080, 390×844: Szene und Dialog, Balkenhöhe auf dem Bildschirm gemessen (oben), Text und Namensschild sitzen im Kasten.
- **Koop mit zwei Browsern** (lokaler PeerServer, Gemeinsame Insel): Szene startet bei beiden mit Abblende, Spielzeit steht beim Host, Esc beim Mitspieler wirkt nicht, Esc beim Host bringt beide in den Dialog, nach dem Dialog des Hosts läuft die Zeit, der Mitspieler liest weiter und schließt selbst. Keine Konsolenfehler.
- Dialog über der Karte (`ole_idle`) und `prefers-reduced-motion` (direkt im Dialog, danach sofort zurück).
- `npm run check:story`, `check:npc`, `check:coop`, `check:world`, `check:tree`, `check:extract`, `npm run build`.

- **Nachtrag (Max' Rückmeldung):** Nach dem natürlichen Ende einer Szene blieb der Bildschirm schwarz. Ursache: In `ui/dialog.js` wurde `film` vor seiner Deklaration benutzt (spät eingefügte Startpause des Texts), `showDialog` brach mit einem Fehler ab und die Bühne blieb schwarz offen. Meine Abläufe davor liefen mit Überspringen und vor dieser Änderung. Behoben und erneut geprüft: Szene bis zum Ende laufen lassen, Überspringen, Koop, Dialog über der Karte, reduzierte Bewegung, dist/tideworks.html; keine Konsolenfehler.
- **Nachtrag 2 (Max: „Hände im Bauplan gehören nicht zum Arm“):** Die Hand von oben hatte ihre eigene Außenkontur, dazu kam die gemeinsame Kontur; am Handgelenk lag dadurch eine dunkle Naht, und die Hand hatte einen doppelt dicken Rand, der Arm nicht. Jetzt wird die Außenkontur der Hand beim Einsetzen weggelassen (innere Linien wie am Daumen bleiben), der Arm reicht 3 Pixel weiter ins Handgelenk und ist dort etwas breiter (Radius 5,2 statt 4,8). Arm und Hand haben eine gemeinsame, gleich dicke Kontur. Einzelbilder 13 · 15 · 17 · 18,5 s, `screenshots/feinschliff/bauplan-arme.png`.
- **Nachtrag 3 (harter Übergang am Handgelenk):** Der Unterarm war mit Bayer-Raster schattiert, der Handrücken in flachen Stufen. Jetzt hat der Unterarm dieselben flachen Stufen quer zum Arm mit denselben Schwellen wie `buildHand` (hell links, beim gespiegelten rechten Arm rechts), Haare nur noch vereinzelt und nicht am Handgelenk. Das Hemd behält das Raster.

**Nicht geprüft:** Safari/Firefox, echte Handys, ein Fenster mit 4:3.

## Extraktor: parallele Bänder und Ausgleich (0.17.0, Spielstand Version 18) – Entscheidungen, Abweichungen, Tests

Aufgabe: Extraktor gibt auch auf parallel bzw. seitlich anliegende Bänder aus (nicht auf hineinzeigende) und gleicht wie der Unloader in Mindustry zwei Gebäude mit derselben Ware aus (ab 2 Items Unterschied, reihum mit der Band-Ausgabe, Filter gilt für beides). Testanleitung: `docs/TEST-0.17.md`.

- **Parallele Bänder:** Ausgang ist jedes angrenzende Band/Tor mit `t.d !== Gegenrichtung`. Das alte Risiko aus 0.15.0 (ein quer laufendes Band liefert ins Hauptkontor, der Extraktor lädt dort auf → Waren im Kreis, Lieferung verstopft) ist jetzt gezielt abgefangen statt pauschal: `beltEnd` verfolgt den Strang (Bänder und Tore geradeaus, höchstens 256 Teile, gecacht mit den Nachbarn je `topoVer`) bis zum ersten Gebäude; mündet er in die Quelle (bzw. ein Hauptkontor derselben Insel, wenn die Quelle ein Hauptkontor ist), gibt diese Quelle dort nichts aus. Andere Quellen schon (Kiste → Extraktor → vorbeilaufendes Band → Hauptkontor ist sinnvoll). Strang über Splitter/Sortierer/Kreuzung wird nicht weiter verfolgt (dort entscheidet der Spieler bewusst, wohin es geht).
- **Demo-Fabrik geprüft:** Der Eisenerz-Extraktor am Kontor hat ein solches quer laufendes Band ins Hauptkontor neben sich (Kohlelinie); dank `loopsBack` bleibt es sauber. Headless wie vorher 48 Eisen in der Kiste nach 90 s.
- **`b.fd`** (alte Extraktoren aus v17 mit quer laufendem Band) ist damit überflüssig, bleibt aber im Spielstand und schadet nicht; keine Migration nötig.
- **Ausgleich:** Füllstand = Menge / Kapazität je Ware (`balStock`): Rezept-Gebäude → Zutaten-Puffer des aktiven Rezepts (`inCap`), Bohrer → Schmiermittel, Dampfkraftwerk → gemeinsamer Brennstoff-Puffer, Lagerkiste/Handelskontor → Bestand (`storeCap`). Verschoben wird ein Item nur, wenn die Quelle danach noch mindestens so voll ist wie das Ziel: (n−1)/cap ≥ (m+1)/cap'. Bei gleicher Kapazität genau „mindestens 2 Items Unterschied“; bei verschiedenen Kapazitäten (Kiste 300, Handelskontor 400) die sinngemäße Verallgemeinerung. Jeder Schritt senkt Σ n²/cap streng, darum kann es auch mit drei und mehr Gebäuden nicht im Kreis laufen.
- **Abweichung / Entscheidung:** Ausgleich nur zwischen gleichartigen Lagern (Puffer ↔ Puffer, Speicher ↔ Speicher). Ofen-Puffer → Kiste hätte mit der bestehenden Regel Kiste → Ofen sofort gependelt. **Neu:** Kiste ↔ Kiste und Kiste ↔ Handelskontor gleichen sich jetzt aus (bisher gar nicht); Kiste → Hauptkontor bleibt einseitig und vollständig, Hauptkontor → Kiste weiter nie (Hauptkontor nimmt am Ausgleich nicht teil). So bleibt das bisherige Verhalten am Hauptkontor genau gleich.
- **Reihum:** Kandidatenliste [Quelle, Ware, Ausgleich?] – Ausgabe aus Bestand/`b.out` und Ausgleich aus dem Lager wechseln sich über `b._ri` ab, Ziele über `b._ro`. Ausgleichs-Kandidaten gibt es nur, wenn mindestens zwei Gebäude anliegen.
- **Hinweis aus dem Test:** Kommen Kohle *und* Erz gemischt auf einem Band in Ofen 1, kann das Band trotzdem stehen bleiben (Kohle vorn, Ofen 1 mit Kohle voll, Ofen 2 nur 1 weniger → kein Ausgleich). Das ist der bekannte Stau gemischter Bänder vor einem Rezept-Gebäude, nicht der Extraktor; mit getrennter Erzzufuhr oder Filter läuft es.
- Info-Panel/Beschreibung angepasst („Band, das nicht hineinzeigt“, Ausgleich erwähnt). Kein neues Feld im Spielstand, `SAVE_VERSION` bleibt 18. Version **0.17.0**.

### Geprüft

- `npm run check:extract` (Seeds 4711, 1, 99, 12345) erweitert: paralleles Band liefert in die zweite Kiste; Band hineinzeigend bekommt nichts; Band am Extraktor vorbei ins Hauptkontor bekommt nichts aus dem Hauptkontor, Kiste → Hauptkontor läuft weiter; zwei ruhende Öfen 8/0 → 4/4, 5/4 bleibt, Filter Eisenerz verschiebt keine Kohle; zwei Öfen mit Kohle nur über Ofen 1: Ofen 2 arbeitet 114 von 120 s, Kohle-Unterschied höchstens 2, Eisen beider Öfen kommt über das Band an; zwei Kisten 41/0 → 21/20 und dann Ruhe; alle alten Fälle (Filter, Rückweg, Speicher → Hauptkontor, Migration v17) weiter grün.
- `check:story`, `check:npc`, `check:world`, `check:coop`, `check:tree`, `npm run build` ohne Fehler; Demo headless unverändert.
- Browser (Playwright, `dist/tideworks.html` per file://, ohne Konsolenfehler): Extraktor am Hauptkontor mit Filter Holz, darunter ein quer laufendes Band zu einer Kiste → Holz kommt an, Band wird als Kurve aus dem Extraktor gezeichnet; Hauptkontor → Extraktor (Kohle) → Ofen 1 → Extraktor → Ofen 2 → beide Öfen 5/4 Kohle. Bilder: `screenshots/extraktor-ausgleich/`.

**Nicht geprüft:** Koop mit zwei Browsern (nur Simulation, läuft im Host; `check:coop` grün), echte alte Spielstände von Max, Safari/Firefox.


## Leuchtturm-Stufen, Akt 2 und cs_licht_im_wind (0.18.0, Spielstand Version 18) – Entscheidungen, Abweichungen, Tests

Aufgabe: Leuchtturm als Story-Gebäude mit vier sichtbaren Stufen und Baustelle, Akt 2 mit Aurels Dialog und Ziel „Baue den Leuchtturm aus“, Übergang zu Akt 3 mit `cs_licht_im_wind`, Dialog Brann und Bauplan Taucherglocke (nur Freischaltung und Platzhalter). Testanleitung: `docs/TEST-AKT2.md`.

- **Bestand vorher:** Leuchtturm war schon einmalig, auf der Heimatinsel, freigeschaltet durch `cs_bauplan`/`akt1_ende` (beibehalten). Stufen wurden im Info-Panel beauftragt und sofort aus dem Inselinventar (plus Münzen) bezahlt; Freigabe nach Akt (`WONDER_ACT`).
- **Baustelle statt Sofortkauf** (`sim/wonder.js`): „Baustelle für Stufe N eröffnen“ → der Turm sammelt die Waren der Stufe in `wonder.got`. Zwei Wege, passend zu den bestehenden Mechaniken: **Bänder** liefern hinein wie in jedes Gebäude (`accept` in `sim/logistics.js`, nur Waren, die noch fehlen; Extraktoren daneben gehen damit auch), und **Inselinventar** mit Schalter im Info-Panel (Standard an), höchstens `WONDER.pull` = 12 Stück je Sekunde, alle Waren zusammen. Sind alle Waren da, läuft die Bauzeit (120 s) mit Gerüst, danach ist die Stufe fertig. Die Mengen sind absichtlich größer als ein Hauptkontor fasst; deshalb sammelt die Baustelle nach und nach statt auf einmal abzubuchen.
- **Keine Münzen mehr** in den Stufen (Münzen gehören zum alten Endgame; in Akt 2 hat man kaum welche). Ruhm 0 wie seit Version 16. Kosten, Sichtweite und Freigabe stehen in `data/wonder.js`.
- **Freigabe:** Stufe 1 und 2 ab Akt 2, Stufe 3 nach Flag `karte_gefunden`, Stufe 4 nach Flag `pumpe_gefunden` (statt Akt 4/5). Gesperrte Stufen zeigen im Panel „???“ und „Wird später freigeschaltet“, ohne Namen und Kosten. Ohne Geschichte (Getrennte Inseln, alte Welten) und mit `alt_turm` sind alle Stufen offen wie bisher.
- **Sichtweite:** fertige Stufe deckt den Nebel um den Turm auf (40 / 60 / 85 / 115 Felder, der größte Wert zählt). Der Nebel ist im Spielstand, deshalb wird nur beim Fertigstellen einmal aufgedeckt (und beim Debug-Setzen); in Koop für den Besitzer des Turms.
- **Optik** (`gfx/sprites/endgame.js`, `makeLighthouse`): Stufe 1 Ringmauer mit Torbogen und Baumaterial; Stufe 2 Sockel, gemauerter Schaft, eiserne Galerie, leerer Eisenrahmen der Lampenkammer, Gerüst, Leiter, Kran mit Haken; Stufe 3 dunkles Glas, Linse, Geländer, Plane statt Dach, Gerüstrest; Stufe 4 rot-weiße Bänder, Kupferkuppel, Wetterfahne, Wärterhaus, Tür mit Laterne, Fahne. **Lampe in allen Stufen dunkel.** Leuchtend (`SPR.b.leuchtturmLit`, Lichtstrahl, Nachtschein) nur bei Stufe 4 *und* Ende A (`choice === 'a'`) bzw. ohne Geschichte. Während die Baustelle sammelt, stehen Kisten der gelieferten Waren davor.
- **Akt 2:** Auslöser `akt2_aurel` (`trade:aurel`, Akt 2, einmal) zeigt `aurel_turm` aus STORY.md über der Karte. Story-Zeile in Akt 2: „Baue den Leuchtturm aus: …“ mit Stufe und Anteil der gelieferten Waren.
- **Übergang:** Stufe 2 fertig → `storyEvent('wonder', 2)` → `akt2_ende`: `cs_licht_im_wind` → Dialog `brann_glocke` → Flag `plan_glocke`, Freischaltung `glocke` (Quelle Story, „Bauplan Taucherglocke“) → Akt 3. Hinweis-Toast danach.
- **Taucherglocke noch nicht gebaut:** `SOON` in `data/unlocks.js`; nach der Freischaltung steht im Baumenü (Schifffahrt) ein Platzfeld „Taucherglocke“ mit Marke „bald“, Tooltip „Taucherglocke (kommt bald)“, Klick zeigt nur einen Hinweis. `unlockErrors` überspringt `SOON`-Schlüssel (kein Gebäude dazu). Nächster Thread: Gebäude `glocke` anlegen und den Eintrag aus `SOON` entfernen.
- **Cutscene `cs_licht_im_wind`** (34,2 s, nach NOTES „So baut man eine neue Cutscene“): (1) 0–8 s Abenddämmerung weit: halber Turm auf der Landzunge, Fabrik-Silhouetten, Sonne mit Glitzerbahn, Kranhaken schwingt im Wind, Möwen; (2) 8–17 s Kamera fährt langsam am Turm hoch bis zum leeren Rahmen der Lampenkammer, oben auf der Galerie die **kleine Spielerfigur im grünen Mantel** (17 px, Messingknöpfe, helle Haarsträhne, Mantel weht in drei Bildern); (3) 17–25,5 s Branns Boot legt am Steg an, Laternen, er hält die Rolle unter dem Arm und hebt sie dann; (4) 25,5–33 s der Plan der Taucherglocke auf den Stegplanken, langsamer Schwenk (Titel, Kette, Bullaugen, Ballast, Schlauch, Querschnitt, Branns Zahnrad-Zeichen); (5) Abblende. Weicher Einstieg, Balken und Dialog erst nach der Szene über den Player wie bei den anderen; ruhiges Tempo (lange Einstellungen, langsame Fahrten). Dialoghintergrund: Steg mit Brann, Rolle gehoben.
- **Koop:** Getrennte Inseln hat keine Geschichte → alle Stufen offen, kein Story-Auslöser; Wettstreit und `wonderNews` unverändert. Neue Befehle `wonderStore` (Besitzer) und `wonderDebug` (`HOST_ONLY`). Neue Felder `got`, `lager`, `acc` stecken im Schnappschuss, Mitspieler sehen Baustelle und Fortschritt.
- **Alte Spielstände:** `got: null` heißt „alles geliefert“; eine laufende Bauphase aus 0.17 baut einfach zu Ende. Kein Migrationsschritt, `SAVE_VERSION` bleibt 18. `check:world` vergleicht den Spielstart ohne die neuen Felder.
- **Debug:** `tideworks.wonder()` Zustand · `wonder(n)` n Stufen fertig (mit Sichtweite) · `wonder(2, 'fire')` dazu Auslöser → Szene, Dialog, Akt 3 · `wonder(1, 'site')` Baustelle Stufe 2 mit allen Waren · `wonder(1, 'half')` mit der Hälfte. Nur Host.
- Version **0.18.0**.

### Geprüft

- `npm run check:wonder` (neu): Baustelle, Lieferung per Band (nur fehlende Waren), Inselinventar an/aus mit 12/s, Freigabe nach Akt/Flags, Sichtweite, Aurel einmal in Akt 2, Stufe 2 → Szene → Akt 3 mit `glocke`, Speichern/Laden, Spiegel beim Mitspieler, Debug, alte Bauphase. Dazu `check:story`, `check:npc`, `check:coop`, `check:world`, `check:tree`, `check:extract`, `npm run build` grün.
- **Einzelbilder** der vier Stufen (vergrößert, Tag und Nacht) und der Szene bei vielen Zeitpunkten, Plan einzeln in 2×: `screenshots/leuchtturm-stufen/`, `screenshots/licht-im-wind/`.
- **Im Browser** (Seed 4711): Leuchtturm gesetzt, Baustelle eröffnet, Kisten sichtbar, Panel mit Fortschritt; alle vier Stufen auf der Karte; `wonder(2, 'fire')`: Abblende → Szene → Dialog (3 Zeilen) → Akt 3, `seen` enthält Szene und Dialog, `unl.glocke = 'story'`; Baumenü mit „bald“-Feld, Tooltip, Hinweis. Keine Konsolenfehler.

**Nicht geprüft:** Koop mit zwei Browsern (nur `check:coop` und der Spiegel-Test), ein komplett ehrlich durchgespielter Akt 2 ohne Debug (Mengen fürs Balancing sind Startwerte), Safari/Firefox.

## Taucherglocke und Tauchspots (0.19.0, Spielstand Version 18) – Entscheidungen, Abweichungen, Tests

Aufgabe: Teile der Taucherglocke bei Ole und Brann ab Akt 3 (statt der Platzhalter aus Thread 4), Oles Dialog beim ersten Kauf, Glocke einmalig in der Werft an ein Schiff montieren (sichtbar am Schiff, Symbol, Aktion „Tauchgang starten“), immer genau ein Tauchspot mit Blasen und Minikarten-Symbol, vorläufiger Tauchgang mit Beutetabelle und Schnittstelle fürs Minispiel, Story-Zeile und Zähler, Koop über den Host. Testanleitung: `docs/TEST-TAUCHEN.md`.

- **Ersetzte Platzhalter:** `SOON` in `data/unlocks.js` heißt jetzt `WERFT_SLOTS` (Feld im Baumenü mit Marke „Werft“/„dran“, Klick wählt die nächste eigene Werft); die `{ soon: 'Teil der Taucherglocke' }`-Einträge bei Ole und Brann sind echte Waren; der Toast nach `cs_licht_im_wind` sagt nicht mehr „kommt bald“.
- **Neue Waren** (`data/items.js`): `glockenseil` (Ole, 300), `glockenhaube` „Messingglocke mit Bullauge“ (Brann, 800), `schrott` (aus Tauchgängen, Grundpreis 4, Brann kauft ihn). Symbole in `gfx/sprites/items.js`.
- **Teile ab Akt 3 bei jeder Rufstufe** (neue Felder `act` und `part` im Angebot, `sellOpen` in `sim/npc.js`). Abweichung: Der Platzhalter verlangte Ole „vertraut“ (Ruf 80). Das hätte den Akt hinter langes Handeln gesperrt; Brann sagt in der Szene, die Teile gibt es bei ihm und Ole. Vorher unsichtbar (keine Vorschau auf die Geschichte), nach der Montage wieder weg. Vorrat 1, kommt alle 10 min nach (falls ein Teil über Bord geht).
- **Oles Dialog:** Auslöser `akt3_ole` hört jetzt auf `buy:glockenseil` (vorher jeder Handel mit Ole in Akt 3). `npcBuyTo` ruft `storyEvent(g, 'buy', Ware)` für Glockenteile.
- **Montage statt Gebäude:** Kein Gebäude `glocke`. Die Werft zeigt den Abschnitt „Taucherglocke“: Teile aus dem Inselinventar der Werft-Insel, das Schiff muss am Werft-Anleger liegen (`BELL.range` = 4 Felder, Knopf „Herholen“ schickt es hin). Kommando `mountBell`. Einmal je Welt (`state.dive.bell`), das Schiff trägt `s.bell = 1`.
- **Optik:** Kleiner Kran am Heck (Pfosten, Ausleger, Kette), die Glocke (`SPR.bellHang`) schaukelt leicht, je Schiffsart eigene Lage (`RIG` in `gfx/renderer.js`). Beim Tauchen ist die Glocke unten: Kette ins Wasser, Ringe und Blasen. Glocken-Symbol `SPR.icon.bellS` in Info-Panel und Flotte, gelber Strich auf der Minikarte.
- **Tauchspot** (`sim/dive.js`, Zahlen `data/dive.js` `DIVE`): genau einer in `state.dive.spot`. Zufälliger Platz in aufgedeckten Chunks des Glocken-Besitzers, Meer mit `coast` = 6 Feldern Wasser rundum und `edge` = 10 Feldern aufgedeckt rundum („Kartenrand“ = Rand des Nebels, die Welt ist unendlich), möglichst 40–420 Felder von der Heimatinsel (sonst überall). Erster Spot 8 s nach der Montage, danach Pause `pause` = 120–180 s. Findet sich kein Platz, wird alle 5 s neu gesucht. Spot-Arten `SPOT_KINDS` normal/story; `queueStorySpot(g, find)` macht den nächsten Spot zum Story-Spot (Fund → `find:<find>`), noch von nichts benutzt.
- **Blasen** (`drawBubbles`): dunkler Fleck, zwei Ringe, 9 Blasen in drei Größen, große zerplatzen oben. Minikarte und Karte (M): `SPR.icon.bubbles` mit Ring. Keine Zielmarke beim Erscheinen (verdeckte die Blasen).
- **Tauchgang und Schnittstelle:** Kommando `diveStart` (Schiff steht still höchstens `over` = 2,5 Felder vom Spot) → `state.dive.busy`, Ereignis `diveStart` an alle. Nur auf dem Rechner des Tauchers ruft `ui/dive.js` `startDive(spot, info)` → `{ ok, found }` und schickt `diveEnd`. Das Minispiel hängt sich mit `setDiveGame(fn)` ein; bis dahin `placeholderDive` (Meldung, 5 s). Die Beute würfelt immer der Host (`DIVE_LOOT`), das Minispiel entscheidet nur „gefunden ja/nein“. Beute zuerst in den Laderaum, Rest ins Lager der Heimatinsel des Schiffsbesitzers (bis zur Kapazität), wie Funde auf See.
- **Story:** Zeile Akt 3 „Baue die Taucherglocke … (n/2 Teile im Lager)“, danach „Folge den Blasen … (n Tauchgänge)“. `state.story.dives` zählt erfolgreiche Tauchgänge (für die Karte der alten Welt, später). Der vorhandene Auslöser `abstieg` (`dive`) feuert beim ersten erfolgreichen Tauchgang: Platzhalter-Meldung der Szene `cs_abstieg` und Branns Dialog. Hinweis für den Minispiel-Thread: `cs_abstieg` zeigt den Abstieg und passt eher **vor** das erste Minispiel.
- **Koop:** `state.dive` gehört zur Welt, geht als `TOP`-Schlüssel an die Mitspieler (nur bei Änderung). Montage, Start und Ende sind normale Kommandos über den Host; `diveDebug` ist `HOST_ONLY`. Es taucht immer nur einer (`busy`); die anderen bekommen „… taucht gerade“. `diveEnd` zählt nur vom Taucher selbst. Hängt ein Tauchgang länger als `timeout` = 240 s (Fenster zu, Verbindung weg), bricht der Host ab, der Spot bleibt. Getrennte Inseln haben keine Geschichte, also keine Teile; mit Debug läuft es trotzdem (Spot im Nebel des Glocken-Besitzers).
- **Speichern:** `state.dive` neu, ältere Stände bekommen den leeren Zustand (`cleanDive`), `s.bell` wird beim Laden aus `dive.bell` gesetzt (`syncBell`), ein laufender Tauchgang wird nicht gespeichert. `SAVE_VERSION` bleibt 18. `check:world` vergleicht den Spielstart ohne `dive`.
- **Debug:** `tideworks.dive()` · `dive('parts')` · `dive('mount', id)` · `dive('spot')` · `dive('over')` · `dive('story', 'karte')` · `dive('reset')`.
- Version **0.19.0**.

### Geprüft

- `npm run check:dive` (neu) mit Seeds 4711, 1, 99, 12345, 2024: Teile erst ab Akt 3, Kauf bei Ole mit Dialog genau einmal, Brann ohne Dialog, Montage abgelehnt ohne Teile und fern vom Anleger, Montage verbraucht die Teile, nur einmal, danach kein Angebot mehr, Story-Zeilen, erster Spot nach 8 s mit Abstand zu Land und Nebel, nur einer, Tauchgang nur darüber, zweiter gleichzeitig abgelehnt, fremdes `diveEnd` ignoriert, Beute im Laderaum bzw. in der Heimatinsel, Zähler, Pause 120–180 s, neuer Spot, ohne Fund keine Beute, Abbruch nach Zeit, Story-Spot mit `find:karte`, Speichern/Laden (auch Stand ohne `dive`), Spiegel eines Mitspielers, Debug nur Host, Getrennte Inseln.
- `check:story`, `check:npc`, `check:coop`, `check:world`, `check:tree`, `check:extract`, `check:wonder`, `npm run build` grün.
- **Einzelbilder** (Playwright, Dev-Server, Seed 4711, ohne Konsolenfehler): Blasen über 6 Zeitpunkte, Glocke am Schiff oben und beim Tauchen, Schiffs-Panel mit „Tauchgang starten“, Oles Dialog nach dem Kauf, Völker-Fenster, Werft-Panel, Baumenü. `screenshots/taucherglocke/`.
- Im Browser einmal ganz: Kauf bei Ole → Dialog, Glocke per Debug, Spot, über den Spot, Tauchgang per Kommando → Beute, Zähler 1, Szene „Abstieg“ (Platzhalter) und Branns Dialog gesehen.

**Nicht geprüft:** Koop mit zwei echten Browsern (Weg über Kommandos und Spiegel headless geprüft), „Herholen“ mit echter Fahrt zur Werft im Browser (headless ja), Balancing von Preisen und Beute.

## Tauch-Minispiel und Szene „Abstieg“ (0.20.0, Spielstand Version 18) – Entscheidungen, Abweichungen, Tests

Aufgabe: Minispiel für `setDiveGame` (Seitenansicht 320×180 im Cutscene-Stil, Luft, Aufgaben Suchen und Aufschweißen, Ergebnis), Szene `cs_abstieg` vor dem allerersten Tauchgang, Karte der alten Welt nach einigen Tauchgängen. Testanleitung: `docs/TEST-TAUCHSPIEL.md`.

- **Ansicht:** eigene Bühne in `#cineStage` (wie Szenen: `stageOpen`/`stageScene`/`stageClose`, feste Balken, weiche Blenden). Bild `src/divegame/art.js` (Paletten, Taucher in Einzelbildern mit Messinghelm, Glocke, Fische, Gegenstände), `src/divegame/world.js` (Wasser mit Dither, Lichtstrahlen, ferne Ruinen, Sand, Steine/Schrott, Mauerrest, Haufen, Kiste/Wracktür, Seegras). Steuerung, Teilchen, Schlauch (Verlet-Seil, 22 Punkte), HUD und Ergebnisfenster `src/ui/divegame.js`. HUD-Texte als DOM über dem Bild (scharf auf jedem Bildschirm); die Luftleiste wird ins Bild gezeichnet, am sichtbaren Ausschnitt ausgerichtet (Ultrabreit/Handy).
- **Steuerung:** Klick = hinschwimmen, WASD/Pfeile, Leertaste/E = graben bzw. schweißen. Maus halten auf Haufen/Naht wirkt direkt. Esc zweimal = auftauchen (ohne Hauptbeute). Tasten im Capture-Modus, damit Kartentasten (M, K, …) während des Tauchgangs nichts auslösen.
- **Luft** 35 s (`DIVE_GAME.air`), ab 25 % rot blinkend, roter Herzschlag-Rand (schneller bei weniger Luft). Aufgabe groß am Anfang, dann klein oben rechts.
- **Suchen:** Haufen je Akt (`byAct`: 5–6 / 6–7 / 7–8). Halten oder Klicks graben (`dig`, `click`), Staubwolke, Haufen in 4 Stufen. Ziel glitzert alle 2–3 s und lässt Blasen aufsteigen; sonst Kleinkram (`DIVE_JUNK`, Chance `junkChance`) oder nur Sand.
- **Aufschweißen:** Kiste (∩-Naht) oder Wracktür (Naht um die Tür), Länge je Akt 110/140/170 px. Abweichung von der Naht > `tol` = 6 px stoppt; höchstens `weld` = 34 px/s. Mit der Tastatur folgt der Brenner der Naht von selbst, der Taucher muss nah bleiben. Funken, Naht glüht weiß → rot → Spalt, Klappe fällt/Tür springt auf. Drei Armhaltungen, damit der Brenner auch tiefe Nahtstellen erreicht.
- **Ende:** Erfolg → Ergebnisfenster wartet auf `diveResult` des Hosts (Hauptfund, Beute aus `DIVE_LOOT`, Kleinkram, wohin es ging). Luft leer → Abblende, keine Hauptbeute, gefundener Kleinkram bleibt. Die Fabrik läuft weiter (Zeit wird nur während `cs_abstieg` im Einzelspiel angehalten).
- **Kleinkram über den Host:** `diveEnd` trägt `junk`; der Host nimmt nur Waren aus `DIVE_JUNK`, begrenzt je Ware auf ihr Maximum und höchstens so viele Einträge wie Haufen (`cleanJunk`). Kleinkram zählt auch bei leerer Luft.
- **`cs_abstieg`** (`src/cutscenes/cs_abstieg.js`, 35 s, 5 Einstellungen nach STORY.md): Abstieg unter dem Rumpf · Bullauge von innen mit verzerrter Spiegelung des Spielers (Fischauge, dunkles Haar mit heller Strähne, grüner Kragen) · Fischschwarm teilt sich · Schwenk über die versunkene Stadt im Lampenlicht · Wegweiser „ZU DEN BERGDÖRFERN“ (neue 3×5-Schrift `src/cutscene/glyphs.js`). **Abweichung:** spielt jetzt **vor** dem ersten Minispiel (statt nach dem ersten erfolgreichen Tauchgang). Der Host merkt `seen.cs_abstieg` schon beim Start; das Ereignis `diveStart` trägt `intro`. Branns „Die Glocke hält. …“ kommt über den neuen Auslöser-Typ `surface` nach dem ersten Tauchgang, auch ohne Fund.
- **Karte der alten Welt:** In Akt 3 ohne Flag `karte_gefunden` und ab `karteAfter` = 3 erfolgreichen Tauchgängen macht `karteDue` den nächsten Spot zum Story-Spot `karte` (ein liegender normaler Spot wird ersetzt). Dort immer Suchen mit Ziel „Alte Karte“. Fund → Flag, Story-Zeile „Bring die Karte zu Brann.“. Bei leerer Luft kommt die Karte beim nächsten Spot wieder. `cs_alte_karte` bleibt Platzhalter (Meldung beim Gespräch mit Brann, dann sein Dialog und Akt 4).
- **Koop:** Nur der Taucher sieht Szene und Minispiel; alles andere über die vorhandenen Kommandos. Debug `count` ist `HOST_ONLY` wie der Rest von `diveDebug`.
- **Speichern:** nichts Neues, `SAVE_VERSION` bleibt 18.
- **Debug:** `tideworks.diveGame({ task, act, seed, weld, target, story, intro })` (Probe ohne Beute) · `diveTask('search'|'weld'|null)` · `dive('count', n)` · `dive('intro')` · `diveState()` · `cs('cs_abstieg', t)`.
- Version **0.20.0**.

### Geprüft

- `npm run check:dive` erweitert (Seeds 4711, 1, 99, 12345, 2024): `intro` nur beim ersten Tauchgang, Branns Dialog genau einmal nach dem ersten Auftauchen, Kleinkram-Prüfung bei Fehlschlag (fremde Waren, zu große Mengen), `count` nur Host, Karte nach 3 Tauchgängen, nach Fehlschlag erneut, Flag und Story-Zeile, danach wieder normale Spots, `dive('intro')`.
- `check:story`, `check:npc`, `check:coop`, `check:world`, `check:tree`, `check:extract`, `check:wonder`, `npm run build` grün.
- **Einzelbilder** (Playwright, Seed 4711, ohne Konsolenfehler): Minispiel Suchen/Kiste/Tür, Graben mit Staub, Glitzern, Schweißen mit Funken, offene Kiste, Luft-Warnung mit Herzschlag, Ergebnisfenster, Handy 390×844, 2560×1080; Szene „Abstieg“ in 13 Bildern. `screenshots/tauchspiel/`, `screenshots/abstieg/`.
- Im Browser einmal ganz: erster Tauchgang → Szene → Minispiel mit Maus und Tastatur → Ergebnis vom Host → Branns Satz; Zähler auf 3 → Kartenspot → Karte gefunden → Story-Zeile → Brann (Platzhalter, Dialog, Akt 4).

**Nicht geprüft:** Koop mit zwei echten Browsern, Safari/Firefox, Touch auf echtem Handy, Balancing (Luft, Nahtlänge, Kleinkram-Mengen).

## Fehlerbehebung Taucherglocke in älteren Spielständen (0.20.1, Spielstand Version 18)

Meldung von Max: Beide Teile ließen sich kaufen, aber Ole sagte nichts, und die Werft zeigte keinen Abschnitt „Taucherglocke“ (weder alte noch neue Werft).

- **Ursache (sehr wahrscheinlich):** Ein Spielstand, der Akt 3 vor 0.18 erreicht hat. Damals gab der Übergang `akt2_ende` noch keinen Bauplan `glocke`; `once.akt2_ende` war gesetzt, also holte auch kein späterer Weg (Debug-Akt) ihn nach. Die Teile stehen ab Akt 3 im Angebot (nur Akt geprüft), der Werft-Abschnitt braucht aber den Bauplan → leer. Der Ole-Auslöser hieß `akt3_ole` und feuerte vor 0.19 bei jedem Handel mit Ole in Akt 3, war also schon verbraucht.
- **Behebung:** `repairStory(g)` (`sim/story.js`) beim Laden und nach Debug-Akt: Alle Übergänge mit `toAct` ≤ erreichter Akt gelten mit ihren Flags und Freischaltungen (still). Der Ole-Auslöser heißt jetzt `akt3_seil`, damit alte Stände den Dialog beim Kauf des Glockenseils noch bekommen.
- Wer die Teile schon gekauft hat, sieht Oles Dialog nicht nachträglich (anzeigen: `tideworks.dialog('ole_tote')`).
- `check:dive` prüft einen alten Stand in Akt 3 ohne Bauplan und mit altem Ole-Auslöser. Alle anderen Checks grün.
- Version **0.20.1**.

## Alte Karte, Akt 4 und Pumpwerk (0.21.0, Spielstand Version 18) – Entscheidungen, Abweichungen, Tests

- **`cs_alte_karte`** (`src/cutscenes/cs_alte_karte.js`, ca. 37 s, nach STORY.md): Brann entrollt die Karte (Hände wie in `cs_bauplan`) · ein Finger fährt den Weg durch Täler, Felder und Dörfer nach · Sepia-Wasser steigt von der Küste her, Wellenschraffur, übrig bleiben genau die Gipfel von Heimatinsel, Pfahldorf, Werkstattbucht und Goldberg · Blick aus Branns Fenster auf dieselben Inseln als Silhouetten. Danach Branns Dialog `brann_karte`, Akt 4, Stufe 3 frei, Meldung „Leuchtturm Stufe 3 freigeschaltet“.
- **Karte aus der echten Welt:** Lage und Form der vier Inseln stammen aus den Inselmasken des Spielstands (verkleinert), die Höhen daraus berechnet; ohne passende Inseln eine feste Vorlage. Die Karte wird nur neu gebaut, wenn sich die Lage ändert. Die Fensteransicht wählt die Richtung von Branns Insel aus, in der die meisten Inseln zu sehen sind.
- **Story-Zeilen Akt 4:** „Baue den Leuchtturm weiter aus: …“ (Stufe 3 eröffnen bzw. fertig bauen) → „Halte Ausschau nach Blasen im Wasser. Da unten wartet noch etwas.“ → mit Story-Spot „Etwas Großes liegt da unten: …“ → „Bring deinen Fund zu Brann.“
- **Aurel in Akt 4:** Geschenke über `byAct` in `data/npctrade.js` (Akt 4: Chance 0,8, Menge ×2,5, zwei Würfe). Sein Dialog `aurel_tauchen` kommt einmal, sobald Stufe 3 fertig ist. **Abweichung:** Auslöser ist der nächste Besuch (neues Ereignis `visit:<npc>` beim Anlegen) oder ein Gespräch/Handel, je nachdem, was zuerst kommt; STORY.md sagt nur „beim nächsten Besuch“.
- **Story-Spot Pumpwerk:** Nach Stufe 3 (Akt 4, ohne Flag `pumpe_gefunden`) macht `pumpwerkDue` den nächsten Spot zum Story-Spot. Story-Spots haben jetzt größere, auffälligere Blasen (gilt auch für den Kartenspot) und eine eigene Meldung „Große Blasen im Wasser!“.
- **Minispiel Pumpwerk** (`src/divegame/pumpwerk.js`, Zahlen `DIVE_PUMP`): erst Tor in der Fassade aufschweißen (Inschrift PUMPWERK), dann Wechsel in die Halle (Abblende) und Suchen mit Ziel „Verbogenes Brecheisen“ mit Aurels Wappen (gleiches Motiv wie Wrack und Flagge). Halle: eingestürztes Dach, Wandrohre, Schwungrad, Balkenpumpe, Ventile mit aufgeplatzten, hellen Bruchkanten und verbogenen Spindeln, also zerschlagen und nicht verrostet. Luft doppelt (70 s). Ergebnisfenster nur mit dem Satz „Ein schweres Brecheisen mit einem eingeprägten Wappen.“ und der Story-Zeile. Fehlschlag: Spot bleibt (`diveResult.keep`).
- **Ende Akt 4:** Brann sagt zuerst „Das ist das alte Pumpwerk. …“, dann Platzhalter `cs_flutnacht` (nicht gebaut), dann `brann_flutnacht`, Akt 5.
- **Fehler behoben (bestand seit 0.20):** Startete ein Tauchgang, während ein Story-Dialog offen war (z. B. Branns „Die Glocke hält“ direkt nach dem ersten Auftauchen), übernahm das Minispiel die Bühne, der Dialog endete nie und alle späteren Story-Szenen blieben in der Warteschlange hängen. Jetzt wartet der Tauchgang, bis Dialog oder Szene zu sind (`stageFree` in `ui/divegame.js`).
- **Koop:** keine neuen Kommandos; Szene und Minispiel sieht wie bisher nur, wer es auslöst bzw. taucht. `check:coop` grün.
- **Speichern:** nichts Neues, `SAVE_VERSION` bleibt 18.
- Version **0.21.0**.

### Geprüft

- Neu `npm run check:akt4` (Seeds 4711, 1, 99, 12345, 2024): Akt 3 → Karte → Akt 4 → Stufe 3 → Aurel-Dialog genau einmal → Story-Spot → Fehlschlag (Spot bleibt) → Erfolg (Flag, Story-Zeile) → Brann → Akt 5.
- `check:story`, `check:npc`, `check:dive`, `check:wonder`, `check:coop`, `check:world`, `check:tree`, `check:extract`, `npm run build` grün.
- **Einzelbilder** (Playwright, Seed 4711): Szene in allen Einstellungen, Tor, Halle, Ergebnisfenster, große Blasen, Aurel, Brann. `screenshots/alte-karte/`, `screenshots/pumpwerk/`.
- Im Browser einmal ganz durch (ohne Konsolenfehler): Karte → Szene → Dialog → Akt 4 → Stufe 3 → Aurel → Spot → Fehlschlag → Erfolg → Brann → Akt 5.

**Nicht geprüft:** Koop mit zwei echten Browsern, Safari/Firefox, Handy, Balancing (Aurels Geschenke, Luft in der Halle).

## Finale: cs_wahrheit und die Entscheidung (0.22.0, Spielstand Version 18) – Entscheidungen, Abweichungen, Tests

- **`cs_flutnacht` gab es noch nicht** (immer noch Platzhalter am Ende von Akt 4). Thronsaal und Flutwelle sind deshalb neu gebaut, aber als eigene Bausteine in **`src/cutscene/flutnacht.js`**, damit die spätere Szene `cs_flutnacht` sie übernehmen kann:
  - `buildThrone()` und `drawThrone(ctx, T, t, cam, { figBehind, door })` zeichnen den Thronsaal mit Quaderwand im Kerzenlicht, Bogenfenster mit Sturm und fernem dunklen Leuchtturm, Bannern mit dem Turm-Zeichen des Herrschers, Thron, Tür und Kartentisch mit Siegel.
  - `buildFlood()` und `drawFlood(ctx, F, t, { cam, front, flooded, dawn, lightsOff })` zeichnen eine Welle, die vom Horizont auf den Betrachter zuläuft. Die Dorflichter gehen aus, sobald das Wasser sie erreicht. Der Berg ist eine eigene Ebene, und `floodFront(u)` liefert die Wellenkante.
- **`cs_wahrheit`** (`src/cutscenes/cs_wahrheit.js`, Titel „Die Wahrheit“) zeigt genau die 10 Bilder aus STORY.md:
  1. Sturm am fertigen Turm
  2. Pumpwerk mit Schlägern und Aurel
  3. Thronsaal: totale Einstellung, der Herrscher von hinten, Aurel tritt ein; dann die Nahaufnahme, in der er sich dreht (1,3 s von hinten, dann hinten → dreiviertel → Profil → vorn in ca. 0,35 s), danach etwa 3 s Stille
  4. Über die Schulter: Aurel nickt zweimal, dann ein halbes Lächeln
  5. Der Aufstieg vor dem Tiefland, der dunkle Turm im Bild
  6. Die Flut
  7. Morgen mit Überlebenden, Aurel offen, die Flagge mit `wappen('fahne')`
  8. Konfrontation, dann das Boot (Silhouette `buildBoatSil` aus `cs_prolog`), von Wachen hinausgestoßen, dann der Blitz
  9. Aurels Boot mit Laterne und Wappen am Segel legt an
  10. Lampenraum: Fresnel-Linse, Fackel in der Faust mit Ring und grünem Ärmel, Aurel in der Treppenluke
  
  Die Gegenwart ist in Sturmnachtfarben gehalten (`nightTint`), die Rückblenden in `kit.sepia()` mit dunklem Rand.
- **Blitz (Bild 8c):** Er ist bewusst eine exakte Kopie und ruft `prolog.shots[0].draw(ctx, lt, lt)` unverändert auf, mit gleichem Ausschnitt, gleichem Timing (7,5 s, Blitz bei 5 s), ohne Sepia. Ein Pixelvergleich ergab an 10 Zeitpunkten 0 abweichende Pixel.
- **Länge, Abweichung:** Die Szene dauert ca. 83 s statt der „ca. 45 s“ aus der Aufgabe. Dahinter steht Max' Wunsch nach ruhigem Tempo (siehe `cs_prolog`): zehn Bilder, sieben Dialogeinblendungen, die Stille nach dem Umdrehen und allein 7,5 s für den unveränderten Prolog-Blitz. Kürzen geht über die Konstanten `T1…T_END` und `SLOTS` oben in der Datei.
- **Dialogzeilen im Bild (Engine):** Neues Szenenfeld `lines: [{ from, to, who, text, face }]`. Der Player blendet diese Zeilen in der echten Dialogbox ein (`drawBox` aus `ui/dialog.js`), mit Tippeffekt (`LIN` in `cutscene/player.js`). Die Zeilen kommen aus dem Dialog `wahrheit_rueck`. Bei reduzierter Bewegung läuft stattdessen `linesDialog` als normaler Dialog vor dem Hauptdialog.
- **Herrscher:** Vor dem Umdrehen erscheint nur der Name „Herrscher“ ohne Porträt (`herrscher: { none: true }`, `noPortrait`). Ab dem Umdrehen tragen seine Zeilen in `wahrheit_rueck` das Porträt `spieler` (neues Zeilenfeld `portrait` → `face`).
- **Spieler-Porträt** (`gfx/portraits.js`): `spieler` hat einen dunkelgrünen Mantel mit Messingknöpfen, dunkle Haare mit heller Strähne, ein ernstes Gesicht, Hemdkragen und Weste. Die Hand mit Ring zeigt `spHand`. Für das Umdrehen gibt es `spielerView('back'|'qback'|'side')`.
- **Die Entscheidung** (`decide` in `ui/story.js`):
  - Nach der Szene läuft der Dialog `wahrheit` mit `keep: true`. Die Box fährt heraus, das letzte Bild bleibt stehen (Fackel, dunkle Lampe, Aurel). Das ermöglichen die neue Option `hold` im Player und `sceneBg(id)`.
  - Rechts erscheint eine Tafel im Spiel-UI-Stil mit „Leuchtfeuer entzünden“ (grün) und „Nicht entzünden“ (Papier). Es gibt keinen Zeitdruck.
  - Die Rückfrage lautet „Diese Entscheidung ist endgültig.“ mit Abbrechen und Bestätigen. Esc bricht die Rückfrage ab, Enter drückt den markierten Knopf.
  - Bestätigen sendet `storyChoice`: `story.choice` = a/b, Akt 6.
- **Autosave und Laden:** Vor der Entscheidung wird automatisch gespeichert, danach noch einmal. Wird ohne Entscheidung neu geladen (`once.finale` gesetzt, `choice` leer), bietet `resumeStory()` beim Start den Dialog und die Entscheidung erneut an. Nach der Entscheidung kommt sie nie wieder, und `storyChoice` lehnt einen zweiten Versuch ab („endgültig“, `check:story`).
- **Enden:** Vorerst laufen nur die Platzhalter `cs_ende_a` „Das Feuer antwortet“ bzw. `cs_ende_b` „Die Lichter gehen aus“ (Meldung, kein Dialog). Die Dialoge `ende_a`/`ende_b` und die Szenen kommen im nächsten Thread.
- **Koop:**
  - Die Szene läuft bei allen gleichzeitig, und die Simulation steht für alle bis zur Entscheidung.
  - Nur der Host kann überspringen (wie bisher, `csShare`) und entscheiden.
  - Gäste sehen auf demselben Standbild „Der Host entscheidet …“, danach 3,2 s lang „Der Host hat entschieden: …“ und dann den Platzhalter.
- **Debug:**
  - `tideworks.finale()` (nur Host) setzt Akt 5, baut Leuchtturm Stufe 4 und startet den Schritt `finale`.
  - `tideworks.cs('cs_wahrheit'[, t])` zeigt die Szene bzw. ein Einzelbild.
- Version **0.22.0**, `SAVE_VERSION` bleibt 18 (`story.choice` gab es schon).

### Geprüft

- `check:story` (Finale, Entscheidung B, endgültig), `check:coop`, `check:world`, `check:tree`, `check:npc`, `check:extract`, `check:wonder`, `check:dive`, `check:akt4` und `npm run build` sind grün.
- **Einzelbilder** (Playwright) aller Einstellungen, besonders das Umdrehen (jede Ansicht einzeln) und der Blitz im Pixelvergleich mit `cs_prolog`. Die Bilder liegen in `screenshots/wahrheit/`.
- **Einzelspieler im Browser** ohne Konsolenfehler:
  - Szene → Dialog → Tafel → Rückfrage → Abbrechen.
  - Neu laden ohne Entscheidung → die Entscheidung kommt wieder → B → Akt 6, die Simulation läuft weiter.
  - Neu laden → keine Entscheidung mehr.
- **Koop mit zwei Browsern** (eigener PeerServer): Die Szene startet bei beiden, und Esc beim Gast überspringt nicht. Der Gast sieht „Der Host entscheidet …“. Nachdem der Host A gewählt hat, sieht der Gast das Ergebnis und den Platzhalter, und beide sind in Akt 6 mit Wahl A.

**Nicht geprüft:** Safari/Firefox, Handy, das Finale in einem ehrlich durchgespielten Spielstand.

## Enden A und B (0.23.0)

Aufgabe: die beiden Enden nach `docs/STORY.md` als Szenen mit Dialogen, dazu die bleibenden Folgen in der Welt, Koop-fest.

### Szenen

- **`cs_ende_a` „Das Feuer antwortet“** (`src/cutscenes/cs_ende_a.js`, 55 s statt der 19 s aus STORY.md, wie bei den anderen Szenen wegen Max' ruhigem Tempo). Acht Einstellungen:
  1. Lampenkammer: die Fackel fährt an die Linse, das Feuer zündet mit einem weißen Blitz, die Linse glüht, Aurel steigt die Treppe hinab.
  2. Der Turm im Sturm, der Strahl dreht sich (in Seitenansicht: lang, wenn er zur Seite zeigt, Aufblitzen, wenn er zu uns zeigt).
  3. **Höhepunkt:** der Horizont mit Pfahldorf, einem Inselchen, der Werkstattbucht und dem Goldberg. Der Strahl streicht von links über die Inseln, und Insel um Insel gehen Lichter an, Fackeln steigen die Hänge hinauf, oben brennt ein Feuer. Nur der Goldberg antwortet nicht.
  4. Pfahldorf: Ole hebt die Laterne, die Leute tragen ihr Bündel den Klippenpfad hinauf. Zeile Ole.
  5. Werkstattbucht: Brann schaut zum Licht, die Leute steigen den Hügel hinauf. Zeile Brann.
  6. Am Turm: Aurel geht über den Steg zu seinem Boot und legt ab. Zeile Aurel.
  7. Der Sturm trifft leere Ufer: das Wasser steigt über Steg und Pfahlhäuser, oben auf der Klippe die Laternen in Sicherheit.
  8. Morgen: Rauch über dem Goldberg, Aurels Schiff verschwindet im Dunst. Das Bild bleibt für Branns Dialog `ende_a` stehen.
- **`cs_ende_b` „Die Lichter gehen aus“** (`src/cutscenes/cs_ende_b.js`, 49,5 s):
  1. Die Fackel sinkt, ihre Flamme wird klein; Aurel steigt aus der Luke und verneigt sich.
  2. Der Horizont: eine Sturmwand zieht herein, auf Oles und Branns Inseln erlöschen die Lichter nacheinander, der Goldberg behält seine.
  3. Pfahldorf im Sturm: Fenster für Fenster wird dunkel, Oles Laterne zuletzt, das Wasser steigt.
  4. Morgen: Ruinen und leere Pfähle, wo Oles Steg war.
  5. Die Ruinen der Werkstattbucht.
  6. Aurel (Porträt doppelt groß, halbes Lächeln) spricht seine Zeile, dann hebt er die Krone ins Bild.
  7. Nur Wellen, Abblende. Kein Dialog danach.
  - Reihenfolge in Bild 6: erst die Zeile, dann die Krone, weil die Dialogbox sonst die Krone verdecken würde.
- Die Nachtzeilen (Ole, Brann, Aurel bzw. Aurels Satz in B) sind Einblendungen (`lines`), die Texte stehen in `data/dialogs/story.js` (`ende_a_szene`, `ende_a`, `ende_b`). Bei reduzierter Bewegung laufen sie als normaler Dialog (`linesDialog`); dafür kennt der Player jetzt auch Szenen ohne Dialog danach (B).
- Bausteine: `src/cutscene/enden.js` (Panorama mit Inseln und Lichtern, Lichtstrahl `beam`/`sweep`, Pfahldorf und Werkstattbucht nachts bzw. als Ruine, kleine Figuren, Krone). Aus `cs_wahrheit.js` werden Turm, Lampenkammer, Fackel, Steg und Boot wiederverwendet (Export am Dateiende).
- Beide Enden stehen unter **Pausenmenü → Szenen**, sobald gesehen (`story.seen`), Ende A mit Branns Dialog.

### Folgen in der Welt (`src/sim/ending.js`, Daten in `data/npctrade.js` → `ENDINGS`, `NPC_TRADE.rat`)

`applyEnding(g, c)` läuft einmal auf dem Host, direkt in `storyChoice`. Alles Weitere steht im Spielzustand (Gebäudefeld `ruin`, `story.fest`, Flag `npc_rat`) und wird gespeichert und an Gäste gespiegelt. `SAVE_VERSION` bleibt 18, weil die neuen Felder Standardwerte haben.

- **Lampe:** Nach A brennt der Leuchtturm (Stufe 4) im normalen Spiel dauerhaft (Sprite `leuchtturmLit` mit Strahl), nach B bleibt er dauerhaft dunkel. Das war über `beamOn()` im Renderer schon so angelegt; vor der Entscheidung ist er ebenfalls dunkel.
- **Ende A:**
  - Goldberg: Aurels Villen werden Brandruinen (gehören dir, abreißbar), alle anderen Dorfgebäude verschwinden. Sein Steg wird an derselben Stelle dein Hauptkontor. Die Rohstoffe der Insel bleiben, und du darfst dort bauen.
  - Der **Inselrat** bekommt einen eigenen Steg auf dem Goldberg (mindestens 7 Felder vom Kontor entfernt). Er kauft Werkzeug, Fisch, Perlen, verkauft Glas, Uhrwerk und Zellen zu 85 % und vergibt Aufträge (Holz, Ziegel, Werkzeug). Die Auswahl steht in `NPC_TRADE.rat`.
  - Ole und Brann: Ruf mindestens 90 („vertraut“), dauerhaft 15 % mehr beim Ankauf und 20 % Rabatt beim Verkauf (`ENDINGS.a.buy/sell`), dazu neue Waren (Ole: Räucherfisch, Perlen; Brann: Stahl, Draht; Einträge mit `end: 'a'`).
  - **Fest:** 900 s Spielzeit lang Wimpelketten in Pfahldorf und der Werkstattbucht, nachts Lampions und Feuerwerk über den Stegen (nur über entdeckten Inseln).
  - Mit Aurel gibt es keinen Handel mehr; seine Aufträge, Verträge und Routen-Stopps an seinem Steg fallen weg.
- **Ende B:**
  - Pfahldorf und Werkstattbucht: Häuser werden Sturmruinen, Laternen verschwinden, die Stege bleiben als bloße Pfähle ohne Figur. Kein Handel, keine Aufträge, Routen-Stopps dort werden entfernt. Die Inseln bleiben auf der Karte und sind nicht bebaubar (das war nicht verlangt; leicht zu ändern in `npcIslFree`).
  - Goldberg: alle Gebäude gehören dir, als hättest du sie gebaut (Villen werden Bürgerhäuser). Aurels Steg wird dein Hauptkontor, Aurel steht dort weiter als Figur, ohne Handel.
- **Danach:** Akt 6, das Spiel läuft frei weiter. Die Geschichtsanzeige zeigt je Ende einen Schlusssatz. Drei Meldungen erklären, was passiert ist.
- **Relikte:** „Die erste Flamme“ (A) bzw. „Die Krone des Herrschers“ (B) liegen als legendäre Waren im Lager der Heimatinsel. Wirkung folgt mit dem Reliktsystem.

### Koop

- Die Geschichte gibt es nur im Einzelspiel und im Modus **Gemeinsame Insel**; **Getrennte Inseln** haben keine Story und damit keine Enden.
- Auf der gemeinsamen Insel gehören alle Gebäude dem Host (`by = owner = 'host'`, wie bei der Migration auf Version 13). Übernommene Gebäude und das neue Kontor bekommen deshalb ebenfalls den Host als Besitzer. Damit gelten die bestehenden Besitzregeln unverändert: alle Mitspieler dürfen sie benutzen.
- Die Folgen berechnet nur der Host. Gäste bekommen Ruinen, Kontor, Inselrat und Fest über den normalen Spiegel. Die Szene läuft bei allen, entscheiden und überspringen kann nur der Host (wie seit 0.22.0).
- **Debug:** `tideworks.ending('a'|'b')` (nur Host, endgültig: vorher eine Kopie speichern), `tideworks.endingInfo()`. Testanleitung: `docs/TEST-ENDEN.md`.
- Version **0.23.0**, `SAVE_VERSION` bleibt 18.

### Geprüft

- `check:ending` (neu: Seeds 4711, 99, 12345, je A und B: Folgen, Handel, Bauen, Routen, Relikt, Schlusssatz, Speichern/Laden, Spiegel) sowie `check:story`, `check:coop`, `check:world`, `check:tree`, `check:npc`, `check:extract`, `check:wonder`, `check:dive`, `check:akt4` und `npm run build` sind grün.
- **Einzelbilder** beider Szenen (Playwright) und Einblendung im echten Player: `screenshots/enden/ende-a.png`, `ende-b.png`, `einblendung-ole.png`.
- **Im Spiel** (Dev-Server, Seed 4711, ohne Konsolenfehler): beide Enden über `tideworks.ending`, Meldungen, Goldberg mit Kontor, Brandruinen und Inselrat-Steg (A) bzw. Bürgerhäusern und Aurel am Kontor (B), Pfahldorf als Ruine mit leeren Pfählen (B), Fest mit Feuerwerk (A), Völker-Fenster (Aurel „fort“, Inselrat). Bilder: `screenshots/enden/spiel-*.png`.
- **`dist/tideworks.html` per file://:** beide Szenen bis zum natürlichen Ende laufen lassen, A mit Branns Dialog, B schließt ohne Dialog; danach läuft das Spiel, keine Konsolenfehler.

**Nicht geprüft:** Koop mit zwei Browsern (nur über `check:ending`/`check:coop` mit gespiegeltem Zustand), der brennende Turm im Spiel als Bild (keine Leuchtturm-Baustelle im Debug-Stand; der Codepfad ist unverändert seit 0.18.0), Safari/Firefox, Handy, ein ehrlich durchgespielter Spielstand.

## GitHub Pages (0.23.1, Spielstand Version 18)

Seit 0.23.1 liegt das Projekt auf GitHub (`crinklycrown/tideworks`) und wird unter https://crinklycrown.github.io/tideworks/ veröffentlicht. Spiellogik unverändert.

- **Build:** `npm install` und `npm run build` liefen ohne Fehler, es musste nichts korrigiert werden. Nur die bekannte Vite-Warnung „Chunk größer als 500 kB“ (ein Skript, gewollt).
- **`base: '/tideworks/'`** in `vite.config.js` (vorher `./`). Das Plugin `singleFile` erkennt jetzt beide Schreibweisen (`./…` und `/tideworks/…`), `dist/tideworks.html` bleibt also eine eigenständige Einzeldatei für file://.
  Folge: `dist/index.html` läuft **nicht mehr per Doppelklick**, sondern nur unter `/tideworks/` (Pages oder `npm run preview`); der Dev-Server läuft unter http://localhost:5173/tideworks/.
- **Pfade geprüft:** Bilder und Sprites werden im Code gezeichnet (keine Bilddateien), der Worker ist eingebettet (`?worker&inline`), Schriften kommen von Google Fonts (absolute URL), es gibt keine `fetch`-Aufrufe für Daten und keinen `public/`-Ordner. Der Beitritts-Link (`joinLink` in `net/session.js`) nimmt die aktuelle Adresse und passt damit von selbst.
- **Deploy:** `.github/workflows/deploy.yml` baut bei jedem Push auf `main` (Node 22, `npm ci`, `npm run build`) und veröffentlicht `dist/` mit `actions/configure-pages`, `actions/upload-pages-artifact` und `actions/deploy-pages`. Auch von Hand startbar (`workflow_dispatch`).
- **Geprüft:** `npm run preview` unter http://localhost:4173/tideworks/: Titelbildschirm mit Demo, „Neues Spiel“, Prolog startet, `tideworks.info()` meldet `mode: 'worker'`, `storage: 'idb'`, keine Konsolenfehler. `check:coop` und `check:world` grün.

### Koop auf einer statischen Seite

Ergebnis: **Koop braucht keinen eigenen Server und funktioniert auf GitHub Pages**, solange die öffentlichen Dienste erreichbar sind. Es wurde nichts umgebaut.

- Die Spieldaten laufen **Peer-to-Peer** über WebRTC-Datenkanäle direkt zwischen den Browsern (`net/peer.js`); der Host-Browser ist der „Server“ (Simulation im Worker des Hosts).
- **Vermittlung (Signalisierung):** der kostenlose öffentliche PeerJS-Dienst `0.peerjs.com` (`PEER` in `data/net.js`). Aus diesem Netz am 15.11.2026 geprüft: die WebSocket-Verbindung zu `wss://0.peerjs.com/peerjs` meldet `OPEN`. Damit ist die bisher offene Prüfung gegen den echten Dienst (siehe „Koop Teil 1“) teilweise erledigt.
- **NAT-Durchdringung:** öffentliche STUN-Server von Google und die TURN-Server von PeerJS (`ICE` in `data/net.js`) als Relay, falls keine direkte Verbindung zustande kommt. Ein eigener TURN-Server lässt sich im Spiel eintragen (Titel → Koop → Verbindung).
- **Ohne Vermittlung:** „Manuell verbinden“ tauscht Angebots- und Antwort-Code (`TWO-…`/`TWA-…`) per Chat oder Mail, ganz ohne Signalisierungsserver.
- **Risiken (kein eigener Server nötig, aber Abhängigkeit von Dritten):** `0.peerjs.com` und `*.turn.peerjs.com` sind kostenlose Dienste ohne Zusage zur Verfügbarkeit; die TURN-Zugangsdaten `peerjs/peerjsp` sind öffentlich und können sich ändern. Fällt die Vermittlung aus, bleibt „Manuell verbinden“. Fällt TURN aus, scheitern nur Verbindungen hinter strengem NAT (z. B. manche Firmen- oder Mobilfunknetze).
- **Nicht geprüft:** ein echtes Koop-Spiel zwischen zwei Rechnern über die veröffentlichte Seite.

### Spielstände

- **Export/Import gibt es schon** (seit Version 12): „Spiel laden“ → „Exportieren“ lädt eine `tideworks-save-<Datum>.json` herunter, Import liest so eine Datei wieder ein (`exportSlot`/`importFile` in `main.js`). Kein offener Punkt.
- **Hinweis für Pages:** Spielstände liegen in IndexedDB bzw. localStorage **je Herkunft (Origin)**. Stände aus `localhost`, file:// oder einer anderen Adresse erscheinen auf `crinklycrown.github.io` nicht von selbst; sie lassen sich per Export/Import umziehen. Alle Seiten unter `crinklycrown.github.io` teilen sich denselben Browser-Speicher (die Schlüssel von Tideworks haben eigene Namen, Konflikte sind nicht zu erwarten).

### Offene Punkte

- In den GitHub-Einstellungen muss **Settings → Pages → Source** auf „GitHub Actions“ stehen, sonst wird der Workflow nicht veröffentlicht.
- Koop über die veröffentlichte Seite mit zwei Rechnern einmal echt testen.

## Relikte und Reliktsockel (0.24.0, Spielstand Version 19) – Entscheidungen, Abweichungen, Tests

Umgesetzt nach `docs/SYSTEMS.md` Abschnitt 8 (an das Umgesetzte angepasst). Zahlen: `src/data/relics.js`, Logik: `src/sim/relics.js`, Fenster und Info-Panel: `src/ui/relics.js`, Grafik: `src/gfx/sprites/relics.js`. Testanleitung: `docs/TEST-RELIKTE.md`.

### Entscheidungen

- **Sammlung statt Ware.** Relikte sind Einträge in `state.relics.list` (Nummer, id, Sockel, Insel, gewählte Ware, ruht, nächste Perle, Herkunft), nicht im Inselinventar. `got` zählt, was es je gab; legendäre gibt es dadurch nur einmal, auch wenn eins verkauft oder anderswo gefunden wurde. Gewöhnliche und seltene können mehrfach vorkommen (z. B. zweimal das Zahnrad für zwei Inseln).
- **Sockel = drei Gebäude** (`sockel1`–`sockel3`, 2×2, Kategorie Wohnen) mit dem bestehenden **Aufwerten** (UPGRADE_TO). Das Relikt hängt am Gebäude über die Gebäude-ID, bleibt beim Aufwerten und geht beim Abriss zurück in die Sammlung. Nur auf Inseln mit Hauptkontor (der Unterhalt kommt aus dem Inselinventar). Nicht in Blaupausen.
- **Kosten** in `PEDESTAL_COST`: Beim Aufwerten wird der alte Sockel voll erstattet, der neue bezahlt; die Werte sind so gewählt, dass die nächste Stufe netto nur Perlen/Korallen bzw. Perlen/Muscheln und etwas Ziegel kostet.
- **Freischaltung:** neue Forschung „Reliktkunde“ (Ast Wohnen, Stufe 3, nach Handwerk) mit neuem Feld `act: 2` an der Forschung: erst ab Akt 2 erforschbar (`actOk` in `sim/state.js`, Skilltree zeigt „Akt 2 der Geschichte“). Ohne Geschichte (Getrennte Inseln) frei. Messing- und Goldsockel über `UNLOCKS` bei Brann bzw. Aurel ab „vertraut“ (wie die alten Platzhalter). Der Testmodus („Alles freischalten“) erforscht Reliktkunde auch in Akt 1.
- **Wirkungen** laufen nur über `relicFx(g, Insel)` (zwischengespeichert, neu berechnet bei jeder Änderung über `relics.ver` bzw. bei einem neuen Spiegel-Objekt). Eingehängt an diesen Stellen:
  - Produktion (`fxProd`): Rezepte, Sägewerk, Fischer, Bohrer (zusätzlich `drill`). Wie beim Leuchtturm-Bonus endet ein Durchgang auf einem ganzen Takt (0,1 s), +5 % sind deshalb bei kurzen Rezepten etwas weniger (gemessen: 100 → 102 Eisen in 300 s beim Schmelzofen; bei Bohrern genau).
  - Bänder (`fxBelt`): Tempo des Bands, Splitter, Überlauf-Tor und Sortierer dahinter übernehmen es wie bisher vom Band. Die Interpolation im Spiegel rechnet weiter mit dem Grundtempo (leichtes Nachziehen, nur optisch).
  - Schiffe (`fxShip`): Relikt der Insel der **Werft, in der das Schiff gebaut wurde** (`s.home`). Schiffe ohne Heimatwerft (Startschiff aus Debug, alte Stände) bekommen nichts.
  - Strom (`fxPower` in `drawPower`): Verbrauch × 0,75 bzw. 0 („Die erste Flamme“: dann zählt der Verbraucher weder als Bedarf noch als Versorgung). Erzeuger unverändert.
  - Lager (`fxCap` in `capOf`): Hauptkontor × 1,5. Lagerkisten und Handelskontore nicht.
  - Häuser (`fxHouse`): Verbrauch × Faktor; Bruchteile sammeln sich je Haus in `b.hc` und werden ganzzahlig entnommen (−25 %: 2 Fisch → im Mittel 1,5). Pläne liefern sie unverändert.
  - Ewige Glut (`RELIC_FURNACES`): Schmelzofen und Induktionsofen ohne Kohle-Zutat, Induktions- und Silizium-Ofen ohne Strom mit voller Geschwindigkeit. Der Pyrolyse-Ofen bewusst nicht (dort ist Kohle der Rohstoff). Kohle, die per Band kommt, bleibt im Puffer liegen (das Band staut, bis man es umleitet). Beim Rezeptwechsel gibt ein Durchgang ohne Kohle keine Kohle zurück (`b.nk`).
  - Füllhorn (`fxDouble` in `addOut`): die gewählte Ware kommt doppelt aus jedem Produktionsgebäude der Insel (auch Bohrer). Wählbar: Rohstoffe, Nahrung, Zwischen- und Endprodukte ohne Waren der Völker. Ohne gewählte Ware lässt es sich nicht einsetzen; die Ware lässt sich im Info-Panel umstellen.
  - Stein der Wandlung: Bohrer auf Kohle geben Eisenerz aus (Mehrheitsregel und Anzeige des Vorkommens bleiben).
  - Herz der Flut: Pause bis zum nächsten Tauchspot geteilt durch `relicSpots` (2). Gilt weltweit, solange es irgendwo eingesetzt ist und nicht ruht.
  - Atemmuschel: zusätzliche Luft im Minispiel, wenn sie auf der **Heimatinsel des Tauchers** liegt (Koop: die des Mitspielers bei Getrennten Inseln). Die Luft rechnet der Rechner des Tauchers (wie bisher), der Host prüft sie nicht.
- **Unterhalt** (`RELIC_UPKEEP`, 2 Perlen je Spieltag): stückweise im Abstand von einem halben Tag, die erste Perle beim Einsetzen; fehlt eine, ruht die Wirkung (`off`) und es wird jede Sekunde neu versucht. Auch die End-Relikte zahlen (sie sind legendär). Ruht ein Relikt, zeigt die Karte es blass, das Info-Panel einen Hinweis, dazu eine Meldung an alle.
- **Herkunft:**
  - Völker: `N.relic` = ein Angebot je Tag (`N.rday`), ab der Rufstufe aus `RELIC_SOURCES.npc`; gekauft wird mit „Kaufen“ im Fenster Völker, ein Schiff muss am Steg liegen (wie Pläne und Seekarten). Ein legendäres, das inzwischen anderswo gefunden wurde, verschwindet aus dem Angebot.
  - Aufträge: neue Aufträge tragen mit 12 % ein Relikt (`o.relic`), es kommt beim Erledigen. Aurel und Inselrat geben seltene, keine legendären (sonst könnten Angebot und Auftrag dasselbe legendäre versprechen).
  - Tauchgänge: 25 % je erfolgreichem normalem Tauchgang. Wird „legendär“ gewürfelt, aber es ist keins mehr frei, gibt es ein seltenes. Legendäre im Angebot eines Volks sind ausgenommen.
  - Meerjungfrauen: nur als Eintrag „bald“ in der Herkunft (`RELIC_SOURCES.mermaid`, `RELIC_SOURCE_TEXT`).
  - Enden: `giveRelic(…, 'ende')` statt Ware im Lager; die Meldung zum Ende nennt das Relikt und seine Wirkung.
- **Korallen und Muscheln** sind neue Waren (Baustoffe der Sockel), kommen aus Tauchgängen (Beute und Kleinkram), Grundpreis in `NPC_GOODS` (niemand kauft oder verkauft sie bisher; das kommt mit den Meerjungfrauen).
- **Koop:** `state.relics` geht wie `dive` und `npc` in jeden Snapshot (Host) bzw. als Teil `relics` in die Koop-Snapshots (nur nach Änderung). Einsetzen und Herausnehmen (`relicPut`, `relicTake`) sind normale Kommandos über den Host; bei Getrennten Inseln greift die bestehende Regel „nur eigene Gebäude“. `relicDebug` nur Host.
- **Spielstand Version 19:** `migrate18` legt „Die erste Flamme“ bzw. „Krone“ aus dem Inselinventar in die Sammlung und entfernt die alten Waren `erste_flamme`/`krone` (es gibt sie nicht mehr als Ware). Hinweisfenster beim ersten Laden. `cleanRelics` prüft beim Laden, dass eingesetzte Relikte in einem vorhandenen, passenden Sockel stecken (je Sockel eins), sonst kommen sie zurück in die Sammlung.
- **Taste L** für das Fenster „Relikte“ (frei war L; R ist Drehen). Knopf in der Leiste zwischen Völker und Karte.
- **Grafik:** 15 Relikt-Symbole (13×13), Umrisse für noch nicht gefundene, drei Sockel (Stein mit Rissen, Messing mit Nieten und blauer Einlage, Gold mit rotem Stein, wanderndem Glanzstreifen und Leuchten in der Nacht). Das eingesetzte Relikt steht klein oben auf der Schale und wippt leicht, solange es wirkt. Zwei Symbole nach dem ersten Bild überarbeitet (Füllhorn sah aus wie ein Käsestück, die Spirale der Atemmuschel fehlte).

### Geprüft

- `npm run check:relics` (neu, Seed 4711): Reliktkunde erst ab Akt 2, Sockel nur einer je Insel, Debug nur Host, alle 15 Relikte in der Sammlung, Stufenregel, jede Wirkung gemessen (Schmelzofen schneller, Bohrer +10 % und +5 %, Band 0,55 statt 0,5 in 0,5 s, Schiff ×1,15 nur mit Heimatwerft, Lager ×1,5, Strom −25 % und 0, Häuser 6/3 statt 8/4 bei vier Prüfungen und doppelt mit der Krone, Luft +20 s, Spots ×2, Öfen ohne Kohle und Strom, Füllhorn doppelte Kohle, Kohle → Eisenerz), Aufwerten mit Relikt darin, Unterhalt (Pause, Fortsetzung, 2 Perlen je Tag), Abriss gibt das Relikt zurück, legendär nur einmal, Angebot bei Ole (ein Kauf je Tag, neuer Tag neues Angebot), Aurel ohne Angebot, wenn alle legendären vergeben sind, Auftrag mit Relikt, Tauchgang mit Relikt, Speichern/Laden, Migration v18 mit „Die erste Flamme“ im Lager, Koop-Spiegel mit Befehlen eines Mitspielers.
- Alle übrigen Prüfskripte grün: `check:tree`, `check:world`, `check:coop`, `check:story`, `check:npc`, `check:extract`, `check:wonder`, `check:dive`, `check:akt4`, `check:ending`, dazu `npm run build`. Angepasst, weil sie den alten Stand fest erwarteten: `check:ending` (Relikt in der Sammlung statt im Lager), `check:npc` (Relikte statt Platzhalter im Angebot), `check:extract` (Spielstand ab Version 18), `check:world` (Start-Fingerabdruck ohne die leere Sammlung, wie schon bei Geschichte und Tauchen).
- **Gerenderte Einzelbilder** (Dev-Server, Canvas mit allen Symbolen fünffach vergrößert, Sockel vierfach mit eingesetztem Relikt, Korallen und Muscheln): alle Symbole unterscheidbar und auf grünem und hellem Grund lesbar.
- **Im Spiel** (Dev-Server, neues Spiel, Akt 2 per Debug, Testmodus): Goldener Sockel neben dem Hauptkontor mit Herz der Flut auf der Karte, Info-Panel (Stufe, Relikt, Text, Wirkung, Unterhalt, Liste zum Austauschen), Füllhorn per Klick mit Warenwahl (Eisenbarren), Zeile im Lagerfenster mit Tooltip, Fenster Relikte (L) mit Eingesetzt, Sammlung je Stufe und Herkunft, Tooltip mit genauem Bonus, Relikt-Angebot bei Ole im Fenster Völker samt Meldung, Fortsetzen nach dem Neuladen mit eingesetztem Füllhorn. Keine Konsolenfehler.

**Nicht geprüft:** Koop mit zwei echten Browsern (nur über `check:relics` mit Spiegel und Mitspieler-Befehlen), das ruhende Relikt als Bild im Spiel (Zustand im Prüfskript geprüft), Nachtleuchten des Goldsockels im Bild, die Luftanzeige des Minispiels mit Atemmuschel im Bild, ein echter Kauf bei Brann und Aurel im Browser (im Prüfskript nur Ole), Balance der Preise und Chancen im längeren Spiel, Safari/Firefox.

### Offene Punkte

- Meerjungfrauen als vierte Quelle (eigener Thread): Eintrag in `RELIC_SOURCES.mermaid` und Handel mit Fisch, Räucherfisch, Perlen, Korallen, Muscheln.
- Balance: Preise der Relikte (900 / 3.500 / 15.000 Münzen), Chancen (Aufträge 12 %, Tauchen 25 %) und Unterhalt (2 Perlen je Tag) sind Startwerte.
