# Testanleitung Tauch-Minispiel und Szene „Abstieg“ (0.20.0)

Spielstand Version 18 bleibt (nichts Neues wird gespeichert). Dauer etwa 15 Minuten mit Abkürzungen.
Konsole (F12) für `tideworks.…` (Debug nur beim Host bzw. im Einzelspiel). Ohne Browser vorher: `npm run check:dive` (grün).
Alle Zahlen stehen in `src/data/dive.js` (Abschnitt `DIVE_GAME`).

Vorbereitung: Neues Spiel (Geschichte an), Prolog überspringen, Konsole:
`tideworks.story(3); tideworks.giveShip(); tideworks.dive('mount'); tideworks.dive('spot'); tideworks.dive('over')`
Damit ist Akt 3 erreicht, die Glocke hängt am ersten Schiff, ein Tauchspot liegt direkt darunter.

## 1. Erster Tauchgang mit „Abstieg“

1. Schiff anklicken → **Tauchgang starten**.
   **Erwartet:** Die Karte blendet ab, Balken fahren ein, die Szene **Abstieg** läuft (ca. 35 s, Esc überspringt):
   Glocke sinkt unter dem Schiff, die helle Oberfläche bleibt oben zurück · im Inneren der Glocke spiegelt sich im gewölbten Bullauge ein Gesicht
   (dunkles Haar mit heller Strähne, grüner Mantelkragen, Messingknopf), verzerrt und leicht wabernd · ein Fischschwarm teilt sich vor der Glocke ·
   Schwenk über Dächer, Glockenturm und Straße im Lampenlicht · das Licht streift den Wegweiser **„ZU DEN BERGDÖRFERN“**, Abblende.
   Im Einzelspiel steht die Zeit während der Szene (Fabrik pausiert), danach läuft sie weiter.
2. **Erwartet:** Ohne Dialog direkt aus dem Schwarz ins Minispiel. Die Szene steht danach im Pausenmenü unter „Szenen“.
3. Nach dem Tauchgang und dem Ergebnisfenster: Branns Satz **„Die Glocke hält. Achte auf Blasen im Wasser. Wo es blubbert, liegt etwas da unten.“** über der Karte – einmal, auch wenn der erste Tauchgang ohne Fund endet.
4. Zweiter Tauchgang: keine Szene mehr. Szene noch einmal erzwingen: `tideworks.dive('intro')`.

## 2. Das Minispiel allgemein

1. **Erwartet:** Seitenansicht unter Wasser (Türkis oben, Dunkelblau unten), schräge Lichtstrahlen, Schwebeteilchen, kleine Fische (weichen dem Taucher aus),
   Sandboden mit Steinen und Schrott, links ein versunkener Mauerrest, hinten Silhouetten eines Dorfs. Oben hängt die Glocke an der Kette (leuchtende Bullaugen),
   der Taucher (Messinghelm, Segeltuch, Bleischuhe) hängt an einem Schlauch, der der Bewegung folgt.
2. Aufgabe groß in der Mitte („Finde: Messingkompass“, „Schweiße die Kiste auf“, „Öffne die Wracktür“), nach 3 s klein oben rechts. Unten ein Bedienhinweis.
3. **Steuerung:** Klick ins Wasser = hinschwimmen; WASD/Pfeile = schwimmen; ohne Eingabe sinkt der Taucher langsam auf den Boden.
4. **Luft** oben links: läuft in 35 s ab (`DIVE_GAME.air`). Ab 25 % (`warn`) blinkt sie rot, der Bildrand pulsiert rot wie ein Herzschlag (schneller, je weniger Luft), der Taucher atmet häufiger Blasen aus.
   Abkürzung: `tideworks.diveState().air = 8`.
5. Die Fabrik läuft während des Tauchgangs weiter (Spielzeit oben rechts nach dem Tauchgang vergleichen).
6. Esc einmal: Hinweis „Esc noch einmal: auftauchen“; zweimal: Tauchgang endet ohne Hauptbeute (Kleinkram bleibt).

## 3. Aufgabe Suchen

Erzwingen: `tideworks.diveTask('search')` vor „Tauchgang starten“ (gilt für den nächsten Tauchgang).
1. **Erwartet:** 5–6 Haufen aus Sand und Schrott in Akt 3 (6–7 in Akt 4, 7–8 ab Akt 5).
2. Haufen anklicken → Taucher schwimmt hin. Maustaste auf dem Haufen halten (oder Leertaste/E halten, wenn er daneben steht) → graben, Staubwolke, Haufen wird kleiner, Fortschrittsbalken.
   Kurze Klicks graben auch (je Klick ein Stück).
3. Freigelegt: entweder **Kleinkram** („+3 Schrott“ mit Symbol, steigt kurz auf), „Nur Sand“ oder das Ziel.
4. Das Ziel verrät sich für Aufmerksame: alle 2–3 s ein kleines Glitzern auf dem Haufen und einzelne Blasen.
5. Ziel gefunden: „Gefunden: …!“, der Gegenstand steigt zum Taucher hoch und glänzt, Abblende, Ergebnisfenster.

## 4. Aufgabe Aufschweißen

Erzwingen: `tideworks.diveTask('weld')`.
1. **Kiste:** eiserne Kiste mit Klappe, darauf eine helle Schweißnaht (∩), Startpunkt blinkt unten links. **Wracktür:** Planken-Wand eines Wracks mit Tür, Naht um die Tür.
2. Maus: am blinkenden Punkt die Maustaste halten und der Naht folgen. Der Taucher schwimmt mit, der Brenner sprüht Funken, die Naht glüht weiß → orange → rot → dunkler Spalt.
   Neben der Naht (mehr als `tol` = 6 Pixel) stoppt der Fortschritt, nur ein paar Funken. Zu schnell ziehen hilft nicht (höchstens `weld` = 34 Pixel/s).
3. Tastatur: Leertaste/E halten – der Brenner folgt der Naht von selbst, der Taucher muss mit WASD/Pfeilen nah genug bleiben (er zieht sich auch sanft hin).
4. Ende der Naht: Klappe fällt / Tür springt auf, Lichtschein, Blasen, „Die Kiste ist offen!“, Ergebnisfenster.
5. Länge der Naht steigt mit dem Akt (ca. 110 / 140 / 170 Pixel für Akt 3 / 4 / 5+).

## 5. Ende und Ergebnis

1. Erfolg: Ergebnisfenster „Tauchgang geschafft“ mit Hauptfund (bei Suchen), **Beute** aus der Beutetabelle (würfelt der Host), **Kleinkram**, und wohin es ging (an Bord / Lager der Heimatinsel).
   „Zurück zur Karte“ (oder Enter) → weiche Blende zurück ins Spiel.
2. Luft leer: Bild dunkelt mit rotem Rand ab, „Die Luft wird knapp!“, Ergebnisfenster ohne Hauptbeute; gefundener Kleinkram ist im Laderaum.
3. Story-Zeile „Folge den Blasen … (n Tauchgänge)“ zählt nur Tauchgänge mit erfüllter Aufgabe.

## 6. Karte der alten Welt

1. Zähler setzen: `tideworks.dive('count', 3)` (Wert `DIVE_GAME.karteAfter`). **Erwartet:** Der nächste Spot ist ein „besonderer Tauchspot“ (liegt gerade ein normaler Spot, wird er ersetzt).
   Liegt kein Spot (Pause nach einem Tauchgang): `tideworks.dive('spot')`, dann `tideworks.dive('over')`.
2. Tauchgang: immer **Suchen** mit Ziel **„Alte Karte“** (Messinghülse mit Kartenrolle), egal was `diveTask` sagt.
3. Gefunden: Ergebnisfenster „Alte Karte – Bring die Karte zu Brann.“, Flag `karte_gefunden` (`tideworks.story().flags`), Story-Zeile **„Bring die Karte zu Brann.“**
   Leuchtturm Stufe 3 ist damit freigegeben. Luft leer bei der Karte: der nächste Spot bringt sie wieder.
4. Mit dem Schiff an Branns Steg (`tideworks.dock('brann')`) und Brann anklicken. **Erwartet:** vorerst **Platzhalter** für die Szene „Die alte Karte“ (Meldung), danach Branns Dialog zur Karte und Akt 4.

## 7. Debug-Übersicht

| Befehl | Wirkung |
| --- | --- |
| `tideworks.diveGame({ task, act, seed, weld, target, story, intro })` | Probe ohne Host und ohne Beute. `task: 'search'|'weld'`, `weld: 'kiste'|'tuer'`, `target: 'kompass'|'uhr'|…`, `story: 'karte'`, `intro: true` = vorher „Abstieg“ |
| `tideworks.diveTask('search'|'weld')` | Aufgabe des nächsten echten Tauchgangs erzwingen (`null` = zufällig) |
| `tideworks.dive('count', n)` | Zähler erfolgreicher Tauchgänge setzen (Karte ab 3 in Akt 3) |
| `tideworks.dive('intro')` | nächster Tauchgang beginnt wieder mit „Abstieg“ |
| `tideworks.diveState()` | laufendes Minispiel (z. B. `.air = 5`) |
| `tideworks.cs('cs_abstieg'[, t])` | Szene abspielen bzw. Bild bei t Sekunden |
| `tideworks.dive('spot')`, `dive('over')`, `dive('story', 'karte')`, `dive('reset')` | wie in `TEST-TAUCHEN.md` |

## 8. Koop (zwei Browser, Gemeinsame Insel)

1. Mitspieler taucht: nur er sieht Szene und Minispiel; beim Host läuft die Welt weiter, er bekommt „… taucht gerade“ und danach die Beute-Meldung.
2. „Abstieg“ läuft nur beim allerersten Tauchgang der Welt (der Host merkt sie beim Start als gesehen), auch wenn der Mitspieler taucht.
3. Kleinkram schickt das Minispiel mit `diveEnd`; der Host nimmt nur Waren aus `DIVE_JUNK` und begrenzte Mengen. Die Beute geht an die Welt (Laderaum, sonst Heimatinsel des Schiffsbesitzers).
