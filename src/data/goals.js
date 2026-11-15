// Ziele der Einführung (Reihenfolge = Reihenfolge im Spiel). done(g) prüft den Spielkontext (Simulation und Spiegel).
// Die Simulation merkt sich das nächste offene Ziel (state.goal, Index) und die erreichten Ziele (state.gdone, nach id),
// vergibt beim Erreichen Ruhm (FAME_GOAL, data/mining.js). id = fester Name, damit Umsortieren alte Spielstände nicht verschiebt.
// Version 15: „Ofenbau“ neu, „kontor2“ hinter den Stahl gerückt (Kontor gründen schaltet Ole frei).
// Version 16: die Leuchtturm-Ziele phase1–phase4 entfallen; den Leuchtturm führt die Geschichte (Akt-Ziel über der Ziel-Liste, data/story.js).
// GOAL_IDS_V11 = Reihenfolge bis Spielstand-Version 11 (Umnummerierung beim Laden, save/serialize.js migrate11).
// Getrennte Inseln: done(g, pid) prüft nur den Besitz und die Werte dieses Spielers (pid fehlt = alles, wie im Einzelspiel).
import { countType, kontorIslands, pst, mine } from '../sim/state.js';

const P = (g, pid) => pst(g, pid);
const own = (g, b, pid) => pid == null || mine(g, b, pid);
const made = (g, it, pid) => (P(g, pid).stats.made[it] || 0) > 0;
const drillOn = (g, it, pid) => { for (const b of g.blds.values()) if ((b.t === 'bohrer' || b.t === 'bohrer2') && b._ot === it && own(g, b, pid)) return true; return false; };
const droneOn = (g, pid) => { for (const b of g.blds.values()) if (b.t === 'drohnenhafen' && own(g, b, pid) && (b._tp > 0 || (b.dr || []).some(d => d.st !== 'idle'))) return true; return false; };
const running = (g, t, pid) => { for (const b of g.blds.values()) if (b.t === t && b._act && own(g, b, pid)) return true; return false; };

export const GOALS = [
  { id: 'saege', txt: 'Liefere <b>Holz</b> per <b>Band</b> ins <b>Kontor</b>: ein Sägewerk an einen Wald, ein Fließband von dort ins Kontor (Knopf „Bauen“ unten, Taste B).', done: (g, pid) => countType(g, 'saege', pid) > 0 && P(g, pid).stats.delivered > 0 },
  { id: 'fisch', txt: 'Baue eine <b>Fischerhütte</b> am Wasser und verbinde sie per Band mit dem Kontor.', done: (g, pid) => made(g, 'fisch', pid) },
  { id: 'huette', txt: 'Baue eine <b>Hütte</b>. Versorgt mit Fisch und Holz liefert sie <b>Skizzen</b> für die Forschung.', done: (g, pid) => made(g, 'skizze', pid) },
  { id: 'bohrer', txt: 'Setze <b>Bohrer</b> auf Kohle und auf Eisenerz.', done: (g, pid) => drillOn(g, 'kohle', pid) && drillOn(g, 'eisenerz', pid) },
  { id: 'ofenbau', txt: 'Erforsche den <b>Ofenbau</b> (Forschung, Taste T): Skizzen aus der Hütte und etwas Holz reichen.', done: (g, pid) => !!P(g, pid).tech.ofenbau },
  { id: 'schmelz', txt: 'Schmelze im <b>Schmelzofen</b> die ersten Eisenbarren (Eisenerz + Kohle).', done: (g, pid) => made(g, 'eisen', pid) },
  { id: 'werft', txt: 'Erforsche den <b>Schiffbau</b>, baue eine <b>Werft</b> am Meer und lass ein Schiff vom Stapel laufen.', done: (g, pid) => g.state.ships.some(s => own(g, s, pid)) },
  { id: 'kupfer', txt: 'Erforsche die <b>Kupferverarbeitung</b> (Forschung, Taste T).', done: (g, pid) => !!P(g, pid).tech.kupfer },
  { id: 'strom', txt: 'Erzeuge <b>Strom</b>: Verbrennungsanlage und Strommast bauen.', done: (g, pid) => countType(g, 'verbrennung', pid) > 0 && countType(g, 'mast', pid) > 0 },
  { id: 'stahl', txt: 'Gieße im <b>Induktionsofen</b> den ersten Stahlbarren.', done: (g, pid) => made(g, 'stahl', pid) },
  { id: 'kontor2', txt: 'Gründe mit dem Schiff ein <b>Kontor</b> auf einer zweiten Insel (40 Holz an Bord).', done: (g, pid) => kontorIslands(g, pid).length >= 2 },
  { id: 'dampf', txt: 'Bringe ein <b>Dampfkraftwerk</b> zum Laufen: Wasserpumpe am Meer, Rohr zum Kraftwerk und Kohle vom Band.', done: (g, pid) => running(g, 'kraftwerk', pid) },
  { id: 'buerger', txt: 'Versorge ein <b>Bürgerhaus</b> mit Fisch, Werkzeug und Glas: Es liefert den ersten <b>Bauplan</b>.', done: (g, pid) => made(g, 'bauplan', pid) },
  { id: 'chip', txt: 'Baue im <b>Assembler</b> den ersten <b>Mikrochip</b>.', done: (g, pid) => made(g, 'chip', pid) },
  { id: 'rohoel', txt: 'Fördere auf einer Sandinsel mit einer <b>Saugpumpe</b> das erste <b>Rohöl</b>.', done: (g, pid) => made(g, 'rohoel', pid) },
  { id: 'kunststoff', txt: 'Stelle im <b>Chemischen Reaktor</b> den ersten <b>Kunststoff</b> her (Rohöl + Kohle).', done: (g, pid) => made(g, 'kunststoff', pid) },
  { id: 'schaltplan', txt: 'Versorge ein <b>Ingenieurhaus</b> mit Fisch, Kunststoff und Mikrochips: Es liefert den ersten <b>Schaltplan</b>.', done: (g, pid) => made(g, 'schaltplan', pid) },
  { id: 'magnet', txt: 'Forme im <b>Assembler</b> den ersten <b>Supermagneten</b> aus Neodym und Stahl.', done: (g, pid) => made(g, 'magnet', pid) },
  { id: 'multibohrer', txt: 'Bringe einen <b>Multi-Bohrer</b> zum Laufen (Strom, Kühlwasser und Schmiermittel).', done: (g, pid) => running(g, 'multibohrer', pid) },
  // Endgame: Handel, Drohnen. coins = Belohnung in Münzen (src = Posten im Münzbuch)
  { id: 'handel', txt: 'Erforsche den <b>Handel</b> und baue einen <b>Handelsposten</b> direkt am Meer.', done: (g, pid) => countType(g, 'handel', pid) > 0, coins: 200 },
  { id: 'verkauf', txt: 'Lege im Fenster <b>Markt</b> (Taste K) einen Verkaufsauftrag an: Der <b>Hafenhändler</b> kauft beim nächsten Besuch.', done: (g, pid) => (P(g, pid).stats.sold || 0) > 0, coins: 100 },
  { id: 'muenzen', txt: 'Spare <b>5000 Münzen</b> an.', done: (g, pid) => (P(g, pid).coins | 0) >= 5000, coins: 500 },
  { id: 'drohnen', txt: 'Bringe einen <b>Drohnenhafen</b> in Betrieb: Drohnen fliegen Waren zwischen Drohnenkisten.', done: (g, pid) => droneOn(g, pid), coins: 500 },
];

export const GOAL_IDS_V11 = ['saege', 'extraktor', 'fisch', 'huette', 'bohrer', 'schmelz', 'werft', 'kontor2', 'kupfer', 'strom', 'stahl', 'buerger', 'chip', 'dampf', 'rohoel', 'kunststoff', 'schaltplan', 'magnet', 'multibohrer', 'handel', 'verkauf', 'muenzen', 'drohnen', 'phase1', 'phase2', 'phase3', 'phase4'];
