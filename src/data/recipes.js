/* =========================================================
   REZEPTE der Verarbeitungsgebäude (sim/production.js tickRecipe)
   { id, b: Gebäudetyp, in: { item: Menge }, out: { item: Menge }, fin?, fout?, t: Sekunden, power, name?, icon?, tech? }
   fin/fout (optional): Flüssigkeiten (data/fluids.js) rein/raus in Einheiten je Durchgang. fin wird während des Durchgangs
          anteilig aus dem Gebäudepuffer gezogen (fehlt sie, pausiert der Fortschritt), fout am Ende in den Puffer gelegt.
          Puffer je Flüssigkeit FLUID_BUF × Menge; das Gebäude tauscht über angrenzende Rohrnetze (sim/fluids.js).
   tech (optional): Rezept erst nach dieser Forschung wählbar (hängt im Skilltree als Blatt am Forschungs-Knoten)
   name/icon (optional): Anzeige in der Rezeptauswahl, sonst Name und Symbol des ersten Produkts
   main (optional): Hauptprodukt (Status-Ansicht, Farbe der Animation), sonst das erste Produkt
   power: 0 = ohne Strom
          { need: n } = braucht n Strom/s, ohne Strom Stillstand
          { opt: n }  = läuft ohne Strom, mit n Strom/s doppelt so schnell (OPT_BOOST)
   Ein Gebäude mit mehreren Rezepten hat genau eines aktiv (Umschalten im Info-Panel), das erste ist Standard.
   Puffer: Eingang je Zutat das Doppelte der Rezeptmenge (mindestens IN_MIN), Ausgang OUT_CAP je Produkt.
   ========================================================= */
import { FLUID_BUF } from './fluids.js';
export const IN_MIN = 5, OUT_CAP = 10, OPT_BOOST = 2;

export const RECIPES = [
  { id: 'eisenbarren',  b: 'schmelzofen',    in: { eisenerz: 2, kohle: 1 },            out: { eisen: 2 },    t: 6, power: 0 },
  { id: 'kupferbarren', b: 'schmelzofen',    in: { kupfererz: 2, kohle: 1 },           out: { kupfer: 2 },   t: 6, power: 0 },
  { id: 'ziegel',       b: 'schmelzofen',    in: { kalk: 2, quarz: 1, kohle: 1 },      out: { ziegel: 3 },   t: 6, power: 0 },
  { id: 'glas',         b: 'schmelzofen',    in: { quarz: 3, kohle: 1 },               out: { glas: 2 },     t: 6, power: 0 },
  { id: 'draht',        b: 'drahtzieherei',  in: { kupfer: 1 },                        out: { draht: 2 },    t: 3, power: { opt: 1 } },
  { id: 'werkzeug',     b: 'werkzeug',       in: { eisen: 1, holz: 1 },                out: { werkzeug: 1 }, t: 5, power: { opt: 2 } },
  { id: 'fass',         b: 'werkzeug',       in: { eisen: 2 },                         out: { fass: 1 },     t: 4, power: { opt: 2 }, tech: 'faesser' },
  { id: 'raeucherfisch', b: 'raeucherei',    in: { fisch: 2, holz: 1 },               out: { raeucherfisch: 1 }, t: 6, power: 0 },
  { id: 'stahl',        b: 'induktionsofen', in: { eisen: 2, kohle: 1 },               out: { stahl: 1 },    t: 4, power: { need: 4 } },
  { id: 'graphit',      b: 'graphitpresse',  in: { kohle: 3 },                         out: { graphit: 1 },  t: 4, power: { need: 3 } },
  { id: 'silizium',     b: 'siliziumofen',   in: { quarz: 2, graphit: 1 },             out: { silizium: 1 }, t: 6, power: { need: 6 } },
  { id: 'chip',         b: 'assembler',      in: { silizium: 1, draht: 2 },            out: { chip: 1 },     t: 8, power: { need: 4 } },
  { id: 'teer_kohle',   b: 'pyrolyseofen',   in: { kohle: 4 },                         out: { teer: 1 },     t: 6, power: { need: 3 }, name: 'Teer aus Kohle', icon: 'kohle' },
  { id: 'teer_holz',    b: 'pyrolyseofen',   in: { holz: 8 },                          out: { teer: 1 },     t: 6, power: { need: 3 }, name: 'Teer aus Holz', icon: 'holz' },
  { id: 'magnet',       b: 'assembler',      in: { neodym: 2, stahl: 1 },              out: { magnet: 1 },   t: 10, power: { need: 4 }, tech: 'magnete' },
  // Chemischer Reaktor (Flüssigkeiten über Rohre)
  { id: 'schmier_teer', b: 'reaktor', in: { teer: 2 },   fin: { wasser: 10 }, out: { schmiermittel: 1 }, t: 6, power: { need: 6 }, name: 'Schmiermittel aus Teer', icon: 'teer' },
  { id: 'schmier_oel',  b: 'reaktor', in: {},            fin: { rohoel: 10 }, out: { schmiermittel: 2 }, t: 6, power: { need: 6 }, name: 'Schmiermittel aus Rohöl', icon: 'rohoel' },
  { id: 'kunststoff',   b: 'reaktor', in: { kohle: 1 },  fin: { rohoel: 10 }, out: { kunststoff: 2 },    t: 6, power: { need: 6 } },
  { id: 'saeure',       b: 'reaktor', in: { schwefel: 1 }, fin: { wasser: 10 }, out: {}, fout: { saeure: 10 }, t: 4, power: { need: 6 }, name: 'Schwefelsäure', icon: 'saeure' },
  { id: 'neodym',       b: 'reaktor', in: { neodymerz: 2 }, fin: { saeure: 10 }, out: { neodym: 1 },     t: 8, power: { need: 6 } },
  // Fässer: Abfüllanlage füllt aus dem Rohrnetz ab, Entleerer gibt den Inhalt wieder ins Netz
  { id: 'fuell_wasser', b: 'abfueller', in: { fass: 1 }, fin: { wasser: 50 }, out: { fass_wasser: 1 }, t: 2, power: { need: 1 }, name: 'Wasser abfüllen' },
  { id: 'fuell_rohoel', b: 'abfueller', in: { fass: 1 }, fin: { rohoel: 50 }, out: { fass_rohoel: 1 }, t: 2, power: { need: 1 }, name: 'Rohöl abfüllen' },
  { id: 'fuell_saeure', b: 'abfueller', in: { fass: 1 }, fin: { saeure: 50 }, out: { fass_saeure: 1 }, t: 2, power: { need: 1 }, name: 'Säure abfüllen' },
  { id: 'leer_wasser',  b: 'entleerer', in: { fass_wasser: 1 }, out: { fass: 1 }, fout: { wasser: 50 }, t: 2, power: { need: 1 }, name: 'Wasserfass entleeren', icon: 'fass_wasser', main: 'wasser' },
  { id: 'leer_rohoel',  b: 'entleerer', in: { fass_rohoel: 1 }, out: { fass: 1 }, fout: { rohoel: 50 }, t: 2, power: { need: 1 }, name: 'Ölfass entleeren', icon: 'fass_rohoel', main: 'rohoel' },
  { id: 'leer_saeure',  b: 'entleerer', in: { fass_saeure: 1 }, out: { fass: 1 }, fout: { saeure: 50 }, t: 2, power: { need: 1 }, name: 'Säurefass entleeren', icon: 'fass_saeure', main: 'saeure' }
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));
// Rezepte je Gebäudetyp (Reihenfolge wie oben)
export const RECIPES_OF = {};
for (const r of RECIPES) (RECIPES_OF[r.b] || (RECIPES_OF[r.b] = [])).push(r);
export const hasRecipes = (t) => !!RECIPES_OF[t];

// Strombedarf eines Rezepts: { use, need } (use = Strom/s, need = ohne Strom Stillstand)
export function recipePower(r) {
  const p = r && r.power;
  if (!p) return { use: 0, need: false };
  return p.need ? { use: p.need, need: true } : { use: p.opt || 0, need: false };
}
// Größe des Eingangspuffers einer Zutat
export const inCap = (n) => Math.max(IN_MIN, 2 * n);
// Größe des Flüssigkeitspuffers (Einheiten) für n Einheiten je Durchgang
export const fluidCap = (n) => FLUID_BUF * n;
// Erstes Produkt eines Rezepts (Item oder Flüssigkeit): Name und Symbol, wenn name/icon fehlen
export const recipeMain = (R) => R.main || Object.keys(R.out)[0] || Object.keys(R.fout || {})[0];
// Flüssigkeit eines Rezepts (erste aus fout, sonst aus fin; null = keine): Farbe der Animation von Abfüllanlage und Entleerer
export const recipeFluid = (R) => (R && (Object.keys(R.fout || {})[0] || Object.keys(R.fin || {})[0])) || null;
// Aktives Rezept eines Gebäudes b (unbekannte ID → erstes Rezept des Typs, kein Rezept-Gebäude → null)
export const recipeOf = (b) => { const r = RECIPE_BY_ID[b.rc]; return r && r.b === b.t ? r : RECIPES_OF[b.t] ? RECIPES_OF[b.t][0] : null; };
