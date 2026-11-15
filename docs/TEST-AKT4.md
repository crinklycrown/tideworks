# Test: Alte Karte, Akt 4 und Pumpwerk (0.21.0)

## Normal spielen

1. In Akt 3 nach drei erfolgreichen Tauchgängen die **Alte Karte** finden, Story-Zeile „Bring die Karte zu Brann.“
2. Bei Brann anlegen und mit ihm sprechen: Szene **„Die alte Karte“** (ca. 37 s). Achten auf: Karte entrollt sich, Finger zeigt Dörfer und Täler, Wasser steigt, übrig bleiben die vier Inseln in ihrer echten Lage, am Ende der Blick aus Branns Fenster.
3. Danach Branns Dialog, Meldungen „Leuchtturm Stufe 3 freigeschaltet“ und „Akt 4: Die Flut“, Story-Zeile „Baue den Leuchtturm weiter aus …“.
4. Im Turm die Baustelle für Stufe 3 eröffnen und fertig bauen.
5. Zu Aurel fahren: Er sagt einmal „Ihr taucht in letzter Zeit viel, hört man. …“. Seine Geschenke kommen in Akt 4 öfter und sind größer.
6. Der nächste Tauchspot hat **große Blasen** (Meldung „Große Blasen im Wasser!“). Hinfahren und tauchen.
7. Minispiel: Tor zur Pumpenhalle aufschweißen → Halle → „Verbogenes Brecheisen“ suchen. Luftanzeige doppelt so lang.
8. Einmal absichtlich scheitern (Luft leer oder Esc zweimal): Die großen Blasen bleiben, nochmal tauchen geht.
9. Erfolg: Ergebnisfenster „Ein schweres Brecheisen mit einem eingeprägten Wappen.“, Story-Zeile „Bring deinen Fund zu Brann.“
10. Brann: „Das ist das alte Pumpwerk. …“, dann Meldung „Szene: Die Flutnacht“ (Platzhalter), sein Dialog, Akt 5.

## Abkürzung über die Konsole (F12)

Neues Spiel, Prolog überspringen, dann:

```js
// Karte geben und zu Brann
tideworks.story(3); tideworks.giveShip(); tideworks.story('flag', 'karte_gefunden'); tideworks.dock('brann')
// → auf Branns Steg klicken und mit ihm sprechen

// Szene einzeln ansehen bzw. ein Bild bei t Sekunden
tideworks.cs('cs_alte_karte'); tideworks.cs('cs_alte_karte', 24)

// Leuchtturm Stufe 3 fertig (in Akt 4)
tideworks.wonder(3, 'fire')
// Aurel besuchen
tideworks.dock('aurel')

// Story-Spot Pumpwerk erzwingen und hinfahren
tideworks.dive('mount'); tideworks.dive('story', 'pumpwerk'); tideworks.dive('spot'); tideworks.dive('over')
// → Schiff anklicken → „Tauchgang starten“

// Im Minispiel: Luft fast leer (Fehlschlag testen)
tideworks.diveState().air = 5

// Nur das Minispiel als Probe (ohne Beute, ohne Spot)
tideworks.diveGame({ story: 'pumpwerk', act: 4 })

// Fund geben und zu Brann
tideworks.story('flag', 'pumpe_gefunden'); tideworks.dock('brann')
```

Automatisch: `npm run check:akt4`.
