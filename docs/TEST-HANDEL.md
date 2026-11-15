# Testanleitung Handel mit den Völkern (Version 17)

Ziel: einmal von Hand mit Ole, Brann und Aurel handeln, Ruf aufbauen, einen Auftrag und einen Liefervertrag erfüllen und das Dorf wachsen sehen.
Alle Zahlen zum Anpassen stehen in `src/data/npctrade.js`. Die Konsolen-Befehle (F12) wirken nur beim Host.

## Schnellweg (etwa 15 Minuten)

1. `npm run dev` oder `dist/tideworks.html` öffnen. **Neues Spiel**, Seed `4711`.
2. Schiff und Startgeld: In der Konsole `tideworks.giveShip()` (Kamera auf der Heimatinsel) und `tideworks.coins(3000)`.
3. Zu Ole: `tideworks.dock('ole')` setzt das Schiff an Oles Steg, deckt die Umgebung auf und fährt die Kamera hin. (Der normale Weg: hinsegeln, Seed 4711 etwa Feld 320 / −220.)
   Erwartet: „Pfahldorf entdeckt!“ und „**Ole** ist dir gegenüber **misstrauisch**. Handeln kannst du am Steg, alles Weitere im Fenster „Völker“ (N).“
4. **Fenster „Völker“** (Taste N oder Knopf unten): Reiter Ole (Misstrauisch); Brann und Aurel heißen „???“, bis du sie entdeckt hast.
   Bei Ole sichtbar: Rufbalken 10/100, Schiff am Steg mit Laderäumen, Angebot (Fisch kaufbar; Seil ab Neutral; Fischernetz ab Freundlich; Gewöhnliches Relikt und Teil der Taucherglocke als „bald“; Seekarte ab Neutral),
   „Ole kauft“ (Holz; Werkzeug ab Neutral), ein Auftrag (Holz, Belohnung, „bis heute Abend“), Lieferverträge ausgegraut, Freischaltungen (Kontor gründen ab Neutral, Räucherei ab Freundlich), Dorfstufe 0/4.
5. **Kaufen:** Bei Fisch „+10“. Erwartet: Toast „Ole: 10 Fisch gekauft (−…)“, Münzen sinken, Fisch im Laderaum, Vorrat sinkt, der Preis steigt leicht.
   „+10“ bei Seil geht noch nicht (ausgegraut, Schloss „ab Neutral“).
6. **Auftrag und Verkauf:** `tideworks.cargo(null, 'holz', 120)` (null = erstes Schiff) lädt Holz, dann im Fenster an jedem Holz-Laderaum „Entladen“.
   Erwartet: Holz geht zuerst an Oles Auftrag (Balken füllt sich; ist er voll: „Auftrag für Ole erledigt … +Münzen, +Ruf“), der Rest wird verkauft. Ruf steigt, „Ole kauft Holz“ zeigt ▼ (Preis gedrückt).
   Eine Minute warten: der Ankaufpreis erholt sich.
7. **Rufstufe:** Weiter Holz verkaufen oder `tideworks.rep('ole', 30)`. Erwartet: „**Ole**: Ruf jetzt **Neutral**! Freigeschaltet: Kontor gründen.“ Im Angebot jetzt Seil und Seekarte, dazu gleich ein neuer Auftrag („Ole hat einen neuen Auftrag“).
   **Seekarte** kaufen: Toast mit Koordinaten, die nächste unentdeckte Insel ist aufgedeckt (Karte M).
8. **Liefervertrag:** Bei Ole „150 Holz je Tag“ → **Abschließen** (Schiff am Steg). Dann in der Flotte (F) eine Route anlegen: Heimat-Hauptkontor (Holz laden) → Oles Steg (alles entladen). Genug Holz ins Hauptkontor: `tideworks.give(2000, ['holz'])` mit der Kamera auf der Heimatinsel.
   Erwartet: Der Vertragsbalken im Fenster füllt sich mit jeder Fahrt („Heute x von 150“), Münzen zum festen Preis. Am nächsten Morgen (Tag 10 min + Nacht 5 min, mit Tempo 3× etwa 5 min): „Liefervertrag mit Ole erfüllt: +80 Münzen, +3 Ruf“.
   Route anhalten und einen Tag warten: „Liefervertrag … verpasst (−3 Ruf)“, nach dem zweiten Tag kündigt Ole.
9. **Dorf wächst:** Nach Lieferungen im Wert von 500 Münzen (etwa 250 Holz): „Das Dorf von Ole wächst (Stufe 1 von 4)“, neue Laternen und ein Netz an der Küste. `tideworks.time(23)` springt in die Nacht: Laternen und Fenster leuchten.
10. **Brann:** `tideworks.dock('brann')`. Brann verkauft Zahnräder und Federn, kauft Eisen, Kupfer, Kohle, Räucherfisch. Plan „Schnellbänder“ ab Freundlich: `tideworks.rep('brann', 55)` → „Ruf jetzt Freundlich! Freigeschaltet: Sortierer, Tor, Kogge. Neue Pläne zu kaufen: Schnellbänder, Dampfkraft“, dann im Fenster den Plan „Schnellbänder“ kaufen (Skilltree: Schnellbänder jetzt erforschbar).
    In der Werft (Werft bauen oder vorhandene) steht jetzt **Kogge bauen**.
11. **Aurel:** `tideworks.dock('aurel')`. Freundlich von Anfang an: drei Aufträge, Glas, Uhrwerk, Batteriezelle, Luxuswaren als „bald“. An manchen Morgen: „Aurel schickt dir ein Geschenk“ (Münzen oder Waren in die Heimatinsel).

## Was zusätzlich auffallen sollte

- Steg einer NPC-Insel anklicken: Info-Panel mit Ruf, offenen Aufträgen und Knopf „Handel mit Ole (N)“. Schiff am Steg auswählen: Panel mit Laderäumen (Entladen = verkaufen/liefern), „Kaufen“ und demselben Knopf.
- Ohne Schiff am Steg zeigt das Fenster „Kein Schiff von dir an Oles Steg …“ mit Knopf „Zeigen“; Kauf-Knöpfe, Pläne und Vertragsabschluss sind ausgegraut.
- Münzbuch (Statistik P → Münzen): Posten „Verkauf an Ole“, „Kauf von Ole“, „Aufträge und Verträge (Ole)“, „Geschenke von Aurel“.
- **Räucherei** (Verarbeitung, nach Ole freundlich): 2 Fisch + 1 Holz → 1 Räucherfisch.
- Speichern, neu laden: Ruf, Aufträge, Verträge, Vorräte und Dorfstufe sind gleich.
- **Koop** (zwei Fenster wie in README „Koop“): Der Mitspieler sieht im Fenster „Völker“ denselben Ruf und dieselben Aufträge, kann mit seinem Schiff am Steg kaufen und verkaufen; `tideworks.rep` wirkt bei ihm nicht.
