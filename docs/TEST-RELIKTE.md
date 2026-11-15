# Test: Relikte und Reliktsockel (0.24.0)

Ohne eigenen Spielstand geht es mit einem neuen Spiel (Seed z. B. `4711`): Prolog mit Esc überspringen, dann wie unten.
Alle Zahlen stehen in `src/data/relics.js`. Den Ablauf ohne Browser prüft `npm run check:relics`.

## Abkürzung über die Konsole (F12, nur Host)

```js
tideworks.client.send({ type: 'storyDebug', op: 'act', n: 2 })   // Akt 2: Forschung „Reliktkunde“ wird möglich
tideworks.client.send({ type: 'unlockAll' })                      // Testmodus: alles erforscht, Lager voll (auch Reliktkunde)
tideworks.client.send({ type: 'unlock', key: 'sockel2', src: 'npc' })   // Messingsockel (sonst Brann, vertraut)
tideworks.client.send({ type: 'unlock', key: 'sockel3', src: 'npc' })   // Goldener Sockel (sonst Aurel, vertraut)
tideworks.relicsAll()   // alle Relikte, die es noch nicht gibt, in die Sammlung (auch die beiden End-Relikte)
tideworks.pearls(50)    // 50 Perlen (und je 25 Korallen und Muscheln) auf die Insel unter der Kamera
tideworks.relics()      // Sammlung als Liste: id, Sockel, Insel, ruht, gewählte Ware
```

## 1. Forschung und Bau

1. Neues Spiel, Akt 1: Forschung (T) → Ast Wohnen → **Reliktkunde** ist gesperrt, Voraussetzung „Akt 2 der Geschichte“.
2. Akt 2 setzen, Handwerk erforschen, dann Reliktkunde. Im Baumenü „Wohnen“ steht jetzt der **Reliktsockel** (Stein).
3. Sockel neben das Hauptkontor setzen. Einen zweiten Sockel auf derselben Insel versuchen: „Auf jeder Insel steht höchstens ein Reliktsockel.“
4. Auf einer Insel ohne Hauptkontor: „Reliktsockel gibt es nur auf Inseln mit Hauptkontor.“

## 2. Einsetzen, Stufen, Wirkung

1. `tideworks.relicsAll()`. Sockel anklicken: Das Info-Panel listet alle passenden Relikte mit Wirkung, darunter „… passen erst in einen höheren Sockel“.
2. **Zahnrad der Uhrmacherzunft** einsetzen: Das Zahnrad steht klein oben auf dem Sockel. Im Lagerfenster unten steht „Zahnrad … Produktionsrate +5 %“, der Tooltip zeigt den genauen Bonus.
3. Ein seltenes Relikt lässt sich hier nicht einsetzen (steht nicht in der Liste).
4. Sockel aufwerten (U oder Info-Panel): Messingsockel, das Zahnrad bleibt. Jetzt **Schlüsselbund** einsetzen: „Kapazität“ im Lagerfenster steigt um 50 %.
5. Aufwerten auf den **Goldenen Sockel**: Er schimmert, nachts leuchtet er.
6. **Füllhorn**: „Einsetzen …“ → Ware wählen (z. B. Eisenbarren). Im Info-Panel lässt sich die Ware später ändern.
7. **Herausnehmen**: Das Relikt liegt wieder in der Sammlung, die Wirkung ist weg.

## 3. Legendär und Perlen

1. Perlen auf der Insel aufbrauchen (oder ein neues Spiel ohne Testmodus), **Ewige Glut** einsetzen: Das Relikt ist blass, das Info-Panel meldet „Keine Perlen im Inselinventar: Die Wirkung ruht“, dazu kommt eine Meldung.
2. `tideworks.pearls(10)`: Nach höchstens einer Sekunde wirkt es wieder (Meldung), eine Perle ist weg.
3. Einen Spieltag (15 min, Tempo 3×) laufen lassen: 2 Perlen weniger. Statistik der Perle: Posten „Relikte (Unterhalt)“.
4. `tideworks.relicsAll()` noch einmal: Legendäre kommen nicht doppelt.

## 4. Wirkungen im Spiel (Stichproben)

- **Ewige Glut**: Schmelzofen ohne Kohle-Band schmilzt weiter, der Induktionsofen läuft ohne Strom.
- **Stein der Wandlung**: Ein Bohrer auf Kohle gibt Eisenerz aus.
- **Rollenglied**: Items auf den Bändern der Insel laufen sichtbar etwas schneller.
- **Glimmende Spule**: Strom-Tab bzw. Netz im Info-Panel zeigt 25 % weniger Bedarf.
- **Die erste Flamme**: Netze der Insel zeigen keinen Bedarf mehr, nichts steht wegen Strom still.
- **Krone**: Häuser nehmen doppelt so viel Fisch.
- **Atemmuschel** auf der Heimatinsel: Beim nächsten Tauchgang ist die Luftanzeige länger (55 statt 35 s).
- **Herz der Flut**: Nach einem Tauchgang kommt der nächste Spot nach der halben Pause.

## 5. Herkunft

1. Ole entdecken und Ruf auf „freundlich“ (`tideworks.client.send({ type: 'npcRep', npc: 'ole', n: 60 })`): Meldung „Relikte im Angebot“, im Fenster Völker (N) unter „Angebot“ ein gewöhnliches Relikt für 900 Münzen. Mit einem Schiff am Steg „Kaufen“: Es liegt in der Sammlung, heute gibt es kein zweites.
2. Brann bzw. Aurel ab „vertraut“: seltenes bzw. legendäres Relikt.
3. Aufträge: Manche zeigen „und <Relikt>“ bei der Belohnung. Erledigen → Meldung mit Relikt.
4. Tauchgang mit Fund: Mit etwas Glück steht im Ergebnisfenster „Relikt“ mit Bild und Text.
5. Ende A oder B (`tideworks.ending('a')`, auf einer Kopie!): Die Meldung nennt das End-Relikt, es liegt in der Sammlung.
6. Fenster **Relikte (L)**: Herkunft mit Ole, Brann, Aurel, Aufträgen, Tauchgängen, „Meerjungfrauen · bald“ und der Entscheidung. Noch nicht gefundene Relikte erscheinen als graue Umrisse.

## 6. Speichern, alte Stände, Koop

1. Speichern und Laden: Sammlung, eingesetzte Relikte und gewählte Ware bleiben.
2. Ein Spielstand aus 0.23.x mit „Die erste Flamme“ oder „Krone“ im Lager: Beim Laden erscheint „Spielstand aktualisiert“, das Relikt liegt in der Sammlung, nicht mehr im Lager.
3. Koop (zwei Browser): Der Mitspieler sieht Sockel, Relikt und Wirkung (Lagerzeile, Info-Panel) und kann einsetzen und herausnehmen. `tideworks.relicsAll()` wirkt nur beim Host.
