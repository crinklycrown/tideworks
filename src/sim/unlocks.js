/* =========================================================
   FREISCHALTUNGEN SETZEN (Tabellen und Texte: data/unlocks.js, Prüfung: isUnlocked in sim/state.js)
   unlock(g, key, src) ist die Schnittstelle für spätere Schritte: Ruf bei einem Volk (Thread 4, src 'npc')
   und Story-Ereignisse (Thread 3, src 'story'). Läuft nur in der Simulation (Host); der Spiegel bekommt
   state.unl mit dem Snapshot. Freischaltungen gehören zur Welt (alle Spieler, auch bei Getrennten Inseln).
   ========================================================= */
import { UNLOCKS, PLANS, UNLOCK_KEYS, srcOf, unlockName } from '../data/unlocks.js';
import { TECH, TECH_BY_ID } from '../data/tech.js';
import { pst, planOk } from './state.js';

// Quellen, die in state.unl stehen dürfen: npc, story, alt (aus einem Spielstand vor Version 15), debug
const SRCS = new Set(['npc', 'story', 'alt', 'debug']);
// Schlüssel freischalten. Liefert true, wenn er neu ist. silent = ohne Meldung an die Oberfläche.
export function unlock(g, key, src, silent) {
  key = String(key);
  if (!UNLOCK_KEYS.includes(key) || !SRCS.has(src)) return false;
  const unl = g.state.unl || (g.state.unl = {});
  if (unl[key]) return false;
  unl[key] = src;
  if (!silent) g.events.push({ type: 'unlocked', key, src, name: unlockName(key), plan: key.startsWith('plan:'), to: '*' });
  return true;
}
// Wieder sperren (nur Debug und Tests)
export function relock(g, key) { if (g.state.unl) delete g.state.unl[key]; }
// Forschungen der Reihe nach erforschen, deren Voraussetzungen (Forschung und Plan) erfüllt sind, bis sich nichts mehr ändert.
// Ohne Kosten, ohne Ruhm. Liefert die Zahl neuer Forschungen.
export function researchFree(g, pid) {
  const tech = pst(g, pid).tech;
  let n = 0, more = true;
  while (more) {
    more = false;
    for (const T of TECH) if (!tech[T.id] && T.req.every(r => TECH_BY_ID[r] && tech[r]) && planOk(g, T)) { tech[T.id] = true; n++; more = true; }
  }
  return n;
}
// Debug „Alles freischalten“ (nur Entwicklung): alle Volk- und Story-Freischaltungen und Pläne, danach alle Forschungen
export function devUnlockAll(g, pids) {
  let n = 0;
  for (const key of UNLOCK_KEYS) if (unlock(g, key, 'debug', true)) n++;
  for (const pid of pids) n += researchFree(g, pid);
  g.events.push({ type: 'unlocked', all: true, n, to: '*' });
  return n;
}
export { UNLOCKS, PLANS, srcOf };
