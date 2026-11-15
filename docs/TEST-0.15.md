# Testanleitung 0.15.0 (nach dem ersten Story-Test)

Spielstand Version 18. Dauer etwa 15 Minuten. Konsole (F12) für die Debug-Befehle `tideworks.…`.
Ohne Browser vorher: `npm run check:extract`, `check:story`, `check:npc`, `check:world`, `check:coop`, `check:tree` (alle grün).

## 1. Extraktor wie der Unloader

1. Neues Spiel, Prolog überspringen, Konsole: `tideworks.unlockAll(); tideworks.give(500)`.
2. Lagerkiste bauen, Extraktor direkt daneben. **Erwartet:** schlichter grauer Block mit Nieten und vierfarbigem Fenster, keine Antenne, keine Pfeile; R dreht nichts.
3. Band, das **vom Extraktor weg** führt, zu einer zweiten Kiste legen. Holz per Band in die erste Kiste liefern. **Erwartet:** Holz läuft weiter in die zweite Kiste.
4. Ein Band, das **in** den Extraktor zeigt, und eines, das **quer vorbei** läuft: beide bekommen nichts.
5. Sägewerk oder Schmelzofen an eine andere Seite des Extraktors: **Erwartet:** dessen Ausgabe wird mit herausgeholt (Info-Panel „Holt aus: …“), nichts geht zurück in das Gebäude, aus dem es kam.
6. Schmelzofen neben einen Extraktor am Hauptkontor (Erz und Kohle im Inventar): **Erwartet:** der Ofen bekommt Erz und Kohle direkt, sein Eisen landet im Hauptkontor.
7. Extraktor anklicken → „Filter wählen“ → z. B. Stein: **Erwartet:** Fenster in Steinfarbe, nur noch Stein wird bewegt. „alle“ hebt den Filter auf.
8. Lagerkiste – Extraktor – Hauptkontor: Kiste leert sich ins Hauptkontor, aus dem Hauptkontor geht nichts in die Kiste.
9. **Alter Spielstand** (vor 0.15.0) mit Extraktoren laden: alle liefern weiter wie vorher, auch einer mit quer laufendem Band davor.

## 2. Entdecker

1. Entdecker bauen (oder `tideworks.giveShip('entdecker')` mit der Kamera am Hauptkontor), „Selbst erkunden“ an.
2. **Erwartet:** er fährt zügig nach außen statt an der Heimatinsel entlang, der aufgedeckte Kreis ist sichtbar größer (64 Felder). Ole sollte in den ersten ~10 Minuten auftauchen.
3. Werte zum Anpassen: `src/data/ships.js` (`SHIP_KINDS.entdecker.reveal`, `EXPLORE`).

## 3. Story-Inseln mit Namen

1. Ole entdecken (oder `tideworks.dock('ole')`).
2. **Erwartet:** Minimap zeigt Pfahlhaus-Symbol und „Pfahldorf“, Kartenansicht (M) Symbol und Namen bei jedem Zoom, Inselliste oben unter „Entdeckt, ohne Kontor“ „Pfahldorf · Ole“, Klick auf ein Feld der Insel „Bewohnt von Ole“. Genauso Werkstattbucht (Zahnrad) und Goldberg (Krone).

## 4. Weniger Meldungen

1. Mit einem Schiff an Oles Steg anlegen: Hinweis „… liegt an Oles Steg“. Wegfahren und wieder anlegen: **kein** zweiter Hinweis (außer das Gespräch bringt die Geschichte weiter, dann golden).
2. Viele Inseln auf einmal aufdecken: Kamera aufs Meer, `tideworks.reveal(160)`. **Erwartet:** nach ~3 s **eine** Meldung „N neue Inseln kartiert“ mit Inseltypen und Vorkommen statt je Insel zwei.
3. Eine einzelne Insel mit dem Schiff erkunden: eine Meldung „… entdeckt und kartiert“.
4. Dieselbe Meldung mehrfach (z. B. zweimal hintereinander auf einen gesperrten Bauplatz klicken): ein Toast mit „×2“.
5. Story-Meldungen (Szene, Akt, Bauplan) und Aufträge bleiben länger stehen und werden nicht von anderen verdrängt.

## 5. Kamera folgt dem Boot

1. Ein fahrendes Schiff anklicken. **Erwartet:** Kamera zieht weich hinterher, unten „Kamera folgt …  Esc“.
2. Mausrad in der Bildmitte: Zoom um das Schiff, Folgen bleibt. Mausrad am Rand: Folgen endet.
3. Neu anklicken, dann Karte ziehen → endet. Neu anklicken, WASD → endet. Neu anklicken, Esc → endet (Schiff bleibt ausgewählt). Klick auf das Schild „Kamera folgt“ → endet.
4. Flotte (F) → „Zeigen“ bei einem Schiff: Kamera springt hin und folgt.

## 6. Koop (Kurzprüfung)

Host und Gast (Gemeinsame Insel): Extraktor beim Gast bauen und Filter setzen → beim Host gleich; Kamera-Folgen wirkt nur beim, der klickt.
