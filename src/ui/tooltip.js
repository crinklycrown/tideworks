/* =========================================================
   TOOLTIPS im Pergament-Stil
   Elemente mit data-tip="name" oder data-tip="name:arg" bekommen beim Hovern einen Tooltip.
   Den Inhalt liefert die mit registerTip(name, fn) eingetragene Funktion fn(arg, el) als HTML.
   Touch-Eingaben zeigen keine Tooltips.
   ========================================================= */
import { $ } from './context.js';

const TIPS = {};
let cur = null;

export function registerTip(name, fn) { TIPS[name] = fn; }

function content(el) {
  const v = el.dataset.tip || '', i = v.indexOf(':');
  const name = i < 0 ? v : v.slice(0, i), arg = i < 0 ? '' : v.slice(i + 1), fn = TIPS[name];
  return fn ? fn(arg, el) : '';
}
function place(el) {
  const tip = $('tooltip'), r = el.getBoundingClientRect(), t = tip.getBoundingClientRect(), m = 8;
  // unten am Bildschirm nach oben aufklappen, sonst darunter
  let y = r.top > window.innerHeight / 2 ? r.top - t.height - m : r.bottom + m;
  let x = r.left + r.width / 2 - t.width / 2;
  x = Math.max(m, Math.min(window.innerWidth - t.width - m, x));
  y = Math.max(m, Math.min(window.innerHeight - t.height - m, y));
  tip.style.left = `${Math.round(x)}px`; tip.style.top = `${Math.round(y)}px`;
}
function show(el) {
  cur = el;
  const tip = $('tooltip'), html = el ? content(el) : '';
  if (!html) { tip.classList.add('hidden'); return; }
  if (tip._html !== html) { tip._html = html; tip.innerHTML = html; }
  tip.classList.remove('hidden');
  place(el);
}
export function hideTooltip() { cur = null; $('tooltip').classList.add('hidden'); }
// Tooltip an einem Bildschirmpunkt (z. B. über einem Canvas wie dem Skilltree); r = Abstand zum Punkt
export function showTipAt(html, x, y, r = 14) {
  cur = null;
  const tip = $('tooltip');
  if (!html) { tip.classList.add('hidden'); return; }
  if (tip._html !== html) { tip._html = html; tip.innerHTML = html; }
  tip.classList.remove('hidden');
  place({ getBoundingClientRect: () => ({ left: x - r, right: x + r, top: y - r, bottom: y + r, width: 2 * r, height: 2 * r }) });
}
// Inhalt des offenen Tooltips aktualisieren (z. B. Kosten nach Lageränderung)
export function refreshTooltip() {
  if (!cur) return;
  if (!cur.isConnected || cur.offsetParent === null) { hideTooltip(); return; }
  show(cur);
}
export function wireTooltips() {
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el !== cur) show(el);
  });
  document.addEventListener('pointerleave', hideTooltip);
  window.addEventListener('blur', hideTooltip);
}
