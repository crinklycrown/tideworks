/* ---------- Toasts ----------
   Höchstens TOAST.max gleichzeitig. Version 18:
   - Gleiche Meldung, solange sie noch zu sehen ist: keine zweite, sondern ein Zähler „×2“ und die Anzeigezeit beginnt neu.
   - prio (Geschichte, Aufträge): bleibt länger stehen und wird erst verdrängt, wenn nur noch Prio-Meldungen da sind. */
import { $ } from './context.js';

export const TOAST = { max: 4, ms: 3600, prioMs: 6500 };

function arm(el) {
  clearTimeout(el._tm);
  el._tm = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, el._prio ? TOAST.prioMs : TOAST.ms);
}
export function toast(html, cls = '', prio = false) {
  const box = $('toasts');
  for (const el of box.children) {
    if (el._html !== html || el.classList.contains('out')) continue;
    el._n++;
    let c = el.querySelector('.tcount');
    if (!c) { c = document.createElement('b'); c.className = 'tcount'; el.appendChild(c); }
    c.textContent = '×' + el._n;
    arm(el);
    return;
  }
  const el = document.createElement('div');
  el.className = `toast panel ${cls}${prio ? ' prio' : ''}`;
  el.innerHTML = html;
  el._html = html; el._n = 1; el._prio = !!prio;
  box.appendChild(el);
  while (box.children.length > TOAST.max) {
    const old = [...box.children].find(e => !e._prio) || box.firstChild;
    clearTimeout(old._tm); old.remove();
  }
  arm(el);
}
