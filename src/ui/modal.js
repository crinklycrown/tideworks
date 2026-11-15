/* ---------- Bestätigungs-Dialog ---------- */
import { $ } from './context.js';

export function askConfirm(title, text, okLabel) {
  return new Promise(resolve => {
    const m = $('modal');
    m.innerHTML = `<div class="panel modal" role="dialog" aria-modal="true"><div class="phead"><span>${title}</span></div>
      <div class="mb small">${text}</div><div class="mf"><button class="btn btn-sm" data-m="no">Abbrechen</button><button class="btn btn-red btn-sm" data-m="yes">${okLabel}</button></div></div>`;
    m.classList.remove('hidden');
    const done = (v) => { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    document.addEventListener('keydown', onKey, true);
    m.onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) done(b.dataset.m === 'yes'); else if (e.target === m) done(false); };
    m.querySelector('[data-m="yes"]').focus();
  });
}

/* ---------- Hinweis-Dialog mit einem Knopf ---------- */
export function askInfo(title, text, okLabel) {
  return new Promise(resolve => {
    const m = $('modal');
    m.innerHTML = `<div class="panel modal" role="dialog" aria-modal="true"><div class="phead"><span>${title}</span></div>
      <div class="mb small">${text}</div><div class="mf"><button class="btn btn-sm" data-m="yes">${okLabel}</button></div></div>`;
    m.classList.remove('hidden');
    const done = () => { m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true); resolve(true); };
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); done(); } };
    document.addEventListener('keydown', onKey, true);
    m.onclick = (e) => { if (e.target.closest('[data-m]')) done(); };
    m.querySelector('[data-m="yes"]').focus();
  });
}
