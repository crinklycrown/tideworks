/* =========================================================
   GESCHICHTE IN DER SIMULATION (Daten und Format: data/story.js)
   storyEvent(g, kind, arg) ist der eine Einstieg für alle Auslöser (Entdecken, Gespräch, Handel, Leuchtturm-Stufe, Tauchen).
   Kommandos: talk (Gespräch mit einem NPC, ein Schiff muss an seinem Steg liegen), storySeen (Cutscene/Dialog gesehen, nur Host),
   storyChoice (Entscheidung am Leuchtturm, nur Host), storyDebug (Akt setzen, Flag setzen, Auslöser feuern; nur Host).
   Läuft nur auf dem Host; der Spiegel bekommt state.story mit dem Snapshot. Kein DOM-Zugriff.
   ========================================================= */
import { TRIGGERS, TRIGGER_BY_ID, ACT_MAX, CHOICES, CUTSCENES, freshStory } from '../data/story.js';
import { DIALOGS, idleDialogFor } from '../data/dialogs/index.js';
import { NPC_ORDER, npcName } from '../data/npcs.js';
import { srcOf } from '../data/unlocks.js';
import { unlock, relock } from './unlocks.js';
import { npcPort, shipAtPort } from './villages.js';
import { applyEnding, npcGone } from './ending.js';

export const storyOf = (g) => (g.state && g.state.story) || null;

// Feuert die Story-Schritte zum Auslöser kind:arg (z. B. 'discover', 'ole'). Liefert die Zahl ausgelöster Schritte.
export function storyEvent(g, kind, arg) {
  const S = storyOf(g);
  if (!S) return 0;
  const on = arg != null ? `${kind}:${arg}` : kind;
  let n = 0;
  for (const T of TRIGGERS) if (onMatch(T, on) && ready(g, S, T)) { fire(g, S, T); n++; }
  return n;
}
// Auslöser eines Schritts: ein String oder (seit 0.21.0) eine Liste von Strings
const onMatch = (T, on) => Array.isArray(T.on) ? T.on.includes(on) : T.on === on;
function ready(g, S, T) {
  if (S.once[T.id]) return false;
  if (T.act != null && S.act !== T.act) return false;
  if (T.minAct != null && S.act < T.minAct) return false;
  if (T.flags && !T.flags.every(f => S.flags[f])) return false;
  if (T.wonder != null && ((g.state.wonder && g.state.wonder.ph) | 0) < T.wonder) return false;
  return true;
}
function fire(g, S, T, silent) {
  S.once[T.id] = g.state.time;
  for (const f of T.set || []) S.flags[f] = 1;
  for (const key of T.unlock || []) unlock(g, key, 'story', true);
  if (T.toAct) S.act = T.toAct;
  if (silent) return;
  g.events.push({ type: 'story', id: T.id, cs: T.cs || null, pre: T.pre || null, dialog: T.dialog || null, act: S.act, choice: !!T.choice, unlock: T.unlock || null, to: '*' });
  // Neuer Akt: schon fertige Leuchtturm-Stufen nachholen (z. B. Turm aus einem Spielstand vor Version 16)
  if (T.toAct) { const ph = (g.state.wonder && g.state.wonder.ph) | 0; for (let n = 1; n <= ph; n++) storyEvent(g, 'wonder', n); }
}
// Start eines neuen Spiels mit Geschichte: Prolog
export function storyStart(g) { storyEvent(g, 'start'); }

// Gespräch mit einem NPC (Klick auf den NPC). Ein Schiff muss am Steg liegen. Ohne Story-Schritt der passende Gesprächsdialog (data/dialogs/, idle).
export function talk(g, npc) {
  const S = storyOf(g), fail = (msg) => g.events.push({ type: 'fail', msg });
  if (!S || !NPC_ORDER.includes(npc)) return;
  const P = npcPort(g, npc);
  if (!P) return;
  if (!S.flags['npc_' + npc]) { fail(`${npcName(npc)} kennt dich noch nicht.`); return; }
  if (npcGone(g, npc)) return;   // nach dem Ende: Ruinen bzw. Aurel ohne Gespräch (sim/ending.js)
  if (!shipAtPort(g, P)) { fail(`Leg erst mit einem Schiff an ${npcName(npc)}s Steg an.`); return; }
  if (storyEvent(g, 'talk', npc)) return;
  const dialog = idleDialogFor(npc, S);
  if (dialog) g.events.push({ type: 'talk', npc, dialog });
}
// Cutscene oder Dialog gesehen (nur der Host setzt „gesehen“)
export function storySeen(g, ids) {
  const S = storyOf(g);
  if (!S) return;
  for (const id of [].concat(ids || [])) if (CUTSCENES[id] || DIALOGS[id]) S.seen[id] = S.seen[id] || g.state.time;
}
// Entscheidung am Leuchtturm: endgültig, nur nach dem Finale
export function storyChoice(g, c) {
  const S = storyOf(g);
  if (!S || S.choice || !S.once.finale || !CHOICES[c]) { g.events.push({ type: 'fail', msg: 'Jetzt gibt es nichts zu entscheiden.' }); return; }
  S.choice = c; S.act = ACT_MAX;
  applyEnding(g, c);   // Folgen für die Welt (sim/ending.js), seit 0.23.0
  g.events.push({ type: 'story', id: 'ende_' + c, cs: CHOICES[c].cs, dialog: CHOICES[c].dialog, act: S.act, choice: false, ending: c, to: '*' });
}

// Spielstand reparieren (beim Laden und bei Debug-Akt): Übergänge, die zum erreichten Akt geführt haben, gelten mit ihren Flags
// und Freischaltungen. Ältere Stände (vor 0.18) erreichten Akt 3 ohne den Bauplan Taucherglocke: keine Montage in der Werft.
export function repairStory(g) {
  const S = g.state && g.state.story;
  if (!S) return 0;
  let n = 0;
  for (const T of TRIGGERS) {
    if (T.toAct == null || T.toAct > S.act) continue;
    if (!S.once[T.id]) { S.once[T.id] = g.state.time || 1; n++; }
    for (const f of T.set || []) if (!S.flags[f]) { S.flags[f] = 1; n++; }
    for (const key of T.unlock || []) if (!(g.state.unl && g.state.unl[key])) { unlock(g, key, 'story', true); n++; }
  }
  return n;
}

/* ---------- Debug (nur Entwicklung, nur Host) ---------- */
// Akt direkt setzen: Schritte, die zu früheren Akten gehören, gelten als ausgelöst (Flags, Freischaltungen, ohne Meldung),
// Schritte innerhalb des Akts n bleiben, wie sie sind (z. B. schon entdeckte Völker: Entdecken passiert nur einmal),
// alle späteren gelten als offen (ihre Flags und Story-Freischaltungen werden zurückgenommen). Entscheidung wird zurückgesetzt.
function setAct(g, n) {
  const S = storyOf(g);
  n = Math.max(1, Math.min(ACT_MAX, n | 0));
  const actOf = (T) => T.act != null ? T.act : T.minAct || 1;
  const before = (T) => T.id === 'prolog' || (T.toAct != null ? T.toAct <= n : actOf(T) < n);
  for (const T of TRIGGERS) {
    if (before(T)) { if (!S.once[T.id]) fire(g, S, T, true); continue; }
    if (T.toAct == null && actOf(T) === n) continue;
    delete S.once[T.id];
    for (const f of T.set || []) delete S.flags[f];
    for (const key of T.unlock || []) if (srcOf(key).src === 'story' && g.state.unl && (g.state.unl[key] === 'story' || g.state.unl[key] === 'debug')) relock(g, key);
  }
  S.act = n;
  repairStory(g);
  if (n < ACT_MAX) S.choice = null;   // Achtung: schon angewandte Folgen eines Endes (sim/ending.js) bleiben
  else if (!S.choice) { S.choice = 'a'; applyEnding(g, 'a'); }
}
export function storyDebug(g, c) {
  if (!g.state) return;
  const fail = (msg) => g.events.push({ type: 'fail', msg: 'Debug: ' + msg });
  if (!g.state.story) { if (c.op === 'on') { g.state.story = freshStory(); g.events.push({ type: 'storyDebug', msg: 'Geschichte eingeschaltet (Akt 1).', to: '*' }); } else fail('Diese Welt hat keine Geschichte (Getrennte Inseln).'); return; }
  const S = g.state.story;
  switch (c.op) {
    case 'act': setAct(g, +c.n); break;
    case 'flag': if (typeof c.flag === 'string' && c.flag) { if (c.off) delete S.flags[c.flag]; else S.flags[c.flag] = 1; } break;
    case 'fire': {   // Auslöser feuern, z. B. 'find:karte', 'dive', 'wonder:2', 'trade:aurel'
      const [kind, arg] = String(c.on || '').split(':');
      if (!storyEvent(g, kind, arg)) fail(`„${c.on}“ löst gerade nichts aus.`);
      return;
    }
    case 'step': { const T = TRIGGER_BY_ID[c.id]; if (!T) { fail(`Schritt „${c.id}“ unbekannt.`); return; } fire(g, S, T); return; }
    case 'reset': g.state.story = freshStory(); break;
    // Ende direkt setzen (seit 0.23.0): Akt 5, Finale gilt als gesehen, dann die Entscheidung c mit Szene und Folgen
    case 'ending': {
      const c2 = String(c.c || '');
      if (!CHOICES[c2]) { fail('Ende a oder b.'); return; }
      if (S.choice) { fail(`Die Entscheidung ist schon gefallen (${S.choice}). Nimm eine Kopie eines Spielstands von vorher.`); return; }
      if (S.act < 5) setAct(g, 5);
      S.once.finale = S.once.finale || g.state.time || 1;
      storyChoice(g, c2);
      return;
    }
    default: fail('Unbekannte Story-Aktion.'); return;
  }
  g.events.push({ type: 'storyDebug', msg: `Akt ${g.state.story.act}`, to: '*' });
}

// Etwa einmal pro Sekunde (sim/sim.js): Schiff neu an einem NPC-Steg → Hinweis an alle (mit step = ein Gespräch bringt die Geschichte weiter).
// Version 18: ohne fälligen Story-Schritt nur beim ersten Anlegen je NPC (S.once['steg_<npc>'], gespeichert), danach still.
export function storyTick(g) {
  const S = storyOf(g);
  if (!S) return;
  const at = g._atNpc || (g._atNpc = new Set());
  for (const npc of NPC_ORDER) {
    const P = npcPort(g, npc), s = P && shipAtPort(g, P);
    if (!s) { at.delete(npc); continue; }
    if (at.has(npc)) continue;
    at.add(npc);
    if (!S.flags['npc_' + npc] || npcGone(g, npc)) continue;
    // Anlegen ist auch ein Story-Auslöser (visit:<npc>), z. B. Aurels Frage in Akt 4
    if (S.flags['npc_' + npc]) storyEvent(g, 'visit', npc);
    const step = TRIGGERS.some(T => onMatch(T, 'talk:' + npc) && ready(g, S, T));
    if (!step && S.once['steg_' + npc]) continue;
    S.once['steg_' + npc] = g.state.time || 1;
    g.events.push({ type: 'npcArrive', npc, ship: s.name, step, to: '*' });
  }
}
