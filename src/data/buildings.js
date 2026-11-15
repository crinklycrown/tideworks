// Kategorien des Baumenüs (Reihenfolge = Reihenfolge im Menü). icon = Schlüssel in SPR.icon (gfx/sprites.js).
// Kategorien ohne Gebäude werden im Menü ausgeblendet.
import { RECIPES_OF, recipePower } from './recipes.js';
import { DRILLS, HOUSES } from './mining.js';
import { PIPES, PUMPS } from './fluids.js';
import { DRONES } from './drones.js';
import { PEDESTAL_COST } from './relics.js';

export const BUILD_CATS = [
  { id: 'logistik',     name: 'Logistik',      icon: 'catLogistik' },
  { id: 'abbau',        name: 'Abbau',         icon: 'catAbbau' },
  { id: 'verarbeitung', name: 'Verarbeitung',  icon: 'catVerarbeitung' },
  { id: 'energie',      name: 'Energie',       icon: 'bolt' },
  { id: 'fluessig',     name: 'Flüssigkeiten', icon: 'catFluessig' },
  { id: 'wohnen',       name: 'Wohnen',        icon: 'house' },
  { id: 'schifffahrt',  name: 'Schifffahrt',   icon: 'catSchiff' }
];
// Gebäude. steg = mit Steg zum Meer (Hauptkontor, Handelskontor), pl = Mehrzahl (Beschriftungen von Rückgängig/Wiederholen), cat = Kategorie (BUILD_CATS), cost = Baukosten aus dem Inselinventar (Hauptkontor), tech = nötige Forschung (data/tech.js; andere Freischalt-Quellen wie Volk oder Story in data/unlocks.js), stufe = Ausbaustufe.
// desc darf Platzhalter für Werte enthalten, die Upgrades ändern: {cap:kontor}, {store:batterie}, {house}, {rate:<Gebäude>:<Grundwert>}, feste Werte {bb:range}, {ex:building} (siehe sim/mods.js descOf).
// Rezepte stehen in data/recipes.js (b = Gebäudetyp), Bohrer und Häuser in data/mining.js.
// Neue Gebäude: Eintrag in BD + BUILD_ORDER, Sprite in gfx/sprites, Verhalten über Rezepte oder sim/production.js (PRODUCTION_TICKS).
export const BD = {
  band:           { name: 'Fließband', pl: 'Fließbänder',          cat: 'logistik',     stufe: 1, w: 1, h: 1, cost: { holz: 1 }, rot: true, speed: 1,
                    desc: 'Transportiert 1 Item pro Sekunde in Pfeilrichtung. Ziehen verlegt ganze Strecken.' },
  band2:          { name: 'Schnellband', pl: 'Schnellbänder',        cat: 'logistik',     stufe: 3, w: 1, h: 1, cost: { stahl: 1 }, rot: true, speed: 2, tech: 'schnellband',
                    desc: 'Aus Stahl, doppelt so schnell: 2 Items pro Sekunde. Auf ein normales Band gezogen ersetzt es dieses.' },
  band3:          { name: 'Hochleistungsband', pl: 'Hochleistungsbänder',  cat: 'logistik',     stufe: 5, w: 1, h: 1, cost: { stahl: 1, kunststoff: 1 }, rot: true, speed: 4, tech: 'hochband',
                    desc: 'Stahl mit Kunststoffgurt: 4 Items pro Sekunde. Splitter, Überlauf-Tor, Kreuzung und Tor dahinter laufen genauso schnell.' },
  splitter:       { name: 'Splitter', pl: 'Splitter',           cat: 'logistik',     stufe: 2, w: 1, h: 1, cost: { holz: 2 }, tech: 'bandtechnik',
                    desc: 'Ein- und Ausgänge an allen vier Seiten. Jedes Item wird reihum auf alle Seiten verteilt, aus denen gerade kein Band hineinläuft. So schnell wie das Band, von dem das Item kommt.' },
  ueberlauf:      { name: 'Überlauf-Tor', pl: 'Überlauf-Tore',       cat: 'logistik',     stufe: 1, w: 1, h: 1, cost: { holz: 3 },
                    desc: 'Lässt Items geradeaus durch. Erst wenn der Ausgang gegenüber verstopft ist, gibt es sie nach links und rechts ab. So schnell wie das Band, von dem das Item kommt.' },
  kreuzung:       { name: 'Kreuzung', pl: 'Kreuzungen',          cat: 'logistik',     stufe: 2, w: 1, h: 1, cost: { holz: 3 }, tech: 'bandtechnik',
                    desc: 'Kreuzung für zwei Bänder: Was auf einer Seite hineinläuft, kommt auf der gegenüberliegenden Seite heraus. Beide Richtungen gleichzeitig, so schnell wie das zuführende Band. Beim Ziehen quer über ein gerades Band entsteht sie von selbst.' },
  bandbruecke:    { name: 'Brückenband', pl: 'Brückenbänder',      cat: 'logistik',     stufe: 1, w: 1, h: 1, cost: { holz: 6 },
                    desc: 'Zwei Enden auf einer Linie mit bis zu {bb:range} Feldern dazwischen, darunter darf alles liegen. Ein neues Ende verbindet sich mit dem nächsten freien Ende in Reichweite. Das erste Ende nimmt Items von Bändern an (so schnell wie das schnellste zuführende Band, höchstens {bb:max} Items/s, Puffer {bb:buf}), das zweite gibt sie in Laufrichtung weiter.' },
  sortierer:      { name: 'Sortierer', pl: 'Sortierer',           cat: 'logistik',     stufe: 1, w: 1, h: 1, cost: { holz: 2, eisen: 1 }, rot: true,
                    desc: 'Nimmt Items von hinten an. Die gewählte Ware läuft geradeaus weiter, alle anderen abwechselnd nach links und rechts (ist eine Seite blockiert, die andere). „Umkehren“ tauscht das: gewählte Ware zur Seite, der Rest geradeaus. So schnell wie das zuführende Band.' },
  tor:            { name: 'Tor', pl: 'Tore',                       cat: 'logistik',     stufe: 1, w: 1, h: 1, cost: { holz: 3, eisen: 1 }, rot: true,
                    desc: 'Bandstück mit Schranke: offen läuft es wie ein gerades Band (so schnell wie das zuführende Band), geschlossen staut es. Umschalten im Info-Panel, mit G oder Umschalt+Klick. Optional automatisch nach dem Bestand im Inselinventar.' },
  extraktor:      { name: 'Extraktor', pl: 'Extraktoren',          cat: 'logistik',     stufe: 2, w: 1, h: 1, cost: { holz: 4 }, tech: 'bandtechnik',
                    desc: 'Holt Waren aus allen angrenzenden Gebäuden: aus Speichern (Hauptkontor, Lagerkiste, Handelskontor) und aus der Ausgabe von Produktionsgebäuden. Gibt sie in alle Richtungen weiter: auf Bänder daneben, die nicht in ihn hineinzeigen (auch parallel vorbeilaufende), und in Gebäude daneben, die die Ware annehmen, nie zurück in das Gebäude, aus dem sie kam. Gleicht zwei Gebäude mit derselben Ware aus (z. B. zwei Öfen oder zwei Kisten): aus dem volleren ins leerere, ab 2 Items Unterschied. Ohne Filter reihum alles, mit Filter (Klick) nur eine Ware. So schnell wie das schnellste Band daneben, sonst {ex:building} Items/s.' },
  kiste:          { name: 'Lagerkiste', pl: 'Lagerkisten',         cat: 'logistik',     stufe: 1, w: 2, h: 2, cost: { holz: 25 },
                    desc: 'Eigener Speicher für {cap:kiste} Items je Ware, beliebig viele Waren. Gehört nicht zum Inselinventar: Bänder liefern hinein, nur Extraktoren holen heraus. Beim Abriss kommt der Inhalt ins Hauptkontor.' },
  saege:          { name: 'Sägewerk', pl: 'Sägewerke',           cat: 'abbau',        stufe: 1, w: 2, h: 2, cost: { holz: 25 },
                    desc: 'Erntet die Bäume im Ring um das Gebäude (12 Felder): 0,1 Holz/s je reifem Baum. Pflanzt auf freier Wiese neue Bäume. Nicht auf Steinboden.' },
  fischer:        { name: 'Fischerhütte', pl: 'Fischerhütten',       cat: 'abbau',        stufe: 1, w: 2, h: 2, cost: { holz: 30 },
                    desc: 'Fängt Fisch. Je mehr Wasser im Umkreis von 2 Feldern, desto mehr (max. {rate:fischer:0.3}/s).' },
  bohrer:         { name: 'Bohrer Mk1', pl: 'Bohrer Mk1',         cat: 'abbau',        stufe: 1, w: 2, h: 2, cost: { holz: 50 },
                    desc: 'Auf ein Vorkommen setzen: {rate:bohrer:0.08}/s je Feld (max. {rate:bohrer:0.32}/s), ohne Strom. Gefördert wird das Vorkommen mit den meisten Feldern, bei Gleichstand das seltenere. Quarzsand nur, wenn sonst nichts darunter liegt.' },
  bohrer2:        { name: 'Bohrer Mk2', pl: 'Bohrer Mk2',         cat: 'abbau',        stufe: 4, w: 2, h: 2, cost: { stahl: 20, silizium: 5 }, tech: 'tiefbohrung',
                    desc: 'Moderner Stahlbohrer: {rate:bohrer2:0.2}/s je Feld (max. {rate:bohrer2:0.8}/s). Braucht 4 Strom/s, ohne Strom Stillstand. Gleiche Mehrheitsregel wie der Bohrer Mk1. Nimmt Schmiermittel vom Band (Puffer 5): 1 je 60 s, dann +50 %.' },
  schmelzofen:    { name: 'Schmelzofen', pl: 'Schmelzöfen',        cat: 'verarbeitung', stufe: 2, w: 2, h: 2, cost: { holz: 40, kalk: 20 }, tech: 'ofenbau',
                    desc: 'Schmilzt mit Kohle: Eisenbarren, Kupferbarren, Ziegel oder Glas. Rezept im Info-Panel umschaltbar. Ohne Strom.' },
  drahtzieherei:  { name: 'Drahtzieherei', pl: 'Drahtziehereien',      cat: 'verarbeitung', stufe: 2, w: 2, h: 2, cost: { holz: 30, eisen: 10 }, tech: 'kupfer',
                    desc: '1 Kupferbarren → 2 Kupferdraht in 3 Sekunden. Mit Strom (1/s) doppelt so schnell.' },
  werkzeug:       { name: 'Werkzeugmacher', pl: 'Werkzeugmacher',     cat: 'verarbeitung', stufe: 2, w: 2, h: 2, cost: { holz: 40, eisen: 10 }, tech: 'handwerk',
                    desc: '1 Eisenbarren + 1 Holz → 1 Werkzeug in 5 Sekunden, nach der Forschung „Fässer“ auch 2 Eisenbarren → 1 Leeres Fass in 4 Sekunden (Rezept im Info-Panel). Mit Strom (2/s) doppelt so schnell.' },
  raeucherei:     { name: 'Räucherei', pl: 'Räuchereien',        cat: 'verarbeitung', stufe: 2, w: 2, h: 2, cost: { holz: 40, ziegel: 10, seil: 5 },
                    desc: '2 Fisch + 1 Holz → 1 Räucherfisch in 6 Sekunden. Ohne Strom. Räucherfisch kaufen der Hafenhändler und Brann. Die Räucherei zeigt dir Ole, wenn er dir vertraut (freundlich).' },
  induktionsofen: { name: 'Induktionsofen', pl: 'Induktionsöfen',     cat: 'verarbeitung', stufe: 3, w: 2, h: 2, cost: { ziegel: 40, draht: 20 }, tech: 'stahl',
                    desc: '2 Eisenbarren + 1 Kohle → 1 Stahlbarren in 4 Sekunden. Braucht 4 Strom/s.' },
  graphitpresse:  { name: 'Graphit-Presse', pl: 'Graphit-Pressen',     cat: 'verarbeitung', stufe: 3, w: 2, h: 2, cost: { stahl: 20, eisen: 20 }, tech: 'graphit',
                    desc: '3 Kohle → 1 Graphit in 4 Sekunden. Braucht 3 Strom/s.' },
  siliziumofen:   { name: 'Silizium-Ofen', pl: 'Silizium-Öfen',      cat: 'verarbeitung', stufe: 4, w: 2, h: 2, cost: { ziegel: 40, stahl: 20, graphit: 10 }, tech: 'halbleiter',
                    desc: '2 Quarzsand + 1 Graphit → 1 Silizium in 6 Sekunden. Braucht 6 Strom/s.' },
  assembler:      { name: 'Assembler', pl: 'Assembler',          cat: 'verarbeitung', stufe: 4, w: 3, h: 3, cost: { stahl: 30, draht: 30, graphit: 10, bauplan: 2 }, tech: 'montage',
                    desc: '1 Silizium + 2 Kupferdraht → 1 Mikrochip in 8 Sekunden. Braucht 4 Strom/s.' },
  pyrolyseofen:   { name: 'Pyrolyse-Ofen', pl: 'Pyrolyse-Öfen',      cat: 'verarbeitung', stufe: 5, w: 2, h: 2, cost: { ziegel: 30, stahl: 20 }, tech: 'pyrolyse',
                    desc: '4 Kohle oder 8 Holz → 1 Teer in 6 Sekunden. Braucht 3 Strom/s.' },
  verbrennung:    { name: 'Verbrennungsanlage', pl: 'Verbrennungsanlagen', cat: 'energie',      stufe: 2, w: 2, h: 2, cost: { ziegel: 20, eisen: 10 }, tech: 'strom',
                    desc: 'Verbrennt alles, was per Band hineinläuft, nach Brennwert zu Strom (Brennwert 1 = 1 Strom, eigener Speicher {store:verbrennung}). Per Strommast mit Verbrauchern verbinden. Das Dampfkraftwerk erzeugt aus demselben Brennstoff fünfmal so viel Strom.' },
  kraftwerk:      { name: 'Dampfkraftwerk', pl: 'Dampfkraftwerke',     cat: 'energie',      stufe: 3, w: 2, h: 2, cost: { ziegel: 40, eisen: 20 }, tech: 'dampf',
                    desc: 'Verbrennt Kohle, Holz oder Teer vom Band (Puffer 10) und verdampft 5 Wasser/s aus dem Rohrnetz: {power:kraftwerk:12} Strom/s (eigener Speicher {store:kraftwerk}). Ohne Wasser oder Brennstoff Stillstand.' },
  geothermie:     { name: 'Geothermie-Generator', pl: 'Geothermie-Generatoren', cat: 'energie',    stufe: 5, w: 2, h: 2, cost: { stahl: 40, graphit: 20, chip: 10 }, tech: 'geothermie',
                    desc: 'Metallkuppel über Lava: {power:geothermie:30} Strom/s ohne Verbrauch (eigener Speicher {store:geothermie}). Muss mindestens 2 Lavafelder überdecken – das einzige Gebäude, das auf Lava stehen darf.' },
  rohr:           { name: 'Rohr Mk1', pl: 'Rohre Mk1',           cat: 'fluessig',     stufe: 3, w: 1, h: 1, cost: { kupfer: 1 }, tech: 'dampf',
                    desc: 'Kupferrohr, 20 Einheiten/s. Verbindet sich selbst mit Nachbarrohren und Gebäuden, die Flüssigkeiten nutzen. Darf unter Bändern liegen, nicht unter Gebäuden. Ziehen verlegt ganze Strecken.' },
  rohr2:          { name: 'Rohr Mk2', pl: 'Rohre Mk2',           cat: 'fluessig',     stufe: 4, w: 1, h: 1, cost: { stahl: 1 }, tech: 'druckleitung',
                    desc: 'Stahlrohr, 50 Einheiten/s. Ein Netz läuft so schnell wie sein langsamstes Rohr. Auf ein anderes Rohr gezogen ersetzt es dieses.' },
  rohr3:          { name: 'Rohr Mk3', pl: 'Rohre Mk3',           cat: 'fluessig',     stufe: 5, w: 1, h: 1, cost: { kunststoff: 1, glas: 1 }, tech: 'chemie',
                    desc: 'Kunststoffrohr, 100 Einheiten/s und säurefest: Schwefelsäure fließt nur durch Netze, die ganz aus Rohr Mk3 bestehen.' },
  pumpe:          { name: 'Wasserpumpe', pl: 'Wasserpumpen',        cat: 'fluessig',     stufe: 3, w: 1, h: 1, cost: { holz: 20, eisen: 10 }, tech: 'dampf',
                    desc: 'Pumpt 10 Wasser/s ins angeschlossene Rohrnetz. Auf Land direkt am Meer bauen (mindestens ein Meeresfeld daneben). Ohne Strom.' },
  saugpumpe:      { name: 'Saugpumpe', pl: 'Saugpumpen',          cat: 'fluessig',     stufe: 4, w: 2, h: 2, cost: { kupfer: 20, silizium: 10 }, tech: 'erdoel',
                    desc: 'Pferdekopfpumpe: 1,25 Rohöl/s je Ölfeld darunter (max. 5/s), Öl-Vorkommen sind unerschöpflich. Nur auf Ölfeldern. Braucht 2 Strom/s.' },
  abfueller:      { name: 'Abfüllanlage', pl: 'Abfüllanlagen', cat: 'fluessig', stufe: 4, w: 2, h: 2, cost: { stahl: 20, kupfer: 10 }, tech: 'faesser',
                    desc: 'Füllt je 50 Einheiten Wasser, Rohöl oder Schwefelsäure aus dem Rohrnetz in ein leeres Fass (2 s). Leere Fässer kommen vom Band, volle gehen aufs Band. Rezept im Info-Panel umschaltbar. Braucht 1 Strom/s.' },
  entleerer:      { name: 'Entleerer', pl: 'Entleerer', cat: 'fluessig', stufe: 4, w: 2, h: 2, cost: { stahl: 20, kupfer: 10 }, tech: 'faesser',
                    desc: 'Kippt volle Fässer vom Band ins Rohrnetz aus (50 Einheiten in 2 s) und gibt das leere Fass aufs Band. Säure nur in säurefeste Netze (Mk3). Braucht 1 Strom/s.' },
  tank:           { name: 'Tank', pl: 'Tanks',               cat: 'fluessig',     stufe: 3, w: 2, h: 2, cost: { eisen: 20, kupfer: 10 }, tech: 'dampf',
                    desc: 'Speichert 500 Einheiten im angeschlossenen Rohrnetz und verbindet angrenzende Rohre miteinander.' },
  reaktor:        { name: 'Chemischer Reaktor', pl: 'Chemische Reaktoren', cat: 'verarbeitung', stufe: 5, w: 3, h: 3, cost: { stahl: 40, glas: 20, chip: 10, bauplan: 3 }, tech: 'chemie',
                    desc: 'Verarbeitet Flüssigkeiten aus dem Rohrnetz: Schmiermittel, Kunststoff, Schwefelsäure und Neodym. Rezept im Info-Panel umschaltbar. Braucht 6 Strom/s.' },
  ingenieur:      { name: 'Ingenieurhaus', pl: 'Ingenieurhäuser',      cat: 'wohnen',       stufe: 5, w: 2, h: 2, cost: { stahl: 40, glas: 20, kunststoff: 10, chip: 5 }, tech: 'ingenieure',
                    desc: '6 Bewohner. Nimmt alle {house} s 3 Fisch, 1 Kunststoff und 1 Mikrochip aus dem Kontor und legt dafür 1 Schaltplan ins Kontor.' },
  multibohrer:    { name: 'Multi-Bohrer', pl: 'Multi-Bohrer',       cat: 'abbau',        stufe: 6, w: 3, h: 3, cost: { stahl: 50, chip: 10, magnet: 5, schaltplan: 3 }, tech: 'multibohrer',
                    desc: 'Großer Bohrturm: {rate:multibohrer:0.3}/s je Feld (max. {rate:multibohrer:2.7}/s), Mehrheitsregel wie beim Bohrer, auch auf Quarzsand, nicht auf Öl. Braucht 10 Strom/s, 5 Wasser/s zum Kühlen und 1 Schmiermittel je 30 s.' },
  mast:           { name: 'Strommast', pl: 'Strommasten',          cat: 'energie',      stufe: 2, w: 1, h: 1, cost: { holz: 2, draht: 2 }, tech: 'strom',
                    desc: 'Verbindet per Kabel bis zu 4 Gebäude oder andere Masten im Umkreis von 7 Feldern. Verbindet sich beim Bauen automatisch.' },
  batterie:       { name: 'Batterie', pl: 'Batterien',           cat: 'energie',      stufe: 2, w: 1, h: 1, cost: { eisen: 20, draht: 20 }, tech: 'strom',
                    desc: 'Speichert {store:batterie} Strom aus dem verbundenen Netz und gibt ihn bei Bedarf wieder ab.' },
  huette:         { name: 'Hütte', pl: 'Hütten',              cat: 'wohnen',       stufe: 1, w: 2, h: 2, cost: { holz: 20 },
                    desc: '2 Bewohner. Nimmt alle {house} s 2 Fisch + 1 Holz aus dem Kontor und legt dafür 1 Skizze ins Kontor.' },
  buerger:        { name: 'Bürgerhaus', pl: 'Bürgerhäuser',         cat: 'wohnen',       stufe: 2, w: 2, h: 2, cost: { ziegel: 30, eisen: 10, glas: 10 }, tech: 'handwerk',
                    desc: '4 Bewohner. Nimmt alle {house} s 2 Fisch, 1 Werkzeug und 1 Glas aus dem Kontor und legt dafür 1 Bauplan ins Kontor.' },
  // Reliktsockel (0.24.0, data/relics.js): genau einer je Insel mit Hauptkontor, darin ein Relikt; Aufwerten 1 → 2 → 3
  sockel1:        { name: 'Reliktsockel', pl: 'Reliktsockel',         cat: 'wohnen',       stufe: 3, w: 2, h: 2, cost: PEDESTAL_COST.sockel1, tech: 'reliktkunde',
                    desc: 'Steinsockel für ein gewöhnliches Relikt. Höchstens einer je Insel, nur auf Inseln mit Hauptkontor. Das Relikt wirkt auf die ganze Insel. Einsetzen und Herausnehmen im Info-Panel, die Sammlung zeigt das Fenster „Relikte“ (L).' },
  sockel2:        { name: 'Messingsockel', pl: 'Messingsockel',       cat: 'wohnen',       stufe: 4, w: 2, h: 2, cost: PEDESTAL_COST.sockel2,
                    desc: 'Messingsockel für ein seltenes oder gewöhnliches Relikt. Höchstens ein Sockel je Insel. Entsteht auch durch Aufwerten eines Reliktsockels; das Relikt bleibt darin.' },
  sockel3:        { name: 'Goldener Sockel', pl: 'Goldene Sockel',    cat: 'wohnen',       stufe: 5, w: 2, h: 2, cost: PEDESTAL_COST.sockel3,
                    desc: 'Leuchtender Goldsockel, hält jedes Relikt, auch ein legendäres. Höchstens ein Sockel je Insel. Legendäre Relikte verbrauchen Perlen aus dem Inselinventar.' },
  werft:          { name: 'Werft', pl: 'Werften',              cat: 'schifffahrt',  stufe: 2, w: 3, h: 3, cost: { holz: 150, eisen: 30 }, tech: 'schiffbau',
                    desc: 'Direkt am Meer bauen. Baut Frachtschiffe für Handelsrouten und (nach der Kartografie) schnelle Entdecker.' },
  handelskontor:  { name: 'Handelskontor', pl: 'Handelskontore',   cat: 'schifffahrt',  stufe: 2, w: 2, h: 2, cost: { holz: 60, eisen: 10 }, steg: true, tech: 'schiffbau',
                    desc: 'Lagerhaus mit Steg: 1–2 Felder von der Küste, der Steg führt zum Meer. Eigener Speicher für {cap:handelskontor} je Ware, nicht im Inselinventar. Bänder liefern hinein, Extraktoren holen heraus, Schiffe laden und entladen hier und fahren es als Routen-Stopp an. Nur auf Inseln mit Hauptkontor.' },
  handel:         { name: 'Handelsposten', pl: 'Handelsposten', cat: 'schifffahrt', stufe: 3, w: 3, h: 3, cost: { ziegel: 60, eisen: 30, glas: 20, bauplan: 5 }, tech: 'handel',
                    desc: 'Direkt am Meer (mindestens 2 Meeresfelder daneben), höchstens einer je Insel, nur auf Inseln mit Hauptkontor. Händler legen hier an und führen die Handelsaufträge der Insel mit dem Bestand des Hauptkontors aus (Info-Panel oder Fenster „Markt“, Taste K).' },
  leuchtturm:     { name: 'Weltenleuchtturm', pl: 'Weltenleuchttürme', cat: 'schifffahrt', stufe: 6, w: 5, h: 5, cost: { holz: 200, ziegel: 100, eisen: 50 }, unique: true,
                    desc: 'Einmalig in der Welt, nur auf der Heimatinsel, direkt am Meer. Der Bauplan kommt mit der Geschichte. Wird in 4 Stufen ausgebaut: Im Info-Panel die Baustelle eröffnen, dann bringen Bänder die Waren hin oder der Turm holt sie aus dem Inselinventar. Jede Stufe lässt ihn weiter übers Meer blicken. Die Geschichte gibt vor, wann die nächste Stufe möglich ist.' },
  drohnenhafen:   { name: 'Drohnenhafen', pl: 'Drohnenhäfen', cat: 'logistik', stufe: 6, w: 2, h: 2, cost: { stahl: 30, kunststoff: 20, chip: 10, magnet: 2, schaltplan: 2 }, tech: 'drohnen',
                    desc: '{dr:n} Drohnen fliegen Waren zwischen Drohnenkisten im Umkreis von {dr:r} Feldern ({dr:st} Stück je Flug, {dr:sp} Felder/s) und reparieren beschädigte Gebäude. Braucht {dr:p} Strom/s plus 1 je fliegender Drohne.' },
  dkiste:         { name: 'Drohnenkiste', pl: 'Drohnenkisten', cat: 'logistik', stufe: 6, w: 1, h: 1, cost: { stahl: 5, kunststoff: 2 }, tech: 'drohnen',
                    desc: 'Modus im Info-Panel. Anbieten: nimmt Waren von Bändern an (Puffer {dk:buf}), Drohnen holen sie ab. Anfordern: Ware und Zielmenge, Drohnen bringen sie, die Kiste gibt sie auf abgehende Bänder aus.' },
  kontor:         { name: 'Hauptkontor', pl: 'Hauptkontore',       cat: 'logistik',     stufe: 1, w: 3, h: 3, cost: null, fixed: true, steg: true,
                    desc: 'Das Inselinventar: fasst {cap:kontor} je Ware. Bänder liefern an drei Seiten hinein (voll = Stau), nur Extraktoren holen heraus. Bezahlt Bauen, Häuser, Forschung und Schiffbau. Schiffe legen am Ende des Stegs an.' },
  kontoralt:      { name: 'Hauptkontor (alt)', pl: 'Hauptkontore (alt)', cat: 'logistik', stufe: 1, w: 2, h: 2, cost: null, fixed: true,
                    desc: 'Altes Kontor aus einem früheren Spielstand: das Inselinventar ({cap:kontor} je Ware) mit dem alten Anleger. Über „Kontor verlegen“ wird es zum neuen Hauptkontor mit Steg.' },
  // NPC-Dörfer (Version 16, data/npcs.js): echte, feste Gebäude der Völker (by = 'npc:<id>'), ohne Takt und ohne Produktion.
  // Nicht baubar, nicht abreißbar, nicht in Blaupausen. Das Aussehen hängt beim Steg vom NPC ab (gfx/sprites/npc.js).
  npchafen:       { name: 'Steg', pl: 'Stege', npc: true, stufe: 1, w: 3, h: 3, cost: null, fixed: true, steg: true,
                    desc: 'Hier legen Schiffe an. Liegt ein Schiff am Steg, kannst du mit den Leuten der Insel sprechen und handeln (Laden = kaufen, Entladen = liefern und verkaufen). Routen dürfen hier halten.' },
  npc_pfahlhaus:  { name: 'Pfahlhaus', pl: 'Pfahlhäuser', npc: true, stufe: 1, w: 2, h: 2, cost: null, fixed: true, desc: 'Ein Fischerhaus auf Pfählen über den Klippen.' },
  npc_netz:       { name: 'Netzgestell', pl: 'Netzgestelle', npc: true, stufe: 1, w: 2, h: 1, cost: null, fixed: true, desc: 'Hier trocknen die Netze.' },
  npc_raeucher:   { name: 'Räucherhütte', pl: 'Räucherhütten', npc: true, stufe: 1, w: 1, h: 1, cost: null, fixed: true, desc: 'Es riecht nach Rauch und Fisch.' },
  npc_werkstatt:  { name: 'Werkstatt', pl: 'Werkstätten', npc: true, stufe: 1, w: 3, h: 2, cost: null, fixed: true, desc: 'Hämmern, Funken, Werkzeug an jeder Wand.' },
  npc_kran:       { name: 'Kran', pl: 'Kräne', npc: true, stufe: 1, w: 1, h: 1, cost: null, fixed: true, desc: 'Ein Ladekran an der Bucht.' },
  npc_schlot:     { name: 'Schornstein', pl: 'Schornsteine', npc: true, stufe: 1, w: 1, h: 1, cost: null, fixed: true, desc: 'Der Schornstein einer Esse.' },
  npc_lager:      { name: 'Materiallager', pl: 'Materiallager', npc: true, stufe: 1, w: 2, h: 2, cost: null, fixed: true, desc: 'Kisten, Rohre und Zahnräder, sauber gestapelt.' },
  npc_villa:      { name: 'Villa', pl: 'Villen', npc: true, stufe: 1, w: 2, h: 2, cost: null, fixed: true, desc: 'Weiße Mauern, goldenes Dach.' },
  npc_terrasse:   { name: 'Terrassengarten', pl: 'Terrassengärten', npc: true, stufe: 1, w: 3, h: 2, cost: null, fixed: true, desc: 'Gepflegte Beete, Stufe um Stufe.' },
  npc_banner:     { name: 'Banner', pl: 'Banner', npc: true, stufe: 1, w: 1, h: 1, cost: null, fixed: true, desc: 'Ein goldenes Banner mit einem Wappen.' },
  // Version 17: kommt mit dem Wachstum der Dörfer dazu (data/npctrade.js village), leuchtet nachts
  npc_laterne:    { name: 'Laterne', pl: 'Laternen', npc: true, stufe: 1, w: 1, h: 1, cost: null, fixed: true, desc: 'Je mehr du lieferst, desto mehr Lichter brennen hier nachts.' }
};
// Gebäude der NPC-Dörfer (fest, ohne Takt)
export const NPC_BLD = new Set(Object.keys(BD).filter(t => BD[t].npc));
// Reihenfolge innerhalb der Kategorien (Tasten 1–9 im Baumenü)
export const BUILD_ORDER = ['band', 'band2', 'band3', 'splitter', 'ueberlauf', 'kreuzung', 'bandbruecke', 'sortierer', 'tor', 'extraktor', 'kiste', 'drohnenhafen', 'dkiste', 'saege', 'fischer', 'bohrer', 'bohrer2', 'multibohrer',
  'schmelzofen', 'drahtzieherei', 'werkzeug', 'raeucherei', 'induktionsofen', 'graphitpresse', 'siliziumofen', 'assembler', 'pyrolyseofen', 'reaktor',
  'verbrennung', 'kraftwerk', 'geothermie', 'mast', 'batterie', 'rohr', 'rohr2', 'rohr3', 'pumpe', 'saugpumpe', 'tank', 'abfueller', 'entleerer',
  'huette', 'buerger', 'ingenieur', 'sockel1', 'sockel2', 'sockel3', 'werft', 'handelskontor', 'handel', 'leuchtturm'];
// Gebäude je Kategorie in Menü-Reihenfolge
export const catBuildings = (cat) => BUILD_ORDER.filter(t => BD[t].cat === cat);
export const FLAT = new Set(['band', 'band2', 'band3', 'splitter', 'ueberlauf', 'kreuzung', 'bandbruecke', 'sortierer', 'tor']);   // flache Logistik-Teile
export const CONVEY = new Set(['band', 'band2', 'band3']);                 // nehmen Gebäude-Ausgaben auf
// Speicher: Hauptkontor (= Inselinventar, alt oder neu), Lagerkiste und Handelskontor (eigener Bestand b.inv, siehe sim/kontor.js)
export const HQ = new Set(['kontor', 'kontoralt']);
export const STORE = new Set(['kontor', 'kontoralt', 'kiste', 'handelskontor']);
export const PORTS = new Set(['kontor', 'kontoralt', 'handelskontor', 'npchafen']);    // Schiffe legen an (Routen-Stopps; NPC-Steg seit Version 17)
export const STEG = new Set(Object.keys(BD).filter(t => BD[t].steg));     // mit Steg zum Meer (Platzierung sim/kontor.js)
// Platz je Ware ohne Upgrades (mit Upgrades: mods(g).cap, sim/mods.js)
export const STORE_CAP = { kontor: 1000, kiste: 300, handelskontor: 400 };
// Brückenband: range = Felder zwischen den Enden, rate = Items/s ohne zuführendes Band, max = höchstens so schnell wie das schnellste zuführende Band, bis max Items/s, buf = Puffer, glide = Tempo der Items auf der Schiene (Felder/s)
export const BELT_BRIDGE = { range: 3, rate: 1, max: 4, buf: 4, glide: 4 };
// Extraktor: Tempo direkt in ein Gebäude (vor einem Band: dessen Tempo)
export const EXTRACT = { building: 2 };   // Extraktor: Items/s ohne wegführendes Band (sim/logistics.js extractNear)
// Tor: Automatik prüft alle every Sekunden das Inselinventar
export const GATE = { every: 1, auto: { it: 'holz', hi: 200, lo: 100 } };   // every = Prüfintervall (s), auto = Vorgabe beim Einschalten der Automatik
export const PIPE = new Set(Object.keys(PIPES));                           // Rohre: liegen auf der Rohrebene (sim/fluids.js), nicht in g.blds
export const GENS = new Set(['verbrennung', 'kraftwerk', 'geothermie']);   // Stromerzeuger mit eigenem Speicher
export const DRILL = new Set(Object.keys(DRILLS));                          // Bohrer (Mehrheitsregel)
export const HOUSE = HOUSES;
// Aufwerten (Info-Panel, Werkzeug „Aufwerten“, Taste U): Gebäude → nächste Stufe gleicher Größe. Weitere Paare nur hier eintragen.
export const UPGRADE_TO = { band: 'band2', band2: 'band3', rohr: 'rohr2', rohr2: 'rohr3', bohrer: 'bohrer2', huette: 'buerger', buerger: 'ingenieur', sockel1: 'sockel2', sockel2: 'sockel3' };
// Mehrzahl eines Gebäudenamens (Beschriftungen wie „14 Fließbänder gebaut“)
export const plName = (t, n) => n === 1 ? BD[t].name : (BD[t].pl || BD[t].name);
// Gebäude, die Items auf Bänder ausgeben (Info-Panel warnt ohne Ausgabe-Band)
export const PRODUCERS = new Set(['saege', 'fischer', ...DRILL, ...Object.keys(RECIPES_OF).filter(t => RECIPES_OF[t].some(r => Object.keys(r.out).length))]);
// Höchster Stromverbrauch je Gebäudetyp (Strom/s); Gebäude mit Eintrag lassen sich verkabeln
export const POWER_USE = {};
for (const t in DRILLS) if (DRILLS[t].power) POWER_USE[t] = DRILLS[t].power;
for (const t in PUMPS) if (PUMPS[t].power) POWER_USE[t] = PUMPS[t].power;
POWER_USE.drohnenhafen = DRONES.power + DRONES.perFlying * (DRONES.per + 6);   // Grundlast + fliegende Drohnen (höchstens, mit Upgrade und Leuchtturm)
for (const t in RECIPES_OF) { const u = Math.max(...RECIPES_OF[t].map(r => recipePower(r).use)); if (u) POWER_USE[t] = u; }
