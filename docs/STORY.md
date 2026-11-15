# Tideworks – Story

Stand: 24.10.2026. Diese Datei ist die verbindliche Story-Grundlage für die Umsetzung.
Spielsysteme dazu stehen in `docs/SYSTEMS.md`.

## Kernidee

Der Spieler wird ohne Erinnerung auf einer Insel angespült und baut eine Fabrik-Kolonie auf.
Nach und nach entdeckt er drei Inselvölker, baut einen Leuchtturm und taucht mit einer Taucherglocke
ins versunkene alte Land. Am Ende erfährt er: Er selbst war der Herrscher dieses Landes.
Der freundlichste NPC, König Aurel, hat damals das Pumpwerk zerstört, den Befehl zum Warnfeuer
unterschlagen, dem Spieler die Schuld gegeben und ihn aufs Meer geschickt.
Mit der Fertigstellung des Leuchtturms steht der Spieler vor derselben Entscheidung wie damals:
das Leuchtfeuer entzünden oder nicht.

## Was wirklich geschah (Hintergrund, wird erst in Akt 5 vollständig gezeigt)

1. Das Land lag tief und wurde von einem großen Pumpwerk vor den Gezeiten geschützt.
2. Aurel, König der Bergdörfer, zerstörte das Pumpwerk absichtlich. Ziel: die Dörfer im Tiefland
   loswerden, den Herrscher stürzen, allein herrschen und dem Herrscher die Schuld geben.
3. Aurel meldete dem Herrscher (dem Spieler), das Pumpwerk sei ausgefallen.
4. Der Herrscher befahl, das Leuchtfeuer als Warnung für alle Dörfer zu entzünden.
5. Aurel gab den Befehl nie weiter. Er und seine Leute zogen sich schweigend auf den Berg zurück.
6. Die Flut überrollte das Tiefland. Nur die Bergspitzen blieben: die heutigen Inseln.
7. Aurel erzählte den Überlebenden, der Herrscher habe das Feuer verweigert.
8. Der Herrscher stellte Aurel zur Rede, wurde überwältigt, gefesselt und bei Sturm aufs Meer geschickt.
9. Kurze Zeit später wurde er an einer Insel angespült, ohne Erinnerung. Hier beginnt das Spiel.

## Figuren

| Figur | Rolle | Ort | Stimmung in Cutscenes |
| --- | --- | --- | --- |
| Ole | Stufe 1, alter Fischer, misstrauisch | Nächste Insel: Pfahldorf an grauen Klippen | Regen, Nebel, kühles Licht |
| Brann | Stufe 2, Werkmeister, prüfend, hilfsbereit | Werkstattbucht in mittlerer Entfernung | Bewölkt, warmes Werkstattlicht |
| Aurel | Stufe 3, König vom Goldberg, übertrieben freundlich | Am weitesten draußen | Sonne, Gold, alles ein bisschen zu perfekt |
| Der Herrscher | Der Spieler vor der Flut | Nur in Rückblenden | Sepia |
| Meerjungfrauen | Handelspartner unter Wasser / an Riffen | Riffe, Tauchspots | Türkis, Lichtstrahlen |

### Der Spieler im Bild

Der Spieler hat drei feste Merkmale: dunkelgrüner Mantel mit Messingknöpfen, helle Strähne im Haar,
schwerer Ring. Er erscheint in den Cutscenes immer nur kurz und nie ganz deutlich:

| Cutscene | Wie man sich sieht |
| --- | --- |
| cs_prolog | Die Hand mit Seilspuren trägt den Ring. Das Gesicht liegt im Sand, nur die helle Strähne ist sichtbar. |
| cs_npc_brann | Kurz über die Schulter von hinten: der grüne Mantel. |
| cs_licht_im_wind | Kleine Figur oben auf dem Gerüst, Mantel im Wind. |
| cs_abstieg | Spiegelung im Bullauge der Taucherglocke, vom Glas verzerrt. |
| cs_flutnacht | Der Herrscher von hinten: grüner Mantel, helle Strähne, Ring an der Hand auf dem Kartentisch. |
| cs_wahrheit | Der Herrscher dreht sich um: dasselbe Gesicht wie im Bullauge. |

## Ablauf der Akte

Jeder Akt endet mit einem Ereignis, das eine Cutscene auslöst. Danach folgt ein Dialog im Monolog-Fenster
(Porträt links, Textkasten, Klick für weiter).

### Prolog

- **Auslöser:** Neues Spiel.
- **Cutscene `cs_prolog` „Gestrandet“:** Schwarzbild, nur Sturm und Wellen (0–3 s) · Blitz zeigt ein Boot als Silhouette (3–5 s) · Schnitt zum Morgen: ruhiger Strand, Möwen, Wrack mit fremdem Wappen (5–10 s) · Hand mit Seilspuren und Ring öffnet sich, nasser Zettel, Kamera fährt ans Siegel (10–14 s) · Abblende, Titel „Tideworks“.
- **Text:** Kein gesprochener Text. Auf dem Zettel lesbar: „…Leuchtfeuer sofort entzünden. Gez. …“

### Akt 1 – Gestrandet

- **Gameplay:** Lager, Sägewerk, erste Produktionskette, Werft, erstes Schiff. Die drei NPC-Inseln entdecken (Reihenfolge nach Entfernung: Ole, Brann, Aurel). Erster Handel.
- **Ende:** Wenn alle drei Völker entdeckt sind, zurück zu Brann → `cs_bauplan` → Akt 2.

**Cutscene `cs_npc_ole` „Rauch hinter dem Nebel“** (Auslöser: erstes Schiff erreicht Oles Insel; Referenz-Umsetzung: `docs/cutscenes/rauch-hinter-dem-nebel.html`)
Blick über den Bug in dichten Nebel (0–4 s) · Rauchsäulen hinter dem Nebel (4–7 s) · Nebel teilt sich: Dorf an grauen Klippen, Steg mit Pfahlhaus (7–11 s) · Nahaufnahme: Ole hebt die Laterne (11–13 s) · Großaufnahme, misstrauischer Blick (13–15 s).

Dialog **Ole**:
1. „Halt! Keinen Schritt weiter auf meinen Steg.“
2. „Vom Meer kommt nichts Gutes. Das weiß hier jedes Kind.“
3. „Mein Vater hat da unten Korn gesät. Heute werfe ich dort meine Netze aus.“
4. „Keiner hat uns gewarnt. Die Lampe blieb dunkel.“
5. „Du bist kein Fischer. Viel zu weiche Hände. … Woher kommst du überhaupt?“
6. „Pah. Wir handeln, mehr nicht. Bring Holz, dann reden wir weiter.“
7. „Und halt die Augen offen. Da draußen gibt es noch mehr als uns.“

**Cutscene `cs_npc_brann` „Funken in der Werkstatt“** (Auslöser: Schiff erreicht Branns Insel)
Bewölkt, aber trocken; Kamera gleitet vom Wasser in eine Bucht mit Kränen und Schornsteinen (0–5 s) · Hämmern, Funken fliegen aus einem offenen Tor (5–9 s) · Brann tritt heraus und wischt die Hände an einem Lappen ab (9–12 s) · Großaufnahme: Er mustert dich zu lange (12–14 s).

Dialog **Brann**:
1. „Na sieh mal an. Ein Fremder, der nicht ertrunken ist. Das ist selten geworden.“
2. „Ole hat dich angeknurrt? Das macht er mit allen.“
3. „Ich bin Brann. Wir bauen hier, was das Meer uns übrig lässt: Werkzeug, Seile, Zahnräder.“
4. „Du hast Hände für Maschinen. Merkwürdig für jemanden, der angespült wurde.“
5. „Sieh dich weiter um. Wenn du alle Inseln hier draußen kennst, komm zurück. Ich hätte da etwas für dich.“

**Cutscene `cs_npc_aurel` „Der Goldberg“** (Auslöser: Schiff erreicht Aurels Insel)
Die Wolken reißen auf, der erste Sonnenstrahl des Spiels (0–4 s) · Terrassengärten, weiße Häuser, goldene Banner im Wind (4–9 s) · Aurel mit offenen Armen auf einer Treppe; auf seiner Fahne das Wappen vom Wrack (9–13 s) · Großaufnahme: Sein Lächeln stockt einen Moment (13–15 s).

Dialog **Aurel**:
1. „Willkommen auf dem Goldberg, Reisender! Die Sonne scheint, und Ihr bringt Gesellschaft. Ein guter Tag.“
2. „Ihr seid… neu hier, nicht wahr? Verzeiht. Ihr erinnert mich an jemanden.“
3. „Hier oben leidet niemand Not. Was Ihr braucht, sollt Ihr bekommen. Freunde beschenken einander.“
4. „Die anderen Inseln? Gute Leute, aber verbittert. Hört nicht zu sehr auf ihre alten Geschichten.“
5. „Kommt wieder, wann immer Ihr wollt.“

**Cutscene `cs_bauplan` „Der Bauplan“** (Auslöser: Gespräch mit Brann, nachdem alle drei entdeckt sind)
Abends in Branns Werkstatt, warmes Lampenlicht (0–3 s) · Brann entrollt einen großen, vergilbten Bauplan (3–7 s) · Kamera fährt über die Zeichnung eines Leuchtturms (7–11 s) · in der Ecke ein verblasstes Siegel, dasselbe wie auf dem Zettel aus dem Prolog (11–14 s).

Dialog **Brann**:
1. „Du hast sie alle gesehen. Gut. Dann ist es Zeit.“
2. „Das ist der Plan für einen Leuchtturm. So einen gab es früher schon einmal.“
3. „Ein Licht, das man von jeder Insel aus sieht. Damit nie wieder jemand im Dunkeln bleibt.“
4. „Bau ihn. Mal sehen, was du daraus machst.“

→ Leuchtturm wird freigeschaltet. **Akt 2 beginnt.**

### Akt 2 – Das Licht

- **Gameplay:** Leuchtturm Stufe 1 bauen und auf Stufe 2 verbessern. Handel mit allen drei Völkern. Aurel schenkt großzügig und rät vom Turm ab.
- **Dialog beim Handel mit Aurel (einmalig in Akt 2):** „Ein Leuchtturm? Wozu? Das Meer ist ruhig, und Schiffe finden ihren Weg auch so.“
- **Ende:** Leuchtturm erreicht Stufe 2 → `cs_licht_im_wind` → Akt 3.

**Cutscene `cs_licht_im_wind` „Ein Licht im Wind“**
Dämmerung, der halbfertige Turm, das Gerüst knarrt (0–4 s) · Kamera fährt am Turm hinauf zur noch leeren Lampenkammer; oben eine kleine Figur im grünen Mantel (4–8 s) · Branns Boot legt an, er trägt eine zusammengerollte Zeichnung (8–12 s) · Nahaufnahme: der Bauplan einer Taucherglocke (12–15 s).

Dialog **Brann**:
1. „Der Turm wächst. Gut.“
2. „Hier, noch ein Plan: eine Taucherglocke. Damit kommst du an Stellen, an die sonst nur Fische kommen.“
3. „Die Teile bekommst du von mir und von Ole. Auch wenn er knurrt.“

→ Bauplan Taucherglocke. **Akt 3 beginnt.**

### Akt 3 – Unter dem Meer

- **Gameplay:** Taucherglocke aus Teilen von Ole und Brann bauen (einmalig, an einem Schiff befestigt). Tauchspots anfahren (immer nur einer auf der Karte, erkennbar an Blasen). Unten kurze Aufgaben unter Zeitdruck (Sauerstoff). Nach einigen Tauchgängen wird die **Karte der alten Welt** gefunden.
- **Dialog beim Kauf der Teile bei Ole (einmalig):** **Ole:** „Lass die Toten schlafen.“
- **Erster Tauchgang:** `cs_abstieg`, danach **Brann:** „Die Glocke hält. Achte auf Blasen im Wasser. Wo es blubbert, liegt etwas da unten.“
- **Ende:** Karte zu Brann bringen → `cs_alte_karte` → Akt 4.

**Cutscene `cs_abstieg` „Abstieg“** (erster Tauchgang)
Die Glocke sinkt, die Oberfläche wird kleiner, schräge Lichtstrahlen (0–4 s) · Spiegelung des Spielers im Bullauge, verzerrt (4–6 s) · ein Fischschwarm weicht aus (6–8 s) · ein versunkenes Dach, ein Glockenturm, eine Straße (8–12 s) · die Lampe der Glocke streift einen Wegweiser „Zu den Bergdörfern“ (12–15 s).

**Cutscene `cs_alte_karte` „Die alte Karte“**
Die Karte wird auf dem Werktisch entrollt (0–3 s) · Branns Finger fährt über Täler, Felder, Dörfer (3–6 s) · gezeichnetes Wasser steigt in Sepia über die Karte, nur die Bergspitzen bleiben (6–11 s) · Schnitt zum Fenster: Die Inseln draußen haben genau diese Form (11–14 s).

Dialog **Brann**:
1. „Diese Karte… das ist unser Land. Wie es früher war.“
2. „Siehst du die Spitzen hier? Das sind wir. Jede Insel war einmal ein Berg.“
3. „Dann kam die große Flut. In einer Nacht war alles unter Wasser: die Dörfer, die Felder, die Menschen.“
4. „Nur wer oben auf den Bergen war, hat überlebt.“

→ Leuchtturm Stufe 3 freigeschaltet. **Akt 4 beginnt.**

### Akt 4 – Die Flut

- **Gameplay:** Leuchtturm Stufe 3 bauen. Danach erscheint ein besonderer Tauchspot: das **zerstörte Pumpwerk**. Aurels Geschenke werden größer; er fragt beiläufig, was der Spieler da unten sucht.
- **Dialog bei Aurel (einmalig nach Stufe 3):** „Ihr taucht in letzter Zeit viel, hört man. Was hofft Ihr dort unten zu finden?“
- **Ende des Akts:** Fund des Pumpwerks zu Brann bringen → `cs_flutnacht` → letzte Baustufe (Stufe 4) freigeschaltet.

Dialog **Brann** (vor der Cutscene): „Das ist das alte Pumpwerk. Es hat das Meer vom Land ferngehalten.“

**Cutscene `cs_flutnacht` „Die Flutnacht“** (Rückblende in Sepia)
Das Pumpwerk unter dem Druck des Meeres, Ventile bersten (0–4 s) · ein Thronsaal, der Herrscher nur von hinten (grüner Mantel, helle Strähne, Ring auf dem Kartentisch) gibt einen Befehl (4–8 s) · der Leuchtturm im Sturm bleibt dunkel (8–11 s) · eine Flutwelle rollt über die Dörfer, ihre Lichter erlöschen (11–16 s).

Dialog in der Rückblende:
- **Herrscher:** „Entzündet das Leuchtfeuer. Sofort. Jedes Dorf muss gewarnt werden.“
- **Eine Stimme:** „Wie Ihr befehlt, Herr.“

Dialog **Brann** (danach):
1. „Das Feuer kam nie. Man sagt, der Herrscher selbst hat es verweigert.“
2. „Seitdem hasst ihn jeder, der überlebt hat. Wo er auch sein mag.“

### Akt 5 – Das Leuchtfeuer

- **Gameplay:** Der Bau der letzten Stufe (Stufe 4, Fertigstellung) ist das Ziel. Aurel wird nervös, seine Geschenke werden teurer, er rät erneut ab: „Ein fertiger Turm bringt nur alte Geschichten zurück. Lasst es gut sein, Freund.“
- **Auslöser Finale:** Leuchtturm Stufe 4 fertig → `cs_wahrheit` → Entscheidung.

**Cutscene `cs_wahrheit` „Die Wahrheit“** (ca. 45 s, mehrere Bilder, Rückblenden in Sepia)
1. Ein Sturm zieht auf, der fertige Turm in der Nacht.
2. Rückblende: Aurel und seine Leute zerschlagen nachts die Ventile des Pumpwerks.
3. Aurel meldet dem Herrscher den Ausfall. Der Herrscher dreht sich um: Es ist der Spieler.
4. Der Herrscher befiehlt das Feuer, Aurel nickt.
5. Aurel und sein Gefolge steigen schweigend auf den Berg, der Turm bleibt dunkel.
6. Die Flut wie in `cs_flutnacht`.
7. Aurel spricht zu den Überlebenden und gibt dem Herrscher die Schuld.
8. Konfrontation auf dem Berg. Der Herrscher wird überwältigt, gefesselt, das Boot in den Sturm gestoßen. Derselbe Blitz wie in `cs_prolog`.
9. Gegenwart: Ein Boot mit Laterne legt an, Aurel betritt den Turm.
10. Die Fackel in der Hand des Spielers. Die Szene hält an → Entscheidung.

Dialog:
- **Aurel (Rückblende):** „Herr, das Pumpwerk ist ausgefallen. Wir können das Meer nicht mehr halten.“
- **Herrscher:** „Dann entzündet das Leuchtfeuer. Sofort. Jedes Dorf muss gewarnt werden.“
- **Aurel:** „Wie Ihr befehlt.“
- **Aurel zu seinen Leuten:** „Kein Wort. Wir gehen hinauf.“
- **Aurel zu den Überlebenden:** „Der Herrscher hat das Feuer verweigert. Er hat euch ertrinken lassen.“
- **Herrscher (Konfrontation):** „Das Feuer hat nie gebrannt. Warum?“
- **Aurel:** „Weil dieses Land nur einen Herrscher braucht. Und wenn du fort bist, glauben alle, du hast sie ertrinken lassen.“
- **Aurel (Gegenwart):** „Du erinnerst dich also. Dann weißt du auch, was du verlieren kannst. Lass das Feuer aus, und alles gehört wieder dir: das Land, die Fabriken, die Krone.“

**Entscheidung:** „Leuchtfeuer entzünden“ oder „Nicht entzünden“. Endgültig, mit Bestätigung.

## Enden

### Ende A – Entzündet

- Alle werden vor dem Sturm gewarnt und retten sich.
- Aurel bricht den Handel ab, flieht ins Exil und lässt seine Fabriken anzünden.
- Der neue Inselrat (Ole, Brann, Aurels Bürger) übergibt dem Spieler die verbrannte Insel als Dank: gute Rohstoffe, aber keine Gebäude. Der Spieler baut sie neu auf.
- Ole und Brann geben Rabatte und besseren Loot. Der Inselrat verkauft einen Teil von Aurels alten Waren weiter.
- Relikt-Belohnung: „Die erste Flamme“ (legendär).

**Cutscene `cs_ende_a` „Das Feuer antwortet“:** Die Fackel berührt die Lampe (0–3 s) · der Lichtstrahl schwenkt übers Meer (3–7 s) · Insel um Insel antworten Lichter, Menschen tragen ihr Hab und Gut die Hänge hinauf (7–12 s) · der Sturm trifft leere Ufer (12–15 s) · am Morgen: Rauch über dem Goldberg, Aurels Schiff verschwindet am Horizont (15–19 s).

Dialog:
- **Ole:** „Die Lampe… sie brennt.“
- **Brann:** „Diesmal hat jemand das Feuer entzündet.“
- **Aurel:** „Das war ein Fehler, Herrscher. Von mir bekommst du nichts mehr.“
- **Brann (am Morgen):** „Aurel ist fort. Seine Fabriken hat er angezündet, bevor er ablegte.“ · „Der Rat hat beschlossen: Der Goldberg gehört dir. Bau ihn wieder auf. Diesmal für alle.“

### Ende B – Dunkel

- Der Sturm reißt die Dörfer von Ole und Brann fort; auf ihren Inseln bleiben nur Ruinen. Kein Handel mehr mit Stufe 1 und 2.
- Der Spieler übernimmt Aurels fortschrittliche Inseln mit allen Gebäuden, als hätte er sie selbst gebaut, und ist wieder Herrscher.
- Aurel verlangt danach nichts (keinen Anteil der Produktion). Seine Insel wird eine Kolonie des Spielers, wie nach „Kontor gründen“.
- Relikt-Belohnung: „Die Krone des Herrschers“ (legendär).

**Cutscene `cs_ende_b` „Die Lichter gehen aus“:** Die Fackel sinkt, Aurel verneigt sich (0–4 s) · auf den Inseln von Ole und Brann erlöschen die Lichter nacheinander (4–10 s) · Morgen: Ruinen und leere Pfähle, wo Oles Steg war (10–13 s) · Aurel reicht die Krone (13–15 s).

Dialog: **Aurel:** „Eine weise Entscheidung. Willkommen zurück, Herrscher.“ Danach keine Stimme mehr, nur Wellen.

## Leitmotive

Drei Dinge kehren in allen Cutscenes wieder und halten die Geschichte zusammen:
- **Die Lampe** des Leuchtturms: dunkel oder brennend.
- **Das Wappen** von Aurel: Wrack (Prolog), Fahne (Akt 1), Werkzeug am Pumpwerk.
- **Die Wasserlinie**: Strand, Steg, versunkene Straßen, Flut.

## Stil der Cutscenes

- Seitenansicht (das Spiel selbst ist Draufsicht). Interne Auflösung 320×180, ganzzahlig hochskaliert, `image-rendering: pixelated`.
- Schwarze Balken oben und unten (16 px), die beim Wechsel ins Dialogfenster einfahren.
- Alle Grafiken prozedural Pixel für Pixel gezeichnet, im Stil der Spiel-Sprites (gleiche Pixelgröße, Kontur, Bayer-Dithering).
- Pro Szene eine eigene Farbpalette; Rückblenden in Sepia mit dunklem Rand.
- Großaufnahmen der Figuren als Porträt (64×80 Pixel, in der Großaufnahme 2× skaliert) mit Blinzeln und Mundbewegung.
- Eine Kamerabewegung pro Einstellung, harte Schnitte zwischen Einstellungen.
- Vorerst ohne Ton.
- Jede Cutscene ist überspringbar und pausiert die Simulation.
- Referenz für Stil und Technik: `docs/cutscenes/rauch-hinter-dem-nebel.html`.

## Offene Punkte

- Koop: Wer trifft im Koop-Spiel die Entscheidung am Leuchtturm? Vorschlag: der Host, die anderen sehen die Cutscene mit.
