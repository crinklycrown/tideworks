# Testanleitung Akt 2 (0.18.0): Leuchtturm-Stufen, Aurel, cs_licht_im_wind

Spielstand Version 18 (alte Stände laden unverändert). Dauer etwa 10 Minuten mit Abkürzungen. Konsole (F12) für `tideworks.…` (nur Host).
Ohne Browser vorher: `npm run check:wonder` (grün).

Vorbereitung: Neues Spiel (Geschichte an), Prolog überspringen, Konsole: `tideworks.story(2); tideworks.give(2000)`.
Damit ist Akt 2 erreicht und der Leuchtturm freigeschaltet.

## 1. Bauen und Freigabe

1. Baumenü → Schifffahrt → **Weltenleuchtturm**, auf der Heimatinsel am Meer setzen (5×5).
   **Erwartet:** lässt sich nur einmal bauen; die Story-Zeile oben zeigt „Baue den Leuchtturm aus: …“.
2. Info-Panel öffnen. **Erwartet:** Stufe 1 „Grundmauer“ und Stufe 2 „Turm mit Gerüst“ mit Kosten; Stufe 3 und 4 zeigen nur „???“ und „Wird später freigeschaltet“ (keine Namen, keine Waren).

## 2. Baustelle

1. „Baustelle für Stufe 1 eröffnen“. **Erwartet:** Hinweis „Baustelle … eröffnet“; je Ware ein Balken „geliefert / nötig“ und „im Inselinventar: n“.
2. Schalter „Aus dem Inselinventar nehmen (12/s)“ an: die Balken füllen sich langsam (12 Stück je Sekunde, alle Waren zusammen). Schalter aus: es hört auf.
3. Ein Band (oder einen Extraktor an einer Kiste) an den Turm führen. **Erwartet:** fehlende Waren werden angenommen, andere bleiben auf dem Band stehen.
4. Vor dem Turm stehen Kisten mit den gelieferten Waren. Sind alle da, läuft die Bauzeit (2 Minuten, Gerüst).
   **Erwartet:** „Stufe 1 „Grundmauer“ fertig! Der Turm überblickt jetzt 40 Felder.“, der Nebel um den Turm ist aufgedeckt, der Turm zeigt die Ringmauer.
   Abkürzung: `tideworks.wonder(0, 'site')` (alle Waren da, nur noch Bauzeit) oder `tideworks.wonder(0, 'half')`.

## 3. Aurel

1. Ein Schiff zu Aurel schicken und dort handeln (oder `tideworks.dock('aurel')` und im Fenster Völker (N) etwas kaufen/verkaufen).
   **Erwartet:** einmalig Aurels Satz „Ein Leuchtturm? Wozu? Das Meer ist ruhig, und Schiffe finden ihren Weg auch so.“ Beim zweiten Handel nicht mehr.

## 4. Optik der Stufen

`tideworks.wonder(1)`, `wonder(2)`, `wonder(3)`, `wonder(4)` nacheinander (setzt die Stufe direkt, ohne Szene).
**Erwartet:** Grundmauer → Turm mit Gerüst, Kran und leerer Lampenkammer → Lampenkammer mit dunklem Glas und Plane → fertiger Turm mit Kuppel und Wärterhaus.
Die **Lampe bleibt in jeder Stufe dunkel**, auch nachts (`tideworks.time(22)`). Die Sichtweite wächst (60 / 85 / 115 Felder).

## 5. Übergang zu Akt 3

1. Neues Spiel wie oben, Leuchtturm setzen, dann `tideworks.wonder(1, 'site')` und 2 Minuten warten (oder ehrlich Stufe 2 bauen).
   Abkürzung: `tideworks.wonder(2, 'fire')`.
2. **Erwartet:** das Spielbild blendet ruhig ab, Balken fahren ein, `cs_licht_im_wind` (34 s): Abenddämmerung mit halbem Turm, Fahrt nach oben zur kleinen Figur im grünen Mantel auf dem Gerüst, Branns Boot am Steg, der Plan der Taucherglocke. Esc überspringt mit Abblende.
3. Danach erst der Dialog mit Brann (3 Zeilen, Enter). **Erwartet:** Hinweis „Bauplan erhalten: Taucherglocke …“, Story-Zeile zeigt Akt 3.
4. Baumenü → Schifffahrt: Feld „Taucherglocke“ mit Marke „bald“; Tooltip „Taucherglocke (kommt bald)“; Klick zeigt nur einen Hinweis, baut nichts.
5. Info-Panel: Stufe 3 weiter „Wird später freigeschaltet“.
6. Speichern, neu laden: Akt 3, Stufe 2, Freischaltung bleiben; die Szene kommt nicht noch einmal.

Szene einzeln ansehen: Pausenmenü → „Szenen“ → „Ein Licht im Wind“, oder `tideworks.cs('cs_licht_im_wind')` bzw. `tideworks.cs('cs_licht_im_wind', 12)` für ein Einzelbild.

## 6. Koop (optional, zwei Browser)

- **Gemeinsame Insel:** Mitspieler sieht Baustelle, Kisten und Fortschritt; die Szene läuft bei beiden, nur der Host überspringt.
- **Getrennte Inseln:** keine Geschichte, alle vier Stufen offen, Wettstreit um den ersten Turm wie bisher.
