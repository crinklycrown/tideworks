// Forschung (Skilltree, ui/skilltree.js). Zwei Arten:
//   Forschung: schaltet Gebäude frei (Gebäude verweisen über tech: '<id>' darauf, data/buildings.js; Rezepte ebenso, data/recipes.js).
//   Upgrade:   schaltet nichts frei, hat aber eine dauerhafte Wirkung (effect, ausgewertet in sim/mods.js → mods(g)).
// Felder: id, name, stufe (Abstand von der Wurzel im Baum, Ruhm = stufe × FAME_TECH), cat (Ast im Skilltree, TECH_CATS),
//   req = vorher nötige Forschungen, res = Kosten aus Plänen und Waren (aus allen Inseln zusammen), desc = Kurzbeschreibung,
//   optional icon (Upgrades: 'b:<Gebäude>' | 'i:<Item>' | 'ship' | 'icon:<SPR.icon>', bekommt ein Upgrade-Abzeichen),
//   optional pos: [x, y] = feste Position im Baum (überschreibt das automatische Layout),
//   optional plan = zusätzliche Voraussetzung: Plan eines Volks (data/unlocks.js PLANS, gesetzt über unlock('plan:<id>')),
//   optional early = frühe Forschung für die Story; bei Getrennten Inseln (ohne Story) von Anfang an erforscht.
// Stufe-1-Gebäude brauchen keine Forschung, sie hängen an der Wurzel „Grundlagen“.
// Wirkungen (effect), alle additiv, Basiswerte in config.js / data/mining.js:
//   cap: { kontor|kiste|handelskontor: +n } Platz je Ware          store: { batterie: +n }    Stromspeicher
//   rate: { <Gebäude>|drill: +f } Leistung +f (0,2 = +20 %, drill = alle Bohrer)
//   power: { <Gebäude>: +f }    Stromerzeugung +f      holds: +n Laderäume        holdCap: +n je Laderaum
//   shipSpeed: +f               Schiffstempo           treeGrow: +f Baumwachstum  houseEvery: −s Prüfabstand der Häuser
//   tradePrice: +f Ankaufpreise der Händler   tradeFreq: +f Händler kommen öfter   drones: +n Drohnen je Drohnenhafen
// Weitere Wirkungen (reveal, prod, evWarn, powerAll) kommen vom Weltenleuchtturm (data/wonder.js).
// coins = zusätzliche Kosten in Münzen (state.coins)

// Äste des Skilltrees in Reihenfolge: die ersten vier wachsen nach oben, die übrigen nach unten. icon = Schlüssel in SPR.icon.
export const TECH_BRANCHES = [
  { id: 'logistik',     name: 'Logistik',      icon: 'catLogistik' },
  { id: 'abbau',        name: 'Abbau',         icon: 'catAbbau' },
  { id: 'verarbeitung', name: 'Verarbeitung',  icon: 'catVerarbeitung' },
  { id: 'energie',      name: 'Energie',       icon: 'bolt' },
  { id: 'fluessig',     name: 'Flüssigkeiten', icon: 'catFluessig' },
  { id: 'chemie',       name: 'Chemie',        icon: 'catChemie' },
  { id: 'wohnen',       name: 'Wohnen',        icon: 'house' },
  { id: 'schifffahrt',  name: 'Schifffahrt',   icon: 'catSchiff' }
];
export const TECH_CATS = Object.fromEntries(TECH_BRANCHES.map(b => [b.id, b.name]));

export const TECH = [
  // Frühe Forschungen (Version 15): sehr billig, vorher waren diese Gebäude frei
  { id: 'ofenbau',     name: 'Ofenbau',            stufe: 2, cat: 'verarbeitung', res: { skizze: 2, holz: 30 },               req: [],                      early: true, desc: 'Schmelzöfen schmelzen mit Kohle Eisenbarren, Kupferbarren, Ziegel und Glas.' },
  { id: 'bandtechnik', name: 'Bandtechnik',        stufe: 2, cat: 'logistik',     res: { skizze: 2, holz: 40 },               req: [],                      early: true, desc: 'Splitter verteilen Items, Kreuzungen lassen zwei Bänder kreuzen, Extraktoren holen Waren aus Speichern.' },
  { id: 'schiffbau',   name: 'Schiffbau',          stufe: 2, cat: 'schifffahrt',  res: { skizze: 4, eisen: 20 },              req: ['ofenbau'],             early: true, desc: 'Werften bauen Frachtschiffe, Handelskontore mit Steg lagern Waren am Hafen.' },
  // Forschungen (schalten Gebäude frei)
  { id: 'kupfer',      name: 'Kupferverarbeitung', stufe: 2, cat: 'verarbeitung', res: { skizze: 5, kupfer: 20 },              req: ['ofenbau'],                      desc: 'Drahtziehereien machen aus Kupferbarren Kupferdraht.' },
  { id: 'strom',       name: 'Elektrizität',       stufe: 2, cat: 'energie',      res: { skizze: 10, draht: 30 },               req: ['kupfer'],              desc: 'Verbrennungsanlagen erzeugen Strom, Masten und Batterien verteilen und speichern ihn.' },
  { id: 'handwerk',    name: 'Handwerk',           stufe: 2, cat: 'wohnen',       res: { skizze: 10, eisen: 30 },               req: ['ofenbau'],                      desc: 'Werkzeugmacher fertigen Werkzeug, Bürgerhäuser liefern Baupläne.' },
  { id: 'stahl',       name: 'Stahlerzeugung',     stufe: 3, cat: 'verarbeitung', res: { skizze: 20, ziegel: 40 },              req: ['strom'],               desc: 'Induktionsöfen veredeln Eisen mit Strom zu Stahl.' },
  { id: 'graphit',     name: 'Graphit',            stufe: 3, cat: 'verarbeitung', res: { skizze: 10, stahl: 20 },               req: ['stahl'],               desc: 'Graphit-Pressen verdichten Kohle zu Graphit.' },
  { id: 'schnellband', name: 'Schnellbänder',      stufe: 3, cat: 'logistik',     res: { skizze: 15, stahl: 30 },               req: ['stahl'],               plan: 'brann_schnellband', desc: 'Schnellbänder aus Stahl transportieren 2 Items pro Sekunde.' },
  { id: 'halbleiter',  name: 'Halbleiter',         stufe: 4, cat: 'verarbeitung', res: { bauplan: 10, stahl: 30, graphit: 20 }, req: ['graphit', 'handwerk'], desc: 'Silizium-Öfen gewinnen Silizium aus Quarzsand und Graphit.' },
  { id: 'montage',     name: 'Montage',            stufe: 4, cat: 'verarbeitung', res: { bauplan: 10, silizium: 20 },           req: ['halbleiter'],          desc: 'Assembler bauen Mikrochips aus Silizium und Kupferdraht.' },
  { id: 'tiefbohrung', name: 'Tiefbohrung',        stufe: 4, cat: 'abbau',        res: { bauplan: 8, stahl: 30 },               req: ['stahl', 'handwerk'],   desc: 'Bohrer Mk2 fördern mit Strom zweieinhalbmal so viel.' },
  { id: 'pyrolyse',    name: 'Pyrolyse',           stufe: 5, cat: 'chemie',       res: { bauplan: 15, chip: 20 },               req: ['montage'],             desc: 'Pyrolyse-Öfen schwelen Kohle oder Holz zu Teer.' },
  // Flüssigkeiten, Dampf, Chemie und Hochtechnik (Stufe 2–6)
  { id: 'dampf',       name: 'Dampfkraft',         stufe: 3, cat: 'energie',      res: { skizze: 10, stahl: 20, ziegel: 30 },   req: ['stahl'],               plan: 'brann_dampf', desc: 'Wasserpumpen, Rohre und Tanks; Dampfkraftwerke machen aus Brennstoff und Wasser viel Strom.' },
  { id: 'druckleitung', name: 'Druckleitungen',    stufe: 4, cat: 'fluessig',     res: { skizze: 10, stahl: 20 },               req: ['dampf'],      plan: 'brann_druck', desc: 'Stahlrohre für 50 Einheiten pro Sekunde.' },
  { id: 'erdoel',      name: 'Erdöl',              stufe: 4, cat: 'fluessig',     res: { bauplan: 8, kupfer: 20, silizium: 10 }, req: ['halbleiter', 'dampf'], desc: 'Saugpumpen fördern Rohöl aus den Ölfeldern der Sandinseln.' },
  { id: 'faesser',     name: 'Fässer',             stufe: 4, cat: 'fluessig',     res: { bauplan: 6, stahl: 20 },               req: ['erdoel'],              desc: 'Abfüllanlagen füllen Flüssigkeiten in Fässer, Entleerer geben sie wieder ins Rohrnetz. So reisen Wasser, Rohöl und Säure per Schiff.' },
  { id: 'chemie',      name: 'Chemie',             stufe: 5, cat: 'chemie',       res: { bauplan: 25, chip: 20, glas: 30 },     req: ['pyrolyse', 'erdoel'],  desc: 'Chemische Reaktoren und säurefeste Kunststoffrohre.' },
  { id: 'hochband',    name: 'Hochleistungsbänder', stufe: 5, cat: 'logistik',    res: { bauplan: 15, kunststoff: 20 },         req: ['chemie', 'schnellband'], desc: 'Hochleistungsbänder transportieren 4 Items pro Sekunde.' },
  { id: 'geothermie',  name: 'Geothermie',         stufe: 5, cat: 'energie',      res: { bauplan: 15, chip: 10, graphit: 20 },  req: ['montage'],             plan: 'aurel_geo', desc: 'Generatoren über der Lava der Vulkaninseln liefern Strom ohne Brennstoff.' },
  { id: 'ingenieure',  name: 'Ingenieurwesen',     stufe: 5, cat: 'wohnen',       res: { bauplan: 20, kunststoff: 20, chip: 10 }, req: ['chemie'],            plan: 'aurel_ingenieur', desc: 'Ingenieurhäuser liefern Schaltpläne.' },
  { id: 'magnete',     name: 'Supermagnete',       stufe: 6, cat: 'chemie',       res: { schaltplan: 10, stahl: 20 },           req: ['chemie'],              desc: 'Assembler formen Supermagnete aus Neodym und Stahl.' },
  { id: 'kartografie', name: 'Kartografie',       stufe: 2, cat: 'schifffahrt',  res: { skizze: 8, glas: 10 },                 req: ['schiffbau'],           desc: 'Seekarten und Fernrohre: Werften bauen schnelle Entdecker, die weit sehen und selbst erkunden.' },
  { id: 'handel',      name: 'Handel',             stufe: 3, cat: 'schifffahrt',  res: { skizze: 15, werkzeug: 30 },            req: [],                      desc: 'Handelsposten am Meer: Händler kaufen und verkaufen gegen Münzen.' },
  { id: 'drohnen',     name: 'Drohnen',            stufe: 6, cat: 'logistik',     res: { schaltplan: 15, kunststoff: 30 },      req: ['magnete'],             desc: 'Drohnenhäfen und Drohnenkisten: Waren fliegen ohne Band, beschädigte Gebäude werden repariert.' },
  { id: 'multibohrer', name: 'Multi-Bohrer',       stufe: 6, cat: 'abbau',        res: { schaltplan: 20, kunststoff: 20, schmiermittel: 20 }, req: ['magnete', 'tiefbohrung'], desc: 'Große, wassergekühlte Bohrtürme auf 3×3 Feldern.' },

  // Upgrades (dauerhafte Wirkung, kein neues Gebäude)
  { id: 'lager1',    name: 'Kontorspeicher I',    stufe: 2, cat: 'logistik',    res: { skizze: 10, holz: 100 },    req: [],                   icon: 'b:kontor',    effect: { cap: { kontor: 500 } },    desc: 'Höhere Regale: jedes Hauptkontor (Inselinventar) fasst mehr.' },
  { id: 'lager2',    name: 'Kontorspeicher II',   stufe: 3, cat: 'logistik',    res: { skizze: 20, stahl: 40 },    req: ['lager1', 'stahl'],  icon: 'b:kontor',    effect: { cap: { kontor: 1000 } },   desc: 'Stahlgerüste: noch mehr Platz in jedem Hauptkontor.' },
  { id: 'kiste1',    name: 'Verstärkte Kisten',   stufe: 2, cat: 'logistik',    res: { skizze: 8, holz: 40 },      req: [],                   icon: 'b:kiste',     effect: { cap: { kiste: 200 } },     desc: 'Eisenbänder und doppelte Böden: jede Lagerkiste fasst mehr.' },
  { id: 'kontor1',   name: 'Hafenspeicher',       stufe: 2, cat: 'schifffahrt', res: { skizze: 10, ziegel: 50 },   req: ['schiffbau'],        icon: 'b:handelskontor', effect: { cap: { handelskontor: 200 } }, desc: 'Speicher am Hafen: jedes Handelskontor fasst mehr.' },
  { id: 'laderaum1', name: 'Größere Laderäume',   stufe: 2, cat: 'schifffahrt', res: { skizze: 10, eisen: 40 },    req: ['schiffbau'],        icon: 'ship',        effect: { holdCap: 20 },             desc: 'Eisenbeschläge: in jeden Laderaum der Frachtschiffe passt mehr.' },
  { id: 'laderaum2', name: 'Vierter Laderaum',    stufe: 4, cat: 'schifffahrt', res: { bauplan: 10, stahl: 30 },   req: ['laderaum1'],        icon: 'ship',        effect: { holds: 1 },                desc: 'Ein zusätzliches Unterdeck für Frachtschiffe, auch für die, die schon fahren.' },
  { id: 'segel1',    name: 'Bessere Segel',       stufe: 3, cat: 'schifffahrt', res: { skizze: 15, werkzeug: 20 }, req: ['schiffbau'],        icon: 'icon:anchor', effect: { shipSpeed: 0.2 },          desc: 'Leichteres Tuch und neue Takelage für alle Schiffe.' },
  { id: 'saege1',    name: 'Forstwirtschaft',     stufe: 2, cat: 'abbau',       res: { skizze: 8, holz: 60 },      req: [],                   icon: 'b:saege',     effect: { treeGrow: 0.3 },           desc: 'Gezielte Pflege: Setzlinge wachsen schneller nach.' },
  { id: 'fischer1',  name: 'Schleppnetze',        stufe: 2, cat: 'abbau',       res: { skizze: 8, werkzeug: 20 },  req: ['handwerk'],         icon: 'b:fischer',   effect: { rate: { fischer: 0.3 } },  desc: 'Größere Netze für jede Fischerhütte.' },
  { id: 'bohrer1',   name: 'Gehärtete Bohrköpfe', stufe: 3, cat: 'abbau',       res: { skizze: 15, stahl: 20 },    req: ['stahl'],            icon: 'b:bohrer',    effect: { rate: { drill: 0.2 } },    desc: 'Stahlköpfe: alle Bohrer fördern mehr.' },
  { id: 'haus1',     name: 'Vorratskammern',      stufe: 3, cat: 'wohnen',      res: { skizze: 15, glas: 30 },     req: ['handwerk'],         icon: 'b:huette',    effect: { houseEvery: -10 },         desc: 'Bewohner holen ihre Waren öfter ab und liefern öfter Pläne.' },
  { id: 'batterie1', name: 'Bessere Akkus',       stufe: 4, cat: 'energie',     res: { bauplan: 8, graphit: 20 },  req: ['graphit', 'strom'], plan: 'aurel_akkus', icon: 'b:batterie',  effect: { store: { batterie: 250 } }, desc: 'Graphit-Elektroden: jede Batterie speichert mehr.' },
  { id: 'handel1',   name: 'Zunftbriefe',         stufe: 4, cat: 'schifffahrt', res: { bauplan: 10, glas: 40 },   req: ['handel'],           icon: 'icon:coin',   effect: { tradePrice: 0.15 },        desc: 'Verbriefte Rechte im Hafen: Händler zahlen mehr für deine Waren.' },
  { id: 'handel2',   name: 'Schnellsegler',       stufe: 5, cat: 'schifffahrt', res: { bauplan: 15, kunststoff: 20 }, req: ['handel1'],       icon: 'icon:coin',   effect: { tradeFreq: 0.3 },          desc: 'Händler mit schnellen Seglern kommen öfter vorbei.' },
  { id: 'drohnen1',  name: 'Größere Schwärme',    stufe: 6, cat: 'logistik',    res: { schaltplan: 15, magnet: 10 }, req: ['drohnen'],        icon: 'b:drohnenhafen', effect: { drones: 4 },           desc: 'Mehr Ladeplätze: jeder Drohnenhafen schickt mehr Drohnen los.' },
  { id: 'kraftwerk1', name: 'Kesseltechnik',      stufe: 4, cat: 'energie',     res: { bauplan: 10, stahl: 30 },   req: ['dampf'],            plan: 'aurel_kessel', icon: 'icon:bolt',   effect: { power: { kraftwerk: 0.25 } }, desc: 'Bessere Kessel: Dampfkraftwerke erzeugen mehr Strom.' }
];
export const TECH_BY_ID = Object.fromEntries(TECH.map(t => [t.id, t]));
export const isUpgrade = (T) => !!(T && T.effect);
// Forschungen, die erst mit einem späteren Schritt kommen. Verweist eine Forschung darauf (req), bleibt sie gesperrt,
// bis es die Forschung gibt; Skilltree und Tooltip zeigen den Namen und den Hinweis.
// Beispiel: dampf: { name: 'Dampfkraft', note: 'folgt mit der Flüssigkeits-Technik' } (seit Version 9 eine echte Forschung)
export const TECH_PLANNED = {};
export const techName = (id) => TECH_BY_ID[id] ? TECH_BY_ID[id].name : TECH_PLANNED[id] ? TECH_PLANNED[id].name : id;
// Stufen in aufsteigender Reihenfolge
export const TECH_STUFEN = [...new Set(TECH.map(t => t.stufe))].sort((a, b) => a - b);
