/* =========================================================
   DIALOG „INSEL BENENNEN“: Name (Vorschlag aus data/names.js) und Flaggenfarbe
   Nach dem Gründen eines Kontors (first = true; Esc übernimmt dann den Vorschlag)
   und später über das Kontor-Info-Panel.
   ========================================================= */
import { FLAGS } from '../data/islands.js';
import { suggestName } from '../data/names.js';
import { esc } from '../util/format.js';
import { img } from '../gfx/pixelbuffer.js';
import { flagSpr } from '../gfx/sprites.js';
import { islName, flagOf, kontorIslands } from '../sim/state.js';
import { NAME_LEN } from '../sim/ships.js';
import { game, $, send, afterSync, saveGame } from './context.js';
import { toast } from './toasts.js';

export function nameIsland(k, first, done) {
  const I = game.W.island(k);
  if (!I) return;
  const taken = new Set(kontorIslands(game).filter(x => x !== k).map(x => islName(game, x)));
  let sug = suggestName(game.state.seed, k, I.type, taken), flag = flagOf(game, k);
  const name0 = first || !game.state.isl[k]?.name ? sug.name : islName(game, k);
  const m = $('modal');
  m.innerHTML = `<div class="panel modal" role="dialog" aria-modal="true"><div class="phead"><span>Insel benennen</span></div>
    <div class="mb small">
      <div class="lbl">Name</div>
      <div class="row" style="gap:6px"><input id="islNameInp" class="inp grow" maxlength="${NAME_LEN}" value="${esc(name0)}" autocomplete="off" spellcheck="false">
        <button class="btn btn-paper btn-sm" data-m="roll" title="Neuer Vorschlag">Vorschlag</button></div>
      <div class="lbl" style="margin-top:12px">Flaggenfarbe</div>
      <div class="flags">${FLAGS.map(c => `<button class="flagb${c === flag ? ' on' : ''}" data-flag="${c}" title="${c}">${img(flagSpr(c), 3)}</button>`).join('')}</div>
    </div>
    <div class="mf">${first ? '' : '<button class="btn btn-sm" data-m="no">Abbrechen</button>'}<button class="btn btn-green btn-sm" data-m="yes">Übernehmen</button></div></div>`;
  m.classList.remove('hidden');
  const inp = $('islNameInp');
  inp.focus(); inp.select();
  const finish = (ok) => {
    m.classList.add('hidden'); m.innerHTML = ''; m.onclick = null; document.removeEventListener('keydown', onKey, true);
    if (ok) {
      const name = (inp.value || '').replace(/\s+/g, ' ').trim().slice(0, NAME_LEN) || sug.name;
      send({ type: 'setIsland', isl: k, name, flag });
      saveGame();
      afterSync(() => { if (first) toast(`${img(flagSpr(flag), 2)}<span>Kontor auf <b>${esc(name)}</b> gegründet</span>`, 'gold'); if (done) done(); });
    }
  };
  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(first); }
  };
  document.addEventListener('keydown', onKey, true);
  m.onclick = (e) => {
    const f = e.target.closest('[data-flag]');
    if (f) { flag = f.dataset.flag; m.querySelectorAll('.flagb').forEach(b => b.classList.toggle('on', b === f)); return; }
    const b = e.target.closest('[data-m]');
    if (!b) return;
    if (b.dataset.m === 'roll') { sug = suggestName(game.state.seed, k, I.type, taken, sug.n + 1); inp.value = sug.name; inp.focus(); return; }
    finish(b.dataset.m === 'yes');
  };
}
