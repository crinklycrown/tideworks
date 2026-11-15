/* =========================================================
   HANDEL: Münzen, Preise, Händler (sim/trade.js, Fenster „Markt“ ui/market.js)
   Münzen (state.coins) sind kein Item: nicht im Lager, nicht verschiffbar.
   Händler segeln zu Inseln mit Handelsposten, legen an, führen die Handelsaufträge der Insel aus
   (Bestand des Hauptkontors) und fahren weiter.
   ========================================================= */

// Grundpreis je Ware (Münzen je Stück), grob nach Produktionstiefe. Pläne kann man nur kaufen (PLAN_ITEMS, data/items.js).
export const PRICES = {
  holz: 2, kohle: 3, eisenerz: 3, kupfererz: 3, kalk: 2, quarz: 2, schwefel: 12, neodymerz: 20,
  fisch: 3, raeucherfisch: 9,
  eisen: 8, kupfer: 8, ziegel: 6, glas: 10, draht: 6, werkzeug: 15, stahl: 25, graphit: 18, silizium: 30,
  chip: 120, teer: 20, kunststoff: 40, schmiermittel: 35, neodym: 90, magnet: 400,
  fass: 20, fass_wasser: 24, fass_rohoel: 60, fass_saeure: 70,
  schrott: 4,
  skizze: 40, bauplan: 150, schaltplan: 400
};

// Markt: buy = Faktor, zu dem Händler ankaufen (Spieler verkauft), sell = Faktor, zu dem sie verkaufen (Spieler kauft).
// Sättigung: je step verkaufte Stück sinkt der Ankaufpreis weltweit um per (höchstens max), erholt sich um recover je Minute.
// Kaufen hebt den Verkaufspreis genauso. chunk = Stückzahl je Teilgeschäft (Preis wird dazwischen neu berechnet),
// perVisit = höchstens so viele Stück je Ware und Besuch, hist = Abstand (s) und Zahl der Preisproben im Verlauf.
export const MARKET = { buy: 1, sell: 1.4, step: 10, per: 0.01, max: 0.6, recover: 0.02, chunk: 10, perVisit: 200, histEvery: 30, histLen: 40 };

// Handelsaufträge je Insel: höchstens so viele
export const MAX_TRADE_ORDERS = 12;

// Händler. every = Abstand der Besuche je Insel (s), first = erster Besuch nach dem Bau eines Handelspostens (s),
// dock = Liegezeit (s), speed = Felder/s, spawn = Abstand des Erscheinungspunkts vom Anleger (Felder).
// buys = was er ankauft, sells = was er verkauft (fest), offer = wechselndes Angebot je Besuch (Ware, Gewicht, Vorrat min–max),
// offerN = so viele Einträge je Besuch, needRing = erst, wenn ein Kontor auf einer Insel in diesem Ring (oder weiter draußen) steht.
const BASIC = ['holz', 'kohle', 'eisenerz', 'kupfererz', 'kalk', 'quarz', 'fisch', 'eisen', 'kupfer', 'ziegel', 'glas', 'draht', 'werkzeug', 'stahl'];
export const TRADERS = {
  hafen: { name: 'Hafenhändler', every: 180, first: 30, dock: 20, speed: 5, spawn: 36, buys: [...BASIC, 'raeucherfisch'], sells: BASIC, flag: '#3f6fd8',
           desc: 'Kommt alle 3 Minuten. Kauft und verkauft Grund- und Zwischenwaren.' },
  fern:  { name: 'Fernhändler', every: 720, first: 60, dock: 20, speed: 5, spawn: 40, needRing: 2, flag: '#a25ad8',
           buys: ['chip', 'kunststoff', 'schmiermittel', 'fass', 'fass_wasser', 'fass_rohoel', 'fass_saeure', 'magnet'],
           offer: [{ it: 'neodym', w: 1, min: 20, max: 60 }, { it: 'schwefel', w: 1, min: 60, max: 150 }, { it: 'fass_rohoel', w: 1, min: 20, max: 60 },
                   { it: 'neodymerz', w: 0.6, min: 40, max: 100 }, { it: 'bauplan', w: 0.5, min: 5, max: 15 }, { it: 'schaltplan', w: 0.35, min: 3, max: 8 }],
           offerN: [3, 4],
           desc: 'Kommt alle 12 Minuten, sobald ein Kontor ab Ring 2 steht. Kauft Hochtechnik, verkauft seltene Rohstoffe und manchmal Pläne; das Angebot wechselt bei jedem Besuch.' }
};
export const TRADER_ORDER = Object.keys(TRADERS);

// Münzbuch: Posten (Statistik-Reiter „Münzen“, Tooltip in der Kopfleiste), Eimer zu every Sekunden, so viele Eimer
// Völker (Version 17, sim/npc.js): pv:npc:<id> = Verkauf an …, pk:npc:<id> = Kauf von …, na:npc:<id> = Aufträge und Lieferverträge, ng:npc:<id> = Geschenke
export const COIN_SRC = { verkauf: 'Verkauf', kauf: 'Kauf', funde: 'Funde', leuchtturm: 'Leuchtturm', ziele: 'Ziele', forschung: 'Forschung', reparatur: 'Reparatur', debug: 'Test' };
export const COIN_LOG = { every: 30, len: 120 };
// Wracks ab Ring 2: mit chance zusätzlich min–max Münzen
export const WRECK_COINS = { ring: 2, chance: 0.25, min: 50, max: 200 };
// Handel zwischen Spielern (Getrennte Inseln): Preislisten der Handelskontore (sim/ptrade.js)
// lines = Einträge je Liste (Verkauf/Ankauf), maxPrice = höchster Preis je Stück, step = Preisstufe
export const PLAYER_TRADE = { lines: 12, maxPrice: 9999, step: 0.1 };
// Routen zu fremden Hauptkontoren: „Gerade von X besiedelt“, wenn das Kontor jünger als recent Sekunden ist (Gründungs-Wettlauf)
export const FOUND_RACE = { recent: 30 };
