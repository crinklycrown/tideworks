# Tideworks – Spielsysteme für Story und Handel

Stand: 24.10.2026. Ergänzt `docs/STORY.md`.
Zahlen sind Startwerte für das Balancing, keine festen Vorgaben.
Bestehende Systeme (Forschung, Markt/Händler, Ziele, Events, Koop) werden **erweitert, nicht ersetzt**.

## 1. Freischaltungen

Jedes baubare Gebäude hat genau eine Freischalt-Quelle.

| Quelle | Gebäude |
| --- | --- |
| Start | Fließband, Lagerhalle, Sägewerk |
| Frühe Forschung (erste Stufe) | Splitter, Kreuzung, Hütte, Lagerkiste |
| Forschung | Ofen, Werft |
| Ole (Ruf) | Kontor (für weitere Inseln), Extraktor, Räucherei |
| Brann (Ruf) | Überlauf-Tor, Brücke, Sortierer, Tor, Schnellband, Pumpen und Rohre, größere Schiffe |
| Aurel (Ruf) | Fortgeschrittene Gebäude, Strom-Technik, bessere Häuser |
| Story | Leuchtturm (Akt 2), Taucherglocke (Akt 3), Leuchtturm-Stufen 3 und 4 |

Regeln:
- Splitter und Kreuzung müssen früh verfügbar sein, damit die Förderband-Logistik nicht frustriert.
- Die Werft muss ohne NPC erreichbar sein (sonst kommt man in Akt 1 nicht zu Ole).
- Nichts, was nur Aurel verkauft, darf zwingend für den Fortschritt sein (Ende A beendet den Handel mit ihm).
- Zuordnung von Extraktor, Sortierer und Tor beim Umsetzen prüfen und ggf. anpassen.

## 2. Story-Zustand

- Ein zentraler Story-Zustand gehört zur **Welt** (nicht zu einem Spieler) und wird gespeichert.
- Felder: aktueller Akt, gesetzte Story-Flags (z. B. `npc_ole_entdeckt`, `karte_gefunden`, `pumpe_gefunden`), gesehene Cutscenes, gesehene Einmal-Dialoge, getroffene Entscheidung.
- Trigger (Ereignisse aus der Simulation):
  - Schiff erreicht NPC-Insel → Entdeckung + Cutscene.
  - Gespräch mit NPC (Klick auf NPC am Kontor/Steg) → je nach Akt Dialog oder Story-Schritt.
  - Leuchtturm erreicht Stufe X.
  - Tauchgang abgeschlossen (mit Fund).
- Übergänge zwischen den Akten genau wie in `docs/STORY.md` beschrieben.
- Ein Debug-Schalter (nur Entwicklung) setzt einen Akt direkt, damit man Szenen testen kann.

## 3. NPC-Inseln

- Drei feste NPC-Inseln, unabhängig vom Zufall der Weltgenerierung, mit wachsender Entfernung zum Start: Ole nah, Brann mittel, Aurel weit.
- Jede NPC-Insel hat eine eigene Optik (Pfahldorf / Werkstattbucht / Goldberg), ein Dorf und einen Steg bzw. Hafen.
- Entdeckt wird eine NPC-Insel, wenn ein eigenes Schiff in ihre Nähe kommt (Nebel aufgedeckt).
- Dörfer wachsen sichtbar mit den Lieferungen des Spielers (mehr Häuser, nachts mehr Lichter).

## 4. Handel mit NPCs

- Währung: das vorhandene **Gold**.
- Handel läuft über den Kontor bzw. Steg der NPC-Insel (Schiff muss dort sein) oder per Lieferroute.
- **Ruf** je NPC: 0–100, Stufen *misstrauisch* (0–24) · *neutral* (25–49) · *freundlich* (50–79) · *vertraut* (80–100). Steigt durch Verkäufe und erledigte Aufträge. Das Angebot wächst mit der Stufe.
- Ole startet bewusst misstrauisch (kleines Angebot), Aurel startet freundlich (Geschenke).

| NPC | Kauft vom Spieler | Verkauft | Besonderes |
| --- | --- | --- | --- |
| Ole | Holz, Bretter, Werkzeug | Fisch, Seile, Netze, gewöhnliche Relikte, Teile der Taucherglocke | Seekarten, die Nebel aufdecken |
| Brann | Eisen, Kupfer, Kohle | Zahnräder, Federn, Rohre, seltene Relikte, Teile der Taucherglocke | Schaltet Logistik-Gebäude frei |
| Aurel | Luxuswaren, Perlen, Werkzeug | Glas, Uhrwerke, Batterien, legendäre Relikte | Geschenke; ab Akt 5 steigende Preise |
| Meerjungfrauen | Fisch, Räucherfisch | Perlen, Korallen, Muscheln, einzigartige Relikte | Erscheinen an Riffen, nachts und an Tauchspots |

**Preise:** Verkauft der Spieler viel von einer Ware, sinkt ihr Preis und erholt sich langsam wieder.

**Aufträge:** Jeder NPC stellt regelmäßig 1–3 Aufträge ein (z. B. „300 Bretter bis morgen Abend“). Belohnung: Gold, Ruf, manchmal Relikte. Laufzeit an den Tag-Nacht-Zyklus gekoppelt.

**Lieferverträge:** Eine feste Schiffsroute liefert dauerhaft eine Menge pro Tag an einen NPC und bringt regelmäßig Gold.

**Feste:** Nach einer großen Lieferung feiert das Dorf ein Fest; die Insel des Spielers bekommt einen zeitlich begrenzten Produktionsbonus.

## 5. Dialoge und Cutscenes

- **Dialoge** als Daten (eigene Datei je Figur oder Szene): Sprecher, Porträt, Textzeilen, optional Bedingung (Akt, Flag) und Einmal-Kennung.
- **Monolog-Fenster:** Porträt links (ragt ins Fenster), Namensschild, Textkasten im Stil der Spiel-UI (Pergament, Holzrahmen), Schreibmaschinen-Text, Klick/Leertaste/Enter für weiter, Blinzeln und Mundbewegung beim Sprechen.
- **Cutscenes** als eigene Module mit einer Zeitleiste von Einstellungen (Shots). Jede Einstellung zeichnet sich selbst per Canvas in 320×180.
- Cutscene-Player: Balken oben/unten, Überspringen-Knopf, pausiert die Simulation, merkt sich „gesehen“, wechselt am Ende direkt in den zugehörigen Dialog.
- Gesehene Cutscenes sind später erneut abspielbar (z. B. im Menü).
- Stilregeln und Referenz: Abschnitt „Stil der Cutscenes“ in `docs/STORY.md`, Referenz-Umsetzung `docs/cutscenes/rauch-hinter-dem-nebel.html`.

## 6. Leuchtturm

- Story-Gebäude, nur einmal baubar, freigeschaltet durch `cs_bauplan`.
- Vier Stufen, jede braucht große Mengen an Waren (bindet Überproduktion):
  - Stufe 1: Grundbau (Akt 2).
  - Stufe 2: Turm → schaltet die Taucherglocke frei, startet Akt 3.
  - Stufe 3: erst nach `cs_alte_karte` → danach erscheint der Tauchspot „Pumpwerk“.
  - Stufe 4: erst nach `cs_flutnacht` → Fertigstellung startet das Finale.
- Optional: Jede Stufe vergrößert die aufgedeckte Sichtweite um den Turm.

## 7. Taucherglocke und Tauchen

- Einmalig baubar aus Teilen von Ole und Brann; wird an ein Schiff gehängt.
- Tauchspots: immer nur **einer** gleichzeitig auf der Karte, zufällig im aufgedeckten Wasser, erkennbar an aufsteigenden Blasen. Nach einem Tauchgang erscheint nach einer Weile ein neuer.
- Ablauf: Schiff mit Glocke zum Spot fahren → Tauchgang starten → kurzes Minispiel.
- **Minispiel** (Seitenansicht unter Wasser, 30–45 s Sauerstoff):
  - *Suchen:* einen bestimmten Gegenstand in Sand und Schrott finden (Stellen freilegen).
  - *Aufschweißen:* eine Kiste oder ein Wrack öffnen (Schweißnaht entlangfahren).
  - Läuft der Sauerstoff ab, endet der Tauchgang ohne Fund.
- Belohnungen: Rohstoffe, Perlen, Relikte; Story-Funde:
  - Karte der alten Welt: nach 3–4 erfolgreichen Tauchgängen in Akt 3.
  - Zerstörtes Pumpwerk: besonderer Spot nach Leuchtturm Stufe 3.

## 8. Relikte und Reliktsockel

- **Reliktsockel:** in drei Stufen (gewöhnlich, selten, legendär), höhere Stufen brauchen teurere Zutaten (z. B. Perlen, Korallen). **Ein Sockel pro Insel**, darin **ein Relikt**.
- **Relikte:** drei Stufen wie die Sockel; ein Relikt passt nur in einen Sockel gleicher oder höherer Stufe. Wirkung gilt für die ganze Insel.
- Herkunft: NPC-Handel (Gold), Aufträge, Meerjungfrauen, Tauchgänge (legendäre vor allem hier).

| Stufe | Beispiele |
| --- | --- |
| Gewöhnlich | +5 % Produktionsrate · +10 % Bohrrate · Bänder 10 % schneller · Schiffe dieser Insel 15 % schneller |
| Selten | +20 % Produktionsrate · −25 % Stromverbrauch · Lager +50 % · Häuser verbrauchen 25 % weniger · +20 s Sauerstoff beim Tauchen |
| Legendär | Öfen brauchen keine Kohle/Energie · doppelte Produktion einer gewählten Ressource · Kohle wird zu Eisen · „Herz der Flut“ (Tauchspots doppelt so oft) · „Die erste Flamme“ (Ende A) · „Die Krone des Herrschers“ (Ende B) |

Balance für legendäre Relikte: jedes nur einmal im Spiel, und sie verbrauchen laufend Perlen, solange sie aktiv sind.

## 9. Enden

- Die Entscheidung ist endgültig und wird gespeichert. Danach geht das Spiel frei weiter.
- **Ende A:** Aurels Insel wird zur verbrannten, leeren Insel im Besitz des Spielers; Handel mit Aurel beendet; Inselrat übernimmt einen Teil seines Angebots; Ole und Brann mit Rabatt und besserem Loot.
- **Ende B:** Inseln von Ole und Brann werden zu Ruinen (kein Handel mehr); Aurels Inseln samt Gebäuden gehen an den Spieler.

## 10. Koop

Der Koop-Modus existiert bereits und darf durch die Story nicht kaputtgehen.
- Story-Zustand, NPC-Ruf, Leuchtturm und Tauchspots gehören zur Welt und werden vom Host synchronisiert.
- Spieleraktionen (bauen, handeln, tauchen) laufen über den bestehenden Befehls-/Host-Weg, nie direkt am Zustand vorbei.
- Cutscenes laufen bei allen Spielern gleichzeitig; Überspringen nur durch den Host (Vorschlag).
- Die Entscheidung am Leuchtturm trifft vorerst der Host (Vorschlag, siehe offene Punkte in `docs/STORY.md`).
