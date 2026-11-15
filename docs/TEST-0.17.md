# Testanleitung 0.17.0 (Extraktor: parallele Bänder und Ausgleich)

Spielstand Version 18 (alte Stände laden unverändert). Dauer etwa 5 Minuten. Konsole (F12) für `tideworks.…`.
Ohne Browser vorher: `npm run check:extract` (grün).

Vorbereitung: Neues Spiel, Prolog überspringen, Konsole: `tideworks.unlockAll(); tideworks.give(500)`.

## 1. Paralleles Band

1. Lagerkiste bauen und per Band mit Holz füllen (oder Extraktor direkt ans Hauptkontor).
2. Extraktor daneben. Ein Band so legen, dass es **seitlich am Extraktor vorbeiläuft** (z. B. Extraktor oben, Band darunter von rechts nach links) und in eine zweite Kiste führt.
   **Erwartet:** Holz kommt in der zweiten Kiste an; das erste Bandstück wird als Kurve aus dem Extraktor gezeichnet.
3. Ein Band, das **in** den Extraktor zeigt: **Erwartet:** bekommt nichts.
4. Extraktor direkt am Hauptkontor, daneben ein Band, das **ins Hauptkontor** läuft: **Erwartet:** keine Waren aus dem Hauptkontor auf diesem Band (kein Kreislauf). Eine Kiste an der dritten Seite des Extraktors leert sich trotzdem darüber ins Hauptkontor.

## 2. Zwei Öfen über einen Extraktor

1. Reihe bauen: **Hauptkontor – Extraktor (Filter Kohle) – Schmelzofen 1 – Extraktor – Schmelzofen 2**. Der mittlere Extraktor hat keinen Filter.
   **Erwartet:** Ofen 1 bekommt Kohle, der mittlere Extraktor verteilt sie: nach ein paar Sekunden ist in beiden Öfen etwa gleich viel Kohle (z. B. 5 und 4; Info-Panel der Öfen).
2. Unterschied von 1 (5/4): **Erwartet:** nichts pendelt hin und her (der Extraktor steht still, solange sonst nichts zu tun ist).
3. Erz an beide Öfen (z. B. je Kiste mit Erz + Extraktor mit Filter Eisenerz von unten): **Erwartet:** beide Öfen arbeiten, obwohl die Kohle nur in Ofen 1 kommt. Ein Band, das vom mittleren Extraktor wegführt, nimmt reihum das Eisen beider Öfen mit.
4. Filter am mittleren Extraktor auf Eisenerz: **Erwartet:** Kohle wird nicht mehr ausgeglichen.

## 3. Zwei Kisten

1. **Kiste – Extraktor – Kiste**, die linke voll mit Holz, die rechte leer.
   **Erwartet:** beide füllen sich auf etwa die Hälfte (z. B. 21/20), dann Ruhe.
2. **Kiste – Extraktor – Hauptkontor**: wie bisher leert sich die Kiste ganz ins Hauptkontor, aus dem Hauptkontor geht nichts in die Kiste.
