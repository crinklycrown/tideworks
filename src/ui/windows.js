/* =========================================================
   GROSSE FENSTER: allgemeiner Container für Forschung, Flotte, Statistik
   Es ist immer höchstens ein Fenster offen. Das Spiel läuft weiter.
   Neues Fenster: registerWindow(id, { title, icon, side, big, render(body), wire(body)?, onOpen?, onClose? })
     side = true  → Seitenpanel rechts, sonst zentriert; big = true → 92 % × 92 % über allem, ohne Kopfzeile
                    (das Fenster zeichnet seine eigene Kopfzeile mit Schließen-Knopf, z. B. der Skilltree)
     render(body) → zeichnet den Inhalt (wird alle 500 ms und nach Änderungen aufgerufen)
     wire(body)   → einmalig: Ereignisse im Fenster anmelden (Delegation auf body)
   Den Inhalt kann später z. B. ein zoombarer Skilltree ersetzen (eigenes render, eigenes Canvas im body).
   ========================================================= */
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { ui, $ } from './context.js';
import { uiBusy } from './common.js';
import { closeBuild } from './buildmenu.js';
import { renderHotbar } from './hotbar.js';
import { layout } from './layout.js';
import { hideTooltip } from './tooltip.js';

const WINS = {};
const wired = new Set();

export function registerWindow(id, def) { WINS[id] = def; }
export function openWindow(id) {
  const def = WINS[id];
  if (!def || ui.win === id) return;
  if (ui.win) closeWindow();
  ui.win = id;
  const el = $('win'), body = $('winBody');
  el.classList.toggle('side', !!def.side); el.classList.toggle('center', !def.side); el.classList.toggle('big', !!def.big);
  el.dataset.win = id;
  document.body.classList.toggle('win-side', !!def.side);
  if (!def.side) closeBuild();   // das zentrierte Fenster deckt das Baumenü ab
  $('winTitle').innerHTML = `${def.icon ? img(SPR.icon[def.icon], 2) : ''}<span>${def.title}</span>`;
  body.innerHTML = ''; body._html = null; body.scrollTop = 0;
  // Ereignisse hängen am gemeinsamen body; jede Funktion prüft selbst, ob ihr Fenster offen ist
  if (def.wire && !wired.has(id)) { wired.add(id); def.wire(body); }
  if (def.onOpen) def.onOpen();
  el.classList.remove('hidden');
  def.render(body);
  renderHotbar(); layout();
}
export function closeWindow() {
  if (!ui.win) return;
  const def = WINS[ui.win];
  ui.win = null;
  hideTooltip();
  $('win').classList.add('hidden');
  document.body.classList.remove('win-side');
  $('winBody').innerHTML = ''; $('winBody')._html = null;
  if (def && def.onClose) def.onClose();
  renderHotbar(); layout();
}
export function toggleWindow(id) { if (ui.win === id) closeWindow(); else openWindow(id); }
// Inhalt des offenen Fensters neu zeichnen (nicht, während darin geklickt wird oder ein Select offen ist)
export function renderWindow(force) {
  if (!ui.win) return;
  const body = $('winBody');
  if (!force && uiBusy(body)) return;
  WINS[ui.win].render(body);
}
export function wireWindows() {
  $('winClose').addEventListener('click', closeWindow);
}
