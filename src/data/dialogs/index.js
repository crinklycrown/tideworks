/* =========================================================
   DIALOGE (seit 0.10.0): alle Texte des Monolog-Fensters als Daten, eine Datei je Figur (Texte aus docs/STORY.md)
   Ein Dialog: { speaker, portrait, lines, when, once, idle }
     speaker  – Figur (Schlüssel in SPEAKERS: Name im Namensschild, Porträt aus gfx/portraits.js)
     portrait – anderes Porträt als die Figur (optional)
     lines    – Textzeilen; eine Zeile kann eine andere Figur sprechen lassen: { who: 'brann', text: '…' }
                und ein anderes Porträt zeigen: { who: 'herrscher', portrait: 'spieler', text: '…' } (seit 0.22.0)
     when     – Bedingung (optional): { act, minAct, maxAct, flag, noFlag } (flag/noFlag: ein Name oder eine Liste)
     once     – true: nur einmal je Welt (gilt als gesehen, sobald der Host ihn gelesen hat: state.story.seen)
     idle     – NPC-Id: Gesprächsdialog beim Klick auf den NPC, wenn kein Story-Schritt fällig ist
                (sim/story.js nimmt den ersten passenden in der Reihenfolge der Dateien)
   Dialoge zu Story-Schritten (TRIGGERS in data/story.js) brauchen kein when/once: der Schritt läuft ohnehin nur einmal.
   Kein DOM-Zugriff (die Simulation liest idle/when/once).
   ========================================================= */
import ole from './ole.js';
import brann from './brann.js';
import aurel from './aurel.js';
import story from './story.js';

// Figuren: Name im Namensschild (Porträt in gfx/portraits.js unter demselben Schlüssel)
export const SPEAKERS = {
  ole: 'Ole', brann: 'Brann', aurel: 'Aurel', herrscher: 'Herrscher', stimme: 'Eine Stimme'
};
export const DIALOGS = Object.assign({}, ole, brann, aurel, story);

// Zeilen eines Dialogs einheitlich: [{ who, text }]
export const dialogLines = (D) => D.lines.map(l => typeof l === 'string' ? { who: D.speaker, text: l } : { who: l.who || D.speaker, text: l.text, face: l.portrait || null });

const list = (v) => v == null ? [] : [].concat(v);
// Passt die Bedingung when zum Story-Zustand S?
export function dialogOk(D, S) {
  const w = D.when;
  if (!w) return true;
  const f = (S && S.flags) || {}, act = S ? S.act : 1;
  if (w.act != null && act !== w.act) return false;
  if (w.minAct != null && act < w.minAct) return false;
  if (w.maxAct != null && act > w.maxAct) return false;
  if (!list(w.flag).every(k => f[k])) return false;
  if (list(w.noFlag).some(k => f[k])) return false;
  return true;
}
// Gesprächsdialog für den NPC (Klick ohne Story-Schritt): erster passender, Einmal-Dialoge nur bis gesehen
export function idleDialogFor(npc, S) {
  for (const id in DIALOGS) {
    const D = DIALOGS[id];
    if (D.idle !== npc || !dialogOk(D, S)) continue;
    if (D.once && S && S.seen && S.seen[id]) continue;
    return id;
  }
  return null;
}
