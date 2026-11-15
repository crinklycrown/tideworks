/* ---------- Forschung, Ziele & Ruhm ----------
   Forschung kostet Pläne und Waren (aus allen Inseln), keine XP und keine Bewohner.
   Ruhm (state.xp / state.xpTotal, früher XP) gibt es für abgeschlossene Forschung (Stufe × FAME_TECH)
   und für jedes erreichte Ziel (FAME_GOAL). state.goal = Index des nächsten offenen Ziels.
   Getrennte Inseln: alles je Spieler (pst); Forschungskosten kommen nur aus den Lagern der eigenen Inseln.
   pid fehlt = Spieler des laufenden Kommandos bzw. Host (Einzelspieler unverändert).
*/
import { TECH, TECH_BY_ID } from '../data/tech.js';
import { GOALS } from '../data/goals.js';
import { FAME_TECH, FAME_GOAL } from '../data/mining.js';
import { totalRes, pst, actor, isSep, myIsl, seatedPids, planOk, actOk } from './state.js';
import { flowAdd } from './stats.js';
import { fitHolds } from './ships.js';
import { coinAdd } from './coins.js';

export function levelInfo(xp) {
  let level = 1, need = 100, rest = xp;
  while (rest >= need) { rest -= need; level++; need = 100 + (level - 1) * 75; }
  return { level, cur: rest, need };
}
export function addFame(g, n, pid) { const P = pst(g, pid); P.xp += n; P.xpTotal += n; }
// Voraussetzungen: vorher nötige Forschungen, (seit Version 15) der Plan eines Volks (T.plan, data/unlocks.js), (seit 0.24.0) der Akt (T.act)
export const reqMet = (g, T, pid) => { const tech = pst(g, pid).tech; return T.req.every(r => tech[r]) && planOk(g, T) && actOk(g, T); };
// Getrennte Inseln: Bestand nur der eigenen Inseln (auf dem Spiegel stehen ohnehin nur die eigenen Lager voll)
const resOf = (g, r, pid) => isSep(g) && !g.mirror ? totalRes(g, r, pid || actor(g)) : totalRes(g, r);
export function canResearch(g, T, pid) {
  const P = pst(g, pid);
  if (P.tech[T.id] || !reqMet(g, T, pid)) return false;
  if (T.coins && (P.coins | 0) < T.coins) return false;   // Kosten in Münzen
  return Object.keys(T.res).every(r => resOf(g, r, pid) >= T.res[r]);
}
// Mindestens eine Forschung verfügbar und bezahlbar (Punkt am Forschungs-Knopf)
export const anyResearchable = (g) => TECH.some(T => canResearch(g, T));
export function research(g, id) {
  const T = TECH_BY_ID[id], state = g.state, pid = actor(g), P = pst(g, pid);
  if (!T || !canResearch(g, T, pid)) return false;
  for (const r in T.res) {
    let need = T.res[r];
    const order = Object.keys(state.isl).map(Number).filter(k => myIsl(g, k, pid)).sort((a, b) => (state.isl[b].inv[r] || 0) - (state.isl[a].inv[r] || 0));
    for (const k of order) { const inv = state.isl[k].inv, n = Math.min(need, inv[r] || 0); inv[r] -= n; need -= n; if (n > 0) flowAdd(g, k, 'c', r, n, 'forschung'); if (need <= 0) break; }
  }
  if (T.coins) coinAdd(g, -T.coins, 'forschung', pid);
  P.tech[id] = true;
  fitHolds(g, pid);       // Upgrades wirken sofort, z. B. neuer Laderaum auch für fahrende Schiffe
  const fame = T.stufe * FAME_TECH;
  addFame(g, fame, pid);
  g.events.push({ type: 'researched', id, fame, pid });
  return true;
}
// Ziele der Reihe nach prüfen. silent = ohne Ruhm und Meldung (beim ersten Laden eines alten Stands).
// state.gdone = erreichte Ziele nach id: ein schon erreichtes Ziel (z. B. nach dem Umsortieren der Ziele) wird still übersprungen.
// Getrennte Inseln: je Spieler mit Startplatz (pid = nur dieser); die Münzen gehen an den, der das Ziel erreicht.
export function checkGoals(g, silent, pid) {
  if (isSep(g) && pid == null) { for (const p of seatedPids(g)) checkGoals(g, silent, p); return; }
  const state = pst(g, pid), sep = isSep(g);
  if (!state.gdone || typeof state.gdone !== 'object') state.gdone = {};
  if (!Number.isFinite(state.goal)) { state.goal = 0; silent = true; }
  while (state.goal < GOALS.length) {
    const G = GOALS[state.goal], had = !!state.gdone[G.id];
    if (!had && !G.done(g, sep ? pid : undefined)) break;
    state.gdone[G.id] = 1;
    if (!silent && !had) { const coins = G.coins || 0; addFame(g, FAME_GOAL, pid); if (coins) coinAdd(g, coins, G.src || 'ziele', pid); g.events.push({ type: 'goal', i: state.goal, fame: FAME_GOAL, coins, pid: sep ? pid : undefined }); }
    state.goal++;
  }
}
