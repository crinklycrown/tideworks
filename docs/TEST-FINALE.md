# Test: Finale – cs_wahrheit und die Entscheidung (0.22.0)

## Normal spielen

1. In Akt 5 die Baustelle für **Leuchtturm Stufe 4** fertig bauen.
2. Die Szene **„Die Wahrheit“** läuft (ca. 83 s) und das Spiel steht still. Darauf achten:
   - Rückblenden in Sepia mit dunklem Rand, die Gegenwart in Sturmnachtfarben.
   - Im Thronsaal steht der Herrscher zuerst mit dem Rücken zum Bild. Seine Zeile hat nur den Namen „Herrscher“ und kein Porträt.
   - Dann dreht er sich um: grüner Mantel, Messingknöpfe, helle Strähne, Ring. Danach ist es kurz still.
   - Ab jetzt zeigen seine Zeilen das Spieler-Porträt.
   - Bild 8 hat denselben Blitz wie der Prolog „Gestrandet“.
   - Zum Schluss: die Fackel in der Hand vor der dunklen Lampe, Aurel in der Luke.
3. Aurels Dialog läuft. Danach bleibt das Bild stehen, und rechts erscheinen **„Leuchtfeuer entzünden“** und **„Nicht entzünden“**. Es gibt keine Zeitgrenze.
4. Einen Knopf drücken. Die Rückfrage lautet „Diese Entscheidung ist endgültig.“. Mit **Abbrechen** (oder Esc) geht es zurück zur Wahl, mit **Bestätigen** wird entschieden.
5. Danach läuft die Szene „Das Feuer antwortet“ (A) bzw. „Die Lichter gehen aus“ (B), seit 0.23.0 mit allen Folgen (siehe `docs/TEST-ENDEN.md`). Akt 6 beginnt, das Spiel läuft frei weiter.
6. **Laden:**
   - Vor Schritt 4 neu laden: Der Dialog und die Wahl kommen wieder (das Spiel hat vorher automatisch gespeichert).
   - Nach Schritt 4 neu laden: Es gibt keine Wahl mehr, die Entscheidung bleibt.

## Abkürzung über die Konsole (F12)

Neues Spiel starten, den Prolog überspringen (Esc), dann:

```js
// Direkt ins Finale: Akt 5, Leuchtturm Stufe 4 fertig, Szene + Entscheidung (nur Host)
tideworks.finale()

// Nur die Szene ansehen (ohne Wirkung) bzw. ein Einzelbild bei t Sekunden
tideworks.cs('cs_wahrheit')
tideworks.cs('cs_wahrheit', 19.9)  // Umdrehen des Herrschers (ca. 19,8–20,2 s)
tideworks.cs('cs_wahrheit', 68.4) // Blitz (vgl. tideworks.cs('cs_prolog', 5))

// Zustand ansehen (act, choice) bzw. zurück nach Akt 5, um nochmal zu entscheiden
tideworks.story()
tideworks.story(5)
```

Gesehene Szenen lassen sich auch im Pausenmenü unter **Szenen → „Die Wahrheit“** abspielen.

## Koop

1. Der Host erstellt eine Lobby, der Gast tritt bei, der Host startet.
2. Der Host ruft `tideworks.finale()` auf. Die Szene läuft bei beiden, und Esc beim Gast überspringt nicht.
3. Der Gast sieht auf dem Standbild „Der Host entscheidet …“. Sobald der Host bestätigt hat, sieht er „Der Host hat entschieden: …“ und dann die Platzhalter-Meldung. Beide sind dann in Akt 6.

Automatisch: `npm run check:story` (Finale, Entscheidung, endgültig) und `npm run check:coop`.
