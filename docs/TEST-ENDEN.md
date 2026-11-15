# Test: Enden A und B (0.23.0)

Die Entscheidung am Leuchtturm ist **endgültig**. Teste jedes Ende deshalb auf einer **eigenen Kopie** des Spielstands.

## Vorbereitung: zwei Kopien

1. Pausenmenü → **Speichern**.
2. Hauptmenü → **Spiel laden** → beim Spielstand **Exportieren** (lädt eine `.json` herunter).
3. **Datei importieren**, zweimal dieselbe Datei. Jetzt gibt es zwei Kopien: eine für A, eine für B. Den Namen erkennst du am Datum in der Liste.

Ohne eigenen Spielstand geht es auch mit einem neuen Spiel (Seed z. B. `4711`): Prolog mit Esc überspringen, dann wie unten.

## Abkürzung über die Konsole (F12, nur Host)

```js
tideworks.ending('a')   // Ende A: Akt 5, Leuchtturm Stufe 4, Entscheidung A → Szene, Dialog und Folgen
tideworks.ending('b')   // Ende B (auf der anderen Kopie!)
tideworks.endingInfo()  // Zähler: Ruinen, eigene Gebäude, Handel ja/nein je Volk
tideworks.story()       // act 6, choice 'a' oder 'b'

// Nur ansehen, ohne Wirkung (geht auch nach der Entscheidung)
tideworks.cs('cs_ende_a')          // ganze Szene, danach Branns Dialog
tideworks.cs('cs_ende_a', 17)      // Einzelbild: der Strahl über den Inseln
tideworks.cs('cs_ende_b', 38)      // Einzelbild: Aurel mit der Krone
```

`tideworks.ending` lehnt ab, wenn schon entschieden wurde. Zum Wiederholen die andere Kopie laden.

## Ende A „Das Feuer antwortet“ (ca. 55 s, dann Dialog)

**Szene** (Esc überspringt):
- Die Fackel fährt an die Linse, weißer Blitz, die Linse glüht. Aurel steigt die Treppe hinab.
- Draußen dreht sich der Strahl über dem Meer und blitzt auf, wenn er zu dir zeigt.
- **Höhepunkt:** Der Strahl streicht über den Horizont, Insel um Insel gehen Lichter an, Fackeln steigen die Hänge hinauf. Der Goldberg antwortet nicht.
- Pfahldorf: Ole hebt die Laterne, die Leute steigen den Klippenpfad hinauf. Einblendung „Die Lampe… sie brennt.“
- Werkstattbucht: Einblendung Brann „Diesmal hat jemand das Feuer entzündet.“
- Am Turm legt Aurel ab. Einblendung „Das war ein Fehler, Herrscher. Von mir bekommst du nichts mehr.“
- Der Sturm überspült Steg und Pfahlhäuser, oben auf der Klippe die Laternen.
- Morgen: Rauch über dem Goldberg, Aurels Schiff verschwindet. Darauf Branns zwei Zeilen.

**Danach im Spiel:**
- Drei Meldungen: „Die Geschichte ist erzählt …“, „Der Goldberg gehört dir …“, „Die erste Flamme …“.
- Ziel-Karte rechts: Akt 6, Satz „Das Leuchtfeuer brennt, und diesmal wurden alle gewarnt. Bau den Goldberg wieder auf, für alle.“
- Lager der Heimatinsel: **Die erste Flamme** ×1.
- Der Leuchtturm (Stufe 4) brennt jetzt dauerhaft, auch nach Speichern und Laden.
- **Goldberg:** Brandruinen statt Villen (Klick: Info mit „Abreißen“), alles andere ist weg. An Aurels altem Steg steht **dein Hauptkontor**. Auf der Insel kannst du bauen.
- Ein neuer Steg mit Figur: der **Inselrat**. Völker-Fenster (N): Reiter „Inselrat“, Angebot (Glas, Uhrwerk, Zellen), Ankauf (Werkzeug, Fisch, Perlen), Aufträge. Mit einem Schiff anlegen und handeln.
- Völker-Fenster: Aurel „fort“, kein Handel. Ole und Brann „Vertraut“, Preise besser als vorher, neue Waren (Ole: Räucherfisch, Perlen; Brann: Stahl, Draht).
- **Fest:** Pfahldorf und Werkstattbucht haben Wimpelketten; nachts Lampions und Feuerwerk (Zeit vorspulen: `tideworks.time(22)`). Nach 900 s Spielzeit ist das Fest vorbei.
- Routen mit einem Stopp an Aurels Steg verlieren diesen Stopp.

## Ende B „Die Lichter gehen aus“ (ca. 50 s, kein Dialog danach)

**Szene:**
- Die Fackel sinkt, die Flamme wird klein, Aurel steigt aus der Luke und verneigt sich.
- Eine Sturmwand zieht über den Horizont, auf Oles und Branns Inseln gehen die Lichter nacheinander aus. Der Goldberg bleibt hell.
- Pfahldorf im Sturm: Fenster für Fenster dunkel, Oles Laterne zuletzt.
- Morgen: Ruinen, leere Pfähle, wo Oles Steg war. Dann die Ruinen der Werkstattbucht.
- Aurel: Einblendung „Eine weise Entscheidung. Willkommen zurück, Herrscher.“, dann hebt er die Krone ins Bild.
- Nur noch Wellen, Abblende, zurück ins Spiel.

**Danach im Spiel:**
- Drei Meldungen, Akt 6, Satz „Der Turm bleibt dunkel. Die Krone gehört wieder dir, doch die Dörfer schweigen.“
- Lager der Heimatinsel: **Die Krone des Herrschers** ×1. Der Leuchtturm bleibt dunkel.
- **Pfahldorf, Werkstattbucht:** Ruinen, keine Lichter, keine Figuren, Stege nur noch Pfähle. Völker-Fenster: „Ruinen“, kein Handel. Schiffe können dort nicht mehr anlegen, Routen-Stopps sind entfernt.
- **Goldberg:** alle Gebäude gehören dir (Villen sind Bürgerhäuser), dein Hauptkontor an Aurels altem Steg, **Aurel steht dort als Figur** und handelt nicht.

## Beide Enden

- Pausenmenü → **Szenen**: das gesehene Ende ist dabei und lässt sich erneut abspielen (ohne Wirkung).
- Speichern, neu laden: alles bleibt (Ruinen, Kontor, Inselrat, Fest-Restzeit, Lampe).
- Reduzierte Bewegung (Systemeinstellung): statt der Szene laufen die Zeilen als Dialog.

## Koop (Gemeinsame Insel)

1. Host und Gast im selben Spiel, Host ruft `tideworks.ending('a')` (oder wählt im Finale).
2. Die Szene läuft bei beiden; nur der Host kann überspringen.
3. Danach sieht der Gast dieselben Folgen: Ruinen, Kontor, Inselrat, Fest. Übernommene Gebäude gehören dem Host und sind für alle nutzbar.
4. Bei **Getrennten Inseln** gibt es keine Geschichte und damit keine Enden.
