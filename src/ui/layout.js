/* =========================================================
   LAYOUT DER OVERLAYS
   Die Karte füllt das ganze Fenster, alle Panels schweben darüber. Hier werden die
   Höhen so verteilt, dass sich nichts überdeckt:
     - links: Lager oben, Info-Panel unten; das Lager wird kürzer (und scrollt), wenn das Info-Panel Platz braucht
     - links und rechts: überschneidet sich eine Spalte waagerecht mit Knopfleiste/Baumenü,
       endet sie oberhalb davon (Platz für das Baumenü wird immer freigehalten)
     - zentriertes Fenster: zwischen oberer Leiste und Knopfleiste; Seitenfenster rechts
   ========================================================= */
import { game, $ } from './context.js';

const M = 12, GAP = 8;
let bbH = 108, bbW = 600;        // zuletzt gemessene Größe des Baumenüs (auch wenn es zu ist)
let pending = false;

const px = (v) => `${Math.round(v)}px`;
const visible = (el) => !el.classList.contains('hidden');

export function layout() {
  const hotbar = $('hotbar');
  if (!hotbar || !game.state) return;
  const W = window.innerWidth, H = window.innerHeight;
  // Knopfleiste zu breit: erst ohne Tasten (tight, die Taste steht im Tooltip), dann nur Symbole und Tasten (compact); neu gemessen, wenn sich die Fensterbreite ändert
  if (hotbar._w !== W && hotbar.children.length) {
    hotbar._w = W; hotbar.classList.remove('tight', 'compact');
    for (const c of ['tight', 'compact']) { if (hotbar.scrollWidth <= W - 2 * M) break; hotbar.classList.add(c); }
  }
  const top = $('topbar').getBoundingClientRect().bottom + GAP;
  const hb = hotbar.getBoundingClientRect(), bb = $('buildBar');
  if (visible(bb)) { const r = bb.getBoundingClientRect(); if (r.height) { bbH = r.height + 6; bbW = r.width; } }
  const stackTop = hb.top - bbH, stackL = Math.min(hb.left, W / 2 - bbW / 2), stackR = Math.max(hb.right, W / 2 + bbW / 2);
  const above = H - stackTop + GAP;          // Abstand nach unten, um über Knopfleiste + Baumenü zu enden

  // Linke Spalte
  const inv = $('invPanel'), ins = $('insights'), pop = $('invPop');
  const colR = M + inv.offsetWidth;
  // Koop-Chat: die Eingabezeile sitzt unten links unter der Spalte (Nachrichten schweben darüber)
  const chat = $('chat'), chatOn = !!chat && visible(chat);
  const botL0 = stackL < colR + GAP ? above : M, botL = botL0 + (chatOn ? $('chatBar').offsetHeight + GAP : 0);
  const avail = H - top - botL;
  const head = inv.querySelector('.phead').offsetHeight + 8;
  const invMin = game.state.ui.invCollapsed ? head : Math.min(head + 96, avail / 2);
  inv.style.top = px(top);
  if (visible(ins)) {
    ins.style.bottom = px(botL);
    ins.style.maxHeight = px(Math.max(90, avail - invMin - GAP));
    inv.style.maxHeight = px(Math.max(head, avail - ins.offsetHeight - GAP));
  } else inv.style.maxHeight = px(Math.max(head, avail));
  // Popover neben dem Lager (auf sehr schmalen Bildschirmen darüber)
  if (visible(pop)) {
    const ir = inv.getBoundingClientRect(), right = Math.max(ir.right, visible(ins) ? ins.getBoundingClientRect().right : 0);
    const pw = pop.offsetWidth, side = right + GAP + pw <= W - M;
    pop.style.left = px(side ? right + GAP : M);
    pop.style.top = px(side ? top : Math.min(ir.bottom + GAP, H - botL - 120));
    pop.style.maxHeight = px(H - parseFloat(pop.style.top) - botL);
  }

  // Rechte Spalte: Ziel-Karte, Seitenfenster; unten Platz für die Karten-Knöpfe
  const tools = $('mapTools'), goal = $('goalCard'), win = $('win');
  // Schmale Bildschirme: Ziel-Karte und linke Spalte teilen sich die Breite; bei offenem Info-Panel weicht die Ziel-Karte
  document.body.classList.toggle('narrow-info', W < 700 && visible(ins));
  const sideW = Math.min(380, W - 2 * M);
  const botR = Math.max(W - M - sideW < stackR + GAP ? above : 0, M + tools.offsetHeight + GAP);
  const mini = $('miniMap'), miniH = mini.offsetHeight;
  const evb = $('evBar'), gTop = visible(evb) ? top + evb.offsetHeight + GAP : top;
  evb.style.top = px(top);
  goal.style.top = px(gTop);
  goal.style.maxHeight = px(Math.max(60, H - gTop - botR - (miniH ? miniH + GAP : 0)));
  mini.style.top = px(goal.offsetHeight ? goal.getBoundingClientRect().bottom + GAP : gTop);
  if (visible(win)) {
    win.style.top = px(top);
    if (win.classList.contains('big')) { win.style.top = px(Math.round(H * 0.04)); win.style.bottom = px(Math.round(H * 0.04)); win.style.width = px(Math.round(W * 0.92)); }
    else if (win.classList.contains('side')) { win.style.bottom = px(botR); win.style.width = px(sideW); }
    else { win.style.bottom = px(H - hb.top + GAP); win.style.width = px(Math.min(900, W - 2 * M)); }
  }
  if (chatOn) { chat.style.left = px(M); chat.style.bottom = px(botL0); }
  $('buildHint').style.top = px(top);
  $('toasts').style.top = px(top + (visible($('buildHint')) ? $('buildHint').offsetHeight + GAP : 0));
}
// Mehrere Anstöße im selben Bild zusammenfassen
export function layoutSoon() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; layout(); });
}
export function wireLayout() {
  window.addEventListener('resize', layoutSoon);
  const ro = new ResizeObserver(layoutSoon);
  ['topbar', 'hotbar', 'buildBar', 'insights', 'invPanel', 'buildHint', 'mapTools', 'goalCard', 'miniMap', 'evBar'].forEach(id => ro.observe($(id)));
  layout();
}
// Unter 1024×640 (Tablet/Handy) starten Lager und Info-Panel eingeklappt
export const isSmallScreen = () => window.innerWidth < 1024 || window.innerHeight < 640;
