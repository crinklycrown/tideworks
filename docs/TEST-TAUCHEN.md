# Testanleitung Taucherglocke und Tauchspots (0.19.0)

Spielstand Version 18 (alte Stände laden, die Glocke fehlt dann einfach). Dauer etwa 10 Minuten mit Abkürzungen.
Konsole (F12) für `tideworks.…` (Debug nur beim Host bzw. im Einzelspiel). Ohne Browser vorher: `npm run check:dive` (grün).

Vorbereitung: Neues Spiel (Geschichte an), Prolog überspringen, Konsole:
`tideworks.unlockAll(); tideworks.story(3); tideworks.giveShip(); tideworks.coins(3000)`.
Damit ist Akt 3 erreicht (Bauplan Taucherglocke), ein Schiff liegt am Hauptkontor.

## 1. Teile kaufen

1. Story-Zeile oben rechts. **Erwartet:** „Baue die Taucherglocke: Glockenseil von Ole, Messingglocke von Brann, dann in der Werft an ein Schiff montieren (0/2 Teile im Lager).“
2. `tideworks.dock('ole')`, Schiff anklicken. **Erwartet:** unter „Kaufen“ steht **Glockenseil** mit Knopf „Kaufen“ (auch wenn Ole noch misstrauisch ist).
   Vor Akt 3 (z. B. `tideworks.story(2)`) steht es nicht im Angebot.
3. „Kaufen“. **Erwartet:** 1 Glockenseil im Laderaum, danach einmalig Oles Dialog **„Lass die Toten schlafen.“** Ein zweiter Kauf (Vorrat kommt alle 10 min nach) zeigt den Dialog nicht noch einmal.
4. `tideworks.dock('brann')`, **Messingglocke mit Bullauge** kaufen (kein Dialog).
5. Schiff zum Hauptkontor zurück (`tideworks.dock` geht nur für Völker: Rechtsklick auf den Anleger oder fahren lassen) und beide Laderäume entladen.
   **Erwartet:** Story-Zeile „(2/2 Teile im Lager)“.
   Abkürzung für 1–5: `tideworks.dive('parts')` legt beide Teile ins Lager der Heimatinsel.

## 2. Montage in der Werft

1. Werft am Meer bauen (Bauen → Schifffahrt). Im Baumenü steht daneben das Feld **Taucherglocke** mit Marke „Werft“; Tooltip zeigt die Teile, Klick wählt die Werft aus.
2. Werft anklicken. **Erwartet:** Abschnitt „Taucherglocke“ mit Teilen und je Schiff „unterwegs · Herholen“ oder „am Anleger · Montieren“.
   Ohne Teile: „Im Lager dieser Insel fehlen: …“.
3. „Herholen“ → das Schiff fährt zum Anleger der Werft, dann „Montieren“.
   **Erwartet:** Meldung „Taucherglocke montiert an …“; die Teile sind weg; am Heck hängt an einem kleinen Kran die Messingglocke an einer Kette (schaukelt leicht).
   Im Info-Panel und in der Flotte (F) steht neben dem Namen ein Glocken-Symbol. Auf der Minikarte hat das Schiff einen gelben Strich.
4. Zweite Montage geht nicht („Es gibt nur eine.“), Ole und Brann bieten die Teile nicht mehr an, das Baumenü-Feld zeigt „dran“.
   Story-Zeile: „Folge den Blasen: …“.
   Abkürzung: `tideworks.dive('mount')` (Glocke ohne Kosten an das erste Schiff, `dive('mount', id)` an Schiff id).

## 3. Tauchspot

1. Nach etwa 8 Sekunden: Meldung „Blasen im Wasser! Ein Tauchspot bei x / y (Minikarte).“
   **Erwartet:** auf der Minikarte und der Karte (M) ein Blasen-Symbol mit Ring; im Meer ein dunkler Fleck mit Ringen und aufsteigenden, zerplatzenden Blasen.
   Der Spot liegt im aufgedeckten Meer, mindestens 6 Felder von Land und 10 Felder vom Nebel entfernt. Es gibt immer nur einen.
   Abkürzung: `tideworks.dive('spot')` legt sofort einen Spot (in der Nähe der Kamera, sonst zufällig; braucht aufgedecktes Meer, notfalls `tideworks.reveal(120)`).
2. Taucherschiff anklicken. **Erwartet:** „Tauchspot bei x / y · n Felder entfernt“, Knopf „Zum Tauchspot“; „Tauchgang starten“ ist grau.

## 4. Tauchgang (vorläufig, ohne Minispiel)

1. „Zum Tauchspot“. Liegt das Schiff still darüber: „genau darüber“, „Tauchgang starten“ wird grün. Abkürzung: `tideworks.dive('over')`.
2. „Tauchgang starten“. **Erwartet:** Meldung „… lässt die Taucherglocke hinab“; die Glocke verschwindet, die Kette führt ins Wasser, dort Ringe und Blasen.
3. Nach 5 Sekunden: „Tauchgang geschafft! an Bord: …“ (Schrott, Erze, Kohle, Kalk, manchmal Perlen). Ist der Laderaum voll, geht der Rest ins Lager der Heimatinsel.
   Beim ersten Tauchgang folgt der Platzhalter der Szene „Abstieg“ und Branns Satz „Die Glocke hält. Achte auf Blasen im Wasser. …“
4. Der Spot ist weg. Nach 2–3 Minuten erscheint ein neuer an anderer Stelle. Story-Zeile zählt „(1 Tauchgang)“; `tideworks.story().dives` = 1.
5. Schrott kauft Brann (Entladen am Steg).

## 5. Koop (zwei Browser, siehe README „Koop“)

1. Gemeinsame Insel: Der Mitspieler sieht Glocke, Spot und Blasen. Startet der Host den Tauchgang, bekommt der Mitspieler „Host taucht gerade mit …“; sein Knopf ist grau („… taucht gerade.“).
2. Der Mitspieler kann selbst tauchen (Schiff gehört allen); dann sieht der Host die Meldung. Schließt der Taucher mitten im Tauchgang das Fenster, bricht der Host nach 4 Minuten ab, der Spot bleibt.

## 6. Speichern

Speichern, Hauptmenü, laden. **Erwartet:** Glocke am Schiff, Spot an derselben Stelle, Zähler gleich. Ein laufender Tauchgang wird nicht fortgesetzt (Knopf wieder aktiv).

## Debug-Übersicht

`tideworks.dive()` Zustand · `dive('parts')` beide Teile ins Lager · `dive('mount', id)` Glocke ohne Kosten · `dive('spot')` Spot sofort ·
`dive('over')` Taucherschiff über den Spot setzen · `dive('story', 'karte')` nächster Spot ist ein Story-Spot (Fund löst `find:karte` aus) · `dive('reset')` alles zurück.
