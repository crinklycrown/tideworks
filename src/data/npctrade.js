/* =========================================================
   HANDEL MIT DEN VÖLKERN (seit Version 17): Ruf, Angebot, Preise, Aufträge, Lieferverträge, Dörfer, Geschenke
   Alle Zahlen zum Anpassen stehen hier. Logik: sim/npc.js, Fenster „Völker“ (Taste N): ui/npcs.js.
   Gehandelt wird mit Münzen am Steg der NPC-Insel: Ein Schiff liegt dort, Laden = kaufen, Entladen = verkaufen bzw. liefern.
   Routen dürfen einen NPC-Steg als Stopp haben (ohne Erlaubnis); nur über Routen zählen Lieferverträge.
   Freischaltungen und Pläne je Rufstufe stehen in data/unlocks.js (UNLOCKS, PLANS: npc + lvl), die Preise der Pläne hier.
   Getrennte Inseln haben (vorerst) keine Völker.
   ========================================================= */

// Ruf je Volk 0–max. Steigt mit Verkäufen an das Volk (sale = Münzen Umsatz je Rufpunkt), erledigten Aufträgen und
// erfüllten Lieferverträgen; sinkt nur bei verpassten Lieferverträgen.
export const REP = { max: 100, sale: 40 };
// Rufstufen (aufsteigend, min = ab diesem Ruf). buy/sell = Faktor auf den Ankaufpreis (das Volk zahlt dir) und den
// Verkaufspreis (du zahlst), orders = so viele Aufträge stellt das Volk gleichzeitig.
export const REP_LEVELS = [
  { id: 'misstrauisch', min: 0,  buy: 0.85, sell: 1.25, orders: 1 },
  { id: 'neutral',      min: 25, buy: 0.95, sell: 1.15, orders: 2 },
  { id: 'freundlich',   min: 50, buy: 1.0,  sell: 1.05, orders: 3 },
  { id: 'vertraut',     min: 80, buy: 1.1,  sell: 0.95, orders: 3 }
];
// Preisdruck je Volk und Ware: Je step verkaufte Stück sinkt der Ankaufpreis um per (höchstens max), je step gekaufte Stück
// steigt der Verkaufspreis um per; beides erholt sich um recover je Minute. chunk = Stück je Teilgeschäft (Preis dazwischen neu).
export const NPC_MARKET = { step: 10, per: 0.025, max: 0.6, recover: 0.03, chunk: 10 };
// Grundpreise (Münzen je Stück) der Waren, die es nur bei den Völkern gibt (die übrigen stehen in data/trade.js PRICES)
export const NPC_GOODS = { seil: 6, netz: 14, zahnrad: 12, feder: 9, rohrteil: 16, uhrwerk: 60, zelle: 45, perle: 80, koralle: 40, muschel: 25,
  glockenseil: 300, glockenhaube: 800 };   // Teile der Taucherglocke (0.19.0, data/dive.js)
// Preise der Pläne (data/unlocks.js PLANS), Münzen
export const PLAN_PRICE = { brann_schnellband: 600, brann_dampf: 900, brann_druck: 1500, aurel_akkus: 800, aurel_kessel: 800, aurel_geo: 1400, aurel_ingenieur: 2000 };

// Aufträge: Laufzeit bis zum Abend (Ende des Tages, 10 min Tag + 5 min Nacht, config.js CYCLE/DAY_LEN) des Tages days danach
// (0 = heute Abend, 1 = morgen Abend). Bleiben bis dahin weniger als minLeft Sekunden, gilt der nächste Abend.
// Neue Aufträge kommen jeden Morgen (und beim ersten Kontakt und beim Aufstieg in eine höhere Stufe). Läuft ein Auftrag ab, zahlt das Volk für die schon gelieferte
// Menge partial × Grundpreis. round = Mengen auf so viele Stück runden.
export const ORDERS = { minLeft: 180, partial: 0.8, round: 10 };
// Lieferverträge: höchstens max je Volk. Abgerechnet wird jeden Morgen für den Vortag: Menge erfüllt → bonus + rep,
// sonst −missRep Ruf; nach missMax verpassten Tagen in Folge kündigt das Volk. Der erste (angebrochene) Tag kostet keinen Ruf.
export const CONTRACTS = { max: 2, missRep: 3, missMax: 2 };
// Wachsende Dörfer: Stufen nach dem Wert aller Lieferungen an das Volk (Münzen). Jede Stufe baut weitere Gebäude.
// Seekarte (Ole): deckt den Nebel um die nächste noch unentdeckte Insel auf (r Felder um ihre Mitte, höchstens cells Zellen weit).
export const SEA_CHART = { r: 34, cells: 10 };

// Je Volk:
//   rep     Startruf (Ole misstrauisch, Brann neutral, Aurel freundlich)
//   buys    was das Volk ankauft: { it, f (Faktor auf den Grundpreis), lvl (ab Stufe, Standard misstrauisch) }
//   sells   was es verkauft: { it, f, n (Vorrat), refill (Stück je Minute), lvl, act (erst ab diesem Akt, vorher unsichtbar),
//           part (Teil der Taucherglocke: nach der Montage nicht mehr im Angebot) } | { soon: Name, lvl } (Platzhalter, nicht kaufbar)
//   chart   Seekarten: { price, n (Vorrat je Tag), lvl }
//   orders  Auftrags-Vorlagen: { it, n: [min, max], days, pay (Belohnung = Menge × Grundpreis × pay), rep, lvl }
//   deals   Lieferverträge: { id, it, n (je Tag), f (fester Stückpreis = Grundpreis × f), bonus (Münzen je erfülltem Tag), rep, lvl }
//   village Dorfstufen: { at (Wert der Lieferungen), add: [[Gebäudetyp, Anzahl, 'coast' = an der Küste]] }
//   gift    Geschenke (nur Aurel): jeden Morgen mit chance ab Stufe lvl, eins aus list ({ coins: [min, max] } | { it, n: [min, max] });
//           byAct (seit 0.21.0): je Akt andere Werte { chance, mul (Mengen × mul), rolls (so viele Geschenke je Morgen) }; Akt 4: größer und öfter
//           ins Inselinventar der Heimatinsel
//   sells.end  (seit 0.23.0) erst nach diesem Ende im Angebot ('a'), Rabatt nach Ende A: ENDINGS unten
//   act     Preise ab einem Akt: { Akt: { buy, sell } } (Faktoren, Aurel ab Akt 5 teurer)
export const NPC_TRADE = {
  ole: {
    rep: 10,
    buys: [{ it: 'holz', f: 1.3 }, { it: 'werkzeug', f: 1.2, lvl: 'neutral' }],
    // Relikte (seit 0.24.0) stehen nicht hier, sondern in data/relics.js RELIC_SOURCES.npc (ein Relikt je Tag im Angebot)
    sells: [{ it: 'fisch', f: 1, n: 200, refill: 20 }, { it: 'seil', n: 60, refill: 6, lvl: 'neutral' }, { it: 'netz', n: 30, refill: 3, lvl: 'freundlich' },
      // Taucherglocke (0.19.0): ab Akt 3 bei jeder Rufstufe, ein Stück (falls es verloren geht, kommt alle 10 min eins nach)
      { it: 'glockenseil', n: 1, refill: 0.1, act: 3, part: true },
      // Ende A (0.23.0): besseres Angebot (end: 'a' = erst nach Ende A, vorher unsichtbar)
      { it: 'raeucherfisch', f: 0.9, n: 120, refill: 10, end: 'a' }, { it: 'perle', f: 0.9, n: 6, refill: 0.3, end: 'a' }],
    chart: { price: 150, n: 2, lvl: 'neutral' },
    orders: [{ it: 'holz', n: [60, 150], days: 0, pay: 2, rep: 4 }, { it: 'holz', n: [200, 400], days: 1, pay: 2, rep: 7, lvl: 'neutral' },
      { it: 'werkzeug', n: [10, 30], days: 1, pay: 2.2, rep: 6, lvl: 'neutral' }, { it: 'fisch', n: [40, 100], days: 0, pay: 2.5, rep: 4, lvl: 'freundlich' }],
    deals: [{ id: 'ole_holz', it: 'holz', n: 150, f: 1.6, bonus: 80, rep: 3, lvl: 'neutral' }, { id: 'ole_werkzeug', it: 'werkzeug', n: 20, f: 1.5, bonus: 120, rep: 4, lvl: 'freundlich' }],
    village: [{ at: 500, add: [['npc_laterne', 2, 'coast'], ['npc_netz', 1, 'coast']] }, { at: 2000, add: [['npc_pfahlhaus', 2, 'coast'], ['npc_laterne', 2]] },
      { at: 6000, add: [['npc_pfahlhaus', 2, 'coast'], ['npc_raeucher', 1], ['npc_laterne', 3]] }, { at: 15000, add: [['npc_pfahlhaus', 3], ['npc_laterne', 4]] }]
  },
  brann: {
    rep: 30,
    buys: [{ it: 'eisen', f: 1.3 }, { it: 'kupfer', f: 1.3 }, { it: 'kohle', f: 1.2, lvl: 'neutral' }, { it: 'raeucherfisch', f: 1.2, lvl: 'neutral' }, { it: 'schrott', f: 1.2 }],
    sells: [{ it: 'zahnrad', n: 60, refill: 5 }, { it: 'feder', n: 60, refill: 5, lvl: 'neutral' }, { it: 'rohrteil', n: 40, refill: 3, lvl: 'freundlich' },
      { it: 'glockenhaube', n: 1, refill: 0.1, act: 3, part: true },
      // Ende A (0.23.0): besseres Angebot
      { it: 'stahl', f: 0.9, n: 100, refill: 8, end: 'a' }, { it: 'draht', f: 0.9, n: 150, refill: 12, end: 'a' }],
    orders: [{ it: 'eisen', n: [40, 100], days: 0, pay: 2, rep: 4 }, { it: 'kupfer', n: [40, 100], days: 1, pay: 2, rep: 5 },
      { it: 'kohle', n: [100, 250], days: 1, pay: 2, rep: 5, lvl: 'neutral' }, { it: 'stahl', n: [20, 50], days: 1, pay: 2, rep: 8, lvl: 'freundlich' }],
    deals: [{ id: 'brann_eisen', it: 'eisen', n: 80, f: 1.6, bonus: 150, rep: 3, lvl: 'neutral' }, { id: 'brann_kohle', it: 'kohle', n: 150, f: 1.5, bonus: 120, rep: 3, lvl: 'freundlich' }],
    village: [{ at: 800, add: [['npc_laterne', 2], ['npc_kran', 1, 'coast']] }, { at: 3000, add: [['npc_werkstatt', 1], ['npc_laterne', 2]] },
      { at: 8000, add: [['npc_lager', 2], ['npc_schlot', 1], ['npc_laterne', 3]] }, { at: 20000, add: [['npc_werkstatt', 1], ['npc_kran', 2, 'coast'], ['npc_laterne', 4]] }]
  },
  aurel: {
    rep: 60,
    buys: [{ it: 'werkzeug', f: 1.4 }, { it: 'perle', f: 1.3, lvl: 'neutral' }],
    sells: [{ it: 'glas', f: 1, n: 120, refill: 8 }, { it: 'uhrwerk', n: 20, refill: 1, lvl: 'neutral' }, { it: 'zelle', n: 30, refill: 2, lvl: 'freundlich' },
      { soon: 'Luxuswaren', lvl: 'neutral' }],
    orders: [{ it: 'werkzeug', n: [20, 60], days: 1, pay: 2.4, rep: 4 }, { it: 'ziegel', n: [60, 150], days: 1, pay: 2.2, rep: 4 }, { it: 'stahl', n: [30, 60], days: 1, pay: 2.2, rep: 6, lvl: 'vertraut' }],
    deals: [{ id: 'aurel_werkzeug', it: 'werkzeug', n: 30, f: 1.8, bonus: 200, rep: 2, lvl: 'freundlich' }],
    village: [{ at: 1000, add: [['npc_laterne', 3], ['npc_banner', 1]] }, { at: 4000, add: [['npc_villa', 1], ['npc_laterne', 3]] },
      { at: 10000, add: [['npc_villa', 2], ['npc_terrasse', 1], ['npc_laterne', 4]] }, { at: 25000, add: [['npc_villa', 2], ['npc_banner', 2], ['npc_laterne', 4]] }],
    gift: { lvl: 'freundlich', chance: 0.4, list: [{ coins: [80, 200] }, { it: 'glas', n: [10, 30] }, { it: 'uhrwerk', n: [1, 3] }, { it: 'werkzeug', n: [10, 20] }],
      byAct: { 4: { chance: 0.8, mul: 2.5, rolls: 2 } } },
    act: { 5: { buy: 0.9, sell: 1.3 } }
  },
  // Inselrat (seit 0.23.0, nur nach Ende A): übernimmt am Goldberg einen Teil von Aurels Angebot zu fairen Preisen.
  // Eigener Steg am Goldberg (sim/ending.js), Ruf startet freundlich, keine Geschenke, kein wachsendes Dorf.
  rat: {
    rep: 60,
    buys: [{ it: 'werkzeug', f: 1.3 }, { it: 'fisch', f: 1.2 }, { it: 'perle', f: 1.3 }],
    sells: [{ it: 'glas', f: 0.85, n: 120, refill: 8 }, { it: 'uhrwerk', f: 0.85, n: 20, refill: 1 }, { it: 'zelle', f: 0.85, n: 30, refill: 2 }],
    orders: [{ it: 'holz', n: [100, 250], days: 1, pay: 2, rep: 4 }, { it: 'ziegel', n: [60, 150], days: 1, pay: 2.2, rep: 4 }, { it: 'werkzeug', n: [20, 50], days: 1, pay: 2.4, rep: 5 }],
    deals: [],
    village: []
  }
};

/* ---------- Enden (seit 0.23.0, sim/ending.js) ----------
   Ende A „Das Feuer antwortet“: Aurel geht ins Exil (kein Handel mehr), der Goldberg brennt nieder und gehört dir (Hauptkontor
     am alten Steg), der Inselrat (NPC_TRADE.rat) handelt an einem neuen Steg am Goldberg.
     Ole und Brann: Ruf mindestens rep (vertraut), dauerhaft Ankauf × buy und Verkauf × sell, zusätzliches Angebot (sells mit end: 'a').
     Ihre Dörfer feiern einmal ein Fest: fest Sekunden Spielzeit nach der Entscheidung (Girlanden, Laternen, Feuerwerk bei Nacht).
     keep = Gebäudetypen am Goldberg, die als Brandruine stehen bleiben (alles andere verschwindet).
   Ende B „Die Lichter gehen aus“: Pfahldorf und Werkstattbucht werden Ruinen (kein Handel, keine Lichter, keine Figuren),
     Aurels Insel geht mit allen Gebäuden an dich (Hauptkontor am alten Steg), convert = Dorfgebäude, die zu echten
     Gebäuden des Spielers werden (Typ → Typ, gleiche Grundfläche); die übrigen bleiben als Schmuck stehen (abreißbar).
     drop = Gebäudetypen der Ruinen-Dörfer, die ganz verschwinden.
   relic = End-Relikt, das in die Reliktsammlung kommt (seit 0.24.0, data/relics.js; vorher als Ware im Lager der Heimatinsel). */
export const ENDINGS = {
  a: { rep: 90, buy: 1.15, sell: 0.8, fest: 900, keep: ['npc_villa'], relic: 'erste_flamme' },
  b: { convert: { npc_villa: 'buerger' }, drop: ['npc_laterne'], relic: 'krone' }
};
