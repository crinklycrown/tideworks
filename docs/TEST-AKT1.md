# Testanleitung Akt 1 (Version 16, Dialoge und Cutscene seit 0.10.0)

Ziel: Akt 1 einmal von Hand durchspielen, vom Prolog bis zum Bauplan des Weltenleuchtturms.
Seit 0.10.0 gibt es das Dialogfenster und die erste echte Cutscene (Ole). Szenen, die noch fehlen (Prolog, Brann, Aurel, Bauplan), erscheinen als kurze Meldung mit Buch-Symbol; ihre Dialoge kommen trotzdem im Dialogfenster (Klick, Leertaste oder Enter: weiter).

## Schnellweg (etwa 10 Minuten)

1. `npm run dev` oder `dist/tideworks.html` öffnen. **Neues Spiel**, Seed `4711` (damit die Wege wie unten sind; jeder andere Seed geht auch).
2. Erwartet: Meldung „Szene: Gestrandet“. Die Ziel-Karte rechts oben heißt **Akt 1: Gestrandet**, unter „Geschichte“ steht „Baue eine Werft und lass dein erstes Schiff vom Stapel.“
3. Schiff holen, ohne die Wirtschaft aufzubauen: In der Konsole (F12) `tideworks.giveShip()`, solange die Kamera auf der Heimatinsel steht.
   Tempo 3× (Umschalt+3) spart Zeit. (Der normale Weg: Werft bauen, sie braucht die frühe Forschung Schiffbau.)
4. Die Story-Zeile sagt jetzt „Segle hinaus und finde das Dorf hinter dem Nebel in der Nähe (0/3 Völker entdeckt).“
5. **Ole suchen (Ring 1, etwa 250–400 Felder vom Start):** Schiff anklicken, mit Rechtsklick in den Nebel fahren. Mit Seed 4711 liegt Pfahldorf nordöstlich (Karte M: Feld etwa 320 / −220).
   Sobald das Schiff nah genug ist, erwartet: „**Pfahldorf entdeckt!** Hier lebt Ole.“, dann die Cutscene **Rauch hinter dem Nebel** im Vollbild (Spiel pausiert, Esc oder „Überspringen“ springt in den Dialog),
   danach Oles Dialog mit sechs Zeilen bis „Und halt die Augen offen. Da draußen gibt es noch mehr als uns.“ Die Story-Zeile zählt 1/3. Pausenmenü → „Szenen“ zeigt die Szene zum erneuten Ansehen.
6. Mit dem Schiff an Oles Steg fahren (Rechtsklick aufs Wasser vor dem Steg). Erwartet: „Schiff 1 liegt an Oles Steg. Klick auf den Steg, um mit Ole zu sprechen.“
   Steg anklicken: Info-Panel „Oles Steg · Pfahldorf · Ole, alter Fischer“ mit grünem Knopf **Mit Ole sprechen**. Klick: Ole sagt einen Satz im Dialogfenster über der Karte, sonst passiert nichts.
7. **Brann (Ring 2, 520–780 Felder):** Werkstattbucht, Seed 4711 etwa bei 313 / −440 (nördlich von Ole). Entdecken wie oben (Szene „Funken in der Werkstatt“, Brann: „Na sieh mal an …“), 2/3.
   Am Steg mit Brann sprechen: **nur ein Satz** („Sieh dich weiter um …“), der Akt bleibt 1, solange Aurel fehlt.
8. **Aurel (knapp hinter Ring 3, 930–1.090 Felder):** Goldberg, Seed 4711 etwa bei 975 / 108 (weit im Osten). Ein Rechtsklick genügt, auch wenn der Weg sehr weit ist; das Schiff fährt dann in Etappen.
   Erwartet: Szene „Der Goldberg“, Aurel: „Willkommen auf dem Goldberg …“, Story-Zeile „Du kennst alle drei Völker. Fahr zurück zu Brann und sprich mit ihm.“
9. **Zurück zu Brann**, am Steg „Mit Brann sprechen“. Erwartet nacheinander: „Szene: Der Bauplan“, Brann: „Du hast sie alle gesehen. Gut. Dann ist es Zeit.“,
   „**Bauplan erhalten: Weltenleuchtturm.**“, „**Akt 2: Das Licht**“. Die Ziel-Karte heißt jetzt **Akt 2: Das Licht**, Story-Zeile „Baue den Weltenleuchtturm auf der Heimatinsel.“
10. Bauen → Schifffahrt: Der Weltenleuchtturm ist frei. Auf der Heimatinsel am Meer lässt er sich setzen, auf jeder anderen Insel kommt „Der Weltenleuchtturm steht nur auf der Heimatinsel.“
    Im Info-Panel des Turms: Phase 1 und 2 beauftragbar (wenn die Waren da sind), Phase 3 zeigt „Phase 3 folgt in der Geschichte (nach der alten Karte): Akt 4 …“.

## Was zusätzlich auffallen sollte

- Auf NPC-Inseln kann man nichts bauen („Das ist Oles Insel. Hier kannst du nicht bauen.“), NPC-Gebäude lassen sich nicht abreißen, das Inselinventar sagt „Hier wohnt Ole …“.
- Am NPC-Steg wird seit Version 17 gehandelt (Laden = kaufen, Entladen = verkaufen); siehe `docs/TEST-HANDEL.md`.
- Optik: Pfahldorf mit grauen Schieferklippen und Pfahlhäusern, Werkstattbucht mit Ziegelhallen, Kränen und Schloten (rauchen), Goldberg mit goldenem Berg, grünen Terrassen, Villen und Bannern. Je Steg steht die Figur vorn auf dem Steg.
- Speichern und neu laden (Pausenmenü): Akt, entdeckte Völker und Dörfer bleiben.
- Koop „Gemeinsame Insel“: Der Mitspieler sieht dieselben Inseln, die Story-Zeile und die Meldungen. Gespräch geht auch für ihn; die Entscheidung am Ende trifft nur der Host.
- Getrennte Inseln: keine NPC-Inseln, keine Story-Zeile.
- Ein Spielstand von Version 15 lädt mit dem Dialog „Spielstand aktualisiert … Geschichte“; die NPC-Inseln liegen dann im noch unerkundeten Nebel.

## Abkürzungen in der Konsole (nur Host)

| Befehl | Wirkung |
| --- | --- |
| `tideworks.story()` | Zustand anzeigen (Akt, Flags, gesehen, Schritte) |
| `tideworks.story(2)` | Akt 2 setzen (frühere Schritte gelten als erledigt, Leuchtturm frei) |
| `tideworks.story(1)` | zurück auf Akt 1 (Leuchtturm wieder gesperrt, Entdeckungen bleiben) |
| `tideworks.story('fire', 'wonder:2')` | Auslöser von Hand (hier: Leuchtturm-Stufe 2 fertig → Akt 3) |
| `tideworks.story('step', 'npc_aurel')` | einen Schritt erzwingen |
| `tideworks.story('flag', 'npc_ole')` | Flag setzen |
| `tideworks.story('reset')` | Geschichte von vorn (Akt 1, alles leer) |
| `tideworks.cs('cs_bauplan')`, `tideworks.dialog('brann_1')` | Platzhalter-Szene oder -Dialog anzeigen |
| `tideworks.client.send({ type: 'reveal', x, y, r: 45 })` | Gebiet aufdecken (entdeckt auch NPC-Inseln) |

Automatisch: `npm run check:story` spielt dasselbe ohne Browser mit echtem Segeln durch (Seed als Argument, `-v` zeigt jede Prüfung).
